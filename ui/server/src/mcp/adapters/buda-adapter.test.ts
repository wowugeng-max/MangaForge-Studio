import { describe, expect, test } from 'bun:test'
import { BudaAdapter, buildBudaExecutionEnvelope, extractBudaProse, normalizeBudaAgentList } from './buda-adapter'
import * as budaAdapterModule from './buda-adapter'
import { BUDA_MCP_SERVER_TEMPLATE } from '../server-store'
import { McpGenerationDeadline } from '../deadline'
import { McpError } from '../errors'
import { BUDA_TOOL_ALIASES, buildBudaToolArguments, resolveBudaTools } from './buda-tool-map'
import { buildBudaDriveSnapshot } from './buda-drive'
import type { McpGenerationAdapter } from './types'

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
  let runSequence = 0
  let activeRunId = ''
  const completedRuns = new Set<string>()
  const assistantHistory: Array<{ role: 'assistant'; content: string }> = []
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
        if (name.endsWith('postApiAgentSessionMessage')) {
          activeRunId = `run-${++runSequence}`
          return structured({ session: { id: 'session-1' }, run: { id: activeRunId, started: true } })
        }
        if (name.endsWith('getApiAgentSession')) {
          const status = statuses[Math.min(statusIndex++, statuses.length - 1)]!
          if (status === 'completed' && activeRunId && !completedRuns.has(activeRunId)) {
            completedRuns.add(activeRunId)
            assistantHistory.push({ role: 'assistant', content: '这是完整的本章正文。' })
          }
          return structured({
            session: { id: 'session-1', status },
            run: { ...(activeRunId ? { id: activeRunId } : {}), status },
            messages: status === 'completed'
              ? activeRunId ? [...assistantHistory] : [{ role: 'assistant', content: '这是完整的本章正文。' }]
              : [],
          })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) return structured({ ok: true, cancelled: true })
        throw new Error(`unexpected tool ${name}`)
      },
    },
  }
}

function generationInput(overrides: Record<string, unknown> = {}) {
  const callerSignal = overrides.signal as AbortSignal | undefined
  const deadline = overrides.deadline || new McpGenerationDeadline(60_000, callerSignal, {
    now: Date.now,
    setTimeout: () => 1,
    clearTimeout: () => {},
  })
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
    context: { writingBible: '# 圣经', storyState: {}, continuity: '连续性', recentChapters: '第11章摘要' },
    deadline,
    stability: {
      async ensureReady() {},
      async runRead(_policy: any, _input: any, operation: any) { return operation() },
      async runMutation(_policy: any, _input: any, operation: any) { return operation() },
    },
    ...overrides,
  } as any
}

function chapterTaskInput(overrides: Record<string, unknown> = {}) {
  return {
    ...generationInput(),
    taskId: 'task-12',
    ...overrides,
  } as any
}

function stageInput(
  requestId: string,
  stage: string,
  responseContract: string,
  prompt = `${stage} prompt`,
) {
  return { requestId, stage, responseContract, prompt } as any
}

