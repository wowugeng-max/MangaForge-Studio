# MCP Reactive Operation Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve one complete Buda stage-entry readiness gate while eliminating redundant cross-tool probes before each later operation, without weakening mutation replay safety or changing default generic MCP behavior.

**Architecture:** Add an Adapter-selected readiness mode to `McpStabilityPolicy`. The generic controller defaults to the existing proactive flow; reactive mode executes the real operation first, directly retries only exact pre-dispatch rejections, and rotates plus probes only after transient read failures. Buda opts into reactive mode in its Adapter, while `invokeChapterStage()` retains its explicit stage-entry `ensureReady()` call.

**Tech Stack:** TypeScript, Bun 1.3.x, Bun test, Express, MCP Streamable HTTP, existing `McpGenerationDeadline` and Adapter/Runtime abstractions.

---

## Scope and working-tree baseline

Source specification: `docs/superpowers/specs/2026-08-07-mcp-reactive-operation-readiness-design.md`.

The implementation is one focused subsystem: MCP operation readiness and its Buda policy selection. Do not modify HTTP startup semantics, MCP tool argument envelopes, GenerationSource switching, remote Agent Session lifetime, or quarantine deletion behavior.

The current `main` working tree already contains two previously tested, uncommitted readiness precursors. Preserve them:

- `BudaAdapter.stabilityPolicy.requiredConsecutiveSuccesses` is `1`, with its matching Adapter test.
- The initial bound-Agent lookup in `McpGenerationSource` is wrapped in `stability.runRead()`, with the regression `stabilizes the initial bound-Agent lookup before opening the first stage`.

Do not stage `ui/server/.workspace-config.json` or `workspace/assets.json`. They are local acceptance state, not product changes.

## File responsibility map

- `ui/server/src/mcp/adapters/types.ts`: public provider-neutral stability policy and readiness-mode types.
- `ui/server/src/mcp/stability.ts`: provider-neutral proactive/reactive retry state machine.
- `ui/server/src/mcp/stability.test.ts`: deterministic policy-mode, deadline, retry, and mutation-safety tests.
- `ui/server/src/mcp/adapters/buda-adapter.ts`: Buda policy selection and explicit stage-entry gate.
- `ui/server/src/mcp/adapters/buda-adapter.test.ts`: Buda policy and successful stage-flow regression tests.
- `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: already-present stabilization of the initial bound-Agent lookup.
- `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`: already-present initial Agent lookup regression.
- `scripts/check-buda-chapter-task-session.mjs`: existing real-acceptance driver; no planned product change.

### Task 1: Preserve the initial bound-Agent stabilization precursor

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts:1413`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts:4548`

- [ ] **Step 1: Inspect the existing focused diff and keep its exact boundary**

The production lookup must remain:

```ts
const pendingAgents = resolved.stability.runRead(
  resolved.adapter.stabilityPolicy,
  {
    deadline: this.deadline,
    phase: 'transport',
    pollInitialMs: resolved.server.poll_initial_ms,
    pollMaxMs: resolved.server.poll_max_ms,
    toolTimeoutMs: resolved.server.tool_timeout_ms,
  },
  () => {
    const pending = resolved.adapter.listAgents(this.remoteOptions(resolved.server.tool_timeout_ms))
    assertSafeAwaitable(pending, invalidAgentList)
    return pending
  },
)
assertSafeAwaitable(pendingAgents, invalidAgentList)
const agentIds = projectAgentIds(await pendingAgents)
```

The regression must keep proving that the first exact pre-dispatch failure is recovered before opening the first stage and that no duplicate stage is created.

- [ ] **Step 2: Run the focused precursor regression**

Run:

```bash
cd ui/server
bun test src/novel-writing-service/generation-source/generation-source.test.ts -t "stabilizes the initial bound-Agent lookup before opening the first stage"
```

Expected: PASS; `agentAttempts` is `2`, `stabilityReads` is `1`, and `{ open: 1, runStage: 1 }` remains true.

- [ ] **Step 3: Commit only the precursor files**

```bash
git add ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git diff --cached --check
git commit -m "fix(mcp): stabilize initial bound agent lookup"
```

Expected: one commit containing only the two GenerationSource files.

### Task 2: Specify reactive controller behavior with failing tests

**Files:**
- Modify: `ui/server/src/mcp/stability.test.ts`

- [ ] **Step 1: Add a test helper for selecting the readiness mode**

Apply these two exact additions to the `stabilityHarness` options and policy construction without changing existing callers:

```diff
 options: {
   totalMs?: number
   requiredConsecutiveSuccesses?: number
   warmupWindowMs?: number
   pollInitialMs?: number
   pollMaxMs?: number
+  operationReadinessMode?: 'proactive' | 'reactive'
 } = {},

 const policy: McpStabilityPolicy = {
+  ...(options.operationReadinessMode
+    ? { operationReadinessMode: options.operationReadinessMode }
+    : {}),
   requiredConsecutiveSuccesses: options.requiredConsecutiveSuccesses ?? 2,
   warmupWindowMs: options.warmupWindowMs ?? 100,
   classify,
   async probe(client, remoteOptions) {
     await client.listTools({ ...remoteOptions, refreshTools: true })
     await client.callTool('provider-readiness-probe', {}, { ...remoteOptions, operation: 'read_safe' })
   },
 }
