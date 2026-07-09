import {
  textHasSceneChange,
  textHasSceneGoal,
  textHasSceneObstacle,
} from './scene-action-scans'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

export function sceneCardGoalObstacleChangeGaps(scene: any = {}) {
  const goalText = [
    scene?.purpose,
    scene?.goal,
    scene?.scene_goal,
    scene?.sceneGoal,
    scene?.blocked_desire,
    scene?.blockedDesire,
    scene?.protagonist_agency_action,
    scene?.protagonistAgencyAction,
    scene?.beat,
    ...asArray(scene?.required_beats || scene?.requiredBeats),
    ...asArray(scene?.action_beats || scene?.actionBeats),
  ].map(assetText).filter(Boolean).join(' ')
  const obstacleText = [
    scene?.conflict,
    scene?.obstacle,
    scene?.rule_pressure,
    scene?.rulePressure,
    scene?.fear_point,
    scene?.fearPoint,
    scene?.information_gap,
    scene?.informationGap,
    scene?.opposing_force,
    scene?.opposingForce,
    scene?.no_exit_reason,
    scene?.noExitReason,
    scene?.boss_move,
    scene?.bossMove,
    scene?.rule_trigger,
    scene?.ruleTrigger,
  ].map(assetText).filter(Boolean).join(' ')
  const changeText = [
    scene?.turning_point,
    scene?.turningPoint,
    scene?.exit_state,
    scene?.exitState,
    scene?.event_value_change,
    scene?.eventValueChange,
    scene?.reader_payoff,
    scene?.readerPayoff,
    scene?.reversal,
    scene?.ending_hook_seed,
    scene?.endingHookSeed,
    ...asArray(scene?.state_changes_expected || scene?.stateChangesExpected),
    ...asArray(scene?.revealed_settings || scene?.revealedSettings),
  ].map(assetText).filter(Boolean).join(' ')
  const missing: string[] = []
  if (!textHasSceneGoal(goalText)) missing.push('目标')
  if (!textHasSceneObstacle(obstacleText)) missing.push('阻碍')
  if (!textHasSceneChange(changeText)) missing.push('变化')
  return missing
}

export function sceneCardConceptSearchText(card: any) {
  return [
    card?.title,
    card?.purpose,
    card?.conflict,
    card?.conflict_ladder_step,
    card?.motivation_source,
    card?.opposing_force,
    card?.blocked_desire,
    card?.protagonist_agency_action,
    card?.no_exit_reason,
    card?.event_value_change,
    card?.next_conflict_seed,
    card?.visible_line_role,
    card?.hidden_line_seed,
    card?.ab_weave_role,
    card?.beat,
    card?.opening_hook,
    card?.reader_payoff,
    card?.fear_point,
    card?.rule_pressure,
    card?.information_gap,
    card?.reversal,
    card?.ending_hook_seed,
    card?.character_voice,
    card?.key_dialogue,
    card?.dialogue_goal,
    card?.sensory_anchor,
    card?.turning_point,
    card?.exit_state,
    card?.emotional_arc_stage,
    card?.reader_emotion_goal,
    card?.reaction_structure,
    card?.expectation_bridge,
    ...asArray(card?.purpose_tags),
    ...asArray(card?.required_beats),
    ...asArray(card?.action_beats),
    ...asArray(card?.required_information),
    ...asArray(card?.used_settings),
    ...asArray(card?.revealed_settings),
    ...asArray(card?.ability_beats),
    ...asArray(card?.item_beats),
    ...asArray(card?.state_changes_expected),
  ]
    .map((item: any) => String(item || ''))
    .filter(Boolean)
    .join('\n')
}

export function sceneCardMentionsConcept(card: any, name: string) {
  const text = sceneCardConceptSearchText(card)
  if (!text || !name) return false
  return text.includes(name) || text.toLowerCase().includes(name.toLowerCase())
}