function invocationInput(overrides: Record<string, unknown> = {}) {
  return {
    ...chapterTaskInput(),
    invocationId: 'invocation-1',
    requestId: 'request-12',
    stage: 'draft',
    responseContract: 'draft_prose',
    prompt: 'complete authoritative prompt',
    stability: {
      async ensureReady() {},
      async runRead(_policy: any, _input: any, operation: any) { return operation() },
      async runMutation(_policy: any, _input: any, operation: any) { return operation() },
    },
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
  test('the generation adapter contract has no shared chapter task session', () => {
    const adapter = new BudaAdapter(createFakeClient().client as any) as any
    expect(adapter.openChapterTask).toBeUndefined()
  })

  test('creates a running Session with the complete stage envelope and never posts a message', async () => {
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return structured({ session: { id: 'session-draft', status: 'pending' }, run: { started: true } })
      }
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return structured({ session: { id: 'session-draft', status: 'completed' }, run: { status: 'completed' }, messages: [{ role: 'assistant', content: '正文' }] })
      }
      return original(name, args, options)
    }

    const result = await new BudaAdapter(fake.client as any).invokeChapterStage!(invocationInput())
    const create = fake.calls.find(call => call.name.endsWith('createApiAgentSession'))
    expect(create?.args).toMatchObject({ agentId: 'agent-1', startRun: true })
    expect(JSON.stringify(create?.args)).toContain('complete authoritative prompt')
    expect(fake.calls.some(call => call.name.endsWith('postApiAgentSessionMessage'))).toBe(false)
    expect(result).toMatchObject({ session_id: 'session-draft', status: 'completed' })
  })

  test('reconnects while polling the same Agent Session id', async () => {
    const fake = createFakeClient()
    const polledSessionIds: string[] = []
    let pollCount = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return structured({ session: { id: 'session-review', status: 'pending' }, run: { started: true } })
      }
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        polledSessionIds.push(args.sessionId)
        pollCount += 1
        if (pollCount === 1) throw new McpError('MCP_CONNECTION_LOST', 'transport lost')
        return structured({ session: { id: 'session-review', status: 'completed' }, run: { status: 'completed' }, messages: [{ role: 'assistant', content: '{"score": 90, "passed": true}' }] })
      }
      return original(name, args, options)
    }
    const result = await new BudaAdapter(fake.client as any).invokeChapterStage!(invocationInput({
      stage: 'quality_review',
      responseContract: 'quality_review_json',
      stability: {
        async ensureReady() {},
        async runRead(_policy: any, _input: any, operation: any) {
          try { return await operation() } catch (error) {
            if (error instanceof McpError && error.code === 'MCP_CONNECTION_LOST') return operation()
            throw error
          }
        },
        async runMutation(_policy: any, _input: any, operation: any) { return operation() },
      },
    }))
    expect(polledSessionIds).toEqual(['session-review', 'session-review'])
    expect(result.session_id).toBe('session-review')
  })

  test('does not submit a second create after an ambiguous failure', async () => {
    const fake = createFakeClient()
    let createCount = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        createCount += 1
        throw new McpError('MCP_CONNECTION_LOST', 'transport lost')
      }
      return original(name, args, options)
    }
    await expect(new BudaAdapter(fake.client as any).invokeChapterStage!(invocationInput()))
      .rejects.toMatchObject({ code: 'MCP_SEND_UNKNOWN' })
    expect(createCount).toBe(1)
  })

  test('does not expose an untrusted remote error message before Session creation', async () => {
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        throw new Error('secret prompt content from remote transport')
      }
      return original(name, args, options)
    }
    const caught = await new BudaAdapter(fake.client as any).invokeChapterStage!(invocationInput()).catch(error => error)
    expect(caught).toMatchObject({ code: 'MCP_TOOL_ERROR' })
    expect(String(caught?.message || caught)).not.toContain('secret prompt content')
  })

  for (const status of ['failed', 'cancelled'] as const) {
    test(`preserves one-shot ${status} terminal evidence when cleanup transport is unavailable`, async () => {
      const fake = createFakeClient()
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('createApiAgentSession')) {
          fake.calls.push({ name, args, options })
          return structured({ session: { id: `session-${status}`, status: 'pending' }, run: { started: true } })
        }
        if (name.endsWith('getApiAgentSession')) {
          fake.calls.push({ name, args, options })
          if (fake.calls.filter(call => call.name.endsWith('getApiAgentSession')).length === 1) {
            return structured({ session: { id: `session-${status}`, status }, run: { status }, messages: [] })
          }
          throw new McpError('MCP_CONNECTION_LOST', 'cleanup transport unavailable')
        }
        if (name.endsWith('cancelApiAgentSessionRun')) {
          fake.calls.push({ name, args, options })
          throw new McpError('MCP_CONNECTION_LOST', 'cleanup transport unavailable')
        }
        return original(name, args, options)
      }
      const caught = await new BudaAdapter(fake.client as any).invokeChapterStage!(invocationInput())
        .catch(error => error)
      expect(caught).toMatchObject({ code: status === 'failed' ? 'MCP_SESSION_FAILED' : 'MCP_CANCELLED' })
      expect(caught.details).not.toHaveProperty('receipt_status', 'remote_cancel_unknown')
    })
  }

  test('changes the Drive snapshot when stage input or upstream output changes', () => {
    const snapshotInput = (overrides: Record<string, unknown>) => ({
      project: { id: 8, title: 'long test' },
      chapter: { chapter_no: 12, title: 'rain' },
      writingBible: '# bible',
      storyState: { chapter_no: 11 },
      continuity: 'continuity',
      recentChapters: 'recent',
      ...overrides,
    })
    const draft = buildBudaDriveSnapshot(snapshotInput({ stage: 'draft', responseContract: 'draft_prose', prompt: 'chapter authority before draft' }))
    const review = buildBudaDriveSnapshot(snapshotInput({ stage: 'quality_review', responseContract: 'quality_review_json', prompt: 'validated draft: version B' }))
    expect(draft.snapshotHash).not.toBe(review.snapshotHash)
    expect(review.files['MANGAFORGE_CURRENT_STAGE.md']).toContain('validated draft: version B')
    const bounded = buildBudaDriveSnapshot(snapshotInput({ stage: 'draft', responseContract: 'draft_prose', prompt: '正文'.repeat(200_000) }))
    expect(new TextEncoder().encode(bounded.files['MANGAFORGE_CURRENT_STAGE.md']!).byteLength).toBeLessThanOrEqual(256 * 1_024)
  })

  test('exposes a two-success readiness policy that refreshes tools and calls the resolved listAgents tool', async () => {
    const fake = createFakeClient()
    const adapter: McpGenerationAdapter = new BudaAdapter(fake.client as any)
    const policy = adapter.stabilityPolicy
    const advertisedTools = Object.values(BUDA_TOOL_ALIASES)
      .map(aliases => ({ name: aliases[0]!, inputSchema: { type: 'object' } }))
    const mappedTools = resolveBudaTools(advertisedTools)
    fake.client.listTools = async (options: any) => {
      fake.listToolOptions.push(options)
      return advertisedTools
    }
    fake.client.callTool = async (name: string, args: any, options: any) => {
      fake.calls.push({ name, args, options })
      return structured({ apiAgents: [] })
    }

    expect(policy?.requiredConsecutiveSuccesses).toBe(2)
    expect(policy?.warmupWindowMs).toBe(15_000)

    await policy!.probe(fake.client as any, { timeoutMs: 500 })

    expect(fake.listToolOptions).toEqual([{ timeoutMs: 500, refreshTools: true }])
    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0]).toMatchObject({
      name: mappedTools.listAgents,
      args: buildBudaToolArguments('listAgents', mappedTools.listAgents, {}),
      options: { operation: 'read_safe', timeoutMs: 500 },
    })
  })

  test('classifies only exact structured not-ready evidence as pre-dispatch', () => {
    const policy = new BudaAdapter(createFakeClient().client as any).stabilityPolicy
    const errorWithEvidence = (failureEvidence: Record<string, unknown>) => new McpError(
      'MCP_SERVER_NOT_READY',
      'bounded local message',
      { failure_evidence: failureEvidence },
    )
    const exactEvidence = {
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: null,
      reason: 'server_not_initialized',
    }

    expect(policy.classify(errorWithEvidence(exactEvidence), 'mutation')).toBe('not_ready_pre_dispatch')
    expect(policy.classify(new Error('Server not initialized'), 'mutation')).toBe('ambiguous_write_failure')

    for (const failureEvidence of [
      { ...exactEvidence, http_status: 500 },
      { ...exactEvidence, jsonrpc_code: -32603 },
      { ...exactEvidence, response_id: 1 },
      { ...exactEvidence, reason: 'Server not initialized' },
      { ...exactEvidence, kind: 'forged_rejection' },
    ]) {
      expect(policy.classify(errorWithEvidence(failureEvidence), 'mutation'))
        .toBe('ambiguous_write_failure')
    }
  })

  test('classifies only connection loss and connect timeout as transient read failures', () => {
    const policy = new BudaAdapter(createFakeClient().client as any).stabilityPolicy

    for (const code of ['MCP_CONNECTION_LOST', 'MCP_CONNECT_TIMEOUT'] as const) {
      const error = new McpError(code, 'bounded local message')
      expect(policy.classify(error, 'read_safe')).toBe('transient_read_failure')
      expect(policy.classify(error, 'mutation')).toBe('ambiguous_write_failure')
    }

    for (const error of [
      new Error('connection lost'),
      new McpError('MCP_TOOL_ERROR', 'connection lost'),
      new McpError('MCP_SERVER_NOT_READY', 'not ready without evidence'),
    ]) {
      expect(policy.classify(error, 'read_safe')).toBe('terminal_failure')
      expect(policy.classify(error, 'mutation')).toBe('ambiguous_write_failure')
    }
  })

  test('inspects a Session with one read-safe getSession call and only trusts exact terminal states', async () => {
    const cases = [
      ['completed', 'completed', true],
      ['failed', 'failed', true],
      ['cancelled', 'cancelled', true],
      ['waiting_for_input', 'waiting_for_input', false],
      ['pending', 'pending', false],
      ['in_progress', 'in_progress', false],
      ['Completed', 'unknown', false],
      [' completed ', 'unknown', false],
      ['unexpected remote prose', 'unknown', false],
    ] as const

    for (const [status, publicStatus, terminal] of cases) {
      const fake = createFakeClient([status])
      const adapter = new BudaAdapter(fake.client as any)
      const signal = new AbortController().signal

      expect(await adapter.inspectSession(
        { agentId: 'agent-1', sessionId: 'session-1' },
        { signal, timeoutMs: 4321 },
      )).toEqual({ status: publicStatus, terminal })

      const getSessionCalls = fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))
      expect(getSessionCalls).toHaveLength(1)
      expect(getSessionCalls[0]).toMatchObject({
        args: { agentId: 'agent-1', sessionId: 'session-1' },
        options: { signal, timeoutMs: 4321, operation: 'read_safe' },
      })
      expect(fake.calls.filter(call => call.options.operation === 'mutation')).toHaveLength(0)
    }
  })

  test('does not execute remote Proxy traps while inspecting Session status', async () => {
    const fake = createFakeClient()
    let traps = 0
    const remote = new Proxy({ session: { status: 'completed' } }, {
      get() { traps += 1; return { status: 'completed' } },
      getOwnPropertyDescriptor() { traps += 1; return undefined },
    })
    fake.client.callTool = async (name: string, args: any, options: any) => {
      fake.calls.push({ name, args, options })
      if (name.endsWith('getApiAgentSession')) return { content: [], structuredContent: remote }
      throw new Error(`unexpected tool ${name}`)
    }

    await expect(new BudaAdapter(fake.client as any).inspectSession({
      agentId: 'agent-1',
      sessionId: 'session-1',
    })).resolves.toEqual({ status: 'unknown', terminal: false })
    expect(traps).toBe(0)
  })

  test('does not execute a remote Session id getter during one-shot creation', async () => {
    const fake = createFakeClient()
    let getters = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        const created: any = {}
        Object.defineProperty(created, 'session', {
          enumerable: true,
          get() { getters += 1; return { id: 'session-from-getter' } },
        })
        return structured(created)
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).invokeChapterStage(invocationInput()))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(getters).toBe(0)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(0)
  })

  test('honors an independent task signal during capability discovery', async () => {
    const caller = new AbortController()
    const fake = createFakeClient()
    const originalListTools = fake.client.listTools
    fake.client.listTools = async (options: any) => {
      caller.abort()
      return originalListTools(options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(
      generationInput({ signal: caller.signal }),
    )).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
    expect(fake.calls).toHaveLength(0)
  })

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

  for (const operation of ['list', 'create'] as const) {
    test(`rejects an oversized textual Agent ${operation} result before JSON parsing`, async () => {
      const fake = createFakeClient()
      fake.client.callTool = async (name: string, args: any, options: any) => {
        fake.calls.push({ name, args, options })
        const data = operation === 'list'
          ? { apiAgents: [{ id: 'agent-large', name: 'n'.repeat(300_000) }] }
          : { agent: { id: 'agent-large', name: 'n'.repeat(300_000) } }
        return { content: [{ type: 'text', text: JSON.stringify(data) }] }
      }
      const adapter = new BudaAdapter(fake.client as any)

      const result = operation === 'list'
        ? adapter.listAgents()
        : adapter.createAgent({ name: 'Agent', spaceId: 'space-1' })

      await expect(result).rejects.toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { reason: 'agent_result_too_large' },
      })
    })
  }

  test('creates the one-shot Session with the complete paragraph task after Drive sync', async () => {
    const fake = createFakeClient(['pending', 'in_progress', 'completed'])
    const adapter = new BudaAdapter(fake.client as any)
    const progress: string[] = []
    const output = await adapter.generateProse(generationInput({ onProgress: (event: any) => progress.push(event.stage) }))

    const messageCall = fake.calls.find(call => call.name.endsWith('createApiAgentSession'))
    expect(messageCall?.args.message).toContain('完整段落任务：前因、当前目标、后果与输出合同。')
    expect(messageCall?.args.message).toContain('stage: draft')
    expect(messageCall?.args.message).toContain('response_contract: draft_prose')
    expect(output).toEqual(expect.objectContaining({
      source: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
      completed: true,
      prose_chapters: [{ chapter_no: 12, chapter_text: '这是完整的本章正文。' }],
    }))
    expect(progress).toEqual(expect.arrayContaining(['mcp_drive_sync', 'session_created', 'mcp_session_wait', 'mcp_extract']))
    expectBudaOperations(fake.calls)
  })

  test('routes one explicit model to one-shot Session creation while Auto omits it', async () => {
    const explicit = createFakeClient()
    await new BudaAdapter(explicit.client as any).generateProse(generationInput({ model: 'model-x' }))

    expect(explicit.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args.model).toBe('model-x')

    const automatic = createFakeClient()
    await new BudaAdapter(automatic.client as any).generateProse(generationInput({ model: '' }))

    expect(automatic.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args).not.toHaveProperty('model')
  })

  test('awaits the durable session-created receipt before polling the one-shot Session', async () => {
    const fake = createFakeClient()
    const events: string[] = []
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) events.push('poll')
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)

    await adapter.generateProse(generationInput({
      onProgress: async (event: any) => {
        if (event.stage !== 'session_created') return
        expect(event).toMatchObject({
          status: 'running',
          session_id: 'session-1',
          snapshot_hash: expect.any(String),
        })
        await Promise.resolve()
        events.push('receipt')
      },
    }))

    expect(events[0]).toBe('receipt')
    expect(events).toContain('poll')
  })

  test('does not poll a prose task when the durable session-created receipt fails', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({
      onProgress: async (event: any) => {
        if (event.stage === 'session_created') throw new McpError('MCP_STORE_IO_FAILED', 'receipt write failed')
      },
    }))).rejects.toThrow('receipt write failed')

    expect(fake.calls.filter(call => call.name.endsWith('createApiAgentSession'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
  })

  test('preserves a session receipt failure when caller cancellation arrives later', async () => {
    const caller = new AbortController()
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'session receipt write failed')
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    const caught = await adapter.generateProse(generationInput({
      signal: caller.signal,
      onProgress: async (event: any) => {
        if (event.stage !== 'session_created') return
        queueMicrotask(() => caller.abort())
        await Promise.resolve()
        throw storeError
      },
    })).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
    expect(caller.signal.aborted).toBe(true)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
  })

  test('rejects a completed final response when the clock reaches the exact deadline before its timer fires', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(100, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient(['completed'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession')) now = 100
      return result
    }
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({ deadline })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })
  })

  for (const terminalStatus of ['completed', 'failed', 'cancelled']) {
    test(`trusts an exact-deadline ${terminalStatus} response even when independent cleanup fails`, async () => {
      let now = 0
      const deadline = new McpGenerationDeadline(100, undefined, {
        now: () => now,
        setTimeout: () => 1,
        clearTimeout: () => {},
      })
      const fake = createFakeClient([terminalStatus])
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('cancelApiAgentSessionRun')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup cancel failed')
        }
        if (name.endsWith('getApiAgentSession') && options.signal !== deadline.signal) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup read failed')
        }
        const result = await original(name, args, options)
        if (name.endsWith('getApiAgentSession')) now = 100
        return result
      }

      const caught = await new BudaAdapter(fake.client as any)
        .generateProse(generationInput({ deadline }))
        .catch(error => error)

      expect(caught).toMatchObject({
        code: 'MCP_GENERATION_TIMEOUT',
        details: { session_id: 'session-1', remote_cancel_confirmed: true },
      })
      expect(caught.details).not.toHaveProperty('receipt_status')
    })
  }

  test('receipts a one-shot Session created at the exact deadline before rejecting without poll', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(100, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      const result = await original(name, args, options)
      if (name.endsWith('createApiAgentSession')) now = 100
      return result
    }
    const receipts: string[] = []
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({
      deadline,
      onProgress: async (event: any) => {
        if (event.stage === 'session_created') receipts.push(event.session_id)
      },
    }))).rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    expect(receipts).toEqual(['session-1'])
    expect(fake.calls.filter(call => call.name.endsWith('createApiAgentSession'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
  })

  test('uses one deadline signal and shrinking per-call timeouts across discovery, Drive, Session, and polling', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(10_000, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient()
    const observedOptions: any[] = []
    const originalListTools = fake.client.listTools
    fake.client.listTools = async (options: any) => {
      observedOptions.push({ signal: options.signal, timeoutMs: options.timeoutMs })
      const result = await originalListTools(options)
      now += 100
      return result
    }
    const originalCallTool = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      observedOptions.push({ signal: options.signal, timeoutMs: options.timeoutMs })
      const result = await originalCallTool(name, args, options)
      now += 100
      return result
    }
    const adapter = new BudaAdapter(fake.client as any)

    await adapter.generateProse(generationInput({
      deadline,
      server: { ...BUDA_MCP_SERVER_TEMPLATE, tool_timeout_ms: 60_000 },
    }))

    expect(observedOptions.every(item => item.signal === deadline.signal)).toBe(true)
    expect(observedOptions.every(item => item.timeoutMs > 0 && item.timeoutMs <= 10_000)).toBe(true)
    expect(Math.min(...observedOptions.map(item => item.timeoutMs)))
      .toBeLessThan(Math.max(...observedOptions.map(item => item.timeoutMs)))
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

  for (const terminal of [
    { status: 'failed', code: 'MCP_SESSION_FAILED' },
    { status: 'cancelled', code: 'MCP_CANCELLED' },
  ]) {
    test(`preserves observed ${terminal.status} terminal evidence when independent cleanup fails`, async () => {
      const fake = createFakeClient([terminal.status])
      const input = generationInput()
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('cancelApiAgentSessionRun')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup cancel failed')
        }
        if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup read failed')
        }
        return original(name, args, options)
      }

      await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
        code: terminal.code,
        details: { session_id: 'session-1', remote_cancel_confirmed: true },
      })
    })
  }

  test('preserves observed completed evidence when prose extraction fails and cleanup fails', async () => {
    const fake = createFakeClient(['completed'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup cancel failed')
      }
      if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup read failed')
      }
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession')) return structured({ session: { id: 'session-1', status: 'completed' }, messages: [] })
      return result
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_EMPTY_PROSE',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
  })

  test('preserves observed completed evidence when later progress fails and cleanup fails', async () => {
    const progressError = new McpError('MCP_STORE_IO_FAILED', 'progress write failed')
    const fake = createFakeClient(['completed'])
    const input = generationInput({
      onProgress: (event: any) => {
        if (event.stage === 'mcp_session_wait' && event.status === 'success') throw progressError
      },
    })
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup cancel failed')
      }
      if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup read failed')
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
  })

  test('does not treat waiting_for_input as trusted terminal evidence', async () => {
    const fake = createFakeClient(['waiting_for_input'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun') || (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal)) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup unavailable')
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_INPUT_REQUIRED',
      details: { remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown' },
    })
  })

  test('confirms caller cancellation with an independent cleanup signal', async () => {
    const controller = new AbortController()
    const fake = createFakeClient(['in_progress'])
    let resolvePollingStarted!: () => void
    const pollingStarted = new Promise<void>(resolve => { resolvePollingStarted = resolve })
    let primaryPollSeen = false
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession') && !primaryPollSeen) {
        primaryPollSeen = true
        resolvePollingStarted()
      }
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)
    const generation = adapter.generateProse(generationInput({ signal: controller.signal }))
    await pollingStarted
    controller.abort()
    await expect(generation).rejects.toMatchObject({
      code: 'MCP_CANCELLED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
    const cancel = fake.calls.find(call => call.name.endsWith('cancelApiAgentSessionRun'))
    expect(cancel?.options.operation).toBe('mutation')
    expect(cancel?.options.signal).not.toBe(controller.signal)
    expect(cancel?.options.signal.aborted).toBe(false)
    expectBudaOperations(fake.calls)
  })

  test('preserves an ordinary post-Session failure and marks remote cancellation unknown', async () => {
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'receipt persistence failed')
    const fake = createFakeClient(['in_progress'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true })
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput({
      onProgress: (event: any) => {
        if (event.stage === 'session_created') throw storeError
      },
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: {
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'remote_cancel_unknown',
      },
    })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(1)
  })

  for (const throwable of [
    'primitive failure',
    Object.freeze(new Error('frozen failure')),
    Object.defineProperty(new Error('getter failure'), 'details', {
      enumerable: true,
      get() { throw new Error('details getter exploded') },
    }),
  ]) {
    test(`attaches authoritative cleanup details without mutating ${typeof throwable === 'string' ? 'a primitive' : throwable.message}`, async () => {
      const fake = createFakeClient(['in_progress'])
      const input = generationInput()
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('getApiAgentSession') && options.signal === input.deadline.signal) throw throwable
        if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup failed')
        }
        return original(name, args, options)
      }

      const caught = await new BudaAdapter(fake.client as any).generateProse(input).catch(error => error)

      expect(caught).toBeInstanceOf(Error)
      expect(Object.prototype.hasOwnProperty.call(caught, 'details')).toBe(true)
      expect(Object.prototype.propertyIsEnumerable.call(caught, 'details')).toBe(true)
      expect(caught.details).toMatchObject({
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'remote_cancel_unknown',
      })
      expect(caught).not.toBe(throwable)
    })
  }

  test('does not copy untrusted throwable details into the cleanup wrapper', async () => {
    const unsafe = new McpError('MCP_TOOL_ERROR', 'remote failure', {
      token: 'untrusted-secret-metadata',
      nested: { prompt: 'untrusted-prompt' },
    })
    const fake = createFakeClient(['in_progress'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession') && options.signal === input.deadline.signal) throw unsafe
      if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup failed')
      }
      return original(name, args, options)
    }

    const caught = await new BudaAdapter(fake.client as any).generateProse(input).catch(error => error)

    expect(caught).toBeInstanceOf(McpError)
    expect(caught).not.toBe(unsafe)
    expect(caught.details).toEqual({
      session_id: 'session-1',
      remote_cancel_confirmed: false,
      receipt_status: 'remote_cancel_unknown',
    })
    expect(JSON.stringify(caught)).not.toContain('untrusted-secret-metadata')
    expect(JSON.stringify(caught)).not.toContain('untrusted-prompt')
  })

  test('closes the independent cleanup deadline after early confirmation', async () => {
    const fake = createFakeClient(['failed'])
    const input = generationInput()
    let cleanupClosed = 0
    ;(input.deadline as any).createCleanupDeadline = () => ({
      signal: new AbortController().signal,
      close: () => { cleanupClosed += 1 },
    })

    await expect(new BudaAdapter(fake.client as any).generateProse(input))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(cleanupClosed).toBe(1)
  })

  test('accepts only exact terminal status from the single cleanup read', async () => {
    const controller = new AbortController()
    const fake = createFakeClient(['in_progress', 'cancelled'])
    const input = generationInput({ signal: controller.signal })
    const original = fake.client.callTool
    let primaryGetSeen = false
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession') && !primaryGetSeen) {
        primaryGetSeen = true
        controller.abort()
      }
      return result
    }
    const generation = new BudaAdapter(fake.client as any).generateProse(input)

    await expect(generation).rejects.toMatchObject({
      code: 'MCP_CANCELLED',
      details: { remote_cancel_confirmed: true },
    })
    const cleanupSignal = fake.calls.find(call => call.name.endsWith('cancelApiAgentSessionRun'))?.options.signal
    expect(cleanupSignal).toBeDefined()
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession') && call.options.signal === cleanupSignal))
      .toHaveLength(1)
  })

  test('bounds cleanup with its own signal without replacing an earlier typed failure', async () => {
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'receipt persistence failed')
    const cleanupController = new AbortController()
    const baseDeadline = new McpGenerationDeadline(60_000)
    const deadline = Object.create(baseDeadline)
    deadline.createCleanupDeadline = (timeoutMs: number) => {
      expect(timeoutMs).toBe(5_000)
      queueMicrotask(() => cleanupController.abort())
      return { signal: cleanupController.signal, close: () => {} }
    }
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason || new Error('cleanup timeout')), { once: true })
        })
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput({
      deadline,
      onProgress: (event: any) => {
        if (event.stage === 'session_created') throw storeError
      },
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown' },
    })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
    baseDeadline.close()
  })

  test('does not clean up or mark an ordinary failure before Session creation', async () => {
    const fake = createFakeClient()
    fake.client.listTools = async () => { throw new McpError('MCP_CAPABILITY_MISSING', 'missing tools') }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_CAPABILITY_MISSING' })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(0)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
  })
})

