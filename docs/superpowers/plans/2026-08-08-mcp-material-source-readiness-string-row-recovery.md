# MCP Material Source Readiness String Row Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover only the canonical MCP material-repair `source_readiness` array when every row is a non-empty JSON-object string, while preserving all existing production validation and atomic acceptance gates.

**Architecture:** Add one Provider-neutral, non-recursive syntax-recovery helper inside the MCP material business contract and call it only while normalizing `chapter_patch.raw_payload`. The helper shallow-clones only the canonical ancestor chain when recovery occurs, never rewrites the input or stage artifact, and sends recovered rows through the complete existing type, relevance, obligation, source-readiness, identity, reference, and persistence checks. Strengthen the material prompt with one explicit object-array/no-string instruction; do not change the shared MCP parser, GenerationSource routing, Adapter, Session lifecycle, retries, API-model path, or persistence transaction.

**Tech Stack:** TypeScript, Bun 1.3.13, bun:test, Express, existing GenerationSource/MCP material contracts, SQLite acceptance workspace, React/Vite in-app page verification.

---

## Working Tree and File Structure

The user explicitly authorized implementation and push on the current `main` checkout. Do not create a feature branch or worktree.

- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.ts`: add the exact canonical-path syntax recovery and strengthen the Provider-neutral prompt.
- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`: prove real-shape recovery, canonical equivalence, immutability, exact rejection rules, scope isolation, prompt wording, and Provider neutrality.
- Modify `ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts`: prove the real MCP compiler preserves the no-string instruction.
- Verify, but do not modify unless a regression requires a separate RED-GREEN fix:
  - `ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts`
  - `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Do not modify shared MCP response parsing, API-model generation, Adapter selection, Session allocation, retry orchestration, or chapter acceptance persistence.
- Never stage or commit `ui/server/.workspace-config.json` or `workspace/assets.json`.
- Preserve until the final cumulative review the existing uncommitted MCP changes in:
  - `ui/server/src/mcp/adapters/buda-drive.ts`
  - `ui/server/src/mcp/adapters/buda-drive.test.ts`
  - `ui/server/src/mcp/runtime.ts`
  - `ui/server/src/mcp/runtime.test.ts`

### Task 1: Capture the real all-string source-readiness shape

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:70-110`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:780-850`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Add one reusable canonical source-readiness fixture**

Place this helper immediately after `existingSnapshot`:

```ts
function sourceReadinessRepairFixture() {
  const existingStateTrackingContract = {
    source_requirements: ['追踪/上下文.md'],
    source_readiness: [{
      key: 'context_tracking',
      status: 'missing',
      evidence: '缺少本章开始时的上下文跟踪锚点。',
    }],
  }
  const contextPackage = {
    preflight: {
      checks: [{
        key: 'source_readiness_context_tracking',
        ok: false,
        severity: 'high',
        fix: '补齐上下文跟踪来源',
      }],
    },
    chapter_target: { state_tracking_contract: existingStateTrackingContract },
  }
  const readiness = [{
    key: 'context_tracking',
    status: 'ready',
    evidence: '追踪/上下文.md：上一章在灰塔底层结束，林砚仍持有异常档案。',
  }]
  const canonicalPayload = {
    chapter_patch: {
      raw_payload: {
        pre_draft_brief: {
          state_tracking_contract: { source_readiness: readiness },
        },
      },
    },
    repair_summary: '补齐本章上下文跟踪来源。',
  }
  const existing = existingSnapshot({
    chapter: {
      id: 1,
      project_id: 1,
      chapter_no: 3,
      title: '第三章',
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: null,
          state_tracking_contract: existingStateTrackingContract,
        },
      },
    },
    contextPackage,
  })
  return {
    plan: resolveMaterialRepairPlan(contextPackage),
    existing,
    readiness,
    canonicalPayload,
  }
}
```

- [ ] **Step 2: Add the failing real-shape, equivalence, and immutability regression**

Inside `describe('material repair mutation preparation', ...)`, beside the existing persisted pre-draft tracking test, add:

```ts
test('recovers canonical source readiness JSON object strings without mutating the input', () => {
  const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
  const stringPayload = structuredClone(canonicalPayload)
  stringPayload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness = readiness.map(row => JSON.stringify(row)) as any

  const stageOutput: any = validateMcpStageResponse(
    'material_repair',
    'material_repair_json',
    { content: JSON.stringify(stringPayload) },
  ).output
  const original = structuredClone(stageOutput)
  const chapterPatch = stageOutput.chapter_patch
  const rawPayload = chapterPatch.raw_payload
  const preDraftBrief = rawPayload.pre_draft_brief
  const stateTrackingContract = preDraftBrief.state_tracking_contract
  const sourceReadiness = stateTrackingContract.source_readiness

  const recovered = prepareMcpMaterialRepairMutation({ plan, payload: stageOutput, existing })
  const canonical = prepareMcpMaterialRepairMutation({ plan, payload: canonicalPayload, existing })

  expect(recovered).toEqual(canonical)
  expect(recovered.acceptance.chapter_patch).toMatchObject({
    raw_payload: {
      pre_draft_brief: {
        state_tracking_contract: { source_readiness: readiness },
      },
    },
  })
  expect(stageOutput).toEqual(original)
  expect(stageOutput.chapter_patch).toBe(chapterPatch)
  expect(stageOutput.chapter_patch.raw_payload).toBe(rawPayload)
  expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief).toBe(preDraftBrief)
  expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract)
    .toBe(stateTrackingContract)
  expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness).toBe(sourceReadiness)
  expect(canonicalPayload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness).toBe(readiness)
})
```

This test uses the observed production shape: an array whose rows are individually serialized JSON objects. Comparing the complete prepared mutation proves recovery still traverses the normal confirmation, merging, source-readiness, relevance, and obligation logic.

- [ ] **Step 3: Run the focused test and verify RED**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: the new regression fails because the current production check cannot recognize the string row and reports `MATERIAL_REPAIR_OBLIGATION_UNMET` for `source_readiness_context_tracking`. Existing tests remain green.

- [ ] **Step 4: Confirm no implementation was added before RED**

```bash
git diff -- ui/server/src/novel-writing-service/service/material-repair-contract.ts
```

Expected: no new source-readiness recovery implementation appears in the production file.

### Task 2: Add the smallest canonical-path recovery

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:560-620`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Add a minimal non-recursive recovery helper**

