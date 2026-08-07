import { afterEach, describe, expect, mock, test } from 'bun:test'
import * as React from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'
import {
  initialWorkspaceRequestPlan,
  createWorkspaceRequestEpoch,
  resolveActiveWorkspaceChapterId,
  resolveSelectedWorkspaceModelId,
  useNovelWorkspaceData,
  workspaceDetailsBelongToProject,
} from './useNovelWorkspaceData'
import {
  applyWorkspaceDetailResults,
  createWorkspaceDetailCache,
  selectChapterWorkingSet,
  selectAutomaticChapterDetailRecords,
  selectReviewDetailIds,
  selectRunDetailIds,
  workspacePayloadBytes,
} from './workspaceDetailCache'
import { buildPlanningWorkspaceModel } from './planningWorkspaceModel'
import { buildWritingCockpitModel } from './writingCockpitModel'
import { buildAutoCreationDirectorModel } from './autoCreationDirectorModel'

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
const activeHarnesses = new Set<HookHarness<any>>()
const originalApiGet = apiClient.get
const originalMessageError = message.error

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

afterEach(() => {
  for (const harness of [...activeHarnesses]) harness.unmount()
  apiClient.get = originalApiGet
  message.error = originalMessageError
})

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
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

function chapterSourceView(projectId: number, modelId: number) {
  return {
    ok: true as const,
    source: {
      version: 'chapter_generation_source_v1' as const,
      active: 'model' as const,
      model: { model_id: modelId },
    },
    fingerprint: `sha256:${String(projectId).repeat(64).slice(0, 64)}`,
    locked: false,
    display: { active: 'model' as const, model_id: modelId, mcp: null },
  }
}

function installWorkspaceApi(sources: Map<number, unknown | Promise<unknown>>, onSourceGet?: (projectId: number) => void) {
  apiClient.get = mock(async (url: string) => {
    const projectId = Number(url.match(/\/novel\/projects\/(\d+)/)?.[1] || 0)
    if (url.endsWith('/chapter-generation-source')) {
      onSourceGet?.(projectId)
      return { data: await sources.get(projectId) }
    }
    if (url === '/models') {
      return { data: [
        { id: 9, is_favorite: true },
        { id: 217 },
        { id: 301 },
      ] }
    }
    if (url === '/novel/runs' || url.endsWith('/worldbuilding') || url.endsWith('/characters')
      || url.endsWith('/outlines') || url.endsWith('/chapters') || url.endsWith('/reviews')) {
      return { data: [] }
    }
    if (url.endsWith('/pipeline')) return { data: null }
    if (/^\/novel\/projects\/\d+$/.test(url)) return { data: { id: projectId, title: `Project ${projectId}` } }
    throw new Error(`unexpected workspace GET: ${url}`)
  }) as any
}

function mountWorkspace(projectId: number) {
  let props = {
    projectId,
    chapterSearch: '',
    chapterStatusFilter: 'all' as const,
    chapterSortMode: 'chapter_no_asc' as const,
  }
  const harness = new HookHarness(() => useNovelWorkspaceData(props))
  harness.mount()
  return {
    harness,
    switchProject(nextProjectId: number) {
      props = { ...props, projectId: nextProjectId }
      harness.update()
    },
  }
}

describe('novel workspace model selector', () => {
  test('falls back when the currently selected model is no longer returned by the model list', () => {
    const models = [
      { id: 2, display_name: 'Fallback', model_name: 'fallback', is_favorite: false },
      { id: 3, display_name: 'Favorite', model_name: 'favorite', is_favorite: true },
    ]

    expect(resolveSelectedWorkspaceModelId(1, models)).toBe(3)
  })

  test('keeps the selected model while it is still available and clears empty lists', () => {
    expect(resolveSelectedWorkspaceModelId(2, [{ id: 2 }, { id: 3, is_favorite: true }])).toBe(2)
    expect(resolveSelectedWorkspaceModelId(2, [])).toBeUndefined()
  })
})

