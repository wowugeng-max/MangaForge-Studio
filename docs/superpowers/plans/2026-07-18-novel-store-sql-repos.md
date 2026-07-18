# Novel Store SQL Repos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate full-store rewrite (`mutateNovelStore` / `replaceStoreInOpenDb` on hot paths), move every novel entity to point SQL repositories, and split `ui/server/src/novel.ts` + its monotest into a maintainable `ui/server/src/novel/` module tree.

**Architecture:** Keep public APIs stable via `ui/server/src/novel.ts` re-export. Internally use `withNovelWorkspaceMutation` + `BEGIN IMMEDIATE` + row-scoped SQL. Cross-table atomic writes (chapter acceptance) use multi-statement transactions without loading all reviews/runs. Legacy JSON import may still bulk-write under an isolated name, never from business hot paths.

**Tech Stack:** Bun, TypeScript, `bun:sqlite`, existing novel tests.

**Design spec:** `docs/superpowers/specs/2026-07-18-novel-store-sql-repos-design.md`

---

## File map (target)

| Path | Responsibility |
|---|---|
| `ui/server/src/novel.ts` | Compatibility barrel only |
| `ui/server/src/novel/index.ts` | Public exports |
| `ui/server/src/novel/types.ts` | All record/option types |
| `ui/server/src/novel/db.ts` | openDb, schema, indexes |
| `ui/server/src/novel/lock.ts` | mutation lock |
| `ui/server/src/novel/json.ts` | parse/serialize/compact primitives |
| `ui/server/src/novel/row-mappers.ts` | `*FromRow` |
| `ui/server/src/novel/normalize/*.ts` | per-entity normalize |
| `ui/server/src/novel/repos/*.ts` | per-entity CRUD |
| `ui/server/src/novel/acceptance.ts` | `commitNovelChapterAcceptance` |
| `ui/server/src/novel/legacy-import.ts` | JSON → SQLite one-shot import |
| `ui/server/src/novel/compaction.ts` | historical payload compaction |
| `ui/server/src/novel/pipeline-snapshot.ts` | pipeline snapshot queries |
| `ui/server/src/novel/*.test.ts` / `repos/*.test.ts` | modular tests |

---

### Task 0: Scaffold `novel/` package without behavior change

**Files:**
- Create: `ui/server/src/novel/index.ts`
- Create: `ui/server/src/novel/types.ts`
- Create: `ui/server/src/novel/db.ts`
- Create: `ui/server/src/novel/lock.ts`
- Create: `ui/server/src/novel/json.ts`
- Modify: `ui/server/src/novel.ts` (temporary: keep implementation, re-export types if moved first)
- Test: `ui/server/src/novel.test.ts` (existing suite must stay green)

- [ ] **Step 1: Create package folders**

```bash
mkdir -p ui/server/src/novel/normalize ui/server/src/novel/repos
```

- [ ] **Step 2: Move types first (pure cut)**

Move all `export type ...` blocks from `novel.ts` into `ui/server/src/novel/types.ts` unchanged.  
In `novel.ts` add:

```ts
export type * from './novel/types'
// or explicit re-exports if bun/tsconfig needs values-style export
```

Prefer:

```ts
export type {
  NovelProjectRecord,
  NovelChapterRecord,
  // ...every public type
} from './novel/types'
```

- [ ] **Step 3: Extract `json` helpers with no call-site renames yet**

Move pure helpers used by many functions into `json.ts`:
- `nowIso`
- `parseDbJson` / `parseDbArray`
- `jsonText`
- `textValue`
- compact text helpers currently used by review/run compactors

Re-import them inside `novel.ts` so behavior is identical.

- [ ] **Step 4: Extract `db.ts` and `lock.ts`**

Move:
- `getNovelDbPath` / `getNovelStorePath`
- `openDb` / `ensureSqliteSchema` / table/index DDL
- `withNovelWorkspaceMutation` + lock maps + AsyncLocalStorage

Export only what repos need.

- [ ] **Step 5: Run baseline tests**

```bash
cd ui/server && bun test src/novel.test.ts src/novel-list-query-memory-contract.test.ts src/novel-chapter-empty-prose-guard.test.ts
```

