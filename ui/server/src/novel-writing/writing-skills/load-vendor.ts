import { readFileSync } from 'fs'
import { join } from 'path'
import type { WritingSkillId } from './types'

const VENDOR_ROOT = join(import.meta.dir, 'vendor')

const SKILL_DIR: Record<WritingSkillId, string> = {
  'fiction-humanizer-zh': 'fiction-humanizer-zh',
  'remove-ai-flavor': 'remove-ai-flavor',
  'humanizer-zh': 'humanizer-zh',
}

const REFERENCE_FILES: Record<WritingSkillId, readonly string[]> = {
  'fiction-humanizer-zh': [
    'ai-fiction-patterns.md',
    'scene-rewrite.md',
    'chapter-checklist.md',
    'genre-notes.md',
  ],
  'remove-ai-flavor': [],
  'humanizer-zh': [],
}

function resolveVendorRelativePath(id: WritingSkillId, referenceFile?: string): string {
  const dir = SKILL_DIR[id]
  if (!referenceFile) {
    return join(dir, 'SKILL.md')
  }

  const allowed = REFERENCE_FILES[id]
  if (!allowed.includes(referenceFile)) {
    throw new Error(`Invalid vendor reference file for ${id}: ${referenceFile}`)
  }

  return join(dir, 'references', referenceFile)
}

export function stripVendorSkillMarkdown(raw: string): string {
  let text = String(raw || '').replace(/^\uFEFF/, '')
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  text = text.replace(/\r?\n## Optional Local Audit\r?\n[\s\S]*?(?=\r?\n## |\s*$)/i, '\n')
  text = text.replace(/\r?\n## Star\r?\n[\s\S]*$/i, '\n')
  text = text.replace(/\r?\n## 输出格式\r?\n[\s\S]*?(?=\r?\n## |\s*$)/g, '\n')
  text = text.replace(/\r?\n## 质量评分\r?\n[\s\S]*?(?=\r?\n## 完整示例|\r?\n## 参考|\s*$)/g, '\n')
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export function loadVendorSkillMarkdown(id: WritingSkillId, referenceFile?: string): string {
  const rel = resolveVendorRelativePath(id, referenceFile)
  const raw = readFileSync(join(VENDOR_ROOT, rel), 'utf8')
  return stripVendorSkillMarkdown(raw)
}
