# oh-story 按建议改稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a whole-chapter “按建议改稿” action that rewrites the current chapter from a matching oh-story review, and refuse when the review hash does not match the current text.

**Architecture:** Keep review/deslop as skill-backed actions. Add `apply` as a third runner action that does not load any SKILL.md. Review persistence gains `chapter_text_hash`. Apply loads the latest `oh_story_review` for the chapter, compares SHA-256, then writes prose the same way deslop does. The quality bar gets a third button; the server remains the gate.

**Tech Stack:** TypeScript, bun:test, existing Express oh-story core routes, `reviews` / chapter versions, Ant Design quality panel.

**Spec:** `docs/superpowers/specs/2026-08-14-oh-story-apply-from-review-design.md`

**Worktree:** Implement only in `/Users/ruiyaosong/MangaForge-Studio/.worktrees/oh-story-core-skill-shell`. Do not `bun run dev` from the worktree server package (it points at main).

**Commit policy:** This repo’s user rule wins over the skill’s “commit every task” default. Skip every Commit step unless the user explicitly asks to commit.

**Do not:** re-enable editor revision, theory `must_fix`, fingerprint rollback, auto re-review, per-item patches, director primary-action changes, or chapter-header「一键修订」.

---

## File map

Create:

- `ui/server/src/novel-writing/oh-story-core/chapter-text-hash.ts`
- `ui/server/src/novel-writing/oh-story-core/chapter-text-hash.test.ts`
- `ui/server/src/novel-writing/oh-story-core/review-match.ts`
- `ui/server/src/novel-writing/oh-story-core/review-match.test.ts`
- `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.ts`
- `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.test.ts`
- `ui/web/src/pages/novel-workspace/oh-story-chapter-text-hash.ts`
- `ui/web/src/pages/novel-workspace/oh-story-chapter-text-hash.test.ts`

Modify:

- `ui/server/src/novel-writing/oh-story-core/runner.ts`
- `ui/server/src/novel-writing/oh-story-core/runner.test.ts`
- `ui/server/src/routes/novel-oh-story-core-routes.ts`
- `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- `ui/server/src/routes/novel-commercial-ops-routes.test.ts`
- `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`
- `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
- `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`
- `ui/web/src/pages/novel-workspace/shell/workspace-view-bind-core-handlers.ts`
- `ui/web/src/pages/novel-workspace/shell/workspace-view-props-area.ts`
- `ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx`
- `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`

Shared names (do not rename):

```ts
export const OH_STORY_APPLY_NO_REVIEW = 'OH_STORY_APPLY_NO_REVIEW'
export const OH_STORY_APPLY_STALE_REVIEW = 'OH_STORY_APPLY_STALE_REVIEW'
export const OH_STORY_APPLY_STALE_MESSAGE = '先对本稿重新审稿'
export const OH_STORY_APPLY_EMPTY_MESSAGE = '这次没有改出正文'
```

---

### Task 1: Chapter text hash

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/chapter-text-hash.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/chapter-text-hash.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createHash } from 'node:crypto'
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './chapter-text-hash'

