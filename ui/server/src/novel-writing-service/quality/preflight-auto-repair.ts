import { asArray } from '../../routes/novel-route-utils'
import {
  textHasSceneChange,
  textHasSceneGoal,
  textHasSceneObstacle,
} from '../../novel-writing/scene-action-scans'
import { benchmarkRecallGapStrings } from './intent-benchmark-contracts'
import { mergeStoredStateTrackingContractAliases } from './state-tracking-contracts'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'
import { assetText } from './character-asset-contracts'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const BENCHMARK_RECALL_SOURCE_PATH_MISSING_CLAUSE = /^(?:(?:Step\s*2\.3|文风召回|benchmark(?:_recall)?(?:_brief)?(?:\.source_paths)?)[：:\s]*)?(?:source_paths_missing|source paths? missing|缺少(?:文风召回)?来源路径|(?:文风召回)?来源路径(?:缺失|缺少|为空|未提供)|文风召回来源缺失)$/i

export function benchmarkRecallGapsWithoutSourcePathMissing(...values: any[]) {
  const nextGaps: string[] = []
  for (const gap of benchmarkRecallGapStrings(...values)) {
    if (BENCHMARK_RECALL_SOURCE_PATH_MISSING_CLAUSE.test(gap)) continue
    const clauses = gap.split(/[；;｜|\n]+/).map(item => compactBriefText(item)).filter(Boolean)
    if (clauses.length <= 1) {
      nextGaps.push(gap)
      continue
    }
    const unresolved = clauses.filter(clause => !BENCHMARK_RECALL_SOURCE_PATH_MISSING_CLAUSE.test(clause))
    if (unresolved.length === clauses.length) nextGaps.push(gap)
    else nextGaps.push(...unresolved)
  }
  return uniqueBriefStrings(nextGaps, 12)
}

export function mergeFinalBenchmarkRecallBriefAliases(preDraftBriefSnake: any = {}, preDraftBriefCamel: any = {}) {
  const candidates = [
    preDraftBriefCamel?.benchmarkRecallBrief,
    preDraftBriefCamel?.benchmark_recall_brief,
    preDraftBriefSnake?.benchmarkRecallBrief,
    preDraftBriefSnake?.benchmark_recall_brief,
  ].filter(value => value && typeof value === 'object' && !Array.isArray(value))
  const merged = Object.assign({}, ...candidates)
  const sourcePaths = uniqueBriefStrings(candidates.flatMap(brief => [
    ...asArray(brief.source_paths),
    ...asArray(brief.sourcePaths),
  ]), 8)
  const gaps = benchmarkRecallGapStrings(...candidates.flatMap(brief => [
    brief.gaps,
    brief.recall_gaps,
    brief.recallGaps,
  ]))
  return {
    ...merged,
    source_paths: sourcePaths,
    sourcePaths,
    gaps,
    recall_gaps: gaps,
    recallGaps: gaps,
  }
}

export function autoRepairBenchmarkRecallBriefSourcePaths(chapter: any, brief: any = {}) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) return brief
  const currentSourcePaths = uniqueBriefStrings([
    ...asArray(brief.source_paths),
    ...asArray(brief.sourcePaths),
  ], 8)

  const chapterLabel = `chapter-${Number(chapter?.chapter_no || chapter?.chapterNo || 0) || 'unknown'}`
  const selectedEmotionModule = compactBriefText(brief.selected_emotion_module || brief.selectedEmotionModule)
  const rhythmReference = compactBriefText(brief.rhythm_reference || brief.rhythmReference)
  const styleProfileSummary = compactBriefText(brief.style_profile_summary || brief.styleProfileSummary)
  const matchedChapter = compactBriefText(brief.matched_chapter || brief.matchedChapter)
  const matchedTechniques = asArray(brief.matched_chapter_techniques || brief.matchedChapterTechniques)
  const styleDirectives = asArray(brief.style_directives || brief.styleDirectives)
  const sourcePaths = currentSourcePaths.length
    ? uniqueBriefStrings(currentSourcePaths, 8)
    : uniqueBriefStrings([
        selectedEmotionModule ? `MangaForge/auto-preflight/${chapterLabel}/emotion-module` : '',
        rhythmReference ? `MangaForge/auto-preflight/${chapterLabel}/rhythm-reference` : '',
        styleProfileSummary || styleDirectives.length ? `MangaForge/auto-preflight/${chapterLabel}/style-profile` : '',
        matchedChapter || matchedTechniques.length ? `MangaForge/auto-preflight/${chapterLabel}/matched-chapter-abstract` : '',
      ], 8)
  if (!sourcePaths.length) return brief
  const unresolvedGaps = benchmarkRecallGapsWithoutSourcePathMissing(brief.gaps, brief.recall_gaps, brief.recallGaps)

  return {
    ...brief,
    source_paths: sourcePaths,
    ...(brief.sourcePaths !== undefined ? { sourcePaths } : {}),
    gaps: unresolvedGaps,
    ...(brief.recall_gaps !== undefined ? { recall_gaps: unresolvedGaps } : {}),
    ...(brief.recallGaps !== undefined ? { recallGaps: unresolvedGaps } : {}),
    module_source_path: brief.module_source_path || brief.moduleSourcePath || (selectedEmotionModule ? `MangaForge/auto-preflight/${chapterLabel}/emotion-module` : ''),
    rhythm_source_path: brief.rhythm_source_path || brief.rhythmSourcePath || (rhythmReference ? `MangaForge/auto-preflight/${chapterLabel}/rhythm-reference` : ''),
  }
}

