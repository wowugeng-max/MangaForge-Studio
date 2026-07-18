export type EstablishedEventKind =
  | 'death'
  | 'injury'
  | 'rule_trigger'
  | 'ability_cost'
  | 'identity_reveal'
  | 'item_transfer'
  | 'promise'
  | 'secret_known'
  | 'other'

export type EstablishedEvent = {
  id: string
  chapter_no: number
  kind: EstablishedEventKind
  subject: string
  predicate: string
  fact: string
  cause?: string
  mechanism?: string
  constraints?: string[]
  aliases?: string[]
  source_excerpt: string
  lock_level: 'soft' | 'hard'
  status: 'candidate' | 'confirmed' | 'superseded'
  mutable: false
  confidence: number
  last_seen_chapter?: number
  tags?: string[]
}

export type EstablishedEventConflict = {
  key: 'established_event_conflict'
  subject: string
  predicate: string
  canonical_fact: string
  observed_fact: string
  evidence: string
  message: string
  status: 'warn'
  severity: 'high'
}

const KIND_SET = new Set<EstablishedEventKind>([
  'death',
  'injury',
  'rule_trigger',
  'ability_cost',
  'identity_reveal',
  'item_transfer',
  'promise',
  'secret_known',
  'other',
])

const AUTO_CONFIRM_KINDS = new Set<EstablishedEventKind>(['death', 'rule_trigger'])

