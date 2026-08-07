import { describe, expect, test } from 'bun:test'
import { createNovelWritingService } from './create-novel-writing-service'
import { createProsePipelineHarness } from '../../routes/novel-writing-service.test-support'
import { runGenerateChapterContextAndSceneCards } from './generate-chapter-context-scene-cards'

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
  test('closes one independent MCP material execution before a distinct prose execution begins', async () => {
    const harness = createAutomaticRepairHarness()
    const materialSessionId = 'material-session-1'
    const proseTaskId = 'prose-task-1'
    const proseSessionId = 'prose-session-1'

    await runGenerateChapterContextAndSceneCards(harness.args)
    harness.events.push('prose:begin', 'prose:draft', 'prose:close:success')

    expect(harness.events).toEqual([
      'material:begin',
      'material:material_repair',
      'material:commit',
      'material:close:success',
      'context:strict',
      'prose:begin',
      'prose:draft',
      'prose:close:success',
    ])
    expect(harness.repairCalls).toHaveLength(1)
    expect(harness.repairCalls[0]).toEqual({
      activeWorkspace: harness.args.activeWorkspace,
      projectId: harness.project.id,
      chapterId: generationChapter.id,
      signal: undefined,
    })
    expect('material-task-1').not.toBe(proseTaskId)
    expect(materialSessionId).not.toBe(proseSessionId)
    expect(harness.modelRepairCalls).toEqual([])
  })

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
      code: 'MCP_BINDING_INVALID',
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
