import { safeJsonStringify } from '../novel-route-utils'
import { isChapterTaskId } from '../../novel-writing-service/generation-source/types'

export function stableStringify(value: any, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'bigint') return JSON.stringify(String(value))
  if (typeof value === 'function') return JSON.stringify('[Function]')
  if (Array.isArray(value)) {
    if (seen.has(value)) return JSON.stringify('[Circular]')
    seen.add(value)
    const text = `[${value.map(item => stableStringify(item, seen)).join(',')}]`
    seen.delete(value)
    return text
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return JSON.stringify('[Circular]')
    seen.add(value)
    const text = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',')}}`
    seen.delete(value)
    return text
  }
  return JSON.stringify(value)
}

export function runJson(value: any) {
  return safeJsonStringify(compactRunPayload(value), undefined, 0)
}

export function hashText(value: any) {
  const text = typeof value === 'string' ? value : stableStringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const RUN_STATE_TEXT_LIMIT = 700
const RUN_STATE_LONG_TEXT_LIMIT = 1400
const RUN_STATE_ARRAY_LIMIT = 20
const RUN_STATE_DEPTH_LIMIT = 6
const RUN_STATE_DROP_KEYS = new Set([
  'chapter_text',
  'chapterText',
  'final_text',
  'finalText',
  'revised_text',
  'revisedText',
  'full_text',
  'fullText',
  'context_package',
  'contextPackage',
  'paragraph_task',
  'paragraphTask',
  'prompt',
  'raw_prompt',
  'rawPrompt',
  'messages',
  'diagnostics',
  'debug',
  'raw',
])
const RUN_STATE_SCENE_KEYS = new Set([
  'scene_cards',
  'sceneCards',
  'scene_breakdown',
  'sceneBreakdown',
  'scene_list',
  'sceneList',
  'scenes',
])

export function compactRunStateText(value: any, limit = RUN_STATE_TEXT_LIMIT) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

export function compactRunSceneCard(item: any = {}) {
  if (!item || typeof item !== 'object') return compactRunStateText(item)
  return {
    scene_no: item.scene_no ?? item.sceneNo ?? null,
    title: compactRunStateText(item.title || item.name || '', 120),
    purpose: compactRunStateText(item.purpose || item.goal || item.scene_goal || item.sceneGoal || '', 240),
    conflict: compactRunStateText(item.conflict || item.obstacle || item.blocker || '', 260),
    change: compactRunStateText(item.change || item.state_change || item.stateChange || item.result || '', 240),
    status: item.status || item.scene_status || item.sceneStatus || undefined,
  }
}

export function compactRunStateValue(value: any, key = '', depth = 0, seen = new WeakSet<object>()): any {
  if (RUN_STATE_DROP_KEYS.has(key)) return undefined
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string') {
    const limit = ['error', 'summary', 'detail', 'evidence', 'fix', 'reason'].includes(key)
      ? RUN_STATE_LONG_TEXT_LIMIT
      : RUN_STATE_TEXT_LIMIT
    return compactRunStateText(value, limit)
  }
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return compactRunStateText(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= RUN_STATE_DEPTH_LIMIT) return '[CompactDepthLimit]'
  seen.add(value)
  if (Array.isArray(value)) {
    const source = RUN_STATE_SCENE_KEYS.has(key) ? value.map(compactRunSceneCard) : value
    const items = source
      .slice(0, RUN_STATE_ARRAY_LIMIT)
      .map(item => compactRunStateValue(item, '', depth + 1, seen))
      .filter(item => item !== undefined)
    if (source.length > RUN_STATE_ARRAY_LIMIT) items.push(`[Truncated ${source.length - RUN_STATE_ARRAY_LIMIT} items]`)
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    if (RUN_STATE_SCENE_KEYS.has(childKey) && Array.isArray(childValue)) {
      output[childKey] = childValue.slice(0, RUN_STATE_ARRAY_LIMIT).map(compactRunSceneCard)
      if (childValue.length > RUN_STATE_ARRAY_LIMIT) output[`${childKey}_truncated_count`] = childValue.length - RUN_STATE_ARRAY_LIMIT
      continue
    }
    const compacted = compactRunStateValue(childValue, childKey, depth + 1, seen)
    if (compacted !== undefined) output[childKey] = compacted
  }
  seen.delete(value)
  return output
}

export function compactRunConfigSnapshot(snapshot: any = {}) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot || null
  return compactRunStateValue(snapshot)
}

export function compactWarningList(value: any) {
  const source = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set<string>()
  return source
    .map(item => compactRunStateValue(item))
    .filter(item => item !== undefined && item !== null && item !== '')
    .filter(item => {
      const fingerprint = stableStringify(item)
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    })
    .slice(0, RUN_STATE_ARRAY_LIMIT)
}

export function collectChapterWarnings(chapterResult: any = {}, postDeliveryQuality: any = null) {
  const qualityWarnings = compactWarningList(chapterResult.quality_warnings || chapterResult.qualityWarnings)
  const postCommitWarnings = compactWarningList(chapterResult.post_commit_warnings || chapterResult.postCommitWarnings)
  const storyStateStatus = String(chapterResult.story_state_status || chapterResult.storyStateStatus || '')
  const storyStateWarning = chapterResult.story_state_warning || chapterResult.storyStateWarning
  const storyStateWarnings = storyStateStatus === 'pending' || storyStateWarning
    ? compactWarningList(storyStateWarning || { source: 'story_state', status: storyStateStatus || 'pending', message: 'Story State 同步待完成。' })
    : []
  const postDeliveryWarnings = compactWarningList(
    Array.isArray(postDeliveryQuality?.checks)
      ? postDeliveryQuality.checks
        .filter((check: any) => String(check?.status || '') !== 'ok')
        .map((check: any) => ({
          source: 'post_delivery_quality',
          code: check.key || 'open_check',
          status: check.status || 'warn',
          message: check.summary || `${check.label || check.key || '交付后检查'}未闭环。`,
        }))
      : [],
  )
  const warnings = compactWarningList([
    ...qualityWarnings,
    ...postCommitWarnings,
    ...storyStateWarnings,
    ...postDeliveryWarnings,
  ])
  return {
    quality_warnings: qualityWarnings,
    post_commit_warnings: postCommitWarnings,
    warnings,
    warning_count: warnings.length,
  }
}

export function compactRunStage(stage: any = {}) {
  if (!stage || typeof stage !== 'object') return stage
  return compactRunStateValue({
    key: stage.key,
    label: stage.label,
    status: stage.status,
    score: stage.score,
    phase: stage.phase,
    detail: stage.detail,
    error: stage.error,
    warnings: stage.warnings,
    blockers: stage.blockers,
    count: stage.count,
    word_count: stage.word_count,
    scene_status: stage.scene_status || stage.sceneStatus,
    quality_gate: stage.quality_gate || stage.qualityGate,
    scene_cards: stage.scene_cards || stage.sceneCards,
    updated_at: stage.updated_at || stage.updatedAt,
  })
}

export function compactRunChapterItem(item: any = {}) {
  if (!item || typeof item !== 'object') return item
  return compactRunStateValue({
    id: item.id,
    chapter_task_id: isChapterTaskId(item.chapter_task_id) ? item.chapter_task_id : undefined,
    chapter_id: item.chapter_id || item.chapterId,
    chapter_no: item.chapter_no ?? item.chapterNo,
    title: item.title,
    status: item.status,
    current_step: item.current_step || item.currentStep,
    current_label: item.current_label || item.currentLabel,
    score: item.score,
    revised: item.revised,
    attempts: item.attempts,
    approvals: compactRunStateValue(item.approvals || {}),
    admission_status: item.admission_status || item.admissionStatus,
    story_state_status: item.story_state_status || item.storyStateStatus,
    quality_warnings: compactWarningList(item.quality_warnings || item.qualityWarnings),
    warnings: compactWarningList(item.warnings),
    post_commit_warnings: compactWarningList(item.post_commit_warnings || item.postCommitWarnings),
    warning_count: item.warning_count ?? item.warningCount ?? 0,
    next_run_at: item.next_run_at ?? item.nextRunAt ?? '',
    approval_stage: item.approval_stage || item.approvalStage,
    approval_context: item.approval_context || item.approvalContext,
    error: item.error,
    error_code: item.error_code || item.errorCode,
    recovery_plan: item.recovery_plan || item.recoveryPlan,
    repair_fingerprint: item.repair_fingerprint || item.repairFingerprint,
    repair_run_id: item.repair_run_id || item.repairRunId,
    repair_queue: item.repair_queue || item.repairQueue,
    production_mode: item.production_mode || item.productionMode,
    config_snapshot: compactRunConfigSnapshot(item.config_snapshot || item.configSnapshot),
    scenes: Array.isArray(item.scenes) ? item.scenes.map(compactRunSceneCard) : [],
    stages: Array.isArray(item.stages) ? item.stages.map(compactRunStage) : [],
    post_delivery_quality: item.post_delivery_quality || item.postDeliveryQuality,
    started_at: item.started_at || item.startedAt,
    completed_at: item.completed_at || item.completedAt,
    failed_at: item.failed_at || item.failedAt,
    stopped_at: item.stopped_at || item.stoppedAt,
  })
}

export function compactRunPayload(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return compactRunStateValue(value)
  const chapters = Array.isArray(value.chapters) ? value.chapters.map(compactRunChapterItem) : []
  const results = Array.isArray(value.results) ? value.results.map(compactRunChapterItem) : []
  return compactRunStateValue({
    ...value,
    chapters,
    results,
    last_error: value.last_error || value.lastError ? compactRunChapterItem(value.last_error || value.lastError) : null,
    config_snapshot: compactRunConfigSnapshot(value.config_snapshot || value.configSnapshot),
  })
}

export function requestRuntimeGc() {
  try {
    const gc = (globalThis as any).Bun?.gc
    if (typeof gc === 'function') gc(true)
  } catch {
    // GC is opportunistic; never let it affect chapter execution.
  }
}

export function isAbortLikeError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  return error?.name === 'AbortError'
    || error?.code === 'REQUEST_CANCELED'
    || message.includes('request canceled')
    || message.includes('aborted')
    || message.includes('abort')
}
