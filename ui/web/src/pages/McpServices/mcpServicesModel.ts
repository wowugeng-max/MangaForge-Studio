import type { McpPublicKey, McpServerRecord } from '../../api/mcp'

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
    custom_headers_list: [] as Array<{ name: string; value: string; configured?: boolean }>,
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

export function buildMcpServerPayload(values: Record<string, any>, existing?: McpServerRecord) {
  const { custom_headers_list, enabled_tools_text, ...record } = values
  const rows = Array.isArray(custom_headers_list) ? custom_headers_list : []
  const customHeaders = Object.fromEntries(rows
    .map((item: any) => [String(item?.name || '').trim(), String(item?.value || '').trim()])
    .filter(([name, value]: [string, string]) => name && value))
  const currentNames = new Set(rows.map((item: any) => String(item?.name || '').trim()).filter(Boolean))
  const removeCustomHeaders = (existing?.custom_headers || [])
    .map(item => item.name)
    .filter(name => !currentNames.has(name))
  return {
    ...record,
    enabled_tools: String(enabled_tools_text || '').split(/\r?\n|,/).map(item => item.trim()).filter(Boolean),
    custom_headers: customHeaders,
    remove_custom_headers: removeCustomHeaders,
  }
}

export function formatMcpServiceFailure(payload: any, fallback: string) {
  const code = String(payload?.error_code || '')
  if (code === 'MCP_STORE_CORRUPT') {
    return 'MCP 配置文件已损坏；系统没有覆盖原文件。请先备份并修复该文件。'
  }
  if (code === 'MCP_STORE_IO_FAILED') {
    return 'MCP 配置文件无法读写；请检查工作区权限和磁盘状态。'
  }
  if (code === 'MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL') {
    return '该 Server 已有凭据，不能直接更换来源站点；请新建 Server 或先解除项目绑定并重配凭据。'
  }
  if (code === 'MCP_REFERENCED_RECORD_CONFLICT') {
    return '该配置仍被小说项目引用；请先在项目正文来源中解除绑定。'
  }
  return String(payload?.error || payload?.detail || fallback)
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
