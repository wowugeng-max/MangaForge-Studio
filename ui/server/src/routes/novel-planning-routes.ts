import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelProject,
} from '../novel'
import { executeNovelAgent, generateNovelChapterProse } from '../llm'
import { asArray, clampScore, compactText, deepMergeObjects, getNovelPayload, parseJsonLikePayload } from './novel-route-utils'

type PlanningRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  getStageTemperature: (project: any, stage: string, fallback: number) => number
  getModelStrategy: (project: any, preferredModelId?: number) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
  getReferenceMigrationPlanForChapter: (workspace: string, project: any, chapter: any) => Promise<any>
  buildParagraphProseContext: (project: any, contextPackage: any, migrationPlan?: any, chapterDraft?: any) => string[]
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildOriginalIncubatorPrompt: (project: any, body: any) => string
  normalizeIncubatorPayload: (payload: any, chapterCount: number) => any
  isUsableIncubatorPayload: (payload: any) => boolean
  storeOriginalIncubatorPayload: (workspace: string, project: any, payload: any) => Promise<any>
}

function latestChapterReviewPayload(reviews: any[], chapter: any, types: string[]) {
  return reviews
    .filter(review => types.includes(review.review_type))
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .filter(item => Number(item.payload.chapter_id || item.payload.context_package?.chapter?.id || 0) === Number(chapter.id)
      || Number(item.payload.chapter_no || item.payload.context_package?.chapter?.chapter_no || 0) === Number(chapter.chapter_no))
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0] || null
}

function chapterBenchmarkMetrics(chapter: any, reviews: any[], issues: any[] = []) {
  const quality = latestChapterReviewPayload(reviews, chapter, ['prose_quality'])?.payload || {}
  const editor = latestChapterReviewPayload(reviews, chapter, ['editor_report'])?.payload || {}
  const similarity = latestChapterReviewPayload(reviews, chapter, ['similarity_report'])?.payload || {}
  const qualityScore = Number(quality.self_check?.review?.score || quality.report?.overall_score || 0) || null
  const editorScore = Number(editor.report?.overall_score || editor.overall_score || 0) || null
  const similarityRisk = Number(similarity.report?.overall_risk_score || similarity.overall_risk_score || 0) || null
  const safetyScore = Number(quality.safety_decision?.score || quality.reference_report?.quality_assessment?.overall_score || similarity.reference_report?.quality_assessment?.overall_score || 0) || null
  const chapterIssues = issues.filter(issue => Number(issue.chapter_no || 0) === Number(chapter.chapter_no || 0))
  const issuePenalty = chapterIssues.reduce((sum, issue) => sum + (issue.severity === 'high' ? 14 : issue.severity === 'medium' ? 7 : 3), 0)
  const missingPenalty = [
    chapter.chapter_text ? 0 : 28,
    chapter.chapter_goal || chapter.chapter_summary ? 0 : 10,
    chapter.ending_hook ? 0 : 8,
    asArray(chapter.scene_breakdown).length > 0 ? 0 : 8,
    qualityScore ? 0 : 8,
  ].reduce((sum, item) => sum + item, 0)
  const base = qualityScore || (chapter.chapter_text ? 72 : 35)
  const score = Math.max(0, Math.min(100, Math.round(base - issuePenalty - missingPenalty + (editorScore ? Math.min(8, (editorScore - 70) / 4) : 0) - (similarityRisk ? Math.min(16, similarityRisk / 4) : 0))))
  return {
    chapter_id: chapter.id,
    chapter_no: chapter.chapter_no,
    title: chapter.title || '',
    word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
    score,
    quality_score: qualityScore,
    editor_score: editorScore,
    similarity_risk: similarityRisk,
    safety_score: safetyScore,
    issue_count: chapterIssues.length,
    high_issue_count: chapterIssues.filter(issue => issue.severity === 'high').length,
  }
}

function buildRegressionSampleSet(project: any, chapters: any[], reviews: any[], issues: any[] = [], maxSamples = 10) {
  const written = chapters.filter(chapter => chapter.chapter_text).sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const scored = written.map(chapter => ({ chapter, metrics: chapterBenchmarkMetrics(chapter, reviews, issues) }))
  const byId = new Map<number, any>()
  const add = (item: any, reason: string) => {
    if (!item?.chapter?.id || byId.size >= maxSamples) return
    byId.set(Number(item.chapter.id), {
      chapter_id: item.chapter.id,
      chapter_no: item.chapter.chapter_no,
      title: item.chapter.title || '',
      reason,
      baseline_score: item.metrics.score,
      baseline_word_count: item.metrics.word_count,
    })
  }
  add(scored[0], '开篇样本')
  add(scored[Math.floor(scored.length / 2)], '中段样本')
  add(scored[scored.length - 1], '最新样本')
  scored.slice().sort((a, b) => a.metrics.score - b.metrics.score).slice(0, 3).forEach(item => add(item, '低分回归样本'))
  scored.slice().sort((a, b) => Number(b.metrics.similarity_risk || 0) - Number(a.metrics.similarity_risk || 0)).slice(0, 2).forEach(item => add(item, '相似风险样本'))
  scored.slice().sort((a, b) => b.metrics.high_issue_count - a.metrics.high_issue_count).slice(0, 2).forEach(item => add(item, '连续性风险样本'))
  return {
    suite_id: project.reference_config?.regression_suite?.suite_id || `reg-${Date.now()}`,
    updated_at: new Date().toISOString(),
    samples: Array.from(byId.values()),
    policy: {
      min_average_score: Number(project.reference_config?.regression_suite?.policy?.min_average_score || 78),
      max_score_drop: Number(project.reference_config?.regression_suite?.policy?.max_score_drop || 6),
      max_similarity_risk: Number(project.reference_config?.regression_suite?.policy?.max_similarity_risk || 45),
    },
  }
}

