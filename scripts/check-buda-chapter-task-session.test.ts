import { describe, expect, test } from 'bun:test'
import {
  assertAutomaticStageCoverage,
  assertNewTaskSession,
  assertOneTaskSession,
  maskFingerprint,
  maskSessionId,
  parseCliArgs,
  projectRunSummaryList,
  projectSourceAuthority,
  projectStageReceipt,
  requestJson,
} from './check-buda-chapter-task-session.mjs'

const fingerprint = `sha256:${'a'.repeat(64)}`

function receipt(stage: string, overrides: Record<string, unknown> = {}) {
  return {
    task_id: 'task-1',
    stage,
    source: 'mcp',
    source_fingerprint: fingerprint,
    session_id: 'session-1',
    ...overrides,
  }
}

describe('Buda chapter task receipt assertions', () => {
  test('projects one automatic task and Session exactly', () => {
    expect(assertOneTaskSession([
      receipt('draft'),
      receipt('quality_review'),
      receipt('story_state_sync'),
    ])).toEqual({
      task_id: 'task-1',
      source_fingerprint: fingerprint,
      session_id: 'session-1',
    })
  })

  test('rejects empty, incomplete, non-MCP, and inconsistent receipts with one safe error', () => {
    const invalid = [
      [],
      [receipt('draft', { task_id: undefined })],
      [receipt('draft', { stage: undefined })],
      [receipt('draft', { source: undefined })],
      [receipt('draft', { source_fingerprint: undefined })],
      [receipt('draft', { session_id: undefined })],
      [receipt('draft', { source: 'model' })],
      [receipt('draft'), receipt('quality_review', { task_id: 'task-2' })],
      [receipt('draft'), receipt('quality_review', { source_fingerprint: `sha256:${'b'.repeat(64)}` })],
      [receipt('draft'), receipt('quality_review', { session_id: 'session-2' })],
    ]

    for (const candidate of invalid) {
      expect(() => assertOneTaskSession(candidate)).toThrow('invalid chapter task receipts')
    }
  })

  test('requires bounded primitive stages and identifiers', () => {
    const invalid = [
      [receipt('x'.repeat(65))],
      [receipt('draft', { task_id: 'x'.repeat(513) })],
      [receipt('draft', { session_id: 'x'.repeat(513) })],
      [receipt('draft', { source_fingerprint: 'sha256:short' })],
      [receipt('draft', { stage: 1 })],
      [receipt('draft', { task_id: 1 })],
      [receipt('draft', { session_id: 1 })],
    ]

    for (const candidate of invalid) {
      expect(() => assertOneTaskSession(candidate)).toThrow('invalid chapter task receipts')
    }
  })

  test('does not invoke Proxy traps or getters and never reflects hostile receipt text', () => {
    const sentinel = 'PRIVATE_RECEIPT_SENTINEL'
    let getterCalls = 0
    let proxyCalls = 0
    const getterReceipt = Object.create(null)
    Object.defineProperty(getterReceipt, 'task_id', {
      enumerable: true,
      get() {
        getterCalls += 1
        return sentinel
      },
    })
    const proxyReceipt = new Proxy(receipt('draft'), {
      get() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
      getOwnPropertyDescriptor() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
    })

    for (const candidate of [[getterReceipt], [proxyReceipt], new Proxy([receipt('draft')], {})]) {
      try {
        assertOneTaskSession(candidate)
        throw new Error('expected hostile receipt to fail')
      } catch (error: any) {
        expect(error.message).toBe('invalid chapter task receipts')
        expect(JSON.stringify(error)).not.toContain(sentinel)
      }
    }
    expect(getterCalls).toBe(0)
    expect(proxyCalls).toBe(0)
  })

  test('requires the automatic draft, review or repair, and story sync stages', () => {
    const complete = [receipt('draft'), receipt('quality_review'), receipt('story_state_sync')]
    expect(assertAutomaticStageCoverage(complete)).toEqual([
      'draft',
      'quality_review',
      'story_state_sync',
    ])
    expect(() => assertAutomaticStageCoverage([receipt('draft'), receipt('story_state_sync')]))
      .toThrow('automatic task stage coverage failed')
    expect(() => assertAutomaticStageCoverage([receipt('draft'), receipt('quality_repair')]))
      .toThrow('automatic task stage coverage failed')
  })

  test('requires a manual task to use a new task id and Session', () => {
    const manual = [receipt('manual_recheck', { task_id: 'task-2', session_id: 'session-2' })]
    expect(assertNewTaskSession('session-1', manual, 'task-1')).toEqual({
      task_id: 'task-2',
      source_fingerprint: fingerprint,
      session_id: 'session-2',
    })
    expect(assertNewTaskSession('session-1', manual)).toEqual({
      task_id: 'task-2',
      source_fingerprint: fingerprint,
      session_id: 'session-2',
    })
  })

  test('uses the required exact diagnostic when manual work reuses the prior Session', () => {
    const manual = [receipt('manual_recheck', { task_id: 'task-2' })]
    expect(() => assertNewTaskSession('session-1', manual, 'task-1'))
      .toThrow('manual task reused the previous Session')
  })

  test('rejects a reused manual task id without reflecting identifiers', () => {
    const manual = [receipt('manual_recheck', { session_id: 'session-2' })]
    expect(() => assertNewTaskSession('session-1', manual, 'task-1'))
      .toThrow('manual task reused the previous task')
  })
})

