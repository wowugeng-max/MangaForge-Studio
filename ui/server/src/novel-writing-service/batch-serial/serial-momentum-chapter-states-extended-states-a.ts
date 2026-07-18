import { asArray, compactText, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType, inferBeatCoolingTypeFromText } from '../../novel-writing/beat-cooling-basics'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewBelongsToChapter, reviewPayloadForType, reviewTimestamp } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import { inferEndingHookType } from './ending-hook-type'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore, normalizedMatchText } from '../../novel-writing/text-matching'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'

import {
  SERIAL_PROGRESS_SIGNAL_PATTERN,
  SERIAL_PAYOFF_SIGNAL_PATTERN,
  SERIAL_AFTERMATH_SIGNAL_PATTERN,
  SERIAL_LINE_INACTIVE_PATTERN,
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN,
  SERIAL_ENDING_HARVEST_PATTERN,
  SERIAL_ENDING_HANDOFF_PATTERN,
  SERIAL_ENDING_SAFE_CLOSURE_PATTERN,
  SERIAL_ENDING_SUSPENSE_HOOK_PATTERN,
  SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN,
  SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN,
  SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN,
  SERIAL_EXPECTATION_SETUP_PATTERN,
  SERIAL_PAYOFF_RELEASE_PATTERN,
  SERIAL_MAINLINE_CLOSURE_PATTERN,
  SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN,
  SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN,
  SERIAL_UPGRADE_REWARD_POINT_PATTERN,
  SERIAL_ROMANCE_CONTEXT_PATTERN,
  SERIAL_ROMANCE_TENSION_LAYER_PATTERN,
  SERIAL_ROMANCE_CAREER_BINDING_PATTERN,
  SERIAL_TRUMP_CARD_RELEASE_PATTERN,
  SERIAL_TRUMP_CARD_RESERVE_PATTERN,
  SERIAL_TRUMP_CARD_DEPLETION_PATTERN,
  SERIAL_SHOWDOWN_CONTEXT_PATTERN,
  SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_BURST_PATTERN,
  SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN,
  SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN,
  SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN,
  SERIAL_CHARACTER_ACTION_PATTERN,
  SERIAL_PLOT_CONVENIENCE_PATTERN,
  SERIAL_CHARACTER_MOTIVATION_PATTERN,
  SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN,
  SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN,
  SERIAL_TEXTURE_NEGATION_PATTERN,
  SERIAL_MOMENTUM_GOAL_ADVANCE_PATTERN,
  SERIAL_MOMENTUM_OBSTACLE_ESCALATION_PATTERN,
  SERIAL_MOMENTUM_NEW_INFO_PATTERN,
} from './serial-momentum-patterns'

import {
  serialChapterText,
  serialChapterBlueprintForLines,
  serialChapterReaderPayoffText,
  serialChapterRawContextTarget
} from './serial-momentum-chapter-states-core'