Expected: PASS (no behavior change).

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/novel ui/server/src/novel.ts
git commit -m "refactor(novel): scaffold sql-repo package skeleton"
```

---

### Task 1: Contract tests that define the end state

**Files:**
- Create: `ui/server/src/novel/mutation-contract.test.ts`
- Move/adapt: `ui/server/src/novel-list-query-memory-contract.test.ts` → `ui/server/src/novel/list-memory-contract.test.ts`

- [ ] **Step 1: Write failing/locking contract for production write APIs**

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const novelDir = import.meta.dir

function walkTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkTsFiles(full))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const HOT_FILES = [
  'repos/chapters.ts',
  'repos/reviews.ts',
  'repos/runs.ts',
  'repos/projects.ts',
  'repos/characters.ts',
  'repos/outlines.ts',
  'repos/worldbuilding.ts',
  'repos/setting-entities.ts',
  'repos/chapter-setting-usage.ts',
  'repos/chapter-versions.ts',
  'repos/project-seed-drafts.ts',
  'acceptance.ts',
]

describe('novel sql repo mutation contracts', () => {
  test('hot path modules never full-store rewrite', () => {
    for (const rel of HOT_FILES) {
      const full = join(novelDir, rel)
      // allow missing only before file is created in early tasks; after Task 6 all must exist
      let source = ''
      try { source = readFileSync(full, 'utf8') } catch { continue }
      expect(source).not.toContain('mutateNovelStore(')
      expect(source).not.toContain('replaceStoreInOpenDb(')
      expect(source).not.toContain('loadStoreFromOpenDb(')
      expect(source).not.toContain('structuredClone(store)')
    }
  })

  test('legacy bulk replace is isolated if present', () => {
    const files = walkTsFiles(novelDir)
    for (const file of files) {
      if (file.endsWith('legacy-import.ts')) continue
      if (file.endsWith('.test.ts')) continue
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/\breplaceStoreInOpenDb\s*\(/)
      expect(source).not.toMatch(/\bmutateNovelStore\s*\(/)
    }
  })
})
```

Note: During Tasks 0–5 this test may partially no-op on missing files; by Task 6 it must fully enforce.

- [ ] **Step 2: Port list memory contract to read new package sources**

Update path resolution from `novel.ts` monolith to `novel/repos/*.ts` / package sources. Keep the same assertions:
- list functions use `openDb`
- project-scoped `WHERE project_id = ?`
- do not call `readStore(`

- [ ] **Step 3: Commit**

```bash
git add ui/server/src/novel/mutation-contract.test.ts ui/server/src/novel/list-memory-contract.test.ts
git commit -m "test(novel): add sql-repo mutation and list memory contracts"
```

---

### Task 2: Move reviews + runs into repos (already mostly SQL)

**Files:**
- Create: `ui/server/src/novel/normalize/review.ts`
- Create: `ui/server/src/novel/normalize/run.ts`
- Create: `ui/server/src/novel/repos/reviews.ts`
- Create: `ui/server/src/novel/repos/runs.ts`
- Create: `ui/server/src/novel/repos/reviews.test.ts`
- Create: `ui/server/src/novel/repos/runs.test.ts`
- Modify: package `index.ts` exports
- Modify: `novel.ts` to re-export or delegate

- [ ] **Step 1: Write repo tests first**

```ts
// repos/reviews.test.ts
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelReview, listNovelReviews, listNovelReviewSummaries } from '../index'
// also import a chapter update API once Task 3 lands; for now create project/chapter via existing APIs

describe('reviews repo', () => {
  let workspace = ''
  beforeEach(() => { workspace = mkdtempSync(join(tmpdir(), 'novel-reviews-')) })
  afterEach(() => { rmSync(workspace, { recursive: true, force: true }) })

  test('createNovelReview inserts one row without rewriting other tables', async () => {
    // create project + chapter using current public API
    // create two reviews
    // assert list length 2 and payloads preserved/compacted
  })
})
```

Fill with the same fixtures style used in `novel.test.ts` (copy minimal helpers from `novel-test-support.ts`).

- [ ] **Step 2: Move implementations**

Cut from current `novel.ts`:
- `createNovelReview`
- `listNovelReviews`
- `listNovelReviewSummaries`
- `getNovelReview`
- `appendNovelRun`
- `updateNovelRun` (**must become SQL UPDATE, not mutateNovelStore**)
- `listNovelRuns` / `listNovelRunSummaries`

`updateNovelRun` target shape:

