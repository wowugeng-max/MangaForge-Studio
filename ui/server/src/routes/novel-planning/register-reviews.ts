import type { Express } from 'express'
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
import type {
  PlanningRoutesContext,
} from './builders'
import {
  applyFuture100SkeletonOutlines,
  applyRollingPlanOutlines,
  buildAbExperimentReport,
  buildCandidateProject,
  buildFuture100Prompt,
  buildFuture100SkeletonAudit,
  buildFuture100WritePreview,
  buildRegressionIssues,
  buildRegressionSampleSet,
  diffSandboxText,
  extractSandboxText,
  mergeSandboxParagraphs,
  normalizeFuture100Skeleton,
  normalizeRollingPlanPayload,
  runRegressionSuite,
  suggestedAbCandidateConfig,
} from './builders'

export function registerNovelPlanningReviewRoutes(app: Express, ctx: PlanningRoutesContext) {
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

}
