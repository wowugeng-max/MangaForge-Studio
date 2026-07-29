# MangaForge Server Lifecycle Hardening Design

Date: 2026-07-29
Status: approved
Scope: server startup, background-service startup, bind failure compensation, and shutdown aggregation

## Problem

The server lifecycle has three remaining races:

1. Memory Palace bootstrap can outlive shutdown and create the key monitor afterward.
2. `app.listen()` exposes a binding server before the `listening` event, while asynchronous bind errors bypass startup containment.
3. A failure in one cleanup path can prevent or hide failures in the others.

The repair must preserve workspace setup order, the revision worker workspace guard, shared shutdown idempotency, and the existing single-chapter revision behavior.

## Chosen architecture

Keep `index.ts` as assembly code and add three small, independently tested lifecycle boundaries in `server-lifecycle.ts`:

1. A tracked background-startup controller owns one `AbortController`, passes its signal into bootstrap, checks cancellation immediately before creating the key monitor, and exposes a stop operation that aborts and awaits the startup promise.
2. An asynchronous bind helper publishes the server object immediately, resolves only on `listening`, rejects on `error`, and removes only its temporary bind listeners. `startServerLifecycle` awaits async `listen()` and awaits `onStartupError` so bind failure compensation can finish before startup returns.
3. The shutdown coordinator starts HTTP close, background/monitor cleanup, and revision-worker stop independently, awaits every result, and throws one original error or an `AggregateError` containing every failure.

`bootstrapMempalace` accepts an optional `AbortSignal` and forwards it to `execFile`. Abort is a shutdown outcome, not an ordinary Memory Palace failure warning.

## Data flow

Successful startup remains:

```text
workspace load -> activate -> ensure -> save -> revision recovery
  -> create binding server -> await listening
  -> attach permanent close/upgrade handlers -> start tracked backgrounds
```

Bind failure becomes:

```text
create binding server -> publish server -> error(EADDRINUSE)
  -> startup catch -> await requestShutdown
  -> close binding server + stop backgrounds/monitor + stop revision worker
  -> report startup error -> return null
```

Shutdown during background bootstrap becomes:

```text
requestShutdown -> close HTTP intake
  + abort background bootstrap and await it
  + stop revision worker
  -> key monitor cannot be created after cancellation
```

## Error semantics

- A normal abort caused by shutdown does not emit the ordinary Memory Palace bootstrap-failure warning.
- Bind errors are startup errors and trigger the same shared compensating shutdown used by signals.
- Every cleanup branch runs even if another branch fails.
- One cleanup failure is rethrown unchanged; multiple failures are reported as one `AggregateError` with stable dependency order.
- `onShutdownError` is invoked once because all callers share one shutdown promise.

## Testing

Behavior tests will cover:

- deferred abort-aware background bootstrap, shutdown waiting, and the immediate pre-monitor cancellation check;
- real Bun occupied-port rejection with `EADDRINUSE`, startup error observation, compensating worker shutdown, and no uncaught server error;
- signal closure of a binding server;
- independent cleanup invocation when monitor stop throws;
- aggregation of close, background/monitor, and worker failures while preserving the shared promise;
- optional Memory Palace bootstrap signal forwarding where a focused test seam is practical.

The existing lifecycle, revision-worker, workspace compatibility, seven-file regression, and server build checks remain mandatory.

## Non-goals

- No general server-runtime rewrite.
- No frontend changes.
- No changes to revision execution, persistence, or workspace switching semantics.
- No new retry policy for Memory Palace or HTTP binding.
