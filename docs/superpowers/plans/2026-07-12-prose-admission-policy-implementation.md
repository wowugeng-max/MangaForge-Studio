# MangaForge Soft Prose Admission Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make complete, usable chapter prose store successfully despite subjective quality, word-count, or derived-state warnings, while preserving deterministic invalid-prose, transport, canonical continuity, safety, and atomic transaction blocks.

**Architecture:** Introduce one typed admission-policy boundary that accepts only explicitly curated hard-invalid evidence and treats all quality/review/word-target/Story State/Memory/post-sync evidence as warnings. The writing service will prepare Story State before commit, atomically store prose with state only when preparation is valid, atomically store prose without state patches when preparation is pending, persist the admission result with the chapter, and return the same result to unattended production and the UI. Unattended production will advance on `accepted_with_warnings`, enqueue warning work without retrying generation, and stop without automatic retry on `blocked_invalid`.

**Tech Stack:** Bun, TypeScript, Bun test, Express service modules, SQLite-backed novel store, React view-model TypeScript.

---

## File structure and responsibility map

- Create `ui/server/src/novel-writing/prose-admission-policy.ts`: the only module allowed to classify `accepted`, `accepted_with_warnings`, and `blocked_invalid`; validates minimal chapter shape, deduplicates warnings, and marks blocked errors.
- Create `ui/server/src/novel-writing/prose-admission-policy.test.ts`: exhaustive soft-versus-hard policy unit tests.
- Modify `ui/server/src/novel-writing/prose-quality-loop.ts`: cap optional quality revision at one and return a warning-bearing fallback when review/recheck is unavailable.
- Modify `ui/server/src/novel-writing/prose-quality-loop.test.ts`: prove one-round convergence and nonfatal review diagnostics.
- Modify `ui/server/src/novel-writing/chapter-prose-storage-patch.ts`: persist `prose_admission` metadata in chapter `raw_payload` so the UI can recover status after reload.
- Modify `ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts`: prove persisted admission metadata is stable.
- Modify `ui/server/src/novel-writing/prose-quality-review-record.ts` and its test: persist the same admission metadata in the quality review record.
- Modify `ui/server/src/novel-writing/pre-store-structural-sync-gate.test.ts`: preserve structural diagnostics while proving they are warning evidence rather than admission blocks.
- Modify `ui/server/src/routes/novel-writing-service.ts`: collect hard-invalid evidence separately from quality warnings, soften word-target failure, make Story State pending, select the atomic commit shape, and return the admission contract.
- Modify `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`: cover low score/style/AI-smell/word drift success plus transport/canonical zero-pollution blocks.
- Modify `ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts`: cover Story State pending, unchanged prior state, next-chapter continuation, synced atomic commit, and atomic rollback.
- Modify `ui/server/src/novel.ts` and `ui/server/src/novel.test.ts`: allow a prose-and-review atomic acceptance with no Story State patches and retain rollback guarantees.
- Modify `ui/server/src/routes/novel-production-service.ts`: treat warning admissions as success, queue warning repair work without pausing, remove quality-gate generation retry, and make hard invalidity non-retryable.
- Modify `ui/server/src/routes/novel-generation-routes.ts`: stop creating unattended runs with an automatic quality-gate retry policy.
- Modify `ui/server/src/routes/novel-production-service.behavior.test.ts` and `ui/server/src/routes/novel-unattended-goal.integration.test.ts`: prove unattended advancement and convergence.
- Modify `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`: read persisted/returned admission metadata and render warning admission as stored prose.
- Modify `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`: keep the chapter execution pipeline complete while surfacing warning tasks.
- Modify `ui/web/src/pages/novel-workspace/writingRecommendationModel.ts`: recommend optional revision without changing the primary continue action.
- Modify the matching Web model tests and `TaskCenterDrawer.test.ts`: verify labels, actions, and warning cards.

### Task 1: Add the typed prose admission boundary

**Files:**
- Create: `ui/server/src/novel-writing/prose-admission-policy.ts`
- Create: `ui/server/src/novel-writing/prose-admission-policy.test.ts`
- Modify: `ui/server/src/novel-writing/chapter-prose-storage-patch.ts`
- Test: `ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts`

- [ ] **Step 1: Write failing policy tests for all three outcomes**

Create tests with these concrete expectations:

