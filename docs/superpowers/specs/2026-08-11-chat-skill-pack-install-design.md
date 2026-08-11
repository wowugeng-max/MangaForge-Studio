# Chat Skill Direct Output and GitHub Install Design

**Date:** 2026-08-11

**Status:** Approved in conversation

## Context

MangaForge Canvas GenerateNode already supports prompt-only Skills for image and video generation modes. It can list installed Skills, compile a preview with an explicitly selected compiler model, preserve ordered multi-reference provenance, and execute the compiled prompt through Provider or Comfy transports. The server and web API also support installing a public GitHub Skill Pack, but the node has no visible installation entry. Chat mode deliberately excludes the Skill panel today.

The requested extension has two related goals:

1. Let Chat-mode GenerateNodes use an image/video prompt-writing Skill to produce a standalone prompt that can be inspected, saved, connected downstream, and evaluated without a second Chat Provider call.
2. Let users install a public GitHub Skill Pack from the GenerateNode Skill panel and use newly discovered compatible Skills immediately.

The feature remains Canvas-only. It does not expose Skills in the novel workspace and does not add agents, tools, MCP execution, hooks, shell commands, or external script execution.

## Goals

- Show the prompt Skill panel in Chat mode.
- Give Chat mode an explicit prompt target mode: text-to-image, image-to-image, text-to-video, or image-to-video.
- Compile exactly once when a Chat + Skill run starts and place the compiler's positive prompt directly in the node's text result.
- Preserve negative prompt, Skill identity, locked revision, compiler identity, cache hash, warnings, ordered references, and source lineage in the result audit.
- Keep up to nine ordered image references available for image-based Chat Skill targets.
- Add a public GitHub repository install control inside the prompt Skill panel.
- Refresh installed Packs and compatible Skills immediately after installation.
- Preserve all current Chat behavior when no Skill is selected and all current media execution behavior outside Chat mode.

## Non-goals

- Sending a Chat + Skill result through the node's selected Chat model after compilation.
- Adding general-purpose Chat/agent/tool Skills.
- Running commands, scripts, hooks, MCP servers, or Skill-provided tools.
- Installing from a GitHub tree/subdirectory URL, a private repository, or a local path through this UI.
- Pack deletion, manual revision switching, background updates, or private GitHub credentials.
- Adding any Skill UI or runtime behavior to the novel workspace.

## Chosen Approach

Reuse the existing `POST /api/skills/compile-preview` endpoint as the only network operation for a Chat + Skill run. The endpoint already owns registry resolution, locked revision checks, compiler-model selection, vision validation, reference normalization, material limits, deterministic cache behavior, and typed errors. GenerateNode converts its successful response into a normal text result and runs the existing local completion/downstream effects without calling `POST /api/generate`, registering a Provider task, opening SSE, or executing Comfy.

Reuse the existing `POST /api/skills/packs` endpoint for GitHub installation. The web API function already exists; the change makes it visible in GenerateNode and refreshes the node's Skill state from the typed response.

Rejected alternatives were a duplicate `/api/skills/run` endpoint and a `compile_only` branch inside `/api/generate`. Both would duplicate or recouple contracts that are already isolated by the compile-preview route.

## UI Design

### Chat Skill controls

Chat mode shows the same `提示词 Skill` section used by media modes. When the node is in Chat mode, the section begins with a `目标提示词类型` selector containing:

- 文生图 (`text_to_image`)
- 图生图 (`image_to_image`)
- 文生视频 (`text_to_video`)
- 图生视频 (`image_to_video`)

The default is `text_to_image`. The target mode filters the ready-only Skill list and is the `mode` passed to compilation. Non-Chat GenerateNodes continue to use their actual node mode as the compilation mode and do not show this extra selector.

When Chat has an active Skill:

- the run button label becomes `生成提示词`;
- a short notice states that the run uses only the Skill compiler model and does not call the Chat model selected at the top of the node;
- the top Chat Key/model controls remain intact for the moment the Skill is cleared;
- only the compiler model is required for execution;
- the output handle remains a text handle.

For `image_to_image` and `image_to_video` Chat targets, GenerateNode exposes the image input handle and the `参考素材` section. The reference section keeps the existing role selector, ordering buttons, stable reference IDs, duplicate URL behavior, source lineage display, and nine-image cap. Text reference inputs remain available through the existing text input path.