```ts
export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    const db = openDb(activeWorkspace)
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')
      const row = db.query('SELECT * FROM runs WHERE id = ?').get(id) as any
      if (!row) { db.exec('COMMIT'); return null }
      const next = normalizeRunRecord(data, row)
      db.query(`UPDATE runs SET project_id=?, run_type=?, step_name=?, status=?, input_ref=?, output_ref=?, duration_ms=?, error_message=?, pipeline_chapter_failure_count=?, pipeline_open_task_count=?, pipeline_task_count=?, created_at=? WHERE id=?`).run(
        next.project_id, next.run_type, next.step_name, next.status,
        next.input_ref || '', next.output_ref || '', next.duration_ms || 0, next.error_message || '',
        next.pipeline_chapter_failure_count ?? null, next.pipeline_open_task_count ?? null, next.pipeline_task_count ?? null,
        next.created_at, id,
      )
      db.exec('COMMIT')
      return next
    } catch (error) {
      try { db.exec('ROLLBACK') } catch {}
      throw error
    } finally {
      db.close()
    }
  })
}
```

- [ ] **Step 3: Export from `novel/index.ts` and keep `novel.ts` barrel working**

- [ ] **Step 4: Run tests**

```bash
cd ui/server && bun test src/novel/repos/reviews.test.ts src/novel/repos/runs.test.ts src/novel.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/novel ui/server/src/novel.ts
git commit -m "refactor(novel): move reviews and runs to sql repos"
```

---

### Task 3: Chapters + chapter versions full SQL

**Files:**
- Create: `ui/server/src/novel/normalize/chapter.ts`
- Create: `ui/server/src/novel/repos/chapters.ts`
- Create: `ui/server/src/novel/repos/chapter-versions.ts`
- Create: `ui/server/src/novel/repos/chapters.test.ts`
- Modify: remove chapter write paths from mutateNovelStore usage

Functions to migrate:
- `listNovelChapters`
- `listNovelWorkspaceChapters`
- `getNovelChapter`
- `createNovelChapter`
- `upsertNovelChapterByNumber`
- `updateNovelChapter` (keep empty-prose guard + version snapshot)
- `deleteNovelChapter`
- `mergeNovelChapterRawPayload` (already SQL; move file)
- version list/rollback helpers if exported/used

- [ ] **Step 1: Failing tests for isolation + guards**

```ts
test('updateNovelChapter does not rewrite reviews', async () => {
  // seed project, chapter, 50 large reviews
  const before = await listNovelReviews(ws, project.id)
  await updateNovelChapter(ws, chapter.id, { title: '新标题' })
  const after = await listNovelReviews(ws, project.id)
  expect(after).toEqual(before)
})

test('manual_edit empty prose does not wipe existing text', async () => {
  await updateNovelChapter(ws, chapter.id, { chapter_text: '已有正文' }, { versionSource: 'manual_edit' })
  await updateNovelChapter(ws, chapter.id, { chapter_text: '' }, { versionSource: 'manual_edit' })
  const loaded = await getNovelChapter(ws, chapter.id, project.id)
  expect(loaded?.chapter_text).toContain('已有正文')
})

test('prose change creates chapter version', async () => {
  await updateNovelChapter(ws, chapter.id, { chapter_text: 'v1' }, { versionSource: 'agent_execute', createVersion: true })
  await updateNovelChapter(ws, chapter.id, { chapter_text: 'v2' }, { versionSource: 'agent_execute', createVersion: true })
  // assert versions length >= 1 and latest previous text is v1
})
```

- [ ] **Step 2: Implement SQL update with version insert**

Core idea:

```ts
const current = chapterFromRow(db.query('SELECT * FROM chapters WHERE id=?').get(chapterId))
// guard + normalize => next
if (shouldCreateVersion) {
  db.query(`INSERT INTO chapter_versions (...) VALUES (...)`).run(...)
}
db.query(`UPDATE chapters SET ... WHERE id=?`).run(..., chapterId)
```

Do **not** call `loadStoreFromOpenDb`.

- [ ] **Step 3: Implement create/upsert/delete with single-table MAX(id) or lastInsertRowid**

```ts
const id = Number(db.query('SELECT COALESCE(MAX(id),0)+1 AS id FROM chapters').get().id)
// or INSERT then lastInsertRowid
```

- [ ] **Step 4: Run tests**

```bash
cd ui/server && bun test src/novel/repos/chapters.test.ts src/novel-chapter-empty-prose-guard.test.ts src/novel.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(novel): convert chapter writes to point SQL"
```

---

### Task 4: Rewrite `commitNovelChapterAcceptance` without full-store clone

