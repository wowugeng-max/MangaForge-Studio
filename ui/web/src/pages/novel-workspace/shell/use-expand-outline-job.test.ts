import { afterEach, describe, expect, mock, test } from 'bun:test'
import * as React from 'react'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import { expandOutlineCreateFailureText } from '../expand-outline-ui'
import {
  commitExpandOutlineJob,
  reduceExpandOutlineProgress,
  resumeExpandOutlineJob,
  runExpandOutlineJob,
  useExpandOutlineJob,
} from './use-expand-outline-job'

function jobDetail(status: string, extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: extra.job?.id || 'job-1', status, error_code: extra.job?.error_code },
    candidates: extra.candidates || [{
      id: 'cand-1',
      contract_id: 'oh-story-core.story-long-write.expand',
      status: 'succeeded',
    }],
    artifacts: extra.artifacts || [],
    progress: extra.progress || {
      job_id: extra.job?.id || 'job-1',
      candidate_id: 'c1',
      phase: status,
      elapsed_ms: 4000,
      hint: 'harvest',
      error_code: extra.job?.error_code || '',
    },
    ...extra,
  }
}

describe('reduceExpandOutlineProgress', () => {
  test('keeps awaiting_selection as preview instead of failed', () => {
    const next = reduceExpandOutlineProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 4 },
      jobDetail('awaiting_selection', {
        artifacts: [{
          id: 'art-1',
          candidate_id: 'cand-1',
          rel_path: '大纲/第002章.md',
          artifact_kind: 'outline_doc',
        }],
      }),
    )
    expect(next.phase).toBe('awaiting_selection')
    expect(next.phase).not.toBe('failed')
    if (next.phase === 'awaiting_selection') {
      expect(next.jobId).toBe('job-1')
      expect(next.candidateId).toBe('cand-1')
    }
  })

  test('failed gate has no preview phase', () => {
    const detail = jobDetail('failed', {
      job: { id: 'job-fail', status: 'failed', error_code: 'REJECT_CHAPTER_TEXT' },
    })
    const next = reduceExpandOutlineProgress(
      { phase: 'running', jobId: 'job-fail', hint: '', elapsedSec: 2 },
      detail,
    )
    expect(next).toMatchObject({ phase: 'failed', jobId: 'job-fail', errorCode: 'REJECT_CHAPTER_TEXT' })
  })
})

