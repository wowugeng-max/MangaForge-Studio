import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdir, mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, updateMcpKey } from '../../mcp/key-store'
import { McpError } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import { BudaAdapter } from '../../mcp/adapters/buda-adapter'
import { McpAgentLeaseRegistry } from '../../mcp/agent-lease'
import {
  clearMcpAgentQuarantine,
  getMcpAgentQuarantinePath,
  readMcpAgentQuarantines,
  upsertMcpAgentQuarantine,
} from '../../mcp/quarantine-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { createNovelProject, listNovelRuns, updateNovelProject } from '../../novel'
import { chapterContextVersion, createGenerationSourceResolver } from './create-generation-source'
import { ChapterSourceLeaseRegistry } from './chapter-source-lease'
import { McpGenerationSource } from './mcp-generation-source'
import { ModelGenerationSource } from './model-generation-source'
import { attachProductionLease, takeProductionLease } from './production-lease'
import { chapterGenerationSourceFingerprint, proseGenerationSourceFingerprint } from './source-config'
import {
  acceptanceBindingFingerprintFromGenerationSource,
  CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
  type BeginChapterTaskInput,
  type ProseGenerationRequest,
  type ResolvedChapterTaskInput,
} from './types'

const workspace = '/workspace/a'
const project = {
  id: 5,
  title: '统一来源测试',
  reference_config: {
    chapter_generation_source: {
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: 217 },
    },
  },
}
const chapter = { id: 12, project_id: 5, chapter_no: 1, title: '第一章' }
const contextPackage = {
  writing_bible: { voice: '克制' },
  story_state: { current_place: '北城' },
  continuity: { previous_chapter: null },
}

function beginInput(overrides: Partial<BeginChapterTaskInput> = {}): BeginChapterTaskInput {
  return {
    activeWorkspace: workspace,
    project,
    chapter,
    contextPackage,
    requestedModelId: 217,
    options: {},
    ...overrides,
  }
}

function draftRequest(overrides: Partial<ProseGenerationRequest> = {}): ProseGenerationRequest {
  return {
    requestId: 'draft-request-1',
    activeWorkspace: workspace,
    project,
    chapter,
    chapterNo: chapter.chapter_no,
    paragraphTask: '写出完整第一章。',
    promptDiagnostics: { prompt_chars: 8 },
    contextPackage,
    modelContext: { worldbuilding: [], characters: [], prevChapters: [] },
    modelId: 217,
    maxTokens: 8_000,
    temperature: 0.7,
    ...overrides,
  }
}

const workspaces: string[] = []
const fakeAgentLeases = new McpAgentLeaseRegistry()
const acquireFakeAgentLease = (activeWorkspace: string, binding: any) =>
  fakeAgentLeases.acquire(activeWorkspace, binding)

async function releaseTransferredProductionLease(result: any) {
  const lease = takeProductionLease(result)
  expect(lease).toBeDefined()
  await lease!.release()
}

afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

function sourceRequest(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'request-12',
    activeWorkspace: '/workspace/a',
    project: { id: 8, title: '长篇测试', reference_config: {} },
    chapter: { id: 22, chapter_no: 12, title: '雨夜' },
    chapterNo: 12,
    paragraphTask: '完整段落任务，不得删减。',
    promptDiagnostics: { prompt_chars: 12 },
    contextPackage: { writing_bible: { voice: '克制' }, story_state: { global: { place: '北城' } }, continuity: { previous_chapter: { chapter_no: 11 } } },
    modelContext: { worldbuilding: [], characters: [], prevChapters: [] },
    modelId: 217,
    maxTokens: 8000,
    temperature: 0.7,
    ...overrides,
  } as any
}

describe('GenerationSource resolver', () => {
  test('keeps the temporary model override only on the lease-free legacy resolver', () => {
    const model = { generateProse: async () => ({ source: 'model' }) } as any
    const mcp = { generateProse: async () => ({ source: 'mcp' }) } as any
    const resolver = createGenerationSourceResolver({ modelSource: model, mcpSource: mcp })
    const legacyMcpProject = {
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1', type: 'mcp',
          mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '' },
        },
      },
    }

    expect(resolver.resolve(legacyMcpProject, { generation_source_override: 'model' })).toMatchObject({
      source: model, configured_type: 'mcp', resolved_type: 'model', override: 'model',
    })
  })

  test('rejects request-level source override before acquiring a task', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => project,
      createModelExecution: () => { throw new Error('execution must not be created') },
    })

    await expect(resolver.beginTask(beginInput({
      options: { generation_source_override: 'model' },
    }))).rejects.toMatchObject({ code: 'GENERATION_SOURCE_OVERRIDE_FORBIDDEN' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
  })

  test('rejects Proxy and accessor override inputs without invoking traps or acquiring a task', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => project,
      createModelExecution: () => { throw new Error('execution must not be created') },
    })
    let traps = 0
    const proxiedOptions = new Proxy({}, {
      getOwnPropertyDescriptor: () => { traps += 1; throw new Error('must not invoke proxy trap') },
      get: () => { traps += 1; throw new Error('must not invoke proxy trap') },
    })
    let getterCalls = 0
    const accessorOptions = Object.defineProperty({}, 'generation_source_override', {
      get() { getterCalls += 1; return 'model' },
    })

    for (const options of [proxiedOptions, accessorOptions]) {
      await expect(resolver.beginTask(beginInput({ options })))
        .rejects.toMatchObject({ code: 'GENERATION_SOURCE_OVERRIDE_FORBIDDEN' })
      expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
    }
    expect(traps).toBe(0)
    expect(getterCalls).toBe(0)
  })

  test('resolves one frozen model snapshot under the coordinator and closes source before lease once', async () => {
    const events: string[] = []
    let resolved!: ResolvedChapterTaskInput & { modelId: number }
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases: {
        acquire: async (_workspace: string, _projectId: number, taskId: string) => ({
          taskId,
          projectId: project.id,
          release: async () => { events.push('lease.release') },
        }),
      } as any,
      readProject: async (activeWorkspace) => {
        assertMcpWorkspaceMutationHeld(activeWorkspace)
        return project
      },
      createModelExecution: input => {
        resolved = input
        return {
          taskId: input.taskId,
          source: 'model',
          modelId: input.modelId,
          fingerprint: input.fingerprint,
          contextVersion: input.contextVersion,
          provenance: () => ({
            task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'model',
            source_fingerprint: input.fingerprint, context_version: input.contextVersion,
            model_id: input.modelId,
          }),
          generateDraft: async () => ({ source: 'model' }),
          executeAgent: async () => ({}),
          assertCurrent: input.assertCurrent,
          close: async () => { events.push('source.close') },
        }
      },
    })

    const execution = await resolver.beginTask(beginInput({ requestedModelId: 999 }))
    expect(execution.taskId).toMatch(/^[0-9a-f-]{36}$/)
    expect(execution.modelId).toBe(217)
    expect(resolved.modelId).toBe(217)
    expect(resolved.project).toBe(project)
    expect(resolved.fingerprint).toBe(chapterGenerationSourceFingerprint(project.reference_config.chapter_generation_source as any))
    expect(resolved.contextVersion).toBe(chapterContextVersion(contextPackage))
    expect(Object.isFrozen(resolved.sourceState)).toBe(true)
    expect(Object.isFrozen(resolved.sourceState.model)).toBe(true)

    await Promise.all([execution.close({ status: 'success' }), execution.close({ status: 'failed' }), execution.close()])
    expect(events).toEqual(['source.close', 'lease.release'])
  })

  test('uses the requested model only as the legacy fallback and requires a positive model', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const projectWithoutModel = {
      ...project,
      reference_config: {
        chapter_generation_source: {
          version: 'chapter_generation_source_v1', active: 'model', model: {},
        },
      },
    }
    let capturedModelId = 0
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => projectWithoutModel,
      createModelExecution: input => {
        capturedModelId = input.modelId
        return {
          taskId: input.taskId, source: 'model', modelId: input.modelId,
          fingerprint: input.fingerprint, contextVersion: input.contextVersion,
          provenance: () => ({ task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'model', source_fingerprint: input.fingerprint, context_version: input.contextVersion }),
          generateDraft: async () => ({ source: 'model' }), executeAgent: async () => ({}),
          assertCurrent: input.assertCurrent, close: async () => {},
        }
      },
    })

    const fallback = await resolver.beginTask(beginInput({ project: projectWithoutModel, requestedModelId: 333 }))
    expect(capturedModelId).toBe(333)
    await fallback.close()
    await expect(resolver.beginTask(beginInput({ project: projectWithoutModel, requestedModelId: undefined })))
      .rejects.toMatchObject({ code: 'CHAPTER_MODEL_REQUIRED' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
  })

  test('routes an active MCP task without creating or falling back to a model execution', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const mcpProject = {
      ...project,
      reference_config: {
        chapter_generation_source: {
          version: 'chapter_generation_source_v1', active: 'mcp', model: { model_id: 217 },
          mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: 'remote-model' },
        },
      },
    }
    let modelCreations = 0
    let mcpBegins = 0
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => mcpProject,
      createModelExecution: () => { modelCreations += 1; throw new Error('model fallback forbidden') },
      mcpSource: {
        beginResolvedTask: async input => {
          mcpBegins += 1
          return {
            taskId: input.taskId, source: 'mcp',
            fingerprint: input.fingerprint, contextVersion: input.contextVersion,
            provenance: () => ({
              task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'mcp',
              source_fingerprint: input.fingerprint, context_version: input.contextVersion,
            }),
            generateDraft: async () => ({ source: 'mcp' }), executeAgent: async () => ({}),
            assertCurrent: input.assertCurrent, close: async () => {},
          }
        },
      },
    })

    const execution = await resolver.beginTask(beginInput({ project: mcpProject }))
    expect(execution.source).toBe('mcp')
    expect(modelCreations).toBe(0)
    expect(mcpBegins).toBe(1)
    await execution.close({ status: 'success' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)

    const missingMcp = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => mcpProject,
      createModelExecution: () => { throw new Error('model fallback forbidden') },
    })
    await expect(missingMcp.beginTask(beginInput({ project: mcpProject })))
      .rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
  })

  test('fences a changed active fingerprint and releases the lease when construction fails', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    let reads = 0
    let resolved!: ResolvedChapterTaskInput
    const changed = {
      ...project,
      reference_config: {
        chapter_generation_source: {
          version: 'chapter_generation_source_v1', active: 'model', model: { model_id: 218 },
        },
      },
    }
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => (++reads === 1 ? project : changed),
      createModelExecution: input => {
        resolved = input
        return {
          taskId: input.taskId, source: 'model', modelId: input.modelId,
          fingerprint: input.fingerprint, contextVersion: input.contextVersion,
          provenance: () => ({ task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'model', source_fingerprint: input.fingerprint, context_version: input.contextVersion }),
          generateDraft: async () => ({ source: 'model' }), executeAgent: async () => ({}),
          assertCurrent: input.assertCurrent, close: async () => {},
        }
      },
    })

    const execution = await resolver.beginTask(beginInput())
    await expect(resolved.assertCurrent()).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    await execution.close({ status: 'failed' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)

    const failing = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => project,
      createModelExecution: () => { throw new Error('constructor failed') },
    })
    await expect(failing.beginTask(beginInput())).rejects.toThrow('constructor failed')
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
  })

  test('does not treat a deleted project as a valid default model at begin or current-check time', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const unconfiguredProject = { ...project, reference_config: {} }
    const neverCreate = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => null,
      createModelExecution: () => { throw new Error('deleted project must not create an execution') },
    })
    await expect(neverCreate.beginTask(beginInput({ project: unconfiguredProject })))
      .rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)

    let reads = 0
    let resolved!: ResolvedChapterTaskInput
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => (++reads === 1 ? unconfiguredProject : null),
      createModelExecution: input => {
        resolved = input
        return {
          taskId: input.taskId, source: 'model', modelId: input.modelId,
          fingerprint: input.fingerprint, contextVersion: input.contextVersion,
          provenance: () => ({ task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'model', source_fingerprint: input.fingerprint, context_version: input.contextVersion }),
          generateDraft: async () => ({ source: 'model' }), executeAgent: async () => ({}),
          assertCurrent: input.assertCurrent, close: async () => {},
        }
      },
    })
    const execution = await resolver.beginTask(beginInput({ project: unconfiguredProject, requestedModelId: 217 }))
    await expect(resolved.assertCurrent()).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    await execution.close({ status: 'failed' })
  })

  test('rejects unsafe or mismatched project identities before resolving the initial source', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    let traps = 0
    let getters = 0
    let constructions = 0
    const proxiedProject = new Proxy(project, {
      get: (_target, field) => {
        if (field === 'then') return undefined
        traps += 1
        throw new Error('project Proxy get trap')
      },
      getOwnPropertyDescriptor: () => { traps += 1; throw new Error('project Proxy descriptor trap') },
    })
    const accessorProject = { ...project }
    Object.defineProperty(accessorProject, 'id', {
      configurable: true,
      get() { getters += 1; return project.id },
    })

    for (const unsafeProject of [{ ...project, id: 999 }, proxiedProject, accessorProject, null]) {
      const resolver = createGenerationSourceResolver({
        chapterSourceLeases,
        readProject: async () => unsafeProject,
        createModelExecution: () => { constructions += 1; throw new Error('must not construct') },
      })
      await expect(resolver.beginTask(beginInput())).rejects.toMatchObject({
        code: 'GENERATION_SOURCE_CHANGED',
      })
      expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
    }

    const unsafeInput = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => project,
      createModelExecution: () => { constructions += 1; throw new Error('must not construct') },
    })
    await expect(unsafeInput.beginTask(beginInput({ project: proxiedProject })))
      .rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
    expect(constructions).toBe(0)
    expect(traps).toBe(0)
    expect(getters).toBe(0)
  })

  test('fences mismatched and unsafe project identities on every current check', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    let reads = 0
    let traps = 0
    let getters = 0
    let resolved!: ResolvedChapterTaskInput
    const proxiedProject = new Proxy(project, {
      get: (_target, field) => {
        if (field === 'then') return undefined
        traps += 1
        throw new Error('current Proxy get trap')
      },
      getOwnPropertyDescriptor: () => { traps += 1; throw new Error('current Proxy descriptor trap') },
    })
    const accessorProject = { ...project }
    Object.defineProperty(accessorProject, 'id', {
      configurable: true,
      get() { getters += 1; return project.id },
    })
    const currentProjects = [project, { ...project, id: 999 }, proxiedProject, accessorProject, null]
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: async () => currentProjects[Math.min(reads++, currentProjects.length - 1)],
      createModelExecution: input => {
        resolved = input
        return {
          taskId: input.taskId, source: 'model', modelId: input.modelId,
          fingerprint: input.fingerprint, contextVersion: input.contextVersion,
          provenance: () => ({ task_id: input.taskId, project_id: 5, chapter_id: 12, source: 'model', source_fingerprint: input.fingerprint, context_version: input.contextVersion }),
          generateDraft: async () => ({ source: 'model' }), executeAgent: async () => ({}),
          assertCurrent: input.assertCurrent, close: async () => {},
        }
      },
    })

    const execution = await resolver.beginTask(beginInput())
    for (let index = 0; index < currentProjects.length - 1; index += 1) {
      await expect(resolved.assertCurrent()).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    }
    expect(traps).toBe(0)
    expect(getters).toBe(0)
    await execution.close({ status: 'failed' })
    expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
  })
})