```

- [ ] **Step 2: Add exact reactive-mode tests**

Add these cases to `describe('MCP stability coordinator', ...)`:

```ts
test.each(['read_safe', 'mutation'] as const)(
  'reactive mode retries an exact pre-dispatch %s without a readiness probe',
  async operationKind => {
    const harness = stabilityHarness([], { operationReadinessMode: 'reactive' })
    let calls = 0
    const operation = async () => {
      calls += 1
      if (calls === 1) throw exactNotReadyEvidence()
      return 'operation-result'
    }

    const result = operationKind === 'read_safe'
      ? await harness.controller.runRead(harness.policy, harness.input, operation)
      : await harness.controller.runMutation(harness.policy, harness.input, operation)

    expect(result).toBe('operation-result')
    expect(calls).toBe(2)
    expect(harness.sleeps).toEqual([5])
    expect(harness.acquisitions).toBe(0)
    expect(harness.probeLog).toEqual([])
  },
)

test('reactive mode rotates and probes after a transient read failure', async () => {
  const harness = stabilityHarness(['ok', 'ok'], {
    operationReadinessMode: 'reactive',
  })
  let calls = 0

  const result = await harness.controller.runRead(
    harness.policy,
    { ...harness.input, phase: 'session_poll' },
    async () => {
      calls += 1
      if (calls === 1) throw new McpError('MCP_CONNECTION_LOST', 'lost')
      return 'read-result'
    },
  )

  expect(result).toBe('read-result')
  expect(calls).toBe(2)
  expect(harness.invalidations).toBe(1)
  expect(harness.acquisitions).toBe(1)
  expect(harness.probeLog.map(entry => entry.split(':', 1)[0])).toEqual([
    'tools/list', 'probe/read',
    'tools/list', 'probe/read',
  ])
})

test('reactive mode never probes or replays an ambiguous mutation', async () => {
  const harness = stabilityHarness([], { operationReadinessMode: 'reactive' })
  const ambiguous = new McpError('MCP_CONNECTION_LOST', 'lost after dispatch')
  let calls = 0

  const caught = await harness.controller.runMutation(
    harness.policy,
    { ...harness.input, phase: 'session_create' },
    async () => {
      calls += 1
      throw ambiguous
    },
  ).catch(error => error)

  expect(caught).toBe(ambiguous)
  expect(calls).toBe(1)
  expect(harness.acquisitions).toBe(0)
  expect(harness.probeLog).toEqual([])
})

