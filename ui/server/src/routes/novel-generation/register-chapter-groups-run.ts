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
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, resolveChapterWordTarget } from '../novel-writing-service'
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

export function registerNovelGenerationChapterGroupRunRoutes(app: Express, ctx: GenerationRoutesContext) {
  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const item = chapters[Number(payload.current_index || 0)] || {}
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '直接执行'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接执行'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '直接执行'))
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
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      const stage = String(item.approval_stage || item.approvalStage || payload.last_error?.approval_stage || payload.lastError?.approvalStage || req.body.stage || 'scene_cards')
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '用人工确认直接'))
      if (isApprovalBlockerChapter(item, payload, stage)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '用人工确认直接'))
      if (isLegacyQualityGateApproval(item, payload, stage)) return res.status(409).json(legacyQualityGateRoutePayload(item, '用人工确认直接'))
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: compactText(req.body.note || '', 500),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        approval_stage: '',
        approval_context: null,
        stages: ctx.updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const clearsLastError = Number(payload.last_error?.id || 0) === Number(item.id || 0)
        || Number(payload.current_index || 0) === index
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({
          ...payload,
          chapters,
          current_index: index,
          phase: `第${item.chapter_no}章已确认，等待继续执行`,
          approved_at: new Date().toISOString(),
          last_error: clearsLastError ? null : payload.last_error,
        }),
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
      const item = chapters[index]
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '直接重试'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接重试'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '直接重试'))
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/skip-chapter', async (req, res) => {
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
      const item = chapters[index]
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '跳过章节'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '跳过章节'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '跳过章节'))
      const stages = (Array.isArray(item.stages) && item.stages.length ? item.stages : ctx.buildChapterGroupStages())
        .map((stage: any) => ['success', 'skipped'].includes(stage.status) ? stage : { ...stage, status: 'skipped', skipped_at: new Date().toISOString() })
      const nextIndex = Number(payload.current_index || 0) <= index ? index + 1 : Number(payload.current_index || 0)
      chapters[index] = {
        ...item,
        status: 'skipped',
        stages,
        skipped_reason: String(req.body.reason || '用户在任务中心跳过'),
        skipped_at: new Date().toISOString(),
        error: '',
        error_code: '',
        next_run_at: '',
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({
          ...payload,
          chapters,
          current_index: nextIndex,
          phase: `已跳过第${item.chapter_no}章，等待继续执行`,
          last_error: payload.last_error?.id === item.id ? null : payload.last_error,
        }),
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
}
