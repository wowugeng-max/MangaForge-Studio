import { randomUUID } from 'crypto'
import {
  assertEditorRevisionWorkerLease,
  claimEditorRevisionRun,
  commitEditorRevisionChapter,
  EDITOR_REVISION_LEASE_MS,
  finishEditorRevisionCancellation,
  getEditorRevisionRun,
  getNovelChapter,
  listNovelChapters,
  listNovelReviews,
  recoverEditorRevisionRuns,
  requireCoherentEditorRevisionCheckpoint,
  renewEditorRevisionLease,
  writeEditorRevisionCheckpoint,
  type NovelChapterRecord,
  type NovelReviewRecord,
  type NovelRunRecord,
} from '../../novel'
import { jsonText } from '../../novel/json'
import { normalizeReviewRecord } from '../../novel/normalize'
import { reviewFromRow } from '../../novel/row-mappers'
import { withNovelDbWrite } from '../../novel/sql-rows'
import { executeNovelAgent } from '../../llm'
import { buildCurrentChapterPlanAlignment } from '../../novel-writing/chapter-plan-from-prose'
import { countProseChars } from '../../novel-writing/word-target'
import { compactPreparedStoryStateForRecovery } from '../../novel-writing-service/service/story-state-machine-update'
import { buildLLMResultDiagnostics, extractLLMText, getNovelPayload } from '../novel-route-utils'
import {
  buildChapterDeliveryRiskBrief,
  buildDeliveryRiskConvergenceReport,
} from './builders-delivery-risk-brief'
import {
  buildEditorRevisionAgentRequest,
  createProseQualityReview,
  type EditorRoutesContext,
} from './builders'
import {
  EDITOR_REVISION_PHASES,
  type EditorRevisionCheckpoint,
  type EditorRevisionPhase,
  type EditorRevisionRejectedCandidateEvidence,
  type EditorRevisionRunInput,
  type EditorRevisionRunStatus,
} from './editor-revision-contract'
import {
  admitRevisionCandidate,
  revisionTextHash,
  type RevisionCandidateAdmission,
} from './revision-candidate-admission'
import {
  applySingleChapterStoryState,
  prepareSingleChapterStoryState,
  storyStateReceiptKey,
  type SingleChapterStoryStateReceipt,
} from './single-chapter-story-state'

const LLM_TIMEOUT_MS = 180_000
const DIAGNOSTIC_CANDIDATE_LIMIT = 60_000
const TERMINAL_PHASE_STATES = new Set(['completed', 'skipped'])

type LeaseInput = { runId?: number; owner: string; leaseMs?: number }
type RenewLeaseInput = { runId: number; owner: string; leaseMs?: number }
type CheckpointWrite = {
  runId: number
  owner: string
  status: 'running' | 'completed' | 'failed'
  phase: EditorRevisionPhase
  checkpoint: EditorRevisionCheckpoint
  errorMessage?: string
}

type InvalidStateTerminalization = {
  projectId: number
  runId: number
  owner: string
  checkpoint: EditorRevisionCheckpoint
  errorCode: string
  now: string
}

async function terminalizeInvalidEditorRevisionState(
  workspace: string,
  input: InvalidStateTerminalization,
) {
  return withNovelDbWrite(workspace, db => {
    const current = db.query(`
      SELECT status, cancel_requested_at FROM runs
      WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
        AND status IN ('running', 'cancel_requested')
        AND lease_owner = ?
        AND lease_expires_at IS NOT NULL
        AND julianday(lease_expires_at) > julianday(?)
      LIMIT 1
    `).get(input.runId, input.projectId, input.owner, input.now) as any
    if (!current) throw revisionError('REVISION_LEASE_LOST')
    const canceled = current.status === 'cancel_requested' || Boolean(current.cancel_requested_at)
    const checkpoint = canceled
      ? canceledInvalidStateCheckpoint(input.checkpoint, input.now)
      : input.checkpoint
    const result = db.query(`
      UPDATE runs
      SET status = ?, output_ref = ?, error_message = ?, updated_at = ?,
        lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
        AND status IN ('running', 'cancel_requested')
        AND lease_owner = ?
        AND lease_expires_at IS NOT NULL
        AND julianday(lease_expires_at) > julianday(?)
    `).run(
      canceled ? 'canceled' : 'failed',
      JSON.stringify(checkpoint),
      canceled ? '' : input.errorCode,
      input.now,
      input.runId,
      input.projectId,
      input.owner,
      input.now,
    )
    if (!Number((result as any)?.changes || 0)) throw revisionError('REVISION_LEASE_LOST')
  }, 'terminalize-invalid-editor-revision-state')
}

function canceledInvalidStateCheckpoint(checkpoint: EditorRevisionCheckpoint, completedAt: string) {
  const next = structuredClone(checkpoint)
  const current = next.phases[next.phase]
  const { error: _error, error_code: _errorCode, ...preserved } = current
  next.phases[next.phase] = {
    ...preserved,
    status: 'canceled',
    attempt: Math.max(1, Number(current.attempt || 0)),
    completed_at: completedAt,
  }
  delete next.error
  return next
}

export type EditorRevisionWorkerDependencies = {
  claimRun: (workspace: string, input: LeaseInput) => Promise<NovelRunRecord | null>
  renewLease: (workspace: string, input: RenewLeaseInput) => Promise<boolean>
  getRun: (workspace: string, projectId: number, runId: number) => Promise<NovelRunRecord | null>
  recoverRuns: (workspace: string) => Promise<{ queued: number[]; failedLegacy: number[] }>
  writeCheckpoint: (workspace: string, input: CheckpointWrite) => Promise<NovelRunRecord>
  finishCancellation: (
    workspace: string,
    runId: number,
    owner: string,
    checkpoint: EditorRevisionCheckpoint,
  ) => Promise<NovelRunRecord>
  terminalizeInvalidState: typeof terminalizeInvalidEditorRevisionState
  getChapter: (workspace: string, chapterId: number, projectId: number) => Promise<NovelChapterRecord | null>
  listChapters: (workspace: string, projectId: number) => Promise<NovelChapterRecord[]>
  listReviews: (workspace: string, projectId: number) => Promise<NovelReviewRecord[]>
  findOrCreateReview: typeof findOrCreateEditorRevisionReview
  commitChapter: typeof commitEditorRevisionChapter
  executeRevision: typeof executeNovelAgent
  createQualityReview: typeof createProseQualityReview
  prepareStoryState: typeof prepareSingleChapterStoryState
  applyStoryState: typeof applySingleChapterStoryState
  admitCandidate: typeof admitRevisionCandidate
  now: () => string
  setInterval: (callback: () => void | Promise<void>, ms: number) => any
  clearInterval: (handle: any) => void
  setTimeout: (callback: () => void, ms: number) => any
  clearTimeout: (handle: any) => void
}

