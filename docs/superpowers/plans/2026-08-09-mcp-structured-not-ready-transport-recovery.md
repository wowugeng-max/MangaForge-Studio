# MCP Structured Not-Ready Transport Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Provider-neutral MCP stability layer probe and, when necessary, rotate a stale transport after an exact structured pre-dispatch rejection before replaying the original operation.

**Architecture:** Keep semantic classification in the Adapter policy and recovery decisions in the shared stability controller. Extend only the safe `not_ready_pre_dispatch` branch so reactive operations enter the existing readiness probe/warm-up/invalidating-reacquisition flow; ambiguous mutation failures remain fail-closed and are never replayed. No Buda Session-list reconciliation, API-model changes, or persistence changes are in scope.

**Tech Stack:** TypeScript, Bun 1.3.13, bun:test, Express runtime, existing MCP `McpGenerationDeadline`, `McpStabilityController`, and runtime client manager.

---

## File Boundary

Modify only these implementation/test files for the fix:

- `ui/server/src/mcp/stability.ts`: enter `ensureReady` after an exact `not_ready_pre_dispatch` failure even when the policy is reactive.
- `ui/server/src/mcp/stability.test.ts`: update reactive expectations and add the stale-transport rotation regression.
- `ui/server/src/mcp/runtime.not-ready-recovery.test.ts`: isolated regression proving a managed runtime operation probes and replaces the exact stale client before replay, without mixing the pre-existing dirty `runtime.test.ts` into this fix commit.

Verify, but do not modify unless a focused RED test proves a required regression:

- `ui/server/src/mcp/adapters/buda-adapter.test.ts`: exact structured evidence remains the only Buda pre-dispatch classification.
- `ui/server/src/mcp/runtime.ts`: runtime client ownership and exact-client invalidation remain unchanged.
- `ui/server/src/novel-writing-service/generation-source/*`: GenerationSource and receipts remain unchanged.

Never stage or commit:

- `ui/server/.workspace-config.json`
- `workspace/assets.json`

Preserve the failed page-acceptance workspace and its quarantine record as evidence; do not clear or rewrite it.

---

### Task 1: TDD the safe readiness recovery boundary

**Files:**
- Modify: `ui/server/src/mcp/stability.test.ts`
- Create: `ui/server/src/mcp/runtime.not-ready-recovery.test.ts`
- Modify: `ui/server/src/mcp/stability.ts`

- [ ] **Step 1: Change the reactive unit expectations to require readiness before replay**

In `ui/server/src/mcp/stability.test.ts`, replace the existing parameterized test named `reactive $label retries an exact pre-dispatch rejection without a readiness probe` with:

```ts
test.each([
  { label: 'read', run: 'runRead' as const, phase: 'session_poll' as const },
  { label: 'mutation', run: 'runMutation' as const, phase: 'session_create' as const },
])('reactive $label stabilizes an exact pre-dispatch rejection before replay', async ({ run, phase }) => {
  const harness = stabilityHarness([], { operationReadinessMode: 'reactive' })
  let calls = 0

  const result = await harness.controller[run](
    harness.policy,
    { ...harness.input, phase },
    async () => {
      calls += 1
      if (calls === 1) throw exactNotReadyEvidence()
      return 'operation-result'
    },
  )

  expect(result).toBe('operation-result')
  expect(calls).toBe(2)
  expect(harness.sleeps).toEqual([5])
  expect(harness.acquisitions).toBe(1)
  expect(harness.invalidations).toBe(0)
  expect(harness.probeLog).toEqual([
    'tools/list:1', 'probe/read:1',
    'tools/list:1', 'probe/read:1',
  ])
})
```

Also update the existing deadline test name to `reactive mutation exact pre-dispatch recovery exhausts the shared deadline after readiness probes` and replace its final assertions with:

```ts
expect(harness.sleeps.reduce((sum, value) => sum + value, 0)).toBe(12)
expect(harness.acquisitions).toBe(2)
expect(harness.probeLog).toHaveLength(8)
```

The test still expects `MCP_SERVER_NOT_READY` for the shared deadline and still proves no ambiguous mutation classification.

- [ ] **Step 2: Add a stale-transport rotation regression before implementation**

Beside the updated reactive tests, add:

```ts
test('reactive mutation rotates a stale transport before replaying an exact pre-dispatch operation', async () => {
  const harness = stabilityHarness(['not_ready', 'not_ready', 'ok', 'ok'], {
    operationReadinessMode: 'reactive',
    warmupWindowMs: 15,
    pollInitialMs: 10,
    pollMaxMs: 10,
  })
  let calls = 0

  const result = await harness.controller.runMutation(
    harness.policy,
    { ...harness.input, phase: 'session_create' },
    async () => {
      calls += 1
      if (calls === 1) throw exactNotReadyEvidence()
      return 'created'
    },
  )

  expect(result).toBe('created')
  expect(calls).toBe(2)
  expect(harness.invalidations).toBe(1)
  expect(harness.acquisitions).toBe(2)
  expect(harness.sleeps).toEqual([10, 5])
  expect(harness.probeLog).toEqual([
    'tools/list:1',
    'tools/list:1',
    'tools/list:2', 'probe/read:2',
    'tools/list:2', 'probe/read:2',
  ])
})
```

The two first probe failures consume the first client's 15 ms warm-up window; the replacement is acquired and fully probed before the mutation is replayed.

- [ ] **Step 3: Add the isolated managed-runtime replacement regression before implementation**

Create `ui/server/src/mcp/runtime.not-ready-recovery.test.ts` with the complete focused test:

```ts
import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { McpGenerationDeadline } from './deadline'
import { McpError, mcpFailureEvidence } from './errors'
import { createMcpKey } from './key-store'
import { createMcpRuntime } from './runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from './server-store'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => (
  rm(path, { recursive: true, force: true })
))))

function serverNotInitializedError() {
  return new McpError('MCP_TOOL_ERROR', 'server not initialized', {
    failure_evidence: {
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: null,
      reason: 'server_not_initialized',
    },
  })
}

test('reactive mutation probes and replaces a stale managed client after exact pre-dispatch rejection', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-not-ready-replacement-'))
  workspaces.push(workspace)
  const server = {
    ...BUDA_MCP_SERVER_TEMPLATE,
    id: 'not-ready-replacement-server',
    adapter_id: 'not-ready-replacement-provider',
    poll_initial_ms: 1,
    poll_max_ms: 1,
  }
  await writeMcpServers(workspace, [server])
  const key = await createMcpKey(workspace, {
    mcp_server_id: server.id,
    key: 'sk_runtime_not_ready_replacement',
    description: '账号',
  })
  const events: string[] = []
  const firstClient = {
    async listTools() {
      events.push('first-probe')
      throw serverNotInitializedError()
    },
    async callTool() {
      events.push('first-mutation')
      if (events.filter(event => event === 'first-mutation').length === 1) {
        throw serverNotInitializedError()
      }
      return { content: [{ type: 'text', text: 'stale-replay' }] }
    },
    diagnostics: () => ({ state: 'Ready' }),
  }
  const secondClient = {
    async listTools() {
      events.push('second-probe')
      return [{ name: 'mutation' }]
    },
    async callTool() {
      events.push('second-mutation')
      return { content: [{ type: 'text', text: 'created' }] }
    },
    diagnostics: () => ({ state: 'Ready' }),
  }
  let current: typeof firstClient | typeof secondClient = firstClient
  const invalidated: unknown[] = []
  const runtime = createMcpRuntime(() => workspace, {
    manager: {
      get: async () => current,
      invalidate: async () => {},
      invalidateServer: async () => {},
      closeAll: async () => {},
      async invalidateIfCurrent(_workspace: string, _serverId: string, _keyId: number, client: unknown) {
        invalidated.push(client)
        if (current === client) current = secondClient
      },
    } as any,
    adapterFactory: () => ({ listAgents: async () => [] }) as any,
  })
  const resolved = await runtime.getAdapterForKey(key.id)
  const deadline = new McpGenerationDeadline(1_000)
  const policy = {
    operationReadinessMode: 'reactive' as const,
    requiredConsecutiveSuccesses: 1,
    warmupWindowMs: 2,
    classify(error: unknown, operation: 'read_safe' | 'mutation') {
      if (mcpFailureEvidence(error)?.reason === 'server_not_initialized') {
        return 'not_ready_pre_dispatch' as const
      }
      return operation === 'mutation' ? 'ambiguous_write_failure' as const : 'terminal_failure' as const
    },
    async probe(client: typeof resolved.client, options: any) {
      await client.listTools({ ...options, refreshTools: true })
    },
  }

  try {
    await expect(resolved.stability.runMutation(policy, {
      deadline,
      phase: 'session_create',
      pollInitialMs: 1,
      pollMaxMs: 1,
      toolTimeoutMs: 100,
    }, () => resolved.client.callTool('mutation', {}, {
      operation: 'mutation',
    }))).resolves.toEqual({ content: [{ type: 'text', text: 'created' }] })
    expect(events).toEqual([
      'first-mutation', 'first-probe', 'first-probe',
      'second-probe', 'second-mutation',
    ])
    expect(invalidated).toEqual([firstClient])
  } finally {
    deadline.close()
  }
})
```

