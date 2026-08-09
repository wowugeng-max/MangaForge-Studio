# Canvas Multi-Reference Prompt Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve up to nine ordered, role-labeled canvas reference images through Skill prompt compilation and explicit multi-reference video generation, while keeping prompt-only preview, single-image compatibility, and novel-workbench isolation.

**Architecture:** Add a typed reference-binding contract shared by the server Skill compiler, Generate route, provider body builders, and web node payload helpers. The compiler receives every reference with stable index, role, and lineage and emits deterministic labels/hints; the generation route carries the same ordered collection into a canonical `reference_images` request field. Provider and Comfy adapters must advertise or explicitly map multi-reference support; unsupported execution fails before provider/task work instead of silently selecting the first image.

**Tech Stack:** Bun/TypeScript, Bun tests, Express, React/React Flow/Ant Design, existing LLM provider route DSL, existing Comfy mapping and task manager, MiniMax H3 fixture and opt-in local HTTP acceptance harness.

**Spec:** `docs/superpowers/specs/2026-08-10-canvas-multi-reference-skill-design.md`

---

## File Map

**Create (server):**

- `ui/server/src/skills/reference-bindings.ts` — typed reference roles, nine-image limit, normalization, role validation, and H3 sub-mode hint derivation.
- `ui/server/src/skills/reference-bindings.test.ts` — deterministic ordering, role rules, limits, legacy migration, and H3 hint tests.

**Modify (server):**

- `ui/server/src/skills/types.ts` — optional reference index/id/role metadata on compile assets and result/audit contracts.
- `ui/server/src/skills/compile-cache.ts` — include ordered reference metadata and roles in canonical hashes.
- `ui/server/src/skills/compiler.ts` — labeled multimodal parts, reference hints, nine-image validation, and provenance metadata.
- `ui/server/src/skills/compiler.test.ts` — multi-reference compiler, H3 role hints, labels, and cache tests.
- `ui/server/src/routes/generate.ts` — preserve reference metadata, build canonical `reference_images`, and short-circuit invalid multi-reference executions.
- `ui/server/src/routes/generate.test.ts` — route propagation, lineage, provider/task short-circuit, and single-image regression tests.
- `ui/server/src/llm/types.ts` — typed `reference_images` transport field.
- `ui/server/src/llm/provider-runtime-support-bodies.ts` — explicit multi-reference body mapping and all-image chat/Gemini/Anthropic handling.
- `ui/server/src/llm/provider-runtime.test.ts` or the existing provider runtime A/B fixtures — supported/unsupported provider body assertions.

**Modify (web):**

- `ui/web/src/components/nodes/generate-node-model.ts` — reference-binding types, normalization/migration, ordering, role payloads, and pure helpers.
- `ui/web/src/components/nodes/GenerateNode.tsx` — persisted reference roles/order UI and multi-reference preview/run state.
- `ui/web/src/components/nodes/generateNode.test.ts` — nine-reference payload, role/order persistence, migration, invalidation, and UI source contracts.

**Modify (acceptance):**

- `scripts/accept-h3-prompt-skill.mjs` — comma-separated local image asset IDs and multi-reference I2V/Ref2VA acceptance.
- `scripts/accept-h3-prompt-skill.test.ts` — multi-asset preflight, ordering, stable hash, and zero-network default skip tests.

**Do not modify:** `restored-src`, novel workspace/Agent/MCP routes, or external Skill execution code.

---

### Task 1: Define and validate the reference-binding contract

**Files:**
- Create: `ui/server/src/skills/reference-bindings.ts`
- Test: `ui/server/src/skills/reference-bindings.test.ts`
- Modify: `ui/server/src/skills/types.ts`
- Modify: `ui/server/src/skills/compile-cache.ts`

- [ ] **Step 1: Write failing contract tests.**

Add tests for the public helpers below. The tests must fail before the new module/export exists:

