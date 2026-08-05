# Buda Smoke Retry Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Buda chapter acceptance smoke honor the production `ready + next_run_at` retry contract while stopping before every unsafe replay.

**Architecture:** Keep the change inside the Buda-specific smoke script. Add one bounded pure projection for recoverable run state, one dependency-injected state machine for retry timing and mutation fencing, then wire those units into the existing HTTP-only terminal workflow without changing production services or the generic MCP runtime.

**Tech Stack:** JavaScript ES modules, TypeScript Bun tests, Fetch/Response, existing MangaForge novel HTTP routes.

---

## File Structure

- Modify `scripts/check-buda-chapter-task-session.mjs`: bounded recovery projection, dependency-injected automatic-run state machine, preflight quarantine check, and HTTP wiring.
- Modify `scripts/check-buda-chapter-task-session.test.ts`: pure projection tests, deterministic state-machine tests, terminal workflow tests, hostile input coverage, and corrected monotonic run fixtures.

Do not modify the production chapter executor, queue worker, MCP runtime, MCP client, Buda Adapter, stores, or workspace runtime files.

### Task 1: Project Only the Safe Recoverable Run State

**Files:**
- Modify: `scripts/check-buda-chapter-task-session.mjs:48-64,248-258,510-519`
- Test: `scripts/check-buda-chapter-task-session.test.ts:1-16,641-705`

- [ ] **Step 1: Import the new projection and add a canonical run fixture**

Add `projectRunRecoveryState` to the test import and add this fixture after `stageRun()`:

```ts
function recoveryRun(overrides: Record<string, unknown> = {}) {
  const chapter = {
    id: 34,
    status: 'ready',
    attempts: 1,
    next_run_at: '2026-08-05T01:02:03.000Z',
    ...((overrides.chapter as Record<string, unknown> | undefined) || {}),
  }
  const group = {
    current_index: 0,
    chapters: [chapter],
    ...((overrides.group as Record<string, unknown> | undefined) || {}),
  }
  const { chapter: _chapter, group: _group, ...runOverrides } = overrides
  return {
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'ready',
    output_ref: JSON.stringify(group),
    ...runOverrides,
  }
}
```

- [ ] **Step 2: Write failing projection tests**

Add these tests to `Buda smoke input and public receipt projection`:

```ts
test('projects only the bounded recovery state for the target chapter', () => {
  expect(projectRunRecoveryState(recoveryRun(), 200, 12, 34, 0)).toEqual({
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'ready',
    chapter_id: 34,
    attempts: 1,
    next_run_at: '2026-08-05T01:02:03.000Z',
    next_run_at_ms: Date.parse('2026-08-05T01:02:03.000Z'),
  })
})

test('fails closed on malformed or regressing recovery state', () => {
  const malformedCandidates = [
    recoveryRun({ chapter: { id: 35 } }),
    recoveryRun({ chapter: { status: 'failed' } }),
    recoveryRun({ chapter: { attempts: -1 } }),
    recoveryRun({ chapter: { attempts: 1.5 } }),
    recoveryRun({ chapter: { attempts: 1 }, group: { current_index: 1 } }),
    recoveryRun({ group: { chapters: [] } }),
    recoveryRun({ chapter: { next_run_at: '' } }),
    recoveryRun({ chapter: { next_run_at: 'tomorrow' } }),
  ]
  for (const candidate of malformedCandidates) {
    expect(() => projectRunRecoveryState(candidate, 200, 12, 34, 0))
      .toThrow('invalid automatic recovery state')
  }
  expect(() => projectRunRecoveryState(
    recoveryRun({ chapter: { attempts: 1 } }),
    200,
    12,
    34,
    2,
  )).toThrow('invalid automatic recovery state')
})

test('does not execute hostile recovery-state getters or Proxy traps', () => {
  const sentinel = 'PRIVATE_RECOVERY_SENTINEL'
  let getterCalls = 0
  let proxyCalls = 0
  const hostile = recoveryRun()
  Object.defineProperty(hostile, 'output_ref', {
    configurable: true,
    get() {
      getterCalls += 1
      throw new Error(sentinel)
    },
  })
  const proxied = new Proxy(recoveryRun(), {
    get() {
      proxyCalls += 1
      throw new Error(sentinel)
    },
    getOwnPropertyDescriptor() {
      proxyCalls += 1
      throw new Error(sentinel)
    },
  })
  for (const candidate of [hostile, proxied]) {
    let error: unknown
    try {
      projectRunRecoveryState(candidate, 200, 12, 34, 0)
    } catch (caught) {
      error = caught
    }
    expect((error as any)?.code).toBe('INVALID_RUN_RECOVERY_STATE')
    expect(JSON.stringify(error)).not.toContain(sentinel)
  }
  expect(getterCalls).toBe(0)
  expect(proxyCalls).toBe(0)
})

test('does not project run errors or remote identities', () => {
  const projected = projectRunRecoveryState(recoveryRun({
    error_message: 'PRIVATE_ERROR',
    session_id: 'PRIVATE_SESSION',
  }), 200, 12, 34, 0)
  expect(JSON.stringify(projected)).not.toContain('PRIVATE_ERROR')
  expect(JSON.stringify(projected)).not.toContain('PRIVATE_SESSION')
})
```

