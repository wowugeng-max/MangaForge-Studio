import { describe, expect, test } from 'bun:test'
import { chapterGenerationSourceFingerprint, resolveChapterGenerationSource } from '../generation-source/source-config'
import type { ChapterTaskExecution } from '../generation-source/types'
import { createSceneCardsSourceDispatch } from './scene-cards-source-dispatch'

function dispatchProject(active: 'model' | 'mcp') {
  return {
    id: 3,
    title: '灰塔校时局',
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

const dispatchChapter = { id: 9, project_id: 3, chapter_no: 1, title: '停摆前一分钟' }

const dispatchContext = {
  preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
  chapter_target: { id: 9, chapter_no: 1, title: '停摆前一分钟', scene_cards: [] },
}

const sceneCardsStagePayload = {
  scene_cards: [{
    scene_no: 1,
    title: '进入灰塔',
    purpose: '确认丢失一分钟的规律',
    conflict: '登记册不能离塔',
    beat: '林砚调换登记册封皮',
  }],
}

type FakeExecutionOptions = {
  stageFailure?: Error
  closeFailure?: Error
  content?: string
}

function createFakeExecution(events: string[], closeOutcomes: any[], options: FakeExecutionOptions = {}) {
  const stageCalls: any[] = []
  const execution = {
    taskId: 'scene-cards-task-1',
    source: 'mcp' as const,
    authorityFingerprint: `sha256:${'a'.repeat(64)}`,
    fingerprint: `sha256:${'a'.repeat(64)}`,
    contextVersion: `sha256:${'b'.repeat(64)}`,
    provenance: () => ({} as any),
    generateDraft: async () => {
      throw new Error('scene cards must not invoke the draft port')
    },
    executeAgent: async (...args: any[]) => {
      stageCalls.push(args)
      events.push(`stage:${args[0]}`)
      if (options.stageFailure) throw options.stageFailure
      const content = options.content ?? JSON.stringify(sceneCardsStagePayload)
      return { content, output: JSON.parse(content), modelName: 'MCP Auto' }
    },
    assertCurrent: async () => {},
    close: async (outcome: any) => {
      closeOutcomes.push(outcome)
      events.push(`close:${outcome?.status}`)
      if (options.closeFailure) throw options.closeFailure
    },
  } as unknown as ChapterTaskExecution
  return { execution, stageCalls }
}

function createDispatchHarness(executionOptions: FakeExecutionOptions = {}) {
  const events: string[] = []
  const closeOutcomes: any[] = []
  const beginCalls: any[] = []
  const modelCalls: any[] = []
  const { execution, stageCalls } = createFakeExecution(events, closeOutcomes, executionOptions)
  const dispatch = createSceneCardsSourceDispatch({
    beginChapterTask: async input => {
      beginCalls.push(input)
      events.push('task-begin')
      return execution
    },
    buildSceneCardsPrompt: (project, contextPackage) =>
      `场景卡任务:${project?.title}:${contextPackage?.chapter_target?.title}`,
    generateSceneCardsForChapter: async (...args: any[]) => {
      modelCalls.push(args)
      events.push('model-scene-cards')
      return { result: { modelName: 'local-model' }, sceneCards: [{ scene_no: 1, title: '模型场景' }] }
    },
  })
  return { dispatch, events, closeOutcomes, beginCalls, modelCalls, stageCalls }
}

describe('createSceneCardsSourceDispatch.generateSceneCardsBySource', () => {
  test('routes model-active projects to the local scene cards path without beginning a task', async () => {
    const harness = createDispatchHarness()
    const project = dispatchProject('model')

    const result = await harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
      217,
      { llmTimeoutMs: 1000 },
    )

    expect(result.sceneCards).toEqual([{ scene_no: 1, title: '模型场景' }])
    expect(harness.beginCalls).toEqual([])
    expect(harness.modelCalls).toHaveLength(1)
    expect(harness.modelCalls[0][0]).toBe('/tmp/scene-cards-dispatch')
    expect(harness.modelCalls[0][3]).toBe(217)
  })

  test('routes an active MCP project through a scene_cards chapter task without local model calls', async () => {
    const harness = createDispatchHarness()
    const project = dispatchProject('mcp')

    const result = await harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
      undefined,
      {},
    )

    expect(harness.modelCalls).toEqual([])
    expect(harness.beginCalls).toHaveLength(1)
    expect(harness.beginCalls[0]).toMatchObject({
      activeWorkspace: '/tmp/scene-cards-dispatch',
      project,
      chapter: dispatchChapter,
      contextPackage: dispatchContext,
      options: { scene_cards: true },
      expectedAuthorityFingerprint: chapterGenerationSourceFingerprint(
        resolveChapterGenerationSource(project),
      ),
    })
    expect(harness.stageCalls).toHaveLength(1)
    const [stage, responseContract, agentId, stageProject, stageContext] = harness.stageCalls[0]
    expect(stage).toBe('scene_cards')
    expect(responseContract).toBe('scene_cards_json')
    expect(agentId).toBe('outline-agent')
    expect(stageProject).toBe(project)
    expect(stageContext).toMatchObject({ authoritativeTask: true })
    expect(String(stageContext.task)).toContain('场景卡任务')
    expect(result.sceneCards).toHaveLength(1)
    expect(result.sceneCards[0]).toMatchObject({ scene_no: 1, title: '进入灰塔' })
    expect(harness.events).toEqual(['task-begin', 'stage:scene_cards', 'close:success'])
  })

  test('forwards the caller authority fingerprint into the MCP task fence', async () => {
    const harness = createDispatchHarness()
    const project = dispatchProject('mcp')
    const expectedAuthorityFingerprint = `sha256:${'c'.repeat(64)}`

    await harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
      undefined,
      { expectedAuthorityFingerprint },
    )

    expect(harness.beginCalls[0].expectedAuthorityFingerprint).toBe(expectedAuthorityFingerprint)
  })

  test('closes the MCP task as failed and rethrows when the stage fails', async () => {
    const stageFailure = new Error('scene cards stage failed')
    const harness = createDispatchHarness({ stageFailure })
    const project = dispatchProject('mcp')

    await expect(harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
    )).rejects.toBe(stageFailure)

    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: stageFailure }])
    expect(harness.modelCalls).toEqual([])
  })

  test('closes the MCP task as cancelled when the caller abort signal caused the failure', async () => {
    const controller = new AbortController()
    const abortReason = new Error('caller aborted scene cards')
    controller.abort(abortReason)
    const harness = createDispatchHarness({ stageFailure: abortReason })
    const project = dispatchProject('mcp')

    await expect(harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
      undefined,
      { abortSignal: controller.signal },
    )).rejects.toBe(abortReason)

    expect(harness.closeOutcomes).toEqual([{ status: 'cancelled', error: abortReason }])
  })

  test('aggregates the stage failure with a close failure instead of dropping either', async () => {
    const stageFailure = new Error('scene cards stage failed')
    const closeFailure = new Error('close persistence failed')
    const harness = createDispatchHarness({ stageFailure, closeFailure })
    const project = dispatchProject('mcp')

    const exposed: any = await harness.dispatch.generateSceneCardsBySource(
      '/tmp/scene-cards-dispatch',
      project,
      dispatchChapter,
      dispatchContext,
    ).catch((error: unknown) => error)

    expect(exposed).toBeInstanceOf(AggregateError)
    expect(exposed.errors).toEqual([stageFailure, closeFailure])
  })
})
