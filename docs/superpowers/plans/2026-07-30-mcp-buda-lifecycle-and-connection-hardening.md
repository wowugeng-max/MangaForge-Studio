# MCP Buda Lifecycle and Connection Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match Buda’s live Agent contract and make each MCP production attempt deadline-bound, session-durable, safely cancellable, non-replaying, quarantinable, and leased through local quality review and atomic acceptance.

**Architecture:** Classify every MCP call as read-safe or mutation, let a manager-owned connection setup serve independent waiters, and allow only read-safe calls one reconnect/retry inside the remaining generation budget. A workspace/Server/Key/Agent lease begins before Buda Drive/session work and is transferred as an internal capability through the local production pipeline; Session creation is durably receipted before send, while unresolved remote cancellation creates a durable quarantine that diagnostics or an explicit user action can clear.

**Tech Stack:** TypeScript, Bun test runner, Model Context Protocol Streamable HTTP client, Express, Bun SQLite novel runs, React 18, Ant Design

---

## File Map

- Create `ui/server/src/mcp/deadline.ts`: caller-cancellation versus deadline timeout, remaining-budget calculation, and cleanup deadlines.
- Create `ui/server/src/mcp/deadline.test.ts`: deterministic cancellation/timeout/budget tests.
- Create `ui/server/src/mcp/quarantine-store.ts`: durable Agent-tuple quarantine records using the atomic JSON helper.
- Create `ui/server/src/mcp/agent-lease.ts`: active tuple leases, quarantine enforcement, and test hooks.
- Create `ui/server/src/mcp/agent-lease.test.ts`: busy, release, and durable quarantine tests.
- Create `ui/server/src/novel-writing-service/generation-source/production-lease.ts`: non-serializable lease transfer helpers.
- Modify `ui/server/src/mcp/errors.ts`: connection-lost, send-unknown, binding-change, and quarantine codes while preserving cancellation/timeout causes.
- Modify `ui/server/src/mcp/types.ts`: operation policy and public quarantine types.
- Modify `ui/server/src/mcp/adapters/types.ts`: per-call operation/timeout options, session progress, and reconciliation contract.
- Modify `ui/server/src/mcp/adapters/buda-adapter.ts`: live `apiAgents` normalization, total deadline, durable pre-send progress, bounded cancel, and no mutation replay.
- Modify `ui/server/src/mcp/adapters/buda-adapter.test.ts`: live fixture, deadline, send ambiguity, cancel confirmation, and replay tests.
- Modify `ui/server/src/mcp/adapters/buda-drive.ts`: deadline-aware reads/writes and ambiguous-write read/verify reconciliation.
- Modify `ui/server/src/mcp/adapters/buda-drive.test.ts`: read retry and mutation non-replay tests.
- Modify `ui/server/src/mcp/client.ts`: operation options, typed abort causes, and broken-transport closure.
- Modify `ui/server/src/mcp/client.test.ts`: timeout/cancel distinction and broken-state tests.
- Modify `ui/server/src/mcp/client-manager.ts`: manager-owned connection AbortController, independent waiters, identity-checked eviction, and shutdown abort.
- Modify `ui/server/src/mcp/client-manager.test.ts`: independent cancellation, invalidation abort, and stale-failure tests.
- Modify `ui/server/src/mcp/runtime.ts`: resilient read-safe client port, lease/quarantine operations, and diagnostics reconciliation.
- Modify `ui/server/src/mcp/runtime.test.ts`: exactly-once read recovery and never-replayed mutation tests.
- Modify `ui/server/src/novel-writing-service/generation-source/types.ts`: internal production lease on the source result path.
- Modify `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: end-to-end deadline, awaited `session_created` receipt, terminal receipt states, and lease transfer.
- Modify `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`: receipt ordering, statuses, scrubbing, and quarantine tests.
- Modify `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts`: take or release the internal MCP lease safely.
- Modify `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`: release the lease only after draft-mode/full acceptance or terminal local failure.
- Modify `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`: prove the lease spans quality and store hooks.
- Modify `ui/server/src/routes/novel-mcp-binding-routes.ts`: reject binding changes involving an active leased tuple.
- Modify `ui/server/src/routes/novel-mcp-binding-routes.test.ts`: active-lease conflict test.
- Modify `ui/server/src/routes/mcp-routes.ts`: quarantine list/reconcile/clear endpoints and status mapping.
- Modify `ui/server/src/routes/mcp-routes.test.ts`: quarantine endpoint tests.
- Modify `ui/server/src/routes/novel-generation/builders.ts`: status mapping for new stable MCP errors.
- Modify `ui/server/src/routes/novel-generation/builders.mcp.test.ts`: HTTP mapping tests.
- Modify `ui/web/src/api/mcp.ts`: quarantine API/types.
- Modify `ui/web/src/pages/McpServices/index.tsx`: quarantine warnings and explicit reconcile/clear actions.
- Modify `ui/web/src/pages/McpServices/mcpServicesShell.test.ts`: explicit warning/action source contract.
- Modify `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`: actionable stable generation-error messages.
- Modify `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`: message mapping tests.
- Modify `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx`: preserve and display SSE/HTTP MCP error codes.

### Task 1: Match the live Buda Agent contract and classify operations

**Files:**
- Modify: `ui/server/src/mcp/types.ts`
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.test.ts`

- [ ] **Step 1: Change the primary Agent fixture to the live shape and verify RED**

Change the fake `listApiAgents` result to:

```ts
return structured({
  apiAgents: [{ id: 'agent-1', name: '正文 Agent', spaceId: 'space-1' }],
  total: 1,
})
```

Keep separate compatibility assertions for `{ agents: [...] }` and a raw array.

Run:

```bash
cd ui/server
bun test src/mcp/adapters/buda-adapter.test.ts -t "lists existing Agents"
```

Expected: FAIL because the current Adapter only reads `agents` or a raw array.

