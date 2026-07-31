import { canonicalFilesystemIdentity } from '../workspace-identity'
import { McpError } from './errors'
import {
  clearMcpAgentQuarantine,
  readMcpAgentQuarantines,
  upsertMcpAgentQuarantine,
  type McpAgentQuarantineInput,
} from './quarantine-store'
import { withMcpWorkspaceMutation } from './workspace-coordinator'
import type { McpAgentQuarantineRecord } from './types'
import {
  addMcpActiveBinding,
  deleteMcpActiveBinding,
  hasMcpActiveBinding,
  mcpActiveBindingKey,
} from './identity-mutation-fence'

export type McpAgentLeaseBinding = { serverId: string; keyId: number; agentId: string }
const FULL_ID_MAX_CHARS = 16_384

export type McpAgentLease = {
  readonly tupleKey: string
  readonly binding: Readonly<McpAgentLeaseBinding>
  stageSessionFence(input: { requestId: string; sessionId: string }): Promise<void>
  quarantine(input: Omit<McpAgentQuarantineInput, keyof McpAgentLeaseBinding>): Promise<void>
  clearSessionFence(): Promise<void>
  release(): Promise<void>
}

type McpAgentLeaseStore = {
  read(activeWorkspace: string): Promise<McpAgentQuarantineRecord[]>
  upsert(activeWorkspace: string, input: McpAgentQuarantineInput): Promise<McpAgentQuarantineRecord>
  clear(activeWorkspace: string, quarantineId: string): Promise<boolean>
}

function normalizedBinding(binding: McpAgentLeaseBinding): McpAgentLeaseBinding {
  if (!binding || typeof binding.serverId !== 'string' || typeof binding.keyId !== 'number'
    || typeof binding.agentId !== 'string') {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Agent lease 绑定无效')
  }
  const normalized = {
    serverId: binding.serverId.trim(),
    keyId: binding.keyId,
    agentId: binding.agentId.trim(),
  }
  if (!normalized.serverId || normalized.serverId.length > FULL_ID_MAX_CHARS
    || !Number.isInteger(normalized.keyId) || normalized.keyId <= 0
    || !normalized.agentId || normalized.agentId.length > FULL_ID_MAX_CHARS) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Agent lease 绑定无效')
  }
  return normalized
}

export class McpAgentLeaseRegistry {
  private readonly store: McpAgentLeaseStore

  constructor(store: Partial<McpAgentLeaseStore> = {}) {
    this.store = {
      read: store.read || readMcpAgentQuarantines,
      upsert: store.upsert || upsertMcpAgentQuarantine,
      clear: store.clear || clearMcpAgentQuarantine,
    }
  }

