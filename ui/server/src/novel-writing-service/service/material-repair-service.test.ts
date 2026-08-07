import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildAgentMessages } from '../../llm/executor-helpers'
import { stringifyLLMMessageTextContent } from '../../llm/types'
import {
  createNovelChapter,
  createNovelProject,
} from '../../novel'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
} from '../generation-source/source-config'
import {
  createMaterialRepairService,
} from './material-repair-service'
import { createNovelWritingService } from './create-novel-writing-service'

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

const AUTHORITY_FINGERPRINT = chapterGenerationSourceFingerprint(generationSource('mcp') as any)

function contextPackage(
  failedKeys: string[] = ['worldbuilding'],
  includePrivate = false,
  includeReferenceCheck = false,
) {
  const allKeys = new Set(['worldbuilding', ...failedKeys])
  if (includeReferenceCheck) allKeys.add('reference_knowledge')
  const checks = [...allKeys].map(key => ({
    key,
    ok: !failedKeys.includes(key),
    severity: key === 'reference_knowledge' ? 'medium' : 'high',
    ...(failedKeys.includes(key) ? { fix: `repair ${key}` } : {}),
  }))
  return {
    project: { id: 3, title: '灰塔校时局' },
    chapter_target: { id: 9, chapter_no: 1, title: '停摆前一分钟' },
    writing_bible: { premise: '每天丢失一分钟' },
    story_state: {},
    continuity: {},
    ...(includePrivate ? {
      safe_material_field: '必须保留的普通材料',
      private_receipt: {
        session_id: 'skipped-private-session',
        agent_id: 'skipped-private-agent',
        key_id: 998,
        prompt: 'skipped-private-prompt',
        headers: { Authorization: 'skipped-private-header' },
        cookie: 'skipped-private-cookie',
        access_token: 'skipped-private-access-token',
        x_api_key: 'skipped-private-x-api-key',
        credential: 'skipped-private-credential',
        secret: 'skipped-private-secret',
        client_secret: 'skipped-private-client-secret',
      },
    } : {}),
    preflight: {
      ready: !checks.some(check => !check.ok && check.severity === 'high'),
      strict_ready: checks.every(check => check.ok || check.severity === 'low'),
      checks,
      blockers: checks.filter(check => !check.ok && check.severity === 'high'),
      warnings: [],
      ...(includePrivate ? {
        remote_diagnostics: {
          session_id: 'skipped-preflight-session',
          prompt: 'skipped-preflight-prompt',
          secret: 'skipped-preflight-secret',
          client_secret: 'skipped-preflight-client-secret',
        },
      } : {}),
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
        secret: 'private-receipt-secret',
        client_secret: 'private-receipt-client-secret',
      },
    } : {},
  }
  return {
    project,
    chapter,
    chapters: [chapter],
    worldbuilding: refreshed ? [{ id: 11, project_id: 3, world_summary: '灰塔每天吞掉一分钟。' }] : [],
    characters: [{
      id: 21,
      project_id: 3,
      name: '林砚',
      secret: '角色叙事秘密必须保留',
      Secret: 'case-variant-secret-must-remove',
      se_cret: 'punctuated-secret-must-remove',
      client_secret: 'character-client-secret-must-remove',
      current_state: {
        location: '灰塔底层',
        secret: 'nested-character-secret-must-remove',
      },
    }],
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
  failedKeys?: string[]
  finalReferenceReady?: boolean
  stageFailure?: Error
  invalidOutput?: boolean
  commitFailure?: Error
  assertCurrentFailure?: Error
  closeFailure?: Error
  abortBeforeStageFailure?: AbortController
  abortBeforeCommitFailure?: AbortController
  abortAfterCommit?: AbortController
  executionAuthorityFingerprint?: string
  secondLoadFailure?: Error
  secondBuildFailure?: Error
  sensitiveContext?: boolean
  unsafeContext?: 'accessor' | 'cycle' | 'proxy' | 'proto' | 'deep'
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
  const remoteFailureBody = 'provider-private-body'
  const initialFailedKeys = options.failedKeys
    ?? (options.failedKey === null ? [] : [options.failedKey || 'worldbuilding'])

  const execution = {
    taskId: 'material-task-1',
    source: 'mcp' as const,
    authorityFingerprint: options.executionAuthorityFingerprint || AUTHORITY_FINGERPRINT,
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
      if (contextBuildCalls.length > 1 && options.secondBuildFailure) throw options.secondBuildFailure
      const contextOptions = args[8] || {}
      const deterministic = Object.prototype.hasOwnProperty.call(contextOptions, 'referencePreview')
      const includesReference = initialFailedKeys.includes('reference_knowledge')
      const failedKeys = deterministic
        ? initialFailedKeys
        : (includesReference && options.finalReferenceReady === false ? ['reference_knowledge'] : [])
      const built: any = contextPackage(failedKeys, options.sensitiveContext, includesReference)
      if (options.unsafeContext === 'accessor') {
        Object.defineProperty(built, 'unsafe_accessor', {
          enumerable: true,
          get() { throw new Error('sanitizer invoked unsafe getter') },
        })
      } else if (options.unsafeContext === 'cycle') {
        built.unsafe_cycle = built
      } else if (options.unsafeContext === 'proxy') {
        built.unsafe_proxy = new Proxy({ value: 'private' }, {
          ownKeys() { throw new Error('sanitizer invoked proxy trap') },
        })
      } else if (options.unsafeContext === 'proto') {
        Object.defineProperty(built, '__proto__', { enumerable: true, value: { polluted: true } })
      } else if (options.unsafeContext === 'deep') {
        let cursor = built
        for (let index = 0; index < 80; index += 1) {
          cursor.deep = {}
          cursor = cursor.deep
        }
      }
      return built
    },
    commitAcceptance: async (...args: any[]) => {
      commitCalls.push(args)
      if (options.commitFailure) {
        options.abortBeforeCommitFailure?.abort()
        throw options.commitFailure
      }
      options.abortAfterCommit?.abort()
      return { chapter: refreshed.chapter }
    },
    loadSnapshot: async () => {
      loadCalls += 1
      if (loadCalls > 1 && options.secondLoadFailure) throw options.secondLoadFailure
      return loadCalls === 1 ? initial : refreshed
    },
    now: () => new Date('2026-08-07T01:02:03.456Z'),
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
    remoteFailureBody,
  }
}

