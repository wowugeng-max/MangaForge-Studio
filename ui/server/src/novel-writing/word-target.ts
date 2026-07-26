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

const DEFAULT_WORD_TARGET_TOLERANCE_RATIO = 0.03

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

  // ±10% band keeps commercial pacing tight; soft cap only absorbs tiny provider drift.
  return {
    mode: 'standard',
    label: '标准章',
    target: 4200,
    min: 3780,
    max: 4620,
    rangeText: '3780-4620 字',
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

/**
 * Deterministic overlength contraction when LLM rewrite is truncated/rejected.
 * Prefer dropping pure-AI / clinical lecture / ending-template paragraphs first,
 * then trailing non-dialogue padding. Never rewrite sentences; only delete blocks.
 */
export function surgicalContractProseToWordTarget(
  text: string,
  target: ChapterWordTarget | null | undefined,
): { text: string; removed: number; from: number; to: number } {
  const source = String(text || '')
  const evaluation = evaluateProseWordTarget(source, target)
  if (!evaluation.too_long) {
    return { text: source, removed: 0, from: evaluation.actual, to: evaluation.actual }
  }
  const max = Number(target?.max || 0)
  const min = Number(target?.min || 0)
  const paragraphs = source
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length < 8) {
    return { text: source, removed: 0, from: evaluation.actual, to: evaluation.actual }
  }

  const dropScore = (p: string, index: number, total: number) => {
    let score = 0
    if (/[“"']/.test(p)) score -= 8
    if (/名单生效|代价已付|某种结算|扣减凭证|名字的缩写|拼音缩写|这不是|也不是|规则网|未定义|拍门|重重地|三张凭证|编号连在一起|体温都诡异|全部都是|同样没有|无心音|无呼吸|尸斑|对光反射/.test(p)) score += 12
    if (/监护|瞳孔|听诊|颈动脉|体温|尸僵|转运单|凭证|编号/.test(p)) score += 4
    if (index > total * 0.75) score += 3
    if (index < total * 0.12) score -= 3
    if (p.length <= 8) score += 1
    return score
  }

  const ranked = paragraphs.map((p, i) => ({ p, i, score: dropScore(p, i, paragraphs.length) }))
  ranked.sort((a, b) => b.score - a.score || b.i - a.i)
  const dropped = new Set<number>()
  let current = source
  let currentCount = evaluation.actual
  for (const item of ranked) {
    if (currentCount <= max) break
    if (item.score < 2) continue
    dropped.add(item.i)
    const nextParas = paragraphs.filter((_, idx) => !dropped.has(idx))
    if (nextParas.length < 6) {
      dropped.delete(item.i)
      break
    }
    const next = `${nextParas.join('\n\n')}\n`
    const nextCount = countProseChars(next)
    if (min > 0 && nextCount < min) {
      dropped.delete(item.i)
      continue
    }
    current = next
    currentCount = nextCount
  }

  if (currentCount > max) {
    const paras = current.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    while (paras.length > 6 && countProseChars(paras.join('\n\n')) > max) {
      const last = paras[paras.length - 1]
      let removeIndex = paras.length - 1
      if (/[“"']/.test(last) && paras.length > 10) {
        let idx = paras.length - 2
        while (idx > Math.floor(paras.length * 0.2) && /[“"']/.test(paras[idx])) idx -= 1
        if (idx > Math.floor(paras.length * 0.2)) removeIndex = idx
      }
      // Dry-run the removal first: never trade too_long for too_short.
      const candidate = paras.filter((_, idx) => idx !== removeIndex)
      if (min > 0 && countProseChars(candidate.join('\n\n')) < min) break
      paras.splice(removeIndex, 1)
    }
    current = `${paras.join('\n\n')}\n`
    currentCount = countProseChars(current)
  }

  return {
    text: current,
    removed: Math.max(0, evaluation.actual - currentCount),
    from: evaluation.actual,
    to: currentCount,
  }
}

export function resolveStandardWordTargetCompatibility(
  evaluation: ProseWordTargetEvaluation,
  target: ChapterWordTarget | null | undefined,
) {
  const ceiling = Math.floor(Number(target?.max || 0) * 1.3)
  const passed = target?.mode === 'standard'
    && evaluation?.too_long === true
    && ceiling > 0
    && Number(evaluation.actual || 0) <= ceiling
  return {
    passed,
    ceiling,
    reason: passed ? 'standard_contraction_exhausted_within_compatibility_ceiling' : null,
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

/**
 * Streaming/OpenAI-compatible proxies often omit finish_reason on completed chapters.
 * Align word-target expand/contract with draft transport admission:
 * accept missing/complete reasons; only reject explicit truncated/error finishes.
 */
export function isUsableProseWordTargetFinishReason(reason: string | null) {
  if (isRejectedProseContractionFinishReason(reason)) return false
  if (!reason) return true
  if (isExplicitlyCompleteProseContractionFinishReason(reason)) return true
  // Non-rejected unknown provider values are treated as usable when payload parses cleanly.
  return true
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

export function shouldForceProseWordTargetExpand(
  hardEvaluation: ProseWordTargetEvaluation | null | undefined,
  options: {
    expand?: boolean
    dialogue_para_ratio?: number
    dialogue_min_ratio?: number
  } = {},
) {
  // expand=false skips ordinary shortfall expansion, but vignette drafts (<< hard min)
  // still force recovery — otherwise zhuque_fast freezes 200-word stubs.
  const criticallyShort = Boolean(hardEvaluation?.too_short)
    && Number(hardEvaluation?.actual || 0) > 0
    && Number(hardEvaluation?.min || 0) > 0
    && Number(hardEvaluation?.actual) < Number(hardEvaluation?.min) * 0.3
  if (options.expand === false && !criticallyShort) return false
  if (hardEvaluation?.too_short) return true
  const ratio = Number(options.dialogue_para_ratio)
  const minRatio = Number.isFinite(Number(options.dialogue_min_ratio))
    ? Number(options.dialogue_min_ratio)
    : 0.12
  if (Number.isFinite(ratio) && ratio + 1e-9 < minRatio) return true
  return false
}

/** Soft floor may admit tiny shortfall, but must never suppress hard-min expansion. */
export function shouldSkipWordTargetRepairForSoftCap(
  hardEvaluation: ProseWordTargetEvaluation,
  softEvaluation: ProseWordTargetEvaluation & { soft_cap?: boolean; soft_floor?: boolean },
  options: { dialogue_para_ratio?: number; dialogue_min_ratio?: number; expand?: boolean } = {},
) {
  if (!softEvaluation?.soft_cap) return false
  // Soft floor + hard short / dialogue deficit => do not skip expand.
  if (shouldForceProseWordTargetExpand(hardEvaluation, options)) return false
  // Soft ceiling only may skip contraction.
  return Boolean(hardEvaluation?.too_long && !hardEvaluation?.too_short)
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
