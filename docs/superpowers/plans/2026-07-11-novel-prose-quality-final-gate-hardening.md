# Novel Prose Quality Final Gate Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining prompt-delivery, truncation, strict-preflight, evidence-location, and six-dimension decision gaps without weakening word-count compatibility, longform continuity, or failed-draft isolation.

**Architecture:** Keep the unified writing service and existing generation contract authoritative. Mark bounded prose, review, and revision tasks as authoritative at the executor boundary; reject known incomplete transports before parsing candidates; and make the quality decision consume the current prose text plus the complete six-dimension verdict. Deterministic advisories may neutralize only the same single style issue, never a mixed semantic obligation.

**Tech Stack:** Bun, TypeScript, Bun test, existing novel writing service and oh-story contracts.

---

### Task 1: Preserve The Authoritative Core Prompt At The Executor Boundary

**Files:**
- Modify: `ui/server/src/llm/executor.ts`
- Test: `ui/server/src/llm/executor.chain.test.ts`

- [ ] **Step 1: Write the failing executor test**

Create a bounded prose project whose `agent_prompt_config.prompts['prose-agent']` contains both system and user replacement sentinels. Generate prose with `boundedProseContract: true` and assert the runtime user message contains `BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES` but neither replacement sentinel.

- [ ] **Step 2: Run RED in an isolated Memory Palace**

Run:

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/llm/executor.chain.test.ts --test-name-pattern "authoritative bounded prose prompt"
```

Expected: FAIL because `userOverride` replaces `context.task`.

- [ ] **Step 3: Implement authoritative prose task selection**

Pass `authoritativeProseTask: true` in the bounded prose agent context. In `buildAgentMessages`, when `agentId === 'prose-agent'` and this marker is true, use `baseNovelSystemPrompt()` and `context.task` as the authoritative system/task inputs; project prompt overrides remain available for non-authoritative agent calls.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2 and expect zero failures.

### Task 2: Reject Truncated Drafts And Revisions Before Candidate Parsing

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`
- Test support: `ui/server/src/routes/novel-writing-service.test-support.ts`

- [ ] **Step 1: Write failing production-path tests**

Add one pipeline test where the draft returns a complete-looking `chapter_text` with `finish_reason: 'length'`, and another where a quality revision returns a complete-looking text with nested `raw.choices[0].finish_reason: 'max_tokens'`. Assert both reject before storage, story-state update, or Memory Palace write. The draft error code must be `PROSE_DRAFT_TRUNCATED`; the revision error code must be `PROSE_REVISION_TRUNCATED`.

- [ ] **Step 2: Run RED in an isolated Memory Palace**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/routes/novel-writing-service.quality-wiring.test.ts --test-name-pattern "truncated draft|truncated quality revision"
```

Expected: FAIL because both candidates currently continue after `getNovelPayload`.

- [ ] **Step 3: Add a shared transport guard**

Use `normalizeProseContractionFinishReason`, `normalizeProseContractionIncompleteReason`, and `isRejectedProseContractionFinishReason` to reject known incomplete, length, safety, error, cancellation, or tool-call results. Missing/unknown finish reasons remain compatible only when the existing payload/text checks pass. Attach `buildLLMResultDiagnostics(result)` without persisting full prose.

- [ ] **Step 4: Guard both model boundaries**

Call the guard immediately after the draft runtime returns and immediately after the revision runtime returns, before `getNovelPayload`, partial JSON recovery, or plain-text fallback.

- [ ] **Step 5: Run GREEN**

Run the command from Step 2 and expect zero failures.

### Task 3: Fail Closed When Strict Preflight Evidence Is Missing

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-director.ts`
- Modify: `ui/server/src/novel-writing/prose-generation-contract.ts`
- Test: `ui/server/src/routes/novel-oh-story-director.test.ts`
- Test: `ui/server/src/novel-writing/prose-generation-contract.test.ts`

- [ ] **Step 1: Write failing missing-field tests**

Add tests with `preflight: { ready: true }` and no `strict_ready`. Assert the director returns `needs_repair` with `pre_draft_strict_readiness`, and `evaluateProsePreDraftGate` returns `PROSE_STRICT_PREFLIGHT_BLOCKED`.

