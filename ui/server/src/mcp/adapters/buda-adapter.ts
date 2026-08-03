import { types } from 'node:util'
import { isAbortRelatedError, McpError } from '../errors'
import { mcpResultData, buildBudaDriveSnapshot, syncBudaDriveSnapshot } from './buda-drive'
import { buildBudaToolArguments, resolveBudaTools, type BudaToolMap } from './buda-tool-map'
import type { McpOperationKind, McpOperationOptions, McpToolResult } from '../types'
import type {
  BudaChapterStageInput,
  BudaChapterStageResult,
  BudaChapterTaskInput,
  BudaChapterTaskSession,
  BudaProseGenerationInput,
  BudaProseGenerationResult,
  BudaRemoteCleanupDetails,
  McpAdapterOperationOptions,
  McpClientPort,
  ProseMcpAdapter,
} from './types'

function operationOptions(options: McpAdapterOperationOptions, operation: McpOperationKind) {
  const result: McpOperationOptions = { signal: options.signal, operation }
  if (options.timeoutMs !== undefined) {
    Object.defineProperty(result, 'timeoutMs', {
      enumerable: true,
      get: () => options.timeoutMs,
    })
  }
  return result
}

const BUDA_AGENT_LIST_LIMIT = 100
const BUDA_AGENT_TEXT_RESULT_LIMIT = 256 * 1_024
const BUDA_AGENT_TEXT_BLOCK_LIMIT = 32
const BUDA_STAGE_CONTENT_LIMIT = 256 * 1_024
const BUDA_STAGE_MESSAGE_LIMIT = 256
const BUDA_AGENT_STRING_LIMITS = {
  id: 16_384,
  name: 4_096,
  description: 4_096,
  status: 160,
  spaceId: 16_384,
} as const
const TRUNCATED_AGENT_FIELD = '[TRUNCATED]'

function ownDataValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function boundedOwnString(
  value: unknown,
  keys: string[],
  limit: number,
  oversized: string = TRUNCATED_AGENT_FIELD,
) {
  for (const key of keys) {
    const candidate = ownDataValue(value, key)
    if (typeof candidate !== 'string' || !candidate) continue
    return candidate.length > limit ? oversized : candidate
  }
  return ''
}

function cleanAgent(item: unknown) {
  const id = boundedOwnString(item, ['id', 'agentId'], BUDA_AGENT_STRING_LIMITS.id, '')
  const name = boundedOwnString(item, ['name', 'title'], BUDA_AGENT_STRING_LIMITS.name) || id
  const description = boundedOwnString(item, ['description'], BUDA_AGENT_STRING_LIMITS.description)
  const status = boundedOwnString(item, ['status'], BUDA_AGENT_STRING_LIMITS.status)
  const spaceId = boundedOwnString(item, ['spaceId', 'space_id'], BUDA_AGENT_STRING_LIMITS.spaceId, '')
  return {
    id,
    name,
    ...(description ? { description } : {}),
    ...(status ? { status } : {}),
    ...(spaceId ? { raw: { spaceId } } : {}),
  }
}

