import { requireCoherentEditorRevisionCheckpoint } from '../../novel/repos/editor-revision-runs'
import type { NovelRunRecord } from '../../novel/types'
import {
  countProseChars,
  normalizeProseContractionFinishReason,
} from '../../novel-writing/word-target'
import {
  EDITOR_REVISION_PHASE_LABELS,
  EDITOR_REVISION_PHASES,
  type EditorRevisionCheckpoint,
  type EditorRevisionPhase,
  type EditorRevisionPhaseState,
  type EditorRevisionRunInput,
  type EditorRevisionRunStatus,
} from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'

const EDITOR_REVISION_STATUSES = [
  'queued',
  'running',
  'cancel_requested',
  'completed',
  'failed',
  'canceled',
] as const
const ACTIVE_STATUSES = new Set<EditorRevisionRunStatus>(['queued', 'running', 'cancel_requested'])
const RETRYABLE_STATUSES = new Set<EditorRevisionRunStatus>(['failed', 'canceled'])
const TERMINAL_PHASE_STATES = new Set<EditorRevisionPhaseState['status']>(['completed', 'skipped'])
const RESTART_REQUIRED_ERRORS = new Set(['SOURCE_VERSION_CHANGED', 'REVISION_RUN_SUPERSEDED'])
const POST_COMMIT_PHASES: EditorRevisionPhase[] = [
  'post_quality',
  'sync_current_story_state',
  'record_continuity_warning',
  'completed',
]
const DIAGNOSTIC_CANDIDATE_LIMIT = 60_000
const DIAGNOSTIC_PREVIEW_LIMIT = 2_000
const PUBLIC_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  REVISION_RUN_MALFORMED: 'editor revision run metadata is unavailable',
  REVISION_FAILED: 'editor revision failed',
  REVISION_WORKER_FAILED: 'editor revision failed',
  REVISION_LLM_TIMEOUT: 'editor revision model call timed out',
  REVISION_CANCELED: 'editor revision canceled',
  REVISION_RUN_SUPERSEDED: 'editor revision was superseded by a newer revision',
  SOURCE_VERSION_CHANGED: 'chapter source changed; start a new revision',
  REVISION_RESTART_REQUIRED: 'editor revision must restart from a fresh source snapshot',
  REVISION_INPUT_INVALID: 'editor revision input is invalid',
  REVISION_CHECKPOINT_INVALID: 'editor revision checkpoint is invalid',
  REVISION_CHECKPOINT_REGRESSION: 'editor revision checkpoint is invalid',
  REVISION_CANDIDATE_MISSING: 'editor revision candidate is unavailable',
  REVISION_CANDIDATE_CHECKPOINT_FAILED: 'editor revision candidate could not be saved',
  REVISION_LEASE_LOST: 'editor revision worker lease was lost',
  REVISION_RUN_NOT_FOUND: 'editor revision run was not found',
  CHAPTER_NOT_FOUND: 'chapter was not found',
  PROJECT_NOT_FOUND: 'project was not found',
  PROVIDER_FAILED: 'editor revision provider failed',
  QUALITY_FAILED: 'post-revision quality check failed',
  PROSE_REVISION_TRUNCATED: '正文修订输出不完整，不能作为完整章节正文入库',
  REVISION_NO_PROSE_BODY: '修订结果没有可用正文',
  REVISION_PARTIAL_JSON_RECOVERY: '修订结果来自不完整 JSON 恢复',
  REVISION_PATCH_INCOMPLETE: '修订补丁未完整应用',
  REVISION_NO_APPLICABLE_PATCH: '修订未返回可应用正文',
  REVISION_CANDIDATE_TOO_SHORT: '修订候选明显短于原文',
  REVISION_CANDIDATE_TOO_LONG: '修订候选明显长于原文',
  REVISION_OUTPUT_WRAPPER: '修订候选包含无效的输出外壳',
  REVISION_INCOMPLETE_ENDING: '修订候选没有完整的正文结尾',
}
const PUBLIC_WARNING_MESSAGES: Readonly<Record<string, string>> = {
  POST_QUALITY_NEEDS_REVISION: '修订后质检仍建议人工复查',
}
const PUBLIC_PHASE_REASONS = new Set(['disabled_by_request'])
const PUBLIC_PATCH_TYPES = new Set(['replacement', 'insertion', 'opening_rewrite'])
const PUBLIC_PATCH_REASONS = new Set([
  'anchor_not_found',
  'anchor_not_unique',
  'anchor_overlap',
  'keep_from_not_found',
  'keep_from_not_unique',
  'missing_find_or_replace',
  'missing_text',
])
const PUBLIC_COMMIT_STATUSES = new Set(['committed', 'already_committed'])
const PUBLIC_STORY_STATE_STATUSES = new Set(['prepared', 'completed'])
const PUBLIC_CONVERGENCE_STATUSES = new Set(['cleared', 'improved', 'worse', 'unchanged'])

