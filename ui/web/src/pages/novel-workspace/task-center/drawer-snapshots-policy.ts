import { parseJsonValue } from './chapter-group'
import type {
  SafeBatchExpansionFeedbackSnapshot,
  SafeBatchExpansionPolicySnapshot,
  SafeBatchRecoveryFocusSnapshot,
  SafeBatchRecoveryRoadmapNodeSnapshot,
  SafeBatchRecoveryRoadmapSnapshot,
  SafeBatchRecoveryValidationReviewCtaSnapshot,
  SafeBatchRecoveryValidationSnapshot,
} from './drawer-model'
import { compactEvidenceText, normalizeChapterNos } from './drawer-model'
import { buildSafeBatchRecoveryRestoreStabilityLaneSnapshot } from './drawer-snapshots-lane'
import { buildSafeBatchExpansionFeedbackSnapshot } from './drawer-snapshots-structure'

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

export function safeBatchExpansionFeedbackColor(status: SafeBatchExpansionFeedbackSnapshot['status']) {
  if (status === 'recovered' || status === 'passed') return 'green'
  if (status === 'rollback_to_single_chapter') return 'red'
  if (status === 'rollback_to_small_batch') return 'gold'
  return 'blue'
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

