import { describe, expect, test } from 'bun:test'
import {
  CHECK_LABELS,
  buildCheckPassRateItems,
  buildContractDetailRows,
  buildContractSetRows,
  canApplyJobUpdate,
  formatSamplesStatusText,
  nextJobPollDelayMs,
  shouldResumeJobPolling,
} from './fingerprintContractsModel'

describe('buildContractSetRows', () => {
  const sets = [
    { id: 'builtin', label: '内置合同（随仓库）', mode: 'builtin', created_at: '', sample_count: 0 },
    { id: 'set-a', label: '离线 A', mode: 'offline_refit', created_at: '2026-07-26T00:00:00.000Z', sample_count: 810 },
  ]

  test('marks the active and locked sets and flags builtin', () => {
    const rows = buildContractSetRows({
      sets,
      selection: { active_set_id: 'set-a', locked: { set_id: 'set-a', key: 'active' } },
      aggregates: [],
    })
    expect(rows[0].is_builtin).toBe(true)
    expect(rows[0].is_active).toBe(false)
    expect(rows[1].is_active).toBe(true)
    expect(rows[1].is_locked).toBe(true)
  })

  test('joins score aggregates and target summaries onto rows', () => {
    const rows = buildContractSetRows({
      sets,
      selection: { active_set_id: 'builtin', locked: null },
      aggregates: [{ set_id: 'set-a', set_label: '离线 A', chapter_count: 12, average_score: 0.812, check_pass_rates: [] }],
      targets: { 'set-a': { subject_ta_opener_ratio_max: 0.35 } },
    })
    const setA = rows.find((r) => r.id === 'set-a')!
    expect(setA.chapter_count).toBe(12)
    expect(setA.average_score).toBe(0.812)
    expect(setA.ta_max).toBe(0.35)
    expect(rows.find((r) => r.id === 'builtin')!.average_score).toBe(null)
  })
})

describe('buildCheckPassRateItems', () => {
  test('labels known checks and tones them by pass rate', () => {
    const items = buildCheckPassRateItems({
      check_pass_rates: [
        { key: 'cv_para', pass_rate: 0.98, sample_count: 50 },
        { key: 'dialogue_para_ratio', pass_rate: 0.7, sample_count: 50 },
        { key: 'subject_ta_opener_ratio', pass_rate: 0.4, sample_count: 50 },
      ],
    })
    expect(items[0].label).toBe(CHECK_LABELS.cv_para)
    expect(items[0].tone).toBe('good')
    expect(items[1].tone).toBe('warn')
    expect(items[2].tone).toBe('bad')
  })

  test('falls back to the raw key for unknown checks and handles empty input', () => {
    expect(buildCheckPassRateItems({ check_pass_rates: [{ key: 'mystery', pass_rate: 1, sample_count: 1 }] })[0].label).toBe('mystery')
    expect(buildCheckPassRateItems(null)).toEqual([])
  })
})

describe('nextJobPollDelayMs', () => {
  test('polls while queued or running and stops when settled', () => {
    expect(nextJobPollDelayMs({ status: 'queued' }, 0)).toBe(2000)
    expect(nextJobPollDelayMs({ status: 'running' }, 0)).toBe(2000)
    expect(nextJobPollDelayMs({ status: 'completed' }, 0)).toBe(null)
    expect(nextJobPollDelayMs({ status: 'failed' }, 0)).toBe(null)
    expect(nextJobPollDelayMs(null, 0)).toBe(null)
  })

  test('backs off after repeated failures', () => {
    expect(nextJobPollDelayMs({ status: 'running' }, 1)).toBe(5000)
    expect(nextJobPollDelayMs({ status: 'running' }, 3)).toBe(15000)
  })
})

describe('canApplyJobUpdate', () => {
  test('allows applying an update while mounted and the token still owns the poll loop', () => {
    expect(canApplyJobUpdate(true, 1, 1)).toBe(true)
  })

  test('blocks applying an update after unmount even when the token still matches', () => {
    expect(canApplyJobUpdate(false, 1, 1)).toBe(false)
  })

  test('blocks applying an update once a newer poll loop has taken over the token', () => {
    expect(canApplyJobUpdate(true, 1, 2)).toBe(false)
  })
})

