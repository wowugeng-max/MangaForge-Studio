# Novel SQLite Storage Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce MangaForge novel workspace memory pressure by making SQLite the only regular store and preventing full generation context packages from being persisted in run/review logs.

**Architecture:** Keep the existing `NovelStore` API surface stable, but change persistence behavior behind it. SQLite remains the source of truth; the old `novel-store.json` is read only for one-time import when SQLite is empty, and new operational logs are compacted before storage.

**Tech Stack:** Bun, TypeScript, `bun:sqlite`, existing server route tests.

---

### Task 1: SQLite-only regular persistence

**Files:**
- Modify: `ui/server/src/novel.ts`
- Test: `ui/server/src/novel.test.ts`

- [x] Add a failing test proving a normal store write does not create or update `novel-store.json`.
- [x] Add a failing test proving `novel-store.json` can still import into an empty SQLite database once.
- [x] Change `readStore()` to skip JSON reads when SQLite already has data.
- [x] Change `writeStore()` to stop calling `writeJsonStore()`.
- [x] Run `bun test ui/server/src/novel.test.ts`.

### Task 2: Compact new generation diagnostics

**Files:**
- Modify: `ui/server/src/novel.ts`
- Test: `ui/server/src/novel.test.ts`
- Test: `ui/server/src/routes/novel-generation-routes.test.ts`
- Test: `ui/server/src/routes/novel-writing-service.test.ts`

- [x] Add a failing test proving `appendNovelRun()` caps oversized `input_ref` and `output_ref`.
- [x] Add a failing test proving `createNovelReview()` caps oversized `payload`.
- [x] Store structured truncation metadata instead of full over-limit JSON strings.
- [x] Compact persisted run/review payloads that include `context_package` through the shared storage normalizers.
- [x] Run targeted tests.

### Task 3: Historical data cleanup

**Files:**
- Modify: `ui/server/src/novel.ts`
- Test: `ui/server/src/novel.test.ts`

- [x] Add a failing test for a cleanup helper that compacts existing over-limit run/review/chapter payload columns.
- [x] Implement the cleanup helper using SQLite updates so it does not load the whole store.
- [x] Run cleanup once against the current workspace after tests pass.
- [x] Confirm SQLite size and top oversized records shrink.

### Task 4: Verification

**Files:**
- Verify all touched tests.

- [x] Run `bun test ui/server/src/novel.test.ts`.
- [x] Run `bun test ui/server/src/routes/novel-generation-routes.test.ts`.
- [x] Run `bun test ui/server/src/routes/novel-writing-service.test.ts`.
- [x] Run `bun run build:server`.
- [x] Run `git diff --check`.