test('reactive pre-dispatch retries stop at the shared total deadline', async () => {
  const harness = stabilityHarness([], {
    totalMs: 12,
    pollInitialMs: 5,
    pollMaxMs: 10,
    operationReadinessMode: 'reactive',
  })

  const caught = await harness.controller.runRead(
    harness.policy,
    { ...harness.input, phase: 'drive_sync' },
    async () => { throw exactNotReadyEvidence() },
  ).catch(error => error)

  expect(caught).toMatchObject({
    code: 'MCP_SERVER_NOT_READY',
    details: { phase: 'drive_sync' },
  })
  expect(harness.sleeps.reduce((sum, value) => sum + value, 0)).toBe(12)
  expect(harness.acquisitions).toBe(0)
})
```

- [ ] **Step 3: Run the Stability suite and verify RED**

Run:

```bash
cd ui/server
bun test src/mcp/stability.test.ts
```

Expected: the new reactive tests fail because every recoverable operation still performs `ensureReady()` before the first call and after an exact pre-dispatch rejection. Existing proactive tests remain green.

### Task 3: Implement the provider-neutral readiness mode

**Files:**
- Modify: `ui/server/src/mcp/adapters/types.ts:31`
- Modify: `ui/server/src/mcp/stability.ts:151`
- Test: `ui/server/src/mcp/stability.test.ts`

- [ ] **Step 1: Add the public readiness-mode type**

Insert immediately before `McpStabilityPolicy`:

```ts
export type McpOperationReadinessMode = 'proactive' | 'reactive'

export type McpStabilityPolicy = {
  operationReadinessMode?: McpOperationReadinessMode
  requiredConsecutiveSuccesses: number
  warmupWindowMs: number
  classify(error: unknown, operation: McpOperationKind): McpFailureClass
  probe(client: McpClientPort, options: McpAdapterOperationOptions): Promise<void>
}
```

Do not put an Adapter ID, Buda tool name, or service error string in this type.

- [ ] **Step 2: Replace `runRecoverable` with mode-aware control flow**

Use this complete implementation in `ui/server/src/mcp/stability.ts`:

```ts
const runRecoverable = async <T>(
  policy: McpStabilityPolicy | undefined,
  input: McpStabilityInput,
  operationKind: McpOperationKind,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!policy) return operation()
  const readinessMode = policy.operationReadinessMode || 'proactive'
  const initialDelay = positiveInteger(input.pollInitialMs, 1)
  const maximumDelay = Math.max(initialDelay, positiveInteger(input.pollMaxMs, initialDelay))
  let retryDelay = initialDelay
  if (readinessMode === 'proactive') await ensureReady(policy, input)
  while (true) {
    remainingOrThrow(input)
    try {
      const result = await operation()
      remainingOrThrow(input)
      return result
    } catch (error) {
      throwDeadlineCauseForAbort(error, input)
      const failureClass: McpFailureClass = policy.classify(error, operationKind)
      const replayable = failureClass === 'not_ready_pre_dispatch'
        || (operationKind === 'read_safe' && failureClass === 'transient_read_failure')
      if (!replayable) throw error

      if (failureClass === 'transient_read_failure') {
        await dependencies.invalidateCurrent()
      }
      await boundedSleep(retryDelay, input)
      retryDelay = Math.min(maximumDelay, retryDelay * 2)

      if (readinessMode === 'proactive' || failureClass === 'transient_read_failure') {
        await ensureReady(policy, input)
      }
    }
  }
}
```

This preserves all existing proactive behavior. In reactive mode, exact pre-dispatch failures loop directly to the same operation after backoff; transient reads still rotate and prove readiness before retrying.

- [ ] **Step 3: Run the focused suite and verify GREEN**

Run:

```bash
cd ui/server
bun test src/mcp/stability.test.ts
```

Expected: all existing proactive tests and all new reactive tests pass.

- [ ] **Step 4: Run type/build verification for the new public policy field**

Run:

```bash
bun run build:server
```

Expected: exit code `0` and output artifact `/private/tmp/mangaforge-server-check.js` is produced.

- [ ] **Step 5: Commit the generic Stability change**

```bash
git add ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/stability.ts \
  ui/server/src/mcp/stability.test.ts
git diff --cached --check
git commit -m "feat(mcp): add reactive operation readiness"
```

Expected: one provider-neutral commit containing no Buda-specific condition.

### Task 4: Opt Buda into reactive readiness and preserve one stage-entry gate

**Files:**
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts:431`
- Test: `ui/server/src/mcp/adapters/buda-adapter.test.ts:292`

- [ ] **Step 1: Add failing Buda policy and stage-flow assertions**

Extend the existing readiness-policy test with:

```ts
expect(policy?.operationReadinessMode).toBe('reactive')
expect(policy?.requiredConsecutiveSuccesses).toBe(1)
expect(policy?.warmupWindowMs).toBe(15_000)
```

Add a successful-stage test that proves the Adapter itself invokes only one explicit gate:

```ts
test('keeps one explicit readiness gate at the start of a successful stage', async () => {
  const fake = createFakeClient()
  let readinessGates = 0
  const phases: string[] = []
  const stability = {
    async ensureReady(policy: any, input: any) {
      readinessGates += 1
      expect(policy.operationReadinessMode).toBe('reactive')
      phases.push(input.phase)
    },
    async runRead(_policy: any, _input: any, operation: any) {
      return operation()
    },
    async runMutation(_policy: any, _input: any, operation: any) {
      return operation()
    },
  }

  await expect(new BudaAdapter(fake.client as any).invokeChapterStage(
    invocationInput({ stability }),
  )).resolves.toMatchObject({ status: 'completed' })

  expect(readinessGates).toBe(1)
  expect(phases).toEqual(['transport'])
})
```

- [ ] **Step 2: Run the Buda Adapter suite and verify RED**

Run:

```bash
cd ui/server
bun test src/mcp/adapters/buda-adapter.test.ts
```

Expected: the policy-mode assertion fails with `undefined`; existing one-success and stage-entry behavior remain green.

- [ ] **Step 3: Select reactive mode only in the Buda Adapter**

Add the mode immediately before the existing success and warm-up fields:

```diff
 readonly stabilityPolicy: McpStabilityPolicy = {
+  operationReadinessMode: 'reactive',
   requiredConsecutiveSuccesses: 1,
   warmupWindowMs: 15_000,
```

Keep the complete existing `classify` and `probe` function bodies byte-for-byte unchanged.

Do not add an `adapter.id === 'buda'` branch to `stability.ts`, Runtime, or GenerationSource.

- [ ] **Step 4: Run the Buda and GenerationSource regressions**

Run:

```bash
cd ui/server
bun test src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: both files pass. The Buda policy is reactive, stage entry still calls `ensureReady()` once, the initial Agent lookup remains stabilized, and independent stage Session assertions remain green.

- [ ] **Step 5: Commit only Buda policy files**

```bash
git add ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/adapters/buda-adapter.test.ts
git diff --cached --check
git commit -m "fix(mcp): use reactive readiness for Buda operations"
```

Expected: the commit contains the Buda opt-in, its one-success precursor, and matching tests; no generic controller file is included.

### Task 5: Run automated verification and review the implementation

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Run all focused MCP generation suites**

```bash
cd ui/server
bun test src/mcp/stability.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the full Server suite**

```bash
cd ui/server
bun test
```

Expected: exit code `0`, zero failed tests.

- [ ] **Step 3: Run repository build gates**

```bash
bun run check
```

Expected: refactor-boundary check, Server build, and Web build all exit `0`.

- [ ] **Step 4: Inspect the final product diff and secret boundaries**

```bash
git diff --check HEAD
git status --short
git diff HEAD -- ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/stability.ts \
  ui/server/src/mcp/stability.test.ts \
  ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/adapters/buda-adapter.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: no whitespace errors; no credentials, generated prose, full remote errors, full Agent IDs, or full Session IDs in the diff. Only `ui/server/.workspace-config.json` and `workspace/assets.json` may remain as intentional local non-product changes after product files are committed.

- [ ] **Step 5: Perform code review before real traffic**

Check these invariants directly in the diff:

```text
missing mode => proactive
explicit ensureReady => always probes
reactive + not_ready_pre_dispatch => sleep, retry original operation
reactive + transient_read_failure => invalidate, sleep, ensureReady, retry read
reactive + ambiguous mutation => throw after one invocation
Buda selection => Adapter policy only
```

Expected: every invariant maps to both implementation code and a deterministic test.

### Task 6: Reconcile existing quarantine and run two real Buda acceptances

**Files:**
- Verify with existing API and `scripts/check-buda-chapter-task-session.mjs`; no planned repository changes.

- [ ] **Step 1: Start the Server with the dedicated acceptance workspace**

Use the existing local acceptance workspace configured in `ui/server/.workspace-config.json`, then run:

```bash
bun run dev:server
```

Expected: Server listens on `http://localhost:8787`. Keep credentials in the existing secure browser/Server state; do not place them in commands, logs, plan files, or commits.

