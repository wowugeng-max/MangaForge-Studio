import type { Express } from 'express'
import {
  createEditorRevisionRun,
  createNovelReview,
  getEditorRevisionRun,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  markEditorRevisionLinkedTaskClosure,
  requestEditorRevisionCancel,
  retryEditorRevisionRun,
} from '../../novel'
import { countProseChars } from '../../novel-writing/word-target'
import { asArray, getNovelPayload, parseJsonLikePayload } from '../novel-route-utils'
import {
  type EditorRoutesContext,
  buildChapterDeliveryRiskBrief,
  buildEditorReportPrompt,
  buildProseQualityRevisionReport,
  buildWorkflowRevisionContextBrief,
  editorJson,
  loadChapterBundle,
  withChapterTaskExecution,
} from './builders'
import type {
  EditorRevisionCheckpoint,
  EditorRevisionPhase,
  EditorRevisionPhaseState,
  EditorRevisionRunInput,
} from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'
import {
  buildEditorRevisionDiagnostics,
  buildPublicEditorRevisionRun,
} from './revision-run-view'
import type { EditorRevisionWorker } from './revision-worker'

export type EditorRevisionRoutesContext = EditorRoutesContext & {
  editorRevisionWorker: Pick<EditorRevisionWorker, 'enqueue' | 'cancel'>
}

function initialEditorRevisionCheckpoint(hasRepairTaskLink = false): EditorRevisionCheckpoint {
  return {
    schema_version: 1,
    phase: 'generate_candidate',
    phases: Object.fromEntries([
      'generate_candidate',
      'admit_candidate',
      'persist_chapter',
      'post_quality',
      'sync_current_story_state',
      'record_continuity_warning',
      'completed',
    ].map(phase => [phase, {
      status: 'pending',
      attempt: 0,
    }])) as Record<EditorRevisionPhase, EditorRevisionPhaseState>,
    prose_persisted: false,
    ...(hasRepairTaskLink ? { linked_task_closure: { status: 'pending' as const } } : {}),
    warnings: [],
  }
}

function positiveInteger(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null
}

function nonNegativeInteger(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null
}

function plainObject(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null
}

function requireActionProjectId(req: any, res: any): number | null {
  const projectId = positiveInteger(req.body?.project_id ?? req.query?.project_id)
  if (!projectId) {
    res.status(400).json({ error: 'project_id is required', error_code: 'PROJECT_ID_REQUIRED' })
    return null
  }
  return projectId
}

function sourceReviewSnapshot(review: any, payload: Record<string, any>, chapterId: number) {
  const selfCheckReview = plainObject(payload.self_check?.review)
  const report = plainObject(payload.report)
  return {
    id: review.id,
    review_type: String(review.review_type || ''),
    status: String(review.status || ''),
    summary: String(review.summary || ''),
    issues: asArray(review.issues).map((item: unknown) => String(item || '')).filter(Boolean),
    payload: {
      chapter_id: chapterId,
      ...(selfCheckReview ? { self_check: { review: selfCheckReview } } : {}),
      ...(report ? { report } : {}),
    },
    created_at: String(review.created_at || ''),
  }
}

function repairTaskLink(value: unknown): EditorRevisionRunInput['repair_task_link'] | undefined {
  if (value === undefined || value === null) return undefined
  const link = plainObject(value)
  const runId = positiveInteger(link?.run_id)
  const taskIndex = nonNegativeInteger(link?.task_index)
  const task = plainObject(link?.task)
  if (!link || !runId || taskIndex === null || !task) return undefined
  return { run_id: runId, task_index: taskIndex, task }
}

function revisionStatusUrl(runId: number, projectId: number) {
  return `/api/novel/editor-revisions/${runId}?project_id=${projectId}`
}

