import { describe, expect, test } from 'bun:test'
import {
  createMaterialRepairService,
} from './material-repair-service'

const AUTHORITY_FINGERPRINT = `sha256:${'a'.repeat(64)}`
const SOURCE_FINGERPRINT = `sha256:${'b'.repeat(64)}`
const TASK_CONTEXT_VERSION = `sha256:${'c'.repeat(64)}`
const MATERIAL_CONTEXT_VERSION = `sha256:${'d'.repeat(64)}`

function generationSource(active: 'model' | 'mcp') {
  return {
    version: 'chapter_generation_source_v1',
    active,
    model: active === 'model' ? { model_id: 217 } : {},
    ...(active === 'mcp' ? {
      mcp: {
        server_id: 'generic-server',
        key_id: 7,
        adapter_id: 'generic-adapter',
        agent_id: 'generic-agent',
        model: '',
      },
    } : {}),
  }
}

function contextPackage(failedKey: string | null = 'worldbuilding') {
  return {
    project: { id: 3, title: '灰塔校时局' },
    chapter_target: { id: 9, chapter_no: 1, title: '停摆前一分钟' },
    writing_bible: { premise: '每天丢失一分钟' },
    story_state: {},
    continuity: {},
    preflight: {
      ready: failedKey === null,
      strict_ready: failedKey === null,
      checks: failedKey === null
        ? [{ key: 'worldbuilding', ok: true, severity: 'high' }]
        : [{ key: failedKey, ok: false, severity: 'high', fix: `repair ${failedKey}` }],
      blockers: failedKey === null ? [] : [{ key: failedKey }],
      warnings: [],
    },
  }
}

function snapshot(active: 'model' | 'mcp' = 'mcp', refreshed = false) {
  const project = {
    id: 3,
    title: '灰塔校时局',
    genre: '悬疑',
    synopsis: '调查每天丢失的一分钟。',
    reference_config: {
      chapter_generation_source: generationSource(active),
    },
  }
  const chapter = {
    id: 9,
    project_id: 3,
    chapter_no: 1,
    title: '停摆前一分钟',
    chapter_goal: '找出灰塔的校时规律',
    chapter_summary: '调查员进入灰塔核对旧记录。',
    conflict: '塔内规则阻止她带走记录。',
    ending_hook: '零点后档案上出现了她自己的名字。',
    scene_list: [{ scene_no: 1, goal: '进入灰塔', obstacle: '守钟人阻拦', change: '取得旧登记' }],
    scene_breakdown: [],
    raw_payload: refreshed ? {
      chapter_generation_source: {
        key_id: 999,
        server_id: 'private-server-id',
        adapter_id: 'private-adapter-id',
        agent_id: 'private-agent-id',
        session_id: 'private-session-id',
        prompt: 'private-prompt',
        remote_body: 'provider-private-body',
      },
    } : {},
  }
  return {
    project,
    chapter,
    chapters: [chapter],
    worldbuilding: refreshed ? [{ id: 11, project_id: 3, world_summary: '灰塔每天吞掉一分钟。' }] : [],
    characters: [{ id: 21, project_id: 3, name: '林砚', current_state: { location: '灰塔底层' } }],
    outlines: [],
    reviews: [],
    settings: [{ id: 31, project_id: 3, entity_type: 'rule', name: '缺失的一分钟' }],
    projectSettingUsage: [],
    chapterSettingUsage: [],
    contextVersion: MATERIAL_CONTEXT_VERSION,
  }
}

type HarnessOptions = {
  active?: 'model' | 'mcp'
  failedKey?: string | null
  stageFailure?: Error
  invalidOutput?: boolean
  commitFailure?: Error
  assertCurrentFailure?: Error
  closeFailure?: Error
  abortBeforeStageFailure?: AbortController
}

