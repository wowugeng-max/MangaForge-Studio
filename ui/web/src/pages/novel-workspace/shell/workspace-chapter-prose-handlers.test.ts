import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { message } from 'antd'
import {
  confirmedAuthorityState,
  normalizeChapterSourceView,
  StaleChapterSourceOperationError,
} from '../chapterGenerationSourceModel'
import { canFinalizeProseRun } from './workspace-chapter-prose-handlers'
import * as proseHandlers from './workspace-chapter-prose-handlers'
import { createPreflightHandlers } from './workspace-preflight-handlers'

const originalFetch = globalThis.fetch
const originalMessage = {
  warning: message.warning,
  success: message.success,
  loading: message.loading,
  error: message.error,
  info: message.info,
  destroy: message.destroy,
}

afterEach(() => {
  globalThis.fetch = originalFetch
  Object.assign(message, originalMessage)
})

function sourceAuthority(active: 'model' | 'mcp') {
  const mcp = {
    server_id: 'buda',
    key_id: 3,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: '',
  }
  return confirmedAuthorityState(normalizeChapterSourceView({
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active,
      model: { model_id: 217 },
      ...(active === 'mcp' ? { mcp } : {}),
    },
    fingerprint: `sha256:${'a'.repeat(64)}`,
    locked: false,
    display: {
      active,
      model_id: 217,
      mcp: active === 'mcp' ? mcp : null,
    },
  }))
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

function mutableSourceAuthority(initial: 'model' | 'mcp') {
  let authority = sourceAuthority(initial)
  let operationEpoch = 0
  return {
    get: () => authority,
    begin: () => Object.freeze({ projectId: 7, loadEpoch: 1, operationEpoch: ++operationEpoch }),
    assert: (token: { operationEpoch: number }) => {
      if (token.operationEpoch !== operationEpoch) throw new StaleChapterSourceOperationError()
    },
    switchTo: (active: 'model' | 'mcp') => {
      operationEpoch += 1
      authority = sourceAuthority(active)
    },
    invalidate: () => { operationEpoch += 1 },
  }
}

function invocationOwnership(
  source: ReturnType<typeof mutableSourceAuthority>,
  getSourceMutationPending: () => boolean = () => false,
) {
  let owner: any = null
  let ownerEpoch = 0
  return {
    claimChapterInvocation: () => {
      if (getSourceMutationPending()) return { status: 'source_mutation_pending' as const }
      if (owner) {
        try {
          source.assert(owner.token)
          return { status: 'invocation_pending' as const }
        } catch (error) {
          if (!(error instanceof StaleChapterSourceOperationError)) throw error
        }
      }
      owner = Object.freeze({
        projectId: 7,
        ownerEpoch: ++ownerEpoch,
        token: source.begin(),
      })
      return { status: 'claimed' as const, owner }
    },
    chapterInvocationOwnerIsActive: (candidate: unknown) => owner === candidate,
    releaseChapterInvocation: (candidate: unknown) => {
      if (owner !== candidate) return false
      owner = null
      return true
    },
  }
}

const successfulReloadToken = Object.freeze({ projectId: 7, loadEpoch: 2, operationEpoch: 1 })

function installMessageRecorder(events: string[] = []) {
  const warnings: any[] = []
  const successes: any[] = []
  const errors: any[] = []
  const destroyed: any[] = []
  ;(message as any).warning = (value: any) => { warnings.push(value); events.push('warning') }
  ;(message as any).success = (value: any) => { successes.push(value); events.push('success') }
  ;(message as any).loading = () => { events.push('loading') }
  ;(message as any).error = (value: any) => { errors.push(value); events.push('error') }
  ;(message as any).info = () => { events.push('info') }
  ;(message as any).destroy = (key?: any) => { destroyed.push(key); events.push('destroy') }
  return { warnings, successes, errors, destroyed }
}

function preflightDeps(overrides: Record<string, any> = {}) {
  const authority = overrides.chapterGenerationSourceAuthority || sourceAuthority('model')
  const deps = {
    activeChapter: { id: 11, chapter_no: 1 },
    apiClient: { post: async () => ({ data: {} }) },
    applyStyleSampleActionForChapter: async () => {},
    buildPreDraftBriefForActiveChapter: async () => {},
    chapterGenerationSourceAuthority: authority,
    getChapterGenerationSourceAuthority: () => authority,
    getChapterSourceMutationPending: () => false,
    beginChapterSourceOperation: () => Object.freeze({ projectId: 7, loadEpoch: 1, operationEpoch: 1 }),
    assertChapterSourceOperationCurrent: () => {},
    flushPendingSave: async () => true,
    generateSceneCardsForChapter: async () => {},
    loadProjectModules: async () => successfulReloadToken,
    openEditor: () => {},
    openStoryAssetsWorkspace: () => {},
    openStoryStateEditor: () => {},
    projectId: 7,
    selectChapterForWriting: async () => true,
    selectedModelId: 73,
    setOutlineTreeOpen: () => {},
    sortedChapters: [],
    syncStoryStateForChapter: async () => {},
    ...overrides,
  }
  let owner: any = null
  return {
    ...deps,
    claimChapterInvocation: overrides.claimChapterInvocation || (() => {
      if (deps.getChapterSourceMutationPending()) return { status: 'source_mutation_pending' as const }
      if (owner) return { status: 'invocation_pending' as const }
      owner = Object.freeze({ projectId: 7, ownerEpoch: 1, token: deps.beginChapterSourceOperation() })
      return { status: 'claimed' as const, owner }
    }),
    chapterInvocationOwnerIsActive: overrides.chapterInvocationOwnerIsActive || ((candidate: unknown) => owner === candidate),
    releaseChapterInvocation: overrides.releaseChapterInvocation || ((candidate: unknown) => {
      if (owner !== candidate) return false
      owner = null
      return true
    }),
  }
}

