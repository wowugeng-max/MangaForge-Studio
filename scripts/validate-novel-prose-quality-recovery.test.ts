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

function createControlledSseResponse(chunks: string[] = []) {
  const encoder = new TextEncoder()
  const cancellations: unknown[] = []
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
    },
    cancel(reason) {
      cancellations.push(reason)
    },
  })
  const response = new Response(body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  })
  return { body, cancellations, controller, response }
}

function serializeValidationError(error: any) {
  return JSON.stringify({
    message: error?.message,
    status: error?.status,
    error_code: error?.error_code,
    response: sanitizeValidationValue(error?.response),
  })
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

  test('cancels and unlocks an open stream after an early done event', async () => {
    const controlled = createControlledSseResponse([
      'data: {"type":"done","result":{"chapter":{"id":10}}}\n\n',
    ])

    await expect(readProseGenerationSse(controlled.response)).resolves.toMatchObject({ type: 'done' })
    expect(controlled.cancellations).toHaveLength(1)
    expect(controlled.body.locked).toBe(false)
  })

  test('cancels and unlocks an open stream after a parser failure', async () => {
    const controlled = createControlledSseResponse([
      'data: {"type":"done",invalid-json}\n\n',
    ])

    await expect(readProseGenerationSse(controlled.response)).rejects.toMatchObject({
      error_code: 'PROSE_GENERATION_STREAM_INVALID_JSON',
    })
    expect(controlled.cancellations).toHaveLength(1)
    expect(controlled.body.locked).toBe(false)
  })

  test('unlocks the body when an AbortError interrupts a pending read', async () => {
    const controlled = createControlledSseResponse()
    const reading = readProseGenerationSse(controlled.response)
    const abortError = new DOMException('stream aborted', 'AbortError')

    controlled.controller.error(abortError)

    await expect(reading).rejects.toBe(abortError)
    expect(controlled.body.locked).toBe(false)
  })

  test('throws a structured error from an SSE error event', async () => {
    const secrets = ['sk-test-secret', 'provider-test-secret', 'access-test-secret', 'bearer-test-secret']
    const payload = {
      type: 'error',
      error: 'quality gate failed with sk-test-secret',
      error_code: 'QUALITY_GATE_RETRY_REQUIRED',
      context_package: {
        chapter_id: 10,
        provider_message: 'provider_secret=provider-test-secret access_token access-test-secret',
        authorization: 'Bearer bearer-test-secret',
      },
    }
    const controlled = createControlledSseResponse([
      `data: ${JSON.stringify(payload)}\n\n`,
    ])

    try {
      await readProseGenerationSse(controlled.response)
      throw new Error('expected SSE error event to reject')
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error)
      expect(error.status).toBe(200)
      expect(error.error_code).toBe('QUALITY_GATE_RETRY_REQUIRED')
      expect(error.message).toContain('QUALITY_GATE_RETRY_REQUIRED')
      const serialized = serializeValidationError(error)
      for (const secret of secrets) {
        expect(error.message).not.toContain(secret)
        expect(serialized).not.toContain(secret)
      }
      expect(serialized).toContain('QUALITY_GATE_RETRY_REQUIRED')
    }
    expect(controlled.cancellations).toHaveLength(1)
    expect(controlled.body.locked).toBe(false)
  })

  test('does not expose malformed SSE data through parser errors', async () => {
    const secret = 'sk-test-secret'
    const controlled = createControlledSseResponse([
      `data: {"type":"done","api_key":"${secret}"\n\n`,
    ])

    try {
      await readProseGenerationSse(controlled.response)
      throw new Error('expected malformed SSE event to reject')
    } catch (error: any) {
      expect(error.status).toBe(200)
      expect(error.error_code).toBe('PROSE_GENERATION_STREAM_INVALID_JSON')
      expect(error.message).toContain('PROSE_GENERATION_STREAM_INVALID_JSON')
      expect(error.message).not.toContain(secret)
      expect(serializeValidationError(error)).not.toContain(secret)
    }
    expect(controlled.cancellations).toHaveLength(1)
    expect(controlled.body.locked).toBe(false)
  })

  test('fails clearly when the SSE stream ends without a done event', async () => {
    const response = createFragmentedSseResponse([
      ': heartbeat\n\n',
      'data: {"type":"progress","progress":"drafting"}\n\n',
    ])

    await expect(readProseGenerationSse(response)).rejects.toThrow('SSE stream ended before a done event')
    expect(response.body?.locked).toBe(false)
  })

  test('rejects a done frame that is not terminated by a blank delimiter', async () => {
    const response = createFragmentedSseResponse([
      'data: {"type":"done","result":{"chapter":{"id":10}}}',
    ])

    await expect(readProseGenerationSse(response)).rejects.toMatchObject({
      error_code: 'PROSE_GENERATION_STREAM_INCOMPLETE',
    })
    expect(response.body?.locked).toBe(false)
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
    const secrets = ['sk-test-secret', 'provider-test-secret', 'access-test-secret']
    const fetchImpl = (async () => new Response(JSON.stringify({
      error: 'project not found: sk-test-secret',
      error_code: 'PROJECT_NOT_FOUND',
      details: 'provider_secret=provider-test-secret access_token=access-test-secret',
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
      expect(error.message).toContain('HTTP 404')
      expect(error.message).toContain('PROJECT_NOT_FOUND')
      const serialized = serializeValidationError(error)
      for (const secret of secrets) {
        expect(error.message).not.toContain(secret)
        expect(serialized).not.toContain(secret)
      }
      expect(serialized).toContain('PROJECT_NOT_FOUND')
    }
  })

  test('does not expose a non-JSON HTTP error body', async () => {
    const secrets = ['sk-test-secret', 'inline-api-secret']
    const fetchImpl = (async () => new Response(
      'upstream rejected sk-test-secret api_key=inline-api-secret',
      { status: 502, headers: { 'Content-Type': 'text/plain' } },
    )) as typeof fetch

    try {
      await requestProseGenerationSse('/novel/chapters/10/generate-prose', {
        method: 'POST',
        body: JSON.stringify(buildGenerationRequestBody(1, 217)),
      }, fetchImpl)
      throw new Error('expected non-success response to reject')
    } catch (error: any) {
      expect(error.status).toBe(502)
      expect(error.error_code).toBe('PROSE_GENERATION_HTTP_ERROR')
      expect(error.message).toContain('HTTP 502')
      const serialized = serializeValidationError(error)
      for (const secret of secrets) {
        expect(error.message).not.toContain(secret)
        expect(serialized).not.toContain(secret)
      }
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
    const inlineSecrets = [
      'sk-test-secret',
      'inline-api-secret',
      'inline-provider-secret',
      'inline-access-secret',
      'inline-bearer-secret',
    ]
    const sanitized = sanitizeValidationValue({
      model_id: 217,
      api_key: 'secret-key',
      headers: { Authorization: 'Bearer secret-key' },
      provider_secret: 'provider-secret',
      prompt: 'FULL PROMPT',
      nested: {
        result: 'kept',
        message: [
          'upstream sk-test-secret',
          'api_key=inline-api-secret',
          'provider_secret: inline-provider-secret',
          'access_token inline-access-secret',
          'Bearer inline-bearer-secret',
        ].join(' '),
      },
    })
    const text = JSON.stringify(sanitized)

    expect(text).toContain('"model_id":217')
    expect(text).toContain('"result":"kept"')
    expect(text).not.toContain('secret-key')
    expect(text).not.toContain('provider-secret')
    expect(text).not.toContain('FULL PROMPT')
    for (const secret of inlineSecrets) expect(text).not.toContain(secret)
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
