import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelRun,
} from '../../novel'
import { buildMaterialScore } from '../novel-chapter-context-routes'
import { asArray, buildLLMResultDiagnostics, compactText, getNovelPayload, normalizeSceneProduction, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, resolveChapterWordTarget } from '../../novel-writing-service'
import { resolveChapterGenerationSource } from '../../novel-writing-service/generation-source/source-config'
import { compactProseGenerationOverride } from '../../novel-writing/prose-generation-contract'
import type {
  GenerationRoutesContext,
} from './builders'
import {
  activeChapterNo,
  approvalBlockerRoutePayload,
  buildStandaloneProseServiceErrorPayload,
  buildStandaloneProseServiceOptions,
  collectMissingPlanningChapterNos,
  compactPlanningEnsureResult,
  compactStandaloneProseProgressStage,
  futureSkeletonFromOutline,
  isApprovalBlockerChapter,
  isLegacyQualityGateApproval,
  isTerminalAdmissionChapter,
  legacyQualityGateRoutePayload,
  outlineChapterNo,
  resolveChapterGroupQualityThreshold,
  scoreFutureSkeletonChapter,
  sseData,
  standaloneProseServiceErrorStatus,
  standaloneProseServiceStageDetail,
  standaloneProseServiceStageLabel,
  stringifyNovelGenerationPayload,
  terminalAdmissionRoutePayload,
} from './builders'

