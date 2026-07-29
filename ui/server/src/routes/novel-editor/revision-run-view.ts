import { requireCoherentEditorRevisionCheckpoint } from '../../novel/repos/editor-revision-runs'
import type { NovelRunRecord } from '../../novel/types'
import { countProseChars } from '../../novel-writing/word-target'
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

function safeStringArray(value: unknown, limit = 40): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map(item => safeString(item, 120)).filter(Boolean).slice(0, limit)
  return items.length ? items : undefined
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
    const type = safeString(record.type, 80)
    const reason = safeString(record.reason, 120)
    return type || reason ? [{ ...(type ? { type } : {}), ...(reason ? { reason } : {}) }] : []
  })
  return reasons.length ? reasons : undefined
}

function safeGenerationSummary(value: unknown, diagnostics = false): Record<string, unknown> | undefined {
  const summary = parseJsonObject(value)
  const source = parseJsonObject(summary?.diagnostics) || summary
  if (!source) return undefined
  const streamTail = diagnostics && Array.isArray(source.stream_tail)
    ? source.stream_tail.slice(-5).flatMap((item: unknown) => {
        const record = parseJsonObject(item)
        if (!record) return []
        const entry = compactObject([
          ['type', safeString(record.type, 120) || undefined],
          ['keys', safeStringArray(record.keys, 30)],
          ['preview', safeString(record.preview, 500) || undefined],
        ])
        return entry ? [entry] : []
      })
    : undefined
  return compactObject([
    ['finish_reason', safeString(source.finish_reason, 120) || undefined],
    ['incomplete_reason', safeString(source.incomplete_reason, 240) || undefined],
    ['incomplete_details_present', typeof source.incomplete_details_present === 'boolean' ? source.incomplete_details_present : undefined],
    ['usage', safeUsage(source.usage)],
    ['content_length', finiteInteger(source.content_length) ?? undefined],
    ['content_preview', diagnostics ? safeString(source.content_preview, DIAGNOSTIC_PREVIEW_LIMIT) || undefined : undefined],
    ['raw_keys', safeStringArray(source.raw_keys)],
    ['stream_tail', streamTail?.length ? streamTail : undefined],
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
      ['commit_status', safeString(summary.commit_status, 120) || undefined],
      ['chapter_updated_at', safeString(summary.chapter_updated_at, 80) || undefined],
      ['review_id', finiteInteger(summary.review_id) ?? undefined],
      ['recovered', typeof summary.recovered === 'boolean' ? summary.recovered : undefined],
      ['recovered_from_commit_marker', typeof summary.recovered_from_commit_marker === 'boolean' ? summary.recovered_from_commit_marker : undefined],
    ])
  }
  if (phase === 'post_quality') {
    return compactObject([
      ['reason', safeString(summary.reason, 160) || undefined],
      ['review_id', finiteInteger(summary.review_id) ?? undefined],
      ['score', finiteNumber(summary.score) ?? undefined],
      ['passed', typeof summary.passed === 'boolean' ? summary.passed : undefined],
      ['needs_revision', typeof summary.needs_revision === 'boolean' ? summary.needs_revision : undefined],
      ['reused', typeof summary.reused === 'boolean' ? summary.reused : undefined],
    ])
  }
  if (phase === 'sync_current_story_state') {
    return compactObject([
      ['reason', safeString(summary.reason, 160) || undefined],
      ['status', safeString(summary.status, 120) || undefined],
      ['reused', typeof summary.reused === 'boolean' ? summary.reused : undefined],
      ['receipt', safeReceipt(summary.receipt)],
    ])
  }
  if (phase === 'record_continuity_warning') {
    return compactObject([
      ['reason', safeString(summary.reason, 160) || undefined],
      ['convergence_review_id', finiteInteger(summary.convergence_review_id) ?? undefined],
      ['continuity_warning_review_id', finiteInteger(summary.continuity_warning_review_id) ?? undefined],
    ])
  }
  return compactObject([
    ['reason', safeString(summary.reason, 160) || undefined],
    ['prose_persisted', typeof summary.prose_persisted === 'boolean' ? summary.prose_persisted : undefined],
  ])
}

function safePhaseState(phase: EditorRevisionPhase, state: EditorRevisionPhaseState) {
  const summary = safePhaseSummary(phase, state.summary)
  return {
    status: state.status,
    attempt: Math.max(0, finiteInteger(state.attempt) ?? 0),
    ...(state.started_at ? { started_at: safeString(state.started_at, 80) } : {}),
    ...(state.completed_at ? { completed_at: safeString(state.completed_at, 80) } : {}),
    ...(state.error_code ? { error_code: safeString(state.error_code, 160) } : {}),
    ...(state.error ? { error: safeString(state.error, 500) } : {}),
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
    ['status', safeString(storyState.status, 120) || undefined],
    ['reused', typeof storyState.reused === 'boolean' ? storyState.reused : undefined],
    ['receipt', safeReceipt(storyState.receipt)],
    ['completed_receipt', safeReceipt(storyState.completed_receipt)],
  ]) || null
}

function safeWarnings(value: unknown): Array<{ code: string; message: string }> {
  if (!Array.isArray(value)) return []
  return value.slice(0, 100).flatMap(item => {
    const warning = parseJsonObject(item)
    if (!warning) return []
    const code = safeString(warning.code, 160)
    const message = safeString(warning.message, 500)
    return code && message ? [{ code, message }] : []
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
  const error = checkpoint.error
    ? { code: safeString(checkpoint.error.code, 160), message: safeString(checkpoint.error.message, 500) }
    : null

  return {
    id: run.id,
    run_type: 'editor_revision',
    status,
    phase: checkpoint.phase,
    phase_label: EDITOR_REVISION_PHASE_LABELS[checkpoint.phase],
    phases: Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [
      phase,
      safePhaseState(phase, checkpoint.phases[phase]),
    ])) as PublicEditorRevisionRun['phases'],
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
