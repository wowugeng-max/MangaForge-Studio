import { describe, expect, test } from 'bun:test'
import {
  normalizeStoryLoopBeat,
  normalizeStoryLoopMapTransitionCheck,
  normalizeStoryLoopNestedLoopCheck,
  storyLoopPriority,
} from './story-loop-basics'

describe('story loop basic sync checks', () => {
  test('confirms a story loop beat when expected text lands in prose', () => {
    const check = normalizeStoryLoopBeat(
      'payoff',
      '兑现反馈',
      '当众作废停业单并恢复授权',
      '他当众作废停业单并恢复授权，围观商户第一次松了口气。',
      36,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toContain('当众作废停业单并恢复授权')
  })

  test('warns when a story loop beat is not delivered', () => {
    const check = normalizeStoryLoopBeat(
      'carry_over',
      '承接期待',
      '章末留下医院备用电源的新问题',
      '这一段只是总结本章结束，没有新的目标、风险或线索。',
      36,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.issue).toContain('承接期待未充分兑现')
    expect(check?.repair_instruction).toContain('setup -> escalation -> payoff -> carry_over')
  })

  test('confirms nested story loops when loop levels expectation and variation are visible', () => {
    const check = normalizeStoryLoopNestedLoopCheck(
      ['小循环到中循环再到大循环'],
      '本章小循环完成局部反馈，中循环次级目标被推进，大循环期待和卷目标同时浮出；同一核心卖点换成新地图、新势力和新规则的不同角度。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '小/中/大循环层级可见',
      '大循环/长期期待可见',
      '同一核心卖点换角度或矛盾',
    ]))
  })

  test('warns when nested loops repeat the same hook without expansion', () => {
    const check = normalizeStoryLoopNestedLoopCheck(
      ['循环嵌套'],
      '小循环、中循环和大循环都被提到，但只是反复用同一个梗换对象，核心不扩展。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('核心不扩展，只换对象重复')
  })

  test('confirms map transition when old conflict closes and the new map is bridged', () => {
    const check = normalizeStoryLoopMapTransitionCheck(
      ['换地图承接'],
      '旧地图核心冲突阶段性解决。旧日关系先来信牵线，证人跟来作证，主角才决定进入赤炉城。新地图赤炉城有炉烟街巷，新角色掌炉人和地头蛇，新规则炼炉保炉牌通行，新目标是拿到炉牌，新冲突是地头蛇挡路扣住证人。前五章目标明确，门槛压到眼前，贯穿主线继续牵住旧账，循环升级到更高门槛和更强对手，过渡人物带人走完成新旧地图联动。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '旧地图核心冲突已阶段性解决',
      '新地图五件套可见(5/5)',
      '人际关系先行动，主角再动',
    ]))
  })

  test('prioritizes story loop repairs', () => {
    expect(storyLoopPriority([
      { key: 'setup' },
      { key: 'map_transition_rules' },
    ])).toBe('优先补换地图承接')

    expect(storyLoopPriority([
      { key: 'nested_loop_rules' },
      { key: 'payoff' },
    ])).toBe('优先补兑现反馈')
  })
})
