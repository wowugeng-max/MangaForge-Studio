export const BEAT_COOLING_LABELS: Record<string, string> = {
  conflict_thrill: '大冲突/打斗',
  bond_deepening: '关系深化',
  faction_building: '势力建设',
  world_painting: '世界观展开',
  tension_escalation: '压力升级',
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  try {
    return JSON.stringify(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  } catch {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  }
}

function firstCompactText(...values: any[]) {
  for (const value of values) {
    const text = compactBriefText(value)
    if (text) return text
  }
  return ''
}

export function normalizeBeatCoolingType(...values: any[]) {
  const text = compactBriefText(values.filter(Boolean).join('；')).toLowerCase()
  if (!text) return ''
  if (/bond_deepening|relationship|关系深化|关系推进|信任|同盟|感情推进/.test(text)) return 'bond_deepening'
  if (/world_painting|worldbuilding|世界观|新地图|地图|规则展开|地契|税契|制度|风土/.test(text)) return 'world_painting'
  if (/faction_building|势力建设|组织|班底|据点|阵营/.test(text)) return 'faction_building'
  if (/tension_escalation|压力升级|加压|倒计时|威胁升级|门槛升级/.test(text)) return 'tension_escalation'
  if (/conflict_thrill|大冲突|打斗|战斗|开打|拔剑|追杀|对抗|会审|压问|压迫|翻案/.test(text)) return 'conflict_thrill'
  return text.replace(/[^a-z0-9_]/g, '').slice(0, 40)
}

export function normalizeBeatCoolingItem(value: any, index: number) {
  const raw = typeof value === 'object' && value ? value : { label: value }
  const label = firstCompactText(raw.label, raw.title, raw.name, raw.summary, raw.detail, raw.text, `节奏点${index + 1}`)
  const beatType = normalizeBeatCoolingType(raw.beat_type, raw.beatType, raw.type, raw.event_type, raw.eventType, raw.kind, label)
  if (!beatType && !label) return null
  return {
    chapter_no: Number(raw.chapter_no || raw.chapterNo || raw.chapter || 0) || null,
    beat_type: beatType,
    label,
  }
}

export function inferBeatCoolingTypeFromText(chapterText: string) {
  const text = String(chapterText || '')
  return normalizeBeatCoolingType(
    /关系|信任|同盟|并肩|心结|和解|承诺/.test(text) ? 'bond_deepening' : '',
    /世界观|规则|地契|税契|制度|新地图|地图|城规|宗门法度/.test(text) ? 'world_painting' : '',
    /大冲突|打斗|战斗|开打|拔剑|对抗|追杀|压问|加压|会审/.test(text) ? 'conflict_thrill' : '',
  )
}

export function beatCoolingCurrentItem(chapter: any, contextPackage: any, chapterText: string) {
  const target = contextPackage?.chapter_target || {}
  const current = target.current_beat || target.currentBeat || contextPackage?.current_beat || contextPackage?.currentBeat || {}
  const explicitType = normalizeBeatCoolingType(
    target.beat_type,
    target.beatType,
    target.event_type,
    target.eventType,
    target.chapter_beat_type,
    target.chapterBeatType,
    current.beat_type,
    current.beatType,
    current.type,
    current.event_type,
    current.eventType,
  )
  const label = firstCompactText(
    current.label,
    current.title,
    current.summary,
    target.chapter_role,
    target.chapterRole,
    target.summary,
    chapter?.title,
  )
  const beatType = explicitType || inferBeatCoolingTypeFromText(chapterText)
  if (!beatType && !label) return null
  return {
    chapter_no: Number(chapter?.chapter_no || target.chapter_no || target.chapterNo || 0) || null,
    beat_type: beatType,
    label: label || BEAT_COOLING_LABELS[beatType] || beatType,
    current: true,
  }
}

export function beatCoolingSequence(chapter: any, contextPackage: any, chapterText: string) {
  const target = contextPackage?.chapter_target || {}
  const recentRaw = [
    ...asArray(target.recent_chapter_beats || target.recentChapterBeats),
    ...asArray(contextPackage?.recent_chapter_beats || contextPackage?.recentChapterBeats),
    ...asArray(target.recent_chapters || target.recentChapters),
    ...asArray(contextPackage?.recent_chapters || contextPackage?.recentChapters),
  ]
  const chapterNo = Number(chapter?.chapter_no || target.chapter_no || target.chapterNo || 0) || null
  const recent = recentRaw
    .map((item: any, index: number) => normalizeBeatCoolingItem(item, index))
    .filter(Boolean)
    .filter((item: any) => !chapterNo || !item.chapter_no || Number(item.chapter_no) < chapterNo)
    .sort((left: any, right: any) => Number(left.chapter_no || 0) - Number(right.chapter_no || 0))
  const current = beatCoolingCurrentItem(chapter, contextPackage, chapterText)
  return current ? [...recent, current] : recent
}

export function beatCoolingPriority(missed: any[]) {
  if (missed.some(item => item.key === 'conflict_thrill_overrun' || item.key === 'five_chapter_texture_gap')) return '优先轮换桥段类型'
  return ''
}
