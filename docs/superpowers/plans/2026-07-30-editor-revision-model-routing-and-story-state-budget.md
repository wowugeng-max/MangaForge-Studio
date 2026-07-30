# Editor Revision Model Routing and Story State Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one selected model through editor-revision post-processing, make exact current-chapter Story State output tokens project-configurable, and safely regenerate only truncated/invalid prepared state when the user continues a failed run.

**Architecture:** Extend `reference_config.editor_revision` and its existing GET/PUT API with `story_state_max_tokens`, snapshot the effective value beside the timeout, and pass it only to the exact Story State prepare call. Parsing remains fail-closed and each attempt still makes one application-level Story State call; only an explicit retry may discard a prepared result proven invalid or incomplete, allowing the latest project budget to take effect without repeating prose, commit, or quality.

**Tech Stack:** TypeScript, Bun, Express, SQLite, React, Ant Design, Bun test, Vite.

---

## File map

- `ui/server/src/novel/editor-revision-runtime-config.ts`: canonical timeout and Story State budget normalization.
- `ui/server/src/routes/novel-project-config-routes.ts`: partial project-config GET/PUT API.
- `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`: project setting controls.
- `ui/server/src/routes/novel-editor/editor-revision-contract.ts`: durable runtime-config type.
- `ui/server/src/novel/repos/editor-revision-runs.ts`: checkpoint validation and retry cleanup.
- `ui/server/src/routes/novel-editor/single-chapter-story-state.ts`: exact prepare budget plumbing.
- `ui/server/src/routes/novel-editor/revision-worker.ts`: snapshot, model routing, and orchestration.
- Matching `*.test.ts` files beside each unit provide TDD coverage.

### Task 1: Lock selected-model routing

**Files:**
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`

- [ ] **Step 1: Write the failing test**

Add `modelId?: number` to `createHarness`, copy it to `input.model_id`, and add:

```ts
test('forwards the selected revision model to post-quality review', async () => {
  const checkpoint = persistedCheckpoint()
  const harness = createHarness({ checkpoint, modelId: 36 })
  installMatchingCommitMarker(harness)
  const worker = harness.worker()
  await worker.start(workspace)
  await worker.waitForIdle()
  expect(harness.qualityCalls).toHaveLength(1)
  expect(harness.qualityCalls[0].at(-1)).toMatchObject({ model_id: 36 })
})
```

- [ ] **Step 2: Verify RED**

```bash
cd ui/server && bun test src/routes/novel-editor/revision-worker.test.ts -t "forwards the selected revision model"
```

Expected: FAIL because quality options omit `model_id`.

- [ ] **Step 3: Implement the minimal fix**

Add to `runPostQuality` quality options:

```ts
model_id: input.model_id,
```

- [ ] **Step 4: Verify GREEN and commit**

Run Step 2 again; expect 1 PASS. Then:

```bash
git add ui/server/src/routes/novel-editor/revision-worker.ts ui/server/src/routes/novel-editor/revision-worker.test.ts
git commit -m "fix(novel): keep revision model for post quality"
```

### Task 2: Add canonical output-budget configuration

**Files:**
- Modify: `ui/server/src/novel/editor-revision-runtime-config.test.ts`
- Modify: `ui/server/src/novel/editor-revision-runtime-config.ts`

- [ ] **Step 1: Write failing normalizer tests**

Add expectations for constants 1,000 / 262,144 / 9,000 and normalization:

```ts
expect(normalizeEditorRevisionStoryStateMaxTokens(undefined)).toBe(9_000)
expect(normalizeEditorRevisionStoryStateMaxTokens('12000')).toBe(9_000)
expect(normalizeEditorRevisionStoryStateMaxTokens(999)).toBe(1_000)
expect(normalizeEditorRevisionStoryStateMaxTokens(12_345.9)).toBe(12_345)
expect(normalizeEditorRevisionStoryStateMaxTokens(300_000)).toBe(262_144)
expect(resolveEditorRevisionRuntimeConfig({ reference_config: {} })).toEqual({
  timeout_seconds: 600,
  story_state_max_tokens: 9_000,
})
```

- [ ] **Step 2: Verify RED**

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts
```

Expected: FAIL because the token normalizer is absent.

- [ ] **Step 3: Implement one canonical normalizer**

```ts
export const MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 1_000
export const MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 262_144
export const DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 9_000

export function normalizeEditorRevisionStoryStateMaxTokens(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS
  }
  return Math.min(
    MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS,
    Math.max(MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS, Math.trunc(value)),
  )
}
```

Extend `EditorRevisionRuntimeConfig` and `resolveEditorRevisionRuntimeConfig` with `story_state_max_tokens`, and export a focused resolver.

- [ ] **Step 4: Verify GREEN and commit**

Run Step 2; expect all PASS. Then:

```bash
git add ui/server/src/novel/editor-revision-runtime-config.ts ui/server/src/novel/editor-revision-runtime-config.test.ts
git commit -m "feat(novel): configure revision story state budget"
```

### Task 3: Extend the project API and settings UI

