import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
export * from './types'
import type {
  AnyRecord,
  AutoCreationDirectorAction,
  AutoCreationDirectorModel,
  AutoCreationDirectorStatus,
  BuildAutoCreationDirectorModelInput,
} from './types'
export * from './helpers'
import {
  arrayValue,
  text,
  firstText,
  planningAction,
  writingAction,
  latestChapterOhStoryDirectorEntry,
  postDraftDirectorAction,
  sameChapterIdentity,
  acceptanceDeskBlocksDirector,
  opsAction,
  deliveryRiskRepairPayload,
  buildCanonRunway,
  targetChapter,
  taskLabel,
  hasRunningTasks,
  planningBlocker,
  retentionNeedsAction,
  storylineNeedsAction,
  characterArcNeedsAction,
  rhythmNeedsAction,
  volumeBeatNeedsAction,
  rhythmAction,
  buildDeliveryRiskGate,
  buildStorylineDecisionGate,
  buildGovernanceClosureBrief,
  buildGovernanceRecheckMemory,
  buildManualTestReadiness,
  buildLongformCompass,
  buildChapterLaunchGate,
  buildWritingQueueFocus,
  buildRollingScriptRoom,
  creationContractFromReview,
  buildLongformCreationContract,
  buildLongformCapacity,
  buildBatchGuardrail,
  buildMillionWordRunway,
  buildBatchReviewQueue,
  reconcileBatchHandoffWithGuardrail,
  buildDailyBattlePlan,
  buildProductionLicense,
  buildTodayCommandDeck,
  buildPipeline,
  buildCreationPipeline,
  buildSerialWorkflow,
  fallbackSecondaryActions,
  buildAutoCreationRepairPlan,
  buildDirectorBattleDesk,
  buildSerialCockpit,
} from './helpers'

