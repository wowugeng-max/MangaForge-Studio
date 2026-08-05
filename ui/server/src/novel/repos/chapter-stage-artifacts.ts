import { createHash } from 'node:crypto'
import { types } from 'node:util'
import type { Database } from 'bun:sqlite'
import { ensureSqliteSchema, openDb } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { withNovelDbWrite } from '../sql-rows'
import type {
  NovelChapterStageArtifactIdentity,
  NovelChapterStageArtifactRecord,
  NovelChapterStageArtifactStatus,
} from '../types'
import type { ChapterTaskStage } from '../../novel-writing-service/generation-source/types'

export const CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES = 2 * 1024 * 1024
export const CHAPTER_STAGE_ARTIFACT_MAX_DEPTH = 32
export const CHAPTER_STAGE_ARTIFACT_MAX_FIELDS = 8_192
export const CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS = 1_048_576
export const CHAPTER_STAGE_ARTIFACT_ERROR_CODE_CHARS = 80

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{0,511}$/
const FINGERPRINT = /^sha256:[0-9a-f]{64}$/
const ERROR_CODE = /^[A-Za-z][A-Za-z0-9_.:-]*$/
const PROVENANCE_ID_MAX_CHARS = 160
const STAGES = new Set<ChapterTaskStage>([
  'draft',
  'word_target_repair',
  'commercial_editor_rewrite',
  'meme_polish',
  'readability_review',
  'humanize',
  'quality_review',
  'quality_recheck',
  'structured_review_fill',
  'quality_repair',
  'manual_recheck',
  'editor_report',
  'revision',
  'post_revision_review',
  'story_state_sync',
])
const RESPONSE_CONTRACTS = new Set([
  'draft_prose',
  'word_target_prose',
  'editor_rewrite_prose',
  'meme_polish_prose',
  'readability_json',
  'humanize_prose',
  'quality_review_json',
  'structured_review_json',
  'revision_prose',
  'editor_report_json',
  'story_state_json',
])

function artifactError(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}

function identityError() {
  return artifactError('CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID', 'Invalid chapter stage artifact identity')
}

function transitionError() {
  return artifactError('CHAPTER_STAGE_ARTIFACT_INVALID_TRANSITION', 'Invalid chapter stage artifact status transition')
}

function requirePositiveId(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw identityError()
  return value
}

function requireIdentifier(value: unknown) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) throw identityError()
  return value
}

function requireNullableIdentifier(value: unknown) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !value.trim() || value.length > PROVENANCE_ID_MAX_CHARS) {
    throw identityError()
  }
  return value
}

function requireFingerprint(value: unknown) {
  if (typeof value !== 'string' || !FINGERPRINT.test(value)) throw identityError()
  return value
}

function requireNullablePositiveId(value: unknown) {
  if (value === undefined || value === null) return null
  return requirePositiveId(value)
}

function projectOwnDataRecord(
  value: unknown,
  requiredFields: readonly string[],
  optionalFields: readonly string[],
  invalid: () => Error,
) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw invalid()
  const projected = Object.create(null) as Record<string, unknown>
  for (const field of requiredFields) {
    let descriptor: PropertyDescriptor | undefined
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, field)
    } catch {
      throw invalid()
    }
    if (!descriptor || !('value' in descriptor)) throw invalid()
    projected[field] = descriptor.value
  }
  for (const field of optionalFields) {
    let descriptor: PropertyDescriptor | undefined
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, field)
    } catch {
      throw invalid()
    }
    if (!descriptor) {
      projected[field] = undefined
      continue
    }
    if (!('value' in descriptor)) throw invalid()
    projected[field] = descriptor.value
  }
  return projected
}

