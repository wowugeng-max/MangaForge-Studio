import { describe, expect, test } from 'bun:test'
import {
  buildCharacterRelationDeterministicCheck,
  characterRelationArray,
  characterRelationPriority,
  countCharacterRelationSignals,
  normalizeCharacterRelationBufferZoneCheck,
  normalizeCharacterRelationCheck,
  normalizeCharacterRelationExpectationHubCheck,
  normalizeCharacterRelationGoalOwnershipCheck,
  normalizeCharacterRelationLifeRuleCheck,
  normalizeCharacterRelationQualityCheck,
} from './character-relation-basics'

describe('character relation basic sync checks', () => {
  test('normalizes relation values and counts relation signals', () => {
    expect(characterRelationArray([' 合作互信 ', '', null, { rule: '保持边界' }])).toEqual([
      '合作互信',
      '[object Object]',
    ])

    expect(countCharacterRelationSignals('关系类型是联盟，双方先质疑再信任，但仍保留边界。', [
      /联盟/,
      /信任/,
      /边界/,
      /背叛/,
    ])).toBe(3)
  })

  test('checks generic relation anchors and explicit risk blockers', () => {
    const ok = normalizeCharacterRelationCheck(
      'important_relationships',
      '关系弧线',
      ['林青禾从质疑转为主动作证'],
      '林青禾从质疑转为主动作证，关系弧线变成有限互信。',
      [/主动作证/, /互信/],
      '缺关系弧线',
      '补关系弧线',
    )
    const blocked = normalizeCharacterRelationCheck(
      'important_relationships',
      '关系弧线',
      ['林青禾从质疑转为主动作证'],
      '他们只是互相支持，关系没有变化。',
      [/互相支持/],
      '缺关系弧线',
      '补关系弧线',
    )

    expect(ok?.delivered).toBe(true)
    expect(ok?.status).toBe('ok')
    expect(blocked?.delivered).toBe(false)
    expect(blocked?.missed_items).toContain('林青禾从质疑转为主动作证')
  })

  test('checks goal ownership life rules and expectation hub rules', () => {
    const ownership = normalizeCharacterRelationGoalOwnershipCheck(
      ['主角目标不能被配角吞掉'],
      '主角目标属于自己的维修资格，他主动要求复核并承担代价，保住客户授权。',
    )
    const life = normalizeCharacterRelationLifeRuleCheck(
      ['关系角色必须有恋爱之外的责任'],
      '她在恋爱之外还有自己的责任和账册风险，主动作证并承担得罪家族的代价。',
    )
    const hub = normalizeCharacterRelationExpectationHubCheck(
      ['关键配角承担期待枢纽'],
      '林青禾是配角期待枢纽和任务基地，短期期待是拿到账册，长期期待是查出幕后。主角解决事件后回到林青禾处开启新一轮新任务，她暂时离场却留下钥匙和更大好处。',
    )

    expect(ownership?.delivered).toBe(true)
    expect(ownership?.evidence).toContain('主角自己的目标')
    expect(life?.delivered).toBe(true)
    expect(life?.evidence).toContain('恋爱之外的目标/责任/行动线')
    expect(hub?.delivered).toBe(true)
    expect(hub?.evidence).toEqual(expect.arrayContaining([
      '任务基地/期待枢纽可见',
      '短期和长期期待同时承载',
      '事件解决后回到该人物开启下一轮',
    ]))
  })

  test('checks buffer zone and quality signals with actionable misses', () => {
    const buffer = normalizeCharacterRelationBufferZoneCheck(
      ['配角攻略缓冲区'],
      '两人仍有信息差和边界缓冲区，林青禾带着自己的责任主动作证，从旁观转为行动协助但继续设限。',
    )
    const quality = normalizeCharacterRelationQualityCheck(
      ['关系阶段必须匹配'],
      '关系类型是联盟但有边界；主角有自己的目标，配角也要洗清账册。压力测试来自撤授权，林青禾态度变化后主动作证，关系阶段仍保留亲密边界。',
    )
    const flatBuffer = normalizeCharacterRelationBufferZoneCheck(
      ['配角攻略缓冲区'],
      '没有信息差，没有信任程度变化，配角站在旁边等主角触发。',
    )

    expect(buffer?.delivered).toBe(true)
    expect(buffer?.evidence).toContain('信息差/边界缓冲区可见')
    expect(quality?.delivered).toBe(true)
    expect(flatBuffer?.delivered).toBe(false)
    expect(flatBuffer?.missed_items).toEqual(expect.arrayContaining([
      '缺信息差/地位差距/亲密度差距/信任程度缓冲区',
      '配角像 NPC 一样站桩等待触发',
    ]))
  })

  test('builds deterministic hard-risk check and relation repair priority', () => {
    const check = buildCharacterRelationDeterministicCheck('他们只是互相支持，关系没有变化，配角只围着主角转，没有独立目标。')

    expect(check).toMatchObject({
      key: 'character_relation_forbidden',
      delivered: false,
      status: 'warn',
    })
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '只有互相支持',
      '关系无变化',
      '缺独立目标',
    ]))

    expect(characterRelationPriority([{ key: 'goal_ownership_rules' }, { key: 'buffer_zone_rules' }])).toBe('优先补配角攻略缓冲区')
    expect(characterRelationPriority([{ key: 'character_relation_forbidden' }])).toBe('优先清关系硬伤')
    expect(characterRelationPriority([])).toBe('')
  })
})
