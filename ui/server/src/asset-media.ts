import { mkdir, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'

export function getAssetMediaRoot(activeWorkspace: string) {
  return join(activeWorkspace, 'assets')
}

export async function ensureAssetMediaRoot(activeWorkspace: string) {
  await mkdir(getAssetMediaRoot(activeWorkspace), { recursive: true })
}

export async function saveAssetUpload(activeWorkspace: string, filename: string, buffer: Buffer) {
  await ensureAssetMediaRoot(activeWorkspace)
  const safeName = basename(filename || `asset-${Date.now()}`)
  const filePath = join(getAssetMediaRoot(activeWorkspace), safeName)
  await writeFile(filePath, buffer)
  return filePath
}

export async function readAssetMediaFile(filePath: string) {
  return await readFile(filePath)
}