describe('production lease capability', () => {
  test('is non-enumerable, JSON-invisible, and one-shot without polluting model results', async () => {
    const lease = { release: async () => {} }
    const mcpResult = { source: 'mcp', source_receipt: { status: 'success' } }
    const modelResult = { source: 'model', modelName: 'local-model' }

    expect(attachProductionLease(mcpResult, lease)).toBe(mcpResult)
    expect(Object.keys(mcpResult)).toEqual(['source', 'source_receipt'])
    expect(JSON.stringify(mcpResult)).toBe('{"source":"mcp","source_receipt":{"status":"success"}}')
    expect(Object.getOwnPropertySymbols(mcpResult)).toHaveLength(1)
    expect(takeProductionLease(mcpResult)).toBe(lease)
    expect(takeProductionLease(mcpResult)).toBeUndefined()
    expect(Object.getOwnPropertySymbols(mcpResult)).toHaveLength(0)
    expect(takeProductionLease(modelResult)).toBeUndefined()
    expect(Object.keys(modelResult)).toEqual(['source', 'modelName'])
    expect(JSON.stringify(modelResult)).toBe('{"source":"model","modelName":"local-model"}')
  })

  test('logically consumes a lease when a Proxy prevents physical capability deletion', async () => {
    let releases = 0
    const lease = { release: async () => { releases += 1 } }
    const target = attachProductionLease({ source: 'mcp' }, lease)
    const protectedResult = new Proxy(target, {
      deleteProperty: () => { throw new Error('capability delete blocked') },
    })

    const transferred = takeProductionLease(protectedResult)

    expect(transferred).toBe(lease)
    expect(takeProductionLease(protectedResult)).toBeUndefined()
    expect(Object.getOwnPropertySymbols(target)).toHaveLength(1)
    await transferred?.release()
    expect(releases).toBe(1)
  })
})