describe('Buda smoke input and public receipt projection', () => {
  test('normalizes safe CLI arguments without accepting credentials', () => {
    expect(parseCliArgs([
      '--base-url', 'http://127.0.0.1:8787/api/',
      '--project-id', '12',
      '--chapter-id', '34',
      '--timeout-ms', '900000',
      '--poll-interval-ms', '750',
    ])).toEqual({
      baseUrl: 'http://127.0.0.1:8787',
      projectId: 12,
      chapterId: 34,
      timeoutMs: 900000,
      pollIntervalMs: 750,
    })

    for (const args of [
      ['--base-url', 'http://user:pass@127.0.0.1:8787', '--project-id', '1', '--chapter-id', '2'],
      ['--base-url', 'http://127.0.0.1:8787?key=secret', '--project-id', '1', '--chapter-id', '2'],
      ['--base-url', 'http://127.0.0.1:8787#secret', '--project-id', '1', '--chapter-id', '2'],
      ['--base-url', 'file:///tmp/socket', '--project-id', '1', '--chapter-id', '2'],
      ['--base-url', 'http://127.0.0.1:8787', '--project-id', '0', '--chapter-id', '2'],
      ['--base-url', 'http://127.0.0.1:8787', '--project-id', '1', '--chapter-id', '2', '--api-key', 'secret'],
    ]) {
      expect(() => parseCliArgs(args)).toThrow('invalid smoke arguments')
    }
  })

  test('requires the active MCP authority to be the Buda adapter', () => {
    expect(projectSourceAuthority({
      ok: true,
      source: { active: 'mcp', mcp: { adapter_id: 'buda' } },
      display: { active: 'mcp' },
      fingerprint,
    })).toEqual({ fingerprint })
    expect(() => projectSourceAuthority({
      ok: true,
      source: { active: 'mcp', mcp: { adapter_id: 'generic' } },
      display: { active: 'mcp' },
      fingerprint,
    })).toThrow('active chapter source is not Buda MCP')
  })

  test('projects only bounded stage receipt fields from a public run', () => {
    const projected = projectStageReceipt({
      id: 77,
      project_id: 12,
      run_type: 'chapter_generation_stage',
      step_name: 'quality_review',
      status: 'success',
      input_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1',
        project_id: 12,
        chapter_id: 34,
        stage: 'quality_review',
        source: 'mcp',
        source_fingerprint: fingerprint,
        session_id: 'session-1',
        prompt_hash: `sha256:${'b'.repeat(64)}`,
        prompt: 'must not project',
      }),
      output_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1',
        project_id: 12,
        chapter_id: 34,
        stage: 'quality_review',
        status: 'success',
        source: 'mcp',
        source_fingerprint: fingerprint,
        session_id: 'session-1',
        prose: 'must not project',
      }),
    })

    expect(projected).toEqual({
      run_id: 77,
      task_id: 'task-1',
      project_id: 12,
      chapter_id: 34,
      stage: 'quality_review',
      status: 'success',
      source: 'mcp',
      source_fingerprint: fingerprint,
      session_id: 'session-1',
    })
    expect(JSON.stringify(projected)).not.toContain('must not project')
  })

  test('accepts bounded primitive Unicode labels in unrelated public run summaries', () => {
    expect(projectRunSummaryList([{
      id: 9,
      project_id: 12,
      run_type: 'story_state',
      step_name: '第一章状态同步',
      status: 'success',
      chapter_id: null,
    }])).toEqual([{
      id: 9,
      project_id: 12,
      run_type: 'story_state',
      step_name: '第一章状态同步',
      status: 'success',
      chapter_id: null,
    }])
    expect(() => projectRunSummaryList([{
      id: 9,
      project_id: 12,
      run_type: 'story_state',
      step_name: '章'.repeat(129),
      status: 'success',
      chapter_id: null,
    }])).toThrow('invalid run summaries')
  })

  test('rejects malformed and hostile run projections with a fixed safe error', () => {
    const sentinel = 'PRIVATE_RUN_SENTINEL'
    let getterCalls = 0
    const hostile = Object.create(null)
    Object.defineProperty(hostile, 'id', {
      get() {
        getterCalls += 1
        return sentinel
      },
    })
    const malformed = {
      id: 77,
      project_id: 12,
      run_type: 'chapter_generation_stage',
      step_name: 'draft',
      status: 'success',
      input_ref: '{invalid',
      output_ref: JSON.stringify({ receipt_authority: 'chapter_generation_stage_v1' }),
    }

    for (const candidate of [hostile, new Proxy(malformed, {}), malformed]) {
      try {
        projectStageReceipt(candidate)
        throw new Error('expected run projection to fail')
      } catch (error: any) {
        expect(error.message).toBe('invalid chapter stage receipt')
        expect(JSON.stringify(error)).not.toContain(sentinel)
      }
    }
    expect(getterCalls).toBe(0)
  })

  test('masks fingerprints and hashes Session ids before display', () => {
    expect(maskFingerprint(fingerprint)).toBe('sha256:aaaaaa…')
    const maskedSession = maskSessionId('session-private-value')
    expect(maskedSession).toMatch(/^sha256:[0-9a-f]{6}…$/)
    expect(maskedSession).not.toContain('session-private-value')
  })
})

