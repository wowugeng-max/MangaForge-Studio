# MCP Material Root Section Lift Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deterministically lift an exact set of known material-repair root sections that an MCP generator placed directly inside the sole `chapter_patch` wrapper, without changing values or weakening any downstream contract.

**Architecture:** Keep the existing root-brace syntax recovery in the stage response contract unchanged. Add a non-recursive, Provider-neutral normalization at the start of `prepareMcpMaterialRepairMutation`: it activates only when the payload has exactly one top-level `chapter_patch`, lifts only six allowlisted root fields into a fresh object, and then runs every existing material validation and atomic acceptance gate.

**Tech Stack:** TypeScript, Bun 1.3.13, bun:test, existing GenerationSource/MCP material contracts, SQLite acceptance workspace, React/Vite in-app page verification.

---

## Working Tree and File Structure

The current `main` checkout is explicitly authorized by the user. Do not create a feature branch or worktree for this plan.

The two material contract files already contain intentional, uncommitted changes from the preceding approved MCP material-repair work. Preserve those changes. The focused implementation commit may include the complete current versions of these two files after their diff and tests have been reviewed.

- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.ts`: add the exact lift allowlist and non-mutating normalizer; route only `prepareMcpMaterialRepairMutation` through it.
- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`: add the real combined root-closure/misnested-section regression and fail-closed guards.
- Do not modify `ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts`: the syntax recovery is already complete and separately reviewed.
- Do not modify API model routing, MCP Adapter selection, Session lifecycle, or retry behavior.
- Never stage or commit `ui/server/.workspace-config.json` or `workspace/assets.json`.

### Task 1: Capture the real combined failure

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:1-20`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:480-560`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Import the existing stage response validator**

Add this import beside the other novel-writing-service imports:

```ts
import { validateMcpStageResponse } from '../generation-source/stage-response-contract'
```

- [ ] **Step 2: Add the failing real-shape regression**

Insert this test at the beginning of `describe('material repair mutation preparation', ...)`:

```ts
test('lifts exact material root sections nested under the sole chapter patch after root closure recovery', () => {
  const plan = resolveMaterialRepairPlan({
    preflight: { checks: [
      { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
      { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' },
      { key: 'characters', ok: false, severity: 'high', fix: '补齐角色卡' },
      { key: 'setting_workshop', ok: false, severity: 'high', fix: '补齐设定实体' },
      { key: 'chapter_setting_usage', ok: false, severity: 'high', fix: '补齐章节设定调用' },
    ] },
  }, [
    'ending_hook',
    'worldbuilding',
    'characters',
    'setting_workshop',
    'chapter_setting_usage',
  ])
  const canonicalPayload = {
    chapter_patch: {
      ending_hook: '倒计时归零后，档案上的字迹变成林砚自己的笔迹。',
    },
    worldbuilding: [{
      world_summary: '零点会出现一页来自未来的死亡记录。',
      rules: ['记录只能在天亮前改写一次。'],
    }],
    characters: [{
      name: '林砚',
      role_type: '主角',
      motivation: '查明失忆与零点档案的关系。',
      current_state: { location: '市档案馆地下档案室' },
    }],
    character_updates: [],
    settings: [{
      entity_type: 'item',
      name: '异常档案文件',
      summary: '一份会显示未来死亡记录的纸质档案。',
    }],
    chapter_setting_usage: [{
      entity_name: '异常档案文件',
      entity_type: 'item',
      usage_type: 'required',
      required: true,
    }],
    repair_summary: '补齐第一章开写前的世界、角色、设定和调用材料。',
  }
  const misnestedPayload = {
    chapter_patch: {
      ...canonicalPayload.chapter_patch,
      worldbuilding: canonicalPayload.worldbuilding,
      characters: canonicalPayload.characters,
      character_updates: canonicalPayload.character_updates,
      settings: canonicalPayload.settings,
      chapter_setting_usage: canonicalPayload.chapter_setting_usage,
      repair_summary: canonicalPayload.repair_summary,
    },
  }
  const originalMisnestedPayload = structuredClone(misnestedPayload)
  const missingRootClosure = JSON.stringify(misnestedPayload).slice(0, -1)
  const stageOutput = validateMcpStageResponse(
    'material_repair',
    'material_repair_json',
    { content: missingRootClosure },
  ).output
  const existing = existingSnapshot({
    characterNames: new Set(),
    settingKeys: new Set(),
  })

  const recovered = prepareMcpMaterialRepairMutation({
    plan,
    payload: stageOutput,
    existing,
  })
  const canonical = prepareMcpMaterialRepairMutation({
    plan,
    payload: canonicalPayload,
    existing,
  })

  expect(recovered).toEqual(canonical)
  expect(misnestedPayload).toEqual(originalMisnestedPayload)
})
```

