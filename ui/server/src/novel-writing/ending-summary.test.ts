import { describe, expect, test } from 'bun:test'
import { scanEndingSummaryRisks } from './ending-summary'

describe('ending summary scan utilities', () => {
  test('detects ending summary uplift as Gate F prose smell', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把书本收进书包，走廊终于安静下来。',
      '经历了这一切，他终于明白，这只是新的开始，未来还有更大的挑战等着他。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      gate: 'F',
      status: 'warn',
    })
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('终于明白')
    expect(checks[0].fix).toContain('具体钩子')
  })

  test('detects philosophical final-line slogans instead of concrete page-turn hooks', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌按回掌心，门外的脚步声渐渐远了。',
      '他终于明白了生活的真谛：有时候，放手才是最好的选择。',
      '这一夜，注定无人入眠。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('生活的真谛')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects universal happy-ending conclusions without unresolved tension', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰收起黑名单，众人终于松了一口气。',
      '这一刻，所有人都相信未来可期，前途无量。',
      '走廊尽头重新充满希望。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].evidence).toContain('未来可期')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects sentimental time-passing endings from oh-story rewrite examples', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌塞进口袋，门外那串脚印停在楼梯口。',
      '岁月如流水般悄然流逝。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('F')
    expect(checks[0].evidence).toContain('岁月如流水')
    expect(checks[0].fix).toContain('直接删掉')
  })

  test('does not flag summary words when the tail lands on a concrete hook', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰终于明白门牌为什么被调换。',
      '他还没开口，门外广播突然响起：“名单更新，倒计时十秒。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
})
