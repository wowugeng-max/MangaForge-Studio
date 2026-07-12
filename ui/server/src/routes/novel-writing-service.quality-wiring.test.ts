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
  resolveChapterWordTarget,
  scanProseForQualityLoop,
} from './novel-writing-service'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildCanonicalSurfaceIndex } from '../novel-writing/canonical-continuity'
import { REAL_CHAPTER_11_CANONICAL_CONFLICT_PROSE } from '../novel-writing/fixtures/real-chapter-11-canonical-conflict'
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

  test('only suppresses standard word-target failure when an earned compatibility policy is supplied', () => {
    const standard = resolveChapterWordTarget({}, {}, {})
    expect(scanProseForQualityLoop('字'.repeat(6596), {}, standard).hard_failures).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'word_target' })]))
    expect(scanProseForQualityLoop('字'.repeat(6596), {}, standard, { word_target_compatibility_pass: true, compatibility_ceiling: 6760 }).hard_failures.some((item: any) => item.key === 'word_target')).toBe(false)
    expect(scanProseForQualityLoop('字'.repeat(6761), {}, standard, { word_target_compatibility_pass: true, compatibility_ceiling: 6760 }).hard_failures).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'word_target' })]))
    expect(scanProseForQualityLoop('字'.repeat(6761), {}, standard, { word_target_compatibility_pass: true, compatibility_ceiling: 99999 }).hard_failures).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'word_target' })]))
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
      contextPackageOverride: {
        canonical_surface_index: canonicalSurfaceIndex,
        canonicalSurfaceIndex,
      },
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
    expect(after).toEqual(before)
    expect(harness.modelCalls.scene_cards).toBe(1)
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toHaveLength(0)
  })

  test('keeps a real low-risk style hit advisory when the review repeats the same evidence', () => {
    const prose = '江澈推开仓门，铜锁坠在地上。如同一枚刚落下的铁钉，回声穿过空仓。他没有停步，抬手按住总闸，灯光依次亮起。'
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
    const prose = '门开了。这一刻，他终于明白真相。江澈把账册推到灯下，指向新出现的签名。'
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
      usage: { input_tokens: 120, output_tokens: 1000, total_tokens: 1120 },
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

  test('preserves a 6596-character standard original after three unusable contractions', async () => {
    const originalText = '原'.repeat(6596)
    let calls = 0
    const service = createNovelWritingService({ getProject: async () => null, production: { getStageModelId: (_p: any, _s: string, f?: number) => f || 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any, reference: {} as any, runtime: { executeAgent: async () => { calls++; return { parsed: {}, finish_reason: calls === 1 ? 'stop' : 'length' } } } })
    const standard = { mode: 'standard', label: '标准章', target: 4200, min: 3200, max: 5200, rangeText: '3200-5200 字' }
    const result = await service.ensureProseMeetsWordTarget('/tmp/compat', { id: 1 }, { chapter_target: { word_target: standard } }, originalText, 217)
    expect(calls).toBe(3)
    expect(result.final_text).toBe(originalText)
    expect(result).toMatchObject({ contracted: false, word_target_compatibility_pass: true, compatibility_ceiling: 6760 })
    expect(result.word_target_warning).toBeUndefined()
    expect(result.contraction.attempts).toHaveLength(3)
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

  test('reviews an earned compatibility draft but stores nothing when the full quality gate rejects it', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，抢在合围闭合前切入铁门。', '主动夺取追捕队的通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      chapterWordTarget: { mode: 'standard' },
      reviewPayloads: Array.from({ length: 3 }, () => ({ score: 90, publishable: false, dimensions: proseQualityScores, findings: [] })),
    })
    const before = (await listNovelChapters(harness.workspace, harness.project.id)).find((item: any) => item.id === harness.chapter.id)
    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, auto_repair_quality_gate: true }).then(() => null, (e: any) => e)
    const after = (await listNovelChapters(harness.workspace, harness.project.id)).find((item: any) => item.id === harness.chapter.id)
    expect(harness.modelCalls.contraction).toBe(3)
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(error?.code).toBe('PROSE_QUALITY_GATE_BLOCKED')
    expect(error?.quality_loop?.decision?.hard_failures?.some((item: any) => item.key === 'word_target')).toBe(false)
    expect(after?.chapter_text).toBe(before?.chapter_text)
    expect(after?.version).toBe(before?.version)
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toEqual([])
  })

  test('restores earned-compatible prose when editor exceeds the compatibility ceiling', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, { draftText, editorText: '编'.repeat(7000), chapterWordTarget: { mode: 'standard' } })
    const stages: any[] = []
    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, onStage: async (_name: string, payload: any) => stages.push(payload) }).then(() => null, (e: any) => e)
    expect(error?.code).toBe('PROSE_QUALITY_GATE_BLOCKED')
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(stages).toEqual(expect.arrayContaining([expect.objectContaining({ phase: 'post_editor', fallback: 'pre_editor', compatibility_pass: true })]))
  })

  test('restores earned-compatible prose when optional meme polish exceeds the compatibility ceiling', async () => {
    const draftText = buildPipelineProse('江澈撞断路灯，切入铁门。', '主动夺取通讯器').repeat(7).slice(0, 6596)
    const harness = await createProsePipelineHarness(createNovelWritingService, { draftText, editorText: draftText, memeText: '润'.repeat(7000), enableMemePolish: true, chapterWordTarget: { mode: 'standard' } })
    const stages: any[] = []
    const error = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, { model_id: 217, onStage: async (_name: string, payload: any) => stages.push(payload) }).then(() => null, (e: any) => e)
    expect(error?.code).toBe('PROSE_QUALITY_GATE_BLOCKED')
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

    const expectedStoredText = normalizeProseForStorage(draftText)
    expect(countProseChars(editorText)).toBeGreaterThan(1100)
    expect(result.chapter.chapter_text).toBe(expectedStoredText)
    expect(result.chapter.chapter_text).not.toContain('商业主编增加的冗余解释')
    expect(result.chapter.continuity_notes || []).not.toContain('不应保留的 editor 连续性')
    expect(result.chapter.raw_payload?.generated_scene_breakdown || []).not.toEqual(editorSceneBreakdown)
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

    await expect(harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        quality_threshold: 78,
        auto_repair_quality_gate: true,
      },
    )).rejects.toMatchObject({ code: 'PROSE_WORD_TARGET_LONG' })

    expect(countProseChars(softCapDraft)).toBe(1110)
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
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

    expect(error).toMatchObject({ code: 'PROSE_DRAFT_TRUNCATED' })
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

    expect(error).toMatchObject({ code: 'PROSE_REVISION_TRUNCATED' })
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

  test('rechecks revised prose before unattended quality gate blocks chapter advance', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const qualityLoopStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>')
    const gateStart = source.indexOf('const preStoreQualityDecision =', qualityLoopStart)
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
    expect(beforeGate).toContain('assertProseQualityCanStore(qualityLoop.decision, approvals?.quality_gate)')
    expect(beforeGate).not.toContain('runProseSelfReviewAndRevision')
    expect(reviewBlock).toContain('maxTokens: proseQualityReviewMaxTokensForAttempt(attempt)')
    expect(reviewBlock).toContain('上一次审查没有返回可用的完整六维 JSON')
    expect(reviewBlock).toContain('__quality_review_transport')
    expect(reviewBlock).not.toContain('raw_keys: diagnostics.raw_keys')
    expect(reviseBlock).toContain('maxTokens: proseMaxTokensForWordTarget(wordTarget)')
    expect(reviseBlock).not.toContain('proseQualityReviewMaxTokensForAttempt')
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

    const error = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        auto_repair_quality_gate: true,
      },
    ).then(() => null, (caught: any) => caught)

    expect(error).toMatchObject({
      code: 'PROSE_QUALITY_GATE_BLOCKED',
      quality_loop: {
        decision: {
          passed: false,
          score: 77,
          min_score: 78,
        },
      },
    })
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
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
    expect(stored?.chapter_text).toBe(finalText)
    expect(harness.memoryTexts).toEqual([finalText])
    expect(harness.storeCalls).toBe(1)
    expect(harness.storyStateCalls).toBe(1)
    expect(harness.storyStateTexts).toEqual([finalText])
    expect(harness.modelCalls.draft).toBe(1)
    expect(harness.modelCalls.revision).toBe(1)
    expect(harness.modelCalls.review).toBe(2)
  })

  test('attempts accepted prose memory after chapter storage without depending on a returned record', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const storageStart = source.indexOf('const acceptance = await commitNovelChapterAcceptance(activeWorkspace, {')
    const memoryStore = source.indexOf('await storeChapterProseMemory(project, chapter.chapter_no, finalText)', storageStart)
    const storyState = source.indexOf("onStage('story_state', { status: 'success' })", storageStart)
    const postStorageBlock = source.slice(storageStart, storyState)

    expect(storageStart).toBeGreaterThanOrEqual(0)
    expect(memoryStore).toBeGreaterThan(storageStart)
    expect(memoryStore).toBeLessThan(storyState)
    expect(postStorageBlock).toContain("runPostCommitBestEffort('memory'")
  })
})
