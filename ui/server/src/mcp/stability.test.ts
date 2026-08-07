import { describe, expect, test } from 'bun:test'
import { McpGenerationDeadline, type McpGenerationDeadlineClock } from './deadline'
import { McpError, mcpFailureEvidence } from './errors'
import { createMcpStabilityController } from './stability'
import type {
  GenerationSourceProgress,
  McpAdapterOperationOptions,
  McpClientPort,
  McpFailureClass,
  McpStabilityInput,
  McpStabilityPolicy,
} from './adapters/types'

class FakeClock implements McpGenerationDeadlineClock {
  value = 0
  readonly timers = new Set<{ callback: () => void, at: number }>()

  now = () => this.value

  setTimeout = (callback: () => void, delayMs: number) => {
    const timer = { callback, at: this.value + delayMs }
    this.timers.add(timer)
    return timer
  }

  clearTimeout = (handle: unknown) => {
    this.timers.delete(handle as { callback: () => void, at: number })
  }

  advance(ms: number) {
    this.value += ms
    for (const timer of [...this.timers]) {
      if (timer.at > this.value) continue
      this.timers.delete(timer)
      timer.callback()
    }
  }
}

function exactNotReadyEvidence() {
  return new McpError('MCP_TOOL_ERROR', 'safe public error', {
    failure_evidence: {
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: null,
      reason: 'server_not_initialized',
    },
  })
}

function classify(error: unknown, operation: 'read_safe' | 'mutation'): McpFailureClass {
  if (mcpFailureEvidence(error)?.reason === 'server_not_initialized') {
    return 'not_ready_pre_dispatch'
  }
  if (operation === 'read_safe' && (error as McpError)?.code === 'MCP_CONNECTION_LOST') {
    return 'transient_read_failure'
  }
  return operation === 'mutation' ? 'ambiguous_write_failure' : 'terminal_failure'
}

function stabilityHarness(
  outcomes: Array<'ok' | 'not_ready'>,
  options: {
    totalMs?: number
    requiredConsecutiveSuccesses?: number
    warmupWindowMs?: number
    pollInitialMs?: number
    pollMaxMs?: number
    operationReadinessMode?: 'proactive' | 'reactive'
  } = {},
) {
  const clock = new FakeClock()
  const deadline = new McpGenerationDeadline(options.totalMs ?? 1_000, undefined, clock)
  const probeLog: string[] = []
  const sleeps: number[] = []
  const progress: GenerationSourceProgress[] = []
  const clients: McpClientPort[] = []
  let acquisitions = 0
  let invalidations = 0
  let outcomeIndex = 0

  const newClient = (): McpClientPort => ({
    async listTools(remoteOptions) {
      probeLog.push(`tools/list:${acquisitions}`)
      expect(remoteOptions.refreshTools).toBe(true)
      const outcome = outcomes[outcomeIndex++] ?? 'ok'
      if (outcome === 'not_ready') throw exactNotReadyEvidence()
      return []
    },
    async callTool(_name, _args, remoteOptions) {
      probeLog.push(`probe/read:${acquisitions}`)
      expect(remoteOptions.operation).toBe('read_safe')
      return { content: [] }
    },
  })

  const controller = createMcpStabilityController({
    async reacquire(remoteOptions: McpAdapterOperationOptions) {
      expect(remoteOptions.signal).toBe(deadline.signal)
      expect(remoteOptions.timeoutMs).toBeGreaterThan(0)
      acquisitions += 1
      const client = newClient()
      clients.push(client)
      return client
    },
    async invalidateCurrent() { invalidations += 1 },
    async sleep(ms, signal) {
      expect(signal).toBe(deadline.signal)
      expect(ms).toBeLessThanOrEqual(deadline.remainingMs())
      sleeps.push(ms)
      clock.advance(ms)
    },
  })

  const policy: McpStabilityPolicy = {
    requiredConsecutiveSuccesses: options.requiredConsecutiveSuccesses ?? 2,
    warmupWindowMs: options.warmupWindowMs ?? 100,
    ...(options.operationReadinessMode
      ? { operationReadinessMode: options.operationReadinessMode }
      : {}),
    classify,
    async probe(client, remoteOptions) {
      await client.listTools({ ...remoteOptions, refreshTools: true })
      await client.callTool('provider-readiness-probe', {}, { ...remoteOptions, operation: 'read_safe' })
    },
  }
  const input: McpStabilityInput = {
    deadline,
    phase: 'transport',
    pollInitialMs: options.pollInitialMs ?? 5,
    pollMaxMs: options.pollMaxMs ?? 20,
    toolTimeoutMs: 50,
    onProgress(event) { progress.push(event) },
  }

  return {
    clock,
    deadline,
    probeLog,
    sleeps,
    progress,
    clients,
    controller,
    policy,
    input,
    get acquisitions() { return acquisitions },
    get invalidations() { return invalidations },
  }
}

