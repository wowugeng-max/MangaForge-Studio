import { describe, expect, test } from 'bun:test'
import {
  buildCompactSettingTags,
  buildUsageSummary,
  filterSettingsForUsage,
  normalizeUsageType,
} from './settingUsageWorkbenchModel'

const settings = [
  {
    id: 1,
    entity_type: 'character',
    name: '丁松言',
    constraints_json: {
      behavior_limits: ['不得无代价使用高阶食兽能力', '不得直接知晓完整历史真相'],
      growth_limits: '能力成长必须依赖异兽残留',
    },
    state_json: {
      current_stage: '食兽感应初次触发完成',
      known_truth_ratio: 0.05,
      internal_conflict: '穿越者记忆与原生意识拉扯',
    },
  },
  { id: 2, entity_type: 'character', name: '迟正' },
  { id: 3, entity_type: 'ability', name: '食兽感应' },
  { id: 4, entity_type: 'character', name: '黑桑县路人' },
]

const usage = [
  { entity_id: 1, usage_type: 'required', required: true, allowed: true, forbidden: false, reveal_level: 'partial' },
  { entity_id: 2, usage_type: 'forbidden', required: false, allowed: false, forbidden: true, reveal_level: 'none' },
  { entity_id: 3, usage_type: 'plant', required: true, allowed: true, forbidden: false, reveal_level: 'hint' },
]

describe('setting usage workbench model', () => {
  test('summarizes chapter usage by explicit scheduling role', () => {
    expect(buildUsageSummary(usage)).toEqual({
      configured: 3,
      required: 1,
      forbidden: 1,
      advance: 0,
      plant: 1,
      payoff: 0,
      pause: 0,
    })
  })

  test('normalizes legacy required and forbidden flags into usage roles', () => {
    expect(normalizeUsageType({ forbidden: true, usage_type: 'allowed' })).toBe('forbidden')
    expect(normalizeUsageType({ required: true, usage_type: '' })).toBe('required')
    expect(normalizeUsageType({ usage_type: 'payoff' })).toBe('payoff')
    expect(normalizeUsageType(null)).toBe('allowed')
  })

  test('filters current type settings by chapter usage role', () => {
    const usageMap = new Map(usage.map(item => [Number(item.entity_id), item]))

    expect(filterSettingsForUsage(settings, usageMap, 'character', 'configured').map(item => item.name)).toEqual(['丁松言', '迟正'])
    expect(filterSettingsForUsage(settings, usageMap, 'character', 'forbidden').map(item => item.name)).toEqual(['迟正'])
    expect(filterSettingsForUsage(settings, usageMap, 'character', 'unconfigured').map(item => item.name)).toEqual(['黑桑县路人'])
    expect(filterSettingsForUsage(settings, usageMap, 'ability', 'plant').map(item => item.name)).toEqual(['食兽感应'])
  })

  test('turns constraints and state json into compact readable tags', () => {
    const tags = buildCompactSettingTags(settings[0], 5)

    expect(tags).toEqual([
      { group: 'constraint', label: 'behavior_limits: 不得无代价使用高阶食兽能力、不得直接知晓完整历史真相' },
      { group: 'constraint', label: 'growth_limits: 能力成长必须依赖异兽残留' },
      { group: 'state', label: 'current_stage: 食兽感应初次触发完成' },
      { group: 'state', label: 'known_truth_ratio: 0.05' },
      { group: 'state', label: 'internal_conflict: 穿越者记忆与原生意识拉扯' },
    ])
  })
})
