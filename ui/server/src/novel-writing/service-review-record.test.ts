import { describe, expect, test } from 'bun:test'
import {
  buildReadabilityReviewRecord,
  buildSettingConsistencyReviewRecord,
  buildUnattendedPreflightRepairReviewRecord,
} from './service-review-record'

describe('service review record builders', () => {
  const chapter = { id: 34, chapter_no: 5 }

  test('builds unattended preflight repair records with legacy status and payload', () => {
    const repaired = [
      { type: 'chapter_setting_usage_matched', chapter_id: 34, total: 3 },
      { type: 'setting_created', id: 7, name: '巡夜戒律', entity_type: 'rule' },
    ]
    const errors = ['设定工坊补齐失败：timeout']

    const record = buildUnattendedPreflightRepairReviewRecord({
      projectId: 12,
      chapter,
      missingKeys: ['chapter_setting_usage', 'timeline'],
      repaired,
      errors,
    })

    expect(record).toEqual({
      project_id: 12,
      review_type: 'unattended_preflight_repair',
      status: 'warn',
      summary: '无人值守前置材料自动补齐 2 项',
      issues: errors,
      payload: JSON.stringify({
        chapter_id: 34,
        chapter_no: 5,
        missing_keys: ['chapter_setting_usage', 'timeline'],
        repaired,
        errors,
      }),
    })
  })

  test('builds readability review records with formatter dependency and meme fallback', () => {
    const readabilityReview = {
      readability_score: 77,
      meme_sense: {},
      issues: [
        { dimension: '句式', description: '长句过密' },
        '对白解释腔',
      ],
    }
    const memePolish = { status: 'applied', changed_count: 2 }

    const record = buildReadabilityReviewRecord({
      projectId: 12,
      chapter,
      readabilityReview,
      memePolish,
      memeIntensityFallback: '中',
      formatIssue: issue => typeof issue === 'string' ? issue : `${issue.dimension}｜${issue.description}`,
    })

    expect(record).toEqual({
      project_id: 12,
      review_type: 'readability_review',
      status: 'warn',
      summary: '可读性 77，网感中',
      issues: ['句式｜长句过密', '对白解释腔'],
      payload: JSON.stringify({
        chapter_id: 34,
        chapter_no: 5,
        readability_review: readabilityReview,
        meme_polish: memePolish,
      }),
    })
  })

  test('marks readability review ok at the legacy threshold', () => {
    const record = buildReadabilityReviewRecord({
      projectId: 12,
      chapter,
      readabilityReview: { readability_score: 78, meme_sense: { intensity: '强' }, issues: [] },
      memePolish: null,
      memeIntensityFallback: '弱',
      formatIssue: issue => String(issue),
    })

    expect(record.status).toBe('ok')
    expect(record.summary).toBe('可读性 78，网感强')
  })

  test('builds setting consistency records only when context or violations exist', () => {
    expect(buildSettingConsistencyReviewRecord({
      projectId: 12,
      chapter,
      contextPackage: { setting_context: { chapter_usage: [] } },
      selfCheck: { review: { setting_violations: [] } },
    })).toBeNull()

    const contextPackage = {
      setting_context: {
        chapter_usage: [{ setting_name: '巡夜戒律', usage_type: 'constraint' }],
      },
    }
    const selfCheck = {
      review: {
        setting_violations: [
          { severity: 'high', description: '能力代价未兑现' },
          { setting_name: '禁术边界' },
        ],
        craft_metrics: { setting_consistency_score: 63 },
      },
    }

    const record = buildSettingConsistencyReviewRecord({
      projectId: 12,
      chapter,
      contextPackage,
      selfCheck,
    })

    expect(record).toEqual({
      project_id: 12,
      review_type: 'setting_consistency',
      status: 'warn',
      summary: '设定一致性发现 2 项风险',
      issues: ['high｜能力代价未兑现', 'medium｜禁术边界'],
      payload: JSON.stringify({
        chapter_id: 34,
        chapter_no: 5,
        source: 'prose_quality_self_check',
        setting_context: contextPackage.setting_context,
        setting_violations: selfCheck.review.setting_violations,
        craft_metrics: { setting_consistency_score: 63 },
      }),
    })
  })
})
