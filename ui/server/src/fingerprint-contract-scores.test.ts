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

// Simulates a caller whose top-level pass/total/score claim a perfect run (as production
// code might, if it forgot to fold the hard gate in) while checks[] records that the
// zhuque_narrative_hard gate itself failed. The build side must not trust those top-level
// fields; it must derive pass/total/score from checks[].
function contractScoreHardGateFailure() {
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
    score: 1,
    pass: 9,
    total: 9,
    narrative_hard_pass: false,
    narrative_hard_hit: 1,
    checks: [
      ...keys.map((key) => ({ key, ok: true, value: 0.2, target: 0.35 })),
      { key: 'zhuque_narrative_hard', ok: false, value: 1, target: 0 },
    ],
  }
}

// The no-contract degraded shape: only the hard gate ran, no stat checks at all.
function degradedContractScore() {
  return {
    score: 1,
    pass: 1,
    total: 1,
    narrative_hard_pass: true,
    narrative_hard_hit: 0,
    checks: [{ key: 'zhuque_narrative_hard', ok: true, value: 0, target: 0 }],
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

  test('regression: a failed narrative hard gate must not be invisible in the stored score, even when the caller-supplied top-level fields claim a perfect run', () => {
    const built = record({ contractScore: contractScoreHardGateFailure() })
    const payload = JSON.parse(built.payload)
    expect(payload.pass).toBe(8)
    expect(payload.total).toBe(9)
    expect(payload.score).toBe(0.889)

    const parsed = parseFingerprintScoreRow({ payload: built.payload })!
    expect(parsed.pass).toBe(8)
    expect(parsed.total).toBe(9)
    expect(parsed.score).toBe(0.889)

    const agg = aggregateFingerprintScores([{ payload: built.payload }])
    const builtin = agg.find((r) => r.set_id === 'builtin')!
    expect(builtin.average_score).toBe(0.889)
    const hard = builtin.check_pass_rates.find((c) => c.key === 'zhuque_narrative_hard')!
    expect(hard.pass_rate).toBe(0)
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

  test('aggregates a degraded no-contract row (only the hard gate, total=1) without crashing', () => {
    const row = record({ contractName: null, contractScore: degradedContractScore() })
    const agg = aggregateFingerprintScores([row])
    expect(agg.length).toBe(1)
    const builtin = agg[0]
    expect(builtin.set_id).toBe('builtin')
    expect(builtin.chapter_count).toBe(1)
    expect(builtin.average_score).toBe(0)
    const hard = builtin.check_pass_rates.find((c) => c.key === 'zhuque_narrative_hard')!
    expect(hard.pass_rate).toBe(1)
    expect(hard.sample_count).toBe(1)
  })

  test('mixes a degraded row and a full row in the same contract set without polluting per-check sample counts', () => {
    const full = record({ contractScore: contractScore(7) })
    const degraded = record({ contractName: null, contractScore: degradedContractScore() })
    const agg = aggregateFingerprintScores([full, degraded])
    expect(agg.length).toBe(1)
    const builtin = agg[0]
    expect(builtin.chapter_count).toBe(2)
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.sample_count).toBe(1)
    const hard = builtin.check_pass_rates.find((c) => c.key === 'zhuque_narrative_hard')!
    expect(hard.sample_count).toBe(2)
  })

  test('reports each check mean value and target alongside the pass rate', () => {
    const rows = [
      record({ contractScore: contractScore(9) }),
      record({ contractScore: contractScore(9, { dialogue_para_ratio: false }) }),
    ]
    const builtin = aggregateFingerprintScores(rows).find((r) => r.set_id === 'builtin')!
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.mean_value).toBeCloseTo(0.2, 5)
    expect(dialogue.target).toBe(0.35)
  })

  // Builds a payload like `record()` but with a caller-chosen target for one check key, so
  // two records can disagree on target the way two contract revisions would.
  function recordWithTarget(key: string, target: number, createdAt: string) {
    const built = record({ contractScore: contractScore(9), createdAt })
    const payload = JSON.parse(built.payload)
    payload.checks = payload.checks.map((c: any) => (c.key === key ? { ...c, target } : c))
    return { payload: JSON.stringify(payload) }
  }

  test('target reflects the most recently created record for that check, even when it is processed first (out-of-order input)', () => {
    // Simulates the real route ordering: projects come back updated_at DESC, so a project
    // that scored more recently with a raised threshold can appear before an older project
    // that scored long ago with the old threshold, even though its own row is newer.
    const older = recordWithTarget('dialogue_para_ratio', 0.3, '2026-01-01T00:00:00.000Z')
    const newer = recordWithTarget('dialogue_para_ratio', 0.35, '2026-06-01T00:00:00.000Z')
    // newer is placed first to simulate the non-chronological row order.
    const agg = aggregateFingerprintScores([newer, older])
    const builtin = agg.find((r) => r.set_id === 'builtin')!
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.target).toBe(0.35)
    // both rows must still be folded into the pass-rate/sample-count stats regardless of
    // which one wins the target slot.
    expect(dialogue.sample_count).toBe(2)
    expect(builtin.chapter_count).toBe(2)
  })

  test('a record with missing created_at is not allowed to corrupt target selection', () => {
    const dated = recordWithTarget('dialogue_para_ratio', 0.35, '2026-03-01T00:00:00.000Z')
    const undatedPayload = JSON.parse(dated.payload)
    delete undatedPayload.created_at
    undatedPayload.checks = undatedPayload.checks.map((c: any) => (c.key === 'dialogue_para_ratio' ? { ...c, target: 0.99 } : c))
    const undated = { payload: JSON.stringify(undatedPayload) }

    // The undated row arrives after the dated one; it must not clobber the target the
    // dated row already established.
    const agg = aggregateFingerprintScores([dated, undated])
    const builtin = agg.find((r) => r.set_id === 'builtin')!
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.target).toBe(0.35)
    expect(dialogue.sample_count).toBe(2)
  })

  test('leaves target null when no row carried one', () => {
    const built = buildFingerprintScoreReviewRecord({
      projectId: 1,
      chapterId: 1,
      chapterNo: 1,
      setId: 'set-x',
      setLabel: 'X',
      contractName: null,
      locked: false,
      contractScore: { score: 0, pass: 0, total: 1, narrative_hard_pass: false, narrative_hard_hit: 1, checks: [] },
      textChars: 100,
      createdAt: '2026-07-27T00:00:00.000Z',
    })
    const out = aggregateFingerprintScores([built]).find((r) => r.set_id === 'set-x')!
    expect(out.check_pass_rates).toEqual([])
  })
})