describe('McpGenerationSource quarantine outcomes', () => {
  async function harness(prefix: string) {
    const workspace = await mkdtemp(join(tmpdir(), prefix))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_outcome', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '隔离 outcome',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    return { workspace, server, key, project }
  }

  function runtimeWithAdapter(
    activeWorkspace: string,
    server: any,
    key: any,
    adapter: any,
    registry = new McpAgentLeaseRegistry(),
  ) {
    return {
      registry,
      runtime: {
        resolveCredentialConfig: async () => ({ server, key }),
        listAgents: async () => { throw new Error('must use pinned adapter') },
        getAdapterForKey: async () => ({ server, key, adapter }),
        acquireAgentLease: (workspace: string, binding: any) => registry.acquire(workspace, binding),
        isAgentLeaseActive: (workspace: string, binding: any) => registry.isActive(workspace, binding),
        listAgentQuarantines: (workspace: string) => registry.list(workspace),
        clearAgentQuarantine: (workspace: string, id: string) => registry.clear(workspace, id),
      },
    }
  }

  function success(sessionId: string) {
    return {
      prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
      source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: sessionId,
      snapshot_hash: 'snapshot-1', completed: true,
      raw: { request_id: 'request-12', session_status: 'completed' },
    }
  }

  function stageFailureBuda(cleanupConfirmed: boolean) {
    const toolNames = [
      'apiClaw.listApiAgents',
      'apiClaw.listApiAgentDriveFiles',
      'apiClaw.upsertApiAgentDriveFile',
      'apiClaw.apiAgentDriveText',
      'apiClaw.createApiAgentSession',
      'apiClaw.getApiAgentSession',
      'apiClaw.postApiAgentSessionMessage',
      'apiClaw.cancelApiAgentSessionRun',
    ]
    const calls: Array<{ name: string; args: any; options: any }> = []
    const drive = new Map<string, string>()
    const structured = (value: Record<string, unknown>) => ({ content: [], structuredContent: value })
    let sends = 0
    const client = {
      async listTools() {
        return toolNames.map(name => ({ name, inputSchema: { type: 'object' } }))
      },
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name.endsWith('listApiAgents')) {
          return structured({ apiAgents: [{ id: 'agent-1', name: '正文 Agent' }] })
        }
        if (name.endsWith('listApiAgentDriveFiles')) {
          return structured({ files: [...drive.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name.endsWith('upsertApiAgentDriveFile')) {
          drive.set(args.path, args.content)
          return structured({ ok: true })
        }
        if (name.endsWith('apiAgentDriveText')) return structured({ content: drive.get(args.filePath) || '' })
        if (name.endsWith('createApiAgentSession')) {
          return structured({ session: { id: 'session-stage-fail', status: 'pending' } })
        }
        if (name.endsWith('postApiAgentSessionMessage')) {
          sends += 1
          return structured({ ok: true })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) {
          if (cleanupConfirmed) return structured({ cancelled: true })
          throw new Error('cleanup cancel unavailable')
        }
        if (name.endsWith('getApiAgentSession')) throw new Error('cleanup status unavailable')
        throw new Error(`unexpected Buda tool: ${name}`)
      },
    }
    return {
      adapter: new BudaAdapter(client as any),
      calls,
      sendCount: () => sends,
    }
  }

  test('records confirmed caller cancellation and releases the tuple for another generation', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-cancelled-')
    const caller = new AbortController()
    let attempts = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        attempts += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: `session-${attempts}`, snapshot_hash: 'snapshot-1' })
        if (attempts === 1) {
          caller.abort()
          try { input.deadline.throwIfAborted() } catch (error: any) {
            throw new McpError(error.code, error.message, {
              session_id: 'session-1', remote_cancel_confirmed: true,
            })
          }
        }
        return success('session-2')
      },
    }
    const { runtime, registry } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project, signal: caller.signal })))
      .rejects.toMatchObject({ code: 'MCP_CANCELLED' })
    expect(await registry.list(workspace)).toEqual([])
    const retryResult = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-13' }))
    expect(retryResult).toMatchObject({ session_id: 'session-2' })

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts.map(run => run.status)).toEqual(['success', 'cancelled'])
    expect(JSON.parse(receipts.find(run => run.status === 'cancelled')!.output_ref!)).toMatchObject({
      status: 'cancelled', session_id: 'session-1', snapshot_hash: 'snapshot-1',
    })
    await releaseTransferredProductionLease(retryResult)
  })

  test('stages a durable Session fence before send and survives a simulated process crash', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-pre-send-fence-')
    let fenceReady!: () => void
    const staged = new Promise<void>(resolve => { fenceReady = resolve })
    let finishSend!: () => void
    const sendGate = new Promise<void>(resolve => { finishSend = resolve })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-crash', snapshot_hash: 'snapshot-crash',
        })
        fenceReady()
        await sendGate
        return success('session-crash')
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)
    const generation = source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))
    await staged

    const [record] = await readMcpAgentQuarantines(workspace)
    expect(record).toMatchObject({
      request_id: 'request-12', session_id: 'session-crash', reason: 'remote_cancel_unknown',
    })
    await expect(new McpAgentLeaseRegistry().acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })

    finishSend()
    const generationResult = await generation
    expect(generationResult).toMatchObject({ session_id: 'session-crash' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    await releaseTransferredProductionLease(generationResult)
    const released = await new McpAgentLeaseRegistry().acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })
    await released.release()
  })

  test('fails before send and safely releases when durable Session staging fails', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-stage-fail-')
    let sends = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await mkdir(getMcpAgentQuarantinePath(workspace))
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-stage-fail', snapshot_hash: 'snapshot-stage-fail',
        })
        sends += 1
        return success('unreachable')
      },
    }
    const { runtime, registry } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(sends).toBe(0)
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
  })

  test('retries durable quarantine when pre-send staging fails and Buda cleanup is unconfirmed', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-stage-retry-')
    let upserts = 0
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: async (activeWorkspace, input) => {
        upserts += 1
        if (upserts === 1) throw new McpError('MCP_STORE_IO_FAILED', 'initial Session fence failed')
        return upsertMcpAgentQuarantine(activeWorkspace, input)
      },
    })
    const buda = stageFailureBuda(false)
    const { runtime } = runtimeWithAdapter(workspace, server, key, buda.adapter, registry)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({
        code: 'MCP_STORE_IO_FAILED',
        details: {
          session_id: 'session-stage-fail',
          receipt_status: 'remote_cancel_unknown',
          remote_cancel_confirmed: false,
        },
      })

    expect(buda.sendCount()).toBe(0)
    expect(upserts).toBe(2)
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ session_id: 'session-stage-fail', reason: 'remote_cancel_unknown' }),
    ])
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
    await expect(new McpAgentLeaseRegistry().acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })

    const remoteCalls = buda.calls.length
    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-stage-retry-2',
    }))).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(buda.calls).toHaveLength(remoteCalls)
    const receipt = (await listNovelRuns(workspace, project.id))
      .find(run => run.run_type === 'mcp_generate_prose' && run.status === 'remote_cancel_unknown')
    expect(JSON.parse(receipt!.output_ref!)).toMatchObject({
      status: 'remote_cancel_unknown',
      error_code: 'MCP_STORE_IO_FAILED',
      session_id: 'session-stage-fail',
    })
  })

  test('keeps the active lease when both pre-send fence persistence attempts fail after unconfirmed cleanup', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-stage-retry-fail-')
    let upserts = 0
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: async () => {
        upserts += 1
        throw new McpError('MCP_STORE_IO_FAILED', `Session fence write ${upserts} failed`)
      },
    })
    const buda = stageFailureBuda(false)
    const { runtime } = runtimeWithAdapter(workspace, server, key, buda.adapter, registry)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({
        code: 'MCP_STORE_IO_FAILED',
        details: {
          cause_code: 'MCP_STORE_IO_FAILED',
          session_id: 'session-stage-fail',
          receipt_status: 'remote_cancel_unknown',
          remote_cancel_confirmed: false,
        },
      })

    expect(buda.sendCount()).toBe(0)
    expect(upserts).toBe(2)
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(true)
    const receipt = (await listNovelRuns(workspace, project.id))
      .find(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'remote_cancel_unknown' })
    expect(JSON.parse(receipt!.output_ref!)).toMatchObject({
      status: 'remote_cancel_unknown',
      error_code: 'MCP_STORE_IO_FAILED',
      session_id: 'session-stage-fail',
    })
    const remoteCalls = buda.calls.length
    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-stage-retry-fail-2',
    }))).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    expect(buda.calls).toHaveLength(remoteCalls)
  })

  test('releases without retrying quarantine when Buda confirms cleanup after pre-send staging fails', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-stage-confirmed-')
    let upserts = 0
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: async () => {
        upserts += 1
        throw new McpError('MCP_STORE_IO_FAILED', 'initial Session fence failed')
      },
    })
    const buda = stageFailureBuda(true)
    const { runtime } = runtimeWithAdapter(workspace, server, key, buda.adapter, registry)

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project,
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { session_id: 'session-stage-fail', remote_cancel_confirmed: true },
    })

    expect(buda.sendCount()).toBe(0)
    expect(upserts).toBe(1)
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
    const lease = await registry.acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })
    await lease.release()
  })

  test('retries a transient terminal fence clear and fully releases after the retry succeeds', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-clear-retry-')
    let clears = 0
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: upsertMcpAgentQuarantine,
      clear: async (activeWorkspace, quarantineId) => {
        clears += 1
        if (clears === 1) throw new McpError('MCP_STORE_IO_FAILED', 'transient clear failed')
        return clearMcpAgentQuarantine(activeWorkspace, quarantineId)
      },
    })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-clear-retry', snapshot_hash: 'snapshot-clear-retry',
        })
        return success('session-clear-retry')
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter, registry)

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project,
    }))).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })

    expect(clears).toBe(2)
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
    const lease = await registry.acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })
    await lease.release()
  })

  test('releases active state when terminal fence clear keeps failing but the durable record remains', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-clear-fail-')
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: upsertMcpAgentQuarantine,
      clear: async () => { throw new McpError('MCP_STORE_IO_FAILED', 'clear failed') },
    })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-clear-fail', snapshot_hash: 'snapshot-clear-fail',
        })
        return success('session-clear-fail')
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
      acquireAgentLease: (activeWorkspace: string, leaseBinding: any) => registry.acquire(activeWorkspace, leaseBinding),
    }
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readMcpAgentQuarantines(workspace)).toHaveLength(1)
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
    await expect(new McpAgentLeaseRegistry().acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
  })

  test('keeps the staged fence and releases active state when unresolved fence update fails', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-fence-update-fail-')
    let upserts = 0
    const registry = new McpAgentLeaseRegistry({
      read: readMcpAgentQuarantines,
      upsert: async (activeWorkspace, input) => {
        upserts += 1
        if (upserts > 1) throw new McpError('MCP_STORE_IO_FAILED', 'fence update failed')
        return upsertMcpAgentQuarantine(activeWorkspace, input)
      },
      clear: async () => false,
    })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-update-fail', snapshot_hash: 'snapshot-update-fail',
        })
        throw new McpError('MCP_SESSION_FAILED', 'remote failed', {
          session_id: 'session-update-fail',
          remote_cancel_confirmed: false,
          receipt_status: 'remote_cancel_unknown',
        })
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
      acquireAgentLease: (activeWorkspace: string, leaseBinding: any) => registry.acquire(activeWorkspace, leaseBinding),
    }

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project,
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: {
        cause_code: 'MCP_SESSION_FAILED',
        receipt_status: 'remote_cancel_unknown',
        session_id: 'session-update-fail',
        remote_cancel_confirmed: false,
      },
    })
    expect(await registry.isActive(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).toBe(false)
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ session_id: 'session-update-fail', reason: 'remote_cancel_unknown' }),
    ])
    await expect(new McpAgentLeaseRegistry().acquire(workspace, {
      serverId: server.id, keyId: key.id, agentId: 'agent-1',
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
  })

  test('preserves caller cancellation while quarantining an unconfirmed remote Session', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-cancel-unknown-')
    const caller = new AbortController()
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: 'session-cancel-unknown', snapshot_hash: 'snapshot-1' })
        caller.abort()
        try { input.deadline.throwIfAborted() } catch (error: any) {
          throw new McpError(error.code, error.message, {
            session_id: 'session-cancel-unknown',
            remote_cancel_confirmed: false,
            receipt_status: 'remote_cancel_unknown',
          })
        }
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project, signal: caller.signal,
    }))).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
    const receipt = (await listNovelRuns(workspace, project.id)).find(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'remote_cancel_unknown' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ reason: 'remote_cancel_unknown', session_id: 'session-cancel-unknown' }),
    ])
  })

  test('records a confirmed total timeout and releases the tuple', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-timed-out-')
    let attempts = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        attempts += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: `session-${attempts}`, snapshot_hash: 'snapshot-timeout' })
        if (attempts === 1) throw new McpError('MCP_GENERATION_TIMEOUT', 'deadline', {
          session_id: 'session-1', remote_cancel_confirmed: true,
        })
        return success('session-2')
      },
    }
    const { runtime, registry } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })
    expect(await registry.list(workspace)).toEqual([])
    const retryResult = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-13' }))
    expect(retryResult).toMatchObject({ session_id: 'session-2' })
    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts.map(run => run.status)).toEqual(['success', 'timed_out'])
    await releaseTransferredProductionLease(retryResult)
  })

  test('keeps an exact-deadline completed Session trusted through receipt and lease outcomes', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-exact-terminal-')
    const exactServer = {
      ...server,
      generation_timeout_ms: 100,
      poll_initial_ms: 1,
      poll_max_ms: 2,
    }
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
    let now = 0
    let deadline!: McpGenerationDeadline
    let businessSessionReads = 0
    const client = {
      listTools: async () => toolNames.map(name => ({ name, inputSchema: { type: 'object' } })),
      async callTool(name: string, args: any, options: any) {
        if (name.endsWith('listApiAgents')) {
          return structured({ apiAgents: [{ id: 'agent-1', name: '正文 Agent', spaceId: 'space-1' }], total: 1 })
        }
        if (name.endsWith('listApiAgentDriveFiles')) {
          return structured({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name.endsWith('upsertApiAgentDriveFile')) {
          remote.set(args.path, args.content)
          return structured({ ok: true })
        }
        if (name.endsWith('apiAgentDriveText')) return structured({ content: remote.get(args.filePath) || '' })
        if (name.endsWith('createApiAgentSession')) {
          return structured({ session: { id: 'session-exact', status: 'pending' }, run: { started: false } })
        }
        if (name.endsWith('postApiAgentSessionMessage')) {
          return structured({ session: { id: 'session-exact' }, run: { started: true } })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) throw new Error('cleanup cancel failed')
        if (name.endsWith('getApiAgentSession')) {
          if (options.signal !== deadline.signal) throw new Error('cleanup read failed')
          businessSessionReads += 1
          const result = structured({
            session: { id: 'session-exact', status: 'completed' },
            run: { status: 'completed' },
            messages: [{ role: 'assistant', content: '这是完整的本章正文。' }],
          })
          if (businessSessionReads === 1) now = 100
          return result
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    const adapter = new BudaAdapter(client as any)
    const { runtime, registry } = runtimeWithAdapter(workspace, exactServer, key, adapter)
    const source = new McpGenerationSource(runtime as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => {
        deadline = new McpGenerationDeadline(totalMs, signal, {
          now: () => now,
          setTimeout: () => 1,
          clearTimeout: () => {},
        })
        return deadline
      },
    })

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({
        code: 'MCP_GENERATION_TIMEOUT',
        details: { session_id: 'session-exact', remote_cancel_confirmed: true },
      })
    const timedOutReceipt = (await listNovelRuns(workspace, project.id)).find(run => run.status === 'timed_out')
    expect(timedOutReceipt).toBeDefined()
    expect(await registry.list(workspace)).toEqual([])
    const retryResult = await source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-exact-retry',
    }))
    expect(retryResult).toMatchObject({ session_id: 'session-exact' })
    await releaseTransferredProductionLease(retryResult)
  })

  test('quarantines an unresolved total timeout and blocks retry before remote work', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-timeout-unknown-')
    let remoteCalls = 0
    const adapter = {
      listAgents: async () => { remoteCalls += 1; return [{ id: 'agent-1', name: '正文 Agent' }] },
      generateProse: async (input: any) => {
        remoteCalls += 1
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-timeout', snapshot_hash: 'snapshot-timeout',
        })
        throw new McpError('MCP_GENERATION_TIMEOUT', 'deadline', {
          session_id: 'session-timeout',
          remote_cancel_confirmed: false,
          receipt_status: 'remote_cancel_unknown',
        })
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const originalGetAdapter = runtime.getAdapterForKey
    runtime.getAdapterForKey = async (...args: any[]) => {
      remoteCalls += 1
      return originalGetAdapter(...args)
    }
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })
    const receipt = (await listNovelRuns(workspace, project.id)).find(run => run.run_type === 'mcp_generate_prose')!
    expect(receipt).toMatchObject({ status: 'remote_cancel_unknown' })
    expect(JSON.parse(receipt.output_ref!)).toMatchObject({
      status: 'remote_cancel_unknown', session_id: 'session-timeout', snapshot_hash: 'snapshot-timeout',
    })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ reason: 'remote_cancel_unknown', session_id: 'session-timeout' }),
    ])

    const callsBeforeRetry = remoteCalls
    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-timeout-retry',
    }))).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(remoteCalls).toBe(callsBeforeRetry)
  })

  test('rejects a concurrent same-tuple generation as busy before remote work and releases after success', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-busy-')
    let enterFirst!: () => void
    const firstEntered = new Promise<void>(resolve => { enterFirst = resolve })
    let releaseFirst!: () => void
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve })
    let generateCalls = 0
    let remoteCalls = 0
    const adapter = {
      listAgents: async () => { remoteCalls += 1; return [{ id: 'agent-1', name: '正文 Agent' }] },
      generateProse: async () => {
        remoteCalls += 1
        generateCalls += 1
        if (generateCalls === 1) {
          enterFirst()
          await firstGate
        }
        return success(`session-${generateCalls}`)
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const originalGetAdapter = runtime.getAdapterForKey
    runtime.getAdapterForKey = async (...args: any[]) => {
      remoteCalls += 1
      return originalGetAdapter(...args)
    }
    const source = new McpGenerationSource(runtime as any)
    const first = source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-busy-1' }))
    await firstEntered

    try {
      const callsWhileFirstActive = remoteCalls
      await expect(source.generateProse(sourceRequest({
        activeWorkspace: workspace, project, requestId: 'request-busy-2',
      }))).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      expect(remoteCalls).toBe(callsWhileFirstActive)
    } finally {
      releaseFirst()
    }
    const firstResult = await first
    expect(firstResult).toMatchObject({ session_id: 'session-1' })
    await releaseTransferredProductionLease(firstResult)
    const retryResult = await source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-busy-3',
    }))
    expect(retryResult).toMatchObject({ session_id: 'session-2' })
    await releaseTransferredProductionLease(retryResult)
  })

  test('allows the same tuple to generate concurrently in two explicit workspaces', async () => {
    const firstHarness = await harness('mangaforge-generation-workspace-concurrent-a-')
    const secondHarness = await harness('mangaforge-generation-workspace-concurrent-b-')
    let entered = 0
    let resolveBoth!: () => void
    const bothEntered = new Promise<void>(resolve => { resolveBoth = resolve })
    let releaseBoth!: () => void
    const gate = new Promise<void>(resolve => { releaseBoth = resolve })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        entered += 1
        if (entered === 2) resolveBoth()
        await gate
        return success(`session-${input.activeWorkspace === firstHarness.workspace ? 'a' : 'b'}`)
      },
    }
    const { runtime } = runtimeWithAdapter(firstHarness.workspace, firstHarness.server, firstHarness.key, adapter)
    const source = new McpGenerationSource(runtime as any)
    const generations = [
      source.generateProse(sourceRequest({
        activeWorkspace: firstHarness.workspace, project: firstHarness.project, requestId: 'request-workspace-a',
      })),
      source.generateProse(sourceRequest({
        activeWorkspace: secondHarness.workspace, project: secondHarness.project, requestId: 'request-workspace-b',
      })),
    ]
    let reachedBoth = false
    try {
      await Promise.race([
        bothEntered.then(() => { reachedBoth = true }),
        new Promise<void>(resolve => setTimeout(resolve, 500)),
      ])
    } finally {
      releaseBoth()
    }
    const settled = await Promise.allSettled(generations)
    expect(reachedBoth).toBe(true)
    expect(settled.map(result => result.status)).toEqual(['fulfilled', 'fulfilled'])
    for (const result of settled) {
      if (result.status === 'fulfilled') await releaseTransferredProductionLease(result.value)
    }
  })

  test('keeps long Agent IDs distinct through GenerationSource quarantine admission', async () => {
    const { workspace, server, key } = await harness('mangaforge-generation-long-agent-')
    const sharedPrefix = `agent-${'a'.repeat(170)}`
    const quarantinedAgentId = `${sharedPrefix}-quarantined`
    const allowedAgentId = `${sharedPrefix}-allowed`
    const config = (agentId: string) => ({
      prose_generation_source: {
        version: 'prose_generation_source_v1', type: 'mcp',
        mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: agentId },
      },
    })
    const quarantinedProject = await createNovelProject(workspace, {
      title: '长 Agent 隔离', reference_config: config(quarantinedAgentId),
    })
    const allowedProject = await createNovelProject(workspace, {
      title: '长 Agent 允许', reference_config: config(allowedAgentId),
    })
    const adapter = {
      listAgents: async () => [
        { id: quarantinedAgentId, name: 'Quarantined Agent' },
        { id: allowedAgentId, name: 'Allowed Agent' },
      ],
      generateProse: async (input: any) => {
        if (input.agentId === quarantinedAgentId) {
          await input.onProgress({
            stage: 'session_created', status: 'running',
            session_id: 'session-long-agent', snapshot_hash: 'snapshot-long-agent',
          })
          throw new McpError('MCP_SESSION_FAILED', 'remote failed', {
            session_id: 'session-long-agent',
            remote_cancel_confirmed: false,
            receipt_status: 'remote_cancel_unknown',
          })
        }
        return {
          ...success('session-long-allowed'),
          agent_id: allowedAgentId,
        }
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project: quarantinedProject })))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ agent_id: quarantinedAgentId }),
    ])
    const allowedResult = await source.generateProse(sourceRequest({
      activeWorkspace: workspace, project: allowedProject, requestId: 'request-long-allowed',
    }))
    expect(allowedResult).toMatchObject({ session_id: 'session-long-allowed' })
    await releaseTransferredProductionLease(allowedResult)
  })

  test('keeps trusted terminal evidence out of quarantine at the GenerationSource boundary', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-terminal-evidence-')
    let attempts = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        attempts += 1
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: `session-terminal-${attempts}`, snapshot_hash: 'snapshot-terminal',
        })
        if (attempts === 1) {
          throw new McpError('MCP_EMPTY_PROSE', 'completed without prose', {
            session_id: 'session-terminal-1', remote_cancel_confirmed: true,
          })
        }
        return success('session-terminal-2')
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_EMPTY_PROSE' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    const failedReceipt = (await listNovelRuns(workspace, project.id)).find(run => run.status === 'failed')!
    expect(JSON.parse(failedReceipt.output_ref!)).toMatchObject({
      status: 'failed', error_code: 'MCP_EMPTY_PROSE', session_id: 'session-terminal-1',
    })
    const retryResult = await source.generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-terminal-2',
    }))
    expect(retryResult).toMatchObject({ session_id: 'session-terminal-2' })
    await releaseTransferredProductionLease(retryResult)
  })

  test('persists remote_cancel_unknown after the receipt and blocks all later remote work', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-remote-unknown-')
    let remoteCalls = 0
    const primary = new McpError('MCP_SESSION_FAILED', 'remote failed', {
      session_id: 'session-unknown', remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown',
    })
    const adapter = {
      listAgents: async () => { remoteCalls += 1; return [{ id: 'agent-1', name: '正文 Agent' }] },
      generateProse: async (input: any) => {
        remoteCalls += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: 'session-unknown', snapshot_hash: 'snapshot-unknown' })
        throw primary
      },
    }
    const firstRuntime = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(firstRuntime.runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))).rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    const receipt = (await listNovelRuns(workspace, project.id)).find(run => run.run_type === 'mcp_generate_prose')!
    expect(receipt).toMatchObject({ status: 'remote_cancel_unknown' })
    expect(JSON.parse(receipt.output_ref!)).toMatchObject({
      status: 'remote_cancel_unknown', session_id: 'session-unknown', snapshot_hash: 'snapshot-unknown',
    })
    const quarantines = await readMcpAgentQuarantines(workspace)
    expect(quarantines).toEqual([expect.objectContaining({ session_id: 'session-unknown', reason: 'remote_cancel_unknown' })])

    const callsBeforeBlockedAttempt = remoteCalls
    const rebuilt = runtimeWithAdapter(workspace, server, key, adapter)
    await expect(new McpGenerationSource(rebuilt.runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project, requestId: 'request-13',
    }))).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(remoteCalls).toBe(callsBeforeBlockedAttempt)
  })

  test('pins a request workspace across ambient drift before lease acquisition', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-workspace-pinned-a-')
    const otherWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-workspace-pinned-b-'))
    workspaces.push(otherWorkspace)
    const registry = new McpAgentLeaseRegistry()
    let ambientWorkspace = otherWorkspace
    let remoteCalls = 0
    const adapter = {
      listAgents: async () => { remoteCalls += 1; return [{ id: 'agent-1', name: '正文 Agent' }] },
      generateProse: async (input: any) => {
        remoteCalls += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: 'session-drift', snapshot_hash: 'snapshot-1' })
        throw new McpError('MCP_SESSION_FAILED', 'remote failed', {
          session_id: 'session-drift', remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown',
        })
      },
    }
    const runtime = {
      resolveCredentialConfig: async (_keyId: number, _serverId: string, pinned: any) => {
        expect(pinned.activeWorkspace).toBe(workspace)
        return { server, key, activeWorkspace: pinned.activeWorkspace }
      },
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
      acquireAgentLease: (...args: any[]) => args.length === 2
        ? registry.acquire(args[0], args[1])
        : registry.acquire(ambientWorkspace, args[0]),
    }
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(await registry.list(workspace)).toHaveLength(1)
    expect(await registry.list(otherWorkspace)).toEqual([])

    const beforeRetry = remoteCalls
    ambientWorkspace = workspace
    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-drift-2' })))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(remoteCalls).toBe(beforeRetry)
  })

  test('persists send_unknown, exposes MCP_SEND_UNKNOWN, and blocks retry before remote calls', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-send-unknown-')
    let sends = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        sends += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: 'session-send', snapshot_hash: 'snapshot-send' })
        throw new McpError('MCP_SEND_UNKNOWN', 'send result unknown', {
          session_id: 'session-send', remote_cancel_confirmed: false, receipt_status: 'send_unknown',
        })
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_SEND_UNKNOWN' })
    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-13' })))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(sends).toBe(1)
    const receipt = (await listNovelRuns(workspace, project.id))
      .find(run => run.run_type === 'mcp_generate_prose' && run.status === 'send_unknown')
    expect(receipt).toMatchObject({ status: 'send_unknown' })
    expect(JSON.parse(receipt!.output_ref!)).toMatchObject({ status: 'send_unknown', session_id: 'session-send' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({ reason: 'send_unknown', request_id: 'request-12', session_id: 'session-send' }),
    ])
  })

  test('records a confirmed ambiguous send without quarantining the terminated tuple', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-send-confirmed-')
    let attempts = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        attempts += 1
        await input.onProgress({ stage: 'session_created', status: 'running', session_id: `session-${attempts}`, snapshot_hash: 'snapshot-1' })
        if (attempts === 1) throw new McpError('MCP_SEND_UNKNOWN', 'send result unknown', {
          session_id: 'session-1', remote_cancel_confirmed: true,
        })
        return success('session-2')
      },
    }
    const { runtime, registry } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_SEND_UNKNOWN' })
    expect(await registry.list(workspace)).toEqual([])
    const retryResult = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-13' }))
    expect(retryResult).toMatchObject({ session_id: 'session-2' })
    const receipt = (await listNovelRuns(workspace, project.id)).find(run => run.status === 'send_unknown')
    expect(receipt).toBeDefined()
    await releaseTransferredProductionLease(retryResult)
  })

  test('records an ordinary pre-Session failure without quarantine and allows retry', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-before-session-')
    let validations = 0
    const adapter = {
      listAgents: async () => {
        validations += 1
        if (validations === 1) throw new McpError('MCP_CAPABILITY_MISSING', 'missing tool')
        return [{ id: 'agent-1', name: '正文 Agent' }]
      },
      generateProse: async () => success('session-success'),
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)
    const source = new McpGenerationSource(runtime as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_CAPABILITY_MISSING' })
    expect(await readMcpAgentQuarantines(workspace)).toEqual([])
    const retryResult = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, requestId: 'request-13' }))
    expect(retryResult).toMatchObject({ session_id: 'session-success' })
    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts.map(run => run.status)).toEqual(['success', 'failed'])
    await releaseTransferredProductionLease(retryResult)
  })

  test('fails closed when quarantine persistence fails after persisting the unresolved receipt', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-quarantine-write-')
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => {
        await mkdir(getMcpAgentQuarantinePath(workspace))
        throw new McpError('MCP_SESSION_FAILED', 'remote failed', {
          session_id: 'session-write-fail', remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown',
        })
      },
    }
    const { runtime, registry } = runtimeWithAdapter(workspace, server, key, adapter)

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await registry.isActive(workspace, { serverId: server.id, keyId: key.id, agentId: 'agent-1' })).toBe(true)
    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'remote_cancel_unknown' })
  })

  test('keeps safe unresolved diagnostics when the failure receipt update fails before quarantine succeeds', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-receipt-update-fail-')
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created', status: 'running',
          session_id: 'session-receipt-update-fail', snapshot_hash: 'snapshot-receipt-update-fail',
        })
        const db = new Database(join(workspace, 'novel.sqlite'))
        db.run("DELETE FROM runs WHERE run_type = 'mcp_generate_prose'")
        db.close()
        throw new McpError('MCP_SESSION_FAILED', 'remote failed unsafe-prompt-marker', {
          session_id: 'session-receipt-update-fail',
          remote_cancel_confirmed: false,
          receipt_status: 'remote_cancel_unknown',
          prompt: 'unsafe-prompt-marker',
          key: 'unsafe-key-marker',
        })
      },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)

    const caught = await new McpGenerationSource(runtime as any).generateProse(sourceRequest({
      activeWorkspace: workspace, project,
    })).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: {
        cause_code: 'MCP_SESSION_FAILED',
        session_id: 'session-receipt-update-fail',
        receipt_status: 'remote_cancel_unknown',
        remote_cancel_confirmed: false,
      },
    })
    expect(JSON.stringify(caught)).not.toContain('unsafe-prompt-marker')
    expect(JSON.stringify(caught)).not.toContain('unsafe-key-marker')
    expect(await readMcpAgentQuarantines(workspace)).toEqual([
      expect.objectContaining({
        session_id: 'session-receipt-update-fail', reason: 'remote_cancel_unknown',
      }),
    ])
  })

  test('fences a changed binding before Agent validation or any other remote call', async () => {
    const { workspace, server, key, project } = await harness('mangaforge-generation-binding-fence-')
    await updateNovelProject(workspace, project.id, {
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1', type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-2' },
        },
      },
    })
    let remoteCalls = 0
    const adapter = {
      listAgents: async () => { remoteCalls += 1; return [] },
      generateProse: async () => { remoteCalls += 1; return success('never') },
    }
    const { runtime } = runtimeWithAdapter(workspace, server, key, adapter)

    await expect(new McpGenerationSource(runtime as any).generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_BINDING_CHANGED' })
    expect(remoteCalls).toBe(0)
  })
})

