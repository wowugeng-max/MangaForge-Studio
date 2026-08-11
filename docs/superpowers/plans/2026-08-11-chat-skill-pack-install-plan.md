# Chat Skill Direct Output and GitHub Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Canvas GenerateNode so Chat can compile a selected image/video prompt Skill once into an inspectable text result, while exposing the existing public GitHub Skill Pack installer in the same panel.

**Architecture:** Keep compilation and installation on the existing typed `/api/skills/compile-preview` and `/api/skills/packs` contracts. Put target-mode normalization, compatibility decisions, request/result shaping, and install-selection decisions in pure GenerateNode model helpers; keep React state, network calls, and downstream effects in `GenerateNode.tsx`. Chat + Skill exits before the ordinary Provider/SSE `/api/generate` path, while Chat without a Skill remains on the existing path.

**Tech Stack:** React 18, TypeScript, Ant Design, React Flow, Zustand, Bun test, existing Canvas Skill API and Express server routes.

---

### Task 1: Add pure prompt-target and Chat-result model helpers

**Files:**
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`

- [ ] **Step 1: Write failing tests for target-mode normalization and effective mode**

Add tests that describe the public helper contract:

```ts
test('normalizes persisted Chat prompt target aliases and invalid values', async () => {
  const model = await loadGenerateNodeReferenceApi()
  expect(model.normalizeGenerateNodeSkillTargetMode('image_to_video')).toBe('image_to_video')
  expect(model.normalizeGenerateNodeSkillTargetMode({ skill_target_mode: 'text_to_video' })).toBe('text_to_video')
  expect(model.normalizeGenerateNodeSkillTargetMode('chat')).toBe('text_to_image')
  expect(model.normalizeGenerateNodeSkillTargetMode(undefined)).toBe('text_to_image')
})

