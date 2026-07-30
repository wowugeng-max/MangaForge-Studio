import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, readMcpKeys } from './key-store'
import { createMcpRuntime } from './runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from './server-store'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

describe('MCP runtime', () => {
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
})