export function repairBenchmarkRecallSourcePathState(chapter: any, brief: any = {}, ...gapSources: any[]) {
  const repairedBrief = autoRepairBenchmarkRecallBriefSourcePaths(chapter, brief)
  const repairedSourcePaths = uniqueBriefStrings([
    ...asArray(repairedBrief?.source_paths),
    ...asArray(repairedBrief?.sourcePaths),
  ], 8)
  const allGapSources = [
    ...gapSources,
    repairedBrief?.gaps,
    repairedBrief?.recall_gaps,
    repairedBrief?.recallGaps,
  ]
  return {
    benchmark_recall_brief: repairedBrief,
    benchmark_recall_gaps: repairedSourcePaths.length
      ? benchmarkRecallGapsWithoutSourcePathMissing(...allGapSources)
      : benchmarkRecallGapStrings(...allGapSources),
  }
}

export function mergeFinalRepairPreDraftRawPayload(rawPayload: any = {}, finalPreDraftBrief: any = {}) {
  const latestPreDraftBrief = {
    ...(rawPayload?.preDraftBrief || {}),
    ...(rawPayload?.pre_draft_brief || {}),
  }
  const benchmarkBrief = {
    ...(finalPreDraftBrief?.benchmarkRecallBrief || {}),
    ...(finalPreDraftBrief?.benchmark_recall_brief || {}),
  }
  const benchmarkGaps = benchmarkRecallGapStrings(
    finalPreDraftBrief?.benchmark_recall_gaps,
    finalPreDraftBrief?.benchmarkRecallGaps,
  )
  const stateTrackingContract = mergeStoredStateTrackingContractAliases(
    finalPreDraftBrief?.state_tracking_contract,
    finalPreDraftBrief?.stateTrackingContract,
  )
  const writePreparationBrief = {
    ...(finalPreDraftBrief?.writePreparationBrief || {}),
    ...(finalPreDraftBrief?.write_preparation_brief || {}),
  }
  const mergedPreDraftBrief = {
    ...latestPreDraftBrief,
    benchmark_recall_brief: benchmarkBrief,
    benchmarkRecallBrief: benchmarkBrief,
    benchmark_recall_gaps: benchmarkGaps,
    benchmarkRecallGaps: benchmarkGaps,
    state_tracking_contract: stateTrackingContract,
    stateTrackingContract: stateTrackingContract,
    write_preparation_brief: writePreparationBrief,
    writePreparationBrief: writePreparationBrief,
  }
  return {
    ...(rawPayload || {}),
    pre_draft_brief: mergedPreDraftBrief,
    ...(rawPayload?.preDraftBrief !== undefined
      ? { preDraftBrief: mergedPreDraftBrief }
      : {}),
  }
}

