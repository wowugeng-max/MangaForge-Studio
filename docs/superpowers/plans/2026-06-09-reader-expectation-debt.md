# Reader Expectation Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry unresolved reader expectation debt from previous chapters into the next chapter context, pre-draft brief, prose prompt, and writing cockpit UI.

**Architecture:** Reuse `novel_reviews.review_type = "reader_expectation_sync"` as the source of truth. The backend extracts recent missed expectations and keep-alive hooks into `reader_expectation_debt_context`, injects them into `chapter_target.reader_expectation_ledger`, and the frontend displays the carry-over debt in the chapter opening task book.

**Tech Stack:** Bun, TypeScript, Vitest-style tests, React workspace components.

---

### Task 1: Backend Context Extraction

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`

- [ ] **Step 1: Write the failing test**

Add a test that builds chapter 3 after chapter 2 has a `reader_expectation_sync` review containing missed and keep-alive expectations:

```ts
test('carries previous reader expectation debt into next chapter context and brief', async () => {
  const reviews = [
    {
      id: 91,
      chapter_id: 2,
      review_type: 'reader_expectation_sync',
      created_at: '2026-06-09T08:00:00.000Z',
      payload: JSON.stringify({
        chapter_id: 2,
        chapter_no: 2,
        reader_expectation_sync: {
          status: 'warn',
          missed: [{ key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' }],
          keep_alive: [{ key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' }],
        },
      }),
    },
  ]

  const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter3, [chapter2, chapter3], [], [], [], reviews)
  expect(contextPackage.reader_expectation_debt_context.must_carry[0].text).toContain('湿漉漉学生')
  expect(contextPackage.reader_expectation_debt_context.keep_alive[0].text).toContain('广播是谁发出的')

  const brief = buildChapterPreDraftBrief(project, contextPackage)
  expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('湿漉漉学生')
  expect(brief.reader_expectation_debt.must_carry[0].text).toContain('湿漉漉学生')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run test:novel-server -- ui/server/src/routes/novel-writing-service.test.ts
```

Expected: FAIL because `reader_expectation_debt_context` and `reader_expectation_ledger.carry_over` do not exist yet.

- [ ] **Step 3: Implement minimal backend support**

Add helper functions in `novel-writing-service.ts`:

```ts
function buildReaderExpectationDebtContext(chapter: any, chapters: any[], reviews: any[] = []) {
  // Extract latest reader_expectation_sync reviews for recent previous chapters.
}
```

Inject the result into `buildChapterContextPackage` as `reader_expectation_debt_context`, and pass it through `chapter_target.reader_expectation_debt_context`.

- [ ] **Step 4: Merge debt into the pre-draft brief**

Extend `buildReaderExpectationLedger` so previous missed items become `carry_over` and are also prepended to `must_deliver`. Extend `buildChapterPreDraftBrief` with:

```ts
reader_expectation_debt: readerExpectationDebtContext,
```

- [ ] **Step 5: Run backend test to verify it passes**

Run:

```bash
bun run test:novel-server -- ui/server/src/routes/novel-writing-service.test.ts
```

Expected: PASS.

### Task 2: Prose Prompt Enforcement

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.ts`

- [ ] **Step 1: Write the failing prompt test**

Add a test that calls the prose prompt builder with a context package containing `reader_expectation_debt_context`, and asserts the prompt includes “期待债务承接” and the debt text.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run test:novel-server -- ui/server/src/routes/novel-writing-service.test.ts
```

Expected: FAIL because the prompt does not mention debt carry-over.

- [ ] **Step 3: Implement prompt section**

Add a compact prose prompt block:

```ts
'【期待债务承接】',
'上一章或最近章节欠下的期待必须在本章可见推进；可延迟完全兑现，但不得遗忘、换线或矛盾改写。',
JSON.stringify(contextPackage?.reader_expectation_debt_context || {}, null, 2).slice(0, 3000),
```

- [ ] **Step 4: Run backend test to verify it passes**

Run:

```bash
bun run test:novel-server -- ui/server/src/routes/novel-writing-service.test.ts
```

Expected: PASS.

### Task 3: Frontend Task Book Display

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingRecommendationModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`

- [ ] **Step 1: Write the failing model test**

Add a test where `preDraftBrief.reader_expectation_debt` contains `must_carry` and `keep_alive`, and assert:

```ts
expect(summary.briefFields.expectationDebtMustCarry).toContain('湿漉漉学生')
expect(summary.briefFields.expectationDebtKeepAlive).toContain('广播是谁发出的')
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run test:writing-cockpit -- ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts
```

Expected: FAIL because the fields do not exist.

- [ ] **Step 3: Implement model and UI display**

Add `reader_expectation_debt` to `NovelPreDraftBrief`, add two brief fields, and render a compact `期待债务承接` section in `WorkspaceCenter.tsx`.

- [ ] **Step 4: Run frontend test to verify it passes**

Run:

```bash
bun run test:writing-cockpit -- ui/web/src/pages/novel-workspace/writingRecommendationModel.test.ts
```

Expected: PASS.

### Task 4: Documentation and Regression

**Files:**
- Modify: `docs/novel-usage-guide.md`

- [ ] **Step 1: Update usage guide**

Add a short section explaining that unresolved expectation debt from previous chapters is automatically carried into the next chapter task book.

- [ ] **Step 2: Run regression checks**

Run:

```bash
bun run test:novel-server
bun run test:writing-cockpit
bun run check
git diff --check
```

Expected: all commands exit 0.
