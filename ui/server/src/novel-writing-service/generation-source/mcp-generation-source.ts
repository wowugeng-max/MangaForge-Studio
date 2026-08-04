import { createHash } from 'crypto'
import { types } from 'node:util'
import { buildAgentMessages } from '../../llm/executor-helpers'
import { stringifyLLMMessageTextContent } from '../../llm/types'
import { appendNovelRun, getNovelProject, updateNovelRun } from '../../novel'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { McpError } from '../../mcp/errors'
import type { McpErrorCode } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import type { McpAgentLease } from '../../mcp/agent-lease'
import type { McpGenerationReceiptStatus } from '../../mcp/types'
import type {
  McpChapterStageInput,
  McpChapterStageResult,
  McpChapterTaskSession,
} from '../../mcp/adapters/types'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { createMcpSecretScrubber } from '../../mcp/secret-scrubber'
import { readMcpServers } from '../../mcp/server-store'
import {
  chapterGenerationSourceFingerprint,
  proseGenerationSourceFingerprint,
  resolveChapterGenerationSource,
  resolveProseGenerationSource,
  validateMcpCredentialSelectionSnapshot,
  validateMcpProjectBinding,
} from './source-config'
import {
  CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
  MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
  type ChapterStageResponseContract,
  type ChapterTaskExecution,
  type ChapterTaskProvenance,
  type ChapterTaskStage,
  type GenerationSource,
  type ProseGenerationRequest,
  type ProseGenerationResult,
  type ResolvedChapterTaskInput,
} from './types'
import { createChapterStageRecorder, projectChapterTaskProvenance } from './stage-receipts'
import { validateMcpStageResponse } from './stage-response-contract'

const PROVENANCE_ID_MAX_CHARS = 160
const STAGE_CONTENT_MAX_BYTES = 256 * 1024
const AGENT_LIST_MAX_ITEMS = 256
const ERROR_PROJECTION_MAX_DEPTH = 6
const ERROR_PROJECTION_MAX_PROPERTIES = 96
const ERROR_PROJECTION_MAX_STRING_CHARS = 256 * 1024
const MCP_ERROR_CODES = new Set<McpErrorCode>([
  'MCP_BINDING_INVALID',
  'MCP_BINDING_CHANGED',
  'MCP_REFERENCED_RECORD_CONFLICT',
  'MCP_AUTH_FAILED',
  'MCP_CONNECT_TIMEOUT',
  'MCP_CONNECTION_LOST',
  'MCP_CAPABILITY_MISSING',
  'MCP_TOOL_ERROR',
  'MCP_DRIVE_SYNC_FAILED',
  'MCP_INPUT_TOO_LARGE',
  'MCP_AGENT_BUSY',
  'MCP_AGENT_QUARANTINED',
  'MCP_QUARANTINE_ACK_REQUIRED',
  'MCP_SEND_UNKNOWN',
  'MCP_SESSION_FAILED',
  'MCP_INPUT_REQUIRED',
  'MCP_GENERATION_TIMEOUT',
  'MCP_CANCELLED',
  'MCP_EMPTY_PROSE',
  'MCP_STAGE_CONTRACT_INVALID',
  'MCP_STORE_CORRUPT',
  'MCP_STORE_IO_FAILED',
  'MCP_RUNTIME_ERROR',
])

function unsafeProxy(value: unknown) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false
  try {
    return types.isProxy(value)
  } catch {
    return true
  }
}

function ownDataValue(value: unknown, field: string) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || unsafeProxy(value)) {
    return undefined
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function primitiveString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function ownString(value: unknown, field: string) {
  return primitiveString(ownDataValue(value, field))
}

function ownPathValue(value: unknown, path: readonly string[]) {
  let current = value
  for (const field of path) {
    current = ownDataValue(current, field)
    if (current === undefined) return undefined
  }
  return current
}

function defineEnumerableData(target: object, key: string, value: unknown) {
  if (key === '__proto__' || key === 'prototype' || key === 'constructor') return
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  })
}

function projectEnumerableData(
  value: unknown,
  options: { excluded?: ReadonlySet<string> } = {},
) {
  const seen = new WeakSet<object>()
  const budget = { properties: ERROR_PROJECTION_MAX_PROPERTIES }
  const project = (candidate: unknown, depth: number): any => {
    if (typeof candidate === 'string') return candidate.slice(0, ERROR_PROJECTION_MAX_STRING_CHARS)
    if (candidate === null || typeof candidate === 'boolean' || typeof candidate === 'number') {
      return candidate
    }
    if (!candidate || typeof candidate !== 'object' || unsafeProxy(candidate)) return undefined
    if (depth > ERROR_PROJECTION_MAX_DEPTH) return '[Truncated]'
    if (seen.has(candidate)) return '[Circular]'
    seen.add(candidate)
    try {
      const output: any[] | Record<string, unknown> = Array.isArray(candidate)
        ? []
        : Object.create(null)
      let keys: Array<string | symbol>
      try {
        keys = Reflect.ownKeys(candidate)
      } catch {
        return undefined
      }
      for (const key of keys) {
        if (budget.properties <= 0 || typeof key !== 'string' || options.excluded?.has(key)) continue
        let descriptor: PropertyDescriptor | undefined
        try {
          descriptor = Object.getOwnPropertyDescriptor(candidate, key)
        } catch {
          return undefined
        }
        if (!descriptor?.enumerable || !('value' in descriptor)) continue
        if (Array.isArray(output) && !/^(0|[1-9]\d*)$/.test(key)) continue
        const projected = project(descriptor.value, depth + 1)
        if (projected === undefined) continue
        budget.properties -= 1
        if (Array.isArray(output)) output.push(projected)
        else defineEnumerableData(output, key, projected)
      }
      return output
    } finally {
      seen.delete(candidate)
    }
  }
  return project(value, 0)
}

function projectedRecord(value: unknown, excluded?: ReadonlySet<string>) {
  const projected = projectEnumerableData(value, { excluded })
  return projected && typeof projected === 'object' && !Array.isArray(projected)
    ? projected as Record<string, unknown>
    : {}
}

function defineProjectedMetadata(target: object, value: unknown) {
  const metadata = projectedRecord(value)
  for (const key of Object.keys(metadata)) {
    defineEnumerableData(target, key, ownDataValue(metadata, key))
  }
}

function directMcpError(value: unknown) {
  if (!value || typeof value !== 'object' || unsafeProxy(value)) return false
  try {
    return Object.getPrototypeOf(value) === McpError.prototype
  } catch {
    return false
  }
}

function mcpErrorCode(value: unknown, fallback: McpErrorCode) {
  const code = ownString(value, 'code')
  return code && MCP_ERROR_CODES.has(code as McpErrorCode) ? code as McpErrorCode : fallback
}

function errorDetails(value: unknown) {
  const details = ownDataValue(value, 'details')
  return details && typeof details === 'object' && !unsafeProxy(details) ? details : undefined
}

function errorSessionId(value: unknown) {
  return ownString(errorDetails(value), 'session_id')
}

function remoteCancelConfirmed(value: unknown) {
  return ownDataValue(errorDetails(value), 'remote_cancel_confirmed') === true
}