function agentArray(data: unknown) {
  if (data && typeof data === 'object' && types.isProxy(data)) return []
  if (Array.isArray(data)) return data
  for (const key of ['apiAgents', 'agents', 'items']) {
    const candidate = ownDataValue(data, key)
    if (candidate && typeof candidate === 'object' && types.isProxy(candidate)) continue
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

export function normalizeBudaAgentList(data: unknown) {
  const agents = agentArray(data)
  const output: ReturnType<typeof cleanAgent>[] = []
  const count = Math.min(agents.length, BUDA_AGENT_LIST_LIMIT)
  for (let index = 0; index < count; index += 1) {
    const item = ownDataValue(agents, String(index))
    const agent = cleanAgent(item)
    if (agent.id) output.push(agent)
  }
  return output
}

function oversizedAgentResult(): never {
  throw new McpError('MCP_TOOL_ERROR', 'Buda Agent 返回数据超过安全上限', {
    reason: 'agent_result_too_large',
  })
}

function agentResultData(result: McpToolResult) {
  const structuredContent = ownDataValue(result, 'structuredContent')
  if (structuredContent !== undefined) return structuredContent
  const content = ownDataValue(result, 'content')
  if (!Array.isArray(content)) return ''
  if (content.length > BUDA_AGENT_TEXT_BLOCK_LIMIT) oversizedAgentResult()
  const texts: string[] = []
  let totalChars = 0
  for (let index = 0; index < content.length; index += 1) {
    const block = ownDataValue(content, String(index))
    if (ownDataValue(block, 'type') !== 'text') continue
    const text = ownDataValue(block, 'text')
    if (typeof text !== 'string' || !text) continue
    totalChars += text.length + (texts.length ? 1 : 0)
    if (totalChars > BUDA_AGENT_TEXT_RESULT_LIMIT) oversizedAgentResult()
    texts.push(text)
  }
  for (const text of texts) {
    try { return JSON.parse(text) } catch { /* plain text remains a valid result */ }
  }
  return texts.join('\n')
}

function sessionStatus(data: unknown) {
  return boundedOwnString(ownDataValue(data, 'run'), ['status'], BUDA_AGENT_STRING_LIMITS.status, '')
    || boundedOwnString(ownDataValue(data, 'session'), ['status'], BUDA_AGENT_STRING_LIMITS.status, '')
    || boundedOwnString(data, ['status'], BUDA_AGENT_STRING_LIMITS.status, '')
}

const PUBLIC_SESSION_STATUSES = new Set([
  'completed', 'failed', 'cancelled', 'waiting_for_input', 'pending', 'in_progress',
])

function publicSessionStatus(data: any) {
  const status = sessionStatus(data)
  return PUBLIC_SESSION_STATUSES.has(status) ? status : 'unknown'
}

function sessionId(data: unknown) {
  return boundedOwnString(ownDataValue(data, 'session'), ['id'], BUDA_AGENT_STRING_LIMITS.id, '')
    || boundedOwnString(data, ['sessionId', 'id'], BUDA_AGENT_STRING_LIMITS.id, '')
}

function sendMayHaveSucceeded(error: unknown) {
  if (error instanceof McpError) return error.code === 'MCP_CONNECTION_LOST'
  if (!error || typeof error !== 'object') return false
  const code = String((error as any).code || (error as any).errno || '').toUpperCase()
  return code === 'ECONNRESET' || code === 'EPIPE'
}

function withRemoteCleanupDetails(error: unknown, details: BudaRemoteCleanupDetails) {
  const safeGet = (value: unknown, key: string) => {
    try { return value && typeof value === 'object' ? (value as any)[key] : undefined } catch { return undefined }
  }
  if (error instanceof McpError) {
    return new McpError(error.code, error.message, { ...details })
  }
  const originalMessage = safeGet(error, 'message')
  const message = String(originalMessage ?? (typeof error === 'string' ? error : 'Buda Session 执行失败')).slice(0, 500)
  const wrapped = new Error(message)
  const originalName = safeGet(error, 'name')
  if (typeof originalName === 'string' && originalName) wrapped.name = originalName.slice(0, 80)
  const originalCode = safeGet(error, 'code')
  if (typeof originalCode === 'string' || typeof originalCode === 'number') {
    Object.assign(wrapped, { code: String(originalCode).slice(0, 80) })
  }
  Object.assign(wrapped, { details: { ...details } })
  Object.defineProperty(wrapped, 'cause', { value: error, enumerable: false })
  return wrapped
}

function waitWithSignal<T>(signal: AbortSignal, operation: () => Promise<T>) {
  if (signal.aborted) return Promise.reject(signal.reason || new Error('cleanup deadline exceeded'))
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason || new Error('cleanup deadline exceeded'))
    signal.addEventListener('abort', abort, { once: true })
    operation().then(
      value => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      error => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

function parseJsonText(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(trimmed) } catch { return null }
}

export function extractBudaProse(data: any, chapterNo: number) {
  const direct = Array.isArray(data?.prose_chapters)
    ? data.prose_chapters
    : Array.isArray(data?.proseChapters)
      ? data.proseChapters
      : []
  if (direct.length) {
    return direct.map((item: any) => ({
      chapter_no: Number(item?.chapter_no ?? item?.chapterNo ?? chapterNo),
      ...(item?.title ? { title: String(item.title) } : {}),
      chapter_text: String(item?.chapter_text ?? item?.chapterText ?? ''),
    })).filter((item: any) => item.chapter_text.trim())
  }
  const assistantMessages = (Array.isArray(data?.messages) ? data.messages : [])
    .filter((item: any) => item?.role === 'assistant' && String(item?.content || '').trim())
  const content = String(assistantMessages.at(-1)?.content || data?.chapter_text || data?.chapterText || '').trim()
  if (!content) throw new McpError('MCP_EMPTY_PROSE', 'Buda Session 已完成但没有返回正文')
  const parsed = parseJsonText(content)
  if (parsed) return extractBudaProse(parsed, chapterNo)
  return [{ chapter_no: chapterNo, chapter_text: content }]
}

export function buildBudaExecutionEnvelope(input: {
  requestId: string
  chapterNo: number
  chapterTitle?: string
  paragraphTask: string
}) {
  return [
    '【MangaForge 正文执行请求】',
    `request_id: ${input.requestId}`,
    `目标章节: 第${input.chapterNo}章《${input.chapterTitle || '无标题'}》`,
    '权威顺序：当前章节请求与 paragraphTask 优先级最高；其次是当前 Story State 与连续性快照；再次是写作圣经；旧摘要与 Agent 记忆只能辅助，不得覆盖新事实。',
    '只返回目标章节的完整正文或 prose_chapters 结构，不要生成其他章节、流程说明或分析。',
    '',
    input.paragraphTask,
  ].join('\n')
}

export function buildBudaStageEnvelope(input: BudaChapterStageInput) {
  return [
    '【MangaForge 章节任务阶段】',
    `request_id: ${input.requestId}`,
    `stage: ${input.stage}`,
    `response_contract: ${input.responseContract}`,
    '只执行当前 stage。不得自行开始下一阶段，不得用 Agent 旧记忆覆盖本次提示。',
    '严格按 response_contract 返回，不要附加流程说明。',
    '',
    input.prompt,
  ].join('\n')
}

export function extractBudaStageContent(data: unknown) {
  const stageContent = (content: unknown) => {
    if (typeof content !== 'string') return ''
    if (content.length > BUDA_STAGE_CONTENT_LIMIT) {
      throw new McpError('MCP_TOOL_ERROR', 'Buda Stage 返回数据超过安全上限', {
        reason: 'stage_result_too_large',
      })
    }
    return content.trim()
  }
  const messages = ownDataValue(data, 'messages')
  if (messages && typeof messages === 'object' && !types.isProxy(messages) && Array.isArray(messages)) {
    if (messages.length > BUDA_STAGE_MESSAGE_LIMIT) {
      throw new McpError('MCP_TOOL_ERROR', 'Buda Stage 返回数据超过安全上限', {
        reason: 'stage_result_too_large',
      })
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = ownDataValue(messages, String(index))
      if (ownDataValue(message, 'role') !== 'assistant') continue
      const content = stageContent(ownDataValue(message, 'content'))
      if (content) return content
    }
  }
  for (const key of ['content', 'text']) {
    const content = stageContent(ownDataValue(data, key))
    if (content) return content
  }
  throw new McpError('MCP_TOOL_ERROR', 'Buda Stage 已完成但没有返回内容')
}

function withIndependentTaskSignal(input: BudaChapterTaskInput) {
  if (!input.signal || input.signal === input.deadline.signal) return input
  const base = input.deadline
  const callerSignal = input.signal
  const combinedSignal = AbortSignal.any([base.signal, callerSignal])
  const throwIfAborted = () => {
    base.throwIfAborted()
    if (callerSignal.aborted) throw new McpError('MCP_CANCELLED', 'MCP 正文生成已取消')
  }
  const deadline = {
    get signal() { return combinedSignal },
    remainingMs: () => base.remainingMs(),
    timeoutMs: (configuredMs: number) => {
      throwIfAborted()
      return base.timeoutMs(configuredMs)
    },
    throwIfAborted,
    cleanupSignal: (timeoutMs?: number) => base.cleanupSignal(timeoutMs),
    createCleanupDeadline: (timeoutMs?: number) => base.createCleanupDeadline(timeoutMs),
    close: () => {},
  } as BudaChapterTaskInput['deadline']
  return { ...input, deadline }
}

function abortableDelay(ms: number, input: Pick<BudaChapterTaskInput, 'deadline'>) {
  const { deadline } = input
  deadline.throwIfAborted()
  const waitMs = Math.min(Math.max(1, ms), deadline.remainingMs())
  if (waitMs <= 0) {
    deadline.throwIfAborted()
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      deadline.signal.removeEventListener('abort', abort)
      try {
        deadline.throwIfAborted()
        resolve()
      } catch (error) {
        reject(error)
      }
    }, waitMs)
    const abort = () => {
      clearTimeout(timer)
      try {
        deadline.throwIfAborted()
      } catch (error) {
        reject(error)
      }
    }
    deadline.signal.addEventListener('abort', abort, { once: true })
  })
}