  async acquire(activeWorkspaceInput: string, input: McpAgentLeaseBinding): Promise<McpAgentLease> {
    const activeWorkspace = canonicalFilesystemIdentity(activeWorkspaceInput)
    const binding = normalizedBinding(input)
    const key = mcpActiveBindingKey(activeWorkspace, binding)
    return withMcpWorkspaceMutation(activeWorkspace, async () => {
      const quarantine = (await this.store.read(activeWorkspace)).find(item => (
        item.server_id === binding.serverId && item.key_id === binding.keyId && item.agent_id === binding.agentId
      ))
      if (quarantine) {
        throw new McpError('MCP_AGENT_QUARANTINED', '该 Buda Agent 存在未确认终止的远端 Session', {
          quarantine_id: quarantine.id.slice(0, 160),
          session_id: quarantine.session_id.slice(0, 160),
        })
      }
      if (hasMcpActiveBinding(activeWorkspace, binding)) {
        throw new McpError('MCP_AGENT_BUSY', '该 Buda Agent 正在生成另一章正文')
      }
      addMcpActiveBinding(activeWorkspace, binding)
      const closedServerId = binding.serverId
      const closedKeyId = binding.keyId
      const closedAgentId = binding.agentId
      const publicBinding = Object.freeze({
        serverId: closedServerId,
        keyId: closedKeyId,
        agentId: closedAgentId,
      })
      let operationTail: Promise<void> = Promise.resolve()
      let releaseRequested = false
      let releasePromise: Promise<void> | undefined
      let releaseBlocked = false
      let durableFence = false
      let fenceId = ''
      const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
        if (releaseRequested) {
          return Promise.reject(new McpError('MCP_RUNTIME_ERROR', 'MCP Agent lease 已开始释放'))
        }
        const result = operationTail.then(operation)
        operationTail = result.then(() => {}, () => {})
        return result
      }
      const persist = async (input: {
        requestId: string
        sessionId: string
        reason: McpAgentQuarantineInput['reason']
      }) => {
        const record = await this.store.upsert(activeWorkspace, {
          serverId: closedServerId,
          keyId: closedKeyId,
          agentId: closedAgentId,
          requestId: input.requestId,
          sessionId: input.sessionId,
          reason: input.reason,
        })
        durableFence = true
        fenceId = record.id
      }
      return {
        tupleKey: key,
        binding: publicBinding,
        stageSessionFence: input => enqueue(async () => {
          await persist({
            requestId: input.requestId,
            sessionId: input.sessionId,
            reason: 'remote_cancel_unknown',
          })
        }),
        quarantine: input => enqueue(async () => {
          try {
            await persist({
              requestId: input.requestId,
              sessionId: input.sessionId,
              reason: input.reason,
            })
          } catch (error) {
            if (!durableFence) releaseBlocked = true
            throw error
          }
        }),
        clearSessionFence: () => enqueue(async () => {
          if (!fenceId) return
          const cleared = await this.store.clear(activeWorkspace, fenceId)
          if (!cleared) throw new McpError('MCP_STORE_IO_FAILED', 'MCP Agent Session fence 清除失败')
          durableFence = false
          fenceId = ''
        }),
        release: () => {
          if (releasePromise) return releasePromise
          releaseRequested = true
          releasePromise = (async () => {
            await operationTail
            if (releaseBlocked) return
            await withMcpWorkspaceMutation(activeWorkspace, async () => {
              deleteMcpActiveBinding(activeWorkspace, binding)
            })
          })()
          return releasePromise
        },
      }
    })
  }

  async isActive(activeWorkspaceInput: string, input: McpAgentLeaseBinding) {
    const activeWorkspace = canonicalFilesystemIdentity(activeWorkspaceInput)
    const binding = normalizedBinding(input)
    return withMcpWorkspaceMutation(activeWorkspace, async () => hasMcpActiveBinding(activeWorkspace, binding))
  }

  list(activeWorkspace: string) {
    return this.store.read(canonicalFilesystemIdentity(activeWorkspace))
  }

  clear(
    activeWorkspaceInput: string,
    quarantineId: string,
    expected?: McpAgentQuarantineRecord,
  ) {
    const activeWorkspace = canonicalFilesystemIdentity(activeWorkspaceInput)
    return withMcpWorkspaceMutation(activeWorkspace, async () => {
      const id = typeof quarantineId === 'string' ? quarantineId.trim() : ''
      if (!id) return false
      const record = (await this.store.read(activeWorkspace)).find(item => item.id === id)
      if (!record) return false
      if (expected && (
        record.id !== expected.id
        || record.workspace_key !== expected.workspace_key
        || record.server_id !== expected.server_id
        || record.key_id !== expected.key_id
        || record.agent_id !== expected.agent_id
        || record.request_id !== expected.request_id
        || record.session_id !== expected.session_id
        || record.reason !== expected.reason
        || record.created_at !== expected.created_at
      )) return false
      const binding = {
        serverId: record.server_id,
        keyId: record.key_id,
        agentId: record.agent_id,
      }
      if (hasMcpActiveBinding(activeWorkspace, binding)) {
        throw new McpError('MCP_AGENT_BUSY', '该 Buda Agent 正在生成另一章正文')
      }
      return this.store.clear(activeWorkspace, record.id)
    })
  }
}
