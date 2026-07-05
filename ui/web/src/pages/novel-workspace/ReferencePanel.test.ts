import { describe, expect, test } from 'bun:test'
import { resolveQualityReportView } from './ReferencePanel'

describe('resolveQualityReportView', () => {
  test('recovers visible summary from legacy compacted prose quality previews', () => {
    const view = resolveQualityReportView({
      id: 460,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节自检评分 80',
      issues: ['minor｜旧记录至少要能显示问题摘要'],
      payload: JSON.stringify({
        truncated: true,
        reason: 'storage_compaction',
        original_chars: 143327,
        preview: '{"chapter_id":6,"context_package":{"summary":{"chapter_title":"小镇追索"}',
      }),
      created_at: '2026-07-05T01:30:00.000Z',
    })

    expect(view.score).toBe(80)
    expect(view.chapterTarget.chapter_id).toBe(6)
    expect(view.chapterTarget.title).toBe('小镇追索')
    expect(view.issues).toEqual(['minor｜旧记录至少要能显示问题摘要'])
  })
})
