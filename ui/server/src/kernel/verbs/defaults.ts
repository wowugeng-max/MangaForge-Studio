import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadKernelContracts } from '../contracts/store'
import { kernelRoot } from '../paths'
import { resolveContractVerb } from './infer'
import { getVerbTemplate } from './registry'

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

export function validateVerbDefaultsPayload(ws: string, input: unknown):
  | { ok: true; defaults: Record<string, string[]> }
  | { ok: false; code: 'CONTRACT_INVALID'; message: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, code: 'CONTRACT_INVALID', message: 'defaults 必须是对象' }
  }
  const defaults = (input as any).defaults ?? input
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return { ok: false, code: 'CONTRACT_INVALID', message: 'defaults 必须是对象' }
  }
  const { contracts } = loadKernelContracts(ws)
  const out: Record<string, string[]> = {}
  for (const [verb, ids] of Object.entries(defaults as Record<string, unknown>)) {
    if (!getVerbTemplate(verb)) return { ok: false, code: 'CONTRACT_INVALID', message: `未知动词 ${verb}` }
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 8 || ids.some(id => typeof id !== 'string' || !id)) {
      return { ok: false, code: 'CONTRACT_INVALID', message: `${verb} 需要 1..8 个合同 id` }
    }
    if (verb === 'adapt_pack') {
      if (ids.length !== 1 || ids[0] !== 'mangaforge.adapt-pack.meta') {
        return { ok: false, code: 'CONTRACT_INVALID', message: 'adapt_pack 默认必须是元合同' }
      }
    }
    for (const id of ids as string[]) {
      const contract = contracts.find(c => c.id === id)
      if (!contract) return { ok: false, code: 'CONTRACT_INVALID', message: `contract not found: ${id}` }
      if (resolveContractVerb(contract) !== verb) {
        return { ok: false, code: 'CONTRACT_INVALID', message: `${id} 不是 ${verb}` }
      }
      if (!contract.implemented) {
        return { ok: false, code: 'CONTRACT_INVALID', message: `${id} 未实现` }
      }
    }
    out[verb] = [...ids as string[]]
  }
  return { ok: true, defaults: out }
}