Place this function immediately before `normalizeChapterPatch`:

```ts
function recoverCanonicalMaterialSourceReadinessRows(rawPayload: Record<string, unknown>) {
  const preDraftBrief = rawPayload.pre_draft_brief
  if (!isPlainObject(preDraftBrief)) return rawPayload
  const stateTrackingContract = preDraftBrief.state_tracking_contract
  if (!isPlainObject(stateTrackingContract)) return rawPayload
  const sourceReadiness = stateTrackingContract.source_readiness
  if (!Array.isArray(sourceReadiness)
    || sourceReadiness.length === 0
    || !sourceReadiness.every(item => typeof item === 'string')) {
    return rawPayload
  }
  const recoveredRows = sourceReadiness.map(item => JSON.parse(item as string))
  return {
    ...rawPayload,
    pre_draft_brief: {
      ...preDraftBrief,
      state_tracking_contract: {
        ...stateTrackingContract,
        source_readiness: recoveredRows,
      },
    },
  }
}
```

This is deliberately the smallest code that can turn the new RED regression green. Invalid JSON, non-object parse results, mixed rows, and wrong target types are hardened only after their own failing tests in Task 3.

- [ ] **Step 2: Route only `normalizeChapterPatch` through the helper**

In the existing `if (hasOwn(value, 'raw_payload'))` block, retain the original object-type check and replace the local `raw` binding used for aliases with:

```ts
const rawInput = value.raw_payload
if (!isPlainObject(rawInput)) {
  throw materialRepairError('MATERIAL_REPAIR_INVALID', 'chapter_patch.raw_payload must be an object')
}
const raw = recoverCanonicalMaterialSourceReadinessRows(rawInput)
```

Keep `assertAllowedFields`, alias resolution, field validation, cleanup, obligation checks, and acceptance construction exactly where they are. Do not call this helper from `validateMcpStageResponse`, another MCP stage, or the API-model path.

- [ ] **Step 3: Run the focused suite and verify GREEN**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures. The all-string payload prepares exactly the same mutation as the canonical object-array payload, and every input reference/value assertion passes.

