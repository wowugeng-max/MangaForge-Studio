import type {
  AnyRecord,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchGuardrailSignal,
  AutoCreationBatchBriefRepair,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
} from './types'
import {
  arrayValue,
  firstText,
  planningAction,
  text,
} from './helpers-basics'
import {
  signal,
} from './helpers-main'

import {
  emptyNextBatchBrief,
  styleSampleStrategyFromRecord,
  styleSampleKeysFromStrategy,
  normalizeRouteChapter,
  mergeRouteChapterPlan,
  chapterRangeLabel,
  checklistItem,
} from './helpers-next-batch-brief-basics'
import {
  buildSafeBatchExpansionStructureVerification,
  buildSafeBatchExpansionStructureDecision,
} from './helpers-next-batch-brief-lane'

export function buildNextBatchBriefStartChecklist(args: {
  planning: PlanningWorkspaceModel
  chapters: AutoCreationNextBatchBriefChapter[]
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  expansionStructureVerification?: AnyRecord | null
  expansionStructureDecision?: AnyRecord | null
}): AutoCreationNextBatchBriefStartChecklistItem[] {
  const chapterTasks = args.chapters
    .map(item => item.chapterTask || item.conflict)
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
  const innovationLanes = Array.isArray(args.planning.longformBattleDesk?.lanes)
    ? args.planning.longformBattleDesk.lanes
    : []
  const innovationLane = innovationLanes.find(item => item.key === 'innovation_ip')
  const innovationDetail = firstText(
    innovationLane?.detail,
    args.planning.mainline.currentStageConflict,
    args.planning.mainline.readerPromise,
  )

  const checklist = [
    checklistItem(
      'core_promise',
      '核心承诺',
      args.planning.mainline.readerPromise,
      '缺核心读者承诺，批量生成前需要先明确这本书到底让读者追什么。',
    ),
    checklistItem(
      'story_drive',
      '故事驱动力',
      firstText(args.mainlineFocus, chapterTasks),
      '缺逐章冲突或主线推进，连续生成容易变成流水账。',
    ),
    checklistItem(
      'reader_payoff',
      '读者回报',
      args.readerPayoffPlan,
      '缺升级、打脸、揭秘或情绪兑现计划，建议先补本批爽点。',
    ),
    checklistItem(
      'innovation',
      '创新/IP记忆点',
      innovationDetail,
      '缺本批差异化表达或标志性场面，建议补一个能被读者记住的看点。',
    ),
    checklistItem(
      'forbidden_boundary',
      '禁写边界',
      args.forbiddenBoundary,
      '缺禁写边界，批量生成可能跳过质检、提前揭底或误改长期设定。',
    ),
  ]
  if (args.expansionStructureVerification) {
    checklist.push(checklistItem(
      'expansion_structure',
      '扩批结构验证',
      firstText(
        args.expansionStructureVerification.fixed_segment_role,
        args.expansionStructureVerification.conflict_rotation,
        args.expansionStructureVerification.explicit_payoff,
      ),
      '已修复扩批结构，本批需要用2-3章验证固定段落职责、冲突换源、显性回报和章末追读。',
    ))
  }
  if (args.expansionStructureDecision) {
    checklist.push(checklistItem(
      'expansion_structure',
      '结构修复决策',
      firstText(
        args.expansionStructureDecision.instruction,
        args.expansionStructureDecision.summary,
        args.expansionStructureDecision.modeLabel,
      ),
      '结构修复有效性已决定本批扩批策略，必须按该决策执行章节职责和观察指标。',
    ))
  }
  return checklist
}

