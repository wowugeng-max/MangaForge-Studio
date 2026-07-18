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
  arrayValue,
  firstText,
  text,
} from './helpers-basics'
import {
  BATCH_DELIVERY_QUALITY_THRESHOLD,
  batchBriefAppliesToItem,
  batchBriefVisible,
  batchRepairTask,
  batchRiskIssueResolved,
  batchRiskIssueResolvedForBatch,
  buildAssetGrowthReview,
  buildBatchChecklistExecution,
  buildBatchPlanContext,
  buildBatchPlanReview,
  buildChapterAttractionReview,
  buildChapterBenchmarkReview,
  buildChapterHandoffReview,
  buildCharacterArcReview,
  buildContractSyncReview,
  buildDefaultFiveChapterLaneTemplateRedesignQueue,
  buildDefaultFiveChapterLaneTemplateRepair,
  buildInnovationExecutionReview,
  buildReaderPullReview,
  buildRecoveryEvidenceRegovernanceQueue,
  buildRecoveryEvidenceReview,
  buildSafeBatchExpansionSegmentReview,
  buildSafeBatchExpansionStructureDecisionExecutionReview,
  buildSafeBatchExpansionStructureReview,
  buildSafeBatchExpansionStructureValidationResult,
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
  first30RetentionRisk,
  innovationRiskCount,
  latestQualityReviewForChapter,
  latestReaderTrialReview,
  latestReviewForChapter,
  normalizePostBatchQualityCheck,
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
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentResolvedForItems,
  safeBatchExpansionSegmentReviewSnapshot,
  signal,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  volumeSegmentRiskCount,
} from './helpers-main'

