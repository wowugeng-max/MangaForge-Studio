import { describe, expect, test } from 'bun:test'
import {
  firstCompactText,
  firstSceneCardText,
  normalizeStoryDriveDimension,
  storyDrivePriority,
  storyDriveRepairInstruction,
} from './story-drive-basics'

describe('story drive basic sync checks', () => {
  test('selects the first non-empty compact text value', () => {
    expect(firstCompactText('', null, '  主角  当众  反证  ')).toBe('主角 当众 反证')
    expect(firstCompactText('', undefined)).toBe('')
  })

  test('selects the first matching scene-card field', () => {
    const cards = [
      { purpose: '', conflict: '  门口  规则封锁  ' },
      { goal: '第二张卡不会被读取' },
    ]

    expect(firstSceneCardText(cards, ['goal', 'conflict'])).toBe('门口 规则封锁')
    expect(firstSceneCardText(cards, ['missing'])).toBe('')
  })

  test('confirms a story drive dimension when expected text lands in prose', () => {
    const check = normalizeStoryDriveDimension(
      'protagonist_choice',
      '主角选择',
      '主角当众拆开封条反证协会记录',
      '主角当众拆开封条反证协会记录，逼得会长改口。',
      42,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toContain('主角当众拆开封条反证协会记录')
  })

  test('warns with category repair instruction when evidence is missing', () => {
    const check = normalizeStoryDriveDimension(
      'choice_cost',
      '选择代价',
      '当众反证后失去协会保护',
      '这一段只是背景解释，没有现场行动后果。',
      42,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.issue).toContain('选择代价未充分兑现')
    expect(check?.repair_instruction).toContain('补出选择带来的即时代价')
  })

  test('returns repair instructions by story drive category', () => {
    expect(storyDriveRepairInstruction('protagonist_choice')).toContain('补出主角')
    expect(storyDriveRepairInstruction('choice_cost')).toContain('即时代价')
    expect(storyDriveRepairInstruction('state_change')).toContain('状态')
    expect(storyDriveRepairInstruction('obstacle')).toContain('外部阻碍')
    expect(storyDriveRepairInstruction('causal_next_step')).toContain('下一步因果')
    expect(storyDriveRepairInstruction('chapter_goal')).toContain('本章目标')
  })

  test('prioritizes story drive repairs by highest-impact missing item', () => {
    expect(storyDrivePriority([
      { key: 'state_change' },
      { key: 'choice_cost' },
    ])).toBe('优先补选择代价')

    expect(storyDrivePriority([
      { key: 'chapter_goal' },
      { key: 'causal_next_step' },
    ])).toBe('优先补下一步因果')
  })
})
