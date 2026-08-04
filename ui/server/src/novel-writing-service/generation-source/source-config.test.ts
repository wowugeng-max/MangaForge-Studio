import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelProject } from '../../novel'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import * as sourceConfig from './source-config'
import {
  CHAPTER_GENERATION_SOURCE_VERSION,
  chapterGenerationSourceFingerprint,
  normalizeMcpProjectBinding,
  normalizeChapterGenerationSource,
  normalizeProseGenerationSource,
  proseGenerationSourceFingerprint,
  retainedMcpProjectBinding,
  resolveChapterGenerationSource,
  resolveProseGenerationSource,
  toLegacyProseGenerationSource,
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
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '' },
    })
    expect(normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        model: '  model-x  ',
      },
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: 'model-x' },
    })
    expect(() => normalizeMcpProjectBinding({
      server_id: 'buda',
      key_id: 3,
      adapter_id: 'buda',
      agent_id: 'agent-1',
      model: 'x'.repeat(161),
    })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    expect(() => normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda' },
    }))
      .toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
  })

  test('computes a stable opaque bounded fingerprint from every binding identity field', () => {
    const rawKey = 'synthetic-sensitive-value'
    const headerLikeIdentity = 'synthetic-generation-header-value'
    const source = normalizeProseGenerationSource({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: headerLikeIdentity,
        key: rawKey,
      },
    })
    if (source.type !== 'mcp') throw new Error('expected MCP source')

    const fingerprint = proseGenerationSourceFingerprint(source)
    expect(fingerprint).toBe(proseGenerationSourceFingerprint(structuredClone(source)))
    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(fingerprint).toHaveLength(71)
    for (const identity of [source.version, source.type, source.mcp.server_id, source.mcp.adapter_id, source.mcp.agent_id, rawKey]) {
      expect(fingerprint).not.toContain(identity)
    }

    for (const mcp of [
      { ...source.mcp, server_id: 'other' },
      { ...source.mcp, key_id: 4 },
      { ...source.mcp, adapter_id: 'other' },
      { ...source.mcp, agent_id: 'agent-2' },
      { ...source.mcp, model: 'model-x' },
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

  test('fingerprints a historical binding identically before and after normalization', () => {
    const historical = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    expect(proseGenerationSourceFingerprint(historical as any)).toBe(
      proseGenerationSourceFingerprint(normalizeProseGenerationSource(historical)),
    )
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
    }, { runtime: runtime as any })).rejects.toMatchObject({
      code: 'MCP_BINDING_INVALID',
      details: { reason: 'binding_conflict' },
    })

    await expect(validateMcpProjectBinding(workspace, second, {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-2',
    }, { runtime: runtime as any })).resolves.toEqual(expect.objectContaining({
      agent: expect.objectContaining({ id: 'agent-2' }),
    }))

    await expect(validateMcpProjectBinding(workspace, first, {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'missing',
    }, { runtime: runtime as any })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
  })

  test('keeps an inactive retained MCP tuple exclusive while ignoring malformed projects', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-retained-mcp-ownership-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_retained', description: '账号' })
    const first = await createNovelProject(workspace, {
      title: '保留未启用 MCP 的项目',
      reference_config: {
        chapter_generation_source: {
          version: CHAPTER_GENERATION_SOURCE_VERSION,
          active: 'model',
          model: { model_id: 217 },
          mcp: {
            server_id: 'buda',
            key_id: key.id,
            adapter_id: 'buda',
            agent_id: 'agent-1',
            model: '',
          },
        },
      },
    })
    await createNovelProject(workspace, {
      title: '损坏来源记录',
      reference_config: { chapter_generation_source: { version: 'broken' } },
    })
    const second = await createNovelProject(workspace, { title: '待绑定项目', reference_config: {} })
    const runtime = {
      listAgents: async () => [
        { id: 'agent-1', name: '正文 Agent' },
        { id: 'agent-2', name: '正文 Agent 2' },
      ],
    }
    const retainedBinding = {
      server_id: 'buda',
      key_id: key.id,
      adapter_id: 'buda',
      agent_id: 'agent-1',
      model: '',
    }

    await expect(validateMcpProjectBinding(workspace, second, retainedBinding, {
      runtime: runtime as any,
    })).rejects.toMatchObject({
      code: 'MCP_BINDING_INVALID',
      details: { reason: 'binding_conflict', project_id: first.id },
    })

    await expect(validateMcpProjectBinding(workspace, second, {
      ...retainedBinding,
      agent_id: 'agent-2',
    }, { runtime: runtime as any })).resolves.toEqual(expect.objectContaining({
      binding: expect.objectContaining({ agent_id: 'agent-2' }),
    }))

    await expect(validateMcpProjectBinding(workspace, first, retainedBinding, {
      runtime: runtime as any,
    })).resolves.toEqual(expect.objectContaining({
      binding: retainedBinding,
    }))
  })

  test('fails closed when ownership scanning raises a non-validation error', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-ownership-scan-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_scan', description: '账号' })
    const scanFailure = new Error('synthetic ownership storage failure')
    const inaccessibleProject = { id: 99, title: '不可读项目' }
    Object.defineProperty(inaccessibleProject, 'reference_config', {
      get() {
        throw scanFailure
      },
    })

    await expect(validateMcpProjectBinding(workspace, { id: 1 }, {
      server_id: 'buda',
      key_id: key.id,
      adapter_id: 'buda',
      agent_id: 'agent-1',
      model: '',
    }, {
      runtime: { listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }] } as any,
      listProjects: async () => [inaccessibleProject] as any,
    })).rejects.toBe(scanFailure)
  })

  test('separates local credential and ownership checks from remote Agent validation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-validation-phases-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_validation_phases', description: '账号',
    })
    const project = await createNovelProject(workspace, { title: '两阶段校验', reference_config: {} })
    const candidate = {
      server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1', model: '',
    }
    let projectScans = 0
    const validateLocal = (sourceConfig as any).validateMcpProjectBindingLocally
    const validateRemote = (sourceConfig as any).validateMcpProjectBindingAgent
    expect(validateLocal).toBeFunction()
    expect(validateRemote).toBeFunction()

    const local = await validateLocal(workspace, project, candidate, {
      listProjects: async () => {
        projectScans += 1
        return [project]
      },
    })
    expect(projectScans).toBe(1)

    let remoteCalls = 0
    const validation = await validateRemote(local, {
      runtime: {
        listAgents: async () => {
          remoteCalls += 1
          return [{ id: 'agent-1', name: '正文 Agent' }]
        },
      },
      timeoutMs: 1234,
    })
    expect(remoteCalls).toBe(1)
    expect(projectScans).toBe(1)
    expect(validation).toMatchObject({
      binding: candidate,
      server: { id: 'buda' },
      key: { id: key.id },
      agent: { id: 'agent-1' },
    })
  })
})

