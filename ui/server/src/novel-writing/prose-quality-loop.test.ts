import { describe, expect, test } from 'bun:test'
import {
  assertProseQualityCanStore,
  buildFocusedProseReviewPrompt,
  buildFocusedProseRevisionPrompt,
  buildProseQualityDecision,
  normalizeProseQualityReview,
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
      review: normalizeProseQualityReview({
        score: 92,
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
      review: normalizeProseQualityReview({ score: 76, findings: [] }),
      deterministicScan: { hard_failures: [] },
      minScore: 78,
    })

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(true)
    expect(assertProseQualityCanStore(decision, { approved: true })).toBe(true)
    expect(() => assertProseQualityCanStore(decision)).toThrowError(/评分未获批准/)
  })
})

describe('bounded prose quality loop', () => {
  test('runs a fresh deterministic scan and independent review after revision', async () => {
    const scans: string[] = []
    const reviews: string[] = []
    const result = await runProseQualityLoop({
      initialText: '初稿：江澈站着等。'.repeat(80),
      minScore: 78,
      coreContract: { chapter_no: 10, reader_promise: '主角主动破局' },
      scan: text => {
        scans.push(text)
        return {
          hard_failures: text.startsWith('初稿')
            ? [{ key: 'agency', message: '主角没有行动' }]
            : [],
        }
      },
      review: async ({ text }) => {
        reviews.push(text)
        return text.startsWith('初稿')
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'agency',
                severity: 'S2',
                dimension: 'core_promise_agency',
                evidence: '江澈站着等。',
                required_change: '让江澈主动破围',
                acceptance_test: '包围因主角动作改变',
              }],
            }
          : {
              score: 86,
              dimensions: { ...sixDimensionScores, core_promise_agency: 9, payoff_hook: 9 },
              publishable: true,
              findings: [],
            }
      },
      revise: async () => ({
        final_text: '修订：江澈踏碎路面，借飞石逼退第一排追兵。'.repeat(80),
      }),
    })

    expect(scans).toHaveLength(2)
    expect(reviews).toHaveLength(2)
    expect(reviews[1]).toBe(result.final_text)
    expect(result.decision.passed).toBe(true)
    expect(result.rounds).toHaveLength(1)
  })

  test('stops after two failed revision rounds', async () => {
    let revisionCalls = 0
    const result = await runProseQualityLoop({
      initialText: '主角等待。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => ({
        score: 70,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '主角等待。',
          required_change: '主动行动',
          acceptance_test: '主角改变结果',
        }],
      }),
      revise: async ({ round }) => {
        revisionCalls += 1
        return { final_text: `第${round}轮修订：主角仍在等待。`.repeat(120) }
      },
    })

    expect(revisionCalls).toBe(2)
    expect(result.rounds).toHaveLength(2)
    expect(result.decision.passed).toBe(false)
  })

  test('fails closed when an independent recheck throws', async () => {
    let reviewCalls = 0
    await expect(runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        if (reviewCalls > 1) throw new Error('timeout')
        return {
          score: 70,
          dimensions: sixDimensionScores,
          findings: [{
            key: 'hook',
            severity: 'S2',
            dimension: 'payoff_hook',
            evidence: '初稿问题。',
            required_change: '补章末新问题',
            acceptance_test: '末段形成明确翻页理由',
          }],
        }
      },
      revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
    })).rejects.toMatchObject({ code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE' })
  })

  test('treats an empty structured recheck as unavailable', async () => {
    let reviewCalls = 0
    await expect(runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        return reviewCalls === 1
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'hook',
                severity: 'S2',
                dimension: 'payoff_hook',
                evidence: '初稿问题。',
                required_change: '补章末问题',
                acceptance_test: '末段形成翻页理由',
              }],
            }
          : {}
      },
      revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
    })).rejects.toMatchObject({ code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE' })
  })

  test('rejects an unusable initial six-dimension review', async () => {
    await expect(runProseQualityLoop({
      initialText: '初稿。'.repeat(120),
      minScore: 78,
      scan: () => ({ hard_failures: [] }),
      review: async () => ({ score: 90, findings: [] }),
      revise: async () => ({ final_text: '不会调用。' }),
    })).rejects.toMatchObject({ code: 'PROSE_REVIEW_FAILED' })
  })

  test('builds focused review and revision prompts around prose evidence', () => {
    const reviewPrompt = buildFocusedProseReviewPrompt({
      coreContract: { chapter_no: 10, reader_promise: '行动破局' },
      chapterText: 'CHAPTER_TEXT_SENTINEL',
      deterministicScan: { hard_failures: [{ key: 'meta', message: '工程词' }] },
    })
    const revisionPrompt = buildFocusedProseRevisionPrompt({
      coreContract: { chapter_no: 10, reader_promise: '行动破局' },
      chapterText: 'CHAPTER_TEXT_SENTINEL',
      round: 1,
      blockingFindings: Array.from({ length: 8 }, (_, index) => ({
        key: `finding_${index}`,
        severity: 'S2' as const,
        dimension: 'conflict_causality' as const,
        evidence: `EVIDENCE_${index}`,
        required_change: `CHANGE_${index}`,
        acceptance_test: `TEST_${index}`,
      })),
    })

    expect(reviewPrompt).toContain('continuity')
    expect(reviewPrompt).toContain('fact_setting_safety')
    expect(reviewPrompt).toContain('CHAPTER_TEXT_SENTINEL')
    expect(revisionPrompt).toContain('EVIDENCE_0')
    expect(revisionPrompt).toContain('EVIDENCE_5')
    expect(revisionPrompt).not.toContain('EVIDENCE_6')
    expect(revisionPrompt).toContain('完整章节正文')
  })
})
