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
  updateNovelRun,
} from '../novel'
import { generateNovelChapterProse } from '../llm'
import { asArray, getNovelPayload, normalizeSceneProduction, parseJsonLikePayload } from './novel-route-utils'

type GenerationRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getModelStrategy: (project: any, preferredModelId?: number) => any
  getApprovalPolicy: (project: any) => any
  buildChapterGroupStages: () => any[]
  updateChapterStages: (stages: any[], key: string, patch?: any) => any[]
  classifyGenerationFailure: (error: any) => any
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
  buildPipelineSteps: () => any[]
  updatePipelineStep: (steps: any[], key: string, patch: any) => any[]
  buildChapterContextPackage: (
    workspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[],
  ) => Promise<any>
  generateSceneCardsForChapter: (workspace: string, project: any, contextPackage: any, modelId?: number) => Promise<any>
  getReferenceMigrationPlanForChapter: (workspace: string, project: any, chapter: any) => Promise<any>
  buildParagraphProseContext: (project: any, contextPackage: any, migrationPlan?: any) => string[]
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  runProseSelfReviewAndRevision: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  getReferenceSafetyDecision: (project: any, referenceReport: any) => any
  explainReferenceSafety: (referenceReport: any, safetyDecision: any) => any
  buildMigrationAudit: (project: any, referenceReport: any, safetyExplanation: any) => any
  updateStoryStateMachine: (workspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
}

