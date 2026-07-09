import { describe, expect, test } from 'bun:test'
import {
  attractionRepairInstruction,
  chapterAttractionPriority,
  normalizeAttractionDimension,
} from './chapter-attraction-basics'

describe('chapter attraction basic sync checks', () => {
  test('confirms attraction dimension when expected text lands in the scoped prose', () => {
    const check = normalizeAttractionDimension(
      'scene_drive',
      '场景推进',
      '林青禾必须当众拆穿假账',
      '林青禾必须当众拆穿假账，先逼对手交出旧账册，再让围观者看见规则漏洞。',
      { threshold: 40 },
    )

    expect(check.status).toBe('ok')
    expect(check.score).toBeGreaterThanOrEqual(40)
    expect(check.expected).toBe('林青禾必须当众拆穿假账')
    expect(check.evidence.length).toBeGreaterThan(0)
    expect(check.repair_instruction).toBe('')
  })

  test('warns attraction dimension with scoped opening and tail checks', () => {
    const lateOnly = `${'铺垫'.repeat(460)}开篇异常钩子`
    const openingCheck = normalizeAttractionDimension(
      'opening_hook',
      '开篇钩子',
      '开篇异常钩子',
      lateOnly,
      { openingOnly: true, threshold: 44 },
    )
    const tailCheck = normalizeAttractionDimension(
      'page_turn',
      '章末翻页',
      '章尾危险选择',
      `章尾危险选择先在前半段出现。${'过场'.repeat(650)}`,
      { tailOnly: true, threshold: 42 },
    )

    expect(openingCheck.status).toBe('warn')
    expect(openingCheck.repair_instruction).toBe('重写或补写前300字，先给异常、危险、欲望或反常信息。')
    expect(tailCheck.status).toBe('warn')
    expect(tailCheck.repair_instruction).toBe('重做最后300字，留下下一章非看不可的危险、选择、反转或未解答案。')
  })

  test('treats empty attraction expectations as ok placeholders', () => {
    const check = normalizeAttractionDimension('spread_scene', '传播场面', '', '正文')

    expect(check.status).toBe('ok')
    expect(check.score).toBe(82)
    expect(check.expected).toBe('')
    expect(check.issue).toBe('')
  })

  test('returns attraction repair instruction by key', () => {
    expect(attractionRepairInstruction('payoff_density')).toBe('补出可见反制结果、信息增量、能力展示或情绪回报。')
    expect(attractionRepairInstruction('spread_scene')).toBe('补成可视化传播场面，让读者能复述画面、机制反差或公开反转。')
    expect(attractionRepairInstruction('other')).toBe('把缺口写成可见冲突、行动结果、信息增量或章末问题。')
  })

  test('prioritizes chapter attraction repairs by reader pull impact', () => {
    expect(chapterAttractionPriority([
      { key: 'opening_hook', status: 'warn' },
      { key: 'page_turn', status: 'warn' },
    ])).toBe('优先修章末翻页')
    expect(chapterAttractionPriority([{ key: 'payoff_density', status: 'warn' }])).toBe('优先补爽点密度')
    expect(chapterAttractionPriority([{ key: 'spread_scene', status: 'ok' }])).toBe('')
  })
})