export function buildNextBatchBrief(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  safeChapterCount: number
  chapters?: AnyRecord[] | null
  expansionStructureVerificationSeed?: AnyRecord | null
  safeBatchExpansionPolicy?: AnyRecord | null
}): AutoCreationNextBatchBrief {
  if (args.safeChapterCount <= 0) return emptyNextBatchBrief()
  const targetNo = Number(args.writing.nextChapter?.chapterNo || 0)
  if (!targetNo) return emptyNextBatchBrief()
  const chaptersByNo = new Map(arrayValue(args.chapters)
    .map((chapter: AnyRecord) => [Number(chapter?.chapterNo ?? chapter?.chapter_no ?? 0), chapter])
    .filter(([chapterNo]) => Boolean(chapterNo)))
  const routeChapters = arrayValue(args.planning.futureRoute)
    .map(normalizeRouteChapter)
    .filter((item): item is AutoCreationNextBatchBriefChapter => Boolean(item))
    .filter(item => item.chapterNo >= targetNo)
    .sort((a, b) => a.chapterNo - b.chapterNo)
    .slice(0, args.safeChapterCount)
  const existingNos = new Set(routeChapters.map(item => item.chapterNo))
  const targetFallback = normalizeRouteChapter({
    chapterNo: targetNo,
    title: args.writing.nextChapter?.title,
    chapterTask: args.writing.nextChapter?.chapterGoal,
    conflict: args.writing.nextChapter?.conflict,
    endingHook: args.writing.nextChapter?.endingHook,
    mainlineProgress: args.planning.mainline.nextTurn,
    styleSampleStrategy: styleSampleStrategyFromRecord(args.writing.nextChapter as AnyRecord),
  })
  if (!existingNos.has(targetNo)) {
    if (targetFallback) routeChapters.unshift(targetFallback)
  } else if (targetFallback) {
    const targetIndex = routeChapters.findIndex(item => item.chapterNo === targetNo)
    if (targetIndex >= 0) {
      routeChapters[targetIndex] = mergeRouteChapterPlan(routeChapters[targetIndex], targetFallback)
    }
  }
  const chapters = routeChapters.slice(0, args.safeChapterCount).map(chapter => {
    const sourceChapter = chaptersByNo.get(chapter.chapterNo)
    const styleSampleStrategy = chapter.styleSampleStrategy || styleSampleStrategyFromRecord(sourceChapter)
    const styleSampleKeys = chapter.styleSampleKeys?.length ? chapter.styleSampleKeys : styleSampleKeysFromStrategy(styleSampleStrategy)
    return styleSampleKeys.length
      ? { ...chapter, styleSampleStrategy, styleSampleKeys }
      : chapter
  })
  if (!chapters.length) return emptyNextBatchBrief()
  const mainlineProgress = chapters.map(item => item.mainlineProgress).filter(Boolean)
  const conflicts = chapters.map(item => item.conflict).filter(Boolean)
  const batchGoal = [
    args.planning.mainline.currentVolumeGoal ? `卷目标：${args.planning.mainline.currentVolumeGoal}` : '',
    chapters[chapters.length - 1]?.mainlineProgress ? `本批推进到：${chapters[chapters.length - 1].mainlineProgress}` : '',
  ].filter(Boolean).join('；') || '保持当前卷目标连续推进。'
  const readerPayoffPlan = [
    args.planning.mainline.payoffModel ? `爽点模型：${args.planning.mainline.payoffModel}` : '',
    chapters.map(item => item.endingHook).filter(Boolean).slice(0, 3).join(' / '),
  ].filter(Boolean).join('；') || '每章保留明确读者回报和章末钩子。'
  const mainlineFocus = mainlineProgress.join(' -> ') || args.planning.mainline.currentStageConflict || '保持主线推进不偏移。'
  const forbiddenBoundary = [
    '不得跳过单章质检、修订和故事状态回填。',
    args.planning.mainline.risks[0] ? `避开风险：${args.planning.mainline.risks[0]}` : '',
    conflicts.length ? `冲突必须逐章落地：${conflicts.slice(0, 3).join(' / ')}` : '',
  ].filter(Boolean).join('；')
  const expansionStructureVerification = buildSafeBatchExpansionStructureVerification({
    seed: args.expansionStructureVerificationSeed,
    chapters,
  })
  const expansionStructureDecision = buildSafeBatchExpansionStructureDecision(args.safeBatchExpansionPolicy)

  return {
    visible: true,
    chapterRangeLabel: chapterRangeLabel(chapters),
    batchGoal,
    readerPayoffPlan,
    mainlineFocus,
    forbiddenBoundary,
    expansionStructureVerification,
    expansionStructureDecision,
    startChecklist: buildNextBatchBriefStartChecklist({
      planning: args.planning,
      chapters,
      readerPayoffPlan,
      mainlineFocus,
      forbiddenBoundary,
      expansionStructureVerification,
      expansionStructureDecision,
    }),
    chapters,
  }
}

