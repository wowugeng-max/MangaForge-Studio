import { describe, expect, test } from 'bun:test'
import { reduceChapterKernelProgress } from './use-chapter-kernel-job'

describe('reduceChapterKernelProgress', () => {
  test('keeps running elapsed from progress.elapsed_ms', () => {
    const next = reduceChapterKernelProgress(
      { phase: 'running', action: 'review', jobId: 'job-1', hint: '', elapsedSec: 0 },
      {
        ok: true,
        job: { id: 'job-1', status: 'running' },
        candidates: [],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'c',
          phase: 'running',
          elapsed_ms: 12000,
          hint: 'story-architect',
          error_code: '',
        },
      },
    )
    expect(next).toEqual({
      phase: 'running', action: 'review', jobId: 'job-1', hint: 'story-architect', elapsedSec: 12,
    })
  })

  test('switches to awaiting_selection', () => {
    const next = reduceChapterKernelProgress(
      { phase: 'running', action: 'review', jobId: 'job-1', hint: '', elapsedSec: 8 },
      {
        ok: true,
        job: { id: 'job-1', status: 'awaiting_selection' },
        candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'cand-1',
          phase: 'awaiting_selection',
          elapsed_ms: 8000,
          hint: '',
          error_code: '',
        },
      },
    )
    expect(next.phase).toBe('awaiting_selection')
  })
})
