import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  countProseChars,
  createNovelWritingService,
  resolveChapterWordTarget,
  scanProseForQualityLoop,
} from './novel-writing-service'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildPipelineProse, createProsePipelineHarness } from './novel-writing-service.test-support'

describe('novel writing service prose quality wiring', () => {
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

  test('applies the prose word-target soft cap inside the quality-loop scanner', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const softCapScan = scanProseForQualityLoop('字'.repeat(5219), {}, target)
    const overTargetScan = scanProseForQualityLoop('字'.repeat(5700), {}, target)

    expect(softCapScan.word_target).toMatchObject({
      actual: 5219,
      passed: true,
      soft_cap: true,
    })
    expect(softCapScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(false)
    expect(overTargetScan.word_target).toMatchObject({
      actual: 5700,
      passed: false,
      soft_cap: false,
    })
    expect(overTargetScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(true)
  })

  test('rejects an open chapter string returned with a length finish reason during contraction', async () => {
    const originalText = '原'.repeat(1400)
    const candidateText = '改'.repeat(1000)
    const service = createContractionService({
      content: `{"prose_chapters":[{"chapter_no":1,"chapter_text":"${candidateText}`,
      finish_reason: 'LeNgTh',
      usage: { input_tokens: 120, output_tokens: 1000, total_tokens: 1120 },
    })

    const error = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-length',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1 },
    ).then(() => null, (caught: any) => caught)

    expect(error?.code).toBe('PROSE_WORD_TARGET_LONG')
    expect(error?.final_evaluation?.actual).toBe(countProseChars(originalText))
    expect(error?.final_evaluation?.too_long).toBe(true)
    expect(error?.contraction_attempts).toHaveLength(1)
    const attempt = error?.contraction_attempts?.[0]
    expect(attempt).toMatchObject({
      finish_reason: 'length',
      model_usage: { output_tokens: 1000 },
      returned_text: true,
      candidate_rejected: true,
      recovered_from_partial_json: true,
      partial_json_open_string_recovered: true,
    })
    expect(attempt?.rejection_reason).toContain('finish_reason_length')
    expect(attempt).not.toHaveProperty('candidate_text')
    expect(attempt).not.toHaveProperty('prompt')
  })

  test('rejects a closed chapter string recovered from a max-token truncated JSON envelope during contraction', async () => {
    const originalText = '原'.repeat(1400)
    const candidateText = '缩'.repeat(1000)
    const service = createContractionService({
      content: `{"prose_chapters":[{"chapter_no":1,"chapter_text":"${candidateText}","scene_breakdown":[`,
      raw: {
        stop_reason: 'MAX_TOKENS',
        usage: { input_tokens: 120, output_tokens: 1000, total_tokens: 1120 },
      },
    })

    const error = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-max-tokens',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1 },
    ).then(() => null, (caught: any) => caught)

    expect(error?.code).toBe('PROSE_WORD_TARGET_LONG')
    expect(error?.final_evaluation?.actual).toBe(countProseChars(originalText))
    expect(error?.final_evaluation?.too_long).toBe(true)
    expect(error?.contraction_attempts).toHaveLength(1)
    const attempt = error?.contraction_attempts?.[0]
    expect(attempt).toMatchObject({
      finish_reason: 'max_tokens',
      model_usage: { output_tokens: 1000 },
      returned_text: true,
      candidate_rejected: true,
      recovered_from_partial_json: true,
      partial_json_open_string_recovered: false,
    })
    expect(attempt?.rejection_reason).toContain('finish_reason_max_tokens')
    expect(attempt).not.toHaveProperty('candidate_text')
    expect(attempt).not.toHaveProperty('prompt')
  })

  test('restores the valid pre-editor prose when optional editor output cannot meet the word target', async () => {
    const draftText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const editorText = `${draftText}${'商业主编增加的冗余解释没有改变场景状态。'.repeat(30)}`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText,
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        quality_threshold: 78,
        auto_repair_quality_gate: true,
      },
    )

    const expectedStoredText = normalizeProseForStorage(draftText)
    expect(countProseChars(editorText)).toBeGreaterThan(1100)
    expect(result.chapter.chapter_text).toBe(expectedStoredText)
    expect(result.chapter.chapter_text).not.toContain('商业主编增加的冗余解释')
    expect(result.editor_rewrite).toMatchObject({
      edited: false,
      discarded: true,
      discard_reason: 'post_editor_word_target_failed',
    })
    expect(JSON.stringify(result.editor_rewrite)).not.toContain('商业主编增加的冗余解释')
    expect(result.quality_loop.decision.passed).toBe(true)
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateTexts).toEqual([expectedStoredText])
  })

  test('rechecks revised prose before unattended quality gate blocks chapter advance', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const qualityLoopStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>')
    const gateStart = source.indexOf('const preStoreQualityDecision =', qualityLoopStart)
    const reviewCallbackStart = source.indexOf('review: async ({ prompt, round }) => {', qualityLoopStart)
    const reviseCallbackStart = source.indexOf('revise: async ({ prompt, round }) => {', reviewCallbackStart)
    const qualityLoopEnd = source.indexOf('\n    } catch (error: any) {', reviseCallbackStart)
    const beforeGate = source.slice(qualityLoopStart, gateStart)
    const reviewBlock = source.slice(reviewCallbackStart, reviseCallbackStart)
    const reviseBlock = source.slice(reviseCallbackStart, qualityLoopEnd)

    expect(qualityLoopStart).toBeGreaterThanOrEqual(0)
    expect(gateStart).toBeGreaterThan(qualityLoopStart)
    expect(reviewCallbackStart).toBeGreaterThan(qualityLoopStart)
    expect(reviseCallbackStart).toBeGreaterThan(reviewCallbackStart)
    expect(qualityLoopEnd).toBeGreaterThan(reviseCallbackStart)
    expect(beforeGate).toContain('qualityLoop = await runProseQualityLoop')
    expect(beforeGate).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 2')
    expect(beforeGate).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(beforeGate).toContain('assertProseQualityCanStore(qualityLoop.decision, approvals?.quality_gate)')
    expect(beforeGate).not.toContain('runProseSelfReviewAndRevision')
    expect(reviewBlock).toContain('maxTokens: 5000')
    expect(reviseBlock).toContain('maxTokens: proseMaxTokensForWordTarget(wordTarget)')
    expect(reviseBlock).not.toContain('maxTokens: 5000')
  })
})
