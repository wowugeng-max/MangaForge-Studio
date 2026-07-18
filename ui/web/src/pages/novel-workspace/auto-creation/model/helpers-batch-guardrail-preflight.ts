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
  buildCanonRunway,
  buildRecoveryEvidenceGovernanceQueue,
  buildRecoveryEvidenceProductionGate,
  buildStrengthenedRepairAcceptanceTrend,
  characterArcNeedsAction,
  compactChapterNoEvidence,
  future100ReserveStatus,
  hasRunningTasks,
  retentionNeedsAction,
  rhythmNeedsAction,
  signal,
  storylineNeedsAction,
  strengthenedRepairAcceptanceTrendSnapshot,
  volumeBeatNeedsAction,
} from './helpers-main'
import {
  buildSafeBatchRecoveryRestoreConfirmation,
  safeBatchExpansionPolicySnapshot,
  safeBatchRecoveryRoadmapRecommendedAction,
} from './helpers-safe-batch-recovery'
import {
  buildBatchReleaseWindow,
  buildProductionRelapseReviewCta,
  buildRecoveryEvidenceDeepRepairQueue,
  buildRecoveryEvidenceSourceRiskProfile,
  buildRecoveryEvidenceTrend,
  buildSafeBatchRecoveryRestoreStabilityLane,
  buildSerialReleaseInventoryGuardrail,
  chapterHandoffDetail,
  normalizeSafeBatchChapterHandoffContract,
  normalizeSafeBatchDeliveryRiskCarryOver,
  productionRelapseCtaExecutionPayload,
  safeBatchRecoveryRestoreObservationConfirmation,
  writingQueueRelease,
} from './helpers-safe-batch-expansion-structure'
import {
  buildLongformMemoryAnchor,
  buildNextBatchBrief,
  buildNextBatchBriefRecovery,
  buildNextBatchBriefRecoveryEvidence,
  buildNextBatchBriefRepair,
  buildNextBatchBriefSignal,
  buildRecoveryEvidenceReleaseSummary,
  buildResolvedSafeBatchExpansionStructureVerificationSeed,
  buildStyleSampleBatchPreflight,
  buildStyleSampleBatchPreflightSignal,
  buildStyleSampleTaskBookRecoveryEvidence,
  chapterRangeLabel,
} from './helpers-next-batch-brief'
import {
  arrayValue,
  deliveryRiskRepairPayload,
  firstText,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  buildSafeBatchExpansionFeedback,
} from './helpers-safe-batch-expansion-feedback'
import {
  buildSafeBatchExpansionPolicy,
} from './helpers-safe-batch-expansion-policy'

export const SAFE_BATCH_MODEL_PIPELINE = [
  '章节任务书',
  '正文初稿',
  '字数门禁',
  '商业主编改稿',
  '自检修订',
  '故事状态/剧情线回填',
]

