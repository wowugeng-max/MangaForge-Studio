import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { kernelRoot } from '../paths'

const BUILTIN_DEFAULTS: Record<string, string[]> = {
  review_chapter: ['oh-story-core.story-review.full'],
  apply_review: ['oh-story-core.story-apply.surgical'],
  deslop_chapter: ['oh-story-core.story-deslop.file'],
  open_book: ['oh-story-core.story-long-write.open'],
}

function defaultsPath(ws: string): string {
  return join(kernelRoot(ws), 'verb-defaults.json')
}

export function loadVerbDefaults(ws: string): Record<string, string[]> {
  const path = defaultsPath(ws)
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(BUILTIN_DEFAULTS, null, 2))
    return { ...BUILTIN_DEFAULTS }
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return typeof parsed === 'object' && parsed ? parsed : { ...BUILTIN_DEFAULTS }
  } catch {
    return { ...BUILTIN_DEFAULTS }
  }
}

export function saveVerbDefaults(ws: string, defaults: Record<string, string[]>): void {
  const path = defaultsPath(ws)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(defaults, null, 2))
}
