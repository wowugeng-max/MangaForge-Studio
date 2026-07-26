import { describe, expect, test } from 'bun:test'
import {
  CHECK_LABELS,
  buildCheckPassRateItems,
  buildContractSetRows,
  canApplyJobUpdate,
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
