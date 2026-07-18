import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationSerialStageKey,
  AutoCreationSerialWorkflowStage,
  AutoCreationDirectorCreationPipelineStage,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompassAxis,
  AutoCreationLongformCompass,
  AutoCreationManualTestGate,
  AutoCreationManualTestReadiness,
  AutoCreationBatchGuardrailSignal,
  AutoCreationRecoveryEvidenceTrendSource,
  AutoCreationStrengthenedRepairAcceptanceTrend,
  AutoCreationRecoveryEvidenceTrend,
  AutoCreationBatchReleaseChapter,
  AutoCreationBatchReleaseWindow,
  AutoCreationBatchPreflight,
  AutoCreationBatchBriefRepair,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationLongformCapacitySignal,
  AutoCreationLongformFuelItem,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchSignal,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewItem,
  AutoCreationBatchRiskSignal,
  AutoCreationBatchChecklistExecutionItem,
  AutoCreationBatchChecklistExecution,
  AutoCreationBatchRiskRadar,
  AutoCreationBatchCompletionMetric,
  AutoCreationBatchCompletionDashboard,
  AutoCreationBatchHandoff,
  AutoCreationBatchReviewQueue,
  AutoCreationDeliveryRiskGateCategory,
  AutoCreationDeliveryRiskResolution,
  AutoCreationDeliveryRiskGate,
  AutoCreationStorylineDecisionGate,
  AutoCreationGovernanceClosureBrief,
  AutoCreationWritingQueueFocus,
  AutoCreationDailyBattleStep,
  AutoCreationDailyBattlePlan,
  AutoCreationProductionLicense,
  AutoCreationTodayCommandFlowItem,
  AutoCreationTodayQualityGate,
  AutoCreationGovernanceRecheckMemoryStatus,
  AutoCreationGovernanceRecheckMemory,
  AutoCreationReleaseRationale,
  AutoCreationTodayCommandDeck,
  AutoCreationSerialCockpitStatus,
  AutoCreationChapterChainStatus,
  AutoCreationSerialGuardrail,
  AutoCreationChapterChainStep,
  AutoCreationRiskQueueItem,
  AutoCreationSerialCockpit,
  AutoCreationMillionWordRunwayGate,
  AutoCreationMillionWordRunwayQuestion,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'
import {
  buildSafeBatchRecoveryRoadmap,
} from './helpers-main'
import {
  safeBatchExpansionFeedbackSnapshot,
} from './helpers-safe-batch-recovery'
import {
  text,
} from './helpers-basics'

