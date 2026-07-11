export type CanonicalSurfaceIndex = {
  stable_entities: Array<{
    surface: string
    suffix: string
    chapters: number[]
    source?: string
  }>
}

export type CanonicalContinuityConflict = {
  key: 'canonical_proper_noun_conflict'
  canonical: string
  observed: string
  evidence: string
  message: string
  status: 'fail'
  severity: 'blocking'
}

export const MAX_CANONICAL_SURFACE_ENTITIES = 24
const MAX_SOURCE_TEXT_CHARS = 50000
const IDENTITY_WINDOW_CHARS = 140
const IDENTITY_ASSERTION = /正是|就是|同一家|原来是/g
const SUPPORTED_SUFFIXES = [
  /第[一二三四五六七八九十百千万两0-9]+人民医院/g,
  /战略防卫局/g,
  /制药厂/g,
]

type SurfaceMatch = {
  surface: string
  suffix: string
  start: number
  end: number
}

function compactText(value: any, maxChars = MAX_SOURCE_TEXT_CHARS) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function suffixMatches(text: string) {
  return SUPPORTED_SUFFIXES.flatMap(pattern => {
    pattern.lastIndex = 0
    return Array.from(text.matchAll(pattern)).map(match => ({
      suffix: match[0],
      start: match.index || 0,
    }))
  }).sort((left, right) => left.start - right.start)
}

function prefixForSuffix(text: string, suffixStart: number, suffix: string) {
  const rawBefore = text.slice(Math.max(0, suffixStart - 32), suffixStart)
  const rawSegment = rawBefore.split(/[\s，。！？；：、,.!?;:“”‘’「」『』【】（）()《》<>]/).pop() || ''
  const namedSegment = rawSegment.split(/正式名称是|正式名称为|全称是|全称为|正名为|名为|叫作|称为/).pop() || rawSegment
  const actionMarker = /那是|这是|正是|位于|来自|抵达|前往|来到|返回|进入|走进|冲进|离开|回到|送往|赶往|驶向|转入|转到|踩在了|踩在|停在|落在|站在|坐落于/g
  let segment = namedSegment
  for (const match of namedSegment.matchAll(actionMarker)) {
    segment = namedSegment.slice((match.index || 0) + match[0].length)
  }
  if (suffix.includes('人民医院') || suffix === '战略防卫局') {
    segment = segment.replace(/^.*(?:曾经到过的|到过的|由|在|从|向|于|被|经|据|对|给)/, '')
    return segment.match(/([\p{Script=Han}]{1,6}(?:市|县|区|州|镇|国))$/u)?.[1] || ''
  }
  segment = segment.replace(/^(?:在|从|向|到|去|是|为)/, '')
  segment = segment.split(/[由在从到向于被经据对给]/).pop() || segment
  return segment.match(/([\u4e00-\u9fff0-9一二三四五六七八九十百千万两]{2,8})$/)?.[1] || ''
}

function extractSupportedSurfaces(value: any): SurfaceMatch[] {
  const text = compactText(value)
  if (!text) return []
  const seen = new Set<string>()
  const matches: SurfaceMatch[] = []
  for (const item of suffixMatches(text)) {
    const prefix = prefixForSuffix(text, item.start, item.suffix)
    if (!prefix) continue
    const surface = `${prefix}${item.suffix}`
    const start = item.start - prefix.length
    const fingerprint = `${surface}:${start}`
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    matches.push({ surface, suffix: item.suffix, start, end: item.start + item.suffix.length })
  }
  return matches
}

function sourceTexts(values: any[], limit = 300) {
  const texts: Array<{ text: string; unique: boolean }> = []
  const visit = (value: any, depth: number) => {
    if (texts.length >= limit || depth > 3 || value == null) return
    if (typeof value === 'string' || typeof value === 'number') {
      const text = compactText(value)
      if (text) texts.push({ text, unique: false })
      return
    }
    if (Array.isArray(value)) {
      value.slice(0, limit).forEach(item => visit(item, depth + 1))
      return
    }
    if (typeof value === 'object') {
      const explicitlyUnique = value.unique === true
        || value.is_unique === true
        || value.isUnique === true
        || value.canonical_unique === true
        || value.canonicalUnique === true
      const preferredKeys = ['surface', 'name', 'canonical_name', 'canonicalName', 'official_name', 'officialName', 'fact', 'text', 'summary', 'description']
      for (const key of preferredKeys) {
        if (value[key] == null) continue
        const before = texts.length
        visit(value[key], depth + 1)
        if (explicitlyUnique) {
          for (let index = before; index < texts.length; index += 1) texts[index].unique = true
        }
      }
    }
  }
  values.slice(0, limit).forEach(value => visit(value, 0))
  return texts
}

