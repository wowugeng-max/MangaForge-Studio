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

export function buildReaderTrustLedgerModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrustLedger'] {
  const expectation = latestReviewPayloadAny(reviews, 'reader_expectation_sync', 'reader_expectation_sync')
  const payoff = latestReviewPayloadAny(reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const retention = latestReviewPayloadAny(reviews, 'reader_retention_sync', 'reader_retention_sync')
  const hasAnyReview = reviewHasPayload(expectation) || reviewHasPayload(payoff) || reviewHasPayload(retention)
  const expectationDebtCount = numericCount(expectation?.missed_count, expectation?.missedCount, listLength(expectation?.missed))
  const payoffDebtCount = numericCount(payoff?.debt_count, payoff?.debtCount, listLength(payoff?.missed) + listLength(payoff?.debts))
  const retentionMissedCount = numericCount(retention?.missed_count, retention?.missedCount, listLength(retention?.missed))
  const keepAliveCount = listLength(expectation?.keep_alive)
  const expectationDetail = expectationDebtCount > 0
    ? itemTextList(arrayValue(expectation?.missed)) || text(expectation?.summary || expectation?.label, `期待欠账 ${expectationDebtCount}`)
    : reviewHasPayload(expectation)
      ? text(expectation?.summary || expectation?.label, '本章读者期待已基本兑现。')
      : '交稿后同步故事状态，会形成期待兑现复盘。'
  const payoffDetail = payoffDebtCount > 0
    ? itemTextList([...arrayValue(payoff?.missed), ...arrayValue(payoff?.debts)]) || text(payoff?.summary || payoff?.label, `回报欠账 ${payoffDebtCount}`)
    : reviewHasPayload(payoff)
      ? text(payoff?.summary || payoff?.label, '场景回报和待回收期待处于可控状态。')
      : '交稿后会检查爽点、信息回收和待回收期待。'
  const retentionDetail = retentionMissedCount > 0
    ? itemTextList(arrayValue(retention?.missed)) || text(retention?.summary || retention?.label, `追读漏项 ${retentionMissedCount}`)
    : reviewHasPayload(retention)
      ? text(retention?.summary || retention?.label, '追读钩子和情绪回报处于可控状态。')
      : '前300字钩子、章末问题和短剧化场面会在交稿后复盘。'
  const keepAliveDetail = keepAliveCount > 0
    ? itemTextList(arrayValue(expectation?.keep_alive), 3)
    : '没有需要特别保活的长期悬念。'
  const riskCount = expectationDebtCount + payoffDebtCount + retentionMissedCount
  const scoreCandidates = [expectation?.score, payoff?.score, retention?.score]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value))
  const score = scoreCandidates.length > 0
    ? Math.round(Math.min(...scoreCandidates))
    : null
  const signals: PlanningWorkspaceModel['readerTrustLedger']['signals'] = [
    {
      key: 'expectation',
      label: '期待兑现',
      status: expectationDebtCount > 0 ? 'warn' : 'ok',
      count: expectationDebtCount,
      detail: expectationDetail,
      actionKey: expectationDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'payoff',
      label: '爽点回报',
      status: payoffDebtCount > 0 ? 'warn' : 'ok',
      count: payoffDebtCount,
      detail: payoffDetail,
      actionKey: payoffDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'retention',
      label: '追读钩子',
      status: retentionMissedCount > 0 ? 'warn' : 'ok',
      count: retentionMissedCount,
      detail: retentionDetail,
      actionKey: retentionMissedCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'keep_alive',
      label: '继续悬念',
      status: 'ok',
      count: keepAliveCount,
      detail: keepAliveDetail,
      actionKey: 'enter_chapter_writing',
    },
  ]
  if (!hasAnyReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成读者期待、爽点回报和追读钩子的交稿复盘。',
      actionKey: 'open_quality_revision',
      expectationDebtCount: 0,
      payoffDebtCount: 0,
      retentionMissedCount: 0,
      keepAliveCount: 0,
      signals,
    }
  }
  const status: PlanningWorkspaceModel['readerTrustLedger']['status'] = riskCount > 0 ? 'needs_attention' : 'ready'
  const summary = status === 'ready'
    ? `追读信任稳定：期待兑现、爽点回报和章末钩子没有明显欠账，保活悬念 ${keepAliveCount} 项。`
    : `追读信任需修复：期待欠账 ${expectationDebtCount}，回报欠账 ${payoffDebtCount}，追读漏项 ${retentionMissedCount}，保活悬念 ${keepAliveCount}。`
  return {
    status,
    score,
    summary,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    expectationDebtCount,
    payoffDebtCount,
    retentionMissedCount,
    keepAliveCount,
    signals,
  }
}

function readerTrialStatus(value: any): PlanningWorkspaceModel['readerTrialRoom']['status'] {
  const status = text(value).toLowerCase()
  if (status === 'ready' || status === 'ok') return 'ready'
  if (status === 'blocked' || status === 'block') return 'blocked'
  if (status === 'needs_repair' || status === 'warn') return 'needs_repair'
  return 'missing'
}

function readerTrialQualityBar(value: any) {
  if (text(value) === 'qidian_10k_reader_trial_baseline') return '起点1万均订试读基准'
  return text(value, '起点1万均订试读基准')
}

