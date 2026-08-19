import { describe, expect, test } from 'bun:test'
import { reduceChapterWriteProgress } from './use-chapter-write-job'

describe('reduceChapterWriteProgress', () => {
  test('keeps running elapsed from progress.elapsed_ms', () => {
    const next = reduceChapterWriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 0 },
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
      phase: 'running', jobId: 'job-1', hint: 'story-architect', elapsedSec: 12,
    })
  })

  test('maps failed status to failed phase', () => {
    const next = reduceChapterWriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 8 },
      {
        ok: true,
        job: { id: 'job-1', status: 'failed', error_code: 'OUTLINE_MISSING' },
        candidates: [],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'c',
          phase: 'failed',
          elapsed_ms: 8000,
          hint: '',
          error_code: 'OUTLINE_MISSING',
        },
      },
    )
    expect(next).toEqual({
      phase: 'failed', jobId: 'job-1', errorCode: 'OUTLINE_MISSING',
    })
  })

  test('maps awaiting_selection to failed and does not keep a selection phase', () => {
    const next = reduceChapterWriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 8 },
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
    expect(next).toEqual({
      phase: 'failed', jobId: 'job-1', errorCode: 'AWAITING_SELECTION',
    })
    expect(next.phase).not.toBe('awaiting_selection')
  })
})
