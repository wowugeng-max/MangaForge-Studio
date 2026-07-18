import {
  asArray,
  chapterTextOf,
  compactText,
  isPlausiblePersonName,
  uniqueTexts,
} from './character-card-sync-shared'

const NATION_PATTERN = '大夏国|樱花国|扶桑国|神州|华夏|蓝星|美国|联邦|东瀛|日本'

const IDENTITY_NAME_BLOCKLIST = new Set([
  '隔壁', '检测', '副本', '号房', '怎么', '电视', '画面', '房间', '走廊', '通知', '规则',
  '系统', '警告', '提示', '业主', '经理', '主任', '局长', '分析', '人员', '同事',
  '刚才', '此时', '此刻', '突然', '立刻', '直接', '已经', '开始', '继续', '随后',
  '青山', // common false-positive window token unless later proven; keep if real cast appears titled
])

export type CharacterIdentityMention = {
  name: string
  full_name?: string
  nationality?: string
  role_label?: string
  status?: 'alive' | 'dead' | 'unknown'
  evidence: string
}

export type CharacterIdentityCanonEntry = {
  name: string
  aliases: string[]
  nationality?: string
  role_label?: string
  status?: 'alive' | 'dead' | 'unknown'
  evidence: string
  count: number
  first_chapter_no?: number
  last_chapter_no?: number
}

export type CharacterIdentityDrift = {
  name: string
  field: 'nationality' | 'role_label' | 'status'
  canonical_value: string
  drifted_value: string
  evidence: string
  severity: 'high'
  type: 'character_identity_drift'
  description: string
  fix: string
}

function shortNameVariants(name: string) {
  const value = compactText(name, 12)
  const out = uniqueTexts([value], 4)
  // 小林一郎 -> 小林
  if (value.length >= 3 && value.length <= 4) {
    const short2 = value.slice(0, 2)
    if (/^[\u4e00-\u9fff]{2}$/.test(short2)) out.push(short2)
  }
  return uniqueTexts(out, 6)
}

function namesMatch(a: string, b: string) {
  const left = compactText(a, 12)
  const right = compactText(b, 12)
  if (!left || !right) return false
  if (left === right) return true
  if (left.startsWith(right) || right.startsWith(left)) return true
  return shortNameVariants(left).some(item => shortNameVariants(right).includes(item))
}

