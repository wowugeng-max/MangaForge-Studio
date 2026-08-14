import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  MAX_INSTALLED_REFERENCE_BYTES,
  MAX_INSTALLED_REFERENCE_COUNT,
  MAX_INSTALLED_REFERENCES_TOTAL_BYTES,
  MAX_INSTALLED_SKILL_MD_BYTES,
  type InstalledWritingSkillPack,
} from './installed-store'

export type InstalledWritingSkillPrompt = {
  id: string
  name: string
  skill_markdown: string
  references: Array<{ file: string; text: string }>
}

export function stripInstalledSkillFrontmatter(raw: string): string {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .trim()
}

function boundsError(id: string, detail: string): Error {
  return new Error(`writing_skill_pack_bounds_exceeded: ${id} ${detail}`)
}

// Files can grow between the installed-store scan and this read (or be
// swapped on disk), so the spec bounds are re-enforced at read time.
function readBoundedFile(id: string, path: string, maxBytes: number, detail: string): string {
  if (statSync(path).size > maxBytes) throw boundsError(id, detail)
  const text = readFileSync(path, 'utf8')
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw boundsError(id, detail)
  return text
}

// The pack's `dir` is resolved by installed-store from the active workspace,
// never from import.meta.dir.
export function loadInstalledWritingSkillPrompt(pack: InstalledWritingSkillPack): InstalledWritingSkillPrompt {
  const skillMarkdown = stripInstalledSkillFrontmatter(
    readBoundedFile(pack.id, join(pack.dir, 'SKILL.md'), MAX_INSTALLED_SKILL_MD_BYTES, 'SKILL.md exceeds bounds'),
  )
  const referenceFiles = [...pack.reference_files].sort((a, b) => a.localeCompare(b))
  if (referenceFiles.length > MAX_INSTALLED_REFERENCE_COUNT) {
    throw boundsError(pack.id, 'too many references')
  }
  let referencesTotal = 0
  const references = referenceFiles.map(file => {
    const text = readBoundedFile(
      pack.id,
      join(pack.dir, 'references', file),
      MAX_INSTALLED_REFERENCE_BYTES,
      `reference exceeds bounds: ${file}`,
    )
    referencesTotal += Buffer.byteLength(text, 'utf8')
    if (referencesTotal > MAX_INSTALLED_REFERENCES_TOTAL_BYTES) {
      throw boundsError(pack.id, 'references exceed total bounds')
    }
    return { file, text: text.trim() }
  })
  return { id: pack.id, name: pack.name, skill_markdown: skillMarkdown, references }
}
