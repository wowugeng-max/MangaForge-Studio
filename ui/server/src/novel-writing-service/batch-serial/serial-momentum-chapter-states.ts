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

export function serialChapterText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const scenePayoffs = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
  ].map((scene: any) => scene?.reader_payoff || scene?.readerPayoff || scene?.payoff)
  return [
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    chapter?.payoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    rawPayload?.payoff,
    ...scenePayoffs,
    chapter?.chapter_text ? compactText(chapter.chapter_text, 260) : '',
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
}

export function serialChapterReaderPayoffText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const scenePayoffs = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ].flatMap((scene: any) => [
    scene?.reader_payoff,
    scene?.readerPayoff,
    scene?.payoff,
    scene?.reader_reward,
    scene?.purpose_tag,
    scene?.purposeTag,
    scene?.purpose,
  ])
  return [
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    chapter?.payoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    rawPayload?.payoff,
    rawPayload?.pre_draft_brief?.reader_payoff,
    rawPayload?.preDraftBrief?.readerPayoff,
    ...scenePayoffs,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
}

export function serialChapterHasProgress(chapter: any) {
  const text = serialChapterText(chapter)
  SERIAL_PROGRESS_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_PROGRESS_SIGNAL_PATTERN.test(text)
}

export function serialChapterHasPayoff(chapter: any) {
  const text = serialChapterText(chapter)
  SERIAL_PAYOFF_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_PAYOFF_SIGNAL_PATTERN.test(text)
}

export function serialChapterHasAftermath(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const sceneAftermath = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ].flatMap((scene: any) => [
    scene?.aftermath,
    scene?.aftermath_brief,
    scene?.aftermathBrief,
    scene?.state_change,
    scene?.stateChange,
    scene?.relation_change,
    scene?.relationChange,
    scene?.foreshadowing,
    scene?.next_goal,
    scene?.nextGoal,
  ])
  const text = [
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.pre_draft_brief?.aftermath,
    rawPayload?.preDraftBrief?.aftermath,
    rawPayload?.pre_draft_brief?.state_change,
    rawPayload?.preDraftBrief?.stateChange,
    rawPayload?.pre_draft_brief?.next_goal,
    rawPayload?.preDraftBrief?.nextGoal,
    ...sceneAftermath,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
  SERIAL_AFTERMATH_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_AFTERMATH_SIGNAL_PATTERN.test(text)
}

