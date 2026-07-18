import { asArray } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { normalizeBeatCoolingType, inferBeatCoolingTypeFromText } from '../../novel-writing/beat-cooling-basics'
import { compactBriefText } from '../quality/text-utils'
import { inferEndingHookType } from './ending-hook-type'
import {
  SERIAL_CONFLICT_SIGNAL_PATTERN,
  SERIAL_CONFLICT_THRILL_BEAT_PATTERN,
  SERIAL_WEAK_CONFLICT_PATTERN,
  serialChapterBlueprintForLines,
  serialChapterBlueprintHasClimaxRewardClosure,
  serialChapterCharacterMotivationState,
  serialChapterCoreElementCombo,
  serialChapterCoreHookState,
  serialChapterDeceptiveMainlineState,
  serialChapterDownwardRecoveryState,
  serialChapterEndingContractState,
  serialChapterEndingSuspenseState,
  serialChapterExpectationChainState,
  serialChapterExpectationLadderState,
  serialChapterExpectationPayoffSetupState,
  serialChapterForeshadowingState,
  serialChapterHasAftermath,
  serialChapterHasGoalObstacleOrInfoAdvance,
  serialChapterHasPayoff,
  serialChapterLineStaggerState,
  serialChapterNoExitGlueState,
  serialChapterProtagonistGoalState,
  serialChapterRawContextTarget,
  serialChapterReaderNeedCoverageState,
  serialChapterReaderPayoffText,
  serialChapterRomanceCareerBindingState,
  serialChapterRomanceTensionState,
  serialChapterShowdownPressureShockState,
  serialChapterSocialNetworkState,
  serialChapterSupportingAgencyState,
  serialChapterText,
  serialChapterTextureBeatState,
  serialChapterTrumpCardReserveState,
  serialChapterUpgradeRewardPointState,
  serialChapterUpperStatusState,
  serialChapterWorldExpansionState,
} from './serial-momentum'

export function serialFiveChapterTextureGap(chapters: any[]) {
  if (chapters.length < 5) return null
  const recentFive = chapters.slice(-5)
  const hasTextureBeat = recentFive.some((chapter: any) => serialChapterTextureBeatState(chapter).has_texture_beat)
  return hasTextureBeat ? null : recentFive
}

function serialChapterCoolingBeatType(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
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
  if (explicitBeatType) return explicitBeatType

  const textureState = serialChapterTextureBeatState(chapter)
  if (textureState.has_texture_beat) return textureState.beat_type

  const text = compactBriefText([
    chapter?.title,
    rawPayload?.title,
    serialChapterText(chapter),
  ].filter(Boolean).join('。'))
  SERIAL_CONFLICT_THRILL_BEAT_PATTERN.lastIndex = 0
  if (SERIAL_CONFLICT_THRILL_BEAT_PATTERN.test(text)) return 'conflict_thrill'
  return inferBeatCoolingTypeFromText(text)
}

export function serialConflictThrillOverrun(chapters: any[]) {
  const tailConflictRun: any[] = []
  for (let index = chapters.length - 1; index >= 0; index -= 1) {
    if (serialChapterCoolingBeatType(chapters[index]) !== 'conflict_thrill') break
    tailConflictRun.unshift(chapters[index])
  }
  return tailConflictRun.length > 2 ? tailConflictRun : null
}

export function serialRepeatedCoreElementComboRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; combo: any }>> = []
  let current: Array<{ chapter: any; combo: any }> = []
  for (const chapter of chapters) {
    const combo = serialChapterCoreElementCombo(chapter)
    if (!combo) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].combo.key === combo.key) {
      current.push({ chapter, combo })
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = [{ chapter, combo }]
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialCoreHookAbsenceGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCoreHookState(chapter)
    if (state.has_core_hook_contract && !state.has_core_hook_delivery) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialCoreHookAngleRepetitionGapRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; angle: string }>> = []
  let current: Array<{ chapter: any; angle: string }> = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCoreHookState(chapter)
    const angle = compactBriefText(state.core_hook_angle)
    if (!state.has_core_hook_contract || !state.has_core_hook_delivery || !angle) {
      if (current.length >= 3) runs.push(current)
      current = []
      return
    }
    if (!current.length || current[current.length - 1].angle === angle) {
      current.push({ chapter, angle })
      return
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, angle }]
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialWorldExpansionStallGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterWorldExpansionState(chapter)
    if (state.has_world_expansion_contract && !state.has_world_expansion_signal) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialReaderNeedCoverageGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterReaderNeedCoverageState(chapter)
    if (state.has_reader_need_contract && !state.has_reader_need_signal) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialExpectationLadderGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationLadderState(chapter)
    if (state.has_expectation_ladder_contract && (!state.has_short_expectation || !state.has_medium_expectation || !state.has_long_expectation)) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialForeshadowingStallGapRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; label: string }>> = []
  let current: Array<{ chapter: any; label: string }> = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterForeshadowingState(chapter)
    const label = compactBriefText(state.foreshadowing_label)
    if (!state.has_foreshadowing_contract || !label || state.has_foreshadowing_progress) {
      if (current.length >= 3) runs.push(current)
      current = []
      return
    }
    if (!current.length || current[current.length - 1].label === label) {
      current.push({ chapter, label })
      return
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, label }]
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialBlueprintClimaxRewardGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterBlueprintHasClimaxRewardClosure(chapter)
    if (state.has_outline_contract && !state.has_closure) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialEndingHarvestHandoffGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterEndingContractState(chapter)
    if (state.has_ending_contract && !state.has_complete_handoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialEndingSuspenseHookGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterEndingSuspenseState(chapter)
    if (state.has_ending_text && !state.has_suspense_hook && state.has_safe_closure) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialExpectationChainBreakGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationChainState(chapter)
    if (state.has_expectation_resolution && state.has_expectation_break && !state.has_next_open_loop) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialExpectationPayoffSetupGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationPayoffSetupState(chapter)
    if (state.has_payoff_release && !state.has_setup_before_payoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialDeceptiveMainlineHandoffGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterDeceptiveMainlineState(chapter)
    if (state.has_mainline_closure && !state.has_deceptive_handoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialUpgradeRewardPointGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterUpgradeRewardPointState(chapter)
    if (state.has_upgrade_context && !state.has_reward_point) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialRomanceTensionLayerGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterRomanceTensionState(chapter)
    if (state.has_romance_context && !state.has_tension_layer) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialRomanceCareerBindingGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterRomanceCareerBindingState(chapter)
    if (state.has_romance_context && !state.has_career_binding) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialTrumpCardReserveGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterTrumpCardReserveState(chapter)
    if (state.has_trump_card_release && !state.has_trump_card_reserve) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialShowdownPressureShockGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterShowdownPressureShockState(chapter)
    if (state.has_showdown_context && !state.has_pressure_shock_structure) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialCharacterMotivationChainGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCharacterMotivationState(chapter)
    if (state.has_character_action && state.has_plot_convenience && !state.has_motivation_chain) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialSupportingCharacterAgencyGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterSupportingAgencyState(chapter)
    if (state.has_supporting_activity && !state.has_supporting_agency) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialConflictNoExitGlueGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterNoExitGlueState(chapter)
    if (state.has_conflict && !state.has_no_exit_glue) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialSocialNetworkBlankRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterSocialNetworkState(chapter)
    if (!state.has_social_interaction) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialUpperStatusContactGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterUpperStatusState(chapter)
    if (state.has_status_ladder_context && !state.has_upper_status_contact) {
      current.push(chapter)
      return
    }
    if (current.length >= 4) runs.push(current)
    current = []
  })
  if (current.length >= 4) runs.push(current)
  return runs
}

export function serialDownwardPressureRecoveryGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterDownwardRecoveryState(chapter)
    if (state.has_downward_pressure && !state.has_recovery) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialProtagonistGoalContinuityGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterProtagonistGoalState(chapter)
    if (state.has_goal_contract && (!state.has_current_goal || !state.has_long_goal)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialLineStaggerFlatlineRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterLineStaggerState(chapter)
    if (state.has_line_contract && !state.mainline_active && !state.subplot_active) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialChapterReaderPayoffType(chapter: any) {
  const text = serialChapterReaderPayoffText(chapter)
  if (!text) return ''
  if (/公开打脸|打脸|当众[^。！？!?；;]{0,40}(?:改口|低头|失态|反证|揭穿|震惊)|(?:全场|围观|旁观)[^。！？!?；;]{0,20}震惊/.test(text)) return '公开打脸'
  if (/能力升级|升级|突破|觉醒|新能力|新技能|境界/.test(text)) return '能力升级'
  if (/资源收益|获得|拿到|夺回|奖励|收益|名额|资格|道具|旧印|灵石/.test(text)) return '资源收益'
  if (/关系回报|认可|信任|倒向|倒戈|盟友|态度改变|担保|站到主角/.test(text)) return '关系回报'
  if (/信息解锁|解锁|发现|揭开|确认|线索|证据|真相|记录|名册|账册|名单/.test(text)) return '信息解锁'
  if (/阶段结算|结算|收束|完成阶段|通过考核|晋级|阶段性/.test(text)) return '阶段结算'
  if (/反制|反杀|翻盘|压制|推翻|洗清/.test(text)) return '反制翻盘'
  return ''
}

export function serialRepeatedReaderPayoffTypeRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; payoff_type: string }>> = []
  let current: Array<{ chapter: any; payoff_type: string }> = []
  for (const chapter of chapters) {
    const payoffType = serialChapterReaderPayoffType(chapter)
    if (!payoffType) {
      if (current.length >= 3) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].payoff_type === payoffType) {
      current.push({ chapter, payoff_type: payoffType })
      continue
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, payoff_type: payoffType }]
  }
  if (current.length >= 3) runs.push(current)
  return runs
}

export function serialPayoffWithoutAftermathRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (serialChapterHasPayoff(chapter) && !serialChapterHasAftermath(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialChapterProseCharCount(chapter: any) {
  const prose = String(chapter?.chapter_text || chapter?.chapterText || '')
  if (prose.trim()) return countProseChars(prose)
  return countProseChars(serialChapterText(chapter))
}

function serialChapterHasWeakConflict(chapter: any) {
  const conflict = compactBriefText(chapter?.conflict || chapter?.chapter_conflict || chapter?.conflict_summary)
  const text = serialChapterText(chapter)
  SERIAL_WEAK_CONFLICT_PATTERN.lastIndex = 0
  SERIAL_CONFLICT_SIGNAL_PATTERN.lastIndex = 0
  if (!conflict) return true
  if (SERIAL_WEAK_CONFLICT_PATTERN.test(conflict)) return true
  return !SERIAL_CONFLICT_SIGNAL_PATTERN.test(`${conflict}。${text}`)
}

function serialChapterEndingHookType(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const explicitType = compactBriefText(
    chapter?.chapter_hook_contract?.ending_hook_type
    || chapter?.chapterHookContract?.endingHookType
    || rawPayload?.chapter_hook_contract?.ending_hook_type
    || rawPayload?.chapterHookContract?.endingHookType
    || rawPayload?.pre_draft_brief?.chapter_hook_contract?.ending_hook_type
    || rawPayload?.preDraftBrief?.chapterHookContract?.endingHookType
    || chapterTarget?.chapter_hook_contract?.ending_hook_type
    || chapterTarget?.chapterHookContract?.endingHookType
    || rawPayload?.pre_draft_brief?.page_turn_hook_brief?.hook_type
    || rawPayload?.preDraftBrief?.pageTurnHookBrief?.hookType
    || chapterTarget?.page_turn_hook_brief?.hook_type
    || chapterTarget?.pageTurnHookBrief?.hookType,
  )
  if (explicitType) return explicitType
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.generated_scene_breakdown || rawPayload?.generatedSceneBreakdown),
  ]
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const endingText = [
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    lastScene?.ending_hook_seed,
    lastScene?.endingHookSeed,
    lastScene?.ending_hook,
    lastScene?.endingHook,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
  return endingText ? inferEndingHookType(endingText) : ''
}

export function serialRepeatedEndingHookTypeRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; hook_type: string }>> = []
  let current: Array<{ chapter: any; hook_type: string }> = []
  for (const chapter of chapters) {
    const hookType = serialChapterEndingHookType(chapter)
    if (!hookType) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].hook_type === hookType) {
      current.push({ chapter, hook_type: hookType })
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = [{ chapter, hook_type: hookType }]
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialChapterRangeLabel(chapters: any[]) {
  const nums = chapters.map((chapter: any) => Number(chapter?.chapter_no || chapter?.chapterNo || 0)).filter(Boolean)
  if (!nums.length) return ''
  return `第${Math.min(...nums)}-${Math.max(...nums)}章`
}

export function serialWeakConflictRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (serialChapterHasWeakConflict(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function serialTwoChapterMomentumStallRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (!serialChapterHasGoalObstacleOrInfoAdvance(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

