import type {
  FuturePlanningCoverage,
  PlanningActionKey,
  PlanningBattleDeskLane,
  PlanningCreationPipelineStage,
  PlanningHealthIssue,
  PlanningRhythmSignal,
  PlanningSerialReleaseDesk,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterWordCount,
  latestReviewPayload,
  latestReviewPayloadAny,
  listLength,
  milestoneStatus,
  numericCount,
  parseJsonValue,
  planningActionLabel,
  reviewChapterNo,
  reviewTime,
  text,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

import {
  activeProductionTaskSummary,
  laneStatusFromPlanning,
  laneStatusFromRhythm,
  openDeliveryRiskRepairTaskCount,
} from './planning-workspace-builder-desks-shared'

function rhythmStatusFromSignals(signals: PlanningRhythmSignal[]): PlanningWorkspaceModel['longformRhythm']['status'] {
  if (signals.some(signal => signal.status === 'block')) return 'blocked'
  if (signals.some(signal => signal.status === 'warn')) return 'needs_attention'
  return 'ready'
}

export function buildLongformRhythmModel(args: {
  reviews: AnyRecord[]
  writtenWords: number
  currentVolumeGoal: string
  future100Coverage: FuturePlanningCoverage
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
}): PlanningWorkspaceModel['longformRhythm'] {
  const coreDrift = latestReviewPayload(args.reviews, 'chapter_core_drift', 'core_drift')
  const payoffSync = latestReviewPayload(args.reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const coreStatus: PlanningRhythmSignal['status'] = args.healthIssues.some(issue => issue.key === 'missing_reader_promise')
    ? 'block'
    : text(coreDrift?.status).toLowerCase() === 'warn' || coreRiskCount > 0
      ? 'warn'
      : 'ok'
  const future100Ratio = args.future100Coverage.required > 0
    ? args.future100Coverage.planned / args.future100Coverage.required
    : 1
  const volumeStatus: PlanningRhythmSignal['status'] = !args.currentVolumeGoal || args.volumeBeatBudget.status === 'blocked'
    ? 'block'
    : future100Ratio < 0.3 || args.volumeBeatBudget.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const payoffDebt = deliveryRiskCounts.payoffDebtCount
  const payoffStatus: PlanningRhythmSignal['status'] = payoffDebt > 0 || text(payoffSync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const fatigueRisk = args.first30Retention.status !== 'ready'
    || args.storylineBoard.overdueCount > 0
    || args.storylineBoard.debtCount > 0
    || args.storylineBoard.retentionRiskCount > 0
  const fatigueStatus: PlanningRhythmSignal['status'] = fatigueRisk ? 'warn' : 'ok'
  const bandIndex = Math.max(1, Math.floor(Math.max(0, args.writtenWords) / 100000) + 1)

  const signals: PlanningRhythmSignal[] = [
    {
      key: 'core',
      label: '核心守恒',
      status: coreStatus,
      score: coreStatus === 'block' ? 45 : coreStatus === 'warn' ? Math.min(68, boundedScore(coreDrift?.score, 68)) : boundedScore(coreDrift?.score, 88),
      detail: coreStatus === 'block'
        ? '长篇核心承诺缺失，不能进入连续生产。'
        : coreStatus === 'warn'
          ? `核心偏移 ${coreRiskCount || 1}`
          : '核心承诺、卷目标和章节服务关系稳定。',
      actionKey: coreStatus === 'ok' ? 'open_outline_tree' : 'open_story_assets',
    },
    {
      key: 'volume',
      label: '卷级推进',
      status: volumeStatus,
      score: volumeStatus === 'block' ? 45 : volumeStatus === 'warn' ? Math.min(args.volumeBeatBudget.score, Math.max(55, Math.round(future100Ratio * 100))) : 86,
      detail: volumeStatus === 'block'
        ? '当前章节没有明确卷目标。'
        : args.volumeBeatBudget.status === 'needs_attention'
          ? args.volumeBeatBudget.summary
        : volumeStatus === 'warn'
          ? `未来100章规划 ${args.future100Coverage.label}，不适合长时间自动连写。`
          : `当前卷目标明确，未来100章规划 ${args.future100Coverage.label}。`,
      actionKey: volumeStatus === 'ok' ? 'open_outline_tree' : 'update_rolling_plan',
    },
    {
      key: 'payoff',
      label: '回报兑现',
      status: payoffStatus,
      score: boundedScore(payoffSync?.score, payoffStatus === 'warn' ? 64 : 86),
      detail: payoffStatus === 'warn'
        ? text(payoffSync?.label, `回报欠账 ${payoffDebt}`)
        : '章节承诺、场景回报和待回收期待处于可控状态。',
      actionKey: payoffStatus === 'ok' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'fatigue',
      label: '疲劳风险',
      status: fatigueStatus,
      score: fatigueStatus === 'warn' ? Math.max(50, Math.min(78, Number(args.first30Retention.score || 72))) : 86,
      detail: fatigueStatus === 'warn'
        ? `剧情线债务 ${args.storylineBoard.debtCount}，逾期 ${args.storylineBoard.overdueCount}，前30章状态 ${args.first30Retention.status}。`
        : '留存曲线、剧情线推进和回收压力没有明显疲劳信号。',
      actionKey: fatigueStatus === 'warn' ? 'run_first30_retention' : 'enter_chapter_writing',
    },
  ]
  const status = rhythmStatusFromSignals(signals)
  const score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length))))
  const riskySignals = signals.filter(signal => signal.status !== 'ok')

  return {
    status,
    score,
    label: status === 'ready' ? `节奏健康 ${score}` : status === 'blocked' ? `节奏阻塞 ${score}` : `节奏风险 ${score}`,
    summary: status === 'ready'
      ? '长篇节奏稳定，可以继续推进当前章。'
      : `长篇节奏存在 ${riskySignals.length} 项风险：${riskySignals.map(signal => signal.label).join('、')}。`,
    currentBandLabel: `第${bandIndex}个10万字`,
    signals,
    nextActions: status === 'ready'
      ? ['保持卷目标、回报兑现和剧情线回收的节奏闭环。']
      : ['先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。'],
  }
}

