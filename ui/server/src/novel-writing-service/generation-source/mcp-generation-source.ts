import { createHash } from 'crypto'
import { types } from 'node:util'
import { buildAgentMessages } from '../../llm/executor-helpers'
import { stringifyLLMMessageTextContent } from '../../llm/types'
import {
  appendNovelRun,
  getNovelProject,
  listNovelRuns,
  recoverNovelRunExecution,
  updateNovelRun,
} from '../../novel'
import { withNovelWorkspaceMutation } from '../../novel/lock'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { McpError } from '../../mcp/errors'
import type { McpErrorCode } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import type { McpAgentLease } from '../../mcp/agent-lease'
import type { McpAgentQuarantineReason, McpGenerationReceiptStatus } from '../../mcp/types'
import type {
  McpChapterInvocationInput,
  McpChapterTaskInput,
  McpChapterStageInput,
  McpChapterStageResult,
  McpGenerationAdapter,
  McpStabilityController,
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

function safeStageInvocationId(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: string,
) {
  const candidate = scrubber.scrubText(value)
  if (candidate.length <= PROVENANCE_ID_MAX_CHARS) return candidate
  const digest = `sha256:${sha256(candidate)}`
  const prefix = candidate.slice(0, PROVENANCE_ID_MAX_CHARS - digest.length - 1)
  return `${prefix}:${digest}`
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

type CheckedDataMethod = (...args: never[]) => unknown

function safeApply<Args extends readonly unknown[], Result>(
  method: (...args: Args) => Result,
  receiver: unknown,
  args: Args,
): Result {
  return Reflect.apply(method, receiver, args) as Result
}

function dataMethod<Method extends CheckedDataMethod>(value: unknown, field: string): Method | undefined {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined
  let current: object | null = value as object
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (unsafeProxy(current)) return undefined
    try {
      const descriptor = Object.getOwnPropertyDescriptor(current, field)
      if (descriptor) return 'value' in descriptor && typeof descriptor.value === 'function'
        ? descriptor.value as Method
        : undefined
      current = Object.getPrototypeOf(current)
    } catch {
      return undefined
    }
  }
  return undefined
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

function fixedLegacyPinnedCredential(
  value: unknown,
  selected: ReturnType<typeof selectedTaskCredential>,
  activeWorkspace: string,
) {
  const invalid = () => new McpError(
    'MCP_BINDING_INVALID',
    'Runtime 返回了无效的固定 MCP 凭据',
  )
  if (!value || typeof value !== 'object' || unsafeProxy(value)) throw invalid()
  const server = ownDataValue(value, 'server')
  const key = ownDataValue(value, 'key')
  const resolvedWorkspace = ownDataValue(value, 'activeWorkspace')
  if (!server || typeof server !== 'object' || Array.isArray(server) || unsafeProxy(server)
    || !key || typeof key !== 'object' || Array.isArray(key) || unsafeProxy(key)
    || (resolvedWorkspace !== undefined && resolvedWorkspace !== activeWorkspace)) throw invalid()
  const serverFields = [
    'id', 'transport', 'adapter_id', 'is_active', 'startup_timeout_ms', 'tool_timeout_ms',
    'generation_timeout_ms', 'poll_initial_ms', 'poll_max_ms',
  ] as const
  const keyFields = ['id', 'mcp_server_id', 'key', 'is_active'] as const
  for (const field of serverFields) {
    if (ownDataValue(server, field) !== selected.server[field]) throw invalid()
  }
  for (const field of keyFields) {
    if (ownDataValue(key, field) !== selected.key[field]) throw invalid()
  }
  return Object.freeze({
    server: selected.server,
    key: selected.key,
    activeWorkspace,
  })
}

const LEGACY_SHARED_SESSION_MIGRATION_RUN_TYPE = 'mcp_legacy_shared_session_migration'
const LEGACY_ACTIVE_TASK_STATUSES = new Set(['running', 'session_created'])
const LEGACY_ACTIONABLE_LOCAL_MESSAGES = new Map<McpErrorCode, string>([
  ['MCP_STORE_CORRUPT', '旧版共享 Session 本地存储损坏'],
  ['MCP_STORE_IO_FAILED', '旧版共享 Session 本地存储操作失败'],
  ['MCP_BINDING_INVALID', '旧版共享 Session 的 MCP 绑定无效'],
  ['MCP_BINDING_CHANGED', '旧版共享 Session 的 MCP 绑定已变更'],
  ['MCP_REFERENCED_RECORD_CONFLICT', '旧版共享 Session 的 MCP 引用记录冲突'],
  ['MCP_AUTH_FAILED', '旧版共享 Session 的 MCP 认证失败'],
  ['MCP_CAPABILITY_MISSING', '旧版共享 Session 的 MCP 能力不可用'],
  ['MCP_STAGE_CONTRACT_INVALID', '旧版共享 Session 的 MCP 响应契约无效'],
])

function parsedRunOutput(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !unsafeProxy(parsed)
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

function legacySharedSessionIdentity(input: ResolvedChapterTaskInput, runId: number, sessionId: string) {
  return `sha256:${sha256(JSON.stringify([
    input.taskId,
    Number(input.project?.id || 0),
    runId,
    input.fingerprint,
    input.authorityFingerprint,
    input.sourceState.mcp?.server_id,
    input.sourceState.mcp?.key_id,
    input.sourceState.mcp?.adapter_id,
    input.sourceState.mcp?.agent_id,
    sessionId,
  ]))}`
}

function legacySharedSessionBlocked(legacyRunId: number, identityFingerprint: string) {
  return new McpError('MCP_AGENT_QUARANTINED', '旧版共享 Session 必须先完成远端核对', {
    legacy_run_id: legacyRunId,
    legacy_identity_fingerprint: identityFingerprint,
  })
}

function invalidLegacyInspection() {
  return new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 Session inspection 结果')
}

function trustedLegacyTerminalStatus(value: unknown) {
  if (!value || typeof value !== 'object' || unsafeProxy(value)) throw invalidLegacyInspection()
  const status = ownDataValue(value, 'status')
  const terminal = ownDataValue(value, 'terminal')
  if (typeof status !== 'string' || !status || status.length > PROVENANCE_ID_MAX_CHARS
    || typeof terminal !== 'boolean') throw invalidLegacyInspection()
  const terminalStatus = status === 'completed' || status === 'failed' || status === 'cancelled'
  if (terminal) {
    if (!terminalStatus) throw invalidLegacyInspection()
    return status
  }
  if (terminalStatus) throw invalidLegacyInspection()
  return undefined
}

function projectedLegacyActionableError(error: unknown) {
  if (!directMcpError(error)) return undefined
  const code = mcpErrorCode(error, 'MCP_RUNTIME_ERROR')
  const safeMessage = LEGACY_ACTIONABLE_LOCAL_MESSAGES.get(code)
  return safeMessage ? new McpError(code, safeMessage) : undefined
}

function legacyMigrationMarkerOutput(
  input: ResolvedChapterTaskInput,
  legacyRunId: number,
  identityFingerprint: string,
  status: 'quarantined' | 'reconciled',
  terminalStatus?: 'completed' | 'failed' | 'cancelled',
) {
  return {
    receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
    task_id: input.taskId,
    project_id: Number(input.project?.id || 0),
    chapter_id: Number(input.chapter?.id || 0),
    source: 'mcp',
    source_fingerprint: input.fingerprint,
    authority_fingerprint: input.authorityFingerprint,
    context_version: input.contextVersion,
    binding_fingerprint: input.fingerprint,
    legacy_run_id: legacyRunId,
    legacy_identity_fingerprint: identityFingerprint,
    status,
    ...(terminalStatus ? { terminal_status: terminalStatus } : {}),
  }
}

function legacyMigrationMarkerInput(
  input: ResolvedChapterTaskInput,
  legacyRunId: number,
  identityFingerprint: string,
) {
  return {
    task_id: input.taskId,
    legacy_run_id: legacyRunId,
    legacy_identity_fingerprint: identityFingerprint,
  }
}

function exactLegacyMigrationMarker(
  run: Awaited<ReturnType<typeof listNovelRuns>>[number],
  input: ResolvedChapterTaskInput,
  legacyRunId: number,
  identityFingerprint: string,
  status: 'quarantined' | 'reconciled',
) {
  const expectedRunStatus = status === 'reconciled' ? 'completed' : 'quarantined'
  if (run.run_type !== LEGACY_SHARED_SESSION_MIGRATION_RUN_TYPE
    || run.step_name !== input.taskId
    || run.status !== expectedRunStatus
    || run.input_ref !== JSON.stringify(legacyMigrationMarkerInput(
      input,
      legacyRunId,
      identityFingerprint,
    ))) return false
  if (status === 'reconciled') {
    return (['completed', 'failed', 'cancelled'] as const).some(terminalStatus => (
      run.output_ref === JSON.stringify(legacyMigrationMarkerOutput(
        input,
        legacyRunId,
        identityFingerprint,
        status,
        terminalStatus,
      ))
    ))
  }
  return run.output_ref === JSON.stringify(legacyMigrationMarkerOutput(
    input,
    legacyRunId,
    identityFingerprint,
    status,
  ))
}

function legacyReceiptMatchesRecoveredTask(
  output: unknown,
  input: ResolvedChapterTaskInput,
  binding: NonNullable<ResolvedChapterTaskInput['sourceState']['mcp']>,
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
) {
  const expectedIdentity = {
    receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
    task_id: input.taskId,
    project_id: Number(input.project?.id || 0),
    chapter_id: Number(input.chapter?.id || 0),
    source: 'mcp',
    source_fingerprint: input.fingerprint,
    authority_fingerprint: input.authorityFingerprint,
    context_version: input.contextVersion,
    binding_fingerprint: input.fingerprint,
    server_id: boundedScrubbedId(scrubber, binding.server_id),
    key_id: binding.key_id,
    adapter_id: boundedScrubbedId(scrubber, binding.adapter_id),
    agent_id: boundedScrubbedId(scrubber, binding.agent_id),
  }
  for (const [field, expected] of Object.entries(expectedIdentity)) {
    if (ownDataValue(output, field) !== expected) return false
  }
  const recordedModel = ownDataValue(output, 'model')
  return recordedModel === undefined
    || recordedModel === boundedScrubbedId(scrubber, binding.model || 'MCP Auto')
}

function legacyReceiptBindingChanged(legacyRunId: number) {
  return new McpError('MCP_BINDING_CHANGED', '旧版共享 Session 回执与当前章节任务身份不一致', {
    legacy_run_id: legacyRunId,
  })
}

async function guardLegacySharedSessionRecovery(
  runtime: ChapterTaskRuntime,
  input: ResolvedChapterTaskInput,
  createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline,
) {
  const binding = input.sourceState.mcp
  if (!binding) return
  const projectId = Number(input.project?.id || 0)
  const snapshot = await withMcpWorkspaceMutation(input.activeWorkspace, () => (
    withNovelWorkspaceMutation(input.activeWorkspace, async () => {
      const runs = await listNovelRuns(input.activeWorkspace, projectId)
      const legacyRun = runs.find(run => {
        if (run.run_type !== 'mcp_chapter_task'
          || run.step_name !== input.taskId
          || !LEGACY_ACTIVE_TASK_STATUSES.has(run.status)) return false
        const output = parsedRunOutput(run.output_ref)
        return typeof ownDataValue(output, 'session_id') === 'string'
      })
      if (!legacyRun) return
      const legacyOutput = parsedRunOutput(legacyRun.output_ref)
      const credentialSnapshot = await readBindingCredentialSnapshot(input.activeWorkspace, binding)
      const scrubber = createMcpSecretScrubber(credentialSnapshot.secrets)
      if (!legacyReceiptMatchesRecoveredTask(legacyOutput, input, binding, scrubber)) {
        throw legacyReceiptBindingChanged(legacyRun.id)
      }
      const legacySessionId = acceptRemoteId(ownDataValue(legacyOutput, 'session_id'), 'legacy Session 标识')
      const identityFingerprint = legacySharedSessionIdentity(input, legacyRun.id, legacySessionId)
      const reconciledMarker = runs.find(run => exactLegacyMigrationMarker(
        run,
        input,
        legacyRun.id,
        identityFingerprint,
        'reconciled',
      ))
      if (reconciledMarker) {
        const cleared = await runtime.compareAndClearSessionFence(input.activeWorkspace, {
          serverId: binding.server_id,
          keyId: binding.key_id,
          agentId: binding.agent_id,
        }, {
          requestId: safeOutboundRequestId(createMcpSecretScrubber({}), input.taskId),
          sessionId: legacySessionId,
          reason: 'remote_cancel_unknown',
        })
        if (cleared === 'mismatch') {
          throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
        }
        return { reconciled: true as const }
      }
      const lease = await runtime.acquireAgentLease(input.activeWorkspace, {
        serverId: binding.server_id,
        keyId: binding.key_id,
        agentId: binding.agent_id,
      })
      return {
        credentialSnapshot,
        identityFingerprint,
        lease,
        legacyRun,
        legacySessionId,
        reconciled: false as const,
      }
    }, 'mcp-legacy-recovery-admission')
  ))
  if (!snapshot || snapshot.reconciled) return
  const { credentialSnapshot, identityFingerprint, lease, legacyRun, legacySessionId } = snapshot
  if (!lease) throw new McpError('MCP_RUNTIME_ERROR', '旧版共享 Session Agent lease 建立失败')
  try {
    await lease.stageSessionFence({
      requestId: safeOutboundRequestId(createMcpSecretScrubber({}), input.taskId),
      sessionId: legacySessionId,
    })
    let markerState: {
      status: 'reconciled' | 'quarantined' | 'created'
      marker: Awaited<ReturnType<typeof listNovelRuns>>[number]
    }
    try {
      markerState = await withMcpWorkspaceMutation(input.activeWorkspace, async () => {
        const runs = await listNovelRuns(input.activeWorkspace, projectId)
        const reconciled = runs.find(run => exactLegacyMigrationMarker(
          run,
          input,
          legacyRun.id,
          identityFingerprint,
          'reconciled',
        ))
        if (reconciled) return { status: 'reconciled' as const, marker: reconciled }
        const quarantined = runs.find(run => exactLegacyMigrationMarker(
          run,
          input,
          legacyRun.id,
          identityFingerprint,
          'quarantined',
        ))
        if (quarantined) return { status: 'quarantined' as const, marker: quarantined }
        const marker = await appendNovelRun(input.activeWorkspace, {
          project_id: projectId,
          run_type: LEGACY_SHARED_SESSION_MIGRATION_RUN_TYPE,
          step_name: input.taskId,
          status: 'quarantined',
          input_ref: JSON.stringify(legacyMigrationMarkerInput(
            input,
            legacyRun.id,
            identityFingerprint,
          )),
          output_ref: JSON.stringify(legacyMigrationMarkerOutput(
            input,
            legacyRun.id,
            identityFingerprint,
            'quarantined',
          )),
        })
        return { status: 'created' as const, marker }
      })
    } catch (error) {
      const actionable = projectedLegacyActionableError(error)
      if (actionable) throw actionable
      throw new McpError('MCP_STORE_IO_FAILED', '旧版共享 Session 核对标记持久化失败')
    }
    if (markerState.status === 'reconciled') {
      await lease.clearSessionFence()
      return
    }
    if (markerState.status === 'created') {
      throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
    }
    const matchingMarker = markerState.marker

    let terminalStatus: 'completed' | 'failed' | 'cancelled' | undefined
    let deadline: McpGenerationDeadline | undefined
    try {
      let pinnedCredential: ReturnType<typeof fixedLegacyPinnedCredential>
      try {
        const selected = selectedTaskCredential(credentialSnapshot, binding)
        const resolvedCredential = await runtime.resolveCredentialConfig(
          binding.key_id,
          binding.server_id,
          { ...selected, activeWorkspace: input.activeWorkspace },
        )
        pinnedCredential = fixedLegacyPinnedCredential(
          resolvedCredential,
          selected,
          input.activeWorkspace,
        )
      } catch (error) {
        const actionable = projectedLegacyActionableError(error)
        if (actionable) throw actionable
        throw new McpError('MCP_RUNTIME_ERROR', '旧版共享 Session 本地凭据解析失败')
      }
      deadline = createDeadline(pinnedCredential.server.generation_timeout_ms, input.signal)
      const remoteOptions = (configuredMs: number) => ({
        signal: deadline!.signal,
        get timeoutMs() { return deadline!.timeoutMs(configuredMs) },
      })
      let resolved: Awaited<ReturnType<ChapterTaskRuntime['getAdapterForKey']>>
      try {
        resolved = await runtime.getAdapterForKey(
          binding.key_id,
          binding.server_id,
          remoteOptions(pinnedCredential.server.startup_timeout_ms),
          pinnedCredential,
        )
      } catch (error) {
        const actionable = projectedLegacyActionableError(error)
        if (actionable) throw actionable
        throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
      }
      const resolvedServer = ownDataValue(resolved, 'server')
      const resolvedAdapter = ownDataValue(resolved, 'adapter')
      const resolvedStability = ownDataValue(resolved, 'stability')
      if (!resolvedServer || typeof resolvedServer !== 'object' || unsafeProxy(resolvedServer)
        || !resolvedAdapter || typeof resolvedAdapter !== 'object' || unsafeProxy(resolvedAdapter)
        || !resolvedStability || typeof resolvedStability !== 'object' || unsafeProxy(resolvedStability)
        || ownDataValue(resolvedServer, 'adapter_id') !== binding.adapter_id
        || ownDataValue(resolvedAdapter, 'id') !== binding.adapter_id) {
        throw new McpError('MCP_BINDING_INVALID', 'Runtime 返回的 MCP Adapter 与项目绑定不一致')
      }
      const inspectSession = dataMethod<McpGenerationAdapter['inspectSession']>(
        resolvedAdapter,
        'inspectSession',
      )
      if (!inspectSession) {
        throw new McpError('MCP_CAPABILITY_MISSING', 'MCP Adapter 未提供 Session inspection 端口')
      }
      const runRead = dataMethod<McpStabilityController['runRead']>(resolvedStability, 'runRead')
      if (!runRead) {
        throw new McpError('MCP_CAPABILITY_MISSING', 'MCP Adapter 未提供 stability read 端口')
      }
      const stabilityInput = {
        deadline,
        phase: 'session_poll' as const,
        pollInitialMs: pinnedCredential.server.poll_initial_ms,
        pollMaxMs: pinnedCredential.server.poll_max_ms,
        toolTimeoutMs: pinnedCredential.server.tool_timeout_ms,
      }
      let contractError: McpError | undefined
      let inspection: unknown
      try {
        inspection = await safeApply(runRead, resolvedStability, [
          ownDataValue(resolvedAdapter, 'stabilityPolicy') as any,
          stabilityInput,
          () => {
            const pending = safeApply<
              [{ agentId: string; sessionId: string }, ReturnType<typeof remoteOptions>],
              ReturnType<McpGenerationAdapter['inspectSession']>
            >(inspectSession, resolvedAdapter, [{
              agentId: binding.agent_id,
              sessionId: legacySessionId,
            }, remoteOptions(pinnedCredential.server.tool_timeout_ms)])
            assertSafeAwaitable(
              pending,
              () => {
                contractError = invalidLegacyInspection()
                return contractError
              },
            )
            return pending
          },
        ])
      } catch (error) {
        if (contractError && error === contractError) throw contractError
        const actionable = projectedLegacyActionableError(error)
        if (actionable) throw actionable
        throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
      }
      terminalStatus = trustedLegacyTerminalStatus(inspection)
    } finally {
      deadline?.close()
    }
    if (!terminalStatus) throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
    const reconciledOutput = JSON.stringify(legacyMigrationMarkerOutput(
      input,
      legacyRun.id,
      identityFingerprint,
      'reconciled',
      terminalStatus,
    ))
    let reconciliation: Awaited<ReturnType<typeof recoverNovelRunExecution>> | undefined
    try {
      reconciliation = await withMcpWorkspaceMutation(input.activeWorkspace, () => (
        recoverNovelRunExecution(input.activeWorkspace, {
          projectId,
          runId: matchingMarker.id,
          expectedInputRef: matchingMarker.input_ref || '',
          expectedOutputRef: matchingMarker.output_ref || '',
          expectedStatus: matchingMarker.status,
          expectedLeaseOwner: matchingMarker.lease_owner ?? null,
          expectedLeaseExpiresAt: matchingMarker.lease_expires_at ?? null,
          expectedGuardRun: legacyRun,
          outputRef: reconciledOutput,
          status: 'completed',
          now: new Date().toISOString(),
        })
      ))
    } catch (error) {
      const actionable = projectedLegacyActionableError(error)
      if (actionable) throw actionable
      throw new McpError('MCP_STORE_IO_FAILED', '旧版共享 Session 核对凭证持久化失败')
    }
    if (!reconciliation || !reconciliation.updated || !reconciliation.run || !exactLegacyMigrationMarker(
      reconciliation.run,
      input,
      legacyRun.id,
      identityFingerprint,
      'reconciled',
    )) {
      throw legacySharedSessionBlocked(legacyRun.id, identityFingerprint)
    }
    await lease.clearSessionFence()
  } finally {
    await lease.release()
  }
}

type ChapterTaskRuntime = Pick<McpRuntime,
  'resolveCredentialConfig' | 'getAdapterForKey' | 'acquireAgentLease' | 'compareAndClearSessionFence'
>

type InitializedStagePort = {
  adapter: McpGenerationAdapter
  invokeChapterStage: McpGenerationAdapter['invokeChapterStage']
  taskInput: McpChapterTaskInput
  stability: McpStabilityController
}

type StageRecordContextPort = {
  attachRemoteIdentity(remote: { session_id: string; snapshot_hash: string }): Promise<void>
}

type ActiveStageInvocation = {
  invocationId: string
  stage: ChapterTaskStage
  sessionId?: string
  snapshotHash?: string
  fenceStaged: boolean
  fencePromise?: Promise<void>
  recordContext?: StageRecordContextPort
}

type StageInvocationOwner = { invocation?: ActiveStageInvocation }

class McpChapterTaskExecution implements ChapterTaskExecution {
  readonly taskId: string
  readonly source = 'mcp' as const
  readonly authorityFingerprint: string
  readonly fingerprint: string
  readonly contextVersion: string

  private readonly binding: NonNullable<ResolvedChapterTaskInput['sourceState']['mcp']>
  private readonly recordStage: ReturnType<typeof createChapterStageRecorder>
  private scrubber: ReturnType<typeof createMcpSecretScrubber>
  private stagePortPromise?: Promise<InitializedStagePort>
  private lease?: McpAgentLease
  private deadline?: McpGenerationDeadline
  private taskReceiptId?: number
  private readonly observedSessionIds = new Set<string>()
  private activeInvocation?: ActiveStageInvocation
  private currentStageRecordContext?: StageRecordContextPort
  private currentStageOwner?: StageInvocationOwner
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
  private quarantineReason?: McpAgentQuarantineReason
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
    this.authorityFingerprint = input.authorityFingerprint
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
      authority_fingerprint: this.authorityFingerprint,
      context_version: this.contextVersion,
      server_id: boundedScrubbedId(this.scrubber, this.binding.server_id),
      key_id: this.binding.key_id,
      adapter_id: boundedScrubbedId(this.scrubber, this.binding.adapter_id),
      agent_id: boundedScrubbedId(this.scrubber, this.binding.agent_id),
      model: boundedScrubbedId(this.scrubber, this.binding.model || 'MCP Auto'),
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
      this.quarantineReason = receiptStatus === 'send_unknown'
        && !this.activeInvocation?.sessionId
        && !errorSessionId(scrubbed)
        ? 'session_create_unknown'
        : receiptStatus
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

  private async onStageProgress(invocationId: string, stage: ChapterTaskStage, event: unknown) {
    this.throwIfCloseRequested()
    const active = this.activeInvocation
    if (!active || active.invocationId !== invocationId || active.stage !== stage) {
      throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了不属于当前 stage invocation 的进度')
    }
    const projectedEvent = projectedRecord(event)
    const rawSessionId = ownDataValue(event, 'session_id')
    const rawSnapshotHash = ownDataValue(event, 'snapshot_hash')
    if (rawSessionId !== undefined) {
      const accepted = acceptRemoteId(rawSessionId, 'Session 标识')
      if (this.observedSessionIds.has(accepted) && active.sessionId !== accepted) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 重用了已观察的 Session 标识')
      }
      if (active.sessionId && active.sessionId !== accepted) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter Session 标识在 stage 期间发生变化')
      }
      active.sessionId = accepted
      defineEnumerableData(projectedEvent, 'session_id', boundedScrubbedId(this.scrubber, accepted))
    }
    if (rawSnapshotHash !== undefined) {
      const accepted = acceptRemoteId(rawSnapshotHash, 'snapshot fingerprint')
      if (active.snapshotHash && active.snapshotHash !== accepted) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter snapshot fingerprint 在 stage 期间发生变化')
      }
      active.snapshotHash = accepted
      defineEnumerableData(projectedEvent, 'snapshot_hash', boundedScrubbedId(this.scrubber, accepted))
    }
    const scrubbedEvent = this.scrubber.scrubValue(projectedEvent)
    if (scrubbedEvent?.stage === 'session_created') {
      if (active.sessionId && active.snapshotHash) await this.ensureStageSessionFence(active)
    }
    await this.input.onProgress?.(scrubbedEvent)
  }

  private ensureStageSessionFence(active: ActiveStageInvocation) {
    if (active.fenceStaged) return Promise.resolve()
    if (active.fencePromise) return active.fencePromise
    active.fencePromise = (async () => {
      if (!active.sessionId || !active.snapshotHash) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 未提供完整 Session identity')
      }
      await active.recordContext?.attachRemoteIdentity({
        session_id: active.sessionId,
        snapshot_hash: active.snapshotHash,
      })
      await this.persistTaskReceipt('session_created')
      await this.lease!.stageSessionFence({
        requestId: active.invocationId,
        sessionId: active.sessionId,
      })
      active.fenceStaged = true
      this.observedSessionIds.add(active.sessionId)
    })()
    return active.fencePromise
  }

  private async initializeStagePort(): Promise<InitializedStagePort> {
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
      if (currentFingerprint !== this.authorityFingerprint) {
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
      const taskInput: McpChapterTaskInput = {
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
      }
      const invokeChapterStage = dataMethod<McpGenerationAdapter['invokeChapterStage']>(
        resolved.adapter,
        'invokeChapterStage',
      )
      if (!invokeChapterStage) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 未提供 chapter stage 调用端口')
      }
      this.throwIfCloseRequested()
      return {
        adapter: resolved.adapter,
        invokeChapterStage,
        taskInput,
        stability: resolved.stability,
      }
    })
  }

  private getStagePort() {
    if (this.closeRequested || this.closePromise || this.failurePromise) {
      return Promise.reject(new McpError('MCP_RUNTIME_ERROR', 'MCP 章节任务已经终止'))
    }
    if (this.stagePortPromise) return this.stagePortPromise
    const opening = this.initializeStagePort()
    this.stagePortPromise = opening
    void opening.catch(() => {
      if (this.stagePortPromise === opening) this.stagePortPromise = undefined
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
    if (this.ambiguousError && this.ambiguousStatus) {
      primaryError = this.ambiguousError
      receiptStatus = this.ambiguousStatus
      if (!receiptPersistenceError) terminalError = primaryError
    }
    const ambiguous = this.lease && this.ambiguousError && this.ambiguousStatus
    if (ambiguous) {
      try {
        const quarantineSessionId = errorSessionId(primaryError)
          || this.activeInvocation?.sessionId
        await this.lease!.quarantine({
          requestId: this.activeInvocation?.invocationId
            || boundedScrubbedId(this.scrubber, this.taskId),
          ...(this.quarantineReason === 'session_create_unknown'
            ? {}
            : { sessionId: boundedScrubbedId(this.scrubber, quarantineSessionId) }),
          reason: this.quarantineReason || this.ambiguousStatus!,
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
            errorSessionId(primaryError) || this.activeInvocation?.sessionId,
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
            errorSessionId(primaryError) || this.activeInvocation?.sessionId,
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

  private async performRemoteStage(
    input: McpChapterStageInput,
    recordContext?: StageRecordContextPort,
  ): Promise<McpChapterStageResult> {
    this.throwIfCloseRequested()
    await this.input.assertCurrent()
    this.throwIfCloseRequested()
    this.deadline?.throwIfAborted()
    const port = await this.getStagePort()
    this.throwIfCloseRequested()
    this.deadline?.throwIfAborted()
    const invocationId = safeStageInvocationId(
      this.scrubber,
      `${this.taskId}:${input.stage}:${++this.stageSequence}`,
    )
    const active: ActiveStageInvocation = {
      invocationId,
      stage: input.stage,
      fenceStaged: false,
      recordContext,
    }
    this.activeInvocation = active
    if (this.currentStageOwner) this.currentStageOwner.invocation = active
    const invocationInput: McpChapterInvocationInput = {
      ...port.taskInput,
      ...input,
      requestId: safeOutboundRequestId(this.scrubber, input.requestId),
      invocationId,
      stability: port.stability,
      onProgress: event => this.onStageProgress(invocationId, input.stage, event),
    }
    const pendingResult = safeApply<
      [McpChapterInvocationInput],
      Promise<McpChapterStageResult>
    >(port.invokeChapterStage, port.adapter, [invocationInput])
    assertSafeAwaitable(
      pendingResult,
      () => new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了无效的 stage 结果'),
    )
    const rawResult = await pendingResult
    this.throwIfCloseRequested()
    const result = projectMcpChapterStageResult(rawResult)
    this.deadline?.throwIfAborted()
    if (active.invocationId.length === 0) {
      throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter stage invocation 状态丢失')
    }
    if ((active.sessionId && result.session_id !== active.sessionId)
      || (active.snapshotHash && result.snapshot_hash !== active.snapshotHash)) {
      throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了不属于当前 stage invocation 的结果')
    }
    if (this.observedSessionIds.has(result.session_id) && active.sessionId !== result.session_id) {
      throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 重用了已观察的 Session 标识')
    }
    active.sessionId = result.session_id
    active.snapshotHash = result.snapshot_hash
    this.currentStageRecordContext = recordContext
    await this.ensureStageSessionFence(active)
    if (active.fenceStaged) {
      await this.lease!.clearSessionFence()
      active.fenceStaged = false
    }
    await this.input.assertCurrent()
    this.throwIfCloseRequested()
    return {
      ...result,
      session_id: boundedScrubbedId(this.scrubber, result.session_id),
      snapshot_hash: boundedScrubbedId(this.scrubber, result.snapshot_hash),
    }
  }

  private runRemoteStage(
    input: McpChapterStageInput,
    recordContext?: StageRecordContextPort,
    owner?: StageInvocationOwner,
  ): Promise<McpChapterStageResult> {
    if (this.failurePromise) return this.failurePromise
    if (this.closeRequested) return this.failRemote(this.closedError())
    const operation = this.stageTail.then(async () => {
      if (this.failurePromise) return this.failurePromise
      if (this.closeRequested) return this.failRemote(this.closedError())
      try {
        this.currentStageRecordContext = recordContext
        this.currentStageOwner = owner
        return await this.performRemoteStage(input, recordContext)
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
    const owner: StageInvocationOwner = {}
    try {
      return await this.recordStage('draft', {
        prompt: request.paragraphTask,
        responseContract: 'draft_prose',
      }, async context => {
        const stage = await this.runRemoteStage({
          requestId: safeOutboundRequestId(this.scrubber, request.requestId),
          stage: 'draft',
          responseContract: 'draft_prose',
          prompt: request.paragraphTask,
        }, context, owner)
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
    } finally {
      if (owner.invocation
        && this.activeInvocation === owner.invocation
        && !owner.invocation.fenceStaged) {
        this.activeInvocation = undefined
      }
      if (this.currentStageOwner === owner) {
        this.currentStageRecordContext = undefined
        this.currentStageOwner = undefined
      }
    }
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
    const owner: StageInvocationOwner = {}
    try {
      return await this.recordStage(stage, { prompt, responseContract }, async recordContext => {
        const result = await this.runRemoteStage({
          requestId: safeOutboundRequestId(this.scrubber, `${this.taskId}:${stage}`),
          stage,
          responseContract,
          prompt,
        }, recordContext, owner)
        return {
          ...validateMcpStageResponse(stage, responseContract, { content: result.content }),
          modelName: this.binding.model || 'MCP Auto',
        }
      })
    } finally {
      if (owner.invocation
        && this.activeInvocation === owner.invocation
        && !owner.invocation.fenceStaged) {
        this.activeInvocation = undefined
      }
      if (this.currentStageOwner === owner) {
        this.currentStageRecordContext = undefined
        this.currentStageOwner = undefined
      }
    }
  }

  assertCurrent() {
    return this.input.assertCurrent()
  }

  close(outcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'success' }) {
    this.closeRequested = true
    if (this.closePromise) return this.closePromise
    const active = [...this.activeOperations]
    const opening = this.stagePortPromise
    this.closePromise = (async () => {
      if (active.length) await Promise.all(active)
      else if (opening) await opening.catch(() => {})
      if (outcome.status === 'success' && this.activeInvocation?.fenceStaged) {
        const residualFence = new McpError(
          'MCP_SESSION_FAILED',
          'MCP 章节任务成功关闭前仍存在活动的 stage Session fence',
        )
        await this.ensureTerminalCleanup(residualFence, 'failed')
        throw residualFence
      }
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
    await guardLegacySharedSessionRecovery(this.runtime, input, this.createDeadline)
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
        stability: resolved.stability,
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
