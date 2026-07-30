export type McpTransport = 'streamable_http' | 'stdio'
export type McpAuthType = 'bearer' | 'none'

export type McpServerRecord = {
  id: string
  display_name: string
  transport: McpTransport
  url: string
  auth_type: McpAuthType
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

export type McpKeyRecord = {
  id: number
  mcp_server_id: string
  key: string
  description: string
  is_active: boolean
  priority: number
  success_count: number
  failure_count: number
  last_checked?: string
  last_used?: string
  avg_latency?: number
}

export type PublicMcpKeyRecord = Omit<McpKeyRecord, 'key'> & {
  masked_key: string
  has_key: boolean
}

export type McpToolDescriptor = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  annotations?: Record<string, unknown>
}

export type McpToolResult = {
  content: unknown[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
  _meta?: Record<string, unknown>
}

export type McpClientState = 'Connecting' | 'Ready' | 'Closed'

export type McpAgentSummary = {
  id: string
  name: string
  description?: string
  status?: string
  raw?: Record<string, unknown>
}

export type McpDiagnostics = {
  state: McpClientState
  server_id: string
  key_id: number
  server_info?: Record<string, unknown>
  capabilities?: Record<string, unknown>
  instructions?: string
  tools: McpToolDescriptor[]
  adapter_id: string
  adapter_ready?: boolean
  recent_error?: { code: string; message: string }
}
