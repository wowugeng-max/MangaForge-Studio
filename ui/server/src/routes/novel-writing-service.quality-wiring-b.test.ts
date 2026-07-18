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

describe('novel writing service prose quality wiring b', () => {
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

  test('restores earned-compatible prose when optional meme polish exceeds the compatibility ceiling', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, { draftText, editorText: draftText, memeText: '润'.repeat(7000), enableMemePolish: true, chapterWordTarget: { mode: 'standard' } })
    const stages: any[] = []
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, onStage: async (_name: string, payload: any) => stages.push(payload) })
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(stages).toEqual(expect.arrayContaining([expect.objectContaining({ phase: 'post_meme_polish', fallback: 'pre_meme', compatibility_pass: true })]))
  })
  test('returns complete standard overlong prose with a warning after unusable contractions', async () => {
    const originalText = '原'.repeat(6761)
    const wordTarget = { mode: 'standard', label: '标准章', target: 4200, min: 3200, max: 5200, rangeText: '3200-5200 字' }
    const service = createContractionService({ parsed: {}, finish_reason: 'stop' })

    const result = await service.ensureProseMeetsWordTarget('/tmp/compat-warning', { id: 1 }, { chapter_target: { word_target: wordTarget } }, originalText, 217)

    expect(result.final_text).toBe(originalText)
    expect(result.final_evaluation.actual).toBe(6761)
    expect(result.word_target_warning).toMatchObject({
      code: 'word_target_long',
      source: 'word_target',
      details: { evaluation: expect.any(Object), final_evaluation: expect.any(Object) },
    })
  })
  test('returns the closest smaller complete custom contraction with a warning', async () => {
    const originalText = '原'.repeat(6596)
    const candidates = ['缩'.repeat(6300), '改'.repeat(6100)]
    const service = createNovelWritingService({
      getProject: async () => null,
      production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
      reference: {} as any,
      runtime: { executeAgent: async () => ({ parsed: { chapter_text: candidates.shift() }, finish_reason: 'stop' }) },
    })
    const wordTarget = { mode: 'custom', label: '自定义', target: 5200, min: 4680, max: 5720, rangeText: '4680-5720 字' }

    const result = await service.ensureProseMeetsWordTarget('/tmp/custom-warning', { id: 1 }, { chapter_target: { word_target: wordTarget } }, originalText, 217, { maxContractionAttempts: 2 })

    expect(result.final_text).toBe('改'.repeat(6100))
    expect(result.final_evaluation.actual).toBe(6100)
    expect(result.word_target_warning).toMatchObject({ code: 'word_target_long', source: 'word_target' })
  })
  test('returns the longest complete expansion with a short warning and never selects a truncated candidate', async () => {
    const originalText = '原'.repeat(500)
    const results = [
      { parsed: { chapter_text: '扩'.repeat(650) }, finish_reason: 'stop' },
      { parsed: { chapter_text: '截'.repeat(900) }, finish_reason: 'length' },
      { parsed: { chapter_text: '增'.repeat(700) }, finish_reason: 'stop' },
    ]
    const service = createNovelWritingService({
      getProject: async () => null,
      production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
      reference: {} as any,
      runtime: { executeAgent: async () => results.shift() },
    })

    const result = await service.ensureProseMeetsWordTarget('/tmp/short-warning', { id: 1 }, { chapter_target: { word_target: contractionWordTarget } }, originalText, 217)

    expect(result.final_text).toBe('增'.repeat(700))
    expect(result.final_text).not.toContain('截')
    expect(result.final_evaluation.actual).toBe(700)
    expect(result.word_target_warning).toMatchObject({ code: 'word_target_short', source: 'word_target' })
    expect(result.expansion.attempts[1]).toMatchObject({ candidate_rejected: true })
  })
  test('keeps deterministic longest-expansion ranking and the first complete candidate on ties', async () => {
    const candidate = (char: string, count: number, label: string) => ({
      parsed: {
        chapter_text: char.repeat(count),
        scene_breakdown: [{ title: `scene-${label}` }],
        continuity_notes: [`note-${label}`],
        expansion_blueprint_patch: { winner: label },
      },
      finish_reason: 'stop',
      modelName: label === 'unsafe' ? 'bad\nEXPANSION_MODEL_SECRET' : `safe-${label}`,
      usage: {
        input_tokens: 10,
        output_tokens: count,
        total_tokens: count + 10,
        secret: 'EXPANSION_USAGE_SECRET',
        nested: { chapter_text: char.repeat(count) },
      },
    })
    const cases = [
      { results: [candidate('甲', 650, 'unsafe'), candidate('乙', 700, 'long')], winner: 'long', text: '乙'.repeat(700) },
      { results: [candidate('乙', 700, 'long'), candidate('甲', 650, 'short')], winner: 'long', text: '乙'.repeat(700) },
      { results: [candidate('丙', 700, 'first'), candidate('丁', 700, 'second')], winner: 'first', text: '丙'.repeat(700) },
    ]

    for (const testCase of cases) {
      const results = [...testCase.results]
      const service = createNovelWritingService({
        getProject: async () => null,
        production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
        reference: {} as any,
        runtime: { executeAgent: async () => results.shift() },
      })
      const result = await service.ensureProseMeetsWordTarget(
        '/tmp/expansion-ranking', { id: 1 }, { chapter_target: { word_target: contractionWordTarget } },
        '原'.repeat(500), 217, { maxExpansionAttempts: 2 },
      )

      expect(result.final_text).toBe(testCase.text)
      expect(result.expansion).toMatchObject({
        scene_breakdown: [{ title: `scene-${testCase.winner}` }],
        continuity_notes: [`note-${testCase.winner}`],
        expansion_blueprint_patch: { winner: testCase.winner },
        modelName: `safe-${testCase.winner}`,
      })
      expect(result.expansion.attempts[0].model_usage).toEqual(expect.objectContaining({ input_tokens: 10 }))
      expect(JSON.stringify(result.expansion)).not.toContain('EXPANSION_USAGE_SECRET')
      expect(JSON.stringify(result.expansion)).not.toContain('EXPANSION_MODEL_SECRET')
      expect(JSON.stringify(result.expansion)).not.toContain('chapter_text')
    }
  })
  test('routes a complete mildly short contraction through expansion instead of preserving the overlong draft', async () => {
    const originalText = '原'.repeat(1400)
    const contractedText = '缩'.repeat(750)
    const expandedText = '扩'.repeat(900)
    const results = [
      {
        parsed: { prose_chapters: [{ chapter_no: 1, chapter_text: contractedText }] },
        finish_reason: 'stop',
      },
      {
        parsed: { prose_chapters: [{ chapter_no: 1, chapter_text: expandedText }] },
        finish_reason: 'stop',
      },
    ]
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {
        getStageModelId: (_project: any, _stage: string, fallback?: number) => fallback || 217,
        getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      } as any,
      reference: {} as any,
      runtime: {
        executeAgent: async () => results.shift(),
      },
    })

    const result = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-expansion-bridge',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1, maxExpansionAttempts: 1 },
    )

    expect(result.final_text).toBe(expandedText)
    expect(result.final_evaluation).toMatchObject({ actual: 900, passed: true })
    expect(result).toMatchObject({ contracted: true, expanded: true })
    expect(result.contraction?.attempts).toHaveLength(1)
    expect(result.contraction?.attempts[0]).toMatchObject({
      contracted_count: 750,
      bridge_to_expansion: true,
      candidate_rejected: false,
    })
  })
  test('does not bridge mildly short candidates without an explicit completion finish reason', async () => {
    const originalText = '原'.repeat(1400)
    const contractedText = '缩'.repeat(750)
    const cases = [
      { finish_reason: 'incomplete', raw: { incomplete_details: { reason: 'max_output_tokens' } } },
      { finish_reason: 'max_output_tokens' },
      { finish_reason: 'error' },
      { finish_reason: 'content_filter' },
      {},
    ]

    for (const finish of cases) {
      const service = createContractionService({
        parsed: { prose_chapters: [{ chapter_no: 1, chapter_text: contractedText }] },
        ...finish,
      })
      const result = await service.ensureProseMeetsWordTarget(
        '/tmp/mangaforge-contraction-expansion-finish-guard',
        { id: 1, title: '测试作品' },
        { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
        originalText,
        217,
        { maxContractionAttempts: 1, maxExpansionAttempts: 1 },
      )

      expect(result.final_text).toBe(originalText)
      expect(result.word_target_warning?.code).toBe('word_target_long')
      expect(result.contraction?.attempts?.[0]?.bridge_to_expansion).toBe(false)
    }
  })
  test('does not bridge a mildly short contraction when expansion is disabled', async () => {
    const originalText = '原'.repeat(1400)
    const contractedText = '缩'.repeat(750)
    const service = createContractionService({
      parsed: { prose_chapters: [{ chapter_no: 1, chapter_text: contractedText }] },
      finish_reason: 'stop',
    })

    const result = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-expansion-disabled',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1, expand: false },
    )

    expect(result.final_text).toBe(contractedText)
    expect(result.word_target_warning?.code).toBe('word_target_short')
    expect(result.contraction?.attempts?.[0]?.bridge_to_expansion).toBe(false)
  })
  test('restores the valid pre-editor prose when optional editor output cannot meet the word target', async () => {
    const draftText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const editorText = `${draftText}${'商业主编增加的冗余解释没有改变场景状态。'.repeat(30)}`
    const editorSceneBreakdown = [{
      scene_no: 1,
      title: '不应保留的 editor 场景回执',
      scene_card_receipts: {
        goal_obstacle_change_delivered: true,
        evidence: ['商业主编增加的冗余解释'],
      },
    }]
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText,
      editorSceneBreakdown,
      editorContinuityNotes: ['不应保留的 editor 连续性'],
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

    const expectedStoredText = normalizeProseForStorage(editorText)
    expect(countProseChars(editorText)).toBeGreaterThan(1100)
    expect(result.chapter.chapter_text).toBe(expectedStoredText)
    expect(result.chapter.chapter_text).toContain('商业主编增加的冗余解释')
    expect(result.chapter.continuity_notes || []).toContain('不应保留的 editor 连续性')
    expect(result.chapter.raw_payload?.generated_scene_breakdown || []).toContainEqual(expect.objectContaining({ title: '不应保留的 editor 场景回执' }))
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'word_target_long', source: 'word_target' }))
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateTexts).toEqual([expectedStoredText])
  })
  test('does not restore a pre-editor draft that only passed the word-target soft cap', async () => {
    const baseText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const softCapDraft = `${baseText}${'补'.repeat(1110 - countProseChars(baseText))}`
    const editorText = `${softCapDraft}${'商业主编增加的冗余解释。'.repeat(35)}`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: softCapDraft,
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

    expect(countProseChars(softCapDraft)).toBe(1110)
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'word_target_long', source: 'word_target' }))
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateCalls).toBe(1)
  })
  test('rejects a truncated draft before any production-path persistence', async () => {
    const draftText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      draftResult: {
        parsed: { chapter_no: 10, chapter_text: draftText },
        finish_reason: 'length',
        modelName: 'fake-truncated-draft',
        usage: { input_tokens: 100, output_tokens: 200 },
      },
    })

    const error = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, target_word_count: 1000, quality_threshold: 78, auto_repair_quality_gate: true },
    ).then(() => null, (caught: any) => caught)
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(error).toMatchObject({
      code: 'PROSE_DRAFT_TRUNCATED',
      admission_status: 'blocked_invalid',
      admission_failure: { source: 'transport' },
    })
    expect(stored?.chapter_text || '').toBe('')
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toHaveLength(0)
  })
  test('rejects a truncated quality revision before any production-path persistence', async () => {
    const draftText = buildPipelineProse(
      '倒数压到最后三秒，江澈停在围墙阴影里等待。',
      '只看着追捕队继续收紧包围',
    )
    const revisedText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      reviewPayloads: [{
        score: 72,
        dimensions: proseQualityScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '江澈停在围墙阴影里等待',
          required_change: '让江澈主动破围',
          acceptance_test: '追捕阵型因主角动作改变',
        }],
      }],
      revisionResults: [{
        parsed: { chapter_text: revisedText },
        raw: { choices: [{ finish_reason: 'max_tokens' }] },
        modelName: 'fake-truncated-reviser',
      }],
    })

    const error = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, target_word_count: 1000, quality_threshold: 78, auto_repair_quality_gate: true },
    ).then(() => null, (caught: any) => caught)
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(error).toMatchObject({
      code: 'PROSE_REVISION_TRUNCATED',
      admission_status: 'blocked_invalid',
      admission_failure: { source: 'transport' },
    })
    expect(stored?.chapter_text || '').toBe('')
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toHaveLength(0)
  })
  test('rejects complete drafts with empty incomplete-details metadata across transport paths', async () => {
    const draftText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const transportCases = [
      { incomplete_details: {} },
      { raw: { incompleteDetails: {} } },
      { raw: { response: { incomplete_details: { reason: '' } } } },
    ]
    const outcomes: any[] = []

    for (const transport of transportCases) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText,
        draftResult: {
          parsed: { chapter_no: 10, chapter_text: draftText },
          modelName: 'fake-incomplete-draft',
          ...transport,
        },
      })
      const error = await harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        { model_id: 217, target_word_count: 1000, quality_threshold: 78, auto_repair_quality_gate: true },
      ).then(() => null, (caught: any) => caught)
      const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
      outcomes.push({
        code: error?.code || null,
        stored_text: stored?.chapter_text || '',
        store_calls: harness.storeCalls,
        story_state_calls: harness.storyStateCalls,
        memory_calls: harness.memoryTexts.length,
      })
    }

    expect(outcomes).toEqual(transportCases.map(() => ({
      code: 'PROSE_DRAFT_TRUNCATED',
      stored_text: '',
      store_calls: 0,
      story_state_calls: 0,
      memory_calls: 0,
    })))
  })
  test('accepts complete drafts with null incomplete-details markers across transport paths', async () => {
    const draftText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const expectedText = normalizeProseForStorage(draftText)
    const transportCases = [
      { status: 'completed', incomplete_details: null },
      { status: 'completed', raw: { response: { incompleteDetails: null } } },
    ]
    const outcomes: any[] = []

    for (const transport of transportCases) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText,
        draftResult: {
          parsed: { chapter_no: 10, chapter_text: draftText },
          modelName: 'fake-complete-draft',
          ...transport,
        },
      })
      const result = await harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        { model_id: 217, target_word_count: 1000, quality_threshold: 78, auto_repair_quality_gate: true },
      ).then((value: any) => ({ value, error: null }), (error: any) => ({ value: null, error }))
      const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
      outcomes.push({
        code: result.error?.code || null,
        result_text: result.value?.chapter?.chapter_text || '',
        stored_text: stored?.chapter_text || '',
        store_calls: harness.storeCalls,
        story_state_calls: harness.storyStateCalls,
        memory_calls: harness.memoryTexts.length,
      })
    }

    expect(outcomes).toEqual(transportCases.map(() => ({
      code: null,
      result_text: expectedText,
      stored_text: expectedText,
      store_calls: 1,
      story_state_calls: 1,
      memory_calls: 1,
    })))
  })
  test('rejects complete quality revisions when nested rejected finish reasons are masked at top level', async () => {
    const draftText = buildPipelineProse(
      '倒数压到最后三秒，江澈停在围墙阴影里等待。',
      '只看着追捕队继续收紧包围',
    )
    const revisedText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const transportCases = [
      { finish_reason: 'stop', raw: { choices: [{ finish_reason: 'max_tokens' }] } },
      { finish_reason: 'provider-controlled-value', raw: { response: { stop_reason: 'length' } } },
    ]
    const outcomes: any[] = []

    for (const transport of transportCases) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText,
        reviewPayloads: [{
          score: 72,
          dimensions: proseQualityScores,
          findings: [{
            key: 'agency',
            severity: 'S2',
            dimension: 'core_promise_agency',
            evidence: '江澈停在围墙阴影里等待',
            required_change: '让江澈主动破围',
            acceptance_test: '追捕阵型因主角动作改变',
          }],
        }],
        revisionResults: [{
          parsed: { chapter_text: revisedText },
          modelName: 'fake-masked-truncated-reviser',
          ...transport,
        }],
      })
      const error = await harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        { model_id: 217, target_word_count: 1000, quality_threshold: 78, auto_repair_quality_gate: true },
      ).then(() => null, (caught: any) => caught)
      const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
      outcomes.push({
        code: error?.code || null,
        stored_text: stored?.chapter_text || '',
        store_calls: harness.storeCalls,
        story_state_calls: harness.storyStateCalls,
        memory_calls: harness.memoryTexts.length,
      })
    }

    expect(outcomes).toEqual(transportCases.map(() => ({
      code: 'PROSE_REVISION_TRUNCATED',
      stored_text: '',
      store_calls: 0,
      story_state_calls: 0,
      memory_calls: 0,
    })))
  })
  test('rechecks revised prose before advisory admission classification', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generateSource = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const qualityLoopStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>')
    const gateStart = generateSource.indexOf('const preStoreQualityDecision =', qualityLoopStart)
    const reviewCallbackStart = source.indexOf('review: async ({ prompt, round, attempt }) => {', qualityLoopStart)
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
    expect(beforeGate).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1')
    expect(beforeGate).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(beforeGate).toContain('round, attempt')
    expect(beforeGate).toContain('qualityWarningCandidates.push(')
    expect(beforeGate).not.toContain('assertProseQualityCanStore')
    expect(beforeGate).not.toContain('runProseSelfReviewAndRevision')
    expect(reviewBlock).toContain('maxTokens: proseQualityReviewMaxTokensForAttempt(attempt)')
    expect(reviewBlock).toContain('上一次审查没有返回可用的完整六维 JSON')
    expect(reviewBlock).toContain('__quality_review_transport')
    expect(reviewBlock).not.toContain('raw_keys: diagnostics.raw_keys')
    expect(reviseBlock).toContain('maxTokens: proseMaxTokensForWordTarget(wordTarget)')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
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
    let storyStateCalls = 0
    let memoryCalls = 0
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
        generateChapterProse: async () => ({ parsed: { chapter_no: 10, chapter_text: finalText }, finish_reason: 'stop' }),
        executeAgent: async (_agent: string, _project: any, input: any) => {
          const task = String(input?.task || '')
          if (task.includes('商业主编')) return { parsed: { chapter_text: finalText, editor_report: { passed: true } } }
          if (task.startsWith('任务：独立审查小说正文')) return { parsed: { score: 90, publishable: true, dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 }, findings: [] } }
          if (task.includes('state_delta')) {
            storyStateCalls += 1
            return { parsed: { state_delta: { open_questions: ['x'] } } }
          }
          return { parsed: {} }
        },
        storeChapterProseMemory: async () => { memoryCalls += 1 },
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
    expect(storyStateCalls).toBe(0)
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
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'),
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
