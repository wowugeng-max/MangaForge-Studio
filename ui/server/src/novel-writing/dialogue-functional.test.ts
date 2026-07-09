import { describe, expect, test } from 'bun:test'
import { scanDialogueFunctionalFillerRisks } from './dialogue-functional'

describe('dialogue functional filler scan utilities', () => {
  test('detects dialogue blocks that can be deleted without plot expectation or characterization loss', () => {
    const checks = scanDialogueFunctionalFillerRisks([
      '“你来了。”',
      '“嗯，我来了。”',
      '“今天辛苦了。”',
      '“还好，不算辛苦。”',
      '“那我们继续吧。”',
      '“好，继续。”',
      '“你真的很厉害。”',
      '“哪里哪里。”',
      '两人说完，事情没有新变化，也没有任何线索、行动、悬念或关系变化。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_functional_filler')
    expect(checks[0].label).toBe('可删除对白')
    expect(checks[0].line).toBe(1)
    expect(checks[0].evidence).toContain('你来了')
    expect(checks[0].fix).toContain('删掉这段对话')
  })

  test('does not flag dialogue that exposes clues and changes relationships', () => {
    const checks = scanDialogueFunctionalFillerRisks([
      '周薄森把空白封条拍到桌上。',
      '“昨夜送账本的人，左袖有墨。”',
      '李玄没有接话，只把第二份账册翻到缺页。',
      '“你怎么知道是左袖？”',
      '周薄森的手指僵住。',
      '林青禾退到长老身侧。',
      '“我作证，他刚才说漏了。”',
      '原本站在周薄森身后的人退开半步。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
})
