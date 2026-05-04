import { basename } from 'path'
import { saveAssetUpload } from './asset-media'

export function normalizeUploadFilename(rawName: string) {
  const safe = basename(rawName || `asset-${Date.now()}`)
  return `${Date.now()}-${safe}`
}

export async function uploadAssetBuffer(activeWorkspace: string, filename: string, buffer: Buffer) {
  return await saveAssetUpload(activeWorkspace, filename, buffer)
}
