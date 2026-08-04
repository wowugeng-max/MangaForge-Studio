import { afterEach, describe, expect, test } from 'bun:test'
import apiClient from '../../api/client'
import { chapterSourceApi } from '../../api/mcp'

const originalApiPost = apiClient.post
const originalApiGet = apiClient.get
const originalApiPut = apiClient.put

afterEach(() => {
  apiClient.post = originalApiPost
  apiClient.get = originalApiGet
  apiClient.put = originalApiPut
})

async function loadModel() {
  return import('./chapterGenerationSourceModel').catch(() => null)
}

function binding(overrides: Record<string, unknown> = {}) {
  return {
    server_id: 'buda',
    key_id: 3,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: '',
    ...overrides,
  }
}

function rawModelView(modelId = 217) {
  return {
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: modelId },
    },
    fingerprint: `sha256:${'a'.repeat(64)}`,
    locked: false,
    display: { active: 'model', model_id: modelId, mcp: null },
  }
}

function rawMcpView(modelId = 217) {
  const mcp = binding()
  return {
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: { model_id: modelId },
      mcp,
    },
    fingerprint: `sha256:${'b'.repeat(64)}`,
    locked: false,
    display: { active: 'mcp', model_id: modelId, mcp },
  }
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

async function chapterSourceTransportError() {
  const underlying = new Error('socket reset')
  apiClient.post = (async () => { throw underlying }) as any
  try {
    await chapterSourceApi.activate(1, 'mcp')
  } catch (error) {
    return error
  }
  throw new Error('expected chapter source API transport failure')
}

async function chapterSourceHttpError(errorCode: string, errorMessage = `private ${errorCode}`) {
  apiClient.post = (async () => ({
    status: errorCode === 'GENERATION_SOURCE_BUSY' ? 409 : 422,
    data: { error_code: errorCode, error: errorMessage },
  })) as any
  try {
    await chapterSourceApi.activate(1, 'mcp')
  } catch (error) {
    return error
  }
  throw new Error('expected chapter source API HTTP failure')
}

test('forwards a bounded request config through every chapter source API and brands deadline rejection as transport', async () => {
  const apiModule = await import('../../api/mcp') as Record<string, any>
  const controller = new AbortController()
  const timeout = 120_000
  const calls: Array<{ method: string; url: string; config: any }> = []
  apiClient.get = (async (url: string, config: any) => {
    calls.push({ method: 'get', url, config })
    return { data: rawModelView() }
  }) as any
  apiClient.post = (async (url: string, _body: unknown, config: any) => {
    calls.push({ method: 'post', url, config })
    if (url.endsWith('/mcp/test')) {
      return {
        data: {
          ok: true,
          validation: {
            server_id: 'buda',
            key_id: 3,
            agent: { id: 'agent-1', name: 'Agent One' },
          },
        },
      }
    }
    return { data: rawMcpView() }
  }) as any
  apiClient.put = (async (url: string, _body: unknown, config: any) => {
    calls.push({ method: 'put', url, config })
    return { data: rawModelView(301) }
  }) as any

  const options = { signal: controller.signal, timeout }
  await chapterSourceApi.get(1, options)
  await (chapterSourceApi.activate as any)(1, 'mcp', options)
  await (chapterSourceApi.saveModel as any)(1, 301, options)
  await (chapterSourceApi.testMcp as any)(1, binding(), options)
  await (chapterSourceApi.saveMcp as any)(1, binding(), options)

  const timeoutCause = new Error('axios deadline exceeded')
  apiClient.put = (async (_url: string, _body: unknown, config: any) => {
    calls.push({ method: 'put-timeout', url: 'save-mcp', config })
    throw timeoutCause
  }) as any
  let timeoutFailure: unknown
  try {
    await (chapterSourceApi.saveMcp as any)(1, binding(), options)
  } catch (error) {
    timeoutFailure = error
  }

  expect(apiModule.CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS).toBe(timeout)
  expect(calls.map(call => ({
    method: call.method,
    signal: call.config?.signal,
    timeout: call.config?.timeout,
    validateStatus: typeof call.config?.validateStatus,
  }))).toEqual([
    { method: 'get', signal: controller.signal, timeout, validateStatus: 'function' },
    { method: 'post', signal: controller.signal, timeout, validateStatus: 'function' },
    { method: 'put', signal: controller.signal, timeout, validateStatus: 'function' },
    { method: 'post', signal: controller.signal, timeout, validateStatus: 'function' },
    { method: 'put', signal: controller.signal, timeout, validateStatus: 'function' },
    { method: 'put-timeout', signal: controller.signal, timeout, validateStatus: 'function' },
  ])
  expect(apiModule.isChapterSourceNoResponseFailure(timeoutFailure)).toBe(true)
})

