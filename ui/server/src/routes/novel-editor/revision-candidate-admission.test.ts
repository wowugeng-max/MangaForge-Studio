import { createHash } from 'crypto'
import { describe, expect, test } from 'bun:test'
import { EDITOR_REVISION_PHASES } from './editor-revision-contract'
import {
  admitRevisionCandidate,
  RevisionCandidateAdmissionError,
  revisionTextHash,
} from './revision-candidate-admission'

const observedSource = '旧正文推进。'.repeat(985)

function completeResult(chapterText: string, extra: Record<string, unknown> = {}) {
  const payload = { chapter_text: chapterText, ...extra }
  return {
    finish_reason: 'stop',
    content: JSON.stringify(payload),
    output: payload,
  }
}

function completePatchResult(payload: Record<string, unknown>) {
  return {
    finish_reason: 'stop',
    content: JSON.stringify(payload),
    output: payload,
  }
}

function captureAdmissionError(sourceText: string, result: any) {
  try {
    admitRevisionCandidate({ sourceText, result })
  } catch (error) {
    expect(error).toBeInstanceOf(RevisionCandidateAdmissionError)
    return error as RevisionCandidateAdmissionError
  }
  throw new Error('expected revision candidate admission to fail')
}

describe('editor revision contract', () => {
  test('uses the canonical phase order without percentage progress fields', () => {
    expect(EDITOR_REVISION_PHASES).toEqual([
      'generate_candidate',
      'admit_candidate',
      'persist_chapter',
      'post_quality',
      'sync_current_story_state',
      'record_continuity_warning',
      'completed',
    ])
  })
})

