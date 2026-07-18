import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/closure a', () => {
  test('keeps revision receipt repair tasks open until revision receipt checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'warn',
                evidence: 'revision_receipts 仍缺 changed_evidence。',
                fix: '补 changed_evidence。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('修订回执仍未闭环')
    expect(residual.note).toContain('changed_evidence')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'pass',
                evidence: '修订稿逐条补齐 revision_receipts.changed_evidence。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('修订回执仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('required_action')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'pass',
                required_action: '补齐 delivery_risk_receipts 对应的修订回执。',
                repair_segment: '第三场旧印对峙段。',
                applied_fix: '补主角用旧印反压长老席的动作和对白。',
                changed_evidence: '“旧印压在案角，长老席第一次退了半步。”',
                evidence: '修订稿逐条补齐 revision_receipts.changed_evidence。',
                fix: '逐条补 required_action、repair_segment、applied_fix 和 changed_evidence。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('修订回执复检通过')
    expect(cleared.note).toContain('revision_receipt_checks')
  })

  test('keeps deslop repair tasks open until deslop repair checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'warn',
                evidence: 'Gate E 模板化对白仍残留。',
                fix: '重修 Gate E。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('去AI味修复仍未闭环')
    expect(residual.note).toContain('Gate E')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'pass',
                evidence: '修订稿清掉 Gate E 模板化对白。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('去AI味修复仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('gate')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'pass',
                gate: 'Gate E',
                original_risk: '模板化对白和回执证据不足。',
                rewritten_evidence: '角色用半句反问和现场动作替代解释式对白。',
                changed_evidence: '“你敢押这枚旧印？”他把残印往案上一推。',
                receipt_synced: true,
                evidence: '修订稿清掉 Gate E 模板化对白，并补齐 deslop_repair_receipts.changed_evidence。',
                fix: '重写模板化对白并同步 deslop_repair_receipts。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('去AI味修复复检通过')
    expect(cleared.note).toContain('deslop_repair_checks')
  })

  test('keeps quality audit repair receipt tasks open until receipt sync clears', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          quality_audit_repair_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { label: '目的词详略分配', text: 'changed_evidence 为空，无法确认修复后正文证据。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('质量诊断修复回执仍未闭环')
    expect(residual.note).toContain('changed_evidence 为空')

    const genericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            quality_audit_repair_receipts: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(genericEvidenceResidual.annotationStatus).toBe('')
    expect(genericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(genericEvidenceResidual.note).toContain('证据泛化')

    const completedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(completedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(completedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(completedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(completedGenericEvidenceResidual.note).toContain('证据泛化')

    const adjustedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '调整完成。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(adjustedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(adjustedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(adjustedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(adjustedGenericEvidenceResidual.note).toContain('证据泛化')

    const supplementedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已经补齐。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(supplementedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(supplementedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(supplementedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(supplementedGenericEvidenceResidual.note).toContain('证据泛化')

    const vagueRevisedProseEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '见修订稿。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(vagueRevisedProseEvidenceResidual.taskStatus).toBe('needs_review')
    expect(vagueRevisedProseEvidenceResidual.annotationStatus).toBe('')
    expect(vagueRevisedProseEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(vagueRevisedProseEvidenceResidual.note).toContain('证据泛化')

    const keyedMissingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(keyedMissingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(keyedMissingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(keyedMissingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(keyedMissingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const labeledMissingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                label: '目的词详略分配',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(labeledMissingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(labeledMissingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(labeledMissingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(labeledMissingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const missingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                original_evidence: '删掉这段不影响章节推进。',
                applied_fix: '补出旧证触发守军换防。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(missingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(missingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(missingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 2,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('质量诊断修复回执复检通过')
    expect(cleared.note).toContain('quality_audit_repair_receipt_sync')
  })

})