describe('authoritative chapter generation source view', () => {
  test('projects API response data before async return without reading a hostile then getter', async () => {
    let thenReads = 0
    const hostilePrototype = Object.defineProperty({}, 'then', {
      get() {
        thenReads += 1
        return undefined
      },
    })
    const raw = Object.assign(Object.create(hostilePrototype), rawModelView())
    apiClient.get = (async () => ({ data: raw })) as any

    const view = await chapterSourceApi.get(1)

    expect(thenReads).toBe(0)
    expect(view).toEqual(rawModelView())
    expect(Object.getPrototypeOf(view)).toBe(Object.prototype)
    expect(view).not.toBe(raw)
  })

  test('hydrates the exact active MCP tuple while retaining the stored model id', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    const input = rawMcpView()
    const view = model.normalizeChapterSourceView(input)

    expect(view).toEqual(input)
    expect(view).not.toBe(input)
    expect(view.source).not.toBe(input.source)
    expect(view.source.model).not.toBe(input.source.model)
    expect(view.source.model.model_id).toBe(217)
    expect(view.source.mcp).toEqual(binding())
    expect(view.source.mcp).not.toBe(input.source.mcp)
    expect(view.display).not.toBe(input.display)
    expect(view.display.mcp).toEqual(binding())
    expect(view.display.mcp).not.toBe(input.display.mcp)
  })

  test('normalizes a false lock and accepts an omitted retained model id', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const input = rawModelView() as any
    input.source.model = {}
    input.display.model_id = null
    input.locked = 'truthy-but-not-locked'

    expect(model.normalizeChapterSourceView(input)).toMatchObject({
      locked: false,
      source: { model: {} },
      display: { model_id: null },
    })
  })

  test('rejects wrong versions, ambiguous active states, invalid model ids and invalid fingerprints', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    const invalid = [
      { mutate: (view: any) => { view.source.version = 'chapter_generation_source_v0' }, message: '版本' },
      { mutate: (view: any) => { view.source.active = 'both'; view.display.active = 'both' }, message: '活动状态' },
      { mutate: (view: any) => { view.source.model.model_id = 0; view.display.model_id = 0 }, message: '模型' },
      { mutate: (view: any) => { view.source.model.model_id = 1.5; view.display.model_id = 1.5 }, message: '模型' },
      { mutate: (view: any) => { view.fingerprint = `sha256:${'A'.repeat(64)}` }, message: '指纹' },
      { mutate: (view: any) => { view.fingerprint = `sha256:${'a'.repeat(63)}` }, message: '指纹' },
    ]
    for (const fixture of invalid) {
      const view = structuredClone(rawModelView())
      fixture.mutate(view)
      expect(() => model.normalizeChapterSourceView(view)).toThrow(fixture.message)
    }
  })

  test('rejects an active MCP without a binding and every incomplete or ill-typed binding', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    const missing = structuredClone(rawMcpView()) as any
    delete missing.source.mcp
    missing.display.mcp = null
    expect(() => model.normalizeChapterSourceView(missing)).toThrow('活动 MCP 绑定缺失')

    const invalidBindings = [
      { server_id: '' },
      { key_id: 0 },
      { key_id: 1.5 },
      { adapter_id: '' },
      { agent_id: '' },
      { model: 1 },
    ]
    for (const override of invalidBindings) {
      const invalid = structuredClone(rawMcpView()) as any
      Object.assign(invalid.source.mcp, override)
      Object.assign(invalid.display.mcp, override)
      expect(() => model.normalizeChapterSourceView(invalid)).toThrow('章节 MCP 绑定无效')
    }
  })

  test('rejects inconsistent display records instead of losing stable source binding ids', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    const invalid = structuredClone(rawMcpView()) as any
    invalid.display.mcp = { ...invalid.display.mcp, agent_id: 'different-agent' }
    expect(() => model.normalizeChapterSourceView(invalid)).toThrow('章节来源展示无效')

    const input = rawMcpView()
    const normalized = model.normalizeChapterSourceView(input)
    const enriched = { ...normalized.display.mcp, server_name: 'metadata only' }
    expect(enriched.server_name).toBe('metadata only')
    expect(normalized.source.mcp).toEqual(binding())
  })

  test('fails closed without exposing hostile shape inspection errors', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const privateDetail = '章节 private proxy detail'
    const hostile = new Proxy({}, {
      ownKeys() {
        throw new Error(privateDetail)
      },
    })

    let failure: unknown
    try {
      model.normalizeChapterSourceView(hostile)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('章节来源响应无效')
    expect((failure as Error).message).not.toContain(privateDetail)
  })
})

