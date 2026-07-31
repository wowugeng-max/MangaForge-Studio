import { canonicalFilesystemIdentity } from '../workspace-identity'
import { McpError } from './errors'
import { readMcpAgentQuarantines } from './quarantine-store'
import { assertMcpWorkspaceMutationHeld } from './workspace-coordinator'

export type McpActiveBinding = {
  serverId: string
  keyId: number
  agentId: string
}

type ActiveBindingRecord = McpActiveBinding & { workspaceKey: string }

const activeBindings = new Map<string, ActiveBindingRecord>()

function bindingKey(activeWorkspace: string, binding: McpActiveBinding) {
  return JSON.stringify([
    canonicalFilesystemIdentity(activeWorkspace),
    binding.serverId,
    binding.keyId,
    binding.agentId,
  ])
}

export function mcpActiveBindingKey(activeWorkspace: string, binding: McpActiveBinding) {
  return bindingKey(activeWorkspace, binding)
}

export function hasMcpActiveBinding(activeWorkspace: string, binding: McpActiveBinding) {
  return activeBindings.has(bindingKey(activeWorkspace, binding))
}

export function addMcpActiveBinding(activeWorkspace: string, binding: McpActiveBinding) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  const workspaceKey = canonicalFilesystemIdentity(activeWorkspace)
  activeBindings.set(bindingKey(workspaceKey, binding), { workspaceKey, ...binding })
}

export function deleteMcpActiveBinding(activeWorkspace: string, binding: McpActiveBinding) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  activeBindings.delete(bindingKey(activeWorkspace, binding))
}

export async function assertMcpIdentityMutationAllowed(
  activeWorkspace: string,
  target: { serverIds?: readonly string[]; keyIds?: readonly number[] },
) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  const workspaceKey = canonicalFilesystemIdentity(activeWorkspace)
  const serverIds = new Set<string>()
  const keyIds = new Set<number>()
  if (target.serverIds) {
    for (let index = 0; index < target.serverIds.length; index += 1) {
      serverIds.add(target.serverIds[index]!)
    }
  }
  if (target.keyIds) {
    for (let index = 0; index < target.keyIds.length; index += 1) keyIds.add(target.keyIds[index]!)
  }
  if (serverIds.size === 0 && keyIds.size === 0) return

  let active: ActiveBindingRecord | undefined
  activeBindings.forEach(item => {
    if (!active && item.workspaceKey === workspaceKey
      && (serverIds.has(item.serverId) || keyIds.has(item.keyId))) active = item
  })
  if (active) {
    throw new McpError('MCP_AGENT_BUSY', '该 MCP 凭据正在生成正文，暂不能修改连接身份')
  }

  const quarantines = await readMcpAgentQuarantines(workspaceKey)
  let quarantine
  for (let index = 0; index < quarantines.length; index += 1) {
    const item = quarantines[index]!
    if (serverIds.has(item.server_id) || keyIds.has(item.key_id)) {
      quarantine = item
      break
    }
  }
  if (quarantine) {
    throw new McpError('MCP_AGENT_QUARANTINED', '该 MCP 凭据存在未确认终止的远端 Session，暂不能修改连接身份', {
      quarantine_id: quarantine.id.slice(0, 160),
      session_id: quarantine.session_id.slice(0, 160),
    })
  }
}