- [ ] **Step 4: Run the RED suites**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/stability.test.ts src/mcp/runtime.not-ready-recovery.test.ts
```

Expected: the updated reactive assertions fail because the current implementation replays directly without readiness probes; the new runtime test observes the stale client replay instead of the replacement. Existing unrelated tests remain green.

- [ ] **Step 5: Implement the minimal stability change**

In `ui/server/src/mcp/stability.ts`, replace the existing post-replay condition:

```ts
if (readinessMode === 'proactive' || failureClass === 'transient_read_failure') {
  await ensureReady(policy, input)
}
```

with:

```ts
if (readinessMode === 'proactive'
  || failureClass === 'transient_read_failure'
  || failureClass === 'not_ready_pre_dispatch') {
  await ensureReady(policy, input)
}
```

Do not change failure classification, mutation ambiguity conversion, deadline handling, invalidation ownership, or any Adapter.

- [ ] **Step 6: Run the GREEN suites**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/stability.test.ts src/mcp/runtime.not-ready-recovery.test.ts
```

Expected: all tests in both files pass, including the updated reactive expectations, stale-transport rotation, runtime replacement, exact-deadline behavior, and concurrent-client safety tests.

- [ ] **Step 7: Commit the TDD change**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check
git add -- \
  ui/server/src/mcp/stability.ts \
  ui/server/src/mcp/stability.test.ts \
  ui/server/src/mcp/runtime.not-ready-recovery.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): stabilize before replaying not-ready operations"
```

Expected staged names are exactly the three listed files. The two protected local files and the four existing MCP runtime/Drive files remain unstaged.

### Task 2: Verify adjacent MCP contracts and provider neutrality

**Files:**
- Verify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Verify: `ui/server/src/mcp/stability.test.ts`
- Verify: `ui/server/src/mcp/runtime.not-ready-recovery.test.ts`
- Verify: `ui/server/src/mcp/runtime.test.ts`
- Verify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Run exact Buda policy and stability regression filters**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/adapters/buda-adapter.test.ts -t "classifies"
bun test src/mcp/stability.test.ts -t "ambiguous|pre-dispatch|not-ready|reactive"
```

Expected: only structured `server_not_initialized` evidence is pre-dispatch; connection loss, timeouts, HTTP 500, and message-only errors remain ambiguous or terminal according to their existing operation rules.

- [ ] **Step 2: Run the GenerationSource no-fallback and independent-session coverage**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/generation-source/generation-source.test.ts -t "send_unknown|independent|Session|fallback"
```

Expected: ambiguous writes are still quarantined, API fallback is still absent, and each MCP stage keeps its independent Session contract.

- [ ] **Step 3: Audit the diff boundary**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check
git diff --name-only origin/main..HEAD
git status --short --branch
```

Expected: only the design/plan commits and prior intended MCP commits are ahead; no protected file is staged.

### Task 3: Complete automated verification

**Files:**
- Verify only; create no generated repository files.

- [ ] **Step 1: Run focused MCP suites**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/mcp/stability.test.ts \
  src/mcp/runtime.not-ready-recovery.test.ts \
  src/mcp/runtime.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/adapters/buda-drive.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Run all MCP and material-adjacent tests**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp src/novel-writing-service/generation-source src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures, including the prior source-readiness recovery and Drive stability work.

- [ ] **Step 3: Run complete Server and Web suites**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test
cd /Users/ruiyaosong/MangaForge-Studio/ui/web
bun test
```

Expected: Server and Web each report zero failed tests.

- [ ] **Step 4: Run builds and repository checks**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git diff --check
git diff --cached --check
git status --short --branch
```

Expected: refactor-boundary checks, Server build, Web build, and diff checks exit 0. Only the two protected local files and the four pre-existing MCP runtime/Drive files remain uncommitted before cumulative review.