export function buildAutoCreationDirectorModel(input: BuildAutoCreationDirectorModelInput): AutoCreationDirectorModel {
  const planning = input.planning
  const writing = input.writing
  const chapters = arrayValue(input.chapters)
  const activeTasks = arrayValue(input.activeTasks)
  const runRecords = arrayValue(input.runRecords)
  const reviews = arrayValue(input.reviews)
  const hasModel = Boolean(input.selectedModelId)
  const chapter = targetChapter(writing)
  const blockingPlan = planningBlocker(planning)
  const running = hasRunningTasks(activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const characterArcActionNeeded = characterArcNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const reviewedContract = creationContractFromReview(reviews)
  const creationContract = reviewedContract.contract || buildLongformCreationContract(planning, writing)
  const longformCompass = buildLongformCompass(planning, reviews)
  const longformBattleDesk = buildDirectorBattleDesk(planning)
  const chapterLaunchGate = buildChapterLaunchGate(planning, writing, longformCompass)
  const longformCapacity = buildLongformCapacity(planning)
  const manualTestReadiness = buildManualTestReadiness({
    planning,
    writing,
    reviews,
    chapters,
    storyState: input.storyState || {},
  })
  const canonRunway = buildCanonRunway(writing)
  const deliveryRiskGate = buildDeliveryRiskGate({
    reviews,
    runRecords,
    chapters,
  })
  const storylineDecisionGate = buildStorylineDecisionGate(runRecords)
  const governanceClosureBrief = buildGovernanceClosureBrief({ runRecords, storylineDecisionGate })
  const governanceRecheckMemory = buildGovernanceRecheckMemory({ runRecords, storylineDecisionGate })
  let batchReviewQueue = buildBatchReviewQueue({
    runRecords,
    chapters,
    reviews,
    planning,
    storyState: input.storyState || {},
  })
  const postDraftDirectorEntry = latestChapterOhStoryDirectorEntry(chapters)
  const postDraftDirector = postDraftDirectorEntry?.director || null
  const postDraftContinuationAction = postDraftDirectorAction(postDraftDirector)
  const blockers: string[] = []
  const confirmations: string[] = []
  const writingQueueFocus = buildWritingQueueFocus(writing)
  const rollingScriptRoom = buildRollingScriptRoom(planning, writing, longformCompass)
  let status: AutoCreationDirectorStatus
  let statusLabel: string
  let headline: string
  let summary: string
  let mainAction: AutoCreationDirectorAction

  if (!hasModel) {
    status = 'blocked'
    statusLabel = '缺模型'
    headline = '先选择可用模型'
    summary = '自动创作需要一个健康的文本模型来执行规划、场景卡、正文和复检。'
    blockers.push('未选择模型')
    mainAction = opsAction('select_model', '选择模型', '在顶部模型选择器中选择一个可用模型。', true)
  } else if (running) {
    status = 'running'
    statusLabel = '生产中'
    headline = '后台任务正在运行'
    summary = '当前已有长耗时任务在执行，先查看任务中心，避免重复触发同一段生产链路。'
    mainAction = opsAction('open_task_center', '查看任务中心', '查看进度、失败原因和可恢复任务。')
  } else if (blockingPlan) {
    status = 'blocked'
    statusLabel = '规划阻塞'
    headline = '长篇自动生产前置规划不足'
    summary = blockingPlan.detail
    blockers.push(blockingPlan.title)
    mainAction = planningAction(blockingPlan.actionKey, blockingPlan.detail)
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'warn') {
    status = 'needs_acceptance'
    statusLabel = '批次待复盘'
    headline = '安全连写批次需要先复盘'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次需要复盘')
    mainAction = batchReviewQueue.nextAction
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'risk') {
    status = 'needs_acceptance'
    statusLabel = '批次有风险'
    headline = '安全连写批次需要质量复盘'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次存在质量风险')
    mainAction = batchReviewQueue.nextAction
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'ok') {
    status = 'needs_acceptance'
    statusLabel = '批次待验收'
    headline = '安全连写批次需要逐章验收'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次需要逐章验收')
    mainAction = batchReviewQueue.nextAction
  } else if (deliveryRiskGate.status === 'block') {
    status = 'needs_governance'
    statusLabel = '交稿风险待处理'
    headline = '先清理高风险交稿批注'
    summary = deliveryRiskGate.summary
    confirmations.push('未清交稿风险会阻止安全连写')
    mainAction = opsAction('create_delivery_risk_repair', '生成风险修复任务', deliveryRiskGate.summary, false, deliveryRiskRepairPayload(deliveryRiskGate))
  } else if (retentionActionNeeded) {
    status = 'needs_governance'
    statusLabel = '留存待治理'
    headline = '先校准前30章留存曲线'
    summary = planning.first30Retention.summary
    confirmations.push('前30章留存需要确认')
    mainAction = planningAction(planning.first30Retention.actionKey, '在进入连续生产前，先确认开篇三章、试读十章和付费前蓄势。')
  } else if (storylineActionNeeded) {
    status = 'needs_governance'
    statusLabel = '剧情线待治理'
    headline = '先校准主线、支线和伏笔线'
    summary = planning.storylineBoard.summary
    confirmations.push('剧情线需要调度确认')
    mainAction = planningAction('open_story_assets', '进入设定资产页，补齐或确认主线、支线、角色线、关系线、势力线和伏笔线。')
  } else if (characterArcActionNeeded) {
    status = 'needs_governance'
    statusLabel = '人物成长待治理'
    headline = '先校准人物成长和关系张力'
    summary = planning.characterArcBoard.summary
    confirmations.push('人物成长需要治理确认')
    mainAction = planningAction(planning.characterArcBoard.actionKey, '先处理人物成长看板中的成长断档、关系待推进或人物弧光缺口。')
  } else if (volumeBeatActionNeeded) {
    status = 'needs_governance'
    statusLabel = '爆点预算待补'
    headline = '先补齐当前卷高潮和爽点预算'
    summary = planning.volumeBeatBudget.summary
    confirmations.push('卷级高潮预算需要补齐')
    mainAction = planningAction('complete_volume_plan', planning.volumeBeatBudget.nextActions[0] || '补齐当前卷的小高潮、中高潮和卷末爆点。')
  } else if (rhythmActionNeeded) {
    status = 'needs_governance'
    statusLabel = '节奏待治理'
    headline = '先校准长篇节奏再连续生成'
    summary = planning.longformRhythm.summary
    confirmations.push('长篇节奏需要校准')
    mainAction = planningAction(rhythmAction(planning), planning.longformRhythm.nextActions[0] || '先处理长篇节奏风险，再进入连续章节生产。')
  } else if (canonRunway.staleState && !['accepted', 'accepted_with_warnings'].includes(text(writing.chapterAcceptanceDesk?.admissionStatus))) {
    status = 'needs_governance'
    statusLabel = '长线记忆待同步'
    headline = '先同步故事状态再连续生产'
    summary = canonRunway.detail
    confirmations.push('故事状态需要同步')
    mainAction = canonRunway.action
  } else if (
    postDraftContinuationAction
    && !acceptanceDeskBlocksDirector(writing.chapterAcceptanceDesk)
    && (sameChapterIdentity(postDraftDirectorEntry?.chapter, chapter) || !writing.chapterAcceptanceDesk?.visible)
  ) {
    const carryoverFindings = arrayValue(postDraftDirector?.carryover_findings || postDraftDirector?.carryoverFindings)
    const acceptance = text(postDraftDirector?.acceptance)
    const directorChapterNo = Number(postDraftDirectorEntry?.chapter?.chapter_no ?? postDraftDirectorEntry?.chapter?.chapterNo)
    status = 'needs_acceptance'
    statusLabel = acceptance === 'accepted_with_carryover' ? '可继续，有承接' : '可继续'
    headline = Number.isFinite(directorChapterNo) ? `第 ${directorChapterNo} 章已通过总导演验收` : '当前章已通过总导演验收'
    summary = carryoverFindings
      .map((finding: AnyRecord) => firstText(finding.detail, finding.label, finding.key))
      .filter(Boolean)
      .join('；') || text(postDraftDirector?.blocking_summary || postDraftDirector?.blockingSummary, '总导演验收通过，可以继续下一章。')
    confirmations.push(statusLabel)
    mainAction = postDraftContinuationAction
  } else if (writing.chapterAcceptanceDesk.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction
    status = 'needs_acceptance'
    statusLabel = writing.chapterAcceptanceDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章进入交稿闭环` : '当前章进入交稿闭环'
    summary = writing.chapterAcceptanceDesk.acceptanceReasons[0] || '按质检、修订、状态同步和验收顺序处理当前章。'
    mainAction = writingAction(action.key, '处理当前章交稿门禁，不跳过质检和状态回填。', action.label)
  } else if (chapterLaunchGate.status === 'blocked') {
    status = 'needs_governance'
    statusLabel = '开写门禁'
    headline = '先校准本章再生成正文'
    summary = chapterLaunchGate.summary
    confirmations.push('本章开写门禁未通过')
    mainAction = chapterLaunchGate.action
  } else {
    const plannerAction = writing.chapterPlanningDesk.recommendedPlannerAction
    status = 'ready'
    statusLabel = writingQueueFocus.visible ? writingQueueFocus.label : writing.chapterPlanningDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章可以推进` : '可以推进下一章'
    summary = writingQueueFocus.visible ? writingQueueFocus.summary : writing.chapterPlanningDesk.reasons[0] || writing.topStatus.nextActionLabel
    mainAction = writingQueueFocus.visible
      ? writingQueueFocus.action
      : writingAction(plannerAction.key || writing.primaryActionKey, '按章节任务书和场景卡推进当前章。', plannerAction.label)
  }

  const batchGuardrail = buildBatchGuardrail({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    mainAction,
    longformCapacity,
    deliveryRiskGate,
    governanceRecheckMemory,
    storylineDecisionGate,
    chapterLaunchGate,
    storyState: input.storyState || {},
    chapters: arrayValue(input.chapters),
    reviews,
    styleSampleEffectiveness: input.styleSampleEffectiveness || null,
    runRecords,
  })
  batchReviewQueue = reconcileBatchHandoffWithGuardrail(batchReviewQueue, batchGuardrail)
  if (batchReviewQueue.handoff.status === 'prepare_next' && status === 'ready') {
    status = 'needs_governance'
    statusLabel = '下一批待准备'
    headline = '补齐下一批计划再连写'
    summary = batchReviewQueue.handoff.summary
    confirmations.push('下一批安全连写护栏未放行')
    mainAction = batchReviewQueue.handoff.action
  }
  const millionWordRunway = buildMillionWordRunway({
    planning,
    writing,
    longformCompass,
    creationContract,
    chapterLaunchGate,
    canonRunway,
    batchGuardrail,
  })
  const dailyBattlePlan = buildDailyBattlePlan({
    planning,
    writing,
    mainAction,
    deliveryRiskGate,
    batchGuardrail,
    batchReviewQueue,
    longformCapacity,
    writingQueueFocus,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    activeTasks,
  })
  const productionLicense = buildProductionLicense({
    hasModel,
    mainAction,
    dailyBattlePlan,
    deliveryRiskGate,
    governanceClosureBrief,
    storylineDecisionGate,
    batchReviewQueue,
    batchGuardrail,
    chapterLaunchGate,
    millionWordRunway,
  })
  const todayCommandDeck = buildTodayCommandDeck({
    dailyBattlePlan,
    productionLicense,
    creationContract,
    chapterLaunchGate,
    deliveryRiskGate,
    governanceRecheckMemory,
    storylineDecisionGate,
    batchGuardrail,
    millionWordRunway,
  })
  const serialCockpit = buildSerialCockpit({
    planning,
    writing,
    todayCommandDeck,
    creationContract,
    chapterLaunchGate,
    deliveryRiskGate,
    governanceClosureBrief,
    storylineDecisionGate,
    longformCompass,
    millionWordRunway,
    batchGuardrail,
    productionLicense,
    batchReviewQueue,
  })
  const pipeline = buildPipeline({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    creationContract,
    longformCapacity,
    rollingScriptRoom,
    batchGuardrail,
  })
  const serialWorkflow = buildSerialWorkflow({
    hasModel,
    mainAction,
    status,
    writing,
    creationContract,
    pipeline,
    productionLicense,
    batchGuardrail,
    deliveryRiskGate,
  })
  const creationPipeline = buildCreationPipeline({
    planning,
    mainAction,
    serialWorkflow,
  })
  const repairPlan = buildAutoCreationRepairPlan({
    status,
    mainAction,
    planning,
    manualTestReadiness,
    deliveryRiskGate,
    rollingScriptRoom,
    batchReviewQueue,
    chapterLaunchGate,
  })

  return {
    status,
    statusLabel,
    headline,
    summary,
    targetChapter: chapter,
    mainAction,
    secondaryActions: fallbackSecondaryActions(planning, writing).filter(action => action.key !== mainAction.key),
    repairPlan,
    blockers,
    confirmations,
    queue: {
      activeCount: activeTasks.length,
      labels: activeTasks.slice(0, 3).map(taskLabel),
    },
    metrics: {
      writtenWords: planning.topStatus.writtenWords,
      targetWords: planning.topStatus.targetWords,
      future10Label: planning.topStatus.future10Coverage.label,
      first30Score: planning.first30Retention.score,
      storylineCount: planning.storylineBoard.total,
      creationDiagnosisScore: reviewedContract.score,
      longformRhythmScore: planning.longformRhythm?.score ?? null,
      volumeBeatScore: planning.volumeBeatBudget?.score ?? null,
      longformCapacityScore: longformCapacity.score,
    },
    longformRhythm: planning.longformRhythm,
    longformBattleDesk,
    longformCapacity,
    longformCompass,
    manualTestReadiness,
    creationContract,
    chapterLaunchGate,
    dailyBattlePlan,
    productionLicense,
    todayCommandDeck,
    serialCockpit,
    governanceClosureBrief,
    storylineDecisionGate,
    millionWordRunway,
    writingQueueFocus,
    rollingScriptRoom,
    deliveryRiskGate,
    batchGuardrail,
    batchReviewQueue,
    creationPipeline,
    serialWorkflow,
    pipeline,
  }
}