export function serialChapterExpectationChainState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const expectationContract = chapter?.expectation_threshold_contract
    || chapter?.expectationThresholdContract
    || rawPayload?.expectation_threshold_contract
    || rawPayload?.expectationThresholdContract
    || preDraftBrief?.expectation_threshold_contract
    || preDraftBrief?.expectationThresholdContract
    || chapterTarget?.expectation_threshold_contract
    || chapterTarget?.expectationThresholdContract
    || blueprint?.expectation_threshold_contract
    || blueprint?.expectationThresholdContract
    || {}
  const suspenseContract = chapter?.suspense_contract
    || chapter?.suspenseContract
    || rawPayload?.suspense_contract
    || rawPayload?.suspenseContract
    || preDraftBrief?.suspense_contract
    || preDraftBrief?.suspenseContract
    || chapterTarget?.suspense_contract
    || chapterTarget?.suspenseContract
    || blueprint?.suspense_contract
    || blueprint?.suspenseContract
    || {}
  const expectationChain = suspenseContract?.expectation_chain || suspenseContract?.expectationChain || {}
  const resolutionText = compactBriefText([
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
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    expectationContract?.current_expectations,
    expectationContract?.currentExpectations,
    expectationContract?.payoff_or_delay_plan,
    expectationContract?.payoffOrDelayPlan,
    suspenseContract?.expectation_layers,
    suspenseContract?.expectationLayers,
    expectationChain?.active_lines,
    expectationChain?.activeLines,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const openLoopText = compactBriefText([
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.ending,
    expectationContract?.next_open_loop,
    expectationContract?.nextOpenLoop,
    expectationContract?.open_loop,
    expectationContract?.openLoop,
    expectationContract?.vacuum_guardrails,
    expectationContract?.vacuumGuardrails,
    expectationChain?.next_open_loop,
    expectationChain?.nextOpenLoop,
    expectationChain?.carry_rules,
    expectationChain?.carryRules,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN.lastIndex = 0
  const hasBreak = Boolean(resolutionText && SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN.test(resolutionText))
  return {
    has_expectation_resolution: Boolean(resolutionText && SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN.test(resolutionText)),
    has_expectation_break: hasBreak,
    has_next_open_loop: Boolean(openLoopText && !hasBreak && SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN.test(openLoopText)),
  }
}

export function serialChapterExpectationPayoffSetupState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const setupText = compactBriefText([
    blueprint?.expectation_setup,
    blueprint?.expectationSetup,
    blueprint?.setup,
    blueprint?.setup_beats,
    blueprint?.setupBeats,
    blueprint?.pressure_setup,
    blueprint?.pressureSetup,
    blueprint?.suspense_setup,
    blueprint?.suspenseSetup,
    storyLoop?.setup,
    storyLoop?.escalation,
    outline?.cause,
    outline?.development,
    outline?.turn,
    plotLines?.logic_line,
    plotLines?.logicLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.setup,
      scene?.expectation_setup,
      scene?.expectationSetup,
      scene?.pressure_setup,
      scene?.pressureSetup,
      scene?.conflict,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.information_gap,
      scene?.informationGap,
      scene?.required_beats,
      scene?.requiredBeats,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const payoffText = compactBriefText([
    blueprint?.core_payoff,
    blueprint?.corePayoff,
    blueprint?.reader_payoff,
    blueprint?.readerPayoff,
    storyLoop?.payoff,
    outline?.climax,
    outline?.ending,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    preDraftBrief?.reader_payoff,
    preDraftBrief?.readerPayoff,
    serialChapterReaderPayoffText(chapter),
    ...sceneCards.flatMap((scene: any) => [
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.reader_reward,
      scene?.readerReward,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_SETUP_PATTERN.lastIndex = 0
  SERIAL_PAYOFF_RELEASE_PATTERN.lastIndex = 0
  const setupChars = countProseChars(setupText)
  const payoffChars = countProseChars(payoffText)
  const hasSetupSignal = SERIAL_EXPECTATION_SETUP_PATTERN.test(setupText)
  const hasPayoffRelease = Boolean(payoffText && (outline?.climax || SERIAL_PAYOFF_RELEASE_PATTERN.test(payoffText)))
  return {
    has_payoff_release: hasPayoffRelease,
    has_setup_signal: hasSetupSignal,
    setup_chars: setupChars,
    payoff_chars: payoffChars,
    has_setup_before_payoff: Boolean(hasPayoffRelease && hasSetupSignal && setupChars >= payoffChars),
  }
}

export function serialChapterDeceptiveMainlineState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || preDraftBrief?.ending_contract || preDraftBrief?.endingContract || {}
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
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
    plotLines?.logic_line,
    plotLines?.logicLine,
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    endingContract?.next_chapter_pull,
    endingContract?.nextChapterPull,
    endingContract?.unresolved_question,
    endingContract?.unresolvedQuestion,
    chapterTarget?.mainline,
    chapterTarget?.main_line,
    chapterTarget?.mainLine,
    chapterTarget?.long_term_goal,
    chapterTarget?.longTermGoal,
    preDraftBrief?.mainline,
    preDraftBrief?.main_line,
    preDraftBrief?.mainLine,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_MAINLINE_CLOSURE_PATTERN.lastIndex = 0
  SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN.lastIndex = 0
  return {
    has_mainline_closure: Boolean(text && SERIAL_MAINLINE_CLOSURE_PATTERN.test(text)),
    has_deceptive_handoff: Boolean(text && SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN.test(text)),
  }
}

export function serialChapterUpgradeRewardPointState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const upgradeRhythmContract = chapter?.upgrade_rhythm_contract
    || chapter?.upgradeRhythmContract
    || rawPayload?.upgrade_rhythm_contract
    || rawPayload?.upgradeRhythmContract
    || preDraftBrief?.upgrade_rhythm_contract
    || preDraftBrief?.upgradeRhythmContract
    || chapterTarget?.upgrade_rhythm_contract
    || chapterTarget?.upgradeRhythmContract
    || blueprint?.upgrade_rhythm_contract
    || blueprint?.upgradeRhythmContract
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
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
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
    plotLines?.growth_line,
    plotLines?.growthLine,
    plotLines?.upgrade_line,
    plotLines?.upgradeLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    upgradeRhythmContract?.upgrade_gap,
    upgradeRhythmContract?.upgradeGap,
    upgradeRhythmContract?.upgrade_gain_plan,
    upgradeRhythmContract?.upgradeGainPlan,
    upgradeRhythmContract?.feedback_loop,
    upgradeRhythmContract?.feedbackLoop,
    upgradeRhythmContract?.bridge_rhythm,
    upgradeRhythmContract?.bridgeRhythm,
    chapterTarget?.upgrade_goal,
    chapterTarget?.upgradeGoal,
    chapterTarget?.growth_goal,
    chapterTarget?.growthGoal,
    preDraftBrief?.upgrade_goal,
    preDraftBrief?.upgradeGoal,
    preDraftBrief?.growth_goal,
    preDraftBrief?.growthGoal,
    ...sceneCards.flatMap((scene: any) => [
      scene?.goal,
      scene?.purpose,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.state_change,
      scene?.stateChange,
      scene?.reward,
      scene?.gain,
      scene?.upgrade,
      scene?.recognition,
      scene?.reveal,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_UPGRADE_REWARD_POINT_PATTERN.lastIndex = 0
  return {
    has_upgrade_context: Boolean(text && SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN.test(text)),
    has_reward_point: Boolean(text && SERIAL_UPGRADE_REWARD_POINT_PATTERN.test(text)),
  }
}

export function serialChapterRomanceTensionState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const femaleAudienceContract = chapter?.female_audience_contract
    || chapter?.femaleAudienceContract
    || rawPayload?.female_audience_contract
    || rawPayload?.femaleAudienceContract
    || preDraftBrief?.female_audience_contract
    || preDraftBrief?.femaleAudienceContract
    || chapterTarget?.female_audience_contract
    || chapterTarget?.femaleAudienceContract
    || blueprint?.female_audience_contract
    || blueprint?.femaleAudienceContract
    || {}
  const characterRelationContract = chapter?.character_relation_contract
    || chapter?.characterRelationContract
    || rawPayload?.character_relation_contract
    || rawPayload?.characterRelationContract
    || preDraftBrief?.character_relation_contract
    || preDraftBrief?.characterRelationContract
    || chapterTarget?.character_relation_contract
    || chapterTarget?.characterRelationContract
    || blueprint?.character_relation_contract
    || blueprint?.characterRelationContract
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
    chapter?.ending_hook,
    chapter?.endingHook,
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
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.romance_line,
    plotLines?.romanceLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    femaleAudienceContract?.romance_axis_rules,
    femaleAudienceContract?.romanceAxisRules,
    femaleAudienceContract?.reader_need_rules,
    femaleAudienceContract?.readerNeedRules,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.romance_line,
    chapterTarget?.romanceLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.romance_line,
    preDraftBrief?.romanceLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.romance_beat,
      scene?.romanceBeat,
      scene?.emotional_turn,
      scene?.emotionalTurn,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ROMANCE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_ROMANCE_TENSION_LAYER_PATTERN.lastIndex = 0
  return {
    has_romance_context: Boolean(text && SERIAL_ROMANCE_CONTEXT_PATTERN.test(text)),
    has_tension_layer: Boolean(text && SERIAL_ROMANCE_TENSION_LAYER_PATTERN.test(text)),
  }
}

export function serialChapterRomanceCareerBindingState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const femaleAudienceContract = chapter?.female_audience_contract
    || chapter?.femaleAudienceContract
    || rawPayload?.female_audience_contract
    || rawPayload?.femaleAudienceContract
    || preDraftBrief?.female_audience_contract
    || preDraftBrief?.femaleAudienceContract
    || chapterTarget?.female_audience_contract
    || chapterTarget?.femaleAudienceContract
    || blueprint?.female_audience_contract
    || blueprint?.femaleAudienceContract
    || {}
  const characterRelationContract = chapter?.character_relation_contract
    || chapter?.characterRelationContract
    || rawPayload?.character_relation_contract
    || rawPayload?.characterRelationContract
    || preDraftBrief?.character_relation_contract
    || preDraftBrief?.characterRelationContract
    || chapterTarget?.character_relation_contract
    || chapterTarget?.characterRelationContract
    || blueprint?.character_relation_contract
    || blueprint?.characterRelationContract
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
    chapter?.ending_hook,
    chapter?.endingHook,
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
    plotLines?.career_line,
    plotLines?.careerLine,
    plotLines?.business_line,
    plotLines?.businessLine,
    plotLines?.growth_line,
    plotLines?.growthLine,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.romance_line,
    plotLines?.romanceLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    femaleAudienceContract?.romance_axis_rules,
    femaleAudienceContract?.romanceAxisRules,
    femaleAudienceContract?.career_axis_rules,
    femaleAudienceContract?.careerAxisRules,
    femaleAudienceContract?.reader_need_rules,
    femaleAudienceContract?.readerNeedRules,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterRelationContract?.career_linkage,
    characterRelationContract?.careerLinkage,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    chapterTarget?.mainline,
    chapterTarget?.main_line,
    chapterTarget?.mainLine,
    chapterTarget?.career_line,
    chapterTarget?.careerLine,
    chapterTarget?.business_line,
    chapterTarget?.businessLine,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.romance_line,
    chapterTarget?.romanceLine,
    preDraftBrief?.mainline,
    preDraftBrief?.main_line,
    preDraftBrief?.mainLine,
    preDraftBrief?.career_line,
    preDraftBrief?.careerLine,
    preDraftBrief?.business_line,
    preDraftBrief?.businessLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.romance_line,
    preDraftBrief?.romanceLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.mainline_change,
      scene?.mainlineChange,
      scene?.career_change,
      scene?.careerChange,
      scene?.business_change,
      scene?.businessChange,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.romance_beat,
      scene?.romanceBeat,
      scene?.emotional_turn,
      scene?.emotionalTurn,
      scene?.state_change,
      scene?.stateChange,
      scene?.consequence,
      scene?.result,
      scene?.reward,
      scene?.gain,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ROMANCE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_ROMANCE_CAREER_BINDING_PATTERN.lastIndex = 0
  return {
    has_romance_context: Boolean(text && SERIAL_ROMANCE_CONTEXT_PATTERN.test(text)),
    has_career_binding: Boolean(text && SERIAL_ROMANCE_CAREER_BINDING_PATTERN.test(text)),
  }
}

export function serialChapterStoryLoopContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.story_loop_contract
    || chapter?.storyLoopContract
    || rawPayload?.story_loop_contract
    || rawPayload?.storyLoopContract
    || rawPayload?.pre_draft_brief?.story_loop_contract
    || rawPayload?.preDraftBrief?.storyLoopContract
    || chapterTarget?.story_loop_contract
    || chapterTarget?.storyLoopContract
    || rawPayload?.context_package?.story_loop_contract
    || rawPayload?.contextPackage?.storyLoopContract
    || {}
}