```ts
import { describe, expect, test } from 'bun:test'
import {
  classifyProseAdmission,
  validateMinimalChapterProse,
} from './prose-admission-policy'

describe('prose admission policy', () => {
  test('accepts valid prose without warnings', () => {
    expect(classifyProseAdmission({ hard_failures: [], warnings: [] })).toEqual({
      status: 'accepted',
      hard_failures: [],
      warnings: [],
    })
  })

  test('stores subjective quality, word count, and derived-state failures as warnings', () => {
    const result = classifyProseAdmission({
      hard_failures: [],
      warnings: [
        { code: 'quality_score_below_target', source: 'quality', message: '评分 62 低于目标 78' },
        { code: 'ai_smell', source: 'quality', message: '检测到模板化表达' },
        { code: 'word_target_short', source: 'word_target', message: '正文短于推荐区间' },
        { code: 'story_state_transport_incomplete', source: 'story_state', message: '状态派生传输不完整' },
      ],
    })
    expect(result.status).toBe('accepted_with_warnings')
    expect(result.hard_failures).toEqual([])
    expect(result.warnings.map(item => item.code)).toEqual([
      'quality_score_below_target',
      'ai_smell',
      'word_target_short',
      'story_state_transport_incomplete',
    ])
  })

  test('blocks only explicitly supplied invalidity evidence', () => {
    const result = classifyProseAdmission({
      hard_failures: [{
        code: 'canonical_proper_noun_conflict',
        source: 'canonical_continuity',
        message: '临江市第一人民医院被断言为江城市第一人民医院',
      }],
      warnings: [{ code: 'quality_score_below_target', source: 'quality', message: '低分' }],
    })
    expect(result.status).toBe('blocked_invalid')
    expect(result.hard_failures).toHaveLength(1)
  })

  test('rejects empty, title-only, explanation-only, and error-like payloads', () => {
    for (const text of ['', '第十一章', '下面是本章正文：', '{"error":"model unavailable"}']) {
      expect(validateMinimalChapterProse(text).valid).toBe(false)
    }
  })

  test('recognizes compact but real Chinese chapter prose', () => {
    const text = Array.from({ length: 12 }, (_, index) =>
      `江澈在第${index + 1}次警报里改变了路线，追兵不得不分开包抄。他没有解释，只把通讯器塞进口袋。`,
    ).join('\n\n')
    expect(validateMinimalChapterProse(text)).toEqual({ valid: true, failures: [] })
  })
})
```

Also test warning deduplication by `source + code + message` and verify that warning order follows input order.

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test ui/server/src/novel-writing/prose-admission-policy.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: FAIL because `prose-admission-policy.ts` does not exist.

- [ ] **Step 3: Implement the policy types and pure classifier**

Implement this public contract:

```ts
export type ProseAdmissionStatus =
  | 'accepted'
  | 'accepted_with_warnings'
  | 'blocked_invalid'

export type ProseAdmissionWarningSource =
  | 'quality'
  | 'word_target'
  | 'story_state'
  | 'review'
  | 'memory'
  | 'post_commit'

export type ProseAdmissionHardFailureSource =
  | 'prose_shape'
  | 'transport'
  | 'canonical_continuity'
  | 'safety'
  | 'atomic'

export type ProseAdmissionWarning = {
  code: string
  source: ProseAdmissionWarningSource
  message: string
  details?: any
}

export type ProseAdmissionHardFailure = {
  code: string
  source: ProseAdmissionHardFailureSource
  message: string
  details?: any
}

export type ProseAdmissionDecision = {
  status: ProseAdmissionStatus
  hard_failures: ProseAdmissionHardFailure[]
  warnings: ProseAdmissionWarning[]
}

export function classifyProseAdmission(input: {
  hard_failures?: ProseAdmissionHardFailure[]
  warnings?: ProseAdmissionWarning[]
}): ProseAdmissionDecision

export function validateMinimalChapterProse(text: any): {
  valid: boolean
  failures: ProseAdmissionHardFailure[]
}

export function markBlockedInvalidError(
  error: any,
  failure: ProseAdmissionHardFailure,
): Error & {
  admission_status: 'blocked_invalid'
  admission_failure: ProseAdmissionHardFailure
}
```

`validateMinimalChapterProse()` must normalize whitespace, reject fewer than 200 non-whitespace characters, reject a single title/label/error/JSON-like response, and require at least four Chinese sentence terminators (`。！？!?`) so a title plus metadata cannot pass as a chapter. Do not inspect score, style, AI smell, or target word count here.

- [ ] **Step 4: Persist admission metadata in the chapter patch**

Extend `ChapterProseStoragePatchInput` with:

```ts
proseAdmission?: {
  status: 'accepted' | 'accepted_with_warnings'
  quality_score: number | null
  quality_warnings: any[]
  story_state_status: 'synced' | 'pending'
  story_state_warning?: any
}
```

When present, write the normalized value to both `raw_payload.prose_admission` and `raw_payload.proseAdmission`. Add a storage-patch test asserting the two aliases reference equal data and existing raw payload fields remain intact.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/server/src/novel-writing/prose-admission-policy.test.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: all tests pass.

- [ ] **Step 6: Commit the policy boundary**

```bash
git add ui/server/src/novel-writing/prose-admission-policy.ts \
  ui/server/src/novel-writing/prose-admission-policy.test.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts
git commit -m "feat(novel): add soft prose admission policy"
```

### Task 2: Make quality review and word targets advisory and convergent