test('hashes the exact chapter_text bytes with sha256 hex', () => {
  expect(ohStoryChapterTextHash('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  const text = '楚弦咽气的时候。'
  expect(ohStoryChapterTextHash(text)).toBe(
    createHash('sha256').update(text, 'utf8').digest('hex'),
  )
  expect(ohStoryChapterTextHash(`${text} `)).not.toBe(ohStoryChapterTextHash(text))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/chapter-text-hash.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { createHash } from 'node:crypto'

export function ohStoryChapterTextHash(text: string): string {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/chapter-text-hash.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 2: Review match helper

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/review-match.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/review-match.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './chapter-text-hash'
import {
  latestOhStoryReviewForChapter,
  ohStoryReviewMatchesChapterText,
  parseOhStoryReviewPayload,
} from './review-match'

const text = '楚弦咽气的时候。'

test('parses object or json payload', () => {
  expect(parseOhStoryReviewPayload({ payload: { chapter_id: 61 } }).chapter_id).toBe(61)
  expect(parseOhStoryReviewPayload({ payload: '{"chapter_id":61}' }).chapter_id).toBe(61)
})

test('picks the newest review for the chapter', () => {
  const latest = latestOhStoryReviewForChapter([
    { id: 1, created_at: '2026-08-14T12:00:00.000Z', payload: { chapter_id: 61 } },
    { id: 3, created_at: '2026-08-14T13:00:00.000Z', payload: { chapter_id: 61 } },
    { id: 2, created_at: '2026-08-14T14:00:00.000Z', payload: { chapter_id: 8 } },
  ], 61)
  expect(latest.id).toBe(3)
})

test('matches only when chapter_text_hash equals the current text hash', () => {
  const review = { payload: { chapter_text_hash: ohStoryChapterTextHash(text) } }
  expect(ohStoryReviewMatchesChapterText(review, text)).toBe(true)
  expect(ohStoryReviewMatchesChapterText(review, `${text}改`)).toBe(false)
  expect(ohStoryReviewMatchesChapterText({ payload: {} }, text)).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/review-match.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { ohStoryChapterTextHash } from './chapter-text-hash'

export function parseOhStoryReviewPayload(review: any): any {
  const raw = review?.payload
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return {}
  }
}

export function latestOhStoryReviewForChapter(reviews: any[], chapterId: number): any | null {
  return (reviews || [])
    .filter((review) => {
      const payload = parseOhStoryReviewPayload(review)
      return Number(payload.chapter_id || review.chapter_id || 0) === Number(chapterId)
    })
    .slice()
    .sort((left, right) => {
      const byTime = String(right.created_at || '').localeCompare(String(left.created_at || ''))
      return byTime !== 0 ? byTime : Number(right.id || 0) - Number(left.id || 0)
    })[0] || null
}

export function ohStoryReviewMatchesChapterText(review: any, chapterText: string): boolean {
  const hash = String(parseOhStoryReviewPayload(review).chapter_text_hash || '')
  return Boolean(hash) && hash === ohStoryChapterTextHash(chapterText)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/review-match.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 3: Review persistence stores the hash

**Files:**
- Modify: `ui/server/src/novel-writing/oh-story-core/runner.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/runner.test.ts`

- [ ] **Step 1: Add a failing assertion to the existing review test**

In `story-review saves a review and does not call updateChapterText`, after `expect(saves[0].payload.skill_id).toBe('story-review')` add:

```ts
expect(saves[0].payload.chapter_text_hash).toBe(
  createHash('sha256').update('楚弦咽气的时候。', 'utf8').digest('hex'),
)
```

Import `createHash` from `node:crypto` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/runner.test.ts`

Expected: FAIL because `chapter_text_hash` is missing.

- [ ] **Step 3: Write minimal implementation**

In the review `saveReview` payload, add:

```ts
chapter_text_hash: ohStoryChapterTextHash(input.chapter.chapter_text),
```

Import `ohStoryChapterTextHash` from `./chapter-text-hash`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/runner.test.ts`

Expected: PASS. Existing deslop tests must still pass.

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 4: Apply prompt compiler

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from 'bun:test'
import { compileOhStoryApplyPrompt } from './compile-apply-prompt'

test('apply prompt includes chapter, review, and the revise-all-chapter contract', () => {
  const prompt = compileOhStoryApplyPrompt({
    projectTitle: '怪谈世界',
    chapterText: '楚弦咽气的时候。',
    reportText: '=== 故事审查报告（solo）===\n### 修改建议\n把开篇的解释删掉。',
  })
  expect(prompt).toContain('怪谈世界')
  expect(prompt).toContain('楚弦咽气的时候。')
  expect(prompt).toContain('把开篇的解释删掉。')
  expect(prompt).toContain('### 修订后全文')
  expect(prompt).toMatch(/solo/)
  expect(prompt).toContain('修改建议')
  expect(prompt).not.toContain('补三层矛盾网')
  expect(prompt).not.toContain('story-long-write')
  expect(prompt).not.toContain('【SKILL.md】')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/compile-apply-prompt.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function compileOhStoryApplyPrompt(input: {
  projectTitle: string
  chapterText: string
  reportText: string
}): string {
  return [
    '【执行模式】solo。不要 spawn 子 agent，不要读写 .novel/。',
    `项目：${input.projectTitle}`,
    '按建议改稿：根据审稿报告里的「修改建议」改写整章。Findings 只作证据，不要另加系统理论课，不要输出新的审查报告。',
    '完整修订正文必须放在「### 修订后全文」之后。MangaForge 只把这一段写入章节。',
    '【原文】',
    input.chapterText,
    '【审稿报告】',
    input.reportText,
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/compile-apply-prompt.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 5: Apply runner gates and write path

**Files:**
- Modify: `ui/server/src/novel-writing/oh-story-core/runner.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/runner.test.ts`

Extend types:

```ts
export const OH_STORY_APPLY_NO_REVIEW = 'OH_STORY_APPLY_NO_REVIEW'
export const OH_STORY_APPLY_STALE_REVIEW = 'OH_STORY_APPLY_STALE_REVIEW'
export type OhStoryCoreAction = 'review' | 'deslop' | 'apply'
```

Add to `RunOhStoryCoreActionInput`:

```ts
findLatestOhStoryReview?: (input: {
  workspace: string
  projectId: number
  chapterId: number
}) => Promise<any | null>
```

Apply must run **before** the suite/skill lookup. Missing suite must not block apply.

Extract helper (same file or next to deslop extract):

```ts
export function extractOhStoryApplyChapterText(content: string): string {
  const raw = String(content || '').trim()
  if (!raw) throwNotProse()
  const marker = raw.match(/(?:^|\n)#{2,3}\s*修订后全文\s*\n+/)
  if (marker && marker.index != null) {
    const prose = raw.slice(marker.index + marker[0].length).trim()
    if (!prose || looksLikeDeslopReport(prose)) throwNotProse()
    return prose
  }
  if (looksLikeDeslopReport(raw)) throwNotProse()
  return raw
}
```

Reuse `looksLikeDeslopReport` (it already matches `故事审查报告`).

- [ ] **Step 1: Write the failing tests**

Append to `runner.test.ts`:

```ts
import { OH_STORY_APPLY_NO_REVIEW, OH_STORY_APPLY_STALE_REVIEW } from './runner'
import { ohStoryChapterTextHash } from './chapter-text-hash'

const applyBase = {
  workspace: '/tmp/ws',
  project: { id: 3, title: '怪谈世界' },
  chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
  action: 'apply' as const,
  loadSuite: () => null,
  saveReview: async () => ({ id: 9 }),
}

test('apply refuses when there is no matching review', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      ...applyBase,
      executeAgent: async () => ({ content: 'should not run' }),
      findLatestOhStoryReview: async () => null,
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe(OH_STORY_APPLY_NO_REVIEW)
})

test('apply refuses a review without hash or with a different hash', async () => {
  const text = '楚弦咽气的时候。'
  for (const review of [
    { id: 1, payload: { chapter_id: 61, report_text: '建议' } },
    { id: 2, payload: { chapter_id: 61, report_text: '建议', chapter_text_hash: ohStoryChapterTextHash(`${text}改`) } },
  ]) {
    const updates: any[] = []
    let error: any
    try {
      await runOhStoryCoreAction({
        ...applyBase,
        executeAgent: async () => ({ content: 'should not run' }),
        findLatestOhStoryReview: async () => review,
        updateChapterText: async (row) => { updates.push(row) },
      })
    } catch (caught) {
      error = caught
    }
    expect(updates).toEqual([])
    expect(error?.code).toBe(OH_STORY_APPLY_STALE_REVIEW)
  }
})

test('apply writes only the prose after 修订后全文 and saves oh_story_apply', async () => {
  const text = '楚弦咽气的时候。'
  const saves: any[] = []
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    ...applyBase,
    modelId: 281,
    executeAgent: async () => ({
      content: '=== 故事审查报告 ===\n### 修订后全文\n\n楚弦把烟按进了烟灰缸。',
    }),
    findLatestOhStoryReview: async () => ({
      id: 13560,
      payload: {
        chapter_id: 61,
        report_text: '### 修改建议\n删掉解释。',
        chapter_text_hash: ohStoryChapterTextHash(text),
      },
    }),
    saveReview: async (row) => { saves.push(row); return { id: 88 } },
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0]).toMatchObject({
    chapter_text: '楚弦把烟按进了烟灰缸。',
    source: 'oh_story_apply',
  })
  expect(saves[0].review_type).toBe('oh_story_apply')
  expect(saves[0].payload.source_review_id).toBe(13560)
  expect(saves[0].payload.chapter_text_hash).toBe(ohStoryChapterTextHash(text))
  expect(result.changed).toBe(true)
  expect(result.chapter_text).toBe('楚弦把烟按进了烟灰缸。')
})

test('apply does not write a review report as chapter text', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      ...applyBase,
      executeAgent: async () => ({ content: '=== 故事审查报告（solo）===\n### 修改建议\n再改一刀。' }),
      findLatestOhStoryReview: async () => ({
        id: 1,
        payload: {
          chapter_id: 61,
          report_text: '建议',
          chapter_text_hash: ohStoryChapterTextHash('楚弦咽气的时候。'),
        },
      }),
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe('OH_STORY_CORE_NOT_PROSE')
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/runner.test.ts`

Expected: FAIL on `action: 'apply'` / missing find / missing write path.

- [ ] **Step 3: Write minimal implementation**

In `runOhStoryCoreAction`, before suite lookup:

```ts
if (input.action === 'apply') {
  const review = await (input.findLatestOhStoryReview?.({
    workspace: input.workspace,
    projectId: input.project.id,
    chapterId: input.chapter.id,
  }) ?? null)
  if (!review) {
    throw Object.assign(new Error('先对本稿重新审稿'), { code: OH_STORY_APPLY_NO_REVIEW })
  }
  if (!ohStoryReviewMatchesChapterText(review, input.chapter.chapter_text)) {
    throw Object.assign(new Error('先对本稿重新审稿'), { code: OH_STORY_APPLY_STALE_REVIEW })
  }
  const reportText = String(parseOhStoryReviewPayload(review).report_text || '').trim()
  const prompt = compileOhStoryApplyPrompt({
    projectTitle: input.project.title,
    chapterText: input.chapter.chapter_text,
    reportText,
  })
  const result = await input.executeAgent(
    'humanize',
    'humanize_prose',
    'prose-agent',
    input.project,
    { task: prompt },
    {
      activeWorkspace: input.workspace,
      skipMemory: true,
      ...(input.modelId ? { modelId: String(input.modelId) } : {}),
    },
  )
  const content = requireAgentContent(result)
  const chapterText = extractOhStoryApplyChapterText(content)
  await input.updateChapterText({
    id: input.chapter.id,
    chapter_id: input.chapter.id,
    project_id: input.project.id,
    chapter_text: chapterText,
    source: 'oh_story_apply',
  })
  const saved = await input.saveReview({
    project_id: input.project.id,
    review_type: 'oh_story_apply',
    payload: {
      source_review_id: review.id,
      chapter_id: input.chapter.id,
      chapter_no: input.chapter.chapter_no,
      chapter_text_hash: ohStoryChapterTextHash(input.chapter.chapter_text),
      report_text: content,
    },
  })
  return { changed: true, review_id: saved?.id, chapter_text: chapterText }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ui/server && bun test src/novel-writing/oh-story-core/runner.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 6: Apply route and error mapping

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Test: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- Test: `ui/server/src/routes/novel-commercial-ops-routes.test.ts`

Default `findLatestOhStoryReview` in `resolveDeps`:

```ts
import { listNovelReviewsByType } from '../novel'
import { latestOhStoryReviewForChapter } from '../novel-writing/oh-story-core/review-match'

findLatestOhStoryReview: deps.findLatestOhStoryReview || (async ({ workspace, projectId, chapterId }) => {
  const reviews = await listNovelReviewsByType(workspace, projectId, 'oh_story_review')
  return latestOhStoryReviewForChapter(reviews, chapterId)
})
```

Pass it into `runOhStoryCoreAction`.

Change default `updateChapterText` to honor `row.source`:

```ts
{ versionSource: String(row.source || 'oh_story_deslop') }
```

`getStageModelId(project, action === 'review' ? 'review' : 'revise', requestedModelId)` — apply uses `revise`, same as deslop.

Map apply errors in `handleAction`:

```ts
if (code === 'OH_STORY_APPLY_NO_REVIEW' || code === 'OH_STORY_APPLY_STALE_REVIEW') {
  return res.status(409).json({ error: '先对本稿重新审稿', code })
}
if (code === 'OH_STORY_CORE_EMPTY_OUTPUT' || code === 'OH_STORY_CORE_NOT_PROSE') {
  return res.status(500).json({ error: '这次没有改出正文', code })
}
```

Register:

```ts
app.post('/api/novel/oh-story/core/apply', handleAction('apply'))
```

- [ ] **Step 1: Write the failing route tests**

Add to `novel-oh-story-core-routes.test.ts`:

```ts
test('POST apply calls runAction with action apply', async () => {
  const calls: any[] = []
  const { handlers } = routeHarness({
    runAction: async (input: any) => {
      calls.push(input)
      return { changed: true, chapter_text: '楚弦把烟按进了烟灰缸。' }
    },
  })
  const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/apply'), {
    body: { project_id: 3, chapter_id: 61, model_id: 281 },
  })
  expect(calls[0].action).toBe('apply')
  expect(calls[0].modelId).toBe(281)
  expect(res.statusCode).toBe(200)
  expect(res.body.changed).toBe(true)
})

test('POST apply maps missing or stale review to 409', async () => {
  for (const code of ['OH_STORY_APPLY_NO_REVIEW', 'OH_STORY_APPLY_STALE_REVIEW']) {
    const { handlers } = routeHarness({
      runAction: async () => {
        throw Object.assign(new Error(code), { code })
      },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/apply'), chapterBody)
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe(code)
    expect(res.body.error).toBe('先对本稿重新审稿')
  }
})
```

Change the registered-paths test to include `POST /api/novel/oh-story/core/apply` after deslop.

In `novel-commercial-ops-routes.test.ts`, add the same path to the expected oh-story route list.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```
cd ui/server && bun test src/routes/novel-oh-story-core-routes.test.ts src/routes/novel-commercial-ops-routes.test.ts
```

Expected: FAIL — apply route missing / path list mismatch.

- [ ] **Step 3: Write minimal implementation**

Register the route, wire `findLatestOhStoryReview`, honor `row.source`, map 409/empty-prose errors.

- [ ] **Step 4: Run tests to verify they pass**

Run the same command.

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 7: Web hash helper and quality-bar button

**Files:**
- Create: `ui/web/src/pages/novel-workspace/oh-story-chapter-text-hash.ts`
- Test: `ui/web/src/pages/novel-workspace/oh-story-chapter-text-hash.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`

The web hash digest must equal the server helper. Bun tests can use `node:crypto`. If `vite build` later fails on that import, keep the same digest and add a browser-safe fallback in the same file; do not change the hex output.

- [ ] **Step 1: Write the failing tests**

`oh-story-chapter-text-hash.test.ts`:

```ts
import { createHash } from 'node:crypto'
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'

test('matches the server sha256 hex digest', () => {
  const text = '楚弦咽气的时候。'
  expect(ohStoryChapterTextHash(text)).toBe(
    createHash('sha256').update(text, 'utf8').digest('hex'),
  )
})
```

In the panel test file, add:

```ts
test('shows apply action and hash-based review status', () => {
  const text = '第7章正文'
  const html = renderPanel(7, null, {
    ohStoryReviews: [{
      id: 700,
      review_type: 'oh_story_review',
      created_at: '2026-08-14T12:44:33.000Z',
      payload: {
        chapter_id: 7,
        report_text: '=== 故事审查报告（solo）===\n本章冲突成立。',
        chapter_text_hash: ohStoryChapterTextHash(text),
      },
    }],
  })
  expect(html).toContain('按建议改稿')
  expect(html).toContain('已审稿')
  expect(html).not.toContain('正文已改')
  expect(html).not.toContain('一键修订')
})

test('marks a hashless or mismatched review as 正文已改', () => {
  const html = renderPanel(7, null, {
    ohStoryReviews: [ohStoryReview(7)],
  })
  expect(html).toContain('正文已改')
  expect(html).not.toContain('>已审稿<')
})
```

Update `activeChapter()` so `chapter_text` stays `第${id}章正文` (already true). Import `ohStoryChapterTextHash`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```
cd ui/web && bun test src/pages/novel-workspace/oh-story-chapter-text-hash.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
```

Expected: FAIL — missing helper / missing button / status still uses timestamps.

- [ ] **Step 3: Write minimal implementation**

Web hash:

```ts
import { createHash } from 'node:crypto'

export function ohStoryChapterTextHash(text: string): string {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex')
}
```

In the panel:

- Add `onOhStoryApply?: () => void | Promise<void>`
- Replace timestamp stale with:

```ts
const matchesCurrent = Boolean(
  latest
  && ohStoryChapterTextHash(String(activeChapter?.chapter_text || ''))
    === String(parseReviewPayload(latest).chapter_text_hash || ''),
)
const isStale = Boolean(latest && !matchesCurrent)
```

- Summary bits: `latest ? (matchesCurrent ? '已审稿' : '正文已改') : '尚未审稿'`
- Insert button `按建议改稿` between 审稿 and 去AI, same click-stop pattern, calls `onOhStoryApply`

- [ ] **Step 4: Run tests to verify they pass**

Run the same web test command.

Expected: PASS. Existing “no old quality score” tests must still pass.

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

### Task 8: Wire apply through the workspace shell

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-view-bind-core-handlers.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-view-props-area.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`

- [ ] **Step 1: Write the failing handler test if one exists beside the file; otherwise add a focused source assertion**

If there is no handler test file, add this to `workspace-center-quality-revision-panel.test.ts` (source-level, same style as existing WorkspaceCenter guard tests):

```ts
test('workspace apply action posts /novel/oh-story/core/apply', async () => {
  const source = await Bun.file(new URL('./shell/workspace-repair-task-handlers.tsx', import.meta.url)).text()
  expect(source).toContain("runOhStoryCoreAction('apply')")
  expect(source).toContain('/novel/oh-story/core/${action}')
  expect(source).toContain('OH_STORY_APPLY_NO_REVIEW')
  expect(source).toContain('先对本稿重新审稿')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/web && bun test src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`

Expected: FAIL — handler still only types `'review' | 'deslop'`.

- [ ] **Step 3: Write minimal implementation**

In `workspace-repair-task-handlers.tsx`:

```ts
const runOhStoryCoreAction = async (action: 'review' | 'deslop' | 'apply') => {
  // existing chapter/project/model/flush guards
  if (action === 'apply') {
    const latest = latestOhStoryReviewForChapter(
      (reviews || []).filter((item: any) => item.review_type === 'oh_story_review'),
      Number(activeChapter?.id || 0),
    )
    if (!latest || !ohStoryReviewMatchesChapterText(latest, String(activeChapter?.chapter_text || ''))) {
      message.warning('先对本稿重新审稿')
      return
    }
  }
  const label = action === 'review' ? 'oh-story 审稿' : action === 'deslop' ? 'oh-story 去AI' : '按建议改稿'
  // existing post / install / loadProjectModules
  // in catch:
  const code = ohStoryCoreErrorCode(error)
  if (code === 'OH_STORY_APPLY_NO_REVIEW' || code === 'OH_STORY_APPLY_STALE_REVIEW') {
    message.warning('先对本稿重新审稿')
    return
  }
  if (code === 'OH_STORY_CORE_EMPTY_OUTPUT' || code === 'OH_STORY_CORE_NOT_PROSE') {
    message.error('这次没有改出正文')
    return
  }
}
```

Duplicate the tiny match helpers in the web handler file **or** copy `latestOhStoryReviewForChapter` / `ohStoryReviewMatchesChapterText` into `ui/web/src/pages/novel-workspace/oh-story-review-match.ts` using the web hash helper. Prefer a web `oh-story-review-match.ts` that mirrors the server functions; add a bun test with the same cases as Task 2.

Do **not** auto-install when apply returns `OH_STORY_CORE_NOT_INSTALLED`. Apply does not need the suite. Keep auto-install only for review/deslop.

Return `ohStoryApply` from the handler factory.

Thread `ohStoryApply` the same way `ohStoryDeslop` is already threaded:

- `workspace-view-bind-core-handlers.ts` return
- `workspace-view-props-area.ts` destructure + pass
- `workspace-area-view.tsx` type + destructure + `onOhStoryApply={ohStoryApply}`
- `WorkspaceCenter.tsx` prop + pass to the panel

- [ ] **Step 4: Run tests to verify they pass**

Run:

```
cd ui/web && bun test src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts src/pages/novel-workspace/oh-story-chapter-text-hash.test.ts
cd ui/server && bun test src/novel-writing/oh-story-core/runner.test.ts src/routes/novel-oh-story-core-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit** — skip unless the user asked to commit.

---

## Manual check after Task 8

On the worktree Vite (`http://localhost:5173/novel/workspace/3`), chapter 61:

1. Hard refresh. Old review has no hash →「正文已改」, 按建议改稿 toasts「先对本稿重新审稿」, text unchanged.
2. Run oh-story 审稿. Pill becomes「已审稿」. 按建议改稿 writes a new version.
3. Click 按建议改稿 again without a new review → blocked.
4. 去AI still runs without a review.
5. Quality bar still has no 一键修订 / 93分.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| SHA-256 of exact `chapter_text` | 1 |
| Latest chapter review + hash match | 2, 5 |
| Review payload stores hash | 3 |
| Apply prompt has no skill/theory dump | 4 |
| No review / no hash / mismatch refuse | 5, 6, 8 |
| Write `oh_story_apply` + version source | 5, 6 |
| Extract `### 修订后全文` / refuse report | 5 |
| Empty/report output does not overwrite | 5, 6, 8 |
| Route `POST /apply` + 409 copy | 6 |
| Apply does not require suite install | 5, 8 |
| Three buttons, hash pills | 7, 8 |
| 去AI independent | 8 / unchanged deslop |
| No editor revision / director / header 一键修订 | out of scope, do not touch |
