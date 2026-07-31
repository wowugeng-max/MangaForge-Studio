import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { McpError } from '../mcp/errors'
import { McpAgentLeaseRegistry } from '../mcp/agent-lease'
import { createMcpKey, getMcpKeysPath, readMcpKeys } from '../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, readMcpServers, writeMcpServers } from '../mcp/server-store'
import * as mcpServerStore from '../mcp/server-store'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
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
  test('exposes public quarantine list, terminal-only reconcile, and acknowledged forced clear', async () => {
    const workspace = await temporaryWorkspace()
    const publicRecord = {
      id: 'quarantine-1', server_id: 'buda', key_id: 3, agent_id: 'agent-1',
      session_id: 'session-1', reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }
    const calls: any[] = []
    const runtime = {
      listAgentQuarantines: async (activeWorkspace: string) => {
        calls.push(['list', activeWorkspace])
        return [publicRecord]
      },
      reconcileAgentQuarantine: async (activeWorkspace: string, id: string) => {
        calls.push(['reconcile', activeWorkspace, id])
        if (id === 'missing-quarantine') return null
        if (id === 'quarantine-1') return {
          quarantine: publicRecord, status: 'in_progress', terminal: false, cleared: false, outcome: 'nonterminal',
        }
        return {
          quarantine: { ...publicRecord, id }, status: 'completed', terminal: true, cleared: true, outcome: 'cleared',
        }
      },
      clearAgentQuarantine: async (activeWorkspace: string, id: string) => {
        calls.push(['clear', activeWorkspace, id])
        return id !== 'missing-quarantine'
      },
    }
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, runtime as any)

    const listed = await call(handlers.get('GET /api/mcp/quarantines'))
    expect(listed.body).toEqual([publicRecord])
    expect(Object.keys(listed.body[0]).sort()).toEqual([
      'agent_id', 'created_at', 'id', 'key_id', 'reason', 'server_id', 'session_id',
    ])

    const nonterminal = await call(handlers.get('POST /api/mcp/quarantines/:id/reconcile'), { params: { id: 'quarantine-1' } })
    expect(nonterminal.statusCode).toBe(409)
    expect(nonterminal.body).toMatchObject({
      error_code: 'MCP_AGENT_QUARANTINED', status: 'in_progress', terminal: false, cleared: false,
    })
    const terminal = await call(handlers.get('POST /api/mcp/quarantines/:id/reconcile'), { params: { id: 'quarantine-terminal' } })
    expect(terminal.statusCode).toBe(200)
    expect(terminal.body).toMatchObject({ ok: true, status: 'completed', terminal: true, cleared: true })
    const durableLongId = `quarantine-${'x'.repeat(200)}`
    const longId = await call(handlers.get('POST /api/mcp/quarantines/:id/reconcile'), { params: { id: durableLongId } })
    expect(longId.statusCode).toBe(200)
    expect(longId.body.quarantine.id).toBe(durableLongId)
    const missing = await call(handlers.get('POST /api/mcp/quarantines/:id/reconcile'), { params: { id: 'missing-quarantine' } })
    expect(missing.statusCode).toBe(404)
    const invalid = await call(handlers.get('POST /api/mcp/quarantines/:id/reconcile'), { params: { id: '' } })
    expect(invalid.statusCode).toBe(400)

    for (const acknowledge of [undefined, false]) {
      const rejected = await call(handlers.get('DELETE /api/mcp/quarantines/:id'), {
        params: { id: 'quarantine-1' }, body: acknowledge === undefined ? {} : { acknowledge_remote_work_may_continue: acknowledge },
      })
      expect(rejected.statusCode).toBe(400)
      expect(rejected.body.error_code).toBe('MCP_QUARANTINE_ACK_REQUIRED')
    }
    const cleared = await call(handlers.get('DELETE /api/mcp/quarantines/:id'), {
      params: { id: 'quarantine-1' }, body: { acknowledge_remote_work_may_continue: true },
    })
    expect(cleared.statusCode).toBe(200)
    expect(cleared.body).toEqual({ ok: true, cleared: true, id: 'quarantine-1' })
    const missingClear = await call(handlers.get('DELETE /api/mcp/quarantines/:id'), {
      params: { id: 'missing-quarantine' }, body: { acknowledge_remote_work_may_continue: true },
    })
    expect(missingClear.statusCode).toBe(404)

    expect(calls.filter(call => call[0] === 'clear')).toEqual([
      ['clear', workspace, 'quarantine-1'],
      ['clear', workspace, 'missing-quarantine'],
    ])
  })

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

  test('does not execute behavioral submitted Header records while building the route scrubber', async () => {
    const workspace = await temporaryWorkspace()
    let proxyTraps = 0
    const proxyHeaders = new Proxy({ Authorization: 'Basic proxy-secret' }, {
      ownKeys() { proxyTraps += 1; return ['Authorization'] },
      getOwnPropertyDescriptor() { proxyTraps += 1; return { enumerable: true, configurable: true, value: 'Basic proxy-secret' } },
      get() { proxyTraps += 1; return 'Basic proxy-secret' },
    })
    let getterCalls = 0
    const getterHeaders: Record<string, string> = {}
    Object.defineProperty(getterHeaders, 'Authorization', {
      enumerable: true,
      get() { getterCalls += 1; return 'Basic getter-secret' },
    })
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {} as any)

    expect((await call(handlers.get('GET /api/mcp/servers'), {
      body: { custom_headers: proxyHeaders },
    })).statusCode).toBe(200)
    expect((await call(handlers.get('GET /api/mcp/servers'), {
      body: { custom_headers: getterHeaders },
    })).statusCode).toBe(200)
    expect(proxyTraps).toBe(0)
    expect(getterCalls).toBe(0)
  })

  test('rejects behavioral Header records on Server create and update without executing traps', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    let proxyTraps = 0
    const proxyHeaders = new Proxy({ Authorization: 'Basic proxy-secret' }, {
      ownKeys() { proxyTraps += 1; return ['Authorization'] },
      getOwnPropertyDescriptor() { proxyTraps += 1; return { enumerable: true, configurable: true, value: 'Basic proxy-secret' } },
      get() { proxyTraps += 1; return 'Basic proxy-secret' },
    })
    let getterCalls = 0
    const getterHeaders: Record<string, string> = {}
    Object.defineProperty(getterHeaders, 'Authorization', {
      enumerable: true,
      get() { getterCalls += 1; return 'Basic getter-secret' },
    })
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, { invalidateServer: async () => {} } as any)

    const created = await call(handlers.get('POST /api/mcp/servers'), {
      body: {
        id: 'proxy-server', display_name: 'Proxy', transport: 'streamable_http',
        url: 'https://example.test/mcp', adapter_id: 'buda', custom_headers: proxyHeaders,
      },
    })
    const updated = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' }, body: { custom_headers: getterHeaders },
    })

    expect(created.statusCode).toBe(400)
    expect(created.body.error_code).toBe('MCP_BINDING_INVALID')
    expect(updated.statusCode).toBe(400)
    expect(updated.body.error_code).toBe('MCP_BINDING_INVALID')
    expect(proxyTraps).toBe(0)
    expect(getterCalls).toBe(0)
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

  test('passes the captured workspace to Server and Key invalidation after ambient drift', async () => {
    const workspaceA = await temporaryWorkspace()
    const workspaceB = await temporaryWorkspace()
    const deletableServer = { ...BUDA_MCP_SERVER_TEMPLATE, id: 'delete-server', display_name: 'Delete Server' }
    await writeMcpServers(workspaceA, [BUDA_MCP_SERVER_TEMPLATE, deletableServer])
    const updatedKey = await createMcpKey(workspaceA, {
      mcp_server_id: 'buda', key: 'fixture-update-key', description: '更新',
    })
    const deletedKey = await createMcpKey(workspaceA, {
      mcp_server_id: 'buda', key: 'fixture-delete-key', description: '删除',
    })
    let ambientWorkspace = workspaceA
    const invalidations: any[] = []
    const runtime = {
      invalidateServer: async (serverId: string, activeWorkspace?: string) => {
        invalidations.push(['server', serverId, activeWorkspace])
      },
      invalidateKey: async (keyId: number, serverId?: string, activeWorkspace?: string) => {
        invalidations.push(['key', keyId, serverId, activeWorkspace])
      },
    }
    const findProjectReferences = async () => {
      ambientWorkspace = workspaceB
      await Promise.resolve()
      return []
    }
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => ambientWorkspace, runtime as any, { findProjectReferences })

    const operations = [
      () => call(handlers.get('PUT /api/mcp/servers/:id'), {
        params: { id: 'buda' }, body: { is_active: false },
      }),
      () => call(handlers.get('DELETE /api/mcp/servers/:id'), {
        params: { id: 'delete-server' },
      }),
      () => call(handlers.get('PUT /api/mcp/keys/:id'), {
        params: { id: String(updatedKey.id) }, body: { is_active: false },
      }),
      () => call(handlers.get('DELETE /api/mcp/keys/:id'), {
        params: { id: String(deletedKey.id) },
      }),
    ]
    for (const operation of operations) {
      ambientWorkspace = workspaceA
      const response = await operation()
      expect(response.statusCode).toBe(200)
      expect(ambientWorkspace).toBe(workspaceB)
    }

    expect(invalidations).toEqual([
      ['server', 'buda', workspaceA],
      ['server', 'delete-server', workspaceA],
      ['key', updatedKey.id, 'buda', workspaceA],
      ['key', deletedKey.id, 'buda', workspaceA],
    ])
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

  test('returns conflicts for active and quarantined identity edits while allowing metadata edits', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_route_fenced', description: '账号',
    })
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, {
      serverId: 'buda', keyId: key.id, agentId: 'agent-1',
    })
    const invalidatedKeys: number[] = []
    const invalidatedServers: string[] = []
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateKey: async (id: number) => { invalidatedKeys.push(id) },
      invalidateServer: async (id: string) => { invalidatedServers.push(id) },
    } as any)

    try {
      const metadata = await call(handlers.get('PUT /api/mcp/keys/:id'), {
        params: { id: String(key.id) }, body: { description: '仅更新显示信息' },
      })
      expect(metadata.statusCode).toBe(200)

      const busy = await call(handlers.get('PUT /api/mcp/keys/:id'), {
        params: { id: String(key.id) }, body: { key: 'sk_route_rotated' },
      })
      expect(busy).toMatchObject({ statusCode: 409, body: { error_code: 'MCP_AGENT_BUSY' } })

      await lease.quarantine({
        requestId: 'request-route', sessionId: 'session-route', reason: 'send_unknown',
      })
    } finally {
      await lease.release()
    }

    const quarantined = await call(handlers.get('PUT /api/mcp/servers/:id'), {
      params: { id: 'buda' }, body: { custom_headers: { 'X-Space': 'rotated' } },
    })
    expect(quarantined).toMatchObject({
      statusCode: 409, body: { error_code: 'MCP_AGENT_QUARANTINED' },
    })
    expect(invalidatedKeys).toEqual([key.id])
    expect(invalidatedServers).toEqual([])
  })

  test('does not create an orphan Key behind a queued Server delete', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    let signalBlockerEntered!: () => void
    let releaseBlocker!: () => void
    const blockerEntered = new Promise<void>(resolve => { signalBlockerEntered = resolve })
    const blockerMayFinish = new Promise<void>(resolve => { releaseBlocker = resolve })
    const blocker = withMcpWorkspaceMutation(workspace, async () => {
      signalBlockerEntered()
      await blockerMayFinish
    })
    await blockerEntered

    let signalDeleteHandlerEntered!: () => void
    const deleteHandlerEntered = new Promise<void>(resolve => { signalDeleteHandlerEntered = resolve })
    let deleteWorkspaceReads = 0
    const deleteHarness = createRouteHarness()
    registerMcpRoutes(deleteHarness.app, () => {
      deleteWorkspaceReads += 1
      if (deleteWorkspaceReads === 2) signalDeleteHandlerEntered()
      return workspace
    }, {} as any)
    const deleting = call(deleteHarness.handlers.get('DELETE /api/mcp/servers/:id'), {
      params: { id: 'buda' },
    })
    await deleteHandlerEntered

    const secret = 'sk_no_orphan'
    let secretReads = 0
    let blockerReleased = false
    const releaseBlockerOnce = () => {
      if (blockerReleased) return
      blockerReleased = true
      releaseBlocker()
    }
    const keyBody: Record<string, unknown> = {
      mcp_server_id: 'buda',
      description: '并发账号',
    }
    Object.defineProperty(keyBody, 'key', {
      enumerable: true,
      get() {
        secretReads += 1
        if (secretReads === 3) releaseBlockerOnce()
        return secret
      },
    })
    const keyHarness = createRouteHarness()
    registerMcpRoutes(keyHarness.app, () => workspace, {} as any)
    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const posting = call(keyHarness.handlers.get('POST /api/mcp/keys'), { body: keyBody })
      releaseTimer = setTimeout(releaseBlockerOnce, 100)
      const [deleteResponse, postResponse] = await Promise.all([deleting, posting, blocker])

      expect(deleteResponse.statusCode).toBe(200)
      expect(postResponse.statusCode).toBe(400)
      expect(postResponse.body.error_code).toBe('MCP_BINDING_INVALID')
      expect(JSON.stringify(postResponse.body)).not.toContain(secret)
      expect(await readMcpServers(workspace)).toEqual([])
      expect(await readMcpKeys(workspace)).toEqual([])
    } finally {
      if (releaseTimer) clearTimeout(releaseTimer)
      releaseBlockerOnce()
      await blocker
    }
  })

  test('creates the Key before a getter-triggered origin update can cross the credential fence', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const invalidatedServers: string[] = []
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateServer: async (id: string) => { invalidatedServers.push(id) },
    } as any)
    let releaseOriginUpdate!: () => void
    const originUpdateMayRun = new Promise<void>(resolve => { releaseOriginUpdate = resolve })
    let originReleased = false
    const releaseOriginOnce = () => {
      if (originReleased) return
      originReleased = true
      releaseOriginUpdate()
    }
    const secret = 'sk_origin_race'
    let secretReads = 0
    let originUpdating: Promise<any> | undefined
    const keyBody: Record<string, unknown> = {
      mcp_server_id: 'buda',
      description: '来源围栏账号',
    }
    Object.defineProperty(keyBody, 'key', {
      enumerable: true,
      get() {
        secretReads += 1
        if (secretReads === 3) {
          originUpdating = withMcpWorkspaceMutation(workspace, async () => {
            await originUpdateMayRun
            return call(handlers.get('PUT /api/mcp/servers/:id'), {
              params: { id: 'buda' },
              body: { url: 'https://attacker.example/mcp' },
            })
          })
        }
        return secret
      },
    })

    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const posting = call(handlers.get('POST /api/mcp/keys'), { body: keyBody })
      void posting.then(releaseOriginOnce, releaseOriginOnce)
      releaseTimer = setTimeout(releaseOriginOnce, 100)
      const postResponse = await posting
      const originResponse = await originUpdating

      expect(postResponse.statusCode).toBe(201)
      expect(JSON.stringify(postResponse.body)).not.toContain(secret)
      expect(originResponse?.statusCode).toBe(409)
      expect(originResponse?.body.error_code).toBe('MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL')
      expect((await readMcpServers(workspace))[0]?.url).toBe(BUDA_MCP_SERVER_TEMPLATE.url)
      expect((await readMcpKeys(workspace))[0]).toMatchObject({ mcp_server_id: 'buda', key: secret })
      expect(invalidatedServers).toEqual([])
    } finally {
      if (releaseTimer) clearTimeout(releaseTimer)
      releaseOriginOnce()
      if (originUpdating) await originUpdating
    }
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

  test('returns 404 without scanning references when deleting missing records', async () => {
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
    expect(missingServer).toMatchObject({ statusCode: 404, body: { error: 'MCP Server 不存在' } })
    expect(missingKey).toMatchObject({ statusCode: 404, body: { error: 'MCP Key 不存在' } })
    expect(referenceChecks).toBe(0)
  })

  test('reads and converts a deletable Server ID inside the coordinator', async () => {
    const workspace = await temporaryWorkspace()
    const serverId = 'scoped-server'
    await writeMcpServers(workspace, [{
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: serverId,
      display_name: 'Scoped Server',
    }])
    const referenceTargets: Array<{ serverId?: string; keyId?: number }> = []
    const invalidated: string[] = []
    const { app, handlers } = createRouteHarness()
    registerMcpRoutes(app, () => workspace, {
      invalidateServer: async (id: string) => { invalidated.push(id) },
    } as any, {
      findProjectReferences: async (activeWorkspace, target) => {
        assertMcpWorkspaceMutationHeld(activeWorkspace)
        referenceTargets.push(target)
        return []
      },
    })
    const scopedId = {
      [Symbol.toPrimitive]() {
        assertMcpWorkspaceMutationHeld(workspace)
        return serverId
      },
    }
    const scopedParams: Record<string, unknown> = {}
    Object.defineProperty(scopedParams, 'id', {
      enumerable: true,
      get() {
        assertMcpWorkspaceMutationHeld(workspace)
        return scopedId
      },
    })

    const response = await call(handlers.get('DELETE /api/mcp/servers/:id'), { params: scopedParams })

    expect(response.statusCode).toBe(200)
    expect(referenceTargets).toEqual([{ serverId }])
    expect(invalidated).toEqual([serverId])
    expect((await readMcpServers(workspace).then(servers => servers.map(server => server.id)))).toEqual([])
  })

  test('parses and rejects invalid Key delete IDs inside the coordinator without scanning references', async () => {
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
    const scopedParams: Record<string, unknown> = {}
    const scopedInvalidId = {
      [Symbol.toPrimitive]() {
        assertMcpWorkspaceMutationHeld(workspace)
        return '0'
      },
    }
    Object.defineProperty(scopedParams, 'id', {
      enumerable: true,
      get() {
        assertMcpWorkspaceMutationHeld(workspace)
        return scopedInvalidId
      },
    })

    const responses = await Promise.all([
      call(handlers.get('DELETE /api/mcp/keys/:id'), { params: { id: 'not-a-number' } }),
      call(handlers.get('DELETE /api/mcp/keys/:id'), { params: scopedParams }),
      call(handlers.get('DELETE /api/mcp/keys/:id'), { params: { id: '-1' } }),
      call(handlers.get('DELETE /api/mcp/keys/:id'), { params: { id: '1.5' } }),
    ])

    expect(responses.map(response => response.statusCode)).toEqual([400, 400, 400, 400])
    for (const response of responses) expect(response.body.error).toBe('MCP Key ID 无效')
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