test('uses Chat target mode only for Skill compilation', async () => {
  const model = await loadGenerateNodeReferenceApi()
  expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'chat', skillTargetMode: 'image_to_video' })).toBe('image_to_video')
  expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'text_to_video', skillTargetMode: 'image_to_image' })).toBe('text_to_video')
  expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'vision', skillTargetMode: 'image_to_image' })).toBeUndefined()
})
```

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: FAIL because the target-mode helpers are not exported yet.

- [ ] **Step 3: Implement the minimal target-mode helpers**

Define and export one canonical type and option list in `generate-node-model.ts`:

```ts
export type GenerateNodeSkillTargetMode = 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video'
export const GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS = [
  { label: '文生图', value: 'text_to_image' },
  { label: '图生图', value: 'image_to_image' },
  { label: '文生视频', value: 'text_to_video' },
  { label: '图生视频', value: 'image_to_video' },
] as const
export function normalizeGenerateNodeSkillTargetMode(value: unknown): GenerateNodeSkillTargetMode { /* accept a value or persisted object; fallback to text_to_image */ }
export function resolveGenerateNodeSkillCompileMode(input: { nodeMode: string; skillTargetMode?: unknown }): GenerateNodeSkillTargetMode | undefined { /* Chat target, media node mode, otherwise undefined */ }
```

The implementation must accept both `skillTargetMode` and `skill_target_mode` when passed as a persisted object, and must normalize `chat`, `vision`, malformed strings, and missing values to `text_to_image`.

- [ ] **Step 4: Add failing tests for compatibility and deterministic fallback selection**

Use small in-memory Skill summaries to cover ready-only filtering, H3 video visibility, incompatible selection clearing, and a persisted Skill whose declared modes identify a deterministic fallback target:

```ts
test('filters prompt-ready Skills by effective target and picks one compatible Skill after install', async () => {
  const model = await loadGenerateNodeReferenceApi()
  const skills = [
    { packId: 'h3', name: 'h3-prompt-writing', revision: 'r1', compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] },
    { packId: 'other', name: 'image-only', revision: 'r2', compatibility: 'prompt_ready', mediaModes: ['text_to_image'] },
  ]
  expect(model.filterGenerateNodeCompatibleSkills(skills, 'text_to_video')).toHaveLength(1)
  expect(model.selectInstalledGenerateNodeSkill({ skills, packId: 'h3', revision: 'r1', targetMode: 'image_to_video' }).name).toBe('h3-prompt-writing')
  expect(model.resolveGenerateNodeSkillFallbackTarget({ skill: skills[0], targetMode: 'text_to_image' })).toBe('text_to_video')
})
```

- [ ] **Step 5: Run tests to verify RED, then implement the helpers**

Run the same focused test command and confirm the new tests fail for missing exports. Implement:

```ts
export function filterGenerateNodeCompatibleSkills<T extends { compatibility: string; mediaModes: readonly string[] }>(skills: readonly T[], mode: GenerateNodeSkillTargetMode): T[]
export function resolveGenerateNodeSkillFallbackTarget<T extends { mediaModes: readonly string[] }>(input: { skill: T; targetMode: GenerateNodeSkillTargetMode }): GenerateNodeSkillTargetMode | undefined
export function selectInstalledGenerateNodeSkill<T extends { packId: string; revision: string; compatibility: string; mediaModes: readonly string[] }>(input: { skills: readonly T[]; packId: string; revision: string; targetMode: GenerateNodeSkillTargetMode }): T | undefined
```

Only `prompt_ready` Skills whose `mediaModes` is empty or contains the effective mode are compatible. Fallback selection uses the Skill's declared supported modes in the fixed option order (`text_to_image`, `image_to_image`, `text_to_video`, `image_to_video`), never guessing from the node's ordinary Chat mode.

- [ ] **Step 6: Add failing tests and implementation for the canonical direct-result packet**

Add a test proving positive text is separate from negative text and that audit/reference lineage survives in order:

```ts
test('builds a Chat direct Skill result packet without losing audit or lineage', async () => {
  const model = await loadGenerateNodeReferenceApi()
  const packet = model.buildGenerateNodeChatSkillResultPacket({
    compile: { skill_name: 'h3-prompt-writing', skill_version: 'r1', mode: 'image_to_video', prompt: 'positive', negative_prompt: 'negative', parameters: {}, references_used: ['hero'], warnings: ['trimmed'], reference_mode_hint: 'Ref2VA', reference_bindings: [{ reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png', source_asset_ids: [42] }] },
    cacheKey: 'sha256:input', cached: true, packId: 'h3', packSource: 'https://github.com/MiniMax-AI/MiniMax-H3', compilerModelId: 9, rawPrompt: 'hero prompt',
  })
  expect(packet).toMatchObject({ content: 'positive', negative_prompt: 'negative', skill_pack_id: 'h3', skill_name: 'h3-prompt-writing', skill_revision: 'r1', compiled_input_hash: 'sha256:input', compiler_model_id: 9, reference_mode_hint: 'Ref2VA', source_asset_ids: [42], reference_bindings: [{ reference_index: 1, reference_id: 'hero' }] })
  expect(packet.content).not.toContain('negative')
})
```

Implement `buildGenerateNodeChatSkillResultPacket` by normalizing the compile response through existing canonical reference helpers and de-duplicating source asset IDs while preserving binding order. Include `cached` as `skill_preview_cached` and retain `compiled_prompt`, `compiled_negative_prompt`, `compiled_references`, `warnings`, `skill_pack_source`, and `raw_prompt` fields.

- [ ] **Step 7: Run the focused model suite and commit this self-contained model change**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: PASS, including all existing reference and provenance tests. Commit only the two task files:

```bash
git add ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts
git commit -m "feat: add canvas skill target and chat result helpers"
```

### Task 2: Build one shared compile request and response normalization path

**Files:**
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`

- [ ] **Step 1: Write failing tests for the shared compile request**

Test that Chat uses the selected target mode, locked Skill identity, compiler model, node parameters, arguments, and canonical ordered references:

```ts
test('builds a compile-preview request with target mode and ordered references', async () => {
  const model = await loadGenerateNodeReferenceApi()
  const request = model.buildGenerateNodeSkillCompileRequest({ skillName: 'h3-prompt-writing', packId: 'h3', revision: 'r1', prompt: 'hero', mode: 'image_to_video', compilerModelId: 9, references: [{ reference_index: 2, reference_id: 'style', reference_role: 'style', type: 'image', url: 'https://cdn/style.png' }, { reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png' }], nodeParams: { size: '1280*720' }, arguments: { language: 'en' } })
  expect(request).toMatchObject({ skill_name: 'h3-prompt-writing', pack_id: 'h3', skill_revision: 'r1', raw_prompt: 'hero', mode: 'image_to_video', compiler_model_id: 9, arguments: { language: 'en' }, node_params: { size: '1280*720' } })
  expect(request.incoming_assets.map((item: any) => item.reference_id)).toEqual(['hero', 'style'])
})
```

- [ ] **Step 2: Run focused tests to verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: FAIL because `buildGenerateNodeSkillCompileRequest` is not defined.

- [ ] **Step 3: Implement the request builder and replace preview's inline object**

Add a typed helper that calls `buildGenerateNodeSkillCompileAssets`, canonicalizes `incoming_assets` in `reference_index` order, omits empty optional fields, and returns the existing `CanvasSkillCompileInput` shape. Use it in `handleSkillPreview` and later in Chat direct output so both paths have the same fingerprint inputs and validation.

- [ ] **Step 4: Add the compile-response normalizer and run tracker test**

Test that a stale fingerprint cannot commit and that a current response maps to the direct-result packet helper. Reuse `createGenerateNodePreviewRequestTracker` for preview and `createGenerateNodeRunTracker` for direct output; do not add a second asynchronous state machine.

- [ ] **Step 5: Run tests and commit the shared compile path**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: PASS. Commit:

```bash
git add ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts ui/web/src/components/nodes/GenerateNode.tsx
git commit -m "refactor: share canvas skill compile request shaping"
```

### Task 3: Add Chat target-mode state, persistence, and multi-reference controls

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx` source-contract tests in `ui/web/src/pages/canvasPageMigration.test.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`

- [ ] **Step 1: Write failing pure tests for persisted target mode and compatibility clearing**

Cover `skillTargetMode` and `skill_target_mode` persistence, compile fingerprint changes, and the distinction between initial hydration/command fallback versus a deliberate user target change. The expected state transition is:

```ts
expect(resolveGenerateNodeSkillTargetTransition({ current: 'text_to_image', next: 'text_to_video', selectedSkillModes: ['text_to_image'], userInitiated: true })).toEqual({ targetMode: 'text_to_video', clearSkill: true })
expect(resolveGenerateNodeSkillTargetTransition({ current: 'text_to_image', next: 'text_to_video', selectedSkillModes: ['text_to_video'], userInitiated: false })).toEqual({ targetMode: 'text_to_video', clearSkill: false })
```

- [ ] **Step 2: Run tests to verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: FAIL because the transition helper is missing.

- [ ] **Step 3: Implement the minimal UI state wiring**

In `GenerateNode.tsx`:

1. Initialize `skillTargetMode` with `normalizeGenerateNodeSkillTargetMode(data?.skillTargetMode ?? data?.skill_target_mode)`.
2. Define `effectiveSkillCompileMode = resolveGenerateNodeSkillCompileMode({ nodeMode: mode, skillTargetMode })` and use it for Skill compatibility, `listSkills`, preview, fingerprint, and compile request.
3. Expand `SKILL_MEDIA_MODES`/`supportsPromptSkills` to include `chat` without changing Vision behavior.
4. Persist both camelCase and snake-case aliases in the existing `updateNodeData` call; persist the effective Skill identity and compile audit exactly as before.
5. Clear preview/audit through the existing fingerprint invalidation effect whenever target mode changes.
6. During hydration/command resolution, apply `resolveGenerateNodeSkillFallbackTarget`; when `Select` changes the target explicitly, clear an incompatible selected Skill rather than running it under the old mode.

- [ ] **Step 4: Add the target selector and Chat image/reference visibility**

Inside the existing `提示词 Skill` panel, render for `mode === 'chat'`:

```tsx
<Select
  size="small"
  value={skillTargetMode}
  options={GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS}
  onChange={value => handleSkillTargetModeChange(value as GenerateNodeSkillTargetMode)}
  aria-label="目标提示词类型"
/>
```

Make `renderDynamicHandles` expose the `image` handle for Chat when the target is `image_to_image` or `image_to_video`; render the existing `参考素材` section under the same condition. Keep the nine-image validation and ordering/role controls untouched. The panel must show the compiler-only notice and use `生成提示词` as the run label when Chat has an effective Skill.

- [ ] **Step 5: Update source-contract tests to reflect the approved scope**

Change the old media-only assertion in `canvasPageMigration.test.ts` to require `SKILL_MEDIA_MODES` containing `chat`, `resolveGenerateNodeSkillCompileMode`, the target selector label, and the conditional Chat image handle, while continuing to assert that novel workspace sources contain no Skill API or reference-coupling strings.

- [ ] **Step 6: Run focused UI tests and commit**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts`

Expected: PASS. Commit only the GenerateNode/model/test files:

```bash
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat: expose prompt skills in chat targets"
```

### Task 4: Implement Chat + Skill compile-only execution

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: Write failing source and helper tests for the execution split**

Add tests that assert the Chat branch is compiler-only and the legacy branch remains available:

```ts
test('Chat direct Skill packet uses the positive prompt as text content', async () => {
  const model = await loadGenerateNodeReferenceApi()
  const result = model.buildGenerateNodeChatSkillResultPacket({ compile: { prompt: 'positive', negative_prompt: 'negative', skill_name: 'skill', skill_version: 'r1', mode: 'text_to_image', parameters: {}, references_used: [], warnings: [] }, cacheKey: 'hash', cached: false, compilerModelId: 4, rawPrompt: 'source' })
  expect(result.content).toBe('positive')
  expect(result.negative_prompt).toBe('negative')
})

test('GenerateNode keeps /generate only behind the non-Chat or no-Skill path', () => {
  const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
  expect(source).toContain('if (mode === \'chat\' && hasEffectiveSkill)')
  expect(source).toContain('compileSkillPreview(')
  expect(source).toContain("url: '/generate'")
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts`

Expected: the helper/source tests fail until the branch exists.

- [ ] **Step 3: Implement the compile-only branch before Key/model and SSE checks**

Extract `runChatSkillCompilation(executableReferenceBindings)` or an equivalent local function. On `mode === 'chat' && hasEffectiveSkill`:

1. Validate Skill/compiler/reference state using the same guards as preview.
2. Start one normal run token and set running status.
3. Call `compileSkillPreview(buildGenerateNodeSkillCompileRequest(...))` exactly once.
4. Check the run token and `compileInputFingerprintRef.current` before committing.
5. Convert the response with `buildGenerateNodeChatSkillResultPacket`, then pass it to `finishGeneration` so existing result persistence, asset save, lineage, DAG propagation, fission handling, and success cleanup are reused.
6. Never call `createSSEClient`, `sseClient.connect`, `apiClient.request({ url: '/generate' })`, the selected Chat Provider, or Comfy in this branch.
7. On compile failure call the existing `failGeneration`; a failed compile must not replace the prior successful result.

Keep the existing `if (!selectedKey || !selectedModel)` and SSE/`/generate` flow exactly for Chat without a Skill and all media modes. The compiler model is the only model required by the new branch.

- [ ] **Step 4: Add the compiler-only notice and run-button text without changing legacy Chat**

Render a small notice in the Skill panel stating that the selected Chat Provider is not called for `生成提示词`. Change only the active-Skill Chat button label; leave the ordinary Chat button label and request payload unchanged.

- [ ] **Step 5: Run focused tests and commit**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts`

Expected: PASS, including stale-run and existing generation packet tests. Commit:

```bash
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat: compile chat skills directly to text"
```

### Task 5: Add the GitHub Skill Pack installer to the Skill panel

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: Write failing tests for install selection outcomes**

Cover zero, one, and multiple compatible Skills returned for the installed Pack, plus preserving the previous selection on a typed installation failure:

```ts
test('summarizes installed Pack selection deterministically', async () => {
  const model = await loadGenerateNodeReferenceApi()
  const one = model.resolveGenerateNodeSkillInstallOutcome({ skills: [{ packId: 'pack', name: 'skill', revision: 'r1', compatibility: 'prompt_ready', mediaModes: ['text_to_image'] }], packId: 'pack', revision: 'r1', targetMode: 'text_to_image', previousSelection: { packId: 'old', name: 'old', revision: 'r0' } })
  expect(one.selection).toMatchObject({ packId: 'pack', name: 'skill', revision: 'r1' })
  expect(model.resolveGenerateNodeSkillInstallOutcome({ skills: [], packId: 'pack', revision: 'r1', targetMode: 'text_to_image', previousSelection: one.selection }).selection).toEqual(one.selection)
})
```

- [ ] **Step 2: Run tests to verify RED and implement the pure outcome helper**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: FAIL for the missing helper. Implement `resolveGenerateNodeSkillInstallOutcome` returning `{ selection, compatibleCount, status }`, where `status` is `selected`, `choose`, or `installed_no_compatible`; never mutate the previous selection for zero matches or errors.

- [ ] **Step 3: Add installer state and typed API call**

Import `installSkillPack` and add URL/loading/status/error state. In the panel's bottom disclosure, add a repository-root URL input, example text, and `安装` button. Disable both controls while loading. On submit, call `installSkillPack(url.trim())`, surface `error_code` and `detail` from `CanvasSkillApiError`, clear the URL only after success, and refresh both `listSkills()` and `listSkills(effectiveSkillCompileMode, true)` without reloading the app.

- [ ] **Step 4: Apply one/multiple/zero selection behavior**

Use the typed install response's `record.id`/`record.revision` and returned `skills` with `resolveGenerateNodeSkillInstallOutcome`. Automatically select exactly one compatible prompt-ready Skill, leave multiple choices unselected and show a “Pack 已安装，请选择 Skill” status, and retain the existing selection when there is no compatible Skill. Show Pack ID plus a short revision on success. Do not accept or transform `tree/...`, private, local, or credential-bearing URLs in the UI; let the existing server typed validation remain authoritative.

- [ ] **Step 5: Add source-contract tests and commit**

Require `installSkillPack` import/call, the repository URL label, loading disable, typed error rendering, and refresh calls in `canvasPageMigration.test.ts`. Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
```

Expected: PASS. Commit:

```bash
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat: install canvas skill packs from github"
```

### Task 6: Regression verification and safe handoff

**Files:**
- No production files expected; preserve the user's existing `workspace/assets.json` modification.

- [ ] **Step 1: Run focused Web tests**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts`

Expected: PASS with no snapshot or source-contract regressions.

- [ ] **Step 2: Run existing Skill, route, and installer tests**

Run: `cd ui/server && bun test src/skills src/routes/skills.test.ts src/routes/skills-compile-preview.test.ts`

Expected: PASS, including public GitHub root URL validation, HEAD revision pinning/idempotency, safe extraction, typed errors, compile cache, reference validation, and H3 T2VA/I2VA/FL2VA/L2VA/Ref2VA fixtures.

- [ ] **Step 3: Build Web and Server bundles**

Run: `bun run build:server && bun run build:web`

Expected: both commands exit 0; TypeScript and Vite produce no errors.

- [ ] **Step 4: Run boundary and broader Canvas regressions**

Run: `bun run check:refactor-boundaries` and the existing Canvas/provider test commands discovered in `package.json`/`ui/server`. Confirm no novel workspace source references `api/skills`, `referenceBindings`, or `reference_images`.

- [ ] **Step 5: Inspect the final diff and status before handoff**

Run: `git diff --check`, `git status --short --branch`, and `git diff origin/main...HEAD --stat`. Verify that only the approved Canvas files and plan/design commits are present, `workspace/assets.json` remains unstaged and unmodified by this work, and no restored-src, MCP, agent, shell, hook, or external-script path was added.

- [ ] **Step 6: Commit any final test-only adjustments and report evidence**

If verification requires a small test assertion correction, commit only that correction with a focused message. Report the exact test/build commands and outcomes; do not claim completion without successful verification.
