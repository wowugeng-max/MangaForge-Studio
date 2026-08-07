import { AsyncLocalStorage } from 'node:async_hooks'
import { McpClientManager } from './client-manager'
import { McpError } from './errors'
import { readMcpKeys, updateMcpKey } from './key-store'
import { readMcpServers } from './server-store'
import { createMcpAdapter } from './adapters/registry'
import type {
  McpAgentQuarantineRecord,
  McpKeyRecord,
  McpOperationKind,
  McpServerRecord,
  PublicMcpAgentQuarantineRecord,
} from './types'
import type {
  McpAdapterOperationOptions,
  McpClientPort,
  McpGenerationAdapter,
  McpStabilityController,
} from './adapters/types'
import { McpAgentLeaseRegistry } from './agent-lease'
import { withMcpWorkspaceMutation } from './workspace-coordinator'
import {
  createMcpStabilityController,
  type McpStabilityOperationAttempt,
} from './stability'

type RuntimeManager = Pick<McpClientManager, 'get' | 'invalidate' | 'invalidateIfCurrent' | 'invalidateServer' | 'closeAll'>

type RuntimeStabilityOperationScope = {
  owner: object
  operationKind: McpOperationKind
  attempt: McpStabilityOperationAttempt
}

export type ResolvedMcpCredential = {
  server: McpServerRecord
  key: McpKeyRecord
  client: McpClientPort & { diagnostics?: () => unknown }
  adapter: McpGenerationAdapter
  stability: McpStabilityController
}

export type PinnedMcpCredential = Pick<ResolvedMcpCredential, 'server' | 'key'> & {
  activeWorkspace?: string
}

const PUBLIC_SESSION_STATUSES = new Set([
  'completed', 'failed', 'cancelled', 'waiting_for_input', 'pending', 'in_progress', 'unknown',
])

function toPublicAgentQuarantine(record: McpAgentQuarantineRecord): PublicMcpAgentQuarantineRecord {
  return {
    id: record.id,
    server_id: record.server_id,
    key_id: record.key_id,
    agent_id: record.agent_id,
    ...(record.session_id ? { session_id: record.session_id } : {}),
    reason: record.reason,
    created_at: record.created_at,
  }
}

