import { describe, expect, test } from 'bun:test'
import { pickWritingAuxFocusTags } from './writingAuxFocusModel'

describe('pickWritingAuxFocusTags', () => {
  test('returns empty when nothing visible', () => {
    expect(pickWritingAuxFocusTags({})).toEqual([])
  })

  test('orders delivery, queue, brief and caps at 3', () => {
    const tags = pickWritingAuxFocusTags({
      delivery: { visible: true, statusLabel: '待质检', risky: true },
      queue: { visible: true, summary: '可写 2 · 待补 1' },
      brief: { visible: true, statusLabel: '任务书缺口', hasGap: true },
      handoff: { visible: true, label: '交接就绪' },
    }, 3)
    expect(tags.map(t => t.key)).toEqual(['delivery', 'queue', 'brief'])
    expect(tags[0].label).toContain('待质检')
    expect(tags[1].label).toContain('可写 2')
  })

  test('skips invisible entries and fills with handoff', () => {
    const tags = pickWritingAuxFocusTags({
      delivery: { visible: false, statusLabel: 'x' },
      queue: { visible: true, summary: '可写 1' },
      handoff: { visible: true, label: '交接 A' },
    })
    expect(tags.map(t => t.key)).toEqual(['queue', 'handoff'])
  })
})
