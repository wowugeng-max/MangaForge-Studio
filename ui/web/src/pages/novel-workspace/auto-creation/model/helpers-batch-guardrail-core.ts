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

import { buildBatchPreflight } from './helpers-batch-guardrail-preflight'

import {
  buildBatchGuardrailSignalState,
} from './helpers-batch-guardrail-core-signals-state'
import {
  buildBatchGuardrailDecision,
} from './helpers-batch-guardrail-core-decision'

export function buildBatchGuardrail(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  governanceRecheckMemory: AutoCreationGovernanceRecheckMemory
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  chapterLaunchGate: AutoCreationChapterLaunchGate
  storyState?: AnyRecord | null
  chapters?: AnyRecord[] | null
  reviews?: AnyRecord[] | null
  styleSampleEffectiveness?: AnyRecord | null
  runRecords?: AnyRecord[] | null
}): AutoCreationBatchGuardrail {
  const state = buildBatchGuardrailSignalState(args)
  return buildBatchGuardrailDecision(args, state)
}
