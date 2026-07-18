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

describe('buildSafeBatchExpansionPolicySnapshot a', () => {
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


})
