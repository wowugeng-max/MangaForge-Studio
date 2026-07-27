import { createHash } from 'crypto'
import { describe, expect, test } from 'bun:test'
import { EDITOR_REVISION_PHASES } from './editor-revision-contract'
import {
  admitRevisionCandidate,
  applySurgicalRevisionPatch,
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

  test.each(['max_tokens', 'length', 'tool_calls'])('normalizes %s transport completion into a safe admission error', finishReason => {
    const error = captureAdmissionError('原文。'.repeat(400), {
      ...completeResult('不得出现在诊断中的新文。'.repeat(160)),
      finish_reason: finishReason,
    })

    expect(error.code).toBe('PROSE_REVISION_TRUNCATED')
    expect(error).toMatchObject({
      admission_status: 'blocked_invalid',
      admission_failure: { source: 'transport' },
    })
    expect(error.diagnostics).toMatchObject({ finish_reason: finishReason })
    expect(error.diagnostics).not.toHaveProperty('content_preview')
    expect(error).not.toHaveProperty('llm_diagnostics')
    expect(JSON.stringify(error.diagnostics)).not.toContain('不得出现在诊断中的新文')
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
  ])('normalizes incomplete transport details without retaining prose', transport => {
    const error = captureAdmissionError('原正文。'.repeat(300), {
      ...completeResult('不得进入诊断的修订正文。'.repeat(120)),
      ...transport,
    })

    expect(error.code).toBe('PROSE_REVISION_TRUNCATED')
    expect(error).toMatchObject({ admission_status: 'blocked_invalid' })
    expect(error.diagnostics).toMatchObject({ incomplete_details_present: true })
    expect(error.diagnostics).not.toHaveProperty('content_preview')
    expect(error).not.toHaveProperty('llm_diagnostics')
    expect(JSON.stringify(error.diagnostics)).not.toContain('不得进入诊断的修订正文')
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
    expect(error.diagnostics).toMatchObject({ applied_patch_count: 0, unapplied_patch_count: 1 })
  })

  test('rejects an opening rewrite whose explicit keep_from anchor is missing', () => {
    const sourceText = `${'旧开篇。'.repeat(180)}保留正文从这里继续。${'后续推进。'.repeat(180)}`
    const error = captureAdmissionError(sourceText, completePatchResult({
      opening_rewrite: '新开篇先写出角色行动。'.repeat(80),
      keep_from: '不存在的保留锚点。',
    }))

    expect(error.code).toBe('REVISION_PATCH_INCOMPLETE')
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
      expect(error.diagnostics).toMatchObject({ applied_patch_count: 0, unapplied_patch_count: 1 })
    }
  })

  test('rejects a later anchor that exists only because an earlier patch created it', () => {
    const sourceText = `${'前段推进。'.repeat(90)}旧锚点。${'后段推进。'.repeat(90)}`
    const error = captureAdmissionError(sourceText, completePatchResult({
      replacements: [
        { find: '旧锚点。', replace: '模型新造锚点。' },
        { find: '模型新造锚点。', replace: '不得基于补丁产物继续定位。' },
      ],
    }))

    expect(error.code).toBe('REVISION_PATCH_INCOMPLETE')
    expect(error.diagnostics).toMatchObject({
      applied_patch_count: 0,
      unapplied_patch_count: 1,
      unapplied_patch_reasons: [{ type: 'replacement', reason: 'anchor_not_found' }],
    })
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

describe('source-fixed surgical revision assembly', () => {
  test('does not resolve a later anchor from an earlier replacement result', () => {
    const sourceText = '开头。原锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [
        { find: '原锚点。', replace: '新造锚点。' },
        { find: '新造锚点。', replace: '非法二次修改。' },
      ],
    })

    expect(patch.chapterText).toBe(sourceText)
    expect(patch.applied).toEqual([])
    expect(patch.unapplied).toEqual([
      expect.objectContaining({ type: 'replacement', reason: 'anchor_not_found', find: '新造锚点。' }),
    ])
  })

  test('keeps a later source anchor stable when an earlier edit creates another copy', () => {
    const sourceText = '开头。第一锚点。中段。第二锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [
        { find: '第一锚点。', replace: '第二锚点。' },
        { find: '第二锚点。', replace: '第二锚点已修订。' },
      ],
    })

    expect(patch.chapterText).toBe('开头。第二锚点。中段。第二锚点已修订。结尾。')
    expect(patch.applied).toHaveLength(2)
    expect(patch.unapplied).toEqual([])
  })

  test('applies a later source anchor correctly after an earlier deletion shifts its offset', () => {
    const sourceText = '开头。删除这一段。中段。后方锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [
        { find: '删除这一段。', replace: '' },
        { find: '后方锚点。', replace: '后方锚点已修订。' },
      ],
    })

    expect(patch.chapterText).toBe('开头。中段。后方锚点已修订。结尾。')
    expect(patch.applied).toHaveLength(2)
    expect(patch.unapplied).toEqual([])
  })

  test('rejects duplicate source anchors atomically', () => {
    const sourceText = '开头。重复锚点。中段。重复锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [{ find: '重复锚点。', replace: '不得猜测。' }],
    })

    expect(patch.chapterText).toBe(sourceText)
    expect(patch.applied).toEqual([])
    expect(patch.unapplied).toEqual([
      expect.objectContaining({ type: 'replacement', reason: 'anchor_not_unique' }),
    ])
  })

  test('rejects an exact anchor when a whitespace-equivalent duplicate also exists', () => {
    const sourceText = '开头。唯一锚点。中段。唯一 锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [{ find: '唯一锚点。', replace: '不得猜测。' }],
    })

    expect(patch.chapterText).toBe(sourceText)
    expect(patch.applied).toEqual([])
    expect(patch.unapplied).toEqual([
      expect.objectContaining({ type: 'replacement', reason: 'anchor_not_unique' }),
    ])
  })

  test('rejects overlapping source operations before applying either one', () => {
    const sourceText = '开头。外层锚点包含内层锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [
        { find: '外层锚点包含内层锚点。', replace: '外层已修订。' },
        { find: '内层锚点。', replace: '内层已修订。' },
      ],
    })

    expect(patch.chapterText).toBe(sourceText)
    expect(patch.applied).toEqual([])
    expect(patch.unapplied).toEqual([
      expect.objectContaining({ type: 'replacement', reason: 'anchor_overlap' }),
      expect.objectContaining({ type: 'replacement', reason: 'anchor_overlap' }),
    ])
  })

  test('rejects insertions from adjacent anchors that collide at the same source offset', () => {
    const sourceText = '开头。左锚点。右锚点。结尾。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      insertions: [
        { anchor: '左锚点。', text: '左侧新增。', position: 'after' },
        { anchor: '右锚点。', text: '右侧新增。', position: 'before' },
      ],
    })

    expect(patch.chapterText).toBe(sourceText)
    expect(patch.applied).toEqual([])
    expect(patch.unapplied).toEqual([
      expect.objectContaining({ type: 'insertion', reason: 'anchor_overlap' }),
      expect.objectContaining({ type: 'insertion', reason: 'anchor_overlap' }),
    ])
  })

  test('assembles multiple disjoint operations deterministically from source offsets', () => {
    const sourceText = '开头。替换甲。中段。插入锚。尾段。删除乙。结束。'
    const patch = applySurgicalRevisionPatch(sourceText, {
      replacements: [
        { find: '删除乙。', replace: '' },
        { find: '替换甲。', replace: '新甲。' },
      ],
      insertions: [
        { anchor: '插入锚。', text: '新增推进。', position: 'after' },
      ],
    })

    expect(patch.chapterText).toBe('开头。新甲。中段。插入锚。\n\n新增推进。尾段。结束。')
    expect(patch.applied).toHaveLength(3)
    expect(patch.unapplied).toEqual([])
  })
})
