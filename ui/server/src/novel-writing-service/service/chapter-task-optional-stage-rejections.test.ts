import { describe, expect, test } from 'bun:test'
import type { ChapterTaskExecution } from '../generation-source/types'
import { runPostDraftEditorAndMemePolish } from './generate-chapter-editor-meme-polish'
import { runFullProductionAdmissionAndStore } from './generate-chapter-full-production-store'
import { runQualityPrestoreFinalize } from './generate-chapter-quality-prestore-finalize'

const chapterTaskExecution = {} as ChapterTaskExecution
const validProse = [
  '“抱歉，我不能让你进去。”守卫把长枪横在门前，雨水沿着枪缨滴落，映出石阶上被踩乱的泥印。',
  '沈砚没有争辩，只从袖中取出那枚裂开的铜牌，让灯笼的微光照清背面新刻的一道暗纹。',
  '守卫看见暗纹时脸色骤变，握枪的手却没有松开，反而朝城楼阴影里飞快瞥了一眼！',
  '那一眼已经足够，沈砚顺着他的视线看见半扇未关的窗，以及窗后刚刚收回去的黑色衣角。',
  '他故意退下石阶，转身走进雨幕，等城门上的铜铃响过三次，才沿排水沟折回废弃的箭道？',
  '箭道尽头堆着尚带木屑的新箱，箱盖烙着父亲旧部的印记，也证明守卫拦住他并非为了城防。',
].join('\n\n')

function editorMemeArgs(overrides: Record<string, any> = {}) {
  return {
    isDraftOnly: false,
    activeWorkspace: 'ws',
    project: { id: 1 },
    contextPackage: {},
    finalText: validProse,
    finalSceneBreakdown: [],
    finalContinuityNotes: [],
    editorRewrite: null,
    memePolish: null,
    wordTarget: { target: 300, min: 100, max: 1000 },
    preferredModelId: 217,
    llmControlOptions: {},
    ensureProseMeetsWordTarget: async (_workspace: string, _project: any, _context: any, sourceText: string) => ({
      final_text: sourceText,
      final_evaluation: { passed: true },
      word_target_compatibility_pass: false,
    }),
    runCommercialEditorRewrite: async () => ({ final_text: validProse, edited: false, revision: null }),
    runMemePolish: async () => ({ final_text: validProse, polished: false, revision: null }),
    throwIfChapterGenerationAborted: () => {},
    onStage: async () => {},
    ...overrides,
  }
}

function readabilityState(input: {
  execution?: ChapterTaskExecution
  rejection: Error
  stopAfterWarning: Error
  warnings: any[]
}) {
  return {
    activeWorkspace: 'ws',
    chapter: { id: 2, chapter_no: 1 },
    contextPackage: {},
    finalText: validProse,
    llmControlOptions: input.execution ? { chapterTaskExecution: input.execution } : {},
    memePolish: null,
    onStage: async (stage: string, payload: any) => {
      if (stage === 'readability_review' && payload?.status === 'warn') throw input.stopAfterWarning
    },
    options: { run_readability_review: true },
    preferredModelId: 217,
    project: { id: 1, reference_config: {} },
    projectId: 1,
    qualityLoop: {
      final_text: validProse,
      rounds: [],
      final_scan: {},
      final_review: { score: 90, dimensions: {} },
      decision: { passed: true, hard_failures: [], advisory_failures: [] },
    },
    qualityWarningCandidates: input.warnings,
    runReadabilityReview: async () => { throw input.rejection },
    throwIfChapterGenerationAborted: () => {},
  }
}