export function buildCanonicalSurfaceIndex(input: {
  previous_chapters?: any[]
  canon_facts?: any[]
  setting_entities?: any[]
}): CanonicalSurfaceIndex {
  const stable = new Map<string, CanonicalSurfaceIndex['stable_entities'][number]>()
  const priorOccurrences = new Map<string, { suffix: string; chapters: Set<number> }>()
  const previousChapters = Array.isArray(input?.previous_chapters) ? input.previous_chapters : []

  previousChapters.forEach((chapter, index) => {
    const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? index + 1)
    const text = chapter?.chapter_text ?? chapter?.chapterText
    if (!Number.isFinite(chapterNo) || !text) return
    for (const match of extractSupportedSurfaces(text)) {
      const current = priorOccurrences.get(match.surface) || { suffix: match.suffix, chapters: new Set<number>() }
      current.chapters.add(chapterNo)
      priorOccurrences.set(match.surface, current)
    }
  })

  for (const [surface, occurrence] of priorOccurrences) {
    if (occurrence.chapters.size < 2) continue
    stable.set(surface, {
      surface,
      suffix: occurrence.suffix,
      chapters: Array.from(occurrence.chapters).sort((left, right) => left - right).slice(0, 40),
      source: 'previous_chapters',
    })
  }

  const addSingleSource = (values: any[], source: 'canon_fact' | 'setting_entity') => {
    for (const item of sourceTexts(values)) {
      for (const match of extractSupportedSurfaces(item.text)) {
        if (stable.has(match.surface)) continue
        stable.set(match.surface, {
          surface: match.surface,
          suffix: match.suffix,
          chapters: [],
          source: `${source}${item.unique ? ':unique' : ''}`,
        })
        if (stable.size >= MAX_CANONICAL_SURFACE_ENTITIES) return
      }
    }
  }

  addSingleSource(Array.isArray(input?.canon_facts) ? input.canon_facts : [], 'canon_fact')
  if (stable.size < MAX_CANONICAL_SURFACE_ENTITIES) {
    addSingleSource(Array.isArray(input?.setting_entities) ? input.setting_entities : [], 'setting_entity')
  }

  return { stable_entities: Array.from(stable.values()).slice(0, MAX_CANONICAL_SURFACE_ENTITIES) }
}

function conflictEvidence(text: string, observed: SurfaceMatch) {
  const start = Math.max(0, observed.start - IDENTITY_WINDOW_CHARS)
  const end = Math.min(text.length, observed.end + IDENTITY_WINDOW_CHARS)
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 320)
}

function identityTypePattern(suffix: string) {
  if (suffix.includes('人民医院')) return /医院/
  if (suffix === '战略防卫局') return /战略防卫局|(?:那家|同一家|这家)防卫局/
  if (suffix === '制药厂') return /制药厂|(?:那家|同一家|这家)药厂/
  return /$^/
}

function identityBackReferencePattern(suffix: string) {
  if (suffix.includes('人民医院')) return /(?:那家|同一家|这家)[^，。！？；]{0,12}医院/
  if (suffix === '战略防卫局') return /(?:那家|同一家|这家)[^，。！？；]{0,12}(?:战略防卫局|防卫局)/
  if (suffix === '制药厂') return /(?:那家|同一家|这家)[^，。！？；]{0,12}(?:制药厂|药厂)/
  return /$^/
}

const IDENTITY_EXCLUSION = /另一家|新设|新建|旁边|另一处|区别|不同|不是/
const IDENTITY_SUBJECT_SHIFT = /门前|对面|旁边|附近|另一处|楼下|街口|周边|外侧|入口|后方|前方/
const SENTENCE_DELIMITERS = ['。', '！', '？', '；']

function sentenceBounds(text: string, position: number) {
  const start = Math.max(...SENTENCE_DELIMITERS.map(delimiter => text.lastIndexOf(delimiter, position - 1))) + 1
  const following = SENTENCE_DELIMITERS
    .map(delimiter => text.indexOf(delimiter, position))
    .filter(index => index >= 0)
  const delimiterIndex = following.length ? Math.min(...following) : text.length
  return { start, end: delimiterIndex, nextStart: Math.min(text.length, delimiterIndex + 1) }
}

