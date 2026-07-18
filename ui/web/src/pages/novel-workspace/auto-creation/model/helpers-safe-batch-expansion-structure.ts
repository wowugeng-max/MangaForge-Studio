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
  chapterExpansionStructureDecisionReceipts,
  defaultFiveChapterLaneRedesignFromDecision,
  expansionStructureDecisionRequirementDelivered,
  expansionStructureDecisionRequirements,
  expansionStructureDecisionSyncPayload,
  latestExpansionStructureDecisionSyncReview,
  normalizeDefaultFiveChapterLaneTemplateVersion,
  safeBatchDefaultRecoveryRiskCountForReason,
  safeBatchExpansionPolicyFromPreflight,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentKey,
  safeBatchExpansionStructureDecisionFromContext,
} from './helpers-safe-batch-recovery'

export function buildSafeBatchExpansionStructureDecisionExecutionReview(args: {
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const decision = safeBatchExpansionStructureDecisionFromContext({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
  })
  if (!decision) {
    return {
      visible: false,
      status: 'ok' as const,
      label: '扩批结构决策',
      summary: '当前批次没有扩批结构决策。',
      recommendation: '',
      target_chapter_count: 0,
      segment_label: '',
      observation_metrics: [],
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      chapters: [],
    }
  }
  const requirements = expansionStructureDecisionRequirements(decision)
  const defaultFiveChapterLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(decision)
  const successfulItems = args.items.filter(item => item.status === 'success')
  const chapterReviews = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item)
    const syncReview = chapter ? latestExpansionStructureDecisionSyncReview(args.reviews, chapter, item.chapterNo) : null
    const payload = expansionStructureDecisionSyncPayload(syncReview)
    const receipts = chapterExpansionStructureDecisionReceipts(chapter)
    const explicitMissed = arrayValue(payload?.missed || payload?.misses || payload?.failed_items || payload?.failedItems)
      .map((missed: any) => ({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId || null,
        key: firstText(missed?.key, missed?.type, missed?.kind, 'expansion_structure_decision'),
        label: firstText(missed?.label, missed?.title, missed?.key, '扩批结构决策'),
        text: firstText(missed?.text, missed?.description, missed?.reason, missed?.issue),
      }))
      .filter((missed: AnyRecord) => missed.label || missed.text)
    const payloadStatus = text(payload?.status).toLowerCase()
    const passed = ['ok', 'pass', 'passed', 'success'].includes(payloadStatus) || payload?.passed === true
    const missing = passed
      ? []
      : explicitMissed.length > 0
        ? explicitMissed
        : requirements
          .filter(requirement => expansionStructureDecisionRequirementDelivered({
            key: requirement.key,
            payload,
            receipts,
          }) !== true)
          .map(requirement => ({
            chapter_no: item.chapterNo,
            chapter_id: item.chapterId || null,
            key: requirement.key,
            label: requirement.label,
            text: requirement.planned,
          }))
    return {
      chapter_no: item.chapterNo,
      chapter_id: item.chapterId || null,
      title: item.title,
      status: missing.length > 0 ? 'warn' as const : 'ok' as const,
      missed: missing,
      evidence: [
        ...arrayValue(payload?.evidence).map(item => text(item)).filter(Boolean),
        ...receipts.flatMap(receipt => arrayValue(receipt?.evidence).map(item => text(item)).filter(Boolean)),
      ].slice(0, 6),
    }
  })
  const failedItems = chapterReviews.flatMap(review => review.missed)
  const missedChapterNos = Array.from(new Set(failedItems.map(item => Number(item.chapter_no || 0)).filter(chapterNo => chapterNo > 0)))
  return {
    visible: true,
    status: failedItems.length > 0 ? 'warn' as const : 'ok' as const,
    label: '扩批结构决策',
    summary: failedItems.length > 0
      ? `${decision.label}未落地：第${missedChapterNos.join('、')}章有 ${failedItems.length} 项段位职责、观察指标或重构原则缺口。`
      : `${decision.label}已落地：本批章节均提供段位职责和观察指标执行证据。`,
    recommendation: decision.recommendation,
    target_chapter_count: decision.target_chapter_count,
    mode_label: decision.mode_label,
    segment_key: decision.segment_key,
    segment_label: decision.segment_label,
    source_run_id: decision.source_run_id,
    instruction: decision.instruction,
    observation_metrics: decision.observation_metrics,
    ...(defaultFiveChapterLaneRedesign ? { default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign } : {}),
    risk_count: failedItems.length,
    missed_chapter_nos: missedChapterNos,
    failed_items: failedItems,
    requirements,
    chapters: chapterReviews,
  }
}

export * from './helpers-safe-batch-expansion-trends'
