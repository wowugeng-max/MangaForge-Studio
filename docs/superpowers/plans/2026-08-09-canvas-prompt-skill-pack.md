# Canvas Prompt Skill Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, prompt-only Skill Pack runtime for the canvas image/video GenerateNode, including GitHub installation, SKILL.md/reference parsing, explicit selection or `/skill-name` invocation, text-model prompt compilation, and reproducible compiled-prompt metadata without changing the novel workbench.

**Architecture:** Build a small MangaForge-owned runtime under `ui/server/src/skills/`. It indexes compatible `SKILL.md` files and explicitly referenced local files, never executes external scripts/tools/hooks/MCP, and uses `executeWithRuntimeModel` once before the existing media request. The web node calls the skills API, persists the selected pack/name/revision and compile result in node data, and keeps the user's original prompt untouched; requests without a Skill follow the current path byte-for-byte.

**Tech Stack:** Bun/TypeScript, Express, `yaml`, `jszip`, Node `fs/promises` and `crypto`, existing `executeWithRuntimeModel`/model capability records, React/Ant Design/React Flow, and Bun tests.

---

## File Map

The implementation is intentionally split by responsibility so the parser, installer, registry, compiler, routes, and node UI can be tested independently.

**Create (server):**

- `ui/server/src/skills/types.ts` — shared Skill, Pack, compatibility, compile input/result, and typed-error contracts.
- `ui/server/src/skills/frontmatter.ts` — YAML frontmatter extraction and normalization.
- `ui/server/src/skills/references.ts` — explicit reference extraction, path containment, size/symlink checks, and bounded file loading.
- `ui/server/src/skills/path-safety.ts` — GitHub URL validation, archive-entry validation, and local-directory allow-list checks.
- `ui/server/src/skills/pack-installer.ts` — public GitHub archive installation and controlled local-pack import, with revision locking.
- `ui/server/src/skills/registry.ts` — per-workspace Pack discovery, conflict handling, compatibility classification, and index cache.
- `ui/server/src/skills/builtin.ts` — the existing “提示词优化大师” prompt-only Skill as a built-in manifest, preserving the current preset without making it an external executable.
- `ui/server/src/skills/skill-command.ts` — explicit `/skill-name` and `/pack-id:skill-name` parsing plus argument extraction.
- `ui/server/src/skills/compile-cache.ts` — deterministic input hash and in-memory/workspace cache records.
- `ui/server/src/skills/compiler.ts` — model capability checks, bounded Skill context assembly, structured-result parsing/retry, negative-prompt handling, and compile metadata.
- `ui/server/src/skills/settings.ts` — workspace-local `skill-settings.json` read/write for the default compiler model id.
- `ui/server/src/skills/fixtures/h3-prompt-writing/SKILL.md` — small checked-in parser/contract fixture derived from the public H3 Skill shape (not used as the live repository copy).
- `ui/server/src/skills/fixtures/h3-prompt-writing/references/base-en.txt` — fixture reference.
- `ui/server/src/skills/fixtures/h3-prompt-writing/references/ref-en.txt` — fixture reference.
- `ui/server/src/skills/skill-parser.test.ts` — frontmatter, references, limits, and path-safety tests.
- `ui/server/src/skills/pack-installer.test.ts` — GitHub/local install, revision lock, archive traversal, and non-execution tests.
- `ui/server/src/skills/registry.test.ts` — discovery, conflict, capability classification, built-in Skill, and cache invalidation tests.
- `ui/server/src/skills/skill-command.test.ts` — explicit invocation and argument tests.
- `ui/server/src/skills/compiler.test.ts` — compiler contract, Vision requirement, retry, cache, and typed-error tests.
- `ui/server/src/skills/settings.test.ts` — workspace settings persistence and malformed-file fallback tests.

**Create (server routes):**

- `ui/server/src/routes/skills.ts` — `GET /api/skills`, `POST /api/skills/packs`, `POST /api/skills/compile-preview`, and additive `GET/PUT /api/skills/settings` handlers.
- `ui/server/src/routes/skills.test.ts` — route-level tests using injected registry/installer/compiler dependencies.

**Create (web):**

- `ui/web/src/api/skills.ts` — typed client functions for listing Skills, installing Packs, reading/updating compiler settings, and compile preview.

**Modify (server):**

- `ui/server/src/index.ts` — instantiate/register the workspace Skill routes before Generate routes and share the registry/compiler instance.
- `ui/server/src/routes/generate.ts` — recognize explicit Skill payloads, compile before any media execution, replace only the effective media prompt, preserve source lineage, and return compile metadata/errors.
- `ui/server/src/llm/types.ts` — add the optional `negative_prompt` transport field to `LLMRequest`.
- `ui/server/src/llm/provider-runtime-support-bodies.ts` — pass `negative_prompt` only on media payloads and keep chat/text request behavior unchanged.
- `ui/server/src/routes/generate.test.ts` — no-Skill regression, compile-before-media, failure short-circuit, mode filtering, metadata, SSE, and cancellation tests.

