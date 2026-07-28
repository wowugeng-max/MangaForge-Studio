import { randomUUID } from 'crypto'
import { jsonText, nowIso } from '../json'
import { normalizeChapterRecord, normalizeReviewRecord, normalizeRunRecord } from '../normalize'
import { revisionTextHash } from '../revision-hash'
import { chapterFromRow, reviewFromRow, runFromRow } from '../row-mappers'
import { updateChapterRow, withNovelDbWrite } from '../sql-rows'
import type { NovelChapterRecord, NovelReviewRecord, NovelRunRecord } from '../types'

const RECEIPT_RUN_TYPE = 'prose_quality'
const RECEIPT_LEASE_MS = 10 * 60_000

export type ProseQualityReceiptClaim = {
  state: 'claimed' | 'waiting' | 'completed' | 'failed'
  owner: string
  run: NovelRunRecord
}

export async function withProseQualityReceiptLease<T>(
  workspace: string,
  input: {
    claimRunId: number
    owner: string
    signal?: AbortSignal
    leaseMs?: number
    heartbeatMs?: number
  },
  operation: (signal?: AbortSignal) => Promise<T>,
) {
  const leaseMs = Math.max(50, Number(input.leaseMs || RECEIPT_LEASE_MS))
  const heartbeatMs = Math.max(10, Math.min(leaseMs - 1, Number(input.heartbeatMs || Math.floor(leaseMs / 3))))
  const controller = new AbortController()
  const forwardAbort = () => controller.abort(input.signal?.reason || new Error('prose quality review aborted'))
  if (input.signal?.aborted) forwardAbort()
  else input.signal?.addEventListener('abort', forwardAbort, { once: true })
  let stopped = false
  let operationCompleted = false
  let renewal = Promise.resolve()
  const timer = setInterval(() => {
    renewal = renewal.then(async () => {
      if (stopped || controller.signal.aborted) return
      try {
        const renewed = await renewProseQualityReceiptLease(workspace, {
          claimRunId: input.claimRunId,
          owner: input.owner,
          leaseMs,
        })
        if (!renewed && !stopped && !operationCompleted) controller.abort(claimLostError())
      } catch (error) {
        controller.abort(error)
      }
    })
  }, heartbeatMs)
  ;(timer as any).unref?.()
  try {
    if (controller.signal.aborted) throw controller.signal.reason || claimLostError()
    const result = await operation(controller.signal)
    operationCompleted = true
    stopped = true
    clearInterval(timer)
    await renewal
    if (controller.signal.aborted) throw controller.signal.reason || claimLostError()
    return result
  } finally {
    stopped = true
    clearInterval(timer)
    input.signal?.removeEventListener('abort', forwardAbort)
    await renewal.catch(() => undefined)
  }
}

function staleCandidateError() {
  return Object.assign(new Error('chapter text no longer matches prose quality receipt'), {
    code: 'PROSE_QUALITY_CANDIDATE_STALE',
  })
}

function claimLostError() {
  return Object.assign(new Error('prose quality receipt lease is no longer owned by this worker'), {
    code: 'PROSE_QUALITY_RECEIPT_CLAIM_LOST',
  })
}

function receiptScopeKey(input: { chapterId: number; sourceRunId: number; candidateHash: string }) {
  return `chapter:${input.chapterId}:source-run:${input.sourceRunId}:candidate:${input.candidateHash}`
}

function runByScope(db: any, projectId: number, scopeKey: string): NovelRunRecord | null {
  const row = db.query(`
    SELECT * FROM runs
    WHERE project_id = ? AND run_type = ? AND scope_key = ?
    LIMIT 1
  `).get(projectId, RECEIPT_RUN_TYPE, scopeKey) as any
  return row ? runFromRow(row) : null
}

