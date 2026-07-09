import { describe, expect, test } from 'bun:test'
import {
  buildExpectationBeforePayoffCheck,
  buildExpectationThresholdNextOpenLoopCheck,
  expectationThreeLinesArray,
  expectationThresholdArray,
  expectationThresholdPriority,
  normalizeExpectationThresholdCheck,
} from './expectation-threshold-basics'

describe('expectation threshold basic sync checks', () => {
  test('normalizes expectation threshold values into compact unique strings', () => {
    expect(expectationThresholdArray(['短期期待', '长期期待'], ' 短期期待 ', '', null)).toEqual([
      '短期期待',
      '长期期待',
    ])
  })

  test('confirms expectation threshold anchors when all planned items land in prose', () => {
    const check = normalizeExpectationThresholdCheck(
      'thresholds',
      '门槛拆分',
      ['资源型门槛先拿炉牌', '动态门槛升级到禁库试炼'],
      '资源型门槛先拿炉牌，动态门槛升级到禁库试炼。',
      '拆门槛',
      30,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['资源型门槛先拿炉牌', '动态门槛升级到禁库试炼']))
  })

  test('warns when expectation threshold anchors are missing', () => {
    const check = normalizeExpectationThresholdCheck(
      'two_long_one_short',
      '两长一短',
      ['短期期待驱动当前单元'],
      '本章只是直接解决事件，收束所有麻烦，没有留下新问题。',
      '恢复两长一短',
      30,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('短期期待驱动当前单元')
    expect(check?.repair_instruction).toBe('恢复两长一短')
  })

  test('merges next-open-loop scanner risks into the check', () => {
    const check = buildExpectationThresholdNextOpenLoopCheck(
      { next_open_loop: ['章末立起禁库试炼'] },
      '章末暂时没有新的目标，只把旧麻烦处理完。',
      {
        scanExpectationVacuumRisks: () => [{ evidence: '章尾闭合当前麻烦但缺少下一开环' }],
      },
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('章尾闭合当前麻烦但缺少下一开环')
    expect(check?.repair_instruction).toContain('下一目标')
  })

  test('confirms expectation-before-payoff when tension is built before release', () => {
    const check = buildExpectationBeforePayoffCheck(
      { expectation_before_payoff_rules: ['期待感大于爽点'] },
      '期待感大于爽点，先用门槛和信息差铺垫拉长，再到释放前一刻才兑现反证爽点。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['期待感大于爽点', '先铺垫再释放', '释放前张力可见']))
  })

  test('warns when payoff releases before expectation is built', () => {
    const check = buildExpectationBeforePayoffCheck(
      { expectation_before_payoff_rules: ['期待感大于爽点'] },
      '没有期待铺垫，爽点立刻释放，读者还没开始等就马上兑现。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('爽点立刻释放/期待铺垫不足')
  })

  test('normalizes three expectation lines from object and array forms', () => {
    expect(expectationThreeLinesArray({
      plot_expectation: '剧情期待',
      theme_payoff: '主题甜头',
      freshness_hook: '新鲜感刺激',
    })).toEqual(['剧情期待', '主题甜头', '新鲜感刺激'])

    expect(expectationThreeLinesArray(['剧情期待', '主题甜头'])).toEqual(['剧情期待', '主题甜头'])
  })

  test('prioritizes expectation threshold repairs', () => {
    expect(expectationThresholdPriority([
      { key: 'next_open_loop' },
      { key: 'expectation_before_payoff' },
    ])).toBe('优先补期待铺垫')

    expect(expectationThresholdPriority([
      { key: 'thresholds' },
      { key: 'dynamic_thresholds' },
    ])).toBe('优先拆门槛')
  })
})
