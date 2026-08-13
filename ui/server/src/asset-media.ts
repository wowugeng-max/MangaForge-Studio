import { access, mkdir, readFile, writeFile } from 'fs/promises'
import { createHash } from 'crypto'
import { join, basename, isAbsolute, relative, resolve } from 'path'

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

// Content-addressed variant for re-uploadable media (canvas reference
// materialization): identical bytes always land on the same path, which keeps
// compile-cache keys stable across sessions and stops duplicate files from
// accumulating. Only a sanitized extension is taken from the client name.
export async function saveDedupedAssetUpload(activeWorkspace: string, filename: string, buffer: Buffer) {
  await ensureAssetMediaRoot(activeWorkspace)
  const extensionMatch = basename(filename || '').match(/\.([a-z0-9]{1,8})$/i)
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : ''
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 32)
  const filePath = join(getAssetMediaRoot(activeWorkspace), `ref-${hash}${extension}`)
  try {
    await access(filePath)
  } catch {
    await writeFile(filePath, buffer)
  }
  return filePath
}

function isInside(root: string, candidate: string) {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function mediaPathCandidates(activeWorkspace: string, filePath: string) {
  const workspaceRoot = resolve(activeWorkspace)
  const assetRoot = resolve(workspaceRoot, 'assets')
  const legacyAssetRoot = resolve(workspaceRoot, 'data', 'assets')
  const decoded = decodeURIComponent(filePath || '')
  const clean = decoded.replace(/^\/+/, '')
  const hasTraversal = clean.split(/[\\/]+/).includes('..')
  const candidates: string[] = []

  if (isAbsolute(decoded)) candidates.push(resolve(decoded))
  if (clean && !hasTraversal) {
    candidates.push(resolve(workspaceRoot, clean))
    candidates.push(resolve(workspaceRoot, 'assets', clean))
    if (clean.startsWith('data/assets/')) {
      candidates.push(resolve(workspaceRoot, clean.replace(/^data\/assets\/?/, 'assets/')))
    }
  }

  return Array.from(new Set(candidates)).filter(candidate => isInside(assetRoot, candidate) || isInside(legacyAssetRoot, candidate))
}

export async function readAssetMediaFile(filePath: string, activeWorkspace?: string) {
  if (!activeWorkspace) return await readFile(filePath)
  const candidates = mediaPathCandidates(activeWorkspace, filePath)
  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch {
      // Try the next compatible location for legacy asset paths.
    }
  }
  throw new Error('asset media not found')
}
