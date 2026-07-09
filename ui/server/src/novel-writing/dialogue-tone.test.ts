import { describe, expect, test } from 'bun:test'
import { scanDialogueToneRisks } from './dialogue-tone'

describe('dialogue tone scan utilities', () => {
  test('detects generic explanatory dialogue tone as Gate E prose smell', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“你要明白，这件事没有那么简单，也就是说规则背后还有另一套机制。”',
      '张智问：“另一套机制？”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      gate: 'E',
      status: 'warn',
      line: 3,
    })
    expect(checks[0].pattern).toContain('对话腔调')
    expect(checks[0].evidence).toContain('你要明白')
    expect(checks[0].fix).toContain('议程')
  })

  test('detects formal written diction in short dialogue that should sound spoken', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“我认为此事不妥。”',
      '张智说：“这事不靠谱。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('E')
    expect(checks[0].pattern).toContain('对白书面语')
    expect(checks[0].evidence).toContain('我认为此事不妥')
    expect(checks[0].fix).toContain('我觉得不靠谱')
  })

  test('does not flag pressured dialogue even when it contains explanatory phrases', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员吼道：“你要明白，这件事没有那么简单，马上回答我！”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
})
