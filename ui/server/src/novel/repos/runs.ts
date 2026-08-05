import type { NovelRunRecord, NovelRunSummaryRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { withNovelWorkspaceMutation } from '../lock'
import { nowIso, parseDbJson } from '../json'
import { types } from 'node:util'
import { normalizeRunRecord } from '../normalize'
import { runFromRow, runSummaryFromRow } from '../row-mappers'
import { withNovelDbWrite, updateRunRow } from '../sql-rows'
import {
  isEditorRevisionTaskClosureStatus,
  requiredEditorRevisionTaskAnnotationKey,
} from './editor-revision-task-closure'


export async function listNovelRuns(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
        scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as any[]).map(runFromRow)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  } finally {
    db.close()
  }
}

export async function listNovelRunSummaries(activeWorkspace: string, projectId: number, limit?: number): Promise<NovelRunSummaryRecord[]> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const currentChapterIndexSql = `CASE
      WHEN json_type(output_ref, '$.chapters') = 'array'
        AND json_array_length(output_ref, '$.chapters') > 0
      THEN MIN(
        MAX(CAST(COALESCE(json_extract(output_ref, '$.current_index'), 0) AS INTEGER), 0),
        json_array_length(output_ref, '$.chapters') - 1
      )
      ELSE 0
    END`
    const normalizedLimit = Number.isInteger(limit) && Number(limit) > 0 ? Number(limit) : null
    const statement = db.query(`
      SELECT
        id,
        project_id,
        run_type,
        step_name,
        status,
        duration_ms,
        error_message,
        scope_key,
        updated_at,
        lease_owner,
        lease_expires_at,
        cancel_requested_at,
        created_at,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_id'),
          json_extract(output_ref, '$.chapterId'),
          json_extract(output_ref, '$.chapter.id'),
          json_extract(output_ref, '$.result.chapter_id'),
          json_extract(output_ref, '$.result.chapterId'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].id')
        ) AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_no'),
          json_extract(output_ref, '$.chapterNo'),
          json_extract(output_ref, '$.chapter.chapter_no'),
          json_extract(output_ref, '$.chapter.chapterNo'),
          json_extract(output_ref, '$.result.chapter_no'),
          json_extract(output_ref, '$.result.chapterNo'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapter_no'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapterNo')
        ) AS INTEGER) END AS chapter_no,
        length(CAST(COALESCE(input_ref, '') AS BLOB)) AS input_bytes,
        length(CAST(COALESCE(output_ref, '') AS BLOB)) AS output_bytes,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.admission_status'),
          json_extract(output_ref, '$.admissionStatus'),
          json_extract(output_ref, '$.prose_admission.status'),
          json_extract(output_ref, '$.proseAdmission.status'),
          json_extract(output_ref, '$.result.admission_status'),
          json_extract(output_ref, '$.result.admissionStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admission_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admissionStatus'),
          ''
        ) ELSE '' END AS admission_status,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings')) END,
          0
        ) ELSE 0 END AS admission_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.quality_warnings[0].message'),
          json_extract(output_ref, '$.qualityWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.quality_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.qualityWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.quality_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS admission_warning_preview,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.story_state_status'),
          json_extract(output_ref, '$.storyStateStatus'),
          json_extract(output_ref, '$.prose_admission.story_state_status'),
          json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
          json_extract(output_ref, '$.result.story_state_status'),
          json_extract(output_ref, '$.result.storyStateStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
          ''
        ) ELSE '' END AS story_state_status,
        CASE WHEN json_valid(output_ref) AND (
          COALESCE(
            json_extract(output_ref, '$.story_state_warning'),
            json_extract(output_ref, '$.storyStateWarning'),
            json_extract(output_ref, '$.prose_admission.story_state_warning'),
            json_extract(output_ref, '$.proseAdmission.storyStateWarning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning')
          ) IS NOT NULL
          OR lower(COALESCE(
            json_extract(output_ref, '$.story_state_status'),
            json_extract(output_ref, '$.storyStateStatus'),
            json_extract(output_ref, '$.prose_admission.story_state_status'),
            json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
            ''
          )) = 'pending'
        ) THEN 1 ELSE 0 END AS story_state_pending,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.story_state_warning.message'),
          json_extract(output_ref, '$.storyStateWarning.message'),
          json_extract(output_ref, '$.prose_admission.story_state_warning.message'),
          json_extract(output_ref, '$.proseAdmission.storyStateWarning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning.message'),
          CASE WHEN json_type(output_ref, '$.story_state_warning') = 'text' THEN json_extract(output_ref, '$.story_state_warning') END,
          CASE WHEN json_type(output_ref, '$.storyStateWarning') = 'text' THEN json_extract(output_ref, '$.storyStateWarning') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') END,
          ''
        ), 1, 220) ELSE '' END AS story_state_warning,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings')) END,
          0
        ) ELSE 0 END AS post_commit_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.post_commit_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS post_commit_warning_preview
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
      ${normalizedLimit ? 'LIMIT ?' : ''}
    `)
    const rows = normalizedLimit ? statement.all(projectId, normalizedLimit) : statement.all(projectId)
    return (rows as any[]).map(runSummaryFromRow)
  } finally {
    db.close()
  }
}

