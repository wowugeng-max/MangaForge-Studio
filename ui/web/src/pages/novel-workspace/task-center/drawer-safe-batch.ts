/** Safe-batch / recovery focus types and pure helpers for task center drawer. */

import {
  buildDefaultLaneFocusObligationStatuses,
  buildDefaultLaneProductionRelapseClosure,
  compactEvidenceText,
  repairTaskFocusRequirementMatches,
  repairTaskIssueType,
} from './drawer-model'

export type StrengthenedRepairAcceptanceTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  acceptedBatchCount: number
  failedBatchCount: number
  passStreak: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestBatchLabel: string
  latestRunId: any | null
  sourceEvidence: string[]
  dimensions: {
    core: { label: string; failedCount: number }
    payoff: { label: string; failedCount: number }
    readerPull: { label: string; failedCount: number }
  }
}

export type SafeBatchExpansionPolicySnapshot = {
  visible: boolean
  status: 'observing' | 'expanded' | 'recovering'
  label: string
  summary: string
  targetChapterCount: number
  baseChapterCount: number
  expandedChapterCount: number
  requiredPassStreak: number
  passStreak: number
  acceptedBatchCount: number
  failedBatchCount: number
  latestStatus: 'none' | 'ok' | 'warn'
  expansionFeedback: SafeBatchExpansionFeedbackSnapshot | null
  recoveryRoadmap: SafeBatchRecoveryRoadmapSnapshot | null
  recoveryValidation: SafeBatchRecoveryValidationSnapshot | null
  recoveryRestoreStabilityLane: SafeBatchRecoveryRestoreStabilityLaneSnapshot | null
}

export type SafeBatchRecoveryRestoreStabilityLaneSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  stablePassStreak: number
  requiredStablePassStreak: number
  defaultFiveChapterReady: boolean
  restoreChapterNos: number[]
  validationChapterNos: number[]
  summary: string
  taskCenterFilterLabel: string
  latestTemplateVersionProfile: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchRecoveryRoadmapSnapshot = {
  visible: boolean
  label: string
  currentLane: string
  currentLaneLabel: string
  currentTargetChapterCount: number
  currentStatus: string
  currentReason: string
  recommendedFocus: SafeBatchRecoveryFocusSnapshot | null
  nextRepairLayer: SafeBatchRecoveryRoadmapNodeSnapshot | null
  routeNodes: SafeBatchRecoveryRoadmapNodeSnapshot[]
}

export type SafeBatchRecoveryFocusSnapshot = {
  layerKey: string
  layerLabel: string
  actionLabel: string
  targetView: string
  issueType: string
  source: string
  taskStatuses: string[]
  taskCenterFilterLabel: string
  requirementKey?: string
  templateVersionId?: string
}

export type SafeBatchRecoveryValidationSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  validationChapterNos: number[]
  failedChapterNos: number[]
  riskCount: number
  targetChapterCount: number
  nextActionKind: 'confirm_restore_five' | 'focus_repair'
  nextActionLabel: string
  reviewCta: SafeBatchRecoveryValidationReviewCtaSnapshot | null
  focus: SafeBatchRecoveryFocusSnapshot | null
  defaultFiveChapterRecoveryVerdict: SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null
  defaultFiveChapterLaneTemplateVerdict: SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null
}

export type SafeBatchRecoveryValidationReviewCtaSnapshot = {
  kind: 'enter_five_chapter_observation' | 'restore_default_lane' | 'repair_production_relapse'
  label: string
  summary: string
  targetChapterCount: number
  remainingFailureReasons: string[]
  clearedFailureReasons: string[]
  focus: SafeBatchRecoveryFocusSnapshot | null
}

export type SafeBatchRecoveryRoadmapNodeSnapshot = {
  key: string
  label: string
  status: 'ok' | 'warn' | 'pending'
  targetChapterCount: number
  detail: string
  actionLabel: string
  focus: SafeBatchRecoveryFocusSnapshot | null
}

export function safeBatchRecoveryFocusMatchesTask(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, task: any) {
  if (!focus || !task) return false
  const issueType = repairTaskIssueType(task)
  const source = compactEvidenceText(task?.source || task?.sourceMode || '')
  const status = compactEvidenceText(task?.task_status || task?.taskStatus || task?.status || '')
  const statusMatches = !focus.taskStatuses.length || focus.taskStatuses.includes(status)
  if (!statusMatches) return false
  if (!repairTaskFocusRequirementMatches(focus.requirementKey, task)) return false
  if (focus.issueType && issueType === focus.issueType) return true
  return Boolean(focus.source && source === focus.source)
}

