import { describe, expect, mock, test } from 'bun:test'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  cancelWriteChapterJob,
  reduceChapterWriteProgress,
  runWriteChapterJob,
} from './use-chapter-write-job'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

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

describe('cancelWriteChapterJob', () => {
  test('cancels jobIdRef even when state jobId is still empty', async () => {
    const abort = mock(() => {})
    const cancelJob = mock(async () => ({ ok: true as const }))
    const jobIdRef = { current: 'job-from-create' }
    await cancelWriteChapterJob({
      abort,
      cancelJob,
      jobIdRef,
      stateJobId: '',
    })
    expect(abort).toHaveBeenCalledTimes(1)
    expect(cancelJob).toHaveBeenCalledWith('job-from-create')
    expect(jobIdRef.current).toBe('')
  })
})

describe('runWriteChapterJob abort', () => {
  test('stop during createJobByVerb cancels the job id that returns', async () => {
    const createStarted = deferred<void>()
    const createResult = deferred<{ ok: true; jobId: string }>()
    const cancelJob = mock(async () => ({ ok: true as const }))
    const getJob = mock(async () => {
      throw new Error('should not poll')
    })
    const loadProjectModules = mock(async () => {})
    const jobIdRef = { current: '' }
    const controller = new AbortController()

    const runPromise = runWriteChapterJob({
      api: {
        createJobByVerb: async () => {
          createStarted.resolve()
          return createResult.promise
        },
        getJob,
        cancelJob,
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules,
      signal: controller.signal,
      jobIdRef,
    })

    await createStarted.promise
    await cancelWriteChapterJob({
      abort: () => controller.abort(),
      cancelJob,
      jobIdRef,
      stateJobId: '',
    })
    createResult.resolve({ ok: true, jobId: 'job-late' })

    expect(await runPromise).toEqual({ kind: 'aborted' })
    expect(cancelJob).toHaveBeenCalledWith('job-late')
    expect(getJob).not.toHaveBeenCalled()
    expect(loadProjectModules).not.toHaveBeenCalled()
  })

  test('abort after create before poll terminal calls cancelJob', async () => {
    const pollStarted = deferred<void>()
    const pollResult = deferred<KernelJobDetail>()
    const cancelJob = mock(async () => ({ ok: true as const }))
    const loadProjectModules = mock(async () => {})
    const jobIdRef = { current: '' }
    const controller = new AbortController()

    const runPromise = runWriteChapterJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-42' }),
        getJob: async () => {
          pollStarted.resolve()
          return pollResult.promise
        },
        cancelJob,
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules,
      signal: controller.signal,
      jobIdRef,
    })

    await pollStarted.promise
    expect(jobIdRef.current).toBe('job-42')
    controller.abort()
    pollResult.resolve(jobDetail('running', 'job-42'))

    expect(await runPromise).toEqual({ kind: 'aborted' })
    expect(cancelJob).toHaveBeenCalledWith('job-42')
    expect(loadProjectModules).not.toHaveBeenCalled()
  })

  test('does not treat committed as success when abort is already set', async () => {
    const cancelJob = mock(async () => ({ ok: true as const }))
    const loadProjectModules = mock(async () => {})
    const jobIdRef = { current: '' }
    const controller = new AbortController()

    const result = await runWriteChapterJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-9' }),
        getJob: async () => jobDetail('committed', 'job-9'),
        cancelJob,
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules,
      signal: controller.signal,
      jobIdRef,
      pollJob: async () => {
        controller.abort()
        return jobDetail('committed', 'job-9')
      },
    })

    expect(result.kind).not.toBe('committed')
    expect(loadProjectModules).not.toHaveBeenCalled()
  })
})
