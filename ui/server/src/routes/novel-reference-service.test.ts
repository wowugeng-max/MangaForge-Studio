import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createNovelProject, listNovelReviews } from '../novel'
import {
  buildReferenceQualityAssessment,
  buildReferenceUsageReviewRecord,
  createNovelReferenceService,
} from './novel-reference-service'
import { createNovelProductionService } from './novel-production-service'

describe('reference safety assessment', () => {
  test('builds a stable reference_report review record without persisting it', () => {
    const report = {
      strength_label: '弱',
      injected_entries: [{ id: 1 }],
      copy_guard: { hits: ['借鉴词'] },
      quality_assessment: { overall_score: 64, recommendations: ['补齐参考画像'] },
      safety_decision: { blocked: true, reasons: ['显式安全阻断'] },
    }

    const record = buildReferenceUsageReviewRecord({ id: 7 }, report)

    expect(record).toEqual({
      project_id: 7,
      review_type: 'reference_report',
      status: 'warn',
      summary: '参考报告：弱，注入 1 条，质量评分 64，疑似照搬 1 项',
      issues: ['显式安全阻断', '正文出现参考实体/证据词：借鉴词', '补齐参考画像'],
      payload: JSON.stringify(report),
    })
  })

  test('persists reference reports by default and supports a non-persisting staged mode', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-reference-report-'))
    try {
      const project = await createNovelProject(workspace, {
        title: '原创测试项目',
        reference_config: {},
      })
      const reference = createNovelReferenceService()

      const persisted = await reference.buildReferenceUsageReport(workspace, project, '正文创作', '')
      const afterDefault = await listNovelReviews(workspace, project.id)
      const staged = await reference.buildReferenceUsageReport(workspace, project, '正文创作', '', { persist: false })
      const afterStaged = await listNovelReviews(workspace, project.id)

      expect(afterDefault).toHaveLength(1)
      expect(afterDefault[0]).toMatchObject({ review_type: 'reference_report', project_id: project.id })
      expect(JSON.parse(afterDefault[0].payload)).toEqual(persisted)
      expect(staged).toEqual(persisted)
      expect(afterStaged).toHaveLength(1)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  test('treats an empty reference set as not applicable instead of high risk', () => {
    const quality = buildReferenceQualityAssessment({
      entries: [],
      active_references: [],
      warnings: [],
    }, [])
    const reference = createNovelReferenceService()
    const safetyDecision = reference.getReferenceSafetyDecision({
      reference_config: {
        safety: {
          enforce_on_generate: true,
          min_quality_score: 60,
          max_copy_hits: 0,
        },
      },
    }, {
      quality_assessment: quality,
      copy_guard: { hits: [] },
    })
    const approvalRequired = createNovelProductionService().approvalRequired({
      mode: 'balanced',
      require_safety_approval: true,
      allow_full_auto: false,
    }, 'safety', {}, {
      score: safetyDecision.score,
      copy_hit_count: safetyDecision.copy_hit_count,
      risk_level: quality.risk_level,
    })

    expect(quality).toMatchObject({
      assessment_applicable: false,
      active_reference_count: 0,
      injected_entry_count: 0,
      copy_hit_count: 0,
      overall_score: 100,
      risk_level: 'low',
      recommendations: [],
    })
    expect(safetyDecision).toMatchObject({
      blocked: false,
      score: 100,
      copy_hit_count: 0,
      reasons: [],
    })
    expect(approvalRequired).toBe(false)
  })

  test('keeps configured reference copy hits fail closed', () => {
    const quality = buildReferenceQualityAssessment({
      entries: [{ id: 1 }],
      active_references: [{ dimensions: ['structure'], avoid: ['names'] }],
      warnings: [],
    }, ['reference-name'])
    const safetyDecision = createNovelReferenceService().getReferenceSafetyDecision({
      reference_config: {
        safety: {
          enforce_on_generate: true,
          min_quality_score: 60,
          max_copy_hits: 0,
        },
      },
    }, {
      quality_assessment: quality,
      copy_guard: { hits: ['reference-name'] },
    })

    expect(quality.assessment_applicable).toBe(true)
    expect(safetyDecision.blocked).toBe(true)
    expect(safetyDecision.copy_hit_count).toBe(1)
    expect(safetyDecision.reasons.join('\n')).toContain('照搬命中 1 超过阈值 0')
  })

  test('keeps active-only and entry-only reference assessments applicable', () => {
    const activeOnly = buildReferenceQualityAssessment({
      entries: [],
      active_references: [{ dimensions: [], avoid: [] }],
      warnings: [],
    }, [])
    const entryOnly = buildReferenceQualityAssessment({
      entries: [{ id: 1 }],
      active_references: [],
      warnings: [],
    }, [])

    expect(activeOnly).toMatchObject({
      assessment_applicable: true,
      overall_score: 46,
      risk_level: 'high',
      reference_coverage_score: 0,
      injection_score: 0,
    })
    expect(entryOnly).toMatchObject({
      assessment_applicable: true,
      overall_score: 67,
      risk_level: 'medium',
      reference_coverage_score: 60,
      injection_score: 33,
    })
  })
})