describe('chapter source mutation authority', () => {
  test('rethrows a definite HTTP mutation failure and performs zero authority GETs', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const current = model.normalizeChapterSourceView(rawModelView())
    const expected = { response: { status: 409, data: { error_code: 'GENERATION_SOURCE_BUSY' } } }
    let reads = 0

    await expect(model.commitConfirmedSource({
      current,
      request: async () => { throw expected },
      readAuthoritative: async () => {
        reads += 1
        return model.normalizeChapterSourceView(rawMcpView())
      },
      assertCurrent: () => {},
    })).rejects.toBe(expected)
    expect(reads).toBe(0)
  })

  test('reconciles one no-response mutation failure with exactly one authoritative GET and no mutation retry', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const current = model.normalizeChapterSourceView(rawModelView())
    const committed = model.normalizeChapterSourceView(rawMcpView())
    const transportError = await chapterSourceTransportError()
    let mutationCalls = 0
    let reads = 0

    const result = await model.commitConfirmedSource({
      current,
      request: async () => {
        mutationCalls += 1
        throw transportError
      },
      readAuthoritative: async () => {
        reads += 1
        return committed
      },
      assertCurrent: () => {},
    })

    expect(result).toEqual({ previous: current, source: committed, reconciled: true })
    expect({ mutationCalls, reads }).toEqual({ mutationCalls: 1, reads: 1 })
  })

  test('reports authority unknown with a fixed public message and diagnostic-only underlying causes', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const current = model.normalizeChapterSourceView(rawModelView())
    const mutationError = await chapterSourceTransportError()
    const readError = new Error('private authority read detail')
    let reads = 0

    let failure: any
    try {
      await model.commitConfirmedSource({
        current,
        request: async () => { throw mutationError },
        readAuthoritative: async () => { reads += 1; throw readError },
        assertCurrent: () => {},
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(model.ChapterSourceAuthorityUnknownError)
    expect(failure).toMatchObject({
      code: 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN',
      previous: current,
      mutationTransportError: mutationError,
      authorityReadError: readError,
      message: '章节来源权威状态暂时无法确认',
    })
    expect(reads).toBe(1)
    const formatted = model.formatChapterSourceFailure(failure)
    expect(formatted).toBe('章节来源权威状态暂时无法确认')
    expect(formatted).not.toContain('private mutation')
    expect(formatted).not.toContain('private authority')
  })

  test('keeps authority-unknown causes non-enumerable and out of JSON diagnostics', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const previous = model.normalizeChapterSourceView(rawModelView())
    const mutationCause = { secret: 'private mutation secret' }
    const readCause = { secret: 'private read secret' }
    const failure = new model.ChapterSourceAuthorityUnknownError(previous, mutationCause, readCause)

    expect(failure.mutationTransportError).toBe(mutationCause)
    expect(failure.authorityReadError).toBe(readCause)
    expect(Object.prototype.propertyIsEnumerable.call(failure, 'mutationTransportError')).toBe(false)
    expect(Object.prototype.propertyIsEnumerable.call(failure, 'authorityReadError')).toBe(false)
    expect(JSON.stringify(failure)).not.toContain('private mutation secret')
    expect(JSON.stringify(failure)).not.toContain('private read secret')
  })

  test('performs one explicit authority refresh per call, keeps the same unknown state on failure, and clears only on success', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const previous = model.normalizeChapterSourceView(rawModelView())
    const diagnostic = new model.ChapterSourceAuthorityUnknownError(previous, new Error('mutation'), new Error('read'))
    const unknown = model.authorityUnknownState(previous, diagnostic)
    let reads = 0

    const stillUnknown = await model.refreshChapterSourceAuthority({
      current: unknown,
      readAuthoritative: async () => { reads += 1; throw new Error('still offline') },
      assertCurrent: () => {},
    })
    expect(reads).toBe(1)
    expect(stillUnknown.state).toBe(unknown)
    expect(stillUnknown.readError).toBeInstanceOf(Error)

    const recovered = model.normalizeChapterSourceView(rawMcpView())
    const refreshed = await model.refreshChapterSourceAuthority({
      current: stillUnknown.state,
      readAuthoritative: async () => { reads += 1; return recovered },
      assertCurrent: () => {},
    })
    expect(reads).toBe(2)
    expect(refreshed).toEqual({ state: model.confirmedAuthorityState(recovered), readError: null })
  })

  test('classifies only failures with no HTTP response or status as no-response transport errors', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    const transportError = await chapterSourceTransportError()
    expect(model.isNoResponseTransportError(transportError)).toBe(true)
    expect(model.isNoResponseTransportError(new Error('network down'))).toBe(false)
    expect(model.isNoResponseTransportError({ code: 'ECONNRESET', request: {} })).toBe(false)
    expect(model.isNoResponseTransportError({ response: { status: 500 } })).toBe(false)
    expect(model.isNoResponseTransportError({ response: {} })).toBe(false)
    expect(model.isNoResponseTransportError({ status: 0 })).toBe(false)
    expect(model.isNoResponseTransportError({ status: 503 })).toBe(false)
    expect(model.isNoResponseTransportError(null)).toBe(false)
  })

  test('does not reconcile local mapper or protocol errors', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const current = model.normalizeChapterSourceView(rawModelView())
    let protocolError: unknown
    try {
      model.normalizeChapterSourceView({ ...rawModelView(), fingerprint: 'invalid' })
    } catch (error) {
      protocolError = error
    }

    for (const localError of [new TypeError('local response mapper bug'), protocolError]) {
      let reads = 0
      await expect(model.commitConfirmedSource({
        current,
        request: async () => { throw localError },
        readAuthoritative: async () => {
          reads += 1
          return model.normalizeChapterSourceView(rawMcpView())
        },
        assertCurrent: () => {},
      })).rejects.toBe(localError)
      expect(reads).toBe(0)
    }
  })

  test('fails closed on hostile classifier and formatter inputs without executing traps or getters', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    let getPrototypeOfCalls = 0
    let getCalls = 0
    const hostile = new Proxy({}, {
      getPrototypeOf() {
        getPrototypeOfCalls += 1
        throw new Error('private prototype trap')
      },
      get() {
        getCalls += 1
        throw new Error('private get trap')
      },
    })
    let responseReads = 0
    let statusReads = 0
    let codeReads = 0
    const accessors = Object.defineProperties({}, {
      response: { get() { responseReads += 1; return undefined } },
      status: { get() { statusReads += 1; return undefined } },
      code: { get() { codeReads += 1; return 'ECONNRESET' } },
    })

    expect(model.isNoResponseTransportError(hostile)).toBe(false)
    expect(model.formatChapterSourceFailure(hostile)).toBe('章节来源操作失败')
    expect(model.isNoResponseTransportError(accessors)).toBe(false)
    expect(model.formatChapterSourceFailure(accessors)).toBe('章节来源操作失败')
    expect({ getPrototypeOfCalls, getCalls, responseReads, statusReads, codeReads }).toEqual({
      getPrototypeOfCalls: 0,
      getCalls: 0,
      responseReads: 0,
      statusReads: 0,
      codeReads: 0,
    })
  })

  test('formats stable source errors without recommending a fallback', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return

    for (const code of ['GENERATION_SOURCE_BUSY', 'CHAPTER_MODEL_REQUIRED', 'MCP_BINDING_INVALID']) {
      const failure = await chapterSourceHttpError(code)
      const message = model.formatChapterSourceFailure(failure)
      expect(message.length).toBeGreaterThan(0)
      expect(message).not.toContain('fallback')
      expect(message).not.toContain('回退')
      expect(message).not.toContain('切换模型')
      expect(message).not.toContain('自动重试')
      expect(message).not.toContain('private')
    }
    expect(model.formatChapterSourceFailure(
      await chapterSourceHttpError('GENERATION_SOURCE_BUSY', 'private busy detail'),
    )).toContain('正在被生成任务使用')
    expect(model.formatChapterSourceFailure(
      await chapterSourceHttpError('CHAPTER_MODEL_REQUIRED', 'private model detail'),
    )).toContain('有效的章节模型')
    expect(model.formatChapterSourceFailure(
      await chapterSourceHttpError('UNKNOWN_CHAPTER_SOURCE_FAILURE', 'private unknown detail'),
    )).toBe('章节来源操作失败')
  })
})

