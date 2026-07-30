import { createHash } from 'crypto'
import { createMcpClient, type GenericMcpClient } from './client'
import { McpError } from './errors'
import type { McpKeyRecord, McpServerRecord } from './types'

type ConnectionEntry = {
  client: GenericMcpClient
  controller: AbortController
  promise: Promise<GenericMcpClient>
  waiters: number
}

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
  private readonly connecting = new Map<string, ConnectionEntry>()
  private readonly createClient: typeof createMcpClient

  constructor(options: { createClient?: typeof createMcpClient } = {}) {
    this.createClient = options.createClient || createMcpClient
  }

  async get(activeWorkspace: string, server: McpServerRecord, key: McpKeyRecord, signal?: AbortSignal) {
    if (signal?.aborted) throw new McpError('MCP_CANCELLED', 'MCP 连接等待已取消')
    const cacheKey = connectionKey(activeWorkspace, server, key)
    let client = this.clients.get(cacheKey)
    if (client?.state === 'Ready') return client
    let entry = this.connecting.get(cacheKey)
    if (!entry) {
      if (!client) {
        client = this.createClient({ server, key })
        this.clients.set(cacheKey, client)
      }
      const connectingClient = client
      const controller = new AbortController()
      entry = {
        client: connectingClient,
        controller,
        promise: Promise.resolve(connectingClient),
        waiters: 0,
      }
      const connection = (async () => {
        try {
          await connectingClient.connect(controller.signal)
          return connectingClient
        } catch (error) {
          if (this.clients.get(cacheKey) === connectingClient) this.clients.delete(cacheKey)
          throw error
        } finally {
          if (this.connecting.get(cacheKey) === entry) this.connecting.delete(cacheKey)
        }
      })()
      entry.promise = connection
      this.connecting.set(cacheKey, entry)
    }
    return this.waitForConnection(entry, signal)
  }

  private async waitForConnection(entry: ConnectionEntry, signal?: AbortSignal) {
    if (signal?.aborted) throw new McpError('MCP_CANCELLED', 'MCP 连接等待已取消')
    entry.waiters += 1
    let onAbort: (() => void) | undefined
    try {
      if (!signal) return await entry.promise
      const cancelled = new Promise<never>((_, reject) => {
        onAbort = () => reject(new McpError('MCP_CANCELLED', 'MCP 连接等待已取消'))
        signal.addEventListener('abort', onAbort, { once: true })
      })
      return await Promise.race([entry.promise, cancelled])
    } finally {
      if (onAbort && signal) signal.removeEventListener('abort', onAbort)
      entry.waiters -= 1
      if (entry.waiters === 0 && entry.client.state !== 'Ready') entry.controller.abort()
    }
  }

  private async invalidateMatching(
    matchesClient: (cacheKey: string, client: GenericMcpClient) => boolean,
    matchesConnection: (cacheKey: string, entry: ConnectionEntry) => boolean,
  ) {
    const clients = [...this.clients.entries()].filter(([cacheKey, client]) => matchesClient(cacheKey, client))
    const connections = [...this.connecting.entries()]
      .filter(([cacheKey, entry]) => matchesConnection(cacheKey, entry))
    for (const [, entry] of connections) entry.controller.abort()
    for (const [cacheKey, client] of clients) {
      if (this.clients.get(cacheKey) === client) this.clients.delete(cacheKey)
    }
    for (const [cacheKey, entry] of connections) {
      if (this.connecting.get(cacheKey) === entry) this.connecting.delete(cacheKey)
    }
    await Promise.all(connections.map(([, entry]) => entry.promise.catch(() => {})))
    const clientsToClose = new Set([
      ...clients.map(([, client]) => client),
      ...connections.map(([, entry]) => entry.client),
    ])
    await Promise.all([...clientsToClose].map(client => client.close().catch(() => {})))
  }

  async invalidate(activeWorkspace: string, serverId: string, keyId: number) {
    const prefix = `${connectionPrefix(activeWorkspace, serverId, keyId)}\u0000`
    await this.invalidateMatching(
      cacheKey => cacheKey.startsWith(prefix),
      cacheKey => cacheKey.startsWith(prefix),
    )
  }

  async invalidateIfCurrent(
    activeWorkspace: string,
    serverId: string,
    keyId: number,
    client: GenericMcpClient,
  ) {
    const prefix = `${connectionPrefix(activeWorkspace, serverId, keyId)}\u0000`
    await this.invalidateMatching(
      (cacheKey, current) => cacheKey.startsWith(prefix) && current === client,
      (cacheKey, current) => cacheKey.startsWith(prefix) && current.client === client,
    )
  }

  async invalidateServer(activeWorkspace: string, serverId: string) {
    const prefix = `${activeWorkspace}\u0000${serverId}\u0000`
    await this.invalidateMatching(
      cacheKey => cacheKey.startsWith(prefix),
      cacheKey => cacheKey.startsWith(prefix),
    )
  }

  async closeAll() {
    const clients = [...this.clients.values()]
    const connections = [...this.connecting.values()]
    for (const entry of connections) entry.controller.abort()
    this.clients.clear()
    this.connecting.clear()
    await Promise.all(connections.map(entry => entry.promise.catch(() => {})))
    const clientsToClose = new Set([...clients, ...connections.map(entry => entry.client)])
    await Promise.all([...clientsToClose].map(client => client.close().catch(() => {})))
  }
}
