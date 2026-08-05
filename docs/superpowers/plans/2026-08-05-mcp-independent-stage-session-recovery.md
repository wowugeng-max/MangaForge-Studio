# MCP Independent Stage Session Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every actual chapter-generation stage use one independent MCP Agent Session while preserving one local chapter task, one source binding, one Agent lease, one total deadline, and resumable validated stage artifacts.

**Architecture:** MangaForge remains the authoritative workflow and memory owner. A provider-neutral MCP stability controller owns Transport readiness, deadline consumption, and safe retry classification; adapters provide optional readiness policies and one-shot stage invocation implementations. Chapter-stage artifacts persist validated outputs by complete input identity so retries and process restarts resume at the failed stage without reusing remote conversation history or falling back to a model source.

**Tech Stack:** TypeScript, Bun 1.3.x, Express 4, `@modelcontextprotocol/client` 2.x, Bun SQLite, Bun Test, React/Vite web client

---

## Fixed invariants

- `GenerationSource` remains the only chapter-workflow dependency; MCP and model providers expose the same stage-call semantics.
- Every actual `ChapterTaskStage` invocation creates one new remote Agent Session. Locally skipped stages create none.
- One local `task_id`, source/authority fingerprints, context version, total MCP deadline, and Agent lease span the complete chapter chain.
- A Transport Session may be replaced without changing the already-created Agent Session being polled.
- Only a structured HTTP 400 + JSON-RPC `-32000` + `id: null` + exact `Server not initialized` response is a retryable pre-dispatch rejection. Message-only, timeout, connection reset, 5xx, and response-loss cases are ambiguous for mutation calls.
- MCP failures never trigger model fallback. Buda-specific tool names, notification compatibility, and readiness probes stay inside the Buda adapter boundary.
- Stage output is reusable only after response-contract validation and an exact identity match on task, project, chapter, stage, input hash, source fingerprint, authority fingerprint, context version, and response contract.
- Keys, custom header values, prompts, chapter text, full remote errors, and full Session IDs must not appear in public progress or failure output.
- Do not modify or commit `workspace/assets.json`.

## File responsibility map

- `ui/server/src/mcp/client.ts`: preserve bounded HTTP/JSON-RPC failure evidence without deciding provider retry policy.
- `ui/server/src/mcp/stability.ts`: provider-neutral readiness, Transport rotation, shared deadline, and operation-safety coordinator.
- `ui/server/src/mcp/runtime.ts`: connect the stability controller to `McpClientManager` invalidation/reacquisition.
- `ui/server/src/mcp/adapters/types.ts`: stability policy and one-shot chapter-stage adapter contracts.
- `ui/server/src/mcp/adapters/buda-adapter.ts`: Buda readiness policy and one `createSession(startRun: true)` execution per stage.
- `ui/server/src/novel/db.ts`: `chapter_stage_artifacts` schema and indexes.
- `ui/server/src/novel/repos/chapter-stage-artifacts.ts`: bounded artifact persistence, exact reuse, invalidation, and compaction.
- `ui/server/src/novel-writing-service/generation-source/stage-receipts.ts`: Run audit plus artifact checkpoint orchestration.
- `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: task-level binding/lease/deadline and stage-level invocation/fence/receipt lifecycle.
- `ui/server/src/routes/novel-production-service.ts`: persist and reuse the stable local chapter task ID during chapter-group recovery.
- `scripts/check-buda-chapter-task-session.mjs`: black-box proof that one local task has stable source identity and distinct remote Session IDs per stage.

### Task 1: Preserve structured pre-dispatch failure evidence

**Files:**
- Modify: `ui/server/src/mcp/errors.ts`
- Modify: `ui/server/src/mcp/client.ts`
- Test: `ui/server/src/mcp/client.test.ts`

- [ ] **Step 1: Write failing tests for structured and ambiguous failures**

Add tests that make the fake SDK throw `SdkHttpError` values and verify that only the exact Buda response carries retryable evidence:

```ts
import { SdkErrorCode, SdkHttpError } from '@modelcontextprotocol/client'

test('preserves exact pre-dispatch not-ready evidence without exposing remote text', async () => {
  const error = new SdkHttpError(
    SdkErrorCode.ClientHttpNotImplemented,
    'remote body must not escape',
    {
      status: 400,
      statusText: 'Bad Request',
      text: JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Server not initialized' },
      }),
    },
  )
  const client = connectedClientWhoseToolCallThrows(error, { adapter_id: 'buda' })

  const caught: any = await client.callTool('create', {}, { operation: 'mutation' }).catch(value => value)
  expect(caught).toMatchObject({
    code: 'MCP_TOOL_ERROR',
    details: {
      failure_evidence: {
        kind: 'jsonrpc_http_rejection',
        http_status: 400,
        jsonrpc_code: -32000,
        response_id: null,
        reason: 'server_not_initialized',
      },
    },
  })
  expect(JSON.stringify(caught)).not.toContain('remote body must not escape')
})

const allStageContracts = [
  { status: 500, id: null, code: -32000, message: 'Server not initialized' },
  { status: 400, id: 7, code: -32000, message: 'Server not initialized' },
  { status: 400, id: null, code: -32603, message: 'Server not initialized' },
  { status: 400, id: null, code: -32000, message: 'similar but not exact' },
])('does not mark uncertain mutation evidence retryable: %j', async candidate => {
  const caught: any = await callThrowingHttpFailure(candidate).catch(value => value)
  expect(caught.details?.failure_evidence?.reason).not.toBe('server_not_initialized')
})

