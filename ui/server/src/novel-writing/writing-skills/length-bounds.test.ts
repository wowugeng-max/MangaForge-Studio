import { describe, expect, test } from 'bun:test'
import { resolveWritingSkillLengthBounds } from './length-bounds'

const standard = { mode: 'standard' as const, target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字' }

describe('resolveWritingSkillLengthBounds', () => {
  test('lets a 3500-char standard chapter grow to 4300 and rejects 800', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 3500,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2700)
    expect(bounds.max).toBe(4620)
    expect(3500 >= bounds.min && 4300 <= bounds.max).toBe(true)
    expect(800 >= bounds.min).toBe(false)
  })

  test('uses 70% of source when that is higher than 2700', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 4000,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2800)
    expect(bounds.max).toBe(Math.max(Math.floor(4000 * 1.30), 4620))
  })

  test('forces under-2700 standard drafts to grow', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2700)
    expect(bounds.max).toBe(4620)
  })

  test('caps over-target chapters to about 5% slack', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 4712,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(Math.max(800, Math.ceil(4712 * 0.70), 2700))
    expect(bounds.max).toBe(4712 + Math.max(200, Math.floor(4712 * 0.05)))
  })

  test('does not apply the 2700 floor to long or custom chapters', () => {
    const long = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: { mode: 'long', target: 10000, min: 9000, max: 11000, label: '长章', rangeText: '' },
    })
    expect(long.min).toBe(Math.max(800, Math.ceil(2000 * 0.70)))
    expect(long.max).toBe(11000)

    const custom = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: { mode: 'custom', target: 1500, min: 1350, max: 1650, label: '自定义', rangeText: '' },
    })
    expect(custom.min).toBe(Math.max(800, Math.ceil(2000 * 0.70)))
    expect(custom.max).toBe(2000 + Math.max(200, Math.floor(2000 * 0.05)))
  })

  test('falls back to ±30% when no word target exists', () => {
    const bounds = resolveWritingSkillLengthBounds({ sourceChars: 1000 })
    expect(bounds.min).toBe(800)
    expect(bounds.max).toBe(1300)
  })
})
