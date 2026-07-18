import type {
  PlanningWorkspaceModel,
  PlanningLongformSpineAxis,
  PlanningCoreContractRadarCheck,
  PlanningMillionWordMilestone,
  PlanningVolumeBeat,
  PlanningActionKey
} from './planning-workspace-model'
import {
  arrayValue,
  boundedScore,
  chapterRange,
  firstNonEmpty,
  hasChapterPayoff,
  isChapterPlannedForBudget,
  isClimaxOutline,
  latestWrittenChapterNo,
  numberOrNull,
  parseJsonValue,
  planningActionLabel,
  reviewHasPayload,
  reviewTime,
  text,
  volumeBeatType
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

export function buildVolumeBeatBudgetModel(args: {
  currentVolume: AnyRecord
  outlines: AnyRecord[]
  chapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['volumeBeatBudget'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const currentVolumeTitle = text(args.currentVolume?.title, '未定位当前卷')
  if (!start || !end) {
    return {
      status: 'blocked',
      score: 45,
      label: '爆点预算缺失',
      summary: '当前章节无法定位到明确分卷，不能计算卷级高潮和爽点预算。',
      currentVolumeTitle,
      chapterRange: '章节范围未定',
      totalChapters: 0,
      plannedChapterCount: 0,
      climaxTarget: 0,
      climaxCount: 0,
      payoffTarget: 0,
      payoffCount: 0,
      beats: [],
      nextActions: ['先补齐当前卷范围、卷目标和关键转折点。'],
    }
  }

  const totalChapters = Math.max(1, end - start + 1)
  const volumeChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const plannedChapterCount = volumeChapters.filter(isChapterPlannedForBudget).length
  const payoffCount = volumeChapters.filter(hasChapterPayoff).length
  const climaxOutlines = args.outlines
    .filter(outline => isClimaxOutline(outline) && chapterRange(outline).start >= start && chapterRange(outline).start <= end)
    .sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const beats: PlanningVolumeBeat[] = climaxOutlines.map(outline => {
    const chapterNo = chapterRange(outline).start || null
    return {
      key: `outline-${outline.id || outline.title}`,
      label: text(outline?.title, '未命名爆点'),
      chapterNo,
      type: volumeBeatType(Number(chapterNo || 0), start, end),
      status: 'planned',
      detail: text(outline?.summary || outline?.goal || outline?.hook, '已规划关键转折/高潮节点。'),
    }
  })
  const climaxTarget = Math.max(3, Math.ceil(totalChapters / 15))
  const payoffTarget = Math.max(climaxTarget * 2, Math.ceil(Math.max(plannedChapterCount, Math.min(totalChapters, 30)) / 3))
  const missingCount = Math.max(0, climaxTarget - beats.length)
  const missingTypes: PlanningVolumeBeat['type'][] = ['小高潮', '中高潮', '卷末爆点']
  for (let index = 0; index < missingCount; index += 1) {
    const type = missingTypes[Math.min(index, missingTypes.length - 1)]
    beats.push({
      key: `missing-${index}-${type}`,
      label: `${type}待补`,
      chapterNo: null,
      type: '待补',
      status: 'missing',
      detail: `当前卷还缺少${type}节点。`,
    })
  }
  const climaxScore = Math.min(1, climaxOutlines.length / Math.max(1, climaxTarget)) * 60
  const payoffScore = Math.min(1, payoffCount / Math.max(1, payoffTarget)) * 30
  const planScore = plannedChapterCount > 0 ? 10 : 0
  const score = Math.max(0, Math.min(100, Math.round(climaxScore + payoffScore + planScore)))
  const status: PlanningWorkspaceModel['volumeBeatBudget']['status'] = plannedChapterCount === 0
    ? 'blocked'
    : score >= 80 && climaxOutlines.length >= climaxTarget && payoffCount >= payoffTarget
      ? 'ready'
      : 'needs_attention'

  return {
    status,
    score,
    label: status === 'ready' ? `爆点预算 ${score}` : status === 'blocked' ? `爆点预算阻塞 ${score}` : `爆点预算不足 ${score}`,
    summary: status === 'ready'
      ? `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}。`
      : `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}，需要补强卷级节奏。`,
    currentVolumeTitle,
    chapterRange: `第${start}-${end}章`,
    totalChapters,
    plannedChapterCount,
    climaxTarget,
    climaxCount: climaxOutlines.length,
    payoffTarget,
    payoffCount,
    beats,
    nextActions: status === 'ready'
      ? ['按当前卷爆点预算推进章节任务书和场景卡。']
      : ['补齐当前卷的小高潮、中高潮和卷末爆点，再进入批量连写。'],
  }
}

export function latestReviewPayload(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0]
  const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' })
    || parseJsonValue(review?.payload_json, { owner: review, kind: 'review', field: 'payload_json' })
    || {}
  return payload[payloadKey] || payload.result?.[payloadKey] || payload.result || payload
}

export function listLength(value: any) {
  return Array.isArray(value) ? value.length : 0
}

export function latestReviewPayloadAny(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  return latestReviewPayload(reviews, reviewType, payloadKey) || {}
}

export function compactList(values: any[], limit = 6) {
  return Array.from(new Set(values.map(value => text(value)).filter(Boolean))).slice(0, limit)
}

const LONGFORM_SPINE_AXIS_LABELS: Record<PlanningLongformSpineAxis['key'], string> = {
  reader_promise: '核心卖点',
  protagonist_drive: '主角驱动',
  core_conflict: '核心矛盾',
  world_hook: '世界钩子',
  innovation_hook: '创新钩子',
  payoff_loop: '长期回报',
  ending_direction: '终局方向',
}

const LONGFORM_SPINE_REQUIRED_AXES: PlanningLongformSpineAxis['key'][] = [
  'reader_promise',
  'protagonist_drive',
  'core_conflict',
  'innovation_hook',
  'payoff_loop',
]

function latestLongformCreationCompass(reviews: AnyRecord[]) {
  const report = latestReviewPayloadAny(reviews, 'longform_creation_diagnosis', 'report')
  const compass = report?.compass || report?.longform_compass || report?.longformCompass || null
  return compass && typeof compass === 'object' ? compass : null
}

function longformSpineValue(source: AnyRecord, key: PlanningLongformSpineAxis['key']) {
  if (key === 'reader_promise') return firstNonEmpty(source?.reader_promise, source?.readerPromise, source?.promise)
  if (key === 'protagonist_drive') return firstNonEmpty(source?.protagonist_drive, source?.protagonistDrive, source?.protagonist_goal, source?.main_character_drive)
  if (key === 'core_conflict') return firstNonEmpty(source?.core_conflict, source?.coreConflict, source?.main_conflict)
  if (key === 'world_hook') return firstNonEmpty(source?.world_hook, source?.worldHook, source?.setting_hook)
  if (key === 'innovation_hook') return firstNonEmpty(source?.innovation_hook, source?.innovationHook, source?.differentiation, source?.original_hook)
  if (key === 'payoff_loop') return firstNonEmpty(source?.payoff_loop, source?.payoffLoop, source?.payoff_model, source?.reward_loop)
  return firstNonEmpty(source?.ending_direction, source?.endingDirection, source?.final_goal, source?.endgame)
}

export function buildLongformSpineGuardModel(writingBible: AnyRecord, reviews: AnyRecord[]): PlanningWorkspaceModel['longformSpineGuard'] {
  const reviewCompass = latestLongformCreationCompass(reviews)
  const source = reviewCompass || writingBible || {}
  const sourceLabel = reviewCompass ? '来自长篇创作诊断' : reviewHasPayload(writingBible) ? '来自写作圣经' : '待补齐'
  const axisKeys = Object.keys(LONGFORM_SPINE_AXIS_LABELS) as PlanningLongformSpineAxis['key'][]
  const axes = axisKeys.map(key => {
    const value = longformSpineValue(source, key)
    return {
      key,
      label: LONGFORM_SPINE_AXIS_LABELS[key],
      value,
      locked: LONGFORM_SPINE_REQUIRED_AXES.includes(key),
      status: value ? 'ok' as const : 'missing' as const,
    }
  })
  const missingAxes = axes
    .filter(axis => axis.locked && axis.status === 'missing')
    .map(axis => axis.label)
  const optionalMissingCount = axes.filter(axis => !axis.locked && axis.status === 'missing').length
  const readyCount = axes.filter(axis => axis.status === 'ok').length
  const score = boundedScore((readyCount / Math.max(1, axes.length)) * 100 - missingAxes.length * 8, 55)
  const status: PlanningWorkspaceModel['longformSpineGuard']['status'] = missingAxes.length >= 2
    ? 'blocked'
    : missingAxes.length || optionalMissingCount
      ? 'needs_attention'
      : 'ready'
  const readerPromise = axes.find(axis => axis.key === 'reader_promise')?.value || ''
  const immutableRules = compactList([
    ...arrayValue(source?.immutable_rules),
    ...arrayValue(source?.immutableRules),
    readerPromise ? `核心卖点不可漂移：${readerPromise}` : '',
    longformSpineValue(source, 'core_conflict') ? `核心矛盾不可漂移：${longformSpineValue(source, 'core_conflict')}` : '',
    longformSpineValue(source, 'innovation_hook') ? `创新钩子不可写成普通套路：${longformSpineValue(source, 'innovation_hook')}` : '',
  ]).slice(0, 6)
  const flexibleZones = compactList([
    ...arrayValue(source?.flexible_zones),
    ...arrayValue(source?.flexibleZones),
    '支线人物、新资产、场景题材可以调整，但必须服务核心卖点、当前卷目标和长期回报循环。',
  ]).slice(0, 6)

  return {
    status,
    score,
    label: status === 'ready' ? `主轴稳定 ${score}` : status === 'blocked' ? `主轴阻塞 ${score}` : `主轴待补 ${score}`,
    summary: status === 'ready'
      ? '全书核心卖点、主角驱动、核心矛盾、创新钩子和长期回报已形成可见护栏。'
      : `全书主轴仍缺 ${missingAxes.length} 个关键项：${missingAxes.join('、') || '可选扩展项'}。先补齐后再扩大自动连写。`,
    sourceLabel,
    readerPromise,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    axes,
    immutableRules,
    flexibleZones,
    missingAxes,
  }
}

function spineAxisValue(spine: PlanningWorkspaceModel['longformSpineGuard'], key: PlanningLongformSpineAxis['key']) {
  return spine.axes.find(axis => axis.key === key)?.value || ''
}

function coreContractCheck(
  key: PlanningCoreContractRadarCheck['key'],
  label: string,
  value: string,
  missingDetail: string,
  options: { warn?: boolean; warnDetail?: string; evidence?: string[] } = {},
): PlanningCoreContractRadarCheck {
  const evidence = compactList(options.evidence || [value], 4)
  const status: PlanningCoreContractRadarCheck['status'] = !value
    ? 'block'
    : options.warn
      ? 'warn'
      : 'ok'
  return {
    key,
    label,
    status,
    score: status === 'ok' ? 90 : status === 'warn' ? 66 : 38,
    detail: !value ? missingDetail : options.warn ? (options.warnDetail || value) : value,
    evidence,
  }
}

export function buildCoreContractRadarModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  activeChapter?: AnyRecord | null
  currentVolumeGoal: string
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['coreContractRadar'] {
  const { longformSpineGuard, activeChapter } = args
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const driftRisks = compactList([
    ...arrayValue(coreDrift?.drift_risks),
    ...arrayValue(coreDrift?.risks),
    ...arrayValue(coreDrift?.forbidden_touched),
  ], 6)
  const hasDeliveryDrift = driftRisks.length > 0 || ['warn', 'warning', 'risk', 'blocked', 'block'].includes(text(coreDrift?.status).toLowerCase())

  const chapterGoal = firstNonEmpty(activeChapter?.chapter_goal, activeChapter?.chapterGoal, activeChapter?.goal, activeChapter?.summary, activeChapter?.chapter_summary)
  const chapterConflict = firstNonEmpty(activeChapter?.conflict, activeChapter?.raw_payload?.conflict, activeChapter?.raw_payload?.core_conflict)
  const chapterMainline = firstNonEmpty(activeChapter?.raw_payload?.mainline_progress, activeChapter?.mainline_progress, activeChapter?.raw_payload?.storyline_advance)
  const chapterPayoff = firstNonEmpty(activeChapter?.raw_payload?.payoff, activeChapter?.raw_payload?.reader_payoff, activeChapter?.ending_hook, activeChapter?.hook)
  const chapterInnovation = firstNonEmpty(activeChapter?.raw_payload?.innovation_execution, activeChapter?.raw_payload?.innovation_angle, activeChapter?.raw_payload?.signature_scene, activeChapter?.raw_payload?.ip_scene)
  const chapterService = compactList([chapterGoal, chapterConflict, chapterMainline], 3).join('；')

  const checks: PlanningCoreContractRadarCheck[] = [
    coreContractCheck('reader_promise', '核心卖点', spineAxisValue(longformSpineGuard, 'reader_promise'), '缺核心卖点，无法判断章节是否吸引目标读者。'),
    coreContractCheck('protagonist_drive', '主角驱动', spineAxisValue(longformSpineGuard, 'protagonist_drive'), '缺主角驱动，超长篇容易变成事件推着人走。'),
    coreContractCheck('core_conflict', '核心矛盾', spineAxisValue(longformSpineGuard, 'core_conflict'), '缺核心矛盾，章节冲突容易散成单元小事。'),
    coreContractCheck(
      'chapter_service',
      '本章服务',
      chapterService,
      '当前章缺目标、冲突或主线推进，先补开写任务再生成正文。',
      {
        warn: hasDeliveryDrift,
        warnDetail: driftRisks[0] || '最近交稿存在核心偏移，先修订后再放大生产。',
        evidence: [chapterGoal, chapterConflict, chapterMainline, ...driftRisks],
      },
    ),
    coreContractCheck(
      'reader_payoff',
      '读者回报',
      chapterPayoff,
      '当前章缺可见回报或章末追读问题。',
      {
        warn: hasDeliveryDrift,
        warnDetail: '核心偏移会削弱读者回报，先把回报写成可见事件。',
        evidence: [chapterPayoff, activeChapter?.ending_hook, ...driftRisks],
      },
    ),
    coreContractCheck(
      'innovation_hook',
      '创新执行',
      spineAxisValue(longformSpineGuard, 'innovation_hook'),
      '缺创新钩子，章节容易退回同题材套路。',
      {
        warn: Boolean(spineAxisValue(longformSpineGuard, 'innovation_hook')) && !chapterInnovation,
        warnDetail: chapterInnovation || '本章还没写清创新机制、反差场面或可传播执行点。',
        evidence: [spineAxisValue(longformSpineGuard, 'innovation_hook'), chapterInnovation],
      },
    ),
  ]

  const blockCount = checks.filter(item => item.status === 'block').length
  const warnCount = checks.filter(item => item.status === 'warn').length
  const status: PlanningWorkspaceModel['coreContractRadar']['status'] = longformSpineGuard.status === 'blocked' || blockCount > 0
    ? 'blocked'
    : warnCount > 0
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum, item) => sum + item.score, 0) / Math.max(1, checks.length))))
  const primaryKey: PlanningActionKey = longformSpineGuard.status === 'blocked' || checks.slice(0, 3).some(item => item.status === 'block')
    ? 'open_story_assets'
    : hasDeliveryDrift
      ? 'open_quality_revision'
      : checks.some(item => item.status !== 'ok')
        ? 'update_rolling_plan'
        : 'enter_chapter_writing'
  const riskTags = compactList([
    ...longformSpineGuard.missingAxes.map(axis => `缺${axis}`),
    hasDeliveryDrift ? '核心偏移' : '',
    checks.find(item => item.key === 'chapter_service' && item.status !== 'ok') ? '本章服务不足' : '',
    checks.find(item => item.key === 'reader_payoff' && item.status !== 'ok') ? '读者回报待补' : '',
    checks.find(item => item.key === 'innovation_hook' && item.status !== 'ok') ? '创新执行待补' : '',
  ], 8)
  const mustServe = compactList([
    spineAxisValue(longformSpineGuard, 'reader_promise') ? `服务核心卖点：${spineAxisValue(longformSpineGuard, 'reader_promise')}` : '',
    spineAxisValue(longformSpineGuard, 'protagonist_drive') ? `推动主角驱动：${spineAxisValue(longformSpineGuard, 'protagonist_drive')}` : '',
    spineAxisValue(longformSpineGuard, 'core_conflict') ? `压住核心矛盾：${spineAxisValue(longformSpineGuard, 'core_conflict')}` : '',
    args.currentVolumeGoal ? `承接当前卷目标：${args.currentVolumeGoal}` : '',
    chapterGoal ? `当前章任务：${chapterGoal}` : '',
  ], 6)

  return {
    status,
    score,
    label: status === 'ready' ? `契约稳定 ${score}` : status === 'blocked' ? `契约阻塞 ${score}` : `契约待修 ${score}`,
    summary: status === 'ready'
      ? '全书核心与当前章目标、冲突、回报、创新执行已经对齐，可以进入章节写作。'
      : hasDeliveryDrift
        ? `最近交稿存在核心偏移：${driftRisks[0] || text(coreDrift?.label, '需回质检修订')}。先修复再继续连写。`
        : `核心契约还有 ${blockCount + warnCount} 项需要补齐：${riskTags.join('、') || '补齐章节任务书'}`,
    primaryAction: {
      key: primaryKey,
      label: planningActionLabel(primaryKey),
      reason: primaryKey === 'open_quality_revision'
        ? '先处理最近交稿的核心偏移，避免后续章节沿着错误方向扩写。'
        : primaryKey === 'open_story_assets'
          ? '先补齐全书核心卖点、主角驱动和核心矛盾。'
          : primaryKey === 'update_rolling_plan'
            ? '先补齐本章目标、回报或创新执行，再生成正文。'
            : '核心契约通过，进入当前章写作。',
    },
    checks,
    mustServe,
    noDrift: longformSpineGuard.immutableRules,
    riskTags,
  }
}

function milestoneNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return Math.round(num)
  }
  return 0
}

function resolveRawMillionWordMilestones(writingBible: AnyRecord) {
  return [
    ...arrayValue(writingBible?.longform_milestones),
    ...arrayValue(writingBible?.million_word_milestones),
    ...arrayValue(writingBible?.millionWordMilestones),
    ...arrayValue(writingBible?.milestones),
  ].filter(item => item && typeof item === 'object')
}

export function milestoneStatus(targetWords: number, writtenWords: number, nextTargetWords: number | null): PlanningMillionWordMilestone['status'] {
  if (!targetWords) return 'needs_plan'
  if (writtenWords >= targetWords) return 'achieved'
  if (!nextTargetWords || targetWords === nextTargetWords) return 'current'
  return 'future'
}

function defaultMillionWordMilestoneTargets(targetWords: number) {
  if (targetWords < 3000000) return []
  const candidates = [300000, 1000000, 2000000, 3000000, 5000000, 8000000, 10000000]
  const capped = candidates.filter(value => value <= targetWords)
  if (!capped.includes(targetWords)) capped.push(targetWords)
  return Array.from(new Set(capped)).sort((a, b) => a - b)
}

export function buildMillionWordMilestonesModel(args: {
  writingBible: AnyRecord
  targetWords: number
  writtenWords: number
}): PlanningWorkspaceModel['millionWordMilestones'] {
  const rawMilestones = resolveRawMillionWordMilestones(args.writingBible)
  const hasExplicitMilestones = rawMilestones.length > 0
  const rows = hasExplicitMilestones
    ? rawMilestones
    : defaultMillionWordMilestoneTargets(args.targetWords).map(targetWords => ({
        target_words: targetWords,
        label: targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `${targetWords}字节点`,
      }))
  const nextTargetWords = rows
    .map(row => milestoneNumber(row?.target_words, row?.targetWords, row?.words))
    .filter(value => value > args.writtenWords)
    .sort((a, b) => a - b)[0] || null

  const milestones: PlanningMillionWordMilestone[] = rows
    .map((row, index) => {
      const targetWords = milestoneNumber(row?.target_words, row?.targetWords, row?.words)
      const targetChapter = numberOrNull(row?.target_chapter, row?.targetChapter, row?.chapter_no, row?.chapterNo)
      const theme = firstNonEmpty(row?.theme, row?.title, row?.goal, row?.stage_goal)
      const protagonistState = firstNonEmpty(row?.protagonist_state, row?.protagonistState, row?.character_state, row?.identity_shift)
      const worldExpansion = firstNonEmpty(row?.world_expansion, row?.worldExpansion, row?.map_expansion, row?.setting_expansion)
      const conflictEscalation = firstNonEmpty(row?.conflict_escalation, row?.conflictEscalation, row?.antagonist_escalation, row?.stakes)
      const readerPayoff = firstNonEmpty(row?.reader_payoff, row?.readerPayoff, row?.payoff, row?.reward)
      const riskTags = [
        !theme ? '缺阶段主题' : '',
        !protagonistState ? '缺主角状态' : '',
        !worldExpansion ? '缺世界扩展' : '',
        !conflictEscalation ? '缺冲突升级' : '',
        !readerPayoff ? '缺读者回报' : '',
      ].filter(Boolean)
      return {
        key: targetWords ? `milestone-${targetWords}` : `milestone-${index + 1}`,
        label: firstNonEmpty(row?.label, row?.title, targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `里程碑 ${index + 1}`),
        targetWords,
        targetChapter,
        status: riskTags.length ? 'needs_plan' : milestoneStatus(targetWords, args.writtenWords, nextTargetWords),
        theme,
        protagonistState,
        worldExpansion,
        conflictEscalation,
        readerPayoff,
        riskTags,
        actionKey: riskTags.length ? 'open_story_assets' : 'enter_chapter_writing',
      }
    })
    .sort((a, b) => (a.targetWords || 999999999) - (b.targetWords || 999999999))

  const currentMilestone = milestones.find(item => item.status === 'current')
    || milestones.find(item => item.status === 'needs_plan')
    || milestones.find(item => item.status === 'future')
    || milestones.at(-1)
    || null
  const nextMilestone = milestones.find(item => item.targetWords > args.writtenWords) || currentMilestone
  const riskCount = milestones.reduce((sum, item) => sum + item.riskTags.length, 0)
  const epicTarget = args.targetWords >= 3000000
  const requiredCount = epicTarget ? 3 : 1
  const tooFew = milestones.length < requiredCount
  const status: PlanningWorkspaceModel['millionWordMilestones']['status'] = epicTarget && !hasExplicitMilestones
    ? 'blocked'
    : tooFew
      ? 'needs_attention'
      : riskCount > 0
        ? 'needs_attention'
        : 'ready'
  const completeScore = milestones.length
    ? Math.round((milestones.length * 5 + milestones.filter(item => item.riskTags.length === 0).length * 20) / Math.max(1, milestones.length * 25) * 100)
    : 0
  const countPenalty = tooFew ? 20 : 0
  const score = boundedScore(completeScore - riskCount * 4 - countPenalty, status === 'ready' ? 88 : status === 'blocked' ? 45 : 68)

  return {
    status,
    score,
    label: status === 'ready' ? `里程碑 ${score}` : status === 'blocked' ? `里程碑阻塞 ${score}` : `里程碑待补 ${score}`,
    summary: status === 'ready'
      ? `已规划 ${milestones.length} 个百万字级节点，下一节点：${nextMilestone?.label || '未定位'}。`
      : !hasExplicitMilestones && epicTarget
        ? '缺少百万字里程碑：300万字以上项目需要明确30万、100万、300万等阶段的主角状态、世界扩展、冲突升级和读者回报。'
        : `百万字里程碑仍有 ${riskCount + (tooFew ? 1 : 0)} 项缺口，先补齐后再扩大自动连写。`,
    sourceLabel: hasExplicitMilestones ? '来自写作圣经' : epicTarget ? '系统占位' : '短中篇可选',
    total: milestones.length,
    currentMilestone,
    nextMilestone,
    milestones,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    nextActions: status === 'ready'
      ? ['按当前百万字里程碑推进未来100章和当前卷规划。']
      : ['补齐百万字节点的主角状态、世界扩展、冲突升级和读者回报，再恢复安全连写。'],
  }
}

