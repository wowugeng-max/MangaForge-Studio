# MangaForge Pre-Store Final Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent v2 quality scores, late Story State checks, and Memory extraction from admitting a chapter with current-chapter structural or canonical continuity failures.

**Architecture:** Build one final decision by merging v2 quality evidence with legacy structured checks, add a deterministic canonical-name conflict scanner fed by prior chapters, then prepare Story State without writes and atomically commit the accepted chapter and prepared state through one `writeStore()` transaction. Store Memory only after that commit and filter meaningless extracted facts at the Memory Palace boundary.

**Tech Stack:** Bun, TypeScript, Express service modules, `bun:sqlite`, Bun test, Python Memory Palace helper.

---

### Task 1: Merge v2 and structured quality evidence

**Files:**
- Modify: `ui/server/src/routes/novel-route-utils.ts`
- Test: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Add failing tests for the v2 early-return bypass**

Add tests that create a review with `prose_quality_v2.decision.passed=true` plus: (a) `quality_audit_checks:[{status:'fail'}]`; (b) an undelivered current-chapter receipt; and (c) a pure next-chapter carryover receipt. Assert (a) and (b) fail while (c) passes.

```ts
const decision = getQualityGateDecision(project, {
  prose_quality_v2: { decision: { passed: true, approvable: true, score: 92, hard_failures: [], advisory_failures: [] } },
  quality_audit_checks: [{ key: 'pre_store_structural_sync', status: 'fail', label: '细纲兑现未闭环' }],
  next_chapter_quality_plan: usablePlan,
})
expect(decision.passed).toBe(false)
expect(decision.hard_failures).toEqual(expect.arrayContaining([
  expect.objectContaining({ key: 'structured_quality_gate' }),
]))
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-task1 bun test ui/server/src/routes/novel-writing-service.test.ts -t 'v2 final decision'
```

Expected: failures show v2 `passed=true` ignores structured failures.

- [ ] **Step 3: Replace the v2 early return with merged evidence**

In `getQualityGateDecision()`, compute structured failures, current-chapter undelivered receipts, next-plan status, and safety before either branch. For v2 reviews, append normalized hard failures and recompute `passed` and `approvable`:

```ts
const supplementalHardFailures = [
  ...failedStructuredChecks.map(message => ({ key: 'structured_quality_gate', message, source: 'deterministic' })),
  ...undeliveredDeliveryRiskReceipts.map(message => ({ key: 'delivery_risk_receipt', message, source: 'deterministic' })),
  ...(missingNextChapterQualityPlan ? [{ key: 'next_chapter_quality_plan', message: '下一章质量续航计划缺失', source: 'deterministic' }] : []),
  ...safetyReasons.map(message => ({ key: 'reference_safety', message, source: 'deterministic' })),
]
const hardFailures = dedupeQualityHardFailures([
  ...asArray(decision.hard_failures),
  ...supplementalHardFailures,
])
return {
  ...decision,
  hard_failures: hardFailures,
  passed: decision.passed === true && hardFailures.length === 0,
  approvable: decision.approvable === true && supplementalHardFailures.length === 0,
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2. Expected: all matching tests pass.

### Task 2: Add deterministic canonical proper-name continuity

**Files:**
- Create: `ui/server/src/novel-writing/canonical-continuity.ts`
- Create: `ui/server/src/novel-writing/canonical-continuity.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`

- [ ] **Step 1: Write RED tests using the saved real candidate wording**

Cover:

```ts
const index = buildCanonicalSurfaceIndex({
  previous_chapters: [
    { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
    { chapter_no: 3, chapter_text: '踩在了临江市第一人民医院大厅的旧石板上。' },
  ],
})
expect(scanCanonicalContinuityConflicts(
  '【江城市第一人民医院】这正是他以前待过的那家医院。',
  index,
)).toEqual(expect.arrayContaining([
  expect.objectContaining({ key: 'canonical_proper_noun_conflict', canonical: '临江市第一人民医院', observed: '江城市第一人民医院' }),
]))
```

Also assert no conflict for explicitly separate institutions: `江城市第二人民医院` or wording that clearly introduces a different hospital.

- [ ] **Step 2: Run canonical tests and verify RED**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-task2 bun test ui/server/src/novel-writing/canonical-continuity.test.ts
```

Expected: module missing.

- [ ] **Step 3: Implement a bounded canonical index and high-confidence scanner**

Expose:

```ts
export type CanonicalSurfaceIndex = {
  stable_entities: Array<{ surface: string; suffix: string; chapters: number[] }>
}

export function buildCanonicalSurfaceIndex(input: {
  previous_chapters?: any[]
  canon_facts?: any[]
  setting_entities?: any[]
}): CanonicalSurfaceIndex

export function scanCanonicalContinuityConflicts(
  text: string,
  index: CanonicalSurfaceIndex,
): Array<{ key: 'canonical_proper_noun_conflict'; canonical: string; observed: string; evidence: string; message: string }>
```

Only index proper-name shapes with stable suffixes such as `第一人民医院`, `战略防卫局`, `制药厂`, and require either two prior chapter occurrences or an explicit canon/setting source. Only fail when the current text contains a different prefix for the same stable suffix and asserts identity with language such as `正是|就是|同一家|原来是`.

- [ ] **Step 4: Wire the index into chapter context and deterministic scan**

Add `canonical_surface_index` to `buildChapterContextPackage()` using all prior prose chapters plus setting/canon sources. Add scanner findings to `scanProseForQualityLoop()` hard failures.

- [ ] **Step 5: Verify real-candidate offline regression GREEN**

Read chapter 11 text from the saved candidate SQLite in the test and assert `canonical_proper_noun_conflict` before any store hook.

### Task 3: Prepare Story State without writes and gate its current-chapter deltas

**Files:**
- Create: `ui/server/src/novel-writing/prepared-story-state.ts`
- Create: `ui/server/src/novel-writing/prepared-story-state.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`

- [ ] **Step 1: Write failing tests proving prepare is read-only**

Inject counters for project, character, setting, usage, review, and Memory writes. Call the preparation path and assert every counter remains zero while normalized state and sync reports are returned.

- [ ] **Step 2: Define the prepared update boundary**

```ts
export type PreparedStoryStateUpdate = {
  state_delta: any
  next_reference_config: any
  character_updates: any[]
  setting_updates: any[]
  storyline_updates: any[]
  sync_reports: {
    character_state_delta_sync: any
    timeline_delta_sync: any
    chapter_handoff_delta_sync: any
    state_delta_completeness: any
  }
  hard_failures: Array<{ key: string; message: string }>
  payload: any
}
```

Move model invocation, payload normalization, merged state calculation, and sync-report construction from `updateStoryStateMachine()` into `prepareStoryStateUpdate()`. Do not call any persistence function there.

- [ ] **Step 3: Classify only current-chapter state omissions as hard**

Create hard failures for missing planned character state, asset/setting change, timeline change, or chapter handoff. Keep documentation-only or explicitly next-chapter improvements advisory.

- [ ] **Step 4: Integrate preparation before final decision**

Call prepare after the prose quality loop and pre-store structural reports, append `prepared.hard_failures` to `qualityGateReview.quality_audit_checks`, then call the merged `getQualityGateDecision()`.

- [ ] **Step 5: Run prepared-state tests GREEN**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-task3 bun test ui/server/src/novel-writing/prepared-story-state.test.ts
```

### Task 4: Atomically commit accepted chapter and prepared Story State

**Files:**
- Modify: `ui/server/src/novel.ts`
- Test: `ui/server/src/novel.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`

- [ ] **Step 1: Write RED atomicity tests**

Test that a thrown validation error before commit leaves chapters, chapter versions, projects, characters, settings, usages, and reviews byte-for-byte logically unchanged. Test that one accepted commit updates them together through one `writeStore()` call.

- [ ] **Step 2: Add one store-level acceptance commit**

Expose an API that mutates one in-memory `NovelStore` and calls transactional `writeStore()` once:

```ts
export async function commitNovelChapterAcceptance(activeWorkspace: string, input: {
  chapter_id: number
  chapter_patch: Partial<NovelChapterRecord>
  version_source: NovelChapterVersionSource
  project_patch?: Partial<NovelProjectRecord>
  character_updates?: Array<{ id: number; patch: Partial<NovelCharacterRecord> }>
  setting_updates?: Array<{ id: number; patch: Partial<NovelSettingEntityRecord> }>
  usage_updates?: Array<{ id: number; patch: Partial<NovelChapterSettingUsageRecord> }>
  reviews?: Partial<NovelReviewRecord>[]
}): Promise<{ chapter: NovelChapterRecord; project: NovelProjectRecord | null }>
```

Reuse existing normalizers and `createChapterVersionRecord()`. Do not call public update functions from inside this commit.

- [ ] **Step 3: Replace pre-commit persistence in the generation service**

Remove review writes that occur before final acceptance; keep them in memory as records. On hard failure, write only the compact failed run via the route layer. On pass, call `commitNovelChapterAcceptance()` once with the chapter patch, prepared Story State patches, and success reviews.

- [ ] **Step 4: Keep Memory strictly post-commit**

Call `storeChapterProseMemory()` only after the atomic commit succeeds. Preserve its nonfatal warning behavior for infrastructure failure.

- [ ] **Step 5: Verify the saved real candidate causes zero persistence**

Use `/private/tmp/mangaforge-ch11-final-real-20260711-184311/candidate-gate-passed-but-continuity-failed.sqlite` as the source of candidate text and the baseline DB as target. Assert no chapter/version/project/review/Memory changes after rejection.

### Task 5: Filter meaningless Memory facts

**Files:**
- Modify: `scripts/novel-memory.py`
- Create: `scripts/test_novel_memory.py`
- Modify: `ui/server/src/memory-service.ts`
- Test: `ui/server/src/llm/executor.chain.test.ts`

- [ ] **Step 1: Add RED Python tests**

Test a fact batch containing entities `他`, `而`, `但`, `江哲`, and `临江市第一人民医院`. Assert the first three are rejected and the last two retained. Also reject empty attributes/values and exact duplicates.

- [ ] **Step 2: Implement fact validation before insertion**

Add:

```py
MEANINGLESS_FACT_ENTITIES = {'他', '她', '它', '而', '但', '却', '又', '并', '且'}

def is_meaningful_fact(fact: Dict, content: str) -> bool:
    entity = str(fact.get('entity', '')).strip()
    attribute = str(fact.get('attribute', '')).strip()
    value = str(fact.get('value', '')).strip()
    return (
        len(entity) >= 2
        and entity not in MEANINGLESS_FACT_ENTITIES
        and bool(attribute)
        and bool(value)
        and entity in content
    )
```

Deduplicate `(entity, attribute, value)` before database insertion.

- [ ] **Step 3: Run Python and Bun Memory tests GREEN**

```bash
python3 -m unittest scripts/test_novel_memory.py
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-task5 bun test ui/server/src/llm/executor.chain.test.ts
```

### Task 6: Full verification and completion audit

**Files:**
- Modify only if a verification command reveals a proven regression.

- [ ] **Step 1: Run all focused tests**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-focused bun test \
  ui/server/src/novel-writing/canonical-continuity.test.ts \
  ui/server/src/novel-writing/prepared-story-state.test.ts \
  ui/server/src/novel-writing/pre-store-structural-sync-gate.test.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts \
  ui/server/src/routes/novel-writing-service.test.ts \
  ui/server/src/novel.test.ts \
  ui/server/src/llm/executor.chain.test.ts
```

- [ ] **Step 2: Run complete server and web verification**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-full bun run test:novel-server
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-web bun run test:writing-cockpit
bun run build:server
bun run build:web
git diff --check
```

- [ ] **Step 3: Audit live data**

Confirm chapter 11 remains empty, version 1, run max 394, Provider unchanged, and novel/Memory logical dumps equal the saved pre-request baseline. Do not issue another real model request.

- [ ] **Step 4: Review the implementation against every design acceptance criterion**

Record evidence for merged v2 decision, canonical rejection, read-only Story State preparation, atomic commit, failure zero-pollution, Memory filtering, full tests, and builds before claiming completion.
