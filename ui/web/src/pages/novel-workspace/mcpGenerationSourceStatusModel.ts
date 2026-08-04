import type {
  ChapterGenerationSourceState,
  McpAgentSummary,
  McpPublicKey,
  McpServerRecord,
} from '../../api/mcp'

type McpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

export type McpSourceStatus = {
  kind: 'mcp'
  label: string
  detail: string
  available: boolean
  active: boolean
}

export type McpSourceStatusMetadata = {
  servers: McpServerRecord[]
  keys: McpPublicKey[]
  agents: McpAgentSummary[]
  loadFailed: boolean
}

export async function loadMcpSourceStatusMetadata(input: {
  binding: McpBinding
  isActive: () => boolean
  loadServers: () => Promise<McpServerRecord[]>
  loadKeys: () => Promise<McpPublicKey[]>
  loadAgents: (binding: McpBinding) => Promise<McpAgentSummary[]>
}): Promise<McpSourceStatusMetadata | null> {
  const [serverResult, keyResult, agentResult] = await Promise.allSettled([
    input.loadServers(),
    input.loadKeys(),
    input.loadAgents(input.binding),
  ])
  if (!input.isActive()) return null
  return {
    servers: serverResult.status === 'fulfilled' ? serverResult.value : [],
    keys: keyResult.status === 'fulfilled' ? keyResult.value : [],
    agents: agentResult.status === 'fulfilled' ? agentResult.value : [],
    loadFailed: [serverResult, keyResult, agentResult].some(result => result.status === 'rejected'),
  }
}

export function buildMcpSourceStatus(input: {
  binding: McpBinding
  active: boolean
  servers?: McpServerRecord[]
  keys?: McpPublicKey[]
  agents?: McpAgentSummary[]
  loadFailed?: boolean
}): McpSourceStatus {
  const binding = input.binding
  const server = (input.servers || []).find(item => item.id === binding.server_id)
  const key = (input.keys || []).find(item => (
    item.id === binding.key_id && item.mcp_server_id === binding.server_id
  ))
  const agent = (input.agents || []).find(item => item.id === binding.agent_id)
  const serverName = String(server?.display_name || binding.server_id)
  const sourceName = /\bmcp$/i.test(serverName) ? serverName : `${serverName} MCP`
  const agentName = String(agent?.name || binding.agent_id)
  const modelName = String(binding.model || '').trim() || 'Auto'
  const accountName = [
    String(key?.description || '').trim(),
    String(key?.masked_key || '').trim(),
  ].filter(Boolean).join(' · ') || `#${binding.key_id}`
  const stateLabel = input.active ? '已启用' : '已停用'
  const unavailable = Boolean(input.loadFailed)
  return {
    kind: 'mcp',
    label: `${sourceName} · ${agentName} · ${modelName} · ${stateLabel}`,
    detail: [
      `章节来源：${sourceName}`,
      `账号：${accountName}`,
      `Adapter：${binding.adapter_id}`,
      `Agent：${agentName}`,
      `模型：${modelName}`,
      stateLabel,
      ...(unavailable ? ['状态信息暂不可用'] : []),
    ].join('；'),
    available: !unavailable,
    active: input.active,
  }
}
