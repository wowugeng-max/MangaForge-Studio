import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import {
  listChapterVersions,
  listNovelChapterSettingUsage,
  listNovelChapters,
  listNovelCharacters,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  getNovelProject,
  updateNovelProject,
} from '../../novel'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { McpAgentLeaseRegistry } from '../../mcp/agent-lease'
import { buildPipelineProse, createProsePipelineHarness } from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'
import { runGenerateChapterDraftProse } from './generate-chapter-draft-prose'
import { attachProductionLease, takeProductionLease } from '../generation-source/production-lease'
import { acceptanceBindingFingerprintFromGenerationSource } from '../generation-source/types'
import { setNovelMutationTestHook } from '../../novel-test-support'
import { registerNovelMcpBindingRoutes } from '../../routes/novel-mcp-binding-routes'

const workspaces: string[] = []
const fakeAgentLeases = new McpAgentLeaseRegistry()
const acquireFakeAgentLease = (activeWorkspace: string, binding: any) =>
  fakeAgentLeases.acquire(activeWorkspace, binding)

afterEach(async () => {
  setNovelMutationTestHook(null)
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'post', 'put']) {
    app[method] = (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) {
        handlers.set(`${method.toUpperCase()} ${path}`, handler)
      }
      return app
    }
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

async function createLeasedMcpPipeline(options: {
  draftText: string
  remoteResult?: Record<string, any>
  harnessOptions?: Record<string, any>
  beforeChapterStore?: () => Promise<void> | void
}) {
  const events: string[] = []
  let adapter: any
  let releaseCalls = 0
  const mcpRuntime = {
    resolveCredentialConfig: async (_keyId: number, _serverId: string, snapshot: unknown) => snapshot,
    acquireAgentLease: async (activeWorkspace: string, binding: any) => {
      const lease = await acquireFakeAgentLease(activeWorkspace, binding)
      return {
        ...lease,
        release: async () => {
          releaseCalls += 1
          events.push('lease-released')
          await lease.release()
        },
      }
    },
    listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
    isAgentLeaseActive: (activeWorkspace: string, binding: any) => fakeAgentLeases.isActive(activeWorkspace, binding),
    getAdapterForKey: async (...args: any[]) => ({ ...args[3], adapter }),
  }
  const harness = await createProsePipelineHarness(
    ctx => {
      const beforeChapterStore = ctx.runtime.hooks.beforeChapterStore
      const beforeStoryState = ctx.runtime.hooks.beforeStoryState
      ctx.runtime.hooks.beforeChapterStore = async (input: any) => {
        await beforeChapterStore(input)
        events.push('before-chapter-store')
        await options.beforeChapterStore?.()
      }
      ctx.runtime.hooks.beforeStoryState = async (input: any) => {
        await beforeStoryState(input)
        events.push('before-story-state')
      }
      return createNovelWritingService({ ...ctx, mcpRuntime: mcpRuntime as any })
    },
    { draftText: options.draftText, ...(options.harnessOptions || {}) },
  )
  workspaces.push(harness.workspace)
  await writeMcpServers(harness.workspace, [BUDA_MCP_SERVER_TEMPLATE])
  const key = await createMcpKey(harness.workspace, {
    mcp_server_id: 'buda',
    key: 'fixture-key-production-lease',
    description: '账号',
  })
  const binding = { serverId: 'buda', keyId: key.id, agentId: 'agent-1' }
  adapter = {
    listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
    generateProse: async (input: any) => {
      events.push('remote-completed')
      return {
        prose_chapters: [{ chapter_no: 10, chapter_text: options.draftText }],
        source: 'mcp',
        adapter_id: 'buda',
        agent_id: 'agent-1',
        session_id: 'session-production-lease',
        snapshot_hash: 'snapshot-production-lease',
        completed: true,
        raw: { request_id: input.requestId, session_status: 'completed' },
        ...(options.remoteResult || {}),
      }
    },
  }
  harness.project.reference_config.prose_generation_source = {
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
  }
  await updateNovelProject(harness.workspace, harness.project.id, {
    reference_config: harness.project.reference_config,
  } as any)
  return {
    ...harness,
    key,
    binding,
    mcpRuntime,
    events,
    get releaseCalls() { return releaseCalls },
  }
}