function request(harness: ReturnType<typeof createMaterialRepairHarness>, signal?: AbortSignal) {
  return {
    activeWorkspace: harness.workspace,
    projectId: harness.project.id,
    chapterId: harness.chapter.id,
    expectedAuthorityFingerprint: chapterGenerationSourceFingerprint(
      harness.project.reference_config.chapter_generation_source,
    ),
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

    expect(result).toMatchObject({
      ok: true,
      skipped: true,
      source: 'mcp',
      source_fingerprint: AUTHORITY_FINGERPRINT,
      applied: [],
      chapter_setting_usage: [],
      project_setting_usage: [],
    })
    expect(harness.beginCalls).toEqual([])
    expect(harness.stageCalls).toEqual([])
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([])
  })

  test('rejects changed outer authority before beginning a material task', async () => {
    const harness = createMaterialRepairHarness()

    await expect(harness.service.repairChapterMaterials({
      ...request(harness),
      expectedAuthorityFingerprint: `sha256:${'e'.repeat(64)}`,
    })).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })

    expect(harness.beginCalls).toEqual([])
    expect(harness.stageCalls).toEqual([])
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([])
  })

  test('rejects changed outer authority on the skipped path before returning context', async () => {
    const harness = createMaterialRepairHarness({ failedKey: null })

    await expect(harness.service.repairChapterMaterials({
      ...request(harness),
      expectedAuthorityFingerprint: `sha256:${'e'.repeat(64)}`,
    })).rejects.toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })

    expect(harness.beginCalls).toEqual([])
    expect(harness.contextBuildCalls).toEqual([])
    expect(harness.commitCalls).toEqual([])
  })

  test('rejects the model source before beginning an MCP task', async () => {
    const harness = createMaterialRepairHarness({ active: 'model' })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toMatchObject({
      code: 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED',
      error_code: 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED',
    })
    expect(harness.beginCalls).toEqual([])
    expect(harness.contextBuildCalls).toEqual([])
  })

  test('never commits or retries remote work after an MCP stage failure', async () => {
    const rejection = Object.assign(new Error('remote rejected'), { code: 'MCP_SESSION_FAILED' })
    const harness = createMaterialRepairHarness({ stageFailure: rejection })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toBe(rejection)

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

  test('does not label an ordinary failure cancelled merely because the signal is aborted', async () => {
    const controller = new AbortController()
    const rejection = new Error('remote request stopped')
    const harness = createMaterialRepairHarness({
      stageFailure: rejection,
      abortBeforeStageFailure: controller,
    })

    await expect(harness.service.repairChapterMaterials(request(harness, controller.signal))).rejects.toBe(rejection)

    expect(controller.signal.aborted).toBe(true)
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: rejection }])
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
    expect(harness.contextBuildCalls[0]?.[8]).toEqual({
      settingEntities: expect.any(Array),
      chapterSettingUsage: expect.any(Array),
      projectSettingUsage: expect.any(Array),
      persistSettingUsage: false,
      referencePreview: null,
    })
    expect(harness.contextBuildCalls[1]?.[8]).toEqual({
      settingEntities: expect.any(Array),
      chapterSettingUsage: expect.any(Array),
      projectSettingUsage: expect.any(Array),
      persistSettingUsage: false,
    })
    expect(result.preflight).toMatchObject({ ready: true, strict_ready: true })
    expect(result.context_package.preflight).toEqual(result.preflight)
    expect(result.worldbuilding).toHaveLength(1)
  })

  test('passes a complete strong snapshot, local identities, and no model override to the stage', async () => {
    const harness = createMaterialRepairHarness()

    await harness.service.repairChapterMaterials(request(harness))

    const begin = harness.beginCalls[0]
    expect(begin).not.toHaveProperty('requestedModelId')
    expect(begin.expectedAuthorityFingerprint).toBe(AUTHORITY_FINGERPRINT)
    expect(begin.options || {}).not.toHaveProperty('generation_source_override')
    expect(harness.stageCalls[0]?.runtimeOptions || {}).not.toHaveProperty('modelId')
    expect(harness.stageCalls[0]?.runtimeOptions || {}).not.toHaveProperty('generation_source_override')
    expect(harness.stageCalls[0]?.context?.task).toContain(AUTHORITY_FINGERPRINT)
    expect(harness.stageCalls[0]?.context?.task).toContain(MATERIAL_CONTEXT_VERSION)
    expect(harness.stageCalls[0]?.context?.task).not.toContain('buda')
  })

  test('fences a snapshot-to-begin source race before the first remote stage', async () => {
    const changedAuthority = `sha256:${'e'.repeat(64)}`
    const harness = createMaterialRepairHarness({ executionAuthorityFingerprint: changedAuthority })

    const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)

    expect(exposed).toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    expect(harness.beginCalls).toHaveLength(1)
    expect(harness.stageCalls).toEqual([])
    expect(harness.commitCalls).toEqual([])
    expect(harness.closeCalls).toEqual([{ status: 'failed', error: exposed }])
  })

  test('marks the material task authoritative so the real outline compiler cannot append its schema', async () => {
    const harness = createMaterialRepairHarness()

    await harness.service.repairChapterMaterials(request(harness))

    const stage = harness.stageCalls[0]
    const compiled = buildAgentMessages(stage.agentId, stage.project, stage.context)
      .map(message => `[${message.role.toUpperCase()}]\n${stringifyLLMMessageTextContent(message.content)}`)
      .join('\n\n')
    expect(stage.context.authoritativeTask).toBe(true)
    expect(compiled).toContain('任务：一次性补齐本章写作前置材料。只输出 JSON，不生成正文。')
    expect(compiled).toContain('仅允许输出 chapter_patch, worldbuilding, characters')
    for (const outlineField of [
      'master_outline',
      'volume_outlines',
      'chapter_outlines',
      'foreshadowing_plan',
    ]) {
      expect(compiled).not.toContain(outlineField)
    }
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

  test('closes cancelled for a real AbortError even without inferring from signal state', async () => {
    const rejection = new Error('transport cancellation')
    rejection.name = 'AbortError'
    const harness = createMaterialRepairHarness({ stageFailure: rejection })

    await expect(harness.service.repairChapterMaterials(request(harness))).rejects.toBe(rejection)

    expect(harness.closeCalls).toEqual([{ status: 'cancelled', error: rejection }])
    expect(harness.commitCalls).toEqual([])
  })

  test('keeps validation and commit failures failed when an unrelated signal is simultaneously aborted', async () => {
    const validationController = new AbortController()
    validationController.abort(new Error('unrelated caller state'))
    const validationHarness = createMaterialRepairHarness({ invalidOutput: true })

    const validationError: any = await validationHarness.service
      .repairChapterMaterials(request(validationHarness, validationController.signal))
      .catch(error => error)
    expect(validationHarness.closeCalls).toEqual([{ status: 'failed', error: validationError }])

    const commitController = new AbortController()
    const commitFailure = new Error('commit rejected for non-cancellation reason')
    const commitHarness = createMaterialRepairHarness({
      commitFailure,
      abortBeforeCommitFailure: commitController,
    })
    await expect(commitHarness.service.repairChapterMaterials(
      request(commitHarness, commitController.signal),
    )).rejects.toBe(commitFailure)
    expect(commitHarness.closeCalls).toEqual([{ status: 'failed', error: commitFailure }])
  })

  test('locks success at durable commit even if the signal aborts immediately afterward', async () => {
    const controller = new AbortController()
    const harness = createMaterialRepairHarness({ abortAfterCommit: controller })

    const result = await harness.service.repairChapterMaterials(request(harness, controller.signal))

    expect(controller.signal.aborted).toBe(true)
    expect(result).toMatchObject({ ok: true, skipped: false })
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
  })

  test('reports a stable committed refresh failure and still closes success after second load fails', async () => {
    const refreshFailure = new Error('snapshot reload unavailable with private remote details')
    const harness = createMaterialRepairHarness({ secondLoadFailure: refreshFailure })

    const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)

    expect(exposed).toMatchObject({
      code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      error_code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
      task_id: 'material-task-1',
    })
    expect(exposed.message).not.toContain('private remote details')
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.loadCalls).toBe(2)
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
  })

  test('reports the same committed refresh boundary when final context reconstruction fails', async () => {
    const harness = createMaterialRepairHarness({ secondBuildFailure: new Error('final context failed') })

    const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)

    expect(exposed).toMatchObject({ code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED', committed: true })
    expect(harness.contextBuildCalls).toHaveLength(2)
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
  })

  test('aggregates committed refresh and success-close failures in stable order', async () => {
    const closeFailure = new Error('success close failed')
    const harness = createMaterialRepairHarness({
      secondLoadFailure: new Error('reload failed'),
      closeFailure,
    })

    const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)

    expect(exposed).toBeInstanceOf(AggregateError)
    expect(exposed.errors[0]).toMatchObject({ code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED', committed: true })
    expect(exposed.errors[1]).toBe(closeFailure)
    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
  })

  test('repairs implicit material gaps while separating reference-only preflight checks', async () => {
    const harness = createMaterialRepairHarness({
      failedKeys: ['worldbuilding', 'reference_knowledge'],
      finalReferenceReady: true,
    })

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(harness.stageCalls).toHaveLength(1)
    expect(harness.commitCalls).toHaveLength(1)
    expect(result.preflight.checks).toContainEqual(expect.objectContaining({ key: 'reference_knowledge', ok: true }))
    expect(result.preflight.strict_ready).toBe(true)
  })

  test('skips reference-only implicit gaps and rebuilds final preflight through the default preview path', async () => {
    const harness = createMaterialRepairHarness({
      failedKeys: ['reference_knowledge'],
      finalReferenceReady: true,
    })

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(result).toMatchObject({ skipped: true })
    expect(result.preflight.checks).toContainEqual(expect.objectContaining({ key: 'reference_knowledge', ok: true }))
    expect(harness.contextBuildCalls).toHaveLength(2)
    expect(harness.contextBuildCalls[0]?.[8]).toHaveProperty('referencePreview', null)
    expect(harness.contextBuildCalls[1]?.[8]).not.toHaveProperty('referencePreview')
    expect(harness.beginCalls).toEqual([])
  })

  test('returns a truthful final reference failure after repairing other materials', async () => {
    const harness = createMaterialRepairHarness({
      failedKeys: ['worldbuilding', 'reference_knowledge'],
      finalReferenceReady: false,
    })

    const result = await harness.service.repairChapterMaterials(request(harness))

    expect(result.preflight).toMatchObject({ ready: true, strict_ready: false })
    expect(result.preflight.checks).toContainEqual(expect.objectContaining({ key: 'reference_knowledge', ok: false }))
    expect(harness.closeCalls).toEqual([{ status: 'success' }])
  })

  test('keeps explicit unrepairable keys on the strong fail-closed contract', async () => {
    const harness = createMaterialRepairHarness({ failedKeys: ['reference_knowledge'] })

    await expect(harness.service.repairChapterMaterials({
      ...request(harness),
      repairKeys: ['reference_knowledge'],
    })).rejects.toMatchObject({ code: 'MATERIAL_REPAIR_UNREPAIRABLE' })
    expect(harness.beginCalls).toEqual([])
  })

  test('returns only bounded local provenance and never remote identities or bodies', async () => {
    const harness = createMaterialRepairHarness()

    const result = await harness.service.repairChapterMaterials(request(harness))
    const serialized = JSON.stringify(result)

    expect(result).toMatchObject({
      task_id: 'material-task-1',
      source_fingerprint: SOURCE_FINGERPRINT,
      context_version: TASK_CONTEXT_VERSION,
      characters: [{ secret: '角色叙事秘密必须保留' }],
    })
    for (const secret of [
      'private-server-id',
      'private-adapter-id',
      'private-agent-id',
      'private-session-id',
      'provider-private-body',
      'private-prompt',
      'private-receipt-secret',
      'private-receipt-client-secret',
      'case-variant-secret-must-remove',
      'punctuated-secret-must-remove',
      'character-client-secret-must-remove',
      'nested-character-secret-must-remove',
      'key_id',
      'session_id',
      'agent_id',
      'headers',
      'client_secret',
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('sanitizes skipped context and preflight with the same boundary while preserving materials', async () => {
    const harness = createMaterialRepairHarness({ failedKey: null, sensitiveContext: true })

    const result = await harness.service.repairChapterMaterials(request(harness))
    const serialized = JSON.stringify(result)

    expect(result).toMatchObject({
      skipped: true,
      context_package: {
        safe_material_field: '必须保留的普通材料',
        writing_bible: { premise: '每天丢失一分钟' },
      },
    })
    expect(Object.getPrototypeOf(result.context_package)).toBeNull()
    for (const privateValue of [
      'skipped-private-session',
      'skipped-private-agent',
      'skipped-private-prompt',
      'skipped-private-header',
      'skipped-private-cookie',
      'skipped-private-access-token',
      'skipped-private-x-api-key',
      'skipped-private-credential',
      'skipped-private-secret',
      'skipped-private-client-secret',
      'skipped-preflight-session',
      'skipped-preflight-prompt',
      'skipped-preflight-secret',
      'skipped-preflight-client-secret',
      'session_id',
      'agent_id',
      'key_id',
      'prompt',
      'headers',
      'client_secret',
    ]) {
      expect(serialized).not.toContain(privateValue)
    }
  })

  test('rejects unsafe accessor, proxy, cycle, prototype, and over-depth response graphs', async () => {
    for (const unsafeContext of ['accessor', 'proxy', 'cycle', 'proto', 'deep'] as const) {
      const harness = createMaterialRepairHarness({ failedKey: null, unsafeContext })
      const exposed: any = await harness.service.repairChapterMaterials(request(harness)).catch(error => error)
      expect(exposed).toMatchObject({ code: 'MATERIAL_REPAIR_RESPONSE_UNSAFE' })
      expect(harness.beginCalls).toEqual([])
    }
    expect(({} as any).polluted).toBeUndefined()
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

test('the assembled model-source service rejects repair without calling any model executor', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-material-model-'))
  try {
    const project = await createNovelProject(workspace, { title: '模型来源材料边界' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
    })
    let modelCalls = 0
    const service = createNovelWritingService({
      getProject: async () => project,
      production: {
        getStageModelId: () => 217,
        getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      } as any,
      reference: {} as any,
      runtime: {
        executeAgent: async () => {
          modelCalls += 1
          throw new Error('model executor must not run')
        },
        generateChapterProse: async () => {
          modelCalls += 1
          throw new Error('model prose executor must not run')
        },
      },
    })

    await expect(service.repairChapterMaterials({
      activeWorkspace: workspace,
      projectId: project.id,
      chapterId: chapter.id,
      expectedAuthorityFingerprint: chapterGenerationSourceFingerprint(resolveChapterGenerationSource(project)),
    })).rejects.toMatchObject({ code: 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED' })
    expect(modelCalls).toBe(0)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
