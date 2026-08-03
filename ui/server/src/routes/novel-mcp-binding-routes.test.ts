import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { realpathSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, rm, symlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, updateMcpKey } from '../mcp/key-store'
import { McpError, type McpErrorCode } from '../mcp/errors'
import { createMcpRuntime } from '../mcp/runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../mcp/server-store'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
import {
  createNovelProject,
  deleteNovelProject,
  getNovelProject,
  listNovelProjects,
  updateNovelProject,
} from '../novel'
import { ChapterSourceLeaseRegistry } from '../novel-writing-service/generation-source/chapter-source-lease'
import { registerNovelMcpBindingRoutes } from './novel-mcp-binding-routes'
import { registerNovelProjectControlRoutes } from './novel-project-control-routes'

const workspaces: string[] = []
const FAKE_KEY = 'fake-key'
const FAKE_HEADER = 'fake-header'
const FAKE_AUTH = 'fake-auth'
const FAKE_COOKIE = 'fake-cookie'
const ROTATED_KEY = 'rotated-key'
const ROTATED_HEADER = 'rotated-header'
const ROTATED_AUTH = 'rotated-auth'
const ROTATED_COOKIE = 'rotated-cookie'
const PREFIX_KEY_PAYLOAD = 'prefix-key-payload'
const PREFIX_AUTH_PAYLOAD = 'prefix-auth-payload'
const PREFIX_COOKIE_PAYLOAD = 'prefix-cookie-payload'
const CHAPTER_SOURCE_BASE = '/api/novel/projects/:id/chapter-generation-source'
const LEGACY_SOURCE_BASE = '/api/novel/projects/:id/prose-generation-source'
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'post', 'put']) {
    app[method] = (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`${method.toUpperCase()} ${path}`, handler)
      return app
    }
  }
  return { app, handlers }
}

function createMockResponse() {
  return Object.assign(new EventEmitter(), {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) {
      this.body = body
      this.finished = true
      this.writableEnded = true
      this.emit('finish')
      return this
    },
  })
}

async function call(handler: any, req: any = {}, providedRes?: any) {
  const request: any = req && typeof req.on === 'function' ? req : Object.assign(new EventEmitter(), req)
  request.params ??= {}
  request.query ??= {}
  request.body ??= {}
  if (!Object.prototype.hasOwnProperty.call(request, 'complete')) request.complete = true
  if (!Object.prototype.hasOwnProperty.call(request, 'readableEnded')) request.readableEnded = true
  const res: any = providedRes || createMockResponse()
  await handler(request, res)
  return res
}

function routeHandler(handlers: Map<string, any>, route: string) {
  const handler = handlers.get(route)
  expect(handler).toBeFunction()
  return handler
}

async function holdWorkspaceCoordinator(workspace: string) {
  let signalHeld!: () => void
  let release!: () => void
  const held = new Promise<void>(resolve => { signalHeld = resolve })
  const mayFinish = new Promise<void>(resolve => { release = resolve })
  const done = withMcpWorkspaceMutation(workspace, async () => {
    signalHeld()
    await mayFinish
  })
  await held
  return { release, done }
}

async function releaseAndDrainWorkspaceCoordinator(
  workspace: string,
  blocker: Awaited<ReturnType<typeof holdWorkspaceCoordinator>>,
) {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    blocker.release()
    await blocker.done
    await withMcpWorkspaceMutation(workspace, async () => {})
    await new Promise<void>(resolve => setImmediate(resolve))
    return unhandled
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
}

function interceptNextProjectUpdate(afterUpdate: () => void) {
  const originalQuery = Database.prototype.query
  let updateCount = 0
  ;(Database.prototype as any).query = function (sql: string, ...args: any[]) {
    const statement = originalQuery.call(this, sql, ...args)
    if (typeof sql !== 'string' || !sql.startsWith('UPDATE projects SET')) return statement
    return new Proxy(statement as any, {
      get(target, property) {
        if (property === 'run') {
          return (...runArgs: any[]) => {
            const result = target.run(...runArgs)
            updateCount += 1
            afterUpdate()
            return result
          }
        }
        const value = target[property]
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  }
  return {
    updateCount: () => updateCount,
    restore: () => { (Database.prototype as any).query = originalQuery },
  }
}

async function fixture(input: {
  keyValue?: string
  authorization?: string
  cookie?: string
  customHeaders?: Record<string, string>
  mcpValidationTimeoutMs?: number
  onGetProject?: () => void
} = {}) {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-binding-route-'))
  workspaces.push(workspace)
  await writeMcpServers(workspace, [{
    ...BUDA_MCP_SERVER_TEMPLATE,
    custom_headers: {
      'X-Fake': FAKE_HEADER,
      Authorization: input.authorization || `Basic ${FAKE_AUTH}`,
      Cookie: input.cookie || `sid=${FAKE_COOKIE}`,
      ...(input.customHeaders || {}),
    },
  }])
  const key = await createMcpKey(workspace, {
    mcp_server_id: 'buda', key: input.keyValue || FAKE_KEY, description: '账号',
  })
  const first = await createNovelProject(workspace, { title: '项目一', reference_config: {} })
  const second = await createNovelProject(workspace, { title: '项目二', reference_config: {} })
  const adapter = {
    listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }, { id: 'agent-2', name: '正文 Agent 2' }],
    createAgent: async () => ({ id: 'agent-new', name: 'MangaForge Agent' }),
  }
  const runtime = {
    listAgents: () => adapter.listAgents(),
    createAgent: () => adapter.createAgent(),
    isAgentLeaseActive: async () => false,
  }
  const chapterSourceLeases = new ChapterSourceLeaseRegistry()
  const { app, handlers } = createRouteHarness()
  registerNovelMcpBindingRoutes(app, {
    getWorkspace: () => workspace,
    getProject: async (activeWorkspace, id) => {
      input.onGetProject?.()
      return getNovelProject(activeWorkspace, id)
    },
    mcpRuntime: runtime as any,
    chapterSourceLeases,
    mcpValidationTimeoutMs: input.mcpValidationTimeoutMs,
  })
  return { workspace, key, first, second, handlers, runtime, adapter, chapterSourceLeases }
}

function maliciousAgent(credentials = {
  key: FAKE_KEY,
  header: FAKE_HEADER,
  authorization: FAKE_AUTH,
  cookie: FAKE_COOKIE,
}) {
  return {
    id: 'agent-1',
    name: `正文 Agent ${credentials.key}${'n'.repeat(5_000)}`,
    description: `Bearer ${credentials.key}; X-Fake=${credentials.header}${'d'.repeat(5_000)}`,
    status: `Authorization: Basic ${credentials.authorization}${'s'.repeat(500)}`,
    raw: {
      spaceId: `space-1 Cookie: sid=${credentials.cookie}${'p'.repeat(17_000)}`,
      nested: { reflected: credentials.header },
    },
    arbitrary: { reflected: credentials.key },
    authorization: `Bearer ${credentials.key}`,
    cookie: `sid=${credentials.cookie}`,
  }
}

function expectSafePublicAgentResponse(body: any, agent: any) {
  const serialized = JSON.stringify(body)
  for (const secret of [
    FAKE_KEY, FAKE_HEADER, FAKE_AUTH, FAKE_COOKIE,
    ROTATED_KEY, ROTATED_HEADER, ROTATED_AUTH, ROTATED_COOKIE,
  ]) {
    expect(serialized).not.toContain(secret)
  }
  for (const extraField of ['"raw"', '"nested"', '"arbitrary"', '"authorization"', '"cookie"']) {
    expect(serialized).not.toContain(extraField)
  }
  expect(Object.keys(agent).sort()).toEqual(['description', 'id', 'name', 'spaceId', 'status'])
  expect(agent.id).toBe('agent-1')
  expect(agent.name.length).toBeLessThanOrEqual(4_096)
  expect(agent.description.length).toBeLessThanOrEqual(4_096)
  expect(agent.status.length).toBeLessThanOrEqual(160)
  expect(agent.spaceId.length).toBeLessThanOrEqual(16_384)
}

function prefixStrippedAgent(
  spaceField: 'spaceId' | 'space_id' | 'raw.spaceId' | 'raw.space_id',
  id = `agent-${PREFIX_KEY_PAYLOAD}`,
) {
  const agent: any = {
    id,
    name: `ordinary-agent ${PREFIX_AUTH_PAYLOAD}`,
    description: `cookie ${PREFIX_COOKIE_PAYLOAD}`,
    status: `ready-${PREFIX_KEY_PAYLOAD}`,
  }
  if (spaceField.startsWith('raw.')) {
    agent.raw = { [spaceField.slice(4)]: `space-${PREFIX_COOKIE_PAYLOAD}` }
  } else {
    agent[spaceField] = `space-${PREFIX_COOKIE_PAYLOAD}`
  }
  return agent
}

async function rotatingCredentialFixture() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-binding-rotation-route-'))
  workspaces.push(workspace)
  const initialServer = {
    ...BUDA_MCP_SERVER_TEMPLATE,
    custom_headers: {
      'X-Fake': FAKE_HEADER,
      Authorization: `Basic ${FAKE_AUTH}`,
      Cookie: `sid=${FAKE_COOKIE}`,
    },
  }
  const rotatedServer = {
    ...BUDA_MCP_SERVER_TEMPLATE,
    custom_headers: {
      'X-Fake': ROTATED_HEADER,
      Authorization: `Basic ${ROTATED_AUTH}`,
      Cookie: `sid=${ROTATED_COOKIE}`,
    },
  }
  await writeMcpServers(workspace, [initialServer])
  const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: FAKE_KEY, description: '账号' })
  const project = await createNovelProject(workspace, { title: '轮换项目', reference_config: {} })
  const usedCredentials: Array<{ server: any; key: any }> = []
  const client = { listTools: async () => [], callTool: async () => ({ content: [] }) }
  const baseRuntime = createMcpRuntime(() => workspace, {
    manager: {
      get: async (_workspace: string, server: any, selectedKey: any) => {
        usedCredentials.push({ server, key: selectedKey })
        return client
      },
      invalidate: async () => {},
      invalidateIfCurrent: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    } as any,
    adapterFactory: () => ({
      listAgents: async () => {
        const used = usedCredentials.at(-1)!
        return [maliciousAgent({
          key: used.key.key,
          header: used.server.custom_headers['X-Fake'],
          authorization: String(used.server.custom_headers.Authorization).replace(/^Basic\s+/, ''),
          cookie: String(used.server.custom_headers.Cookie).replace(/^sid=/, ''),
        })]
      },
      createAgent: async () => {
        const used = usedCredentials.at(-1)!
        return maliciousAgent({
          key: used.key.key,
          header: used.server.custom_headers['X-Fake'],
          authorization: String(used.server.custom_headers.Authorization).replace(/^Basic\s+/, ''),
          cookie: String(used.server.custom_headers.Cookie).replace(/^sid=/, ''),
        })
      },
    }) as any,
  })
  let rotated = false
  const rotateBeforeRemoteCall = async () => {
    if (rotated) return
    rotated = true
    await writeMcpServers(workspace, [rotatedServer])
    await updateMcpKey(workspace, key.id, { key: ROTATED_KEY })
  }
  const runtime = {
    ...baseRuntime,
    async listAgents(keyId: number, options?: any, pinnedCredential?: any) {
      await rotateBeforeRemoteCall()
      return baseRuntime.listAgents(keyId, options, pinnedCredential)
    },
    async createAgent(keyId: number, input: any, signal?: AbortSignal, pinnedCredential?: any) {
      await rotateBeforeRemoteCall()
      return baseRuntime.createAgent(keyId, input, signal, pinnedCredential)
    },
  }
  const chapterSourceLeases = new ChapterSourceLeaseRegistry()
  const { app, handlers } = createRouteHarness()
  registerNovelMcpBindingRoutes(app, {
    getWorkspace: () => workspace,
    getProject: getNovelProject,
    mcpRuntime: runtime as any,
    chapterSourceLeases,
  })
  return { key, project, handlers, usedCredentials }
}