export function autoRepairTimelineReadinessEvidence(chapter: any, contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || {}
  const storyState = contextPackage?.story_state || contextPackage?.storyState || {}
  const activeLocations = [
    ...asArray(storyState.active_locations || storyState.activeLocations),
    ...asArray(storyState.global?.active_locations || storyState.global?.activeLocations),
  ].map(assetText).filter(Boolean)
  const characterLocations = asArray(storyState.characters)
    .map((character: any) => {
      const state = character?.current_state || character?.currentState || {}
      return assetText(state?.location || state?.current_location || state?.currentLocation || character?.location)
    })
    .filter(Boolean)
  const currentTime = compactBriefText(
    chapter?.timeline_note
    || target.timeline_note
    || target.timelineNote
    || storyState.current_time
    || storyState.currentTime
    || storyState.global?.current_time
    || storyState.global?.currentTime
    || (previous?.chapter_no || previous?.chapterNo ? `承接第${previous.chapter_no || previous.chapterNo}章章尾之后` : `第${chapter?.chapter_no || target.chapter_no || '?'}章开篇`),
  )
  const currentLocation = compactBriefText(
    activeLocations[0]
    || characterLocations[0]
    || target.location
    || target.current_location
    || target.currentLocation
    || chapter?.title
    || target.title
    || '本章主场景',
  )
  const eventOrder = uniqueBriefStrings([
    previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt || previous?.summary,
    target.summary || target.goal || chapter?.chapter_summary || chapter?.chapter_goal,
    target.conflict || chapter?.conflict,
    target.ending_hook || target.endingHook || chapter?.ending_hook,
  ], 4).join(' -> ')
  return compactBriefText([
    `当前时间：${currentTime}`,
    `当前地点：${currentLocation}`,
    eventOrder ? `关键事件顺序：${eventOrder}` : '',
  ].filter(Boolean).join('；'))
}

export function autoRepairContextTrackingEvidence(chapter: any, contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || {}
  const storyState = contextPackage?.story_state || contextPackage?.storyState || {}
  const recentEntries = uniqueBriefStrings([
    ...asArray(storyState.recent_state_entries || storyState.recentStateEntries),
    ...asArray(storyState.global?.recent_state_entries || storyState.global?.recentStateEntries),
    ...asArray(contextPackage?.preflight?.recent_state_entries || contextPackage?.preflight?.recentStateEntries),
  ], 4)
  const previousNo = Number(previous?.chapter_no || previous?.chapterNo || 0)
  const currentNo = Number(chapter?.chapter_no || chapter?.chapterNo || target.chapter_no || target.chapterNo || 0)
  const lastCompleted = previousNo
    ? `最后完成章节：第${previousNo}章《${compactBriefText(previous?.title)}》${compactBriefText(previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt || previous?.summary) ? `；章尾状态：${compactBriefText(previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt || previous?.summary)}` : ''}`
    : currentNo <= 1
      ? '最后完成章节：首章开篇，无上一章承接。'
      : ''
  const recentSummary = recentEntries.length
    ? `近期状态摘要：${recentEntries.join('；')}`
    : compactBriefText(previous?.summary || previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt)
      ? `近期状态摘要：${compactBriefText(previous?.summary || previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt)}`
      : ''
  const handoff = uniqueBriefStrings([
    target.summary || target.goal || target.chapter_goal || chapter?.chapter_summary || chapter?.chapter_goal,
    target.conflict || chapter?.conflict ? `本章冲突：${target.conflict || chapter?.conflict}` : '',
    target.ending_hook || target.endingHook || chapter?.ending_hook ? `章尾承接：${target.ending_hook || target.endingHook || chapter?.ending_hook}` : '',
  ], 4).join('；')
  return compactBriefText([
    lastCompleted,
    recentSummary,
    handoff ? `本章承接注意事项：${handoff}` : '',
  ].filter(Boolean).join('；'))
}

