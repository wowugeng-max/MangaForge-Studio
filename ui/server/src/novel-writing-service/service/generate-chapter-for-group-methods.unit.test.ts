import { describe, expect, test } from 'bun:test'
import { createNovelWritingService } from './create-novel-writing-service'
import {
  buildPipelineProse,
  createProsePipelineHarness,
  proseQualityScores,
} from '../../routes/novel-writing-service.test-support'
import { runGenerateChapterContextAndSceneCards } from './generate-chapter-context-scene-cards'
import {
  commitNovelChapterAcceptance,
  createNovelSettingEntity,
  listNovelRuns,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  loadNovelMaterialRepairSnapshot,
  mutateNovelProjectGenerationSource,
  replaceNovelChapterSettingUsage,
} from '../../novel'
import { createMcpKey } from '../../mcp/key-store'
import { createMcpRuntime } from '../../mcp/runtime'
import { writeMcpServers } from '../../mcp/server-store'
import type { McpChapterInvocationInput, McpGenerationAdapter } from '../../mcp/adapters/types'
import { ChapterSourceLeaseRegistry } from '../generation-source/chapter-source-lease'
import {
  createChapterAuthorityFence,
  createGenerationSourceResolver,
} from '../generation-source/create-generation-source'
import { McpGenerationSource } from '../generation-source/mcp-generation-source'
import {
  chapterGenerationSourceFingerprint,
  toLegacyProseGenerationSource,
} from '../generation-source/source-config'
import { createMaterialRepairService } from './material-repair-service'
import { buildChapterContextPackage } from './chapter-context-package'

// The default harness draft is in range for the custom 1000-char target but has zero dialogue
// paragraphs, so the dialogue-texture floor would force word-target expansion unless the
// zhuque_fast expand:false lock actually reaches ensureProseMeetsWordTarget.
async function createExpansionCountingHarness() {
  const expansionTasks: string[] = []
  const harness = await createProsePipelineHarness((ctx: any) => {
    const innerExecuteAgent = ctx.runtime.executeAgent
    ctx.runtime.executeAgent = async (agent: string, project: any, input: any, opts: any) => {
      const task = String(input?.task || '')
      if (task.includes('任务：将本章正文扩写')) expansionTasks.push(task)
      return innerExecuteAgent(agent, project, input, opts)
    }
    return createNovelWritingService(ctx)
  }, {})
  return { harness, expansionTasks }
}

const compositionModelSource = {
  version: 'chapter_generation_source_v1' as const,
  active: 'model' as const,
  model: { model_id: 217 },
}

const compositionMcpSource = {
  version: 'chapter_generation_source_v1' as const,
  active: 'mcp' as const,
  model: { model_id: 217 },
  mcp: {
    server_id: 'generic-server',
    key_id: 7,
    adapter_id: 'generic-adapter',
    agent_id: 'generic-agent',
    model: '',
  },
}