- [ ] **Step 2: Reconcile the existing quarantine through the authority API**

Use the MCP Services quarantine panel, which calls these authority endpoints without writing raw response bodies to the terminal:

```text
GET /api/mcp/quarantines
POST /api/mcp/quarantines/:id/reconcile
```

Select “核对远端状态” for each existing record. Expected: the UI clears a record only when the API confirms a remote terminal state. A conflict response leaves the record quarantined. Never use “强制解除隔离” for this acceptance, and do not print the record's full Agent or Session identity.

- [ ] **Step 3: Create account A's fresh acceptance novel and bind its project to MCP**

Through the existing UI/API, create a new novel and empty first chapter, select `MCP` as the unique chapter GenerationSource, and bind the account's configured Buda Server, Key, Adapter, and Agent. Read back:

```text
GET /api/novel/projects/:projectId/chapter-generation-source
GET /api/novel/chapters/:chapterId?project_id=:projectId
GET /api/mcp/quarantines
```

Expected: `active` is `mcp`, the chapter has no prose, the source is unlocked before execution, and no unresolved quarantine blocks the Agent.

- [ ] **Step 4: Run account A's bounded chapter acceptance**

Read the two IDs into task-specific shell variables, then validate that both are positive integers:

```bash
read -r "MANGAFORGE_ACCEPTANCE_PROJECT_ID?Account A project ID: "
read -r "MANGAFORGE_ACCEPTANCE_CHAPTER_ID?Account A chapter ID: "
[[ "$MANGAFORGE_ACCEPTANCE_PROJECT_ID" =~ '^[1-9][0-9]*$' ]] || { echo 'invalid project id' >&2; false; }
[[ "$MANGAFORGE_ACCEPTANCE_CHAPTER_ID" =~ '^[1-9][0-9]*$' ]] || { echo 'invalid chapter id' >&2; false; }
node scripts/check-buda-chapter-task-session.mjs \
  --base-url http://localhost:8787 \
  --project-id "$MANGAFORGE_ACCEPTANCE_PROJECT_ID" \
  --chapter-id "$MANGAFORGE_ACCEPTANCE_CHAPTER_ID" \
  --timeout-ms 1800000 \
  --poll-interval-ms 1000
```

Expected: sanitized JSON reports `ok: true`, `chapter_has_prose: true`, `independent_stage_sessions: true`, `tasks_different: true`, `sessions_different: true`, and `quarantines: 0`. Do not print the generated prose or unmasked remote identities.

- [ ] **Step 5: Repeat with account B in an independent acceptance workspace/project**

Create a second fresh novel using the second configured Buda account, bind that account's own Key and Agent, then run the same command with the second positive project/chapter IDs.

Expected: the same sanitized success conditions as account A, with no model fallback and no Session reuse between actual stages.

- [ ] **Step 6: Restore local workspace configuration and verify no acceptance data is staged**

Restore `ui/server/.workspace-config.json` to the user's normal workspace value without staging it. Keep `workspace/assets.json` untouched. Then run:

```bash
git status --short
git diff --cached --name-only
```

Expected: no credential file, workspace database, generated prose, `ui/server/.workspace-config.json`, or `workspace/assets.json` is staged.

### Task 7: Final verification and push `main`

**Files:**
- Verify and publish existing commits only.

- [ ] **Step 1: Re-run the final focused tests after restoring workspace state**

```bash
cd ui/server
bun test src/mcp/stability.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Re-run the Server build**

```bash
bun run build:server
```

Expected: exit code `0`.

- [ ] **Step 3: Verify commit and staging boundaries**

```bash
git status --short --branch
git log -5 --oneline --decorate
git diff --cached --name-only
```

Expected: all product files and documentation are committed; no files are staged; only explicitly preserved local user/configuration changes may remain unstaged.

- [ ] **Step 4: Push the current `main` branch**

```bash
git push origin main
```

Expected: push succeeds and `main` contains the design, plan, precursor stabilization, generic reactive policy, and Buda opt-in commits.
