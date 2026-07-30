import { McpClientManager } from './client-manager'
import { McpError } from './errors'
import { readMcpKeys, updateMcpKey } from './key-store'
import { readMcpServers } from './server-store'
import { createMcpAdapter } from './adapters/registry'
import type { McpKeyRecord, McpServerRecord } from './types'
import type { McpClientPort, ProseMcpAdapter } from './adapters/types'

type RuntimeManager = Pick<McpClientManager, 'get' | 'invalidate' | 'invalidateIfCurrent' | 'invalidateServer' | 'closeAll'>

export type ResolvedMcpCredential = {
  server: McpServerRecord
  key: McpKeyRecord
  client: McpClientPort & { diagnostics?: () => unknown }
  adapter: ProseMcpAdapter
}

type PinnedMcpCredential = Pick<ResolvedMcpCredential, 'server' | 'key'>

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

  const getAdapterForKey = async (
    keyId: number,
    expectedServerId?: string,
    signal?: AbortSignal,
    pinnedCredential?: PinnedMcpCredential,
  ): Promise<ResolvedMcpCredential> => {
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
    let currentClient = await manager.get(activeWorkspace, server, key, signal)
    const reacquire = async (operationSignal?: AbortSignal) => {
      currentClient = await manager.get(activeWorkspace, server, key, operationSignal)
      return currentClient
    }
    const invalidateLostClient = async (client: typeof currentClient) => {
      await manager.invalidateIfCurrent(activeWorkspace, server.id, key.id, client).catch(() => {})
    }
    const readSafe = async <T>(
      operationSignal: AbortSignal | undefined,
      operation: (client: typeof currentClient) => Promise<T>,
    ) => {
      const firstClient = await reacquire(operationSignal)
      try {
        return await operation(firstClient)
      } catch (error) {
        if (!(error instanceof McpError) || error.code !== 'MCP_CONNECTION_LOST') throw error
        await invalidateLostClient(firstClient)
        return operation(await reacquire(operationSignal))
      }
    }
    const client: ResolvedMcpCredential['client'] = {
      listTools: options => readSafe(options.signal, activeClient => activeClient.listTools(options)),
      async callTool(name, args, operationOptions) {
        if (operationOptions.operation === 'read_safe') {
          return readSafe(
            operationOptions.signal,
            activeClient => activeClient.callTool(name, args, operationOptions),
          )
        }
        const activeClient = await reacquire(operationOptions.signal)
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

  const listAgents = async (keyId: number, signal?: AbortSignal) => {
    const resolved = await getAdapterForKey(keyId, undefined, signal)
    return resolved.adapter.listAgents({ signal })
  }

  return {
    getAdapterForKey,
    listAgents,
    async createAgent(keyId: number, input: { name: string; spaceId?: string; instructions?: string }, signal?: AbortSignal) {
      const resolved = await getAdapterForKey(keyId, undefined, signal)
      return resolved.adapter.createAgent(input, { signal })
    },
    async diagnostics(serverId: string, keyId: number, signal?: AbortSignal) {
      const resolved = await getAdapterForKey(keyId, serverId, signal)
      const agents = await resolved.adapter.listAgents({ signal })
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