function validateIdentity(value: NovelChapterStageArtifactIdentity): Required<NovelChapterStageArtifactIdentity> {
  const projected = projectOwnDataRecord(value, [
    'task_id',
    'project_id',
    'chapter_id',
    'stage',
    'input_hash',
    'response_contract',
    'source',
    'source_fingerprint',
    'authority_fingerprint',
    'context_version',
  ], [
    'server_id',
    'key_id',
    'adapter_id',
    'agent_id',
    'model',
  ], identityError)
  const stage = projected.stage as ChapterTaskStage
  const responseContract = projected.response_contract as NovelChapterStageArtifactIdentity['response_contract']
  if (!STAGES.has(stage) || !RESPONSE_CONTRACTS.has(responseContract)) throw identityError()
  if (projected.source !== 'model' && projected.source !== 'mcp') throw identityError()
  return {
    task_id: requireIdentifier(projected.task_id),
    project_id: requirePositiveId(projected.project_id),
    chapter_id: requirePositiveId(projected.chapter_id),
    stage,
    input_hash: requireFingerprint(projected.input_hash),
    response_contract: responseContract,
    source: projected.source,
    source_fingerprint: requireFingerprint(projected.source_fingerprint),
    authority_fingerprint: requireFingerprint(projected.authority_fingerprint),
    context_version: requireFingerprint(projected.context_version),
    server_id: requireNullableIdentifier(projected.server_id),
    key_id: requireNullablePositiveId(projected.key_id),
    adapter_id: requireNullableIdentifier(projected.adapter_id),
    agent_id: requireNullableIdentifier(projected.agent_id),
    model: requireNullableIdentifier(projected.model),
  }
}

function remoteIdentityError() {
  return artifactError('CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID', 'Invalid chapter stage artifact remote identity')
}

function requireRemoteIdentifier(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > PROVENANCE_ID_MAX_CHARS) {
    throw remoteIdentityError()
  }
  return value
}