- [ ] **Step 4: Commit the observed-shape recovery exactly**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check
git add -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): recover source readiness string rows"
```

Expected: the commit contains exactly the material contract and its test. Protected configuration and the four pre-existing MCP runtime/Drive files remain unstaged.

### Task 3: Fail closed on every shape outside the exact recovery contract

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:800-940`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:560-620`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Add invalid JSON, empty string, mixed, primitive, and wrong-type tests**

Add these tests immediately after the positive recovery regression:

```ts
test('rejects invalid canonical source readiness string row shapes with a typed error', () => {
  const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
  const invalidRows: unknown[][] = [
    ['{'],
    ['   '],
    [JSON.stringify([])],
    [JSON.stringify(null)],
    [JSON.stringify('context_tracking')],
    [JSON.stringify(1)],
    [JSON.stringify(true)],
    [readiness[0], JSON.stringify(readiness[0])],
    [readiness[0], 7],
  ]

  for (const sourceReadiness of invalidRows) {
    const payload = structuredClone(canonicalPayload)
    payload.chapter_patch.raw_payload.pre_draft_brief
      .state_tracking_contract.source_readiness = sourceReadiness as any
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload,
      existing,
    }), 'MATERIAL_REPAIR_INVALID')
  }
})

test('rejects a non-array value at the exact canonical source readiness path', () => {
  const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
  const payload = structuredClone(canonicalPayload)
  payload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness = { key: 'context_tracking' } as any

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload,
    existing,
  }), 'MATERIAL_REPAIR_INVALID')
})

test('applies the existing forbidden-key guard to recovered source readiness objects', () => {
  const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
  const payload = structuredClone(canonicalPayload)
  payload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness = [JSON.stringify({
      ...readiness[0],
      session_id: 'remote-controlled-session',
    })] as any

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload,
    existing,
  }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
})

test('keeps an empty canonical source readiness array on the existing obligation path', () => {
  const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
  const payload = structuredClone(canonicalPayload)
  payload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness = []

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload,
    existing,
  }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
})
```

- [ ] **Step 2: Add exact-scope and ordinary-object guard tests**

```ts
test('does not parse source readiness strings from noncanonical paths', () => {
  const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
  const row = JSON.stringify(readiness[0])

  const rawRootPayload = {
    chapter_patch: { raw_payload: { source_readiness: [row] } },
  }
  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload: rawRootPayload,
    existing,
  }), 'MATERIAL_REPAIR_INVALID')

  for (const payload of [
    {
      chapter_patch: {
        raw_payload: {
          preDraftBrief: {
            state_tracking_contract: { source_readiness: [row] },
          },
        },
      },
    },
    {
      chapter_patch: {
        raw_payload: {
          pre_draft_brief: {
            stateTrackingContract: { source_readiness: [row] },
          },
        },
      },
    },
    {
      chapter_patch: {
        raw_payload: {
          pre_draft_brief: {
            state_tracking_contract: { sourceReadiness: [row] },
          },
        },
      },
    },
  ]) {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload,
      existing,
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
  }

  expect(canonicalPayload.chapter_patch.raw_payload.pre_draft_brief
    .state_tracking_contract.source_readiness).toEqual(readiness)
})

