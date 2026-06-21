export type SettingUsageType = 'allowed' | 'required' | 'forbidden' | 'advance' | 'plant' | 'payoff' | 'pause'

export type SettingUsageFilter = SettingUsageType | 'configured' | 'unconfigured' | 'all'

export type SettingUsageRecord = {
  entity_id?: number | string
  usage_type?: string
  required?: boolean
  allowed?: boolean
  forbidden?: boolean
  reveal_level?: string
  expected_state_change?: any
}

export type SettingAssetRecord = {
  id?: number | string
  entity_type?: string
  name?: string
  constraints_json?: Record<string, any> | null
  state_json?: Record<string, any> | null
}

export type UsageSummary = {
  configured: number
  required: number
  forbidden: number
  advance: number
  plant: number
  payoff: number
  pause: number
}

export type CompactSettingTag = {
  group: 'constraint' | 'state'
  label: string
}

export const usageFilterOptions: Array<{ key: SettingUsageFilter; label: string }> = [
  { key: 'configured', label: '本章相关' },
  { key: 'all', label: '全部' },
  { key: 'required', label: '必用' },
  { key: 'forbidden', label: '禁揭' },
  { key: 'advance', label: '推进' },
  { key: 'plant', label: '埋线' },
  { key: 'payoff', label: '回收' },
  { key: 'pause', label: '暂停' },
  { key: 'unconfigured', label: '未配置' },
]

export const usageSegmentOptions: Array<{ value: SettingUsageType; label: string }> = [
  { value: 'allowed', label: '可用' },
  { value: 'required', label: '必用' },
  { value: 'forbidden', label: '禁揭' },
  { value: 'advance', label: '推进' },
  { value: 'plant', label: '埋线' },
  { value: 'payoff', label: '回收' },
  { value: 'pause', label: '暂停' },
]

export const revealSegmentOptions = [
  { value: 'none', label: '不揭示' },
  { value: 'hint', label: '线索' },
  { value: 'partial', label: '部分' },
  { value: 'full', label: '完整' },
]

const validUsageTypes = new Set<SettingUsageType>(['allowed', 'required', 'forbidden', 'advance', 'plant', 'payoff', 'pause'])

export function normalizeUsageType(usage: SettingUsageRecord | null | undefined): SettingUsageType {
  if (!usage) return 'allowed'
  if (usage.forbidden) return 'forbidden'
  const raw = String(usage.usage_type || '').trim()
  if (validUsageTypes.has(raw as SettingUsageType)) return raw as SettingUsageType
  if (usage.required) return 'required'
  return 'allowed'
}

export function buildUsageSummary(usage: SettingUsageRecord[]): UsageSummary {
  return usage.reduce<UsageSummary>((acc, item) => {
    const type = normalizeUsageType(item)
    acc.configured += 1
    if (type === 'forbidden') acc.forbidden += 1
    else if (type === 'advance') acc.advance += 1
    else if (type === 'plant') acc.plant += 1
    else if (type === 'payoff') acc.payoff += 1
    else if (type === 'pause') acc.pause += 1
    else if (item.required || type === 'required') acc.required += 1
    return acc
  }, {
    configured: 0,
    required: 0,
    forbidden: 0,
    advance: 0,
    plant: 0,
    payoff: 0,
    pause: 0,
  })
}

export function filterSettingsForUsage(
  settings: SettingAssetRecord[],
  usageMap: Map<number, SettingUsageRecord>,
  activeType: string,
  filter: SettingUsageFilter,
) {
  return settings.filter(setting => {
    if (activeType && String(setting.entity_type || 'rule') !== activeType) return false
    const explicitUsage = usageMap.get(Number(setting.id))
    if (filter === 'all') return true
    if (filter === 'configured') return Boolean(explicitUsage)
    if (filter === 'unconfigured') return !explicitUsage
    return Boolean(explicitUsage) && normalizeUsageType(explicitUsage) === filter
  })
}

function stringifyTagValue(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item ?? '').trim()).filter(Boolean).join('、')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '').trim()
}

function objectTags(value: Record<string, any> | null | undefined, group: CompactSettingTag['group']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value)
    .map(([key, rowValue]) => {
      const text = stringifyTagValue(rowValue)
      return text ? { group, label: `${key}: ${text}` } : null
    })
    .filter((item): item is CompactSettingTag => Boolean(item))
}

export function buildCompactSettingTags(setting: SettingAssetRecord, limit = 5): CompactSettingTag[] {
  return [
    ...objectTags(setting.constraints_json, 'constraint'),
    ...objectTags(setting.state_json, 'state'),
  ].slice(0, limit)
}
