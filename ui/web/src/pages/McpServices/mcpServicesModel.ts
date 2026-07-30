import type { McpPublicKey } from '../../api/mcp'

export function defaultBudaServerForm() {
  return {
    id: 'buda',
    display_name: 'Buda',
    transport: 'streamable_http',
    url: 'https://buda.im/api/mcp',
    auth_type: 'bearer',
    adapter_id: 'buda',
    is_active: true,
    startup_timeout_ms: 30_000,
    tool_timeout_ms: 60_000,
    generation_timeout_ms: 600_000,
    poll_initial_ms: 1_000,
    poll_max_ms: 10_000,
    enabled_tools: [],
    custom_headers: {},
    enabled_tools_text: '',
    custom_headers_list: [] as Array<{ key: string; value: string }>,
  }
}

export function buildMcpKeyPayload(values: Record<string, any>, existing?: McpPublicKey) {
  const payload: Record<string, any> = {
    mcp_server_id: String(values.mcp_server_id || ''),
    description: String(values.description || ''),
    is_active: values.is_active !== false,
    priority: Number(values.priority || 0),
  }
  const secret = String(values.key || '').trim()
  if (secret || !existing) payload.key = secret
  return payload
}

export function buildMcpServerPayload(values: Record<string, any>) {
  const { custom_headers_list, enabled_tools_text, ...record } = values
  const customHeaders = Object.fromEntries((custom_headers_list || [])
    .map((item: any) => [String(item?.key || '').trim(), String(item?.value || '').trim()])
    .filter(([key, value]: [string, string]) => key && value))
  const enabledTools = String(enabled_tools_text || '')
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
  return {
    ...record,
    enabled_tools: enabledTools,
    custom_headers: customHeaders,
  }
}

export function summarizeMcpDiagnostics(value: any = {}) {
  return {
    state: String(value.state || 'Unknown'),
    adapter_id: String(value.adapter_id || ''),
    adapter_ready: value.adapter_ready === true,
    agent_count: Number(value.agent_count || 0),
    tool_count: Array.isArray(value.tools) ? value.tools.length : Number(value.tool_count || 0),
  }
}