describe('novel workspace authoritative chapter source lifecycle', () => {
  test('binds each initial source GET to its own workspace load signal and releases it on cleanup', async () => {
    const sourceSignals = new Map<number, AbortSignal | undefined>()
    let projectOneSourceReleased = false
    const globalLoadError = mock(() => {})
    message.error = globalLoadError as typeof message.error
    apiClient.get = mock((url: string, config?: { signal?: AbortSignal }) => {
      const projectId = Number(url.match(/\/novel\/projects\/(\d+)/)?.[1] || 0)
      if (url.endsWith('/chapter-generation-source')) {
        const signal = config?.signal
        sourceSignals.set(projectId, signal)
        if (projectId === 1) {
          return new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () => {
              projectOneSourceReleased = true
              reject(new Error('project 1 source request aborted'))
            }, { once: true })
          })
        }
        return Promise.resolve({ data: chapterSourceView(projectId, 301) })
      }
      if (url === '/models') return Promise.resolve({ data: [{ id: 301 }] })
      if (url === '/novel/runs' || url.endsWith('/worldbuilding') || url.endsWith('/characters')
        || url.endsWith('/outlines') || url.endsWith('/chapters') || url.endsWith('/reviews')) {
        return Promise.resolve({ data: [] })
      }
      if (url.endsWith('/pipeline')) return Promise.resolve({ data: null })
      if (/^\/novel\/projects\/\d+$/.test(url)) {
        return Promise.resolve({ data: { id: projectId, title: `Project ${projectId}` } })
      }
      return Promise.reject(new Error(`unexpected workspace GET: ${url}`))
    }) as any
    const workspace = mountWorkspace(1)
    await flushPromises()

    workspace.switchProject(2)
    await flushPromises()
    const projectOneSignal = sourceSignals.get(1)
    const projectTwoSignal = sourceSignals.get(2)

    expect(projectOneSignal).toBeDefined()
    expect(projectTwoSignal).toBeDefined()
    expect(projectOneSignal).not.toBe(projectTwoSignal)
    expect(projectOneSignal?.aborted).toBe(true)
    expect(projectTwoSignal?.aborted).toBe(false)
    expect(projectOneSourceReleased).toBe(true)
    expect((workspace.harness.value as any).selectedProject?.id).toBe(2)
    expect(globalLoadError).toHaveBeenCalledTimes(0)

    workspace.harness.unmount()
    expect(projectTwoSignal?.aborted).toBe(true)
  })

  test('does not let project A late initial source overwrite project B', async () => {
    const projectA = deferred<unknown>()
    installWorkspaceApi(new Map([
      [1, projectA.promise],
      [2, chapterSourceView(2, 301)],
    ]))
    const workspace = mountWorkspace(1)
    await flushPromises()

    workspace.switchProject(2)
    await flushPromises()
    expect((workspace.harness.value as any).chapterGenerationSourceAuthority.source.source.model.model_id).toBe(301)
    expect((workspace.harness.value as any).selectedModelId).toBe(301)

    projectA.resolve(chapterSourceView(1, 217))
    await flushPromises()
    expect((workspace.harness.value as any).chapterGenerationSourceAuthority.source.source.model.model_id).toBe(301)
    expect((workspace.harness.value as any).selectedModelId).toBe(301)
  })

  test('invalidates an earlier same-project initial GET token when a mutation begins', async () => {
    const source = deferred<unknown>()
    installWorkspaceApi(new Map([[1, source.promise]]))
    const workspace = mountWorkspace(1)
    await flushPromises()

    const token = (workspace.harness.value as any).beginChapterSourceOperation()
    source.resolve(chapterSourceView(1, 217))
    await flushPromises()

    expect((workspace.harness.value as any).chapterGenerationSourceAuthority)
      .toEqual({ source: null, authorityUnknown: false, reconciliationRequired: false, diagnostic: null })
    expect(() => (workspace.harness.value as any).assertChapterSourceOperationCurrent(token)).not.toThrow()
    expect((workspace.harness.value as any).selectedProject?.id).toBe(1)
  })

  test('shares live token-aware source mutation pending state without invalidating its token', async () => {
    installWorkspaceApi(new Map([
      [1, chapterSourceView(1, 217)],
      [2, chapterSourceView(2, 301)],
    ]))
    const workspace = mountWorkspace(1)
    await flushPromises()
    const value = workspace.harness.value as any

    expect(typeof value.getChapterSourceMutationPending).toBe('function')
    expect(typeof value.setChapterSourceMutationPending).toBe('function')
    if (typeof value.getChapterSourceMutationPending !== 'function'
      || typeof value.setChapterSourceMutationPending !== 'function') return

    const token = value.beginChapterSourceOperation()
    value.setChapterSourceMutationPending(true, token)

    expect(value.getChapterSourceMutationPending()).toBe(true)
    expect(() => value.assertChapterSourceOperationCurrent(token)).not.toThrow()
    expect((workspace.harness.value as any).chapterSourcePendingState).toEqual({
      projectId: 1,
      pending: true,
      token,
    })

    ;(workspace.harness.value as any).setChapterSourceMutationPending(false, token)
    expect((workspace.harness.value as any).getChapterSourceMutationPending()).toBe(false)

    const staleToken = (workspace.harness.value as any).beginChapterSourceOperation()
    ;(workspace.harness.value as any).setChapterSourceMutationPending(true, staleToken)
    workspace.switchProject(2)
    await flushPromises()

    expect((workspace.harness.value as any).getChapterSourceMutationPending()).toBe(false)
    expect(() => (workspace.harness.value as any).setChapterSourceMutationPending(false, staleToken)).toThrow()
  })

  test('commits successful modules and ignores a stale initial source rejection after a mutation begins', async () => {
    const source = deferred<unknown>()
    installWorkspaceApi(new Map([[1, source.promise]]))
    const globalLoadError = mock(() => {})
    message.error = globalLoadError as typeof message.error
    const workspace = mountWorkspace(1)
    await flushPromises()

    const token = (workspace.harness.value as any).beginChapterSourceOperation()
    ;(workspace.harness.value as any).setSelectedModelId(301)
    source.reject(new TypeError('stale initial source mapper failure'))
    await flushPromises()

    expect((workspace.harness.value as any).selectedProject).toMatchObject({ id: 1, title: 'Project 1' })
    expect((workspace.harness.value as any).models.map((item: any) => item.id)).toEqual([9, 217, 301])
    expect((workspace.harness.value as any).chapterGenerationSourceAuthority.source).toBeNull()
    expect((workspace.harness.value as any).selectedModelId).toBe(301)
    expect(() => (workspace.harness.value as any).assertChapterSourceOperationCurrent(token)).not.toThrow()
    expect(globalLoadError).toHaveBeenCalledTimes(0)
  })

  test('keeps the workspace uncommitted when the current initial source request fails', async () => {
    const source = deferred<unknown>()
    const globalLoadError = mock(() => {})
    message.error = globalLoadError as typeof message.error
    apiClient.get = mock(async (url: string) => {
      if (url.endsWith('/chapter-generation-source')) return { data: await source.promise }
      if (url === '/models') return { data: [{ id: 217 }] }
      if (url === '/novel/runs' || url.endsWith('/reviews')) return { data: [] }
      if (url.endsWith('/worldbuilding')) return { data: [{ id: 11, name: 'World' }] }
      if (url.endsWith('/characters')) return { data: [{ id: 12, name: 'Character' }] }
      if (url.endsWith('/outlines')) return { data: [{ id: 13, title: 'Outline' }] }
      if (url.endsWith('/chapters')) {
        return { data: [{ id: 41, project_id: 1, chapter_no: 1, title: 'Chapter', has_prose: true }] }
      }
      if (url.endsWith('/pipeline')) return { data: { pipeline: { id: 14 } } }
      if (url === '/novel/chapters/41') {
        return { data: { id: 41, project_id: 1, chapter_no: 1, title: 'Chapter', has_prose: true } }
      }
      if (url === '/novel/projects/1') return { data: { id: 1, title: 'Project 1' } }
      throw new Error(`unexpected workspace GET: ${url}`)
    }) as any
    const workspace = mountWorkspace(1)
    await flushPromises()

    source.reject(new TypeError('current initial source failure'))
    await flushPromises()

    const value = workspace.harness.value as any
    expect(value.loading).toBe(false)
    expect(value.selectedProject).toBeNull()
    expect(value.worldbuilding).toEqual([])
    expect(value.characters).toEqual([])
    expect(value.outlines).toEqual([])
    expect(value.chapters).toEqual([])
    expect(value.pipeline).toBeNull()
    expect(value.models).toEqual([])
    expect(value.activeChapterId).toBeNull()
    expect(value.chapterGenerationSourceAuthority)
      .toEqual({ source: null, authorityUnknown: false, reconciliationRequired: false, diagnostic: null })
    expect(value.selectedModelId).toBeUndefined()
    expect(globalLoadError).toHaveBeenCalledTimes(1)
    expect(globalLoadError).toHaveBeenCalledWith('无法加载项目工作台')
  })

  test('stored model id wins over both the previous project selection and an in-flight local selection', async () => {
    const projectB = deferred<unknown>()
    installWorkspaceApi(new Map([
      [1, chapterSourceView(1, 217)],
      [2, projectB.promise],
    ]))
    const workspace = mountWorkspace(1)
    await flushPromises()
    expect((workspace.harness.value as any).selectedModelId).toBe(217)

    workspace.switchProject(2)
    await flushPromises()
    ;(workspace.harness.value as any).setSelectedModelId(9)
    expect((workspace.harness.value as any).selectedModelId).toBe(9)
    projectB.resolve(chapterSourceView(2, 301))
    await flushPromises()

    expect((workspace.harness.value as any).selectedModelId).toBe(301)
  })

  test('enters the new project fence before clearing old source or issuing its GET', async () => {
    let workspace: ReturnType<typeof mountWorkspace>
    let projectAToken: any
    let oldTokenWasStaleAtProjectBGet = false
    let sourceAtProjectBGet: number | undefined
    installWorkspaceApi(new Map([
      [1, chapterSourceView(1, 217)],
      [2, chapterSourceView(2, 301)],
    ]), projectId => {
      if (projectId !== 2) return
      sourceAtProjectBGet = (workspace.harness.value as any)
        .chapterGenerationSourceAuthority.source.source.model.model_id
      try {
        ;(workspace.harness.value as any).assertChapterSourceOperationCurrent(projectAToken)
      } catch {
        oldTokenWasStaleAtProjectBGet = true
      }
    })
    workspace = mountWorkspace(1)
    await flushPromises()
    projectAToken = (workspace.harness.value as any).beginChapterSourceOperation()

    workspace.switchProject(2)
    await flushPromises()

    expect(oldTokenWasStaleAtProjectBGet).toBe(true)
    expect(sourceAtProjectBGet).toBe(217)
    expect((workspace.harness.value as any).chapterGenerationSourceAuthority.source.source.model.model_id).toBe(301)
  })

  test('invalidates captured source operation tokens on unmount', async () => {
    installWorkspaceApi(new Map([[1, chapterSourceView(1, 217)]]))
    const workspace = mountWorkspace(1)
    await flushPromises()
    const assertCurrent = (workspace.harness.value as any).assertChapterSourceOperationCurrent
    const token = (workspace.harness.value as any).beginChapterSourceOperation()

    workspace.harness.unmount()

    expect(() => assertCurrent(token)).toThrow()
  })

  test('invalidates the previous project fence without creating a project-zero token', async () => {
    installWorkspaceApi(new Map([[1, chapterSourceView(1, 217)]]))
    const workspace = mountWorkspace(1)
    await flushPromises()
    const token = (workspace.harness.value as any).beginChapterSourceOperation()

    workspace.switchProject(0)
    await flushPromises()

    expect(() => (workspace.harness.value as any).assertChapterSourceOperationCurrent(token)).toThrow()
    expect(() => (workspace.harness.value as any).beginChapterSourceOperation()).toThrow()
    expect((workspace.harness.value as any).chapterGenerationSourceAuthority.source).toBeNull()
  })
})

