export type ChapterWordTarget = {
  mode: 'standard' | 'long' | 'custom'
  label: string
  target: number
  min: number
  max: number
  rangeText: string
}

export type ProseWordTargetEvaluation = {
  actual: number
  target: number
  min: number
  max: number
  deficit: number
  too_short: boolean
  too_long: boolean
  passed: boolean
  soft_cap?: boolean
  soft_floor?: boolean
}

const DEFAULT_WORD_TARGET_TOLERANCE_RATIO = 0.05

const COMPLETE_CONTRACTION_FINISH_REASONS = new Set([
  'stop',
  'completed',
  'complete',
  'end_turn',
  'stop_sequence',
  'success',
  'succeeded',
])

const REJECTED_CONTRACTION_FINISH_REASONS = new Set([
  'length',
  'max_tokens',
  'max_output_tokens',
  'incomplete',
  'error',
  'failed',
  'content_filter',
  'safety',
  'cancelled',
  'canceled',
  'aborted',
  'tool_calls',
  'tool_use',
  'function_call',
])

const KNOWN_CONTRACTION_FINISH_REASONS = new Set([
  ...COMPLETE_CONTRACTION_FINISH_REASONS,
  ...REJECTED_CONTRACTION_FINISH_REASONS,
])

function clampWordTarget(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 3000
  return Math.min(12000, Math.max(1000, Math.round(value)))
}

export function resolveChapterWordTarget(project: any, chapter: any, options: any = {}): ChapterWordTarget {
  const raw = options.word_target || chapter?.raw_payload?.word_target || project?.reference_config?.chapter_word_target || {}
  const requestedMode = String(options.word_target_mode || raw.mode || raw.word_target_mode || '').toLowerCase()
  const requestedTarget = Number(options.target_word_count || raw.target || raw.target_word_count || 0)

  if (requestedMode === 'long') {
    return {
      mode: 'long',
      label: '长章',
      target: 10000,
      min: 9000,
      max: 11000,
      rangeText: '9000-11000 字',
    }
  }

  if (requestedMode === 'custom' || requestedTarget > 0) {
    const target = clampWordTarget(requestedTarget)
    const min = Math.max(800, Math.round(target * 0.9))
    const max = Math.round(target * 1.1)
    return {
      mode: 'custom',
      label: `自定义 ${target} 字`,
      target,
      min,
      max,
      rangeText: `${min}-${max} 字`,
    }
  }

  return {
    mode: 'standard',
    label: '标准章',
    target: 4200,
    min: 3200,
    max: 5200,
    rangeText: '3200-5200 字',
  }
}

export function applyChapterWordTargetToContext(contextPackage: any, target: ChapterWordTarget) {
  const chapterTarget = {
    ...((contextPackage || {}).chapterTarget || {}),
    ...((contextPackage || {}).chapter_target || {}),
    word_target: target,
  }
  return {
    ...(contextPackage || {}),
    chapter_target: chapterTarget,
    chapterTarget,
    style_lock: {
      ...((contextPackage || {}).style_lock || {}),
      chapter_word_range: target.rangeText,
    },
  }
}

export function proseMaxTokensForWordTarget(target: ChapterWordTarget | null | undefined) {
  const targetWords = Number(target?.target || 4200)
  if (targetWords >= 9000) return 32000
  if (targetWords >= 6000) return 24000
  return 18000
}

export function proseContractionMaxTokensForAttempt(target: ChapterWordTarget | null | undefined, attempt: number) {
  let maxTokens = proseMaxTokensForWordTarget(target)
  const rawAttempt = Number(attempt)
  const normalizedAttempt = Number.isFinite(rawAttempt)
    ? Math.max(1, Math.min(4, Math.floor(rawAttempt)))
    : 1
  for (let retry = 1; retry < normalizedAttempt; retry += 1) {
    maxTokens = Math.min(64_000, Math.max(32_000, maxTokens + 12_000, Math.ceil(maxTokens * 1.5)))
  }
  return maxTokens
}

export function countProseChars(text: string) {
  return String(text || '').replace(/\s/g, '').length
}

export function evaluateProseWordTarget(text: string, target: ChapterWordTarget | null | undefined): ProseWordTargetEvaluation {
  const actual = countProseChars(text)
  const min = Number(target?.min || 0)
  const max = Number(target?.max || 0)
  const targetCount = Number(target?.target || 0)
  const tooShort = min > 0 && actual < min
  const tooLong = max > 0 && actual > max
  return {
    actual,
    target: targetCount,
    min,
    max,
    deficit: tooShort ? min - actual : 0,
    too_short: tooShort,
    too_long: tooLong,
    passed: !tooShort && !tooLong,
  }
}

