import { describe, expect, test } from 'bun:test'
import {
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewActionFeedbackKey,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRecoveryEvidenceReviewResolvedFeedback,
  buildRecoveryEvidenceReviewRowAction,
  buildRecoveryEvidenceReviewRows,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildPostBatchQualityCheckSummary,
  buildNextChapterQualityPlanPreview,
  buildRepairClosureHighlights,
  buildRepairTaskIssueTagMeta,
  buildTaskRunCardModel,
  buildChapterAdmissionWarningCards,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryFocusReviewState,
  chapterGroupActionState,
  chapterGroupRunActionState,
  recoveryEvidenceSourceRecheckAction,
  repairTaskActionLabel,
  safeBatchRecoveryFocusMatchesTask,
} from './TaskCenterDrawer'

describe('default lane repair task card helpers', () => {
  test('extracts production relapse CTA execution from safe-batch preflight', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const snapshot = (taskCenter as any).buildProductionRelapseCtaExecutionSnapshot?.({
      production_relapse_cta_execution: {
        source: 'safe_batch_production_relapse_review_cta',
        kind: 'enter_five_chapter_observation',
        label: '进入5章观察批',
        template_version_id: 'safe_batch_expansion_structure_repair:704',
        default_batch_chapter_nos: [119, 120, 121, 122, 123],
        validation_chapter_nos: [124, 125, 126],
        cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        remaining_failure_reasons: [],
        target_chapter_count: 5,
      },
    })

    expect(snapshot).toEqual({
      visible: true,
      source: 'safe_batch_production_relapse_review_cta',
      kind: 'enter_five_chapter_observation',
      label: '进入5章观察批',
      templateVersionId: 'safe_batch_expansion_structure_repair:704',
      defaultBatchChapterNos: [119, 120, 121, 122, 123],
      validationChapterNos: [124, 125, 126],
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
      targetChapterCount: 5,
      summary: '生产后验 CTA：进入5章观察批；模板 safe_batch_expansion_structure_repair:704；已修复 核心偏移、回报欠账、追读拉力；剩余 无。',
    })
  })

  test('extracts default lane template gap tags from structure decision repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      safe_batch_expansion_structure_decision_review: {
        default_five_chapter_lane_redesign: {
          reason: 'repeated_recovery_verdict_relapse',
          relapse_count: 2,
        },
        failed_items: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
          { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
          { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
        ],
      },
    })

    expect(tags).toEqual([
      { key: 'default_lane_template', label: '默认档位模板', color: 'gold' },
      { key: 'default_lane_segment_duty', label: '缺默认档位段位职责', color: 'gold' },
      { key: 'default_lane_conflict_rotation', label: '缺冲突轮换', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '缺回报密度', color: 'gold' },
      { key: 'default_lane_ending_hook_template', label: '缺章末追读模板', color: 'gold' },
      { key: 'default_lane_relapse', label: '连续失效2次', color: 'gold' },
    ])
  })

  test('extracts default lane template redesign tags from structure repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_redesign_queue: {
          visible: true,
          label: '默认档位模板重构队列',
          top_failed_requirement: {
            key: 'default_lane_payoff_density',
            label: '回报密度',
            failed_count: 2,
          },
          redesign_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
            { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
            { key: 'default_lane_payoff_density', label: '回报密度' },
            { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
          ],
        },
      },
    })

    expect(tags).toEqual(expect.arrayContaining([
      { key: 'default_lane_template_redesign', label: '默认档位模板重构', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '重写回报密度', color: 'gold' },
    ]))
  })

  test('extracts production relapse verdict tags from structure repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_repair: {
          visible: true,
          label: '默认档位模板验证缺项',
          production_failed_count: 2,
          production_relapse_verdict: {
            status: 'failed',
            remaining_failure_reasons: ['核心偏移', '回报欠账'],
          },
          production_failed_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
            { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          ],
        },
      },
    })

    expect(tags).toEqual(expect.arrayContaining([
      { key: 'default_lane_production_relapse', label: '生产后验仍复发', color: 'gold' },
      { key: 'default_lane_segment_duty', label: '核心偏移未修', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '回报欠账未修', color: 'gold' },
    ]))
  })
})