describe('shouldResumeJobPolling', () => {
  test('resumes when a job id is stored and nothing is currently polling it', () => {
    expect(shouldResumeJobPolling('job-1', null)).toBe(true)
  })

  test('does not resume when there is no stored job id', () => {
    expect(shouldResumeJobPolling(null, null)).toBe(false)
    expect(shouldResumeJobPolling('', null)).toBe(false)
  })

  test('does not resume when the stored job is already being polled by another loop', () => {
    expect(shouldResumeJobPolling('job-1', 'job-1')).toBe(false)
  })

  test('resumes a stored job even if a different job is being polled', () => {
    expect(shouldResumeJobPolling('job-1', 'job-2')).toBe(true)
  })
})

describe('buildContractDetailRows', () => {
  const detail = {
    record: { id: 'set-a', label: '离线 A', mode: 'offline_refit', sample_count: 810, created_at: '2026-07-27T00:00:00.000Z' },
    contract: {
      name: 'qidian_free_rank_human',
      built_from: ['a', 'b'],
      target: {
        cv_para: [0.483, 0.699],
        single_sentence_para_ratio: [0.792, 0.977],
        two_sentence_para_ratio: [0.021, 0.168],
        dialogue_para_ratio: [0.099, 0.328],
        max_mid_streak_max: 6,
        template_contrast_per_1k_max: 1,
        stock_adverb_per_1k_max: 1.5,
        clinical_hit_per_1k_max: 0.5,
        subject_ta_opener_ratio_max: 0.35,
      },
    },
    meta: { mode: 'offline_refit', sample_count: 810, genre_count: 12, inherited_prose_from: 'builtin' },
  }

  test('renders range targets as a dash-joined span and scalar targets as-is', () => {
    const rows = buildContractDetailRows(detail)
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]))
    expect(byLabel['句长突发 cv']).toBe('0.483–0.699')
    expect(byLabel['他/姓名起句占比 上限']).toBe('0.35')
    expect(byLabel['合同名']).toBe('qidian_free_rank_human')
  })

  test('surfaces generation meta and the inherited-prose source', () => {
    const byLabel = Object.fromEntries(buildContractDetailRows(detail).map((r) => [r.label, r.value]))
    expect(byLabel['样本数']).toBe('810')
    expect(byLabel['题材合同数']).toBe('12')
    expect(byLabel['散文字段继承自']).toBe('builtin')
  })

  test('renders missing pieces as a dash instead of throwing', () => {
    const rows = buildContractDetailRows({ record: { id: 'builtin', label: '内置' }, contract: null, meta: null })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => typeof r.value === 'string')).toBe(true)
    expect(rows.some((r) => r.value === '—')).toBe(true)
  })

  test('returns an empty list for a null detail', () => {
    expect(buildContractDetailRows(null)).toEqual([])
  })
})

describe('formatSamplesStatusText', () => {
  test('lists the per-genre breakdown in descending order', () => {
    const text = formatSamplesStatusText({ available: true, count: 810, by_genre: { urban: 174, xianxia: 154, wuxia: 12 } })
    expect(text).toContain('810')
    expect(text.indexOf('urban 174')).toBeLessThan(text.indexOf('xianxia 154'))
    expect(text).toContain('wuxia 12')
  })

  test('explains the unavailable case without a breakdown', () => {
    const text = formatSamplesStatusText({ available: false, count: 0, by_genre: {} })
    expect(text).toContain('样本库为空')
    expect(text).not.toContain('按题材')
  })

  test('tolerates a null status', () => {
    expect(typeof formatSamplesStatusText(null)).toBe('string')
  })
})

describe('buildCheckPassRateItems tooltip', () => {
  test('includes target, mean and sample count', () => {
    const items = buildCheckPassRateItems({
      check_pass_rates: [
        { key: 'dialogue_para_ratio', pass_rate: 0.5, sample_count: 4, mean_value: 0.21, target: [0.099, 0.328] },
        { key: 'subject_ta_opener_ratio', pass_rate: 1, sample_count: 4, mean_value: 0.12, target: 0.35 },
      ],
    })
    expect(items[0].tooltip).toContain('0.099–0.328')
    expect(items[0].tooltip).toContain('0.21')
    expect(items[0].tooltip).toContain('4')
    expect(items[1].tooltip).toContain('0.35')
  })

  test('renders a dash when target and mean are absent', () => {
    const items = buildCheckPassRateItems({ check_pass_rates: [{ key: 'cv_para', pass_rate: 1, sample_count: 1 }] })
    expect(items[0].tooltip).toContain('—')
  })
})
