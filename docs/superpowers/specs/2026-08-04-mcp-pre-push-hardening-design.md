# MCP Pre-Push Hardening Design

Date: 2026-08-04
Status: design approved; written specification awaiting review
Scope: close the final MCP chapter-chain blockers, complete a live Buda acceptance run, and push the verified `main`

## Context

MangaForge now has a project-level `chapter_generation_source_v1` authority. One chapter task captures exactly one source—model API or MCP—and routes draft, review, repair, revision, and Story State synchronization through the same task execution handle. The provider-neutral Adapter boundary is already in place, and Buda is the first registered MCP implementation.

The live cross-account test confirmed that Agent discovery and binding work, but a newly created Buda Agent has an empty Drive. Buda's live `api_claw_*` read call waits until the tool timeout when the requested file does not yet exist. The current compatibility path deliberately skips Drive listing, then still reads all five expected files before writing, so first generation stops with `MCP_DRIVE_SYNC_FAILED` before a Session can generate prose.

The final branch review also found five release-significant integrity problems and one compatibility issue:

1. MCP stage output is recorded as successful before its declared response contract is validated.
2. retained `chapter_generation_source.mcp` bindings are omitted from MCP Key/Server reference checks.
3. a legacy MCP project with no retained API model cannot configure the inactive model path in the current UI before switching.
4. ordinary stale `reference_config` writes can overwrite the generation-source authority.
5. plaintext local MCP stores and live-test artifacts are not ignored by Git.
6. a legacy request-level API model is omitted from the effective task fingerprint.

This design fixes those issues without changing the approved single-source chapter architecture.

## Goals

- Make first generation against an empty Buda Drive complete without a read-before-create timeout.
- Keep Buda-specific behavior inside the Buda Adapter and Drive compatibility layer.
- Validate every MCP stage result against its declared response contract before recording success or returning it to chapter services.
- Protect every retained MCP binding from Key/Server disable, reassignment, and deletion.
- Let a project configure its inactive API model and then atomically activate it.
- Make `prose_generation_source` and `chapter_generation_source` protected data-layer fields that ordinary project writes cannot change or restore from stale snapshots.
- Make task provenance identify the effective API model actually used, including legacy request-level fallback.
- Keep the chapter production chain fail-closed: an MCP failure or contract violation never calls the model API.
- Prove the result with deterministic tests, two-account live evidence where useful, and a successful real chapter generation.

## Non-goals

- Encrypting MCP Keys at rest. Plaintext storage remains an explicitly deferred final-phase task.
- Routing planning, setting generation, character generation, outlines, assets, or the creative assistant through MCP.
- Replacing MangaForge's canonical context, validation, persistence, or Story State authority with provider memory.
- Automatically interpreting arbitrary MCP tools as a chapter-generation service.
- Adding a Buda model catalogue. Auto or a user-entered provider model remains part of the Adapter binding.
- Generalizing Buda's empty-Drive workaround into the common Adapter contract.
- Automatically falling back between MCP and model API.

## Architectural Boundary

The chapter workflow continues to depend only on `ChapterTaskExecution`, `McpGenerationAdapter`, stage envelopes, response contracts, receipts, and generic terminal errors. It must not import Buda tool names, Drive paths, or `api_claw_*` behavior.

The shared MCP layer remains responsible for credential resolution, source and Agent leases, deadlines, provenance, stage serialization, secret scrubbing, and receipt recording. Each Adapter remains responsible for its provider's tool discovery, context materialization, Session lifecycle, transport, polling, and cleanup.

Buda-specific changes in this phase are confined to `ui/server/src/mcp/adapters/buda-drive.ts` and its tests. The compatibility branch is selected only by the already discovered Buda live-tool family. A future Adapter keeps the existing generic Drive reconciliation behavior unless its own implementation explicitly defines another strategy.

## 1. Empty Buda Drive Synchronization

### Generic MCP/Buda-compatible path

For tool sets that do not use Buda's live `api_claw_*` family, the current differential algorithm remains unchanged:

1. list `/mangaforge`;
2. read only files that are reported as present;
3. compare content hashes;
4. upload changed or missing content files;
5. upload the manifest last;
6. read every uploaded file back and compare exact content.