export function registerNovelGenerationChapterPipelineRoutes(app: Express, ctx: GenerationRoutesContext) {
  app.post('/api/novel/runs/:id/failure-recovery-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const plan = ctx.classifyGenerationFailure({ message: run.error_message || payload?.error || payload?.last_error?.error || stringifyNovelGenerationPayload(payload).slice(0, 500), code: payload?.last_error?.error_code || payload?.error_code })
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
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      let contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      let steps = ctx.buildPipelineSteps()
      steps = ctx.updatePipelineStep(steps, 'context', {
        status: contextPackage.preflight.ready ? 'success' : 'warn',
        detail: contextPackage.preflight.warnings.join('；'),
      })
      let updatedChapter = chapter
      if (req.body?.generate_scene_cards === true) {
        const sceneResult = await ctx.generateSceneCardsBySource(activeWorkspace, project, chapter, contextPackage, modelId)
        if (sceneResult.sceneCards.length > 0) {
          updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
            scene_breakdown: sceneResult.sceneCards,
            scene_list: sceneResult.sceneCards,
            raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'pipeline_confirmation' },
          } as any, { createVersion: false }) || chapter
          const refreshedChapters = await listNovelChapters(activeWorkspace, projectId)
          wordTarget = resolveChapterWordTarget(project, updatedChapter, req.body || {})
          contextPackage = applyChapterWordTargetToContext(
            await ctx.buildChapterContextPackage(activeWorkspace, project, updatedChapter, refreshedChapters, worldbuilding, characters, outlines, reviews),
            wordTarget,
          )
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
        config_snapshot: configSnapshot,
        confirmed_scene_cards: false,
        can_resume_from: req.body?.generate_scene_cards === true ? 'draft' : 'scene_cards',
        resume_endpoint: `/api/novel/chapters/${chapter.id}/generate-prose`,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'chapter_generation_pipeline',
        step_name: `chapter-${chapter.chapter_no}`,
        status: req.body?.generate_scene_cards === true ? 'paused' : 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
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
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      const contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        return res.status(412).json({ error: '场景卡生成前置检查未通过', error_code: 'SCENE_PREFLIGHT_BLOCKED', preflight: contextPackage.preflight, context_package: contextPackage })
      }
      const result = await ctx.generateSceneCardsBySource(activeWorkspace, project, chapter, contextPackage, modelId)
      if (!result.sceneCards.length) {
        const diagnostics = buildLLMResultDiagnostics(result.result)
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'scene_cards',
          step_name: `chapter-${chapter.chapter_no}`,
          status: 'failed',
          input_ref: stringifyNovelGenerationPayload(req.body),
          output_ref: stringifyNovelGenerationPayload({ error: '模型未返回场景卡', llm_diagnostics: diagnostics, runtime_selection: (result.result as any)?.runtimeSelection || null, config_snapshot: configSnapshot }),
          error_message: '模型未返回场景卡',
        })
        return res.status(502).json({ error: '模型未返回场景卡', result: result.result, llm_diagnostics: diagnostics })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        scene_breakdown: result.sceneCards,
        scene_list: result.sceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'manual_pipeline' },
      } as any, { createVersion: false })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'scene_cards', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload({ scene_cards: result.sceneCards, modelName: (result.result as any).modelName, config_snapshot: configSnapshot }) })
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
      const autoRepairQualityGate = req.body?.auto_repair_quality_gate === true || req.body?.quality_gate_repair === true
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const mcpTask = resolveChapterGenerationSource(project).active === 'mcp'
      const standaloneChapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      {
        const pipeline: any[] = []
        const markServiceStage = async (key: string, payload: any = {}) => {
          let stage: any
          if (mcpTask) {
            stage = compactStandaloneProseProgressStage(payload, { mcpTask: true, stageKey: key })
          } else {
            const normalizedPayload = payload && typeof payload === 'object' ? payload : { detail: payload }
            stage = compactStandaloneProseProgressStage({
              key,
              label: standaloneProseServiceStageLabel(key),
              status: normalizedPayload.status || 'running',
              detail: standaloneProseServiceStageDetail(normalizedPayload),
              at: new Date().toISOString(),
              ...normalizedPayload,
            }, { mcpTask })
          }
          pipeline.push(stage)
          if (wantsStream && !res.writableEnded) {
            res.write(sseData({ type: 'progress', progress: stage.label, pipeline, stage }))
          }
        }
        if (wantsStream) {
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
        }
        const abortController = new AbortController()
        let standaloneProseCompleted = false
        const abortStandaloneProseGeneration = () => {
          if (standaloneProseCompleted || abortController.signal.aborted) return
          abortController.abort()
        }
        const standaloneProseAbortPoll = setInterval(() => {
          if (
            req.aborted
            || res.destroyed
            || req.socket?.destroyed
            || res.socket?.destroyed
          ) {
            abortStandaloneProseGeneration()
          }
        }, 1000)
        const writeStandaloneProseHeartbeat = () => {
          if (!wantsStream || standaloneProseCompleted || abortController.signal.aborted) return
          if (
            res.writableEnded
            || res.destroyed
            || req.aborted
            || req.socket?.destroyed
            || res.socket?.destroyed
          ) {
            abortStandaloneProseGeneration()
            return
          }
          try {
            res.write(': mangaforge-prose-heartbeat\n\n')
          } catch {
            abortStandaloneProseGeneration()
          }
        }
        const standaloneProseHeartbeat = setInterval(writeStandaloneProseHeartbeat, 15000)
        const cleanupStandaloneProseAbortListeners = () => {
          clearInterval(standaloneProseAbortPoll)
          clearInterval(standaloneProseHeartbeat)
          req.off('aborted', abortStandaloneProseGeneration)
          res.off('close', abortStandaloneProseGeneration)
          req.socket?.off('close', abortStandaloneProseGeneration)
          res.socket?.off('close', abortStandaloneProseGeneration)
        }
        req.on('aborted', abortStandaloneProseGeneration)
        res.on('close', abortStandaloneProseGeneration)
        req.socket?.on('close', abortStandaloneProseGeneration)
        res.socket?.on('close', abortStandaloneProseGeneration)
        try {
          const serviceOptions = buildStandaloneProseServiceOptions(req.body, {
            modelId,
            autoRepairQualityGate,
            onStage: markServiceStage,
            abortSignal: abortController.signal,
          })
          const serviceResult = await ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId, serviceOptions)
          standaloneProseCompleted = true
          cleanupStandaloneProseAbortListeners()
          const updated = serviceResult?.chapter || null
          const finalText = String(updated?.chapter_text || '')
          const stepName = `chapter-${updated?.chapter_no || chapterId}`
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'generate_prose',
            step_name: stepName,
            status: 'success',
            input_ref: stringifyNovelGenerationPayload(req.body),
            output_ref: stringifyNovelGenerationPayload({
              ...serviceResult,
              pipeline,
              config_snapshot: serviceResult?.config_snapshot || configSnapshot,
              chapter_text_length: countProseChars(finalText),
            }),
          })
          if (!wantsStream) return res.json({ ...serviceResult, result: serviceResult, pipeline, config_snapshot: serviceResult?.config_snapshot || configSnapshot })
          const chunkSize = Math.max(40, Math.ceil(finalText.length / 12))
          res.write(sseData({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline }))
          for (let i = 0; i < finalText.length; i += chunkSize) {
            res.write(sseData({ type: 'chunk', text: finalText.slice(i, i + chunkSize) }))
            await new Promise(resolve => setTimeout(resolve, 40))
          }
          res.write(sseData({ type: 'done', ...serviceResult, result: serviceResult, pipeline, config_snapshot: serviceResult?.config_snapshot || configSnapshot }))
          res.end()
          return
        } catch (serviceError: any) {
          standaloneProseCompleted = true
          cleanupStandaloneProseAbortListeners()
          const errorPayload = buildStandaloneProseServiceErrorPayload(
            serviceError,
            pipeline,
            configSnapshot,
            { chapter_id: chapterId, chapter_no: standaloneChapter?.chapter_no },
            { mcpTask },
          )
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'generate_prose',
            step_name: `chapter-${standaloneChapter?.chapter_no || chapterId}`,
            status: 'failed',
            input_ref: stringifyNovelGenerationPayload(req.body),
            output_ref: stringifyNovelGenerationPayload(errorPayload),
            error_message: errorPayload.error,
          })
          const status = standaloneProseServiceErrorStatus({
            code: errorPayload.error_code,
            message: errorPayload.error,
          })
          if (wantsStream) {
            res.write(sseData({ type: 'error', ...errorPayload }))
            res.end()
            return
          }
          return res.status(status).json(errorPayload)
        }
      }
    } catch (error) {
      if (res.headersSent) {
        res.write(sseData({ type: 'error', error: String(error) }))
        res.end()
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
