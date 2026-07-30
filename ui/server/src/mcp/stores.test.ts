import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
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
})