describe('runExpandOutlineJob', () => {
  test('createJobByVerb sends project subject equal to projectId and no subject_key', async () => {
    const seen: any[] = []
    const result = await runExpandOutlineJob({
      api: {
        createJobByVerb: async (input) => {
          seen.push(input)
          return { ok: true as const, jobId: 'job-e' }
        },
        getJob: async () => jobDetail('awaiting_selection', { job: { id: 'job-e', status: 'awaiting_selection' } }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 6,
      modelId: 304,
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(seen[0]).toMatchObject({
      projectId: 6,
      chapterId: 0,
      modelId: 304,
      verb: 'expand_outline',
      subjectType: 'project',
      subjectId: 6,
    })
    expect(seen[0].subjectId).toBe(seen[0].projectId)
    expect(seen[0].subjectKey).toBeUndefined()
    expect(seen[0].verbParams).toBeUndefined()
    expect(seen[0].userBrief).toBeUndefined()
    expect(seen[0].contractIds).toBeUndefined()
    expect(result.kind).toBe('awaiting_selection')
  })

  test('poll awaiting_selection is not folded to failed', async () => {
    const result = await runExpandOutlineJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
        getJob: async () => jobDetail('awaiting_selection'),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 6,
      modelId: 304,
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(result.kind).toBe('awaiting_selection')
    expect(result.kind).not.toBe('failed')
  })

  test('409 resumes existing job and empty list stays create_failed', async () => {
    const listed = await runExpandOutlineJob({
      api: {
        createJobByVerb: async () => ({
          ok: false as const,
          status: 409,
          code: 'PROJECT_JOB_RUNNING',
          message: 'busy',
        }),
        getJob: async () => jobDetail('awaiting_selection', { job: { id: 'job-old', status: 'awaiting_selection' } }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({
          ok: true as const,
          jobs: [{ id: 'job-old', status: 'awaiting_selection', created_at: '2026-08-27T00:00:00Z' }],
        }),
      },
      projectId: 6,
      modelId: 304,
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(listed.kind).toBe('awaiting_selection')
    if (listed.kind === 'awaiting_selection') expect(listed.jobId).toBe('job-old')

    const empty = await runExpandOutlineJob({
      api: {
        createJobByVerb: async () => ({
          ok: false as const,
          status: 409,
          code: 'PROJECT_JOB_RUNNING',
          message: 'busy',
        }),
        getJob: async () => jobDetail('failed'),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 6,
      modelId: 304,
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(empty).toMatchObject({ kind: 'create_failed', code: 'PROJECT_JOB_RUNNING' })
    expect(expandOutlineCreateFailureText('PROJECT_JOB_RUNNING')).toBe('该项目扩纲未结束')
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')?.text).toBe('同项目同动词任务未结束')
  })
})

describe('resumeExpandOutlineJob', () => {
  test('lists by projectId and verb expand_outline', async () => {
    const listJobs = mock(async (query: { verb?: string; projectId?: number }) => {
      expect(query).toEqual({ verb: 'expand_outline', projectId: 6 })
      return {
        ok: true as const,
        jobs: [{ id: 'job-new', status: 'awaiting_selection', created_at: '2026-08-27T00:00:00Z' }],
      }
    })
    const getJob = mock(async () => jobDetail('awaiting_selection', {
      job: { id: 'job-new', status: 'awaiting_selection' },
    }))
    const result = await resumeExpandOutlineJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'x' }),
        getJob,
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs,
      },
      projectId: 6,
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(getJob).toHaveBeenCalledWith('job-new')
    expect(result.kind).toBe('awaiting_selection')
  })
})

describe('commitExpandOutlineJob', () => {
  test('calls commitJob and does not call putVerbDefaults', async () => {
    const commitJob = mock(async () => ({
      ok: true as const,
      commits: [{ domain_table: 'outlines', domain_row_id: 1 }],
    }))
    const putVerbDefaults = mock(async () => ({ ok: true as const, defaults: {} }))
    const result = await commitExpandOutlineJob({
      api: { commitJob, putVerbDefaults },
      jobId: 'job-1',
      candidateId: 'cand-1',
    })
    expect(commitJob).toHaveBeenCalledWith('job-1', 'cand-1')
    expect(putVerbDefaults).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, count: 1 })
  })
})

type HookDeps = readonly unknown[] | undefined
type HookCell =
  | { kind: 'state'; value: unknown; setter: (next: unknown) => void }
  | { kind: 'ref'; value: { current: unknown } }
  | { kind: 'memo'; value: unknown; deps: HookDeps }
  | { kind: 'effect'; deps: HookDeps; cleanup?: () => void }

function hookDepsEqual(left: HookDeps, right: HookDeps) {
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => Object.is(value, right[index]))
}

const hookDispatcherRef = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher
const mountedHarnesses = new Set<ExpandHookHarness<unknown>>()

class ExpandHookHarness<T> {
  value!: T
  private readonly cells: HookCell[] = []
  private readonly pendingEffects: Array<{ index: number; effect: () => void | (() => void); deps: HookDeps }> = []
  private cursor = 0
  private dirty = false
  private flushing = false
  private mounted = false
  private readonly dispatcher = {
    useState: (initial: unknown) => this.useState(initial),
    useRef: (initial: unknown) => this.useRef(initial),
    useMemo: (factory: () => unknown, deps: HookDeps) => this.useMemo(factory, deps),
    useCallback: (callback: unknown, deps: HookDeps) => this.useMemo(() => callback, deps),
    useEffect: (effect: () => void | (() => void), deps: HookDeps) => this.useEffect(effect, deps),
  }

  constructor(private readonly renderHook: () => T) {}

  mount() {
    this.mounted = true
    mountedHarnesses.add(this)
    this.requestRender()
  }

  unmount() {
    if (!this.mounted) return
    this.mounted = false
    mountedHarnesses.delete(this)
    for (const cell of this.cells) {
      if (cell?.kind === 'effect') cell.cleanup?.()
    }
  }

  private requestRender() {
    if (!this.mounted) return
    this.dirty = true
    if (!this.flushing) this.flush()
  }

  private flush() {
    this.flushing = true
    try {
      while (this.dirty) {
        this.dirty = false
        this.cursor = 0
        this.pendingEffects.length = 0
        const previous = hookDispatcherRef.current
        hookDispatcherRef.current = this.dispatcher
        try {
          this.value = this.renderHook()
        } finally {
          hookDispatcherRef.current = previous
        }
        for (const pending of this.pendingEffects) {
          const previousCell = this.cells[pending.index]
          if (previousCell?.kind === 'effect') previousCell.cleanup?.()
          this.cells[pending.index] = {
            kind: 'effect',
            deps: pending.deps,
            cleanup: pending.effect() || undefined,
          }
        }
      }
    } finally {
      this.flushing = false
    }
  }

  private useState(initial: unknown) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell) {
      const stateCell: Extract<HookCell, { kind: 'state' }> = {
        kind: 'state',
        value: typeof initial === 'function' ? (initial as () => unknown)() : initial,
        setter: (next: unknown) => {
          const nextValue = typeof next === 'function'
            ? (next as (current: unknown) => unknown)(stateCell.value)
            : next
          if (Object.is(nextValue, stateCell.value)) return
          stateCell.value = nextValue
          this.requestRender()
        },
      }
      cell = stateCell
      this.cells[index] = cell
    }
    if (cell.kind !== 'state') throw new Error(`hook ${index} changed type`)
    return [cell.value, cell.setter]
  }

  private useRef(initial: unknown) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell) {
      cell = { kind: 'ref', value: { current: initial } }
      this.cells[index] = cell
    }
    if (cell.kind !== 'ref') throw new Error(`hook ${index} changed type`)
    return cell.value
  }

  private useMemo(factory: () => unknown, deps: HookDeps) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell || cell.kind !== 'memo' || !hookDepsEqual(cell.deps, deps)) {
      cell = { kind: 'memo', value: factory(), deps }
      this.cells[index] = cell
    }
    return cell.value
  }

  private useEffect(effect: () => void | (() => void), deps: HookDeps) {
    const index = this.cursor++
    const cell = this.cells[index]
    if (cell?.kind === 'effect' && hookDepsEqual(cell.deps, deps)) return
    this.pendingEffects.push({ index, effect, deps })
  }
}

