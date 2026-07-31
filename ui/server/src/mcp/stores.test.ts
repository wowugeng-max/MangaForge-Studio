import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, open, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { McpError } from './errors'
import { readJsonArrayFailClosed } from './atomic-json-store'
import {
  createMcpKey,
  deleteMcpKey,
  readMcpKeys,
  toPublicMcpKey,
  updateMcpKey,
  writeMcpKeys,
} from './key-store'
import { McpAgentLeaseRegistry } from './agent-lease'
import { upsertMcpAgentQuarantine } from './quarantine-store'
import {
  BUDA_MCP_SERVER_TEMPLATE,
  deleteMcpServer,
  normalizeMcpServer,
  readMcpServers,
  upsertMcpServer,
  writeMcpServers,
} from './server-store'

const workspaces: string[] = []

async function temporaryWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-store-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('MCP server store', () => {
  test('normalizes the built-in Buda Streamable HTTP defaults', () => {
    expect(normalizeMcpServer({ id: 'buda' })).toEqual(BUDA_MCP_SERVER_TEMPLATE)
    expect(BUDA_MCP_SERVER_TEMPLATE).toMatchObject({
      id: 'buda',
      transport: 'streamable_http',
      url: 'https://buda.im/api/mcp',
      auth_type: 'bearer',
      adapter_id: 'buda',
      startup_timeout_ms: 15_000,
      tool_timeout_ms: 60_000,
      generation_timeout_ms: 600_000,
      poll_initial_ms: 1_000,
      poll_max_ms: 5_000,
    })
  })

  test('stores server records inside the selected workspace', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])

    expect(await readMcpServers(workspace)).toEqual([BUDA_MCP_SERVER_TEMPLATE])
    expect(JSON.parse(await readFile(join(workspace, 'mcp-servers.json'), 'utf8'))).toHaveLength(1)
  })

  test('preserves all concurrent server upserts', async () => {
    const workspace = await temporaryWorkspace()
    await Promise.all(Array.from({ length: 12 }, (_, index) => upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'server-' + index,
      display_name: 'Server ' + index,
    })))
    expect(await readMcpServers(workspace)).toHaveLength(12)
  })

  test('fences active Server identity mutations but allows metadata and unrelated Servers', async () => {
    const workspace = await temporaryWorkspace()
    const otherServer = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'buda-other',
      display_name: 'Buda Other',
      url: 'https://other.buda.im/api/mcp',
    }
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE, otherServer])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_server', description: '账号',
    })
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: key.id, agentId: 'agent-1' })

    try {
      await expect(upsertMcpServer(workspace, {
        ...BUDA_MCP_SERVER_TEMPLATE,
        display_name: 'Buda Display Renamed',
        generation_timeout_ms: 700_000,
      })).resolves.toMatchObject({ display_name: 'Buda Display Renamed', generation_timeout_ms: 700_000 })
      await expect(upsertMcpServer(workspace, {
        ...BUDA_MCP_SERVER_TEMPLATE,
        display_name: 'Buda Display Renamed',
        generation_timeout_ms: 700_000,
        url: 'https://buda.im/api/mcp/v2',
      })).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(writeMcpServers(workspace, [
        {
          ...BUDA_MCP_SERVER_TEMPLATE,
          display_name: 'Buda Display Renamed',
          generation_timeout_ms: 700_000,
          custom_headers: { 'X-Space': 'rotated-header' },
        },
        otherServer,
      ])).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(deleteMcpServer(workspace, 'buda')).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(upsertMcpServer(workspace, {
        ...otherServer,
        custom_headers: { 'X-Other': 'isolated-header' },
      })).resolves.toMatchObject({ custom_headers: { 'X-Other': 'isolated-header' } })
    } finally {
      await lease.release()
    }
  })

  test('fences quarantined Server identity mutations but allows metadata and unrelated Servers', async () => {
    const workspace = await temporaryWorkspace()
    const otherServer = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'buda-other',
      display_name: 'Buda Other',
      url: 'https://other.buda.im/api/mcp',
    }
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE, otherServer])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_server', description: '账号',
    })
    await upsertMcpAgentQuarantine(workspace, {
      serverId: 'buda', keyId: key.id, agentId: 'agent-1',
      requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown',
    })

    await expect(upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      display_name: 'Safe Metadata',
      tool_timeout_ms: 61_000,
    })).resolves.toMatchObject({ display_name: 'Safe Metadata', tool_timeout_ms: 61_000 })
    await expect(upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      display_name: 'Safe Metadata',
      tool_timeout_ms: 61_000,
      enabled_tools: ['rotated-tool'],
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(deleteMcpServer(workspace, 'buda')).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(upsertMcpServer(workspace, {
      ...otherServer,
      custom_headers: { 'X-Other': 'isolated-header' },
    })).resolves.toMatchObject({ custom_headers: { 'X-Other': 'isolated-header' } })
  })
})