**Files:**
- Modify: `ui/server/src/novel-writing/prose-quality-loop.ts`
- Test: `ui/server/src/novel-writing/prose-quality-loop.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts:44338-44596`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts:409-1042`

- [ ] **Step 1: Write failing one-revision and review-fallback tests**

Change the quality-loop test that currently permits two revision rounds to assert one maximum round:

```ts
expect(result.rounds).toHaveLength(1)
expect(reviseCalls).toBe(1)
```

Add a test where both review payload attempts are unusable and assert the loop returns the original complete prose, `decision.passed === false`, no hard failures, and one advisory failure whose key/message identifies `quality_review_unavailable`.

- [ ] **Step 2: Run the quality-loop test and verify RED**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test ui/server/src/novel-writing/prose-quality-loop.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: the current loop performs two revisions or throws `PROSE_REVIEW_FAILED`.

- [ ] **Step 3: Cap revision and return a nonfatal quality fallback**

Change the loop cap to:

```ts
const maxRounds = Math.min(1, Math.max(0, Number(input.maxRevisionRounds ?? 1)))
```

When the initial review is unavailable, return a result shaped like the normal loop instead of throwing:

```ts
return {
  final_text: finalText,
  final_scan: scan,
  final_review: normalizeProseQualityReview({
    score: 0,
    publishable: false,
    dimensions: {},
    findings: [],
  }),
  decision: {
    passed: false,
    approvable: true,
    score: 0,
    min_score: input.minScore,
    hard_failures: [],
    advisory_failures: [`quality_review_unavailable：${compactQualityError(error)}`],
  },
  rounds,
  quality_warning: {
    code: 'quality_review_unavailable',
    source: 'review',
    message: '正文质量复检不可用，已保留完整正文并转为待复检。',
  },
}
```

If a recheck after an accepted revision is unavailable, retain the accepted complete revision, return the last usable review plus `quality_recheck_unavailable` advisory, and do not ask for another revision.

- [ ] **Step 4: Write failing word-target integration tests**

In `novel-writing-service.quality-wiring.test.ts`, replace hard-rejection expectations for complete overlong/short candidates with:

```ts
const expectedBestCompleteText = normalizeProseForStorage(harness.draftText)
expect(result.admission_status).toBe('accepted_with_warnings')
expect(result.quality_warnings).toEqual(expect.arrayContaining([
  expect.objectContaining({ code: 'word_target_long' }),
]))
expect(result.chapter.chapter_text).toBe(expectedBestCompleteText)
```

Cover both custom and standard targets. Keep the existing contraction/expansion transport-truncation tests unchanged: a truncated replacement must be ignored and must never replace the last complete candidate.

- [ ] **Step 5: Return the best complete candidate instead of throwing on word drift**

In `ensureProseMeetsWordTarget()`, track the original text and every transport-complete candidate, then replace `PROSE_WORD_TARGET_LONG` and `PROSE_WORD_TARGET_SHORT` throws with a result:

```ts
return {
  final_text: bestCompleteText,
  contracted: bestCompleteText !== chapterText && bestEvaluation.actual < evaluation.actual,
  expanded: bestCompleteText !== chapterText && bestEvaluation.actual > evaluation.actual,
  evaluation,
  final_evaluation: bestEvaluation,
  contraction: contractionResultPayload || { attempts: contractionAttempts },
  expansion: { attempts },
  word_target_warning: {
    code: bestEvaluation.too_long ? 'word_target_long' : 'word_target_short',
    source: 'word_target',
    message: bestEvaluation.too_long
      ? `正文 ${bestEvaluation.actual} 字，超过建议上限 ${bestEvaluation.max} 字`
      : `正文 ${bestEvaluation.actual} 字，低于建议下限 ${bestEvaluation.min} 字`,
    details: { evaluation, final_evaluation: bestEvaluation },
  },
}
```

Only candidates that pass the existing transport-completeness checks may enter `bestCompleteText`. Leave draft/revision `assertCompleteProseTransportResult()` hard blocks intact.

- [ ] **Step 6: Run focused quality and word-target tests**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/server/src/novel-writing/prose-quality-loop.test.ts \
  ui/server/src/novel-writing/word-target.test.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: low score and complete word drift no longer throw; transport-truncated prose still rejects.

- [ ] **Step 7: Commit convergence changes**

```bash
git add ui/server/src/novel-writing/prose-quality-loop.ts \
  ui/server/src/novel-writing/prose-quality-loop.test.ts \
  ui/server/src/routes/novel-writing-service.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts
git commit -m "fix(novel): make prose quality and word targets advisory"
```

### Task 3: Integrate minimal hard gates and Story State pending storage

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts:46070-47220`
- Modify: `ui/server/src/novel-writing/prepared-story-state.ts`
- Test: `ui/server/src/novel-writing/prepared-story-state.test.ts`
- Modify: `ui/server/src/novel-writing/prose-quality-review-record.ts`
- Test: `ui/server/src/novel-writing/prose-quality-review-record.test.ts`
- Test: `ui/server/src/novel-writing/pre-store-structural-sync-gate.test.ts`
- Test: `ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts`
- Modify: `ui/server/src/novel.ts:1318-1500`
- Test: `ui/server/src/novel.test.ts:144-320`

