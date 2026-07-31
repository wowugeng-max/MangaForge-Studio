import { createHash } from 'crypto'
import { createMcpClient, type GenericMcpClient } from './client'
import { McpError } from './errors'
import type { McpKeyRecord, McpServerRecord } from './types'

type ConnectionEntry = {
  client: GenericMcpClient
  controller: AbortController
  promise: Promise<GenericMcpClient>
  waiters: number
  settled: boolean
  closePromise?: Promise<void>
  retirement?: Promise<void>
}

type ConnectionWaitOptions = {
  signal?: AbortSignal
  timeoutMs?: number
}

type ManagerTimers = {
  setTimeout: (callback: () => void, delayMs: number) => unknown
  clearTimeout: (handle: unknown) => void
}

const systemTimers: ManagerTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

function normalizeWaitOptions(options?: AbortSignal | ConnectionWaitOptions): ConnectionWaitOptions {
  if (options && typeof (options as AbortSignal).addEventListener === 'function') {
    return { signal: options as AbortSignal }
  }
  return options || {}
}

function cancellationReason(signal: AbortSignal) {
  return signal.reason instanceof McpError
    ? signal.reason
    : new McpError('MCP_CANCELLED', 'MCP 连接等待已取消')
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
  private readonly retired = new Map<string, Set<ConnectionEntry>>()
  private readonly createClient: typeof createMcpClient
  private readonly timers: ManagerTimers

  constructor(options: { createClient?: typeof createMcpClient, timers?: ManagerTimers } = {}) {
    this.createClient = options.createClient || createMcpClient
    this.timers = options.timers || systemTimers
  }

  async get(
    activeWorkspace: string,
    server: McpServerRecord,
    key: McpKeyRecord,
    waitOptions?: AbortSignal | ConnectionWaitOptions,
  ) {
    const { signal, timeoutMs } = normalizeWaitOptions(waitOptions)
    if (signal?.aborted) throw cancellationReason(signal)
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
        settled: false,
      }
      const connection = (async () => {
        try {
          await connectingClient.connect(controller.signal)
          return connectingClient
        } catch (error) {
          if (this.clients.get(cacheKey) === connectingClient) this.clients.delete(cacheKey)
          throw error
        } finally {
          entry.settled = true
          if (this.connecting.get(cacheKey) === entry) this.connecting.delete(cacheKey)
        }
      })()
      entry.promise = connection
      this.connecting.set(cacheKey, entry)
    }
    return this.waitForConnection(cacheKey, entry, signal, timeoutMs)
  }

  private closeConnection(entry: ConnectionEntry) {
    entry.closePromise ||= entry.client.close().catch(() => {})
    return entry.closePromise
  }

  private forgetRetired(cacheKey: string, entry: ConnectionEntry) {
    const entries = this.retired.get(cacheKey)
    if (!entries) return
    entries.delete(entry)
    if (entries.size === 0) this.retired.delete(cacheKey)
  }

  private retireConnection(cacheKey: string, entry: ConnectionEntry) {
    if (this.connecting.get(cacheKey) === entry) this.connecting.delete(cacheKey)
    if (this.clients.get(cacheKey) === entry.client) this.clients.delete(cacheKey)
    if (entry.settled || entry.retirement) return

    let entries = this.retired.get(cacheKey)
    if (!entries) {
      entries = new Set()
      this.retired.set(cacheKey, entries)
    }
    entries.add(entry)
    entry.retirement = entry.promise
      .then(
        () => this.closeConnection(entry),
        () => this.closeConnection(entry),
      )
      .finally(() => this.forgetRetired(cacheKey, entry))
    entry.controller.abort()
  }

  private async waitForConnection(
    cacheKey: string,
    entry: ConnectionEntry,
    signal?: AbortSignal,
    timeoutMs?: number,
  ) {
    if (signal?.aborted) throw cancellationReason(signal)
    entry.waiters += 1
    let onAbort: (() => void) | undefined
    let timeout: unknown
    try {
      const waiters: Promise<GenericMcpClient>[] = [entry.promise]
      if (signal) {
        waiters.push(new Promise<never>((_, reject) => {
          onAbort = () => reject(cancellationReason(signal))
          signal.addEventListener('abort', onAbort, { once: true })
        }))
      }
      if (timeoutMs !== undefined) {
        waiters.push(new Promise<never>((_, reject) => {
          timeout = this.timers.setTimeout(() => {
            reject(new McpError('MCP_CONNECT_TIMEOUT', '连接 MCP 服务超时'))
          }, Math.max(1, timeoutMs))
          ;(timeout as any)?.unref?.()
        }))
      }
      return await Promise.race(waiters)
    } finally {
      if (timeout !== undefined) this.timers.clearTimeout(timeout)
      if (onAbort && signal) signal.removeEventListener('abort', onAbort)
      entry.waiters -= 1
      if (entry.waiters === 0 && !entry.settled && entry.client.state !== 'Ready') {
        this.retireConnection(cacheKey, entry)
      }
    }
  }

  private async invalidateMatching(
    matchesClient: (cacheKey: string, client: GenericMcpClient) => boolean,
    matchesConnection: (cacheKey: string, entry: ConnectionEntry) => boolean,
  ) {
    const clients = [...this.clients.entries()].filter(([cacheKey, client]) => matchesClient(cacheKey, client))
    const connections = [...this.connecting.entries()]
      .filter(([cacheKey, entry]) => matchesConnection(cacheKey, entry))
    const retiredConnections = [...this.retired.entries()]
      .flatMap(([cacheKey, entries]) => [...entries].map(entry => [cacheKey, entry] as const))
      .filter(([cacheKey, entry]) => matchesConnection(cacheKey, entry))
    const allConnections = [...connections, ...retiredConnections]
    for (const [, entry] of allConnections) entry.controller.abort()
    for (const [cacheKey, client] of clients) {
      if (this.clients.get(cacheKey) === client) this.clients.delete(cacheKey)
    }
    for (const [cacheKey, entry] of connections) {
      if (this.connecting.get(cacheKey) === entry) this.connecting.delete(cacheKey)
    }
    await Promise.all(allConnections.map(([, entry]) => entry.promise.catch(() => {})))
    await Promise.all(allConnections.map(([, entry]) => this.closeConnection(entry)))
    const connectionClients = new Set(allConnections.map(([, entry]) => entry.client))
    const clientsToClose = new Set([
      ...clients.map(([, client]) => client).filter(client => !connectionClients.has(client)),
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
    const connections = new Set([
      ...this.connecting.values(),
      ...[...this.retired.values()].flatMap(entries => [...entries]),
    ])
    for (const entry of connections) entry.controller.abort()
    this.clients.clear()
    this.connecting.clear()
    this.retired.clear()
    await Promise.all([...connections].map(entry => entry.promise.catch(() => {})))
    await Promise.all([...connections].map(entry => this.closeConnection(entry)))
    const connectionClients = new Set([...connections].map(entry => entry.client))
    const clientsToClose = new Set(clients.filter(client => !connectionClients.has(client)))
    await Promise.all([...clientsToClose].map(client => client.close().catch(() => {})))
  }
}
