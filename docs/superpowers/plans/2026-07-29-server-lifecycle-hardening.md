# Server Lifecycle Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contain background-startup, HTTP bind, and multi-error shutdown races without changing revision or workspace semantics.

**Architecture:** Keep `index.ts` as assembly. Add small lifecycle helpers for tracked abortable background startup and async HTTP binding, extend startup callbacks to be awaitable, and make shutdown settle all independent cleanup branches before reporting one or multiple errors.

**Tech Stack:** TypeScript, Bun test runner, Express/Node-compatible HTTP server, Node `AbortController`, `execFile`, and `AggregateError`.

---

### Task 1: Abort and await background startup

**Files:**
- Modify: `ui/server/src/server-lifecycle.ts`
- Modify: `ui/server/src/server-lifecycle.test.ts`
- Modify: `ui/server/src/index.ts`
- Modify: `ui/server/src/memory-service-runtime.ts`
- Test: `ui/server/src/server-lifecycle.test.ts`

- [x] **Step 1: Write the failing lifecycle tests**

Add behavior tests for a tracked background controller whose bootstrap receives an `AbortSignal`, whose stop aborts and awaits an in-flight bootstrap, and whose monitor factory is never invoked after shutdown. Add a second gate immediately before monitor creation and assert cancellation at that boundary also prevents monitor creation.

- [x] **Step 2: Run the RED test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: the shutdown promise settles before the deferred bootstrap, the signal remains un-aborted, or the monitor factory runs after cancellation.

- [x] **Step 3: Implement the minimal background controller**

Add a helper with this contract:

```ts
createBackgroundServiceLifecycle({
  bootstrap(signal): Promise<void>,
  startMonitor(): { stop(): void } | null,
}) => {
  start(): Promise<void>
  stop(): Promise<void>
}
```

`start()` owns one shared promise and checks `signal.aborted` immediately before `startMonitor()`. `stop()` aborts and awaits the shared startup promise while containing the expected abort rejection. Wire its stop into shutdown cleanup. Change `bootstrapMempalace(signal?)` to pass `signal` to `execFileAsync` and avoid warning for an abort caused by that signal.

- [x] **Step 4: Run the GREEN test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: all lifecycle tests pass and no background monitor is created after shutdown.

### Task 2: Await HTTP bind and compensate asynchronous failure

**Files:**
- Modify: `ui/server/src/server-lifecycle.ts`
- Modify: `ui/server/src/server-lifecycle.test.ts`
- Modify: `ui/server/src/index.ts`
- Test: `ui/server/src/server-lifecycle.test.ts`

- [x] **Step 1: Write the failing bind tests**

Occupy an ephemeral localhost port with a real Bun HTTP server. Start the testable bind helper on the same port and assert its promise rejects with `EADDRINUSE`, the binding server is published immediately, startup error handling awaits the shared shutdown, and revision stop runs. Retain the signal-during-binding close test.

- [x] **Step 2: Run the RED test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: startup reports success before binding or the bind error escapes the lifecycle/error handler.

- [x] **Step 3: Implement async bind lifecycle**

Change the bootstrap dependency types to:

```ts
listen(): TServer | Promise<TServer>
onStartupError(error: unknown): void | Promise<void>
```

Await both calls in `startServerLifecycle`. Add a bind helper that calls the server factory synchronously, publishes the server immediately, installs one temporary `listening` handler and one temporary `error` handler, resolves/rejects once, and removes the opposite temporary listener. In `index.ts`, attach permanent close/upgrade handlers and start backgrounds only after bind succeeds. On bind failure, `onStartupError` awaits `requestShutdown()` before logging the startup error.

- [x] **Step 4: Run the GREEN test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: the occupied-port test rejects through startup containment, cleanup completes, and no uncaught error occurs.

### Task 3: Preserve every cleanup failure

**Files:**
- Modify: `ui/server/src/server-lifecycle.ts`
- Modify: `ui/server/src/server-lifecycle.test.ts`
- Modify: `ui/server/src/index.ts`
- Test: `ui/server/src/server-lifecycle.test.ts`

- [x] **Step 1: Write the failing cleanup tests**

Add one test where monitor cleanup throws and revision stop must still run. Add another where HTTP close, background/monitor cleanup, and revision stop all reject; assert the shared shutdown promise rejects with one `AggregateError`, `errors.length === 3`, the causes preserve dependency order, and `onShutdownError` runs once.

- [x] **Step 2: Run the RED test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: revision stop is skipped after monitor failure or only one failure is preserved.

- [x] **Step 3: Implement independent settlement**

Start these promises independently:

```ts
closeServer()
stopBackgroundServicesAndMonitor()
stopNovelLifecycle()
```

Await `Promise.allSettled`. Throw the sole original cause when one branch fails. Throw `new AggregateError(errors, 'server shutdown failed')` when multiple branches fail. Keep the shared coordinator promise and single `onShutdownError` invocation.

- [x] **Step 4: Run the GREEN test**

Run: `cd ui/server && bun test src/server-lifecycle.test.ts`

Expected: all cleanup paths run and all causes are preserved.

### Task 4: Verify and commit

**Files:**
- Verify all modified files only

- [x] **Step 1: Run focused and regression tests**

Run:

```bash
cd ui/server
bun test src/server-lifecycle.test.ts
bun test src/routes/novel-editor/revision-worker.test.ts src/routes/novel-editor-routes.revision-safeguards.test.ts
bun test src/workspace.test.ts src/routes/manga-compat.test.ts
bun test src/routes/novel-editor/single-chapter-story-state.test.ts src/routes/novel-editor-routes.story-state-guards.test.ts src/routes/novel-editor-routes.story-state-runtime.test.ts src/routes/novel-editor-routes.revision-safeguards.test.ts src/routes/novel-writing-service.quality-wiring.test.ts src/novel/compaction.test.ts src/llm/executor.test.ts
```

Expected: zero failures in every command.

- [x] **Step 2: Build the server**

Run: `bun run build:server` from the repository root.

Expected: Bun emits `/private/tmp/mangaforge-server-check.js` with exit code 0.

- [x] **Step 3: Audit and commit**

Run `git diff --check`, inspect the complete scoped diff, stage only lifecycle/memory files plus tests and this plan, then commit:

```bash
git commit -m "fix(novel): contain lifecycle startup failures"
```
