import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
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
  buildSafeBatchExpansionStructureDecisionExecutionReview,
} from './helpers-safe-batch-expansion-structure'

export function batchBriefChapterNos(batchBrief: AnyRecord | null | undefined) {
  return new Set(arrayValue(batchBrief?.chapters)
    .map(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0))
    .filter(Boolean))
}

export function batchBriefVisible(batchBrief: AnyRecord | null | undefined) {
  if (!batchBrief) return false
  return Boolean(
    text(batchBrief?.batch_goal || batchBrief?.batchGoal)
    || text(batchBrief?.reader_payoff_plan || batchBrief?.readerPayoffPlan)
    || text(batchBrief?.mainline_focus || batchBrief?.mainlineFocus)
    || text(batchBrief?.forbidden_boundary || batchBrief?.forbiddenBoundary)
    || arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist).length
    || arrayValue(batchBrief?.chapters).length,
  )
}

export function batchBriefAppliesToItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return false
  const plannedNos = batchBriefChapterNos(batchBrief)
  return plannedNos.size === 0 || plannedNos.has(Number(item.chapterNo))
}

export function normalizeBatchBriefChapterPlan(value: any) {
  if (!value) return null
  return {
    chapter_no: Number(value.chapter_no ?? value.chapterNo ?? 0) || null,
    title: firstText(value.title),
    chapter_task: firstText(value.chapter_task, value.chapterTask, value.task),
    conflict: firstText(value.conflict),
    ending_hook: firstText(value.ending_hook, value.endingHook),
    mainline_progress: firstText(value.mainline_progress, value.mainlineProgress),
  }
}

export function buildBatchPlanContext(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return null
  const chapterPlan = arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo))
  return {
    batch_goal: firstText(batchBrief?.batch_goal, batchBrief?.batchGoal),
    reader_payoff_plan: firstText(batchBrief?.reader_payoff_plan, batchBrief?.readerPayoffPlan),
    mainline_focus: firstText(batchBrief?.mainline_focus, batchBrief?.mainlineFocus),
    forbidden_boundary: firstText(batchBrief?.forbidden_boundary, batchBrief?.forbiddenBoundary),
    chapter_plan: normalizeBatchBriefChapterPlan(chapterPlan),
  }
}

export function batchBriefStartChecklist(batchBrief: AnyRecord | null | undefined) {
  return arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist)
    .map(item => ({
      key: firstText(item?.key, item?.id, item?.type),
      label: firstText(item?.label, item?.name, item?.title, item?.key, '开工项'),
      detail: firstText(item?.detail, item?.summary, item?.description),
      status: firstText(item?.status),
    }))
    .filter(item => item.key || item.label || item.detail)
    .slice(0, 8)
}