describe('admitRevisionCandidate', () => {
  test('rejects the observed 5910-to-243 incomplete replacement with exact diagnostics', () => {
    const candidate = `${'残缺内容。'.repeat(48)}仍停在`
    const error = captureAdmissionError(observedSource, completeResult(candidate))

    expect(error.code).toBe('REVISION_CANDIDATE_TOO_SHORT')
    expect(error.diagnostics).toMatchObject({
      source_char_count: 5910,
      candidate_char_count: 243,
      minimum_char_count: 4137,
      maximum_char_count: 7683,
    })
  })

  test.each(['max_tokens', 'length', 'tool_calls'])('rejects %s transport completion', finishReason => {
    expect(() => admitRevisionCandidate({
      sourceText: '原文。'.repeat(400),
      result: { ...completeResult('新文。'.repeat(400)), finish_reason: finishReason },
    })).toThrow(/不能作为完整章节正文入库|输出被截断/)
  })

  test.each([
    { error: 'provider failed' },
    { timeout: true },
    { aborted: true },
  ])('rejects provider error, timeout, and abort results before parsing prose', transport => {
    expect(() => admitRevisionCandidate({
      sourceText: '原文。'.repeat(400),
      result: { ...completeResult('新文。'.repeat(400)), ...transport },
    })).toThrow()
  })

  test.each([
    { recovered_from_partial_json: true },
    { partial_json_open_string_recovered: true },
  ])('rejects partial JSON recovery flags', recoveryFlag => {
    const error = captureAdmissionError(
      '原正文。'.repeat(300),
      completeResult('修订正文。'.repeat(240), recoveryFlag),
    )
    expect(error.code).toBe('REVISION_PARTIAL_JSON_RECOVERY')
  })

  test.each([
    { incomplete_details: { reason: 'max_output_tokens' } },
    { raw: { response: { incompleteDetails: {} } } },
  ])('rejects incomplete transport details', transport => {
    expect(() => admitRevisionCandidate({
      sourceText: '原正文。'.repeat(300),
      result: { ...completeResult('修订正文。'.repeat(240)), ...transport },
    })).toThrow(/不能作为完整章节正文入库|输出被截断/)
  })

  test('rejects empty, reasoning-only, and tool-only results', () => {
    const sourceText = '原正文。'.repeat(300)
    const candidate = '修订正文。'.repeat(240)
    const payloadText = JSON.stringify({ chapter_text: candidate })
    const cases = [
      { finish_reason: 'stop' },
      {
        finish_reason: 'stop',
        raw: { output: [{ type: 'reasoning', content: [{ type: 'reasoning_text', text: payloadText }] }] },
      },
      {
        finish_reason: 'stop',
        raw: {
          output: [
            { type: 'reasoning', content: [{ type: 'reasoning_text', text: payloadText }] },
            { type: 'message', role: 'assistant', content: [] },
          ],
        },
      },
      {
        finish_reason: 'stop',
        raw: { output: [{ type: 'function_call', name: 'submit_revision', content: [{ type: 'input_text', text: payloadText }] }] },
      },
    ]

    for (const result of cases) {
      expect(() => admitRevisionCandidate({ sourceText, result })).toThrow()
    }
  })

  test.each([
    (text: string) => `\`\`\`json\n${text}\n\`\`\``,
    (text: string) => `以下是修订稿：\n${text}`,
    (text: string) => `修订结果如下：\n${text}`,
    (text: string) => `修订结果如下${text}`,
    (text: string) => `{"正文":"${text}"}`,
    (text: string) => `["${text}"]`,
  ])('rejects code fences, chat labels, and JSON prose shells', wrap => {
    const sourceText = '原正文。'.repeat(300)
    const candidate = wrap('修订正文。'.repeat(220))
    const error = captureAdmissionError(sourceText, completeResult(candidate))
    expect(error.code).toBe('REVISION_OUTPUT_WRAPPER')
  })

  test('rejects an incomplete prose ending after length validation', () => {
    const sourceText = `${'甲'.repeat(1199)}。`
    const candidate = `${'乙'.repeat(899)}在`
    const error = captureAdmissionError(sourceText, completeResult(candidate))
    expect(error.code).toBe('REVISION_INCOMPLETE_ENDING')
  })

  test.each(['。', '！', '？', '!', '?', '…', '.', '。”', '！’', '?」', '…】'])('accepts complete punctuation ending %s', ending => {
    const sourceText = `${'甲'.repeat(1199)}。`
    const candidate = `${'乙'.repeat(899)}${ending}\n\n`
    const admission = admitRevisionCandidate({ sourceText, result: completeResult(candidate) })
    const normalizedCandidate = candidate.trim()

    expect(admission.chapterText).toBe(normalizedCandidate)
    expect(admission.candidateHash).toBe(createHash('sha256').update(normalizedCandidate).digest('hex'))
  })

  test('allows ordinary quotation marks inside prose', () => {
    const sourceText = `${'甲'.repeat(1199)}。`
    const candidate = `${'乙'.repeat(430)}“现在就走。”${'丙'.repeat(463)}。`
    expect(admitRevisionCandidate({ sourceText, result: completeResult(candidate) }).chapterText).toBe(candidate)
  })

  test('accepts exact 70 and 130 percent boundaries and rejects one prose character outside', () => {
    const sourceText = `${'甲'.repeat(1999)}。`
    for (const count of [1400, 2600]) {
      const candidate = `${'乙'.repeat(count - 1)}。`
      const admission = admitRevisionCandidate({ sourceText, result: completeResult(candidate) })
      expect(admission.candidateCharCount).toBe(count)
      expect(admission.minimumCharCount).toBe(1400)
      expect(admission.maximumCharCount).toBe(2600)
    }

    expect(captureAdmissionError(sourceText, completeResult(`${'乙'.repeat(1398)}。`)).code)
      .toBe('REVISION_CANDIDATE_TOO_SHORT')
    expect(captureAdmissionError(sourceText, completeResult(`${'乙'.repeat(2600)}。`)).code)
      .toBe('REVISION_CANDIDATE_TOO_LONG')
  })

  test('rejects all patches when any replacement anchor is missing', () => {
    const sourceText = `${'第一段推进。'.repeat(100)}\n\n唯一锚点。\n\n${'结尾推进。'.repeat(100)}`
    const result = completePatchResult({
      replacements: [
        { find: '唯一锚点。', replace: '唯一锚点已修订。' },
        { find: '不存在锚点。', replace: '不得部分写入。' },
      ],
    })
    const error = captureAdmissionError(sourceText, result)

    expect(error.code).toBe('REVISION_PATCH_INCOMPLETE')
    expect(error).not.toHaveProperty('chapterText')
    expect(error.diagnostics).toMatchObject({ applied_patch_count: 1, unapplied_patch_count: 1 })
  })

  test('rejects an opening rewrite whose explicit keep_from anchor is missing', () => {
    const sourceText = `${'旧开篇。'.repeat(180)}保留正文从这里继续。${'后续推进。'.repeat(180)}`
    const error = captureAdmissionError(sourceText, completePatchResult({
      opening_rewrite: '新开篇先写出角色行动。'.repeat(80),
      keep_from: '不存在的保留锚点。',
    }))

    expect(error.code).toBe('REVISION_NO_APPLICABLE_PATCH')
    expect(error.diagnostics).toMatchObject({
      applied_patch_count: 0,
      unapplied_patch_count: 1,
      unapplied_patch_reasons: [{ type: 'opening_rewrite', reason: 'keep_from_not_found' }],
    })
  })

  test('rejects duplicate replacement and insertion anchors instead of selecting the first match', () => {
    const repeated = `唯一开头。${'正文推进。'.repeat(80)}重复锚点。${'中段推进。'.repeat(80)}重复锚点。${'结尾推进。'.repeat(80)}`
    const cases = [
      {
        replacements: [
          { find: '唯一开头。', replace: '唯一开头已修订。' },
          { find: '重复锚点。', replace: '不得猜测位置。' },
        ],
      },
      {
        replacements: [{ find: '唯一开头。', replace: '唯一开头已修订。' }],
        insertions: [{ anchor: '重复锚点。', text: '不得猜测位置。', position: 'after' }],
      },
    ]

    for (const payload of cases) {
      const error = captureAdmissionError(repeated, completePatchResult(payload))
      expect(error.code).toBe('REVISION_PATCH_INCOMPLETE')
      expect(error.diagnostics).toMatchObject({ unapplied_patch_count: 1 })
    }
  })

  test('returns a deterministic full SHA-256 candidate hash and compact admission diagnostics', () => {
    const sourceText = '原正文。'.repeat(300)
    const candidate = '修订正文。'.repeat(240)
    const admission = admitRevisionCandidate({ sourceText, result: completeResult(candidate) })

    expect(revisionTextHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(admission).toMatchObject({
      sourceCharCount: 1200,
      candidateCharCount: 1200,
      minimumCharCount: 840,
      maximumCharCount: 1560,
      appliedPatches: [{ type: 'full_text' }],
      diagnostics: {
        source_char_count: 1200,
        candidate_char_count: 1200,
        applied_patch_count: 1,
      },
    })
  })
})