describe('novel workspace active chapter selector', () => {
  test('keeps the current active chapter when refreshed chapters still contain it', () => {
    const chapters = [
      { id: 1, chapter_no: 1, chapter_text: '第一章正文' },
      { id: 2, chapter_no: 2, chapter_text: '' },
      { id: 3, chapter_no: 3, chapter_text: '' },
    ]

    expect(resolveActiveWorkspaceChapterId(3, chapters)).toBe(3)
  })

  test('falls back to first written chapter or first chapter only when current chapter is missing', () => {
    expect(resolveActiveWorkspaceChapterId(9, [
      { id: 1, chapter_no: 1, chapter_text: '' },
      { id: 2, chapter_no: 2, chapter_text: '第二章正文' },
    ])).toBe(2)
    expect(resolveActiveWorkspaceChapterId(null, [
      { id: 1, chapter_no: 1, chapter_text: '' },
      { id: 2, chapter_no: 2, chapter_text: '' },
    ])).toBe(1)
    expect(resolveActiveWorkspaceChapterId(1, [])).toBeNull()
    expect(resolveActiveWorkspaceChapterId(null, [
      { id: 1, chapter_no: 1, has_prose: false, word_count: 0 },
      { id: 2, chapter_no: 2, has_prose: true, word_count: 3200 },
    ])).toBe(2)
  })
})

