import type { Express } from 'express'
import {
  appendNovelRun,
  listNovelChapters,
  listNovelReviews,
  listNovelRuns,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import { parseJsonLikePayload } from './novel-route-utils'

type RunRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  runQueueWorkers: Map<number, any>
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  buildPipelineSteps: () => any[]
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
}

const AUDIT_SOURCE_LABELS: Record<string, string> = {
  generate_prose: '正文生成',
  chapter_generation_pipeline: '章节流水线',
  chapter_group_generation: '章节群生成',
  batch_generate_prose: '批量正文生成',
  scene_cards: '场景卡生成',
  agent_execute: 'Agent 链执行',
  repair: '修复执行',
  prose_quality: '章节自检',
  editor_report: '编辑报告',
  similarity_report: '相似度报告',
  story_state: '故事状态机',
  reference_migration_plan: '参考迁移计划',
  release_repair_queue: '发布修复队列',
  release_quality_batch: '发布质检批量任务',
  release_similarity_batch: '发布相似度批量任务',
  mechanical_qa: '机械质检',
  mechanical_qa_llm: 'AI机械质检复核',
  longform_production_repair: '长线生产修复',
  propagation_debt: '传播债务',
  propagation_debt_llm: 'AI传播债务方案',
}

const REPAIR_TASK_RUN_TYPES = new Set([
  'mechanical_qa_repair',
  'first30_retention_repair',
  'longform_production_repair',
])

function isRepairTaskRunType(runType: any) {
  return REPAIR_TASK_RUN_TYPES.has(String(runType || ''))
}

function publicWorkerState(worker: any = {}) {
  const { current_abort_controller: _controller, ...publicWorker } = worker || {}
  return publicWorker
}

function isAbortLikeError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  return error?.name === 'AbortError'
    || error?.code === 'REQUEST_CANCELED'
    || message.includes('request canceled')
    || message.includes('aborted')
    || message.includes('abort')
}