**Files:**
- Modify: `ui/server/src/routes/novel-project-config-routes.test.ts`
- Modify: `ui/server/src/routes/novel-project-config-routes.ts`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`

- [ ] **Step 1: Write failing route tests**

Require GET to return both fields. Add a Story-State-only PUT that starts from timeout 420 and sibling config, sends `{ story_state_max_tokens: 262144 }`, and expects:

```ts
expect(response.body.config).toEqual({
  timeout_seconds: 420,
  story_state_max_tokens: 262_144,
})
expect(stored?.reference_config).toMatchObject({
  editor_revision: {
    timeout_seconds: 420,
    story_state_max_tokens: 262_144,
    custom: 'keep',
  },
  story_state: { current_time: 'night' },
})
```

Also assert a present string or non-finite token value returns 400.

- [ ] **Step 2: Verify route RED**

```bash
cd ui/server && bun test src/routes/novel-project-config-routes.test.ts
```

Expected: FAIL because GET omits the field and PUT requires timeout.

- [ ] **Step 3: Implement partial validated PUT**

Detect field presence separately:

```ts
const requestConfig = req.body?.config || req.body || {}
const hasTimeout = requestConfig.timeout_seconds !== undefined
const hasStoryStateTokens = requestConfig.story_state_max_tokens !== undefined
if (!hasTimeout && !hasStoryStateTokens) {
  return res.status(400).json({ error: 'at least one editor revision setting is required' })
}
```

Validate each present field as a finite number. Inside `mutateNovelProjectReferenceConfig`, resolve current values from `currentConfig`, override only present values, preserve all siblings, and return the complete normalized pair.

- [ ] **Step 4: Verify route GREEN**

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts src/routes/novel-project-config-routes.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Write failing UI tests**

Require:

```ts
expect(normalizeProjectStoryStateMaxTokens(undefined)).toBe(9_000)
expect(normalizeProjectStoryStateMaxTokens(300_000)).toBe(262_144)
expect(isStoryStateMaxTokensValid(1_000)).toBe(true)
expect(isStoryStateMaxTokensValid(64_000.5)).toBe(false)
expect(buildEditorRevisionConfigPayload(420, 12_000)).toEqual({
  config: { timeout_seconds: 420, story_state_max_tokens: 12_000 },
})
```

Source wiring assertions must find `故事状态输出上限`, `min={1000}`, `max={262144}`, `step={512}`, and a `> 64_000` warning condition.

- [ ] **Step 6: Verify UI RED**

```bash
cd ui/web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: FAIL because the helpers and control are absent.

- [ ] **Step 7: Implement UI and verify GREEN**

Hydrate/save both values, validate integers in the approved ranges, and render a non-blocking warning above 64,000. Keep save disabled on load failure or invalid input.

```bash
cd ui/web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
cd ../.. && bun run build:web
```

Expected: tests and build pass.

- [ ] **Step 8: Commit API and UI**

```bash
git add ui/server/src/routes/novel-project-config-routes.ts ui/server/src/routes/novel-project-config-routes.test.ts ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts
git commit -m "feat(novel): expose story state revision budget"
```

### Task 4: Snapshot and forward the budget

**Files:**
- Modify: `ui/server/src/routes/novel-editor/editor-revision-contract.ts`
- Modify: `ui/server/src/novel/repos/editor-revision-runs.ts`
- Modify: `ui/server/src/novel/editor-revision-runtime-config.test.ts`
- Modify: `ui/server/src/routes/novel-editor/single-chapter-story-state.ts`
- Modify: `ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`

- [ ] **Step 1: Write failing checkpoint tests**

Accept legacy `{ llm_timeout_ms: 420000 }` and canonical `{ llm_timeout_ms: 420000, story_state_max_tokens: 12000 }`; reject 999, 262145, fractional, and non-finite token snapshots.

- [ ] **Step 2: Write failing forwarding tests**

Capture exact Story State agent options and assert `maxTokens: 12000` reaches one model call. In the worker harness configure timeout 420 and tokens 12,000, then assert:

```ts
expect(harness.checkpoint().runtime_config).toEqual({
  llm_timeout_ms: 420_000,
  story_state_max_tokens: 12_000,
})
expect(harness.prepareCalls[0][1]).toMatchObject({
  maxTokens: 12_000,
  modelId: harness.input.model_id,
})
```

Add a legacy snapshot test proving an old timeout is preserved while only the missing token field is filled.

