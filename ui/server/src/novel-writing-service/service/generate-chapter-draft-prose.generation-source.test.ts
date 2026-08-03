import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import {
  listNovelRuns,
  updateNovelProject,
} from '../../novel'
import {
  buildPipelineProse,
  classifyProsePipelineTask,
  createProsePipelineHarness,
} from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'
import { runGenerateChapterDraftProse } from './generate-chapter-draft-prose'
import { ModelGenerationSource } from '../generation-source/model-generation-source'
import {
  acceptanceBindingFingerprintFromGenerationSource,
  CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
  MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
  type ChapterTaskExecution,
} from '../generation-source/types'

const workspaces: string[] = []
const originalModelClose = ModelGenerationSource.prototype.close

afterEach(async () => {
  ModelGenerationSource.prototype.close = originalModelClose
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

type LifecycleHarnessOptions = {
  initialSceneCards?: any[]
  stageFailureKind?: ReturnType<typeof classifyProsePipelineTask>
  stageFailure?: Error
  draftFailure?: Error
  closeFailure?: Error
  enableMemePolish?: boolean
}

async function createLifecycleHarness(options: LifecycleHarnessOptions = {}) {
  const events: string[] = []
  const closeOutcomes: any[] = []
  let acquireCalls = 0
  let releaseCalls = 0
  const chapterSourceLeases = {
    acquire: async () => {
      acquireCalls += 1
      events.push('task-begin')
      let released = false
      return {
        release: async () => {
          if (released) return
          released = true
          releaseCalls += 1
          events.push('project-source-release')
        },
      }
    },
  }

  ModelGenerationSource.prototype.close = async function close(outcome) {
    closeOutcomes.push(outcome)
    events.push('source-close')
    if (options.closeFailure) throw options.closeFailure
    await originalModelClose.call(this, outcome)
  }

  const draftText = buildPipelineProse(
    '红灯同时亮起，追捕队从四面压进旧巷。江澈听见耳机里的倒数，立刻撞开铁门。',
    '主动打乱包围并夺取通讯器',
  )
  const harness = await createProsePipelineHarness(ctx => {
    const executeAgent = ctx.runtime.executeAgent
    const generateChapterProse = ctx.runtime.generateChapterProse
    const storeChapterProseMemory = ctx.runtime.storeChapterProseMemory
    const hooks = ctx.runtime.hooks
    return createNovelWritingService({
      ...ctx,
      chapterSourceLeases: chapterSourceLeases as any,
      runtime: {
        ...ctx.runtime,
        executeAgent: async (agentId: string, project: any, context: any, runtimeOptions: any) => {
          const kind = classifyProsePipelineTask(agentId, String(context?.task || ''))
          if (kind === 'scene_cards') events.push('scene-cards-finished')
          if (options.stageFailure && options.stageFailureKind === kind) throw options.stageFailure
          return executeAgent(agentId, project, context, runtimeOptions)
        },
        generateChapterProse: async (...args: any[]) => {
          if (options.draftFailure) throw options.draftFailure
          return generateChapterProse(...args)
        },
        storeChapterProseMemory: async (...args: any[]) => {
          events.push('memory-start')
          const result = await storeChapterProseMemory(...args)
          events.push('memory-finished')
          return result
        },
        hooks: {
          ...hooks,
          beforeStoryState: async (input: any) => {
            await hooks.beforeStoryState(input)
            events.push('story-state-prepared')
          },
          afterChapterCommit: async (input: any) => {
            await hooks.afterChapterCommit(input)
            events.push('db-commit-finished')
          },
          beforePostCommitSync: async (input: any) => {
            await hooks.beforePostCommitSync(input)
            events.push('story-state-post-commit-finished')
          },
        },
      },
    })
  }, {
    draftText,
    initialSceneCards: options.initialSceneCards,
    enableMemePolish: options.enableMemePolish,
  })
  workspaces.push(harness.workspace)
  harness.project.reference_config.chapter_generation_source = {
    version: 'chapter_generation_source_v1',
    active: 'model',
    model: { model_id: 217 },
  }
  await updateNovelProject(harness.workspace, harness.project.id, {
    reference_config: harness.project.reference_config,
  })

  return {
    ...harness,
    events,
    closeOutcomes,
    get acquireCalls() { return acquireCalls },
    get releaseCalls() { return releaseCalls },
  }
}

const automaticOptions = {
  model_id: 217,
  production_mode: 'draft_review_revise_store',
  skip_humanize_postprocess: true,
  max_quality_revision_rounds: 0,
}

describe('automatic chapter task lifecycle', () => {
  test('scene_cards_only returns without beginning a chapter task', async () => {
    const harness = await createLifecycleHarness({ initialSceneCards: [] })

    await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, production_mode: 'scene_cards_only' },
    )

    expect(harness.events).toContain('scene-cards-finished')
    expect(harness.acquireCalls).toBe(0)
    expect(harness.closeOutcomes).toEqual([])
  })

  test('begins once after scene cards and closes success after the authoritative boundary', async () => {
    const harness = await createLifecycleHarness({ initialSceneCards: [], enableMemePolish: true })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      automaticOptions,
    )

    expect(harness.acquireCalls).toBe(1)
    expect(harness.releaseCalls).toBe(1)
    expect(harness.closeOutcomes).toEqual([{ status: 'success' }])
    expect(harness.events.indexOf('scene-cards-finished')).toBeLessThan(harness.events.indexOf('task-begin'))
    for (const completed of [
      'story-state-prepared',
      'db-commit-finished',
      'memory-finished',
      'story-state-post-commit-finished',
    ]) {
      expect(harness.events.indexOf(completed)).toBeGreaterThan(-1)
      expect(harness.events.indexOf(completed)).toBeLessThan(harness.events.indexOf('source-close'))
    }
    expect(harness.events.indexOf('source-close')).toBeLessThan(harness.events.indexOf('project-source-release'))

    const stageRuns = (await listNovelRuns(harness.workspace, harness.project.id))
      .filter(run => run.run_type === 'chapter_generation_stage')
    const receipts = stageRuns.map(run => JSON.parse(run.input_ref || '{}'))
    const stages = receipts.map(receipt => receipt.stage)
    expect(stages).toContain('draft')
    expect(stages).toContain('commercial_editor_rewrite')
    expect(stages).toContain('meme_polish')
    expect(stages).toContain('quality_review')
    expect(stages).toContain('story_state_sync')
    expect(new Set(receipts.map(receipt => receipt.task_id)).size).toBe(1)
    expect(new Set(receipts.map(receipt => receipt.source_fingerprint)).size).toBe(1)
    expect(new Set(receipts.map(receipt => receipt.model_id))).toEqual(new Set([217]))
    expect(result.chapter.raw_payload.prose_generation_source).toMatchObject({
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      task_id: receipts[0].task_id,
      source: 'model',
      source_fingerprint: receipts[0].source_fingerprint,
      model_id: 217,
    })
    const storedProvenance = JSON.stringify(result.chapter.raw_payload.prose_generation_source)
    expect(storedProvenance).not.toContain('paragraphTask')
    expect(storedProvenance).not.toContain('raw')
  })

  test('propagates a task stage failure without fallback and closes failed exactly once', async () => {
    const stageFailure = new Error('task editor stage failed')
    const harness = await createLifecycleHarness({ stageFailureKind: 'editor', stageFailure })

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      automaticOptions,
    )).rejects.toBe(stageFailure)

    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: stageFailure }])
    expect(harness.releaseCalls).toBe(1)
  })

  test('classifies abort as cancelled and closes exactly once', async () => {
    const abort = Object.assign(new Error('generation aborted'), { name: 'AbortError' })
    const harness = await createLifecycleHarness({ draftFailure: abort })

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      automaticOptions,
    )).rejects.toBe(abort)

    expect(harness.closeOutcomes).toEqual([{ status: 'cancelled', error: abort }])
    expect(harness.releaseCalls).toBe(1)
  })

  test('preserves the primary failure when task close also fails', async () => {
    const primary = new Error('draft failed first')
    const cleanup = new Error('task close failed second')
    const harness = await createLifecycleHarness({ draftFailure: primary, closeFailure: cleanup })

    const exposed: any = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      automaticOptions,
    ).catch((error: unknown) => error)

    expect(exposed).toBeInstanceOf(AggregateError)
    expect(exposed.errors).toEqual([primary, cleanup])
    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: primary }])
    expect(harness.releaseCalls).toBe(1)
  })
})