export function buildBatchRiskRadar(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  planning?: PlanningWorkspaceModel | null
  resolvedIssueKeys?: Set<string>
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  expansionFeedback?: AnyRecord | null
  postBatchQualityCheck?: AnyRecord | null
}): AutoCreationBatchRiskRadar {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const qualityScores = successfulItems
    .map(item => {
      const chapter = findChapter(args.chapters, item)
      const qualityReview = chapter ? latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo) : null
      const quality = qualityPayload(qualityReview)
      return numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    })
    .filter((score): score is number => score !== null)
  const averageQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
    : null
  const lowQualityCount = qualityScores.filter(score => score < BATCH_DELIVERY_QUALITY_THRESHOLD).length
  const postBatchQualityCheck = normalizePostBatchQualityCheck(args.postBatchQualityCheck)
  const postBatchQualityResolved = batchRiskIssueResolvedForBatch(args.resolvedIssueKeys, 'post_batch_quality_warning')
    || (successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'post_batch_quality_warning'))
  const postBatchQualityRiskTotal = postBatchQualityResolved ? 0 : Number(postBatchQualityCheck.warning_count || 0)

  let coreRiskTotal = 0
  let runwayRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  let readerTrialRiskTotal = 0
  let first30RetentionRiskTotal = 0
  let handoffRiskTotal = 0
  let storylineRiskTotal = 0
  let storyDriveRiskTotal = 0
  let characterArcRiskTotal = 0
  let innovationRiskTotal = 0
  let signatureSceneRiskTotal = 0
  let chapterAttractionRiskTotal = 0
  let chapterBenchmarkRiskTotal = 0
  let styleSampleRiskTotal = 0
  let preDraftExecutionRiskTotal = 0
  let readabilityRiskTotal = 0
  let volumeSegmentRiskTotal = 0
  let forbiddenBoundaryRiskTotal = 0
  const handoffRiskLabels: string[] = []
  const expansionChapterRisks: AnyRecord[] = []
  const serialRhythmReview = buildSerialRhythmReview({
    items: successfulItems,
    chapters: args.chapters,
    nextBatchBrief: args.nextBatchBrief,
  })
  const serialRhythmResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'serial_rhythm_fatigue')
  const serialRhythmRiskTotal = serialRhythmResolved ? 0 : Number(serialRhythmReview.risk_count || 0)
  const assetGrowthReview = buildAssetGrowthReview({
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const assetGrowthResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'asset_growth_over_budget')
  const assetGrowthRiskTotal = assetGrowthResolved ? 0 : Number(assetGrowthReview.over_budget_count || 0)
  const readerTrialReview = readerTrialBatchReview({
    items: successfulItems,
    review: latestReaderTrialReview(args.reviews),
  })
  const readerTrialRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return readerTrialReview.drop_points.some(dropPoint => readerTrialAppliesToBatch(dropPoint, new Set([chapterNo])))
  }) || successfulItems.find(item => Number(item.chapterNo || 0) <= 30) || successfulItems[0] || null
  readerTrialRiskTotal = readerTrialRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, readerTrialRiskItem, 'reader_trial_drop_point')
    ? Number(readerTrialReview.risk_count || 0)
    : 0
  const first30RetentionRiskReview = first30RetentionRisk({
    first30Retention: args.planning?.first30Retention,
    items: successfulItems,
  })
  const first30RetentionRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  }) || successfulItems[0] || null
  first30RetentionRiskTotal = first30RetentionRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, first30RetentionRiskItem, 'first30_retention_recheck')
    ? Number(first30RetentionRiskReview.count || 0)
    : 0
  let batchPlanRiskTotal = 0
  const repairTasks: AnyRecord[] = []

  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const runwayReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'runway_sync')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    const storylineReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'storyline_sync')
    const storyDriveReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'story_drive_sync')
    const characterArcReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'character_arc_sync')
    const innovationReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'innovation_sync')
    const signatureSceneReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'signature_scene_sync')
    const chapterAttractionReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_attraction_review')
    const chapterBenchmarkReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_benchmark_sync')
    const intentConfirmationReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'intent_confirmation_sync')
    const benchmarkRecallReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'benchmark_recall_sync')
    const styleSampleReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'style_sample_sync')
    const readabilityReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'readability_review')
    const volumeSegmentReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'volume_beat_sync')
    const qualityReview = latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo)
    const quality = qualityPayload(qualityReview)
    const qualityScore = numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
    const runwayCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'runway_sync_risk') ? 0 : runwayRiskCount(runwayReview)
    const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
    const chapterHandoffReview = buildChapterHandoffReview({ item, expectationReview })
    const handoffResolved = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_handoff_missed')
    const expectationCount = Math.max(0, expectationRiskCount(expectationReview) - (handoffResolved ? chapterHandoffReview.missed_count : 0))
    const readerPullCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_pull_missed')
      ? 0
      : expectationCount + retentionRiskCount(retentionReview)
    const handoffCount = handoffResolved ? 0 : chapterHandoffReview.missed_count
    const storylineCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk') ? 0 : storylineRiskCount(storylineReview)
    const storylinePayload = riskPayload(storylineReview, 'storyline_sync')
    const forbiddenCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk')
      ? 0
      : arrayValue(storylinePayload?.forbidden_touched || storylinePayload?.forbiddenTouched).length
    const storyDriveCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'story_drive_gap') ? 0 : storyDriveRiskCount(storyDriveReview)
    const characterArcCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'character_arc_gap') ? 0 : characterArcRiskCount(characterArcReview)
    const innovationCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'innovation_execution_missed') ? 0 : innovationRiskCount(innovationReviewRef)
    const signatureSceneCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'signature_scene_missed') ? 0 : signatureSceneRiskCount(signatureSceneReview)
    const chapterAttractionCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_attraction_gap') ? 0 : chapterAttractionRiskCount(chapterAttractionReviewRef)
    const chapterBenchmarkCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_benchmark_gap') ? 0 : chapterBenchmarkRiskCount(chapterBenchmarkReviewRef)
    const intentConfirmationCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'intent_confirmation_gap') ? 0 : contractSyncRiskCount(intentConfirmationReviewRef, 'intent_confirmation_sync')
    const benchmarkRecallCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'benchmark_recall_gap') ? 0 : contractSyncRiskCount(benchmarkRecallReviewRef, 'benchmark_recall_sync')
    const styleSampleCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'style_sample_gap') ? 0 : styleSampleRiskCount(styleSampleReviewRef)
    const readabilityCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'readability_risk') ? 0 : readabilityRiskCount(readabilityReview)
    const volumeSegmentCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'volume_segment_missed') ? 0 : volumeSegmentRiskCount(volumeSegmentReviewRef)
    const batchPlanCount = batchBriefAppliesToItem(args.nextBatchBrief, item) && !batchRiskIssueResolved(args.resolvedIssueKeys, item, 'batch_brief_mismatch')
      ? coreCount + payoffCount + storylineCount
      : 0
    const lowQuality = qualityScore !== null && qualityScore < BATCH_DELIVERY_QUALITY_THRESHOLD
    expansionChapterRisks.push({
      chapterNo: item.chapterNo,
      title: item.title,
      coreRiskCount: coreCount,
      payoffDebtCount: payoffCount,
      readerPullRiskCount: readerPullCount,
      riskCount: coreCount + payoffCount + readerPullCount,
    })

    coreRiskTotal += coreCount
    runwayRiskTotal += runwayCount
    payoffDebtTotal += payoffCount
    readerPullRiskTotal += readerPullCount
    handoffRiskTotal += handoffCount
    storylineRiskTotal += storylineCount
    forbiddenBoundaryRiskTotal += forbiddenCount
    storyDriveRiskTotal += storyDriveCount
    characterArcRiskTotal += characterArcCount
    innovationRiskTotal += innovationCount
    signatureSceneRiskTotal += signatureSceneCount
    chapterAttractionRiskTotal += chapterAttractionCount
    chapterBenchmarkRiskTotal += chapterBenchmarkCount
    preDraftExecutionRiskTotal += intentConfirmationCount + benchmarkRecallCount
    styleSampleRiskTotal += styleSampleCount
    readabilityRiskTotal += readabilityCount
    volumeSegmentRiskTotal += volumeSegmentCount
    batchPlanRiskTotal += batchPlanCount
    if (handoffCount > 0) {
      handoffRiskLabels.push(...chapterHandoffReview.missed.map((missed: any) => firstText(missed?.label, missed?.text)).filter(Boolean))
    }

    if (lowQuality) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'low_quality_score',
        severity: qualityScore !== null && qualityScore < 65 ? 'high' : 'medium',
        message: `批次质检分 ${qualityScore}，低于交稿阈值 78。`,
        action: '生成编辑报告并重修本章节奏、冲突推进、爽点回报和章末钩子。',
        metrics: { quality_score: qualityScore },
      }))
    }
    if (coreCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'core_drift',
        severity: coreCount >= 2 ? 'high' : 'medium',
        message: `发现 ${coreCount} 项核心偏移风险，本章可能偏离读者承诺或主线推进。`,
        action: '对照章节任务书重修核心冲突、主线推进和章末钩子，避免长篇核心漂移。',
        metrics: { core_risk_count: coreCount },
      }))
    }
    if (runwayCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'runway_sync_risk',
        severity: runwayCount >= 2 ? 'high' : 'medium',
        message: `百万字航线风险 ${runwayCount} 项，本章可能没有兑现四问、读者燃料或红线约束。`,
        action: '对照百万字航线重修本章四问、读者燃料和红线约束，确认当前章服务长期主线、追读承诺和创新差异。',
        metrics: { runway_risk_count: runwayCount },
      }))
    }
    if (payoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_payoff_debt',
        severity: payoffCount >= 2 ? 'high' : 'medium',
        message: `累计 ${payoffCount} 项读者回报欠账，承诺的爽点或信息回报未兑现。`,
        action: '补写本章应交付的爽点、信息增量或情绪回报，并更新回报债务。',
        metrics: { payoff_debt_count: payoffCount },
      }))
    }
    if (readerPullCount > 0) {
      const readerPullReview = buildReaderPullReview({
        item,
        expectationReview,
        retentionReview,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_pull_missed',
        severity: readerPullCount >= 2 ? 'high' : 'medium',
        message: `读者期待或追读漏兑现 ${readerPullCount} 项，连续阅读动力不足。`,
        action: '补齐本章承诺的期待兑现、追读问题和下一章动力；让读者清楚知道本章爽点已交付、下一章为什么必须继续看。',
        metrics: { reader_pull_risk_count: readerPullCount },
        readerPullReview,
      }))
    }
    if (handoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_handoff_missed',
        severity: handoffCount >= 2 ? 'high' : 'medium',
        message: `章节交接漏接 ${handoffCount} 项，开篇没有接住上一章悬念、压力或读者期待。`,
        action: '重修本章开篇300字和第一场景，必须落地上一章交接契约中的压力、悬念、keep_alive问题或显性回报。',
        metrics: { handoff_risk_count: handoffCount },
        chapterHandoffReview,
      }))
    }
    if (storylineCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'storyline_sync_risk',
        severity: storylineCount >= 2 ? 'high' : 'medium',
        message: `剧情线漏推/误触 ${storylineCount} 项，可能影响后续连续生产。`,
        action: '修正本章剧情线推进、禁揭内容和伏笔回收，复查故事状态同步。',
        metrics: { storyline_risk_count: storylineCount },
      }))
    }
    if (storyDriveCount > 0) {
      const storyDriveSync = buildStoryDriveReview({ item, review: storyDriveReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'story_drive_gap',
        severity: storyDriveCount >= 3 ? 'high' : 'medium',
        message: `故事驱动力缺口 ${storyDriveCount} 项，本章可能只有事件推进，缺少主角主动选择和代价反馈。`,
        action: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
        metrics: { story_drive_risk_count: storyDriveCount },
        storyDriveSync,
      }))
    }
    if (characterArcCount > 0) {
      const characterArcSync = buildCharacterArcReview({ item, review: characterArcReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'character_arc_gap',
        severity: characterArcCount >= 3 ? 'high' : 'medium',
        message: `人物弧光缺口 ${characterArcCount} 项，本章可能只有事件推进但人物欲望、缺陷或关系没有变化。`,
        action: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
        metrics: { character_arc_risk_count: characterArcCount },
        characterArcSync,
      }))
    }
    if (innovationCount > 0) {
      const innovationReview = buildInnovationExecutionReview({
        item,
        review: innovationReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'innovation_execution_missed',
        severity: innovationCount >= 2 ? 'high' : 'medium',
        message: `创新/IP化执行漏兑现 ${innovationCount} 项，本章新鲜感或传播场面不足。`,
        action: '补齐本书差异化机制、反差体验和可视化传播场面；让创新点落成读者能复述的事件，而不是只停留在设定说明。',
        metrics: { innovation_risk_count: innovationCount },
        innovationReview,
      }))
    }
    if (signatureSceneCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'signature_scene_missed',
        severity: 'high',
        message: `强场面漏写 ${signatureSceneCount} 项，本章开写任务书要求的记忆点没有落成可视化场面。`,
        action: '补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择。',
        metrics: { signature_scene_risk_count: signatureSceneCount },
      }))
    }
    if (chapterAttractionCount > 0) {
      const chapterAttractionReview = buildChapterAttractionReview({ item, review: chapterAttractionReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_attraction_gap',
        severity: chapterAttractionCount >= 3 ? 'high' : 'medium',
        message: `章节吸引力执行缺口 ${chapterAttractionCount} 项，本章开篇钩子、场景推进、爽点密度、章末翻页或传播场面不足。`,
        action: '按吸引力执行器重修开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
        metrics: { chapter_attraction_risk_count: chapterAttractionCount },
        chapterAttractionReview,
      }))
    }
    if (chapterBenchmarkCount > 0) {
      const chapterBenchmarkSync = buildChapterBenchmarkReview({ item, review: chapterBenchmarkReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_benchmark_gap',
        severity: chapterBenchmarkCount >= 3 ? 'high' : 'medium',
        message: `标杆章/质量基准执行缺口 ${chapterBenchmarkCount} 项，本章开篇、冲突、爽点、场景节拍或章末追读没有按基准落地。`,
        action: '按章节标杆重修本章结构：补足开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读；只学习标杆方法，不复制桥段。',
        metrics: { chapter_benchmark_risk_count: chapterBenchmarkCount },
        chapterBenchmarkSync,
      }))
    }
    if (intentConfirmationCount > 0) {
      const intentConfirmationSync = buildContractSyncReview({
        item,
        review: intentConfirmationReviewRef,
        payloadKey: 'intent_confirmation_sync',
        fallbackLabel: '意图确认缺口',
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'intent_confirmation_gap',
        severity: intentConfirmationCount >= 2 ? 'high' : 'medium',
        message: `写前意图确认缺口 ${intentConfirmationCount} 项，本章情绪目标、节奏爆发、结构输入或章尾承接没有统一发力。`,
        action: '按写前意图确认重修本章：校准情绪目标、节奏爆发、逻辑线、出场顺序、代价/收益和章尾承接。',
        metrics: { intent_confirmation_risk_count: intentConfirmationCount },
        intentConfirmationSync,
      }))
    }
    if (benchmarkRecallCount > 0) {
      const benchmarkRecallSync = buildContractSyncReview({
        item,
        review: benchmarkRecallReviewRef,
        payloadKey: 'benchmark_recall_sync',
        fallbackLabel: '文风召回缺口',
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'benchmark_recall_gap',
        severity: benchmarkRecallCount >= 2 ? 'high' : 'medium',
        message: `文风召回执行缺口 ${benchmarkRecallCount} 项，本章没有把对标情绪模块、节奏参照或匹配章技法转成可见写法。`,
        action: '按文风召回重修本章：落实 selected_emotion_module、rhythm_reference、style_profile_summary 和 matched_chapter_techniques，只学抽象方法，不复制桥段原句。',
        metrics: { benchmark_recall_risk_count: benchmarkRecallCount },
        benchmarkRecallSync,
      }))
    }
    if (styleSampleCount > 0) {
      const styleSampleSync = buildStyleSampleReview({ item, review: styleSampleReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'style_sample_gap',
        severity: styleSampleSync.copied_phrases.length > 0 || styleSampleCount >= 3 ? 'high' : 'medium',
        message: `风格样章执行缺口 ${styleSampleCount} 项，本章文气、句式、对白比例或照搬风险需要修复。`,
        action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象方法，不得照搬样章原句。',
        metrics: { style_sample_risk_count: styleSampleCount },
        styleSampleSync,
      }))
    }
    if (readabilityCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'readability_risk',
        severity: readabilityCount >= 2 ? 'high' : 'medium',
        message: `可读性或网感出戏风险 ${readabilityCount} 项。`,
        action: '重修段落密度、对话节奏、吐槽强度和情绪场景的网感克制。',
        metrics: { readability_risk_count: readabilityCount },
      }))
    }
    if (volumeSegmentCount > 0) {
      const volumeSegmentReview = buildVolumeSegmentReview({
        planning: args.planning,
        item,
        chapter,
        review: volumeSegmentReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'volume_segment_missed',
        severity: volumeSegmentCount >= 2 ? 'high' : 'medium',
        message: `卷级阶段验收漏兑现 ${volumeSegmentCount} 项，本章可能没有结算当前卷目标或阶段身份变化。`,
        action: '对照当前卷目标、阶段冲突和卷级爆点预算重修本章；把漏掉的身份变化、阶段结算、关键入场或阶段回报写成可见结果。',
        metrics: { volume_segment_risk_count: volumeSegmentCount },
        volumeSegmentReview,
      }))
    }
    if (batchPlanCount > 0) {
      const batchPlanContext = buildBatchPlanContext(args.nextBatchBrief, item)
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'batch_brief_mismatch',
        severity: batchPlanCount >= 2 ? 'high' : 'medium',
        message: `本章有 ${batchPlanCount} 项批次任务书兑现风险，可能影响本批连载计划。`,
        action: '对照下一批任务书重修本章职责、读者回报、主线焦点和禁抢跑边界，再重新复盘交稿。',
        metrics: { batch_plan_risk_count: batchPlanCount },
        batchPlanContext,
        batchPlanReview: buildBatchPlanReview({ batchPlanContext, coreReview, payoffReview, storylineReview }),
      }))
    }
  }
  const batchChecklistExecution = buildBatchChecklistExecution({
    nextBatchBrief: args.nextBatchBrief,
    counts: {
      coreRiskTotal,
      runwayRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
      handoffRiskTotal,
      storylineRiskTotal,
      storyDriveRiskTotal,
      innovationRiskTotal,
      signatureSceneRiskTotal,
      chapterAttractionRiskTotal,
      forbiddenBoundaryRiskTotal,
      batchPlanRiskTotal,
    },
  })
  const batchChecklistResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'batch_checklist_mismatch')
  const batchChecklistRiskTotal = batchChecklistResolved ? 0 : batchChecklistExecution.missed.length
  const effectiveBatchChecklistExecution = batchChecklistResolved && batchChecklistExecution.visible
    ? {
      ...batchChecklistExecution,
      status: 'ok' as const,
      score: 100,
      summary: '批次开工清单风险已修复并通过复检。',
      items: batchChecklistExecution.items.map(item => ({ ...item, status: 'ok' as const })),
      missed: [],
    }
    : batchChecklistExecution
  if (batchChecklistRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'batch_checklist_mismatch',
      severity: batchChecklistRiskTotal >= 3 ? 'high' : 'medium',
      message: `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，连续生产可能偏离万订护栏。`,
      action: '按批次开工清单重修本批：先修核心承诺、故事驱动力、读者回报、创新记忆点和禁写边界，再复查整批交稿。',
      metrics: {
        batch_checklist_risk_count: batchChecklistRiskTotal,
        score: batchChecklistExecution.score,
      },
      batchChecklistExecution,
    }))
  }
  const recoveryEvidenceReview = buildRecoveryEvidenceReview({
    preflight: args.batchPreflight,
    counts: {
      payoffDebtTotal,
      readerPullRiskTotal,
      storylineRiskTotal,
      styleSampleRiskTotal,
      batchPlanRiskTotal,
      batchChecklistRiskTotal,
    },
  })
  const recoveryEvidenceResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'recovery_evidence_mismatch')
  const effectiveRecoveryEvidenceReview = recoveryEvidenceResolved && recoveryEvidenceReview.visible
    ? {
      ...recoveryEvidenceReview,
      status: 'ok' as const,
      failed_evidence: [],
      failed_items: [],
      summary: '恢复放行依据失效风险已修复并通过复检。',
    }
    : recoveryEvidenceReview
  const recoveryEvidenceRiskTotal = effectiveRecoveryEvidenceReview.failed_evidence.length
  if (recoveryEvidenceRiskTotal > 0 && successfulItems.length > 0) {
    const recoveryEvidenceRegovernanceQueue = buildRecoveryEvidenceRegovernanceQueue({
      preflight: args.batchPreflight,
      review: effectiveRecoveryEvidenceReview,
    })
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'recovery_evidence_mismatch',
      severity: recoveryEvidenceRiskTotal >= 2 ? 'high' : 'medium',
      message: `恢复放行依据 ${recoveryEvidenceRiskTotal} 项未兑现，上一轮闭环可能没有真正落到正文。`,
      action: '按失效依据回修本批：逐项核对样章执行、读者回报、主线/剧情线和批次任务书，修完后重新运行交稿复盘。',
      metrics: { recovery_evidence_risk_count: recoveryEvidenceRiskTotal },
      recoveryEvidenceReview: effectiveRecoveryEvidenceReview,
      recoveryEvidenceRegovernanceQueue,
    }))
  }
  const strengthenedRepairAcceptanceReview = buildStrengthenedRepairAcceptanceReview({
    preflight: args.batchPreflight,
    counts: {
      coreRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
    },
  })
  const strengthenedRepairAcceptanceResolved = successfulItems.length > 0
    && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'strengthened_repair_acceptance_mismatch')
  const effectiveStrengthenedRepairAcceptanceReview = strengthenedRepairAcceptanceResolved && strengthenedRepairAcceptanceReview.visible
    ? {
      ...strengthenedRepairAcceptanceReview,
      status: 'ok' as const,
      failed_evidence: [],
      risk_count: 0,
      core_risk_count: 0,
      payoff_debt_count: 0,
      reader_pull_risk_count: 0,
      summary: '强化深修恢复验收风险已修复并通过复检。',
    }
    : strengthenedRepairAcceptanceReview
  const strengthenedRepairAcceptanceRiskTotal = effectiveStrengthenedRepairAcceptanceReview.visible
    ? Number(effectiveStrengthenedRepairAcceptanceReview.risk_count || 0)
    : 0
  if (strengthenedRepairAcceptanceRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'strengthened_repair_acceptance_mismatch',
      severity: effectiveStrengthenedRepairAcceptanceReview.core_risk_count > 0 || strengthenedRepairAcceptanceRiskTotal >= 2 ? 'high' : 'medium',
      message: `强化深修恢复验收未通过，核心守恒、读者回报或追读拉力仍有 ${strengthenedRepairAcceptanceRiskTotal} 项风险。`,
      action: '按强化深修恢复验收重修本批：先校准全书核心承诺，再补齐显性爽点回报和章末追读动力，复查通过前不放宽下一批。',
      metrics: {
        strengthened_repair_acceptance_risk_count: strengthenedRepairAcceptanceRiskTotal,
        core_risk_count: effectiveStrengthenedRepairAcceptanceReview.core_risk_count,
        payoff_debt_count: effectiveStrengthenedRepairAcceptanceReview.payoff_debt_count,
        reader_pull_risk_count: effectiveStrengthenedRepairAcceptanceReview.reader_pull_risk_count,
      },
      strengthenedRepairAcceptanceReview: effectiveStrengthenedRepairAcceptanceReview,
    }))
  }
  const safeBatchExpansionSegmentReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
  })
  const safeBatchExpansionSegmentResolved = safeBatchExpansionSegmentResolvedForItems(
    args.resolvedIssueKeys,
    successfulItems,
    safeBatchExpansionSegmentReview,
  )
  const effectiveSafeBatchExpansionSegmentReview = safeBatchExpansionSegmentResolved && safeBatchExpansionSegmentReview.visible
    ? {
      ...safeBatchExpansionSegmentReview,
      status: 'ok' as const,
      riskCount: 0,
      hotspots: [],
      summary: '5章扩批分段热区已修复并通过复检。',
    }
    : safeBatchExpansionSegmentReview
  const safeBatchExpansionSegmentRiskTotal = effectiveSafeBatchExpansionSegmentReview.visible
    ? Number(effectiveSafeBatchExpansionSegmentReview.riskCount || 0)
    : 0
  const safeBatchExpansionStructureValidationResult = buildSafeBatchExpansionStructureValidationResult({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
    chapters: args.chapters,
  })
  const safeBatchExpansionStructureValidationRiskTotal = safeBatchExpansionStructureValidationResult.visible
    ? Number(safeBatchExpansionStructureValidationResult.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionReview = buildSafeBatchExpansionStructureDecisionExecutionReview({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const safeBatchExpansionStructureDecisionResolved = safeBatchExpansionStructureDecisionReview.visible
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).length > 0
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).every((failed: AnyRecord) => batchRiskIssueResolved(
      args.resolvedIssueKeys,
      { chapterId: failed.chapter_id ?? null, chapterNo: Number(failed.chapter_no || 0) },
      'safe_batch_expansion_structure_decision_mismatch',
    ))
  const effectiveSafeBatchExpansionStructureDecisionReview = safeBatchExpansionStructureDecisionResolved
    ? {
      ...safeBatchExpansionStructureDecisionReview,
      status: 'ok' as const,
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      summary: '扩批结构决策执行风险已修复并通过复检。',
    }
    : safeBatchExpansionStructureDecisionReview
  const safeBatchExpansionStructureDecisionRiskTotal = effectiveSafeBatchExpansionStructureDecisionReview.visible
    ? Number(effectiveSafeBatchExpansionStructureDecisionReview.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionDefaultLane = Boolean(
    effectiveSafeBatchExpansionStructureDecisionReview.default_five_chapter_lane_redesign
    || effectiveSafeBatchExpansionStructureDecisionReview.defaultFiveChapterLaneRedesign,
  )
  const safeBatchExpansionStructureValidationTrend = args.expansionFeedback?.expansionStructureValidationTrend
    || args.expansionFeedback?.expansion_structure_validation_trend
    || null
  const defaultLaneTemplateStabilityProfile = args.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || args.expansionFeedback?.default_five_chapter_lane_template_stability_profile
    || null
  if (safeBatchExpansionStructureDecisionRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(effectiveSafeBatchExpansionStructureDecisionReview.missed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      taskType: 'repair_planning',
      severity: safeBatchExpansionStructureDecisionRiskTotal >= 3 || text(effectiveSafeBatchExpansionStructureDecisionReview.recommendation) === 'escalate_structure_redesign' ? 'high' : 'medium',
      message: safeBatchExpansionStructureDecisionDefaultLane
        ? `默认5章档位模板未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、冲突轮换、回报密度或章末追读模板缺口会导致恢复判定再次失效。`
        : `扩批结构决策未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、观察指标或重构原则缺口会放大扩批复发风险。`,
      action: safeBatchExpansionStructureDecisionDefaultLane
        ? '回到下一批任务书和正文：补齐默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再重新回填结构决策执行并运行批次复盘。'
        : '回到下一批任务书和正文：逐章补齐扩批结构决策的段位职责、观察指标和必要的重构原则，再重新运行批次复盘。',
      metrics: {
        safe_batch_expansion_structure_decision_risk_count: safeBatchExpansionStructureDecisionRiskTotal,
        target_chapter_count: effectiveSafeBatchExpansionStructureDecisionReview.target_chapter_count,
        recommendation: effectiveSafeBatchExpansionStructureDecisionReview.recommendation,
      },
      safeBatchExpansionStructureDecisionReview: effectiveSafeBatchExpansionStructureDecisionReview,
    }))
  }
  if (safeBatchExpansionSegmentRiskTotal > 0 && successfulItems.length > 0) {
    const hotspotChapterNo = Number(effectiveSafeBatchExpansionSegmentReview.hotspots?.[0]?.chapterNos?.[0] || 0)
    const hotspotItem = successfulItems.find(item => Number(item.chapterNo || 0) === hotspotChapterNo) || successfulItems[0]
    const expansionStructureReview = buildSafeBatchExpansionStructureReview({
      segmentReview: effectiveSafeBatchExpansionSegmentReview,
      expansionFeedback: args.expansionFeedback,
    })
    if (expansionStructureReview.visible) {
      const repeatedSegment = expansionStructureReview.repeated_hotspot_segment
      const defaultRegression = expansionStructureReview.default_five_chapter_regression || null
      const defaultRecoveryVerdictRelapse = expansionStructureReview.default_five_chapter_recovery_verdict_relapse || null
      const defaultLaneTemplateProductionRelapseQueue = expansionStructureReview.default_five_chapter_lane_template_redesign_queue || null
      const defaultLaneTemplateProductionRelapseVersionId = text(
        defaultLaneTemplateProductionRelapseQueue?.template_version_id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersionId
        || defaultLaneTemplateProductionRelapseQueue?.template_version?.id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersion?.id,
      )
      const expansionStructureReviewWithTrend = {
        ...expansionStructureReview,
        ...(safeBatchExpansionStructureValidationTrend?.visible ? {
          expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
        } : {}),
      }
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_structure_repair',
        taskType: 'repair_planning',
        severity: 'high',
        message: defaultRecoveryVerdictRelapse
          ? `默认5章档位恢复判定失效：${text(defaultRecoveryVerdictRelapse.summary, `${repeatedSegment?.label || '扩批段位'}同维复发，需要回到3章验证批。`)}`
          : defaultLaneTemplateProductionRelapseQueue
          ? `默认5章档位模板版本 ${defaultLaneTemplateProductionRelapseVersionId || '当前版本'} 真实生产复发：${text(defaultLaneTemplateProductionRelapseQueue.summary)}`
          : defaultRegression
          ? `默认5章档位失效：${text(defaultRegression.summary, `${repeatedSegment?.label || '扩批段位'}复发，需要改写批次结构。`)}`
          : `${repeatedSegment?.label || '扩批段位'}连续 ${repeatedSegment?.count || 2} 次扩批热区，单修章节不足，需要改写批次结构。`,
        action: defaultRecoveryVerdictRelapse
          ? `恢复判定失效 -> 回到3章验证批：先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，逐项重证${arrayValue(defaultRecoveryVerdictRelapse.relapsed_failure_reasons || defaultRecoveryVerdictRelapse.relapsedFailureReasons).map(item => text(item)).filter(Boolean).join('、') || '核心守恒、显性回报和章末追读'}已清零，再恢复默认5章档位。`
          : defaultRegression
          ? `先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，下一轮回到3章验证批；验证核心守恒、显性回报和章末追读稳定后，再恢复默认5章档位。`
          : `先做${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，再按 ${expansionStructureReview.rollback_policy?.target_chapter_count || 3} 章以内恢复安全连写。`,
        metrics: {
          safe_batch_expansion_structure_risk_count: safeBatchExpansionSegmentRiskTotal,
          repeated_hotspot_count: repeatedSegment?.count || 0,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: expansionStructureReview.rollback_policy?.target_chapter_count || 3,
          ...(defaultRegression ? { default_five_chapter_regression: 1 } : {}),
          ...(defaultRecoveryVerdictRelapse ? { default_five_chapter_recovery_verdict_relapse: 1 } : {}),
        },
        ...(defaultRegression ? { actionKey: 'restore_default_lane_regression' } : {}),
        safeBatchExpansionStructureReview: expansionStructureReviewWithTrend,
      }))
    } else {
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_segment_hotspot',
        severity: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.mode === 'rollback_to_single_chapter' ? 'high' : 'medium',
        message: `${effectiveSafeBatchExpansionSegmentReview.label}未通过，${effectiveSafeBatchExpansionSegmentReview.summary}`,
        action: `${effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.summary || '先按热区章节重修，再缩小下一批安全连写。'}`,
        metrics: {
          safe_batch_expansion_segment_risk_count: safeBatchExpansionSegmentRiskTotal,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.targetChapterCount || 3,
        },
        safeBatchExpansionSegmentReview: safeBatchExpansionSegmentReviewSnapshot(effectiveSafeBatchExpansionSegmentReview),
      }))
    }
  }
  if (safeBatchExpansionStructureValidationRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(safeBatchExpansionStructureValidationResult.failed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    const defaultLaneTemplateRepair = buildDefaultFiveChapterLaneTemplateRepair(
      safeBatchExpansionStructureValidationResult.default_five_chapter_lane_template_verdict,
    )
    const defaultLaneTemplateRedesignQueue = buildDefaultFiveChapterLaneTemplateRedesignQueue(
      defaultLaneTemplateStabilityProfile,
    )
    const defaultLaneTemplateRepairSummary = text(defaultLaneTemplateRepair?.repair_summary)
    const defaultLaneTemplateRepairActions = arrayValue(defaultLaneTemplateRepair?.repair_actions)
      .map(item => text(item))
      .filter(Boolean)
    const defaultLaneTemplateRedesignActions = arrayValue(defaultLaneTemplateRedesignQueue?.redesign_requirements)
      .map((item: AnyRecord) => text(item?.instruction))
      .filter(Boolean)
    const rollbackPolicy = safeBatchExpansionRollbackPolicy({
      riskCount: safeBatchExpansionStructureValidationRiskTotal,
      coreRiskCount: Number(safeBatchExpansionStructureValidationResult.core_risk_count || 0),
      hotspotLabel: text(safeBatchExpansionStructureValidationResult.repeated_hotspot_segment?.label),
    })
    const structureReview = {
      visible: true,
      status: 'warn',
      label: '扩批结构修复',
      summary: safeBatchExpansionStructureValidationResult.summary,
      repeated_hotspot_segment: safeBatchExpansionStructureValidationResult.repeated_hotspot_segment || null,
      latest_chapter_nos: safeBatchExpansionStructureValidationResult.validation_chapter_nos,
      affected_chapter_nos: safeBatchExpansionStructureValidationResult.failed_chapter_nos,
      hotspot_summaries: [safeBatchExpansionStructureValidationResult.summary],
      ...(defaultLaneTemplateRepair ? {
        default_five_chapter_lane_template_repair: defaultLaneTemplateRepair,
      } : {}),
      ...(defaultLaneTemplateStabilityProfile ? {
        default_five_chapter_lane_template_stability_profile: defaultLaneTemplateStabilityProfile,
      } : {}),
      ...(defaultLaneTemplateRedesignQueue ? {
        default_five_chapter_lane_template_redesign_queue: defaultLaneTemplateRedesignQueue,
      } : {}),
      structure_actions: [
        ...defaultLaneTemplateRedesignActions,
        ...defaultLaneTemplateRepairActions,
        safeBatchExpansionStructureValidationResult.fixed_segment_role,
        safeBatchExpansionStructureValidationResult.conflict_rotation,
        safeBatchExpansionStructureValidationResult.explicit_payoff,
        safeBatchExpansionStructureValidationResult.ending_hook_requirement,
        ...arrayValue(safeBatchExpansionStructureValidationResult.structure_actions),
      ].map(item => text(item)).filter(Boolean),
      validation_result: safeBatchExpansionStructureValidationResult,
      rollback_policy: {
        mode: rollbackPolicy.mode,
        target_chapter_count: rollbackPolicy.targetChapterCount,
        label: rollbackPolicy.label,
        summary: rollbackPolicy.summary,
      },
      ...(safeBatchExpansionStructureValidationTrend?.visible ? {
        expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
      } : {}),
    }
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_repair',
      taskType: 'repair_planning',
      severity: defaultLaneTemplateRedesignQueue || safeBatchExpansionStructureValidationResult.core_risk_count > 0 || safeBatchExpansionStructureValidationRiskTotal >= 2 ? 'high' : 'medium',
      message: defaultLaneTemplateRedesignQueue
        ? `默认档位模板稳定性画像要求升级重构，${text(defaultLaneTemplateRedesignQueue.summary, defaultLaneTemplateRepairSummary || '同项模板复发')}，不能只做普通结构修复。`
        : defaultLaneTemplateRepair
        ? `默认档位模板回检未通过，${defaultLaneTemplateRepairSummary || `${safeBatchExpansionStructureValidationRiskTotal} 项模板缺口`}会阻止恢复默认5章档位。`
        : `扩批结构验证未通过，验证批仍有 ${safeBatchExpansionStructureValidationRiskTotal} 项核心/回报/追读风险。`,
      action: defaultLaneTemplateRedesignQueue
        ? '升级默认档位模板重构：先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再写下一轮验证标准；复验连续2批全过前不恢复默认5章档位。'
        : defaultLaneTemplateRepair
        ? `回到扩批结构任务书：${defaultLaneTemplateRepairSummary}；把缺失模板写成下一轮段位职责、冲突轮换、显性回报密度和章末追读检查项，再用2-3章复验；复验通过前不恢复默认5章档位。`
        : '回到扩批结构任务书：重写验证批段位职责、冲突轮换、显性回报和章末追读，再用2-3章复验；复验通过前不恢复5章扩批。',
      metrics: {
        safe_batch_expansion_structure_validation_risk_count: safeBatchExpansionStructureValidationRiskTotal,
        core_risk_count: safeBatchExpansionStructureValidationResult.core_risk_count,
        payoff_debt_count: safeBatchExpansionStructureValidationResult.payoff_debt_count,
        reader_pull_risk_count: safeBatchExpansionStructureValidationResult.reader_pull_risk_count,
        ...(defaultLaneTemplateRepair ? {
          default_five_chapter_lane_template_missing_count: defaultLaneTemplateRepair.missing_count,
        } : {}),
        ...(defaultLaneTemplateRedesignQueue ? {
          default_five_chapter_lane_template_redesign_queue: 1,
        } : {}),
      },
      safeBatchExpansionStructureReview: structureReview,
      safeBatchExpansionStructureValidationResult,
    }))
  }
  if (serialRhythmRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'serial_rhythm_fatigue',
      severity: serialRhythmRiskTotal >= 2 ? 'high' : 'medium',
      message: `本批存在 ${serialRhythmRiskTotal} 项连载节奏同质化，连续阅读容易疲劳。`,
      action: '按批次重修节奏：轮换冲突来源、读者回报、章末追读问题和可视化场面，再复查整批连载读感。',
      metrics: { serial_rhythm_risk_count: serialRhythmRiskTotal, score: serialRhythmReview.score },
      serialRhythmReview,
    }))
  }
  if (assetGrowthRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'asset_growth_over_budget',
      taskType: 'repair_assets',
      severity: assetGrowthReview.pending_count >= assetGrowthReview.budget + 4 ? 'high' : 'medium',
      message: `本批发现 ${assetGrowthReview.pending_count} 个新资产，超过预算 ${assetGrowthReview.budget}，存在设定膨胀风险。`,
      action: '进入设定工坊，把本批新资产逐项确认入库、改名、合并已有或标记一次性过场；只保留服务当前卷目标和读者承诺的资产。',
      metrics: {
        asset_growth_risk_count: assetGrowthRiskTotal,
        pending_asset_count: assetGrowthReview.pending_count,
        asset_budget: assetGrowthReview.budget,
      },
      assetGrowthReview,
      actionArea: 'assets',
      actionKey: 'open_story_assets',
    }))
  }
  if (readerTrialRiskTotal > 0 && readerTrialRiskItem) {
    repairTasks.push(batchRepairTask({
      item: readerTrialRiskItem,
      issueType: 'reader_trial_drop_point',
      severity: readerTrialReview.score !== null && readerTrialReview.score < 65 || readerTrialRiskTotal >= 3 ? 'high' : 'medium',
      message: `读者试读复盘发现 ${readerTrialRiskTotal} 个当前批次弃读点，可能影响前30章留存和付费转化。`,
      action: '按试读复盘重修命中章节：删减拖慢阅读的解释，把弃读点改成现场冲突、信息增量、爽点兑现或章末翻页问题。',
      metrics: { reader_trial_risk_count: readerTrialRiskTotal, score: readerTrialReview.score },
      readerTrialReview,
    }))
  }
  if (first30RetentionRiskTotal > 0 && first30RetentionRiskItem) {
    const actionKey = text(first30RetentionRiskReview.context?.action_key, 'run_first30_retention')
    repairTasks.push(batchRepairTask({
      item: first30RetentionRiskItem,
      issueType: 'first30_retention_recheck',
      taskType: actionKey === 'create_first30_repair' ? 'repair_planning' : 'review_planning',
      severity: text(first30RetentionRiskReview.context?.status) === 'blocked' || first30RetentionRiskTotal >= 3 ? 'high' : 'medium',
      message: `前30章留存状态需要处理：${first30RetentionRiskReview.summary}`,
      action: actionKey === 'create_first30_repair'
        ? '生成前30章留存修复任务，优先处理开篇钩子、试读闭环和付费前蓄势。'
        : '重新运行前30章留存诊断，确认本批修改后的开篇三章、试读十章和付费前蓄势。',
      metrics: {
        first30_retention_risk_count: first30RetentionRiskTotal,
        score: first30RetentionRiskReview.context?.score ?? null,
      },
      first30Retention: first30RetentionRiskReview.context,
      actionArea: 'planning',
      actionKey,
    }))
  }
  if (postBatchQualityRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'post_batch_quality_warning',
      severity: postBatchQualityRiskTotal >= 2 ? 'high' : 'medium',
      message: `oh-story 批次交稿后质检仍有 ${postBatchQualityRiskTotal} 项未闭环：${postBatchQualityCheck.summary}`,
      action: '按批次质检摘要回修本批正文、伏笔增量、正文元信息、细纲兑现和状态机更新；修完后重新运行交稿后质检，所有 warn 清零前不继续扩批。',
      metrics: {
        post_batch_quality_risk_count: postBatchQualityRiskTotal,
        average_score: postBatchQualityCheck.average_score,
        revised_count: postBatchQualityCheck.revised_count,
      },
      postBatchQualityCheck,
    }))
  }

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