- [ ] **Step 1: Write failing soft-quality admission tests**

Add production-path tests for these inputs, each with complete prose and a successful safety report:

```ts
const passingDimensions = {
  continuity: 9,
  core_promise_agency: 9,
  conflict_causality: 9,
  payoff_hook: 9,
  prose_style: 9,
  fact_setting_safety: 9,
}
const styleS2Finding = {
  key: 'templated_transition',
  severity: 'S2',
  dimension: 'prose_style',
  evidence: '他深吸一口气，眼神坚定。',
  required_change: '改为具体动作和现场反应',
  acceptance_test: '模板句已被具体事件替代',
}
const cases = [
  { name: 'low score', review: { score: 61, publishable: true, dimensions: passingDimensions, findings: [] }, warning: 'quality_score_below_target' },
  { name: 'publishable false', review: { score: 88, publishable: false, dimensions: passingDimensions, findings: [] }, warning: 'quality_publishable_verdict' },
  { name: 'AI smell or prose style S2', review: { score: 82, publishable: true, dimensions: passingDimensions, findings: [styleS2Finding] }, warning: styleS2Finding.key },
  { name: 'low style dimension', review: { score: 82, publishable: true, dimensions: { ...passingDimensions, prose_style: 3 }, findings: [] }, warning: 'quality_dimension_prose_style' },
]
```

For every case assert chapter/version persistence, `admission_status === 'accepted_with_warnings'`, and no `APPROVAL_REQUIRED` error.

- [ ] **Step 2: Rewrite the Story State failure test to expect pending**

Change the current `full production reaches prepare and generic approval cannot bypass completeness hard failure` test to assert:

```ts
expect(result.admission_status).toBe('accepted_with_warnings')
expect(result.story_state_status).toBe('pending')
expect(result.quality_warnings).toEqual(expect.arrayContaining([
  expect.objectContaining({ source: 'story_state', code: 'state_delta_completeness' }),
]))
expect(after.chapter?.chapter_text).toBe(normalizeProseForStorage(finalText))
expect(after.versions.length).toBe(before.versions.length + 1)
expect(after.project?.reference_config).toEqual(before.project?.reference_config)
expect(after.characters).toEqual(before.characters)
expect(after.settings).toEqual(before.settings)
expect(after.usage).toEqual(before.usage)
expect(harness.modelCalls.story_state).toBe(1)
expect(harness.commitOrder).toEqual(['commit', 'memory'])
```

Add equivalent cases for invalid Story State payload, `finish_reason=length`, nested `max_tokens`, and thrown prepare errors.

- [ ] **Step 3: Add a no-op prepared Story State result**

Export a helper from `prepared-story-state.ts`:

```ts
export function buildPendingPreparedStoryStateUpdate(input: {
  reference_config?: Record<string, any>
  failures: PreparedStoryStateFailure[]
  error?: any
}): PreparedStoryStateUpdate {
  return {
    state_delta: {},
    next_reference_config: { ...(input.reference_config || {}) },
    character_updates: [],
    setting_updates: [],
    storyline_updates: [],
    sync_reports: {},
    hard_failures: input.failures,
    payload: {
      pending: true,
      skipped: true,
      error: input.error ? String(input.error).slice(0, 300) : input.failures[0]?.message || '',
      hard_failures: input.failures,
    },
  }
}
```

The prepare-layer diagnostics may retain the `hard_failures` property name for compatibility, but the admission layer must treat every `source: 'story_state'` item as a warning.

- [ ] **Step 4: Replace quality assertions with explicit hard-evidence collection**

Remove all calls to `assertProseQualityCanStore()` from `generateChapterForGroup()`. Build warning evidence from:

- `qualityLoop.decision.advisory_failures`;
- LLM/recheck `hard_failures` such as `quality_publishable_verdict`, dimension floors, or semantic S1/S2 findings;
- legacy `getQualityGateDecision()` failures, `quality_audit_checks`, receipt checks, and pre-store structural checks;
- every `word_target_warning` returned by initial/editor/meme target checks.

Keep `buildPreStoreStructuralSyncChecks()` producing precise review/repair diagnostics, but change its integration test to assert those checks are collected in `qualityWarnings` and never copied into admission `hard_failures`.

Build hard-invalid evidence only from:

```ts
const minimalShape = validateMinimalChapterProse(finalText)
const canonicalFailures = qualityLoop.decision.hard_failures
  .filter(item => item.source === 'deterministic' && item.key === 'canonical_proper_noun_conflict')
  .map(item => ({
    code: item.key,
    source: 'canonical_continuity' as const,
    message: item.message,
  }))
const preCommitAdmission = classifyProseAdmission({
  hard_failures: [...minimalShape.failures, ...canonicalFailures],
  warnings: qualityWarnings,
})
```