function storyStateArgs(input: {
  execution?: ChapterTaskExecution
  rejection: Error
  stopAfterWarning: Error
  warnings: any[]
}) {
  return {
    activeWorkspace: 'ws',
    projectId: 1,
    project: { id: 1, reference_config: {} },
    chapter: { id: 2, chapter_no: 1, raw_payload: {} },
    chapters: [],
    characters: [],
    settings: [],
    chapterSettingUsage: [],
    finalText: validProse,
    finalContinuityNotes: [],
    finalSceneBreakdown: [],
    ohStoryDeliveryReceipts: {},
    postDraftDirector: {},
    generatedTitlePatch: {},
    selfCheck: { review: { score: 90 }, revised: false },
    qualityLoop: { decision: { hard_failures: [] } },
    qualityLoopDiagnostics: {},
    qualityGateProject: { reference_config: {} },
    qualityGateReview: { score: 90, issues: [] },
    qualityWarningCandidates: input.warnings,
    openingContinuityFailures: [],
    approvalPolicy: {},
    approvals: {},
    approvalRequired: () => false,
    buildReferenceUsageReport: async () => ({ quality_assessment: { risk_level: 'low' } }),
    getReferenceSafetyDecision: () => ({ blocked: false, score: 100, copy_hit_count: 0, reasons: [] }),
    explainReferenceSafety: () => 'safe',
    buildMigrationAudit: () => ({ passed: true }),
    storeGeneratedReviewRecord: async () => {},
    pendingGeneratedReviews: [],
    throwIfChapterGenerationAborted: () => {},
    onStage: async (stage: string, payload: any) => {
      if (stage === 'story_state' && payload?.status === 'warn') throw input.stopAfterWarning
    },
    runtime: {},
    prepareStoryStateUpdate: async () => { throw input.rejection },
    preferredModelId: 217,
    llmControlOptions: input.execution ? { chapterTaskExecution: input.execution } : {},
    stagedContextUsageReplacement: null,
    stagedPreflightRepair: null,
    contextPackage: {},
    preStoreReceiptSyncContextPackage: {},
    finalReviewContextPackage: {},
    buildProseQualityReview: () => ({}),
    storeChapterProseMemory: async () => {},
    mergeChapterRawPayload: () => ({}),
    editorRewrite: null,
    memePolish: null,
    readabilityReview: null,
    productionMode: 'full',
    draftPromptDiagnostics: {},
    proseRevisionReceiptSync: {},
    deslopRepairReceiptSync: {},
    qualityAuditRepairReceiptSync: {},
    nextChapterQualityPlanReceiptSync: {},
    statusFilterReceiptSync: {},
    writePreparationReceiptSync: {},
    revisionContextReceiptSync: {},
    revisionCascadeImpactSync: {},
    revisionScopeGuardSync: {},
    deterministicProseCleanup: {},
    configSnapshot: {},
  }
}

describe('chapter task rejection at optional-stage callers', () => {
  test('propagates editor task rejection by identity', async () => {
    const rejection = new Error('editor task rejected')
    await expect(runPostDraftEditorAndMemePolish(editorMemeArgs({
      llmControlOptions: { chapterTaskExecution },
      runCommercialEditorRewrite: async () => { throw rejection },
    }))).rejects.toBe(rejection)
  })

  test('propagates meme task rejection by identity', async () => {
    const rejection = new Error('meme task rejected')
    await expect(runPostDraftEditorAndMemePolish(editorMemeArgs({
      llmControlOptions: { chapterTaskExecution },
      runMemePolish: async () => { throw rejection },
    }))).rejects.toBe(rejection)
  })

  test('keeps editor and meme failures soft for legacy callers without a task handle', async () => {
    const result = await runPostDraftEditorAndMemePolish(editorMemeArgs({
      runCommercialEditorRewrite: async () => { throw new Error('legacy editor unavailable') },
      runMemePolish: async () => { throw new Error('legacy meme unavailable') },
    }))

    expect(result.finalText).toBe(validProse)
    expect(result.qualityWarningCandidates.map(item => item.code)).toEqual([
      'editor_unavailable',
      'meme_polish_unavailable',
    ])
  })

  test('propagates readability task rejection instead of emitting a warning', async () => {
    const rejection = new Error('readability task rejected')
    const warnings: any[] = []
    await expect(runQualityPrestoreFinalize(readabilityState({
      execution: chapterTaskExecution,
      rejection,
      stopAfterWarning: new Error('continued after readability rejection'),
      warnings,
    }))).rejects.toBe(rejection)
    expect(warnings).toEqual([])
  })

  test('keeps readability failure soft for legacy callers without a task handle', async () => {
    const rejection = new Error('legacy readability unavailable')
    const stopAfterWarning = new Error('legacy readability warning observed')
    const warnings: any[] = []
    await expect(runQualityPrestoreFinalize(readabilityState({
      rejection,
      stopAfterWarning,
      warnings,
    }))).rejects.toBe(stopAfterWarning)
    expect(warnings.map(item => item.code)).toEqual(['readability_review_unavailable'])
  })

  test('propagates story-state task rejection instead of marking the state pending', async () => {
    const rejection = new Error('story-state task rejected')
    const warnings: any[] = []
    await expect(runFullProductionAdmissionAndStore(storyStateArgs({
      execution: chapterTaskExecution,
      rejection,
      stopAfterWarning: new Error('continued after story-state rejection'),
      warnings,
    }))).rejects.toBe(rejection)
    expect(warnings.some(item => item.source === 'story_state')).toBe(false)
  })

  test('keeps story-state failure pending for legacy callers without a task handle', async () => {
    const rejection = new Error('legacy story-state unavailable')
    const stopAfterWarning = new Error('legacy story-state warning observed')
    const warnings: any[] = []
    await expect(runFullProductionAdmissionAndStore(storyStateArgs({
      rejection,
      stopAfterWarning,
      warnings,
    }))).rejects.toBe(stopAfterWarning)
    expect(warnings.some(item => item.source === 'story_state')).toBe(true)
  })
})
