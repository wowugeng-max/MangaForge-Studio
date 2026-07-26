import { describe, expect, test } from 'bun:test'
import {
  FINGERPRINT_SCORE_REVIEW_TYPE,
  aggregateFingerprintScores,
  buildFingerprintScoreReviewRecord,
  parseFingerprintScoreRow,
} from './fingerprint-contract-scores'

function contractScore(pass: number, overrides: Record<string, boolean> = {}) {
  const keys = [
    'cv_para',
    'single_sentence_para_ratio',
    'two_sentence_para_ratio',
    'dialogue_para_ratio',
    'max_mid_streak',
    'template_contrast_per_1k',
    'stock_adverb_per_1k',
    'clinical_hit_per_1k',
    'subject_ta_opener_ratio',
  ]
  return {
    score: Number((pass / 9).toFixed(3)),
    pass,
    total: 9,
    narrative_hard_pass: true,
    narrative_hard_hit: 0,
    checks: [
      ...keys.map((key, i) => ({ key, ok: overrides[key] ?? i < pass, value: 0.2, target: 0.35 })),
      { key: 'zhuque_narrative_hard', ok: true, value: 0, target: 0 },
    ],
  }
}

function record(over: Partial<Parameters<typeof buildFingerprintScoreReviewRecord>[0]> = {}) {
  return buildFingerprintScoreReviewRecord({
    projectId: 7,
    chapterId: 42,
    chapterNo: 3,
    setId: 'builtin',
    setLabel: '内置合同（随仓库）',
    contractName: 'qidian_free_rank_human',
    locked: false,
    contractScore: contractScore(7),
    textChars: 4200,
    createdAt: '2026-07-26T10:00:00.000Z',
    ...over,
  })
}

describe('fingerprint score review record', () => {
  test('uses its own review type and embeds chapter identity in payload', () => {
    const built = record()
    expect(built.review_type).toBe(FINGERPRINT_SCORE_REVIEW_TYPE)
    expect(built.review_type).not.toBe('prose_quality')
    const payload = JSON.parse(built.payload)
    expect(payload.chapter_id).toBe(42)
    expect(payload.chapter_no).toBe(3)
    expect(payload.set_id).toBe('builtin')
    expect(payload.contract_name).toBe('qidian_free_rank_human')
    expect(payload.checks.length).toBe(10)
  })

  test('marks status attention below two thirds and lists failing checks as issues', () => {
    const low = record({ contractScore: contractScore(5) })
    expect(low.status).toBe('attention')
    expect(low.issues.length).toBeGreaterThan(0)
    const high = record({ contractScore: contractScore(8) })
    expect(high.status).toBe('passed')
  })

  test('summary carries the pass ratio and set label', () => {
    expect(record().summary).toContain('7/9')
    expect(record().summary).toContain('内置合同')
  })

  test('tolerates the degraded no-contract score shape', () => {
    const built = record({
      contractName: null,
      contractScore: { score: 1, pass: 1, total: 1, narrative_hard_pass: true, narrative_hard_hit: 0, checks: [{ key: 'zhuque_narrative_hard', ok: true, value: 0, target: 0 }] },
    })
    const payload = JSON.parse(built.payload)
    expect(payload.checks.length).toBe(1)
    expect(payload.contract_name).toBe(null)
  })
})

describe('aggregateFingerprintScores', () => {
  test('groups by set and computes average score and per-check pass rates', () => {
    const rows = [
      record({ contractScore: contractScore(9) }),
      record({ contractScore: contractScore(9, { dialogue_para_ratio: false }) }),
      record({ setId: 'set-a', setLabel: '离线 A', contractScore: contractScore(6) }),
    ]
    const out = aggregateFingerprintScores(rows)
    const builtin = out.find((r) => r.set_id === 'builtin')!
    expect(builtin.chapter_count).toBe(2)
    expect(builtin.average_score).toBeCloseTo(0.944, 2)
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.pass_rate).toBeCloseTo(0.5, 5)
    expect(dialogue.sample_count).toBe(2)
    expect(out.find((r) => r.set_id === 'set-a')!.chapter_count).toBe(1)
  })

  test('ignores unparseable rows', () => {
    expect(aggregateFingerprintScores([{ payload: 'not json' }, { payload: null }])).toEqual([])
    expect(parseFingerprintScoreRow({ payload: 'not json' })).toBe(null)
  })
})
