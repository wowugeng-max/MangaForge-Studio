import { describe, expect, test } from 'bun:test'
import { validateMcpStageResponse } from './stage-response-contract'
import type { ChapterStageResponseContract } from './types'

const proseContracts = [
  'draft_prose',
  'word_target_prose',
  'editor_rewrite_prose',
  'meme_polish_prose',
  'humanize_prose',
  'revision_prose',
] as const satisfies readonly ChapterStageResponseContract[]

const jsonFixtures: Record<
  Exclude<ChapterStageResponseContract, (typeof proseContracts)[number]>,
  object
> = {
  readability_json: { readability_score: 88, passed: true, issues: [], suggestions: [] },
  quality_review_json: { score: 88, publishable: true, findings: [] },
  structured_review_json: {
    continuity_checks: [{
      key: 'continuity',
      label: '连续性',
      status: 'pass',
      evidence: '人物仍在城门',
      fix: '',
      remaining_risk: '',
    }],
  },
  editor_report_json: { passed: true, issues: [], suggestions: [] },
  story_state_json: { state_delta: { current_time: '次日清晨' } },
}

function expectInvalid(
  contract: ChapterStageResponseContract,
  content: string,
  stage: Parameters<typeof validateMcpStageResponse>[0] = 'quality_review',
) {
  expect(() => validateMcpStageResponse(stage, contract, { content })).toThrow(expect.objectContaining({
    code: 'MCP_STAGE_CONTRACT_INVALID',
    details: { stage, response_contract: contract },
  }))
}

