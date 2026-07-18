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

export function safeBatchExpansionFeedbackColor(status: SafeBatchExpansionFeedbackSnapshot['status']) {
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

export function buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
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

export * from './drawer-run-summaries'
