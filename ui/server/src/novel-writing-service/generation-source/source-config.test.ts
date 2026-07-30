import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelProject } from '../../novel'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import {
  normalizeProseGenerationSource,
  resolveProseGenerationSource,
  validateMcpProjectBinding,
} from './source-config'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

describe('prose generation source config', () => {
  test('defaults legacy projects to the model source without migration', () => {
    expect(resolveProseGenerationSource({ reference_config: {} })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })
  })

  test('normalizes a complete MCP binding and rejects partial bindings', () => {
    expect(normalizeProseGenerationSource({
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    })
    expect(() => normalizeProseGenerationSource({ type: 'mcp', mcp: { server_id: 'buda' } }))
      .toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
  })

  test('validates active credentials, a live Agent, and tuple uniqueness', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-binding-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_binding', description: '账号' })
    const first = await createNovelProject(workspace, {
      title: '已绑定项目',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const second = await createNovelProject(workspace, { title: '待绑定项目', reference_config: {} })
    const runtime = { listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }, { id: 'agent-2', name: '正文 Agent 2' }] }

    await expect(validateMcpProjectBinding(workspace, second, {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1',
    }, { runtime: runtime as any })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

    await expect(validateMcpProjectBinding(workspace, second, {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-2',
    }, { runtime: runtime as any })).resolves.toEqual(expect.objectContaining({
      agent: expect.objectContaining({ id: 'agent-2' }),
    }))

    await expect(validateMcpProjectBinding(workspace, first, {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'missing',
    }, { runtime: runtime as any })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
  })
})