function incompleteCompositionContext() {
  return {
    preflight: {
      ready: false,
      strict_ready: false,
      checks: [
        { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界观' },
        { key: 'chapter_setting_usage', ok: false, severity: 'high', fix: '绑定章节设定' },
      ],
      warnings: ['世界观和章节设定用法缺失'],
      blockers: ['世界观和章节设定用法缺失'],
    },
  }
}

type CompositionEvent = {
  kind: 'material' | 'prose'
  phase: 'begin' | 'stage' | 'commit' | 'reload' | 'draft' | 'close'
  taskId: string
  sessionId: string
  stage?: string
  status?: string
}

function createCompositionExecution(input: any, ctx: any, options: {
  events: CompositionEvent[]
  materialPayload?: any
  materialFailure?: Error
  afterMaterialClose?: () => void | Promise<void>
  onMaterialIdentity?: (identity: { taskId: string; sessionId: string }) => void
}) {
  const kind = input.options?.material_repair === true ? 'material' as const : 'prose' as const
  const provenance = Object.freeze({
    task_id: input.taskId,
    project_id: input.project.id,
    chapter_id: input.chapter.id,
    source: input.sourceState.active,
    source_fingerprint: input.fingerprint,
    authority_fingerprint: input.authorityFingerprint,
    context_version: input.contextVersion,
    ...(input.modelId ? { model_id: input.modelId } : {}),
  })
  const sessionId = String(provenance.session_id || '')
  if (kind === 'material') options.onMaterialIdentity?.({ taskId: input.taskId, sessionId })
  options.events.push({ kind, phase: 'begin', taskId: input.taskId, sessionId })
  return {
    taskId: input.taskId,
    source: input.sourceState.active,
    ...(input.sourceState.active === 'model' ? { modelId: input.modelId } : {}),
    authorityFingerprint: input.authorityFingerprint,
    fingerprint: input.fingerprint,
    contextVersion: input.contextVersion,
    provenance: () => provenance,
    generateDraft: async (request: any) => {
      options.events.push({ kind, phase: 'draft', taskId: input.taskId, sessionId })
      const result = await ctx.runtime.generateChapterProse(
        request.project,
        request.chapter,
        {
          ...request.modelContext,
          paragraphTask: request.paragraphTask,
          promptDiagnostics: request.promptDiagnostics,
          contextPackage: request.contextPackage,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          abortSignal: request.signal,
        },
        { activeWorkspace: request.activeWorkspace, modelId: String(input.modelId || 217), skipMemoryStore: true },
      )
      return { ...result, source: input.sourceState.active }
    },
    executeAgent: async (stage: string, _contract: string, agentId: string, project: any, context: any, runtimeOptions: any) => {
      options.events.push({ kind, phase: 'stage', taskId: input.taskId, sessionId, stage })
      if (kind === 'material') {
        if (options.materialFailure) throw options.materialFailure
        return { parsed: options.materialPayload || {} }
      }
      return ctx.runtime.executeAgent(agentId, project, context, runtimeOptions)
    },
    assertCurrent: input.assertCurrent,
    close: async (outcome: any = {}) => {
      options.events.push({
        kind,
        phase: 'close',
        taskId: input.taskId,
        sessionId,
        status: outcome.status,
      })
      if (kind === 'material' && outcome.status === 'success') await options.afterMaterialClose?.()
    },
  }
}

async function createCompositionHarness(options: {
  source?: typeof compositionModelSource | typeof compositionMcpSource
  contextOverride?: any
  repairedContextOverride?: any
  materialContextOverride?: any
  omitInitialWorldbuilding?: boolean
  materialPayload?: any
  materialRepairKeys?: string[]
  materialFailure?: Error
  refreshFailure?: Error
  storyStatePayload?: any
  beforeFirstMaterialSnapshotLoad?: (harness: any) => void | Promise<void>
  afterMaterialClose?: (harness: any) => void | Promise<void>
  autoRepairChapterPreflightGaps?: (...args: any[]) => Promise<any>
} = {}) {
  const events: CompositionEvent[] = []
  const materialCommitInputs: any[] = []
  const materialReloadedChapterUsage: any[][] = []
  let harnessRef: any
  let materialIdentity: { taskId: string; sessionId: string } | undefined
  let materialSnapshotLoads = 0
  let materialContextBuilds = 0
  const source = options.source || compositionMcpSource
  const harness = await createProsePipelineHarness((ctx: any) => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: ctx.getProject,
      compactTaskArtifacts: async () => 0,
      createModelExecution: (input: any) => createCompositionExecution(input, ctx, {
        events,
        materialPayload: options.materialPayload,
        materialFailure: options.materialFailure,
        afterMaterialClose: () => options.afterMaterialClose?.(harnessRef),
        onMaterialIdentity: identity => { materialIdentity = identity },
      }),
      mcpSource: {
        beginResolvedTask: async (input: any) => createCompositionExecution(input, ctx, {
          events,
          materialPayload: options.materialPayload,
          materialFailure: options.materialFailure,
          afterMaterialClose: () => options.afterMaterialClose?.(harnessRef),
          onMaterialIdentity: identity => { materialIdentity = identity },
        }),
      },
    })
    const materialRepair = createMaterialRepairService({
      beginChapterTask: input => resolver.beginTask(input),
      buildChapterContextPackage: async (...args: any[]) => {
        materialContextBuilds += 1
        const built = await buildChapterContextPackage(...args as Parameters<typeof buildChapterContextPackage>)
        const overridden = options.materialContextOverride
          ? { ...built, ...options.materialContextOverride }
          : built
        return materialContextBuilds > 1
          ? {
              ...overridden,
              preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
            }
          : overridden
      },
      commitAcceptance: async (...args: any[]) => {
        if (materialIdentity) events.push({ kind: 'material', phase: 'commit', ...materialIdentity })
        materialCommitInputs.push(args[1])
        return commitNovelChapterAcceptance(...args as Parameters<typeof commitNovelChapterAcceptance>)
      },
      loadSnapshot: async (...args: any[]) => {
        materialSnapshotLoads += 1
        if (materialSnapshotLoads === 1) {
          await options.beforeFirstMaterialSnapshotLoad?.(harnessRef)
        }
        if (materialSnapshotLoads > 1 && options.refreshFailure) throw options.refreshFailure
        const snapshot = await loadNovelMaterialRepairSnapshot(...args as Parameters<typeof loadNovelMaterialRepairSnapshot>)
        if (materialSnapshotLoads > 1 && materialIdentity) {
          events.push({ kind: 'material', phase: 'reload', ...materialIdentity })
          materialReloadedChapterUsage.push(snapshot.chapterSettingUsage)
        }
        return snapshot
      },
      withChapterAuthorityFence: createChapterAuthorityFence({
        chapterSourceLeases,
        readProject: ctx.getProject,
      }),
      now: () => new Date('2026-08-07T01:02:03.456Z'),
    })
    return createNovelWritingService({
      ...ctx,
      generationSourceResolver: resolver,
      repairChapterMaterials: (input: any) => materialRepair.repairChapterMaterials({
        ...input,
        repairKeys: options.materialRepairKeys ?? ['worldbuilding'],
      }),
      ...(options.autoRepairChapterPreflightGaps ? {
        autoRepairChapterPreflightGaps: options.autoRepairChapterPreflightGaps,
      } : {}),
    } as any)
  }, {
    chapterGenerationSource: source,
    readProjectFromStore: true,
    omitInitialWorldbuilding: options.omitInitialWorldbuilding,
    contextPackageOverride: options.contextOverride,
    repairedContextPackageOverride: options.repairedContextOverride,
    qualityGateEnabled: false,
    storyStatePayload: options.storyStatePayload,
  })
  harnessRef = harness
  return {
    ...harness,
    events,
    materialCommitInputs,
    materialReloadedChapterUsage,
    get materialSnapshotLoads() { return materialSnapshotLoads },
  }
}

async function switchCompositionSource(harness: any, source: typeof compositionModelSource | typeof compositionMcpSource) {
  await mutateNovelProjectGenerationSource(harness.workspace, {
    projectId: harness.project.id,
    operation: 'test-switch-chapter-generation-source',
    chapterGenerationSource: source,
    proseGenerationSource: toLegacyProseGenerationSource(source as any),
    result: null,
  })
}

type RealMcpInvocationEvidence = {
  stage: string
  taskId: string
  sessionId: string
  taskStatusesBeforeSession: Record<string, string>
}