- [ ] **Step 3: Run the focused test and verify RED**

```bash
cd ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: the new test fails with `MATERIAL_REPAIR_FORBIDDEN_FIELD` and `chapter_patch contains forbidden field: worldbuilding`; all pre-existing tests remain green.

- [ ] **Step 4: Record RED evidence before production changes**

```bash
git diff -- ui/server/src/novel-writing-service/service/material-repair-contract.ts
```

Expected: the diff contains only the intentional pre-existing material contract work and no root-section lift allowlist or normalizer.

### Task 2: Implement the exact non-mutating lift and fail-closed guards

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:80-90`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:354-370`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:1760-1910`
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:480-620`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Add the exact lift allowlist**

Place immediately after `MATERIAL_REPAIR_MUTATION_FIELDS`:

```ts
const MISNESTED_MATERIAL_ROOT_FIELDS = new Set<string>([
  'worldbuilding',
  'characters',
  'character_updates',
  'settings',
  'chapter_setting_usage',
  'repair_summary',
])
```

- [ ] **Step 2: Add the non-recursive normalizer**

Place immediately after `hasOwn`:

```ts
function normalizeMisnestedMaterialRootSections(payload: Record<string, unknown>) {
  const topLevelFields = Object.keys(payload)
  if (topLevelFields.length !== 1 || topLevelFields[0] !== 'chapter_patch') return payload

  const chapterPatch = payload.chapter_patch
  if (!isPlainObject(chapterPatch)) return payload
  const misplacedFields = Object.keys(chapterPatch)
    .filter(field => MISNESTED_MATERIAL_ROOT_FIELDS.has(field))
  if (misplacedFields.length === 0) return payload

  const normalizedChapterPatch: Record<string, unknown> = {}
  const normalized: Record<string, unknown> = {
    chapter_patch: normalizedChapterPatch,
  }
  for (const [field, value] of Object.entries(chapterPatch)) {
    if (MISNESTED_MATERIAL_ROOT_FIELDS.has(field)) normalized[field] = value
    else normalizedChapterPatch[field] = value
  }
  return normalized
}
```

This function must not recurse, delete unknown fields, clone nested values, inspect Provider identity, or mutate `payload` or `chapterPatch`.

- [ ] **Step 3: Route only the MCP material preparation boundary through normalization**

In `prepareMcpMaterialRepairMutation`, retain size serialization and forbidden-key scanning against the original input. Immediately after `assertNoForbiddenMutationKeys(input.payload)`, introduce the canonical local payload:

```ts
assertNoForbiddenMutationKeys(input.payload)
const payload = normalizeMisnestedMaterialRootSections(input.payload)
const allowedTopLevel = new Set<string>([...MATERIAL_REPAIR_MUTATION_FIELDS, 'repair_summary'])
assertAllowedFields(payload, allowedTopLevel, 'material repair payload')
```

Within the remainder of this function, replace every business read of `input.payload` with `payload`:

```ts
if (hasOwn(payload, section) && !effectiveTargets.has(section)) {
```

```ts
if (!hasOwn(payload, 'chapter_patch')) {
  throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter_patch did not return a meaningful result')
}
const patch = normalizeChapterPatch(payload.chapter_patch)
```

Make these exact five first-argument substitutions in the existing declarations; retain their current local names and loop bodies:

```ts
const creates = requiredCollection(payload, 'worldbuilding').map(normalizeWorldbuilding)
```

```ts
const creates = requiredCollection(payload, 'characters').map(normalizeCharacterCreate)
```

```ts
const updates = requiredCollection(payload, 'character_updates').map(normalizeCharacterUpdate)
```

```ts
const creates = requiredCollection(payload, 'settings').map(normalizeSetting)
```

```ts
const usages = requiredCollection(payload, 'chapter_setting_usage').map(item => {
```

Finally change the summary read:

```ts
const summaryValue = payload.repair_summary
```

Do not change any validation order after normalization, any error code, any acceptance shape, or any commit behavior.

- [ ] **Step 4: Run the focused suite and verify GREEN**

```bash
cd ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures, including equality with the canonical payload and original-input immutability.

- [ ] **Step 5: Add fail-closed tests for partial, unknown, wrong-type, and empty shapes**

Add this test beside the recovery regression:

```ts
test('does not lift partial, unknown, wrong-type, or empty material section shapes', () => {
  const plan = resolveMaterialRepairPlan({
    preflight: { checks: [
      { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
      { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' },
    ] },
  }, ['ending_hook', 'worldbuilding'])
  const existing = existingSnapshot({
    characterNames: new Set(),
    settingKeys: new Set(),
  })
  const worldbuilding = [{ world_summary: '零点档案会显示未来死亡记录。' }]

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload: {
      chapter_patch: {
        ending_hook: '字迹变成林砚自己的笔迹。',
        worldbuilding,
      },
      repair_summary: '根级摘要与误嵌套分区混用。',
    },
    existing,
  }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload: {
      chapter_patch: {
        ending_hook: '字迹变成林砚自己的笔迹。',
        worldbuilding,
        mystery_section: [],
      },
    },
    existing,
  }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload: {
      chapter_patch: {
        ending_hook: '字迹变成林砚自己的笔迹。',
        worldbuilding: '不是数组',
      },
    },
    existing,
  }), 'MATERIAL_REPAIR_INVALID')

  expectContractError(() => prepareMcpMaterialRepairMutation({
    plan,
    payload: { chapter_patch: { worldbuilding } },
    existing,
  }), 'MATERIAL_REPAIR_INCOMPLETE')
})
```

- [ ] **Step 6: Run the focused guard suite**

```bash
cd ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures. The exact-wrapper regression passes, while all four broader shapes retain their existing typed failures.

- [ ] **Step 7: Run adjacent stage and service tests**

```bash
cd ui/server
bun test \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: zero failures. Existing root-brace recovery, Provider-neutral prompt checks, API model isolation, and GenerationSource behavior remain unchanged.

- [ ] **Step 8: Commit the two reviewed material files exactly**

```bash
git add -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): normalize material repair sections"
```

Expected: the staged set contains exactly the two material contract files. The two protected configuration files remain unstaged.

### Task 3: Perform two-stage review and complete automated verification

**Files:**
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.ts`
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`
- Verify only after review fixes; create no generated repository files.

- [ ] **Step 1: Run the spec-compliance review**

Dispatch a fresh reviewer against the approved design and the focused implementation commit. Require an explicit `✅ Spec compliant` or a list of Missing, Extra, and Incorrect items. Verify all of these properties:

- activation requires exactly one top-level `chapter_patch`;
- only the six approved direct child fields are lifted;
- unknown fields survive to fail downstream;
- no input value is rewritten or mutated;
- full existing material validation runs after lifting;
- no Provider, Adapter, Agent, model, retry, Session, API, or other-stage branch is added.

- [ ] **Step 2: Resolve every spec issue and re-review**

Return any issue to the same implementation agent. Rerun the focused suite, commit the fix to the same feature sequence, and ask the spec reviewer to re-check until it reports compliance.

- [ ] **Step 3: Run the code-quality review only after spec compliance**

Dispatch a fresh quality reviewer. Require Critical/Important/Minor classification and exact file-line evidence. Critical and Important findings must be fixed and re-reviewed; optional Minor findings may be recorded.

- [ ] **Step 4: Run all MCP and GenerationSource tests**

```bash
cd ui/server
bun test src/mcp src/novel-writing-service/generation-source src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures.

- [ ] **Step 5: Run the complete Server and Web suites**

```bash
cd ui/server
bun test
```

```bash
cd ui/web
bun test
```

Expected: both commands exit 0 with zero failed tests.

- [ ] **Step 6: Run repository checks, builds, and diff audits**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git diff --check
git diff --cached --check
git status --short --branch
```

Expected: boundary checks, Server build, and Web build exit 0. The protected files may remain modified but are not staged.

### Task 4: Repeat real page acceptance once per action

**Files:**
- Verify workspace: `/tmp/mangaforge-buda-acceptance-a.lWJwW2`
- Verify project ID `4`, chapter ID `4`.
- Do not modify repository configuration or credentials.

- [ ] **Step 1: Restart only the local Server with the new material normalizer**

Resolve the exact process listening on `127.0.0.1:8787`, verify its command belongs to this repository, terminate only that process, and start:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
HOST=127.0.0.1 bun run dev
```

Keep the existing Vite process on port `5173`. Verify:

```bash
curl -fsS http://127.0.0.1:8787/api/status
```

Expected: `ok` is true and `workspace` is `/tmp/mangaforge-buda-acceptance-a.lWJwW2`.

- [ ] **Step 2: Establish a terminal, zero-write, zero-quarantine baseline**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars, (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows FROM chapters WHERE id=4; SELECT count(*) AS running_artifacts FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 AND status='running'; SELECT count(*) AS running_runs FROM runs WHERE project_id=4 AND status IN ('queued','running','cancel_requested');"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected before retry: material counts and prose remain zero, no run or artifact is active, and quarantine count is zero. Previous failed tasks remain historical evidence.

- [ ] **Step 3: Trigger exactly one material repair from the page**

Use the in-app browser at `http://127.0.0.1:5173/novel/workspace/4`. Reload after the Server restart and click `补齐材料` exactly once. Record only the new Task and Session suffixes; do not expose credentials or full remote identities. Do not click again while the task is pending.

Expected: API/MCP source controls are disabled while running, the new artifact source is `mcp`, and one independent Session is attached.

- [ ] **Step 4: Verify material task-level success, writes, and strict readiness**

Wait for the single task to reach a terminal state. Do not treat a successful stage artifact as task success; confirm the corresponding `mcp_chapter_task` run is `success`.

```bash
curl -fsS 'http://127.0.0.1:8787/api/novel/projects/4/truth-file?chapter_id=4' | jq '{ready:.truth_file.context_trace.preflight.ready,strict_ready:.truth_file.context_trace.preflight.strict_ready,missing:.truth_file.context_trace.preflight.missing}'
```

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows; SELECT substr(task_id,-8) AS task_suffix, stage, status, source, substr(session_id,-8) AS session_suffix FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 ORDER BY id DESC LIMIT 1; SELECT status, error_message FROM runs WHERE project_id=4 AND run_type='mcp_chapter_task' ORDER BY id DESC LIMIT 1;"
```

Expected: every material count is positive, `strict_ready` is true, missing high-severity rows are empty, the material artifact and task both succeeded with source `mcp`, and quarantine remains zero. The refreshed page shows an increased material score and an enabled `生成正文` action.

- [ ] **Step 5: Trigger chapter prose exactly once from the page**

Click the enabled `生成正文` action exactly once. Keep source controls untouched and do not trigger a second generation while any stage is active. Wait for the full chapter chain to terminate.

- [ ] **Step 6: Verify independent Sessions, unique MCP source, prose, and quarantine**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars FROM chapters WHERE id=4; SELECT substr(task_id,-8) AS task_suffix, count(*) AS stage_count, count(DISTINCT session_id) AS distinct_sessions, group_concat(DISTINCT source) AS sources, sum(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success_count FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 GROUP BY task_id ORDER BY max(id) DESC LIMIT 2;"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: chapter prose is non-empty; material and prose use different Task IDs; every prose-chain artifact source is only `mcp`; each actual remote stage has its own distinct non-empty Session; no API model source is mixed in; quarantine count does not increase.

### Task 5: Final cumulative review, commit, and authorized main push

**Files:**
- Review all commits and remaining working-tree MCP changes since `origin/main`.
- Never stage `ui/server/.workspace-config.json` or `workspace/assets.json`.

- [ ] **Step 1: Dispatch a final reviewer for the complete unpushed MCP implementation**

Review `origin/main..HEAD` plus remaining unstaged source/test diffs against:

- independent Session per MCP stage;
- unique GenerationSource for the complete chapter chain;
- Provider-neutral orchestration with Buda only as Adapter;
- material context snapshot and atomic commit contracts;
- Drive synchronization and stability behavior;
- exact root-brace and exact root-section recovery boundaries;
- unchanged API model behavior;
- protected-file exclusion.

Resolve every Critical or Important issue and rerun affected tests before continuing.

- [ ] **Step 2: Re-run fresh final verification after all review fixes**

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

Expected: zero failed tests, checks and builds exit 0, and only intentional remaining MCP files plus the two protected local files are modified.

- [ ] **Step 3: Commit any remaining reviewed MCP source files explicitly**

If the four current MCP runtime/Drive files remain uncommitted after the material commit, stage them by exact path:

```bash
git add -- \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts
git diff --cached --check
git diff --cached --name-only
```

Verify the staged list contains no protected file, then commit:

```bash
git commit -m "fix(mcp): stabilize Agent discovery and Drive verification"
```

Do not use `git add -A` or `git add .`.

- [ ] **Step 4: Push the authorized `main` branch**

```bash
git push origin main
git status --short --branch
```

Expected: push succeeds, `main` has no ahead/behind count relative to `origin/main`, and the two protected files remain local-only modifications.