function abortRaceHarness(totalMs = 100) {
  const caller = new AbortController()
  const clock = new FakeClock()
  const deadline = new McpGenerationDeadline(totalMs, caller.signal, clock)
  const client: McpClientPort = {
    listTools: async () => [],
    callTool: async () => ({ content: [] }),
  }
  const controller = createMcpStabilityController({
    reacquire: async () => client,
    invalidateCurrent: async () => {},
    sleep: async () => {},
  })
  const policy: McpStabilityPolicy = {
    requiredConsecutiveSuccesses: 1,
    warmupWindowMs: 10,
    classify,
    probe: async () => {},
  }
  const input: McpStabilityInput = {
    deadline,
    phase: 'session_poll',
    pollInitialMs: 1,
    pollMaxMs: 2,
    toolTimeoutMs: 10,
  }
  return { caller, clock, controller, deadline, input, policy }
}

describe('MCP stability coordinator', () => {
  test('requires two complete consecutive probe cycles after readiness regresses', async () => {
    const harness = stabilityHarness(['not_ready', 'ok', 'not_ready', 'ok', 'ok'])

    await harness.controller.ensureReady(harness.policy, harness.input)

    expect(harness.probeLog.map(entry => entry.split(':', 1)[0])).toEqual([
      'tools/list',
      'tools/list', 'probe/read',
      'tools/list',
      'tools/list', 'probe/read',
      'tools/list', 'probe/read',
    ])
    expect(harness.sleeps).toEqual([5, 10])
  })

  test('rotates the Transport when its warm-up window expires', async () => {
    const harness = stabilityHarness(['not_ready', 'not_ready', 'ok', 'ok'], {
      warmupWindowMs: 15,
      pollInitialMs: 10,
      pollMaxMs: 10,
    })

    await harness.controller.ensureReady(harness.policy, harness.input)

    expect(harness.invalidations).toBe(1)
    expect(harness.acquisitions).toBe(2)
    expect(harness.clients).toHaveLength(2)
    expect(harness.deadline.remainingMs()).toBe(985)
  })

  test('does not count a probe cycle that completes outside its warm-up window', async () => {
    const harness = stabilityHarness([], {
      totalMs: 100,
      requiredConsecutiveSuccesses: 2,
      warmupWindowMs: 10,
    })
    let probes = 0
    harness.policy.probe = async () => {
      probes += 1
      if (probes === 2) harness.clock.advance(11)
    }

    await harness.controller.ensureReady(harness.policy, harness.input)

    expect(probes).toBe(4)
    expect(harness.invalidations).toBe(1)
    expect(harness.acquisitions).toBe(2)
  })

  test('keeps one total deadline across Transport rotations and bounds every sleep', async () => {
    const harness = stabilityHarness(Array(20).fill('not_ready'), {
      totalMs: 35,
      warmupWindowMs: 10,
      pollInitialMs: 8,
      pollMaxMs: 16,
    })

    const caught = await harness.controller.ensureReady(harness.policy, {
      ...harness.input,
      phase: 'drive_sync',
    }).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'drive_sync' },
    })
    expect(harness.deadline.remainingMs()).toBe(0)
    expect(harness.acquisitions).toBeGreaterThan(1)
    expect(harness.sleeps.reduce((sum, value) => sum + value, 0)).toBe(35)
  })

  test('does not accept a probe that resolves exactly at the total deadline', async () => {
    const harness = stabilityHarness([], {
      totalMs: 10,
      requiredConsecutiveSuccesses: 1,
    })
    harness.policy.probe = async () => { harness.clock.advance(10) }

    const caught = await harness.controller.ensureReady(harness.policy, harness.input)
      .catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'transport' },
    })
  })

  test('does not accept an operation that resolves after caller cancellation', async () => {
    const caller = new AbortController()
    const clock = new FakeClock()
    const deadline = new McpGenerationDeadline(100, caller.signal, clock)
    const client: McpClientPort = {
      listTools: async () => [],
      callTool: async () => ({ content: [] }),
    }
    const controller = createMcpStabilityController({
      reacquire: async () => client,
      invalidateCurrent: async () => {},
      sleep: async () => {},
    })
    const policy: McpStabilityPolicy = {
      requiredConsecutiveSuccesses: 1,
      warmupWindowMs: 10,
      classify,
      probe: async () => {},
    }

    const caught = await controller.runRead(policy, {
      deadline,
      phase: 'session_poll',
      pollInitialMs: 1,
      pollMaxMs: 2,
      toolTimeoutMs: 10,
    }, async () => {
      caller.abort()
      return 'late-result'
    }).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
  })

  test('preserves typed caller cancellation when a rejected probe reports AbortError', async () => {
    const harness = abortRaceHarness()
    const raw = new DOMException('raw SDK cancellation', 'AbortError')
    harness.policy.probe = async () => {
      harness.caller.abort()
      throw raw
    }

    const caught = await harness.controller.ensureReady(harness.policy, harness.input)
      .catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
  })

  test('maps total expiry when a rejected probe reports AbortError', async () => {
    const harness = abortRaceHarness(10)
    const raw = new DOMException('raw SDK timeout abort', 'AbortError')
    harness.policy.probe = async () => {
      harness.clock.advance(10)
      throw raw
    }

    const caught = await harness.controller.ensureReady(harness.policy, {
      ...harness.input,
      phase: 'drive_sync',
    }).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'drive_sync' },
    })
  })

  test('preserves typed caller cancellation when a rejected operation reports AbortError', async () => {
    const harness = abortRaceHarness()
    const raw = new DOMException('raw SDK cancellation', 'AbortError')

    const caught = await harness.controller.runRead(
      harness.policy,
      harness.input,
      async () => {
        harness.caller.abort()
        throw raw
      },
    ).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
  })

  test('maps total expiry when a rejected operation reports AbortError', async () => {
    const harness = abortRaceHarness(10)
    const raw = new DOMException('raw SDK timeout abort', 'AbortError')

    const caught = await harness.controller.runRead(
      harness.policy,
      { ...harness.input, phase: 'session_poll' },
      async () => {
        harness.clock.advance(10)
        throw raw
      },
    ).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'session_poll' },
    })
  })

  test('quarantines an ambiguous mutation rejection after a cancellation race', async () => {
    const harness = abortRaceHarness()
    const ambiguous = new McpError('MCP_TOOL_ERROR', 'unrelated mutation failure')
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        harness.caller.abort()
        throw ambiguous
      },
    ).catch(error => error)

    expect(caught).not.toBe(ambiguous)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(caught.message).not.toContain(ambiguous.message)
    expect(caught).not.toHaveProperty('cause')
    expect(calls).toBe(1)
  })

  test('does not quarantine a mutation when the caller was already cancelled before dispatch', async () => {
    const harness = abortRaceHarness()
    harness.caller.abort()
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; return 'never-called' },
    ).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
    expect(calls).toBe(0)
  })

  test('does not quarantine a mutation when the total deadline expired before dispatch', async () => {
    const harness = abortRaceHarness(10)
    harness.clock.advance(10)
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; return 'never-called' },
    ).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'session_create' },
    })
    expect(calls).toBe(0)
  })

  test('quarantines a mutation rejected with AbortError after an in-flight caller cancellation', async () => {
    const harness = abortRaceHarness()
    const raw = new DOMException('raw SDK cancellation', 'AbortError')
    harness.policy.classify = () => 'terminal_failure'
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        harness.caller.abort()
        throw raw
      },
    ).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(calls).toBe(1)
  })

  test('quarantines a mutation rejected with AbortError after an in-flight total expiry', async () => {
    const harness = abortRaceHarness(10)
    const raw = new DOMException('raw SDK timeout abort', 'AbortError')
    harness.policy.classify = () => 'terminal_failure'
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        harness.clock.advance(10)
        throw raw
      },
    ).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(calls).toBe(1)
  })

  test('returns a successful mutation that resolves exactly at the total deadline', async () => {
    const harness = stabilityHarness([], {
      totalMs: 10,
      requiredConsecutiveSuccesses: 1,
      operationReadinessMode: 'reactive',
    })

    const result = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { harness.clock.advance(10); return 'created' },
    )

    expect(result).toBe('created')
  })

  test('rejects a successful read that resolves exactly at the total deadline', async () => {
    const harness = stabilityHarness([], {
      totalMs: 10,
      requiredConsecutiveSuccesses: 1,
      operationReadinessMode: 'reactive',
    })

    const caught = await harness.controller.runRead(
      harness.policy,
      { ...harness.input, phase: 'session_poll' },
      async () => { harness.clock.advance(10); return 'late-read' },
    ).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'session_poll' },
    })
  })

  test('stabilizes, rotates, and replays a transient read failure', async () => {
    const harness = stabilityHarness(['ok', 'ok', 'ok', 'ok'])
    let calls = 0

    const result = await harness.controller.runRead(
      harness.policy,
      { ...harness.input, phase: 'session_poll' },
      async () => {
        calls += 1
        if (calls === 1) throw new McpError('MCP_CONNECTION_LOST', 'lost')
        return 'read-result'
      },
    )

    expect(result).toBe('read-result')
    expect(calls).toBe(2)
    expect(harness.invalidations).toBe(1)
    expect(harness.acquisitions).toBe(2)
  })

  test('replays only an exact pre-dispatch mutation rejection', async () => {
    const harness = stabilityHarness(['ok', 'ok', 'ok', 'ok'])
    let calls = 0

    const result = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        if (calls === 1) throw exactNotReadyEvidence()
        return 'created'
      },
    )

    expect(result).toBe('created')
    expect(calls).toBe(2)
    expect(harness.invalidations).toBe(0)
  })

  test.each([
    { label: 'read', run: 'runRead' as const, phase: 'session_poll' as const },
    { label: 'mutation', run: 'runMutation' as const, phase: 'session_create' as const },
  ])('reactive $label retries an exact pre-dispatch rejection without a readiness probe', async ({ run, phase }) => {
    const harness = stabilityHarness([], { operationReadinessMode: 'reactive' })
    let calls = 0

    const result = await harness.controller[run](
      harness.policy,
      { ...harness.input, phase },
      async () => {
        calls += 1
        if (calls === 1) throw exactNotReadyEvidence()
        return 'operation-result'
      },
    )

    expect(result).toBe('operation-result')
    expect(calls).toBe(2)
    expect(harness.sleeps).toEqual([5])
    expect(harness.acquisitions).toBe(0)
    expect(harness.probeLog).toEqual([])
  })

  test('reactive read recovery stabilizes only after a transient read failure', async () => {
    const harness = stabilityHarness(['ok', 'ok'], { operationReadinessMode: 'reactive' })
    let calls = 0

    const result = await harness.controller.runRead(
      harness.policy,
      { ...harness.input, phase: 'session_poll' },
      async () => {
        calls += 1
        if (calls === 1) throw new McpError('MCP_CONNECTION_LOST', 'lost')
        return 'operation-result'
      },
    )

    expect(result).toBe('operation-result')
    expect(calls).toBe(2)
    expect(harness.invalidations).toBe(1)
    expect(harness.acquisitions).toBe(1)
    expect(harness.probeLog).toEqual([
      'tools/list:1', 'probe/read:1',
      'tools/list:1', 'probe/read:1',
    ])
  })

  test('reactive mutation exact pre-dispatch recovery exhausts the shared deadline without probing', async () => {
    const harness = stabilityHarness([], {
      operationReadinessMode: 'reactive',
      totalMs: 12,
      pollInitialMs: 5,
      pollMaxMs: 10,
    })

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { throw exactNotReadyEvidence() },
    ).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'session_create' },
    })
    expect(harness.sleeps.reduce((sum, value) => sum + value, 0)).toBe(12)
    expect(harness.acquisitions).toBe(0)
  })

  test.each([
    { label: 'timeout', error: new McpError('MCP_CONNECT_TIMEOUT', 'timeout') },
    { label: 'reset', error: new McpError('MCP_CONNECTION_LOST', 'reset') },
    {
      label: 'HTTP 500',
      error: new McpError('MCP_TOOL_ERROR', 'http 500', {
        failure_evidence: { kind: 'jsonrpc_http_rejection', http_status: 500 },
      }),
    },
    { label: 'message-only not-ready', error: new McpError('MCP_TOOL_ERROR', 'Server not initialized') },
  ])('quarantines a proactive ambiguous mutation without replay: $label', async ({ error }) => {
    const harness = stabilityHarness(['ok', 'ok'])
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; throw error },
    ).catch(value => value)

    expect(caught).not.toBe(error)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(caught.message).not.toContain(error.message)
    expect(caught.details).toEqual({ phase: 'session_create' })
    expect(caught).not.toHaveProperty('cause')
    expect(calls).toBe(1)
  })

  test.each([
    { label: 'timeout', error: new McpError('MCP_CONNECT_TIMEOUT', 'timeout') },
    { label: 'reset', error: new McpError('MCP_CONNECTION_LOST', 'reset') },
    {
      label: 'HTTP 500',
      error: new McpError('MCP_TOOL_ERROR', 'http 500', {
        failure_evidence: { kind: 'jsonrpc_http_rejection', http_status: 500 },
      }),
    },
    { label: 'message-only not-ready', error: new McpError('MCP_TOOL_ERROR', 'Server not initialized') },
  ])('quarantines a reactive ambiguous mutation without replay or probing: $label', async ({ error }) => {
    const harness = stabilityHarness([], { operationReadinessMode: 'reactive' })
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; throw error },
    ).catch(value => value)

    expect(caught).not.toBe(error)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(caught.message).not.toContain(error.message)
    expect(caught.details).toEqual({ phase: 'session_create' })
    expect(caught).not.toHaveProperty('cause')
    expect(calls).toBe(1)
    expect(harness.acquisitions).toBe(0)
    expect(harness.probeLog).toEqual([])
  })

  test('does no warm-up or reacquisition when the adapter has no stability policy', async () => {
    const harness = stabilityHarness([])
    let calls = 0

    await harness.controller.ensureReady(undefined, harness.input)
    const result = await harness.controller.runRead(undefined, harness.input, async () => {
      calls += 1
      return 'generic-result'
    })

    expect(result).toBe('generic-result')
    expect(calls).toBe(1)
    expect(harness.acquisitions).toBe(0)
    expect(harness.probeLog).toEqual([])
  })

  test('does not dispatch a policy-less mutation after pre-dispatch caller cancellation', async () => {
    const harness = abortRaceHarness()
    harness.caller.abort()
    let calls = 0

    const caught = await harness.controller.runMutation(
      undefined,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; return 'never-called' },
    ).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
    expect(calls).toBe(0)
  })

  test('does not dispatch a policy-less mutation after pre-dispatch total expiry', async () => {
    const harness = abortRaceHarness(10)
    harness.clock.advance(10)
    let calls = 0

    const caught = await harness.controller.runMutation(
      undefined,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; return 'never-called' },
    ).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_SERVER_NOT_READY',
      details: { phase: 'session_create' },
    })
    expect(calls).toBe(0)
  })

  test('quarantines an in-flight abort-related rejection from a policy-less mutation', async () => {
    const harness = abortRaceHarness()
    const raw = new DOMException('raw SDK cancellation', 'AbortError')
    let calls = 0

    const caught = await harness.controller.runMutation(
      undefined,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        harness.caller.abort()
        throw raw
      },
    ).catch(error => error)

    expect(caught).not.toBe(raw)
    expect(caught).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { phase: 'session_create' },
    })
    expect(calls).toBe(1)
  })

  for (const abortMode of ['caller cancellation', 'total expiry'] as const) {
    test.each([
      {
        label: 'typed connection loss',
        error: new McpError('MCP_CONNECTION_LOST', 'private connection loss detail'),
      },
      { label: 'plain error', error: new Error('private plain failure detail') },
      {
        label: 'ECONNRESET object',
        error: { code: 'ECONNRESET', message: 'private reset failure detail' },
      },
    ])(`quarantines policy-less $label after in-flight ${abortMode}`, async ({ error }) => {
      const harness = abortRaceHarness(abortMode === 'total expiry' ? 10 : 100)
      let calls = 0

      const caught = await harness.controller.runMutation(
        undefined,
        { ...harness.input, phase: 'session_create' },
        async () => {
          calls += 1
          if (abortMode === 'caller cancellation') harness.caller.abort()
          else harness.clock.advance(10)
          throw error
        },
      ).catch(value => value)

      expect(caught).not.toBe(error)
      expect(caught).toMatchObject({
        code: 'MCP_SEND_UNKNOWN',
        details: { phase: 'session_create' },
      })
      expect(caught.details).toEqual({ phase: 'session_create' })
      expect(caught.message).not.toContain(String((error as any).message))
      expect(caught).not.toHaveProperty('cause')
      expect(calls).toBe(1)
    })
  }

  test.each([
    new McpError('MCP_CONNECTION_LOST', 'active connection loss'),
    new Error('active plain failure'),
    { code: 'ECONNRESET', message: 'active reset failure' },
  ])('preserves a policy-less mutation rejection while the signal remains active', async (error) => {
    const harness = abortRaceHarness()
    let calls = 0

    const caught = await harness.controller.runMutation(
      undefined,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; throw error },
    ).catch(value => value)

    expect(caught).toBe(error)
    expect(calls).toBe(1)
  })

  test('keeps exact pre-dispatch mutation evidence safe when caller cancellation races', async () => {
    const harness = abortRaceHarness()
    let calls = 0

    const caught = await harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => {
        calls += 1
        harness.caller.abort()
        throw exactNotReadyEvidence()
      },
    ).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_CANCELLED' })
    expect(calls).toBe(1)
  })

  test('publishes only bounded provider-neutral stabilization progress', async () => {
    const harness = stabilityHarness(['not_ready', 'ok', 'ok'])

    await harness.controller.ensureReady(harness.policy, {
      ...harness.input,
      phase: 'drive_sync',
    })

    expect(harness.progress.length).toBeGreaterThan(0)
    for (const event of harness.progress) {
      expect(event).toMatchObject({
        stage: 'mcp_transport_stabilizing',
        status: 'running',
        elapsed_ms: expect.any(Number),
      })
      expect(event.detail).toMatch(/^phase=drive_sync; recovery_round=\d+$/)
      expect(Object.keys(event).sort()).toEqual(['detail', 'elapsed_ms', 'stage', 'status'])
      expect(JSON.stringify(event)).not.toContain('Server not initialized')
    }
  })
})
