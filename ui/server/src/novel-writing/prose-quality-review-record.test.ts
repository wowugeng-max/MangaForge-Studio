import { describe, expect, test } from 'bun:test'
import {
  buildProseQualityReviewPayload,
  buildProseQualityReviewRecord,
} from './prose-quality-review-record'

describe('prose quality review record builders', () => {
  test('builds the stable prose_quality review record shape for approval gates', () => {
    const selfCheck = {
      review: {
        score: 73,
        issues: [
          { severity: 'high', description: '开篇缺少明确钩子' },
          '节奏拖慢',
        ],
      },
    }

    const record = buildProseQualityReviewRecord({
      projectId: 12,
      status: 'warn',
      summarySuffix: '低分等待人工确认',
      selfCheck,
      formatIssue: (issue: any) => typeof issue === 'string' ? `文本｜${issue}` : `${issue.severity}｜${issue.description}`,
      stringifyPayload: JSON.stringify,
      payload: {
        chapterId: 34,
        contextPackage: { chapter: 'context' },
        editorRewrite: { edited: true },
        memePolish: { changed: false },
        readabilityReview: { score: 81 },
        selfCheck,
        qualityGate: { passed: false, score: 73 },
        approvalType: 'low_score',
        proseAdmission: {
          status: 'accepted_with_warnings',
          quality_score: 73,
          quality_warnings: [{ code: 'quality_score_below_target', source: 'quality', message: '低于目标' }],
          story_state_status: 'pending',
          story_state_warning: { code: 'story_state_invalid_payload' },
        },
        postDraftDirectorPayload: { oh_story_director: { status: 'ok' } },
        productionMode: 'unattended',
        configSnapshot: { model: 'gpt-5.5' },
      },
    })

    expect(record).toMatchObject({
      project_id: 12,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节群质检评分 73，低分等待人工确认',
      issues: ['high｜开篇缺少明确钩子', '文本｜节奏拖慢'],
    })
    expect(JSON.parse(record.payload)).toMatchObject({
      chapter_id: 34,
      context_package: { chapter: 'context' },
      editor_rewrite: { edited: true },
      meme_polish: { changed: false },
      readability_review: { score: 81 },
      self_check: selfCheck,
      quality_gate: { passed: false, score: 73 },
      approval_type: 'low_score',
      prose_admission: {
        status: 'accepted_with_warnings',
        quality_score: 73,
        story_state_status: 'pending',
      },
      proseAdmission: {
        status: 'accepted_with_warnings',
        quality_score: 73,
        story_state_status: 'pending',
      },
      oh_story_director: { status: 'ok' },
      production_mode: 'unattended',
      config_snapshot: { model: 'gpt-5.5' },
    })
  })

  test('keeps optional safety/reference fields out unless supplied', () => {
    expect(buildProseQualityReviewPayload({
      chapterId: 7,
      contextPackage: {},
      editorRewrite: {},
      memePolish: {},
      readabilityReview: {},
      selfCheck: { review: { score: 90 } },
      qualityGate: { passed: true },
      postDraftDirectorPayload: {},
      productionMode: 'draft',
      configSnapshot: {},
    })).toEqual({
      chapter_id: 7,
      context_package: {},
      editor_rewrite: {},
      meme_polish: {},
      readability_review: {},
      self_check: { review: { score: 90 } },
      quality_gate: { passed: true },
      production_mode: 'draft',
      config_snapshot: {},
    })
  })
})