- [ ] **Step 2: Normalize the live and compatibility shapes**

Add:

```ts
export function normalizeBudaAgentList(data: any) {
  const agents = Array.isArray(data?.apiAgents)
    ? data.apiAgents
    : Array.isArray(data?.agents)
      ? data.agents
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : []
  return agents.map(cleanAgent).filter(item => item.id)
}
```

Use it in `listAgents` and keep `total` informational only.

- [ ] **Step 3: Add explicit operation semantics to the client port**

Add:

```ts
export type McpOperationKind = 'read_safe' | 'mutation'

export type McpOperationOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  operation: McpOperationKind
}
```

Change `McpClientPort` to:

```ts
export type McpClientPort = {
  listTools(options: Omit<McpOperationOptions, 'operation'>): Promise<McpToolDescriptor[]>
  callTool(
    name: string,
    args: Record<string, unknown>,
    options: McpOperationOptions,
  ): Promise<McpToolResult>
}

export interface ProseMcpAdapter {
  readonly id: string
  listAgents(options: Omit<McpOperationOptions, 'operation'>): Promise<McpAgentSummary[]>
  createAgent(
    input: { name: string; spaceId?: string; instructions?: string },
    options: Omit<McpOperationOptions, 'operation'>,
  ): Promise<{ id: string; name: string }>
  generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult>
}
```

Add `McpAgentSummary` to the type-only import from `../types` used by this interface.

Mark operations exactly:

- `listTools`, Agent list, Drive list/read, and Session status: `read_safe`.
- Agent creation, Drive upsert, Session creation/send/cancel: `mutation`.

Update every fake client to capture `options.operation` and assert Drive writes, Session creation, and send are mutations.

- [ ] **Step 4: Reconcile an ambiguous Drive write without replaying it**

In `syncBudaDriveSnapshot`, call each upsert once. If it throws, perform one read-safe text read:

```ts
try {
  await client.callTool(tools.upsertDriveFile, {
    agentId,
    path,
    content,
    mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
  }, operationOptions('mutation'))
} catch (error) {
  const reconciled = driveText(await client.callTool(
    tools.readDriveText,
    { agentId, filePath: path, maxBytes: 5_000_000 },
    operationOptions('read_safe'),
  ))
  if (reconciled !== content) throw error
}
```

The normal post-write verification remains. Add a test where upsert stores the content and then throws; assert one upsert and a successful read/verify. Add a second test where content is absent; assert one upsert and `MCP_DRIVE_SYNC_FAILED`.

- [ ] **Step 5: Verify live discovery and operation classification**

Run:

```bash
cd ui/server
bun test \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/adapters/buda-drive.test.ts \
  src/mcp/adapters/buda-tool-map.test.ts
```

Expected: the live `apiAgents` fixture passes, compatibility shapes remain supported, and no mutation is called twice.

- [ ] **Step 6: Commit the Buda contract and policy**

```bash
git add ui/server/src/mcp/types.ts \
  ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/adapters/buda-adapter.test.ts \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts
git diff --cached --check
git commit -m "fix(mcp): match Buda agents and classify tool replay"
```

Expected: one contract/policy commit.

### Task 2: Give shared connections independent waiters and safe read recovery

**Files:**
- Modify: `ui/server/src/mcp/errors.ts`
- Modify: `ui/server/src/mcp/client.ts`
- Modify: `ui/server/src/mcp/client.test.ts`
- Modify: `ui/server/src/mcp/client-manager.ts`
- Modify: `ui/server/src/mcp/client-manager.test.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`

- [ ] **Step 1: Write RED connection-sharing and recovery tests**

Add this helper and three manager cases:

```ts
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function pendingConnectionFixture() {
  const gate = deferred<void>()
  let connectSignal: AbortSignal | undefined
  const client = {
    state: 'Closed',
    async connect(signal?: AbortSignal) {
      connectSignal = signal
      await Promise.race([
        gate.promise,
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
      ])
      this.state = 'Ready'
    },
    async close() { this.state = 'Closed' },
  }
  const manager = new McpClientManager({ createClient: () => client as any })
  return {
    manager,
    client,
    server: { id: 'buda' } as any,
    key: { id: 1 } as any,
    workspace: '/workspace/a',
    releaseConnect: () => gate.resolve(),
    readConnectSignal: () => connectSignal,
  }
}

test('one waiter can cancel without aborting another waiter', async () => {
  const {
    manager, client, server, key, workspace, releaseConnect, readConnectSignal,
  } = pendingConnectionFixture()
  const firstController = new AbortController()
  const secondController = new AbortController()
  const first = manager.get(workspace, server, key, firstController.signal)
  const second = manager.get(workspace, server, key, secondController.signal)
  firstController.abort()
  await expect(first).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
  releaseConnect()
  await expect(second).resolves.toBe(client)
  expect(readConnectSignal()?.aborted).toBe(false)
})

test('invalidation aborts connection setup immediately', async () => {
  const {
    manager, server, key, workspace, readConnectSignal,
  } = pendingConnectionFixture()
  const pending = manager.get(workspace, server, key)
  await Promise.resolve()
  await manager.invalidate(workspace, server.id, key.id)
  expect(readConnectSignal()?.aborted).toBe(true)
  await expect(pending).rejects.toBeTruthy()
})

test('an old failed connection cannot evict its replacement', async () => {
  const firstGate = deferred<void>()
  const secondGate = deferred<void>()
  let createCount = 0
  const clients = [firstGate, secondGate].map(gate => ({
    state: 'Closed',
    async connect(signal?: AbortSignal) {
      await Promise.race([
        gate.promise,
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
      ])
      this.state = 'Ready'
    },
    async close() { this.state = 'Closed' },
  }))
  const manager = new McpClientManager({
    createClient: () => clients[createCount++] as any,
  })
  const server = { id: 'buda' } as any
  const key = { id: 1 } as any

  const first = manager.get('/workspace/a', server, key)
  await Promise.resolve()
  const invalidation = manager.invalidate('/workspace/a', 'buda', 1)
  const second = manager.get('/workspace/a', server, key)
  secondGate.resolve()
  const replacement = await second
  await Promise.allSettled([first, invalidation])

  expect(await manager.get('/workspace/a', server, key)).toBe(replacement)
  expect(createCount).toBe(2)
})
```