```ts
expect(normalizeCanvasReferenceAssets([
  { type: 'image', url: '/a.png', source_asset_ids: [11], reference_role: 'first_frame' },
  { type: 'image', url: '/b.png', source_asset_ids: [12], reference_role: 'last_frame' },
])).toMatchObject([
  { reference_index: 1, reference_id: 'reference-1', reference_role: 'first_frame', source_asset_ids: [11] },
  { reference_index: 2, reference_id: 'reference-2', reference_role: 'last_frame', source_asset_ids: [12] },
])
expect(deriveH3ReferenceModeHint([{ type: 'image', reference_role: 'first_frame' }])).toBe('I2VA')
expect(deriveH3ReferenceModeHint([
  { type: 'image', reference_role: 'first_frame' },
  { type: 'image', reference_role: 'last_frame' },
])).toBe('FL2VA')
expect(() => validateCanvasReferenceAssets(Array.from({ length: 10 }, () => ({ type: 'image', url: '/x.png' })))).toThrow(expect.objectContaining({ code: 'REFERENCE_LIMIT_EXCEEDED' }))
expect(() => validateCanvasReferenceAssets([
  { type: 'image', reference_role: 'first_frame' },
  { type: 'image', reference_role: 'first_frame' },
])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID' }))
```

Also assert `video`/`audio` are normalized but rejected by the current executable-image validator with `REFERENCE_MEDIA_UNSUPPORTED`, and that canonical hashes differ when only reference order, role, or lineage changes.

- [ ] **Step 2: Run the focused test and confirm the expected RED.**

Run:

```bash
cd ui/server && bun test src/skills/reference-bindings.test.ts
```

Expected: module/export failures for `reference-bindings.ts` and the new type fields.

- [ ] **Step 3: Add the typed contract and minimal validation.**

In `types.ts`, add optional metadata without breaking existing callers:

```ts
export type CanvasReferenceRole = 'general' | 'first_frame' | 'last_frame' | 'character' | 'scene' | 'style' | 'full_reference' | 'prompt_context'
export type CanvasReferenceType = 'image' | 'prompt' | 'video' | 'audio'
export type CanvasReferenceBinding = {
  reference_index: number
  reference_id: string
  reference_role: CanvasReferenceRole
  type: CanvasReferenceType
  url?: string
  content?: string
  source_asset_ids?: number[]
}
```

Extend `PromptCompileInput.incomingAssets` and `CompileCacheInput.incomingAssets` with optional `reference_index`, `reference_id`, and `reference_role`; add optional `reference_bindings` and `reference_mode_hint` to `PromptCompileResult` so old cached results remain readable.

Implement `normalizeCanvasReferenceAssets`, `validateCanvasReferenceAssets`, and `deriveH3ReferenceModeHint` in `reference-bindings.ts`. Preserve input order, assign `reference_index` starting at 1, retain deduplicated positive lineage IDs, enforce at most nine image references and one `first_frame`/one `last_frame`, and return typed errors rather than silently dropping an item. Treat no image as `T2VA`, first-only as `I2VA`, first+last as `FL2VA`, last-only as `L2VA`, and any other multi-reference set as `Ref2VA`.

- [ ] **Step 4: Make the cache canonicalization reference-aware.**

Change `normalizedAsset` in `compile-cache.ts` to include the optional reference fields in their original order:

```ts
return {
  type: asset.type,
  reference_index: asset.reference_index,
  reference_id: asset.reference_id,
  reference_role: asset.reference_role,
  content: typeof asset.content === 'string' ? asset.content : undefined,
  url: typeof asset.url === 'string' ? asset.url : undefined,
  source_asset_ids: Array.isArray(asset.source_asset_ids) ? [...asset.source_asset_ids].map(Number) : undefined,
}
```

- [ ] **Step 5: Run the contract and existing compiler/cache tests to GREEN.**

Run:

```bash
cd ui/server && bun test src/skills/reference-bindings.test.ts src/skills/compiler.test.ts
```

Expected: all new and existing tests pass, with no changes to legacy no-reference hashes.

- [ ] **Step 6: Commit the contract unit.**

```bash
git add ui/server/src/skills/reference-bindings.ts ui/server/src/skills/reference-bindings.test.ts ui/server/src/skills/types.ts ui/server/src/skills/compile-cache.ts
git commit -m "feat: define bounded canvas reference bindings"
```

---

### Task 2: Add pure web binding, ordering, and migration helpers

**Files:**
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`

- [ ] **Step 1: Write failing pure helper tests.**

Add tests for the wished-for functions:

```ts
const migrated = normalizeGenerateNodeReferenceBindings(undefined, [
  { id: 21, type: 'image', url: '/api/assets/media/a.png', source_asset_ids: [21] },
])
expect(migrated).toEqual([{ reference_index: 1, reference_id: 'reference-1', reference_role: 'general', type: 'image', url: '/api/assets/media/a.png', source_asset_ids: [21] }])