Changing the target mode refreshes the compatible Skill list and invalidates compile-preview metadata. During initial hydration or explicit command resolution, if a persisted/command-selected Skill is incompatible with the current target and declares another supported prompt target, the node selects that Skill's first declared supported target. If the user deliberately changes the target away from the selected Skill's supported modes, the incompatible selection is cleared instead of being executed under a guessed mode.

### GitHub installation controls

The bottom of the `提示词 Skill` section contains a compact `安装 Skill Pack` disclosure with:

- one GitHub repository URL input;
- an `安装` button;
- a brief root-URL example such as `https://github.com/MiniMax-AI/MiniMax-H3`;
- an installation status/error area.

Only repository-root HTTPS URLs accepted by the existing server contract are supported. A GitHub `tree/...` URL is rejected with the server's typed error.

During installation the input and button are disabled. On success, the UI shows the Pack ID and short locked revision, clears the URL input, and refreshes both the complete Skill collection and the ready-only collection for the effective prompt target mode.

The node examines Skills returned for the newly installed Pack ID and revision:

- exactly one compatible prompt-ready Skill: select it automatically;
- multiple compatible Skills: leave selection to the user and show that the Pack is ready;
- no compatible Skills: keep the previous selection and show that installation succeeded but the current target mode has no usable Skill.

Repeating an install for the same GitHub HEAD remains idempotent because the existing server installer returns the already pinned Pack revision.

## State and Persistence

GenerateNode adds `skillTargetMode` with a snake-case compatibility alias `skill_target_mode`. Valid persisted values are the four image/video prompt target modes. Missing, malformed, `chat`, and `vision` values normalize to `text_to_image`.

The effective Skill compile mode is:

- `skillTargetMode` when node mode is `chat`;
- the node's actual media mode for image/video generation;
- absent when the node mode does not support prompt Skills.

The effective mode participates in the compile input fingerprint. A target-mode change therefore prevents a stale preview or late response from being treated as current.

The existing node persistence update includes the target mode and continues to preserve Skill Pack ID, Skill name, locked revision, arguments, compiler-model override, compiled prompt, negative prompt, references, warnings, and hash.

## Chat Compile-only Data Flow

1. The user selects Chat, a prompt target mode, a compatible Skill, and a compiler model.
2. GenerateNode reconciles connected references and validates their order, IDs, roles, supported media types, and image count.
3. GenerateNode starts its normal run token and calls `compileSkillPreview` once with the target mode, locked Skill identity, raw prompt, arguments, node parameters, compiler-model ID, and canonical reference collection.
4. The server resolves the exact Skill revision, checks compatibility against the target mode, requires Chat capability and Vision capability when images exist, compiles or reads the deterministic cache, and returns its typed compile result.
5. GenerateNode ignores the response if its run token or compile fingerprint is no longer current.
6. A current response becomes a text generation packet whose `content` is the positive prompt. The packet also carries negative prompt, Skill/Pack/revision identity, compiler model, cache hash/state, warnings, reference-mode hint, ordered reference bindings, and source lineage.
7. The node uses its existing result persistence, asset-save, DAG completion, and downstream distribution behavior.
8. No `/api/generate` call, target Chat Provider call, Provider metric/status side effect, SSE task, or Comfy execution occurs.

Preview remains available and uses the same compile request builder and response normalizer. Clicking preview and then run may produce a cache hit on run, but each click issues only its own single compile request and never invokes a second model after compilation.

## H3 and Multi-reference Semantics

H3 remains a video prompt Skill. In Chat it appears only when the target is `text_to_video` or `image_to_video`.

The current ordered image-role rules remain authoritative:

- no image: `T2VA`;
- one `first_frame`: `I2VA`;
- one `last_frame`: `L2VA`;
- one `first_frame` plus one `last_frame`: `FL2VA`;
- every other image-role collection: `Ref2VA`.

Chat direct output uses the same normalized reference collection as preview compilation. It does not depend on the target media Provider's ability to transport multiple images because no media Provider runs. Compiler Vision capability is still mandatory when image references are present.

## Result Contract

