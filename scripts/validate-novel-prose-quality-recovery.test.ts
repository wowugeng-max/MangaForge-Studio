import { describe, expect, test } from 'bun:test'
import {
  buildBlindScoreInputs,
  buildGenerationRequestBody,
  evaluateBlindScoreThresholds,
  hasChapterNinePursuitHandoff,
  readProseGenerationSse,
  requestProseGenerationSse,
  sanitizeValidationValue,
} from './validate-novel-prose-quality-recovery'

const dimensions = [
  'opening_hook',
  'causal_progress',
  'protagonist_agency',
  'conflict_payoff',
  'continuity',
  'prose_naturalness',
  'ending_hook',
]

function createFragmentedSseResponse(chunks: string[], init: ResponseInit = {}) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'text/event-stream; charset=utf-8')
  return new Response(body, { ...init, headers })
}

describe('novel prose validation SSE transport', () => {
  test('parses fragmented heartbeat, progress, and multiline done frames', async () => {
    const response = createFragmentedSseResponse([
      ': heart',
      'beat\r\n\r',
      '\nevent: message\r\n',
      'data: {"type":"pro',
      'gress","progress":"drafting"}\r\n\r\n',
      'data: {"type":"done",\r\n',
      'data: "result":{"chapter":{"id":10},',
      '"quality_loop":{"decision":{"passed":true}}}}\n',
      '\n',
    ])

    await expect(readProseGenerationSse(response)).resolves.toEqual({
      type: 'done',
      result: {
        chapter: { id: 10 },
        quality_loop: { decision: { passed: true } },
      },
    })
  })

  test('throws a structured error from an SSE error event', async () => {
    const payload = {
      type: 'error',
      error: 'quality gate failed',
      error_code: 'QUALITY_GATE_RETRY_REQUIRED',
      context_package: { chapter_id: 10 },
    }
    const response = createFragmentedSseResponse([
      'data: {"type":"error","error":"quality gate ',
      'failed","error_code":"QUALITY_GATE_RETRY_REQUIRED",',
      '"context_package":{"chapter_id":10}}\n\n',
    ])

    try {
      await readProseGenerationSse(response)
      throw new Error('expected SSE error event to reject')
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('quality gate failed')
      expect(error.error_code).toBe('QUALITY_GATE_RETRY_REQUIRED')
      expect(error.response).toEqual(payload)
    }
  })

  test('fails clearly when the SSE stream ends without a done event', async () => {
    const response = createFragmentedSseResponse([
      ': heartbeat\n\n',
      'data: {"type":"progress","progress":"drafting"}\n\n',
    ])

    await expect(readProseGenerationSse(response)).rejects.toThrow('SSE stream ended before a done event')
  })

  test('requests the generation endpoint with the SSE transport contract', async () => {
    const calls: Array<{ input: string | URL | Request, init?: RequestInit }> = []
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init })
      return createFragmentedSseResponse([
        'data: {"type":"done","result":{"chapter":{"id":10}}}\n\n',
      ])
    }) as typeof fetch
    const body = buildGenerationRequestBody(1, 217)

    const result = await requestProseGenerationSse('/novel/chapters/10/generate-prose', {
      method: 'POST',
      body: JSON.stringify(body),
    }, fetchImpl)

    expect(calls).toHaveLength(1)
    const requestUrl = new URL(String(calls[0].input))
    const headers = new Headers(calls[0].init?.headers)
    expect(requestUrl.pathname).toBe('/api/novel/chapters/10/generate-prose')
    expect(requestUrl.searchParams.get('stream')).toBe('1')
    expect(headers.get('Accept')).toBe('text/event-stream')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(body)
    expect(result).toEqual({ type: 'done', result: { chapter: { id: 10 } } })
  })

  test('preserves structured details for non-success HTTP responses', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({
      error: 'project not found',
      error_code: 'PROJECT_NOT_FOUND',
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch

    try {
      await requestProseGenerationSse('/novel/chapters/10/generate-prose', {
        method: 'POST',
        body: JSON.stringify(buildGenerationRequestBody(1, 217)),
      }, fetchImpl)
      throw new Error('expected non-success response to reject')
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error)
      expect(error.status).toBe(404)
      expect(error.error_code).toBe('PROJECT_NOT_FOUND')
      expect(error.response).toEqual({
        error: 'project not found',
        error_code: 'PROJECT_NOT_FOUND',
      })
    }
  })
})