/** Extract nationality/role/status bindings for named characters from prose. */
export function extractCharacterIdentityMentions(text: string): CharacterIdentityMention[] {
  const source = String(text || '')
  if (!source.trim()) return []
  const out: CharacterIdentityMention[] = []

  const push = (item: CharacterIdentityMention) => {
    const name = compactText(item.name, 12)
    const full = compactText(item.full_name, 12)
    if (!isPlausiblePersonName(name) && !isPlausiblePersonName(full)) return
    const primary = isPlausiblePersonName(name) ? name : full
    if (!primary) return
    const short = primary.length >= 3 && isPlausiblePersonName(primary.slice(0, 2)) ? primary.slice(0, 2) : primary
    if (IDENTITY_NAME_BLOCKLIST.has(short) || IDENTITY_NAME_BLOCKLIST.has(primary)) return
    // Require nationality or death status for identity lock; bare role is too noisy.
    if (!item.nationality && item.status !== 'dead') return
    out.push({
      ...item,
      name: short,
      full_name: item.full_name || (primary.length >= 3 ? primary : undefined),
      nationality: item.nationality ? compactText(item.nationality, 12) : undefined,
      role_label: item.role_label ? compactText(item.role_label, 16) : undefined,
      evidence: compactText(item.evidence, 140),
    })
  }

  // 【樱花国天选者：小林一郎。】 / 【大夏国天选者小林，已死亡。】
  const bracketRe = new RegExp(
    `【((?:${NATION_PATTERN}))(?:的)?(天选者)[：:]?\\s*([\\u4e00-\\u9fff]{2,4})([^】]{0,20})】`,
    'g',
  )
  let match: RegExpExecArray | null
  while ((match = bracketRe.exec(source))) {
    const tail = match[4] || ''
    push({
      name: match[3],
      full_name: match[3],
      nationality: match[1],
      role_label: '天选者',
      status: /已死亡|死亡|阵亡/.test(tail) ? 'dead' : 'unknown',
      evidence: match[0],
    })
  }

  // 小林，樱花国仅存的天选者 / 小林是樱花国天选者
  const apposRe = new RegExp(
    `([\\u4e00-\\u9fff]{2,4})[，,]\\s*((?:${NATION_PATTERN}))([^。\\n]{0,10}?)(天选者)`,
    'g',
  )
  while ((match = apposRe.exec(source))) {
    push({
      name: match[1],
      full_name: match[1],
      nationality: match[2],
      role_label: '天选者',
      evidence: match[0],
    })
  }

  // 樱花国天选者小林 / 樱花国的天选者小林
  const nationRoleNameRe = new RegExp(
    `((?:${NATION_PATTERN}))(?:的)?(天选者)[：:]?\\s*([\\u4e00-\\u9fff]{2,4})`,
    'g',
  )
  while ((match = nationRoleNameRe.exec(source))) {
    push({
      name: match[3],
      full_name: match[3],
      nationality: match[1],
      role_label: match[2],
      evidence: match[0],
    })
  }


  // Death notice without nation already handled; bare: 天选者小林已死亡 with prior context skipped

  // Dedupe by name+nationality+role
  const seen = new Set<string>()
  return out.filter(item => {
    const key = `${item.name}|${item.nationality || ''}|${item.role_label || ''}|${item.status || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCharacterIdentityCanon(chapters: any[] = []): CharacterIdentityCanonEntry[] {
  const entries: CharacterIdentityCanonEntry[] = []
  const ordered = asArray(chapters).slice().sort((a, b) => (
    Number(a?.chapter_no || a?.chapterNo || 0) - Number(b?.chapter_no || b?.chapterNo || 0)
  ))

  const findEntry = (name: string) => entries.find(item => (
    namesMatch(item.name, name)
    || item.aliases.some(alias => namesMatch(alias, name))
  ))

  for (const chapter of ordered) {
    const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0) || undefined
    const mentions = extractCharacterIdentityMentions(chapterTextOf(chapter))
    for (const mention of mentions) {
      if (!mention.nationality && !mention.role_label && !mention.status) continue
      // Prefer shortest stable display name (小林 over 小林一郎).
      const variants = shortNameVariants(mention.full_name || mention.name)
      const preferredName = variants.sort((a, b) => a.length - b.length)[0] || mention.name
      const prev = findEntry(mention.name) || findEntry(mention.full_name || '') || findEntry(preferredName)
      if (!prev) {
        entries.push({
          name: preferredName,
          aliases: uniqueTexts([mention.name, mention.full_name, preferredName], 6),
          nationality: mention.nationality,
          role_label: mention.role_label,
          status: mention.status && mention.status !== 'unknown' ? mention.status : undefined,
          evidence: mention.evidence,
          count: 1,
          first_chapter_no: chapterNo,
          last_chapter_no: chapterNo,
        })
        continue
      }
      // First established nationality wins (sticky canon).
      const nationality = prev.nationality || mention.nationality
      const role_label = prev.role_label || mention.role_label
      const status = mention.status === 'dead' ? 'dead' : (prev.status || (mention.status !== 'unknown' ? mention.status : undefined))
      prev.aliases = uniqueTexts([...(prev.aliases || []), mention.name, mention.full_name, preferredName], 8)
      // Keep shorter canonical name when available.
      if (preferredName.length < prev.name.length) prev.name = preferredName
      prev.nationality = nationality
      prev.role_label = role_label
      if (status && status !== 'unknown') prev.status = status
      prev.evidence = prev.evidence || mention.evidence
      prev.count += 1
      prev.last_chapter_no = chapterNo || prev.last_chapter_no
    }
  }
  return entries.filter(item => item.nationality || item.role_label)
}

export function detectCharacterIdentityDrift(input: {
  chapterText?: any
  previousChapters?: any[]
  identityCanon?: CharacterIdentityCanonEntry[]
} = {}): CharacterIdentityDrift[] {
  const text = String(input.chapterText || '')
  if (!text.trim()) return []
  const canon = input.identityCanon?.length
    ? input.identityCanon
    : buildCharacterIdentityCanon(input.previousChapters || [])
  if (!canon.length) return []

  const currentMentions = extractCharacterIdentityMentions(text)
  const drifts: CharacterIdentityDrift[] = []

  const findCanon = (name: string) => canon.find(item => (
    namesMatch(item.name, name)
    || item.aliases.some(alias => namesMatch(alias, name))
  ))

  for (const mention of currentMentions) {
    const entry = findCanon(mention.name) || findCanon(mention.full_name || '')
    if (!entry) continue

    if (entry.nationality && mention.nationality && entry.nationality !== mention.nationality) {
      drifts.push({
        name: entry.name,
        field: 'nationality',
        canonical_value: entry.nationality,
        drifted_value: mention.nationality,
        evidence: mention.evidence,
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」已确立为「${entry.nationality}」，本章却写成「${mention.nationality}」，属于身份/国籍漂移。`,
        fix: `把「${mention.nationality}…${entry.name}」改回已确立身份「${entry.nationality}${entry.role_label || ''} ${entry.aliases[0] || entry.name}」，禁止改国籍/阵营标签。`,
      })
    }

    if (entry.role_label && mention.role_label && entry.role_label !== mention.role_label
      && !entry.role_label.includes(mention.role_label) && !mention.role_label.includes(entry.role_label)) {
      drifts.push({
        name: entry.name,
        field: 'role_label',
        canonical_value: entry.role_label,
        drifted_value: mention.role_label,
        evidence: mention.evidence,
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」身份标签已确立为「${entry.role_label}」，本章却写成「${mention.role_label}」。`,
        fix: `统一为「${entry.role_label}」，保留已建立身份。`,
      })
    }
  }

  // Also catch bare wrong-nation templates that extract failed but still contain wrong pair near name.
  for (const entry of canon) {
    if (!entry.nationality) continue
    const names = uniqueTexts([entry.name, ...entry.aliases], 6)
    for (const name of names) {
      const wrongNationRe = new RegExp(`((?:${NATION_PATTERN}))([^。\\n]{0,8})(天选者)?([^。\\n]{0,6})${name}`)
      const match = text.match(wrongNationRe)
      if (!match) continue
      const nation = match[1]
      if (nation === entry.nationality) continue
      if (drifts.some(item => item.name === entry.name && item.field === 'nationality' && item.drifted_value === nation)) continue
      drifts.push({
        name: entry.name,
        field: 'nationality',
        canonical_value: entry.nationality,
        drifted_value: nation,
        evidence: compactText(match[0], 140),
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」已确立为「${entry.nationality}」，本章出现「${nation}…${name}」身份漂移。`,
        fix: `将「${nation}」改回「${entry.nationality}」，保持「${entry.nationality}${entry.role_label || '天选者'}${name}」一致。`,
      })
    }
  }

  const seen = new Set<string>()
  return drifts.filter(item => {
    const key = `${item.name}|${item.field}|${item.drifted_value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCharacterIdentityDriftDirective(drifts: CharacterIdentityDrift[] = []) {
  if (!drifts.length) return null
  const primary = drifts[0]
  return {
    key: 'character_identity_drift',
    priority: 1,
    severity: 'high' as const,
    label: `身份漂移·${primary.name}`,
    directive: compactText(primary.fix, 220),
    issue: {
      severity: 'high',
      type: 'character_identity_drift',
      description: primary.description,
      evidence: primary.evidence,
      fix: primary.fix,
      source: 'character_card_sync',
    },
  }
}

export function mergeIdentityCanonIntoStoryState(
  storyState: any = {},
  identityCanon: CharacterIdentityCanonEntry[] = [],
) {
  const base = storyState && typeof storyState === 'object' ? { ...storyState } : {}
  const existing = asArray(base.character_identity_canon || base.characterIdentityCanon)
  const byName = new Map<string, any>()
  for (const item of existing) {
    const name = compactText(item?.name, 12)
    if (!name) continue
    byName.set(name, item)
  }
  for (const item of identityCanon) {
    const prev = byName.get(item.name)
    if (!prev || Number(item.count || 0) >= Number(prev.count || 0)) {
      byName.set(item.name, { ...item })
    } else if (prev && !prev.nationality && item.nationality) {
      byName.set(item.name, { ...prev, nationality: item.nationality, role_label: prev.role_label || item.role_label })
    }
  }
  base.character_identity_canon = [...byName.values()]
  base.character_identity_rules = uniqueTexts(
    base.character_identity_canon.map((item: any) => {
      const bits = [item.name, item.nationality, item.role_label, item.status].filter(Boolean)
      return bits.join('·')
    }),
    32,
  )
  return base
}