function compact(value: any, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function slug(value: string) {
  return compact(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'event'
}

function tokens(value: string) {
  const text = compact(value, 300)
  const parts = text
    .replace(/[，。！？；：、“”‘’（）()【】\[\]<>《》·]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
  const grams: string[] = []
  for (const part of parts) {
    if (/[\u4e00-\u9fff]/.test(part)) {
      const maxN = Math.min(4, part.length)
      for (let n = 2; n <= maxN; n++) {
        for (let i = 0; i <= part.length - n; i++) {
          grams.push(part.slice(i, i + n))
        }
      }
    } else {
      grams.push(part)
    }
  }
  return Array.from(new Set([...parts, ...grams]))
}

const GENERIC_FACT_TOKENS = new Set([
  '死亡', '而死', '死了', '死法', '身亡', '死去', '被', '因为', '由于', '导致',
  '剥皮', '拧', '杀死', '致死', '方式', '规则', '触发', '发生',
])

function distinctiveTokens(value: string) {
  return tokens(value).filter((token) => {
    if (token.length < 2) return false
    if (GENERIC_FACT_TOKENS.has(token)) return false
    if (/^死/.test(token) && token.length <= 2) return false
    return true
  })
}

function sharesContent(a: string, b: string, distinctive = false) {
  const left = compact(a)
  const right = compact(b)
  if (!left || !right) return true
  if (left === right) return true
  if (!distinctive && (left.includes(right) || right.includes(left))) return true
  const leftList = distinctive ? distinctiveTokens(left) : tokens(left)
  const rightList = distinctive ? distinctiveTokens(right) : tokens(right)
  const leftTokens = new Set(leftList)
  if (!leftList.length || !rightList.length) {
    // if filtering removed everything, allow non-distinctive includes only
    return left.includes(right) || right.includes(left)
  }
  return rightList.some((token) => token.length >= 2 && leftTokens.has(token))
}

function identityKey(event: EstablishedEvent) {
  return `${compact(event.subject).toLowerCase()}::${compact(event.predicate).toLowerCase()}`
}

export function normalizeEstablishedEvent(raw: any, fallbackChapterNo = 0): EstablishedEvent | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    // bare strings lack source evidence and must not enter the ledger
    return null
  }

  const fact = compact(raw?.fact || raw?.text || raw?.summary)
  const sourceExcerpt = compact(raw?.source_excerpt || raw?.sourceExcerpt || raw?.evidence)
  if (!fact || !sourceExcerpt) return null

  const kindRaw = compact(raw?.kind || 'other') as EstablishedEventKind
  const kind = KIND_SET.has(kindRaw) ? kindRaw : 'other'
  const subject = compact(raw?.subject || raw?.name || raw?.who, 80)
  const predicate = compact(raw?.predicate || raw?.aspect || '关键事实', 80)
  const confidence = Number.isFinite(Number(raw?.confidence))
    ? Math.max(0, Math.min(1, Number(raw.confidence)))
    : 0.6
  const chapterNo = Number(raw?.chapter_no || raw?.chapterNo || fallbackChapterNo || 0) || 0
  const statusRaw = compact(raw?.status)
  const autoConfirm = AUTO_CONFIRM_KINDS.has(kind) && confidence >= 0.85
  const status = statusRaw === 'superseded'
    ? 'superseded'
    : statusRaw === 'confirmed' || autoConfirm
      ? 'confirmed'
      : 'candidate'
  const lockRaw = compact(raw?.lock_level || raw?.lockLevel)
  const lockLevel = lockRaw === 'soft'
    ? 'soft'
    : AUTO_CONFIRM_KINDS.has(kind) || status === 'confirmed' || lockRaw === 'hard'
      ? 'hard'
      : 'soft'
  const id = compact(raw?.id)
    || `evt_ch${String(chapterNo).padStart(2, '0')}_${slug(subject)}_${slug(predicate)}`

  return {
    id,
    chapter_no: chapterNo,
    kind,
    subject: subject || '未命名主体',
    predicate: predicate || '关键事实',
    fact,
    cause: compact(raw?.cause) || undefined,
    mechanism: compact(raw?.mechanism) || undefined,
    constraints: Array.from(new Set(asArray(raw?.constraints).map((item) => compact(item)).filter(Boolean))).slice(0, 8),
    aliases: Array.from(new Set(asArray(raw?.aliases).map((item) => compact(item, 40)).filter(Boolean))).slice(0, 8),
    source_excerpt: sourceExcerpt,
    lock_level: lockLevel,
    status,
    mutable: false,
    confidence,
    last_seen_chapter: Number(raw?.last_seen_chapter || raw?.lastSeenChapter || chapterNo) || chapterNo || undefined,
    tags: Array.from(new Set(asArray(raw?.tags).map((item) => compact(item, 40)).filter(Boolean))).slice(0, 8),
  }
}

function isCompatible(a: EstablishedEvent, b: EstablishedEvent) {
  if (a.kind === 'death' && b.kind === 'death') {
    if (a.cause && b.cause) return sharesContent(a.cause, b.cause, true)
    if (a.mechanism && b.mechanism) return sharesContent(a.mechanism, b.mechanism, true)
    const aSide = compact([a.cause, a.mechanism, a.fact].filter(Boolean).join(' '))
    const bSide = compact([b.cause, b.mechanism, b.fact].filter(Boolean).join(' '))
    return sharesContent(aSide, bSide, true)
  }
  if (a.kind === 'rule_trigger' && b.kind === 'rule_trigger') {
    return sharesContent(
      compact([a.cause, a.mechanism, a.fact].filter(Boolean).join(' ')),
      compact([b.cause, b.mechanism, b.fact].filter(Boolean).join(' ')),
      true,
    )
  }
  if (sharesContent(a.fact, b.fact, true)) return true
  if (a.mechanism && b.mechanism) return sharesContent(a.mechanism, b.mechanism, true)
  if (a.cause && b.cause) return sharesContent(a.cause, b.cause, true)
  return sharesContent(a.fact, b.fact, false)
}

function richer(base: EstablishedEvent, incoming: EstablishedEvent): EstablishedEvent {
  const compatible = isCompatible(base, incoming)
  return {
    ...base,
    fact: compatible && compact(incoming.fact).length > compact(base.fact).length ? incoming.fact : base.fact,
    cause: base.cause || incoming.cause,
    mechanism: base.mechanism || incoming.mechanism,
    constraints: Array.from(new Set([...(base.constraints || []), ...(incoming.constraints || [])])).slice(0, 8),
    aliases: Array.from(new Set([...(base.aliases || []), ...(incoming.aliases || [])])).slice(0, 8),
    source_excerpt: base.source_excerpt || incoming.source_excerpt,
    confidence: Math.max(base.confidence, incoming.confidence),
    status: base.status === 'confirmed' || incoming.status === 'confirmed' ? 'confirmed' : base.status,
    lock_level: base.lock_level === 'hard' || incoming.lock_level === 'hard' ? 'hard' : 'soft',
    last_seen_chapter: Math.max(
      base.last_seen_chapter || 0,
      incoming.last_seen_chapter || 0,
      base.chapter_no,
      incoming.chapter_no,
    ) || undefined,
    tags: Array.from(new Set([...(base.tags || []), ...(incoming.tags || [])])).slice(0, 8),
  }
}

export function mergeEstablishedEvents(
  previous: any[] = [],
  incoming: any[] = [],
  options: { chapterNo?: number } = {},
): EstablishedEvent[] {
  const chapterNo = Number(options.chapterNo || 0) || 0
  const map = new Map<string, EstablishedEvent>()

  for (const raw of previous) {
    const event = normalizeEstablishedEvent(raw, chapterNo)
    if (!event || event.status === 'superseded') continue
    map.set(identityKey(event), event)
  }

  for (const raw of incoming) {
    const event = normalizeEstablishedEvent(raw, chapterNo)
    if (!event || event.status === 'superseded') continue
    const key = identityKey(event)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, event)
      continue
    }
    if (existing.status === 'confirmed' && !isCompatible(existing, event)) {
      continue
    }
    if (event.confidence < existing.confidence && !isCompatible(existing, event)) {
      continue
    }
    map.set(key, richer(existing, event))
  }

  return Array.from(map.values())
    .sort((a, b) => (a.chapter_no - b.chapter_no) || a.id.localeCompare(b.id))
}

