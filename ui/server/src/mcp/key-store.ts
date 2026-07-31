import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import { readJsonArrayFailClosed, writeJsonArrayAtomic } from './atomic-json-store'
import { McpError } from './errors'
import type { McpErrorCode } from './errors'
import type { McpKeyRecord, PublicMcpKeyRecord } from './types'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'
import { assertMcpIdentityMutationAllowed } from './identity-mutation-fence'
import { StrictJsonBudget } from './strict-json-budget'

// Config snapshots are intentionally bounded: enough for many accounts while keeping RMW predictable.
export const MCP_KEY_STORE_MAX_BYTES = 1024 * 1024
export const MCP_KEY_STORE_MAX_RECORDS = 1000
const REMOTE_ID_MAX_CHARS = 16_384
const SECRET_MAX_CHARS = 16_384
const DESCRIPTION_MAX_CHARS = 4096
const TIMESTAMP_MAX_CHARS = 64
const PRIORITY_ABS_MAX = 1_000_000
const COUNTER_MAX = Number.MAX_SAFE_INTEGER
const LATENCY_MAX_MS = 2_147_483_647
const REQUIRED_DURABLE_KEYS = [
  'description', 'failure_count', 'id', 'is_active', 'key', 'mcp_server_id',
  'priority', 'success_count',
] as const
const OPTIONAL_DURABLE_KEYS = new Set(['avg_latency', 'last_checked', 'last_used'])

export function getMcpKeysPath(activeWorkspace: string) {
  return join(activeWorkspace, 'mcp-keys.json')
}

export function normalizeMcpKey(raw: Partial<McpKeyRecord> & Record<string, unknown>): McpKeyRecord {
  return {
    id: Number(raw.id || 0),
    mcp_server_id: String(raw.mcp_server_id ?? (raw as any).mcpServerId ?? '').trim(),
    key: String(raw.key ?? '').trim(),
    description: String(raw.description ?? ''),
    is_active: coerceBoolean(raw.is_active ?? (raw as any).isActive, true),
    priority: Number(raw.priority ?? 0),
    success_count: Number(raw.success_count ?? (raw as any).successCount ?? 0),
    failure_count: Number(raw.failure_count ?? (raw as any).failureCount ?? 0),
    ...(raw.last_checked || (raw as any).lastChecked ? { last_checked: String(raw.last_checked ?? (raw as any).lastChecked) } : {}),
    ...(raw.last_used || (raw as any).lastUsed ? { last_used: String(raw.last_used ?? (raw as any).lastUsed) } : {}),
    ...(Number.isFinite(Number(raw.avg_latency ?? (raw as any).avgLatency)) ? { avg_latency: Number(raw.avg_latency ?? (raw as any).avgLatency) } : {}),
  }
}

function keyStoreError(code: McpErrorCode): never {
  throw new McpError(code, code === 'MCP_STORE_CORRUPT'
    ? 'MCP Key 配置文件损坏'
    : 'MCP Key 配置超过存储限制')
}

function canonicalTimestamp(value: unknown) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= TIMESTAMP_MAX_CHARS
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
}

function ownPlainData(raw: unknown, code: McpErrorCode) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) keyStoreError(code)
  const prototype = Object.getPrototypeOf(raw)
  if (prototype !== Object.prototype && prototype !== null) keyStoreError(code)
  const descriptors = Object.getOwnPropertyDescriptors(raw)
  const keys = Reflect.ownKeys(descriptors)
  const data: Record<string, unknown> = Object.create(null)
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]
    if (typeof key !== 'string') keyStoreError(code)
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) keyStoreError(code)
    data[key] = descriptor.value
  }
  return data
}

function denseArrayValues(raw: unknown, maximum: number, code: McpErrorCode) {
  if (!Array.isArray(raw) || Object.getPrototypeOf(raw) !== Array.prototype) keyStoreError(code)
  const descriptors = Object.getOwnPropertyDescriptors(raw)
  const length = descriptors.length?.value
  const keys = Reflect.ownKeys(descriptors)
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || keys.length !== length + 1) {
    keyStoreError(code)
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] !== 'string') keyStoreError(code)
  }
  const values: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) keyStoreError(code)
    values[index] = descriptor.value
  }
  return values
}

function hasOnlyDurableKeyFields(item: Record<string, unknown>) {
  for (let index = 0; index < REQUIRED_DURABLE_KEYS.length; index += 1) {
    if (!Object.hasOwn(item, REQUIRED_DURABLE_KEYS[index]!)) return false
  }
  const keys = Object.keys(item)
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!
    let required = false
    for (let requiredIndex = 0; requiredIndex < REQUIRED_DURABLE_KEYS.length; requiredIndex += 1) {
      if (key === REQUIRED_DURABLE_KEYS[requiredIndex]) {
        required = true
        break
      }
    }
    if (!required && !OPTIONAL_DURABLE_KEYS.has(key)) return false
  }
  return true
}

