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

function phaseIndex(phase: EditorRevisionPhase): number {
  return EDITOR_REVISION_PHASES.indexOf(phase)
}

function validateCheckpointProgress(previous: EditorRevisionCheckpoint, next: EditorRevisionCheckpoint) {
  if (phaseIndex(next.phase) < phaseIndex(previous.phase)) {
    throw revisionError('REVISION_CHECKPOINT_REGRESSION', 'editor revision checkpoint phase cannot regress')
  }
  for (const phase of EDITOR_REVISION_PHASES) {
    if (TERMINAL_PHASE_STATES.has(previous.phases[phase].status) && !TERMINAL_PHASE_STATES.has(next.phases[phase].status)) {
      throw revisionError('REVISION_CHECKPOINT_REGRESSION', `completed editor revision phase cannot regress: ${phase}`)
    }
  }
  for (const phase of EDITOR_REVISION_PHASES.slice(0, phaseIndex(next.phase))) {
    if (!TERMINAL_PHASE_STATES.has(next.phases[phase].status)) {
      throw revisionError('REVISION_CHECKPOINT_REGRESSION', `editor revision checkpoint skipped incomplete phase: ${phase}`)
    }
  }
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
      const record = normalizeRunRecord({
        project_id: input.projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${Number(chapter?.chapter_no || input.chapterId)}`,
        status: 'queued',
        input_ref: input.inputRef,
        output_ref: input.outputRef,
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
        record.input_ref || '',
        record.output_ref || '',
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
    throw revisionError('REVISION_ALREADY_ACTIVE', 'an editor revision is already active for this chapter', {
      existingRunId: existing.id,
      statusUrl: `/api/novel/editor-revisions/${existing.id}?project_id=${input.projectId}`,
    })
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
    const previousCheckpoint = requireCanonicalCheckpoint(current.output_ref)
    const nextCheckpoint = requireCanonicalCheckpoint(input.checkpoint)
    if (input.phase !== nextCheckpoint.phase) throw revisionError('REVISION_CHECKPOINT_INVALID', 'checkpoint phase does not match the write phase')
    validateCheckpointProgress(previousCheckpoint, nextCheckpoint)
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
    const previousCheckpoint = requireCanonicalCheckpoint(current.output_ref)
    for (const phase of EDITOR_REVISION_PHASES) {
      if (TERMINAL_PHASE_STATES.has(previousCheckpoint.phases[phase].status) && !TERMINAL_PHASE_STATES.has(nextCheckpoint.phases[phase].status)) {
        throw revisionError('REVISION_CHECKPOINT_REGRESSION', `completed editor revision phase cannot regress: ${phase}`)
      }
    }
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
  return withNovelDbWrite(workspace, db => {
    const current = rowById(db, runId)
    if (!current || current.project_id !== projectId || !['failed', 'canceled'].includes(current.status)) throw leaseOrStateError()
    const checkpoint = requireCanonicalCheckpoint(current.output_ref)
    const failureCode = checkpoint.error?.code || current.error_message || ''
    if (RETRY_RESTART_ERRORS.has(failureCode)) {
      throw revisionError('REVISION_RESTART_REQUIRED', 'editor revision must restart from a fresh source snapshot')
    }
    const nextCheckpoint = retryCheckpoint(checkpoint)
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
      const checkpoint = parseCanonicalCheckpoint(run.output_ref)
      if (!run.scope_key || !checkpoint) {
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
      const expired = !run.lease_expires_at || new Date(run.lease_expires_at).getTime() <= new Date(timestamp).getTime()
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
