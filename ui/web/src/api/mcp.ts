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
  custom_headers: Array<{ name: string; configured: boolean }>
}

export type McpServerPayload = Partial<Omit<McpServerRecord, 'custom_headers'>> & {
  custom_headers?: Record<string, string>
  remove_custom_headers?: string[]
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

export type McpAgentQuarantine = {
  id: string
  server_id: string
  key_id: number
  agent_id: string
  session_id: string
  reason: 'send_unknown' | 'remote_cancel_unknown'
  created_at: string
}

export type McpQuarantineReconciliation = {
  quarantine: McpAgentQuarantine
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_input' | 'pending' | 'in_progress' | 'unknown'
  terminal: boolean
  cleared: boolean
  outcome: 'nonterminal' | 'cleared' | 'conflict'
}

export type McpKeyPayload = {
  mcp_server_id?: string
  key?: string
  description?: string
  is_active?: boolean
  priority?: number
}

export type ProseGenerationSourceConfig =
  | { version: 'prose_generation_source_v1'; type: 'model' }
  | { version: 'prose_generation_source_v1'; type: 'mcp'; mcp: { server_id: string; key_id: number; adapter_id: string; agent_id: string; model?: string } }

export type ChapterGenerationSourceState = {
  version: 'chapter_generation_source_v1'
  active: 'model' | 'mcp'
  model: { model_id?: number }
  mcp?: {
    server_id: string
    key_id: number
    adapter_id: string
    agent_id: string
    model: string
  }
}

export type ChapterGenerationSourceView = {
  ok: true
  source: ChapterGenerationSourceState
  fingerprint: string
  locked: boolean
  display: {
    active: 'model' | 'mcp'
    model_id: number | null
    mcp: NonNullable<ChapterGenerationSourceState['mcp']> | null
  }
}

type ChapterMcpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

export const chapterSourceApi = {
  get: async (projectId: number) => (
    await apiClient.get<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source`)
  ).data,
  activate: async (projectId: number, active: 'model' | 'mcp') => (
    await apiClient.post<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/activate`, { active })
  ).data,
  saveModel: async (projectId: number, modelId: number) => (
    await apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/model`, { model_id: modelId })
  ).data,
  testMcp: async (projectId: number, mcp: ChapterMcpBinding) => (
    await apiClient.post<{ ok: true; validation: Record<string, unknown> }>(`/novel/projects/${projectId}/chapter-generation-source/mcp/test`, { mcp })
  ).data,
  saveMcp: async (projectId: number, mcp: ChapterMcpBinding) => (
    await apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/mcp`, { mcp })
  ).data,
}

export const mcpApi = {
  listQuarantines: () => apiClient.get<McpAgentQuarantine[]>('/mcp/quarantines'),
  reconcileQuarantine: (id: string) => apiClient.post<McpQuarantineReconciliation>(`/mcp/quarantines/${encodeURIComponent(id)}/reconcile`),
  forceClearQuarantine: (id: string) => apiClient.delete(`/mcp/quarantines/${encodeURIComponent(id)}`, { data: { acknowledge_remote_work_may_continue: true } }),
  listServers: () => apiClient.get<McpServerRecord[]>('/mcp/servers'),
  createServer: (data: McpServerPayload) => apiClient.post<{ ok: true; server: McpServerRecord }>('/mcp/servers', data),
  updateServer: (id: string, data: McpServerPayload) => apiClient.put<{ ok: true; server: McpServerRecord }>(`/mcp/servers/${encodeURIComponent(id)}`, data),
  deleteServer: (id: string) => apiClient.delete(`/mcp/servers/${encodeURIComponent(id)}`),
  listKeys: () => apiClient.get<McpPublicKey[]>('/mcp/keys'),
  createKey: (data: McpKeyPayload) => apiClient.post<{ ok: true; key: McpPublicKey }>('/mcp/keys', data),
  updateKey: (id: number, data: McpKeyPayload) => apiClient.put<{ ok: true; key: McpPublicKey }>(`/mcp/keys/${id}`, data),
  deleteKey: (id: number) => apiClient.delete(`/mcp/keys/${id}`),
  testKey: (id: number) => apiClient.post<{ ok: true; latency_ms: number; agent_count: number }>(`/mcp/keys/${id}/test`),
  listAgents: (id: number) => apiClient.get<{ agents: McpAgentSummary[] }>(`/mcp/keys/${id}/agents`),
  createAgent: (id: number, data: { name: string; space_id?: string }) => apiClient.post<{ ok: true; agent: McpAgentSummary }>(`/mcp/keys/${id}/agents`, data),
  diagnostics: (serverId: string, keyId: number) => apiClient.get<Record<string, any>>(`/mcp/servers/${encodeURIComponent(serverId)}/diagnostics`, { params: { key_id: keyId } }),
  getProjectSource: (projectId: number) => apiClient.get<{ ok: true; source: ProseGenerationSourceConfig }>(`/novel/projects/${projectId}/prose-generation-source`),
  saveProjectSource: (projectId: number, source: ProseGenerationSourceConfig) => apiClient.put(`/novel/projects/${projectId}/prose-generation-source`, { source }),
  testProjectSource: (projectId: number, source: ProseGenerationSourceConfig) => apiClient.post(`/novel/projects/${projectId}/prose-generation-source/test`, { source }),
  listProjectAgents: (projectId: number, serverId: string, keyId: number) => apiClient.get<{ agents: McpAgentSummary[] }>(`/novel/projects/${projectId}/prose-generation-source/agents`, { params: { server_id: serverId, key_id: keyId } }),
  createProjectAgent: (projectId: number, data: { server_id: string; key_id: number; name: string; space_id?: string }) => apiClient.post<{ ok: true; agent: McpAgentSummary }>(`/novel/projects/${projectId}/prose-generation-source/agents`, data),
}