function existingReviewId(db: any, input: { projectId: number; chapterId: number; sourceRunId: number; candidateHash: string }) {
  return Number((db.query(`
    SELECT id FROM reviews
    WHERE project_id = ? AND review_type = 'prose_quality'
      AND json_valid(payload)
      AND CAST(json_extract(payload, '$.chapter_id') AS INTEGER) = ?
      AND CAST(json_extract(payload, '$.source_run_id') AS INTEGER) = ?
      AND json_extract(payload, '$.candidate_hash') = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(input.projectId, input.chapterId, input.sourceRunId, input.candidateHash) as any)?.id || 0)
}

function assertLiveCandidate(db: any, input: { projectId: number; chapterId: number; candidateHash: string }) {
  const chapter = db.query(`
    SELECT chapter_text FROM chapters WHERE id = ? AND project_id = ? LIMIT 1
  `).get(input.chapterId, input.projectId) as any
  if (!chapter || revisionTextHash(String(chapter.chapter_text || '')) !== input.candidateHash) {
    throw staleCandidateError()
  }
}

export async function claimProseQualityReceipt(workspace: string, input: {
  projectId: number
  chapterId: number
  chapterNo: number
  sourceRunId: number
  candidateHash: string
  owner?: string
  now?: string
  leaseMs?: number
  allowFailedRetry?: boolean
}): Promise<ProseQualityReceiptClaim> {
  const owner = String(input.owner || randomUUID())
  const timestamp = input.now || nowIso()
  const expiresAt = new Date(new Date(timestamp).getTime() + Number(input.leaseMs || RECEIPT_LEASE_MS)).toISOString()
  const scopeKey = receiptScopeKey(input)
  return withNovelDbWrite(workspace, db => {
    assertLiveCandidate(db, input)
    const existing = runByScope(db, input.projectId, scopeKey)
    if (existing?.status === 'success') return { state: 'completed', owner, run: existing }
    if (existing?.status === 'failed' && input.allowFailedRetry === false) {
      return { state: 'failed', owner, run: existing }
    }
    const leaseActive = existing?.status === 'running'
      && existing.lease_expires_at
      && new Date(existing.lease_expires_at).getTime() > new Date(timestamp).getTime()
    if (leaseActive) return { state: 'waiting', owner, run: existing }
    if (existing) {
      let previousOutput: Record<string, any> = {}
      try { previousOutput = JSON.parse(String(existing.output_ref || '{}')) } catch { previousOutput = {} }
      const previousFailures = Array.isArray(previousOutput.previous_failures)
        ? [...previousOutput.previous_failures]
        : []
      if (existing.status === 'failed') {
        previousFailures.push({
          attempt: Math.max(1, Number(previousOutput.attempt || 1)),
          error: String(previousOutput.error || existing.error_message || 'prose quality receipt failed'),
          error_code: String(previousOutput.error_code || 'PROSE_QUALITY_FAILED'),
          failed_at: existing.updated_at || existing.created_at,
        })
      }
      const { error: _error, error_code: _errorCode, ...retainedOutput } = previousOutput
      db.query(`
        UPDATE runs
        SET status = 'running', output_ref = ?, error_message = '', lease_owner = ?, lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND run_type = ?
      `).run(
        JSON.stringify({
          ...retainedOutput,
          attempt: Math.max(1, Number(previousOutput.attempt || 1)) + 1,
          previous_failures: previousFailures,
        }),
        owner,
        expiresAt,
        timestamp,
        existing.id,
        RECEIPT_RUN_TYPE,
      )
      return { state: 'claimed', owner, run: runByScope(db, input.projectId, scopeKey)! }
    }

    const priorReviewId = existingReviewId(db, input)
    if (priorReviewId) {
      return {
        state: 'completed',
        owner,
        run: normalizeRunRecord({
          id: 0,
          project_id: input.projectId,
          run_type: RECEIPT_RUN_TYPE,
          step_name: `chapter-${input.chapterNo}`,
          status: 'success',
          output_ref: JSON.stringify({ review_id: priorReviewId }),
          scope_key: scopeKey,
        }),
      }
    }
    const record = normalizeRunRecord({
      project_id: input.projectId,
      run_type: RECEIPT_RUN_TYPE,
      step_name: `chapter-${input.chapterNo}`,
      status: 'running',
      input_ref: JSON.stringify({
        chapter_id: input.chapterId,
        source_run_id: input.sourceRunId,
        candidate_hash: input.candidateHash,
      }),
      output_ref: JSON.stringify({ attempt: 1, previous_failures: [] }),
      scope_key: scopeKey,
      updated_at: timestamp,
      lease_owner: owner,
      lease_expires_at: expiresAt,
      created_at: timestamp,
    })
    const result = db.query(`
      INSERT INTO runs (
        project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
        pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count,
        scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.project_id, record.run_type, record.step_name, record.status,
      record.input_ref || '', record.output_ref || '', record.duration_ms || 0, record.error_message || '',
      record.pipeline_chapter_failure_count ?? 0, record.pipeline_open_task_count ?? 0, record.pipeline_task_count ?? 0,
      record.scope_key ?? null, record.updated_at ?? null, record.lease_owner ?? null,
      record.lease_expires_at ?? null, record.cancel_requested_at ?? null, record.created_at,
    ) as any
    const run = runFromRow(db.query('SELECT * FROM runs WHERE id = ?').get(Number(result.lastInsertRowid || 0)) as any)
    return { state: 'claimed', owner, run }
  }, 'claim-prose-quality-receipt')
}

export async function renewProseQualityReceiptLease(workspace: string, input: {
  claimRunId: number
  owner: string
  now?: string
  leaseMs?: number
}) {
  const timestamp = input.now || nowIso()
  const expiresAt = new Date(new Date(timestamp).getTime() + Math.max(50, Number(input.leaseMs || RECEIPT_LEASE_MS))).toISOString()
  return withNovelDbWrite(workspace, db => Number((db.query(`
    UPDATE runs
    SET lease_expires_at = ?, updated_at = ?
    WHERE id = ? AND run_type = ? AND status = 'running' AND lease_owner = ?
  `).run(expiresAt, timestamp, input.claimRunId, RECEIPT_RUN_TYPE, input.owner) as any)?.changes || 0) === 1,
  'renew-prose-quality-receipt')
}

export async function commitProseQualityReceipt(workspace: string, input: {
  claimRunId: number
  owner: string
  projectId: number
  chapterId: number
  candidateHash: string
  review: Partial<NovelReviewRecord>
  auditRun: Partial<NovelRunRecord>
  chapterPatch?: Partial<NovelChapterRecord>
  signal?: AbortSignal
}) {
  return withNovelDbWrite(workspace, db => {
    if (input.signal?.aborted) throw input.signal.reason || new Error('prose quality review aborted')
    const timestamp = nowIso()
    const claim = db.query(`
      SELECT * FROM runs
      WHERE id = ? AND project_id = ? AND run_type = ? AND status = 'running'
        AND lease_owner = ? AND lease_expires_at IS NOT NULL
        AND julianday(lease_expires_at) > julianday(?)
      LIMIT 1
    `).get(input.claimRunId, input.projectId, RECEIPT_RUN_TYPE, input.owner, timestamp) as any
    if (!claim) throw claimLostError()
    assertLiveCandidate(db, input)

    let committedChapterUpdatedAt = ''
    if (input.chapterPatch) {
      const row = db.query('SELECT * FROM chapters WHERE id = ? AND project_id = ? LIMIT 1')
        .get(input.chapterId, input.projectId) as any
      if (!row) throw staleCandidateError()
      const current = chapterFromRow(row)
      const patch: Partial<NovelChapterRecord> = {}
      for (const key of ['chapter_goal', 'chapter_summary', 'conflict', 'ending_hook', 'raw_payload'] as const) {
        if (input.chapterPatch[key] !== undefined) (patch as any)[key] = input.chapterPatch[key]
      }
      const next = normalizeChapterRecord({ ...patch, updated_at: timestamp }, current)
      updateChapterRow(db, next)
      committedChapterUpdatedAt = next.updated_at
    }

    let reviewInput = input.review
    if (committedChapterUpdatedAt) {
      let payload: Record<string, any> = {}
      try { payload = JSON.parse(String(input.review.payload || '{}')) } catch { payload = {} }
      reviewInput = {
        ...input.review,
        payload: jsonText({ ...payload, chapter_updated_at: committedChapterUpdatedAt }, {}),
      }
    }
    const reviewRecord = normalizeReviewRecord(reviewInput)
    const reviewResult = db.query(`
      INSERT INTO reviews (project_id, review_type, status, summary, issues, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewRecord.project_id,
      reviewRecord.review_type,
      reviewRecord.status,
      reviewRecord.summary || '',
      jsonText(reviewRecord.issues || []),
      reviewRecord.payload || '',
      reviewRecord.created_at,
    ) as any
    const reviewId = Number(reviewResult.lastInsertRowid || 0)
    const saved = reviewFromRow(db.query('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any)

    let priorOutput: any = {}
    try { priorOutput = JSON.parse(String(claim.output_ref || '{}')) } catch { priorOutput = {} }
    let auditOutput: any = {}
    try { auditOutput = JSON.parse(String(input.auditRun.output_ref || '{}')) } catch { auditOutput = {} }
    const auditRecord = normalizeRunRecord({
      ...input.auditRun,
      output_ref: JSON.stringify({ ...auditOutput, review_id: reviewId }),
    })
    const outputRef = JSON.stringify({ ...priorOutput, ...auditOutput, review_id: reviewId })
    const completed = db.query(`
      UPDATE runs
      SET step_name = ?, status = 'success', input_ref = ?, output_ref = ?, duration_ms = ?,
        error_message = '', updated_at = ?, lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ? AND run_type = ? AND status = 'running' AND lease_owner = ?
    `).run(
      auditRecord.step_name,
      auditRecord.input_ref || '',
      outputRef,
      auditRecord.duration_ms || 0,
      timestamp,
      input.claimRunId,
      RECEIPT_RUN_TYPE,
      input.owner,
    ) as any
    if (Number(completed.changes || 0) !== 1) throw claimLostError()
    return { saved, auditRunId: input.claimRunId }
  }, 'commit-prose-quality-receipt')
}

export async function failProseQualityReceipt(workspace: string, input: {
  claimRunId: number
  owner: string
  error?: unknown
}) {
  return withNovelDbWrite(workspace, db => {
    const row = db.query(`
      SELECT * FROM runs
      WHERE id = ? AND run_type = ? AND status = 'running' AND lease_owner = ?
      LIMIT 1
    `).get(input.claimRunId, RECEIPT_RUN_TYPE, input.owner) as any
    if (!row) return null
    const run = runFromRow(row)
    let identity: Record<string, unknown> = {}
    try { identity = JSON.parse(String(run.input_ref || '{}')) } catch { identity = {} }
    let previousOutput: Record<string, unknown> = {}
    try { previousOutput = JSON.parse(String(run.output_ref || '{}')) } catch { previousOutput = {} }
    const error = input.error as any
    const message = String(error?.message || error || 'prose quality receipt failed')
    const errorCode = String(error?.code || 'PROSE_QUALITY_FAILED')
    const timestamp = nowIso()
    db.query(`
      UPDATE runs
      SET status = 'failed', output_ref = ?, error_message = ?, updated_at = ?,
        lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ? AND run_type = ? AND status = 'running' AND lease_owner = ?
    `).run(
      JSON.stringify({
        ...previousOutput,
        ...identity,
        attempt: Math.max(1, Number((previousOutput as any).attempt || 1)),
        previous_failures: Array.isArray((previousOutput as any).previous_failures)
          ? (previousOutput as any).previous_failures
          : [],
        current_chapter_only: true,
        error: message,
        error_code: errorCode,
      }),
      message,
      timestamp,
      input.claimRunId,
      RECEIPT_RUN_TYPE,
      input.owner,
    )
    const failed = db.query('SELECT * FROM runs WHERE id = ? LIMIT 1').get(input.claimRunId) as any
    return failed ? runFromRow(failed) : null
  }, 'fail-prose-quality-receipt')
}
