import { describe, expect, test } from 'bun:test'
import { BudaAdapter, buildBudaExecutionEnvelope, extractBudaProse, normalizeBudaAgentList } from './buda-adapter'
import { BUDA_MCP_SERVER_TEMPLATE } from '../server-store'
import { McpGenerationDeadline } from '../deadline'
import { McpError } from '../errors'

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
    drive: { writingBible: '# 圣经', storyState: {}, continuity: '连续性', recentChapters: '第11章摘要' },
    deadline,
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

  test('awaits the durable session-created receipt immediately before sending the prose task', async () => {
    const fake = createFakeClient()
    const events: string[] = []
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) events.push('send')
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

    expect(events).toEqual(['receipt', 'send'])
  })

  test('does not send a prose task when the durable session-created receipt fails', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({
      onProgress: async (event: any) => {
        if (event.stage === 'session_created') throw new Error('receipt write failed')
      },
    }))).rejects.toThrow('receipt write failed')

    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
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
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
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

  test('receipts a Session created at the exact deadline before rejecting without send', async () => {
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
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
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
    const adapter = new BudaAdapter(fake.client as any)
    const generation = adapter.generateProse(generationInput({ signal: controller.signal }))
    setTimeout(() => controller.abort(), 5)
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

  test('marks an ambiguous send unknown without replay when cleanup cannot confirm termination', async () => {
    const fake = createFakeClient(['in_progress'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        fake.calls.push({ name, args, options })
        throw new McpError('MCP_CONNECTION_LOST', 'connection lost after send')
      }
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput())).rejects.toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: {
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'send_unknown',
      },
    })

    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(1)
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
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession') && options.signal === input.deadline.signal) controller.abort()
      return result
    }
    const generation = new BudaAdapter(fake.client as any).generateProse(input)

    await expect(generation).rejects.toMatchObject({
      code: 'MCP_CANCELLED',
      details: { remote_cancel_confirmed: true },
    })
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession') && call.options.signal !== input.deadline.signal))
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
