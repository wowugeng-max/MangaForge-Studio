/**
 * System-level canonical name guard.
 *
 * Prevents rare near-miss name slips (e.g. 林序 → 林晓) from surviving into stored prose.
 * Deterministic repair only: never invents names, never renames established multi-mention cast.
 */

import { isPlausiblePersonName } from './character-card-sync-shared'

export const CANONICAL_NAME_GUARD_VERSION = 'canonical_name_guard_v1'

export type CanonicalNameRepair = {
  from: string
  to: string
  count: number
  reason: string
}

export type CanonicalNameGuardReport = {
  version: string
  changed: boolean
  repairs: CanonicalNameRepair[]
  canon_names: string[]
}

function compactName(value: any) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function isHanPersonName(value: string) {
  return isPlausiblePersonName(value)
}

/** Same surname + exactly one char different, length 2–3. */
export function isNearMissPersonName(left: string, right: string): boolean {
  const a = compactName(left)
  const b = compactName(right)
  if (!a || !b || a === b) return false
  if (a.length !== b.length) return false
  if (a.length < 2 || a.length > 3) return false
  if (a[0] !== b[0]) return false
  let diffs = 0
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) diffs += 1
    if (diffs > 1) return false
  }
  return diffs === 1
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Chinese has no spaces: do not use "non-Han boundary".
 * Only skip replacements that sit inside a longer known name span.
 */
function isInsideLongerKnownName(
  text: string,
  index: number,
  name: string,
  knownNames: string[] = [],
): boolean {
  for (const long of knownNames) {
    if (!long || long === name || long.length <= name.length) continue
    if (!long.includes(name)) continue
    // long starts with name: reject if text has long at index
    if (long.startsWith(name) && text.startsWith(long, index)) return true
    // long ends with name: reject if text has long ending at index+name.length
    if (long.endsWith(name)) {
      const start = index - (long.length - name.length)
      if (start >= 0 && text.startsWith(long, start)) return true
    }
    // long contains name mid: check windows
    const at = long.indexOf(name)
    if (at > 0) {
      const start = index - at
      if (start >= 0 && text.startsWith(long, start)) return true
    }
  }
  return false
}

/** Count name mentions that are not embedded in longer known names. */
export function countStandaloneNameMentions(
  text: string,
  name: string,
  knownNames: string[] = [],
): number {
  const target = compactName(name)
  const source = String(text || '')
  if (!target || !source) return 0
  const re = new RegExp(escapeRegExp(target), 'g')
  let count = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    if (isInsideLongerKnownName(source, match.index, target, knownNames)) continue
    count += 1
  }
  return count
}

function replaceStandaloneName(
  text: string,
  from: string,
  to: string,
  knownNames: string[] = [],
): { text: string; count: number } {
  const source = String(text || '')
  const fromName = compactName(from)
  const toName = compactName(to)
  if (!source || !fromName || !toName || fromName === toName) return { text: source, count: 0 }
  const re = new RegExp(escapeRegExp(fromName), 'g')
  let count = 0
  const next = source.replace(re, (matched, offset: number) => {
    if (isInsideLongerKnownName(source, offset, fromName, knownNames)) return matched
    count += 1
    return toName
  })
  return { text: next, count }
}

/** Collect high-priority canon names from characters / context package. */
export function collectCanonCharacterNames(input: {
  characters?: any[]
  contextPackage?: any
  project?: any
  extraNames?: any[]
} = {}): string[] {
  const bag = new Set<string>()
  const push = (raw: any, force = false) => {
    const name = compactName(raw)
    if (!name) return
    if (!force && !isHanPersonName(name)) return
    if (force && !/^[\u4e00-\u9fff]{2,4}$/.test(name)) return
    bag.add(name)
  }

  const pushEntity = (entity: any) => {
    if (!entity) return
    if (typeof entity === 'string') {
      push(entity, true)
      return
    }
    const role = String(entity.role_type || entity.roleType || entity.role || entity.raw_role_group || '').toLowerCase()
    const force = /protagonist|main|主角|核心/.test(role)
    push(entity.name, force)
    push(entity.canonical_name || entity.canonicalName, force)
    for (const alias of entity.aliases || entity.alias_names || entity.aliasNames || []) push(alias, false)
  }

  for (const item of input.characters || []) pushEntity(item)
  for (const item of input.extraNames || []) push(item, true)

  const ctx = input.contextPackage || {}
  for (const item of ctx.characters || ctx.character_cards || ctx.characterCards || []) pushEntity(item)
  for (const item of ctx.cast || ctx.named_cast || ctx.namedCast || []) pushEntity(item)
  push(ctx.protagonist_name || ctx.protagonistName, true)
  push(ctx.project_context?.protagonist_name || ctx.projectContext?.protagonistName, true)
  push(ctx.project_context?.protagonist || ctx.projectContext?.protagonist, true)

  const project = input.project || {}
  for (const item of project.characters || []) pushEntity(item)
  push(project.protagonist_name || project.protagonistName, true)

  return [...bag].sort((a, b) => b.length - a.length || a.localeCompare(b))
}

