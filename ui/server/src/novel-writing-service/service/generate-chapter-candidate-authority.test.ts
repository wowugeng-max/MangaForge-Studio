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
})
