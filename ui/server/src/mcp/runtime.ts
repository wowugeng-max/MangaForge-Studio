import { McpClientManager } from './client-manager'
import { McpError } from './errors'
import { readMcpKeys, updateMcpKey } from './key-store'
import { readMcpServers } from './server-store'
import { createMcpAdapter } from './adapters/registry'
import type { McpKeyRecord, McpServerRecord } from './types'
import type { McpAdapterOperationOptions, McpClientPort, ProseMcpAdapter } from './adapters/types'
import { McpAgentLeaseRegistry } from './agent-lease'

type RuntimeManager = Pick<McpClientManager, 'get' | 'invalidate' | 'invalidateIfCurrent' | 'invalidateServer' | 'closeAll'>

export type ResolvedMcpCredential = {
  server: McpServerRecord
  key: McpKeyRecord
  client: McpClientPort & { diagnostics?: () => unknown }
  adapter: ProseMcpAdapter
}

type PinnedMcpCredential = Pick<ResolvedMcpCredential, 'server' | 'key'>

function operationOptions(options?: AbortSignal | McpAdapterOperationOptions): McpAdapterOperationOptions {
  if (options && typeof (options as AbortSignal).addEventListener === 'function') {
    return { signal: options as AbortSignal }
  }
  return options || {}
}

