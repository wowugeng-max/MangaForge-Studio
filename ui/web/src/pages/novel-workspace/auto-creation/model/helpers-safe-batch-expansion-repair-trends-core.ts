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
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  batchRiskIssueResolved,
  batchRiskLabels,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  compactChapterNoEvidence,
  coreRiskCount,
  emptyStrengthenedRepairAcceptanceTrend,
  expectationRiskCount,
  findChapter,
  finiteNumberOrNull,
  hasDeliveredProse,
  isCompletedRepairRun,
  isResolvedTaskStatus,
  latestReviewForChapter,
  numberValue,
  parsePayload,
  payoffDebtCount,
  recordTime,
  recoveryEvidenceEventTime,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  recoveryEvidenceReleaseSummaryFromPreflight,
  recoveryEvidenceReview,
  retentionRiskCount,
  signal,
} from './helpers-main'
import {
  buildSafeBatchExpansionStructureValidationResult,
  normalizeDefaultFiveChapterLaneTemplateVersion,
  safeBatchDefaultRecoveryRiskCountForReason,
  safeBatchExpansionPolicyFromPreflight,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentKey,
} from './helpers-safe-batch-recovery'

import {
  buildSafeBatchExpansionStructureValidationTrend,
  latestResolvedSafeBatchExpansionStructureRepairWithTrend,
  safeBatchDefaultRecoveryVerdictRelapseReasonCounts,
  safeBatchDefaultRecoveryVerdictRelapseTrendCount,
  safeBatchExpansionStructureTrendFailureCount,
  safeBatchExpansionStructureTrendRecurrenceInterval
} from './helpers-safe-batch-expansion-trends'

