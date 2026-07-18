import { parseJsonValue } from './chapter-group'
import type {
  SafeBatchDefaultFiveChapterLaneRedesignSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot,
  SafeBatchExpansionFeedbackSnapshot,
  SafeBatchExpansionStructureDecisionTrendSnapshot,
  SafeBatchExpansionStructureRepairEffectivenessSnapshot,
  SafeBatchExpansionStructureValidationResultSnapshot,
  SafeBatchExpansionStructureValidationTrendSnapshot,
} from './drawer-model'
import {
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeEvidenceTextList,
} from './drawer-model'
import {
  buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot,
  buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot,
  buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot,
  buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot,
  buildSafeBatchDefaultFiveChapterRegressionSnapshot,
  buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot,
} from './drawer-snapshots-lane'

function safeBatchExpansionFeedbackLabel(status: SafeBatchExpansionFeedbackSnapshot['status'], fallback: string) {
  if (status === 'recovered' || status === 'passed') return '扩批热区已清'
  if (status === 'rollback_to_small_batch' || status === 'rollback_to_single_chapter') return '扩批热区待修'
  return fallback || '扩批反馈'
}

function buildSafeBatchExpansionStructureValidationTrendSnapshot(trendLike: any): SafeBatchExpansionStructureValidationTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const rawStatus = String(trend?.status || '').trim()
  const rawLatestStatus = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = rawLatestStatus === 'ok' || rawLatestStatus === 'warn' ? rawLatestStatus : 'none'
  const failureReasons = (Array.isArray(trend?.failure_reasons)
    ? trend.failure_reasons
    : Array.isArray(trend?.failureReasons)
      ? trend.failureReasons
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || ''),
    count: Number(item?.count || 0),
  })).filter((item: any) => item.label && item.count > 0)
  const recurrence = trend?.recurrence_after_restore || trend?.recurrenceAfterRestore || {}
  const recurrenceChapterNos = (Array.isArray(recurrence?.recurrence_chapter_nos)
    ? recurrence.recurrence_chapter_nos
    : Array.isArray(recurrence?.recurrenceChapterNos)
      ? recurrence.recurrenceChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const latestChapterNos = (Array.isArray(trend?.latest_chapter_nos)
    ? trend.latest_chapter_nos
    : Array.isArray(trend?.latestChapterNos)
      ? trend.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(trend?.label || '扩批结构验证趋势'),
    summary: compactEvidenceText(trend?.summary || '扩批结构验证趋势已沉淀。'),
    segmentKey: compactEvidenceText(trend?.segment_key || trend?.segmentKey || ''),
    segmentLabel: compactEvidenceText(trend?.segment_label || trend?.segmentLabel || '复发段位'),
    validationBatchCount: Number(trend?.validation_batch_count ?? trend?.validationBatchCount ?? 0),
    passedBatchCount: Number(trend?.passed_batch_count ?? trend?.passedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    passRate: Number(trend?.pass_rate ?? trend?.passRate ?? 0),
    latestStatus,
    latestChapterNos,
    failureReasons,
    recurrenceAfterRestore: {
      visible: Boolean(recurrence?.visible),
      intervalBatchCount: Number(recurrence?.interval_batch_count ?? recurrence?.intervalBatchCount ?? 0),
      intervalLabel: compactEvidenceText(recurrence?.interval_label || recurrence?.intervalLabel || ''),
      recurrenceChapterNos,
    },
  }
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot(trendLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const repeatedFailureReasons = (Array.isArray(trend?.repeated_failure_reasons)
    ? trend.repeated_failure_reasons
    : Array.isArray(trend?.repeatedFailureReasons)
      ? trend.repeatedFailureReasons
      : []
  ).map((item: any) => ({
    reason: compactEvidenceText(item?.reason || item?.label || item),
    count: Number(item?.count || 0),
  })).filter((item: any) => item.reason && item.count > 0)
  const snapshot = {
    visible: true,
    baselineRelapseCount: Number(trend?.baseline_relapse_count ?? trend?.baselineRelapseCount ?? 0),
    currentRelapseCount: Number(trend?.current_relapse_count ?? trend?.currentRelapseCount ?? 0),
    repeatedRelapseCount: Number(trend?.repeated_relapse_count ?? trend?.repeatedRelapseCount ?? 0),
    repeatedFailureReasons,
    recommendation: compactEvidenceText(trend?.recommendation || ''),
    summary: compactEvidenceText(trend?.summary || ''),
  }
  if (!snapshot.summary && !snapshot.repeatedFailureReasons.length && snapshot.repeatedRelapseCount <= 0) return null
  return snapshot
}

function buildSafeBatchExpansionStructureRepairEffectivenessSnapshot(effectivenessLike: any): SafeBatchExpansionStructureRepairEffectivenessSnapshot | null {
  const effectiveness = parseJsonValue(effectivenessLike) || effectivenessLike || null
  if (!effectiveness || effectiveness.visible === false) return null
  const rawStatus = String(effectiveness?.status || '').trim()

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(effectiveness?.label || '结构修复有效性'),
    summary: compactEvidenceText(effectiveness?.summary || '结构修复有效性已接入扩批反馈。'),
    sourceRunId: effectiveness?.source_run_id ?? effectiveness?.sourceRunId ?? null,
    repairedAt: compactEvidenceText(effectiveness?.repaired_at || effectiveness?.repairedAt || ''),
    segmentKey: compactEvidenceText(effectiveness?.segment_key || effectiveness?.segmentKey || ''),
    segmentLabel: compactEvidenceText(effectiveness?.segment_label || effectiveness?.segmentLabel || ''),
    baselinePassRate: Number(effectiveness?.baseline_pass_rate ?? effectiveness?.baselinePassRate ?? 0),
    currentPassRate: Number(effectiveness?.current_pass_rate ?? effectiveness?.currentPassRate ?? 0),
    passRateDelta: Number(effectiveness?.pass_rate_delta ?? effectiveness?.passRateDelta ?? 0),
    baselineFailureReasonCount: Number(effectiveness?.baseline_failure_reason_count ?? effectiveness?.baselineFailureReasonCount ?? 0),
    currentFailureReasonCount: Number(effectiveness?.current_failure_reason_count ?? effectiveness?.currentFailureReasonCount ?? 0),
    failureReasonDelta: Number(effectiveness?.failure_reason_delta ?? effectiveness?.failureReasonDelta ?? 0),
    baselineRecurrenceIntervalBatchCount: Number(effectiveness?.baseline_recurrence_interval_batch_count ?? effectiveness?.baselineRecurrenceIntervalBatchCount ?? 0),
    currentRecurrenceIntervalBatchCount: Number(effectiveness?.current_recurrence_interval_batch_count ?? effectiveness?.currentRecurrenceIntervalBatchCount ?? 0),
    recommendation: compactEvidenceText(effectiveness?.recommendation || ''),
    baselineTrend: effectiveness?.baseline_trend || effectiveness?.baselineTrend || null,
    currentTrend: effectiveness?.current_trend || effectiveness?.currentTrend || null,
    defaultFiveChapterRecoveryVerdictRelapseTrend: buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot(
      effectiveness?.default_five_chapter_recovery_verdict_relapse_trend || effectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend,
    ),
  }
}

function normalizeDecisionRequirementCountList(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((item: any) => {
      const label = compactEvidenceText(item?.label || item?.key || '')
      const count = Number(item?.count || 0)
      if (!label || count <= 0) return null
      return {
        key: compactEvidenceText(item?.key || label),
        label,
        count,
      }
    })
    .filter(Boolean) as { key: string; label: string; count: number }[]
}

function buildSafeBatchDefaultFiveChapterLaneRedesignSnapshot(
  redesignLike: any,
  failedRequirements: { key: string; label: string; count: number }[],
): SafeBatchDefaultFiveChapterLaneRedesignSnapshot | null {
  const redesign = parseJsonValue(redesignLike) || redesignLike || null
  if (redesign?.visible === false) return null
  const defaultLaneFailedRequirements = failedRequirements.filter(item => isDefaultFiveChapterLaneRequirementKey(item.key))
  const explicitMissedRequirements = normalizeDecisionRequirementCountList(
    redesign?.missed_requirements || redesign?.missedRequirements,
  )
  const missedRequirements = explicitMissedRequirements.length
    ? explicitMissedRequirements
    : defaultLaneFailedRequirements
  if (!redesign && !missedRequirements.length) return null
  const repeatedFailureReasons = normalizeEvidenceTextList(
    redesign?.repeated_failure_reasons || redesign?.repeatedFailureReasons,
  )
  const missedRequirementText = missedRequirements.map(item => item.label).join('、')
  const relapseCount = Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0)
  const summary = compactEvidenceText(redesign?.summary || (
    missedRequirementText
      ? `默认5章档位模板漏项：${missedRequirementText}。`
      : '默认5章档位结构重构需要补齐模板回执。'
  ))

  return {
    visible: true,
    label: compactEvidenceText(redesign?.label || '默认档位模板漏项'),
    reason: compactEvidenceText(redesign?.reason || ''),
    relapseCount: Number.isFinite(relapseCount) ? relapseCount : 0,
    repeatedFailureReasons,
    missedRequirements,
    summary,
  }
}

