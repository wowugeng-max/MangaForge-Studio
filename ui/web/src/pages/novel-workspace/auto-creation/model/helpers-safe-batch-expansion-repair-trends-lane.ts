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

import {
  defaultFiveChapterRecoveryVerdictFromSource,
  safeBatchDefaultFiveChapterRecoveryVerdictRelapse,
} from './helpers-safe-batch-expansion-repair-trends-core'

export function defaultFiveChapterLaneTemplateVersionFromLane(lane: AnyRecord | null | undefined) {
  if (!lane) return null
  const rawVersion = lane.latest_template_version_profile
    || lane.latestTemplateVersionProfile
    || lane.template_version
    || lane.templateVersion
    || null
  const normalizedProfile = latestDefaultFiveChapterLaneTemplateVersionProfile({ latest_template_version_profile: rawVersion })
  const normalizedTemplate = normalizeDefaultFiveChapterLaneTemplateVersion(rawVersion)
  const explicitId = firstText(lane.template_version_id, lane.templateVersionId)
  const version = normalizedProfile || normalizedTemplate || null
  const id = explicitId || text(version?.id)
  if (!id && !version) return null
  return {
    ...(version || {}),
    id: id || text(version?.id),
    label: firstText(version?.label, '默认5章档位模板版本'),
  }
}

export function defaultFiveChapterLaneTemplateRequirementForFailureReason(reason: string) {
  if (reason === '核心偏移') {
    return {
      key: 'default_lane_segment_duty',
      label: '默认档位段位职责',
      failure_reason: reason,
    }
  }
  if (reason === '回报欠账') {
    return {
      key: 'default_lane_payoff_density',
      label: '回报密度',
      failure_reason: reason,
    }
  }
  if (reason === '追读拉力') {
    return {
      key: 'default_lane_ending_hook_template',
      label: '章末追读模板',
      failure_reason: reason,
    }
  }
  return {
    key: 'default_lane_conflict_rotation',
    label: '冲突轮换',
    failure_reason: reason,
  }
}

export function defaultFiveChapterLaneTemplateRequirementsForFailureReasons(reasons: string[]) {
  const byKey = new Map<string, AnyRecord>()
  reasons.forEach(reason => {
    const requirement = defaultFiveChapterLaneTemplateRequirementForFailureReason(reason)
    byKey.set(requirement.key, requirement)
  })
  return Array.from(byKey.values())
}

export function safeBatchDefaultFiveChapterRegression(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || text(evaluation.source) !== 'auto_creation_safe_batch') return null
  const lane = evaluation.defaultFiveChapterLane || null
  if (!lane || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const defaultReady = lane.default_five_chapter_ready ?? lane.defaultFiveChapterReady
  if (defaultReady === false || text(lane.status) !== 'ready') return null
  const defaultBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(lane.restore_chapter_nos || lane.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(lane.validation_chapter_nos || lane.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const hotspot = evaluation.topHotspot || {}
  const failureReasons = [
    Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0) > 0 ? '核心偏移' : '',
    Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0) > 0 ? '回报欠账' : '',
    Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0) > 0 ? '追读拉力' : '',
  ].filter(Boolean)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const stablePassStreak = Number(lane.stable_pass_streak ?? lane.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane.required_stable_pass_streak ?? lane.requiredStablePassStreak ?? 2)
  const riskText = failureReasons.length ? `失效证据：${failureReasons.join('、')}。` : '核心/回报/追读证据失效。'
  const defaultRecoveryVerdictRelapse = safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation)
  const templateVersion = defaultFiveChapterLaneTemplateVersionFromLane(lane)
  const templateVersionId = text(templateVersion?.id)
  const templateVersionFailedRequirements = defaultFiveChapterLaneTemplateRequirementsForFailureReasons(failureReasons)
  const templateVersionText = templateVersionId ? `版本 ${templateVersionId} ` : ''

  return {
    visible: true,
    status: 'regressed',
    label: '默认5章档位回退原因',
    source: 'default_five_chapter_lane',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    default_five_chapter_ready: false,
    default_batch_created_at: text(evaluation.latestBatchCreatedAt),
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      count: 1,
      chapter_nos: arrayValue(hotspot.chapterNos || hotspot.chapter_nos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
      risk_count: Number(hotspot.riskCount || hotspot.risk_count || 0),
      core_risk_count: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
      payoff_debt_count: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
      reader_pull_risk_count: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
      summary: text(hotspot.summary),
    },
    failure_reasons: failureReasons,
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    ...(templateVersion ? { template_version: templateVersion } : {}),
    ...(templateVersionFailedRequirements.length ? {
      template_version_failed_requirements: templateVersionFailedRequirements,
    } : {}),
    summary: defaultRecoveryVerdictRelapse
      ? `${defaultRecoveryVerdictRelapse.summary} ${templateVersionText}默认5章档位在${segmentLabel}复发，先回到扩批结构修复层。`
      : `默认5章档位回退原因：连续 ${stablePassStreak} 批恢复稳定后，${compactChapterNoEvidence(defaultBatchChapterNos)}${templateVersionText}默认档位在${segmentLabel}复发，${riskText}先回到3章验证批或扩批结构修复层。`,
    ...(defaultRecoveryVerdictRelapse ? {
      default_five_chapter_recovery_verdict_relapse: defaultRecoveryVerdictRelapse,
    } : {}),
  }
}