async function createRealMcpSessionCompositionHarness() {
  const server = {
    id: 'generic-session-server',
    display_name: 'Generic Session MCP',
    transport: 'streamable_http' as const,
    url: 'https://generic-session.invalid/mcp',
    auth_type: 'bearer' as const,
    adapter_id: 'generic-session-adapter',
    is_active: true,
    startup_timeout_ms: 1_000,
    tool_timeout_ms: 1_000,
    generation_timeout_ms: 30_000,
    poll_initial_ms: 10,
    poll_max_ms: 50,
    enabled_tools: [],
    custom_headers: {},
  }
  const agentId = 'generic-session-agent'
  const draftText = buildPipelineProse(
    '江澈听见追捕频道切换频率，立即撞开铁门反向切入封锁线。',
    '夺下通讯器并迫使双层包围向错误方向收紧',
  )
  const invocations: RealMcpInvocationEvidence[] = []
  let sessionSequence = 0
  const adapter: McpGenerationAdapter = {
    id: server.adapter_id,
    async listAgents() {
      return [{ id: agentId, name: 'Generic Session Agent' }]
    },
    async createAgent() {
      throw new Error('composition test must use the bound Agent')
    },
    async inspectSession() {
      return { status: 'completed', terminal: true }
    },
    async invokeChapterStage(input: McpChapterInvocationInput) {
      const taskRuns = (await listNovelRuns(input.activeWorkspace, Number(input.project.id)))
        .filter(run => run.run_type === 'mcp_chapter_task')
      const sessionId = `provider-neutral-session-${++sessionSequence}`
      const snapshotHash = `provider-neutral-snapshot-${sessionSequence}`
      invocations.push({
        stage: input.stage,
        taskId: input.taskId,
        sessionId,
        taskStatusesBeforeSession: Object.fromEntries(
          taskRuns.map(run => [run.step_name, run.status]),
        ),
      })
      await input.onProgress?.({
        stage: 'session_created',
        status: 'running',
        session_id: sessionId,
        snapshot_hash: snapshotHash,
      })
      let content = draftText
      if (input.responseContract === 'material_repair_json') {
        content = JSON.stringify({
          worldbuilding: [{
            world_summary: '旧城追捕频道由钟楼分钟脉冲同步。',
            rules: ['分钟脉冲中断时，双层封锁会向错误方向继续收紧。'],
          }],
          repair_summary: '补齐正文生成所需世界规则。',
        })
      } else if (input.responseContract === 'quality_review_json') {
        content = JSON.stringify({
          score: 92,
          publishable: true,
          dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 },
          findings: [],
        })
      } else if (input.responseContract === 'readability_json') {
        content = JSON.stringify({ readability_score: 92, passed: true, issues: [], suggestions: [] })
      } else if (input.responseContract === 'story_state_json') {
        content = JSON.stringify({
          state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
          character_updates: [],
          setting_updates: [],
          storyline_updates: [],
        })
      }
      return {
        content,
        session_id: sessionId,
        snapshot_hash: snapshotHash,
        status: 'completed',
      }
    },
    async generateProse() {
      throw new Error('chapter task must use invokeChapterStage')
    },
  }
  const client = {
    async listTools() { return [] },
    async callTool() { return { content: [] } },
    diagnostics() { return { state: 'Ready' } },
  }
  const manager = {
    async get() { return client },
    async invalidate() {},
    async invalidateIfCurrent() {},
    async invalidateServer() {},
    async closeAll() {},
  }
  const mcpRuntime = createMcpRuntime(() => '', {
    manager: manager as any,
    adapterFactory: adapterId => {
      if (adapterId !== server.adapter_id) throw new Error(`unexpected Adapter: ${adapterId}`)
      return adapter
    },
  })
  let materialContextBuilds = 0
  const source = {
    ...compositionMcpSource,
    mcp: {
      server_id: server.id,
      key_id: 1,
      adapter_id: server.adapter_id,
      agent_id: agentId,
      model: 'generic-session-model',
    },
  }
  const missingWorldbuildingContext = {
    preflight: {
      ready: false,
      strict_ready: false,
      checks: [{ key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界观' }],
      warnings: ['世界观缺失'],
      blockers: ['世界观缺失'],
    },
  }
  const harness = await createProsePipelineHarness((ctx: any) => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const resolver = createGenerationSourceResolver({
      chapterSourceLeases,
      readProject: ctx.getProject,
      createModelExecution: () => {
        throw new Error('real MCP composition test forbids the model generation source')
      },
      mcpSource: new McpGenerationSource(mcpRuntime),
    })
    const materialRepair = createMaterialRepairService({
      beginChapterTask: input => resolver.beginTask(input),
      buildChapterContextPackage: async (...args: Parameters<typeof buildChapterContextPackage>) => {
        materialContextBuilds += 1
        const built = await buildChapterContextPackage(...args)
        return materialContextBuilds > 1
          ? {
              ...built,
              preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
            }
          : built
      },
      commitAcceptance: commitNovelChapterAcceptance,
      loadSnapshot: loadNovelMaterialRepairSnapshot,
      withChapterAuthorityFence: createChapterAuthorityFence({
        chapterSourceLeases,
        readProject: ctx.getProject,
      }),
    })
    return createNovelWritingService({
      ...ctx,
      chapterSourceLeases,
      generationSourceResolver: resolver,
      repairChapterMaterials: input => materialRepair.repairChapterMaterials({
        ...input,
        repairKeys: ['worldbuilding'],
      }),
    })
  }, {
    chapterGenerationSource: source,
    readProjectFromStore: true,
    omitInitialWorldbuilding: true,
    contextPackageOverride: missingWorldbuildingContext,
    repairedContextPackageOverride: {
      preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
    },
    qualityGateEnabled: false,
  })
  await writeMcpServers(harness.workspace, [server])
  const key = await createMcpKey(harness.workspace, {
    mcp_server_id: server.id,
    key: 'sk_provider_neutral_session_test',
    description: 'Provider-neutral session integration',
  })
  if (key.id !== source.mcp.key_id) throw new Error('unexpected test MCP key identity')
  const setting = await createNovelSettingEntity(harness.workspace, {
    project_id: harness.project.id,
    entity_type: 'rule',
    name: '分钟脉冲规则',
    summary: '封锁线依赖分钟脉冲同步。',
  })
  await replaceNovelChapterSettingUsage(
    harness.workspace,
    harness.project.id,
    harness.chapter.id,
    [{ entity_id: setting.id, required: true, usage_type: 'required' }],
  )
  return { ...harness, invocations }
}