The Chat direct result is a text result compatible with existing preview, asset, and downstream consumers. At minimum it includes:

- `content`: compiled positive prompt;
- `negative_prompt`: compiled negative prompt when present;
- `skill_pack_id`, `skill_name`, and locked `skill_revision`;
- `compiler_model_id` and `compiled_input_hash`;
- compile cache status and warnings;
- `reference_mode_hint` when produced;
- `reference_bindings` in canonical order;
- deduplicated, order-preserving `source_asset_ids` lineage.

The positive prompt is the downstream text payload. Negative prompt and audit fields remain separately addressable and are saved with an asset rather than concatenated into `content`.

## Error and Concurrency Behavior

- Missing or unavailable compiler model blocks preview and direct output with the existing typed compiler error.
- Image references with a non-Vision compiler model return `SKILL_COMPILER_VISION_REQUIRED`.
- Unsupported video/audio references and more than nine images keep their current typed failures.
- Missing, ambiguous, incompatible, or unavailable locked Skill revisions fail closed.
- Chat direct compilation never falls back to an ordinary Chat Provider after an error.
- A failed compile does not overwrite the previous successful node result.
- The existing request/run tracker ignores stale responses after prompt, target mode, Skill, arguments, compiler model, or references change.
- Interrupting or superseding a client run invalidates its token and prevents a late response from updating the node. The server may finish and cache an already-started compiler request; no media task exists to interrupt.
- GitHub installation surfaces `error_code` and `detail` from the existing typed API and preserves the current Skill selection on failure.
- A second install click is disabled while the first is active.

## Security and Scope

The existing GitHub installer remains the only installation authority. It accepts public `github.com` HTTPS repository roots, pins a 40-character HEAD revision, enforces archive and extracted-size limits, rejects traversal/symlink/executable content, and installs atomically under the active workspace.

The UI does not read arbitrary local directories, follow private repository redirects, accept credentials, or execute installed content. The compiler continues to treat Skill documents and references as untrusted prompt material and disables tool choice.

No novel, MCP, agent, restored-src, or external script execution path is added or modified for runtime behavior.

## Testing Strategy

Implementation follows test-first RED/GREEN cycles.

Pure GenerateNode model tests cover:

- normalization and persistence of `skillTargetMode`/`skill_target_mode`;
- effective compile mode for Chat, media, and unsupported node modes;
- compatible Skill filtering and deterministic fallback target selection;
- installation auto-selection for zero, one, and multiple compatible Skills;
- canonical Chat direct result construction, negative prompt separation, audit fields, reference order, and lineage;
- stale run/fingerprint protection.

GenerateNode integration/source-contract tests cover:

- Chat exposes the target selector, prompt Skill panel, GitHub installer, and conditional image reference controls;
- Chat + Skill run calls the compile API exactly once and does not call `/api/generate`;
- Chat without Skill retains the exact legacy generation path;
- run-button messaging and compiler-only notice;
- installation loading, success, typed failure, refresh, and selection behavior.

Existing server route/installer tests remain the authority for public GitHub URL validation, idempotent locked revisions, safe archive extraction, registry invalidation, and typed errors. Server tests are extended only if the UI exposes a server behavior not already covered.

Regression verification includes focused Skill/GenerateNode suites, H3 acceptance tests, broader Canvas/route/provider tests, Web and Server production builds, diff scope scans, and confirmation that novel paths remain untouched.

## Acceptance Criteria

- A Chat GenerateNode can select a prompt target mode and any compatible prompt-ready Skill.
- H3 is selectable in Chat for video targets and retains T2VA/I2VA/FL2VA/L2VA/Ref2VA semantics with up to nine ordered images.
- Chat + Skill `生成提示词` produces the compiler's positive prompt as text output with complete negative/audit/provenance metadata.
- The run makes one compile request and zero `/api/generate`, target Chat Provider, SSE task, or Comfy calls.
- Chat without a Skill is byte-compatible with its prior request behavior.
- A public GitHub repository can be installed inside the node, then discovered and selected without restarting the server.
- Installation errors are typed and non-destructive; repeated installs are idempotent.
- Image/video media generation Skill paths remain unchanged.
- The novel workspace receives no Skill UI or runtime coupling.
