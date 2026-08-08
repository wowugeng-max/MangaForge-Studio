# MCP Material Chapter Blueprint Output Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Provider-neutral MCP material-repair prompt request the exact canonical chapter-blueprint structure that the existing production readiness gate already requires.

**Architecture:** Change only `buildMaterialRepairTask`: replace its opaque `chapter_blueprint: 'object?'` output hint with the canonical nested schema and add one explicit no-alias instruction. Keep response parsing, material normalization, business validation, atomic commit, GenerationSource, Adapter selection, Session lifecycle, and API-model behavior unchanged.

**Tech Stack:** TypeScript, Bun 1.3.13, bun:test, existing GenerationSource/MCP material contracts, SQLite acceptance workspace, React/Vite in-app page verification.

---

## Working Tree and File Structure

The user explicitly authorized implementation and push on the current `main` checkout. Do not create a feature branch or worktree.

- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.ts`: publish the exact Provider-neutral chapter-blueprint output schema and the no-alias instruction.
- Modify `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`: prove the final output-contract section contains all canonical fields and no noncanonical substitutes.
- Verify `ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts`: ensure the real MCP task compiler preserves the strengthened contract.
- Do not modify `missingChapterBlueprintSections`, response parsing, material mutation normalization, API model routing, Adapter selection, Session handling, retries, or persistence.
- Never stage or commit `ui/server/.workspace-config.json` or `workspace/assets.json`.
- Preserve the reviewed, uncommitted MCP changes in:
  - `ui/server/src/mcp/adapters/buda-drive.ts`
  - `ui/server/src/mcp/adapters/buda-drive.test.ts`
  - `ui/server/src/mcp/runtime.ts`
  - `ui/server/src/mcp/runtime.test.ts`

### Task 1: Capture the missing canonical blueprint prompt contract

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts:298-390`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Bind the final output-contract section in the existing authority-prompt test**

In `test('builds a bounded self-contained authority prompt with an exact JSON envelope', ...)`, immediately after `const task = buildMaterialRepairTask(...)` completes, add:

```ts
const outputContract = task.slice(task.lastIndexOf('【输出合同】'))
```

Replace:

```ts
expect(task.slice(task.lastIndexOf('【输出合同】'))).not.toContain('benchmark_recall_gaps')
```

with:

```ts
expect(outputContract).not.toContain('benchmark_recall_gaps')
```

- [ ] **Step 2: Add the failing canonical-field and no-alias assertions**

Place these assertions beside the existing output-envelope assertions:

```ts
expect(outputContract).not.toContain('"chapter_blueprint":"object?"')
for (const field of [
  'target_emotion',
  'opening_hook',
  'core_payoff',
  'content_outline',
  'cause',
  'development',
  'turn',
  'climax',
  'ending',
  'plot_lines',
  'mainline',
  'logic_line',
  'character_order',
  'beat_sequence',
  'cost_and_reward',
  'ending_contract',
  'next_chapter_pull',
]) {
  expect(outputContract).toContain(`"${field}"`)
}
for (const alias of [
  'five_part_summary',
  'multi_line_progression',
  'character_appearance_order',
  'event_function_tags',
  'cost_benefit',
  'unknowns',
]) {
  expect(outputContract).not.toContain(`"${alias}"`)
}
expect(task).toContain('chapter_blueprint 返回时必须使用输出合同中的标准 snake_case 字段')
```

The absence checks are scoped to the last `【输出合同】` section because authoritative input context may contain historical noncanonical fields that the generator must read but not reproduce.

- [ ] **Step 3: Run the focused test and verify RED**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: the strengthened prompt-contract test fails because the current contract still serializes `"chapter_blueprint":"object?"` and lacks the canonical nested fields or explicit instruction. Existing mutation-preparation tests remain green.

- [ ] **Step 4: Record that production code is still unchanged**

```bash
git diff -- ui/server/src/novel-writing-service/service/material-repair-contract.ts
```

Expected: no new prompt-schema implementation diff exists before the observed RED result.

### Task 2: Publish the exact Provider-neutral blueprint schema

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/material-repair-contract.ts:1100-1190`
- Test: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts`

- [ ] **Step 1: Replace the opaque chapter-blueprint output hint**

Inside `buildMaterialRepairTask`, replace:

```ts
chapter_blueprint: 'object?',
```

with:

