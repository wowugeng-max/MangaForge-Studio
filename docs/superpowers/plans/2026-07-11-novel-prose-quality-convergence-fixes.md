# Novel Prose Quality Convergence Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the final persistence, prompt-integrity, threshold-default, and model word-count convergence gaps without weakening prose quality or longform continuity.

**Architecture:** Keep the unified writing service authoritative. Word-count compatibility becomes a bounded 5% precondition that only suppresses further length rewrites; the existing deterministic and semantic quality loop still decides storage. Required prompt data reaches the 48K compiler without per-field truncation, and only the gate-approved final text is written to chapter storage, story state, and Memory Palace.

**Tech Stack:** Bun, TypeScript, Bun test, existing novel writing service, Memory Palace adapter, real validation report.

---

### Task 1: Add A Bounded Word-Count Compatibility Band And A Real Default Threshold

**Files:**
- Modify: `ui/server/src/novel-writing/word-target.ts`
- Modify: `ui/server/src/novel-writing/word-target.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Write failing word-band tests**

Add tests proving that 3,040 and 5,460 characters are soft passes for the standard 3,200-5,200 range, while 3,039 and 5,461 fail. Assert the result records whether the lower or upper soft edge was used.

```ts
expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3040), target))).toMatchObject({
  passed: true,
  too_short: false,
  soft_cap: true,
  soft_floor: true,
})
expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(3039), target)).passed).toBe(false)
expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5460), target))).toMatchObject({
  passed: true,
  too_long: false,
  soft_cap: true,
  soft_floor: false,
})
expect(applyProseWordTargetSoftCap(evaluateProseWordTarget('字'.repeat(5461), target)).passed).toBe(false)
```

- [ ] **Step 2: Run RED**

Run: `cd ui/server && bun test src/novel-writing/word-target.test.ts`

Expected: FAIL because the current upper tolerance is 1% and there is no lower soft band.

- [ ] **Step 3: Implement the 5% band**

Keep `isWithinProseWordTargetSoftCap` as the upper-edge predicate, add a lower-edge predicate, and make `applyProseWordTargetSoftCap` combine them. The normal configured range remains unchanged.

```ts
const DEFAULT_WORD_TARGET_TOLERANCE_RATIO = 0.05

export function isWithinProseWordTargetSoftFloor(evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const min = Number(evaluation?.min || 0)
  const actual = Number(evaluation?.actual || 0)
  if (!evaluation?.too_short || min <= 0 || actual >= min) return false
  const ratio = Number.isFinite(Number(options.tolerance_ratio))
    ? Number(options.tolerance_ratio)
    : DEFAULT_WORD_TARGET_TOLERANCE_RATIO
  return actual >= Math.floor(min * (1 - ratio))
}
```

The combined result sets `soft_cap=true` for either edge and `soft_floor=true` only for the lower edge. This allows the subsequent deterministic and LLM quality loop to run; it does not directly store prose.

- [ ] **Step 4: Write a failing service threshold test**

Use the existing pipeline harness with project `quality_gate.min_score=78`, omit `quality_threshold`, return a complete score-only review at 77, and assert storage is rejected. Also assert a recent-quality-regression context raises the effective threshold to at least 85.

- [ ] **Step 5: Run service RED**

Run: `cd ui/server && bun test src/routes/novel-writing-service.test.ts --test-name-pattern "project quality threshold|quality regression threshold"`

Expected: FAIL because the unified service currently resolves an omitted request threshold from zero.

- [ ] **Step 6: Resolve the service default before rhythm escalation**

```ts
const configuredQualityThreshold = options.quality_threshold
  ?? options.qualityThreshold
  ?? project?.reference_config?.quality_gate?.min_score
  ?? project?.reference_config?.quality_gate?.minScore
  ?? 78
const qualityThreshold = resolveEffectiveQualityThreshold(configuredQualityThreshold, contextPackage)
```

Do not change S1/S2, deterministic, truncation, or approval rules.

- [ ] **Step 7: Run GREEN**

Run: `cd ui/server && bun test src/novel-writing/word-target.test.ts src/routes/novel-writing-service.test.ts --test-name-pattern "soft cap|soft floor|project quality threshold|quality regression threshold"`

Expected: PASS.

### Task 2: Make The 48K Compiler See Complete Required Content

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/novel-writing/prose-contract-prompt.test.ts`

- [ ] **Step 1: Write production-path RED tests**

Call `compileParagraphProseContext` with a required `previous_handoff` longer than 4,200 characters but with the whole required prompt still below 48K; assert a sentinel at the end remains. Call it again with required content over 48K and assert `PROSE_CORE_PROMPT_BUDGET_EXCEEDED` rather than a successful truncated prompt.