test('rejects non-plain objects in an existing canonical source readiness array', () => {
  const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
  const nonPlainRow = Object.assign(Object.create({ inherited: true }), {
    key: 'context_tracking',
    status: 'ready',
    evidence: '伪造原型行',
  })
  const payload: any = {
    ...canonicalPayload,
    chapter_patch: {
      raw_payload: {
        pre_draft_brief: {
          state_tracking_contract: { source_readiness: [nonPlainRow] },
        },
      },
    },
  }

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload,
    existing,
  }), 'MATERIAL_REPAIR_INVALID')
})
```

The three alias-path cases intentionally retain the existing obligation failure: they prove recovery does not recurse or broaden from the single snake-case canonical path. The root-level case retains the existing object-array type error.

- [ ] **Step 3: Run the focused suite and verify RED**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: the invalid-shape assertions fail against the minimal helper because malformed JSON leaks a native parse error, parsed primitives do not project to `MATERIAL_REPAIR_INVALID`, mixed rows are not uniformly rejected, or non-array values fall through to a later obligation error. The positive recovery test remains green.

- [ ] **Step 4: Replace the minimal helper with the exact fail-closed implementation**

Replace `recoverCanonicalMaterialSourceReadinessRows` with:

```ts
function recoverCanonicalMaterialSourceReadinessRows(rawPayload: Record<string, unknown>) {
  const preDraftBrief = rawPayload.pre_draft_brief
  if (!isPlainObject(preDraftBrief)) return rawPayload
  const stateTrackingContract = preDraftBrief.state_tracking_contract
  if (!isPlainObject(stateTrackingContract)
    || !hasOwn(stateTrackingContract, 'source_readiness')) {
    return rawPayload
  }

  const label = 'chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness'
  const sourceReadiness = stateTrackingContract.source_readiness
  if (!Array.isArray(sourceReadiness)) invalidMaterialField(label, 'an array')
  if (sourceReadiness.length === 0) return rawPayload
  if (sourceReadiness.every(isPlainObject)) return rawPayload
  if (!sourceReadiness.every(item => typeof item === 'string' && item.trim().length > 0)) {
    invalidMaterialField(label, 'an array of plain objects or non-empty JSON object strings')
  }

  const recoveredRows = sourceReadiness.map((item, index) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(item as string)
    } catch {
      invalidMaterialField(`${label}[${index}]`, 'a valid JSON object string')
    }
    if (!isPlainObject(parsed)) {
      invalidMaterialField(`${label}[${index}]`, 'a JSON object string')
    }
    assertNoForbiddenMutationKeys(parsed)
    return parsed
  })
  return {
    ...rawPayload,
    pre_draft_brief: {
      ...preDraftBrief,
      state_tracking_contract: {
        ...stateTrackingContract,
        source_readiness: recoveredRows,
      },
    },
  }
}
```

Do not trim or rewrite the strings before parsing, add a reviver, merge rows, infer fields, accept a mixed array, or catch later business errors. The helper exposes only bounded field labels and typed contract messages; it never includes the remote row text or native parser detail.

- [ ] **Step 5: Run the focused suite and verify GREEN**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures. Invalid syntax, empty strings, mixed rows, non-object parse results, non-array values, and non-plain object rows all produce `MATERIAL_REPAIR_INVALID`; parsed forbidden fields still produce the existing `MATERIAL_REPAIR_FORBIDDEN_FIELD`; empty arrays still reach `MATERIAL_REPAIR_OBLIGATION_UNMET`; noncanonical paths remain unrecovered.

- [ ] **Step 6: Commit the exact rejection boundary**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check
git add -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): validate recovered source readiness rows"
```

Expected: only the two material contract files are committed. No Adapter, runtime, configuration, workspace asset, or unrelated test file enters this commit.

### Task 4: Tell generators never to serialize readiness rows

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:360-430`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts:60-80`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:1130-1160`
- Test: both prompt-contract test files

- [ ] **Step 1: Add failing builder and real-compiler prompt assertions**

In the main `builds a bounded self-contained authority prompt with an exact JSON envelope` test, add:

```ts
expect(task).toContain('source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。')
```

In `mcp-material-repair-prompt.test.ts`, add after the existing output-contract assertion:

```ts
expect(compiled).toContain('source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。')
```

- [ ] **Step 2: Run both suites and verify RED**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts
```

Expected: exactly the new prompt assertions fail because the object-array schema exists but the explicit no-string instruction is absent.

- [ ] **Step 3: Add the single Provider-neutral instruction**

Inside `buildMaterialRepairTask`, immediately after the `chapter_setting_usage` instruction, add:

```ts
'source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。',
```

Do not inspect Provider, Adapter, Agent, account, server, model, or Session identifiers. Keep the existing output envelope unchanged.

- [ ] **Step 4: Run both suites and verify GREEN**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts
```

Expected: zero failures; the task builder and the real MCP compiler both contain the exact instruction.

- [ ] **Step 5: Run the existing Provider-neutral source audit**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts -t "keeps the provider-neutral implementation free of an adapter brand identifier"
```

Expected: the audit passes and the material contract contains no Adapter brand identifier.