- [ ] **Step 3: Run the projection tests to verify RED**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: FAIL because `projectRunRecoveryState` is not exported.

- [ ] **Step 4: Add bounded group parsing and the recovery projection**

Add a non-negative integer helper beside `positiveSafeInteger()`:

```js
function nonNegativeSafeInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined
}
```

Add a run-group parser beside `parseBoundedReceiptRef()`:

```js
function parseBoundedRunGroup(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > MAX_RESPONSE_BYTES) return undefined
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch {
    return undefined
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !types.isProxy(parsed)
    ? parsed
    : undefined
}
```

Export this projection after `projectRunState()`:

```js
export function projectRunRecoveryState(
  value,
  expectedRunId,
  expectedProjectId,
  expectedChapterId,
  previousAttempts = 0,
) {
  try {
    const run = projectRunState(value, expectedRunId, expectedProjectId, 'chapter_group_generation')
    const prior = nonNegativeSafeInteger(previousAttempts)
    const group = parseBoundedRunGroup(ownDataValue(value, 'output_ref'))
    const currentIndex = nonNegativeSafeInteger(ownDataValue(group, 'current_index'))
    const chapters = ownDataValue(group, 'chapters')
    const chapterCount = ownDataValue(chapters, 'length')
    if (run.status !== 'ready' || prior === undefined || currentIndex === undefined
      || !Array.isArray(chapters) || types.isProxy(chapters)
      || !Number.isSafeInteger(chapterCount) || chapterCount < 1 || chapterCount > 50
      || currentIndex >= chapterCount) throw new Error('invalid')
    const chapter = ownDataValue(chapters, String(currentIndex))
    const chapterId = positiveSafeInteger(ownDataValue(chapter, 'id'))
    const chapterStatus = boundedString(ownDataValue(chapter, 'status'), STAGE)
    const attempts = nonNegativeSafeInteger(ownDataValue(chapter, 'attempts'))
    const nextRunAt = boundedLabel(ownDataValue(chapter, 'next_run_at'), 64)
    const nextRunAtMs = typeof nextRunAt === 'string' ? Date.parse(nextRunAt) : Number.NaN
    if (chapterId !== expectedChapterId || chapterStatus !== 'ready' || attempts === undefined
      || attempts < prior || !Number.isFinite(nextRunAtMs)
      || new Date(nextRunAtMs).toISOString() !== nextRunAt) throw new Error('invalid')
    return {
      ...run,
      chapter_id: chapterId,
      attempts,
      next_run_at: nextRunAt,
      next_run_at_ms: nextRunAtMs,
    }
  } catch {
    throw safeError('invalid automatic recovery state', 'INVALID_RUN_RECOVERY_STATE')
  }
}
```

The catch intentionally normalizes `projectRunState()`, descriptor, parse, and date failures to the one public recovery code, so hostile inputs cannot select a different diagnostic or reflect private text.

