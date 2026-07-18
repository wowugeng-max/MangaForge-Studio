# Established Event Canon P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent later chapters from silently rewriting earlier established events (death methods, rule triggers, etc.) by extracting, merging, injecting, and checking event-level canon facts during story-state sync and chapter writing.

**Architecture:** Add a focused pure module `established-event-canon.ts` for normalize/merge/select/check. Wire it into story-state prompt extraction, `mergeStoryState`, longform memory capsule, prose prompt hard rules, and a high-priority warn consistency check. Surface a compact established-events summary on the existing story-state panel without adding a new page.

**Tech Stack:** Bun/TypeScript server (`ui/server`), React + Ant Design web (`ui/web`), existing story-state sync + writing cockpit.

**Spec:** `docs/superpowers/specs/2026-07-15-established-event-canon-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `ui/server/src/novel-writing/established-event-canon.ts` | Types, normalize, merge, select-for-inject, consistency check, text projection |
| `ui/server/src/novel-writing/established-event-canon.test.ts` | Pure unit tests for merge/select/check |
| `ui/server/src/novel-writing/story-state-prompt.ts` | Ask model for `established_events` in sync JSON |
| `ui/server/src/novel-writing/story-state-prompt.test.ts` | Assert prompt requires established_events |
| `ui/server/src/routes/novel-writing-service.ts` | Merge into story_state; capsule projection; prompt inject; optional check wiring |
| `ui/web/src/pages/novel-workspace/writingCockpitModel.ts` | storyStatePanel established-events summary fields |
| `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts` | Panel text/status for locked events |
| `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx` | Render locked/candidate/conflict counts + guidance |
| `docs/novel-usage-guide.md` | Short usage note under 长篇记忆胶囊 / 故事状态 |

---

### Task 1: Pure event-canon module (normalize + merge)

**Files:**
- Create: `ui/server/src/novel-writing/established-event-canon.ts`
- Create: `ui/server/src/novel-writing/established-event-canon.test.ts`

- [ ] **Step 1: Write failing tests for normalize + merge rules**

Create `ui/server/src/novel-writing/established-event-canon.test.ts` covering:
- drop events without fact/source_excerpt
- auto-confirm high-confidence death/rule events
- empty incoming does not wipe previous confirmed events
- contradicting candidate does not overwrite confirmed
- compatible richer event merges constraints
- projectCanonFactsFromEvents outputs readable facts

Key assertions:

```ts
import { describe, expect, test } from 'bun:test'
import {
  mergeEstablishedEvents,
  normalizeEstablishedEvent,
  projectCanonFactsFromEvents,
  scanEstablishedEventConflicts,
  selectEstablishedEventsForChapter,
} from './established-event-canon'

test('empty incoming does not wipe previous confirmed events', () => {
  const prev = [normalizeEstablishedEvent({
    kind: 'death', subject: '林战', predicate: '死亡方式',
    fact: '林战因违规开门被剥皮而死',
    source_excerpt: '他开了不该开的门，被剥皮', confidence: 0.95,
  }, 1)!]
  expect(mergeEstablishedEvents(prev, [])).toHaveLength(1)
})

