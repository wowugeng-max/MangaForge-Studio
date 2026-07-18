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
  BATCH_DELIVERY_QUALITY_THRESHOLD,
  batchRepairTask,
  batchRiskIssueResolved,
  batchRiskIssueResolvedForBatch,
  buildAssetGrowthReview,
  buildBatchPlanReview,
  buildChapterAttractionReview,
  buildChapterBenchmarkReview,
  buildChapterHandoffReview,
  buildCharacterArcReview,
  buildContractSyncReview,
  buildInnovationExecutionReview,
  buildReaderPullReview,
  buildRecoveryEvidenceReview,
  buildSerialRhythmReview,
  buildStoryDriveReview,
  buildStrengthenedRepairAcceptanceReview,
  buildStyleSampleReview,
  buildVolumeSegmentReview,
  chapterAttractionRiskCount,
  chapterBenchmarkRiskCount,
  characterArcRiskCount,
  contractSyncRiskCount,
  coreRiskCount,
  expectationRiskCount,
  findChapter,
  innovationRiskCount,
  latestQualityReviewForChapter,
  latestReaderTrialReview,
  latestReviewForChapter,
  numberValue,
  payoffDebtCount,
  qualityPayload,
  readabilityRiskCount,
  readerTrialAppliesToBatch,
  readerTrialBatchReview,
  recoveryEvidenceReview,
  retentionRiskCount,
  riskPayload,
  runwayRiskCount,
  signal,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  volumeSegmentRiskCount,
} from './helpers-main'
import {
  buildDefaultFiveChapterLaneTemplateRedesignQueue,
  buildDefaultFiveChapterLaneTemplateRepair,
  buildSafeBatchExpansionStructureReview,
  buildSafeBatchExpansionStructureValidationResult,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentReviewSnapshot,
} from './helpers-safe-batch-recovery'
import {
  batchBriefAppliesToItem,
  batchBriefVisible,
  buildBatchChecklistExecution,
  buildBatchPlanContext,
  buildRecoveryEvidenceRegovernanceQueue,
  buildSafeBatchExpansionSegmentReview,
  buildSafeBatchExpansionStructureDecisionExecutionReview,
  first30RetentionRisk,
  normalizePostBatchQualityCheck,
  safeBatchExpansionSegmentResolvedForItems,
} from './helpers-safe-batch-expansion-structure'
import {
  arrayValue,
  firstText,
  text,
} from './helpers-basics'

import { buildBatchRiskRadarCompute } from './helpers-batch-risk-radar-compute'

type RiskRadarArgs = Parameters<typeof buildBatchRiskRadarCompute>[0]
type RiskRadarCtx = ReturnType<typeof buildBatchRiskRadarCompute>

