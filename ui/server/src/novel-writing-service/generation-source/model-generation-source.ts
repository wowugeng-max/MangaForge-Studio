import { types } from 'node:util'
import type {
  ChapterStageResponseContract,
  ChapterTaskExecution,
  ChapterTaskProvenance,
  ChapterTaskStage,
  GenerationSource,
  ProseGenerationRequest,
  ProseGenerationResult,
} from './types'
import { CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY } from './types'
import {
  projectChapterTaskProvenance,
  type ChapterStageRecordContext,
} from './stage-receipts'

type StageRecorder = <T>(stage: ChapterTaskStage, request: {
  prompt: string
  responseContract: ChapterStageResponseContract
}, operation: (context: ChapterStageRecordContext) => Promise<T>) => Promise<T>

const LEGACY_STAGE_CONTEXT: ChapterStageRecordContext = Object.freeze({
  artifactId: 0,
  attempt: 0,
  attachRemoteIdentity: async () => {},
})

export type ModelGenerationSourceInput = {
  modelId: number
  provenance: ChapterTaskProvenance
  generateChapterProse: (...args: any[]) => Promise<any>
  executeAgent: (...args: any[]) => Promise<any>
  recordStage: StageRecorder
  assertCurrent?: () => Promise<void>
}

function positiveModelId(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return undefined
  return value
}

function invalidStageResult() {
  return Object.assign(new TypeError('Invalid chapter stage result'), {
    code: 'CHAPTER_STAGE_RESULT_INVALID',
    error_code: 'CHAPTER_STAGE_RESULT_INVALID',
  })
}

function isRevokedProxyAssimilationError(error: unknown) {
  if (!types.isNativeError(error) || types.isProxy(error)) return false
  try {
    const message = Object.getOwnPropertyDescriptor(error, 'message')
    return Object.getPrototypeOf(error) === TypeError.prototype
      && (message?.value === "Cannot perform 'get' on a proxy that has been revoked"
        || message?.value === 'Proxy has already been revoked. No more operations are allowed to be performed on it')
  } catch {
    return false
  }
}

async function awaitStageResult(operation: () => Promise<any>) {
  const candidate = operation()
  if (candidate && (typeof candidate === 'object' || typeof candidate === 'function')
    && types.isProxy(candidate)) {
    throw invalidStageResult()
  }
  try {
    return await candidate
  } catch (error) {
    if (isRevokedProxyAssimilationError(error)) throw invalidStageResult()
    throw error
  }
}

function projectStageResult(result: any) {
  if (!result || (typeof result !== 'object' && typeof result !== 'function')) return result
  if (types.isProxy(result)) throw invalidStageResult()

  let descriptors: PropertyDescriptorMap
  try {
    descriptors = Object.getOwnPropertyDescriptors(result)
  } catch {
    throw invalidStageResult()
  }

  const projected: Record<string, any> = {}
  for (const [field, descriptor] of Object.entries(descriptors)) {
    if (field === 'source_receipt'
      || !descriptor.enumerable
      || !('value' in descriptor)
      || descriptor.value === undefined) continue
    Object.defineProperty(projected, field, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true,
    })
  }
  return projected
}

function projectedStageError(result: unknown) {
  if (!result || (typeof result !== 'object' && typeof result !== 'function')) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(result, 'error')
  if (!descriptor?.enumerable || !('value' in descriptor)) return undefined
  const errorValue = descriptor.value
  if (errorValue === undefined || errorValue === null || errorValue === false || errorValue === '') return undefined
  if (types.isNativeError(errorValue)) return errorValue
  const detail = typeof errorValue === 'string'
    ? errorValue.slice(0, 440)
    : typeof errorValue === 'number' || typeof errorValue === 'boolean'
      ? String(errorValue)
      : ''
  const message = detail
    ? `Chapter stage returned an error result: ${detail}`
    : 'Chapter stage returned an error result'
  return Object.assign(new Error(message.slice(0, 500)), {
    code: 'CHAPTER_STAGE_ERROR_RESULT',
    error_code: 'CHAPTER_STAGE_ERROR_RESULT',
  })
}

export class ModelGenerationSource implements GenerationSource, ChapterTaskExecution {
  readonly taskId: string
  readonly source = 'model' as const
  readonly modelId?: number
  readonly authorityFingerprint: string
  readonly fingerprint: string
  readonly contextVersion: string

  private readonly provenanceSnapshot: ChapterTaskProvenance
  private readonly generateChapterProse: (...args: any[]) => Promise<any>
  private readonly executeAgentPort?: (...args: any[]) => Promise<any>
  private readonly recordStage: StageRecorder
  private readonly assertCurrentPort: () => Promise<void>
  private readonly legacy: boolean
  private closePromise?: Promise<void>