export type EditorRevisionWorker = {
  start(workspace: string): Promise<void>
  enqueue(runId: number): void
  cancel(runId: number): void
  stop(): Promise<void>
  waitForIdle(): Promise<void>
}

type LeaseState = { valid: boolean }

export type EditorRevisionReviewReceipt =
  | {
      kind: 'delivery_risk_convergence'
      sourceRunId: number
      candidateHash: string
      chapterId: number
    }
  | {
      kind: 'downstream_continuity_warning'
      sourceRunId: number
    }

export async function findOrCreateEditorRevisionReview(
  workspace: string,
  input: {
    data: Partial<NovelReviewRecord>
    receipt: EditorRevisionReviewReceipt
    workerLease: { owner: string }
  },
) {
  return withNovelDbWrite(workspace, db => {
    const record = normalizeReviewRecord(input.data)
    if (record.review_type !== input.receipt.kind) {
      throw new Error('editor revision review receipt kind mismatch')
    }
    assertEditorRevisionWorkerLease(db, {
      projectId: record.project_id,
      runId: input.receipt.sourceRunId,
      owner: input.workerLease.owner,
    })
    const select = `
      SELECT
        id,
        project_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_no') AS INTEGER) END AS chapter_no,
        review_type,
        status,
        summary,
        issues,
        payload,
        created_at
      FROM reviews
    `
    const existing = input.receipt.kind === 'delivery_risk_convergence'
      ? db.query(`${select}
          WHERE project_id = ?
            AND review_type = 'delivery_risk_convergence'
            AND json_valid(payload)
            AND json_type(payload, '$.source_run_id') = 'integer'
            AND CAST(json_extract(payload, '$.source_run_id') AS INTEGER) = ?
            AND json_type(payload, '$.candidate_hash') = 'text'
            AND json_extract(payload, '$.candidate_hash') = ?
            AND json_type(payload, '$.chapter_id') = 'integer'
            AND CAST(json_extract(payload, '$.chapter_id') AS INTEGER) = ?
          ORDER BY id DESC
          LIMIT 1
        `).get(
          record.project_id,
          input.receipt.sourceRunId,
          input.receipt.candidateHash,
          input.receipt.chapterId,
        ) as any
      : db.query(`${select}
          WHERE project_id = ?
            AND review_type = 'downstream_continuity_warning'
            AND json_valid(payload)
            AND json_type(payload, '$.source_run_id') = 'integer'
            AND CAST(json_extract(payload, '$.source_run_id') AS INTEGER) = ?
          ORDER BY id DESC
          LIMIT 1
        `).get(record.project_id, input.receipt.sourceRunId) as any
    if (existing) return reviewFromRow(existing)

    const result = db.query(`
      INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      record.project_id,
      record.review_type,
      record.status,
      record.summary || '',
      jsonText(record.issues || []),
      record.payload || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  }, 'find-or-create-editor-revision-review')
}

class StopProcessingError extends Error {
  constructor(public cause?: unknown) {
    super('stop processing this editor revision claim')
  }
}

function revisionError(code: string, message = code, details: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { code, ...details })
}

function errorCode(error: unknown, fallback = 'REVISION_WORKER_FAILED') {
  return String((error as any)?.code || fallback)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'editor revision failed')
}

function parseCheckpoint(value: unknown, runStatus?: string): EditorRevisionCheckpoint {
  return structuredClone(requireCoherentEditorRevisionCheckpoint(value, {
    runStatus: runStatus as EditorRevisionRunStatus | undefined,
  }))
}

function parseInput(value: unknown): EditorRevisionRunInput {
  let parsed = value
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    throw revisionError('REVISION_INPUT_INVALID', 'editor revision input is invalid')
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as any).schema_version !== 1) {
    throw revisionError('REVISION_INPUT_INVALID', 'editor revision input is invalid')
  }
  const input = parsed as EditorRevisionRunInput
  const integerFields = [
    input.project_id,
    input.chapter_id,
    input.chapter_no,
    input.review_id,
    input.source_char_count,
  ]
  const stringFields = [
    input.chapter_title,
    input.source_chapter_updated_at,
    input.source_text,
    input.source_text_hash,
    input.revision_mode,
    input.revision_strategy,
    input.user_prompt,
    input.created_at,
  ]
  const objectFields = [input.source_review, input.report, input.context_package]
  if (integerFields.some(field => !Number.isInteger(field))
    || stringFields.some(field => typeof field !== 'string')
    || objectFields.some(field => !field || typeof field !== 'object' || Array.isArray(field))
    || !input.source_text || !input.source_text_hash
    || revisionTextHash(input.source_text) !== input.source_text_hash
    || countProseChars(input.source_text) !== input.source_char_count
    || typeof input.auto_quality_check !== 'boolean'
    || typeof input.auto_story_state !== 'boolean'
    || (input.model_id !== undefined && !Number.isInteger(input.model_id))) {
    throw revisionError('REVISION_INPUT_INVALID', 'editor revision immutable source is incomplete')
  }
  return input
}

function parseReviewPayload(review: NovelReviewRecord | Record<string, unknown>) {
  const value = (review as any)?.payload
  if (value && typeof value === 'object') return value as Record<string, any>
  try {
    return JSON.parse(String(value || '{}')) as Record<string, any>
  } catch {
    return {}
  }
}

function signalReason(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : revisionError('REVISION_CANCELED', 'revision canceled')
}

export function throwIfRevisionCanceled(run: NovelRunRecord, signal: AbortSignal) {
  if (signal.aborted) throw signalReason(signal)
  if (run.status === 'cancel_requested' || run.cancel_requested_at) {
    throw revisionError('REVISION_CANCELED', 'revision canceled')
  }
}

function rejectedCandidateEvidence(result: any): EditorRevisionRejectedCandidateEvidence | null {
  const payload = getNovelPayload(result)
  const candidate = String(
    payload?.chapter_text
    || payload?.prose_chapters?.[0]?.chapter_text
    || extractLLMText(result)
    || '',
  )
  if (!candidate) return null
  const evidence: EditorRevisionRejectedCandidateEvidence = {
    hash: revisionTextHash(candidate),
    char_count: countProseChars(candidate),
  }
  if (candidate.length <= DIAGNOSTIC_CANDIDATE_LIMIT) {
    evidence.text = candidate
  } else {
    evidence.head_preview = candidate.slice(0, 2_000)
    evidence.tail_preview = candidate.slice(-2_000)
  }
  return evidence
}

function compactConvergenceReport(report: Record<string, any>) {
  return {
    status: report.status,
    label: report.label,
    before_count: Number(report.before_count || 0),
    after_count: Number(report.after_count || 0),
    resolved_count: Number(report.resolved_count || 0),
    residual_count: Number(report.residual_count || 0),
    added_count: Number(report.added_count || 0),
    next_actions: Array.isArray(report.next_actions) ? report.next_actions.slice(0, 3) : [],
  }
}

function warningOnce(checkpoint: EditorRevisionCheckpoint, code: string, message: string) {
  if (!checkpoint.warnings.some(item => item.code === code)) checkpoint.warnings.push({ code, message })
}

function phaseAttempt(checkpoint: EditorRevisionCheckpoint, phase: EditorRevisionPhase) {
  return Math.max(0, Number(checkpoint.phases[phase].attempt || 0)) + 1
}

export function createEditorRevisionWorker(
  ctx: EditorRoutesContext,
  overrides: Partial<EditorRevisionWorkerDependencies> = {},
): EditorRevisionWorker {
  const deps: EditorRevisionWorkerDependencies = {
    claimRun: claimEditorRevisionRun,
    renewLease: renewEditorRevisionLease,
    getRun: getEditorRevisionRun,
    recoverRuns: recoverEditorRevisionRuns,
    writeCheckpoint: writeEditorRevisionCheckpoint,
    finishCancellation: finishEditorRevisionCancellation,
    terminalizeInvalidState: terminalizeInvalidEditorRevisionState,
    getChapter: getNovelChapter,
    listChapters: listNovelChapters,
    listReviews: listNovelReviews,
    findOrCreateReview: findOrCreateEditorRevisionReview,
    commitChapter: commitEditorRevisionChapter,
    executeRevision: ctx.executeAgent || executeNovelAgent,
    createQualityReview: createProseQualityReview,
    prepareStoryState: prepareSingleChapterStoryState,
    applyStoryState: applySingleChapterStoryState,
    admitCandidate: admitRevisionCandidate,
    now: () => new Date().toISOString(),
    setInterval: (callback, ms) => setInterval(callback, ms),
    clearInterval: handle => clearInterval(handle),
    setTimeout: (callback, ms) => setTimeout(callback, ms),
    clearTimeout: handle => clearTimeout(handle),
    ...overrides,
  }
  const leaseOwner = randomUUID()
  const controllers = new Map<number, AbortController>()
  const queue = new Set<number>()
  const idleWaiters = new Set<() => void>()
  let activeWorkspace: string | null = null
  let drainPromise: Promise<void> | null = null
  let started = false
  let stopping = false

  function notifyIdle() {
    if (queue.size || drainPromise) return
    for (const resolve of idleWaiters) resolve()
    idleWaiters.clear()
  }

  async function loadActiveRun(input: EditorRevisionRunInput, runId: number, controller: AbortController, lease: LeaseState) {
    if (!lease.valid) throw revisionError('REVISION_LEASE_LOST')
    const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId)
    if (!fresh) throw revisionError('REVISION_RUN_NOT_FOUND')
    throwIfRevisionCanceled(fresh, controller.signal)
    return fresh
  }

  async function writeCheckpoint(
    input: EditorRevisionRunInput,
    runId: number,
    phase: EditorRevisionPhase,
    checkpoint: EditorRevisionCheckpoint,
    status: 'running' | 'completed' | 'failed' = 'running',
    error?: string,
    lease?: LeaseState,
  ) {
    if (lease && !lease.valid) throw revisionError('REVISION_LEASE_LOST')
    try {
      return await deps.writeCheckpoint(activeWorkspace!, {
        runId,
        owner: leaseOwner,
        status,
        phase,
        checkpoint,
        errorMessage: error,
      })
    } catch (writeError) {
      if (errorCode(writeError) !== 'REVISION_CANCELED') throw writeError
      const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId).catch(() => null)
      const leaseExpiresAt = fresh?.lease_expires_at ? new Date(fresh.lease_expires_at).getTime() : Number.NaN
      const ownedLiveLease = fresh?.lease_owner === leaseOwner
        && Number.isFinite(leaseExpiresAt)
        && leaseExpiresAt > new Date(deps.now()).getTime()
      const cancellationRequested = fresh?.status === 'cancel_requested' || Boolean(fresh?.cancel_requested_at)
      if (!ownedLiveLease || !cancellationRequested) throw writeError
      await finishCanceled(input, runId, checkpoint)
      throw new StopProcessingError(revisionError('REVISION_CANCELED', 'revision canceled'))
    }
  }

  async function phaseCheckpoint(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const fresh = await loadActiveRun(input, runId, controller, lease)
    return { fresh, checkpoint: parseCheckpoint(fresh.output_ref, fresh.status) }
  }

  async function markRunning(
    input: EditorRevisionRunInput,
    runId: number,
    phase: EditorRevisionPhase,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const loaded = await phaseCheckpoint(input, runId, controller, lease)
    const checkpoint = loaded.checkpoint
    if (TERMINAL_PHASE_STATES.has(checkpoint.phases[phase].status)) return checkpoint
    checkpoint.phase = phase
    checkpoint.phases[phase] = {
      status: 'running',
      attempt: phaseAttempt(checkpoint, phase),
      started_at: deps.now(),
    }
    await writeCheckpoint(input, runId, phase, checkpoint, 'running', undefined, lease)
    return checkpoint
  }

  async function markCompleted(
    input: EditorRevisionRunInput,
    runId: number,
    phase: EditorRevisionPhase,
    controller: AbortController,
    lease: LeaseState,
    mutate: (checkpoint: EditorRevisionCheckpoint) => void = () => {},
    summary?: Record<string, unknown>,
    status: 'running' | 'completed' = 'running',
  ) {
    const loaded = await phaseCheckpoint(input, runId, controller, lease)
    const checkpoint = loaded.checkpoint
    checkpoint.phase = phase
    mutate(checkpoint)
    checkpoint.phases[phase] = {
      ...checkpoint.phases[phase],
      status: 'completed',
      attempt: Math.max(1, Number(checkpoint.phases[phase].attempt || 0)),
      completed_at: deps.now(),
      ...(summary ? { summary } : {}),
    }
    if (phase === 'completed') checkpoint.completed_at = deps.now()
    await writeCheckpoint(input, runId, phase, checkpoint, status, undefined, lease)
    return checkpoint
  }

  async function markSkipped(
    input: EditorRevisionRunInput,
    runId: number,
    phase: EditorRevisionPhase,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const loaded = await phaseCheckpoint(input, runId, controller, lease)
    const checkpoint = loaded.checkpoint
    if (checkpoint.phases[phase].status === 'skipped') return checkpoint
    checkpoint.phase = phase
    checkpoint.phases[phase] = {
      status: 'skipped',
      attempt: Math.max(1, phaseAttempt(checkpoint, phase)),
      started_at: deps.now(),
      completed_at: deps.now(),
      summary: { reason: 'disabled_by_request' },
    }
    await writeCheckpoint(input, runId, phase, checkpoint, 'running', undefined, lease)
    return checkpoint
  }

  async function finishCanceled(
    input: EditorRevisionRunInput,
    runId: number,
    checkpoint?: EditorRevisionCheckpoint,
  ) {
    const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId)
    if (!fresh?.cancel_requested_at && fresh?.status !== 'cancel_requested') return
    const next = checkpoint ? structuredClone(checkpoint) : parseCheckpoint(fresh.output_ref, fresh.status)
    const state = next.phases[next.phase]
    if (!TERMINAL_PHASE_STATES.has(state.status)) {
      next.phases[next.phase] = {
        ...state,
        status: 'canceled',
        attempt: Math.max(1, Number(state.attempt || 0)),
        completed_at: deps.now(),
      }
    }
    delete next.error
    await deps.finishCancellation(activeWorkspace!, runId, leaseOwner, next)
  }

  async function failRun(
    input: EditorRevisionRunInput,
    runId: number,
    error: unknown,
    diagnostics?: Record<string, unknown>,
  ) {
    const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId)
    if (!fresh) return
    if (['completed', 'failed', 'canceled'].includes(fresh.status)) return
    let checkpoint: EditorRevisionCheckpoint
    try {
      checkpoint = parseCheckpoint(fresh.output_ref, fresh.status)
    } catch (checkpointError) {
      await terminalizeClaimedRun(fresh, checkpointError, input)
      return
    }
    if (fresh.status === 'cancel_requested' || fresh.cancel_requested_at) {
      await finishCanceled(input, runId, checkpoint)
      return
    }
    const phase = checkpoint.phase
    const code = errorCode(error)
    const message = errorMessage(error)
    checkpoint.phases[phase] = {
      ...checkpoint.phases[phase],
      status: 'failed',
      attempt: Math.max(1, Number(checkpoint.phases[phase].attempt || 0)),
      completed_at: deps.now(),
      error_code: code,
      error: message,
    }
    checkpoint.error = { code, message, ...(diagnostics ? { diagnostics } : {}) }
    await writeCheckpoint(input, runId, phase, checkpoint, 'failed', code)
  }

  async function failedCheckpoint(
    run: NovelRunRecord,
    error: unknown,
    input?: EditorRevisionRunInput,
  ) {
    let checkpoint: EditorRevisionCheckpoint
    try {
      checkpoint = parseCheckpoint(run.output_ref)
    } catch {
      checkpoint = {
        schema_version: 1,
        phase: 'generate_candidate',
        phases: Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [
          phase,
          { status: 'pending', attempt: 0 },
        ])) as EditorRevisionCheckpoint['phases'],
        prose_persisted: false,
        warnings: [],
      }
      if (input) {
        const chapter = await deps.getChapter(activeWorkspace!, input.chapter_id, input.project_id).catch(() => null)
        const marker = chapter?.raw_payload?.editor_revision_commit
        const markerHash = String(marker?.candidate_hash || '')
        const liveText = String(chapter?.chapter_text || '')
        const liveHash = liveText ? revisionTextHash(liveText) : ''
        const commitMatches = Number(marker?.run_id || 0) === run.id
          && String(marker?.source_hash || '') === input.source_text_hash
          && Boolean(markerHash)
          && markerHash === liveHash
        if (chapter && commitMatches) {
          const completedAt = String(marker?.committed_at || chapter.updated_at || deps.now())
          const reviews = await deps.listReviews(activeWorkspace!, input.project_id).catch(() => [])
          const receipt = reviews.find(review => {
            if (review.review_type !== 'editor_revision') return false
            const payload = parseReviewPayload(review)
            return Number(payload.source_run_id || 0) === run.id
              && Number(payload.chapter_id || 0) === input.chapter_id
              && String(payload.candidate_hash || '') === markerHash
          })
          checkpoint.phase = 'post_quality'
          for (const phase of ['generate_candidate', 'admit_candidate', 'persist_chapter'] as const) {
            checkpoint.phases[phase] = {
              status: 'completed',
              attempt: 1,
              completed_at: completedAt,
              summary: { recovered_from_commit_marker: true },
            }
          }
          checkpoint.candidate = {
            text: liveText,
            hash: liveHash,
            char_count: countProseChars(liveText),
            applied_patches: [],
            diagnostics: { recovered_from_commit_marker: true },
          }
          checkpoint.prose_persisted = true
          checkpoint.committed_chapter_updated_at = chapter.updated_at
          if (receipt?.id) checkpoint.editor_revision_review_id = receipt.id
        }
      }
    }
    const code = errorCode(error)
    const message = errorMessage(error)
    const currentIndex = EDITOR_REVISION_PHASES.indexOf(checkpoint.phase)
    const nextIncomplete = TERMINAL_PHASE_STATES.has(checkpoint.phases[checkpoint.phase].status)
      ? EDITOR_REVISION_PHASES.slice(currentIndex + 1)
        .find(phase => !TERMINAL_PHASE_STATES.has(checkpoint.phases[phase].status))
      : undefined
    if (nextIncomplete) checkpoint.phase = nextIncomplete
    const phase = checkpoint.phase
    checkpoint.phases[phase] = {
      ...checkpoint.phases[phase],
      status: 'failed',
      attempt: Math.max(1, Number(checkpoint.phases[phase].attempt || 0)),
      completed_at: deps.now(),
      error_code: code,
      error: message,
    }
    checkpoint.error = { code, message }
    return checkpoint
  }

  async function terminalizeClaimedRun(
    run: NovelRunRecord,
    error: unknown,
    input?: EditorRevisionRunInput,
  ) {
    const code = errorCode(error)
    const current = await deps.getRun(activeWorkspace!, run.project_id, run.id).catch(() => null) || run
    await deps.terminalizeInvalidState(activeWorkspace!, {
      projectId: current.project_id,
      runId: current.id,
      owner: leaseOwner,
      checkpoint: await failedCheckpoint(current, error, input),
      errorCode: code,
      now: deps.now(),
    })
  }

  async function withLlmTimeout<T>(controller: AbortController, operation: () => Promise<T>): Promise<T> {
    if (controller.signal.aborted) throw signalReason(controller.signal)
    let removeAbortListener = () => {}
    const aborted = new Promise<never>((_resolve, reject) => {
      const onAbort = () => reject(signalReason(controller.signal))
      controller.signal.addEventListener('abort', onAbort, { once: true })
      removeAbortListener = () => controller.signal.removeEventListener('abort', onAbort)
    })
    const timer = deps.setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(revisionError('REVISION_LLM_TIMEOUT', 'editor revision model call timed out'))
      }
    }, LLM_TIMEOUT_MS)
    try {
      return await Promise.race([operation(), aborted])
    } finally {
      removeAbortListener()
      deps.clearTimeout(timer)
    }
  }

  async function recoverCommittedChapter(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ) {
    if (!lease.valid) throw revisionError('REVISION_LEASE_LOST')
    const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId)
    if (!fresh) throw revisionError('REVISION_RUN_NOT_FOUND')
    const checkpoint = parseCheckpoint(fresh.output_ref, fresh.status)
    const chapter = await deps.getChapter(activeWorkspace!, input.chapter_id, input.project_id)
    if (!chapter) throw revisionError('CHAPTER_NOT_FOUND')
    const marker = chapter.raw_payload?.editor_revision_commit
    const markerRunId = Number(marker?.run_id || 0)
    const liveCommitMatches = Boolean(
      checkpoint.candidate
      && markerRunId === runId
      && String(marker?.source_hash || '') === input.source_text_hash
      && String(marker?.candidate_hash || '') === checkpoint.candidate.hash
      && revisionTextHash(String(chapter.chapter_text || '')) === checkpoint.candidate.hash,
    )
    const wasPersisted = checkpoint.prose_persisted
    if (liveCommitMatches && !wasPersisted) {
      const reviews = await deps.listReviews(activeWorkspace!, input.project_id)
      const receipt = reviews.find(review => {
        if (review.review_type !== 'editor_revision') return false
        const payload = parseReviewPayload(review)
        return Number(payload.source_run_id || 0) === runId
          && Number(payload.chapter_id || 0) === input.chapter_id
          && String(payload.candidate_hash || '') === checkpoint.candidate!.hash
      })
      checkpoint.phase = 'persist_chapter'
      checkpoint.prose_persisted = true
      checkpoint.committed_chapter_updated_at = chapter.updated_at
      if (receipt?.id) checkpoint.editor_revision_review_id = receipt.id
      checkpoint.phases.persist_chapter = {
        status: 'completed',
        attempt: Math.max(1, Number(checkpoint.phases.persist_chapter.attempt || 0)),
        completed_at: deps.now(),
        summary: { commit_status: 'already_committed', recovered: true },
      }
    }
    const cancellationRequested = fresh.status === 'cancel_requested' || Boolean(fresh.cancel_requested_at)
    if (cancellationRequested) {
      if (liveCommitMatches) {
        await finishCanceled(input, runId, checkpoint)
        throw new StopProcessingError(revisionError('REVISION_CANCELED', 'revision canceled'))
      }
      throw revisionError('REVISION_CANCELED', 'revision canceled')
    }
    throwIfRevisionCanceled(fresh, controller.signal)
    if (markerRunId > runId) throw revisionError('REVISION_RUN_SUPERSEDED')
    if (wasPersisted) {
      if (!liveCommitMatches) throw revisionError('REVISION_RUN_SUPERSEDED')
      return checkpoint
    }
    if (markerRunId !== runId) return checkpoint
    if (!liveCommitMatches) {
      throw revisionError('REVISION_RUN_SUPERSEDED')
    }
    try {
      const recovered = await deps.commitChapter(activeWorkspace!, {
        projectId: input.project_id,
        chapterId: input.chapter_id,
        runId,
        sourceTextHash: input.source_text_hash,
        candidateText: checkpoint.candidate.text,
        candidateHash: checkpoint.candidate.hash,
        chapterPatch: {},
        reviewPayload: { source_review_id: input.review_id },
        workerLease: { owner: leaseOwner },
      })
      checkpoint.committed_chapter_updated_at = recovered.chapter.updated_at
      checkpoint.editor_revision_review_id = recovered.review.id
      checkpoint.phases.persist_chapter.summary = { commit_status: recovered.status, recovered: true }
    } catch (error) {
      if (errorCode(error) === 'REVISION_CANCELED') {
        await finishCanceled(input, runId, checkpoint)
        throw new StopProcessingError(error)
      }
      throw error
    }
    try {
      await writeCheckpoint(input, runId, 'persist_chapter', checkpoint, 'running', undefined, lease)
    } catch (error) {
      const after = await deps.getRun(activeWorkspace!, input.project_id, runId).catch(() => null)
      if (after?.status === 'cancel_requested' || after?.cancel_requested_at) {
        await finishCanceled(input, runId, checkpoint)
        throw new StopProcessingError(revisionError('REVISION_CANCELED', 'revision canceled'))
      }
      throw new StopProcessingError(error)
    }
    return checkpoint
  }

  async function generateAndAdmit(
    input: EditorRevisionRunInput,
    runId: number,
    project: any,
    controller: AbortController,
    lease: LeaseState,
  ) {
    let loaded = await phaseCheckpoint(input, runId, controller, lease)
    if (loaded.checkpoint.candidate && loaded.checkpoint.phases.admit_candidate.status === 'completed') {
      return loaded.checkpoint
    }
    await markRunning(input, runId, 'generate_candidate', controller, lease)
    const request = buildEditorRevisionAgentRequest(ctx, project, input)
    const result = await withLlmTimeout(controller, () => deps.executeRevision('prose-agent', project, {
      task: request.prompt,
    }, {
      activeWorkspace: activeWorkspace!,
      modelId: input.model_id ? String(input.model_id) : undefined,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      responseMode: 'stream',
      skipMemory: true,
      signal: controller.signal,
      timeoutMs: LLM_TIMEOUT_MS,
      maxRetries: 1,
    }))
    await markCompleted(
      input,
      runId,
      'generate_candidate',
      controller,
      lease,
      () => {},
      { diagnostics: buildLLMResultDiagnostics(result) },
    )
    await markRunning(input, runId, 'admit_candidate', controller, lease)
    let admitted: RevisionCandidateAdmission
    try {
      admitted = deps.admitCandidate({ sourceText: input.source_text, result })
    } catch (error) {
      const rejected = rejectedCandidateEvidence(result)
      const diagnostics = {
        ...((error as any)?.diagnostics || {}),
        ...(rejected ? { rejected_candidate: rejected } : {}),
      }
      await failRun(input, runId, error, diagnostics)
      throw new StopProcessingError(error)
    }
    loaded = await phaseCheckpoint(input, runId, controller, lease)
    const checkpoint = loaded.checkpoint
    checkpoint.phase = 'admit_candidate'
    checkpoint.candidate = {
      text: admitted.chapterText,
      hash: admitted.candidateHash,
      char_count: admitted.candidateCharCount,
      applied_patches: admitted.appliedPatches,
      diagnostics: admitted.diagnostics,
    }
    checkpoint.phases.admit_candidate = {
      ...checkpoint.phases.admit_candidate,
      status: 'completed',
      completed_at: deps.now(),
      summary: admitted.diagnostics,
    }
    try {
      await writeCheckpoint(input, runId, 'admit_candidate', checkpoint, 'running', undefined, lease)
    } catch (error) {
      const after = await deps.getRun(activeWorkspace!, input.project_id, runId).catch(() => null)
      const durable = after ? parseCheckpoint(after.output_ref, after.status) : null
      if (durable?.candidate?.hash === admitted.candidateHash
        && durable.phases.admit_candidate.status === 'completed') {
        throw new StopProcessingError(error)
      }
      throw revisionError(
        'REVISION_CANDIDATE_CHECKPOINT_FAILED',
        'full admitted candidate could not be durably checkpointed',
        { cause: error },
      )
    }
    return checkpoint
  }

  async function persistChapter(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ): Promise<EditorRevisionCheckpoint> {
    let loaded = await phaseCheckpoint(input, runId, controller, lease)
    if (loaded.checkpoint.prose_persisted) return loaded.checkpoint
    const checkpoint = await markRunning(input, runId, 'persist_chapter', controller, lease)
    if (!checkpoint.candidate) throw revisionError('REVISION_CANDIDATE_MISSING')
    const chapters = await deps.listChapters(activeWorkspace!, input.project_id)
    const current = chapters.find(item => Number(item.id) === input.chapter_id)
    if (!current) throw revisionError('CHAPTER_NOT_FOUND')
    const candidateChapter = { ...current, chapter_text: checkpoint.candidate.text }
    const alignment = buildCurrentChapterPlanAlignment(chapters, candidateChapter, {
      force: true,
      source: input.revision_strategy === 'structural_rewrite'
        ? 'post_structural_revision'
        : 'post_editor_revision',
    })
    await loadActiveRun(input, runId, controller, lease)
    const committed = await deps.commitChapter(activeWorkspace!, {
      projectId: input.project_id,
      chapterId: input.chapter_id,
      runId,
      sourceTextHash: input.source_text_hash,
      candidateText: checkpoint.candidate.text,
      candidateHash: checkpoint.candidate.hash,
      chapterPatch: alignment.patch || {},
      reviewPayload: {
        source_review_id: input.review_id,
        requested_revision_mode: input.revision_mode,
        revision_strategy: input.revision_strategy,
        applied_patches: checkpoint.candidate.applied_patches,
        candidate_diagnostics: checkpoint.candidate.diagnostics,
      },
      workerLease: { owner: leaseOwner },
    })
    checkpoint.phase = 'persist_chapter'
    checkpoint.prose_persisted = true
    checkpoint.committed_chapter_updated_at = committed.chapter.updated_at
    checkpoint.editor_revision_review_id = committed.review.id
    checkpoint.phases.persist_chapter = {
      ...checkpoint.phases.persist_chapter,
      status: 'completed',
      completed_at: deps.now(),
      summary: {
        commit_status: committed.status,
        chapter_updated_at: committed.chapter.updated_at,
        review_id: committed.review.id,
      },
    }
    try {
      const fresh = await deps.getRun(activeWorkspace!, input.project_id, runId)
      if (fresh) throwIfRevisionCanceled(fresh, controller.signal)
      await writeCheckpoint(input, runId, 'persist_chapter', checkpoint, 'running', undefined, lease)
    } catch (error) {
      if (errorCode(error) === 'REVISION_CANCELED') {
        await finishCanceled(input, runId, checkpoint)
        throw new StopProcessingError(error)
      }
      throw new StopProcessingError(error)
    }
    loaded = await phaseCheckpoint(input, runId, controller, lease)
    return loaded.checkpoint
  }

  async function runPostQuality(
    input: EditorRevisionRunInput,
    runId: number,
    project: any,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const current = (await phaseCheckpoint(input, runId, controller, lease)).checkpoint
    if (TERMINAL_PHASE_STATES.has(current.phases.post_quality.status)) return current
    if (!input.auto_quality_check) return markSkipped(input, runId, 'post_quality', controller, lease)
    const checkpoint = await markRunning(input, runId, 'post_quality', controller, lease)
    if (!checkpoint.candidate) throw revisionError('REVISION_CANDIDATE_MISSING')
    const chapter = await deps.getChapter(activeWorkspace!, input.chapter_id, input.project_id)
    if (!chapter) throw revisionError('CHAPTER_NOT_FOUND')
    const quality = await withLlmTimeout(controller, () => deps.createQualityReview(ctx, activeWorkspace!, project, chapter, {
      source: 'post_revision',
      source_review_id: input.review_id,
      source_run_id: runId,
      candidate_hash: checkpoint.candidate!.hash,
      current_chapter_only: true,
      signal: controller.signal,
      timeoutMs: LLM_TIMEOUT_MS,
      maxRetries: 1,
    }))
    const needsRevision = quality?.review?.needs_revision === true
    return markCompleted(input, runId, 'post_quality', controller, lease, next => {
      next.post_quality = {
        review_id: quality?.saved?.id || null,
        score: quality?.review?.score ?? null,
        passed: quality?.review?.passed !== false,
        needs_revision: needsRevision,
        reused: quality?.reused === true,
      }
      if (needsRevision) {
        warningOnce(next, 'POST_QUALITY_NEEDS_REVISION', '修订后质检仍建议人工复查')
      }
    }, {
      review_id: quality?.saved?.id || null,
      needs_revision: needsRevision,
      reused: quality?.reused === true,
    })
  }

  function preparedForApply(prepared: any, receipt: SingleChapterStoryStateReceipt) {
    return {
      ...prepared,
      receipt_binding: {
        key: storyStateReceiptKey(receipt),
        chapter_id: receipt.chapter_id,
        candidate_hash: receipt.candidate_hash,
        source_run_id: receipt.source_run_id,
      },
    }
  }

  async function runStoryState(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ) {
    let checkpoint = (await phaseCheckpoint(input, runId, controller, lease)).checkpoint
    if (TERMINAL_PHASE_STATES.has(checkpoint.phases.sync_current_story_state.status)) return checkpoint
    if (!input.auto_story_state) return markSkipped(input, runId, 'sync_current_story_state', controller, lease)
    checkpoint = await markRunning(input, runId, 'sync_current_story_state', controller, lease)
    if (!checkpoint.candidate) throw revisionError('REVISION_CANDIDATE_MISSING')
    const receipt: SingleChapterStoryStateReceipt = {
      source_run_id: runId,
      candidate_hash: checkpoint.candidate.hash,
      chapter_id: input.chapter_id,
    }
    let prepared = (checkpoint.story_state as any)?.prepared || null
    let completedReceipt = (checkpoint.story_state as any)?.completed_receipt || null
    let reusedPrepare = Boolean(prepared || completedReceipt)
    if (!prepared && !completedReceipt) {
      const preparedResult = await withLlmTimeout(controller, () => deps.prepareStoryState(ctx, {
        workspace: activeWorkspace!,
        projectId: input.project_id,
        chapterId: input.chapter_id,
        modelId: input.model_id,
        receipt,
        signal: controller.signal,
        timeoutMs: LLM_TIMEOUT_MS,
        maxRetries: 1,
      }))
      reusedPrepare = preparedResult.reused
      completedReceipt = preparedResult.completedReceipt || null
      prepared = preparedResult.prepared
        ? compactPreparedStoryStateForRecovery(preparedResult.prepared as any)
        : null
      const loaded = await phaseCheckpoint(input, runId, controller, lease)
      checkpoint = loaded.checkpoint
      checkpoint.story_state = completedReceipt
        ? { status: 'completed', completed_receipt: completedReceipt, receipt, reused: true }
        : { status: 'prepared', prepared, receipt, reused: reusedPrepare }
      checkpoint.phases.sync_current_story_state.summary = {
        status: completedReceipt ? 'completed' : 'prepared',
        receipt,
        reused: reusedPrepare,
      }
      try {
        await writeCheckpoint(input, runId, 'sync_current_story_state', checkpoint, 'running', undefined, lease)
      } catch (error) {
        throw new StopProcessingError(error)
      }
    }
    if (completedReceipt) {
      return markCompleted(input, runId, 'sync_current_story_state', controller, lease, next => {
        next.story_state = { status: 'completed', receipt: completedReceipt, reused: true }
      }, { status: 'completed', reused: true })
    }
    await loadActiveRun(input, runId, controller, lease)
    const applied = await withLlmTimeout(controller, () => deps.applyStoryState(ctx, {
      workspace: activeWorkspace!,
      projectId: input.project_id,
      chapterId: input.chapter_id,
      modelId: input.model_id,
      receipt,
      prepared: preparedForApply(prepared, receipt),
      signal: controller.signal,
      timeoutMs: LLM_TIMEOUT_MS,
      maxRetries: 1,
    }))
    return markCompleted(input, runId, 'sync_current_story_state', controller, lease, next => {
      next.story_state = {
        status: 'completed',
        prepared,
        receipt: applied.receipt,
        reused: applied.reused,
      }
    }, { status: 'completed', reused: applied.reused })
  }

  async function findOrCreateConvergenceReview(
    input: EditorRevisionRunInput,
    runId: number,
    checkpoint: EditorRevisionCheckpoint,
    chapter: NovelChapterRecord,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const candidateHash = checkpoint.candidate!.hash
    const reviews = await deps.listReviews(activeWorkspace!, input.project_id)
    const sourceChapter = { ...chapter, chapter_text: input.source_text }
    const sourceReview = input.source_review?.review_type
      ? input.source_review
      : {
          review_type: 'prose_quality',
          payload: JSON.stringify(input.source_review || {}),
        }
    const before = buildChapterDeliveryRiskBrief(sourceChapter, [sourceReview])
    const after = buildChapterDeliveryRiskBrief(chapter, reviews)
    const report = buildDeliveryRiskConvergenceReport({
      chapter,
      sourceReviewId: checkpoint.editor_revision_review_id,
      before,
      after,
    })
    await loadActiveRun(input, runId, controller, lease)
    const review = await deps.findOrCreateReview(activeWorkspace!, {
      data: {
        project_id: input.project_id,
        review_type: 'delivery_risk_convergence',
        status: report.status === 'cleared' || report.status === 'improved' ? 'ok' : 'warn',
        summary: `${report.label}，残留 ${report.residual_count}`,
        issues: report.next_actions,
        payload: JSON.stringify({
          source_run_id: runId,
          candidate_hash: candidateHash,
          chapter_id: input.chapter_id,
          chapter_no: input.chapter_no,
          delivery_risk_convergence: report,
        }),
      },
      receipt: {
        kind: 'delivery_risk_convergence',
        sourceRunId: runId,
        candidateHash,
        chapterId: input.chapter_id,
      },
      workerLease: { owner: leaseOwner },
    })
    return {
      review,
      report: parseReviewPayload(review).delivery_risk_convergence || report,
    }
  }

  async function findOrCreateContinuityWarning(
    input: EditorRevisionRunInput,
    runId: number,
    checkpoint: EditorRevisionCheckpoint,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const chapters = await deps.listChapters(activeWorkspace!, input.project_id)
    const following = chapters
      .filter(chapter => chapter.chapter_no > input.chapter_no && String(chapter.chapter_text || '').trim())
      .sort((left, right) => left.chapter_no - right.chapter_no)
    if (!following.length) return null
    const payload = {
      source_run_id: runId,
      chapter_id: input.chapter_id,
      chapter_no: input.chapter_no,
      source_hash: input.source_text_hash,
      candidate_hash: checkpoint.candidate!.hash,
      following_written_range: {
        first: following[0].chapter_no,
        last: following.at(-1)!.chapter_no,
        count: following.length,
      },
      status: 'manual_review_recommended',
    }
    await loadActiveRun(input, runId, controller, lease)
    return deps.findOrCreateReview(activeWorkspace!, {
      data: {
        project_id: input.project_id,
        review_type: 'downstream_continuity_warning',
        status: 'warn',
        summary: `第${input.chapter_no}章修订后，后续已写章节建议人工复查`,
        issues: ['后续连续性可能受当前章修订影响，请人工复查。'],
        payload: JSON.stringify(payload),
      },
      receipt: {
        kind: 'downstream_continuity_warning',
        sourceRunId: runId,
      },
      workerLease: { owner: leaseOwner },
    })
  }

  async function recordDeterministicReviews(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ) {
    let checkpoint = (await phaseCheckpoint(input, runId, controller, lease)).checkpoint
    if (TERMINAL_PHASE_STATES.has(checkpoint.phases.record_continuity_warning.status)) return checkpoint
    checkpoint = await markRunning(input, runId, 'record_continuity_warning', controller, lease)
    if (!checkpoint.candidate) throw revisionError('REVISION_CANDIDATE_MISSING')
    const chapter = await deps.getChapter(activeWorkspace!, input.chapter_id, input.project_id)
    if (!chapter) throw revisionError('CHAPTER_NOT_FOUND')
    const convergence = await findOrCreateConvergenceReview(input, runId, checkpoint, chapter, controller, lease)
    const continuity = await findOrCreateContinuityWarning(input, runId, checkpoint, controller, lease)
    return markCompleted(input, runId, 'record_continuity_warning', controller, lease, next => {
      next.delivery_risk_convergence = {
        review_id: convergence.review.id,
        ...compactConvergenceReport(convergence.report),
      }
      if (continuity) next.continuity_warning_review_id = continuity.id
    }, {
      convergence_review_id: convergence.review.id,
      continuity_warning_review_id: continuity?.id || null,
    })
  }

  async function completeRun(
    input: EditorRevisionRunInput,
    runId: number,
    controller: AbortController,
    lease: LeaseState,
  ) {
    const current = (await phaseCheckpoint(input, runId, controller, lease)).checkpoint
    if (current.phases.completed.status === 'completed') return current
    await markRunning(input, runId, 'completed', controller, lease)
    return markCompleted(
      input,
      runId,
      'completed',
      controller,
      lease,
      () => {},
      { prose_persisted: true },
      'completed',
    )
  }

  async function processClaim(run: NovelRunRecord) {
    const controller = new AbortController()
    const lease: LeaseState = { valid: true }
    controllers.set(run.id, controller)
    const heartbeat = deps.setInterval(async () => {
      if (!lease.valid || controller.signal.aborted) return
      try {
        const renewed = await deps.renewLease(activeWorkspace!, {
          runId: run.id,
          owner: leaseOwner,
          leaseMs: EDITOR_REVISION_LEASE_MS,
        })
        if (!renewed) {
          lease.valid = false
          controller.abort(revisionError('REVISION_LEASE_LOST'))
        }
      } catch (error) {
        lease.valid = false
        controller.abort(revisionError('REVISION_LEASE_LOST', errorMessage(error)))
      }
    }, EDITOR_REVISION_LEASE_MS / 3)
    let input: EditorRevisionRunInput | null = null
    try {
      const parsedInput = parseInput(run.input_ref)
      if (parsedInput.project_id !== run.project_id
        || run.scope_key !== `chapter:${parsedInput.chapter_id}`) {
        throw revisionError('REVISION_INPUT_INVALID', 'editor revision input does not match the claimed run scope')
      }
      input = parsedInput
      const project = await ctx.getProject(activeWorkspace!, input.project_id)
      if (!project) throw revisionError('PROJECT_NOT_FOUND')
      await recoverCommittedChapter(input, run.id, controller, lease)
      await generateAndAdmit(input, run.id, project, controller, lease)
      await persistChapter(input, run.id, controller, lease)
      await runPostQuality(input, run.id, project, controller, lease)
      await runStoryState(input, run.id, controller, lease)
      await recordDeterministicReviews(input, run.id, controller, lease)
      await completeRun(input, run.id, controller, lease)
    } catch (error) {
      if (error instanceof StopProcessingError) return
      const code = errorCode(error)
      if (code === 'REVISION_LEASE_LOST' || code === 'REVISION_WORKER_STOPPED') return
      if (!input) {
        await terminalizeClaimedRun(run, error).catch(() => {})
        return
      }
      if (code === 'REVISION_CANCELED') {
        try {
          await finishCanceled(input, run.id)
        } catch (cancellationError) {
          await terminalizeClaimedRun(run, cancellationError, input).catch(() => {})
        }
        return
      }
      await failRun(input, run.id, error).catch(() => {})
    } finally {
      deps.clearInterval(heartbeat)
      controllers.delete(run.id)
    }
  }

  async function drain() {
    while (!stopping && queue.size) {
      const runId = queue.values().next().value as number
      queue.delete(runId)
      const claimed = await deps.claimRun(activeWorkspace!, {
        runId,
        owner: leaseOwner,
        leaseMs: EDITOR_REVISION_LEASE_MS,
      }).catch(() => null)
      if (claimed) await processClaim(claimed)
    }
  }

  function kick() {
    if (stopping || drainPromise || !activeWorkspace || !queue.size) return
    drainPromise = drain().finally(() => {
      drainPromise = null
      if (!stopping && queue.size) kick()
      notifyIdle()
    })
  }

  const worker: EditorRevisionWorker = {
    async start(workspace) {
      if (started) return
      if (stopping) return
      started = true
      activeWorkspace = workspace
      const recovered = await deps.recoverRuns(workspace)
      for (const runId of recovered.queued) queue.add(runId)
      kick()
    },
    enqueue(runId) {
      if (stopping) return
      if (!activeWorkspace) activeWorkspace = ctx.getWorkspace()
      queue.add(runId)
      kick()
    },
    cancel(runId) {
      const controller = controllers.get(runId)
      if (controller && !controller.signal.aborted) {
        controller.abort(revisionError('REVISION_CANCELED', 'revision canceled'))
      }
    },
    async stop() {
      if (stopping) {
        if (drainPromise) await drainPromise
        return
      }
      stopping = true
      queue.clear()
      for (const controller of controllers.values()) {
        if (!controller.signal.aborted) {
          controller.abort(revisionError('REVISION_WORKER_STOPPED', 'editor revision worker stopped'))
        }
      }
      if (drainPromise) await drainPromise
      notifyIdle()
    },
    async waitForIdle() {
      if (!queue.size && !drainPromise) return
      await new Promise<void>(resolve => idleWaiters.add(resolve))
    },
  }
  return worker
}