export function buildLongformBattleDeskModel(args: {
  reviews: AnyRecord[]
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
  storyUnitWorkshop: PlanningWorkspaceModel['storyUnitWorkshop']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
}): PlanningWorkspaceModel['longformBattleDesk'] {
  const coreSignal = args.longformRhythm.signals.find(signal => signal.key === 'core')
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const storylineSync = latestReviewPayloadAny(args.reviews, 'storyline_sync', 'storyline_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const spineBlocked = args.longformSpineGuard.status === 'blocked'
  const spineNeedsAttention = args.longformSpineGuard.status !== 'ready'
  const storylineMissedCount = Math.max(listLength(storylineSync?.missed), deliveryRiskCounts.storylineRiskCount)
  const storylineForbiddenCount = listLength(storylineSync?.forbidden_touched)
  const readerPullStatus: PlanningBattleDeskLane['status'] = args.first30Retention.status === 'blocked'
    ? 'block'
    : args.first30Retention.status !== 'ready' || args.readerTrustLedger.status === 'needs_attention' || args.readerTrialRoom.status === 'blocked'
      ? 'warn'
      : 'ok'
  const milestoneStatus: PlanningBattleDeskLane['status'] = args.millionWordMilestones.status === 'blocked'
    ? 'block'
    : args.millionWordMilestones.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const productionFuelStatus: PlanningBattleDeskLane['status'] = milestoneStatus === 'block' || !args.future10Coverage.ready || !args.future100Coverage.ready || args.storyUnitWorkshop.status !== 'ready'
    ? milestoneStatus === 'block' || args.storyUnitWorkshop.status === 'blocked' ? 'block' : 'warn'
    : 'ok'
  const futureScore = Math.round(((args.future10Coverage.ready ? 100 : args.future10Coverage.planned * 10) + (args.future100Coverage.required > 0 ? (args.future100Coverage.planned / args.future100Coverage.required) * 100 : 100)) / 2)

  const lanes: PlanningBattleDeskLane[] = [
    {
      key: 'story_core',
      label: '核心守恒',
      status: spineBlocked ? 'block' : spineNeedsAttention ? 'warn' : coreRiskCount > 0 ? 'warn' : laneStatusFromRhythm(coreSignal?.status),
      score: spineNeedsAttention ? args.longformSpineGuard.score : boundedScore(coreDrift?.score, coreSignal?.score || args.longformRhythm.score),
      detail: spineNeedsAttention
        ? `全书主轴缺 ${args.longformSpineGuard.missingAxes.join('、') || '可选护栏'}，不能放大自动连写。`
        : coreRiskCount > 0
          ? `核心偏移 ${coreRiskCount}`
          : coreSignal?.detail || '核心承诺稳定。',
      actionKey: spineNeedsAttention ? args.longformSpineGuard.actionKey : coreRiskCount > 0 ? 'open_quality_revision' : coreSignal?.actionKey || 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullStatus,
      score: boundedScore(args.first30Retention.score ?? args.readerTrustLedger.score ?? args.readerTrialRoom.score, readerPullStatus === 'ok' ? 86 : 68),
      detail: args.first30Retention.status !== 'ready'
        ? `前30章：${args.first30Retention.summary}`
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.summary
          : args.readerTrialRoom.status === 'blocked'
            ? args.readerTrialRoom.summary
            : '前30章、追读信任和试读拉力可继续支撑当前章。',
      actionKey: args.first30Retention.status !== 'ready'
        ? args.first30Retention.actionKey
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.actionKey
          : args.readerTrialRoom.status !== 'ready' && args.readerTrialRoom.status !== 'missing'
            ? args.readerTrialRoom.actionKey
            : 'enter_chapter_writing',
    },
    {
      key: 'storyline',
      label: '剧情线调度',
      status: args.storylineBoard.status === 'missing' ? 'block' : args.storylineBoard.status === 'needs_attention' || storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 'warn' : 'ok',
      score: storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 62 : args.storylineBoard.status === 'ready' ? 86 : 70,
      detail: storylineMissedCount > 0 || storylineForbiddenCount > 0
        ? `剧情线漏推 ${storylineMissedCount}，禁揭风险 ${storylineForbiddenCount}。`
        : args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' && storylineMissedCount === 0 && storylineForbiddenCount === 0 ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'volume_beat',
      label: '卷级爆点',
      status: laneStatusFromPlanning(args.volumeBeatBudget.status),
      score: args.volumeBeatBudget.score,
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: args.innovationRadar.status === 'missing' ? 'warn' : args.innovationRadar.status === 'needs_attention' ? 'warn' : 'ok',
      score: boundedScore(args.innovationRadar.score, args.innovationRadar.status === 'ready' ? 86 : 66),
      detail: args.innovationRadar.missedCount > 0 ? `创新缺口 ${args.innovationRadar.missedCount}：${args.innovationRadar.summary}` : args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : args.innovationRadar.actionKey,
    },
    {
      key: 'production_fuel',
      label: '生产燃料',
      status: productionFuelStatus,
      score: boundedScore(Math.min(futureScore, args.storyUnitWorkshop.score, args.millionWordMilestones.score), productionFuelStatus === 'ok' ? 86 : 65),
      detail: milestoneStatus !== 'ok'
        ? `百万字里程碑：${args.millionWordMilestones.summary}`
        : `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，剧情单元：${args.storyUnitWorkshop.label}。`,
      actionKey: milestoneStatus !== 'ok'
        ? args.millionWordMilestones.actionKey
        : !args.future100Coverage.ready ? 'future100_generate' : !args.future10Coverage.ready || args.storyUnitWorkshop.status !== 'ready' ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['longformBattleDesk']['status'] = lanes.some(lane => lane.status === 'block')
    ? 'blocked'
    : lanes.some(lane => lane.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length))))
  const priorityOrder: PlanningBattleDeskLane['key'][] = ['story_core', 'reader_pull', 'storyline', 'volume_beat', 'innovation_ip', 'production_fuel']
  const primaryLane = priorityOrder
    .map(key => lanes.find(lane => lane.key === key))
    .find((lane): lane is PlanningBattleDeskLane => Boolean(lane && lane.status !== 'ok')) || lanes[0]
  const riskChips = lanes.flatMap(lane => {
    if (lane.status === 'ok') return []
    if (lane.key === 'story_core') return ['核心偏移']
    if (lane.key === 'reader_pull') return ['前30章留存']
    if (lane.key === 'storyline') return storylineMissedCount > 0 ? ['剧情线漏推'] : ['剧情线调度']
    if (lane.key === 'volume_beat') return ['卷级爆点']
    if (lane.key === 'innovation_ip') return ['创新缺口']
    return ['生产燃料']
  })

  return {
    status,
    score,
    label: status === 'ready' ? `长篇作战 ${score}` : status === 'blocked' ? `长篇作战阻塞 ${score}` : `长篇作战待治理 ${score}`,
    summary: status === 'ready'
      ? '核心、留存、剧情线、卷级爆点、创新场面和生产燃料都能支撑继续写作。'
      : `先处理 ${primaryLane.label}：${primaryLane.detail}`,
    primaryAction: {
      key: primaryLane.actionKey,
      label: planningActionLabel(primaryLane.actionKey),
      reason: primaryLane.detail,
    },
    lanes,
    riskChips: Array.from(new Set(riskChips)).slice(0, 6),
  }
}