function memoryFieldText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  return firstNonEmpty(
    value.text,
    value.summary,
    value.description,
    value.status,
    value.state,
    value.current_state,
    value.currentState,
    value.location,
    value.current_location,
  )
}

function memoryItemText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const name = firstNonEmpty(value.name, value.character_name, value.characterName, value.title, value.key)
  const state = memoryFieldText(value)
  const chapterNo = numberOrNull(value.chapter_no, value.chapterNo, value.last_updated_chapter, value.lastUpdatedChapter)
  const base = [name, state].filter(Boolean).join('：')
  return text(chapterNo ? `${base || name}@第${chapterNo}章` : base || name)
}

function memoryList(...values: any[]) {
  return compactList(values.flatMap(value => arrayValue(value)).map(memoryItemText), 10)
}

export function buildLongformMemoryCapsuleModel(args: {
  writingBible: AnyRecord
  storyState: AnyRecord
  latestWrittenChapterNo: number
}): PlanningWorkspaceModel['longformMemoryCapsule'] {
  const global = args.storyState?.global || args.storyState || {}
  const lastUpdatedChapter = numberOrNull(args.storyState?.last_updated_chapter, args.storyState?.lastUpdatedChapter, global?.last_updated_chapter, global?.lastUpdatedChapter)
  const corePromise = firstNonEmpty(
    args.writingBible?.reader_promise,
    args.writingBible?.promise,
    args.writingBible?.core_selling_point,
    global?.reader_promise,
    global?.core_promise,
  )
  const currentVolumeGoal = firstNonEmpty(global?.current_volume_goal, global?.volume_goal, args.storyState?.current_volume_goal, args.storyState?.volume_goal)
  const mainlineProgress = firstNonEmpty(global?.mainline_progress, global?.current_mainline, global?.mainline, args.storyState?.mainline_progress, args.storyState?.current_mainline, args.storyState?.mainline)
  const characterStates = memoryList(args.storyState?.character_states, global?.character_states, args.storyState?.characters, global?.characters)
  const openQuestions = memoryList(args.storyState?.open_questions, global?.open_questions, args.storyState?.unresolved_questions, global?.unresolved_questions)
  const payoffDebts = memoryList(args.storyState?.payoff_debts, global?.payoff_debts, args.storyState?.payoff_queue, global?.payoff_queue)
  const canonFacts = memoryList(args.storyState?.canon_facts, global?.canon_facts, args.storyState?.facts, global?.facts)
  const redLines = memoryList(args.writingBible?.immutable_rules, args.writingBible?.immutableRules, global?.red_lines, args.storyState?.red_lines)
  const evidenceCount = [
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    ...characterStates,
    ...openQuestions,
    ...payoffDebts,
    ...canonFacts,
    ...redLines,
  ].filter(Boolean).length
  const stale = Boolean(args.latestWrittenChapterNo && (!lastUpdatedChapter || lastUpdatedChapter < args.latestWrittenChapterNo))
  const status: PlanningWorkspaceModel['longformMemoryCapsule']['status'] = evidenceCount === 0
    ? 'missing'
    : stale
      ? 'needs_sync'
      : 'ready'
  const score = status === 'ready'
    ? boundedScore(Math.min(100, 60 + evidenceCount * 6), 86)
    : status === 'needs_sync'
      ? boundedScore(Math.min(78, 46 + evidenceCount * 4), 62)
      : 35

  return {
    status,
    score,
    label: status === 'ready' ? `记忆胶囊 ${score}` : status === 'needs_sync' ? `记忆待同步 ${score}` : `记忆缺失 ${score}`,
    summary: status === 'ready'
      ? `正史胶囊已同步到第${lastUpdatedChapter || '?'}章，包含角色 ${characterStates.length}、悬念 ${openQuestions.length}、回报债 ${payoffDebts.length}。`
      : status === 'needs_sync'
        ? `故事状态只同步到第${lastUpdatedChapter || 0}章，已写到第${args.latestWrittenChapterNo}章；继续生成前建议先同步正史胶囊。`
        : '缺少可召回的长篇正史胶囊，建议先同步故事状态或补齐写作圣经。',
    lastUpdatedChapter,
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    characterStates,
    openQuestions,
    payoffDebts,
    canonFacts,
    redLines,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : status === 'needs_sync' ? 'update_story_state' : 'open_story_assets',
  }
}