export function buildBatchRiskRadarFromCompute(args: RiskRadarArgs, ctx: RiskRadarCtx): AutoCreationBatchRiskRadar {
  const {
    successfulItems,
    qualityScores,
    averageQualityScore,
    lowQualityCount,
    postBatchQualityCheck,
    postBatchQualityResolved,
    postBatchQualityRiskTotal,
    handoffRiskLabels,
    expansionChapterRisks,
    serialRhythmReview,
    serialRhythmResolved,
    serialRhythmRiskTotal,
    assetGrowthReview,
    assetGrowthResolved,
    assetGrowthRiskTotal,
    readerTrialReview,
    readerTrialRiskItem,
    first30RetentionRiskReview,
    first30RetentionRiskItem,
    repairTasks,
    batchChecklistExecution,
    batchChecklistResolved,
    batchChecklistRiskTotal,
    effectiveBatchChecklistExecution,
    recoveryEvidenceReview,
    recoveryEvidenceResolved,
    effectiveRecoveryEvidenceReview,
    recoveryEvidenceRiskTotal,
    strengthenedRepairAcceptanceReview,
    strengthenedRepairAcceptanceResolved,
    effectiveStrengthenedRepairAcceptanceReview,
    strengthenedRepairAcceptanceRiskTotal,
    safeBatchExpansionSegmentReview,
    safeBatchExpansionSegmentResolved,
    effectiveSafeBatchExpansionSegmentReview,
    safeBatchExpansionSegmentRiskTotal,
    safeBatchExpansionStructureValidationResult,
    safeBatchExpansionStructureValidationRiskTotal,
    safeBatchExpansionStructureDecisionReview,
    safeBatchExpansionStructureDecisionResolved,
    effectiveSafeBatchExpansionStructureDecisionReview,
    safeBatchExpansionStructureDecisionRiskTotal,
    safeBatchExpansionStructureDecisionDefaultLane,
    safeBatchExpansionStructureValidationTrend,
    defaultLaneTemplateStabilityProfile,
    coreRiskTotal,
    runwayRiskTotal,
    payoffDebtTotal,
    readerPullRiskTotal,
    readerTrialRiskTotal,
    first30RetentionRiskTotal,
    handoffRiskTotal,
    storylineRiskTotal,
    storyDriveRiskTotal,
    characterArcRiskTotal,
    innovationRiskTotal,
    signatureSceneRiskTotal,
    chapterAttractionRiskTotal,
    chapterBenchmarkRiskTotal,
    styleSampleRiskTotal,
    preDraftExecutionRiskTotal,
    readabilityRiskTotal,
    volumeSegmentRiskTotal,
    forbiddenBoundaryRiskTotal,
    batchPlanRiskTotal,
  } = ctx
  const signals: AutoCreationBatchRiskSignal[] = [
    {
      key: 'quality',
      label: '质检均分',
      status: lowQualityCount > 0 || averageQualityScore !== null && averageQualityScore < 82 ? 'warn' : 'ok',
      detail: averageQualityScore === null
        ? '暂无批次质检分'
        : `均分 ${averageQualityScore}${lowQualityCount > 0 ? `，低分 ${lowQualityCount} 章` : ''}`,
    },
    ...(postBatchQualityCheck.visible ? [{
      key: 'post_batch_quality' as const,
      label: '批次质检',
      status: postBatchQualityRiskTotal > 0 ? 'warn' as const : 'ok' as const,
      detail: postBatchQualityRiskTotal > 0
        ? `oh-story 交稿后质检未闭环 ${postBatchQualityRiskTotal} 项：${postBatchQualityCheck.summary}`
        : postBatchQualityCheck.summary,
    }] : []),
    {
      key: 'core',
      label: '核心偏移',
      status: coreRiskTotal > 0 ? 'warn' : 'ok',
      detail: coreRiskTotal > 0 ? `发现 ${coreRiskTotal} 项核心偏移风险` : '核心守恒正常',
    },
    {
      key: 'runway',
      label: '航线风险',
      status: runwayRiskTotal > 0 ? 'warn' : 'ok',
      detail: runwayRiskTotal > 0 ? `航线风险 ${runwayRiskTotal} 项，四问、读者燃料或红线约束未闭环` : '百万字航线兑现正常',
    },
    {
      key: 'payoff',
      label: '回报欠账',
      status: payoffDebtTotal > 0 ? 'warn' : 'ok',
      detail: payoffDebtTotal > 0 ? `累计 ${payoffDebtTotal} 项读者回报欠账` : '读者回报已兑现',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerPullRiskTotal > 0 ? `读者拉力漏项 ${readerPullRiskTotal} 项，期待兑现或追读钩子不足` : '期待兑现和追读动力正常',
    },
    {
      key: 'reader_trial',
      label: '试读',
      status: readerTrialRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerTrialRiskTotal > 0
        ? `试读弃读点 ${readerTrialRiskTotal} 个：${readerTrialReview.drop_points.slice(0, 2).join('；') || readerTrialReview.summary}`
        : '当前批次未命中试读弃读点',
    },
    {
      key: 'first30_retention',
      label: '前30章',
      status: first30RetentionRiskTotal > 0 ? 'warn' : 'ok',
      detail: first30RetentionRiskTotal > 0
        ? first30RetentionRiskReview.summary
        : '前30章留存诊断未阻塞当前批次',
    },
    {
      key: 'handoff',
      label: '章节交接',
      status: handoffRiskTotal > 0 ? 'warn' : 'ok',
      detail: handoffRiskTotal > 0
        ? `章节交接漏接 ${handoffRiskTotal} 项：${handoffRiskLabels.slice(0, 2).join('、') || '开篇承接未落地'}`
        : '上一章悬念、压力和本章开篇承接正常',
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: storylineRiskTotal > 0 ? 'warn' : 'ok',
      detail: storylineRiskTotal > 0 ? `剧情线漏推/误触 ${storylineRiskTotal} 项` : '剧情线推进正常',
    },
    {
      key: 'story_drive',
      label: '故事力',
      status: storyDriveRiskTotal > 0 ? 'warn' : 'ok',
      detail: storyDriveRiskTotal > 0 ? `故事驱动力缺口 ${storyDriveRiskTotal} 项，主角选择、代价或状态变化不足` : '主角选择链和因果推进正常',
    },
    {
      key: 'character_arc',
      label: '人物弧光',
      status: characterArcRiskTotal > 0 ? 'warn' : 'ok',
      detail: characterArcRiskTotal > 0 ? `人物弧光缺口 ${characterArcRiskTotal} 项，欲望、缺陷、关系或成长节点不足` : '人物成长和关系变化正常',
    },
    {
      key: 'innovation',
      label: '创新/IP',
      status: innovationRiskTotal > 0 ? 'warn' : 'ok',
      detail: innovationRiskTotal > 0 ? `创新/IP化执行缺口 ${innovationRiskTotal} 项` : '创新点和可传播场面执行正常',
    },
    {
      key: 'signature_scene',
      label: '强场面',
      status: signatureSceneRiskTotal > 0 ? 'warn' : 'ok',
      detail: signatureSceneRiskTotal > 0 ? `强场面漏写 ${signatureSceneRiskTotal} 项，章节记忆点或短剧化场面不足` : '标志性场面兑现正常',
    },
    {
      key: 'chapter_attraction',
      label: '吸引力',
      status: chapterAttractionRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterAttractionRiskTotal > 0 ? `章节吸引力缺口 ${chapterAttractionRiskTotal} 项，开篇、场景推进、爽点或章末翻页需修复` : '章节吸引力执行正常',
    },
    {
      key: 'chapter_benchmark',
      label: '标杆章',
      status: chapterBenchmarkRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterBenchmarkRiskTotal > 0 ? `标杆章/质量基准缺口 ${chapterBenchmarkRiskTotal} 项，开篇、冲突、爽点、节拍或章末追读需修复` : '章节标杆结构执行正常',
    },
    {
      key: 'style_sample',
      label: '风格',
      status: styleSampleRiskTotal > 0 ? 'warn' : 'ok',
      detail: styleSampleRiskTotal > 0 ? `风格样章执行缺口 ${styleSampleRiskTotal} 项，文气、句式、对白比例或照搬风险需修复` : '风格样章执行正常',
    },
    {
      key: 'pre_draft_execution',
      label: '写前执行',
      status: preDraftExecutionRiskTotal > 0 ? 'warn' : 'ok',
      detail: preDraftExecutionRiskTotal > 0 ? `写前执行缺口 ${preDraftExecutionRiskTotal} 项，意图确认、对标模块、节奏参照或文风召回没有落到正文` : '写前意图和对标召回执行正常',
    },
    {
      key: 'readability',
      label: '可读性',
      status: readabilityRiskTotal > 0 ? 'warn' : 'ok',
      detail: readabilityRiskTotal > 0 ? `可读性/出戏风险 ${readabilityRiskTotal} 项` : '可读性风险可控',
    },
    {
      key: 'serial_rhythm',
      label: '连载节奏',
      status: serialRhythmRiskTotal > 0 ? 'warn' : 'ok',
      detail: serialRhythmRiskTotal > 0
        ? `连载节奏同质化 ${serialRhythmRiskTotal} 项：${serialRhythmReview.dimensions.map((item: any) => item.label).join('、')}`
        : '冲突来源、读者回报和章末钩子轮换正常',
    },
    {
      key: 'asset_growth',
      label: '新资产',
      status: assetGrowthRiskTotal > 0 ? 'warn' : 'ok',
      detail: assetGrowthRiskTotal > 0
        ? `新资产待确认 ${assetGrowthReview.pending_count} 个，超过本批预算 ${assetGrowthReview.budget} 个`
        : assetGrowthReview.summary,
    },
    {
      key: 'volume_segment',
      label: '卷段验收',
      status: volumeSegmentRiskTotal > 0 ? 'warn' : 'ok',
      detail: volumeSegmentRiskTotal > 0
        ? `阶段验收漏兑现 ${volumeSegmentRiskTotal} 项，当前批次不能直接放行下一批`
        : '当前卷/阶段目标未发现漏结算风险',
    },
  ]
  if (batchBriefVisible(args.nextBatchBrief)) {
    signals.push({
      key: 'batch_plan',
      label: '连载计划',
      status: batchPlanRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchPlanRiskTotal > 0 ? `连载计划兑现风险 ${batchPlanRiskTotal} 项` : '本批连载计划无明显漏项',
    })
  }
  if (effectiveBatchChecklistExecution.visible) {
    signals.push({
      key: 'batch_checklist',
      label: '开工清单',
      status: batchChecklistRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchChecklistRiskTotal > 0
        ? `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，兑现分 ${effectiveBatchChecklistExecution.score}`
        : `批次开工清单兑现分 ${effectiveBatchChecklistExecution.score}`,
    })
  }
  if (effectiveRecoveryEvidenceReview.visible) {
    signals.push({
      key: 'recovery_evidence',
      label: '恢复依据',
      status: recoveryEvidenceRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveRecoveryEvidenceReview.summary,
    })
  }
  if (effectiveStrengthenedRepairAcceptanceReview.visible) {
    signals.push({
      key: 'strengthened_repair_acceptance',
      label: '强化复盘',
      status: strengthenedRepairAcceptanceRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveStrengthenedRepairAcceptanceReview.summary,
    })
  }
  if (effectiveSafeBatchExpansionSegmentReview.visible) {
    signals.push({
      key: 'batch_expansion_segment',
      label: '扩批分段',
      status: safeBatchExpansionSegmentRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveSafeBatchExpansionSegmentReview.summary,
    })
  }
  if (safeBatchExpansionStructureValidationResult.visible) {
    signals.push({
      key: 'batch_expansion_structure',
      label: '扩批结构',
      status: safeBatchExpansionStructureValidationRiskTotal > 0 ? 'warn' : 'ok',
      detail: safeBatchExpansionStructureValidationResult.summary,
    })
  }
  if (effectiveSafeBatchExpansionStructureDecisionReview.visible) {
    signals.push({
      key: 'batch_expansion_structure_decision',
      label: '扩批结构决策',
      status: safeBatchExpansionStructureDecisionRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveSafeBatchExpansionStructureDecisionReview.summary,
    })
  }
  const status: AutoCreationBatchRiskStatus = signals.some(signal => signal.status === 'warn') ? 'warn' : 'ok'

  return {
    status,
    averageQualityScore,
    lowQualityCount,
    postBatchQualityRiskCount: postBatchQualityRiskTotal,
    coreRiskCount: coreRiskTotal,
    runwayRiskCount: runwayRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
    readerTrialRiskCount: readerTrialRiskTotal,
    first30RetentionRiskCount: first30RetentionRiskTotal,
    handoffRiskCount: handoffRiskTotal,
    storylineRiskCount: storylineRiskTotal,
    storyDriveRiskCount: storyDriveRiskTotal,
    characterArcRiskCount: characterArcRiskTotal,
    innovationRiskCount: innovationRiskTotal,
    signatureSceneRiskCount: signatureSceneRiskTotal,
    chapterAttractionRiskCount: chapterAttractionRiskTotal,
    chapterBenchmarkRiskCount: chapterBenchmarkRiskTotal,
    styleSampleRiskCount: styleSampleRiskTotal,
    preDraftExecutionRiskCount: preDraftExecutionRiskTotal,
    readabilityRiskCount: readabilityRiskTotal,
    serialRhythmRiskCount: serialRhythmRiskTotal,
    assetGrowthRiskCount: assetGrowthRiskTotal,
    volumeSegmentRiskCount: volumeSegmentRiskTotal,
    batchPlanRiskCount: batchPlanRiskTotal,
    batchChecklistRiskCount: batchChecklistRiskTotal,
    recoveryEvidenceRiskCount: recoveryEvidenceRiskTotal,
    strengthenedRepairAcceptanceRiskCount: strengthenedRepairAcceptanceRiskTotal,
    safeBatchExpansionSegmentRiskCount: safeBatchExpansionSegmentRiskTotal,
    safeBatchExpansionSegmentReview: effectiveSafeBatchExpansionSegmentReview,
    safeBatchExpansionStructureValidationRiskCount: safeBatchExpansionStructureValidationRiskTotal,
    safeBatchExpansionStructureValidationResult,
    safeBatchExpansionStructureDecisionRiskCount: safeBatchExpansionStructureDecisionRiskTotal,
    safeBatchExpansionStructureDecisionReview: effectiveSafeBatchExpansionStructureDecisionReview,
    checklistExecution: effectiveBatchChecklistExecution,
    signals,
    repairTasks: repairTasks.slice(0, 40),
  }
}