function safeAbortRelatedError(error: unknown, signal?: AbortSignal) {
  if (signal && error === signal.reason) return true
  const code = ownString(error, 'code')
  if (code === 'MCP_CANCELLED' || code === 'MCP_GENERATION_TIMEOUT' || code === 'ABORT_ERR') {
    return true
  }
  return ownString(error, 'name') === 'AbortError'
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function contextSnapshotText(value: unknown) {
  if (typeof value === 'string') return value
  return `${JSON.stringify(value ?? {}, null, 2)}\n`
}

function boundedScrubbedId(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: unknown,
) {
  return scrubber.scrubText(primitiveString(value) || '').slice(0, PROVENANCE_ID_MAX_CHARS)
}

function safeOutboundRequestId(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: unknown,
) {
  return boundedScrubbedId(scrubber, value)
}

function acceptRemoteId(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > PROVENANCE_ID_MAX_CHARS) {
    throw new McpError('MCP_SESSION_FAILED', `MCP Adapter 返回了无效的 ${label}`)
  }
  return value
}

function invalidAgentList() {
  return new McpError('MCP_BINDING_INVALID', 'MCP Adapter 返回了无效的 Agent 列表')
}

function assertSafeAwaitable(value: unknown, invalid: () => Error) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return
  let current: object | null = value as object
  for (let depth = 0; current; depth += 1) {
    if (depth >= 64 || unsafeProxy(current)) throw invalid()
    try {
      const descriptor = Object.getOwnPropertyDescriptor(current, 'then')
      if (descriptor && !('value' in descriptor)) throw invalid()
      current = Object.getPrototypeOf(current)
    } catch {
      throw invalid()
    }
  }
}

function projectAgentIds(value: unknown) {
  if (!value || typeof value !== 'object' || unsafeProxy(value) || !Array.isArray(value)) {
    throw invalidAgentList()
  }
  const length = ownDataValue(value, 'length')
  if (typeof length !== 'number'
    || !Number.isSafeInteger(length)
    || length < 0
    || length > AGENT_LIST_MAX_ITEMS) {
    throw invalidAgentList()
  }
  const ids: string[] = []
  for (let index = 0; index < length; index += 1) {
    const entry = ownDataValue(value, String(index))
    if (!entry || typeof entry !== 'object' || unsafeProxy(entry)) throw invalidAgentList()
    const id = ownDataValue(entry, 'id')
    if (typeof id !== 'string' || !id.trim() || id.length > PROVENANCE_ID_MAX_CHARS) {
      throw invalidAgentList()
    }
    ids.push(id)
  }
  return ids
}

function dataMethod(value: unknown, field: string) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined
  let current: object | null = value as object
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (unsafeProxy(current)) return undefined
    try {
      const descriptor = Object.getOwnPropertyDescriptor(current, field)
      if (descriptor) return 'value' in descriptor && typeof descriptor.value === 'function'
        ? descriptor.value as (...args: any[]) => any
        : undefined
      current = Object.getPrototypeOf(current)
    } catch {
      return undefined
    }
  }
  return undefined
}

function projectChapterTaskSessionPort(value: unknown): McpChapterTaskSession {
  if (!value || typeof value !== 'object' || unsafeProxy(value)) {
    throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的任务 Session')
  }
  const runStage = dataMethod(value, 'runStage')
  const close = dataMethod(value, 'close')
  if (!runStage || !close) {
    throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的任务 Session')
  }
  return {
    sessionId: '',
    snapshotHash: '',
    runStage: input => Reflect.apply(runStage, value, [input]),
    close: () => Reflect.apply(close, value, []),
  }
}

function projectMcpChapterStageResult(value: unknown) {
  if (!value || typeof value !== 'object' || unsafeProxy(value)) {
    throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 stage 结果')
  }
  const content = ownDataValue(value, 'content')
  const sessionId = acceptRemoteId(ownDataValue(value, 'session_id'), 'Session 标识')
  const snapshotHash = acceptRemoteId(ownDataValue(value, 'snapshot_hash'), 'snapshot fingerprint')
  const status = ownDataValue(value, 'status')
  if (typeof content !== 'string'
    || Buffer.byteLength(content, 'utf8') > STAGE_CONTENT_MAX_BYTES
    || status !== 'completed') {
    throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 stage 结果')
  }
  return Object.freeze({
    content,
    session_id: sessionId,
    snapshot_hash: snapshotHash,
    status: 'completed' as const,
  })
}

function scrubbedProvenance(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: Record<string, unknown>,
  bindingFingerprint: string,
) {
  return {
    ...scrubber.scrubValue(value),
    receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
    binding_fingerprint: bindingFingerprint,
  }
}

async function readBindingCredentialSnapshot(activeWorkspace: string, binding: {
  server_id: string
  key_id: number
}) {
  const [servers, keys] = await Promise.all([
    readMcpServers(activeWorkspace),
    readMcpKeys(activeWorkspace),
  ])
  const selectedKeys = keys.filter(item => item.id === binding.key_id)
  const serverIds = new Set([
    binding.server_id,
    ...selectedKeys.map(item => item.mcp_server_id),
  ])
  return {
    records: { servers, keys },
    secrets: {
      keys: selectedKeys.map(item => item.key),
      headerValues: servers
        .filter(item => serverIds.has(item.id))
        .flatMap(item => Object.values(item.custom_headers)),
    },
  }
}

function errorReceipt(
  error: unknown,
  provenance: Record<string, unknown>,
  status: McpGenerationReceiptStatus,
) {
  const code = ownString(error, 'code') || ownString(error, 'error_code') || 'MCP_GENERATION_FAILED'
  const message = ownString(error, 'message')
    || (typeof error === 'string' ? error : 'MCP 正文生成失败')
  return {
    ...provenance,
    status,
    error_code: code.slice(0, 80),
    error: message.slice(0, 500),
  }
}

function receiptStatusForError(error: unknown): McpGenerationReceiptStatus {
  const details = errorDetails(error)
  const explicit = ownString(details, 'receipt_status') || ''
  if (ownDataValue(details, 'remote_cancel_confirmed') === false
    && (explicit === 'send_unknown' || explicit === 'remote_cancel_unknown')) {
    return explicit
  }
  const code = ownString(error, 'code')
  if (code === 'MCP_SEND_UNKNOWN') return 'send_unknown'
  if (code === 'MCP_CANCELLED') return 'cancelled'
  if (code === 'MCP_GENERATION_TIMEOUT') return 'timed_out'
  return 'failed'
}

function unresolvedStoreError(
  storeError: unknown,
  causeError: unknown,
  receiptStatus: Extract<McpGenerationReceiptStatus, 'send_unknown' | 'remote_cancel_unknown'>,
  sessionId: string,
) {
  const causeCode = (ownString(causeError, 'code') || 'MCP_RUNTIME_ERROR').slice(0, 80)
  const storeMessage = ownString(storeError, 'message') || 'MCP 持久化失败'
  return new McpError(
    mcpErrorCode(storeError, 'MCP_STORE_IO_FAILED'),
    storeMessage,
    {
      cause_code: causeCode,
      receipt_status: receiptStatus,
      session_id: sessionId,
      remote_cancel_confirmed: false,
    },
  )
}

