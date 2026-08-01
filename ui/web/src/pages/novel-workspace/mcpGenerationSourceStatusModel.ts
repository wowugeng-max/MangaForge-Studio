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