/**
 * Repair rare near-miss slips against established canon names.
 *
 * Rule (system-wide):
 * - canon must already appear in chapter
 * - candidate is near-miss of canon
 * - candidate mentions are rare (≤2) and strictly fewer than canon mentions
 */
export function repairCanonicalNameNearMisses(
  text: string,
  canonNames: string[] = [],
  options: { maxRepairs?: number } = {},
): { text: string; report: CanonicalNameGuardReport } {
  const source = String(text || '')
  const canon = [...new Set((canonNames || []).map(compactName).filter(Boolean))]
    .filter((name) => isHanPersonName(name) || /^[\u4e00-\u9fff]{2,4}$/.test(name))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))

  const report: CanonicalNameGuardReport = {
    version: CANONICAL_NAME_GUARD_VERSION,
    changed: false,
    repairs: [],
    canon_names: canon.slice(0, 24),
  }
  if (!source.trim() || !canon.length) return { text: source, report }

  const knownNames = new Set<string>(canon)
  // Candidate pool: scan overlapping 2–3 char windows (Chinese has no spaces).
  const candidateCounts = new Map<string, number>()
  const chars = Array.from(source)
  for (let i = 0; i < chars.length; i += 1) {
    for (const len of [2, 3]) {
      if (i + len > chars.length) continue
      const token = chars.slice(i, i + len).join('')
      if (!/^[一-鿿]+$/.test(token)) continue
      if (!isHanPersonName(token)) continue
      if (candidateCounts.has(token)) continue
      const count = countStandaloneNameMentions(source, token, [...knownNames])
      if (count > 0) candidateCounts.set(token, count)
    }
  }

  let working = source
  const maxRepairs = Math.max(1, Math.min(12, Number(options.maxRepairs || 8) || 8))

  for (const canonName of canon) {
    if (report.repairs.length >= maxRepairs) break
    const known = [...knownNames]
    const canonCount = countStandaloneNameMentions(working, canonName, known)
    if (canonCount <= 0) continue

    for (const [candidate, candidateCount0] of [...candidateCounts.entries()]) {
      if (report.repairs.length >= maxRepairs) break
      if (candidate === canonName) continue
      if (!isNearMissPersonName(candidate, canonName)) continue
      const candidateCount = countStandaloneNameMentions(working, candidate, known)
      if (candidateCount <= 0) continue
      // Rare slip only: ≤2 mentions, and rarer than canon.
      if (candidateCount > 2) continue
      if (candidateCount >= canonCount) continue
      if (canonCount < 2 && candidateCount > 1) continue

      const replaced = replaceStandaloneName(working, candidate, canonName, known)
      if (!replaced.count) continue
      working = replaced.text
      knownNames.add(canonName)
      report.repairs.push({
        from: candidate,
        to: canonName,
        count: replaced.count,
        reason: 'rare_near_miss_name_slip',
      })
      candidateCounts.delete(candidate)
    }
  }

  report.changed = report.repairs.length > 0
  return { text: working, report }
}

export function applyCanonicalNameGuard(
  text: string,
  input: {
    characters?: any[]
    contextPackage?: any
    project?: any
    extraNames?: any[]
  } = {},
): { text: string; report: CanonicalNameGuardReport } {
  const canon = collectCanonCharacterNames(input)
  return repairCanonicalNameNearMisses(text, canon)
}
