import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey } from '../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../mcp/server-store'
import { createNovelProject, deleteNovelProject, getNovelProject, listNovelProjects } from '../novel'
import { registerNovelMcpBindingRoutes } from './novel-mcp-binding-routes'

const workspaces: string[] = []
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

async function fixture() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-binding-route-'))
  workspaces.push(workspace)
  await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
  const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_binding', description: '账号' })
  const first = await createNovelProject(workspace, { title: '项目一', reference_config: {} })
  const second = await createNovelProject(workspace, { title: '项目二', reference_config: {} })
  const runtime = {
    listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }, { id: 'agent-2', name: '正文 Agent 2' }],
    createAgent: async () => ({ id: 'agent-new', name: 'MangaForge Agent' }),
  }
  const { app, handlers } = createRouteHarness()
  registerNovelMcpBindingRoutes(app, {
    getWorkspace: () => workspace,
    getProject: getNovelProject,
    mcpRuntime: runtime as any,
  })
  return { workspace, key, first, second, handlers, runtime }
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
})