- [ ] **Step 5: Run tests and commit the projection**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
node --check scripts/check-buda-chapter-task-session.mjs
```

Expected: PASS with zero failures.

Commit:

```bash
git add scripts/check-buda-chapter-task-session.mjs scripts/check-buda-chapter-task-session.test.ts
git diff --cached --check
git commit -m "test(mcp): project Buda smoke recovery state"
```

### Task 2: Add the Bounded Automatic-Run State Machine

**Files:**
- Modify: `scripts/check-buda-chapter-task-session.mjs:329-338,593-608`
- Test: `scripts/check-buda-chapter-task-session.test.ts` after the projection tests

- [ ] **Step 1: Import and define deterministic state-machine helpers**

Add `driveAutomaticRunToSuccess` to the test import. Add:

```ts
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
  const waits: number[] = []
  return {
    get executions() { return executions },
    waits,
    now: () => now,
    wait: async (milliseconds: number) => {
      waits.push(milliseconds)
      now += milliseconds
    },
    readRun: async () => states.shift() || terminalFallback,
    executeRun: async () => { executions += 1 },
    assertNoQuarantine: async () => projectQuarantineList(quarantines.shift() || []),
  }
}
```

- [ ] **Step 2: Write failing state-machine tests**

Add tests covering these exact cases:

```ts
test('returns after direct success without replay or waiting', async () => {
  const driver = automaticDriver({ states: [{
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'success',
  }] })
  const result = await driveAutomaticRunToSuccess({
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    readRun: driver.readRun, executeRun: driver.executeRun,
    assertNoQuarantine: driver.assertNoQuarantine,
  }, { now: driver.now, wait: driver.wait })
  expect(result).toMatchObject({ status: 'success', executions: 1 })
  expect(driver.executions).toBe(1)
  expect(driver.waits).toEqual([])
})

