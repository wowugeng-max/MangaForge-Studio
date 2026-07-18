import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore } from '../../novel-writing/text-matching'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType } from '../../novel-writing/beat-cooling-basics'
import {
  SERIAL_CONFLICT_SIGNAL_PATTERN,
  SERIAL_CORE_ELEMENT_HINTS,
  SERIAL_CORE_HOOK_ANGLE_HINTS,
  SERIAL_CORE_HOOK_DELIVERY_PATTERN,
  SERIAL_DOWNWARD_RECOVERY_PATTERN,
  SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN,
  SERIAL_EXPECTATION_LONG_LAYER_PATTERN,
  SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN,
  SERIAL_EXPECTATION_SHORT_LAYER_PATTERN,
  SERIAL_FORESHADOWING_CONTRACT_PATTERN,
  SERIAL_FORESHADOWING_LABEL_HINTS,
  SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN,
  SERIAL_FORESHADOWING_PROGRESS_PATTERN,
  SERIAL_LOOSE_EXIT_PATTERN,
  SERIAL_NO_EXIT_GLUE_PATTERN,
  SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN,
  SERIAL_PROTAGONIST_LONG_GOAL_PATTERN,
  SERIAL_READER_NEED_CONTRACT_PATTERN,
  SERIAL_READER_NEED_SIGNAL_PATTERN,
  SERIAL_RELATION_TEXTURE_PATTERN,
  SERIAL_SOCIAL_INTERACTION_PATTERN,
  SERIAL_STATUS_LADDER_CONTEXT_PATTERN,
  SERIAL_TEXTURE_NEGATION_PATTERN,
  SERIAL_UPPER_STATUS_CONTACT_PATTERN,
  SERIAL_WEAK_CONFLICT_PATTERN,
  SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN,
  SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN,
  SERIAL_WORLD_TEXTURE_PATTERN,
  serialChapterBlueprintForLines,
  serialChapterRawContextTarget,
  serialChapterStoryLoopContract,
  serialChapterText,
  serialPositivePatternTest,
} from './serial-momentum'

import {
  serialChapterExpectationThresholdContract,
  serialChapterSuspenseContract,
  serialChapterTargetReaderContract,
  serialForeshadowingLabel
} from './serial-momentum-states-extended-shared'