export async function getNovelRun(activeWorkspace: string, runId: number, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
        scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
      FROM runs
      WHERE id = ? AND project_id = ?
    `).get(runId, projectId) as any
    return row ? runFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function appendNovelRun(activeWorkspace: string, data: Partial<NovelRunRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeRunRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO runs (project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,pipeline_chapter_failure_count,pipeline_open_task_count,pipeline_task_count,scope_key,updated_at,lease_owner,lease_expires_at,cancel_requested_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
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
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}

export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeRunRecord(data, row)
    updateRunRow(db, next)
    return next
  })
}

export type ClaimNovelRunExecutionInput = {
  projectId: number
  runId: number
  owner: string
  expectedOutputRef: string
  expectedStatus: string
  expectedLeaseOwner: string | null
  expectedLeaseExpiresAt: string | null
  outputRef: string
  now: string
  expiresAt: string
}

export type ClaimNovelRunExecutionResult = {
  claimed: boolean
  run: NovelRunRecord | null
}

export type RecoverNovelRunExecutionInput = {
  projectId: number
  runId: number
  expectedInputRef?: string
  expectedOutputRef: string
  expectedStatus: string
  expectedLeaseOwner: string | null
  expectedLeaseExpiresAt: string | null
  expectedGuardRun?: NovelRunRecord
  outputRef: string
  status: string
  now: string
}

export type RecoverNovelRunExecutionResult = {
  updated: boolean
  run: NovelRunRecord | null
}

const RUN_CLAIM_OWNER_LIMIT = 160
const RUN_PERSISTED_OWNER_LIMIT = 16 * 1024
const RUN_CLAIM_STATUS_LIMIT = 80
const RUN_CLAIM_REF_LIMIT = 2 * 1024 * 1024
const RUN_GUARD_TEXT_LIMIT = 16 * 1024

function invalidRunClaim() {
  return Object.assign(new TypeError('Invalid novel run execution claim'), {
    code: 'NOVEL_RUN_CLAIM_INVALID',
  })
}

function ownClaimValue(input: unknown, field: string) {
  if (!input || (typeof input !== 'object' && typeof input !== 'function') || types.isProxy(input)) {
    throw invalidRunClaim()
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, field)
    if (!descriptor || !('value' in descriptor)) throw invalidRunClaim()
    return descriptor.value
  } catch (error) {
    if ((error as any)?.code === 'NOVEL_RUN_CLAIM_INVALID') throw error
    throw invalidRunClaim()
  }
}

function optionalOwnClaimValue(input: unknown, field: string) {
  if (!input || (typeof input !== 'object' && typeof input !== 'function') || types.isProxy(input)) {
    throw invalidRunClaim()
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, field)
    if (!descriptor) return undefined
    if (!('value' in descriptor)) throw invalidRunClaim()
    return descriptor.value
  } catch (error) {
    if ((error as any)?.code === 'NOVEL_RUN_CLAIM_INVALID') throw error
    throw invalidRunClaim()
  }
}

function boundedClaimOwner(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null
  if (typeof value !== 'string' || value.length > RUN_CLAIM_OWNER_LIMIT || !value.trim()) {
    throw invalidRunClaim()
  }
  return value
}

function boundedPersistedOwner(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || value.length > RUN_PERSISTED_OWNER_LIMIT) throw invalidRunClaim()
  return value
}

function boundedClaimText(value: unknown, limit: number, allowEmpty = true) {
  if (typeof value !== 'string'
    || value.length > limit
    || Buffer.byteLength(value, 'utf8') > limit
    || (!allowEmpty && !value.trim())) {
    throw invalidRunClaim()
  }
  return value
}

function canonicalClaimTimestamp(value: unknown) {
  if (typeof value !== 'string') throw invalidRunClaim()
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== value) throw invalidRunClaim()
  return value
}

type ValidatedExactNovelRunSnapshot = {
  id: number
  project_id: number
  run_type: string
  step_name: string
  status: string
  input_ref: string
  output_ref: string
  duration_ms: number
  error_message: string
  scope_key: string | null
  updated_at: string | null
  lease_owner: string | null
  lease_expires_at: string | null
  cancel_requested_at: string | null
  created_at: string
}

type ValidatedRunRecoveryInput = Omit<RecoverNovelRunExecutionInput, 'expectedGuardRun'> & {
  expectedGuardRun?: ValidatedExactNovelRunSnapshot
}

function boundedNullableClaimText(value: unknown, limit: number) {
  return value === null ? null : boundedClaimText(value, limit)
}

function nullableClaimTimestamp(value: unknown) {
  return value === null ? null : canonicalClaimTimestamp(value)
}

function validatedExactRunSnapshot(value: unknown): ValidatedExactNovelRunSnapshot {
  const id = ownClaimValue(value, 'id')
  const projectId = ownClaimValue(value, 'project_id')
  const durationMs = ownClaimValue(value, 'duration_ms')
  if (!Number.isSafeInteger(id) || id <= 0
    || !Number.isSafeInteger(projectId) || projectId <= 0
    || typeof durationMs !== 'number' || !Number.isSafeInteger(durationMs)) {
    throw invalidRunClaim()
  }
  return {
    id,
    project_id: projectId,
    run_type: boundedClaimText(ownClaimValue(value, 'run_type'), RUN_GUARD_TEXT_LIMIT, false),
    step_name: boundedClaimText(ownClaimValue(value, 'step_name'), RUN_GUARD_TEXT_LIMIT, false),
    status: boundedClaimText(ownClaimValue(value, 'status'), RUN_CLAIM_STATUS_LIMIT, false),
    input_ref: boundedClaimText(ownClaimValue(value, 'input_ref'), RUN_CLAIM_REF_LIMIT),
    output_ref: boundedClaimText(ownClaimValue(value, 'output_ref'), RUN_CLAIM_REF_LIMIT),
    duration_ms: durationMs,
    error_message: boundedClaimText(ownClaimValue(value, 'error_message'), RUN_CLAIM_REF_LIMIT),
    scope_key: boundedNullableClaimText(ownClaimValue(value, 'scope_key'), RUN_GUARD_TEXT_LIMIT),
    updated_at: nullableClaimTimestamp(ownClaimValue(value, 'updated_at')),
    lease_owner: boundedNullableClaimText(ownClaimValue(value, 'lease_owner'), RUN_PERSISTED_OWNER_LIMIT),
    lease_expires_at: nullableClaimTimestamp(ownClaimValue(value, 'lease_expires_at')),
    cancel_requested_at: nullableClaimTimestamp(ownClaimValue(value, 'cancel_requested_at')),
    created_at: canonicalClaimTimestamp(ownClaimValue(value, 'created_at')),
  }
}

function validatedRunClaim(input: unknown): ClaimNovelRunExecutionInput {
  const projectId = ownClaimValue(input, 'projectId')
  const runId = ownClaimValue(input, 'runId')
  const now = canonicalClaimTimestamp(ownClaimValue(input, 'now'))
  const expiresAt = canonicalClaimTimestamp(ownClaimValue(input, 'expiresAt'))
  if (!Number.isSafeInteger(projectId) || projectId <= 0
    || !Number.isSafeInteger(runId) || runId <= 0
    || expiresAt <= now) {
    throw invalidRunClaim()
  }
  const expectedLeaseExpiresValue = ownClaimValue(input, 'expectedLeaseExpiresAt')
  return {
    projectId,
    runId,
    owner: boundedClaimOwner(ownClaimValue(input, 'owner'))!,
    expectedOutputRef: boundedClaimText(ownClaimValue(input, 'expectedOutputRef'), RUN_CLAIM_REF_LIMIT),
    expectedStatus: boundedClaimText(ownClaimValue(input, 'expectedStatus'), RUN_CLAIM_STATUS_LIMIT, false),
    expectedLeaseOwner: boundedPersistedOwner(ownClaimValue(input, 'expectedLeaseOwner')),
    expectedLeaseExpiresAt: expectedLeaseExpiresValue === null
      ? null
      : canonicalClaimTimestamp(expectedLeaseExpiresValue),
    outputRef: boundedClaimText(ownClaimValue(input, 'outputRef'), RUN_CLAIM_REF_LIMIT),
    now,
    expiresAt,
  }
}

function validatedRunRecovery(input: unknown): ValidatedRunRecoveryInput {
  const projectId = ownClaimValue(input, 'projectId')
  const runId = ownClaimValue(input, 'runId')
  if (!Number.isSafeInteger(projectId) || projectId <= 0
    || !Number.isSafeInteger(runId) || runId <= 0) {
    throw invalidRunClaim()
  }
  const expectedLeaseExpiresValue = ownClaimValue(input, 'expectedLeaseExpiresAt')
  const expectedInputRefValue = optionalOwnClaimValue(input, 'expectedInputRef')
  const expectedGuardRunValue = optionalOwnClaimValue(input, 'expectedGuardRun')
  const expectedGuardRun = expectedGuardRunValue === undefined
    ? undefined
    : validatedExactRunSnapshot(expectedGuardRunValue)
  if (expectedGuardRun && expectedGuardRun.project_id !== projectId) throw invalidRunClaim()
  return {
    projectId,
    runId,
    ...(expectedInputRefValue === undefined
      ? {}
      : { expectedInputRef: boundedClaimText(expectedInputRefValue, RUN_CLAIM_REF_LIMIT) }),
    expectedOutputRef: boundedClaimText(ownClaimValue(input, 'expectedOutputRef'), RUN_CLAIM_REF_LIMIT),
    expectedStatus: boundedClaimText(ownClaimValue(input, 'expectedStatus'), RUN_CLAIM_STATUS_LIMIT, false),
    expectedLeaseOwner: boundedPersistedOwner(ownClaimValue(input, 'expectedLeaseOwner')),
    expectedLeaseExpiresAt: expectedLeaseExpiresValue === null
      ? null
      : canonicalClaimTimestamp(expectedLeaseExpiresValue),
    ...(expectedGuardRun ? { expectedGuardRun } : {}),
    outputRef: boundedClaimText(ownClaimValue(input, 'outputRef'), RUN_CLAIM_REF_LIMIT),
    status: boundedClaimText(ownClaimValue(input, 'status'), RUN_CLAIM_STATUS_LIMIT, false),
    now: canonicalClaimTimestamp(ownClaimValue(input, 'now')),
  }
}

function exactGuardRunSnapshot(row: any, expected: ValidatedExactNovelRunSnapshot) {
  return Number(row.id) === expected.id
    && Number(row.project_id) === expected.project_id
    && String(row.run_type || '') === expected.run_type
    && String(row.step_name || '') === expected.step_name
    && String(row.status || '') === expected.status
    && String(row.input_ref || '') === expected.input_ref
    && String(row.output_ref || '') === expected.output_ref
    && Number(row.duration_ms || 0) === expected.duration_ms
    && String(row.error_message || '') === expected.error_message
    && (row.scope_key ?? null) === expected.scope_key
    && (row.updated_at ?? null) === expected.updated_at
    && (row.lease_owner ?? null) === expected.lease_owner
    && (row.lease_expires_at ?? null) === expected.lease_expires_at
    && (row.cancel_requested_at ?? null) === expected.cancel_requested_at
    && String(row.created_at || '') === expected.created_at
}

function hasLiveRunExecution(row: any, nowMs: number) {
  const isLiveLease = (owner: unknown, expiresAt: unknown) => {
    if (typeof owner !== 'string' || owner.length === 0
      || typeof expiresAt !== 'string' || expiresAt.length > 40) return false
    const expiry = new Date(expiresAt)
    const expiryMs = expiry.getTime()
    return Number.isFinite(expiryMs) && expiry.toISOString() === expiresAt && expiryMs > nowMs
  }
  if (isLiveLease(row?.lease_owner, row?.lease_expires_at)) return true
  const payload = parseDbJson(row?.output_ref, {})
  const lock = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.lock : null
  return isLiveLease(lock?.owner, lock?.expires_at)
}

export async function claimNovelRunExecution(
  activeWorkspace: string,
  input: ClaimNovelRunExecutionInput,
): Promise<ClaimNovelRunExecutionResult> {
  const claim = validatedRunClaim(input)
  return withNovelDbWrite(activeWorkspace, db => {
    const selectRun = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
    const row = selectRun.get(claim.runId, claim.projectId) as any
    if (!row) return { claimed: false, run: null }

    const currentLeaseOwner = String(row.lease_owner || '')
    const currentLeaseExpiry = row.lease_expires_at ? new Date(String(row.lease_expires_at)).getTime() : 0
    const claimTime = new Date(claim.now).getTime()
    const liveLease = Boolean(currentLeaseOwner)
      && Number.isFinite(currentLeaseExpiry)
      && currentLeaseExpiry > claimTime
    const payload = parseDbJson(row.output_ref, {})
    const payloadLock = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.lock : null
    const payloadLockOwner = typeof payloadLock?.owner === 'string' ? payloadLock.owner : ''
    const payloadLockExpiry = typeof payloadLock?.expires_at === 'string'
      ? new Date(payloadLock.expires_at).getTime()
      : 0
    const livePayloadLock = Boolean(payloadLockOwner)
      && Number.isFinite(payloadLockExpiry)
      && payloadLockExpiry > claimTime
    if ((row.status === 'running' && (liveLease || livePayloadLock))
      || (liveLease && currentLeaseOwner !== claim.owner)
      || (livePayloadLock && payloadLockOwner !== claim.owner)) {
      return { claimed: false, run: runFromRow(row) }
    }

    const next = normalizeRunRecord({
      status: 'running',
      output_ref: claim.outputRef,
      lease_owner: claim.owner,
      lease_expires_at: claim.expiresAt,
      updated_at: claim.now,
    }, row)
    const result = db.query(`
      UPDATE runs
      SET status = ?, output_ref = ?, pipeline_chapter_failure_count = ?, pipeline_open_task_count = ?,
        pipeline_task_count = ?, updated_at = ?, lease_owner = ?, lease_expires_at = ?
      WHERE id = ? AND project_id = ? AND status = ? AND output_ref = ?
        AND COALESCE(lease_owner, '') = ? AND COALESCE(lease_expires_at, '') = ?
    `).run(
      next.status,
      next.output_ref || '',
      next.pipeline_chapter_failure_count ?? null,
      next.pipeline_open_task_count ?? null,
      next.pipeline_task_count ?? null,
      next.updated_at,
      next.lease_owner,
      next.lease_expires_at,
      claim.runId,
      claim.projectId,
      claim.expectedStatus,
      claim.expectedOutputRef,
      claim.expectedLeaseOwner ?? '',
      claim.expectedLeaseExpiresAt ?? '',
    ) as any
    const authoritative = selectRun.get(claim.runId, claim.projectId) as any
    return {
      claimed: Number(result?.changes || 0) === 1,
      run: authoritative ? runFromRow(authoritative) : null,
    }
  }, 'claim_novel_run_execution')
}

export async function recoverNovelRunExecution(
  activeWorkspace: string,
  input: RecoverNovelRunExecutionInput,
): Promise<RecoverNovelRunExecutionResult> {
  const recovery = validatedRunRecovery(input)
  return withNovelDbWrite(activeWorkspace, db => {
    const selectRun = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
    const row = selectRun.get(recovery.runId, recovery.projectId) as any
    if (!row) return { updated: false, run: null }

    if (recovery.expectedGuardRun) {
      const guardRow = selectRun.get(
        recovery.expectedGuardRun.id,
        recovery.expectedGuardRun.project_id,
      ) as any
      if (!guardRow || !exactGuardRunSnapshot(guardRow, recovery.expectedGuardRun)) {
        return { updated: false, run: runFromRow(row) }
      }
    }

    const exactSnapshot = String(row.status || '') === recovery.expectedStatus
      && (recovery.expectedInputRef === undefined
        || String(row.input_ref || '') === recovery.expectedInputRef)
      && String(row.output_ref || '') === recovery.expectedOutputRef
      && (row.lease_owner ?? null) === recovery.expectedLeaseOwner
      && (row.lease_expires_at ?? null) === recovery.expectedLeaseExpiresAt
    const nowMs = new Date(recovery.now).getTime()
    if (!exactSnapshot || hasLiveRunExecution(row, nowMs)) {
      return { updated: false, run: runFromRow(row) }
    }

    const next = normalizeRunRecord({
      status: recovery.status,
      output_ref: recovery.outputRef,
      lease_owner: null,
      lease_expires_at: null,
      updated_at: recovery.now,
    }, row)
    const result = db.query(`
      UPDATE runs
      SET status = ?, output_ref = ?, pipeline_chapter_failure_count = ?, pipeline_open_task_count = ?,
        pipeline_task_count = ?, updated_at = ?, lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ? AND project_id = ? AND status = ? AND output_ref = ?
        AND (? = 0 OR input_ref = ?)
        AND COALESCE(lease_owner, '') = ? AND COALESCE(lease_expires_at, '') = ?
    `).run(
      next.status,
      next.output_ref || '',
      next.pipeline_chapter_failure_count ?? null,
      next.pipeline_open_task_count ?? null,
      next.pipeline_task_count ?? null,
      next.updated_at,
      recovery.runId,
      recovery.projectId,
      recovery.expectedStatus,
      recovery.expectedOutputRef,
      recovery.expectedInputRef === undefined ? 0 : 1,
      recovery.expectedInputRef ?? '',
      recovery.expectedLeaseOwner ?? '',
      recovery.expectedLeaseExpiresAt ?? '',
    ) as any
    const authoritative = selectRun.get(recovery.runId, recovery.projectId) as any
    return {
      updated: Number(result?.changes || 0) === 1,
      run: authoritative ? runFromRow(authoritative) : null,
    }
  }, 'recover_novel_run_execution')
}

type NovelRunTaskStatus = 'open' | 'in_progress' | 'needs_review' | 'resolved'

type UpdateNovelRunTaskStatusInput = {
  projectId: number
  runId: number
  taskIndex: number
  status: NovelRunTaskStatus
  note?: string
  editorRevisionRunId?: number
  annotationKey?: string
  annotationStatus?: string
  now?: string
}

type UpdateNovelRunTasksStatusInput = {
  projectId: number
  runId: number
  taskIndices?: number[]
  status: NovelRunTaskStatus
  note?: string
  now?: string
}

function runTaskStatusError(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}

function taskStatusSummary(tasks: any[], timestamp: string) {
  return {
    total: tasks.length,
    resolved: tasks.filter(task => task?.task_status === 'resolved').length,
    needs_review: tasks.filter(task => task?.task_status === 'needs_review').length,
    open: tasks.filter(task => !task?.task_status || task.task_status === 'open').length,
    updated_at: timestamp,
  }
}

function taskWithStatus(task: any, status: NovelRunTaskStatus, note: string, timestamp: string) {
  return {
    ...task,
    task_status: status,
    status_note: note,
    updated_at: timestamp,
    started_at: status === 'in_progress' ? timestamp : task.started_at,
    needs_review_at: status === 'needs_review' ? timestamp : task.needs_review_at,
    resolved_at: status === 'resolved' ? timestamp : task.resolved_at,
  }
}

function persistNovelRunTasks(
  db: import('bun:sqlite').Database,
  input: { projectId: number; runId: number },
  run: NovelRunRecord,
  payload: any,
  nextTasks: any[],
  timestamp: string,
) {
  const summary = taskStatusSummary(nextTasks, timestamp)
  const nextRunStatus = nextTasks.length > 0 && summary.resolved === nextTasks.length
    ? 'completed'
    : run.status === 'completed' ? 'ready' : run.status
  db.query(`
    UPDATE runs
    SET status = ?, output_ref = ?, updated_at = ?
    WHERE id = ? AND project_id = ?
  `).run(
    nextRunStatus,
    JSON.stringify({ ...payload, tasks: nextTasks, task_status_summary: summary }),
    timestamp,
    input.runId,
    input.projectId,
  )
  const updatedRow = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
    .get(input.runId, input.projectId) as any
  return { run: runFromRow(updatedRow), task_status_summary: summary }
}

function editorRevisionClosesExactTask(db: import('bun:sqlite').Database, input: UpdateNovelRunTaskStatusInput) {
  const revisionRunId = Number(input.editorRevisionRunId || 0)
  if (!Number.isInteger(revisionRunId) || revisionRunId < 1) return false
  const row = db.query(`
    SELECT project_id, run_type, status, input_ref, output_ref
    FROM runs
    WHERE id = ? AND project_id = ?
    LIMIT 1
  `).get(revisionRunId, input.projectId) as any
  if (!row || row.run_type !== 'editor_revision' || !['completed', 'failed', 'canceled'].includes(String(row.status || ''))) {
    return false
  }
  const revisionInput = parseDbJson(row.input_ref, {})
  const checkpoint = parseDbJson(row.output_ref, {})
  const link = revisionInput?.repair_task_link
  return checkpoint?.prose_persisted === true
    && Number(link?.run_id) === input.runId
    && Number(link?.task_index) === input.taskIndex
}

export async function updateNovelRunTaskStatus(
  activeWorkspace: string,
  input: UpdateNovelRunTaskStatusInput,
) {
  const timestamp = input.now ? new Date(input.now).toISOString() : nowIso()
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
      .get(input.runId, input.projectId) as any
    if (!row) throw runTaskStatusError('NOVEL_RUN_NOT_FOUND', 'run not found')
    const run = runFromRow(row)
    const payload = parseDbJson(run.output_ref, {})
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    if (!Number.isInteger(input.taskIndex) || input.taskIndex < 0 || input.taskIndex >= tasks.length) {
      throw runTaskStatusError('NOVEL_RUN_TASK_NOT_FOUND', 'task not found')
    }

    const revisionRunId = Number(input.editorRevisionRunId || 0)
    if (input.editorRevisionRunId !== undefined && !editorRevisionClosesExactTask(db, input)) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_NOT_READY', 'editor revision task closure is not ready')
    }
    if (revisionRunId && !isEditorRevisionTaskClosureStatus(input.status)) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_INVALID', 'editor revision task closure status is invalid')
    }
    const currentTask = tasks[input.taskIndex] || {}
    const annotationKey = String(input.annotationKey || '').trim()
    const annotationStatus = String(input.annotationStatus || '').trim()
    if ((annotationKey && !annotationStatus) || (!annotationKey && annotationStatus)) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_INVALID', 'annotation closure receipt is incomplete')
    }
    const requiredAnnotationKey = revisionRunId
      ? requiredEditorRevisionTaskAnnotationKey(currentTask, input.status)
      : ''
    if (requiredAnnotationKey && (annotationKey !== requiredAnnotationKey || annotationStatus !== 'resolved')) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_INVALID', 'resolved task annotation closure receipt is required')
    }

    const receiptKey = String(revisionRunId)
    const currentReceipts = currentTask.editor_revision_closure_receipts
      && typeof currentTask.editor_revision_closure_receipts === 'object'
      && !Array.isArray(currentTask.editor_revision_closure_receipts)
      ? currentTask.editor_revision_closure_receipts
      : {}
    if (revisionRunId && currentReceipts[receiptKey]) {
      const existingReceipt = currentReceipts[receiptKey]
      const sameRequest = Number(existingReceipt.editor_revision_run_id) === revisionRunId
        && String(existingReceipt.task_status || '') === input.status
        && String(existingReceipt.note ?? currentTask.status_note ?? '') === String(input.note || '')
        && String(existingReceipt.annotation_key || '') === annotationKey
        && String(existingReceipt.annotation_status || '') === annotationStatus
      const currentMatchesReceipt = String(currentTask.task_status || '') === String(existingReceipt.task_status || '')
        && String(currentTask.status_note || '') === String(existingReceipt.note || '')
      if (!sameRequest || !currentMatchesReceipt) {
        throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_CONFLICT', 'editor revision task closure receipt conflicts with the committed request')
      }
      return {
        run,
        task: currentTask,
        task_status_summary: payload.task_status_summary || taskStatusSummary(tasks, timestamp),
        replayed: true,
      }
    }

    const receipt = revisionRunId ? {
      editor_revision_run_id: revisionRunId,
      repair_run_id: input.runId,
      task_index: input.taskIndex,
      task_status: input.status,
      note: String(input.note || ''),
      completed_at: timestamp,
      ...(annotationKey ? { annotation_key: annotationKey, annotation_status: annotationStatus } : {}),
    } : null
    const nextTask = {
      ...taskWithStatus(currentTask, input.status, String(input.note || ''), timestamp),
      ...(receipt ? {
        editor_revision_closure_receipts: {
          ...currentReceipts,
          [receiptKey]: receipt,
        },
      } : {}),
    }
    const nextTasks = tasks.map((task: any, index: number) => index === input.taskIndex ? nextTask : task)
    const persisted = persistNovelRunTasks(db, input, run, payload, nextTasks, timestamp)
    return {
      run: persisted.run,
      task: nextTask,
      task_status_summary: persisted.task_status_summary,
      replayed: false,
    }
  }, 'update-novel-run-task-status')
}

export async function updateNovelRunTasksStatus(
  activeWorkspace: string,
  input: UpdateNovelRunTasksStatusInput,
) {
  const timestamp = input.now ? new Date(input.now).toISOString() : nowIso()
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
      .get(input.runId, input.projectId) as any
    if (!row) throw runTaskStatusError('NOVEL_RUN_NOT_FOUND', 'run not found')
    const run = runFromRow(row)
    const payload = parseDbJson(run.output_ref, {})
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    const requested = Array.isArray(input.taskIndices) && input.taskIndices.length > 0
      ? input.taskIndices.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < tasks.length)
      : tasks.map((_: any, index: number) => index)
    if (!requested.length) throw runTaskStatusError('NOVEL_RUN_TASKS_NOT_FOUND', 'no valid task indices')
    const selected = new Set(requested)
    const note = String(input.note || '')
    const nextTasks = tasks.map((task: any, index: number) => selected.has(index)
      ? taskWithStatus(task, input.status, note, timestamp)
      : task)
    const persisted = persistNovelRunTasks(db, input, run, payload, nextTasks, timestamp)
    return {
      run: persisted.run,
      updated_count: requested.length,
      task_status_summary: persisted.task_status_summary,
    }
  }, 'update-novel-run-tasks-status')
}
