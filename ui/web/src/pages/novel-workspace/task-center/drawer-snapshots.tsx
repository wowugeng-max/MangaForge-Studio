import React from 'react'
import { Tag, Typography } from 'antd'
import {
  parseJsonValue,
} from './chapter-group'
import type {
  RecoveryEvidenceAuditNextAction,
  RecoveryEvidenceReviewActionFeedback,
  RecoveryEvidenceReviewRefreshAnchor,
  RecoveryEvidenceReviewRow,
  RecoveryEvidenceReviewRowAction,
  SafeBatchDefaultFiveChapterLaneRedesignSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot,
  SafeBatchDefaultFiveChapterRegressionSnapshot,
  SafeBatchExpansionFeedbackSnapshot,
  SafeBatchExpansionPolicySnapshot,
  SafeBatchExpansionStructureDecisionTrendSnapshot,
  SafeBatchExpansionStructureRepairEffectivenessSnapshot,
  SafeBatchExpansionStructureValidationResultSnapshot,
  SafeBatchExpansionStructureValidationTrendSnapshot,
  SafeBatchRecoveryFocusSnapshot,
  SafeBatchRecoveryRestoreStabilityEvidenceSnapshot,
  SafeBatchRecoveryRestoreStabilityLaneSnapshot,
  SafeBatchRecoveryRoadmapNodeSnapshot,
  SafeBatchRecoveryRoadmapSnapshot,
  SafeBatchRecoveryValidationReviewCtaSnapshot,
  SafeBatchRecoveryValidationSnapshot,
  StrengthenedRepairAcceptanceTrendSnapshot,
} from './drawer-model'
import {
  BatchPlanReviewPreview,
  DeliveryRiskReviewPreview,
  NextChapterQualityPlanPreview,
  RecoveryEvidenceRegovernancePreview,
  RecoveryEvidenceReviewPreview,
  SafeBatchExpansionSegmentPreview,
  buildDefaultLaneRepairTaskTags,
  buildPostBatchQualityCheckSummary,
  buildProductionRelapseCtaExecutionSnapshot,
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRepairClosureHighlights,
  compactAuditList,
  compactChapterNos,
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeChapterNos,
  normalizeEvidenceTextList,
  recoveryEvidenceRegovernanceQueueOfTask,
  recoveryEvidenceTaskSourceMeta,
  repairTaskActionLabel,
  repairTaskIssueTag,
  repairTaskStatusTag,
  runTypeLabel,
  safeBatchRecoveryFocusMatchesTask,
  statusTag,
} from './drawer-model'

const { Text, Paragraph } = Typography

export type RecoveryEvidenceSourceRiskProfileSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  totalFailureCount: number
  repeatSourceCount: number
  strengthenedAcceptanceTrend: StrengthenedRepairAcceptanceTrendSnapshot | null
  sources: {
    source: string
    label: string
    releaseFailureCount: number
    trendLabel: string
    evidence: string[]
    deepRepairDirection: string
    deepRepairEffect: {
      status: 'none' | 'pending' | 'observing' | 'recurred'
      label: string
      summary: string
      latestRepairRunId: any | null
      latestRepairActionLabel: string
      latestRepairAt: string
      postRepairFailureCount: number
      postRepairEvidence: string[]
      strengthenedClosure: {
        status: 'not_required' | 'needs_repair' | 'pending_recheck' | 'converged' | 'recurred'
        label: string
        summary: string
        latestRepairRunId: any | null
        latestRepairAt: string
        postRepairFailureCount: number
        postRepairEvidence: string[]
      }
    }
  }[]
}

function buildSafeBatchRecoveryRoadmapSnapshot(roadmapLike: any): SafeBatchRecoveryRoadmapSnapshot | null {
  const roadmap = parseJsonValue(roadmapLike) || roadmapLike || null
  if (!roadmap || roadmap.visible === false) return null
  const focusMap: Record<string, Partial<SafeBatchRecoveryFocusSnapshot>> = {
    strengthened_acceptance: {
      targetView: 'recovery_review',
      issueType: 'strengthened_repair_acceptance_mismatch',
      source: 'strengthened_repair_acceptance_trend',
      taskCenterFilterLabel: '强化复盘',
    },
    expansion_feedback: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_segment_hotspot',
      source: 'safe_batch_expansion_feedback',
      taskCenterFilterLabel: '扩批分段',
    },
    structure_validation: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_validation',
      taskCenterFilterLabel: '扩批结构',
    },
    structure_repair_effectiveness: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_repair_effectiveness',
      taskCenterFilterLabel: '扩批结构',
    },
    structure_decision_execution: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskCenterFilterLabel: '扩批结构决策',
    },
    default_lane_template_version: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'default_five_chapter_lane_template_stability_profile',
      taskCenterFilterLabel: '当前模板版本',
      requirementKey: 'default_lane_template',
    },
  }
  const normalizeStatus = (value: any): SafeBatchRecoveryRoadmapNodeSnapshot['status'] => {
    const status = String(value || '').trim()
    if (status === 'ok' || status === 'warn' || status === 'pending') return status
    return 'pending'
  }
  const normalizeFocus = (focusLike: any, nodeKey = '', nodeLabel = '', nodeActionLabel = ''): SafeBatchRecoveryFocusSnapshot | null => {
    const focus = parseJsonValue(focusLike) || focusLike || null
    const key = compactEvidenceText(focus?.layer_key || focus?.layerKey || nodeKey)
    const fallback = focusMap[key] || null
    if (!focus && !fallback) return null
    const layerLabel = compactEvidenceText(focus?.layer_label || focus?.layerLabel || nodeLabel)
    const actionLabel = compactEvidenceText(focus?.action_label || focus?.actionLabel || nodeActionLabel || layerLabel)
    const targetView = compactEvidenceText(focus?.target_view || focus?.targetView || fallback?.targetView || '')
    const issueType = compactEvidenceText(focus?.issue_type || focus?.issueType || fallback?.issueType || '')
    if (!key || !targetView && !issueType) return null
    const statuses = Array.isArray(focus?.task_statuses)
      ? focus.task_statuses
      : Array.isArray(focus?.taskStatuses)
        ? focus.taskStatuses
        : []
    return {
      layerKey: key,
      layerLabel,
      actionLabel,
      targetView,
      issueType,
      source: compactEvidenceText(focus?.source || fallback?.source || 'safe_batch_recovery_roadmap'),
      taskStatuses: statuses.map((item: any) => compactEvidenceText(item)).filter(Boolean),
      taskCenterFilterLabel: compactEvidenceText(focus?.task_center_filter_label || focus?.taskCenterFilterLabel || fallback?.taskCenterFilterLabel || layerLabel),
      requirementKey: compactEvidenceText(focus?.requirement_key || focus?.requirementKey || fallback?.requirementKey || ''),
      templateVersionId: compactEvidenceText(focus?.template_version_id || focus?.templateVersionId || ''),
    }
  }
  const normalizeNode = (node: any): SafeBatchRecoveryRoadmapNodeSnapshot | null => {
    if (!node) return null
    const key = compactEvidenceText(node?.key || '')
    const label = compactEvidenceText(node?.label || key)
    if (!key || !label) return null
    const actionLabel = compactEvidenceText(node?.action_label || node?.actionLabel || '')
    return {
      key,
      label,
      status: normalizeStatus(node?.status),
      targetChapterCount: Number(node?.target_chapter_count ?? node?.targetChapterCount ?? 0),
      detail: compactEvidenceText(node?.detail || ''),
      actionLabel,
      focus: normalizeFocus(node?.focus, key, label, actionLabel),
    }
  }
  const routeNodes = (Array.isArray(roadmap?.route_nodes)
    ? roadmap.route_nodes
    : Array.isArray(roadmap?.routeNodes)
      ? roadmap.routeNodes
      : []
  ).map(normalizeNode).filter(Boolean) as SafeBatchRecoveryRoadmapNodeSnapshot[]
  const nextRepairLayer = normalizeNode(roadmap?.next_repair_layer || roadmap?.nextRepairLayer)
  const recommendedFocus = normalizeFocus(roadmap?.recommended_focus || roadmap?.recommendedFocus)
    || (nextRepairLayer?.status === 'warn' ? nextRepairLayer.focus : null)

  return {
    visible: true,
    label: compactEvidenceText(roadmap?.label || '安全连写恢复路线图'),
    currentLane: compactEvidenceText(roadmap?.current_lane || roadmap?.currentLane || ''),
    currentLaneLabel: compactEvidenceText(roadmap?.current_lane_label || roadmap?.currentLaneLabel || ''),
    currentTargetChapterCount: Number(roadmap?.current_target_chapter_count ?? roadmap?.currentTargetChapterCount ?? 0),
    currentStatus: compactEvidenceText(roadmap?.current_status || roadmap?.currentStatus || ''),
    currentReason: compactEvidenceText(roadmap?.current_reason || roadmap?.currentReason || ''),
    recommendedFocus,
    nextRepairLayer,
    routeNodes,
  }
}

export function buildSafeBatchExpansionPolicySnapshot(batchPreflight: any): SafeBatchExpansionPolicySnapshot | null {
  const policy = parseJsonValue(
    batchPreflight?.safe_batch_expansion_policy
      || batchPreflight?.safeBatchExpansionPolicy,
  ) || batchPreflight?.safe_batch_expansion_policy || batchPreflight?.safeBatchExpansionPolicy || null
  if (!policy) return null
  const targetChapterCount = Number(policy?.target_chapter_count ?? policy?.targetChapterCount ?? 0)
  if (!Number.isFinite(targetChapterCount) || targetChapterCount <= 0) return null
  const rawStatus = String(policy?.status || '').trim()
  const status = rawStatus === 'expanded' ? 'expanded' : rawStatus === 'recovering' ? 'recovering' : 'observing'
  const latestStatusText = String(policy?.latest_status || policy?.latestStatus || '').trim()
  const latestStatus = latestStatusText === 'ok' || latestStatusText === 'warn' ? latestStatusText : 'none'
  const expandedChapterCount = Number(policy?.expanded_chapter_count ?? policy?.expandedChapterCount ?? targetChapterCount)
  const expansionFeedback = buildSafeBatchExpansionFeedbackSnapshot(policy?.expansion_feedback || policy?.expansionFeedback)
  const recoveryRoadmap = buildSafeBatchRecoveryRoadmapSnapshot(policy?.safe_batch_recovery_roadmap || policy?.safeBatchRecoveryRoadmap || policy?.recoveryRoadmap)
  const recoveryRestoreStabilityLane = buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
    batchPreflight?.safe_batch_recovery_restore_stability_lane
      || batchPreflight?.safeBatchRecoveryRestoreStabilityLane
      || policy?.safe_batch_recovery_restore_stability_lane
      || policy?.safeBatchRecoveryRestoreStabilityLane,
    expansionFeedback?.recoveryRestoreStabilityEvidence || null,
  )

  return {
    visible: true,
    status,
    label: compactEvidenceText(policy?.label || '强化扩批规则'),
    summary: compactEvidenceText(policy?.summary || '按强化恢复验收趋势决定是否扩大安全连写批次。'),
    targetChapterCount,
    baseChapterCount: Number(policy?.base_chapter_count ?? policy?.baseChapterCount ?? 3),
    expandedChapterCount,
    requiredPassStreak: Number(policy?.required_pass_streak ?? policy?.requiredPassStreak ?? 3),
    passStreak: Number(policy?.pass_streak ?? policy?.passStreak ?? 0),
    acceptedBatchCount: Number(policy?.accepted_batch_count ?? policy?.acceptedBatchCount ?? 0),
    failedBatchCount: Number(policy?.failed_batch_count ?? policy?.failedBatchCount ?? 0),
    latestStatus,
    expansionFeedback,
    recoveryRoadmap,
    recoveryValidation: buildSafeBatchRecoveryValidationSnapshot(expansionFeedback, recoveryRoadmap, expandedChapterCount, recoveryRestoreStabilityLane),
    recoveryRestoreStabilityLane,
  }
}