describe('novel workspace compact loading plan', () => {
  test('rejects an older project load after a newer workspace request starts', () => {
    const epoch = createWorkspaceRequestEpoch()
    const projectA = epoch.begin()
    const projectB = epoch.begin()

    expect(epoch.isCurrent(projectA)).toBe(false)
    expect(epoch.isCurrent(projectB)).toBe(true)
    epoch.invalidate()
    expect(epoch.isCurrent(projectB)).toBe(false)
  })

  test('uses only opt-in workspace and summary list endpoints during the initial load', () => {
    expect(initialWorkspaceRequestPlan(17)).toEqual(expect.arrayContaining([
      { key: 'chapters', url: '/novel/projects/17/chapters', params: { view: 'workspace' } },
      { key: 'runs', url: '/novel/runs', params: { project_id: 17, view: 'summary', limit: 256 } },
      { key: 'reviews', url: '/novel/projects/17/reviews', params: { view: 'summary', limit: 512 } },
    ]))
    expect(JSON.stringify(initialWorkspaceRequestPlan(17))).not.toContain('view":"full')
  })

  test('does not hydrate stale summary ids while switching projects', () => {
    expect(workspaceDetailsBelongToProject(7, { id: 7 })).toBe(true)
    expect(workspaceDetailsBelongToProject(8, { id: 7 })).toBe(false)
    expect(workspaceDetailsBelongToProject(8, null)).toBe(false)
  })

  test('keeps a realistic initial workspace payload below two megabytes without diagnostic refs', () => {
    const chapters = Array.from({ length: 120 }, (_, index) => ({
      id: index + 1,
      project_id: 7,
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      chapter_goal: '推进主线冲突',
      chapter_summary: '本章完成一次选择和反馈',
      conflict: '旧秩序阻拦主角行动',
      ending_hook: '新的追踪信号出现',
      has_prose: index < 96,
      has_scene_plan: true,
      word_count: index < 96 ? 3000 : 0,
      updated_at: '2026-07-13T00:00:00.000Z',
    }))
    const reviews = Array.from({ length: 1100 }, (_, index) => ({
      id: index + 1,
      project_id: 7,
      chapter_id: (index % 120) + 1,
      chapter_no: (index % 120) + 1,
      review_type: index % 2 ? 'prose_quality' : 'editor_report',
      status: index % 5 ? 'ok' : 'warn',
      summary: '紧凑审查摘要',
      issue_count: index % 4,
      preview: index % 4 ? '建议压缩静态描写' : '',
      score: 80,
      passed: true,
      payload_bytes: 48000,
      created_at: '2026-07-13T00:00:00.000Z',
    }))
    const runs = Array.from({ length: 900 }, (_, index) => ({
      id: index + 1,
      project_id: 7,
      run_type: index % 3 ? 'chapter_generation_pipeline' : 'chapter_group_generation',
      step_name: `chapter-${index + 1}`,
      status: 'completed',
      duration_ms: 3000,
      error_message: '',
      created_at: '2026-07-13T00:00:00.000Z',
      input_bytes: 52000,
      output_bytes: 58000,
      admission_status: 'accepted',
      admission_warning_count: 0,
      story_state_pending: false,
      story_state_warning: '',
      post_commit_warning_count: 0,
    }))

    const automaticDetails = chapters
      .filter(chapter => chapter.has_prose)
      .slice(-15)
      .map(chapter => ({ ...chapter, chapter_text: '正文段落。'.repeat(600), raw_payload: { bounded: true } }))
    const serverSummaryResponse = { chapters, reviews, runs }
    const bytes = workspacePayloadBytes({ initial: serverSummaryResponse, automatic_details: automaticDetails })
    expect(bytes).toBeLessThan(2 * 1024 * 1024)
    expect(chapters.filter(chapter => chapter.has_prose)).toHaveLength(96)
    expect(JSON.stringify(serverSummaryResponse)).not.toContain('output_ref')
    expect(JSON.stringify(serverSummaryResponse)).not.toContain('payload":"')
    expect(JSON.stringify(serverSummaryResponse)).not.toContain('chapter_text')
  })
})