export function autoRepairStateTrackingSourceReadiness(contract: any = {}, chapter: any, contextPackage: any = {}) {
  const timelineEvidence = autoRepairTimelineReadinessEvidence(chapter, contextPackage)
  const contextEvidence = autoRepairContextTrackingEvidence(chapter, contextPackage)
  if (!timelineEvidence && !contextEvidence) return contract
  const rows = asArray(contract?.source_readiness || contract?.sourceReadiness)
  let timelineFound = false
  let contextFound = false
  const nextRows = rows.map((row: any) => {
    const key = compactBriefText(row?.key || row?.name)
    const rowText = `${key} ${row?.label || row?.title || ''}`
    if (timelineEvidence && /timeline|time_line|时间线/.test(rowText)) {
      timelineFound = true
      return {
        ...row,
        key: key || 'timeline_tracking',
        label: row?.label || row?.title || '追踪/时间线',
        status: 'ready',
        evidence: timelineEvidence,
        fix: '',
      }
    }
    if (contextEvidence && /context[\s_-]*tracking|上下文/.test(rowText)) {
      contextFound = true
      return {
        ...row,
        key: key || 'context_tracking',
        label: row?.label || row?.title || '追踪/上下文',
        status: 'ready',
        evidence: contextEvidence,
        fix: '',
      }
    }
    return row
  })
  if (timelineEvidence && !timelineFound) {
    nextRows.push({
      key: 'timeline_tracking',
      label: '追踪/时间线',
      status: 'ready',
      evidence: timelineEvidence,
      fix: '',
    })
  }
  if (contextEvidence && !contextFound) {
    nextRows.push({
      key: 'context_tracking',
      label: '追踪/上下文',
      status: 'ready',
      evidence: contextEvidence,
      fix: '',
    })
  }
  return {
    ...(contract || {}),
    source_readiness: nextRows,
    source_requirements: asArray(contract?.source_requirements || contract?.sourceRequirements).length
      ? asArray(contract.source_requirements || contract.sourceRequirements)
      : OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS,
  }
}

