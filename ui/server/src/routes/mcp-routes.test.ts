import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, readMcpKeys } from '../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../mcp/server-store'
import * as mcpServerStore from '../mcp/server-store'
import { registerMcpRoutes } from './mcp-routes'

const workspaces: string[] = []

async function temporaryWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-routes-'))
  workspaces.push(workspace)
  return workspace
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'post', 'put', 'delete']) {
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

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('MCP routes', () => {
  test('never returns raw custom Header values', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [{
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': 'private-space', Cookie: 'session=private' },
    }])
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any)

    const response = await call(handlers.get('GET /api/mcp/servers'))
    expect(response.body[0].custom_headers).toEqual([
      { name: 'Cookie', configured: true },
      { name: 'X-Space', configured: true },
    ])
    expect(JSON.stringify(response.body)).not.toContain('private-space')
    expect(JSON.stringify(response.body)).not.toContain('session=private')
  })

  test('returns public Server DTOs after create and update', async () => {
    const workspace = await temporaryWorkspace()
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, { invalidateServer: async () => {} } as any)

    const created = await call(handlers.get('POST /api/mcp/servers'), {
      body: {
        id: 'custom',
        display_name: 'Custom',
        transport: 'streamable_http',
        url: 'https://example.test/mcp',
        adapter_id: 'buda',
        custom_headers: { 'X-Token': 'create-private' },
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.body.server.custom_headers).toEqual([{ name: 'X-Token', configured: true }])
    expect(JSON.stringify(created.body)).not.toContain('create-private')

    const updated = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'custom' },
      body: { custom_headers: { 'X-Token': 'update-private', 'X-Other': 'other-private' } },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.body.server.custom_headers).toEqual([
      { name: 'X-Other', configured: true },
      { name: 'X-Token', configured: true },
    ])
    expect(JSON.stringify(updated.body)).not.toContain('update-private')
    expect(JSON.stringify(updated.body)).not.toContain('other-private')
  })

  test('merges Header replacements, blank preservation, and explicit removals', () => {
    const mergeMcpCustomHeaders = (mcpServerStore as any).mergeMcpCustomHeaders
    expect(mergeMcpCustomHeaders(
      { '': 'test-empty', '   ': 'test-whitespace', 'X-Keep': 'old', 'X-Replace': 'old', 'X-Remove': 'old' },
      { 'X-Keep': '   ', 'X-Replace': 'new' },
      ['', '   ', '  X-Remove  '],
    )).toEqual({
      '': 'test-empty',
      '   ': 'test-whitespace',
      'X-Keep': 'old',
      'X-Replace': 'new',
    })
  })

  test('replaces Header identities case-insensitively without changing blank preservation', () => {
    const mergeMcpCustomHeaders = (mcpServerStore as any).mergeMcpCustomHeaders
    expect(mergeMcpCustomHeaders(
      { Authorization: 'old', 'X-Keep': 'keep' },
      { authorization: 'new' },
      [],
    )).toEqual({
      authorization: 'new',
      'X-Keep': 'keep',
    })
    expect(mergeMcpCustomHeaders(
      { Authorization: 'old', 'X-Keep': 'keep' },
      { authorization: '   ' },
      [],
    )).toEqual({
      Authorization: 'old',
      'X-Keep': 'keep',
    })
  })

  test('removes every case variant of a normalized Header identity', () => {
    const mergeMcpCustomHeaders = (mcpServerStore as any).mergeMcpCustomHeaders
    expect(mergeMcpCustomHeaders(
      { Cookie: 'old', cookie: 'duplicate', 'X-Keep': 'keep' },
      undefined,
      [' COOKIE '],
    )).toEqual({
      'X-Keep': 'keep',
    })
  })

  test('allows same-origin URL edits and rejects cross-origin edits while a Key exists', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_origin_bound', description: '账号' })
    const invalidated: string[] = []
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateServer: async (id: string) => { invalidated.push(id) },
    } as any)

    const sameOrigin = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' },
      body: { url: 'https://buda.im/api/mcp/v2' },
    })
    expect(sameOrigin.statusCode).toBe(200)

    const changedOrigin = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' },
      body: { url: 'https://attacker.example/mcp' },
    })
    expect(changedOrigin.statusCode).toBe(409)
    expect(changedOrigin.body.error_code).toBe('MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL')
    expect(invalidated).toEqual(['buda'])
  })

  test('lists public key records without exposing raw secrets', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_route_secret', description: '账号一' })
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any)

    const response = await call(handlers.get('GET /api/mcp/keys'))
    expect(response.statusCode).toBe(200)
    expect(response.body[0]).toMatchObject({ masked_key: 'sk_r***cret', has_key: true })
    expect(response.body[0]).not.toHaveProperty('key')
    expect(JSON.stringify(response.body)).not.toContain('sk_route_secret')
  })

  test('creates and updates an MCP key with overwrite-only secret semantics', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, { invalidateKey: async () => {} } as any)

    const created = await call(handlers.get('POST /api/mcp/keys'), {
      body: { mcp_server_id: 'buda', key: 'sk_original', description: '初始账号' },
    })
    expect(created.statusCode).toBe(201)
    expect(created.body.key).not.toHaveProperty('key')

    await call(handlers.get('PUT /api/mcp/keys/:id'), {
      params: { id: String(created.body.key.id) },
      body: { description: '改名账号' },
    })
    expect((await readMcpKeys(workspace))[0]).toMatchObject({ key: 'sk_original', description: '改名账号' })
  })

  test('rejects unsupported stdio servers and protects referenced records from deletion', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_x', description: '账号' })
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any, {
      findProjectReferences: async () => [{ id: 9, title: '绑定小说' }],
    })

    const stdio = await call(handlers.get('POST /api/mcp/servers'), {
      body: { id: 'local', transport: 'stdio', display_name: 'Local', url: 'stdio', adapter_id: 'buda' },
    })
    expect(stdio.statusCode).toBe(400)
    expect(stdio.body.error_code).toBe('MCP_BINDING_INVALID')

    const serverDelete = await call(handlers.get('DELETE /api/mcp/servers/:id'), { params: { id: 'buda' } })
    const keyDelete = await call(handlers.get('DELETE /api/mcp/keys/:id'), { params: { id: String(key.id) } })
    expect(serverDelete.statusCode).toBe(409)
    expect(keyDelete.statusCode).toBe(409)
  })

  test('exposes diagnostics, Agent listing, and explicit Agent creation through runtime actions', async () => {
    const workspace = await temporaryWorkspace()
    const calls: string[] = []
    const runtime = {
      diagnostics: async () => { calls.push('diagnostics'); return { state: 'Ready', tools: ['one'] } },
      listAgents: async () => { calls.push('listAgents'); return [{ id: 'agent-1', name: '正文 Agent' }] },
      createAgent: async () => { calls.push('createAgent'); return { id: 'agent-2', name: 'MangaForge Agent' } },
      testKey: async () => ({ ok: true, latency_ms: 12, agent_count: 1 }),
    }
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, runtime as any)

    expect((await call(handlers.get('GET /api/mcp/servers/:id/diagnostics'), { params: { id: 'buda' }, query: { key_id: '3' } })).body.state).toBe('Ready')
    expect((await call(handlers.get('GET /api/mcp/keys/:id/agents'), { params: { id: '3' } })).body.agents).toHaveLength(1)
    expect((await call(handlers.get('POST /api/mcp/keys/:id/agents'), { params: { id: '3' }, body: { name: 'MangaForge Agent' } })).body.agent.id).toBe('agent-2')
    expect(calls).toEqual(['diagnostics', 'listAgents', 'createAgent'])
  })
})
