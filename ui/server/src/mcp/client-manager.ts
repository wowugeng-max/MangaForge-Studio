import { createMcpClient, type GenericMcpClient } from './client'
import type { McpKeyRecord, McpServerRecord } from './types'

function connectionKey(activeWorkspace: string, serverId: string, keyId: number) {
  return `${activeWorkspace}\u0000${serverId}\u0000${keyId}`
}

export class McpClientManager {
  private readonly clients = new Map<string, GenericMcpClient>()
  private readonly createClient: typeof createMcpClient

  constructor(options: { createClient?: typeof createMcpClient } = {}) {
    this.createClient = options.createClient || createMcpClient
  }

  async get(activeWorkspace: string, server: McpServerRecord, key: McpKeyRecord, signal?: AbortSignal) {
    const cacheKey = connectionKey(activeWorkspace, server.id, key.id)
    let client = this.clients.get(cacheKey)
    if (!client) {
      client = this.createClient({ server, key })
      this.clients.set(cacheKey, client)
    }
    if (client.state !== 'Ready') {
      try {
        await client.connect(signal)
      } catch (error) {
        this.clients.delete(cacheKey)
        throw error
      }
    }
    return client
  }

  async invalidate(activeWorkspace: string, serverId: string, keyId: number) {
    const cacheKey = connectionKey(activeWorkspace, serverId, keyId)
    const client = this.clients.get(cacheKey)
    this.clients.delete(cacheKey)
    await client?.close()
  }

  async invalidateServer(activeWorkspace: string, serverId: string) {
    const prefix = `${activeWorkspace}\u0000${serverId}\u0000`
    const matches = [...this.clients.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of matches) this.clients.delete(key)
    await Promise.all(matches.map(([, client]) => client.close()))
  }

  async closeAll() {
    const clients = [...this.clients.values()]
    this.clients.clear()
    await Promise.all(clients.map(client => client.close()))
  }
}
