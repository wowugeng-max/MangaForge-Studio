/**
 * Established-event → relation change nodes, and foreshadow chapter-window expiry.
 * Kept separate from the main story-relations module for clarity and testability.
 */

export type RelationChangeNode = {
  chapter_no: number | null
  note: string
  event_id?: string
  kind?: string
}

export type StoryRelationLike = {
  party_a: string
  party_b: string
  start_chapter_no?: number | null
  change_nodes?: Array<{ chapter_no?: number | null; note: string }>
  [key: string]: any
}

export type ForeshadowLike = {
  name?: string
  summary?: string
  lifecycle: '未埋' | '已埋' | '已回收' | '已过期' | '章钩子' | string
  importance?: string
  plant_chapter_no?: number | null
  expected_resolve_chapter_no?: number | null
  is_chapter_hook?: boolean
  [key: string]: any
}

function text(value: any, limit = 0) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  return limit > 0 && raw.length > limit ? `${raw.slice(0, limit)}…` : raw
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function asObject(value: any): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value
  return {}
}

function chapterNoFromText(value: any): number | null {
  const raw = text(value, 120)
  const match = raw.match(/第\s*(\d+)\s*章/)
  if (match) return Number(match[1]) || null
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : null
}

const RELATION_EVENT_KINDS = new Set([
  'death', 'injury', 'item_transfer', 'alliance', 'betrayal', 'conflict',
  'relation', 'relationship', 'rescue', 'capture', 'deal', 'threat',
  'confrontation', 'cooperation', 'romance', 'reveal', 'rule_trigger',
])

export function listEstablishedEvents(storyState: any = []): any[] {
  const state = asObject(storyState)
  return asArray(state.established_events || state.canon_facts || state.establishedEvents)
    .map(item => (item && typeof item === 'object' ? item : null))
    .filter(Boolean)
}

function eventTextBlob(event: any) {
  return text([
    event?.subject,
    event?.predicate,
    event?.fact,
    event?.cause,
    event?.mechanism,
    ...asArray(event?.aliases),
    ...asArray(event?.tags),
    ...asArray(event?.constraints),
    event?.source_excerpt,
  ].filter(Boolean).join(' '), 800)
}

function nameMentioned(blob: string, name: string) {
  const n = text(name, 40)
  if (!n || !blob) return false
  return n.length >= 2 && blob.includes(n)
}

/** Map established_events onto a relation pair as change nodes. */
export function collectRelationChangeNodesFromEvents(input: {
  party_a: string
  party_b: string
  events?: any[]
} = {}): RelationChangeNode[] {
  const partyA = text(input.party_a, 40)
  const partyB = text(input.party_b, 40)
  if (!partyA || !partyB) return []
  const nodes: RelationChangeNode[] = []
  const seen = new Set<string>()
  for (const event of asArray(input.events)) {
    const chapterNo = Number(event?.chapter_no || event?.last_seen_chapter || 0)
      || chapterNoFromText(event?.fact)
      || null
    const subject = text(event?.subject, 40)
    const blob = eventTextBlob(event)
    const aIn = subject === partyA || nameMentioned(blob, partyA)
    const bIn = subject === partyB || nameMentioned(blob, partyB)
    if (!(aIn && bIn)) continue
    const kind = text(event?.kind || event?.type, 40)
    if (kind && !RELATION_EVENT_KINDS.has(kind) && subject !== partyA && subject !== partyB) continue
    const note = text(
      event?.fact
      || [subject, event?.predicate].filter(Boolean).join('')
      || blob,
      160,
    )
    if (!note) continue
    const key = `${chapterNo || 0}:${note}`
    if (seen.has(key)) continue
    seen.add(key)
    nodes.push({
      chapter_no: chapterNo,
      note,
      event_id: text(event?.id, 80) || undefined,
      kind: kind || undefined,
    })
  }
  return nodes
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0) || a.note.localeCompare(b.note, 'zh'))
    .slice(-12)
}