function addKeyScalarProperty(
  budget: StrictJsonBudget,
  name: string,
  value: string | number | boolean,
  comma: boolean,
) {
  budget.addAscii(4)
  budget.addScalar(name)
  budget.addAscii(2)
  budget.addScalar(value)
  budget.addAscii(comma ? 2 : 1)
}

function addMcpKeyRecordBudget(
  budget: StrictJsonBudget,
  record: McpKeyRecord,
  index: number,
  length: number,
) {
  const hasLastChecked = Object.hasOwn(record, 'last_checked')
  const hasLastUsed = Object.hasOwn(record, 'last_used')
  const hasAverageLatency = Object.hasOwn(record, 'avg_latency')
  budget.addAscii(4)
  addKeyScalarProperty(budget, 'id', record.id, true)
  addKeyScalarProperty(budget, 'mcp_server_id', record.mcp_server_id, true)
  addKeyScalarProperty(budget, 'key', record.key, true)
  addKeyScalarProperty(budget, 'description', record.description, true)
  addKeyScalarProperty(budget, 'is_active', record.is_active, true)
  addKeyScalarProperty(budget, 'priority', record.priority, true)
  addKeyScalarProperty(budget, 'success_count', record.success_count, true)
  addKeyScalarProperty(budget, 'failure_count', record.failure_count,
    hasLastChecked || hasLastUsed || hasAverageLatency)
  if (hasLastChecked) {
    addKeyScalarProperty(budget, 'last_checked', record.last_checked!, hasLastUsed || hasAverageLatency)
  }
  if (hasLastUsed) addKeyScalarProperty(budget, 'last_used', record.last_used!, hasAverageLatency)
  if (hasAverageLatency) addKeyScalarProperty(budget, 'avg_latency', record.avg_latency!, false)
  budget.addAscii(index + 1 < length ? 5 : 4)
}

function validateStoredMcpKey(raw: unknown, code: McpErrorCode, serialization: boolean): McpKeyRecord {
  const item = ownPlainData(raw, code)
  if (!hasOnlyDurableKeyFields(item)) keyStoreError(code)
  if (!Number.isSafeInteger(item.id) || (item.id as number) <= 0
    || typeof item.mcp_server_id !== 'string' || !item.mcp_server_id
    || item.mcp_server_id !== item.mcp_server_id.trim() || item.mcp_server_id.length > REMOTE_ID_MAX_CHARS
    || typeof item.key !== 'string' || !item.key || item.key !== item.key.trim()
    || item.key.length > SECRET_MAX_CHARS
    || typeof item.description !== 'string' || item.description.length > DESCRIPTION_MAX_CHARS
    || typeof item.is_active !== 'boolean'
    || !Number.isInteger(item.priority) || !Number.isFinite(item.priority)
    || Math.abs(item.priority as number) > PRIORITY_ABS_MAX
    || !Number.isSafeInteger(item.success_count) || (item.success_count as number) < 0
    || (item.success_count as number) > COUNTER_MAX
    || !Number.isSafeInteger(item.failure_count) || (item.failure_count as number) < 0
    || (item.failure_count as number) > COUNTER_MAX
    || (Object.hasOwn(item, 'last_checked') && !canonicalTimestamp(item.last_checked))
    || (Object.hasOwn(item, 'last_used') && !canonicalTimestamp(item.last_used))
    || (Object.hasOwn(item, 'avg_latency')
      && (typeof item.avg_latency !== 'number' || !Number.isFinite(item.avg_latency)
        || item.avg_latency < 0 || item.avg_latency > LATENCY_MAX_MS))) {
    keyStoreError(code)
  }
  const record = (serialization ? Object.create(null) : {}) as McpKeyRecord
  record.id = item.id as number
  record.mcp_server_id = item.mcp_server_id as string
  record.key = item.key as string
  record.description = item.description as string
  record.is_active = item.is_active as boolean
  record.priority = item.priority as number
  record.success_count = item.success_count as number
  record.failure_count = item.failure_count as number
  if (Object.hasOwn(item, 'last_checked')) record.last_checked = item.last_checked as string
  if (Object.hasOwn(item, 'last_used')) record.last_used = item.last_used as string
  if (Object.hasOwn(item, 'avg_latency')) record.avg_latency = item.avg_latency as number
  Object.freeze(record)
  return record
}

function validateMcpKeySnapshotUnsafe(raw: unknown, code: McpErrorCode, serialization: boolean) {
  const items = denseArrayValues(raw, MCP_KEY_STORE_MAX_RECORDS, code)
  const ids = new Set<number>()
  const records: McpKeyRecord[] = []
  const budget = serialization
    ? new StrictJsonBudget(MCP_KEY_STORE_MAX_BYTES, () => keyStoreError(code))
    : undefined
  if (budget) budget.addAscii(items.length === 0 ? 3 : 2)
  for (let index = 0; index < items.length; index += 1) {
    const record = validateStoredMcpKey(items[index], code, serialization)
    if (ids.has(record.id)) keyStoreError(code)
    ids.add(record.id)
    records[index] = record
    if (budget) addMcpKeyRecordBudget(budget, record, index, items.length)
  }
  if (budget && items.length > 0) budget.addAscii(2)
  if (serialization) {
    Object.setPrototypeOf(records, null)
    Object.freeze(records)
  }
  return records
}