function proseDeps(overrides: Record<string, any> = {}) {
  const chapter = { id: 11, chapter_no: 1, title: '开篇', chapter_text: '' }
  const authority = overrides.chapterGenerationSourceAuthority || sourceAuthority('model')
  const deps = {
    proseBatchCancelRef: { current: false },
    setProseBatchStatus: () => {},
    setProseProgress: () => {},
    setStepProseLoading: () => {},
    sortedChapters: [chapter],
    activeChapter: chapter,
    apiClient: { defaults: { baseURL: 'http://novel.test' }, post: async () => ({ data: {} }) },
    autoCreationDirectorModel: {
      targetChapter: null,
      chapterLaunchGate: null,
      longformCompass: null,
      longformBattleDesk: null,
      millionWordRunway: null,
    },
    chapterGenerationSourceAuthority: authority,
    getChapterGenerationSourceAuthority: () => authority,
    getChapterSourceMutationPending: () => false,
    beginChapterSourceOperation: () => Object.freeze({ projectId: 7, loadEpoch: 1, operationEpoch: 1 }),
    assertChapterSourceOperationCurrent: () => {},
    chapterWordTargetPayload: () => ({ target_word_count: 1800 }),
    chapters: [chapter],
    confirmReferenceReady: async () => true,
    flushPendingSave: async () => true,
    loadProjectModules: async () => successfulReloadToken,
    projectId: 7,
    selectedModelId: 73,
    setChapters: () => {},
    setGeneratingProse: () => {},
    setGenerationPipeline: () => {},
    setRightPanelOpen: () => {},
    setRightPanelTab: () => {},
    setStreamingChapterId: () => {},
    setStreamingPercent: () => {},
    setStreamingProgress: () => {},
    setStreamingText: () => {},
    showGenerationBlockedModal: () => {},
    startKernelWriteChapter: async () => {},
    worldbuilding: [],
    characters: [],
    outlines: [],
    ...overrides,
  }
  let owner: any = null
  return {
    ...deps,
    claimChapterInvocation: overrides.claimChapterInvocation || (() => {
      if (deps.getChapterSourceMutationPending()) return { status: 'source_mutation_pending' as const }
      if (owner) return { status: 'invocation_pending' as const }
      owner = Object.freeze({ projectId: 7, ownerEpoch: 1, token: deps.beginChapterSourceOperation() })
      return { status: 'claimed' as const, owner }
    }),
    chapterInvocationOwnerIsActive: overrides.chapterInvocationOwnerIsActive || ((candidate: unknown) => owner === candidate),
    releaseChapterInvocation: overrides.releaseChapterInvocation || ((candidate: unknown) => {
      if (owner !== candidate) return false
      owner = null
      return true
    }),
  }
}

function streamResponse(chapterId = 11) {
  return new Response(
    `data: ${JSON.stringify({ type: 'done', chapter: { id: chapterId, chapter_text: '正文' }, result: { modelName: 'source' } })}\n\n`,
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  )
}

