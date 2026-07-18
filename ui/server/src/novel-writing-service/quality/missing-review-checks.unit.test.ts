import { describe, expect, test } from 'bun:test'
import {
  appendMissingContractReviewCheck,
  appendMissingNextChapterQualityPlanReceiptCheck,
  appendMissingStatusFilterReceiptCheck,
} from './missing-review-checks'
import { getContextContract } from '../context/context-contract'
import { extractProseExpansionPayload, chunkStructuredReviewFields } from './prose-expansion'

describe('appendMissingContractReviewCheck', () => {
  test('emits missing placeholder only when contract exists and checks empty', () => {
    const checks = appendMissingContractReviewCheck([], { a: 1 }, 'quality_audit_checks', 'quality_audit_contract', '质量审计')
    expect(checks).toEqual([expect.objectContaining({ key: 'missing_quality_audit_checks', status: 'fail' })])
    expect(appendMissingContractReviewCheck([{ key: 'x' }], { a: 1 }, 'quality_audit_checks', 'quality_audit_contract', '质量审计')).toEqual([{ key: 'x' }])
    expect(appendMissingContractReviewCheck([], null, 'quality_audit_checks', 'quality_audit_contract', '质量审计')).toEqual([])
  })
})

describe('appendMissingStatusFilterReceiptCheck', () => {
  test('adds missing status filter receipt once', () => {
    const once = appendMissingStatusFilterReceiptCheck([], { alive: true }, [])
    expect(once.some((item: any) => item.key === 'missing_status_filter_receipts')).toBe(true)
    const twice = appendMissingStatusFilterReceiptCheck(once, { alive: true }, [])
    expect(twice.filter((item: any) => item.key === 'missing_status_filter_receipts')).toHaveLength(1)
  })
})

describe('appendMissingNextChapterQualityPlanReceiptCheck', () => {
  test('requires delivery risk carry-over debt', () => {
    expect(appendMissingNextChapterQualityPlanReceiptCheck([], {})).toEqual([])
    const checks = appendMissingNextChapterQualityPlanReceiptCheck([], {
      chapter_target: { delivery_risk_carry_over: { quality_focus: ['承上'] } },
    })
    expect(checks[0]?.key).toBe('missing_next_chapter_quality_plan_receipts')
  })
})

describe('getContextContract', () => {
  test('reads camel and snake aliases from chapter target and blueprint', () => {
    expect(getContextContract({
      chapterTarget: { stateTrackingContract: { x: 1 } },
    }, 'state_tracking_contract')).toEqual({ x: 1 })
    expect(getContextContract({
      chapter_target: { chapter_blueprint: { quality_audit_contract: { y: 2 } } },
    }, 'quality_audit_contract')).toEqual({ y: 2 })
  })
})

describe('extractProseExpansionPayload', () => {
  test('reads prose_chapters from model content payload shape', () => {
    const extracted = extractProseExpansionPayload({
      content: JSON.stringify({
        prose_chapters: [{ chapter_text: '正文A', scene_breakdown: ['s1'], continuity_notes: ['c1'] }],
      }),
    })
    expect(extracted.text).toBe('正文A')
    expect(extracted.scene_breakdown).toEqual(['s1'])
    expect(extracted.continuity_notes).toEqual(['c1'])
  })
})

describe('chunkStructuredReviewFields', () => {
  test('chunks within 1-6 size and falls back for falsy batch size', () => {
    expect(chunkStructuredReviewFields(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']])
    // batchSize 0 is falsy and falls back to 4, matching monofile behavior
    expect(chunkStructuredReviewFields(['a', 'b', 'c', 'd', 'e'], 0)).toEqual([['a', 'b', 'c', 'd'], ['e']])
  })
})
