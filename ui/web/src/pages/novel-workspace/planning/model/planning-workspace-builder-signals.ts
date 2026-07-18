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

function innovationItemsByKey(items: any[], pattern: RegExp) {
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

export function chapterPayload(chapter: AnyRecord) {
  return parseJsonValue(chapter?.raw_payload, { owner: chapter, kind: 'chapter', field: 'raw_payload' }) || {}
}

function fatigueFingerprint(value: string) {
  return text(value)
    .toLowerCase()
    .replace(/[“”"'\s，。！？!?,.、：:；;（）()[\]{}《》<>]/g, '')
}

function dominantFatigueValue(values: string[]) {
  const counts = new Map<string, { display: string; count: number }>()
  values.forEach(value => {
    const key = fatigueFingerprint(value)
    if (!key) return
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { display: value, count: 1 })
  })
  const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, 'zh-CN'))
  return {
    rows,
    top: rows[0] || { display: '', count: 0 },
    uniqueCount: rows.length,
  }
}

export function buildFatigueVarietySignal(args: {
  key: PlanningWorkspaceModel['recentFatigueRadar']['signals'][number]['key']
  label: string
  noun: string
  values: string[]
  chapterCount: number
}): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const total = args.values.length
  if (args.chapterCount < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'ok',
      score: 86,
      count: 0,
      detail: `近10章样本不足四章，暂不判断${args.noun}疲劳。`,
      actionKey: 'enter_chapter_writing',
    }
  }
  if (total < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'warn',
      score: 70,
      count: args.chapterCount - total,
      detail: `近10章缺少足够的${args.noun}记录，批量连写前需要补齐章节规划。`,
      actionKey: 'update_rolling_plan',
    }
  }

  const { top, uniqueCount } = dominantFatigueValue(args.values)
  const repeatRatio = top.count / Math.max(1, total)
  const lowVariety = uniqueCount <= Math.max(2, Math.ceil(total * 0.25))
  const repeated = repeatRatio >= 0.5
  const status = lowVariety || repeated ? 'warn' : 'ok'
  const score = status === 'warn'
    ? boundedScore(96 - repeatRatio * 46 - (lowVariety ? 10 : 0), 68)
    : boundedScore(88 + Math.min(10, uniqueCount), 88)

  return {
    key: args.key,
    label: args.label,
    status,
    score,
    count: status === 'warn' ? top.count : 0,
    detail: status === 'warn'
      ? `近${total}章「${top.display}」出现 ${top.count} 次，${args.noun}变化不足。`
      : `近${total}章有 ${uniqueCount} 种${args.noun}，暂无明显重复。`,
    actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
  }
}