describe('buildRecoveryEvidenceReviewRowAction', () => {
  test('routes recovery evidence source rows to the natural clickable action', () => {
    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    })).toEqual({
      action: 'recheck_single_chapter',
      label: '复检单章',
      focusSource: 'single_chapter_governance_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '批次恢复复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '批次恢复复查 · 生产阻断已解除',
      sourceAction: 'safe_batch_recovery_recheck',
      sourceActionLabel: '复盘批次',
      productionGateSource: 'safe_batch_recovery_recheck',
    })).toEqual({
      action: 'recheck_safe_batch',
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '第42章对白交锋已补回样章节奏',
      riskLabels: [],
      source: 'governance_recheck_memory',
      sourceLabel: '治理复查记忆',
      sourceDetail: '治理复查记忆 · 修后证据',
      sourceAction: 'review_governance_closure',
      sourceActionLabel: '治理复查台',
      productionGateSource: '',
    })).toEqual({
      action: 'review_governance_closure',
      label: '治理复查台',
      focusSource: '',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '样章任务书复检通过 1 项',
      riskLabels: [],
      source: 'recovery_evidence',
      sourceLabel: '恢复放行依据',
      sourceDetail: '安全连写预检 · 恢复放行依据',
      sourceAction: 'create_safe_batch_risk_repair',
      sourceActionLabel: '按批次修订',
      productionGateSource: '',
    })).toEqual({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    })
  })
})

describe('buildRecoveryEvidenceReviewActionFeedback', () => {
  test('summarizes the triggered action and next closure condition for a recovery evidence row', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewActionFeedbackKey(2, row, rowAction)).toBe(
      '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
    )
    expect(buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')).toEqual({
      statusLabel: '已触发复检单章',
      triggeredAt: '14:20',
      closureCondition: '关闭条件：单章复查为 ok 或 failed_evidence 为空。',
      detail: '最近动作：复检单章 · 14:20 · 已触发，等待复检结果回填。',
    })
  })

  test('uses batch repair closure wording for release evidence revision actions', () => {
    expect(buildRecoveryEvidenceReviewActionFeedback({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    }, '15:05')).toEqual(expect.objectContaining({
      statusLabel: '已触发按批次修订',
      triggeredAt: '15:05',
      closureCondition: '关闭条件：完成批次修订并重新运行批次交稿复盘，recovery_evidence_review 为 ok。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewRefreshAnchor', () => {
  test('records the row and source task focus after refreshing a recovery evidence action', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex: 2,
      row,
      rowAction,
      sourceTaskIndex: 5,
      refreshedAt: '14:22',
    })).toEqual({
      feedbackKey: '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
      taskIndex: 2,
      sourceTaskIndex: 5,
      focusSource: 'single_chapter_governance_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })
  })
})

describe('buildRecoveryEvidenceReviewRefreshFeedback', () => {
  test('turns local action feedback into a refreshed inline status while keeping closure guidance', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')
    const feedback = buildRecoveryEvidenceReviewRefreshFeedback(localFeedback, {
      feedbackKey: 'feedback-key',
      taskIndex: 3,
      sourceTaskIndex: 4,
      focusSource: 'safe_batch_recovery_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已刷新结果',
      triggeredAt: '14:22',
      closureCondition: localFeedback.closureCondition,
    }))
    expect(feedback.detail).toContain('已刷新结果')
    expect(feedback.detail).toContain('刷新后继续定位此依据')
  })

  test('does not override a real running status with the refreshed local status', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewRefreshFeedback(
      buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20'),
      {
        feedbackKey: 'feedback-key',
        taskIndex: 3,
        sourceTaskIndex: 4,
        focusSource: 'safe_batch_recovery_recheck',
        refreshedAt: '14:22',
        statusLabel: '已刷新结果',
      },
    )

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewResolvedFeedback', () => {
  test('marks a recovery evidence row as running from a matching repair audit run', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          step_name: 'repair-audit',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      triggeredAt: '实时状态',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })

  test('keeps local feedback when a completed repair run has no audit refresh payload', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'completed',
          output_ref: JSON.stringify({ tasks: [{ issue_type: 'recovery_evidence_mismatch' }] }),
          created_at: '2026-06-13T09:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(localFeedback)
  })

  test('marks a recovery evidence row as backfilled after the task review clears failed evidence', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          failed_items: [],
        },
      },
      rowAction: {
        action: 'execute_typed_repair' as const,
        label: '按批次修订',
        focusSource: '',
      },
      runRecords: [],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      detail: '最近动作：按批次修订 · 已回填 · 恢复依据复盘已清空失效项。',
    }))
  })

  test('marks a single-chapter recheck row as retryable when the matching quality run fails', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        chapter_id: 42,
        annotation_source: 'governance_recheck_sync',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章对白交锋未继承'],
        },
      },
      rowAction: {
        action: 'recheck_single_chapter' as const,
        label: '复检单章',
        focusSource: 'single_chapter_governance_recheck',
      },
      runRecords: [
        {
          id: 92,
          run_type: 'prose_quality',
          status: 'failed',
          input_ref: JSON.stringify({ chapter_id: 42, source: 'governance_recheck_sync' }),
          error_message: '模型超时',
          created_at: '2026-06-13T10:03:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '失败需重试',
      triggeredAt: '实时状态',
      detail: '最近动作：复检单章 · 失败需重试 · 模型超时',
    }))
  })
})