export type PublicEditorRevisionRun = {
  id: number
  run_type: 'editor_revision'
  status: EditorRevisionRunStatus
  phase: EditorRevisionPhase
  phase_label: string
  phases: Record<EditorRevisionPhase, Omit<EditorRevisionPhaseState, 'summary'> & { summary?: Record<string, unknown> }>
  chapter_id: number
  chapter_no: number
  chapter_title: string
  prose_persisted: boolean
  quality: Record<string, unknown> | null
  story_state: Record<string, unknown> | null
  warnings: Array<{ code: string; message: string }>
  error: { code: string; message: string } | null
  progress: null
  can_cancel: boolean
  can_retry: boolean
  can_continue: boolean
  repair_task_link: { run_id: number; task_index: number } | null
  linked_task_closure: { status: 'pending' | 'completed'; completed_at?: string } | null
  created_at: string
  updated_at: string
}

function parseJsonObject(value: unknown): Record<string, any> | null {
  let parsed = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, any>
    : null
}

function parseRunStatus(value: unknown): EditorRevisionRunStatus | null {
  return EDITOR_REVISION_STATUSES.includes(value as EditorRevisionRunStatus)
    ? value as EditorRevisionRunStatus
    : null
}

function parseRunInput(value: unknown): EditorRevisionRunInput | null {
  const input = parseJsonObject(value)
  if (!input || input.schema_version !== 1) return null
  if (!Number.isInteger(input.project_id)
    || !Number.isInteger(input.chapter_id)
    || !Number.isInteger(input.chapter_no)
    || !Number.isInteger(input.review_id)
    || typeof input.chapter_title !== 'string'
    || typeof input.source_chapter_updated_at !== 'string'
    || typeof input.source_text !== 'string'
    || typeof input.source_text_hash !== 'string'
    || !Number.isInteger(input.source_char_count)
    || !input.source_review || typeof input.source_review !== 'object' || Array.isArray(input.source_review)
    || !input.report || typeof input.report !== 'object' || Array.isArray(input.report)
    || !input.context_package || typeof input.context_package !== 'object' || Array.isArray(input.context_package)
    || typeof input.revision_mode !== 'string'
    || typeof input.revision_strategy !== 'string'
    || typeof input.user_prompt !== 'string'
    || !input.source_text || !input.source_text_hash
    || revisionTextHash(input.source_text) !== input.source_text_hash
    || countProseChars(input.source_text) !== input.source_char_count
    || typeof input.auto_quality_check !== 'boolean'
    || typeof input.auto_story_state !== 'boolean'
    || (input.model_id !== undefined && !Number.isInteger(input.model_id))
    || (input.repair_task_link !== undefined && (
      !parseJsonObject(input.repair_task_link)
      || !Number.isInteger(input.repair_task_link.run_id)
      || input.repair_task_link.run_id < 1
      || !Number.isInteger(input.repair_task_link.task_index)
      || input.repair_task_link.task_index < 0
      || !parseJsonObject(input.repair_task_link.task)
    ))
    || typeof input.created_at !== 'string') {
    return null
  }
  return input as EditorRevisionRunInput
}