```ts
chapter_blueprint: {
  target_emotion: 'non-empty string',
  opening_hook: 'non-empty string',
  core_payoff: 'non-empty string',
  content_outline: {
    cause: 'non-empty string',
    development: 'non-empty string',
    turn: 'non-empty string',
    climax: 'non-empty string',
    ending: 'non-empty string',
  },
  plot_lines: {
    mainline: 'non-empty string',
    logic_line: 'non-empty string',
  },
  character_order: ['character name'],
  beat_sequence: ['beat with function tag'],
  cost_and_reward: 'non-empty string',
  ending_contract: {
    next_chapter_pull: 'non-empty string',
  },
},
```

Do not add server-side aliases, mapping helpers, or validation changes.

- [ ] **Step 2: Add one explicit no-alias instruction**

Immediately after the existing `chapter_setting_usage` instruction, add:

```ts
'chapter_blueprint 返回时必须使用输出合同中的标准 snake_case 字段；five_part_summary、multi_line_progression、character_appearance_order、event_function_tags、cost_benefit 和根级 unknowns 均不能替代标准字段。',
```

Do not inspect `adapter_id`, `server_id`, Provider, Agent, account, or model identity.

- [ ] **Step 3: Run the focused suite and verify GREEN**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: zero failures, including the new canonical schema assertions and all existing material mutation tests.

- [ ] **Step 4: Run the real MCP prompt compiler test**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts
```

Expected: zero failures and the authoritative material JSON contract remains present after the real MCP compiler path.

- [ ] **Step 5: Audit and commit the exact implementation files**

```bash
git diff --check
git diff -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git add -- \
  ui/server/src/novel-writing-service/service/material-repair-contract.ts \
  ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): specify material blueprint output contract"
```

Expected: the commit contains exactly the two material contract files. Protected configuration and the four pre-existing MCP runtime/Drive files remain unstaged.

### Task 3: Review and automated verification

**Files:**
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.ts`
- Review: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`
- Verify only; create no generated repository files.

- [ ] **Step 1: Run a spec-compliance review**

Require an explicit `✅ Spec compliant` or exact Missing/Extra/Incorrect items. Verify:

- the final output envelope contains every canonical field from the design;
- the no-alias instruction is Provider-neutral;
- no alias normalization or readiness relaxation was added;
- API routing, response contracts, Adapter selection, Session lifecycle, retries, and persistence are unchanged;
- only the MCP material-task compiler consumes the strengthened prompt.

- [ ] **Step 2: Resolve every spec issue through RED-GREEN and re-review**

For each finding, add a failing regression test first, observe RED, implement the smallest correction, run the focused suites, commit exact files, and return the result to the same reviewer until compliant.

- [ ] **Step 3: Run an independent code-quality review**

Only after spec compliance, require Critical/Important/Minor classification with exact file-line evidence. Fix every Critical or Important item through RED-GREEN and re-review; avoid unrelated refactoring.

- [ ] **Step 4: Run adjacent MCP and GenerationSource tests**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/mcp-material-repair-prompt.test.ts \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: zero failures. API model isolation and MCP material parsing remain unchanged.

- [ ] **Step 5: Run complete suites and repository checks**

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
git diff --cached --check
git status --short --branch
```

Expected: all tests, checks, and builds exit 0. Protected files and the four intentional MCP runtime/Drive files remain unstaged.

### Task 4: Repeat real page acceptance exactly once per action

**Acceptance state:**
- Workspace: `/tmp/mangaforge-buda-acceptance-a.lWJwW2`
- Novel project ID: `4`
- Chapter ID: `4`
- Page: `http://127.0.0.1:5173/novel/workspace/4`
- Do not modify repository configuration or credentials.

- [ ] **Step 1: Restart only this repository's local Server**

