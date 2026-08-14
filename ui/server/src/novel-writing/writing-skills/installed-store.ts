import { lstat, readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const WRITING_SKILL_PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
export const MAX_INSTALLED_SKILL_MD_BYTES = 256 * 1024
export const MAX_INSTALLED_REFERENCE_BYTES = 512 * 1024
export const MAX_INSTALLED_REFERENCE_COUNT = 8
export const MAX_INSTALLED_REFERENCES_TOTAL_BYTES = 2 * 1024 * 1024
const MAX_PACK_JSON_BYTES = 16 * 1024

export type InstalledWritingSkillPack = {
  id: string
  name: string
  description: string
  source_url: string
  owner: string
  repo: string
  revision: string
  installed_at: string
  dir: string
  reference_files: string[]
}

const cache = new Map<string, { mtimeMs: number; packs: InstalledWritingSkillPack[] }>()

export function writingSkillPacksRoot(workspace: string): string {
  return join(resolve(String(workspace || '')), '.mangaforge', 'writing-skill-packs')
}

export function invalidateInstalledWritingSkillPackCache(): void {
  cache.clear()
}

function warnSkip(id: string, reason: string): null {
  console.warn(`[writing-skills] skipping invalid installed pack "${id}": ${reason}`)
  return null
}

async function readInstalledWritingSkillPack(root: string, id: string): Promise<InstalledWritingSkillPack | null> {
  const dir = join(root, id)
  try {
    const dirInfo = await lstat(dir)
    if (dirInfo.isSymbolicLink() || !dirInfo.isDirectory()) return warnSkip(id, 'not a regular directory')

    const packJsonPath = join(dir, 'pack.json')
    const packInfo = await lstat(packJsonPath)
    if (packInfo.isSymbolicLink() || !packInfo.isFile() || packInfo.size > MAX_PACK_JSON_BYTES) {
      return warnSkip(id, 'pack.json missing or not a regular bounded file')
    }
    const record = JSON.parse(await readFile(packJsonPath, 'utf8')) as Record<string, unknown>
    if (
      !record || typeof record !== 'object' || Array.isArray(record)
      || record.id !== id
      || typeof record.source_url !== 'string'
      || typeof record.owner !== 'string'
      || typeof record.repo !== 'string'
      || typeof record.revision !== 'string'
      || typeof record.installed_at !== 'string'
      || !Number.isFinite(Date.parse(record.installed_at))
      || typeof record.name !== 'string' || !record.name.trim()
      || (record.description !== undefined && typeof record.description !== 'string')
    ) return warnSkip(id, 'invalid pack.json shape')

    const skillInfo = await lstat(join(dir, 'SKILL.md'))
    if (skillInfo.isSymbolicLink() || !skillInfo.isFile()) return warnSkip(id, 'SKILL.md missing')
    if (skillInfo.size > MAX_INSTALLED_SKILL_MD_BYTES) return warnSkip(id, 'SKILL.md exceeds bounds')

    const referenceFiles: string[] = []
    let referencesTotal = 0
    try {
      const referencesDir = join(dir, 'references')
      const referencesInfo = await lstat(referencesDir)
      if (referencesInfo.isSymbolicLink() || !referencesInfo.isDirectory()) {
        return warnSkip(id, 'references is not a regular directory')
      }
      for (const file of (await readdir(referencesDir)).sort()) {
        if (!/\.md$/i.test(file)) continue
        const referenceInfo = await lstat(join(referencesDir, file))
        if (referenceInfo.isSymbolicLink() || !referenceInfo.isFile()) {
          return warnSkip(id, `reference is not a regular file: ${file}`)
        }
        if (referenceInfo.size > MAX_INSTALLED_REFERENCE_BYTES) {
          return warnSkip(id, `reference exceeds bounds: ${file}`)
        }
        referencesTotal += referenceInfo.size
        referenceFiles.push(file)
      }
      if (referenceFiles.length > MAX_INSTALLED_REFERENCE_COUNT) return warnSkip(id, 'too many references')
      if (referencesTotal > MAX_INSTALLED_REFERENCES_TOTAL_BYTES) return warnSkip(id, 'references exceed total bounds')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    return {
      id,
      name: record.name.trim().slice(0, 120),
      description: String(record.description || '').slice(0, 500),
      source_url: record.source_url,
      owner: record.owner,
      repo: record.repo,
      revision: record.revision,
      installed_at: record.installed_at,
      dir,
      reference_files: referenceFiles,
    }
  } catch (error) {
    return warnSkip(id, String(error))
  }
}

export async function listInstalledWritingSkillPacks(workspace: string): Promise<InstalledWritingSkillPack[]> {
  const root = writingSkillPacksRoot(workspace)
  let rootInfo
  try {
    rootInfo = await stat(root)
  } catch {
    return []
  }
  if (!rootInfo.isDirectory()) return []
  const cached = cache.get(root)
  if (cached && cached.mtimeMs === rootInfo.mtimeMs) return cached.packs

  const packs: InstalledWritingSkillPack[] = []
  for (const entry of await readdir(root)) {
    if (entry.startsWith('.') || !WRITING_SKILL_PACK_ID_RE.test(entry)) continue
    const pack = await readInstalledWritingSkillPack(root, entry)
    if (pack) packs.push(pack)
  }
  packs.sort((a, b) => a.installed_at.localeCompare(b.installed_at) || a.id.localeCompare(b.id))
  cache.set(root, { mtimeMs: rootInfo.mtimeMs, packs })
  return packs
}

export async function getInstalledWritingSkillNameMap(workspace: string): Promise<Record<string, string>> {
  const packs = await listInstalledWritingSkillPacks(workspace)
  return Object.fromEntries(packs.map(pack => [pack.id, pack.name]))
}