export const MANGAFORGE_BUDA_AGENT_INSTRUCTIONS = [
  '你是 MangaForge 专用长篇小说章节任务 Agent。',
  '当前请求与 MangaForge Drive 中的最新 Story State 是权威事实，远端历史记忆不得覆盖它们。',
  '输入材料不足时不得擅自补造正史，应明确返回缺失信息。',
  '每条消息只执行其明确指定的 stage，并严格服从 response_contract。',
  '完成当前 stage 后等待下一条消息，不得自行开始后续阶段或附加流程说明。',
].join('\n')

async function cleanupBudaSession(input: {
  client: McpClientPort
  tools: BudaToolMap
  task: BudaChapterTaskInput
  sessionId: string
  terminalSeen: boolean
  primaryError: unknown
}) {
  const cleanupError = (remoteCancelConfirmed: boolean) => {
    const sendWasAmbiguous = input.primaryError instanceof McpError && input.primaryError.code === 'MCP_SEND_UNKNOWN'
    return withRemoteCleanupDetails(input.primaryError, {
      session_id: input.sessionId.slice(0, 160),
      remote_cancel_confirmed: remoteCancelConfirmed,
      ...(!remoteCancelConfirmed ? {
        receipt_status: sendWasAmbiguous ? 'send_unknown' : 'remote_cancel_unknown',
      } : {}),
    })
  }
  let cleanupDeadline: ReturnType<BudaChapterTaskInput['deadline']['createCleanupDeadline']>
  try {
    cleanupDeadline = input.task.deadline.createCleanupDeadline(5_000)
  } catch {
    return { error: cleanupError(false), remoteCancelConfirmed: false }
  }
  const cleanupSignal = cleanupDeadline.signal
  const cleanupOptions = (operation: McpOperationKind): McpOperationOptions => ({
    signal: cleanupSignal,
    timeoutMs: 5_000,
    operation,
  })
  try {
    let remoteCancelConfirmed = input.terminalSeen
    try {
      const cancelResult = await waitWithSignal(cleanupSignal, () => input.client.callTool(
        input.tools.cancelSession,
        buildBudaToolArguments('cancelSession', input.tools.cancelSession, {
          agentId: input.task.agentId,
          sessionId: input.sessionId,
        }),
        cleanupOptions('mutation'),
      ))
      remoteCancelConfirmed = remoteCancelConfirmed || ownDataValue(mcpResultData(cancelResult), 'cancelled') === true
    } catch {}
    if (!remoteCancelConfirmed && !cleanupSignal.aborted) {
      try {
        const statusResult = await waitWithSignal(cleanupSignal, () => input.client.callTool(
          input.tools.getSession,
          buildBudaToolArguments('getSession', input.tools.getSession, {
            agentId: input.task.agentId,
            sessionId: input.sessionId,
          }),
          cleanupOptions('read_safe'),
        ))
        remoteCancelConfirmed = ['completed', 'failed', 'cancelled'].includes(sessionStatus(mcpResultData(statusResult)))
      } catch {}
    }
    return { error: cleanupError(remoteCancelConfirmed), remoteCancelConfirmed }
  } finally {
    try { cleanupDeadline.close() } catch {}
  }
}