function binding(keyId: number, agentId = 'agent-1') {
  return {
    server_id: 'buda',
    key_id: keyId,
    adapter_id: 'buda',
    agent_id: agentId,
    model: '',
  }
}

async function expectViewReadBack(handlers: Map<string, any>, projectId: number, response: any) {
  expect(response.statusCode).toBe(200)
  const readBack = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
    params: { id: String(projectId) },
  })
  expect(readBack.statusCode).toBe(200)
  expect(readBack.body).toEqual(response.body)
  return readBack.body
}

describe('explicit chapter generation source routes', () => {
  test('stores retained model and MCP configurations while activation only changes active', async () => {
    const { workspace, key, first, handlers } = await fixture()

    const modelSaved = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    const modelView = await expectViewReadBack(handlers, first.id, modelSaved)
    expect(modelView).toEqual({
      ok: true,
      source: {
        version: 'chapter_generation_source_v1',
        active: 'model',
        model: { model_id: 217 },
      },
      fingerprint: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      locked: false,
      display: { active: 'model', model_id: 217, mcp: null },
    })

    const mcp = binding(key.id)
    const bindingSaved = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp },
    })
    const bindingView = await expectViewReadBack(handlers, first.id, bindingSaved)
    expect(bindingView.source).toEqual({
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: 217 },
      mcp,
    })
    expect(bindingView.display).toEqual({ active: 'model', model_id: 217, mcp })

    const activated = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'mcp' },
    })
    const activatedView = await expectViewReadBack(handlers, first.id, activated)
    expect(activatedView.source).toEqual({ ...bindingView.source, active: 'mcp' })
    expect(activatedView.display).toEqual({ active: 'mcp', model_id: 217, mcp })
    expect((await getNovelProject(workspace, first.id))?.reference_config).toMatchObject({
      chapter_generation_source: activatedView.source,
    })
  })

  test('requires a raw positive safe model id and makes same-target activation idempotent', async () => {
    const { first, handlers } = await fixture()
    const activateWithoutModel = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'model' },
    })
    expect(activateWithoutModel).toMatchObject({
      statusCode: 422,
      body: { error_code: 'CHAPTER_MODEL_REQUIRED' },
    })

    for (const model_id of [undefined, '217', 1.5, 0, Number.MAX_SAFE_INTEGER + 1]) {
      const response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
        params: { id: String(first.id) }, body: { model_id },
      })
      expect(response).toMatchObject({
        statusCode: 422,
        body: { error_code: 'CHAPTER_MODEL_REQUIRED' },
      })
    }

    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    const firstActivation = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'model' },
    })
    const secondActivation = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'model' },
    })
    expect(secondActivation.body).toEqual(firstActivation.body)
    await expectViewReadBack(handlers, first.id, secondActivation)
  })

  test('live MCP test never saves and MCP save never implicitly activates', async () => {
    const { workspace, key, first, handlers } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    const before = structuredClone((await getNovelProject(workspace, first.id))?.reference_config)
    const mcp = binding(key.id)

    const tested = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/mcp/test`), {
      params: { id: String(first.id) }, body: { mcp },
    })
    expect(tested.statusCode).toBe(200)
    expect(tested.body).toEqual({
      ok: true,
      validation: {
        server_id: 'buda',
        key_id: key.id,
        agent: { id: 'agent-1', name: '正文 Agent' },
      },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config).toEqual(before)

    const saved = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp },
    })
    expect(saved.body.source).toMatchObject({ active: 'model', model: { model_id: 217 }, mcp })
    await expectViewReadBack(handlers, first.id, saved)
  })

  test('failed MCP save and activation validation leave source storage byte-identical', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    const before = JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)
    runtime.listAgents = async () => []

    const failedSave = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id, 'agent-2') },
    })
    expect(failedSave.statusCode).toBe(400)
    expect(JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)).toBe(before)

    const failedActivation = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'mcp' },
    })
    expect(failedActivation.statusCode).toBe(400)
    expect(JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)).toBe(before)
  })

  test('rejects every source mutation during a project lease and reports the lock on GET', async () => {
    const { workspace, key, first, handlers, chapterSourceLeases } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    const before = JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)
    const lease = await chapterSourceLeases.acquire(workspace, first.id, 'task-running')
    try {
      const locked = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
        params: { id: String(first.id) },
      })
      expect(locked.body.locked).toBe(true)
      for (const [route, body] of [
        [`POST ${CHAPTER_SOURCE_BASE}/activate`, { active: 'mcp' }],
        [`PUT ${CHAPTER_SOURCE_BASE}/model`, { model_id: 218 }],
        [`PUT ${CHAPTER_SOURCE_BASE}/mcp`, { mcp: binding(key.id, 'agent-2') }],
        [`PUT ${LEGACY_SOURCE_BASE}`, { source: { version: 'prose_generation_source_v1', type: 'model' } }],
      ] as const) {
        const response = await call(routeHandler(handlers, route), {
          params: { id: String(first.id) }, body,
        })
        expect(response).toMatchObject({
          statusCode: 409,
          body: { error_code: 'GENERATION_SOURCE_BUSY' },
        })
      }
      expect(JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)).toBe(before)
    } finally {
      await lease.release()
    }
    const unlocked = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: String(first.id) },
    })
    expect(unlocked.body.locked).toBe(false)
  })

  test('serializes concurrent model, binding, and activation writes with per-commit views', async () => {
    const { workspace, key, first, handlers } = await fixture()
    let releaseCoordinator!: () => void
    let coordinatorHeld!: () => void
    const held = new Promise<void>(resolve => { coordinatorHeld = resolve })
    const gate = new Promise<void>(resolve => { releaseCoordinator = resolve })
    const blocker = withMcpWorkspaceMutation(workspace, async () => {
      coordinatorHeld()
      await gate
    })
    await held

    const requests = [
      call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
        params: { id: String(first.id) }, body: { model_id: 217 },
      }),
      call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
        params: { id: String(first.id) }, body: { mcp: binding(key.id) },
      }),
      call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
        params: { id: String(first.id) }, body: { active: 'mcp' },
      }),
    ]
    releaseCoordinator()
    await blocker
    const [modelSaved, bindingSaved, activated] = await Promise.all(requests)

    expect(modelSaved.body.source).toEqual({
      version: 'chapter_generation_source_v1', active: 'model', model: { model_id: 217 },
    })
    expect(bindingSaved.body.source).toEqual({
      ...modelSaved.body.source, mcp: binding(key.id),
    })
    expect(activated.body.source).toEqual({
      ...bindingSaved.body.source, active: 'mcp',
    })
    await expectViewReadBack(handlers, first.id, activated)
  })

  test('releases the workspace coordinator while remote MCP validation is pending', async () => {
    const { workspace, key, first, second, handlers, runtime, chapterSourceLeases } = await fixture()
    let validationEntered!: () => void
    let releaseValidation!: () => void
    const entered = new Promise<void>(resolve => { validationEntered = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    runtime.listAgents = async () => {
      validationEntered()
      await mayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) },
      body: { mcp: binding(key.id) },
    })
    await entered

    let lease: Awaited<ReturnType<ChapterSourceLeaseRegistry['acquire']>> | undefined
    let leaseAcquired = false
    const acquiringLease = chapterSourceLeases.acquire(workspace, second.id, 'other-project-task')
      .then(value => {
        lease = value
        leaseAcquired = true
      })
    await new Promise(resolve => setTimeout(resolve, 25))
    const acquiredWhileRemoteWasPending = leaseAcquired
    releaseValidation()
    await Promise.all([saving, acquiringLease])
    expect(acquiredWhileRemoteWasPending).toBe(true)
    await lease?.release()
  })

  for (const scenario of [
    {
      name: 'request aborted',
      expectedStatus: 499,
      request: () => Object.assign(new EventEmitter(), {
        params: {}, body: {}, query: {}, complete: false, readableEnded: false, aborted: false,
      }),
      trigger: (req: any) => { req.aborted = true; req.emit('aborted') },
    },
    {
      name: 'abnormal request close',
      expectedStatus: 499,
      request: () => Object.assign(new EventEmitter(), {
        params: {}, body: {}, query: {}, complete: false, readableEnded: false, aborted: false,
      }),
      trigger: (req: any) => req.emit('close'),
    },
    {
      name: 'existing request signal',
      expectedStatus: 499,
      request: () => {
        const controller = new AbortController()
        return Object.assign(new EventEmitter(), {
          params: {}, body: {}, query: {}, complete: true, readableEnded: true,
          signal: controller.signal,
          abortUpstream: () => controller.abort(),
        })
      },
      trigger: (req: any) => req.abortUpstream(),
    },
    {
      name: 'response close',
      expectedStatus: 499,
      request: () => Object.assign(new EventEmitter(), {
        params: {}, body: {}, query: {}, complete: true, readableEnded: true,
      }),
      trigger: (_req: any, res: any) => res.emit('close'),
    },
    {
      name: 'normal completed request close',
      expectedStatus: 200,
      request: () => Object.assign(new EventEmitter(), {
        params: {}, body: {}, query: {}, complete: true, readableEnded: true,
      }),
      trigger: (req: any) => req.emit('close'),
    },
  ]) {
    test(`handles ${scenario.name} during remote validation without a stale commit`, async () => {
      const { workspace, key, first, handlers, runtime } = await fixture()
      let validationEntered!: () => void
      let releaseValidation!: () => void
      const entered = new Promise<void>(resolve => { validationEntered = resolve })
      const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
      let remoteSignal: AbortSignal | undefined
      runtime.listAgents = async (_keyId: number, options: any) => {
        remoteSignal = options?.signal
        validationEntered()
        await mayFinish
        return [{ id: 'agent-1', name: '正文 Agent' }]
      }
      const req: any = scenario.request()
      req.params = { id: String(first.id) }
      req.body = { mcp: binding(key.id) }
      const res = createMockResponse()
      const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), req, res)
      await entered

      scenario.trigger(req, res)
      const shouldCancel = scenario.expectedStatus === 499
      expect(remoteSignal).toBeInstanceOf(AbortSignal)
      expect(remoteSignal?.aborted).toBe(shouldCancel)
      releaseValidation()
      const response = await saving

      expect(response.statusCode).toBe(scenario.expectedStatus)
      const stored = await getNovelProject(workspace, first.id)
      if (shouldCancel) {
        expect(stored?.reference_config?.chapter_generation_source).toBeUndefined()
      } else {
        expect(stored?.reference_config?.chapter_generation_source?.mcp).toEqual(binding(key.id))
      }
    })
  }

  test('times out remote validation with a bounded signal and never commits afterward', async () => {
    const { workspace, key, first, second, handlers, runtime, chapterSourceLeases } = await fixture({
      mcpValidationTimeoutMs: 100,
    })
    let validationEntered!: () => void
    let releaseValidation!: () => void
    const entered = new Promise<void>(resolve => { validationEntered = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    let remoteOptions: any
    runtime.listAgents = async (_keyId: number, options: any) => {
      remoteOptions = options
      validationEntered()
      await mayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    const enteredBeforeDeadline = await Promise.race([
      entered.then(() => true),
      new Promise<false>(resolve => setTimeout(() => resolve(false), 200)),
    ])
    if (!enteredBeforeDeadline) {
      releaseValidation()
      await saving
    }
    expect(enteredBeforeDeadline).toBe(true)
    const responseBeforeRelease = await Promise.race([
      saving,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 250)),
    ])
    releaseValidation()
    const response = responseBeforeRelease || await saving

    expect(remoteOptions?.timeoutMs).toBeGreaterThan(0)
    expect(remoteOptions?.timeoutMs).toBeLessThanOrEqual(100)
    expect(remoteOptions?.signal).toBeInstanceOf(AbortSignal)
    expect(remoteOptions?.signal.aborted).toBe(true)
    expect(response).toMatchObject({ statusCode: 504, body: { error_code: 'MCP_CONNECT_TIMEOUT' } })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source).toBeUndefined()
    const lease = await chapterSourceLeases.acquire(workspace, second.id, 'after-timeout')
    await lease.release()
  })

  test('aborts immediately while phase one is waiting for the workspace coordinator', async () => {
    let getProjectCalls = 0
    const { workspace, first, handlers } = await fixture({
      onGetProject: () => { getProjectCalls += 1 },
    })
    const blocker = await holdWorkspaceCoordinator(workspace)
    const controller = new AbortController()
    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) },
      body: { model_id: 217 },
      signal: controller.signal,
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort()

    const responseBeforeRelease = await Promise.race([
      saving,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 50)),
    ])
    const response = responseBeforeRelease || await saving
    const getProjectCallsBeforeDrain = getProjectCalls
    const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker)
    expect(responseBeforeRelease).not.toBeNull()
    expect(response).toMatchObject({
      statusCode: 499,
      body: { error_code: 'MCP_CANCELLED' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
    expect(getProjectCallsBeforeDrain).toBe(0)
    expect(getProjectCalls).toBe(getProjectCallsBeforeDrain)
    expect(unhandled).toEqual([])
    const retry = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 218 },
    })
    expect(retry.statusCode).toBe(200)
  })

  test('times out immediately while phase one is waiting for the workspace coordinator', async () => {
    let getProjectCalls = 0
    const { workspace, first, handlers } = await fixture({
      mcpValidationTimeoutMs: 100,
      onGetProject: () => { getProjectCalls += 1 },
    })
    const blocker = await holdWorkspaceCoordinator(workspace)
    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })

    const responseBeforeRelease = await Promise.race([
      saving,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 200)),
    ])
    const response = responseBeforeRelease || await saving
    const getProjectCallsBeforeDrain = getProjectCalls
    const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker)
    expect(responseBeforeRelease).not.toBeNull()
    expect(response).toMatchObject({
      statusCode: 504,
      body: { error_code: 'MCP_CONNECT_TIMEOUT' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
    expect(getProjectCallsBeforeDrain).toBe(0)
    expect(getProjectCalls).toBe(getProjectCallsBeforeDrain)
    expect(unhandled).toEqual([])
    const retry = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 218 },
    })
    expect(retry.statusCode).toBe(200)
  })

  test('starts the absolute deadline before initial workspace identity resolution', async () => {
    const observed: Array<Record<string, unknown>> = []
    for (const scenario of [
      { route: `PUT ${CHAPTER_SOURCE_BASE}/model`, body: { model_id: 217 } },
      { route: `POST ${CHAPTER_SOURCE_BASE}/mcp/test`, body: null },
    ]) {
      let getProjectCalls = 0
      const { workspace, key, first, handlers } = await fixture({
        mcpValidationTimeoutMs: 1_000,
        onGetProject: () => { getProjectCalls += 1 },
      })
      const blocker = await holdWorkspaceCoordinator(workspace)
      const originalNow = Date.now
      const originalRealpathNative = realpathSync.native
      let fakeNow = 100_000
      let canonicalCalls = 0
      let saving: ReturnType<typeof call> | undefined
      let responseBeforeNextTurn: Awaited<ReturnType<typeof call>> | null = null
      try {
        Date.now = () => fakeNow
        ;(realpathSync as any).native = (...args: any[]) => {
          const physical = originalRealpathNative(...args)
          canonicalCalls += 1
          if (canonicalCalls === 1) fakeNow += 1_001
          return physical
        }
        saving = call(routeHandler(handlers, scenario.route), {
          params: { id: String(first.id) },
          body: scenario.body || { mcp: binding(key.id) },
        })
        responseBeforeNextTurn = await Promise.race([
          saving,
          new Promise<null>(resolve => setImmediate(() => resolve(null))),
        ])
      } finally {
        Date.now = originalNow
        ;(realpathSync as any).native = originalRealpathNative
      }

      const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker)
      const response = responseBeforeNextTurn || await saving!
      observed.push({
        route: scenario.route,
        canonicalized: canonicalCalls >= 1,
        completedBeforeNextTurn: responseBeforeNextTurn !== null,
        statusCode: response.statusCode,
        errorCode: response.body?.error_code,
        getProjectCalls,
        unhandledCount: unhandled.length,
        wroteSource: Boolean(
          (await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source,
        ),
      })
    }
    expect(observed).toEqual([
      {
        route: `PUT ${CHAPTER_SOURCE_BASE}/model`,
        canonicalized: true,
        completedBeforeNextTurn: true,
        statusCode: 504,
        errorCode: 'MCP_CONNECT_TIMEOUT',
        getProjectCalls: 0,
        unhandledCount: 0,
        wroteSource: false,
      },
      {
        route: `POST ${CHAPTER_SOURCE_BASE}/mcp/test`,
        canonicalized: true,
        completedBeforeNextTurn: true,
        statusCode: 504,
        errorCode: 'MCP_CONNECT_TIMEOUT',
        getProjectCalls: 0,
        unhandledCount: 0,
        wroteSource: false,
      },
    ])
  })

  test('does not add synchronous workspace identity time back to the absolute deadline', async () => {
    let getProjectCalls = 0
    const { workspace, first, handlers } = await fixture({
      mcpValidationTimeoutMs: 1_000,
      onGetProject: () => { getProjectCalls += 1 },
    })
    const blocker = await holdWorkspaceCoordinator(workspace)
    const originalNow = Date.now
    const originalRealpathNative = realpathSync.native
    let fakeNow = 100_000
    let canonicalCalls = 0
    let saving: ReturnType<typeof call> | undefined
    let responseBeforeNextTurn: Awaited<ReturnType<typeof call>> | null = null
    try {
      Date.now = () => fakeNow
      ;(realpathSync as any).native = (...args: any[]) => {
        const physical = originalRealpathNative(...args)
        canonicalCalls += 1
        if (canonicalCalls === 2) fakeNow += 1_001
        return physical
      }
      saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
        params: { id: String(first.id) }, body: { model_id: 217 },
      })
      responseBeforeNextTurn = await Promise.race([
        saving,
        new Promise<null>(resolve => setImmediate(() => resolve(null))),
      ])
    } finally {
      Date.now = originalNow
      ;(realpathSync as any).native = originalRealpathNative
    }

    const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker)
    const response = responseBeforeNextTurn || await saving!
    expect(canonicalCalls).toBeGreaterThanOrEqual(2)
    expect(responseBeforeNextTurn).not.toBeNull()
    expect(response).toMatchObject({
      statusCode: 504,
      body: { error_code: 'MCP_CONNECT_TIMEOUT' },
    })
    expect(getProjectCalls).toBe(0)
    expect(unhandled).toEqual([])
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
  })

  test('rolls back when the absolute deadline expires after UPDATE and before COMMIT', async () => {
    const { workspace, first, handlers } = await fixture({ mcpValidationTimeoutMs: 1_000 })
    const before = await getNovelProject(workspace, first.id)
    const beforeReferenceConfig = JSON.stringify(before?.reference_config)
    const originalNow = Date.now
    let fakeNow = 100_000
    const intercepted = interceptNextProjectUpdate(() => { fakeNow += 1_001 })
    let response: any
    try {
      Date.now = () => fakeNow
      response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
        params: { id: String(first.id) }, body: { model_id: 217 },
      })
    } finally {
      Date.now = originalNow
      intercepted.restore()
    }

    const after = await getNovelProject(workspace, first.id)
    expect(intercepted.updateCount()).toBe(1)
    expect(response).toMatchObject({
      statusCode: 504,
      body: { error_code: 'MCP_CONNECT_TIMEOUT' },
    })
    expect(JSON.stringify(after?.reference_config)).toBe(beforeReferenceConfig)
    expect(after?.updated_at).toBe(before?.updated_at)
  })

  test('rolls back when the request aborts after UPDATE and before COMMIT', async () => {
    const { workspace, first, handlers } = await fixture()
    const before = await getNovelProject(workspace, first.id)
    const beforeReferenceConfig = JSON.stringify(before?.reference_config)
    const controller = new AbortController()
    const intercepted = interceptNextProjectUpdate(() => { controller.abort() })
    let response: any
    try {
      response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
        params: { id: String(first.id) },
        body: { model_id: 217 },
        signal: controller.signal,
      })
    } finally {
      intercepted.restore()
    }

    const after = await getNovelProject(workspace, first.id)
    expect(intercepted.updateCount()).toBe(1)
    expect(response).toMatchObject({
      statusCode: 499,
      body: { error_code: 'MCP_CANCELLED' },
    })
    expect(JSON.stringify(after?.reference_config)).toBe(beforeReferenceConfig)
    expect(after?.updated_at).toBe(before?.updated_at)
  })

  test('aborts immediately while phase two is waiting for the workspace coordinator', async () => {
    let getProjectCalls = 0
    let remoteCalls = 0
    const { workspace, key, first, handlers, runtime } = await fixture({
      onGetProject: () => { getProjectCalls += 1 },
    })
    let phaseTwoBlocked!: () => void
    const blocked = new Promise<void>(resolve => { phaseTwoBlocked = resolve })
    let blocker: Awaited<ReturnType<typeof holdWorkspaceCoordinator>> | undefined
    runtime.listAgents = async () => {
      remoteCalls += 1
      blocker = await holdWorkspaceCoordinator(workspace)
      phaseTwoBlocked()
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }
    const controller = new AbortController()
    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) },
      body: { mcp: binding(key.id) },
      signal: controller.signal,
    })
    await blocked
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort()

    const responseBeforeRelease = await Promise.race([
      saving,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 50)),
    ])
    const response = responseBeforeRelease || await saving
    const getProjectCallsBeforeDrain = getProjectCalls
    const remoteCallsBeforeDrain = remoteCalls
    const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker!)
    expect(responseBeforeRelease).not.toBeNull()
    expect(response).toMatchObject({
      statusCode: 499,
      body: { error_code: 'MCP_CANCELLED' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
    expect(getProjectCallsBeforeDrain).toBe(1)
    expect(getProjectCalls).toBe(getProjectCallsBeforeDrain)
    expect(remoteCallsBeforeDrain).toBe(1)
    expect(remoteCalls).toBe(remoteCallsBeforeDrain)
    expect(unhandled).toEqual([])
    const retry = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 218 },
    })
    expect(retry.statusCode).toBe(200)
  })

  test('times out immediately while phase two is waiting for the workspace coordinator', async () => {
    let getProjectCalls = 0
    let remoteCalls = 0
    const { workspace, key, first, handlers, runtime } = await fixture({
      mcpValidationTimeoutMs: 100,
      onGetProject: () => { getProjectCalls += 1 },
    })
    let phaseTwoBlocked!: () => void
    const blocked = new Promise<void>(resolve => { phaseTwoBlocked = resolve })
    let blocker: Awaited<ReturnType<typeof holdWorkspaceCoordinator>> | undefined
    runtime.listAgents = async () => {
      remoteCalls += 1
      blocker = await holdWorkspaceCoordinator(workspace)
      phaseTwoBlocked()
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }
    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    await blocked

    const responseBeforeRelease = await Promise.race([
      saving,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 200)),
    ])
    const response = responseBeforeRelease || await saving
    const getProjectCallsBeforeDrain = getProjectCalls
    const remoteCallsBeforeDrain = remoteCalls
    const unhandled = await releaseAndDrainWorkspaceCoordinator(workspace, blocker!)
    expect(responseBeforeRelease).not.toBeNull()
    expect(response).toMatchObject({
      statusCode: 504,
      body: { error_code: 'MCP_CONNECT_TIMEOUT' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
    expect(getProjectCallsBeforeDrain).toBe(1)
    expect(getProjectCalls).toBe(getProjectCallsBeforeDrain)
    expect(remoteCallsBeforeDrain).toBe(1)
    expect(remoteCalls).toBe(remoteCallsBeforeDrain)
    expect(unhandled).toEqual([])
    const retry = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 218 },
    })
    expect(retry.statusCode).toBe(200)
  })

  test('linearizes same-project source writes while remote validation is pending', async () => {
    const { key, first, handlers, runtime } = await fixture()
    let validationEntered!: () => void
    let releaseValidation!: () => void
    const entered = new Promise<void>(resolve => { validationEntered = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    runtime.listAgents = async () => {
      validationEntered()
      await mayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const mcpSaving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    await entered
    let modelSettled = false
    const modelSaving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    }).then(response => {
      modelSettled = true
      return response
    })
    await new Promise(resolve => setTimeout(resolve, 25))
    const modelSettledDuringRemote = modelSettled
    releaseValidation()
    const [mcpSaved, modelSaved] = await Promise.all([mcpSaving, modelSaving])

    expect(modelSettledDuringRemote).toBe(false)
    expect(mcpSaved.statusCode).toBe(200)
    expect(modelSaved.statusCode).toBe(200)
    expect(modelSaved.body.source).toMatchObject({
      model: { model_id: 217 },
      mcp: binding(key.id),
    })
  })

  test('keeps later same-project writes queued when an intermediate waiter is cancelled', async () => {
    const { key, first, handlers, runtime } = await fixture()
    let validationEntered!: () => void
    let releaseValidation!: () => void
    const entered = new Promise<void>(resolve => { validationEntered = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    runtime.listAgents = async () => {
      validationEntered()
      await mayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }
    const mcpSaving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    await entered

    const queuedController = new AbortController()
    const cancelledWaiter = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) },
      body: { model_id: 217 },
      signal: queuedController.signal,
    })
    queuedController.abort()
    expect((await cancelledWaiter).statusCode).toBe(499)

    let laterSettled = false
    const laterWrite = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 218 },
    }).then(response => {
      laterSettled = true
      return response
    })
    await new Promise(resolve => setTimeout(resolve, 25))
    const settledBeforeFirstOperationFinished = laterSettled
    releaseValidation()
    const [mcpSaved, modelSaved] = await Promise.all([mcpSaving, laterWrite])

    expect(settledBeforeFirstOperationFinished).toBe(false)
    expect(mcpSaved.statusCode).toBe(200)
    expect(modelSaved.statusCode).toBe(200)
    expect(modelSaved.body.source).toMatchObject({
      model: { model_id: 218 },
      mcp: binding(key.id),
    })
  })

  test('returns a source conflict after bounded retries cannot reach a stable commit point', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    let remoteCalls = 0
    runtime.listAgents = async () => {
      remoteCalls += 1
      const project = await getNovelProject(workspace, first.id)
      if (!project) throw new Error('project missing during retry test')
      await updateNovelProject(workspace, first.id, {
        reference_config: {
          ...project.reference_config,
          chapter_generation_source: {
            version: 'chapter_generation_source_v1',
            active: 'model',
            model: { model_id: 300 + remoteCalls },
          },
        },
      })
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })

    expect(remoteCalls).toBe(3)
    expect(response).toMatchObject({
      statusCode: 409,
      body: { error_code: 'GENERATION_SOURCE_CHANGED' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source?.mcp)
      .toBeUndefined()
  })

  test('retries when only retained inactive source configuration changes during remote validation', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })

    let remoteCalls = 0
    runtime.listAgents = async () => {
      remoteCalls += 1
      if (remoteCalls === 1) {
        const project = await getNovelProject(workspace, first.id)
        if (!project) throw new Error('project missing during retained-source retry test')
        const current = project.reference_config?.chapter_generation_source
        await updateNovelProject(workspace, first.id, {
          reference_config: {
            ...project.reference_config,
            chapter_generation_source: {
              ...current,
              mcp: binding(key.id, 'agent-2'),
            },
          },
        })
      }
      return [
        { id: 'agent-1', name: '正文 Agent' },
        { id: 'agent-2', name: '正文 Agent 2' },
      ]
    }

    const response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })

    expect(remoteCalls).toBe(2)
    expect(response.statusCode).toBe(200)
    expect(response.body.source).toMatchObject({
      active: 'model',
      model: { model_id: 217 },
      mcp: binding(key.id),
    })
  })

  test('fails closed when the pinned credential changes during remote validation', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    runtime.listAgents = async () => {
      await updateMcpKey(workspace, key.id, { key: ROTATED_KEY })
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const response = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })

    expect(response).toMatchObject({
      statusCode: 409,
      body: { error_code: 'GENERATION_SOURCE_CHANGED' },
    })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
  })

  test('rechecks tuple ownership after remote validation so the first remote arrival cannot overwrite a winner', async () => {
    const { key, first, second, handlers, runtime } = await fixture()
    let firstValidationEntered!: () => void
    let releaseFirstValidation!: () => void
    const entered = new Promise<void>(resolve => { firstValidationEntered = resolve })
    const firstMayFinish = new Promise<void>(resolve => { releaseFirstValidation = resolve })
    let remoteCalls = 0
    runtime.listAgents = async () => {
      remoteCalls += 1
      if (remoteCalls === 1) {
        firstValidationEntered()
        await firstMayFinish
      }
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }
    const route = routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`)
    const firstSaving = call(route, {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    await entered
    const secondSaving = call(route, {
      params: { id: String(second.id) }, body: { mcp: binding(key.id) },
    })
    const secondResponse = await secondSaving
    releaseFirstValidation()
    const firstResponse = await firstSaving

    expect(secondResponse.statusCode).toBe(200)
    expect(firstResponse).toMatchObject({
      statusCode: 409,
      body: { error_code: 'MCP_BINDING_INVALID' },
    })
  })

  test('fails a queued write if its workspace symlink is retargeted before the coordinator callback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mangaforge-source-workspace-drift-'))
    workspaces.push(root)
    const workspaceA = join(root, 'workspace-a')
    const workspaceB = join(root, 'workspace-b')
    const activeAlias = join(root, 'active-workspace')
    await Promise.all([mkdir(workspaceA), mkdir(workspaceB)])
    await symlink(workspaceA, activeAlias, 'dir')
    const projectA = await createNovelProject(workspaceA, { title: '工作区 A', reference_config: {} })
    const projectB = await createNovelProject(workspaceB, { title: '工作区 B', reference_config: {} })
    expect(projectB.id).toBe(projectA.id)

    const { app, handlers } = createRouteHarness()
    registerNovelMcpBindingRoutes(app, {
      getWorkspace: () => activeAlias,
      getProject: getNovelProject,
      chapterSourceLeases: new ChapterSourceLeaseRegistry(),
    })
    let coordinatorHeld!: () => void
    let releaseCoordinator!: () => void
    const held = new Promise<void>(resolve => { coordinatorHeld = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseCoordinator = resolve })
    const blocker = withMcpWorkspaceMutation(activeAlias, async () => {
      coordinatorHeld()
      await mayFinish
    })
    await held

    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(projectA.id) }, body: { model_id: 217 },
    })
    await Promise.resolve()
    await rm(activeAlias)
    await symlink(workspaceB, activeAlias, 'dir')
    releaseCoordinator()
    await blocker

    const response = await saving
    expect(response).toMatchObject({
      statusCode: 409,
      body: { error_code: 'GENERATION_SOURCE_CHANGED' },
    })
    expect((await getNovelProject(workspaceB, projectB.id))?.reference_config?.chapter_generation_source)
      .toBeUndefined()
  })

  test('requires explicit source fields to be own data properties without invoking getters or Proxy traps', async () => {
    const { workspace, key, first, handlers } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    const before = JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)
    const fields = [
      { field: 'active', route: `POST ${CHAPTER_SOURCE_BASE}/activate`, value: 'model' },
      { field: 'model_id', route: `PUT ${CHAPTER_SOURCE_BASE}/model`, value: 218 },
      { field: 'mcp', route: `PUT ${CHAPTER_SOURCE_BASE}/mcp`, value: binding(key.id) },
    ]

    for (const { field, route, value } of fields) {
      let accessorReads = 0
      const accessorBody = {}
      Object.defineProperty(accessorBody, field, {
        get() { accessorReads += 1; return value },
      })
      const inheritedBody = Object.create({ [field]: value })
      let proxyReads = 0
      const proxyBody = new Proxy({}, {
        get() { proxyReads += 1; return value },
      })
      for (const body of [accessorBody, inheritedBody, proxyBody]) {
        const response = await call(routeHandler(handlers, route), {
          params: { id: String(first.id) }, body,
        })
        expect(response).toMatchObject({
          statusCode: 400,
          body: { error_code: 'MCP_BINDING_INVALID' },
        })
      }
      expect(accessorReads).toBe(0)
      expect(proxyReads).toBe(0)
    }
    expect(JSON.stringify((await getNovelProject(workspace, first.id))?.reference_config)).toBe(before)
  })

  test('rejects revoked Proxy bodies and MCP values as controlled binding errors', async () => {
    const { key, first, handlers } = await fixture()
    const revokedBody = Proxy.revocable({}, {})
    revokedBody.revoke()
    const revokedMcp = Proxy.revocable(binding(key.id), {})
    revokedMcp.revoke()

    const bodyResponse = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: revokedBody.proxy,
    })
    const mcpResponse = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: revokedMcp.proxy },
    })

    expect(bodyResponse).toMatchObject({
      statusCode: 400,
      body: { error_code: 'MCP_BINDING_INVALID' },
    })
    expect(mcpResponse).toMatchObject({
      statusCode: 400,
      body: { error_code: 'MCP_BINDING_INVALID' },
    })
  })

  test('maps every MCP error code to a stable status without reflecting remote secrets', async () => {
    const { key, first, handlers, runtime } = await fixture()
    const expectedStatuses = {
      MCP_BINDING_INVALID: 400,
      MCP_BINDING_CHANGED: 409,
      MCP_REFERENCED_RECORD_CONFLICT: 409,
      MCP_AUTH_FAILED: 401,
      MCP_CONNECT_TIMEOUT: 504,
      MCP_CONNECTION_LOST: 503,
      MCP_CAPABILITY_MISSING: 422,
      MCP_TOOL_ERROR: 502,
      MCP_DRIVE_SYNC_FAILED: 502,
      MCP_INPUT_TOO_LARGE: 413,
      MCP_AGENT_BUSY: 409,
      MCP_AGENT_QUARANTINED: 409,
      MCP_QUARANTINE_ACK_REQUIRED: 400,
      MCP_SEND_UNKNOWN: 502,
      MCP_SESSION_FAILED: 502,
      MCP_INPUT_REQUIRED: 422,
      MCP_GENERATION_TIMEOUT: 504,
      MCP_CANCELLED: 499,
      MCP_EMPTY_PROSE: 502,
      MCP_STORE_CORRUPT: 500,
      MCP_STORE_IO_FAILED: 500,
      MCP_RUNTIME_ERROR: 503,
    } satisfies Record<McpErrorCode, number>
    const actualStatuses = {} as Record<McpErrorCode, number>
    for (const code of Object.keys(expectedStatuses) as McpErrorCode[]) {
      runtime.listAgents = async () => {
        throw new McpError(code, `remote reflected ${FAKE_KEY} ${FAKE_HEADER}`)
      }
      const response = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/mcp/test`), {
        params: { id: String(first.id) }, body: { mcp: binding(key.id) },
      })
      actualStatuses[code] = response.statusCode
      expect(response.body).toMatchObject({ error_code: code })
      expect(JSON.stringify(response.body)).not.toContain(FAKE_KEY)
      expect(JSON.stringify(response.body)).not.toContain(FAKE_HEADER)
    }
    expect(actualStatuses).toEqual(expectedStatuses)
  })

  test('maps malformed, conflict, and authentication failures without exposing secrets', async () => {
    const { key, first, second, handlers, runtime } = await fixture()
    const malformed = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(first.id) }, body: { active: 'both' },
    })
    expect(malformed).toMatchObject({ statusCode: 400, body: { error_code: 'MCP_BINDING_INVALID' } })
    for (const route of [`POST ${CHAPTER_SOURCE_BASE}/mcp/test`, `PUT ${CHAPTER_SOURCE_BASE}/mcp`]) {
      const missingBinding = await call(routeHandler(handlers, route), {
        params: { id: String(first.id) }, body: {},
      })
      expect(missingBinding).toMatchObject({
        statusCode: 400,
        body: { error_code: 'MCP_BINDING_INVALID' },
      })
    }

    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    const conflict = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(second.id) }, body: { mcp: binding(key.id) },
    })
    expect(conflict).toMatchObject({ statusCode: 409, body: { error_code: 'MCP_BINDING_INVALID' } })

    runtime.listAgents = async () => {
      throw new McpError('MCP_AUTH_FAILED', `remote reflected ${FAKE_KEY} ${FAKE_HEADER}`)
    }
    const authentication = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/mcp/test`), {
      params: { id: String(second.id) }, body: { mcp: binding(key.id, 'agent-2') },
    })
    expect(authentication).toMatchObject({ statusCode: 401, body: { error_code: 'MCP_AUTH_FAILED' } })
    expect(JSON.stringify(authentication.body)).not.toContain(FAKE_KEY)
    expect(JSON.stringify(authentication.body)).not.toContain(FAKE_HEADER)
  })

  test('keeps legacy adapters compatible and uses retained MCP while model is active', async () => {
    const { key, first, handlers, runtime } = await fixture()
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(first.id) }, body: { model_id: 217 },
    })
    await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(first.id) }, body: { mcp: binding(key.id) },
    })
    const legacyModel = await call(routeHandler(handlers, `GET ${LEGACY_SOURCE_BASE}`), {
      params: { id: String(first.id) },
    })
    expect(legacyModel.body.source).toEqual({ version: 'prose_generation_source_v1', type: 'model' })

    let listCalls = 0
    let createCalls = 0
    runtime.listAgents = async () => { listCalls += 1; return [{ id: 'agent-1', name: '正文 Agent' }] }
    runtime.createAgent = async () => { createCalls += 1; return { id: 'agent-new', name: '新 Agent' } }
    expect((await call(routeHandler(handlers, `POST ${LEGACY_SOURCE_BASE}/test`), {
      params: { id: String(first.id) }, body: {},
    })).statusCode).toBe(200)
    expect((await call(routeHandler(handlers, `GET ${LEGACY_SOURCE_BASE}/agents`), {
      params: { id: String(first.id) }, query: {},
    })).statusCode).toBe(200)
    expect((await call(routeHandler(handlers, `POST ${LEGACY_SOURCE_BASE}/agents`), {
      params: { id: String(first.id) }, body: { name: '新 Agent' },
    })).statusCode).toBe(200)
    expect(listCalls).toBeGreaterThanOrEqual(2)
    expect(createCalls).toBe(1)

    const legacyMcp = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: binding(key.id, 'agent-1'),
    }
    const activatedMcp = await call(routeHandler(handlers, `PUT ${LEGACY_SOURCE_BASE}`), {
      params: { id: String(first.id) }, body: { source: legacyMcp },
    })
    expect(activatedMcp.body.source).toEqual(legacyMcp)
    const retainedMcpState = (await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: String(first.id) },
    })).body.source
    expect(retainedMcpState).toMatchObject({ active: 'mcp', model: { model_id: 217 }, mcp: binding(key.id) })

    await call(routeHandler(handlers, `PUT ${LEGACY_SOURCE_BASE}`), {
      params: { id: String(first.id) },
      body: { source: { version: 'prose_generation_source_v1', type: 'model' } },
    })
    const retainedAfterModel = (await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: String(first.id) },
    })).body.source
    expect(retainedAfterModel).toEqual({ ...retainedMcpState, active: 'model' })
  })

  test('snapshots a legacy source request once before validation and persistence', async () => {
    const { key, first, handlers } = await fixture()
    let sourceReads = 0
    const body: Record<string, unknown> = {}
    Object.defineProperty(body, 'source', {
      enumerable: true,
      get() {
        sourceReads += 1
        if (sourceReads > 1) throw new Error('legacy source request was read more than once')
        return {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: binding(key.id),
        }
      },
    })

    const response = await call(routeHandler(handlers, `PUT ${LEGACY_SOURCE_BASE}`), {
      params: { id: String(first.id) }, body,
    })

    expect(response.statusCode).toBe(200)
    expect(sourceReads).toBe(1)
    expect(response.body.source).toMatchObject({ type: 'mcp', mcp: binding(key.id) })

    let testSourceReads = 0
    const testBody: Record<string, unknown> = {}
    Object.defineProperty(testBody, 'source', {
      enumerable: true,
      get() {
        testSourceReads += 1
        if (testSourceReads > 1) throw new Error('legacy test source was read more than once')
        return {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: binding(key.id),
        }
      },
    })
    const tested = await call(routeHandler(handlers, `POST ${LEGACY_SOURCE_BASE}/test`), {
      params: { id: String(first.id) }, body: testBody,
    })
    expect(tested.statusCode).toBe(200)
    expect(testSourceReads).toBe(1)
  })

  test('registers model routes without an MCP runtime and controls unavailable MCP operations', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-model-only-source-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: '纯 API 项目', reference_config: {} })
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const { app, handlers } = createRouteHarness()
    registerNovelProjectControlRoutes(app, {
      getWorkspace: () => workspace,
      getProject: getNovelProject,
      chapterSourceLeases,
    } as any)

    const initial = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: String(project.id) },
    })
    expect(initial.body.source.active).toBe('model')
    const saved = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
      params: { id: String(project.id) }, body: { model_id: 217 },
    })
    expect(saved.body.source.model).toEqual({ model_id: 217 })
    const activated = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
      params: { id: String(project.id) }, body: { active: 'model' },
    })
    expect(activated.statusCode).toBe(200)
    const unavailable = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/mcp/test`), {
      params: { id: String(project.id) }, body: { mcp: binding(1) },
    })
    expect(unavailable).toMatchObject({
      statusCode: 422,
      body: { error_code: 'MCP_CAPABILITY_MISSING' },
    })
  })

  test('returns 404 for missing projects and 400 for invalid project ids', async () => {
    const { first, handlers } = await fixture()
    const missing = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: String(first.id + 1000) },
    })
    expect(missing.statusCode).toBe(404)
    const invalid = await call(routeHandler(handlers, `GET ${CHAPTER_SOURCE_BASE}`), {
      params: { id: 'not-an-id' },
    })
    expect(invalid).toMatchObject({ statusCode: 400, body: { error_code: 'MCP_BINDING_INVALID' } })
  })
})

describe('novel MCP prose-source binding routes', () => {
  test('returns model for an unconfigured project and persists a validated MCP binding', async () => {
    const { workspace, key, first, handlers } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const initial = await call(handlers.get(`GET ${path}`), { params: { id: String(first.id) } })
    expect(initial.body.source.type).toBe('model')

    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    const saved = await call(handlers.get(`PUT ${path}`), { params: { id: String(first.id) }, body: { source } })
    expect(saved.statusCode).toBe(200)
    expect(saved.body.source).toMatchObject({ version: 'prose_generation_source_v1', type: 'mcp' })
    expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source).toEqual({
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: {},
      mcp: { ...source.mcp, model: '' },
    })
  })

  test('rejects changing away from the current MCP tuple while its production lease is active', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const currentSource = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    await call(handlers.get(`PUT ${path}`), {
      params: { id: String(first.id) },
      body: { source: currentSource },
    })
    const before = structuredClone(await getNovelProject(workspace, first.id))
    let liveValidationCalls = 0
    runtime.listAgents = async () => {
      liveValidationCalls += 1
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }
    runtime.isAgentLeaseActive = async (_activeWorkspace: string, binding: any) => (
      binding.serverId === 'buda'
      && binding.keyId === key.id
      && binding.agentId === 'agent-1'
    )

    const response = await call(handlers.get(`PUT ${path}`), {
      params: { id: String(first.id) },
      body: { source: { version: 'prose_generation_source_v1', type: 'model' } },
    })

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('MCP_AGENT_BUSY')
    expect(await getNovelProject(workspace, first.id)).toEqual(before)
    expect(liveValidationCalls).toBe(0)
  })

  test('rejects changing to a proposed MCP tuple while its production lease is active', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const proposedSource = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-2' },
    }
    const before = structuredClone(await getNovelProject(workspace, first.id))
    let liveValidationCalls = 0
    runtime.listAgents = async () => {
      liveValidationCalls += 1
      return [{ id: 'agent-2', name: '正文 Agent 2' }]
    }
    runtime.isAgentLeaseActive = async (_activeWorkspace: string, binding: any) => (
      binding.serverId === 'buda'
      && binding.keyId === key.id
      && binding.agentId === 'agent-2'
    )

    const response = await call(handlers.get(`PUT ${path}`), {
      params: { id: String(first.id) },
      body: { source: proposedSource },
    })

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('MCP_AGENT_BUSY')
    expect(await getNovelProject(workspace, first.id)).toEqual(before)
    expect(liveValidationCalls).toBe(0)
  })

  test('rejects the same Server Key Agent tuple for a second project', async () => {
    const { key, first, second, handlers } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    await call(handlers.get(`PUT ${path}`), { params: { id: String(first.id) }, body: { source } })
    const conflict = await call(handlers.get(`PUT ${path}`), { params: { id: String(second.id) }, body: { source } })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.body.error_code).toBe('MCP_BINDING_INVALID')
  })

  test('serializes concurrent saves of the same Server Key Adapter Agent tuple', async () => {
    const { workspace, key, first, second, handlers, runtime } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    let arrivals = 0
    let release!: () => void
    const barrier = new Promise<void>(resolve => { release = resolve })
    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    runtime.listAgents = async () => {
      arrivals += 1
      if (arrivals === 1) releaseTimer = setTimeout(release, 0)
      else release()
      await barrier
      return [{ id: 'agent-1', name: '正文 Agent' }, { id: 'agent-2', name: '正文 Agent 2' }]
    }

    try {
      const responses = await Promise.all([
        call(handlers.get(`PUT ${path}`), { params: { id: String(first.id) }, body: { source } }),
        call(handlers.get(`PUT ${path}`), { params: { id: String(second.id) }, body: { source } }),
      ])

      expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409])
      const boundProjects = (await listNovelProjects(workspace)).filter(project => (
        project.reference_config?.chapter_generation_source?.active === 'mcp'
      ))
      expect(boundProjects).toHaveLength(1)
    } finally {
      if (releaseTimer) clearTimeout(releaseTimer)
    }
  })

  test('returns 404 when the project is deleted during live MCP validation', async () => {
    const { workspace, key, first, handlers, runtime } = await fixture()
    const path = '/api/novel/projects/:id/prose-generation-source'
    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    let signalValidationEntered!: () => void
    let releaseValidation!: () => void
    const validationEntered = new Promise<void>(resolve => { signalValidationEntered = resolve })
    const validationMayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    runtime.listAgents = async () => {
      signalValidationEntered()
      await validationMayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const saving = call(handlers.get(`PUT ${path}`), {
      params: { id: String(first.id) },
      body: { source },
    })
    await validationEntered
    expect(await deleteNovelProject(workspace, first.id)).toBe(true)
    releaseValidation()

    const response = await saving
    expect(response.statusCode).toBe(404)
    expect(response.body.error).toBe('project not found')
  })

  test('does not write into a replacement project that reuses the deleted project id', async () => {
    const { workspace, key, second, handlers, runtime } = await fixture()
    let validationEntered!: () => void
    let releaseValidation!: () => void
    const entered = new Promise<void>(resolve => { validationEntered = resolve })
    const mayFinish = new Promise<void>(resolve => { releaseValidation = resolve })
    runtime.listAgents = async () => {
      validationEntered()
      await mayFinish
      return [{ id: 'agent-1', name: '正文 Agent' }]
    }

    const saving = call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
      params: { id: String(second.id) },
      body: { mcp: binding(key.id) },
    })
    await entered
    expect(await deleteNovelProject(workspace, second.id)).toBe(true)
    const replacement = await createNovelProject(workspace, {
      title: '复用 ID 的替换项目',
      created_at: second.created_at,
      updated_at: second.updated_at,
      reference_config: {},
    })
    expect(replacement.id).toBe(second.id)
    releaseValidation()

    const response = await saving
    expect([404, 409]).toContain(response.statusCode)
    const storedReplacement = await getNovelProject(workspace, replacement.id)
    expect(storedReplacement?.title).toBe('复用 ID 的替换项目')
    expect(storedReplacement?.reference_config?.chapter_generation_source).toBeUndefined()
  })

  test('lists and explicitly creates Agents for a selected key without changing the binding', async () => {
    const { workspace, key, first, handlers } = await fixture()
    const base = '/api/novel/projects/:id/prose-generation-source'
    const listed = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })
    expect(listed.body.agents).toHaveLength(2)
    const created = await call(handlers.get(`POST ${base}/agents`), {
      params: { id: String(first.id) }, body: { server_id: 'buda', key_id: key.id, name: 'MangaForge Agent' },
    })
    expect(created.body.agent.id).toBe('agent-new')
    expect((await getNovelProject(workspace, first.id))?.reference_config?.prose_generation_source).toBeUndefined()
  })

  test('scrubs and projects the selected Agent in a successful binding test response', async () => {
    const { key, first, handlers, adapter } = await fixture()
    adapter.listAgents = async () => [maliciousAgent()]
    const base = '/api/novel/projects/:id/prose-generation-source'
    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }

    const response = await call(handlers.get(`POST ${base}/test`), {
      params: { id: String(first.id) }, body: { source },
    })

    expect(response.statusCode).toBe(200)
    expectSafePublicAgentResponse(response.body, response.body.agent)
  })

  test('scrubs and projects Agents in a successful list response', async () => {
    const { key, first, handlers, adapter } = await fixture()
    adapter.listAgents = async () => [maliciousAgent()]
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.agents).toHaveLength(1)
    expectSafePublicAgentResponse(response.body, response.body.agents[0])
  })

  test('scrubs and projects the Agent in a successful create response', async () => {
    const { key, first, handlers, adapter } = await fixture()
    adapter.createAgent = async () => maliciousAgent()
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`POST ${base}/agents`), {
      params: { id: String(first.id) },
      body: { server_id: 'buda', key_id: key.id, name: 'Fake Agent' },
    })

    expect(response.statusCode).toBe(200)
    expectSafePublicAgentResponse(response.body, response.body.agent)
  })

  test('scrubs and projects the selected Agent in a successful binding save response', async () => {
    const { key, first, handlers, adapter } = await fixture()
    adapter.listAgents = async () => [maliciousAgent()]
    const base = '/api/novel/projects/:id/prose-generation-source'
    const source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }

    const response = await call(handlers.get(`PUT ${base}`), {
      params: { id: String(first.id) }, body: { source },
    })

    expect(response.statusCode).toBe(200)
    expectSafePublicAgentResponse(response.body, response.body.validation.agent)
  })

  for (const scenario of [
    {
      name: 'binding save',
      spaceField: 'raw.space_id' as const,
      agentId: 'agent-1',
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number, agentId: string) => call(
        handlers.get(`PUT ${base}`),
        {
          params: { id: String(projectId) },
          body: {
            source: {
              version: 'prose_generation_source_v1',
              type: 'mcp',
              mcp: {
                server_id: 'buda', key_id: keyId, adapter_id: 'buda',
                agent_id: agentId,
              },
            },
          },
        },
      ),
    },
    {
      name: 'binding test',
      spaceField: 'raw.spaceId' as const,
      agentId: 'agent-1',
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number, agentId: string) => call(
        handlers.get(`POST ${base}/test`),
        {
          params: { id: String(projectId) },
          body: {
            source: {
              version: 'prose_generation_source_v1',
              type: 'mcp',
              mcp: {
                server_id: 'buda', key_id: keyId, adapter_id: 'buda',
                agent_id: agentId,
              },
            },
          },
        },
      ),
    },
    {
      name: 'Agent list',
      spaceField: 'space_id' as const,
      agentId: `agent-${PREFIX_KEY_PAYLOAD}`,
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number, _agentId: string) => call(
        handlers.get(`GET ${base}/agents`),
        { params: { id: String(projectId) }, query: { server_id: 'buda', key_id: String(keyId) } },
      ),
    },
    {
      name: 'Agent create',
      spaceField: 'spaceId' as const,
      agentId: `agent-${PREFIX_KEY_PAYLOAD}`,
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number, _agentId: string) => call(
        handlers.get(`POST ${base}/agents`),
        { params: { id: String(projectId) }, body: { server_id: 'buda', key_id: keyId, name: 'Agent' } },
      ),
    },
  ]) {
    test(`removes prefix-stripped credentials from the successful ${scenario.name} body`, async () => {
      const { key, first, handlers, adapter } = await fixture({
        keyValue: `Bearer ${PREFIX_KEY_PAYLOAD}`,
        authorization: `Basic ${PREFIX_AUTH_PAYLOAD}`,
        cookie: `sid=${PREFIX_COOKIE_PAYLOAD}; Path=/; HttpOnly`,
      })
      const agent = prefixStrippedAgent(scenario.spaceField, scenario.agentId)
      adapter.listAgents = async () => [agent]
      adapter.createAgent = async () => agent
      const base = '/api/novel/projects/:id/prose-generation-source'

      const response = await scenario.request(handlers, base, first.id, key.id, scenario.agentId)

      expect(response.statusCode).toBe(200)
      const serialized = JSON.stringify(response.body)
      for (const secret of [PREFIX_KEY_PAYLOAD, PREFIX_AUTH_PAYLOAD, PREFIX_COOKIE_PAYLOAD]) {
        expect(serialized).not.toContain(secret)
      }
      expect(serialized).toContain('ordinary-agent')
    })
  }

  for (const scenario of [
    { name: 'binding save', spaceField: 'raw.space_id' as const, agentId: 'agent-1', method: 'PUT' },
    { name: 'binding test', spaceField: 'raw.spaceId' as const, agentId: 'agent-1', method: 'POST-test' },
    { name: 'Agent list', spaceField: 'space_id' as const, agentId: 'agent-k1', method: 'GET-agents' },
    { name: 'Agent create', spaceField: 'spaceId' as const, agentId: 'agent-k1', method: 'POST-agents' },
  ]) {
    test(`removes every short derived credential from the complete successful ${scenario.name} body`, async () => {
      const { key, first, handlers, adapter } = await fixture({
        keyValue: 'Bearer k1',
        authorization: 'Basic a2',
        cookie: 'Path=p3; sid="q4"; Secure=s5',
      })
      const agent: any = {
        id: scenario.agentId,
        name: scenario.agentId === 'agent-1' ? 'name-k1-a2' : 'name-a2',
        description: 'description-p3',
        status: 'q4',
      }
      if (scenario.spaceField.startsWith('raw.')) {
        agent.raw = { [scenario.spaceField.slice(4)]: 'space-s5' }
      } else {
        agent[scenario.spaceField] = 'space-s5'
      }
      adapter.listAgents = async () => [agent]
      adapter.createAgent = async () => agent
      const base = '/api/novel/projects/:id/prose-generation-source'
      let response: any
      if (scenario.method === 'PUT' || scenario.method === 'POST-test') {
        const source = {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: scenario.agentId },
        }
        const route = scenario.method === 'PUT' ? `PUT ${base}` : `POST ${base}/test`
        response = await call(handlers.get(route), { params: { id: String(first.id) }, body: { source } })
      } else if (scenario.method === 'GET-agents') {
        response = await call(handlers.get(`GET ${base}/agents`), {
          params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
        })
      } else {
        response = await call(handlers.get(`POST ${base}/agents`), {
          params: { id: String(first.id) }, body: { server_id: 'buda', key_id: key.id, name: 'Agent' },
        })
      }

      expect(response.statusCode).toBe(200)
      const serialized = JSON.stringify(response.body)
      for (const secret of ['k1', 'a2', 'p3', 'q4', 's5']) expect(serialized).not.toContain(secret)
    })
  }

  test('uses one configured-secret replacement pass in a projected Agent field', async () => {
    const replacementParts = ['x', '[', 'R', 'E', 'D', 'A', 'C', 'T', ']']
    const { key, first, handlers, adapter } = await fixture({
      customHeaders: Object.fromEntries(replacementParts.map((value, index) => [`X-Part-${index}`, value])),
    })
    adapter.listAgents = async () => [{ id: 'agent-1', name: 'x'.repeat(128) }]
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.agents[0].name).toBe('[REDACTED]'.repeat(128))
  })

  test('projects only safe own primitive Agent fields and rejects oversized fields before scrubbing', async () => {
    const { key, first, handlers, adapter } = await fixture()
    let getterCalls = 0
    let toStringCalls = 0
    const coercible = {
      toString() {
        toStringCalls += 1
        return 'coerced-agent-id'
      },
    }
    const agent: any = {
      id: coercible,
      description: 'd'.repeat(4_097),
      status: 'ready',
    }
    for (const field of ['name', 'raw']) {
      Object.defineProperty(agent, field, {
        enumerable: true,
        get() {
          getterCalls += 1
          return field === 'name' ? 'getter-name' : { spaceId: 'getter-space' }
        },
      })
    }
    adapter.listAgents = async () => [agent]
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(getterCalls).toBe(0)
    expect(toStringCalls).toBe(0)
    expect(response.body.agents[0]).toEqual({ id: '', name: '', description: '[TRUNCATED]', status: 'ready' })
  })

  test('caps Agent list count before visiting remote entries beyond the public maximum', async () => {
    const { key, first, handlers, adapter } = await fixture()
    let beyondLimitCalls = 0
    const agents: any[] = Array.from({ length: 100 }, (_, index) => ({
      id: `agent-${index}`,
      name: `Agent ${index}`,
    }))
    Object.defineProperty(agents, '100', {
      enumerable: true,
      get() { beyondLimitCalls += 1; return { id: 'agent-100', name: 'Agent 100' } },
    })
    agents.length = 180
    adapter.listAgents = async () => agents
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.agents).toHaveLength(100)
    expect(beyondLimitCalls).toBe(0)
  })

  test('rejects Proxy Agent arrays and values without executing traps', async () => {
    const { key, first, handlers, adapter } = await fixture()
    let arrayTraps = 0
    const proxiedArray = new Proxy([{ id: 'agent-1', name: 'Agent 1' }], {
      get(target, property, receiver) {
        if (property === 'then') return undefined
        arrayTraps += 1
        return Reflect.get(target, property, receiver)
      },
      getOwnPropertyDescriptor() { arrayTraps += 1; return undefined },
    })
    adapter.listAgents = async () => proxiedArray
    const base = '/api/novel/projects/:id/prose-generation-source'
    const arrayResponse = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })
    expect(arrayResponse.body.agents).toEqual([])
    expect(arrayTraps).toBe(0)

    let agentTraps = 0
    const proxiedAgent = new Proxy({ id: 'agent-1', name: 'Agent 1' }, {
      get() { agentTraps += 1; return 'trap-value' },
      getOwnPropertyDescriptor() { agentTraps += 1; return undefined },
    })
    adapter.listAgents = async () => [proxiedAgent]
    const agentResponse = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })
    expect(agentResponse.body.agents).toEqual([{ id: '', name: '' }])
    expect(agentTraps).toBe(0)
  })

  test('does not invoke an accessor while reading an Agent list index', async () => {
    const { key, first, handlers, adapter } = await fixture()
    let indexGetterCalls = 0
    const agents: any[] = []
    Object.defineProperty(agents, '0', {
      enumerable: true,
      configurable: true,
      get() {
        indexGetterCalls += 1
        return { id: 'getter-agent', name: 'Getter Agent' }
      },
    })
    adapter.listAgents = async () => agents
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(indexGetterCalls).toBe(0)
    expect(response.body.agents).toEqual([])
  })

  test('keeps the serialized public Agent list within a fixed total character budget', async () => {
    const { key, first, handlers, adapter } = await fixture()
    adapter.listAgents = async () => Array.from({ length: 100 }, (_, index) => ({
      id: `agent-${index}`,
      name: `Agent ${index}`,
      description: 'd'.repeat(4_000),
    }))
    const base = '/api/novel/projects/:id/prose-generation-source'

    const response = await call(handlers.get(`GET ${base}/agents`), {
      params: { id: String(first.id) }, query: { server_id: 'buda', key_id: String(key.id) },
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.stringify(response.body).length).toBeLessThanOrEqual(128 * 1_024)
  })

  for (const scenario of [
    {
      name: 'Agent list',
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number) => call(
        handlers.get(`GET ${base}/agents`),
        { params: { id: String(projectId) }, query: { server_id: 'buda', key_id: String(keyId) } },
      ),
      agent: (body: any) => body.agents?.[0],
    },
    {
      name: 'Agent create',
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number) => call(
        handlers.get(`POST ${base}/agents`),
        { params: { id: String(projectId) }, body: { server_id: 'buda', key_id: keyId, name: 'Fake Agent' } },
      ),
      agent: (body: any) => body.agent,
    },
    {
      name: 'binding test',
      request: (handlers: Map<string, any>, base: string, projectId: number, keyId: number) => call(
        handlers.get(`POST ${base}/test`),
        {
          params: { id: String(projectId) },
          body: {
            source: {
              version: 'prose_generation_source_v1',
              type: 'mcp',
              mcp: { server_id: 'buda', key_id: keyId, adapter_id: 'buda', agent_id: 'agent-1' },
            },
          },
        },
      ),
      agent: (body: any) => body.agent,
    },
  ]) {
    test(`pins one selected credential snapshot across ${scenario.name} rotation and response projection`, async () => {
      const { key, project, handlers, usedCredentials } = await rotatingCredentialFixture()
      const base = '/api/novel/projects/:id/prose-generation-source'

      const response = await scenario.request(handlers, base, project.id, key.id)

      expect(response.statusCode).toBe(200)
      expectSafePublicAgentResponse(response.body, scenario.agent(response.body))
      expect(usedCredentials).toHaveLength(1)
      expect(usedCredentials[0]?.key.key).toBe(FAKE_KEY)
      expect(usedCredentials[0]?.server.custom_headers).toEqual({
        'X-Fake': FAKE_HEADER,
        Authorization: `Basic ${FAKE_AUTH}`,
        Cookie: `sid=${FAKE_COOKIE}`,
      })
    })
  }
})