describe('MCP stage response contracts', () => {
  for (const contract of proseContracts) {
    test(`accepts non-empty plain prose for ${contract}`, () => {
      expect(validateMcpStageResponse('revision', contract, {
        content: '第一章\n风从城门吹来。',
      })).toEqual({
        content: '第一章\n风从城门吹来。',
        output: '第一章\n风从城门吹来。',
      })
    })
  }

  test('accepts fenced JSON and every supported prose wrapper without rewriting the parsed value', () => {
    const fixtures = [
      { chapter_text: '风从城门吹来。' },
      { chapterText: '风从城门吹来。' },
      { prose_chapters: [{ chapter_text: '风从城门吹来。' }] },
      { proseChapters: [{ chapterText: '风从城门吹来。' }] },
    ]
    for (const payload of fixtures) {
      const response = validateMcpStageResponse('revision', 'revision_prose', {
        content: `\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`\n`,
      })
      expect(response.output).toEqual(payload)
    }
  })

  for (const [contract, payload] of Object.entries(jsonFixtures) as Array<
    [ChapterStageResponseContract, object]
  >) {
    test(`accepts semantic JSON for ${contract}`, () => {
      expect(validateMcpStageResponse('quality_review', contract, {
        content: `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``,
      }).output).toEqual(payload)
    })
  }

  test('accepts supported aliases and valid boundary scores', () => {
    expect(validateMcpStageResponse('readability_review', 'readability_json', {
      content: JSON.stringify({ score: 0, passed: false }),
    }).output).toEqual({ score: 0, passed: false })
    expect(validateMcpStageResponse('quality_review', 'quality_review_json', {
      content: JSON.stringify({ score: 100, publishable: false, blocking_findings: [], advisory_findings: [] }),
    }).output).toEqual({
      score: 100,
      publishable: false,
      blocking_findings: [],
      advisory_findings: [],
    })
    expect(validateMcpStageResponse('story_state_sync', 'story_state_json', {
      content: JSON.stringify({ stateDelta: { nextChapterPriorities: [] } }),
    }).output).toEqual({ stateDelta: { nextChapterPriorities: [] } })
    expect(validateMcpStageResponse('story_state_sync', 'story_state_json', {
      content: JSON.stringify({ progress_summary: { last_completed_chapter: 1 } }),
    }).output).toEqual({ progress_summary: { last_completed_chapter: 1 } })
  })

  test('accepts canonical status-filter receipts with a field-specific boolean verdict', () => {
    const payload = {
      status_filter_receipts: [{
        key: 'previous_injury',
        label: '上一章伤势',
        used_in_chapter: true,
        evidence: '李玄扶着伤臂退到旧码头。',
        excluded_reason: '',
        remaining_risk: '',
      }],
    }

    expect(validateMcpStageResponse('structured_review_fill', 'structured_review_json', {
      content: JSON.stringify(payload),
    }).output).toEqual(payload)
  })

  for (const invalid of ['', '   ', '{}', '普通解释文字', '{"score":"high"}', '[]']) {
    test(`rejects invalid quality contract payload: ${JSON.stringify(invalid)}`, () => {
      expectInvalid('quality_review_json', invalid)
    })
  }

  test('rejects empty or semantically invalid prose values and arrays', () => {
    for (const invalid of [
      '',
      '   ',
      '{}',
      '[]',
      '{"chapter_text":"  "}',
      '{"chapterText":17}',
      '{"prose_chapters":[]}',
      '{"proseChapters":[{"chapterText":""}]}',
    ]) expectInvalid('revision_prose', invalid, 'revision')
  })

  test('rejects invalid readability scores and verdict booleans', () => {
    for (const invalid of [
      { readability_score: -1, passed: true },
      { readability_score: 101, passed: true },
      { readability_score: Number.NaN, passed: true },
      { readability_score: '88', passed: true },
      { readability_score: 88, passed: 'yes' },
      { readability_score: 88 },
    ]) expectInvalid('readability_json', JSON.stringify(invalid), 'readability_review')
  })

  test('rejects invalid quality scores, verdicts, and findings', () => {
    for (const invalid of [
      { score: -1, publishable: true },
      { score: 101, publishable: true },
      { score: '88', publishable: true },
      { score: 88, publishable: 'yes' },
      { score: 88, publishable: true, findings: {} },
      { score: 88, publishable: true, blocking_findings: 'none' },
      { score: 88, publishable: true, advisory_findings: false },
    ]) expectInvalid('quality_review_json', JSON.stringify(invalid))
  })

  test('rejects malformed structured and editor reports', () => {
    for (const invalid of [
      {},
      { passed: true },
      { unrelated: [] },
      { passed: [] },
      { continuity_checks: {} },
      { continuity_checks: [] },
      { continuity_checks: [{}] },
      { continuity_checks: ['pass'] },
    ]) {
      expectInvalid('structured_review_json', JSON.stringify(invalid), 'structured_review_fill')
    }
    for (const invalid of [{}, { passed: 'yes' }, { score: '88' }, { issues: {} }, { suggestions: 'none' }]) {
      expectInvalid('editor_report_json', JSON.stringify(invalid), 'editor_report')
    }
  })

  test('rejects Story State values without a recognized delta field', () => {
    for (const invalid of [
      {},
      { state_delta: {} },
      { stateDelta: { place: '北城门' } },
      { state_delta: [] },
      { state_delta: { unknown_field: true } },
    ]) expectInvalid('story_state_json', JSON.stringify(invalid), 'story_state_sync')
  })

  test('rejects recognized Story State fields with invalid semantic types', () => {
    for (const invalid of [
      { state_delta: { open_questions: false } },
      { state_delta: { next_chapter_priorities: '追查旧印章' } },
      { state_delta: { character_positions: [] } },
      { state_delta: { current_time: ['子时'] } },
      { state_delta: { timeline: {} } },
      { state_delta: { progress_summary: false } },
      { state_delta: { current_time: '子时', open_questions: false } },
    ]) expectInvalid('story_state_json', JSON.stringify(invalid), 'story_state_sync')
  })

  test('accepts supported structured Story State collection and summary variants', () => {
    const payloads = [
      { state_delta: { character_positions: { 李玄: '旧码头' } } },
      { state_delta: { timeline: ['李玄抵达旧码头'] } },
      { state_delta: { timeline: [{ event: '李玄抵达旧码头', source_excerpt: '他踏上旧码头。' }] } },
      { state_delta: { progress_summary: '本章已完成' } },
      { state_delta: { progress_summary: { notes: '下一章继续追查旧印章' } } },
    ]
    for (const payload of payloads) {
      expect(validateMcpStageResponse('story_state_sync', 'story_state_json', {
        content: JSON.stringify(payload),
      }).output).toEqual(payload)
    }
  })

  test('rejects Proxy and accessor responses without executing hostile traps', () => {
    let traps = 0
    let getters = 0
    const proxied = new Proxy({ content: '{"score":88,"publishable":true}' }, {
      get() { traps += 1; throw new Error('hostile get trap') },
      ownKeys() { traps += 1; throw new Error('hostile ownKeys trap') },
      getOwnPropertyDescriptor() { traps += 1; throw new Error('hostile descriptor trap') },
    })
    const accessor = Object.defineProperty({}, 'content', {
      enumerable: true,
      get() { getters += 1; throw new Error('hostile content getter') },
    })

    for (const response of [proxied, accessor]) {
      expect(() => validateMcpStageResponse(
        'quality_review',
        'quality_review_json',
        response as any,
      )).toThrow(expect.objectContaining({ code: 'MCP_STAGE_CONTRACT_INVALID' }))
    }
    expect({ traps, getters }).toEqual({ traps: 0, getters: 0 })
  })
})
