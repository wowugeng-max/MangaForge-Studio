# Unified Chapter Generation Source Switching Design

Date: 2026-08-01
Status: approved in conversation; awaiting written-spec review
Scope: one project-level source for the chapter production chain, with explicit API/MCP activation and retained inactive configuration

## Problem

The workspace currently shows an ordinary model selector and an MCP source status at the same time. The stored `prose_generation_source_v1` configuration selects only the initial prose draft. Review, revision, structured review repair, post-revision review, and story-state synchronization can still call the ordinary model path. This creates two ambiguities:

1. both top-bar controls look active even though only one produces the initial draft;
2. selecting MCP does not make the complete chapter production task use one generation path.

Switching the current configuration back to `type: model` also discards the MCP binding. That makes “disable MCP” behave like deletion instead of a reversible project-level switch.

## Goals

- Give every project exactly one active chapter generation source: ordinary model API or MCP Agent.
- Apply that source to every model-driven stage of the chapter production chain.
- Preserve both the selected API model and the complete MCP binding when either path is inactive.
- Allow an explicit, persistent source switch from the workspace top bar and project settings.
- Prevent source, model, or binding changes while a chapter task is running.
- Keep MangaForge authoritative for prompts, context, validation, quality gates, persistence, and memory.
- Preserve historical `prose_generation_source_v1` projects without requiring manual rebinding.

## Non-goals

- Routing setting generation, character generation, volume outlines, chapter outlines, planning tools, asset tools, or the creative assistant through MCP.
- Allowing different sources or models for individual stages inside one chapter task.
- Automatically falling back from MCP to model API, or from model API to MCP.
- Discovering a Buda model catalog; Buda still exposes no model-list MCP tool.
- Encrypting MCP Keys in this phase.
- Replacing MangaForge canonical memory with Buda Agent memory.

## Chosen approach

Use one versioned project state containing:

- the one active source;
- the retained ordinary model selection;
- the retained MCP binding.

Activation is separate from configuration. Saving an inactive MCP binding does not activate it, and activating the ordinary model path does not delete the MCP binding. A dedicated activation endpoint performs the atomic switch.

This is preferred over storing activation and binding in separate records because one state can be validated, fingerprinted, locked, and committed atomically. It is preferred over a UI-only switch because the server must enforce the unique-source invariant.

## Data contract

The new project authority is stored at `project.reference_config.chapter_generation_source` and uses contract version `chapter_generation_source_v1`:

```json
{
  "version": "chapter_generation_source_v1",
  "active": "model",
  "model": {
    "model_id": 217
  },
  "mcp": {
    "server_id": "buda",
    "key_id": 3,
    "adapter_id": "buda",
    "agent_id": "agent_xxx",
    "model": ""
  }
}
```

### Invariants

- `active` is exactly `model` or `mcp`; there is no “both enabled” or “both disabled” state.
- `model.model_id` is a positive integer when configured.
- A missing `model.model_id` is accepted only as a legacy/unconfigured state. An API task must still receive one valid model before it starts.
- `mcp` may be absent only when the project has never configured MCP.
- Activating MCP requires a complete, currently valid MCP binding.
- The inactive configuration remains stored and visible.
- A retained inactive MCP binding still belongs exclusively to its project. Another project cannot claim the same Server/Key/Adapter/Agent tuple.
- The active source plus its effective model/binding fields form the task source fingerprint.
- Inactive configuration does not change the fingerprint of an already running task.

### Historical compatibility

When the new field is absent, read the current `prose_generation_source_v1` as follows:

- missing historical source: `active: model`, no MCP binding;
- historical `type: model`: `active: model`, no MCP binding;
- historical `type: mcp`: `active: mcp`, preserve the normalized Server, Key, Adapter, Agent, and Buda model.

For a legacy API project without a stored chapter model, the first explicit top-bar model selection or API activation stores the selected model. Until then, an existing request-level `model_id` may provide the task model for compatibility, but it is captured once at task start and reused for all chapter stages.

The first successful write through the new source APIs persists `chapter_generation_source_v1`. Historical data is not destructively rewritten merely by reading it.

## Chapter task boundary

The server introduces a task-scoped `ChapterGenerationSource` instead of resolving only the draft prose call:

```text
beginChapterTask
  ├─ draft
  ├─ quality_review / manual_recheck
  ├─ structured_review_fill
  ├─ revision
  ├─ post_revision_review
  └─ story_state_sync
endChapterTask
```

The list covers every model-driven stage in the chapter production chain. Deterministic scanners, validators, normalization, quality decisions, database writes, and memory updates remain local and do not become remote generation stages.

### Task-scoped execution handle

At task start the resolver returns an execution handle containing:

- project and chapter identifiers;
- task identifier;
- active source;
- effective model or MCP binding snapshot;
- source fingerprint;
- context version;
- source-specific execution state;
- an idempotent close/release capability.

Every model-driven stage receives this handle. A stage cannot independently resolve a different source or model. The handle is closed only after success, failure, or cancellation cleanup has completed.

### Ordinary model API behavior

- All chapter stages use the same captured `model_id` selected in the top bar.
- Existing stage-specific model selection is bypassed for chapter-chain stages covered by this design.
- Stage-specific temperature, token limits, prompts, and response contracts remain under MangaForge control.
- Planning and setting workflows continue using their existing model strategies.

### MCP behavior

- All chapter stages use the same Server, Key, Adapter, Agent, and configured Buda model snapshot.
- One user-triggered chapter task creates one Buda Session lazily and reuses it for every MCP stage in that task.
- A later manual recheck or revision is a new task and therefore creates a new Session.
- The same Agent is retained across tasks, while each new task receives MangaForge's latest complete canonical context.
- Auto omits the Buda `model` field; an explicit model is sent on Session creation and every stage message operation where Buda accepts it.
- A Buda failure never invokes the ordinary model source as a fallback.

## Stage protocol

Each remote or ordinary model stage is represented by a common task envelope:

```json
{
  "task_id": "chapter-task-xxx",
  "stage": "quality_review",
  "project_id": 5,
  "chapter_id": 12,
  "source_fingerprint": "sha256:...",
  "context_version": "...",
  "prompt": "MangaForge-compiled complete stage prompt",
  "response_contract": "stage-specific structured contract"
}
```

MangaForge compiles the full prompt and authoritative context for every stage. For MCP, the next stage is sent only after MangaForge has parsed and validated the previous result. The validated previous output, not unverified Agent memory, is supplied as the next stage input.

Draft and revision stages return prose plus their required receipts. Review and story-state stages return structured payloads. Invalid or incomplete output is a typed stage failure and does not trigger source fallback.

## Activation and configuration APIs

The new public project APIs are separated by responsibility.

### Read state

```http
GET /api/novel/projects/:id/chapter-generation-source
```

Returns the normalized state, safe display metadata, the active-source fingerprint, and whether a chapter task currently locks the source.

### Activate one source

```http
POST /api/novel/projects/:id/chapter-generation-source/activate
Content-Type: application/json

{ "active": "model" }
```

or:

```json
{ "active": "mcp" }
```

The operation:

1. runs under the existing workspace/project mutation coordinator;
2. rejects with `409 GENERATION_SOURCE_BUSY` while a chapter task holds the project source lease;
3. preserves the inactive configuration;
4. validates the target model or live MCP binding;
5. changes only `active` after validation succeeds;
6. returns the confirmed normalized state;
7. is idempotent when the requested source is already active.

### Store the API model

```http
PUT /api/novel/projects/:id/chapter-generation-source/model
Content-Type: application/json

{ "model_id": 217 }
```

Selecting a different model while the API source is active persists that positive `model_id` through the dedicated chapter-source API. The model selector is disabled while MCP is active, so inactive API configuration cannot change accidentally. Updating the model is rejected while a chapter task is running.

### Test and store the MCP binding

```http
POST /api/novel/projects/:id/chapter-generation-source/mcp/test
PUT  /api/novel/projects/:id/chapter-generation-source/mcp
```

MCP test and save operations remain separate from activation. They validate Server, Key, Adapter, Agent, and Buda model input, then update only the retained MCP binding. When API is active, saving MCP configuration leaves API active. When MCP is active, a binding update retains MCP activation but is still forbidden during an active chapter task.

The existing prose-source endpoints remain compatibility adapters for this implementation phase. They translate historical requests into the new state without deleting a retained binding. Removing those adapters is outside this phase. New workspace code uses only chapter-source endpoints.

## Source ownership and locking

A project-level chapter-source lease is required for every covered task, including API tasks and standalone manual review, revision, or story-state synchronization. The lease is distinct from, and composes with, the MCP Agent lease.

- The project lease prevents activation, API-model changes, and MCP-binding changes.
- The MCP Agent lease additionally prevents concurrent use of the same remote Agent tuple.
- The task captures the source fingerprint before its first model call.
- Every result acceptance boundary verifies the same fingerprint.
- The project lease remains held through local validation and final authoritative writes.
- Cleanup is idempotent and runs after success, failure, or cancellation.

This guarantees that one task uses one source and one effective model/binding from beginning to end.

## Workspace UI

The top bar adds one mutually exclusive source control next to both retained configurations:

```text
章节来源  [ 大模型 API | MCP Agent ]  [ gemini-... ▼ ]  [ Buda MCP · Agent · Auto ]
```