function parseCheckpoint(run: NovelRunRecord, status: EditorRevisionRunStatus): EditorRevisionCheckpoint | null {
  try {
    return requireCoherentEditorRevisionCheckpoint(run.output_ref, { runStatus: status })
  } catch {
    return null
  }
}

function finiteNumber(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function finiteInteger(value: unknown): number | null {
  const numberValue = finiteNumber(value)
  return numberValue !== null && Number.isInteger(numberValue) ? numberValue : null
}

function safeString(value: unknown, limit = 500): string {
  return typeof value === 'string' ? value.slice(0, limit) : ''
}

function safeEnumValue(value: unknown, allowed: Set<string>): string | undefined {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return allowed.has(normalized) ? normalized : undefined
}

function publicRevisionError(value: unknown): { code: string; message: string } {
  const requestedCode = typeof value === 'string' ? value : ''
  const code = Object.prototype.hasOwnProperty.call(PUBLIC_ERROR_MESSAGES, requestedCode)
    ? requestedCode
    : 'REVISION_FAILED'
  return { code, message: PUBLIC_ERROR_MESSAGES[code] }
}

function safeFinishReason(value: unknown): string | undefined {
  return normalizeProseContractionFinishReason({ finish_reason: value }) || undefined
}

function safeIncompleteReason(value: unknown): string | undefined {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!reason) return undefined
  if (['max_output_tokens', 'max_tokens', 'token_limit', 'length'].includes(reason)) return 'max_output_tokens'
  if (['content_filter', 'safety'].includes(reason)) return 'content_filter'
  return 'unknown'
}

function compactObject(entries: Array<[string, unknown]>): Record<string, unknown> | undefined {
  const object = Object.fromEntries(entries.filter(([, value]) => value !== undefined))
  return Object.keys(object).length ? object : undefined
}