describe('chapter source project/load/operation fence', () => {
  test('uses project, load, and operation epochs and freezes every token', async () => {
    const model = await loadModel()
    expect(model).not.toBeNull()
    if (!model) return
    const fence = model.createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const initial = fence.begin(1, 101)
    expect(Object.isFrozen(initial)).toBe(true)
    expect(initial).toEqual({ projectId: 1, loadEpoch: 101, operationEpoch: 2 })
    fence.assertCurrent(initial)

    const mutation = fence.begin(1, 101)
    expect(() => fence.assertCurrent(initial)).toThrow(model.StaleChapterSourceOperationError)
    fence.assertCurrent(mutation)
    expect(() => fence.begin(1, 102)).toThrow(model.StaleChapterSourceOperationError)
    fence.enterProject(2, 102)
    expect(() => fence.assertCurrent(mutation)).toThrow(model.StaleChapterSourceOperationError)
    fence.unmount()
    expect(() => fence.begin(2, 102)).toThrow(model.StaleChapterSourceOperationError)
  })

  test.each(['mutation_success', 'reconcile_success', 'reconcile_failure', 'definite_http_error'] as const)(
    'fences project A %s after switching to B before any setter, error, or settings side effect',
    async (scenario) => {
      const model = await loadModel()
      expect(model).not.toBeNull()
      if (!model) return
      const fence = model.createChapterSourceOperationFence()
      fence.enterProject(1, 101)
      const token = fence.begin(1, 101)
      const current = model.normalizeChapterSourceView(rawModelView(217))
      const committed = model.normalizeChapterSourceView(rawMcpView(217))
      const mutation = deferred<any>()
      const authorityRead = deferred<any>()
      const transportError = await chapterSourceTransportError()
      const ui = {
        authority: model.confirmedAuthorityState(current),
        error: '',
        disabled: false,
        settingsOpen: false,
      }
      let readCalls = 0
      const operation = model.commitConfirmedSource({
        current,
        request: () => mutation.promise,
        readAuthoritative: () => { readCalls += 1; return authorityRead.promise },
        assertCurrent: () => fence.assertCurrent(token),
      }).then((result: any) => {
        fence.assertCurrent(token)
        ui.authority = model.confirmedAuthorityState(result.source)
        ui.disabled = true
        return result
      }).catch((error: unknown) => {
        if (error instanceof model.StaleChapterSourceOperationError) throw error
        fence.assertCurrent(token)
        ui.error = model.formatChapterSourceFailure(error)
        ui.settingsOpen = true
        throw error
      })

      if (scenario === 'reconcile_success' || scenario === 'reconcile_failure') {
        mutation.reject(transportError)
        await flushPromises()
        expect(readCalls).toBe(1)
      }

      const projectB = {
        authority: model.confirmedAuthorityState(model.normalizeChapterSourceView(rawModelView(301))),
        error: '',
        disabled: false,
        settingsOpen: false,
      }
      fence.enterProject(2, 102)
      Object.assign(ui, projectB)

      if (scenario === 'mutation_success') mutation.resolve(committed)
      else if (scenario === 'reconcile_success') authorityRead.resolve(committed)
      else if (scenario === 'reconcile_failure') authorityRead.reject(new Error('authority read failed'))
      else mutation.reject({ response: { status: 409, data: { error_code: 'GENERATION_SOURCE_BUSY' } } })

      await expect(operation).rejects.toBeInstanceOf(model.StaleChapterSourceOperationError)
      expect(ui).toEqual(projectB)
    },
  )
})
