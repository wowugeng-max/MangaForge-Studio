import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type AssetRecord = {
  id: number
  name: string
  description?: string
  type: string
  tags?: string[]
  project_id?: number | null
  thumbnail?: string
  data?: Record<string, any>
  updated_at: string
}

export function getAssetsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'assets.json')
}

export async function readAssets(activeWorkspace: string): Promise<AssetRecord[]> {
  try {
    return JSON.parse(await readFile(getAssetsPath(activeWorkspace), 'utf8')) as AssetRecord[]
  } catch {
    return []
  }
}

export async function writeAssets(activeWorkspace: string, assets: AssetRecord[]) {
  await writeFile(getAssetsPath(activeWorkspace), `${JSON.stringify(assets, null, 2)}\n`, 'utf8')
}

export async function seedAssetsIfEmpty(activeWorkspace: string): Promise<AssetRecord[]> {
  const current = await readAssets(activeWorkspace)
  if (current.length > 0) return current
  await writeAssets(activeWorkspace, [])
  return []
}