function safeUsage(value: unknown): Record<string, number> | undefined {
  const usage = parseJsonObject(value)
  if (!usage) return undefined
  const entries = [
    'input_tokens',
    'prompt_tokens',
    'output_tokens',
    'completion_tokens',
    'total_tokens',
    'cached_tokens',
  ].flatMap(key => {
    const numberValue = finiteNumber(usage[key])
    return numberValue !== null && numberValue >= 0 ? [[key, Math.floor(numberValue)] as [string, number]] : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

function safeReceipt(value: unknown): Record<string, unknown> | undefined {
  const receipt = parseJsonObject(value)
  if (!receipt) return undefined
  return compactObject([
    ['key', safeString(receipt.key, 300) || undefined],
    ['source_run_id', finiteInteger(receipt.source_run_id) ?? undefined],
    ['candidate_hash', safeString(receipt.candidate_hash, 200) || undefined],
    ['chapter_id', finiteInteger(receipt.chapter_id) ?? undefined],
  ])
}

function safePatchReasons(value: unknown): Array<Record<string, string>> | undefined {
  if (!Array.isArray(value)) return undefined
  const reasons = value.slice(0, 40).flatMap(item => {
    const record = parseJsonObject(item)
    if (!record) return []
    const type = safeEnumValue(record.type, PUBLIC_PATCH_TYPES)
    const reason = safeEnumValue(record.reason, PUBLIC_PATCH_REASONS)
    return type || reason ? [{ ...(type ? { type } : {}), ...(reason ? { reason } : {}) }] : []
  })
  return reasons.length ? reasons : undefined
}

function safeGenerationSummary(value: unknown, diagnostics = false): Record<string, unknown> | undefined {
  const summary = parseJsonObject(value)
  const source = parseJsonObject(summary?.diagnostics) || summary
  if (!source) return undefined
  return compactObject([
    ['finish_reason', safeFinishReason(source.finish_reason)],
    ['incomplete_reason', safeIncompleteReason(source.incomplete_reason)],
    ['incomplete_details_present', typeof source.incomplete_details_present === 'boolean' ? source.incomplete_details_present : undefined],
    ['usage', safeUsage(source.usage)],
    ['content_length', finiteInteger(source.content_length) ?? undefined],
    ['content_preview', diagnostics ? safeString(source.content_preview, DIAGNOSTIC_PREVIEW_LIMIT) || undefined : undefined],
    ['provider_result_ref', diagnostics
      ? safeString(source.provider_result_ref || source.provider_result_reference || source.result_ref, 500) || undefined
      : undefined],
  ])
}

function safeAdmissionSummary(value: unknown): Record<string, unknown> | undefined {
  const summary = parseJsonObject(value)
  if (!summary) return undefined
  return compactObject([
    ['source_char_count', finiteInteger(summary.source_char_count) ?? undefined],
    ['candidate_char_count', finiteInteger(summary.candidate_char_count) ?? undefined],
    ['minimum_char_count', finiteInteger(summary.minimum_char_count) ?? undefined],
    ['maximum_char_count', finiteInteger(summary.maximum_char_count) ?? undefined],
    ['applied_patch_count', finiteInteger(summary.applied_patch_count) ?? undefined],
    ['unapplied_patch_count', finiteInteger(summary.unapplied_patch_count) ?? undefined],
    ['unapplied_patch_reasons', safePatchReasons(summary.unapplied_patch_reasons)],
  ])
}

function safePhaseSummary(phase: EditorRevisionPhase, value: unknown): Record<string, unknown> | undefined {
  const summary = parseJsonObject(value)
  if (!summary) return undefined
  if (phase === 'generate_candidate') return safeGenerationSummary(summary)
  if (phase === 'admit_candidate') return safeAdmissionSummary(summary)
  if (phase === 'persist_chapter') {
    return compactObject([
      ['commit_status', safeEnumValue(summary.commit_status, PUBLIC_COMMIT_STATUSES)],
      ['chapter_updated_at', safeString(summary.chapter_updated_at, 80) || undefined],
      ['review_id', finiteInteger(summary.review_id) ?? undefined],
      ['recovered', typeof summary.recovered === 'boolean' ? summary.recovered : undefined],
      ['recovered_from_commit_marker', typeof summary.recovered_from_commit_marker === 'boolean' ? summary.recovered_from_commit_marker : undefined],
    ])
  }
  if (phase === 'post_quality') {
    return compactObject([
      ['reason', safeEnumValue(summary.reason, PUBLIC_PHASE_REASONS)],
      ['review_id', finiteInteger(summary.review_id) ?? undefined],
      ['score', finiteNumber(summary.score) ?? undefined],
      ['passed', typeof summary.passed === 'boolean' ? summary.passed : undefined],
      ['needs_revision', typeof summary.needs_revision === 'boolean' ? summary.needs_revision : undefined],
      ['reused', typeof summary.reused === 'boolean' ? summary.reused : undefined],
    ])
  }
  if (phase === 'sync_current_story_state') {
    return compactObject([
      ['reason', safeEnumValue(summary.reason, PUBLIC_PHASE_REASONS)],
      ['status', safeEnumValue(summary.status, PUBLIC_STORY_STATE_STATUSES)],
      ['reused', typeof summary.reused === 'boolean' ? summary.reused : undefined],
      ['receipt', safeReceipt(summary.receipt)],
    ])
  }
  if (phase === 'record_continuity_warning') {
    return compactObject([
      ['reason', safeEnumValue(summary.reason, PUBLIC_PHASE_REASONS)],
      ['convergence_review_id', finiteInteger(summary.convergence_review_id) ?? undefined],
      ['continuity_warning_review_id', finiteInteger(summary.continuity_warning_review_id) ?? undefined],
    ])
  }
  return compactObject([
    ['reason', safeEnumValue(summary.reason, PUBLIC_PHASE_REASONS)],
    ['prose_persisted', typeof summary.prose_persisted === 'boolean' ? summary.prose_persisted : undefined],
  ])
}

function safePhaseState(phase: EditorRevisionPhase, state: EditorRevisionPhaseState) {
  const summary = safePhaseSummary(phase, state.summary)
  const publicError = state.error_code || state.error
    ? publicRevisionError(state.error_code)
    : null
  return {
    status: state.status,
    attempt: Math.max(0, finiteInteger(state.attempt) ?? 0),
    ...(state.started_at ? { started_at: safeString(state.started_at, 80) } : {}),
    ...(state.completed_at ? { completed_at: safeString(state.completed_at, 80) } : {}),
    ...(publicError ? { error_code: publicError.code, error: publicError.message } : {}),
    ...(summary ? { summary } : {}),
  }
}

function safeQuality(value: unknown): Record<string, unknown> | null {
  const quality = parseJsonObject(value)
  if (!quality) return null
  return compactObject([
    ['review_id', finiteInteger(quality.review_id) ?? undefined],
    ['score', finiteNumber(quality.score) ?? undefined],
    ['passed', typeof quality.passed === 'boolean' ? quality.passed : undefined],
    ['needs_revision', typeof quality.needs_revision === 'boolean' ? quality.needs_revision : undefined],
    ['reused', typeof quality.reused === 'boolean' ? quality.reused : undefined],
  ]) || null
}

function safeStoryState(value: unknown): Record<string, unknown> | null {
  const storyState = parseJsonObject(value)
  if (!storyState) return null
  return compactObject([
    ['status', safeEnumValue(storyState.status, PUBLIC_STORY_STATE_STATUSES)],
    ['reused', typeof storyState.reused === 'boolean' ? storyState.reused : undefined],
    ['receipt', safeReceipt(storyState.receipt)],
    ['completed_receipt', safeReceipt(storyState.completed_receipt)],
  ]) || null
}

function safeDeliveryRiskConvergence(value: unknown): Record<string, unknown> | null {
  const convergence = parseJsonObject(value)
  if (!convergence) return null
  const status = safeEnumValue(convergence.status, PUBLIC_CONVERGENCE_STATUSES)
  if (!status) return null
  const beforeCount = Math.max(0, finiteInteger(convergence.before_count) ?? 0)
  const afterCount = Math.max(0, finiteInteger(convergence.after_count) ?? 0)
  const resolvedCount = Math.max(0, finiteInteger(convergence.resolved_count) ?? 0)
  const residualCount = Math.max(0, finiteInteger(convergence.residual_count) ?? afterCount)
  const addedCount = Math.max(0, finiteInteger(convergence.added_count) ?? 0)
  const label = status === 'cleared'
    ? '风险已清零'
    : status === 'improved'
      ? `风险收敛 ${resolvedCount}`
      : status === 'worse'
        ? `新增风险 ${addedCount}`
        : `仍有残留 ${residualCount}`
  return {
    status,
    label,
    before_count: beforeCount,
    after_count: afterCount,
    resolved_count: resolvedCount,
    residual_count: residualCount,
    added_count: addedCount,
  }
}

function safeLinkedTaskClosure(value: unknown): PublicEditorRevisionRun['linked_task_closure'] {
  const closure = parseJsonObject(value)
  if (!closure) return null
  if (closure.status === 'pending') return { status: 'pending' }
  if (closure.status !== 'completed') return null
  const completedAt = safeString(closure.completed_at, 80)
  const completedDate = new Date(completedAt)
  if (!completedAt || !Number.isFinite(completedDate.getTime())) return null
  return { status: 'completed', completed_at: completedDate.toISOString() }
}

function safeWarnings(value: unknown): Array<{ code: string; message: string }> {
  if (!Array.isArray(value)) return []
  return value.slice(0, 100).flatMap(item => {
    const warning = parseJsonObject(item)
    if (!warning) return []
    const code = typeof warning.code === 'string' ? warning.code : ''
    const message = PUBLIC_WARNING_MESSAGES[code]
    return message ? [{ code, message }] : []
  })
}

function firstIncompletePostPhase(checkpoint: EditorRevisionCheckpoint): EditorRevisionPhase | null {
  return POST_COMMIT_PHASES.find(phase => !TERMINAL_PHASE_STATES.has(checkpoint.phases[phase].status)) || null
}

function malformedPhases(): PublicEditorRevisionRun['phases'] {
  return Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [phase, phase === 'generate_candidate'
    ? {
        status: 'failed',
        attempt: 0,
        error_code: 'REVISION_RUN_MALFORMED',
        error: 'editor revision run metadata is unavailable',
      }
    : { status: 'pending', attempt: 0 }])) as PublicEditorRevisionRun['phases']
}

function malformedView(run: NovelRunRecord): PublicEditorRevisionRun {
  const createdAt = safeString(run.created_at, 80)
  return {
    id: finiteInteger(run.id) ?? 0,
    run_type: 'editor_revision',
    status: 'failed',
    phase: 'generate_candidate',
    phase_label: EDITOR_REVISION_PHASE_LABELS.generate_candidate,
    phases: malformedPhases(),
    chapter_id: 0,
    chapter_no: 0,
    chapter_title: '',
    prose_persisted: false,
    quality: null,
    story_state: null,
    warnings: [],
    error: {
      code: 'REVISION_RUN_MALFORMED',
      message: 'editor revision run metadata is unavailable',
    },
    progress: null,
    can_cancel: false,
    can_retry: false,
    can_continue: false,
    repair_task_link: null,
    linked_task_closure: null,
    created_at: createdAt,
    updated_at: safeString(run.updated_at, 80) || createdAt,
  }
}

export function buildPublicEditorRevisionRun(run: NovelRunRecord): PublicEditorRevisionRun {
  const status = parseRunStatus(run.status)
  const input = parseRunInput(run.input_ref)
  if (run.run_type !== 'editor_revision'
    || !status
    || !input
    || input.project_id !== run.project_id
    || run.scope_key !== `chapter:${input.chapter_id}`) {
    return malformedView(run)
  }
  const checkpoint = parseCheckpoint(run, status)
  if (!checkpoint) return malformedView(run)

  const active = ACTIVE_STATUSES.has(status)
  const postCommitIncomplete = checkpoint.prose_persisted && firstIncompletePostPhase(checkpoint) !== null
  const failureCode = safeString(checkpoint.error?.code || run.error_message, 160)
  const restartRequired = RESTART_REQUIRED_ERRORS.has(failureCode)
  const retryable = RETRYABLE_STATUSES.has(status)
  const error = checkpoint.error ? publicRevisionError(checkpoint.error.code) : null
  const phases = Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [
    phase,
    safePhaseState(phase, checkpoint.phases[phase]),
  ])) as PublicEditorRevisionRun['phases']
  const convergence = safeDeliveryRiskConvergence(checkpoint.delivery_risk_convergence)
  if (convergence) {
    phases.record_continuity_warning = {
      ...phases.record_continuity_warning,
      summary: {
        ...(phases.record_continuity_warning.summary || {}),
        delivery_risk_convergence: convergence,
      },
    }
  }

  return {
    id: run.id,
    run_type: 'editor_revision',
    status,
    phase: checkpoint.phase,
    phase_label: EDITOR_REVISION_PHASE_LABELS[checkpoint.phase],
    phases,
    chapter_id: input.chapter_id,
    chapter_no: input.chapter_no,
    chapter_title: input.chapter_title,
    prose_persisted: checkpoint.prose_persisted,
    quality: safeQuality(checkpoint.post_quality),
    story_state: safeStoryState(checkpoint.story_state),
    warnings: safeWarnings(checkpoint.warnings),
    error,
    progress: null,
    can_cancel: active && (status === 'queued' || status === 'running'),
    can_retry: retryable && !postCommitIncomplete && !restartRequired,
    can_continue: retryable && postCommitIncomplete && !restartRequired,
    repair_task_link: input.repair_task_link
      ? { run_id: input.repair_task_link.run_id, task_index: input.repair_task_link.task_index }
      : null,
    linked_task_closure: safeLinkedTaskClosure(checkpoint.linked_task_closure),
    created_at: safeString(run.created_at, 80),
    updated_at: safeString(run.updated_at, 80) || safeString(run.created_at, 80),
  }
}