function deferredExpand<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function flushExpand() {
  for (let index = 0; index < 16; index += 1) await Promise.resolve()
}

afterEach(() => {
  for (const harness of [...mountedHarnesses]) harness.unmount()
})

describe('useExpandOutlineJob', () => {
  test('start while awaiting_selection does not POST again', async () => {
    const createJobByVerb = mock(async () => ({ ok: true as const, jobId: 'job-1' }))
    const api = {
      createJobByVerb,
      getJob: async () => jobDetail('awaiting_selection'),
      cancelJob: async () => ({ ok: true as const }),
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs: async () => ({ ok: true as const, jobs: [] }),
    }
    const harness = new ExpandHookHarness(() => useExpandOutlineJob({
      api: api as any,
      projectId: 6,
      modelId: 304,
    }))
    harness.mount()
    await harness.value.start()
    await flushExpand()
    expect(harness.value.state.phase).toBe('awaiting_selection')
    createJobByVerb.mockClear()
    await harness.value.start()
    await flushExpand()
    expect(createJobByVerb).not.toHaveBeenCalled()
  })

  test('resume while running does not listJobs', async () => {
    const created = deferredExpand<{ ok: true; jobId: string }>()
    const createJobByVerb = mock(async () => created.promise)
    const listJobs = mock(async () => ({ ok: true as const, jobs: [] }))
    const api = {
      createJobByVerb,
      getJob: async () => jobDetail('awaiting_selection'),
      cancelJob: async () => ({ ok: true as const }),
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs,
    }
    const harness = new ExpandHookHarness(() => useExpandOutlineJob({
      api: api as any,
      projectId: 6,
      modelId: 304,
    }))
    harness.mount()
    const started = harness.value.start()
    await flushExpand()
    expect(harness.value.state.phase).toBe('running')
    await harness.value.resume()
    await flushExpand()
    expect(listJobs).not.toHaveBeenCalled()
    created.resolve({ ok: true as const, jobId: 'job-1' })
    await started
    await flushExpand()
    expect(harness.value.state.phase).toBe('awaiting_selection')
  })

  test('resume while awaiting_selection does not listJobs', async () => {
    const listJobs = mock(async () => ({ ok: true as const, jobs: [] }))
    const api = {
      createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
      getJob: async () => jobDetail('awaiting_selection'),
      cancelJob: async () => ({ ok: true as const }),
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs,
    }
    const harness = new ExpandHookHarness(() => useExpandOutlineJob({
      api: api as any,
      projectId: 6,
      modelId: 304,
    }))
    harness.mount()
    await harness.value.start()
    await flushExpand()
    expect(harness.value.state.phase).toBe('awaiting_selection')
    listJobs.mockClear()
    await harness.value.resume()
    await flushExpand()
    expect(listJobs).not.toHaveBeenCalled()
    expect(harness.value.state.phase).toBe('awaiting_selection')
  })

  test('cancel calls cancelJob with that job id only', async () => {
    const cancelJob = mock(async () => ({ ok: true as const }))
    const api = {
      createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
      getJob: async () => jobDetail('awaiting_selection'),
      cancelJob,
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs: async () => ({ ok: true as const, jobs: [] }),
    }
    const harness = new ExpandHookHarness(() => useExpandOutlineJob({
      api: api as any,
      projectId: 6,
      modelId: 304,
    }))
    harness.mount()
    await harness.value.start()
    await flushExpand()
    expect(harness.value.state.phase).toBe('awaiting_selection')
    await harness.value.cancel()
    await flushExpand()
    expect(cancelJob).toHaveBeenCalledWith('job-1')
    expect(cancelJob.mock.calls.map((call: any[]) => call[0])).toEqual(['job-1'])
    expect(harness.value.state.phase).toBe('idle')
  })

  test('cancel bumps session so a late poll cannot restore discarded preview', async () => {
    const cancelled = deferredExpand<{ ok: true }>()
    const cancelJob = mock(async () => cancelled.promise)
    let harness: ExpandHookHarness<ReturnType<typeof useExpandOutlineJob>>
    let cancelQueued = false
    const api = {
      createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
      getJob: async () => {
        const base = jobDetail('awaiting_selection', {
          job: { id: 'job-1', status: 'awaiting_selection' },
        })
        return {
          ...base,
          job: new Proxy(base.job as object, {
            get(target, prop) {
              if (prop === 'status' && !cancelQueued) {
                cancelQueued = true
                queueMicrotask(() => {
                  queueMicrotask(() => { void harness.value.cancel() })
                })
              }
              return (target as any)[prop]
            },
          }),
        } as KernelJobDetail
      },
      cancelJob,
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs: async () => ({ ok: true as const, jobs: [] }),
    }
    harness = new ExpandHookHarness(() => useExpandOutlineJob({
      api: api as any,
      projectId: 6,
      modelId: 304,
    }))
    harness.mount()
    await harness.value.start()
    await flushExpand()
    expect(cancelJob).toHaveBeenCalledWith('job-1')
    expect(harness.value.state.phase).not.toBe('awaiting_selection')

    cancelled.resolve({ ok: true as const })
    await flushExpand()
    expect(harness.value.state.phase).toBe('idle')
  })
})