function hashPayload(payload: string) {
  return `sha256:${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

export function serializeBoundedChapterStageArtifact(value: unknown): string {
  let fields = 0
  const ancestors = new WeakSet<object>()

  const copy = (current: unknown, depth: number): unknown => {
    if (typeof current === 'string') {
      if (current.length > CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS) {
        throw new TypeError('Chapter stage artifact string exceeds character limit')
      }
      return current
    }
    if (current === null || typeof current === 'boolean') return current
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new TypeError('Chapter stage artifact number must be finite')
      return current
    }
    if (typeof current !== 'object') throw new TypeError('Chapter stage artifact value is not supported')
    if (types.isProxy(current)) throw new TypeError('Chapter stage artifact proxy is not supported')
    if (depth > CHAPTER_STAGE_ARTIFACT_MAX_DEPTH) {
      throw new TypeError('Chapter stage artifact depth limit exceeded')
    }
    if (ancestors.has(current)) throw new TypeError('Chapter stage artifact cycle is not supported')

    let prototype: object | null
    let descriptors: PropertyDescriptorMap
    try {
      prototype = Object.getPrototypeOf(current)
      descriptors = Object.getOwnPropertyDescriptors(current)
    } catch {
      throw new TypeError('Chapter stage artifact object cannot be inspected safely')
    }
    const array = Array.isArray(current)
    if ((!array && prototype !== Object.prototype && prototype !== null)
      || (array && prototype !== Array.prototype)) {
      throw new TypeError('Chapter stage artifact object type is not supported')
    }
    const ownKeys = Reflect.ownKeys(descriptors)
    if (ownKeys.some(key => typeof key === 'symbol')) {
      throw new TypeError('Chapter stage artifact symbol keys are not supported')
    }
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor)) {
        throw new TypeError('Chapter stage artifact accessors are not supported')
      }
    }

    ancestors.add(current)
    try {
      if (array) {
        const lengthDescriptor = descriptors.length
        const length = typeof lengthDescriptor?.value === 'number' ? lengthDescriptor.value : -1
        const expectedKeys = new Set(['length'])
        fields += length
        if (!Number.isSafeInteger(length) || length < 0 || fields > CHAPTER_STAGE_ARTIFACT_MAX_FIELDS) {
          throw new TypeError('Chapter stage artifact field limit exceeded')
        }
        const output: unknown[] = []
        for (let index = 0; index < length; index += 1) {
          const key = String(index)
          expectedKeys.add(key)
          const descriptor = descriptors[key]
          if (!descriptor || !('value' in descriptor)) {
            throw new TypeError('Chapter stage artifact sparse arrays are not supported')
          }
          output.push(copy(descriptor.value, depth + 1))
        }
        if ((ownKeys as string[]).some(key => !expectedKeys.has(key))) {
          throw new TypeError('Chapter stage artifact array properties are not supported')
        }
        return output
      }

      const enumerableKeys = (ownKeys as string[]).filter(key => descriptors[key]?.enumerable)
      if (enumerableKeys.some(key => key.length > CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS)) {
        throw new TypeError('Chapter stage artifact string exceeds character limit')
      }
      if (enumerableKeys.length !== ownKeys.length) {
        throw new TypeError('Chapter stage artifact hidden properties are not supported')
      }
      fields += enumerableKeys.length
      if (fields > CHAPTER_STAGE_ARTIFACT_MAX_FIELDS) {
        throw new TypeError('Chapter stage artifact field limit exceeded')
      }
      const output = Object.create(null) as Record<string, unknown>
      for (const key of enumerableKeys) output[key] = copy(descriptors[key]!.value, depth + 1)
      return output
    } finally {
      ancestors.delete(current)
    }
  }

  const serialized = JSON.stringify(copy(value, 1))
  if (typeof serialized !== 'string') throw new TypeError('Chapter stage artifact value is not supported')
  if (Buffer.byteLength(serialized, 'utf8') > CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES) {
    throw new TypeError('Chapter stage artifact payload exceeds byte limit')
  }
  return serialized
}

function validateExactPayload(value: unknown) {
  if (typeof value !== 'string'
    || Buffer.byteLength(value, 'utf8') > CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES) {
    throw artifactError('CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID', 'Invalid chapter stage artifact payload')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw artifactError('CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID', 'Invalid chapter stage artifact payload')
  }
  let serialized: string
  try {
    serialized = serializeBoundedChapterStageArtifact(parsed)
  } catch {
    throw artifactError('CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID', 'Invalid chapter stage artifact payload')
  }
  if (serialized !== value) {
    throw artifactError('CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID', 'Invalid chapter stage artifact payload')
  }
  return value
}

function payloadError() {
  return artifactError('CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID', 'Invalid chapter stage artifact payload')
}

function artifactFromRow(row: any): NovelChapterStageArtifactRecord {
  return {
    id: Number(row.id),
    task_id: String(row.task_id),
    project_id: Number(row.project_id),
    chapter_id: Number(row.chapter_id),
    stage: row.stage,
    attempt: Number(row.attempt),
    status: row.status,
    input_hash: String(row.input_hash),
    output_hash: String(row.output_hash || ''),
    response_contract: row.response_contract,
    output_payload: String(row.output_payload || ''),
    source: row.source,
    source_fingerprint: String(row.source_fingerprint),
    authority_fingerprint: String(row.authority_fingerprint),
    context_version: String(row.context_version),
    server_id: row.server_id === null ? null : String(row.server_id),
    key_id: row.key_id === null ? null : Number(row.key_id),
    adapter_id: row.adapter_id === null ? null : String(row.adapter_id),
    agent_id: row.agent_id === null ? null : String(row.agent_id),
    model: row.model === null ? null : String(row.model),
    session_id: row.session_id === null ? null : String(row.session_id),
    snapshot_hash: row.snapshot_hash === null ? null : String(row.snapshot_hash),
    error_code: String(row.error_code || ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function getArtifact(db: Database, id: number) {
  const row = db.query('SELECT * FROM chapter_stage_artifacts WHERE id = ? LIMIT 1').get(id) as any
  return row ? artifactFromRow(row) : null
}

function requireRunningArtifact(db: Database, id: number) {
  const artifact = getArtifact(db, requirePositiveId(id))
  if (!artifact || artifact.status !== 'running') throw transitionError()
  return artifact
}

async function readArtifact<T>(activeWorkspace: string, reader: (db: Database) => T) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return reader(db)
  } finally {
    db.close()
  }
}

export async function beginChapterStageArtifact(
  activeWorkspace: string,
  identity: NovelChapterStageArtifactIdentity,
): Promise<NovelChapterStageArtifactRecord> {
  const exact = validateIdentity(identity)
  return withNovelDbWrite(activeWorkspace, db => {
    const scope = db.query(`
      SELECT chapters.id
      FROM chapters JOIN projects ON projects.id = chapters.project_id
      WHERE chapters.id = ? AND chapters.project_id = ? AND projects.id = ?
      LIMIT 1
    `).get(exact.chapter_id, exact.project_id, exact.project_id)
    if (!scope) {
      throw artifactError('CHAPTER_STAGE_ARTIFACT_SCOPE_INVALID', 'Invalid chapter stage artifact scope')
    }
    const attempt = Number((db.query(`
      SELECT COALESCE(MAX(attempt), 0) + 1 AS attempt
      FROM chapter_stage_artifacts WHERE task_id = ? AND stage = ?
    `).get(exact.task_id, exact.stage) as any)?.attempt || 1)
    const result = db.query(`
      INSERT INTO chapter_stage_artifacts (
        task_id, project_id, chapter_id, stage, attempt, status,
        input_hash, response_contract, source, source_fingerprint,
        authority_fingerprint, context_version, server_id, key_id,
        adapter_id, agent_id, model
      ) VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exact.task_id,
      exact.project_id,
      exact.chapter_id,
      exact.stage,
      attempt,
      exact.input_hash,
      exact.response_contract,
      exact.source,
      exact.source_fingerprint,
      exact.authority_fingerprint,
      exact.context_version,
      exact.server_id,
      exact.key_id,
      exact.adapter_id,
      exact.agent_id,
      exact.model,
    )
    return getArtifact(db, Number(result.lastInsertRowid))!
  }, 'begin-chapter-stage-artifact')
}

