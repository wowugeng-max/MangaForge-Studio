import type { Express } from 'express'
import {
  appendNovelRun,
  getNovelReview,
  getNovelRun,
  listNovelChapters,
  listNovelReviewSummaries,
  listNovelReviews,
  listNovelRunSummaries,
  listNovelRuns,
  recoverNovelRunExecution,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import { parseJsonLikePayload } from './novel-route-utils'

export type RunRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  runQueueWorkers: Map<number, any>
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  buildPipelineSteps: () => any[]
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
  recoverNovelRunExecution?: typeof recoverNovelRunExecution
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

export function isRepairTaskRunType(runType: any) {
  return REPAIR_TASK_RUN_TYPES.has(String(runType || ''))
}

export function publicWorkerState(worker: any = {}) {
  const { current_abort_controller: _controller, ...publicWorker } = worker || {}
  return publicWorker
}

export function isAbortLikeError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  return error?.name === 'AbortError'
    || error?.code === 'REQUEST_CANCELED'
    || message.includes('request canceled')
    || message.includes('aborted')
    || message.includes('abort')
}

export function clampNumber(value: any, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function compactAuditText(value: any, limit = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function rejectInvalidQueryView(res: any, view: string, allowedViews: string[]) {
  return res.status(400).json({
    error: `invalid view: ${view}`,
    error_code: 'INVALID_VIEW',
    allowed_views: allowedViews,
  })
}

export function requireProjectId(req: any, res: any) {
  const projectId = Number(req.query?.project_id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'project_id is required', error_code: 'PROJECT_ID_REQUIRED' })
    return null
  }
  return projectId
}

export function optionalSummaryLimit(req: any, res: any) {
  const raw = req.query?.limit
  if (raw === undefined || raw === null || raw === '') return undefined
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0 || limit > 5000) {
    res.status(400).json({ error: 'limit must be an integer between 1 and 5000', error_code: 'INVALID_LIMIT' })
    return null
  }
  return limit
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

export function findApprovalBlockerResumeGuard(payload: any = {}) {
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

export function findTerminalAdmissionResumeGuard(payload: any = {}) {
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

export function buildAgentAudit(project: any, runs: any[], reviews: any[], chapters: any[]) {
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