function respondRevisionError(res: any, error: any) {
  const code = String(error?.code || '')
  if (code === 'REVISION_ALREADY_ACTIVE') {
    const runId = positiveInteger(error?.existingRunId) || 0
    return res.status(409).json({
      error: String(error?.message || 'an editor revision is already active for this chapter'),
      error_code: code,
      run_id: runId,
      status_url: String(error?.statusUrl || ''),
    })
  }
  if (code === 'REVISION_RESTART_REQUIRED') {
    return res.status(409).json({
      error: String(error?.message || 'editor revision must restart from a fresh source snapshot'),
      error_code: code,
    })
  }
  if (code === 'REVISION_LINKED_TASK_CLOSURE_NOT_READY') {
    return res.status(409).json({
      error: String(error?.message || 'linked repair task closure is not durably complete'),
      error_code: code,
    })
  }
  if ([
    'REVISION_LEASE_OR_STATE_INVALID',
    'REVISION_CHECKPOINT_INVALID',
    'REVISION_INPUT_INVALID',
  ].includes(code)) {
    return res.status(409).json({
      error: 'editor revision action is not allowed in the current state',
      error_code: 'REVISION_ACTION_NOT_ALLOWED',
    })
  }
  return res.status(500).json({ error: String(error?.message || error) })
}

