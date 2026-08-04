import { describe, expect, test } from 'bun:test'
import { listNovelChapters } from '../../novel'
import { revisionTextHash } from '../../novel/revision-hash'
import { normalizeProseForStorage } from '../../novel-writing/chapter-prose-storage-patch'
import { applyR76PreStoreSanitize } from '../../novel-writing/r76-zhuque-stack'
import {
  buildPipelineProse,
  createProsePipelineHarness,
  proseQualityScores,
  withoutOpeningHandoffGuard,
} from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'

function repairedProse() {
  return buildPipelineProse(
    '江澈撞开铁门，追兵的包围线被迫后撤。',
    '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
  )
}

function expectQualityBeforeFinalizer(stages: Array<{ stage: string; payload: any }>) {
  const finalizerStartIndex = stages.findIndex(item => (
    item.stage === 'humanize_postprocess'
    && item.payload?.status === 'running'
  ))
  const firstReviewIndex = stages.findIndex(item => (
    item.stage === 'review'
    && item.payload?.status === 'running'
  ))
  const qualityCompleteIndex = stages.findIndex(item => (
    item.stage === 'review'
    && ['success', 'warn'].includes(item.payload?.status)
  ))

  expect(firstReviewIndex).toBeGreaterThanOrEqual(0)
  expect(qualityCompleteIndex).toBeGreaterThan(firstReviewIndex)
  expect(finalizerStartIndex).toBeGreaterThan(qualityCompleteIndex)
}