This behavior must not acquire knowledge of the empty-Drive workaround.

### Live Buda `api_claw_*` path

For Buda's live tool family, synchronization uses a deterministic full upsert instead of discovery or a preflight diff:

1. do not call Drive list;
2. do not read a target path before its first upsert;
3. upsert these four canonical content files in fixed order:
   - `/mangaforge/writing-bible.md`
   - `/mangaforge/story-state.json`
   - `/mangaforge/continuity.md`
   - `/mangaforge/recent-chapters.md`
4. upsert `/mangaforge/manifest.json` only after all content files succeed;
5. immediately read each file after its upsert and require byte-for-byte equality with the local snapshot.

All five upserts are idempotent. A confirmed mutation error fails normally. If an upsert has an ambiguous transport result, the Adapter preserves the existing read-after-error reconciliation: exact remote content confirms success; a successful read with different content confirms failure; an unavailable reconciliation read preserves the original mutation error. The existing one-time `Server not initialized` compatibility retry remains bounded by the same generation deadline and is allowed only after reconciliation proves that the intended content was not committed.

The manifest-last rule prevents a partially uploaded snapshot from advertising completeness. A failed read-back raises `MCP_DRIVE_SYNC_FAILED`; no Session is started and no model fallback occurs.

## 2. Fail-Closed Stage Response Contracts

The shared generation-source layer will add one contract validator keyed by `ChapterStageResponseContract`. MCP output passes through it inside the callback owned by `createChapterStageRecorder`, after the Adapter returns a bounded completed result and before the callback resolves. Therefore a validation exception causes the existing recorder to persist a failed stage receipt rather than a success receipt.

The validator has two contract families:

- Prose contracts (`draft_prose`, `word_target_prose`, `editor_rewrite_prose`, `meme_polish_prose`, `humanize_prose`, and `revision_prose`) must resolve through the contract's existing prose extraction rules to non-empty chapter prose. JSON wrappers documented by that contract may be accepted, but arbitrary explanation text may not masquerade as a structured contract.
- JSON contracts (`readability_json`, `quality_review_json`, `structured_review_json`, `editor_report_json`, and `story_state_json`) must parse into a plain, non-array object and satisfy the required fields and value types already expected by the corresponding MangaForge normalizer. A syntactically valid but semantically incomplete object is invalid.

Validation returns the same safe `LLMResponse` shape expected by existing downstream services, with its parsed `output` set to the validated value. Downstream normalization and deterministic quality checks remain in place as defense in depth, but may no longer turn missing MCP fields into a successful default. In particular, `{}`, plain prose, malformed JSON, missing quality verdicts, invalid scores, and invalid Story State payloads fail before callers can default them to `passed: true`, score `80`, or a non-blocking warning.

A contract failure uses the stable code `MCP_STAGE_CONTRACT_INVALID`. Its public message identifies the stage and contract but does not include raw remote output, prompts, credentials, or provider headers. The error flows through normal secret scrubbing, task cleanup, lease release, and failed-receipt persistence. It never triggers an alternate source.

Contract tests cover every enum member so adding a new response contract without a validator is a compile-time or exhaustive-test failure.

## 3. Complete MCP Reference Protection

One provider-neutral binding extractor becomes the authority for MCP Key/Server reference checks. For each project it resolves:

- `chapter_generation_source_v1.mcp` whenever the new field exists, whether MCP is active or inactive;
- legacy `prose_generation_source_v1.mcp` only when the chapter source is absent;
- no binding for a valid model-only project.

The retained inactive MCP binding is still project-owned and therefore blocks Key disable, Key Server reassignment, Key deletion, Server disable, and Server deletion. `/api/mcp/keys` and related public views use the same extractor, so `bound_projects` matches mutation protection.

Malformed explicit source state fails closed. A destructive Key/Server mutation may not treat an unreadable project source as unreferenced; it returns the existing safe binding/configuration error until the project source is repaired. Reference results expose project ID and title only and never expose Key material.

Focused tests cover new active MCP, new inactive MCP, legacy MCP, model-only, mismatched target, and malformed-source cases.

## 4. Configuring and Activating the Inactive API Model