test('contradicting candidate does not overwrite confirmed', () => {
  const prev = [normalizeEstablishedEvent({
    kind: 'death', subject: '林战', predicate: '死亡方式',
    fact: '林战因违规开门被剥皮而死', mechanism: '苍白带刺手剥皮',
    source_excerpt: '开了不该开的门', confidence: 0.95,
  }, 1)!]
  const incoming = [normalizeEstablishedEvent({
    kind: 'death', subject: '林战', predicate: '死亡方式',
    fact: '林战因回头被虚空钢丝剥皮而死', mechanism: '虚空钢丝',
    source_excerpt: '他回头的瞬间', confidence: 0.7,
  }, 2)!]
  const merged = mergeEstablishedEvents(prev, incoming)
  expect(merged[0].fact).toContain('违规开门')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ui/server && bun test src/novel-writing/established-event-canon.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement `established-event-canon.ts`**

Implement exports:
- `normalizeEstablishedEvent`
- `mergeEstablishedEvents`
- `projectCanonFactsFromEvents`
- `selectEstablishedEventsForChapter`
- `scanEstablishedEventConflicts`
- `summarizeEstablishedEvents`

Rules to encode:
1. No fact or no source_excerpt => drop
2. death/rule_trigger + confidence >= 0.85 => confirmed + hard
3. Empty incoming keeps previous
4. Confirmed not overwritten by incompatible candidate
5. Compatible richer fields merge (cause/mechanism/constraints)
6. Conflict scan is warn-only helper based on missing mechanism/cause/constraint anchors when subject is restated

Use identity key: `subject::predicate`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ui/server && bun test src/novel-writing/established-event-canon.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/novel-writing/established-event-canon.ts ui/server/src/novel-writing/established-event-canon.test.ts
git commit -m "feat(novel): add established event canon pure helpers"
```

---

### Task 2: Story-state prompt extraction

**Files:**
- Modify: `ui/server/src/novel-writing/story-state-prompt.ts`
- Modify: `ui/server/src/novel-writing/story-state-prompt.test.ts`

- [ ] **Step 1: Add failing prompt contract test**

```ts
test('story state prompt requires established_events with source_excerpt', () => {
  const prompt = buildStoryStatePrompt({ id: 1 }, { chapter_no: 1 }, '林战开了不该开的门。')
  expect(prompt).toContain('established_events')
  expect(prompt).toContain('source_excerpt')
  expect(prompt).toMatch(/死亡|规则触发|不可改写|正史/)
})
```

- [ ] **Step 2: Run test to verify fail**

```bash
cd ui/server && bun test src/novel-writing/story-state-prompt.test.ts
```

- [ ] **Step 3: Extend `buildStoryStatePrompt` output contract**

Add top-level JSON field instructions:

```text
established_events: array
每项: kind, subject, predicate, fact, cause, mechanism, constraints, aliases, source_excerpt, confidence, tags
只抽正文明确发生、后续复述不能改写的事件级正史
优先: death/injury/rule_trigger/ability_cost/identity_reveal/item_transfer/promise/secret_known
每条必须带 source_excerpt；没有原文证据不要输出
death/rule_trigger 尽量 high confidence (>=0.85) 并写清 cause/mechanism/constraints
```

- [ ] **Step 4: Re-run tests**

```bash
cd ui/server && bun test src/novel-writing/story-state-prompt.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/novel-writing/story-state-prompt.ts ui/server/src/novel-writing/story-state-prompt.test.ts
git commit -m "feat(novel): extract established_events during story-state sync"
```

---

### Task 3: Persist via mergeStoryState + capsule projection

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`

- [ ] **Step 1: Import pure helpers near other novel-writing imports**

```ts
import {
  mergeEstablishedEvents,
  projectCanonFactsFromEvents,
  selectEstablishedEventsForChapter,
  scanEstablishedEventConflicts,
} from '../novel-writing/established-event-canon'
```

- [ ] **Step 2: Update `mergeStoryState` (around line ~42243)**

Keep existing specialized merges. Add:

```ts
const establishedEvents = mergeEstablishedEvents(
  [
    ...asArray((prev || {}).established_events),
    ...asArray((prev || {}).canon_facts),
  ],
  [
    ...asArray((delta || {}).established_events),
    ...asArray((delta || {}).canon_facts),
  ],
  { chapterNo: chapter?.chapter_no },
)
const projectedFacts = projectCanonFactsFromEvents(establishedEvents)
```

Return fields:
- `established_events: establishedEvents`
- `canon_facts: projectedFacts.length ? projectedFacts : (delta non-empty ? delta : prev)`

Do not empty-overwrite other arrays.

- [ ] **Step 3: Forward model output into state delta**

In `prepareStoryStateUpdate` / agent result mapping, copy:

```ts
established_events: asArray(result?.established_events || result?.state_delta?.established_events)
```

into the delta passed to `mergeStoryState`.

- [ ] **Step 4: Project into `buildLongformMemoryCapsule`**

Merge `story_state.established_events` + existing `canon_facts`, then:

```ts
canon_facts: unique([...projectCanonFactsFromEvents(established), ...existingNormalizedFacts]).slice(0, 12)
```

- [ ] **Step 5: Run pure + prompt tests**

```bash
cd ui/server && bun test src/novel-writing/established-event-canon.test.ts src/novel-writing/story-state-prompt.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/routes/novel-writing-service.ts
git commit -m "feat(novel): persist established events in story state merge"
```

---

### Task 4: Inject into chapter writing context + consistency warn

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/novel-writing/established-event-canon.test.ts`

- [ ] **Step 1: Attach `established_events_contract` on chapter target / context package**

When assembling pre-draft / chapter_target:

```ts
established_events_contract: {
  version: 'established_event_canon_v1',
  events: selectEstablishedEventsForChapter({
    events: storyState.established_events || storyState.canon_facts,
    chapterNo,
    outlineText: JSON.stringify(chapter?.outline || chapter?.blueprint || ''),
    previousExcerpt: previous?.ending_excerpt || '',
    limit: 10,
  }),
  hard_rules: [
    '复述已锁正史事件时，不得改写 cause/mechanism/constraints；只能同义转述。',
    '闪回前任死亡、规则触发、能力代价时必须命中 established_events_contract.events。',
  ],
}
```

- [ ] **Step 2: Add prose hard-rule line near longform memory rules**

```ts
'14A++++++. 执行 chapter_target.established_events_contract：已锁正史事件不得在闪回或复述中改写；只能同义转述，并保留 cause/mechanism/constraints。'
```

If events non-empty, inject compact JSON/text section capped ~2k chars.

- [ ] **Step 3: Post-generate warn-only consistency check**

Near quality aggregation / canonical continuity:

```ts
const establishedEventConflicts = scanEstablishedEventConflicts({
  chapterText: finalText,
  events: chapterTarget.established_events_contract?.events || storyState.established_events,
})
```

Map to high-priority warnings. **Do not block store in P0.**

- [ ] **Step 4: Add tests for select + scan**

```ts
test('scanEstablishedEventConflicts warns when death mechanism rewritten', () => {
  const events = [normalizeEstablishedEvent({
    kind: 'death', subject: '林战', predicate: '死亡方式',
    fact: '林战因违规开门被苍白带刺手剥皮而死',
    mechanism: '苍白带刺手剥皮', cause: '违规开门',
    constraints: ['违规开门', '苍白带刺'],
    source_excerpt: '他开了不该开的门', confidence: 0.95,
  }, 1)!]
  const conflicts = scanEstablishedEventConflicts({
    events,
    chapterText: '林战死了。他当时只是回头看了一眼，就被虚空钢丝剥皮。',
  })
  expect(conflicts.length).toBeGreaterThan(0)
})
```

- [ ] **Step 5: Run tests**

```bash
cd ui/server && bun test src/novel-writing/established-event-canon.test.ts src/novel-writing/story-state-prompt.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/novel-writing/established-event-canon.ts ui/server/src/novel-writing/established-event-canon.test.ts
git commit -m "feat(novel): inject and warn on established event rewrites"
```

---

### Task 5: Writing cockpit UI summary

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`

- [ ] **Step 1: Extend `buildStoryStatePanel`**

Add:

```ts
establishedEvents?: {
  confirmedCount: number
  candidateCount: number
  hardCount: number
  preview: string[]
  guidance: string
} | null
```

Derive from `storyState.established_events` or fallback `canon_facts`.
Reuse existing `sync_story_state` action; no second sync button.
If synced but preview empty, add reason: `未抽到事件级正史（死亡/规则等），闪回章可能改写旧事实`.

- [ ] **Step 2: Render in `WritingCockpitPanel` inside existing story-state card**

Show:
- 正史事件：已锁 n／候选 n／硬锁 n
- preview list or guidance text

- [ ] **Step 3: Model unit test**

Assert panel exposes confirmedCount/preview containing 林战 when storyState has established_events.

- [ ] **Step 4: Run web model test with repo's existing runner**

```bash
cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts
```

If package uses vitest/npm, use the existing script from `ui/web/package.json`.

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx
git commit -m "feat(novel-ui): show established event locks on story-state panel"
```

---

### Task 6: Docs + sanity checklist

**Files:**
- Modify: `docs/novel-usage-guide.md`

- [ ] **Step 1: Add short usage note under 长篇记忆胶囊 / 正史事实**

Explain:
- sync extracts death/rule events into 正史事实
- flashbacks must paraphrase, not rewrite mechanism
- empty event list after sync => re-sync
- conflict warning => revise restatement before continuing

- [ ] **Step 2: Manual sanity on 怪谈项目**

1. Ch1 sync story state
2. Confirm 林战/楚弦 death events present
3. Open ch2 brief/capsule includes them
4. Rewritten death draft produces warn
5. Empty re-sync does not wipe events

- [ ] **Step 3: Final test batch**

```bash
cd ui/server && bun test src/novel-writing/established-event-canon.test.ts src/novel-writing/story-state-prompt.test.ts
```

- [ ] **Step 4: Commit docs**

```bash
git add docs/novel-usage-guide.md docs/superpowers/specs/2026-07-15-established-event-canon-design.md docs/superpowers/plans/2026-07-15-established-event-canon.md
git commit -m "docs(novel): document established event canon P0"
```

---

## Out of scope (P1+)

- Manual edit / confirm / supersede forms
- Blocking pre-store gate for event conflicts
- Full semantic paraphrase equivalence
- Auto-rewrite of conflicting prose
- Standalone 正史管理 page

## Agent constraints

1. Prefer pure helpers; keep `novel-writing-service.ts` wiring minimal.
2. Never empty-overwrite existing story_state arrays.
3. Do not revive local fallback prose generation.
4. Warn > block in P0.
5. Reuse `sync_story_state`; no duplicate sync entry points.
6. Match local test fixture patterns instead of inventing new harnesses.