export function canBridgeShortContractionToExpansion(
  current: ProseWordTargetEvaluation,
  candidate: ProseWordTargetEvaluation,
) {
  const currentCount = Number(current?.actual || 0)
  const candidateCount = Number(candidate?.actual || 0)
  const minimumCount = Number(candidate?.min || 0)
  if (!current?.too_long || !candidate?.too_short || candidate?.too_long) return false
  if (!Number.isFinite(currentCount) || !Number.isFinite(candidateCount) || !Number.isFinite(minimumCount)) return false
  if (minimumCount <= 0 || candidateCount <= 0 || candidateCount >= currentCount) return false
  return candidateCount >= Math.ceil(minimumCount * 0.9)
}

export function normalizeProseContractionFinishReason(result: any) {
  const finishReason = [
    result?.finish_reason,
    result?.finishReason,
    result?.stop_reason,
    result?.stopReason,
    result?.raw?.finish_reason,
    result?.raw?.finishReason,
    result?.raw?.stop_reason,
    result?.raw?.stopReason,
    result?.raw?.choices?.[0]?.finish_reason,
    result?.raw?.choices?.[0]?.finishReason,
    result?.raw?.choices?.[0]?.stop_reason,
    result?.raw?.choices?.[0]?.stopReason,
    result?.raw?.response?.finish_reason,
    result?.raw?.response?.stop_reason,
  ].find(value => String(value ?? '').trim())
  const normalized = String(finishReason ?? '').trim().toLowerCase()
  if (!normalized) return null
  return KNOWN_CONTRACTION_FINISH_REASONS.has(normalized) ? normalized : 'unknown'
}

export function normalizeProseContractionIncompleteReason(result: any) {
  const rawReason = [
    result?.incomplete_details?.reason,
    result?.incompleteDetails?.reason,
    result?.raw?.incomplete_details?.reason,
    result?.raw?.incompleteDetails?.reason,
    result?.raw?.response?.incomplete_details?.reason,
    result?.raw?.response?.incompleteDetails?.reason,
  ].find(value => String(value ?? '').trim())
  const reason = String(rawReason ?? '').trim().toLowerCase()
  if (!reason) return null
  if (['max_output_tokens', 'max_tokens', 'token_limit', 'length'].includes(reason)) return 'max_output_tokens'
  if (['content_filter', 'safety'].includes(reason)) return 'content_filter'
  return 'unknown'
}

export function isExplicitlyCompleteProseContractionFinishReason(reason: string | null) {
  return COMPLETE_CONTRACTION_FINISH_REASONS.has(String(reason || ''))
}

export function isRejectedProseContractionFinishReason(reason: string | null) {
  return REJECTED_CONTRACTION_FINISH_REASONS.has(String(reason || ''))
}

export function isWithinProseWordTargetSoftCap(evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const max = Number(evaluation?.max || 0)
  const actual = Number(evaluation?.actual || 0)
  if (!evaluation?.too_long || max <= 0 || actual <= max) return false
  const toleranceRatio = Number.isFinite(Number(options.tolerance_ratio)) ? Number(options.tolerance_ratio) : DEFAULT_WORD_TARGET_TOLERANCE_RATIO
  const minimumTolerance = Number.isFinite(Number(options.minimum_tolerance)) ? Number(options.minimum_tolerance) : 20
  const tolerance = Math.max(minimumTolerance, Math.ceil(max * toleranceRatio))
  return actual <= max + tolerance
}

export function isWithinProseWordTargetSoftFloor(evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const min = Number(evaluation?.min || 0)
  const actual = Number(evaluation?.actual || 0)
  if (!evaluation?.too_short || min <= 0 || actual >= min) return false
  const toleranceRatio = Number.isFinite(Number(options.tolerance_ratio)) ? Number(options.tolerance_ratio) : DEFAULT_WORD_TARGET_TOLERANCE_RATIO
  const minimumTolerance = Number.isFinite(Number(options.minimum_tolerance)) ? Number(options.minimum_tolerance) : 20
  const tolerance = Math.max(minimumTolerance, Math.ceil(min * toleranceRatio))
  return actual >= min - tolerance
}

export function applyProseWordTargetSoftCap(evaluation: ProseWordTargetEvaluation) {
  const softCeiling = isWithinProseWordTargetSoftCap(evaluation)
  const softFloor = isWithinProseWordTargetSoftFloor(evaluation)
  const softCap = softCeiling || softFloor
  return {
    ...evaluation,
    ...(softCap ? {
      too_short: softFloor ? false : evaluation.too_short,
      too_long: softCeiling ? false : evaluation.too_long,
      passed: true,
    } : {}),
    soft_cap: softCap,
    soft_floor: softFloor,
  }
}