function buildSafeBatchRecoveryValidationSnapshot(
  expansionFeedback: SafeBatchExpansionFeedbackSnapshot | null,
  recoveryRoadmap: SafeBatchRecoveryRoadmapSnapshot | null,
  expandedChapterCount: number,
  recoveryRestoreStabilityLane: SafeBatchRecoveryRestoreStabilityLaneSnapshot | null = null,
): SafeBatchRecoveryValidationSnapshot | null {
  const result = expansionFeedback?.structureValidationResult || null
  if (!result?.visible) return null
  const passed = result.status === 'ok' && result.riskCount <= 0
  const focus = passed ? null : recoveryRoadmap?.recommendedFocus || recoveryRoadmap?.nextRepairLayer?.focus || null
  const repairLabel = compactEvidenceText(focus?.actionLabel || recoveryRoadmap?.nextRepairLayer?.actionLabel || focus?.taskCenterFilterLabel || '下一层修复')
  const productionRelapseVerdict = result.defaultFiveChapterLaneTemplateVerdict?.productionRelapseVerdict || null
  const reviewCta = buildProductionRelapseRecoveryValidationCta({
    passed,
    productionRelapseVerdict,
    recoveryRestoreStabilityLane,
    fallbackFocus: focus,
    fallbackTargetChapterCount: passed
      ? Math.max(5, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || expandedChapterCount || 5)
      : Math.max(1, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || 3),
  })

  return {
    visible: true,
    status: passed ? 'passed' : 'failed',
    label: passed ? '3章验证批通过' : '3章验证批未过',
    summary: result.summary,
    validationChapterNos: result.validationChapterNos,
    failedChapterNos: result.failedChapterNos,
    riskCount: result.riskCount,
    targetChapterCount: passed
      ? Math.max(5, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || expandedChapterCount || 5)
      : Math.max(1, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || 3),
    nextActionKind: passed ? 'confirm_restore_five' : 'focus_repair',
    nextActionLabel: reviewCta?.label || (passed ? '确认恢复5章扩批' : `聚焦${repairLabel}`),
    reviewCta,
    focus,
    defaultFiveChapterRecoveryVerdict: result.defaultFiveChapterRecoveryVerdict || null,
    defaultFiveChapterLaneTemplateVerdict: result.defaultFiveChapterLaneTemplateVerdict || null,
  }
}

function buildProductionRelapseRecoveryValidationCta(args: {
  passed: boolean
  productionRelapseVerdict: SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null
  recoveryRestoreStabilityLane: SafeBatchRecoveryRestoreStabilityLaneSnapshot | null
  fallbackFocus: SafeBatchRecoveryFocusSnapshot | null
  fallbackTargetChapterCount: number
}): SafeBatchRecoveryValidationReviewCtaSnapshot | null {
  const verdict = args.productionRelapseVerdict
  if (!verdict) return null
  if (args.passed && verdict.status === 'passed') {
    const readyForDefault = Boolean(args.recoveryRestoreStabilityLane?.defaultFiveChapterReady)
    const label = readyForDefault ? '恢复默认5章档位' : '进入5章观察批'
    return {
      kind: readyForDefault ? 'restore_default_lane' : 'enter_five_chapter_observation',
      label,
      summary: readyForDefault
        ? `生产后验已修复：${verdict.clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，可恢复默认5章档位。`
        : `生产后验已修复：${verdict.clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，先进入5章观察批确认默认档位稳定。`,
      targetChapterCount: Math.max(5, Number(args.recoveryRestoreStabilityLane?.stablePassStreak || 0) > 0 ? 5 : args.fallbackTargetChapterCount || 5),
      remainingFailureReasons: verdict.remainingFailureReasons,
      clearedFailureReasons: verdict.clearedFailureReasons,
      focus: null,
    }
  }
  if (!args.passed && verdict.status === 'failed') {
    return {
      kind: 'repair_production_relapse',
      label: '修生产后验',
      summary: `生产后验验证批仍复发：${verdict.remainingFailureReasons.join('、') || '真实生产失败维度'}；下一张修复任务只携带 remaining_failure_reasons，继续重修当前模板版本。`,
      targetChapterCount: Math.max(1, args.fallbackTargetChapterCount || 3),
      remainingFailureReasons: verdict.remainingFailureReasons,
      clearedFailureReasons: verdict.clearedFailureReasons,
      focus: args.fallbackFocus,
    }
  }
  return null
}

function safeBatchExpansionFeedbackLabel(status: SafeBatchExpansionFeedbackSnapshot['status'], fallback: string) {
  if (status === 'recovered' || status === 'passed') return '扩批热区已清'
  if (status === 'rollback_to_small_batch' || status === 'rollback_to_single_chapter') return '扩批热区待修'
  return fallback || '扩批反馈'
}