function serialChapterMomentumText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  return compactBriefText([
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
    plotLines?.logic_line,
    plotLines?.logicLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.clue,
      scene?.information_gain,
      scene?.informationGain,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
}

export function serialChapterHasGoalObstacleOrInfoAdvance(chapter: any) {
  const text = serialChapterMomentumText(chapter)
  return Boolean(
    serialPositivePatternTest(text, SERIAL_MOMENTUM_GOAL_ADVANCE_PATTERN)
    || serialPositivePatternTest(text, SERIAL_MOMENTUM_OBSTACLE_ESCALATION_PATTERN)
    || serialPositivePatternTest(text, SERIAL_MOMENTUM_NEW_INFO_PATTERN)
  )
}

export function serialChapterBlueprintForLines(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return chapter?.chapter_blueprint
    || chapter?.chapterBlueprint
    || rawPayload?.chapter_blueprint
    || rawPayload?.chapterBlueprint
    || rawPayload?.pre_draft_brief?.chapter_blueprint
    || rawPayload?.pre_draft_brief?.chapterBlueprint
    || rawPayload?.preDraftBrief?.chapter_blueprint
    || rawPayload?.preDraftBrief?.chapterBlueprint
    || rawPayload?.context_package?.chapter_target?.chapter_blueprint
    || rawPayload?.context_package?.chapter_target?.chapterBlueprint
    || rawPayload?.context_package?.chapterTarget?.chapter_blueprint
    || rawPayload?.context_package?.chapterTarget?.chapterBlueprint
    || rawPayload?.contextPackage?.chapter_target?.chapter_blueprint
    || rawPayload?.contextPackage?.chapter_target?.chapterBlueprint
    || rawPayload?.contextPackage?.chapterTarget?.chapter_blueprint
    || rawPayload?.contextPackage?.chapterTarget?.chapterBlueprint
    || rawPayload?.context_package?.chapter_blueprint
    || rawPayload?.context_package?.chapterBlueprint
    || rawPayload?.contextPackage?.chapter_blueprint
    || rawPayload?.contextPackage?.chapterBlueprint
    || {}
}

export function serialChapterRawContextTarget(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return {
    ...(rawPayload?.context_package?.chapterTarget || {}),
    ...(rawPayload?.contextPackage?.chapter_target || {}),
    ...(rawPayload?.contextPackage?.chapterTarget || {}),
    ...(rawPayload?.context_package?.chapter_target || {}),
  }
}

function serialChapterPlotLineText(chapter: any, keys: string[]) {
  const blueprint = serialChapterBlueprintForLines(chapter)
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  return compactBriefText(keys.map(key => plotLines?.[key]).filter(Boolean).join('。'))
}

function serialLineHasProgress(text: string) {
  const value = compactBriefText(text)
  if (!value) return false
  SERIAL_LINE_INACTIVE_PATTERN.lastIndex = 0
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.lastIndex = 0
  if (SERIAL_LINE_INACTIVE_PATTERN.test(value) && !SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.test(value)) return false
  SERIAL_PROGRESS_SIGNAL_PATTERN.lastIndex = 0
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.lastIndex = 0
  return SERIAL_PROGRESS_SIGNAL_PATTERN.test(value) || SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.test(value)
}

export function serialChapterLineStaggerState(chapter: any) {
  const mainlineText = serialChapterPlotLineText(chapter, ['mainline', 'main_line', 'mainLine'])
  const subplotText = serialChapterPlotLineText(chapter, ['subplot', 'sub_line', 'subLine', 'relationship_line', 'relationshipLine'])
  return {
    mainline_text: mainlineText,
    subplot_text: subplotText,
    has_line_contract: Boolean(mainlineText && subplotText),
    mainline_active: serialLineHasProgress(mainlineText),
    subplot_active: serialLineHasProgress(subplotText),
  }
}

function serialChapterBlueprintContentOutline(chapter: any) {
  const blueprint = serialChapterBlueprintForLines(chapter)
  return blueprint?.content_outline || blueprint?.contentOutline || {}
}

export function serialChapterBlueprintHasClimaxRewardClosure(chapter: any) {
  const outline = serialChapterBlueprintContentOutline(chapter)
  const cause = compactBriefText(outline?.cause)
  const development = compactBriefText(outline?.development)
  const climax = compactBriefText(outline?.climax || outline?.payoff || outline?.turning_point || outline?.turningPoint)
  const ending = compactBriefText(outline?.ending || outline?.result || outline?.reward || outline?.harvest)
  const hasOutlineContract = Boolean(cause || development || climax || ending)
  if (!hasOutlineContract) return { has_outline_contract: false, has_closure: true }
  const hasRewardClosure = /收获|拿到|获得|夺回|赢得|通过|改口|倒向|资格|回报|结算|阶段|下一目标|新目标|新风险|新代价|新门槛|打开|指向|留下下一/.test(ending)
  return {
    has_outline_contract: true,
    has_climax: Boolean(climax),
    has_reward_closure: hasRewardClosure,
    has_closure: Boolean(climax && hasRewardClosure),
  }
}

export function serialChapterEndingContractState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const preDraftEndingContract = preDraftBrief?.ending_contract || preDraftBrief?.endingContract || {}
  const ending = compactBriefText(outline?.ending || outline?.result || outline?.reward || outline?.harvest)
  const finalState = compactBriefText(endingContract?.final_state || endingContract?.finalState || preDraftEndingContract?.final_state || preDraftEndingContract?.finalState)
  const nextPull = compactBriefText(
    endingContract?.next_chapter_pull
    || endingContract?.nextChapterPull
    || endingContract?.unresolved_question
    || endingContract?.unresolvedQuestion
    || preDraftEndingContract?.next_chapter_pull
    || preDraftEndingContract?.nextChapterPull
    || preDraftEndingContract?.unresolved_question
    || preDraftEndingContract?.unresolvedQuestion,
  )
  const endingText = compactBriefText([
    ending,
    finalState ? `final_state：${finalState}` : '',
    nextPull ? `next_chapter_pull：${nextPull}` : '',
  ].filter(Boolean).join('。'))
  const hasEndingContract = Boolean(ending || finalState || nextPull)
  SERIAL_ENDING_HARVEST_PATTERN.lastIndex = 0
  SERIAL_ENDING_HANDOFF_PATTERN.lastIndex = 0
  const hasHarvest = Boolean(finalState || SERIAL_ENDING_HARVEST_PATTERN.test(endingText))
  const hasHandoff = Boolean(nextPull || SERIAL_ENDING_HANDOFF_PATTERN.test(endingText))
  return {
    has_ending_contract: hasEndingContract,
    has_harvest: hasHarvest,
    has_handoff: hasHandoff,
    has_complete_handoff: Boolean(hasHarvest && hasHandoff),
  }
}

export function serialChapterEndingSuspenseState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const endingContract = blueprint?.ending_contract
    || blueprint?.endingContract
    || rawPayload?.ending_contract
    || rawPayload?.endingContract
    || preDraftBrief?.ending_contract
    || preDraftBrief?.endingContract
    || chapterTarget?.ending_contract
    || chapterTarget?.endingContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const lastScene = sceneCards.length > 0 ? sceneCards[sceneCards.length - 1] : {}
  const endingText = compactBriefText([
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.ending_excerpt,
    chapter?.endingExcerpt,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.ending_excerpt,
    rawPayload?.endingExcerpt,
    outline?.ending,
    outline?.result,
    outline?.reward,
    endingContract?.next_chapter_pull,
    endingContract?.nextChapterPull,
    endingContract?.unresolved_question,
    endingContract?.unresolvedQuestion,
    chapterTarget?.ending_hook,
    chapterTarget?.endingHook,
    lastScene?.ending_hook,
    lastScene?.endingHook,
    lastScene?.ending_hook_seed,
    lastScene?.endingHookSeed,
    lastScene?.exit_state,
    lastScene?.exitState,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ENDING_SAFE_CLOSURE_PATTERN.lastIndex = 0
  SERIAL_ENDING_SUSPENSE_HOOK_PATTERN.lastIndex = 0
  return {
    has_ending_text: Boolean(endingText),
    has_safe_closure: Boolean(endingText && SERIAL_ENDING_SAFE_CLOSURE_PATTERN.test(endingText)),
    has_suspense_hook: Boolean(endingText && SERIAL_ENDING_SUSPENSE_HOOK_PATTERN.test(endingText)),
  }
}

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

export function serialPositivePatternTest(text: string, pattern: RegExp) {
  const chunks = compactBriefText(text)
    .split(/[。！？!?；;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
  return chunks.some(chunk => {
    pattern.lastIndex = 0
    SERIAL_TEXTURE_NEGATION_PATTERN.lastIndex = 0
    return pattern.test(chunk) && !SERIAL_TEXTURE_NEGATION_PATTERN.test(chunk)
  })
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


