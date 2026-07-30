import { describe, expect, test } from 'bun:test'
import { McpClientManager } from './client-manager'

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