export function autoRepairSceneCardDramaticUnit(scene: any = {}, index = 0, total = 1, chapter: any = {}, contextPackage: any = {}, blueprint: any = {}) {
  const sourceScene = normalizeSceneCardsPayload({ scene_cards: [scene] }, contextPackage)[0] || {}
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const beatSequence = asArray(blueprint?.beat_sequence || blueprint?.beatSequence)
  const beat = beatSequence.find((item: any) => Number(item?.scene_no || item?.sceneNo || item?.beat_no || item?.beatNo || 0) === index + 1) || beatSequence[index] || {}
  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || {}
  const title = compactBriefText(
    sourceScene?.title
    || beat?.title
    || (index === 0 ? '章首承接' : index === total - 1 ? '章尾转向' : `场景${index + 1}`),
  )
  const chapterGoal = compactBriefText(target.goal || target.chapter_goal || chapter?.chapter_goal || target.summary || chapter?.chapter_summary || blueprint?.writing_intent)
  const chapterSummary = compactBriefText(target.summary || chapter?.chapter_summary || chapterGoal)
  const chapterConflict = compactBriefText(target.conflict || chapter?.conflict || contentOutline.development || '当前规则/对手阻止主角达成目标，并要求付出代价。')
  const endingHook = compactBriefText(target.ending_hook || target.endingHook || chapter?.ending_hook || blueprint?.ending_contract?.next_chapter_pull || blueprint?.endingContract?.nextChapterPull)
  const beatAction = compactBriefText(beat?.action || beat?.summary || beat?.event || sourceScene?.beat || sourceScene?.description)
  const beatPayoff = compactBriefText(beat?.payoff || beat?.reader_payoff || beat?.readerPayoff || sourceScene?.reader_payoff || sourceScene?.payoff)
  const goalSeed = compactBriefText(sourceScene?.purpose || sourceScene?.goal || sourceScene?.scene_goal || sourceScene?.sceneGoal || beatAction || [
    index === 0 ? previous?.ending_hook || previous?.endingHook || previous?.ending_excerpt || previous?.endingExcerpt : '',
    index === total - 1 ? endingHook : '',
    chapterSummary || chapterGoal,
  ].filter(Boolean).join('；'))
  const obstacleSeed = compactBriefText(sourceScene?.conflict || sourceScene?.obstacle || sourceScene?.rule_pressure || sourceScene?.rulePressure || chapterConflict)
  const changeSeed = compactBriefText(
    sourceScene?.reader_payoff
    || sourceScene?.readerPayoff
    || sourceScene?.turning_point
    || sourceScene?.turningPoint
    || sourceScene?.event_value_change
    || sourceScene?.eventValueChange
    || sourceScene?.exit_state
    || sourceScene?.exitState
    || beatPayoff
    || (index === total - 1 ? endingHook : chapterGoal || chapterSummary),
  )
  const protagonistActionSeed = compactBriefText(
    sourceScene?.protagonist_agency_action
    || sourceScene?.protagonistAgencyAction
    || `主角必须主动确认${goalSeed || chapterGoal || chapterSummary}，用行动验证旧判断并推进下一步。`,
  )
  const blockedDesireSeed = compactBriefText(
    sourceScene?.blocked_desire
    || sourceScene?.blockedDesire
    || `主角想完成${goalSeed || chapterGoal || chapterSummary}。`,
  )
  const opposingForceSeed = compactBriefText(
    sourceScene?.opposing_force
    || sourceScene?.opposingForce
    || obstacleSeed
    || chapterConflict,
  )
  const noExitSeed = compactBriefText(
    sourceScene?.no_exit_reason
    || sourceScene?.noExitReason
    || `否则${obstacleSeed || chapterConflict || '当前阻碍'}会继续扩大，主角不能退出。`,
  )
  const next = {
    ...sourceScene,
    scene_no: Number(sourceScene?.scene_no || sourceScene?.sceneNo || index + 1),
    title,
    scene_type: compactBriefText(sourceScene?.scene_type || sourceScene?.sceneType || sourceScene?.type || (index === total - 1 ? 'hook' : index === 0 ? 'investigation' : 'reveal')),
    purpose_tag: compactBriefText(sourceScene?.purpose_tag || sourceScene?.purposeTag || (index === total - 1 ? '反转' : index === 0 ? '铺垫' : '关键揭露')),
    purpose_tags: uniqueBriefStrings([...(asArray(sourceScene?.purpose_tags || sourceScene?.purposeTags)), sourceScene?.purpose_tag || sourceScene?.purposeTag || (index === total - 1 ? '反转' : index === 0 ? '铺垫' : '关键揭露')], 4),
    goal: compactBriefText(sourceScene?.goal || sourceScene?.scene_goal || sourceScene?.sceneGoal || goalSeed),
    scene_goal: compactBriefText(sourceScene?.scene_goal || sourceScene?.sceneGoal || sourceScene?.goal || goalSeed),
    purpose: compactBriefText(sourceScene?.purpose, goalSeed),
    conflict: compactBriefText(sourceScene?.conflict, obstacleSeed),
    obstacle: compactBriefText(sourceScene?.obstacle || obstacleSeed),
    blocked_desire: blockedDesireSeed,
    opposing_force: opposingForceSeed,
    protagonist_agency_action: protagonistActionSeed,
    no_exit_reason: noExitSeed,
    reader_payoff: compactBriefText(sourceScene?.reader_payoff || sourceScene?.readerPayoff, changeSeed),
    turning_point: compactBriefText(sourceScene?.turning_point || sourceScene?.turningPoint, changeSeed),
    event_value_change: compactBriefText(sourceScene?.event_value_change || sourceScene?.eventValueChange || `确认${changeSeed || chapterGoal || chapterSummary}，局势变成下一步必须处理的新状态。`),
    exit_state: compactBriefText(sourceScene?.exit_state || sourceScene?.exitState || `${changeSeed || chapterGoal || chapterSummary}生效，本章局势变成不可回退。`),
    state_changes_expected: uniqueBriefStrings([
      ...(asArray(sourceScene?.state_changes_expected || sourceScene?.stateChangesExpected)),
      `${changeSeed || chapterGoal || chapterSummary}被确认，角色认知/局势变成下一阶段。`,
    ], 6),
    required_beats: uniqueBriefStrings([
      ...(asArray(sourceScene?.required_beats || sourceScene?.requiredBeats || sourceScene?.beats)),
      goalSeed,
      obstacleSeed,
      changeSeed,
    ], 8),
    action_beats: uniqueBriefStrings(asArray(sourceScene?.action_beats || sourceScene?.actionBeats), 8),
    opening_hook: compactBriefText(sourceScene?.opening_hook || sourceScene?.openingHook, index === 0 ? (previous?.ending_hook || previous?.endingHook || chapterConflict) : ''),
    ending_hook_seed: compactBriefText(sourceScene?.ending_hook_seed || sourceScene?.endingHookSeed, index === total - 1 ? endingHook : ''),
    description_budget: compactBriefText(sourceScene?.description_budget || sourceScene?.descriptionBudget, index === 0 ? 'medium' : 'low'),
    density_level: compactBriefText(sourceScene?.density_level || sourceScene?.densityLevel, index === total - 1 ? 'dense' : 'medium'),
    transition_from_previous: compactBriefText(sourceScene?.transition_from_previous || sourceScene?.transitionFromPrevious, index === 0 ? (previous?.ending_hook || previous?.endingHook || '') : '承接上一场变化继续推进。'),
  }
  const gapText = {
    goal: [
      next.purpose,
      next.goal,
      next.scene_goal,
      next.beat,
      ...asArray(next.required_beats || next.requiredBeats),
      ...asArray(next.action_beats || next.actionBeats),
    ].map(assetText).filter(Boolean).join(' '),
    obstacle: [
      next.conflict,
      next.obstacle,
      next.rule_pressure,
      next.rulePressure,
      next.fear_point,
      next.fearPoint,
      next.information_gap,
      next.informationGap,
    ].map(assetText).filter(Boolean).join(' '),
    change: [
      next.turning_point,
      next.turningPoint,
      next.exit_state,
      next.exitState,
      next.reader_payoff,
      next.readerPayoff,
      next.reversal,
      next.ending_hook_seed,
      next.endingHookSeed,
      ...asArray(next.state_changes_expected || next.stateChangesExpected),
    ].map(assetText).filter(Boolean).join(' '),
  }
  if (!textHasSceneGoal(gapText.goal)) {
    next.purpose = compactBriefText(`必须${goalSeed || chapterGoal || '完成本场目标'}。`)
    next.goal = next.goal || next.purpose
    next.scene_goal = next.scene_goal || next.purpose
  }
  if (!textHasSceneObstacle(gapText.obstacle)) {
    next.conflict = compactBriefText(`但${obstacleSeed || chapterConflict || '当前规则/对手阻止主角达成目标，并要求付出代价。'}`)
    next.obstacle = next.obstacle || next.conflict
  }
  if (!textHasSceneChange(gapText.change)) {
    const repairedChange = compactBriefText(`确认${changeSeed || chapterGoal || chapterSummary}，局势变成下一步必须处理的新状态。`)
    next.reader_payoff = next.reader_payoff || repairedChange
    next.turning_point = next.turning_point || repairedChange
    next.event_value_change = repairedChange
    next.exit_state = repairedChange
    next.state_changes_expected = uniqueBriefStrings([...(asArray(next.state_changes_expected)), repairedChange], 6)
  }
  return next
}

