function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function dialogueArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function dialogueNamedSpeakers(chapterText: string) {
  const text = String(chapterText || '')
  const speakers: string[] = []
  const pattern = /(?:^|\n)\s*([\u4e00-\u9fa5A-Za-z0-9_·]{2,12})[：:]\s*[“「"][^”」"]{1,180}[”」"]/g
  for (const match of text.matchAll(pattern)) {
    const name = compactBriefText(match[1])
    if (name) speakers.push(name)
  }
  return uniqueBriefStrings(speakers, 20)
}

export function dialogueProtagonistNames(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  return uniqueBriefStrings([
    target.protagonist_name,
    target.protagonistName,
    target.main_character,
    target.mainCharacter,
    contextPackage?.protagonist_name,
    contextPackage?.protagonistName,
    contextPackage?.project_context?.protagonist_name,
    contextPackage?.projectContext?.protagonistName,
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 8)
}

export function normalizeDialogueSupportingSpeakerLimitCheck(values: any[], contextPackage: any, chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const protagonistNames = dialogueProtagonistNames(contextPackage)
  const speakers = dialogueNamedSpeakers(chapterText)
  const supportingSpeakers = speakers.filter(name => !protagonistNames.includes(name))
  const delivered = supportingSpeakers.length <= 3
  return {
    key: 'supporting_speaker_limit_rules',
    label: '配角台词人数',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(20, 88 - (supportingSpeakers.length - 3) * 24),
    evidence: delivered
      ? [`同场配角发言 ${supportingSpeakers.length} 个：${supportingSpeakers.join('、') || '无'}`]
      : [`同场配角发言 ${supportingSpeakers.length} 个：${supportingSpeakers.join('、')}`],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      `同一场景最多保留 3 个配角发言；当前 ${supportingSpeakers.length} 个`,
      ...supportingSpeakers.slice(3).map(name => `压缩或合并 ${name} 的台词`),
    ], 8),
    issue: delivered ? '' : '同一场景配角台词人数过多，多人轮流发言会稀释主线冲突和角色功能。',
    repair_instruction: delivered ? '' : '按 oh-story 配角卡修复：同一场景最多保留 3 个配角发言；没有功能的角色不要出场，超出的台词合并成旁观反应、动作、沉默或叙事一句话概括。',
  }
}
