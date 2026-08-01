import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getNovelProject,
  listChapterVersions,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelReviews,
  listNovelSettingEntities,
} from '../novel'
import {
  countProseChars,
  createNovelWritingService,
  formatAdmissionError,
  resolveChapterWordTarget,
  scanProseForQualityLoop,
} from './novel-writing-service'
import { createNovelReferenceService } from './novel-reference-service'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildCanonicalSurfaceIndex } from '../novel-writing/canonical-continuity'
import { REAL_CHAPTER_11_CANONICAL_CONFLICT_PROSE } from '../novel-writing/fixtures/real-chapter-11-canonical-conflict'
import {
  chapter10HandoffFixture,
  chapterScaleText,
} from '../novel-writing/fixtures/chapter-10-11-handoff'
import {
  buildFocusedProseReviewPrompt,
  buildProseQualityDecision,
  normalizeProseQualityReview,
} from '../novel-writing/prose-quality-loop'
import {
  buildPipelineProse,
  createProsePipelineHarness,
  proseQualityScores,
} from './novel-writing-service.test-support'

describe('novel writing service prose quality wiring b b', () => {
  const classifyInjectedWritingCall = (task: string) => {
    if (task.startsWith('任务：从刚入库的章节正文中提取故事状态机增量')) return 'story_state'
    if (task.startsWith('任务：独立审查小说正文') || task.startsWith('任务：对刚生成的小说章节进行章节级自检')) return 'quality_review'
    if (task.startsWith('任务：只补缺失的 oh-story 结构化自检字段')) return 'structured_review'
    if (task.startsWith('任务：执行第') || task.startsWith('任务：根据自检结果修订本章正文')) return 'quality_revision'
    const humanizeMarkers = [
      '任务：对小说正文片段执行 Humanize Pass',
      '任务：对人工特征不足窗口做',
      '任务：对高风险正文窗口做',
    ]
    if (humanizeMarkers.some(marker => task.startsWith(marker) || task.includes(`\n${marker}`))) return 'humanize'
    if (task.startsWith('任务：克制型网感润色')) return 'meme'
    if (task.includes('商业主编')) return 'editor'
    return 'other'
  }

  const contractionWordTarget = {
    mode: 'custom',
    target: 1000,
    min: 800,
    max: 1100,
    label: '测试章',
    rangeText: '800-1100字',
  }
  const createContractionService = (result: any) => createNovelWritingService({
    getProject: async () => null,
    production: {
      getStageModelId: (_project: any, _stage: string, fallback?: number) => fallback || 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    } as any,
    reference: {} as any,
    runtime: {
      executeAgent: async () => result,
    },
  })

  test('rechecks revised prose before advisory admission classification', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8')
    const orchestratorSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const qualityLoopStart = source.indexOf('let qualityLoop: any')
    const qualitySetupStart = orchestratorSource.indexOf('const qualityPrestoreResult = await runQualityLoopAndPrestoreSetup')
    const gateStart = orchestratorSource.indexOf('return await runFullProductionAdmissionAndStore', qualitySetupStart)
    const reviewCallbackStart = source.indexOf('review: async ({ prompt, round, attempt }) => {', qualityLoopStart)
    const reviseCallbackStart = source.indexOf('revise: async ({ prompt, round }) => {', reviewCallbackStart)
    const qualityLoopEnd = source.indexOf('} catch (error: any) {', reviseCallbackStart)
    const beforeGate = source.slice(qualityLoopStart)
    const reviewBlock = source.slice(reviewCallbackStart, reviseCallbackStart)
    const reviseBlock = source.slice(reviseCallbackStart, qualityLoopEnd)

    expect(qualityLoopStart).toBeGreaterThanOrEqual(0)
    expect(qualitySetupStart).toBeGreaterThanOrEqual(0)
    expect(gateStart).toBeGreaterThan(qualitySetupStart)
    expect(reviewCallbackStart).toBeGreaterThan(qualityLoopStart)
    expect(reviseCallbackStart).toBeGreaterThan(reviewCallbackStart)
    expect(qualityLoopEnd).toBeGreaterThan(reviseCallbackStart)
    expect(beforeGate).toContain('qualityLoop = await runProseQualityLoop')
    expect(beforeGate).toContain('maxRevisionRounds: qualityRevisionRounds')
    expect(beforeGate).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(beforeGate).toContain('round, attempt')
    expect(beforeGate).toContain('qualityWarningCandidates.push(')
    expect(beforeGate).not.toContain('assertProseQualityCanStore')
    expect(beforeGate).not.toContain('runProseSelfReviewAndRevision')
    expect(reviewBlock).toContain('maxTokens: proseQualityReviewMaxTokensForAttempt(attempt)')
    expect(reviewBlock).toContain('上一次审查没有返回可用的完整六维 JSON')
    expect(reviewBlock).toContain('__quality_review_transport')
    expect(reviewBlock).not.toContain('raw_keys: diagnostics.raw_keys')
    expect(reviseBlock).toContain('maxTokens: reviseMaxTokens')
    expect(reviseBlock).not.toContain('proseQualityReviewMaxTokensForAttempt')
  })
  test('keeps explicit draft-only mode usable without subjective quality blocking', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      reviewPayloads: [{ score: 61, publishable: false, dimensions: { ...proseQualityScores, prose_style: 4 }, findings: [] }],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
    })

    expect(result.chapter?.chapter_text).toBe(normalizeProseForStorage(finalText))
    expect(result.completed_stage).toBe('store')
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(result.story_state_status).toBe('pending')
    expect(result.chapter?.raw_payload?.prose_admission).toMatchObject({
      status: 'accepted_with_warnings',
      story_state_status: 'pending',
    })
    expect(harness.storyStateCalls).toBe(0)
    expect(result.post_commit_warnings).toEqual([])
  })
  test('draft-only acceptance omits usage mutations and rolls back injected atomic failure before Memory', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      contextPackageOverride: {
        setting_context: { auto_matched: true, chapter_usage: [{ entity_id: 999999, usage_type: 'required', required: true }] },
      },
    })
    const accepted = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
    })
    expect(accepted.chapter?.chapter_text).toBe(normalizeProseForStorage(finalText))
    expect(await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id)).toEqual([])

    const failureHarness = await createProsePipelineHarness(createNovelWritingService, { draftText: finalText })
    const before = JSON.stringify({
      chapter: (await listNovelChapters(failureHarness.workspace, failureHarness.project.id)).find(row => row.id === failureHarness.chapter.id),
      versions: await listChapterVersions(failureHarness.workspace, failureHarness.chapter.id),
      reviews: await listNovelReviews(failureHarness.workspace, failureHarness.project.id),
      usage: await listNovelChapterSettingUsage(failureHarness.workspace, failureHarness.project.id, failureHarness.chapter.id),
    })
    const error = await failureHarness.service.generateChapterForGroup(failureHarness.workspace, failureHarness.project.id, failureHarness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
      onStage: async (stage: string, payload: any) => {
        if (stage === 'store' && payload?.status === 'running') throw new Error('injected atomic acceptance failure')
      },
    }).then(() => null, (caught: any) => caught)
    const after = JSON.stringify({
      chapter: (await listNovelChapters(failureHarness.workspace, failureHarness.project.id)).find(row => row.id === failureHarness.chapter.id),
      versions: await listChapterVersions(failureHarness.workspace, failureHarness.chapter.id),
      reviews: await listNovelReviews(failureHarness.workspace, failureHarness.project.id),
      usage: await listNovelChapterSettingUsage(failureHarness.workspace, failureHarness.project.id, failureHarness.chapter.id),
    })

    expect(error?.admission_status).toBe('blocked_invalid')
    expect(error?.admission_failure).toMatchObject({ source: 'atomic' })
    expect(after).toBe(before)
    expect(failureHarness.memoryTexts).toEqual([])
  })
  test('stages the real reference report until draft-only atomic acceptance succeeds', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      referenceService: createNovelReferenceService(),
    })

    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
      onStage: async (stage: string, payload: any) => {
        if (stage === 'store' && payload?.status === 'running') throw new Error('injected atomic acceptance failure')
      },
    }).then(() => null, (caught: any) => caught)
    const reviews = await listNovelReviews(harness.workspace, harness.project.id)

    expect(error?.admission_failure).toMatchObject({ source: 'atomic' })
    expect(reviews.filter(item => item.review_type === 'reference_report')).toEqual([])
    expect(harness.memoryTexts).toEqual([])
  })
  test('rethrows cancellation from reference reporting without chapter, review, or Memory writes', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const referenceService = createNovelReferenceService()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      referenceService: {
        ...referenceService,
        getReferenceMigrationPlanForChapter: async () => ({}),
        buildReferenceUsageReport: async () => {
          throw Object.assign(new Error('reference report aborted'), { name: 'AbortError' })
        },
      },
    })
    const beforeChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
    }).then(() => null, (caught: any) => caught)
    const afterChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(error?.name).toBe('AbortError')
    expect(afterChapter).toEqual(beforeChapter)
    expect(await listNovelReviews(harness.workspace, harness.project.id)).toEqual([])
    expect(harness.memoryTexts).toEqual([])
  })
  test('checks cancellation immediately before draft-only atomic acceptance', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const controller = new AbortController()
    const harness = await createProsePipelineHarness(createNovelWritingService, { draftText: finalText })
    const beforeChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
      abortSignal: controller.signal,
      onStage: async (stage: string, payload: any) => {
        if (stage === 'store' && payload?.status === 'running') controller.abort()
      },
    }).then(() => null, (caught: any) => caught)
    const afterChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(error?.code).toBe('REQUEST_CANCELED')
    expect(afterChapter).toEqual(beforeChapter)
    expect(await listNovelReviews(harness.workspace, harness.project.id)).toEqual([])
    expect(harness.memoryTexts).toEqual([])
  })
  test('redacts and bounds secret-bearing admission and post-commit errors', async () => {
    const secretError = 'https://provider.example/path?api_key=SECRET_QUERY Bearer SECRET_BEARER token=SECRET_TOKEN ' + 'x'.repeat(1000)
    const formatted = formatAdmissionError(new Error(secretError), 180)
    expect(formatted.length).toBeLessThanOrEqual(180)
    for (const sentinel of ['provider.example', 'SECRET_QUERY', 'SECRET_BEARER', 'SECRET_TOKEN']) expect(formatted).not.toContain(sentinel)

    const referenceService = createNovelReferenceService()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击'),
      memoryError: new Error(secretError),
      referenceService: {
        ...referenceService,
        getReferenceMigrationPlanForChapter: async () => ({}),
        buildReferenceUsageReport: async () => { throw new Error(secretError) },
      },
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
    })
    const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const storedReviews = await listNovelReviews(harness.workspace, harness.project.id)
    const observable = JSON.stringify({ result, storedChapter, storedReviews })

    for (const sentinel of ['provider.example', 'SECRET_QUERY', 'SECRET_BEARER', 'SECRET_TOKEN']) expect(observable).not.toContain(sentinel)
    expect(result.post_commit_warnings).toContainEqual(expect.objectContaining({ stage: 'memory' }))
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'reference_review_unavailable' }))
  })
  test('records caught editor, meme, and readability failures as admission warnings', () => {
    const source = [
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
    ].join('\n')
    const editorCatch = source.slice(source.indexOf('} catch (editorError)'), source.indexOf('const postEditorWordTargetCheck'))
    const memeCatch = source.slice(source.indexOf('} catch (memeError)'), source.indexOf('const postMemeWordTargetCheck'))
    const readabilityStart = source.indexOf('} catch (readabilityError)')
    const readabilityCatch = source.slice(readabilityStart, source.indexOf('} else {', readabilityStart))
    expect(editorCatch).toContain("proseAdmissionWarning('review', 'editor_unavailable'")
    expect(memeCatch).toContain("proseAdmissionWarning('review', 'meme_polish_unavailable'")
    expect(readabilityCatch).toContain("proseAdmissionWarning('review', 'readability_review_unavailable'")
  })
  test('uses the project quality threshold when the request omits one', async () => {
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      reviewPayloads: [{
        score: 77,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [],
      }],
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        auto_repair_quality_gate: true,
        max_quality_revision_rounds: 0,
      },
    )

    expect(result).toMatchObject({
      admission_status: 'accepted_with_warnings',
      quality_loop: {
        decision: {
          passed: false,
          score: 77,
          min_score: 78,
        },
      },
    })
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateCalls).toBe(1)
  })
  test('marks an explicit reference safety block blocked_invalid before draft-only commit or any writes', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, { draftText: finalText })
    let storyStateHookCalls = 0
    let memoryCalls = 0
    const injectedCallOrder: string[] = []
    const service = createNovelWritingService({
      getProject: async () => harness.project,
      production: {
        buildAgentConfigSnapshot: () => ({ model_id: 217 }),
        getApprovalPolicy: () => ({}),
        getStageModelId: () => 217,
        getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
        approvalRequired: () => false,
        buildApprovalError: (type: string, message: string, details: any) => Object.assign(new Error(message), { code: `APPROVAL_REQUIRED_${type.toUpperCase()}`, details }),
      } as any,
      reference: {
        getReferenceMigrationPlanForChapter: async () => ({}),
        buildReferenceUsageReport: async () => ({ quality_assessment: { risk_level: 'blocked' }, copied: true }),
        getReferenceSafetyDecision: () => ({ blocked: true, score: 0, copy_hit_count: 1, reasons: ['explicit copyright block'] }),
        explainReferenceSafety: () => 'explicit copyright block',
        buildMigrationAudit: () => ({ passed: false }),
      } as any,
      runtime: {
        buildChapterContext: async () => ({
          preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
          chapter_target: {
            id: harness.chapter.id,
            chapter_no: harness.chapter.chapter_no,
            title: harness.chapter.title,
            goal: harness.chapter.chapter_goal,
            summary: harness.chapter.chapter_summary,
            conflict: harness.chapter.conflict,
            ending_hook: harness.chapter.ending_hook,
            scene_cards: harness.chapter.scene_list,
          },
          continuity: { previous_chapter: { chapter_no: 9, ending_excerpt: '追兵封住旧巷。' } },
        }),
        generateChapterProse: async () => {
          injectedCallOrder.push('draft')
          return { parsed: { chapter_no: 10, chapter_text: finalText }, finish_reason: 'stop' }
        },
        runHumanizePostProcess: async (_workspace: string, _project: any, _context: any, sourceText: string) => {
          injectedCallOrder.push(classifyInjectedWritingCall(
            '【角色设定 · 资深网文作者】\n任务：对小说正文片段执行 Humanize Pass A（结构重写）。只输出改写后正文。',
          ))
          return { final_text: sourceText, report: { accepted: true } }
        },
        executeAgent: async (_agent: string, _project: any, input: any) => {
          const task = String(input?.task || '')
          const callKind = classifyInjectedWritingCall(task)
          injectedCallOrder.push(callKind)
          if (task.includes('商业主编')) return { parsed: { chapter_text: finalText, editor_report: { passed: true } } }
          if (task.startsWith('任务：独立审查小说正文')) return { parsed: { score: 90, publishable: true, dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 }, findings: [] } }
          if (callKind === 'story_state') {
            return { parsed: { state_delta: { open_questions: ['x'] } } }
          }
          return { parsed: {} }
        },
        storeChapterProseMemory: async () => { memoryCalls += 1 },
        hooks: {
          beforeStoryState: () => { storyStateHookCalls += 1 },
        },
      },
    })
    const before = JSON.stringify({
      chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })

    const error = await service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
    }).then(() => null, (caught: any) => caught)
    const after = JSON.stringify({
      chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })

    expect(error).toMatchObject({
      code: 'REFERENCE_SAFETY_BLOCKED',
      admission_status: 'blocked_invalid',
      admission_failure: { source: 'safety' },
    })
    expect(after).toBe(before)
    expect(storyStateHookCalls).toBe(0)
    expect(injectedCallOrder[0]).toBe('draft')
    expect(injectedCallOrder.indexOf('humanize')).toBeGreaterThan(0)
    expect(injectedCallOrder.indexOf('quality_review')).toBeGreaterThan(injectedCallOrder.indexOf('humanize'))
    expect(memoryCalls).toBe(0)
  })
  test('stores complete prose when the structured quality review is unavailable', async () => {
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击'),
      reviewPayloads: [{}, {}],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
    })

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(harness.storeCalls).toBe(1)
    expect(harness.memoryTexts).toHaveLength(1)
  })
  test('stores prior complete prose when optional quality revision is unavailable', async () => {
    const originalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: originalText,
      reviewPayloads: [{
        score: 72,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '江澈撞开铁门',
          required_change: '补足行动代价', acceptance_test: '行动产生可见代价',
        }],
      }],
      revisionResults: [{ error: 'revision provider unavailable' }],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
    })

    expect(result.chapter?.chapter_text).toBe(normalizeProseForStorage(originalText))
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'quality_revision_unavailable', source: 'review' }))
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(JSON.stringify(result)).not.toContain('revision provider unavailable')
  })
  test('keeps an accepted chapter successful when final prose memory storage fails', async () => {
    const originalDraft = buildPipelineProse(
      '倒数压到最后三秒，江澈停在围墙阴影里等待。',
      '只看着追捕队继续收紧包围',
    )
    const finalText = normalizeProseForStorage(buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    ))
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: originalDraft,
      reviewPayloads: [
        {
          score: 72,
          dimensions: proseQualityScores,
          findings: [{
            key: 'agency',
            severity: 'S2',
            dimension: 'core_promise_agency',
            evidence: '倒数压到最后三秒，江澈停在围墙阴影里等待。',
            required_change: '让江澈主动破围',
            acceptance_test: '追捕阵型因主角动作改变',
          }],
        },
        {
          score: 88,
          publishable: true,
          dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 },
          findings: [],
        },
      ],
      revisionTexts: [finalText],
      memoryError: new Error('memory palace unavailable'),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      auto_repair_quality_gate: true,
    })
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(result.chapter?.chapter_text).toBe(finalText)
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.post_commit_warnings).toContainEqual(expect.objectContaining({ stage: 'memory' }))
    expect(stored?.chapter_text).toBe(finalText)
    expect(stored?.raw_payload?.prose_admission).toMatchObject({
      status: 'accepted_with_warnings',
      post_commit_warnings: [expect.objectContaining({ stage: 'memory' })],
    })
    expect(result.chapter?.raw_payload?.prose_admission).toEqual(stored?.raw_payload?.prose_admission)
    expect(harness.memoryTexts).toEqual([finalText])
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateCalls).toBe(1)
    expect(harness.storyStateTexts).toEqual([finalText])
    expect(harness.modelCalls.draft).toBe(1)
    expect(harness.modelCalls.revision).toBe(1)
    expect(harness.modelCalls.review).toBe(2)
  })
  test('keeps stored prose when admission metadata persistence fails and returns only a redacted warning', async () => {
    const secret = 'https://provider.example/path?api_key=SECRET_QUERY Bearer SECRET_BEARER token=SECRET_TOKEN'
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      memoryError: new Error('memory unavailable'),
      admissionMetadataError: new Error(secret),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, target_word_count: 1000 })
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const observable = JSON.stringify(result)

    expect(stored?.chapter_text).toBe(normalizeProseForStorage(finalText))
    expect(result.chapter?.chapter_text).toBe(stored?.chapter_text)
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.post_commit_warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: 'memory' }),
      expect.objectContaining({ stage: 'admission_metadata' }),
    ]))
    for (const sentinel of ['provider.example', 'SECRET_QUERY', 'SECRET_BEARER', 'SECRET_TOKEN']) expect(observable).not.toContain(sentinel)
  })
  test('persists draft-only post-commit warnings through the raw payload merge helper', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      afterCommitError: new Error('after commit hook failed'),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      production_mode: 'draft_only',
    })
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(stored?.chapter_text).toBe(normalizeProseForStorage(finalText))
    expect(stored?.raw_payload?.prose_admission).toMatchObject({
      status: 'accepted_with_warnings',
      post_commit_warnings: [expect.objectContaining({ stage: 'after_commit_hook' })],
    })
  })
  test('attempts accepted prose memory after chapter storage without depending on a returned record', () => {
    const source = [
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-post-commit.ts'), 'utf8'),
    ].join('\n')
    const storageStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(activeWorkspace, {')
    const memoryStore = source.indexOf('await storeChapterProseMemory(project, chapter.chapter_no, finalText)', storageStart)
    const storyState = source.indexOf("runPostCommitBestEffort('story_state_stage'", storageStart)
    const postStorageBlock = source.slice(storageStart, storyState)

    expect(storageStart).toBeGreaterThanOrEqual(0)
    expect(memoryStore).toBeGreaterThan(storageStart)
    expect(memoryStore).toBeLessThan(storyState)
    expect(postStorageBlock).toContain("runPostCommitBestEffort('memory'")
    expect(source).toContain('createPostCommitWarningRunner')
    expect(source).toContain('resyncChapterPlanAlignmentAfterProseStore')
  })
})