- [ ] **Step 6: Commit the prompt strengthening exactly**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check
git add -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): prohibit serialized source readiness rows"
```

Expected: the staged set contains exactly the three prompt/material files. Protected local files and the four earlier MCP runtime/Drive files remain unstaged.

### Task 5: Perform two-stage review

**Files:**
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.ts`
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`
- Review: `ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts`
- Compare: `docs/superpowers/specs/2026-08-08-mcp-material-source-readiness-string-row-recovery-design.md`

- [ ] **Step 1: Run a fresh spec-compliance review**

Require an explicit `✅ Spec compliant` or exact Missing/Extra/Incorrect findings. The reviewer must verify:

- only `chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness` activates recovery;
- only non-empty all-string arrays are parsed, in order;
- every parsed row must be a plain object;
- object arrays remain unchanged, empty arrays continue to existing obligation checks, and all other present shapes fail with `MATERIAL_REPAIR_INVALID`;
- input payload and the original stage artifact cannot be mutated;
- recovery is syntax-only and performs no field inference, alias promotion, merging, deduplication, retry, or Session creation;
- all existing material validation and atomic acceptance gates still run;
- prompt wording and implementation remain Provider-neutral;
- API-model generation, other MCP stages, Adapter, Session, retry, and persistence behavior are unchanged.

- [ ] **Step 2: Resolve every spec finding with RED-GREEN and re-review**

For each finding, first add the smallest regression assertion to the appropriate existing test file, run its exact test command and observe failure, implement the smallest in-scope correction, rerun the focused suites, stage only named files, commit the correction, and return it to the same reviewer. Repeat until the reviewer reports compliance.

- [ ] **Step 3: Run a fresh code-quality review after spec compliance**

Require Critical/Important/Minor classification and exact file-line evidence. Correct every Critical or Important finding through its own RED-GREEN regression and return it to the reviewer. Do not accept scope expansion into generic JSON recovery, unrelated cleanup, or Adapter-specific behavior.

- [ ] **Step 4: Record the clean review outcome**

Expected final review result: spec compliant, zero Critical findings, zero Important findings, and any consciously deferred Minor finding documented with its non-impact rationale before verification begins.

### Task 6: Run adjacent and complete automated verification

**Files:**
- Verify only; create no generated repository files.

- [ ] **Step 1: Run the focused material and GenerationSource suites**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: zero failures. This covers the material business boundary, real MCP prompt compilation, shared stage response isolation, and API/MCP GenerationSource behavior.

- [ ] **Step 2: Run all MCP and material-adjacent tests**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/mcp \
  src/novel-writing-service/generation-source \
  src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures, including the existing runtime/Drive changes without modifying them as part of this recovery.

- [ ] **Step 3: Run the complete Server suite**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test
```

Expected: zero failed Server tests.

- [ ] **Step 4: Run the complete Web suite**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/web
bun test
```

Expected: zero failed Web tests.

- [ ] **Step 5: Run repository boundary checks and builds**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git diff --check
git diff --cached --check
git status --short --branch
```

Expected: refactor-boundary checks, Server build, and Web build exit 0; no staged file remains; `ui/server/.workspace-config.json`, `workspace/assets.json`, and the four earlier runtime/Drive changes remain visible but unstaged.

### Task 7: Repeat real page acceptance exactly once per action

**Acceptance state:**
- Workspace: `/tmp/mangaforge-buda-acceptance-a.lWJwW2`
- Novel project ID: `4`
- Chapter ID: `4`
- Page: `http://127.0.0.1:5173/novel/workspace/4`
- Use the retained signed-in in-app browser session; never print credentials or full Agent/Session identifiers.

- [ ] **Step 1: Restart only this repository's Server and verify workspace authority**

