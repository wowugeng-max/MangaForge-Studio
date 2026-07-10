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
}

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

export function isWithinProseWordTargetSoftCap(evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const max = Number(evaluation?.max || 0)
  const actual = Number(evaluation?.actual || 0)
  if (!evaluation?.too_long || max <= 0 || actual <= max) return false
  const toleranceRatio = Number.isFinite(Number(options.tolerance_ratio)) ? Number(options.tolerance_ratio) : 0.01
  const minimumTolerance = Number.isFinite(Number(options.minimum_tolerance)) ? Number(options.minimum_tolerance) : 20
  const tolerance = Math.max(minimumTolerance, Math.ceil(max * toleranceRatio))
  return actual <= max + tolerance
}

export function applyProseWordTargetSoftCap(evaluation: ProseWordTargetEvaluation) {
  const softCap = isWithinProseWordTargetSoftCap(evaluation)
  return {
    ...evaluation,
    ...(softCap ? { too_long: false, passed: true } : {}),
    soft_cap: softCap,
  }
}