- [ ] **Step 2: Run RED**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/routes/novel-oh-story-director.test.ts src/novel-writing/prose-generation-contract.test.ts --test-name-pattern "missing strict readiness"
```

Expected: FAIL because `undefined` is currently treated as ready.

- [ ] **Step 3: Require explicit strict readiness**

Change both authoritative checks to require `strict_ready === true`. Preserve low-severity advisories and the existing explicit-false diagnostics.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2 and expect zero failures.

### Task 4: Make Blocking Findings Depend On Locatable Prose Evidence

**Files:**
- Modify: `ui/server/src/novel-writing/prose-quality-loop.ts`
- Test: `ui/server/src/novel-writing/prose-quality-loop.test.ts`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`

- [ ] **Step 1: Write failing evidence tests**

Add tests proving that an S1/S2 whose evidence is absent from the current chapter becomes advisory and is not sent into a revision round, while the same finding with an exact compacted prose substring remains blocking. Include Chinese quote wrappers and whitespace normalization.

- [ ] **Step 2: Run RED**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/novel-writing/prose-quality-loop.test.ts src/routes/novel-writing-service.quality-wiring.test.ts --test-name-pattern "locatable evidence|unlocatable evidence"
```

Expected: FAIL because the decision currently checks only that evidence is non-empty.

- [ ] **Step 3: Add one evidence locator and use it everywhere**

Normalize prose/evidence whitespace, remove only wrapping quote punctuation, and require the remaining evidence to be a substring of the current prose. Pass current prose into `buildProseQualityDecision`; use the same locator when constructing revision findings. Record unlocatable S1/S2 as advisory diagnostics rather than silently dropping them.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2 and expect zero failures.

### Task 5: Enforce The Complete Six-Dimension Verdict And Atomic Advisory Downgrade

**Files:**
- Modify: `ui/server/src/novel-writing/prose-quality-loop.ts`
- Test: `ui/server/src/novel-writing/prose-quality-loop.test.ts`
- Test: `ui/server/src/routes/novel-writing-service.quality-wiring.test.ts`

- [ ] **Step 1: Write failing six-dimension tests**

Prove that `score: 90` cannot pass when `publishable: false` or any required dimension is below the fixed hard floor of 5/10, even with no findings. Prove that score-only misses with `publishable: true`, all dimensions at least 5, and no hard findings remain `approvable` but not automatically stored.

- [ ] **Step 2: Write the mixed-finding regression**

Use a sentence containing deterministic advisory `如同`. A pure “replace 如同 with direct description” S2 remains advisory, but an S2 that also requires repairing action causality remains blocking. The second obligation must survive even when both appear in the same evidence and finding.

- [ ] **Step 3: Run RED**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/novel-writing/prose-quality-loop.test.ts src/routes/novel-writing-service.quality-wiring.test.ts --test-name-pattern "publishable verdict|dimension hard floor|mixed advisory"
```

- [ ] **Step 4: Implement the verdict and conservative downgrade**

Add hard failures for `publishable !== true` and required dimensions below 5. Keep the configured overall threshold unchanged. Restrict deterministic-advisory coverage to a single style-replacement obligation; any additional continuity, causality, character, setting, conflict, payoff, hook, or logic repair scope keeps the LLM finding blocking.

- [ ] **Step 5: Run GREEN**

Run the command from Step 3 and expect zero failures.

### Task 6: Isolated Verification And State Audit

**Files:**
- No production file changes.

- [ ] **Step 1: Run focused server tests with isolated memory**

```bash
MEMPALACE_DIR=/private/tmp/mangaforge-final-gate-tests bun test src/llm/executor.chain.test.ts src/novel-writing/deslop-scans.test.ts src/novel-writing/prose-format.test.ts src/novel-writing/prose-quality-loop.test.ts src/novel-writing/prose-generation-contract.test.ts src/routes/novel-oh-story-director.test.ts src/routes/novel-writing-service.quality-wiring.test.ts src/routes/novel-writing-service.test.ts
```

- [ ] **Step 2: Run web tests and builds**

Run the affected writing cockpit tests, server build, web build, refactor-boundary check, and `git diff --check`. Do not run another real model request.

- [ ] **Step 3: Re-audit persistent state**

Confirm project 1 chapters 1-10 still match the request backup, chapter 11 remains empty/version 1 with no version row, story state remains at chapter 10, Memory Palace remains `183 memories / 12375 facts` for project 1 with no chapter 11 records, and `workspace/providers.json` SHA-256 remains `205e508c14a5c7285924653aea2072f7301e52d86c24c2edd5d8cfc7c185b034`.

- [ ] **Step 4: Completion audit**

Treat the code-side chain as fixed only if every focused test and state invariant passes. Keep the full goal active because run 393's complete prose is unrecoverable and the permitted real正文 request has already been consumed; do not claim chapter-quality parity without a recoverable chapter and two blind reviews.