export function buildSceneFreshnessSignal(
  recentChapters: AnyRecord[],
  reviews: AnyRecord[],
): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const plannedScenes = innovationItemsByKey(arrayValue(innovation?.planned), /ip_adaptation|IP化|场面|visual|hook/)
  const missedScenes = innovationItemsByKey(arrayValue(innovation?.missed), /ip_adaptation|IP化|场面|visual|hook/)
  if (missedScenes.length > 0) {
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status: 'warn',
      score: 62,
      count: missedScenes.length,
      detail: itemTextList(missedScenes, 2) || 'IP化场面或标志性画面没有兑现，最近章节容易显得同质。',
      actionKey: 'open_quality_revision',
    }
  }

  const ipSceneCoverage = buildIpSceneIntakeCoverage(recentChapters, reviews)
  if (ipSceneCoverage.total >= 4 && ipSceneCoverage.coveredCount > 0) {
    const requiredCount = Math.max(2, Math.ceil(ipSceneCoverage.total * 0.3))
    const status = ipSceneCoverage.coveredCount < requiredCount ? 'warn' : 'ok'
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status,
      score: status === 'warn'
        ? boundedScore(90 - (ipSceneCoverage.missingCount / Math.max(1, ipSceneCoverage.total)) * 34, 60)
        : boundedScore(82 + ipSceneCoverage.coveredCount * 3, 86),
      count: status === 'warn' ? ipSceneCoverage.missingCount : 0,
      detail: status === 'warn'
        ? `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，强场面空窗偏长。${ipSceneCoverage.examples.length ? `已沉淀：${ipSceneCoverage.examples.slice(0, 2).join('；')}` : '下一批需要补可视化冲突。'}`
        : `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，近期已有标志性强场面：${ipSceneCoverage.examples.slice(0, 2).join('；')}`,
      actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
    }
  }

  const sceneValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.ip_adaptation_hook,
        payload?.short_drama_scene,
        payload?.visual_hook,
        payload?.scene,
        payload?.location,
      )
    })
    .filter(Boolean)
  if (sceneValues.length >= 4) {
    return buildFatigueVarietySignal({
      key: 'scene_freshness',
      label: '场面新鲜度',
      noun: '可视化场面',
      values: sceneValues,
      chapterCount: recentChapters.length,
    })
  }

  return {
    key: 'scene_freshness',
    label: '场面新鲜度',
    status: plannedScenes.length > 0 ? 'ok' : 'warn',
    score: plannedScenes.length > 0 ? 84 : 72,
    count: plannedScenes.length > 0 ? 0 : 1,
    detail: plannedScenes.length > 0
      ? itemTextList(plannedScenes, 2) || '近期章节已有可视化场面规划。'
      : '近10章缺少稳定的场面/IP化记录，建议给下一批章节补标志性场景。',
    actionKey: plannedScenes.length > 0 ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

export function buildIpSceneIntakeCoverage(recentChapters: AnyRecord[], reviews: AnyRecord[]) {
  const chapterNos = recentChapters
    .map(chapter => Number(chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const chapterNoSet = new Set(chapterNos)
  const coveredNos = new Set<number>()
  const examples: string[] = []

  for (const review of reviews) {
    if (text(review?.review_type) !== 'ip_scene_intake') continue
    const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
    const root = payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
    const chapterNo = Number(root?.chapter_no || root?.chapterNo || payload?.chapter_no || payload?.chapterNo || review?.chapter_no || 0)
    if (!chapterNoSet.has(chapterNo)) continue
    const candidates = arrayValue(root?.ip_scene_candidates || root?.ipSceneCandidates || payload?.ip_scene_candidates)
    if (candidates.length <= 0) continue
    coveredNos.add(chapterNo)
    for (const candidate of candidates.slice(0, 2)) {
      const label = firstNonEmpty(
        candidate?.title,
        candidate?.name,
        candidate?.visual_hook,
        candidate?.visualHook,
        candidate?.adaptation_value,
      )
      if (label && !examples.includes(label)) examples.push(label)
    }
  }

  return {
    total: chapterNos.length,
    coveredCount: coveredNos.size,
    missingCount: Math.max(0, chapterNos.length - coveredNos.size),
    examples,
  }
}

export function buildRecentFatigueRadarModel(args: {
  chapters: AnyRecord[]
  activeChapterNo: number
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['recentFatigueRadar'] {
  const start = Math.max(1, Number(args.activeChapterNo || 1) - 6)
  const end = start + 9
  const recentChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const conflictValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.conflict, payload?.conflict, payload?.core_conflict)
    })
    .filter(Boolean)
  const payoffValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.payoff,
        payload?.reader_payoff,
        payload?.reader_reward,
        chapter?.payoff,
        chapter?.reader_payoff,
      )
    })
    .filter(Boolean)
  const hookValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.ending_hook, chapter?.endingHook, chapter?.hook, payload?.ending_hook, payload?.hook)
    })
    .filter(Boolean)
  const signals: PlanningWorkspaceModel['recentFatigueRadar']['signals'] = [
    buildFatigueVarietySignal({
      key: 'conflict_variety',
      label: '冲突变化',
      noun: '冲突来源',
      values: conflictValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'payoff_variety',
      label: '回报变化',
      noun: '回报形态',
      values: payoffValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'hook_variety',
      label: '钩子变化',
      noun: '章末问题',
      values: hookValues,
      chapterCount: recentChapters.length,
    }),
    buildSceneFreshnessSignal(recentChapters, args.reviews),
  ]
  const warningSignals = signals.filter(signal => signal.status === 'warn')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 82)
  const status: PlanningWorkspaceModel['recentFatigueRadar']['status'] = warningSignals.length > 0 ? 'needs_attention' : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `疲劳稳定 ${score}` : `疲劳风险 ${score}`,
    summary: status === 'ready'
      ? '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。'
      : `近10章存在 ${warningSignals.length} 类同质化风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    signals,
    nextActions: status === 'ready'
      ? ['保持冲突来源、回报形态、章末问题和可视化场面的轮换。']
      : ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
  }
}

function pressureRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(row?.summary, row?.chapter_summary, payload?.summary),
  ].filter(Boolean).join('；')
}

function pressureSourceForRow(row: AnyRecord) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.pressure_source,
    payload?.pressureSource,
    payload?.antagonist_pressure,
    payload?.antagonistPressure,
    row?.pressure_source,
    row?.antagonist_pressure,
    row?.conflict,
    payload?.conflict,
    row?.chapter_goal,
  )
}

function pressureSignalFromPattern(args: {
  key: PlanningWorkspaceModel['storyPressureLadder']['signals'][number]['key']
  label: string
  noun: string
  rows: AnyRecord[]
  pattern: RegExp
  okDetail: string
  warnDetail: string
}): PlanningWorkspaceModel['storyPressureLadder']['signals'][number] {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 48,
      count: 3 - args.rows.length,
      detail: `未来章节样本不足，暂时无法判断${args.noun}。`,
      actionKey: 'update_rolling_plan',
    }
  }
  const hitCount = args.rows.filter(row => args.pattern.test(pressureRowText(row))).length
  const ratio = hitCount / Math.max(1, args.rows.length)
  const status = ratio >= 0.45 ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? boundedScore(78 + ratio * 20, 88) : boundedScore(56 + ratio * 28, 66),
    count: status === 'ok' ? hitCount : Math.max(1, args.rows.length - hitCount),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

export function buildStoryPressureLadderModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['storyPressureLadder'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 10)
  const start = Number(rows[0]?.chapter_no || args.activeChapterNo || 1)
  const end = Number(rows.at(-1)?.chapter_no || start)
  const pressureValues = rows.map(pressureSourceForRow).filter(Boolean)
  const sourceStats = dominantFatigueValue(pressureValues)
  const pressureSources = sourceStats.rows.slice(0, 4).map(source => ({
    label: source.display,
    count: source.count,
    chapters: rows
      .filter(row => fatigueFingerprint(pressureSourceForRow(row)) === fatigueFingerprint(source.display))
      .map(row => Number(row?.chapter_no || 0))
      .filter(Boolean),
    riskLevel: source.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' as const : 'ok' as const,
  }))

  const pressureSourceSignal: PlanningWorkspaceModel['storyPressureLadder']['signals'][number] = rows.length < 3
    ? {
        key: 'pressure_source',
        label: '压力源',
        status: 'block',
        score: 45,
        count: Math.max(1, 3 - rows.length),
        detail: '未来章节样本不足，先补齐至少三章的压力来源。',
        actionKey: 'update_rolling_plan',
      }
    : pressureValues.length < 3
      ? {
          key: 'pressure_source',
          label: '压力源',
          status: 'warn',
          score: 62,
          count: rows.length - pressureValues.length,
          detail: '未来章节缺少明确反派、规则、环境或组织压力来源。',
          actionKey: 'update_rolling_plan',
        }
      : {
          key: 'pressure_source',
          label: '压力源',
          status: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' : 'ok',
          score: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 64 : 86,
          count: sourceStats.top.count,
          detail: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5
            ? `未来${pressureValues.length}章「${sourceStats.top.display}」出现 ${sourceStats.top.count} 次，压力源过于集中。`
            : `未来${pressureValues.length}章有 ${sourceStats.uniqueCount} 种压力源，压力来源较稳。`,
          actionKey: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'update_rolling_plan' : 'enter_chapter_writing',
        }

  const signals: PlanningWorkspaceModel['storyPressureLadder']['signals'] = [
    pressureSourceSignal,
    pressureSignalFromPattern({
      key: 'conflict_escalation',
      label: '冲突升级',
      noun: '冲突升级',
      rows,
      pattern: /升级|加码|更大|逼近|追杀|围堵|失控|爆发|反噬|惩罚|危机|敌人|强敌|公开|围攻|封锁/,
      okDetail: '未来章节能看到压力加码或冲突升级。',
      warnDetail: '未来章节缺少明确升级词和加码动作，容易停留在平铺推进。',
    }),
    pressureSignalFromPattern({
      key: 'stakes_growth',
      label: '赌注升级',
      noun: '赌注升级',
      rows,
      pattern: /代价|赌注|失去|死亡|重伤|身份|资源|名额|暴露|失败|牺牲|抉择|惩罚|逐出|清算|欠债/,
      okDetail: '未来章节能看到身份、资源、生命、关系或代价层面的赌注。',
      warnDetail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。',
    }),
    pressureSignalFromPattern({
      key: 'reversal_pressure',
      label: '反转逼迫',
      noun: '反转逼迫',
      rows,
      pattern: /反转|背叛|误导|陷阱|反制|逼迫|选择|真相|证据|偷袭|揭穿|倒计时|交换|威胁|两难/,
      okDetail: '未来章节有反转、逼迫或两难选择，故事推进具备钩力。',
      warnDetail: '未来章节缺少反转逼迫或两难选择，建议给下一批补强转折点。',
    }),
  ]
  const blockingSignals = signals.filter(signal => signal.status === 'block')
  const warningSignals = signals.filter(signal => signal.status !== 'ok')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const status: PlanningWorkspaceModel['storyPressureLadder']['status'] = blockingSignals.length > 0
    ? 'blocked'
    : warningSignals.length > 0
      ? 'needs_attention'
      : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `压力稳定 ${score}` : status === 'blocked' ? `压力断档 ${score}` : `压力待升 ${score}`,
    summary: status === 'ready'
      ? '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。'
      : `未来章节存在 ${warningSignals.length} 项故事压力风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    pressureSources,
    signals,
    nextActions: status === 'ready'
      ? ['保持压力源、冲突升级、赌注升级和反转逼迫的连续递进。']
      : ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
  }
}

function storyUnitRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.title, payload?.title),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(payload?.reader_payoff, payload?.readerPayoff, payload?.payoff, payload?.reader_reward),
    firstNonEmpty(payload?.foreshadowing_task, payload?.foreshadowingTask, payload?.storyline_task, payload?.storylineTask),
    firstNonEmpty(payload?.mainline_progress, row?.mainline_progress),
  ].filter(Boolean).join('；')
}

function storyUnitChapterRole(row: AnyRecord, index: number, total: number) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.unit_role,
    payload?.story_unit_role,
    payload?.episode_role,
    index === 0 ? '入口钩子' : index === total - 1 ? '出单元钩子' : '',
    /高潮|打脸|兑现|回报|反杀/.test(storyUnitRowText(row)) ? '小高潮回报' : '',
    '推进',
  )
}

function storyUnitSignal(args: {
  key: PlanningStoryUnitSignal['key']
  label: string
  rows: AnyRecord[]
  hitRows: AnyRecord[]
  okDetail: string
  warnDetail: string
  blockDetail?: string
  minHits?: number
}): PlanningStoryUnitSignal {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 45,
      count: Math.max(1, 3 - args.rows.length),
      detail: args.blockDetail || '剧情单元样本不足三章，无法形成完整事件包。',
      actionKey: 'update_rolling_plan',
    }
  }
  const minHits = args.minHits ?? 1
  const status = args.hitRows.length >= minHits ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? 88 : 66,
    count: status === 'ok' ? args.hitRows.length : Math.max(1, minHits - args.hitRows.length),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function storyUnitTitleHint(rows: AnyRecord[], outlines: AnyRecord[] = []) {
  const start = Number(rows[0]?.chapter_no || 0)
  const end = Number(rows.at(-1)?.chapter_no || start)
  if (!start || !end) return ''
  const overlappingTurn = outlines
    .filter(isTurn)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  if (overlappingTurn) return text(overlappingTurn.title)
  const overlappingStage = outlines
    .filter(isStage)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  return text(overlappingStage?.title)
}