const reordered = reorderGenerateNodeReferenceBindings(migrated, 1, 0)
expect(reordered[0].reference_id).toBe('reference-1')
expect(buildGenerateNodeReferencePayload(reordered)).toMatchObject({
  reference_bindings: expect.any(Array),
  reference_images: expect.any(Array),
})
```

Cover nine images, reject a tenth, preserve text assets without consuming the image limit, normalize camel/snake persisted fields, and prove old nodes with only `incomingAssets` migrate without changing their single-image `image_url` payload.

- [ ] **Step 2: Run the focused web test and observe RED.**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts
```

Expected: missing-helper/export failures.

- [ ] **Step 3: Implement the pure helpers without React side effects.**

Add these typed helpers to `generate-node-model.ts`:

```ts
export type GenerateNodeReferenceBinding = {
  reference_index: number
  reference_id: string
  reference_role: CanvasReferenceRole
  type: 'image' | 'prompt' | 'video' | 'audio'
  id?: number
  url?: string
  content?: string
  source_asset_ids?: number[]
}

export function normalizeGenerateNodeReferenceBindings(
  persisted: unknown,
  incomingAssets: GenerateNodeIncomingAsset[],
): GenerateNodeReferenceBinding[] { /* preserve persisted order; migrate absent data */ }

export function reorderGenerateNodeReferenceBindings(
  bindings: GenerateNodeReferenceBinding[], fromIndex: number, toIndex: number,
): GenerateNodeReferenceBinding[] { /* move one item and renumber */ }

export function buildGenerateNodeReferencePayload(bindings: GenerateNodeReferenceBinding[]) {
  return {
    reference_bindings: bindings,
    reference_images: bindings.filter(item => item.type === 'image').map(({ url, reference_index, reference_id, reference_role, source_asset_ids }) => ({
      url, reference_index, reference_id, reference_role, ...(source_asset_ids?.length ? { source_asset_ids } : {}),
    })),
  }
}
```

The implementation must reject unsupported executable `video`/`audio` references with a typed client-side validation result, preserve positive lineage IDs, and never mutate the caller's array.

- [ ] **Step 4: Extend request/asset payload helpers.**

`buildGenerateNodeRequestPayload` must merge `buildGenerateNodeReferencePayload` into `params.incoming_assets` and top-level `reference_images`, while retaining `image_url` only as the first-image compatibility field. `buildGenerateNodeAssetPayload` must carry `reference_bindings` and the full `source_asset_ids` list. Add assertions that a two-image payload contains both URLs in order and both lineage arrays.