export function latestDefaultFiveChapterLaneTemplateVersionProfile(profileLike: AnyRecord | null | undefined) {
  const profile = profileLike?.latest_template_version_profile
    || profileLike?.latestTemplateVersionProfile
    || null
  if (!profile || profile.visible === false) return null
  const id = firstText(profile.id, profile.template_version_id, profile.templateVersionId, profile.version_id, profile.versionId)
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? profileLike?.required_pass_streak ?? profileLike?.requiredPassStreak ?? 2)
  const latestStatus = firstText(profile.latest_status, profile.latestStatus)
  const status = firstText(profile.status)
  if (!id && !status && !latestStatus && passStreak <= 0) return null
  return {
    ...profile,
    id,
    label: firstText(profile.label, '默认5章档位模板版本'),
    status,
    latest_status: latestStatus,
    pass_streak: Number.isFinite(passStreak) ? passStreak : 0,
    required_pass_streak: Number.isFinite(requiredPassStreak) && requiredPassStreak > 0 ? requiredPassStreak : 2,
  }
}

export function defaultFiveChapterLaneTemplateVersionReady(profile: AnyRecord | null | undefined) {
  if (!profile) return true
  const status = text(profile.status)
  const latestStatus = text(profile.latest_status || profile.latestStatus)
  if (['relapsed', 'redesign'].includes(status) || latestStatus === 'failed') return false
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? 2)
  if (status === 'ready') return true
  return passStreak >= Math.max(1, Number.isFinite(requiredPassStreak) ? requiredPassStreak : 2)
}

