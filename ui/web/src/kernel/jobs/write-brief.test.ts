import { describe, expect, test } from 'bun:test'
import { writeChapterLengthTarget } from './write-brief'

describe('writeChapterLengthTarget', () => {
  test('formats custom word count', () => {
    expect(writeChapterLengthTarget({ word_target_mode: 'custom', target_word_count: 1800 })).toBe('自定义 1800 字')
  })

  test('formats named word_target_mode', () => {
    expect(writeChapterLengthTarget({ word_target_mode: 'auto' })).toBe('word_target_mode=auto')
  })

  test('returns empty string for empty payload', () => {
    expect(writeChapterLengthTarget({})).toBe('')
  })
})
