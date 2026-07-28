import type { Database } from 'bun:sqlite'
import {
  EDITOR_REVISION_PHASES,
  type EditorRevisionCheckpoint,
  type EditorRevisionPhase,
  type EditorRevisionPhaseState,
  type EditorRevisionRunStatus,
} from '../../routes/novel-editor/editor-revision-contract'
import { ensureSqliteSchema, openDb } from '../db'
import { nowIso } from '../json'
import { normalizeRunRecord } from '../normalize'
import { revisionTextHash } from '../revision-hash'
import { runFromRow } from '../row-mappers'
import { withNovelDbWrite } from '../sql-rows'
import type { NovelRunRecord } from '../types'
import { getNovelRun } from './runs'

export const EDITOR_REVISION_LEASE_MS = 30_000

const PHASE_STATES = ['pending', 'running', 'completed', 'skipped', 'failed', 'canceled'] as const
const TERMINAL_PHASE_STATES = new Set<EditorRevisionPhaseState['status']>(['completed', 'skipped'])
const RETRY_RESTART_ERRORS = new Set(['SOURCE_VERSION_CHANGED', 'REVISION_RUN_SUPERSEDED'])

type RevisionError = Error & {
  code: string
  existingRunId?: number
  statusUrl?: string
}

function revisionError(code: string, message: string, details: Partial<RevisionError> = {}): RevisionError {
  return Object.assign(new Error(message), { code, ...details })
}

function normalizedNow(value?: string): string {
  if (value === undefined) return nowIso()
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw revisionError('REVISION_INVALID_TIMESTAMP', 'invalid editor revision timestamp')
  return date.toISOString()
}

function leaseExpiry(now: string, leaseMs = EDITOR_REVISION_LEASE_MS): string {
  if (!Number.isFinite(leaseMs) || leaseMs <= 0) throw revisionError('REVISION_INVALID_LEASE', 'editor revision lease must be positive')
  return new Date(new Date(now).getTime() + leaseMs).toISOString()
}

function isActiveScopeUniqueViolation(error: unknown): boolean {
  return String(error).includes('UNIQUE constraint failed: runs.project_id, runs.run_type, runs.scope_key')
}

function parseCanonicalCheckpoint(value: unknown): EditorRevisionCheckpoint | null {
  let parsed: any = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object' || parsed.schema_version !== 1) return null
  if (!EDITOR_REVISION_PHASES.includes(parsed.phase)) return null
  if (!parsed.phases || typeof parsed.phases !== 'object') return null
  for (const phase of EDITOR_REVISION_PHASES) {
    const state = parsed.phases[phase]
    if (!state || typeof state !== 'object' || !PHASE_STATES.includes(state.status)) return null
    if (!Number.isFinite(Number(state.attempt)) || Number(state.attempt) < 0) return null
  }
  if (typeof parsed.prose_persisted !== 'boolean' || !Array.isArray(parsed.warnings)) return null
  return parsed as EditorRevisionCheckpoint
}

function requireCanonicalCheckpoint(value: unknown): EditorRevisionCheckpoint {
  const checkpoint = parseCanonicalCheckpoint(value)
  if (!checkpoint) throw revisionError('REVISION_CHECKPOINT_INVALID', 'editor revision checkpoint is not canonical')
  return checkpoint
}

function checkpointInvalid(message: string): never {
  throw revisionError('REVISION_CHECKPOINT_INVALID', message)
}

export type EditorRevisionCheckpointContext = {
  runStatus?: EditorRevisionRunStatus
}

