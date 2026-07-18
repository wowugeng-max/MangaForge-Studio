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

export function registerNovelPlanningOpsRoutes(app: Express, ctx: PlanningRoutesContext) {
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
      const rollingPlanIntent = req.body.rolling_plan_intent || req.body.rollingPlanIntent || null
      const targetChapters = chapters.filter(ch => ch.chapter_no >= fromChapter).slice(0, horizon)
      const prompt = [
        '任务：生成未来章节滚动规划，只输出 JSON。',
        `项目：${project.title}`,
        `从第 ${fromChapter} 章开始，规划未来 ${horizon} 章。`,
        '需要输出：rolling_plan(array: chapter_no,title,chapter_goal,conflict,payoff,reader_payoff,foreshadowing_to_use,ending_hook,signature_scene,scene_repair_target,storyline_service), volume_remaining_goals, foreshadowing_recovery_plan, character_growth_nodes, risk_notes。',
        '【滚动规划意图】',
        rollingPlanIntent
          ? JSON.stringify(rollingPlanIntent, null, 2).slice(0, 4000)
          : '常规未来10章滚动规划。',
        rollingPlanIntent?.source === 'batch_brief_repair'
          ? '本次是批次任务书补齐：优先修复缺逐章职责、冲突落点、主线推进或章末钩子；输出的 rolling_plan 必须让目标批次可检查、可小批量连写。'
          : '',
        rollingPlanIntent?.source === 'recent_fatigue_repair'
          ? [
              '本次是近10章疲劳修复：优先根据 recent_fatigue_radar 中的 warn 信号做未来章节差异化规划。',
              '具体要求：更换冲突来源；更换回报/爽点形态；更换章末追读问题；更换标志性场面；每章必须在 chapter_goal/conflict/payoff/ending_hook 中体现差异化职责。',
              '如果 warn 信号包含 IP场面覆盖 或 场面新鲜度不足，必须生成“标志性场面补位”：至少指定 1-3 个补位章节；每个补位章节在 signature_scene 写明本章要补的标志性场面，在 scene_repair_target 写明修复哪个覆盖缺口，在 storyline_service 写明服务的主线推进或爽点回报。',
              '标志性场面必须是可被读者记住、可短剧/漫剧化的空间冲突、反转动作、规则压迫或视觉化爽点；不能只写“增加场面新鲜度”这类抽象说明。',
              '边界：不得改变主线方向、长期设定和已确认剧情线；只能调整后续章节的表达节奏、压迫来源、回报形态和场面安排。',
            ].join('\n')
          : '',
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
      const rollingPlan = normalizeRollingPlanPayload(report, fromChapter, horizon)
      const shouldWriteOutlines = req.body?.write_rolling_outlines !== false
      const applied = shouldWriteOutlines
        ? await applyRollingPlanOutlines(activeWorkspace, project, outlines, rollingPlan, rollingPlanIntent)
        : {
            writtenOutlines: [],
            writtenChapters: [],
            writeSummary: { created: 0, updated: 0, skipped: rollingPlan.length },
            chapterWriteSummary: { created: 0, updated: 0, skipped: rollingPlan.length },
          }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'rolling_plan',
        status: 'ok',
        summary: `滚动规划：第${fromChapter}章起 ${horizon} 章${shouldWriteOutlines ? `，大纲创建 ${applied.writeSummary.created}，章节占位创建 ${applied.chapterWriteSummary.created}` : ''}`,
        issues: asArray(report.risk_notes).map((item: any) => String(item)),
        payload: JSON.stringify({
          report,
          rolling_plan: rollingPlan,
          from_chapter: fromChapter,
          horizon,
          rolling_plan_intent: rollingPlanIntent,
          written_outline_ids: applied.writtenOutlines.map((item: any) => item.id),
          written_chapter_ids: applied.writtenChapters.map((item: any) => item.id),
          write_summary: applied.writeSummary,
          chapter_write_summary: applied.chapterWriteSummary,
        }),
      })
      res.json({
        ok: true,
        report,
        rolling_plan: rollingPlan,
        review: saved,
        written_outlines: applied.writtenOutlines,
        written_chapters: applied.writtenChapters,
        write_summary: applied.writeSummary,
        chapter_write_summary: applied.chapterWriteSummary,
        result,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/future-100-skeleton', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFuture100SkeletonAudit(project, chapters, outlines, reviews, {
        from_chapter: Number(req.query.from_chapter || 0) || undefined,
        horizon: Number(req.query.horizon || 100) || 100,
      })
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/future-100-skeleton/generate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const horizon = Math.max(20, Math.min(120, Number(req.body.horizon || 100)))
      const audit = buildFuture100SkeletonAudit(project, chapters, outlines, reviews, {
        from_chapter: Number(req.body.from_chapter || 0) || undefined,
        horizon,
      })
      const prompt = buildFuture100Prompt(project, chapters, outlines, reviews, audit.from_chapter, horizon, audit)
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: String(modelId),
        maxTokens: 12000,
        temperature: ctx.getStageTemperature(project, 'outline', 0.45),
        skipMemory: true,
      })
      const payload = getNovelPayload(result)
      const skeleton = normalizeFuture100Skeleton(payload, audit.from_chapter, horizon)
      const writtenOutlines: any[] = []
      const writeMode = req.body?.write_mode === 'append' || req.body?.overwrite_outline === false ? 'append' : 'upsert'
      const writeSummary = { mode: writeMode, created: 0, updated: 0, skipped: 0 }
      let writePreview = buildFuture100WritePreview(outlines, skeleton, { write_mode: writeMode })
      if (req.body?.write_outline === true) {
        const applied = await applyFuture100SkeletonOutlines(activeWorkspace, project, outlines, skeleton, { write_mode: writeMode })
        writtenOutlines.push(...applied.writtenOutlines)
        writeSummary.created = applied.writeSummary.created
        writeSummary.updated = applied.writeSummary.updated
        writeSummary.skipped = applied.writeSummary.skipped
        writePreview = applied.writePreview
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'future_100_skeleton',
        status: skeleton.length >= Math.min(80, horizon) ? 'ok' : 'warn',
        summary: `未来100章骨架：生成 ${skeleton.length}/${horizon} 章${req.body?.write_outline === true ? `，创建 ${writeSummary.created}，更新 ${writeSummary.updated}` : ''}`,
        issues: asArray(payload?.risk_notes).slice(0, 30).map((item: any) => String(item)),
        payload: JSON.stringify({ audit, skeleton, payload, written_outline_ids: writtenOutlines.map(item => item.id), write_summary: writeSummary, write_preview: writePreview }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'future_100_skeleton',
        step_name: `future-100-${audit.from_chapter}-${audit.from_chapter + horizon - 1}`,
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, from_chapter: audit.from_chapter, horizon, write_outline: req.body?.write_outline === true, write_mode: writeMode }),
        output_ref: JSON.stringify({ audit, skeleton, review_id: review.id, written_outline_count: writtenOutlines.length, write_summary: writeSummary, write_preview: writePreview, modelName: (result as any).modelName }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, audit, skeleton, payload, review, run, written_outlines: writtenOutlines, write_summary: writeSummary, write_preview: writePreview, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/future-100-skeleton/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const skeleton = normalizeFuture100Skeleton({ skeleton: req.body?.skeleton || [] }, Number(req.body?.from_chapter || 1), Math.max(20, Math.min(120, Number(req.body?.horizon || 100))))
      if (!skeleton.length) return res.status(400).json({ error: 'skeleton is required' })
      const outlines = await listNovelOutlines(activeWorkspace, project.id)
      const applied = await applyFuture100SkeletonOutlines(activeWorkspace, project, outlines, skeleton, {
        write_mode: req.body?.write_mode || 'upsert',
        selected_chapter_nos: req.body?.selected_chapter_nos,
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'future_100_skeleton_apply',
        status: applied.writeSummary.created + applied.writeSummary.updated > 0 ? 'ok' : 'warn',
        summary: `应用未来100章骨架：创建 ${applied.writeSummary.created}，更新 ${applied.writeSummary.updated}，跳过 ${applied.writeSummary.skipped}`,
        issues: [],
        payload: JSON.stringify({ skeleton, written_outline_ids: applied.writtenOutlines.map(item => item.id), write_summary: applied.writeSummary, write_preview: applied.writePreview }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'future_100_skeleton_apply',
        step_name: `future-100-apply-${skeleton[0]?.chapter_no || 'start'}-${skeleton[skeleton.length - 1]?.chapter_no || 'end'}`,
        status: 'success',
        input_ref: JSON.stringify({ write_mode: req.body?.write_mode || 'upsert', selected_chapter_nos: req.body?.selected_chapter_nos || [] }),
        output_ref: JSON.stringify({ review_id: review.id, written_outline_count: applied.writtenOutlines.length, write_summary: applied.writeSummary, write_preview: applied.writePreview }),
      })
      const [chapters, nextOutlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const audit = buildFuture100SkeletonAudit(project, chapters, nextOutlines, reviews, {
        from_chapter: skeleton[0]?.chapter_no || Number(req.body?.from_chapter || 1),
        horizon: skeleton.length,
      })
      res.json({ ok: true, audit, skeleton, review, run, written_outlines: applied.writtenOutlines, write_summary: applied.writeSummary, write_preview: applied.writePreview })
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