export function chapterNoLabels(chapters: AutoCreationNextBatchBriefChapter[]) {
  return chapters.map(item => `第${item.chapterNo}章`).join('、')
}

export function nextBatchBriefMissingItems(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
) {
  if (expectedChapterCount <= 0) return []
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) return ['缺少下一批任务书']

  const missingCoverage = expectedChapterCount > 1 && nextBatchBrief.chapters.length < expectedChapterCount
    ? [`只覆盖 ${nextBatchBrief.chapters.length}/${expectedChapterCount} 章`]
    : []
  const missingTask = nextBatchBrief.chapters.filter(item => !text(item.chapterTask))
  const missingConflict = nextBatchBrief.chapters.filter(item => !text(item.conflict))
  const missingHook = nextBatchBrief.chapters.filter(item => !text(item.endingHook))
  const missingMainline = nextBatchBrief.chapters.filter(item => !text(item.mainlineProgress))
  return [
    ...missingCoverage,
    missingTask.length ? `缺逐章职责：${chapterNoLabels(missingTask)}` : '',
    missingConflict.length ? `缺冲突落点：${chapterNoLabels(missingConflict)}` : '',
    missingHook.length ? `缺章末钩子：${chapterNoLabels(missingHook)}` : '',
    missingMainline.length ? `缺主线推进：${chapterNoLabels(missingMainline)}` : '',
  ].filter(Boolean)
}

export function buildNextBatchBriefSignal(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
): AutoCreationBatchGuardrailSignal {
  if (expectedChapterCount <= 0) {
    return signal('批次任务书', 'ok', '当前没有可放行的安全连写批次。')
  }
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) {
    return signal('批次任务书', 'block', '缺少下一批任务书，无法判断连续生成会推进什么。')
  }

  const issues = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)

  if (!issues.length) {
    return signal(
      '批次任务书',
      'ok',
      `下一批任务书覆盖 ${nextBatchBrief.chapterRangeLabel}，本批目标、读者回报、主线推进和章末钩子可检查。`,
    )
  }

  const firstChapter = nextBatchBrief.chapters[0]
  const firstChapterUsable = Boolean(
    text(firstChapter?.chapterTask)
    && text(firstChapter?.conflict)
    && text(firstChapter?.endingHook)
    && text(firstChapter?.mainlineProgress),
  )
  const status: AutoCreationBatchGuardrailSignalStatus = firstChapterUsable ? 'warn' : 'block'
  const detail = status === 'warn'
    ? `下一批任务书还不适合多章连写，${issues.slice(0, 3).join('；')}。本轮先降为单章推进。`
    : `下一批任务书不足以开写，${issues.slice(0, 3).join('；')}。先补章节任务书或滚动规划。`
  return signal('批次任务书', status, detail)
}

export function emptyNextBatchBriefRepair(): AutoCreationBatchBriefRepair {
  return {
    visible: false,
    status: 'ok',
    title: '',
    summary: '',
    missingItems: [],
    action: planningAction('update_rolling_plan', '批次任务书完整时无需补齐。', '补齐批次任务书'),
  }
}

export function buildNextBatchBriefRepair(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
  batchBriefSignal: AutoCreationBatchGuardrailSignal,
): AutoCreationBatchBriefRepair {
  if (batchBriefSignal.status === 'ok') return emptyNextBatchBriefRepair()
  const missingItems = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)
  return {
    visible: true,
    status: batchBriefSignal.status,
    title: '补齐下一批任务书',
    summary: batchBriefSignal.status === 'block'
      ? '下一批还没有达到开写条件，先补齐本批目标、逐章职责、冲突和钩子。'
      : '当前章可以继续推进，但多章连写前需要补齐后续章节职责、冲突和钩子。',
    missingItems,
    action: planningAction('update_rolling_plan', batchBriefSignal.detail, '补齐批次任务书', {
      source: 'batch_brief_repair',
      missing_items: missingItems,
      next_batch_brief: nextBatchBrief,
      expected_chapter_count: expectedChapterCount,
    }),
  }
}