describe('chapter draft GenerationSource integration', () => {
  test('releases a logically consumed Proxy capability on the first local draft failure', async () => {
    let releases = 0
    const lease = { release: async () => { releases += 1 } }
    const target = attachProductionLease({
      prose_chapters: [{ chapter_no: 10, chapter_text: '不会到达正文提取' }],
      source: 'mcp' as const,
    }, lease)
    const protectedResult = new Proxy(target, {
      deleteProperty: () => { throw new Error('capability delete blocked') },
    })

    const error = await runGenerateChapterDraftProse({
      activeWorkspace: '/tmp/proxy-production-lease',
      project: { id: 1, reference_config: {} },
      chapter: { id: 10, chapter_no: 10, title: '第十章' },
      chapters: [],
      worldbuilding: {},
      characters: [],
      outlines: [],
      contextPackage: {},
      generationContract: {},
      wordTarget: { target: 1000 },
      preferredModelId: 217,
      options: { request_id: 'proxy-production-lease' },
      getStageModelId: () => 217,
      generationSourceResolver: {
        resolve: () => ({
          configured_type: 'mcp',
          resolved_type: 'mcp',
          override: null,
          source: { generateProse: async () => protectedResult },
        }),
      } as any,
      getReferenceMigrationPlanForChapter: async () => ({}),
      throwIfChapterGenerationAborted: () => {},
      onStage: async (stage: string) => {
        if (stage === 'quality_pipeline') throw new Error('injected post-handoff failure')
      },
    }).then(() => null, caught => caught)

    expect(error?.message).toContain('injected post-handoff failure')
    expect(releases).toBe(1)
    expect(takeProductionLease(protectedResult)).toBeUndefined()
  })

  test('returns lease ownership in a trusted own data property for the group handoff', async () => {
    let releases = 0
    const lease = { release: async () => { releases += 1 } }
    const sourceResult = attachProductionLease({
      prose_chapters: [{ chapter_no: 10, chapter_text: '江澈撞开铁门，立即夺下追兵的通讯器。' }],
      source: 'mcp' as const,
      completed: true,
    }, lease)

    const bundle = await runGenerateChapterDraftProse({
      activeWorkspace: '/tmp/plain-production-lease',
      project: { id: 1, reference_config: {} },
      chapter: { id: 10, chapter_no: 10, title: '第十章' },
      chapters: [],
      worldbuilding: {},
      characters: [],
      outlines: [],
      contextPackage: {},
      generationContract: {},
      wordTarget: { target: 1000 },
      preferredModelId: 217,
      options: { request_id: 'plain-production-lease' },
      getStageModelId: () => 217,
      generationSourceResolver: {
        resolve: () => ({
          configured_type: 'mcp',
          resolved_type: 'mcp',
          override: null,
          source: { generateProse: async () => sourceResult },
        }),
      } as any,
      getReferenceMigrationPlanForChapter: async () => ({}),
      throwIfChapterGenerationAborted: () => {},
      onStage: async () => {},
    })

    const descriptor = Object.getOwnPropertyDescriptor(bundle, 'generationLease')
    expect(descriptor).toMatchObject({ value: lease, enumerable: true })
    expect(descriptor?.get).toBeUndefined()
    await descriptor?.value?.release()
    expect(releases).toBe(1)
  })

  for (const productionMode of ['draft_review_revise_store', 'zhuque_fast']) {
    test(`keeps the MCP binding fenced inside the real ${productionMode} acceptance transaction`, async () => {
      const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
      const harness = await createLeasedMcpPipeline({ draftText })
      const { app, handlers } = createRouteHarness()
      registerNovelMcpBindingRoutes(app, {
        getWorkspace: () => harness.workspace,
        getProject: getNovelProject,
        mcpRuntime: harness.mcpRuntime as any,
      })
      const bindingPath = '/api/novel/projects/:id/prose-generation-source'
      const bindingPut = handlers.get(`PUT ${bindingPath}`)
      const proposedSource = {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: {
          server_id: 'buda',
          key_id: harness.key.id,
          adapter_id: 'buda',
          agent_id: 'agent-2',
        },
      }
      let signalAcceptanceChecksComplete!: () => void
      const acceptanceChecksComplete = new Promise<void>(resolve => { signalAcceptanceChecksComplete = resolve })
      let allowAcceptance!: () => void
      const acceptanceMayContinue = new Promise<void>(resolve => { allowAcceptance = resolve })
      let blockedOnce = false
      let hookError: unknown
      let registryActiveAtLock: boolean | undefined
      let runtimeActiveAtLock: boolean | undefined
      let bindingResponse: any
      let projectBeforePut: any
      let projectAfterPut: any
      let liveAgentCalls = 0
      let bindingMutationAttempts = 0
      setNovelMutationTestHook(async event => {
        if (event.activeWorkspace !== harness.workspace) return
        if (event.operation === 'update-prose-generation-source') bindingMutationAttempts += 1
        if (event.operation !== 'acceptance'
          || event.phase !== 'after_mutation_lock_acquired'
          || blockedOnce) return
        blockedOnce = true
        try {
          harness.events.push('acceptance-lock-acquired')
          registryActiveAtLock = await fakeAgentLeases.isActive(harness.workspace, harness.binding)
          runtimeActiveAtLock = await harness.mcpRuntime.isAgentLeaseActive(harness.workspace, harness.binding)
          projectBeforePut = structuredClone(await getNovelProject(harness.workspace, harness.project.id))
          harness.mcpRuntime.listAgents = async () => {
            liveAgentCalls += 1
            throw new Error('live Agent validation must not run while the current tuple is leased')
          }
          bindingResponse = await withTimeout(callRoute(bindingPut, {
            params: { id: String(harness.project.id) },
            body: { source: proposedSource },
          }), `${productionMode} binding PUT`, 2_000)
          projectAfterPut = structuredClone(await getNovelProject(harness.workspace, harness.project.id))
        } catch (error) {
          hookError = error
        } finally {
          signalAcceptanceChecksComplete()
        }
        await acceptanceMayContinue
      })
      const stagePayloads: any[] = []
      const generation = harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        {
          model_id: 217,
          production_mode: productionMode,
          skip_humanize_postprocess: true,
          onStage: async (stage: string, payload: any) => {
            stagePayloads.push({ stage, ...payload })
            if (stage === 'store' && payload?.status === 'success') harness.events.push('store-finished')
            if (stage === 'story_state' && payload?.status !== 'running') harness.events.push('story-state-finished')
          },
        },
      )
      let barrierError: unknown
      try {
        await withTimeout(acceptanceChecksComplete, `${productionMode} real acceptance barrier`)
        expect(hookError).toBeUndefined()
        expect(registryActiveAtLock).toBe(true)
        expect(runtimeActiveAtLock).toBe(true)
        expect(bindingResponse?.statusCode).toBe(409)
        expect(bindingResponse?.body?.error_code).toBe('MCP_AGENT_BUSY')
        expect(projectAfterPut).toEqual(projectBeforePut)
        expect(liveAgentCalls).toBe(0)
        expect(bindingMutationAttempts).toBe(0)
        expect(harness.events).toContain('before-story-state')
        expect(harness.events).toContain('before-chapter-store')
        expect(harness.events).not.toContain('lease-released')
      } catch (error) {
        barrierError = error
      } finally {
        allowAcceptance()
      }
      const result = await withTimeout(generation, `${productionMode} full-production generation`)
      setNovelMutationTestHook(null)
      if (barrierError) throw barrierError

      const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id))
        .find(chapter => chapter.id === harness.chapter.id)
      expect(storedChapter?.chapter_text).toBe(result.chapter?.chapter_text)
      expect(storedChapter?.chapter_text).toContain('江澈')
      expect(await listChapterVersions(harness.workspace, harness.chapter.id)).toHaveLength(1)
      expect(harness.events).toContain('store-finished')
      expect(harness.events).toContain('story-state-finished')
      expect(harness.releaseCalls).toBe(1)
      expect(await fakeAgentLeases.isActive(harness.workspace, harness.binding)).toBe(false)
      expect(harness.events.at(-1)).toBe('lease-released')
      expect(harness.events.indexOf('store-finished')).toBeLessThan(harness.events.indexOf('lease-released'))
      expect(harness.events.indexOf('story-state-finished')).toBeLessThan(harness.events.indexOf('lease-released'))
      expect(Object.keys(result)).not.toContain('generationLease')
      expect(Object.keys(storedChapter?.raw_payload?.prose_generation_source || {})).not.toContain('generationLease')
      expect(stagePayloads.every(payload => (
        !Object.keys(payload).includes('generationLease')
        && Object.getOwnPropertySymbols(payload).length === 0
      ))).toBe(true)
      const serialized = JSON.stringify({ result, storedChapter, stagePayloads })
      expect(serialized).not.toContain('generationLease')
      expect(serialized).not.toContain('mcp-production-lease')
    })
  }

  for (const productionMode of ['draft_only', 'draft_review', 'draft_review_revise_store', 'zhuque_fast']) {
    test(`holds the MCP production lease through ${productionMode} local acceptance`, async () => {
      const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
      let enterStore!: () => void
      let allowStore!: () => void
      const storeEntered = new Promise<void>(resolve => { enterStore = resolve })
      const storeMayContinue = new Promise<void>(resolve => { allowStore = resolve })
      const harness = await createLeasedMcpPipeline({
        draftText,
        beforeChapterStore: async () => {
          enterStore()
          await storeMayContinue
        },
      })
      const stagePayloads: any[] = []

      const generation = harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        {
          model_id: 217,
          production_mode: productionMode,
          skip_humanize_postprocess: true,
          onStage: async (stage: string, payload: any) => {
            stagePayloads.push({ stage, ...payload })
          },
        },
      )
      await storeEntered
      const releasesBeforeStore = harness.events.filter(event => event === 'lease-released').length
      const eventsAtStore = [...harness.events]
      allowStore()
      const result = await generation

      expect(eventsAtStore).toContain('remote-completed')
      expect(releasesBeforeStore).toBe(0)
      if (productionMode === 'draft_review_revise_store' || productionMode === 'zhuque_fast') {
        expect(eventsAtStore).toContain('before-story-state')
      }
      expect(harness.releaseCalls).toBe(1)
      expect(harness.events.at(-1)).toBe('lease-released')
      expect(Object.keys(result)).not.toContain('generationLease')
      expect(Object.keys(result.chapter?.raw_payload?.prose_generation_source || {})).not.toContain('generationLease')
      expect(stagePayloads.every(payload => (
        !Object.keys(payload).includes('generationLease')
        && Object.getOwnPropertySymbols(payload).length === 0
      ))).toBe(true)
      const serialized = JSON.stringify({ result, stagePayloads })
      expect(serialized).not.toContain('generationLease')
      expect(serialized).not.toContain('mcp-production-lease')
    })
  }

  test('releases the transferred MCP production lease exactly once on representative local failures', async () => {
    const connectedText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    const disconnectedText = buildPipelineProse('清晨雾气散尽，陌生人踏进空旷的车站。', '检查墙上地图并记录站台号码')
    const cases = [
      {
        name: 'quality stage callback',
        draftText: connectedText,
        callOptions: {
          production_mode: 'draft_only',
          onStage: async (stage: string) => {
            if (stage === 'quality_pipeline') throw new Error('injected local quality failure')
          },
        },
        assertError: (error: any) => expect(error?.message).toContain('injected local quality failure'),
      },
      {
        name: 'post-draft quality review',
        draftText: connectedText,
        callOptions: {
          production_mode: 'draft_only',
          onStage: async (stage: string, payload: any) => {
            if (stage === 'review' && payload?.status === 'running') {
              throw new Error('injected post-draft quality failure')
            }
          },
        },
        assertError: (error: any) => expect(error?.message).toContain('injected post-draft quality failure'),
      },
      {
        name: 'transport admission',
        draftText: connectedText,
        remoteResult: { incomplete_details: { reason: 'max_tokens' } },
        callOptions: { production_mode: 'draft_only' },
        assertError: (error: any) => expect(error?.code).toBe('PROSE_DRAFT_TRUNCATED'),
      },
      {
        name: 'empty prose extraction',
        draftText: connectedText,
        remoteResult: { prose_chapters: [] },
        callOptions: { production_mode: 'draft_only' },
        assertError: (error: any) => expect(error?.admission_status).toBe('blocked_invalid'),
      },
      {
        name: 'early opening admission',
        draftText: disconnectedText,
        harnessOptions: {
          contextPackageOverride: {
            chapter_target: {
              previous_handoff: '沈砚攥紧暗金绢册，老陈守在地下通道。',
              requiredHandoffAnchors: ['沈砚', '暗金绢册', '老陈', '地下通道'],
              scene_cards: [{
                scene_no: 1,
                transition_from_previous: '暗金绢册继续发热，沈砚和老陈在地下通道等待。',
              }],
            },
            continuity: { previous_chapter: null },
          },
        },
        callOptions: { production_mode: 'draft_only' },
        assertError: (error: any) => expect(error?.code).toBe('PROSE_ADMISSION_BLOCKED_INVALID'),
      },
      {
        name: 'atomic acceptance',
        draftText: connectedText,
        callOptions: {
          production_mode: 'draft_only',
          onStage: async (stage: string, payload: any) => {
            if (stage === 'store' && payload?.status === 'running') {
              throw new Error('injected atomic acceptance failure')
            }
          },
        },
        assertError: (error: any) => expect(error?.admission_failure).toMatchObject({ source: 'atomic' }),
      },
    ]

    for (const failureCase of cases) {
      const harness = await createLeasedMcpPipeline(failureCase)
      const error = await harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        {
          model_id: 217,
          skip_humanize_postprocess: true,
          ...failureCase.callOptions,
        },
      ).then(() => null, (caught: any) => caught)

      expect(error, failureCase.name).toBeTruthy()
      failureCase.assertError(error)
      expect(harness.events).toContain('remote-completed')
      expect(harness.releaseCalls, failureCase.name).toBe(1)
      expect(harness.events.at(-1), failureCase.name).toBe('lease-released')
    }
  })

  test('routes only the initial draft through MCP while later quality stages remain local model stages', async () => {
    const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    let remoteCalls = 0
    let remotePrompt = ''
    let adapter: any
    const mcpRuntime = {
      resolveCredentialConfig: async (_keyId: number, _serverId: string, snapshot: unknown) => snapshot,
      acquireAgentLease: acquireFakeAgentLease,
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key: { id: 1 }, adapter }),
    }
    const harness = await createProsePipelineHarness(
      ctx => createNovelWritingService({ ...ctx, mcpRuntime: mcpRuntime as any }),
      { draftText },
    )
    workspaces.push(harness.workspace)
    await writeMcpServers(harness.workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(harness.workspace, { mcp_server_id: 'buda', key: 'sk_pipeline', description: '账号' })
    ;(mcpRuntime.getAdapterForKey as any) = async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key, adapter })
    adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        remoteCalls += 1
        remotePrompt = input.paragraphTask
        return {
          prose_chapters: [{ chapter_no: 10, chapter_text: draftText }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: input.requestId, session_status: 'completed' },
        }
      },
    }
    harness.project.reference_config.prose_generation_source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    await updateNovelProject(harness.workspace, harness.project.id, { reference_config: harness.project.reference_config } as any)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
      skip_humanize_postprocess: true,
    })

    expect(result).toBeTruthy()
    expect(remoteCalls).toBe(1)
    expect(remotePrompt.length).toBeGreaterThan(100)
    expect(harness.modelCalls.draft).toBe(0)
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(result.chapter.raw_payload.prose_generation_source).toMatchObject({
      configured_type: 'mcp',
      resolved_type: 'mcp',
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
      server_id: 'buda',
      key_id: key.id,
      request_id: expect.any(String),
      receipt_run_id: expect.any(Number),
      status: 'success',
    })
  })

  test('keeps model diagnostics locally authoritative and drops forged MCP receipts', async () => {
    const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    const forgedFingerprint = `sha256:${'a'.repeat(64)}`
    const forgedReceipt = {
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: forgedFingerprint,
      configured_type: 'mcp',
      resolved_type: 'mcp',
      override: 'mcp',
      server_id: 'attacker-server',
      key_id: 999,
      adapter_id: 'attacker-adapter',
      agent_id: 'attacker-agent',
      session_id: 'attacker-session',
      snapshot_hash: 'attacker-snapshot',
    }
    const harness = await createProsePipelineHarness(
      ctx => createNovelWritingService(ctx),
      {
        draftText,
        draftResult: {
          parsed: { chapter_no: 10, chapter_text: draftText },
          modelName: 'fake-model',
          source_receipt: forgedReceipt,
          adapter_id: forgedReceipt.adapter_id,
          agent_id: forgedReceipt.agent_id,
          session_id: forgedReceipt.session_id,
          snapshot_hash: forgedReceipt.snapshot_hash,
        },
      },
    )
    workspaces.push(harness.workspace)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
      skip_humanize_postprocess: true,
    })

    const diagnostics = result.chapter.raw_payload.prose_generation_source
    expect(diagnostics).toMatchObject({
      configured_type: 'model',
      resolved_type: 'model',
      override: null,
    })
    for (const field of [
      'receipt_authority',
      'binding_fingerprint',
      'server_id',
      'key_id',
      'adapter_id',
      'agent_id',
      'session_id',
      'snapshot_hash',
    ]) {
      expect(diagnostics).not.toHaveProperty(field)
    }
  })

  test('extracts an acceptance fence only from an authoritative bounded MCP receipt', () => {
    const extract = acceptanceBindingFingerprintFromGenerationSource
    const fingerprint = `sha256:${'b'.repeat(64)}`
    const authoritative = {
      resolved_type: 'mcp',
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: fingerprint,
    }

    expect(extract(authoritative)).toBe(fingerprint)
    for (const untrusted of [
      { ...authoritative, resolved_type: 'model' },
      { ...authoritative, receipt_authority: undefined },
      { ...authoritative, receipt_authority: 'adapter-forged' },
      { ...authoritative, binding_fingerprint: '' },
      { ...authoritative, binding_fingerprint: 42 },
      { ...authoritative, binding_fingerprint: `sha256:${'b'.repeat(65)}` },
      { ...authoritative, binding_fingerprint: '["prose_generation_source_v1","mcp"]' },
    ]) {
      expect(extract(untrusted)).toBe('')
    }
  })

  for (const productionMode of ['draft_only', 'draft_review', 'draft_review_revise_store']) {
    test(`rejects a changed MCP binding before ${productionMode} acceptance`, async () => {
      const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
      let adapter: any
      let harness: Awaited<ReturnType<typeof createProsePipelineHarness>>
      let bindingChanged = false
      const mcpRuntime = {
        resolveCredentialConfig: async (_keyId: number, _serverId: string, snapshot: unknown) => snapshot,
        acquireAgentLease: acquireFakeAgentLease,
        listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
        getAdapterForKey: async (...args: any[]) => ({ ...args[3], adapter }),
      }
      harness = await createProsePipelineHarness(
        ctx => {
          const beforeChapterStore = ctx.runtime.hooks.beforeChapterStore
          ctx.runtime.hooks.beforeChapterStore = async (input: any) => {
            await beforeChapterStore(input)
            bindingChanged = true
            const changedReferenceConfig = structuredClone(harness.project.reference_config)
            changedReferenceConfig.prose_generation_source.mcp.agent_id = 'agent-2'
            await updateNovelProject(harness.workspace, harness.project.id, {
              reference_config: changedReferenceConfig,
            } as any)
          }
          return createNovelWritingService({ ...ctx, mcpRuntime: mcpRuntime as any })
        },
        { draftText },
      )
      workspaces.push(harness.workspace)
      await writeMcpServers(harness.workspace, [BUDA_MCP_SERVER_TEMPLATE])
      const key = await createMcpKey(harness.workspace, { mcp_server_id: 'buda', key: 'sk_pipeline_fence', description: '账号' })
      adapter = {
        listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
        generateProse: async () => ({
          prose_chapters: [{ chapter_no: 10, chapter_text: draftText }],
          source: 'mcp',
          adapter_id: 'buda',
          agent_id: 'agent-1',
          session_id: 'session-fence',
          snapshot_hash: 'snapshot-fence',
          completed: true,
        }),
      }
      harness.project.reference_config.prose_generation_source = {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
      }
      await updateNovelProject(harness.workspace, harness.project.id, {
        reference_config: harness.project.reference_config,
      } as any)
      const beforeAcceptance = {
        chapter: (await listNovelChapters(harness.workspace, harness.project.id))
          .find(item => item.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
        characters: await listNovelCharacters(harness.workspace, harness.project.id),
        worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
        settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
        usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      }
      let exposedError: any

      try {
        await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
          model_id: 217,
          production_mode: productionMode,
          skip_humanize_postprocess: true,
        })
      } catch (error) {
        exposedError = error
      }

      expect(bindingChanged).toBe(true)
      expect(exposedError).toMatchObject({
        name: 'McpError',
        code: 'MCP_BINDING_CHANGED',
        error_code: 'MCP_BINDING_CHANGED',
        details: { reason: 'binding_changed' },
      })
      const afterAcceptance = {
        chapter: (await listNovelChapters(harness.workspace, harness.project.id))
          .find(item => item.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
        characters: await listNovelCharacters(harness.workspace, harness.project.id),
        worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
        settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
        usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      }
      expect(afterAcceptance).toEqual(beforeAcceptance)
      await expect(withMcpWorkspaceMutation(harness.workspace, async () => 'released')).resolves.toBe('released')
    })
  }
})
