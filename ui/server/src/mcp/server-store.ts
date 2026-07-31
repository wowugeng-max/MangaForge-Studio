import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import { readJsonArrayFailClosed, writeJsonArrayAtomic } from './atomic-json-store'
import type { McpServerRecord, PublicMcpServerRecord } from './types'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'
import { assertMcpIdentityMutationAllowed } from './identity-mutation-fence'

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

export function toPublicMcpServer(record: McpServerRecord): PublicMcpServerRecord {
  const { custom_headers, ...safe } = record
  return {
    ...safe,
    custom_headers: Object.keys(custom_headers)
      .sort((left, right) => left.localeCompare(right))
      .map(name => ({ name, configured: Boolean(custom_headers[name]) })),
  }
}

export function mergeMcpCustomHeaders(
  previous: Record<string, string>,
  replacements: unknown,
  removals: unknown,
) {
  const next = { ...previous }
  const deleteHeaderIdentity = (identity: string) => {
    for (const name of Object.keys(next)) {
      if (name.trim().toLowerCase() === identity) delete next[name]
    }
  }
  for (const rawName of Array.isArray(removals) ? removals : []) {
    const identity = String(rawName).trim().toLowerCase()
    if (identity) deleteHeaderIdentity(identity)
  }
  if (replacements && typeof replacements === 'object' && !Array.isArray(replacements)) {
    for (const [rawName, rawValue] of Object.entries(replacements)) {
      const name = rawName.trim()
      const value = String(rawValue ?? '').trim()
      if (name && value) {
        deleteHeaderIdentity(name.toLowerCase())
        next[name] = value
      }
    }
  }
  return next
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
  const parsed = await readJsonArrayFailClosed(getMcpServersPath(activeWorkspace))
  return parsed.map(item => normalizeMcpServer((item || {}) as any)).filter(item => item.id)
}

async function writeMcpServersUnlocked(activeWorkspace: string, servers: McpServerRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpServersPath(activeWorkspace), servers.map(item => normalizeMcpServer(item)))
}

function sortedRecordEntries(value: Record<string, string>) {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
}

function serverIdentityChanged(previous: McpServerRecord, next: McpServerRecord) {
  return previous.transport !== next.transport
    || previous.url !== next.url
    || previous.auth_type !== next.auth_type
    || previous.adapter_id !== next.adapter_id
    || previous.is_active !== next.is_active
    || JSON.stringify(previous.enabled_tools) !== JSON.stringify(next.enabled_tools)
    || JSON.stringify(sortedRecordEntries(previous.custom_headers))
      !== JSON.stringify(sortedRecordEntries(next.custom_headers))
}

async function assertServerIdentityMutationsAllowed(
  activeWorkspace: string,
  previous: McpServerRecord[],
  next: McpServerRecord[],
) {
  const nextById = new Map(next.map(item => [item.id, item]))
  const serverIds = previous
    .filter(item => !nextById.has(item.id) || serverIdentityChanged(item, nextById.get(item.id)!))
    .map(item => item.id)
  await assertMcpIdentityMutationAllowed(activeWorkspace, { serverIds })
}

export function writeMcpServers(activeWorkspace: string, servers: McpServerRecord[]) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const previous = await readMcpServers(activeWorkspace)
    const next = servers.map(normalizeMcpServer)
    await assertServerIdentityMutationsAllowed(activeWorkspace, previous, next)
    await writeMcpServersUnlocked(activeWorkspace, next)
  })
}

export function upsertMcpServer(activeWorkspace: string, input: Partial<McpServerRecord> & Record<string, unknown>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const server = normalizeMcpServer(input)
    const servers = await readMcpServers(activeWorkspace)
    const index = servers.findIndex(item => item.id === server.id)
    if (index >= 0) {
      await assertServerIdentityMutationsAllowed(activeWorkspace, [servers[index]!], [server])
      servers[index] = server
    }
    else servers.push(server)
    await writeMcpServersUnlocked(activeWorkspace, servers)
    return server
  })
}

export function deleteMcpServer(activeWorkspace: string, id: string) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const servers = await readMcpServers(activeWorkspace)
    const next = servers.filter(item => item.id !== id)
    await assertServerIdentityMutationsAllowed(activeWorkspace, servers, next)
    await writeMcpServersUnlocked(activeWorkspace, next)
    return next.length !== servers.length
  })
}
