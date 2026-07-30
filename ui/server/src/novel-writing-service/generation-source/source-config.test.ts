import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelProject } from '../../novel'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import {
  normalizeProseGenerationSource,
  proseGenerationSourceFingerprint,
  resolveProseGenerationSource,
  validateMcpProjectBinding,
} from './source-config'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

describe('prose generation source config', () => {
  test('defaults only when the source field is absent and rejects malformed present values', () => {
    expect(resolveProseGenerationSource({})).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })
    expect(resolveProseGenerationSource({ reference_config: {} })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })
    const inherited = Object.create({ prose_generation_source: {} })
    expect(resolveProseGenerationSource({ reference_config: inherited })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })

    for (const stored of [
      {},
      { type: 'model' },
      { version: 'wrong', type: 'model' },
      { version: 'prose_generation_source_v1' },
      { version: 'prose_generation_source_v1', type: 'unknown' },
      { version: 'prose_generation_source_v1', type: 'mcp', mcp: { server_id: 'buda' } },
    ]) {
      expect(() => resolveProseGenerationSource({
        reference_config: { prose_generation_source: stored },
      })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    }
  })

  test('rejects present non-object source values', () => {
    for (const stored of [undefined, null, [], 'model', 1, true]) {
      expect(() => resolveProseGenerationSource({
        reference_config: { prose_generation_source: stored },
      })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    }
  })

  test('requires exact version and type values and accepts an explicit model record', () => {
    expect(normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'model',
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })

    for (const source of [
      { version: 'PROSE_GENERATION_SOURCE_V1', type: 'model' },
      { version: 'prose_generation_source_v1', type: 'MODEL' },
      { version: 'prose_generation_source_v1', type: 1 },
      { version: 1, type: 'model' },
    ]) {
      expect(() => normalizeProseGenerationSource(source))
        .toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    }
  })

  test('normalizes a complete MCP binding and rejects partial bindings', () => {
    expect(normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    })
    expect(() => normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda' },
    }))
      .toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
  })

  test('computes a stable canonical fingerprint from every binding identity field', () => {
    const rawKey = 'synthetic-sensitive-value'
    const source = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        key: rawKey,
      },
    })
    if (source.type !== 'mcp') throw new Error('expected MCP source')

    const fingerprint = proseGenerationSourceFingerprint(source)
    expect(fingerprint).toBe(proseGenerationSourceFingerprint(structuredClone(source)))
    expect(fingerprint).not.toContain(rawKey)

    for (const mcp of [
      { ...source.mcp, server_id: 'other' },
      { ...source.mcp, key_id: 4 },
      { ...source.mcp, adapter_id: 'other' },
      { ...source.mcp, agent_id: 'agent-2' },
    ]) {
      expect(proseGenerationSourceFingerprint({ ...source, mcp })).not.toBe(fingerprint)
    }
  })

  test('computes a stable model fingerprint distinct from MCP bindings', () => {
    const model = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'model',
    })
    const mcp = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    })
    expect(proseGenerationSourceFingerprint(model)).toBe(
      proseGenerationSourceFingerprint(structuredClone(model)),
    )
    expect(proseGenerationSourceFingerprint(model)).not.toBe(proseGenerationSourceFingerprint(mcp))
  })

  test('distinguishes MCP identity fields containing the fingerprint delimiter', () => {
    const first = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'adapter\u0000agent',
        agent_id: 'tail',
      },
    })
    const second = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'adapter',
        agent_id: 'agent\u0000tail',
      },
    })

    expect(first).not.toEqual(second)
    expect(proseGenerationSourceFingerprint(first)).not.toBe(proseGenerationSourceFingerprint(second))
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