**Modify (web):**

- `ui/web/src/components/nodes/generate-node-model.ts` — add persisted Skill fields, explicit-command helpers, compile metadata types, payload construction, and asset provenance fields.
- `ui/web/src/components/nodes/GenerateNode.tsx` — load/filter Skill options, add selector/arguments/preview UI for image/video modes, persist selection and compiled result, and send Skill data with generation requests.
- `ui/web/src/components/nodes/generateNode.test.ts` — payload, `/skill` precedence, mode filtering, compiled metadata persistence, and no-Skill compatibility assertions.
- `ui/web/src/pages/canvasPageMigration.test.ts` — source contract assertions that Skill controls are canvas-only and the novel workbench is not wired to them.

**Do not modify:** `restored-src` Skill execution internals, novel workbench/Agent/MCP routes, or existing media provider adapters beyond the narrow `negative_prompt` body passthrough.

---

### Task 1: Define Skill contracts and safe Markdown/YAML/reference parsing

**Files:**
- Create: `ui/server/src/skills/types.ts`
- Create: `ui/server/src/skills/frontmatter.ts`
- Create: `ui/server/src/skills/references.ts`
- Create: `ui/server/src/skills/path-safety.ts`
- Create: `ui/server/src/skills/fixtures/h3-prompt-writing/SKILL.md`
- Create: `ui/server/src/skills/fixtures/h3-prompt-writing/references/base-en.txt`
- Create: `ui/server/src/skills/fixtures/h3-prompt-writing/references/ref-en.txt`
- Test: `ui/server/src/skills/skill-parser.test.ts`

- [ ] **Step 1: Write the failing contract tests.**

Add tests that create temporary Pack directories and assert the public functions have these exact behaviors:

```ts
const parsed = parseSkillDocument(await readFile(fixtureSkill, 'utf8'), fixtureSkill)
expect(parsed.manifest.name).toBe('h3-prompt-writing')
expect(parsed.manifest.userInvocable).toBe(true)
expect(parsed.references).toEqual(['references/base-en.txt', 'references/ref-en.txt'])

const loaded = await loadSkillReferences(skillRoot, parsed.references)
expect(loaded.map(item => item.relativePath)).toEqual(parsed.references)
await expect(loadSkillReferences(skillRoot, ['../outside.txt'])).rejects.toMatchObject({ code: 'SKILL_PATH_ESCAPE' })
```

Also cover malformed YAML (`SKILL_FRONTMATTER_INVALID`), a missing closing delimiter (`SKILL_FRONTMATTER_MISSING`), a 256 KiB `SKILL.md`, a 512 KiB reference, a 2 MiB aggregate, and a symlink whose real path leaves the Skill root. The tests must prove scripts are never imported or executed by placing a throwing `.ts` file next to the fixture and never calling a dynamic loader.

- [ ] **Step 2: Run the focused test and verify it fails for missing modules.**

Run: `cd ui/server && bun test src/skills/skill-parser.test.ts`

Expected: FAIL with module-not-found or missing-export errors for `./frontmatter`, `./references`, and `./types`.

- [ ] **Step 3: Implement the shared types and parser.**

Define the following contracts in `types.ts` and use them in every later task:

```ts
export type CanvasMediaMode = 'chat' | 'vision' | 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video'
export type SkillCompatibility = 'prompt_ready' | 'prompt_partial' | 'workflow_only' | 'invalid'
export type SkillArgumentSpec = { name: string; description?: string; required?: boolean; default?: string }
export type SkillManifest = {
  packId: string; directoryName: string; name: string; description: string
  whenToUse?: string; arguments: SkillArgumentSpec[]; argumentHint?: string
  userInvocable: boolean; triggerWords: string[]; mediaModes: CanvasMediaMode[]
  compatibility: SkillCompatibility; compatibilityReason?: string
  revision: string; sourceUrl?: string; rootDir: string; body: string; references: string[]
  displayName?: string; shortDescription?: string; defaultPrompt?: string
}
export type PromptCompileResult = {
  skill_name: string; skill_version: string; mode: CanvasMediaMode; prompt: string
  negative_prompt: string; parameters: Record<string, string | number | boolean>
  references_used: string[]; warnings: string[]
}
export type PromptCompileInput = {
  packId?: string; skillName?: string; rawPrompt: string; mode: CanvasMediaMode
  incomingAssets: Array<{ type: 'image' | 'prompt'; url?: string; content?: string; source_asset_ids?: number[] }>
  nodeParams: Record<string, unknown>; arguments?: Record<string, string>
  compilerModelId?: number; activeWorkspace: string
}
```

`parseSkillDocument(raw, filePath)` must split only the first `---` frontmatter block, call `yaml.parse`, normalize both kebab-case and camel-case accepted fields, infer the directory name separately from `name`, and return explicit references extracted from Markdown links/code mentions under `references/`. `readOpenAIMetadata` may parse only `display_name`, `short_description`, and `default_prompt`.

- [ ] **Step 4: Implement bounded reference and path validation.**

