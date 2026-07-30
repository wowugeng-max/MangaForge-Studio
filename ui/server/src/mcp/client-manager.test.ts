import { describe, expect, test } from 'bun:test'
import { McpClientManager } from './client-manager'
import { createMcpClient, type McpSdkFactory } from './client'
import { McpError } from './errors'
import { BUDA_MCP_SERVER_TEMPLATE } from './server-store'
import type { McpKeyRecord } from './types'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function waitForGateOrAbort(gate: Promise<void>, signal?: AbortSignal) {
  if (!signal) return gate
  if (signal.aborted) throw new McpError('MCP_CANCELLED', '连接已取消')
  let rejectAborted!: (reason: unknown) => void
  const aborted = new Promise<never>((_, reject) => { rejectAborted = reject })
  const onAbort = () => rejectAborted(new McpError('MCP_CANCELLED', '连接已取消'))
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    await Promise.race([gate, aborted])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

describe('McpClientManager', () => {
  test('isolates cache entries by workspace, Server ID, and Key ID', async () => {
    const created: any[] = []
    const manager = new McpClientManager({
      createClient: input => {
        const client = {
          input,
          state: 'Closed',
          connectCalls: 0,
          closeCalls: 0,
          async connect() { this.state = 'Ready'; this.connectCalls += 1 },
          async close() { this.state = 'Closed'; this.closeCalls += 1 },
        }
        created.push(client)
        return client as any
      },
    })
    const server = { id: 'buda' } as any
    const key1 = { id: 1 } as any
    const key2 = { id: 2 } as any

    const first = await manager.get('/workspace/a', server, key1)
    expect(await manager.get('/workspace/a', server, key1)).toBe(first)
    expect(await manager.get('/workspace/a', server, key2)).not.toBe(first)
    expect(await manager.get('/workspace/b', server, key1)).not.toBe(first)
    expect(created).toHaveLength(3)
    expect((first as any).connectCalls).toBe(1)
  })

  test('invalidates one credential connection and closes all remaining clients', async () => {
    const clients: any[] = []
    const manager = new McpClientManager({
      createClient: () => {
        const client = {
          state: 'Closed',
          closeCalls: 0,
          async connect() { this.state = 'Ready' },
          async close() { this.state = 'Closed'; this.closeCalls += 1 },
        }
        clients.push(client)
        return client as any
      },
    })
    const server = { id: 'buda' } as any
    await manager.get('/workspace/a', server, { id: 1 } as any)
    await manager.get('/workspace/a', server, { id: 2 } as any)

    await manager.invalidate('/workspace/a', 'buda', 1)
    expect(clients[0].closeCalls).toBe(1)
    expect(clients[1].closeCalls).toBe(0)
    await manager.closeAll()
    expect(clients[1].closeCalls).toBe(1)
  })

  test('shares one in-flight connection for concurrent callers of the same credential', async () => {
    let connectCalls = 0
    let releaseConnect!: () => void
    const connectGate = new Promise<void>(resolve => { releaseConnect = resolve })
    const client = {
      state: 'Closed',
      async connect() {
        connectCalls += 1
        await connectGate
        this.state = 'Ready'
      },
      async close() { this.state = 'Closed' },
    }
    const manager = new McpClientManager({ createClient: () => client as any })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any

    const first = manager.get('/workspace/a', server, key)
    const second = manager.get('/workspace/a', server, key)
    await Promise.resolve()
    expect(connectCalls).toBe(1)
    releaseConnect()
    expect(await first).toBe(client)
    expect(await second).toBe(client)
  })

  test('cancelling one connection waiter does not cancel the shared setup or another waiter', async () => {
    const setupGate = deferred()
    const connectStarted = deferred()
    let connectSignal: AbortSignal | undefined
    const client = {
      state: 'Closed',
      async connect(signal?: AbortSignal) {
        connectSignal = signal
        connectStarted.resolve()
        await waitForGateOrAbort(setupGate.promise, signal)
        this.state = 'Ready'
      },
      async close() { this.state = 'Closed' },
    }
    const manager = new McpClientManager({ createClient: () => client as any })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any
    const firstController = new AbortController()
    const secondController = new AbortController()

    const first = manager.get('/workspace/a', server, key, firstController.signal)
      .then(value => ({ value }), error => ({ error }))
    const second = manager.get('/workspace/a', server, key, secondController.signal)
      .then(value => ({ value }), error => ({ error }))
    await connectStarted.promise
    firstController.abort()
    const firstOutcome = await first
    const managerSignalWasAborted = Boolean(connectSignal?.aborted)
    setupGate.resolve()
    const secondOutcome = await second

    expect(firstOutcome.error).toMatchObject({ code: 'MCP_CANCELLED' })
    expect(managerSignalWasAborted).toBe(false)
    expect(secondOutcome).toEqual({ value: client })
  })

  test('the last waiter aborts a real client setup that is still discovering tools', async () => {
    const discoveryGate = deferred()
    const discoveryStarted = deferred()
    let connectSignal: AbortSignal | undefined
    const sdk = {
      async connect(_transport: unknown, requestOptions: { signal?: AbortSignal }) {
        connectSignal = requestOptions.signal
      },
      async listTools(_params?: unknown, requestOptions?: { signal?: AbortSignal }) {
        discoveryStarted.resolve()
        await waitForGateOrAbort(discoveryGate.promise, requestOptions?.signal)
        return { tools: [] }
      },
      async callTool() { return { content: [] } },
      getServerVersion: () => ({ name: 'fake-server', version: '1.0.0' }),
      getServerCapabilities: () => ({ tools: {} }),
      getInstructions: () => '',
      async close() {},
    }
    const factory: McpSdkFactory = {
      createClient: () => sdk as any,
      createTransport: () => ({ terminateSession: async () => {} }) as any,
    }
    const manager = new McpClientManager({
      createClient: input => createMcpClient({ server: input.server, key: input.key, sdkFactory: factory }),
    })
    const key: McpKeyRecord = {
      id: 1,
      mcp_server_id: 'buda',
      key: 'synthetic-key',
      description: '测试账号',
      is_active: true,
      priority: 0,
      success_count: 0,
      failure_count: 0,
    }
    const caller = new AbortController()

    const pending = manager.get('/workspace/a', BUDA_MCP_SERVER_TEMPLATE, key, caller.signal)
      .then(value => ({ value }), error => ({ error }))
    await discoveryStarted.promise
    caller.abort()
    const outcome = await pending
    const managerSignalWasAborted = Boolean(connectSignal?.aborted)
    discoveryGate.resolve()
    await manager.closeAll()

    expect(outcome.error).toMatchObject({ code: 'MCP_CANCELLED' })
    expect(managerSignalWasAborted).toBe(true)
  })

  test('invalidate aborts an in-flight manager-owned setup and rejects its waiter', async () => {
    const setupGate = deferred()
    const connectStarted = deferred()
    let connectSignal: AbortSignal | undefined
    const client = {
      state: 'Closed',
      async connect(signal?: AbortSignal) {
        connectSignal = signal
        connectStarted.resolve()
        await waitForGateOrAbort(setupGate.promise, signal)
        this.state = 'Ready'
      },
      async close() { this.state = 'Closed' },
    }
    const manager = new McpClientManager({ createClient: () => client as any })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any

    const pending = manager.get('/workspace/a', server, key)
      .then(value => ({ value }), error => ({ error }))
    await connectStarted.promise
    const invalidation = manager.invalidate('/workspace/a', 'buda', 1)
    await Promise.resolve()
    const managerSignalWasAborted = Boolean(connectSignal?.aborted)
    setupGate.resolve()
    const outcome = await pending
    await invalidation

    expect(managerSignalWasAborted).toBe(true)
    expect(outcome.error).toBeDefined()
  })

  test('a stale setup failure after invalidation cannot evict its ready replacement', async () => {
    const firstGate = deferred()
    const secondGate = deferred()
    const firstStarted = deferred()
    const secondStarted = deferred()
    const created: any[] = []
    const manager = new McpClientManager({
      createClient: () => {
        const index = created.length
        const client = {
          state: 'Closed',
          async connect() {
            if (index === 0) {
              firstStarted.resolve()
              await firstGate.promise
              throw new Error('stale setup failed')
            }
            if (index === 1) {
              secondStarted.resolve()
              await secondGate.promise
            }
            this.state = 'Ready'
          },
          async close() { this.state = 'Closed' },
        }
        created.push(client)
        return client as any
      },
    })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any

    const first = manager.get('/workspace/a', server, key)
      .then(value => ({ value }), error => ({ error }))
    await firstStarted.promise
    const invalidation = manager.invalidate('/workspace/a', 'buda', 1)
    const replacementPromise = manager.get('/workspace/a', server, key)
    await secondStarted.promise
    secondGate.resolve()
    const replacement = await replacementPromise
    firstGate.resolve()
    expect((await first).error).toBeDefined()
    await invalidation

    expect(await manager.get('/workspace/a', server, key)).toBe(replacement)
    expect(created).toHaveLength(2)
  })

  test('invalidateIfCurrent evicts and closes the matching current client', async () => {
    const created: any[] = []
    const manager = new McpClientManager({
      createClient: () => {
        const client = {
          state: 'Closed',
          closeCalls: 0,
          async connect() { this.state = 'Ready' },
          async close() { this.state = 'Closed'; this.closeCalls += 1 },
        }
        created.push(client)
        return client as any
      },
    })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any
    const current = await manager.get('/workspace/a', server, key)

    await manager.invalidateIfCurrent('/workspace/a', 'buda', 1, current)
    const replacement = await manager.get('/workspace/a', server, key)

    expect((current as any).closeCalls).toBe(1)
    expect(replacement).not.toBe(current)
    expect(created).toHaveLength(2)
  })

  test('invalidateIfCurrent ignores a stale client after a replacement is ready', async () => {
    const created: any[] = []
    const manager = new McpClientManager({
      createClient: () => {
        const client = {
          state: 'Closed',
          closeCalls: 0,
          async connect() { this.state = 'Ready' },
          async close() { this.state = 'Closed'; this.closeCalls += 1 },
        }
        created.push(client)
        return client as any
      },
    })
    const server = { id: 'buda' } as any
    const key = { id: 1 } as any
    const stale = await manager.get('/workspace/a', server, key)
    await manager.invalidate('/workspace/a', 'buda', 1)
    const replacement = await manager.get('/workspace/a', server, key)

    await manager.invalidateIfCurrent('/workspace/a', 'buda', 1, stale)

    expect(await manager.get('/workspace/a', server, key)).toBe(replacement)
    expect((replacement as any).closeCalls).toBe(0)
    expect(created).toHaveLength(2)
  })

  test('does not reuse a ready client across Key and Header rotation for the same IDs', async () => {
    const created: any[] = []
    const manager = new McpClientManager({
      createClient: input => {
        const client = {
          input,
          state: 'Closed',
          async connect() { this.state = 'Ready' },
          async close() { this.state = 'Closed' },
        }
        created.push(client)
        return client as any
      },
    })
    const rotatedServer = { id: 'buda', custom_headers: { 'X-Space': 'header-after-rotation' } } as any
    const rotatedKey = { id: 1, key: 'key-after-rotation' } as any
    const pinnedServer = { id: 'buda', custom_headers: { 'X-Space': 'header-before-rotation' } } as any
    const pinnedKey = { id: 1, key: 'key-before-rotation' } as any

    const rotatedClient = await manager.get('/workspace/a', rotatedServer, rotatedKey)
    const pinnedClient = await manager.get('/workspace/a', pinnedServer, pinnedKey)

    expect(pinnedClient).not.toBe(rotatedClient)
    expect(created).toHaveLength(2)
    expect((pinnedClient as any).input).toMatchObject({
      server: { custom_headers: { 'X-Space': 'header-before-rotation' } },
      key: { key: 'key-before-rotation' },
    })
  })
})
