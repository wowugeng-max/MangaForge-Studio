import { createHash } from 'node:crypto'
import { types } from 'node:util'
import { appendNovelRun, updateNovelRun } from '../../novel'
import type {
  ChapterStageResponseContract,
  ChapterTaskProvenance,
  ChapterTaskStage,
} from './types'
import { CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY } from './types'
import { isProviderAvailabilityStageFailure } from './errors'

const ERROR_CODE_LIMIT = 80
const ERROR_MESSAGE_LIMIT = 500
const PROVENANCE_TEXT_LIMIT = 512
const SHA256_FINGERPRINT = /^sha256:[0-9a-f]{64}$/
const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/

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
  return typeof value === 'string' && TASK_ID.test(value) ? value : undefined
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

export function createChapterStageRecorder(input: {
  activeWorkspace: string
  provenance: () => ChapterTaskProvenance
  scrubError?: (error: unknown) => { code: string; message: string }
}) {
  return async function record<T>(stage: ChapterTaskStage, request: {
    prompt: string
    responseContract: ChapterStageResponseContract
  }, operation: () => Promise<T>): Promise<T> {
    const startedAt = Date.now()
    const initialProvenance = projectChapterTaskProvenance(input.provenance())
    const currentProvenance = () => {
      try {
        return projectChapterTaskProvenance(input.provenance())
      } catch {
        return initialProvenance
      }
    }
    const run = await appendNovelRun(input.activeWorkspace, {
      project_id: initialProvenance.project_id,
      run_type: 'chapter_generation_stage',
      step_name: stage,
      status: 'running',
      input_ref: JSON.stringify({
        receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        ...initialProvenance,
        stage,
        response_contract: request.responseContract,
        prompt_hash: `sha256:${createHash('sha256').update(request.prompt, 'utf8').digest('hex')}`,
      }),
      output_ref: '',
    })
    let result: T
    try {
      result = await operation()
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
      const persistedFailureMessage = redactOptionalProviderDetail
        ? 'Optional quality revision unavailable'
        : failure.message
      try {
        await finalizeStageRun(input.activeWorkspace, run.id, {
          status: 'failed',
          error_message: persistedFailureMessage,
          output_ref: JSON.stringify({
            receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
            ...currentProvenance(),
            stage,
            status: 'failed',
            elapsed_ms: Date.now() - startedAt,
            error_code: failure.code,
          }),
        })
      } catch (finalizeError) {
        throw new AggregateError(
          [error, finalizeError],
          'Chapter stage operation and failure receipt persistence both failed',
        )
      }
      throw error
    }
    await finalizeStageRun(input.activeWorkspace, run.id, {
      status: 'success',
      output_ref: JSON.stringify({
        receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        ...currentProvenance(),
        stage,
        status: 'success',
        elapsed_ms: Date.now() - startedAt,
      }),
    })
    return result
  }
}