describe('generateChapterForGroup zhuque_fast llm control options', () => {
  test('zhuque_fast skips the word-target expand LLM even when the caller passes raw options', async () => {
    const { harness, expansionTasks } = await createExpansionCountingHarness()

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'zhuque_fast',
    })

    expect(result).toBeTruthy()
    expect(expansionTasks.length).toBe(0)
  })

  test('default production mode still runs word-target expansion for dialogue-poor drafts', async () => {
    const { harness, expansionTasks } = await createExpansionCountingHarness()

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
    })

    expect(result).toBeTruthy()
    expect(expansionTasks.length).toBeGreaterThan(0)
  })
})

describe('automatic material repair through the generateChapterForGroup composition root', () => {
  test('keeps MCP committed usage authoritative through final SQLite acceptance and closes material before prose', async () => {
    const contextOverride: any = {
      ...incompleteCompositionContext(),
      setting_context: { auto_matched: true, chapter_usage: [] },
    }
    const harness = await createCompositionHarness({
      contextOverride,
      omitInitialWorldbuilding: true,
      materialRepairKeys: ['worldbuilding', 'chapter_setting_usage'],
      materialPayload: {
        worldbuilding: [{
          world_summary: '追捕频道受旧城钟楼的分钟脉冲控制。',
          rules: ['分钟脉冲中断时，封锁线会向错误方向收紧。'],
        }],
        chapter_setting_usage: [{
          entity_name: '权威规则B',
          entity_type: 'rule',
          required: true,
          usage_type: 'required',
        }],
      },
    })
    const settingA = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'rule',
      name: '启发式规则A',
      summary: '仅由补齐前的启发式上下文选中。',
    })
    const settingB = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'rule',
      name: '权威规则B',
      summary: '由 MCP 材料任务权威提交。',
    })
    await replaceNovelChapterSettingUsage(
      harness.workspace,
      harness.project.id,
      harness.chapter.id - 1,
      [{ entity_id: settingA.id, required: true, usage_type: 'required' }],
    )
    contextOverride.setting_context.chapter_usage = [{
      entity_id: settingA.id,
      required: true,
      usage_type: 'required',
    }]

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        auto_repair_missing_material: true,
        max_quality_revision_rounds: 0,
      },
    )

    const targetUsage = await listNovelChapterSettingUsage(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
    )
    const otherUsage = await listNovelChapterSettingUsage(
      harness.workspace,
      harness.project.id,
      harness.chapter.id - 1,
    )
    expect(contextOverride.setting_context.chapter_usage.map((usage: any) => usage.entity_id)).toEqual([settingA.id])
    expect(harness.materialCommitInputs[0]?.chapter_setting_usage_replacement).toEqual([{
      entity_name: '权威规则B',
      entity_type: 'rule',
      required: true,
      usage_type: 'required',
    }])
    expect(harness.materialReloadedChapterUsage[0]?.map((usage: any) => usage.entity_id)).toEqual([settingB.id])
    expect(targetUsage.map((usage: any) => usage.entity_id)).toEqual([settingB.id])
    expect(otherUsage.map((usage: any) => usage.entity_id)).toEqual([settingA.id])
    expect(JSON.stringify(result)).not.toContain(`\"entity_id\":${settingA.id}`)

    const lifecycle = harness.events
      .filter((event: CompositionEvent) => event.kind === 'material' || ['begin', 'draft', 'close'].includes(event.phase))
      .map((event: CompositionEvent) => `${event.kind}:${event.phase}${event.stage ? `:${event.stage}` : ''}${event.status ? `:${event.status}` : ''}`)
    expect(lifecycle).toEqual([
      'material:begin',
      'material:stage:material_repair',
      'material:commit',
      'material:reload',
      'material:close:success',
      'prose:begin',
      'prose:draft',
      'prose:close:success',
    ])
  })

  test('uses distinct durable MCP tasks and real remote Sessions for material repair and prose', async () => {
    const harness = await createRealMcpSessionCompositionHarness()

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        production_mode: 'draft_only',
        auto_repair_missing_material: true,
        max_quality_revision_rounds: 0,
      },
    )

    expect(result).toBeTruthy()
    const materialInvocation = harness.invocations.find(item => item.stage === 'material_repair')
    const proseInvocation = harness.invocations.find(item => item.stage === 'draft')
    expect(materialInvocation).toBeTruthy()
    expect(proseInvocation).toBeTruthy()
    expect(harness.invocations.indexOf(materialInvocation!)).toBeLessThan(
      harness.invocations.indexOf(proseInvocation!),
    )
    expect(materialInvocation!.taskId).not.toBe(proseInvocation!.taskId)
    expect(materialInvocation!.sessionId).not.toBe(proseInvocation!.sessionId)
    expect(proseInvocation!.taskStatusesBeforeSession[materialInvocation!.taskId]).toBe('success')
    expect(proseInvocation!.taskStatusesBeforeSession[proseInvocation!.taskId]).toBe('running')

    const runs = await listNovelRuns(harness.workspace, harness.project.id)
    const stageReceipts = runs
      .filter(run => run.run_type === 'chapter_generation_stage')
      .map(run => ({ run, receipt: JSON.parse(run.output_ref || '{}') }))
    const materialReceipt = stageReceipts.find(item => item.run.step_name === 'material_repair')?.receipt
    const proseReceipt = stageReceipts.find(item => item.run.step_name === 'draft')?.receipt
    expect(materialReceipt).toMatchObject({
      status: 'success',
      task_id: materialInvocation!.taskId,
      session_id: materialInvocation!.sessionId,
    })
    expect(proseReceipt).toMatchObject({
      status: 'success',
      task_id: proseInvocation!.taskId,
      session_id: proseInvocation!.sessionId,
    })
    expect(materialReceipt.session_id).not.toBe(proseReceipt.session_id)
    expect(harness.modelCalls.draft).toBe(0)
  })

  test('rebuilds staged usage after skipped MCP repair when authoritative persisted usage is empty', async () => {
    const heuristicUsage: any[] = []
    const storyStatePayload = {
      state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
      character_updates: [{
        name: '江澈',
        current_state: { location: '指挥频道入口' },
        source_excerpt: '江澈没有停在阴影里等待，直接切入追捕线。',
      }],
      setting_updates: [] as any[],
      storyline_updates: [],
    }
    const contextOverride: any = {
      ...incompleteCompositionContext(),
      setting_context: { auto_matched: true, chapter_usage: heuristicUsage },
    }
    const materialContextOverride: any = {
      preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
      setting_context: { auto_matched: true, chapter_usage: heuristicUsage },
    }
    const harness = await createCompositionHarness({
      contextOverride,
      materialContextOverride,
      materialRepairKeys: [],
      storyStatePayload,
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'rule',
      name: '启发式规则A',
      summary: '持久 usage 为空时由权威刷新上下文自动匹配。',
    })
    heuristicUsage.push({
      entity_id: setting.id,
      entity_name: setting.name,
      summary: setting.summary,
      required: true,
      usage_type: 'required',
    })
    storyStatePayload.setting_updates.push({
      entity_id: setting.id,
      name: setting.name,
      entity_type: setting.entity_type,
      state_delta: { last_used_chapter: harness.chapter.chapter_no },
      actual_state_change: { last_used_chapter: harness.chapter.chapter_no },
      source_excerpt: '江澈没有停在阴影里等待，直接切入追捕线。',
    })

    await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        auto_repair_missing_material: true,
        max_quality_revision_rounds: 0,
      },
    )

    const targetUsage = await listNovelChapterSettingUsage(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
    )
    expect(targetUsage.map((usage: any) => usage.entity_id)).toEqual([setting.id])
    expect(harness.materialCommitInputs).toEqual([])
    expect(harness.events.filter((event: CompositionEvent) => event.kind === 'material')).toEqual([])
  })

  const failureCases: Array<{
    name: string
    materialFailure?: Error
    refreshFailure?: Error
  }> = [
    {
      name: 'failed MCP material stage',
      materialFailure: Object.assign(new Error('material stage failed'), { code: 'MCP_SESSION_FAILED' }),
    },
    {
      name: 'cancelled MCP material stage',
      materialFailure: Object.assign(new Error('material stage cancelled'), { code: 'MCP_CANCELLED' }),
    },
    {
      name: 'committed material refresh failure',
      refreshFailure: new Error('refresh unavailable'),
    },
  ]
  for (const failureCase of failureCases) {
    test(`does not begin prose after ${failureCase.name}`, async () => {
      const harness = await createCompositionHarness({
        contextOverride: incompleteCompositionContext(),
        omitInitialWorldbuilding: true,
        materialPayload: {
          worldbuilding: [{ world_summary: '补齐后的世界观。', rules: ['规则必须可验证。'] }],
        },
        materialFailure: failureCase.materialFailure,
        refreshFailure: failureCase.refreshFailure,
      })
      const setting = await createNovelSettingEntity(harness.workspace, {
        project_id: harness.project.id,
        entity_type: 'rule',
        name: '既有规则',
        summary: '确保本测试仅缺世界观。',
      })
      await replaceNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id, [{
        entity_id: setting.id,
        required: true,
        usage_type: 'required',
      }])

      const production = harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        { model_id: 217, production_mode: 'draft_only', auto_repair_missing_material: true },
      )

      if (failureCase.refreshFailure) {
        await expect(production).rejects.toMatchObject({
          code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
          committed: true,
        })
      } else {
        await expect(production).rejects.toBe(failureCase.materialFailure)
      }
      expect(harness.events.filter((event: CompositionEvent) => event.kind === 'prose' && event.phase === 'begin')).toEqual([])
    })
  }

  test('keeps persist-false model repair arrays out of draft context and SQLite materials', async () => {
    const temporaryWorldbuilding = [{ id: -101, project_id: 1, world_summary: '仅供本次预检的临时世界观。' }]
    const temporaryCharacters = [{ id: -102, project_id: 1, name: '临时角色' }]
    const temporarySettings = [{ id: -103, project_id: 1, entity_type: 'rule', name: '临时规则' }]
    const harness = await createCompositionHarness({
      source: compositionModelSource,
      contextOverride: incompleteCompositionContext(),
      repairedContextOverride: {
        preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
      },
      autoRepairChapterPreflightGaps: async (_workspace, _project, chapter) => ({
        chapter,
        worldbuilding: temporaryWorldbuilding,
        characters: temporaryCharacters,
        settings: temporarySettings,
        staged_usage_replacement: [],
        staged_reviews: [],
        repaired: [{ type: 'temporary_model_materials' }],
        errors: [],
        context_package: {},
      }),
    })
    const baselineWorldbuilding = await listNovelWorldbuilding(harness.workspace, harness.project.id)
    const baselineCharacters = await listNovelCharacters(harness.workspace, harness.project.id)
    const baselineSettings = await listNovelSettingEntities(harness.workspace, harness.project.id)

    await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, auto_repair_missing_material: true, max_quality_revision_rounds: 0 },
    )

    expect(harness.draftContexts[0]?.worldbuilding).toEqual(baselineWorldbuilding)
    expect(harness.draftContexts[0]?.characters).toEqual(baselineCharacters)
    expect(harness.draftContexts[0]?.settings).toBeUndefined()
    expect(JSON.stringify(harness.draftContexts[0])).not.toContain(temporarySettings[0].name)
    expect(await listNovelWorldbuilding(harness.workspace, harness.project.id)).toEqual(baselineWorldbuilding)
    expect(await listNovelCharacters(harness.workspace, harness.project.id)).toEqual(baselineCharacters)
    expect(await listNovelSettingEntities(harness.workspace, harness.project.id)).toEqual(baselineSettings)
    expect(harness.events.filter((event: CompositionEvent) => event.kind === 'material')).toEqual([])
  })

  test('fences model to MCP switching after initial project read before either repair path', async () => {
    let repairCalls = 0
    const harness = await createCompositionHarness({
      source: compositionModelSource,
      contextOverride: incompleteCompositionContext(),
      autoRepairChapterPreflightGaps: async () => {
        repairCalls += 1
        throw new Error('model repair must not begin after source switch')
      },
    })
    let switched = false
    const production = harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        production_mode: 'draft_only',
        auto_repair_missing_material: true,
        onStage: async (stage: string) => {
          if (!switched && stage === 'context') {
            switched = true
            await switchCompositionSource(harness, compositionMcpSource)
          }
        },
      },
    )

    await expect(production).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    expect(repairCalls).toBe(0)
    expect(harness.events.filter((event: CompositionEvent) => event.phase === 'begin')).toEqual([])
  })

  test('fences MCP to model switching after material close before prose execution construction', async () => {
    const harness = await createCompositionHarness({
      contextOverride: incompleteCompositionContext(),
      omitInitialWorldbuilding: true,
      materialPayload: {
        worldbuilding: [{ world_summary: '补齐后的世界观。', rules: ['规则必须可验证。'] }],
      },
      afterMaterialClose: async current => switchCompositionSource(current, compositionModelSource),
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'rule',
      name: '既有规则',
      summary: '确保本测试仅缺世界观。',
    })
    await replaceNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id, [{
      entity_id: setting.id,
      required: true,
      usage_type: 'required',
    }])

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, production_mode: 'draft_only', auto_repair_missing_material: true },
    )).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })

    expect(harness.events.filter((event: CompositionEvent) => event.kind === 'prose' && event.phase === 'begin')).toEqual([])
  })

  test('fences a source switch after the outer freshness check before the material snapshot loads', async () => {
    let modelRepairCalls = 0
    const harness = await createCompositionHarness({
      contextOverride: incompleteCompositionContext(),
      omitInitialWorldbuilding: true,
      beforeFirstMaterialSnapshotLoad: current => switchCompositionSource(current, compositionModelSource),
      autoRepairChapterPreflightGaps: async () => {
        modelRepairCalls += 1
        throw new Error('model repair must not run after the MCP authority changes')
      },
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'rule',
      name: '既有规则',
      summary: '确保本测试仅缺世界观。',
    })
    await replaceNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id, [{
      entity_id: setting.id,
      required: true,
      usage_type: 'required',
    }])

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, production_mode: 'draft_only', auto_repair_missing_material: true },
    )).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })

    expect(harness.events.filter((event: CompositionEvent) => event.phase === 'begin')).toEqual([])
    expect(harness.materialCommitInputs).toEqual([])
    expect(modelRepairCalls).toBe(0)
  })

  test('rechecks model authority after the material-repair running callback before choosing a repair port', async () => {
    let modelRepairCalls = 0
    let switched = false
    const harness = await createCompositionHarness({
      source: compositionModelSource,
      contextOverride: incompleteCompositionContext(),
      autoRepairChapterPreflightGaps: async () => {
        modelRepairCalls += 1
        throw new Error('stale model repair must not run after switching to MCP')
      },
    })

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        production_mode: 'draft_only',
        auto_repair_missing_material: true,
        onStage: async (stage: string, payload: any) => {
          if (!switched && stage === 'material_repair' && payload?.status === 'running') {
            switched = true
            await switchCompositionSource(harness, compositionMcpSource)
          }
        },
      },
    )).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })

    expect(modelRepairCalls).toBe(0)
    expect(harness.materialSnapshotLoads).toBe(0)
    expect(harness.events.filter((event: CompositionEvent) => event.phase === 'begin')).toEqual([])
    expect(harness.materialCommitInputs).toEqual([])
  })
})

