import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type APIKeyRecord = {
  id: number
  provider: string
  key?: string
  description?: string
  is_active: boolean
  quota_total?: number
  quota_used?: number
  tags?: string[]
}

export function getKeysPath(activeWorkspace: string) {
  return join(activeWorkspace, 'keys.json')
}

export async function readKeys(activeWorkspace: string): Promise<APIKeyRecord[]> {
  try {
    return JSON.parse(await readFile(getKeysPath(activeWorkspace), 'utf8')) as APIKeyRecord[]
  } catch {
    return []
  }
}

export async function writeKeys(activeWorkspace: string, keys: APIKeyRecord[]) {
  await writeFile(getKeysPath(activeWorkspace), `${JSON.stringify(keys, null, 2)}\n`, 'utf8')
}