export async function findReusableChapterStageArtifact(
  activeWorkspace: string,
  identity: NovelChapterStageArtifactIdentity,
): Promise<NovelChapterStageArtifactRecord | null> {
  const exact = validateIdentity(identity)
  return readArtifact(activeWorkspace, db => {
    const row = db.query(`
      SELECT * FROM chapter_stage_artifacts
      WHERE status = 'success'
        AND task_id = ? AND project_id = ? AND chapter_id = ? AND stage = ?
        AND input_hash = ? AND response_contract = ? AND source = ?
        AND source_fingerprint = ? AND authority_fingerprint = ? AND context_version = ?
        AND server_id IS ? AND key_id IS ? AND adapter_id IS ? AND agent_id IS ? AND model IS ?
      ORDER BY id DESC LIMIT 1
    `).get(
      exact.task_id,
      exact.project_id,
      exact.chapter_id,
      exact.stage,
      exact.input_hash,
      exact.response_contract,
      exact.source,
      exact.source_fingerprint,
      exact.authority_fingerprint,
      exact.context_version,
      exact.server_id,
      exact.key_id,
      exact.adapter_id,
      exact.agent_id,
      exact.model,
    ) as any
    if (!row) return null
    const artifact = artifactFromRow(row)
    try {
      validateExactPayload(artifact.output_payload)
    } catch {
      return null
    }
    return FINGERPRINT.test(artifact.output_hash) && hashPayload(artifact.output_payload) === artifact.output_hash
      ? artifact
      : null
  })
}

export async function findLatestSuccessfulChapterStageArtifact(
  activeWorkspace: string,
  taskId: string,
  stage: ChapterTaskStage,
): Promise<NovelChapterStageArtifactRecord | null> {
  const exactTaskId = requireIdentifier(taskId)
  if (!STAGES.has(stage)) throw identityError()
  return readArtifact(activeWorkspace, db => {
    const row = db.query(`
      SELECT * FROM chapter_stage_artifacts
      WHERE task_id = ? AND stage = ? AND status IN ('success', 'compacted')
      ORDER BY id DESC LIMIT 1
    `).get(exactTaskId, stage) as any
    return row ? artifactFromRow(row) : null
  })
}

export async function completeChapterStageArtifact(
  activeWorkspace: string,
  id: number,
  output: Pick<NovelChapterStageArtifactRecord,
    'output_payload' | 'output_hash' | 'session_id' | 'snapshot_hash'>,
): Promise<NovelChapterStageArtifactRecord> {
  const projected = projectOwnDataRecord(output, [
    'output_payload',
    'output_hash',
    'session_id',
    'snapshot_hash',
  ], [], payloadError)
  const outputPayload = validateExactPayload(projected.output_payload)
  if (typeof projected.output_hash !== 'string'
    || !FINGERPRINT.test(projected.output_hash)
    || hashPayload(outputPayload) !== projected.output_hash) {
    throw artifactError('CHAPTER_STAGE_ARTIFACT_HASH_MISMATCH', 'Chapter stage artifact output hash mismatch')
  }
  const sessionId = projected.session_id === null ? null : requireRemoteIdentifier(projected.session_id)
  const snapshotHash = projected.snapshot_hash === null ? null : requireRemoteIdentifier(projected.snapshot_hash)
  if ((sessionId === null) !== (snapshotHash === null)) throw remoteIdentityError()

  return withNovelDbWrite(activeWorkspace, db => {
    const current = requireRunningArtifact(db, id)
    if ((current.session_id !== null && current.session_id !== sessionId)
      || (current.snapshot_hash !== null && current.snapshot_hash !== snapshotHash)) {
      throw transitionError()
    }
    db.query(`
      UPDATE chapter_stage_artifacts
      SET status = 'success', output_payload = ?, output_hash = ?,
          session_id = ?, snapshot_hash = ?, error_code = '', updated_at = datetime('now')
      WHERE id = ? AND status = 'running'
    `).run(outputPayload, projected.output_hash, sessionId, snapshotHash, current.id)
    return getArtifact(db, current.id)!
  }, 'complete-chapter-stage-artifact')
}

