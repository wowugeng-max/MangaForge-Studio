/**
 * Safe project-seed gap fill:
 * - only request missing / thin foundation fields from the model
 * - never overwrite existing non-empty values with empty
 * - only replace a value when the candidate is richer / better
 * - preserve good chapter/volume/foreshadowing outlines
 */

export type SeedGapTarget = {
  key: string
  label: string
  path: string
  reason: string
}

export type AnyRecord = Record<string, any>

export function asObject(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function asArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

export function isPlainObject(value: any) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

const PLACEHOLDER_PATTERNS = [
  /^待补/,
  /^待完善/,
  /^待写/,
  /^暂无/,
  /^TBD$/i,
  /^TODO$/i,
  /^N\/?A$/i,
  /仍需模型补齐/,
  /根据已有线索建立可升级/,
  /待补齐/,
]

export function looksPlaceholder(value: any): boolean {
  if (isEmptyValue(value)) return true
  if (typeof value === 'string') {
    const text = value.trim()
    if (text.length < 4) return true
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text))
  }
  if (Array.isArray(value)) return value.every(item => looksPlaceholder(item))
  if (isPlainObject(value)) {
    const entries = Object.values(value)
    if (!entries.length) return true
    return entries.every(item => looksPlaceholder(item))
  }
  return false
}

export function leafScore(value: any): number {
  if (isEmptyValue(value) || looksPlaceholder(value)) return 0
  if (typeof value === 'string') {
    const text = value.trim()
    // Prefer substantive Chinese/English prose over short labels.
    return Math.min(text.length, 800) + (text.length >= 20 ? 20 : 0) + (text.length >= 80 ? 30 : 0)
  }
  if (typeof value === 'number' || typeof value === 'boolean') return 8
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + leafScore(item), 0) + value.length * 4
  }
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((sum, [key, item]) => {
      if (key === 'source' || key === 'raw_payload') return sum
      return sum + leafScore(item) + 2
    }, 0)
  }
  return 0
}

export function seedValueRichness(value: any): number {
  return leafScore(value)
}

export function isRicherSeedValue(candidate: any, existing: any): boolean {
  if (isEmptyValue(candidate) || looksPlaceholder(candidate)) return false
  if (isEmptyValue(existing) || looksPlaceholder(existing)) return true
  // Never let empty-ish arrays wipe filled arrays.
  if (Array.isArray(existing) && Array.isArray(candidate) && candidate.length < existing.length) {
    // Candidate shorter only wins if existing is clearly placeholder/template thin and candidate denser overall.
    const existingScore = seedValueRichness(existing)
    const candidateScore = seedValueRichness(candidate)
    return candidateScore > existingScore * 1.35
  }
  return seedValueRichness(candidate) > seedValueRichness(existing)
}

const OUTLINE_PROTECTED_KEYS = new Set([
  'chapter_outlines',
  'volume_outlines',
  'foreshadowing_plan',
  'master_outline',
])

const ALWAYS_PRESERVE_KEYS = new Set([
  'raw_idea',
  'derived_at',
  'seed_diagnostics',
  'oh_story_director',
  'ohStoryDirector',
  'author_confirmations',
  'id',
  'draft_id',
])

export function characterKey(item: any) {
  return firstText(item?.name, item?.title, item?.alias).toLowerCase()
}

export function mergeCharacterArrays(existing: any[], incoming: any[]): any[] {
  const result = existing.map(item => asObject(item))
  const indexByName = new Map<string, number>()
  result.forEach((item, index) => {
    const key = characterKey(item)
    if (key) indexByName.set(key, index)
  })
  for (const raw of incoming) {
    const item = asObject(raw)
    const key = characterKey(item)
    if (!key) continue
    const hit = indexByName.get(key)
    if (hit === undefined) {
      result.push(item)
      indexByName.set(key, result.length - 1)
      continue
    }
    result[hit] = mergePreferRicherDeep(result[hit], item).value
  }
  return result
}

export function mergePool(existing: any, incoming: any): any {
  const base = asObject(existing)
  const patch = asObject(incoming)
  const out: AnyRecord = { ...base }
  for (const [tier, value] of Object.entries(patch)) {
    if (isEmptyValue(value)) continue
    const current = base[tier]
    if (Array.isArray(value) || Array.isArray(current)) {
      out[tier] = mergeCharacterArrays(asArray(current), asArray(value))
    } else if (isEmptyValue(current) || looksPlaceholder(current)) {
      out[tier] = value
    } else if (isPlainObject(current) && isPlainObject(value)) {
      out[tier] = mergePreferRicherDeep(current, value).value
    } else if (isRicherSeedValue(value, current)) {
      out[tier] = value
    }
  }
  return out
}