function buildSafeBatchExpansionStructureDecisionTrendSnapshot(trendLike: any): SafeBatchExpansionStructureDecisionTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const rawStatus = String(trend?.status || '').trim()
  const rawLatestStatus = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = rawLatestStatus === 'ok' || rawLatestStatus === 'warn' ? rawLatestStatus : 'none'
  const latestChapterNos = (Array.isArray(trend?.latest_chapter_nos)
    ? trend.latest_chapter_nos
    : Array.isArray(trend?.latestChapterNos)
      ? trend.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const normalizeCount = (source: any) => {
    if (!source) return null
    const label = compactEvidenceText(source?.label || source?.key || '')
    const count = Number(source?.count || 0)
    if (!label || count <= 0) return null
    return {
      key: compactEvidenceText(source?.key || label),
      label,
      count,
    }
  }
  const failedRequirements = normalizeDecisionRequirementCountList(trend?.failed_requirements || trend?.failedRequirements)
  const topFailedRequirement = normalizeCount(trend?.top_failed_requirement || trend?.topFailedRequirement)
  const fallbackFailedRequirements = failedRequirements.length
    ? failedRequirements
    : topFailedRequirement
      ? [topFailedRequirement]
      : []

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(trend?.label || '扩批结构决策执行趋势'),
    summary: compactEvidenceText(trend?.summary || '扩批结构决策执行趋势已沉淀。'),
    totalBatchCount: Number(trend?.total_batch_count ?? trend?.totalBatchCount ?? 0),
    passedBatchCount: Number(trend?.passed_batch_count ?? trend?.passedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    latestStatus,
    latestBatchCreatedAt: compactEvidenceText(trend?.latest_batch_created_at || trend?.latestBatchCreatedAt || ''),
    latestChapterNos,
    latestSegmentKey: compactEvidenceText(trend?.latest_segment_key || trend?.latestSegmentKey || ''),
    latestSegmentLabel: compactEvidenceText(trend?.latest_segment_label || trend?.latestSegmentLabel || ''),
    topFailedRecommendation: normalizeCount(trend?.top_failed_recommendation || trend?.topFailedRecommendation),
    topFailedRequirement,
    failedRequirements: fallbackFailedRequirements,
    topFailedSegment: normalizeCount(trend?.top_failed_segment || trend?.topFailedSegment),
    defaultFiveChapterLaneRedesign: buildSafeBatchDefaultFiveChapterLaneRedesignSnapshot(
      trend?.default_five_chapter_lane_redesign || trend?.defaultFiveChapterLaneRedesign,
      fallbackFailedRequirements,
    ),
    suggestedTargetChapterCount: Number(trend?.suggested_target_chapter_count ?? trend?.suggestedTargetChapterCount ?? 0),
  }
}

