import { describe, expect, test } from 'bun:test'
import { BudaAdapter, buildBudaExecutionEnvelope, extractBudaProse, normalizeBudaAgentList } from './buda-adapter'
import { BUDA_MCP_SERVER_TEMPLATE } from '../server-store'

const toolNames = [
  'apiClaw.listApiAgents',
  'apiClaw.createApiAgent',
  'apiClaw.listApiAgentDriveFiles',
  'apiClaw.upsertApiAgentDriveFile',
  'apiClaw.apiAgentDriveText',
  'apiClaw.createApiAgentSession',
  'apiClaw.getApiAgentSession',
  'apiClaw.postApiAgentSessionMessage',
  'apiClaw.cancelApiAgentSessionRun',
]

function structured(data: Record<string, unknown>) {
  return { content: [], structuredContent: data }
}

function createFakeClient(statuses: string[] = ['completed']) {
  const calls: Array<{ name: string; args: any; options: any }> = []
  const listToolOptions: any[] = []
  const remote = new Map<string, string>()
  let statusIndex = 0
  return {
    calls,
    listToolOptions,
    client: {
      async listTools(options: any) {
        listToolOptions.push(options)
        return toolNames.map(name => ({ name, inputSchema: { type: 'object' } }))
      },
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name.endsWith('listApiAgents')) return structured({ apiAgents: [{ id: 'agent-1', name: '正文 Agent', spaceId: 'space-1' }], total: 1 })
        if (name.endsWith('createApiAgent')) return structured({ agent: { id: 'agent-2', name: args.name, spaceId: args.spaceId } })
        if (name.endsWith('listApiAgentDriveFiles')) return structured({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name.endsWith('upsertApiAgentDriveFile')) { remote.set(args.path, args.content); return structured({ ok: true }) }
        if (name.endsWith('apiAgentDriveText')) return structured({ content: remote.get(args.filePath) || '' })
        if (name.endsWith('createApiAgentSession')) return structured({ session: { id: 'session-1', status: 'pending' }, run: { started: false } })
        if (name.endsWith('postApiAgentSessionMessage')) return structured({ session: { id: 'session-1' }, run: { started: true } })
        if (name.endsWith('getApiAgentSession')) {
          const status = statuses[Math.min(statusIndex++, statuses.length - 1)]!
          return structured({
            session: { id: 'session-1', status },
            run: { status },
            messages: status === 'completed' ? [{ role: 'assistant', content: '这是完整的本章正文。' }] : [],
          })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) return structured({ ok: true, cancelled: true })
        throw new Error(`unexpected tool ${name}`)
      },
    },
  }
}

function generationInput(overrides: Record<string, unknown> = {}) {
  return {
    activeWorkspace: '/workspace/a',
    server: { ...BUDA_MCP_SERVER_TEMPLATE, poll_initial_ms: 1, poll_max_ms: 2 },
    keyId: 3,
    agentId: 'agent-1',
    requestId: 'request-12',
    project: { id: 8, title: '长篇测试' },
    chapter: { id: 22, chapter_no: 12, title: '雨夜' },
    chapterNo: 12,
    paragraphTask: '完整段落任务：前因、当前目标、后果与输出合同。',
    promptDiagnostics: { prompt_chars: 28 },
    drive: { writingBible: '# 圣经', storyState: {}, continuity: '连续性', recentChapters: '第11章摘要' },
    ...overrides,
  } as any
}

function expectBudaOperations(calls: Array<{ name: string; options: any }>) {
  for (const call of calls) {
    const readSafe = call.name.endsWith('listApiAgents')
      || call.name.endsWith('listApiAgentDriveFiles')
      || call.name.endsWith('apiAgentDriveText')
      || call.name.endsWith('getApiAgentSession')
    expect(call.options.operation).toBe(readSafe ? 'read_safe' : 'mutation')
  }
}

