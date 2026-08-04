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
} from '../novel-writing-service'
import { createNovelReferenceService } from './novel-reference-service'
import { buildCanonicalSurfaceIndex } from '../novel-writing/canonical-continuity'
import { validateMinimalChapterProse } from '../novel-writing/prose-admission-policy'
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
  withoutOpeningHandoffGuard,
} from './novel-writing-service.test-support'

describe('novel writing service prose quality wiring b a', () => {
  const identityHumanizeResult = (sourceText: string) => ({
    final_text: sourceText,
    report: {
      accepted: true,
      before_chars: countProseChars(sourceText),
      after_chars: countProseChars(sourceText),
    },
  })
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

  test('keeps a valid 6007-character optional meme rewrite with a warning instead of restoring pre-meme prose', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6006)
    const overCeilingMemeText = `${draftText.slice(0, -1)}润。`
    expect(countProseChars(draftText)).toBe(6006)
    expect(countProseChars(overCeilingMemeText)).toBe(6007)
    expect(validateMinimalChapterProse(overCeilingMemeText).valid).toBe(true)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: draftText,
      memeText: overCeilingMemeText,
      humanizeResult: identityHumanizeResult,
      enableMemePolish: true,
      chapterWordTarget: { mode: 'standard' },
      contextPackageOverride: withoutOpeningHandoffGuard(),
    })
    const stages: Array<{ name: string; payload: any }> = []
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      max_quality_revision_rounds: 0,
      onStage: async (name: string, payload: any) => stages.push({ name, payload }),
    })

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(countProseChars(harness.humanizeTexts[0] || '')).toBe(6007)
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({
      code: 'word_target_long',
      source: 'word_target',
    }))
    expect(result.meme_polish).toMatchObject({ polished: true })
    expect(result.meme_polish?.discarded).not.toBe(true)
    expect(countProseChars(result.meme_polish?.final_text || '')).toBe(6007)
    expect(stages).toEqual(expect.arrayContaining([expect.objectContaining({
      name: 'meme_polish',
      payload: expect.objectContaining({
        status: 'success',
        polished: true,
        meme_polish_report: expect.objectContaining({ polished_word_count: 6007 }),
      }),
    })]))
    expect(stages.some(item => item.payload?.phase === 'post_meme_polish' && item.payload?.fallback === 'pre_meme')).toBe(false)
  })
  test('restores earned-compatible prose when an invalid optional meme rewrite exceeds the compatibility ceiling', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6006)
    const overCeilingMemeText = JSON.stringify({ chapter_text: draftText.slice(0, -18) })
    expect(countProseChars(overCeilingMemeText)).toBe(6007)
    expect(validateMinimalChapterProse(overCeilingMemeText).valid).toBe(false)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: draftText,
      memeText: overCeilingMemeText,
      humanizeResult: identityHumanizeResult,
      enableMemePolish: true,
      chapterWordTarget: { mode: 'standard' },
      contextPackageOverride: withoutOpeningHandoffGuard(),
    })
    const stages: any[] = []
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, max_quality_revision_rounds: 0, onStage: async (_name: string, payload: any) => stages.push(payload) })
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(countProseChars(harness.humanizeTexts[0] || '')).toBe(6006)
    expect(result.meme_polish).toMatchObject({
      polished: false,
      discarded: true,
      discard_reason: 'post_meme_word_target_failed',
    })
    expect(stages).toEqual(expect.arrayContaining([expect.objectContaining({
      phase: 'post_meme_polish',
      fallback: 'pre_meme',
      compatibility_pass: true,
      compatibility_ceiling: 6006,
    })]))
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
  test('rejects explicit incomplete finishes but bridges clean missing or provider-unknown candidates', async () => {
    const originalText = '原'.repeat(1400)
    const contractedText = '缩'.repeat(750)
    const expandedText = '扩'.repeat(900)
    const rejectedFinishes = [
      { finish_reason: 'incomplete', raw: { incomplete_details: { reason: 'max_output_tokens' } } },
      { finish_reason: 'max_output_tokens' },
      { finish_reason: 'error' },
      { finish_reason: 'content_filter' },
    ]

    for (const finish of rejectedFinishes) {
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
      expect(result.contraction?.attempts?.[0]).toMatchObject({
        candidate_rejected: true,
        bridge_to_expansion: false,
      })
    }

    for (const cleanFinish of [{}, { finish_reason: 'mystery' }]) {
      const results = [
        {
          parsed: { prose_chapters: [{ chapter_no: 1, chapter_text: contractedText }] },
          ...cleanFinish,
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
        runtime: { executeAgent: async () => results.shift() },
      })

      const result = await service.ensureProseMeetsWordTarget(
        '/tmp/mangaforge-contraction-expansion-clean-finish',
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
        candidate_rejected: false,
        bridge_to_expansion: true,
      })
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
  test('keeps the valid pre-editor prose when optional editor output cannot meet the word target', async () => {
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
    const stages: Array<{ name: string; payload: any }> = []

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        quality_threshold: 78,
        auto_repair_quality_gate: true,
        onStage: async (name: string, payload: any) => stages.push({ name, payload }),
      },
    )

    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const finalCandidate = result.chapter?.chapter_text || ''
    expect(countProseChars(editorText)).toBeGreaterThan(1100)
    expect(stored?.chapter_text).toBe(finalCandidate)
    expect(finalCandidate).toContain('江澈踏碎路面')
    expect(finalCandidate).toContain('借自己制造的盲区夺下通讯器')
    expect(finalCandidate).not.toContain('商业主编增加的冗余解释')
    expect(result.chapter.continuity_notes || []).not.toContain('不应保留的 editor 连续性')
    expect(result.chapter.raw_payload?.generated_scene_breakdown || []).not.toContainEqual(expect.objectContaining({ title: '不应保留的 editor 场景回执' }))
    expect(result.editor_rewrite).toMatchObject({ edited: false })
    expect(result.editor_rewrite?.final_text).toContain('江澈踏碎路面')
    expect(result.editor_rewrite?.final_text).not.toContain('商业主编增加的冗余解释')
    expect(result.editor_rewrite?.editor_report?.original_word_count).toBeGreaterThan(0)
    expect(result.editor_rewrite?.editor_report?.edited_word_count).toBe(countProseChars(editorText))
    expect(result.editor_rewrite?.revision?.continuity_notes || []).toContain('不应保留的 editor 连续性')
    expect(result.editor_rewrite?.revision?.scene_breakdown || []).toContainEqual(expect.objectContaining({ title: '不应保留的 editor 场景回执' }))
    expect(result.editor_rewrite?.discarded).not.toBe(true)
    expect(result.quality_warnings).not.toContainEqual(expect.objectContaining({ code: 'word_target_long', source: 'word_target' }))
    expect(stages.some(item => item.payload?.phase === 'post_editor' && item.payload?.fallback === 'pre_editor')).toBe(false)
    expect(harness.storeCalls).toBe(1)
    expect(harness.storeTexts).toEqual([finalCandidate])
    expect(harness.storyStateTexts).toEqual([finalCandidate])
    expect(harness.memoryTexts).toEqual([finalCandidate])
    expect(harness.modelCalls.editor).toBe(1)
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
  test('fails closed on a task-scoped truncated quality revision before persistence', async () => {
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
        parsed: {
          chapter_text: revisedText,
          scene_breakdown: [{ title: '不应采用的截断 revision 场景' }],
          continuity_notes: ['不应采用的截断 revision 连续性'],
        },
        raw: { choices: [{ finish_reason: 'max_tokens' }] },
        modelName: 'fake-truncated-reviser',
      }],
    })
    const stages: Array<{ name: string; payload: any }> = []

    const exposed: any = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        quality_threshold: 78,
        auto_repair_quality_gate: true,
        onStage: async (name: string, payload: any) => stages.push({ name, payload }),
      },
    ).catch((error: unknown) => error)
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(exposed).toMatchObject({
      code: 'PROSE_REVISION_TRUNCATED',
      admission_status: 'blocked_invalid',
      finish_reason: 'max_tokens',
    })
    expect(stored?.chapter_text || '').toBe('')
    expect(harness.storeCalls).toBe(0)
    expect(harness.storeTexts).toEqual([])
    expect(harness.storyStateTexts).toEqual([])
    expect(harness.memoryTexts).toEqual([])
    expect(harness.modelCalls.revision).toBeGreaterThan(0)
    const truncatedFallback = stages.find(item => item.name === 'revise' && item.payload?.phase === 'quality_revision_truncated_fallback')
    expect(truncatedFallback).toBeUndefined()
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
    const transportCases = [
      { status: 'completed', incomplete_details: null },
      { status: 'completed', raw: { response: { incompleteDetails: null } } },
    ]
    const finalCandidates: string[] = []

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
      const finalCandidate = result.value?.chapter?.chapter_text || ''
      finalCandidates.push(finalCandidate)

      expect(result.error).toBeNull()
      expect(finalCandidate).toContain('江澈踏碎路面')
      expect(finalCandidate).toContain('借自己制造的盲区夺下通讯器')
      expect(stored?.chapter_text).toBe(finalCandidate)
      expect(harness.storeCalls).toBe(1)
      expect(harness.storeTexts).toEqual([finalCandidate])
      expect(harness.storyStateCalls).toBe(1)
      expect(harness.storyStateTexts).toEqual([finalCandidate])
      expect(harness.memoryTexts).toEqual([finalCandidate])
      expect(harness.modelCalls.draft).toBe(1)
    }

    expect(finalCandidates).toHaveLength(transportCases.length)
  })
  test('fails closed on task-scoped quality revisions with masked nested truncation', async () => {
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
          parsed: {
            chapter_text: revisedText,
            scene_breakdown: [{ title: '不应采用的 masked revision 场景' }],
            continuity_notes: ['不应采用的 masked revision 连续性'],
          },
          modelName: 'fake-masked-truncated-reviser',
          ...transport,
        }],
      })
      const stages: Array<{ name: string; payload: any }> = []
      const exposed: any = await harness.service.generateChapterForGroup(
        harness.workspace,
        harness.project.id,
        harness.chapter.id,
        {
          model_id: 217,
          target_word_count: 1000,
          quality_threshold: 78,
          auto_repair_quality_gate: true,
          onStage: async (name: string, payload: any) => stages.push({ name, payload }),
        },
      ).catch((error: unknown) => error)
      const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

      expect(exposed).toMatchObject({
        code: 'PROSE_REVISION_TRUNCATED',
        admission_status: 'blocked_invalid',
      })
      expect(stored?.chapter_text || '').toBe('')
      expect(harness.storeCalls).toBe(0)
      expect(harness.storeTexts).toEqual([])
      expect(harness.storyStateTexts).toEqual([])
      expect(harness.memoryTexts).toEqual([])
      expect(harness.modelCalls.revision).toBeGreaterThan(0)
      const truncatedFallback = stages.find(item => item.name === 'revise' && item.payload?.phase === 'quality_revision_truncated_fallback')
      expect(truncatedFallback).toBeUndefined()
    }
  })
})