function generationProject(active: 'model' | 'mcp') {
  return {
    id: 3,
    title: '灰塔校时局',
    genre: '悬疑',
    synopsis: '调查每天丢失的一分钟。',
    reference_config: {
      chapter_generation_source: {
        version: 'chapter_generation_source_v1',
        active,
        model: active === 'model' ? { model_id: 217 } : {},
        ...(active === 'mcp' ? {
          mcp: {
            server_id: 'neutral-server',
            key_id: 7,
            adapter_id: 'neutral-adapter',
            agent_id: 'neutral-agent',
            model: '',
          },
        } : {}),
      },
    },
  }
}

const generationChapter = {
  id: 9,
  project_id: 3,
  chapter_no: 1,
  title: '停摆前一分钟',
  chapter_goal: '找出灰塔的校时规律',
  chapter_summary: '调查员进入灰塔核对旧记录。',
  conflict: '塔内规则阻止她带走记录。',
  ending_hook: '零点后档案上出现了她自己的名字。',
  scene_list: [{
    scene_no: 1,
    title: '进入灰塔',
    goal: '取得旧登记',
    purpose: '确认丢失一分钟的规律',
    obstacle: '守钟人阻拦',
    conflict: '登记册不能离塔',
    action: '林砚调换登记册封皮',
    turn: '登记册出现她的名字',
    payoff: '确认灰塔会改写记录',
    ending_hook_seed: '零点钟声提前响起',
  }],
  raw_payload: {},
}