In `runtime.test.ts`, make a read-safe call fail once with `MCP_CONNECTION_LOST` and then succeed after reconnect; assert two reads. Make a mutation fail with the same code; assert one mutation and no retry.

- [ ] **Step 2: Run client/manager/runtime tests to verify RED**

Run:

```bash
cd ui/server
bun test src/mcp/client.test.ts src/mcp/client-manager.test.ts src/mcp/runtime.test.ts
```

Expected: first-caller cancellation currently controls the shared connect and runtime has no operation-aware recovery.

- [ ] **Step 3: Mark broken transports closed**

Add `MCP_CONNECTION_LOST` to `McpErrorCode`. In `GenericMcpClient.callTool`, detect closed session/transport failures:

```ts
function isBrokenTransport(error: unknown) {
  return /session.{0,20}(expired|closed|not found)|transport.{0,20}(closed|terminated)|ECONNRESET|socket hang up/i
    .test(errorMessage(error))
}
```

When it matches, set `state = 'Closed'`, clear cached tools, start best-effort `close()`, and throw:

```ts
new McpError('MCP_CONNECTION_LOST', 'MCP 连接已失效', { tool_name: name })
```

Cancellation from `options.signal` remains `MCP_CANCELLED` and is never converted to connection loss.

- [ ] **Step 4: Replace the connecting Promise map with manager-owned entries**

Use:

```ts
type ConnectionEntry = {
  client: GenericMcpClient
  controller: AbortController
  promise: Promise<GenericMcpClient>
  waiters: number
}
```

Create each connection with `entry.controller.signal`, never a caller signal. Race each waiter independently:

```ts
async function waitForConnection(entry: ConnectionEntry, signal?: AbortSignal) {
  if (signal?.aborted) throw new McpError('MCP_CANCELLED', 'MCP 连接等待已取消')
  entry.waiters += 1
  let abortListener: (() => void) | undefined
  try {
    if (!signal) return await entry.promise
    return await Promise.race([
      entry.promise,
      new Promise<never>((_resolve, reject) => {
        abortListener = () => reject(new McpError('MCP_CANCELLED', 'MCP 连接等待已取消'))
        signal.addEventListener('abort', abortListener, { once: true })
      }),
    ])
  } finally {
    if (abortListener) signal?.removeEventListener('abort', abortListener)
    entry.waiters -= 1
    if (entry.waiters === 0 && entry.client.state !== 'Ready') entry.controller.abort()
  }
}
```

In every connection `catch/finally`, delete maps only when the stored entry/client is still identical. `invalidate`, `invalidateServer`, and `closeAll` first abort matching entry controllers, then await settlement, then close clients.

- [ ] **Step 5: Add exactly-once read-safe recovery in the runtime port**

Have `getAdapterForKey` build a managed port whose operations reacquire through the manager. For reads:

```ts
const runReadSafe = async <T>(
  operation: (client: ResolvedMcpCredential['client']) => Promise<T>,
  signal?: AbortSignal,
) => {
  let client = await manager.get(activeWorkspace, server, key, signal) as ResolvedMcpCredential['client']
  try {
    return await operation(client)
  } catch (error) {
    if (!(error instanceof McpError) || error.code !== 'MCP_CONNECTION_LOST') throw error
    await manager.invalidateIfCurrent(activeWorkspace, server.id, key.id, client)
    client = await manager.get(activeWorkspace, server, key, signal) as ResolvedMcpCredential['client']
    return operation(client)
  }
}
```

For mutations, call once and evict a broken client without replay:

```ts
const runMutation = async <T>(
  operation: (client: ResolvedMcpCredential['client']) => Promise<T>,
  signal?: AbortSignal,
) => {
  const client = await manager.get(activeWorkspace, server, key, signal) as ResolvedMcpCredential['client']
  try {
    return await operation(client)
  } catch (error) {
    if (error instanceof McpError && error.code === 'MCP_CONNECTION_LOST') {
      await manager.invalidateIfCurrent(activeWorkspace, server.id, key.id, client)
    }
    throw error
  }
}
```

`listTools` always uses `runReadSafe`. `callTool` chooses from `options.operation`. No loop or recursive retry is allowed, so each read gets at most one recovery.

- [ ] **Step 6: Verify connection ownership and replay policy**

Run:

```bash
cd ui/server
bun test src/mcp/client.test.ts src/mcp/client-manager.test.ts src/mcp/runtime.test.ts
```

Expected: independent waiter cancellation passes; invalidation/shutdown abort connection setup; stale failures preserve replacements; reads execute at most twice; mutations execute once.

- [ ] **Step 7: Commit connection recovery**

```bash
git add ui/server/src/mcp/errors.ts \
  ui/server/src/mcp/client.ts \
  ui/server/src/mcp/client.test.ts \
  ui/server/src/mcp/client-manager.ts \
  ui/server/src/mcp/client-manager.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts
git diff --cached --check
git commit -m "fix(mcp): isolate connection waiters and replay reads safely"
```

Expected: one connection lifecycle commit.

### Task 3: Apply one end-to-end deadline and durably receipt Session creation before send

**Files:**
- Create: `ui/server/src/mcp/deadline.ts`
- Create: `ui/server/src/mcp/deadline.test.ts`
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write RED deadline and durable ordering tests**

Use an injected clock/timer in `deadline.test.ts` to prove:

- caller abort throws `MCP_CANCELLED`;
- deadline expiry throws `MCP_GENERATION_TIMEOUT`;
- `timeoutMs(60_000)` returns the remaining total budget when smaller;
- cleanup deadline remains independent of the expired generation signal.