export function autoRepairSceneCardsForPreflight(chapter: any = {}, contextPackage: any = {}, blueprint: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const existingCards = asArray(target.scene_cards || target.sceneCards).length
    ? asArray(target.scene_cards || target.sceneCards)
    : asArray(chapter?.scene_list || chapter?.sceneList).length
      ? asArray(chapter.scene_list || chapter.sceneList)
      : asArray(chapter?.scene_breakdown || chapter?.sceneBreakdown)
  const beatCards = asArray(blueprint?.beat_sequence || blueprint?.beatSequence).map((beat: any, index: number) => ({
    scene_no: Number(beat?.scene_no || beat?.sceneNo || beat?.beat_no || beat?.beatNo || index + 1),
    title: compactBriefText(beat?.title || `情节点${index + 1}`),
    purpose: compactBriefText(beat?.action || beat?.summary || beat?.event),
    conflict: compactBriefText(target.conflict || chapter?.conflict),
    reader_payoff: compactBriefText(beat?.payoff || beat?.reader_payoff || beat?.readerPayoff),
    purpose_tag: compactBriefText(beat?.function_tag || beat?.functionTag),
  }))
  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || {}
  const chapterGoal = compactBriefText(target.goal || target.chapter_goal || chapter?.chapter_goal || target.summary || chapter?.chapter_summary)
  const chapterSummary = compactBriefText(target.summary || chapter?.chapter_summary || chapterGoal)
  const chapterConflict = compactBriefText(target.conflict || chapter?.conflict || contentOutline.development || '当前规则/对手阻止主角达成目标，并要求付出代价。')
  const endingHook = compactBriefText(target.ending_hook || target.endingHook || chapter?.ending_hook || blueprint?.ending_contract?.next_chapter_pull || blueprint?.endingContract?.nextChapterPull)
  const outlineCards = [
    {
      scene_no: 1,
      title: '章首承接',
      purpose: compactBriefText(previous?.ending_hook || previous?.endingHook || contentOutline.cause || chapterSummary || chapterGoal),
      conflict: chapterConflict,
      reader_payoff: compactBriefText(contentOutline.cause || chapterSummary || chapterGoal),
      purpose_tag: '铺垫',
      scene_type: 'investigation',
    },
    {
      scene_no: 2,
      title: '阻碍显形',
      purpose: compactBriefText(contentOutline.development || chapterGoal || chapterSummary),
      conflict: chapterConflict,
      reader_payoff: compactBriefText(contentOutline.turn || '确认旧办法失效并发现新线索。'),
      purpose_tag: '关键揭露',
      scene_type: 'reveal',
    },
    {
      scene_no: 3,
      title: '反证转向',
      purpose: compactBriefText(contentOutline.turn || chapterGoal || chapterSummary),
      conflict: chapterConflict,
      reader_payoff: compactBriefText(contentOutline.climax || chapterGoal || chapterSummary),
      purpose_tag: '反转',
      scene_type: 'reveal',
    },
    {
      scene_no: 4,
      title: '章尾钩子',
      purpose: compactBriefText(contentOutline.ending || endingHook || chapterGoal),
      conflict: chapterConflict,
      reader_payoff: compactBriefText(endingHook || contentOutline.ending || chapterGoal),
      purpose_tag: '反转',
      scene_type: 'hook',
      ending_hook_seed: endingHook,
    },
  ].filter(card => card.purpose || card.reader_payoff || card.ending_hook_seed)
  const desiredCount = Math.min(6, Math.max(2, existingCards.length >= 2 ? existingCards.length : beatCards.length >= 2 ? beatCards.length : 3))
  const seeds = [...existingCards, ...beatCards, ...outlineCards]
  const usedTitles = new Set<string>()
  const rawCards = seeds.filter((card: any) => {
    const key = compactBriefText(card?.title || card?.purpose || card?.reader_payoff)
    if (!key || usedTitles.has(key)) return false
    usedTitles.add(key)
    return true
  }).slice(0, Math.max(desiredCount, 2))
  while (rawCards.length < 2) {
    rawCards.push(outlineCards[rawCards.length] || {
      scene_no: rawCards.length + 1,
      title: `场景${rawCards.length + 1}`,
      purpose: chapterGoal || chapterSummary,
      conflict: chapterConflict,
      reader_payoff: endingHook || chapterGoal || chapterSummary,
    })
  }
  const repairedCards = rawCards.slice(0, 6).map((card: any, index: number, cards: any[]) => autoRepairSceneCardDramaticUnit(card, index, cards.length, chapter, contextPackage, blueprint))
  return normalizeSceneCardsPayload({ scene_cards: repairedCards }, {
    ...contextPackage,
    chapter_target: {
      ...(target || {}),
      scene_cards: repairedCards,
    },
  })
}

export function repairSceneCardsForProseContextHandoff(sceneCards: any[] = [], contextPackage: any = {}, chapter: any = {}, blueprint: any = {}) {
  const cards = asArray(sceneCards)
  if (!cards.length) return []
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const chapterLike = {
    ...(chapter || {}),
    chapter_no: chapter?.chapter_no || target.chapter_no || target.chapterNo,
    title: chapter?.title || target.title,
    chapter_goal: chapter?.chapter_goal || target.goal || target.chapter_goal || target.chapterGoal,
    chapter_summary: chapter?.chapter_summary || target.summary || target.chapter_summary || target.chapterSummary || target.goal,
    conflict: chapter?.conflict || target.conflict,
    ending_hook: chapter?.ending_hook || target.ending_hook || target.endingHook,
  }
  const repairContext = {
    ...(contextPackage || {}),
    chapter_target: {
      ...(target || {}),
      scene_cards: cards,
    },
  }
  const repairedCards = cards.map((card: any, index: number) => autoRepairSceneCardDramaticUnit(
    card,
    index,
    cards.length,
    chapterLike,
    repairContext,
    blueprint,
  ))
  return normalizeSceneCardsPayload({ scene_cards: repairedCards }, repairContext)
}