### Task 4: Create a fresh real acceptance workspace without touching failed evidence

**Files:**
- Modify only the new temporary workspace: `/private/tmp/mangaforge-buda-acceptance-recovery-a`
- Modify local active-workspace selector: `ui/server/.workspace-config.json` (protected, never commit)

- [ ] **Step 1: Copy the failed fixture into a new isolated workspace**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
test ! -e /private/tmp/mangaforge-buda-acceptance-recovery-a
mkdir -p /private/tmp/mangaforge-buda-acceptance-recovery-a
cp -R /private/tmp/mangaforge-buda-acceptance-a.lWJwW2/. /private/tmp/mangaforge-buda-acceptance-recovery-a/
```

Do not modify `/private/tmp/mangaforge-buda-acceptance-a.lWJwW2`.

- [ ] **Step 2: Reset only the cloned chapter's durable acceptance state**

```bash
sqlite3 /private/tmp/mangaforge-buda-acceptance-recovery-a/novel.sqlite <<'SQL'
BEGIN IMMEDIATE;
DELETE FROM chapter_stage_artifacts WHERE project_id = 4 AND chapter_id = 4;
DELETE FROM runs WHERE project_id = 4;
DELETE FROM reviews WHERE project_id = 4;
DELETE FROM chapter_versions WHERE project_id = 4 AND chapter_id = 4;
DELETE FROM chapter_setting_usage WHERE project_id = 4 AND chapter_id = 4;
DELETE FROM setting_entities WHERE project_id = 4;
DELETE FROM characters WHERE project_id = 4;
DELETE FROM worldbuilding WHERE project_id = 4;
UPDATE chapters
SET chapter_text = '', status = 'draft', version = 1, published_at = NULL
WHERE id = 4 AND project_id = 4;
COMMIT;
SQL
```

The project outline, chapter goal, raw chapter context, MCP binding, and Buda Agent remain unchanged; only generated acceptance state is reset in the clone.

- [ ] **Step 3: Reset the clone's local quarantine snapshot**

Use `apply_patch` on `/private/tmp/mangaforge-buda-acceptance-recovery-a/mcp-agent-quarantines.json` to replace its contents with exactly:

```json
[]
```

Do not alter the original quarantine file.

- [ ] **Step 4: Point the protected local selector to the new workspace**

Use `apply_patch` on `ui/server/.workspace-config.json` so `activeWorkspace` is exactly:

```json
"/tmp/mangaforge-buda-acceptance-recovery-a"
```

Keep this file modified but unstaged. Verify:

```bash
curl -fsS http://127.0.0.1:8787/api/status | jq '{ok,workspace}'
sqlite3 -header -column /private/tmp/mangaforge-buda-acceptance-recovery-a/novel.sqlite "SELECT length(chapter_text) AS prose_chars, (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows FROM chapters WHERE id=4; SELECT count(*) AS running_artifacts FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 AND status='running'; SELECT count(*) AS running_runs FROM runs WHERE project_id=4 AND status IN ('queued','running','cancel_requested','session_created');"
jq 'length' /private/tmp/mangaforge-buda-acceptance-recovery-a/mcp-agent-quarantines.json
```

Expected workspace is `/tmp/mangaforge-buda-acceptance-recovery-a`; prose/material counts and active counts are zero; quarantine length is zero.

### Task 5: Repeat page acceptance once per action after the fix

**Files:**
- Verify the new temporary workspace and page only; do not modify repository source during acceptance.

- [ ] **Step 1: Restart this repository's Server against the new workspace**

Resolve the listener on `127.0.0.1:8787`, confirm its cwd is `/Users/ruiyaosong/MangaForge-Studio/ui/server`, terminate only that Server process tree, and start:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
HOST=127.0.0.1 bun run dev
```

Keep Vite on `5173` and verify the status endpoint reports the new workspace.

- [ ] **Step 2: Reload the retained local page and confirm MCP is selected**

Use the in-app Browser page `http://127.0.0.1:5173/novel/workspace/4`. Confirm the MCP radio is checked, the Buda binding summary is visible, and `补齐材料` is enabled before the action.

- [ ] **Step 3: Click `补齐材料` exactly once**

After the click, verify the API/MCP controls and binding button are disabled while the task runs. Do not click again, retry, switch source, or acknowledge any quarantine while waiting.

- [ ] **Step 4: Verify material success from both durable layers**