export function assertEditorRevisionCheckpointCoherent(
  checkpoint: EditorRevisionCheckpoint,
  context: EditorRevisionCheckpointContext = {},
) {
  const currentIndex = phaseIndex(checkpoint.phase)
  for (const phase of EDITOR_REVISION_PHASES.slice(0, currentIndex)) {
    if (!TERMINAL_PHASE_STATES.has(checkpoint.phases[phase].status)) {
      checkpointInvalid(`editor revision checkpoint skipped incomplete phase: ${phase}`)
    }
  }
  for (const phase of EDITOR_REVISION_PHASES.slice(currentIndex + 1)) {
    if (checkpoint.phases[phase].status !== 'pending') {
      checkpointInvalid(`editor revision checkpoint has non-pending future phase: ${phase}`)
    }
  }
  for (const phase of ['generate_candidate', 'admit_candidate', 'persist_chapter', 'completed'] as const) {
    if (checkpoint.phases[phase].status === 'skipped') {
      checkpointInvalid(`required editor revision phase cannot be skipped: ${phase}`)
    }
  }
  for (const phase of EDITOR_REVISION_PHASES) {
    const state = checkpoint.phases[phase]
    if (state.status !== 'pending' && Number(state.attempt) < 1) {
      checkpointInvalid(`non-pending editor revision phase requires an attempt: ${phase}`)
    }
  }

  const candidate = checkpoint.candidate
  if (candidate) {
    if (typeof candidate.text !== 'string' || !candidate.text
      || typeof candidate.hash !== 'string' || !candidate.hash
      || !Number.isInteger(candidate.char_count) || candidate.char_count < 1
      || !Array.isArray(candidate.applied_patches)
      || !candidate.diagnostics || typeof candidate.diagnostics !== 'object' || Array.isArray(candidate.diagnostics)) {
      checkpointInvalid('admitted editor revision candidate is not canonical')
    }
  }
  const candidateAdmitted = checkpoint.phases.admit_candidate.status === 'completed'
  if (Boolean(candidate) !== candidateAdmitted) {
    checkpointInvalid('candidate evidence requires completed candidate admission')
  }
  if (candidate && (
    revisionTextHash(candidate.text) !== candidate.hash
    || candidate.text.replace(/\s/g, '').length !== candidate.char_count
  )) {
    checkpointInvalid('candidate hash and character count must match candidate text')
  }
  const persistCompleted = checkpoint.phases.persist_chapter.status === 'completed'
  if (checkpoint.prose_persisted !== persistCompleted) {
    checkpointInvalid('completed chapter persistence must match persisted prose evidence')
  }
  if (checkpoint.prose_persisted && !candidate) {
    checkpointInvalid('persisted prose requires an admitted candidate')
  }
  if (!checkpoint.prose_persisted && (
    checkpoint.committed_chapter_updated_at !== undefined
    || checkpoint.editor_revision_review_id !== undefined
  )) {
    checkpointInvalid('chapter commit metadata requires persisted prose evidence')
  }

  const currentStatus = checkpoint.phases[checkpoint.phase].status
  const errorCode = String(checkpoint.error?.code || '').trim()
  const errorMessage = String(checkpoint.error?.message || '').trim()
  if (currentStatus === 'failed') {
    if (!errorCode || !errorMessage) checkpointInvalid('failed checkpoint requires a canonical error')
  } else if (checkpoint.error !== undefined) {
    checkpointInvalid('checkpoint error requires a failed current phase')
  }

  const completed = checkpoint.phase === 'completed' && currentStatus === 'completed'
  if (context.runStatus && ['queued', 'running', 'cancel_requested'].includes(context.runStatus)) {
    if (currentStatus === 'failed' || currentStatus === 'canceled' || completed) {
      checkpointInvalid('active editor revision run has a terminal checkpoint state')
    }
  } else if (context.runStatus === 'failed' && currentStatus !== 'failed') {
    checkpointInvalid('failed editor revision run requires a failed current phase')
  } else if (context.runStatus === 'completed' && !completed) {
    checkpointInvalid('completed editor revision run requires a completed checkpoint')
  } else if (context.runStatus === 'canceled'
    && currentStatus !== 'canceled'
    && !TERMINAL_PHASE_STATES.has(currentStatus)) {
    checkpointInvalid('canceled editor revision run requires a canceled or completed current phase')
  }
}

export function requireCoherentEditorRevisionCheckpoint(
  value: unknown,
  context: EditorRevisionCheckpointContext = {},
): EditorRevisionCheckpoint {
  const checkpoint = requireCanonicalCheckpoint(value)
  assertEditorRevisionCheckpointCoherent(checkpoint, context)
  return checkpoint
}

function preserveEditorRevisionInputRef(value: string): string {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('input must be an object')
    return value
  } catch {
    throw revisionError('REVISION_INPUT_INVALID', 'editor revision input_ref must be a JSON object')
  }
}

