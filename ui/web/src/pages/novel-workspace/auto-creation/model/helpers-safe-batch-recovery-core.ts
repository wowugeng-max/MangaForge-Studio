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
  PLANNING_ACTION_LABELS,
  arrayValue,
  firstText,
  normalizePlanningActionKey,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  parsePayload,
  recordTime,
  hasDeliveredProse,
  latestReviewForChapter,
  findChapter,
  numberValue,
  recoveryEvidenceEventTime,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  batchRiskLabels,
  signal,
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  compactChapterNoEvidence,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  boolValue,
  reviewPayload,
  coreRiskCount,
  payoffDebtCount,
  expectationRiskCount,
  retentionRiskCount,
  recoveryEvidenceReview,
  finiteNumberOrNull,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  isResolvedTaskStatus,
  isCompletedRepairRun,
  batchRiskIssueResolved,
  recoveryEvidenceReleaseSummaryFromPreflight,
  emptyStrengthenedRepairAcceptanceTrend,
} from './helpers-main'

export function buildSafeBatchRecoveryRestoreConfirmation(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded') return null
  const targetChapterCount = Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0)
  if (targetChapterCount < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  if (!validation || text(validation.status) !== 'ok') return null
  const riskCount = Number(validation.risk_count ?? validation.riskCount ?? feedback?.risk_count ?? feedback?.riskCount ?? 0)
  if (riskCount > 0) return null
  const validationChapterNos = Array.from(new Set([
    ...arrayValue(validation.validation_chapter_nos),
    ...arrayValue(validation.validationChapterNos),
    ...arrayValue(feedback?.latest_chapter_nos),
    ...arrayValue(feedback?.latestChapterNos),
  ].map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0)))
  if (!validationChapterNos.length) return null
  const chapterEvidence = compactChapterNoEvidence(validationChapterNos)
  const validationSummary = text(validation.summary)
  const defaultFiveChapterRecoveryVerdict = validation.default_five_chapter_recovery_verdict
    || validation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: 'ready',
    label: '确认恢复5章扩批',
    summary: `3章验证批已通过：${chapterEvidence}核心守恒、显性回报和章末追读稳定，可确认恢复 ${targetChapterCount} 章扩批。`,
    validation_chapter_nos: validationChapterNos,
    target_chapter_count: targetChapterCount,
    risk_count: riskCount,
    source: 'safe_batch_recovery_validation_result',
    evidence: [
      validationSummary,
      text(defaultFiveChapterRecoveryVerdict?.summary),
    ].filter(Boolean),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchRecoveryFocusPayload(focusLike: AnyRecord | null | undefined) {
  if (!focusLike) return null
  return {
    layerKey: text(focusLike.layer_key || focusLike.layerKey),
    layerLabel: text(focusLike.layer_label || focusLike.layerLabel),
    actionLabel: text(focusLike.action_label || focusLike.actionLabel),
    targetView: text(focusLike.target_view || focusLike.targetView),
    issueType: text(focusLike.issue_type || focusLike.issueType),
    source: text(focusLike.source),
    taskStatuses: arrayValue(focusLike.task_statuses || focusLike.taskStatuses).map(item => text(item)).filter(Boolean),
    taskCenterFilterLabel: text(focusLike.task_center_filter_label || focusLike.taskCenterFilterLabel),
    requirementKey: text(focusLike.requirement_key || focusLike.requirementKey),
    templateVersionId: text(focusLike.template_version_id || focusLike.templateVersionId),
  }
}

export function safeBatchRecoveryRoadmapRecommendedAction(roadmapLike: AnyRecord | null | undefined) {
  const roadmap = roadmapLike || null
  const focus = safeBatchRecoveryFocusPayload(roadmap?.recommended_focus || roadmap?.recommendedFocus)
  const nextLayer = roadmap?.next_repair_layer || roadmap?.nextRepairLayer || null
  if (!focus || !focus.layerKey || text(nextLayer?.status) !== 'warn') return null
  const label = focus.actionLabel || text(nextLayer?.action_label || nextLayer?.actionLabel || nextLayer?.label, '查看安全连写路线')
  const detail = text(nextLayer?.detail, text(roadmap?.current_reason || roadmap?.currentReason, '任务中心会定位到安全连写恢复路线图指出的下一层。'))
  return opsAction('open_task_center', label, detail, false, {
    source: 'safe_batch_recovery_roadmap',
    safeBatchRecoveryFocus: focus,
  })
}