function safeRejectedCandidate(value: unknown): Record<string, unknown> | null {
  const candidate = parseJsonObject(value)
  if (!candidate) return null
  const text = typeof candidate.text === 'string' ? candidate.text : ''
  const evidence = compactObject([
    ['hash', safeString(candidate.hash, 200) || undefined],
    ['char_count', finiteInteger(candidate.char_count) ?? undefined],
    ['text', text && text.length <= DIAGNOSTIC_CANDIDATE_LIMIT ? text : undefined],
    ['head_preview', text && text.length > DIAGNOSTIC_CANDIDATE_LIMIT
      ? text.slice(0, DIAGNOSTIC_PREVIEW_LIMIT)
      : safeString(candidate.head_preview, DIAGNOSTIC_PREVIEW_LIMIT) || undefined],
    ['tail_preview', text && text.length > DIAGNOSTIC_CANDIDATE_LIMIT
      ? text.slice(-DIAGNOSTIC_PREVIEW_LIMIT)
      : safeString(candidate.tail_preview, DIAGNOSTIC_PREVIEW_LIMIT) || undefined],
  ])
  return evidence || null
}

export function buildEditorRevisionDiagnostics(run: NovelRunRecord): Record<string, unknown> {
  const publicView = buildPublicEditorRevisionRun(run)
  const status = parseRunStatus(run.status)
  const input = parseRunInput(run.input_ref)
  const checkpoint = status && input ? parseCheckpoint(run, status) : null
  if (!checkpoint || !input || publicView.error?.code === 'REVISION_RUN_MALFORMED') {
    return {
      id: publicView.id,
      run_type: 'editor_revision',
      status: publicView.status,
      phase: publicView.phase,
      phase_label: publicView.phase_label,
      chapter_id: publicView.chapter_id,
      chapter_no: publicView.chapter_no,
      chapter_title: publicView.chapter_title,
      error: publicView.error,
      rejected_candidate: null,
      generation: null,
      admission: null,
      created_at: publicView.created_at,
      updated_at: publicView.updated_at,
    }
  }
  const errorDiagnostics = parseJsonObject(checkpoint.error?.diagnostics)
  const generationSummary = parseJsonObject(checkpoint.phases.generate_candidate.summary)
  const generationDiagnostics = parseJsonObject(generationSummary?.diagnostics) || generationSummary || {}
  const generation = safeGenerationSummary({
    ...errorDiagnostics,
    ...generationDiagnostics,
  }, true) || null
  const admission = safeAdmissionSummary({
    ...errorDiagnostics,
    ...(parseJsonObject(checkpoint.phases.admit_candidate.summary) || {}),
  }) || null

  return {
    id: publicView.id,
    run_type: 'editor_revision',
    status: publicView.status,
    phase: publicView.phase,
    phase_label: publicView.phase_label,
    chapter_id: publicView.chapter_id,
    chapter_no: publicView.chapter_no,
    chapter_title: publicView.chapter_title,
    error: publicView.error,
    rejected_candidate: safeRejectedCandidate(errorDiagnostics?.rejected_candidate),
    generation,
    admission,
    created_at: publicView.created_at,
    updated_at: publicView.updated_at,
  }
}