describe('retained chapter generation source state', () => {
  const mcp = {
    server_id: 'buda',
    key_id: 3,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: 'buda-model',
  }

  test('read-only migrates missing and legacy model source records', () => {
    const missing = { reference_config: { untouched: true } }
    const legacy = {
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'model',
        },
      },
    }
    const missingBefore = structuredClone(missing)
    const legacyBefore = structuredClone(legacy)

    expect(resolveChapterGenerationSource(missing)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: {},
    })
    expect(resolveChapterGenerationSource(legacy)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: {},
    })
    expect(missing).toEqual(missingBefore)
    expect(legacy).toEqual(legacyBefore)
  })

  test('read-only migrates a legacy MCP source with its complete normalized binding', () => {
    const project = {
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { ...mcp, model: '  buda-model  ' },
        },
      },
    }
    const before = structuredClone(project)

    expect(resolveChapterGenerationSource(project)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp,
    })
    expect(project).toEqual(before)
  })

  test('keeps legacy prose MCP coercion while migrating its canonical binding', () => {
    const migrated = resolveChapterGenerationSource({
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            serverId: '  buda  ',
            keyId: '3',
            adapterId: '  buda  ',
            agentId: '  agent-1  ',
            model: 217,
          },
        },
      },
    })
    expect(migrated).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        model: '217',
      },
    })
    expect(chapterGenerationSourceFingerprint(migrated)).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(toLegacyProseGenerationSource(migrated)).toEqual({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: migrated.mcp,
    })
  })

  test('rejects a legacy MCP identity that cannot form canonical retained state', () => {
    expect(() => resolveChapterGenerationSource({
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            serverId: 'buda',
            keyId: String(Number.MAX_SAFE_INTEGER + 1),
            adapterId: 'buda',
            agentId: 'agent-1',
            model: '',
          },
        },
      },
    })).toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
  })

  test('prefers and strictly normalizes an own retained source record', () => {
    const project = {
      reference_config: {
        chapter_generation_source: {
          version: CHAPTER_GENERATION_SOURCE_VERSION,
          active: 'model',
          model: { model_id: 217 },
          mcp: { ...mcp, model: '  buda-model  ' },
        },
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { ...mcp, agent_id: 'legacy-agent' },
        },
      },
    }

    expect(resolveChapterGenerationSource(project)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: { model_id: 217 },
      mcp,
    })

    const inherited = Object.create({
      chapter_generation_source: {
        version: CHAPTER_GENERATION_SOURCE_VERSION,
        active: 'mcp',
        model: {},
        mcp,
      },
    })
    expect(resolveChapterGenerationSource({ reference_config: inherited })).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: {},
    })
  })

  test('retains inactive configuration while fingerprinting only the active model', () => {
    const state = normalizeChapterGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: { model_id: 217 },
      mcp,
    })

    expect(state).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: { model_id: 217 },
      mcp,
    })
    expect(chapterGenerationSourceFingerprint({
      ...state,
      mcp: { ...mcp, key_id: 4, agent_id: 'inactive-agent', model: 'inactive-model' },
    })).toBe(chapterGenerationSourceFingerprint(state))
    expect(chapterGenerationSourceFingerprint({
      ...state,
      model: { model_id: 218 },
    })).not.toBe(chapterGenerationSourceFingerprint(state))
  })

  test('fingerprints only the active MCP binding and ignores retained model configuration', () => {
    const state = normalizeChapterGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: { model_id: 217 },
      mcp,
    })
    const fingerprint = chapterGenerationSourceFingerprint(state)

    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(chapterGenerationSourceFingerprint({
      ...state,
      model: { model_id: 218 },
    })).toBe(fingerprint)
    for (const changedBinding of [
      { ...mcp, server_id: 'other' },
      { ...mcp, key_id: 4 },
      { ...mcp, adapter_id: 'other' },
      { ...mcp, agent_id: 'agent-2' },
      { ...mcp, model: 'other-model' },
    ]) {
      expect(chapterGenerationSourceFingerprint({
        ...state,
        mcp: changedBinding,
      })).not.toBe(fingerprint)
    }
  })

  test('converts retained state to the legacy prose source contract', () => {
    expect(toLegacyProseGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: { model_id: 217 },
      mcp,
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'model',
    })
    expect(toLegacyProseGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: { model_id: 217 },
      mcp,
    })).toEqual({
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp,
    })
  })

  test('rejects malformed retained source records', () => {
    for (const source of [
      undefined,
      null,
      [],
      'model',
      1,
      true,
      {},
      { version: 'wrong', active: 'model', model: {} },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'both', model: {} },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model' },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: null },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: [] },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: 1.5 } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: 0 } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: -1 } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: null } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: undefined } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: Number.NaN } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: Number.POSITIVE_INFINITY } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: Number.MAX_SAFE_INTEGER + 1 } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: { model_id: '217' } },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'mcp', model: {} },
      { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'mcp', model: {}, mcp: { server_id: 'buda' } },
    ]) {
      expect(() => normalizeChapterGenerationSource(source))
        .toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    }
  })

  test('requires own root fields and rejects an inherited model_id', () => {
    const valid = {
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: {},
    }
    for (const inheritedField of ['version', 'active', 'model'] as const) {
      const source = Object.create({ [inheritedField]: valid[inheritedField] })
      for (const field of ['version', 'active', 'model'] as const) {
        if (field !== inheritedField) source[field] = valid[field]
      }
      expect(() => normalizeChapterGenerationSource(source))
        .toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
    }

    expect(() => normalizeChapterGenerationSource({
      ...valid,
      model: Object.create({ model_id: 217 }),
    })).toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
  })

  test('strictly requires own snake_case MCP fields with primitive values', () => {
    const strictState = (binding: unknown) => ({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp: binding,
    })
    const validBinding = { ...mcp }

    for (const inheritedField of ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model'] as const) {
      const binding: Record<string, unknown> = Object.create({ [inheritedField]: validBinding[inheritedField] })
      for (const field of ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model'] as const) {
        if (field !== inheritedField) binding[field] = validBinding[field]
      }
      expect(() => normalizeChapterGenerationSource(strictState(binding)))
        .toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
    }

    for (const binding of [
      { serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent-1', model: 'buda-model' },
      { ...validBinding, server_id: null },
      { ...validBinding, server_id: undefined },
      { ...validBinding, server_id: 1 },
      { ...validBinding, server_id: { toString: () => 'buda' } },
      { ...validBinding, adapter_id: 1 },
      { ...validBinding, agent_id: 1 },
      { ...validBinding, model: 217 },
      { ...validBinding, key_id: '3' },
      { ...validBinding, key_id: null },
      { ...validBinding, key_id: undefined },
      { ...validBinding, key_id: 0 },
      { ...validBinding, key_id: -1 },
      { ...validBinding, key_id: 1.5 },
      { ...validBinding, key_id: Number.NaN },
      { ...validBinding, key_id: Number.POSITIVE_INFINITY },
      { ...validBinding, key_id: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      expect(() => normalizeChapterGenerationSource(strictState(binding)))
        .toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
    }
  })

  test('snapshots each retained field once before validation and normalization', () => {
    const reads: Record<string, number> = {}
    const counted = (target: object, field: string, value: unknown, label: string) => {
      Object.defineProperty(target, field, {
        enumerable: true,
        get() {
          reads[label] = (reads[label] || 0) + 1
          return value
        },
      })
    }
    const modelConfig = {}
    counted(modelConfig, 'model_id', 217, 'model.model_id')
    const mcpConfig = {}
    for (const field of ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model'] as const) {
      counted(mcpConfig, field, mcp[field], `mcp.${field}`)
    }
    const source = {}
    counted(source, 'version', CHAPTER_GENERATION_SOURCE_VERSION, 'version')
    counted(source, 'active', 'mcp', 'active')
    counted(source, 'model', modelConfig, 'model')
    counted(source, 'mcp', mcpConfig, 'mcp')

    expect(normalizeChapterGenerationSource(source)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: { model_id: 217 },
      mcp,
    })
    expect(reads).toEqual({
      version: 1,
      active: 1,
      model: 1,
      mcp: 1,
      'model.model_id': 1,
      'mcp.server_id': 1,
      'mcp.key_id': 1,
      'mcp.adapter_id': 1,
      'mcp.agent_id': 1,
      'mcp.model': 1,
    })
  })

  test('does not let changing getters escape validation or leak native errors', () => {
    let activeReads = 0
    const changingActive = {
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      get active() {
        activeReads += 1
        return activeReads === 1 ? 'model' : 'both'
      },
      model: {},
    }
    expect(normalizeChapterGenerationSource(changingActive)).toEqual({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      model: {},
    })
    expect(activeReads).toBe(1)

    const throwingModel = {
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'model',
      get model(): unknown {
        throw new TypeError('synthetic getter failure')
      },
    }
    expect(() => normalizeChapterGenerationSource(throwingModel))
      .toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))

    const throwingMcp = { ...mcp }
    Object.defineProperty(throwingMcp, 'server_id', {
      enumerable: true,
      get() {
        throw new TypeError('synthetic nested getter failure')
      },
    })
    expect(() => normalizeChapterGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp: throwingMcp,
    })).toThrow(expect.objectContaining({ name: 'McpError', code: 'MCP_BINDING_INVALID' }))
  })

  test('rejects malformed present retained records instead of falling back to legacy state', () => {
    for (const source of [undefined, null, [], {}, { version: 'wrong', active: 'model', model: {} }]) {
      expect(() => resolveChapterGenerationSource({
        reference_config: {
          chapter_generation_source: source,
          prose_generation_source: {
            version: 'prose_generation_source_v1',
            type: 'model',
          },
        },
      })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
    }
  })
})

