import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import { readJsonArrayFailClosed, writeJsonArrayAtomic } from './atomic-json-store'
import type { McpKeyRecord, PublicMcpKeyRecord } from './types'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'
import { assertMcpIdentityMutationAllowed } from './identity-mutation-fence'

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
  const parsed = await readJsonArrayFailClosed(getMcpKeysPath(activeWorkspace))
  return parsed.map(item => normalizeMcpKey((item || {}) as any)).filter(item => item.id > 0)
}

async function writeMcpKeysUnlocked(activeWorkspace: string, keys: McpKeyRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpKeysPath(activeWorkspace), keys.map(normalizeMcpKey))
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
  const nextById = new Map(next.map(item => [item.id, item]))
  const keyIds = previous
    .filter(item => !nextById.has(item.id) || keyIdentityChanged(item, nextById.get(item.id)!))
    .map(item => item.id)
  await assertMcpIdentityMutationAllowed(activeWorkspace, { keyIds })
}

export function writeMcpKeys(activeWorkspace: string, keys: McpKeyRecord[]) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const previous = await readMcpKeys(activeWorkspace)
    const next = keys.map(normalizeMcpKey)
    await assertKeyIdentityMutationsAllowed(activeWorkspace, previous, next)
    await writeMcpKeysUnlocked(activeWorkspace, next)
  })
}

export function createMcpKey(activeWorkspace: string, input: Partial<McpKeyRecord> & Pick<McpKeyRecord, 'mcp_server_id' | 'key'>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    const nextId = keys.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1
    const record = normalizeMcpKey({ ...input, id: nextId })
    await writeMcpKeysUnlocked(activeWorkspace, [...keys, record])
    return record
  })
}

export function updateMcpKey(activeWorkspace: string, id: number, input: Partial<McpKeyRecord>) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    const index = keys.findIndex(item => item.id === id)
    if (index < 0) return null
    const previous = keys[index]!
    const record = normalizeMcpKey({
      ...previous,
      ...input,
      id,
      key: input.key === undefined || String(input.key).trim() === '' ? previous.key : input.key,
    })
    keys[index] = record
    await assertKeyIdentityMutationsAllowed(activeWorkspace, [previous], [record])
    await writeMcpKeysUnlocked(activeWorkspace, keys)
    return record
  })
}

export function deleteMcpKey(activeWorkspace: string, id: number) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    const next = keys.filter(item => item.id !== id)
    await assertKeyIdentityMutationsAllowed(activeWorkspace, keys, next)
    await writeMcpKeysUnlocked(activeWorkspace, next)
    return next.length !== keys.length
  })
}