In GenerationSource/Adapter tests, record:

```ts
const events: string[] = []
updateNovelRunHook = async patch => {
  if (JSON.stringify(patch).includes('"status":"session_created"')) events.push('receipt')
}
fake.callTool = async name => {
  if (name.endsWith('postApiAgentSessionMessage')) events.push('send')
  return originalCallTool(name)
}
expect(events).toEqual(['receipt', 'send'])
```

Add a discovery call that never settles until the deadline signal aborts; expect `MCP_GENERATION_TIMEOUT` without reaching Drive or Session creation.

- [ ] **Step 2: Run deadline/session tests to verify RED**

Run:

```bash
cd ui/server
bun test \
  src/mcp/deadline.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: deadline helper is absent, discovery is outside the current polling-only timeout, and send occurs before a durable Session receipt.

- [ ] **Step 3: Implement typed deadline control**

Create `deadline.ts`:

```ts
import { McpError } from './errors'

export class McpGenerationDeadline {
  private readonly controller = new AbortController()
  private readonly deadlineAt: number
  private readonly timer: unknown
  private timedOut = false

  constructor(
    totalMs: number,
    private readonly callerSignal?: AbortSignal,
    private readonly now: () => number = Date.now,
    private readonly timers: {
      setTimeout(callback: () => void, ms: number): unknown
      clearTimeout(timer: unknown): void
    } = {
      setTimeout: (callback, ms) => setTimeout(callback, ms),
      clearTimeout: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
    },
  ) {
    this.deadlineAt = this.now() + Math.max(1, totalMs)
    this.timer = this.timers.setTimeout(() => {
      this.timedOut = true
      this.controller.abort(new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限'))
    }, Math.max(1, totalMs))
    if (callerSignal?.aborted) this.abortFromCaller()
    else callerSignal?.addEventListener('abort', this.abortFromCaller, { once: true })
  }

  private abortFromCaller = () => {
    this.controller.abort(new McpError('MCP_CANCELLED', 'MCP 正文生成已取消'))
  }

  get signal() { return this.controller.signal }

  remainingMs() {
    return Math.max(0, this.deadlineAt - this.now())
  }

  timeoutMs(configuredMs: number) {
    this.throwIfAborted()
    return Math.max(1, Math.min(Math.max(1, configuredMs), this.remainingMs()))
  }

  throwIfAborted() {
    if (!this.controller.signal.aborted && this.remainingMs() > 0) return
    if (this.timedOut || this.remainingMs() <= 0) {
      throw new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限')
    }
    throw new McpError('MCP_CANCELLED', 'MCP 正文生成已取消')
  }

  close() {
    this.timers.clearTimeout(this.timer)
    this.callerSignal?.removeEventListener('abort', this.abortFromCaller)
  }
}

export function cleanupSignal(timeoutMs = 5_000) {
  return AbortSignal.timeout(Math.max(1, timeoutMs))
}
```

- [ ] **Step 4: Start the deadline before discovery and pass remaining budgets everywhere**

Resolve local credential configuration, then create the deadline in `McpGenerationSource.generateProse` before `validateMcpProjectBinding` or any remote capability discovery:

```ts
const configured = await this.runtime.resolveCredentialConfig(
  binding.key_id,
  binding.server_id,
)
const deadline = new McpGenerationDeadline(
  configured.server.generation_timeout_ms,
  request.signal,
)
```

Resolve the configured total without connecting by adding `runtime.resolveCredentialConfig(keyId, serverId)`, which reads the local Server/Key stores. Change runtime `listAgents`/`getAdapterForKey` and `validateMcpProjectBinding` options from a bare signal to `{ signal, timeoutMs }`, and call validation with `timeoutMs: deadline.timeoutMs(configured.server.tool_timeout_ms)`. Use `deadline.signal` for validation, connection waiting, Adapter discovery, Drive, Session creation/send/status, and polling delay. Every SDK call gets:

Add the deadline to `BudaProseGenerationInput`:

```ts
deadline: McpGenerationDeadline
```

Import the type from `../deadline` and pass the created instance from `McpGenerationSource` into `adapter.generateProse`.

```ts
{
  signal: deadline.signal,
  timeoutMs: deadline.timeoutMs(input.server.tool_timeout_ms),
  operation: 'read_safe',
}
{
  signal: deadline.signal,
  timeoutMs: deadline.timeoutMs(input.server.tool_timeout_ms),
  operation: 'mutation',
}
```

Connection setup uses `deadline.timeoutMs(server.startup_timeout_ms)`. Poll delay must cap itself at `deadline.remainingMs()` and call `deadline.throwIfAborted()` before and after waiting.

Wrap the remote portion of `McpGenerationSource.generateProse` in `try/catch/finally` and call `deadline.close()` in `finally`. The Agent production lease is transferred separately in Task 5; the deadline timer must never stay armed during local quality review.

- [ ] **Step 5: Emit and await `session_created` before send**

Immediately after extracting the Session ID:

```ts
await input.onProgress?.({
  stage: 'session_created',
  status: 'running',
  detail: 'Buda Session 已创建，等待持久化后发送正文任务',
  elapsed_ms: Date.now() - startedAt,
  session_id: activeSessionId,
  snapshot_hash: snapshot.snapshotHash,
})
```

Only the next statement may call `postApiAgentSessionMessage`.

In `McpGenerationSource`, handle this event before forwarding it:

```ts
if (event.stage === 'session_created') {
  progressProvenance = {
    ...progressProvenance,
    session_id: event.session_id,
    snapshot_hash: event.snapshot_hash,
  }
  await updateNovelRun(request.activeWorkspace, receipt.id, {
    status: 'session_created',
    output_ref: JSON.stringify({
      ...progressProvenance,
      request_id: request.requestId,
      receipt_run_id: receipt.id,
      status: 'session_created',
    }),
  })
}
await request.onProgress?.(scrubProgress(event))
```

If this write fails, Adapter send is never invoked.

- [ ] **Step 6: Verify total budget and pre-send durability**

Run:

```bash
cd ui/server
bun test \
  src/mcp/deadline.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/adapters/buda-drive.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: discovery/Drive/create/send/status all observe the same deadline signal and remaining timeout; receipt order is exactly `receipt` then `send`.

- [ ] **Step 7: Commit deadline and receipt ordering**

```bash
git add ui/server/src/mcp/deadline.ts \
  ui/server/src/mcp/deadline.test.ts \
  ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/adapters/buda-adapter.test.ts \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git diff --cached --check
git commit -m "fix(mcp): bound generation and persist sessions before send"
```

Expected: one deadline/session durability commit.

### Task 4: Persist cancellation uncertainty and quarantine unresolved Agent tuples

**Files:**
- Create: `ui/server/src/mcp/quarantine-store.ts`
- Create: `ui/server/src/mcp/agent-lease.ts`
- Create: `ui/server/src/mcp/agent-lease.test.ts`
- Modify: `ui/server/src/mcp/errors.ts`
- Modify: `ui/server/src/mcp/types.ts`
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write RED receipt-state and quarantine tests**

Cover these concrete outcomes:

| Trigger | Remote terminal confirmed | Receipt status | New generation |
|---|---:|---|---|
| caller abort | yes | `cancelled` | allowed after lease release |
| total deadline | yes | `timed_out` | allowed after lease release |
| post-Session failure | no | `remote_cancel_unknown` | blocked |
| send returns ambiguous transport error | no | `send_unknown` | blocked |
| ordinary failure before Session | not applicable | `failed` | allowed |

Assert a second lease on the same workspace/Server/Key/Agent throws `MCP_AGENT_QUARANTINED` after unresolved cancellation, including after creating a new registry instance from the same workspace file.

- [ ] **Step 2: Run lifecycle tests to verify RED**

Run:

```bash
cd ui/server
bun test \
  src/mcp/agent-lease.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/runtime.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: quarantine modules/statuses are absent and current cancellation swallows remote cleanup failure.

- [ ] **Step 3: Define durable quarantine records**

Add:

```ts
export type McpAgentQuarantineRecord = {
  id: string
  workspace_key: string
  server_id: string
  key_id: number
  agent_id: string
  request_id: string
  session_id: string
  reason: 'send_unknown' | 'remote_cancel_unknown'
  created_at: string
}
```

Add these codes to `McpErrorCode`:

```ts
| 'MCP_SEND_UNKNOWN'
| 'MCP_AGENT_QUARANTINED'
```

Implement `quarantine-store.ts` using `readJsonArrayFailClosed`, `writeJsonArrayAtomic`, and `withMcpWorkspaceMutation`. Tuple identity is the four-field workspace/Server/Key/Agent key; upsert replaces the existing tuple record, and clear requires an exact quarantine ID.

- [ ] **Step 4: Implement active leases plus durable quarantine enforcement**

Create `agent-lease.ts`:

```ts
export type McpAgentLease = {
  readonly tupleKey: string
  readonly binding: { serverId: string; keyId: number; agentId: string }
  quarantine(input: Omit<McpAgentQuarantineRecord, 'id' | 'workspace_key' | 'created_at'>): Promise<void>
  release(): Promise<void>
}

export class McpAgentLeaseRegistry {
  private readonly active = new Set<string>()

