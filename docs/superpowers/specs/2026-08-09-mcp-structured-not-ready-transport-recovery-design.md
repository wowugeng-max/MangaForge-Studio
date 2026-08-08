# MCP Structured Not-Ready Transport Recovery Design

## Status

Approved design choice: recover through the Provider-neutral MCP stability layer after an exact structured pre-dispatch rejection. Do not add a Buda-specific Session-list reconciliation path.

## Problem

Real page acceptance produced one terminal material-repair task with `MCP_SEND_UNKNOWN` during `session_create`. The task created no remote Session, wrote no material data, and left the Agent binding quarantined as `session_create_unknown`.

Read-only follow-up established the failing boundary:

- Buda tool discovery can succeed on a newly connected Streamable HTTP MCP transport.
- A later read-safe tool call on that transport can return the exact structured response `HTTP 400 / JSON-RPC -32000 / response id null / Server not initialized`.
- A new transport can subsequently serve the same read-safe request successfully.
- Buda's authoritative Session list contains no Session for the failed material-repair invocation.

The existing Buda policy already classifies only that exact structured response as `not_ready_pre_dispatch`. However, reactive stability currently sleeps and directly replays the original operation on the same logical connection. If that stale transport then fails ambiguously during Session creation, the system must conservatively surface `MCP_SEND_UNKNOWN` even though the first response proved that attempt was not dispatched.

This is an outbound MCP transport-readiness problem. It is unrelated to browser cancellation, Express request semantics, material validation, or the API-model generation path.

## Goals

- Stabilize the MCP transport after an exact `not_ready_pre_dispatch` response before replaying the original operation.
- Retain the existing warm-up window so a briefly initializing transport can recover without immediate churn.
- Rotate the exact current MCP client when the transport cannot become ready within the warm-up window.
- Replay a mutation only when the Provider policy has positively classified its prior failure as pre-dispatch.
- Preserve fail-closed handling for every ambiguous mutation failure.
- Keep the mechanism Provider-neutral and reusable by any MCP adapter with a structured readiness policy.
- Leave API-model generation, GenerationSource selection, Drive contracts, independent per-stage Sessions, chapter acceptance, and persistence unchanged.

## Non-Goals

- Do not query Buda's Session-list endpoint from generic orchestration.
- Do not infer that a mutation was uncommitted from an empty or eventually consistent remote list.
- Do not retry connection loss, timeout, HTTP 5xx, message-only errors, or any other ambiguous mutation failure.
- Do not clear or rewrite the failed acceptance task, artifact, run, or quarantine record.
- Do not add Provider-specific failure strings to the stability controller.
- Do not change the API-model Provider path.
- Do not alter browser-to-Express cancellation semantics.

## Architecture

The existing separation remains intact:

1. The Adapter policy examines a remote error and returns a semantic failure class.
2. The Provider-neutral stability controller decides whether recovery is safe.
3. The runtime owns client acquisition, invalidation, and replacement.
4. The Adapter performs Drive and Session operations without owning generic transport recovery.

The only behavior change is inside the stability controller's safe-replay branch. After `policy.classify(error, operationKind)` returns `not_ready_pre_dispatch`, the controller must:

1. Respect the shared generation deadline and cancellation signal.
2. Apply the existing bounded retry delay.
3. Enter the existing `ensureReady` flow before replaying the original operation, including when the policy is reactive.
4. Probe read-only readiness on the current client.
5. Allow the current client to recover during the configured warm-up window.
6. If the warm-up window expires without the required consecutive successes, invalidate that probed client, acquire a replacement transport, and continue probing.
7. Replay the original operation only after readiness succeeds.

The operation closure already routes through the runtime's mutable current-client wrapper, so a replay after successful stabilization uses the replacement client without changing Adapter interfaces.

## Safety Boundary

`not_ready_pre_dispatch` remains a privileged classification. A Provider policy may return it only from structured evidence that proves the server rejected the request before dispatch. For the Buda policy, this remains exactly:

```text
HTTP status: 400
JSON-RPC code: -32000
response id: null
reason: server_not_initialized
```

No message substring, generic HTTP status, connection exception, or timeout may enter this branch.

The mutation rules remain:

- Exact `not_ready_pre_dispatch`: readiness stabilization is allowed; replay is allowed only after readiness succeeds.
- `ambiguous_write_failure`: immediately produce `MCP_SEND_UNKNOWN`; never probe and never replay the mutation.
- Cancellation or deadline expiry while a mutation may be in flight: preserve `MCP_SEND_UNKNOWN`.
- Deadline expiry while only pre-dispatch readiness stabilization is occurring: produce `MCP_SERVER_NOT_READY`, because no mutation was dispatched.
- Terminal failure: propagate the typed failure without replay.

Read-safe transient connection failures retain their existing client invalidation and stabilization path.

## Data Flow

```text
operation
  -> exact structured pre-dispatch rejection
  -> bounded delay
  -> read-only readiness stabilization
       -> current transport becomes ready
          -> replay operation
       -> warm-up window expires
          -> invalidate probed client
          -> acquire replacement transport
          -> probe until ready or shared deadline expires
  -> replay operation only after ready
```

Any ambiguous mutation failure exits directly to `MCP_SEND_UNKNOWN` and quarantine handling; it never enters the flow above.

## Error and Deadline Semantics

- All delays, probes, acquisitions, and replays share the original `McpGenerationDeadline`.
- No nested timeout may extend the task's total deadline.
- Stabilization progress continues to use the bounded `mcp_transport_stabilizing` event and exposes no credentials or remote response bodies.
- Repeated exact pre-dispatch responses may cause multiple stabilization rounds, but cannot outlive the shared deadline.
- The original error text and response body remain scrubbed and are not persisted to public artifacts.

## Testing Strategy

Implementation must follow RED-GREEN TDD.

Focused stability tests must prove:

- reactive read recovery invokes readiness stabilization after an exact pre-dispatch rejection;
- reactive mutation recovery invokes readiness stabilization before replay;
- a briefly initializing current transport may become ready without invalidation;
- a transport that stays not-ready through the warm-up window is invalidated and replaced before replay;
- the replacement is probed before the original operation is replayed;
- an exact pre-dispatch mutation that never stabilizes ends as `MCP_SERVER_NOT_READY` with no ambiguous-write classification;
- connection loss, timeout, HTTP 5xx, and message-only mutation errors still make exactly one mutation attempt and return `MCP_SEND_UNKNOWN`;
- cancellation and exact-deadline behavior remain unchanged.

Runtime tests must prove that stabilization invalidates the correct managed client and replays through the replacement without closing a concurrently acquired newer client.

Adjacent Buda tests must continue proving that only exact structured evidence maps to `not_ready_pre_dispatch` and that Adapter code does not gain a Session-list dependency.

Verification must include focused stability/runtime/Adapter suites, all MCP suites, complete Server and Web suites, repository boundary checks, builds, and diff checks.

## Real Page Acceptance

The failed acceptance workspace remains immutable evidence. Its task, ambiguous artifact, run, and quarantine record must not be deleted, acknowledged, or rewritten.

Post-fix acceptance uses a new local workspace derived from a clean acceptance seed and the same valid MCP binding. The new workspace must begin with:

- zero prose and zero required material rows for the target chapter;
- no active run or stage artifact;
- zero quarantine records;
- MCP as the selected chapter generation source.

From the page:

1. Click `补齐材料` exactly once.
2. Verify source controls lock while active.
3. Require both material artifact success and task success, positive material writes, strict readiness, and zero quarantine.
4. Click `生成正文` exactly once.
5. Require non-empty prose, terminal task success, MCP as the only source, a different Task ID from material repair, and a distinct non-empty Session for every actual remote stage.

If either single task fails, stop again without clicking or retrying and preserve the new evidence.

## Compatibility

- Provider-neutral MCP adapters keep the same public interfaces.
- Buda retains independent per-stage Session creation and Drive synchronization.
- GenerationSource remains the unique chapter-production authority with no API fallback.
- API-model chapter production is unchanged.
- Existing public error codes and quarantine behavior are unchanged outside the exact safe-recovery case.
- Protected local files `ui/server/.workspace-config.json` and `workspace/assets.json` remain uncommitted.

## Acceptance Criteria

- Exact structured pre-dispatch rejection always stabilizes readiness before replay.
- A stale MCP transport can be rotated within the existing readiness window.
- No ambiguous mutation class is ever replayed.
- No Buda-specific Session-list logic enters generic stability or chapter orchestration.
- Focused, adjacent, and full automated verification passes.
- New-workspace page acceptance completes material repair and chapter production with one click per action.
- The original failed acceptance evidence remains intact.