class BudaChapterTaskSessionImpl implements BudaChapterTaskSession {
  private tail: Promise<void> = Promise.resolve()
  private closed = false
  private closePromise?: Promise<void>
  private poisonedError?: unknown

  constructor(
    private readonly client: McpClientPort,
    private readonly tools: BudaToolMap,
    private readonly task: BudaChapterTaskInput,
    readonly sessionId: string,
    readonly snapshotHash: string,
    private readonly selectedModel: string,
    private readonly startedAt: number,
  ) {}

  private remoteOptions(): McpAdapterOperationOptions {
    const task = this.task
    return {
      signal: task.deadline.signal,
      get timeoutMs() { return task.deadline.timeoutMs(task.server.tool_timeout_ms) },
    }
  }

  private callOptions(operation: McpOperationKind) {
    return operationOptions(this.remoteOptions(), operation)
  }

  private async progress(
    stage: string,
    status: 'running' | 'success' | 'warn' | 'failed' = 'running',
    detail?: string,
  ) {
    await this.task.onProgress?.({
      stage,
      status,
      detail,
      elapsed_ms: Date.now() - this.startedAt,
      session_id: this.sessionId,
      snapshot_hash: this.snapshotHash,
    })
  }

  private async executeStage(input: BudaChapterStageInput): Promise<BudaChapterStageResult> {
    let terminalSeen = false
    try {
      this.task.deadline.throwIfAborted()
      const modelArguments = this.selectedModel ? { model: this.selectedModel } : {}
      try {
        await this.client.callTool(
          this.tools.sendSessionMessage,
          buildBudaToolArguments('sendSessionMessage', this.tools.sendSessionMessage, {
            agentId: this.task.agentId,
            sessionId: this.sessionId,
            message: buildBudaStageEnvelope(input),
            mode: 'agent',
            ...modelArguments,
            startRun: true,
          }),
          this.callOptions('mutation'),
        )
      } catch (error) {
        if (!sendMayHaveSucceeded(error)) throw error
        throw new McpError('MCP_SEND_UNKNOWN', 'Buda 阶段任务发送结果无法确认', {
          session_id: this.sessionId.slice(0, 160),
        })
      }
      this.task.deadline.throwIfAborted()
      await this.progress('mcp_session_create', 'success')
      await this.progress('mcp_session_wait')
      let interval = Math.max(1, this.task.server.poll_initial_ms)
      while (true) {
        this.task.deadline.throwIfAborted()
        const sessionResult = await this.client.callTool(
          this.tools.getSession,
          buildBudaToolArguments('getSession', this.tools.getSession, {
            agentId: this.task.agentId,
            sessionId: this.sessionId,
          }),
          this.callOptions('read_safe'),
        )
        const sessionData = mcpResultData(sessionResult)
        const status = sessionStatus(sessionData)
        terminalSeen = status === 'completed' || status === 'failed' || status === 'cancelled'
        this.task.deadline.throwIfAborted()
        if (status === 'pending' || status === 'in_progress') {
          await this.progress('mcp_session_wait', 'running', status)
          await abortableDelay(interval, this.task)
          this.task.deadline.throwIfAborted()
          interval = Math.min(
            Math.max(interval + 1, Math.round(interval * 1.5)),
            Math.max(interval, this.task.server.poll_max_ms),
          )
          continue
        }
        if (status === 'waiting_for_input') throw new McpError('MCP_INPUT_REQUIRED', 'Buda Agent 正在等待额外输入')
        if (status === 'failed') throw new McpError('MCP_SESSION_FAILED', 'Buda Session 执行失败')
        if (status === 'cancelled') throw new McpError('MCP_CANCELLED', 'Buda Session 已取消')
        if (status !== 'completed') throw new McpError('MCP_SESSION_FAILED', `Buda Session 返回未知状态：${status || 'empty'}`)
        await this.progress('mcp_session_wait', 'success', status)
        this.task.deadline.throwIfAborted()
        await this.progress('mcp_extract')
        const content = extractBudaStageContent(sessionData)
        await this.progress('mcp_extract', 'success')
        this.task.deadline.throwIfAborted()
        return {
          content,
          session_id: this.sessionId,
          snapshot_hash: this.snapshotHash,
          status: 'completed',
        }
      }
    } catch (error) {
      let primaryError = error
      if (this.task.deadline.signal.aborted && isAbortRelatedError(error, this.task.deadline.signal)) {
        try { this.task.deadline.throwIfAborted() } catch (cause) { primaryError = cause }
      }
      const cleanup = await cleanupBudaSession({
        client: this.client,
        tools: this.tools,
        task: this.task,
        sessionId: this.sessionId,
        terminalSeen,
        primaryError,
      })
      if (!cleanup.remoteCancelConfirmed) this.poisonedError = cleanup.error
      throw cleanup.error
    }
  }