describe('MCP key store', () => {
  test('allocates workspace-local numeric IDs and never exposes a raw secret', async () => {
    const workspace = await temporaryWorkspace()
    const first = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_1234567890',
      description: '账号一',
    })
    const second = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_abcdefghij',
      description: '账号二',
    })

    expect([first.id, second.id]).toEqual([1, 2])
    expect(toPublicMcpKey(first)).toEqual(expect.objectContaining({
      id: 1,
      masked_key: 'sk_1***7890',
      has_key: true,
    }))
    expect(toPublicMcpKey(first)).not.toHaveProperty('key')
  })

  test('keeps the previous secret when an update omits key and overwrites it when supplied', async () => {
    const workspace = await temporaryWorkspace()
    const created = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_original',
      description: '初始账号',
    })

    await updateMcpKey(workspace, created.id, { description: '改名账号' })
    expect((await readMcpKeys(workspace))[0]).toMatchObject({ key: 'sk_original', description: '改名账号' })

    await updateMcpKey(workspace, created.id, { key: '   ' })
    expect((await readMcpKeys(workspace))[0]?.key).toBe('sk_original')

    await updateMcpKey(workspace, created.id, { key: 'sk_replaced' })
    expect((await readMcpKeys(workspace))[0]?.key).toBe('sk_replaced')
  })

  test('serializes concurrent key allocation without duplicate IDs or lost records', async () => {
    const workspace = await temporaryWorkspace()
    const created = await Promise.all(Array.from({ length: 20 }, (_, index) => createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_concurrent_' + index,
      description: '账号' + index,
    })))
    expect(new Set(created.map(item => item.id)).size).toBe(20)
    expect(await readMcpKeys(workspace)).toHaveLength(20)
  })

  test('fences active Key identity mutations but allows health metadata and unrelated Keys', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [
      BUDA_MCP_SERVER_TEMPLATE,
      { ...BUDA_MCP_SERVER_TEMPLATE, id: 'buda-other', display_name: 'Buda Other' },
    ])
    const target = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_target', description: '目标账号',
    })
    const other = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_other', description: '其他账号',
    })
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: target.id, agentId: 'agent-1' })

    try {
      await expect(updateMcpKey(workspace, target.id, {
        description: '健康字段可写', success_count: 7, last_checked: '2026-07-31T00:00:00.000Z',
      })).resolves.toMatchObject({ description: '健康字段可写', success_count: 7 })
      await expect(updateMcpKey(workspace, target.id, { key: 'sk_rotated_target' }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, target.id, { mcp_server_id: 'buda-other' }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, target.id, { is_active: false }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      const keys = await readMcpKeys(workspace)
      await expect(writeMcpKeys(workspace, keys.map(item => item.id === target.id
        ? { ...item, key: 'sk_bulk_rotated_target' }
        : item))).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(deleteMcpKey(workspace, target.id)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, other.id, { key: 'sk_isolated_other' }))
        .resolves.toMatchObject({ key: 'sk_isolated_other' })
    } finally {
      await lease.release()
    }
  })

  test('fences quarantined Key identity mutations but allows health metadata and unrelated Keys', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const target = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_target', description: '目标账号',
    })
    const other = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_other', description: '其他账号',
    })
    await upsertMcpAgentQuarantine(workspace, {
      serverId: 'buda', keyId: target.id, agentId: 'agent-1',
      requestId: 'request-1', sessionId: 'session-1', reason: 'remote_cancel_unknown',
    })

    await expect(updateMcpKey(workspace, target.id, {
      priority: 9, failure_count: 3, avg_latency: 18,
    })).resolves.toMatchObject({ priority: 9, failure_count: 3, avg_latency: 18 })
    await expect(updateMcpKey(workspace, target.id, { key: 'sk_rotated_target' }))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(deleteMcpKey(workspace, target.id)).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(updateMcpKey(workspace, other.id, { key: 'sk_isolated_other' }))
      .resolves.toMatchObject({ key: 'sk_isolated_other' })
  })

  test('reports corrupt JSON and never replaces it with an empty collection', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeFile(path, '{broken', 'utf8')

    await expect(readMcpKeys(workspace)).rejects.toMatchObject({
      code: 'MCP_STORE_CORRUPT',
    } satisfies Partial<McpError>)
    await expect(createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_must_not_write',
      description: '不得覆盖',
    })).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await readFile(path, 'utf8')).toBe('{broken')
  })
})

describe('atomic JSON store resource bounds', () => {
  test('reads the bounded snapshot from one file descriptor and rejects maxBytes plus one', async () => {
    const workspace = await temporaryWorkspace()
    const visiblePath = join(workspace, 'visible.json')
    const expandedPath = join(workspace, 'expanded.json')
    await writeFile(visiblePath, '[]', 'utf8')
    await writeFile(expandedPath, `["${'x'.repeat(64)}"]`, 'utf8')

    await expect(readJsonArrayFailClosed(visiblePath, {
      maxBytes: 16,
      openFile: async () => open(expandedPath, 'r'),
    } as any)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })
})
