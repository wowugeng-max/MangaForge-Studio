import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  applyChapterWordTargetToContext,
  applyProseWordTargetSoftCap,
  countProseChars,
  evaluateProseWordTarget,
  isWithinProseWordTargetSoftCap,
  proseContractionMaxTokensForAttempt,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
} from './word-target'

describe('novel writing word target utilities', () => {
  test('counts prose characters without whitespace', () => {
    expect(countProseChars('李辰 醒来\n规则响起。')).toBe(9)
  })

  test('resolves standard, long, and custom chapter word targets', () => {
    expect(resolveChapterWordTarget({}, { chapter_no: 1 }, {})).toMatchObject({
      mode: 'standard',
      target: 4200,
      min: 3200,
      max: 5200,
    })
    expect(resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'long' })).toMatchObject({
      mode: 'long',
      target: 10000,
      min: 9000,
      max: 11000,
    })
    expect(resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })).toMatchObject({
      mode: 'custom',
      target: 5200,
      min: 4680,
      max: 5720,
    })
  })

  test('applies word target to both context aliases and style lock', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 2 }, { word_target_mode: 'custom', target_word_count: 4200 })
    const context = applyChapterWordTargetToContext({
      chapter_target: { chapter_no: 2, title: '旧法失准' },
      style_lock: { tone: '冷静' },
    }, target)

    expect(context.chapter_target.word_target).toEqual(target)
    expect(context.chapterTarget.word_target).toEqual(target)
    expect(context.style_lock).toMatchObject({
      tone: '冷静',
      chapter_word_range: '3780-4620 字',
    })
  })

  test('evaluates under-target prose and max token budget', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)

    expect(evaluation).toMatchObject({
      actual: 1732,
      target: 4200,
      min: 3200,
      deficit: 1468,
      too_short: true,
      passed: false,
    })
    expect(proseMaxTokensForWordTarget(target)).toBe(18000)
    expect(proseMaxTokensForWordTarget(resolveChapterWordTarget({}, { chapter_no: 3 }, { word_target_mode: 'long' }))).toBe(32000)
  })

  test('rejects over-target prose before expensive downstream revision', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(12389), target)

    expect(evaluation).toMatchObject({
      actual: 12389,
      max: 5200,
      too_short: false,
      too_long: true,
      passed: false,
    })
  })

  test('raises contraction retries from each target budget and caps reachable attempts at the provider limit', () => {
    const standard = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const custom = resolveChapterWordTarget({}, { chapter_no: 1 }, { word_target_mode: 'custom', target_word_count: 6000 })
    const long = resolveChapterWordTarget({}, { chapter_no: 1 }, { word_target_mode: 'long' })

    expect([1, 2, 3].map(attempt => proseContractionMaxTokensForAttempt(standard, attempt))).toEqual([18_000, 32_000, 48_000])
    expect([1, 2, 3].map(attempt => proseContractionMaxTokensForAttempt(custom, attempt))).toEqual([24_000, 36_000, 54_000])
    expect([1, 2, 3].map(attempt => proseContractionMaxTokensForAttempt(long, attempt))).toEqual([32_000, 48_000, 64_000])
  })

  test('bounds non-finite and oversized contraction attempt inputs before iterating', () => {
    const source = readFileSync(join(import.meta.dir, 'word-target.ts'), 'utf8')
    const helperStart = source.indexOf('export function proseContractionMaxTokensForAttempt')
    const helperEnd = source.indexOf('\n}\n', helperStart)
    const helperSource = source.slice(helperStart, helperEnd)
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})

    expect(helperSource).toContain('Number.isFinite(rawAttempt)')
    expect(helperSource).toContain('Math.min(4, Math.floor(rawAttempt))')
    expect(proseContractionMaxTokensForAttempt(target, Number.NaN)).toBe(18_000)
    expect(proseContractionMaxTokensForAttempt(target, Number.POSITIVE_INFINITY)).toBe(18_000)
    expect(proseContractionMaxTokensForAttempt(target, Number.MAX_SAFE_INTEGER)).toBe(64_000)
  })

  test('allows tiny over-target drift as a soft cap but rejects substantial overruns', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})

    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5220), target))).toBe(true)
    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5700), target))).toBe(false)
    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3199), target))).toBe(false)
  })

  test('normalizes a tiny over-target result into one shared passing decision', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})

    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5219), target))).toMatchObject({
      actual: 5219,
      too_long: false,
      passed: true,
      soft_cap: true,
    })
    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5700), target))).toMatchObject({
      actual: 5700,
      too_long: true,
      passed: false,
      soft_cap: false,
    })
  })
})