describe('generateChapterForGroup final candidate authority', () => {
  test('evaluates and stores the exact valid post-finalizer candidate once', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText}\n\n“东线退开。”\n\n江澈抬手截断频道，鞋底压住碎灯。`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true, before_chars: 901, after_chars: 977 } },
      reviewPayloads: [
        {
          score: 70,
          publishable: true,
          dimensions: proseQualityScores,
          findings: [],
        },
        {
          score: 96,
          publishable: true,
          dimensions: Object.fromEntries(Object.keys(proseQualityScores).map(key => [key, 9])),
          findings: [],
        },
      ],
    })
    const stages: Array<{ stage: string; payload: any }> = []

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1150,
        max_quality_revision_rounds: 0,
        run_readability_review: true,
        skip_mid_monologue_densify: true,
        onStage: async (stage: string, payload: any) => stages.push({ stage, payload }),
      },
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const storedText = String(stored?.chapter_text || '')
    const finalizerInputHash = revisionTextHash(String(harness.humanizeTexts[0] || ''))
    const finalizerOutputHash = revisionTextHash(storedText)

    expectQualityBeforeFinalizer(stages)
    expect(harness.humanizeTexts).toEqual([expect.any(String)])
    expect(finalizerInputHash).not.toBe(finalizerOutputHash)
    expect(harness.qualityReviewTasks).toHaveLength(2)
    expect(harness.qualityReviewTasks[0]).toContain(String(harness.humanizeTexts[0] || ''))
    expect(harness.qualityReviewTasks[0]).not.toContain(storedText)
    expect(harness.qualityReviewTasks[1]).toContain(storedText)
    expect(harness.qualityRevisionTasks).toEqual([])
    expect(harness.readabilityReviewTasks).toHaveLength(1)
    expect(harness.readabilityReviewTasks[0]).toContain(storedText)
    expect(harness.storeTexts).toEqual([storedText])
    expect(harness.storyStateTexts).toEqual([storedText])
    expect(harness.memoryTexts).toEqual([storedText])
    expect(revisionTextHash(String(result.chapter?.chapter_text || ''))).toBe(finalizerOutputHash)
    expect(result.score).toBe(96)
    expect(result.quality_loop?.decision).toMatchObject({ score: 96, passed: true })
    expect(result.quality_warnings.map((warning: any) => String(warning?.message || '')).join('｜'))
      .not.toContain('质检评分 70 低于 78')
    expect(result.humanize_postprocess).toMatchObject({ before_chars: 901, after_chars: 977 })
    expect(result.humanize_postprocess?.candidate_provenance).toEqual({
      scope: 'post_quality',
      stage: 'post_quality',
      humanize_input_hash: finalizerInputHash,
      humanize_output_hash: finalizerOutputHash,
      final_candidate_hash: finalizerOutputHash,
      superseded_by_quality_revision: false,
    })
    expect(stored?.raw_payload?.humanize_postprocess).toEqual(result.humanize_postprocess)
  })

  test('replaces stale word-target and deterministic cleanup evidence for the stored humanized candidate', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText.slice(0, 420)}\n\n上一章的伏笔还没有结束，江澈把通讯器塞进外套。`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true } },
      reviewPayloads: [
        {
          score: 89,
          publishable: true,
          dimensions: Object.fromEntries(Object.keys(proseQualityScores).map(key => [key, 9])),
          findings: [],
        },
        {
          score: 94,
          publishable: true,
          dimensions: Object.fromEntries(Object.keys(proseQualityScores).map(key => [key, 9])),
          findings: [],
        },
      ],
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 0,
        skip_mid_monologue_densify: true,
      },
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const storedText = String(stored?.chapter_text || '')
    const hardFailureKeys = result.quality_loop?.decision?.hard_failures
      ?.map((failure: any) => failure.key) || []

    expect(harness.qualityReviewTasks).toHaveLength(2)
    expect(harness.qualityReviewTasks[1]).toContain(storedText)
    expect(harness.qualityRevisionTasks).toEqual([])
    expect(harness.storeTexts).toEqual([storedText])
    expect(harness.storyStateTexts).toEqual([storedText])
    expect(harness.memoryTexts).toEqual([storedText])
    expect(String(result.chapter?.chapter_text || '')).toBe(storedText)
    expect(result.quality_loop?.decision?.score).toBe(94)
    expect(hardFailureKeys).toContain('word_target')
    expect(hardFailureKeys).toContain('deterministic_prose_meta')
    expect(harness.qualityReviewTasks[1]).toContain('"type": "prose_meta"')
    expect(harness.qualityReviewTasks[1]).toContain('"risk_count":')
  })

  test('detects a canonical-name conflict introduced only by the final humanized candidate', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText}\n\n江城市第一人民医院正是档案里那家诡异医院。`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true } },
      contextPackageOverride: {
        canonical_surface_index: {
          stable_entities: [{
            surface: '临江市第一人民医院',
            suffix: '第一人民医院',
            chapters: [4, 9],
            source: 'previous_chapters',
          }],
        },
      },
      reviewPayloads: [
        {
          score: 90,
          publishable: true,
          dimensions: Object.fromEntries(Object.keys(proseQualityScores).map(key => [key, 9])),
          findings: [],
        },
        {
          score: 93,
          publishable: true,
          dimensions: Object.fromEntries(Object.keys(proseQualityScores).map(key => [key, 9])),
          findings: [],
        },
      ],
    })

    const exposed: any = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 0,
        skip_mid_monologue_densify: true,
      },
    ).catch((error: unknown) => error)

    expect(exposed?.code).toBe('PROSE_QUALITY_GATE_BLOCKED')
    expect(exposed?.quality_loop?.decision?.score).toBe(93)
    expect(exposed?.quality_loop?.decision?.hard_failures)
      .toContainEqual(expect.objectContaining({ key: 'canonical_proper_noun_conflict', source: 'deterministic' }))
    expect(harness.qualityReviewTasks).toHaveLength(2)
    expect(harness.qualityReviewTasks[1]).toContain('江城市第一人民医院正是档案里那家诡异医院')
    expect(harness.qualityRevisionTasks).toEqual([])
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toEqual([])
  })

  test('propagates final quality recheck task rejection by identity before storage', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText}\n\n江澈捏碎耳机，追捕队的备用频道同时熄灭。`
    const recheckFailure = new Error('final quality recheck unavailable')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true } },
      recheckError: recheckFailure,
    })

    const exposed = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 0,
        skip_mid_monologue_densify: true,
      },
    ).catch((error: unknown) => error)

    expect(exposed).toBe(recheckFailure)
    expect(harness.qualityReviewTasks).toHaveLength(2)
    expect(harness.qualityReviewTasks[1]).toContain('江澈捏碎耳机，追捕队的备用频道同时熄灭')
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toEqual([])
  })

  test('fails closed before persistence when task-scoped quality repair resolves truncated', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText}\n\n“通道已经让开了。”江澈收起通讯器。`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true } },
      reviewPayloads: [{
        score: 72,
        dimensions: {
          continuity: 7,
          core_promise_agency: 6,
          conflict_causality: 7,
          payoff_hook: 6,
          prose_style: 7,
          fact_setting_safety: 8,
        },
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '夺下通讯器',
          required_change: '让江澈主动截断追捕频道。',
          acceptance_test: '频道因江澈的动作失效。',
        }],
      }],
      revisionResults: [{
        parsed: {
          chapter_text: draftText,
          revision_receipts: [{ key: 'authoritative_candidate', changed_evidence: draftText.slice(0, 80) }],
        },
        finish_reason: 'length',
        modelName: 'fake-truncated-reviser',
      }],
    })
    const stages: Array<{ stage: string; payload: any }> = []

    const exposed: any = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 1,
        skip_mid_monologue_densify: true,
        onStage: async (stage: string, payload: any) => stages.push({ stage, payload }),
      },
    ).catch((error: unknown) => error)

    expect(exposed).toMatchObject({
      code: 'PROSE_REVISION_TRUNCATED',
      admission_status: 'blocked_invalid',
      finish_reason: 'length',
    })
    expect(harness.qualityReviewTasks).toHaveLength(1)
    expect(harness.qualityReviewTasks[0]).toContain(String(harness.humanizeTexts[0] || ''))
    expect(harness.qualityRevisionTasks).toHaveLength(1)
    expect(harness.qualityRevisionTasks[0]).toContain(String(harness.humanizeTexts[0] || ''))
    expect(stages).not.toContainEqual(expect.objectContaining({
      stage: 'humanize_postprocess',
      payload: expect.objectContaining({ status: 'running' }),
    }))
    expect(stages).not.toContainEqual(expect.objectContaining({
      stage: 'revise',
      payload: expect.objectContaining({ phase: 'quality_revision_truncated_fallback' }),
    }))
    expect(harness.storeCalls).toBe(0)
    expect(harness.storyStateCalls).toBe(0)
    expect(harness.memoryTexts).toEqual([])
  })

  test('returns and stores canonical post-quality provenance in draft mode', async () => {
    const sanitizedDraft = applyR76PreStoreSanitize(normalizeProseForStorage(repairedProse()), {
      skip_mid_monologue_densify: true,
    })
    const draftText = applyR76PreStoreSanitize(sanitizedDraft, {
      skip_mid_monologue_densify: true,
    })
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      contextPackageOverride: withoutOpeningHandoffGuard(),
      humanizeResult: (sourceText: string) => ({
        final_text: sourceText,
        report: { accepted: true, before_chars: 701, after_chars: 733 },
      }),
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1500,
        max_quality_revision_rounds: 0,
        production_mode: 'draft_only',
        skip_mid_monologue_densify: true,
      },
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const finalHash = revisionTextHash(String(stored?.chapter_text || ''))

    expect(harness.qualityReviewTasks).toHaveLength(1)
    expect(result.humanize_postprocess).toMatchObject({ before_chars: 701, after_chars: 733 })
    expect(result.humanize_postprocess?.candidate_provenance).toEqual({
      scope: 'post_quality',
      stage: 'post_quality',
      humanize_input_hash: revisionTextHash(String(harness.humanizeTexts[0] || '')),
      humanize_output_hash: finalHash,
      final_candidate_hash: finalHash,
      superseded_by_quality_revision: false,
    })
    expect(stored?.raw_payload?.humanize_postprocess).toEqual(result.humanize_postprocess)
  })

  test('propagates an automatic humanize failure instead of storing a fallback candidate', async () => {
    const credentials = {
      query: 'query-value-private',
      basic: 'dXNlcjpwYXNzd29yZA==',
      cookie: 'cookie-session-value',
      clientSecret: 'client-secret-value',
      password: 'password-value',
      session: 'session-value',
      access: 'access-token-value',
      refresh: 'refresh-token-value',
    }
    const providerUrl = `https://provider.example/v1/humanize?api_key=${credentials.query}`
    const terminalHumanizeReports: any[] = []
    const draftText = repairedProse()
    const humanizeFailure = new Error([
      'humanize unavailable ordinary secret remains context',
      providerUrl,
      `Authorization: Basic ${credentials.basic}`,
      `Cookie: sid=${credentials.cookie}`,
      `client_secret=${credentials.clientSecret}`,
      `password=${credentials.password}`,
      `session_id=${credentials.session}`,
      `access_token=${credentials.access}`,
      `refresh_token=${credentials.refresh}`,
    ].join('\n'))
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: () => { throw humanizeFailure },
    })

    const exposed = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 0,
        production_mode: 'draft_only',
        skip_mid_monologue_densify: true,
        onStage: async (stage: string, payload: any) => {
          if (stage === 'humanize_postprocess' && payload?.status !== 'running') {
            terminalHumanizeReports.push(payload?.report)
          }
        },
      },
    ).catch((error: unknown) => error)
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)

    expect(exposed).toBe(humanizeFailure)
    expect(terminalHumanizeReports).toEqual([])
    expect(stored?.chapter_text).not.toBe(draftText)
    expect(stored?.raw_payload?.humanize_postprocess).toBeUndefined()
  })

  test('rechecks a zhuque-fast candidate when the common finalizer changes its bytes', async () => {
    const draftText = repairedProse()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      contextPackageOverride: withoutOpeningHandoffGuard(),
      humanizeResult: (sourceText: string) => ({
        final_text: sourceText,
        report: { accepted: true, before_chars: sourceText.length, after_chars: sourceText.length },
      }),
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        production_mode: 'zhuque_fast',
      },
    )
    const returnedText = String(result.chapter?.chapter_text || '')
    const finalHash = revisionTextHash(returnedText)

    expect(harness.modelCalls.review).toBe(1)
    expect(harness.modelCalls.revision).toBe(0)
    expect(harness.qualityReviewTasks).toHaveLength(1)
    expect(harness.qualityReviewTasks[0]).toContain(returnedText)
    expect(revisionTextHash(String(harness.humanizeTexts[0] || ''))).not.toBe(finalHash)
    expect(harness.storeTexts).toEqual([returnedText])
    expect(revisionTextHash(String(harness.storeTexts[0] || ''))).toBe(finalHash)
    expect(result.humanize_postprocess?.candidate_provenance).toMatchObject({
      humanize_output_hash: finalHash,
      final_candidate_hash: finalHash,
      superseded_by_quality_revision: false,
    })
  })
})