test('waits for next_run_at and executes the original run again', async () => {
  const driver = automaticDriver({
    now: Date.parse('2026-08-05T01:00:00.000Z'),
    states: [
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2026-08-05T01:02:00.000Z' } }),
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2026-08-05T01:02:00.000Z' } }),
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
  expect(result.status).toBe('success')
  expect(driver.waits).toEqual([120_000])
  expect(driver.executions).toBe(2)
})

test('stops before replay when a quarantine exists', async () => {
  const driver = automaticDriver({
    states: [recoveryRun({ chapter: { next_run_at: '2026-08-05T00:59:00.000Z' } })],
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

test('continues polling queued and running states without replay', async () => {
  const driver = automaticDriver({ states: [
    { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'queued' },
    { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'running' },
    { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'success' },
  ] })
  const result = await driveAutomaticRunToSuccess({
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    readRun: driver.readRun, executeRun: driver.executeRun,
    assertNoQuarantine: driver.assertNoQuarantine,
  }, { now: driver.now, wait: driver.wait })
  expect(result).toMatchObject({ status: 'success', executions: 1 })
  expect(driver.executions).toBe(1)
  expect(driver.waits).toEqual([100, 100])
})
```

Add the remaining deterministic cases:

```ts
test('uses the initial execution plus at most two recoveries', async () => {
  const driver = automaticDriver({
    states: [
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2000-01-01T00:00:00.000Z' } }),
      recoveryRun({ chapter: { attempts: 2, next_run_at: '2000-01-01T00:00:00.000Z' } }),
      recoveryRun({ status: 'success', output_ref: undefined }),
    ],
  })
  const result = await driveAutomaticRunToSuccess({
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    readRun: driver.readRun, executeRun: driver.executeRun,
    assertNoQuarantine: driver.assertNoQuarantine,
  }, { now: driver.now, wait: driver.wait })
  expect(result).toMatchObject({ status: 'success', executions: 3 })
  expect(driver.executions).toBe(3)
  expect(driver.waits).toEqual([])
})

test('fails before a fourth automatic execution', async () => {
  const driver = automaticDriver({
    states: [1, 2, 3].map(attempts => recoveryRun({
      chapter: { attempts, next_run_at: '2000-01-01T00:00:00.000Z' },
    })),
  })
  await expect(driveAutomaticRunToSuccess({
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    readRun: driver.readRun, executeRun: driver.executeRun,
    assertNoQuarantine: driver.assertNoQuarantine,
  }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
    code: 'AUTOMATIC_RETRY_LIMIT_EXHAUSTED',
  })
  expect(driver.executions).toBe(3)
})

test('rejects retry attempt regression', async () => {
  const driver = automaticDriver({
    states: [
      recoveryRun({ chapter: { attempts: 2, next_run_at: '2000-01-01T00:00:00.000Z' } }),
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2000-01-01T00:00:00.000Z' } }),
    ],
  })
  await expect(driveAutomaticRunToSuccess({
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    readRun: driver.readRun, executeRun: driver.executeRun,
    assertNoQuarantine: driver.assertNoQuarantine,
  }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
    code: 'INVALID_RUN_RECOVERY_STATE',
  })
})

test('keeps terminal automatic-run error codes exact', async () => {
  for (const status of ['failed', 'canceled', 'paused']) {
    const driver = automaticDriver({ states: [{
      id: 200, project_id: 12, run_type: 'chapter_group_generation', status,
    }] })
    await expect(driveAutomaticRunToSuccess({
      runId: 200, projectId: 12, chapterId: 34,
      deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
      readRun: driver.readRun, executeRun: driver.executeRun,
      assertNoQuarantine: driver.assertNoQuarantine,
    }, { now: driver.now, wait: driver.wait })).rejects.toMatchObject({
      code: `AUTOMATIC_RUN_${status.toUpperCase()}`,
    })
    expect(driver.executions).toBe(1)
  }
})

test('rejects unknown automatic status and preserves timeout', async () => {
  const unknown = automaticDriver({ states: [{
    id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'mystery',
  }] })
  const baseInput = {
    runId: 200, projectId: 12, chapterId: 34,
    deadline: Number.MAX_SAFE_INTEGER, pollIntervalMs: 100,
    executeRun: unknown.executeRun,
  }
  await expect(driveAutomaticRunToSuccess({
    ...baseInput,
    readRun: unknown.readRun,
    assertNoQuarantine: unknown.assertNoQuarantine,
  }, { now: unknown.now, wait: unknown.wait })).rejects.toMatchObject({
    code: 'INVALID_RUN_RECOVERY_STATE',
  })

  const timeout = Object.assign(new Error('smoke timeout'), { code: 'SMOKE_TIMEOUT' })
  const waiting = automaticDriver({ states: [recoveryRun({
    chapter: { next_run_at: '2099-01-01T00:00:00.000Z' },
  })] })
  await expect(driveAutomaticRunToSuccess({
    ...baseInput,
    readRun: waiting.readRun,
    executeRun: waiting.executeRun,
    assertNoQuarantine: waiting.assertNoQuarantine,
  }, {
    now: waiting.now,
    wait: async () => { throw timeout },
  })).rejects.toBe(timeout)
})
```

- [ ] **Step 3: Run the state-machine tests to verify RED**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: FAIL because `driveAutomaticRunToSuccess` is not exported.

- [ ] **Step 4: Implement the state machine with a three-execution ceiling**

Add this exported state machine immediately after the existing `pollRunSuccess()`. Keep the old helper until Task 3 switches `main()` to the new dependency-injected path; this keeps the terminal workflow green at the Task 2 commit boundary.

```js
const MAX_AUTOMATIC_EXECUTIONS = 3

export async function driveAutomaticRunToSuccess(input, dependencies = {}) {
  const now = dependencies.now || Date.now
  const wait = dependencies.wait || sleepPoll
  let executions = 1
  let previousAttempts = 0
  while (true) {
    const detail = await input.readRun()
    const run = projectRunState(detail, input.runId, input.projectId, 'chapter_group_generation')
    if (run.status === 'success') return { ...run, executions }
    if (['failed', 'canceled', 'paused'].includes(run.status)) {
      throw safeError('automatic run did not succeed', `AUTOMATIC_RUN_${run.status.toUpperCase()}`)
    }
    if (run.status === 'running' || run.status === 'queued') {
      await wait(input.pollIntervalMs, input.deadline)
      continue
    }
    if (run.status !== 'ready') {
      throw safeError('invalid automatic recovery state', 'INVALID_RUN_RECOVERY_STATE')
    }
    const recovery = projectRunRecoveryState(
      detail,
      input.runId,
      input.projectId,
      input.chapterId,
      previousAttempts,
    )
    previousAttempts = recovery.attempts
    await input.assertNoQuarantine()
    const retryWaitMs = Math.max(0, recovery.next_run_at_ms - now())
    if (retryWaitMs > 0) {
      await wait(retryWaitMs, input.deadline)
      continue
    }
    if (executions >= MAX_AUTOMATIC_EXECUTIONS) {
      throw safeError('automatic retry limit exhausted', 'AUTOMATIC_RETRY_LIMIT_EXHAUSTED')
    }
    await input.executeRun()
    executions += 1
  }
}
```

The loop deliberately reads and validates the run again after a future wait. That second pass also repeats the quarantine check immediately before mutation.

- [ ] **Step 5: Run tests and commit the state machine**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
node --check scripts/check-buda-chapter-task-session.mjs
```

Expected: PASS with zero failures.

Commit:

```bash
git add scripts/check-buda-chapter-task-session.mjs scripts/check-buda-chapter-task-session.test.ts
git diff --cached --check
git commit -m "fix(mcp): bound Buda smoke run recovery"
```

### Task 3: Wire Recovery Into the HTTP Terminal Workflow

**Files:**
- Modify: `scripts/check-buda-chapter-task-session.mjs:646-720`
- Test: `scripts/check-buda-chapter-task-session.test.ts:79-168,782-end`

- [ ] **Step 1: Replace the terminal fixture with configurable run and quarantine reads**

Replace `deterministicSmokeFetch()` with the complete fixture below. The stage run IDs move from `101-104` to `201-204`, so every child receipt is monotonically newer than parent run `200`.

```ts
function deterministicSmokeFetch(options: {
  automaticReceiptOverrides?: Record<string, unknown>
  automaticStates?: Array<Record<string, unknown>>
  quarantineReads?: Array<unknown[]>
} = {}) {
  const calls: string[] = []
  let chapterReads = 0
  let summaryReads = 0
  const defaultAutomaticState = {
    id: 200,
    project_id: 12,
    run_type: 'chapter_group_generation',
    status: 'success',
  }
  const automaticStates = [...(options.automaticStates || [defaultAutomaticState])]
  const terminalAutomaticState = automaticStates.at(-1) || defaultAutomaticState
  const quarantineReads = [...(options.quarantineReads || [[]])]
  const automaticRuns = [
    stageRun(201, 'draft', 'task-auto', 'session-auto', options.automaticReceiptOverrides),
    stageRun(202, 'quality_review', 'task-auto', 'session-auto'),
    stageRun(203, 'story_state_sync', 'task-auto', 'session-auto'),
  ]
  const manualRun = stageRun(204, 'manual_recheck', 'task-manual', 'session-manual')
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
      return json({ ok: true })
    }
    if (path === '/api/novel/runs/200?project_id=12') {
      return json(automaticStates.shift() || terminalAutomaticState)
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

  return { calls, fetchImpl }
}
```

Add this lifecycle helper immediately after the fixture so every new test restores global spies:

```ts
async function runSmokeScenario(scenario: ReturnType<typeof deterministicSmokeFetch>) {
  const logs: string[] = []
  const errors: string[] = []
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(scenario.fetchImpl)
  const logSpy = spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
    logs.push(String(values[0] ?? ''))
  })
  const errorSpy = spyOn(console, 'error').mockImplementation((...values: unknown[]) => {
    errors.push(String(values[0] ?? ''))
  })
  try {
    const exitCode = await main([
      '--base-url', 'http://127.0.0.1:8787',
      '--project-id', '12',
      '--chapter-id', '34',
      '--timeout-ms', '1000',
      '--poll-interval-ms', '10',
    ])
    return { exitCode, logs, errors }
  } finally {
    errorSpy.mockRestore()
    logSpy.mockRestore()
    fetchSpy.mockRestore()
  }
}
```

In the existing successful terminal test, add this assertion after the other call-count assertions to pin the direct-success path to one execution:

```ts
expect(scenario.calls.filter(call => call ===
  'POST:/api/novel/projects/12/chapter-groups/200/execute')).toHaveLength(1)
```

- [ ] **Step 2: Write failing recovery, quarantine, and retry-ceiling terminal tests**

Add these tests to `Buda smoke terminal workflow`:

```ts
test('honors next_run_at and re-executes the same automatic group', async () => {
  const scenario = deterministicSmokeFetch({
    automaticStates: [
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2000-01-01T00:00:00.000Z' } }),
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'success' },
    ],
  })
  const result = await runSmokeScenario(scenario)
  expect(result.exitCode).toBe(0)
  expect(result.errors).toEqual([])
  expect(scenario.calls.filter(call => call ===
    'POST:/api/novel/projects/12/chapter-groups/200/execute')).toHaveLength(2)
})

test('stops before recovery execute when quarantine appears', async () => {
  const scenario = deterministicSmokeFetch({
    automaticStates: [
      recoveryRun({ chapter: { attempts: 1, next_run_at: '2000-01-01T00:00:00.000Z' } }),
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'failed' },
    ],
    quarantineReads: [[], [{ id: 'quarantine-1' }]],
  })
  const result = await runSmokeScenario(scenario)
  expect(result.exitCode).toBe(1)
  expect(result.logs).toEqual([])
  expect(result.errors.map(value => JSON.parse(value))).toEqual([{
    ok: false,
    stage: 'automatic_poll',
    error_code: 'MCP_QUARANTINE_REMAINS',
  }])
  expect(scenario.calls.filter(call => call ===
    'POST:/api/novel/projects/12/chapter-groups/200/execute')).toHaveLength(1)
  expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
})

test('stops before chapter-group creation when preflight quarantine exists', async () => {
  const scenario = deterministicSmokeFetch({
    quarantineReads: [[{ id: 'quarantine-1' }]],
  })
  const result = await runSmokeScenario(scenario)
  expect(result.exitCode).toBe(1)
  expect(result.logs).toEqual([])
  expect(result.errors.map(value => JSON.parse(value))).toEqual([{
    ok: false,
    stage: 'automatic_quarantines',
    error_code: 'MCP_QUARANTINE_REMAINS',
  }])
  expect(scenario.calls).not.toContain('POST:/api/novel/projects/12/chapter-groups/start')
  expect(scenario.calls.filter(call => call ===
    'POST:/api/novel/projects/12/chapter-groups/200/execute')).toHaveLength(0)
})

test('reports retry exhaustion and never sends a fourth execute', async () => {
  const immediateReady = (attempts: number) => recoveryRun({
    chapter: { attempts, next_run_at: '2000-01-01T00:00:00.000Z' },
  })
  const scenario = deterministicSmokeFetch({
    automaticStates: [
      immediateReady(1),
      immediateReady(2),
      immediateReady(3),
      { id: 200, project_id: 12, run_type: 'chapter_group_generation', status: 'failed' },
    ],
  })
  const result = await runSmokeScenario(scenario)
  expect(result.exitCode).toBe(1)
  expect(result.logs).toEqual([])
  expect(result.errors.map(value => JSON.parse(value))).toEqual([{
    ok: false,
    stage: 'automatic_poll',
    error_code: 'AUTOMATIC_RETRY_LIMIT_EXHAUSTED',
  }])
  expect(scenario.calls.filter(call => call ===
    'POST:/api/novel/projects/12/chapter-groups/200/execute')).toHaveLength(3)
  expect(scenario.calls).not.toContain('POST:/api/novel/chapters/34/prose-quality')
})
```

- [ ] **Step 3: Run terminal workflow tests to verify RED**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: FAIL because `main()` still performs one execute and uses pure polling; the new re-execute, preflight quarantine, and retry-ceiling assertions are not yet satisfied.

- [ ] **Step 4: Add reusable HTTP closures and preflight quarantine enforcement**

Inside `main()`, after chapter preflight and before `automatic_baseline`, add:

```js
const assertNoQuarantine = async () => projectQuarantineList(await requestJson(
  options.baseUrl,
  '/api/mcp/quarantines',
  undefined,
  deadline,
))

stage = 'automatic_quarantines'
await assertNoQuarantine()
```

After starting the group, define the original mutation once:

```js
const automaticExecuteBody = {
  max_chapters: 1,
  production_mode: 'full_auto',
  force_scene_cards: true,
  allow_incomplete: false,
  auto_repair_missing_material: true,
}
const executeAutomaticRun = async () => projectOperationOk(await requestJson(
  options.baseUrl,
  `/api/novel/projects/${options.projectId}/chapter-groups/${automatic.run_id}/execute`,
  { method: 'POST', body: automaticExecuteBody },
  deadline,
))
```

- [ ] **Step 5: Replace the single-execute/pure-poll sequence with the state machine**

Delete `pollRunSuccess()`. Replace the existing inline execute request and subsequent `pollRunSuccess(...)` call with:

```js
stage = 'automatic_execute'
await executeAutomaticRun()

stage = 'automatic_poll'
await driveAutomaticRunToSuccess({
  runId: automatic.run_id,
  projectId: options.projectId,
  chapterId: options.chapterId,
  deadline,
  pollIntervalMs: options.pollIntervalMs,
  readRun: () => requestJson(
    options.baseUrl,
    `/api/novel/runs/${automatic.run_id}?project_id=${options.projectId}`,
    undefined,
    deadline,
  ),
  executeRun: executeAutomaticRun,
  assertNoQuarantine,
})
```

Keep the existing final quarantine read after manual recheck. It remains independent evidence that automatic and manual work both released their lifecycle fences.

- [ ] **Step 6: Run tests and commit the workflow wiring**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
node --check scripts/check-buda-chapter-task-session.mjs
```

Expected: PASS with zero failures, including existing hostile transport and safe terminal-output assertions.

Commit:

```bash
git add scripts/check-buda-chapter-task-session.mjs scripts/check-buda-chapter-task-session.test.ts
git diff --cached --check
git commit -m "test(mcp): recover bounded Buda smoke retries"
```

### Task 4: Run Automated Gates Without a Live Buda Mutation

**Files:**
- Verify only: `scripts/check-buda-chapter-task-session.mjs`
- Verify only: `scripts/check-buda-chapter-task-session.test.ts`
- Never stage: `workspace/assets.json`
- Never read or stage: ignored MCP credentials, quarantine internals, Zhuque runtime inputs, or generated reports

- [ ] **Step 1: Run the focused smoke and syntax gates**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
node --check scripts/check-buda-chapter-task-session.mjs
```

Expected: PASS with zero failures and syntax errors.

- [ ] **Step 2: Run focused MCP/source server tests**

Run:

```bash
cd ui/server && bun test \
  src/mcp/adapters/buda-drive.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
```

Expected: PASS with zero failures.

- [ ] **Step 3: Run complete Server and Web suites**

Run in separate commands:

```bash
cd ui/server && bun test
```

```bash
cd ui/web && bun test
```

Expected: both complete suites PASS with zero failures and no new unhandled rejection or hung worker.

- [ ] **Step 4: Run repository checks and production builds**

Run from repository root:

```bash
bun run check:refactor-boundaries
bun run build:server
bun run build:web
```

Expected: all commands exit 0.

- [ ] **Step 5: Audit scope and safety**

Run:

```bash
git status --short
git log -4 --oneline
git diff HEAD~3 --check
git diff HEAD~3 --name-only
```

Expected:

- the three implementation commits touch only the two smoke files;
- `workspace/assets.json` remains modified and unstaged;
- no credential, quarantine, generated runtime, or Zhuque file is staged;
- no live Buda mutation was executed during this plan.

Do not create a success verification document for live Buda acceptance. That document remains gated on a later successful end-to-end Buda run after the separate transport-compatibility work and explicit quarantine coordination.