Implement `assertSafeRelativeSkillPath(root, relativePath)`, `loadSkillReferences(root, paths)`, and `validateSkillPackArchiveEntry(name, type, size)`. Resolve with `realpath`, reject absolute paths, `..` escapes, symlinks whose target is outside `root`, files over the per-file limit, and total bytes over 2 MiB. Read only explicit paths and return `{ relativePath, content, bytes }[]` in deterministic sorted order.

- [ ] **Step 5: Run parser tests to verify the minimal implementation passes.**

Run: `cd ui/server && bun test src/skills/skill-parser.test.ts`

Expected: PASS, including every limit, malformed-frontmatter, and path-escape assertion.

- [ ] **Step 6: Commit the parser unit.**

```bash
git add ui/server/src/skills/types.ts ui/server/src/skills/frontmatter.ts ui/server/src/skills/references.ts ui/server/src/skills/path-safety.ts ui/server/src/skills/fixtures ui/server/src/skills/skill-parser.test.ts
git commit -m "feat: add safe canvas skill parsing contracts"
```

### Task 2: Install public GitHub and controlled local Skill Packs

**Files:**
- Modify: `ui/server/src/skills/path-safety.ts`
- Create: `ui/server/src/skills/pack-installer.ts`
- Test: `ui/server/src/skills/pack-installer.test.ts`

- [ ] **Step 1: Write failing installer tests.**

Mock `fetch` for `api.github.com/repos/acme/demo/commits/HEAD` and the matching codeload ZIP. Assert a successful install writes only the selected SHA under `.mangaforge/skill-packs/demo/<sha>/`, returns the source URL and SHA, and discovers two `skills/*/SKILL.md` candidates. Add assertions for rejection of `http://`, non-GitHub hosts, query/fragment injection, a ZIP entry `../../escape`, an entry symlink, a 50 MiB archive, a local path outside an explicitly supplied allow-list, and a failed download leaving a previous revision directory untouched. Include a fixture `postinstall.ts` whose contents would throw if executed; the test passes when it remains a file and no process is spawned.

- [ ] **Step 2: Run the installer test to confirm failure.**

Run: `cd ui/server && bun test src/skills/pack-installer.test.ts`

Expected: FAIL with missing `installGitHubSkillPack`/`installLocalSkillPack` exports.

- [ ] **Step 3: Implement immutable GitHub revision installation.**

Use `parsePublicGitHubUrl(url)` to accept exactly `https://github.com/<owner>/<repo>` with an optional `.git` suffix and no path/query/fragment. Fetch the public HEAD commit SHA, download `https://codeload.github.com/<owner>/<repo>/zip/<sha>`, enforce the archive-size cap, validate every ZIP entry before extraction, and extract with `jszip` into a temporary directory inside the workspace. Rename the temporary directory to the SHA only after all files pass checks; write `pack.json` containing `{ id, sourceUrl, owner, repo, revision, installedAt, status: 'installed' }`. Never call a shell, Git, package manager, or file from the repository.

- [ ] **Step 4: Implement controlled local import.**

Require the caller to pass an allow-listed root directory. Resolve both source and destination with `realpath`, copy only regular files/directories beneath the selected source, reject symlink escapes and archives, assign revision `local-<sha256(file-list-and-bytes)>`, and write the same `pack.json` schema. Re-importing the same revision returns the existing record without rewriting it.

- [ ] **Step 5: Run installer tests and verify all security assertions pass.**

Run: `cd ui/server && bun test src/skills/pack-installer.test.ts`

Expected: PASS with no spawned subprocess and no destination outside the workspace.

- [ ] **Step 6: Commit the installer unit.**

```bash
git add ui/server/src/skills/path-safety.ts ui/server/src/skills/pack-installer.ts ui/server/src/skills/pack-installer.test.ts
git commit -m "feat: install revision-locked skill packs safely"
```

### Task 3: Build the workspace Skill Registry and capability classification

**Files:**
- Create: `ui/server/src/skills/builtin.ts`
- Create: `ui/server/src/skills/registry.ts`
- Test: `ui/server/src/skills/registry.test.ts`

- [ ] **Step 1: Write failing registry tests.**

Create a temporary workspace containing an installed Pack with `skills/h3-prompt-writing/SKILL.md`, a second Pack with the same Skill name, a `workflow-only` Skill containing `allowed-tools`/`hooks`, and an invalid Skill. Assert:

```ts
const list = await registry.list()
expect(list.map(skill => skill.compatibility)).toEqual(expect.arrayContaining(['prompt_ready', 'workflow_only', 'invalid']))
expect(list.filter(skill => skill.name === 'same-name')).toHaveLength(2)
expect(registry.resolve({ name: 'same-name' })).toThrow('SKILL_AMBIGUOUS')
expect(registry.resolve({ packId: 'pack-a', name: 'same-name' }).packId).toBe('pack-a')
```

Verify `h3-prompt-writing` is `prompt_ready` for `text_to_video`/`image_to_video`, is not returned as ready for `text_to_image`, and that the built-in `prompt-optimizer` remains available for image and video modes. Verify a file mtime change invalidates the cached index, and a Pack revision change creates a new record instead of replacing the old revision.

