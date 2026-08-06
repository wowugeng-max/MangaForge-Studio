import { describe, expect, spyOn, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  assertAutomaticStageCoverage,
  assertIndependentStageSessions,
  assertNewTaskSession,
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
    run_id: 1,
    task_id: 'task-1',
    stage,
    source: 'mcp',
    source_fingerprint: fingerprint,
    authority_fingerprint: fingerprint,
    session_id: 'session-1',
    status: 'success',
    cache_hit: false,
    artifact_id: 101,
    attempt: 1,
    ...providerIdentity,
    ...overrides,
  }
}

function automaticReceipts(overrides: Record<string, Record<string, unknown>> = {}) {
  return [
    receipt('draft', {
      run_id: 1,
      artifact_id: 101,
      session_id: 'session-draft',
      ...overrides.draft,
    }),
    receipt('quality_review', {
      run_id: 2,
      artifact_id: 102,
      session_id: 'session-review',
      ...overrides.quality_review,
    }),
    receipt('story_state_sync', {
      run_id: 3,
      artifact_id: 103,
      session_id: 'session-story-state',
      ...overrides.story_state_sync,
    }),
  ]
}

function expectInvalidTaskReceipts(receipts: Array<Record<string, unknown>>) {
  let caught: any
  try {
    assertIndependentStageSessions(receipts)
  } catch (error) {
    caught = error
  }
  expect(caught?.message).toBe('invalid chapter task receipts')
  expect(caught?.code).toBe('INVALID_RECEIPTS')
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
  sessionId: string | undefined,
  overrides: Record<string, unknown> = {},
) {
  const {
    status = 'success',
    cache_hit: cacheHitOverride,
    input_overrides: inputOverrides = {},
    output_overrides: outputOverrides = {},
    artifact_id: artifactId = 1_000 + id,
    attempt = 1,
    ...identityOverrides
  } = overrides
  const cacheHit = cacheHitOverride ?? (status === 'success' ? false : undefined)
  const common = {
    receipt_authority: 'chapter_generation_stage_v1',
    task_id: taskId,
    project_id: 12,
    chapter_id: 34,
    stage,
    source: 'mcp',
    source_fingerprint: fingerprint,
    authority_fingerprint: fingerprint,
    artifact_id: artifactId,
    attempt,
    ...providerIdentity,
    ...identityOverrides,
  }
  const input = { ...common, ...(inputOverrides as Record<string, unknown>) }
  const output = {
    ...common,
    status,
    ...(cacheHit === undefined ? {} : { cache_hit: cacheHit }),
    ...(sessionId === undefined ? {} : { session_id: sessionId }),
    ...(outputOverrides as Record<string, unknown>),
  }
  return {
    id,
    project_id: 12,
    chapter_id: 34,
    run_type: 'chapter_generation_stage',
    step_name: stage,
    status,
    input_ref: JSON.stringify(input),
    output_ref: JSON.stringify(output),
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
  automaticRuns?: ReturnType<typeof stageRun>[]
  automaticStates?: Array<Record<string, unknown>>
  quarantineReads?: Array<unknown[]>
  sourceErrorCode?: string
} = {}) {
  const calls: string[] = []
  const automaticExecuteBodies: unknown[] = []
  let chapterReads = 0
  let summaryReads = 0
  const automaticRuns = options.automaticRuns || [
    stageRun(201, 'draft', 'task-auto', 'session-auto-draft', options.automaticReceiptOverrides),
    stageRun(202, 'quality_review', 'task-auto', 'session-auto-review'),
    stageRun(203, 'story_state_sync', 'task-auto', 'session-auto-story-state'),
  ]
  const manualRun = stageRun(
    Math.max(200, ...automaticRuns.map(run => run.id)) + 1,
    'manual_recheck',
    'task-manual',
    'session-manual',
  )
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

    if (path === '/api/novel/projects/12/chapter-generation-source') {
      if (options.sourceErrorCode) {
        return new Response(JSON.stringify({
          error_code: options.sourceErrorCode,
          error: 'PRIVATE_REMOTE_BODY',
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return json(sourceView())
    }
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
  test('projects one automatic task with an independent Session for every stage', () => {
    const projected = assertIndependentStageSessions(automaticReceipts())
    expect(projected).toMatchObject({
      task_id: 'task-1',
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      session_count: 3,
      stages: ['draft', 'quality_review', 'story_state_sync'],
      ...providerIdentity,
    })
    expect(projected.session_hashes).toHaveLength(3)
    for (const sessionHash of projected.session_hashes) {
      expect(sessionHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(sessionHash).not.toContain('session-')
    }
  })

  test('rejects a Session reused by two chapter stages', () => {
    let caught: any
    try {
      assertIndependentStageSessions(automaticReceipts({
        draft: { session_id: 'session-reused' },
        quality_review: { session_id: 'session-reused' },
      }))
    } catch (error) {
      caught = error
    }
    expect(caught?.message).toBe('chapter stage Session was reused')
    expect(caught?.code).toBe('CHAPTER_STAGE_SESSION_REUSED')
    expect(JSON.stringify(caught)).not.toContain('session-reused')
  })

  test('counts only actual remote completions while accepting recovery and cache-hit receipts', () => {
    const receipts = [
      projectStageReceipt(stageRun(71, 'draft', 'task-1', undefined, {
        status: 'failed', artifact_id: 171, attempt: 1,
      })),
      projectStageReceipt(stageRun(72, 'draft', 'task-1', undefined, {
        status: 'failed', artifact_id: 172, attempt: 2,
      })),
      projectStageReceipt(stageRun(73, 'draft', 'task-1', 'session-draft', {
        artifact_id: 173, attempt: 3,
      })),
      projectStageReceipt(stageRun(74, 'draft', 'task-1', undefined, {
        cache_hit: true, artifact_id: 173, attempt: 3,
      })),
      projectStageReceipt(stageRun(75, 'quality_review', 'task-1', 'session-review', {
        artifact_id: 175, attempt: 1,
      })),
      projectStageReceipt(stageRun(76, 'story_state_sync', 'task-1', 'session-story-state', {
        artifact_id: 176, attempt: 1,
      })),
    ]

    expect(assertIndependentStageSessions(receipts)).toMatchObject({
      task_id: 'task-1',
      session_count: 3,
      stages: ['draft', 'quality_review', 'story_state_sync'],
    })
    expect(assertAutomaticStageCoverage(receipts)).toEqual([
      'draft',
      'quality_review',
      'story_state_sync',
    ])

    const cacheOnlyAutomatic = automaticReceipts({
      draft: { cache_hit: true, session_id: undefined },
      quality_review: { cache_hit: true, session_id: undefined },
      story_state_sync: { cache_hit: true, session_id: undefined },
    })
    expect(() => assertIndependentStageSessions(cacheOnlyAutomatic))
      .toThrow('invalid chapter task receipts')
  })

  test('allows repeated actual stage labels when each invocation has a distinct lineage and Session', () => {
    const projected = assertIndependentStageSessions([
      receipt('word_target_repair', {
        run_id: 1, artifact_id: 201, attempt: 1, session_id: 'session-repair-1',
      }),
      receipt('word_target_repair', {
        run_id: 2, artifact_id: 202, attempt: 2, session_id: 'session-repair-2',
      }),
    ])

    expect(projected).toMatchObject({
      session_count: 2,
      stages: ['word_target_repair'],
    })
    expect(new Set(projected.session_hashes).size).toBe(2)
  })

  test('allows repeated cache replays only after their actual artifact lineage', () => {
    const projected = assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 301, attempt: 1, session_id: 'session-draft',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 301, attempt: 1, cache_hit: true, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 301, attempt: 1, cache_hit: true, session_id: undefined,
      }),
    ])

    expect(projected).toMatchObject({
      session_count: 1,
      stages: ['draft'],
    })
  })

  test('rejects one artifact id assigned to different stages', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 801, attempt: 1, session_id: 'session-draft',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 801, attempt: 1, session_id: 'session-review',
      }),
    ])
  })

  test('rejects different artifact ids assigned to the same stage attempt', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 811, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 812, attempt: 1, session_id: 'session-draft-2',
      }),
    ])
  })

  test('rejects same-stage attempt rollback across actual and failed terminals', () => {
    for (const candidate of [
      [
        receipt('draft', {
          run_id: 1, artifact_id: 821, attempt: 1, session_id: 'session-draft-1',
        }),
        receipt('draft', {
          run_id: 2, artifact_id: 822, attempt: 2,
          status: 'failed', cache_hit: undefined, session_id: undefined,
        }),
        receipt('draft', {
          run_id: 3, artifact_id: 823, attempt: 1,
          status: 'failed', cache_hit: undefined, session_id: undefined,
        }),
      ],
      [
        receipt('draft', {
          run_id: 1, artifact_id: 831, attempt: 1,
          status: 'failed', cache_hit: undefined, session_id: undefined,
        }),
        receipt('draft', {
          run_id: 2, artifact_id: 832, attempt: 2, session_id: 'session-draft-2',
        }),
        receipt('draft', {
          run_id: 3, artifact_id: 833, attempt: 1, session_id: 'session-draft-rollback',
        }),
      ],
    ]) {
      expectInvalidTaskReceipts(candidate)
    }
  })

  test('rejects an in-place success after the same artifact failed terminally', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 841, attempt: 1,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 841, attempt: 1, session_id: 'session-impossible-success',
      }),
    ])
  })

  test('rejects a duplicate failed terminal receipt for one artifact', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 851, attempt: 1,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 851, attempt: 1,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
    ])
  })

  test('rejects a duplicate actual terminal receipt for one artifact', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 861, attempt: 1, session_id: 'session-draft',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 861, attempt: 1, session_id: 'session-duplicate-actual',
      }),
    ])
  })

  test('rejects cache replay from a failed or unknown artifact', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 871, attempt: 1,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 871, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 872, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])
  })

  test('rejects cache replay from an old success after a higher successful attempt', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 873, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 874, attempt: 2, session_id: 'session-draft-2',
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 873, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])
  })

  test('rejects cache replay from an old success after a higher failed attempt', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 875, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 876, attempt: 2,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 875, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])
  })

  test('invalidates later cross-stage successes from the same-stage success anchor', () => {
    const prefix = [
      receipt('draft', {
        run_id: 1, artifact_id: 10, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 11, attempt: 1, session_id: 'session-review-1',
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 12, attempt: 2, session_id: 'session-draft-2',
      }),
    ]

    expect(assertIndependentStageSessions(prefix)).toMatchObject({
      stages: ['draft', 'quality_review'],
      session_count: 3,
    })
    expectInvalidTaskReceipts([...prefix, receipt('quality_review', {
      run_id: 4, artifact_id: 11, attempt: 1,
      cache_hit: true, session_id: undefined,
    })])
    expectInvalidTaskReceipts([...prefix, receipt('draft', {
      run_id: 4, artifact_id: 10, attempt: 1,
      cache_hit: true, session_id: undefined,
    })])
  })

  test('invalidates only successes at or after the current stage anchor', () => {
    const prefix = [
      receipt('draft', {
        run_id: 1, artifact_id: 20, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 21, attempt: 1, session_id: 'session-review-1',
      }),
      receipt('quality_review', {
        run_id: 3, artifact_id: 22, attempt: 2,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 4, artifact_id: 20, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ]

    expect(assertIndependentStageSessions(prefix)).toMatchObject({
      stages: ['draft', 'quality_review'],
      session_count: 2,
    })
    expectInvalidTaskReceipts([...prefix, receipt('quality_review', {
      run_id: 5, artifact_id: 21, attempt: 1,
      cache_hit: true, session_id: undefined,
    })])
  })

  test('allows repeated cache replay before any invalidating new artifact', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 30, attempt: 1, session_id: 'session-draft',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 30, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 30, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])).toMatchObject({ stages: ['draft'], session_count: 1 })
  })

  test('allows repeated cache replay from the latest success after invalidation', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 35, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 36, attempt: 2, session_id: 'session-draft-2',
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 36, attempt: 2,
        cache_hit: true, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 4, artifact_id: 36, attempt: 2,
        cache_hit: true, session_id: undefined,
      }),
    ])).toMatchObject({ stages: ['draft'], session_count: 2 })
  })

  test('does not invalidate an earlier success when another stage creates its first artifact', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 40, attempt: 1, session_id: 'session-draft',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 41, attempt: 1, session_id: 'session-review',
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 40, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
    ])).toMatchObject({ stages: ['draft', 'quality_review'], session_count: 2 })
  })

  test('requires new artifact ids to increase globally within the task', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 51, attempt: 1, session_id: 'session-draft',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 50, attempt: 1, session_id: 'session-review',
      }),
    ])
  })

  test('tracks consecutive new artifact attempts across actual and failed terminals', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 881, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 882, attempt: 2,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 883, attempt: 3, session_id: 'session-draft-3',
      }),
    ])).toMatchObject({ stages: ['draft'], session_count: 2 })
  })

  test('requires a first attempt of one and consecutive new artifact attempts', () => {
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 884, attempt: 2, session_id: 'session-first-attempt-2',
      }),
    ])
    expectInvalidTaskReceipts([
      receipt('draft', {
        run_id: 1, artifact_id: 885, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 886, attempt: 3,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
    ])
  })

  test('does not advance a stage attempt when replaying its cache', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 891, attempt: 1, session_id: 'session-draft-1',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 891, attempt: 1,
        cache_hit: true, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 892, attempt: 2, session_id: 'session-draft-2',
      }),
    ])).toMatchObject({ stages: ['draft'], session_count: 2 })
  })

  test('rejects orphaned, reordered, or contradictory artifact lineage receipts', () => {
    const actual = receipt('draft', {
      run_id: 1, artifact_id: 401, attempt: 1, session_id: 'session-draft',
    })
    const cache = (overrides: Record<string, unknown> = {}) => receipt('draft', {
      run_id: 2,
      artifact_id: 401,
      attempt: 1,
      cache_hit: true,
      session_id: undefined,
      ...overrides,
    })

    for (const candidate of [
      [cache()],
      [actual, cache({ artifact_id: 402 })],
      [actual, cache({ attempt: 2 })],
      [actual, cache({ stage: 'quality_review' })],
      [cache({ run_id: 1 }), { ...actual, run_id: 2 }],
      [actual, { ...actual, run_id: 2, session_id: 'session-duplicate-artifact' }],
      [actual, cache({ session_id: 'session-cache-impossible' })],
      [{ ...actual, run_id: 2 }, { ...cache({ run_id: 1 }) }],
    ]) {
      expect(() => assertIndependentStageSessions(candidate))
        .toThrow('invalid chapter task receipts')
    }
  })

  test('permits repeated historical failures without establishing artifact coverage', () => {
    expect(assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1, artifact_id: 501, attempt: 1,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 502, attempt: 2,
        status: 'failed', cache_hit: undefined, session_id: undefined,
      }),
      receipt('draft', {
        run_id: 3, artifact_id: 503, attempt: 3, session_id: 'session-draft',
      }),
    ])).toMatchObject({ stages: ['draft'], session_count: 1 })
  })

  test('rejects unknown status and contradictory cache-hit or Session evidence', () => {
    for (const candidate of [
      receipt('draft', { status: 'running', session_id: undefined, cache_hit: undefined }),
      receipt('draft', { status: 'mystery', session_id: undefined, cache_hit: undefined }),
      receipt('draft', { status: 'success', cache_hit: true, session_id: 'session-impossible' }),
      receipt('draft', { status: 'success', cache_hit: false, session_id: undefined }),
      receipt('draft', { status: 'success', cache_hit: undefined }),
      receipt('draft', { status: 'failed', cache_hit: false, session_id: undefined }),
      receipt('draft', { status: 'failed', cache_hit: undefined, session_id: 'session-impossible' }),
    ]) {
      expect(() => assertIndependentStageSessions([candidate]))
        .toThrow('invalid chapter task receipts')
    }

    expect(() => projectStageReceipt(stageRun(76, 'draft', 'task-1', undefined, {
      status: 'failed',
      output_overrides: { cache_hit: null, session_id: null },
    }))).toThrow('invalid chapter stage receipt')
    expect(() => projectStageReceipt(stageRun(77, 'draft', 'task-1', 'session-draft', {
      output_overrides: { status: null },
    }))).toThrow('invalid chapter stage receipt')
  })

  test('requires one provider identity and both fingerprints for the automatic chain', () => {
    const receipts = automaticReceipts()
    expect(assertIndependentStageSessions(receipts)).toMatchObject({
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
    ]) {
      expect(() => assertIndependentStageSessions([receipt('draft', overrides)]))
        .toThrow('invalid chapter task receipts')
    }

    expect(assertIndependentStageSessions(automaticReceipts({
      draft: { model: undefined },
      quality_review: { model: undefined },
      story_state_sync: { model: undefined },
    }))).toMatchObject({ model: undefined, session_count: 3 })

    for (const overrides of [
      { authority_fingerprint: otherFingerprint },
      { server_id: 'other-server' },
      { key_id: 8 },
      { adapter_id: 'generic' },
      { agent_id: 'agent-2' },
      { model: 'Other Model' },
    ]) {
      expect(() => assertIndependentStageSessions([
        receipt('draft', { session_id: 'session-draft' }),
        receipt('story_state_sync', {
          run_id: 2,
          artifact_id: 102,
          session_id: 'session-story-state',
          ...overrides,
        }),
      ]))
        .toThrow('invalid chapter task receipts')
    }

    expect(() => assertIndependentStageSessions([
      receipt('draft', {
        run_id: 1,
        artifact_id: 101,
        status: 'failed',
        cache_hit: undefined,
        session_id: undefined,
        server_id: 'other-server',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 102, attempt: 2, session_id: 'session-draft',
      }),
    ])).toThrow('invalid chapter task receipts')
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
      [receipt('draft', { run_id: undefined })],
      [receipt('draft', { run_id: 0 })],
      [receipt('draft', { artifact_id: undefined })],
      [receipt('draft', { attempt: undefined })],
      [receipt('draft', { artifact_id: 0 })],
      [receipt('draft', { attempt: 0 })],
      [receipt('draft', { source: 'model' })],
      [
        receipt('draft', { session_id: 'session-draft' }),
        receipt('quality_review', { task_id: 'task-2', session_id: 'session-review' }),
      ],
      [
        receipt('draft', { session_id: 'session-draft' }),
        receipt('quality_review', {
          source_fingerprint: `sha256:${'b'.repeat(64)}`,
          session_id: 'session-review',
        }),
      ],
      [
        receipt('draft', { session_id: 'session-draft' }),
        receipt('quality_review', {
          authority_fingerprint: otherFingerprint,
          session_id: 'session-review',
        }),
      ],
    ]

    for (const candidate of invalid) {
      expect(() => assertIndependentStageSessions(candidate)).toThrow('invalid chapter task receipts')
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
      expect(() => assertIndependentStageSessions(candidate)).toThrow('invalid chapter task receipts')
    }
  })

  test('fails closed on hostile, oversized, circular, duplicate, and unknown receipts', () => {
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
    const cacheGetterReceipt = receipt('draft')
    Object.defineProperty(cacheGetterReceipt, 'cache_hit', {
      enumerable: true,
      get() {
        getterCalls += 1
        throw new Error(sentinel)
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

    const revocable = Proxy.revocable(receipt('draft'), {
      get() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
      getOwnPropertyDescriptor() {
        proxyCalls += 1
        throw new Error(sentinel)
      },
    })
    revocable.revoke()
    const circularReceipt: Record<string, unknown> = receipt('draft')
    circularReceipt.self = circularReceipt
    const oversizedReceipt = receipt('draft', { prose: sentinel.repeat(1_000_000) })
    const tooManyReceipts = Array.from({ length: 129 }, (_, index) => receipt('draft', {
      session_id: `session-${index}`,
    }))

    for (const candidate of [
      [getterReceipt],
      [cacheGetterReceipt],
      [proxyReceipt],
      [revocable.proxy],
      new Proxy([receipt('draft')], {}),
      [circularReceipt],
      [oversizedReceipt],
      tooManyReceipts,
      [receipt('unknown_remote_stage')],
    ]) {
      let caught: any
      try {
        assertIndependentStageSessions(candidate)
      } catch (error) {
        caught = error
      }
      expect(caught).toBeDefined()
      expect(caught.message.length).toBeLessThanOrEqual(128)
      expect(JSON.stringify(caught)).not.toContain(sentinel)
    }
    expect(getterCalls).toBe(0)
    expect(proxyCalls).toBe(0)

    let duplicateLineageError: any
    try {
      assertIndependentStageSessions([
        receipt('draft', {
          run_id: 1, artifact_id: 101, attempt: 1, session_id: 'session-draft',
        }),
        receipt('draft', {
          run_id: 2, artifact_id: 101, attempt: 1, session_id: 'session-draft-duplicate',
        }),
      ])
    } catch (error) {
      duplicateLineageError = error
    }
    expect(duplicateLineageError?.message).toBe('invalid chapter task receipts')
    expect(duplicateLineageError?.code).toBe('INVALID_RECEIPTS')
    expect(JSON.stringify(duplicateLineageError)).not.toContain('session-draft')
  })

  test('requires the automatic draft, review or repair, and story sync stages', () => {
    const complete = automaticReceipts()
    expect(assertAutomaticStageCoverage(complete)).toEqual([
      'draft',
      'quality_review',
      'story_state_sync',
    ])
    expect(() => assertAutomaticStageCoverage([
      receipt('draft', { run_id: 1, artifact_id: 101, session_id: 'session-draft' }),
      receipt('story_state_sync', {
        run_id: 2, artifact_id: 102, session_id: 'session-story-state',
      }),
    ]))
      .toThrow('automatic task stage coverage failed')
    expect(() => assertAutomaticStageCoverage([
      receipt('draft', { run_id: 1, artifact_id: 101, session_id: 'session-draft' }),
      receipt('quality_repair', {
        run_id: 2, artifact_id: 102, session_id: 'session-repair',
      }),
    ]))
      .toThrow('automatic task stage coverage failed')
  })

  test('requires first actual draft before first review or repair before first story sync', () => {
    expect(() => assertAutomaticStageCoverage([
      receipt('quality_review', {
        run_id: 1, artifact_id: 601, session_id: 'session-review',
      }),
      receipt('draft', {
        run_id: 2, artifact_id: 602, session_id: 'session-draft',
      }),
      receipt('story_state_sync', {
        run_id: 3, artifact_id: 603, session_id: 'session-story',
      }),
    ])).toThrow('automatic task stage coverage failed')

    expect(() => assertAutomaticStageCoverage([
      receipt('draft', {
        run_id: 1, artifact_id: 611, session_id: 'session-draft',
      }),
      receipt('story_state_sync', {
        run_id: 2, artifact_id: 612, session_id: 'session-story',
      }),
      receipt('quality_review', {
        run_id: 3, artifact_id: 613, session_id: 'session-review',
      }),
    ])).toThrow('automatic task stage coverage failed')

    expect(assertAutomaticStageCoverage([
      receipt('draft', {
        run_id: 1, artifact_id: 621, session_id: 'session-draft',
      }),
      receipt('quality_review', {
        run_id: 2, artifact_id: 622, session_id: 'session-review',
      }),
      receipt('quality_repair', {
        run_id: 3, artifact_id: 623, session_id: 'session-repair-1',
      }),
      receipt('quality_repair', {
        run_id: 4, artifact_id: 624, attempt: 2, session_id: 'session-repair-2',
      }),
      receipt('quality_recheck', {
        run_id: 5, artifact_id: 625, session_id: 'session-recheck',
      }),
      receipt('story_state_sync', {
        run_id: 6, artifact_id: 626, session_id: 'session-story',
      }),
    ])).toEqual([
      'draft',
      'quality_review',
      'quality_repair',
      'quality_recheck',
      'story_state_sync',
    ])
  })

  test('requires a manual task to use a new task id and Session', () => {
    const automatic = assertIndependentStageSessions(automaticReceipts())
    const manual = [receipt('manual_recheck', { task_id: 'task-2', session_id: 'session-2' })]
    expect(assertNewTaskSession(automatic.session_hashes, manual, 'task-1')).toMatchObject({
      task_id: 'task-2',
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      session_count: 1,
      stages: ['manual_recheck'],
      ...providerIdentity,
    })
    expect(assertNewTaskSession(automatic.session_hashes, manual)).toMatchObject({
      task_id: 'task-2',
      source_fingerprint: fingerprint,
      authority_fingerprint: fingerprint,
      session_count: 1,
      stages: ['manual_recheck'],
      ...providerIdentity,
    })

    const cacheHitOnly = [receipt('manual_recheck', {
      task_id: 'task-2',
      cache_hit: true,
      session_id: undefined,
    })]
    expect(() => assertNewTaskSession(automatic.session_hashes, cacheHitOnly, 'task-1'))
      .toThrow('invalid manual task receipts')
  })

  test('keeps authority and provider identity while manual work gets a new task and Session', () => {
    const automatic = assertIndependentStageSessions(automaticReceipts())
    const manual = assertNewTaskSession(automatic.session_hashes, [
      receipt('manual_recheck', { task_id: 'task-2', session_id: 'session-2' }),
    ], 'task-1')

    expect(manual.task_id).not.toBe(automatic.task_id)
    expect(manual.session_hashes.every((hash: string) => !automatic.session_hashes.includes(hash))).toBe(true)
    expect({ ...manual, task_id: undefined, session_count: undefined, stages: undefined, session_hashes: undefined }).toEqual({
      ...automatic,
      task_id: undefined,
      session_count: undefined,
      stages: undefined,
      session_hashes: undefined,
    })
  })

  test('uses the required exact diagnostic when manual work reuses the prior Session', () => {
    const automatic = assertIndependentStageSessions(automaticReceipts())
    const manual = [receipt('manual_recheck', {
      task_id: 'task-2',
      session_id: 'session-draft',
    })]
    expect(() => assertNewTaskSession(automatic.session_hashes, manual, 'task-1'))
      .toThrow('manual task reused the previous Session')
  })

  test('rejects a reused manual task id without reflecting identifiers', () => {
    const automatic = assertIndependentStageSessions(automaticReceipts())
    const manual = [receipt('manual_recheck', { session_id: 'session-2' })]
    expect(() => assertNewTaskSession(automatic.session_hashes, manual, 'task-1'))
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
        artifact_id: 777,
        attempt: 1,
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
        cache_hit: false,
        source: 'mcp',
        source_fingerprint: fingerprint,
        authority_fingerprint: fingerprint,
        artifact_id: 777,
        attempt: 1,
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
      cache_hit: false,
      artifact_id: 777,
      attempt: 1,
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
        artifact_id: 778,
        attempt: 1,
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
        cache_hit: false,
        artifact_id: 778,
        attempt: 1,
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
      artifact_id: 778,
      attempt: 1,
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
        artifact_id: 779, attempt: 1,
        ...providerIdentity, ...inputOverrides,
      }),
      output_ref: JSON.stringify({
        receipt_authority: 'chapter_generation_stage_v1',
        task_id: 'task-1', project_id: 12, chapter_id: 34, stage: 'draft', status: 'success',
        cache_hit: false,
        artifact_id: 779, attempt: 1,
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
    expect(() => projectStageReceipt(projectedStageRun({}, { artifact_id: 780 })))
      .toThrow('invalid chapter stage receipt')
    expect(() => projectStageReceipt(projectedStageRun({}, { attempt: 2 })))
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
    const oversized = { ...malformed, input_ref: '{'.repeat(16_385) }

    for (const candidate of [hostile, new Proxy(malformed, {}), oversized, malformed]) {
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

  test('does not trust or reflect a syntactically safe remote error code', async () => {
    const sentinel = 'PRIVATE_REMOTE_BODY'
    const fetchImpl = (async () => new Response(JSON.stringify({
      error: sentinel,
      detail: sentinel,
      error_code: sentinel,
    }), { status: 502, headers: { 'Content-Type': 'application/json' } })) as typeof fetch

    const error = await requestJson(
      'http://127.0.0.1:8787',
      '/api/failure',
      undefined,
      Date.now() + 1000,
      fetchImpl,
    ).then(() => null, caught => caught)

    expect(error?.message).toBe('HTTP 502')
    expect(error?.code).toBe('HTTP_502')
    expect(JSON.stringify(error)).not.toContain(sentinel)
  })

  test('maps a bounded non-JSON HTTP error body before attempting JSON parsing', async () => {
    const sentinel = '<html>PRIVATE_REMOTE_BODY</html>'
    const fetchImpl = (async () => new Response(sentinel, {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    })) as typeof fetch

    const error = await requestJson(
      'http://127.0.0.1:8787',
      '/api/html-failure',
      undefined,
      Date.now() + 1000,
      fetchImpl,
    ).then(() => null, caught => caught)

    expect(error?.message).toBe('HTTP 502')
    expect(error?.code).toBe('HTTP_502')
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
        session_count: 3,
        sessions: [
          maskSessionId('session-auto-draft'),
          maskSessionId('session-auto-review'),
          maskSessionId('session-auto-story-state'),
        ],
      },
      manual: {
        stages: ['manual_recheck'],
        session_count: 1,
        sessions: [maskSessionId('session-manual')],
      },
      independent_stage_sessions: true,
      tasks_different: true,
      sessions_different: true,
      source_locked: false,
      quarantines: 0,
    })
    for (const privateValue of [
      fingerprint,
      'task-auto',
      'task-manual',
      'session-auto-draft',
      'session-auto-review',
      'session-auto-story-state',
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

  test('accepts production-shaped failed, cache-hit, and resumed stage Runs', async () => {
    const automaticRuns = [
      stageRun(201, 'draft', 'task-auto', 'session-auto-draft', {
        artifact_id: 701, attempt: 1,
      }),
      stageRun(202, 'quality_review', 'task-auto', undefined, {
        status: 'failed', artifact_id: 702, attempt: 1,
      }),
      stageRun(203, 'draft', 'task-auto', undefined, {
        cache_hit: true, artifact_id: 701, attempt: 1,
      }),
      stageRun(204, 'quality_review', 'task-auto', 'session-auto-review', {
        artifact_id: 703, attempt: 2,
      }),
      stageRun(205, 'story_state_sync', 'task-auto', 'session-auto-story-state', {
        artifact_id: 704, attempt: 1,
      }),
    ]
    const scenario = deterministicSmokeFetch({
      automaticRuns,
      automaticStates: [
        recoveryRun({ output_ref: recoveryOutput({}, {
          attempts: 1,
          next_run_at: '2000-01-01T00:00:00.000Z',
        }) }),
        recoveryRun({ status: 'success', output_ref: undefined }),
      ],
    })

    const result = await runSmokeScenario(scenario)

    expect(result.exitCode).toBe(0)
    expect(result.errors).toEqual([])
    expect(JSON.parse(result.logs[0]).automatic).toEqual({
      run_id: 200,
      stages: ['draft', 'quality_review', 'story_state_sync'],
      session_count: 3,
      sessions: [
        maskSessionId('session-auto-draft'),
        maskSessionId('session-auto-review'),
        maskSessionId('session-auto-story-state'),
      ],
    })
    expect(scenario.calls).toContain('GET:/api/novel/runs/201?project_id=12')
    expect(scenario.calls).toContain('GET:/api/novel/runs/205?project_id=12')
    expect(scenario.calls.filter(call => (
      call === 'POST:/api/novel/projects/12/chapter-groups/200/execute'
    ))).toHaveLength(2)
  })

  test('does not reflect an unknown remote response code through the final logger', async () => {
    const sentinel = 'PRIVATE_REMOTE_BODY'
    const result = await runSmokeScenario(deterministicSmokeFetch({
      sourceErrorCode: sentinel,
    }))

    expect(result.exitCode).toBe(1)
    expect(result.logs).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(JSON.parse(result.errors[0])).toEqual({
      ok: false,
      stage: 'source_authority',
      error_code: 'HTTP_502',
    })
    expect(result.errors[0]).not.toContain(sentinel)
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

describe('Buda smoke package contract', () => {
  test('keeps the chapter-source alias while naming independent stage Sessions explicitly', () => {
    const packageJson = JSON.parse(readFileSync(
      new URL('../ui/server/package.json', import.meta.url),
      'utf8',
    ))
    const command = 'node ../../scripts/check-buda-chapter-task-session.mjs'
    expect(packageJson.scripts['smoke:buda:independent-stage-sessions']).toBe(command)
    expect(packageJson.scripts['smoke:buda:chapter-source']).toBe(command)
  })
})