function buildRegressionIssues(project: any, chapters: any[]) {
  const state = project.reference_config?.story_state || {}
  const sorted = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const issues: any[] = []
  for (const chapter of sorted) {
    if (chapter.chapter_text && !chapter.ending_hook) {
      issues.push({ type: 'missing_hook', severity: 'medium', chapter_no: chapter.chapter_no, message: '章节缺章末钩子。' })
    }
    if (chapter.chapter_text && !asArray(chapter.continuity_notes).length) {
      issues.push({ type: 'continuity_note_missing', severity: 'medium', chapter_no: chapter.chapter_no, message: '章节缺连续性备注。' })
    }
  }
  const writtenMax = Math.max(0, ...sorted.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
  if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
    issues.push({ type: 'story_state_stale', severity: 'high', chapter_no: writtenMax, message: `状态机落后到第${state.last_updated_chapter || 0}章。` })
  }
  return issues
}

function runRegressionSuite(project: any, suite: any, chapters: any[], reviews: any[], runs: any[], issues: any[] = [], options: any = {}) {
  const chapterMap = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
  const samples = asArray(suite.samples).map((sample: any) => {
    const chapter = chapterMap.get(Number(sample.chapter_id))
    const metrics = chapter ? chapterBenchmarkMetrics(chapter, reviews, issues) : { chapter_id: sample.chapter_id, score: 0, missing: true }
    return {
      ...sample,
      current: metrics,
      delta_score: Number(metrics.score || 0) - Number(sample.baseline_score || 0),
      status: !chapter ? 'missing' : Number(metrics.score || 0) < Number(suite.policy?.min_average_score || 78) ? 'warn' : 'ok',
    }
  })
  const average = samples.length ? Math.round(samples.reduce((sum: number, sample: any) => sum + Number(sample.current?.score || 0), 0) / samples.length) : 0
  const baselineAverage = samples.length ? Math.round(samples.reduce((sum: number, sample: any) => sum + Number(sample.baseline_score || 0), 0) / samples.length) : 0
  const maxDrop = samples.reduce((drop: number, sample: any) => Math.min(drop, Number(sample.delta_score || 0)), 0)
  const highSimilarity = samples.filter((sample: any) => Number(sample.current?.similarity_risk || 0) >= Number(suite.policy?.max_similarity_risk || 45))
  const passed = average >= Number(suite.policy?.min_average_score || 78) && Math.abs(maxDrop) <= Number(suite.policy?.max_score_drop || 6) && highSimilarity.length === 0
  return {
    run_id: `reg-run-${Date.now()}`,
    suite_id: suite.suite_id,
    created_at: new Date().toISOString(),
    config_snapshot: options.buildAgentConfigSnapshot?.(project, options.modelId),
    sample_count: samples.length,
    average_score: average,
    baseline_average_score: baselineAverage,
    delta_average_score: average - baselineAverage,
    max_score_drop: maxDrop,
    passed,
    samples,
    cost_baseline: options.buildProductionMetrics?.(chapters, reviews, runs),
    recommendations: [
      !samples.length ? '回归样本为空，先生成并固化样本集。' : '',
      average < Number(suite.policy?.min_average_score || 78) ? '样本均分低于门禁，优先修订低分章节或调整审稿提示词。' : '',
      Math.abs(maxDrop) > Number(suite.policy?.max_score_drop || 6) ? '存在明显分数回退，建议回滚最近提示词/模型策略改动后复测。' : '',
      highSimilarity.length ? '存在相似风险过高样本，降低参考强度并重写高风险桥段。' : '',
    ].filter(Boolean),
  }
}