  constructor(input: ModelGenerationSourceInput | ((...args: any[]) => Promise<any>)) {
    if (typeof input === 'function') {
      this.legacy = true
      this.taskId = ''
      this.modelId = undefined
      this.authorityFingerprint = ''
      this.fingerprint = ''
      this.contextVersion = ''
      this.provenanceSnapshot = Object.freeze({
        task_id: '', project_id: 0, chapter_id: 0, source: 'model',
        source_fingerprint: '', authority_fingerprint: '', context_version: '',
      })
      this.generateChapterProse = input
      this.recordStage = async (_stage, _request, operation) => operation(LEGACY_STAGE_CONTEXT)
      this.assertCurrentPort = async () => {}
      return
    }

    const modelId = positiveModelId(input.modelId)
    if (modelId === undefined) throw new RangeError('modelId must be a positive safe integer')
    this.legacy = false
    this.modelId = modelId
    const projectedProvenance = projectChapterTaskProvenance(input.provenance)
    this.provenanceSnapshot = Object.freeze({
      ...projectedProvenance,
      source: 'model',
      model_id: modelId,
    })
    this.taskId = this.provenanceSnapshot.task_id
    this.authorityFingerprint = this.provenanceSnapshot.authority_fingerprint
    this.fingerprint = this.provenanceSnapshot.source_fingerprint
    this.contextVersion = this.provenanceSnapshot.context_version
    this.generateChapterProse = input.generateChapterProse
    this.executeAgentPort = input.executeAgent
    this.recordStage = input.recordStage
    this.assertCurrentPort = input.assertCurrent || (async () => {})
  }

  provenance() {
    return this.provenanceSnapshot
  }

  private generateWithModel(request: ProseGenerationRequest, modelId: string) {
    return this.generateChapterProse(
      request.project,
      request.chapter,
      {
        ...request.modelContext,
        paragraphTask: request.paragraphTask,
        promptDiagnostics: request.promptDiagnostics,
        contextPackage: request.contextPackage,
        boundedProseContract: true,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        abortSignal: request.signal,
      },
      {
        activeWorkspace: request.activeWorkspace,
        modelId,
        skipMemoryStore: true,
      },
    )
  }

  async generateDraft(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    if (this.legacy || this.modelId === undefined) return this.generateProse(request)
    return this.recordStage('draft', {
      prompt: request.paragraphTask,
      responseContract: 'draft_prose',
    }, async (_context) => {
      await this.assertCurrent()
      const result = await awaitStageResult(
        () => this.generateWithModel(request, String(this.modelId)),
      )
      await this.assertCurrent()
      const safeResult = projectStageResult(result)
      return {
        ...safeResult,
        source: 'model',
        source_receipt: {
          ...this.provenanceSnapshot,
          receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        },
      }
    })
  }

  async executeAgent(
    stage: ChapterTaskStage,
    responseContract: ChapterStageResponseContract,
    agentId: string,
    project: any,
    context: Record<string, any>,
    options: Record<string, any> = {},
    beforeReceipt?: (result: any) => void | Promise<void>,
  ) {
    if (this.legacy || this.modelId === undefined || !this.executeAgentPort) {
      throw new Error('Task-scoped executeAgent is unavailable on a legacy model source')
    }
    return this.recordStage(stage, {
      prompt: String(context.task || ''),
      responseContract,
    }, async (_context) => {
      await this.assertCurrent()
      const result = await awaitStageResult(
        () => this.executeAgentPort!(agentId, project, context, {
          ...options,
          modelId: String(positiveModelId(Number(options.modelId)) ?? this.modelId),
        }),
      )
      await this.assertCurrent()
      const safeResult = projectStageResult(result)
      const resultError = projectedStageError(safeResult)
      if (resultError) throw resultError
      await beforeReceipt?.(safeResult)
      return safeResult
    })
  }

  async assertCurrent() {
    await this.assertCurrentPort()
  }

  close(_outcome?: { status: 'success' | 'failed' | 'cancelled'; error?: unknown }) {
    if (!this.closePromise) this.closePromise = Promise.resolve()
    return this.closePromise
  }

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    if (!this.legacy) return this.generateDraft(request)
    const result = await awaitStageResult(
      () => this.generateWithModel(request, String(request.modelId || '')),
    )
    const safeResult = projectStageResult(result)
    return { ...safeResult, source: 'model' }
  }
}
