import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { validateSkillPackArchiveEntry } from '../../skills/path-safety'
import {
  OH_STORY_CORE_SKILL_IDS,
  type OhStoryCoreSkill,
  type OhStoryCoreSuite,
} from './types'

export { OH_STORY_CORE_SKILL_IDS, OH_STORY_CORE_SOURCE_URL } from './types'
export type { OhStoryCoreSkill, OhStoryCoreSkillId, OhStoryCoreSuite } from './types'

const MAX_PACK_JSON_BYTES = 16 * 1024

export function ohStoryCoreRoot(workspace: string) {
  return join(resolve(String(workspace || '')), '.mangaforge', 'oh-story-core')
}

function regularFileSize(path: string): number | null {
  try {
    const info = lstatSync(path)
    if (info.isSymbolicLink() || !info.isFile()) return null
    return info.size
  } catch {
    return null
  }
}

function isRegularDirectory(path: string): boolean {
  try {
    const info = lstatSync(path)
    return !info.isSymbolicLink() && info.isDirectory()
  } catch {
    return false
  }
}

function readSkill(root: string, id: string): OhStoryCoreSkill | null {
  try {
    validateSkillPackArchiveEntry(`skills/${id}`, 'directory', 0)
  } catch {
    return null
  }

  const skillDir = join(root, 'skills', id)
  if (!isRegularDirectory(skillDir)) return null

  const skillPath = join(skillDir, 'SKILL.md')
  const skillSize = regularFileSize(skillPath)
  if (skillSize === null) return null
  try {
    validateSkillPackArchiveEntry(`skills/${id}/SKILL.md`, 'file', skillSize)
  } catch {
    return null
  }

  return {
    skill_markdown: readFileSync(skillPath, 'utf8'),
    references: readReferences(root, id),
  }
}

function readReferences(root: string, id: string): Array<{ file: string; text: string }> {
  const referencesDir = join(root, 'skills', id, 'references')
  if (!isRegularDirectory(referencesDir)) return []

  const files = readdirSync(referencesDir).filter((file) => /\.md$/i.test(file)).sort((a, b) => a.localeCompare(b))
  const references: Array<{ file: string; text: string }> = []
  for (const file of files) {
    const path = join(referencesDir, file)
    const size = regularFileSize(path)
    if (size === null) continue
    try {
      validateSkillPackArchiveEntry(`skills/${id}/references/${file}`, 'file', size)
    } catch {
      continue
    }
    references.push({ file, text: readFileSync(path, 'utf8') })
  }
  return references
}

export function loadOhStoryCoreSuite(workspace: string): OhStoryCoreSuite | null {
  const root = ohStoryCoreRoot(workspace)
  if (!isRegularDirectory(root)) return null

  const packPath = join(root, 'pack.json')
  const packSize = regularFileSize(packPath)
  if (packSize === null || packSize > MAX_PACK_JSON_BYTES) return null
  try {
    validateSkillPackArchiveEntry('pack.json', 'file', packSize)
  } catch {
    return null
  }

  let record: Record<string, unknown>
  try {
    const parsed = JSON.parse(readFileSync(packPath, 'utf8')) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    record = parsed as Record<string, unknown>
  } catch {
    return null
  }

  if (
    typeof record.source_url !== 'string'
    || typeof record.revision !== 'string'
    || typeof record.installed_at !== 'string'
  ) return null

  const skills: Record<string, OhStoryCoreSkill> = {}
  for (const id of OH_STORY_CORE_SKILL_IDS) {
    const skill = readSkill(root, id)
    if (skill) skills[id] = skill
  }

  return {
    source_url: record.source_url,
    revision: record.revision,
    installed_at: record.installed_at,
    skills,
  }
}
