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
  serialPositivePatternTest,
} from './serial-momentum-chapter-states-shared'

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

