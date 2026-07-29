import { afterEach, describe, expect, mock, test } from 'bun:test'
import * as React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import apiClient from '../../api/client'

async function loadPollingModule() {
  return import('./useWorkspaceTasks').catch(() => null)
}

async function loadEditorRevisionModule() {
  return import('./editorRevisionTasks').catch(() => null)
}

type DependencyList = readonly unknown[] | undefined
type EffectCallback = () => void | (() => void)
type HookCell =
  | { kind: 'state'; value: unknown; setter: (next: unknown) => void }
  | { kind: 'ref'; value: { current: unknown } }
  | { kind: 'memo'; value: unknown; deps: DependencyList }
  | { kind: 'effect'; deps: DependencyList; cleanup?: () => void }

function dependenciesEqual(left: DependencyList, right: DependencyList) {
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => Object.is(value, right[index]))
}

const dispatcherRef = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher

class HookHarness<T> {
  value!: T
  private readonly cells: HookCell[] = []
  private readonly pendingEffects: Array<{ index: number; effect: EffectCallback; deps: DependencyList }> = []
  private cursor = 0
  private dirty = false
  private flushing = false
  private mounted = false

  private readonly dispatcher = {
    useState: (initial: unknown) => this.useState(initial),
    useRef: (initial: unknown) => this.useRef(initial),
    useMemo: (factory: () => unknown, deps: DependencyList) => this.useMemo(factory, deps),
    useCallback: (callback: unknown, deps: DependencyList) => this.useMemo(() => callback, deps),
    useEffect: (effect: EffectCallback, deps: DependencyList) => this.useEffect(effect, deps),
  }

  constructor(private readonly renderHook: () => T) {}

  mount() {
    this.mounted = true
    activeHarnesses.add(this)
    this.requestRender()
  }

  update() {
    this.requestRender()
  }

  unmount() {
    if (!this.mounted) return
    this.mounted = false
    activeHarnesses.delete(this)
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
    let passes = 0
    try {
      while (this.dirty) {
        if (++passes > 50) throw new Error('hook harness exceeded render limit')
        this.dirty = false
        this.cursor = 0
        this.pendingEffects.length = 0
        const previousDispatcher = dispatcherRef.current
        dispatcherRef.current = this.dispatcher
        try {
          this.value = this.renderHook()
        } finally {
          dispatcherRef.current = previousDispatcher
        }
        this.flushEffects()
      }
    } finally {
      this.flushing = false
    }
  }

  private flushEffects() {
    for (const pending of this.pendingEffects) {
      const previous = this.cells[pending.index]
      if (previous?.kind === 'effect') previous.cleanup?.()
      const next: HookCell = { kind: 'effect', deps: pending.deps }
      this.cells[pending.index] = next
      const cleanup = pending.effect()
      if (typeof cleanup === 'function') next.cleanup = cleanup
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

  private useMemo(factory: () => unknown, deps: DependencyList) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell || cell.kind !== 'memo' || !dependenciesEqual(cell.deps, deps)) {
      cell = { kind: 'memo', value: factory(), deps }
      this.cells[index] = cell
    }
    return cell.value
  }

  private useEffect(effect: EffectCallback, deps: DependencyList) {
    const index = this.cursor++
    const cell = this.cells[index]
    if (cell?.kind === 'effect' && dependenciesEqual(cell.deps, deps)) return
    this.pendingEffects.push({ index, effect, deps })
  }
}

class FakeIntervals {
  private now = 0
  private nextId = 1
  private readonly intervals = new Map<number, { callback: () => void; delay: number; nextAt: number }>()
  private readonly originalSetInterval = globalThis.setInterval
  private readonly originalClearInterval = globalThis.clearInterval

  install() {
    globalThis.setInterval = ((callback: () => void, delay = 0) => {
      const id = this.nextId++
      const normalizedDelay = Math.max(1, Number(delay) || 0)
      this.intervals.set(id, { callback, delay: normalizedDelay, nextAt: this.now + normalizedDelay })
      return id
    }) as any
    globalThis.clearInterval = ((id: number) => {
      this.intervals.delete(Number(id))
    }) as any
  }