export function serialChapterWorldExpansionState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const blueprintStoryLoop = blueprint?.story_loop_contract
    || blueprint?.storyLoopContract
    || chapterTarget?.story_loop_contract
    || chapterTarget?.storyLoopContract
    || preDraftBrief?.story_loop_contract
    || preDraftBrief?.storyLoopContract
    || {}
  const storyLoopContracts = [storyLoop, blueprintStoryLoop]
  const contractItems = uniqueBriefStrings(storyLoopContracts.flatMap((contract: any) => [
    contract?.map_transition_rules,
    contract?.mapTransitionRules,
    contract?.nested_loop_rules,
    contract?.nestedLoopRules,
    contract?.quality_checks,
    contract?.qualityChecks,
  ]).flat().map((item: any) => compactBriefText(item)).filter(Boolean), 12)
  const hasContractFields = storyLoopContracts.some((contract: any) => Boolean(
    asArray(contract?.map_transition_rules || contract?.mapTransitionRules).length
    || asArray(contract?.nested_loop_rules || contract?.nestedLoopRules).length,
  ))
  const hasExpansionContract = hasContractFields || contractItems.some((item: string) => {
    SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...storyLoopContracts.flatMap((contract: any) => [
      contract?.setup,
      contract?.escalation,
      contract?.payoff,
      contract?.carry_over,
      contract?.carryOver,
    ]),
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.exit_state,
      scene?.exitState,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN.lastIndex = 0
  return {
    has_world_expansion_contract: hasExpansionContract,
    has_world_expansion_signal: Boolean(deliveryText && SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN.test(deliveryText)),
  }
}

export function serialChapterReaderNeedCoverageState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterTargetReaderContract(chapter)
  const contractItems = uniqueBriefStrings([
    contract?.reader_profile,
    contract?.readerProfile,
    contract?.reader_desires,
    contract?.readerDesires,
    contract?.desires,
    contract?.emotional_gap_analysis,
    contract?.emotionalGapAnalysis,
    contract?.emotional_gaps,
    contract?.emotionalGaps,
    contract?.chapter_attractions,
    contract?.chapterAttractions,
    contract?.attractions,
    contract?.validation_questions,
    contract?.validationQuestions,
    contract?.quality_checks,
    contract?.qualityChecks,
    contract?.revision_priorities,
    contract?.revisionPriorities,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 16)
  const hasContract = Boolean(Object.keys(contract || {}).length && (
    contractItems.length > 0
    || asArray(contract?.reader_desires || contract?.readerDesires || contract?.desires).length
    || asArray(contract?.emotional_gap_analysis || contract?.emotionalGapAnalysis || contract?.emotional_gaps || contract?.emotionalGaps).length
    || asArray(contract?.chapter_attractions || contract?.chapterAttractions || contract?.attractions).length
  ))
  const hasReaderNeedContract = hasContract && contractItems.some((item: string) => {
    SERIAL_READER_NEED_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_READER_NEED_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.exit_state,
      scene?.exitState,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_READER_NEED_SIGNAL_PATTERN.lastIndex = 0
  return {
    has_reader_need_contract: hasReaderNeedContract,
    has_reader_need_signal: Boolean(deliveryText && SERIAL_READER_NEED_SIGNAL_PATTERN.test(deliveryText)),
  }
}

export function serialChapterExpectationLadderState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterExpectationThresholdContract(chapter)
  const threeLines = contract?.three_expectation_lines || contract?.threeExpectationLines || {}
  const contractItems = uniqueBriefStrings([
    contract?.short_expectation,
    contract?.shortExpectation,
    contract?.current_expectations,
    contract?.currentExpectations,
    contract?.medium_expectations,
    contract?.mediumExpectations,
    contract?.long_expectations,
    contract?.longExpectations,
    contract?.next_open_loop,
    contract?.nextOpenLoop,
    contract?.expectation_before_payoff_rules,
    contract?.expectationBeforePayoffRules,
    contract?.quality_checks,
    contract?.qualityChecks,
    threeLines?.plot_expectation,
    threeLines?.plotExpectation,
    threeLines?.theme_payoff,
    threeLines?.themePayoff,
    threeLines?.freshness_hook,
    threeLines?.freshnessHook,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 18)
  const hasLayerFields = Boolean(
    contract?.short_expectation
    || contract?.shortExpectation
    || asArray(contract?.medium_expectations || contract?.mediumExpectations).length
    || asArray(contract?.long_expectations || contract?.longExpectations).length
    || Object.keys(threeLines || {}).length,
  )
  const hasExpectationLadderContract = hasLayerFields || contractItems.some((item: string) => {
    SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_SHORT_LAYER_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_LONG_LAYER_PATTERN.lastIndex = 0
  const hasShort = Boolean(deliveryText && SERIAL_EXPECTATION_SHORT_LAYER_PATTERN.test(deliveryText))
  const hasMedium = Boolean(deliveryText && SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN.test(deliveryText))
  const hasLong = Boolean(deliveryText && SERIAL_EXPECTATION_LONG_LAYER_PATTERN.test(deliveryText))
  return {
    has_expectation_ladder_contract: hasExpectationLadderContract,
    has_short_expectation: hasShort,
    has_medium_expectation: hasMedium,
    has_long_expectation: hasLong,
    missing: [
      hasShort ? '' : '短期期待',
      hasMedium ? '' : '中期期待',
      hasLong ? '' : '长期期待',
    ].filter(Boolean),
  }
}

export function serialChapterForeshadowingState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterSuspenseContract(chapter)
  const expectationChain = contract?.expectation_chain || contract?.expectationChain || {}
  const contractItems = uniqueBriefStrings([
    contract?.foreshadowing_boundary_rules,
    contract?.foreshadowingBoundaryRules,
    contract?.suspense_cycle,
    contract?.suspenseCycle,
    contract?.expectation_layers,
    contract?.expectationLayers,
    expectationChain?.active_lines,
    expectationChain?.activeLines,
    expectationChain?.carry_rules,
    expectationChain?.carryRules,
    expectationChain?.next_open_loop,
    expectationChain?.nextOpenLoop,
    contract?.quality_checks,
    contract?.qualityChecks,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 18)
  const hasContract = Boolean(Object.keys(contract || {}).length && contractItems.length)
  const hasForeshadowingContract = hasContract && contractItems.some((item: string) => {
    SERIAL_FORESHADOWING_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_FORESHADOWING_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.foreshadowing,
      scene?.clue,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const label = serialForeshadowingLabel(deliveryText)
  SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN.lastIndex = 0
  SERIAL_FORESHADOWING_PROGRESS_PATTERN.lastIndex = 0
  const hasNoProgress = Boolean(deliveryText && SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN.test(deliveryText))
  const hasProgress = Boolean(deliveryText && SERIAL_FORESHADOWING_PROGRESS_PATTERN.test(deliveryText) && !hasNoProgress)
  return {
    has_foreshadowing_contract: hasForeshadowingContract,
    foreshadowing_label: label,
    has_foreshadowing_progress: hasProgress,
    has_no_progress_marker: hasNoProgress,
  }
}

export function serialChapterTextureBeatState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const currentBeat = chapterTarget?.current_beat || chapterTarget?.currentBeat || rawPayload?.current_beat || rawPayload?.currentBeat || {}
  const explicitBeatType = normalizeBeatCoolingType(
    chapter?.beat_type,
    chapter?.beatType,
    chapter?.event_type,
    chapter?.eventType,
    rawPayload?.beat_type,
    rawPayload?.beatType,
    rawPayload?.event_type,
    rawPayload?.eventType,
    blueprint?.beat_type,
    blueprint?.beatType,
    chapterTarget?.beat_type,
    chapterTarget?.beatType,
    chapterTarget?.event_type,
    chapterTarget?.eventType,
    currentBeat?.beat_type,
    currentBeat?.beatType,
    currentBeat?.type,
    currentBeat?.event_type,
    currentBeat?.eventType,
  )
  if (['bond_deepening', 'world_painting'].includes(explicitBeatType)) {
    return {
      has_texture_beat: true,
      beat_type: explicitBeatType,
    }
  }

  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = [
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.worldbuilding,
      scene?.world_building,
      scene?.worldBuilding,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。')

  if (serialPositivePatternTest(text, SERIAL_RELATION_TEXTURE_PATTERN)) {
    return {
      has_texture_beat: true,
      beat_type: 'bond_deepening',
    }
  }
  if (serialPositivePatternTest(text, SERIAL_WORLD_TEXTURE_PATTERN)) {
    return {
      has_texture_beat: true,
      beat_type: 'world_painting',
    }
  }
  return {
    has_texture_beat: false,
    beat_type: '',
  }
}