- [ ] **Step 2: Run registry tests and observe missing implementation failures.**

Run: `cd ui/server && bun test src/skills/registry.test.ts`

Expected: FAIL with missing `createSkillRegistry`, `builtinPromptSkill`, and `classifySkillCompatibility` exports.

- [ ] **Step 3: Implement built-in and external manifest indexing.**

`builtin.ts` must expose a manifest with `packId: 'builtin'`, stable revision `builtin-v1`, `name: 'prompt-optimizer'`, `mediaModes: ['text_to_image','image_to_image','text_to_video','image_to_video']`, and the existing two-line prompt-engineer behavior. `registry.ts` must scan `.mangaforge/skills`, `.claude/skills`, `.codex/skills` only when explicitly enabled, and installed Pack revisions under `.mangaforge/skill-packs/<pack>/<revision>/skills/*/SKILL.md`. Preserve all revisions, key by `(packId, name)`, and expose `list({ mode?, readyOnly? })` plus `resolve({ packId?, name })`.

- [ ] **Step 4: Implement deterministic capability classification.**

Use this precedence: `metadata.media_modes`/`mediaModes` first; explicit prompt-only markers second; mode keywords in description/body third; otherwise `prompt_partial`. Mark Skills that declare `allowed-tools`, `hooks`, `shell`, `agent`, `context: fork`, or multi-stage workflow terms as `prompt_partial`/`workflow_only` with a human-readable reason. A Skill is `prompt_ready` only when its body is self-contained prompt instructions, references are safe, and the requested mode is listed. Do not use trigger words to auto-select a Skill.

- [ ] **Step 5: Run registry tests to green.**

Run: `cd ui/server && bun test src/skills/registry.test.ts`

Expected: PASS for discovery, duplicate handling, built-in availability, mode filtering, invalid state, and revision cache invalidation.

- [ ] **Step 6: Commit registry behavior.**

```bash
git add ui/server/src/skills/builtin.ts ui/server/src/skills/registry.ts ui/server/src/skills/registry.test.ts
git commit -m "feat: index canvas prompt skills by capability"
```

### Task 4: Add explicit invocation parsing, deterministic hashing, and the prompt compiler

**Files:**
- Create: `ui/server/src/skills/skill-command.ts`
- Create: `ui/server/src/skills/compile-cache.ts`
- Create: `ui/server/src/skills/compiler.ts`
- Create: `ui/server/src/skills/settings.ts`
- Test: `ui/server/src/skills/skill-command.test.ts`
- Test: `ui/server/src/skills/compiler.test.ts`
- Test: `ui/server/src/skills/settings.test.ts`

- [ ] **Step 1: Write failing command, hash, compiler, and settings tests.**

Cover these exact command cases:

```ts
expect(parseSkillCommand('/h3-prompt-writing hero closeup')).toEqual({ name: 'h3-prompt-writing', argumentsText: 'hero closeup' })
expect(parseSkillCommand('/pack-a:h3-prompt-writing hero')).toEqual({ packId: 'pack-a', name: 'h3-prompt-writing', argumentsText: 'hero' })
expect(parseSkillCommand('draw a hero')).toBeNull()
```

Mock `executeWithRuntimeModel` and assert compiler input includes the Skill body, exactly the two references, raw prompt, text assets, image parts, mode, and only whitelisted node params. Assert a non-Vision compiler model rejects image inputs with `SKILL_COMPILER_VISION_REQUIRED`; a model without chat capability rejects with `SKILL_COMPILER_MODEL_INCOMPATIBLE`; an incompatible Skill returns `SKILL_MODE_INCOMPATIBLE`; missing references returns `SKILL_REFERENCE_MISSING`; empty prompt returns `SKILL_RESULT_EMPTY`; and malformed model output triggers exactly one JSON repair call before `SKILL_RESULT_INVALID`.

Assert the hash is stable under object-key ordering but changes when Pack revision, raw input, mode, asset lineage, Skill arguments, or `size`/camera parameters change. Assert a cache hit makes zero compiler calls and a cache miss makes one. Settings tests must prove a missing/malformed `skill-settings.json` yields `{ skill_compiler_model_id: null }` and valid writes are atomic.

- [ ] **Step 2: Run focused tests to capture expected failures.**

Run: `cd ui/server && bun test src/skills/skill-command.test.ts src/skills/compiler.test.ts src/skills/settings.test.ts`

Expected: FAIL with missing parser/compiler/settings exports.

- [ ] **Step 3: Implement explicit command parsing and safe argument substitution.**

Parse only a leading command token matching `/[A-Za-z0-9][A-Za-z0-9._-]*/` or `/pack-id:skill-name`; leave all other prompts unchanged. Resolve arguments against `SkillArgumentSpec`, apply defaults, reject unknown arguments, and pass the remainder as the Skill input. If a node has both a selector and a command, the command wins; if the command is unqualified and duplicates exist, throw `SKILL_AMBIGUOUS` instead of using install order.