describe('Buda smoke HTTP transport', () => {
  test('keeps the deadline active while reading a stalled response body', async () => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>
    const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
          init?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('private timeout detail', 'AbortError'))
          }, { once: true })
        },
      })
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch

    const result = await Promise.race([
      requestJson('http://127.0.0.1:8787', '/api/stalled', undefined, Date.now() + 25, fetchImpl)
        .then(() => ({ outcome: 'resolved' }), (error: any) => ({
          outcome: 'rejected',
          message: error?.message,
          code: error?.code,
        })),
      new Promise(resolve => setTimeout(() => resolve({ outcome: 'hung' }), 150)),
    ])
    if ((result as any).outcome === 'hung') streamController.error(new Error('test cleanup'))

    expect(result).toEqual({
      outcome: 'rejected',
      message: 'request timeout',
      code: 'REQUEST_TIMEOUT',
    })
  })

  test('reports only HTTP status and a bounded safe code on failure', async () => {
    const sentinel = 'PRIVATE_PROVIDER_SENTINEL'
    const fetchImpl = (async () => new Response(JSON.stringify({
      error: sentinel,
      detail: sentinel,
      error_code: 'PROVIDER_DOWN',
    }), { status: 502, headers: { 'Content-Type': 'application/json' } })) as typeof fetch

    const error = await requestJson(
      'http://127.0.0.1:8787',
      '/api/failure',
      undefined,
      Date.now() + 1000,
      fetchImpl,
    ).then(() => null, caught => caught)

    expect(error?.message).toBe('HTTP 502 (PROVIDER_DOWN)')
    expect(error?.code).toBe('PROVIDER_DOWN')
    expect(JSON.stringify(error)).not.toContain(sentinel)
  })

  test('rejects an oversized response without reflecting its body', async () => {
    const sentinel = 'PRIVATE_OVERSIZED_SENTINEL'
    const fetchImpl = (async () => new Response(sentinel, {
      status: 200,
      headers: { 'Content-Length': String(2 * 1024 * 1024 + 1) },
    })) as typeof fetch

    const error = await requestJson(
      'http://127.0.0.1:8787',
      '/api/oversized',
      undefined,
      Date.now() + 1000,
      fetchImpl,
    ).then(() => null, caught => caught)

    expect(error?.message).toBe('HTTP response too large')
    expect(error?.code).toBe('HTTP_RESPONSE_TOO_LARGE')
    expect(JSON.stringify(error)).not.toContain(sentinel)
  })
})
