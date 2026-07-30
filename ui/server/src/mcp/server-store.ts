import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import type { McpServerRecord } from './types'

export const BUDA_MCP_SERVER_TEMPLATE: McpServerRecord = Object.freeze({
  id: 'buda',
  display_name: 'Buda',
  transport: 'streamable_http',
  url: 'https://buda.im/api/mcp',
  auth_type: 'bearer',
  adapter_id: 'buda',
  is_active: true,
  startup_timeout_ms: 15_000,
  tool_timeout_ms: 60_000,
  generation_timeout_ms: 600_000,
  poll_initial_ms: 1_000,
  poll_max_ms: 5_000,
  enabled_tools: [],
  custom_headers: {},
})

export function getMcpServersPath(activeWorkspace: string) {
  return join(activeWorkspace, 'mcp-servers.json')
}

function finitePositive(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback
}

function objectStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]))
}

export function normalizeMcpServer(raw: Partial<McpServerRecord> & Record<string, unknown>): McpServerRecord {
  const id = String(raw.id || '').trim()
  const defaults = id === 'buda' ? BUDA_MCP_SERVER_TEMPLATE : {
    ...BUDA_MCP_SERVER_TEMPLATE,
    id,
    display_name: id,
    url: '',
    adapter_id: '',
  }
  const transport = String(raw.transport ?? defaults.transport)
  const authType = String(raw.auth_type ?? (raw as any).authType ?? defaults.auth_type).toLowerCase()
  return {
    id,
    display_name: String(raw.display_name ?? (raw as any).displayName ?? defaults.display_name),
    transport: transport === 'stdio' ? 'stdio' : 'streamable_http',
    url: String(raw.url ?? defaults.url).trim(),
    auth_type: authType === 'none' ? 'none' : 'bearer',
    adapter_id: String(raw.adapter_id ?? (raw as any).adapterId ?? defaults.adapter_id).trim(),
    is_active: coerceBoolean(raw.is_active ?? (raw as any).isActive, defaults.is_active),
    startup_timeout_ms: finitePositive(raw.startup_timeout_ms ?? (raw as any).startupTimeoutMs, defaults.startup_timeout_ms),
    tool_timeout_ms: finitePositive(raw.tool_timeout_ms ?? (raw as any).toolTimeoutMs, defaults.tool_timeout_ms),
    generation_timeout_ms: finitePositive(raw.generation_timeout_ms ?? (raw as any).generationTimeoutMs, defaults.generation_timeout_ms),
    poll_initial_ms: finitePositive(raw.poll_initial_ms ?? (raw as any).pollInitialMs, defaults.poll_initial_ms),
    poll_max_ms: finitePositive(raw.poll_max_ms ?? (raw as any).pollMaxMs, defaults.poll_max_ms),
    enabled_tools: Array.isArray(raw.enabled_tools) ? raw.enabled_tools.map(String).filter(Boolean) : defaults.enabled_tools,
    custom_headers: objectStrings(raw.custom_headers ?? (raw as any).customHeaders ?? defaults.custom_headers),
  }
}

export async function readMcpServers(activeWorkspace: string): Promise<McpServerRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(getMcpServersPath(activeWorkspace), 'utf8'))
    return Array.isArray(parsed) ? parsed.map(item => normalizeMcpServer(item || {})).filter(item => item.id) : []
  } catch {
    return []
  }
}

export async function writeMcpServers(activeWorkspace: string, servers: McpServerRecord[]) {
  await writeFile(getMcpServersPath(activeWorkspace), `${JSON.stringify(servers.map(item => normalizeMcpServer(item)), null, 2)}\n`, 'utf8')
}

export async function upsertMcpServer(activeWorkspace: string, input: Partial<McpServerRecord> & Record<string, unknown>) {
  const server = normalizeMcpServer(input)
  const servers = await readMcpServers(activeWorkspace)
  const index = servers.findIndex(item => item.id === server.id)
  if (index >= 0) servers[index] = server
  else servers.push(server)
  await writeMcpServers(activeWorkspace, servers)
  return server
}

export async function deleteMcpServer(activeWorkspace: string, id: string) {
  const servers = await readMcpServers(activeWorkspace)
  const next = servers.filter(item => item.id !== id)
  await writeMcpServers(activeWorkspace, next)
  return next.length !== servers.length
}
