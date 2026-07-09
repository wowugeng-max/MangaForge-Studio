import { describe, expect, test } from 'bun:test'
import {
  normalizeStoryPowerCheck,
  storyPowerArray,
  storyPowerPriority,
  storyPowerRepairInstruction,
  storyPowerSignalEvidence,
} from './story-power-basics'

describe('story power basic sync checks', () => {
  test('normalizes story power values and detects five-dimension evidence', () => {
    expect(storyPowerArray(['目标阻碍动作反馈期待', '  有动作才是故事  '])).toEqual(['目标阻碍动作反馈期待', '有动作才是故事'])

    expect(storyPowerSignalEvidence(
      '目标是拿到资格，协会封锁阻碍压上来；他当众拆开设备验证错误码，因此暴露线索，章末指向库房追查。',
      'story_power_dimensions',
    )).toContain('目标/阻碍/行动/反馈/期待信号可见')
  })

  test('confirms story power dimensions from visible goal action feedback and expectation', () => {
    const check = normalizeStoryPowerCheck(
      'story_power_dimensions',
      '故事五维',
      ['目标、阻碍、动作、反馈、期待'],
      '目标是拿到资格，协会封锁阻碍压上来；他当众拆开设备验证错误码，因此暴露线索，章末指向库房追查。',
    )

    expect(check?.key).toBe('story_power_dimensions')
    expect(check?.delivered).toBe(true)
    expect(check?.story_power_dimension).toContain('目标、阻碍、动作、反馈、期待')
    expect(check?.evidence).toContain('目标/阻碍/行动/反馈/期待信号可见')
  })

  test('confirms action rules when action changes the situation', () => {
    const check = normalizeStoryPowerCheck(
      'action_rules',
      '有动作才是故事',
      ['角色主动验证、反制并改变局势'],
      '他没有解释，直接撬开封条启动设备，当众验证错误码；屏幕亮起，局势第一次转为他拿到资格。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.action_changed_situation).toContain('可见行动信号可见')
    expect(check?.evidence).toEqual(expect.arrayContaining(['可见行动信号可见', '行动改变局势信号可见']))
  })

  test('confirms beginning-end and causal feedback rules through signal evidence', () => {
    const beginningEnd = normalizeStoryPowerCheck(
      'beginning_end_rules',
      '有始有终',
      ['开场压力到章末状态变化'],
      '开场目标是拿到资格，规则封锁压住他；章末状态改变，线索指向库房，下一步选择必须继续追查。',
    )
    const feedback = normalizeStoryPowerCheck(
      'causal_feedback_rules',
      '因果反馈',
      ['动作必须带来反馈'],
      '他当众反制并追查错误码，行动立刻带来代价、信息、关系变化、规则触发和敌方反制反馈。',
    )

    expect(beginningEnd?.delivered).toBe(true)
    expect(beginningEnd?.beginning_to_end_change).toContain('开场压力到章末状态变化信号可见')
    expect(feedback?.delivered).toBe(true)
    expect(feedback?.causal_feedback).toContain('行动带来代价/信息/关系/规则/反制反馈信号可见')
  })

  test('warns when expected story power has no prose evidence', () => {
    const check = normalizeStoryPowerCheck(
      'causal_feedback_rules',
      '因果反馈',
      ['行动必须带来代价反馈'],
      '这一段只是背景解释和旁观评价，没有行动，也没有后果。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(22)
    expect(check?.repair_instruction).toContain('补因果反馈')
    expect(check?.remaining_risk).toContain('因果反馈缺口')
  })

  test('returns repair instructions by story power category', () => {
    expect(storyPowerRepairInstruction('action_rules')).toContain('补可见行动')
    expect(storyPowerRepairInstruction('beginning_end_rules')).toContain('补有始有终')
    expect(storyPowerRepairInstruction('causal_feedback_rules')).toContain('补因果反馈')
    expect(storyPowerRepairInstruction('chapter_power_loop')).toContain('补本章故事力循环')
    expect(storyPowerRepairInstruction('story_power_dimensions')).toContain('补故事五维')
  })

  test('prioritizes story power repairs', () => {
    expect(storyPowerPriority([
      { key: 'causal_feedback_rules' },
      { key: 'action_rules' },
    ])).toBe('优先补可见行动')

    expect(storyPowerPriority([
      { key: 'story_power_dimensions' },
      { key: 'beginning_end_rules' },
    ])).toBe('优先补有始有终')
  })
})