  runStage(input: BudaChapterStageInput): Promise<BudaChapterStageResult> {
    if (this.poisonedError) return Promise.reject(this.poisonedError)
    if (this.closed) return Promise.reject(new McpError('MCP_SESSION_FAILED', 'Buda Chapter Task Session 已关闭'))
    const operation = this.tail.then(() => {
      if (this.poisonedError) throw this.poisonedError
      return this.executeStage(input)
    })
    this.tail = operation.then(() => undefined, () => undefined)
    return operation
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.closed = true
    this.closePromise = this.tail.then(() => undefined)
    return this.closePromise
  }
}

export class BudaAdapter implements ProseMcpAdapter {
  readonly id = 'buda'
  private tools?: BudaToolMap

  constructor(private readonly client: McpClientPort) {}

  private async resolveTools(options: McpAdapterOperationOptions, requireCreateAgent = false) {
    this.tools = resolveBudaTools(await this.client.listTools(options), { requireCreateAgent })
    return this.tools
  }

  async listAgents(options: McpAdapterOperationOptions = {}) {
    const tools = this.tools || await this.resolveTools(options)
    const data = agentResultData(await this.client.callTool(
      tools.listAgents,
      buildBudaToolArguments('listAgents', tools.listAgents, {}),
      operationOptions(options, 'read_safe'),
    ))
    return normalizeBudaAgentList(data)
  }