**Files:**
- Create: `ui/server/src/novel/acceptance.ts`
- Create: `ui/server/src/novel/acceptance.test.ts`
- Modify: existing acceptance tests in `novel.test.ts` (migrate assertions)

- [ ] **Step 1: Capture current acceptance behavioral tests**

Migrate/copy from `novel.test.ts` cases around:
- atomic prose + version + reviews
- story state patches
- reject invalid immutable references
- no partial write on failure

Ensure they import public `commitNovelChapterAcceptance`.

- [ ] **Step 2: Implement targeted transaction**

Pseudo-structure:

```ts
export async function commitNovelChapterAcceptance(activeWorkspace: string, input: NovelChapterAcceptanceInput) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    await importLegacyNovelStoreIfNeeded(activeWorkspace)
    const db = openDb(activeWorkspace)
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')

      const chapter = selectChapter(db, input.chapter_id)
      const project = selectProject(db, chapter.project_id)
      // validate immutable refs on patches

      const nextChapter = normalizeChapterRecord(input.chapter_patch || {}, chapter)
      maybeInsertVersion(db, chapter, nextChapter, input)
      updateChapterRow(db, nextChapter)

      if (input.project_patch) updateProjectRow(db, normalizeProjectRecord(input.project_patch, project))

      for (const review of input.reviews || []) insertReviewRow(db, normalizeReviewRecord(review))
      for (const entity of input.setting_entity_upserts || []) upsertSettingEntityRow(db, entity)
      // worldbuilding/character creates, usage replace — same as current semantics, row-scoped

      db.exec('COMMIT')
      return { chapter: nextChapter, /* same return shape */ }
    } catch (error) {
      try { db.exec('ROLLBACK') } catch {}
      throw error
    } finally {
      db.close()
    }
  })
}
```

Critical: **no** `loadStoreFromOpenDb`, **no** `structuredClone(store)`.

- [ ] **Step 3: Keep return type and error messages stable** where callers depend on them (`chapter reference not found`, immutable ref errors).

- [ ] **Step 4: Run tests**

```bash
cd ui/server && bun test src/novel/acceptance.test.ts src/novel.test.ts src/routes/novel-writing-service.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(novel): point-SQL chapter acceptance transaction"
```

---

### Task 5: Projects, characters, outlines, worldbuilding SQL repos

**Files:**
- Create: `repos/projects.ts`, `characters.ts`, `outlines.ts`, `worldbuilding.ts`
- Create: matching `normalize/*` and `*.test.ts`

Functions:
- projects: list/get/create/update/delete
- characters: list/create/update
- outlines: list/create/update/delete
- worldbuilding: list/create/update

- [ ] **Step 1: Tests for create/update/delete isolation**

```ts
test('updateNovelProject does not touch chapters/reviews rows', async () => {
  // seed chapter + reviews
  await updateNovelProject(ws, project.id, { synopsis: 'x' })
  // chapter text unchanged; review count unchanged
})

test('deleteNovelProject removes only that project subtree via SQL', async () => {
  // two projects; delete one; other remains intact
})
```

- [ ] **Step 2: Implement point SQL**

`deleteNovelProject` target:

```sql
DELETE FROM chapter_setting_usage WHERE project_id=?
DELETE FROM setting_entities WHERE project_id=?
DELETE FROM reviews WHERE project_id=?
DELETE FROM runs WHERE project_id=?
DELETE FROM chapter_versions WHERE project_id=?
DELETE FROM chapters WHERE project_id=?
DELETE FROM outlines WHERE project_id=?
DELETE FROM characters WHERE project_id=?
DELETE FROM worldbuilding WHERE project_id=?
DELETE FROM projects WHERE id=?
```

Still under one transaction + mutation lock. Not full-store rewrite of unrelated projects.

- [ ] **Step 3: Run tests + commit**

```bash
cd ui/server && bun test src/novel/repos/projects.test.ts src/novel/repos/characters.test.ts src/novel/repos/outlines.test.ts src/novel/repos/worldbuilding.test.ts src/novel.test.ts
git commit -m "refactor(novel): sql repos for projects characters outlines worldbuilding"
```

---

### Task 6: Settings, usage, seed drafts, remaining deletes

**Files:**
- `repos/setting-entities.ts`
- `repos/chapter-setting-usage.ts`
- `repos/project-seed-drafts.ts`
- tests for each