export function registerNovelEditorRevisionRoutes(app: Express, ctx: EditorRevisionRoutesContext) {
  app.post('/api/novel/chapters/:chapterId/editor-report', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const latestQuality = reviews.filter(item => item.review_type === 'prose_quality').slice(-1)[0] || null
      const latestReference = reviews.filter(item => item.review_type === 'reference_usage').slice(-1)[0] || null
      const deliveryRiskBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
      const prompt = buildEditorReportPrompt({
        project,
        contextPackage,
        chapter,
        latestQuality,
        latestReference,
        deliveryRiskBrief,
      })
      const requestedModelId = Number(req.body.model_id || 0)
        || ctx.getStageModelId(project, 'review')
      const signal = req.signal as AbortSignal | undefined
      const responseBody = await withChapterTaskExecution(ctx, {
        activeWorkspace,
        project,
        chapter,
        contextPackage,
        requestedModelId,
        signal,
      }, async chapterTaskExecution => {
        const result = await chapterTaskExecution.executeAgent(
          'editor_report',
          'editor_report_json',
          'review-agent',
          project,
          { task: prompt },
          {
            activeWorkspace,
            maxTokens: 5000,
            temperature: 0.2,
            skipMemory: true,
            signal,
          },
        )
        const report = getNovelPayload(result)
        const saved = await createNovelReview(activeWorkspace, {
          project_id: project.id,
          review_type: 'editor_report',
          status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
          summary: `编辑报告评分 ${report.overall_score ?? '-'}`,
          issues: asArray(report.must_fix).map((item: any) => String(item)),
          payload: editorJson({ chapter_id: chapter.id, report, context_package: contextPackage, delivery_risk_brief: deliveryRiskBrief }),
        })
        return { ok: true, report, review: saved, result }
      })
      return res.json(responseBody)
    } catch (error) {
      return res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/reviews/:reviewId/apply-revision', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = positiveInteger(req.body?.project_id)
      if (!projectId) return res.status(400).json({ error: 'project_id is required', error_code: 'PROJECT_ID_REQUIRED' })
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const reviews = await listNovelReviews(activeWorkspace, projectId)
      const review = reviews.find(item => item.id === Number(req.params.reviewId))
      if (!review) return res.status(404).json({ error: 'review not found' })
      const payload = parseJsonLikePayload(review.payload) || {}
      const requestedChapterId = positiveInteger(req.body?.chapter_id)
      const reviewChapterId = positiveInteger(
        payload.chapter_id
        || payload.report?.chapter_id
        || payload.context_package?.chapter_target?.id,
      )
      if (requestedChapterId && reviewChapterId && requestedChapterId !== reviewChapterId) {
        return res.status(400).json({
          error: 'review does not belong to the requested chapter',
          error_code: 'REVISION_REVIEW_CHAPTER_MISMATCH',
        })
      }
      const chapterId = reviewChapterId || requestedChapterId
      if (!chapterId) return res.status(400).json({ error: 'chapter_id is required', error_code: 'REVISION_CHAPTER_REQUIRED' })
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })

      const sourceText = String(chapter.chapter_text || '')
      if (!sourceText.trim()) {
        return res.status(400).json({
          error: 'chapter source text is required',
          error_code: 'REVISION_SOURCE_TEXT_REQUIRED',
        })
      }
      const sourceUpdatedAt = String(chapter.updated_at || '')
      if (!sourceUpdatedAt || !Number.isFinite(new Date(sourceUpdatedAt).getTime())) {
        return res.status(409).json({
          error: 'chapter source snapshot is invalid',
          error_code: 'REVISION_SOURCE_SNAPSHOT_INVALID',
        })
      }

      const [worldbuilding, characters, outlines] = await Promise.all([
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
      ])
      const contextPackage = await ctx.buildChapterContextPackage(
        activeWorkspace,
        project,
        chapter,
        chapters,
        worldbuilding,
        characters,
        outlines,
        reviews,
      )
      const selfCheckReview = plainObject(payload.self_check?.review) || {}
      const report = plainObject(payload.report)
        || (review.review_type === 'prose_quality' ? buildProseQualityRevisionReport(selfCheckReview) : {})
      const revisionMode = String(req.body?.revision_mode || 'from_report')
      const revisionStrategy = String(report.revision_strategy || 'surgical_patch')
      const preferredModelId = positiveInteger(req.body?.model_id) || undefined
      const modelId = ctx.getStageModelId(project, 'revise', preferredModelId)
      const linkValue = req.body?.repair_task_link
      const link = repairTaskLink(linkValue)
      if (linkValue !== undefined && !link) {
        return res.status(400).json({
          error: 'repair_task_link is invalid',
          error_code: 'REVISION_REPAIR_TASK_LINK_INVALID',
        })
      }
      const createdAt = new Date().toISOString()
      const input: EditorRevisionRunInput = {
        schema_version: 1,
        project_id: projectId,
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        chapter_title: String(chapter.title || ''),
        review_id: review.id,
        source_chapter_updated_at: sourceUpdatedAt,
        source_text: sourceText,
        source_text_hash: revisionTextHash(sourceText),
        source_char_count: countProseChars(sourceText),
        source_review: sourceReviewSnapshot(review, payload, chapter.id),
        report,
        context_package: buildWorkflowRevisionContextBrief(contextPackage, chapter) || {},
        revision_mode: revisionMode,
        revision_strategy: revisionStrategy,
        user_prompt: String(req.body?.prompt || ''),
        ...(Number.isInteger(modelId) ? { model_id: modelId } : {}),
        auto_quality_check: req.body?.auto_quality_check !== false,
        auto_story_state: req.body?.auto_story_state !== false,
        ...(link ? { repair_task_link: link } : {}),
        created_at: createdAt,
      }
      const run = await createEditorRevisionRun(activeWorkspace, {
        projectId,
        chapterId: chapter.id,
        inputRef: JSON.stringify(input),
        outputRef: JSON.stringify(initialEditorRevisionCheckpoint(Boolean(link))),
      })
      try {
        ctx.editorRevisionWorker.enqueue(run.id)
      } catch {
        // The durable queued row remains discoverable by worker recovery.
      }
      return res.status(202).json({
        ok: true,
        run_id: run.id,
        status: 'queued',
        chapter_id: chapter.id,
        status_url: revisionStatusUrl(run.id, projectId),
      })
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })

  app.get('/api/novel/editor-revisions/:runId', async (req, res) => {
    try {
      const projectId = requireActionProjectId(req, res)
      if (!projectId) return
      const run = await getEditorRevisionRun(ctx.getWorkspace(), projectId, Number(req.params.runId))
      if (!run) return res.status(404).json({ error: 'editor revision not found' })
      return res.json(buildPublicEditorRevisionRun(run))
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })

  app.get('/api/novel/editor-revisions/:runId/diagnostics', async (req, res) => {
    try {
      const projectId = requireActionProjectId(req, res)
      if (!projectId) return
      const run = await getEditorRevisionRun(ctx.getWorkspace(), projectId, Number(req.params.runId))
      if (!run) return res.status(404).json({ error: 'editor revision not found' })
      return res.json({ ok: true, diagnostics: buildEditorRevisionDiagnostics(run) })
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })

  app.post('/api/novel/editor-revisions/:runId/cancel', async (req, res) => {
    try {
      const projectId = requireActionProjectId(req, res)
      if (!projectId) return
      const workspace = ctx.getWorkspace()
      const runId = Number(req.params.runId)
      const existing = await getEditorRevisionRun(workspace, projectId, runId)
      if (!existing) return res.status(404).json({ error: 'editor revision not found' })
      if (!['queued', 'running'].includes(existing.status)) {
        return res.status(409).json({
          error: 'editor revision cannot be canceled in the current state',
          error_code: 'REVISION_ACTION_NOT_ALLOWED',
        })
      }
      const updated = await requestEditorRevisionCancel(workspace, projectId, runId)
      ctx.editorRevisionWorker.cancel(runId)
      return res.json({ ok: true, action: 'cancel', run: buildPublicEditorRevisionRun(updated) })
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })

  app.post('/api/novel/editor-revisions/:runId/linked-task-closure', async (req, res) => {
    try {
      const projectId = requireActionProjectId(req, res)
      if (!projectId) return
      const workspace = ctx.getWorkspace()
      const runId = Number(req.params.runId)
      const existing = await getEditorRevisionRun(workspace, projectId, runId)
      if (!existing) return res.status(404).json({ error: 'editor revision not found' })
      const updated = await markEditorRevisionLinkedTaskClosure(workspace, projectId, runId)
      return res.json({ ok: true, run: buildPublicEditorRevisionRun(updated) })
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })

  app.post('/api/novel/editor-revisions/:runId/retry', async (req, res) => {
    try {
      const projectId = requireActionProjectId(req, res)
      if (!projectId) return
      const workspace = ctx.getWorkspace()
      const runId = Number(req.params.runId)
      const existing = await getEditorRevisionRun(workspace, projectId, runId)
      if (!existing) return res.status(404).json({ error: 'editor revision not found' })
      if (!['failed', 'canceled'].includes(existing.status)) {
        return res.status(409).json({
          error: 'editor revision cannot be retried in the current state',
          error_code: 'REVISION_ACTION_NOT_ALLOWED',
        })
      }
      const before = buildPublicEditorRevisionRun(existing)
      if (!before.can_retry && !before.can_continue) {
        if (['SOURCE_VERSION_CHANGED', 'REVISION_RUN_SUPERSEDED'].includes(String(before.error?.code || ''))) {
          return res.status(409).json({
            error: 'editor revision must restart from a fresh source snapshot',
            error_code: 'REVISION_RESTART_REQUIRED',
          })
        }
        return res.status(409).json({
          error: 'editor revision cannot be retried in the current state',
          error_code: 'REVISION_ACTION_NOT_ALLOWED',
        })
      }
      const action = before.can_continue ? 'continue' : 'retry'
      const updated = await retryEditorRevisionRun(workspace, projectId, runId)
      try {
        ctx.editorRevisionWorker.enqueue(runId)
      } catch {
        // The durable queued row remains discoverable by worker recovery.
      }
      return res.json({ ok: true, action, run: buildPublicEditorRevisionRun(updated) })
    } catch (error: any) {
      return respondRevisionError(res, error)
    }
  })
}