  advanceBy(ms: number) {
    const target = this.now + ms
    while (true) {
      const next = [...this.intervals.entries()]
        .filter(([, interval]) => interval.nextAt <= target)
        .sort((left, right) => left[1].nextAt - right[1].nextAt || left[0] - right[0])[0]
      if (!next) break
      const [id, interval] = next
      this.now = interval.nextAt
      interval.nextAt += interval.delay
      if (this.intervals.has(id)) interval.callback()
    }
    this.now = target
  }

  restore() {
    globalThis.setInterval = this.originalSetInterval
    globalThis.clearInterval = this.originalClearInterval
    this.intervals.clear()
  }
}

const activeHarnesses = new Set<HookHarness<any>>()
const activeTimers = new Set<FakeIntervals>()
const originalGet = apiClient.get
const originalPost = apiClient.post

afterEach(() => {
  for (const harness of [...activeHarnesses]) harness.unmount()
  for (const timers of [...activeTimers]) timers.restore()
  activeTimers.clear()
  apiClient.get = originalGet
  apiClient.post = originalPost
})

function fakeIntervals() {
  const timers = new FakeIntervals()
  timers.install()
  activeTimers.add(timers)
  return timers
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function editorRevision(overrides: Record<string, unknown> = {}) {
  return {
    id: 81,
    run_type: 'editor_revision',
    status: 'running',
    phase: 'generate_candidate',
    phase_label: '生成候选',
    progress: null,
    chapter_id: 11,
    chapter_no: 1,
    chapter_title: '起雾',
    prose_persisted: false,
    warnings: [],
    error: null,
    can_cancel: true,
    can_retry: false,
    can_continue: false,
    repair_task_link: null,
    updated_at: '2026-07-29T08:00:00.000Z',
    ...overrides,
  }
}

function taskEnvelope(tasks: unknown[]) {
  return {
    ok: true,
    worker: { status: 'idle' },
    tasks,
    active: tasks.filter((task: any) => ['queued', 'running', 'cancel_requested'].includes(task.status)),
    summary: {
      total: tasks.length,
      active: tasks.filter((task: any) => ['queued', 'running', 'cancel_requested'].includes(task.status)).length,
      running: tasks.filter((task: any) => task.status === 'running').length,
      paused: 0,
      failed: tasks.filter((task: any) => task.status === 'failed').length,
      needs_approval: 0,
    },
  }
}

function workspaceProps(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 3,
    taskCenterOpen: false,
    selectedModelId: 12,
    stepOutlineLoading: false,
    stepProseLoading: false,
    stepRepairLoading: false,
    proseProgress: { current: 0, total: 0 },
    proseBatchStatus: null,
    planning: false,
    planProgress: null,
    executingAgents: false,
    generatingProse: false,
    streamingProgress: '',
    streamingPercent: 0,
    activeChapter: { id: 11, chapter_no: 1, title: '起雾' },
    ...overrides,
  }
}

function mountWorkspaceTasks(module: any, initialProps: Record<string, unknown>) {
  let props = initialProps
  const harness = new HookHarness(() => module.useWorkspaceTasks(props as any))
  harness.mount()
  return {
    harness,
    update(nextProps: Record<string, unknown>) {
      props = nextProps
      harness.update()
    },
  }
}