export function projectCanonFactsFromEvents(events: any[] = [], limit = 12): string[] {
  return mergeEstablishedEvents(events, [])
    .filter((event) => event.status !== 'superseded')
    .slice(0, limit)
    .map((event) => {
      const bits = [event.fact]
      if (event.mechanism) bits.push(`机制:${event.mechanism}`)
      if (event.chapter_no) bits.push(`@第${event.chapter_no}章`)
      return bits.join(' · ')
    })
}

export function selectEstablishedEventsForChapter(args: {
  events?: any[]
  chapterNo?: number
  outlineText?: string
  previousExcerpt?: string
  limit?: number
}): EstablishedEvent[] {
  const all = mergeEstablishedEvents(args.events || [], [])
  const limit = Math.max(1, Number(args.limit || 10))
  const haystack = compact(`${args.outlineText || ''} ${args.previousExcerpt || ''}`, 4000)
  const flashbackSensitive = /回忆|闪回|前两任|前任|当初|那时|死法|死亡|规则是|非整点|禁门/.test(haystack)
  const scored = all.map((event) => {
    let score = 0
    if (event.lock_level === 'hard') score += 5
    if (event.status === 'confirmed') score += 3
    if ((event.tags || []).includes('flashback_sensitive')) score += 4
    if (flashbackSensitive && (event.kind === 'death' || event.kind === 'rule_trigger')) score += 4
    if (args.chapterNo && event.chapter_no && Number(args.chapterNo) - event.chapter_no <= 5) score += 2
    if (haystack && (haystack.includes(event.subject) || (event.aliases || []).some((alias) => haystack.includes(alias)))) {
      score += 3
    }
    return { event, score }
  })
  return scored
    .sort((a, b) => b.score - a.score || a.event.chapter_no - b.event.chapter_no)
    .slice(0, limit)
    .map((item) => item.event)
}

export function scanEstablishedEventConflicts(args: {
  chapterText?: string
  events?: any[]
}): EstablishedEventConflict[] {
  const text = compact(args.chapterText, 20000)
  if (!text) return []
  const events = mergeEstablishedEvents(args.events || [], [])
    .filter((event) => event.status === 'confirmed' && event.lock_level === 'hard')
  const conflicts: EstablishedEventConflict[] = []

  for (const event of events) {
    const mentioned = text.includes(event.subject)
      || (event.aliases || []).some((alias) => Boolean(alias) && text.includes(alias))
    if (!mentioned) continue

    const anchors = [event.mechanism, event.cause, ...(event.constraints || [])]
      .map((item) => compact(item, 40))
      .filter((item) => item.length >= 2)
    if (!anchors.length) continue

    const hit = anchors.some((anchor) => text.includes(anchor))
    if (hit) continue

    const restating = event.kind === 'death'
      ? /死|剥皮|拧|尸|身亡|死法/.test(text)
      : event.kind === 'rule_trigger'
        ? /规则|禁|不能|触发/.test(text)
        : /当时|当初|记得|回忆/.test(text)
    if (!restating) continue

    const idx = text.indexOf(event.subject)
    conflicts.push({
      key: 'established_event_conflict',
      subject: event.subject,
      predicate: event.predicate,
      canonical_fact: event.fact,
      observed_fact: compact(text.slice(Math.max(0, idx), Math.max(0, idx) + 80), 120),
      evidence: `已锁正史：${event.fact}；正文复述未命中约束：${anchors.join(' / ')}`,
      message: `正文复述可能改写已锁正史事件：${event.subject} ${event.predicate}`,
      status: 'warn',
      severity: 'high',
    })
  }

  return conflicts.slice(0, 8)
}

export function summarizeEstablishedEvents(events: any[] = []) {
  const list = mergeEstablishedEvents(events, [])
  const confirmed = list.filter((item) => item.status === 'confirmed')
  const candidate = list.filter((item) => item.status === 'candidate')
  return {
    total: list.length,
    confirmed_count: confirmed.length,
    candidate_count: candidate.length,
    hard_count: list.filter((item) => item.lock_level === 'hard').length,
    preview: projectCanonFactsFromEvents(confirmed.length ? confirmed : list, 5),
  }
}
