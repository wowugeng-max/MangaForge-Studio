import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { McpError } from './errors'
import { McpGenerationDeadline } from './deadline'
import { createMcpKey, readMcpKeys, updateMcpKey } from './key-store'
import { createMcpRuntime } from './runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from './server-store'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

function connectionLostError() {
  return new McpError('MCP_CONNECTION_LOST', 'connection lost')
}

describe('MCP runtime', () => {
  test('pins Agent lease operations to the explicit workspace when the ambient workspace drifts', async () => {
    const firstWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-pinned-a-'))
    const secondWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-pinned-b-'))
    workspaces.push(firstWorkspace, secondWorkspace)
    let ambientWorkspace = firstWorkspace
    const runtime = createMcpRuntime(() => ambientWorkspace)

    ambientWorkspace = secondWorkspace
    const lease = await runtime.acquireAgentLease(firstWorkspace, { serverId: 'buda', keyId: 3, agentId: 'agent-1' })
    await lease.quarantine({ requestId: 'request-a', sessionId: 'session-a', reason: 'send_unknown' })
    await lease.release()

    expect(await runtime.listAgentQuarantines(firstWorkspace)).toHaveLength(1)
    expect(await runtime.listAgentQuarantines(secondWorkspace)).toEqual([])
  })

  test('owns durable Agent lease quarantine operations without opening a remote connection', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-agent-lease-'))
    workspaces.push(workspace)
    let connectionCalls = 0
    const manager = {
      get: async () => { connectionCalls += 1; throw new Error('must stay local') },
      invalidate: async () => {},
      invalidateIfCurrent: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const binding = { serverId: 'buda', keyId: 3, agentId: 'agent-1' }
    const runtime = createMcpRuntime(() => workspace, { manager: manager as any })
    const lease = await runtime.acquireAgentLease(workspace, binding)

    expect(await runtime.isAgentLeaseActive(workspace, binding)).toBe(true)
    await lease.quarantine({ requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown' })
    await lease.release()
    const records = await runtime.listAgentQuarantines(workspace)
    expect(records).toHaveLength(1)
    expect(connectionCalls).toBe(0)

    const rebuilt = createMcpRuntime(() => workspace, { manager: manager as any })
    await expect(rebuilt.acquireAgentLease(workspace, binding)).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(await rebuilt.clearAgentQuarantine(workspace, records[0]!.id)).toBe(true)
    await expect(rebuilt.acquireAgentLease(workspace, binding)).resolves.toBeDefined()
  })

  test('guards public quarantine clear while the owning runtime lease is active', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-clear-guard-'))
    workspaces.push(workspace)
    const runtime = createMcpRuntime(() => workspace)
    const binding = { serverId: 'buda', keyId: 3, agentId: 'agent-1' }
    const lease = await runtime.acquireAgentLease(workspace, binding)
    await lease.stageSessionFence({ requestId: 'request-guard', sessionId: 'session-guard' })
    const [record] = await runtime.listAgentQuarantines(workspace)

    await expect(runtime.clearAgentQuarantine(workspace, record!.id))
      .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    expect(await runtime.listAgentQuarantines(workspace)).toHaveLength(1)
    await lease.release()
    expect(await runtime.clearAgentQuarantine(workspace, record!.id)).toBe(true)
  })

  test('resolves credential configuration locally without starting a connection', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-config-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime_config', description: '账号' })
    let connectionCalls = 0
    const runtime = createMcpRuntime(() => workspace, {
      manager: {
        get: async () => { connectionCalls += 1; throw new Error('must stay local') },
        invalidate: async () => {},
        invalidateIfCurrent: async () => {},
        invalidateServer: async () => {},
        closeAll: async () => {},
      } as any,
    })

    const resolved = await runtime.resolveCredentialConfig(key.id, BUDA_MCP_SERVER_TEMPLATE.id)

    expect(resolved.server).toMatchObject({ id: 'buda', generation_timeout_ms: 600_000 })
    expect(resolved.key).toMatchObject({ id: key.id, mcp_server_id: 'buda' })
    expect(connectionCalls).toBe(0)
  })

  test('passes operation options to connection and Agent discovery without changing credential identity', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-options-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const created = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime_options', description: '账号' })
    const pinned = await readMcpKeys(workspace)
    const signal = new AbortController().signal
    const connectionOptions: any[] = []
    const adapterOptions: any[] = []
    const client = { listTools: async () => [], callTool: async () => ({ content: [] }) }
    const runtime = createMcpRuntime(() => workspace, {
      manager: {
        get: async (_workspace: string, server: any, key: any, options: any) => {
          connectionOptions.push({ server, key, options })
          return client
        },
        invalidate: async () => {},
        invalidateIfCurrent: async () => {},
        invalidateServer: async () => {},
        closeAll: async () => {},
      } as any,
      adapterFactory: () => ({
        listAgents: async (options: any) => { adapterOptions.push(options); return [{ id: 'agent-1' }] },
      }) as any,
    })

    const options = { signal, timeoutMs: 321 }
    const resolved = await runtime.getAdapterForKey(
      created.id,
      BUDA_MCP_SERVER_TEMPLATE.id,
      options,
      { server: BUDA_MCP_SERVER_TEMPLATE, key: pinned[0]! },
    )
    await resolved.adapter.listAgents(options)
    await runtime.listAgents(created.id, options)

    expect(connectionOptions).toEqual([
      { server: BUDA_MCP_SERVER_TEMPLATE, key: pinned[0], options },
      { server: BUDA_MCP_SERVER_TEMPLATE, key: pinned[0], options },
    ])
    expect(adapterOptions).toEqual([options, options])
  })

  test('resolves an active Server and matching Key and records a safe key test receipt', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime', description: '账号' })
    const client = { diagnostics: () => ({ state: 'Ready' }), listTools: async () => [], callTool: async () => ({ content: [] }) }
    const manager = {
      get: async () => client,
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, {
      manager: manager as any,
      adapterFactory: () => ({ listAgents: async () => [{ id: 'a1' }] }) as any,
    })

    expect(await runtime.testKey(key.id)).toEqual(expect.objectContaining({ ok: true, agent_count: 1 }))
    expect((await readMcpKeys(workspace))[0]).toMatchObject({ success_count: 1, failure_count: 0, last_checked: expect.any(String) })
  })

  test('rejects inactive or mismatched credentials before connecting', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [{ ...BUDA_MCP_SERVER_TEMPLATE, is_active: false }])
    const key = await createMcpKey(workspace, { mcp_server_id: 'other', key: 'sk_runtime', description: '账号' })
    const runtime = createMcpRuntime(() => workspace)
    await expect(runtime.getAdapterForKey(key.id)).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
  })

  test('uses an explicitly pinned credential snapshot after the stored key rotates', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-pinned-'))
    workspaces.push(workspace)
    const initialKey = 'credential-before-runtime-rotation'
    const rotatedKey = 'credential-after-runtime-rotation'
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const created = await createMcpKey(workspace, { mcp_server_id: 'buda', key: initialKey, description: '账号' })
    const pinnedKey = (await readMcpKeys(workspace)).find(item => item.id === created.id)!
    await updateMcpKey(workspace, created.id, { key: rotatedKey })
    let connectedKey = ''
    const client = { listTools: async () => [], callTool: async () => ({ content: [] }) }
    const manager = {
      get: async (_workspace: string, _server: any, key: any) => {
        connectedKey = key.key
        return client
      },
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, {
      manager: manager as any,
      adapterFactory: () => ({ listAgents: async () => [] }) as any,
    })

    const resolved = await runtime.getAdapterForKey(
      created.id,
      BUDA_MCP_SERVER_TEMPLATE.id,
      undefined,
      { server: BUDA_MCP_SERVER_TEMPLATE, key: pinnedKey },
    )

    expect(connectedKey).toBe(initialKey)
    expect(resolved.key.key).toBe(initialKey)
  })

  test('reconnects once and replays a read-safe call after connection loss', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-read-recovery-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime', description: '账号' })
    let firstCalls = 0
    let secondCalls = 0
    const connectionLost = connectionLostError()
    const firstClient = {
      listTools: async () => [],
      async callTool() {
        firstCalls += 1
        throw connectionLost
      },
    }
    const secondClient = {
      listTools: async () => [],
      async callTool() {
        secondCalls += 1
        return { content: [{ type: 'text', text: 'ok' }] }
      },
    }
    let current = firstClient
    const invalidated: unknown[] = []
    const manager = {
      get: async () => current,
      async invalidateIfCurrent(_workspace: string, _serverId: string, _keyId: number, client: unknown) {
        invalidated.push(client)
        if (current === client) current = secondClient as typeof firstClient
      },
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, {
      manager: manager as any,
      adapterFactory: () => ({ listAgents: async () => [] }) as any,
    })

    const resolved = await runtime.getAdapterForKey(key.id)
    const result = await resolved.client.callTool('read', {}, { operation: 'read_safe' })

    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] })
    expect(firstCalls + secondCalls).toBe(2)
    expect(firstCalls).toBe(1)
    expect(secondCalls).toBe(1)
    expect(invalidated).toEqual([firstClient])
  })

  test('reconnects once when the read-safe tool list loses its connection', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-list-recovery-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime', description: '账号' })
    let firstCalls = 0
    let secondCalls = 0
    const firstClient = {
      async listTools() {
        firstCalls += 1
        throw connectionLostError()
      },
      callTool: async () => ({ content: [] }),
    }
    const secondClient = {
      async listTools() {
        secondCalls += 1
        return [{ name: 'read' }]
      },
      callTool: async () => ({ content: [] }),
    }
    let current: typeof firstClient | typeof secondClient = firstClient
    const invalidated: unknown[] = []
    const manager = {
      get: async () => current,
      async invalidateIfCurrent(_workspace: string, _serverId: string, _keyId: number, client: unknown) {
        invalidated.push(client)
        if (current === client) current = secondClient
      },
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, {
      manager: manager as any,
      adapterFactory: () => ({ listAgents: async () => [] }) as any,
    })

    const resolved = await runtime.getAdapterForKey(key.id)
    expect(await resolved.client.listTools({})).toEqual([{ name: 'read' }])
    expect(firstCalls + secondCalls).toBe(2)
    expect(invalidated).toEqual([firstClient])
  })

  test('invalidates but never replays a mutation after connection loss', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-mutation-recovery-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_runtime', description: '账号' })
    let calls = 0
    const connectionLost = connectionLostError()
    const client = {
      listTools: async () => [],
      async callTool() {
        calls += 1
        throw connectionLost
      },
    }
    const invalidated: unknown[] = []
    const manager = {
      get: async () => client,
      async invalidateIfCurrent(_workspace: string, _serverId: string, _keyId: number, current: unknown) {
        invalidated.push(current)
      },
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, {
      manager: manager as any,
      adapterFactory: () => ({ listAgents: async () => [] }) as any,
    })

    const resolved = await runtime.getAdapterForKey(key.id)
    await expect(resolved.client.callTool('write', {}, { operation: 'mutation' }))
      .rejects.toMatchObject({ code: 'MCP_CONNECTION_LOST' })

    expect(calls).toBe(1)
    expect(invalidated).toEqual([client])
  })

  test('recovers one cleanup read after connection loss without replaying the cancel mutation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-cleanup-recovery-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, poll_initial_ms: 1, poll_max_ms: 2 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id, key: 'sk_runtime_cleanup', description: '账号',
    })
    const toolNames = [
      'apiClaw.listApiAgents',
      'apiClaw.createApiAgent',
      'apiClaw.listApiAgentDriveFiles',
      'apiClaw.upsertApiAgentDriveFile',
      'apiClaw.apiAgentDriveText',
      'apiClaw.createApiAgentSession',
      'apiClaw.getApiAgentSession',
      'apiClaw.postApiAgentSessionMessage',
      'apiClaw.cancelApiAgentSessionRun',
    ]
    const structured = (data: Record<string, unknown>) => ({ content: [], structuredContent: data })
    const remote = new Map<string, string>()
    const caller = new AbortController()
    const deadline = new McpGenerationDeadline(60_000, caller.signal, {
      now: Date.now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    let sends = 0
    let cancelMutations = 0
    let businessReads = 0
    let firstCleanupReads = 0
    let recoveredCleanupReads = 0
    const firstClient = {
      listTools: async () => toolNames.map(name => ({ name, inputSchema: { type: 'object' } })),
      async callTool(name: string, args: any, options: any) {
        if (name.endsWith('listApiAgentDriveFiles')) {
          return structured({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name.endsWith('upsertApiAgentDriveFile')) {
          remote.set(args.path, args.content)
          return structured({ ok: true })
        }
        if (name.endsWith('apiAgentDriveText')) return structured({ content: remote.get(args.filePath) || '' })
        if (name.endsWith('createApiAgentSession')) {
          return structured({ session: { id: 'session-cleanup', status: 'pending' }, run: { started: false } })
        }
        if (name.endsWith('postApiAgentSessionMessage')) {
          sends += 1
          return structured({ session: { id: 'session-cleanup' }, run: { started: true } })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) {
          cancelMutations += 1
          return structured({ ok: true, cancelled: false })
        }
        if (name.endsWith('getApiAgentSession')) {
          if (options.signal === deadline.signal) {
            businessReads += 1
            caller.abort()
            return structured({
              session: { id: 'session-cleanup', status: 'in_progress' },
              run: { status: 'in_progress' },
              messages: [],
            })
          }
          firstCleanupReads += 1
          throw connectionLostError()
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    const secondClient = {
      listTools: firstClient.listTools,
      async callTool(name: string) {
        if (!name.endsWith('getApiAgentSession')) throw new Error(`unexpected recovered tool ${name}`)
        recoveredCleanupReads += 1
        return structured({
          session: { id: 'session-cleanup', status: 'cancelled' },
          run: { status: 'cancelled' },
          messages: [],
        })
      },
    }
    let current: typeof firstClient | typeof secondClient = firstClient
    const invalidated: unknown[] = []
    const manager = {
      get: async () => current,
      async invalidateIfCurrent(_workspace: string, _serverId: string, _keyId: number, client: unknown) {
        invalidated.push(client)
        if (current === client) current = secondClient
      },
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
    }
    const runtime = createMcpRuntime(() => workspace, { manager: manager as any })
    const resolved = await runtime.getAdapterForKey(key.id)

    const caught = await resolved.adapter.generateProse({
      activeWorkspace: workspace,
      server,
      keyId: key.id,
      agentId: 'agent-1',
      requestId: 'request-cleanup',
      project: { id: 8, title: '清理恢复' },
      chapter: { id: 22, chapter_no: 12, title: '雨夜' },
      chapterNo: 12,
      paragraphTask: '完整段落任务。',
      promptDiagnostics: { prompt_chars: 7 },
      drive: {
        writingBible: '# 圣经', storyState: {}, continuity: '连续性', recentChapters: '第11章摘要',
      },
      deadline,
      signal: deadline.signal,
    } as any).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_CANCELLED',
      details: { session_id: 'session-cleanup', remote_cancel_confirmed: true },
    })
    expect(sends).toBe(1)
    expect(cancelMutations).toBe(1)
    expect(businessReads).toBe(1)
    expect(firstCleanupReads).toBe(1)
    expect(recoveredCleanupReads).toBe(1)
    expect(invalidated).toEqual([firstClient])
  })
})
