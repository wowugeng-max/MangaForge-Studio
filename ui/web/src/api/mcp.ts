import apiClient from './client'

export type McpServerRecord = {
  id: string
  display_name: string
  transport: 'streamable_http' | 'stdio'
  url: string
  auth_type: 'bearer' | 'none'
  adapter_id: string
  is_active: boolean
  startup_timeout_ms: number
  tool_timeout_ms: number
  generation_timeout_ms: number
  poll_initial_ms: number
  poll_max_ms: number
  enabled_tools: string[]
  custom_headers: Record<string, string>
}

export type McpPublicKey = {
  id: number
  mcp_server_id: string
  description: string
  is_active: boolean
  priority: number
  success_count: number
  failure_count: number
  last_checked?: string
  last_used?: string
  avg_latency?: number
  masked_key: string
  has_key: boolean
  bound_projects?: Array<{ id: number; title?: string }>
}

export type McpAgentSummary = {
  id: string
  name: string
  description?: string
  status?: string
}

export type McpKeyPayload = {
  mcp_server_id?: string
  key?: string
  description?: string
  is_active?: boolean
  priority?: number
}

export const mcpApi = {
  listServers: () => apiClient.get<McpServerRecord[]>('/mcp/servers'),
  createServer: (data: Partial<McpServerRecord>) => apiClient.post<{ ok: true; server: McpServerRecord }>('/mcp/servers', data),
  updateServer: (id: string, data: Partial<McpServerRecord>) => apiClient.put<{ ok: true; server: McpServerRecord }>(`/mcp/servers/${encodeURIComponent(id)}`, data),
  deleteServer: (id: string) => apiClient.delete(`/mcp/servers/${encodeURIComponent(id)}`),
  listKeys: () => apiClient.get<McpPublicKey[]>('/mcp/keys'),
  createKey: (data: McpKeyPayload) => apiClient.post<{ ok: true; key: McpPublicKey }>('/mcp/keys', data),
  updateKey: (id: number, data: McpKeyPayload) => apiClient.put<{ ok: true; key: McpPublicKey }>(`/mcp/keys/${id}`, data),
  deleteKey: (id: number) => apiClient.delete(`/mcp/keys/${id}`),
  testKey: (id: number) => apiClient.post<{ ok: true; latency_ms: number; agent_count: number }>(`/mcp/keys/${id}/test`),
  listAgents: (id: number) => apiClient.get<{ agents: McpAgentSummary[] }>(`/mcp/keys/${id}/agents`),
  createAgent: (id: number, data: { name: string; space_id?: string }) => apiClient.post<{ ok: true; agent: McpAgentSummary }>(`/mcp/keys/${id}/agents`, data),
  diagnostics: (serverId: string, keyId: number) => apiClient.get<Record<string, any>>(`/mcp/servers/${encodeURIComponent(serverId)}/diagnostics`, { params: { key_id: keyId } }),
}
