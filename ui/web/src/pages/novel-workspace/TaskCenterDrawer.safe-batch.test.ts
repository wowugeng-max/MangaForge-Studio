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

describe('buildSafeBatchExpansionPolicySnapshot', () => {
  test('summarizes explicit expansion policy from safe-batch preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '强化恢复验收连续 3/3 批通过，本轮可从 3 章扩到 5 章安全连写。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
      },
    })

    expect(snapshot).toEqual({
      visible: true,
      status: 'expanded',
      label: '强化扩批规则',
      summary: '强化恢复验收连续 3/3 批通过，本轮可从 3 章扩到 5 章安全连写。',
      targetChapterCount: 5,
      baseChapterCount: 3,
      expandedChapterCount: 5,
      requiredPassStreak: 3,
      passStreak: 3,
      acceptedBatchCount: 3,
      failedBatchCount: 0,
      latestStatus: 'ok',
      expansionFeedback: null,
      recoveryRoadmap: null,
      recoveryValidation: null,
      recoveryRestoreStabilityLane: null,
    })
  })

  test('summarizes expansion feedback from safe-batch preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '最近一次5章扩批存在扩批分段热区，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段第10、11章出现扩批热区，下一轮回退到 2-3 章安全连写。',
          target_chapter_count: 3,
          latest_chapter_nos: [8, 9, 10, 11, 12],
          risk_count: 3,
        },
      },
    })

    expect(snapshot).toMatchObject({
      status: 'recovering',
      targetChapterCount: 3,
      expansionFeedback: {
        status: 'rollback_to_small_batch',
        label: '扩批热区待修',
        summary: '中段第10、11章出现扩批热区，下一轮回退到 2-3 章安全连写。',
        targetChapterCount: 3,
        latestChapterNos: [8, 9, 10, 11, 12],
        riskCount: 3,
      },
    })
  })

  test('summarizes expansion stability and repeated hotspot segment from preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
          target_chapter_count: 3,
          latest_chapter_nos: [13, 14, 15, 16, 17],
          risk_count: 3,
          stable_pass_streak: 0,
          recent_expanded_batch_count: 2,
          repeated_hotspot_segment: {
            key: 'middle',
            label: '中段',
            count: 2,
            summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback).toMatchObject({
      status: 'rollback_to_small_batch',
      stablePassStreak: 0,
      recentExpandedBatchCount: 2,
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
        count: 2,
      },
    })
  })

  test('keeps recovery restore stability evidence in expansion feedback snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '恢复5章扩批稳定观察通过，长期扩批稳定证据已沉淀。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '恢复5章扩批稳定观察通过：第50、51、52章验证批之后，第53、54、55、56、57章继续保持稳定。',
          target_chapter_count: 5,
          latest_chapter_nos: [53, 54, 55, 56, 57],
          risk_count: 0,
          stable_pass_streak: 1,
          recent_expanded_batch_count: 1,
          recovery_restore_stability_evidence: {
            status: 'passed',
            source: 'safe_batch_recovery_restore_five_batch',
            restored_batch_created_at: '2026-06-15T00:00:00.000Z',
            restore_chapter_nos: [53, 54, 55, 56, 57],
            validation_chapter_nos: [50, 51, 52],
            stable_pass_streak: 1,
            summary: '恢复5章扩批稳定观察通过：第50、51、52章验证批之后，第53、54、55、56、57章继续保持核心守恒、显性回报和章末追读稳定。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.recoveryRestoreStabilityEvidence).toMatchObject({
      status: 'passed',
      source: 'safe_batch_recovery_restore_five_batch',
      restoredBatchCreatedAt: '2026-06-15T00:00:00.000Z',
      restoreChapterNos: [53, 54, 55, 56, 57],
      validationChapterNos: [50, 51, 52],
      stablePassStreak: 1,
    })
    expect(snapshot?.expansionFeedback?.recoveryRestoreStabilityEvidence?.summary).toContain('恢复5章扩批稳定观察通过')
  })

  test('keeps recovery restore stability lane for task-center batch review filtering', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_recovery_restore_stability_lane: {
        visible: true,
        status: 'observing',
        label: '5章观察批',
        source: 'recovery_restore_stability_evidence',
        stable_pass_streak: 1,
        required_stable_pass_streak: 2,
        default_five_chapter_ready: false,
        restore_chapter_nos: [53, 54, 55, 56, 57],
        validation_chapter_nos: [50, 51, 52],
        summary: '恢复5章扩批已稳定 1/2 批，继续观察。',
      },
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '恢复5章扩批已进入观察批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
      },
    })

    expect(snapshot?.recoveryRestoreStabilityLane).toMatchObject({
      visible: true,
      status: 'observing',
      label: '5章观察批',
      source: 'recovery_restore_stability_evidence',
      stablePassStreak: 1,
      requiredStablePassStreak: 2,
      defaultFiveChapterReady: false,
      restoreChapterNos: [53, 54, 55, 56, 57],
      validationChapterNos: [50, 51, 52],
      taskCenterFilterLabel: '批次复盘筛选：5章观察批',
    })
    expect(snapshot?.recoveryRestoreStabilityLane?.summary).toContain('继续观察')
  })

  test('keeps default five-chapter regression evidence for task-center rollback review', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认5章档位复发，回到3章验证批。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '默认5章档位回退原因：第63、64、65、66、67章默认档位在中段复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [63, 64, 65, 66, 67],
          risk_count: 3,
          default_five_chapter_regression: {
            visible: true,
            status: 'regressed',
            label: '默认5章档位回退原因',
            source: 'default_five_chapter_lane',
            stable_pass_streak: 2,
            required_stable_pass_streak: 2,
            default_batch_chapter_nos: [63, 64, 65, 66, 67],
            restore_chapter_nos: [58, 59, 60, 61, 62],
            validation_chapter_nos: [50, 51, 52],
            repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            template_version_id: 'safe_batch_expansion_structure_repair:668',
            template_version: {
              id: 'safe_batch_expansion_structure_repair:668',
              label: '默认5章档位模板重构',
              status: 'relapsed',
              pass_streak: 2,
              required_pass_streak: 2,
            },
            template_version_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
              { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
              { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
            ],
            summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterRegression).toMatchObject({
      visible: true,
      status: 'regressed',
      label: '默认5章档位回退原因',
      stablePassStreak: 2,
      requiredStablePassStreak: 2,
      defaultBatchChapterNos: [63, 64, 65, 66, 67],
      restoreChapterNos: [58, 59, 60, 61, 62],
      validationChapterNos: [50, 51, 52],
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
      },
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
      templateVersion: {
        id: 'safe_batch_expansion_structure_repair:668',
        status: 'relapsed',
        passStreak: 2,
        requiredPassStreak: 2,
      },
      templateVersionFailedRequirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', failureReason: '核心偏移' },
        { key: 'default_lane_payoff_density', label: '回报密度', failureReason: '回报欠账' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', failureReason: '追读拉力' },
      ],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterRegression?.summary).toContain('默认5章档位回退原因')
  })

  test('keeps default recovery verdict relapse evidence for task-center rollback review', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '恢复判定失效，回到3章验证批。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '恢复判定失效 -> 回到3章验证批：核心偏移、回报欠账、追读拉力在中段复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [76, 77, 78, 79, 80],
          risk_count: 3,
          default_five_chapter_recovery_verdict_relapse: {
            visible: true,
            status: 'relapsed',
            label: '恢复判定失效',
            source: 'default_five_chapter_recovery_verdict',
            summary: '恢复判定失效 -> 回到3章验证批：核心偏移、回报欠账、追读拉力在中段第78、79章复发。',
            default_batch_chapter_nos: [63, 64, 65, 66, 67],
            restore_chapter_nos: [58, 59, 60, 61, 62],
            previous_validation_chapter_nos: [50, 51, 52],
            validation_chapter_nos: [68, 69, 70],
            relapse_batch_chapter_nos: [76, 77, 78, 79, 80],
            relapsed_chapter_nos: [78, 79],
            repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            stable_failure_reasons: [],
            failure_reason_statuses: [
              { reason: '核心偏移', status: 'relapsed', risk_count: 1 },
              { reason: '回报欠账', status: 'relapsed', risk_count: 1 },
              { reason: '追读拉力', status: 'relapsed', risk_count: 1 },
            ],
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse).toMatchObject({
      visible: true,
      status: 'relapsed',
      label: '恢复判定失效',
      source: 'default_five_chapter_recovery_verdict',
      validationChapterNos: [68, 69, 70],
      relapseBatchChapterNos: [76, 77, 78, 79, 80],
      relapsedChapterNos: [78, 79],
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
        riskCount: 3,
      },
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      relapsedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse?.summary).toContain('恢复判定失效 -> 回到3章验证批')
  })

  test('keeps expansion structure validation trend in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '扩批结构验证趋势显示中段仍有惯性风险。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段验证通过率 67%，恢复5章后第1个扩批批次复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [59, 60, 61, 62, 63],
          risk_count: 1,
          expansion_structure_validation_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证趋势',
            summary: '中段验证通过率 67%（2/3批），失败主因：核心偏移1、回报欠账1、追读拉力1，恢复5章后第1个扩批批次复发。',
            segment_key: 'middle',
            segment_label: '中段',
            validation_batch_count: 3,
            passed_batch_count: 2,
            failed_batch_count: 1,
            pass_rate: 67,
            latest_status: 'ok',
            latest_chapter_nos: [56, 57, 58],
            failure_reasons: [
              { key: 'core', label: '核心偏移', count: 1 },
              { key: 'payoff', label: '回报欠账', count: 1 },
              { key: 'reader_pull', label: '追读拉力', count: 1 },
            ],
            recurrence_after_restore: {
              visible: true,
              interval_batch_count: 1,
              interval_label: '恢复5章后第1个扩批批次复发',
              recurrence_chapter_nos: [59, 60, 61, 62, 63],
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureValidationTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '扩批结构验证趋势',
      segmentLabel: '中段',
      validationBatchCount: 3,
      passedBatchCount: 2,
      failedBatchCount: 1,
      passRate: 67,
      latestStatus: 'ok',
      latestChapterNos: [56, 57, 58],
      recurrenceAfterRestore: {
        visible: true,
        intervalBatchCount: 1,
        intervalLabel: '恢复5章后第1个扩批批次复发',
      },
    })
    expect(snapshot?.expansionFeedback?.structureValidationTrend?.failureReasons).toEqual([
      { key: 'core', label: '核心偏移', count: 1 },
      { key: 'payoff', label: '回报欠账', count: 1 },
      { key: 'reader_pull', label: '追读拉力', count: 1 },
    ])
  })

  test('keeps expansion structure repair effectiveness in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '结构修复有效后恢复5章扩批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '结构修复后观察稳定。',
          target_chapter_count: 5,
          latest_chapter_nos: [70, 71, 72, 73, 74],
          risk_count: 0,
          expansion_structure_repair_effectiveness: {
            visible: true,
            status: 'ok',
            label: '结构修复有效性',
            summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0，修复后暂无同段复发。',
            source_run_id: 625,
            segment_key: 'middle',
            segment_label: '中段',
            baseline_pass_rate: 67,
            current_pass_rate: 100,
            pass_rate_delta: 33,
            baseline_failure_reason_count: 3,
            current_failure_reason_count: 0,
            failure_reason_delta: -3,
            recommendation: 'restore_five_chapter',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness).toMatchObject({
      visible: true,
      status: 'ok',
      label: '结构修复有效性',
      sourceRunId: 625,
      segmentLabel: '中段',
      baselinePassRate: 67,
      currentPassRate: 100,
      passRateDelta: 33,
      baselineFailureReasonCount: 3,
      currentFailureReasonCount: 0,
      failureReasonDelta: -3,
      recommendation: 'restore_five_chapter',
    })
  })

  test('keeps default recovery verdict relapse trend in repair effectiveness snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '连续恢复判定失效，升级默认档位结构重构。',
        target_chapter_count: 1,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_single_chapter',
          label: '扩批热区反馈',
          summary: '连续 2 次恢复判定失效，默认档位结构重构。',
          target_chapter_count: 1,
          latest_chapter_nos: [84, 85, 86, 87, 88],
          risk_count: 3,
          expansion_structure_repair_effectiveness: {
            visible: true,
            status: 'warn',
            label: '结构修复有效性',
            summary: '中段结构修复有效性：连续 2 次恢复判定失效，默认档位结构重构。',
            source_run_id: 643,
            segment_key: 'middle',
            segment_label: '中段',
            baseline_pass_rate: 100,
            current_pass_rate: 100,
            pass_rate_delta: 0,
            baseline_failure_reason_count: 0,
            current_failure_reason_count: 0,
            failure_reason_delta: 0,
            recommendation: 'escalate_structure_redesign',
            default_five_chapter_recovery_verdict_relapse_trend: {
              visible: true,
              baseline_relapse_count: 1,
              current_relapse_count: 1,
              repeated_relapse_count: 2,
              repeated_failure_reasons: [
                { reason: '核心偏移', count: 2 },
                { reason: '回报欠账', count: 2 },
                { reason: '追读拉力', count: 2 },
              ],
              recommendation: 'escalate_structure_redesign',
              summary: '连续 2 次恢复判定失效：核心偏移、回报欠账、追读拉力同维复发，默认档位结构重构。',
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend).toMatchObject({
      visible: true,
      baselineRelapseCount: 1,
      currentRelapseCount: 1,
      repeatedRelapseCount: 2,
      repeatedFailureReasons: [
        { reason: '核心偏移', count: 2 },
        { reason: '回报欠账', count: 2 },
        { reason: '追读拉力', count: 2 },
      ],
      recommendation: 'escalate_structure_redesign',
    })
    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend?.summary).toContain('默认档位结构重构')
  })

  test('keeps expansion structure decision execution trend in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '结构决策执行趋势未稳，先补齐中段职责。',
          target_chapter_count: 3,
          latest_chapter_nos: [70, 71, 72, 73, 74],
          risk_count: 0,
          expansion_structure_decision_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构决策执行趋势',
            summary: '结构决策执行趋势未稳：恢复5章扩批最近复盘仍有漏项。',
            total_batch_count: 1,
            passed_batch_count: 0,
            failed_batch_count: 1,
            latest_status: 'warn',
            latest_batch_created_at: '2026-06-20T00:00:00.000Z',
            latest_chapter_nos: [70, 71, 72, 73, 74],
            latest_segment_key: 'middle',
            latest_segment_label: '中段',
            top_failed_recommendation: { key: 'restore_five_chapter', label: '恢复5章扩批', count: 1 },
            top_failed_requirement: { key: 'segment_role', label: '中段职责', count: 1 },
            suggested_target_chapter_count: 3,
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureDecisionTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '扩批结构决策执行趋势',
      totalBatchCount: 1,
      failedBatchCount: 1,
      latestStatus: 'warn',
      latestSegmentLabel: '中段',
      topFailedRecommendation: { key: 'restore_five_chapter', label: '恢复5章扩批', count: 1 },
      topFailedRequirement: { key: 'segment_role', label: '中段职责', count: 1 },
      suggestedTargetChapterCount: 3,
    })
  })

  test('keeps default lane redesign missing template items in the batch summary snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位结构重构未落地，下一轮保持单章治理。',
        target_chapter_count: 1,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_single_chapter',
          label: '扩批热区反馈',
          summary: '默认档位结构重构漏项，需要补齐四项模板。',
          target_chapter_count: 1,
          latest_chapter_nos: [89],
          risk_count: 4,
          expansion_structure_decision_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构决策执行趋势',
            summary: '默认5章档位模板未落地：段位职责、冲突轮换、回报密度、章末追读模板缺失。',
            total_batch_count: 1,
            passed_batch_count: 0,
            failed_batch_count: 1,
            latest_status: 'warn',
            latest_batch_created_at: '2026-06-24T00:00:00.000Z',
            latest_chapter_nos: [89],
            latest_segment_key: 'middle',
            latest_segment_label: '中段',
            top_failed_recommendation: { key: 'escalate_structure_redesign', label: '单章结构重构', count: 1 },
            top_failed_requirement: { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
            failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
              { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
              { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
              { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
            ],
            suggested_target_chapter_count: 1,
            default_five_chapter_lane_redesign: {
              reason: 'repeated_recovery_verdict_relapse',
              relapse_count: 2,
              repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureDecisionTrend).toMatchObject({
      suggestedTargetChapterCount: 1,
      failedRequirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
        { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
      ],
      defaultFiveChapterLaneRedesign: {
        visible: true,
        reason: 'repeated_recovery_verdict_relapse',
        relapseCount: 2,
        repeatedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
        missedRequirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
          { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
          { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
        ],
      },
    })
  })

  test('keeps safe batch recovery roadmap in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'small_batch',
          current_lane_label: '3章验证',
          current_target_chapter_count: 3,
          current_reason: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
          next_repair_layer: {
            key: 'structure_decision_execution',
            label: '结构决策执行',
            status: 'warn',
            action_label: '补齐结构决策执行',
            detail: '中段职责漏项 1 次。',
          },
          route_nodes: [
            { key: 'strengthened_acceptance', label: '强化验收', status: 'ok', target_chapter_count: 5, detail: '连续 3/3 批通过。' },
            { key: 'expansion_feedback', label: '扩批热区', status: 'ok', target_chapter_count: 5, detail: '扩批热区已清。' },
            { key: 'structure_decision_execution', label: '结构决策执行', status: 'warn', target_chapter_count: 3, detail: '中段职责漏项 1 次。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryRoadmap).toMatchObject({
      visible: true,
      label: '安全连写恢复路线图',
      currentLane: 'small_batch',
      currentLaneLabel: '3章验证',
      currentTargetChapterCount: 3,
      recommendedFocus: {
        layerKey: 'structure_decision_execution',
        layerLabel: '结构决策执行',
        actionLabel: '补齐结构决策执行',
        targetView: 'repair_task',
        issueType: 'safe_batch_expansion_structure_decision_mismatch',
        taskCenterFilterLabel: '扩批结构决策',
      },
      nextRepairLayer: {
        key: 'structure_decision_execution',
        label: '结构决策执行',
        status: 'warn',
        actionLabel: '补齐结构决策执行',
        focus: {
          targetView: 'repair_task',
          issueType: 'safe_batch_expansion_structure_decision_mismatch',
          taskCenterFilterLabel: '扩批结构决策',
        },
      },
    })
    expect(snapshot?.recoveryRoadmap?.routeNodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'strengthened_acceptance', status: 'ok', targetChapterCount: 5 }),
      expect.objectContaining({ key: 'structure_decision_execution', status: 'warn', targetChapterCount: 3 }),
    ]))
  })

  test('summarizes passed recovery validation batches as a restore-five confirmation action', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '扩批结构验证批通过，准备恢复 5 章扩批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '扩批结构验证批通过：第50、51、52章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。',
          target_chapter_count: 5,
          latest_chapter_nos: [50, 51, 52],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '扩批结构验证批通过：第50、51、52章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。',
            validation_chapter_nos: [50, 51, 52],
            failed_chapter_nos: [],
            risk_count: 0,
          },
        },
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'expanded_batch',
          current_lane_label: '5章扩批',
          current_target_chapter_count: 5,
          current_status: 'expanded',
          current_reason: '扩批结构验证批通过，恢复 5 章扩批。',
          route_nodes: [
            { key: 'structure_validation', label: '结构验证', status: 'ok', target_chapter_count: 5, detail: '验证批通过。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryValidation).toMatchObject({
      visible: true,
      status: 'passed',
      label: '3章验证批通过',
      validationChapterNos: [50, 51, 52],
      riskCount: 0,
      targetChapterCount: 5,
      nextActionKind: 'confirm_restore_five',
      nextActionLabel: '确认恢复5章扩批',
    })
    expect(snapshot?.recoveryValidation?.summary).toContain('第50、51、52章')
  })

  test('keeps default five-chapter recovery verdict in recovery validation summary', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '默认档位回退后的3章验证批通过。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '扩批结构验证批通过，默认档位恢复判定已清零。',
          target_chapter_count: 5,
          latest_chapter_nos: [68, 69, 70],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '扩批结构验证批通过：第68、69、70章核心守恒、显性回报和章末追读稳定。',
            validation_chapter_nos: [68, 69, 70],
            failed_chapter_nos: [],
            risk_count: 0,
            default_five_chapter_recovery_verdict: {
              visible: true,
              status: 'passed',
              label: '默认档位恢复判定',
              summary: '默认档位恢复判定：核心偏移、回报欠账、追读拉力已清零。',
              default_batch_chapter_nos: [63, 64, 65, 66, 67],
              restore_chapter_nos: [58, 59, 60, 61, 62],
              previous_validation_chapter_nos: [50, 51, 52],
              validation_chapter_nos: [68, 69, 70],
              failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              remaining_failure_reasons: [],
              failure_reason_statuses: [
                { reason: '核心偏移', status: 'cleared', risk_count: 0 },
                { reason: '回报欠账', status: 'cleared', risk_count: 0 },
                { reason: '追读拉力', status: 'cleared', risk_count: 0 },
              ],
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.defaultFiveChapterRecoveryVerdict).toMatchObject({
      visible: true,
      status: 'passed',
      label: '默认档位恢复判定',
      defaultBatchChapterNos: [63, 64, 65, 66, 67],
      restoreChapterNos: [58, 59, 60, 61, 62],
      previousValidationChapterNos: [50, 51, 52],
      validationChapterNos: [68, 69, 70],
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
    })
    expect(snapshot?.recoveryValidation?.defaultFiveChapterRecoveryVerdict?.summary).toContain('已清零')
  })

  test('keeps default lane template validation verdict in recovery validation summary', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位模板回检未通过，继续保持 3 章验证。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
          target_chapter_count: 3,
          latest_chapter_nos: [90, 91, 92],
          risk_count: 1,
          expansion_structure_validation_result: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证',
            summary: '扩批结构验证批未通过：默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
            validation_chapter_nos: [90, 91, 92],
            failed_chapter_nos: [91],
            risk_count: 1,
            default_five_chapter_lane_template_verdict: {
              visible: true,
              status: 'failed',
              label: '默认档位模板回检',
              summary: '默认档位模板回检未通过：生产后验仍复发：回报欠账。',
              validation_chapter_nos: [90, 91, 92],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'missing' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
              missing_count: 1,
              missing_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
              ],
              production_failed_count: 1,
              production_relapse_verdict: {
                visible: true,
                status: 'failed',
                label: '默认档位模板生产后验判定',
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [86, 87, 88, 89, 90],
                restore_chapter_nos: [81, 82, 83, 84, 85],
                previous_validation_chapter_nos: [78, 79, 80],
                validation_chapter_nos: [90, 91, 92],
                failure_reasons: ['核心偏移', '回报欠账'],
                cleared_failure_reasons: ['核心偏移'],
                remaining_failure_reasons: ['回报欠账'],
                failed_count: 1,
                failed_requirements: [
                  { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [90, 91, 92] },
                ],
                summary: '默认档位模板生产后验仍复发：回报欠账未清零。',
              },
              production_failed_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [90, 91, 92] },
              ],
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.defaultFiveChapterLaneTemplateVerdict).toMatchObject({
      visible: true,
      status: 'failed',
      label: '默认档位模板回检',
      validationChapterNos: [90, 91, 92],
      missingCount: 1,
      missingRequirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', chapterNos: [91] },
      ],
      productionFailedCount: 1,
      productionRelapseVerdict: {
        status: 'failed',
        templateVersionId: 'safe_batch_expansion_structure_repair:668',
        defaultBatchChapterNos: [86, 87, 88, 89, 90],
        validationChapterNos: [90, 91, 92],
        remainingFailureReasons: ['回报欠账'],
      },
      productionFailedRequirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', failureReason: '回报欠账', chapterNos: [90, 91, 92] },
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'missing' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    })
    expect(snapshot?.recoveryValidation?.defaultFiveChapterLaneTemplateVerdict?.summary).toContain('生产后验仍复发')
    expect(snapshot?.recoveryValidation?.nextActionLabel).toBe('修生产后验')
    expect(snapshot?.recoveryValidation?.reviewCta).toMatchObject({
      kind: 'repair_production_relapse',
      label: '修生产后验',
      remainingFailureReasons: ['回报欠账'],
    })
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('回报欠账')
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).not.toContain('核心偏移')
  })

  test('surfaces a single restore CTA after production relapse validation passes', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '生产后验验证批通过，进入5章观察。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '默认档位模板生产后验已修复。',
          target_chapter_count: 5,
          latest_chapter_nos: [114, 115, 116],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '默认档位模板生产后验已修复：核心偏移、回报欠账、追读拉力已清零。',
            validation_chapter_nos: [114, 115, 116],
            failed_chapter_nos: [],
            risk_count: 0,
            default_five_chapter_lane_template_verdict: {
              visible: true,
              status: 'passed',
              label: '默认档位模板回检',
              summary: '默认档位模板生产后验已修复。',
              validation_chapter_nos: [114, 115, 116],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
              missing_count: 0,
              missing_requirements: [],
              production_failed_count: 0,
              production_relapse_verdict: {
                visible: true,
                status: 'passed',
                label: '默认档位模板生产后验判定',
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [109, 110, 111, 112, 113],
                restore_chapter_nos: [104, 105, 106, 107, 108],
                previous_validation_chapter_nos: [96, 97, 98],
                validation_chapter_nos: [114, 115, 116],
                failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                remaining_failure_reasons: [],
                failed_count: 0,
                failed_requirements: [],
                summary: '默认档位模板生产后验已修复：核心偏移、回报欠账、追读拉力已清零。',
              },
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.status).toBe('passed')
    expect(snapshot?.recoveryValidation?.nextActionLabel).toBe('进入5章观察批')
    expect(snapshot?.recoveryValidation?.reviewCta).toMatchObject({
      kind: 'enter_five_chapter_observation',
      label: '进入5章观察批',
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
    })
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('生产后验已修复')
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('5章观察')
  })

  test('keeps default lane template stability profile in expansion feedback snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_recovery_restore_stability_lane: {
        visible: true,
        status: 'observing',
        label: '5章观察批',
        source: 'recovery_restore_stability_evidence',
        stable_pass_streak: 2,
        required_stable_pass_streak: 2,
        default_five_chapter_ready: false,
        restore_chapter_nos: [104, 105, 106, 107, 108],
        validation_chapter_nos: [96, 97, 98],
        latest_template_version_profile: {
          id: 'safe_batch_expansion_structure_repair:663',
          label: '默认5章档位模板重构',
          source_run_id: 663,
          latest_status: 'passed',
          validation_batch_count: 1,
          passed_batch_count: 1,
          failed_batch_count: 0,
          pass_streak: 1,
          required_pass_streak: 2,
          status: 'observing',
        },
        task_center_filter_label: '批次复盘筛选：5章观察批 / 当前模板版本 safe_batch_expansion_structure_repair:663',
        summary: '恢复5章扩批连续 2 批稳定，但当前模板版本 safe_batch_expansion_structure_repair:663 连过 1/2，继续观察。',
      },
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位模板进入稳定性观察。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '默认档位模板最近通过，但历史仍有回报密度失败 1 次；继续3章观察。',
          target_chapter_count: 5,
          latest_chapter_nos: [93, 94, 95],
          risk_count: 0,
          default_five_chapter_lane_template_stability_profile: {
            visible: true,
            status: 'observing',
            label: '默认档位模板稳定性',
            summary: '默认档位模板最近通过，但历史仍有回报密度失败 1 次；继续3章观察 1/2 批。',
            latest_status: 'passed',
            latest_chapter_nos: [93, 94, 95],
            validation_batch_count: 2,
            passed_batch_count: 1,
            failed_batch_count: 1,
            pass_streak: 1,
            required_pass_streak: 2,
            recommendation: 'continue_validation',
            failed_requirement_count: 1,
            requirements: [
              { key: 'default_lane_payoff_density', label: '回报密度', passed_count: 1, failed_count: 1, latest_status: 'fulfilled' },
            ],
            latest_template_version_profile: {
              id: 'safe_batch_expansion_structure_repair:663',
              label: '默认5章档位模板重构',
              source_run_id: 663,
              latest_status: 'passed',
              validation_batch_count: 1,
              passed_batch_count: 1,
              failed_batch_count: 0,
              pass_streak: 1,
              status: 'observing',
            },
            template_version_profiles: [
              {
                id: 'safe_batch_expansion_structure_repair:663',
                label: '默认5章档位模板重构',
                source_run_id: 663,
                latest_status: 'passed',
                validation_batch_count: 1,
                passed_batch_count: 1,
                failed_batch_count: 0,
                pass_streak: 1,
                status: 'observing',
              },
            ],
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile).toMatchObject({
      visible: true,
      status: 'observing',
      label: '默认档位模板稳定性',
      latestStatus: 'passed',
      latestChapterNos: [93, 94, 95],
      validationBatchCount: 2,
      passedBatchCount: 1,
      failedBatchCount: 1,
      passStreak: 1,
      requiredPassStreak: 2,
      recommendation: 'continue_validation',
      failedRequirementCount: 1,
      requirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', passedCount: 1, failedCount: 1, latestStatus: 'fulfilled' },
      ],
      latestTemplateVersionProfile: {
        id: 'safe_batch_expansion_structure_repair:663',
        sourceRunId: 663,
        latestStatus: 'passed',
        validationBatchCount: 1,
        passedBatchCount: 1,
        failedBatchCount: 0,
        passStreak: 1,
        status: 'observing',
      },
      templateVersionProfiles: [
        expect.objectContaining({
          id: 'safe_batch_expansion_structure_repair:663',
          sourceRunId: 663,
          latestStatus: 'passed',
          validationBatchCount: 1,
        }),
      ],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile?.summary).toContain('继续3章观察')
    expect(snapshot?.recoveryRestoreStabilityLane).toMatchObject({
      status: 'observing',
      defaultFiveChapterReady: false,
      stablePassStreak: 2,
      requiredStablePassStreak: 2,
      taskCenterFilterLabel: '批次复盘筛选：5章观察批 / 当前模板版本 safe_batch_expansion_structure_repair:663',
      latestTemplateVersionProfile: {
        id: 'safe_batch_expansion_structure_repair:663',
        status: 'observing',
        passStreak: 1,
        requiredPassStreak: 2,
      },
    })
  })

  test('summarizes failed recovery validation batches as a focused repair action', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '扩批结构验证批未通过，继续保持 3 章验证。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '扩批结构验证批未通过：第51章仍有 2 项核心/回报/追读风险，结构修复不能恢复5章扩批。',
          target_chapter_count: 3,
          latest_chapter_nos: [50, 51, 52],
          risk_count: 2,
          expansion_structure_validation_result: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证',
            summary: '扩批结构验证批未通过：第51章仍有 2 项核心/回报/追读风险，结构修复不能恢复5章扩批。',
            validation_chapter_nos: [50, 51, 52],
            failed_chapter_nos: [51],
            risk_count: 2,
          },
        },
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'small_batch',
          current_lane_label: '3章验证',
          current_target_chapter_count: 3,
          current_status: 'recovering',
          current_reason: '扩批结构验证批未通过，继续保持 3 章验证。',
          next_repair_layer: {
            key: 'structure_validation',
            label: '结构验证',
            status: 'warn',
            action_label: '重写扩批结构',
            detail: '第51章仍有结构验证风险。',
          },
          route_nodes: [
            { key: 'structure_validation', label: '结构验证', status: 'warn', target_chapter_count: 3, detail: '验证批未通过。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryValidation).toMatchObject({
      visible: true,
      status: 'failed',
      label: '3章验证批未过',
      validationChapterNos: [50, 51, 52],
      failedChapterNos: [51],
      riskCount: 2,
      targetChapterCount: 3,
      nextActionKind: 'focus_repair',
      nextActionLabel: '聚焦重写扩批结构',
      focus: {
        issueType: 'safe_batch_expansion_structure_repair',
        taskCenterFilterLabel: '扩批结构',
      },
    })
  })

  test('matches safe batch recovery focus to the intended task type and status', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补齐结构决策执行',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '扩批结构决策',
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'needs_review',
    })).toBe(true)
    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'resolved',
    })).toBe(false)
    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_repair',
      task_status: 'open',
    })).toBe(false)
  })

  test('normalizes annotation categories before matching safe batch recovery focus tasks', () => {
    const focus = {
      layerKey: 'reader_retention_recovery',
      layerLabel: '追读恢复',
      actionLabel: '补追读恢复',
      targetView: 'repair_task',
      issueType: 'reader_retention_missed',
      source: 'safe_batch_reader_retention_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '追读',
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      annotation_category: 'reader_retention',
      task_status: 'needs_review',
    })).toBe(true)

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
      task_status: 'needs_review',
    })).toBe(false)
  })

  test('matches default lane template focus only to structure decision tasks with default lane gaps', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补默认档位模板',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '默认档位模板',
      requirementKey: 'default_lane_template',
    }

    const genericStructureTask = {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'open',
      safe_batch_expansion_structure_decision_review: {
        failed_items: [{ key: 'segment_role', label: '中段职责', count: 1 }],
      },
    }
    const defaultLaneTask = {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'open',
      safe_batch_expansion_structure_decision_review: {
        default_five_chapter_lane_redesign: {
          reason: 'repeated_recovery_verdict_relapse',
          relapse_count: 2,
        },
        failed_items: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
        ],
      },
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus as any, genericStructureTask)).toBe(false)
    expect(safeBatchRecoveryFocusMatchesTask(focus as any, defaultLaneTask)).toBe(true)
  })

  test('summarizes safe batch recovery focus after matched tasks are resolved', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补齐结构决策执行',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '扩批结构决策',
    }

    expect(buildSafeBatchRecoveryFocusReviewState(focus, [
      {
        task: {
          issue_type: 'safe_batch_expansion_structure_decision_mismatch',
          task_status: 'open',
        },
      },
    ])).toMatchObject({
      status: 'active',
      matchedCount: 1,
      activeCount: 1,
      resolvedCount: 0,
      nextActionLabel: '继续补齐结构决策执行',
    })

    expect(buildSafeBatchRecoveryFocusReviewState(focus, [
      {
        task: {
          issue_type: 'safe_batch_expansion_structure_decision_mismatch',
          task_status: 'resolved',
        },
      },
    ])).toMatchObject({
      status: 'ready_for_recheck',
      matchedCount: 1,
      activeCount: 0,
      resolvedCount: 1,
      nextActionLabel: '刷新路线图并启动验证批',
    })
  })

  test('summarizes resolved default lane template focus by four obligations', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补默认档位模板',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '默认档位模板',
      requirementKey: 'default_lane_template',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_decision_mismatch',
        task_status: 'resolved',
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
      },
    }])

    expect(state.status).toBe('ready_for_recheck')
    expect(state.summary).toContain('默认档位段位职责已补齐')
    expect(state.summary).toContain('冲突轮换已补齐')
    expect(state.summary).toContain('回报密度已补齐')
    expect(state.summary).toContain('章末追读模板已补齐')
    expect((state as any).obligationStatuses).toEqual([
      { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled', text: '默认档位段位职责已补齐', color: 'green' },
      { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled', text: '冲突轮换已补齐', color: 'green' },
      { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled', text: '回报密度已补齐', color: 'green' },
      { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled', text: '章末追读模板已补齐', color: 'green' },
    ])
  })

  test('surfaces production relapse closure criteria in active default lane template focus', () => {
    const focus = {
      layerKey: 'default_lane_template_version',
      layerLabel: '默认档位模板版本',
      actionLabel: '修生产后验',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_recovery_roadmap',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '生产后验仍复发',
      requirementKey: 'default_lane_template',
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'open',
        safe_batch_expansion_structure_review: {
          default_five_chapter_lane_template_repair: {
            visible: true,
            status: 'failed',
            production_relapse_verdict: {
              visible: true,
              status: 'failed',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              default_batch_chapter_nos: [109, 110, 111, 112, 113],
              validation_chapter_nos: [114, 115, 116],
              remaining_failure_reasons: ['核心偏移', '回报欠账'],
            },
            production_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
              { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
            ],
          },
        },
      },
    }])

    expect(state.status).toBe('active')
    expect(state.summary).toContain('等待生产后验验证批')
    expect(state.summary).toContain('真实复发批：第109、110、111、112、113章')
    expect(state.summary).toContain('仍复发维度：核心偏移、回报欠账')
    expect(state.summary).toContain('production_relapse_verdict.status=passed')
    expect((state as any).productionRelapseClosure).toMatchObject({
      status: 'failed',
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
      closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    })
  })

  test('surfaces production relapse closure criteria after default lane template focus is resolved', () => {
    const focus = {
      layerKey: 'default_lane_template_version',
      layerLabel: '默认档位模板版本',
      actionLabel: '修生产后验',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_recovery_roadmap',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '生产后验仍复发',
      requirementKey: 'default_lane_template',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'resolved',
        safe_batch_expansion_structure_review: {
          default_five_chapter_lane_template_repair: {
            visible: true,
            status: 'failed',
            production_relapse_verdict: {
              visible: true,
              status: 'failed',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              default_batch_chapter_nos: [109, 110, 111, 112, 113],
              validation_chapter_nos: [114, 115, 116],
              remaining_failure_reasons: ['核心偏移'],
              cleared_failure_reasons: ['追读拉力'],
            },
            production_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
            ],
          },
        },
      },
    }])

    expect(state.status).toBe('ready_for_recheck')
    expect(state.nextActionLabel).toBe('启动生产后验验证批')
    expect(state.summary).toContain('已处理 1 个匹配任务')
    expect(state.summary).toContain('下一轮以 production_relapse_verdict.status=passed 关闭')
    expect(state.summary).toContain('remaining_failure_reasons 为空')
    expect(state.summary).toContain('不能只补 default_lane_*_delivered')
    expect((state as any).productionRelapseClosure).toMatchObject({
      status: 'failed',
      closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    })
  })
})