function safeBatchExpansionFeedbackColor(status: SafeBatchExpansionFeedbackSnapshot['status']) {
  if (status === 'recovered' || status === 'passed') return 'green'
  if (status === 'rollback_to_single_chapter') return 'red'
  if (status === 'rollback_to_small_batch') return 'gold'
  return 'blue'
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

function buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(requirementsLike: any): SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[] {
  const requirements = Array.isArray(requirementsLike) ? requirementsLike : []
  return requirements
    .map((item: any) => ({
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
      chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
    }))
    .filter((item: any) => item.key || item.label || item.failureReason || item.chapterNos.length)
}

function buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const failedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.failed_requirements || verdict?.failedRequirements,
  )
  const snapshot = {
    visible: true,
    status: rawStatus === 'failed' ? 'failed' as const : 'passed' as const,
    label: compactEvidenceText(verdict?.label || '默认档位模板生产后验判定'),
    templateVersionId: compactEvidenceText(verdict?.template_version_id || verdict?.templateVersionId || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses: (Array.isArray(verdict?.failure_reason_statuses)
      ? verdict.failure_reason_statuses
      : Array.isArray(verdict?.failureReasonStatuses)
        ? verdict.failureReasonStatuses
        : []
    ).map((item: any) => {
      const statusText = compactEvidenceText(item?.status || '')
      return {
        reason: compactEvidenceText(item?.reason || ''),
        status: statusText === 'remaining' ? 'remaining' as const : 'cleared' as const,
        riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
      }
    }).filter((item: any) => item.reason),
    failedCount: Number(verdict?.failed_count ?? verdict?.failedCount ?? failedRequirements.length),
    failedRequirements,
    summary: compactEvidenceText(verdict?.summary || ''),
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failedRequirements.length) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(versionLike: any): SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null {
  const version = parseJsonValue(versionLike) || versionLike || null
  if (!version || version.visible === false) return null
  const id = compactEvidenceText(version?.id || version?.template_version_id || version?.templateVersionId || version?.version_id || version?.versionId || '')
  const snapshot = {
    id,
    label: compactEvidenceText(version?.label || '默认5章档位模板版本'),
    source: compactEvidenceText(version?.source || ''),
    redesignSource: compactEvidenceText(version?.redesign_source || version?.redesignSource || ''),
    sourceRunId: version?.source_run_id ?? version?.sourceRunId ?? null,
    summary: compactEvidenceText(version?.summary || ''),
    latestStatus: compactEvidenceText(version?.latest_status || version?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(version?.latest_batch_created_at || version?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(version?.latest_chapter_nos || version?.latestChapterNos),
    validationBatchCount: Number(version?.validation_batch_count ?? version?.validationBatchCount ?? 0),
    passedBatchCount: Number(version?.passed_batch_count ?? version?.passedBatchCount ?? 0),
    failedBatchCount: Number(version?.failed_batch_count ?? version?.failedBatchCount ?? 0),
    passStreak: Number(version?.pass_streak ?? version?.passStreak ?? 0),
    requiredPassStreak: Number(version?.required_pass_streak ?? version?.requiredPassStreak ?? 0),
    status: compactEvidenceText(version?.status || ''),
    productionValidationFailedCount: Number(version?.production_validation_failed_count ?? version?.productionValidationFailedCount ?? 0),
    latestProductionRelapseVerdict: buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
      version?.latest_production_relapse_verdict || version?.latestProductionRelapseVerdict,
    ),
  }
  if (!snapshot.id && !snapshot.summary && !snapshot.sourceRunId && !snapshot.redesignSource) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const requirements = (Array.isArray(verdict?.requirements)
    ? verdict.requirements
    : Array.isArray(verdict?.items)
      ? verdict.items
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      status: itemStatus === 'missing'
        ? 'missing' as const
        : itemStatus === 'unverified'
          ? 'unverified' as const
          : 'fulfilled' as const,
    }
  }).filter((item: any) => item.key || item.label)
  const missingRequirements = (Array.isArray(verdict?.missing_requirements)
    ? verdict.missing_requirements
    : Array.isArray(verdict?.missingRequirements)
      ? verdict.missingRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
  })).filter((item: any) => item.key || item.label || item.chapterNos.length)
  const missingCount = Number(verdict?.missing_count ?? verdict?.missingCount ?? missingRequirements.reduce((sum: number, item: any) => sum + item.chapterNos.length, 0))
  const productionRelapseVerdict = buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
    verdict?.production_relapse_verdict || verdict?.productionRelapseVerdict,
  )
  const productionFailedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.production_failed_requirements
      || verdict?.productionFailedRequirements
      || productionRelapseVerdict?.failedRequirements,
  )
  const productionFailedCount = Number(verdict?.production_failed_count ?? verdict?.productionFailedCount ?? productionRelapseVerdict?.failedCount ?? productionFailedRequirements.length)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位模板回检'),
    summary: compactEvidenceText(verdict?.summary || ''),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    requirements,
    missingCount: Number.isFinite(missingCount) ? missingCount : 0,
    missingRequirements,
    productionFailedCount: Number.isFinite(productionFailedCount) ? productionFailedCount : 0,
    productionRelapseVerdict,
    productionFailedRequirements,
    templateVersion: buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
      verdict?.template_version || verdict?.templateVersion,
    ),
  }
  if (!snapshot.summary && !snapshot.requirements.length && !snapshot.missingRequirements.length && !snapshot.productionRelapseVerdict) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot(profileLike: any): SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot | null {
  const profile = parseJsonValue(profileLike) || profileLike || null
  if (!profile || profile.visible === false) return null
  const requirements = (Array.isArray(profile?.requirements)
    ? profile.requirements
    : Array.isArray(profile?.items)
      ? profile.items
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    passedCount: Number(item?.passed_count ?? item?.passedCount ?? 0),
    failedCount: Number(item?.failed_count ?? item?.failedCount ?? 0),
    latestStatus: compactEvidenceText(item?.latest_status || item?.latestStatus || ''),
    latestMissingChapterNos: normalizeChapterNos(item?.latest_missing_chapter_nos || item?.latestMissingChapterNos),
  })).filter((item: any) => item.key || item.label || item.passedCount > 0 || item.failedCount > 0)
  const topFailedRaw = profile?.top_failed_requirement || profile?.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw ? {
    key: compactEvidenceText(topFailedRaw?.key || ''),
    label: compactEvidenceText(topFailedRaw?.label || topFailedRaw?.name || topFailedRaw?.key || ''),
    failedCount: Number(topFailedRaw?.failed_count ?? topFailedRaw?.failedCount ?? 0),
  } : null
  const templateVersionProfiles = (Array.isArray(profile?.template_version_profiles)
    ? profile.template_version_profiles
    : Array.isArray(profile?.templateVersionProfiles)
      ? profile.templateVersionProfiles
      : []
  ).map(buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot)
    .filter(Boolean) as SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot[]
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    profile?.latest_template_version_profile || profile?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status: compactEvidenceText(profile?.status || ''),
    label: compactEvidenceText(profile?.label || '默认档位模板稳定性'),
    summary: compactEvidenceText(profile?.summary || ''),
    latestStatus: compactEvidenceText(profile?.latest_status || profile?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(profile?.latest_batch_created_at || profile?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(profile?.latest_chapter_nos || profile?.latestChapterNos),
    validationBatchCount: Number(profile?.validation_batch_count ?? profile?.validationBatchCount ?? 0),
    passedBatchCount: Number(profile?.passed_batch_count ?? profile?.passedBatchCount ?? 0),
    failedBatchCount: Number(profile?.failed_batch_count ?? profile?.failedBatchCount ?? 0),
    passStreak: Number(profile?.pass_streak ?? profile?.passStreak ?? 0),
    requiredPassStreak: Number(profile?.required_pass_streak ?? profile?.requiredPassStreak ?? 0),
    recommendation: compactEvidenceText(profile?.recommendation || ''),
    failedRequirementCount: Number(profile?.failed_requirement_count ?? profile?.failedRequirementCount ?? 0),
    requirements,
    topFailedRequirement: topFailedRequirement && (topFailedRequirement.key || topFailedRequirement.label || topFailedRequirement.failedCount > 0)
      ? topFailedRequirement
      : null,
    templateVersionProfiles,
    latestTemplateVersionProfile,
  }
  if (!snapshot.summary && !snapshot.requirements.length && snapshot.validationBatchCount <= 0) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const failureReasonStatuses = (Array.isArray(verdict?.failure_reason_statuses)
    ? verdict.failure_reason_statuses
    : Array.isArray(verdict?.failureReasonStatuses)
      ? verdict.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'remaining' ? 'remaining' as const : 'cleared' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位恢复判定'),
    summary: compactEvidenceText(verdict?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot(relapseLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot | null {
  const relapse = parseJsonValue(relapseLike) || relapseLike || null
  if (!relapse || relapse.visible === false) return null
  const hotspot = relapse?.repeated_hotspot_segment || relapse?.repeatedHotspotSegment || null
  const failureReasonStatuses = (Array.isArray(relapse?.failure_reason_statuses)
    ? relapse.failure_reason_statuses
    : Array.isArray(relapse?.failureReasonStatuses)
      ? relapse.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'stable' ? 'stable' as const : 'relapsed' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(relapse?.status || 'relapsed'),
    label: compactEvidenceText(relapse?.label || '恢复判定失效'),
    source: compactEvidenceText(relapse?.source || ''),
    summary: compactEvidenceText(relapse?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(relapse?.default_batch_chapter_nos || relapse?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(relapse?.restore_chapter_nos || relapse?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(relapse?.previous_validation_chapter_nos || relapse?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(relapse?.validation_chapter_nos || relapse?.validationChapterNos),
    relapseBatchChapterNos: normalizeChapterNos(relapse?.relapse_batch_chapter_nos || relapse?.relapseBatchChapterNos),
    relapsedChapterNos: normalizeChapterNos(relapse?.relapsed_chapter_nos || relapse?.relapsedChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons: normalizeEvidenceTextList(relapse?.failure_reasons || relapse?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(relapse?.cleared_failure_reasons || relapse?.clearedFailureReasons),
    relapsedFailureReasons: normalizeEvidenceTextList(relapse?.relapsed_failure_reasons || relapse?.relapsedFailureReasons),
    stableFailureReasons: normalizeEvidenceTextList(relapse?.stable_failure_reasons || relapse?.stableFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.relapsedFailureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

function buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot(evidenceLike: any): SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null {
  const evidence = parseJsonValue(evidenceLike) || evidenceLike || null
  if (!evidence || evidence.visible === false) return null
  const restoreChapterNos = normalizeChapterNos(evidence?.restore_chapter_nos || evidence?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(evidence?.validation_chapter_nos || evidence?.validationChapterNos)
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  const snapshot = {
    status: compactEvidenceText(evidence?.status || ''),
    source: compactEvidenceText(evidence?.source || ''),
    restoredBatchCreatedAt: compactEvidenceText(evidence?.restored_batch_created_at || evidence?.restoredBatchCreatedAt || ''),
    restoreChapterNos,
    validationChapterNos,
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    summary: compactEvidenceText(evidence?.summary || ''),
  }
  if (!snapshot.status && !snapshot.source && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
  laneLike: any,
  fallbackEvidence?: SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null,
): SafeBatchRecoveryRestoreStabilityLaneSnapshot | null {
  const lane = parseJsonValue(laneLike) || laneLike || null
  if (!lane || lane.visible === false) return null
  const stablePassStreak = Number(lane?.stable_pass_streak ?? lane?.stablePassStreak ?? fallbackEvidence?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane?.required_stable_pass_streak ?? lane?.requiredStablePassStreak ?? 2)
  const normalizedStablePassStreak = Number.isFinite(stablePassStreak) ? stablePassStreak : 0
  const normalizedRequiredStablePassStreak = Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0
    ? requiredStablePassStreak
    : 2
  const rawStatus = compactEvidenceText(lane?.status || '')
  const explicitDefaultFiveChapterReady = lane?.default_five_chapter_ready ?? lane?.defaultFiveChapterReady
  const defaultFiveChapterReady = explicitDefaultFiveChapterReady === undefined || explicitDefaultFiveChapterReady === null
    ? rawStatus === 'ready' || normalizedStablePassStreak >= normalizedRequiredStablePassStreak
    : Boolean(explicitDefaultFiveChapterReady)
  const status = rawStatus || (defaultFiveChapterReady ? 'ready' : 'observing')
  const label = compactEvidenceText(lane?.label || (defaultFiveChapterReady ? '默认5章档位' : '5章观察批'))
  const restoreChapterNos = normalizeChapterNos(lane?.restore_chapter_nos || lane?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(lane?.validation_chapter_nos || lane?.validationChapterNos)
  const summary = compactEvidenceText(lane?.summary || fallbackEvidence?.summary || '')
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    lane?.latest_template_version_profile || lane?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status,
    label,
    source: compactEvidenceText(lane?.source || fallbackEvidence?.source || ''),
    stablePassStreak: normalizedStablePassStreak,
    requiredStablePassStreak: normalizedRequiredStablePassStreak,
    defaultFiveChapterReady,
    restoreChapterNos: restoreChapterNos.length ? restoreChapterNos : fallbackEvidence?.restoreChapterNos || [],
    validationChapterNos: validationChapterNos.length ? validationChapterNos : fallbackEvidence?.validationChapterNos || [],
    summary,
    taskCenterFilterLabel: compactEvidenceText(lane?.task_center_filter_label || lane?.taskCenterFilterLabel || `批次复盘筛选：${label}`),
    latestTemplateVersionProfile,
  }
  if (!snapshot.status && !snapshot.label && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRegressionSnapshot(regressionLike: any): SafeBatchDefaultFiveChapterRegressionSnapshot | null {
  const regression = parseJsonValue(regressionLike) || regressionLike || null
  if (!regression || regression.visible === false) return null
  const hotspot = regression?.repeated_hotspot_segment || regression?.repeatedHotspotSegment || null
  const stablePassStreak = Number(regression?.stable_pass_streak ?? regression?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(regression?.required_stable_pass_streak ?? regression?.requiredStablePassStreak ?? 2)
  const failureReasons = (Array.isArray(regression?.failure_reasons)
    ? regression.failure_reasons
    : Array.isArray(regression?.failureReasons)
      ? regression.failureReasons
      : []
  ).map((item: any) => compactEvidenceText(item)).filter(Boolean)
  const templateVersion = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    regression?.template_version || regression?.templateVersion,
  )
  const templateVersionId = compactEvidenceText(
    regression?.template_version_id || regression?.templateVersionId || templateVersion?.id || '',
  )
  const templateVersionFailedRequirements = (Array.isArray(regression?.template_version_failed_requirements)
    ? regression.template_version_failed_requirements
    : Array.isArray(regression?.templateVersionFailedRequirements)
      ? regression.templateVersionFailedRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.key || ''),
    failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
  })).filter((item: any) => item.key || item.label || item.failureReason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(regression?.status || ''),
    label: compactEvidenceText(regression?.label || '默认5章档位回退原因'),
    source: compactEvidenceText(regression?.source || ''),
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    requiredStablePassStreak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    defaultBatchChapterNos: normalizeChapterNos(regression?.default_batch_chapter_nos || regression?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(regression?.restore_chapter_nos || regression?.restoreChapterNos),
    validationChapterNos: normalizeChapterNos(regression?.validation_chapter_nos || regression?.validationChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons,
    templateVersionId,
    templateVersion,
    templateVersionFailedRequirements,
    summary: compactEvidenceText(regression?.summary || ''),
  }
  if (!snapshot.status && !snapshot.defaultBatchChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchExpansionFeedbackSnapshot(feedbackLike: any): SafeBatchExpansionFeedbackSnapshot | null {
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

function normalizeStrengthenedRepairAcceptanceTrend(trendLike: any): StrengthenedRepairAcceptanceTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const status = String(trend?.status || '') === 'warn' ? 'warn' : 'ok'
  const latestStatusText = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = latestStatusText === 'ok' || latestStatusText === 'warn' ? latestStatusText : 'none'
  const dimensions = trend?.dimensions || {}
  const normalizeDimension = (source: any, fallbackLabel: string) => ({
    label: compactEvidenceText(source?.label || fallbackLabel),
    failedCount: Number(source?.failed_count ?? source?.failedCount ?? 0),
  })

  return {
    visible: true,
    status,
    label: compactEvidenceText(trend?.label || '强化恢复验收趋势'),
    summary: compactEvidenceText(trend?.summary || '强化深修恢复后的核心守恒、读者回报和追读拉力趋势已沉淀。'),
    acceptedBatchCount: Number(trend?.accepted_batch_count ?? trend?.acceptedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    passStreak: Number(trend?.pass_streak ?? trend?.passStreak ?? 0),
    latestStatus,
    latestBatchLabel: compactEvidenceText(trend?.latest_batch_label || trend?.latestBatchLabel || ''),
    latestRunId: trend?.latest_run_id ?? trend?.latestRunId ?? null,
    sourceEvidence: compactAuditList(
      Array.isArray(trend?.source_evidence)
        ? trend.source_evidence
        : Array.isArray(trend?.sourceEvidence)
          ? trend.sourceEvidence
          : [],
      6,
    ),
    dimensions: {
      core: normalizeDimension(dimensions.core, '核心守恒'),
      payoff: normalizeDimension(dimensions.payoff, '读者回报'),
      readerPull: normalizeDimension(dimensions.reader_pull || dimensions.readerPull, '读者拉力'),
    },
  }
}

function recoveryEvidenceSourceDeepRepairDirection(source: string, label: string) {
  if (source === 'single_chapter_governance_recheck') {
    return '回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。'
  }
  if (source === 'safe_batch_recovery_recheck') {
    return '复盘批次任务书，把多章承诺拆回每章冲突职责、回报落点和剧情线推进，再恢复批量连写。'
  }
  if (source === 'review_governance_closure') {
    return '回到治理复查台，重新确认修后证据、观察项和关闭条件，再让后续正文承接。'
  }
  return `复查${label || '恢复依据来源'}的关闭条件，把抽象依据改成下一章可执行的事件、选择、代价和回报。`
}

function normalizeRecoveryEvidenceSourceDeepRepairEffect(effect: any, fallbackLabel: string): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect'] {
  const status = String(effect?.status || '').trim()
  const normalizedStatus = status === 'pending' || status === 'observing' || status === 'recurred' ? status : 'none'
  const defaultLabel = normalizedStatus === 'recurred'
    ? '深修后仍失效'
    : normalizedStatus === 'observing'
      ? '深修后暂无再失效'
      : normalizedStatus === 'pending'
        ? '深修待复查'
        : '未深修'
  const strengthenedClosure = normalizeRecoveryEvidenceSourceStrengthenedClosure(
    effect?.strengthened_repair_closure || effect?.strengthenedRepairClosure,
    fallbackLabel,
    normalizedStatus,
  )
  return {
    status: normalizedStatus,
    label: compactEvidenceText(effect?.label || defaultLabel),
    summary: compactEvidenceText(effect?.summary || `${fallbackLabel || '恢复依据来源'}尚未生成深层修复队列。`),
    latestRepairRunId: effect?.latest_repair_run_id ?? effect?.latestRepairRunId ?? null,
    latestRepairActionLabel: compactEvidenceText(effect?.latest_repair_action_label || effect?.latestRepairActionLabel || ''),
    latestRepairAt: compactEvidenceText(effect?.latest_repair_at || effect?.latestRepairAt || ''),
    postRepairFailureCount: Number(effect?.post_repair_failure_count ?? effect?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(effect?.post_repair_evidence) ? effect.post_repair_evidence : Array.isArray(effect?.postRepairEvidence) ? effect.postRepairEvidence : [], 4),
    strengthenedClosure,
  }
}

function normalizeRecoveryEvidenceSourceStrengthenedClosure(
  closure: any,
  fallbackLabel: string,
  effectStatus: RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['status'],
): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['strengthenedClosure'] {
  const status = String(closure?.status || '').trim()
  const normalizedStatus = status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
    ? status
    : effectStatus === 'recurred'
      ? 'needs_repair'
      : 'not_required'
  const defaultLabel = normalizedStatus === 'needs_repair'
    ? '待强化深修'
    : normalizedStatus === 'pending_recheck'
      ? '强化深修待复检'
      : normalizedStatus === 'converged'
        ? '强化深修已收敛'
        : normalizedStatus === 'recurred'
          ? '强化深修后仍复发'
          : '无需强化深修'
  const defaultSummary = normalizedStatus === 'needs_repair'
    ? `${fallbackLabel || '恢复依据来源'}普通深修后仍出现同源放行失败，需要生成强化深修复检。`
    : normalizedStatus === 'pending_recheck'
      ? `${fallbackLabel || '恢复依据来源'}强化深修任务已生成，等待执行后复检同源失败是否收敛。`
      : normalizedStatus === 'converged'
        ? `${fallbackLabel || '恢复依据来源'}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`
        : normalizedStatus === 'recurred'
          ? `${fallbackLabel || '恢复依据来源'}强化深修后仍出现同源放行失败，继续禁止放宽安全连写。`
          : `${fallbackLabel || '恢复依据来源'}尚未触发强化深修。`
  return {
    status: normalizedStatus,
    label: compactEvidenceText(closure?.label || defaultLabel),
    summary: compactEvidenceText(closure?.summary || defaultSummary),
    latestRepairRunId: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
    latestRepairAt: compactEvidenceText(closure?.latest_repair_at || closure?.latestRepairAt || ''),
    postRepairFailureCount: Number(closure?.post_repair_failure_count ?? closure?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(closure?.post_repair_evidence) ? closure.post_repair_evidence : Array.isArray(closure?.postRepairEvidence) ? closure.postRepairEvidence : [], 4),
  }
}

export function buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight: any): RecoveryEvidenceSourceRiskProfileSnapshot | null {
  const profile = parseJsonValue(
    batchPreflight?.recovery_evidence_source_risk_profile
      || batchPreflight?.recoveryEvidenceSourceRiskProfile,
  ) || batchPreflight?.recovery_evidence_source_risk_profile || batchPreflight?.recoveryEvidenceSourceRiskProfile || null
  const strengthenedAcceptanceTrend = normalizeStrengthenedRepairAcceptanceTrend(
    batchPreflight?.strengthened_repair_acceptance_trend
      || batchPreflight?.strengthenedRepairAcceptanceTrend,
  )
  const sources = [
    ...(Array.isArray(profile?.sources) ? profile.sources : []),
  ].map((item: any) => {
    const source = String(item?.source || item?.sourceMode || '').trim()
    const label = compactEvidenceText(item?.label || item?.source_label || item?.sourceLabel || item?.source || '恢复依据来源')
    const releaseFailureCount = Number(item?.release_failure_count || item?.releaseFailureCount || 0)
    const deepRepairEffect = normalizeRecoveryEvidenceSourceDeepRepairEffect(item?.deep_repair_effect || item?.deepRepairEffect, label)
    return {
      source,
      label,
      releaseFailureCount,
      trendLabel: `近${Math.max(1, releaseFailureCount || 1)}轮失败`,
      evidence: compactAuditList(Array.isArray(item?.evidence) ? item.evidence : [], 4),
      deepRepairDirection: recoveryEvidenceSourceDeepRepairDirection(source, label),
      deepRepairEffect,
    }
  }).filter(item => item.source && item.releaseFailureCount > 0)
    .sort((a, b) => b.releaseFailureCount - a.releaseFailureCount)

  if (!sources.length && !strengthenedAcceptanceTrend) return null
  const repeatedSources = sources.filter(item => item.releaseFailureCount >= 2)
  const focus = repeatedSources[0] || sources[0]
  const status = repeatedSources.length > 0 || String(profile?.status || '') === 'warn' || strengthenedAcceptanceTrend?.status === 'warn' ? 'warn' : 'ok'
  return {
    visible: true,
    status,
    label: '恢复依据画像趋势',
    summary: focus
      ? focus.releaseFailureCount >= 2
        ? `${focus.label}近${focus.releaseFailureCount}轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。`
        : `${focus.label}已有放行后失效记录，任务中心继续观察来源稳定性。`
      : strengthenedAcceptanceTrend?.summary || '暂无恢复依据来源失效趋势。',
    totalFailureCount: Number(profile?.total_failure_count || profile?.totalFailureCount || sources.reduce((sum, item) => sum + item.releaseFailureCount, 0)),
    repeatSourceCount: Number(profile?.repeat_source_count || profile?.repeatSourceCount || repeatedSources.length),
    strengthenedAcceptanceTrend,
    sources,
  }
}

export function BatchProseRunSummary({ run }: { run: any }) {
  const input = parseJsonValue(run.input_ref) || {}
  const output = parseJsonValue(run.output_ref) || {}
  const batchPreflight = input.batch_preflight || input.batchPreflight || null
  const productionRelapseCtaExecution = buildProductionRelapseCtaExecutionSnapshot(batchPreflight || input)
  const expansionPolicy = buildSafeBatchExpansionPolicySnapshot(batchPreflight)
  const recoveryEvidenceProfile = buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight)
  const recoveryEvidence = [
    ...(Array.isArray(batchPreflight?.recovery_evidence) ? batchPreflight.recovery_evidence : []),
    ...(Array.isArray(batchPreflight?.recoveryEvidence) ? batchPreflight.recoveryEvidence : []),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const failedChapters = chapters.filter((chapter: any) => chapter.status === 'failed')
  const successChapters = chapters.filter((chapter: any) => chapter.status === 'success')
  const avgScore = successChapters
    .map((chapter: any) => Number(chapter.score))
    .filter((score: number) => Number.isFinite(score))
  const scoreText = avgScore.length > 0
    ? Math.round(avgScore.reduce((sum: number, score: number) => sum + score, 0) / avgScore.length)
    : null
  const expansionFeedback = expansionPolicy?.expansionFeedback || null
  const expansionFeedbackChapterText = expansionFeedback?.latestChapterNos.length
    ? `第${expansionFeedback.latestChapterNos.join('、')}章`
    : ''
  const expansionStructureTrend = expansionFeedback?.structureValidationTrend || null
  const expansionStructureFailureReason = expansionStructureTrend?.failureReasons?.[0] || null
  const expansionStructureEffectiveness = expansionFeedback?.structureRepairEffectiveness || null
  const defaultRecoveryVerdictRelapseEffectiveness = expansionStructureEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend || null
  const expansionStructureDecisionTrend = expansionFeedback?.structureDecisionTrend || null
  const expansionStructureDecisionRequirement = expansionStructureDecisionTrend?.topFailedRequirement || null
  const defaultLaneRedesign = expansionStructureDecisionTrend?.defaultFiveChapterLaneRedesign || null
  const defaultLaneMissedRequirements = defaultLaneRedesign?.missedRequirements || []
  const defaultFiveChapterRegression = expansionFeedback?.defaultFiveChapterRegression || null
  const defaultRecoveryVerdictRelapse = expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse || null
  const defaultLaneTemplateStability = expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile || null
  const defaultLaneTemplateStabilityTop = defaultLaneTemplateStability?.topFailedRequirement
    || defaultLaneTemplateStability?.requirements.find(requirement => requirement.failedCount > 0)
    || null
  const defaultLaneTemplateVersion = defaultLaneTemplateStability?.latestTemplateVersionProfile || null
  const recoveryRestoreStability = expansionFeedback?.recoveryRestoreStabilityEvidence || null
  const recoveryRestoreStabilityLane = expansionPolicy?.recoveryRestoreStabilityLane
    || buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
      input.default_five_chapter_lane
        || input.defaultFiveChapterLane
        || input.recovery_restore_stability_evidence
        || input.recoveryRestoreStabilityEvidence,
      recoveryRestoreStability,
    )
  const recoveryRestoreReview = recoveryRestoreStabilityLane || recoveryRestoreStability
  const recoveryRestoreBatchText = recoveryRestoreReview?.restoreChapterNos.length
    ? `恢复批 ${compactChapterNos(recoveryRestoreReview.restoreChapterNos)}`
    : ''
  const recoveryRestoreValidationText = recoveryRestoreReview?.validationChapterNos.length
    ? `验证 ${compactChapterNos(recoveryRestoreReview.validationChapterNos)}`
    : ''
  const recoveryRestoreDecisionLabel = recoveryRestoreStabilityLane?.label
    || (recoveryRestoreStability && recoveryRestoreStability.stablePassStreak >= 2 ? '默认5章档位' : '继续观察 1-2 批')
  const recoveryRestoreSummary = recoveryRestoreStabilityLane?.summary
    || recoveryRestoreStability?.summary
    || '恢复 5 章后的稳定观察已沉淀，可继续作为扩批默认档位依据。'
  const defaultRegressionBatchText = defaultFiveChapterRegression?.defaultBatchChapterNos.length
    ? `失效批 ${compactChapterNos(defaultFiveChapterRegression.defaultBatchChapterNos)}`
    : ''
  const defaultRegressionRestoreText = defaultFiveChapterRegression?.restoreChapterNos.length
    ? `默认依据 ${compactChapterNos(defaultFiveChapterRegression.restoreChapterNos)}`
    : ''
  const defaultRegressionValidationText = defaultFiveChapterRegression?.validationChapterNos.length
    ? `前置验证 ${compactChapterNos(defaultFiveChapterRegression.validationChapterNos)}`
    : ''
  const recoveryRoadmap = expansionPolicy?.recoveryRoadmap || null
  const recoveryValidation = expansionPolicy?.recoveryValidation || null
  const defaultRecoveryVerdict = recoveryValidation?.defaultFiveChapterRecoveryVerdict || null
  const defaultLaneTemplateVerdict = recoveryValidation?.defaultFiveChapterLaneTemplateVerdict || null
  const defaultLaneTemplateProductionRelapse = defaultLaneTemplateVerdict?.productionRelapseVerdict || null
  const defaultLaneTemplateVersionProductionRelapse = defaultLaneTemplateVersion?.latestProductionRelapseVerdict || null

  return (
    <Card size="small" title="批量生成摘要">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>总计 {output.total ?? chapters.length} 章</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? successChapters.length} 章</Tag>
          <Tag color={failedChapters.length > 0 ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failedChapters.length} 章</Tag>
          {output.canceled && <Tag color="default" bordered={false}>已停止</Tag>}
          {Number(output.skipped || 0) > 0 && <Tag bordered={false}>未处理 {output.skipped} 章</Tag>}
          {scoreText !== null && <Tag color={scoreText >= 78 ? 'green' : 'gold'} bordered={false}>平均质检 {scoreText} 分</Tag>}
          <Tag bordered={false}>耗时 {run.duration_ms ? `${Math.round(Number(run.duration_ms) / 1000)}s` : '-'}</Tag>
        </Space>
        {productionRelapseCtaExecution?.visible && (
          <div style={{ padding: 8, border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Tag color="purple" bordered={false}>{productionRelapseCtaExecution.label}</Tag>
                {productionRelapseCtaExecution.templateVersionId && (
                  <Tag bordered={false}>{productionRelapseCtaExecution.templateVersionId}</Tag>
                )}
                {productionRelapseCtaExecution.targetChapterCount > 0 && (
                  <Tag bordered={false}>目标 {productionRelapseCtaExecution.targetChapterCount} 章</Tag>
                )}
                {productionRelapseCtaExecution.clearedFailureReasons.slice(0, 3).map(reason => (
                  <Tag key={`cta-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                ))}
                {productionRelapseCtaExecution.remainingFailureReasons.slice(0, 3).map(reason => (
                  <Tag key={`cta-remaining-${reason}`} color="gold" bordered={false}>{reason}待修</Tag>
                ))}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{productionRelapseCtaExecution.summary}</Text>
            </Space>
          </div>
        )}
        {expansionPolicy?.visible && (
          <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{expansionPolicy.label}</Text>
                <Tag color={expansionPolicy.status === 'expanded' ? 'green' : 'blue'} bordered={false}>
                  目标 {expansionPolicy.targetChapterCount} 章
                </Tag>
                <Tag bordered={false}>连续 {expansionPolicy.passStreak}/{expansionPolicy.requiredPassStreak}</Tag>
                <Tag bordered={false}>通过 {expansionPolicy.acceptedBatchCount}</Tag>
                <Tag bordered={false}>未过 {expansionPolicy.failedBatchCount}</Tag>
              </Space>
              {recoveryRoadmap?.visible && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={recoveryRoadmap.currentTargetChapterCount >= 5 ? 'green' : recoveryRoadmap.currentTargetChapterCount <= 1 ? 'red' : 'blue'} bordered={false}>
                      {recoveryRoadmap.currentLaneLabel || `目标 ${recoveryRoadmap.currentTargetChapterCount} 章`}
                    </Tag>
                    {recoveryRoadmap.nextRepairLayer && (
                      <Tag color={recoveryRoadmap.nextRepairLayer.status === 'warn' ? 'gold' : 'default'} bordered={false}>
                        下一层 {recoveryRoadmap.nextRepairLayer.actionLabel || recoveryRoadmap.nextRepairLayer.label}
                      </Tag>
                    )}
                    {recoveryRoadmap.routeNodes.slice(0, 5).map(node => (
                      <Tag
                        key={node.key}
                        color={node.status === 'ok' ? 'green' : node.status === 'warn' ? 'gold' : 'default'}
                        bordered={false}
                      >
                        {node.label}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{recoveryRoadmap.currentReason}</Text>
                </Space>
              )}
              {recoveryValidation?.visible && (
                <div style={{ padding: 8, border: `1px solid ${recoveryValidation.status === 'passed' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 6, background: recoveryValidation.status === 'passed' ? '#f0fdf4' : '#fffdf3' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'gold'} bordered={false}>{recoveryValidation.label}</Tag>
                      {recoveryValidation.validationChapterNos.length > 0 && (
                        <Tag bordered={false}>第{recoveryValidation.validationChapterNos.join('、')}章</Tag>
                      )}
                      <Tag bordered={false}>风险 {recoveryValidation.riskCount}</Tag>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'blue'} bordered={false}>
                        下一步 {recoveryValidation.nextActionLabel}
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryValidation.summary}</Text>
                    {defaultRecoveryVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultRecoveryVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultRecoveryVerdict.label}
                          </Tag>
                          {defaultRecoveryVerdict.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`cleared-${reason}`} color="green" bordered={false}>{reason}已清零</Tag>
                          ))}
                          {defaultRecoveryVerdict.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`remaining-${reason}`} color="gold" bordered={false}>{reason}未清零</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultRecoveryVerdict.summary}</Text>
                      </Space>
                    )}
                    {defaultLaneTemplateVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.label}
                          </Tag>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.status === 'passed' ? '四项模板全过' : `缺项 ${defaultLaneTemplateVerdict.missingCount}`}
                          </Tag>
                          {defaultLaneTemplateVerdict.status === 'passed' && defaultLaneTemplateVerdict.requirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-pass-${requirement.key || requirement.label}`} color="green" bordered={false}>
                              {requirement.label}通过
                            </Tag>
                          ))}
                          {defaultLaneTemplateVerdict.missingRequirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-missing-${requirement.key || requirement.label}`} color="gold" bordered={false}>
                              {compactChapterNos(requirement.chapterNos)}缺{requirement.label}
                            </Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse && (
                            <Tag color={defaultLaneTemplateProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                              {defaultLaneTemplateProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                            </Tag>
                          )}
                          {defaultLaneTemplateProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateVerdict.summary}</Text>
                        {defaultLaneTemplateProductionRelapse?.summary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateProductionRelapse.summary}</Text>
                        )}
                      </Space>
                    )}
                  </Space>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>{expansionPolicy.summary}</Text>
              {expansionFeedback && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={safeBatchExpansionFeedbackColor(expansionFeedback.status)} bordered={false}>
                      {expansionFeedback.label}
                    </Tag>
                    {expansionFeedback.targetChapterCount > 0 && (
                      <Tag bordered={false}>反馈目标 {expansionFeedback.targetChapterCount} 章</Tag>
                    )}
                    {expansionFeedbackChapterText && (
                      <Tag bordered={false}>{expansionFeedbackChapterText}</Tag>
                    )}
                    {expansionFeedback.stablePassStreak > 0 && (
                      <Tag color="green" bordered={false}>稳定连过 {expansionFeedback.stablePassStreak}</Tag>
                    )}
                    {expansionFeedback.recentExpandedBatchCount > 1 && (
                      <Tag bordered={false}>观察 {expansionFeedback.recentExpandedBatchCount} 批</Tag>
                    )}
                    {expansionFeedback.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {expansionFeedback.repeatedHotspotSegment.label}复发 {expansionFeedback.repeatedHotspotSegment.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.visible && (
                      <Tag color={expansionStructureTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        验证通过率 {expansionStructureTrend.passRate}%
                      </Tag>
                    )}
                    {expansionStructureFailureReason && (
                      <Tag color="gold" bordered={false}>
                        失败主因 {expansionStructureFailureReason.label}{expansionStructureFailureReason.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.recurrenceAfterRestore.visible && (
                      <Tag color="gold" bordered={false}>
                        复发间隔 {expansionStructureTrend.recurrenceAfterRestore.intervalBatchCount}批
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag color={expansionStructureEffectiveness.status === 'ok' ? 'green' : 'gold'} bordered={false}>
                        {expansionStructureEffectiveness.status === 'ok' ? '结构修复有效' : '结构修复待观察'}
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag bordered={false}>
                        主因 {expansionStructureEffectiveness.baselineFailureReasonCount}{'->'}{expansionStructureEffectiveness.currentFailureReasonCount}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapseEffectiveness && (
                      <Tag color="gold" bordered={false}>
                        恢复判定连续失效 {defaultRecoveryVerdictRelapseEffectiveness.repeatedRelapseCount}
                      </Tag>
                    )}
                    {expansionStructureDecisionTrend?.visible && (
                      <Tag color={expansionStructureDecisionTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        结构决策{expansionStructureDecisionTrend.status === 'warn' ? '待补齐' : '已落地'}
                      </Tag>
                    )}
                    {expansionStructureDecisionRequirement && (
                      <Tag color="gold" bordered={false}>
                        漏项 {expansionStructureDecisionRequirement.label}{expansionStructureDecisionRequirement.count}
                      </Tag>
                    )}
                    {defaultLaneRedesign && (
                      <Tag color="gold" bordered={false}>默认档位模板漏项</Tag>
                    )}
                    {defaultLaneMissedRequirements.slice(0, 4).map(requirement => (
                      <Tag key={`default-lane-missed-${requirement.key}`} color="gold" bordered={false}>
                        缺{requirement.label}
                      </Tag>
                    ))}
                    {defaultLaneTemplateStability && (
                      <Tag color={defaultLaneTemplateStability.status === 'ready' ? 'green' : defaultLaneTemplateStability.status === 'redesign' || defaultLaneTemplateStability.status === 'relapsed' ? 'gold' : 'blue'} bordered={false}>
                        {defaultLaneTemplateStability.label}
                      </Tag>
                    )}
                    {defaultLaneTemplateStability && (
                      <Tag bordered={false}>
                        模板连过 {defaultLaneTemplateStability.passStreak}/{defaultLaneTemplateStability.requiredPassStreak}
                      </Tag>
                    )}
                    {defaultLaneTemplateStabilityTop && (
                      <Tag color="gold" bordered={false}>
                        {defaultLaneTemplateStabilityTop.label}失败 {defaultLaneTemplateStabilityTop.failedCount}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersion && (
                      <Tag color={defaultLaneTemplateVersion.status === 'ready' ? 'green' : defaultLaneTemplateVersion.status === 'relapsed' || defaultLaneTemplateVersion.status === 'redesign' ? 'gold' : 'blue'} bordered={false}>
                        模板版本连过 {defaultLaneTemplateVersion.passStreak || 0}/{defaultLaneTemplateVersion.requiredPassStreak || defaultLaneTemplateStability?.requiredPassStreak || 0}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse && (
                      <Tag color={defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                        {defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                    ))}
                    {defaultLaneTemplateVersionProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                    ))}
                    {recoveryRestoreReview && (
                      <Tag color="green" bordered={false}>长期扩批稳定证据</Tag>
                    )}
                    {recoveryRestoreStabilityLane && (
                      <Tag color="blue" bordered={false}>批次复盘筛选</Tag>
                    )}
                    {recoveryRestoreReview && (
                      <Tag color={recoveryRestoreStabilityLane?.defaultFiveChapterReady ? 'green' : undefined} bordered={false}>
                        {recoveryRestoreDecisionLabel}
                      </Tag>
                    )}
                    {defaultFiveChapterRegression && (
                      <Tag color="gold" bordered={false}>默认档位回退原因</Tag>
                    )}
                    {defaultFiveChapterRegression?.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {defaultFiveChapterRegression.repeatedHotspotSegment.label}复发
                      </Tag>
                    )}
                    {defaultFiveChapterRegression?.templateVersionId && (
                      <Tag color="gold" bordered={false}>
                        模板版本 {defaultFiveChapterRegression.templateVersionId}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapse && (
                      <Tag color="gold" bordered={false}>恢复判定失效</Tag>
                    )}
                    {defaultRecoveryVerdictRelapse?.relapsedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`relapse-${reason}`} color="gold" bordered={false}>{reason}复发</Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{expansionFeedback.summary}</Text>
                  {defaultLaneTemplateStability && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateStability.summary}</Text>
                  )}
                  {defaultRecoveryVerdictRelapse && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRecoveryVerdictRelapse.validationChapterNos.length > 0 && (
                          <Tag bordered={false}>清零验证 {compactChapterNos(defaultRecoveryVerdictRelapse.validationChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.relapseBatchChapterNos.length > 0 && (
                          <Tag color="gold" bordered={false}>复发批 {compactChapterNos(defaultRecoveryVerdictRelapse.relapseBatchChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.repeatedHotspotSegment && (
                          <Tag color="gold" bordered={false}>{defaultRecoveryVerdictRelapse.repeatedHotspotSegment.label}风险 {defaultRecoveryVerdictRelapse.repeatedHotspotSegment.riskCount}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultRecoveryVerdictRelapse.summary || '恢复判定失效，需要回到 3 章验证批重新证明核心、回报和追读稳定。'}
                      </Text>
                    </Space>
                  )}
                  {defaultFiveChapterRegression && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRegressionBatchText && <Tag color="gold" bordered={false}>{defaultRegressionBatchText}</Tag>}
                        {defaultRegressionRestoreText && <Tag bordered={false}>{defaultRegressionRestoreText}</Tag>}
                        {defaultRegressionValidationText && <Tag bordered={false}>{defaultRegressionValidationText}</Tag>}
                        <Tag color="green" bordered={false}>
                          原稳定 {defaultFiveChapterRegression.stablePassStreak}/{defaultFiveChapterRegression.requiredStablePassStreak}
                        </Tag>
                        {defaultFiveChapterRegression.failureReasons.slice(0, 3).map(reason => (
                          <Tag key={reason} color="gold" bordered={false}>{reason}</Tag>
                        ))}
                        {defaultFiveChapterRegression.templateVersionFailedRequirements.slice(0, 3).map(requirement => (
                          <Tag key={`template-version-${requirement.key || requirement.failureReason}`} color="gold" bordered={false}>
                            {requirement.label || requirement.failureReason}
                          </Tag>
                        ))}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultFiveChapterRegression.summary || '默认 5 章档位出现复发，需要回到 3 章验证批或扩批结构修复层。'}
                      </Text>
                    </Space>
                  )}
                  {recoveryRestoreReview && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {recoveryRestoreStabilityLane && (
                          <Tag color="blue" bordered={false}>{recoveryRestoreStabilityLane.taskCenterFilterLabel}</Tag>
                        )}
                        {recoveryRestoreBatchText && <Tag bordered={false}>{recoveryRestoreBatchText}</Tag>}
                        {recoveryRestoreValidationText && <Tag bordered={false}>{recoveryRestoreValidationText}</Tag>}
                        {recoveryRestoreStabilityLane ? (
                          <Tag color="green" bordered={false}>
                            稳定连过 {recoveryRestoreStabilityLane.stablePassStreak}/{recoveryRestoreStabilityLane.requiredStablePassStreak}
                          </Tag>
                        ) : (
                          <Tag color="green" bordered={false}>稳定连过 {recoveryRestoreReview.stablePassStreak}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {recoveryRestoreSummary}
                      </Text>
                    </Space>
                  )}
                  {expansionStructureTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureTrend.summary}</Text>
                  )}
                  {expansionStructureEffectiveness?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureEffectiveness.summary}</Text>
                  )}
                  {expansionStructureDecisionTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureDecisionTrend.summary}</Text>
                  )}
                  {defaultLaneRedesign && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {defaultLaneRedesign.summary}
                      {defaultLaneRedesign.relapseCount > 0 ? ` 连续失效 ${defaultLaneRedesign.relapseCount} 次。` : ''}
                      {defaultLaneRedesign.repeatedFailureReasons.length ? ` 同维复发：${defaultLaneRedesign.repeatedFailureReasons.join('、')}。` : ''}
                    </Text>
                  )}
                </Space>
              )}
            </Space>
          </div>
        )}
        {recoveryEvidence.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 12 }}>恢复放行依据</Text>
              <Space wrap size={[4, 4]}>
                {Array.from(new Set(recoveryEvidence)).slice(0, 8).map(item => (
                  <Tag key={item} color="green" bordered={false}>{item}</Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {recoveryEvidenceProfile?.visible && (
          <div style={{ padding: 8, border: '1px solid #fde68a', borderRadius: 6, background: '#fffdf3' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.label}</Text>
                <Tag color={recoveryEvidenceProfile.status === 'warn' ? 'gold' : 'green'} bordered={false}>反复来源 {recoveryEvidenceProfile.repeatSourceCount}</Tag>
                <Tag bordered={false}>失效 {recoveryEvidenceProfile.totalFailureCount} 次</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.summary}</Text>
              {recoveryEvidenceProfile.strengthenedAcceptanceTrend?.visible && (
                <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.label}</Text>
                      <Tag color={recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        {recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? '回到单章' : `连过 ${recoveryEvidenceProfile.strengthenedAcceptanceTrend.passStreak} 批`}
                      </Tag>
                      <Tag bordered={false}>通过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.acceptedBatchCount}</Tag>
                      <Tag bordered={false}>未过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.failedBatchCount}</Tag>
                      {recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel && (
                        <Tag bordered={false}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel}</Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.summary}</Text>
                    <Space wrap size={[4, 4]}>
                      <Tag bordered={false}>核心 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.core.failedCount}</Tag>
                      <Tag bordered={false}>回报 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.payoff.failedCount}</Tag>
                      <Tag bordered={false}>拉力 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.readerPull.failedCount}</Tag>
                    </Space>
                    {recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        依据：{recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.join('；')}
                      </Text>
                    )}
                  </Space>
                </div>
              )}
              {recoveryEvidenceProfile.sources.slice(0, 3).map(source => (
                <Space key={source.source} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={source.releaseFailureCount >= 2 ? 'gold' : 'default'} bordered={false}>{source.label}</Tag>
                    <Tag bordered={false}>{source.trendLabel}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>深层修复方向：{source.deepRepairDirection}</Text>
                  {source.deepRepairEffect.status !== 'none' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      深修结果：{source.deepRepairEffect.label}，{source.deepRepairEffect.summary}
                    </Text>
                  )}
                  {source.deepRepairEffect.strengthenedClosure.status !== 'not_required' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      强化复检：{source.deepRepairEffect.strengthenedClosure.label}，{source.deepRepairEffect.strengthenedClosure.summary}
                    </Text>
                  )}
                </Space>
              ))}
            </Space>
          </div>
        )}
        {chapters.length > 0 && (
          <Space wrap size={[4, 4]}>
            {chapters.slice(0, 80).map((chapter: any) => (
              <Tag
                key={`${chapter.chapter_no}-${chapter.id || chapter.title}`}
                color={chapter.status === 'success' ? (Number(chapter.score || 0) >= 78 ? 'green' : 'gold') : 'red'}
                bordered={false}
              >
                第{chapter.chapter_no}章
                {chapter.status === 'success' ? ` ${chapter.score ?? '-'}分${chapter.revised ? ' 修订' : ''}` : ' 失败'}
              </Tag>
            ))}
            {chapters.length > 80 && <Tag bordered={false}>另有 {chapters.length - 80} 章</Tag>}
          </Space>
        )}
        {failedChapters.length > 0 && (
          <Card size="small" title="失败章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {failedChapters.slice(0, 12).map((chapter: any) => (
                <Paragraph key={`${chapter.chapter_no}-${chapter.id || chapter.title}`} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                  第{chapter.chapter_no}章《{chapter.title || '未命名'}》：{chapter.error || '生成失败'}
                </Paragraph>
              ))}
              {failedChapters.length > 12 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {failedChapters.length - 12} 个失败章节，可查看下方原始输出。</Text>}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}

export function ChapterPipelineRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const steps = Array.isArray(output.steps) ? output.steps : []
  return (
    <Card size="small" title="章节流水线">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>第{output.chapter_no || '-'}章</Tag>
          <Tag bordered={false}>当前：{output.current_step || '-'}</Tag>
          {output.can_resume_from && <Tag color="green" bordered={false}>可从 {output.can_resume_from} 继续</Tag>}
          {output.confirmed_scene_cards === false && <Tag color="gold" bordered={false}>等待场景卡确认</Tag>}
        </Space>
        {steps.length > 0 && (
          <Space wrap size={[4, 4]}>
            {steps.map((step: any) => (
              <Tag key={step.key} color={step.status === 'success' ? 'green' : step.status === 'failed' ? 'red' : step.status === 'needs_confirmation' ? 'gold' : step.status === 'ready' ? 'blue' : 'default'} bordered={false}>
                {step.label || step.key} · {step.status}
              </Tag>
            ))}
          </Space>
        )}
        {Array.isArray(output.context_package?.preflight?.warnings) && output.context_package.preflight.warnings.length > 0 && (
          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
            上下文缺口：{output.context_package.preflight.warnings.join('；')}
          </Paragraph>
        )}
      </Space>
    </Card>
  )
}

export function ReleaseRepairRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const relatedRuns = Array.isArray(output.related_runs) ? output.related_runs : []
  return (
    <Card size="small" title="发布修复队列">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={output.release_audit?.can_release ? 'green' : 'red'} bordered={false}>
            发布评分 {output.release_audit?.score ?? '-'}
          </Tag>
          <Tag color="blue" bordered={false}>修复任务 {tasks.length}</Tag>
          <Tag bordered={false}>子任务 {relatedRuns.length}</Tag>
          <Tag color={(output.release_audit?.blocker_count || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {output.release_audit?.blocker_count || 0}</Tag>
          <Tag color={(output.release_audit?.warning_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>警告 {output.release_audit?.warning_count || 0}</Tag>
        </Space>
        {tasks.length > 0 && (
          <List
            size="small"
            dataSource={tasks}
            renderItem={(task: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    <Tag color={task.priority === 'high' ? 'red' : 'gold'} bordered={false}>{task.priority || 'medium'}</Tag>
                    <Text>{task.title}</Text>
                    <Tag bordered={false}>{task.count || 0} 项</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {task.action}{task.chapter_nos?.length ? ` · 章节：${task.chapter_nos.slice(0, 20).join('、')}` : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
        {relatedRuns.length > 0 && (
          <Space wrap>
            {relatedRuns.map((item: any) => (
              <Tag key={`${item.run_type}-${item.run_id}`} color="blue" bordered={false}>
                子任务 #{item.run_id} · {runTypeLabel(item.run_type)}
              </Tag>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  )
}

export function RepairTaskRunSummary({
  run,
  runRecords = [],
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onRecheckStyleSampleTaskBooks,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
  onRefresh,
}: {
  run: any
  runRecords?: any[]
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onRecheckStyleSampleTaskBooks?: (items: any[]) => void
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
  onRefresh?: () => void | Promise<void>
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const audit = output.audit_summary || null
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number | null>(null)
  const [focusedTaskSource, setFocusedTaskSource] = useState<string>('')
  const [recoveryEvidenceActionFeedbackByKey, setRecoveryEvidenceActionFeedbackByKey] = useState<Record<string, RecoveryEvidenceReviewActionFeedback>>({})
  const [recoveryEvidenceRefreshAnchor, setRecoveryEvidenceRefreshAnchor] = useState<RecoveryEvidenceReviewRefreshAnchor | null>(null)
  const high = tasks.filter((task: any) => task.severity === 'high').length
  const medium = tasks.filter((task: any) => task.severity === 'medium').length
  const resolved = tasks.filter((task: any) => task.task_status === 'resolved').length
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review').length
  const closureHighlights = buildRepairClosureHighlights(tasks, audit)
  const recoveryEvidenceAudit = buildRecoveryEvidenceAuditView(audit, tasks)
  const sourceTaskForRecoveryEvidenceRow = (focusSource: string) => {
    const group = recoveryEvidenceAudit?.sourceGroups.find(item => item.source === focusSource)
    const taskIndex = group?.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
      ?? group?.taskIndexes[0]
      ?? null
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : null,
    }
  }
  useEffect(() => {
    if (!safeBatchRecoveryFocus) return
    const taskIndex = tasks.findIndex((task: any) => safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task))
    if (taskIndex < 0) return
    setFocusedTaskSource('')
    setFocusedTaskIndex(taskIndex)
  }, [run?.id, safeBatchRecoveryFocus?.layerKey, safeBatchRecoveryFocus?.issueType, safeBatchRecoveryFocus?.source])
  const sourceTaskForRecoveryEvidenceAuditAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const groupedTask = sourceTaskForRecoveryEvidenceRow(nextAction.source)
    const taskIndex = nextAction.taskIndex ?? groupedTask.taskIndex
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : groupedTask.task,
    }
  }
  const recoveryEvidenceAuditNextActionDisabled = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    if (nextAction.action === 'revision') return !sourceTask.task || !onStartRepairTaskRevision
    if (nextAction.action === 'recheck_single_chapter') return !sourceTask.task || !onRecheckRepairTask
    if (nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') return !onGenerateRepairAuditSummary
    return false
  }
  const handleRecoveryEvidenceAuditNextAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    setFocusedTaskSource(nextAction.source)
    setFocusedTaskIndex(sourceTask.taskIndex)
    if (nextAction.action === 'revision' && sourceTask.task && onStartRepairTaskRevision) {
      onStartRepairTaskRevision(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if (nextAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
      onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if ((nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') && onGenerateRepairAuditSummary) {
      onGenerateRepairAuditSummary(run)
    }
  }
  const focusRecoveryEvidenceAnchor = (anchor: RecoveryEvidenceReviewRefreshAnchor) => {
    setFocusedTaskSource(anchor.focusSource)
    setFocusedTaskIndex(anchor.sourceTaskIndex ?? anchor.taskIndex)
  }
  const runRecoveryEvidenceActionWithRefresh = async (
    actionFeedback: RecoveryEvidenceReviewActionFeedback,
    refreshAnchor: RecoveryEvidenceReviewRefreshAnchor,
    action: () => void | Promise<void>,
  ) => {
    setRecoveryEvidenceRefreshAnchor(refreshAnchor)
    focusRecoveryEvidenceAnchor(refreshAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => ({ ...prev, [refreshAnchor.feedbackKey]: actionFeedback }))
    await Promise.resolve(action())
    if (onRefresh) await Promise.resolve(onRefresh())
    const refreshedAnchor = { ...refreshAnchor, refreshedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
    setRecoveryEvidenceRefreshAnchor(refreshedAnchor)
    focusRecoveryEvidenceAnchor(refreshedAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => {
      const refreshedFeedback = buildRecoveryEvidenceReviewRefreshFeedback(prev[refreshAnchor.feedbackKey] || actionFeedback, refreshedAnchor)
      return refreshedFeedback ? { ...prev, [refreshAnchor.feedbackKey]: refreshedFeedback } : prev
    })
  }
  const handleRecoveryEvidenceReviewRowAction = async (
    task: any,
    taskIndex: number,
    row: RecoveryEvidenceReviewRow,
    rowAction: RecoveryEvidenceReviewRowAction,
  ) => {
    const triggeredAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const actionFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, triggeredAt)
    const runActionOptions = { keepTaskCenterOpen: true }
    if (rowAction.focusSource) {
      const sourceTask = sourceTaskForRecoveryEvidenceRow(rowAction.focusSource)
      const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
        taskIndex,
        row,
        rowAction,
        sourceTaskIndex: sourceTask.taskIndex,
        refreshedAt: triggeredAt,
      })
      if (rowAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0, runActionOptions))
      }
      if (rowAction.action === 'recheck_safe_batch' && onGenerateRepairAuditSummary) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      }
      return
    }
    const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex,
      row,
      rowAction,
      sourceTaskIndex: taskIndex,
      refreshedAt: triggeredAt,
    })
    if (rowAction.action === 'review_governance_closure' && onGenerateRepairAuditSummary) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      return
    }
    if (rowAction.action === 'execute_typed_repair' && onExecuteTypedRepairTask) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onExecuteTypedRepairTask(task, run, taskIndex, runActionOptions))
    }
  }
  const title = run.run_type === 'first30_retention_repair'
    ? '前30章留存修复任务'
    : run.run_type === 'longform_production_repair'
      ? output.report?.source === 'auto_creation_safe_batch_risk'
        ? '安全连写风险修复任务'
        : output.report?.source === 'review_annotation_risk'
          ? '交稿风险修复任务'
          : output.report?.source === 'rolling_script_room'
            ? '百章剧本室修复任务'
            : output.report?.source === 'reader_trial_review'
              ? '读者试读修复任务'
              : output.report?.source === 'recovery_evidence_governance_queue'
                ? '恢复依据治理队列'
                : '长线生产修复任务'
      : '机械质检修复任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>任务 {tasks.length}</Tag>
          <Tag color={high ? 'red' : 'default'} bordered={false}>高危 {high}</Tag>
          <Tag color={medium ? 'gold' : 'default'} bordered={false}>中危 {medium}</Tag>
          <Tag color={resolved ? 'green' : 'default'} bordered={false}>已处理 {resolved}</Tag>
          <Tag color={needsReview ? 'gold' : 'default'} bordered={false}>需复查 {needsReview}</Tag>
          {output.report?.score !== undefined && <Tag bordered={false}>诊断分 {output.report.score}</Tag>}
          {output.report?.weak_count !== undefined && <Tag bordered={false}>薄弱章节 {output.report.weak_count}</Tag>}
          {output.report?.status && <Tag bordered={false}>{output.report.status}</Tag>}
          {run.run_type === 'longform_production_repair' && onGenerateRepairAuditSummary && (
            <Button size="small" type="primary" onClick={() => onGenerateRepairAuditSummary(run)}>生成审计摘要</Button>
          )}
        </Space>
        {audit && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
                <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
                <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
              </Space>
              {(audit.conclusion || []).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
              <Space wrap size={[4, 4]}>
                {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>
                    {key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}
                  </Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {closureHighlights.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>风险闭环记录</Text>
                <Tag color="green" bordered={false}>已清 {closureHighlights.reduce((sum, item) => sum + item.count, 0)}</Tag>
              </Space>
              {closureHighlights.map(item => (
                <Space key={item.key} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={item.color} bordered={false}>{item.label}</Tag>
                    <Tag color="green" bordered={false}>{item.count}</Tag>
                    {item.chapterNos.length > 0 && <Tag bordered={false}>第{item.chapterNos.slice(0, 6).join('、')}章</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                </Space>
              ))}
            </Space>
          </div>
        )}
        {recoveryEvidenceAudit && (
          <div style={{ padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.label}</Text>
                <Tag color={recoveryEvidenceAudit.status === 'closed' ? 'green' : 'gold'} bordered={false}>
                  {recoveryEvidenceAudit.status === 'closed' ? '已闭环' : '需跟进'}
                </Tag>
                <Tag bordered={false}>已确认 {recoveryEvidenceAudit.resolved}/{recoveryEvidenceAudit.total}</Tag>
                {recoveryEvidenceAudit.sourceRunId && <Tag bordered={false}>来源 #{recoveryEvidenceAudit.sourceRunId}</Tag>}
                {recoveryEvidenceAudit.memoryLabel && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.memoryLabel}</Tag>}
                {recoveryEvidenceAudit.sourceSummary && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.sourceSummary}</Tag>}
              </Space>
              {recoveryEvidenceAudit.nextAction && (
                <Space wrap size={[4, 4]} style={{ padding: 6, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
                  <Tag color="gold" bordered={false}>下一步</Tag>
                  <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.label}</Text>
                  {recoveryEvidenceAudit.nextAction.sourceLabel && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.sourceLabel}</Text>
                  )}
                  {recoveryEvidenceAudit.nextAction.residualEvidence.length > 0 && (
                    <Text type="danger" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.residualEvidence.join('；')}</Text>
                  )}
                  <Button
                    size="small"
                    type="primary"
                    icon={['recheck_single_chapter', 'recheck_safe_batch', 'review_governance_closure'].includes(recoveryEvidenceAudit.nextAction.action) ? <ReloadOutlined /> : undefined}
                    disabled={recoveryEvidenceAuditNextActionDisabled(recoveryEvidenceAudit.nextAction)}
                    onClick={() => handleRecoveryEvidenceAuditNextAction(recoveryEvidenceAudit.nextAction!)}
                  >
                    {recoveryEvidenceAudit.nextAction.label}
                  </Button>
                </Space>
              )}
              {recoveryEvidenceAudit.sourceGroups.length > 0 && (
                <Space wrap size={[4, 4]}>
                  <Text strong style={{ fontSize: 12 }}>按来源定位</Text>
                  {recoveryEvidenceAudit.sourceGroups.map(group => {
                    const sourceTaskIndex = group.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
                      ?? group.taskIndexes[0]
                      ?? null
                    const sourceTask = sourceTaskIndex !== null ? tasks[sourceTaskIndex] : null
                    return (
                      <Space key={group.source} size={[2, 2]} wrap>
                        <Button
                          size="small"
                          type={focusedTaskSource === group.source ? 'primary' : 'default'}
                          onClick={() => {
                            setFocusedTaskSource(group.source)
                            setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                          }}
                        >
                          {group.label} {group.count}
                        </Button>
                        {group.recheckAction === 'single_chapter_governance_recheck' && sourceTask && onRecheckRepairTask && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onRecheckRepairTask?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        {group.recheckAction === 'safe_batch_recovery_recheck' && onGenerateRepairAuditSummary && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                              onGenerateRepairAuditSummary?.(run)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        <Tag color={group.resultStatus === 'closed' ? 'green' : group.resultStatus === 'needs_followup' ? 'gold' : 'default'} bordered={false}>
                          {group.resultLabel}
                        </Tag>
                        <Tag color={group.productionBlockStatus === 'cleared' ? 'green' : group.productionBlockStatus === 'blocked' ? 'red' : 'default'} bordered={false}>
                          {group.productionBlockLabel}
                        </Tag>
                        <Text type={group.productionBlockStatus === 'blocked' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                          {group.productionBlockDetail}
                        </Text>
                        {group.latestSummary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{group.latestSummary}</Text>
                        )}
                        {group.residualEvidence.length > 0 && (
                          <Text type="danger" style={{ fontSize: 12 }}>残留依据：{group.residualEvidence.join('；')}</Text>
                        )}
                        {group.residualAction === 'revision' && sourceTask && onStartRepairTaskRevision && (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onStartRepairTaskRevision?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                        {group.residualAction === 'focus_task' && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
              {recoveryEvidenceAudit.memorySummary && (
                <Text type="secondary" style={{ fontSize: 12 }}>治理记忆：{recoveryEvidenceAudit.memorySummary}</Text>
              )}
              {recoveryEvidenceAudit.failedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{recoveryEvidenceAudit.failedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.repairedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>修后证据：{recoveryEvidenceAudit.repairedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.watchItems.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>仍需观察：{recoveryEvidenceAudit.watchItems.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.relatedTasks.length > 0 && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12 }}>关联批次修复任务</Text>
                  {recoveryEvidenceAudit.relatedTasks.map((task, index) => {
                    const sourceTask = task.taskIndex !== null ? tasks[task.taskIndex] : null
                    const chapterId = task.chapterId || Number(sourceTask?.chapter_id || sourceTask?.chapterId || 0) || null
                    return (
                      <Space key={`${task.chapterNo || 'task'}-${index}`} wrap size={[4, 2]}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.chapterNo ? `第${task.chapterNo}章 ` : ''}{task.title}{task.status ? ` · ${task.status}` : ''}{task.summary ? ` · ${task.summary}` : ''}
                        </Text>
                        {task.taskIndex !== null && (
                          <Button size="small" type="link" onClick={() => {
                            setFocusedTaskSource('')
                            setFocusedTaskIndex(task.taskIndex)
                          }}>定位任务</Button>
                        )}
                        {chapterId && onSelectChapter && (
                          <Button size="small" type="link" onClick={() => onSelectChapter(chapterId)}>打开章节</Button>
                        )}
                        {sourceTask && onStartRepairTaskRevision && (
                          <Button size="small" type="link" onClick={() => onStartRepairTaskRevision(sourceTask, run, task.taskIndex ?? index)}>生成修订稿</Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </Space>
          </div>
        )}
        {Array.isArray(output.recommendations) && output.recommendations.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 12 }}>处理建议</Text>
              {output.recommendations.slice(0, 4).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
            </Space>
          </div>
        )}
        {output.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{output.report.summary}</Text>}
        {safeBatchRecoveryFocus && (
          <Alert
            type="info"
            showIcon
            message={`路线图聚焦：${safeBatchRecoveryFocus.actionLabel || safeBatchRecoveryFocus.layerLabel}`}
            description={safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '按安全连写恢复路线图定位下一层修复任务。'}
          />
        )}
        <List
          size="small"
          dataSource={tasks.slice(0, 40)}
          locale={{ emptyText: '暂无修复任务' }}
          renderItem={(task: any, taskIndex: number) => {
            const sourceFocused = Boolean(focusedTaskSource && recoveryEvidenceTaskSourceMeta(task).source === focusedTaskSource)
            const regovernanceQueue = recoveryEvidenceRegovernanceQueueOfTask(task)
            const regovernanceSummary = buildRecoveryEvidenceRegovernanceSummary(task)
            const refreshAnchorFocused = Boolean(
              recoveryEvidenceRefreshAnchor
              && (recoveryEvidenceRefreshAnchor.taskIndex === taskIndex || recoveryEvidenceRefreshAnchor.sourceTaskIndex === taskIndex),
            )
            const roadmapFocused = safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
            const defaultLaneTags = buildDefaultLaneRepairTaskTags(task)
            const focused = focusedTaskIndex === taskIndex || sourceFocused || refreshAnchorFocused || roadmapFocused
            return (
              <List.Item
                style={focused ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
              actions={[
                regovernanceQueue && regovernanceSummary && onCreateRecoveryEvidenceGovernanceQueue && task.task_status !== 'resolved' ? (
                  <Button
                    key="regovernance"
                    size="small"
                    type="primary"
                    onClick={() => onCreateRecoveryEvidenceGovernanceQueue({
                      recoveryEvidenceGovernanceQueue: regovernanceQueue,
                      sourceTask: task,
                      sourceRunId: run?.id,
                      sourceTaskIndex: taskIndex,
                    }, run, taskIndex, { keepTaskCenterOpen: true })}
                  >
                    {regovernanceSummary.actionLabel}
                  </Button>
                ) : null,
                repairTaskActionLabel(task) && onExecuteTypedRepairTask && task.task_status !== 'resolved' ? <Button key="typed" size="small" type="primary" onClick={() => onExecuteTypedRepairTask(task, run, taskIndex)}>{repairTaskActionLabel(task)}</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'resolved' ? <Button key="resolved" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'resolved', taskIndex)}>已处理</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'needs_review' ? <Button key="review" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'needs_review', taskIndex)}>需复查</Button> : null,
                task.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(task.chapter_id))}>定位</Button> : null,
                task.chapter_id && onOpenChapterEditor ? <Button key="edit" size="small" type="link" onClick={() => onOpenChapterEditor(Number(task.chapter_id))}>手动编辑</Button> : null,
                task.chapter_id && onStartRepairTaskRevision ? <Button key="revise" size="small" type="link" onClick={() => onStartRepairTaskRevision(task, run, taskIndex)}>生成修订稿</Button> : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={(
                  <Space wrap>
                    <Tag color={task.severity === 'high' ? 'red' : task.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{task.severity || 'task'}</Tag>
                    {repairTaskIssueTag(task)}
                    {defaultLaneTags.map(tag => (
                      <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                    ))}
                    {repairTaskStatusTag(task.task_status)}
                    <Text>{task.chapter_no ? `第${task.chapter_no}章 ` : ''}{task.title || task.message}</Text>
                    {task.segment && <Tag bordered={false}>{task.segment}</Tag>}
                  </Space>
                )}
                description={(
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">{task.message}</Text>
                    <Text>{task.action}</Text>
                    {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>验收：{task.acceptance_criteria.slice(0, 2).join('；')}</Text>
                    )}
                    <BatchPlanReviewPreview task={task} />
                    <RecoveryEvidenceReviewPreview
                      task={task}
                      taskIndex={taskIndex}
                      currentRun={run}
                      runRecords={runRecords}
                      actionFeedbackByKey={recoveryEvidenceActionFeedbackByKey}
                      onRecoveryEvidenceReviewRowAction={(row, rowAction) => handleRecoveryEvidenceReviewRowAction(task, taskIndex, row, rowAction)}
                    />
                    <RecoveryEvidenceRegovernancePreview task={task} />
                    <SafeBatchExpansionSegmentPreview task={task} />
                    <NextChapterQualityPlanPreview task={task} />
                    <DeliveryRiskReviewPreview task={task} />
                  </Space>
                )}
              />
            </List.Item>
            )
          }}
        />
      </Space>
    </Card>
  )
}

export function ReleaseBatchRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const results = Array.isArray(output.results) ? output.results : []
  const failed = results.filter((item: any) => item.status === 'failed')
  const title = run.run_type === 'release_similarity_batch' ? '发布相似度批量任务' : '发布质检批量任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          {statusTag(run.status)}
          <Tag color="blue" bordered={false}>已处理 {output.processed || results.length || 0}</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? results.length - failed.length}</Tag>
          <Tag color={failed.length ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failed.length}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{output.phase || run.step_name || '-'}</Text>
        {results.length > 0 && (
          <List
            size="small"
            dataSource={results.slice(0, 30)}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    {statusTag(item.status)}
                    <Text>第{item.chapter_no}章</Text>
                    {typeof item.score === 'number' && <Tag color={item.score >= 78 ? 'green' : 'gold'} bordered={false}>质量 {item.score}</Tag>}
                    {typeof item.risk === 'number' && <Tag color={item.risk <= 35 ? 'green' : 'gold'} bordered={false}>风险 {item.risk}</Tag>}
                    {item.review_id && <Tag bordered={false}>报告 #{item.review_id}</Tag>}
                  </Space>
                  {item.error && <Text type="danger" style={{ fontSize: 12 }}>{item.error}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  )
}

export function ChapterGroupRunSummary({
  run,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
}: {
  run: any
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const postBatchQuality = buildPostBatchQualityCheckSummary(run)
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const success = chapters.filter((item: any) => item.status === 'success').length
  const failed = chapters.filter((item: any) => item.status === 'failed').length
  const skipped = chapters.filter((item: any) => item.status === 'skipped' || item.status === 'written').length
  const total = chapters.length
  const percent = total ? Math.round(((success + skipped) / total) * 100) : 0
  const stageColor = (status?: string) => (
    status === 'success' ? 'green'
      : status === 'failed' ? 'red'
        : status === 'running' ? 'blue'
          : status === 'warn' ? 'gold'
            : status === 'skipped' ? 'default'
              : 'default'
  )
  return (
    <Card size="small" title="章节群执行">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>进度 {success + skipped}/{total}</Tag>
          <Tag color="green" bordered={false}>成功 {success}</Tag>
          <Tag color={failed ? 'red' : 'default'} bordered={false}>失败 {failed}</Tag>
          <Tag bordered={false}>跳过 {skipped}</Tag>
          <Tag bordered={false}>当前 {output.current_index ?? 0}</Tag>
        </Space>
        <Progress percent={percent} size="small" />
        {output.phase && <Text type="secondary" style={{ fontSize: 12 }}>{output.phase}</Text>}
        {postBatchQuality?.visible && (
          <Card size="small" title={postBatchQuality.title} styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Tag color={postBatchQuality.statusColor} bordered={false}>{postBatchQuality.statusLabel}</Tag>
                <Tag bordered={false}>{postBatchQuality.chapterText}</Tag>
                <Tag bordered={false}>完成 {postBatchQuality.completedCount} 章</Tag>
                {postBatchQuality.averageScore !== null && (
                  <Tag color={postBatchQuality.averageScore >= 78 ? 'green' : 'gold'} bordered={false}>平均 {postBatchQuality.averageScore} 分</Tag>
                )}
                {postBatchQuality.revisedCount > 0 && <Tag color="blue" bordered={false}>已修订 {postBatchQuality.revisedCount}</Tag>}
                {postBatchQuality.warningCount > 0 && <Tag color="gold" bordered={false}>复核项 {postBatchQuality.warningCount}</Tag>}
                {postBatchQuality.source && <Tag bordered={false}>{postBatchQuality.source}</Tag>}
              </Space>
              {postBatchQuality.checks.length > 0 && (
                <Space wrap size={[4, 4]}>
                  {postBatchQuality.checks.map((check: any) => (
                    <Tag key={`post-batch-quality-${check.key}`} color={check.statusColor} bordered={false}>
                      {check.label}{check.warningCount > 0 ? ` ${check.warningCount}` : ''}
                    </Tag>
                  ))}
                </Space>
              )}
              {postBatchQuality.checks.some((check: any) => check.summaries.length > 0) && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  {postBatchQuality.checks.filter((check: any) => check.summaries.length > 0).slice(0, 3).map((check: any) => (
                    <Text key={`post-batch-quality-summary-${check.key}`} type="secondary" style={{ fontSize: 12 }}>
                      {check.label}：{check.summaries.slice(0, 2).join('；')}
                    </Text>
                  ))}
                </Space>
              )}
            </Space>
          </Card>
        )}
        <Space wrap size={[4, 4]}>
          {chapters.slice(0, 80).map((chapter: any) => (
            <Tag
              key={`${chapter.id || chapter.chapter_no}-${chapter.status}`}
              color={chapter.status === 'success' ? 'green' : chapter.status === 'failed' ? 'red' : chapter.status === 'running' ? 'blue' : chapter.status === 'skipped' ? 'default' : 'gold'}
              bordered={false}
            >
              第{chapter.chapter_no}章 · {chapter.status || 'pending'}{chapter.score ? ` · ${chapter.score}分` : ''}
            </Tag>
          ))}
        </Space>
        {chapters.some((chapter: any) => Array.isArray(chapter.stages) && chapter.stages.length > 0) && (
          <Card size="small" title="章节流水线阶段" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {chapters.slice(0, 12).map((chapter: any) => {
                const stages = Array.isArray(chapter.stages) ? chapter.stages : []
                if (!stages.length) return null
                return (
                  <div key={`stages-${chapter.id || chapter.chapter_no}`} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                    <Text strong style={{ fontSize: 12 }}>第{chapter.chapter_no}章</Text>
                    <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                      {stages.map((stage: any) => (
                        <Tag key={`${chapter.id || chapter.chapter_no}-${stage.key}`} color={stageColor(stage.status)} bordered={false}>
                          {stage.label || stage.key}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )
              })}
            </Space>
          </Card>
        )}
        {output.last_error && (
          <Paragraph type="danger" style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>
            第{output.last_error.chapter_no}章失败：{output.last_error.error}
          </Paragraph>
        )}
        {chapters.some((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)) && (
          <Card size="small" title="可操作章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {chapters.filter((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)).slice(0, 10).map((chapter: any) => {
                const actionState = chapterGroupActionState(chapter)
                return (
                  <Space key={`action-${chapter.id || chapter.chapter_no}`} style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={2}>
                      <Text style={{ fontSize: 12 }}>第{chapter.chapter_no}章 · {chapter.error || chapter.approval_stage || chapter.status}</Text>
                      {actionState.blockedByApprovalBlocker && <Text type="secondary" style={{ fontSize: 12 }}>{actionState.actionHint}</Text>}
                    </Space>
                    <Space>
                      {actionState.canApprove && onApproveChapterGroup && <Button size="small" type="link" onClick={() => onApproveChapterGroup(run, chapter)}>确认</Button>}
                      {actionState.canRetry && onRetryChapterGroup && <Button size="small" type="link" onClick={() => onRetryChapterGroup(run, chapter)}>重试</Button>}
                      {actionState.canSkip && onSkipChapterGroup && <Button size="small" type="link" danger onClick={() => onSkipChapterGroup(run, chapter)}>跳过</Button>}
                    </Space>
                  </Space>
                )
              })}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}