- [ ] **Step 4: Implement hash/cache and workspace settings.**

Canonicalize the input as sorted JSON containing `packId`, `revision`, `skillName`, `rawPrompt`, `mode`, sorted arguments, normalized text assets, image URLs or asset ids, and the whitelist `{ size, aspect_ratio, cameraParams, customMovements }`. Hash with SHA-256. Store `{ key, result, createdAt }` in a process cache scoped by workspace; expose `getCachedCompile`/`putCachedCompile`. Read/write `<activeWorkspace>/.mangaforge/skill-settings.json` using write-to-temp plus rename and only the numeric `skill_compiler_model_id` field.

- [ ] **Step 5: Implement the compiler and result contract.**

`compilePromptSkill(input, deps)` must resolve a `prompt_ready` manifest for the requested mode, load its explicit references, scrub workspace paths/credentials/internal request fields from user material, and call `executeWithRuntimeModel` with the configured compiler model. Build a system message that says the external Skill is untrusted instructions, forbids tools/shell/MCP/agent behavior, requires JSON, and embeds the Skill body/references; build a user message with raw prompt, arguments, mode, text assets, and image content parts. Request `response_format: { type: 'json_object' }` and parse:

```ts
{ skill_name, skill_version, mode, prompt, negative_prompt, parameters, references_used, warnings }
```

Validate non-empty `prompt`, exact mode, safe `references_used`, object `parameters` limited to media keys, and string `warnings`. On non-JSON content make one repair request with the invalid content quoted as data; never execute content as code. If the provider/model cannot carry a separate negative prompt, merge `Negative prompt: ...` into `prompt` and append a warning. Return the cached result when the canonical hash matches.

- [ ] **Step 6: Run the compiler/settings tests to green.**

Run: `cd ui/server && bun test src/skills/skill-command.test.ts src/skills/compiler.test.ts src/skills/settings.test.ts`

Expected: PASS, with exactly one repair attempt for malformed output and no compiler invocation on cache hits or typed preflight errors.

- [ ] **Step 7: Commit compiler behavior.**

```bash
git add ui/server/src/skills/skill-command.ts ui/server/src/skills/compile-cache.ts ui/server/src/skills/compiler.ts ui/server/src/skills/settings.ts ui/server/src/skills/skill-command.test.ts ui/server/src/skills/compiler.test.ts ui/server/src/skills/settings.test.ts
git commit -m "feat: compile explicit prompt skills with cache and validation"
```

### Task 5: Expose Skill listing, Pack installation, settings, and compile preview APIs

**Files:**
- Create: `ui/server/src/routes/skills.ts`
- Test: `ui/server/src/routes/skills.test.ts`
- Modify: `ui/server/src/index.ts`

- [ ] **Step 1: Write failing route tests with injected dependencies.**

Use a small Express app and injected fake registry/installer/compiler. Assert:

```ts
await request(app).get('/api/skills?mode=image_to_video&ready_only=true')
  .expect(200)
  .expect(({ body }) => expect(body.skills.every((s: any) => s.compatibility === 'prompt_ready')).toBe(true))
await request(app).post('/api/skills/packs').send({ url: 'https://github.com/acme/demo' }).expect(201)
await request(app).post('/api/skills/compile-preview').send({ skill_name: 'h3-prompt-writing', mode: 'image_to_video', prompt: 'hero' }).expect(200)
```

Also assert invalid URL is 400, installer failure is 502 without changing the registry, missing compiler model is 409 with `SKILL_COMPILER_MODEL_REQUIRED`, and compile errors expose `error_code` plus a diagnostic message. `GET/PUT /api/skills/settings` must round-trip the default model id.

- [ ] **Step 2: Run the route tests to verify missing route registration.**

Run: `cd ui/server && bun test src/routes/skills.test.ts`

Expected: FAIL because the route module and `index.ts` registration do not exist.

- [ ] **Step 3: Implement route handlers and dependency boundaries.**

Export `registerSkillRoutes(app, getWorkspace, deps)` where `deps` provides `getRegistry`, `installGitHubSkillPack`, `compilePromptSkill`, `readSkillSettings`, and `writeSkillSettings`. `GET /api/skills` accepts `mode` and `ready_only`, returning `{ skills, packs, settings }` with body text omitted. `POST /api/skills/packs` accepts only `{ url }` (and an explicitly allow-listed `{ local_path }` variant), installs and invalidates the workspace registry, and returns 201 with Pack and discovered Skill summaries. `POST /api/skills/compile-preview` validates `skill_name`, `pack_id`, `prompt`, `mode`, assets, arguments, and compiler model id, invokes the compiler, and returns `{ result, cache_key, cached }`.

- [ ] **Step 4: Register one per-workspace runtime in the server entry point.**

In `ui/server/src/index.ts`, create the Skill registry lazily from `getWorkspace`, create the compiler with that registry and `executeWithRuntimeModel`, call `registerSkillRoutes(app, getWorkspace, skillDeps)`, and pass the same `skillRuntime` into `registerGenerateRoutes`. Do not import anything from `restored-src` or initialize Skill code from the novel lifecycle.

