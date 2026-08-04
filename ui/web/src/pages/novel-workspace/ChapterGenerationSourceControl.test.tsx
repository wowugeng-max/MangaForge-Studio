import React from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import apiClient from '../../api/client'
import { chapterSourceApi, type ChapterGenerationSourceView } from '../../api/mcp'
import {
  authorityUnknownState,
  confirmedAuthorityState,
  createChapterSourceOperationFence,
  StaleChapterSourceOperationError,
} from './chapterGenerationSourceModel'

test('provides the controlled chapter generation source module', async () => {
  const moduleFile = Bun.file(new URL('./ChapterGenerationSourceControl.tsx', import.meta.url))
  expect(await moduleFile.exists()).toBe(true)
})

function sourceView(
  active: 'model' | 'mcp' = 'model',
  options: { modelId?: number; locked?: boolean; mcp?: boolean } = {},
): ChapterGenerationSourceView {
  const modelId = options.modelId ?? 217
  const binding = {
    server_id: 'buda',
    key_id: 3,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: 'model-x',
  }
  const hasMcp = options.mcp !== false
  return {
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active,
      model: { model_id: modelId },
      ...(hasMcp ? { mcp: binding } : {}),
    },
    fingerprint: `sha256:${(active === 'model' ? '1' : '2').repeat(64)}`,
    locked: options.locked === true,
    display: {
      active,
      model_id: modelId,
      mcp: hasMcp ? binding : null,
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

async function chapterSourceFailure(kind: 'transport' | 'definite', code = 'GENERATION_SOURCE_BUSY') {
  const original = apiClient.post
  ;(apiClient as any).post = kind === 'transport'
    ? async () => { throw new Error('private network failure') }
    : async () => ({ status: 409, data: { error_code: code, error: 'private server cause' } })
  try {
    await chapterSourceApi.activate(999, 'mcp')
  } catch (error) {
    return error
  } finally {
    ;(apiClient as any).post = original
  }
  throw new Error('expected source API failure')
}

async function loadControlModule() {
  return import('./ChapterGenerationSourceControl') as Promise<Record<string, any>>
}

function actionHarness(module: Record<string, any>, options: {
  projectId?: number
  initial?: ChapterGenerationSourceView
  api?: Record<string, (...args: any[]) => Promise<any>>
} = {}) {
  let authority = confirmedAuthorityState(options.initial || sourceView('model'))
  let selectedModelId = authority.source?.source.model.model_id
  let settingsOpens = 0
  const notifications: string[] = []
  const pending: boolean[] = []
  const fence = createChapterSourceOperationFence()
  const projectId = options.projectId || 1
  fence.enterProject(projectId, 101)
  const actions = module.createChapterGenerationSourceActions({
    projectId,
    getAuthority: () => authority,
    selectedModelId,
    beginSourceOperation: () => fence.begin(projectId, 101),
    assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
    onAuthorityChange: (next: any) => { authority = next },
    onSelectedModelConfirmed: (id: number) => { selectedModelId = id },
    onOpenSettings: () => { settingsOpens += 1 },
    onPendingChange: (value: boolean) => pending.push(value),
    notifyError: (text: string) => notifications.push(text),
    api: options.api,
  })
  return {
    actions,
    fence,
    get authority() { return authority },
    set authority(value) { authority = value },
    get selectedModelId() { return selectedModelId },
    set selectedModelId(value) { selectedModelId = value },
    get settingsOpens() { return settingsOpens },
    notifications,
    pending,
  }
}

describe('controlled exclusive chapter source actions', () => {
  test('silently drops a click whose project token is already stale before begin', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const notifications: string[] = []
    let mutations = 0
    const actions = module.createChapterGenerationSourceActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView('model')),
      beginSourceOperation: () => { throw new StaleChapterSourceOperationError() },
      assertSourceOperationCurrent: () => {},
      onAuthorityChange: () => {},
      onSelectedModelConfirmed: () => {},
      onOpenSettings: () => {},
      onPendingChange: () => {},
      notifyError: (text: string) => notifications.push(text),
      api: { activate: async () => { mutations += 1; return sourceView('mcp') } },
    })
    await expect(actions.activate('mcp')).resolves.toBeUndefined()
    expect({ mutations, notifications }).toEqual({ mutations: 0, notifications: [] })
  })

  test('keeps the confirmed active source while activation is pending', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const mutation = deferred<ChapterGenerationSourceView>()
    const calls: string[] = []
    const harness = actionHarness(module, {
      api: {
        activate: async () => { calls.push('activate'); return mutation.promise },
        get: async () => { calls.push('get'); return sourceView('mcp') },
      },
    })

    const operation = harness.actions.activate('mcp')
    await Promise.resolve()
    expect(harness.authority.source?.source.active).toBe('model')
    expect(harness.pending).toEqual([true])
    mutation.resolve(sourceView('mcp'))
    await operation
    expect(harness.authority.source?.source.active).toBe('mcp')
    expect(calls).toEqual(['activate'])
    expect(harness.pending).toEqual([true, false])
  })

  test('does not reconcile definite HTTP failures and opens settings only for explicit invalid MCP codes', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const busy = await chapterSourceFailure('definite')
    let reads = 0
    const harness = actionHarness(module, {
      api: {
        activate: async () => { throw busy },
        get: async () => { reads += 1; return sourceView('mcp') },
      },
    })
    await harness.actions.activate('mcp')
    expect(harness.authority.source?.source.active).toBe('model')
    expect(reads).toBe(0)
    expect(harness.settingsOpens).toBe(0)
    expect(harness.notifications).toEqual(['章节来源正在被生成任务使用，请等待当前任务结束后再修改'])

    const invalid = await chapterSourceFailure('definite', 'MCP_BINDING_INVALID')
    const invalidHarness = actionHarness(module, {
      api: { activate: async () => { throw invalid }, get: async () => sourceView('model') },
    })
    await invalidHarness.actions.activate('mcp')
    expect(invalidHarness.settingsOpens).toBe(1)
  })

  test('keeps pending through a transport failure and performs exactly one authoritative GET', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const transport = await chapterSourceFailure('transport')
    const read = deferred<ChapterGenerationSourceView>()
    let mutations = 0
    let reads = 0
    const harness = actionHarness(module, {
      api: {
        activate: async () => { mutations += 1; throw transport },
        get: async () => { reads += 1; return read.promise },
      },
    })
    const operation = harness.actions.activate('mcp')
    await Promise.resolve()
    await Promise.resolve()
    expect({ mutations, reads }).toEqual({ mutations: 1, reads: 1 })
    expect(harness.pending).toEqual([true])
    expect(harness.authority.source?.source.active).toBe('model')
    read.resolve(sourceView('mcp'))
    await operation
    expect(harness.authority.source?.source.active).toBe('mcp')
    expect(harness.pending).toEqual([true, false])
  })

  test('enters authority unknown after reconciliation failure and recovers only through explicit one-GET refreshes', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const transport = await chapterSourceFailure('transport')
    let reads = 0
    let recover = false
    const harness = actionHarness(module, {
      api: {
        activate: async () => { throw transport },
        get: async () => {
          reads += 1
          if (!recover) throw new Error('private read cause')
          return sourceView('mcp')
        },
      },
    })
    await harness.actions.activate('mcp')
    expect(harness.authority.authorityUnknown).toBe(true)
    expect(harness.authority.source.source.active).toBe('model')
    expect(harness.notifications).toEqual(['章节来源权威状态暂时无法确认，请重新获取'])
    expect(reads).toBe(1)
    await Promise.resolve()
    expect(reads).toBe(1)

    await harness.actions.refresh()
    expect(reads).toBe(2)
    expect(harness.authority.authorityUnknown).toBe(true)
    recover = true
    await harness.actions.refresh()
    expect(reads).toBe(3)
    expect(harness.authority.authorityUnknown).toBe(false)
    expect(harness.authority.source?.source.active).toBe('mcp')
  })

  test('saveModel follows ambiguous-to-unknown-to-explicit-refresh authority recovery', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const transport = await chapterSourceFailure('transport')
    let saves = 0
    let reads = 0
    let recover = false
    const harness = actionHarness(module, {
      api: {
        saveModel: async (_projectId: number, modelId: number) => {
          saves += 1
          expect(modelId).toBe(301)
          throw transport
        },
        get: async () => {
          reads += 1
          if (!recover) throw new Error('offline')
          return sourceView('model', { modelId: 301 })
        },
      },
    })
    await harness.actions.saveModel(301)
    expect({ saves, reads }).toEqual({ saves: 1, reads: 1 })
    expect(harness.authority.authorityUnknown).toBe(true)
    expect(harness.selectedModelId).toBe(217)
    recover = true
    await harness.actions.refresh()
    expect({ saves, reads }).toEqual({ saves: 1, reads: 2 })
    expect(harness.selectedModelId).toBe(301)
  })

  test('bounds activate, saveModel, reconciliation, and explicit refresh without lifecycle abort signals', async () => {
    const module = await loadControlModule()
    const apiModule = await import('../../api/mcp') as Record<string, any>
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const transport = await chapterSourceFailure('transport')
    const calls: Array<{ kind: string; options: any }> = []
    const activation = actionHarness(module, {
      api: {
        activate: async (_projectId: number, _active: string, options: any) => {
          calls.push({ kind: 'activate', options })
          throw transport
        },
        get: async (_projectId: number, options: any) => {
          calls.push({ kind: 'reconcile', options })
          return sourceView('mcp')
        },
      },
    })
    await activation.actions.activate('mcp')

    const modelSave = actionHarness(module, {
      api: {
        saveModel: async (_projectId: number, _modelId: number, options: any) => {
          calls.push({ kind: 'saveModel', options })
          return sourceView('model', { modelId: 301 })
        },
      },
    })
    await modelSave.actions.saveModel(301)

    const refresh = actionHarness(module)
    refresh.authority = authorityUnknownState(
      sourceView('model'),
      new Error('private authority diagnostic') as any,
    )
    const refreshActions = module.createChapterGenerationSourceActions({
      projectId: 1,
      getAuthority: () => refresh.authority,
      beginSourceOperation: () => refresh.fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => refresh.fence.assertCurrent(token),
      onAuthorityChange: (next: any) => { refresh.authority = next },
      onSelectedModelConfirmed: () => {},
      onOpenSettings: () => {},
      onPendingChange: (value: boolean) => refresh.pending.push(value),
      notifyError: (text: string) => refresh.notifications.push(text),
      api: {
        get: async (_projectId: number, options: any) => {
          calls.push({ kind: 'refresh', options })
          return sourceView('mcp')
        },
      },
    })
    await refreshActions.refresh()

    expect({
      timeoutConstant: apiModule.CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
      calls: calls.map(call => ({
        kind: call.kind,
        signal: call.options?.signal,
        timeout: call.options?.timeout,
      })),
      activationPending: activation.pending,
      modelPending: modelSave.pending,
      refreshPending: refresh.pending,
    }).toEqual({
      timeoutConstant: 120_000,
      calls: [
        { kind: 'activate', signal: undefined, timeout: 120_000 },
        { kind: 'reconcile', signal: undefined, timeout: 120_000 },
        { kind: 'saveModel', signal: undefined, timeout: 120_000 },
        { kind: 'refresh', signal: undefined, timeout: 120_000 },
      ],
      activationPending: [true, false],
      modelPending: [true, false],
      refreshPending: [true, false],
    })
  })

  test('does not abort an already-started source mutation on project switch but gives it a bounded deadline', async () => {
    const module = await loadControlModule()
    expect(typeof module.createChapterGenerationSourceActions).toBe('function')
    if (typeof module.createChapterGenerationSourceActions !== 'function') return
    const mutation = deferred<ChapterGenerationSourceView>()
    let mutationOptions: any
    const harness = actionHarness(module, {
      api: {
        activate: async (_projectId: number, _active: string, options: any) => {
          mutationOptions = options
          return mutation.promise
        },
      },
    })
    const operation = harness.actions.activate('mcp')
    await Promise.resolve()
    harness.fence.enterProject(2, 202)
    harness.pending.splice(0)
    const projectB = confirmedAuthorityState(sourceView('model', { modelId: 301, mcp: false }))
    harness.authority = projectB
    mutation.resolve(sourceView('mcp'))
    await operation

    expect({
      signal: mutationOptions?.signal,
      timeout: mutationOptions?.timeout,
      authority: harness.authority,
      pending: harness.pending,
      notifications: harness.notifications,
    }).toEqual({
      signal: undefined,
      timeout: 120_000,
      authority: projectB,
      pending: [],
      notifications: [],
    })
  })

  test.each(['mutation_success', 'http_error', 'reconcile_success', 'reconcile_failure'] as const)(
    'drops stale project A %s without changing project B side effects',
    async scenario => {
      const module = await loadControlModule()
      expect(typeof module.createChapterGenerationSourceActions).toBe('function')
      if (typeof module.createChapterGenerationSourceActions !== 'function') return
      const mutation = deferred<ChapterGenerationSourceView>()
      const read = deferred<ChapterGenerationSourceView>()
      const transport = await chapterSourceFailure('transport')
      const definite = await chapterSourceFailure('definite', 'MCP_BINDING_INVALID')
      let getCalls = 0
      const harness = actionHarness(module, {
        api: {
          activate: async () => {
            if (scenario.startsWith('reconcile')) throw transport
            return mutation.promise
          },
          get: async () => { getCalls += 1; return read.promise },
        },
      })
      const operation = harness.actions.activate('mcp')
      await Promise.resolve()
      await Promise.resolve()
      harness.fence.enterProject(2, 202)
      const projectB = confirmedAuthorityState(sourceView('model', { modelId: 301, mcp: false }))
      harness.authority = projectB
      harness.selectedModelId = 301
      harness.notifications.splice(0)
      harness.pending.splice(0)
      const opensBefore = harness.settingsOpens
      if (scenario === 'mutation_success') mutation.resolve(sourceView('mcp'))
      else if (scenario === 'http_error') mutation.reject(definite)
      if (scenario === 'reconcile_success') read.resolve(sourceView('mcp'))
      if (scenario === 'reconcile_failure') read.reject(new Error('private authority error'))
      await operation
      expect(harness.authority).toBe(projectB)
      expect(harness.notifications).toEqual([])
      expect(harness.pending).toEqual([])
      expect(harness.settingsOpens).toBe(opensBefore)
      expect(harness.selectedModelId).toBe(301)
      if (scenario.startsWith('reconcile')) expect(getCalls).toBe(1)
    },
  )
})