If this decision is `blocked_invalid`, throw one error marked by `markBlockedInvalidError()` before Story State preparation or persistence. Do not allow approvals or unattended code to override it.

- [ ] **Step 5: Convert Story State preparation to `synced | pending`**

Wrap preparation once:

```ts
let storyStateStatus: 'synced' | 'pending' = 'synced'
let preparedStoryStateUpdate: PreparedStoryStateUpdate
try {
  preparedStoryStateUpdate = await prepareStoryStateUpdate(
    activeWorkspace,
    project,
    { ...chapter, chapter_text: finalText },
    finalReviewContextPackage,
    finalText,
    preferredModelId,
    llmControlOptions,
  )
  if (preparedStoryStateUpdate.hard_failures.length > 0) storyStateStatus = 'pending'
} catch (error) {
  storyStateStatus = 'pending'
  preparedStoryStateUpdate = buildPendingPreparedStoryStateUpdate({
    reference_config: project.reference_config,
    failures: [{
      key: 'story_state_prepare_failed',
      message: String(error).slice(0, 300),
      source: 'story_state',
    }],
    error,
  })
}
```

Append pending failures to `qualityWarnings`; never append them to `qualityGateReview.quality_audit_checks` for a final blocking decision.

- [ ] **Step 6: Select one of two atomic commit payloads**

Before commit, compute and persist the final non-blocking admission metadata. For `storyStateStatus === 'pending'`, call `commitNovelChapterAcceptance()` with chapter patch and safe available reviews but omit:

```ts
next_reference_config
character_updates
setting_updates
usage_updates
```

For `synced`, retain the existing prepared state fields in the same transaction. Add a low-level `novel.test.ts` case proving a commit with only `chapter_patch + version_source + reviews` succeeds atomically.

Wrap commit validation/transaction errors:

```ts
try {
  acceptance = await commitNovelChapterAcceptance(activeWorkspace, acceptanceInput)
} catch (error) {
  throw markBlockedInvalidError(error, {
    code: 'chapter_acceptance_transaction_failed',
    source: 'atomic',
    message: String(error).slice(0, 300),
  })
}
```

Retain the existing rollback assertions for chapter, version, project, character, setting, usage, review, and Memory.

- [ ] **Step 7: Attach explicit admission status to safety and transport blocks**

Keep `assertCompleteProseTransportResult()` (`PROSE_DRAFT_TRUNCATED` and `PROSE_REVISION_TRUNCATED`) and `REFERENCE_SAFETY_BLOCKED`, but attach:

```ts
admission_status: 'blocked_invalid'
```

with source `transport` or `safety`. Apply the same `safety` source to an explicit copyright hard block emitted by the reference-safety subsystem. Do the same for minimal-shape and canonical errors. The response/error must contain one primary hard failure, not the full soft quality report as a blocker.

- [ ] **Step 8: Return and persist the final response contract**

Return:

```ts
{
  ...existingResult,
  admission_status: finalAdmission.status,
  quality_score: Number.isFinite(Number(selfCheck?.review?.score))
    ? Number(selfCheck.review.score)
    : null,
  quality_warnings: finalAdmission.warnings,
  story_state_status: storyStateStatus,
  story_state_warning: storyStateStatus === 'pending'
    ? preparedStoryStateUpdate.payload
    : null,
  post_commit_warnings: postCommitWarnings,
}
```

Persist the quality/word-target/Story State admission metadata known before commit in the prose quality review payload and chapter `raw_payload.prose_admission` so reloads do not lose it. After Memory and post-commit hooks run, compute a separate `responseAdmission`: if post-commit warnings exist and the stored status was `accepted`, return `accepted_with_warnings` and include those warnings in `post_commit_warnings`/the task center. Do not perform a second chapter-content write merely to persist a post-commit infrastructure warning.

Extend `ProseQualityReviewPayloadInput` in `prose-quality-review-record.ts` with `proseAdmission?: Record<string, any>`, append it as both `prose_admission` and `proseAdmission`, and add a unit test that round-trips `status`, `quality_score`, `quality_warnings`, and `story_state_status`.

- [ ] **Step 9: Add the pending-next-chapter integration test**

Generate chapter N with Story State pending, then generate chapter N+1 from the same isolated workspace. Assert chapter N prose appears in N+1 context, N+1 generation is invoked, and the old stable Story State remains readable. This test must use the fake harness and must not call a configured provider.

- [ ] **Step 10: Run focused admission, Story State, canonical, and atomic tests**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/server/src/novel-writing/prose-admission-policy.test.ts \
  ui/server/src/novel-writing/canonical-continuity.test.ts \
  ui/server/src/novel-writing/prepared-story-state.test.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts \
  ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts \
  ui/server/src/novel.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: the saved hospital conflict remains `blocked_invalid` with zero writes; Story State transport/completeness failures store prose with pending state; atomic failures roll back everything.

- [ ] **Step 11: Commit service integration**