describe('chapter source-aware invocation handlers', () => {
  test('model to MCP during deferred preflight flush makes zero requests and no completion side effects', async () => {
    const source = mutableSourceAuthority('model')
    const flush = deferred<boolean>()
    const posts: any[] = []
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: source.get(),
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      flushPendingSave: () => flush.promise,
      apiClient: { post: async (...args: any[]) => { posts.push(args); return { data: {} } } },
      loadProjectModules: async () => { events.push('load'); return successfulReloadToken },
    }))

    const action = handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters', 'setting_workshop', 'chapter_setting_usage'],
      closeModal: () => { events.push('close') },
      continueAfterRepair: () => { events.push('continue') },
    })
    source.switchTo('mcp')
    flush.resolve(true)
    await action

    expect(posts).toHaveLength(0)
    expect(events).not.toContain('load')
    expect(events).not.toContain('close')
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
    expect(notices.warnings).toContainEqual({
      content: '章节来源已变化，请重试',
      key: 'generation-preflight-repair',
      duration: 3,
    })
  })

  test('MCP to model during deferred preflight flush makes zero MCP requests and no completion side effects', async () => {
    const source = mutableSourceAuthority('mcp')
    const flush = deferred<boolean>()
    const posts: any[] = []
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: source.get(),
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      selectedModelId: undefined,
      flushPendingSave: () => flush.promise,
      apiClient: { post: async (...args: any[]) => { posts.push(args); return { data: {} } } },
      loadProjectModules: async () => { events.push('load') },
    }))

    const action = handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters'],
      closeModal: () => { events.push('close') },
      continueAfterRepair: () => { events.push('continue') },
    })
    source.switchTo('model')
    flush.resolve(true)
    await action

    expect(posts).toHaveLength(0)
    expect(events).not.toContain('load')
    expect(events).not.toContain('close')
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
    expect(notices.warnings).toContainEqual({
      content: '章节来源已变化，请重试',
      key: 'generation-preflight-repair',
      duration: 3,
    })
  })

  test('model preflight source switch after its first response suppresses both later model-only requests', async () => {
    const source = mutableSourceAuthority('model')
    const firstStarted = deferred<void>()
    const firstResponse = deferred<{ data: { applied: any[] } }>()
    const posts: Array<{ url: string; body: any }> = []
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: source.get(),
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      apiClient: {
        post: async (url: string, body: any) => {
          posts.push({ url, body })
          if (posts.length === 1) {
            firstStarted.resolve()
            return firstResponse.promise
          }
          return { data: { total: 1 } }
        },
      },
      loadProjectModules: async () => { events.push('load') },
    }))

    const action = handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters', 'setting_workshop', 'chapter_setting_usage'],
      continueAfterRepair: () => { events.push('continue') },
    })
    await firstStarted.promise
    source.switchTo('mcp')
    firstResponse.resolve({ data: { applied: [] } })
    await action

    expect(posts.map(item => item.url)).toEqual(['/novel/chapters/11/auto-repair-context'])
    expect(events).not.toContain('load')
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
    expect(notices.warnings).toContainEqual({
      content: '章节来源已变化，请重试',
      key: 'generation-preflight-repair',
      duration: 3,
    })
  })

  test('source operation begun during module reload suppresses success before authority state commits', async () => {
    const source = mutableSourceAuthority('mcp')
    const reloadStarted = deferred<void>()
    const reloadDone = deferred<void>()
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: source.get(),
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      selectedModelId: undefined,
      apiClient: { post: async () => ({ data: { applied: [] } }) },
      loadProjectModules: async () => {
        const reloadToken = source.begin()
        reloadStarted.resolve()
        await reloadDone.promise
        return reloadToken
      },
    }))

    const action = handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters'],
      closeModal: () => { events.push('close') },
      continueAfterRepair: () => { events.push('continue') },
    })
    await reloadStarted.promise
    source.invalidate()
    reloadDone.resolve()
    await action

    expect(events).not.toContain('close')
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
    expect(notices.warnings).toContainEqual({
      content: '章节来源已变化，请重试',
      key: 'generation-preflight-repair',
      duration: 3,
    })
  })

  test('missing preflight reload token suppresses completion without a false source-change warning', async () => {
    const posts: any[] = []
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: sourceAuthority('mcp'),
      getChapterGenerationSourceAuthority: () => sourceAuthority('mcp'),
      selectedModelId: undefined,
      apiClient: { post: async (...args: any[]) => { posts.push(args); return { data: { applied: [] } } } },
      loadProjectModules: async () => { events.push('load'); return undefined },
    }))

    await handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters'],
      closeModal: () => { events.push('close') },
      continueAfterRepair: () => { events.push('continue') },
    })

    expect(posts).toHaveLength(1)
    expect(events).toContain('load')
    expect(events).not.toContain('close')
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
    expect(notices.destroyed).toContain('generation-preflight-repair')
    expect(notices.warnings).not.toContainEqual(expect.objectContaining({
      content: '章节来源已变化，请重试',
    }))
  })

  test('generateCurrentChapterProse starts a kernel write_chapter job and does not fetch generate-prose', async () => {
    const started: number[] = []
    let fetches = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      startKernelWriteChapter: async (chapterId: number) => { started.push(chapterId) },
    }))

    await handlers.generateCurrentChapterProse()

    expect(started).toEqual([11])
    expect(fetches).toBe(0)
  })

  test('missing repair reload token suppresses success and prose continuation', async () => {
    const events: string[] = []
    const notices = installMessageRecorder(events)
    let fetches = 0
    let kernelStarts = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => ({ data: { applied: [], warnings: [] } }),
      },
      loadProjectModules: async () => { events.push('load'); return undefined },
      setGeneratingProse: (value: boolean) => { events.push(`generating:${value}`) },
      setStreamingChapterId: (value: number | null) => { events.push(`chapter:${value}`) },
      setStreamingPercent: (value: number) => { events.push(`percent:${value}`) },
      setStreamingProgress: (value: string) => { events.push(`progress:${value}`) },
      startKernelWriteChapter: async () => { kernelStarts += 1 },
    }))

    await handlers.repairContextAndGenerateCurrentChapter()

    expect(events).toContain('load')
    expect(fetches).toBe(0)
    expect(kernelStarts).toBe(0)
    expect(notices.successes).toHaveLength(0)
    expect(notices.warnings).not.toContain('章节来源已变化，请重试')
    expect(events).toContain('generating:false')
    expect(events).toContain('chapter:null')
    expect(events).toContain('percent:0')
    expect(events).toContain('progress:')
  })

  test('missing batch reload token suppresses result-panel and completion notifications', async () => {
    const events: string[] = []
    const notices = installMessageRecorder(events)
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ chapter: { id: 11, chapter_text: '正文' } }),
      { status: 200 },
    )) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      loadProjectModules: async () => { events.push('load'); return undefined },
      setRightPanelOpen: () => { events.push('right-panel') },
      setRightPanelTab: () => { events.push('right-tab') },
    }))

    await handlers.stepGenerateProse()

    expect(events).toContain('load')
    expect(events).not.toContain('right-panel')
    expect(events).not.toContain('right-tab')
    expect(notices.successes).toHaveLength(0)
    expect(notices.warnings).toHaveLength(0)
  })

  test('pending source mutations block every chapter entry without superseding the mutation token', async () => {
    const notices = installMessageRecorder()
    const runScenario = async (
      createAction: (source: ReturnType<typeof mutableSourceAuthority>, getPending: () => boolean, request: () => void) => Promise<void>,
    ) => {
      const source = mutableSourceAuthority('model')
      const mutationToken = source.begin()
      let pending = true
      let requests = 0
      const request = () => { requests += 1 }

      await createAction(source, () => pending, request)

      expect(requests).toBe(0)
      expect(() => source.assert(mutationToken)).not.toThrow()
      let mutationCommitted = false
      source.assert(mutationToken)
      mutationCommitted = true
      expect(mutationCommitted).toBe(true)

      pending = false
      await createAction(source, () => pending, request)
      expect(requests).toBeGreaterThan(0)
    }

    await runScenario(async (source, getPending, request) => {
      const handlers = createPreflightHandlers(preflightDeps({
        getChapterGenerationSourceAuthority: source.get,
        getChapterSourceMutationPending: getPending,
        beginChapterSourceOperation: source.begin,
        assertChapterSourceOperationCurrent: source.assert,
        apiClient: { post: async () => { request(); return { data: { applied: [] } } } },
        loadProjectModules: async () => source.begin(),
      }))
      await handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, { repairKeys: ['characters'] })
    })
    await runScenario(async (source, getPending, request) => {
      const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
        getChapterGenerationSourceAuthority: source.get,
        getChapterSourceMutationPending: getPending,
        beginChapterSourceOperation: source.begin,
        assertChapterSourceOperationCurrent: source.assert,
        startKernelWriteChapter: async () => { request() },
        loadProjectModules: async () => source.begin(),
      }))
      await handlers.generateCurrentChapterProse()
    })
    await runScenario(async (source, getPending, request) => {
      const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
        getChapterGenerationSourceAuthority: source.get,
        getChapterSourceMutationPending: getPending,
        beginChapterSourceOperation: source.begin,
        assertChapterSourceOperationCurrent: source.assert,
        apiClient: {
          defaults: { baseURL: 'http://novel.test' },
          post: async () => { request(); return { data: { applied: [], warnings: [] } } },
        },
        startKernelWriteChapter: async () => { request() },
        loadProjectModules: async () => source.begin(),
      }))
      await handlers.repairContextAndGenerateCurrentChapter()
    })
    await runScenario(async (source, getPending, request) => {
      globalThis.fetch = (async () => {
        request()
        return new Response(JSON.stringify({ chapter: { id: 11, chapter_text: '正文' } }), { status: 200 })
      }) as any
      const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
        getChapterGenerationSourceAuthority: source.get,
        getChapterSourceMutationPending: getPending,
        beginChapterSourceOperation: source.begin,
        assertChapterSourceOperationCurrent: source.assert,
        apiClient: {
          defaults: { baseURL: 'http://novel.test' },
          post: async () => { request(); return { data: {} } },
        },
        loadProjectModules: async () => source.begin(),
      }))
      await handlers.stepGenerateProse()
    })

    const pendingWarnings = notices.warnings.filter(value => (
      typeof value === 'object' && value?.content === '章节来源正在切换，请稍后重试'
    ))
    expect(pendingWarnings).toHaveLength(4)
  })

  test('a stale owner claim is projected before preflight or prose can request a provider', async () => {
    const notices = installMessageRecorder()
    let requests = 0
    const staleClaim = () => { throw new StaleChapterSourceOperationError() }
    const preflight = createPreflightHandlers(preflightDeps({
      claimChapterInvocation: staleClaim,
      apiClient: { post: async () => { requests += 1; return { data: {} } } },
    }))
    globalThis.fetch = (async () => { requests += 1; return streamResponse() }) as any
    const prose = proseHandlers.createChapterProseHandlers(proseDeps({
      claimChapterInvocation: staleClaim,
      startKernelWriteChapter: async () => { requests += 1 },
    }))
    const failures: unknown[] = []

    for (const action of [
      () => preflight.repairGenerationPreflightGaps({ chapter_id: 11 }, { repairKeys: ['characters'] }),
      () => prose.generateCurrentChapterProse(),
    ]) {
      try {
        await action()
      } catch (error) {
        failures.push(error)
      }
    }

    expect(failures).toEqual([])
    expect(requests).toBe(0)
    expect(notices.warnings.map(value => typeof value === 'object' ? value?.content : value))
      .toEqual(['章节来源已变化，请重试', '章节来源已变化，请重试'])
  })

  test('a deferred preflight invocation owns the entry so a duplicate click starts zero additional requests', async () => {
    installMessageRecorder()
    const source = mutableSourceAuthority('model')
    const ownership = invocationOwnership(source)
    const requestStarted = deferred<void>()
    const response = deferred<{ data: { applied: any[] } }>()
    let requests = 0
    const handlers = createPreflightHandlers(preflightDeps({
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      ...ownership,
      apiClient: {
        post: async () => {
          requests += 1
          requestStarted.resolve()
          return response.promise
        },
      },
      loadProjectModules: async () => source.begin(),
    }))

    const first = handlers.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      { repairKeys: ['characters'] },
    )
    await requestStarted.promise
    const duplicate = handlers.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      { repairKeys: ['characters'] },
    )
    await Promise.resolve()

    expect(requests).toBe(1)
    response.resolve({ data: { applied: [] } })
    await Promise.all([first, duplicate])

    await handlers.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      { repairKeys: ['characters'] },
    )
    expect(requests).toBe(2)
  })

  test('a superseded batch finally cannot clear the successor owner loading progress or cancel state', async () => {
    installMessageRecorder()
    const source = mutableSourceAuthority('model')
    const ownership = invocationOwnership(source)
    const response = deferred<Response>()
    const requestStarted = deferred<void>()
    const cancelRef = { current: false }
    const loading: boolean[] = []
    const progress: any[] = []
    globalThis.fetch = (async () => {
      requestStarted.resolve()
      return response.promise
    }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      ...ownership,
      proseBatchCancelRef: cancelRef,
      setStepProseLoading: (value: boolean) => { loading.push(value) },
      setProseProgress: (value: any) => { progress.push(value) },
    }))

    const staleBatch = handlers.stepGenerateProse()
    await requestStarted.promise
    source.switchTo('mcp')
    const successor = ownership.claimChapterInvocation()
    expect(successor.status).toBe('claimed')
    if (successor.status !== 'claimed') return
    cancelRef.current = true
    response.resolve(new Response(JSON.stringify({ chapter: { id: 11, chapter_text: 'stale' } }), { status: 200 }))
    await staleBatch

    expect(ownership.chapterInvocationOwnerIsActive(successor.owner)).toBe(true)
    expect(loading).toEqual([true])
    expect(progress).not.toContainEqual({ current: 0, total: 0 })
    expect(cancelRef.current).toBe(true)
  })

  test('provider requests carry the invocation authority fingerprint without changing request bodies', async () => {
    installMessageRecorder()
    const fingerprint = sourceAuthority('model').source!.fingerprint
    const posts: any[][] = []
    const preflight = createPreflightHandlers(preflightDeps({
      apiClient: {
        post: async (...args: any[]) => {
          posts.push(args)
          return { data: { applied: [], total: 0 } }
        },
      },
    }))
    await preflight.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      { repairKeys: ['characters', 'setting_workshop', 'chapter_setting_usage'] },
    )

    expect(posts.map(args => args[1])).toEqual([
      { project_id: 7, model_id: 73 },
      { use_model: true, model_id: 73 },
      { project_id: 7, model_id: 73, use_model: true, apply: true },
    ])
    expect(posts.every(args => args[2]?.headers?.['x-chapter-generation-source-fingerprint'] === fingerprint)).toBe(true)

    const fetches: Array<{ url: string; init: RequestInit }> = []
    const kernelStarts: number[] = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      fetches.push({ url: String(url), init: init || {} })
      if (String(url).includes('stream=1')) return streamResponse()
      return new Response(JSON.stringify({ chapter: { id: 11, chapter_text: '正文' } }), { status: 200 })
    }) as any
    const single = proseHandlers.createChapterProseHandlers(proseDeps({
      startKernelWriteChapter: async (chapterId: number) => { kernelStarts.push(chapterId) },
    }))
    await single.generateCurrentChapterProse()
    const batch = proseHandlers.createChapterProseHandlers(proseDeps())
    await batch.stepGenerateProse()

    expect(kernelStarts).toEqual([11])
    expect(fetches).toHaveLength(1)
    expect(fetches[0].url).toContain('/novel/chapters/11/generate-prose')
    expect(fetches[0].url).not.toContain('stream=1')
    expect(fetches.every(item => (item.init.headers as Record<string, string>)?.['x-chapter-generation-source-fingerprint'] === fingerprint)).toBe(true)
  })

  test('source change wins over a rejected preflight provider request', async () => {
    const source = mutableSourceAuthority('model')
    const requestStarted = deferred<void>()
    const response = deferred<any>()
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const handlers = createPreflightHandlers(preflightDeps({
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      apiClient: {
        post: async () => {
          requestStarted.resolve()
          return response.promise
        },
      },
    }))

    const action = handlers.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      { repairKeys: ['characters'], continueAfterRepair: () => { events.push('continue') } },
    )
    await requestStarted.promise
    source.switchTo('mcp')
    response.reject(new Error('old provider failed'))
    await action

    expect(notices.errors).toHaveLength(0)
    expect(notices.warnings).toContainEqual({
      content: '章节来源已变化，请重试',
      key: 'generation-preflight-repair',
      duration: 3,
    })
    expect(events).not.toContain('success')
    expect(events).not.toContain('continue')
  })

  test('source change wins over rejected single and repair prose requests', async () => {
    const generateSource = mutableSourceAuthority('model')
    const generateStarted = deferred<void>()
    const generateResponse = deferred<void>()
    const generateNotices = installMessageRecorder()
    const generate = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: generateSource.get,
      beginChapterSourceOperation: generateSource.begin,
      assertChapterSourceOperationCurrent: generateSource.assert,
      startKernelWriteChapter: async () => {
        generateStarted.resolve()
        return generateResponse.promise
      },
    }))

    const generateAction = generate.generateCurrentChapterProse()
    await generateStarted.promise
    generateSource.switchTo('mcp')
    generateResponse.reject(new Error('old generate provider failed'))
    await generateAction

    expect(generateNotices.errors).toHaveLength(0)
    expect(generateNotices.warnings).toContain('章节来源已变化，请重试')

    const repairSource = mutableSourceAuthority('mcp')
    const repairStarted = deferred<void>()
    const repairResponse = deferred<any>()
    const repairNotices = installMessageRecorder()
    const repair = proseHandlers.createChapterProseHandlers(proseDeps({
      chapterGenerationSourceAuthority: repairSource.get(),
      getChapterGenerationSourceAuthority: repairSource.get,
      beginChapterSourceOperation: repairSource.begin,
      assertChapterSourceOperationCurrent: repairSource.assert,
      selectedModelId: undefined,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => {
          repairStarted.resolve()
          return repairResponse.promise
        },
      },
    }))

    const repairAction = repair.repairContextAndGenerateCurrentChapter()
    await repairStarted.promise
    repairSource.switchTo('model')
    repairResponse.reject(new Error('old repair provider failed'))
    await repairAction

    expect(repairNotices.errors).toHaveLength(0)
    expect(repairNotices.warnings).toContain('章节来源已变化，请重试')
  })

  test('source change wins over a rejected batch request before stale failure UI or summary', async () => {
    const source = mutableSourceAuthority('model')
    const requestStarted = deferred<void>()
    const response = deferred<Response>()
    const notices = installMessageRecorder()
    const batchStatuses: any[] = []
    let summaries = 0
    globalThis.fetch = (async () => {
      requestStarted.resolve()
      return response.promise
    }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => { summaries += 1; return { data: {} } },
      },
      setProseBatchStatus: (value: any) => { batchStatuses.push(value) },
    }))

    const action = handlers.stepGenerateProse()
    await requestStarted.promise
    source.switchTo('mcp')
    response.reject(new Error('old batch provider failed'))
    await action

    expect(summaries).toBe(0)
    expect(notices.errors).toHaveLength(0)
    expect(notices.warnings).toContain('章节来源已变化，请重试')
    expect(batchStatuses.some(value => Boolean(value?.lastError))).toBe(false)
  })

  test('prose entry points stop before fetch, repair, or summary when source changes during flush or confirm', async () => {
    installMessageRecorder()
    let fetches = 0
    let posts = 0
    let kernelStarts = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any

    const generateSource = mutableSourceAuthority('model')
    const generateFlush = deferred<boolean>()
    const generate = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: generateSource.get,
      beginChapterSourceOperation: generateSource.begin,
      assertChapterSourceOperationCurrent: generateSource.assert,
      flushPendingSave: () => generateFlush.promise,
      startKernelWriteChapter: async () => { kernelStarts += 1 },
    }))
    const generateAction = generate.generateCurrentChapterProse()
    generateSource.switchTo('mcp')
    generateFlush.resolve(true)
    await generateAction

    const repairSource = mutableSourceAuthority('mcp')
    const repairFlush = deferred<boolean>()
    const repair = proseHandlers.createChapterProseHandlers(proseDeps({
      chapterGenerationSourceAuthority: repairSource.get(),
      getChapterGenerationSourceAuthority: repairSource.get,
      beginChapterSourceOperation: repairSource.begin,
      assertChapterSourceOperationCurrent: repairSource.assert,
      selectedModelId: undefined,
      flushPendingSave: () => repairFlush.promise,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => { posts += 1; return { data: {} } },
      },
    }))
    const repairAction = repair.repairContextAndGenerateCurrentChapter()
    repairSource.switchTo('model')
    repairFlush.resolve(true)
    await repairAction

    const batchSource = mutableSourceAuthority('model')
    const confirm = deferred<boolean>()
    const batch = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: batchSource.get,
      beginChapterSourceOperation: batchSource.begin,
      assertChapterSourceOperationCurrent: batchSource.assert,
      confirmReferenceReady: () => confirm.promise,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => { posts += 1; return { data: {} } },
      },
    }))
    const batchAction = batch.stepGenerateProse()
    batchSource.switchTo('mcp')
    confirm.resolve(true)
    await batchAction

    expect(fetches).toBe(0)
    expect(posts).toBe(0)
    expect(kernelStarts).toBe(0)
  })

  test('repair response source switch prevents reload, success, and prose continuation', async () => {
    const source = mutableSourceAuthority('mcp')
    const repairStarted = deferred<void>()
    const repairResponse = deferred<{ data: { applied: any[]; warnings: any[] } }>()
    const events: string[] = []
    const notices = installMessageRecorder(events)
    let fetches = 0
    let kernelStarts = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      chapterGenerationSourceAuthority: source.get(),
      getChapterGenerationSourceAuthority: source.get,
      beginChapterSourceOperation: source.begin,
      assertChapterSourceOperationCurrent: source.assert,
      selectedModelId: undefined,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async () => {
          repairStarted.resolve()
          return repairResponse.promise
        },
      },
      loadProjectModules: async () => { events.push('load'); return successfulReloadToken },
      startKernelWriteChapter: async () => { kernelStarts += 1 },
    }))

    const action = handlers.repairContextAndGenerateCurrentChapter()
    await repairStarted.promise
    source.switchTo('model')
    repairResponse.resolve({ data: { applied: [], warnings: [] } })
    await action

    expect(fetches).toBe(0)
    expect(kernelStarts).toBe(0)
    expect(events).not.toContain('load')
    expect(events).not.toContain('success')
    expect(notices.warnings).toContain('章节来源已变化，请重试')
  })

  test('MCP preflight repair makes one request with repair keys, no model id, then reloads, closes, notifies and continues', async () => {
    const events: string[] = []
    const notices = installMessageRecorder(events)
    const posts: Array<{ url: string; body: any }> = []
    const handlers = createPreflightHandlers(preflightDeps({
      chapterGenerationSourceAuthority: sourceAuthority('mcp'),
      selectedModelId: undefined,
      apiClient: {
        post: async (url: string, body: any) => {
          posts.push({ url, body })
          events.push('post')
          return { data: { applied: [{ type: 'character_created' }, { type: 'setting_created' }] } }
        },
      },
      loadProjectModules: async () => { events.push('load'); return successfulReloadToken },
    }))

    await handlers.repairGenerationPreflightGaps(
      { chapter_id: 11 },
      {
        repairKeys: ['characters', 'setting_workshop', 'chapter_setting_usage'],
        closeModal: () => { events.push('close') },
        continueAfterRepair: () => { events.push('continue') },
      },
    )

    expect(posts).toEqual([{
      url: '/novel/chapters/11/auto-repair-context',
      body: { project_id: 7, repair_keys: ['characters', 'setting_workshop', 'chapter_setting_usage'] },
    }])
    expect(posts[0].body).not.toHaveProperty('model_id')
    expect(events).toEqual(['loading', 'post', 'load', 'close', 'success', 'continue'])
    expect(notices.successes[0]).toMatchObject({ content: '已通过 MCP 自动补齐 2 项材料' })
  })

  test('model preflight repair keeps the three endpoint order and exact model payloads', async () => {
    installMessageRecorder()
    const posts: Array<{ url: string; body: any }> = []
    const handlers = createPreflightHandlers(preflightDeps({
      apiClient: {
        post: async (url: string, body: any) => {
          posts.push({ url, body })
          return { data: url.includes('auto-repair') ? { applied: [] } : { total: 2 } }
        },
      },
    }))

    await handlers.repairGenerationPreflightGaps({ chapter_id: 11 }, {
      repairKeys: ['characters', 'setting_workshop', 'chapter_setting_usage'],
    })

    expect(posts).toEqual([
      {
        url: '/novel/chapters/11/auto-repair-context',
        body: { project_id: 7, model_id: 73 },
      },
      {
        url: '/novel/projects/7/settings/incubate-from-project',
        body: { use_model: true, model_id: 73 },
      },
      {
        url: '/novel/chapters/11/settings-usage/suggest',
        body: { project_id: 7, model_id: 73, use_model: true, apply: true },
      },
    ])
  })

  test('MCP current prose and repair-and-prose omit model id and resume with kernel write', async () => {
    const events: string[] = []
    installMessageRecorder(events)
    const kernelStarts: number[] = []
    const repairBodies: any[] = []
    let fetches = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      chapterGenerationSourceAuthority: sourceAuthority('mcp'),
      selectedModelId: undefined,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async (_url: string, body: any) => {
          repairBodies.push(body)
          events.push('repair')
          return { data: { applied: [{ type: 'character_created' }], warnings: [] } }
        },
      },
      loadProjectModules: async () => { events.push('load'); return successfulReloadToken },
      startKernelWriteChapter: async (chapterId: number) => {
        kernelStarts.push(chapterId)
        events.push('kernel')
      },
    }))

    await handlers.generateCurrentChapterProse({ allowIncomplete: true })
    await handlers.repairContextAndGenerateCurrentChapter()

    expect(fetches).toBe(0)
    expect(kernelStarts).toEqual([11, 11])
    expect(repairBodies).toEqual([{ project_id: 7 }])
    expect(repairBodies[0]).not.toHaveProperty('model_id')
    expect(events.slice(events.indexOf('repair'), events.indexOf('kernel', events.indexOf('repair')) + 1))
      .toEqual(['repair', 'load', 'success', 'kernel'])
  })

  test('MCP batch prose omits model id from generation and summary payloads', async () => {
    installMessageRecorder()
    const fetchBodies: any[] = []
    const posts: Array<{ url: string; body: any }> = []
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      fetchBodies.push(JSON.parse(String(init?.body || '{}')))
      return new Response(JSON.stringify({ chapter: { id: 11, chapter_text: '正文' } }), { status: 200 })
    }) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      chapterGenerationSourceAuthority: sourceAuthority('mcp'),
      selectedModelId: undefined,
      apiClient: {
        defaults: { baseURL: 'http://novel.test' },
        post: async (url: string, body: any) => { posts.push({ url, body }); return { data: {} } },
      },
    }))

    await handlers.stepGenerateProse()

    expect(fetchBodies).toHaveLength(1)
    expect(fetchBodies[0]).not.toHaveProperty('model_id')
    expect(posts).toHaveLength(1)
    expect(posts[0].url).toBe('/novel/runs')
    expect(posts[0].body.input_ref).not.toHaveProperty('model_id')
  })

  test('unknown authority fails closed before every request', async () => {
    const notices = installMessageRecorder()
    let requests = 0
    globalThis.fetch = (async () => { requests += 1; return streamResponse() }) as any
    const apiClient = {
      defaults: { baseURL: 'http://novel.test' },
      post: async () => { requests += 1; return { data: {} } },
    }
    const authority = confirmedAuthorityState(null)
    const prose = proseHandlers.createChapterProseHandlers(proseDeps({
      apiClient,
      chapterGenerationSourceAuthority: authority,
      selectedModelId: 73,
      startKernelWriteChapter: async () => { requests += 1 },
    }))
    const preflight = createPreflightHandlers(preflightDeps({
      apiClient,
      chapterGenerationSourceAuthority: authority,
      selectedModelId: 73,
    }))

    await prose.generateCurrentChapterProse()
    await prose.repairContextAndGenerateCurrentChapter()
    await prose.stepGenerateProse()
    await preflight.repairGenerationPreflightGaps({ chapter_id: 11 }, { repairKeys: ['characters'] })

    expect(requests).toBe(0)
    expect(notices.warnings).toEqual(Array(4).fill('章节来源权威状态暂时无法确认'))
  })

  test('model source without an id is blocked while a valid id still starts kernel write', async () => {
    const notices = installMessageRecorder()
    const kernelStarts: number[] = []
    let fetches = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any
    const startKernelWriteChapter = async (chapterId: number) => { kernelStarts.push(chapterId) }
    const blocked = proseHandlers.createChapterProseHandlers(proseDeps({ selectedModelId: undefined, startKernelWriteChapter }))
    const allowed = proseHandlers.createChapterProseHandlers(proseDeps({ selectedModelId: 911, startKernelWriteChapter }))

    await blocked.generateCurrentChapterProse()
    await allowed.generateCurrentChapterProse()

    expect(notices.warnings).toContain('请先选择写作模型')
    expect(fetches).toBe(0)
    expect(kernelStarts).toEqual([11])
  })
})