export function buildReaderTrialRoomModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrialRoom'] {
  const report = latestReviewPayloadAny(reviews, 'reader_trial_review', 'report')
  const hasReview = reviewHasPayload(report)
  const status = hasReview ? readerTrialStatus(report?.status) : 'missing'
  const personas = arrayValue(report?.personas).map(item => ({
    key: text(item?.key, 'trial_reader'),
    label: text(item?.label, '平台试读用户'),
    focus: text(item?.focus, '判断本章和前十章是否能让读者继续点击下一章。'),
    verdict: text(item?.verdict, '暂无试读结论。'),
    score: boundedScore(item?.score, 0),
    riskLevel: text(item?.risk_level || item?.riskLevel, 'medium') as 'low' | 'medium' | 'high',
  }))
  const segments = arrayValue(report?.segments).map(item => ({
    key: text(item?.key),
    label: text(item?.label, '试读分段'),
    score: boundedScore(item?.score, 0),
    verdict: text(item?.verdict, '暂无分段结论。'),
  }))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints).map(item => text(item)).filter(Boolean)
  const pullPoints = arrayValue(report?.pull_points || report?.pullPoints).map(item => text(item)).filter(Boolean)
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions).map(item => text(item)).filter(Boolean)
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行读者试读复盘。建议在前30章诊断和最近章节交稿后运行，模拟爽点读者、剧情党、设定党和平台试读用户的弃读点。',
      qualityBar: '起点1万均订试读基准',
      actionKey: 'run_reader_trial_review',
      personas: [
        { key: 'payoff_reader', label: '爽点读者', focus: '每章是否有可感知收益、反杀、打脸、升级或信息回报。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'plot_reader', label: '剧情党', focus: '主线压力、目标推进和章末未解问题是否连续。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'setting_reader', label: '设定党', focus: '能力体系、规则代价、世界资产和创新机制是否新鲜且不乱。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'trial_reader', label: '平台试读用户', focus: '前三章能否抓住人，前十章是否让读者愿意继续追。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
      ],
      segments: [],
      dropPoints: [],
      pullPoints: [],
      repairActions: ['先运行读者试读复盘，确认开篇、试读十章和最近十章的弃读点。'],
    }
  }
  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: text(report?.summary, '已完成读者试读复盘。'),
    qualityBar: readerTrialQualityBar(report?.quality_bar || report?.qualityBar),
    actionKey: status === 'ready' && dropPoints.length === 0 ? 'run_reader_trial_review' : 'create_reader_trial_repair',
    personas,
    segments,
    dropPoints,
    pullPoints,
    repairActions,
  }
}

export function innovationItemsByKey(items: any[], pattern: RegExp) {
  return arrayValue(items).filter(item => pattern.test(text(item?.key || item?.label || item?.type)))
}

function innovationSignalDetail(missed: any[], planned: any[], fallback: string) {
  return itemTextList(missed, 2) || itemTextList(planned, 2) || fallback
}

export function buildInnovationRadarModel(reviews: AnyRecord[]): PlanningWorkspaceModel['innovationRadar'] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const hasReview = reviewHasPayload(innovation)
  const planned = arrayValue(innovation?.planned)
  const delivered = arrayValue(innovation?.delivered)
  const missed = arrayValue(innovation?.missed)
  const missedCount = numericCount(innovation?.missed_count, innovation?.missedCount, missed.length)
  const plannedCount = numericCount(innovation?.planned_count, innovation?.plannedCount, planned.length)
  const deliveredCount = numericCount(innovation?.delivered_count, innovation?.deliveredCount, delivered.length)
  const score = Number.isFinite(Number(innovation?.score)) ? Number(innovation.score) : null
  const signalDefs: Array<{
    key: PlanningWorkspaceModel['innovationRadar']['signals'][number]['key']
    label: string
    pattern: RegExp
    fallback: string
  }> = [
    { key: 'chapter_angle', label: '创新角度', pattern: /chapter_angle|创新角度|angle/, fallback: '本章要把长篇创新卖点转成可见选择、机制或反差。' },
    { key: 'execution', label: '执行点', pattern: /execution|执行点|point/, fallback: '创新执行要落成动作、规则代价、信息差或冲突反转。' },
    { key: 'differentiation', label: '差异护栏', pattern: /differentiation|差异|护栏|guardrail/, fallback: '避免写成同题材常见开挂、升级、逃生或打脸套路。' },
    { key: 'ip_adaptation', label: 'IP化场面', pattern: /ip_adaptation|IP化|场面|hook/, fallback: '保留适合短剧、漫剧或视觉改编的空间冲突和标志性画面。' },
  ]
  const signals = signalDefs.map(def => {
    const missedItems = innovationItemsByKey(missed, def.pattern)
    const plannedItems = innovationItemsByKey(planned, def.pattern)
    return {
      key: def.key,
      label: def.label,
      status: missedItems.length > 0 ? 'warn' as const : 'ok' as const,
      count: missedItems.length,
      detail: innovationSignalDetail(missedItems, plannedItems, def.fallback),
      actionKey: missedItems.length > 0 ? 'open_quality_revision' as PlanningActionKey : 'enter_chapter_writing' as PlanningActionKey,
    }
  })
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成创新兑现复盘。交稿并同步故事状态后，会检查本章是否写成普通套路章。',
      actionKey: 'longform_creation_diagnosis',
      missedCount: 0,
      plannedCount: 0,
      deliveredCount: 0,
      nextActions: ['先运行长篇创作诊断或完成章节交稿复盘，确认创新卖点能持续落地。'],
      signals,
    }
  }
  const status: PlanningWorkspaceModel['innovationRadar']['status'] = missedCount > 0 || text(innovation?.status).toLowerCase() === 'warn'
    ? 'needs_attention'
    : 'ready'
  return {
    status,
    score,
    summary: status === 'ready'
      ? text(innovation?.summary || innovation?.label, '创新角度、执行点、差异护栏和 IP 化场面已基本兑现。')
      : text(innovation?.summary || innovation?.label, `创新缺口 ${missedCount}`),
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    missedCount,
    plannedCount,
    deliveredCount,
    nextActions: arrayValue(innovation?.next_actions).map(item => text(item)).filter(Boolean),
    signals,
  }
}

