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

import {
  chapterPayload,
  dominantFatigueValue,
  fatigueFingerprint,
} from './planning-workspace-builder-signals-fatigue'

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