Resolve `127.0.0.1:8787`, verify its process and cwd belong to this repository, terminate only that Server process tree, and start:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
HOST=127.0.0.1 bun run dev
```

Keep Vite on `5173`. Verify:

```bash
curl -fsS http://127.0.0.1:8787/api/status | jq '{ok,workspace}'
```

Expected: `ok` is true and `workspace` is `/tmp/mangaforge-buda-acceptance-a.lWJwW2`.

- [ ] **Step 2: Establish the terminal zero-write baseline**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars, (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows FROM chapters WHERE id=4; SELECT count(*) AS running_artifacts FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 AND status='running'; SELECT count(*) AS running_runs FROM runs WHERE project_id=4 AND status IN ('queued','running','cancel_requested','session_created');"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: prose and every material count are zero; no run or artifact is active; quarantine is zero. The earlier prompt-contract failure remains historical evidence only.

- [ ] **Step 3: Trigger exactly one new material repair from the page**

Use the in-app browser, reload after the Server restart, confirm MCP is the unique enabled source, and click `补齐材料` exactly once. Confirm source controls become disabled while running. Do not expose credentials or full Agent/Session identities, and do not click again while pending.

- [ ] **Step 4: Verify task-level material success and writes**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT (SELECT count(*) FROM worldbuilding WHERE project_id=4) AS world_rows, (SELECT count(*) FROM characters WHERE project_id=4) AS character_rows, (SELECT count(*) FROM setting_entities WHERE project_id=4) AS setting_rows, (SELECT count(*) FROM chapter_setting_usage WHERE project_id=4 AND chapter_id=4) AS usage_rows; SELECT substr(task_id,-8) AS task_suffix, stage, status, source, substr(session_id,-8) AS session_suffix, error_code FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 ORDER BY id DESC LIMIT 1; SELECT id,status,error_message FROM runs WHERE project_id=4 AND run_type='mcp_chapter_task' ORDER BY id DESC LIMIT 1;"
curl -fsS 'http://127.0.0.1:8787/api/novel/projects/4/truth-file?chapter_id=4' | jq '{ready:.truth_file.context_trace.preflight.ready,strict_ready:.truth_file.context_trace.preflight.strict_ready,missing:.truth_file.context_trace.preflight.missing}'
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: latest artifact and task are `success`; all material counts are positive; `strict_ready` is true; no high-severity missing item remains; quarantine is zero.

If the one task fails, stop without clicking again, preserve its evidence, and return to systematic root-cause analysis before any code change or remote retry.

- [ ] **Step 5: Trigger chapter prose exactly once**

Refresh page state, verify `生成正文` is enabled and MCP authority is unchanged, then click it exactly once. Do not switch sources or create a second task while any stage is active. Wait for the complete chain to terminate.

- [ ] **Step 6: Verify independent Sessions, unique MCP source, prose, and quarantine**

```bash
sqlite3 -header -column /tmp/mangaforge-buda-acceptance-a.lWJwW2/novel.sqlite "SELECT length(chapter_text) AS prose_chars FROM chapters WHERE id=4; SELECT substr(task_id,-8) AS task_suffix, count(*) AS stage_count, count(DISTINCT session_id) AS distinct_sessions, group_concat(DISTINCT source) AS sources, sum(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success_count FROM chapter_stage_artifacts WHERE project_id=4 AND chapter_id=4 GROUP BY task_id ORDER BY max(id) DESC LIMIT 2;"
jq 'length' /tmp/mangaforge-buda-acceptance-a.lWJwW2/mcp-agent-quarantines.json
```

Expected: prose is non-empty; material and prose have different Task IDs; all prose artifacts use `mcp`; every actual remote stage has a distinct non-empty Session; quarantine remains zero.

### Task 5: Final cumulative review, remaining MCP commit, and main push

**Files:**
- Review `origin/main..HEAD` and all remaining MCP source/test diffs.
- Never stage `ui/server/.workspace-config.json` or `workspace/assets.json`.

- [ ] **Step 1: Review the complete unpushed MCP implementation**

Require the final reviewer to cover unique GenerationSource, independent per-stage Sessions, Provider-neutral orchestration, material snapshot/atomic commit fences, Drive stability, bounded material recoveries, canonical blueprint prompt contract, unchanged API behavior, and protected-file exclusion. Resolve every Critical or Important finding through TDD.

- [ ] **Step 2: Run fresh final verification**

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

Expected: zero failed tests; checks and builds exit 0; only the four reviewed MCP runtime/Drive files and two protected local files remain modified.

- [ ] **Step 3: Commit the remaining reviewed MCP files exactly**

```bash
git add -- \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts \
  ui/server/src/mcp/runtime.ts \
  ui/server/src/mcp/runtime.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): stabilize Agent discovery and Drive verification"
```

Expected: exactly those four files are committed; protected files remain unstaged.

- [ ] **Step 4: Push authorized `main`**

```bash
git push origin main
git status --short --branch
```

Expected: push succeeds; `main` is synchronized with `origin/main`; protected files remain local-only modifications.