describe('ModelGenerationSource', () => {
  test('captures one API model and forces it on every stage', async () => {
    const agentCalls: any[] = []
    const draftCalls: any[] = []
    const currentChecks: string[] = []
    const source = new ModelGenerationSource({
      modelId: 217,
      provenance: {
        task_id: 'task-1', project_id: 5, chapter_id: 12,
        source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
        context_version: `sha256:${'b'.repeat(64)}`, model_id: 217,
        receipt_authority: 'mcp_generation_source_v1',
        arbitrary_detail: 'sk_model_provenance_secret',
      } as any,
      generateChapterProse: async (...args: any[]) => {
        draftCalls.push(args)
        return { prose_chapters: [], source_receipt: { receipt_authority: 'mcp_generation_source_v1', secret: 'attacker' } }
      },
      executeAgent: async (...args: any[]) => {
        agentCalls.push(args)
        return {
          content: '{}', parsed: {}, preserved: true,
          source_receipt: {
            receipt_authority: 'mcp_generation_source_v1',
            secret: 'sk-agent-receipt-secret',
          },
        }
      },
      assertCurrent: async () => { currentChecks.push('checked') },
      recordStage: async (_stage, _request, operation) => operation(),
    })

    const draft = await source.generateDraft(draftRequest({ modelId: 999 }))
    const reviewResult = await source.executeAgent('quality_review', 'quality_review_json', 'review-agent', project, { task: '审查' }, {
      modelId: '999', temperature: 0.2, maxTokens: 321, timeoutMs: 1234, responseMode: 'non_stream',
    })
    await source.executeAgent('revision', 'revision_prose', 'prose-agent', project, { task: '修订' }, {})

    expect(draftCalls[0][3].modelId).toBe('217')
    expect(agentCalls.map(call => call[3].modelId)).toEqual(['217', '217'])
    expect(agentCalls[0][3]).toMatchObject({
      temperature: 0.2, maxTokens: 321, timeoutMs: 1234, responseMode: 'non_stream',
    })
    expect(reviewResult).toMatchObject({ content: '{}', parsed: {}, preserved: true })
    expect(reviewResult).not.toHaveProperty('source_receipt')
    expect(JSON.stringify(reviewResult)).not.toContain('sk-agent-receipt-secret')
    expect(currentChecks).toHaveLength(3)
    expect(draft.source_receipt).toMatchObject({
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      task_id: 'task-1', source: 'model', model_id: 217,
    })
    expect(JSON.stringify(draft.source_receipt)).not.toContain('attacker')
    expect(JSON.stringify(source.provenance())).not.toContain('sk_model_provenance_secret')
    expect(JSON.stringify(draft.source_receipt)).not.toContain('sk_model_provenance_secret')
    expect(Object.keys(draft.source_receipt!).sort()).toEqual([
      'chapter_id', 'context_version', 'model_id', 'project_id', 'receipt_authority',
      'source', 'source_fingerprint', 'task_id',
    ].sort())
    await Promise.all([source.close(), source.close({ status: 'failed' })])
  })

  test('rejects non-number model IDs without invoking hostile coercion', () => {
    let coercions = 0
    const hostileModelId = {
      valueOf() { coercions += 1; return 217 },
      toString() { coercions += 1; return '217' },
    }
    const createSource = (modelId: unknown) => new ModelGenerationSource({
      modelId: modelId as number,
      provenance: {
        task_id: 'task-strict-model', project_id: 5, chapter_id: 12,
        source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
        context_version: `sha256:${'b'.repeat(64)}`,
      },
      generateChapterProse: async () => ({}),
      executeAgent: async () => ({}),
      recordStage: async (_stage, _request, operation) => operation(),
    })

    expect(() => createSource('217')).toThrow(RangeError)
    expect(() => createSource(hostileModelId)).toThrow(RangeError)
    expect(coercions).toBe(0)
  })

  test('projects draft and agent results without invoking receipt or inherited accessors', async () => {
    let getterCalls = 0
    const capability = Symbol('untrusted-capability')
    const draftResult: Record<PropertyKey, any> = { parsed: { prose_chapters: [] }, preserved: 'draft-data' }
    Object.defineProperties(draftResult, {
      source_receipt: {
        enumerable: true,
        get() { getterCalls += 1; throw new Error('draft receipt getter') },
      },
      computed: {
        enumerable: true,
        get() { getterCalls += 1; throw new Error('draft computed getter') },
      },
      [capability]: { enumerable: true, value: { release: () => {} } },
    })
    const inherited = Object.create({
      get source_receipt() { getterCalls += 1; throw new Error('inherited receipt getter') },
      get inherited_value() { getterCalls += 1; throw new Error('inherited value getter') },
    })
    inherited.content = '{}'
    inherited.parsed = {}
    inherited.preserved = 'agent-data'
    const source = new ModelGenerationSource({
      modelId: 217,
      provenance: {
        task_id: 'task-safe-result', project_id: 5, chapter_id: 12,
        source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
        context_version: `sha256:${'b'.repeat(64)}`,
      },
      generateChapterProse: async () => draftResult,
      executeAgent: async () => inherited,
      recordStage: async (_stage, _request, operation) => operation(),
    })

    const draft = await source.generateDraft(draftRequest())
    const agent = await source.executeAgent(
      'quality_review', 'quality_review_json', 'review-agent', project, { task: '审查' },
    )

    expect(getterCalls).toBe(0)
    expect(draft).toMatchObject({ preserved: 'draft-data', source: 'model' })
    expect(draft).not.toHaveProperty('computed')
    expect(Object.getOwnPropertySymbols(draft)).toEqual([])
    expect(agent).toEqual({ content: '{}', parsed: {}, preserved: 'agent-data' })
    expect(Object.getOwnPropertySymbols(agent)).toEqual([])
  })

  test('fails closed on Proxy and revoked Proxy stage results without invoking result traps', async () => {
    let traps = 0
    const proxiedResult = new Proxy({ content: '{}', parsed: {} }, {
      get(target, field, receiver) {
        if (field === 'then') return undefined
        traps += 1
        throw new Error('result get trap')
      },
      ownKeys() { traps += 1; throw new Error('result ownKeys trap') },
      getOwnPropertyDescriptor() { traps += 1; throw new Error('result descriptor trap') },
    })
    const revoked = Proxy.revocable({ content: '{}', parsed: {} }, {})
    revoked.revoke()
    const source = new ModelGenerationSource({
      modelId: 217,
      provenance: {
        task_id: 'task-proxy-result', project_id: 5, chapter_id: 12,
        source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
        context_version: `sha256:${'b'.repeat(64)}`,
      },
      generateChapterProse: async () => proxiedResult,
      executeAgent: async () => revoked.proxy,
      recordStage: async (_stage, _request, operation) => operation(),
    })

    await expect(source.generateDraft(draftRequest())).rejects.toMatchObject({
      code: 'CHAPTER_STAGE_RESULT_INVALID',
    })
    await expect(source.executeAgent(
      'revision', 'revision_prose', 'prose-agent', project, { task: '修订' },
    )).rejects.toMatchObject({ code: 'CHAPTER_STAGE_RESULT_INVALID' })
    expect(traps).toBe(0)

    const providerFailure = new TypeError('ordinary provider failure')
    const ordinaryFailureSource = new ModelGenerationSource({
      modelId: 217,
      provenance: {
        task_id: 'task-provider-failure', project_id: 5, chapter_id: 12,
        source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
        context_version: `sha256:${'b'.repeat(64)}`,
      },
      generateChapterProse: async () => { throw providerFailure },
      executeAgent: async () => { throw providerFailure },
      recordStage: async (_stage, _request, operation) => operation(),
    })
    await expect(ordinaryFailureSource.generateDraft(draftRequest())).rejects.toBe(providerFailure)
    await expect(ordinaryFailureSource.executeAgent(
      'revision', 'revision_prose', 'prose-agent', project, { task: '修订' },
    )).rejects.toBe(providerFailure)
  })
})