function boundedSessionInspection(value: { status?: unknown; terminal?: unknown }) {
  const candidate = String(value?.status || '')
  const status = PUBLIC_SESSION_STATUSES.has(candidate) ? candidate : 'unknown'
  const terminal = value?.terminal === true
    && (status === 'completed' || status === 'failed' || status === 'cancelled')
  return { status, terminal }
}

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
    adapterFactory?: (adapterId: string, client: McpClientPort) => McpGenerationAdapter
    now?: () => number
  } = {},
) {
  const manager = options.manager || new McpClientManager()
  const adapterFactory = options.adapterFactory || createMcpAdapter
  const now = options.now || Date.now
  const agentLeases = new McpAgentLeaseRegistry()
  const stabilityOperationScope = new AsyncLocalStorage<RuntimeStabilityOperationScope>()

  const resolveCredentialConfigInWorkspace = async (
    activeWorkspace: string,
    keyId: number,
    expectedServerId?: string,
    pinnedCredential?: PinnedMcpCredential,
  ): Promise<PinnedMcpCredential> => {
    if (pinnedCredential?.activeWorkspace && pinnedCredential.activeWorkspace !== activeWorkspace) {
      throw new McpError('MCP_BINDING_INVALID', '固定 MCP 凭据与请求 Workspace 不一致')
    }
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
    return { server, key, activeWorkspace }
  }

  const resolveCredentialConfig = (
    keyId: number,
    expectedServerId?: string,
    pinnedCredential?: PinnedMcpCredential,
  ) => {
    const activeWorkspace = pinnedCredential?.activeWorkspace ?? getWorkspace()
    return resolveCredentialConfigInWorkspace(activeWorkspace, keyId, expectedServerId, pinnedCredential)
  }

  const getAdapterForWorkspace = async (
    activeWorkspace: string,
    keyId: number,
    expectedServerId?: string,
    options?: AbortSignal | McpAdapterOperationOptions,
    pinnedCredential?: PinnedMcpCredential,
  ): Promise<ResolvedMcpCredential> => {
    const resolvedConfig = await resolveCredentialConfigInWorkspace(
      activeWorkspace,
      keyId,
      expectedServerId,
      pinnedCredential,
    )
    const { server, key } = resolvedConfig
    const stabilityOwner = {}
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
        const scope = stabilityOperationScope.getStore()
        if (scope?.owner === stabilityOwner && scope.operationKind === 'read_safe') {
          scope.attempt.failedClient = firstClient
          throw error
        }
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
    const stability = createMcpStabilityController({
      reacquire,
      invalidateCurrent: () => invalidateLostClient(currentClient),
      invalidateClient: client => invalidateLostClient(client),
      runOperation: (operationKind, attempt, operation) => stabilityOperationScope.run({
        owner: stabilityOwner,
        operationKind,
        attempt,
      }, operation),
    })
    const adapter = adapterFactory(server.adapter_id, client)
    return { server, key, client, adapter, stability }
  }

  const getAdapterForKey = (
    keyId: number,
    expectedServerId?: string,
    options?: AbortSignal | McpAdapterOperationOptions,
    pinnedCredential?: PinnedMcpCredential,
  ) => getAdapterForWorkspace(
    pinnedCredential?.activeWorkspace ?? getWorkspace(),
    keyId,
    expectedServerId,
    options,
    pinnedCredential,
  )

  const listAgents = async (
    keyId: number,
    options?: AbortSignal | McpAdapterOperationOptions,
    pinnedCredential?: PinnedMcpCredential,
  ) => {
    const remoteOptions = operationOptions(options)
    const resolved = await getAdapterForKey(keyId, undefined, remoteOptions, pinnedCredential)
    return resolved.adapter.listAgents(remoteOptions)
  }

  return {
    acquireAgentLease(activeWorkspace: string, binding: Parameters<McpAgentLeaseRegistry['acquire']>[1]) {
      return agentLeases.acquire(activeWorkspace, binding)
    },
    isAgentLeaseActive(activeWorkspace: string, binding: Parameters<McpAgentLeaseRegistry['isActive']>[1]) {
      return agentLeases.isActive(activeWorkspace, binding)
    },
    compareAndClearSessionFence(
      activeWorkspace: string,
      binding: Parameters<McpAgentLeaseRegistry['compareAndClearSessionFence']>[1],
      expectation: Parameters<McpAgentLeaseRegistry['compareAndClearSessionFence']>[2],
    ) {
      return agentLeases.compareAndClearSessionFence(activeWorkspace, binding, expectation)
    },
    async listAgentQuarantines(activeWorkspace: string) {
      return (await agentLeases.list(activeWorkspace)).map(toPublicAgentQuarantine)
    },
    clearAgentQuarantine(activeWorkspace: string, quarantineId: string) {
      return agentLeases.clear(activeWorkspace, quarantineId)
    },
    async reconcileAgentQuarantine(
      activeWorkspace: string,
      quarantineId: string,
      options?: AbortSignal | McpAdapterOperationOptions,
    ) {
      return withMcpWorkspaceMutation(activeWorkspace, async () => {
        const record = (await agentLeases.list(activeWorkspace)).find(item => item.id === quarantineId)
        if (!record) return null
        const remoteOptions = operationOptions(options)
        const resolved = await getAdapterForWorkspace(
          activeWorkspace,
          record.key_id,
          record.server_id,
          remoteOptions,
        )
        if (record.reason === 'session_create_unknown' || !record.session_id) {
          return {
            quarantine: toPublicAgentQuarantine(record),
            status: 'unknown' as const,
            terminal: false,
            cleared: false,
            outcome: 'ack_required' as const,
          }
        }
        const inspection = boundedSessionInspection(await resolved.adapter.inspectSession({
          agentId: record.agent_id,
          sessionId: record.session_id,
        }, remoteOptions))
        const quarantine = toPublicAgentQuarantine(record)
        if (!inspection.terminal) {
          return { quarantine, ...inspection, cleared: false, outcome: 'nonterminal' as const }
        }
        const cleared = await agentLeases.clear(activeWorkspace, record.id, record)
        return {
          quarantine,
          ...inspection,
          cleared,
          outcome: cleared ? 'cleared' as const : 'conflict' as const,
        }
      })
    },
    resolveCredentialConfig,
    getAdapterForKey,
    listAgents,
    async createAgent(
      keyId: number,
      input: { name: string; spaceId?: string; instructions?: string },
      signal?: AbortSignal,
      pinnedCredential?: PinnedMcpCredential,
    ) {
      const remoteOptions = operationOptions(signal)
      const resolved = await getAdapterForKey(keyId, undefined, remoteOptions, pinnedCredential)
      return resolved.adapter.createAgent(input, remoteOptions)
    },
    async diagnostics(activeWorkspace: string, serverId: string, keyId: number, signal?: AbortSignal) {
      return withMcpWorkspaceMutation(activeWorkspace, async () => {
        const remoteOptions = operationOptions(signal)
        const resolved = await getAdapterForWorkspace(activeWorkspace, keyId, serverId, remoteOptions)
        const agents = await resolved.adapter.listAgents(remoteOptions)
        const matchingQuarantines = (await agentLeases.list(activeWorkspace)).filter(record => (
          record.server_id === serverId && record.key_id === keyId
        ))
        const inspections = await Promise.all(matchingQuarantines.map(async record => ({
          record,
          inspection: record.reason === 'session_create_unknown' || !record.session_id
            ? { status: 'unknown', terminal: false }
            : boundedSessionInspection(await resolved.adapter.inspectSession({
              agentId: record.agent_id,
              sessionId: record.session_id,
            }, remoteOptions)),
        })))
        const quarantines = []
        for (const { record, inspection } of inspections) {
          const cleared = inspection.terminal
            ? await agentLeases.clear(activeWorkspace, record.id, record)
            : false
          quarantines.push({
            quarantine: toPublicAgentQuarantine(record),
            ...inspection,
            cleared,
          })
        }
        return {
          ...((resolved.client.diagnostics?.() || {}) as Record<string, unknown>),
          adapter_id: resolved.server.adapter_id,
          adapter_ready: true,
          agent_count: agents.length,
          agents,
          quarantines,
        }
      })
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
    invalidateKey(keyId: number, serverId?: string, activeWorkspace = getWorkspace()) {
      return manager.invalidate(activeWorkspace, serverId || '', keyId)
    },
    invalidateServer(serverId: string, activeWorkspace = getWorkspace()) {
      return manager.invalidateServer(activeWorkspace, serverId)
    },
    close() {
      return manager.closeAll()
    },
  }
}

export type McpRuntime = ReturnType<typeof createMcpRuntime>
