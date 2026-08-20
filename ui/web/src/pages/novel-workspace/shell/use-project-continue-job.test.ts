import { describe, expect, mock, test } from 'bun:test'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  reduceProjectContinueProgress,
  runContinueJob,
} from './use-project-continue-job'

function jobDetail(status: string, id = 'job-1'): KernelJobDetail {
  return {
    ok: true,
    job: { id, status },
    candidates: [],
    artifacts: [],
    progress: {
      job_id: id,
      candidate_id: 'c',
      phase: status,
      elapsed_ms: 1000,
      hint: '',
      error_code: '',
    },
  }
}

describe('reduceProjectContinueProgress', () => {
  test('maps committed status to idle', () => {
    const next = reduceProjectContinueProgress(
      { phase: 'running', jobId: 'job-1', hint: '正在续写第 2–3 章', elapsedSec: 8 },
      {
        ok: true,
        job: { id: 'job-1', status: 'committed' },
        candidates: [],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'c',
          phase: 'committed',
          elapsed_ms: 8000,
          hint: '',
          error_code: '',
        },
      },
    )
    expect(next).toEqual({ phase: 'idle' })
  })

  test('maps awaiting_selection to failed and does not keep a selection phase', () => {
    const next = reduceProjectContinueProgress(
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

describe('runContinueJob', () => {
  test('createJobByVerb uses write_continue on a project subject', async () => {
    const seen: any[] = []
    const createJobByVerb = mock(async (input: any) => {
      seen.push(input)
      return { ok: true as const, jobId: 'job-c' }
    })
    const result = await runContinueJob({
      api: {
        createJobByVerb,
        getJob: async () => jobDetail('committed', 'job-c'),
        cancelJob: async () => ({ ok: true as const }),
      },
      projectId: 3,
      fromChapterNo: 2,
      count: 2,
      modelId: 7,
      flushPendingSave: async () => true,
      loadProjectModules: async () => {},
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(result).toEqual({ kind: 'committed' })
    expect(seen[0].verb).toBe('write_continue')
    expect(seen[0].subjectType).toBe('project')
    expect(seen[0].subjectId).toBe(3)
    expect(seen[0].chapterId).toBe(0)
    expect(seen[0].verbParams).toEqual({ from_chapter_no: 2, count: 2 })
  })

  test('create_failed includes KernelApiError message', async () => {
    const result = await runContinueJob({
      api: {
        createJobByVerb: async () => ({
          ok: false as const,
          status: 409,
          code: 'CHAPTER_HAS_PROSE',
          message: '第 3 章已有正文',
        }),
        getJob: async () => {
          throw new Error('should not poll')
        },
        cancelJob: async () => ({ ok: true as const }),
      },
      projectId: 3,
      fromChapterNo: 2,
      count: 2,
      modelId: 7,
      flushPendingSave: async () => true,
      loadProjectModules: async () => {},
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(result).toEqual({
      kind: 'create_failed',
      code: 'CHAPTER_HAS_PROSE',
      message: '第 3 章已有正文',
    })
  })
})