- [ ] **Step 5: Run route and server build checks.**

Run: `cd ui/server && bun test src/routes/skills.test.ts && bun run build`

Expected: PASS for route tests and a successful Bun server bundle.

- [ ] **Step 6: Commit the API surface.**

```bash
git add ui/server/src/routes/skills.ts ui/server/src/routes/skills.test.ts ui/server/src/index.ts
git commit -m "feat: expose canvas skill pack and preview APIs"
```

### Task 6: Integrate Skill compilation into `/api/generate` without changing no-Skill behavior

**Files:**
- Modify: `ui/server/src/routes/generate.ts`
- Modify: `ui/server/src/llm/types.ts`
- Modify: `ui/server/src/llm/provider-runtime-support-bodies.ts`
- Test: `ui/server/src/routes/generate.test.ts`

- [ ] **Step 1: Add failing Generate-route regression tests.**

Extend the existing route tests with injected `execute` and `compilePromptSkill` fakes. Assert that a payload with no `skill_name`, no leading command, and the current messages reaches `execute` with the exact old request shape. Assert that a selected Skill causes one compiler call before `execute`, `request.prompt` and the media user text become the compiled prompt, `request.negative_prompt` is present, and the response contains `skill_name`, `skill_revision`, `compiled_prompt`, `compiled_negative_prompt`, `compiled_references`, `compiled_input_hash`, and warnings. Assert compiler failure returns 422 and `execute` call count remains zero. Assert T2I with H3 is rejected before media execution, duplicate unqualified commands return 409, and async SSE success/error/cancel still uses the existing task manager.

- [ ] **Step 2: Run the Generate-route tests to establish failures.**

Run: `cd ui/server && bun test src/routes/generate.test.ts`

Expected: FAIL for missing Skill dependency injection and missing compile metadata.

- [ ] **Step 3: Add the narrow request/response transport fields.**

Add `negative_prompt?: string` to `LLMRequest`. In the media branch of `toOpenAIBody`, include `negative_prompt` through the passthrough set; leave it out of chat/text payloads. Ensure route DSL templates can use `{{negative_prompt}}`. Keep local asset conversion and all provider selection logic untouched.

- [ ] **Step 4: Add preflight compilation to GenerateRoute.**

Parse the request's explicit Skill fields (`skill_name`/`skillName`, `skill_pack_id`/`skillPackId`, `skill_arguments`, `skill_compiler_model_id`) and the leading `/skill` command from the user prompt. If none are present, execute the existing path with no added fields. If present, build `PromptCompileInput` from the normalized request, incoming assets, mode, safe media params, and active workspace; await the compiler before resolving/executing any provider or Comfy task. On success, clone the request, set `prompt` and the final user text to the compiled prompt, add `negative_prompt`, and attach an internal `skillCompile` payload for response/audit only. On failure return `422 { error, detail, error_code }` and do not create a task or media call.

- [ ] **Step 5: Preserve ComfyUI boundaries and result provenance.**

If a Comfy workflow has a declared `compiled_prompt`/`negative_prompt` input mapping, inject the compiled values into that mapping. If it has no mapping, reject a Skill-enabled execution with `SKILL_COMFY_MAPPING_REQUIRED` and explain that the user must bind the fields manually; never guess a workflow node. Include raw prompt, compiled prompt/negative prompt, Pack source/revision, compiler model id, references, warnings, and input hash in `responsePayload` and `result`, while preserving `source_asset_ids`.

- [ ] **Step 6: Run all server generation tests and verify no-Skill equality.**

Run: `cd ui/server && bun test src/routes/generate.test.ts src/llm/provider-runtime.test.ts`

Expected: PASS; no-Skill snapshots are unchanged, compiler failures make zero provider calls, and media bodies contain compiled prompts only when a Skill was explicitly selected.

- [ ] **Step 7: Commit Generate integration.**

```bash
git add ui/server/src/routes/generate.ts ui/server/src/routes/generate.test.ts ui/server/src/llm/types.ts ui/server/src/llm/provider-runtime-support-bodies.ts
git commit -m "feat: compile canvas skills before media generation"
```

### Task 7: Add typed web API helpers and GenerateNode Skill controls

**Files:**
- Create: `ui/web/src/api/skills.ts`
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Test: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: Write failing web model/API tests.**

Add pure assertions for `buildGenerateNodeRequestPayload` and `buildGenerateNodeAssetPayload`:

```ts
expect(buildGenerateNodeRequestPayload({ ...base, skillName: 'selected', skillPackId: 'pack-a' })).toMatchObject({
  skill_name: 'selected', skill_pack_id: 'pack-a', skill_compile_enabled: true,
})
expect(buildGenerateNodeRequestPayload({ ...base, prompt: '/h3-prompt-writing hero' }).skill_name).toBeUndefined()
expect(parseCanvasSkillCommand('/pack-a:h3-prompt-writing hero')).toEqual({ packId: 'pack-a', name: 'h3-prompt-writing', argumentsText: 'hero' })
```

