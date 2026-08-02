# Free-Text Opening Hook Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept conservative event-preserving paraphrases of legacy free-text chapter-ending hooks while continuing to reject new-goal skips and non-current surface mentions.

**Architecture:** Keep the existing exact, cluster, landing, and bridge paths intact. Add one bounded deterministic fallback inside `freeTextEndingHookHit`: filter non-current opening sentences, split hook evidence into independent action clauses, measure bounded shared Han-character fragments, and require two clause matches with at least one strong match.

**Tech Stack:** TypeScript, Bun test runner, deterministic novel continuity guards.

---

## File structure and responsibilities

- `ui/server/src/novel-writing/chapter-continuity-guard-directives.ts`: owns free-text primary-hook matching and the new bounded event-clause fallback.
- `ui/server/src/novel-writing/prose-candidate-continuity.test.ts`: exercises the public initial-prose admission path for connected, skipped, and non-current hospital handoffs.

## Task 1: Add conservative event-clause matching

**Files:**

- Modify: `ui/server/src/novel-writing/prose-candidate-continuity.test.ts`
- Modify: `ui/server/src/novel-writing/chapter-continuity-guard-directives.ts`

- [ ] **Step 1: Extend the hospital tests with non-current negative cases**

In `accepts connected hospital key handoff and rejects skip-to-new-goal opening`, add this fixture and assertion before the connected assertion:

```ts
const surfaceOnly = chapterScaleText(
  '旧照片里的江哲一脚踩着融化的护士，旁边写着医生办公室的钥匙。那只是旧档案。此刻他已经翻开《医生守则》。',
)
expect(assessInitialProseOpeningContinuity(surfaceOnly, hospitalContext))
  .toMatchObject({ required: true, passed: false })
```

In `accepts connected ch5->ch6 baton handoff and rejects ICU skip`, add this fixture and assertion before the connected assertion:

```ts
const surfaceOnly = chapterScaleText(
  '档案里记录着保安诡异狞笑着举起电击棍砸下。那已经是多年前的旧事。江哲此刻直接进入重症监护室。',
)
expect(assessInitialProseOpeningContinuity(surfaceOnly, hospitalCorridorContext))
  .toMatchObject({ required: true, passed: false })
```

Keep both existing connected and skipped assertions unchanged. They are the primary RED and prevent the negative fixtures from replacing the actual bug reproduction.

- [ ] **Step 2: Run the two focused tests and verify RED**

Run:

```bash
bun test ui/server/src/novel-writing/prose-candidate-continuity.test.ts \
  -t 'accepts connected hospital key handoff|accepts connected ch5->ch6 baton handoff'
```

Expected: both tests fail only because their connected candidates still return `opening_primary_hook_miss`; both new surface-only candidates return `passed: false`.

- [ ] **Step 3: Add bounded current-action and shared-fragment helpers**

Immediately above `freeTextEndingHookHit` in `chapter-continuity-guard-directives.ts`, add:

```ts
const NON_CURRENT_FREE_TEXT_SENTENCE_PATTERN =
  /照片|相片|旧照|消息里|短信里|来信里|档案里|记录里|梦里|梦中|已经是.{0,16}(?:年前|过去|往事|旧事)|成了过去/u

function currentActionFreeTextOpening(value: any) {
  return String(value || '')
    .slice(0, 900)
    .split(/(?<=[。！？!?；;\n])/u)
    .filter(sentence => !NON_CURRENT_FREE_TEXT_SENTENCE_PATTERN.test(sentence))
    .join('')
}

function compactHanText(value: any, limit: number) {
  return (String(value || '').match(/[\p{Script=Han}]+/gu) || [])
    .join('')
    .slice(0, limit)
}

function longestSharedHanFragment(source: string, opening: string) {
  const left = compactHanText(source, 80)
  const right = compactHanText(opening, 900)
  const maxLength = Math.min(12, left.length, right.length)
  for (let length = maxLength; length >= 3; length -= 1) {
    for (let index = 0; index + length <= left.length; index += 1) {
      if (right.includes(left.slice(index, index + length))) return length
    }
  }
  return 0
}

function freeTextEventClauseHit(opening: string, sources: any[]) {
  const currentOpening = currentActionFreeTextOpening(opening)
  if (!currentOpening.trim()) return false
  const clauses = uniqueTexts(
    sources.flatMap(source => String(source || '').split(/[，,。！？!?；;：:“”"'《》\n]+/u)),
    40,
  )
    .map(clause => compactHanText(clause, 80))
    .filter(clause => clause.length >= 3)
  const strengths = clauses
    .map(clause => longestSharedHanFragment(clause, currentOpening))
    .filter(length => length >= 3)
  return strengths.length >= 2 && strengths.some(length => length >= 4)
}
```

The helper is deliberately bounded: source clauses are at most 80 Han characters, the opening is at most 900 characters, comparison stops at 12 characters, and at most 40 unique clauses are inspected.

- [ ] **Step 4: Wire the fallback into `freeTextEndingHookHit`**

Replace the initial `open` assignment with the current-action view:

```ts
const open = currentActionFreeTextOpening(opening)
```

Keep the existing exact and keyword paths. Immediately before the existing keyword-overlap block, add:

```ts
if (freeTextEventClauseHit(open, [
  endingHook,
  primary?.evidence,
  lastLine,
  ...lastLines.slice(-3),
])) return true
```

Do not change `detectOpeningHookMissDirective`, `assessPrimaryOpeningHookContinuity`, structured continuity aliases, cluster matching, climax replay, or bridge construction.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
bun test ui/server/src/novel-writing/prose-candidate-continuity.test.ts \
  -t 'accepts connected hospital key handoff|accepts connected ch5->ch6 baton handoff'
```

Expected: 2 pass, 0 fail. Connected paraphrases pass; skip-to-new-goal and surface-only candidates remain failed admissions.

- [ ] **Step 6: Run continuity guard regressions**

Run:

```bash
bun test \
  ui/server/src/novel-writing/prose-candidate-continuity.test.ts \
  ui/server/src/novel-writing/chapter-continuity-guard.test.ts
```

Expected: 0 failures. This includes generic handoffs, primary hooks, structure-backed hooks, explicit bridges, and climax replay protection.

- [ ] **Step 7: Run production-path admission regressions**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.quality-wiring-a.test.ts
```

Expected: 32 pass, 0 fail. The disconnected opening still blocks before review or repair; canonical and malformed draft-only candidates still have zero writes.

- [ ] **Step 8: Review the diff and commit**

Run:

```bash
git diff --check
git diff -- \
  ui/server/src/novel-writing/chapter-continuity-guard-directives.ts \
  ui/server/src/novel-writing/prose-candidate-continuity.test.ts
git status --short
```

Confirm only the two planned files changed in addition to the pre-existing uncommitted `workspace/*` local state. Then commit only the planned files:

```bash
git add \
  ui/server/src/novel-writing/chapter-continuity-guard-directives.ts \
  ui/server/src/novel-writing/prose-candidate-continuity.test.ts
git commit -m "fix(novel): accept conservative hook paraphrases"
```