export function safeBatchExpansionPolicySnapshot(policy: AnyRecord) {
  return {
    status: text(policy?.status, 'observing'),
    label: text(policy?.label, '强化扩批规则'),
    summary: text(policy?.summary),
    target_chapter_count: Number(policy?.targetChapterCount || 0),
    base_chapter_count: Number(policy?.baseChapterCount || 0),
    expanded_chapter_count: Number(policy?.expandedChapterCount || 0),
    required_pass_streak: Number(policy?.requiredPassStreak || 0),
    pass_streak: Number(policy?.passStreak || 0),
    accepted_batch_count: Number(policy?.acceptedBatchCount || 0),
    failed_batch_count: Number(policy?.failedBatchCount || 0),
    latest_status: text(policy?.latestStatus, 'none'),
    ...(policy?.expansionFeedback ? { expansion_feedback: policy.expansionFeedback } : {}),
    ...(policy?.recoveryRoadmap ? { safe_batch_recovery_roadmap: policy.recoveryRoadmap } : {}),
  }
}

export function safeBatchExpansionPolicyFromPreflight(preflight: AnyRecord | null | undefined) {
  const policy = preflight?.safe_batch_expansion_policy || preflight?.safeBatchExpansionPolicy || null
  const targetChapterCount = Number(policy?.target_chapter_count ?? policy?.targetChapterCount ?? 0)
  if (!policy || text(policy?.status) !== 'expanded' || targetChapterCount < 5) return null
  return {
    status: 'expanded',
    targetChapterCount,
    baseChapterCount: Number(policy?.base_chapter_count ?? policy?.baseChapterCount ?? 3),
    expandedChapterCount: Number(policy?.expanded_chapter_count ?? policy?.expandedChapterCount ?? targetChapterCount),
    requiredPassStreak: Number(policy?.required_pass_streak ?? policy?.requiredPassStreak ?? 3),
    passStreak: Number(policy?.pass_streak ?? policy?.passStreak ?? 0),
    summary: text(policy?.summary, '强化恢复验收趋势允许本批扩批。'),
  }
}

export function safeBatchExpansionSegmentKey(index: number, total: number) {
  const frontEnd = Math.max(1, Math.ceil(total * 0.4))
  const middleEnd = Math.max(frontEnd + 1, Math.ceil(total * 0.8))
  if (index < frontEnd) return { key: 'front', label: '前段' }
  if (index < middleEnd) return { key: 'middle', label: '中段' }
  return { key: 'ending', label: '后段' }
}

export function safeBatchExpansionRollbackPolicy(args: {
  riskCount: number
  coreRiskCount: number
  hotspotLabel: string
}) {
  const rollbackToSingle = args.coreRiskCount >= 2 || args.riskCount >= 5
  const targetChapterCount = rollbackToSingle ? 1 : 3
  return {
    mode: rollbackToSingle ? 'rollback_to_single_chapter' : 'rollback_to_small_batch',
    targetChapterCount,
    label: rollbackToSingle ? '回到单章治理' : '回退到 2-3 章',
    summary: rollbackToSingle
      ? `${args.hotspotLabel || '扩批批次'}核心风险过高，下一轮回到单章治理，先逐章修复核心守恒、读者回报和追读拉力。`
      : `${args.hotspotLabel || '扩批批次'}出现扩批热区，下一轮回退到 2-3 章安全连写，确认核心/回报/追读稳定后再扩到 5 章。`,
  }
}

export function safeBatchExpansionSegmentReviewSnapshot(review: AnyRecord) {
  return {
    visible: Boolean(review?.visible),
    status: text(review?.status, 'ok'),
    label: text(review?.label, '扩批分段复盘'),
    summary: text(review?.summary),
    target_chapter_count: Number(review?.targetChapterCount || 0),
    actual_chapter_count: Number(review?.actualChapterCount || 0),
    risk_count: Number(review?.riskCount || 0),
    segments: arrayValue(review?.segments).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    hotspots: arrayValue(review?.hotspots).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    rollback_policy: {
      mode: text(review?.rollbackPolicy?.mode),
      target_chapter_count: Number(review?.rollbackPolicy?.targetChapterCount || 0),
      label: text(review?.rollbackPolicy?.label),
      summary: text(review?.rollbackPolicy?.summary),
    },
  }
}

export function safeBatchExpansionRepeatedHotspotSegment(feedback?: AnyRecord | null) {
  const segment = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const count = Number(segment?.count || 0)
  if (!segment || count < 2) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count,
    summary: text(segment?.summary),
    source: text(segment?.source),
  }
}

