import type {
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  buildCreationPipelineModel,
  buildGovernanceHubModel,
  buildLongformBattleDeskModel,
  buildLongformRhythmModel,
  buildSerialReleaseDeskModel,
} from './planning-workspace-builder-desks'
import {
  buildCharacterArcBoardModel,
  buildFirst30RetentionModel,
  buildStorylineBoardModel,
} from './planning-workspace-builder-boards'
import {
  buildReaderTrustLedgerModel,
  buildReaderTrialRoomModel,
  buildInnovationRadarModel,
  buildVolumeSegmentGateModel,
  buildRecentFatigueRadarModel,
  buildStoryPressureLadderModel,
  buildStoryUnitWorkshopModel,
} from './planning-workspace-builder-signals'
import {
  buildCoreContractRadarModel,
  buildLongformMemoryCapsuleModel,
  buildLongformSpineGuardModel,
  buildMillionWordMilestonesModel,
  buildVolumeBeatBudgetModel,
} from './planning-workspace-builder-radar'
import {
  arrayValue,
  buildCoverage,
  buildHealthIssues,
  buildVolumeTree,
  chapterInRange,
  chapterRange,
  chapterWordCount,
  firstNonEmpty,
  healthLabel,
  isStage,
  isTurn,
  isVolume,
  latestWrittenChapterNo,
  planningRecords,
  resolveStageFromBible,
  resolveStoryState,
  resolveVolumeFromBible,
  resolveWritingBible,
  routeRiskTags,
  text,
} from './planning-workspace-builder-primitives'

type AnyRecord = Record<string, any>

export type BuildPlanningWorkspaceModelInput = {
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[]
  chapters?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  reviews?: AnyRecord[] | null
  settingEntities?: AnyRecord[] | null
  productionTasks?: AnyRecord | null
}