- [ ] **Step 5: Run web tests to GREEN and commit.**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
git diff --check
git add ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts
git commit -m "feat: model ordered canvas reference bindings"
```

---

### Task 3: Compile every reference with labels, roles, and H3 hints

**Files:**
- Modify: `ui/server/src/skills/compiler.ts`
- Modify: `ui/server/src/skills/compiler.test.ts`
- Modify: `ui/server/src/skills/types.ts` only if Task 1 metadata needs a narrow correction

- [ ] **Step 1: Write failing compiler tests.**

Add a real fake runtime-model test with nine ordered image inputs:

```ts
const input = {
  skillName: 'h3-prompt-writing', rawPrompt: 'multi-reference shot', mode: 'image_to_video',
  incomingAssets: Array.from({ length: 9 }, (_, index) => ({
    type: 'image' as const,
    url: `/api/assets/media/ref-${index + 1}.png`,
    reference_index: index + 1,
    reference_id: `reference-${index + 1}`,
    reference_role: index === 0 ? 'first_frame' : index === 8 ? 'last_frame' : 'character',
    source_asset_ids: [index + 1],
  })),
  nodeParams: {}, activeWorkspace: root, compilerModelId: 7,
}
const result = await compiler(input)
const requestText = JSON.stringify(calls[0])
expect(requestText).toContain('REFERENCE IMAGE 1')
expect(requestText).toContain('ROLE: first_frame')
expect(requestText).toContain('REFERENCE IMAGE 9')
expect(result.result.reference_bindings).toHaveLength(9)
expect(result.result.reference_mode_hint).toBe('Ref2VA')
```

Add separate tests for first-only (`I2VA`), first+last (`FL2VA`), last-only (`L2VA`), text-only (`T2VA`), a tenth image (`REFERENCE_LIMIT_EXCEEDED`), and a changed role/order producing a different cache key. Prove non-H3 Skills do not accept H3 alias result modes.

- [ ] **Step 2: Run compiler tests to capture RED.**

Run:

```bash
cd ui/server && bun test src/skills/compiler.test.ts
```

Expected: labels, result metadata, mode hint, and limit assertions fail against the current single-label compiler.

- [ ] **Step 3: Build deterministic labeled user content.**

Update `userContent` so every image is preceded by a text part containing only sanitized metadata:

```ts
content.push({
  type: 'text',
  text: [
    `REFERENCE IMAGE ${asset.reference_index ?? imageIndex + 1}`,
    `ROLE: ${asset.reference_role ?? 'general'}`,
    `SOURCE ASSET IDS: ${JSON.stringify(asset.source_asset_ids ?? [])}`,
  ].join('\n'),
})
content.push({ type: 'image_url', image_url: { url: scrub(asset.url, workspace) } })
```

Add a sanitized `REFERENCE MODE HINT` text line derived by `deriveH3ReferenceModeHint`; do not use it to select a Skill. Preserve all explicit text references in their original order.

- [ ] **Step 4: Attach compiler-owned provenance and normalize H3 result aliases.**

After `parseResult`, set `reference_bindings` from the validated input rather than trusting model-generated provenance, and set `reference_mode_hint`. Keep `PromptCompileResult.mode` canonical. Only when `skill.name === 'h3-prompt-writing'`, accept result mode aliases using this exact map:

```ts
const H3_RESULT_MODE_MAP = {
  T2VA: 'text_to_video', I2VA: 'image_to_video', FL2VA: 'image_to_video',
  L2VA: 'image_to_video', Ref2VA: 'image_to_video',
} as const
```

Unknown aliases and aliases from any other Skill must still throw `SKILL_MODE_INCOMPATIBLE`/`SKILL_RESULT_INVALID` as appropriate. Include reference metadata in the cache result so a hit returns the same audit information.

- [ ] **Step 5: Run compiler and cache tests to GREEN, then commit.**

Run:

```bash
cd ui/server && bun test src/skills/reference-bindings.test.ts src/skills/compiler.test.ts
git diff --check
git add ui/server/src/skills/compiler.ts ui/server/src/skills/compiler.test.ts ui/server/src/skills/types.ts
git commit -m "feat: compile ordered multi-reference Skill context"
```

---

### Task 4: Carry canonical reference images through GenerateRoute

**Files:**
- Modify: `ui/server/src/llm/types.ts`
- Modify: `ui/server/src/routes/generate.ts`
- Modify: `ui/server/src/routes/generate.test.ts`

- [ ] **Step 1: Write failing route tests.**

Inject a compiler and executor fake. Send a Skill-enabled `image_to_video` payload with two images, roles, and lineage. Assert:

```ts
expect(compileInput.incomingAssets.map(asset => asset.url)).toEqual(['/ref-a.png', '/ref-b.png'])
expect(compileInput.incomingAssets.map(asset => asset.reference_role)).toEqual(['first_frame', 'last_frame'])
expect(executeRequest.reference_images).toEqual([
  expect.objectContaining({ url: '/ref-a.png', reference_index: 1, reference_role: 'first_frame' }),
  expect.objectContaining({ url: '/ref-b.png', reference_index: 2, reference_role: 'last_frame' }),
])
expect(executeRequest.messages.at(-1)?.content).toEqual(expect.arrayContaining([
  expect.objectContaining({ type: 'image_url', image_url: { url: '/ref-a.png' } }),
  expect.objectContaining({ type: 'image_url', image_url: { url: '/ref-b.png' } }),
]))
```

Add tests for ten images (`REFERENCE_LIMIT_EXCEEDED`), unsupported `video`/`audio` (`REFERENCE_MEDIA_UNSUPPORTED`), complete audit lineage, and no Skill/single-image exact legacy request equality.

- [ ] **Step 2: Run route tests and confirm RED.**

Run:

```bash
cd ui/server && bun test src/routes/generate.test.ts
```

Expected: `reference_images` is absent or only contains the first image and reference metadata is lost.

- [ ] **Step 3: Add the typed transport field and preserve metadata.**

In `llm/types.ts`, add:

```ts
export type LLMReferenceImage = {
  url: string
  reference_index: number
  reference_id?: string
  reference_role?: string
  source_asset_ids?: number[]
}
// LLMRequest: reference_images?: LLMReferenceImage[]
```

Make `normalizeIncomingAssets`, `appendIncomingAssetsToMessages`, `buildCanvasGenerateLLMRequest`, and `compileCanvasSkillIfSelected` retain the optional reference fields and use the same ordered list. Set `image_url` only for backward-compatible first-image consumers; never use it as the authoritative multi-reference collection.

- [ ] **Step 4: Attach complete audit/result provenance.**

Extend `SkillCompileAudit` and the generation result packet with `reference_bindings` and `reference_mode_hint`. Preserve all `source_asset_ids` when merging `compiledPrompt` into `result`, `responsePayload`, SSE packets, and downstream asset data.

- [ ] **Step 5: Run route/provider-adjacent tests and commit.**

Run:

```bash
cd ui/server && bun test src/routes/generate.test.ts src/skills/compiler.test.ts
git diff --check
git add ui/server/src/llm/types.ts ui/server/src/routes/generate.ts ui/server/src/routes/generate.test.ts
git commit -m "feat: preserve multi-reference inputs in canvas generation"
```

---

### Task 5: Enforce explicit multi-reference Provider and Comfy mappings

**Files:**
- Create: `ui/server/src/llm/multi-reference-transport.ts`
- Test: `ui/server/src/llm/multi-reference-transport.test.ts`
- Modify: `ui/server/src/llm/provider-runtime-support-bodies.ts`
- Modify: `ui/server/src/llm/provider-runtime.test.ts` or the existing provider runtime A/B fixture covering media bodies
- Modify: `ui/server/src/routes/generate.ts`
- Modify: `ui/server/src/routes/generate.test.ts`

- [ ] **Step 1: Write failing transport tests.**

Define a capability contract and test it before implementation:

```ts
const request = {
  type: 'image_to_video', image_url: '/first.png',
  reference_images: [
    { url: '/first.png', reference_index: 1, reference_role: 'first_frame' },
    { url: '/last.png', reference_index: 2, reference_role: 'last_frame' },
  ],
} as any
expect(() => resolveMultiReferenceTransport(request, { apiFormat: 'openai_compatible', contextUiParams: {} })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
expect(resolveMultiReferenceTransport(request, { apiFormat: 'gemini_native', contextUiParams: { multi_reference: { supported: true, max: 9 } } })).toMatchObject({ supported: true, max: 9 })
```

Also test a declared route template containing `{{reference_images}}`, a provider max of 2 rejecting 3 references, and a single-image request retaining legacy `image_url` behavior.

- [ ] **Step 2: Run transport tests to verify RED.**

Run:

```bash
cd ui/server && bun test src/llm/multi-reference-transport.test.ts
```

Expected: missing module/export or unsupported requests incorrectly pass.

- [ ] **Step 3: Implement explicit capability resolution.**

Implement `resolveMultiReferenceTransport(request, selection)` with this precedence:

1. A provider/model `context_ui_params.multi_reference` object with `supported: true` and optional `field`/`max`.
2. A route DSL payload template that explicitly references `reference_images`.
3. Native multimodal message formats (`gemini_native`, Anthropic/Chat content) that preserve all image parts.
4. Otherwise throw `MULTI_REFERENCE_UNSUPPORTED` when the collection length exceeds one.

Never infer support solely from the presence of `image_url`.

- [ ] **Step 4: Build provider bodies without dropping references.**

Update the media chat-completions branch to use all `request.reference_images` in order:

```ts
const referenceParts = (request.reference_images ?? []).map(item => ({
  type: 'image_url', image_url: { url: item.url },
}))
const userContent = referenceParts.length
  ? [{ type: 'text', text: prompt }, ...referenceParts]
  : prompt
```

For explicit array providers, emit the configured field (for example `reference_images`) with full metadata or URLs according to the declared field shape. Expose `reference_images` to route DSL template context. Gemini/Anthropic message conversion must retain every image part.

- [ ] **Step 5: Require explicit Comfy mappings.**

Extend the existing `skill_comfy_mapping` contract with:

```ts
reference_images: Array<{ reference_index: number; input: string }>
```

Resolve every declared `input` path, inject the matching URL, and reject missing/duplicate indices with `MULTI_REFERENCE_MAPPING_REQUIRED` before `comfyExecute`, task registration, or provider execution. Preserve existing compiled prompt/negative prompt mapping behavior.

- [ ] **Step 6: Run provider and route tests to GREEN and commit.**

Run:

```bash
cd ui/server && bun test src/llm/multi-reference-transport.test.ts src/llm/provider-runtime.test.ts src/routes/generate.test.ts
git diff --check
git add ui/server/src/llm/multi-reference-transport.ts ui/server/src/llm/multi-reference-transport.test.ts ui/server/src/llm/provider-runtime-support-bodies.ts ui/server/src/llm/provider-runtime.test.ts ui/server/src/routes/generate.ts ui/server/src/routes/generate.test.ts
git commit -m "feat: enforce explicit multi-reference provider mappings"
```

---

### Task 6: Add GenerateNode reference role/order controls and persistence

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Modify: `ui/web/src/components/nodes/generate-node-model.ts`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: Write failing UI/source-contract tests.**

Add assertions that GenerateNode renders a media-only reference section, persists `referenceBindings`, exposes role choices, sends all ordered references, and keeps the selector out of novel pages:

```ts
const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
expect(source).toContain('referenceBindings')
expect(source).toContain('first_frame')
expect(source).toContain('last_frame')
expect(source).toContain('reference_images')
expect(source).toContain("mode.includes('video')")
```

Add a pure test that edits a two-image binding list, persists it, hydrates it into a new node, changes a role, and observes a different compile fingerprint. Add a compatibility test that a provider error disables run but leaves preview enabled.

- [ ] **Step 2: Run web tests and observe RED.**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
```

Expected: missing reference state/UI/payload assertions.

- [ ] **Step 3: Hydrate and persist bindings.**

Initialize from both camel and snake data fields:

```ts
const [referenceBindings, setReferenceBindings] = useState(() => normalizeGenerateNodeReferenceBindings(
  data?.referenceBindings ?? data?.reference_bindings,
  incomingContext.incomingAssets,
))
```

Persist `reference_bindings` and `referenceBindings` with `updateNodeData`, and clear compiled fields whenever bindings, order, role, lineage, prompt, mode, Skill, arguments, camera controls, or compiler model changes. Keep `commandSkillArgumentsByCommand` and dropdown arguments separate.

- [ ] **Step 4: Render role/order controls and enforce limits.**

In the existing media-only Skill panel, render each image reference with index, thumbnail, source IDs, a role `Select`, and up/down controls. Reject a tenth image, duplicate first/last roles, and unsupported video/audio types before preview/run. A multi-reference Provider incompatibility disables run while the preview button remains available.

- [ ] **Step 5: Use bindings for preview and generation.**

Pass the exact normalized binding list into `compileSkillPreview` and `buildGenerateNodeRequestPayload`; do not reconstruct references independently in preview and run. Display the compiled reference list, roles, H3 mode hint, warnings, and hash. On successful generation, merge all binding lineage into asset/result/incoming data.

- [ ] **Step 6: Run web tests/build and commit.**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts && bun run build
git diff --check
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat: add multi-reference roles to GenerateNode"
```

---

### Task 7: Extend the H3 acceptance harness and integration fixtures

**Files:**
- Modify: `scripts/accept-h3-prompt-skill.mjs`
- Modify: `scripts/accept-h3-prompt-skill.test.ts`
- Modify: `ui/server/src/skills/compiler.test.ts`
- Modify: `ui/server/src/routes/generate.test.ts`

- [ ] **Step 1: Write failing multi-asset acceptance tests.**

Change the fake API fixture to resolve a comma-separated environment value and assert the I2V preview receives all three IDs in order:

```ts
expect(previews.find(item => item.mode === 'image_to_video').assets).toEqual([
  { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_role: 'first_frame' },
  { type: 'image', url: '/api/assets/media/assets%2Fcharacter.png', source_asset_ids: [43], reference_index: 2, reference_role: 'character' },
  { type: 'image', url: '/api/assets/media/assets%2Flast.png', source_asset_ids: [44], reference_index: 3, reference_role: 'last_frame' },
])
```

Add RED tests for ten IDs, a missing second asset, changed order producing a different hash, and default skip making zero network calls.

- [ ] **Step 2: Run the harness test to confirm RED.**

Run:

```bash
cd <repo-root> && bun test scripts/accept-h3-prompt-skill.test.ts
```

Expected: the harness accepts only the current single asset ID and does not populate the ordered multi-reference payload.

- [ ] **Step 3: Implement safe multi-asset preflight and acceptance.**

Support `MANGAFORGE_H3_IMAGE_ASSET_IDS=42,43,44` while retaining the singular variable as a compatibility alias. Resolve every ID through the local API, verify each record is an image and each media URL has an `image/*` MIME type, then send all assets with explicit `reference_index` and roles. Keep preflight before installation, use manual redirects, bounded body reads, long compile timeout, and existing credential redaction. Assert both H3 references, non-empty prompt, 40-hex revision, and stable repeated multi-image hash.

- [ ] **Step 4: Run acceptance and server integration tests to GREEN.**

Run:

```bash
bun test scripts/accept-h3-prompt-skill.test.ts
cd ui/server && bun test src/skills/compiler.test.ts src/routes/generate.test.ts
cd ..
node scripts/accept-h3-prompt-skill.mjs
```

Expected: tests pass; live command prints `skipped` unless `MANGAFORGE_H3_E2E=1` plus all required local configuration is present.

- [ ] **Step 5: Commit the acceptance extension.**

```bash
git add scripts/accept-h3-prompt-skill.mjs scripts/accept-h3-prompt-skill.test.ts ui/server/src/skills/compiler.test.ts ui/server/src/routes/generate.test.ts
git commit -m "test: accept H3 multi-reference prompts"
```

---

### Task 8: Full verification, final review, and handoff

**Files:**
- Modify only files listed in Tasks 1–7 if a concrete regression is found.

- [ ] **Step 1: Run focused suites.**

```bash
cd ui/server && bun test src/skills src/routes/skills.test.ts src/routes/generate.test.ts src/llm/provider-runtime.test.ts src/llm/multi-reference-transport.test.ts
cd ../web && bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
cd ../.. && bun test scripts/accept-h3-prompt-skill.test.ts
```

Expected: zero failures; live E2E remains opt-in.

- [ ] **Step 2: Run production builds and classify environment failures.**

```bash
cd ui/server && bun run build
cd ../web && bun run build
```

Web must exit 0. If server build reports only the existing `restored-src` missing `jszip`, `yaml`, and `zod/v4/core/json-schema.js`, record it as an environment blocker and do not modify restored-src.

- [ ] **Step 3: Run broader regressions.**

```bash
cd ui/server && bun test src/llm src/routes src/mcp src/novel
cd ../web && bun test src/components/nodes src/stores src/pages/canvasPageMigration.test.ts
```

Separate pre-existing restored-src/manga-compat failures from Skill regressions; do not weaken existing tests.

- [ ] **Step 4: Perform security and scope scans.**

```bash
rg -n "child_process|exec\(|spawn\(|shell|allowed-tools|hooks|MCP|Task|Agent" ui/server/src/skills ui/server/src/routes/skills.ts scripts/accept-h3-prompt-skill.mjs
rg -n "api/skills|skillPackId|skillName|referenceBindings|reference_images" ui/web/src/pages/novel* ui/server/src/novel* || true
git diff --check
git status --short --branch
```

Confirm execution primitives are absent from runtime Skill/acceptance code, external scripts are never loaded, `triggerWords` never selects a Skill, and novel/MCP/restored-src files remain untouched.

- [ ] **Step 5: Request final overall code review.**

Review the complete implementation range from the pre-feature baseline (`ca19b9ec`) to the final head. The reviewer must verify the reference collection is identical across UI, compiler, route, Provider, Comfy, and asset provenance, and that all prior Task 1–8 constraints remain true.

- [ ] **Step 6: Record evidence and leave the branch ready for the user's chosen integration action.**

Do not create a redundant empty final commit. Preserve the existing task commits, keep live E2E skipped when configuration is absent, and report exact test/build counts plus the known restored-src blocker.

---

## Plan self-review

- The spec's nine-image cap, role/order persistence, H3 mode hints, prompt-only preview, strict Provider/Comfy boundary, typed errors, legacy migration, security limits, and acceptance harness are covered by Tasks 1–7.
- Every production behavior has a preceding RED test and a focused GREEN command.
- `CanvasReferenceBinding`, `PromptCompileInput` metadata, `LLMReferenceImage`, `reference_images`, and `skill_comfy_mapping.reference_images` are named consistently across tasks.
- No task modifies `restored-src`, novel, Agent, or MCP code.
- The only unresolved verification condition is the previously documented server build dependency blocker; the plan explicitly requires preserving and reporting it rather than bypassing it.