```bash
git add ui/server/src/routes/novel-writing-service.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts \
  ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts \
  ui/server/src/novel-writing/prepared-story-state.ts \
  ui/server/src/novel-writing/prepared-story-state.test.ts \
  ui/server/src/novel-writing/prose-quality-review-record.ts \
  ui/server/src/novel-writing/prose-quality-review-record.test.ts \
  ui/server/src/novel-writing/pre-store-structural-sync-gate.test.ts \
  ui/server/src/novel.ts \
  ui/server/src/novel.test.ts
git commit -m "fix(novel): store prose when derived state is pending"
```

### Task 4: Remove soft-quality unattended retries and pauses

**Files:**
- Modify: `ui/server/src/routes/novel-production-service.ts:1254-1510`
- Modify: `ui/server/src/routes/novel-generation-routes.ts:1093-1158`
- Test: `ui/server/src/routes/novel-production-service.behavior.test.ts:257-2100`
- Test: `ui/server/src/routes/novel-generation-routes.test.ts`
- Test: `ui/server/src/routes/novel-unattended-goal.integration.test.ts`

- [ ] **Step 1: Write failing unattended convergence tests**

Add/replace tests with these assertions:

```ts
expect(firstChapterResult.status).toBe('success')
expect(firstChapterResult.admission_status).toBe('accepted_with_warnings')
expect(firstChapterResult.warning_count).toBeGreaterThan(0)
expect(secondChapterGenerateCalls).toBe(1)
expect(firstChapterResult.attempts || 0).toBe(0)
expect(JSON.stringify(runPayload)).not.toContain('QUALITY_GATE_RETRY_REQUIRED')
```

Cover low quality, open post-delivery quality checks, Story State pending, and post-commit warnings. Add a separate `blocked_invalid` case asserting the run pauses at the current chapter, `attempts` is not incremented for automatic retry, and the next chapter is not invoked.

- [ ] **Step 2: Run focused production tests and verify RED**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/server/src/routes/novel-production-service.behavior.test.ts \
  ui/server/src/routes/novel-unattended-goal.integration.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: current code pauses on Story State/post-delivery warnings or creates `QUALITY_GATE_RETRY_REQUIRED`.

- [ ] **Step 3: Treat warning admission as a successful chapter result**

Read:

```ts
const admissionStatus = String(chapterResult.admission_status || 'accepted')
const storyStateStatus = String(chapterResult.story_state_status || 'synced')
const warningItems = [
  ...asArray(chapterResult.quality_warnings),
  ...asArray(chapterResult.post_commit_warnings),
  ...(storyStateStatus === 'pending' ? [{
    code: 'story_state_pending',
    source: 'story_state',
    message: compactText(chapterResult.story_state_warning?.error || '故事状态待补同步', 300),
  }] : []),
]
```

For `accepted` and `accepted_with_warnings`, set result `status: 'success'`, advance `current_index`, and store `admission_status`, `warnings`, `warning_count`, and `story_state_status` in the compact run item.

Add `admission_status`, `quality_warnings`, `story_state_status`, `story_state_warning`, and `post_commit_warnings` to the `compactRunChapterItem()` whitelist so run `output_ref` does not silently drop the contract.

- [ ] **Step 4: Queue repair work without pausing or regenerating prose**

Reuse the existing post-delivery repair-run/task infrastructure for warning items, but change its recovery summary to “正文已入库，建议异步修订/补同步”. Creating a repair task must not set chapter status to failed, must not increment attempts, and must not break the chapter loop.

- [ ] **Step 5: Delete the quality-gate auto-generation retry branch**

Remove `autoRetryQualityGate`, `QUALITY_GATE_RETRY_REQUIRED`, and the recovery plan that says “重新生成或修订当前章正文”. An old `APPROVAL_REQUIRED quality_gate` from a stale caller should be treated as a terminal non-retryable failure, because the writing service must no longer emit it for soft quality.

Make errors with `admission_status === 'blocked_invalid'` explicitly non-retryable:

```ts
const blockedInvalid = chapterError?.admission_status === 'blocked_invalid'
const canRetry = !blocksForApproval && !blockedInvalid && attempts <= retryLimit
```

Do not auto-approve, skip, or regenerate canonical/safety/transport/atomic invalidity.

Update `buildReturnedApprovalBlocker()` so `quality_gate.passed=false` and `score < qualityThreshold` do not create a blocker when `chapterResult.admission_status` is `accepted` or `accepted_with_warnings`. Preserve explicit `blocked_invalid`, `reference_safety_blocked`, and copyright/safety blockers.

- [ ] **Step 6: Stop unattended run creation from enabling quality retries**

In `start-unattended`, replace the fixed policy fields with:

```ts
unattended: {
  enabled: true,
  start_chapter: startNo,
  target_chapter: targetNo,
  allow_incomplete: req.body.allow_incomplete === true,
  force_scene_cards: req.body.force_scene_cards !== false,
  auto_repair_missing_material: true,
  auto_repair_quality_gate: false,
  advance_rule: 'prose_admitted_then_next_chapter',
},
policy: {
  stop_on_failure: req.body.stop_on_failure !== false,
  allow_incomplete: req.body.allow_incomplete === true,
  force_scene_cards: req.body.force_scene_cards !== false,
  require_scene_confirmation: false,
  quality_threshold: qualityThreshold,
  production_mode: 'full_auto',
  auto_repair_missing_material: true,
  auto_repair_quality_gate: false,
},
```

Keep `quality_threshold` in the configuration snapshot because it still controls scoring and the optional single revision. Add a route test asserting the stored run policy uses `false` and the new advance rule.

- [ ] **Step 7: Update all strict post-delivery tests**

Tests that currently expect “Step 3 未闭环，暂停” must instead assert successful advancement plus a repair task. Preserve separate tests for an actual `blocked_invalid` error and user cancellation.

- [ ] **Step 8: Run production tests and verify GREEN**

Run the command from Step 2 plus:

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test ui/server/src/routes/novel-generation-routes.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: warning chapters advance exactly once; invalid chapters stop without retry loops; newly created unattended runs cannot enable the removed retry path.

- [ ] **Step 9: Commit unattended convergence changes**

```bash
git add ui/server/src/routes/novel-production-service.ts \
  ui/server/src/routes/novel-generation-routes.ts \
  ui/server/src/routes/novel-production-service.behavior.test.ts \
  ui/server/src/routes/novel-generation-routes.test.ts \
  ui/server/src/routes/novel-unattended-goal.integration.test.ts
git commit -m "fix(novel): advance unattended runs on admission warnings"
```

### Task 5: Show stored-with-warnings state in the workspace UI

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts:4460-5330`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts:1270-1390,15660-15920`
- Test: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingRecommendationModel.ts`
- Test: `ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts`
- Test: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts`

- [ ] **Step 1: Write failing writing-cockpit admission tests**

Provide a stored chapter whose `raw_payload.prose_admission` is:

```ts
{
  status: 'accepted_with_warnings',
  quality_score: 72,
  quality_warnings: [{ code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' }],
  story_state_status: 'pending',
}
```

Assert:

```ts
expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库，建议修订')
expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('delivered_with_warnings')
expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
```

Add `delivered_with_warnings` to `ChapterAcceptanceStatus`. Keep quality diagnostics and a “主动修订” secondary action visible.

Extend `ChapterAcceptanceDeskModel` with typed fields:

```ts
admissionStatus: 'accepted' | 'accepted_with_warnings' | 'blocked_invalid' | ''
qualityWarnings: Array<{ code: string; source: string; message: string }>
storyStateStatus: 'synced' | 'pending' | ''
postCommitWarnings: Array<{ stage: string; message: string }>
```

Add `delivered_with_warnings` to the copied acceptance-status union in `writingRecommendationModel.ts` in the same commit.

- [ ] **Step 2: Run focused Web tests and verify RED**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts \
  ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts \
  ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: current models turn low quality or unsynced Story State into revision/sync blockers.

- [ ] **Step 3: Read admission metadata before legacy inferred gates**

In the acceptance-desk builder, resolve:

```ts
const proseAdmission = chapter?.raw_payload?.prose_admission
  || chapter?.raw_payload?.proseAdmission
  || latestQualityPayload?.prose_admission
  || latestQualityPayload?.proseAdmission
  || null
```

If status is `accepted_with_warnings`, return the delivered-with-warnings branch before legacy low-score, quality-audit, or Story State branches. If status is `accepted`, return delivered/ready state. Only show `approvalBlocker` for `blocked_invalid`, explicit safety/copyright blocks, or legacy results that have no admission metadata.

Update `acceptanceDeskBlocksDirector()` so `ready_to_accept`, `delivered`, and `delivered_with_warnings` are all non-blocking.

- [ ] **Step 4: Keep director pipeline complete and add warning tasks**

For `delivered_with_warnings`:

- `chapter_execution` is `done`;
- `quality_gate` is `done` or `warning`, never `active`/`blocked`;
- `canon_sync` is `warning` when Story State is pending;
- `chapter_handoff` permits the next chapter;
- task center receives one deduplicated card per admission warning source.

The card title must say “已入库，建议修订” or “正文已入库，故事状态待补同步” and must not expose an “批准入库” action.

- [ ] **Step 5: Make recommendations optional rather than blocking**

In `writingRecommendationModel.ts`, keep the primary recommendation on next-chapter continuation and place revision/sync work in secondary recommendations. Preserve quality score and detailed issue display.

- [ ] **Step 6: Run Web tests and verify GREEN**

Run the command from Step 2. Expected: warning admission is rendered as stored prose and never as generation failure.

- [ ] **Step 7: Commit UI integration**

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts \
  ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts \
  ui/web/src/pages/novel-workspace/writingRecommendationModel.ts \
  ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts \
  ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts
git commit -m "feat(novel-ui): show chapters accepted with warnings"
```

### Task 6: Full isolated verification and regression audit

**Files:**
- Modify only if a verification failure reveals a missed expectation in the files listed above.
- Never modify, restore, stage, or commit `workspace/providers.json`.

- [ ] **Step 1: Run the complete focused server matrix**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun test \
  ui/server/src/novel-writing/prose-admission-policy.test.ts \
  ui/server/src/novel-writing/prose-quality-loop.test.ts \
  ui/server/src/novel-writing/word-target.test.ts \
  ui/server/src/novel-writing/canonical-continuity.test.ts \
  ui/server/src/novel-writing/prepared-story-state.test.ts \
  ui/server/src/novel-writing/prose-quality-review-record.test.ts \
  ui/server/src/novel-writing/pre-store-structural-sync-gate.test.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts \
  ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts \
  ui/server/src/routes/novel-production-service.behavior.test.ts \
  ui/server/src/routes/novel-generation-routes.test.ts \
  ui/server/src/routes/novel-unattended-goal.integration.test.ts \
  ui/server/src/novel.test.ts; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: all pass. This matrix must explicitly prove:

- low score, style/AI-smell findings, and complete short/long prose store with warnings;
- Story State invalid/truncated/incomplete stores prose while prior state remains unchanged;
- the next chapter can run after pending state;
- the saved hospital conflict still blocks with zero chapter/version/Story State/Memory writes;
- empty/non-chapter and provider-truncated prose still block;
- atomic validation failure rolls back every staged write;
- warning admission performs no second generation retry.

- [ ] **Step 2: Run full novel server regression**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun run test:novel-server; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: all configured novel server tests pass.

- [ ] **Step 3: Run complete writing workspace regression**

```bash
TEST_MEMPALACE="$(mktemp -d)"; MEMPALACE_DIR="$TEST_MEMPALACE" bun run test:writing-cockpit; STATUS=$?; rm -rf "$TEST_MEMPALACE"; exit $STATUS
```

Expected: all writing workspace tests pass.

- [ ] **Step 4: Build and check repository boundaries**

```bash
bun run check
```

Expected: refactor boundary check, server build, and Web build all pass.

- [ ] **Step 5: Audit forbidden behavior and workspace isolation**

```bash
rg -n "QUALITY_GATE_RETRY_REQUIRED|章节质量门禁未通过，正文未入库|autoRetryQualityGate" ui/server/src
git status --short
```

Expected: no production references to the removed soft-quality retry/block messages. `git status --short` shows only the user's pre-existing `workspace/providers.json` modification, unless the implementation commits are intentionally still uncommitted.

- [ ] **Step 6: Review the final diff against the approved admission table**

Use `git diff main...HEAD --stat` and `git diff main...HEAD` to confirm:

- every soft source maps to warnings;
- every hard source maps to `blocked_invalid`;
- no approval flag bypasses deterministic invalidity;
- no warning path breaks unattended chapter advancement;
- no test touches the live `MEMPALACE_DIR` or real provider configuration.

- [ ] **Step 7: Commit any verification-only corrections**

```bash
git add ui/server/src/novel-writing/prose-admission-policy.ts \
  ui/server/src/novel-writing/prose-admission-policy.test.ts \
  ui/server/src/novel-writing/prose-quality-loop.ts \
  ui/server/src/novel-writing/prose-quality-loop.test.ts \
  ui/server/src/novel-writing/prepared-story-state.ts \
  ui/server/src/novel-writing/prepared-story-state.test.ts \
  ui/server/src/novel-writing/prose-quality-review-record.ts \
  ui/server/src/novel-writing/prose-quality-review-record.test.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.ts \
  ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts \
  ui/server/src/routes/novel-writing-service.ts \
  ui/server/src/routes/novel-writing-service.quality-wiring.test.ts \
  ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts \
  ui/server/src/routes/novel-production-service.ts \
  ui/server/src/routes/novel-production-service.behavior.test.ts \
  ui/server/src/routes/novel-generation-routes.ts \
  ui/server/src/routes/novel-generation-routes.test.ts \
  ui/server/src/routes/novel-unattended-goal.integration.test.ts \
  ui/server/src/novel.ts \
  ui/server/src/novel.test.ts \
  ui/web/src/pages/novel-workspace/writingCockpitModel.ts \
  ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts \
  ui/web/src/pages/novel-workspace/writingRecommendationModel.ts \
  ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts \
  ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts
git commit -m "test(novel): verify soft prose admission regressions"
```

Skip this commit if verification required no corrections.

## Acceptance handoff

Do not issue a real provider request during plan execution unless the user separately authorizes a live verification after all isolated tests and builds pass. A later live check must be a single bounded generation using the user's unchanged provider configuration, with no automatic retry, and must report the resulting `admission_status`, quality score, warnings, Story State status, stored chapter/version evidence, and whether the next-chapter context can read the saved prose.
