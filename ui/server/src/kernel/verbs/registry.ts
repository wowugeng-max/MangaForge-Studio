import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateVerbTemplate, type VerbTemplate } from './schema'

export const IMPLEMENTED_VERBS = [
  'open_book', 'review_chapter', 'apply_review', 'deslop_chapter', 'expand_outline', 'write_chapter',
] as const

const TEMPLATES_DIR = join(import.meta.dir, 'templates')
let cache: Map<string, VerbTemplate> | null = null

export function loadVerbTemplates(): Map<string, VerbTemplate> {
  if (cache) return cache
  const map = new Map<string, VerbTemplate>()
  for (const file of readdirSync(TEMPLATES_DIR).filter(name => name.endsWith('.json')).sort()) {
    const template = validateVerbTemplate(JSON.parse(readFileSync(join(TEMPLATES_DIR, file), 'utf8')))
    if (template.verb !== file.replace(/\.json$/, '')) {
      throw new Error(`verb template filename mismatch: ${file} declares ${template.verb}`)
    }
    map.set(template.verb, template)
  }
  cache = map
  return map
}

export function getVerbTemplate(verb: string): VerbTemplate | null {
  return loadVerbTemplates().get(verb) || null
}
