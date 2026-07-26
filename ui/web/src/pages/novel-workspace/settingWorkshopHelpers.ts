/** Pure helpers and constants for SettingWorkshopPanel. */
export type SettingWorkshopActionKey =
  | 'save_usage'
  | 'incubate_settings'
  | 'incubate_settings_model'
  | 'incubate_storylines'
  | 'incubate_storylines_model'
  | 'suggest_usage'
  | 'suggest_usage_model'
  | 'suggest_storyline'
  | 'suggest_storyline_model'
  | 'apply_state_updates'
  | 'apply_discovered_assets'

export const settingTypes = [
  { value: 'character', label: '角色' },
  { value: 'realm', label: '境界' },
  { value: 'ability', label: '能力' },
  { value: 'item', label: '物品' },
  { value: 'boss', label: 'Boss' },
  { value: 'rule', label: '规则' },
  { value: 'faction', label: '势力' },
  { value: 'location', label: '地点' },
  { value: 'foreshadowing', label: '伏笔' },
  { value: 'timeline', label: '时间线' },
  { value: 'mainline', label: '主线' },
  { value: 'subplot', label: '支线' },
  { value: 'character_arc', label: '角色线' },
  { value: 'relationship_arc', label: '感情线' },
  { value: 'faction_arc', label: '势力线' },
  { value: 'foreshadowing_arc', label: '伏笔线' },
]

export const EMPTY_INITIAL_SETTINGS: any[] = []

export function splitList(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item)).map(item => item.trim()).filter(Boolean)
  return String(value || '').split(/[\n,，]/).map(item => item.trim()).filter(Boolean)
}

export function parseLooseValue(value: any) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

export function objectToRows(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).map(([key, rowValue]) => ({
    key,
    value: rowValue && typeof rowValue === 'object' ? JSON.stringify(rowValue) : String(rowValue ?? ''),
  }))
}

export function rowsToObject(rows: any[] = []) {
  return rows.reduce((acc: Record<string, any>, row) => {
    const key = String(row?.key || '').trim()
    if (!key) return acc
    acc[key] = parseLooseValue(row?.value)
    return acc
  }, {})
}

export function typeLabel(type: string) {
  return settingTypes.find(item => item.value === type)?.label || type || '设定'
}

export function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(String(review.payload || '{}'))
  } catch {
    return {}
  }
}

export function reviewChapterId(review: any) {
  const payload = parseReviewPayload(review)
  return Number(payload?.chapter_id || payload?.chapterId || payload?.chapter?.id || 0)
}

export function discoveredAssetKey(item: any, index: number) {
  return `${item.entity_type || item.type || 'asset'}:${item.name || index}:${index}`
}

export function usageFromMap(usageMap: Map<number, any>, setting: any) {
  return usageMap.get(Number(setting.id)) || {
    entity_id: setting.id,
    usage_type: 'allowed',
    required: false,
    allowed: true,
    forbidden: false,
    reveal_level: 'none',
    expected_state_change: {},
  }
}

