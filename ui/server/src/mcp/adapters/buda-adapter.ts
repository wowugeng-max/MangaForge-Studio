import { types } from 'node:util'
import { isAbortRelatedError, McpError } from '../errors'
import { mcpResultData, buildBudaDriveSnapshot, syncBudaDriveSnapshot } from './buda-drive'
import { resolveBudaTools, type BudaToolMap } from './buda-tool-map'
import type { McpOperationKind, McpOperationOptions, McpToolResult } from '../types'
import type {
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

function sessionStatus(data: any) {
  return String(data?.session?.status || data?.run?.status || data?.status || '')
}

const PUBLIC_SESSION_STATUSES = new Set([
  'completed', 'failed', 'cancelled', 'waiting_for_input', 'pending', 'in_progress',
])

function publicSessionStatus(data: any) {
  const status = sessionStatus(data)
  return PUBLIC_SESSION_STATUSES.has(status) ? status : 'unknown'
}

function sessionId(data: any) {
  return String(data?.session?.id || data?.sessionId || data?.id || '')
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

function abortableDelay(ms: number, input: BudaProseGenerationInput) {
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
  '你是 MangaForge 专用长篇小说正文执行 Agent。',
  '当前请求与 MangaForge Drive 中的最新 Story State 是权威事实，远端历史记忆不得覆盖它们。',
  '输入材料不足时不得擅自补造正史，应明确返回缺失信息。',
  '每次只完成请求指定的章节正文，不主动扩展生产流程。',
].join('\n')

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
      {},
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
    const data = agentResultData(await this.client.callTool(tools.createAgent!, {
      spaceId,
      name: String(input.name || 'MangaForge 小说正文 Agent'),
      emoji: '✍️',
      instructions: String(input.instructions || MANGAFORGE_BUDA_AGENT_INSTRUCTIONS),
    }, operationOptions(options, 'mutation')))
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
    const data = mcpResultData(await this.client.callTool(tools.getSession, {
      agentId: input.agentId,
      sessionId: input.sessionId,
    }, operationOptions(options, 'read_safe')))
    const status = publicSessionStatus(data)
    return {
      status,
      terminal: status === 'completed' || status === 'failed' || status === 'cancelled',
    }
  }

  async generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult> {
    const startedAt = Date.now()
    let activeSessionId = ''
    let terminalSeen = false
    let tools: BudaToolMap | undefined
    const progress = async (stage: string, status: 'running' | 'success' | 'warn' | 'failed' = 'running', detail?: string) => {
      await input.onProgress?.({ stage, status, detail, elapsed_ms: Date.now() - startedAt, ...(activeSessionId ? { session_id: activeSessionId } : {}) })
    }
    try {
      const remoteOptions = () => ({
        signal: input.deadline.signal,
        get timeoutMs() { return input.deadline.timeoutMs(input.server.tool_timeout_ms) },
      })
      const callOptions = (operation: McpOperationKind) => operationOptions(remoteOptions(), operation)
      input.deadline.throwIfAborted()
      await progress('mcp_capabilities')
      tools = await this.resolveTools(remoteOptions())
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
      const message = buildBudaExecutionEnvelope({
        requestId: input.requestId,
        chapterNo: input.chapterNo,
        chapterTitle: input.chapter?.title,
        paragraphTask: input.paragraphTask,
      })
      const createResult = await this.client.callTool(tools.createSession, {
        agentId: input.agentId,
        message: `MangaForge 请求 ${input.requestId} 已建立；请等待同一 Session 的完整章节任务。`,
        title: `MangaForge 第${input.chapterNo}章 ${input.requestId}`,
        mode: 'agent',
        startRun: false,
      }, callOptions('mutation'))
      const created = mcpResultData(createResult)
      activeSessionId = sessionId(created)
      if (!activeSessionId) throw new McpError('MCP_SESSION_FAILED', 'Buda 未返回 Session 标识')
      await input.onProgress?.({
        stage: 'session_created',
        status: 'running',
        detail: 'Buda Session 已创建，等待持久化后发送正文任务',
        elapsed_ms: Date.now() - startedAt,
        session_id: activeSessionId,
        snapshot_hash: snapshot.snapshotHash,
      })
      input.deadline.throwIfAborted()
      try {
        await this.client.callTool(tools.sendSessionMessage, {
          agentId: input.agentId,
          sessionId: activeSessionId,
          message,
          mode: 'agent',
          startRun: true,
        }, callOptions('mutation'))
      } catch (error) {
        if (!sendMayHaveSucceeded(error)) throw error
        throw new McpError('MCP_SEND_UNKNOWN', 'Buda 正文任务发送结果无法确认', {
          session_id: activeSessionId.slice(0, 160),
        })
      }
      input.deadline.throwIfAborted()
      await progress('mcp_session_create', 'success')

      await progress('mcp_session_wait')
      let interval = Math.max(1, input.server.poll_initial_ms)
      while (true) {
        input.deadline.throwIfAborted()
        const sessionResult = await this.client.callTool(tools.getSession, {
          agentId: input.agentId,
          sessionId: activeSessionId,
        }, callOptions('read_safe'))
        const sessionData = mcpResultData(sessionResult)
        const status = sessionStatus(sessionData)
        terminalSeen = status === 'completed' || status === 'failed' || status === 'cancelled'
        input.deadline.throwIfAborted()
        if (status === 'pending' || status === 'in_progress') {
          await progress('mcp_session_wait', 'running', status)
          await abortableDelay(interval, input)
          input.deadline.throwIfAborted()
          interval = Math.min(Math.max(interval + 1, Math.round(interval * 1.5)), Math.max(interval, input.server.poll_max_ms))
          continue
        }
        if (status === 'waiting_for_input') throw new McpError('MCP_INPUT_REQUIRED', 'Buda Agent 正在等待额外输入')
        if (status === 'failed') throw new McpError('MCP_SESSION_FAILED', 'Buda Session 执行失败')
        if (status === 'cancelled') throw new McpError('MCP_CANCELLED', 'Buda Session 已取消')
        if (status !== 'completed') throw new McpError('MCP_SESSION_FAILED', `Buda Session 返回未知状态：${status || 'empty'}`)
        await progress('mcp_session_wait', 'success', status)
        input.deadline.throwIfAborted()
        await progress('mcp_extract')
        const proseChapters = extractBudaProse(sessionData, input.chapterNo)
        await progress('mcp_extract', 'success')
        input.deadline.throwIfAborted()
        return {
          prose_chapters: proseChapters,
          source: 'mcp',
          adapter_id: 'buda',
          agent_id: input.agentId,
          session_id: activeSessionId,
          snapshot_hash: snapshot.snapshotHash,
          completed: true,
          raw: { request_id: input.requestId, session_status: status },
        }
      }
    } catch (error) {
      let primaryError = error
      if (input.deadline.signal.aborted && isAbortRelatedError(error, input.deadline.signal)) {
        try { input.deadline.throwIfAborted() } catch (cause) { primaryError = cause }
      }
      if (!activeSessionId || !tools) throw primaryError

      const cleanupDeadline = input.deadline.createCleanupDeadline(5_000)
      const cleanupSignal = cleanupDeadline.signal
      const cleanupOptions = (operation: McpOperationKind): McpOperationOptions => ({
        signal: cleanupSignal,
        timeoutMs: 5_000,
        operation,
      })
      try {
        let remoteCancelConfirmed = terminalSeen
        try {
          const cancelResult = await waitWithSignal(cleanupSignal, () => this.client.callTool(tools!.cancelSession, {
            agentId: input.agentId,
            sessionId: activeSessionId,
          }, cleanupOptions('mutation')))
          remoteCancelConfirmed = remoteCancelConfirmed || mcpResultData(cancelResult)?.cancelled === true
        } catch {}
        if (!remoteCancelConfirmed && !cleanupSignal.aborted) {
          try {
            const statusResult = await waitWithSignal(cleanupSignal, () => this.client.callTool(tools!.getSession, {
              agentId: input.agentId,
              sessionId: activeSessionId,
            }, cleanupOptions('read_safe')))
            remoteCancelConfirmed = ['completed', 'failed', 'cancelled'].includes(sessionStatus(mcpResultData(statusResult)))
          } catch {}
        }
        const sendWasAmbiguous = primaryError instanceof McpError && primaryError.code === 'MCP_SEND_UNKNOWN'
        throw withRemoteCleanupDetails(primaryError, {
          session_id: activeSessionId.slice(0, 160),
          remote_cancel_confirmed: remoteCancelConfirmed,
          ...(!remoteCancelConfirmed ? {
            receipt_status: sendWasAmbiguous ? 'send_unknown' : 'remote_cancel_unknown',
          } : {}),
        })
      } finally {
        cleanupDeadline.close()
      }
    }
  }
}
