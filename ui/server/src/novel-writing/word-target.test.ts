import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  type ChapterWordTarget,
  applyChapterWordTargetToContext,
  applyProseWordTargetSoftCap,
  countProseChars,
  canBridgeShortContractionToExpansion,
  evaluateProseWordTarget,
  isExplicitlyCompleteProseContractionFinishReason,
  isRejectedProseContractionFinishReason,
  isUsableProseWordTargetFinishReason,
  isWithinProseWordTargetSoftCap,
  normalizeProseContractionFinishReason,
  normalizeProseContractionIncompleteReason,
  proseContractionMaxTokensForAttempt,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
  resolveStandardWordTargetCompatibility,
  shouldForceProseWordTargetExpand,
  shouldSkipWordTargetRepairForSoftCap,
  surgicalContractProseToWordTarget,
} from './word-target'

describe('novel writing word target utilities', () => {
  test('allows only standard chapters through the finite 30% compatibility ceiling', () => {
    const standard = resolveChapterWordTarget({}, {}, {})
    expect(resolveStandardWordTargetCompatibility(evaluateProseWordTarget('文'.repeat(5900), standard), standard)).toMatchObject({ passed: true, ceiling: 6006 })
    expect(resolveStandardWordTargetCompatibility(evaluateProseWordTarget('文'.repeat(6007), standard), standard).passed).toBe(false)
    const custom = resolveChapterWordTarget({}, {}, { word_target_mode: 'custom', target_word_count: 5200 })
    expect(resolveStandardWordTargetCompatibility(evaluateProseWordTarget('文'.repeat(5900), custom), custom).passed).toBe(false)
  })
  test('counts prose characters without whitespace', () => {
    expect(countProseChars('李辰 醒来\n规则响起。')).toBe(9)
  })

  test('resolves standard, long, and custom chapter word targets', () => {
    expect(resolveChapterWordTarget({}, { chapter_no: 1 }, {})).toMatchObject({
      mode: 'standard',
      target: 4200,
      min: 3780,
      max: 4620,
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
      min: 3780,
      deficit: 2048,
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
      max: 4620,
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

    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4635), target))).toBe(true)
    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4800), target))).toBe(false)
    expect(isWithinProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3770), target))).toBe(false)
  })

  test('bridges only a mildly short complete contraction into the existing expansion gate', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const overTarget = evaluateProseWordTarget('字'.repeat(6474), target)

    expect(canBridgeShortContractionToExpansion(
      overTarget,
      evaluateProseWordTarget('字'.repeat(3500), target),
    )).toBe(true)
    expect(canBridgeShortContractionToExpansion(
      overTarget,
      evaluateProseWordTarget('字'.repeat(3300), target),
    )).toBe(false)
    expect(canBridgeShortContractionToExpansion(
      overTarget,
      evaluateProseWordTarget('字'.repeat(3780), target),
    )).toBe(false)
    expect(canBridgeShortContractionToExpansion(
      evaluateProseWordTarget('字'.repeat(4500), target),
      evaluateProseWordTarget('字'.repeat(3500), target),
    )).toBe(false)
  })

  test('normalizes contraction completion and incomplete transport states to fixed values', () => {
    expect(normalizeProseContractionFinishReason({ finish_reason: 'STOP' })).toBe('stop')
    expect(normalizeProseContractionFinishReason({ raw: { stop_reason: 'MAX_TOKENS' } })).toBe('max_tokens')
    expect(normalizeProseContractionFinishReason({ finish_reason: 'provider-controlled-value' })).toBe('unknown')
    expect(normalizeProseContractionFinishReason({})).toBeNull()
    expect(normalizeProseContractionIncompleteReason({
      raw: { response: { incomplete_details: { reason: 'max_output_tokens' } } },
    })).toBe('max_output_tokens')
    expect(normalizeProseContractionIncompleteReason({ incomplete_details: { reason: 'provider-controlled-value' } })).toBe('unknown')
    expect(isExplicitlyCompleteProseContractionFinishReason('stop')).toBe(true)
    expect(isExplicitlyCompleteProseContractionFinishReason('incomplete')).toBe(false)
    expect(isRejectedProseContractionFinishReason('content_filter')).toBe(true)
    expect(isRejectedProseContractionFinishReason(null)).toBe(false)
    // Streaming proxies often omit finish_reason; missing must be usable for expand.
    expect(isUsableProseWordTargetFinishReason(null)).toBe(true)
    expect(isUsableProseWordTargetFinishReason('stop')).toBe(true)
    expect(isUsableProseWordTargetFinishReason('length')).toBe(false)
    expect(isUsableProseWordTargetFinishReason('max_tokens')).toBe(false)
  })

  test('normalizes a tiny over-target result into one shared passing decision', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})

    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4635), target))).toMatchObject({
      actual: 4635,
      too_long: false,
      passed: true,
      soft_cap: true,
    })
    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4800), target))).toMatchObject({
      actual: 4800,
      too_long: true,
      passed: false,
      soft_cap: false,
    })
  })

  test('uses a symmetric soft compatibility band around the configured range', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})

    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3700), target))).toMatchObject({
      actual: 3700,
      too_short: false,
      passed: true,
      soft_cap: true,
      soft_floor: true,
    })
    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3660), target))).toMatchObject({
      actual: 3660,
      too_short: true,
      passed: false,
      soft_cap: false,
      soft_floor: false,
    })
    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4759), target))).toMatchObject({
      actual: 4759,
      too_long: false,
      passed: true,
      soft_cap: true,
      soft_floor: false,
    })
    expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4760), target))).toMatchObject({
      actual: 4760,
      too_long: true,
      passed: false,
      soft_cap: false,
      soft_floor: false,
    })
  })


  test('forces expand on hard short or dialogue deficit; soft floor never skips hard expand', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const hardShort = evaluateProseWordTarget('字'.repeat(3759), target)
    const softShort = applyProseWordTargetSoftCap(hardShort)
    expect(hardShort.too_short).toBe(true)
    expect(softShort.soft_floor).toBe(true)
    expect(softShort.passed).toBe(true)
    expect(shouldForceProseWordTargetExpand(hardShort, { dialogue_para_ratio: 0.18 })).toBe(true)
    expect(shouldSkipWordTargetRepairForSoftCap(hardShort, softShort, { dialogue_para_ratio: 0.18 })).toBe(false)

    const hardOk = evaluateProseWordTarget('字'.repeat(4000), target)
    expect(shouldForceProseWordTargetExpand(hardOk, { dialogue_para_ratio: 0.07 })).toBe(true)
    expect(shouldForceProseWordTargetExpand(hardOk, { dialogue_para_ratio: 0.15 })).toBe(false)
    expect(shouldForceProseWordTargetExpand(hardOk, { dialogue_para_ratio: 0.07, expand: false })).toBe(false)

    const hardLongSoft = applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(4635), target))
    const hardLong = evaluateProseWordTarget('字'.repeat(4635), target)
    expect(shouldSkipWordTargetRepairForSoftCap(hardLong, hardLongSoft, { dialogue_para_ratio: 0.2 })).toBe(true)
  })

  test('fallback tail trimming never contracts below the hard minimum', () => {
    const fill = (limit: number, seed: string) => {
      let out = ''
      while (countProseChars(out + seed) <= limit) out += seed
      return out
    }
    const paras: string[] = []
    for (let i = 0; i < 7; i += 1) {
      paras.push(fill(460, `他把柜门关好又检查了一遍锁扣${i}。走廊尽头的灯忽明忽暗。`))
    }
    // late paragraph with dialogue quotes -> phase-1 drop score stays negative
    paras.push('“别出声。”他压低嗓子说。' + fill(420, '对面的人影停了一下又继续往前挪。他数着自己的心跳。'))
    // ~1000-char tail without quotes or drop keywords: popping it would fall below min
    paras.push(fill(1020, '夜里他沿着旧街走了很久。风把梧桐叶吹得贴在墙上。'))
    const text = paras.join('\n\n')
    const target: ChapterWordTarget = {
      mode: 'standard',
      label: '标准章',
      target: 4200,
      min: 3780,
      max: 4620,
      rangeText: '3780-4620 字',
    }
    expect(evaluateProseWordTarget(text, target).too_long).toBe(true)
    const out = surgicalContractProseToWordTarget(text, target)
    expect(out.to).toBeGreaterThanOrEqual(target.min)
    expect(evaluateProseWordTarget(out.text, target).too_short).toBe(false)
  })

  test('surgical contraction drops pure-AI heavy tails into standard band', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const body = Array.from({ length: 220 }, (_, i) => {
      if (i === 40) return '“先别出声。”'
      if (i === 41) return '“……好。”他按住门闩，又把纸条塞回内侧口袋。'
      if (i > 160) return `这不是病，这是某种结算。扣减凭证 LX-00${i}。门外重重地，一下又一下拍门。编号连在一起。`
      if (i > 110) return `他再次核对第${i}具的颈动脉与体温读数，瞳孔对光反射消失，无心音无呼吸。转运单编号${i}。`
      return `他摸了摸桌上的编号纸角，手心发潮，动作停了半拍。这是第${i + 1}次确认现场细节。`
    }).join('\n\n')
    const over = body + '\n'
    expect(evaluateProseWordTarget(over, target).too_long).toBe(true)
    const out = surgicalContractProseToWordTarget(over, target)
    expect(out.removed).toBeGreaterThan(0)
    expect(out.to).toBeLessThanOrEqual(target.max)
    expect(out.text).toContain('先别出声')
  })
})
