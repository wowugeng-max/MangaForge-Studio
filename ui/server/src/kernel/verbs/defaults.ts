import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { kernelRoot } from '../paths'

const BUILTIN_DEFAULTS: Record<string, string[]> = {
  review_chapter: ['oh-story-core.story-review.full'],
  apply_review: ['oh-story-core.story-apply.surgical'],
  deslop_chapter: ['oh-story-core.story-deslop.file'],
  open_book: ['oh-story-core.story-long-write.open'],
  expand_outline: ['oh-story-core.story-long-write.expand'],
  write_chapter: ['oh-story-core.story-long-write.chapter'],
  rewrite_chapter: ['oh-story-core.story-long-write.rewrite'],
  write_continue: ['oh-story-core.story-long-write.continue'],
  adapt_pack: ['mangaforge.adapt-pack.meta'],
}

function defaultsPath(ws: string): string {
  return join(kernelRoot(ws), 'verb-defaults.json')
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}
function sanitizeVerbDefaults(parsed: unknown): Record<string, string[]> | null {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isStringArray(value)) continue
    if (value.length > 0 && value.some((item) => item.length === 0)) continue
    out[key] = [...value]
  }
  return out
}

export function loadVerbDefaults(ws: string): Record<string, string[]> {
  const path = defaultsPath(ws)
  let loaded: Record<string, string[]>
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(BUILTIN_DEFAULTS, null, 2))
    loaded = { ...BUILTIN_DEFAULTS }
  } else {
    try {
      loaded = sanitizeVerbDefaults(JSON.parse(readFileSync(path, 'utf8'))) ?? { ...BUILTIN_DEFAULTS }
    } catch {
      loaded = { ...BUILTIN_DEFAULTS }
    }
  }
  for (const [verb, ids] of Object.entries(BUILTIN_DEFAULTS)) {
    if (!Object.prototype.hasOwnProperty.call(loaded, verb)) loaded[verb] = [...ids]
  }
  return loaded
}

export function saveVerbDefaults(ws: string, defaults: Record<string, string[]>): void {
  const path = defaultsPath(ws)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(defaults, null, 2))
}
