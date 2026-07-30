# MCP Generation Source Hardening Design

**Date:** 2026-07-30

## Goal

Make the MCP GenerationSource branch safe and reliable for its first supported deployment model: a single-user MangaForge desktop installation whose backend and web UI run only on the local machine.

This design closes the confirmed release blockers from the final branch review without adding remote-user authentication, encrypting Keys at rest, or replacing the approved GenerationSource architecture.

## Deployment and Threat Model

The supported server host is loopback only: `localhost`, `127.0.0.1`, or `::1`. The web UI may use a different loopback port during development. Native clients and local command-line tools may omit the `Origin` header.

Untrusted web pages are in scope. They must not be able to issue state-changing requests to the local API, enumerate MCP configuration, redirect a configured Server, or cause MangaForge to send a stored credential to a new origin.

Other local processes running as the same OS user are out of scope for this phase because the accepted plaintext-at-rest decision already grants that user access to the workspace files.

## 1. Local HTTP and Secret Boundary

### Loopback-only server

Server startup will accept only loopback hosts. A non-loopback `HOST` value will fail startup with a clear configuration error instead of silently exposing the API to the LAN.

Before route handlers run, an origin guard will apply these rules:

- Requests without `Origin` are allowed for native and CLI use.
- HTTP(S) origins whose parsed hostname is exactly `localhost`, `127.0.0.1`, or `::1` are allowed on any port.
- Every other origin is rejected with 403. Rejection occurs before request handling, not merely by omitting CORS response headers.

The CORS configuration will use the same predicate so browser preflights and direct route enforcement cannot diverge.

### Server-origin changes

MCP Server URL edits will compare normalized URL origins. Path and query edits on the same origin remain allowed.

If the origin changes and any Key belongs to that Server, the update returns 409. The user must create a new Server or remove/recreate the credentials after unbinding dependent projects. A stored credential is never silently authorized for a new origin.

### Public Server DTO and overwrite-only headers

Raw `custom_headers` values will not be returned by list, create, or update routes. The public Server representation exposes header names and whether each name has a stored value.

Header updates follow explicit overwrite-only semantics:

- An omitted or blank value preserves the stored value for that name.
- A supplied nonblank value replaces it.
- Removal requires an explicit list of header names to delete.

The UI will show header names and “configured” state, accept replacements, and make removal explicit. It will never hydrate a form with a raw stored value.

### Central secret scrubbing

Before MCP errors reach JSON, SSE, progress events, diagnostics, or durable run receipts, a scrubber will remove:

- the selected raw MCP Key;
- configured custom-header values;
- Bearer tokens and common token/key patterns;
- raw Authorization, Cookie, and proxy-authorization values.

Scrubbing is defense in depth. Dedicated Key DTOs will continue to omit `key` and expose only `masked_key` and `has_key`.

## 2. Configuration and Binding Integrity

### Workspace mutation coordinator

A process-local MCP workspace coordinator will serialize Server, Key, project-binding, reference-check, and MCP acceptance-fence mutations for each active workspace. This matches the supported single backend process.

The lock order is always MCP workspace coordinator first, then the existing novel workspace mutation lock. Code may not acquire them in the opposite order.

### Durable JSON stores

Server and Key stores remain JSON for this phase, but their mutation functions will run under the coordinator and write by same-directory temporary file followed by atomic rename.

Read behavior becomes fail-closed:

- `ENOENT` means an empty store.
- Invalid JSON, unexpected top-level shape, permission failures, and other I/O errors raise a stable MCP store error.
- A failed read must never be followed by a write of an empty collection.

Temporary files are cleaned up best-effort after failed writes.

### Centralized binding mutations

The dedicated prose-generation-source route is the only route allowed to change `reference_config.prose_generation_source`.

Generic project and reference-config updates will reject payloads that contain that field instead of silently stripping it. This makes bypass attempts visible to callers.

Inside the MCP coordinator, binding save will:

1. reload the current project;
2. normalize and validate the complete source object;
3. validate active Server, Key ownership, Adapter, and visible Agent;
4. re-read all projects and enforce the `Server + Key + Agent` tuple uniqueness;
5. write the binding through the existing novel mutation path.

Delete, disable, and Key reassignment checks will normalize the prospective record first and perform final reference checks inside the same coordinator.

### Fail-closed source configuration

Only the complete absence of `prose_generation_source` means a legacy/default model source.

If the field is present, it must contain the supported version and a valid `model` or `mcp` type. Missing or unsupported version/type, partial MCP bindings, and malformed objects return `MCP_BINDING_INVALID`. They never silently select a model.

### Binding fence at acceptance

Every MCP request records a canonical binding fingerprint from version, source type, Server ID, Key ID, Adapter ID, and Agent ID.

Before accepted prose and Story State commit, the service reloads the project under the MCP coordinator and compares the current fingerprint. A mismatch terminates the old request with a stable binding-changed error and does not store its candidate.

Acceptance will merge the prepared Story State and intended acceptance fields into the current `reference_config`; it will not replace the whole object with the generation-start snapshot. This prevents an older request from restoring an obsolete binding or unrelated configuration.

## 3. Buda Contract and End-to-End Generation Lease

### Live Agent response normalization

Agent discovery will accept the current Buda response shape `{ apiAgents, total }`, as well as the documented compatibility shapes already supported. Tests will use the live `apiAgents` fixture as the primary contract.

### Agent-scoped production lease

The lease key is workspace, Server, Key, and Agent. The lease is owned above the Buda Adapter so it spans the complete MangaForge production attempt:

1. authority snapshot construction and Drive synchronization;
2. Session creation, send, and remote completion;
3. local quality review and revision;
4. binding-fenced atomic chapter/Story State acceptance;
5. terminal failure or confirmed remote cancellation.

A second request for the tuple receives `MCP_AGENT_BUSY`. Binding changes for the active project/tuple also return a conflict while the lease is active.

### End-to-end deadline

`generation_timeout_ms` starts before capability discovery and applies to every subsequent tool call and delay. Each operation receives the smaller of its configured tool timeout and the remaining generation budget.

A deadline-derived AbortSignal is distinct from the caller’s cancellation signal so errors remain typed as timeout versus user cancellation.

### Durable Session creation before send

After Buda returns a Session ID, the Adapter emits an awaited `session_created` progress event before sending the full paragraph task. `McpGenerationSource` synchronously updates the already-created bounded run receipt with:

- request ID and receipt run ID;
- Server, Key, Adapter, and Agent identity;
- Session ID and snapshot hash;
- `session_created` status.

Only after that durable update succeeds may the non-idempotent send occur. The Session title continues to include the request ID.

If send completion is ambiguous, the receipt records `send_unknown`. Retry/recovery uses the persisted Session ID and request-tagged Session; it must not create a new Session or resend blindly.

### Cancellation and quarantine

Any timeout, user cancellation, or post-Session failure triggers a remote cancel attempt under a short, independent cleanup deadline. The local request rejects promptly and does not inherit the normal 60-second tool timeout.

Cancellation keeps its typed cause across Client, Drive, Adapter, GenerationSource, and HTTP layers. Receipts distinguish:

- `cancelled`: remote cancellation or remote terminal cancellation confirmed;
- `timed_out`: generation deadline exceeded and remote termination confirmed;
- `remote_cancel_unknown`: local processing stopped but remote termination could not be confirmed;
- `failed`: non-cancellation terminal failure.

An unresolved `remote_cancel_unknown` quarantines the tuple. New generation remains blocked until diagnostics observe a remote terminal state or the user explicitly clears the quarantine after a warning. Cleanup ownership retains the tuple lease until it resolves or becomes durable quarantine state.

## 4. Connection Sharing and Safe Recovery

### Independent waiters

Each in-flight connection entry owns its AbortController and tracks its waiters. Each caller races the shared connection against its own signal; cancelling one waiter does not fail unrelated waiters.

