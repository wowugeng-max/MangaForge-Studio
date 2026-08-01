import type {
  McpAgentSummary,
  McpPublicKey,
  McpServerRecord,
  ProseGenerationSourceConfig,
} from '../../api/mcp'

export type McpSourceStatus = {
  kind: 'model' | 'mcp'
  label: string
  detail: string
  available: boolean
}

export type McpSourceStatusLoadSnapshot = {
  source: ProseGenerationSourceConfig
  servers: McpServerRecord[]
  keys: McpPublicKey[]
  agents: McpAgentSummary[]
  loadFailed: boolean
}

export async function loadMcpSourceStatusSnapshot(input: {
  projectId: number
  isActive: () => boolean
  onSource: (source: ProseGenerationSourceConfig) => void
  loadSource: (projectId: number) => Promise<ProseGenerationSourceConfig>
  loadServers: () => Promise<McpServerRecord[]>
  loadKeys: () => Promise<McpPublicKey[]>
  loadAgents: (source: ProseGenerationSourceConfig) => Promise<McpAgentSummary[]>
}): Promise<McpSourceStatusLoadSnapshot | null> {
  const source = await input.loadSource(input.projectId)
  if (!input.isActive()) return null
  input.onSource(source)

  const [serverResult, keyResult, agentResult] = await Promise.allSettled([
    input.loadServers(),
    input.loadKeys(),
    source.type === 'mcp' ? input.loadAgents(source) : Promise.resolve([]),
  ])
  if (!input.isActive()) return null

  return {
    source,
    servers: serverResult.status === 'fulfilled' ? serverResult.value : [],
    keys: keyResult.status === 'fulfilled' ? keyResult.value : [],
    agents: agentResult.status === 'fulfilled' ? agentResult.value : [],
    loadFailed: [serverResult, keyResult, agentResult].some(result => result.status === 'rejected'),
  }
}

export function buildMcpSourceStatus(input: {
  source?: ProseGenerationSourceConfig | null
  servers?: McpServerRecord[]
  keys?: McpPublicKey[]
  agents?: McpAgentSummary[]
  loadFailed?: boolean
}): McpSourceStatus {
  const source = input.source
  if (!source || source.type !== 'mcp') {
    return {
      kind: 'model',
      label: '模型 API',
      detail: '正文来源：模型 API',
      available: true,
    }
  }

  const binding = source.mcp
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
  const unavailable = Boolean(input.loadFailed)

  return {
    kind: 'mcp',
    label: `${sourceName} · ${agentName} · ${modelName}`,
    detail: [
      `正文来源：${sourceName}`,
      `账号：${accountName}`,
      `Agent：${agentName}`,
      `模型：${modelName}`,
      ...(unavailable ? ['状态信息暂不可用'] : []),
    ].join('；'),
    available: !unavailable,
  }
}
