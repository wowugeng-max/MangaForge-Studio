import {
  firstCompactText,
  firstSceneCardText,
} from './story-drive-basics'

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => String(value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean))).slice(0, limit)
}

export function normalizeStoryDriveBrief(value: any, sceneCards: any[] = []) {
  const raw = value?.story_drive_brief || value?.storyDriveBrief || value || {}
  const target = value?.chapter_target || value?.chapterTarget || value || {}
  const protagonistChoice = firstCompactText(
    raw.protagonist_choice,
    raw.protagonistChoice,
    raw.active_choice,
    raw.activeChoice,
    target.protagonist_choice,
    target.protagonistChoice,
    target.active_choice,
    target.activeChoice,
    target.main_character_choice,
    firstSceneCardText(sceneCards, ['protagonist_choice', 'active_choice', 'turning_point', 'turn', 'reversal']),
  )
  const choiceCost = firstCompactText(
    raw.choice_cost,
    raw.choiceCost,
    raw.cost,
    raw.consequence,
    raw.stakes,
    target.choice_cost,
    target.choiceCost,
    target.cost,
    target.consequence,
    target.stakes,
    firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
  )
  const stateChange = firstCompactText(
    raw.state_change,
    raw.stateChange,
    raw.exit_state,
    raw.exitState,
    target.state_change,
    target.stateChange,
    target.exit_state,
    target.exitState,
    target.chapter_state_change,
    firstSceneCardText(sceneCards, ['exit_state', 'state_change', 'result', 'scene_result']),
  )
  const obstacle = firstCompactText(
    raw.obstacle,
    raw.conflict,
    raw.core_conflict,
    raw.coreConflict,
    target.core_conflict,
    target.coreConflict,
    target.conflict,
    firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
  )
  const causalNextStep = firstCompactText(
    raw.causal_next_step,
    raw.causalNextStep,
    raw.next_step,
    raw.nextStep,
    raw.ending_hook,
    raw.endingHook,
    target.causal_next_step,
    target.causalNextStep,
    target.next_step,
    target.nextStep,
    target.ending_hook,
    target.endingHook,
    firstSceneCardText(sceneCards, ['causal_next_step', 'next_step', 'ending_hook', 'exit_hook']),
  )
  const requiredActions = uniqueBriefStrings(
    raw.required_actions
    || raw.requiredActions
    || [
      '把主角主动选择、明确阻碍、选择代价、状态变化和下一步因果写成可见事件。',
    ],
    6,
  )
  if (!protagonistChoice && !choiceCost && !stateChange && !obstacle && !causalNextStep) return null
  return {
    protagonist_choice: protagonistChoice,
    choice_cost: choiceCost,
    state_change: stateChange,
    obstacle,
    causal_next_step: causalNextStep,
    required_actions: requiredActions,
  }
}