describe('repairTaskActionLabel', () => {
  test('shows an executable action for first30 chapter retention patch tasks', () => {
    expect(repairTaskActionLabel({
      task_type: 'chapter_retention_patch',
      issue_type: '缺正文、章末钩子弱',
      chapter_id: 1,
    })).toBe('生成正文')

    expect(repairTaskActionLabel({
      task_type: 'chapter_retention_patch',
      issue_type: '章末钩子弱',
      chapter_id: 1,
    })).toBe('补留存')
  })

  test('labels single-chapter governance recheck recovery evidence tasks as evidence repair', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'recovery_evidence_mismatch',
      annotation_source: 'governance_recheck_sync',
      annotation_category: 'recovery_evidence',
      chapter_no: 42,
    })).toBe('回修依据')
  })

  test('keeps batch recovery evidence repairs on the batch revision action', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'recovery_evidence_mismatch',
      segment: '第41-43章',
    })).toBe('按批次修订')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_segment_hotspot',
    })).toBe('修扩批热区')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
    })).toBe('改扩批结构')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
    })).toBe('查结构决策')
  })

  test('normalizes annotation categories before choosing repair task action labels', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'reader_retention',
    })).toBe('补追读')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'innovation',
    })).toBe('补创新')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
    })).toBe('补阶段结算')
  })

  test('uses targeted action labels for oh-story revision closure sync tasks', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt',
    })).toBe('补回执')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'quality_audit_repair_receipt',
    })).toBe('补质检')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'deslop_repair_receipt',
    })).toBe('补去味')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'revision_cascade_impact',
    })).toBe('补级联')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'revision_scope_guard',
    })).toBe('稳幅度')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt_sync',
    })).toBe('补回执')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'quality_audit_repair_receipt_sync',
    })).toBe('补质检')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'deslop_repair_receipt_sync',
    })).toBe('补去味')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'revision_cascade_impact_sync',
    })).toBe('补级联')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'revision_scope_guard_sync',
    })).toBe('稳幅度')
  })

  test('uses a targeted action for missing next-chapter quality plans', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toBe('补续航')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toBe('补续航')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      message: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })).toBe('补续航')
  })

  test('uses targeted labels for scene-card execution directive repairs', () => {
    const task = {
      source: 'review_annotation_risk',
      issue_type: 'scene_card_1_forbidden_directives',
      message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      action: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
    }

    expect(repairTaskActionLabel(task)).toBe('修场景卡')
    expect(buildRepairTaskIssueTagMeta(task)).toEqual({ label: '场景卡执行', color: 'volcano' })
  })

  test('uses targeted labels for unattended Step 3 post-delivery repairs', () => {
    const cases = [
      ['title_uniqueness_gap', '改标题', { label: '标题去重', color: 'blue' }],
      ['blueprint_consumption_gap', '兑现细纲', { label: '细纲兑现', color: 'gold' }],
      ['foreshadowing_delta_gap', '补伏笔', { label: '伏笔增量', color: 'purple' }],
      ['deterministic_cleanup_gap', '清AI味', { label: '确定性清理', color: 'red' }],
      ['story_state_update_gap', '写状态', { label: '状态写回', color: 'cyan' }],
      ['write_preparation_receipts_gap', '补写前', { label: '写前准备', color: 'cyan' }],
      ['status_filter_receipts_gap', '补状态筛选', { label: '状态筛选', color: 'blue' }],
      ['source_readiness_gap', '补来源', { label: '来源就绪', color: 'cyan' }],
      ['intent_confirmation_gap', '补意图确认', { label: '意图确认', color: 'blue' }],
      ['benchmark_recall_gap', '补文风召回', { label: '文风召回', color: 'purple' }],
      ['style_sample_gap', '校样章', { label: '风格', color: 'purple' }],
    ] as const

    for (const [issueType, actionLabel, tagMeta] of cases) {
      const task = {
        source: 'unattended_post_delivery_quality',
        task_type: 'repair_quality',
        issue_type: issueType,
      }

      expect(repairTaskActionLabel(task)).toBe(actionLabel)
      expect(buildRepairTaskIssueTagMeta(task)).toEqual(tagMeta)
    }
  })

  test('shows targeted actions for pre-draft execution repair tasks', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'intent_confirmation_gap',
    })).toBe('补意图确认')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'benchmark_recall_gap',
    })).toBe('补文风召回')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'pre_draft_execution',
    })).toBe('补意图确认')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'source_readiness_gap',
    })).toBe('补来源')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'state_tracking_gap',
    })).toBe('补状态')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'style_boundary_gap',
    })).toBe('校风格')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'story_drive_gap',
    })).toBe('补驱动')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_arc_gap',
    })).toBe('补弧光')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'runway_gap',
    })).toBe('补航线')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'quality_audit_gap',
    })).toBe('补诊断')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'beat_cooling_gap',
    })).toBe('补冷却')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_expectation_debt',
    })).toBe('补期待')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_payoff_debt',
    })).toBe('补回报')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'information_flow_gap',
    })).toBe('调信息')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'expectation_threshold_gap',
    })).toBe('补期待')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'story_loop_gap',
    })).toBe('补闭环')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'emotional_arc_gap',
    })).toBe('补情绪')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_hook_gap',
    })).toBe('补章钩')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'paragraph_hook_gap',
    })).toBe('补段钩')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'suspense_gap',
    })).toBe('补悬念')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'asset_linkage_gap',
    })).toBe('挂资产')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'dialogue_gap',
    })).toBe('修对白')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'scene_card_receipts_gap',
    })).toBe('修回执')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'delivery_risk_receipts_gap',
    })).toBe('补交稿')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'revision_context_receipts_gap',
    })).toBe('补上下文')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'plot_dynamics_gap',
    })).toBe('补动力')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_relation_gap',
    })).toBe('修关系')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_behavior_gap',
    })).toBe('修行为')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'conflict_structure_gap',
    })).toBe('加冲突')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'opening_gap',
    })).toBe('改开篇')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'bridge_unit_gap',
    })).toBe('补桥段')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reversal_gap',
    })).toBe('补反转')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'showdown_gap',
    })).toBe('补高潮')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'prose_craft_gap',
    })).toBe('修工艺')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_handoff_gap',
    })).toBe('接章首')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'payoff_setup_gap',
    })).toBe('补铺垫')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'spectator_reaction_gap',
    })).toBe('补围观')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'punctuation_tone_gap',
    })).toBe('调语气')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'content_rubric_gap',
    })).toBe('补内容')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_retention_gap',
    })).toBe('补追读')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'target_reader_gap',
    })).toBe('补读者')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'genre_positioning_gap',
    })).toBe('校题材')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'female_audience_gap',
    })).toBe('补女频')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'upgrade_rhythm_gap',
    })).toBe('补升级')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_structure_gap',
    })).toBe('补结构')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_progression_gap',
    })).toBe('补推进')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'information_load_gap',
    })).toBe('压信息')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'longform_continuity_gap',
    })).toBe('保长篇')
  })

  test('labels recovery evidence governance queue actions by their closure flow', () => {
    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'revision',
    })).toBe('回修依据并复检')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_single_chapter',
    })).toBe('复检单章')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_safe_batch',
    })).toBe('复盘批次')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'focus_task',
    })).toBe('已处理并复盘')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_single_brief',
    })).toBe('深修单章任务书')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_batch_brief',
    })).toBe('深修批次任务书')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_single_brief',
      action_label: '强化单章任务书复盘',
      deep_repair_level: 'escalated_after_recurrence',
    })).toBe('强化单章任务书复盘')
  })
})