function validateMcpKeySnapshot(raw: unknown, code: McpErrorCode, serialization = false) {
  try {
    return validateMcpKeySnapshotUnsafe(raw, code, serialization)
  } catch {
    keyStoreError(code)
  }
}

function prepareMcpKeySnapshot(raw: unknown) {
  return validateMcpKeySnapshot(raw, 'MCP_STORE_IO_FAILED', true)
}

export function maskMcpKey(value: string) {
  const key = String(value || '')
  if (!key) return ''
  if (key.length <= 8) return '***'
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}

export function toPublicMcpKey(record: McpKeyRecord): PublicMcpKeyRecord {
  const { key, ...safe } = record
  return { ...safe, masked_key: maskMcpKey(key), has_key: Boolean(key) }
}

export async function readMcpKeys(activeWorkspace: string): Promise<McpKeyRecord[]> {
  const parsed = await readJsonArrayFailClosed(getMcpKeysPath(activeWorkspace), {
    maxBytes: MCP_KEY_STORE_MAX_BYTES,
  })
  return validateMcpKeySnapshot(parsed, 'MCP_STORE_CORRUPT')
}

async function writeMcpKeysUnlocked(activeWorkspace: string, snapshot: McpKeyRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpKeysPath(activeWorkspace), snapshot, {
    maxBytes: MCP_KEY_STORE_MAX_BYTES,
  })
}

function keyIdentityChanged(previous: McpKeyRecord, next: McpKeyRecord) {
  return previous.mcp_server_id !== next.mcp_server_id
    || previous.key !== next.key
    || previous.is_active !== next.is_active
}

async function assertKeyIdentityMutationsAllowed(
  activeWorkspace: string,
  previous: McpKeyRecord[],
  next: McpKeyRecord[],
) {
  const nextById = new Map<number, McpKeyRecord>()
  for (let index = 0; index < next.length; index += 1) {
    const item = next[index]!
    nextById.set(item.id, item)
  }
  const keyIds: number[] = []
  for (let index = 0; index < previous.length; index += 1) {
    const item = previous[index]!
    const replacement = nextById.get(item.id)
    if (!replacement || keyIdentityChanged(item, replacement)) keyIds[keyIds.length] = item.id
  }
  Object.setPrototypeOf(keyIds, null)
  Object.freeze(keyIds)
  await assertMcpIdentityMutationAllowed(activeWorkspace, { keyIds })
}

export function writeMcpKeys(activeWorkspace: string, keys: McpKeyRecord[]) {
  let next: McpKeyRecord[]
  try {
    next = prepareMcpKeySnapshot(keys)
  } catch (error) {
    return Promise.reject(error)
  }
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const previous = await readMcpKeys(activeWorkspace)
    await assertKeyIdentityMutationsAllowed(activeWorkspace, previous, next)
    await writeMcpKeysUnlocked(activeWorkspace, next)
  })
}

export function createMcpKey(activeWorkspace: string, input: Partial<McpKeyRecord> & Pick<McpKeyRecord, 'mcp_server_id' | 'key'>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    let maximumId = 0
    for (let index = 0; index < keys.length; index += 1) maximumId = Math.max(maximumId, keys[index]!.id)
    const nextId = maximumId + 1
    const record = normalizeMcpKey({ ...input, id: nextId })
    const candidate: McpKeyRecord[] = []
    for (let index = 0; index < keys.length; index += 1) candidate[index] = keys[index]!
    candidate[keys.length] = record
    const snapshot = prepareMcpKeySnapshot(candidate)
    await writeMcpKeysUnlocked(activeWorkspace, snapshot)
    return record
  })
}

export function updateMcpKey(activeWorkspace: string, id: number, input: Partial<McpKeyRecord>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    let index = -1
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (keys[keyIndex]!.id === id) {
        index = keyIndex
        break
      }
    }
    if (index < 0) return null
    const previous = keys[index]!
    const record = normalizeMcpKey({
      ...previous,
      ...input,
      id,
      key: input.key === undefined || String(input.key).trim() === '' ? previous.key : input.key,
    })
    const candidate: McpKeyRecord[] = []
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) candidate[keyIndex] = keys[keyIndex]!
    candidate[index] = record
    const snapshot = prepareMcpKeySnapshot(candidate)
    await assertKeyIdentityMutationsAllowed(activeWorkspace, keys, snapshot)
    await writeMcpKeysUnlocked(activeWorkspace, snapshot)
    return record
  })
}

export function deleteMcpKey(activeWorkspace: string, id: number) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    const candidate: McpKeyRecord[] = []
    for (let index = 0; index < keys.length; index += 1) {
      const item = keys[index]!
      if (item.id !== id) candidate[candidate.length] = item
    }
    const snapshot = prepareMcpKeySnapshot(candidate)
    await assertKeyIdentityMutationsAllowed(activeWorkspace, keys, snapshot)
    await writeMcpKeysUnlocked(activeWorkspace, snapshot)
    return snapshot.length !== keys.length
  })
}
