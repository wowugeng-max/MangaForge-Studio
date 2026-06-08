import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { coerceBoolean } from './boolean-utils'

export type APIKeyRecord = {
  id: number
  provider: string
  key?: string
  base_url?: string
  description?: string
  is_active: boolean
  priority?: number
  quota_total?: number
  quota_remaining?: number
  quota_used?: number
  quota_unit?: string
  price_per_call?: number
  service_type?: string
  success_count?: number
  failure_count?: number
  last_checked?: string
  last_used?: string
  created_at?: string
  expires_at?: string | null
  avg_latency?: number
  tags?: string[]
}

export function getKeysPath(activeWorkspace: string) {
  return join(activeWorkspace, 'keys.json')
}

function nowIso() {
  return new Date().toISOString()
}

export function normalizeKeyRecord(key: APIKeyRecord & Record<string, any>): APIKeyRecord {
  const timestamp = key.created_at || key.createdAt || key.last_checked || key.lastChecked || nowIso()
  const quotaTotal = key.quota_total ?? key.quotaTotal ?? 0
  return {
    ...key,
    key: String(key.key ?? key.api_key ?? key.apiKey ?? ''),
    base_url: String(key.base_url ?? key.baseUrl ?? ''),
    description: String(key.description ?? ''),
    is_active: coerceBoolean(key.is_active ?? key.isActive, true),
    priority: Number(key.priority ?? 0),
    quota_total: Number(quotaTotal),
    quota_remaining: Number(key.quota_remaining ?? key.quotaRemaining ?? quotaTotal),
    quota_used: Number(key.quota_used ?? key.quotaUsed ?? 0),
    quota_unit: String(key.quota_unit ?? key.quotaUnit ?? 'count'),
    price_per_call: Number(key.price_per_call ?? key.pricePerCall ?? 0),
    service_type: String(key.service_type ?? key.serviceType ?? 'llm'),
    success_count: Number(key.success_count ?? key.successCount ?? 0),
    failure_count: Number(key.failure_count ?? key.failureCount ?? 0),
    last_checked: key.last_checked || key.lastChecked || timestamp,
    last_used: key.last_used || key.lastUsed ? String(key.last_used ?? key.lastUsed) : null,
    created_at: timestamp,
    expires_at: key.expires_at || key.expiresAt ? String(key.expires_at ?? key.expiresAt) : null,
    avg_latency: Number(key.avg_latency ?? key.avgLatency ?? 0),
    tags: Array.isArray(key.tags) ? key.tags : [],
  }
}

export async function readKeys(activeWorkspace: string): Promise<APIKeyRecord[]> {
  try {
    const data = JSON.parse(await readFile(getKeysPath(activeWorkspace), 'utf8')) as APIKeyRecord[]
    return Array.isArray(data) ? data.map(normalizeKeyRecord) : []
  } catch {
    return []
  }
}

export async function writeKeys(activeWorkspace: string, keys: APIKeyRecord[]) {
  await writeFile(getKeysPath(activeWorkspace), `${JSON.stringify(keys, null, 2)}\n`, 'utf8')
}
