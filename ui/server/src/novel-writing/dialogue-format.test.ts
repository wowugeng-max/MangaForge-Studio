import { describe, expect, test } from 'bun:test'
import {
  scanDialogueFormatRisks,
  scanDialogueQuoteStyleRisks,
} from './dialogue-format'

describe('dialogue format scan utilities', () => {
  test('detects embedded dialogue and mechanical dialogue tags as oh-story format risks', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '她把杯子放下，说道：“你走吧。”他没有动。',
      '林智道：“门外那个人在撒谎。”',
      '"别动。"',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_embedded_line_3',
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('对白独立成行')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(checks.map((item: any) => item.evidence).join('｜')).not.toContain('"别动。"')
  })

  test('detects trailing formulaic dialogue tags from oh-story examples', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '"好的。"他说道。',
      '"门外有人。"她问道。',
      '"别动。"他点了根烟。',
    ].join('\n'))

    const mechanicalTagChecks = checks.filter((item: any) => String(item.key || '').startsWith('dialogue_mechanical_tag_line_'))
    expect(mechanicalTagChecks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).toContain('"好的。"他说道')
    expect(mechanicalTagChecks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).not.toContain('点了根烟')
  })

  test('detects mixed dialogue quote styles before relying on model self review', () => {
    const checks = scanDialogueQuoteStyleRisks([
      '第12章 管理员',
      '',
      '"别开门。"',
      '「你听见了吗？」',
      '"门外那个人在撒谎。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_quote_style_mixed')
    expect(checks[0].label).toBe('对白引号风格扫描')
    expect(checks[0].evidence).toContain('"别开门。"')
    expect(checks[0].evidence).toContain('「你听见了吗？」')
    expect(checks[0].fix).toContain('统一')
    expect(checks[0].fix).toContain('项目/平台')
  })
})