function suggestedAbCandidateConfig(project: any, preferredModelId?: number) {
  const currentStrategy = project.reference_config?.model_strategy || {}
  const currentPrompts = project.reference_config?.agent_prompt_config?.prompts || {}
  return {
    agent_prompt_config: {
      ...(project.reference_config?.agent_prompt_config || {}),
      prompts: {
        ...currentPrompts,
        draft_guardrails: currentPrompts.draft_guardrails || '生成正文时优先完成本章目标、避免重复解释、保留章末钩子，不照搬参考作品具体桥段。',
        revision_guardrails: currentPrompts.revision_guardrails || '修订时优先处理连续性、角色动机、信息增量和水文重复，保持原章节核心事件不漂移。',
      },
    },
    model_strategy: {
      ...currentStrategy,
      preferred_model_id: currentStrategy.preferred_model_id || preferredModelId || null,
      stages: {
        ...(currentStrategy.stages || {}),
        draft: { ...(currentStrategy.stages?.draft || {}), model_id: currentStrategy.stages?.draft?.model_id || preferredModelId || null, temperature: 0.72 },
        review: { ...(currentStrategy.stages?.review || {}), model_id: currentStrategy.stages?.review?.model_id || preferredModelId || null, temperature: 0.18 },
        safety: { ...(currentStrategy.stages?.safety || {}), model_id: currentStrategy.stages?.safety?.model_id || preferredModelId || null, temperature: 0.12 },
      },
    },
    quality_gate: {
      ...(project.reference_config?.quality_gate || {}),
      enabled: true,
      min_score: Math.max(78, Number(project.reference_config?.quality_gate?.min_score || 78)),
      block_on_safety: true,
    },
    safety: {
      ...(project.reference_config?.safety || {}),
      enforce_on_generate: true,
    },
  }
}

function buildCandidateProject(project: any, candidateConfig: any) {
  const patch = candidateConfig?.reference_config || candidateConfig || {}
  return {
    ...project,
    reference_config: deepMergeObjects(project.reference_config || {}, patch),
  }
}

function scoreAbCandidate(currentProject: any, candidateProject: any, baseReport: any) {
  const currentConfig = currentProject.reference_config || {}
  const candidateConfig = candidateProject.reference_config || {}
  const currentPrompts = currentConfig.agent_prompt_config?.prompts || {}
  const candidatePrompts = candidateConfig.agent_prompt_config?.prompts || {}
  const promptDelta = Object.keys(candidatePrompts).length - Object.keys(currentPrompts).length
  const draftTemp = Number(candidateConfig.model_strategy?.stages?.draft?.temperature ?? currentConfig.model_strategy?.stages?.draft?.temperature ?? 0.75)
  const reviewTemp = Number(candidateConfig.model_strategy?.stages?.review?.temperature ?? currentConfig.model_strategy?.stages?.review?.temperature ?? 0.2)
  const safetyTemp = Number(candidateConfig.model_strategy?.stages?.safety?.temperature ?? currentConfig.model_strategy?.stages?.safety?.temperature ?? 0.15)
  const gateLift = Number(candidateConfig.quality_gate?.min_score || 0) - Number(currentConfig.quality_gate?.min_score || 0)
  const safetyEnabled = candidateConfig.safety?.enforce_on_generate === true && currentConfig.safety?.enforce_on_generate !== true
  const qualityAdjustment = clampScore(
    50
    + Math.min(6, Math.max(0, promptDelta) * 2)
    + (reviewTemp <= 0.22 ? 3 : -2)
    + (draftTemp >= 0.62 && draftTemp <= 0.78 ? 3 : -3)
    + (gateLift >= 0 ? 2 : -4),
  ) - 50
  const safetyAdjustment = (safetyEnabled ? 5 : 0) + (safetyTemp <= 0.18 ? 2 : -2)
  const projectedAverage = clampScore(Number(baseReport.average_score || 0) + qualityAdjustment)
  return {
    quality_adjustment: qualityAdjustment,
    safety_adjustment: safetyAdjustment,
    projected_average_score: projectedAverage,
    projected_delta_average_score: projectedAverage - Number(baseReport.average_score || 0),
    risk_notes: [
      promptDelta <= 0 ? '候选配置没有增加明确提示词护栏，实际效果可能有限。' : '',
      draftTemp > 0.82 ? '正文温度偏高，可能增加风格漂移和相似风险。' : '',
      reviewTemp > 0.3 ? '审稿温度偏高，不利于稳定复现。' : '',
      !candidateConfig.safety?.enforce_on_generate ? '候选配置未开启生成阶段安全门禁。' : '',
    ].filter(Boolean),
  }
}

function buildAbExperimentReport(project: any, experiment: any, suite: any, chapters: any[], reviews: any[], runs: any[], issues: any[], options: any = {}) {
  const candidateProject = buildCandidateProject(project, experiment.candidate_config || {})
  const current = runRegressionSuite(project, suite, chapters, reviews, runs, issues, options)
  const candidateBase = runRegressionSuite(candidateProject, suite, chapters, reviews, runs, issues, {
    ...options,
    buildAgentConfigSnapshot: options.buildAgentConfigSnapshot,
  })
  const projection = scoreAbCandidate(project, candidateProject, current)
  const candidate = {
    ...candidateBase,
    average_score: projection.projected_average_score,
    delta_average_score: projection.projected_delta_average_score,
    projection,
    projection_mode: 'offline_config_projection',
    passed: projection.projected_average_score >= Number(suite.policy?.min_average_score || 78)
      && projection.risk_notes.length <= 1
      && candidateBase.passed !== false,
  }
  return {
    experiment_id: experiment.id,
    created_at: new Date().toISOString(),
    mode: 'offline_config_projection',
    current,
    candidate,
    decision: candidate.passed && candidate.average_score >= current.average_score ? 'candidate_better' : candidate.passed ? 'candidate_neutral' : 'candidate_risky',
    recommendations: [
      candidate.projection.risk_notes.length ? `候选配置风险：${candidate.projection.risk_notes.join('；')}` : '',
      candidate.average_score < current.average_score ? '候选配置投影均分低于当前配置，不建议提升。' : '',
      candidate.average_score >= current.average_score && candidate.passed ? '候选配置可进入小批量实写验证或提升为正式配置。' : '',
    ].filter(Boolean),
  }
}

