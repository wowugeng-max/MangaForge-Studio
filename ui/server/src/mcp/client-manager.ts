import { createHash } from 'crypto'
import { createMcpClient, type GenericMcpClient } from './client'
import type { McpKeyRecord, McpServerRecord } from './types'

function connectionPrefix(activeWorkspace: string, serverId: string, keyId: number) {
  return `${activeWorkspace}\u0000${serverId}\u0000${keyId}`
}

function connectionKey(activeWorkspace: string, server: McpServerRecord, key: McpKeyRecord) {
  const configuration = JSON.stringify({
    server: {
      transport: server.transport,
      url: server.url,
      auth_type: server.auth_type,
      adapter_id: server.adapter_id,
      startup_timeout_ms: server.startup_timeout_ms,
      tool_timeout_ms: server.tool_timeout_ms,
      generation_timeout_ms: server.generation_timeout_ms,
      poll_initial_ms: server.poll_initial_ms,
      poll_max_ms: server.poll_max_ms,
      enabled_tools: [...(server.enabled_tools || [])].sort(),
      custom_headers: Object.entries(server.custom_headers || {}).sort(([left], [right]) => left.localeCompare(right)),
    },
    key: key.key,
  })
  const fingerprint = createHash('sha256').update(configuration, 'utf8').digest('hex')
  return `${connectionPrefix(activeWorkspace, server.id, key.id)}\u0000${fingerprint}`
}

export class McpClientManager {
  private readonly clients = new Map<string, GenericMcpClient>()
  private readonly connecting = new Map<string, Promise<GenericMcpClient>>()
  private readonly createClient: typeof createMcpClient

  constructor(options: { createClient?: typeof createMcpClient } = {}) {
    this.createClient = options.createClient || createMcpClient
  }

  async get(activeWorkspace: string, server: McpServerRecord, key: McpKeyRecord, signal?: AbortSignal) {
    const cacheKey = connectionKey(activeWorkspace, server, key)
    let client = this.clients.get(cacheKey)
    if (!client) {
      client = this.createClient({ server, key })
      this.clients.set(cacheKey, client)
    }
    if (client.state === 'Ready') return client
    const inFlight = this.connecting.get(cacheKey)
    if (inFlight) return inFlight
    const connection = (async () => {
      try {
        await client.connect(signal)
        return client
      } catch (error) {
        this.clients.delete(cacheKey)
        throw error
      } finally {
        if (this.connecting.get(cacheKey) === connection) this.connecting.delete(cacheKey)
      }
    })()
    this.connecting.set(cacheKey, connection)
    return connection
  }

  async invalidate(activeWorkspace: string, serverId: string, keyId: number) {
    const prefix = `${connectionPrefix(activeWorkspace, serverId, keyId)}\u0000`
    const clients = [...this.clients.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of clients) this.clients.delete(key)
    const connections = [...this.connecting.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of connections) this.connecting.delete(key)
    await Promise.all(connections.map(([, connection]) => connection.catch(() => {})))
    await Promise.all(clients.map(([, client]) => client.close()))
  }

  async invalidateServer(activeWorkspace: string, serverId: string) {
    const prefix = `${activeWorkspace}\u0000${serverId}\u0000`
    const matches = [...this.clients.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of matches) this.clients.delete(key)
    const connections = [...this.connecting.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of connections) this.connecting.delete(key)
    await Promise.all(connections.map(([, connection]) => connection.catch(() => {})))
    await Promise.all(matches.map(([, client]) => client.close()))
  }

  async closeAll() {
    const clients = [...this.clients.values()]
    this.clients.clear()
    const connections = [...this.connecting.values()]
    this.connecting.clear()
    await Promise.all(connections.map(connection => connection.catch(() => {})))
    await Promise.all(clients.map(client => client.close()))
  }
}
