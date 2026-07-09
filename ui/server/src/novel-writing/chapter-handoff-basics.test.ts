import { describe, expect, test } from 'bun:test'
import {
  buildChapterHandoffDeterministicCheck,
  chapterHandoffItems,
  chapterHandoffNegativeScope,
  chapterHandoffPriority,
  normalizeChapterHandoffDeliveryCheck,
} from './chapter-handoff-basics'

describe('chapter handoff basic sync checks', () => {
  test('normalizes handoff items from strings and structured rows', () => {
    expect(chapterHandoffItems([
      '  上一章账册变红  ',
      { text: '主角必须追问证人' },
      { label: '主角必须追问证人' },
      { summary: '旧印开始发烫' },
    ])).toEqual([
      '上一章账册变红',
      '主角必须追问证人',
      '旧印开始发烫',
    ])
  })

  test('detects negative chapter handoff scope signals', () => {
    expect(chapterHandoffNegativeScope('新剧情直接开始，上一章的危机被忘在一边。')).toBe(true)
    expect(chapterHandoffNegativeScope('开篇先处理上一章账册变红，再让证人改口。')).toBe(false)
  })

  test('confirms opening-only handoff delivery inside the opening window', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'previous_handoff',
      '上一章最后一幕',
      ['上一章账册变红', '证人当场改口'],
      '上一章账册变红，证人当场改口。主角立刻追问旧印来源。',
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('ok')
    expect(check?.match_scope).toBe('opening')
    expect(check?.score).toBe(100)
    expect(check?.missed_items).toEqual([])
  })

  test('warns when opening-only evidence lands too late', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'opening_obligations',
      '开篇义务',
      ['上一章账册变红'],
      `${'过场'.repeat(460)}上一章账册变红`,
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('warn')
    expect(check?.match_scope).toBe('opening')
    expect(check?.missed_items).toEqual(['上一章账册变红'])
    expect(check?.repair_instruction).toContain('开篇前300字必须补开篇义务')
  })

  test('blocks delivery when the prose explicitly drops the previous chapter handoff', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'previous_handoff',
      '上一章最后一幕',
      ['上一章账册变红'],
      '上一章账册变红，但主角没有处理上一章，直接重开新场景。',
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('warn')
    expect(check?.score).toBe(22)
    expect(check?.evidence).toContain('正文出现未承接上一章的负向信号')
    expect(check?.delivered).toBe(false)
  })

  test('builds deterministic handoff warnings from forbidden continuity breaks', () => {
    const check = buildChapterHandoffDeterministicCheck('新剧情直接开始，上一章危机暂时不重要。')

    expect(check?.key).toBe('chapter_handoff_forbidden')
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('期待债断线')
    expect(check?.missed_items).toContain('无桥接重开')
    expect(check?.repair_instruction).toContain('开篇先承接上一章最后一幕')
  })

  test('prioritizes handoff repair categories', () => {
    expect(chapterHandoffPriority([
      { key: 'previous_handoff' },
      { key: 'chapter_handoff_forbidden' },
    ])).toBe('优先清章首硬伤')
    expect(chapterHandoffPriority([{ key: 'opening_obligations' }])).toBe('优先补开篇义务')
    expect(chapterHandoffPriority([{ key: 'must_deliver' }])).toBe('优先补必兑现项')
    expect(chapterHandoffPriority([{ key: 'keep_alive' }])).toBe('')
  })
})
