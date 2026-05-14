import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  updateNovelProject,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { asArray, compactText, getNovelPayload, parseJsonLikePayload } from './novel-route-utils'

type PlanningRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  getStageTemperature: (project: any, stage: string, fallback: number) => number
  getModelStrategy: (project: any, preferredModelId?: number) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildOriginalIncubatorPrompt: (project: any, body: any) => string[]
  normalizeIncubatorPayload: (payload: any, chapterCount: number) => any
  storeOriginalIncubatorPayload: (workspace: string, project: any, payload: any) => Promise<any>
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