function sanitizedErrorCode(value: unknown, status: 'failed' | 'ambiguous') {
  if (typeof value !== 'string') return status === 'ambiguous' ? 'CHAPTER_STAGE_AMBIGUOUS' : 'CHAPTER_STAGE_FAILED'
  const bounded = value.length > CHAPTER_STAGE_ARTIFACT_ERROR_CODE_CHARS
    ? value.slice(0, CHAPTER_STAGE_ARTIFACT_ERROR_CODE_CHARS)
    : value
  const trimmed = bounded.trim()
  if (!ERROR_CODE.test(trimmed)) return status === 'ambiguous' ? 'CHAPTER_STAGE_AMBIGUOUS' : 'CHAPTER_STAGE_FAILED'
  return trimmed.toUpperCase()
}

export async function failChapterStageArtifact(
  activeWorkspace: string,
  id: number,
  status: Extract<NovelChapterStageArtifactStatus, 'failed' | 'ambiguous'>,
  errorCode: string,
): Promise<NovelChapterStageArtifactRecord> {
  if (status !== 'failed' && status !== 'ambiguous') throw transitionError()
  const safeCode = sanitizedErrorCode(errorCode, status)
  return withNovelDbWrite(activeWorkspace, db => {
    const current = requireRunningArtifact(db, id)
    db.query(`
      UPDATE chapter_stage_artifacts
      SET status = ?, error_code = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'running'
    `).run(status, safeCode, current.id)
    return getArtifact(db, current.id)!
  }, 'fail-chapter-stage-artifact')
}

export async function attachChapterStageRemoteIdentity(
  activeWorkspace: string,
  id: number,
  remote: { session_id: string; snapshot_hash: string },
): Promise<NovelChapterStageArtifactRecord> {
  const projected = projectOwnDataRecord(remote, ['session_id', 'snapshot_hash'], [], remoteIdentityError)
  const sessionId = requireRemoteIdentifier(projected.session_id)
  const snapshotHash = requireRemoteIdentifier(projected.snapshot_hash)
  return withNovelDbWrite(activeWorkspace, db => {
    const current = requireRunningArtifact(db, id)
    if (current.session_id !== null || current.snapshot_hash !== null) throw transitionError()
    db.query(`
      UPDATE chapter_stage_artifacts
      SET session_id = ?, snapshot_hash = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'running' AND session_id IS NULL AND snapshot_hash IS NULL
    `).run(sessionId, snapshotHash, current.id)
    return getArtifact(db, current.id)!
  }, 'attach-chapter-stage-remote-identity')
}

export async function invalidateChapterStageArtifactsFrom(
  activeWorkspace: string,
  artifactId: number,
): Promise<number> {
  return withNovelDbWrite(activeWorkspace, db => {
    const anchor = getArtifact(db, requirePositiveId(artifactId))
    if (!anchor) throw identityError()
    const result = db.query(`
      UPDATE chapter_stage_artifacts
      SET status = 'invalidated', updated_at = datetime('now')
      WHERE task_id = ? AND id >= ? AND status = 'success'
    `).run(anchor.task_id, anchor.id)
    return Number(result.changes)
  }, 'invalidate-chapter-stage-artifacts')
}

export async function compactChapterTaskArtifacts(
  activeWorkspace: string,
  taskId: string,
): Promise<number> {
  const exactTaskId = requireIdentifier(taskId)
  return withNovelDbWrite(activeWorkspace, db => {
    const result = db.query(`
      UPDATE chapter_stage_artifacts
      SET status = 'compacted', output_payload = '', updated_at = datetime('now')
      WHERE task_id = ? AND status = 'success'
    `).run(exactTaskId)
    return Number(result.changes)
  }, 'compact-chapter-task-artifacts')
}