describe('retained MCP project binding extraction', () => {
  const mcp = {
    server_id: 'generic-server',
    key_id: 7,
    adapter_id: 'generic-adapter',
    agent_id: 'agent-7',
    model: 'model-7',
  }
  const extract = (project: unknown) => retainedMcpProjectBinding(project)

  test('returns null when reference_config is missing or is not an object record', () => {
    const arrayConfig: any[] = []
    arrayConfig.chapter_generation_source = {
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp,
    }

    for (const project of [
      undefined,
      null,
      {},
      { reference_config: undefined },
      { reference_config: null },
      { reference_config: true },
      { reference_config: 1 },
      { reference_config: 'config' },
      { reference_config: arrayConfig },
    ]) {
      expect(extract(project)).toBeNull()
    }
  })

  test('returns a normalized retained MCP binding regardless of the active chapter source', () => {
    for (const active of ['model', 'mcp'] as const) {
      expect(extract({
        reference_config: {
          chapter_generation_source: {
            version: CHAPTER_GENERATION_SOURCE_VERSION,
            active,
            model: { model_id: 217 },
            mcp: { ...mcp, model: '  model-7  ' },
          },
        },
      })).toEqual(mcp)
    }
  })

  test('treats an explicit model-only chapter source as authoritative over legacy MCP', () => {
    expect(extract({
      reference_config: {
        chapter_generation_source: {
          version: CHAPTER_GENERATION_SOURCE_VERSION,
          active: 'model',
          model: { model_id: 217 },
        },
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp,
        },
      },
    })).toBeNull()
  })

  test('normalizes legacy MCP only when no explicit chapter source exists', () => {
    expect(extract({
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            serverId: '  generic-server  ',
            keyId: '7',
            adapterId: '  generic-adapter  ',
            agentId: '  agent-7  ',
            model: '  model-7  ',
          },
        },
      },
    })).toEqual(mcp)
    expect(extract({
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'model',
        },
      },
    })).toBeNull()
  })

  test('fails closed on malformed explicit chapter state instead of using legacy MCP', () => {
    expect(() => extract({
      reference_config: {
        chapter_generation_source: {
          version: CHAPTER_GENERATION_SOURCE_VERSION,
          active: 'model',
          model: null,
        },
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp,
        },
      },
    })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
  })
})