export function buildSafeBatchExpansionStructureRepairEffectiveness(args: {
  runRecords: AnyRecord[]
  validationEvaluations: AnyRecord[]
  expansionEvaluations: AnyRecord[]
}) {
  const repair = latestResolvedSafeBatchExpansionStructureRepairWithTrend(args.runRecords)
  if (!repair) return null
  const repairedAtMs = Date.parse(repair.repairedAt)
  if (!Number.isFinite(repairedAtMs)) return null
  const segmentKey = repair.segmentKey
  const postValidationEvaluations = arrayValue(args.validationEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
    .filter(evaluation => {
      const repeated = evaluation?.result?.repeated_hotspot_segment || evaluation?.result?.repeatedHotspotSegment || null
      return text(repeated?.key, 'unknown') === segmentKey
    })
  if (!postValidationEvaluations.length) return null
  const postExpansionEvaluations = arrayValue(args.expansionEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
  const currentTrend = buildSafeBatchExpansionStructureValidationTrend({
    validationEvaluations: postValidationEvaluations,
    expansionEvaluations: postExpansionEvaluations,
  })
  if (!currentTrend) return null

  const baselinePassRate = Number(repair.trend?.pass_rate ?? repair.trend?.passRate ?? 0)
  const currentPassRate = Number(currentTrend.pass_rate || 0)
  const baselineFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(repair.trend)
  const currentFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(currentTrend)
  const baselineRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(repair.trend)
  const currentRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(currentTrend)
  const baselineRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(repair.trend)
  const currentRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(currentTrend)
  const baselineRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(repair.trend)
  const currentRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(currentTrend)
  const repeatedRelapseReasons = Array.from(new Set([
    ...baselineRelapseReasonCounts.keys(),
    ...currentRelapseReasonCounts.keys(),
  ]))
    .filter(reason => (baselineRelapseReasonCounts.get(reason) || 0) > 0 && (currentRelapseReasonCounts.get(reason) || 0) > 0)
    .map(reason => ({
      reason,
      count: (baselineRelapseReasonCounts.get(reason) || 0) + (currentRelapseReasonCounts.get(reason) || 0),
    }))
  const repeatedRelapseCount = repeatedRelapseReasons.length > 0 ? baselineRelapseCount + currentRelapseCount : 0
  const defaultRecoveryVerdictRelapseRepeated = repeatedRelapseCount >= 2 && repeatedRelapseReasons.length > 0
  const currentRecurrence = currentTrend.recurrence_after_restore || null
  const passRateDelta = currentPassRate - baselinePassRate
  const failureReasonDelta = currentFailureReasonCount - baselineFailureReasonCount
  const recurrenceImproved = baselineRecurrenceInterval > 0
    ? !currentRecurrence?.visible || currentRecurrenceInterval > baselineRecurrenceInterval
    : !currentRecurrence?.visible
  const improved = passRateDelta > 0 || failureReasonDelta < 0 || recurrenceImproved
  const regressed = passRateDelta < 0 || failureReasonDelta > 0 || (currentRecurrence?.visible && currentRecurrenceInterval > 0 && currentRecurrenceInterval <= baselineRecurrenceInterval)
  const status = defaultRecoveryVerdictRelapseRepeated ? 'warn' as const : improved && !regressed ? 'ok' as const : 'warn' as const
  const recommendation = defaultRecoveryVerdictRelapseRepeated
    ? 'escalate_structure_redesign'
    : status === 'ok' && currentPassRate >= 100 && currentFailureReasonCount <= 0 && !currentRecurrence?.visible
    ? 'restore_five_chapter'
    : status === 'ok'
      ? 'continue_small_validation'
      : 'escalate_structure_redesign'
  const recurrenceSummary = currentRecurrence?.visible
    ? `修复后${currentRecurrence.interval_label || `第${currentRecurrenceInterval}个扩批批次复发`}`
    : '修复后暂无同段复发'
  const defaultRecoveryVerdictRelapseTrend = baselineRelapseCount > 0 || currentRelapseCount > 0 ? {
    visible: true,
    baseline_relapse_count: baselineRelapseCount,
    current_relapse_count: currentRelapseCount,
    repeated_relapse_count: repeatedRelapseCount,
    repeated_failure_reasons: repeatedRelapseReasons,
    recommendation: defaultRecoveryVerdictRelapseRepeated ? 'escalate_structure_redesign' : 'continue_validation',
    summary: defaultRecoveryVerdictRelapseRepeated
      ? `连续 ${repeatedRelapseCount} 次恢复判定失效：${repeatedRelapseReasons.map(item => item.reason).join('、')}同维复发，默认档位结构重构。`
      : `恢复判定失效观察：修复前 ${baselineRelapseCount} 次，修复后 ${currentRelapseCount} 次。`,
  } : null
  const defaultRelapseSummary = defaultRecoveryVerdictRelapseRepeated
    ? `，${text(defaultRecoveryVerdictRelapseTrend?.summary, `连续 ${repeatedRelapseCount} 次恢复判定失效，默认档位结构重构。`).replace(/。$/, '')}`
    : ''

  return {
    visible: true,
    status,
    label: '结构修复有效性',
    summary: `${repair.segmentLabel}结构修复有效性：通过率 ${baselinePassRate}% -> ${currentPassRate}%，失败主因 ${baselineFailureReasonCount} -> ${currentFailureReasonCount}，${recurrenceSummary}${defaultRelapseSummary}。`,
    source_run_id: repair.sourceRunId,
    repaired_at: repair.repairedAt,
    segment_key: segmentKey,
    segment_label: repair.segmentLabel,
    baseline_pass_rate: baselinePassRate,
    current_pass_rate: currentPassRate,
    pass_rate_delta: passRateDelta,
    baseline_failure_reason_count: baselineFailureReasonCount,
    current_failure_reason_count: currentFailureReasonCount,
    failure_reason_delta: failureReasonDelta,
    baseline_recurrence_interval_batch_count: baselineRecurrenceInterval,
    current_recurrence_interval_batch_count: currentRecurrenceInterval,
    recommendation,
    baseline_trend: repair.trend,
    current_trend: currentTrend,
    ...(defaultRecoveryVerdictRelapseTrend ? {
      default_five_chapter_recovery_verdict_relapse_trend: defaultRecoveryVerdictRelapseTrend,
    } : {}),
  }
}

export function isSafeBatchGenerationSource(source: string) {
  return source === 'auto_creation_safe_batch'
    || source === 'safe_batch_recovery_validation_batch'
    || source === 'safe_batch_recovery_restore_five_batch'
}

export function safeBatchRecoveryRestoreConfirmationFromEntry(entry: AnyRecord) {
  return entry?.input?.recovery_restore_confirmation
    || entry?.input?.recoveryRestoreConfirmation
    || entry?.preflight?.safe_batch_recovery_restore_confirmation
    || entry?.preflight?.safeBatchRecoveryRestoreConfirmation
    || null
}

export function safeBatchRecoveryRestoreValidationSegmentFromEntry(entry: AnyRecord) {
  const policy = entry?.preflight?.safe_batch_expansion_policy || entry?.preflight?.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const validation = feedback?.expansion_structure_validation_result
    || feedback?.expansionStructureValidationResult
    || null
  const segment = validation?.repeated_hotspot_segment
    || validation?.repeatedHotspotSegment
    || feedback?.repeated_hotspot_segment
    || feedback?.repeatedHotspotSegment
    || null
  if (!segment) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count: Math.max(0, Number(segment?.count || 0)),
  }
}

export function defaultFiveChapterRecoveryVerdictFromSource(source?: AnyRecord | null) {
  if (!source) return null
  const verdict = source.default_five_chapter_recovery_verdict
    || source.defaultFiveChapterRecoveryVerdict
    || null
  if (!verdict || verdict.visible === false) return null
  return verdict
}

export function defaultFiveChapterRecoveryVerdictFromEntry(entry: AnyRecord) {
  const input = entry?.input || {}
  const preflight = entry?.preflight || {}
  const policy = preflight.safe_batch_expansion_policy || preflight.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const sources = [
    input,
    input.recovery_restore_confirmation || input.recoveryRestoreConfirmation,
    input.recovery_restore_stability_evidence || input.recoveryRestoreStabilityEvidence,
    input.default_five_chapter_lane || input.defaultFiveChapterLane,
    preflight.safe_batch_recovery_restore_confirmation || preflight.safeBatchRecoveryRestoreConfirmation,
    preflight.safe_batch_recovery_restore_stability_lane || preflight.safeBatchRecoveryRestoreStabilityLane,
    feedback?.recovery_restore_stability_evidence || feedback?.recoveryRestoreStabilityEvidence,
    feedback?.expansion_structure_validation_result || feedback?.expansionStructureValidationResult,
  ]
  for (const source of sources) {
    const verdict = defaultFiveChapterRecoveryVerdictFromSource(source)
    if (verdict) return verdict
  }
  return null
}

export function defaultFiveChapterLaneFromEntry(entry: AnyRecord) {
  return entry?.input?.default_five_chapter_lane
    || entry?.input?.defaultFiveChapterLane
    || entry?.preflight?.safe_batch_recovery_restore_stability_lane
    || entry?.preflight?.safeBatchRecoveryRestoreStabilityLane
    || null
}

export function safeBatchRecoveryRestoreStabilityEvidence(evaluation: AnyRecord | null | undefined, stablePassStreak: number) {
  if (!evaluation || text(evaluation.source) !== 'safe_batch_recovery_restore_five_batch') return null
  const validationChapterNos = arrayValue(evaluation.recoveryRestoreConfirmation?.validation_chapter_nos || evaluation.recoveryRestoreConfirmation?.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || evaluation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: Number(evaluation.rawRiskCount || 0) > 0 ? 'relapsed' : 'passed',
    source: 'safe_batch_recovery_restore_five_batch',
    restored_batch_created_at: text(evaluation.latestBatchCreatedAt),
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    stable_pass_streak: Math.max(0, Number(stablePassStreak || 0)),
    summary: Number(evaluation.rawRiskCount || 0) > 0
      ? `恢复5章扩批稳定观察发现复发：${compactChapterNoEvidence(restoreChapterNos)}仍有核心/回报/追读热区。`
      : `恢复5章扩批稳定观察通过：${compactChapterNoEvidence(validationChapterNos)}验证批之后，${compactChapterNoEvidence(restoreChapterNos)}继续保持核心守恒、显性回报和章末追读稳定。`,
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const verdict = evaluation.defaultFiveChapterRecoveryVerdict
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.defaultFiveChapterLane)
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || null
  if (!verdict || text(verdict.status) !== 'passed') return null
  const failureReasons = arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .concat(arrayValue(verdict.failure_reasons || verdict.failureReasons))
    .map(item => text(item))
    .filter(Boolean)
  const uniqueFailureReasons = Array.from(new Set(failureReasons))
  if (!uniqueFailureReasons.length) return null
  const hotspot = evaluation.topHotspot || {}
  const counts = {
    riskCount: Number(hotspot.riskCount || hotspot.risk_count || 0),
    coreRiskCount: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
    payoffDebtCount: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
    readerPullRiskCount: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
  }
  const reasonStatuses = uniqueFailureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, counts)
    return {
      reason,
      status: riskCount > 0 ? 'relapsed' : 'stable',
      risk_count: riskCount,
    }
  })
  const relapsedFailureReasons = reasonStatuses
    .filter(item => item.status === 'relapsed')
    .map(item => item.reason)
  if (!relapsedFailureReasons.length) return null
  const stableFailureReasons = reasonStatuses
    .filter(item => item.status === 'stable')
    .map(item => item.reason)
  const relapseBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const relapsedChapterNos = arrayValue(hotspot.chapterNos || hotspot.chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const relapseChapterText = relapsedChapterNos.length ? compactChapterNoEvidence(relapsedChapterNos) : compactChapterNoEvidence(relapseBatchChapterNos)
  return {
    visible: true,
    status: 'relapsed',
    label: '恢复判定失效',
    source: 'default_five_chapter_recovery_verdict',
    summary: `恢复判定失效 -> 回到3章验证批：${relapsedFailureReasons.join('、')}在${segmentLabel}${relapseChapterText}复发，${compactChapterNoEvidence(validationChapterNos)}清零证据失效。`,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(verdict.previous_validation_chapter_nos || verdict.previousValidationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: validationChapterNos,
    relapse_batch_chapter_nos: relapseBatchChapterNos,
    relapsed_chapter_nos: relapsedChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      risk_count: counts.riskCount,
      core_risk_count: counts.coreRiskCount,
      payoff_debt_count: counts.payoffDebtCount,
      reader_pull_risk_count: counts.readerPullRiskCount,
    },
    failure_reasons: uniqueFailureReasons,
    cleared_failure_reasons: uniqueFailureReasons,
    relapsed_failure_reasons: relapsedFailureReasons,
    stable_failure_reasons: stableFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

