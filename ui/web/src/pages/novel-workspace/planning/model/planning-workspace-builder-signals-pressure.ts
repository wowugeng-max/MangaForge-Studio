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

