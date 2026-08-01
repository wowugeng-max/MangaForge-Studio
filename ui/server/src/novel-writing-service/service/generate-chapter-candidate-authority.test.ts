import { describe, expect, test } from 'bun:test'
import { listNovelChapters } from '../../novel'
import { revisionTextHash } from '../../novel/revision-hash'
import {
  buildPipelineProse,
  createProsePipelineHarness,
} from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'

function repairedProse() {
  return buildPipelineProse(
    '江澈撞开铁门，追兵的包围线被迫后撤。',
    '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
  )
}

function expectFinalizerBeforeQuality(stages: Array<{ stage: string; payload: any }>) {
  const finalizerCompleteIndex = stages.findIndex(item => (
    item.stage === 'humanize_postprocess'
    && item.payload?.status !== 'running'
  ))
  const firstReviewIndex = stages.findIndex(item => (
    item.stage === 'review'
    && item.payload?.status === 'running'
  ))

  expect(finalizerCompleteIndex).toBeGreaterThanOrEqual(0)
  expect(firstReviewIndex).toBeGreaterThan(finalizerCompleteIndex)
}

describe('generateChapterForGroup final candidate authority', () => {
  test('evaluates and stores the exact valid post-finalizer candidate once', async () => {
    const draftText = repairedProse()
    const humanizedText = `${draftText}\n\n“东线退开。”\n\n江澈抬手截断频道，鞋底压住碎灯。`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: humanizedText, report: { accepted: true, before_chars: 901, after_chars: 977 } },
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
        skip_mid_monologue_densify: true,
        onStage: async (stage: string, payload: any) => stages.push({ stage, payload }),
      },
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const storedText = String(stored?.chapter_text || '')
    const finalizerInputHash = revisionTextHash(String(harness.humanizeTexts[0] || ''))
    const finalizerOutputHash = revisionTextHash(storedText)

    expectFinalizerBeforeQuality(stages)
    expect(harness.humanizeTexts).toEqual([expect.any(String)])
    expect(finalizerInputHash).not.toBe(finalizerOutputHash)
    expect(harness.qualityReviewTasks).toHaveLength(1)
    expect(harness.qualityReviewTasks[0]).toContain(storedText)
    expect(harness.qualityRevisionTasks).toEqual([])
    expect(harness.storeTexts).toEqual([storedText])
    expect(harness.storyStateTexts).toEqual([storedText])
    expect(harness.memoryTexts).toEqual([storedText])
    expect(revisionTextHash(String(result.chapter?.chapter_text || ''))).toBe(finalizerOutputHash)
    expect(result.humanize_postprocess).toMatchObject({ before_chars: 901, after_chars: 977 })
    expect(result.humanize_postprocess?.candidate_provenance).toEqual({
      scope: 'pre_quality',
      stage: 'pre_quality',
      humanize_input_hash: finalizerInputHash,
      humanize_output_hash: finalizerOutputHash,
      final_candidate_hash: finalizerOutputHash,
      superseded_by_quality_revision: false,
    })
    expect(stored?.raw_payload?.humanize_postprocess).toEqual(result.humanize_postprocess)
  })

  test('keeps one overlong post-finalizer candidate authoritative when a truncated revision is rejected', async () => {
    const draftText = repairedProse()
    const overlongText = `${draftText}\n\n${Array.from(
      { length: 18 },
      (_, index) => `江澈改换第${index + 1}条路线，追捕线随即向外错开。`,
    ).join('\n\n')}`
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: overlongText, report: { accepted: true } },
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

    const result = await harness.service.generateChapterForGroup(
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
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const storedText = String(stored?.chapter_text || '')
    const storedHash = revisionTextHash(storedText)

    expectFinalizerBeforeQuality(stages)
    expect(harness.qualityReviewTasks).toHaveLength(1)
    expect(harness.qualityReviewTasks[0]).toContain(storedText)
    expect(harness.qualityRevisionTasks).toHaveLength(1)
    expect(harness.qualityRevisionTasks[0]).toContain(storedText)
    expect(stages).toContainEqual(expect.objectContaining({
      stage: 'revise',
      payload: expect.objectContaining({ phase: 'quality_revision_truncated_fallback' }),
    }))
    expect(result.quality_loop?.decision?.hard_failures).toContainEqual(
      expect.objectContaining({ key: 'word_target' }),
    )
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'word_target' }))
    expect(harness.storeTexts).toEqual([storedText])
    expect(harness.storyStateTexts).toEqual([storedText])
    expect(harness.memoryTexts).toEqual([storedText])
    expect(revisionTextHash(String(result.chapter?.chapter_text || ''))).toBe(storedHash)
  })

  test('returns and stores unchanged pre-quality provenance in draft mode', async () => {
    const draftText = repairedProse()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: { final_text: draftText, report: { accepted: true, before_chars: 701, after_chars: 733 } },
    })

    const result = await harness.service.generateChapterForGroup(
      harness.workspace,
      harness.project.id,
      harness.chapter.id,
      {
        model_id: 217,
        target_word_count: 1000,
        max_quality_revision_rounds: 0,
        production_mode: 'draft_only',
        skip_mid_monologue_densify: true,
      },
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const finalHash = revisionTextHash(String(stored?.chapter_text || ''))

    expect(result.humanize_postprocess).toMatchObject({ before_chars: 701, after_chars: 733 })
    expect(result.humanize_postprocess?.candidate_provenance).toEqual({
      scope: 'pre_quality',
      stage: 'pre_quality',
      humanize_input_hash: revisionTextHash(String(harness.humanizeTexts[0] || '')),
      humanize_output_hash: finalHash,
      final_candidate_hash: finalHash,
      superseded_by_quality_revision: false,
    })
    expect(stored?.raw_payload?.humanize_postprocess).toEqual(result.humanize_postprocess)
  })

  test('redacts a secret-bearing humanize failure from returned and stored reports', async () => {
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
    const sensitiveValues = Object.values(credentials)
    const providerUrl = `https://provider.example/v1/humanize?api_key=${credentials.query}`
    const terminalHumanizeReports: any[] = []
    const draftText = repairedProse()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
      humanizeResult: () => {
        throw new Error([
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
      },
    })

    const result = await harness.service.generateChapterForGroup(
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
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id))
      .find(item => item.id === harness.chapter.id)
    const observable = JSON.stringify({
      returned: result.humanize_postprocess,
      returnedChapter: result.chapter?.raw_payload?.humanize_postprocess,
      stored: stored?.raw_payload?.humanize_postprocess,
      terminalHumanizeReports,
    })

    expect(sensitiveValues.some(value => observable.includes(value))).toBe(false)
    expect(observable.includes('provider.example')).toBe(false)
    expect(observable.includes('ordinary secret remains context')).toBe(true)
    expect(terminalHumanizeReports).toHaveLength(1)
    expect(() => JSON.stringify(terminalHumanizeReports[0])).not.toThrow()
    expect(result.humanize_postprocess?.error).toContain('humanize unavailable')
    expect(result.humanize_postprocess?.error.length).toBeLessThanOrEqual(240)
    expect(stored?.raw_payload?.humanize_postprocess).toEqual(result.humanize_postprocess)
  })

  test('keeps the common finalizer candidate exact in zhuque-fast mode', async () => {
    const draftText = repairedProse()
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText,
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

    expect(harness.modelCalls.review).toBe(0)
    expect(harness.modelCalls.revision).toBe(0)
    expect(harness.qualityReviewTasks).toEqual([])
    expect(harness.storeTexts).toEqual([returnedText])
    expect(revisionTextHash(String(harness.storeTexts[0] || ''))).toBe(finalHash)
    expect(result.humanize_postprocess?.candidate_provenance).toMatchObject({
      humanize_output_hash: finalHash,
      final_candidate_hash: finalHash,
      superseded_by_quality_revision: false,
    })
  })
})
