import { describe, expect, test } from 'bun:test'
import {
  buildStateTrackingDeterministicCheck,
  normalizeStateSourceReadiness,
  normalizeStateTrackingCharacterCheck,
  normalizeStateTrackingFilterRuleCheck,
  normalizeStateTrackingHistoricalCheck,
  normalizeStateTrackingSourceReadinessCheck,
  normalizeStateTrackingWorldConstraintCheck,
  stateTrackingPriority,
} from './state-tracking-basics'

describe('state tracking basic sync checks', () => {
  test('normalizes explicit source readiness rows and filters incomplete rows', () => {
    const rows = normalizeStateSourceReadiness([
      { key: 'timeline', label: '时间线', ready: true, source: '追踪/时间线.md' },
      { name: 'previous_chapter', title: '上一章状态', status: 'warn', summary: '缺少结尾状态' },
      { key: 'optional_reference', label: '参考迁移', optional: true },
      { key: '', label: '无效行', status: 'ready' },
    ])

    expect(rows).toEqual([
      { key: 'timeline', label: '时间线', status: 'ready', evidence: '追踪/时间线.md', fix: '' },
      { key: 'previous_chapter', label: '上一章状态', status: 'warn', evidence: '缺少结尾状态', fix: '' },
      { key: 'optional_reference', label: '参考迁移', status: 'optional', evidence: '', fix: '' },
    ])
  })

  test('warns when required state sources are missing or marked warn', () => {
    const check = normalizeStateTrackingSourceReadinessCheck([
      { key: 'timeline', label: '时间线', status: 'missing', fix: '补齐追踪/时间线.md' },
      { key: 'previous_chapter', label: '上一章状态', status: 'warn', evidence: '缺少章尾状态' },
      { key: 'reference', label: '参考迁移', status: 'optional' },
    ])

    expect(check?.key).toBe('source_readiness')
    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(52)
    expect(check?.missed_items).toEqual(['时间线:missing', '上一章状态:warn'])
    expect(check?.repair_instruction).toContain('补齐 missing/warn 来源')
  })

  test('confirms state source readiness when all required rows are ready or optional', () => {
    const check = normalizeStateTrackingSourceReadinessCheck([
      { key: 'timeline', label: '时间线', status: 'ready', evidence: '追踪/时间线.md' },
      { key: 'reference', label: '参考迁移', status: 'optional' },
    ])

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.missed_items).toEqual([])
  })

  test('warns when filter rules detect unused exposition overload', () => {
    const check = normalizeStateTrackingFilterRuleCheck(
      ['只保留本章行动会用到的信息'],
      '正文顺便介绍三百年历史和十二支旁系，制度分为很多层，一整套背景都讲完。',
    )

    expect(check?.key).toBe('filter_rules')
    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(28)
    expect(check?.evidence).toContain('无关背景/百科说明')
    expect(check?.repair_instruction).toContain('按本节速记过滤')
  })

  test('confirms filter rules when prose avoids obvious context overload', () => {
    const check = normalizeStateTrackingFilterRuleCheck(
      ['只保留本章行动会用到的信息'],
      '林青禾只确认当前时间、地点和血契封条限制，没有展开无关家族史。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(['未发现明显上下文过载'])
  })

  test('confirms character state tracking when current state evidence is visible', () => {
    const check = normalizeStateTrackingCharacterCheck(
      ['李玄：左臂旧伤影响行动，持有旧钥匙，关系态度谨慎。'],
      '李玄按住左臂旧伤，只能用封条事实逼问；旧钥匙还在他掌心，关系态度也比上一章更谨慎。',
    )

    expect(check?.key).toBe('character_states')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when character state tracking contradicts established state', () => {
    const check = normalizeStateTrackingCharacterCheck(
      ['李玄：左臂旧伤影响行动。'],
      '李玄说自己的左臂完全好了，像从没作证一样，也没有被周家盯上。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(18)
    expect(check?.evidence).toContain('状态写反')
    expect(check?.repair_instruction).toContain('补角色状态')
  })

  test('confirms historical causality when prior hook becomes current cause', () => {
    const check = normalizeStateTrackingHistoricalCheck(
      ['上一章旧钥匙裂开缺口，指向祠堂地砖。'],
      '上一章留下的旧钥匙裂开缺口，这一次直接指向祠堂地砖，成为开场逼问的证据。',
    )

    expect(check?.key).toBe('historical_causality')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when historical causality is dismissed', () => {
    const check = normalizeStateTrackingHistoricalCheck(
      ['上一章旧钥匙裂开缺口。'],
      '上一章发生了什么并不重要，前文都不重要，角色忽然承认真相。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(16)
    expect(check?.evidence).toContain('前史断裂')
    expect(check?.repair_instruction).toContain('补前史因果')
  })

  test('confirms world constraints when rules and knowledge boundaries affect action', () => {
    const check = normalizeStateTrackingWorldConstraintCheck(
      ['禁门规则限制行动，第二枚血契编号仍在知识边界外。'],
      '禁门规则让血契封条三息后锁死，开门人只能先退出；他不知道第二枚血契编号，知识边界改变了行动选择。',
    )

    expect(check?.key).toBe('world_constraints')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when world constraints are ignored or leaked', () => {
    const check = normalizeStateTrackingWorldConstraintCheck(
      ['禁门规则限制行动，第二枚血契编号仍在知识边界外。'],
      '规则没有生效，众人想待多久就待多久，李玄还早就知道第二枚血契编号。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(14)
    expect(check?.evidence).toContain('世界约束失效')
    expect(check?.repair_instruction).toContain('补世界约束')
  })

  test('builds deterministic state tracking risk check for hard violations', () => {
    const check = buildStateTrackingDeterministicCheck(
      '他左臂完全好了，规则没有生效，众人想待多久就待多久，还顺便介绍三百年历史。',
    )

    expect(check?.key).toBe('state_tracking_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['角色状态漂移', '世界约束失效', '上下文过载']))
    expect(check?.repair_instruction).toContain('oh-story 本节速记')
  })

  test('prioritizes state tracking repairs by highest-impact missed checks', () => {
    expect(stateTrackingPriority([
      { key: 'world_constraints' },
      { key: 'state_tracking_forbidden' },
    ])).toBe('优先清状态硬伤')

    expect(stateTrackingPriority([
      { key: 'filter_rules' },
      { key: 'source_readiness' },
    ])).toBe('优先补来源就绪')
  })
})
