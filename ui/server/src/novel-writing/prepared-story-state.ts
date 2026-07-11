export type PreparedStoryStateFailure = {
  key: string
  message: string
  source: 'story_state'
  details?: any[]
}

export type PreparedStoryStateUpdate = {
  state_delta: Record<string, any>
  next_reference_config: Record<string, any>
  character_updates: any[]
  setting_updates: any[]
  storyline_updates: any[]
  sync_reports: Record<string, any>
  hard_failures: PreparedStoryStateFailure[]
  payload: Record<string, any>
}

const CURRENT_CHAPTER_HARD_SYNC_KEYS = [
  'character_state_delta_sync',
  'asset_state_delta_sync',
  'chapter_handoff_delta_sync',
  'timeline_delta_sync',
] as const

export function buildPreparedStoryStateHardFailures(
  syncReports: Record<string, any> = {},
  payloadDiagnostics: Record<string, any> = {},
): PreparedStoryStateFailure[] {
  const failures: PreparedStoryStateFailure[] = []
  if (payloadDiagnostics.invalid_payload) {
    failures.push({ key: 'story_state_invalid_payload', message: '故事状态更新返回了无效 payload/state_delta。', source: 'story_state' })
  }
  if (payloadDiagnostics.transport_incomplete) {
    failures.push({ key: 'story_state_transport_incomplete', message: '故事状态更新的模型传输不完整。', source: 'story_state' })
  }
  for (const key of CURRENT_CHAPTER_HARD_SYNC_KEYS) {
    const missed = Array.isArray(syncReports[key]?.missed) ? syncReports[key].missed : []
    if (missed.length) failures.push({ key, message: `本章计划的关键状态变化未记录：${key}`, source: 'story_state', details: missed })
  }
  const completeness = syncReports.state_delta_completeness
  const completenessMissed = [
    ...(Array.isArray(completeness?.blocking_missed) ? completeness.blocking_missed : []),
    ...(Array.isArray(completeness?.high_confidence_missed) ? completeness.high_confidence_missed : []),
    ...(Array.isArray(completeness?.missed) ? completeness.missed.filter((item: any) => item?.blocking === true) : []),
  ]
  if (completenessMissed.length > 0) {
    failures.push({ key: 'state_delta_completeness', message: '本章高置信状态变化未完整记录。', source: 'story_state', details: completenessMissed })
  }
  return failures
}
