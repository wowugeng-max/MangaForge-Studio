import { describe, expect, test } from 'bun:test'
import {
  assertProseQualityCanStore,
  buildFocusedProseReviewPrompt,
  buildFocusedProseRevisionPrompt,
  buildProseQualityDecision,
  isUsableProseQualityReviewPayload,
  normalizeProseQualityReview,
  proseQualityReviewMaxTokensForAttempt,
  runProseQualityLoop,
} from './prose-quality-loop'

const sixDimensionScores = {
  continuity: 7,
  core_promise_agency: 7,
  conflict_causality: 7,
  payoff_hook: 7,
  prose_style: 7,
  fact_setting_safety: 8,
}

describe('prose quality decisions', () => {
  test('treats a false or omitted publishable verdict as a stable LLM hard failure', () => {
    for (const publishable of [false, undefined]) {
      const decision = buildProseQualityDecision({
        chapterText: '正文没有其他硬质量问题。',
        review: normalizeProseQualityReview({
          score: 90,
          dimensions: sixDimensionScores,
          ...(publishable === undefined ? {} : { publishable }),
          findings: [],
        }),
        deterministicScan: { hard_failures: [] },
        minScore: 78,
      })

      expect(decision).toMatchObject({ passed: false, approvable: false })
      expect(decision.hard_failures).toEqual([
        expect.objectContaining({ key: 'quality_publishable_verdict', source: 'llm' }),
      ])
    }
  })

  test('enforces the dimension hard floor for every required quality dimension with five passing', () => {
    for (const dimension of Object.keys(sixDimensionScores)) {
      const belowFloor = buildProseQualityDecision({
        chapterText: '正文没有其他硬质量问题。',
        review: normalizeProseQualityReview({
          score: 90,
          publishable: true,
          dimensions: { ...sixDimensionScores, [dimension]: 4 },
          findings: [],
        }),
        deterministicScan: { hard_failures: [] },
        minScore: 78,
      })
      const atFloor = buildProseQualityDecision({
        chapterText: '正文没有其他硬质量问题。',
        review: normalizeProseQualityReview({
          score: 90,
          publishable: true,
          dimensions: { ...sixDimensionScores, [dimension]: 5 },
          findings: [],
        }),
        deterministicScan: { hard_failures: [] },
        minScore: 78,
      })

      expect(belowFloor.hard_failures).toEqual([
        expect.objectContaining({ key: `quality_dimension_${dimension}`, source: 'llm' }),
      ])
      expect(atFloor).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    }
  })

  test('treats missing and non-finite required dimensions as hard failures', () => {
    for (const dimension of Object.keys(sixDimensionScores)) {
      for (const invalidScore of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
        const dimensions = { ...sixDimensionScores, [dimension]: invalidScore }
        const decision = buildProseQualityDecision({
          chapterText: '正文没有其他硬质量问题。',
          review: normalizeProseQualityReview({
            score: 90,
            publishable: true,
            dimensions,
            findings: [],
          }),
          deterministicScan: { hard_failures: [] },
          minScore: 78,
        })

        expect(decision.hard_failures).toEqual([
          expect.objectContaining({ key: `quality_dimension_${dimension}`, source: 'llm' }),
        ])
      }
    }
  })

  test('keeps a score-only miss approvable when the complete verdict has no hard failure', () => {
    const decision = buildProseQualityDecision({
      chapterText: '正文没有硬质量问题。',
      review: normalizeProseQualityReview({
        score: 76,
        publishable: true,
        dimensions: Object.fromEntries(Object.keys(sixDimensionScores).map(key => [key, 5])),
        findings: [],
      }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision).toMatchObject({ passed: false, approvable: true, hard_failures: [] })
    expect(assertProseQualityCanStore(decision, { approved: true })).toBe(true)
  })

  test('keeps at most six blocking and four advisory findings', () => {
    const review = normalizeProseQualityReview({
      score: 84,
      findings: [
        ...Array.from({ length: 8 }, (_, index) => ({
          key: `b${index}`,
          severity: 'S2',
          dimension: 'conflict_causality',
          evidence: `证据${index}`,
          required_change: '补行动结果',
          acceptance_test: '场景状态发生改变',
        })),
        ...Array.from({ length: 7 }, (_, index) => ({
          key: `a${index}`,
          severity: 'S3',
          dimension: 'prose_style',
          evidence: `建议${index}`,
          required_change: '压缩句子',
          acceptance_test: '句子自然',
        })),
      ],
    })

    expect(review.blocking_findings).toHaveLength(6)
    expect(review.advisory_findings).toHaveLength(4)
  })

  test('does not classify an evidence-free model opinion as a hard finding', () => {
    const review = normalizeProseQualityReview({
      score: 90,
      findings: [{
        key: 'vague',
        severity: 'S1',
        dimension: 'continuity',
        evidence: '',
        required_change: '重写',
        acceptance_test: '更好',
      }],
    })

    expect(review.blocking_findings).toHaveLength(0)
    expect(review.advisory_findings[0].severity).toBe('S3')
  })

  test('never allows generic approval to waive deterministic or S1/S2 hard failures', () => {
    const decision = buildProseQualityDecision({
      chapterText: '江澈全程等待救援。',
      review: normalizeProseQualityReview({
        score: 92,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '江澈全程等待救援。',
          required_change: '让江澈主动破局',
          acceptance_test: '关键结果来自主角选择',
        }],
      }),
      deterministicScan: {
        hard_failures: [{ key: 'non_chinese_leak', message: '正文出现连续英文段落' }],
      },
      minScore: 78,
    })

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures.map(item => item.source)).toEqual(['deterministic', 'llm'])
    expect(() => assertProseQualityCanStore(decision, { approved: true })).toThrowError(/硬质量门禁/)
  })

  test('allows approval only for advisory or score-only failure', () => {
    const decision = buildProseQualityDecision({
      chapterText: '正文没有硬质量问题。',
      review: normalizeProseQualityReview({
        score: 76,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [],
      }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(true)
    expect(assertProseQualityCanStore(decision, { approved: true })).toBe(true)
    expect(() => assertProseQualityCanStore(decision)).toThrowError(/评分未获批准/)
  })

  test('downgrades unlocatable evidence to advisory instead of blocking', () => {
    const decision = buildProseQualityDecision({
      chapterText: '江澈推开仓门，铜锁坠在地上。',
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'invented_agency_gap',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '江澈全程等待救援。',
          required_change: '让江澈主动破局',
          acceptance_test: '关键结果来自主角选择',
        }],
      }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(decision.advisory_failures.join('｜')).toContain('invented_agency_gap')
    expect(decision.advisory_failures.join('｜')).toContain('无法在当前正文定位')
  })

  test('keeps every supported quote pair with NBSP and full-width whitespace locatable', () => {
    const quotePairs = [
      ['“', '”'],
      ['‘', '’'],
      ['「', '」'],
      ['『', '』'],
      ['"', '"'],
      ["'", "'"],
    ]

    for (const [opening, closing] of quotePairs) {
      const decision = buildProseQualityDecision({
        chapterText: '江澈推开仓门，\u00a0\u3000铜锁坠在地上。',
        review: normalizeProseQualityReview({
          score: 90,
          publishable: true,
          dimensions: sixDimensionScores,
          findings: [{
            key: `causality_gap_${opening}`,
            severity: 'S2',
            dimension: 'conflict_causality',
            evidence: `${opening}江澈推开仓门， 铜锁坠在地上。${closing}`,
            required_change: '补足铜锁坠地的动作原因',
            acceptance_test: '动作与结果形成因果链',
          }],
        }),
        deterministicScan: { hard_failures: [] },
        minScore: 78,
      })

      expect(decision.passed).toBe(false)
      expect(decision.hard_failures).toEqual([
        expect.objectContaining({ source: 'llm' }),
      ])
    }
  })

  test('keeps single-sided and mismatched quote evidence unlocatable', () => {
    const chapterText = '江澈推开仓门，铜锁坠在地上。'
    const evidenceCases = [
      '“江澈推开仓门，铜锁坠在地上。',
      '江澈推开仓门，铜锁坠在地上。”',
      '“江澈推开仓门，铜锁坠在地上。’',
    ]

    for (const [index, evidence] of evidenceCases.entries()) {
      const decision = buildProseQualityDecision({
        chapterText,
        review: normalizeProseQualityReview({
          score: 90,
          publishable: true,
          dimensions: sixDimensionScores,
          findings: [{
            key: `invalid_quote_${index}`,
            severity: 'S2',
            dimension: 'conflict_causality',
            evidence,
            required_change: '补足铜锁坠地的动作原因',
            acceptance_test: '动作与结果形成因果链',
          }],
        }),
        deterministicScan: { hard_failures: [] },
        minScore: 78,
      })

      expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
      expect(decision.advisory_failures.join('｜')).toContain(`invalid_quote_${index}`)
      expect(decision.advisory_failures.join('｜')).toContain('无法在当前正文定位')
    }
  })

  test('downgrades evidence longer than the bounded short-evidence limit', () => {
    const evidence = `${'甲'.repeat(500)}乙`
    const review = normalizeProseQualityReview({
      score: 90,
      publishable: true,
      dimensions: sixDimensionScores,
      findings: [{
        key: 'oversized_evidence',
        severity: 'S2',
        dimension: 'continuity',
        evidence,
        required_change: '修复连续性',
        acceptance_test: '证据可定位',
      }],
    })
    const decision = buildProseQualityDecision({
      chapterText: '甲'.repeat(500),
      review,
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(review.blocking_findings).toHaveLength(0)
    expect(review.advisory_findings).toEqual([
      expect.objectContaining({ key: 'oversized_evidence', severity: 'S3' }),
    ])
    expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(decision.advisory_failures.join('｜')).toContain('oversized_evidence')
  })

  test('deduplicates identical finding fingerprints without collapsing different evidence for the same key', () => {
    const repeated = {
      key: 'same_key',
      severity: 'S2',
      dimension: 'continuity',
      evidence: '第一处证据。',
      required_change: '补连续动作',
      acceptance_test: '动作连续',
    }
    const decision = buildProseQualityDecision({
      chapterText: '第一处证据。第二处证据。',
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [
          repeated,
          { ...repeated },
          { ...repeated, evidence: '第二处证据。' },
        ],
      }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision.hard_failures).toHaveLength(2)
    expect(decision.hard_failures.map(item => item.message)).toEqual([
      expect.stringContaining('第一处证据。'),
      expect.stringContaining('第二处证据。'),
    ])
  })

  test('gives locatable evidence precedence over an unlocatable finding with the same key', () => {
    const decision = buildProseQualityDecision({
      chapterText: '第一处证据。',
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [
          {
            key: 'shared_key',
            severity: 'S2',
            dimension: 'continuity',
            evidence: '第一处证据。',
            required_change: '补连续动作',
            acceptance_test: '动作连续',
          },
          {
            key: 'shared_key',
            severity: 'S2',
            dimension: 'continuity',
            evidence: '正文中不存在的重复诊断。',
            required_change: '补连续动作',
            acceptance_test: '动作连续',
          },
          {
            key: 'other_unlocatable',
            severity: 'S2',
            dimension: 'payoff_hook',
            evidence: '正文中不存在的章末钩子。',
            required_change: '补章末钩子',
            acceptance_test: '形成翻页理由',
          },
        ],
      }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision.hard_failures).toEqual([
      expect.objectContaining({ key: 'shared_key', source: 'llm' }),
    ])
    expect(decision.advisory_failures.some(item => item.startsWith('shared_key：'))).toBe(false)
    expect(decision.advisory_failures.some(item => item.startsWith('other_unlocatable：'))).toBe(true)
  })
})