function preserveEditorRevisionCheckpointRef(value: string): string {
  requireCoherentEditorRevisionCheckpoint(value, { runStatus: 'queued' })
  return value
}

function phaseIndex(phase: EditorRevisionPhase): number {
  return EDITOR_REVISION_PHASES.indexOf(phase)
}

function canonicalJson(value: unknown): string {
  const canonicalize = (item: any): any => {
    if (Array.isArray(item)) return item.map(canonicalize)
    if (!item || typeof item !== 'object') return item
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, canonicalize(item[key])]))
  }
  return JSON.stringify(canonicalize(value))
}

function checkpointRegression(message: string): never {
  throw revisionError('REVISION_CHECKPOINT_REGRESSION', message)
}

function validateEditorRevisionTransition(
  previous: EditorRevisionCheckpoint,
  next: EditorRevisionCheckpoint,
  options: {
    status: EditorRevisionRunStatus
    previousStatus: EditorRevisionRunStatus
    cancellation?: boolean
  },
) {
  assertEditorRevisionCheckpointCoherent(previous, { runStatus: options.previousStatus })
  if (previous.prose_persisted && !next.prose_persisted) checkpointRegression('persisted prose evidence cannot be erased')
  if (next.prose_persisted) {
    if (!next.candidate || next.phases.admit_candidate.status !== 'completed' || next.phases.persist_chapter.status !== 'completed') {
      throw revisionError('REVISION_CHECKPOINT_INVALID', 'persisted prose requires an admitted candidate and completed persist phase')
    }
  }
  if (previous.phases.admit_candidate.status === 'completed') {
    if (!previous.candidate || !next.candidate || canonicalJson(previous.candidate) !== canonicalJson(next.candidate)) {
      checkpointRegression('admitted candidate identity cannot change')
    }
  }
  for (const field of [
    'committed_chapter_updated_at',
    'editor_revision_review_id',
    'continuity_warning_review_id',
  ] as const) {
    if (previous[field] !== undefined && canonicalJson(previous[field]) !== canonicalJson(next[field])) {
      checkpointRegression(`committed editor revision evidence cannot change: ${field}`)
    }
  }
  for (const phase of EDITOR_REVISION_PHASES) {
    if (TERMINAL_PHASE_STATES.has(previous.phases[phase].status)
      && canonicalJson(previous.phases[phase]) !== canonicalJson(next.phases[phase])) {
      checkpointRegression(`completed editor revision phase cannot change: ${phase}`)
    }
  }

  if (options.cancellation) {
    if (options.status !== 'canceled' || next.phase !== previous.phase) {
      throw revisionError('REVISION_CHECKPOINT_INVALID', 'cancellation must preserve the current checkpoint phase')
    }
    for (const phase of EDITOR_REVISION_PHASES) {
      if (phase === previous.phase && !TERMINAL_PHASE_STATES.has(previous.phases[phase].status)) {
        const completedCommitBoundary = phase === 'persist_chapter'
          && next.prose_persisted
          && next.phases.persist_chapter.status === 'completed'
        if (next.phases[phase].status !== 'canceled' && !completedCommitBoundary) {
          throw revisionError('REVISION_CHECKPOINT_INVALID', 'cancellation must mark the current incomplete phase canceled')
        }
        continue
      }
      if (canonicalJson(previous.phases[phase]) !== canonicalJson(next.phases[phase])) {
        checkpointRegression(`cancellation cannot change a non-current phase: ${phase}`)
      }
    }
    assertEditorRevisionCheckpointCoherent(next, { runStatus: options.status })
    return
  }

  if (phaseIndex(next.phase) < phaseIndex(previous.phase)) checkpointRegression('editor revision checkpoint phase cannot regress')
  for (const phase of EDITOR_REVISION_PHASES.slice(0, phaseIndex(next.phase))) {
    if (!TERMINAL_PHASE_STATES.has(next.phases[phase].status)) {
      checkpointRegression(`editor revision checkpoint skipped incomplete phase: ${phase}`)
    }
  }
  const currentPhaseStatus = next.phases[next.phase].status
  if (options.status === 'failed') {
    const errorCode = String(next.error?.code || '').trim()
    const errorMessage = String(next.error?.message || '').trim()
    if (currentPhaseStatus !== 'failed' || !errorCode || !errorMessage) {
      throw revisionError('REVISION_CHECKPOINT_INVALID', 'failed run status requires a failed current phase and canonical error')
    }
  }
  if (options.status === 'running' && (currentPhaseStatus === 'failed' || currentPhaseStatus === 'canceled')) {
    throw revisionError('REVISION_CHECKPOINT_INVALID', 'running run status cannot contain a failed or canceled current phase')
  }
  const checkpointCompleted = next.phase === 'completed' && next.phases.completed.status === 'completed'
  if ((options.status === 'completed') !== checkpointCompleted) {
    throw revisionError('REVISION_CHECKPOINT_INVALID', 'completed run status must match the completed checkpoint phase')
  }
  assertEditorRevisionCheckpointCoherent(next, { runStatus: options.status })
}