export function buildStoryUnitFromRows(rows: AnyRecord[], unitIndex = 0, titleHint = ''): PlanningStoryUnit {
  const normalizedRows = rows.filter(Boolean)
  const start = Number(normalizedRows[0]?.chapter_no || 0)
  const end = Number(normalizedRows.at(-1)?.chapter_no || start)
  const titleSeed = firstNonEmpty(
    titleHint,
    normalizedRows[0]?.raw_payload?.story_unit_title,
    normalizedRows[0]?.raw_payload?.arc_title,
    normalizedRows[0]?.raw_payload?.event_package,
    normalizedRows[0]?.title,
    start ? `第${start}-${end}章剧情单元` : '未命名剧情单元',
  )
  const texts = normalizedRows.map(storyUnitRowText)
  const firstRow = normalizedRows[0] || {}
  const lastRow = normalizedRows.at(-1) || {}
  const entryHits = firstNonEmpty(firstRow?.ending_hook, firstRow?.endingHook, firstRow?.hook, chapterPayload(firstRow)?.ending_hook)
    || /入口|开场|钩子|倒计时|危机|逼近|异常|点名|追杀/.test(texts[0] || '')
    ? [firstRow]
    : []
  const pressureHits = normalizedRows.filter(row => /升级|加码|逼近|倒计时|公开|反噬|围堵|陷阱|规则|设局|压迫|危机|失控/.test(storyUnitRowText(row)))
  const payoffHits = normalizedRows.filter(row => /小高潮|高潮|回报|兑现|打脸|反杀|获利|升级|公开|震动|胜利/.test(storyUnitRowText(row)))
  const setupHits = normalizedRows.filter(row => /伏笔|埋线|线索|剧情线|主线|关系线|势力线|阵盘|秘密|真相/.test(storyUnitRowText(row)))
  const exitHits = firstNonEmpty(lastRow?.ending_hook, lastRow?.endingHook, lastRow?.hook, chapterPayload(lastRow)?.ending_hook)
    || /出单元|下一段|点名|招揽|真相|更大|新敌|新地图|入门|内门|悬念/.test(storyUnitRowText(lastRow))
    ? [lastRow]
    : []
  const setupDetail = setupHits
    .map(row => firstNonEmpty(chapterPayload(row)?.foreshadowing_task, chapterPayload(row)?.storyline_task, chapterPayload(row)?.mainline_progress, row?.mainline_progress, storyUnitRowText(row)))
    .filter(Boolean)
    .slice(0, 2)
    .join('；')
  const signals: PlanningStoryUnitSignal[] = [
    storyUnitSignal({
      key: 'entry_hook',
      label: '入口钩子',
      rows: normalizedRows,
      hitRows: entryHits,
      okDetail: `第${Number(firstRow?.chapter_no || start)}章有入口钩子，可以把读者带进本单元。`,
      warnDetail: '单元第一章缺少入口钩子，读者可能不知道为什么进入这一段。',
    }),
    storyUnitSignal({
      key: 'pressure_escalation',
      label: '压力升级',
      rows: normalizedRows,
      hitRows: pressureHits,
      minHits: 2,
      okDetail: `本单元有 ${pressureHits.length} 章体现压力升级或设局加码。`,
      warnDetail: '本单元缺少连续压力升级，容易变成平铺过场。',
    }),
    storyUnitSignal({
      key: 'mini_climax_payoff',
      label: '小高潮/回报',
      rows: normalizedRows,
      hitRows: payoffHits,
      okDetail: `本单元包含小高潮或读者回报：${firstNonEmpty(chapterPayload(payoffHits[0])?.reader_payoff, chapterPayload(payoffHits[0])?.payoff, payoffHits[0]?.title, '已规划回报')}`,
      warnDetail: '本单元缺少小高潮或读者回报，连续写完后可能没有结算感。',
    }),
    storyUnitSignal({
      key: 'setup_and_storyline',
      label: '伏笔/剧情线',
      rows: normalizedRows,
      hitRows: setupHits,
      okDetail: setupDetail || '本单元有伏笔、主线或剧情线调度。',
      warnDetail: '本单元缺少伏笔或剧情线任务，长期连载容易只剩单章事件。',
    }),
    storyUnitSignal({
      key: 'exit_hook',
      label: '出单元钩子',
      rows: normalizedRows,
      hitRows: exitHits,
      okDetail: `第${Number(lastRow?.chapter_no || end)}章有出单元钩子，能把读者带到下一段。`,
      warnDetail: '单元最后一章缺少出单元钩子，下一段承接会变弱。',
    }),
  ]
  const status: PlanningStoryUnit['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const warningLabels = signals.filter(signal => signal.status !== 'ok').map(signal => signal.label)
  return {
    key: `unit-${start || unitIndex + 1}-${end || unitIndex + 1}`,
    title: titleSeed.includes('第') ? titleSeed : `${titleSeed}剧情单元`,
    chapterRangeLabel: start && end ? `第${start}-${end}章` : '章节范围未定',
    startChapter: start,
    endChapter: end,
    status,
    score,
    summary: status === 'ready'
      ? '入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。'
      : `本剧情单元仍缺：${warningLabels.join('、')}。`,
    chapters: normalizedRows.map((row, index) => ({
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, `第${row?.chapter_no || '?'}章`),
      role: storyUnitChapterRole(row, index, normalizedRows.length),
      goal: firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, chapterPayload(row)?.chapter_task, chapterPayload(row)?.summary),
    })),
    signals,
  }
}

export function buildStoryUnitWorkshopModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
  outlines?: AnyRecord[]
}): PlanningWorkspaceModel['storyUnitWorkshop'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 12)
  const units: PlanningStoryUnit[] = []
  for (let index = 0; index < rows.length; index += 6) {
    const unitRows = rows.slice(index, index + 6)
    if (unitRows.length) units.push(buildStoryUnitFromRows(unitRows, units.length, storyUnitTitleHint(unitRows, args.outlines || [])))
  }
  const currentUnit = units[0] || buildStoryUnitFromRows([], 0)
  const status = currentUnit.status
  const score = currentUnit.score
  return {
    status,
    score,
    label: status === 'ready' ? `单元完整 ${score}` : status === 'blocked' ? `单元断档 ${score}` : `单元待补 ${score}`,
    summary: status === 'ready'
      ? '当前剧情单元具备完整事件包，可以支撑 5-20 章连续推进。'
      : `当前剧情单元缺少完整事件包：${currentUnit.summary}`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    currentUnit,
    units,
    nextActions: status === 'ready'
      ? ['当前剧情单元入口、压力升级、小高潮、伏笔/剧情线和出单元钩子完整，可以按单元推进。']
      : ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
  }
}