function generationContext(strictReady: boolean, ready = strictReady) {
  return {
    preflight: {
      ready,
      strict_ready: strictReady,
      checks: strictReady ? [] : [{ key: 'worldbuilding', ok: false, severity: 'high' }],
      warnings: strictReady ? [] : ['世界观缺失'],
      blockers: ready ? [] : ['世界观缺失'],
    },
    chapter_target: {
      id: generationChapter.id,
      chapter_no: generationChapter.chapter_no,
      title: generationChapter.title,
      goal: generationChapter.chapter_goal,
      summary: generationChapter.chapter_summary,
      conflict: generationChapter.conflict,
      ending_hook: generationChapter.ending_hook,
      scene_cards: generationChapter.scene_list,
    },
  }
}

type AutomaticRepairHarnessOptions = {
  active?: 'model' | 'mcp'
  repairResult?: any
  repairFailure?: Error
  modelRepairResult?: any
  autoRepair?: boolean
  allowIncomplete?: boolean
  invalidSource?: boolean
}

function createAutomaticRepairHarness(options: AutomaticRepairHarnessOptions = {}) {
  const active = options.active || 'mcp'
  const project = generationProject(active)
  if (options.invalidSource) {
    ;(project.reference_config.chapter_generation_source as any).active = 'unknown'
  }
  const initialWorldbuilding: any[] = []
  const initialCharacters = [{ id: 21, project_id: 3, name: '林砚' }]
  const initialSettings = [{ id: 31, project_id: 3, entity_type: 'rule', name: '缺失的一分钟' }]
  const initialChapterUsage = [{ id: 41, project_id: 3, chapter_id: 9, entity_id: 31 }]
  const otherChapterUsage = [{ id: 40, project_id: 3, chapter_id: 8, entity_id: 30 }]
  const refreshedChapter = { ...generationChapter, chapter_goal: '在停摆前确认灰塔的校时规律' }
  const refreshedWorldbuilding = [{ id: 11, project_id: 3, world_summary: '灰塔每天吞掉一分钟。' }]
  const refreshedContext = generationContext(true)
  const events: string[] = []
  const stageEvents: Array<{ stage: string; payload: any }> = []
  const repairCalls: any[] = []
  const modelRepairCalls: any[] = []
  const sceneCardCalls: any[] = []
  let contextBuildCalls = 0
  const defaultRepairResult = {
    ok: true,
    skipped: false,
    source: 'mcp',
    task_id: 'material-task-1',
    chapter: refreshedChapter,
    chapters: [refreshedChapter],
    worldbuilding: refreshedWorldbuilding,
    characters: initialCharacters,
    settings: initialSettings,
    chapter_setting_usage: initialChapterUsage,
    project_setting_usage: [...otherChapterUsage, ...initialChapterUsage],
    context_package: refreshedContext,
    preflight: refreshedContext.preflight,
  }
  const modelRepairResult = options.modelRepairResult || {
    chapter: refreshedChapter,
    worldbuilding: [{ id: 11, project_id: 3, world_summary: '模型补齐的世界观。' }],
    characters: initialCharacters,
    settings: initialSettings,
    staged_usage_replacement: initialChapterUsage,
    staged_reviews: [],
    repaired: [{ type: 'worldbuilding_created' }],
    errors: [],
    context_package: refreshedContext,
  }
  const args: any = {
    activeWorkspace: '/tmp/automatic-material-repair-test',
    projectId: project.id,
    project,
    expectedAuthorityFingerprint: options.invalidSource
      ? ''
      : chapterGenerationSourceFingerprint(project.reference_config.chapter_generation_source as any),
    getProject: async () => project,
    chapter: generationChapter,
    chapters: [generationChapter],
    worldbuilding: initialWorldbuilding,
    characters: initialCharacters,
    outlines: [],
    reviews: [],
    settings: initialSettings,
    chapterSettingUsage: initialChapterUsage,
    projectSettingUsage: [...otherChapterUsage, ...initialChapterUsage],
    options: {
      auto_repair_missing_material: options.autoRepair !== false,
      allow_incomplete: options.allowIncomplete === true,
    },
    preferredModelId: active === 'model' ? 217 : undefined,
    llmControlOptions: { abortSignal: undefined },
    productionMode: 'draft_only',
    isSceneCardsOnly: false,
    approvalPolicy: {},
    approvals: {},
    configSnapshot: {},
    runtime: {
      buildChapterContext: async () => {
        contextBuildCalls += 1
        return contextBuildCalls > 1 && active === 'model'
          ? refreshedContext
          : generationContext(false, false)
      },
    },
    buildChapterContextPackage: async () => generationContext(false, false),
    repairChapterMaterials: async (input: any) => {
      repairCalls.push(input)
      events.push('material:begin', 'material:material_repair')
      if (options.repairFailure) throw options.repairFailure
      events.push('material:commit', 'material:close:success')
      return options.repairResult || defaultRepairResult
    },
    autoRepairChapterPreflightGaps: async (...input: any[]) => {
      modelRepairCalls.push(input)
      return modelRepairResult
    },
    generateSceneCardsForChapter: async (...input: any[]) => {
      sceneCardCalls.push(input)
      return { sceneCards: generationChapter.scene_list }
    },
    approvalRequired: () => false,
    buildApprovalError: () => new Error('approval should not be required'),
    throwIfChapterGenerationAborted: () => {},
    onStage: async (stage: string, payload: any) => {
      stageEvents.push({ stage, payload })
      if (stage === 'material_repair' && ['success', 'warn'].includes(payload?.status)) {
        events.push('context:strict')
      }
    },
  }
  return {
    args,
    events,
    project,
    repairCalls,
    modelRepairCalls,
    sceneCardCalls,
    stageEvents,
    initialCharacters,
    initialSettings,
    initialChapterUsage,
    otherChapterUsage,
    refreshedChapter,
    refreshedWorldbuilding,
    refreshedContext,
  }
}