describe('chapter draft task execution', () => {
  test('uses the supplied task execution for draft and trusts only its bounded receipt', async () => {
    const fingerprint = `sha256:${'a'.repeat(64)}`
    const contextVersion = `sha256:${'b'.repeat(64)}`
    const provenance = {
      task_id: 'task-draft-1',
      project_id: 1,
      chapter_id: 10,
      source: 'mcp' as const,
      source_fingerprint: fingerprint,
      context_version: contextVersion,
      server_id: 'server-1',
      key_id: 7,
      adapter_id: 'adapter-1',
      agent_id: 'agent-1',
      session_id: 'session-1',
    }
    let draftCalls = 0
    const execution = {
      taskId: provenance.task_id,
      source: 'mcp',
      fingerprint,
      contextVersion,
      provenance: () => provenance,
      generateDraft: async () => {
        draftCalls += 1
        return {
          prose_chapters: [{ chapter_no: 10, chapter_text: '江澈撞开铁门，立刻夺下追兵的通讯器。' }],
          source: 'mcp' as const,
          source_receipt: {
            receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
            ...provenance,
            untrusted_raw: 'must not persist',
          },
        }
      },
    } as unknown as ChapterTaskExecution

    const result = await runGenerateChapterDraftProse({
      activeWorkspace: '/tmp/chapter-task-draft',
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
      options: { request_id: 'chapter-task-draft' },
      getStageModelId: () => { throw new Error('task draft must not resolve another model') },
      chapterTaskExecution: execution,
      getReferenceMigrationPlanForChapter: async () => ({}),
      throwIfChapterGenerationAborted: () => {},
      onStage: async () => {},
    } as any)

    expect(draftCalls).toBe(1)
    expect(result.draftPromptDiagnostics.generation_source).toEqual({
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      ...provenance,
    })
    expect(result).not.toHaveProperty('generationLease')
  })

  test('acceptance fingerprint reader supports chapter receipts and trusted history only', () => {
    const fingerprint = `sha256:${'c'.repeat(64)}`
    const chapterReceipt = {
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      source: 'mcp',
      source_fingerprint: fingerprint,
    }
    const historicalReceipt = {
      receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
      resolved_type: 'mcp',
      binding_fingerprint: fingerprint,
    }

    expect(acceptanceBindingFingerprintFromGenerationSource(chapterReceipt)).toBe(fingerprint)
    expect(acceptanceBindingFingerprintFromGenerationSource({ ...chapterReceipt, source: 'model' })).toBe(fingerprint)
    expect(acceptanceBindingFingerprintFromGenerationSource(historicalReceipt)).toBe(fingerprint)
    for (const untrusted of [
      { ...chapterReceipt, receipt_authority: 'adapter-forged' },
      { ...chapterReceipt, source: 'adapter-forged' },
      { ...chapterReceipt, source_fingerprint: `sha256:${'c'.repeat(63)}` },
      { ...historicalReceipt, resolved_type: 'model' },
      { ...historicalReceipt, binding_fingerprint: 'model-217' },
    ]) {
      expect(acceptanceBindingFingerprintFromGenerationSource(untrusted)).toBe('')
    }
  })
})
