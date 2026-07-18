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

export function serialChapterProtagonistGoalState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const explicitCurrentGoal = firstCompactText(
    chapter?.chapter_goal,
    chapter?.chapterGoal,
    chapter?.goal,
    chapter?.current_goal,
    chapter?.currentGoal,
    chapter?.short_goal,
    chapter?.shortGoal,
    chapter?.protagonist_goal,
    chapter?.protagonistGoal,
    rawPayload?.chapter_goal,
    rawPayload?.chapterGoal,
    rawPayload?.goal,
    rawPayload?.current_goal,
    rawPayload?.currentGoal,
    rawPayload?.short_goal,
    rawPayload?.shortGoal,
    rawPayload?.protagonist_goal,
    rawPayload?.protagonistGoal,
    preDraftBrief?.chapter_goal,
    preDraftBrief?.chapterGoal,
    preDraftBrief?.goal,
    preDraftBrief?.current_goal,
    preDraftBrief?.currentGoal,
    preDraftBrief?.short_goal,
    preDraftBrief?.shortGoal,
    preDraftBrief?.protagonist_goal,
    preDraftBrief?.protagonistGoal,
    chapterTarget?.chapter_goal,
    chapterTarget?.chapterGoal,
    chapterTarget?.goal,
    chapterTarget?.current_goal,
    chapterTarget?.currentGoal,
    blueprint?.chapter_goal,
    blueprint?.chapterGoal,
    blueprint?.goal,
    blueprint?.current_goal,
    blueprint?.currentGoal,
    blueprint?.short_goal,
    blueprint?.shortGoal,
    blueprint?.protagonist_goal,
    blueprint?.protagonistGoal,
    storyLoop?.goal,
    storyLoop?.current_goal,
    storyLoop?.currentGoal,
    storyLoop?.short_goal,
    storyLoop?.shortGoal,
  )
  const explicitLongGoal = firstCompactText(
    chapter?.long_term_goal,
    chapter?.longTermGoal,
    chapter?.long_goal,
    chapter?.longGoal,
    chapter?.big_goal,
    chapter?.bigGoal,
    chapter?.volume_goal,
    chapter?.volumeGoal,
    chapter?.mainline_goal,
    chapter?.mainlineGoal,
    rawPayload?.long_term_goal,
    rawPayload?.longTermGoal,
    rawPayload?.long_goal,
    rawPayload?.longGoal,
    rawPayload?.big_goal,
    rawPayload?.bigGoal,
    rawPayload?.volume_goal,
    rawPayload?.volumeGoal,
    rawPayload?.current_volume_goal,
    rawPayload?.currentVolumeGoal,
    preDraftBrief?.long_term_goal,
    preDraftBrief?.longTermGoal,
    preDraftBrief?.long_goal,
    preDraftBrief?.longGoal,
    preDraftBrief?.big_goal,
    preDraftBrief?.bigGoal,
    preDraftBrief?.volume_goal,
    preDraftBrief?.volumeGoal,
    chapterTarget?.long_term_goal,
    chapterTarget?.longTermGoal,
    chapterTarget?.volume_goal,
    chapterTarget?.volumeGoal,
    blueprint?.long_term_goal,
    blueprint?.longTermGoal,
    blueprint?.long_goal,
    blueprint?.longGoal,
    blueprint?.big_goal,
    blueprint?.bigGoal,
    blueprint?.volume_goal,
    blueprint?.volumeGoal,
    blueprint?.mainline_goal,
    blueprint?.mainlineGoal,
    storyLoop?.long_term_goal,
    storyLoop?.longTermGoal,
    storyLoop?.long_goal,
    storyLoop?.longGoal,
    storyLoop?.big_goal,
    storyLoop?.bigGoal,
    storyLoop?.volume_goal,
    storyLoop?.volumeGoal,
    storyLoop?.mainline_goal,
    storyLoop?.mainlineGoal,
  )
  const contractText = compactBriefText([
    contentOutline?.cause,
    contentOutline?.development,
    contentOutline?.turn,
    contentOutline?.climax,
    contentOutline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.logic_line,
    plotLines?.logicLine,
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    storyLoop?.nested_loop_rules,
    storyLoop?.nestedLoopRules,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const hasPlanningContract = Boolean(
    explicitCurrentGoal
    || explicitLongGoal
    || Object.keys(blueprint || {}).length
    || Object.keys(storyLoop || {}).length
    || preDraftBrief?.chapter_blueprint
    || preDraftBrief?.chapterBlueprint
    || chapterTarget?.chapter_blueprint
    || chapterTarget?.chapterBlueprint,
  )
  SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN.lastIndex = 0
  SERIAL_PROTAGONIST_LONG_GOAL_PATTERN.lastIndex = 0
  const hasCurrentGoal = Boolean(explicitCurrentGoal || SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN.test(contractText))
  const hasLongGoal = Boolean(explicitLongGoal || SERIAL_PROTAGONIST_LONG_GOAL_PATTERN.test(contractText))
  return {
    has_goal_contract: hasPlanningContract,
    has_current_goal: hasCurrentGoal,
    has_long_goal: hasLongGoal,
    missing: [
      hasCurrentGoal ? '' : '当前小目标',
      hasLongGoal ? '' : '长线大目标',
    ].filter(Boolean),
  }
}

export function serialChapterNoExitGlueState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const conflictStructureContract = chapter?.conflict_structure_contract
    || chapter?.conflictStructureContract
    || rawPayload?.conflict_structure_contract
    || rawPayload?.conflictStructureContract
    || preDraftBrief?.conflict_structure_contract
    || preDraftBrief?.conflictStructureContract
    || chapterTarget?.conflict_structure_contract
    || chapterTarget?.conflictStructureContract
    || blueprint?.conflict_structure_contract
    || blueprint?.conflictStructureContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.chapter_conflict,
    chapter?.chapterConflict,
    chapter?.conflict_summary,
    chapter?.conflictSummary,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.chapter_conflict,
    rawPayload?.chapterConflict,
    rawPayload?.conflict_summary,
    rawPayload?.conflictSummary,
    conflictStructureContract?.no_exit_rules,
    conflictStructureContract?.noExitRules,
    conflictStructureContract?.stakes,
    conflictStructureContract?.exit_cost,
    conflictStructureContract?.exitCost,
    conflictStructureContract?.glue,
    conflictStructureContract?.conflict_glue,
    conflictStructureContract?.conflictGlue,
    blueprint?.conflict,
    blueprint?.chapter_conflict,
    blueprint?.chapterConflict,
    blueprint?.stakes,
    blueprint?.exit_cost,
    blueprint?.exitCost,
    ...sceneCards.flatMap((scene: any) => [
      scene?.conflict,
      scene?.obstacle,
      scene?.rule_pressure,
      scene?.rulePressure,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.stakes,
      scene?.exit_cost,
      scene?.exitCost,
      scene?.no_exit_rule,
      scene?.noExitRule,
      scene?.glue,
      scene?.conflict_glue,
      scene?.conflictGlue,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_WEAK_CONFLICT_PATTERN.lastIndex = 0
  SERIAL_CONFLICT_SIGNAL_PATTERN.lastIndex = 0
  SERIAL_NO_EXIT_GLUE_PATTERN.lastIndex = 0
  SERIAL_LOOSE_EXIT_PATTERN.lastIndex = 0
  const hasConflict = Boolean(text && SERIAL_CONFLICT_SIGNAL_PATTERN.test(text) && !SERIAL_WEAK_CONFLICT_PATTERN.test(text))
  const hasLooseExit = Boolean(text && SERIAL_LOOSE_EXIT_PATTERN.test(text))
  const hasNoExitGlue = Boolean(text && SERIAL_NO_EXIT_GLUE_PATTERN.test(text) && !hasLooseExit)
  return {
    has_conflict: hasConflict,
    has_no_exit_glue: hasNoExitGlue,
    has_loose_exit: hasLooseExit,
  }
}

export function serialChapterSocialNetworkState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    blueprint?.relationship_change,
    blueprint?.relationshipChange,
    blueprint?.character_relation,
    blueprint?.characterRelation,
    blueprint?.social_network,
    blueprint?.socialNetwork,
    chapterTarget?.relationship_change,
    chapterTarget?.relationshipChange,
    chapterTarget?.social_network,
    chapterTarget?.socialNetwork,
    preDraftBrief?.relationship_change,
    preDraftBrief?.relationshipChange,
    preDraftBrief?.social_network,
    preDraftBrief?.socialNetwork,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.social_interaction,
      scene?.socialInteraction,
      scene?.dialogue_goal,
      scene?.dialogueGoal,
      scene?.stakeholder,
      scene?.witness_reactions,
      scene?.witnessReactions,
      scene?.spectator_reactions,
      scene?.spectatorReactions,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SOCIAL_INTERACTION_PATTERN.lastIndex = 0
  return {
    has_social_interaction: Boolean(text && SERIAL_SOCIAL_INTERACTION_PATTERN.test(text)),
  }
}

export function serialChapterUpperStatusState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
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
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    storyLoop?.map_transition_rules,
    storyLoop?.mapTransitionRules,
    ...sceneCards.flatMap((scene: any) => [
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.state_change,
      scene?.stateChange,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.stakes,
      scene?.rule_pressure,
      scene?.rulePressure,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_STATUS_LADDER_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_UPPER_STATUS_CONTACT_PATTERN.lastIndex = 0
  return {
    has_status_ladder_context: Boolean(text && SERIAL_STATUS_LADDER_CONTEXT_PATTERN.test(text)),
    has_upper_status_contact: Boolean(text && SERIAL_UPPER_STATUS_CONTACT_PATTERN.test(text)),
  }
}

export function serialChapterDownwardRecoveryState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    blueprint?.emotional_recovery,
    blueprint?.emotionalRecovery,
    blueprint?.counterplay,
    blueprint?.safety_signal,
    blueprint?.safetySignal,
    ...sceneCards.flatMap((scene: any) => [
      scene?.conflict,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.pressure,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.counterplay,
      scene?.safety_signal,
      scene?.safetySignal,
      scene?.unexpected_gain,
      scene?.unexpectedGain,
      scene?.information_gain,
      scene?.informationGain,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_DOWNWARD_RECOVERY_PATTERN.lastIndex = 0
  const hasDownwardPressure = Boolean(text && (paragraphHasDownwardPressure(text) || paragraphHasOppressionPressure(text)))
  const hasRecovery = Boolean(text && (textHasDownwardSafetySignal(text) || SERIAL_DOWNWARD_RECOVERY_PATTERN.test(text)))
  return {
    has_downward_pressure: hasDownwardPressure,
    has_recovery: hasRecovery,
  }
}

