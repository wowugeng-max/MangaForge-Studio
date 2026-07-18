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

function serialChapterShowdownContract(chapter: any, blueprint: any = null) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return chapter?.showdown_contract
    || chapter?.showdownContract
    || rawPayload?.showdown_contract
    || rawPayload?.showdownContract
    || rawPayload?.pre_draft_brief?.showdown_contract
    || rawPayload?.pre_draft_brief?.showdownContract
    || rawPayload?.preDraftBrief?.showdown_contract
    || rawPayload?.preDraftBrief?.showdownContract
    || rawPayload?.context_package?.chapter_target?.showdown_contract
    || rawPayload?.context_package?.chapter_target?.showdownContract
    || rawPayload?.context_package?.chapterTarget?.showdown_contract
    || rawPayload?.context_package?.chapterTarget?.showdownContract
    || rawPayload?.contextPackage?.chapter_target?.showdown_contract
    || rawPayload?.contextPackage?.chapter_target?.showdownContract
    || rawPayload?.contextPackage?.chapterTarget?.showdown_contract
    || rawPayload?.contextPackage?.chapterTarget?.showdownContract
    || blueprint?.showdown_contract
    || blueprint?.showdownContract
    || {}
}

export function serialChapterTrumpCardReserveState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const showdownContract = serialChapterShowdownContract(chapter, blueprint)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    serialChapterText(chapter),
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
    showdownContract?.payoff_release_rules,
    showdownContract?.payoffReleaseRules,
    showdownContract?.trump_card_reserve_rules,
    showdownContract?.trumpCardReserveRules,
    showdownContract?.quality_checks,
    showdownContract?.qualityChecks,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.trump_card,
      scene?.trumpCard,
      scene?.reserve,
      scene?.backhand,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_TRUMP_CARD_RELEASE_PATTERN.lastIndex = 0
  SERIAL_TRUMP_CARD_RESERVE_PATTERN.lastIndex = 0
  SERIAL_TRUMP_CARD_DEPLETION_PATTERN.lastIndex = 0
  const hasRelease = Boolean(text && SERIAL_TRUMP_CARD_RELEASE_PATTERN.test(text))
  const hasReserve = Boolean(text && SERIAL_TRUMP_CARD_RESERVE_PATTERN.test(text))
  const hasDepletion = Boolean(text && SERIAL_TRUMP_CARD_DEPLETION_PATTERN.test(text))
  return {
    has_trump_card_release: hasRelease,
    has_trump_card_reserve: hasReserve && !hasDepletion,
  }
}

export function serialChapterShowdownPressureShockState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const showdownContract = serialChapterShowdownContract(chapter, blueprint)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    serialChapterText(chapter),
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.showdown_line,
    plotLines?.showdownLine,
    plotLines?.payoff_line,
    plotLines?.payoffLine,
    showdownContract?.payoff_release_rules,
    showdownContract?.payoffReleaseRules,
    showdownContract?.three_pressure_shock_rules,
    showdownContract?.threePressureShockRules,
    showdownContract?.stage_chain_rules,
    showdownContract?.stageChainRules,
    showdownContract?.shock_chain_rules,
    showdownContract?.shockChainRules,
    showdownContract?.quality_checks,
    showdownContract?.qualityChecks,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.showdown,
      scene?.shock_layers,
      scene?.shockLayers,
      scene?.pressure,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SHOWDOWN_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_BURST_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN.lastIndex = 0
  const hasFriendlyPressure = Boolean(text && SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN.test(text))
  const hasEnemyPressure = Boolean(text && SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN.test(text))
  const hasNeutralPressure = Boolean(text && SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN.test(text))
  const hasFriendlyShock = Boolean(text && SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN.test(text))
  const hasEnemyShock = Boolean(text && SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN.test(text))
  const hasNeutralShock = Boolean(text && SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN.test(text))
  return {
    has_showdown_context: Boolean(text && SERIAL_SHOWDOWN_CONTEXT_PATTERN.test(text)),
    has_pressure_shock_structure: Boolean(
      text
      && hasFriendlyPressure
      && hasEnemyPressure
      && hasNeutralPressure
      && SERIAL_SHOWDOWN_BURST_PATTERN.test(text)
      && hasFriendlyShock
      && hasEnemyShock
      && hasNeutralShock,
    ),
  }
}

