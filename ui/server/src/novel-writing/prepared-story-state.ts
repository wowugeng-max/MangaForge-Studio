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
  receipt_binding?: {
    key: string
    chapter_id: number
    candidate_hash: string
    source_run_id: number | null
  }
}

function boundedPendingError(error: any) {
  if (error === undefined || error === null) return ''
  try {
    const message = typeof error === 'string' ? error : error?.message || String(error)
    return String(message || '').slice(0, 500)
  } catch {
    return 'Story State preparation failed.'
  }
}

export function buildPendingPreparedStoryStateUpdate(input: {
  reference_config?: Record<string, any>
  failures: PreparedStoryStateFailure[]
  error?: any
}): PreparedStoryStateUpdate {
  const hardFailures = Array.isArray(input?.failures) ? input.failures : []
  return {
    state_delta: {},
    next_reference_config: { ...(input?.reference_config || {}) },
    character_updates: [],
    setting_updates: [],
    storyline_updates: [],
    sync_reports: {},
    hard_failures: hardFailures,
    payload: {
      pending: true,
      skipped: true,
      error: boundedPendingError(input?.error),
      hard_failures: hardFailures,
    },
  }
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

const BLOCKING_PREPARED_STORY_STATE_KEYS = new Set([
  'story_state_invalid_payload',
  'story_state_transport_incomplete',
])

/** Failures that must stop persistence. Planned-delta misses remain hard for prose admission, but manual sync can still advance last_updated_chapter with soft warnings. */
export function isBlockingPreparedStoryStateFailure(failure: PreparedStoryStateFailure | null | undefined): boolean {
  const key = String(failure?.key || '')
  return BLOCKING_PREPARED_STORY_STATE_KEYS.has(key)
}

export function blockingPreparedStoryStateHardFailures(
  failures: PreparedStoryStateFailure[] = [],
): PreparedStoryStateFailure[] {
  return (Array.isArray(failures) ? failures : []).filter(isBlockingPreparedStoryStateFailure)
}

export function formatPreparedStoryStateFailureSummary(
  failures: PreparedStoryStateFailure[] = [],
  limit = 3,
): string {
  const messages = (Array.isArray(failures) ? failures : [])
    .map(item => String(item?.message || item?.key || '').trim())
    .filter(Boolean)
  if (!messages.length) return ''
  return messages.slice(0, Math.max(1, limit)).join('；')
}
