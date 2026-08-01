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
  withoutOpeningHandoffGuard,
} from './novel-writing-service.test-support'

describe('novel writing service prose quality wiring a', () => {
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
    const softCapScan = scanProseForQualityLoop('字'.repeat(4759), {}, target)
    const overTargetScan = scanProseForQualityLoop('字'.repeat(4760), {}, target)

    expect(softCapScan.word_target).toMatchObject({
      actual: 4759,
      passed: true,
      soft_cap: true,
    })
    expect(softCapScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(false)
    expect(overTargetScan.word_target).toMatchObject({
      actual: 4760,
      passed: false,
      soft_cap: false,
    })
    expect(overTargetScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(true)
  })
  test('only suppresses standard word-target failure when an earned compatibility policy is supplied', () => {
    const standard = resolveChapterWordTarget({}, {}, {})
    const hasWordTargetFailure = (actual: number, compatibilityCeiling?: number) => scanProseForQualityLoop(
      '字'.repeat(actual),
      {},
      standard,
      compatibilityCeiling === undefined ? {} : {
        word_target_compatibility_pass: true,
        compatibility_ceiling: compatibilityCeiling,
      },
    ).hard_failures.some((item: any) => item.key === 'word_target')

    for (const actual of [5900, 6006]) {
      expect(hasWordTargetFailure(actual)).toBe(true)
      expect(hasWordTargetFailure(actual, 6006)).toBe(false)
    }
    for (const actual of [6007, 6100]) {
      expect(hasWordTargetFailure(actual, 6006)).toBe(true)
      expect(hasWordTargetFailure(actual, 99999)).toBe(true)
    }
  })
  test('wires canonical proper-noun continuity conflicts into deterministic hard failures', () => {
    const prose = '导航终点亮起：【江城市第一人民医院】。这正是旧档案里的那家医院。'
    const scan = scanProseForQualityLoop(prose, {
      canonical_surface_index: {
        stable_entities: [{
          surface: '临江市第一人民医院',
          suffix: '第一人民医院',
          chapters: [4, 9],
          source: 'previous_chapters',
        }],
      },
    }, { target: 0, min: 0, max: 0 })

    expect(scan.hard_failures).toContainEqual(expect.objectContaining({
      key: 'canonical_proper_noun_conflict',
      message: expect.stringContaining('临江市第一人民医院'),
    }))
  })
  test('builds the canonical index from all prior chapter prose without carrying full prose into the index', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-canonical-context-'))
    const previousMempalaceDir = process.env.MEMPALACE_DIR
    process.env.MEMPALACE_DIR = workspace
    try {
      const service = createNovelWritingService({
        getProject: async () => null,
        production: {} as any,
        reference: {} as any,
      })
      const chapter = { id: 11, project_id: 7, chapter_no: 11, title: '旧院回声', scene_list: [], raw_payload: {} }
      const chapters = [
        { id: 1, chapter_no: 1, title: '急诊入口', chapter_text: '担架送进【临江市第一人民医院】。' },
        { id: 2, chapter_no: 2, title: '封存病历', chapter_text: '临江市第一人民医院封存了病历。' },
        { id: 6, chapter_no: 6, title: '线索一', chapter_text: '他们检查了码头仓库。' },
        { id: 7, chapter_no: 7, title: '线索二', chapter_text: '调查转向旧城区。' },
        { id: 8, chapter_no: 8, title: '线索三', chapter_text: '档案只剩一页。' },
        chapter,
      ]

      const context = await service.buildChapterContextPackage(
        workspace,
        { id: 7, title: '旧院谜踪', reference_config: { story_state: { canon_facts: [] } } },
        chapter,
        chapters,
        [],
        [],
        [],
        [],
      )

      expect(context.continuity.previous_prose_chapters.map((item: any) => item.chapter_no)).toEqual([6, 7, 8])
      expect(context.canonical_surface_index.stable_entities).toContainEqual(expect.objectContaining({
        surface: '临江市第一人民医院',
        chapters: [1, 2],
      }))
      expect(JSON.stringify(context.canonical_surface_index)).not.toContain('担架送进')
      expect(context.canonicalSurfaceIndex).toBe(context.canonical_surface_index)
    } finally {
      if (previousMempalaceDir === undefined) delete process.env.MEMPALACE_DIR
      else process.env.MEMPALACE_DIR = previousMempalaceDir
      rmSync(workspace, { recursive: true, force: true })
    }
  })
  test('rejects the saved real chapter-11 candidate before chapter, story-state, or memory writes', async () => {
    const canonicalSurfaceIndex = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: REAL_CHAPTER_11_CANONICAL_CONFLICT_PROSE,
      chapterWordTarget: { mode: 'custom', target: 5000 },
      initialSceneCards: [],
      contextPackageOverride: withoutOpeningHandoffGuard({
        canonical_surface_index: canonicalSurfaceIndex,
        canonicalSurfaceIndex,
      }),
    })
    const snapshot = async () => ({
      project: await getNovelProject(harness.workspace, harness.project.id),
      chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find((item: any) => item.id === harness.chapter.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      usages: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })
    const before = await snapshot()

    const error = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, quality_threshold: 78, auto_repair_quality_gate: false },
    ).then(() => null, (caught: any) => caught)
    const after = await snapshot()

    expect(error?.code).toBe('PROSE_QUALITY_GATE_BLOCKED')
    expect(error?.quality_loop?.decision?.hard_failures).toContainEqual(expect.objectContaining({
      key: 'canonical_proper_noun_conflict',
      source: 'deterministic',
    }))
    expect(error?.admission_status).toBe('blocked_invalid')
    expect(error?.admission_failure).toMatchObject({ code: 'canonical_proper_noun_conflict', source: 'canonical_continuity' })
    expect(after).toEqual(before)
    expect(harness.modelCalls.scene_cards).toBe(1)
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toHaveLength(0)
  })
  test('rejects a disconnected initial chapter-11 opening without another model request or subjective quality gate', async () => {
    const draftText = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    const sceneCards = [{
      scene_no: 1,
      title: '地下岔口',
      transition_from_previous: '暗金绢册继续发热，沈砚和老陈在地下通道处理逼近的铁链声。',
    }]
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: draftText,
      chapterWordTarget: { mode: 'custom', target: 4000, min: 3000, max: 5000 },
      initialSceneCards: sceneCards,
      contextPackageOverride: {
        chapter_target: {
          id: 10,
          chapter_no: 11,
          title: '铁链声',
          previous_handoff: chapter10HandoffFixture.previousChapterTail,
          requiredHandoffAnchors: chapter10HandoffFixture.requiredAnchors,
          scene_cards: sceneCards,
          word_target: { mode: 'custom', target: 4000, min: 3000, max: 5000 },
        },
      },
    })

    const error = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      { model_id: 217, auto_repair_quality_gate: false, production_mode: 'draft_only' },
    ).then(() => null, (caught: any) => caught)

    expect(error?.code).toBe('PROSE_ADMISSION_BLOCKED_INVALID')
    expect(error?.admission_status).toBe('blocked_invalid')
    expect(error?.admission_failure).toMatchObject({
      code: 'opening_handoff_disconnected',
      source: 'canonical_continuity',
    })
    expect(harness.modelCalls.review).toBe(0)
    expect(harness.modelCalls.revision).toBe(0)
    expect(harness.modelCalls.editor).toBe(0)
    expect(harness.modelCalls.meme).toBe(0)
    expect(harness.modelCalls.contraction).toBe(0)
    expect(harness.modelCalls.expansion).toBe(0)
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toHaveLength(0)
  })
  test('draft-only canonical and malformed prose are blocked before every write', async () => {
    const canonicalSurfaceIndex = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })
    const cases = [
      {
        draftText: REAL_CHAPTER_11_CANONICAL_CONFLICT_PROSE,
        contextPackageOverride: withoutOpeningHandoffGuard({
          canonical_surface_index: canonicalSurfaceIndex,
          canonicalSurfaceIndex,
        }),
        expectedSource: 'canonical_continuity',
      },
      {
        draftText: '第十章：生成失败',
        contextPackageOverride: withoutOpeningHandoffGuard(),
        expectedSource: 'prose_shape',
      },
    ]
    for (const item of cases) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText: item.draftText,
        contextPackageOverride: item.contextPackageOverride,
      })
      const before = JSON.stringify({
        chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find(row => row.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
      })
      const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
        model_id: 217,
        target_word_count: 1000,
        production_mode: 'draft_only',
      }).then(() => null, (caught: any) => caught)
      const after = JSON.stringify({
        chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find(row => row.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
      })

      expect(error?.admission_status).toBe('blocked_invalid')
      expect(error?.admission_failure?.source).toBe(item.expectedSource)
      expect(after).toBe(before)
      expect(harness.memoryTexts).toEqual([])
    }
  })
  test('keeps a real low-risk style hit advisory when the review repeats the same evidence', () => {
    const prose = '江澈推开仓门，铜锁坠在地上。\n\n如同一枚刚落下的铁钉，回声穿过空仓。他没有停步，抬手按住总闸，灯光依次亮起。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const evidence = scan.advisory_findings.find((item: any) => item.pattern === '如同')?.evidence
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_comparison',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '如同一枚刚落下的铁钉',
          required_change: '删除“如同”并改成具体动作或事实描写',
          acceptance_test: '正文不再出现“如同”',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })
    const reviewPrompt = buildFocusedProseReviewPrompt({ coreContract: {}, chapterText: prose, deterministicScan: scan })

    expect(scan.hard_failures).toHaveLength(0)
    expect(scan.advisory_findings.find((item: any) => item.pattern === '如同')).toMatchObject({
      status: 'warn',
      evidence,
      matched_text: '如同',
      fix: expect.any(String),
    })
    expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(decision.advisory_failures.join('｜')).toContain('style_comparison')
    expect(reviewPrompt).toContain('不得仅凭同一词句命中升级为 S1/S2')
  })
  test('keeps a mixed advisory and causality obligation blocking', () => {
    const prose = '江澈推开仓门，如同一枚刚落下的铁钉，回声穿过空仓。人物忽然站到门外。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_comparison_with_causality',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '如同一枚刚落下的铁钉',
          required_change: '删除“如同”并补足人物移动承接与动作因果断裂',
          acceptance_test: '正文不再出现“如同”，且人物移动连续、动作结果有因果',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })

    expect(scan.advisory_findings.some((item: any) => item.pattern === '如同')).toBe(true)
    expect(decision).toMatchObject({ passed: false, approvable: false })
    expect(decision.hard_failures).toEqual([
      expect.objectContaining({ key: 'style_comparison_with_causality', source: 'llm' }),
    ])
  })
  test('does not downgrade an unrelated prose-style finding elsewhere on the advisory line', () => {
    const prose = '江澈推开仓门，如同一枚刚落下的铁钉，回声穿过空仓。动作毫无因果地跳转，人物忽然站到门外。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_unrelated',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '动作毫无因果地跳转',
          required_change: '补足动作之间的可见承接',
          acceptance_test: '场景动作连续可追踪',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })

    expect(scan.advisory_findings.some((item: any) => item.pattern === '如同')).toBe(true)
    expect(decision.passed).toBe(false)
    expect(decision.hard_failures).toEqual([
      expect.objectContaining({ key: 'style_unrelated', source: 'llm' }),
    ])
  })
  test('does not downgrade a full-line finding whose requested repair targets another issue', () => {
    const prose = '江澈推开仓门，如同一枚刚落下的铁钉，回声穿过空仓。动作毫无因果地跳转，人物忽然站到门外。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_full_line_other_issue',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: prose,
          required_change: '补足动作跳转之间的现场承接',
          acceptance_test: '人物移动过程连续可追踪',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })

    expect(decision.passed).toBe(false)
    expect(decision.hard_failures).toEqual([
      expect.objectContaining({ key: 'style_full_line_other_issue', source: 'llm' }),
    ])
  })
  test('downgrades a label-based advisory through its actual matched text', () => {
    const prose = '仓门打开，空气中弥漫着焦味。江澈捂住口鼻，抬手切断排风扇的电源。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const sceneAdvisory = scan.advisory_findings.find((item: any) => item.pattern === 'AI风场景套话')
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_scene_template',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '空气中弥漫着焦味',
          required_change: '删除“空气中弥漫”并保留具体焦味',
          acceptance_test: '正文不再出现“空气中弥漫”',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })

    expect(sceneAdvisory).toMatchObject({
      pattern: 'AI风场景套话',
      matched_text: '空气中弥漫',
      status: 'warn',
    })
    expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(decision.advisory_failures.join('｜')).toContain('style_scene_template')
  })
  test('downgrades a summary advisory whose regex consumes a sentence boundary', () => {
    const prose = '门开了。这一刻，他终于明白真相。江澈把账册推到灯下，指向新出现的签名。\n\n灯下还压着一张收据。纸角沾着新鲜的蓝墨。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const summaryAdvisory = scan.advisory_findings.find((item: any) => item.pattern === '总结句式')
    const decision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'style_summary',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '这一刻，他终于明白真相',
          required_change: '删除“这一刻”的总结句式，改成现场证据',
          acceptance_test: '正文不再出现“这一刻”总结句式',
        }],
      }),
      deterministicScan: scan,
      minScore: 78,
    })

    expect(summaryAdvisory?.matched_text).toBe('这一刻，他终于明白真相')
    expect(decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(decision.advisory_failures.join('｜')).toContain('style_summary')
  })
  test('still blocks real deterministic and uncovered semantic hard failures', () => {
    const prose = '江澈用蛮力 and 技巧撞开仓门，铜锁坠地，回声穿过空仓。'
    const scan = scanProseForQualityLoop(prose, {}, { target: 0, min: 0, max: 0 })
    const deterministicDecision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({ score: 90, publishable: true, dimensions: proseQualityScores, findings: [] }),
      deterministicScan: scan,
      minScore: 78,
    })
    const semanticDecision = buildProseQualityDecision({
      chapterText: prose,
      review: normalizeProseQualityReview({
        score: 90,
        publishable: true,
        dimensions: proseQualityScores,
        findings: [{
          key: 'causality_break',
          severity: 'S2',
          dimension: 'conflict_causality',
          evidence: '铜锁坠地',
          required_change: '补足铜锁坠地的动作原因',
          acceptance_test: '动作与结果形成因果链',
        }],
      }),
      deterministicScan: { hard_failures: [], advisory_findings: [] },
      minScore: 78,
    })

    expect(deterministicDecision.passed).toBe(false)
    expect(deterministicDecision.hard_failures.some(item => item.source === 'deterministic')).toBe(true)
    expect(semanticDecision.passed).toBe(false)
    expect(semanticDecision.hard_failures).toEqual([expect.objectContaining({ key: 'causality_break', source: 'llm' })])
  })
  test('never selects an open chapter string returned with a length finish reason during contraction', async () => {
    const originalText = '原'.repeat(1400)
    const candidateText = '改'.repeat(1000)
    const service = createContractionService({
      content: `{"prose_chapters":[{"chapter_no":1,"chapter_text":"${candidateText}`,
      finish_reason: 'LeNgTh',
      modelName: 'unsafe-model\nMODEL_METADATA_SECRET',
      usage: {
        input_tokens: 120,
        prompt_tokens: 121,
        output_tokens: 1000,
        completion_tokens: 1001,
        total_tokens: 1120,
        cached_tokens: 7,
        secret_token: 'ATTEMPT_USAGE_SECRET',
        nested: { candidate_text: candidateText },
      },
    })

    const result = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-length',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1 },
    )

    expect(result.final_text).toBe(originalText)
    expect(result.word_target_warning?.code).toBe('word_target_long')
    expect(result.final_evaluation?.actual).toBe(countProseChars(originalText))
    expect(result.final_evaluation?.too_long).toBe(true)
    expect(result.contraction?.attempts).toHaveLength(1)
    const attempt = result.contraction?.attempts?.[0]
    expect(attempt).toMatchObject({
      finish_reason: 'length',
      model_usage: {
        input_tokens: 120,
        prompt_tokens: 121,
        output_tokens: 1000,
        completion_tokens: 1001,
        total_tokens: 1120,
        cached_tokens: 7,
      },
      returned_text: true,
      candidate_rejected: true,
      recovered_from_partial_json: true,
      partial_json_open_string_recovered: true,
    })
    expect(attempt?.rejection_reason).toContain('finish_reason_length')
    expect(attempt).not.toHaveProperty('candidate_text')
    expect(attempt).not.toHaveProperty('prompt')
    expect(attempt).not.toHaveProperty('modelName')
    expect(JSON.stringify(attempt)).not.toContain('ATTEMPT_USAGE_SECRET')
    expect(JSON.stringify(attempt)).not.toContain('MODEL_METADATA_SECRET')
  })
  test('never selects a closed chapter string recovered from a max-token truncated JSON envelope during contraction', async () => {
    const originalText = '原'.repeat(1400)
    const candidateText = '缩'.repeat(1000)
    const service = createContractionService({
      content: `{"prose_chapters":[{"chapter_no":1,"chapter_text":"${candidateText}","scene_breakdown":[`,
      raw: {
        stop_reason: 'MAX_TOKENS',
        usage: { input_tokens: 120, output_tokens: 1000, total_tokens: 1120 },
      },
    })

    const result = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-max-tokens',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 1 },
    )

    expect(result.final_text).toBe(originalText)
    expect(result.word_target_warning?.code).toBe('word_target_long')
    expect(result.final_evaluation?.actual).toBe(countProseChars(originalText))
    expect(result.final_evaluation?.too_long).toBe(true)
    expect(result.contraction?.attempts).toHaveLength(1)
    const attempt = result.contraction?.attempts?.[0]
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
  test('increases the contraction output budget after truncated attempts', async () => {
    const originalText = '原'.repeat(1400)
    const candidateText = '缩'.repeat(1000)
    const maxTokensByAttempt: number[] = []
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {
        getStageModelId: (_project: any, _stage: string, fallback?: number) => fallback || 217,
        getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      } as any,
      reference: {} as any,
      runtime: {
        executeAgent: async (_agentId: string, _project: any, _context: any, options: any) => {
          maxTokensByAttempt.push(options.maxTokens)
          return {
            content: `{"prose_chapters":[{"chapter_no":1,"chapter_text":"${candidateText}`,
            finish_reason: 'length',
          }
        },
      },
    })

    const result = await service.ensureProseMeetsWordTarget(
      '/tmp/mangaforge-contraction-budget',
      { id: 1, title: '测试作品' },
      { chapter_target: { chapter_no: 1, word_target: contractionWordTarget } },
      originalText,
      217,
      { maxContractionAttempts: 3 },
    )

    expect(result.final_text).toBe(originalText)
    expect(result.word_target_warning?.code).toBe('word_target_long')
    expect(maxTokensByAttempt).toEqual([18_000, 32_000, 48_000])
    expect(result.contraction?.attempts).toHaveLength(3)
    expect(result.contraction?.attempts.every((attempt: any) => attempt.candidate_rejected === true)).toBe(true)
  })
  test('rejects completed contraction without chapter text using compact diagnostics', async () => {
    const originalText = '原'.repeat(1400)
    const service = createContractionService({ parsed: { prose_chapters: [{ chapter_no: 1 }] }, finish_reason: 'stop', content: 'sensitive raw body' })
    const result = await service.ensureProseMeetsWordTarget('/tmp/missing-text', { id: 1 }, { chapter_target: { word_target: contractionWordTarget } }, originalText, 217, { maxContractionAttempts: 1 })
    expect(result.final_text).toBe(originalText)
    expect(result.contraction?.attempts?.[0]).toMatchObject({ returned_text: false, candidate_rejected: true })
    expect(result.contraction?.attempts?.[0]?.rejection_reason).toContain('missing_chapter_text')
    expect(JSON.stringify(result.contraction?.attempts)).not.toContain('sensitive raw body')
  })
  test('rejects deep transport truncation and empty incomplete markers even when contraction text is usable', async () => {
    const candidate = '缩'.repeat(1000)
    const cases = [
      { finish_reason: 'stop', parsed: { chapter_text: candidate }, raw: { choices: [{ finish_reason: 'length' }] } },
      { finish_reason: 'mystery', parsed: { chapter_text: candidate }, raw: { response: { stop_reason: 'max_tokens' } } },
      { finish_reason: 'stop', parsed: { chapter_text: candidate }, raw: { choices: [{ incomplete_details: {} }] } },
      { finish_reason: 'stop', parsed: { chapter_text: candidate }, raw: { response: { incompleteDetails: {} } } },
    ]
    for (const candidateResult of cases) {
      const service = createContractionService(candidateResult)
      const result = await service.ensureProseMeetsWordTarget('/tmp/deep-transport', { id: 1 }, { chapter_target: { word_target: contractionWordTarget } }, '原'.repeat(1400), 217, { maxContractionAttempts: 1 })
      expect(result.final_text).toBe('原'.repeat(1400))
      expect(result.contraction?.attempts?.[0]?.candidate_rejected).toBe(true)
    }
  })
  test('only earns standard compatibility through the current 6006-character ceiling after unusable contractions', async () => {
    const standard = resolveChapterWordTarget({}, {}, {})
    for (const { actual, compatible } of [
      { actual: 5900, compatible: true },
      { actual: 6006, compatible: true },
      { actual: 6007, compatible: false },
      { actual: 6100, compatible: false },
    ]) {
      const originalText = '原'.repeat(actual)
      let calls = 0
      const service = createNovelWritingService({ getProject: async () => null, production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any, reference: {} as any, runtime: { executeAgent: async () => { calls++; return { parsed: {}, finish_reason: calls === 1 ? 'stop' : 'length' } } } })
      const result = await service.ensureProseMeetsWordTarget('/tmp/compat', { id: 1 }, { chapter_target: { word_target: standard } }, originalText, 217)

      expect(calls).toBe(3)
      expect(result.final_text).toBe(originalText)
      expect(result.contracted).toBe(false)
      expect(result.contraction.attempts).toHaveLength(3)
      if (compatible) {
        expect(result).toMatchObject({ word_target_compatibility_pass: true, compatibility_ceiling: 6006 })
        expect(result.word_target_warning).toBeUndefined()
      } else {
        expect(result.word_target_compatibility_pass).not.toBe(true)
        expect(result.word_target_warning?.code).toBe('word_target_long')
      }
    }
  })
  test('never admits a passing contraction without an explicit completion finish reason', async () => {
    const originalText = '原'.repeat(1400)
    const explicitlyComplete = '完'.repeat(1200)
    const unknownPassingCandidate = '疑'.repeat(1000)
    for (const incompleteFinish of [{}, { finish_reason: 'mystery' }]) {
      const results = [
        { parsed: { chapter_text: explicitlyComplete }, finish_reason: 'stop' },
        { parsed: { chapter_text: unknownPassingCandidate }, ...incompleteFinish },
      ]
      const service = createNovelWritingService({
        getProject: async () => null,
        production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
        reference: {} as any,
        runtime: { executeAgent: async () => results.shift() },
      })

      const result = await service.ensureProseMeetsWordTarget(
        '/tmp/missing-contraction-finish',
        { id: 1 },
        { chapter_target: { word_target: contractionWordTarget } },
        originalText,
        217,
        { maxContractionAttempts: 2 },
      )

      expect(result.final_text).toBe(explicitlyComplete)
      expect(result.final_text).not.toBe(unknownPassingCandidate)
      expect(result.word_target_warning?.code).toBe('word_target_long')
      expect(result.contraction.attempts[1]).toMatchObject({ candidate_rejected: true })
      expect(result.contraction.attempts[1].rejection_reason).toContain(
        incompleteFinish.finish_reason ? 'finish_reason_unknown' : 'finish_reason_missing',
      )
    }
  })
  test('keeps direct ensure calls independently bounded when an external budget object is untrusted', async () => {
    let calls = 0
    const service = createNovelWritingService({ getProject: async () => null, production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any, reference: {} as any, runtime: { executeAgent: async () => { calls++; return { parsed: {}, finish_reason: 'stop' } } } })
    const standard = { mode: 'standard', label: '标准章', target: 4200, min: 3200, max: 5200, rangeText: '3200-5200 字' }
    const sharedOptions = { wordTargetContractionBudget: { used: 0 } }
    await service.ensureProseMeetsWordTarget('/tmp/shared-budget', { id: 1 }, { chapter_target: { word_target: standard } }, '初'.repeat(6596), 217, sharedOptions)
    await service.ensureProseMeetsWordTarget('/tmp/shared-budget', { id: 1 }, { chapter_target: { word_target: standard } }, '编'.repeat(6596), 217, sharedOptions)
    await service.ensureProseMeetsWordTarget('/tmp/shared-budget', { id: 1 }, { chapter_target: { word_target: standard } }, '润'.repeat(6596), 217, sharedOptions)
    expect(calls).toBe(9)
    expect(sharedOptions.wordTargetContractionBudget.used).toBe(0)
  })
  test('does not trust a fabricated exhausted shared budget to mint compatibility without calls', async () => {
    let calls = 0
    const service = createNovelWritingService({ getProject: async () => null, production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any, reference: {} as any, runtime: { executeAgent: async () => { calls++; return { parsed: {}, finish_reason: 'stop' } } } })
    const standard = resolveChapterWordTarget({}, {}, {})
    await service.ensureProseMeetsWordTarget('/tmp/forged-budget', { id: 1 }, { chapter_target: { word_target: standard } }, '原'.repeat(6596), 217, { wordTargetContractionBudget: { used: 3 } })
    expect(calls).toBe(3)
  })
  test('clamps malformed contraction limits without exceeding or skipping the local three-call budget', async () => {
    for (const configured of [-2, Number.NaN, Number.POSITIVE_INFINITY]) {
      let calls = 0
      const service = createNovelWritingService({ getProject: async () => null, production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any, reference: {} as any, runtime: { executeAgent: async () => { calls++; return { parsed: {}, finish_reason: 'stop' } } } })
      await service.ensureProseMeetsWordTarget('/tmp/malformed-budget', { id: 1 }, { chapter_target: { word_target: resolveChapterWordTarget({}, {}, {}) } }, '原'.repeat(6596), 217, { maxContractionAttempts: configured })
      expect(calls).toBe(configured === -2 ? 1 : 3)
    }
  })
  test('stores complete overlong low-score prose with subjective quality warnings', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，抢在合围闭合前切入铁门。', '主动夺取追捕队的通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      chapterWordTarget: { mode: 'custom', target: 1000 },
      reviewPayloads: Array.from({ length: 3 }, () => ({
        score: 61,
        publishable: false,
        dimensions: { ...proseQualityScores, prose_style: 4 },
        findings: [{
          key: 'ai_smell_style',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '江澈撞断路灯',
          required_change: '改写为更具体的动作链',
          acceptance_test: '动作承接更具体',
        }],
      })),
    })
    const before = (await listNovelChapters(harness.workspace, harness.project.id)).find((item: any) => item.id === harness.chapter.id)
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, auto_repair_quality_gate: true })
    const after = (await listNovelChapters(harness.workspace, harness.project.id)).find((item: any) => item.id === harness.chapter.id)
    expect(harness.modelCalls.contraction).toBe(3)
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(result).toMatchObject({
      admission_status: 'accepted_with_warnings',
      quality_score: 61,
      story_state_status: 'synced',
    })
    expect(result.quality_warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'word_target', code: 'word_target_long' }),
      expect.objectContaining({ source: 'quality', code: 'quality_publishable_verdict' }),
      expect.objectContaining({ source: 'quality', code: 'quality_dimension_prose_style' }),
      expect.objectContaining({ source: 'quality', code: 'ai_smell_style' }),
    ]))
    expect(after?.chapter_text).not.toBe(before?.chapter_text)
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateCalls).toBe(1)
    expect(harness.memoryTexts).toEqual([after?.chapter_text])
  })
  test('stores complete overlong prose when optional contraction transport throws', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，抢在合围闭合前切入铁门。', '主动夺取追捕队的通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      chapterWordTarget: { mode: 'custom', target: 1000 },
      contractionError: new Error('optional contraction provider unavailable'),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
    })
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'word_target', code: 'word_target_long' }))
    expect(stored?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(harness.modelCalls.contraction).toBe(1)
  })
  test('stores complete short prose when optional expansion transport throws', async () => {
    const draftText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击').slice(0, 960)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      chapterWordTarget: { mode: 'custom', target: 1800 },
      expansionError: new Error('optional expansion provider unavailable'),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
    })
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'word_target', code: 'word_target_short' }))
    expect(stored?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(harness.modelCalls.expansion).toBe(1)
  })
  test('keeps complete prose when editor returns a long-enough but transport-truncated rewrite', async () => {
    const draftText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const truncatedEditorText = draftText.slice(0, Math.floor(draftText.length * 0.9))
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorResult: { parsed: { chapter_text: truncatedEditorText, editor_report: { passed: true } }, finish_reason: 'length', modelName: 'fake-editor' },
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, target_word_count: 1000 })

    expect(result.chapter?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'editor_unavailable', source: 'review' }))
    expect(harness.modelCalls.editor).toBe(1)
  })
  test('keeps complete prose when meme polish returns a long-enough but transport-truncated rewrite', async () => {
    const draftText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const truncatedMemeText = draftText.slice(0, Math.floor(draftText.length * 0.95))
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: draftText,
      enableMemePolish: true,
      memeResult: { parsed: { chapter_text: truncatedMemeText, meme_polish_report: { changed_plot: false } }, raw: { choices: [{ finish_reason: 'length' }] }, modelName: 'fake-meme' },
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, target_word_count: 1000 })

    expect(result.chapter?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'meme_polish_unavailable', source: 'review' }))
    expect(harness.modelCalls.meme).toBe(1)
  })
  test('keeps complete prose when editor and meme rewrites carry incomplete details above length guards', async () => {
    const draftText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const editorHarness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorResult: {
        parsed: { chapter_text: draftText.slice(0, Math.floor(draftText.length * 0.9)), editor_report: { passed: true } },
        incomplete_details: { reason: 'max_output_tokens' },
      },
    })
    const memeHarness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: draftText,
      enableMemePolish: true,
      memeResult: {
        parsed: { chapter_text: draftText.slice(0, Math.floor(draftText.length * 0.95)), meme_polish_report: { changed_plot: false } },
        raw: { response: { incompleteDetails: {} } },
      },
    })

    const editorResult = await editorHarness.service.generateChapterForGroup(editorHarness.workspace, editorHarness.project.id, editorHarness.chapter.id, { model_id: 217, target_word_count: 1000 })
    const memeResult = await memeHarness.service.generateChapterForGroup(memeHarness.workspace, memeHarness.project.id, memeHarness.chapter.id, { model_id: 217, target_word_count: 1000 })

    expect(editorResult.chapter?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(editorResult.quality_warnings).toContainEqual(expect.objectContaining({ code: 'editor_unavailable' }))
    expect(memeResult.chapter?.chapter_text).toBe(normalizeProseForStorage(draftText))
    expect(memeResult.quality_warnings).toContainEqual(expect.objectContaining({ code: 'meme_polish_unavailable' }))
  })
  test('restores earned-compatible prose when an invalid editor rewrite exceeds the compatibility ceiling', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6006)
    const overCeilingEditorText = JSON.stringify({ chapter_text: draftText.slice(0, -18) })
    expect(countProseChars(overCeilingEditorText)).toBe(6007)
    // Disable opening-handoff regression so the invalid overlong editor payload reaches the word-target restore path.
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      editorText: overCeilingEditorText,
      chapterWordTarget: { mode: 'standard' },
      contextPackageOverride: withoutOpeningHandoffGuard(),
    })
    const stages: any[] = []
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, onStage: async (_name: string, payload: any) => stages.push(payload) })
    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(countProseChars(result.chapter?.chapter_text || '')).toBe(6006)
    expect(result.editor_rewrite).toMatchObject({
      edited: false,
      discarded: true,
      discard_reason: 'post_editor_word_target_failed',
    })
    expect(stages).toEqual(expect.arrayContaining([expect.objectContaining({
      phase: 'post_editor',
      fallback: 'pre_editor',
      compatibility_pass: true,
      compatibility_ceiling: 6006,
    })]))
  })
})
