import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, updateMcpKey } from '../mcp/key-store'
import { createMcpRuntime } from '../mcp/runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../mcp/server-store'
import { createNovelProject, deleteNovelProject, getNovelProject, listNovelProjects } from '../novel'
import { registerNovelMcpBindingRoutes } from './novel-mcp-binding-routes'

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

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

async function fixture(input: {
  keyValue?: string
  authorization?: string
  cookie?: string
  customHeaders?: Record<string, string>
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
  const { app, handlers } = createRouteHarness()
  registerNovelMcpBindingRoutes(app, {
    getWorkspace: () => workspace,
    getProject: getNovelProject,
    mcpRuntime: runtime as any,
  })
  return { workspace, key, first, second, handlers, runtime, adapter }
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
  const { app, handlers } = createRouteHarness()
  registerNovelMcpBindingRoutes(app, {
    getWorkspace: () => workspace,
    getProject: getNovelProject,
    mcpRuntime: runtime as any,
  })
  return { key, project, handlers, usedCredentials }
}

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
    expect((await getNovelProject(workspace, first.id))?.reference_config?.prose_generation_source).toEqual(saved.body.source)
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
        project.reference_config?.prose_generation_source?.type === 'mcp'
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