function rowById(db: Database, runId: number): NovelRunRecord | null {
  const row = db.query('SELECT * FROM runs WHERE id = ? AND run_type = ? LIMIT 1').get(runId, 'editor_revision') as any
  return row ? runFromRow(row) : null
}

function changed(result: unknown): boolean {
  return Number((result as any)?.changes || 0) > 0
}

function leaseOrStateError(): RevisionError {
  return revisionError('REVISION_LEASE_OR_STATE_INVALID', 'editor revision lease or state is no longer valid')
}

function alreadyActiveError(existing: NovelRunRecord, projectId: number): RevisionError {
  return revisionError('REVISION_ALREADY_ACTIVE', 'an editor revision is already active for this chapter', {
    existingRunId: existing.id,
    statusUrl: `/api/novel/editor-revisions/${existing.id}?project_id=${projectId}`,
  })
}

async function activeRunForScope(workspace: string, projectId: number, scopeKey: string): Promise<NovelRunRecord | null> {
  const db = openDb(workspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`
      SELECT * FROM runs
      WHERE project_id = ? AND run_type = 'editor_revision' AND scope_key = ?
        AND status IN ('queued', 'running', 'cancel_requested')
      LIMIT 1
    `).get(projectId, scopeKey) as any
    return row ? runFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function createEditorRevisionRun(workspace: string, input: {
  projectId: number
  chapterId: number
  inputRef: string
  outputRef: string
}): Promise<NovelRunRecord> {
  const scopeKey = `chapter:${input.chapterId}`
  try {
    return await withNovelDbWrite(workspace, db => {
      const chapter = db.query('SELECT chapter_no FROM chapters WHERE id = ? AND project_id = ? LIMIT 1').get(input.chapterId, input.projectId) as any
      const timestamp = nowIso()
      const inputRef = preserveEditorRevisionInputRef(input.inputRef)
      const outputRef = preserveEditorRevisionCheckpointRef(input.outputRef)
      const record = normalizeRunRecord({
        project_id: input.projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${Number(chapter?.chapter_no || input.chapterId)}`,
        status: 'queued',
        input_ref: '',
        output_ref: '',
        scope_key: scopeKey,
        created_at: timestamp,
        updated_at: timestamp,
        lease_owner: null,
        lease_expires_at: null,
        cancel_requested_at: null,
      })
      const result = db.query(`
        INSERT INTO runs (
          project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
          pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count,
          scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.project_id,
        record.run_type,
        record.step_name,
        record.status,
        inputRef,
        outputRef,
        record.duration_ms || 0,
        record.error_message || '',
        record.pipeline_chapter_failure_count ?? 0,
        record.pipeline_open_task_count ?? 0,
        record.pipeline_task_count ?? 0,
        record.scope_key ?? null,
        record.updated_at ?? null,
        record.lease_owner ?? null,
        record.lease_expires_at ?? null,
        record.cancel_requested_at ?? null,
        record.created_at,
      ) as any
      const id = Number(result.lastInsertRowid || 0)
      return rowById(db, id)!
    }, 'create-editor-revision-run')
  } catch (error) {
    if (!isActiveScopeUniqueViolation(error)) throw error
    const existing = await activeRunForScope(workspace, input.projectId, scopeKey)
    if (!existing) throw error
    throw alreadyActiveError(existing, input.projectId)
  }
}

export async function getEditorRevisionRun(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord | null> {
  const run = await getNovelRun(workspace, runId, projectId)
  return run?.run_type === 'editor_revision' ? run : null
}

export async function claimEditorRevisionRun(workspace: string, input: {
  runId?: number
  owner: string
  now?: string
  leaseMs?: number
}): Promise<NovelRunRecord | null> {
  const owner = String(input.owner || '').trim()
  if (!owner) throw revisionError('REVISION_LEASE_OWNER_REQUIRED', 'editor revision lease owner is required')
  const timestamp = normalizedNow(input.now)
  const expiresAt = leaseExpiry(timestamp, input.leaseMs)
  return withNovelDbWrite(workspace, db => {
    const requestedId = input.runId === undefined ? null : Number(input.runId)
    const selected = requestedId ?? Number((db.query(`
      SELECT id FROM runs
      WHERE run_type = 'editor_revision'
        AND (
          status = 'queued'
          OR (status IN ('running', 'cancel_requested') AND (lease_expires_at IS NULL OR julianday(lease_expires_at) <= julianday(?)))
        )
      ORDER BY updated_at ASC, id ASC
      LIMIT 1
    `).get(timestamp) as any)?.id || 0)
    if (!selected) return null
    const result = db.query(`
      UPDATE runs
      SET status = 'running', lease_owner = ?, lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND run_type = 'editor_revision'
        AND (
          status = 'queued'
          OR (status IN ('running', 'cancel_requested') AND (lease_expires_at IS NULL OR julianday(lease_expires_at) <= julianday(?)))
        )
    `).run(owner, expiresAt, timestamp, selected, timestamp)
    return changed(result) ? rowById(db, selected) : null
  }, 'claim-editor-revision-run')
}

export async function renewEditorRevisionLease(workspace: string, input: {
  runId: number
  owner: string
  now?: string
  leaseMs?: number
}): Promise<boolean> {
  const timestamp = normalizedNow(input.now)
  const expiresAt = leaseExpiry(timestamp, input.leaseMs)
  return withNovelDbWrite(workspace, db => changed(db.query(`
    UPDATE runs
    SET lease_expires_at = ?, updated_at = ?
    WHERE id = ? AND run_type = 'editor_revision'
      AND status IN ('running', 'cancel_requested')
      AND lease_owner = ?
      AND lease_expires_at IS NOT NULL
      AND julianday(lease_expires_at) > julianday(?)
  `).run(expiresAt, timestamp, input.runId, input.owner, timestamp)), 'renew-editor-revision-lease')
}

export async function writeEditorRevisionCheckpoint(workspace: string, input: {
  runId: number
  owner: string
  status: EditorRevisionRunStatus
  phase: EditorRevisionPhase
  checkpoint: EditorRevisionCheckpoint
  errorMessage?: string
}): Promise<NovelRunRecord> {
  if (!['running', 'completed', 'failed'].includes(input.status)) throw leaseOrStateError()
  const timestamp = nowIso()
  return withNovelDbWrite(workspace, db => {
    const current = rowById(db, input.runId)
    if (!current) throw leaseOrStateError()
    const currentStatus = current.status as EditorRevisionRunStatus
    const previousCheckpoint = requireCoherentEditorRevisionCheckpoint(current.output_ref, { runStatus: currentStatus })
    const nextCheckpoint = requireCanonicalCheckpoint(input.checkpoint)
    if (input.phase !== nextCheckpoint.phase) throw revisionError('REVISION_CHECKPOINT_INVALID', 'checkpoint phase does not match the write phase')
    validateEditorRevisionTransition(previousCheckpoint, nextCheckpoint, {
      status: input.status,
      previousStatus: currentStatus,
    })
    const terminal = input.status === 'completed' || input.status === 'failed'
    const nextError = input.errorMessage ?? (input.status === 'failed' ? current.error_message || '' : '')
    const result = db.query(`
      UPDATE runs
      SET status = ?, output_ref = ?, error_message = ?, updated_at = ?,
        lease_owner = ?, lease_expires_at = ?
      WHERE id = ? AND run_type = 'editor_revision'
        AND status = 'running'
        AND cancel_requested_at IS NULL
        AND lease_owner = ?
        AND lease_expires_at IS NOT NULL
        AND julianday(lease_expires_at) > julianday(?)
    `).run(
      input.status,
      JSON.stringify(nextCheckpoint),
      nextError,
      timestamp,
      terminal ? null : current.lease_owner ?? null,
      terminal ? null : current.lease_expires_at ?? null,
      input.runId,
      input.owner,
      timestamp,
    )
    if (!changed(result)) throw leaseOrStateError()
    return rowById(db, input.runId)!
  }, 'write-editor-revision-checkpoint')
}

export async function requestEditorRevisionCancel(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord> {
  const timestamp = nowIso()
  return withNovelDbWrite(workspace, db => {
    const result = db.query(`
      UPDATE runs
      SET status = 'cancel_requested', cancel_requested_at = COALESCE(cancel_requested_at, ?), updated_at = ?
      WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
        AND status IN ('queued', 'running')
    `).run(timestamp, timestamp, runId, projectId)
    if (!changed(result)) throw leaseOrStateError()
    return rowById(db, runId)!
  }, 'request-editor-revision-cancel')
}

export async function finishEditorRevisionCancellation(
  workspace: string,
  runId: number,
  owner: string,
  checkpoint: EditorRevisionCheckpoint,
): Promise<NovelRunRecord> {
  const timestamp = nowIso()
  const nextCheckpoint = requireCanonicalCheckpoint(checkpoint)
  return withNovelDbWrite(workspace, db => {
    const current = rowById(db, runId)
    if (!current) throw leaseOrStateError()
    const currentStatus = current.status as EditorRevisionRunStatus
    const previousCheckpoint = requireCoherentEditorRevisionCheckpoint(current.output_ref, { runStatus: currentStatus })
    validateEditorRevisionTransition(previousCheckpoint, nextCheckpoint, {
      status: 'canceled',
      previousStatus: currentStatus,
      cancellation: true,
    })
    const result = db.query(`
      UPDATE runs
      SET status = 'canceled', output_ref = ?, error_message = '', updated_at = ?,
        lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ? AND run_type = 'editor_revision'
        AND status IN ('running', 'cancel_requested')
        AND cancel_requested_at IS NOT NULL
        AND lease_owner = ?
        AND lease_expires_at IS NOT NULL
        AND julianday(lease_expires_at) > julianday(?)
    `).run(JSON.stringify(nextCheckpoint), timestamp, runId, owner, timestamp)
    if (!changed(result)) throw leaseOrStateError()
    return rowById(db, runId)!
  }, 'finish-editor-revision-cancellation')
}

function resetPhaseState(state: EditorRevisionPhaseState): EditorRevisionPhaseState {
  return { status: 'pending', attempt: Number(state.attempt || 0) }
}

function retryCheckpoint(checkpoint: EditorRevisionCheckpoint): EditorRevisionCheckpoint {
  const next = JSON.parse(JSON.stringify(checkpoint)) as EditorRevisionCheckpoint
  let resumePhase: EditorRevisionPhase
  if (next.prose_persisted) {
    resumePhase = EDITOR_REVISION_PHASES.slice(phaseIndex('persist_chapter') + 1)
      .find(phase => !TERMINAL_PHASE_STATES.has(next.phases[phase].status)) || 'completed'
  } else if (next.candidate && next.phases.admit_candidate.status === 'completed') {
    resumePhase = 'persist_chapter'
  } else {
    resumePhase = 'generate_candidate'
    delete next.candidate
    next.prose_persisted = false
    delete next.committed_chapter_updated_at
    delete next.editor_revision_review_id
    delete next.post_quality
    delete next.story_state
    delete next.continuity_warning_review_id
    delete next.delivery_risk_convergence
    delete next.linked_task_closure
  }
  const resumeIndex = phaseIndex(resumePhase)
  for (const phase of EDITOR_REVISION_PHASES.slice(resumeIndex)) next.phases[phase] = resetPhaseState(next.phases[phase])
  next.phase = resumePhase
  delete next.error
  delete next.completed_at
  return next
}

export async function retryEditorRevisionRun(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord> {
  const timestamp = nowIso()
  try {
    return await withNovelDbWrite(workspace, db => {
      const current = rowById(db, runId)
      if (!current || current.project_id !== projectId || !['failed', 'canceled'].includes(current.status)) throw leaseOrStateError()
      const checkpoint = requireCoherentEditorRevisionCheckpoint(current.output_ref, {
        runStatus: current.status as EditorRevisionRunStatus,
      })
      const failureCode = checkpoint.error?.code || current.error_message || ''
      if (RETRY_RESTART_ERRORS.has(failureCode)) {
        throw revisionError('REVISION_RESTART_REQUIRED', 'editor revision must restart from a fresh source snapshot')
      }
      const nextCheckpoint = retryCheckpoint(checkpoint)
      assertEditorRevisionCheckpointCoherent(nextCheckpoint, { runStatus: 'queued' })
      const result = db.query(`
        UPDATE runs
        SET status = 'queued', output_ref = ?, error_message = '', updated_at = ?,
          lease_owner = NULL, lease_expires_at = NULL, cancel_requested_at = NULL
        WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
          AND status IN ('failed', 'canceled')
      `).run(JSON.stringify(nextCheckpoint), timestamp, runId, projectId)
      if (!changed(result)) throw leaseOrStateError()
      return rowById(db, runId)!
    }, 'retry-editor-revision-run')
  } catch (error) {
    if (!isActiveScopeUniqueViolation(error)) throw error
    const stale = await getEditorRevisionRun(workspace, projectId, runId)
    if (!stale?.scope_key) throw error
    const existing = await activeRunForScope(workspace, projectId, stale.scope_key)
    if (!existing || existing.id === runId) throw error
    throw alreadyActiveError(existing, projectId)
  }
}

export async function recoverEditorRevisionRuns(workspace: string, now?: string): Promise<{ queued: number[]; failedLegacy: number[] }> {
  const timestamp = normalizedNow(now)
  return withNovelDbWrite(workspace, db => {
    const queued: number[] = []
    const failedLegacy: number[] = []
    const rows = db.query(`
      SELECT * FROM runs
      WHERE run_type = 'editor_revision'
        AND status IN ('queued', 'running', 'cancel_requested')
      ORDER BY id ASC
    `).all() as any[]
    for (const raw of rows) {
      const run = runFromRow(raw)
      const expired = run.status !== 'queued'
        && (!run.lease_expires_at || new Date(run.lease_expires_at).getTime() <= new Date(timestamp).getTime())
      const recoverable = run.status === 'queued' || expired
      let checkpoint = parseCanonicalCheckpoint(run.output_ref)
      if (checkpoint) {
        try {
          assertEditorRevisionCheckpointCoherent(checkpoint, {
            runStatus: run.status as EditorRevisionRunStatus,
          })
        } catch {
          checkpoint = null
        }
      }
      if (!run.scope_key || !checkpoint) {
        if (!recoverable) continue
        const result = db.query(`
          UPDATE runs
          SET status = 'failed', error_message = 'LEGACY_REVISION_RUN_NOT_RESUMABLE', updated_at = ?,
            lease_owner = NULL, lease_expires_at = NULL
          WHERE id = ? AND run_type = 'editor_revision'
            AND status IN ('queued', 'running', 'cancel_requested')
        `).run(timestamp, run.id)
        if (changed(result)) failedLegacy.push(run.id)
        continue
      }
      if (run.status === 'queued') {
        queued.push(run.id)
        continue
      }
      if (!expired) continue
      const result = db.query(`
        UPDATE runs
        SET status = 'queued', lease_owner = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE id = ? AND run_type = 'editor_revision'
          AND status IN ('running', 'cancel_requested')
          AND (lease_expires_at IS NULL OR julianday(lease_expires_at) <= julianday(?))
      `).run(timestamp, run.id, timestamp)
      if (changed(result)) queued.push(run.id)
    }
    return { queued, failedLegacy }
  }, 'recover-editor-revision-runs')
}