describe('novel prose quality recovery thresholds', () => {
  test('accepts candidate within baseline quality tolerances', () => {
    const baseline = dimensions.map(dimension => ({ dimension, scores: [8, 8, 7, 8, 8, 8] }))
    const candidate = dimensions.map(dimension => ({ dimension, scores: [7.5, 8] }))
    const result = evaluateBlindScoreThresholds(baseline, candidate, [true, true])

    expect(result.overall_delta).toBeGreaterThanOrEqual(-0.5)
    expect(result.dimension_failures).toEqual([])
    expect(result.publishable_pass).toBe(true)
    expect(result.passed).toBe(true)
  })

  test('rejects a candidate below one dimension floor', () => {
    const baseline = dimensions.map(dimension => ({ dimension, scores: [8, 8, 7, 8, 8, 8] }))
    const candidate = dimensions.map(dimension => ({
      dimension,
      scores: dimension === 'continuity' ? [5, 5] : [8, 8],
    }))
    const result = evaluateBlindScoreThresholds(baseline, candidate, [true, true])

    expect(result.dimension_failures.map(item => item.dimension)).toEqual(['continuity'])
    expect(result.passed).toBe(false)
  })

  test('requires two publishable blind reviews', () => {
    const baseline = dimensions.map(dimension => ({ dimension, scores: [8, 8, 7, 8, 8, 8] }))
    const candidate = dimensions.map(dimension => ({ dimension, scores: [8, 8] }))

    expect(evaluateBlindScoreThresholds(baseline, candidate, [true]).passed).toBe(false)
    expect(evaluateBlindScoreThresholds(baseline, candidate, [true, false]).passed).toBe(false)
  })

  test('maps two shuffled blind reviews into six baseline and two candidate scores', () => {
    const makeSamples = (order: number[]) => order.map((chapterNo, index) => ({
      label: ['A', 'B', 'C', 'D'][index],
      scores: Object.fromEntries(dimensions.map(dimension => [dimension, chapterNo === 10 ? 8 : 7])),
      evidence: Object.fromEntries(dimensions.map(dimension => [dimension, `第${chapterNo}章证据`])),
      publishable: true,
      materially_below_publishable_baseline: false,
    }))
    const inputs = buildBlindScoreInputs([
      { order: [10, 1, 3, 2], payload: { samples: makeSamples([10, 1, 3, 2]) } },
      { order: [2, 10, 1, 3], payload: { samples: makeSamples([2, 10, 1, 3]) } },
    ])

    expect(inputs.baseline.every(row => row.scores.length === 6)).toBe(true)
    expect(inputs.candidate.every(row => row.scores.length === 2)).toBe(true)
    expect(inputs.publishable_checks).toEqual([true, true])
  })

  test('requires a shared character and pursuit state for the chapter handoff', () => {
    const tail = '江澈听见追兵合围，顾遥守住最后一条退路。'

    expect(hasChapterNinePursuitHandoff(tail, '江澈撞开包围最薄的一角。', ['江澈', '顾遥'])).toBe(true)
    expect(hasChapterNinePursuitHandoff(tail, '陌生人撞开包围最薄的一角。', ['江澈', '顾遥'])).toBe(false)
    expect(hasChapterNinePursuitHandoff(tail, '江澈走进一间安静的房子。', ['江澈', '顾遥'])).toBe(false)
  })

  test('removes provider secrets and full prompt fields from validation reports', () => {
    const sanitized = sanitizeValidationValue({
      model_id: 217,
      api_key: 'secret-key',
      headers: { Authorization: 'Bearer secret-key' },
      provider_secret: 'provider-secret',
      prompt: 'FULL PROMPT',
      nested: { result: 'kept' },
    })
    const text = JSON.stringify(sanitized)

    expect(text).toContain('"model_id":217')
    expect(text).toContain('"result":"kept"')
    expect(text).not.toContain('secret-key')
    expect(text).not.toContain('provider-secret')
    expect(text).not.toContain('FULL PROMPT')
  })

  test('builds the real generation request without incomplete or approval overrides', () => {
    const body = buildGenerationRequestBody(1, 217)

    expect(body).toEqual({
      project_id: 1,
      model_id: 217,
      auto_repair_missing_material: true,
      auto_repair_quality_gate: true,
    })
    expect('allow_incomplete' in body).toBe(false)
    expect('approvals' in body).toBe(false)
  })
})
