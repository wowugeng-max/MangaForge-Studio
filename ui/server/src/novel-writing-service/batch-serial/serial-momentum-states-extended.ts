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

function serialNormalizeCoreElement(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_ELEMENT_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return value.slice(0, 18)
}

function serialCoreHookAngleLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_HOOK_ANGLE_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return ''
}

export function serialChapterCoreElementCombo(chapter: any) {
  const contract = serialChapterStoryLoopContract(chapter)
  const explicitElements = asArray(contract?.core_elements || contract?.coreElements || chapter?.core_elements || chapter?.coreElements)
    .map((item: any) => serialNormalizeCoreElement(String(item || '')))
    .filter(Boolean)
  const inferredElements = SERIAL_CORE_ELEMENT_HINTS
    .filter(([pattern]) => {
      const text = serialChapterText(chapter)
      pattern.lastIndex = 0
      return pattern.test(text)
    })
    .map(([, label]) => label)
  const elements = uniqueBriefStrings(explicitElements.length ? explicitElements : inferredElements, 6).sort()
  if (elements.length < 3) return null
  return {
    elements,
    key: elements.join('|'),
    label: elements.join(' + '),
  }
}

export function serialChapterCoreHookState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const genreContract = chapter?.genre_positioning_contract
    || chapter?.genrePositioningContract
    || rawPayload?.genre_positioning_contract
    || rawPayload?.genrePositioningContract
    || preDraftBrief?.genre_positioning_contract
    || preDraftBrief?.genrePositioningContract
    || chapterTarget?.genre_positioning_contract
    || chapterTarget?.genrePositioningContract
    || blueprint?.genre_positioning_contract
    || blueprint?.genrePositioningContract
    || {}
  const qualityContract = chapter?.quality_audit_contract
    || chapter?.qualityAuditContract
    || rawPayload?.quality_audit_contract
    || rawPayload?.qualityAuditContract
    || preDraftBrief?.quality_audit_contract
    || preDraftBrief?.qualityAuditContract
    || chapterTarget?.quality_audit_contract
    || chapterTarget?.qualityAuditContract
    || blueprint?.quality_audit_contract
    || blueprint?.qualityAuditContract
    || {}
  const commercial = rawPayload?.commercial_positioning
    || rawPayload?.commercialPositioning
    || rawPayload?.writing_bible?.commercial_positioning
    || rawPayload?.writingBible?.commercialPositioning
    || {}
  const coreHookItems = uniqueBriefStrings([
    chapter?.core_selling_point,
    chapter?.coreSellingPoint,
    rawPayload?.core_selling_point,
    rawPayload?.coreSellingPoint,
    rawPayload?.writing_bible?.core_selling_point,
    rawPayload?.writingBible?.coreSellingPoint,
    commercial?.core_selling_point,
    commercial?.coreSellingPoint,
    commercial?.selling_points,
    commercial?.sellingPoints,
    genreContract?.core_hook_rules,
    genreContract?.coreHookRules,
    genreContract?.longboard_focus_rules,
    genreContract?.longboardFocusRules,
    qualityContract?.selling_point_expression_rules,
    qualityContract?.sellingPointExpressionRules,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 10)
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
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_CORE_HOOK_DELIVERY_PATTERN.lastIndex = 0
  const hasSignalDelivery = Boolean(deliveryText && SERIAL_CORE_HOOK_DELIVERY_PATTERN.test(deliveryText))
  const hasAnchorDelivery = coreHookItems.some((item: string) => anchorMatchScore(item, deliveryText).score >= 34)
  const angleLabel = serialCoreHookAngleLabel(deliveryText)
  return {
    has_core_hook_contract: coreHookItems.length > 0,
    has_core_hook_delivery: Boolean(hasSignalDelivery || hasAnchorDelivery),
    core_hook_angle: angleLabel,
  }
}

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

function serialChapterTargetReaderContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.target_reader_contract
    || chapter?.targetReaderContract
    || rawPayload?.target_reader_contract
    || rawPayload?.targetReaderContract
    || blueprint?.target_reader_contract
    || blueprint?.targetReaderContract
    || preDraftBrief?.target_reader_contract
    || preDraftBrief?.targetReaderContract
    || chapterTarget?.target_reader_contract
    || chapterTarget?.targetReaderContract
    || rawPayload?.context_package?.target_reader_contract
    || rawPayload?.contextPackage?.targetReaderContract
    || {}
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

function serialChapterExpectationThresholdContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.expectation_threshold_contract
    || chapter?.expectationThresholdContract
    || rawPayload?.expectation_threshold_contract
    || rawPayload?.expectationThresholdContract
    || blueprint?.expectation_threshold_contract
    || blueprint?.expectationThresholdContract
    || preDraftBrief?.expectation_threshold_contract
    || preDraftBrief?.expectationThresholdContract
    || chapterTarget?.expectation_threshold_contract
    || chapterTarget?.expectationThresholdContract
    || rawPayload?.context_package?.expectation_threshold_contract
    || rawPayload?.contextPackage?.expectationThresholdContract
    || {}
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

function serialChapterSuspenseContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.suspense_contract
    || chapter?.suspenseContract
    || rawPayload?.suspense_contract
    || rawPayload?.suspenseContract
    || blueprint?.suspense_contract
    || blueprint?.suspenseContract
    || preDraftBrief?.suspense_contract
    || preDraftBrief?.suspenseContract
    || chapterTarget?.suspense_contract
    || chapterTarget?.suspenseContract
    || rawPayload?.context_package?.suspense_contract
    || rawPayload?.contextPackage?.suspenseContract
    || {}
}

function serialForeshadowingLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_FORESHADOWING_LABEL_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  const genericMatch = value.match(/([\u4e00-\u9fa5A-Za-z0-9]{1,12}(?:缺口|水痕|旧印|钥匙|名单|血印|门锁|门环|人影|伏笔|线索))/)
  return genericMatch?.[1] || ''
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

