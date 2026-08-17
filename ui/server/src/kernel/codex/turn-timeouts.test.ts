import { describe, expect, test } from 'bun:test'
import { turnTimeoutsForContract } from './turn-timeouts'

describe('turn timeouts', () => {
  test('open_book idle exceeds the 2-minute xhigh silent-reasoning gap', () => {
    const t = turnTimeoutsForContract({ verb: 'open_book' })
    expect(t.idleTimeoutMs).toBeGreaterThanOrEqual(15 * 60_000)
    expect(t.hardTimeoutMs).toBeGreaterThanOrEqual(45 * 60_000)
  })

  test('review/deslop/apply still survive multi-minute xhigh pauses', () => {
    for (const verb of ['review_chapter', 'deslop_chapter', 'apply_review'] as const) {
      const t = turnTimeoutsForContract({ verb })
      expect(t.idleTimeoutMs).toBeGreaterThan(120_000)
      expect(t.hardTimeoutMs).toBeGreaterThanOrEqual(30 * 60_000)
    }
  })
})