  async acquire(activeWorkspace: string, binding: {
    serverId: string
    keyId: number
    agentId: string
  }): Promise<McpAgentLease> {
    return withMcpWorkspaceMutation(activeWorkspace, async () => {
      const tupleKey = agentTupleKey(activeWorkspace, binding)
      const quarantine = (await readMcpAgentQuarantines(activeWorkspace))
        .find(item => agentTupleKey(activeWorkspace, {
          serverId: item.server_id,
          keyId: item.key_id,
          agentId: item.agent_id,
        }) === tupleKey)
      if (quarantine) {
        throw new McpError('MCP_AGENT_QUARANTINED', '该 MCP Agent 的远端终止状态尚未确认', {
          quarantine_id: quarantine.id,
          session_id: quarantine.session_id,
        })
      }
      if (this.active.has(tupleKey)) {
        throw new McpError('MCP_AGENT_BUSY', '该 MCP Agent 正在处理另一章')
      }
      this.active.add(tupleKey)
      let released = false
      return {
        tupleKey,
        binding,
        quarantine: async input => { await upsertMcpAgentQuarantine(activeWorkspace, input) },
        release: async () => {
          await withMcpWorkspaceMutation(activeWorkspace, async () => {
            if (released) return
            released = true
            this.active.delete(tupleKey)
          })
        },
      }
    })
  }