describe('workspace task polling policy', () => {
  test('does not schedule an interval while the drawer is closed without an active revision or all tasks are idle', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: { tasks: [{ status: 'running' }] },
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
    })).toBeNull()
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: { tasks: [{ status: 'completed' }], summary: { running: 0 } },
      knowledgeIngestJobs: [{ status: 'completed' }],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
    })).toBeNull()
  })

  test('uses a two second interval for an active editor revision even with the drawer closed', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: taskEnvelope([editorRevision()]),
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: true,
    })).toBe(2000)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: taskEnvelope([editorRevision()]),
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: true,
      productionRefreshConfirmed: false,
      productionRefreshFailures: 3,
      knowledgeRefreshFailures: 3,
    })).toBe(2000)
  })

  test('keeps the 3.5 second interval while a non-revision production, knowledge, or local task can advance', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return

    const base = {
      taskCenterOpen: true,
      productionTasks: { tasks: [] },
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
    }
    expect(module.workspaceTaskPollingIntervalMs({ ...base, productionTasks: { active: [{ status: 'running' }] } })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, productionTasks: { tasks: [{ status: 'queued' }] } })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, knowledgeIngestJobs: [{ status: 'running' }] })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, hasLocalActiveTask: true })).toBe(3500)
  })

  test('backs off repeated refresh failures and resets to fast polling after recovery', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    let state = { data: { tasks: [{ status: 'running' }] }, confirmed: true, error: null, failures: 0 }
    state = module.workspaceTaskRefreshStarted(state)
    state = module.workspaceTaskRefreshFailed(state, new Error('first failure'))
    expect(state.failures).toBe(1)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(10000)

    state = module.workspaceTaskRefreshStarted(state)
    state = module.workspaceTaskRefreshFailed(state, new Error('second failure'))
    expect(state.failures).toBe(2)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(30000)

    state = module.workspaceTaskRefreshSucceeded(state, { tasks: [{ status: 'running' }] })
    expect(state.failures).toBe(0)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(3500)
  })

  test('deduplicates same-project refreshes and aborts them when the project epoch changes', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const gate = module.createWorkspaceTaskRequestGate()
    const first = gate.begin('production', 7)
    expect(first).not.toBeNull()
    expect(gate.begin('production', 7)).toBeNull()
    expect(gate.isCurrent(first, 7)).toBe(true)

    gate.invalidate()
    expect(first.signal.aborted).toBe(true)
    expect(gate.isCurrent(first, 7)).toBe(false)

    const next = gate.begin('production', 8)
    expect(next).not.toBeNull()
    expect(gate.isCurrent(next, 7)).toBe(false)
    expect(gate.isCurrent(next, 8)).toBe(true)
  })

  test('refreshes immediately after existing task-center actions', () => {
    const runQueueSource = readFileSync(join(import.meta.dir, 'shell/workspace-run-queue-handlers.tsx'), 'utf8')
    const taskCenterSource = readFileSync(join(import.meta.dir, 'shell/workspace-deferred-surfaces-outline.tsx'), 'utf8')
    const runQueueActionBody = (start: string, end: string) => runQueueSource.slice(
      runQueueSource.indexOf(start),
      runQueueSource.indexOf(end, runQueueSource.indexOf(start)),
    )
    const taskCenterActionBody = (start: string, end: string) => taskCenterSource.slice(
      taskCenterSource.indexOf(start),
      taskCenterSource.indexOf(end, taskCenterSource.indexOf(start)),
    )

    expect(runQueueActionBody('const executeChapterGroupRun', 'const approveChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(runQueueActionBody('const approveChapterGroupStage', 'const retryChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(runQueueActionBody('const retryChapterGroupStage', 'const skipChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(runQueueActionBody('const skipChapterGroupStage', 'const executeReleaseRepairRun')).toContain('await loadProductionTasks()')
    expect(taskCenterActionBody('onPauseRun={async', 'onResumeRun={async')).toContain('await loadProductionTasks()')
    expect(taskCenterActionBody('onResumeRun={async', '/>')).toContain('await loadProductionTasks()')
  })

  test('keeps polling across a failed refresh until a successful idle response confirms completion', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const idleKnowledge = { data: [{ status: 'completed' }], confirmed: true, error: null, failures: 0 }
    let production = module.workspaceTaskRefreshSucceeded(
      { data: null, confirmed: false, error: null, failures: 0 },
      { tasks: [{ status: 'running' }] },
    )
    production = module.workspaceTaskRefreshStarted(production)
    production = module.workspaceTaskRefreshFailed(production, new Error('temporary network failure'))
    expect(production.data).toEqual({ tasks: [{ status: 'running' }] })
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: production.data,
      knowledgeIngestJobs: idleKnowledge.data,
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
      productionRefreshConfirmed: production.confirmed,
      knowledgeRefreshConfirmed: idleKnowledge.confirmed,
      productionRefreshFailures: production.failures,
    })).toBe(10000)

    production = module.workspaceTaskRefreshSucceeded(production, { tasks: [{ status: 'completed' }] })
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: production.data,
      knowledgeIngestJobs: idleKnowledge.data,
      hasLocalActiveTask: false,
      hasActiveEditorRevision: false,
      productionRefreshConfirmed: production.confirmed,
      knowledgeRefreshConfirmed: idleKnowledge.confirmed,
      productionRefreshFailures: production.failures,
    })).toBeNull()
  })
})

