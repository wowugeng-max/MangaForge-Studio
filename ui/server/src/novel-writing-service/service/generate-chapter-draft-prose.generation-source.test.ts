import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import {
  listNovelRuns,
  mutateNovelProjectGenerationSource,
} from '../../novel'
import {
  buildPipelineProse,
  classifyProsePipelineTask,
  createProsePipelineHarness,
  proseQualityScores,
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
import { toLegacyProseGenerationSource } from '../generation-source/source-config'

const workspaces: string[] = []
const originalModelClose = ModelGenerationSource.prototype.close
const originalModelGenerateDraft = ModelGenerationSource.prototype.generateDraft
const originalModelExecuteAgent = ModelGenerationSource.prototype.executeAgent

afterEach(async () => {
  ModelGenerationSource.prototype.close = originalModelClose
  ModelGenerationSource.prototype.generateDraft = originalModelGenerateDraft
  ModelGenerationSource.prototype.executeAgent = originalModelExecuteAgent
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

type LifecycleHarnessOptions = {
  initialSceneCards?: any[]
  stageFailureKind?: ReturnType<typeof classifyProsePipelineTask>
  stageFailure?: Error
  draftFailure?: Error
  abortBeforeDraftFailure?: AbortController
  closeFailure?: Error
  enableMemePolish?: boolean
  reviewPayloads?: any[]
  revisionTexts?: string[]
  contextPackageOverride?: any
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
    events.push('source-close-start')
    if (options.closeFailure) throw options.closeFailure
    await originalModelClose.call(this, outcome)
    events.push('source-close')
  }
  ModelGenerationSource.prototype.generateDraft = async function generateDraft(request) {
    events.push(`stage:draft:${this.taskId}`)
    return originalModelGenerateDraft.call(this, request)
  }
  ModelGenerationSource.prototype.executeAgent = async function executeAgent(
    stage,
    responseContract,
    agentId,
    project,
    context,
    runtimeOptions,
  ) {
    events.push(`stage:${stage}:${this.taskId}`)
    return originalModelExecuteAgent.call(
      this,
      stage,
      responseContract,
      agentId,
      project,
      context,
      runtimeOptions,
    )
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
          options.abortBeforeDraftFailure?.abort()
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
    reviewPayloads: options.reviewPayloads,
    revisionTexts: options.revisionTexts,
    contextPackageOverride: options.contextPackageOverride,
  })
  workspaces.push(harness.workspace)
  const chapterGenerationSource = {
    version: 'chapter_generation_source_v1',
    active: 'model' as const,
    model: { model_id: 217 },
  }
  const configured = await mutateNovelProjectGenerationSource(harness.workspace, {
    projectId: harness.project.id,
    operation: 'test-configure-generation-source',
    chapterGenerationSource,
    proseGenerationSource: toLegacyProseGenerationSource(chapterGenerationSource),
    result: true,
  })
  if (!configured) throw new Error('test project disappeared while configuring generation source')
  harness.project.reference_config = configured.project.reference_config

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
    expect(result.chapter.raw_payload.chapter_generation_source).toMatchObject({
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      task_id: receipts[0].task_id,
      source: 'model',
      source_fingerprint: receipts[0].source_fingerprint,
      model_id: 217,
    })
    expect(result.chapter.raw_payload).not.toHaveProperty('prose_generation_source')
    const storedProvenance = JSON.stringify(result.chapter.raw_payload.chapter_generation_source)
    expect(storedProvenance).not.toContain('paragraphTask')
    expect(storedProvenance).not.toContain('raw')
  })

  test('emits one ordered task pipeline through optional full-production stages and close', async () => {
    const repairedText = buildPipelineProse(
      '红灯再次亮起，江澈迎着包围向前一步，先切断了追捕队的备用频道。',
      '改写包围规则并夺下备用通讯器',
    )
    const harness = await createLifecycleHarness({
      initialSceneCards: [],
      enableMemePolish: true,
      reviewPayloads: [
        {
          score: 72,
          dimensions: proseQualityScores,
          findings: [{
            key: 'agency',
            severity: 'S2',
            dimension: 'core_promise_agency',
            evidence: '主动打乱包围并夺取通讯器',
            required_change: '让江澈主动切断备用频道并迫使追捕队改变阵型。',
            acceptance_test: '备用频道因江澈的可见动作失效。',
          }],
        },
        {
          score: 90,
          publishable: true,
          dimensions: {
            continuity: 9,
            core_promise_agency: 9,
            conflict_causality: 9,
            payoff_hook: 9,
            prose_style: 9,
            fact_setting_safety: 9,
          },
          findings: [],
        },
      ],
      revisionTexts: [repairedText],
    })

    await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        ...automaticOptions,
        skip_humanize_postprocess: false,
        enable_humanize_postprocess: true,
        full_pass_a: true,
        run_readability_review: true,
        max_quality_revision_rounds: 1,
      },
    )

    const ordered = harness.events.filter((event) => {
      if (event === 'scene-cards-finished'
        || event === 'task-begin'
        || event === 'db-commit-finished'
        || event === 'source-close') return true
      return event.startsWith('stage:')
    })
    const stages = ordered.map(event => event.split(':').slice(0, 2).join(':'))
    expect(stages).toEqual([
      'scene-cards-finished',
      'task-begin',
      'stage:draft',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:commercial_editor_rewrite',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:meme_polish',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:word_target_repair',
      'stage:quality_review',
      'stage:quality_repair',
      'stage:quality_recheck',
      'stage:humanize',
      'stage:humanize',
      'stage:quality_recheck',
      'stage:readability_review',
      'stage:story_state_sync',
      'db-commit-finished',
      'source-close',
    ])
    const taskIds = ordered
      .filter(event => event.startsWith('stage:'))
      .map(event => event.split(':')[2])
    expect(new Set(taskIds).size).toBe(1)
    expect(harness.closeOutcomes).toEqual([{ status: 'success' }])
  })

  test('keeps conditional post-editor word repairs on the same task execution', async () => {
    const harness = await createLifecycleHarness({ enableMemePolish: true })

    await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      automaticOptions,
    )

    const stageEvents = harness.events.filter(event => event.startsWith('stage:'))
    const editorIndex = stageEvents.findIndex(event => event.startsWith('stage:commercial_editor_rewrite:'))
    const qualityIndex = stageEvents.findIndex(event => event.startsWith('stage:quality_review:'))
    const conditionalRepairs = stageEvents
      .slice(editorIndex + 1, qualityIndex)
      .filter(event => event.startsWith('stage:word_target_repair:'))
    const taskIds = stageEvents.map(event => event.split(':')[2])

    expect(editorIndex).toBeGreaterThan(-1)
    expect(qualityIndex).toBeGreaterThan(editorIndex)
    expect(conditionalRepairs.length).toBeGreaterThan(0)
    expect(new Set(taskIds).size).toBe(1)
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
    harness.events.push('caller-observed-failure')

    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: stageFailure }])
    expect(harness.releaseCalls).toBe(1)
    expect(harness.events.slice(-3)).toEqual([
      'source-close',
      'project-source-release',
      'caller-observed-failure',
    ])
  })

  test('uses the aborted task signal to close cancelled for an ordinary downstream error', async () => {
    const controller = new AbortController()
    const failure = new Error('ordinary downstream failure')
    const harness = await createLifecycleHarness({
      draftFailure: failure,
      abortBeforeDraftFailure: controller,
    })

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { ...automaticOptions, abortSignal: controller.signal },
    )).rejects.toBe(failure)
    harness.events.push('caller-observed-cancellation')

    expect(controller.signal.aborted).toBe(true)
    expect(harness.closeOutcomes).toEqual([{ status: 'cancelled', error: failure }])
    expect(harness.releaseCalls).toBe(1)
    expect(harness.events.slice(-3)).toEqual([
      'source-close',
      'project-source-release',
      'caller-observed-cancellation',
    ])
  })

  test('does not infer cancellation from an abort-like message when the task signal is not aborted', async () => {
    const controller = new AbortController()
    const failure = new Error('ordinary provider abort marker without cancellation')
    const harness = await createLifecycleHarness({ draftFailure: failure })

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { ...automaticOptions, abortSignal: controller.signal },
    )).rejects.toBe(failure)

    expect(controller.signal.aborted).toBe(false)
    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: failure }])
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

  test('passes the execution fingerprint to acceptance even when the draft returns forged provenance', async () => {
    const harness = await createLifecycleHarness()
    ModelGenerationSource.prototype.generateDraft = async function generateDraft(request) {
      const result = await originalModelGenerateDraft.call(this, request)
      const rotatedChapterSource = {
        version: 'chapter_generation_source_v1' as const,
        active: 'model' as const,
        model: { model_id: 218 },
      }
      await mutateNovelProjectGenerationSource(harness.workspace, {
        projectId: harness.project.id,
        operation: 'test-rotate-generation-source',
        chapterGenerationSource: rotatedChapterSource,
        proseGenerationSource: toLegacyProseGenerationSource(rotatedChapterSource),
        result: true,
      })
      return {
        ...result,
        source_receipt: {
          receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
          task_id: 'forged-provider-task',
          project_id: harness.project.id,
          chapter_id: harness.chapter.id,
          source: 'model',
          source_fingerprint: `sha256:${'f'.repeat(64)}`,
          context_version: `sha256:${'0'.repeat(64)}`,
          model_id: 999,
        },
      }
    }

    const exposed: any = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        ...automaticOptions,
        production_mode: 'draft_only',
      },
    ).catch((error: unknown) => error)

    expect(exposed).toMatchObject({ code: 'GENERATION_SOURCE_CHANGED' })
    expect(harness.modelCalls.draft).toBe(1)
    expect(harness.closeOutcomes).toEqual([{ status: 'failed', error: exposed }])
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

  test('derives bounded provenance from the execution handle when draft receipts are missing or forged', async () => {
    const fingerprint = `sha256:${'d'.repeat(64)}`
    const contextVersion = `sha256:${'e'.repeat(64)}`
    const oversizedSession = 'remote-session-'.repeat(50)
    const provenance = {
      task_id: 'task-local-authority-1',
      project_id: 1,
      chapter_id: 10,
      source: 'mcp' as const,
      source_fingerprint: fingerprint,
      context_version: contextVersion,
      server_id: 'server-local',
      key_id: 7,
      adapter_id: 'adapter-local',
      agent_id: 'agent-local',
      session_id: oversizedSession,
      untrusted_extra: 'must not persist',
    }
    const receiptCases = [
      undefined,
      {
        receipt_authority: 'wrong-authority',
        ...provenance,
      },
      {
        receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        task_id: 'forged-task',
        project_id: 999,
        chapter_id: 999,
        source: 'model',
        source_fingerprint: `sha256:${'f'.repeat(64)}`,
        context_version: `sha256:${'0'.repeat(64)}`,
        model_id: 999,
        session_id: 'forged-session',
      },
    ]

    for (const [index, sourceReceipt] of receiptCases.entries()) {
      let draftCalls = 0
      let ordinaryAgentCalls = 0
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
            ...(sourceReceipt === undefined ? {} : { source_receipt: sourceReceipt }),
          }
        },
        executeAgent: async () => {
          ordinaryAgentCalls += 1
          throw new Error('draft must not invoke the ordinary Agent port')
        },
      } as unknown as ChapterTaskExecution

      const result = await runGenerateChapterDraftProse({
        activeWorkspace: `/tmp/chapter-task-local-authority-${index}`,
        project: { id: 1, reference_config: {} },
        chapter: { id: 10, chapter_no: 10, title: '第十章' },
        chapters: [],
        worldbuilding: {},
        characters: [],
        outlines: [],
        contextPackage: {},
        generationContract: {},
        wordTarget: { target: 1000 },
        options: { request_id: `chapter-task-local-authority-${index}` },
        chapterTaskExecution: execution,
        getReferenceMigrationPlanForChapter: async () => ({}),
        throwIfChapterGenerationAborted: () => {},
        onStage: async () => {},
      } as any)

      expect(draftCalls).toBe(1)
      expect(ordinaryAgentCalls).toBe(0)
      expect(result.draftPromptDiagnostics.generation_source).toMatchObject({
        receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
        task_id: provenance.task_id,
        project_id: provenance.project_id,
        chapter_id: provenance.chapter_id,
        source: provenance.source,
        source_fingerprint: fingerprint,
        context_version: contextVersion,
        server_id: provenance.server_id,
        key_id: provenance.key_id,
        adapter_id: provenance.adapter_id,
        agent_id: provenance.agent_id,
      })
      expect(result.draftPromptDiagnostics.generation_source.session_id).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(result.draftPromptDiagnostics.generation_source).not.toHaveProperty('untrusted_extra')
      expect(JSON.stringify(result.draftPromptDiagnostics.generation_source)).not.toContain('forged')
    }
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