- [ ] **Step 2: Run RED**

Run: `cd ui/server && bun test src/novel-writing/prose-contract-prompt.test.ts --test-name-pattern "production required content"`

Expected: FAIL because `prosePromptText` and `prosePromptJson` truncate required values before compilation.

- [ ] **Step 3: Build required-only serializers**

Use whitespace normalization for strings and cycle-safe JSON serialization with no character cap. Select the scene-card causality schema, but do not cap field text, list length, scene count, failed checks, core radar items, or required repairs. Director-selected contracts remain capped at four by the director contract.

```ts
function requiredProsePromptText(value: any) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function requiredProsePromptJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}
```

Use these helpers only in `buildRequiredProseCoreSections`. Optional risk-contract full/compact/reference builders keep their existing bounded representation.

- [ ] **Step 4: Run GREEN and realistic-budget coverage**

Run: `cd ui/server && bun test src/novel-writing/prose-contract-prompt.test.ts`

Expected: PASS, including the existing realistic four-contract case.

### Task 3: Persist Only The Approved Final Prose To Long-Term Memory

**Files:**
- Modify: `ui/server/src/llm/executor.ts`
- Modify: `ui/server/src/llm/executor.chain.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test-support.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Write executor RED**

Instrument the existing Memory Palace mocks. Call `generateNovelChapterProse` with a new `skipMemoryStore: true` option and assert neither `storeAgentOutputForProject` nor `verifyAndStoreAgentOutputForProject` receives the draft, while memory recall may still occur.

- [ ] **Step 2: Write service RED**

Extend the pipeline harness with `memoryTexts`. Assert a hard quality failure produces no memory write. Assert a passing revision writes exactly `[finalText]`, never the original draft.

- [ ] **Step 3: Run RED**

Run: `cd ui/server && bun test src/llm/executor.chain.test.ts src/routes/novel-writing-service.test.ts --test-name-pattern "memory|coherent final prose"`

Expected: FAIL because the draft executor currently stores before the quality and safety gates.

- [ ] **Step 4: Separate memory recall from candidate persistence**

Add `skipMemoryStore?: boolean` to `generateNovelChapterProse`. Preserve existing recall when `skipMemory` is false, pass `skipMemory: skipMemory || skipMemoryStore` into both executor attempts, and skip the draft-level verified store when either flag suppresses storage.

- [ ] **Step 5: Add a final-prose memory adapter**

Export a focused adapter from `executor.ts` that stores only a supplied final chapter text. Add an injectable `storeChapterProseMemory` member to `NovelWritingRuntime`. The unified service calls draft generation with `skipMemoryStore: true`, then calls the adapter once after chapter storage with the same `finalText`; memory errors are logged and do not trigger regeneration or substitute the draft.

- [ ] **Step 6: Run GREEN**

Run: `cd ui/server && bun test src/llm/executor.chain.test.ts src/routes/novel-writing-service.test.ts --test-name-pattern "memory|coherent final prose|failed prose revisions"`

Expected: PASS.

### Task 4: Verify Convergence And Close Evidence

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-novel-prose-quality-chain-recovery-design.md`

- [ ] **Step 1: Run focused suites**

Run:

```bash
cd ui/server
bun test src/llm/executor.chain.test.ts src/novel-writing/word-target.test.ts src/novel-writing/prose-contract-prompt.test.ts src/novel-writing/prose-generation-contract.test.ts src/novel-writing/prose-quality-loop.test.ts src/novel-writing/prose-quality-contracts.test.ts src/routes/novel-oh-story-director.test.ts src/routes/novel-generation-routes.test.ts src/routes/novel-writing-service.quality-wiring.test.ts src/routes/novel-writing-service.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Run full regression and build**

Run: `bun run test:novel-server`, `bun run check:refactor-boundaries`, and `bun run build:server` as separate commands. Expected: all exit 0.

- [ ] **Step 3: Recheck real evidence without an unbounded generation loop**

Verify the committed real report still proves model 217, prompt 11,198, min score 85, one revision, deterministic pass, two publishable blind reviews, fixed threshold pass, and 9/9 unchanged history hashes. Confirm the current code changes do not lower any of those gates and the active provider hash remains unchanged. Make at most one additional real request only if a changed runtime boundary cannot be verified from the successful run plus focused tests.

- [ ] **Step 4: Mark the design complete and commit**

Change the design status back to implemented/passed, record the convergence fixes and test evidence, run secret/config/status checks, and commit only source, tests, plan/design, and the already successful report. Failed reports remain untracked.