describe('McpGenerationSource', () => {
  test('clears the session fence before transferring a JSON-invisible production lease', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-production-lease-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_production_lease', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Production lease transfer',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const events: string[] = []
    const lease = {
      tupleKey: 'production-lease',
      binding: { serverId: server.id, keyId: key.id, agentId: 'agent-1' },
      stageSessionFence: async () => { events.push('stage') },
      quarantine: async () => { events.push('quarantine') },
      clearSessionFence: async () => { events.push('clear') },
      release: async () => { events.push('release') },
    }
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => ({
        prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
        source: 'mcp',
        adapter_id: server.adapter_id,
        agent_id: 'agent-1',
        session_id: 'session-production-lease',
        snapshot_hash: 'snapshot-production-lease',
        completed: true,
      }),
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: async () => lease,
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(events).toEqual(['clear'])
    expect(Object.keys(result)).not.toContain('generationLease')
    expect(JSON.stringify(result)).not.toContain('mcp-production-lease')
    expect(JSON.stringify((result as any).source_receipt)).not.toContain('mcp-production-lease')
    const transferred = takeProductionLease(result)
    expect(transferred).toBe(lease)
    await transferred?.release()
    expect(events).toEqual(['clear', 'release'])
  })

  test('persists a bounded session-created receipt before allowing the Adapter to send', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-session-receipt-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_session_receipt', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Session receipt',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const events: string[] = []
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created',
          status: 'running',
          session_id: 'session-1',
          snapshot_hash: 'snapshot-1',
        })
        const [receipt] = (await listNovelRuns(workspace, project.id))
          .filter(run => run.run_type === 'mcp_generate_prose')
        const output = JSON.parse(receipt!.output_ref!)
        expect(receipt).toMatchObject({ status: 'session_created' })
        expect(output).toMatchObject({
          status: 'session_created',
          request_id: 'request-12',
          receipt_run_id: receipt!.id,
          session_id: 'session-1',
          snapshot_hash: 'snapshot-1',
        })
        expect(receipt!.output_ref).not.toContain('sk_session_receipt')
        expect(receipt!.output_ref).not.toContain(input.paragraphTask)
        events.push('receipt')
        events.push('send')
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(events).toEqual(['receipt', 'send'])
    await releaseTransferredProductionLease(result)
  })

  test('prevents send when the session-created durable receipt cannot be updated', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-session-receipt-failure-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_session_failure', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Session receipt failure',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const events: string[] = []
    const caller = new AbortController()
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        const db = new Database(join(workspace, 'novel.sqlite'))
        db.run("DELETE FROM runs WHERE run_type = 'mcp_generate_prose'")
        db.close()
        try {
          await input.onProgress({
            stage: 'session_created',
            status: 'running',
            session_id: 'session-1',
            snapshot_hash: 'snapshot-1',
          })
        } catch (error) {
          queueMicrotask(() => caller.abort())
          await Promise.resolve()
          throw error
        }
        events.push('send')
        throw new Error('send should not be reached')
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      signal: caller.signal,
    }))).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })

    expect(events).toEqual([])
    expect(caller.signal.aborted).toBe(true)
  })

  test('starts the total deadline before remote connection and tool discovery', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-discovery-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, generation_timeout_ms: 100 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_discovery_timeout', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Discovery timeout',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 0
    let expire = () => {}
    const toolCalls: string[] = []
    const adapter = new BudaAdapter({
      listTools: async (options: any) => {
        const signal: AbortSignal | undefined = options?.signal
        if (!signal) throw new Error('deadline signal missing before tool discovery')
        queueMicrotask(expire)
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      },
      callTool: async (name: string) => {
        toolCalls.push(name)
        return { content: [] }
      },
    } as any)
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('unreachable') },
      getAdapterForKey: async (_keyId: number, _serverId: string, options: any) => {
        if (!options?.signal) throw new Error('deadline signal missing before connection discovery')
        return { server, key, adapter }
      },
    }
    const source = new McpGenerationSource(runtime as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => new McpGenerationDeadline(totalMs, signal, {
        now: () => now,
        setTimeout: callback => { expire = () => { now = totalMs; callback() }; return 1 },
        clearTimeout: () => {},
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    expect(toolCalls).toEqual([])
  })

  test('preserves caller cancellation as distinct from total timeout at the public boundary', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-caller-cancel-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_caller_cancel', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Caller cancel',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const caller = new AbortController()
    caller.abort()
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [],
      getAdapterForKey: async () => { throw new Error('remote discovery must not start') },
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      signal: caller.signal,
    }))).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
  })

  test('does not commit success when the Adapter returns at the exact total deadline', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-final-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, generation_timeout_ms: 100 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_final_deadline', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Final deadline',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => {
        now = 100
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'late prose' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => new McpGenerationDeadline(totalMs, signal, {
        now: () => now,
        setTimeout: () => 1,
        clearTimeout: () => {},
      }),
    })

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'timed_out' })
  })

  test('passes one shrinking deadline through adapter discovery and binding validation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-shared-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, startup_timeout_ms: 5_000, tool_timeout_ms: 100_000, generation_timeout_ms: 100_000 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_shared_deadline', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Shared deadline',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 50_000
    let deadline!: McpGenerationDeadline
    const observed: Array<{ signal: AbortSignal, timeoutMs: number }> = []
    const adapter = {
      listAgents: async (options: any) => {
        observed.push({ signal: options.signal, timeoutMs: options.timeoutMs })
        now += 1_000
        return [{ id: 'agent-1', name: '正文 Agent' }]
      },
      generateProse: async (input: any) => {
        observed.push({ signal: input.deadline.signal, timeoutMs: input.deadline.timeoutMs(server.tool_timeout_ms) })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async (_keyId: number, _serverId: string, options: any) => {
        observed.push({ signal: options.signal, timeoutMs: options.timeoutMs })
        now += 1_000
        return { server, key, adapter }
      },
    }
    const source = new McpGenerationSource(runtime as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => {
        deadline = new McpGenerationDeadline(totalMs, signal, {
          now: () => now,
          setTimeout: () => 1,
          clearTimeout: () => {},
        })
        return deadline
      },
    } as any)

    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(observed.every(options => options.signal === deadline.signal)).toBe(true)
    expect(observed.map(options => options.timeoutMs)).toEqual([5_000, 99_000, 98_000])
    await releaseTransferredProductionLease(result)
  })

  test('sends the exact compiled task, stores bounded receipt provenance, and never calls a model', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_source', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '长篇测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    let captured: any = null
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        captured = input
        await input.onProgress?.({ stage: 'mcp_drive_sync', status: 'success', snapshot_hash: 'snapshot-1' })
        await input.onProgress?.({ stage: 'mcp_session_create', status: 'success', session_id: 'session-1' })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key: { id: key.id }, adapter }),
    }
    const source = new McpGenerationSource(runtime as any)
    const paragraphTask = '完整段落任务：前因、当前冲突、后果与输出合同。'
    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, paragraphTask }))
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )

    expect(captured.paragraphTask).toBe(paragraphTask)
    expect(captured.drive).toMatchObject({ writingBible: expect.stringContaining('克制'), storyState: { place: '北城' } })
    expect(result).toMatchObject({
      source: 'mcp',
      session_id: 'session-1',
      snapshot_hash: 'snapshot-1',
      source_receipt: {
        receipt_authority: 'mcp_generation_source_v1',
        request_id: 'request-12',
        server_id: 'buda',
        key_id: key.id,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        binding_fingerprint: expectedFingerprint,
        status: 'success',
      },
    })
    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'success' })
    expect(receipts[0]?.input_ref).not.toContain(paragraphTask)
    expect(receipts[0]?.output_ref).not.toContain('MCP 正文')
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      binding_fingerprint: expectedFingerprint,
      status: 'success',
    })
    const receiptJson = JSON.stringify((result as any).source_receipt)
    expect(receiptJson).not.toContain('sk_source')
    expect(receiptJson).not.toContain(paragraphTask)
    expect(receiptJson).not.toContain('MCP 正文')
    await releaseTransferredProductionLease(result)
  })

  test('preserves the authoritative fingerprint while scrubbing short Key and Header substrings', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-short-secret-'))
    workspaces.push(workspace)
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': 'sha' },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'a', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '短凭据指纹测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )
    let runningFingerprint = ''
    const progress: any[] = []
    const adapter = {
      listAgents: async () => {
        const [runningReceipt] = (await listNovelRuns(workspace, project.id))
          .filter(run => run.run_type === 'mcp_generate_prose')
        runningFingerprint = JSON.parse(runningReceipt!.output_ref!).binding_fingerprint
        return [{ id: 'agent-1', name: '正文 Agent' }]
      },
      generateProse: async (input: any) => {
        await input.onProgress?.({
          stage: 'mcp_session_wait',
          status: 'running',
          session_id: 'session-a',
          detail: { key_echo: 'a', header_echo: 'sha' },
        })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: '短凭据正文原样保留。' }],
          source: 'mcp',
          adapter_id: server.adapter_id,
          agent_id: 'agent-1',
          session_id: 'session-a',
          snapshot_hash: 'snapshot-sha-a',
          binding_fingerprint: `sha256:${'f'.repeat(64)}`,
          raw: { key_echo: 'a', header_echo: 'sha' },
          completed: true,
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => ({ ...args[3], adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      requestId: 'request-a',
      onProgress: (event: any) => { progress.push(event) },
    }))

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    const returnedReceipt = (result as any).source_receipt
    for (const fingerprint of [runningFingerprint, storedOutput.binding_fingerprint, returnedReceipt.binding_fingerprint]) {
      expect(fingerprint).toBe(expectedFingerprint)
      expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    }
    expect(acceptanceBindingFingerprintFromGenerationSource({
      resolved_type: 'mcp',
      ...returnedReceipt,
    })).toBe(expectedFingerprint)
    expect(returnedReceipt).toMatchObject({
      server_id: 'bud[REDACTED]',
      adapter_id: 'bud[REDACTED]',
      agent_id: '[REDACTED]gent-1',
      request_id: 'request-[REDACTED]',
      session_id: 'session-[REDACTED]',
      snapshot_hash: 'sn[REDACTED]pshot-[REDACTED]-[REDACTED]',
    })
    expect((result as any).raw).toEqual({ key_echo: '[REDACTED]', header_echo: '[REDACTED]' })
    expect(progress.find(event => event.session_id)).toMatchObject({
      session_id: 'session-[REDACTED]',
      detail: { key_echo: '[REDACTED]', header_echo: '[REDACTED]' },
    })
    await releaseTransferredProductionLease(result)
  })

  test('preserves the authoritative fingerprint in failed receipts with short secrets', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-short-secret-failure-'))
    workspaces.push(workspace)
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': 'sha' },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'a', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '短凭据失败指纹测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-a' },
        },
      },
    })
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )
    const progress: any[] = []
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => ({
        ...args[3],
        adapter: { listAgents: async () => [] },
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      onProgress: (event: any) => { progress.push(event) },
    }))).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    expect(storedOutput).toMatchObject({
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: expectedFingerprint,
      agent_id: '[REDACTED]gent-[REDACTED]',
    })
    expect(storedOutput.binding_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(acceptanceBindingFingerprintFromGenerationSource({
      resolved_type: 'mcp',
      ...storedOutput,
    })).toBe(expectedFingerprint)
    expect(receipt?.error_message).not.toContain('agent-a')
    expect(progress.find(event => event.status === 'failed')?.detail).not.toContain('agent-a')
  })

  test('preserves the MCP error and stores a bounded failed receipt when live validation fails', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-failure-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_failure', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '失败测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'missing-agent' },
        },
      },
    })
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [],
      getAdapterForKey: async (...args: any[]) => ({
        ...args[3],
        adapter: { listAgents: async () => [] },
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      onProgress: () => undefined,
    }))).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'failed' })
    expect(receipts[0]?.output_ref).not.toContain('完整段落任务')
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      binding_fingerprint: proseGenerationSourceFingerprint(
        project.reference_config!.prose_generation_source as any,
      ),
      status: 'failed',
    })
  })

  test('scrubs stored credentials before an Agent-validation failure can persist colliding binding identifiers', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-pre-scrub-'))
    workspaces.push(workspace)
    const selectedHeader = 'synthetic-generation-header-value'
    const selectedKey = 'credential-value-before-remote-validation'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '早期校验凭据碰撞',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: selectedHeader,
          },
        },
      },
    })
    let adapterResolved = false
    let runningDurable = ''
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => {
        adapterResolved = true
        return {
          ...args[3],
          adapter: {
            listAgents: async () => {
              const [runningReceipt] = (await listNovelRuns(workspace, project.id))
                .filter(run => run.run_type === 'mcp_generate_prose')
              expect(runningReceipt).toMatchObject({ status: 'running' })
              runningDurable = JSON.stringify({
                input_ref: runningReceipt?.input_ref,
                output_ref: runningReceipt?.output_ref,
              })
              return []
            },
          },
        }
      },
    } as any)
    const progress: any[] = []
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({
        activeWorkspace: workspace,
        project,
        onProgress: (event: any) => { progress.push(event) },
      }))
    } catch (error) {
      exposedError = error
    }

    expect(adapterResolved).toBe(true)
    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    const exposed = JSON.stringify({ message: exposedError?.message, details: exposedError?.details })
    const failedProgress = JSON.stringify(progress.find(event => event.stage === 'mcp_connect' && event.status === 'failed'))
    for (const secret of [selectedHeader, selectedKey]) {
      expect(runningDurable).not.toContain(secret)
      expect(durable).not.toContain(secret)
      expect(exposed).not.toContain(secret)
      expect(failedProgress).not.toContain(secret)
    }
    const storedOutput = JSON.parse(receipt!.output_ref!)
    expect(storedOutput.binding_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(storedOutput.binding_fingerprint).not.toContain(selectedHeader)
    expect(JSON.parse(JSON.parse(runningDurable).output_ref).binding_fingerprint)
      .toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  test('pins the latest scrubbed credential after rotation between the early receipt and lease acquisition', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-rotation-'))
    workspaces.push(workspace)
    const initialKey = 'credential-before-agent-validation'
    const rotatedKey = 'credential-after-agent-validation'
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: initialKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '凭据轮换快照',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: 'agent-1',
          },
        },
      },
    })
    let unpinnedListAgentsCalls = 0
    let pinnedCredential: any
    const source = new McpGenerationSource({
      resolveCredentialConfig: async (...args: any[]) => args[2] || { server, key: { ...key, key: rotatedKey } },
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => {
        unpinnedListAgentsCalls += 1
        throw new McpError('MCP_RUNTIME_ERROR', `remote reflected ${rotatedKey}`, { echo: rotatedKey })
      },
      getAdapterForKey: async (...args: any[]) => {
        pinnedCredential = args[3]
        const reflected = String(pinnedCredential?.key?.key || initialKey)
        return {
          server: pinnedCredential?.server || server,
          key: pinnedCredential?.key || key,
          adapter: {
            listAgents: async () => {
              throw new McpError('MCP_RUNTIME_ERROR', `remote reflected ${reflected}`, { echo: reflected })
            },
          },
        }
      },
    } as any)
    let signalBlockerEntered!: () => void
    let signalRotation!: () => void
    const blockerEntered = new Promise<void>(resolve => { signalBlockerEntered = resolve })
    const rotateWhileHeld = new Promise<void>(resolve => { signalRotation = resolve })
    const blocker = withMcpWorkspaceMutation(workspace, async () => {
      signalBlockerEntered()
      await rotateWhileHeld
      await updateMcpKey(workspace, key.id, { key: rotatedKey })
    })
    await blockerEntered
    let exposedError: any
    const generation = source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))
    const generationOutcome = generation.then(
      () => undefined,
      error => { exposedError = error },
    )
    let runningReceipt
    for (let attempts = 0; attempts < 100 && !runningReceipt; attempts += 1) {
      runningReceipt = (await listNovelRuns(workspace, project.id))
        .find(run => run.run_type === 'mcp_generate_prose' && run.status === 'running')
      if (!runningReceipt) await new Promise(resolve => setTimeout(resolve, 0))
    }
    expect(runningReceipt).toBeDefined()
    signalRotation()
    await blocker

    await generationOutcome

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    const exposed = JSON.stringify({ message: exposedError?.message, details: exposedError?.details })
    for (const secret of [initialKey, rotatedKey]) {
      expect(durable).not.toContain(secret)
      expect(exposed).not.toContain(secret)
    }
    expect(unpinnedListAgentsCalls).toBe(0)
    expect(pinnedCredential).toMatchObject({
      server: { id: server.id },
      key: { id: key.id, key: rotatedKey },
    })
  })

  test('bounds scrubbed receipt identifiers after successful credential resolution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-bounded-'))
    workspaces.push(workspace)
    const selectedHeader = 'synthetic-bounded-header-value'
    const selectedKey = 'credential-value-for-bounded-success'
    const serverId = `server-${'s'.repeat(320)}`
    const agentId = `agent-${'a'.repeat(320)}`
    const sessionId = `session-${'x'.repeat(640)}`
    const snapshotHash = `snapshot-${'y'.repeat(640)}`
    const paragraphTask = 'bounded receipt prompt must remain hash-only'
    const proseText = 'bounded receipt prose must never be durable'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: serverId,
      display_name: 'Bounded Test Server',
      custom_headers: { 'X-Space': selectedHeader },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '有界成功回执',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: agentId,
          },
        },
      },
    })
    const adapter = {
      listAgents: async () => [{ id: agentId, name: 'Long Agent' }],
      generateProse: async () => ({
        prose_chapters: [{ chapter_no: 12, chapter_text: proseText }],
        source: 'mcp',
        adapter_id: server.adapter_id,
        agent_id: agentId,
        session_id: sessionId,
        snapshot_hash: snapshotHash,
        completed: true,
      }),
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: agentId, name: 'Long Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      paragraphTask,
    }))

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    const returnedReceipt = (result as any).source_receipt
    for (const field of ['server_id', 'adapter_id', 'agent_id', 'session_id', 'snapshot_hash', 'binding_fingerprint']) {
      expect(String(storedOutput[field] || '').length).toBeLessThanOrEqual(160)
      expect(String(returnedReceipt[field] || '').length).toBeLessThanOrEqual(160)
    }
    const durable = JSON.stringify({ input_ref: receipt?.input_ref, output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    for (const forbidden of [selectedHeader, selectedKey, paragraphTask, proseText]) {
      expect(durable).not.toContain(forbidden)
    }
    await releaseTransferredProductionLease(result)
  })

  test('scrubs selected credentials from progress, exposed errors, and durable failed receipts', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-scrub-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_generation_reflection'
    const selectedHeader = 'synthetic-generation-header-value'
    const selectedCookie = 'session=synthetic-generation-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '反射失败测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress?.({
          stage: 'mcp_session_wait',
          status: 'failed',
          session_id: 'session-safe-1',
          snapshot_hash: 'snapshot-safe-1',
          detail: {
            message: `Authorization: Bearer ${selectedKey}`,
            nested: [`X-Space=${selectedHeader}`, `Cookie: ${selectedCookie}`],
            agent_id: 'agent-1',
          },
        })
        throw new McpError(
          'MCP_SESSION_FAILED',
          `upstream reflected ${selectedKey} and ${selectedHeader}`,
          {
            authorization: `Bearer ${selectedKey}`,
            nested: { message: selectedHeader, cookie: selectedCookie },
            adapter_id: 'buda',
            agent_id: 'agent-1',
          },
        )
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)
    const progress: any[] = []
    const paragraphTask = 'synthetic prose prompt that must only be represented by its hash'
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({
        activeWorkspace: workspace,
        project,
        paragraphTask,
        onProgress: (event: any) => { progress.push(event) },
      }))
    } catch (error) {
      exposedError = error
    }

    expect(exposedError).toMatchObject({
      code: 'MCP_SESSION_FAILED',
      error_code: 'MCP_SESSION_FAILED',
      details: { adapter_id: 'buda', agent_id: 'agent-1' },
    })
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain(selectedKey)
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain(selectedHeader)
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain('synthetic-generation-cookie')

    const reflectedProgress = progress.find(event => event.stage === 'mcp_session_wait')
    expect(reflectedProgress).toMatchObject({
      session_id: 'session-safe-1',
      snapshot_hash: 'snapshot-safe-1',
      detail: { agent_id: 'agent-1' },
    })
    expect(JSON.stringify(reflectedProgress)).not.toContain(selectedKey)
    expect(JSON.stringify(reflectedProgress)).not.toContain(selectedHeader)
    expect(JSON.stringify(reflectedProgress)).not.toContain('synthetic-generation-cookie')

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipts[0]?.output_ref, error_message: receipts[0]?.error_message })
    expect(durable).not.toContain(selectedKey)
    expect(durable).not.toContain(selectedHeader)
    expect(durable).not.toContain('synthetic-generation-cookie')
    expect(durable).not.toContain(paragraphTask)
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      server_id: 'buda',
      key_id: key.id,
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-safe-1',
      snapshot_hash: 'snapshot-safe-1',
      status: 'failed',
      error_code: 'MCP_SESSION_FAILED',
    })
  })

  test('preserves successful prose exactly while scrubbing every returned and durable metadata field', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-success-metadata-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_success_metadata_reflection'
    const selectedHeader = 'synthetic-success-metadata-header'
    const selectedCookie = 'session=synthetic-success-metadata-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '成功元数据反射测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const proseText = `正文中的字面量必须原样保留：${selectedKey} / ${selectedHeader} / ${selectedCookie}`
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => ({
        prose_chapters: [{ chapter_no: 12, title: '原样正文', chapter_text: proseText }],
        source: 'mcp',
        adapter_id: 'buda',
        agent_id: 'agent-1',
        session_id: `session-${selectedKey}`,
        snapshot_hash: `snapshot-${selectedHeader}`,
        completed: true,
        raw: {
          request_id: 'request-12',
          session_status: 'completed',
          reflected_cookie: selectedCookie,
          safe: 'raw-safe',
        },
        usage: {
          output_tokens: 321,
          nested: { reflected_key: selectedKey, safe: 'usage-safe' },
        },
        extra_metadata: { reflected_header: selectedHeader, status: 'complete' },
      }),
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(result.prose_chapters).toEqual([{ chapter_no: 12, title: '原样正文', chapter_text: proseText }])
    const { prose_chapters: _proseChapters, ...returnedMetadata } = result
    const serializedMetadata = JSON.stringify(returnedMetadata)
    expect(serializedMetadata).not.toContain(selectedKey)
    expect(serializedMetadata).not.toContain(selectedHeader)
    expect(serializedMetadata).not.toContain('synthetic-success-metadata-cookie')
    expect(returnedMetadata).toMatchObject({
      source: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      completed: true,
      raw: { request_id: 'request-12', session_status: 'completed', safe: 'raw-safe' },
      usage: { output_tokens: 321, nested: { safe: 'usage-safe' } },
      extra_metadata: { status: 'complete' },
      source_receipt: {
        server_id: 'buda',
        key_id: key.id,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        status: 'success',
      },
    })

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'success' })
    expect(receipts[0]?.output_ref).not.toContain(selectedKey)
    expect(receipts[0]?.output_ref).not.toContain(selectedHeader)
    expect(receipts[0]?.output_ref).not.toContain('synthetic-success-metadata-cookie')
    expect(receipts[0]?.output_ref).not.toContain(proseText)
    await releaseTransferredProductionLease(result)
  })

  test('preserves scrubbed enumerable non-MCP error metadata and protected blocked-invalid residual prose', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-error-metadata-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_error_metadata_reflection'
    const selectedHeader = 'synthetic-error-metadata-header'
    const selectedCookie = 'session=synthetic-error-metadata-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '错误元数据反射测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const residualText = `${'受保护的 blocked-invalid 残余正文必须逐字保留。'.repeat(20)} ${selectedKey} ${selectedHeader}`
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => {
        const failure: any = new Error(`adapter reflected ${selectedKey} and ${selectedHeader}`)
        failure.name = 'AdapterBlockedError'
        failure.code = 'MCP_SESSION_FAILED'
        failure.error_code = 'MCP_SESSION_FAILED'
        failure.admission_status = 'blocked_invalid'
        failure.retry_after_ms = 750
        failure.status = 'failed'
        failure.chapter_id = 22
        failure.chapter_no = 12
        failure.provenance = { server_id: 'buda', agent_id: 'agent-1', reflected: selectedHeader }
        failure.chapter_text = residualText
        failure.finalText = residualText
        failure.details = {
          chapter_text: residualText,
          cookie: selectedCookie,
          safe: 'details-safe',
          nested: { reflected_key: selectedKey, status: 'failed' },
        }
        Object.defineProperty(failure, 'stack', { value: `stack reflected ${selectedKey}`, enumerable: true })
        throw failure
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))
    } catch (error) {
      exposedError = error
    }

    expect(exposedError).toMatchObject({
      name: 'AdapterBlockedError',
      code: 'MCP_SESSION_FAILED',
      error_code: 'MCP_SESSION_FAILED',
      admission_status: 'blocked_invalid',
      retry_after_ms: 750,
      status: 'failed',
      chapter_id: 22,
      chapter_no: 12,
      provenance: { server_id: 'buda', agent_id: 'agent-1' },
      details: { safe: 'details-safe', nested: { status: 'failed' } },
    })
    expect(exposedError.chapter_text).toBe(residualText)
    expect(exposedError.finalText).toBe(residualText)
    expect(exposedError.details.chapter_text).toBe(residualText)
    expect(Object.prototype.propertyIsEnumerable.call(exposedError, 'stack')).toBe(false)
    const { chapter_text: _chapterText, finalText: _finalText, details, ...metadata } = exposedError
    const { chapter_text: _detailsChapterText, ...detailsMetadata } = details
    const serializedMetadata = JSON.stringify({
      ...metadata,
      message: exposedError.message,
      details: detailsMetadata,
    })
    expect(serializedMetadata).not.toContain(selectedKey)
    expect(serializedMetadata).not.toContain(selectedHeader)
    expect(serializedMetadata).not.toContain('synthetic-error-metadata-cookie')

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    const durable = JSON.stringify({ output_ref: receipts[0]?.output_ref, error_message: receipts[0]?.error_message })
    expect(durable).not.toContain(selectedKey)
    expect(durable).not.toContain(selectedHeader)
    expect(durable).not.toContain('synthetic-error-metadata-cookie')
    expect(durable).not.toContain(residualText)
  })
})