  isActive(activeWorkspace: string, binding: { serverId: string; keyId: number; agentId: string }) {
    return this.active.has(agentTupleKey(activeWorkspace, binding))
  }
}
```

Runtime owns one registry and exports acquire/is-active/list/clear/reconcile methods.

- [ ] **Step 5: Perform short independent remote cleanup and classify ambiguity**

After Session creation, catch every error. Call cancel with `cleanupSignal(5_000)`, not the expired generation signal and not the normal 60-second timeout. Treat cancellation as confirmed only when:

- cancel result explicitly reports `cancelled: true`; or
- one cleanup-deadline Session read reports `cancelled`, `failed`, or `completed`.

If send throws `MCP_CONNECTION_LOST` or another transport error, wrap it as `MCP_SEND_UNKNOWN` with the persisted Session ID. If cleanup cannot confirm terminal state, attach:

```ts
{
  session_id: activeSessionId,
  remote_cancel_confirmed: false,
  receipt_status: sendWasAmbiguous ? 'send_unknown' : 'remote_cancel_unknown',
}
```

If cleanup confirms terminal state, preserve the original typed cause with `remote_cancel_confirmed: true`. If cleanup is unresolved, preserve `MCP_CANCELLED` or `MCP_GENERATION_TIMEOUT` and set `receipt_status: 'remote_cancel_unknown'` in details; do not replace the typed cause with a generic cleanup error.

- [ ] **Step 6: Persist exact terminal receipt state and quarantine unresolved tuples**

Declare `let lease: McpAgentLease | undefined` after the run receipt is created. At the top of the existing remote `try`, acquire it under the same coordinator used by binding mutations:

```ts
lease = await withMcpWorkspaceMutation(request.activeWorkspace, async () => {
  const currentProject = await getNovelProject(
    request.activeWorkspace,
    Number(request.project?.id || 0),
  )
  const currentSource = resolveProseGenerationSource(currentProject)
  if (
    proseGenerationSourceFingerprint(currentSource)
    !== proseGenerationSourceFingerprint(source)
  ) {
    throw new McpError('MCP_BINDING_CHANGED', '项目正文来源已在生成开始前变更')
  }
  return this.runtime.acquireAgentLease(request.activeWorkspace, {
    serverId: binding.server_id,
    keyId: binding.key_id,
    agentId: binding.agent_id,
  })
})
```

Import `getNovelProject` and `withMcpWorkspaceMutation`. Runtime acquisition is re-entrant, so the active tuple is installed before the coordinator is released.

Add the bounded mapper:

```ts
function receiptStatusForError(error: any) {
  const explicit = String(error?.details?.receipt_status || '')
  if (explicit === 'send_unknown' || explicit === 'remote_cancel_unknown') return explicit
  if (error?.code === 'MCP_SEND_UNKNOWN') return 'send_unknown'
  if (error?.code === 'MCP_CANCELLED') return 'cancelled'
  if (error?.code === 'MCP_GENERATION_TIMEOUT') return 'timed_out'
  return 'failed'
}
```

Then in `McpGenerationSource.catch`:

```ts
const status = receiptStatusForError(error)
await updateNovelRun(request.activeWorkspace, receipt.id, {
  status,
  output_ref: JSON.stringify({ ...safeProvenance, status }),
  error_message: scrubber.scrubText(errorMessage(error)).slice(0, 500),
})
if (lease && (status === 'send_unknown' || status === 'remote_cancel_unknown')) {
  await lease.quarantine({
    server_id: binding.server_id,
    key_id: binding.key_id,
    agent_id: binding.agent_id,
    request_id: request.requestId,
    session_id: String(error.details?.session_id || ''),
    reason: status,
  })
}
await lease?.release()
throw error
```

The status mapper must return only `cancelled`, `timed_out`, `send_unknown`, `remote_cancel_unknown`, or `failed`.

For this task’s successful remote path, release after the success receipt and before returning:

```ts
await updateNovelRun(request.activeWorkspace, receipt.id, {
  status: 'success',
  output_ref: JSON.stringify(output),
})
await lease!.release()
return {
  ...result,
  source_receipt: {
    request_id: request.requestId,
    receipt_run_id: receipt.id,
    ...output,
  },
}
```

Task 5 deliberately replaces this success-only release with a non-serializable lease transfer.

- [ ] **Step 7: Verify cancellation typing and durable quarantine**

Run:

```bash
cd ui/server
bun test \
  src/mcp/agent-lease.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/runtime.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: all five receipt outcomes match the table; cleanup is short-bounded; unresolved tuples remain blocked after registry recreation.

- [ ] **Step 8: Commit quarantine lifecycle**

```bash
git add ui/server/src/mcp/quarantine-store.ts \
  ui/server/src/mcp/agent-lease.ts \
  ui/server/src/mcp/agent-lease.test.ts \
  ui/server/src/mcp/errors.ts \
  ui/server/src/mcp/types.ts \
  ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/adapters/buda-adapter.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git diff --cached --check
git commit -m "fix(mcp): quarantine unresolved remote sessions"
```

Expected: one cancellation/quarantine commit.

### Task 5: Hold the Agent lease through local quality and atomic storage

**Files:**
- Create: `ui/server/src/novel-writing-service/generation-source/production-lease.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`

- [ ] **Step 1: Write RED lease-span tests**

Extend the pipeline harness with a runtime lease whose `release` appends an event. Block `beforeChapterStore` and assert:

```ts
expect(events).toContain('remote-completed')
expect(events).not.toContain('lease-released')
releaseChapterStore()
await generation
expect(events.at(-1)).toBe('lease-released')
```

Add failure cases for quality review and atomic acceptance; each releases exactly once. Add a dedicated binding-route test where `runtime.isAgentLeaseActive` returns true for the stored or proposed tuple; expect 409 `MCP_AGENT_BUSY` and no project mutation.

- [ ] **Step 2: Run pipeline/binding tests to verify RED**

Run:

```bash
cd ui/server
bun test \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts
```

Expected: the current Adapter releases its Set lock immediately after remote completion and the binding route cannot observe an active production lease.

- [ ] **Step 3: Create non-serializable lease transfer helpers**

Create `production-lease.ts`:

```ts
const productionLease = Symbol('mcp-production-lease')

export type ProductionLease = {
  release(): Promise<void>
}

export function attachProductionLease<T extends object>(value: T, lease: ProductionLease) {
  Object.defineProperty(value, productionLease, {
    value: lease,
    enumerable: false,
    configurable: true,
  })
  return value
}

export function takeProductionLease(value: object): ProductionLease | undefined {
  const lease = (value as any)[productionLease] as ProductionLease | undefined
  if (lease) delete (value as any)[productionLease]
  return lease
}
```

Because the symbol is non-enumerable, it cannot enter chapter payloads, diagnostics, SSE, JSON receipts, or logs.

- [ ] **Step 4: Transfer a successful remote lease into the draft bundle**

Retain the coordinator-protected lease acquisition from Task 4. Replace its success-only `await lease!.release(); return {...}` block with:

```ts
return attachProductionLease({
  ...result,
  source_receipt: {
    request_id: request.requestId,
    receipt_run_id: receipt.id,
    ...output,
  },
}, lease!)
```

In `runGenerateChapterDraftProse`, take it immediately after `generateProse`:

```ts
const draftResult = await sourceResolution.source.generateProse(request)
const generationLease = takeProductionLease(draftResult)
try {
  assertCompleteProseTransportResult(draftResult, 'PROSE_DRAFT_TRUNCATED')
} catch (error) {
  await generationLease?.release()
  throw error
}
```

Move the catch boundary down so every statement from `assertCompleteProseTransportResult` through the function’s current return is inside the `try`. Add `generationLease` to that returned object:

```ts
return {
  finalText,
  finalSceneBreakdown,
  finalContinuityNotes,
  ohStoryDeliveryReceipts,
  generatedTitlePatch,
  draftPromptDiagnostics,
  editorRewrite,
  memePolish,
  readabilityReview,
  generationLease,
}
```

Place the shown catch immediately after this return. This guarantees transport-shape, extraction, opening-continuity, and empty-prose failures release the lease before escaping.

- [ ] **Step 5: Release only after every local terminal path**

In `generateChapterForGroup`, immediately after the draft bundle:

```ts
const generationLease = draftResultBundle.generationLease
try {
  let finalText = draftResultBundle.finalText
  let finalSceneBreakdown = draftResultBundle.finalSceneBreakdown
  let finalContinuityNotes = draftResultBundle.finalContinuityNotes
  let ohStoryDeliveryReceipts = draftResultBundle.ohStoryDeliveryReceipts
```

Keep the current post-draft statements inside this `try`. After the current `return await runFullProductionAdmissionAndStore({...})` call closes, add:

```ts
} finally {
  await generationLease?.release()
}
```

The existing draft-mode return is inside the same `try`, so JavaScript executes `finally` after either draft-mode or full-production storage and on every quality, humanize, Story State, or acceptance failure.

- [ ] **Step 6: Reject binding changes involving an active tuple**

Inside the already coordinated dedicated binding `PUT`, compare both the current MCP tuple and proposed MCP tuple:

```ts
for (const candidate of [currentSource, source]) {
  if (candidate.type === 'mcp' && ctx.mcpRuntime.isAgentLeaseActive(activeWorkspace, {
    serverId: candidate.mcp.server_id,
    keyId: candidate.mcp.key_id,
    agentId: candidate.mcp.agent_id,
  })) {
    throw new McpError('MCP_AGENT_BUSY', '该 MCP Agent 正在完成正文生产，暂不能修改绑定')
  }
}
```

Map it to 409. The check occurs while the MCP coordinator is held, before the novel mutation lock/write.

- [ ] **Step 7: Verify the end-to-end lease**

Run:

```bash
cd ui/server
bun test \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel/acceptance.test.ts
```

Expected: the lease remains active after remote completion, releases after atomic acceptance, releases once on every local failure, and blocks concurrent generation/binding changes.

- [ ] **Step 8: Commit the production lease**

```bash
git add ui/server/src/novel-writing-service/generation-source/production-lease.ts \
  ui/server/src/novel-writing-service/generation-source/types.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  ui/server/src/routes/novel-mcp-binding-routes.ts \
  ui/server/src/routes/novel-mcp-binding-routes.test.ts
git diff --cached --check
git commit -m "fix(mcp): lease agents through local acceptance"
```

Expected: one end-to-end lease commit.

### Task 6: Expose safe quarantine reconciliation and actionable UI states

**Files:**
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Modify: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/routes/mcp-routes.test.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.mcp.test.ts`
- Modify: `ui/web/src/api/mcp.ts`
- Modify: `ui/web/src/pages/McpServices/index.tsx`
- Modify: `ui/web/src/pages/McpServices/mcpServicesShell.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx`

- [ ] **Step 1: Write RED route and UI model tests**

Add route cases:

- `GET /api/mcp/quarantines` returns public identity/status only;
- diagnostics for its Server/Key read the persisted Session once and clear it only if terminal;
- `POST /api/mcp/quarantines/:id/reconcile` returns 409 while still active and clears when terminal;
- `DELETE /api/mcp/quarantines/:id` requires `{ acknowledge_remote_work_may_continue: true }`, otherwise 400.

Add frontend mapping assertions:

```ts
expect(formatMcpGenerationFailure({ error_code: 'MCP_BINDING_CHANGED' }))
  .toContain('正文来源已变更')
expect(formatMcpGenerationFailure({ error_code: 'MCP_AGENT_BUSY' }))
  .toContain('仍在处理')
expect(formatMcpGenerationFailure({ error_code: 'MCP_SEND_UNKNOWN' }))
  .toContain('不要重新发送')
expect(formatMcpGenerationFailure({
  error_code: 'MCP_CANCELLED',
  receipt_status: 'remote_cancel_unknown',
}))
  .toContain('远端可能仍在运行')
expect(formatMcpGenerationFailure({ error_code: 'MCP_AGENT_QUARANTINED' }))
  .toContain('连接诊断')
```

- [ ] **Step 2: Run route/frontend tests to verify RED**

Run:

```bash
cd ui/server
bun test src/routes/mcp-routes.test.ts src/routes/novel-generation/builders.mcp.test.ts
cd ../web
bun test \
  src/pages/McpServices \
  src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
```

Expected: quarantine endpoints/types/actions and stable UI message mapping are absent.

- [ ] **Step 3: Add read-safe Session reconciliation**

Extend `ProseMcpAdapter` with:

```ts
inspectSession(
  input: { agentId: string; sessionId: string },
  options: Omit<McpOperationOptions, 'operation'>,
): Promise<{ status: string; terminal: boolean }>
```

Buda implements it with one `getSession` read-safe call. Terminal values are exactly `completed`, `failed`, and `cancelled`. Runtime diagnostics and the reconcile endpoint clear a matching quarantine only after `terminal === true`.

- [ ] **Step 4: Add explicit quarantine routes**

Register:

```ts
app.get('/api/mcp/quarantines', safely(async (_req, res) => {
  res.json(await runtime.listQuarantines())
}))

app.post('/api/mcp/quarantines/:id/reconcile', safely(async (req, res) => {
  const result = await runtime.reconcileQuarantine(String(req.params.id), req.signal)
  res.status(result.cleared ? 200 : 409).json(result)
}))

app.delete('/api/mcp/quarantines/:id', safely(async (req, res) => {
  if (req.body?.acknowledge_remote_work_may_continue !== true) {
    return res.status(400).json({
      error: '必须确认远端任务可能仍在运行',
      error_code: 'MCP_QUARANTINE_ACK_REQUIRED',
    })
  }
  res.json({ ok: await runtime.clearQuarantine(String(req.params.id)) })
}))
```

Public quarantine records exclude Key material, custom Header values, prompts, prose, and remote message content.

- [ ] **Step 5: Map stable HTTP/SSE error codes**

Extend `standaloneProseServiceErrorStatus`:

```ts
if (code === 'MCP_BINDING_CHANGED') return 409
if (code === 'MCP_AGENT_QUARANTINED') return 409
if (code === 'MCP_SEND_UNKNOWN') return 502
```

Include `receipt_status: serviceError?.details?.receipt_status` in the bounded HTTP/SSE error payload so `remote_cancel_unknown` remains visible without discarding the original cancellation/timeout code.

Preserve the code in the browser handler instead of replacing the payload with a plain Error:

```ts
const generationError = Object.assign(
  new Error(formatMcpGenerationFailure(payload) || payload?.error || raw || 'HTTP ' + resp.status),
  { error_code: payload?.error_code, payload },
)
throw generationError
```

Use the same construction for SSE `type === 'error'`.

- [ ] **Step 6: Render quarantine warning and deliberate actions**

Add API types/methods, load quarantines with Servers/Keys, and render an error Alert per record with:

- Server, masked Key ID, Agent ID, Session ID, reason, and creation time;
- “检查远端状态” calling reconcile;
- Popconfirm “强制解除隔离” whose confirm copy states the remote Agent may still be working and sends the required acknowledgment boolean.

Do not add model fallback controls.

- [ ] **Step 7: Verify reconciliation and UI behavior**

Run:

```bash
cd ui/server
bun test src/routes/mcp-routes.test.ts src/routes/novel-generation/builders.mcp.test.ts
cd ../web
bun test \
  src/pages/McpServices \
  src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
```

Expected: nonterminal reconciliation retains quarantine, terminal reconciliation clears it, forced clear requires explicit acknowledgment, and UI messages are actionable without model fallback.

- [ ] **Step 8: Commit reconciliation and UI status**

```bash
git add ui/server/src/mcp/adapters/types.ts \
  ui/server/src/mcp/adapters/buda-adapter.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/mcp-routes.test.ts \
  ui/server/src/routes/novel-generation/builders.ts \
  ui/server/src/routes/novel-generation/builders.mcp.test.ts \
  ui/web/src/api/mcp.ts \
  ui/web/src/pages/McpServices/index.tsx \
  ui/web/src/pages/McpServices/mcpServicesShell.test.ts \
  ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts \
  ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts \
  ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx
git diff --cached --check
git commit -m "feat(mcp): expose quarantine reconciliation"
```

Expected: one safe recovery/UI commit.

### Task 7: Run complete release verification

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run the complete focused MCP backend suite**

```bash
cd ui/server
bun test \
  src/local-http-security.test.ts \
  src/mcp \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel-writing-service/generation-source \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts \
  src/novel/acceptance.test.ts
```

Expected: 0 failures.

- [ ] **Step 2: Run lifecycle and repaired novel suites**

Run from the worktree root:

```bash
cd ui/server
bun test src/server-lifecycle.test.ts src/revision-worker-lifecycle.test.ts
cd ../..
bun run test:novel-server
```

Expected: lifecycle tests pass and the repaired novel baseline remains at least 188 pass, 0 fail.

- [ ] **Step 3: Run MCP frontend suites**

```bash
cd ui/web
bun test \
  src/pages/McpServices \
  src/pages/novel-workspace/mcpGenerationSourceModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: all frontend tests pass.

- [ ] **Step 4: Build server and web**

Run from the worktree root:

```bash
bun run build:server
bun run build:web
```

Expected: both builds exit 0. Existing Vite dynamic-import and large-chunk warnings are allowed.

- [ ] **Step 5: Run diff, user-data, and credential checks**

```bash
git diff --check main...HEAD
if git diff --name-only main...HEAD | rg -q '^workspace/(assets\.json|zhuque-inputs/|zhuque-reports/)'; then
  echo 'unexpected workspace user-data change'
  exit 1
fi
if git diff main...HEAD --unified=0 | rg -q '^\+.*sk_[A-Za-z0-9_-]{20,}'; then
  echo 'possible credential found in branch additions'
  exit 1
fi
git status --short
```

Expected: all checks exit 0, protected paths are untouched, no real credential is present, and the worktree is clean.

- [ ] **Step 6: Document the manual live smoke boundary**

Do not run a credentialed Buda smoke in CI or with a website login password. The release note must say:

```text
Live Buda smoke is manual opt-in only. Use a separately created sk_ API Key, a disposable Buda Agent, and a non-production novel workspace. Verify Agent listing, Session creation receipt-before-send, one chapter result, cancellation reconciliation, and quarantine clear. Delete the disposable Key from MangaForge after the smoke.
```

Expected: verification remains credential-free and deterministic; live smoke is an explicit staging action.
