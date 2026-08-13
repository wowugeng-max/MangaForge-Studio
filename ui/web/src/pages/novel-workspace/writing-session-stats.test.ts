import { describe, expect, test } from 'bun:test'
import { createWritingSessionTracker, formatWritingSessionLabel } from './writing-session-stats'

const MINUTE = 60_000

describe('createWritingSessionTracker', () => {
  test('累积本次会话新增字数', () => {
    const tracker = createWritingSessionTracker()
    tracker.record(1, 1000, 0)
    tracker.record(1, 1200, 2 * MINUTE)
    tracker.record(1, 1500, 4 * MINUTE)
    expect(tracker.stats(1, 4 * MINUTE).sessionAdded).toBe(500)
  })

  test('删改导致字数下降时新增不为负', () => {
    const tracker = createWritingSessionTracker()
    tracker.record(1, 1000, 0)
    tracker.record(1, 600, 2 * MINUTE)
    expect(tracker.stats(1, 2 * MINUTE).sessionAdded).toBe(0)
  })

  test('近10分钟窗口推算码字速度(字/时)', () => {
    const tracker = createWritingSessionTracker()
    tracker.record(1, 1000, 0)
    tracker.record(1, 1400, 10 * MINUTE)
    // 10 分钟 +400 字 → 2400 字/时
    expect(tracker.stats(1, 10 * MINUTE).wordsPerHour).toBe(2400)
  })

  test('窗口不足1分钟不出速度', () => {
    const tracker = createWritingSessionTracker()
    tracker.record(1, 1000, 0)
    tracker.record(1, 1050, 30_000)
    expect(tracker.stats(1, 30_000).wordsPerHour).toBeNull()
  })

  test('切章重置会话', () => {
    const tracker = createWritingSessionTracker()
    tracker.record(1, 1000, 0)
    tracker.record(1, 1500, 2 * MINUTE)
    tracker.record(2, 800, 3 * MINUTE)
    tracker.record(2, 900, 5 * MINUTE)
    expect(tracker.stats(2, 5 * MINUTE).sessionAdded).toBe(100)
  })
})

describe('formatWritingSessionLabel', () => {
  test('有增量有速度', () => {
    expect(formatWritingSessionLabel({ sessionAdded: 820, wordsPerHour: 2400 })).toBe('本次 +820 字 · 2,400 字/时')
  })

  test('有增量无速度', () => {
    expect(formatWritingSessionLabel({ sessionAdded: 50, wordsPerHour: null })).toBe('本次 +50 字')
  })

  test('无增量返回空串', () => {
    expect(formatWritingSessionLabel({ sessionAdded: 0, wordsPerHour: 1200 })).toBe('')
  })
})
