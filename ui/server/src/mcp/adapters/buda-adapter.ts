import { McpError } from '../errors'
import { mcpResultData, buildBudaDriveSnapshot, syncBudaDriveSnapshot } from './buda-drive'
import { resolveBudaTools, type BudaToolMap } from './buda-tool-map'
import type {
  BudaProseGenerationInput,
  BudaProseGenerationResult,
  McpClientPort,
  ProseMcpAdapter,
} from './types'

const activeAgentRuns = new Set<string>()

function cleanAgent(item: any) {
  const id = String(item?.id || item?.agentId || '')
  const spaceId = String(item?.spaceId || item?.space_id || '')
  return {
    id,
    name: String(item?.name || item?.title || id),
    ...(item?.description ? { description: String(item.description) } : {}),
    ...(item?.status ? { status: String(item.status) } : {}),
    ...(spaceId ? { raw: { spaceId } } : {}),
  }
}

function sessionStatus(data: any) {
  return String(data?.session?.status || data?.run?.status || data?.status || '')
}

function sessionId(data: any) {
  return String(data?.session?.id || data?.sessionId || data?.id || '')
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

function abortableDelay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new McpError('MCP_CANCELLED', 'MCP 正文生成已取消'))
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    const abort = () => {
      clearTimeout(timer)
      reject(new McpError('MCP_CANCELLED', 'MCP 正文生成已取消'))
    }
    signal?.addEventListener('abort', abort, { once: true })
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

  private async resolveTools(signal?: AbortSignal) {
    this.tools = resolveBudaTools(await this.client.listTools(signal))
    return this.tools
  }

  async listAgents(signal?: AbortSignal) {
    const tools = this.tools || await this.resolveTools(signal)
    const data = mcpResultData(await this.client.callTool(tools.listAgents, {}, { signal }))
    const agents = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : []
    return agents.map(cleanAgent).filter(item => item.id)
  }

  async createAgent(input: { name: string; spaceId?: string; instructions?: string }, signal?: AbortSignal) {
    const tools = this.tools || await this.resolveTools(signal)
    let spaceId = String(input.spaceId || '')
    if (!spaceId) {
      const existing = await this.listAgents(signal)
      spaceId = String(existing.find(item => (item.raw as any)?.spaceId)?.raw?.spaceId || '')
    }
    if (!spaceId) throw new McpError('MCP_BINDING_INVALID', '创建 Buda Agent 需要 spaceId；请先在 Buda 中创建空间')
    const data = mcpResultData(await this.client.callTool(tools.createAgent, {
      spaceId,
      name: String(input.name || 'MangaForge 小说正文 Agent'),
      emoji: '✍️',
      instructions: String(input.instructions || MANGAFORGE_BUDA_AGENT_INSTRUCTIONS),
    }, { signal }))
    const agent = cleanAgent(data?.agent || data)
    if (!agent.id) throw new McpError('MCP_TOOL_ERROR', 'Buda 未返回新 Agent 标识')
    return { id: agent.id, name: agent.name }
  }

  async generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult> {
    const lockKey = `${input.activeWorkspace}\u0000${input.server.id}\u0000${input.keyId}\u0000${input.agentId}`
    if (activeAgentRuns.has(lockKey)) throw new McpError('MCP_AGENT_BUSY', '该 Buda Agent 正在生成另一章正文')
    activeAgentRuns.add(lockKey)
    const startedAt = Date.now()
    let activeSessionId = ''
    let tools: BudaToolMap | undefined
    const progress = async (stage: string, status: 'running' | 'success' | 'warn' | 'failed' = 'running', detail?: string) => {
      await input.onProgress?.({ stage, status, detail, elapsed_ms: Date.now() - startedAt, ...(activeSessionId ? { session_id: activeSessionId } : {}) })
    }
    try {
      if (input.signal?.aborted) throw new McpError('MCP_CANCELLED', 'MCP 正文生成已取消')
      await progress('mcp_capabilities')
      tools = await this.resolveTools(input.signal)
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
      const sync = await syncBudaDriveSnapshot({ client: this.client, tools, agentId: input.agentId, snapshot, signal: input.signal })
      await input.onProgress?.({
        stage: 'mcp_drive_sync',
        status: 'success',
        detail: `已同步 ${sync.uploaded_paths.length} 个权威快照文件`,
        elapsed_ms: Date.now() - startedAt,
        snapshot_hash: snapshot.snapshotHash,
      })

      await progress('mcp_session_create')
      const created = mcpResultData(await this.client.callTool(tools.createSession, {
        agentId: input.agentId,
        message: `MangaForge 请求 ${input.requestId} 已建立；请等待同一 Session 的完整章节任务。`,
        title: `MangaForge 第${input.chapterNo}章 ${input.requestId}`,
        mode: 'agent',
        startRun: false,
      }, { signal: input.signal }))
      activeSessionId = sessionId(created)
      if (!activeSessionId) throw new McpError('MCP_SESSION_FAILED', 'Buda 未返回 Session 标识')
      const message = buildBudaExecutionEnvelope({
        requestId: input.requestId,
        chapterNo: input.chapterNo,
        chapterTitle: input.chapter?.title,
        paragraphTask: input.paragraphTask,
      })
      await this.client.callTool(tools.sendSessionMessage, {
        agentId: input.agentId,
        sessionId: activeSessionId,
        message,
        mode: 'agent',
        startRun: true,
      }, { signal: input.signal })
      await progress('mcp_session_create', 'success')

      await progress('mcp_session_wait')
      let interval = Math.max(1, input.server.poll_initial_ms)
      while (true) {
        if (input.signal?.aborted) throw new McpError('MCP_CANCELLED', 'MCP 正文生成已取消')
        if (Date.now() - startedAt > input.server.generation_timeout_ms) {
          throw new McpError('MCP_GENERATION_TIMEOUT', 'Buda 正文生成超过总时限')
        }
        const sessionData = mcpResultData(await this.client.callTool(tools.getSession, {
          agentId: input.agentId,
          sessionId: activeSessionId,
        }, { signal: input.signal }))
        const status = sessionStatus(sessionData)
        if (status === 'pending' || status === 'in_progress') {
          await progress('mcp_session_wait', 'running', status)
          await abortableDelay(interval, input.signal)
          interval = Math.min(Math.max(interval + 1, Math.round(interval * 1.5)), Math.max(interval, input.server.poll_max_ms))
          continue
        }
        if (status === 'waiting_for_input') throw new McpError('MCP_INPUT_REQUIRED', 'Buda Agent 正在等待额外输入')
        if (status === 'failed') throw new McpError('MCP_SESSION_FAILED', 'Buda Session 执行失败')
        if (status === 'cancelled') throw new McpError('MCP_CANCELLED', 'Buda Session 已取消')
        if (status !== 'completed') throw new McpError('MCP_SESSION_FAILED', `Buda Session 返回未知状态：${status || 'empty'}`)
        await progress('mcp_session_wait', 'success', status)
        await progress('mcp_extract')
        const proseChapters = extractBudaProse(sessionData, input.chapterNo)
        await progress('mcp_extract', 'success')
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
      const cancelled = input.signal?.aborted || (error instanceof McpError && error.code === 'MCP_CANCELLED')
      if (cancelled && activeSessionId && tools) {
        await this.client.callTool(tools.cancelSession, {
          agentId: input.agentId,
          sessionId: activeSessionId,
        }).catch(() => {})
        throw new McpError('MCP_CANCELLED', 'MCP 正文生成已取消', { session_id: activeSessionId })
      }
      throw error
    } finally {
      activeAgentRuns.delete(lockKey)
    }
  }
}