export function buildSafeBatchExpansionPolicy(
  trend: AutoCreationStrengthenedRepairAcceptanceTrend,
  expansionFeedback?: AnyRecord | null,
) {
  const requiredPassStreak = 3
  const baseChapterCount = 3
  const expandedChapterCount = 5
  const feedback = expansionFeedback?.visible ? expansionFeedback : null
  const feedbackStatus = text(feedback?.status)
  const structureRepairEffectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const structureDecisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const defaultLaneTemplateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const structureRepairRecommendation = text(structureRepairEffectiveness?.recommendation)
  const defaultLaneTemplateRecommendation = text(defaultLaneTemplateStabilityProfile?.recommendation)
  const defaultLaneTemplateStatus = text(defaultLaneTemplateStabilityProfile?.status)
  const structureRepairNeedsMoreValidation = structureRepairRecommendation === 'continue_small_validation'
  const structureRepairNeedsRedesign = structureRepairRecommendation === 'escalate_structure_redesign'
  const defaultLaneTemplateNeedsObservation = defaultLaneTemplateRecommendation === 'continue_validation'
    || defaultLaneTemplateStatus === 'observing'
  const defaultLaneTemplateNeedsRepair = defaultLaneTemplateRecommendation === 'repair_template'
    || defaultLaneTemplateStatus === 'relapsed'
  const defaultLaneTemplateNeedsRedesign = defaultLaneTemplateRecommendation === 'escalate_template_redesign'
    || defaultLaneTemplateStatus === 'redesign'
  const structureDecisionTrendWarn = text(structureDecisionTrend?.status) === 'warn'
  const feedbackNeedsRecovery = feedbackStatus === 'rollback_to_single_chapter' || feedbackStatus === 'rollback_to_small_batch'
  const feedbackRecovered = feedbackStatus === 'recovered'
  const canExpandByTrend = Boolean(
    trend.visible
    && trend.status === 'ok'
    && trend.latestStatus === 'ok'
    && trend.passStreak >= requiredPassStreak,
  )
  const canExpand = canExpandByTrend
    && !feedbackNeedsRecovery
    && !structureRepairNeedsMoreValidation
    && !structureRepairNeedsRedesign
    && !defaultLaneTemplateNeedsObservation
    && !defaultLaneTemplateNeedsRepair
    && !defaultLaneTemplateNeedsRedesign
    && !structureDecisionTrendWarn
  let targetChapterCount = baseChapterCount
  if (canExpand) {
    targetChapterCount = expandedChapterCount
  } else if (structureRepairNeedsRedesign || defaultLaneTemplateNeedsRedesign) {
    targetChapterCount = 1
  } else if (structureDecisionTrendWarn) {
    targetChapterCount = Math.max(1, Math.min(
      baseChapterCount,
      Number(structureDecisionTrend?.suggested_target_chapter_count ?? structureDecisionTrend?.suggestedTargetChapterCount ?? baseChapterCount),
    ))
  } else if (structureRepairNeedsMoreValidation || defaultLaneTemplateNeedsObservation || defaultLaneTemplateNeedsRepair) {
    targetChapterCount = baseChapterCount
  } else if (feedbackNeedsRecovery) {
    targetChapterCount = Math.max(1, Math.min(baseChapterCount, Number(feedback?.targetChapterCount || baseChapterCount)))
  }
  const structureRepairSummary = text(structureRepairEffectiveness?.summary)
  let summary = trend.visible
    ? `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；达到 ${requiredPassStreak} 批前继续保持 ${baseChapterCount} 章以内小批量安全连写。`
    : `暂无强化恢复验收趋势，继续保持 ${baseChapterCount} 章以内小批量安全连写。`
  if (structureRepairNeedsRedesign) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${structureRepairSummary}结构修复有效性要求升级批次设计重构，下一轮回到单章治理。`
  } else if (defaultLaneTemplateNeedsRedesign) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}默认档位模板稳定性要求升级模板重构，下一轮回到单章治理。`
  } else if (structureDecisionTrendWarn) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(structureDecisionTrend?.summary)}结构决策执行趋势未稳，下一轮保持 ${targetChapterCount} 章以内安全连写。`
  } else if (structureRepairNeedsMoreValidation) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${structureRepairSummary}结构修复有效性建议继续小批验证，下一轮保持 ${baseChapterCount} 章以内安全连写。`
  } else if (defaultLaneTemplateNeedsObservation) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}下一轮继续保持 ${baseChapterCount} 章模板观察批。`
  } else if (defaultLaneTemplateNeedsRepair) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}默认档位模板仍需回修，下一轮保持 ${baseChapterCount} 章以内验证。`
  } else if (feedbackNeedsRecovery) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过，但最近一次5章扩批存在扩批分段热区；${text(feedback?.summary, `下一轮保持 ${targetChapterCount} 章以内安全连写。`)}`
  } else if (canExpand) {
    summary = feedbackRecovered
      ? `强化恢复验收连续 ${trend.passStreak}/${requiredPassStreak} 批通过；${text(feedback?.summary, '扩批分段热区已修复并通过复检。')}本轮恢复 ${expandedChapterCount} 章安全连写。`
      : `强化恢复验收连续 ${trend.passStreak}/${requiredPassStreak} 批通过，核心守恒、读者回报和追读拉力未复发，本轮可从 ${baseChapterCount} 章扩到 ${expandedChapterCount} 章安全连写。`
  }
  const status = canExpand ? 'expanded' : feedbackNeedsRecovery
    || structureRepairNeedsMoreValidation
    || structureRepairNeedsRedesign
    || defaultLaneTemplateNeedsObservation
    || defaultLaneTemplateNeedsRepair
    || defaultLaneTemplateNeedsRedesign
    || structureDecisionTrendWarn ? 'recovering' : 'observing'
  const recoveryRoadmap = buildSafeBatchRecoveryRoadmap({
    trend,
    feedback,
    policyStatus: status,
    policySummary: summary,
    targetChapterCount,
    baseChapterCount,
    expandedChapterCount,
    requiredPassStreak,
  })

  return {
    visible: true,
    status,
    label: '强化扩批规则',
    summary,
    targetChapterCount,
    baseChapterCount,
    expandedChapterCount,
    requiredPassStreak,
    passStreak: Math.max(0, Number(trend.passStreak || 0)),
    acceptedBatchCount: Math.max(0, Number(trend.acceptedBatchCount || 0)),
    failedBatchCount: Math.max(0, Number(trend.failedBatchCount || 0)),
    latestStatus: trend.latestStatus,
    expansionFeedback: feedback ? safeBatchExpansionFeedbackSnapshot(feedback) : null,
    recoveryRoadmap,
  }
}