export function mergePreferRicherDeep(existing: any, incoming: any, path = ''): {
  value: any
  filled: string[]
  skipped: string[]
} {
  const filled: string[] = []
  const skipped: string[] = []

  if (isEmptyValue(incoming) || looksPlaceholder(incoming)) {
    if (!isEmptyValue(existing)) skipped.push(path || '(root)')
    return { value: existing, filled, skipped }
  }
  if (isEmptyValue(existing) || looksPlaceholder(existing)) {
    if (!isEmptyValue(incoming) && !looksPlaceholder(incoming)) filled.push(path || '(root)')
    return { value: incoming, filled, skipped }
  }

  // Arrays
  if (Array.isArray(existing) || Array.isArray(incoming)) {
    const existingArr = asArray(existing)
    const incomingArr = asArray(incoming)
    // Character-like arrays: merge by name
    const looksCharacters = existingArr.concat(incomingArr).some(item => characterKey(item))
    if (looksCharacters && /(^|\.)characters$/i.test(path || 'characters')) {
      const merged = mergeCharacterArrays(existingArr, incomingArr)
      if (merged.length > existingArr.length || seedValueRichness(merged) > seedValueRichness(existingArr)) {
        filled.push(path)
      } else {
        skipped.push(path)
      }
      return { value: merged, filled, skipped }
    }
    if (OUTLINE_PROTECTED_KEYS.has(path.split('.').pop() || '')) {
      // Keep good existing outlines unless empty/thin.
      if (existingArr.length > 0 && seedValueRichness(existingArr) >= seedValueRichness(incomingArr) * 0.85) {
        skipped.push(path)
        return { value: existingArr, filled, skipped }
      }
      if (isRicherSeedValue(incomingArr, existingArr)) {
        filled.push(path)
        return { value: incomingArr, filled, skipped }
      }
      skipped.push(path)
      return { value: existingArr, filled, skipped }
    }
    if (isRicherSeedValue(incomingArr, existingArr)) {
      filled.push(path)
      return { value: incomingArr, filled, skipped }
    }
    skipped.push(path)
    return { value: existingArr, filled, skipped }
  }

  // Objects
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const out: AnyRecord = { ...existing }
    for (const [key, candidate] of Object.entries(asObject(incoming))) {
      if (ALWAYS_PRESERVE_KEYS.has(key)) {
        skipped.push(path ? `${path}.${key}` : key)
        continue
      }
      const childPath = path ? `${path}.${key}` : key
      if (key === 'character_pool') {
        const before = seedValueRichness(out[key])
        out[key] = mergePool(out[key], candidate)
        const after = seedValueRichness(out[key])
        if (after > before) filled.push(childPath)
        else skipped.push(childPath)
        continue
      }
      if (key === 'characters') {
        const merged = mergeCharacterArrays(asArray(out[key]), asArray(candidate))
        if (merged.length > asArray(out[key]).length || seedValueRichness(merged) > seedValueRichness(out[key])) {
          filled.push(childPath)
        } else {
          skipped.push(childPath)
        }
        out[key] = merged
        continue
      }
      if (OUTLINE_PROTECTED_KEYS.has(key)) {
        const current = out[key]
        if (!isEmptyValue(current) && !looksPlaceholder(current) && seedValueRichness(current) >= seedValueRichness(candidate) * 0.85) {
          skipped.push(childPath)
          continue
        }
      }
      const child = mergePreferRicherDeep(out[key], candidate, childPath)
      out[key] = child.value
      filled.push(...child.filled)
      skipped.push(...child.skipped)
    }
    return { value: out, filled, skipped }
  }

  // Primitive / mismatched types
  if (isRicherSeedValue(incoming, existing)) {
    filled.push(path || '(root)')
    return { value: incoming, filled, skipped }
  }
  skipped.push(path || '(root)')
  return { value: existing, filled, skipped }
}

export function mergeSeedPreferRicher(existingSeed: any, incomingSeed: any) {
  const existing = asObject(existingSeed)
  const incoming = asObject(incomingSeed)
  // Never allow empty full replacement
  if (!Object.keys(incoming).length) {
    return { seed: existing, filled: [] as string[], skipped: ['(empty_incoming)'] }
  }
  const merged = mergePreferRicherDeep(existing, incoming)
  // Genre hard-lock: keep existing genre if present
  if (firstText(existing.genre) && firstText(incoming.genre) && existing.genre !== incoming.genre) {
    // only replace if existing is placeholder
    if (!looksPlaceholder(existing.genre)) {
      merged.value.genre = existing.genre
      if (!merged.skipped.includes('genre')) merged.skipped.push('genre')
      merged.filled = merged.filled.filter(item => item !== 'genre' && !item.startsWith('genre.'))
    }
  }
  // Title hard-lock when existing is non-empty
  if (firstText(existing.title) && !looksPlaceholder(existing.title)) {
    merged.value.title = existing.title
  }
  return {
    seed: merged.value,
    filled: Array.from(new Set(merged.filled.filter(Boolean))),
    skipped: Array.from(new Set(merged.skipped.filter(Boolean))),
  }
}