describe('automatic material repair source routing before prose task creation', () => {
  test('uses the successful MCP refreshed snapshot without losing other chapter setting usages', async () => {
    const harness = createAutomaticRepairHarness()

    const result = await runGenerateChapterContextAndSceneCards(harness.args)

    expect(result.chapter).toEqual(harness.refreshedChapter)
    expect(result.chapters).toEqual([harness.refreshedChapter])
    expect(result.worldbuilding).toEqual(harness.refreshedWorldbuilding)
    expect(result.characters).toEqual(harness.initialCharacters)
    expect(result.settings).toEqual(harness.initialSettings)
    expect(result.projectSettingUsage).toEqual([
      ...harness.otherChapterUsage,
      ...harness.initialChapterUsage,
    ])
    expect(result.contextPackage.preflight).toMatchObject({ ready: true, strict_ready: true })
    expect(harness.repairCalls).toHaveLength(1)
    expect(harness.modelRepairCalls).toEqual([])
  })

  test('keeps existing snapshot fields when an MCP repair is skipped with only authoritative context', async () => {
    const harness = createAutomaticRepairHarness({
      repairResult: {
        ok: true,
        skipped: true,
        source: 'mcp',
        applied: [],
        context_package: generationContext(true),
        preflight: generationContext(true).preflight,
      },
    })

    const result = await runGenerateChapterContextAndSceneCards(harness.args)

    expect(result.chapter).toEqual(generationChapter)
    expect(result.chapters).toEqual([generationChapter])
    expect(result.worldbuilding).toEqual([])
    expect(result.characters).toEqual(harness.initialCharacters)
    expect(result.settings).toEqual(harness.initialSettings)
    expect(result.chapterSettingUsage).toEqual(harness.initialChapterUsage)
    expect(result.projectSettingUsage).toEqual([
      ...harness.otherChapterUsage,
      ...harness.initialChapterUsage,
    ])
    expect(result.contextPackage.preflight).toMatchObject({ ready: true, strict_ready: true })
    expect(harness.repairCalls).toHaveLength(1)
    expect(harness.modelRepairCalls).toEqual([])
  })

  test('blocks prose after MCP repair when strict readiness remains false even with allow_incomplete', async () => {
    const notStrict = generationContext(false, true)
    const harness = createAutomaticRepairHarness({
      allowIncomplete: true,
      repairResult: {
        ok: true,
        skipped: false,
        source: 'mcp',
        task_id: 'material-task-strict-false',
        chapter: generationChapter,
        chapters: [generationChapter],
        worldbuilding: [],
        characters: [],
        settings: [],
        chapter_setting_usage: [],
        project_setting_usage: [],
        context_package: notStrict,
        preflight: notStrict.preflight,
      },
    })
    let proseBegins = 0
    const production = (async () => {
      const result = await runGenerateChapterContextAndSceneCards(harness.args)
      proseBegins += 1
      return result
    })()

    await expect(production).rejects.toMatchObject({
      code: 'PROSE_STRICT_PREFLIGHT_BLOCKED',
    })

    expect(proseBegins).toBe(0)
    expect(harness.repairCalls).toHaveLength(1)
    expect(harness.modelRepairCalls).toEqual([])
  })

  for (const failure of [
    Object.assign(new Error('MCP material failed'), { code: 'MCP_SESSION_FAILED' }),
    Object.assign(new Error('MCP material cancelled'), { code: 'MCP_CANCELLED' }),
    Object.assign(new Error('material committed but refresh failed'), {
      code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
    }),
  ]) {
    test(`does not begin prose or fall back to the model after ${failure.code}`, async () => {
      const harness = createAutomaticRepairHarness({ repairFailure: failure })
      let proseBegins = 0
      const production = (async () => {
        const result = await runGenerateChapterContextAndSceneCards(harness.args)
        proseBegins += 1
        return result
      })()

      await expect(production).rejects.toBe(failure)

      expect(proseBegins).toBe(0)
      expect(harness.repairCalls).toHaveLength(1)
      expect(harness.modelRepairCalls).toEqual([])
      expect(harness.stageEvents.at(-1)).toMatchObject({
        stage: 'material_repair',
        payload: {
          status: 'failed',
          code: failure.code,
          ...(failure.code === 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED' ? { committed: true } : {}),
        },
      })
    })
  }

  test('keeps the existing model repair call with persist false and never calls MCP repair', async () => {
    const harness = createAutomaticRepairHarness({ active: 'model' })

    const result = await runGenerateChapterContextAndSceneCards(harness.args)

    expect(result.chapter).toEqual(harness.refreshedChapter)
    expect(harness.repairCalls).toEqual([])
    expect(harness.modelRepairCalls).toHaveLength(1)
    expect(harness.modelRepairCalls[0]?.[4]).toBe(217)
    expect(harness.modelRepairCalls[0]?.[5]).toMatchObject({ persist: false })
  })

  test('does not call either repair path when automatic repair is disabled', async () => {
    const harness = createAutomaticRepairHarness({ autoRepair: false })
    let proseBegins = 0
    const production = (async () => {
      const result = await runGenerateChapterContextAndSceneCards(harness.args)
      proseBegins += 1
      return result
    })()

    await expect(production).rejects.toMatchObject({
      code: 'PROSE_PREFLIGHT_BLOCKED',
    })

    expect(proseBegins).toBe(0)
    expect(harness.repairCalls).toEqual([])
    expect(harness.modelRepairCalls).toEqual([])
  })

  test('fails closed on unknown source authority before calling either repair path', async () => {
    const harness = createAutomaticRepairHarness({ invalidSource: true })
    let proseBegins = 0
    const production = (async () => {
      const result = await runGenerateChapterContextAndSceneCards(harness.args)
      proseBegins += 1
      return result
    })()

    await expect(production).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_CHANGED',
    })

    expect(proseBegins).toBe(0)
    expect(harness.repairCalls).toEqual([])
    expect(harness.modelRepairCalls).toEqual([])
  })

  test('propagates a source change from the single material call without starting a fallback', async () => {
    const changed = Object.assign(new Error('source changed'), { code: 'GENERATION_SOURCE_CHANGED' })
    const harness = createAutomaticRepairHarness({ repairFailure: changed })
    let proseBegins = 0
    const production = (async () => {
      const result = await runGenerateChapterContextAndSceneCards(harness.args)
      proseBegins += 1
      return result
    })()

    await expect(production).rejects.toBe(changed)

    expect(proseBegins).toBe(0)
    expect(harness.repairCalls).toHaveLength(1)
    expect(harness.modelRepairCalls).toEqual([])
  })
})