function createMaterialRepairHarness(options: HarnessOptions = {}) {
  const active = options.active || 'mcp'
  const workspace = '/tmp/material-repair-service-test'
  const initial = snapshot(active)
  const refreshed = snapshot(active, true)
  const beginCalls: any[] = []
  const stageCalls: any[] = []
  const commitCalls: any[] = []
  const closeCalls: any[] = []
  const contextBuildCalls: any[] = []
  let loadCalls = 0
  let assertCurrentCalls = 0
  let modelCalls = 0
  const remoteFailureBody = 'provider-private-body'

  const execution = {
    taskId: 'material-task-1',
    source: 'mcp' as const,
    authorityFingerprint: AUTHORITY_FINGERPRINT,
    fingerprint: SOURCE_FINGERPRINT,
    contextVersion: TASK_CONTEXT_VERSION,
    provenance: () => ({
      task_id: 'material-task-1',
      project_id: 3,
      chapter_id: 9,
      source: 'mcp' as const,
      source_fingerprint: SOURCE_FINGERPRINT,
      authority_fingerprint: AUTHORITY_FINGERPRINT,
      context_version: TASK_CONTEXT_VERSION,
      server_id: 'private-server-id',
      key_id: 999,
      adapter_id: 'private-adapter-id',
      agent_id: 'private-agent-id',
      session_id: 'private-session-id',
    }),
    generateDraft: async () => { throw new Error('material repair must not generate prose') },
    executeAgent: async (...args: any[]) => {
      const [stage, contract, agentId, project, context, runtimeOptions] = args
      stageCalls.push({ stage, contract, agentId, project, context, runtimeOptions })
      if (options.stageFailure) {
        options.abortBeforeStageFailure?.abort()
        throw options.stageFailure
      }
      return options.invalidOutput
        ? { content: '{}', output: {}, raw: { body: remoteFailureBody } }
        : {
            content: '{"worldbuilding":[{"world_summary":"灰塔每天吞掉一分钟。"}]}',
            output: { worldbuilding: [{ world_summary: '灰塔每天吞掉一分钟。' }] },
            raw: { body: remoteFailureBody },
          }
    },
    assertCurrent: async () => {
      assertCurrentCalls += 1
      if (options.assertCurrentFailure) throw options.assertCurrentFailure
    },
    close: async (outcome: any) => {
      closeCalls.push(outcome)
      if (options.closeFailure) throw options.closeFailure
    },
  }

  const deps: any = {
    beginChapterTask: async (input: any) => {
      beginCalls.push(input)
      return execution
    },
    buildChapterContextPackage: async (...args: any[]) => {
      contextBuildCalls.push(args)
      return contextBuildCalls.length === 1
        ? contextPackage(options.failedKey === undefined ? 'worldbuilding' : options.failedKey)
        : contextPackage(null)
    },
    commitAcceptance: async (...args: any[]) => {
      commitCalls.push(args)
      if (options.commitFailure) throw options.commitFailure
      return { chapter: refreshed.chapter }
    },
    loadSnapshot: async () => {
      loadCalls += 1
      return loadCalls === 1 ? initial : refreshed
    },
    now: () => new Date('2026-08-07T01:02:03.456Z'),
    modelFallback: async () => {
      modelCalls += 1
      throw new Error('model fallback must never run')
    },
  }

  return {
    workspace,
    project: initial.project,
    chapter: initial.chapter,
    service: createMaterialRepairService(deps),
    beginCalls,
    stageCalls,
    commitCalls,
    closeCalls,
    contextBuildCalls,
    get assertCurrentCalls() { return assertCurrentCalls },
    get loadCalls() { return loadCalls },
    get modelCalls() { return modelCalls },
    remoteFailureBody,
  }
}

function request(harness: ReturnType<typeof createMaterialRepairHarness>, signal?: AbortSignal) {
  return {
    activeWorkspace: harness.workspace,
    projectId: harness.project.id,
    chapterId: harness.chapter.id,
    ...(signal ? { signal } : {}),
  }
}