Assert asset data carries `source_prompt`, `compiled_prompt`, `compiled_negative_prompt`, `skill_pack_id`, `skill_name`, `skill_revision`, `compiled_references`, `compiled_input_hash`, and warnings. Keep the original prompt unchanged when a compile result exists. Add source-contract assertions that the selector is rendered only for `text_to_image`, `image_to_image`, `text_to_video`, and `image_to_video`, and that no novel page imports `api/skills`.

- [ ] **Step 2: Run web tests to capture missing exports.**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts`

Expected: FAIL for missing Skill fields/helpers/API module.

- [ ] **Step 3: Implement typed API helpers and pure payload helpers.**

`ui/web/src/api/skills.ts` must export `listSkills(mode?, readyOnly?)`, `installSkillPack(url)`, `compileSkillPreview(input)`, `readSkillSettings()`, and `writeSkillSettings(modelId)`, all using the existing `apiClient`. Add web types matching the server JSON. Extend `buildGenerateNodeRequestPayload` with optional `skillPackId`, `skillName`, `skillRevision`, `skillCompileEnabled`, `skillCompilerModelId`, `skillArguments`, and `compiledInputHash`; emit snake_case fields expected by the route while omitting undefined values. Add `parseCanvasSkillCommand` with the same leading-token grammar as the server for UI previews, and extend the asset payload input with compile metadata.

- [ ] **Step 4: Add node state, loading, filtering, and persistence.**

In `GenerateNode.tsx`, load `listSkills(mode, true)` whenever the selected media mode changes, load settings once, and keep state initialized from `data.skillPackId`, `data.skillName`, `data.skillRevision`, `data.skillCompileEnabled`, `data.skillCompilerModelId`, `data.skillArguments`, and compile fields. Show only `prompt_ready` Skills compatible with the current mode in the default selector; keep the selected incompatible Skill visible with a red compatibility tag and prevent execution. Do not auto-select based on trigger words. Add an optional compiler-model selector filtered to chat-capable models; use the workspace default when no node override exists.

- [ ] **Step 5: Add explicit Skill selection, arguments, and preview UI.**

Add a `提示词 Skill` section to the existing `NodeConfigToolbar` generation panel for image/video modes. Render Pack prefix, display name, compatibility, locked revision, argument inputs from the manifest, a clear/default option, and a `预览编译提示词` button. Detect a leading `/skill` in the prompt and show it as the effective Skill; command selection takes precedence over the dropdown. Preview calls `/api/skills/compile-preview` with the same incoming text/image assets and whitelisted node parameters used by `buildPayload`, stores the result/hash, and displays collapsible compiled positive/negative prompts, references, warnings, and the selected revision. Disable preview/run when no compiler model is configured and show the typed server error.

- [ ] **Step 6: Send and persist compile data while preserving the original prompt.**

Pass Skill fields and cached compile result in `buildPayload`. On run, reuse the preview when the server returns the same hash; otherwise let `/api/generate` compile once. On success, merge compile metadata into `result`, node data, downstream `incoming_data`, and `buildGenerateNodeAssetPayload`; never overwrite the editable `prompt` or existing media/provider parameters. Clear compiled fields immediately when prompt, mode, Skill, arguments, incoming asset lineage, camera controls, or compiler model changes.

- [ ] **Step 7: Run web tests and build.**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts && bun run build`

Expected: PASS with no novel-workbench wiring and a successful Vite production build.

- [ ] **Step 8: Commit the GenerateNode UI.**

```bash
git add ui/web/src/api/skills.ts ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat: add canvas prompt skill selector and preview"
```

### Task 8: Verify MiniMax H3 and workflow Skill boundaries end-to-end

**Files:**
- Create: `scripts/accept-h3-prompt-skill.mjs`
- Modify: `ui/server/src/skills/fixtures/h3-prompt-writing/SKILL.md` only if the public fixture contract changes during verification
- Test: `ui/server/src/skills/compiler.test.ts`
- Test: `ui/server/src/routes/generate.test.ts`

- [ ] **Step 1: Add deterministic H3 fixture assertions.**

Using the checked-in fixture and a fake compiler response, assert each mode `text_to_video`, `image_to_video`, and the H3 aliases `T2VA`, `I2VA`, `FL2VA`, `L2VA`, `Ref2VA` maps to the expected normalized MangaForge mode and includes both `references/base-en.txt` and `references/ref-en.txt`. Assert the returned prompt preserves the Skill's exact field order, labels, shot-duration/time format, and negative prompt string inside the JSON result.

- [ ] **Step 2: Add an opt-in live acceptance script.**

`accept-h3-prompt-skill.mjs` must use the running local API only, install `https://github.com/MiniMax-AI/MiniMax-H3`, list `h3-prompt-writing`, compile one no-reference T2V prompt and one I2V prompt with a local asset id, and assert the response has a non-empty prompt, both references, a locked 40-character revision, and a stable hash on a repeated preview. It must print the Pack revision and references but redact all keys. Require `MANGAFORGE_H3_E2E=1`; without it exit 0 with “skipped” so normal CI never spends model credits.

