import type { ChapterWordTarget } from '../word-target'

export const WRITING_SKILL_HARD_FLOOR = 800
export const WRITING_SKILL_STANDARD_FLOOR = 2700
export const WRITING_SKILL_GROWTH_RATIO = 1.30
export const WRITING_SKILL_SHRINK_RATIO = 0.70
export const WRITING_SKILL_OVER_TARGET_SLACK_RATIO = 0.05
export const WRITING_SKILL_OVER_TARGET_SLACK_MIN = 200

export function resolveWritingSkillLengthBounds(input: {
  sourceChars: number
  wordTarget?: Pick<ChapterWordTarget, 'mode' | 'min' | 'max' | 'target'> | null
}): { min: number; max: number } {
  const source = Math.max(0, Math.floor(Number(input.sourceChars) || 0))
  const sourceFloor = Math.max(WRITING_SKILL_HARD_FLOOR, Math.ceil(source * WRITING_SKILL_SHRINK_RATIO))
  const sourceCeil = Math.floor(source * WRITING_SKILL_GROWTH_RATIO)
  const mode = String(input.wordTarget?.mode || '')
  const targetMax = Math.max(0, Math.floor(Number(input.wordTarget?.max || 0)))
  const hasTarget = Boolean(input.wordTarget && (targetMax || input.wordTarget.target))
  const standardFloor = hasTarget && mode !== 'long' && mode !== 'custom' ? WRITING_SKILL_STANDARD_FLOOR : 0
  const min = Math.max(sourceFloor, standardFloor)

  if (!hasTarget) {
    return { min: sourceFloor, max: sourceCeil }
  }
  if (targetMax > 0 && source > targetMax) {
    const slack = Math.max(
      WRITING_SKILL_OVER_TARGET_SLACK_MIN,
      Math.floor(source * WRITING_SKILL_OVER_TARGET_SLACK_RATIO),
    )
    return { min, max: source + slack }
  }
  return { min, max: Math.max(sourceCeil, targetMax) }
}