Invalidation and server shutdown abort connecting transports immediately. Cache deletion is identity-checked so an old failed connection cannot remove a replacement.

### Broken transport eviction

Connection/session-expired errors mark the client closed and evict it from the manager. A client that failed at the transport layer cannot remain cached as `Ready`.

### Replay policy

Every Adapter operation is classified as read-safe or mutation/non-idempotent.

Read-safe operations may receive one bounded transient retry and one expired-session reconnect within the remaining generation deadline. These include tool discovery, Agent listing, Drive listing/text reads, and Session status reads.

Session creation, Session message send, Drive writes, Agent creation, and other mutations are never automatically replayed. An ambiguous Drive write is reconciled by a read/verify operation. An ambiguous Session send follows the persisted-Session recovery flow.

## 5. UI and Error Behavior

The MCP Services page will:

- display masked Header configuration without raw values;
- explain that changing a Server origin requires a new/reconfigured credential;
- expose explicit Header removal;
- show stable actionable messages for corrupt stores and invalid referenced updates.

Project generation UI will surface binding changes, active Agent leases, `send_unknown`, and `remote_cancel_unknown` without offering an automatic model fallback. Reconciliation or explicit quarantine clearing is a deliberate user action.

## 6. Test Strategy

All implementation follows RED-GREEN-REFACTOR with deterministic tests.

### HTTP and secret tests

- trusted loopback origins and Origin-less local clients pass;
- hostile origins are rejected before handlers execute;
- non-loopback server host startup fails;
- same-origin URL path edits pass, while cross-origin edits with stored Keys fail;
- public Server DTOs never expose Header values;
- reflected Key/Header/Bearer values are scrubbed from errors, SSE, and receipts.

### Store and binding concurrency tests

- concurrent Key/Server mutations do not lose records or duplicate IDs;
- corrupt JSON is reported and never replaced;
- concurrent tuple binds produce exactly one success and one conflict;
- generic project routes reject direct source writes;
- referenced disable/reassignment/delete checks use the normalized final record;
- acceptance rejects a changed binding and preserves current unrelated reference config.

### Buda and lifecycle tests

- live `{ apiAgents, total }` Agent discovery works;
- the total deadline covers discovery, Drive, create, send, and polling;
- Session identity is durably recorded before send;
- ambiguous send does not create a duplicate Session;
- cancellation stays typed and remote cleanup is short-bounded;
- unresolved cancellation quarantines the tuple;
- the Agent lease covers remote generation through local acceptance.

### Connection tests

- one waiter can cancel without cancelling another;
- invalidation/shutdown aborts connection setup;
- stale connection failures cannot evict replacements;
- expired transports are evicted;
- only read-safe calls reconnect/retry once;
- mutations are never replayed.

### Final verification

The repaired 188-test novel server suite, focused MCP backend and frontend suites, server lifecycle tests, backend bundle, and Vite production build must all pass. Credentialed live Buda smoke testing remains a manual staging action using a separately created `sk_` API Key and is never enabled in CI.

## Non-Goals

- Key encryption at rest.
- LAN or remote deployment.
- User login, multi-user authorization, or a general session/CSRF system.
- Migrating MCP configuration wholesale to SQLite.
- Automatic replay of non-idempotent Buda operations.
- A CI dependency on real Buda credentials.
- Non-blocking UI enhancements such as a temporary model-override button.

## Success Criteria

- No untrusted browser origin can execute local API handlers.
- A stored Key cannot be sent to a newly configured Server origin without explicit credential recreation.
- Live Buda Agent discovery works with the actual contract.
- One Agent cannot run against stale canon or duplicate ambiguous work.
- Session and cancellation provenance is durable, bounded, and accurately typed.
- Concurrent configuration and binding changes preserve invariants and existing data.
- Malformed source configuration fails closed with no model fallback.
- All automated suites and builds listed above pass from a clean worktree.