Resolve the listener on `127.0.0.1:8787`, confirm its process and cwd belong to this repository, terminate only that Server process tree, and start:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
HOST=127.0.0.1 bun run dev
```

Keep Vite on `5173`. Verify:

```bash
curl -fsS http://127.0.0.1:8787/api/status | jq '{ok,workspace}'
```

Expected: `ok` is true and `workspace` is exactly `/tmp/mangaforge-buda-acceptance-a.lWJwW2`.

- [ ] **Step 2: Establish a terminal, zero-write baseline**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars, (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows FROM chapters WHERE id=4; SELECT count(*) AS running_artifacts FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 AND status='running'; SELECT count(*) AS running_runs FROM runs WHERE project_id=4 AND status IN ('queued','running','cancel_requested','session_created');"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: prose and every material count are zero; no run or artifact is active; quarantine count is zero. Historical failed runs remain evidence and are not deleted.

- [ ] **Step 3: Trigger exactly one new material repair from the page**

Use the in-app browser, reload after the Server restart, verify MCP is the unique enabled generation source, and click `补齐材料` exactly once. Confirm source controls become disabled while the task is active. Do not click again, retry, switch source, or create another task while it is pending.

- [ ] **Step 4: Verify artifact success, task success, writes, and strict readiness**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows; SELECT substr(task_id,-8) AS task_suffix, stage, status, source, substr(session_id,-8) AS session_suffix, error_code FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 ORDER BY id DESC LIMIT 1; SELECT id,status,error_message FROM runs WHERE project_id=4 AND run_type='mcp_chapter_task' ORDER BY id DESC LIMIT 1;"
curl -fsS 'http://127.0.0.1:8787/api/novel/projects/4/truth-file?chapter_id=4' | jq '{ready:.truth_file.context_trace.preflight.ready,strict_ready:.truth_file.context_trace.preflight.strict_ready,missing:.truth_file.context_trace.preflight.missing}'
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: the latest `material_repair_json` artifact and corresponding `mcp_chapter_task` are both `success`; world, character, setting, and chapter-usage counts are positive; `strict_ready` is true; no high-severity missing item remains; quarantine count is zero. Artifact success alone is insufficient.

If this single material task fails, stop without clicking again. Preserve its artifact and task-level error, and return to systematic root-cause analysis before any code change or remote retry.

- [ ] **Step 5: Trigger chapter prose exactly once**

Refresh the page state, verify `生成正文` is enabled and MCP remains the unique authority, then click it exactly once. Do not switch sources or create a second task while any stage is active. Wait for the complete chapter-production chain to terminate.

- [ ] **Step 6: Verify separate tasks, independent Sessions, unique MCP source, and prose**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars FROM chapters WHERE id=4; SELECT substr(task_id,-8) AS task_suffix, count(*) AS stage_count, count(DISTINCT session_id) AS distinct_sessions, group_concat(DISTINCT source) AS sources, sum(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success_count FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 GROUP BY task_id ORDER BY max(id) DESC LIMIT 2;"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: prose is non-empty; material and prose use different Task IDs; all prose artifacts use `mcp`; each actual remote prose/review/revision stage has its own distinct non-empty Session; every task is terminal; quarantine remains zero.

### Task 8: Run the cumulative MCP review, commit remaining files, and push `main`

**Files:**
- Review: `origin/main..HEAD`
- Review and, only after approval, commit:
  - `ui/server/src/mcp/adapters/buda-drive.ts`
  - `ui/server/src/mcp/adapters/buda-drive.test.ts`
  - `ui/server/src/mcp/runtime.ts`
  - `ui/server/src/mcp/runtime.test.ts`
- Never stage `ui/server/.workspace-config.json` or `workspace/assets.json`.

- [ ] **Step 1: Review the complete unpushed MCP implementation**

Require the final reviewer to cover unique GenerationSource selection, no API fallback, independent per-stage Sessions, Provider-neutral orchestration, material snapshot/atomic commit fences, Drive stability, all bounded material recoveries, exact source-readiness recovery, unchanged API behavior, and protected-file exclusion. Resolve every Critical or Important finding through a focused failing regression, minimal implementation, exact test run, and re-review.

- [ ] **Step 2: Run fresh final verification after all review fixes**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test
```

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/web
bun test
```

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git diff --check
git status --short --branch
```

Expected: all tests and checks exit 0. Before the final runtime/Drive commit, only the four reviewed MCP files and the two protected local files remain modified.

- [ ] **Step 3: Commit the four reviewed MCP files exactly**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add -- \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): harden remote drive task lifecycle"
```

Expected: exactly four files are committed. The two protected files remain modified and unstaged.

- [ ] **Step 4: Audit the exact push boundary**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --name-only
git diff --cached --name-only
git status --short --branch
```

Expected: all intended MCP design, implementation, regression, and review commits are ahead of `origin/main`; no staged files remain; the only uncommitted files are `ui/server/.workspace-config.json` and `workspace/assets.json`.

- [ ] **Step 5: Push the verified current branch**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git push origin main
```

Expected: push succeeds, `main` is no longer ahead of `origin/main`, and the two protected local files remain uncommitted.