function clampNumber(value: any, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function compactAuditText(value: any, limit = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asAuditArray(value: any) {
  return Array.isArray(value) ? value : []
}

function firstPresent(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function runtimeModelTrace(item: any = {}) {
  const selection = item?.runtimeSelection || item?.runtime_selection || null
  if (!selection) return {}
  return {
    modelName: selection.model?.modelName || selection.model?.model_name || selection.modelName || selection.model_name,
    modelId: selection.model?.id || selection.model?.model_id || selection.modelId || selection.model_id,
    providerId: selection.provider?.id || selection.providerId || selection.provider_id,
  }
}

function findApprovalBlockerResumeGuard(payload: any = {}) {
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
  const current = chapters[Number(payload.current_index || 0)] || null
  const lastError = payload.last_error || payload.lastError || {}
  const code = String(lastError.error_code || lastError.errorCode || current?.error_code || current?.errorCode || '')
  const stage = String(lastError.approval_stage || lastError.approvalStage || current?.approval_stage || current?.approvalStage || '')
  if (code !== 'APPROVAL_BLOCKER' && stage !== 'approval_blocker') return null
  return {
    error: '当前章节存在入库阻断，不能直接继续无人值守。',
    error_code: 'APPROVAL_BLOCKER_REQUIRES_REPAIR',
    chapter_id: current?.id || lastError.id || null,
    chapter_no: current?.chapter_no || current?.chapterNo || lastError.chapter_no || lastError.chapterNo || null,
    approval_stage: 'approval_blocker',
    approval_context: current?.approval_context || current?.approvalContext || lastError.approval_context || lastError.approvalContext || null,
    recovery_plan: lastError.recovery_plan || lastError.recoveryPlan || current?.recovery_plan || current?.recoveryPlan || {
      type: 'approval_blocker',
      actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
    },
  }
}

function findTerminalAdmissionResumeGuard(payload: any = {}) {
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
  const current = chapters[Number(payload.current_index || 0)] || null
  const lastError = payload.last_error || payload.lastError || {}
  const admissionStatus = String(current
    ? current.admission_status || current.admissionStatus || lastError.admission_status || lastError.admissionStatus || ''
    : payload.admission_status || payload.admissionStatus || lastError.admission_status || lastError.admissionStatus || '')
  const errorCode = String(current
    ? current.error_code || current.errorCode || lastError.error_code || lastError.errorCode || ''
    : payload.error_code || payload.errorCode || lastError.error_code || lastError.errorCode || '')
  if (admissionStatus !== 'blocked_invalid' && errorCode !== 'PROSE_ADMISSION_BLOCKED_INVALID') return null
  return {
    error: '当前章节正文未通过有效性检查且未入库，不能直接继续；需要显式修复或重置终态。',
    error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    admission_status: 'blocked_invalid',
    chapter_id: current ? current.id || lastError.id || null : payload.chapter_id || payload.chapterId || lastError.id || null,
    chapter_no: current ? current.chapter_no || current.chapterNo || lastError.chapter_no || lastError.chapterNo || null : payload.chapter_no || payload.chapterNo || lastError.chapter_no || lastError.chapterNo || null,
    recovery_plan: current
      ? lastError.recovery_plan || lastError.recoveryPlan || current.recovery_plan || current.recoveryPlan || {
        type: 'blocked_invalid',
        actions: ['显式修复或重置当前章节终态', '重新提交正文生成'],
      }
      : payload.recovery_plan || payload.recoveryPlan || lastError.recovery_plan || lastError.recoveryPlan || {
        type: 'blocked_invalid',
        actions: ['显式修复或重置当前章节终态', '重新提交正文生成'],
      },
  }
}

export function extractModelTrace(payload: any, inputPayload: any = {}) {
  const candidates = Array.isArray(payload) ? payload : [
    payload,
    payload?.result,
    payload?.llm_result,
    payload?.llmResult,
    payload?.self_check?.review,
    payload?.selfCheck?.review,
    payload?.self_check?.revision,
    payload?.selfCheck?.revision,
    payload?.chapters?.find?.((item: any) => item?.modelName || item?.model_name),
    ...(Array.isArray(payload?.pipeline) ? payload.pipeline : []),
    ...(Array.isArray(payload?.results) ? payload.results : []),
  ]
  const modelHit = candidates.find((item: any) => {
    const runtime = runtimeModelTrace(item)
    return item && (item.modelName || item.model_name || item.modelId || item.model_id || item.providerId || item.provider_id || runtime.modelName || runtime.modelId || runtime.providerId)
  }) || {}
  const runtimeHit = runtimeModelTrace(modelHit)
  const usageHit = candidates.find((item: any) => item?.usage || item?.token_usage || item?.tokenUsage) || {}
  return {
    model_name: firstPresent(modelHit.modelName, modelHit.model_name, runtimeHit.modelName, inputPayload.model_name, inputPayload.modelName),
    model_id: firstPresent(modelHit.modelId, modelHit.model_id, runtimeHit.modelId, inputPayload.model_id, inputPayload.modelId),
    provider_id: firstPresent(modelHit.providerId, modelHit.provider_id, runtimeHit.providerId, inputPayload.provider_id, inputPayload.providerId),
    usage: usageHit.usage || usageHit.token_usage || usageHit.tokenUsage || payload?.usage || payload?.token_usage || payload?.tokenUsage || null,
  }
}

export function extractChapterRef(payload: any, inputPayload: any, record: any, chaptersById: Map<number, any>, chaptersByNo: Map<number, any>) {
  const source = Array.isArray(payload) ? {} : (payload || {})
  const context = source.context_package || source.contextPackage || {}
  const chapterTarget = context.chapter_target || context.chapterTarget || context.chapter || {}
  const rawChapterNo = firstPresent(
    source.chapter_no,
    source.chapterNo,
    source.chapter?.chapter_no,
    source.chapter?.chapterNo,
    chapterTarget.chapter_no,
    chapterTarget.chapterNo,
    source.quality_card?.chapter_no,
    source.qualityCard?.chapterNo,
    inputPayload?.chapter_no,
    inputPayload?.chapterNo,
    String(record.step_name || '').match(/chapter-(\d+)/)?.[1],
  )
  const rawChapterId = firstPresent(
    source.chapter_id,
    source.chapterId,
    source.chapter?.id,
    source.quality_card?.chapter_id,
    source.qualityCard?.chapterId,
    chapterTarget.chapter_id,
    chapterTarget.chapterId,
    chapterTarget.id,
    inputPayload?.chapter_id,
    inputPayload?.chapterId,
  )
  const chapterId = Number(rawChapterId || 0) || undefined
  const chapterNo = Number(rawChapterNo || 0) || undefined
  const byId = chapterId ? chaptersById.get(chapterId) : null
  const byNo = !byId && chapterNo ? chaptersByNo.get(chapterNo) : null
  const chapter = byId || byNo || null
  return {
    chapter_id: chapter?.id || chapterId || null,
    chapter_no: chapter?.chapter_no || chapterNo || null,
    chapter_title: chapter?.title || source.chapter?.title || chapterTarget.title || '',
  }
}

export function extractMaterialTrace(payload: any) {
  const source = Array.isArray(payload) ? {} : (payload || {})
  const context = source.context_package || source.contextPackage || null
  const preflight = context?.preflight || source.preflight || null
  const chapterTarget = context?.chapter_target || context?.chapterTarget || {}
  const sceneCards = firstPresent(chapterTarget.scene_cards, chapterTarget.sceneCards, source.scene_cards, source.sceneCards, source.confirmed_scene_cards, source.confirmedSceneCards, source.scene_breakdown, source.sceneBreakdown)
  const referenceEntries = firstPresent(
    context?.reference_preview?.entries,
    context?.referencePreview?.entries,
    context?.reference_entries,
    context?.referenceEntries,
    source.reference_preview?.entries,
    source.referencePreview?.entries,
    source.reference_report?.entries,
    source.referenceReport?.entries,
    source.reference_report?.matched_entries,
    source.referenceReport?.matchedEntries,
  )
  const blockers = asAuditArray(preflight?.blockers).map((item: any) => item.label || item.fix || item.key || item).filter(Boolean)
  const warnings = [
    ...asAuditArray(preflight?.warnings),
    ...asAuditArray(source.warnings),
    ...asAuditArray(source.pipeline).filter((item: any) => item.status === 'warn' || item.status === 'failed').map((item: any) => item.detail || item.label),
  ].map((item: any) => compactAuditText(item, 120)).filter(Boolean)
  return {
    has_context_package: Boolean(context),
    preflight_ready: preflight ? Boolean(preflight.ready) : null,
    blocker_count: blockers.length,
    blockers: blockers.slice(0, 8),
    warnings: warnings.slice(0, 10),
    scene_cards_count: Array.isArray(sceneCards) ? sceneCards.length : 0,
    reference_entries_count: Array.isArray(referenceEntries) ? referenceEntries.length : 0,
    character_count: Array.isArray(context?.characters) ? context.characters.length : Array.isArray(context?.character_states) ? context.character_states.length : Array.isArray(context?.characterStates) ? context.characterStates.length : 0,
    has_previous_tail: Boolean(context?.previous_chapter || context?.previousChapter || context?.previous_chapters || context?.previousChapters || context?.continuity?.previous_tail || context?.continuity?.previousTail),
    has_writing_bible: Boolean(context?.writing_bible || context?.writingBible || context?.style_lock || context?.styleLock),
    has_story_state: Boolean(context?.story_state || context?.storyState || context?.state_machine || context?.stateMachine || source.story_state_update || source.storyStateUpdate),
  }
}

function extractSafetyTrace(payload: any) {
  const source = Array.isArray(payload) ? {} : (payload || {})
  const report = source.reference_report || source.similarity_report || source.report?.reference_report || null
  const decision = source.safety_decision || source.reference_safety || null
  return {
    has_reference_report: Boolean(report),
    has_safety_decision: Boolean(decision),
    blocked: Boolean(decision?.blocked),
    score: firstPresent(decision?.score, report?.quality_assessment?.overall_score, report?.overall_score, null),
    copy_hit_count: Number(firstPresent(decision?.copy_hit_count, report?.copy_hit_count, report?.copy_hits?.length, 0) || 0),
    risk_level: firstPresent(report?.quality_assessment?.risk_level, report?.risk_level, decision?.risk_level, ''),
    reasons: asAuditArray(decision?.reasons).slice(0, 5),
  }
}

export function extractConfigTrace(payload: any) {
  const source = Array.isArray(payload) ? {} : (payload || {})
  const snapshot = source.config_snapshot
    || source.configSnapshot
    || source.agent_config_snapshot
    || source.agentConfigSnapshot
    || source.pipeline?.find?.((item: any) => item.config_snapshot || item.configSnapshot)?.config_snapshot
    || source.pipeline?.find?.((item: any) => item.config_snapshot || item.configSnapshot)?.configSnapshot
    || null
  return {
    has_snapshot: Boolean(snapshot),
    snapshot_id: snapshot?.snapshot_id || snapshot?.snapshotId || '',
    fingerprint: snapshot?.fingerprint || '',
    agent_prompt_version: snapshot?.agent_prompt_version || snapshot?.agentPromptVersion || null,
    prompt_keys: Array.isArray(snapshot?.prompt_keys) ? snapshot.prompt_keys : Array.isArray(snapshot?.promptKeys) ? snapshot.promptKeys : [],
    writing_bible_hash: snapshot?.writing_bible_hash || snapshot?.writingBibleHash || '',
    model_strategy_stages: (snapshot?.model_strategy || snapshot?.modelStrategy)?.stages ? Object.keys((snapshot?.model_strategy || snapshot?.modelStrategy).stages) : [],
  }
}

function summarizeAuditOutput(source: string, payload: any, record: any) {
  if (Array.isArray(payload)) return `Agent 链执行 ${payload.length} 步`
  if (source === 'generate_prose') {
    const score = payload?.self_check?.review?.score
    const revised = payload?.self_check?.revised
    const diff = payload?.diff
    return [`自检 ${score ?? '-'}`, revised ? '已修订' : '未修订', diff?.added_chars ? `新增 ${diff.added_chars} 字` : ''].filter(Boolean).join(' · ')
  }
  if (source === 'prose_quality') return compactAuditText(record.summary || `自检评分 ${payload?.self_check?.review?.score ?? '-'}`)
  if (source === 'editor_report') return compactAuditText(record.summary || payload?.report?.summary || payload?.summary)
  if (source === 'similarity_report') return compactAuditText(record.summary || payload?.report?.summary || payload?.summary)
  if (source === 'story_state') return compactAuditText(record.summary || '故事状态已更新')
  if (source.includes('release_')) return compactAuditText(record.summary || payload?.phase || payload?.summary || record.step_name)
  return compactAuditText(record.summary || payload?.phase || payload?.current_step || record.step_name)
}

function createAuditEvent(kind: 'run' | 'review', record: any, payload: any, inputPayload: any, chaptersById: Map<number, any>, chaptersByNo: Map<number, any>) {
  const source = kind === 'run' ? record.run_type : record.review_type
  const chapter = extractChapterRef(payload, inputPayload, record, chaptersById, chaptersByNo)
  const materials = extractMaterialTrace(payload)
  const model = extractModelTrace(payload, inputPayload)
  const safety = extractSafetyTrace(payload)
  const config = extractConfigTrace(payload)
  const status = record.status || (kind === 'review' ? 'ok' : '')
  const error = record.error_message || payload?.error || payload?.last_error?.error || ''
  return {
    key: `${kind}-${record.id}`,
    kind,
    id: record.id,
    source,
    source_label: AUDIT_SOURCE_LABELS[source] || source,
    title: `${AUDIT_SOURCE_LABELS[source] || source}${chapter.chapter_no ? ` · 第${chapter.chapter_no}章` : ''}`,
    status,
    created_at: record.created_at,
    duration_ms: record.duration_ms || 0,
    ...chapter,
    model,
    config,
    materials,
    safety,
    output_summary: summarizeAuditOutput(source, payload, record),
    warnings: [...materials.warnings, ...safety.reasons].slice(0, 12),
    error: compactAuditText(error, 300),
  }
}

function buildAgentAudit(project: any, runs: any[], reviews: any[], chapters: any[]) {
  const chaptersById = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
  const chaptersByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const runEvents = runs.map(run => {
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const inputPayload = parseJsonLikePayload(run.input_ref) || {}
    return createAuditEvent('run', run, payload, inputPayload, chaptersById, chaptersByNo)
  })
  const reviewEvents = reviews
    .filter(review => review.review_type !== 'review_annotation_status')
    .map(review => createAuditEvent('review', review, parseJsonLikePayload(review.payload) || {}, {}, chaptersById, chaptersByNo))
  const events = [...runEvents, ...reviewEvents].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  const generationEvents = events.filter(event => ['generate_prose', 'chapter_generation_pipeline', 'chapter_group_generation', 'prose_quality', 'editor_report'].includes(event.source))
  const failedEvents = events.filter(event => ['failed', 'error'].includes(String(event.status || '').toLowerCase()) || event.error)
  const contextMissing = generationEvents.filter(event => !event.materials.has_context_package)
  const modelMissing = events.filter(event => ['generate_prose', 'scene_cards', 'agent_execute', 'repair', 'editor_report', 'prose_quality'].includes(event.source) && !event.model.model_name && !event.model.model_id)
  const configMissing = generationEvents.filter(event => !event.config.has_snapshot)
  const referencesConfigured = asAuditArray(project?.reference_config?.references).length > 0
  const safetyMissing = events.filter(event => ['generate_prose', 'prose_quality', 'similarity_report'].includes(event.source) && referencesConfigured && !event.safety.has_reference_report && !event.safety.has_safety_decision)
  const gaps = [
    ...contextMissing.map(event => ({ type: 'missing_context', severity: 'high', event_key: event.key, title: `${event.title} 缺少续写上下文包` })),
    ...configMissing.map(event => ({ type: 'missing_config_snapshot', severity: 'medium', event_key: event.key, title: `${event.title} 缺少 Agent 配置快照` })),
    ...modelMissing.map(event => ({ type: 'missing_model_trace', severity: 'medium', event_key: event.key, title: `${event.title} 缺少模型记录` })),
    ...safetyMissing.map(event => ({ type: 'missing_safety_trace', severity: 'high', event_key: event.key, title: `${event.title} 缺少仿写安全追踪` })),
    ...failedEvents.map(event => ({ type: 'failed_event', severity: 'high', event_key: event.key, title: `${event.title} 执行失败`, message: event.error })),
  ].slice(0, 80)
  const recommendations = [
    contextMissing.length ? `有 ${contextMissing.length} 条生成/审稿记录没有上下文包，建议统一从章节流水线或章节群生产入口生成。` : '',
    configMissing.length ? `有 ${configMissing.length} 条记录没有 Agent 配置快照，后续建议用新流水线生成以便复现。` : '',
    modelMissing.length ? `有 ${modelMissing.length} 条记录缺少模型名或模型 ID，建议后续所有 Agent 输出写入 modelName/modelId。` : '',
    safetyMissing.length ? `参考作品已配置，但 ${safetyMissing.length} 条记录缺少安全报告，建议生成后强制执行相似度/仿写安全检查。` : '',
    failedEvents.length ? `有 ${failedEvents.length} 条失败记录，可在任务中心按失败点重试或跳过。` : '',
  ].filter(Boolean)
  return {
    project_id: project.id,
    generated_at: new Date().toISOString(),
    summary: {
      total_events: events.length,
      run_events: runEvents.length,
      review_events: reviewEvents.length,
      model_traced: events.filter(event => event.model.model_name || event.model.model_id).length,
      config_traced: events.filter(event => event.config.has_snapshot).length,
      context_traced: events.filter(event => event.materials.has_context_package).length,
      safety_checks: events.filter(event => event.safety.has_reference_report || event.safety.has_safety_decision).length,
      failed_events: failedEvents.length,
      gap_count: gaps.length,
    },
    events,
    gaps,
    recommendations,
  }
}

export function registerNovelRunRoutes(app: Express, ctx: RunRoutesContext) {
  app.get('/api/novel/projects/:id/reviews', async (req, res) => {
    try {
      res.json(await listNovelReviews(ctx.getWorkspace(), Number(req.params.id)))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/runs', async (req, res) => {
    try {
      res.json(await listNovelRuns(ctx.getWorkspace(), Number(req.query.project_id || 0)))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/run-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const queued = runs.filter(run => ['queued', 'ready', 'paused', 'running'].includes(run.status) && ['chapter_group_generation', 'chapter_generation_pipeline', 'quality_benchmark', 'book_review'].includes(run.run_type))
      const persistentWorker = project?.reference_config?.run_queue_worker || null
      const memoryWorker = ctx.runQueueWorkers.get(projectId)
      const worker = memoryWorker || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
      res.json({
        ok: true,
        worker,
        queue: queued.map(run => ({ id: run.id, type: run.run_type, step: run.step_name, status: run.status, created_at: run.created_at, payload: parseJsonLikePayload(run.output_ref) })),
        summary: {
          queued: queued.filter(run => run.status === 'queued' || run.status === 'ready').length,
          running: queued.filter(run => run.status === 'running').length,
          paused: queued.filter(run => run.status === 'paused').length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/tasks', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const worker = ctx.runQueueWorkers.get(projectId)
        || (project.reference_config?.run_queue_worker?.status === 'running'
          ? { ...project.reference_config.run_queue_worker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' }
          : project.reference_config?.run_queue_worker)
        || { status: 'idle' }
      const normalizeRun = (run: any) => {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
        const terminalAdmission = Boolean(findTerminalAdmissionResumeGuard(payload))
        const repairTasks = Array.isArray(payload.tasks) ? payload.tasks : []
        const isRepairTaskRun = isRepairTaskRunType(run.run_type)
        const done = chapters.filter((item: any) => ['success', 'skipped', 'written'].includes(item.status)).length
        const repairResolved = repairTasks.filter((task: any) => task.task_status === 'resolved').length
        const repairNeedsReview = repairTasks.filter((task: any) => task.task_status === 'needs_review').length
        const repairOpen = repairTasks.filter((task: any) => !task.task_status || task.task_status === 'open' || task.task_status === 'in_progress').length
        const repairPercent = repairTasks.length
          ? Math.round(((repairResolved + repairNeedsReview * 0.5) / repairTasks.length) * 100)
          : 0
        const percent = isRepairTaskRun && repairTasks.length
          ? repairPercent
          : chapters.length
            ? Math.round((done / chapters.length) * 100)
            : ['success', 'ok', 'completed'].includes(run.status) ? 100 : ['running'].includes(run.status) ? 50 : 0
        const repairPhase = repairTasks.length
          ? `待处理 ${repairOpen} 项，需复查 ${repairNeedsReview} 项，已处理 ${repairResolved}/${repairTasks.length}`
          : ''
        const lastError = payload.last_error?.error || payload.error || run.error_message || ''
        return {
          id: run.id,
          run_type: run.run_type,
          type_label: run.run_type === 'chapter_group_generation' ? '章节群生成'
            : run.run_type === 'chapter_generation_pipeline' ? '章节流水线'
              : run.run_type === 'batch_generate_prose' ? '批量正文生成'
                : run.run_type === 'generate_prose' ? '正文生成'
                  : run.run_type === 'original_incubation' ? '原创孵化'
                    : run.run_type === 'plan' ? '全案规划'
                      : run.run_type === 'creative_command' ? '创作指令'
                        : run.run_type === 'release_repair_queue' ? '发布修复队列'
                        : run.run_type === 'release_quality_batch' ? '发布质检批量任务'
                          : run.run_type === 'release_similarity_batch' ? '发布相似度批量任务'
                              : run.run_type === 'regression_benchmark' ? '回归基准'
                                : run.run_type === 'ab_experiment' ? 'A/B 实验'
                                  : run.run_type === 'ab_sandbox' ? 'A/B 沙盒实写'
                                    : run.run_type === 'ab_sandbox_apply' ? 'A/B 沙盒采纳'
                                      : run.run_type === 'mechanical_qa' ? '机械质检'
                                        : run.run_type === 'mechanical_qa_llm' ? 'AI机械质检复核'
                                          : run.run_type === 'propagation_debt' ? '传播债务'
                                            : run.run_type === 'propagation_debt_llm' ? 'AI传播债务方案'
                                              : run.run_type === 'project_backup' ? '项目备份'
                                                : run.run_type === 'project_backup_import' ? '备份导入'
                                                  : run.run_type === 'mechanical_qa_repair' ? '机械质检修复'
                                                    : run.run_type === 'first30_retention_diagnosis' ? '前30章留存诊断'
                                                      : run.run_type === 'first30_retention_repair' ? '前30章留存修复'
                                                        : run.run_type === 'longform_pressure_test' ? '300万字压力测试'
                                                          : run.run_type === 'future_100_skeleton' ? '未来100章骨架'
                                                            : run.run_type === 'future_100_skeleton_apply' ? '应用未来100章骨架'
                                                              : run.run_type === 'longform_production_repair' ? '长线生产修复'
                                                    : run.run_type === 'genre_template_apply' ? '类型模板'
                      : run.run_type,
          step_name: run.step_name,
          status: run.status,
          phase: payload.phase || (isRepairTaskRun ? repairPhase : payload.current_step) || run.step_name || '',
          progress: percent,
          current_index: payload.current_index ?? null,
          chapter_count: chapters.length,
          task_count: repairTasks.length,
          repair_task_summary: isRepairTaskRun ? {
            total: repairTasks.length,
            open: repairOpen,
            needs_review: repairNeedsReview,
            resolved: repairResolved,
          } : null,
          production_mode: payload.production_mode || payload.policy?.production_mode || '',
          failed_count: chapters.filter((item: any) => item.status === 'failed').length,
          approval_count: chapters.filter((item: any) => item.status === 'needs_approval').length,
          can_pause: !isRepairTaskRun && ['running', 'ready'].includes(run.status),
          can_resume: !terminalAdmission && !isRepairTaskRun && ['paused', 'failed', 'ready'].includes(run.status),
          can_execute: !terminalAdmission && run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed', 'running'].includes(run.status),
          can_process_repair_tasks: isRepairTaskRun && repairTasks.length > 0 && ['ready', 'paused', 'failed', 'running'].includes(run.status),
          error: lastError,
          recovery_plan: lastError ? (payload.last_error?.recovery_plan || null) : null,
          created_at: run.created_at,
          duration_ms: run.duration_ms,
          payload,
        }
      }
      const tasks = runs
        .filter(run => [
          'chapter_group_generation',
          'chapter_generation_pipeline',
          'batch_generate_prose',
          'generate_prose',
          'original_incubation',
          'plan',
          'creative_command',
          'agent_execute',
          'repair',
          'release_repair_queue',
          'release_quality_batch',
          'release_similarity_batch',
          'regression_benchmark',
          'ab_experiment',
          'ab_sandbox',
          'ab_sandbox_apply',
          'mechanical_qa',
          'propagation_debt',
          'project_backup',
          'project_backup_import',
          'genre_template_apply',
          'mechanical_qa_repair',
          'first30_retention_diagnosis',
          'first30_retention_repair',
          'longform_pressure_test',
          'future_100_skeleton',
          'future_100_skeleton_apply',
          'longform_production_repair',
        ].includes(run.run_type))
        .map(normalizeRun)
      const active = tasks.filter(task => ['queued', 'ready', 'running', 'paused', 'needs_approval'].includes(task.status))
      res.json({
        ok: true,
        worker,
        tasks,
        active,
        summary: {
          total: tasks.length,
          active: active.length,
          running: tasks.filter(task => task.status === 'running').length,
          paused: tasks.filter(task => task.status === 'paused').length,
          failed: tasks.filter(task => task.status === 'failed').length,
          needs_approval: tasks.reduce((sum, task) => sum + Number(task.approval_count || 0), 0),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/agent-audit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [runs, reviews, chapters] = await Promise.all([
        listNovelRuns(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
        listNovelChapters(activeWorkspace, projectId),
      ])
      res.json({ ok: true, audit: buildAgentAudit(project, runs, reviews, chapters) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/run-queue/worker-status', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    const persistentWorker = project?.reference_config?.run_queue_worker || null
    const worker = ctx.runQueueWorkers.get(projectId) || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
    res.json({ ok: true, worker: publicWorkerState(worker) })
  })

  app.post('/api/novel/projects/:id/run-queue/recover', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      let recoveredRuns = 0
      for (const run of runs.filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, lock: null, phase: '手动恢复：运行中任务已转回待执行', recovered_at: new Date().toISOString() }),
        })
        recoveredRuns += 1
      }
      const worker = {
        ...(project.reference_config?.run_queue_worker || {}),
        status: 'idle',
        stop_requested: false,
        phase: `已恢复 ${recoveredRuns} 个运行中任务`,
        recovered_runs: recoveredRuns,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any)
      ctx.runQueueWorkers.set(project.id, worker)
      res.json({ ok: true, worker: publicWorkerState(worker), project: updated, recovered_runs: recoveredRuns })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/run-queue/start-worker', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const existing = ctx.runQueueWorkers.get(project.id)
      if (['running', 'stopping'].includes(existing?.status)) return res.json({ ok: true, worker: publicWorkerState(existing), message: '后台 worker 已在运行' })
      const staleRuns = (await listNovelRuns(activeWorkspace, project.id)).filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')
      for (const staleRun of staleRuns) {
        const stalePayload = parseJsonLikePayload(staleRun.output_ref) || {}
        await updateNovelRun(activeWorkspace, staleRun.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...stalePayload, phase: '后端重启后自动恢复为待执行', recovered_at: new Date().toISOString() }),
        })
      }
      const worker = {
        status: 'running',
        stop_requested: false,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_runs: 0,
        processed_chapters: 0,
        last_error: '',
      }
      ctx.runQueueWorkers.set(project.id, worker)
      await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any)
      const maxRuns = Math.max(1, Math.min(200, Number(req.body.max_runs || 200)))
      const maxChaptersPerRun = Math.max(1, Math.min(10, Number(req.body.max_chapters_per_run || 1)))
      const chapterTimeoutMs = Math.max(30_000, Math.min(1_800_000, Number(req.body.chapter_timeout_ms || req.body.chapterTimeoutMs || project.reference_config?.production_budget?.chapter_timeout_ms || 600_000)))
      const idleWaitMs = clampNumber(
        req.body.idle_wait_ms ?? req.body.idleWaitMs ?? project.reference_config?.production_budget?.idle_wait_ms ?? 0,
        0,
        0,
        300_000,
      )
      const idlePollMs = clampNumber(
        req.body.idle_poll_ms ?? req.body.idlePollMs ?? project.reference_config?.production_budget?.idle_poll_ms ?? 1_000,
        1_000,
        10,
        30_000,
      )
      void (async () => {
        try {
          let idleStartedAt: number | null = null
          while (!worker.stop_requested && worker.processed_runs < maxRuns) {
            const latestBudgetProject = await ctx.getProject(activeWorkspace, project.id)
            const budgetProject = latestBudgetProject || project
            const runs = await listNovelRuns(activeWorkspace, project.id)
            const budgetDecision = ctx.getProductionBudgetDecision(budgetProject, runs)
            worker.budget = budgetDecision
            if (budgetDecision.blocked) {
              worker.status = 'paused_budget'
              worker.phase = `预算熔断：${budgetDecision.reasons.join('；')}`
              worker.updated_at = new Date().toISOString()
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: { ...(budgetProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
              } as any).catch(() => null)
              break
            }
            const isRunDue = (item: any) => {
              const payload = parseJsonLikePayload(item.output_ref) || {}
              const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
              const current = chapters[Number(payload.current_index || 0)] || null
              if (!current?.next_run_at) return true
              return new Date(String(current.next_run_at)).getTime() <= Date.now()
            }
            const getNextRunAt = (item: any) => {
              const payload = parseJsonLikePayload(item.output_ref) || {}
              const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
              const current = chapters[Number(payload.current_index || 0)] || null
              const nextRunAt = current?.next_run_at ? new Date(String(current.next_run_at)).getTime() : 0
              return Number.isFinite(nextRunAt) ? nextRunAt : 0
            }
            const run = runs
              .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status) && isRunDue(item))
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]
            if (!run) {
              const now = Date.now()
              const nextDueAt = runs
                .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status))
                .map(getNextRunAt)
                .filter(nextRunAt => nextRunAt > now)
                .sort((a, b) => a - b)[0]
              if (!idleWaitMs || !nextDueAt) break
              if (idleStartedAt === null) idleStartedAt = now
              const remainingWaitMs = idleWaitMs - (now - idleStartedAt)
              if (remainingWaitMs <= 0) break
              const waitMs = Math.max(1, Math.min(idlePollMs, nextDueAt - now, remainingWaitMs))
              worker.phase = `等待下次重试：${new Date(nextDueAt).toISOString()}`
              worker.updated_at = new Date().toISOString()
              await sleep(waitMs)
              continue
            }
            idleStartedAt = null
            worker.current_run_id = run.id
            worker.phase = `执行任务 ${run.step_name || run.id}`
            worker.updated_at = new Date().toISOString()
            const chapterAbortController = new AbortController()
            worker.current_abort_controller = chapterAbortController
            worker.chapter_timeout_ms = chapterTimeoutMs
            const chapterTimeout = setTimeout(() => {
              chapterAbortController.abort()
              worker.stop_requested = true
              worker.phase = `章节执行超时：${Math.round(chapterTimeoutMs / 1000)} 秒`
              worker.updated_at = new Date().toISOString()
            }, chapterTimeoutMs)
            let result: any
            try {
              result = await ctx.executeChapterGroupRunRecord(activeWorkspace, budgetProject, run, {
                ...req.body,
                max_chapters: maxChaptersPerRun,
                model_id: req.body.model_id,
                lock_owner: `worker-${project.id}-${worker.started_at}`,
                abortSignal: chapterAbortController.signal,
                llmTimeoutMs: chapterTimeoutMs,
                chapter_timeout_ms: chapterTimeoutMs,
              })
            } finally {
              clearTimeout(chapterTimeout)
              if (worker.current_abort_controller === chapterAbortController) delete worker.current_abort_controller
            }
            worker.processed_runs += 1
            worker.processed_chapters += Number(result.processed || 0)
            worker.last_run_status = result.status
            worker.updated_at = new Date().toISOString()
            const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
            if (latestProject) {
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
              } as any).catch(() => null)
            }
          }
          worker.status = worker.stop_requested ? 'stopped' : 'idle'
          worker.phase = worker.stop_requested ? '已停止' : '队列已空'
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } catch (error: any) {
          if (worker.stop_requested || isAbortLikeError(error)) {
            worker.status = 'stopped'
            worker.phase = worker.phase || '已停止'
            worker.last_error = ''
          } else {
            worker.status = 'failed'
            worker.last_error = String(error?.message || error)
          }
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } finally {
          ctx.runQueueWorkers.set(project.id, { ...worker })
          const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
          if (latestProject) {
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
            } as any).catch(() => null)
          }
        }
      })()
      res.json({ ok: true, worker: publicWorkerState(worker), message: '后台 worker 已启动' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/run-queue/stop-worker', async (req, res) => {
    const projectId = Number(req.params.id)
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, projectId).catch(() => null)
    const worker = ctx.runQueueWorkers.get(projectId) || project?.reference_config?.run_queue_worker || { status: 'idle' }
    worker.stop_requested = true
    worker.status = worker.status === 'running' ? 'stopping' : worker.status
    worker.current_abort_controller?.abort()
    worker.updated_at = new Date().toISOString()
    ctx.runQueueWorkers.set(projectId, worker)
    if (project) {
      await updateNovelProject(activeWorkspace, projectId, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any).catch(() => null)
    }
    res.json({ ok: true, worker: publicWorkerState(worker) })
  })

  app.post('/api/novel/projects/:id/run-queue/drain', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const executable = runs
        .filter(run => run.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(run.status))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .slice(0, Math.max(1, Math.min(5, Number(req.body.limit || 1))))
      const drained = []
      for (const run of executable) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        drained.push({ run_id: run.id, execute_endpoint: `/api/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, current_index: payload.current_index || 0 })
      }
      res.json({ ok: true, drained, note: '本地版队列采用可恢复任务记录；前端或调用方按 execute_endpoint 拉起实际执行。' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/pause', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'paused',
        output_ref: JSON.stringify({ ...payload, paused_at: new Date().toISOString(), pause_reason: String(req.body.reason || 'manual') }),
      })
      res.json({ ok: true, run: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/resume', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const terminalAdmissionGuard = findTerminalAdmissionResumeGuard(payload)
      if (terminalAdmissionGuard) return res.status(409).json(terminalAdmissionGuard)
      if (run.run_type === 'chapter_group_generation') {
        const approvalBlockerGuard = findApprovalBlockerResumeGuard(payload)
        if (approvalBlockerGuard) return res.status(409).json(approvalBlockerGuard)
        const updated = await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, phase: '等待继续执行', resumed_at: new Date().toISOString() }),
        })
        return res.json({ ok: true, run: updated, execute_endpoint: `/api/novel/projects/${run.project_id}/chapter-groups/${run.id}/execute`, group: parseJsonLikePayload(updated?.output_ref) })
      }
      if (isRepairTaskRunType(run.run_type)) {
        return res.status(400).json({
          error: '修复任务需要在任务详情中逐项处理，不支持流水线继续。',
          error_code: 'REPAIR_TASK_RUN_NOT_RESUMABLE',
        })
      }
      const steps = Array.isArray(payload.steps) ? payload.steps : ctx.buildPipelineSteps()
      const currentStep = String(req.body.current_step || payload.can_resume_from || payload.current_step || 'draft')
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({
          ...payload,
          current_step: currentStep,
          resumed_at: new Date().toISOString(),
          steps: steps.map((step: any) => step.key === currentStep ? { ...step, status: step.status === 'pending' ? 'ready' : step.status } : step),
          resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`,
        }),
      })
      res.json({ ok: true, run: updated, resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`, pipeline: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/tasks/:taskIndex/status', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      const taskIndex = Number(req.params.taskIndex)
      if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
        return res.status(404).json({ error: 'task not found' })
      }
      const status = String(req.body.status || 'needs_review')
      const allowed = new Set(['open', 'in_progress', 'needs_review', 'resolved'])
      if (!allowed.has(status)) return res.status(400).json({ error: 'invalid task status' })
      const now = new Date().toISOString()
      const nextTasks = tasks.map((task: any, index: number) => index === taskIndex ? {
        ...task,
        task_status: status,
        status_note: String(req.body.note || ''),
        updated_at: now,
        started_at: status === 'in_progress' ? now : task.started_at,
        needs_review_at: status === 'needs_review' ? now : task.needs_review_at,
        resolved_at: status === 'resolved' ? now : task.resolved_at,
      } : task)
      const resolvedCount = nextTasks.filter((task: any) => task.task_status === 'resolved').length
      const needsReviewCount = nextTasks.filter((task: any) => task.task_status === 'needs_review').length
      const nextRunStatus = nextTasks.length > 0 && resolvedCount === nextTasks.length ? 'completed' : run.status === 'completed' ? 'ready' : run.status
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: nextRunStatus,
        output_ref: JSON.stringify({
          ...payload,
          tasks: nextTasks,
          task_status_summary: {
            total: nextTasks.length,
            resolved: resolvedCount,
            needs_review: needsReviewCount,
            open: nextTasks.filter((task: any) => !task.task_status || task.task_status === 'open').length,
            updated_at: now,
          },
        }),
      })
      res.json({ ok: true, run: updated, task: nextTasks[taskIndex], task_status_summary: parseJsonLikePayload(updated?.output_ref)?.task_status_summary })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/tasks/status-bulk', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      const rawIndices = Array.isArray(req.body.task_indices) ? req.body.task_indices : []
      const taskIndices = rawIndices.length ? rawIndices.map(Number).filter((index: number) => Number.isInteger(index) && index >= 0 && index < tasks.length) : tasks.map((_: any, index: number) => index)
      if (!taskIndices.length) return res.status(400).json({ error: 'no valid task indices' })
      const status = String(req.body.status || 'resolved')
      const allowed = new Set(['open', 'in_progress', 'needs_review', 'resolved'])
      if (!allowed.has(status)) return res.status(400).json({ error: 'invalid task status' })
      const selected = new Set(taskIndices)
      const now = new Date().toISOString()
      const nextTasks = tasks.map((task: any, index: number) => selected.has(index) ? {
        ...task,
        task_status: status,
        status_note: String(req.body.note || ''),
        updated_at: now,
        started_at: status === 'in_progress' ? now : task.started_at,
        needs_review_at: status === 'needs_review' ? now : task.needs_review_at,
        resolved_at: status === 'resolved' ? now : task.resolved_at,
      } : task)
      const resolvedCount = nextTasks.filter((task: any) => task.task_status === 'resolved').length
      const needsReviewCount = nextTasks.filter((task: any) => task.task_status === 'needs_review').length
      const nextRunStatus = nextTasks.length > 0 && resolvedCount === nextTasks.length ? 'completed' : run.status === 'completed' ? 'ready' : run.status
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: nextRunStatus,
        output_ref: JSON.stringify({
          ...payload,
          tasks: nextTasks,
          task_status_summary: {
            total: nextTasks.length,
            resolved: resolvedCount,
            needs_review: needsReviewCount,
            open: nextTasks.filter((task: any) => !task.task_status || task.task_status === 'open').length,
            updated_at: now,
          },
        }),
      })
      res.json({
        ok: true,
        run: updated,
        updated_count: taskIndices.length,
        task_status_summary: parseJsonLikePayload(updated?.output_ref)?.task_status_summary,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const record = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: String(req.body.run_type || 'manual'),
        step_name: String(req.body.step_name || 'summary'),
        status: String(req.body.status || 'success'),
        input_ref: typeof req.body.input_ref === 'string' ? req.body.input_ref : JSON.stringify(req.body.input_ref || {}),
        output_ref: typeof req.body.output_ref === 'string' ? req.body.output_ref : JSON.stringify(req.body.output_ref || {}),
        duration_ms: Number(req.body.duration_ms || 0),
        error_message: String(req.body.error_message || ''),
      })
      res.json(record)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
