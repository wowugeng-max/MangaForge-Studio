import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { McpError } from '../mcp/errors'
import { createMcpKey, getMcpKeysPath, readMcpKeys } from '../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../mcp/server-store'
import * as mcpServerStore from '../mcp/server-store'
import { assertMcpWorkspaceMutationHeld } from '../mcp/workspace-coordinator'
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

  test('rejects unsupported stdio servers', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any)

    const stdio = await call(handlers.get('POST /api/mcp/servers'), {
      body: { id: 'local', transport: 'stdio', display_name: 'Local', url: 'stdio', adapter_id: 'buda' },
    })
    expect(stdio.statusCode).toBe(400)
    expect(stdio.body.error_code).toBe('MCP_BINDING_INVALID')
  })

  test('blocks destructive changes to precisely referenced normalized records inside the coordinator', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [
      BUDA_MCP_SERVER_TEMPLATE,
      {
        ...BUDA_MCP_SERVER_TEMPLATE,
        id: 'buda-other',
        display_name: 'Buda Other',
        url: 'https://other.buda.im/api/mcp',
      },
    ])
    const referencedKey = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_referenced',
      description: '引用账号',
    })
    const unrelatedKey = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_unrelated',
      description: '无关账号',
    })
    const references = [{ id: 9, title: '绑定小说' }]
    const findProjectReferences = async (
      activeWorkspace: string,
      target: { serverId?: string; keyId?: number },
    ) => {
      assertMcpWorkspaceMutationHeld(activeWorkspace)
      return target.keyId === referencedKey.id || target.serverId === 'buda' ? references : []
    }
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateKey: async () => {},
      invalidateServer: async () => {},
    } as any, { findProjectReferences })

    const expectReferencedConflict = (response: any) => {
      expect(response.statusCode).toBe(409)
      expect(response.body).toMatchObject({
        error_code: 'MCP_REFERENCED_RECORD_CONFLICT',
        references,
      })
      expect(response.body.error).toBeString()
    }

    expectReferencedConflict(await call(handlers.get('PUT /api/mcp/keys/:id'), {
      params: { id: String(referencedKey.id) },
      body: { is_active: 'false' },
    }))
    expectReferencedConflict(await call(handlers.get('PUT /api/mcp/keys/:id'), {
      params: { id: String(referencedKey.id) },
      body: { mcp_server_id: 'buda-other' },
    }))
    expectReferencedConflict(await call(handlers.get('PUT /api/mcp/keys/:id'), {
      params: { id: String(referencedKey.id) },
      body: { is_active: false, allow_referenced_disable: true },
    }))
    expectReferencedConflict(await call(handlers.get('DELETE /api/mcp/keys/:id'), {
      params: { id: String(referencedKey.id) },
    }))
    expectReferencedConflict(await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' },
      body: { is_active: 'false', allow_referenced_disable: true },
    }))
    expectReferencedConflict(await call(handlers.get('DELETE /api/mcp/servers/:id'), {
      params: { id: 'buda' },
    }))

    const descriptionUpdate = await call(handlers.get('PUT /api/mcp/keys/:id'), {
      params: { id: String(unrelatedKey.id) },
      body: { description: '允许修改' },
    })
    expect(descriptionUpdate.statusCode).toBe(200)
    expect(descriptionUpdate.body.key).toMatchObject({ id: unrelatedKey.id, description: '允许修改' })
    expect(descriptionUpdate.body.key).not.toHaveProperty('key')

    const unrelatedDelete = await call(handlers.get('DELETE /api/mcp/keys/:id'), {
      params: { id: String(unrelatedKey.id) },
    })
    expect(unrelatedDelete.statusCode).toBe(200)
    expect((await readMcpKeys(workspace)).map(key => key.id)).toEqual([referencedKey.id])
  })

  test('returns 404 without scanning references when deleting missing or invalid records', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    let referenceChecks = 0
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any, {
      findProjectReferences: async () => {
        referenceChecks += 1
        return [{ id: 9, title: '不应泄露的绑定小说' }]
      },
    })

    const missingServer = await call(handlers.get('DELETE /api/mcp/servers/:id'), {
      params: { id: 'missing' },
    })
    const missingKey = await call(handlers.get('DELETE /api/mcp/keys/:id'), {
      params: { id: '999' },
    })
    const invalidKey = await call(handlers.get('DELETE /api/mcp/keys/:id'), {
      params: { id: 'not-a-number' },
    })

    expect(missingServer).toMatchObject({ statusCode: 404, body: { error: 'MCP Server 不存在' } })
    expect(missingKey).toMatchObject({ statusCode: 404, body: { error: 'MCP Key 不存在' } })
    expect(invalidKey).toMatchObject({ statusCode: 404, body: { error: 'MCP Key 不存在' } })
    expect(referenceChecks).toBe(0)
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

  test('scrubs submitted Key and Header values from create and update errors', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const submittedKey = 'synthetic-submitted-route-key'
    const keyBody: any = { key: submittedKey }
    Object.defineProperty(keyBody, 'mcp_server_id', {
      enumerable: true,
      get() { throw new Error(`request parser reflected ${submittedKey}`) },
    })
    const submittedHeader = 'synthetic-submitted-route-header'
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateServer: async () => { throw new Error(`update hook reflected X-Space=${submittedHeader}`) },
    } as any)

    const createFailure = await call(handlers.get('POST /api/mcp/keys'), { body: keyBody })
    expect(createFailure.statusCode).toBe(500)
    expect(JSON.stringify(createFailure.body)).not.toContain(submittedKey)
    expect(createFailure.body.error).toContain('[REDACTED]')

    const updateFailure = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' },
      body: { custom_headers: { 'X-Space': submittedHeader } },
    })
    expect(updateFailure.statusCode).toBe(500)
    expect(JSON.stringify(updateFailure.body)).not.toContain(submittedHeader)
    expect(updateFailure.body.error).toContain('[REDACTED]')
  })

  test('scrubs stored credentials from runtime errors and diagnostics', async () => {
    const workspace = await temporaryWorkspace()
    const storedHeader = 'synthetic-stored-route-header'
    const storedCookie = 'session=synthetic-stored-cookie'
    await writeMcpServers(workspace, [{
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': storedHeader, Cookie: storedCookie },
    }])
    const storedKey = 'sk_' + 'test_stored_route_key'
    const keyRecord = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: storedKey,
      description: '账号',
    })
    const runtime = {
      testKey: async () => {
        throw new McpError('MCP_TOOL_ERROR', `upstream reflected ${storedKey} and ${storedHeader}`, {
          authorization: `Bearer ${storedKey}`,
          nested: { cookie: storedCookie },
          key_id: keyRecord.id,
        })
      },
      diagnostics: async () => ({
        state: 'Ready',
        server_id: 'buda',
        key_id: keyRecord.id,
        tools: [{ name: 'safe-tool', description: `${storedHeader} Cookie: ${storedCookie}` }],
      }),
    }
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, runtime as any)

    const testFailure = await call(handlers.get('POST /api/mcp/keys/:id/test'), {
      params: { id: String(keyRecord.id) },
    })
    expect(testFailure.statusCode).toBe(502)
    expect(testFailure.body).toMatchObject({ error_code: 'MCP_TOOL_ERROR' })
    expect(JSON.stringify(testFailure.body)).not.toContain(storedKey)
    expect(JSON.stringify(testFailure.body)).not.toContain(storedHeader)
    expect(JSON.stringify(testFailure.body)).not.toContain('synthetic-stored-cookie')

    const diagnostics = await call(handlers.get('GET /api/mcp/servers/:id/diagnostics'), {
      params: { id: 'buda' },
      query: { key_id: String(keyRecord.id) },
    })
    expect(diagnostics.body).toMatchObject({ state: 'Ready', server_id: 'buda', key_id: keyRecord.id })
    expect(JSON.stringify(diagnostics.body)).not.toContain(storedKey)
    expect(JSON.stringify(diagnostics.body)).not.toContain(storedHeader)
    expect(JSON.stringify(diagnostics.body)).not.toContain('synthetic-stored-cookie')
  })

  test('preserves a corrupt Store and its stable public error while building route scrubbers', async () => {
    const workspace = await temporaryWorkspace()
    const path = getMcpKeysPath(workspace)
    const corrupt = '{not-valid-json synthetic-corrupt-store-value'
    await writeFile(path, corrupt, 'utf8')
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any)

    const response = await call(handlers.get('GET /api/mcp/keys'))

    expect(response.statusCode).toBe(502)
    expect(response.body).toMatchObject({
      error_code: 'MCP_STORE_CORRUPT',
      error: 'MCP 配置文件损坏：mcp-keys.json',
    })
    expect(JSON.stringify(response.body)).not.toContain('synthetic-corrupt-store-value')
    expect(await readFile(path, 'utf8')).toBe(corrupt)
  })
})