function blockedInvalidResidual(error: unknown) {
  const admissionStatus = ownString(error, 'admission_status') || ownString(error, 'admissionStatus') || ''
  if (admissionStatus !== 'blocked_invalid') return undefined
  return [
    ownDataValue(error, 'chapter_text'),
    ownDataValue(error, 'chapterText'),
    ownDataValue(error, 'finalText'),
    ownDataValue(error, 'final_text'),
    ownDataValue(error, 'text'),
    ownPathValue(error, ['details', 'chapter_text']),
    ownPathValue(error, ['details', 'chapterText']),
    ownPathValue(error, ['admission_failure', 'details', 'chapter_text']),
    ownPathValue(error, ['admission_failure', 'details', 'chapterText']),
  ].find(item => typeof item === 'string' && item.trim().length > 200) as string | undefined
}

function enumerableErrorMetadata(error: unknown, excluded: Set<string>) {
  return projectedRecord(error, excluded)
}

function restoreBlockedInvalidResidual(error: Error, residualText?: string) {
  if (typeof residualText !== 'string') return error
  defineEnumerableData(error, 'chapter_text', residualText)
  defineEnumerableData(error, 'finalText', residualText)
  const details: Record<string, unknown> = {}
  defineProjectedMetadata(details, ownDataValue(error, 'details'))
  defineEnumerableData(details, 'chapter_text', residualText)
  defineEnumerableData(error, 'details', details)
  return error
}

function scrubGenerationError(
  error: unknown,
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
) {
  try {
    const rawMessage = ownString(error, 'message')
      || (typeof error === 'string' ? error : 'MCP 正文生成失败')
    const message = scrubber.scrubText(rawMessage)
    const residualText = blockedInvalidResidual(error)
    const scrubbedResidualText = typeof residualText === 'string'
      ? scrubber.scrubText(residualText)
      : undefined
    const rawDetails = errorDetails(error)
    const safeDetails = rawDetails ? projectEnumerableData(rawDetails) : undefined
    const scrubbedDetails = safeDetails && typeof safeDetails === 'object' && !Array.isArray(safeDetails)
      ? scrubber.scrubValue(safeDetails) as Record<string, unknown>
      : undefined
    if (directMcpError(error)) {
      const scrubbed = new McpError(
        mcpErrorCode(error, 'MCP_RUNTIME_ERROR'),
        message,
        scrubbedDetails,
      )
      scrubbed.name = scrubber.scrubText(ownString(error, 'name') || 'McpError')
      defineProjectedMetadata(scrubbed, scrubber.scrubValue(enumerableErrorMetadata(
        error,
        new Set(['stack', 'name', 'message', 'code', 'error_code', 'details']),
      )))
      return restoreBlockedInvalidResidual(scrubbed, scrubbedResidualText)
    }
    const scrubbed = new Error(message)
    scrubbed.name = scrubber.scrubText(ownString(error, 'name') || 'Error')
    const metadata = scrubber.scrubValue(enumerableErrorMetadata(
      error,
      new Set(['stack', 'name', 'message']),
    ))
    defineProjectedMetadata(scrubbed, metadata)
    return restoreBlockedInvalidResidual(scrubbed, scrubbedResidualText)
  } catch {
    return new McpError('MCP_RUNTIME_ERROR', 'MCP 正文生成失败')
  }
}

function compileMcpAgentPrompt(
  agentId: string,
  project: Record<string, any>,
  context: Record<string, any>,
) {
  return buildAgentMessages(agentId, project, context)
    .map(message => `[${message.role.toUpperCase()}]\n${stringifyLLMMessageTextContent(message.content)}`)
    .join('\n\n')
}

function normalizeDraftStageContent(content: unknown, chapterNo: number) {
  const trimmed = typeof content === 'string' ? content.trim() : ''
  const payload = content && typeof content === 'object' && !Array.isArray(content)
    ? content
    : undefined
  if (payload) {
    const record = payload as Record<string, unknown>
    const candidates = Array.isArray(record.prose_chapters)
      ? record.prose_chapters
      : Array.isArray(record.proseChapters)
        ? record.proseChapters
        : []
    const chapters = candidates.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const chapter = item as Record<string, unknown>
      const chapterText = typeof chapter.chapter_text === 'string'
        ? chapter.chapter_text
        : typeof chapter.chapterText === 'string'
          ? chapter.chapterText
          : ''
      if (!chapterText.trim()) return []
      const remoteChapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? chapterNo)
      return [{
        chapter_no: Number.isSafeInteger(remoteChapterNo) && remoteChapterNo > 0
          ? remoteChapterNo
          : chapterNo,
        ...(typeof chapter.title === 'string' && chapter.title.trim() ? { title: chapter.title } : {}),
        chapter_text: chapterText,
      }]
    })
    if (chapters.length) return chapters
    const directText = typeof record.chapter_text === 'string'
      ? record.chapter_text
      : typeof record.chapterText === 'string'
        ? record.chapterText
        : ''
    if (directText.trim()) return [{ chapter_no: chapterNo, chapter_text: directText }]
  }
  if (trimmed) return [{ chapter_no: chapterNo, chapter_text: trimmed }]
  throw new McpError('MCP_EMPTY_PROSE', 'MCP 章节 stage 已完成但没有返回正文')
}