export function buildSafeBatchRecoveryRestoreStabilityLane(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded' || Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0) < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const evidence = feedback?.recoveryRestoreStabilityEvidence
    || feedback?.recovery_restore_stability_evidence
    || null
  const templateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = latestDefaultFiveChapterLaneTemplateVersionProfile(templateStabilityProfile)
  const templateVersionReady = defaultFiveChapterLaneTemplateVersionReady(latestTemplateVersionProfile)
  const validationResult = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evidence)
    || defaultFiveChapterRecoveryVerdictFromSource(validationResult)
    || null
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  if (!evidence || text(evidence.status) !== 'passed' || stablePassStreak <= 0) return null
  const restoreChapterNos = arrayValue(evidence.restore_chapter_nos || evidence.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(evidence.validation_chapter_nos || evidence.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const requiredStablePassStreak = 2
  const restoreStableReady = stablePassStreak >= requiredStablePassStreak
  const defaultReady = restoreStableReady && templateVersionReady
  const templateVersionId = text(latestTemplateVersionProfile?.id)
  const templateVersionPassText = latestTemplateVersionProfile
    ? `模板版本 ${templateVersionId || text(latestTemplateVersionProfile.label, '当前版本')} 连过 ${Number(latestTemplateVersionProfile.pass_streak || 0)}/${Number(latestTemplateVersionProfile.required_pass_streak || 2)}`
    : ''
  const summary = defaultReady
    ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，${templateVersionPassText ? `${templateVersionPassText}，` : ''}${compactChapterNoEvidence(restoreChapterNos)}已可作为默认5章档位证据。`
    : restoreStableReady && latestTemplateVersionProfile
      ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，但当前${templateVersionPassText}；继续5章观察批，确认当前模板版本不复发后再把5章连写设为默认档位。`
      : `恢复5章扩批已稳定 ${stablePassStreak}/${requiredStablePassStreak} 批，${compactChapterNoEvidence(restoreChapterNos)}通过后仍需继续观察 1-2 批，再把5章连写设为默认档位。`
  const label = defaultReady ? '默认5章档位' : '5章观察批'
  return {
    visible: true,
    status: defaultReady ? 'ready' : 'observing',
    label,
    source: 'recovery_restore_stability_evidence',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: requiredStablePassStreak,
    default_five_chapter_ready: defaultReady,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    summary,
    task_center_filter_label: templateVersionId
      ? `批次复盘筛选：${label} / 当前模板版本 ${templateVersionId}`
      : `批次复盘筛选：${label}`,
    ...(latestTemplateVersionProfile ? {
      latest_template_version_profile: latestTemplateVersionProfile,
    } : {}),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function latestProductionRelapseVerdictFromExpansionPolicy(policy: AnyRecord | null | undefined) {
  const feedback = policy?.expansionFeedback || policy?.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const templateVerdict = validation?.defaultFiveChapterLaneTemplateVerdict
    || validation?.default_five_chapter_lane_template_verdict
    || null
  const productionRelapseVerdict = templateVerdict?.productionRelapseVerdict
    || templateVerdict?.production_relapse_verdict
    || null
  if (productionRelapseVerdict?.visible === false) return null
  const hasProductionRelapseEvidence = Boolean(
    text(productionRelapseVerdict?.template_version_id || productionRelapseVerdict?.templateVersionId)
    || arrayValue(productionRelapseVerdict?.failure_reasons || productionRelapseVerdict?.failureReasons).length
    || arrayValue(productionRelapseVerdict?.default_batch_chapter_nos || productionRelapseVerdict?.defaultBatchChapterNos).length
    || arrayValue(productionRelapseVerdict?.restore_chapter_nos || productionRelapseVerdict?.restoreChapterNos).length
  )
  return hasProductionRelapseEvidence ? productionRelapseVerdict : null
}

export function productionRelapseReviewCtaPayload(cta: AnyRecord) {
  return {
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    remaining_failure_reasons: arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons).map(item => text(item)).filter(Boolean),
    cleared_failure_reasons: arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons).map(item => text(item)).filter(Boolean),
    production_relapse_verdict: cta.production_relapse_verdict || cta.productionRelapseVerdict || null,
  }
}

export function productionRelapseCtaExecutionPayload(cta: AnyRecord | null | undefined, source: string) {
  if (!cta) return null
  const verdict = cta.production_relapse_verdict || cta.productionRelapseVerdict || {}
  const templateVersionId = text(
    verdict.template_version_id
    || verdict.templateVersionId
    || cta.template_version_id
    || cta.templateVersionId,
  )
  const remainingFailureReasons = arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons || verdict.remaining_failure_reasons || verdict.remainingFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const clearedFailureReasons = arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons || verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  return {
    source,
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    remaining_failure_reasons: remainingFailureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    close_condition: remainingFailureReasons.length
      ? 'repair remaining_failure_reasons, then rerun production_relapse_verdict.status=passed'
      : 'production_relapse_verdict.status=passed && remaining_failure_reasons empty',
  }
}