export function attachChangeNodesFromEstablishedEvents<T extends StoryRelationLike>(
  rows: T[],
  events: any[] = [],
): T[] {
  if (!rows.length || !events.length) return rows
  return rows.map(row => {
    const fromEvents = collectRelationChangeNodesFromEvents({
      party_a: row.party_a,
      party_b: row.party_b,
      events,
    })
    if (!fromEvents.length) return row
    const prev = asArray(row.change_nodes)
    const merged: Array<{ chapter_no?: number | null; note: string }> = [...prev]
    const seen = new Set(prev.map(item => `${item?.chapter_no || 0}:${text(item?.note, 160)}`))
    for (const item of fromEvents) {
      const key = `${item.chapter_no || 0}:${item.note}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ chapter_no: item.chapter_no, note: item.note })
    }
    const start = row.start_chapter_no
      || fromEvents.map(item => Number(item.chapter_no || 0)).filter(Boolean).sort((a, b) => a - b)[0]
      || null
    return {
      ...row,
      start_chapter_no: start,
      change_nodes: merged
        .filter(item => text(item?.note, 120))
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(-12),
    }
  })
}

export function foreshadowOpenWindowChapters(importance?: string) {
  const value = text(importance, 8)
  if (value === '高' || /high/i.test(value)) return 12
  if (value === '低' || /low/i.test(value)) return 30
  return 20
}

export function inferForeshadowPlantChapter(summary: string, fallback: number | null = null) {
  const raw = text(summary, 280)
  const planted = raw.match(/(?:第\s*(\d+)\s*章).{0,12}(?:埋|铺垫|发现|出现)/)
  if (planted) return Number(planted[1]) || fallback
  const any = chapterNoFromText(raw)
  return any || fallback
}

export function inferForeshadowExpectedResolveChapter(
  summary: string,
  plant: number | null,
  importance?: string,
) {
  const raw = text(summary, 280)
  const due = raw.match(/(?:预计|计划|将于|应在)?.{0,4}第\s*(\d+)\s*章.{0,8}(?:回收|揭晓|兑现|结算|爆发)/)
  if (due) return Number(due[1]) || null
  const resolveWord = raw.match(/第\s*(\d+)\s*章(?:前|左右)?(?:回收|揭晓)/)
  if (resolveWord) return Number(resolveWord[1]) || null
  if (plant && plant > 0) return plant + foreshadowOpenWindowChapters(importance)
  return null
}

export function applyForeshadowChapterWindow<T extends ForeshadowLike>(
  row: T,
  lastWrittenNo: number,
): T {
  if (row.is_chapter_hook || row.lifecycle === '章钩子') return row
  if (row.lifecycle === '已回收') return row

  const plant = row.plant_chapter_no || inferForeshadowPlantChapter(String(row.summary || ''), null)
  const expected = row.expected_resolve_chapter_no
    || inferForeshadowExpectedResolveChapter(String(row.summary || ''), plant, row.importance)
  const grace = 2
  const window = foreshadowOpenWindowChapters(row.importance)
  let lifecycle = row.lifecycle
  let expired = false

  if (lastWrittenNo > 0) {
    if (expected && lastWrittenNo > expected + grace) expired = true
    else if (!expected && plant && lastWrittenNo > plant + window) expired = true
  }

  if (expired && lifecycle !== '已过期') lifecycle = '已过期'
  return {
    ...row,
    plant_chapter_no: plant,
    expected_resolve_chapter_no: expected,
    lifecycle,
  }
}

export function countDueSoonForeshadow(rows: ForeshadowLike[], lastWrittenNo: number) {
  return rows.filter(item => {
    if (!(item.lifecycle === '已埋' || item.lifecycle === '未埋')) return false
    const due = Number(item.expected_resolve_chapter_no || 0)
    return due > 0 && lastWrittenNo > 0 && due - lastWrittenNo <= 3 && due >= lastWrittenNo
  }).length
}