describe('useWorkspaceTasks editor revision lifecycle', () => {
  test('fetches project tasks on a closed-drawer mount and restores two-second polling from an active response', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const timers = fakeIntervals()
    const requests: string[] = []
    apiClient.get = mock(async (url: string) => {
      requests.push(url)
      if (url === '/novel/projects/3/tasks') return { data: taskEnvelope([editorRevision()]) }
      return { data: { jobs: [] } }
    }) as any

    mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    expect(requests).toEqual(['/novel/projects/3/tasks'])

    timers.advanceBy(2000)
    await flushPromises()
    expect(requests.filter(url => url === '/novel/projects/3/tasks')).toHaveLength(2)
    expect(requests.some(url => url === '/knowledge/ingest')).toBe(false)
  })

  test('prevents a stale prior-project response from replacing current project tasks', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const project3 = deferred<any>()
    const project4 = deferred<any>()
    let project3Signal: AbortSignal | undefined
    apiClient.get = mock((url: string, config?: { signal?: AbortSignal }) => {
      if (url === '/novel/projects/3/tasks') {
        project3Signal = config?.signal
        return project3.promise
      }
      if (url === '/novel/projects/4/tasks') return project4.promise
      return Promise.resolve({ data: { jobs: [] } })
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    mounted.update(workspaceProps({ projectId: 4, activeChapter: { id: 21, chapter_no: 1, title: '新项目' } }))
    expect(project3Signal?.aborted).toBe(true)

    project4.resolve({ data: taskEnvelope([editorRevision({ id: 91, chapter_id: 21, chapter_title: '新项目' })]) })
    await flushPromises()
    expect(mounted.harness.value.editorRevisionTasks?.map((task: any) => task.id)).toEqual([91])

    project3.resolve({ data: taskEnvelope([editorRevision({ id: 81 })]) })
    await flushPromises()
    expect(mounted.harness.value.editorRevisionTasks?.map((task: any) => task.id)).toEqual([91])
  })

  test('changes chapter selection without canceling project polling', async () => {
    const hookModule = await loadPollingModule()
    const taskModule = await loadEditorRevisionModule()
    expect(hookModule).not.toBeNull()
    expect(taskModule).not.toBeNull()
    if (!hookModule || !taskModule) return
    const timers = fakeIntervals()
    const requestSignals: AbortSignal[] = []
    apiClient.get = mock(async (url: string, config?: { signal?: AbortSignal }) => {
      if (url === '/novel/projects/3/tasks') {
        if (config?.signal) requestSignals.push(config.signal)
        return { data: taskEnvelope([
          editorRevision({ id: 81, chapter_id: 11, chapter_no: 1 }),
          editorRevision({ id: 82, chapter_id: 12, chapter_no: 2, chapter_title: '潮声' }),
        ]) }
      }
      return { data: { jobs: [] } }
    }) as any

    const mounted = mountWorkspaceTasks(hookModule, workspaceProps())
    await flushPromises()
    expect(taskModule.editorRevisionForChapter(mounted.harness.value.editorRevisionTasks, 11)?.id).toBe(81)
    const firstSignal = requestSignals[0]

    mounted.update(workspaceProps({ activeChapter: { id: 12, chapter_no: 2, title: '潮声' } }))
    expect(taskModule.editorRevisionForChapter(mounted.harness.value.editorRevisionTasks, 12)?.id).toBe(82)
    expect(firstSignal.aborted).toBe(false)

    timers.advanceBy(2000)
    await flushPromises()
    expect(requestSignals).toHaveLength(2)
  })

  test('stops revision polling after a terminal refresh unless another polling condition remains', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const timers = fakeIntervals()
    let requests = 0
    apiClient.get = mock(async (url: string) => {
      if (url !== '/novel/projects/3/tasks') return { data: { jobs: [] } }
      requests += 1
      return { data: taskEnvelope([
        requests === 1
          ? editorRevision()
          : editorRevision({ status: 'completed', phase: 'completed', prose_persisted: true, can_cancel: false }),
      ]) }
    }) as any

    mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    timers.advanceBy(2000)
    await flushPromises()
    expect(requests).toBe(2)

    timers.advanceBy(6000)
    await flushPromises()
    expect(requests).toBe(2)
  })

  test('cancels with project_id, merges the public run before refresh completes, then refreshes', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const refresh = deferred<any>()
    const getRequests: string[] = []
    const postRequests: Array<{ url: string; body: unknown; config: any }> = []
    apiClient.get = mock((url: string) => {
      getRequests.push(url)
      if (getRequests.filter(item => item === '/novel/projects/3/tasks').length === 1) {
        return Promise.resolve({ data: taskEnvelope([editorRevision()]) })
      }
      return refresh.promise
    }) as any
    apiClient.post = mock(async (url: string, body: unknown, config: any) => {
      postRequests.push({ url, body, config })
      return { data: { ok: true, action: 'cancel', run: editorRevision({ status: 'cancel_requested', can_cancel: false }) } }
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    const action = mounted.harness.value.cancelEditorRevision(81)
    await flushPromises()

    expect(postRequests).toHaveLength(1)
    expect(postRequests[0]).toMatchObject({
      url: '/novel/editor-revisions/81/cancel',
      body: { project_id: 3 },
    })
    expect(postRequests[0].config.signal).toBeInstanceOf(AbortSignal)
    expect(mounted.harness.value.editorRevisionTasks.find((task: any) => task.id === 81)?.status).toBe('cancel_requested')
    expect(getRequests.filter(url => url === '/novel/projects/3/tasks')).toHaveLength(2)

    refresh.resolve({ data: taskEnvelope([editorRevision({ status: 'cancel_requested', can_cancel: false })]) })
    expect((await action).status).toBe('cancel_requested')
  })

  test('supersedes an older in-flight project refresh after an editor revision action', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const staleRefresh = deferred<any>()
    let taskRequests = 0
    let staleSignal: AbortSignal | undefined
    apiClient.get = mock((url: string, config?: { signal?: AbortSignal }) => {
      if (url !== '/novel/projects/3/tasks') return Promise.resolve({ data: { jobs: [] } })
      taskRequests += 1
      if (taskRequests === 1) return Promise.resolve({ data: taskEnvelope([editorRevision()]) })
      if (taskRequests === 2) {
        staleSignal = config?.signal
        return staleRefresh.promise
      }
      return Promise.resolve({ data: taskEnvelope([
        editorRevision({ status: 'cancel_requested', can_cancel: false }),
      ]) })
    }) as any
    apiClient.post = mock(async () => ({
      data: {
        ok: true,
        action: 'cancel',
        run: editorRevision({ status: 'cancel_requested', can_cancel: false }),
      },
    })) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    const backgroundRefresh = mounted.harness.value.refreshWorkspaceTasks()
    await flushPromises()
    expect(taskRequests).toBe(2)

    const action = mounted.harness.value.cancelEditorRevision(81)
    await flushPromises()
    expect(staleSignal?.aborted).toBe(true)
    expect(taskRequests).toBe(3)
    expect((await action).status).toBe('cancel_requested')

    staleRefresh.resolve({ data: taskEnvelope([editorRevision()]) })
    await backgroundRefresh
    await flushPromises()
    expect(mounted.harness.value.editorRevisionTasks[0]?.status).toBe('cancel_requested')
  })

  test('uses the retry endpoint for both retry and continue responses and refreshes each result', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const retryable = editorRevision({ id: 81, status: 'failed', can_cancel: false, can_retry: true })
    const continuable = editorRevision({ id: 82, status: 'failed', prose_persisted: true, can_cancel: false, can_continue: true })
    let taskRequests = 0
    const postRequests: Array<{ url: string; body: unknown }> = []
    apiClient.get = mock(async (url: string) => {
      if (url !== '/novel/projects/3/tasks') return { data: { jobs: [] } }
      taskRequests += 1
      return { data: taskEnvelope(taskRequests === 1
        ? [retryable, continuable]
        : [
            editorRevision({ id: 81, status: 'queued' }),
            editorRevision({ id: 82, status: 'queued', prose_persisted: true }),
          ]) }
    }) as any
    apiClient.post = mock(async (url: string, body: unknown) => {
      postRequests.push({ url, body })
      const runId = Number(url.split('/').at(-2))
      return {
        data: {
          ok: true,
          action: runId === 81 ? 'retry' : 'continue',
          run: editorRevision({ id: runId, status: 'queued', prose_persisted: runId === 82 }),
        },
      }
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    expect((await mounted.harness.value.retryEditorRevision(81)).id).toBe(81)
    expect((await mounted.harness.value.retryEditorRevision(82)).id).toBe(82)
    expect(postRequests).toEqual([
      { url: '/novel/editor-revisions/81/retry', body: { project_id: 3 } },
      { url: '/novel/editor-revisions/82/retry', body: { project_id: 3 } },
    ])
    expect(taskRequests).toBe(3)
  })

  test('loads diagnostics with project_id and exposes an explicit project refresh', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const getRequests: Array<{ url: string; config: any }> = []
    apiClient.get = mock(async (url: string, config?: any) => {
      getRequests.push({ url, config })
      if (url.endsWith('/diagnostics')) return { data: { ok: true, diagnostics: { phase: 'post_quality' } } }
      if (url === '/knowledge/ingest') return { data: { jobs: [] } }
      return { data: taskEnvelope([]) }
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    expect(await mounted.harness.value.loadEditorRevisionDiagnostics(81)).toEqual({ phase: 'post_quality' })
    expect(getRequests.find(request => request.url.endsWith('/diagnostics'))?.config.params).toEqual({ project_id: 3 })

    await mounted.harness.value.refreshWorkspaceTasks()
    expect(getRequests.filter(request => request.url === '/novel/projects/3/tasks')).toHaveLength(2)
  })

  test('rejects diagnostics that resolve after the workspace switched projects', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const staleDiagnostics = deferred<any>()
    let diagnosticsSignal: AbortSignal | undefined
    apiClient.get = mock((url: string, config?: { signal?: AbortSignal }) => {
      if (url.endsWith('/diagnostics')) {
        diagnosticsSignal = config?.signal
        return staleDiagnostics.promise
      }
      if (url === '/novel/projects/4/tasks') {
        return Promise.resolve({ data: taskEnvelope([editorRevision({ id: 94, chapter_id: 21, chapter_title: '新项目' })]) })
      }
      return Promise.resolve({ data: taskEnvelope([editorRevision()]) })
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    const diagnostics = mounted.harness.value.loadEditorRevisionDiagnostics(81)
    mounted.update(workspaceProps({ projectId: 4, activeChapter: { id: 21, chapter_no: 1, title: '新项目' } }))
    await flushPromises()
    expect(diagnosticsSignal?.aborted).toBe(true)

    staleDiagnostics.resolve({ data: { ok: true, diagnostics: { phase: 'post_quality', project: 3 } } })
    await expect(diagnostics).rejects.toMatchObject({ name: 'AbortError' })
    expect(mounted.harness.value.editorRevisionTasks.map((task: any) => task.id)).toEqual([94])
  })

  test('rejects an action when its forced refresh finishes after the workspace switched projects', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const staleRefresh = deferred<any>()
    let project3Requests = 0
    let staleRefreshSignal: AbortSignal | undefined
    apiClient.get = mock((url: string, config?: { signal?: AbortSignal }) => {
      if (url === '/novel/projects/3/tasks') {
        project3Requests += 1
        if (project3Requests === 1) return Promise.resolve({ data: taskEnvelope([editorRevision()]) })
        staleRefreshSignal = config?.signal
        return staleRefresh.promise
      }
      if (url === '/novel/projects/4/tasks') {
        return Promise.resolve({ data: taskEnvelope([editorRevision({ id: 94, chapter_id: 21, chapter_title: '新项目' })]) })
      }
      return Promise.resolve({ data: { jobs: [] } })
    }) as any
    apiClient.post = mock(async () => ({
      data: {
        ok: true,
        action: 'cancel',
        run: editorRevision({ status: 'cancel_requested', can_cancel: false }),
      },
    })) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    const action = mounted.harness.value.cancelEditorRevision(81)
    await flushPromises()
    expect(project3Requests).toBe(2)

    mounted.update(workspaceProps({ projectId: 4, activeChapter: { id: 21, chapter_no: 1, title: '新项目' } }))
    await flushPromises()
    expect(staleRefreshSignal?.aborted).toBe(true)
    expect(mounted.harness.value.editorRevisionTasks.map((task: any) => task.id)).toEqual([94])

    staleRefresh.resolve({ data: taskEnvelope([editorRevision({ status: 'cancel_requested' })]) })
    await expect(action).rejects.toMatchObject({ name: 'AbortError' })
    expect(mounted.harness.value.editorRevisionTasks.map((task: any) => task.id)).toEqual([94])
  })

  test('does not let a stale action response or follow-up refresh corrupt the new project', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    const staleAction = deferred<any>()
    const getRequests: string[] = []
    let actionSignal: AbortSignal | undefined
    apiClient.get = mock(async (url: string) => {
      getRequests.push(url)
      if (url === '/novel/projects/4/tasks') {
        return { data: taskEnvelope([editorRevision({ id: 94, chapter_id: 21, chapter_title: '新项目' })]) }
      }
      return { data: taskEnvelope([editorRevision()]) }
    }) as any
    apiClient.post = mock((_url: string, _body: unknown, config?: { signal?: AbortSignal }) => {
      actionSignal = config?.signal
      return staleAction.promise
    }) as any

    const mounted = mountWorkspaceTasks(module, workspaceProps())
    await flushPromises()
    const action = mounted.harness.value.cancelEditorRevision(81)
    mounted.update(workspaceProps({ projectId: 4, activeChapter: { id: 21, chapter_no: 1, title: '新项目' } }))
    await flushPromises()
    expect(actionSignal?.aborted).toBe(true)
    expect(mounted.harness.value.editorRevisionTasks.map((task: any) => task.id)).toEqual([94])

    staleAction.resolve({ data: { ok: true, action: 'cancel', run: editorRevision({ status: 'cancel_requested' }) } })
    await expect(action).rejects.toMatchObject({ name: 'AbortError' })
    await flushPromises()
    expect(mounted.harness.value.editorRevisionTasks.map((task: any) => task.id)).toEqual([94])
    expect(getRequests.filter(url => url === '/novel/projects/3/tasks')).toHaveLength(1)
  })
})