function safeBatchRecoveryFocusMatchesTaskIdentity(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, task: any) {
  if (!focus || !task) return false
  const issueType = repairTaskIssueType(task)
  const source = compactEvidenceText(task?.source || task?.sourceMode || '')
  if (!repairTaskFocusRequirementMatches(focus.requirementKey, task)) return false
  if (focus.issueType && issueType === focus.issueType) return true
  return Boolean(focus.source && source === focus.source)
}

export function buildSafeBatchRecoveryFocusReviewState(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, items: any[] = []) {
  const matchedItems = focus ? items.filter((item: any) => safeBatchRecoveryFocusMatchesTaskIdentity(focus, item?.task || item)) : []
  const activeItems = matchedItems.filter((item: any) => safeBatchRecoveryFocusMatchesTask(focus, item?.task || item))
  const resolvedItems = matchedItems.filter((item: any) => {
    const task = item?.task || item
    const status = compactEvidenceText(task?.task_status || task?.taskStatus || task?.status || '')
    return status === 'resolved'
  })
  const actionLabel = compactEvidenceText(focus?.actionLabel || focus?.layerLabel || '路线图聚焦')
  const status = activeItems.length > 0
    ? 'active'
    : resolvedItems.length > 0
      ? 'ready_for_recheck'
      : 'empty'
  const productionRelapseClosure = buildDefaultLaneProductionRelapseClosure(focus, activeItems, resolvedItems)
  const nextActionLabel = status === 'active'
    ? `继续${actionLabel}`
    : status === 'ready_for_recheck'
      ? productionRelapseClosure
        ? '启动生产后验验证批'
        : '刷新路线图并启动验证批'
      : '等待匹配任务'
  const obligationStatuses = buildDefaultLaneFocusObligationStatuses(focus, activeItems, resolvedItems)
  const obligationSummary = obligationStatuses.length
    ? `四项回检：${obligationStatuses.map(item => item.text).join('、')}。`
      : ''
  const productionRelapseSummary = productionRelapseClosure
    ? `${productionRelapseClosure.closeText}${productionRelapseClosure.detailText ? `${productionRelapseClosure.detailText}。` : ''}不能只补 default_lane_*_delivered。`
    : ''
  const summary = status === 'active'
    ? `${actionLabel}仍有 ${activeItems.length} 个待处理任务，${obligationSummary}${productionRelapseSummary}先闭环后再回到安全连写验证。`
    : status === 'ready_for_recheck'
      ? `${actionLabel}已处理 ${resolvedItems.length} 个匹配任务，${obligationSummary}${productionRelapseSummary}刷新路线图后可判断启动验证批还是继续修下一层。`
      : '暂未找到路线图匹配任务，可打开最近安全连写或修复历史查看复盘记录。'
  return {
    status,
    matchedCount: matchedItems.length,
    activeCount: activeItems.length,
    resolvedCount: resolvedItems.length,
    activeItems,
    resolvedItems,
    nextActionLabel,
    summary,
    obligationStatuses,
    productionRelapseClosure,
  }
}

export type SafeBatchExpansionFeedbackSnapshot = {
  visible: boolean
  status: 'none' | 'passed' | 'recovered' | 'rollback_to_small_batch' | 'rollback_to_single_chapter'
  label: string
  summary: string
  targetChapterCount: number
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  riskCount: number
  stablePassStreak: number
  recentExpandedBatchCount: number
  repeatedHotspotSegment: {
    key: string
    label: string
    count: number
    summary: string
  } | null
  structureValidationTrend: SafeBatchExpansionStructureValidationTrendSnapshot | null
  structureValidationResult: SafeBatchExpansionStructureValidationResultSnapshot | null
  structureRepairEffectiveness: SafeBatchExpansionStructureRepairEffectivenessSnapshot | null
  structureDecisionTrend: SafeBatchExpansionStructureDecisionTrendSnapshot | null
  defaultFiveChapterLaneTemplateStabilityProfile: SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot | null
  recoveryRestoreStabilityEvidence: SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null
  defaultFiveChapterRegression: SafeBatchDefaultFiveChapterRegressionSnapshot | null
  defaultFiveChapterRecoveryVerdictRelapse: SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot | null
}

export type SafeBatchRecoveryRestoreStabilityEvidenceSnapshot = {
  status: string
  source: string
  restoredBatchCreatedAt: string
  restoreChapterNos: number[]
  validationChapterNos: number[]
  stablePassStreak: number
  summary: string
}

export type SafeBatchDefaultFiveChapterRegressionSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  stablePassStreak: number
  requiredStablePassStreak: number
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  validationChapterNos: number[]
  repeatedHotspotSegment: {
    key: string
    label: string
    riskCount: number
  } | null
  failureReasons: string[]
  templateVersionId: string
  templateVersion: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
  templateVersionFailedRequirements: {
    key: string
    label: string
    failureReason: string
  }[]
  summary: string
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  failureReasons: string[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'cleared' | 'remaining'
    riskCount: number
  }[]
}

type SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot = {
  id: string
  label: string
  source: string
  redesignSource: string
  sourceRunId: any
  summary: string
  latestStatus?: string
  latestBatchCreatedAt?: string
  latestChapterNos?: number[]
  validationBatchCount?: number
  passedBatchCount?: number
  failedBatchCount?: number
  passStreak?: number
  requiredPassStreak?: number
  status?: string
  productionValidationFailedCount?: number
  latestProductionRelapseVerdict?: SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null
}

export type SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot = {
  key: string
  label: string
  failureReason: string
  chapterNos: number[]
}

export type SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  failureReasons: string[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'cleared' | 'remaining'
    riskCount: number
  }[]
  failedCount: number
  failedRequirements: SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[]
  summary: string
}

export type SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  validationChapterNos: number[]
  requirements: {
    key: string
    label: string
    status: 'fulfilled' | 'missing' | 'unverified'
  }[]
  missingCount: number
  missingRequirements: {
    key: string
    label: string
    chapterNos: number[]
  }[]
  productionFailedCount: number
  productionRelapseVerdict: SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null
  productionFailedRequirements: SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[]
  templateVersion: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot = {
  visible: boolean
  status: string
  label: string
  summary: string
  latestStatus: string
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  validationBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  passStreak: number
  requiredPassStreak: number
  recommendation: string
  failedRequirementCount: number
  requirements: {
    key: string
    label: string
    passedCount: number
    failedCount: number
    latestStatus: string
    latestMissingChapterNos: number[]
  }[]
  topFailedRequirement: {
    key: string
    label: string
    failedCount: number
  } | null
  templateVersionProfiles: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot[]
  latestTemplateVersionProfile: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  summary: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  relapseBatchChapterNos: number[]
  relapsedChapterNos: number[]
  repeatedHotspotSegment: {
    key: string
    label: string
    riskCount: number
  } | null
  failureReasons: string[]
  clearedFailureReasons: string[]
  relapsedFailureReasons: string[]
  stableFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'relapsed' | 'stable'
    riskCount: number
  }[]
}

export type SafeBatchDefaultFiveChapterLaneRedesignSnapshot = {
  visible: boolean
  label: string
  reason: string
  relapseCount: number
  repeatedFailureReasons: string[]
  missedRequirements: {
    key: string
    label: string
    count: number
  }[]
  summary: string
}

export type SafeBatchExpansionStructureValidationResultSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  validationChapterNos: number[]
  failedChapterNos: number[]
  riskCount: number
  defaultFiveChapterRecoveryVerdict: SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null
  defaultFiveChapterLaneTemplateVerdict: SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null
}

export type SafeBatchExpansionStructureValidationTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  segmentKey: string
  segmentLabel: string
  validationBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  passRate: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestChapterNos: number[]
  failureReasons: {
    key: string
    label: string
    count: number
  }[]
  recurrenceAfterRestore: {
    visible: boolean
    intervalBatchCount: number
    intervalLabel: string
    recurrenceChapterNos: number[]
  }
}

export type SafeBatchExpansionStructureRepairEffectivenessSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  sourceRunId: any | null
  repairedAt: string
  segmentKey: string
  segmentLabel: string
  baselinePassRate: number
  currentPassRate: number
  passRateDelta: number
  baselineFailureReasonCount: number
  currentFailureReasonCount: number
  failureReasonDelta: number
  baselineRecurrenceIntervalBatchCount: number
  currentRecurrenceIntervalBatchCount: number
  recommendation: string
  baselineTrend: any | null
  currentTrend: any | null
  defaultFiveChapterRecoveryVerdictRelapseTrend: SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot | null
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot = {
  visible: boolean
  baselineRelapseCount: number
  currentRelapseCount: number
  repeatedRelapseCount: number
  repeatedFailureReasons: {
    reason: string
    count: number
  }[]
  recommendation: string
  summary: string
}

export type SafeBatchExpansionStructureDecisionTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  totalBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  latestSegmentKey: string
  latestSegmentLabel: string
  topFailedRecommendation: {
    key: string
    label: string
    count: number
  } | null
  topFailedRequirement: {
    key: string
    label: string
    count: number
  } | null
  failedRequirements: {
    key: string
    label: string
    count: number
  }[]
  topFailedSegment: {
    key: string
    label: string
    count: number
  } | null
  defaultFiveChapterLaneRedesign: SafeBatchDefaultFiveChapterLaneRedesignSnapshot | null
  suggestedTargetChapterCount: number
}