describe('BudaAdapter', () => {
  test('lists existing Agents and preserves only bounded summary fields', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)
    expect(await adapter.listAgents()).toEqual([{ id: 'agent-1', name: '正文 Agent', raw: { spaceId: 'space-1' } }])
    expect(fake.listToolOptions).toEqual([{}])
    expect(fake.calls.find(call => call.name.endsWith('listApiAgents'))?.options.operation).toBe('read_safe')
    expectBudaOperations(fake.calls)
  })

  test('classifies Agent creation as a mutation', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    expect(await adapter.createAgent({ name: '新 Agent', spaceId: 'space-1' })).toEqual({ id: 'agent-2', name: '新 Agent' })
    expect(fake.calls.find(call => call.name.endsWith('createApiAgent'))?.options.operation).toBe('mutation')
    expectBudaOperations(fake.calls)
  })

  test('sends the complete paragraph task after Drive sync and extracts final assistant prose', async () => {
    const fake = createFakeClient(['pending', 'in_progress', 'completed'])
    const adapter = new BudaAdapter(fake.client as any)
    const progress: string[] = []
    const output = await adapter.generateProse(generationInput({ onProgress: (event: any) => progress.push(event.stage) }))

    const messageCall = fake.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))
    expect(messageCall?.args.message).toContain('完整段落任务：前因、当前目标、后果与输出合同。')
    expect(messageCall?.args.message).toContain('当前章节请求与 paragraphTask 优先级最高')
    expect(output).toEqual(expect.objectContaining({
      source: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
      completed: true,
      prose_chapters: [{ chapter_no: 12, chapter_text: '这是完整的本章正文。' }],
    }))
    expect(progress).toEqual(expect.arrayContaining(['mcp_capabilities', 'mcp_drive_sync', 'mcp_session_create', 'mcp_session_wait', 'mcp_extract']))
    expectBudaOperations(fake.calls)
  })

  test('maps waiting_for_input and failed terminal states without fallback', async () => {
    const waiting = createFakeClient(['waiting_for_input'])
    await expect(new BudaAdapter(waiting.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_INPUT_REQUIRED' })
    expectBudaOperations(waiting.calls)
    const failed = createFakeClient(['failed'])
    await expect(new BudaAdapter(failed.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expectBudaOperations(failed.calls)
  })

  test('rejects concurrent generation for the same workspace Server Key and Agent tuple', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const fake = createFakeClient(['pending', 'completed'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) await gate
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)
    const first = adapter.generateProse(generationInput())
    await new Promise(resolve => setTimeout(resolve, 5))
    await expect(adapter.generateProse(generationInput())).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    release()
    await first
    expectBudaOperations(fake.calls)
  })

  test('cancels an active remote Session best-effort when aborted', async () => {
    const controller = new AbortController()
    const fake = createFakeClient(['in_progress'])
    const adapter = new BudaAdapter(fake.client as any)
    const generation = adapter.generateProse(generationInput({ signal: controller.signal }))
    setTimeout(() => controller.abort(), 5)
    await expect(generation).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
    const cancel = fake.calls.find(call => call.name.endsWith('cancelApiAgentSessionRun'))
    expect(cancel?.options.operation).toBe('mutation')
    expectBudaOperations(fake.calls)
  })
})

describe('Buda result normalization', () => {
  test('keeps compatibility with the agents list shape', () => {
    expect(normalizeBudaAgentList({ agents: [{ id: 'agent-1', name: 'Agent 1' }] }))
      .toEqual([{ id: 'agent-1', name: 'Agent 1' }])
  })

  test('keeps compatibility with the items list shape', () => {
    expect(normalizeBudaAgentList({ items: [{ agentId: 'agent-2', title: 'Agent 2' }] }))
      .toEqual([{ id: 'agent-2', name: 'Agent 2' }])
  })

  test('keeps compatibility with a raw Agent array', () => {
    expect(normalizeBudaAgentList([{ id: 'agent-3', name: 'Agent 3' }]))
      .toEqual([{ id: 'agent-3', name: 'Agent 3' }])
  })

  test('prefers a structured chapter payload over text content', () => {
    expect(extractBudaProse({
      prose_chapters: [{ chapter_no: 4, title: '标题', chapter_text: '结构化正文' }],
      messages: [{ role: 'assistant', content: '后备正文' }],
    }, 4)).toEqual([{ chapter_no: 4, title: '标题', chapter_text: '结构化正文' }])
  })

  test('builds an authority envelope without changing the paragraph task', () => {
    const paragraphTask = '必须逐字保留的任务正文'
    const envelope = buildBudaExecutionEnvelope({ requestId: 'r1', chapterNo: 2, chapterTitle: '雨', paragraphTask })
    expect(envelope.endsWith(paragraphTask)).toBe(true)
  })
})
