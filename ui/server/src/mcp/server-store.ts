import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import { readJsonArrayFailClosed, writeJsonArrayAtomic } from './atomic-json-store'
import { McpError } from './errors'
import type { McpErrorCode } from './errors'
import type { McpServerRecord, PublicMcpServerRecord } from './types'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'
import { assertMcpIdentityMutationAllowed } from './identity-mutation-fence'
import { StrictJsonBudget } from './strict-json-budget'

// Config snapshots are intentionally bounded: enough for many accounts while keeping RMW predictable.
export const MCP_SERVER_STORE_MAX_BYTES = 1024 * 1024
export const MCP_SERVER_STORE_MAX_RECORDS = 1000
const REMOTE_ID_MAX_CHARS = 16_384
const DISPLAY_NAME_MAX_CHARS = 4096
const URL_MAX_CHARS = 8192
const TOOL_NAME_MAX_CHARS = 1024
const ENABLED_TOOL_MAX_COUNT = 1000
const HEADER_NAME_MAX_CHARS = 1024
const HEADER_VALUE_MAX_CHARS = 16_384
const HEADER_MAX_COUNT = 256
const TIMEOUT_MAX_MS = 2_147_483_647
const DURABLE_KEYS = [
  'adapter_id', 'auth_type', 'custom_headers', 'display_name', 'enabled_tools',
  'generation_timeout_ms', 'id', 'is_active', 'poll_initial_ms', 'poll_max_ms',
  'startup_timeout_ms', 'tool_timeout_ms', 'transport', 'url',
] as const

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

function serverStoreError(code: McpErrorCode): never {
  throw new McpError(code, code === 'MCP_STORE_CORRUPT'
    ? 'MCP Server 配置文件损坏'
    : 'MCP Server 配置超过存储限制')
}

function boundedPositiveInteger(value: unknown) {
  return typeof value === 'number'
    && Number.isInteger(value)
    && Number.isFinite(value)
    && value > 0
    && value <= TIMEOUT_MAX_MS
}

function ownPlainData(raw: unknown, code: McpErrorCode) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) serverStoreError(code)
  const prototype = Object.getPrototypeOf(raw)
  if (prototype !== Object.prototype && prototype !== null) serverStoreError(code)
  const descriptors = Object.getOwnPropertyDescriptors(raw)
  const keys = Reflect.ownKeys(descriptors)
  const data: Record<string, unknown> = Object.create(null)
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]
    if (typeof key !== 'string') serverStoreError(code)
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) serverStoreError(code)
    data[key] = descriptor.value
  }
  return data
}

function denseArrayValues(raw: unknown, maximum: number, code: McpErrorCode) {
  if (!Array.isArray(raw) || Object.getPrototypeOf(raw) !== Array.prototype) serverStoreError(code)
  const descriptors = Object.getOwnPropertyDescriptors(raw)
  const length = descriptors.length?.value
  const keys = Reflect.ownKeys(descriptors)
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || keys.length !== length + 1) {
    serverStoreError(code)
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] !== 'string') serverStoreError(code)
  }
  const values: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) serverStoreError(code)
    values[index] = descriptor.value
  }
  return values
}

function addServerScalarProperty(
  budget: StrictJsonBudget,
  name: string,
  value: string | number | boolean,
) {
  budget.addAscii(4)
  budget.addScalar(name)
  budget.addAscii(2)
  budget.addScalar(value)
  budget.addAscii(2)
}

function validateEnabledTools(
  raw: unknown,
  code: McpErrorCode,
  serialization: boolean,
  budget?: StrictJsonBudget,
): string[] {
  const tools = denseArrayValues(raw, ENABLED_TOOL_MAX_COUNT, code)
  const projection: string[] = []
  if (budget) {
    budget.addAscii(4)
    budget.addScalar('enabled_tools')
    budget.addAscii(2)
    budget.addAscii(tools.length === 0 ? 4 : 2)
  }
  for (let index = 0; index < tools.length; index += 1) {
    const tool = tools[index]
    if (typeof tool !== 'string' || !tool || tool.length > TOOL_NAME_MAX_CHARS) serverStoreError(code)
    projection[index] = tool
    if (budget) {
      budget.addAscii(6)
      budget.addScalar(tool)
      budget.addAscii(index + 1 < tools.length ? 2 : 1)
    }
  }
  if (budget && tools.length > 0) budget.addAscii(7)
  if (serialization) Object.setPrototypeOf(projection, null)
  Object.freeze(projection)
  return projection
}

