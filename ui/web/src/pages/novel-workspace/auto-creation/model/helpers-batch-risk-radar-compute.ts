import type {
  PlanningWorkspaceModel,
} from '../../planningWorkspaceModel'
import type {
  AnyRecord,
  AutoCreationBatchReviewItem,
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
  buildSerialRhythmReview,
  buildStoryDriveReview,
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
  retentionRiskCount,
  riskPayload,
  runwayRiskCount,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  volumeSegmentRiskCount,
} from './helpers-main'
import {
  batchBriefAppliesToItem,
  buildBatchPlanContext,
  first30RetentionRisk,
  normalizePostBatchQualityCheck,
} from './helpers-safe-batch-expansion-structure'
import {
  arrayValue,
  firstText,
  text,
} from './helpers-basics'
import {
  buildBatchRiskRadarGuardCompute,
} from './helpers-batch-risk-radar-compute-guards'

export function buildBatchRiskRadarCompute(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  planning?: PlanningWorkspaceModel | null
  resolvedIssueKeys?: Set<string>
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  expansionFeedback?: AnyRecord | null
  postBatchQualityCheck?: AnyRecord | null
}): Record<string, any> {
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
  const guard = buildBatchRiskRadarGuardCompute({
    args,
    successfulItems,
    postBatchQualityCheck,
    postBatchQualityRiskTotal,
    coreRiskTotal,
    runwayRiskTotal,
    payoffDebtTotal,
    readerPullRiskTotal,
    readerTrialRiskTotal,
    first30RetentionRiskTotal,
    handoffRiskTotal,
    storylineRiskTotal,
    storyDriveRiskTotal,
    innovationRiskTotal,
    signatureSceneRiskTotal,
    chapterAttractionRiskTotal,
    styleSampleRiskTotal,
    forbiddenBoundaryRiskTotal,
    expansionChapterRisks,
    serialRhythmReview,
    serialRhythmRiskTotal,
    assetGrowthReview,
    assetGrowthRiskTotal,
    readerTrialReview,
    readerTrialRiskItem,
    first30RetentionRiskReview,
    first30RetentionRiskItem,
    batchPlanRiskTotal,
    repairTasks,
  })
  return {
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
    ...guard,
  }
}
