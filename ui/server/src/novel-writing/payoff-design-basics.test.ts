import { describe, expect, test } from 'bun:test'
import {
  normalizePayoffReverseDesignCheck,
  normalizePayoffTierRulesCheck,
  payoffEscalationDimensionEvidence,
} from './payoff-design-basics'

describe('payoff design basic sync checks', () => {
  test('extracts payoff escalation dimension evidence', () => {
    expect(payoffEscalationDimensionEvidence(
      '影响范围从个人扩散到全场，揭示深度从表象推进到真相，身份落差从路人变成权威改口。',
    )).toEqual([
      '影响范围递增',
      '揭示深度递增',
      '身份落差递增',
    ])
  })

  test('confirms payoff reverse design when setup expectation and payoff chain are visible', () => {
    const check = normalizePayoffReverseDesignCheck(
      {
        payoff_reverse_design: {
          design_order: ['先定爽点类型 -> 再定期待点 -> 最后倒推铺垫'],
        },
      },
      '先用旧印章和账册铺垫，再用公开认罪压力拉起期待点，最后反证旧账完成洗清，爽点类型是目标达成和态度转变。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '爽点类型/释放结果可见',
      '期待点/压力拉起可见',
      '铺垫物件/证据/规则/关系可见',
      '铺垫 -> 期待升高 -> 爽点释放链条可见',
    ]))
  })

  test('warns when payoff reverse design lacks setup', () => {
    const check = normalizePayoffReverseDesignCheck(
      {
        payoff_reverse_design: {
          design_order: ['先定爽点类型 -> 再定期待点 -> 最后倒推铺垫'],
        },
      },
      '爽点类型是目标达成，期待点已经拉起，最后直接洗清。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺铺垫倒推',
      '缺铺垫 -> 期待升高 -> 爽点释放链条',
    ]))
  })

  test('confirms payoff tier rules when core payoff serves the mainline', () => {
    const check = normalizePayoffTierRulesCheck(
      { payoff_tier_rules: ['核心爽点必须切在主线目标'] },
      '日常小装逼只用一句维持读者耐心，核心爽点围绕主线目标推进，反证旧账并拿回审判资格。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '日常小装逼控制篇幅/维持耐心',
      '核心爽点服务主线目标',
    ]))
  })

  test('warns when payoff tier drifts away from the mainline', () => {
    const check = normalizePayoffTierRulesCheck(
      { payoff_tier_rules: ['核心爽点必须切在主线目标'] },
      '核心爽点围绕主线目标推进，但支线装逼和主线无关，跑去酒楼打脸路人。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('出现偏离主线的装逼/打脸')
    expect(check?.missed_items).toContain('偏离爽点背离主线')
  })
})
