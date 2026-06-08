import { basename } from 'path'
import { saveAssetUpload } from './asset-media'

let uploadNameSequence = 0

export function normalizeUploadFilename(rawName: string) {
  const safe = basename(rawName || `asset-${Date.now()}`)
  uploadNameSequence = (uploadNameSequence + 1) % 1000000
  return `${Date.now()}-${uploadNameSequence}-${safe}`
}

export async function uploadAssetBuffer(activeWorkspace: string, filename: string, buffer: Buffer) {
  return await saveAssetUpload(activeWorkspace, filename, buffer)
}