Functions:
- setting entity create/update/delete/list
- chapter setting usage list/replace/update
- seed draft list/create/delete
- any remaining mutate-based helpers discovered by:

```bash
rg -n "mutateNovelStore\(" ui/server/src/novel ui/server/src/novel.ts
```

Expected after this task: **no matches** outside deleted code / legacy-import (and legacy must not use the old name if avoidable).

- [ ] **Step 1: Implement replace usage as scoped delete+insert**

```sql
DELETE FROM chapter_setting_usage WHERE project_id=? AND chapter_id=?;
INSERT INTO chapter_setting_usage ...;
```

- [ ] **Step 2: Run full novel package tests**

```bash
cd ui/server && bun test src/novel src/novel.test.ts src/novel-list-query-memory-contract.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(novel): finish remaining entity sql repos"
```

---

### Task 7: Delete full-store machinery + split monotest + final contracts

**Files:**
- Modify/delete internals in package:
  - remove `mutateNovelStore`
  - remove hot-path `replaceStoreInOpenDb` (keep only inside `legacy-import.ts` under name `importLegacyStoreBulkReplace` if still required)
  - remove production `loadStoreFromOpenDb` except legacy import
- Split `ui/server/src/novel.test.ts` into package tests
- Ensure `ui/server/src/novel.ts` is barrel-only

- [ ] **Step 1: Make mutation contract strict and failing if leftovers exist**

```bash
rg -n "mutateNovelStore|replaceStoreInOpenDb|loadStoreFromOpenDb|structuredClone\(store\)" ui/server/src/novel ui/server/src/novel.ts
```

Allowed:
- `legacy-import.ts` bulk import symbols only
- comments/docs in tests describing forbidden APIs

- [ ] **Step 2: Shrink `novel.ts` to**

```ts
export * from './novel'
```

If circular/export issues, explicit export list mirroring previous public surface.

- [ ] **Step 3: Split remaining monotest by domain**

Move leftover cases from `novel.test.ts` into:
- `repos/*.test.ts`
- `acceptance.test.ts`
- `legacy-import.test.ts`
- `compaction.test.ts`

Then delete empty monotest or leave a one-line pointer comment file if tooling expects path (prefer delete + update scripts).

- [ ] **Step 4: Run broad regression**

```bash
cd ui/server && bun test src/novel src/novel-chapter-empty-prose-guard.test.ts src/routes/novel-writing-service.test.ts src/routes/novel-core-routes.test.ts src/routes/novel-generation-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Optional build**

```bash
cd /Users/ruiyaosong/MangaForge-Studio && bun run build:server
```

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(novel): remove full-store rewrite and modularize tests"
```

---

### Task 8: Manual verification checklist

- [ ] Restart server, open project 3, open a written chapter (正文 loads)
- [ ] Edit chapter metadata / rewrite one chapter path once
- [ ] Observe server memory: idle stays modest; write spikes should not require full reviews rewrite
- [ ] Confirm DB file still coherent (`sqlite3 workspace/novel.sqlite 'SELECT COUNT(*) FROM reviews; SELECT COUNT(*) FROM chapters;'`)
- [ ] Confirm no accidental wipe: chapter texts and review counts stable after unrelated project update

---

## Implementation notes for agents

1. **Do not change business semantics** while moving code. First move, then delete dead full-store helpers.
2. Prefer copying existing SQL strings from `replaceStoreInOpenDb` / acceptance diff writers; they already encode column lists.
3. Keep `withNovelWorkspaceMutation` around every write.
4. When a function currently does `store.*.reduce(max id)`, replace with SQL `COALESCE(MAX(id),0)+1` on that table inside the transaction.
5. After each task, `rg mutateNovelStore` should show a strictly smaller call set.
6. Do **not** expand scope into `novel-writing-service.ts` splitting in this plan.

---

## Self-review against design

| Design requirement | Task coverage |
|---|---|
| All entities leave mutateNovelStore | Tasks 2–6 |
| Acceptance without full clone | Task 4 |
| Module split under `novel/` | Tasks 0, 7 |
| Tests modularized + contracts | Tasks 1, 3, 7 |
| API compatibility barrel | Tasks 0, 7 |
| Legacy import isolated | Tasks 7 |
| Memory regression prevention | Tasks 1, 3, 8 |

Placeholder scan: none intentional.  
No open TBDs for core path; column lists should be copied from current `novel.ts` at implementation time to avoid drift.