- [ ] **Step 3: Verify RED**

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts src/routes/novel-editor/single-chapter-story-state.test.ts src/routes/novel-editor/revision-worker.test.ts
```

Expected: failures for validation, forwarding, and snapshot shape.

- [ ] **Step 4: Implement checkpoint compatibility**

```ts
runtime_config?: {
  llm_timeout_ms: number
  story_state_max_tokens?: number
}
```

Keep timeout required when the object exists; validate the optional token field against shared constants. Replace the timeout-only resolver with one that reuses stored fields, fills only missing fields from project config, writes only when needed, and returns both values.

- [ ] **Step 5: Implement exact prepare plumbing**

Add `maxTokens?: number` to `SingleChapterStoryStateInput` and pass:

```ts
maxTokens: input.maxTokens,
retryOnBlockedTransport: false,
allowDeterministicFallback: false,
```

Pass the snapshotted value from `runStoryState`. Do not enable automatic application retries.

- [ ] **Step 6: Verify GREEN and commit**

Run Step 3; expect all PASS. Then:

```bash
git add ui/server/src/routes/novel-editor/editor-revision-contract.ts ui/server/src/novel/repos/editor-revision-runs.ts ui/server/src/novel/editor-revision-runtime-config.test.ts ui/server/src/routes/novel-editor/single-chapter-story-state.ts ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts ui/server/src/routes/novel-editor/revision-worker.ts ui/server/src/routes/novel-editor/revision-worker.test.ts
git commit -m "feat(novel): snapshot exact story state budget"
```

### Task 5: Refresh only invalid prepared state on explicit continue

**Files:**
- Modify: `ui/server/src/novel/repos/editor-revision-runs.test.ts`
- Modify: `ui/server/src/novel/repos/editor-revision-runs.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`

- [ ] **Step 1: Write a failing durable retry test**

Build a failed `sync_current_story_state` checkpoint with completed prose/quality, token snapshot 4500, and prepared hard failures `story_state_invalid_payload` and `story_state_transport_incomplete`. After retry require:

```ts
expect(retriedCheckpoint.phase).toBe('sync_current_story_state')
expect(retriedCheckpoint.phases.post_quality.status).toBe('completed')
expect(retriedCheckpoint.phases.sync_current_story_state.status).toBe('pending')
expect(retriedCheckpoint.runtime_config).toEqual({ llm_timeout_ms: 600_000 })
expect(retriedCheckpoint.story_state).toBeUndefined()
```

Add a control case showing valid prepared state and its budget remain on unrelated failure.

- [ ] **Step 2: Verify RED**

```bash
cd ui/server && bun test src/novel/repos/editor-revision-runs.test.ts -t "refreshes only invalid prepared Story State"
```

Expected: FAIL because retry preserves the bad prepared state.

- [ ] **Step 3: Implement the narrow predicate**

Only when resuming `sync_current_story_state` and `story_state.prepared.hard_failures` contains either approved blocking key, delete `next.story_state` and `next.runtime_config.story_state_max_tokens`. Preserve timeout, candidate, commit evidence, completed quality, and earlier phases.

- [ ] **Step 4: Add worker no-repeat coverage**

Resume with a project budget of 12,000 and assert one prepare call receives it while:

```ts
expect(harness.revisionCalls).toHaveLength(0)
expect(harness.qualityCalls).toHaveLength(0)
expect(harness.commitCalls()).toBe(0)
expect(harness.versionWrites()).toBe(0)
```

- [ ] **Step 5: Verify GREEN and commit**

```bash
cd ui/server && bun test src/novel/repos/editor-revision-runs.test.ts src/routes/novel-editor/revision-worker.test.ts
git add ui/server/src/novel/repos/editor-revision-runs.ts ui/server/src/novel/repos/editor-revision-runs.test.ts ui/server/src/routes/novel-editor/revision-worker.test.ts
git commit -m "fix(novel): refresh truncated story state receipts"
```

Expected: all tests pass before commit.

### Task 6: Full verification and real run 757 recovery

**Files:**
- Verify only; never stage `workspace/assets.json`, `workspace/zhuque-inputs/`, or `workspace/zhuque-reports/`.

- [ ] **Step 1: Run all focused suites and builds**

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts src/routes/novel-project-config-routes.test.ts src/novel/repos/editor-revision-runs.test.ts src/routes/novel-editor/single-chapter-story-state.test.ts src/routes/novel-editor/revision-worker.test.ts
cd ../web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
cd ../.. && bun run build:server && bun run build:web
```

Expected: 0 failures and both builds exit 0.

- [ ] **Step 2: Record live safety snapshots**

Record run 757 state, chapter 61 candidate/text hash, `updated_at`, version count, and all 29 followers' `id:updated_at:length(chapter_text)` fingerprint. Require prose and quality already completed and Story State failed with the known bad prepared result.

- [ ] **Step 3: Restart verified backend and save config**

Resolve the exact 8787 listener, stop it, and start:

```bash
PORT=8787 HOST=localhost bun "/Users/ruiyaosong/MangaForge-Studio/ui/server/src/index.ts"
```

PUT project 3 config with `story_state_max_tokens: 9000`, preserving timeout.

- [ ] **Step 4: Continue the same run and monitor**

POST `/api/novel/editor-revisions/757/retry`. Require action `continue`, run ID 757, completed quality preserved, preferred model 36, and the configured Story State budget. If the model explicitly reaches the limit again, raise only this setting and continue the same run; never create a new revision or weaken admission.

- [ ] **Step 5: Verify live safety invariants**

Require chapter 61 text hash and version count unchanged, no new editor-revision commit, all follower fingerprints unchanged, no prose or quality model call during continuation, and a completed Story State receipt bound to run 757/chapter 61/candidate hash.

- [ ] **Step 6: Final repository audit**

```bash
git status --short --branch
git diff --check
git log --oneline origin/main..HEAD
```

Expected: only design, plan, implementation, and tests are committed; user workspace data remains unstaged.
