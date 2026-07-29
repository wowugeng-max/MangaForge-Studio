import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

const specializedSyncCases = [
  [
    'deslop repair receipt',
    {
      source: 'review_annotation_risk',
      issue_type: 'deslop_repair_receipt',
      annotation_category: 'deslop_repair_receipt',
      annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
    },
    'deslop_repair_receipt_sync',
  ],
  [
    'revision cascade impact',
    {
      source: 'review_annotation_risk',
      issue_type: 'revision_cascade_impact',
      annotation_category: 'revision_cascade_impact',
      annotation_key: 'revision_cascade_impact_sync:209:12:12:revision_cascade_impact:级联修订',
    },
    'revision_cascade_impact_sync',
  ],
  [
    'revision scope guard',
    {
      source: 'review_annotation_risk',
      issue_type: 'revision_scope_guard',
      annotation_category: 'revision_scope_guard',
      annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
    },
    'revision_scope_guard_sync',
  ],
  [
    'revision context receipt',
    {
      source: 'review_annotation_risk',
      issue_type: 'revision_context_receipts_sync',
      annotation_category: 'revision_context_receipts',
      annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
    },
    'revision_context_receipts_sync',
  ],
  [
    'prose revision receipt',
    {
      source: 'review_annotation_risk',
      issue_type: 'prose_revision_receipt_sync',
      annotation_category: 'prose_revision_receipt',
      annotation_key: 'prose_revision_receipt_sync:211:12:12:prose_revision_receipt:修订回执',
    },
    'prose_revision_receipt_sync',
  ],
  [
    'quality-audit repair receipt',
    {
      source: 'review_annotation_risk',
      issue_type: 'quality_audit_repair_receipt',
      annotation_category: 'quality_audit_repair_receipt',
      annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
    },
    'quality_audit_repair_receipt_sync',
  ],
] as const

const nonExactSpecializedSyncStatuses = [
  ['uppercase', 'OK'],
  ['whitespace-padded', ' ok '],
  ['non-string', ['ok']],
] as const

