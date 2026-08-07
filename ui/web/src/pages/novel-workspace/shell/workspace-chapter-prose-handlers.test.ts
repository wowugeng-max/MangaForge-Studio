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
  return {
    activeChapter: { id: 11, chapter_no: 1 },
    apiClient: { post: async () => ({ data: {} }) },
    applyStyleSampleActionForChapter: async () => {},
    buildPreDraftBriefForActiveChapter: async () => {},
    chapterGenerationSourceAuthority: authority,
    getChapterGenerationSourceAuthority: () => authority,
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
}

function proseDeps(overrides: Record<string, any> = {}) {
  const chapter = { id: 11, chapter_no: 1, title: '开篇', chapter_text: '' }
  const authority = overrides.chapterGenerationSourceAuthority || sourceAuthority('model')
  return {
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
    worldbuilding: [],
    characters: [],
    outlines: [],
    ...overrides,
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

  test('missing prose reload token suppresses single-chapter completion UI', async () => {
    const events: string[] = []
    const notices = installMessageRecorder(events)
    globalThis.fetch = (async () => streamResponse()) as any
    const handlers = proseHandlers.createChapterProseHandlers(proseDeps({
      loadProjectModules: async () => { events.push('load'); return undefined },
      setRightPanelOpen: () => { events.push('right-panel') },
      setStreamingPercent: (value: number) => { events.push(`percent:${value}`) },
      setStreamingProgress: (value: string) => { events.push(`progress:${value}`) },
    }))

    await handlers.generateCurrentChapterProse()

    expect(events).toContain('load')
    expect(events).not.toContain('right-panel')
    expect(events).not.toContain('percent:100')
    expect(events).not.toContain('progress:生成完成')
    expect(notices.successes).toHaveLength(0)
    expect(notices.warnings).not.toContain('章节来源已变化，请重试')
  })

  test('missing repair reload token suppresses success and prose continuation', async () => {
    const events: string[] = []
    const notices = installMessageRecorder(events)
    let fetches = 0
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
    }))

    await handlers.repairContextAndGenerateCurrentChapter()

    expect(events).toContain('load')
    expect(fetches).toBe(0)
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

  test('prose entry points stop before fetch, repair, or summary when source changes during flush or confirm', async () => {
    installMessageRecorder()
    let fetches = 0
    let posts = 0
    globalThis.fetch = (async () => { fetches += 1; return streamResponse() }) as any

    const generateSource = mutableSourceAuthority('model')
    const generateFlush = deferred<boolean>()
    const generate = proseHandlers.createChapterProseHandlers(proseDeps({
      getChapterGenerationSourceAuthority: generateSource.get,
      beginChapterSourceOperation: generateSource.begin,
      assertChapterSourceOperationCurrent: generateSource.assert,
      flushPendingSave: () => generateFlush.promise,
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
  })

  test('repair response source switch prevents reload, success, and prose continuation', async () => {
    const source = mutableSourceAuthority('mcp')
    const repairStarted = deferred<void>()
    const repairResponse = deferred<{ data: { applied: any[]; warnings: any[] } }>()
    const events: string[] = []
    const notices = installMessageRecorder(events)
    let fetches = 0
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
    }))

    const action = handlers.repairContextAndGenerateCurrentChapter()
    await repairStarted.promise
    source.switchTo('model')
    repairResponse.resolve({ data: { applied: [], warnings: [] } })
    await action

    expect(fetches).toBe(0)
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

  test('MCP current prose and repair-and-prose omit model id and resume with strict repair flags', async () => {
    const events: string[] = []
    installMessageRecorder(events)
    const fetchBodies: any[] = []
    const repairBodies: any[] = []
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      fetchBodies.push(JSON.parse(String(init?.body || '{}')))
      events.push('fetch')
      return streamResponse()
    }) as any
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
    }))

    await handlers.generateCurrentChapterProse({ allowIncomplete: true })
    await handlers.repairContextAndGenerateCurrentChapter()

    expect(fetchBodies).toHaveLength(2)
    expect(fetchBodies[0]).not.toHaveProperty('model_id')
    expect(fetchBodies[0].allow_incomplete).toBe(true)
    expect(repairBodies).toEqual([{ project_id: 7 }])
    expect(repairBodies[0]).not.toHaveProperty('model_id')
    expect(fetchBodies[1]).not.toHaveProperty('model_id')
    expect(fetchBodies[1]).toMatchObject({ allow_incomplete: false, force_scene_cards: true })
    expect(events.slice(events.indexOf('repair'), events.indexOf('fetch', events.indexOf('repair')) + 1))
      .toEqual(['repair', 'load', 'success', 'fetch'])
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

  test('model source without an id is blocked while a valid id is preserved in prose', async () => {
    const notices = installMessageRecorder()
    const fetchBodies: any[] = []
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      fetchBodies.push(JSON.parse(String(init?.body || '{}')))
      return streamResponse()
    }) as any
    const blocked = proseHandlers.createChapterProseHandlers(proseDeps({ selectedModelId: undefined }))
    const allowed = proseHandlers.createChapterProseHandlers(proseDeps({ selectedModelId: 911 }))

    await blocked.generateCurrentChapterProse()
    await allowed.generateCurrentChapterProse()

    expect(notices.warnings).toContain('请先选择写作模型')
    expect(fetchBodies).toHaveLength(1)
    expect(fetchBodies[0].model_id).toBe(911)
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

  test('uses the payload-preserving error builder in initial HTTP, SSE, and batch HTTP failures', () => {
    const source = readFileSync(join(import.meta.dir, 'workspace-chapter-prose-handlers.tsx'), 'utf8')

    expect(source.match(/throw buildMcpGenerationFailureError\(/g) || []).toHaveLength(3)
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
