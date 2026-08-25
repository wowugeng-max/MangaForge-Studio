import { afterEach, describe, expect, mock, test } from 'bun:test'
import * as React from 'react'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  adaptPackCommitSuccessText,
  adaptPackCreateFailureText,
  commitAdaptPackJob,
  reduceAdaptPackProgress,
  resumeAdaptPackJob,
  runAdaptPackJob,
  useAdaptPackJob,
} from './use-adapt-pack-job'

function jobDetail(status: string, extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: extra.job?.id || 'job-1', status, error_code: extra.job?.error_code },
    candidates: extra.candidates || [],
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

describe('reduceAdaptPackProgress', () => {
  test('keeps awaiting_selection as a preview phase instead of failed', () => {
    const next = reduceAdaptPackProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 4 },
      jobDetail('awaiting_selection', {
        candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        artifacts: [{
          id: 'art-1',
          candidate_id: 'cand-1',
          rel_path: 'contracts/write_chapter.json',
          artifact_kind: 'contract_json',
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

  test('keeps ADAPT_NO_VALID_CONTRACT detail on failed', () => {
    const detail = jobDetail('failed', {
      job: { id: 'job-fail', status: 'failed', error_code: 'ADAPT_NO_VALID_CONTRACT' },
      candidates: [{
        id: 'cand-1',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'failed',
        metadata: JSON.stringify({
          adapt_unsatisfied: [{ rel_path: 'contracts/write_chapter.json', verb: 'write_chapter', errors: ['CONTRACT_BUILTIN'] }],
        }),
      }],
    })
    const next = reduceAdaptPackProgress({ phase: 'running', jobId: 'job-fail', hint: '', elapsedSec: 2 }, detail)
    expect(next).toMatchObject({
      phase: 'failed',
      jobId: 'job-fail',
      errorCode: 'ADAPT_NO_VALID_CONTRACT',
    })
    if (next.phase === 'failed') expect(next.detail).toEqual(detail)
  })
})

describe('runAdaptPackJob', () => {
  test('createJobByVerb sends matching pack subjectKey and skill_id', async () => {
    const seen: any[] = []
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async (input) => {
          seen.push(input)
          return { ok: true as const, jobId: 'job-p' }
        },
        getJob: async () => jobDetail('awaiting_selection', {
          job: { id: 'job-p', status: 'awaiting_selection' },
          candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(seen[0]).toMatchObject({
      projectId: 3,
      chapterId: 0,
      modelId: 7,
      verb: 'adapt_pack',
      subjectType: 'pack',
      subjectId: 0,
      subjectKey: 'my-style',
      verbParams: { skill_id: 'my-style' },
    })
    expect(seen[0].subjectKey).toBe(seen[0].verbParams.skill_id)
    expect(result.kind).toBe('awaiting_selection')
  })

  test('poll awaiting_selection is not folded to failed', async () => {
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
        getJob: async () => jobDetail('awaiting_selection', {
          candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(result.kind).toBe('awaiting_selection')
    expect(result.kind).not.toBe('failed')
  })

  test('failed ADAPT_NO_VALID_CONTRACT keeps detail', async () => {
    const detail = jobDetail('failed', {
      job: { id: 'job-1', status: 'failed', error_code: 'ADAPT_NO_VALID_CONTRACT' },
      candidates: [{
        id: 'cand-1',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'failed',
        metadata: '{"adapt_unsatisfied":[]}',
      }],
    })
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
        getJob: async () => detail,
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async () => detail,
    })
    expect(result).toMatchObject({
      kind: 'failed',
      jobId: 'job-1',
      errorCode: 'ADAPT_NO_VALID_CONTRACT',
    })
    if (result.kind === 'failed') expect(result.detail).toEqual(detail)
  })
})

describe('commitAdaptPackJob', () => {
  test('calls commitJob and does not call putVerbDefaults', async () => {
    const commitJob = mock(async () => ({
      ok: true as const,
      commits: [
        { domain_table: 'kernel_contracts', domain_row_id: 0 },
        { domain_table: 'kernel_contracts', domain_row_id: 0 },
      ],
    }))
    const putVerbDefaults = mock(async () => ({ ok: true as const, defaults: {} }))
    const result = await commitAdaptPackJob({
      api: { commitJob, putVerbDefaults },
      jobId: 'job-1',
      candidateId: 'cand-1',
    })
    expect(commitJob).toHaveBeenCalledWith('job-1', 'cand-1')
    expect(putVerbDefaults).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, count: 2 })
    expect(adaptPackCommitSuccessText(2)).toBe('已写入 2 份合同，默认绑定未改')
  })
})

describe('adaptPackCreateFailureText', () => {
  test('settings 409 uses skill copy without changing the global PROJECT_JOB_RUNNING toast', () => {
    expect(adaptPackCreateFailureText('PROJECT_JOB_RUNNING')).toBe('该 skill 适配未结束')
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')).toEqual({
      kind: 'warning',
      text: '同项目同动词任务未结束',
    })
    expect(kernelJobUserMessage('VERB_PARAMS_INVALID')).toEqual({
      kind: 'warning',
      text: '续写参数无效',
    })
  })
})

describe('resumeAdaptPackJob', () => {
  test('gets the latest non-terminal adapt_pack job for the skill', async () => {
    const getJob = mock(async () => jobDetail('awaiting_selection', {
      job: { id: 'job-new', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-2', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
    }))
    const listJobs = mock(async () => ({
      ok: true as const,
      jobs: [
        { id: 'job-old', status: 'committed', created_at: '2026-08-24T00:00:00Z' },
        { id: 'job-new', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' },
        { id: 'job-run', status: 'running', created_at: '2026-08-23T00:00:00Z' },
      ],
    }))
    const result = await resumeAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'nope' }),
        getJob,
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs,
      },
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(listJobs).toHaveBeenCalledWith({ verb: 'adapt_pack', subjectKey: 'my-style' })
    expect(getJob).toHaveBeenCalledWith('job-new')
    expect(result.kind).toBe('awaiting_selection')
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
const mountedAdaptHarnesses = new Set<AdaptHookHarness<unknown>>()

class AdaptHookHarness<T> {
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
    mountedAdaptHarnesses.add(this)
    this.requestRender()
  }

  unmount() {
    if (!this.mounted) return
    this.mounted = false
    mountedAdaptHarnesses.delete(this)
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
          const next: HookCell = { kind: 'effect', deps: pending.deps }
          this.cells[pending.index] = next
          const cleanup = pending.effect()
          if (typeof cleanup === 'function') next.cleanup = cleanup
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
        setter: (next) => {
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

function deferredAdapt<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function flushAdapt() {
  for (let index = 0; index < 16; index += 1) await Promise.resolve()
}

afterEach(() => {
  for (const harness of [...mountedAdaptHarnesses]) harness.unmount()
})

describe('useAdaptPackJob skill switch', () => {
  test('start(A) in flight then resume(B) does not no-op and ignores stale A', async () => {
    const aJob = deferredAdapt<KernelJobDetail>()
    const createJobByVerb = mock(async (input: { subjectKey: string }) => {
      expect(input.subjectKey).toBe('skill-a')
      return { ok: true as const, jobId: 'job-a' }
    })
    const listJobs = mock(async (query: { verb: string; subjectKey: string }) => ({
      ok: true as const,
      jobs: query.subjectKey === 'skill-b'
        ? [{ id: 'job-b', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' }]
        : [],
    }))
    const getJob = mock(async (id: string) => {
      if (id === 'job-a') return aJob.promise
      return jobDetail('awaiting_selection', {
        job: { id: 'job-b', status: 'awaiting_selection' },
        candidates: [{ id: 'cand-b', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
      })
    })
    const cancelJob = mock(async () => ({ ok: true as const }))
    const api = {
      createJobByVerb,
      getJob,
      cancelJob,
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs,
    }
    const harness = new AdaptHookHarness(() => useAdaptPackJob({
      api: api as any,
      projectId: 3,
      modelId: 7,
    }))
    harness.mount()
    const startA = harness.value.start('skill-a')
    await flushAdapt()
    expect(createJobByVerb).toHaveBeenCalledTimes(1)

    const resumeB = harness.value.resume('skill-b')
    await flushAdapt()
    await resumeB
    await flushAdapt()

    expect(listJobs).toHaveBeenCalledWith({ verb: 'adapt_pack', subjectKey: 'skill-b' })
    expect(getJob).toHaveBeenCalledWith('job-b')
    expect(cancelJob).not.toHaveBeenCalled()
    expect(harness.value.state).toMatchObject({
      phase: 'awaiting_selection',
      jobId: 'job-b',
      candidateId: 'cand-b',
    })

    aJob.resolve(jobDetail('awaiting_selection', {
      job: { id: 'job-a', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-a', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
    }))
    await startA
    await flushAdapt()
    expect(harness.value.state).toMatchObject({
      phase: 'awaiting_selection',
      jobId: 'job-b',
      candidateId: 'cand-b',
    })
    expect(createJobByVerb.mock.calls.every((call: any[]) => call[0].subjectKey === 'skill-a')).toBe(true)
  })

  test('resume poll marks running so a concurrent start cannot create another job', async () => {
    const listed = deferredAdapt<{ ok: true; jobs: Array<{ id: string; status: string; created_at: string }> }>()
    const createJobByVerb = mock(async () => ({ ok: true as const, jobId: 'job-new' }))
    const listJobs = mock(async () => listed.promise)
    const getJob = mock(async () => jobDetail('awaiting_selection', {
      job: { id: 'job-b', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-b', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
    }))
    const api = {
      createJobByVerb,
      getJob,
      cancelJob: async () => ({ ok: true as const }),
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs,
    }
    const harness = new AdaptHookHarness(() => useAdaptPackJob({
      api: api as any,
      projectId: 3,
      modelId: 7,
    }))
    harness.mount()
    const resumeB = harness.value.resume('skill-b')
    await flushAdapt()
    await harness.value.start('skill-b')
    expect(createJobByVerb).not.toHaveBeenCalled()
    listed.resolve({
      ok: true,
      jobs: [{ id: 'job-b', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' }],
    })
    await resumeB
    await flushAdapt()
    expect(getJob).toHaveBeenCalledWith('job-b')
    expect(harness.value.state).toMatchObject({ phase: 'awaiting_selection', jobId: 'job-b' })
  })

  test('resume(B) in flight clears A selection UI and cancel does not cancelJob A', async () => {
    const listedB = deferredAdapt<{ ok: true; jobs: Array<{ id: string; status: string; created_at: string }> }>()
    const cancelJob = mock(async () => ({ ok: true as const }))
    const commitJob = mock(async () => ({ ok: true as const, commits: [] }))
    const listJobs = mock(async (query: { verb: string; subjectKey: string }) => {
      if (query.subjectKey === 'skill-b') return listedB.promise
      return {
        ok: true as const,
        jobs: [{ id: 'job-a', status: 'awaiting_selection', created_at: '2026-08-24T00:00:00Z' }],
      }
    })
    const getJob = mock(async (id: string) => jobDetail('awaiting_selection', {
      job: { id, status: 'awaiting_selection' },
      candidates: [{
        id: id === 'job-a' ? 'cand-a' : 'cand-b',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'succeeded',
      }],
    }))
    const api = {
      createJobByVerb: async () => ({ ok: true as const, jobId: 'job-new' }),
      getJob,
      cancelJob,
      commitJob,
      listJobs,
    }
    const harness = new AdaptHookHarness(() => useAdaptPackJob({
      api: api as any,
      projectId: 3,
      modelId: 7,
    }))
    harness.mount()
    await harness.value.resume('skill-a')
    await flushAdapt()
    expect(harness.value.state).toMatchObject({
      phase: 'awaiting_selection',
      jobId: 'job-a',
      candidateId: 'cand-a',
    })

    const staleCommit = harness.value.commit
    const staleCancel = harness.value.cancel
    const resumeB = harness.value.resume('skill-b')
    await flushAdapt()

    expect(harness.value.state.phase).not.toBe('awaiting_selection')
    expect(harness.value.state).toMatchObject({ phase: 'running', jobId: '' })

    await staleCommit()
    expect(commitJob).not.toHaveBeenCalled()
    await staleCancel()
    expect(cancelJob).not.toHaveBeenCalled()
    await harness.value.cancel()
    expect(cancelJob).not.toHaveBeenCalled()

    listedB.resolve({
      ok: true,
      jobs: [{ id: 'job-b', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' }],
    })
    await resumeB
    await flushAdapt()
  })

  test('start during awaiting_selection is a no-op and keeps the preview', async () => {
    const createJobByVerb = mock(async () => ({
      ok: false as const,
      code: 'PROJECT_JOB_RUNNING',
      message: '同项目同动词任务未结束',
    }))
    const listJobs = mock(async () => ({
      ok: true as const,
      jobs: [{ id: 'job-a', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' }],
    }))
    const getJob = mock(async () => jobDetail('awaiting_selection', {
      job: { id: 'job-a', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-a', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
    }))
    const api = {
      createJobByVerb,
      getJob,
      cancelJob: async () => ({ ok: true as const }),
      commitJob: async () => ({ ok: true as const, commits: [] }),
      listJobs,
    }
    const harness = new AdaptHookHarness(() => useAdaptPackJob({
      api: api as any,
      projectId: 3,
      modelId: 7,
    }))
    harness.mount()
    await harness.value.resume('skill-a')
    await flushAdapt()
    expect(harness.value.state).toMatchObject({
      phase: 'awaiting_selection',
      jobId: 'job-a',
      candidateId: 'cand-a',
    })

    await harness.value.start('skill-a')
    await flushAdapt()

    expect(createJobByVerb).not.toHaveBeenCalled()
    expect(harness.value.state).toMatchObject({
      phase: 'awaiting_selection',
      jobId: 'job-a',
      candidateId: 'cand-a',
    })
    expect(harness.value.state.phase).not.toBe('failed')
  })
})
