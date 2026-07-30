import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { McpError } from './errors'
import {
  createMcpKey,
  readMcpKeys,
  toPublicMcpKey,
  updateMcpKey,
} from './key-store'
import {
  BUDA_MCP_SERVER_TEMPLATE,
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
