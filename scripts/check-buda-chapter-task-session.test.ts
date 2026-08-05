import { describe, expect, spyOn, test } from 'bun:test'
import {
  assertAutomaticStageCoverage,
  assertNewTaskSession,
  assertOneTaskSession,
  driveAutomaticRunToSuccess,
  main,
  maskFingerprint,
  maskSessionId,
  parseCliArgs,
  projectChapter,
  projectQuarantineList,
  projectRunRecoveryState,
  projectRunSummaryList,
  projectSourceAuthority,
  projectStageReceipt,
  projectStoryState,
  requestJson,
} from './check-buda-chapter-task-session.mjs'

const fingerprint = `sha256:${'a'.repeat(64)}`
const otherFingerprint = `sha256:${'b'.repeat(64)}`

const providerIdentity = {
  server_id: 'buda',
  key_id: 7,
  adapter_id: 'buda',
  agent_id: 'agent-1',
  model: 'MCP Auto',
}

function receipt(stage: string, overrides: Record<string, unknown> = {}) {
  return {
    task_id: 'task-1',
    stage,
    source: 'mcp',
    source_fingerprint: fingerprint,
    authority_fingerprint: fingerprint,
    session_id: 'session-1',
    ...providerIdentity,
    ...overrides,
  }
}

function sourceView(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: { model_id: 217 },
      mcp: { ...providerIdentity, model: '' },
    },
    display: { active: 'mcp', model_id: 217, mcp: { ...providerIdentity, model: '' } },
    fingerprint,
    locked: false,
    ...overrides,
  }
}

function stageRun(
  id: number,
  stage: string,
  taskId: string,
  sessionId: string,
  overrides: Record<string, unknown> = {},
) {
  const common = {
    receipt_authority: 'chapter_generation_stage_v1',
    task_id: taskId,
    project_id: 12,
    chapter_id: 34,
    stage,
    source: 'mcp',
    source_fingerprint: fingerprint,
    authority_fingerprint: fingerprint,
    session_id: sessionId,
    ...providerIdentity,
    ...overrides,
  }
  return {
    id,
    project_id: 12,
    chapter_id: 34,
    run_type: 'chapter_generation_stage',
    step_name: stage,
    status: 'success',
    input_ref: JSON.stringify(common),
    output_ref: JSON.stringify({ ...common, status: 'success' }),
  }
}

function recoveryRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'ready',
    output_ref: recoveryOutput(),
    ...overrides,
  }
}

function recoveryOutput(
  groupOverrides: Record<string, unknown> = {},
  chapterOverrides: Record<string, unknown> = {},
) {
  return JSON.stringify({
    current_index: 0,
    chapters: [{
      id: 34,
      status: 'ready',
      attempts: 1,
      next_run_at: '2026-08-05T12:34:56.000Z',
      error_message: 'PRIVATE_REMOTE_ERROR_SENTINEL',
      session_id: 'PRIVATE_REMOTE_SESSION_SENTINEL',
      provider_text: 'PRIVATE_REMOTE_PROVIDER_SENTINEL',
      ...chapterOverrides,
    }],
    ...groupOverrides,
  })
}

function automaticDriver(options: {
  states: Array<Record<string, unknown>>
  quarantines?: Array<unknown[]>
  now?: number
}) {
  const states = [...options.states]
  const terminalFallback = options.states.at(-1)
  const quarantines = [...(options.quarantines || [[]])]
  let now = options.now ?? Date.parse('2026-08-05T01:00:00.000Z')
  let executions = 1
  let runReads = 0
  let quarantineChecks = 0
  const waits: number[] = []
  return {
    get executions() { return executions },
    get runReads() { return runReads },
    get quarantineChecks() { return quarantineChecks },
    waits,
    now: () => now,
    wait: async (milliseconds: number) => {
      waits.push(milliseconds)
      now += milliseconds
    },
    readRun: async () => {
      runReads += 1
      return states.shift() || terminalFallback
    },
    executeRun: async () => { executions += 1 },
    assertNoQuarantine: async () => {
      quarantineChecks += 1
      return projectQuarantineList(quarantines.shift() || [])
    },
  }
}

