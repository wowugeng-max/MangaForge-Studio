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

export function buildBatchGuardrailDecision(args: {
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
}, state: Record<string, any>): AutoCreationBatchGuardrail {
  const {
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
  } = state

  const preliminaryBlocking = guardrails.find(item => item.status === 'block')
  const preliminaryWarning = guardrails.find(item => item.status === 'warn')
  const preliminaryStatus: AutoCreationBatchGuardrailStatus = preliminaryBlocking ? 'blocked' : preliminaryWarning ? 'caution' : 'ready'
  const preliminarySafeChapterCount = preliminaryStatus === 'blocked'
    ? 0
    : preliminaryStatus === 'caution'
      ? expansionStructureValidationActive ? expansionStructureValidationTarget : 1
      : productionRelapseReviewStartsBatch
        ? Math.max(5, Math.min(
          Number(productionRelapseReviewCta?.target_chapter_count || 5),
          Number(future10.planned || productionRelapseReviewCta?.target_chapter_count || 5),
          Number(planning.volumeBeatBudget?.plannedChapterCount || productionRelapseReviewCta?.target_chapter_count || 5),
        ))
        : Math.max(1, Math.min(
        Number(safeBatchExpansionPolicy.targetChapterCount || 3),
        Number(future10.planned || safeBatchExpansionPolicy.targetChapterCount || 3),
        Number(planning.volumeBeatBudget?.plannedChapterCount || safeBatchExpansionPolicy.targetChapterCount || 3),
      ))
  const queueRelease = writingQueueRelease(writing, preliminarySafeChapterCount)
  const queueLimitedPreliminarySafeChapterCount = queueRelease.signal.status === 'block'
    ? 0
    : Math.min(preliminarySafeChapterCount, queueRelease.safeChapterCount)
  const preliminaryNextBatchBrief = buildNextBatchBrief({
    planning,
    writing,
    safeChapterCount: queueLimitedPreliminarySafeChapterCount,
    chapters: args.chapters,
    expansionStructureVerificationSeed,
    safeBatchExpansionPolicy,
  })
  const batchBriefSignal = buildNextBatchBriefSignal(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount)
  const briefRepair = buildNextBatchBriefRepair(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount, batchBriefSignal)
  const styleSampleBatchPreflight = buildStyleSampleBatchPreflight(preliminaryNextBatchBrief, args.styleSampleEffectiveness)
  const styleSampleBatchSignal = buildStyleSampleBatchPreflightSignal(styleSampleBatchPreflight)
  const styleSampleRecoveryEvidence = buildStyleSampleTaskBookRecoveryEvidence(arrayValue(args.runRecords))
  guardrails.push(queueRelease.signal)
  guardrails.push(batchBriefSignal)
  guardrails.push(styleSampleBatchSignal)
  guardrails.push(signal('每章交稿回填', 'ok', '连续生产仍按单章质检、修订、故事状态同步和资产发现逐章回填。'))

  const blocking = guardrails.find(item => item.status === 'block')
  const warning = guardrails.find(item => item.status === 'warn')
  const status: AutoCreationBatchGuardrailStatus = blocking ? 'blocked' : warning ? 'caution' : 'ready'
  let recommendedAction = args.mainAction

  if (productionRelapseReviewNeedsRepair && productionRelapseReviewCta) {
    const productionRelapseCtaExecution = productionRelapseCtaExecutionPayload(
      productionRelapseReviewCta,
      'safe_batch_production_relapse_review_cta',
    )
    recommendedAction = opsAction('open_task_center', productionRelapseReviewCta.label, productionRelapseReviewCta.summary, false, {
      source: 'safe_batch_production_relapse_review_cta',
      production_relapse_review_cta: productionRelapseReviewCta,
      ...(productionRelapseCtaExecution ? { production_relapse_cta_execution: productionRelapseCtaExecution } : {}),
    })
  } else if (blocking?.label === '恢复依据生产闸门' || warning?.label === '恢复依据生产闸门') {
    const recoveryEvidenceNextAction = recoveryEvidenceProductionGate.snapshot.next_action || {
      action: 'review_governance_closure',
      label: '治理复查台',
      source: 'recovery_evidence_production_gate',
      sourceLabel: '恢复依据生产闸门',
      status: recoveryEvidenceProductionGate.snapshot.status,
      residualEvidence: [],
    }
    const recoveryEvidenceGovernanceQueue = buildRecoveryEvidenceGovernanceQueue(recoveryEvidenceProductionGate.snapshot, recoveryEvidenceNextAction)
    recommendedAction = opsAction('create_recovery_evidence_governance_queue', '生成恢复依据治理队列', recoveryEvidenceProductionGate.signal.detail, false, {
      source: 'recovery_evidence_production_gate',
      detail: recoveryEvidenceProductionGate.signal.detail,
      recoveryEvidenceNextAction,
      recoveryEvidenceGovernanceQueue,
    })
  } else if (warning?.label === '恢复依据画像') {
    const recoveryEvidenceGovernanceQueue = buildRecoveryEvidenceDeepRepairQueue(recoveryEvidenceTrend)
    const hasEscalatedDeepRepair = arrayValue(recoveryEvidenceGovernanceQueue.tasks)
      .some(task => text(task?.deep_repair_level || task?.deepRepairLevel) === 'escalated_after_recurrence')
    if (Number(recoveryEvidenceGovernanceQueue.task_count || 0) > 0) {
      recommendedAction = opsAction('create_recovery_evidence_governance_queue', hasEscalatedDeepRepair ? '生成强化深修队列' : '生成深层修复队列', recoveryEvidenceGovernanceQueue.summary || recoveryEvidenceTrend.summary || recoveryEvidenceSourceRiskProfile.detail, false, {
        source: 'recovery_evidence_source_risk_profile',
        detail: recoveryEvidenceSourceRiskProfile.detail,
        recoveryEvidenceTrend,
        recoveryEvidenceGovernanceQueue,
      })
    } else {
      const hasPendingStrengthenedRecheck = recoveryEvidenceTrend.sources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'pending_recheck')
      recommendedAction = opsAction('open_task_center', hasPendingStrengthenedRecheck ? '查看强化深修复检' : '查看深修观察', recoveryEvidenceGovernanceQueue.summary || recoveryEvidenceTrend.summary || recoveryEvidenceSourceRiskProfile.detail, false, {
        source: 'recovery_evidence_source_risk_profile',
        detail: recoveryEvidenceSourceRiskProfile.detail,
        recoveryEvidenceTrend,
        recoveryEvidenceGovernanceQueue,
      })
    }
  } else if (warning?.label === '强化恢复验收趋势') {
    recommendedAction = opsAction('open_task_center', '查看强化复盘', strengthenedRepairAcceptanceTrend.summary, false, {
      source: 'strengthened_repair_acceptance_trend',
      strengthenedRepairAcceptanceTrend,
    })
  } else if (blocking?.label === '长线记忆' || warning?.label === '长线记忆') {
    recommendedAction = canonRunway.action
  } else if (blocking?.label === '剧情单元' || warning?.label === '剧情单元') {
    recommendedAction = planningAction('update_rolling_plan', storyUnitDetail, '更新滚动规划', {
      source: 'story_unit_repair',
      story_unit_workshop: storyUnitWorkshop,
    })
  } else if (blocking?.label === '批次任务书' || warning?.label === '批次任务书') {
    recommendedAction = briefRepair.action
  } else if (blocking?.label === '风格样章预检' || warning?.label === '风格样章预检') {
    recommendedAction = opsAction(
      'create_style_sample_batch_repair',
      '生成样章任务书修复',
      styleSampleBatchSignal.detail,
      false,
      styleSampleBatchPreflight,
    )
  } else if (blocking?.label === '连载库存' || warning?.label === '连载库存') {
    recommendedAction = serialReleaseInventory.action
  } else if (blocking?.label === '本章开写门禁' || warning?.label === '本章开写门禁') {
    recommendedAction = args.chapterLaunchGate.action
  } else if (blocking?.label === '写作队列放行' || warning?.label === '写作队列放行') {
    recommendedAction = queueRelease.action
  } else if (blocking?.label === '章节交接' || warning?.label === '章节交接') {
    recommendedAction = writingAction(
      (chapterHandoff?.actionKey || acceptance?.recommendedAcceptanceAction?.key || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(chapterHandoff),
      text(chapterHandoff?.actionLabel, acceptance?.recommendedAcceptanceAction?.label || '处理章节交接'),
    )
  } else if (blocking?.label === '未清交稿风险' || warning?.label === '未清交稿风险') {
    recommendedAction = opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary, false, deliveryRiskRepairPayload(args.deliveryRiskGate))
  } else if (blocking?.label === '故事压力阶梯' || warning?.label === '故事压力阶梯') {
    recommendedAction = planningAction('update_rolling_plan', storyPressureDetail, '更新滚动规划', {
      source: 'story_pressure_repair',
      story_pressure_ladder: storyPressureLadder,
    })
  } else if (!blocking && warning?.label === '未来100章储备') {
    recommendedAction = planningAction('future100_generate', '先补齐更长线的未来100章储备，再扩大连续生产批次。')
  } else if (!blocking && warning?.label === '百万字产能') {
    recommendedAction = planningAction(args.longformCapacity.recommendedActionKey, args.longformCapacity.summary)
  } else if (!blocking && warning?.label === '近10章疲劳') {
    recommendedAction = planningAction('update_rolling_plan', fatigueDetail, '更新滚动规划', {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    })
  }

  const safeChapterCount = status === 'blocked'
    ? 0
    : status === 'caution'
      ? expansionStructureValidationActive
        ? Math.max(1, Math.min(expansionStructureValidationTarget, queueLimitedPreliminarySafeChapterCount || expansionStructureValidationTarget))
        : Math.max(1, Math.min(1, queueLimitedPreliminarySafeChapterCount || 1))
      : queueLimitedPreliminarySafeChapterCount
  const nextBatchBriefChapterCount = safeChapterCount > 0
    ? safeChapterCount
    : expansionStructureRedesignDecisionActive
      ? 1
      : 0
  const nextBatchBrief = nextBatchBriefChapterCount === queueLimitedPreliminarySafeChapterCount
    ? preliminaryNextBatchBrief
    : buildNextBatchBrief({ planning, writing, safeChapterCount: nextBatchBriefChapterCount, chapters: args.chapters, expansionStructureVerificationSeed, safeBatchExpansionPolicy })
  const releaseWindow = buildBatchReleaseWindow(nextBatchBrief, queueRelease)
  const deliveryRiskCarryOver = normalizeSafeBatchDeliveryRiskCarryOver(
    planningDesk?.episodePlan?.deliveryRiskCarryOver
      || planningDesk?.episodePlan?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.deliveryRiskCarryOver
      || null,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const chapterHandoffContract = normalizeSafeBatchChapterHandoffContract(
    writing,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const recoveryEvidenceReleaseSummary = buildRecoveryEvidenceReleaseSummary({
    status,
    safeChapterCount,
    allowedChapterNos: releaseWindow.allowedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean),
    nextBatchBrief,
    recoveryEvidenceProductionGate: recoveryEvidenceProductionGate.snapshot,
    recoveryEvidenceSourceRiskProfile,
  })
  const recoveryEvidenceReleaseEvidence = arrayValue(recoveryEvidenceReleaseSummary?.evidence)
  const recoveryEvidence = buildNextBatchBriefRecoveryEvidence({
    status,
    safeChapterCount,
    nextBatchBrief,
    batchBriefSignal,
    evidence: [
      ...styleSampleRecoveryEvidence,
      ...recoveryEvidenceReleaseEvidence,
    ],
  })
  const preflight = buildBatchPreflight({
    status,
    safeChapterCount,
    releaseWindow,
    nextBatchBrief,
    guardrails,
    storyState: args.storyState || {},
    governanceRecheckMemory: args.governanceRecheckMemory,
    deliveryRiskCarryOver,
    chapterHandoffContract,
    storylineDecisionGate: args.storylineDecisionGate,
    styleSampleBatchPreflight,
    recoveryEvidence,
    recoveryEvidenceProductionGate: recoveryEvidenceProductionGate.snapshot,
    recoveryEvidenceReleaseSummary,
    recoveryEvidenceSourceRiskProfile,
    strengthenedRepairAcceptanceTrend,
    safeBatchExpansionPolicy,
    safeBatchRecoveryRestoreConfirmation,
    safeBatchRecoveryRestoreStabilityLane,
  })

  if (status === 'ready') {
    const recoveryValidationBatchActive = !safeBatchRecoveryAction
      && safeBatchExpansionPolicy.status === 'recovering'
      && Number(safeBatchExpansionPolicy.targetChapterCount || 0) > 1
      && Number(safeBatchExpansionPolicy.targetChapterCount || 0) <= Number(safeBatchExpansionPolicy.baseChapterCount || 3)
    const expansionStructureVerification = nextBatchBrief?.expansionStructureVerification
      || nextBatchBrief?.expansion_structure_verification
      || null
    const productionRelapseValidationTemplate = expansionStructureVerification?.default_five_chapter_lane_template
      || expansionStructureVerification?.defaultFiveChapterLaneTemplate
      || null
    const productionRelapseReview = productionRelapseValidationTemplate?.production_relapse_review
      || productionRelapseValidationTemplate?.productionRelapseReview
      || null
    const productionRelapseValidationActive = !safeBatchRecoveryAction
      && Boolean(productionRelapseReview)
      && Number(safeChapterCount || 0) > 1
      && Number(safeChapterCount || 0) <= Number(safeBatchExpansionPolicy.baseChapterCount || 3)
    const productionRelapseTemplateVersionId = text(
      productionRelapseReview?.template_version_id
      || productionRelapseReview?.templateVersionId
      || productionRelapseValidationTemplate?.template_version_id
      || productionRelapseValidationTemplate?.templateVersionId,
    )
    const productionRelapseChapterNos = arrayValue(productionRelapseReview?.default_batch_chapter_nos || productionRelapseReview?.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const productionRelapseFailureReasons = arrayValue(productionRelapseReview?.failure_reasons || productionRelapseReview?.failureReasons)
      .map(reason => text(reason))
      .filter(Boolean)
    const recoveryRestoreBatchActive = !safeBatchRecoveryAction
      && Boolean(safeBatchRecoveryRestoreConfirmation)
      && safeChapterCount >= Number(safeBatchRecoveryRestoreConfirmation?.target_chapter_count || 5)
    const recoveryRestoreObservationActive = !safeBatchRecoveryAction
      && text(safeBatchRecoveryRestoreStabilityLane?.status) === 'observing'
      && safeChapterCount >= 5
    const defaultFiveChapterLaneActive = !safeBatchRecoveryAction
      && text(safeBatchRecoveryRestoreStabilityLane?.status) === 'ready'
      && safeChapterCount >= 5
    const recoveryRestoreObservationConfirmation = recoveryRestoreObservationActive
      ? safeBatchRecoveryRestoreObservationConfirmation(safeBatchRecoveryRestoreStabilityLane, safeChapterCount)
      : null
    const startBatchSource = productionRelapseReviewStartsBatch
      ? 'safe_batch_production_relapse_review_cta'
      : productionRelapseValidationActive
      ? 'safe_batch_production_relapse_validation_batch'
      : recoveryValidationBatchActive
      ? 'safe_batch_recovery_validation_batch'
      : recoveryRestoreBatchActive || recoveryRestoreObservationActive
        ? 'safe_batch_recovery_restore_five_batch'
        : 'auto_creation_safe_batch'
    const startBatchLabel = productionRelapseReviewStartsBatch && productionRelapseReviewCta
      ? productionRelapseReviewCta.label
      : productionRelapseValidationActive
      ? '启动生产后验验证批'
      : recoveryValidationBatchActive
      ? `启动${safeChapterCount}章验证批`
      : recoveryRestoreBatchActive
        ? '确认恢复5章扩批'
        : recoveryRestoreObservationActive
          ? '继续5章观察批'
          : defaultFiveChapterLaneActive
            ? '启动默认5章档位'
            : '开始安全连写'
    const startBatchDescription = productionRelapseReviewStartsBatch && productionRelapseReviewCta
      ? productionRelapseReviewCta.summary
      : productionRelapseValidationActive
      ? [
        `启动${safeChapterCount}章生产后验验证批，逐章对照${productionRelapseTemplateVersionId ? `模板版本 ${productionRelapseTemplateVersionId}` : '当前模板版本'}和真实生产复发章节${productionRelapseChapterNos.length ? compactChapterNoEvidence(productionRelapseChapterNos) : '记录'}。`,
        productionRelapseFailureReasons.length ? `本轮只验证真实失败维度：${productionRelapseFailureReasons.join('、')}。` : '本轮只验证真实生产失败维度。',
        '关闭口径：必须输出 production_relapse_verdict.status=passed，且 remaining_failure_reasons 为空；不能只补 default_lane_*_delivered。',
      ].join(' ')
      : recoveryValidationBatchActive
      ? `安全连写恢复路线图已没有黄色修复层；先启动${safeChapterCount}章验证批，逐章回填核心守恒、读者回报、追读拉力和结构决策执行，再判断是否恢复 ${safeBatchExpansionPolicy.expandedChapterCount} 章。`
      : recoveryRestoreBatchActive
        ? `${safeBatchRecoveryRestoreConfirmation?.summary} 点击后进入 ${safeChapterCount} 章预执行确认，每章继续保留核心守恒、显性回报、章末追读和结构决策执行回填。`
        : recoveryRestoreObservationActive
          ? `${safeBatchRecoveryRestoreStabilityLane?.summary} 本批继续按 5 章观察，仍逐章回填核心守恒、显性回报、章末追读和结构决策执行。`
          : defaultFiveChapterLaneActive
          ? `${safeBatchRecoveryRestoreStabilityLane?.summary} 本批可作为默认 5 章档位继续生产。`
            : `按护栏建议连续生成 ${safeChapterCount} 章；每章仍会走字数门禁、质检修订和故事状态回填。`
    const productionRelapseCtaExecution = productionRelapseReviewStartsBatch
      ? productionRelapseCtaExecutionPayload(productionRelapseReviewCta, startBatchSource)
      : null
    if (productionRelapseCtaExecution) {
      preflight.inputSnapshot.production_relapse_cta_execution = productionRelapseCtaExecution
    }
    recommendedAction = productionRelapseReviewStartsBatch || !safeBatchRecoveryAction ? opsAction(
      'start_safe_batch_generation',
      startBatchLabel,
      startBatchDescription,
      false,
      {
        source: startBatchSource,
        safety_limit: safeChapterCount,
        allowed_chapter_nos: preflight.allowedChapterNos,
        next_batch_brief: nextBatchBrief,
        ...(productionRelapseReviewStartsBatch && productionRelapseReviewCta ? {
          production_relapse_review_cta: productionRelapseReviewCta,
        } : {}),
        ...(productionRelapseCtaExecution ? {
          production_relapse_cta_execution: productionRelapseCtaExecution,
        } : {}),
        ...(productionRelapseValidationActive ? {
          production_relapse_validation: {
            template_version_id: productionRelapseTemplateVersionId,
            default_batch_chapter_nos: productionRelapseChapterNos,
            failure_reasons: productionRelapseFailureReasons,
            close_condition: 'production_relapse_verdict.status=passed && remaining_failure_reasons empty',
          },
        } : {}),
        ...(recoveryRestoreBatchActive && safeBatchRecoveryRestoreConfirmation ? {
          recovery_restore_confirmation: safeBatchRecoveryRestoreConfirmation,
        } : {}),
        ...(recoveryRestoreObservationActive && safeBatchRecoveryRestoreStabilityLane ? {
          recovery_restore_stability_evidence: safeBatchRecoveryRestoreStabilityLane,
          ...(recoveryRestoreObservationConfirmation ? { recovery_restore_confirmation: recoveryRestoreObservationConfirmation } : {}),
        } : {}),
        ...(defaultFiveChapterLaneActive && safeBatchRecoveryRestoreStabilityLane ? {
          default_five_chapter_lane: safeBatchRecoveryRestoreStabilityLane,
        } : {}),
        batch_preflight: preflight.inputSnapshot,
      },
    ) : safeBatchRecoveryAction
  }
  if (preflight.inputSnapshot.recovery_evidence_production_gate) {
    preflight.inputSnapshot.recovery_evidence_production_gate = {
      ...preflight.inputSnapshot.recovery_evidence_production_gate,
      recommended_action: {
        key: recommendedAction.key,
        label: recommendedAction.label,
        description: recommendedAction.description,
      },
    }
    if (recommendedAction.payload) {
      recommendedAction = {
        ...recommendedAction,
        payload: {
          ...recommendedAction.payload,
          batch_preflight: {
            ...(recommendedAction.payload.batch_preflight || preflight.inputSnapshot),
            recovery_evidence_production_gate: preflight.inputSnapshot.recovery_evidence_production_gate,
          },
        },
      }
    }
  }
  const briefRecovery = buildNextBatchBriefRecovery({
    status,
    safeChapterCount,
    nextBatchBrief,
    batchBriefSignal,
    recommendedAction,
    evidence: [
      ...styleSampleRecoveryEvidence,
      ...recoveryEvidenceReleaseEvidence,
    ],
  })

  return {
    status,
    label: status === 'ready' ? '可小批量连写' : status === 'caution' ? '谨慎单章推进' : '暂不适合连写',
    summary: status === 'ready'
      ? `建议先小批量连续生产 ${safeChapterCount} 章，每章都经过质检、回填和差异复盘后再扩大批次。`
      : status === 'caution'
        ? warning?.label === '批次任务书'
          ? '下一批任务书还不够具体，本轮建议只推进 1 章，并先补齐后续章节职责、冲突和钩子。'
          : warning?.label === '写作队列放行'
            ? '写作队列后续章节还没有连续进入可写状态，本轮只推进当前可写章节，并先补齐后续计划或交稿。'
            : warning?.label === '连载库存'
              ? `连载库存提示：${serialReleaseInventory.detail} 本轮只放行单章，先补存稿或后续规划。`
              : warning?.label === '近10章疲劳'
                ? `近10章疲劳雷达提示：${fatigueDetail} 本轮建议只推进 1 章，并先更新滚动规划更换压迫来源、回报形态、章末问题或可视化场面。`
                : warning?.label === '恢复依据画像'
                  ? `恢复依据画像提示：${recoveryEvidenceSourceRiskProfile.detail}`
                : warning?.label === '强化恢复验收趋势'
                  ? `强化恢复验收提示：${strengthenedRepairAcceptanceTrend.summary}`
                : warning?.label === '故事压力阶梯'
                  ? '故事压力阶梯提示压力不足，本轮建议只推进 1 章，并先更新滚动规划补明确压力源、升级赌注和反转逼迫。'
                  : warning?.label === '剧情单元'
                    ? '剧情单元工坊提示当前事件包不完整，本轮建议只推进 1 章，并先更新滚动规划补入口钩子、小高潮、伏笔/剧情线和出单元钩子。'
                    : '长线储备存在薄弱点，本轮建议只推进 1 章，并优先处理黄色风险。'
        : blocking?.detail || '当前存在阻塞项，暂不适合连续生产。',
    safeChapterCount,
    recommendedAction,
    guardrails,
    releaseWindow,
    preflight,
    nextBatchBrief,
    recoveryEvidenceTrend,
    briefRepair,
    briefRecovery,
  }
}