describe('novel workspace detail working set', () => {
  const chapters = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    chapter_no: index + 1,
    title: `第${index + 1}章`,
    chapter_text: `正文${index + 1}`,
    updated_at: `2026-07-13T00:00:0${index}.000Z`,
  }))

  test('loads active, previous, and next chapter details and changes the set on chapter switch', () => {
    expect(selectChapterWorkingSet(chapters, 4).map(item => item.id)).toEqual([3, 4, 5])
    expect(selectChapterWorkingSet(chapters, 6).map(item => item.id)).toEqual([5, 6, 7])
  })

  test('adds a bounded recent written window without hydrating the whole book', () => {
    const longBook = Array.from({ length: 80 }, (_, index) => ({
      id: index + 1,
      chapter_no: index + 1,
      has_prose: index < 70,
      word_count: index < 70 ? 3200 : 0,
      updated_at: String(index),
    }))
    const selected = selectAutomaticChapterDetailRecords(longBook, 40, 12)
    expect(selected.length).toBeLessThanOrEqual(15)
    expect(selected.map(item => item.id)).toEqual(expect.arrayContaining([39, 40, 41, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]))
    expect(selected.some(item => item.id === 1)).toBe(false)
  })

  test('retains the complete automatic chapter working set in the bounded detail cache', async () => {
    const cache = createWorkspaceDetailCache(async (_kind, id) => ({ id }))
    await cache.loadMany('chapter', Array.from({ length: 15 }, (_, index) => ({ id: index + 1 })))
    expect(cache.stats().cached).toBe(15)
  })

  test('hydrates full details with bounded concurrency and a strict retained byte budget', async () => {
    let active = 0
    let maxActive = 0
    const cache = createWorkspaceDetailCache(async (_kind, id, signal) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 2))
      active -= 1
      return { id, payload: '诊断'.repeat(120) }
    }, { review: 20 }, { maxConcurrent: 2, maxBytes: { review: 1200 } })

    const results = await cache.loadMany('review', Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      estimatedBytes: 500,
    })))
    const stats = cache.stats()

    expect(maxActive).toBeLessThanOrEqual(2)
    // Ready details are always returned for UI hydration; byte budget only limits cache retention.
    expect(results.filter(result => result.status === 'ready')).toHaveLength(20)
    expect(stats.cachedBytes.review).toBeLessThanOrEqual(stats.maxBytes.review)
    expect(stats.cached).toBeLessThan(20)
  })

  test('returns oversized chapter details instead of dropping prose when scene cards bloat the payload', async () => {
    const { compactChapterDetailForWorkspace } = await import('./workspaceDetailCache')
    const bloated = {
      id: 2,
      chapter_no: 2,
      chapter_text: '刺耳的金属摩擦声撕裂了浓雾。',
      scene_breakdown: [
        { scene_no: 1, title: '目标入场', purpose_tags: ['x'.repeat(20000)], prose_craft_directives: 'y'.repeat(50000) },
        { scene_no: 2, title: '冲突升级', purpose_tags: ['x'.repeat(20000)], prose_craft_directives: 'y'.repeat(50000) },
      ],
      scene_list: [
        { scene_no: 1, title: '目标入场', purpose_tags: ['x'.repeat(20000)] },
      ],
      raw_payload: { scene_cards: [{ scene_no: 1, title: '目标入场', prose_craft_directives: 'z'.repeat(30000) }], archive: 'w'.repeat(100000) },
    }
    const compact = compactChapterDetailForWorkspace(bloated)
    expect(compact.chapter_text).toBe('刺耳的金属摩擦声撕裂了浓雾。')
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(bloated).length / 5)
    expect(compact.scene_breakdown[0].purpose_tags).toBeUndefined()
    expect(compact.scene_breakdown[0].title).toBe('目标入场')

    const cache = createWorkspaceDetailCache(async () => compactChapterDetailForWorkspace(bloated), { chapter: 4 }, {
      maxBytes: { chapter: 2048 },
    })
    const results = await cache.loadMany('chapter', [{ id: 2, estimatedBytes: 500000 }])
    expect(results).toHaveLength(1)
    expect(results[0]?.status).toBe('ready')
    expect(results[0]?.record?.chapter_text).toContain('金属摩擦声')
  })

  test('aborts in-flight detail HTTP work when the cache generation is cleared', async () => {
    let capturedSignal: AbortSignal | undefined
    const cache = createWorkspaceDetailCache(async (_kind, id, signal) => {
      capturedSignal = signal
      await new Promise(resolve => setTimeout(resolve, 5))
      return { id }
    })

    const pending = cache.load('chapter', 7, 'v1')
    cache.clear()
    await pending

    expect(capturedSignal).toBeInstanceOf(AbortSignal)
    expect(capturedSignal?.aborted).toBe(true)
  })

  test('starts a fresh same-key request after the previous request signal is aborted', async () => {
    let calls = 0
    const cache = createWorkspaceDetailCache(async (_kind, id, signal) => {
      calls += 1
      if (calls === 1) {
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
        })
      }
      return { id, title: '新项目详情' }
    })
    const staleController = new AbortController()
    const freshController = new AbortController()

    const stale = cache.load('chapter', 7, 'v1', { signal: staleController.signal })
    staleController.abort()
    const fresh = cache.load('chapter', 7, 'v1', { signal: freshController.signal })

    expect((await fresh).record?.title).toBe('新项目详情')
    expect((await stale).status).toBe('degraded')
    expect(calls).toBe(2)
  })

  test('keeps latest review per type for the chapter neighborhood plus latest global per type', () => {
    const reviews = [
      { id: 1, chapter_id: 3, chapter_no: 3, review_type: 'prose_quality', created_at: '2026-07-13T01:00:00Z' },
      { id: 2, chapter_id: 3, chapter_no: 3, review_type: 'prose_quality', created_at: '2026-07-13T02:00:00Z' },
      { id: 3, chapter_id: 4, chapter_no: 4, review_type: 'editor_report', created_at: '2026-07-13T03:00:00Z' },
      { id: 4, chapter_id: 6, chapter_no: 6, review_type: 'prose_quality', created_at: '2026-07-13T04:00:00Z' },
      { id: 5, chapter_id: null, chapter_no: null, review_type: 'book_review', created_at: '2026-07-13T05:00:00Z' },
      { id: 6, chapter_id: 7, chapter_no: 7, review_type: 'editor_report', created_at: '2026-07-13T06:00:00Z' },
    ]
    const working = selectChapterWorkingSet(chapters, 4)

    expect(selectReviewDetailIds(reviews, working)).toEqual([6, 5, 4, 3, 2])
  })

  test('selects active and exceptional runs plus the latest bounded operational categories', () => {
    const runs = [
      { id: 1, run_type: 'chapter_group_generation', status: 'completed', created_at: '2026-07-13T01:00:00Z' },
      { id: 2, run_type: 'chapter_group_generation', status: 'completed', created_at: '2026-07-13T02:00:00Z' },
      { id: 3, run_type: 'quality_benchmark', status: 'failed', created_at: '2026-07-13T03:00:00Z' },
      { id: 4, run_type: 'release_repair_queue', status: 'paused', created_at: '2026-07-13T04:00:00Z' },
      { id: 5, run_type: 'batch_generate_prose', status: 'completed', created_at: '2026-07-13T05:00:00Z' },
      { id: 6, run_type: 'serial_governance', status: 'completed', created_at: '2026-07-13T06:00:00Z' },
      { id: 7, run_type: 'generate_prose', status: 'running', created_at: '2026-07-13T07:00:00Z' },
    ]

    expect(selectRunDetailIds(runs)).toEqual(expect.arrayContaining([7, 6, 5, 4, 3, 2, 1]))
    expect(selectRunDetailIds(runs).slice(0, 3)).toEqual([7, 4, 3])

    const manyFailures = Array.from({ length: 40 }, (_, index) => ({
      id: 100 + index,
      run_type: 'generate_prose',
      status: 'failed',
      created_at: `2026-07-13T10:${String(59 - index).padStart(2, '0')}:00Z`,
    }))
    const olderCategories = [
      { id: 90, run_type: 'chapter_group_generation', status: 'completed', created_at: '2026-07-13T01:00:00Z' },
      { id: 91, run_type: 'batch_generate_prose', status: 'completed', created_at: '2026-07-13T02:00:00Z' },
      { id: 92, run_type: 'release_repair_queue', status: 'completed', created_at: '2026-07-13T03:00:00Z' },
      { id: 93, run_type: 'serial_governance', status: 'completed', created_at: '2026-07-13T04:00:00Z' },
    ]
    const bounded = selectRunDetailIds([...manyFailures, ...olderCategories], 12)
    expect(bounded).toHaveLength(12)
    expect(bounded).toEqual(expect.arrayContaining([90, 91, 92, 93]))

    const trendRuns = [
      ...Array.from({ length: 18 }, (_, index) => ({ id: 300 + index, run_type: 'batch_generate_prose', status: 'completed', created_at: `2026-07-12T${String(index).padStart(2, '0')}:00:00Z` })),
      ...Array.from({ length: 18 }, (_, index) => ({ id: 400 + index, run_type: 'longform_production_repair', status: 'completed', created_at: `2026-07-11T${String(index).padStart(2, '0')}:00:00Z` })),
    ]
    const trendSelected = selectRunDetailIds(trendRuns, 32)
    expect(trendSelected.filter(id => id >= 300 && id < 400)).toHaveLength(12)
    expect(trendSelected.filter(id => id >= 400)).toHaveLength(12)

    const priorityRuns = [
      ...trendRuns,
      { id: 800, run_type: 'generate_prose', status: 'running', created_at: '2026-06-01T00:00:00Z' },
      { id: 801, run_type: 'quality_benchmark', status: 'failed', created_at: '2026-06-01T00:01:00Z' },
    ]
    const prioritySelected = selectRunDetailIds(priorityRuns, 12)
    expect(prioritySelected).toEqual(expect.arrayContaining([800, 801]))
    expect(prioritySelected.slice(0, 2)).toEqual([801, 800])
    expect(prioritySelected.some(id => id >= 300 && id < 400)).toBe(true)
    expect(prioritySelected.some(id => id >= 400 && id < 500)).toBe(true)
  })

  test('deduplicates concurrent detail requests and retains summaries in degraded state on failure', async () => {
    let calls = 0
    const pendingResolvers: Array<(value: any) => void> = []
    const cache = createWorkspaceDetailCache(async (kind, id) => {
      calls += 1
      if (id === 9) throw new Error('detail unavailable')
      return new Promise(resolve => pendingResolvers.push(resolve))
    })

    const first = cache.load('review', 8, 'v1')
    const second = cache.load('review', 8, 'v1')
    expect(calls).toBe(1)
    pendingResolvers[0]({ id: 8, payload: '{"score":91}', issues: ['保留承接'] })
    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(firstResult).toEqual(secondResult)

    const failed = await cache.load('review', 9, 'v1')
    const merged = applyWorkspaceDetailResults(
      [{ id: 8, summary: '评分 91' }, { id: 9, summary: '评分 72' }],
      [firstResult, failed],
    )
    expect(merged[0]).toMatchObject({ id: 8, summary: '评分 91', payload: '{"score":91}', detail_status: 'ready' })
    expect(merged[1]).toMatchObject({ id: 9, summary: '评分 72', detail_status: 'degraded' })
    expect(merged[1]).not.toHaveProperty('payload')
    expect(calls).toBe(2)

    const failedAgain = await cache.load('review', 9, 'v1')
    expect(failedAgain.status).toBe('degraded')
    expect(calls).toBe(3)

    const degradedRun = applyWorkspaceDetailResults([
      {
        id: 19,
        status: 'completed',
        admission_status: 'accepted_with_warnings',
        admission_warning_count: 2,
        admission_warning_preview: '静态描写偏多',
        story_state_pending: true,
        story_state_warning: '故事状态等待补同步',
        post_commit_warning_count: 1,
      },
    ], [{ kind: 'run', id: 19, status: 'degraded', error: 'detail unavailable' }])
    expect(degradedRun[0]).toMatchObject({
      admission_status: 'accepted_with_warnings',
      admission_warning_count: 2,
      story_state_pending: true,
      post_commit_warning_count: 1,
      detail_status: 'degraded',
    })
  })

  test('keeps a bounded latest history for review types that drive planning and auto trends', () => {
    const reviews = Array.from({ length: 14 }, (_, index) => ({
      id: 500 + index,
      chapter_id: 20 + index,
      chapter_no: 20 + index,
      review_type: 'delivery_risk_convergence',
      created_at: `2026-07-13T${String(index).padStart(2, '0')}:00:00Z`,
    }))
    const selected = selectReviewDetailIds(reviews, [{ id: 99, chapter_no: 99 }])
    expect(selected).toEqual([513, 512, 511, 510, 509])

    const manyTypes = Array.from({ length: 140 }, (_, index) => ({
      id: 700 + index,
      review_type: `bounded_type_${index}`,
      created_at: `2026-07-13T00:${String(index % 60).padStart(2, '0')}:00Z`,
    }))
    expect(selectReviewDetailIds(manyTypes, [])).toHaveLength(96)
  })

  test('does not let a detail request that predates clear repopulate the cache', async () => {
    let calls = 0
    const resolvers: Array<(value: any) => void> = []
    const cache = createWorkspaceDetailCache(async () => {
      calls += 1
      return new Promise(resolve => resolvers.push(resolve))
    })

    const stale = cache.load('chapter', 7, 'same-version')
    cache.clear()
    const fresh = cache.load('chapter', 7, 'same-version')
    expect(calls).toBe(2)
    resolvers[1]({ id: 7, title: '新项目章节' })
    expect((await fresh).record?.title).toBe('新项目章节')
    resolvers[0]({ id: 7, title: '旧项目章节' })
    await stale

    const cached = await cache.load('chapter', 7, 'same-version')
    expect(cached.record?.title).toBe('新项目章节')
    expect(calls).toBe(2)
  })

  test('preserves representative planning, writing, and auto outputs with latest working-set details', () => {
    const project = {
      title: '工作集等价回归',
      reference_config: {
        writing_bible: {
          promise: '少年用残阵打破旧秩序',
          volumes: [{ title: '第一卷', goal: '拿到试炼资格', stages: [{ title: '外门压迫', conflict: '执事阻拦' }] }],
        },
        story_state: { last_updated_chapter: 2 },
      },
    }
    const fullChapters = [
      { id: 1, chapter_no: 1, title: '旧令', chapter_goal: '找到残阵', conflict: '执事搜查', ending_hook: '阵纹亮起', chapter_text: '第一章正文。'.repeat(300), raw_payload: { must_advance: ['残阵现身'] }, updated_at: '2026-07-13T01:00:00Z' },
      { id: 2, chapter_no: 2, title: '阵纹', chapter_goal: '保住试炼资格', conflict: '执事当众剥夺资格', ending_hook: '内门长老点名', chapter_text: '第二章正文。'.repeat(300), raw_payload: { must_advance: ['公开反击'] }, scene_list: [{ scene_no: 1, title: '当众验阵' }], updated_at: '2026-07-13T02:00:00Z' },
      { id: 3, chapter_no: 3, title: '点名', chapter_goal: '进入内门视野', conflict: '旧秩序追加条件', ending_hook: '残阵缺口扩大', chapter_text: '', raw_payload: { must_advance: ['接住点名'] }, updated_at: '2026-07-13T03:00:00Z' },
    ]
    const qualityPayload = JSON.stringify({
      chapter_id: 2,
      chapter_no: 2,
      self_check: { review: { score: 88, passed: true, issues: [], needs_revision: false } },
    })
    const fullReviews = [
      { id: 10, chapter_id: 2, chapter_no: 2, review_type: 'prose_quality', status: 'ok', summary: '旧质量记录', payload: qualityPayload, issues: [], created_at: '2026-07-13T01:00:00Z' },
      { id: 11, chapter_id: 2, chapter_no: 2, review_type: 'prose_quality', status: 'ok', summary: '最新质量记录', payload: qualityPayload, issues: [], created_at: '2026-07-13T02:00:00Z' },
      { id: 12, chapter_id: null, chapter_no: null, review_type: 'first30_retention_diagnosis', status: 'ok', summary: '前30章留存 84', payload: JSON.stringify({ report: { score: 84, status: 'ready', summary: '留存稳定', positioning: { promise_ready: true }, segments: [], chapter_cards: [], risks: [], next_actions: [] } }), issues: [], created_at: '2026-07-13T03:00:00Z' },
      { id: 13, chapter_id: null, chapter_no: null, review_type: 'unrelated_archive', status: 'ok', summary: '旧归档', payload: JSON.stringify({ archive: 'x'.repeat(20000) }), issues: [], created_at: '2026-07-13T00:00:00Z' },
    ]
    const fullRuns = [
      { id: 21, run_type: 'chapter_group_generation', status: 'completed', step_name: 'chapter-2', input_ref: '{}', output_ref: JSON.stringify({ chapter_id: 2, admission_status: 'accepted' }), created_at: '2026-07-13T02:30:00Z' },
      { id: 20, run_type: 'unrelated_archive', status: 'completed', step_name: 'archive', input_ref: '{"archive":true}', output_ref: JSON.stringify({ archive: 'y'.repeat(20000) }), created_at: '2026-07-13T00:30:00Z' },
    ]
    const chapterSummaries = fullChapters.map(chapter => ({
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      chapter_text: chapter.chapter_text,
      has_prose: Boolean(chapter.chapter_text),
      has_scene_plan: Boolean(chapter.scene_list?.length),
      word_count: chapter.chapter_text.replace(/\s/g, '').length,
      updated_at: chapter.updated_at,
    }))
    const reviewSummaries = fullReviews.map(review => ({
      id: review.id,
      chapter_id: review.chapter_id,
      chapter_no: review.chapter_no,
      review_type: review.review_type,
      status: review.status,
      summary: review.summary,
      created_at: review.created_at,
      issue_count: review.issues.length,
      preview: '',
      payload_bytes: review.payload.length,
    }))
    const runSummaries = fullRuns.map(run => ({
      id: run.id,
      run_type: run.run_type,
      status: run.status,
      step_name: run.step_name,
      created_at: run.created_at,
      input_bytes: run.input_ref.length,
      output_bytes: run.output_ref.length,
      admission_status: run.id === 21 ? 'accepted' : '',
    }))
    const workingChapterRows = selectChapterWorkingSet(chapterSummaries, 2)
    const workingChapters = applyWorkspaceDetailResults(chapterSummaries, workingChapterRows.map(chapter => ({
      kind: 'chapter' as const,
      id: chapter.id,
      status: 'ready' as const,
      record: fullChapters.find(item => item.id === chapter.id),
    })))
    const selectedReviewIds = selectReviewDetailIds(reviewSummaries, workingChapterRows)
    const workingReviews = applyWorkspaceDetailResults(reviewSummaries, selectedReviewIds.map(id => ({
      kind: 'review' as const,
      id,
      status: 'ready' as const,
      record: fullReviews.find(item => item.id === id),
    })))
    const selectedRunIds = selectRunDetailIds(runSummaries)
    const workingRuns = applyWorkspaceDetailResults(runSummaries, selectedRunIds.map(id => ({
      kind: 'run' as const,
      id,
      status: 'ready' as const,
      record: fullRuns.find(item => item.id === id),
    })))
    const buildModels = (chaptersInput: any[], reviewsInput: any[], runsInput: any[]) => {
      const activeChapter = chaptersInput.find(item => item.id === 2)
      const planning = buildPlanningWorkspaceModel({
        selectedProject: project,
        outlines: [],
        chapters: chaptersInput,
        activeChapter,
        reviews: reviewsInput,
        settingEntities: [],
      })
      const writing = buildWritingCockpitModel({
        project,
        outlines: [],
        chapters: chaptersInput,
        activeChapter,
        reviews: reviewsInput,
        activeRuns: runsInput,
        materialScore: { score: 90 },
        memorySummary: { memory_count: 1 },
      })
      const auto = buildAutoCreationDirectorModel({
        planning,
        writing,
        activeTasks: [],
        selectedModelId: 1,
        reviews: reviewsInput,
        runRecords: runsInput,
        chapters: chaptersInput,
        storyState: project.reference_config.story_state,
      })
      return { planning, writing, auto }
    }
    const full = buildModels(fullChapters, fullReviews, fullRuns)
    const working = buildModels(workingChapters, workingReviews, workingRuns)

    expect(working.planning.first30Retention).toEqual(full.planning.first30Retention)
    expect(working.planning.topStatus).toEqual(full.planning.topStatus)
    expect(working.writing.chapterAcceptanceDesk).toEqual(full.writing.chapterAcceptanceDesk)
    expect(working.writing.chapterHandoffDesk).toEqual(full.writing.chapterHandoffDesk)
    expect(working.auto.status).toBe(full.auto.status)
    expect(working.auto.mainAction).toEqual(full.auto.mainAction)
    expect(working.auto.deliveryRiskGate).toEqual(full.auto.deliveryRiskGate)
    expect(working.auto.batchReviewQueue).toEqual(full.auto.batchReviewQueue)
  })
})