export function createMcpRuntime(
  getWorkspace: () => string,
  options: {
    manager?: RuntimeManager
    adapterFactory?: (adapterId: string, client: McpClientPort) => ProseMcpAdapter
    now?: () => number
  } = {},
) {
  const manager = options.manager || new McpClientManager()
  const adapterFactory = options.adapterFactory || createMcpAdapter
  const now = options.now || Date.now
  const agentLeases = new McpAgentLeaseRegistry()

  const resolveCredentialConfig = async (
    keyId: number,
    expectedServerId?: string,
    pinnedCredential?: PinnedMcpCredential,
  ): Promise<PinnedMcpCredential> => {
    const activeWorkspace = getWorkspace()
    const stored = pinnedCredential
      ? null
      : await Promise.all([readMcpServers(activeWorkspace), readMcpKeys(activeWorkspace)])
    const key = pinnedCredential?.key || stored?.[1].find(item => item.id === Number(keyId))
    if (!key) throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在：${keyId}`)
    if (key.id !== Number(keyId)) throw new McpError('MCP_BINDING_INVALID', '固定 MCP Key 与请求不一致')
    if (!key.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Key 已禁用：${keyId}`)
    if (expectedServerId && key.mcp_server_id !== expectedServerId) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP Key 不属于项目绑定的 Server')
    }
    const server = pinnedCredential?.server || stored?.[0].find(item => item.id === key.mcp_server_id)
    if (!server) throw new McpError('MCP_BINDING_INVALID', `MCP Server 不存在：${key.mcp_server_id}`)
    if (server.id !== key.mcp_server_id) throw new McpError('MCP_BINDING_INVALID', '固定 MCP Server 与 Key 不一致')
    if (!server.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Server 已禁用：${server.id}`)
    if (server.transport !== 'streamable_http') throw new McpError('MCP_BINDING_INVALID', '首期正文生成只支持 Streamable HTTP')
    return { server, key }
  }

  const getAdapterForKey = async (
    keyId: number,
    expectedServerId?: string,
    options?: AbortSignal | McpAdapterOperationOptions,
    pinnedCredential?: PinnedMcpCredential,
  ): Promise<ResolvedMcpCredential> => {
    const activeWorkspace = getWorkspace()
    const resolvedConfig = await resolveCredentialConfig(keyId, expectedServerId, pinnedCredential)
    const { server, key } = resolvedConfig
    const initialOptions = operationOptions(options)
    let currentClient = await manager.get(activeWorkspace, server, key, initialOptions)
    const reacquire = async (remoteOptions: McpAdapterOperationOptions = {}) => {
      currentClient = await manager.get(activeWorkspace, server, key, remoteOptions)
      return currentClient
    }
    const invalidateLostClient = async (client: typeof currentClient) => {
      await manager.invalidateIfCurrent(activeWorkspace, server.id, key.id, client).catch(() => {})
    }
    const readSafe = async <T>(
      remoteOptions: McpAdapterOperationOptions,
      operation: (client: typeof currentClient) => Promise<T>,
    ) => {
      const firstClient = await reacquire(remoteOptions)
      try {
        return await operation(firstClient)
      } catch (error) {
        if (!(error instanceof McpError) || error.code !== 'MCP_CONNECTION_LOST') throw error
        await invalidateLostClient(firstClient)
        return operation(await reacquire(remoteOptions))
      }
    }
    const client: ResolvedMcpCredential['client'] = {
      listTools: options => readSafe(options, activeClient => activeClient.listTools(options)),
      async callTool(name, args, operationOptions) {
        if (operationOptions.operation === 'read_safe') {
          return readSafe(
            operationOptions,
            activeClient => activeClient.callTool(name, args, operationOptions),
          )
        }
        const activeClient = await reacquire(operationOptions)
        try {
          return await activeClient.callTool(name, args, operationOptions)
        } catch (error) {
          if (error instanceof McpError && error.code === 'MCP_CONNECTION_LOST') {
            await invalidateLostClient(activeClient)
          }
          throw error
        }
      },
      diagnostics: () => currentClient.diagnostics(),
    }
    const adapter = adapterFactory(server.adapter_id, client)
    return { server, key, client, adapter }
  }

  const listAgents = async (keyId: number, options?: AbortSignal | McpAdapterOperationOptions) => {
    const remoteOptions = operationOptions(options)
    const resolved = await getAdapterForKey(keyId, undefined, remoteOptions)
    return resolved.adapter.listAgents(remoteOptions)
  }

  return {
    acquireAgentLease(activeWorkspace: string, binding: Parameters<McpAgentLeaseRegistry['acquire']>[1]) {
      return agentLeases.acquire(activeWorkspace, binding)
    },
    isAgentLeaseActive(activeWorkspace: string, binding: Parameters<McpAgentLeaseRegistry['isActive']>[1]) {
      return agentLeases.isActive(activeWorkspace, binding)
    },
    listAgentQuarantines(activeWorkspace: string) {
      return agentLeases.list(activeWorkspace)
    },
    clearAgentQuarantine(activeWorkspace: string, quarantineId: string) {
      return agentLeases.clear(activeWorkspace, quarantineId)
    },
    resolveCredentialConfig,
    getAdapterForKey,
    listAgents,
    async createAgent(keyId: number, input: { name: string; spaceId?: string; instructions?: string }, signal?: AbortSignal) {
      const remoteOptions = operationOptions(signal)
      const resolved = await getAdapterForKey(keyId, undefined, remoteOptions)
      return resolved.adapter.createAgent(input, remoteOptions)
    },
    async diagnostics(serverId: string, keyId: number, signal?: AbortSignal) {
      const remoteOptions = operationOptions(signal)
      const resolved = await getAdapterForKey(keyId, serverId, remoteOptions)
      const agents = await resolved.adapter.listAgents(remoteOptions)
      return {
        ...((resolved.client.diagnostics?.() || {}) as Record<string, unknown>),
        adapter_id: resolved.server.adapter_id,
        adapter_ready: true,
        agent_count: agents.length,
        agents,
      }
    },
    async testKey(keyId: number, signal?: AbortSignal) {
      const activeWorkspace = getWorkspace()
      const startedAt = now()
      const keys = await readMcpKeys(activeWorkspace)
      const previous = keys.find(item => item.id === Number(keyId))
      if (!previous) throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在：${keyId}`)
      try {
        const agents = await listAgents(keyId, signal)
        const latency = Math.max(0, now() - startedAt)
        await updateMcpKey(activeWorkspace, keyId, {
          success_count: Number(previous.success_count || 0) + 1,
          failure_count: 0,
          last_checked: new Date().toISOString(),
          avg_latency: previous.avg_latency
            ? Math.round(previous.avg_latency * 0.9 + latency * 0.1)
            : latency,
        })
        return { ok: true, latency_ms: latency, agent_count: agents.length }
      } catch (error) {
        await updateMcpKey(activeWorkspace, keyId, {
          failure_count: Number(previous.failure_count || 0) + 1,
          last_checked: new Date().toISOString(),
        })
        throw error
      }
    },
    invalidateKey(keyId: number, serverId?: string) {
      return manager.invalidate(getWorkspace(), serverId || '', keyId)
    },
    invalidateServer(serverId: string) {
      return manager.invalidateServer(getWorkspace(), serverId)
    },
    close() {
      return manager.closeAll()
    },
  }
}

export type McpRuntime = ReturnType<typeof createMcpRuntime>
