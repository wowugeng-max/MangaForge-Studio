import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { coerceBoolean } from '../boolean-utils'
import type { McpKeyRecord, PublicMcpKeyRecord } from './types'

export function getMcpKeysPath(activeWorkspace: string) {
  return join(activeWorkspace, 'mcp-keys.json')
}

function normalizeMcpKey(raw: Partial<McpKeyRecord> & Record<string, unknown>): McpKeyRecord {
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
  try {
    const parsed = JSON.parse(await readFile(getMcpKeysPath(activeWorkspace), 'utf8'))
    return Array.isArray(parsed) ? parsed.map(item => normalizeMcpKey(item || {})).filter(item => item.id > 0) : []
  } catch {
    return []
  }
}

export async function writeMcpKeys(activeWorkspace: string, keys: McpKeyRecord[]) {
  await writeFile(getMcpKeysPath(activeWorkspace), `${JSON.stringify(keys.map(normalizeMcpKey), null, 2)}\n`, 'utf8')
}

export async function createMcpKey(activeWorkspace: string, input: Partial<McpKeyRecord> & Pick<McpKeyRecord, 'mcp_server_id' | 'key'>) {
  const keys = await readMcpKeys(activeWorkspace)
  const nextId = keys.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1
  const record = normalizeMcpKey({ ...input, id: nextId })
  keys.push(record)
  await writeMcpKeys(activeWorkspace, keys)
  return record
}

export async function updateMcpKey(activeWorkspace: string, id: number, input: Partial<McpKeyRecord>) {
  const keys = await readMcpKeys(activeWorkspace)
  const index = keys.findIndex(item => item.id === id)
  if (index < 0) return null
  const previous = keys[index]!
  const record = normalizeMcpKey({
    ...previous,
    ...input,
    id,
    key: input.key === undefined || input.key === '' ? previous.key : input.key,
  })
  keys[index] = record
  await writeMcpKeys(activeWorkspace, keys)
  return record
}

export async function deleteMcpKey(activeWorkspace: string, id: number) {
  const keys = await readMcpKeys(activeWorkspace)
  const next = keys.filter(item => item.id !== id)
  await writeMcpKeys(activeWorkspace, next)
  return next.length !== keys.length
}
