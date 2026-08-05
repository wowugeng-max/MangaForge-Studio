import { createHash } from 'node:crypto'
import { types } from 'node:util'
import {
  appendNovelRun,
  attachChapterStageRemoteIdentity,
  beginChapterStageArtifact,
  completeChapterStageArtifact,
  failChapterStageArtifact,
  findLatestSuccessfulChapterStageArtifact,
  findReusableChapterStageArtifact,
  invalidateChapterStageArtifactsFrom,
  serializeBoundedChapterStageArtifact,
  updateNovelRun,
} from '../../novel'
import type {
  NovelChapterStageArtifactIdentity,
  NovelChapterStageArtifactRecord,
} from '../../novel'
import type {
  ChapterStageResponseContract,
  ChapterTaskProvenance,
  ChapterTaskStage,
} from './types'
import { CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY, isChapterTaskId } from './types'
import { isProviderAvailabilityStageFailure } from './errors'

const ERROR_CODE_LIMIT = 80
const ERROR_MESSAGE_LIMIT = 500
const PROVENANCE_TEXT_LIMIT = 512
const SHA256_FINGERPRINT = /^sha256:[0-9a-f]{64}$/

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

function scrubDiagnostic(value: unknown, limit: number) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/Authorization\s*:\s*[^\r\n,;]+/gi, 'Authorization: [REDACTED]')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk_[A-Za-z0-9._-]+/g, '[REDACTED]')
    .replace(/\bsk-(?:proj|live)-(?=[A-Za-z0-9_]{8})[A-Za-z0-9_-]{8,}\b/gi, '[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_]{16,}(?![A-Za-z0-9_-])/gi, '[REDACTED]')
    .replace(/\bsk-(?=[A-Za-z0-9_-]{16,}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/gi, '[REDACTED]')
    .replace(/Cookie\s*:\s*[^\r\n,;]+/gi, 'Cookie: [REDACTED]')
    .replace(/(?:X-Api-Key|Api-Key)\s*:\s*[^\r\n,;]+/gi, 'Api-Key: [REDACTED]')
    .slice(0, limit)
}

function boundedProvenanceText(value: unknown) {
  if (typeof value !== 'string') return undefined
  if (value.length > PROVENANCE_TEXT_LIMIT) {
    return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
  }
  return scrubDiagnostic(value, PROVENANCE_TEXT_LIMIT)
}

function ownDataValue(value: unknown, field: string) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || types.isProxy(value)) {
    return undefined
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function boundedFailure(value: unknown) {
  const rawCode = ownDataValue(value, 'code')
  const rawMessage = ownDataValue(value, 'message')
  const code = scrubDiagnostic(
    typeof rawCode === 'string' ? rawCode : 'CHAPTER_STAGE_FAILED',
    ERROR_CODE_LIMIT,
  )
    || 'CHAPTER_STAGE_FAILED'
  const primitiveMessage = typeof value === 'string' ? value : 'Chapter stage failed'
  const message = scrubDiagnostic(
    typeof rawMessage === 'string' ? rawMessage : primitiveMessage,
    ERROR_MESSAGE_LIMIT,
  ) || 'Chapter stage failed'
  return { code, message }
}

function positiveSafeInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function exactTaskId(value: unknown) {
  return isChapterTaskId(value) ? value : undefined
}

function receiptPersistenceError(cause?: unknown) {
  const error = Object.assign(new Error('Chapter stage receipt persistence failed'), {
    code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
    error_code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
  })
  if (cause !== undefined) {
    Object.defineProperty(error, 'cause', { configurable: true, value: cause })
  }
  return error
}

async function finalizeStageRun(
  activeWorkspace: string,
  runId: number,
  data: Parameters<typeof updateNovelRun>[2],
) {
  let updated: Awaited<ReturnType<typeof updateNovelRun>>
  try {
    updated = await updateNovelRun(activeWorkspace, runId, data)
  } catch (error) {
    throw receiptPersistenceError(error)
  }
  if (ownDataValue(updated, 'id') !== runId) throw receiptPersistenceError()
  return updated
}

type ChapterStageArtifactRepository = {
  findReusable(
    activeWorkspace: string,
    identity: NovelChapterStageArtifactIdentity,
  ): Promise<NovelChapterStageArtifactRecord | null>
  findLatestSuccessful(
    activeWorkspace: string,
    taskId: string,
    stage: ChapterTaskStage,
  ): Promise<NovelChapterStageArtifactRecord | null>
  begin(
    activeWorkspace: string,
    identity: NovelChapterStageArtifactIdentity,
  ): Promise<NovelChapterStageArtifactRecord>
  complete(
    activeWorkspace: string,
    artifactId: number,
    output: Pick<NovelChapterStageArtifactRecord,
      'output_payload' | 'output_hash' | 'session_id' | 'snapshot_hash'>,
  ): Promise<NovelChapterStageArtifactRecord>
  fail(
    activeWorkspace: string,
    artifactId: number,
    status: 'failed' | 'ambiguous',
    errorCode: string,
  ): Promise<NovelChapterStageArtifactRecord>
  attachRemoteIdentity(
    activeWorkspace: string,
    artifactId: number,
    remote: { session_id: string; snapshot_hash: string },
  ): Promise<NovelChapterStageArtifactRecord>
  invalidateFrom(activeWorkspace: string, artifactId: number): Promise<number>
  serialize(value: unknown): string
}

const defaultArtifactRepository: ChapterStageArtifactRepository = {
  findReusable: findReusableChapterStageArtifact,
  findLatestSuccessful: findLatestSuccessfulChapterStageArtifact,
  begin: beginChapterStageArtifact,
  complete: completeChapterStageArtifact,
  fail: failChapterStageArtifact,
  attachRemoteIdentity: attachChapterStageRemoteIdentity,
  invalidateFrom: invalidateChapterStageArtifactsFrom,
  serialize: serializeBoundedChapterStageArtifact,
}

export type ChapterStageRecordContext = {
  artifactId: number
  attempt: number
  attachRemoteIdentity(remote: { session_id: string; snapshot_hash: string }): Promise<void>
}

function stageArtifactIdentity(
  provenance: ChapterTaskProvenance,
  stage: ChapterTaskStage,
  request: { prompt: string; responseContract: ChapterStageResponseContract },
): NovelChapterStageArtifactIdentity {
  const inputIdentity = {
    task_id: provenance.task_id,
    project_id: provenance.project_id,
    chapter_id: provenance.chapter_id,
    stage,
    prompt_hash: sha256(request.prompt),
    response_contract: request.responseContract,
    source: provenance.source,
    source_fingerprint: provenance.source_fingerprint,
    authority_fingerprint: provenance.authority_fingerprint,
    context_version: provenance.context_version,
  }
  return {
    task_id: provenance.task_id,
    project_id: provenance.project_id,
    chapter_id: provenance.chapter_id,
    stage,
    input_hash: sha256(JSON.stringify(inputIdentity)),
    response_contract: request.responseContract,
    source: provenance.source,
    source_fingerprint: provenance.source_fingerprint,
    authority_fingerprint: provenance.authority_fingerprint,
    context_version: provenance.context_version,
    server_id: provenance.server_id ?? null,
    key_id: provenance.key_id ?? null,
    adapter_id: provenance.adapter_id ?? null,
    agent_id: provenance.agent_id ?? null,
    model: provenance.model ?? null,
  }
}

const ARTIFACT_IDENTITY_FIELDS = [
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
  'server_id',
  'key_id',
  'adapter_id',
  'agent_id',
  'model',
] as const

function artifactIdentityMatches(
  artifact: NovelChapterStageArtifactRecord,
  identity: NovelChapterStageArtifactIdentity,
) {
  return ARTIFACT_IDENTITY_FIELDS.every(field => artifact[field] === identity[field])
}

function hasAmbiguousMcpMutationEvidence(error: unknown) {
  const direct = ownDataValue(error, 'receipt_status')
  const details = ownDataValue(error, 'details')
  const nested = ownDataValue(details, 'receipt_status')
  return direct === 'send_unknown'
    || direct === 'remote_cancel_unknown'
    || nested === 'send_unknown'
    || nested === 'remote_cancel_unknown'
}

export function projectChapterTaskProvenance(value: unknown): ChapterTaskProvenance {
  const taskId = exactTaskId(ownDataValue(value, 'task_id'))
  const projectId = positiveSafeInteger(ownDataValue(value, 'project_id'))
  const chapterId = positiveSafeInteger(ownDataValue(value, 'chapter_id'))
  const source = ownDataValue(value, 'source')
  const sourceFingerprint = ownDataValue(value, 'source_fingerprint')
  const authorityFingerprint = ownDataValue(value, 'authority_fingerprint')
  const contextVersion = ownDataValue(value, 'context_version')
  if (!taskId
    || projectId === undefined
    || chapterId === undefined
    || (source !== 'model' && source !== 'mcp')
    || typeof sourceFingerprint !== 'string'
    || !SHA256_FINGERPRINT.test(sourceFingerprint)
    || typeof authorityFingerprint !== 'string'
    || !SHA256_FINGERPRINT.test(authorityFingerprint)
    || typeof contextVersion !== 'string'
    || !SHA256_FINGERPRINT.test(contextVersion)) {
    throw new TypeError('Invalid chapter task provenance')
  }

  const provenance: ChapterTaskProvenance = {
    task_id: taskId,
    project_id: projectId,
    chapter_id: chapterId,
    source,
    source_fingerprint: sourceFingerprint,
    authority_fingerprint: authorityFingerprint,
    context_version: contextVersion,
  }
  const modelId = positiveSafeInteger(ownDataValue(value, 'model_id'))
  const keyId = positiveSafeInteger(ownDataValue(value, 'key_id'))
  if (modelId !== undefined) provenance.model_id = modelId
  if (keyId !== undefined) provenance.key_id = keyId
  for (const field of ['server_id', 'adapter_id', 'agent_id', 'model', 'session_id'] as const) {
    const projected = boundedProvenanceText(ownDataValue(value, field))
    if (projected !== undefined) provenance[field] = projected
  }
  return Object.freeze(provenance)
}

function projectChapterTaskAuthority(value: unknown): ChapterTaskProvenance {
  const provenance = { ...projectChapterTaskProvenance(value) }
  delete provenance.session_id
  return Object.freeze(provenance)
}

export function createChapterStageRecorder(input: {
  activeWorkspace: string
  provenance: () => ChapterTaskProvenance
  scrubError?: (error: unknown) => { code: string; message: string }
  artifacts?: Partial<ChapterStageArtifactRepository>
}) {
  const artifacts: ChapterStageArtifactRepository = {
    ...defaultArtifactRepository,
    ...input.artifacts,
  }
  return async function record<T>(stage: ChapterTaskStage, request: {
    prompt: string
    responseContract: ChapterStageResponseContract
  }, operation: (context: ChapterStageRecordContext) => Promise<T>): Promise<T> {
    const startedAt = Date.now()
    const initialProvenance = projectChapterTaskAuthority(input.provenance())
    const currentProvenance = () => {
      try {
        return projectChapterTaskAuthority(input.provenance())
      } catch {
        return initialProvenance
      }
    }
    const identity = stageArtifactIdentity(initialProvenance, stage, request)
    let invocationProvenance: ChapterTaskProvenance | undefined
    let reusable: NovelChapterStageArtifactRecord | null
    try {
      reusable = await artifacts.findReusable(input.activeWorkspace, identity)
    } catch (error) {
      throw receiptPersistenceError(error)
    }

    const successReceipt = (
      artifact: NovelChapterStageArtifactRecord,
      cacheHit: boolean,
    ) => {
      return {
        receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        ...(invocationProvenance || currentProvenance()),
        stage,
        status: 'success' as const,
        attempt: artifact.attempt,
        artifact_id: artifact.id,
        input_hash: artifact.input_hash,
        output_hash: artifact.output_hash,
        response_contract: artifact.response_contract,
        cache_hit: cacheHit,
        elapsed_ms: Date.now() - startedAt,
      }
    }

    if (reusable) {
      let result: T
      try {
        result = JSON.parse(reusable.output_payload) as T
        const run = await appendNovelRun(input.activeWorkspace, {
          project_id: initialProvenance.project_id,
          run_type: 'chapter_generation_stage',
          step_name: stage,
          status: 'success',
          input_ref: JSON.stringify({
            receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
            ...initialProvenance,
            stage,
            response_contract: request.responseContract,
            prompt_hash: sha256(request.prompt),
            input_hash: identity.input_hash,
            artifact_id: reusable.id,
            attempt: reusable.attempt,
          }),
          output_ref: JSON.stringify(successReceipt(reusable, true)),
        })
        if (ownDataValue(run, 'id') === undefined) throw receiptPersistenceError()
      } catch (error) {
        if (ownDataValue(error, 'code') === 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED') throw error
        throw receiptPersistenceError(error)
      }
      return result
    }

    let artifact: NovelChapterStageArtifactRecord
    try {
      const latest = await artifacts.findLatestSuccessful(
        input.activeWorkspace,
        identity.task_id,
        stage,
      )
      if (latest && !artifactIdentityMatches(latest, identity)) {
        await artifacts.invalidateFrom(input.activeWorkspace, latest.id)
      }
      artifact = await artifacts.begin(input.activeWorkspace, identity)
    } catch (error) {
      throw receiptPersistenceError(error)
    }

    let run: Awaited<ReturnType<typeof appendNovelRun>>
    try {
      run = await appendNovelRun(input.activeWorkspace, {
        project_id: initialProvenance.project_id,
        run_type: 'chapter_generation_stage',
        step_name: stage,
        status: 'running',
        input_ref: JSON.stringify({
          receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
          ...initialProvenance,
          stage,
          response_contract: request.responseContract,
          prompt_hash: sha256(request.prompt),
          input_hash: identity.input_hash,
          artifact_id: artifact.id,
          attempt: artifact.attempt,
        }),
        output_ref: '',
      })
    } catch (error) {
      try {
        await artifacts.fail(
          input.activeWorkspace,
          artifact.id,
          'failed',
          'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
        )
      } catch {
        // The stable persistence error below is the only externally durable-safe signal.
      }
      throw receiptPersistenceError(error)
    }

    let attachedRemote: { session_id: string; snapshot_hash: string } | null = null
    const context: ChapterStageRecordContext = Object.freeze({
      artifactId: artifact.id,
      attempt: artifact.attempt,
      async attachRemoteIdentity(remote) {
        try {
          const attached = await artifacts.attachRemoteIdentity(
            input.activeWorkspace,
            artifact.id,
            remote,
          )
          if (attached.session_id === null || attached.snapshot_hash === null) {
            throw receiptPersistenceError()
          }
          await finalizeStageRun(input.activeWorkspace, run.id, {
            status: 'running',
            output_ref: JSON.stringify({
              receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
              ...currentProvenance(),
              stage,
              status: 'running',
              attempt: artifact.attempt,
              artifact_id: artifact.id,
              input_hash: artifact.input_hash,
              response_contract: artifact.response_contract,
              session_id: attached.session_id,
              snapshot_hash: attached.snapshot_hash,
            }),
          })
          attachedRemote = {
            session_id: attached.session_id,
            snapshot_hash: attached.snapshot_hash,
          }
          invocationProvenance = projectChapterTaskProvenance({
            ...currentProvenance(),
            session_id: attached.session_id,
          })
        } catch (error) {
          if (ownDataValue(error, 'code') === 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED') throw error
          throw receiptPersistenceError(error)
        }
      },
    })

    let result: T
    let serialized: string
    try {
      result = await operation(context)
      serialized = artifacts.serialize(result)
    } catch (error) {
      const redactOptionalProviderDetail = stage === 'quality_repair'
        && isProviderAvailabilityStageFailure(error)
      let scrubbed: unknown
      try {
        scrubbed = input.scrubError ? input.scrubError(error) : error
      } catch {
        scrubbed = error
      }
      const failure = boundedFailure(scrubbed)
      const artifactStatus = failure.code === 'MCP_SEND_UNKNOWN'
        || hasAmbiguousMcpMutationEvidence(error)
        ? 'ambiguous'
        : 'failed'
      const persistedFailureMessage = redactOptionalProviderDetail
        ? 'Optional quality revision unavailable'
        : failure.message
      let persistenceFailure: unknown
      try {
        await artifacts.fail(input.activeWorkspace, artifact.id, artifactStatus, failure.code)
      } catch (artifactFailure) {
        persistenceFailure = artifactFailure
      }
      try {
        await finalizeStageRun(input.activeWorkspace, run.id, {
          status: 'failed',
          error_message: persistedFailureMessage,
          output_ref: JSON.stringify({
            receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
            ...currentProvenance(),
            stage,
            status: 'failed',
            attempt: artifact.attempt,
            artifact_id: artifact.id,
            input_hash: artifact.input_hash,
            response_contract: artifact.response_contract,
            elapsed_ms: Date.now() - startedAt,
            error_code: failure.code,
          }),
        })
      } catch (runFailure) {
        persistenceFailure = persistenceFailure
          ? new AggregateError([persistenceFailure, runFailure], 'Chapter stage failure persistence failed')
          : runFailure
      }
      if (persistenceFailure) throw receiptPersistenceError(persistenceFailure)
      throw error
    }

    let completed: NovelChapterStageArtifactRecord
    try {
      const outputHash = sha256(serialized)
      completed = await artifacts.complete(input.activeWorkspace, artifact.id, {
        output_payload: serialized,
        output_hash: outputHash,
        session_id: attachedRemote?.session_id ?? null,
        snapshot_hash: attachedRemote?.snapshot_hash ?? null,
      })
    } catch (error) {
      throw receiptPersistenceError(error)
    }
    await finalizeStageRun(input.activeWorkspace, run.id, {
      status: 'success',
      output_ref: JSON.stringify(successReceipt(completed, false)),
    })
    return result
  }
}
