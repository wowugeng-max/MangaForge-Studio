import { describe, expect, test } from 'bun:test'
import { deepMergeObjects } from '../../routes/novel-route-utils'
import {
  applyDeterministicWordCountIssueGuard,
  mergePostDeliveryReceiptSyncIntoQualityGateReview,
  mergeQualityRecheckReviewWithStructuredEvidence,
  mergeStructuredReviewFillPayload,
} from '../index'

describe('deepMergeObjects', () => {
  test('merges cyclic overrides without overflowing', () => {
    const override: any = { chapter_target: { title: '旧法失准' } }
    override.chapter_target.self = override.chapter_target

    const merged = deepMergeObjects({ chapter_target: { chapter_no: 2, title: '旧题' } }, override)

    expect(merged.chapter_target.chapter_no).toBe(2)
    expect(merged.chapter_target.title).toBe('旧法失准')
    expect(merged.chapter_target.self).toBe('[Circular]')
  })
})

describe('mergeQualityRecheckReviewWithStructuredEvidence', () => {
  test('preserves filled oh-story checks when a follow-up recheck returns missing placeholders', () => {
    const previousReview = {
      score: 82,
      issues: [{ severity: 'high', message: '旧稿质量问题' }],
      target_reader_checks: [
        { key: 'target_reader_match', status: 'pass', evidence: '目标读者回报明确。' },
      ],
      quality_audit_checks: [
        { key: 'quality_audit_density', status: 'pass', evidence: '旧稿已完成质量诊断。' },
      ],
    }
    const recheckReview = {
      score: 88,
      passed: true,
      issues: [],
      target_reader_checks: [
        { key: 'missing_target_reader_checks', status: 'fail', label: '缺少目标读者自检', evidence: '模型没有输出 target_reader_checks。' },
      ],
      quality_audit_checks: [
        { key: 'deterministic_paragraph_format', status: 'fail', evidence: '复检确定性扫描发现段落过长。' },
        { key: 'missing_quality_audit_checks', status: 'fail', label: '缺少质量诊断自检', evidence: '模型没有输出 quality_audit_checks。' },
      ],
    }

    const merged = mergeQualityRecheckReviewWithStructuredEvidence(previousReview, recheckReview)

    expect(merged.score).toBe(88)
    expect(merged.issues).toEqual([])
    expect(merged.target_reader_checks).toEqual(previousReview.target_reader_checks)
    expect(merged.quality_audit_checks.map((item: any) => item.key)).toEqual([
      'deterministic_paragraph_format',
      'quality_audit_density',
    ])
    expect(merged.quality_recheck_structured_evidence_preserved.fields).toEqual([
      'target_reader_checks',
      'quality_audit_checks',
    ])
  })
})

describe('mergePostDeliveryReceiptSyncIntoQualityGateReview', () => {
  test('clears missing receipt placeholders when deterministic sync reports are ok', () => {
    const merged = mergePostDeliveryReceiptSyncIntoQualityGateReview({
      state_tracking_checks: [
        {
          key: 'missing_status_filter_receipts',
          label: '缺少状态筛选回执',
          status: 'fail',
          evidence: '模型没有输出 status_filter_receipts。',
        },
      ],
      next_chapter_quality_plan_receipts: [
        {
          key: 'missing_next_chapter_quality_plan_receipts',
          label: '缺少质量续航回执',
          status: 'fail',
          evidence: '模型没有输出 next_chapter_quality_plan_receipts。',
        },
      ],
      quality_audit_checks: [
        {
          key: 'scene_card_receipt_2_scope_invalid',
          label: '场景卡回执证据复核',
          status: 'fail',
          evidence: 'scene_start_anchor 无法定位到正文对应场景。',
        },
      ],
    }, {
      statusFilterReceiptSync: {
        status: 'ok',
        label: '状态筛选回执 OK',
        summary: '状态筛选回执均可定位。',
        receipt_count: 2,
        requires_receipts: true,
      },
      nextChapterQualityPlanReceiptSync: {
        status: 'ok',
        label: '质量续航回执 OK',
        summary: '质量续航回执均可定位。',
        receipt_count: 1,
        requires_receipts: true,
      },
      sceneCardReceiptSync: {
        status: 'ok',
        label: '场景回执 OK',
        summary: '场景卡回执均可定位。',
        receipt_count: 2,
      },
    })

    expect(merged.state_tracking_checks.map((item: any) => item.key)).not.toContain('missing_status_filter_receipts')
    expect(merged.next_chapter_quality_plan_receipts.map((item: any) => item.key)).not.toContain('missing_next_chapter_quality_plan_receipts')
    expect(merged.quality_audit_checks.map((item: any) => item.key)).not.toContain('scene_card_receipt_2_scope_invalid')
    expect(merged.state_tracking_checks).toContainEqual(expect.objectContaining({
      key: 'status_filter_receipts_sync_ok',
      status: 'pass',
    }))
    expect(merged.quality_audit_checks).toContainEqual(expect.objectContaining({
      key: 'scene_card_receipts_sync_ok',
      status: 'pass',
    }))
  })
})

