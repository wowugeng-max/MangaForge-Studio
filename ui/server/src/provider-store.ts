import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { coerceBoolean } from './boolean-utils'

export type ProviderRecord = {
  id: string
  display_name: string
  service_type: string
  api_format: string
  auth_type: string
  response_mode?: 'auto' | 'stream' | 'non_stream'
  supported_modalities: string[]
  default_base_url?: string
  is_active: boolean
  icon?: string
  endpoints?: Record<string, any>
  custom_headers?: Record<string, string>
}

export function getProvidersPath(activeWorkspace: string) {
  return join(activeWorkspace, 'providers.json')
}

function objectOrEmpty(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function normalizeProviderRecord(raw: Partial<ProviderRecord> & Record<string, any>): ProviderRecord {
  const id = String(raw.id ?? '')
  const responseMode = raw.response_mode ?? raw.responseMode ?? 'auto'
  const supportedModalities = Array.isArray(raw.supported_modalities)
    ? raw.supported_modalities
    : Array.isArray(raw.supportedModalities)
      ? raw.supportedModalities
      : []
  return {
    ...raw,
    id,
    display_name: String(raw.display_name ?? raw.displayName ?? id),
    service_type: String(raw.service_type ?? raw.serviceType ?? 'llm'),
    api_format: String(raw.api_format ?? raw.apiFormat ?? 'openai_compatible'),
    auth_type: String(raw.auth_type ?? raw.authType ?? 'Bearer'),
    response_mode: ['auto', 'stream', 'non_stream'].includes(String(responseMode))
      ? String(responseMode) as ProviderRecord['response_mode']
      : 'auto',
    supported_modalities: supportedModalities,
    default_base_url: String(raw.default_base_url ?? raw.defaultBaseUrl ?? ''),
    is_active: coerceBoolean(raw.is_active ?? raw.isActive, true),
    icon: String(raw.icon ?? ''),
    endpoints: objectOrEmpty(raw.endpoints),
    custom_headers: objectOrEmpty(raw.custom_headers ?? raw.customHeaders),
  }
}

export async function readProviders(activeWorkspace: string): Promise<ProviderRecord[]> {
  try {
    const data = JSON.parse(await readFile(getProvidersPath(activeWorkspace), 'utf8')) as ProviderRecord[]
    return Array.isArray(data) ? data.map(item => normalizeProviderRecord(item as any)) : []
  } catch {
    return []
  }
}

export async function writeProviders(activeWorkspace: string, providers: ProviderRecord[]) {
  await writeFile(getProvidersPath(activeWorkspace), `${JSON.stringify(providers, null, 2)}\n`, 'utf8')
}
