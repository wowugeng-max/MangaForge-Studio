import {
  appendNovelRun,
  createNovelOutline,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  upsertNovelChapterByNumber,
} from '../../novel'
import { executeNovelAgent, generateNovelChapterProse } from '../../llm'
import { asArray, clampScore, compactPreviousChaptersForProse, compactText, deepMergeObjects, getNovelPayload, parseJsonLikePayload } from '../novel-route-utils'

export type PlanningRoutesContext = {
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

export function buildRegressionSampleSet(project: any, chapters: any[], reviews: any[], issues: any[] = [], maxSamples = 10) {
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

export function buildRegressionIssues(project: any, chapters: any[]) {
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

export function runRegressionSuite(project: any, suite: any, chapters: any[], reviews: any[], runs: any[], issues: any[] = [], options: any = {}) {
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

export function suggestedAbCandidateConfig(project: any, preferredModelId?: number) {
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

export function buildCandidateProject(project: any, candidateConfig: any) {
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

export function buildAbExperimentReport(project: any, experiment: any, suite: any, chapters: any[], reviews: any[], runs: any[], issues: any[], options: any = {}) {
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

export function extractSandboxText(result: any) {
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

export function diffSandboxText(before: string, after: string) {
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

export function mergeSandboxParagraphs(currentText: string, candidateText: string, paragraphIndexes: number[]) {
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

function outlineChapterNo(outline: any) {
  const rawNo = Number(outline.raw_payload?.chapter_no || outline.raw_payload?.future100?.chapter_no || outline.raw_payload?.skeleton?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function findChapterOutlineForNo(outlines: any[], chapterNo: number) {
  return outlines
    .filter(outline => String(outline.outline_type || '') === 'chapter' && Number(outlineChapterNo(outline)) === Number(chapterNo))
    .sort((a, b) => {
      const aFuture = a.raw_payload?.source === 'future_100_skeleton' ? 1 : 0
      const bFuture = b.raw_payload?.source === 'future_100_skeleton' ? 1 : 0
      return bFuture - aFuture || String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || Number(b.id || 0) - Number(a.id || 0)
    })[0] || null
}

export function buildFuture100SkeletonAudit(project: any, chapters: any[], outlines: any[], reviews: any[], options: any = {}) {
  const sortedChapters = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const firstUnwritten = sortedChapters.find(chapter => !chapter.chapter_text)?.chapter_no
  const startChapter = Math.max(1, Number(options.from_chapter || firstUnwritten || (Math.max(0, ...sortedChapters.map(ch => Number(ch.chapter_no || 0))) + 1) || 1))
  const horizon = Math.max(20, Math.min(120, Number(options.horizon || 100)))
  const endChapter = startChapter + horizon - 1
  const chapterByNo = new Map(sortedChapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
  const chapterOutlines = outlines.filter(item => String(item.outline_type || '') === 'chapter')
  const volumeOutlines = outlines.filter(item => ['volume', 'arc', 'part'].includes(String(item.outline_type || '')))
  const latestLongform = reviews
    .filter(review => review.review_type === 'longform_pressure_test')
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0]?.payload?.report || null
  const rows = Array.from({ length: horizon }, (_, index) => {
    const chapterNo = startChapter + index
    const chapter = chapterByNo.get(chapterNo)
    const outline = findChapterOutlineForNo(chapterOutlines, chapterNo)
    const raw = outline?.raw_payload || {}
    const text = [
      chapter?.title,
      chapter?.chapter_goal,
      chapter?.chapter_summary,
      chapter?.ending_hook,
      outline?.title,
      outline?.summary,
      outline?.hook,
      raw.conflict,
      raw.payoff,
      raw.ending_hook,
      raw.chapter_goal,
    ].filter(Boolean).join('\n')
    const hasTitle = Boolean(chapter?.title || outline?.title)
    const hasGoal = String(chapter?.chapter_goal || chapter?.chapter_summary || raw.chapter_goal || outline?.summary || '').replace(/\s/g, '').length >= 18
    const hasConflict = /冲突|危机|敌|压迫|竞争|追杀|考核|阻碍|代价|选择|失败|秘密|阴谋|规则/.test(text)
    const hasPayoff = /爽|赢|突破|奖励|收获|身份|资源|打脸|反转|真相|升级|关系/.test(text)
    const hasHook = String(chapter?.ending_hook || raw.ending_hook || outline?.hook || '').replace(/\s/g, '').length >= 8 || /却|然而|忽然|没想到|下一刻|身后|门外|消息|秘密/.test(text.slice(-220))
    const score = Math.max(0, Math.min(100, 20 + (hasTitle ? 12 : 0) + (hasGoal ? 22 : 0) + (hasConflict ? 22 : 0) + (hasPayoff ? 14 : 0) + (hasHook ? 10 : 0)))
    return {
      chapter_no: chapterNo,
      chapter_id: chapter?.id || null,
      outline_id: outline?.id || null,
      title: chapter?.title || outline?.title || '',
      has_title: hasTitle,
      has_goal: hasGoal,
      has_conflict: hasConflict,
      has_payoff: hasPayoff,
      has_hook: hasHook,
      score,
      flags: [
        !hasTitle ? '缺标题' : '',
        !hasGoal ? '缺章节目标' : '',
        !hasConflict ? '缺冲突压力' : '',
        !hasPayoff ? '缺回报/爽点' : '',
        !hasHook ? '缺章末钩子' : '',
      ].filter(Boolean),
    }
  })
  const countRate = (predicate: (row: any) => boolean) => rows.length ? Math.round(rows.filter(predicate).length / rows.length * 100) : 0
  const coverage = countRate(row => row.has_goal || row.outline_id || row.chapter_id)
  const goalRate = countRate(row => row.has_goal)
  const conflictRate = countRate(row => row.has_conflict)
  const payoffRate = countRate(row => row.has_payoff)
  const hookRate = countRate(row => row.has_hook)
  const stageAnchors = rows.filter((row, index) => index % 20 === 0 || index % 25 === 0 || index === rows.length - 1)
  const stageAnchorRate = stageAnchors.length ? Math.round(stageAnchors.filter(row => row.has_conflict && row.has_payoff).length / stageAnchors.length * 100) : 0
  const risks: any[] = []
  const addRisk = (severity: string, issue: string, action: string) => risks.push({ severity, issue, action })
  if (coverage < 80) addRisk('high', `未来${horizon}章骨架覆盖率只有 ${coverage}%。`, '先补齐100章标题、目标、冲突、回报和章末钩子，再进入长线批量生成。')
  if (goalRate < 80) addRisk('high', `章节目标覆盖率只有 ${goalRate}%。`, '每章必须能回答“主角这章要解决什么，以及失败代价是什么”。')
  if (conflictRate < 70) addRisk('high', `冲突压力覆盖率只有 ${conflictRate}%。`, '补阶段反派、竞争、规则限制或资源争夺，避免流水账。')
  if (payoffRate < 65) addRisk('medium', `回报/爽点覆盖率只有 ${payoffRate}%。`, '每3-5章安排可感知收益，每20-30章安排阶段结算。')
  if (hookRate < 70) addRisk('medium', `章末钩子覆盖率只有 ${hookRate}%。`, '每章结尾至少保留未解问题、更大威胁或利益诱惑。')
  if (volumeOutlines.length < 4) addRisk('medium', '分卷/阶段锚点不足。', '补未来100章所属卷/阶段，每20-30章要有一次身份、地图、敌人或目标变化。')
  if (latestLongform && Number(latestLongform.score || 0) < 70) addRisk('medium', `最近300万字压力测试只有 ${latestLongform.score} 分。`, '先处理长线压力测试中的高危薄弱点，再生成百章骨架。')
  const averageRowScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
  const score = Math.max(0, Math.min(100, Math.round(
    averageRowScore * 0.45
    + coverage * 0.12
    + goalRate * 0.12
    + conflictRate * 0.12
    + payoffRate * 0.08
    + hookRate * 0.08
    + stageAnchorRate * 0.03
    - risks.reduce((sum, risk) => sum + (risk.severity === 'high' ? 4 : 2), 0),
  )))
  return {
    report_id: `future100-${Date.now()}`,
    created_at: new Date().toISOString(),
    from_chapter: startChapter,
    to_chapter: endChapter,
    horizon,
    score,
    status: score >= 80 ? 'ready' : score >= 62 ? 'fragile' : 'blocked',
    summary: score >= 80 ? '未来100章骨架具备长线推进基础。' : score >= 62 ? '未来100章已有雏形，但冲突/回报/钩子仍需补强。' : '未来100章骨架不足，不建议进入长线批量生成。',
    metrics: {
      coverage,
      goal_rate: goalRate,
      conflict_rate: conflictRate,
      payoff_rate: payoffRate,
      hook_rate: hookRate,
      stage_anchor_rate: stageAnchorRate,
      chapter_outline_count: chapterOutlines.length,
      volume_outline_count: volumeOutlines.length,
    },
    risks,
    weak_chapters: rows.filter(row => row.score < 72).slice(0, 30),
    rows,
    next_actions: [
      coverage < 80 ? '生成或补齐未来100章骨架。' : '',
      conflictRate < 70 ? '优先补每20章一个阶段压力源和每章即时冲突。' : '',
      payoffRate < 65 ? '补小结算/大结算节奏，避免只有危机没有回报。' : '',
      hookRate < 70 ? '补章末追读钩子，尤其是20、40、60、80、100章阶段节点。' : '',
      '骨架通过后，再运行未来10章滚动规划进入日更生产。',
    ].filter(Boolean),
  }
}

export function normalizeFuture100Skeleton(payload: any, fromChapter: number, horizon: number) {
  const raw = asArray(payload?.skeleton || payload?.future_100_skeleton || payload?.rolling_plan || payload?.chapters)
  return raw.slice(0, horizon).map((item: any, index: number) => {
    const chapterNo = Number(item.chapter_no || item.no || item.index || 0) || fromChapter + index
    return {
      chapter_no: chapterNo,
      title: String(item.title || `第${chapterNo}章`),
      chapter_goal: String(item.chapter_goal || item.goal || item.summary || ''),
      conflict: String(item.conflict || item.pressure || item.obstacle || ''),
      payoff: String(item.payoff || item.reward || item.commercial_payoff || ''),
      foreshadowing: asArray(item.foreshadowing || item.foreshadowing_to_use || item.clues).map(String),
      ending_hook: String(item.ending_hook || item.hook || ''),
      volume_stage: String(item.volume_stage || item.stage || item.arc || ''),
      commercial_purpose: String(item.commercial_purpose || item.reader_effect || item.purpose || ''),
      risk_notes: asArray(item.risk_notes || item.risks).map(String),
    }
  })
}

export function normalizeRollingPlanPayload(payload: any, fromChapter: number, horizon: number) {
  const raw = asArray(payload?.rolling_plan || payload?.rollingPlan || payload?.chapters || payload?.plan)
  return raw.slice(0, horizon).map((item: any, index: number) => {
    const chapterNo = Number(item.chapter_no || item.no || item.index || 0) || fromChapter + index
    return {
      chapter_no: chapterNo,
      title: String(item.title || `第${chapterNo}章`),
      chapter_goal: String(item.chapter_goal || item.goal || item.chapterTask || item.task || item.summary || ''),
      conflict: String(item.conflict || item.pressure || item.obstacle || ''),
      payoff: String(item.payoff || item.reward || item.commercial_payoff || ''),
      foreshadowing_to_use: asArray(item.foreshadowing_to_use || item.foreshadowing || item.clues).map(String),
      ending_hook: String(item.ending_hook || item.hook || ''),
      signature_scene: String(item.signature_scene || item.ip_scene || item.visual_scene || item.memorable_scene || ''),
      scene_repair_target: String(item.scene_repair_target || item.scene_gap_repair || item.repair_target || ''),
      reader_payoff: String(item.reader_payoff || item.reader_reward || item.commercial_payoff || item.payoff || ''),
      storyline_service: String(item.storyline_service || item.mainline_service || item.storyline_advance || item.mainline_progress || ''),
      mainline_progress: String(item.mainline_progress || item.volume_stage || item.commercial_purpose || item.storyline_advance || ''),
      risk_notes: asArray(item.risk_notes || item.risks).map(String),
    }
  })
}

function future100OutlineData(project: any, item: any) {
  return {
    project_id: project.id,
    outline_type: 'chapter',
    title: `第${item.chapter_no}章 ${item.title}`,
    summary: item.chapter_goal,
    conflict_points: [item.conflict].filter(Boolean),
    turning_points: [item.payoff, item.commercial_purpose].filter(Boolean),
    hook: item.ending_hook,
    raw_payload: {
      source: 'future_100_skeleton',
      chapter_no: item.chapter_no,
      future100: item,
      generated_at: new Date().toISOString(),
    },
  } as any
}

function rollingPlanOutlineData(project: any, item: any, rollingPlanIntent: any) {
  return {
    project_id: project.id,
    outline_type: 'chapter',
    title: `第${item.chapter_no}章 ${item.title}`,
    summary: [item.chapter_goal, item.signature_scene ? `标志性场面：${item.signature_scene}` : ''].filter(Boolean).join('\n'),
    conflict_points: [item.conflict, item.scene_repair_target].filter(Boolean),
    turning_points: [item.payoff, item.reader_payoff, item.mainline_progress, item.storyline_service, item.signature_scene].filter(Boolean),
    hook: item.ending_hook,
    raw_payload: {
      source: 'rolling_plan',
      chapter_no: item.chapter_no,
      rollingPlan: item,
      rolling_plan_intent: rollingPlanIntent || null,
      generated_at: new Date().toISOString(),
    },
  } as any
}

function rollingPlanChapterData(project: any, item: any, outline: any, rollingPlanIntent: any) {
  return {
    project_id: project.id,
    outline_id: outline?.id || null,
    chapter_no: Number(item.chapter_no || 0),
    title: String(item.title || `第${item.chapter_no}章`),
    chapter_goal: String(item.chapter_goal || ''),
    chapter_summary: [item.chapter_goal, item.signature_scene ? `标志性场面：${item.signature_scene}` : '', item.scene_repair_target ? `场面补位：${item.scene_repair_target}` : ''].filter(Boolean).join('\n') || String(item.payoff || item.conflict || ''),
    conflict: String(item.conflict || ''),
    ending_hook: String(item.ending_hook || ''),
    status: 'planned',
    raw_payload: {
      source: 'rolling_plan',
      chapter_no: Number(item.chapter_no || 0),
      rollingPlan: item,
      rolling_plan_intent: rollingPlanIntent || null,
      generated_at: new Date().toISOString(),
    },
  } as any
}

export function buildFuture100WritePreview(outlines: any[], skeleton: any[], options: any = {}) {
  const writeMode = options.write_mode === 'append' || options.overwrite_outline === false ? 'append' : 'upsert'
  const selected = Array.isArray(options.selected_chapter_nos)
    ? new Set(options.selected_chapter_nos.map((item: any) => Number(item)).filter(Boolean))
    : null
  const rows = skeleton.map(item => {
    const selectedForWrite = !selected || selected.has(Number(item.chapter_no))
    const existing = writeMode === 'upsert' ? findChapterOutlineForNo(outlines, item.chapter_no) : null
    const action = !selectedForWrite ? 'skipped' : existing?.id ? 'update' : 'create'
    return {
      chapter_no: item.chapter_no,
      title: item.title,
      action,
      selected: selectedForWrite,
      existing_outline_id: existing?.id || null,
      existing_title: existing?.title || '',
      existing_summary: compactText(existing?.summary || '', 180),
      next_summary: compactText(item.chapter_goal || item.conflict || '', 180),
      changed: existing ? (
        String(existing.title || '') !== `第${item.chapter_no}章 ${item.title}`
        || String(existing.summary || '') !== String(item.chapter_goal || '')
        || String(existing.hook || '') !== String(item.ending_hook || '')
      ) : true,
    }
  })
  return {
    mode: writeMode,
    created: rows.filter(row => row.action === 'create').length,
    updated: rows.filter(row => row.action === 'update').length,
    skipped: rows.filter(row => row.action === 'skipped').length,
    rows,
  }
}

export async function applyFuture100SkeletonOutlines(activeWorkspace: string, project: any, outlines: any[], skeleton: any[], options: any = {}) {
  const preview = buildFuture100WritePreview(outlines, skeleton, options)
  const writtenOutlines: any[] = []
  const writeSummary = { mode: preview.mode, created: 0, updated: 0, skipped: 0 }
  for (const row of preview.rows) {
    const item = skeleton.find(entry => Number(entry.chapter_no) === Number(row.chapter_no))
    if (!item || row.action === 'skipped') {
      writeSummary.skipped += 1
      continue
    }
    const outlineData = future100OutlineData(project, item)
    if (row.action === 'update' && row.existing_outline_id) {
      const updated = await updateNovelOutline(activeWorkspace, row.existing_outline_id, outlineData)
      if (updated) {
        writtenOutlines.push(updated)
        writeSummary.updated += 1
      } else {
        writeSummary.skipped += 1
      }
    } else {
      const created = await createNovelOutline(activeWorkspace, outlineData)
      writtenOutlines.push(created)
      writeSummary.created += 1
    }
  }
  return { writtenOutlines, writeSummary, writePreview: preview }
}

export async function applyRollingPlanOutlines(activeWorkspace: string, project: any, outlines: any[], rollingPlan: any[], rollingPlanIntent: any) {
  const writtenOutlines: any[] = []
  const writtenChapters: any[] = []
  const writeSummary = { created: 0, updated: 0, skipped: 0 }
  const chapterWriteSummary = { created: 0, updated: 0, skipped: 0 }
  const existingChaptersByNo = new Map((await listNovelChapters(activeWorkspace, project.id))
    .map(chapter => [Number(chapter.chapter_no || 0), chapter]))
  for (const item of rollingPlan) {
    const outlineData = rollingPlanOutlineData(project, item, rollingPlanIntent)
    const existing = findChapterOutlineForNo(outlines, item.chapter_no)
    let writtenOutline: any = null
    if (existing?.id) {
      const updated = await updateNovelOutline(activeWorkspace, existing.id, outlineData)
      if (updated) {
        writtenOutline = updated
        writtenOutlines.push(updated)
        writeSummary.updated += 1
      } else {
        writeSummary.skipped += 1
      }
    } else {
      const created = await createNovelOutline(activeWorkspace, outlineData)
      writtenOutline = created
      writtenOutlines.push(created)
      writeSummary.created += 1
    }
    if (!writtenOutline) {
      chapterWriteSummary.skipped += 1
      continue
    }
    const chapterNo = Number(item.chapter_no || 0)
    const existingChapter = existingChaptersByNo.get(chapterNo)
    const writtenChapter = await upsertNovelChapterByNumber(activeWorkspace, rollingPlanChapterData(project, item, writtenOutline, rollingPlanIntent))
    if (writtenChapter) {
      writtenChapters.push(writtenChapter)
      existingChaptersByNo.set(chapterNo, writtenChapter)
      if (existingChapter?.id) chapterWriteSummary.updated += 1
      else chapterWriteSummary.created += 1
    } else {
      chapterWriteSummary.skipped += 1
    }
  }
  return { writtenOutlines, writtenChapters, writeSummary, chapterWriteSummary }
}

export const __testExports = {
  applyRollingPlanOutlines,
  rollingPlanChapterData,
}

export function buildFuture100Prompt(project: any, chapters: any[], outlines: any[], reviews: any[], fromChapter: number, horizon: number, audit: any) {
  const recentChapters = chapters
    .slice()
    .sort((a, b) => Number(b.chapter_no || 0) - Number(a.chapter_no || 0))
    .slice(0, 12)
    .reverse()
    .map(chapter => ({
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      goal: chapter.chapter_goal,
      summary: chapter.chapter_summary,
      ending_hook: chapter.ending_hook,
      written: Boolean(chapter.chapter_text),
    }))
  return [
    '任务：为商业长篇网文生成未来100章骨架，只输出 JSON。',
    `项目：${project.title} / ${project.genre || ''}`,
    `规划范围：第 ${fromChapter} 章到第 ${fromChapter + horizon - 1} 章，共 ${horizon} 章。`,
    '目标：支撑300万字以上长篇连载，避免塌线；每章必须有目标、冲突、回报/爽点、章末钩子；每20-30章有阶段结算和新压力源。',
    '输出结构：{"skeleton":[{"chapter_no":1,"title":"","chapter_goal":"","conflict":"","payoff":"","foreshadowing":[],"ending_hook":"","volume_stage":"","commercial_purpose":"","risk_notes":[]}],"volume_beats":[],"reader_retention_strategy":[],"risk_notes":[]}',
    '【本地骨架审计】',
    JSON.stringify({ score: audit.score, metrics: audit.metrics, risks: audit.risks, weak_chapters: audit.weak_chapters?.slice(0, 20) }, null, 2),
    '【写作圣经/状态机】',
    JSON.stringify({ writing_bible: project.reference_config?.writing_bible || {}, story_state: project.reference_config?.story_state || {} }, null, 2).slice(0, 7000),
    '【已有分卷/大纲】',
    JSON.stringify(outlines.slice(0, 120), null, 2).slice(0, 9000),
    '【近期章节】',
    JSON.stringify(recentChapters, null, 2),
    '【近期审稿风险】',
    JSON.stringify(reviews.slice(0, 12).map(item => ({ type: item.review_type, summary: item.summary, issues: item.issues })), null, 2).slice(0, 4000),
  ].join('\n')
}