export function serialChapterCharacterMotivationState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const characterBehaviorContract = chapter?.character_behavior_contract
    || chapter?.characterBehaviorContract
    || rawPayload?.character_behavior_contract
    || rawPayload?.characterBehaviorContract
    || preDraftBrief?.character_behavior_contract
    || preDraftBrief?.characterBehaviorContract
    || chapterTarget?.character_behavior_contract
    || chapterTarget?.characterBehaviorContract
    || blueprint?.character_behavior_contract
    || blueprint?.characterBehaviorContract
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
    plotLines?.character_line,
    plotLines?.characterLine,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    characterBehaviorContract?.motivation_chain,
    characterBehaviorContract?.motivationChain,
    characterBehaviorContract?.motivation_specificity_rules,
    characterBehaviorContract?.motivationSpecificityRules,
    characterBehaviorContract?.behavior_rules,
    characterBehaviorContract?.behaviorRules,
    characterBehaviorContract?.quality_checks,
    characterBehaviorContract?.qualityChecks,
    chapterTarget?.character_line,
    chapterTarget?.characterLine,
    preDraftBrief?.character_line,
    preDraftBrief?.characterLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.motivation,
      scene?.motive,
      scene?.cause,
      scene?.constraint,
      scene?.cost,
      scene?.risk,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_CHARACTER_ACTION_PATTERN.lastIndex = 0
  SERIAL_PLOT_CONVENIENCE_PATTERN.lastIndex = 0
  SERIAL_CHARACTER_MOTIVATION_PATTERN.lastIndex = 0
  return {
    has_character_action: Boolean(text && SERIAL_CHARACTER_ACTION_PATTERN.test(text)),
    has_plot_convenience: Boolean(text && SERIAL_PLOT_CONVENIENCE_PATTERN.test(text)),
    has_motivation_chain: Boolean(text && SERIAL_CHARACTER_MOTIVATION_PATTERN.test(text)),
  }
}

export function serialChapterSupportingAgencyState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
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
  const characterBehaviorContract = chapter?.character_behavior_contract
    || chapter?.characterBehaviorContract
    || rawPayload?.character_behavior_contract
    || rawPayload?.characterBehaviorContract
    || preDraftBrief?.character_behavior_contract
    || preDraftBrief?.characterBehaviorContract
    || chapterTarget?.character_behavior_contract
    || chapterTarget?.characterBehaviorContract
    || blueprint?.character_behavior_contract
    || blueprint?.characterBehaviorContract
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
    plotLines?.character_line,
    plotLines?.characterLine,
    plotLines?.subplot,
    plotLines?.sub_line,
    plotLines?.subLine,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.important_relationships,
    characterRelationContract?.importantRelationships,
    characterRelationContract?.independent_goals,
    characterRelationContract?.independentGoals,
    characterRelationContract?.relationship_life_rules,
    characterRelationContract?.relationshipLifeRules,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterBehaviorContract?.motivation_chain,
    characterBehaviorContract?.motivationChain,
    characterBehaviorContract?.supporting_role_functions,
    characterBehaviorContract?.supportingRoleFunctions,
    characterBehaviorContract?.antagonist_logic,
    characterBehaviorContract?.antagonistLogic,
    characterBehaviorContract?.antagonist_self_story_rules,
    characterBehaviorContract?.antagonistSelfStoryRules,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.character_line,
    chapterTarget?.characterLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.character_line,
    preDraftBrief?.characterLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.stakeholder,
      scene?.motivation,
      scene?.motive,
      scene?.position,
      scene?.stance,
      scene?.interest,
      scene?.cost,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN.lastIndex = 0
  SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN.lastIndex = 0
  return {
    has_supporting_activity: Boolean(text && SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN.test(text)),
    has_supporting_agency: Boolean(text && SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN.test(text)),
  }
}