export function registerNovelGenerationRoutes(app: Express, ctx: GenerationRoutesContext) {
  app.post('/api/novel/projects/:id/chapter-groups/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const selected = chapters.filter(ch => ch.chapter_no >= startNo && ch.chapter_no < startNo + count)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: selected.map(ch => ({
          id: ch.id,
          chapter_no: ch.chapter_no,
          title: ch.title,
          status: ch.chapter_text ? 'written' : 'pending',
          scenes: normalizeSceneProduction(asArray(ch.scene_breakdown).length ? ch.scene_breakdown : asArray(ch.scene_list), [], ch.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        current_index: 0,
        mode: req.body.mode || 'group',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: Number(req.body.quality_threshold || 78),
        },
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `chapter-${startNo}-${startNo + count - 1}`,
        status: 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
      })
      res.json({ ok: true, run, group: output })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const result = await ctx.executeChapterGroupRunRecord(activeWorkspace, project, run, req.body || {})
      res.json({ ok: true, ...result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/approve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const stage = String(req.body.stage || payload.last_error?.approval_stage || 'scene_cards')
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: String(req.body.note || ''),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        stages: ctx.updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章已确认，等待继续执行`, approved_at: new Date().toISOString() }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/retry-now', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-groups/:runId/scenes', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const run = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      res.json({
        ok: true,
        run_id: run.id,
        scenes: chapters.map((chapter: any) => ({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status,
          scenes: Array.isArray(chapter.scenes) ? chapter.scenes : [],
        })),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/failure-recovery-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const plan = ctx.classifyGenerationFailure({ message: run.error_message || payload?.error || payload?.last_error?.error || JSON.stringify(payload).slice(0, 500), code: payload?.last_error?.error_code || payload?.error_code })
      res.json({ ok: true, plan, run_id: run.id, status: run.status })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generation-pipeline/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      let contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      let steps = ctx.buildPipelineSteps()
      steps = ctx.updatePipelineStep(steps, 'context', {
        status: contextPackage.preflight.ready ? 'success' : 'warn',
        detail: contextPackage.preflight.warnings.join('；'),
      })
      let updatedChapter = chapter
      if (req.body?.generate_scene_cards === true) {
        const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
        if (sceneResult.sceneCards.length > 0) {
          updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
            scene_breakdown: sceneResult.sceneCards,
            scene_list: sceneResult.sceneCards,
            raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'pipeline_confirmation' },
          } as any, { createVersion: false }) || chapter
          const refreshedChapters = await listNovelChapters(activeWorkspace, projectId)
          contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, updatedChapter, refreshedChapters, worldbuilding, characters, outlines, reviews)
          steps = ctx.updatePipelineStep(steps, 'scene_cards', {
            status: 'needs_confirmation',
            detail: `已生成 ${sceneResult.sceneCards.length} 个场景卡，等待人工确认。`,
            scene_cards: sceneResult.sceneCards,
          })
        } else {
          steps = ctx.updatePipelineStep(steps, 'scene_cards', { status: 'failed', detail: '模型未返回场景卡' })
        }
      }
      const output = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        current_step: req.body?.generate_scene_cards === true ? 'scene_cards' : 'context',
        steps,
        context_package: contextPackage,
        confirmed_scene_cards: false,
        can_resume_from: req.body?.generate_scene_cards === true ? 'draft' : 'scene_cards',
        resume_endpoint: `/api/novel/chapters/${chapter.id}/generate-prose`,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'chapter_generation_pipeline',
        step_name: `chapter-${chapter.chapter_no}`,
        status: req.body?.generate_scene_cards === true ? 'paused' : 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
      })
      res.json({ ok: true, run, pipeline: output, chapter: updatedChapter })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/scene-cards', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        return res.status(412).json({ error: '场景卡生成前置检查未通过', error_code: 'SCENE_PREFLIGHT_BLOCKED', preflight: contextPackage.preflight, context_package: contextPackage })
      }
      const result = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
      if (!result.sceneCards.length) return res.status(502).json({ error: '模型未返回场景卡', result: result.result })
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        scene_breakdown: result.sceneCards,
        scene_list: result.sceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'manual_pipeline' },
      } as any, { createVersion: false })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'scene_cards', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ scene_cards: result.sceneCards, modelName: (result.result as any).modelName }) })
      res.json({ chapter: updated, scene_cards: result.sceneCards, result: result.result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generate-prose', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      let chapters = await listNovelChapters(activeWorkspace, projectId)
      let chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const [worldbuilding, characters, outlines, reviews] = await Promise.all([listNovelWorldbuilding(activeWorkspace, projectId), listNovelCharacters(activeWorkspace, projectId), listNovelOutlines(activeWorkspace, projectId), listNovelReviews(activeWorkspace, projectId)])
      const pipeline: any[] = []
      const markStage = (key: string, label: string, status: string, detail = '', extra: any = {}) => {
        const stage = { key, label, status, detail, at: new Date().toISOString(), ...extra }
        pipeline.push(stage)
        if (wantsStream && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: label, pipeline, stage })}\n\n`)
        }
        return stage
      }
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
      }
      markStage('context', '构建续写上下文包', 'running')
      let contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      markStage(
        'context',
        contextPackage.preflight.ready ? '续写上下文包已就绪' : '续写上下文包存在缺口',
        contextPackage.preflight.ready ? 'success' : 'warn',
        contextPackage.preflight.warnings.join('；'),
        { context_package: contextPackage },
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: '章节生成前置检查未通过',
          error_code: 'PROSE_PREFLIGHT_BLOCKED',
          context_package: contextPackage,
          preflight: contextPackage.preflight,
          pipeline,
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: '章节生成前置检查未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(412).json(errorPayload)
      }

      if (!contextPackage.chapter_target.scene_cards.length || req.body?.force_scene_cards === true) {
        markStage('scene_cards', '生成章节场景卡', 'running')
        try {
          const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
          if (sceneResult.sceneCards.length > 0) {
            const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
              scene_breakdown: sceneResult.sceneCards,
              scene_list: sceneResult.sceneCards,
              raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'generated' },
            } as any, { createVersion: false })
            if (updatedSceneChapter) chapter = updatedSceneChapter
            chapters = await listNovelChapters(activeWorkspace, projectId)
            contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
            markStage('scene_cards', `场景卡已生成：${sceneResult.sceneCards.length} 个`, 'success', '', { scene_cards: sceneResult.sceneCards })
          } else {
            markStage('scene_cards', '场景卡生成为空，继续使用章节细纲', 'warn')
          }
        } catch (sceneError) {
          markStage('scene_cards', '场景卡生成失败，继续使用章节细纲', 'warn', String(sceneError).slice(0, 200))
        }
      }

      const prevChapters = chapters
        .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
        .slice(-3)
        .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
      markStage('migration_plan', '生成/读取参考迁移计划', 'running')
      const migrationPlan = await ctx.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
      markStage('migration_plan', (migrationPlan as any)?.error ? '参考迁移计划读取失败，继续保守生成' : '参考迁移计划已就绪', (migrationPlan as any)?.error ? 'warn' : 'success', (migrationPlan as any)?.error || '', { migration_plan: migrationPlan })
      markStage('draft', '段落级正文生成', 'running')
      const result = await generateNovelChapterProse(project, chapter, {
        worldbuilding,
        characters,
        outline: outlines,
        prompt: String(req.body.prompt || ''),
        prevChapters,
        contextPackage,
        migrationPlan,
        paragraphTask: ctx.buildParagraphProseContext(project, contextPackage, migrationPlan),
      } as any, activeWorkspace, ctx.getStageModelId(project, 'draft', modelId))
      const resultPayload = getNovelPayload(result)
      const proseArr = Array.isArray(resultPayload?.prose_chapters) ? resultPayload.prose_chapters : []
      const firstProse = proseArr.length > 0 ? proseArr[0] : {}
      const chapterText = resultPayload?.chapter_text || firstProse?.chapter_text
      const sceneBreakdown = resultPayload?.scene_breakdown || firstProse?.scene_breakdown || []
      const continuityNotes = resultPayload?.continuity_notes || firstProse?.continuity_notes || []
      if ((result as any).error || !chapterText) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(resultPayload || null), error_message: String((result as any).error || (result as any).fallbackReason || '模型未返回正文') })
        const errorPayload = { error: String((result as any).error || (result as any).fallbackReason || '模型未返回正文'), result, pipeline, context_package: contextPackage }
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('draft', '章节初稿已生成', 'success', `${String(chapterText).length} 字`)
      markStage('review', '执行章节自检', 'running')
      let selfCheck: any = null
      let finalText = String(chapterText || '')
      let finalSceneBreakdown = sceneBreakdown
      let finalContinuityNotes = continuityNotes
      try {
        selfCheck = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = selfCheck.final_text || finalText
        if (selfCheck.revised && selfCheck.revision) {
          finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'review',
          selfCheck.revised ? '自检完成，已应用修订稿' : '自检完成，初稿可用',
          selfCheck.review?.passed === false ? 'warn' : 'success',
          `评分 ${selfCheck.review?.score ?? '-'}`,
          { self_check: selfCheck.review, revised: selfCheck.revised },
        )
      } catch (reviewError) {
        selfCheck = { error: String(reviewError), revised: false }
        markStage('review', '自检失败，保留初稿', 'warn', String(reviewError).slice(0, 200), { self_check: selfCheck })
      }

      try {
        const review = selfCheck?.review || {}
        await createNovelReview(activeWorkspace, {
          project_id: projectId,
          review_type: 'prose_quality',
          status: review.passed === false || Number(review.score || 100) < 78 ? 'warn' : 'ok',
          summary: `章节自检评分 ${review.score ?? '-'}${selfCheck?.revised ? '，已生成修订稿' : ''}`,
          issues: Array.isArray(review.issues) ? review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
          payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, self_check: selfCheck, pipeline }),
        })
      } catch (reviewStoreError) {
        console.warn('[prose-quality] Failed to store review:', String(reviewStoreError).slice(0, 200))
      }
      let referenceReport: any = null
      let safetyDecision: any = null
      let migrationAudit: any = null
      try {
        markStage('reference_report', '生成参考使用报告', 'running')
        referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
        safetyDecision = ctx.getReferenceSafetyDecision(project, referenceReport)
        const safetyExplanation = ctx.explainReferenceSafety(referenceReport, safetyDecision)
        migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
        markStage('reference_report', safetyDecision.blocked ? '参考安全阈值未通过' : '参考使用报告已生成', safetyDecision.blocked ? 'failed' : 'success', safetyDecision.reasons?.join('；') || '', { reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit })
      } catch (reportError) {
        markStage('reference_report', '参考使用报告生成失败', 'warn', String(reportError).slice(0, 200))
        console.warn('[reference-report] Failed:', String(reportError).slice(0, 200))
      }
      const safetyExplanation = referenceReport && safetyDecision ? ctx.explainReferenceSafety(referenceReport, safetyDecision) : null
      if (!migrationAudit && referenceReport && safetyExplanation) migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
      if (safetyDecision?.blocked) {
        const errorPayload = { error: '仿写安全阈值未通过，正文未入库', error_code: 'REFERENCE_SAFETY_BLOCKED', reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, context_package: contextPackage, self_check: selfCheck, pipeline }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: safetyDecision.reasons?.join('；') || '仿写安全阈值未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(409).json(errorPayload)
      }
      markStage('store', '写入章节正文与版本', 'running')
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, { chapter_text: finalText, scene_breakdown: finalSceneBreakdown, continuity_notes: finalContinuityNotes, status: 'draft' }, { versionSource: selfCheck?.revised ? 'repair' : 'agent_execute' })
      markStage('store', '章节已写入', 'success')
      let storyStateUpdate: any = null
      try {
        markStage('story_state', '更新故事状态机', 'running')
        storyStateUpdate = await ctx.updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, modelId)
        markStage('story_state', '故事状态机已更新', 'success', '', { story_state_update: storyStateUpdate })
      } catch (stateError) {
        markStage('story_state', '故事状态机更新失败', 'warn', String(stateError).slice(0, 200))
      }
      const pipelineResult = { context_package: contextPackage, self_check: selfCheck, pipeline }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ outputSource: (result as any).outputSource, modelId: (result as any).modelId, modelName: (result as any).modelName, providerId: (result as any).providerId, usage: (result as any).usage, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult }) })
      if (!wantsStream) return res.json({ chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })
      const fullText = String(finalText || '')
      const chunkSize = Math.max(40, Math.ceil(fullText.length / 12))
      res.write(`data: ${JSON.stringify({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline })}\n\n`)
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize)
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 40))
      }
      res.write(`data: ${JSON.stringify({ type: 'done', chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })}\n\n`)
      res.end()
    } catch (error) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
        res.end()
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