test('separates a completed MCP handshake from deferred tool readiness', async () => {
  const fake = sdkWhoseInitialListThrows(exactNotReadySdkHttpError())
  const client = createMcpClient({ server: serverRecord(), key: keyRecord(), sdkFactory: fake.factory })
  await expect(client.connect()).resolves.toBe(client)
  expect(client.state).toBe('Ready')
  await expect(client.listTools({ refreshTools: true })).rejects.toMatchObject({
    code: 'MCP_TOOL_ERROR',
    details: { failure_evidence: { reason: 'server_not_initialized' } },
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd ui/server && bun test src/mcp/client.test.ts
```

Expected: FAIL because `SdkHttpError` response evidence is currently collapsed into message-based `MCP_TOOL_ERROR` or `MCP_CONNECTION_LOST` details.

- [ ] **Step 3: Add the public error code and bounded evidence projector**

Add `'MCP_SERVER_NOT_READY'` to `McpErrorCode`. Define and export `McpFailureEvidence` plus a defensive `mcpFailureEvidence(error)` accessor in `errors.ts`; the accessor returns only a validated own-data `details.failure_evidence` object. In `client.ts`, import `SdkHttpError` and replace the Buda message-only detector with a defensive projector:

```ts
export type McpFailureEvidence = {
  kind: 'jsonrpc_http_rejection'
  http_status: number
  jsonrpc_code?: number
  response_id?: string | number | null
  reason?: 'server_not_initialized'
}

export function mcpFailureEvidence(error: unknown): McpFailureEvidence | undefined

function projectSdkHttpFailure(error: unknown): McpFailureEvidence | undefined {
  if (!(error instanceof SdkHttpError)) return undefined
  const evidence: McpFailureEvidence = {
    kind: 'jsonrpc_http_rejection',
    http_status: error.status,
  }
  const text = typeof error.data?.text === 'string' && error.data.text.length <= 16_384
    ? error.data.text
    : ''
  try {
    const body = JSON.parse(text)
    if (typeof body?.error?.code === 'number') evidence.jsonrpc_code = body.error.code
    if (body && Object.prototype.hasOwnProperty.call(body, 'id')) evidence.response_id = body.id
    if (error.status === 400
      && body?.id === null
      && body?.error?.code === -32000
      && body?.error?.message === 'Server not initialized') {
      evidence.reason = 'server_not_initialized'
    }
  } catch {}
  return evidence
}
```

Attach only this projected object to `McpError.details.failure_evidence`. Do not persist `error.data.text`, `statusText`, or the SDK error message. Map failures from both `refreshTools()` and `callTool()` through the same projector. Remove both current `isBudaSessionNotReady()` retry loops from `GenericMcpClient.connect()` and `GenericMcpClient.callTool()`; provider retry policy will move to Task 2.

Treat MCP handshake and provider tool readiness as separate states: if the SDK handshake succeeds but the initial `tools/list` returns the exact structured `server_not_initialized` evidence, keep the connected client in `Ready` with an empty tool cache. A later `listTools({ refreshTools: true })` must perform a real request and return the projected error to the stability controller. Any other initial capability error still fails `connect()`. Keep the Buda `initialized` notification transport override unchanged.

- [ ] **Step 4: Run the client tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/mcp/client.test.ts
```

Expected: PASS; the exact response has bounded structured evidence, while timeout/5xx/message-only variants remain non-retryable evidence.

- [ ] **Step 5: Commit the error-evidence boundary**

```bash
git add ui/server/src/mcp/errors.ts ui/server/src/mcp/client.ts ui/server/src/mcp/client.test.ts
git commit -m "fix(mcp): preserve pre-dispatch failure evidence"
```

### Task 2: Add the provider-neutral MCP stability coordinator

**Files:**
- Create: `ui/server/src/mcp/stability.ts`
- Create: `ui/server/src/mcp/stability.test.ts`
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/client.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Test: `ui/server/src/mcp/runtime.test.ts`

- [ ] **Step 1: Write deterministic RED tests for readiness and safe replay**

Use an injected clock and fake Transport factory. Cover `tools/list: 400 → 200 → 400`, consecutive successful probe cycles, warm-up rotation, a shared deadline, read replay, exact pre-dispatch mutation replay, and ambiguous mutation refusal:

```ts
test('does not release a mutation until two complete probe cycles succeed', async () => {
  const harness = stabilityHarness([
    'not_ready', 'ok', 'not_ready',
    'ok', 'ok',
    'ok', 'ok',
  ])
  await harness.controller.ensureReady(harness.policy, harness.input)
  expect(harness.probeLog).toEqual([
    'tools/list',
    'tools/list', 'listAgents',
    'tools/list',
    'tools/list', 'listAgents',
    'tools/list', 'listAgents',
  ])
  expect(harness.mutationCount).toBe(0)
})

test('replays only an exact pre-dispatch mutation rejection', async () => {
  const harness = stabilityHarness(['ok', 'ok'])
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
})

test.each([timeoutError(), resetError(), http500Error(), messageOnlyNotReadyError()])(
  'never replays an ambiguous mutation: %p',
  async error => {
    const harness = stabilityHarness(['ok', 'ok'])
    let calls = 0
    await expect(harness.controller.runMutation(
      harness.policy,
      { ...harness.input, phase: 'session_create' },
      async () => { calls += 1; throw error },
    )).rejects.toBe(error)
    expect(calls).toBe(1)
  },
)
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
cd ui/server && bun test src/mcp/stability.test.ts src/mcp/runtime.test.ts
```

Expected: FAIL because the stability types and coordinator do not exist.

- [ ] **Step 3: Define stable provider-neutral interfaces**

Add these contracts to `adapters/types.ts`:

```ts
export type McpRecoveryPhase = 'transport' | 'drive_sync' | 'session_create' | 'session_poll'

export type McpFailureClass =
  | 'not_ready_pre_dispatch'
  | 'transient_read_failure'
  | 'ambiguous_write_failure'
  | 'terminal_failure'

export type McpStabilityPolicy = {
  requiredConsecutiveSuccesses: number
  warmupWindowMs: number
  classify(error: unknown, operation: McpOperationKind): McpFailureClass
  probe(client: McpClientPort, options: McpAdapterOperationOptions): Promise<void>
}

export type McpStabilityInput = {
  deadline: McpGenerationDeadline
  phase: McpRecoveryPhase
  pollInitialMs: number
  pollMaxMs: number
  toolTimeoutMs: number
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export interface McpStabilityController {
  ensureReady(policy: McpStabilityPolicy | undefined, input: McpStabilityInput): Promise<void>
  runRead<T>(policy: McpStabilityPolicy | undefined, input: McpStabilityInput, operation: () => Promise<T>): Promise<T>
  runMutation<T>(policy: McpStabilityPolicy | undefined, input: McpStabilityInput, operation: () => Promise<T>): Promise<T>
}
```

Extend `McpAdapterOperationOptions` with `refreshTools?: boolean`, and make `GenericMcpClient.listTools()` execute `refreshTools()` whenever it is true. That ensures a readiness probe performs a real `tools/list`, not a cache lookup.

- [ ] **Step 4: Implement deadline-bound readiness and Transport rotation**

Create `stability.ts` with one controller factory:

```ts
export function createMcpStabilityController(input: {
  reacquire: (options: McpAdapterOperationOptions) => Promise<McpClientPort>
  invalidateCurrent: () => Promise<void>
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
}): McpStabilityController
```

Implementation rules:

- A missing policy performs no warm-up and preserves default generic MCP behavior.
- A probe cycle counts only if the policy's full probe resolves.
- `not_ready_pre_dispatch` resets the consecutive-success count and consumes exponential backoff bounded by `pollMaxMs` and `deadline.remainingMs()`.
- When `warmupWindowMs` expires without enough consecutive successes, call `invalidateCurrent()`, reacquire a new client, and start a new window without resetting the chapter deadline.
- Deadline exhaustion throws `new McpError('MCP_SERVER_NOT_READY', 'MCP 服务尚未稳定就绪', { phase })`.
- `runRead()` may stabilize and replay `not_ready_pre_dispatch` or `transient_read_failure` until the total deadline expires.
- `runMutation()` may replay only `not_ready_pre_dispatch`; every other rejection is returned unchanged after the first call.
- Progress uses `stage: 'mcp_transport_stabilizing'`, includes only phase, recovery round, and elapsed milliseconds, and never includes remote error bodies.

- [ ] **Step 5: Wire the coordinator to client-manager reacquisition**

In `runtime.ts`, extend `ResolvedMcpCredential` with `stability: McpStabilityController`. Build it beside the existing client facade so `invalidateCurrent()` calls `manager.invalidateIfCurrent(...)` for the captured current client and `reacquire()` updates that capture. Do not add Buda tool names or Buda message matching to `runtime.ts` or `stability.ts`.

Update the runtime test fake result:

```ts
const resolved = await runtime.getAdapterForKey(3)
expect(resolved).toMatchObject({
  server: { id: 'server-1' },
  key: { id: 3 },
  stability: {
    ensureReady: expect.any(Function),
    runRead: expect.any(Function),
    runMutation: expect.any(Function),
  },
})
```

- [ ] **Step 6: Run coordinator, runtime, and deadline tests**

Run:

```bash
cd ui/server && bun test src/mcp/stability.test.ts src/mcp/runtime.test.ts src/mcp/client.test.ts src/mcp/deadline.test.ts
```

Expected: PASS with no wall-clock sleeps in `stability.test.ts`.

- [ ] **Step 7: Commit the generic stability layer**

```bash
git add ui/server/src/mcp/stability.ts ui/server/src/mcp/stability.test.ts ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/client.ts ui/server/src/mcp/runtime.ts ui/server/src/mcp/runtime.test.ts
git commit -m "feat(mcp): add transport stability coordinator"
```

### Task 3: Add Buda readiness policy without coupling the generic runtime

**Files:**
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Test: `ui/server/src/mcp/client.test.ts`

- [ ] **Step 1: Write RED tests for the Buda policy and generic isolation**

Add tests that call the policy through the public adapter surface:

```ts
test('Buda readiness requires refreshed tools/list and a real listAgents call twice', async () => {
  const fake = fakeBudaClient()
  const adapter = new BudaAdapter(fake.client as any)
  const policy = adapter.stabilityPolicy
  expect(policy?.requiredConsecutiveSuccesses).toBe(2)

  await policy!.probe(fake.client as any, { timeoutMs: 500 })
  expect(fake.listToolOptions.at(-1)).toMatchObject({ refreshTools: true })
  expect(fake.calls.at(-1)?.name).toBe('api_claw_get_api_agent')
})

test('classifies only structured not-ready evidence as pre-dispatch', () => {
  const policy = new BudaAdapter(fakeBudaClient().client as any).stabilityPolicy!
  expect(policy.classify(exactNotReadyMcpError(), 'mutation')).toBe('not_ready_pre_dispatch')
  expect(policy.classify(new Error('Server not initialized'), 'mutation')).toBe('ambiguous_write_failure')
  expect(policy.classify(http500McpError(), 'mutation')).toBe('ambiguous_write_failure')
})

test('generic adapters do not inherit the Buda policy or notification suppression', () => {
  const factory = recordingSdkFactory()
  createMcpClient({
    server: serverRecord({ adapter_id: 'provider-neutral' }),
    key: keyRecord(),
    sdkFactory: factory,
  })
  expect(factory.createdTransport).toBeInstanceOf(StreamableHTTPClientTransport)
  expect(factory.createdTransport).not.toBeInstanceOf(BudaStreamableHTTPClientTransport)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/mcp/client.test.ts
```

Expected: FAIL because `stabilityPolicy` is not exposed.

- [ ] **Step 3: Implement the Buda policy**

Expose an optional readonly policy on `McpGenerationAdapter` and implement it in `BudaAdapter`:

```ts
readonly stabilityPolicy: McpStabilityPolicy = {
  requiredConsecutiveSuccesses: 2,
  warmupWindowMs: 15_000,
  classify: (error, operation) => {
    const evidence = mcpFailureEvidence(error)
    if (evidence?.http_status === 400
      && evidence.jsonrpc_code === -32000
      && evidence.response_id === null
      && evidence.reason === 'server_not_initialized') {
      return 'not_ready_pre_dispatch'
    }
    const code = error instanceof McpError ? error.code : ''
    if (operation === 'read_safe'
      && (code === 'MCP_CONNECTION_LOST' || code === 'MCP_CONNECT_TIMEOUT')) {
      return 'transient_read_failure'
    }
    return operation === 'mutation' ? 'ambiguous_write_failure' : 'terminal_failure'
  },
  probe: async (client, options) => {
    const tools = resolveBudaTools(await client.listTools({ ...options, refreshTools: true }))
    await client.callTool(
      tools.listAgents,
      buildBudaToolArguments('listAgents', tools.listAgents, {}),
      operationOptions(options, 'read_safe'),
    )
  },
}
```

Use the existing Buda tool-map resolver; do not duplicate literal Buda tool names in the generic controller. Derive the effective warm-up window as `Math.min(policy.warmupWindowMs, deadline.remainingMs())` in the controller.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/mcp/client.test.ts src/mcp/stability.test.ts
```

Expected: PASS; generic adapters remain policy-free.

- [ ] **Step 5: Commit the provider policy**

```bash
git add ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/client.test.ts
git commit -m "feat(mcp): add Buda readiness policy"
```

### Task 4: Persist bounded chapter-stage artifacts

**Files:**
- Modify: `ui/server/src/novel/db.ts`
- Modify: `ui/server/src/novel/types.ts`
- Modify: `ui/server/src/novel/store.ts`
- Create: `ui/server/src/novel/repos/chapter-stage-artifacts.ts`
- Create: `ui/server/src/novel/repos/chapter-stage-artifacts.test.ts`
- Test: `ui/server/src/novel/sqlite-persistence.test.ts`

- [ ] **Step 1: Write RED schema and repository tests**

Cover schema idempotence, unique attempts, exact identity reuse, hash verification, bounded payload/error storage, observed-order invalidation, and post-commit compaction:

```ts
test('reuses only a successful artifact with the complete input identity', async () => {
  const identity = artifactIdentity({ stage: 'draft', input_hash: fingerprint('input-a') })
  const running = await beginChapterStageArtifact(workspace, identity)
  await completeChapterStageArtifact(workspace, running.id, {
    output_payload: JSON.stringify({ output: 'validated prose' }),
    output_hash: fingerprint(JSON.stringify({ output: 'validated prose' })),
    session_id: 'session-a',
    snapshot_hash: fingerprint('snapshot-a'),
  })

  expect(await findReusableChapterStageArtifact(workspace, identity))
    .toMatchObject({ id: running.id, status: 'success' })
  expect(await findReusableChapterStageArtifact(workspace, {
    ...identity,
    context_version: fingerprint('changed-context'),
  })).toBeNull()
})

test('invalidates the mismatched stage and only later observed artifacts', async () => {
  const draft = await successfulArtifact(workspace, artifactIdentity({ stage: 'draft' }))
  const review = await successfulArtifact(workspace, artifactIdentity({ stage: 'quality_review' }))
  const repair = await successfulArtifact(workspace, artifactIdentity({ stage: 'quality_repair' }))
  await invalidateChapterStageArtifactsFrom(workspace, review.id)
  expect(await artifactStatus(workspace, draft.id)).toBe('success')
  expect(await artifactStatus(workspace, review.id)).toBe('invalidated')
  expect(await artifactStatus(workspace, repair.id)).toBe('invalidated')
})
```

- [ ] **Step 2: Run the repository tests and verify RED**

Run:

```bash
cd ui/server && bun test src/novel/repos/chapter-stage-artifacts.test.ts src/novel/sqlite-persistence.test.ts
```

Expected: FAIL because the table, types, and repository do not exist.

- [ ] **Step 3: Add the SQLite schema and indexes**

Add this table inside `ensureSqliteSchema()`:

```sql
CREATE TABLE IF NOT EXISTS chapter_stage_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','success','failed','ambiguous','invalidated','compacted')),
  input_hash TEXT NOT NULL,
  output_hash TEXT DEFAULT '',
  response_contract TEXT NOT NULL,
  output_payload TEXT DEFAULT '',
  source TEXT NOT NULL CHECK(source IN ('model','mcp')),
  source_fingerprint TEXT NOT NULL,
  authority_fingerprint TEXT NOT NULL,
  context_version TEXT NOT NULL,
  server_id TEXT DEFAULT NULL,
  key_id INTEGER DEFAULT NULL,
  adapter_id TEXT DEFAULT NULL,
  agent_id TEXT DEFAULT NULL,
  model TEXT DEFAULT NULL,
  session_id TEXT DEFAULT NULL,
  snapshot_hash TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  UNIQUE(task_id, stage, attempt)
);
CREATE INDEX IF NOT EXISTS idx_chapter_stage_artifacts_recovery
ON chapter_stage_artifacts(project_id, chapter_id, task_id, status);
```

Call `ensureSqliteSchema(db)` twice in the persistence test and assert the table/index definitions are unchanged.

- [ ] **Step 4: Add the artifact record type and repository API**

Define `NovelChapterStageArtifactStatus`, `NovelChapterStageArtifactRecord`, and `NovelChapterStageArtifactIdentity` in `novel/types.ts`. Export the repository from `novel/store.ts`.

Implement these exact functions in `chapter-stage-artifacts.ts`:

```ts
export const CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES = 2 * 1024 * 1024
export const CHAPTER_STAGE_ARTIFACT_MAX_DEPTH = 32
export const CHAPTER_STAGE_ARTIFACT_MAX_FIELDS = 8_192
export const CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS = 1_048_576
export const CHAPTER_STAGE_ARTIFACT_ERROR_CODE_CHARS = 80

export async function beginChapterStageArtifact(
  activeWorkspace: string,
  identity: NovelChapterStageArtifactIdentity,
): Promise<NovelChapterStageArtifactRecord>

export async function findReusableChapterStageArtifact(
  activeWorkspace: string,
  identity: NovelChapterStageArtifactIdentity,
): Promise<NovelChapterStageArtifactRecord | null>

export async function findLatestSuccessfulChapterStageArtifact(
  activeWorkspace: string,
  taskId: string,
  stage: ChapterTaskStage,
): Promise<NovelChapterStageArtifactRecord | null>

export async function completeChapterStageArtifact(
  activeWorkspace: string,
  id: number,
  output: Pick<NovelChapterStageArtifactRecord,
    'output_payload' | 'output_hash' | 'session_id' | 'snapshot_hash'>,
): Promise<NovelChapterStageArtifactRecord>

export async function failChapterStageArtifact(
  activeWorkspace: string,
  id: number,
  status: Extract<NovelChapterStageArtifactStatus, 'failed' | 'ambiguous'>,
  errorCode: string,
): Promise<NovelChapterStageArtifactRecord>

export async function attachChapterStageRemoteIdentity(
  activeWorkspace: string,
  id: number,
  remote: { session_id: string; snapshot_hash: string },
): Promise<NovelChapterStageArtifactRecord>

export async function invalidateChapterStageArtifactsFrom(
  activeWorkspace: string,
  artifactId: number,
): Promise<number>

export async function compactChapterTaskArtifacts(
  activeWorkspace: string,
  taskId: string,
): Promise<number>
```

Use `withNovelDbWrite()` for each mutation. Allocate `attempt` with `COALESCE(MAX(attempt), 0) + 1` inside the same transaction. Add `serializeBoundedChapterStageArtifact(value)` that rejects proxies, accessors, cycles, non-finite numbers, unsupported values, nesting beyond 32, more than 8,192 object/array fields, any string over 1,048,576 characters, and serialized UTF-8 output above 2 MiB. Recompute SHA-256 from the exact serialized `output_payload` before writing or returning a reusable row. Reject non-`sha256:<64 hex>` identity fields, oversized identifiers, invalid status transitions, and output-hash mismatches. `findLatestSuccessfulChapterStageArtifact()` finds the newest successful/compacted row for the same local task and stage so the recorder can detect an identity change. `attachChapterStageRemoteIdentity()` may update only a `running` row and stores the Session/snapshot identity before polling begins. `invalidateChapterStageArtifactsFrom()` updates successful rows for the same task whose `id >= artifactId`; this follows actual invocation order rather than a hard-coded stage list. `compactChapterTaskArtifacts()` changes successful rows to `compacted` and clears only `output_payload` after final task success.

- [ ] **Step 5: Run schema and repository tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/novel/repos/chapter-stage-artifacts.test.ts src/novel/sqlite-persistence.test.ts
```

Expected: PASS, including corrupt-hash rejection and byte-limit tests.

- [ ] **Step 6: Commit the checkpoint repository**

```bash
git add ui/server/src/novel/db.ts ui/server/src/novel/types.ts ui/server/src/novel/store.ts ui/server/src/novel/repos/chapter-stage-artifacts.ts ui/server/src/novel/repos/chapter-stage-artifacts.test.ts ui/server/src/novel/sqlite-persistence.test.ts
git commit -m "feat(novel): persist chapter stage artifacts"
```

### Task 5: Persist one stable local task ID through chapter-group recovery

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`
- Modify: `ui/server/src/routes/novel-production/run-state.ts`
- Modify: `ui/server/src/routes/novel-production-service.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Test: `ui/server/src/routes/novel-production-service.behavior-b-b.test.ts`

- [ ] **Step 1: Write RED tests for caller-supplied task identity and retry reuse**

Add a resolver test and a chapter-group retry test:

```ts
test('uses an explicit persisted task id instead of allocating a new one', async () => {
  const execution = await resolver.beginTask(beginInput({ taskId: 'chapter-task-stable-1' }))
  expect(execution.taskId).toBe('chapter-task-stable-1')
  await execution.close({ status: 'success' })
})

test('persists chapter_task_id before generation and reuses it after retry', async () => {
  const observedTaskIds: string[] = []
  const service = productionServiceHarness({
    generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
      observedTaskIds.push(options.chapter_task_id)
      if (observedTaskIds.length === 1) throw Object.assign(new Error('retry'), { code: 'MCP_SERVER_NOT_READY' })
      return successfulChapterResult()
    },
  })
  await service.executeRun(runId)
  await service.executeRun(runId)
  expect(observedTaskIds).toHaveLength(2)
  expect(observedTaskIds[0]).toBe(observedTaskIds[1])
  expect(readRunChapter(runId).chapter_task_id).toBe(observedTaskIds[0])
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/routes/novel-production-service.behavior-b-b.test.ts
```

Expected: FAIL because `beginTask()` always generates a UUID and compaction drops `chapter_task_id`.

- [ ] **Step 3: Thread the stable ID through the service**

Add `taskId?: string` to `BeginChapterTaskInput`. In `createTaskResolver()` validate it with the same bounded identifier rule used by stage receipts, then use:

```ts
const taskId = beginInput.taskId === undefined
  ? randomUUID()
  : requireChapterTaskId(beginInput.taskId)
```

In `generate-chapter-for-group-methods.ts` pass `taskId: options.chapter_task_id` to `beginTask()`.

In `novel-production-service.ts`, assign the ID before the first `status: 'running'` persistence:

```ts
const chapterTaskId = validChapterTaskId(item.chapter_task_id)
  ? item.chapter_task_id
  : randomUUID()
chapters[index] = compactRunChapterItem({
  ...item,
  chapter_task_id: chapterTaskId,
  status: 'running',
  started_at: new Date().toISOString(),
  stages: item.stages?.length ? item.stages : ctx.production.buildChapterGroupStages(),
})
```

Pass `chapter_task_id: chapterTaskId` into `ctx.generateChapterForGroup()`, and include the same field in every success, approval, cancellation, retry, and failure replacement object. Add `chapter_task_id` to `compactRunChapterItem()`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/routes/novel-production-service.behavior-b-b.test.ts
```

Expected: PASS; automatic retry and resumed execution reuse one local task ID.

- [ ] **Step 5: Commit stable task identity**

```bash
git add ui/server/src/novel-writing-service/generation-source/types.ts ui/server/src/novel-writing-service/generation-source/create-generation-source.ts ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts ui/server/src/routes/novel-production/run-state.ts ui/server/src/routes/novel-production-service.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/routes/novel-production-service.behavior-b-b.test.ts
git commit -m "feat(novel): persist chapter task identity across retries"
```

### Task 6: Make the stage recorder resumable and contract-safe

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-receipts.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write RED tests for reuse, invalidation, ambiguity, and compaction timing**

Add recorder tests with injected repository functions:

```ts
test('returns an exact successful checkpoint without calling the provider', async () => {
  let calls = 0
  const recordStage = createChapterStageRecorder({
    activeWorkspace,
    provenance: () => provenance,
    artifacts: fakeArtifacts.withReusable({ output: 'cached' }),
  })
  const result = await recordStage(
    'quality_review',
    { prompt: 'same prompt', responseContract: 'quality_review_json' },
    async () => { calls += 1; return { output: 'remote' } },
  )
  expect(result).toEqual({ output: 'cached' })
  expect(calls).toBe(0)
})

test('persists success only after the operation returns validated output', async () => {
  const events: string[] = []
  const recordStage = recorderHarness(events)
  await recordStage('draft', { prompt: 'prompt', responseContract: 'draft_prose' }, async () => {
    events.push('validated')
    return { prose_chapters: [{ chapter_no: 1, chapter_text: '正文' }] }
  })
  expect(events).toEqual(['artifact_running', 'validated', 'artifact_success', 'run_success'])
})

test('marks uncertain MCP mutations ambiguous without saving remote error text', async () => {
  const error = new McpError('MCP_SEND_UNKNOWN', 'PRIVATE_REMOTE_BODY')
  await expect(recordStage('revision', request, async () => { throw error })).rejects.toBe(error)
  expect(lastArtifact()).toMatchObject({ status: 'ambiguous', error_code: 'MCP_SEND_UNKNOWN' })
  expect(JSON.stringify(lastArtifact())).not.toContain('PRIVATE_REMOTE_BODY')
})
```

- [ ] **Step 2: Run recorder tests and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-receipts.test.ts
```

Expected: FAIL because the recorder stores only Run receipts.

- [ ] **Step 3: Compute a complete, deterministic stage input identity**

In `stage-receipts.ts`, hash a canonical JSON object rather than the prompt alone:

```ts
const inputIdentity = {
  task_id: provenance.task_id,
  project_id: provenance.project_id,
  chapter_id: provenance.chapter_id,
  stage,
  prompt_hash: sha256(request.prompt),
  response_contract: request.responseContract,
  source: provenance.source,
  source_fingerprint: provenance.source_fingerprint,
  authority_fingerprint: provenance.authority_fingerprint,
  context_version: provenance.context_version,
}
const inputHash = sha256(JSON.stringify(inputIdentity))
```

The identity object has a fixed literal property order, so its `JSON.stringify()` output is deterministic. The upstream artifact is already embedded in the next stage's self-contained prompt/context, so a changed upstream result changes `prompt_hash` and `input_hash`. Do not store the prompt.

- [ ] **Step 4: Add exact reuse and durable transitions**

Before `operation()`:

1. Look up an exact successful artifact.
2. Verify its stored output hash.
3. Append a success Run with `cache_hit: true` and `artifact_id`.
4. Parse and return `output_payload` without calling the provider.
5. If the same task/stage has a success artifact with a different identity, invalidate that row and all later observed rows before creating the new attempt.

For a cache miss, create `running`, execute the already-validating operation, serialize the plain result with the repository limits, store success, then finalize the Run. Map `MCP_SEND_UNKNOWN` and `remote_cancel_unknown` receipt evidence to artifact status `ambiguous`; map all other failures to `failed`. If artifact persistence fails, never finalize the Run as success and throw `CHAPTER_STAGE_RECEIPT_PERSIST_FAILED` with the storage failure as its non-enumerable cause.

Persist these bounded Run fields on success:

```ts
{
  receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
  ...currentProvenance(),
  stage,
  status: 'success',
  attempt: artifact.attempt,
  artifact_id: artifact.id,
  input_hash: artifact.input_hash,
  output_hash: artifact.output_hash,
  response_contract: artifact.response_contract,
  cache_hit: reused,
  elapsed_ms: Date.now() - startedAt,
}
```

Change the recorder operation signature so the MCP source can durably fence a newly created Session before polling:

```ts
export type ChapterStageRecordContext = {
  artifactId: number
  attempt: number
  attachRemoteIdentity(remote: { session_id: string; snapshot_hash: string }): Promise<void>
}

type StageRecorder = <T>(
  stage: ChapterTaskStage,
  request: { prompt: string; responseContract: ChapterStageResponseContract },
  operation: (context: ChapterStageRecordContext) => Promise<T>,
) => Promise<T>
```

`attachRemoteIdentity()` must first call `attachChapterStageRemoteIdentity()` and then update the running `chapter_generation_stage` Run with the same bounded Session/snapshot fields. It resolves only after both writes succeed. Model-source callbacks accept and ignore the context. On a cache hit the recorder never calls the callback.

- [ ] **Step 5: Compact only after full task success**

In `wrapExecution()` inside `create-generation-source.ts`, call `compactChapterTaskArtifacts(resolved.activeWorkspace, resolved.taskId)` only after `execution.close({ status: 'success' })` resolves. Do not compact for failed or cancelled outcomes. Preserve current idempotent close and lease-release behavior; if compaction and lease release both fail, return an `AggregateError` containing both failures.

- [ ] **Step 6: Run recorder and source tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-receipts.test.ts src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: PASS; model and MCP recorders use the same artifact path, and a recovered stage can skip the provider.

- [ ] **Step 7: Commit resumable stage recording**

```bash
git add ui/server/src/novel-writing-service/generation-source/stage-receipts.ts ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts ui/server/src/novel-writing-service/generation-source/create-generation-source.ts ui/server/src/novel-writing-service/generation-source/model-generation-source.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git commit -m "feat(novel): resume generation from stage artifacts"
```

### Task 7: Introduce the one-shot adapter port behind a temporary compatibility seam

**Files:**
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write RED type/behavior tests for the one-shot port**

Add an adapter fake exposing `invokeChapterStage()` and verify a draft and review produce two invocations:

```ts
test('routes each actual stage through one adapter invocation', async () => {
  const invocations: McpChapterInvocationInput[] = []
  const harness = mcpExecutionHarness({
    async invokeChapterStage(input) {
      invocations.push(input)
      return stageResult(`session-${invocations.length}`, input.stage)
    },
  })
  const execution = await harness.begin()
  await execution.generateDraft(harness.draftRequest)
  await execution.executeAgent('quality_review', 'quality_review_json', 'reviewer', {}, {})
  expect(invocations.map(item => item.stage)).toEqual(['draft', 'quality_review'])
  expect(invocations.map(item => item.taskId)).toEqual([execution.taskId, execution.taskId])
})
```

- [ ] **Step 2: Run the source test and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: FAIL because the adapter only exposes `openChapterTask()`.

- [ ] **Step 3: Define the new adapter input and method**

Replace the split task/stage input at the target boundary with:

```ts
export type McpChapterInvocationInput = McpChapterTaskInput & McpChapterStageInput & {
  invocationId: string
  stability: McpStabilityController
}

export interface McpGenerationAdapter {
  readonly id: string
  readonly stabilityPolicy?: McpStabilityPolicy
  listAgents(options: McpAdapterOperationOptions): Promise<McpAgentSummary[]>
  createAgent(input: { name: string; spaceId?: string; instructions?: string }, options: McpAdapterOperationOptions): Promise<McpAgentSummary>
  inspectSession(input: { agentId: string; sessionId: string }, options: McpAdapterOperationOptions): Promise<{ status: string; terminal: boolean }>
  invokeChapterStage(input: McpChapterInvocationInput): Promise<McpChapterStageResult>
  openChapterTask?(input: McpChapterTaskInput): Promise<McpChapterTaskSession>
  generateProse(input: McpProseGenerationInput): Promise<McpProseGenerationResult>
}
```

Keep `openChapterTask?` and `McpChapterTaskSession` temporarily so this commit compiles before the Buda implementation migrates. Add a narrow compatibility adapter in `mcp-generation-source.ts` that prefers `invokeChapterStage()` and otherwise uses the old session path only in tests/legacy callers. Mark the fallback with a removal comment that names Task 10 and contains no production feature flag.

- [ ] **Step 4: Run the source/runtime tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/mcp/runtime.test.ts src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: PASS with both the new fake and existing Buda adapter tests compiling.

- [ ] **Step 5: Commit the one-shot port**

```bash
git add ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/runtime.test.ts ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git commit -m "refactor(mcp): add one-shot chapter stage port"
```

### Task 8: Make Buda create and run one independent Session per stage

**Files:**
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.test.ts`

- [ ] **Step 1: Write RED tests for the complete single-stage lifecycle**

Replace shared-session expectations with these behaviors:

```ts
test('creates a running Session with the complete stage envelope and never posts a message', async () => {
  const fake = fakeBudaClientWithCompletedSession('session-draft', '正文')
  const result = await new BudaAdapter(fake.client as any).invokeChapterStage(invocation({
    stage: 'draft',
    responseContract: 'draft_prose',
    prompt: 'complete authoritative prompt',
  }))

  const create = fake.calls.find(call => call.name === fake.tools.createSession)
  expect(create?.args).toMatchObject({
    agentId: 'agent-1',
    startRun: true,
  })
  expect(JSON.stringify(create?.args)).toContain('complete authoritative prompt')
  expect(fake.calls.some(call => call.name === fake.tools.sendSessionMessage)).toBe(false)
  expect(result).toMatchObject({ session_id: 'session-draft', status: 'completed' })
})

test('reconnects while polling the same Agent Session id', async () => {
  const fake = fakeBudaClientThatLosesFirstPollingTransport('session-review')
  const result = await new BudaAdapter(fake.client as any).invokeChapterStage(invocation({ stage: 'quality_review' }))
  expect(fake.polledSessionIds).toEqual(['session-review', 'session-review'])
  expect(result.session_id).toBe('session-review')
})

test('does not submit a second create after an ambiguous failure', async () => {
  const fake = fakeBudaClientWithAmbiguousCreateFailure()
  await expect(new BudaAdapter(fake.client as any).invokeChapterStage(invocation()))
    .rejects.toMatchObject({ code: 'MCP_SEND_UNKNOWN' })
  expect(fake.createCount).toBe(1)
})

test('changes the Drive snapshot when stage input or upstream output changes', () => {
  const draft = buildBudaDriveSnapshot(snapshotInput({
    stage: 'draft',
    responseContract: 'draft_prose',
    prompt: 'chapter authority before draft',
  }))
  const review = buildBudaDriveSnapshot(snapshotInput({
    stage: 'quality_review',
    responseContract: 'quality_review_json',
    prompt: 'validated draft: version B',
  }))
  expect(draft.snapshotHash).not.toBe(review.snapshotHash)
  expect(review.files['MANGAFORGE_CURRENT_STAGE.md']).toContain('validated draft: version B')
})
```

- [ ] **Step 2: Run Buda adapter/Drive tests and verify RED**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/mcp/adapters/buda-drive.test.ts
```

Expected: FAIL because `openChapterTask()` creates `startRun: false` and `runStage()` uses `sendSessionMessage`.

- [ ] **Step 3: Implement the one-shot Buda lifecycle**

Implement `invokeChapterStage(input)` in this exact order:

1. Call `input.stability.ensureReady(this.stabilityPolicy, phase: 'transport')`.
2. Verify the bound Agent through `runRead(... phase: 'transport')`.
3. Build the Drive snapshot from the invocation's full authoritative context, `stage`, `responseContract`, and complete prompt. Extend `buildBudaDriveSnapshot()` to write a bounded `MANGAFORGE_CURRENT_STAGE.md`; its bytes participate in `snapshotHash`, so a changed upstream artifact or contract changes the stage snapshot.
4. Sync and hash-verify Drive using `runRead` for reads and reconciliation-aware Drive upsert handling for writes.
5. Call `createSession` through `runMutation(... phase: 'session_create')` with `message: buildBudaStageEnvelope(input)`, bounded title containing `invocationId`, `startRun: true`, and the configured optional Buda model.
6. Emit `session_created` as soon as the Session ID is known so the caller can persist the stage fence before polling.
7. Poll `getSession` through `runRead(... phase: 'session_poll')`; Transport replacement must continue using the same Agent Session ID.
8. Extract the terminal stage content and return its `session_id` and stage-specific `snapshot_hash`.
9. On timeout, cancellation, invalid output, or known Session failure, run the existing short cleanup deadline. If cancellation cannot be confirmed, return `remote_cancel_unknown` evidence.

Delete baseline-message and prior-terminal correlation logic from the new path because every Session contains one run. Keep bounded extraction and terminal-status validation.

- [ ] **Step 4: Correct Drive error classification and reconciliation**

In `buda-drive.ts`:

- Let `MCP_SERVER_NOT_READY` pass through unchanged with `phase: 'drive_sync'`.
- Keep `MCP_DRIVE_SYNC_FAILED` only for explicit Drive tool failure, read-back failure after stabilization, or content/hash mismatch.
- If an upsert response is lost, read the target path; matching content hash completes the operation, a differing hash permits a stabilized retry, and an unreadable/unknown result is ambiguous and is not blindly replayed.

Add this regression assertion:

```ts
await expect(syncWithNotReadyProbe()).rejects.toMatchObject({
  code: 'MCP_SERVER_NOT_READY',
  details: { phase: 'drive_sync' },
})
await expect(syncWithHashMismatch()).rejects.toMatchObject({
  code: 'MCP_DRIVE_SYNC_FAILED',
})
```

- [ ] **Step 5: Run Buda tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/mcp/adapters/buda-drive.test.ts src/mcp/stability.test.ts
```

Expected: PASS; each adapter invocation performs exactly one `createSession(startRun: true)` and zero `sendSessionMessage` calls.

- [ ] **Step 6: Commit the Buda one-shot implementation**

```bash
git add ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/adapters/buda-drive.ts ui/server/src/mcp/adapters/buda-drive.test.ts
git commit -m "feat(mcp): run Buda stages in independent sessions"
```

### Task 9: Refactor `McpGenerationSource` to task-level authority and stage-level Sessions

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/mcp/agent-lease.ts`
- Modify: `ui/server/src/mcp/agent-lease.test.ts`
- Modify: `ui/server/src/mcp/types.ts`
- Modify: `ui/server/src/mcp/quarantine-store.ts`
- Modify: `ui/server/src/mcp/stores.test.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`

- [ ] **Step 1: Write RED lifecycle tests**

Add source tests proving one task identity/lease/deadline and distinct stage Sessions:

```ts
test('keeps task authority fixed while accepting a distinct Session per stage', async () => {
  const harness = independentStageHarness(['session-draft', 'session-review', 'session-revision'])
  const execution = await harness.begin()
  await execution.generateDraft(harness.draftRequest)
  await execution.executeAgent('quality_review', 'quality_review_json', 'reviewer', {}, {})
  await execution.executeAgent('revision', 'revision_prose', 'reviser', {}, {})
  await execution.close({ status: 'success' })

  expect(harness.taskIds).toEqual([execution.taskId, execution.taskId, execution.taskId])
  expect(new Set(harness.sessionIds).size).toBe(3)
  expect(harness.leaseAcquires).toBe(1)
  expect(harness.leaseReleases).toBe(1)
  expect(harness.deadlineCreates).toBe(1)
})

test('reuses draft artifact and creates only a review Session after recovery', async () => {
  const first = recoveryHarness({ failStage: 'quality_review' })
  await expect(first.run()).rejects.toThrow()
  const second = recoveryHarness({ workspace: first.workspace, taskId: first.taskId })
  await second.run()
  expect(second.invokedStages).toEqual(['quality_review', 'story_state_sync'])
})

test('rejects an adapter that reuses a Session id for two stages', async () => {
  const harness = independentStageHarness(['session-1', 'session-1'])
  const execution = await harness.begin()
  await execution.generateDraft(harness.draftRequest)
  await expect(execution.executeAgent('quality_review', 'quality_review_json', 'reviewer', {}, {}))
    .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
})

test.each([
  ['draft', 'draft_prose'],
  ['word_target_repair', 'word_target_prose'],
  ['commercial_editor_rewrite', 'editor_rewrite_prose'],
  ['meme_polish', 'meme_polish_prose'],
  ['readability_review', 'readability_json'],
  ['humanize', 'humanize_prose'],
  ['quality_review', 'quality_review_json'],
  ['quality_recheck', 'quality_review_json'],
  ['structured_review_fill', 'structured_review_json'],
  ['quality_repair', 'revision_prose'],
  ['manual_recheck', 'quality_review_json'],
  ['editor_report', 'editor_report_json'],
  ['revision', 'revision_prose'],
  ['post_revision_review', 'quality_review_json'],
  ['story_state_sync', 'story_state_json'],
] satisfies Array<[ChapterTaskStage, ChapterStageResponseContract]>

test.each(allStageContracts)(
  'uses one one-shot invocation for %s',
  async (stage, responseContract) => {
    const harness = singleStageHarness(stage, responseContract)
    await harness.invoke()
    expect(harness.adapterInvocations).toHaveLength(1)
    expect(harness.adapterInvocations[0]).toMatchObject({ stage, responseContract })
  },
)
```

- [ ] **Step 2: Run source and lease tests and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/mcp/agent-lease.test.ts
```

Expected: FAIL because the source caches one task-level remote Session and rejects changing Session IDs.

- [ ] **Step 3: Replace shared Session fields with task initialization**

Remove task-wide `sessionPromise`, `session`, `sessionId`, `snapshotHash`, `remoteSessionId`, `remoteSnapshotHash`, and `sessionFencePromise`. Add:

```ts
private initializationPromise?: Promise<ResolvedStageRuntime>
private readonly observedSessionIds = new Set<string>()
private activeInvocation?: {
  invocationId: string
  stage: ChapterTaskStage
  sessionId: string
  snapshotHash: string
  fenceStaged: boolean
}
```

`initializeTask()` must perform the binding/source fence checks, acquire the Agent lease once, create the one total deadline once, resolve the adapter/stability controller once, verify Adapter identity, and append one task-level `mcp_chapter_task` Run without a task-level Session ID.

- [ ] **Step 4: Implement one stage invocation and per-stage fence**

For each cache-miss stage:

```ts
const invocationId = safeOutboundRequestId(
  this.scrubber,
  `${this.taskId}:${stage}:${++this.stageSequence}`,
)
const result = await runtime.adapter.invokeChapterStage({
  ...taskInput,
  ...stageInput,
  invocationId,
  stability: runtime.stability,
  onProgress: event => this.onStageProgress(invocationId, stage, event),
})
```

When `session_created` arrives, call `recordContext.attachRemoteIdentity({ session_id, snapshot_hash })` first, then call `lease.stageSessionFence({ requestId: invocationId, sessionId })`. After a confirmed terminal result, clear that fence before allowing the next stage. If a known Session becomes ambiguous, convert its fence to quarantine, release the in-memory lease, and stop. Reject a Session ID already present in `observedSessionIds`. Keep `stageTail` serialization even though the workflow is already sequential.

If `createSession` is ambiguous before any Session ID is known, persist artifact status `ambiguous` and quarantine the Agent with `reason: 'session_create_unknown'`, `request_id: invocationId`, and an absent remote Session identity. Extend `McpAgentQuarantineReason`, quarantine storage projection, and `McpAgentLease.quarantine()` so this one reason permits no `session_id`; all existing reasons still require a real Session ID. Automatic reconciliation must not call `inspectSession()` for `session_create_unknown`; it remains isolated until explicit user acknowledgement because there is no safe remote lookup key. Never substitute `invocationId` as a fake Session ID.

Add deterministic tests for the no-ID case:

```ts
await lease.quarantine({ requestId: 'invocation-1', reason: 'session_create_unknown' })
const [record] = await registry.list(workspace)
expect(record).toMatchObject({ request_id: 'invocation-1', reason: 'session_create_unknown' })
expect(record.session_id).toBeUndefined()
const reconciled = await runtime.reconcileAgentQuarantine(workspace, record.id)
expect(reconciled).toMatchObject({ outcome: 'ack_required', cleared: false })
expect(inspectSessionCalls).toBe(0)
```

`provenance()` returns task identity and fixed provider fields. The stage recorder's dynamic success provenance additionally projects only the current invocation's bounded `session_id`; no task-level receipt claims a shared Session.

- [ ] **Step 5: Preserve total deadline and safe close behavior**

Do not recreate the deadline after a Transport recovery or between stages. `close({ status: 'success' })` must assert no active fence, finalize the task receipt, release the one lease, and close the deadline. Failure/cancellation must wait for the active invocation's cleanup result before deciding whether to clear or quarantine the fence. A checkpoint cache hit performs no Agent fence operation.

Extend `agent-lease.test.ts` with sequential fence cycling:

```ts
const lease = await registry.acquire(workspace, binding)
await lease.stageSessionFence({ requestId: 'stage-1', sessionId: 'session-1' })
await lease.clearSessionFence()
await lease.stageSessionFence({ requestId: 'stage-2', sessionId: 'session-2' })
await lease.clearSessionFence()
await lease.release()
expect(await registry.list(workspace)).toEqual([])
```

- [ ] **Step 6: Run source and lease tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/mcp/agent-lease.test.ts src/novel-writing-service/generation-source/stage-receipts.test.ts
```

Expected: PASS; Session IDs differ per remote stage while task/lease/deadline identities remain fixed.

- [ ] **Step 7: Commit the source lifecycle refactor**

```bash
git add ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/mcp/agent-lease.ts ui/server/src/mcp/agent-lease.test.ts ui/server/src/mcp/types.ts ui/server/src/mcp/quarantine-store.ts ui/server/src/mcp/stores.test.ts ui/server/src/mcp/runtime.ts ui/server/src/mcp/runtime.test.ts
git commit -m "refactor(mcp): scope sessions to chapter stages"
```

### Task 10: Remove the shared-session production path and keep old records historical

**Files:**
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-tool-map.ts`
- Modify: `ui/server/src/mcp/adapters/buda-tool-map.test.ts`

- [ ] **Step 1: Write RED tests that forbid the legacy path**

Add boundary assertions:

```ts
test('the generation adapter contract has no shared chapter task session', () => {
  const adapter = new BudaAdapter(fakeBudaClient().client as any) as any
  expect(adapter.openChapterTask).toBeUndefined()
})

test('the stage-production source never resolves sendSessionMessage', async () => {
  const harness = independentStageHarness(['session-draft', 'session-review'])
  await harness.run()
  expect(harness.resolvedToolCapabilities).not.toContain('sendSessionMessage')
  expect(harness.calls.some(call => call.operation === 'sendSessionMessage')).toBe(false)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/novel-writing-service/generation-source/generation-source.test.ts src/mcp/runtime.test.ts
```

Expected: FAIL while the optional compatibility method and shared-session class remain.

- [ ] **Step 3: Delete shared Session types and implementation**

Remove:

- `McpChapterTaskSession`
- `McpGenerationAdapter.openChapterTask`
- `BudaChapterTaskSessionImpl`
- `BudaAdapter.openChapterTask`
- the temporary compatibility seam from Task 7
- every production call to `sendSessionMessage`
- task-level Session consistency checks and shared baseline/run-correlation state

Remove `sendSessionMessage` from `buda-tool-map.ts`, its argument builder, and its tests. The current repository has no independent non-chapter production consumer after `generateProse()` delegates to `invokeChapterStage()`. Historical `mcp_chapter_task` Runs remain readable; do not update or synthesize per-stage Session IDs for them.

- [ ] **Step 4: Add an old-active-task migration guard**

When initializing a recovered local task, inspect existing `mcp_chapter_task` receipt shape. If it is an old active shared-Session receipt, do not call the old Session message tool. Require existing quarantine/inspection reconciliation when a remote Session identity exists, then start a new stage invocation only after that fence is cleared. Already-persisted chapter prose and Reviews remain untouched.

Test with a legacy fixture:

```ts
await seedLegacySharedTaskRun({ status: 'running', session_id: 'legacy-session' })
await expect(beginRecoveredTask()).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
expect(remoteCalls).not.toContainEqual(expect.objectContaining({ operation: 'sendSessionMessage' }))
expect(await readChapter()).toMatchObject({ chapter_text: 'already persisted prose' })
```

- [ ] **Step 5: Run all MCP/source tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/mcp src/novel-writing-service/generation-source
```

Expected: PASS and the production-source search returns no shared-session calls:

```bash
rg -n "openChapterTask|McpChapterTaskSession|BudaChapterTaskSessionImpl|sendSessionMessage" ui/server/src --glob '!**/*.test.ts'
```

Expected: no output.

- [ ] **Step 6: Commit legacy-path removal**

```bash
git add ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/runtime.test.ts ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/mcp/adapters/buda-tool-map.ts ui/server/src/mcp/adapters/buda-tool-map.test.ts
git commit -m "refactor(mcp): remove shared chapter sessions"
```

### Task 11: Expose accurate recovery progress and failures without fallback advice

**Files:**
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-production-service.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

- [ ] **Step 1: Write RED tests for status, labels, and safe guidance**

Add route/builder/web assertions:

```ts
expect(expectedStatuses.MCP_SERVER_NOT_READY).toBe(503)
expect(standaloneProseServiceStageLabel('mcp_transport_stabilizing'))
  .toBe('稳定 MCP 连接')
expect(formatMcpGenerationFailure({
  error_code: 'MCP_SERVER_NOT_READY',
  phase: 'session_create',
})).toContain('当前阶段已暂停')
expect(formatMcpGenerationFailure({
  error_code: 'MCP_SERVER_NOT_READY',
  phase: 'session_create',
})).not.toContain('切换模型')
```

Also assert a `MCP_DRIVE_SYNC_FAILED` response still maps to 502 and uses Drive-specific guidance.

- [ ] **Step 2: Run route and web model tests and verify RED**

Run:

```bash
cd ui/server && bun test src/routes/novel-mcp-binding-routes.test.ts
cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
```

Expected: FAIL because the new code and progress label are not mapped.

- [ ] **Step 3: Add safe public mapping**

Map `MCP_SERVER_NOT_READY` to HTTP 503 in binding routes and standalone generation routes. Add labels for:

```ts
mcp_transport_stabilizing: '稳定 MCP 连接'
mcp_drive_sync: '同步 Agent Drive'
mcp_session_create: '创建阶段 Session'
mcp_session_wait: '等待阶段 Agent'
mcp_extract: '提取阶段结果'
```

In `classifyGenerationFailure()`, branch on error code before message text:

```ts
if (error?.code === 'MCP_SERVER_NOT_READY') {
  return {
    type: 'mcp_server_not_ready',
    actions: ['保留已完成阶段', '等待 MCP 服务稳定后从当前阶段继续'],
  }
}
if (error?.code === 'MCP_DRIVE_SYNC_FAILED') {
  return {
    type: 'mcp_drive_sync_failed',
    actions: ['检查 MCP Drive 权限和内容对账', '修复后从当前阶段继续'],
  }
}
```

Never recommend model switching for an MCP task. Public payloads may include the bounded `phase`, recovery count, and elapsed time, but not full Session IDs, prompt/content, header values, or remote response text.

- [ ] **Step 4: Run route/web tests and verify GREEN**

Run:

```bash
cd ui/server && bun test src/routes/novel-mcp-binding-routes.test.ts
cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
```

Expected: PASS with distinct Transport-not-ready and Drive-content failure presentation.

- [ ] **Step 5: Commit public error semantics**

```bash
git add ui/server/src/routes/novel-mcp-binding-routes.ts ui/server/src/routes/novel-mcp-binding-routes.test.ts ui/server/src/routes/novel-generation/builders.ts ui/server/src/routes/novel-production-service.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
git commit -m "fix(mcp): expose stage recovery failures accurately"
```

### Task 12: Update the Buda smoke contract for distinct stage Sessions

**Files:**
- Modify: `scripts/check-buda-chapter-task-session.mjs`
- Modify: `scripts/check-buda-chapter-task-session.test.ts`
- Modify: `ui/server/package.json`

- [ ] **Step 1: Write RED smoke assertion tests**

Replace `assertOneTaskSession()` with a provider-identity assertion that requires one local task and distinct Session IDs:

```ts
test('requires stable task/provider identity and one distinct Session per stage', () => {
  const projected = assertIndependentStageSessions([
    receipt('draft', { session_id: 'session-draft' }),
    receipt('quality_review', { session_id: 'session-review' }),
    receipt('story_state_sync', { session_id: 'session-story-state' }),
  ])
  expect(projected.task_id).toBe('task-1')
  expect(projected.session_count).toBe(3)
  expect(projected.stages).toEqual(['draft', 'quality_review', 'story_state_sync'])
})

test('rejects Session reuse inside one local task', () => {
  expect(() => assertIndependentStageSessions([
    receipt('draft', { session_id: 'session-reused' }),
    receipt('quality_review', { session_id: 'session-reused' }),
  ])).toThrow('chapter stage Session was reused')
})
```

- [ ] **Step 2: Run smoke unit tests and verify RED**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: FAIL because the current smoke requires all stages to share one Session.

- [ ] **Step 3: Implement safe black-box assertions**

Implement `assertIndependentStageSessions(receipts)` so it requires:

- one `task_id`, source fingerprint, authority fingerprint, Server, Key ID, Adapter, Agent, and optional model across the automatic chain;
- a non-empty bounded `session_id` on every actual stage;
- pairwise-distinct Session IDs;
- automatic coverage containing `draft`, `story_state_sync`, and at least one review/repair stage;
- no model fallback receipt;
- no remaining quarantine after completion.

Log only masked fingerprints and hashes of Session IDs. Rename the package script to `smoke:buda:independent-stage-sessions` while keeping `smoke:buda:chapter-source` as an alias for one release.

- [ ] **Step 4: Run smoke unit tests and verify GREEN**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: PASS; deterministic fixtures use distinct Sessions per automatic stage and a new local task for manual recheck.

- [ ] **Step 5: Commit the smoke contract**

```bash
git add scripts/check-buda-chapter-task-session.mjs scripts/check-buda-chapter-task-session.test.ts ui/server/package.json
git commit -m "test(mcp): verify independent Buda stage sessions"
```

### Task 13: Full verification and two-account real Buda acceptance

**Files:**
- Modify only if a verification failure exposes a defect in files already listed above
- Do not modify: `workspace/assets.json`

- [ ] **Step 1: Run the focused MCP and artifact suites**

Run:

```bash
cd ui/server && bun test src/mcp src/novel/repos/chapter-stage-artifacts.test.ts src/novel-writing-service/generation-source
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run all Server tests**

Run:

```bash
cd ui/server && bun test
```

Expected: PASS with zero failures.

- [ ] **Step 3: Run all Web tests and both builds**

Run:

```bash
cd ui/web && bun test
cd ../.. && bun run build:server
bun run build:web
bun run check:refactor-boundaries
```

Expected: all tests pass, both builds exit 0, and refactor-boundary checks report no violations.

- [ ] **Step 4: Audit source uniqueness, sensitive data, and legacy APIs**

Run:

```bash
rg -n "openChapterTask|McpChapterTaskSession|BudaChapterTaskSessionImpl" ui/server/src scripts
rg -n "sendSessionMessage" ui/server/src scripts
git diff --check
git status --short
```

Expected:

- no shared chapter-session symbols;
- no chapter-production call to `sendSessionMessage`;
- no whitespace errors;
- `workspace/assets.json` remains the only pre-existing unrelated modification and is unstaged;
- no test account, Key, custom header value, chapter正文, or complete remote Session ID appears in tracked changes.

- [ ] **Step 5: Run real acceptance with test account A under one global deadline**

Start the production server against the securely configured acceptance-A workspace. Use identifiers supplied through the shell environment, never literal credentials:

```bash
cd ui/server
bun run smoke:buda:independent-stage-sessions -- \
  --base-url "$BUDA_ACCEPTANCE_A_BASE_URL" \
  --project-id "$BUDA_ACCEPTANCE_A_PROJECT_ID" \
  --chapter-id "$BUDA_ACCEPTANCE_A_CHAPTER_ID" \
  --timeout-ms 900000 \
  --poll-interval-ms 1000
```

Expected: exit 0; source remains MCP; each actual stage has a distinct masked Session identity; completed stages are not repeated; final prose, review/revision results, and Story State are persisted; quarantine list is empty.

- [ ] **Step 6: Run real acceptance with test account B independently**

Run against a separately configured new novel and chapter:

```bash
cd ui/server
bun run smoke:buda:independent-stage-sessions -- \
  --base-url "$BUDA_ACCEPTANCE_B_BASE_URL" \
  --project-id "$BUDA_ACCEPTANCE_B_PROJECT_ID" \
  --chapter-id "$BUDA_ACCEPTANCE_B_CHAPTER_ID" \
  --timeout-ms 900000 \
  --poll-interval-ms 1000
```

Expected: the same assertions pass independently. If Buda exhausts the deadline, verify the current stage reports `MCP_SERVER_NOT_READY`, successful upstream artifacts remain reusable, no second ambiguous create occurred, and rerun the same command only after confirming there is no unresolved quarantine.

- [ ] **Step 7: Re-run affected tests after any acceptance fix**

For every defect found during real acceptance, first add a deterministic failing regression test, apply the smallest fix, then rerun Steps 1–4 before repeating only the affected account smoke.

- [ ] **Step 8: Commit final verification-only corrections if needed**

Stage only the explicit implementation and test files. Never stage `workspace/assets.json`:

```bash
git diff --name-only --cached
git status --short
git commit -m "fix(mcp): close independent stage acceptance gaps"
```

Expected: either no final correction commit is needed, or the commit contains only reviewed MCP/chapter-generation files and their regression tests.

## Final acceptance checklist

- [ ] Every actual chapter stage uses exactly one new remote Agent Session.
- [ ] One local task ID, source binding, Agent lease, and total deadline span the full chain.
- [ ] Buda Transport readiness requires consecutive real probes; generic MCP code contains no Buda tool name.
- [ ] Exact pre-dispatch rejection may retry; ambiguous mutation never retries blindly.
- [ ] Polling can rotate Transport while retaining the Agent Session ID.
- [ ] A failed downstream stage resumes from a validated local artifact without rerunning upstream generation.
- [ ] Context/source/binding/contract/upstream changes invalidate the affected artifact and later observed artifacts.
- [ ] Old shared Sessions are historical only and never receive a new stage message.
- [ ] `MCP_SERVER_NOT_READY` and `MCP_DRIVE_SYNC_FAILED` have distinct behavior and UI guidance.
- [ ] No MCP failure path falls back to a model source.
- [ ] Full tests, builds, and both independent Buda account smokes pass without credential or content leakage.