- [ ] **Step 3: Exercise workflow-only Skill handling.**

Against the installed H3 Pack or a fixture Pack containing a Hub/tool workflow Skill, assert `GET /api/skills?mode=text_to_video&ready_only=true` excludes it, the normal list includes `workflow_only` or `prompt_partial` with a compatibility reason, and selecting it in GenerateNode cannot invoke Hub tools or create a media task.

- [ ] **Step 4: Run the opt-in acceptance command when credentials/models are available.**

Run: `MANGAFORGE_H3_E2E=1 node scripts/accept-h3-prompt-skill.mjs`

Expected: PASS after installing the real public MiniMax H3 revision; if the API/model is unavailable the script reports the typed configuration/network error and does not alter the existing installed revision.

- [ ] **Step 5: Commit the acceptance harness.**

```bash
git add scripts/accept-h3-prompt-skill.mjs ui/server/src/skills/fixtures ui/server/src/skills/compiler.test.ts ui/server/src/routes/generate.test.ts
git commit -m "test: accept MiniMax H3 prompt skill pack"
```

### Task 9: Full verification, regression review, and handoff

**Files:**
- Modify only files listed in Tasks 1–8 if a test exposes a concrete defect.
- Test: all server and web test files touched above.

- [ ] **Step 1: Run focused server and web suites.**

```bash
cd ui/server && bun test src/skills src/routes/skills.test.ts src/routes/generate.test.ts src/llm/provider-runtime.test.ts
cd ../web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
```

Expected: PASS with no changes to the six user-owned dirty files listed in the working-tree handoff.

- [ ] **Step 2: Run production builds.**

```bash
cd ui/server && bun run build
cd ../web && bun run build
```

Expected: both Bun and Vite builds complete without TypeScript/module errors.

- [ ] **Step 3: Run the broader regression suites.**

```bash
cd ui/server && bun test src/llm src/routes src/mcp src/novel
cd ../web && bun test src/components/nodes src/stores src/pages/canvasPageMigration.test.ts
```

Expected: existing MCP, novel, canvas, provider, SSE, cancellation, and asset-lineage tests remain green. Any failure must be fixed in the Skill integration boundary rather than by weakening an existing test.

- [ ] **Step 4: Perform a security and scope review.**

Run `rg -n "child_process|exec\(|spawn\(|shell|allowed-tools|hooks|MCP|Task|Agent" ui/server/src/skills ui/server/src/routes/skills.ts` and confirm matches are parser/classification strings or tests only. Confirm `rg -n "api/skills|skillPackId|skillName" ui/web/src/pages/novel* ui/server/src/novel*` returns no Skill integration. Confirm no command invokes `restored-src` loaders or external repository scripts.

- [ ] **Step 5: Record verification evidence and commit only implementation changes.**

Review `git diff --stat`, ensure the six pre-existing user modifications remain unstaged, then commit the final implementation with:

```bash
git add ui/server/src/skills ui/server/src/routes/skills.ts ui/server/src/routes/skills.test.ts ui/server/src/routes/generate.ts ui/server/src/routes/generate.test.ts ui/server/src/llm/types.ts ui/server/src/llm/provider-runtime-support-bodies.ts ui/server/src/index.ts ui/web/src/api/skills.ts ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts scripts/accept-h3-prompt-skill.mjs
git commit -m "feat: support prompt skill packs in canvas media nodes"
```

Expected final state: a public GitHub Pack can be installed and revision-locked; `h3-prompt-writing` compiles in T2V/I2V with its references; workflow/tool Skills are indexed but not executed; no-Skill generation is unchanged; and novel/MCP code paths are untouched.

---

## Self-review against the confirmed specification

- Pack installation, revision locking, public GitHub/local boundaries, archive/path/symlink/size checks, and non-execution are covered by Tasks 1–2.
- SKILL.md frontmatter, `references/`, optional `agents/openai.yaml`, parameters, explicit invocation, duplicate names, and capability states are covered by Tasks 1, 3, and 4.
- Prompt compiler model selection, Vision requirement, structured `PromptCompileResult`, one JSON retry, negative-prompt fallback, hash/cache, input invalidation, and typed errors are covered by Task 4.
- `/api/skills`, Pack installation, compile preview, workspace compiler settings, and `/api/generate` preflight integration are covered by Tasks 5–6.
- GenerateNode selector, compatibility display, `/skill-name` precedence, preview reuse, persistence, result/asset provenance, and original-prompt preservation are covered by Task 7.
- H3 real acceptance, workflow-only visibility, no implicit keyword trigger, Comfy mapping boundary, SSE/cancel/lineage regression, builds, and novel/MCP isolation are covered by Tasks 6, 8, and 9.
- The plan contains no shell/tool execution path for external Skills and does not modify the Claude Code/restored-src executor.