```bash
sqlite3 -header -column /private/tmp/mangaforge-buda-acceptance-recovery-a/novel.sqlite "SELECT (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows; SELECT substr(task_id,-8) AS task_suffix, stage, status, source, CASE WHEN session_id IS NULL OR session_id='' THEN '' ELSE substr(session_id,-8) END AS session_suffix, error_code FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 ORDER BY id DESC LIMIT 1; SELECT id,status,error_message FROM runs WHERE project_id=4 AND run_type='mcp_chapter_task' ORDER BY id DESC LIMIT 1;"
curl -fsS 'http://127.0.0.1:8787/api/novel/projects/4/truth-file?chapter_id=4' | jq '{ready:.truth_file.context_trace.preflight.ready,strict_ready:.truth_file.context_trace.preflight.strict_ready,missing:.truth_file.context_trace.preflight.missing}'
jq 'length' /private/tmp/mangaforge-buda-acceptance-recovery-a/mcp-agent-quarantines.json
```

Expected: latest `material_repair_json` artifact and `mcp_chapter_task` are both successful; all required material counts are positive; `strict_ready` is true with no high-severity missing item; quarantine length remains zero. If this task fails, stop and preserve the new evidence without another click.

- [ ] **Step 5: Click `生成正文` exactly once**

Refresh page state after material success, confirm the button is enabled and MCP remains selected, then click once. Do not switch source or create another task while the production chain runs.

- [ ] **Step 6: Verify independent MCP stage Sessions and prose**

```bash
sqlite3 -header -column /private/tmp/mangaforge-buda-acceptance-recovery-a/novel.sqlite "SELECT length(chapter_text) AS prose_chars FROM chapters WHERE id=4; SELECT substr(task_id,-8) AS task_suffix, count(*) AS stage_count, count(DISTINCT session_id) AS distinct_sessions, group_concat(DISTINCT source) AS sources, sum(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success_count FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 GROUP BY task_id ORDER BY max(id) DESC LIMIT 2;"
jq 'length' /private/tmp/mangaforge-buda-acceptance-recovery-a/mcp-agent-quarantines.json
```

Expected: prose is non-empty; material and prose have different Task IDs; all prose stages use MCP; each actual remote stage has its own distinct non-empty Session; all artifacts are terminal; quarantine remains zero. Any failure stops further page interaction.

### Task 6: Cumulative review, final verification, commit, and push

**Files:**
- Review the committed recovery files `ui/server/src/mcp/stability.ts`, `ui/server/src/mcp/stability.test.ts`, and `ui/server/src/mcp/runtime.not-ready-recovery.test.ts`, plus the four previously uncommitted MCP runtime/Drive files.
- Never stage `ui/server/.workspace-config.json` or `workspace/assets.json`.

- [ ] **Step 1: Run a fresh cumulative MCP review**

Review `origin/main..HEAD` for exact pre-dispatch stabilization, replacement-client ownership, no ambiguous mutation replay, Provider-neutral boundaries, independent Sessions, Drive fences, material source-readiness recovery, unchanged API behavior, and protected-file exclusion. Resolve every Critical or Important finding with a new RED-GREEN test and re-review.

- [ ] **Step 2: Run fresh complete verification after review fixes**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test
cd /Users/ruiyaosong/MangaForge-Studio/ui/web
bun test
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git diff --check
git diff --cached --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit only the four pre-existing MCP runtime/Drive files if still uncommitted**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add -- \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): harden remote drive task lifecycle"
```

If these four files were already committed during cumulative review, do not create an empty commit.

- [ ] **Step 4: Audit and push the exact boundary**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --name-only
git diff --cached --name-only
git status --short --branch
git push origin main
```

Expected: push succeeds; `main` is no longer ahead of `origin/main`; no staged files remain; only `ui/server/.workspace-config.json` and `workspace/assets.json` are uncommitted local files.

## Self-Review Checklist

- [ ] The plan changes only the single Provider-neutral recovery branch described by the spec.
- [ ] Every production change has a preceding RED regression and a focused GREEN command.
- [ ] Exact structured pre-dispatch evidence is the only mutation replay permission.
- [ ] Ambiguous writes, timeout, cancellation, and API behavior remain covered.
- [ ] The failed acceptance workspace is never modified or retried.
- [ ] The fresh acceptance workspace reset is isolated and explicitly bounded.
- [ ] Protected repository files are never staged.
- [ ] Final review, full verification, exact commit, and push are explicit.