export function buildBatchPreflight(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  releaseWindow: AutoCreationBatchReleaseWindow
  nextBatchBrief: AutoCreationNextBatchBrief
  guardrails: AutoCreationBatchGuardrailSignal[]
  storyState?: AnyRecord | null
  governanceRecheckMemory?: AutoCreationGovernanceRecheckMemory | null
  deliveryRiskCarryOver?: AnyRecord | null
  chapterHandoffContract?: AnyRecord | null
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  styleSampleBatchPreflight?: AnyRecord | null
  recoveryEvidence?: string[]
  recoveryEvidenceProductionGate?: AnyRecord | null
  recoveryEvidenceReleaseSummary?: AnyRecord | null
  recoveryEvidenceSourceRiskProfile?: AnyRecord | null
  strengthenedRepairAcceptanceTrend?: AutoCreationStrengthenedRepairAcceptanceTrend | null
  safeBatchExpansionPolicy?: AnyRecord | null
  safeBatchRecoveryRestoreConfirmation?: AnyRecord | null
  safeBatchRecoveryRestoreStabilityLane?: AnyRecord | null
}): AutoCreationBatchPreflight {
  const allowedChapterNos = args.releaseWindow.allowedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const blockedChapterNos = args.releaseWindow.blockedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const guardrailWarnings = args.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => `${item.label}：${item.detail}`)
  const blockedWarnings = args.releaseWindow.blockedChapters
    .map(chapter => `第${chapter.chapterNo}章《${chapter.title}》被拦截：${chapter.reason}`)
  const warnings = Array.from(new Set([...guardrailWarnings, ...blockedWarnings])).slice(0, 8)
  const visible = args.nextBatchBrief.visible || allowedChapterNos.length > 0 || blockedChapterNos.length > 0
  const expansionStructureVerification = args.nextBatchBrief.expansionStructureVerification || null
  const summary = args.status === 'ready'
    ? `本批将按护栏放行 ${allowedChapterNos.length} 章：${args.nextBatchBrief.chapterRangeLabel || allowedChapterNos.map(no => `第${no}章`).join('、')}。`
    : args.status === 'caution'
      ? `本批只放行 ${allowedChapterNos.length || args.safeChapterCount} 章，后续章节需要先处理黄色风险。`
      : '当前护栏未通过，不会启动安全连写。'
  const longformMemoryAnchor = buildLongformMemoryAnchor(args.storyState || {})
  const storylineDecisionClosure = {
    status: args.storylineDecisionGate.status === 'ok' ? 'ok' : 'blocked',
    label: args.storylineDecisionGate.label,
    open_count: args.storylineDecisionGate.openCount,
    summary: args.storylineDecisionGate.summary,
    tasks: args.storylineDecisionGate.taskTitles,
  }
  const governanceRecheckMemory = args.governanceRecheckMemory?.visible
    ? {
      source_run_id: args.governanceRecheckMemory.sourceRunId || null,
      status: args.governanceRecheckMemory.status,
      label: args.governanceRecheckMemory.label,
      summary: args.governanceRecheckMemory.summary,
      evidence: args.governanceRecheckMemory.evidence,
      failed_evidence: args.governanceRecheckMemory.failedEvidence,
      watch_items: args.governanceRecheckMemory.watchItems,
      storyline_decision_task_count: args.governanceRecheckMemory.storylineDecisionTaskCount,
    }
    : null

  return {
    visible,
    status: args.status,
    title: '安全连写预执行确认',
    summary,
    allowedChapterNos,
    blockedChapterNos,
    modelPipeline: SAFE_BATCH_MODEL_PIPELINE,
    warnings,
    longformMemoryAnchor,
    governanceRecheckMemory,
    chapterHandoffContract: args.chapterHandoffContract || null,
    inputSnapshot: {
      source: 'auto_creation_safe_batch_preflight',
      guardrail_status: args.status,
      safe_chapter_count: args.safeChapterCount,
      allowed_chapter_nos: allowedChapterNos,
      blocked_chapter_nos: blockedChapterNos,
      chapter_range_label: args.nextBatchBrief.chapterRangeLabel,
      release_window: args.releaseWindow,
      next_batch_brief: args.nextBatchBrief,
      guardrails: args.guardrails,
      model_pipeline: SAFE_BATCH_MODEL_PIPELINE,
      warnings,
      ...(arrayValue(args.recoveryEvidence).length ? { recovery_evidence: arrayValue(args.recoveryEvidence) } : {}),
      ...(args.recoveryEvidenceProductionGate ? { recovery_evidence_production_gate: args.recoveryEvidenceProductionGate } : {}),
      ...(args.recoveryEvidenceReleaseSummary ? { recovery_evidence_release_summary: args.recoveryEvidenceReleaseSummary } : {}),
      ...(args.recoveryEvidenceSourceRiskProfile?.visible ? { recovery_evidence_source_risk_profile: args.recoveryEvidenceSourceRiskProfile } : {}),
      ...(args.strengthenedRepairAcceptanceTrend?.visible ? {
        strengthened_repair_acceptance_trend: strengthenedRepairAcceptanceTrendSnapshot(args.strengthenedRepairAcceptanceTrend),
      } : {}),
      ...(args.safeBatchExpansionPolicy?.visible ? {
        safe_batch_expansion_policy: safeBatchExpansionPolicySnapshot(args.safeBatchExpansionPolicy),
      } : {}),
      ...(args.safeBatchRecoveryRestoreConfirmation ? {
        safe_batch_recovery_restore_confirmation: args.safeBatchRecoveryRestoreConfirmation,
      } : {}),
      ...(args.safeBatchRecoveryRestoreStabilityLane ? {
        safe_batch_recovery_restore_stability_lane: args.safeBatchRecoveryRestoreStabilityLane,
      } : {}),
      ...(expansionStructureVerification ? {
        safe_batch_expansion_structure_verification: expansionStructureVerification,
      } : {}),
      storyline_decision_closure: storylineDecisionClosure,
      ...(governanceRecheckMemory ? { governance_recheck_memory: governanceRecheckMemory } : {}),
      ...(args.styleSampleBatchPreflight?.visible ? { style_sample_batch_preflight: args.styleSampleBatchPreflight } : {}),
      ...(args.deliveryRiskCarryOver ? { delivery_risk_carry_over: args.deliveryRiskCarryOver } : {}),
      ...(args.chapterHandoffContract ? { chapter_handoff_contract: args.chapterHandoffContract } : {}),
      ...(longformMemoryAnchor ? { longform_memory_anchor: longformMemoryAnchor } : {}),
    },
  }
}