function extractSandboxText(result: any) {
  const payload = getNovelPayload(result)
  const proseArr = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters : []
  const firstProse = proseArr.length > 0 ? proseArr[0] : {}
  return {
    payload,
    chapter_text: String(payload?.chapter_text || firstProse?.chapter_text || ''),
    scene_breakdown: payload?.scene_breakdown || firstProse?.scene_breakdown || [],
    continuity_notes: payload?.continuity_notes || firstProse?.continuity_notes || [],
  }
}

function diffSandboxText(before: string, after: string) {
  const beforeChars = String(before || '').replace(/\s/g, '').length
  const afterChars = String(after || '').replace(/\s/g, '').length
  const beforeParas = String(before || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  const afterParas = String(after || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  let changed = 0
  const max = Math.max(beforeParas.length, afterParas.length)
  for (let index = 0; index < max; index += 1) {
    if ((beforeParas[index] || '') !== (afterParas[index] || '')) changed += 1
  }
  return {
    before_chars: beforeChars,
    after_chars: afterChars,
    delta_chars: afterChars - beforeChars,
    before_paragraphs: beforeParas.length,
    after_paragraphs: afterParas.length,
    changed_paragraphs: changed,
  }
}

function splitSandboxParagraphs(text: string) {
  return String(text || '')
    .split(/\n+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function mergeSandboxParagraphs(currentText: string, candidateText: string, paragraphIndexes: number[]) {
  const current = splitSandboxParagraphs(currentText)
  const candidate = splitSandboxParagraphs(candidateText)
  const selected = new Set(paragraphIndexes.map(item => Number(item)).filter(item => Number.isInteger(item) && item >= 0))
  const max = Math.max(current.length, candidate.length)
  const merged: string[] = []
  for (let index = 0; index < max; index += 1) {
    if (selected.has(index) && candidate[index]) {
      merged.push(candidate[index])
    } else if (current[index]) {
      merged.push(current[index])
    } else if (candidate[index] && selected.has(index)) {
      merged.push(candidate[index])
    }
  }
  return merged.join('\n\n')
}

export function registerNovelPlanningRoutes(app: Express, ctx: PlanningRoutesContext) {
  app.post('/api/novel/projects/:id/book-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const chapterBriefs = chapters
        .sort((a, b) => a.chapter_no - b.chapter_no)
        .map(ch => ({
          chapter_no: ch.chapter_no,
          title: ch.title,
          summary: ch.chapter_summary || compactText(ch.chapter_text || '', 220),
          ending_hook: ch.ending_hook || '',
          word_count: String(ch.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(ch.chapter_text),
        }))
      const prompt = [
        '任务：进行长篇小说全书/分卷级质量总检，只输出 JSON。',
        `项目：${project.title}`,
        '检查：主线是否停滞、角色成长是否断档、伏笔是否长期未回收、爽点密度是否下降、重复桥段/重复信息、分卷目标是否完成、是否偏离写作圣经。',
        '输出字段：overall_score, mainline, character_arcs, foreshadowing, payoff_density, repetition, volume_goals, bible_alignment, must_fix, next_actions。',
        '【写作圣经】',
        JSON.stringify(project.reference_config?.writing_bible || {}, null, 2).slice(0, 5000),
        '【大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 5000),
        '【角色】',
        JSON.stringify(characters.map(char => ({ name: char.name, role_type: char.role_type, goal: char.goal, current_state: char.current_state })), null, 2).slice(0, 5000),
        '【章节摘要】',
        JSON.stringify(chapterBriefs, null, 2).slice(0, 12000),
        '【近期质检】',
        JSON.stringify(reviews.slice(0, 12).map(item => ({ type: item.review_type, status: item.status, summary: item.summary, issues: item.issues })), null, 2).slice(0, 5000),
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'review', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: ctx.getStageTemperature(project, 'review', 0.2), skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'book_review',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `全书总检评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: JSON.stringify({ report, chapter_count: chapters.length, written_count: chapters.filter(ch => ch.chapter_text).length }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'book_review', step_name: 'global', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/topic-validation', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prompt = [
        '任务：进行商业网文选题验证，只输出 JSON。',
        `项目：${project.title}`,
        `题材：${project.genre || ''}`,
        `简介：${project.synopsis || ''}`,
        `目标读者：${project.target_audience || ''}`,
        '输出：overall_score, target_reader, market_position, selling_points, first_10_chapter_retention_risks, competition_risks, three_directions(array), recommendation。',
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('market-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 5000, temperature: 0.45, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'topic_validation',
        status: Number(report.overall_score || 0) >= 75 ? 'ok' : 'warn',
        summary: `选题验证评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.competition_risks).concat(asArray(report.first_10_chapter_retention_risks)).map((item: any) => String(item)),
        payload: JSON.stringify({ report }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/benchmark', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sample = chapters.find(ch => ch.chapter_summary || ch.chapter_goal) || chapters[0] || null
      const proseScores = reviews.filter(item => item.review_type === 'prose_quality').map(item => Number((parseJsonLikePayload(item.payload) || {}).self_check?.review?.score || 0)).filter(Boolean)
      const report = {
        benchmark_id: `bench-${Date.now()}`,
        sample_chapter: sample ? { id: sample.id, chapter_no: sample.chapter_no, title: sample.title, goal: sample.chapter_goal, summary: sample.chapter_summary } : null,
        current_strategy: project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined),
        quality_baseline: {
          average_score: proseScores.length ? Math.round(proseScores.reduce((sum, score) => sum + score, 0) / proseScores.length) : null,
          sample_count: proseScores.length,
        },
        cost_baseline: ctx.buildProductionMetrics(chapters, reviews, await listNovelRuns(activeWorkspace, project.id)),
        recommendations: [
          proseScores.length < 3 ? '样本不足，建议至少生成 3 章后再做模型/提示词 A/B 对比。' : '',
          proseScores.length && Math.min(...proseScores) < 78 ? '存在低分章节，优先优化审稿修订提示词。' : '',
          !project.reference_config?.agent_prompt_config ? '尚未配置 Agent 提示词版本，可先建立项目级提示词基线。' : '',
        ].filter(Boolean),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'quality_benchmark',
        status: 'ok',
        summary: `质量基准：样本 ${proseScores.length}，均分 ${report.quality_baseline.average_score ?? '-'}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'quality_benchmark', step_name: 'baseline', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/regression-suite', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const storedSuite = project.reference_config?.regression_suite || null
      const suggestedSuite = buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.query.max_samples || 10))
      const runs = reviews
        .filter(review => review.review_type === 'regression_benchmark')
        .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
        .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))
      res.json({
        ok: true,
        suite: storedSuite,
        suggested_suite: suggestedSuite,
        latest_run: runs[0]?.payload?.report || null,
        history: runs.slice(0, 10).map(item => item.payload.report || {}),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/regression-suite', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const autoSuite = buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const incoming = req.body?.suite || {}
      const suite = {
        ...autoSuite,
        ...incoming,
        suite_id: incoming.suite_id || autoSuite.suite_id,
        updated_at: new Date().toISOString(),
        samples: asArray(incoming.samples).length ? incoming.samples : autoSuite.samples,
        policy: { ...(autoSuite.policy || {}), ...(incoming.policy || {}) },
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), regression_suite: suite },
      } as any)
      res.json({ ok: true, suite, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/regression-suite/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const report = runRegressionSuite(project, suite, chapters, reviews, runs, issues, {
        modelId: Number(req.body?.model_id || 0) || undefined,
        buildAgentConfigSnapshot: ctx.buildAgentConfigSnapshot,
        buildProductionMetrics: ctx.buildProductionMetrics,
      })
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'regression_benchmark',
        status: report.passed ? 'ok' : 'warn',
        summary: `回归基准：样本 ${report.sample_count}，均分 ${report.average_score}，变化 ${report.delta_average_score >= 0 ? '+' : ''}${report.delta_average_score}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'regression_benchmark',
        step_name: suite.suite_id || 'suite',
        status: report.passed ? 'success' : 'warn',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/ab-experiments', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      res.json({
        ok: true,
        experiments,
        suggested_candidate_config: suggestedAbCandidateConfig(project, Number(req.query.model_id || 0) || undefined),
        current_snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.query.model_id || 0) || undefined),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const candidateConfig = req.body?.candidate_config || suggestedAbCandidateConfig(project, Number(req.body?.model_id || 0) || undefined)
      const candidateProject = buildCandidateProject(project, candidateConfig)
      const experiment = {
        id: `ab-${Date.now()}`,
        name: String(req.body?.name || `配置实验 ${experiments.length + 1}`),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.body?.model_id || 0) || undefined),
        candidate_snapshot: ctx.buildAgentConfigSnapshot(candidateProject, Number(req.body?.model_id || 0) || undefined),
        candidate_config: candidateConfig,
        latest_report: null,
        history: [],
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: [experiment, ...experiments].slice(0, 30) },
      } as any)
      res.json({ ok: true, experiment, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const report = buildAbExperimentReport(project, experiment, suite, chapters, reviews, runs, issues, {
        modelId: Number(req.body?.model_id || 0) || undefined,
        buildAgentConfigSnapshot: ctx.buildAgentConfigSnapshot,
        buildProductionMetrics: ctx.buildProductionMetrics,
      })
      const nextExperiment = {
        ...experiment,
        status: report.decision === 'candidate_better' ? 'passed' : report.decision === 'candidate_risky' ? 'risky' : 'neutral',
        latest_report: report,
        history: [report, ...asArray(experiment.history)].slice(0, 10),
        updated_at: new Date().toISOString(),
      }
      const updatedExperiments = experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_experiment',
        status: nextExperiment.status === 'risky' ? 'warn' : 'ok',
        summary: `A/B 实验：${experiment.name}，决策 ${report.decision}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report, experiment_id: experiment.id }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_experiment',
        step_name: experiment.id,
        status: nextExperiment.status === 'risky' ? 'warn' : 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: updatedExperiments },
      } as any)
      res.json({ ok: true, experiment: nextExperiment, report, review: saved, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/promote', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      if (experiment.status === 'risky' && req.body?.force !== true) {
        return res.status(409).json({ error: '候选配置仍标记为风险，需传 force=true 才能提升。', experiment })
      }
      const nextReferenceConfig = deepMergeObjects(project.reference_config || {}, experiment.candidate_config || {})
      const nextExperiment = {
        ...experiment,
        status: 'promoted',
        promoted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...nextReferenceConfig,
          ab_experiments: experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item),
          agent_prompt_config: {
            ...(nextReferenceConfig.agent_prompt_config || {}),
            version: Number(nextReferenceConfig.agent_prompt_config?.version || project.reference_config?.agent_prompt_config?.version || 1) + 1,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_experiment',
        step_name: `${experiment.id}-promote`,
        status: 'success',
        output_ref: JSON.stringify({ promoted_experiment: nextExperiment, snapshot: ctx.buildAgentConfigSnapshot(updated, Number(req.body?.model_id || 0) || undefined) }),
      })
      res.json({ ok: true, experiment: nextExperiment, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/sandbox', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const candidateProject = buildCandidateProject(project, experiment.candidate_config || {})
      const preferredModelId = Number(req.body?.model_id || 0) || undefined
      const [chapters, worldbuilding, characters, outlines, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const chapterMap = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
      const selectedSamples = asArray(suite.samples)
        .filter((sample: any) => chapterMap.has(Number(sample.chapter_id)))
        .slice(0, Math.max(1, Math.min(3, Number(req.body?.sample_count || 2))))
      const drafts: any[] = []
      for (const sample of selectedSamples) {
        const chapter = chapterMap.get(Number(sample.chapter_id))
        if (!chapter) continue
        try {
          const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, candidateProject, chapter, chapters, worldbuilding, characters, outlines, reviews)
          const migrationPlan = await ctx.getReferenceMigrationPlanForChapter(activeWorkspace, candidateProject, chapter).catch(error => ({ error: String(error) }))
          const prevChapters = chapters
            .filter(item => Number(item.chapter_no || 0) < Number(chapter.chapter_no || 0) && item.chapter_text)
            .slice(-3)
            .map(item => ({ chapter_no: item.chapter_no, title: item.title, chapter_summary: item.chapter_summary || '', ending_hook: item.ending_hook || '', chapter_text: item.chapter_text }))
          const stageModelId = ctx.getStageModelId(candidateProject, 'draft', preferredModelId)
          const result = await generateNovelChapterProse(candidateProject, chapter, {
            worldbuilding,
            characters,
            outline: outlines,
            prevChapters,
            contextPackage,
            migrationPlan,
            paragraphTask: ctx.buildParagraphProseContext(candidateProject, contextPackage, migrationPlan, chapter),
            prompt: `A/B 沙盒生成：请为第 ${chapter.chapter_no} 章生成候选正文，不要覆盖原文。`,
          } as any, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, skipMemory: true })
          const extracted = extractSandboxText(result)
          if (!extracted.chapter_text) {
            drafts.push({
              chapter_id: chapter.id,
              chapter_no: chapter.chapter_no,
              title: chapter.title,
              status: 'failed',
              error: String((result as any).error || (result as any).fallbackReason || '模型未返回正文'),
            })
            continue
          }
          const diff = diffSandboxText(chapter.chapter_text || '', extracted.chapter_text)
          drafts.push({
            chapter_id: chapter.id,
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            status: 'success',
            sample_reason: sample.reason || '',
            modelName: (result as any).modelName || '',
            modelId: stageModelId || null,
            candidate_text: extracted.chapter_text,
            candidate_preview: compactText(extracted.chapter_text, 420),
            scene_breakdown: extracted.scene_breakdown,
            continuity_notes: extracted.continuity_notes,
            diff,
            baseline_score: sample.baseline_score,
            projected_score: clampScore(Number(sample.baseline_score || 72) + (diff.delta_chars > 0 ? 2 : 0) - (diff.after_chars < 800 ? 8 : 0)),
          })
        } catch (draftError: any) {
          drafts.push({
            chapter_id: chapter.id,
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            status: 'failed',
            error: String(draftError?.message || draftError),
          })
        }
      }
      const successCount = drafts.filter(item => item.status === 'success').length
      const report = {
        sandbox_id: `sandbox-${Date.now()}`,
        experiment_id: experiment.id,
        created_at: new Date().toISOString(),
        mode: 'candidate_draft_sandbox',
        config_snapshot: ctx.buildAgentConfigSnapshot(candidateProject, preferredModelId),
        sample_count: drafts.length,
        success_count: successCount,
        passed: drafts.length > 0 && successCount === drafts.length,
        drafts,
        recommendations: [
          successCount === 0 ? '候选配置未生成有效沙盒稿，不建议提升。' : '',
          drafts.some(item => item.status === 'success' && Number(item.diff?.after_chars || 0) < 800) ? '存在候选稿字数过短，需要检查正文提示词或模型输出限制。' : '',
          drafts.some(item => item.status === 'failed') ? '存在沙盒生成失败样本，建议先修正候选配置再重试。' : '',
          successCount > 0 ? '请人工对照候选稿预览和原文，确认文风、节奏、连续性后再提升配置。' : '',
        ].filter(Boolean),
        cost_baseline: ctx.buildProductionMetrics(chapters, reviews, runs),
      }
      const nextExperiment = {
        ...experiment,
        status: report.passed ? 'sandboxed' : 'sandbox_failed',
        latest_sandbox: report,
        history: [report, ...asArray(experiment.history)].slice(0, 10),
        updated_at: new Date().toISOString(),
      }
      const updatedExperiments = experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_sandbox_draft',
        status: report.passed ? 'ok' : 'warn',
        summary: `A/B 沙盒实写：${experiment.name}，成功 ${successCount}/${drafts.length}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report, experiment_id: experiment.id }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_sandbox',
        step_name: experiment.id,
        status: report.passed ? 'success' : 'warn',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: updatedExperiments },
      } as any)
      res.json({ ok: true, experiment: nextExperiment, report, review: saved, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/sandbox/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const sandbox = experiment.latest_sandbox || {}
      const chapterId = Number(req.body?.chapter_id || 0)
      const draft = asArray(sandbox.drafts).find((item: any) => Number(item.chapter_id || 0) === chapterId)
      if (!draft) return res.status(404).json({ error: 'sandbox draft not found' })
      if (draft.status !== 'success' || !draft.candidate_text) return res.status(409).json({ error: '沙盒稿不可采纳', draft })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const chapter = chapters.find(item => Number(item.id) === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })

      const mode = req.body?.mode === 'paragraphs' ? 'paragraphs' : 'full'
      const paragraphIndexes = asArray(req.body?.paragraph_indexes).map(Number).filter(item => Number.isInteger(item) && item >= 0)
      if (mode === 'paragraphs' && paragraphIndexes.length === 0) {
        return res.status(400).json({ error: '段落采纳至少选择一个段落。' })
      }
      const nextText = mode === 'paragraphs'
        ? mergeSandboxParagraphs(chapter.chapter_text || '', draft.candidate_text || '', paragraphIndexes)
        : String(draft.candidate_text || '')
      if (!nextText.trim()) return res.status(400).json({ error: '采纳后的正文为空。' })

      const diff = diffSandboxText(chapter.chapter_text || '', nextText)
      const updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        scene_breakdown: mode === 'full' ? asArray(draft.scene_breakdown) : chapter.scene_breakdown,
        continuity_notes: mode === 'full' ? asArray(draft.continuity_notes) : chapter.continuity_notes,
        status: 'draft',
      }, { versionSource: 'agent_execute' })
      const application = {
        applied_id: `sandbox-apply-${Date.now()}`,
        sandbox_id: sandbox.sandbox_id || '',
        experiment_id: experiment.id,
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title || '',
        mode,
        paragraph_indexes: mode === 'paragraphs' ? paragraphIndexes : [],
        diff,
        applied_at: new Date().toISOString(),
      }
      const nextExperiment = {
        ...experiment,
        latest_sandbox: {
          ...sandbox,
          applications: [application, ...asArray(sandbox.applications)].slice(0, 20),
        },
        updated_at: new Date().toISOString(),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_sandbox_apply',
        status: 'ok',
        summary: `采纳 A/B 沙盒稿：第${chapter.chapter_no}章，${mode === 'full' ? '整章' : `${paragraphIndexes.length} 个段落`}`,
        issues: [],
        payload: JSON.stringify({ application, draft_preview: compactText(draft.candidate_text || '', 800) }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_sandbox_apply',
        step_name: `${experiment.id}-chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ chapter_id: chapter.id, mode, paragraph_indexes: paragraphIndexes }),
        output_ref: JSON.stringify({ application, review: saved, updated_chapter_id: updatedChapter?.id }),
      })
      const updatedProject = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          ab_experiments: experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item),
        },
      } as any)
      res.json({ ok: true, chapter: updatedChapter, application, experiment: nextExperiment, review: saved, project: updatedProject })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/rolling-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const fromChapter = Number(req.body.from_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const horizon = Math.max(3, Math.min(30, Number(req.body.horizon || 10)))
      const targetChapters = chapters.filter(ch => ch.chapter_no >= fromChapter).slice(0, horizon)
      const prompt = [
        '任务：生成未来章节滚动规划，只输出 JSON。',
        `项目：${project.title}`,
        `从第 ${fromChapter} 章开始，规划未来 ${horizon} 章。`,
        '需要输出：rolling_plan(array: chapter_no,title,chapter_goal,conflict,payoff,foreshadowing_to_use,ending_hook), volume_remaining_goals, foreshadowing_recovery_plan, character_growth_nodes, risk_notes。',
        '【写作圣经/状态机】',
        JSON.stringify({ writing_bible: project.reference_config?.writing_bible || {}, story_state: project.reference_config?.story_state || {} }, null, 2).slice(0, 6000),
        '【分卷/大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 6000),
        '【待规划章节】',
        JSON.stringify(targetChapters.map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, goal: ch.chapter_goal, summary: ch.chapter_summary, ending_hook: ch.ending_hook })), null, 2).slice(0, 6000),
        '【近期审稿】',
        JSON.stringify(reviews.slice(0, 8).map(item => ({ type: item.review_type, summary: item.summary, issues: item.issues })), null, 2).slice(0, 3000),
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: ctx.getStageTemperature(project, 'outline', 0.45), skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'rolling_plan',
        status: 'ok',
        summary: `滚动规划：第${fromChapter}章起 ${horizon} 章`,
        issues: asArray(report.risk_notes).map((item: any) => String(item)),
        payload: JSON.stringify({ report, from_chapter: fromChapter, horizon }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/volume-control/sync', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const reviews = await listNovelReviews(activeWorkspace, project.id)
      const latestRolling = reviews
        .filter(item => item.review_type === 'rolling_plan')
        .map(item => ({ review: item, payload: parseJsonLikePayload(item.payload) || {} }))
        .find(item => item.payload.report)
      const report = req.body?.report || latestRolling?.payload?.report || {}
      const volumeControl = {
        ...(project.reference_config?.volume_control || {}),
        volume_remaining_goals: report.volume_remaining_goals || req.body?.volume_remaining_goals || [],
        foreshadowing_recovery_plan: report.foreshadowing_recovery_plan || req.body?.foreshadowing_recovery_plan || [],
        character_growth_nodes: report.character_growth_nodes || req.body?.character_growth_nodes || [],
        synced_from_review_id: latestRolling?.review?.id || null,
        synced_at: new Date().toISOString(),
      }
      if (req.body?.dry_run === true) return res.json({ ok: true, dry_run: true, volume_control: volumeControl })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), volume_control: volumeControl },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'volume_control',
        status: 'ok',
        summary: '卷级控制已同步滚动规划',
        issues: [],
        payload: JSON.stringify({ volume_control: volumeControl }),
      })
      res.json({ ok: true, volume_control: volumeControl, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, strategy: project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.query.model_id || 0) || undefined) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const strategy = req.body?.strategy || ctx.getModelStrategy(project, Number(req.body?.model_id || 0) || undefined)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), model_strategy: strategy },
      } as any)
      res.json({ ok: true, strategy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterCount = Math.max(5, Math.min(80, Number(req.body.chapter_count || 30)))
      const variantCount = Math.max(1, Math.min(5, Number(req.body.variant_count || 1)))
      const stageModelId = ctx.getStageModelId(project, 'incubation', modelId)
      const result = await executeNovelAgent('outline-agent', project, {
        task: ctx.buildOriginalIncubatorPrompt(project, { ...req.body, chapter_count: chapterCount, variant_count: variantCount }),
      }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 9000, temperature: ctx.getStageTemperature(project, 'incubation', 0.65), skipMemory: true })
      const payload = ctx.normalizeIncubatorPayload(getNovelPayload(result), chapterCount)
      if ((result as any).error || !ctx.isUsableIncubatorPayload(payload)) {
        await appendNovelRun(activeWorkspace, {
          project_id: project.id,
          run_type: 'original_incubation',
          step_name: 'preview',
          status: 'failed',
          input_ref: JSON.stringify(req.body || {}),
          output_ref: JSON.stringify({ payload, modelName: (result as any).modelName, raw_preview: String((result as any).content || (result as any).raw?.choices?.[0]?.message?.content || '').slice(0, 3000) }),
          error_message: (result as any).error || '模型未返回有效原创孵化方案',
        })
        return res.status(502).json({
          error: (result as any).error || '模型未返回有效原创孵化方案，请重试或切换模型。',
          error_code: 'ORIGINAL_INCUBATION_EMPTY',
          payload,
          raw_preview: String((result as any).content || (result as any).raw?.choices?.[0]?.message?.content || '').slice(0, 3000),
        })
      }
      let updatedProject: any = null
      if (req.body.auto_store !== false) {
        updatedProject = await ctx.storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: req.body.auto_store === false ? 'preview' : 'foundation',
        status: 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ payload, modelName: (result as any).modelName }),
      })
      res.json({ ok: true, payload, run, project: updatedProject, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original/commit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const payload = ctx.normalizeIncubatorPayload(req.body?.payload || project.reference_config?.original_incubator_last_payload || {}, Number(req.body?.chapter_count || 80))
      const updated = await ctx.storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: 'commit',
        status: 'success',
        input_ref: JSON.stringify({ confirmed: true }),
        output_ref: JSON.stringify({ payload }),
      })
      res.json({ ok: true, project: updated, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
