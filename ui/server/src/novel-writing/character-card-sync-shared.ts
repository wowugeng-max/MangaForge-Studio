/**
 * System-level character card lifecycle:
 * - extract recurring named cast from prose
 * - auto-create missing character cards
 * - sync current_state from story-state updates
 * - detect title/name drift against established canon (e.g. 局长 秦建国 vs 赵国锋)
 */

export function compactText(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

export function uniqueTexts(values: any, limit = 24) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw, 80)
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

// Unique offices only. Multi-person roles (天选者/分析员) are not locked to a single name.
export const ROLE_TITLES = [
  '特事局局长',
  '战略分析局局长',
  '最高战略分析局局长',
  '居委会主任',
  '业主委员会主任',
  '物业经理',
  '局长',
]

export const UNIQUE_OFFICE_TITLES = new Set(ROLE_TITLES)

export const GENERIC_BLOCKLIST = new Set([
  '江哲', '主角', '读者', '作者', '系统', '本章', '上一章', '下一章',
  '男人', '女人', '少年', '少女', '老人', '众人', '对方', '自己',
  // Non-person slices frequently stuck before office titles: 「距离物业经理按响门铃」
  '距离', '时间', '此时', '此刻', '然后', '随后', '接着', '忽然', '突然', '马上', '立刻',
  '面前', '身后', '旁边', '对面', '附近', '里面', '外面', '中间', '周围',
])

export const NAME_PATTERN = /[\u4e00-\u9fff]{2,4}/

export type NamedCharacterMention = {
  name: string
  title?: string
  evidence: string
  count: number
  source: 'title_name' | 'name_title' | 'bare_name' | 'story_state'
}

export type TitleNameCanonEntry = {
  title: string
  name: string
  count: number
  evidence: string
  first_chapter_no?: number
  last_chapter_no?: number
}

export type CharacterNameDrift = {
  title: string
  canonical_name: string
  drifted_name: string
  evidence: string
  severity: 'high'
  type: 'character_name_drift'
  description: string
  fix: string
}

export function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

export function isPlausiblePersonName(name: string) {
  const value = compactText(name, 12)
  // Personal names are usually 2-3 Han chars; allow 4 for full names like 小林一郎.
  if (!/^[\u4e00-\u9fff]{2,4}$/.test(value)) return false
  if (GENERIC_BLOCKLIST.has(value)) return false
  if (/的|了|着|过|在|是|和|与|及|则|都|也|又|还|死|双|却|此|刻|闪|烁|声|音|颤|地/.test(value)) return false
  if (/第[一二三四五六七八九十百千0-9]+/.test(value)) return false
  if (/^(这个|那个|这张|那张|一位|一名|一个|仅存|樱花|个人|刚才|声音|此刻|正是|我们|你们|他们|她们|它们|自己|对方|身上|手里|眼前|面前|背后|瞳孔|心脏)/.test(value)) return false
  if (/^(它|他|她|我|你|这|那)/.test(value) && value.length >= 3) return false
  if (/^(里|外|上|下|前|后|左|右|中)/.test(value) && value.length === 3) return false
  if (/(局|会|部|院|组|队|科)$/.test(value)) return false
  if (/特事|分析|业主|居委|物业|战略/.test(value)) return false
  // Reject verb-object / predicate chunks mis-sliced from prose
  // e.g. 物业经理按响门铃 -> 按响门; 局长要使用 -> 要使用; 猛地挥手 -> 猛地挥
  if (/^(按|推|拉|敲|开|关|闯|冲|跑|走|站|坐|拿|放|扔|抓|拖|抬|举|打|杀|砍|刺|射|逃|躲|看|听|说|问|喊|叫|哭|笑|想|觉|感|发|进|出|回|来|去|到|给|用|做|搞|弄|要|能|会|该|得|剥|扭|融|代|骤|挥|砸|甩|撕|咬|吞|喷|涌|裂|碎|炸|爆|压|顶|撞|踢|踩|猛)/.test(value)) return false
  if (/(门铃|房门|大门|门板|门缝|门把|开关|按钮|钥匙|密码|使用|启动|触发|启动中)$/.test(value)) return false
  return true
}