describe('controlled chapter source rendering', () => {
  test.each([
    ['model', false],
    ['mcp', false],
    ['model', true],
  ] as const)('renders active and retained details for %s with compact=%s', async (active, compact) => {
    const module = await loadControlModule()
    expect(typeof module.ChapterGenerationSourceControl).toBe('function')
    if (typeof module.ChapterGenerationSourceControl !== 'function') return
    const html = renderToStaticMarkup(React.createElement(module.ChapterGenerationSourceControl, {
      projectId: 1,
      authority: confirmedAuthorityState(sourceView(active)),
      modelOptions: [{ value: 217, label: '模型 217' }],
      selectedModelId: 217,
      compact,
      locallyBusy: false,
      beginSourceOperation: () => ({ projectId: 1, loadEpoch: 1, operationEpoch: 1 }),
      assertSourceOperationCurrent: () => {},
      onAuthorityChange: () => {},
      onSelectedModelConfirmed: () => {},
      onOpenSettings: () => {},
    }))
    expect(html).toContain(`data-active-source=\"${active}\"`)
    expect(html).toContain(active === 'model' ? 'API' : 'MCP')
    if (!compact) {
      expect(html).toContain('已停用')
      expect(html).toContain('is-inactive')
    } else {
      expect(html).not.toContain('is-inactive')
    }
    if (active === 'mcp') {
      expect(html).toContain('章节生产链当前由 MCP Agent 执行')
      expect(html).toContain('ant-select-disabled')
    } else {
      expect(html).not.toContain('章节生产链当前由 MCP Agent 执行')
    }
  })

  test('disables every source action for busy, locked, unknown, pending, and null authority states', async () => {
    const module = await loadControlModule()
    expect(typeof module.chapterSourceControlAvailability).toBe('function')
    if (typeof module.chapterSourceControlAvailability !== 'function') return
    const ordinary = confirmedAuthorityState(sourceView('model'))
    const locked = confirmedAuthorityState(sourceView('model', { locked: true }))
    const diagnostic = new Error('private') as any
    const unknown = authorityUnknownState(sourceView('model'), diagnostic)
    expect(module.chapterSourceControlAvailability({ authority: ordinary, locallyBusy: false, pending: false })).toEqual({ disabled: false, reason: '' })
    for (const input of [
      { authority: ordinary, locallyBusy: true, pending: false },
      { authority: locked, locallyBusy: false, pending: false },
      { authority: ordinary, locallyBusy: false, pending: true },
    ]) {
      expect(module.chapterSourceControlAvailability(input)).toEqual({
        disabled: true,
        reason: '当前章节任务正在运行，结束后可切换来源',
      })
    }
    expect(module.chapterSourceControlAvailability({ authority: unknown, locallyBusy: false, pending: false })).toEqual({
      disabled: true,
      reason: '章节来源权威状态暂时无法确认，请重新获取',
    })
    expect(module.chapterSourceControlAvailability({ authority: confirmedAuthorityState(null), locallyBusy: false, pending: false }).disabled).toBe(true)
  })

  test('does not guess an active source or confirmed model when authority has no value', async () => {
    const module = await loadControlModule()
    expect(typeof module.ChapterGenerationSourceControl).toBe('function')
    if (typeof module.ChapterGenerationSourceControl !== 'function') return
    const html = renderToStaticMarkup(React.createElement(module.ChapterGenerationSourceControl, {
      projectId: 1,
      authority: confirmedAuthorityState(null),
      modelOptions: [{ value: 217, label: '本地模型 217' }],
      selectedModelId: 217,
      compact: false,
      locallyBusy: false,
      beginSourceOperation: () => ({ projectId: 1, loadEpoch: 1, operationEpoch: 1 }),
      assertSourceOperationCurrent: () => {},
      onAuthorityChange: () => {},
      onSelectedModelConfirmed: () => {},
      onOpenSettings: () => {},
    }))
    expect(html).toContain('data-active-source="unknown"')
    expect(html).not.toContain('本地模型 217')
    expect(html).toContain('章节来源加载失败，请重新加载项目')
  })

  test('styles active, retained inactive, compact, busy, and responsive model details', async () => {
    const css = await Bun.file(new URL('../NovelProjectWorkspace.css', import.meta.url)).text()
    expect(css).toContain('.novel-chapter-source-control')
    expect(css).toContain('display: inline-flex')
    expect(css).toContain('.novel-chapter-source-detail.is-active')
    expect(css).toContain('.novel-chapter-source-detail.is-inactive')
    expect(css).toContain('opacity: 0.52')
    expect(css).toContain('filter: grayscale(0.35)')
    expect(css).toContain('.novel-chapter-source-control.is-busy')
    expect(css).toContain('cursor: not-allowed')
    expect(css).toContain('.novel-chapter-source-control.is-compact .novel-chapter-source-detail.is-inactive')
    expect(css).toContain('.novel-chapter-source-model')
    expect(css).toContain('width: 220px')
  })
})