### API active

- The API segment is selected.
- The model selector is enabled and marked as active.
- The MCP detail remains visible but is gray and marked as disabled.
- Clicking the MCP detail opens project settings; it does not activate MCP.

### MCP active

- The MCP segment is selected.
- The MCP detail is highlighted and marked as active.
- The model selector remains visible but is disabled, retaining its selected value.
- Its tooltip states that the chapter chain is currently executed by MCP.

### Switching behavior

- Only the mutually exclusive source control activates a source.
- The control shows a pending state until the server confirms the switch.
- On failure, the confirmed server state remains displayed and the error explains the reason.
- Attempting to activate an incomplete or invalid MCP binding opens project settings after the error.
- While a chapter task is running, activation and configuration controls are disabled with the message: `当前章节任务正在运行，结束后可切换来源`.
- Normal workspace mode displays both configuration details.
- Immersive mode displays the compact source switch plus the active source detail.

Project settings presents two separate sections:

1. `当前章节来源`, for API/MCP activation;
2. `MCP 绑定配置`, for Server, account, Agent, and Buda model testing and saving.

Saving MCP configuration never silently activates it.

## Error handling

- `GENERATION_SOURCE_BUSY`: a covered task currently holds the project lease; no source state changes.
- `CHAPTER_MODEL_REQUIRED`: API activation or execution has no valid model.
- `MCP_BINDING_INVALID`: MCP cannot be activated; retained configuration remains available for repair.
- MCP structured output mismatch: the current stage fails without API fallback.
- Buda send or cancellation uncertainty: preserve the existing receipt, quarantine, reconciliation, and manual-check behavior.
- Source fingerprint mismatch: reject result acceptance and leave canonical chapter/state data unchanged.
- Partial metadata failure in the UI: keep the authoritative active source and stable identifiers visible; never display stale source information.

Completed, locally committed earlier stages remain committed only where the existing workflow defines them as authoritative. A failed or unvalidated stage may not be presented or stored as successful.

## Receipts and observability

Every covered model stage records bounded, scrubbed provenance:

- task and stage identifiers;
- project and chapter identifiers;
- active source;
- source fingerprint;
- effective ordinary model ID, or MCP Server/Key ID/Adapter/Agent/Buda model;
- MCP Session ID when applicable;
- context version;
- stage status and timing.

Raw Keys, authorization headers, cookies, and other credentials remain excluded. One task's stage receipts share the same task identifier and source fingerprint, making cross-source leakage auditable.

## Testing

### Configuration and migration

- Normalize missing, historical model, and historical MCP source states.
- Preserve the MCP binding across API activation and preserve the API model across MCP activation.
- Reject both-enabled, both-disabled, malformed model, and incomplete active-MCP states.
- Keep inactive MCP tuples exclusive to their owning project.
- Include only the active source and effective configuration in the task fingerprint.

### Activation and locking

- Activate each source idempotently.
- Reject MCP activation when live validation fails without changing the active source.
- Reject source, API-model, and MCP-binding changes while any covered task holds the project lease.
- Verify concurrent activation requests serialize and return confirmed state.
- Verify all success, failure, and cancellation paths release locks exactly once.

### Unified routing

- API tasks route draft, review, structured fill, revision, post-revision review, and story-state sync through the same captured model ID.
- MCP tasks route those stages through the same Agent, Buda model, and task Session.
- A later manual task creates a new MCP Session.
- No covered stage bypasses the task execution handle to call a different source.
- Any MCP stage failure produces no ordinary model call.

### UI

- Show exactly one active segment.
- Disable the inactive model selector while retaining its value.
- Retain and display disabled MCP identity.
- Persist successful activation and roll back failed visual transitions.
- Lock controls during active tasks.
- Keep authoritative source identity on partial metadata failure and project switching.
- Verify normal and immersive layouts.

### Regression verification

- Existing MCP security, lease, quarantine, and receipt suites.
- Existing chapter generation, quality review, editor revision, and story-state synchronization suites.
- Focused workspace source tests.
- Server and web production builds.
- A real Buda test covering a multi-stage task in one Session and a later manual task in a new Session.

## Acceptance criteria

The feature is complete when:

1. the top bar always identifies exactly one active chapter source;
2. switching sources is persistent, reversible, and does not delete inactive configuration;
3. a running chapter task prevents all source/model/binding changes;
4. every model-driven chapter stage uses the task's single source and captured model/binding;
5. MCP stages in one task share one Session, while later tasks use new Sessions;
6. no failure silently crosses from one source to the other;
7. historical projects continue to run and can adopt the new state without manual rebinding;
8. receipts prove the same source fingerprint was used throughout the task;
9. planning and setting workflows remain unchanged.