function validateCustomHeaders(raw: unknown, code: McpErrorCode, budget?: StrictJsonBudget): Record<string, string> {
  const headers = ownPlainData(raw, code)
  const names = Object.keys(headers)
  const headerIdentities = new Set<string>()
  if (names.length > HEADER_MAX_COUNT) serverStoreError(code)
  const projection: Record<string, string> = Object.create(null)
  if (budget) {
    budget.addAscii(4)
    budget.addScalar('custom_headers')
    budget.addAscii(2)
    budget.addAscii(names.length === 0 ? 3 : 2)
  }
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]!
    const value = headers[name]
    const identity = name.trim().toLowerCase()
    if (!identity || name !== name.trim() || name.length > HEADER_NAME_MAX_CHARS
      || typeof value !== 'string' || value.length > HEADER_VALUE_MAX_CHARS
      || headerIdentities.has(identity)) serverStoreError(code)
    headerIdentities.add(identity)
    projection[name] = value
    if (budget) {
      budget.addAscii(6)
      budget.addScalar(name)
      budget.addAscii(2)
      budget.addScalar(value)
      budget.addAscii(index + 1 < names.length ? 2 : 1)
    }
  }
  if (budget && names.length > 0) budget.addAscii(6)
  Object.freeze(projection)
  return projection
}

function validateStoredMcpServer(
  raw: unknown,
  code: McpErrorCode,
  serialization: boolean,
  budget: StrictJsonBudget | undefined,
  index: number,
  length: number,
): McpServerRecord {
  const item = ownPlainData(raw, code)
  const keys = Object.keys(item)
  if (keys.length !== DURABLE_KEYS.length) serverStoreError(code)
  for (let keyIndex = 0; keyIndex < DURABLE_KEYS.length; keyIndex += 1) {
    if (!Object.hasOwn(item, DURABLE_KEYS[keyIndex]!)) serverStoreError(code)
  }
  if (typeof item.id !== 'string' || !item.id || item.id !== item.id.trim()
    || item.id.length > REMOTE_ID_MAX_CHARS
    || typeof item.display_name !== 'string' || item.display_name.length > DISPLAY_NAME_MAX_CHARS
    || (item.transport !== 'streamable_http' && item.transport !== 'stdio')
    || typeof item.url !== 'string' || item.url !== item.url.trim() || item.url.length > URL_MAX_CHARS
    || (item.auth_type !== 'bearer' && item.auth_type !== 'none')
    || typeof item.adapter_id !== 'string' || item.adapter_id !== item.adapter_id.trim()
    || item.adapter_id.length > REMOTE_ID_MAX_CHARS
    || typeof item.is_active !== 'boolean'
    || !boundedPositiveInteger(item.startup_timeout_ms)
    || !boundedPositiveInteger(item.tool_timeout_ms)
    || !boundedPositiveInteger(item.generation_timeout_ms)
    || !boundedPositiveInteger(item.poll_initial_ms)
    || !boundedPositiveInteger(item.poll_max_ms)
    || !item.custom_headers || typeof item.custom_headers !== 'object' || Array.isArray(item.custom_headers)) {
    serverStoreError(code)
  }
  if (budget) {
    budget.addAscii(4)
    addServerScalarProperty(budget, 'id', item.id as string)
    addServerScalarProperty(budget, 'display_name', item.display_name as string)
    addServerScalarProperty(budget, 'transport', item.transport as string)
    addServerScalarProperty(budget, 'url', item.url as string)
    addServerScalarProperty(budget, 'auth_type', item.auth_type as string)
    addServerScalarProperty(budget, 'adapter_id', item.adapter_id as string)
    addServerScalarProperty(budget, 'is_active', item.is_active as boolean)
    addServerScalarProperty(budget, 'startup_timeout_ms', item.startup_timeout_ms as number)
    addServerScalarProperty(budget, 'tool_timeout_ms', item.tool_timeout_ms as number)
    addServerScalarProperty(budget, 'generation_timeout_ms', item.generation_timeout_ms as number)
    addServerScalarProperty(budget, 'poll_initial_ms', item.poll_initial_ms as number)
    addServerScalarProperty(budget, 'poll_max_ms', item.poll_max_ms as number)
  }
  const enabledTools = validateEnabledTools(item.enabled_tools, code, serialization, budget)
  const customHeaders = validateCustomHeaders(item.custom_headers, code, budget)
  const record = (serialization ? Object.create(null) : {}) as McpServerRecord
  record.id = item.id as string
  record.display_name = item.display_name as string
  record.transport = item.transport as McpServerRecord['transport']
  record.url = item.url as string
  record.auth_type = item.auth_type as McpServerRecord['auth_type']
  record.adapter_id = item.adapter_id as string
  record.is_active = item.is_active as boolean
  record.startup_timeout_ms = item.startup_timeout_ms as number
  record.tool_timeout_ms = item.tool_timeout_ms as number
  record.generation_timeout_ms = item.generation_timeout_ms as number
  record.poll_initial_ms = item.poll_initial_ms as number
  record.poll_max_ms = item.poll_max_ms as number
  record.enabled_tools = enabledTools
  record.custom_headers = customHeaders
  Object.freeze(record)
  if (budget) budget.addAscii(index + 1 < length ? 5 : 4)
  return record
}

function validateMcpServerSnapshotUnsafe(raw: unknown, code: McpErrorCode, serialization: boolean) {
  const items = denseArrayValues(raw, MCP_SERVER_STORE_MAX_RECORDS, code)
  const ids = new Set<string>()
  const records: McpServerRecord[] = []
  const budget = serialization
    ? new StrictJsonBudget(MCP_SERVER_STORE_MAX_BYTES, () => serverStoreError(code))
    : undefined
  if (budget) budget.addAscii(items.length === 0 ? 3 : 2)
  for (let index = 0; index < items.length; index += 1) {
    const record = validateStoredMcpServer(items[index], code, serialization, budget, index, items.length)
    if (ids.has(record.id)) serverStoreError(code)
    ids.add(record.id)
    records[index] = record
  }
  if (budget && items.length > 0) budget.addAscii(2)
  if (serialization) {
    Object.setPrototypeOf(records, null)
    Object.freeze(records)
  }
  return records
}