  async createAgent(input: { name: string; spaceId?: string; instructions?: string }, options: McpAdapterOperationOptions = {}) {
    const tools = this.tools?.createAgent ? this.tools : await this.resolveTools(options, true)
    let spaceId = String(input.spaceId || '')
    if (!spaceId) {
      const existing = await this.listAgents(options)
      spaceId = String(existing.find(item => (item.raw as any)?.spaceId)?.raw?.spaceId || '')
    }
    if (!spaceId) throw new McpError('MCP_BINDING_INVALID', '创建 Buda Agent 需要 spaceId；请先在 Buda 中创建空间')
    const data = agentResultData(await this.client.callTool(tools.createAgent!, buildBudaToolArguments('createAgent', tools.createAgent!, {
      spaceId,
      name: String(input.name || 'MangaForge 小说正文 Agent'),
      emoji: '✍️',
      instructions: String(input.instructions || MANGAFORGE_BUDA_AGENT_INSTRUCTIONS),
    }), operationOptions(options, 'mutation')))
    const nestedAgent = ownDataValue(data, 'agent')
    const agent = cleanAgent(nestedAgent && typeof nestedAgent === 'object' ? nestedAgent : data)
    if (!agent.id) throw new McpError('MCP_TOOL_ERROR', 'Buda 未返回新 Agent 标识')
    return { id: agent.id, name: agent.name }
  }

  async inspectSession(
    input: { agentId: string; sessionId: string },
    options: McpAdapterOperationOptions = {},
  ) {
    const tools = this.tools || await this.resolveTools(options)
    const data = mcpResultData(await this.client.callTool(tools.getSession, buildBudaToolArguments('getSession', tools.getSession, {
      agentId: input.agentId,
      sessionId: input.sessionId,
    }), operationOptions(options, 'read_safe')))
    const status = publicSessionStatus(data)
    return {
      status,
      terminal: status === 'completed' || status === 'failed' || status === 'cancelled',
    }
  }