function deterministicSmokeFetch(options: {
  automaticReceiptOverrides?: Record<string, unknown>
  automaticStates?: Array<Record<string, unknown>>
  quarantineReads?: Array<unknown[]>
} = {}) {
  const calls: string[] = []
  const automaticExecuteBodies: unknown[] = []
  let chapterReads = 0
  let summaryReads = 0
  const automaticRuns = [
    stageRun(201, 'draft', 'task-auto', 'session-auto', options.automaticReceiptOverrides),
    stageRun(202, 'quality_review', 'task-auto', 'session-auto'),
    stageRun(203, 'story_state_sync', 'task-auto', 'session-auto'),
  ]
  const manualRun = stageRun(204, 'manual_recheck', 'task-manual', 'session-manual')
  const defaultAutomaticTerminal = {
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'success',
  }
  const automaticStates = [...(options.automaticStates || [defaultAutomaticTerminal])]
  const automaticTerminalFallback = automaticStates.at(-1) || defaultAutomaticTerminal
  const quarantineReads = [...(options.quarantineReads || [[]])]
  const details = new Map([...automaticRuns, manualRun].map(run => [run.id, run]))
  const summaries = (runs: ReturnType<typeof stageRun>[]) => runs.map(run => ({
    id: run.id,
    project_id: run.project_id,
    chapter_id: run.chapter_id,
    run_type: run.run_type,
    step_name: run.step_name,
    status: run.status,
  }))
  const json = (value: unknown) => new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    const path = `${url.pathname}${url.search}`
    const method = init?.method || 'GET'
    calls.push(`${method}:${path}`)

    if (path === '/api/novel/projects/12/chapter-generation-source') return json(sourceView())
    if (path === '/api/novel/chapters/34?project_id=12') {
      chapterReads += 1
      return json({
        id: 34,
        project_id: 12,
        chapter_no: 9,
        chapter_text: chapterReads === 1 ? '' : '风从城门吹来。',
      })
    }
    if (path === '/api/novel/runs?project_id=12&view=summary&limit=1000') {
      summaryReads += 1
      if (summaryReads === 1) return json([])
      if (summaryReads <= 3) return json(summaries(automaticRuns))
      return json(summaries([...automaticRuns, manualRun]))
    }
    if (path === '/api/novel/projects/12/chapter-groups/start' && method === 'POST') {
      return json({
        ok: true,
        run: { id: 200, project_id: 12, run_type: 'chapter_group_generation' },
        group: { chapter_ids: [34] },
      })
    }
    if (path === '/api/novel/projects/12/chapter-groups/200/execute' && method === 'POST') {
      automaticExecuteBodies.push(JSON.parse(String(init?.body || 'null')))
      return json({ ok: true })
    }
    if (path === '/api/novel/runs/200?project_id=12') {
      return json(automaticStates.shift() || automaticTerminalFallback)
    }
    const detailMatch = path.match(/^\/api\/novel\/runs\/(\d+)\?project_id=12$/)
    if (detailMatch) return json(details.get(Number(detailMatch[1])))
    if (path === '/api/novel/chapters/34/prose-quality' && method === 'POST') {
      return json({ ok: true })
    }
    if (path === '/api/mcp/quarantines') return json(quarantineReads.shift() || [])
    if (path === '/api/novel/projects/12') {
      return json({ id: 12, reference_config: { story_state: { last_updated_chapter: 9 } } })
    }
    return new Response(JSON.stringify({ error_code: 'UNEXPECTED_TEST_ROUTE' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  return { calls, automaticExecuteBodies, fetchImpl }
}

async function runSmokeScenario(scenario: ReturnType<typeof deterministicSmokeFetch>) {
  const logs: string[] = []
  const errors: string[] = []
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(scenario.fetchImpl)
  const logSpy = spyOn(console, 'log').mockImplementation(value => { logs.push(String(value)) })
  const errorSpy = spyOn(console, 'error').mockImplementation(value => { errors.push(String(value)) })
  try {
    const exitCode = await main([
      '--base-url', 'http://127.0.0.1:8787',
      '--project-id', '12',
      '--chapter-id', '34',
      '--timeout-ms', '10000',
      '--poll-interval-ms', '100',
    ])
    return { exitCode, logs, errors }
  } finally {
    errorSpy.mockRestore()
    logSpy.mockRestore()
    fetchSpy.mockRestore()
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
      authority_fingerprint: fingerprint,
      session_id: 'session-1',
      ...providerIdentity,
    })
  })

  test('requires one provider identity and both fingerprints for the automatic chain', () => {
    const receipts = [
      receipt('draft'),
      receipt('quality_review'),
      receipt('quality_repair'),
      receipt('story_state_sync'),
    ]
    expect(assertOneTaskSession(receipts)).toMatchObject({
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      ...providerIdentity,
    })

    for (const overrides of [
      { authority_fingerprint: undefined },
      { server_id: undefined },
      { key_id: undefined },
      { key_id: 0 },
      { adapter_id: undefined },
      { agent_id: undefined },
      { model: undefined },
    ]) {
      expect(() => assertOneTaskSession([receipt('draft', overrides)]))
        .toThrow('invalid chapter task receipts')
    }

    for (const overrides of [
      { authority_fingerprint: otherFingerprint },
      { server_id: 'other-server' },
      { key_id: 8 },
      { adapter_id: 'generic' },
      { agent_id: 'agent-2' },
      { model: 'Other Model' },
    ]) {
      expect(() => assertOneTaskSession([receipt('draft'), receipt('story_state_sync', overrides)]))
        .toThrow('invalid chapter task receipts')
    }
  })

  test('rejects empty, incomplete, non-MCP, and inconsistent receipts with one safe error', () => {
    const invalid = [
      [],
      [receipt('draft', { task_id: undefined })],
      [receipt('draft', { stage: undefined })],
      [receipt('draft', { source: undefined })],
      [receipt('draft', { source_fingerprint: undefined })],
      [receipt('draft', { authority_fingerprint: undefined })],
      [receipt('draft', { session_id: undefined })],
      [receipt('draft', { source: 'model' })],
      [receipt('draft'), receipt('quality_review', { task_id: 'task-2' })],
      [receipt('draft'), receipt('quality_review', { source_fingerprint: `sha256:${'b'.repeat(64)}` })],
      [receipt('draft'), receipt('quality_review', { authority_fingerprint: otherFingerprint })],
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
      [receipt('draft', { authority_fingerprint: 'sha256:short' })],
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
      authority_fingerprint: fingerprint,
      session_id: 'session-2',
      ...providerIdentity,
    })
    expect(assertNewTaskSession('session-1', manual)).toEqual({
      task_id: 'task-2',
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      session_id: 'session-2',
      ...providerIdentity,
    })
  })

  test('keeps authority and provider identity while manual work gets a new task and Session', () => {
    const automatic = assertOneTaskSession([
      receipt('draft'),
      receipt('quality_review'),
      receipt('story_state_sync'),
    ])
    const manual = assertNewTaskSession('session-1', [
      receipt('manual_recheck', { task_id: 'task-2', session_id: 'session-2' }),
    ], 'task-1')

    expect(manual.task_id).not.toBe(automatic.task_id)
    expect(manual.session_id).not.toBe(automatic.session_id)
    expect({ ...manual, task_id: undefined, session_id: undefined }).toEqual({
      ...automatic,
      task_id: undefined,
      session_id: undefined,
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
    expect(projectSourceAuthority(sourceView())).toEqual({
      fingerprint,
      locked: false,
      ...providerIdentity,
    })
    expect(() => projectSourceAuthority(sourceView({
      source: { active: 'mcp', mcp: { ...providerIdentity, adapter_id: 'generic' } },
    }))).toThrow('active chapter source is not Buda MCP')
  })

  test('requires released project source and no unresolved quarantine', () => {
    expect(projectSourceAuthority(sourceView({ locked: false }))).toMatchObject({
      locked: false,
      fingerprint,
      ...providerIdentity,
    })
    expect(() => projectSourceAuthority(sourceView({ locked: true })))
      .toThrow('chapter source remains locked')
    expect(() => projectSourceAuthority(sourceView({ locked: undefined })))
      .toThrow('chapter source remains locked')

    expect(projectQuarantineList([])).toEqual([])
    expect(() => projectQuarantineList([{
      id: 'quarantine-1',
      server_id: 'private-server',
      key_id: 7,
      agent_id: 'private-agent',
      session_id: 'private-session',
    }])).toThrow('unresolved MCP quarantine remains')
    expect(() => projectQuarantineList(new Proxy([], {})))
      .toThrow('invalid quarantine list')
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
        authority_fingerprint: fingerprint,
        session_id: 'session-1',
        ...providerIdentity,
        prompt_hash: `sha256:${'b'.repeat(64)}`,
        prompt: 'must not project',
        server_url: 'https://must-not-project.invalid',
        headers: { Authorization: 'must not project' },
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
        authority_fingerprint: fingerprint,
        session_id: 'session-1',
        ...providerIdentity,
        prose: 'must not project',
        raw_output: 'must not project',
        key: 'must not project',
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
      authority_fingerprint: fingerprint,
      session_id: 'session-1',
      ...providerIdentity,
    })
    expect(JSON.stringify(projected)).not.toContain('must not project')
  })

  test('projects only the safe automatic recovery fields', () => {
    const projected = projectRunRecoveryState(recoveryRun(), 200, 12, 34)

    expect(projected).toEqual({
      id: 200,
      project_id: 12,
      run_type: 'chapter_group_generation',
      status: 'ready',
      chapter_id: 34,
      attempts: 1,
      next_run_at: '2026-08-05T12:34:56.000Z',
      next_run_at_ms: Date.parse('2026-08-05T12:34:56.000Z'),
    })
    expect(JSON.stringify(projected)).not.toContain('PRIVATE_REMOTE')
    expect(projected).not.toHaveProperty('error_message')
    expect(projected).not.toHaveProperty('session_id')
  })

  test('rejects malformed parent, chapter, attempt, index, and retry date state', () => {
    const invalid = [
      recoveryRun({ id: 201 }),
      recoveryRun({ project_id: 13 }),
      recoveryRun({ run_type: 'chapter_generation_stage' }),
      recoveryRun({ status: 'running' }),
      recoveryRun({ output_ref: recoveryOutput({}, { id: 35 }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { status: 'failed' }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { attempts: -1 }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { attempts: 1.5 }) }),
      recoveryRun({ output_ref: recoveryOutput({ current_index: 1 }) }),
      recoveryRun({ output_ref: recoveryOutput({ chapters: [] }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { next_run_at: '' }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { next_run_at: 'not-a-date' }) }),
      recoveryRun({ output_ref: recoveryOutput({}, { next_run_at: '2026-08-05T12:34:56Z' }) }),
    ]

    for (const candidate of invalid) {
      try {
        projectRunRecoveryState(candidate, 200, 12, 34)
        throw new Error('expected invalid recovery state to fail')
      } catch (error: any) {
        expect(error.message).toBe('invalid automatic recovery state')
        expect(error.code).toBe('INVALID_RUN_RECOVERY_STATE')
      }
    }
  })

  test('rejects recovery attempt regression', () => {
    try {
      projectRunRecoveryState(recoveryRun(), 200, 12, 34, 2)
      throw new Error('expected recovery attempt regression to fail')
    } catch (error: any) {
      expect(error.message).toBe('invalid automatic recovery state')
      expect(error.code).toBe('INVALID_RUN_RECOVERY_STATE')
    }
  })

  test('does not invoke recovery output accessors or top-level Proxy traps', () => {
    const sentinel = 'PRIVATE_RECOVERY_PROJECTION_SENTINEL'
    let getterCalls = 0
    let proxyCalls = 0
    const hostileOutput = recoveryRun()
    Object.defineProperty(hostileOutput, 'output_ref', {
      get() {
        getterCalls += 1
        throw new Error(sentinel)
      },
    })
    const hostileRun = new Proxy(recoveryRun(), {
      get() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
      getOwnPropertyDescriptor() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
    })

    for (const candidate of [hostileOutput, hostileRun]) {
      try {
        projectRunRecoveryState(candidate, 200, 12, 34)
        throw new Error('expected hostile recovery state to fail')
      } catch (error: any) {
        expect(error.message).toBe('invalid automatic recovery state')
        expect(error.code).toBe('INVALID_RUN_RECOVERY_STATE')
        expect(JSON.stringify(error)).not.toContain(sentinel)
      }
    }
    expect(getterCalls).toBe(0)
    expect(proxyCalls).toBe(0)
  })

  test('merges safe provider identity split across stage input and output', () => {
    const projected = projectStageReceipt({
      id: 78,
      project_id: 12,
      run_type: 'chapter_generation_stage',
      step_name: 'story_state_sync',
      status: 'success',
      input_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1',
        project_id: 12,
        chapter_id: 34,
        stage: 'story_state_sync',
        source: 'mcp',
        source_fingerprint: fingerprint,
        authority_fingerprint: fingerprint,
        server_id: 'buda',
        key_id: 7,
      }),
      output_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1',
        project_id: 12,
        chapter_id: 34,
        stage: 'story_state_sync',
        status: 'success',
        source: 'mcp',
        session_id: 'session-1',
        adapter_id: 'buda',
        agent_id: 'agent-1',
        model: 'MCP Auto',
      }),
    })

    expect(projected).toMatchObject({
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      session_id: 'session-1',
      ...providerIdentity,
    })
  })

  test('rejects missing or mismatched authority and any model receipt after the baseline', () => {
    const projectedStageRun = (inputOverrides: Record<string, unknown> = {}, outputOverrides: Record<string, unknown> = {}) => ({
      id: 79,
      project_id: 12,
      run_type: 'chapter_generation_stage',
      step_name: 'draft',
      status: 'success',
      input_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1', project_id: 12, chapter_id: 34, stage: 'draft',
        source: 'mcp', source_fingerprint: fingerprint, authority_fingerprint: fingerprint,
        session_id: 'session-1', ...providerIdentity, ...inputOverrides,
      }),
      output_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1', project_id: 12, chapter_id: 34, stage: 'draft', status: 'success',
        source: 'mcp', source_fingerprint: fingerprint, authority_fingerprint: fingerprint,
        session_id: 'session-1', ...providerIdentity, ...outputOverrides,
      }),
    })

    expect(() => projectStageReceipt(projectedStageRun(
      { authority_fingerprint: undefined },
      { authority_fingerprint: undefined },
    )))
      .toThrow('invalid chapter stage receipt')
    expect(() => projectStageReceipt(projectedStageRun({}, { authority_fingerprint: otherFingerprint })))
      .toThrow('invalid chapter stage receipt')
    expect(() => projectStageReceipt(projectedStageRun({ source: 'model' }, { source: 'model' })))
      .toThrow('invalid chapter stage receipt')
    expect(() => projectStageReceipt(projectedStageRun({}, { agent_id: 'agent-2' })))
      .toThrow('invalid chapter stage receipt')

    const mismatchedRunStatus = stageRun(80, 'draft', 'task-1', 'session-1')
    mismatchedRunStatus.status = 'failed'
    expect(() => projectStageReceipt(mismatchedRunStatus))
      .toThrow('invalid chapter stage receipt')
  })

  test('requires non-empty accepted prose and Story State advancement', () => {
    expect(projectChapter({
      id: 34,
      project_id: 12,
      chapter_no: 9,
      chapter_text: '风从城门吹来。',
    }, 12, 34)).toEqual({
      id: 34,
      project_id: 12,
      chapter_no: 9,
      has_prose: true,
    })
    expect(projectChapter({
      id: 34,
      project_id: 12,
      chapter_no: 9,
      chapter_text: ' \n\t ',
    }, 12, 34).has_prose).toBe(false)

    expect(projectStoryState({
      id: 12,
      reference_config: { story_state: { last_updated_chapter: 9 } },
    }, 9)).toEqual({ last_updated_chapter: 9 })
    expect(() => projectStoryState({
      id: 12,
      reference_config: { story_state: { last_updated_chapter: 8 } },
    }, 9)).toThrow('Story State did not advance')
    expect(() => projectStoryState({
      id: 12,
      reference_config: { story_state: { last_updated_chapter: 0 } },
    }, 9)).toThrow('Story State did not advance')
  })

  test('does not invoke accessors or Proxy traps in source, chapter, or Story State projections', () => {
    const sentinel = 'PRIVATE_TERMINAL_PROJECTION_SENTINEL'
    let getterCalls = 0
    let proxyCalls = 0
    const hostileBinding = new Proxy({ ...providerIdentity }, {
      get() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
      getOwnPropertyDescriptor() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
    })
    const hostileProject = Object.create(null)
    Object.defineProperty(hostileProject, 'reference_config', {
      get() {
        getterCalls += 1
        throw new Error(sentinel)
      },
    })
    const hostileChapter = Object.create(null)
    Object.defineProperty(hostileChapter, 'chapter_text', {
      get() {
        getterCalls += 1
        throw new Error(sentinel)
      },
    })

    for (const operation of [
      () => projectSourceAuthority(sourceView({
        source: { active: 'mcp', mcp: hostileBinding },
      })),
      () => projectStoryState(hostileProject, 9),
      () => projectChapter(hostileChapter, 12, 34),
    ]) {
      try {
        operation()
        throw new Error('expected hostile projection to fail')
      } catch (error: any) {
        expect(JSON.stringify(error)).not.toContain(sentinel)
      }
    }
    expect(getterCalls).toBe(0)
    expect(proxyCalls).toBe(0)
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

describe('Buda smoke automatic run recovery', () => {
  test('returns after direct success without replay or waiting', async () => {
    const driver = automaticDriver({ states: [{
      id: 200,
      project_id: 12,
      run_type: 'chapter_group_generation',
      status: 'success',
    }] })

    const result = await driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })

    expect(result).toMatchObject({ status: 'success', executions: 1 })
    expect(driver.executions).toBe(1)
    expect(driver.waits).toEqual([])
  })

  test('waits for next_run_at, revalidates, and executes the original run once', async () => {
    const futureReady = recoveryRun({
      output_ref: recoveryOutput({}, {
        attempts: 1,
        next_run_at: '2026-08-05T01:02:00.000Z',
      }),
    })
    const driver = automaticDriver({
      states: [
        futureReady,
        futureReady,
        recoveryRun({ status: 'success', output_ref: undefined }),
      ],
    })

    const result = await driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })

    expect(result).toMatchObject({ status: 'success', executions: 2 })
    expect(driver.waits).toEqual([120_000])
    expect(driver.executions).toBe(2)
  })

  test('rechecks quarantine after waiting and stops before replay', async () => {
    const futureReady = recoveryRun({
      output_ref: recoveryOutput({}, {
        attempts: 1,
        next_run_at: '2026-08-05T01:02:00.000Z',
      }),
    })
    const driver = automaticDriver({
      states: [futureReady, futureReady],
      quarantines: [[], [{ id: 'quarantine-1' }]],
    })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: 'MCP_QUARANTINE_REMAINS',
    })

    expect(driver.waits).toEqual([120_000])
    expect(driver.runReads).toBe(2)
    expect(driver.quarantineChecks).toBe(2)
    expect(driver.executions).toBe(1)
  })

  test('stops before replay when a quarantine exists', async () => {
    const driver = automaticDriver({
      states: [recoveryRun({
        output_ref: recoveryOutput({}, { next_run_at: '2000-01-01T00:00:00.000Z' }),
      })],
      quarantines: [[{ id: 'quarantine-1' }]],
    })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: 'MCP_QUARANTINE_REMAINS',
    })
    expect(driver.executions).toBe(1)
  })

  test('polls queued and running states without replay', async () => {
    const driver = automaticDriver({ states: [
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'queued' },
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'running' },
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'success' },
    ] })

    const result = await driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })

    expect(result).toMatchObject({ status: 'success', executions: 1 })
    expect(driver.waits).toEqual([100, 100])
    expect(driver.executions).toBe(1)
  })

  test('uses the initial execution plus two immediate recoveries before success', async () => {
    const driver = automaticDriver({
      states: [
        recoveryRun({ output_ref: recoveryOutput({}, {
          attempts: 1,
          next_run_at: '2000-01-01T00:00:00.000Z',
        }) }),
        recoveryRun({ output_ref: recoveryOutput({}, {
          attempts: 2,
          next_run_at: '2000-01-01T00:00:00.000Z',
        }) }),
        recoveryRun({ status: 'success', output_ref: undefined }),
      ],
    })

    const result = await driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })

    expect(result).toMatchObject({ status: 'success', executions: 3 })
    expect(driver.waits).toEqual([])
    expect(driver.executions).toBe(3)
  })

  test('fails before a fourth automatic execution', async () => {
    const driver = automaticDriver({
      states: [1, 2, 3].map(attempts => recoveryRun({
        output_ref: recoveryOutput({}, {
          attempts,
          next_run_at: '2000-01-01T00:00:00.000Z',
        }),
      })),
    })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: 'AUTOMATIC_RETRY_LIMIT_EXHAUSTED',
    })
    expect(driver.executions).toBe(3)
  })

  test('rejects retry attempt regression', async () => {
    const driver = automaticDriver({ states: [
      recoveryRun({ output_ref: recoveryOutput({}, {
        attempts: 2,
        next_run_at: '2000-01-01T00:00:00.000Z',
      }) }),
      recoveryRun({ output_ref: recoveryOutput({}, {
        attempts: 1,
        next_run_at: '2000-01-01T00:00:00.000Z',
      }) }),
    ] })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: 'INVALID_RUN_RECOVERY_STATE',
    })
  })

  test('maps terminal automatic-run statuses to exact error codes without replay', async () => {
    for (const status of ['failed', 'canceled', 'paused']) {
      const driver = automaticDriver({ states: [{
        id: 200,
        project_id: 12,
        run_type: 'chapter_group_generation',
        status,
      }] })

      await expect(driveAutomaticRunToSuccess({
        runId: 200,
        projectId: 12,
        chapterId: 34,
        deadline: Number.MAX_SAFE_INTEGER,
        pollIntervalMs: 100,
        readRun: driver.readRun,
        executeRun: driver.executeRun,
        assertNoQuarantine: driver.assertNoQuarantine,
      }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
        message: 'automatic run did not succeed',
        code: `AUTOMATIC_RUN_${status.toUpperCase()}`,
      })
      expect(driver.executions).toBe(1)
    }
  })

  test('rejects an unknown automatic-run status', async () => {
    const driver = automaticDriver({ states: [{
      id: 200,
      project_id: 12,
      run_type: 'chapter_group_generation',
      status: 'mystery',
    }] })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: 'INVALID_RUN_RECOVERY_STATE',
    })
    expect(driver.executions).toBe(1)
  })

  test('normalizes malformed ready parent projections without replay', async () => {
    for (const malformed of [
      recoveryRun({ id: 201 }),
      recoveryRun({ project_id: 13 }),
      recoveryRun({ run_type: 'chapter_generation_stage' }),
    ]) {
      const driver = automaticDriver({ states: [malformed] })

      await expect(driveAutomaticRunToSuccess({
        runId: 200,
        projectId: 12,
        chapterId: 34,
        deadline: Number.MAX_SAFE_INTEGER,
        pollIntervalMs: 100,
        readRun: driver.readRun,
        executeRun: driver.executeRun,
        assertNoQuarantine: driver.assertNoQuarantine,
      }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
        message: 'invalid automatic recovery state',
        code: 'INVALID_RUN_RECOVERY_STATE',
      })
      expect(driver.executions).toBe(1)
      expect(driver.quarantineChecks).toBe(0)
    }
  })

  test('normalizes hostile top-level recovery states without invoking or reflecting them', async () => {
    const sentinel = 'PRIVATE_HOSTILE_RECOVERY_SENTINEL'
    let getterCalls = 0
    let proxyCalls = 0
    const accessorState = recoveryRun()
    Object.defineProperty(accessorState, 'id', {
      get() {
        getterCalls += 1
        throw new Error(sentinel)
      },
    })
    const proxyState = new Proxy(recoveryRun(), {
      getOwnPropertyDescriptor() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
    })

    for (const hostile of [accessorState, proxyState]) {
      const driver = automaticDriver({ states: [hostile] })
      const error = await driveAutomaticRunToSuccess({
        runId: 200,
        projectId: 12,
        chapterId: 34,
        deadline: Number.MAX_SAFE_INTEGER,
        pollIntervalMs: 100,
        readRun: driver.readRun,
        executeRun: driver.executeRun,
        assertNoQuarantine: driver.assertNoQuarantine,
      }, { now: driver.now, wait: driver.wait }).then(() => null, caught => caught)

      expect(error?.message).toBe('invalid automatic recovery state')
      expect(error?.code).toBe('INVALID_RUN_RECOVERY_STATE')
      expect(JSON.stringify(error)).not.toContain(sentinel)
      expect(driver.executions).toBe(1)
      expect(driver.quarantineChecks).toBe(0)
    }
    expect(getterCalls).toBe(0)
    expect(proxyCalls).toBe(0)
  })

  test('preserves a timeout thrown while waiting for next_run_at', async () => {
    const timeout = Object.assign(new Error('smoke timeout'), { code: 'SMOKE_TIMEOUT' })
    const deadline = Date.parse('2026-08-05T01:05:00.000Z')
    let capturedWaitDuration: number | undefined
    let capturedDeadline: number | undefined
    const driver = automaticDriver({ states: [recoveryRun({
      output_ref: recoveryOutput({}, {
        next_run_at: '2026-08-05T01:02:00.000Z',
      }),
    })] })

    await expect(driveAutomaticRunToSuccess({
      runId: 200,
      projectId: 12,
      chapterId: 34,
      deadline,
      pollIntervalMs: 100,
      readRun: driver.readRun,
      executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, {
      now: driver.now,
      wait: async (milliseconds: number, forwardedDeadline: number) => {
        capturedWaitDuration = milliseconds
        capturedDeadline = forwardedDeadline
        throw timeout
      },
    })).rejects.toBe(timeout)
    expect(capturedWaitDuration).toBe(120_000)
    expect(capturedDeadline).toBe(deadline)
    expect(driver.executions).toBe(1)
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

describe('Buda smoke terminal workflow', () => {
  test('checks accepted prose, Story State, released authority, quarantine, and emits only the safe summary', async () => {
    const scenario = deterministicSmokeFetch()
    const result = await runSmokeScenario(scenario)
    expect(result.exitCode).toBe(0)
    expect(result.errors).toEqual([])
    expect(result.logs).toHaveLength(1)
    const rawSummary = result.logs[0]
    expect(JSON.parse(rawSummary)).toEqual({
      ok: true,
      project_id: 12,
      chapter_id: 34,
      chapter_has_prose: true,
      story_state_last_updated_chapter: 9,
      source_fingerprint: maskFingerprint(fingerprint),
      automatic: {
        run_id: 200,
        stages: ['draft', 'quality_review', 'story_state_sync'],
        session: maskSessionId('session-auto'),
      },
      manual: {
        stages: ['manual_recheck'],
        session: maskSessionId('session-manual'),
      },
      tasks_different: true,
      sessions_different: true,
      source_locked: false,
      quarantines: 0,
    })
    for (const privateValue of [
      fingerprint,
      'task-auto',
      'task-manual',
      'session-auto',
      'session-manual',
      'agent-1',
      '风从城门吹来。',
    ]) {
      expect(rawSummary).not.toContain(privateValue)
    }
    expect(scenario.calls.filter(call => (
      call === 'GET:/api/novel/projects/12/chapter-generation-source'
    ))).toHaveLength(2)
    expect(scenario.calls.filter(call => call === 'GET:/api/mcp/quarantines')).toHaveLength(2)
    expect(scenario.calls).toContain('GET:/api/novel/projects/12')
    expect(scenario.calls.filter(call => (
      call === 'GET:/api/novel/chapters/34?project_id=12'
    ))).toHaveLength(2)
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(1)
    expect(scenario.automaticExecuteBodies).toEqual([{
      max_chapters: 1,
      production_mode: 'full_auto',
      force_scene_cards: true,
      allow_incomplete: false,
      auto_repair_missing_material: true,
    }])
  })

  test('fails before manual work when any post-baseline chapter receipt is model sourced', async () => {
    const scenario = deterministicSmokeFetch({ automaticReceiptOverrides: { source: 'model' } })
    const result = await runSmokeScenario(scenario)
    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'automatic_receipts',
      error_code: 'INVALID_RECEIPTS',
    })
    expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
  })

  test('replays an immediately ready automatic run once and continues after parent success', async () => {
    const scenario = deterministicSmokeFetch({
      automaticStates: [
        recoveryRun({
          output_ref: recoveryOutput({}, {
            attempts: 1,
            next_run_at: '2000-01-01T00:00:00.000Z',
          }),
        }),
        recoveryRun({ status: 'success', output_ref: undefined }),
      ],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(0)
    expect(result.errors).toEqual([])
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(2)
    expect(scenario.automaticExecuteBodies).toEqual([1, 2].map(() => ({
      max_chapters: 1,
      production_mode: 'full_auto',
      force_scene_cards: true,
      allow_incomplete: false,
      auto_repair_missing_material: true,
    })))
  })

  test('stops recovery before replay when an MCP quarantine appears', async () => {
    const scenario = deterministicSmokeFetch({
      automaticStates: [
        recoveryRun({
          output_ref: recoveryOutput({}, {
            attempts: 1,
            next_run_at: '2000-01-01T00:00:00.000Z',
          }),
        }),
        recoveryRun({ status: 'failed', output_ref: undefined }),
      ],
      quarantineReads: [[], [{ id: 'quarantine-1' }]],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'automatic_poll',
      error_code: 'MCP_QUARANTINE_REMAINS',
    })
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(1)
    expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
  })

  test('stops before starting an automatic run when preflight quarantine exists', async () => {
    const scenario = deterministicSmokeFetch({
      quarantineReads: [[{ id: 'quarantine-1' }]],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'automatic_quarantines',
      error_code: 'MCP_QUARANTINE_REMAINS',
    })
    expect(scenario.calls).not.toContain('POST:/api/novel/projects/12/chapter-groups/start')
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(0)
  })

  test('stops after the bounded automatic execution limit is exhausted', async () => {
    const scenario = deterministicSmokeFetch({
      automaticStates: [
        ...[1, 2, 3].map(attempts => recoveryRun({
          output_ref: recoveryOutput({}, {
            attempts,
            next_run_at: '2000-01-01T00:00:00.000Z',
          }),
        })),
        recoveryRun({ status: 'failed', output_ref: undefined }),
      ],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'automatic_poll',
      error_code: 'AUTOMATIC_RETRY_LIMIT_EXHAUSTED',
    })
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(3)
    expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
  })

  test('emits the recovery diagnostic for a malformed ready parent snapshot', async () => {
    const scenario = deterministicSmokeFetch({
      automaticStates: [recoveryRun({ id: 201 })],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'automatic_poll',
      error_code: 'INVALID_RUN_RECOVERY_STATE',
    })
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(1)
    expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
  })
})