function validateMcpServerSnapshot(raw: unknown, code: McpErrorCode, serialization = false) {
  try {
    return validateMcpServerSnapshotUnsafe(raw, code, serialization)
  } catch {
    serverStoreError(code)
  }
}

function prepareMcpServerSnapshot(raw: unknown) {
  return validateMcpServerSnapshot(raw, 'MCP_STORE_IO_FAILED', true)
}

export async function readMcpServers(activeWorkspace: string): Promise<McpServerRecord[]> {
  const parsed = await readJsonArrayFailClosed(getMcpServersPath(activeWorkspace), {
    maxBytes: MCP_SERVER_STORE_MAX_BYTES,
  })
  return validateMcpServerSnapshot(parsed, 'MCP_STORE_CORRUPT')
}

async function writeMcpServersUnlocked(activeWorkspace: string, snapshot: McpServerRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpServersPath(activeWorkspace), snapshot, {
    maxBytes: MCP_SERVER_STORE_MAX_BYTES,
  })
}

function stringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

function stringRecordsEqual(left: Record<string, string>, right: Record<string, string>) {
  const leftNames = Object.keys(left)
  const rightNames = Object.keys(right)
  if (leftNames.length !== rightNames.length) return false
  for (let index = 0; index < leftNames.length; index += 1) {
    const name = leftNames[index]!
    if (!Object.hasOwn(right, name) || left[name] !== right[name]) return false
  }
  return true
}

function serverIdentityChanged(previous: McpServerRecord, next: McpServerRecord) {
  return previous.transport !== next.transport
    || previous.url !== next.url
    || previous.auth_type !== next.auth_type
    || previous.adapter_id !== next.adapter_id
    || previous.is_active !== next.is_active
    || !stringArraysEqual(previous.enabled_tools, next.enabled_tools)
    || !stringRecordsEqual(previous.custom_headers, next.custom_headers)
}

async function assertServerIdentityMutationsAllowed(
  activeWorkspace: string,
  previous: McpServerRecord[],
  next: McpServerRecord[],
) {
  const nextById = new Map<string, McpServerRecord>()
  for (let index = 0; index < next.length; index += 1) {
    const item = next[index]!
    nextById.set(item.id, item)
  }
  const serverIds: string[] = []
  for (let index = 0; index < previous.length; index += 1) {
    const item = previous[index]!
    const replacement = nextById.get(item.id)
    if (!replacement || serverIdentityChanged(item, replacement)) serverIds[serverIds.length] = item.id
  }
  Object.setPrototypeOf(serverIds, null)
  Object.freeze(serverIds)
  await assertMcpIdentityMutationAllowed(activeWorkspace, { serverIds })
}

export function writeMcpServers(activeWorkspace: string, servers: McpServerRecord[]) {
  let next: McpServerRecord[]
  try {
    next = prepareMcpServerSnapshot(servers)
  } catch (error) {
    return Promise.reject(error)
  }
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const previous = await readMcpServers(activeWorkspace)
    await assertServerIdentityMutationsAllowed(activeWorkspace, previous, next)
    await writeMcpServersUnlocked(activeWorkspace, next)
  })
}

export function upsertMcpServer(activeWorkspace: string, input: Partial<McpServerRecord> & Record<string, unknown>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const server = normalizeMcpServer(input)
    const servers = await readMcpServers(activeWorkspace)
    let index = -1
    for (let serverIndex = 0; serverIndex < servers.length; serverIndex += 1) {
      if (servers[serverIndex]!.id === server.id) {
        index = serverIndex
        break
      }
    }
    const candidate: McpServerRecord[] = []
    for (let serverIndex = 0; serverIndex < servers.length; serverIndex += 1) {
      candidate[serverIndex] = servers[serverIndex]!
    }
    if (index >= 0) candidate[index] = server
    else candidate[servers.length] = server
    const snapshot = prepareMcpServerSnapshot(candidate)
    await assertServerIdentityMutationsAllowed(activeWorkspace, servers, snapshot)
    await writeMcpServersUnlocked(activeWorkspace, snapshot)
    return server
  })
}

export function deleteMcpServer(activeWorkspace: string, id: string) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const servers = await readMcpServers(activeWorkspace)
    const candidate: McpServerRecord[] = []
    for (let index = 0; index < servers.length; index += 1) {
      const item = servers[index]!
      if (item.id !== id) candidate[candidate.length] = item
    }
    const snapshot = prepareMcpServerSnapshot(candidate)
    await assertServerIdentityMutationsAllowed(activeWorkspace, servers, snapshot)
    await writeMcpServersUnlocked(activeWorkspace, snapshot)
    return snapshot.length !== servers.length
  })
}