function buildSafeBatchExpansionStructureValidationResultSnapshot(resultLike: any): SafeBatchExpansionStructureValidationResultSnapshot | null {
  const result = parseJsonValue(resultLike) || resultLike || null
  if (!result || result.visible === false) return null
  const rawStatus = String(result?.status || '').trim()
  const validationChapterNos = (Array.isArray(result?.validation_chapter_nos)
    ? result.validation_chapter_nos
    : Array.isArray(result?.validationChapterNos)
      ? result.validationChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const failedChapterNos = (Array.isArray(result?.failed_chapter_nos)
    ? result.failed_chapter_nos
    : Array.isArray(result?.failedChapterNos)
      ? result.failedChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(result?.label || '扩批结构验证'),
    summary: compactEvidenceText(result?.summary || '扩批结构验证批已完成。'),
    validationChapterNos,
    failedChapterNos,
    riskCount: Number(result?.risk_count ?? result?.riskCount ?? 0),
    defaultFiveChapterRecoveryVerdict: buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot(
      result?.default_five_chapter_recovery_verdict || result?.defaultFiveChapterRecoveryVerdict,
    ),
    defaultFiveChapterLaneTemplateVerdict: buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot(
      result?.default_five_chapter_lane_template_verdict || result?.defaultFiveChapterLaneTemplateVerdict,
    ),
  }
}

export function buildSafeBatchExpansionFeedbackSnapshot(feedbackLike: any): SafeBatchExpansionFeedbackSnapshot | null {
  const feedback = parseJsonValue(feedbackLike) || feedbackLike || null
  if (!feedback || feedback.visible === false) return null
  const rawStatus = String(feedback?.status || '').trim()
  const status = ([
    'passed',
    'recovered',
    'rollback_to_small_batch',
    'rollback_to_single_chapter',
  ].includes(rawStatus) ? rawStatus : 'none') as SafeBatchExpansionFeedbackSnapshot['status']
  const latestChapterNos = (Array.isArray(feedback?.latest_chapter_nos)
    ? feedback.latest_chapter_nos
    : Array.isArray(feedback?.latestChapterNos)
      ? feedback.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status,
    label: safeBatchExpansionFeedbackLabel(status, compactEvidenceText(feedback?.label || '扩批反馈')),
    summary: compactEvidenceText(feedback?.summary || '扩批反馈已写入安全连写策略。'),
    targetChapterCount: Number(feedback?.target_chapter_count ?? feedback?.targetChapterCount ?? 0),
    latestBatchCreatedAt: compactEvidenceText(feedback?.latest_batch_created_at || feedback?.latestBatchCreatedAt || ''),
    latestChapterNos,
    riskCount: Number(feedback?.risk_count ?? feedback?.riskCount ?? 0),
    stablePassStreak: Number(feedback?.stable_pass_streak ?? feedback?.stablePassStreak ?? 0),
    recentExpandedBatchCount: Number(feedback?.recent_expanded_batch_count ?? feedback?.recentExpandedBatchCount ?? 0),
    repeatedHotspotSegment: feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment ? {
      key: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.key || ''),
      label: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.label || ''),
      count: Number((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.count || 0),
      summary: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.summary || ''),
    } : null,
    structureValidationTrend: buildSafeBatchExpansionStructureValidationTrendSnapshot(
      feedback?.expansion_structure_validation_trend || feedback?.expansionStructureValidationTrend,
    ),
    structureValidationResult: buildSafeBatchExpansionStructureValidationResultSnapshot(
      feedback?.expansion_structure_validation_result || feedback?.expansionStructureValidationResult,
    ),
    structureRepairEffectiveness: buildSafeBatchExpansionStructureRepairEffectivenessSnapshot(
      feedback?.expansion_structure_repair_effectiveness || feedback?.expansionStructureRepairEffectiveness,
    ),
    structureDecisionTrend: buildSafeBatchExpansionStructureDecisionTrendSnapshot(
      feedback?.expansion_structure_decision_trend || feedback?.expansionStructureDecisionTrend,
    ),
    defaultFiveChapterLaneTemplateStabilityProfile: buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot(
      feedback?.default_five_chapter_lane_template_stability_profile || feedback?.defaultFiveChapterLaneTemplateStabilityProfile,
    ),
    recoveryRestoreStabilityEvidence: buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot(
      feedback?.recovery_restore_stability_evidence || feedback?.recoveryRestoreStabilityEvidence,
    ),
    defaultFiveChapterRegression: buildSafeBatchDefaultFiveChapterRegressionSnapshot(
      feedback?.default_five_chapter_regression || feedback?.defaultFiveChapterRegression,
    ),
    defaultFiveChapterRecoveryVerdictRelapse: buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot(
      feedback?.default_five_chapter_recovery_verdict_relapse || feedback?.defaultFiveChapterRecoveryVerdictRelapse,
    ),
  }
}

