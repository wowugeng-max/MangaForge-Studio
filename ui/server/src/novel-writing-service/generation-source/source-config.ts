import { McpError } from '../../mcp/errors'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { readMcpServers } from '../../mcp/server-store'
import { hasMcpAdapter } from '../../mcp/adapters/registry'
import { listNovelProjects } from '../../novel'

export type ModelProseGenerationSourceConfig = {
  version: 'prose_generation_source_v1'
  type: 'model'
}

export type McpProjectBinding = {
  server_id: string
  key_id: number
  adapter_id: string
  agent_id: string
}

export type McpProseGenerationSourceConfig = {
  version: 'prose_generation_source_v1'
  type: 'mcp'
  mcp: McpProjectBinding
}

export type ProseGenerationSourceConfig = ModelProseGenerationSourceConfig | McpProseGenerationSourceConfig

export const MODEL_PROSE_GENERATION_SOURCE: ModelProseGenerationSourceConfig = Object.freeze({
  version: 'prose_generation_source_v1',
  type: 'model',
})

export function normalizeMcpProjectBinding(value: any): McpProjectBinding {
  const binding = {
    server_id: String(value?.server_id ?? value?.serverId ?? '').trim(),
    key_id: Number(value?.key_id ?? value?.keyId ?? 0),
    adapter_id: String(value?.adapter_id ?? value?.adapterId ?? '').trim(),
    agent_id: String(value?.agent_id ?? value?.agentId ?? '').trim(),
  }
  const missing = Object.entries(binding)
    .filter(([, item]) => !item)
    .map(([key]) => key)
  if (missing.length) {
    throw new McpError('MCP_BINDING_INVALID', `MCP 项目绑定不完整：缺少 ${missing.join(', ')}`, {
      missing_fields: missing,
    })
  }
  if (!Number.isInteger(binding.key_id) || binding.key_id <= 0) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP key_id 必须是正整数')
  }
  return binding
}

export function normalizeProseGenerationSource(value: any): ProseGenerationSourceConfig {
  const type = String(value?.type || 'model').toLowerCase()
  if (type === 'model') return { ...MODEL_PROSE_GENERATION_SOURCE }
  if (type !== 'mcp') throw new McpError('MCP_BINDING_INVALID', `不支持的正文生成来源：${type}`)
  return {
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: normalizeMcpProjectBinding(value?.mcp),
  }
}

export function resolveProseGenerationSource(project: any): ProseGenerationSourceConfig {
  const stored = project?.reference_config?.prose_generation_source
  if (!stored) return { ...MODEL_PROSE_GENERATION_SOURCE }
  return normalizeProseGenerationSource(stored)
}

export async function validateMcpCredentialSelection(activeWorkspace: string, input: {
  serverId: string
  keyId: number
  adapterId?: string
}) {
  const [servers, keys] = await Promise.all([readMcpServers(activeWorkspace), readMcpKeys(activeWorkspace)])
  const server = servers.find(item => item.id === input.serverId)
  if (!server) throw new McpError('MCP_BINDING_INVALID', `MCP Server 不存在：${input.serverId}`)
  if (!server.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Server 已禁用：${server.id}`)
  if (server.transport !== 'streamable_http') throw new McpError('MCP_BINDING_INVALID', '首期正文生成只支持 Streamable HTTP')
  const key = keys.find(item => item.id === input.keyId)
  if (!key) throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在：${input.keyId}`)
  if (!key.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Key 已禁用：${input.keyId}`)
  if (key.mcp_server_id !== server.id) throw new McpError('MCP_BINDING_INVALID', 'MCP Key 不属于所选 Server')
  if (input.adapterId && input.adapterId !== server.adapter_id) throw new McpError('MCP_BINDING_INVALID', '项目 Adapter 与 Server Adapter 不一致')
  if (!hasMcpAdapter(server.adapter_id)) throw new McpError('MCP_BINDING_INVALID', `本地未注册 Adapter：${server.adapter_id}`)
  return { server, key }
}

export async function validateMcpProjectBinding(
  activeWorkspace: string,
  project: any,
  input: McpProjectBinding,
  options: {
    runtime: Pick<McpRuntime, 'listAgents'>
    listProjects?: typeof listNovelProjects
    signal?: AbortSignal
  },
) {
  const binding = normalizeMcpProjectBinding(input)
  const { server, key } = await validateMcpCredentialSelection(activeWorkspace, {
    serverId: binding.server_id,
    keyId: binding.key_id,
    adapterId: binding.adapter_id,
  })
  const agents = await options.runtime.listAgents(binding.key_id, options.signal)
  const agent = agents.find(item => String(item.id) === binding.agent_id)
  if (!agent) throw new McpError('MCP_BINDING_INVALID', `所选 Agent 不存在或当前账号不可见：${binding.agent_id}`)
  const projects = await (options.listProjects || listNovelProjects)(activeWorkspace)
  const conflict = projects.find(item => {
    if (Number(item.id) === Number(project?.id)) return false
    const source = item?.reference_config?.prose_generation_source
    const other = source?.type === 'mcp' ? source.mcp : null
    return other
      && String(other.server_id) === binding.server_id
      && Number(other.key_id) === binding.key_id
      && String(other.agent_id) === binding.agent_id
  })
  if (conflict) {
    throw new McpError('MCP_BINDING_INVALID', `该 Agent 已绑定项目《${conflict.title || conflict.id}》`, {
      reason: 'binding_conflict',
      project_id: conflict.id,
      project_title: conflict.title,
    })
  }
  return { binding, server, key, agent }
}