  async openChapterTask(input: BudaChapterTaskInput): Promise<BudaChapterTaskSession> {
    input = withIndependentTaskSignal(input)
    const startedAt = Date.now()
    let activeSessionId = ''
    let tools: BudaToolMap | undefined
    const progress = async (
      stage: string,
      status: 'running' | 'success' | 'warn' | 'failed' = 'running',
      detail?: string,
    ) => {
      await input.onProgress?.({
        stage,
        status,
        detail,
        elapsed_ms: Date.now() - startedAt,
        ...(activeSessionId ? { session_id: activeSessionId } : {}),
      })
    }
    const remoteOptions = () => ({
      signal: input.deadline.signal,
      get timeoutMs() { return input.deadline.timeoutMs(input.server.tool_timeout_ms) },
    })
    const callOptions = (operation: McpOperationKind) => operationOptions(remoteOptions(), operation)
    try {
      input.deadline.throwIfAborted()
      await progress('mcp_capabilities')
      tools = await this.resolveTools(remoteOptions())
      input.deadline.throwIfAborted()
      const agents = await this.listAgents(remoteOptions())
      if (!agents.some(agent => agent.id === input.agentId)) {
        throw new McpError('MCP_BINDING_INVALID', 'Buda 绑定的 Agent 不存在或不可访问')
      }
      input.deadline.throwIfAborted()
      await progress('mcp_capabilities', 'success')

      await progress('mcp_drive_sync')
      const snapshot = buildBudaDriveSnapshot({
        project: input.project,
        chapter: input.chapter,
        writingBible: input.drive.writingBible,
        storyState: input.drive.storyState,
        continuity: input.drive.continuity,
        recentChapters: input.drive.recentChapters,
      })
      const sync = await syncBudaDriveSnapshot({
        client: this.client,
        tools,
        agentId: input.agentId,
        snapshot,
        deadline: input.deadline,
        toolTimeoutMs: input.server.tool_timeout_ms,
      })
      input.deadline.throwIfAborted()
      await input.onProgress?.({
        stage: 'mcp_drive_sync',
        status: 'success',
        detail: `已同步 ${sync.uploaded_paths.length} 个权威快照文件`,
        elapsed_ms: Date.now() - startedAt,
        snapshot_hash: snapshot.snapshotHash,
      })

      await progress('mcp_session_create')
      const selectedModel = String(input.model || '').trim()
      const modelArguments = selectedModel ? { model: selectedModel } : {}
      const createResult = await this.client.callTool(
        tools.createSession,
        buildBudaToolArguments('createSession', tools.createSession, {
          agentId: input.agentId,
          message: `MangaForge 章节任务 ${input.taskId} 已建立；请等待当前 Session 的 stage 指令。`,
          title: `MangaForge 第${input.chapterNo}章 ${input.taskId}`,
          mode: 'agent',
          ...modelArguments,
          startRun: false,
        }),
        callOptions('mutation'),
      )
      const created = mcpResultData(createResult)
      activeSessionId = sessionId(created)
      if (!activeSessionId) throw new McpError('MCP_SESSION_FAILED', 'Buda 未返回 Session 标识')
      await input.onProgress?.({
        stage: 'session_created',
        status: 'running',
        detail: 'Buda Session 已创建，等待当前章节任务的 stage 指令',
        elapsed_ms: Date.now() - startedAt,
        session_id: activeSessionId,
        snapshot_hash: snapshot.snapshotHash,
      })
      input.deadline.throwIfAborted()
      await progress('mcp_session_create', 'success')
      return new BudaChapterTaskSessionImpl(
        this.client,
        tools,
        input,
        activeSessionId,
        snapshot.snapshotHash,
        selectedModel,
        startedAt,
      )
    } catch (error) {
      let primaryError = error
      if (input.deadline.signal.aborted && isAbortRelatedError(error, input.deadline.signal)) {
        try { input.deadline.throwIfAborted() } catch (cause) { primaryError = cause }
      }
      if (!activeSessionId || !tools) throw primaryError
      const cleanup = await cleanupBudaSession({
        client: this.client,
        tools,
        task: input,
        sessionId: activeSessionId,
        terminalSeen: false,
        primaryError,
      })
      throw cleanup.error
    }
  }

  async generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult> {
    let task: BudaChapterTaskSession | undefined
    let failed = false
    try {
      task = await this.openChapterTask({
        activeWorkspace: input.activeWorkspace,
        server: input.server,
        keyId: input.keyId,
        agentId: input.agentId,
        ...(input.model !== undefined ? { model: input.model } : {}),
        taskId: input.requestId,
        project: input.project,
        chapter: input.chapter,
        chapterNo: input.chapterNo,
        drive: input.drive,
        deadline: input.deadline,
        ...(input.signal ? { signal: input.signal } : {}),
        ...(input.onProgress ? { onProgress: input.onProgress } : {}),
      })
      let stage: BudaChapterStageResult
      try {
        stage = await task.runStage({
          requestId: input.requestId,
          stage: 'draft',
          responseContract: 'draft_prose',
          prompt: input.paragraphTask,
        })
      } catch (error) {
        if (error instanceof McpError && error.code === 'MCP_TOOL_ERROR' && error.message === 'Buda Stage 已完成但没有返回内容') {
          throw new McpError('MCP_EMPTY_PROSE', 'Buda Session 已完成但没有返回正文', error.details)
        }
        throw error
      }
      const proseChapters = extractBudaProse({
        messages: [{ role: 'assistant', content: stage.content }],
      }, input.chapterNo)
      return {
        prose_chapters: proseChapters,
        source: 'mcp',
        adapter_id: 'buda',
        agent_id: input.agentId,
        session_id: stage.session_id,
        snapshot_hash: stage.snapshot_hash,
        completed: true,
        raw: { request_id: input.requestId, session_status: stage.status },
      }
    } catch (error) {
      failed = true
      throw error
    } finally {
      try {
        await task?.close()
      } catch (closeError) {
        if (!failed) throw closeError
      }
    }
  }
}
