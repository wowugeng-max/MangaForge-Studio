import { describe, expect, test } from 'bun:test'
import { reportChapterId } from './workspace-center-quality-revision-panel'

describe('reportChapterId', () => {
  test('reads chapter id from normal quality report payloads', () => {
    expect(reportChapterId({ payload: { chapter_id: 7 } })).toBe(7)
    expect(reportChapterId({ payload: JSON.stringify({ context_package: { chapter_target: { id: 9 } } }) })).toBe(9)
  })

  test('falls back to the truncated preview chapter target for legacy compacted reports', () => {
    const payload = {
      truncated: true,
      preview: '{"chapter_id": 123, "chapter_no": 12, "chapter_title": "旧章", "self_check"',
    }
    expect(reportChapterId({ payload })).toBe(123)
  })
})