export function buildPlanningWorkspaceModel(input: BuildPlanningWorkspaceModelInput): PlanningWorkspaceModel {
  const selectedProject = input.selectedProject || {}
  const outlines = arrayValue(input.outlines)
  const chapters = arrayValue(input.chapters).slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const activeChapter = input.activeChapter || chapters[0] || {}
  const activeChapterNo = Number(activeChapter?.chapter_no || chapters[0]?.chapter_no || 1)
  const writingBible = resolveWritingBible(selectedProject)
  const storyState = resolveStoryState(selectedProject)
  const reviews = arrayValue(input.reviews)
  const settingEntities = arrayValue(input.settingEntities)
  const productionTasks = input.productionTasks || null

  const currentVolume = outlines.find(outline => isVolume(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isVolume) || {}
  const currentStage = outlines.find(outline => isStage(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isStage) || {}
  const turns = outlines.filter(isTurn).sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const currentTurns = turns.filter(turn => chapterInRange(activeChapterNo, turn))
  const previousTurn = turns.filter(turn => chapterRange(turn).end < activeChapterNo).at(-1)
  const nextTurn = turns.find(turn => chapterRange(turn).start >= activeChapterNo)
  const bibleVolume = resolveVolumeFromBible(writingBible, currentVolume)
  const bibleStage = resolveStageFromBible(bibleVolume, currentStage)

  const planRecords = planningRecords(chapters, outlines)
  const routeChapters = Array.from({ length: 10 }).map((_, index) => {
    const chapterNo = activeChapterNo + index
    const records = planRecords.filter(record => Number(record?.chapter_no || 0) === chapterNo)
    if (!records.length) return null
    return records.find(record => !routeRiskTags(record, currentTurns.length ? currentTurns : turns).length) || records[0] || { chapter_no: chapterNo }
  }).filter(Boolean) as AnyRecord[]
  const futureRoute = routeChapters.map(chapter => ({
    chapterNo: Number(chapter?.chapter_no),
    title: text(chapter?.title, `第${chapter?.chapter_no || '?'}章`),
    chapterTask: text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task),
    conflict: text(chapter?.conflict || chapter?.raw_payload?.conflict),
    endingHook: text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook),
    mainlineProgress: text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress),
    riskTags: routeRiskTags(chapter, currentTurns.length ? currentTurns : turns),
  }))

  const future10Coverage = buildCoverage(planRecords, activeChapterNo, 10)
  const future100Coverage = buildCoverage(planRecords, activeChapterNo, 100)
  const readerPromise = firstNonEmpty(writingBible?.promise, writingBible?.reader_promise, selectedProject?.reader_promise)
  const currentVolumeGoal = firstNonEmpty(bibleVolume?.goal, currentVolume?.goal, currentVolume?.summary)
  const currentStageConflict = firstNonEmpty(bibleStage?.conflict, currentStage?.conflict, activeChapter?.conflict)
  const longformSpineGuard = buildLongformSpineGuardModel(writingBible, reviews)
  const coreContractRadar = buildCoreContractRadarModel({
    longformSpineGuard,
    activeChapter,
    currentVolumeGoal,
    reviews,
  })
  const activeChapterEvidence = firstNonEmpty(
    activeChapter?.chapter_goal,
    activeChapter?.raw_payload?.mainline_progress,
    activeChapter?.mainline_progress,
    activeChapter?.chapter_summary,
    activeChapter?.summary,
  )
  const currentLatestWrittenChapterNo = latestWrittenChapterNo(chapters)
  const healthIssues = buildHealthIssues({
    readerPromise,
    currentVolumeGoal,
    future10Coverage,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
    materialScore: input.materialScore,
  })
  const first30Retention = buildFirst30RetentionModel(chapters, reviews, productionTasks)
  const readerTrustLedger = buildReaderTrustLedgerModel(reviews)
  const readerTrialRoom = buildReaderTrialRoomModel(reviews)
  const innovationRadar = buildInnovationRadarModel(reviews)
  const storylineBoard = buildStorylineBoardModel(settingEntities, first30Retention, activeChapterNo, reviews)
  const characterArcBoard = buildCharacterArcBoardModel(settingEntities, reviews, activeChapterNo)
  const writtenWords = chapters.reduce((sum, chapter) => sum + chapterWordCount(chapter), 0)
  const targetWords = Number(selectedProject?.target_words || selectedProject?.targetWords || 0)
  const longformMemoryCapsule = buildLongformMemoryCapsuleModel({
    writingBible,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
  })
  const millionWordMilestones = buildMillionWordMilestonesModel({
    writingBible,
    targetWords,
    writtenWords,
  })
  const volumeBeatBudget = buildVolumeBeatBudgetModel({
    currentVolume,
    outlines,
    chapters,
    activeChapterNo,
  })
  const volumeSegmentGate = buildVolumeSegmentGateModel({
    currentVolume,
    currentVolumeGoal,
    chapters,
    reviews,
    volumeBeatBudget,
    readerTrustLedger,
    innovationRadar,
  })
  const recentFatigueRadar = buildRecentFatigueRadarModel({
    chapters,
    activeChapterNo,
    reviews,
  })
  const storyPressureLadder = buildStoryPressureLadderModel({
    routeChapters,
    activeChapterNo,
  })
  const storyUnitWorkshop = buildStoryUnitWorkshopModel({
    routeChapters,
    activeChapterNo,
    outlines,
  })
  const longformRhythm = buildLongformRhythmModel({
    reviews,
    writtenWords,
    currentVolumeGoal,
    future100Coverage,
    healthIssues,
    first30Retention,
    storylineBoard,
    volumeBeatBudget,
  })
  const longformBattleDesk = buildLongformBattleDeskModel({
    reviews,
    longformSpineGuard,
    millionWordMilestones,
    longformRhythm,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    storylineBoard,
    volumeBeatBudget,
    innovationRadar,
    storyUnitWorkshop,
    future10Coverage,
    future100Coverage,
  })
  const serialReleaseDesk = buildSerialReleaseDeskModel({
    selectedProject,
    chapters,
    reviews,
  })
  const governanceHub = buildGovernanceHubModel({
    reviews,
    healthIssues,
    first30Retention,
    readerTrialRoom,
    storylineBoard,
    longformRhythm,
    future10Coverage,
    future100Coverage,
    productionTasks,
  })
  const creationPipeline = buildCreationPipelineModel({
    longformSpineGuard,
    millionWordMilestones,
    future10Coverage,
    future100Coverage,
    storylineBoard,
    characterArcBoard,
    activeChapter,
    currentVolumeGoal,
    governanceHub,
    serialReleaseDesk,
  })

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '未命名项目'),
      currentVolume: text(currentVolume?.title || bibleVolume?.title, '未定位当前卷'),
      currentStage: text(currentStage?.title || bibleStage?.title, '未定位当前阶段'),
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '未选择章节',
      writtenWords,
      targetWords,
      future10Coverage,
      future100Coverage,
      longformHealth: healthLabel(healthIssues),
    },
    mainline: {
      readerPromise,
      currentVolumeGoal,
      currentStageConflict,
      payoffModel: firstNonEmpty(bibleStage?.payoff_model, activeChapter?.raw_payload?.payoff, writingBible?.payoff_model),
      previousTurn: text(previousTurn?.title, ''),
      nextTurn: text(nextTurn?.title, ''),
      currentChapterServesVolume: Boolean(currentVolumeGoal && activeChapterEvidence),
      risks: [
        ...arrayValue(storyState?.foreshadowing_status)
          .filter(item => text(item?.status) && text(item?.status) !== 'resolved')
          .map(item => `伏笔未回收：${text(item?.name, '未命名伏笔')}`),
        ...healthIssues.map(issue => issue.title),
      ],
    },
    creationPipeline,
    longformSpineGuard,
    coreContractRadar,
    millionWordMilestones,
    longformMemoryCapsule,
    futureRoute,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    innovationRadar,
    storylineBoard,
    characterArcBoard,
    governanceHub,
    serialReleaseDesk,
    longformRhythm,
    longformBattleDesk,
    volumeBeatBudget,
    volumeSegmentGate,
    recentFatigueRadar,
    storyPressureLadder,
    storyUnitWorkshop,
    volumeTree: buildVolumeTree(outlines, chapters),
    healthIssues,
  }
}

export {
  compactList,
  latestReviewPayload,
  latestReviewPayloadAny,
  listLength,
  milestoneStatus,
} from './planning-workspace-builder-radar'
