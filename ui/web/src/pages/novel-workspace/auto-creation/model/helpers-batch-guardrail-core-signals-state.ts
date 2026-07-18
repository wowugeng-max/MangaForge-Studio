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

export function buildBatchGuardrailSignalState(args: {
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
}): Record<string, any> {
  const planning = args.planning
  const writing = args.writing
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const chapterHandoff = (writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const running = hasRunningTasks(args.activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const characterArcActionNeeded = characterArcNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const canonRunway = buildCanonRunway(writing)
  const future100Status = future100ReserveStatus(planning)
  const capacityStatus: AutoCreationBatchGuardrailSignalStatus = args.longformCapacity.status === 'ready'
    ? 'ok'
    : args.longformCapacity.status === 'blocked'
      ? 'block'
      : 'warn'
  const fatigue = planning.recentFatigueRadar
  const fatigueWarnings = arrayValue(fatigue?.signals).filter(item => text(item?.status) === 'warn')
  const fatigueStatus: AutoCreationBatchGuardrailSignalStatus = fatigue?.status === 'needs_attention' || fatigueWarnings.length > 0
    ? 'warn'
    : 'ok'
  const fatigueWarningDetail = [
    ...fatigueWarnings.map(item => text(item?.detail)).filter(Boolean),
    text(fatigue?.summary),
  ].filter(Boolean).join('；')
  const fatigueDetail = fatigueStatus === 'warn'
    ? firstText(
        fatigueWarningDetail,
        arrayValue(fatigue?.nextActions)[0],
        `${fatigueWarnings.length || 1} 类近10章同质化风险，需要先换冲突来源、回报形态、章末问题或可视化场面。`,
      )
    : firstText(fatigue?.summary, '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。')
  const storyPressureLadder = planning.storyPressureLadder
  const storyPressureWarnings = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'warn')
  const storyPressureBlocks = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'block')
  const storyPressureStatus: AutoCreationBatchGuardrailSignalStatus = storyPressureLadder?.status === 'blocked' || storyPressureBlocks.length > 0
    ? 'block'
    : storyPressureLadder?.status === 'needs_attention' || storyPressureWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyPressureDetail = storyPressureStatus !== 'ok'
    ? firstText(
        storyPressureLadder?.summary,
        arrayValue(storyPressureLadder?.nextActions)[0],
        `${storyPressureWarnings.length || storyPressureBlocks.length || 1} 项故事压力风险，需要补明确压力源、冲突升级、赌注升级或反转逼迫。`,
      )
    : firstText(storyPressureLadder?.summary, '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。')
  const storyUnitWorkshop = planning.storyUnitWorkshop
  const storyUnitSignals = arrayValue(storyUnitWorkshop?.currentUnit?.signals)
  const storyUnitWarnings = storyUnitSignals.filter(item => text(item?.status) === 'warn')
  const storyUnitBlocks = storyUnitSignals.filter(item => text(item?.status) === 'block')
  const storyUnitStatus: AutoCreationBatchGuardrailSignalStatus = storyUnitWorkshop?.status === 'blocked' || storyUnitBlocks.length > 0
    ? 'block'
    : storyUnitWorkshop?.status === 'needs_attention' || storyUnitWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyUnitDetail = storyUnitStatus !== 'ok'
    ? firstText(
        storyUnitWorkshop?.summary,
        storyUnitWorkshop?.currentUnit?.summary,
        arrayValue(storyUnitWorkshop?.nextActions)[0],
        `${storyUnitWarnings.length || storyUnitBlocks.length || 1} 项剧情单元缺口，需要补入口钩子、压力升级、小高潮回报、伏笔/剧情线或出单元钩子。`,
      )
    : firstText(storyUnitWorkshop?.summary, '当前剧情单元入口、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。')
  const serialReleaseInventory = buildSerialReleaseInventoryGuardrail(planning)
  const deliveryRiskStatus: AutoCreationBatchGuardrailSignalStatus = args.deliveryRiskGate.status === 'ok'
    ? 'ok'
    : args.deliveryRiskGate.status === 'block'
      ? 'block'
      : 'warn'
  const recoveryEvidenceProductionGate = buildRecoveryEvidenceProductionGate(arrayValue(args.runRecords))
  const recoveryEvidenceSourceRiskProfile = buildRecoveryEvidenceSourceRiskProfile(arrayValue(args.runRecords))
  const strengthenedRepairAcceptanceTrend = buildStrengthenedRepairAcceptanceTrend({
    runRecords: arrayValue(args.runRecords),
    chapters: arrayValue(args.chapters),
    reviews: arrayValue(args.reviews),
    storyState: args.storyState || {},
  })
  const recoveryEvidenceTrend = buildRecoveryEvidenceTrend(recoveryEvidenceSourceRiskProfile, strengthenedRepairAcceptanceTrend)
  const safeBatchExpansionFeedback = buildSafeBatchExpansionFeedback({
    runRecords: arrayValue(args.runRecords),
    chapters: arrayValue(args.chapters),
    reviews: arrayValue(args.reviews),
  })
  const safeBatchExpansionPolicy = buildSafeBatchExpansionPolicy(strengthenedRepairAcceptanceTrend, safeBatchExpansionFeedback)
  const safeBatchRecoveryRestoreConfirmation = buildSafeBatchRecoveryRestoreConfirmation(safeBatchExpansionPolicy)
  const safeBatchRecoveryRestoreStabilityLane = buildSafeBatchRecoveryRestoreStabilityLane(safeBatchExpansionPolicy)
  const productionRelapseReviewCta = buildProductionRelapseReviewCta(safeBatchExpansionPolicy, safeBatchRecoveryRestoreStabilityLane)
  const productionRelapseReviewStartsBatch = productionRelapseReviewCta
    && ['enter_five_chapter_observation', 'restore_default_lane'].includes(text(productionRelapseReviewCta.kind))
  const productionRelapseReviewNeedsRepair = text(productionRelapseReviewCta?.kind) === 'repair_production_relapse'
  const safeBatchRecoveryAction = safeBatchRecoveryRoadmapRecommendedAction(safeBatchExpansionPolicy.recoveryRoadmap)
  const safeBatchExpansionPolicyFeedback = safeBatchExpansionPolicy.expansionFeedback
    || safeBatchExpansionPolicy.expansion_feedback
    || null
  const safeBatchStructureRepairEffectiveness = safeBatchExpansionPolicyFeedback?.expansionStructureRepairEffectiveness
    || safeBatchExpansionPolicyFeedback?.expansion_structure_repair_effectiveness
    || null
  const expansionStructureRedesignDecisionActive = text(safeBatchStructureRepairEffectiveness?.recommendation) === 'escalate_structure_redesign'
  const expansionStructureVerificationSeed = buildResolvedSafeBatchExpansionStructureVerificationSeed(arrayValue(args.runRecords))
  const expansionStructureValidationActive = Boolean(
    expansionStructureVerificationSeed
    && safeBatchExpansionPolicy.status === 'recovering'
    && Number(safeBatchExpansionPolicy.targetChapterCount || 0) > 1,
  )
  const expansionStructureValidationTarget = expansionStructureValidationActive
    ? Math.max(1, Math.min(
      3,
      Number(safeBatchExpansionPolicy.targetChapterCount || 3),
      Number(future10.planned || 3),
      Number(planning.volumeBeatBudget?.plannedChapterCount || 3),
    ))
    : 0
  const strengthenedRepairAcceptanceSignalStatus = expansionStructureValidationActive && strengthenedRepairAcceptanceTrend.status === 'warn'
    ? 'ok'
    : strengthenedRepairAcceptanceTrend.status
  const strengthenedRepairAcceptanceSignalSummary = expansionStructureValidationActive && strengthenedRepairAcceptanceTrend.status === 'warn'
    ? `${strengthenedRepairAcceptanceTrend.summary}；扩批结构修复已闭环，本轮进入 ${expansionStructureValidationTarget} 章验证批。`
    : strengthenedRepairAcceptanceTrend.summary
  const hasScenePlan = planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0
  const currentChapterDelivered = !Boolean(acceptance.visible) && !chapterHandoffVisible
  const chapterPlanIssue = text(arrayValue(planningDesk.reasons)[0], '当前章任务书或场景卡未就绪。')
  const governanceBlocked = args.hasBlockingPlan
    || retentionActionNeeded
    || storylineActionNeeded
    || characterArcActionNeeded
    || volumeBeatActionNeeded
    || rhythmActionNeeded
  const chapterPlanReady = planningDesk.readiness === 'ready' && hasScenePlan
  const launchGateSignalStatus: AutoCreationBatchGuardrailSignalStatus = args.chapterLaunchGate.status === 'blocked'
    ? 'block'
    : args.chapterLaunchGate.status === 'warn'
      ? 'warn'
      : 'ok'

  const guardrails = [
    signal(
      '模型与任务队列',
      !args.hasModel || running ? 'block' : 'ok',
      running
        ? `${args.activeTasks.length} 个后台任务运行中，先等任务结束。`
        : args.hasModel ? '已选择可用模型，且没有运行中的生产任务。' : '未选择可用模型。',
    ),
    signal(
      '长线治理',
      governanceBlocked ? 'block' : 'ok',
      governanceBlocked ? args.mainAction.description : '创作契约、留存、剧情线、爆点预算和长篇节奏均可进入生产。',
    ),
    signal(
      canonRunway.label,
      canonRunway.status,
      canonRunway.detail,
    ),
    signal(
      '本章开写门禁',
      launchGateSignalStatus,
      args.chapterLaunchGate.summary,
    ),
    signal(
      '未清交稿风险',
      deliveryRiskStatus,
      args.deliveryRiskGate.summary,
    ),
    recoveryEvidenceProductionGate.signal,
    signal(
      recoveryEvidenceSourceRiskProfile.label,
      recoveryEvidenceSourceRiskProfile.status,
      recoveryEvidenceSourceRiskProfile.detail,
    ),
    ...(strengthenedRepairAcceptanceTrend.visible ? [signal(
      strengthenedRepairAcceptanceTrend.label,
      strengthenedRepairAcceptanceSignalStatus,
      strengthenedRepairAcceptanceSignalSummary,
    )] : []),
    signal(
      '未来10章规划',
      future10.ready ? 'ok' : 'block',
      future10.ready ? `未来10章覆盖 ${future10.label}。` : `未来10章仅覆盖 ${future10.label}，连续生产容易断线。`,
    ),
    signal(
      '未来100章储备',
      future100Status,
      future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章覆盖 ${future100.label}，只适合小步推进。`,
    ),
    signal(
      serialReleaseInventory.label,
      serialReleaseInventory.status,
      serialReleaseInventory.detail,
    ),
    signal(
      safeBatchExpansionPolicy.label,
      'ok',
      safeBatchExpansionPolicy.summary,
    ),
    signal(
      '百万字产能',
      capacityStatus,
      args.longformCapacity.summary,
    ),
    signal(
      '故事压力阶梯',
      storyPressureStatus,
      storyPressureDetail,
    ),
    signal(
      '剧情单元',
      storyUnitStatus,
      storyUnitDetail,
    ),
    signal(
      '近10章疲劳',
      fatigueStatus,
      fatigueDetail,
    ),
    signal(
      '章节任务书/场景卡',
      chapterPlanReady ? 'ok' : 'block',
      chapterPlanReady ? '当前章任务书和场景卡已就绪。' : chapterPlanIssue,
    ),
    chapterHandoffVisible
      ? signal(
        '章节交接',
        'block',
        chapterHandoffDetail(chapterHandoff),
      )
      : signal(
        '当前章交稿',
        currentChapterDelivered ? 'ok' : 'block',
        currentChapterDelivered ? '当前没有未处理的交稿门禁。' : text(acceptance.statusLabel, '当前章仍需质检、修订或状态同步。'),
      ),
  ]


  return {
    planning,
    writing,
    future10,
    future100,
    planningDesk,
    acceptance,
    chapterHandoff,
    chapterHandoffVisible,
    running,
    retentionActionNeeded,
    storylineActionNeeded,
    characterArcActionNeeded,
    volumeBeatActionNeeded,
    rhythmActionNeeded,
    canonRunway,
    future100Status,
    capacityStatus,
    fatigue,
    fatigueWarnings,
    fatigueStatus,
    fatigueWarningDetail,
    fatigueDetail,
    storyPressureLadder,
    storyPressureWarnings,
    storyPressureBlocks,
    storyPressureStatus,
    storyPressureDetail,
    storyUnitWorkshop,
    storyUnitSignals,
    storyUnitWarnings,
    storyUnitBlocks,
    storyUnitStatus,
    storyUnitDetail,
    serialReleaseInventory,
    deliveryRiskStatus,
    recoveryEvidenceProductionGate,
    recoveryEvidenceSourceRiskProfile,
    strengthenedRepairAcceptanceTrend,
    recoveryEvidenceTrend,
    safeBatchExpansionFeedback,
    safeBatchExpansionPolicy,
    safeBatchRecoveryRestoreConfirmation,
    safeBatchRecoveryRestoreStabilityLane,
    productionRelapseReviewCta,
    productionRelapseReviewStartsBatch,
    productionRelapseReviewNeedsRepair,
    safeBatchRecoveryAction,
    safeBatchExpansionPolicyFeedback,
    safeBatchStructureRepairEffectiveness,
    expansionStructureRedesignDecisionActive,
    expansionStructureVerificationSeed,
    expansionStructureValidationActive,
    expansionStructureValidationTarget,
    strengthenedRepairAcceptanceSignalStatus,
    strengthenedRepairAcceptanceSignalSummary,
    hasScenePlan,
    currentChapterDelivered,
    chapterPlanIssue,
    governanceBlocked,
    chapterPlanReady,
    launchGateSignalStatus,
    guardrails,
  }
}