describe('mergeStructuredReviewFillPayload', () => {
  test('promotes nested pre-draft execution receipts into structured review fields', () => {
    const review = {
      intent_confirmation_checks: [
        { key: 'missing_intent_confirmation_checks', status: 'fail', label: '缺少意图确认自检', evidence: '模型没有输出 intent_confirmation_checks。' },
      ],
      benchmark_recall_checks: [
        { key: 'missing_benchmark_recall_checks', status: 'fail', label: '缺少文风召回自检', evidence: '模型没有输出 benchmark_recall_checks。' },
      ],
    }
    const payload = {
      oh_story_delivery_receipts: {
        pre_draft_execution_receipts: {
          intent_confirmation_checks: [{
            key: 'intent_emotion_goal',
            label: '意图确认',
            delivered: true,
            intent_field: 'emotion_goal',
            expected_intent: '压迫感中推进镇门危局',
            delivered_evidence: '砖缝里的黑血被履带碾开，江哲没有退。',
            blueprint_link: 'chapter_blueprint.emotion_goal',
            fix: '无',
            remaining_risk: '无',
          }],
          benchmark_recall_checks: [{
            key: 'rhythm_usage_receipt',
            label: '文风召回',
            delivered: true,
            source_type: 'rhythm',
            source_path: '剧情/节奏.md',
            expected_application: '高压推进，章尾留新危险。',
            delivered_evidence: '诱捕序列启动，镇门后的遗物成为下一章拉力。',
            gaps_preserved: '不复制对标桥段。',
            fix: '无',
            remaining_risk: '无',
          }],
        },
      },
    }

    const merged = mergeStructuredReviewFillPayload(review, payload, {}, '')

    expect(merged.intent_confirmation_checks).toEqual([
      expect.objectContaining({
        key: 'intent_emotion_goal',
        status: 'pass',
        delivered_evidence: '砖缝里的黑血被履带碾开，江哲没有退。',
      }),
    ])
    expect(merged.benchmark_recall_checks).toEqual([
      expect.objectContaining({
        key: 'rhythm_usage_receipt',
        status: 'pass',
        delivered_evidence: '诱捕序列启动，镇门后的遗物成为下一章拉力。',
      }),
    ])
  })
})

describe('applyDeterministicWordCountIssueGuard', () => {
  test('ignores LLM word-count shortage findings contradicted by deterministic count', () => {
    const text = '江哲抬手压住镇门。'.repeat(420)
    const result = applyDeterministicWordCountIssueGuard([
      {
        severity: 'S2',
        category: 'structure',
        evidence: '当前章节字数约1650字',
        description: '字数严重不足，未达到大纲要求的2800-3500字标准。',
        fix: '继续扩写。',
      },
    ], 75, text, { min: 2800, target: 3000, max: 3500 }, 85)

    expect(result.issues).toEqual([])
    expect(result.ignored_issues).toHaveLength(1)
    expect(result.score).toBe(85)
  })

  test('keeps low score when non-word-count high severity issues remain', () => {
    const text = '江哲抬手压住镇门。'.repeat(420)
    const result = applyDeterministicWordCountIssueGuard([
      {
        severity: 'S2',
        category: 'structure',
        evidence: '当前章节字数约1650字',
        description: '字数严重不足，未达到大纲要求的2800-3500字标准。',
      },
      {
        severity: 'S2',
        category: 'continuity',
        evidence: '上一章黑袍人追到门外，本章没有接住。',
        description: '章首承接断裂。',
      },
    ], 75, text, { min: 2800, target: 3000, max: 3500 }, 85)

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].category).toBe('continuity')
    expect(result.score).toBe(75)
  })
})