export function checklistRiskReasons(key: string, counts: {
  coreRiskTotal: number
  runwayRiskTotal: number
  payoffDebtTotal: number
  readerPullRiskTotal: number
  handoffRiskTotal: number
  storylineRiskTotal: number
  storyDriveRiskTotal: number
  innovationRiskTotal: number
  signatureSceneRiskTotal: number
  chapterAttractionRiskTotal: number
  forbiddenBoundaryRiskTotal: number
  batchPlanRiskTotal: number
}) {
  if (key === 'core_promise') {
    return [
      counts.coreRiskTotal > 0 ? `核心偏移 ${counts.coreRiskTotal}` : '',
      counts.runwayRiskTotal > 0 ? `航线风险 ${counts.runwayRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'story_drive') {
    return [
      counts.storyDriveRiskTotal > 0 ? `故事力缺口 ${counts.storyDriveRiskTotal}` : '',
      counts.chapterAttractionRiskTotal > 0 ? `吸引力缺口 ${counts.chapterAttractionRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'reader_payoff') {
    return [
      counts.payoffDebtTotal > 0 ? `回报欠账 ${counts.payoffDebtTotal}` : '',
      counts.readerPullRiskTotal > 0 ? `读者拉力漏项 ${counts.readerPullRiskTotal}` : '',
      counts.handoffRiskTotal > 0 ? `章节交接漏接 ${counts.handoffRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'innovation') {
    return [
      counts.innovationRiskTotal > 0 ? `创新缺口 ${counts.innovationRiskTotal}` : '',
      counts.signatureSceneRiskTotal > 0 ? `强场面漏写 ${counts.signatureSceneRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'forbidden_boundary') {
    return [
      counts.forbiddenBoundaryRiskTotal > 0 ? `禁揭触碰 ${counts.forbiddenBoundaryRiskTotal}` : '',
      counts.storylineRiskTotal > 0 ? `剧情线误触/漏推 ${counts.storylineRiskTotal}` : '',
    ].filter(Boolean)
  }
  return counts.batchPlanRiskTotal > 0 ? [`批次计划风险 ${counts.batchPlanRiskTotal}`] : []
}

export function buildBatchChecklistExecution(args: {
  nextBatchBrief?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    runwayRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
    handoffRiskTotal: number
    storylineRiskTotal: number
    storyDriveRiskTotal: number
    innovationRiskTotal: number
    signatureSceneRiskTotal: number
    chapterAttractionRiskTotal: number
    forbiddenBoundaryRiskTotal: number
    batchPlanRiskTotal: number
  }
}): AutoCreationBatchChecklistExecution {
  const checklist = batchBriefStartChecklist(args.nextBatchBrief)
  if (!checklist.length) {
    return {
      visible: false,
      status: 'ok',
      score: 100,
      summary: '本批没有开工清单。',
      items: [],
      missed: [],
    }
  }
  const items: AutoCreationBatchChecklistExecutionItem[] = checklist.map(item => {
    const reasons = checklistRiskReasons(item.key, args.counts)
    const status: AutoCreationBatchRiskStatus = reasons.length > 0 ? 'warn' : 'ok'
    return {
      key: item.key,
      label: item.label,
      status,
      planned: item.detail,
      detail: status === 'warn'
        ? `未完全兑现：${item.detail || item.label}；关联风险：${reasons.join('、')}`
        : `已兑现：${item.detail || item.label}`,
      evidence: reasons,
    }
  })
  const missed = items.filter(item => item.status === 'warn')
  const score = checklist.length > 0 ? clampScore(((items.length - missed.length) / items.length) * 100) : 100
  return {
    visible: true,
    status: missed.length > 0 ? 'warn' : 'ok',
    score,
    summary: missed.length > 0
      ? `批次开工清单 ${items.length - missed.length}/${items.length} 项兑现，${missed.length} 项需要修复。`
      : `批次开工清单 ${items.length}/${items.length} 项兑现。`,
    items,
    missed,
  }
}

export function first30RetentionAppliesToBatch(items: AutoCreationBatchReviewItem[]) {
  return items.some(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  })
}

export function first30RetentionRisk(args: {
  first30Retention?: PlanningWorkspaceModel['first30Retention'] | null
  items: AutoCreationBatchReviewItem[]
}) {
  const retention = args.first30Retention
  const status = text(retention?.status)
  if (!first30RetentionAppliesToBatch(args.items) || !['stale', 'needs_repair', 'blocked'].includes(status)) {
    return {
      count: 0,
      summary: '当前批次不需要前30章留存复诊',
      context: null as AnyRecord | null,
    }
  }
  const risks = arrayValue(retention?.risks)
  const riskyCards = arrayValue(retention?.chapterCards).filter(card => text(card?.riskLevel) && text(card?.riskLevel) !== 'ok')
  const count = Math.max(1, risks.length, riskyCards.length)
  const nextActions = arrayValue(retention?.nextActions).map(action => text(action)).filter(Boolean)
  return {
    count,
    summary: text(retention?.summary, status === 'stale' ? '需重新诊断：前30章内容已更新。' : '前30章留存诊断需要处理。'),
    context: {
      status,
      score: retention?.score ?? null,
      stale: Boolean(retention?.stale),
      summary: text(retention?.summary),
      action_key: text(retention?.actionKey, status === 'stale' ? 'run_first30_retention' : 'create_first30_repair'),
      risks,
      next_actions: nextActions,
      risky_chapters: riskyCards.map(card => ({
        chapter_no: Number(card?.chapterNo ?? card?.chapter_no ?? 0) || null,
        title: text(card?.title),
        score: card?.score ?? null,
        flags: arrayValue(card?.flags).map(flag => text(flag)).filter(Boolean),
        risk_level: text(card?.riskLevel),
      })),
    },
  }
}

export function normalizePostBatchQualityCheck(source: AnyRecord | null | undefined) {
  const raw = source?.post_batch_quality_check || source?.postBatchQualityCheck || source || null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      visible: false,
      status: 'ok' as AutoCreationBatchRiskStatus,
      source: '',
      warning_count: 0,
      chapter_nos: [] as number[],
      average_score: null as number | null,
      revised_count: 0,
      checks: [] as AnyRecord[],
      summary: '',
    }
  }
  const checks = arrayValue(raw.checks).map((check: AnyRecord) => {
    const status = text(check?.status).toLowerCase()
    const warnCount = Number(check?.warn_count ?? check?.warnCount ?? 0)
    const unknownCount = Number(check?.unknown_count ?? check?.unknownCount ?? 0)
    const warningCount = warnCount > 0 ? warnCount : ['warn', 'warning', 'failed', 'error'].includes(status) ? 1 : 0
    return {
      key: text(check?.key),
      label: text(check?.label || check?.key, '批次质检'),
      status: warningCount > 0 ? 'warn' : unknownCount > 0 || status === 'unknown' ? 'unknown' : status || 'ok',
      checked_count: Number(check?.checked_count ?? check?.checkedCount ?? 0) || 0,
      warn_count: warningCount,
      unknown_count: unknownCount,
      summaries: arrayValue(check?.summaries).map(item => text(item)).filter(Boolean),
    }
  }).filter((check: AnyRecord) => check.key || check.label)
  const warningChecks = checks.filter((check: AnyRecord) => check.warn_count > 0 || ['warn', 'failed', 'error', 'unknown'].includes(text(check.status)))
  const warningCount = warningChecks.reduce((sum: number, check: AnyRecord) => sum + Math.max(1, Number(check.warn_count || 0)), 0)
  const status: AutoCreationBatchRiskStatus = warningCount > 0 || text(raw.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const chapterNos = arrayValue(raw.chapter_nos || raw.chapterNos).map(chapterNo => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const summaryParts = warningChecks.map((check: AnyRecord) => {
    const detail = arrayValue(check.summaries).slice(0, 1).join('；')
    return detail ? `${check.label}：${detail}` : check.label
  })
  return {
    visible: checks.length > 0 || text(raw.source) || text(raw.status),
    status,
    source: text(raw.source),
    warning_count: warningCount,
    chapter_nos: chapterNos,
    average_score: numberValue(raw.average_score ?? raw.averageScore),
    revised_count: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    checks: warningChecks,
    summary: summaryParts.slice(0, 3).join('；') || (status === 'warn' ? '批次交稿后质检存在未闭环项。' : '批次交稿后质检通过。'),
  }
}

export * from './helpers-batch-handoff-and-launch'
