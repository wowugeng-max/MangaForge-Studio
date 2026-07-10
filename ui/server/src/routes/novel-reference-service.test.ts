import { describe, expect, test } from 'bun:test'
import { buildReferenceQualityAssessment, createNovelReferenceService } from './novel-reference-service'
import { createNovelProductionService } from './novel-production-service'

describe('reference safety assessment', () => {
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