describe('buildRepairTaskRevisionPrompt specialty/closure b', () => {
  test('keeps deslop repair receipt tasks open until receipt sync clears', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          deslop_repair_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('去AI味修复回执仍未闭环')
    expect(residual.note).toContain('连续主语问题')

    const lateMissingChangedEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          deslop_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 7,
            completed: [
              {
                gate: 'Gate A',
                label: '抽象情绪',
                original_evidence: '他心中五味杂陈。',
                applied_fix: '改成手指抠住门框。',
                changed_evidence: '他把指节抠进门框裂缝，木刺扎出血点。',
                remaining_risk: '',
              },
              {
                gate: 'Gate B',
                label: '连续主语',
                original_evidence: '他走到门口，他回头看。',
                applied_fix: '压成动作链。',
                changed_evidence: '他走到门口，回头把账册抛给林青禾。',
                remaining_risk: '',
              },
              {
                gate: 'Gate C',
                label: '解释腔',
                original_evidence: '这说明他们已经没有退路。',
                applied_fix: '改成外部压力。',
                changed_evidence: '城门闩咔哒落下，退路被铁链封死。',
                remaining_risk: '',
              },
              {
                gate: 'Gate D',
                label: '空泛形容',
                original_evidence: '气氛十分紧张。',
                applied_fix: '改成具体感官。',
                changed_evidence: '火油味从门缝灌进来，三个人同时按住刀柄。',
                remaining_risk: '',
              },
              {
                gate: 'Gate E',
                label: '对白模板',
                original_evidence: '你真的明白了吗。',
                applied_fix: '改成带交易压力的对白。',
                changed_evidence: '林青禾压低声音：“账册给我，门外那队人归你。”',
                remaining_risk: '',
              },
              {
                gate: 'Gate F',
                label: '总结升华',
                original_evidence: '他终于懂得承担。',
                applied_fix: '改成代价动作。',
                changed_evidence: '他把腰牌塞进火盆，任凭旧姓在铜面上烧黑。',
                remaining_risk: '',
              },
              {
                gate: 'Gate G',
                label: '章末泄力',
                original_evidence: '他们终于安全了。',
                applied_fix: '改成新压力。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(lateMissingChangedEvidence.taskStatus).toBe('needs_review')
    expect(lateMissingChangedEvidence.annotationStatus).toBe('')
    expect(lateMissingChangedEvidence.note).toContain('去AI味修复回执仍未闭环')
    expect(lateMissingChangedEvidence.note).toContain('缺少 changed_evidence')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          deslop_repair_receipt_sync: {
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
    expect(cleared.note).toContain('去AI味修复回执复检通过')
    expect(cleared.note).toContain('deslop_repair_receipt_sync')
  })

  test('keeps revision cascade and scope guard tasks open until sync clears', () => {
    const contextResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          revision_context_receipts_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              {
                label: '时间线核对',
                evidence: '上一章禁门仍未开启，但修订后直接进入门后。',
                fix: '补出禁门开启动作，或把门后信息推迟到下一章。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(contextResidual.taskStatus).toBe('needs_review')
    expect(contextResidual.annotationStatus).toBe('')
    expect(contextResidual.note).toContain('修订上下文仍未闭环')
    expect(contextResidual.note).toContain('上一章禁门仍未开启')

    const missingSourceEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'timeline',
                label: '时间线',
                status: 'pass',
                fix: '已核对时间线一致。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingSourceEvidenceResidual.taskStatus).toBe('needs_review')
    expect(missingSourceEvidenceResidual.annotationStatus).toBe('')
    expect(missingSourceEvidenceResidual.note).toContain('修订上下文仍未闭环')
    expect(missingSourceEvidenceResidual.note).toContain('缺少 evidence/source_excerpt')

    const missingSourceExcerptResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'timeline',
                label: '时间线',
                status: 'pass',
                evidence: '审判庭复核仍发生在同日夜间。',
                fix: '无需修订，时间线一致。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingSourceExcerptResidual.taskStatus).toBe('needs_review')
    expect(missingSourceExcerptResidual.annotationStatus).toBe('')
    expect(missingSourceExcerptResidual.note).toContain('修订上下文仍未闭环')
    expect(missingSourceExcerptResidual.note).toContain('缺少 source_excerpt')

    const contextCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 8,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(contextCleared.taskStatus).toBe('resolved')
    expect(contextCleared.annotationStatus).toBe('resolved')
    expect(contextCleared.note).toContain('修订上下文复检通过')
    expect(contextCleared.note).toContain('revision_context_receipts_sync')

    const cascadeResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_cascade_impact',
        annotation_category: 'revision_cascade_impact',
        annotation_key: 'revision_cascade_impact_sync:209:12:12:revision_cascade_impact:级联修订',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          revision_cascade_impact_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { target: '令牌背面血字', text: '令牌状态改变会影响第13章开篇交接。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cascadeResidual.taskStatus).toBe('needs_review')
    expect(cascadeResidual.annotationStatus).toBe('')
    expect(cascadeResidual.note).toContain('修订级联影响仍未闭环')
    expect(cascadeResidual.note).toContain('令牌状态改变')

    const scopeCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_scope_guard_sync: {
            status: 'ok',
            missed_count: 0,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(scopeCleared.taskStatus).toBe('resolved')
    expect(scopeCleared.annotationStatus).toBe('resolved')
    expect(scopeCleared.note).toContain('修订幅度复检通过')
    expect(scopeCleared.note).toContain('revision_scope_guard_sync')
  })

  test('keeps prose revision receipt sync tasks open until revision receipts close delivery risks', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt',
        annotation_key: 'prose_revision_receipt_sync:211:12:12:prose_revision_receipt:修订回执',
        action: '补齐 delivery_risk_receipts 对应的 revision_receipts。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          prose_revision_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { category: 'delivery_risk_receipt', text: '最后300字没有形成追读钩子。', repair_segment: 'ending_actions' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('修订回执仍未闭环')
    expect(residual.note).toContain('最后300字没有形成追读钩子')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt',
        annotation_key: 'prose_revision_receipt_sync:211:12:12:prose_revision_receipt:修订回执',
        action: '补齐 delivery_risk_receipts 对应的 revision_receipts。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          prose_revision_receipt_sync: {
            status: 'ok',
            missed_count: 0,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('修订回执复检通过')
    expect(cleared.note).toContain('prose_revision_receipt_sync')
  })

  test('closes approval blocker tasks when the blocker clears even if other delivery risks remain', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
          detail: '门槛测试与参考样章连续三拍相似',
        },
      },
      {
        quality_refresh: { ok: true, score: 82 },
        delivery_risk_convergence: {
          status: 'cleared',
          residual_count: 2,
          label: '入库阻断已解除，仍有其他风险 2',
          before: {
            total_count: 3,
            approval_blocker: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          },
          after: {
            total_count: 2,
            approval_blocker: null,
            items: ['守核心：核心偏移 1', '补追读：漏追读 1'],
          },
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.annotationKey).toBe('prose_quality:21:3:approval_blocker:仿写安全阻断')
    expect(cleared.note).toContain('入库阻断已解除')
    expect(cleared.note).toContain('仍有其他交稿风险 2 项')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
        },
      },
      {
        quality_refresh: { ok: true, score: 78 },
        delivery_risk_convergence: {
          status: 'unchanged',
          residual_count: 3,
          label: '仍有残留 3',
          after: {
            total_count: 3,
            approval_blocker: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          },
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('入库阻断仍未解除')
  })

  test('keeps approval blocker tasks open when blocker convergence evidence is missing', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
        },
      },
      {
        quality_refresh: { ok: true, score: 88 },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 delivery_risk_convergence')
  })

  test('keeps approval blocker tasks open when convergence residual count is malformed', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
        },
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: {
          residual_count: 'n/a',
          label: '残余计数不可用',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('残余计数无效')
  })

  test.each([
    ['explicit non-passing', 'worse'],
    ['whitespace-padded', ' cleared '],
    ['non-string', ['cleared']],
  ] as const)('keeps approval blocker tasks open for a %s convergence status even when residual_count is zero', (_label, status) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
        },
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: {
          status,
          residual_count: 0,
          label: '显式状态未通过',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('显式状态未通过')
  })

  test('closes recovery evidence mismatch tasks after recovery evidence recheck clears', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 84 },
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          summary: '恢复放行依据已被本批交稿复盘接住。',
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.note).toContain('恢复依据复检通过')
    expect(cleared.note).toContain('failed_evidence 已清空')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 81 },
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章样章已重审'],
          summary: '恢复放行依据 1 项未被本批交稿兑现。',
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('恢复依据仍有失效项')
    expect(residual.note).toContain('第42章样章已重审')
  })

  test.each([
    ['explicit non-passing', 'warn'],
    ['whitespace-padded', ' ok '],
    ['non-string', ['ok']],
  ] as const)('keeps recovery evidence tasks open for a %s review status even when failed_evidence is empty', (_label, status) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        recovery_evidence_review: {
          status,
          failed_evidence: [],
          summary: '显式恢复复检状态未通过',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('显式恢复复检状态未通过')
  })

  test.each([
    ['explicit non-passing', 'worse'],
    ['whitespace-padded', ' cleared '],
    ['non-string', ['cleared']],
  ] as const)('keeps recovery evidence tasks open for a %s fallback convergence status even when residual_count is zero', (_label, status) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: {
          status,
          residual_count: 0,
          summary: '显式收敛状态未通过',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('显式收敛状态未通过')
  })

  test('requires the status-free recovery review fallback array to be actually empty', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        recovery_evidence_review: {
          failed_evidence: [null],
          summary: '恢复复检数组仍含无效项',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('恢复复检数组仍含无效项')
  })

  test.each([
    ['numeric string zero', '0'],
    ['null', null],
    ['negative number', -1],
  ] as const)('rejects a status-free recovery convergence %s residual count', (_label, residualCount) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: {
          residual_count: residualCount,
          summary: '恢复收敛计数无效',
        },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('恢复收敛计数无效')
  })

  test('uses governance recheck closure wording for single-chapter recovery evidence repairs', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
      },
      {
        quality_refresh: { ok: true, score: 86 },
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          summary: '单章治理复查已接住修后证据。',
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.note).toContain('单章治理复查通过')
    expect(cleared.note).toContain('governance_recheck_sync')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
      },
      {
        quality_refresh: { ok: true, score: 82 },
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章对白交锋仍未形成可见反制'],
          summary: '恢复依据缺口 1',
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('单章恢复依据仍有失效项')
    expect(residual.note).toContain('第42章对白交锋仍未形成可见反制')
  })

  test('closes storyline decision tasks only after storyline sync recheck clears', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:201:missed:执事压迫升级没有兑现。',
        decision: 'revise_prose',
      },
      {
        quality_refresh: { ok: true, score: 83 },
        story_state_update: {
          storyline_sync: {
            status: 'ok',
            missed: [],
            unplanned: [],
            forbidden_touched: [],
          },
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.note).toContain('剧情线决策复检通过')
    expect(cleared.note).toContain('storyline_diff:7:201:missed')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。',
        decision: 'accept_as_plan',
      },
      {
        quality_refresh: { ok: true, score: 86 },
        story_state_update: {
          storyline_sync: {
            status: 'warn',
            unplanned: [{ name: '残缺阵盘伏笔', reason: '计划仍未承接' }],
            missed: [],
            forbidden_touched: [],
          },
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('剧情线仍有差异')
    expect(residual.note).toContain('额外推进 1')
  })

  test('keeps storyline tasks open when storyline sync evidence is missing', () => {
    const storyline = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:203:missed:执事压迫升级没有兑现。',
        decision: 'revise_prose',
      },
      {
        quality_refresh: { ok: true, score: 88 },
      },
    )

    expect(storyline.taskStatus).toBe('needs_review')
    expect(storyline.annotationStatus).toBe('')
    expect(storyline.note).toContain('缺少 storyline_sync')
  })

  test('keeps storyline tasks open when bounded difference fields are malformed', () => {
    const storyline = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:204:missed:执事压迫升级没有兑现。',
        decision: 'revise_prose',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        story_state_update: {
          storyline_sync: {
            status: 'ok',
            missed: null,
            unplanned: null,
            forbidden_touched: null,
          },
        },
      },
    )

    expect(storyline.taskStatus).toBe('needs_review')
    expect(storyline.annotationStatus).toBe('')
    expect(storyline.note).toContain('storyline_sync.missed/unplanned/forbidden_touched 必须为数组')
  })

  test.each([
    ['explicit non-passing', 'warn'],
    ['whitespace-padded', ' ok '],
    ['non-string', ['ok']],
  ] as const)('keeps storyline tasks open for a %s storyline status even when bounded difference arrays are empty', (_label, status) => {
    const storyline = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:205:missed:执事压迫升级没有兑现。',
        decision: 'revise_prose',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        story_state_update: {
          storyline_sync: {
            status,
            missed: [],
            unplanned: [],
            forbidden_touched: [],
            label: '显式状态未通过',
          },
        },
      },
    )

    expect(storyline.taskStatus).toBe('needs_review')
    expect(storyline.annotationStatus).toBe('')
    expect(storyline.note).toContain('显式状态未通过')
  })

  test('keeps revision-scope tasks open when scope-guard evidence is missing', () => {
    const revisionScope = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(revisionScope.taskStatus).toBe('needs_review')
    expect(revisionScope.annotationStatus).toBe('')
    expect(revisionScope.note).toContain('缺少 revision_scope_guard_sync')
  })

  test('does not treat a generic result container as specialized sync evidence', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          result: { status: 'ok', issues: [] },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 revision_scope_guard_sync')
  })

  test.each(specializedSyncCases)('keeps %s tasks open when their specialized sync payload is missing', (_label, task, syncKey) => {
    const result = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 88 },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain(`缺少 ${syncKey}`)
  })

  test.each(specializedSyncCases)('keeps %s tasks open when the named sync payload has no affirmative outcome', (_label, task, syncKey) => {
    const result = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        [syncKey]: { label: 'present but no outcome' },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain(`${syncKey} 明确闭环结果缺失`)
  })

  test.each(specializedSyncCases)('keeps %s tasks open when a warning status accompanies a zero residual count', (_label, task, syncKey) => {
    const result = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        [syncKey]: {
          status: 'warn',
          missed_count: 0,
          label: `${syncKey} remains warning`,
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain(`${syncKey} remains warning`)
  })

  test.each(specializedSyncCases.flatMap(([branchLabel, task, syncKey]) => (
    nonExactSpecializedSyncStatuses.map(([statusLabel, statusValue]) => (
      [branchLabel, statusLabel, task, syncKey, statusValue] as const
    ))
  )))('keeps %s tasks open for a %s non-exact ok status', (_branchLabel, _statusLabel, task, syncKey, statusValue) => {
    const result = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        [syncKey]: {
          status: statusValue,
          missed_count: 0,
          label: `${syncKey} exact status required`,
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain(`${syncKey} exact status required`)
  })

  test.each([
    'missed_count',
    'receipt_count',
  ] as const)('does not treat an unscoped result.%s zero as revision-scope sync evidence', (countField) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          result: { [countField]: 0 },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 revision_scope_guard_sync')
  })

})