function pipelineStatusFromPlanning(status: string): PlanningCreationPipelineStage['status'] {
  if (['blocked', 'missing', 'block'].includes(status)) return 'block'
  if (['needs_attention', 'needs_action', 'needs_repair', 'needs_buffer', 'needs_planning', 'stale', 'warn', 'drifting'].includes(status)) return 'warn'
  return 'ok'
}

export function buildCreationPipelineModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  characterArcBoard: PlanningWorkspaceModel['characterArcBoard']
  activeChapter: AnyRecord
  currentVolumeGoal: string
  governanceHub: PlanningWorkspaceModel['governanceHub']
  serialReleaseDesk: PlanningWorkspaceModel['serialReleaseDesk']
}): PlanningWorkspaceModel['creationPipeline'] {
  const activeChapterPlanned = Boolean(
    text(args.activeChapter?.chapter_goal || args.activeChapter?.chapterTask || args.activeChapter?.task) &&
    text(args.activeChapter?.conflict || args.activeChapter?.raw_payload?.conflict) &&
    text(args.activeChapter?.ending_hook || args.activeChapter?.endingHook || args.activeChapter?.hook) &&
    args.currentVolumeGoal
  )
  const longformPlanBlocked = args.millionWordMilestones.status === 'blocked'
  const longformPlanWarn = !args.future10Coverage.ready
    || !args.future100Coverage.ready
    || args.millionWordMilestones.status !== 'ready'
  const longformPlanAction: PlanningActionKey = args.millionWordMilestones.status !== 'ready'
    ? args.millionWordMilestones.actionKey
    : !args.future10Coverage.ready
      ? 'update_rolling_plan'
      : !args.future100Coverage.ready
        ? 'future100_generate'
        : 'complete_volume_plan'
  const assetBlocked = args.storylineBoard.status === 'missing' || args.characterArcBoard.status === 'missing'
  const assetWarn = args.storylineBoard.status !== 'ready' || args.characterArcBoard.status !== 'ready'
  const chapterLaunchStatus: PlanningCreationPipelineStage['status'] = activeChapterPlanned ? 'ok' : 'warn'
  const stages: PlanningCreationPipelineStage[] = [
    {
      key: 'book_core',
      label: '全书核心',
      status: pipelineStatusFromPlanning(args.longformSpineGuard.status),
      active: false,
      score: args.longformSpineGuard.score,
      detail: args.longformSpineGuard.summary,
      actionKey: args.longformSpineGuard.actionKey,
    },
    {
      key: 'longform_plan',
      label: '长线规划',
      status: longformPlanBlocked ? 'block' : longformPlanWarn ? 'warn' : 'ok',
      active: false,
      score: Math.min(
        args.millionWordMilestones.score,
        Math.round(((args.future10Coverage.planned / Math.max(1, args.future10Coverage.required)) * 100 + (args.future100Coverage.planned / Math.max(1, args.future100Coverage.required)) * 100) / 2),
      ),
      detail: longformPlanWarn
        ? `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，里程碑：${args.millionWordMilestones.label}。`
        : '未来章节、百万字里程碑和当前卷规划可支撑继续开写。',
      actionKey: longformPlanAction,
    },
    {
      key: 'story_assets',
      label: '设定资产',
      status: assetBlocked ? 'block' : assetWarn ? 'warn' : 'ok',
      active: false,
      score: assetBlocked ? 50 : assetWarn ? 72 : 88,
      detail: assetWarn
        ? `${args.storylineBoard.summary} ${args.characterArcBoard.summary}`
        : '剧情线、角色线和关系线已进入可调度状态。',
      actionKey: assetWarn ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'chapter_launch',
      label: '章节开写',
      status: chapterLaunchStatus,
      active: false,
      score: activeChapterPlanned ? 88 : 66,
      detail: activeChapterPlanned
        ? '当前章已有目标、冲突、章末钩子和卷目标承接，可进入开写任务书。'
        : '当前章缺少目标、冲突、章末钩子或卷目标承接，建议先补章节计划。',
      actionKey: activeChapterPlanned ? 'enter_chapter_writing' : 'update_rolling_plan',
    },
    {
      key: 'delivery_acceptance',
      label: '交稿验收',
      status: pipelineStatusFromPlanning(args.governanceHub.status),
      active: false,
      score: args.governanceHub.status === 'ready' ? 88 : args.governanceHub.status === 'blocked' ? 55 : 72,
      detail: args.governanceHub.summary,
      actionKey: args.governanceHub.primaryAction.key,
    },
    {
      key: 'serial_release',
      label: '连载发布',
      status: pipelineStatusFromPlanning(args.serialReleaseDesk.status),
      active: false,
      score: args.serialReleaseDesk.score,
      detail: args.serialReleaseDesk.summary,
      actionKey: args.serialReleaseDesk.primaryAction.key,
    },
  ]
  const current = stages.find(stage => stage.status !== 'ok') || stages.find(stage => stage.key === 'chapter_launch') || stages[0]
  const normalizedStages = stages.map(stage => ({ ...stage, active: stage.key === current.key }))
  const riskCount = normalizedStages.filter(stage => stage.status !== 'ok').length
  return {
    currentStageKey: current.key,
    summary: riskCount > 0
      ? `当前建议先处理「${current.label}」：${current.detail}`
      : '全书核心、长线规划、设定资产、章节开写、交稿验收和连载发布均处于可推进状态。',
    riskCount,
    primaryAction: {
      key: current.actionKey,
      label: planningActionLabel(current.actionKey),
      reason: current.detail,
    },
    stages: normalizedStages,
  }
}