function selectedTaskCredential(snapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>, binding: {
  server_id: string
  key_id: number
  adapter_id: string
}) {
  const server = snapshot.records.servers.find(item => item.id === binding.server_id)
  const key = snapshot.records.keys.find(item => item.id === binding.key_id)
  if (!server || !server.is_active) {
    throw new McpError('MCP_BINDING_INVALID', `MCP Server 不存在或已禁用：${binding.server_id}`)
  }
  if (!key || !key.is_active) {
    throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在或已禁用：${binding.key_id}`)
  }
  if (key.mcp_server_id !== server.id) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Key 不属于项目绑定的 Server')
  }
  if (server.transport !== 'streamable_http') {
    throw new McpError('MCP_BINDING_INVALID', '章节 MCP 生成只支持 Streamable HTTP')
  }
  if (server.adapter_id !== binding.adapter_id) {
    throw new McpError('MCP_BINDING_INVALID', '项目 Adapter 与 Server Adapter 不一致')
  }
  return { server, key }
}

type ChapterTaskRuntime = Pick<McpRuntime,
  'resolveCredentialConfig' | 'getAdapterForKey' | 'acquireAgentLease'
>

class McpChapterTaskExecution implements ChapterTaskExecution {
  readonly taskId: string
  readonly source = 'mcp' as const
  readonly fingerprint: string
  readonly contextVersion: string

  private readonly binding: NonNullable<ResolvedChapterTaskInput['sourceState']['mcp']>
  private readonly recordStage: ReturnType<typeof createChapterStageRecorder>
  private scrubber: ReturnType<typeof createMcpSecretScrubber>
  private sessionPromise?: Promise<McpChapterTaskSession>
  private session?: McpChapterTaskSession
  private lease?: McpAgentLease
  private deadline?: McpGenerationDeadline
  private taskReceiptId?: number
  private sessionId = ''
  private snapshotHash = ''
  private remoteSessionId = ''
  private remoteSnapshotHash = ''
  private sessionFenceStaged = false
  private sessionFencePromise?: Promise<void>
  private stageSequence = 0
  private deadlineClosed = false
  private closeRequested = false
  private readonly activeOperations = new Set<Promise<void>>()
  private stageTail: Promise<void> = Promise.resolve()
  private releasePromise?: Promise<void>
  private cleanupPromise?: Promise<void>
  private terminalError?: Error
  private terminalStatus?: string
  private ambiguousError?: Error
  private ambiguousStatus?: Extract<McpGenerationReceiptStatus, 'send_unknown' | 'remote_cancel_unknown'>
  private failurePromise?: Promise<never>
  private closePromise?: Promise<void>

  constructor(
    private readonly runtime: ChapterTaskRuntime,
    private readonly input: ResolvedChapterTaskInput,
    private readonly credentialSnapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>,
    private readonly createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline,
  ) {
    if (input.sourceState.active !== 'mcp' || !input.sourceState.mcp) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP 章节任务需要完整的项目绑定')
    }
    this.binding = input.sourceState.mcp
    this.taskId = input.taskId
    this.fingerprint = input.fingerprint
    this.contextVersion = input.contextVersion
    this.scrubber = createMcpSecretScrubber(credentialSnapshot.secrets)
    this.recordStage = createChapterStageRecorder({
      activeWorkspace: input.activeWorkspace,
      provenance: () => this.provenance(),
      scrubError: error => {
        const scrubbed = scrubGenerationError(error, this.scrubber)
        return {
          code: (ownString(scrubbed, 'code') || ownString(scrubbed, 'error_code') || 'MCP_STAGE_FAILED').slice(0, 80),
          message: this.scrubber.scrubText(ownString(scrubbed, 'message') || 'MCP stage failed').slice(0, 500),
        }
      },
    })
  }

  provenance(): ChapterTaskProvenance {
    return projectChapterTaskProvenance({
      task_id: this.taskId,
      project_id: Number(this.input.project?.id || 0),
      chapter_id: Number(this.input.chapter?.id || 0),
      source: 'mcp',
      source_fingerprint: this.fingerprint,
      context_version: this.contextVersion,
      server_id: boundedScrubbedId(this.scrubber, this.binding.server_id),
      key_id: this.binding.key_id,
      adapter_id: boundedScrubbedId(this.scrubber, this.binding.adapter_id),
      agent_id: boundedScrubbedId(this.scrubber, this.binding.agent_id),
      model: boundedScrubbedId(this.scrubber, this.binding.model || 'MCP Auto'),
      ...(this.sessionId ? { session_id: boundedScrubbedId(this.scrubber, this.sessionId) } : {}),
    })
  }

  private rotateScrubber(snapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>, resolved?: {
    server?: { custom_headers?: Record<string, string> }
    key?: { key?: string }
  }) {
    this.scrubber = createMcpSecretScrubber({
      keys: [
        ...this.credentialSnapshot.secrets.keys,
        ...snapshot.secrets.keys,
        ...(resolved?.key?.key ? [resolved.key.key] : []),
      ],
      headerValues: [
        ...this.credentialSnapshot.secrets.headerValues,
        ...snapshot.secrets.headerValues,
        ...Object.values(resolved?.server?.custom_headers || {}),
      ],
    })
  }

  private remoteOptions(configuredMs: number) {
    const deadline = this.deadline
    if (!deadline) throw new McpError('MCP_RUNTIME_ERROR', 'MCP 章节任务 deadline 尚未建立')
    return {
      signal: deadline.signal,
      get timeoutMs() { return deadline.timeoutMs(configuredMs) },
    }
  }

  private closedError() {
    return new McpError('MCP_CANCELLED', 'MCP 章节任务已经关闭', {
      remote_cancel_confirmed: true,
    })
  }

  private throwIfCloseRequested() {
    if (this.closeRequested) throw this.closedError()
  }

  private trackActiveOperation<T>(operation: Promise<T>) {
    const settled = operation.then(
      () => undefined,
      () => undefined,
    )
    this.activeOperations.add(settled)
    void settled.finally(() => this.activeOperations.delete(settled))
    return operation
  }

  private latchTerminalFailure(error: unknown, requestedStatus?: string) {
    const scrubbed = scrubGenerationError(error, this.scrubber)
    const receiptStatus = receiptStatusForError(scrubbed)
    const ambiguous = !remoteCancelConfirmed(scrubbed)
      && (receiptStatus === 'send_unknown' || receiptStatus === 'remote_cancel_unknown')
    if (ambiguous && !this.ambiguousError) {
      this.ambiguousError = scrubbed
      this.ambiguousStatus = receiptStatus
      this.terminalError = scrubbed
      this.terminalStatus = receiptStatus
    } else if (!this.terminalError) {
      this.terminalError = scrubbed
      this.terminalStatus = requestedStatus || receiptStatus
    }
    return scrubbed
  }

  private ensureTerminalCleanup(error?: unknown, status = 'failed') {
    if (error !== undefined) this.latchTerminalFailure(error, status)
    else if (!this.terminalStatus) this.terminalStatus = status
    if (!this.cleanupPromise) this.cleanupPromise = this.terminalCleanup()
    return this.cleanupPromise
  }

  private taskReceiptOutput(status: string, error?: unknown) {
    const provenance = this.provenance()
    const scrubbed = error ? scrubGenerationError(error, this.scrubber) : undefined
    return {
      receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
      ...provenance,
      binding_fingerprint: this.fingerprint,
      ...(this.snapshotHash ? { snapshot_hash: boundedScrubbedId(this.scrubber, this.snapshotHash) } : {}),
      status,
      ...(scrubbed ? {
        error_code: (ownString(scrubbed, 'code') || ownString(scrubbed, 'error_code') || 'MCP_STAGE_FAILED').slice(0, 80),
        error: this.scrubber.scrubText(ownString(scrubbed, 'message') || 'MCP stage failed').slice(0, 500),
      } : {}),
    }
  }

  private async persistTaskReceipt(status: string, error?: unknown) {
    if (!this.taskReceiptId) return
    const output = this.taskReceiptOutput(status, error)
    const updated = await updateNovelRun(this.input.activeWorkspace, this.taskReceiptId, {
      status,
      output_ref: JSON.stringify(output),
      ...(error ? { error_message: String(output.error || '').slice(0, 500) } : {}),
    })
    if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 章节任务回执持久化失败')
  }

  private async onSessionProgress(event: unknown) {
    this.throwIfCloseRequested()
    const projectedEvent = projectedRecord(event)
    const rawSessionId = ownDataValue(event, 'session_id')
    const rawSnapshotHash = ownDataValue(event, 'snapshot_hash')
    if (rawSessionId !== undefined) {
      const acceptedSessionId = acceptRemoteId(rawSessionId, 'Session 标识')
      if (this.remoteSessionId && acceptedSessionId !== this.remoteSessionId) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter Session 标识在任务期间发生变化')
      }
      this.remoteSessionId = acceptedSessionId
      defineEnumerableData(
        projectedEvent,
        'session_id',
        boundedScrubbedId(this.scrubber, this.remoteSessionId),
      )
    }
    if (rawSnapshotHash !== undefined) {
      const acceptedSnapshotHash = acceptRemoteId(rawSnapshotHash, 'snapshot fingerprint')
      if (this.remoteSnapshotHash && acceptedSnapshotHash !== this.remoteSnapshotHash) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter snapshot fingerprint 在任务期间发生变化')
      }
      this.remoteSnapshotHash = acceptedSnapshotHash
      defineEnumerableData(
        projectedEvent,
        'snapshot_hash',
        boundedScrubbedId(this.scrubber, this.remoteSnapshotHash),
      )
    }
    const scrubbedEvent = this.scrubber.scrubValue(projectedEvent)
    this.sessionId = this.remoteSessionId
      ? boundedScrubbedId(this.scrubber, this.remoteSessionId)
      : ''
    this.snapshotHash = this.remoteSnapshotHash
      ? boundedScrubbedId(this.scrubber, this.remoteSnapshotHash)
      : ''
    if (scrubbedEvent?.stage === 'session_created') {
      if (!this.remoteSessionId) throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 未提供 Session 标识')
      await this.ensureSessionFence()
    }
    await this.input.onProgress?.(scrubbedEvent)
  }

  private ensureSessionFence() {
    if (this.sessionFencePromise) return this.sessionFencePromise
    this.sessionFencePromise = (async () => {
      this.throwIfCloseRequested()
      await this.persistTaskReceipt('session_created')
      this.throwIfCloseRequested()
      await this.lease!.stageSessionFence({
        requestId: safeOutboundRequestId(this.scrubber, this.taskId),
        sessionId: this.sessionId,
      })
      this.sessionFenceStaged = true
    })()
    return this.sessionFencePromise
  }

  private async openSession() {
    return withMcpWorkspaceMutation(this.input.activeWorkspace, async () => {
      this.throwIfCloseRequested()
      const currentSnapshot = await readBindingCredentialSnapshot(this.input.activeWorkspace, this.binding)
      this.throwIfCloseRequested()
      this.rotateScrubber(currentSnapshot)
      const latestProject = await getNovelProject(
        this.input.activeWorkspace,
        Number(this.input.project?.id || 0),
      )
      this.throwIfCloseRequested()
      let currentFingerprint = ''
      try {
        currentFingerprint = latestProject
          ? chapterGenerationSourceFingerprint(resolveChapterGenerationSource(latestProject))
          : ''
      } catch {}
      if (currentFingerprint !== this.fingerprint) {
        throw new McpError('MCP_BINDING_CHANGED', '项目 MCP 章节生成绑定已变化，请重新发起任务')
      }
      const selected = selectedTaskCredential(currentSnapshot, this.binding)
      const pinnedCredential = await this.runtime.resolveCredentialConfig(
        this.binding.key_id,
        this.binding.server_id,
        { ...selected, activeWorkspace: this.input.activeWorkspace },
      )
      this.throwIfCloseRequested()
      const lease = await this.runtime.acquireAgentLease(this.input.activeWorkspace, {
        serverId: this.binding.server_id,
        keyId: this.binding.key_id,
        agentId: this.binding.agent_id,
      })
      this.lease = lease
      this.throwIfCloseRequested()
      this.deadline = this.createDeadline(pinnedCredential.server.generation_timeout_ms, this.input.signal)
      this.deadline.throwIfAborted()
      const resolved = await this.runtime.getAdapterForKey(
        this.binding.key_id,
        this.binding.server_id,
        this.remoteOptions(pinnedCredential.server.startup_timeout_ms),
        pinnedCredential,
      )
      this.throwIfCloseRequested()
      this.rotateScrubber(currentSnapshot, resolved)
      if (resolved.server.adapter_id !== this.binding.adapter_id
        || resolved.adapter.id !== this.binding.adapter_id) {
        throw new McpError('MCP_BINDING_INVALID', 'Runtime 返回的 MCP Adapter 与项目绑定不一致')
      }
      const pendingAgents = resolved.adapter.listAgents(
        this.remoteOptions(resolved.server.tool_timeout_ms),
      )
      assertSafeAwaitable(pendingAgents, invalidAgentList)
      const agentIds = projectAgentIds(await pendingAgents)
      this.throwIfCloseRequested()
      if (!agentIds.includes(this.binding.agent_id)) {
        throw new McpError('MCP_BINDING_INVALID', '项目绑定的 MCP Agent 不存在或不可访问')
      }
      const taskRun = await appendNovelRun(this.input.activeWorkspace, {
        project_id: Number(this.input.project?.id || 0),
        run_type: 'mcp_chapter_task',
        step_name: this.taskId,
        status: 'running',
        input_ref: JSON.stringify({
          receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
          ...this.provenance(),
          binding_fingerprint: this.fingerprint,
        }),
        output_ref: JSON.stringify(this.taskReceiptOutput('running')),
      })
      this.taskReceiptId = taskRun.id
      this.throwIfCloseRequested()
      const continuity = this.input.contextPackage?.continuity || {}
      const pendingSession = resolved.adapter.openChapterTask({
        activeWorkspace: this.input.activeWorkspace,
        server: resolved.server,
        keyId: this.binding.key_id,
        agentId: this.binding.agent_id,
        ...(this.binding.model ? { model: this.binding.model } : {}),
        taskId: safeOutboundRequestId(this.scrubber, this.taskId),
        project: this.input.project,
        chapter: this.input.chapter,
        chapterNo: Number(this.input.chapter?.chapter_no || 0),
        context: {
          writingBible: contextSnapshotText(this.input.contextPackage?.writing_bible || {}),
          storyState: this.input.contextPackage?.story_state?.global
            || this.input.contextPackage?.story_state
            || {},
          continuity: contextSnapshotText(continuity),
          recentChapters: contextSnapshotText(continuity?.previous_prose_chapters || []),
        },
        deadline: this.deadline,
        signal: this.deadline.signal,
        onProgress: event => this.onSessionProgress(event),
      })
      assertSafeAwaitable(
        pendingSession,
        () => new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的任务 Session'),
      )
      const rawSession = await pendingSession
      const sessionPort = projectChapterTaskSessionPort(rawSession)
      this.session = sessionPort
      this.throwIfCloseRequested()
      const returnedRemoteSessionId = acceptRemoteId(
        ownDataValue(rawSession, 'sessionId'),
        'Session 标识',
      )
      const returnedRemoteSnapshotHash = acceptRemoteId(
        ownDataValue(rawSession, 'snapshotHash'),
        'snapshot fingerprint',
      )
      if (this.remoteSessionId && this.remoteSessionId !== returnedRemoteSessionId) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter Session 标识在创建期间发生变化')
      }
      if (this.remoteSnapshotHash && this.remoteSnapshotHash !== returnedRemoteSnapshotHash) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter snapshot fingerprint 在创建期间发生变化')
      }
      this.remoteSessionId = returnedRemoteSessionId
      this.remoteSnapshotHash = returnedRemoteSnapshotHash
      this.sessionId = boundedScrubbedId(this.scrubber, returnedRemoteSessionId)
      this.snapshotHash = boundedScrubbedId(this.scrubber, returnedRemoteSnapshotHash)
      const session: McpChapterTaskSession = {
        ...sessionPort,
        sessionId: this.sessionId,
        snapshotHash: this.snapshotHash,
      }
      this.session = session
      if (!this.sessionFenceStaged) {
        await this.ensureSessionFence()
      }
      this.throwIfCloseRequested()
      return session
    })
  }

  private getSession() {
    if (this.closeRequested || this.closePromise || this.failurePromise) {
      return Promise.reject(new McpError('MCP_RUNTIME_ERROR', 'MCP 章节任务已经终止'))
    }
    if (this.sessionPromise) return this.sessionPromise
    const opening = this.openSession()
    this.sessionPromise = opening
    void opening.catch(() => {
      if (this.sessionPromise === opening) this.sessionPromise = undefined
    })
    return opening
  }

  private releaseLease() {
    if (!this.lease) return Promise.resolve()
    if (!this.releasePromise) this.releasePromise = this.lease.release()
    return this.releasePromise
  }

  private closeDeadline() {
    if (this.deadlineClosed) return
    this.deadlineClosed = true
    this.deadline?.close()
  }

  private async terminalCleanup() {
    let primaryError = this.ambiguousError || this.terminalError
    let terminalError = primaryError
    let receiptPersistenceError: Error | undefined
    let receiptStatus = this.ambiguousStatus || this.terminalStatus || 'failed'
    try {
      await this.persistTaskReceipt(receiptStatus, terminalError)
    } catch (receiptError) {
      receiptPersistenceError = this.latchTerminalFailure(receiptError)
      terminalError = receiptPersistenceError
    }
    if (this.session) {
      try {
        const pendingClose = this.session.close()
        assertSafeAwaitable(
          pendingClose,
          () => new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 Session close 结果'),
        )
        await pendingClose
      } catch (closeError) {
        const scrubbedCloseError = scrubGenerationError(closeError, this.scrubber)
        this.latchTerminalFailure(scrubbedCloseError)
        if (this.ambiguousError && this.ambiguousStatus) {
          primaryError = this.ambiguousError
          terminalError = primaryError
          if (receiptStatus !== this.ambiguousStatus) {
            receiptStatus = this.ambiguousStatus
            try {
              await this.persistTaskReceipt(receiptStatus, primaryError)
            } catch (receiptError) {
              receiptPersistenceError = this.latchTerminalFailure(receiptError)
              terminalError = receiptPersistenceError
            }
          }
        } else {
          primaryError = scrubbedCloseError
          terminalError = primaryError
          receiptStatus = receiptStatusForError(primaryError)
          try {
            await this.persistTaskReceipt(receiptStatus, primaryError)
          } catch (receiptError) {
            receiptPersistenceError = this.latchTerminalFailure(receiptError)
            terminalError = receiptPersistenceError
          }
        }
      }
    }
    if (this.ambiguousError && this.ambiguousStatus) {
      primaryError = this.ambiguousError
      receiptStatus = this.ambiguousStatus
      if (!receiptPersistenceError) terminalError = primaryError
    }
    const ambiguous = this.lease && this.ambiguousError && this.ambiguousStatus
    if (ambiguous) {
      try {
        await this.lease!.quarantine({
          requestId: boundedScrubbedId(this.scrubber, this.taskId),
          sessionId: boundedScrubbedId(
            this.scrubber,
            errorSessionId(primaryError) || this.sessionId,
          ),
          reason: this.ambiguousStatus!,
        })
      } catch (quarantineError) {
        this.closeDeadline()
        const persistenceError = scrubGenerationError(quarantineError, this.scrubber)
        throw unresolvedStoreError(
          persistenceError,
          primaryError,
          this.ambiguousStatus!,
          boundedScrubbedId(
            this.scrubber,
            errorSessionId(primaryError) || this.sessionId,
          ),
        )
      }
      try {
        await this.releaseLease()
      } catch (releaseError) {
        throw scrubGenerationError(releaseError, this.scrubber)
      } finally {
        this.closeDeadline()
      }
      if (receiptPersistenceError) {
        terminalError = unresolvedStoreError(
          receiptPersistenceError,
          primaryError,
          this.ambiguousStatus,
          boundedScrubbedId(
            this.scrubber,
            errorSessionId(primaryError) || this.sessionId,
          ),
        )
      }
    } else if (this.lease) {
      let clearError: unknown
      try {
        await this.lease.clearSessionFence()
      } catch (error) {
        clearError = error
      }
      let releaseError: unknown
      try {
        await this.releaseLease()
      } catch (error) {
        releaseError = error
      }
      if (clearError && releaseError) {
        const scrubbedClearError = scrubGenerationError(clearError, this.scrubber)
        const scrubbedReleaseError = scrubGenerationError(releaseError, this.scrubber)
        terminalError = new AggregateError(
          [scrubbedClearError, scrubbedReleaseError],
          'MCP Agent fence clear and lease release both failed',
        )
      } else if (clearError || releaseError) {
        terminalError = scrubGenerationError(clearError || releaseError, this.scrubber)
      }
    }
    this.closeDeadline()
    if (terminalError) throw terminalError
  }

  private failRemote(error: unknown): Promise<never> {
    if (this.failurePromise) return this.failurePromise
    const scrubbed = this.latchTerminalFailure(error)
    this.failurePromise = this.ensureTerminalCleanup().then(
      () => { throw scrubbed },
      cleanupError => { throw cleanupError },
    )
    return this.failurePromise
  }

  private async performRemoteStage(input: McpChapterStageInput): Promise<McpChapterStageResult> {
    this.throwIfCloseRequested()
    await this.input.assertCurrent()
    this.throwIfCloseRequested()
    this.deadline?.throwIfAborted()
    const session = await this.getSession()
    this.throwIfCloseRequested()
    this.deadline?.throwIfAborted()
    const pendingResult = session.runStage({
      ...input,
      requestId: safeOutboundRequestId(this.scrubber, input.requestId),
    })
    assertSafeAwaitable(
      pendingResult,
      () => new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 stage 结果'),
    )
    const rawResult = await pendingResult
    this.throwIfCloseRequested()
    const result = projectMcpChapterStageResult(rawResult)
    this.deadline?.throwIfAborted()
    if (result.session_id !== this.remoteSessionId
      || result.snapshot_hash !== this.remoteSnapshotHash) {
      throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了不属于当前任务 Session 的 stage 结果')
    }
    await this.input.assertCurrent()
    this.throwIfCloseRequested()
    return {
      ...result,
      session_id: boundedScrubbedId(this.scrubber, result.session_id),
      snapshot_hash: boundedScrubbedId(this.scrubber, result.snapshot_hash),
    }
  }

  private runRemoteStage(input: McpChapterStageInput): Promise<McpChapterStageResult> {
    if (this.failurePromise) return this.failurePromise
    if (this.closeRequested) return this.failRemote(this.closedError())
    const operation = this.stageTail.then(async () => {
      if (this.failurePromise) return this.failurePromise
      if (this.closeRequested) return this.failRemote(this.closedError())
      try {
        return await this.performRemoteStage(input)
      } catch (error) {
        return this.failRemote(error)
      }
    })
    this.stageTail = operation.then(
      () => undefined,
      () => undefined,
    )
    return this.trackActiveOperation(operation)
  }

  async generateDraft(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    return this.recordStage('draft', {
      prompt: request.paragraphTask,
      responseContract: 'draft_prose',
    }, async () => {
      const stage = await this.runRemoteStage({
        requestId: safeOutboundRequestId(this.scrubber, request.requestId),
        stage: 'draft',
        responseContract: 'draft_prose',
        prompt: request.paragraphTask,
      })
      const validated = validateMcpStageResponse('draft', 'draft_prose', { content: stage.content })
      return {
        prose_chapters: normalizeDraftStageContent(validated.output, request.chapterNo),
        source: 'mcp',
        adapter_id: this.binding.adapter_id,
        agent_id: this.binding.agent_id,
        session_id: stage.session_id,
        snapshot_hash: stage.snapshot_hash,
        completed: true,
        modelName: this.binding.model || 'MCP Auto',
        source_receipt: {
          receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
          request_id: boundedScrubbedId(this.scrubber, request.requestId),
          ...this.provenance(),
          snapshot_hash: boundedScrubbedId(this.scrubber, stage.snapshot_hash),
          status: 'success',
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
    _options: Record<string, any> = {},
  ) {
    const prompt = compileMcpAgentPrompt(agentId, project, context)
    return this.recordStage(stage, { prompt, responseContract }, async () => {
      const result = await this.runRemoteStage({
        requestId: safeOutboundRequestId(
          this.scrubber,
          `${this.taskId}:${stage}:${++this.stageSequence}`,
        ),
        stage,
        responseContract,
        prompt,
      })
      return {
        ...validateMcpStageResponse(stage, responseContract, { content: result.content }),
        modelName: this.binding.model || 'MCP Auto',
      }
    })
  }

  assertCurrent() {
    return this.input.assertCurrent()
  }

  close(outcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'success' }) {
    this.closeRequested = true
    if (this.closePromise) return this.closePromise
    const active = [...this.activeOperations]
    const opening = this.sessionPromise
    this.closePromise = (async () => {
      if (active.length) await Promise.all(active)
      else if (opening) await opening.catch(() => {})
      await this.ensureTerminalCleanup(outcome.error, outcome.status)
    })()
    return this.closePromise
  }
}

export class McpGenerationSource implements GenerationSource {
  private readonly createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline

  constructor(
    private readonly runtime: Pick<McpRuntime,
      'resolveCredentialConfig' | 'listAgents' | 'getAdapterForKey' | 'acquireAgentLease'>,
    options: {
      createDeadline?: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline
    } = {},
  ) {
    this.createDeadline = options.createDeadline || ((totalMs, signal) => new McpGenerationDeadline(totalMs, signal))
  }

  async beginResolvedTask(input: ResolvedChapterTaskInput): Promise<ChapterTaskExecution> {
    if (input.sourceState.active !== 'mcp' || !input.sourceState.mcp) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP 章节任务需要完整的项目绑定')
    }
    const credentialSnapshot = await readBindingCredentialSnapshot(
      input.activeWorkspace,
      input.sourceState.mcp,
    )
    return new McpChapterTaskExecution(
      this.runtime,
      input,
      credentialSnapshot,
      this.createDeadline,
    )
  }

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    const source = resolveProseGenerationSource(request.project)
    if (source.type !== 'mcp') throw new Error('MCP GenerationSource 需要完整的项目 MCP 绑定')
    const binding = source.mcp
    const bindingFingerprint = proseGenerationSourceFingerprint(source)
    const credentialSnapshot = await readBindingCredentialSnapshot(request.activeWorkspace, binding)
    let scrubber = createMcpSecretScrubber(credentialSnapshot.secrets)
    const baseProvenance = {
      receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
      server_id: boundedScrubbedId(scrubber, binding.server_id),
      key_id: binding.key_id,
      adapter_id: boundedScrubbedId(scrubber, binding.adapter_id),
      agent_id: boundedScrubbedId(scrubber, binding.agent_id),
      model: boundedScrubbedId(scrubber, binding.model || 'Auto'),
      binding_fingerprint: bindingFingerprint,
    }
    const receipt = await appendNovelRun(request.activeWorkspace, {
      project_id: Number(request.project?.id || 0),
      run_type: 'mcp_generate_prose',
      step_name: `chapter-${request.chapterNo}`,
      status: 'running',
      input_ref: JSON.stringify({
        request_id: boundedScrubbedId(scrubber, request.requestId),
        project_id: Number(request.project?.id || 0),
        chapter_id: Number(request.chapter?.id || 0),
        chapter_no: request.chapterNo,
        prompt_hash: sha256(request.paragraphTask),
      }),
      output_ref: JSON.stringify({ ...baseProvenance, status: 'running' }),
    })
    let progressProvenance: Record<string, unknown> = { ...baseProvenance }
    let connected = false
    let deadline: McpGenerationDeadline | undefined
    let lease: McpAgentLease | undefined
    let releaseAttempted = false
    const releaseLease = async () => {
      if (!lease || releaseAttempted) return
      releaseAttempted = true
      await lease.release()
    }
    try {
      const admitted = await withMcpWorkspaceMutation(request.activeWorkspace, async () => {
        const currentCredentialSnapshot = await readBindingCredentialSnapshot(request.activeWorkspace, binding)
        scrubber = createMcpSecretScrubber({
          keys: [...credentialSnapshot.secrets.keys, ...currentCredentialSnapshot.secrets.keys],
          headerValues: [
            ...credentialSnapshot.secrets.headerValues,
            ...currentCredentialSnapshot.secrets.headerValues,
          ],
        })
        const latestProject = await getNovelProject(request.activeWorkspace, Number(request.project?.id || 0))
        let latestFingerprint = ''
        try {
          latestFingerprint = latestProject
            ? proseGenerationSourceFingerprint(resolveProseGenerationSource(latestProject))
            : ''
        } catch {}
        if (latestFingerprint !== bindingFingerprint) {
          throw new McpError('MCP_BINDING_CHANGED', '项目 MCP 正文生成绑定已变化，请重新发起生成')
        }
        const selectedCredential = validateMcpCredentialSelectionSnapshot(currentCredentialSnapshot.records, {
          serverId: binding.server_id,
          keyId: binding.key_id,
          adapterId: binding.adapter_id,
        })
        const pinnedCredential = await this.runtime.resolveCredentialConfig(
          binding.key_id,
          binding.server_id,
          { ...selectedCredential, activeWorkspace: request.activeWorkspace },
        )
        const acquiredLease = await this.runtime.acquireAgentLease(request.activeWorkspace, {
          serverId: binding.server_id,
          keyId: binding.key_id,
          agentId: binding.agent_id,
        })
        return { lease: acquiredLease, pinnedCredential, currentCredentialSnapshot }
      })
      lease = admitted.lease
      const pinnedCredential = admitted.pinnedCredential
      const currentCredentialSnapshot = admitted.currentCredentialSnapshot
      deadline = this.createDeadline(pinnedCredential.server.generation_timeout_ms, request.signal)
      deadline.throwIfAborted()
      const remoteOptions = (configuredMs: number) => ({
        signal: deadline!.signal,
        get timeoutMs() { return deadline!.timeoutMs(configuredMs) },
      })
      await request.onProgress?.({ stage: 'mcp_connect', status: 'running' })
      const resolved = await this.runtime.getAdapterForKey(
        binding.key_id,
        binding.server_id,
        remoteOptions(pinnedCredential.server.startup_timeout_ms),
        pinnedCredential,
      )
      scrubber = createMcpSecretScrubber({
        keys: [
          ...credentialSnapshot.secrets.keys,
          ...currentCredentialSnapshot.secrets.keys,
          resolved.key.key,
        ],
        headerValues: [
          ...credentialSnapshot.secrets.headerValues,
          ...currentCredentialSnapshot.secrets.headerValues,
          ...Object.values(resolved.server.custom_headers),
        ],
      })
      const validationOptions = remoteOptions(resolved.server.tool_timeout_ms)
      await validateMcpProjectBinding(request.activeWorkspace, request.project, binding, {
        runtime: {
          listAgents: async (_keyId, options) => resolved.adapter.listAgents(options),
        },
        credentialSnapshot: currentCredentialSnapshot.records,
        signal: validationOptions.signal,
        get timeoutMs() { return validationOptions.timeoutMs },
      })
      await request.onProgress?.({ stage: 'mcp_connect', status: 'success' })
      connected = true
      const continuity = request.contextPackage?.continuity || {}
      const result = await resolved.adapter.generateProse({
        activeWorkspace: request.activeWorkspace,
        server: resolved.server,
        keyId: binding.key_id,
        agentId: binding.agent_id,
        model: binding.model,
        requestId: safeOutboundRequestId(scrubber, request.requestId),
        project: request.project,
        chapter: request.chapter,
        chapterNo: request.chapterNo,
        paragraphTask: request.paragraphTask,
        promptDiagnostics: request.promptDiagnostics,
        context: {
          writingBible: contextSnapshotText(request.contextPackage?.writing_bible || {}),
          storyState: request.contextPackage?.story_state?.global || {},
          continuity: contextSnapshotText(continuity),
          recentChapters: contextSnapshotText(continuity?.previous_prose_chapters || []),
        },
        deadline,
        signal: deadline.signal,
        onProgress: async event => {
          const scrubbedEvent = scrubber.scrubValue(event)
          const safeEvent = {
            ...scrubbedEvent,
            ...(scrubbedEvent.session_id ? { session_id: boundedScrubbedId(scrubber, scrubbedEvent.session_id) } : {}),
            ...(scrubbedEvent.snapshot_hash ? { snapshot_hash: boundedScrubbedId(scrubber, scrubbedEvent.snapshot_hash) } : {}),
          }
          progressProvenance = {
            ...progressProvenance,
            ...(safeEvent.session_id ? { session_id: safeEvent.session_id } : {}),
            ...(safeEvent.snapshot_hash ? { snapshot_hash: safeEvent.snapshot_hash } : {}),
          }
          if (safeEvent.stage === 'session_created') {
            const sessionReceipt = scrubbedProvenance(scrubber, {
              ...progressProvenance,
              request_id: boundedScrubbedId(scrubber, request.requestId),
              receipt_run_id: receipt.id,
              status: 'session_created',
            }, bindingFingerprint)
            const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
              status: 'session_created',
              output_ref: JSON.stringify(sessionReceipt),
            })
            if (!updated) {
              throw new McpError('MCP_STORE_IO_FAILED', 'MCP Session 创建回执持久化失败')
            }
            await lease!.stageSessionFence({
              requestId: boundedScrubbedId(scrubber, request.requestId),
              sessionId: String(safeEvent.session_id || ''),
            })
          }
          await request.onProgress?.(safeEvent)
        },
      })
      deadline.throwIfAborted()
      const output = scrubbedProvenance(scrubber, {
        ...progressProvenance,
        session_id: boundedScrubbedId(scrubber, result.session_id),
        snapshot_hash: boundedScrubbedId(scrubber, result.snapshot_hash),
        status: 'success',
      }, bindingFingerprint)
      const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'success',
        output_ref: JSON.stringify(output),
      })
      if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 成功回执持久化失败')
      deadline.throwIfAborted()
      const { prose_chapters: proseChapters, ...resultMetadata } = result
      const response = {
        ...scrubber.scrubValue(resultMetadata),
        ...(proseChapters !== undefined ? { prose_chapters: proseChapters } : {}),
        source_receipt: {
          request_id: boundedScrubbedId(scrubber, request.requestId),
          receipt_run_id: receipt.id,
          ...output,
        },
      }
      await lease.clearSessionFence()
      await releaseLease()
      return response
    } catch (error) {
      let exposedError = error
      if (deadline?.signal.aborted && safeAbortRelatedError(error, deadline.signal)) {
        try {
          deadline.throwIfAborted()
        } catch (cause) {
          const sameTypedCause = directMcpError(error)
            && directMcpError(cause)
            && ownString(error, 'code') === ownString(cause, 'code')
          if (!sameTypedCause) exposedError = cause
        }
      }
      const scrubbedError = scrubGenerationError(exposedError, scrubber)
      const receiptStatus = receiptStatusForError(scrubbedError)
      if (!connected) {
        await Promise.resolve(request.onProgress?.({
          stage: 'mcp_connect',
          status: 'failed',
          detail: scrubber.scrubText(scrubbedError.message).slice(0, 240),
        })).catch(() => {})
      }
      const output = scrubbedProvenance(
        scrubber,
        errorReceipt(scrubbedError, progressProvenance, receiptStatus),
        bindingFingerprint,
      )
      let finalError: unknown = scrubbedError
      let receiptPersistenceError: Error | undefined
      try {
        const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
          status: receiptStatus,
          output_ref: JSON.stringify(output),
          error_message: scrubber.scrubText(scrubbedError.message).slice(0, 500),
        })
        if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 失败回执持久化失败')
      } catch (receiptError) {
        receiptPersistenceError = scrubGenerationError(receiptError, scrubber)
        finalError = receiptPersistenceError
      }
      if (lease && (scrubbedError as any)?.details?.remote_cancel_confirmed !== true
        && (receiptStatus === 'send_unknown' || receiptStatus === 'remote_cancel_unknown')) {
        const sessionId = boundedScrubbedId(
          scrubber,
          (scrubbedError as any)?.details?.session_id || progressProvenance.session_id || '',
        )
        try {
          await lease.quarantine({
            requestId: boundedScrubbedId(scrubber, request.requestId),
            sessionId,
            reason: receiptStatus,
          })
          if (receiptPersistenceError) {
            finalError = unresolvedStoreError(
              receiptPersistenceError,
              scrubbedError,
              receiptStatus,
              sessionId,
            )
          }
        } catch (quarantineError) {
          const persistenceError = scrubGenerationError(quarantineError, scrubber)
          finalError = unresolvedStoreError(
            persistenceError,
            scrubbedError,
            receiptStatus,
            sessionId,
          )
        }
      } else if (lease) {
        try {
          await lease.clearSessionFence()
        } catch (clearError) {
          finalError = scrubGenerationError(clearError, scrubber)
        }
      }
      await releaseLease()
      throw finalError
    } finally {
      deadline?.close()
    }
  }
}
