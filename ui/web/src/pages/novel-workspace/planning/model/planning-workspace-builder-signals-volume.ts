import type {
  PlanningStoryUnit,
  PlanningStoryUnitSignal,
  PlanningWorkspaceModel,
  PlanningActionKey
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterRange,
  firstNonEmpty,
  isStage,
  isTurn,
  latestReviewPayloadAny,
  listLength,
  numericCount,
  parseJsonValue,
  text,
  reviewHasPayload,
  itemTextList,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

function latestDeliveryRiskCounts(reviews: AnyRecord[]) {
  return aggregateDeliveryRiskCounts(reviews)
}

export function buildVolumeSegmentGateModel(args: {
  currentVolume: AnyRecord
  currentVolumeGoal: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
}): PlanningWorkspaceModel['volumeSegmentGate'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start || 1)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const total = start && end ? Math.max(1, end - start + 1) : Math.max(1, args.volumeBeatBudget.totalChapters || 50)
  const written = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= (start || 1) && chapterNo <= end && chapterHasProse(chapter)
  }).length
  const percent = Math.max(0, Math.min(100, Math.round((written / total) * 100)))
  const riskCounts = latestDeliveryRiskCounts(args.reviews)
  const ipSignal = args.innovationRadar.signals.find(signal => signal.key === 'ip_adaptation')
  const signals: PlanningWorkspaceModel['volumeSegmentGate']['signals'] = [
    {
      key: 'volume_goal',
      label: '阶段目标',
      status: args.currentVolumeGoal ? 'ok' : 'block',
      score: args.currentVolumeGoal ? 88 : 35,
      count: args.currentVolumeGoal ? 0 : 1,
      detail: args.currentVolumeGoal ? `当前卷目标：${args.currentVolumeGoal}` : '当前卷缺少明确阶段目标，不能判断这一段服务什么读者承诺。',
      actionKey: args.currentVolumeGoal ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'climax_payoff',
      label: '高潮/回报',
      status: args.volumeBeatBudget.status === 'ready' ? 'ok' : args.volumeBeatBudget.status === 'blocked' ? 'block' : 'warn',
      score: args.volumeBeatBudget.score,
      count: Math.max(0, args.volumeBeatBudget.climaxTarget - args.volumeBeatBudget.climaxCount)
        + Math.max(0, args.volumeBeatBudget.payoffTarget - args.volumeBeatBudget.payoffCount),
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'reader_trust',
      label: '读者信任',
      status: args.readerTrustLedger.status === 'ready' ? 'ok' : args.readerTrustLedger.status === 'missing' ? 'warn' : 'warn',
      score: args.readerTrustLedger.score !== null ? boundedScore(args.readerTrustLedger.score, 70) : args.readerTrustLedger.status === 'ready' ? 86 : 68,
      count: args.readerTrustLedger.expectationDebtCount + args.readerTrustLedger.payoffDebtCount + args.readerTrustLedger.retentionMissedCount,
      detail: args.readerTrustLedger.summary,
      actionKey: args.readerTrustLedger.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP化',
      status: args.innovationRadar.status === 'ready' ? 'ok' : 'warn',
      score: args.innovationRadar.score !== null ? boundedScore(args.innovationRadar.score, 70) : args.innovationRadar.status === 'ready' ? 86 : 68,
      count: args.innovationRadar.missedCount,
      detail: ipSignal?.detail || args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'risk_closure',
      label: '风险闭环',
      status: riskCounts.total > 0 ? 'warn' : 'ok',
      score: Math.max(45, 100 - riskCounts.total * 8),
      count: riskCounts.total,
      detail: riskCounts.total > 0
        ? `仍有 ${riskCounts.total} 项核心、回报、追读、创新、爆点、剧情线或可读性风险没有收干净。`
        : '最近章节交稿风险已收敛，可以进入下一段推进。',
      actionKey: riskCounts.total > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['volumeSegmentGate']['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 70)
  const actionKey = signals.find(signal => signal.status === 'block')?.actionKey
    || signals.find(signal => signal.key === 'climax_payoff' && signal.status !== 'ok')?.actionKey
    || signals.find(signal => signal.status === 'warn')?.actionKey
    || 'enter_chapter_writing'
  const nextActions = status === 'ready'
    ? ['当前卷段目标、爆点、读者信任和创新场面基本闭环，可以继续推进下一批章节。']
    : [
        '先补齐当前卷爆点、爽点回报和 IP 化场面，再扩大连续生产。',
        '阶段验收未通过时，优先修最近章节的读者期待欠账、创新缺口和剧情线风险。',
      ]

  return {
    status,
    score,
    label: status === 'ready' ? `卷段验收 ${score}` : status === 'blocked' ? `卷段阻塞 ${score}` : `卷段待修 ${score}`,
    summary: status === 'ready'
      ? '当前卷段的目标、高潮回报、读者信任、创新/IP化场面和风险闭环都可支撑继续连载。'
      : `当前卷段还有 ${signals.filter(signal => signal.status !== 'ok').length} 类问题，先完成阶段验收再扩大批量生产。`,
    currentSegmentLabel: start && end ? `第${start}-${end}章` : args.volumeBeatBudget.chapterRange,
    actionKey,
    chapterProgress: { written, total, percent },
    signals,
    nextActions,
  }
}

