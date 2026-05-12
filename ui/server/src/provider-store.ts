import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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
  endpoints?: Record<string, string>
  custom_headers?: Record<string, string>
}

export function getProvidersPath(activeWorkspace: string) {
  return join(activeWorkspace, 'providers.json')
}

export async function readProviders(activeWorkspace: string): Promise<ProviderRecord[]> {
  try {
    return JSON.parse(await readFile(getProvidersPath(activeWorkspace), 'utf8')) as ProviderRecord[]
  } catch {
    return []
  }
}

export async function writeProviders(activeWorkspace: string, providers: ProviderRecord[]) {
  await writeFile(getProvidersPath(activeWorkspace), `${JSON.stringify(providers, null, 2)}\n`, 'utf8')
}
