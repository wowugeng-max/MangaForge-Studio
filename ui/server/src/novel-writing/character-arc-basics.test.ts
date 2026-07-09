import { describe, expect, test } from 'bun:test'
import {
  characterArcPriority,
  characterArcRepairInstruction,
  normalizeCharacterArcDimension,
} from './character-arc-basics'

describe('character arc basic sync checks', () => {
  test('normalizes delivered character arc dimensions with matched evidence', () => {
    const check = normalizeCharacterArcDimension(
      'growth_beat',
      '成长节点',
      '林青禾从回避旧伤变成主动公开账册',
      '林青禾从回避旧伤变成主动公开账册，她选择站到众人面前承担代价。',
      40,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.score).toBeGreaterThanOrEqual(40)
    expect(check?.evidence.length).toBeGreaterThan(0)
    expect(check?.repair_instruction).toBe('')
  })

  test('warns missing character arc dimensions with specific repair instruction', () => {
    const check = normalizeCharacterArcDimension(
      'relationship_shift',
      '关系变化',
      '林青禾和沈砚从试探变成临时结盟',
      '这一章只有案件解释，没有任何关系反馈。',
      40,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.issue).toContain('关系变化未充分兑现')
    expect(check?.repair_instruction).toBe('补出人物关系的可见变化，例如信任、敌意、亏欠、试探或结盟。')
  })

  test('returns null for empty character arc dimensions', () => {
    expect(normalizeCharacterArcDimension('desire', '角色欲望', '', '正文')).toBeNull()
    expect(normalizeCharacterArcDimension('desire', '角色欲望', null, '正文')).toBeNull()
  })

  test('returns repair instruction by character arc key', () => {
    expect(characterArcRepairInstruction('desire')).toBe('补出角色本章想要什么，让欲望推动行动，而不是只被事件推着走。')
    expect(characterArcRepairInstruction('flaw_pressure')).toBe('补出角色缺陷、恐惧或旧习惯被冲突压迫的瞬间。')
    expect(characterArcRepairInstruction('voice_anchor')).toBe('补出角色稳定口吻和行动风格，避免所有人物说话像同一个旁白。')
    expect(characterArcRepairInstruction('other')).toBe('把人物弧光缺口写成角色欲望、缺陷受压、关系变化、成长节点或口吻锚点。')
  })

  test('prioritizes character arc repairs by highest-impact missed item', () => {
    expect(characterArcPriority([{ key: 'relationship_shift' }, { key: 'growth_beat' }])).toBe('优先补成长节点')
    expect(characterArcPriority([{ key: 'desire' }])).toBe('优先补角色欲望')
    expect(characterArcPriority([{ key: 'voice_anchor' }])).toBe('优先补人物口吻')
    expect(characterArcPriority([{ key: 'unknown' }])).toBe('')
  })
})