describe('one-session MCP material repair orchestration', () => {
  test('repairs every target with one MCP stage call, one task, one commit, and one close', async () => {
    const harness = createMaterialRepairHarness()

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(harness.beginCalls).toHaveLength(1)
    expect(harness.stageCalls.map(call => [call.stage, call.contract])).toEqual([
      ['material_repair', 'material_repair_json'],
    ])
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
    expect(harness.assertCurrentCalls).toBe(1)
    expect(result).toMatchObject({ ok: true, skipped: false, source: 'mcp', task_id: 'material-task-1' })
  })

  test('skips without beginning a task when strict preflight has no repair target', async () => {
    const harness = createMaterialRepairHarness({ failedKey: null })

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(result).toMatchObject({ ok: true, skipped: true, source: 'mcp', applied: [] })
    expect(harness.beginCalls).toEqual([])
    expect(harness.stageCalls).toEqual([])
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([])
  })

  test('rejects the model source before beginning an MCP task', async () => {
    const harness = createMaterialRepairHarness({ active: 'model' })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toMatchObject({
      code: 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED',
      error_code: 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED',
    })
    expect(harness.beginCalls).toEqual([])
    expect(harness.contextBuildCalls).toEqual([])
    expect(harness.modelCalls).toBe(0)
  })

  test('never calls a model fallback or commits after an MCP stage failure', async () => {
    const rejection = Object.assign(new Error('remote rejected'), { code: 'MCP_SESSION_FAILED' })
    const harness = createMaterialRepairHarness({ stageFailure: rejection })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toBe(rejection)

    expect(harness.modelCalls).toBe(0)
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: rejection }])
  })

  test('fails closed on an invalid structured payload without committing', async () => {
    const harness = createMaterialRepairHarness({ invalidOutput: true })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toMatchObject({
      code: 'MATERIAL_REPAIR_INCOMPLETE',
    })

    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls[0]).toMatchObject({ status: 'failed' })
  })

  test('closes cancelled when the request signal is aborted', async () => {
    const controller = new AbortController()
    const rejection = new Error('remote request stopped')
    const harness = createMaterialRepairHarness({
      stageFailure: rejection,
      abortBeforeStageFailure: controller,
    })

    await expect(harness.service.repairChapterMaterials(request(harness, controller.signal))).rejects.toBe(rejection)

    expect(controller.signal.aborted).toBe(true)
    expect(harness.closeCalls).toEqual([{ status: 'cancelled', error: rejection }])
    expect(harness.commitCalls).toEqual([])
  })

  test('propagates commit failure without making a second remote call', async () => {
    const rejection = Object.assign(new Error('atomic commit rejected'), { code: 'MATERIAL_REPAIR_CONTEXT_CHANGED' })
    const harness = createMaterialRepairHarness({ commitFailure: rejection })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toBe(rejection)

    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.loadCalls).toBe(1)
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: rejection }])
  })

  test('passes only local authority and material-context fences to the atomic commit', async () => {
    const harness = createMaterialRepairHarness()

    await harness.service.repairChapterMaterials(request(harness))

    expect(harness.commitCalls[0]?.[0]).toBe(harness.workspace)
    expect(harness.commitCalls[0]?.[1]).toMatchObject({
      chapter_id: harness.chapter.id,
      expected_chapter_generation_source_fingerprint: AUTHORITY_FINGERPRINT,
      expected_material_repair_context_version: MATERIAL_CONTEXT_VERSION,
      worldbuilding_creates: [{ world_summary: '灰塔每天吞掉一分钟。' }],
    })
    expect(harness.commitCalls[0]?.[1]).not.toHaveProperty('project_patch')
    expect(harness.commitCalls[0]?.[1]).not.toHaveProperty('next_reference_config')
  })

  test('uses the loaded snapshot and deterministic context options before and after commit', async () => {
    const harness = createMaterialRepairHarness()

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(harness.contextBuildCalls).toHaveLength(2)
    for (const args of harness.contextBuildCalls) {
      expect(args[8]).toEqual({
        settingEntities: expect.any(Array),
        chapterSettingUsage: expect.any(Array),
        projectSettingUsage: expect.any(Array),
        persistSettingUsage: false,
        referencePreview: null,
      })
    }
    expect(result.preflight).toMatchObject({ ready: true, strict_ready: true })
    expect(result.context_package.preflight).toEqual(result.preflight)
    expect(result.worldbuilding).toHaveLength(1)
  })

  test('passes a complete strong snapshot, local identities, and no model override to the stage', async () => {
    const harness = createMaterialRepairHarness()

    await harness.service.repairChapterMaterials(request(harness))

    const begin = harness.beginCalls[0]
    expect(begin).not.toHaveProperty('requestedModelId')
    expect(begin.options || {}).not.toHaveProperty('generation_source_override')
    expect(harness.stageCalls[0]?.runtimeOptions || {}).not.toHaveProperty('modelId')
    expect(harness.stageCalls[0]?.runtimeOptions || {}).not.toHaveProperty('generation_source_override')
    expect(harness.stageCalls[0]?.context?.task).toContain(AUTHORITY_FINGERPRINT)
    expect(harness.stageCalls[0]?.context?.task).toContain(MATERIAL_CONTEXT_VERSION)
    expect(harness.stageCalls[0]?.context?.task).not.toContain('buda')
  })

  test('stops on assertCurrent source switch without committing or calling the remote again', async () => {
    const rejection = Object.assign(new Error('source changed'), { code: 'GENERATION_SOURCE_CHANGED' })
    const harness = createMaterialRepairHarness({ assertCurrentFailure: rejection })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toBe(rejection)

    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.assertCurrentCalls).toBe(1)
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: rejection }])
  })

  test('returns only bounded local provenance and never remote identities or bodies', async () => {
    const harness = createMaterialRepairHarness()

    const result = await harness.service.repairChapterMaterials(request(harness))
    const serialized = JSON.stringify(result)

    expect(result).toMatchObject({
      task_id: 'material-task-1',
      source_fingerprint: SOURCE_FINGERPRINT,
      context_version: TASK_CONTEXT_VERSION,
    })
    for (const secret of [
      'private-server-id',
      'private-adapter-id',
      'private-agent-id',
      'private-session-id',
      'provider-private-body',
      'private-prompt',
      'key_id',
      'session_id',
      'agent_id',
      'headers',
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('combines the primary and close failures without losing either error', async () => {
    const primary = new Error('remote failed first')
    const cleanup = new Error('close failed second')
    const harness = createMaterialRepairHarness({ stageFailure: primary, closeFailure: cleanup })

    const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)

    expect(exposed).toBeInstanceOf(AggregateError)
    expect(exposed.errors).toEqual([primary, cleanup])
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: primary }])
  })
})