describe('MCP generation error propagation', () => {
  test('preserves the stable error code and bounded payload on Error objects', () => {
    const buildMcpGenerationFailureError = Reflect.get(proseHandlers, 'buildMcpGenerationFailureError')
    expect(typeof buildMcpGenerationFailureError).toBe('function')
    if (typeof buildMcpGenerationFailureError !== 'function') return
    const payload = {
      error_code: 'MCP_SEND_UNKNOWN',
      error: '任务发送结果未知',
      receipt_status: 'send_unknown',
    }

    const error = buildMcpGenerationFailureError(payload, 'HTTP 502') as any

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('不要重新发送')
    expect(error.error_code).toBe('MCP_SEND_UNKNOWN')
    expect(error.payload).toBe(payload)
  })

  test('uses the payload-preserving error builder in batch HTTP failures', () => {
    const source = readFileSync(join(import.meta.dir, 'workspace-chapter-prose-handlers.tsx'), 'utf8')
    const generateStart = source.indexOf('const generateCurrentChapterProse')
    const generateEnd = source.indexOf('const cancelCurrentChapterProse')
    const generateBody = source.slice(generateStart, generateEnd)

    expect(generateBody).toContain('startKernelWriteChapter')
    expect(generateBody).not.toContain('generate-prose')
    expect(source.match(/throw buildMcpGenerationFailureError\(/g) || []).toHaveLength(1)
    expect(source).not.toContain("throw new Error(payload?.error || raw || `HTTP ${resp.status}`)")
    expect(source).not.toContain("throw new Error(p.error || '正文生成失败')")
    expect(source).not.toContain("throw new Error(data?.error || data?.detail || raw || `HTTP ${resp.status}`)")
  })
})

describe('canFinalizeProseRun', () => {
  test('the active run may write shared streaming UI state', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(run, run)).toBe(true)
  })

  test('a run superseded by a newer controller must not write shared state', () => {
    const oldRun = new AbortController()
    const newRun = new AbortController()
    expect(canFinalizeProseRun(newRun, oldRun)).toBe(false)
  })

  test('after cancel/end with no successor the finishing run may clean up', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(null, run)).toBe(true)
    expect(canFinalizeProseRun(undefined, run)).toBe(true)
  })
})