function hasLinkedIdentityAssertion(text: string, observed: SurfaceMatch, canonicalSurface: string) {
  const observedSentenceBounds = sentenceBounds(text, observed.start)
  const observedSentence = text.slice(observedSentenceBounds.start, observedSentenceBounds.end)
  const observedEndInSentence = Math.max(0, observed.end - observedSentenceBounds.start)
  const afterObserved = observedSentence.slice(observedEndInSentence)
  IDENTITY_ASSERTION.lastIndex = 0
  const sameSentenceAssertion = Array.from(afterObserved.matchAll(IDENTITY_ASSERTION))
    .some(assertion => {
      const prefix = afterObserved.slice(0, assertion.index || 0).replace(/\s+/g, '')
      const predicate = afterObserved.slice((assertion.index || 0) + assertion[0].length)
      return prefix.length <= 12
        && !IDENTITY_SUBJECT_SHIFT.test(prefix)
        && !IDENTITY_EXCLUSION.test(afterObserved)
        && (identityBackReferencePattern(observed.suffix).test(predicate) || predicate.includes(canonicalSurface))
    })
  if (sameSentenceAssertion) return true

  const beforeObserved = observedSentence.slice(0, Math.max(0, observed.start - observedSentenceBounds.start))
  IDENTITY_ASSERTION.lastIndex = 0
  const precedingAssertions = Array.from(beforeObserved.matchAll(IDENTITY_ASSERTION))
  const precedingAssertion = precedingAssertions[precedingAssertions.length - 1]
  if (precedingAssertion) {
    const subject = beforeObserved.slice(0, precedingAssertion.index || 0).trim()
    const bridge = beforeObserved.slice((precedingAssertion.index || 0) + precedingAssertion[0].length)
    const afterObservedRelation = observedSentence.slice(observedEndInSentence).trim()
    if (/^[“”"'‘’「」『』【】（）()]*这$/.test(subject)
      && bridge.length <= 20
      && !/[，。！？；：]/.test(bridge)
      && !IDENTITY_SUBJECT_SHIFT.test(bridge)
      && !IDENTITY_EXCLUSION.test(bridge)
      && !/^(?:门前|旁边|对面|附近|楼下|街口|周边|外侧|入口)/.test(afterObservedRelation)) return true
  }

  const nextBounds = sentenceBounds(text, observedSentenceBounds.nextStart)
  const nextSentence = text.slice(nextBounds.start, nextBounds.end).trim()
  if (!/^[“”"'‘’「」『』【】（）()]*这/.test(nextSentence)) return false
  IDENTITY_ASSERTION.lastIndex = 0
  return IDENTITY_ASSERTION.test(nextSentence)
    && identityBackReferencePattern(observed.suffix).test(nextSentence)
    && identityTypePattern(observed.suffix).test(nextSentence)
    && !IDENTITY_EXCLUSION.test(nextSentence)
}

export function scanCanonicalContinuityConflicts(
  text: string,
  index: CanonicalSurfaceIndex,
): CanonicalContinuityConflict[] {
  const prose = compactText(text, 200000)
  if (!prose) return []
  const canonicalEntities = Array.isArray(index?.stable_entities) ? index.stable_entities.slice(0, MAX_CANONICAL_SURFACE_ENTITIES) : []
  const observedSurfaces = extractSupportedSurfaces(prose)
  const conflicts: CanonicalContinuityConflict[] = []
  const seen = new Set<string>()

  for (const observed of observedSurfaces) {
    for (const canonical of canonicalEntities) {
      if (!canonical?.surface || canonical.surface === observed.surface || canonical.suffix !== observed.suffix) continue
      const evidence = conflictEvidence(prose, observed)
      const hasIdentityAssertion = hasLinkedIdentityAssertion(prose, observed, canonical.surface)
      const explicitUniqueConflict = String(canonical.source || '').endsWith(':unique')
      if (!hasIdentityAssertion && !explicitUniqueConflict) continue
      const fingerprint = `${canonical.surface}:${observed.surface}`
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)
      conflicts.push({
        key: 'canonical_proper_noun_conflict',
        canonical: canonical.surface,
        observed: observed.surface,
        evidence,
        message: `专名连续性冲突：前文稳定名称为“${canonical.surface}”，当前写成“${observed.surface}”${hasIdentityAssertion ? '并断言为同一实体' : '，与唯一正史名称冲突'}`,
        status: 'fail',
        severity: 'blocking',
      })
    }
  }

  return conflicts
}