describe('Buda result normalization', () => {
  test('builds the exact current-stage envelope without changing the prompt', () => {
    expect(typeof (budaAdapterModule as any).buildBudaStageEnvelope).toBe('function')
    const prompt = '只修订这一段，不得提前同步状态。'
    expect((budaAdapterModule as any).buildBudaStageEnvelope({
      requestId: 'request-stage',
      stage: 'revision',
      responseContract: 'revision_prose',
      prompt,
    })).toBe([
      '【MangaForge 章节任务阶段】',
      'request_id: request-stage',
      'stage: revision',
      'response_contract: revision_prose',
      '只执行当前 stage。不得自行开始下一阶段，不得用 Agent 旧记忆覆盖本次提示。',
      '严格按 response_contract 返回，不要附加流程说明。',
      '',
      prompt,
    ].join('\n'))
  })

  test('extracts the last non-empty assistant stage content with safe own-data fallbacks', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    expect(extract({
      messages: [
        { role: 'assistant', content: 'first' },
        { role: 'user', content: 'ignore' },
        { role: 'assistant', content: '   ' },
        { role: 'assistant', content: ' final stage output ' },
      ],
      content: 'fallback',
    })).toBe('final stage output')
    expect(extract({ content: ' content fallback ' })).toBe('content fallback')
    expect(extract({ text: ' text fallback ' })).toBe('text fallback')
    expect(extract({
      messages: [
        ...Array.from({ length: 40 }, () => ({ role: 'user', content: 'context' })),
        { role: 'assistant', content: 'latest bounded output' },
      ],
    })).toBe('latest bounded output')
    expect(extract({
      messages: [
        { role: 'assistant', content: 'earlier but still last assistant' },
        ...Array.from({ length: 40 }, () => ({ role: 'user', content: 'later context' })),
      ],
    })).toBe('earlier but still last assistant')
    expect(() => extract({ messages: [] })).toThrow(expect.objectContaining({ code: 'MCP_TOOL_ERROR' }))
  })

  test('does not execute Proxy traps or accessors while extracting stage content', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    let traps = 0
    const proxy = new Proxy({ messages: [] }, {
      get() { traps += 1; return 'secret' },
      getOwnPropertyDescriptor() { traps += 1; return undefined },
    })
    expect(() => extract(proxy)).toThrow(expect.objectContaining({ code: 'MCP_TOOL_ERROR' }))
    expect(traps).toBe(0)

    const revoked = Proxy.revocable([], {})
    revoked.revoke()
    expect(extract({ messages: revoked.proxy, text: 'revoked fallback' })).toBe('revoked fallback')

    let getters = 0
    const unsafe: any = { text: 'safe fallback' }
    Object.defineProperty(unsafe, 'messages', {
      enumerable: true,
      get() { getters += 1; return [{ role: 'assistant', content: 'secret' }] },
    })
    expect(extract(unsafe)).toBe('safe fallback')
    expect(getters).toBe(0)
  })

  test('rejects oversized assistant and fallback stage content without exposing it', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    const oversized = 'stage-secret-'.repeat(30_000)
    for (const data of [
      { messages: [{ role: 'assistant', content: oversized }] },
      { text: oversized },
      { messages: Array.from({ length: 257 }, () => ({ role: 'user', content: 'bounded' })) },
    ]) {
      const caught = (() => {
        try { extract(data) } catch (error) { return error }
      })() as any
      expect(caught).toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { reason: 'stage_result_too_large' },
      })
      expect(JSON.stringify(caught)).not.toContain('stage-secret-')
    }
  })

  test('caps structured Agent lists before normalizing later entries', () => {
    let beyondLimitCalls = 0
    const apiAgents: any[] = Array.from({ length: 100 }, (_, index) => ({
      id: `agent-${index}`,
      name: `Agent ${index}`,
    }))
    Object.defineProperty(apiAgents, '100', {
      enumerable: true,
      get() { beyondLimitCalls += 1; return { id: 'agent-100', name: 'Agent 100' } },
    })
    apiAgents.length = 180

    expect(normalizeBudaAgentList({ apiAgents })).toHaveLength(100)
    expect(beyondLimitCalls).toBe(0)
  })

  test('rejects Proxy Agent arrays and values without executing traps', () => {
    let arrayTraps = 0
    const proxiedArray = new Proxy([{ id: 'agent-1', name: 'Agent 1' }], {
      get() { arrayTraps += 1; return 1 },
      getOwnPropertyDescriptor() { arrayTraps += 1; return undefined },
    })
    expect(normalizeBudaAgentList({ apiAgents: proxiedArray })).toEqual([])
    expect(arrayTraps).toBe(0)

    let agentTraps = 0
    const proxiedAgent = new Proxy({ id: 'agent-1', name: 'Agent 1' }, {
      get() { agentTraps += 1; return 'trap-value' },
      getOwnPropertyDescriptor() { agentTraps += 1; return undefined },
    })
    expect(normalizeBudaAgentList({ apiAgents: [proxiedAgent] })).toEqual([])
    expect(agentTraps).toBe(0)
  })

  test('does not invoke Agent accessors or object coercion while normalizing fields', () => {
    let getterCalls = 0
    let toStringCalls = 0
    const coercible = { toString() { toStringCalls += 1; return 'coerced' } }
    const agent: any = { id: coercible, name: 'safe-name' }
    Object.defineProperty(agent, 'description', {
      enumerable: true,
      get() { getterCalls += 1; return 'getter-description' },
    })

    expect(normalizeBudaAgentList({ apiAgents: [agent] })).toEqual([])
    expect(getterCalls).toBe(0)
    expect(toStringCalls).toBe(0)
  })

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