The project continues to retain both source configurations while exactly one is active. The model selector remains visible when MCP is active and becomes editable whenever the source authority is known, no chapter-source mutation is pending, and no project source lease is held. Its inactive styling and label continue to show that selecting a model configures the disabled path; it does not activate it.

`PUT /chapter-generation-source/model` stores a valid positive model ID regardless of the current active source. It changes only `source.model`, preserves MCP activation and binding, runs through the source mutation coordinator, and remains forbidden while the source is leased. This supports legacy MCP states migrated as `model: {}`.

Activation remains a separate explicit action. `POST /activate` with `active: model` succeeds only after a model has been stored. It changes only `active`, retains MCP configuration, and returns the authoritative state. There is no combined select-and-activate request and no implicit switch caused by changing the inactive model.

## 5. Data-Layer Generation-Source Authority

`prose_generation_source` and `chapter_generation_source` become protected reference-config keys below the HTTP route layer.

Ordinary project update and reference-config mutation primitives preserve the current database values for both keys, including their absence, even when a caller supplies a stale whole-object `reference_config`. This prevents an unrelated setting, quality, writing-bible, or Story State update from restoring an earlier source snapshot. Generic public routes continue to reject explicit attempts to mutate protected keys so bypass attempts remain visible to API clients.

A dedicated generation-source repository mutation is the only primitive allowed to change those keys. It is called only by the existing source coordinator while the workspace/project mutation fencing rules are active. It writes the canonical `chapter_generation_source_v1` authority and its legacy `prose_generation_source_v1` compatibility projection atomically.

Chapter acceptance continues to merge Story State and other intended fields into the latest `reference_config`. It verifies the captured authority fence before commit, while the protected-field policy guarantees that its ordinary merge cannot rewrite either source field.

Tests exercise stale full-object writes through the project repository, generic reference-config mutations, Story State acceptance, and the dedicated source mutation. The expected result is preservation for ordinary writes and an atomic paired change for the dedicated path.

## 6. Effective Model Provenance and Fingerprints

Task construction distinguishes two fingerprints:

- the **authority fingerprint** represents the persisted project source state captured under the coordinator and is used by `assertCurrent` and acceptance fencing;
- the **effective task fingerprint** represents the exact source used for execution and is written to stage receipts and task provenance.

For a configured API project, both fingerprints contain the stored `model_id` and are equal. For a legacy API state with `model: {}`, task construction first resolves the final positive model from the request-level compatibility input, materializes an immutable effective task snapshot containing that model, and computes the task fingerprint from the materialized snapshot. The authority fingerprint still represents the persisted empty model state, so source-change checks compare like with like and remain valid.

`model_id`, the effective task snapshot, and every stage receipt must agree. Different request-level models against the same legacy persisted state produce different task fingerprints. A mid-task persisted source change still fails the authority fence before acceptance. New writes continue to persist a selected model through the dedicated API; the dual-fingerprint case exists only for historical compatibility.

For MCP tasks, effective and authority fingerprints remain identical because all required binding fields are persisted before activation.

## 7. Local Secret and Artifact Hygiene

The repository `.gitignore` will add these machine-local paths:

- `workspace/mcp-agent-quarantines.json`
- `workspace/mcp-keys.json`
- `workspace/mcp-servers.json`
- `workspace/zhuque-inputs/`
- `workspace/zhuque-reports/`

The existing real-test files remain on disk and are not deleted. They must never be staged or included in a commit. `workspace/assets.json` is also left untouched because its current modification belongs to the live test workspace.

This is repository hygiene, not encryption. Runtime DTO scrubbing and error scrubbing remain required, and plaintext Key encryption remains deferred.

## 8. Error, Cleanup, and No-Fallback Invariants

Every chapter task still owns exactly one `ChapterTaskExecution` from start through terminal cleanup. Draft, automatic quality review, structured fill, quality repair, revision, post-revision review, Story State synchronization, and manual review/revision tasks use the captured source. A later manual action opens a new task and remote Session but retains the same project source fingerprint unless the project source has changed.

Empty-Drive failure, contract failure, source change, timeout, cancellation, or provider failure follows the same terminal sequence:

1. stop accepting stage output;
2. persist a scrubbed failed or cancellation receipt;
3. attempt bounded remote cleanup when a Session exists;
4. reconcile or quarantine ambiguous remote state according to the existing policy;
5. release the Agent and project source leases idempotently;
6. leave chapter text and Story State unmodified unless the complete acceptance transaction succeeded.

No failure path constructs or invokes a model execution as fallback.

## 9. Test-Driven Implementation Strategy

Implementation follows RED-GREEN-REFACTOR one blocker at a time:

1. Buda Drive tests first reproduce the empty-file read timeout and require ordered full upsert with manifest last, reconciliation, and read-back verification; generic differential-upload tests must remain green.
2. MCP generation-source tests feed invalid results for each prose and JSON contract, require `MCP_STAGE_CONTRACT_INVALID`, and verify a failed receipt with no downstream defaulting.
3. MCP route tests require both retained chapter bindings and legacy bindings to appear in `bound_projects` and block destructive mutations.
4. backend and web tests require saving a model while MCP is active, retaining MCP activation, then activating the stored model explicitly.
5. repository and acceptance tests reproduce stale source overwrite attempts and prove that only the dedicated source mutation can change protected fields.
6. resolver and receipt tests require request-level legacy models to produce distinct effective task fingerprints while authority fencing still detects persisted changes.
7. ignore-rule tests or direct Git checks prove that all listed local artifacts remain untracked.

Each production change is written only after its focused test has failed for the expected reason.

## 10. Verification and Live Acceptance

Automated verification must be freshly run after implementation:

- focused Buda Drive, MCP generation-source, binding-route, source-control, repository, acceptance, and resolver tests;
- the complete server test suite;
- the complete web test suite;
- the server production build;
- the web production build;
- the existing MCP and unified chapter-session smoke coverage.

Live acceptance then uses the already configured test project and a working Buda test binding without printing or committing credentials. Success requires:

- chapter 129 receives non-empty first-chapter prose;
- automatic draft, quality, repair/revision when invoked, and Story State stages use one MCP task, one remote Session, and one effective source fingerprint;
- a manual recheck uses a new task and Session but the same project source fingerprint;
- receipts show the same Server, Key ID, Adapter, Agent, provider model/Auto selection, and context provenance without secret values;
- no ordinary model call occurs;
- no unresolved quarantine remains;
- project and Agent leases are released;
- failed earlier candidates were never persisted and the final accepted chapter/Story State correspond to the verified run.

If live Buda behavior is ambiguous, read-only reconciliation is performed before any non-idempotent retry. A second account may be used only to confirm provider behavior independently; each project remains bound to one account's Key and Agent.

After live acceptance, run the complete automated suites and builds again if the test changed runtime workspace state or exposed a code change.

## 11. Final Review and Push Gate

Before pushing:

1. review the complete MCP change range and require zero unresolved Critical or Important findings;
2. inspect `git status` and stage only intended source, tests, documentation, and `.gitignore` changes;
3. confirm no Key, credential, quarantine record, live novel database, Zhuque input/report, or unrelated `workspace/assets.json` change is staged;
4. fetch `origin/main` and verify the remote has not advanced from the implementation base;
5. if it advanced, stop and reconcile safely before any push;
6. push the verified local `main` only after all gates pass.

## Success Criteria

- A new empty Buda Agent can receive the five canonical MangaForge snapshot files and start generation without a write-before-read timeout.
- Generic MCP Adapter and Drive behavior remains provider-neutral and unchanged outside the Buda compatibility layer.
- No invalid MCP stage payload is recorded or consumed as success.
- Retained chapter MCP bindings protect their Key and Server even while model API is active.
- A legacy MCP project can configure an inactive API model and switch to it explicitly without losing MCP configuration.
- Ordinary stale project writes cannot change either generation-source field.
- Every API task receipt fingerprints the effective model actually used, while source-change fencing still compares persisted authority correctly.
- Local credential and live-test artifacts cannot be accidentally added by normal Git staging.
- Chapter 129 passes the live end-to-end acceptance conditions with no model fallback, quarantine, or residual lease.
- All server/web tests and builds pass freshly, the final review has no Critical or Important findings, and the verified commit is pushed to `main`.
