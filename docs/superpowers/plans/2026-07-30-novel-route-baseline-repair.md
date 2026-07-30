# Novel Route Baseline Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the novel server suite to 188/188 while preserving split route packages and allowing residual prose only for terminal `blocked_invalid` recovery.

**Architecture:** Keep production route registration unchanged. Make source-contract tests inspect an explicit, registration-ordered bundle of each split route package, then gate residual prose in `buildStandaloneProseServiceErrorPayload` by the terminal admission state.

**Tech Stack:** TypeScript, Bun test runner, Express route packages, Vite/React production build

---

## File Map

- Modify `ui/server/src/routes/novel-generation-routes.test.ts`: define and reuse an ordered source bundle for all generation route source contracts; characterize blocked-invalid residual recovery.
- Modify `ui/server/src/routes/novel-planning-routes.test.ts`: define and reuse an ordered source bundle for planning route source contracts.
- Modify `ui/server/src/routes/novel-generation/builders.ts`: restrict residual prose fields to `blocked_invalid` errors.

### Task 1: Repair split-route source contract coverage

**Files:**
- Modify: `ui/server/src/routes/novel-generation-routes.test.ts:1-850`
- Modify: `ui/server/src/routes/novel-planning-routes.test.ts:1-73`
- Test: `ui/server/src/routes/novel-generation-routes.test.ts`
- Test: `ui/server/src/routes/novel-planning-routes.test.ts`

- [ ] **Step 1: Re-run the existing RED source-contract evidence**

Run:

```bash
cd ui/server
bun test src/routes/novel-planning-routes.test.ts
bun test src/routes/novel-generation-routes.test.ts
```

Expected: planning reports four source-contract failures; generation reports ten source-contract failures plus the independent prose-privacy failure.

- [ ] **Step 2: Add an ordered generation route source bundle**

Immediately after the imports in `novel-generation-routes.test.ts`, add:

```ts
const generationRouteSource = [
  'novel-generation/builders.ts',
  'novel-generation/register.ts',
  'novel-generation/register-chapter-groups.ts',
  'novel-generation/register-chapter-groups-start.ts',
  'novel-generation/register-chapter-groups-unattended.ts',
  'novel-generation/register-chapter-groups-run.ts',
  'novel-generation/register-chapter-pipeline.ts',
].map(file => readFileSync(join(import.meta.dir, file), 'utf8')).join('\n')
```

Replace every repeated two-file declaration:

```ts
const source = [readFileSync(join(import.meta.dir, 'novel-generation/builders.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'novel-generation/register.ts'), 'utf8')].join('\n')
```

with:

```ts
const source = generationRouteSource
```

Do not include test files or discover files recursively; source slicing depends on the explicit registration order.

- [ ] **Step 3: Add an ordered planning route source bundle**

Immediately after the imports in `novel-planning-routes.test.ts`, add:

```ts
const planningRouteSource = [
  'novel-planning/builders.ts',
  'novel-planning/register.ts',
  'novel-planning/register-reviews.ts',
  'novel-planning/register-ab.ts',
  'novel-planning/register-planning-ops.ts',
].map(file => readFileSync(join(import.meta.dir, file), 'utf8')).join('\n')
```

Replace each repeated two-file `source` declaration in the first four tests with:

```ts
const source = planningRouteSource
```

- [ ] **Step 4: Verify the source-contract repair**

Run:

```bash
cd ui/server
bun test src/routes/novel-planning-routes.test.ts
bun test src/routes/novel-generation-routes.test.ts
```

Expected: planning reports 5 pass and 0 fail. Generation reports only the existing `retains safe prose failure diagnostics without exposing candidate text or request internals` failure; every source-contract assertion passes.

### Task 2: Enforce the residual-prose privacy boundary

**Files:**
- Modify: `ui/server/src/routes/novel-generation-routes.test.ts:266-285`
- Modify: `ui/server/src/routes/novel-generation/builders.ts:297-329`
- Test: `ui/server/src/routes/novel-generation-routes.test.ts`

- [ ] **Step 1: Strengthen the blocked-invalid characterization test**

In `persists standalone blocked invalid admission identity for workspace recovery`, define a recoverable draft and attach it to the terminal error:

```ts
const residualText = '无效正文仍需供显式恢复。'.repeat(30)
const serviceError = Object.assign(new Error('正文为空或结构无效'), {
  admission_status: 'blocked_invalid',
  admission_failure: { source: 'structural', code: 'invalid_prose' },
  chapter_text: residualText,
})
```

Extend the existing payload assertion with:

```ts
chapter_text: residualText,
finalText: residualText,
details: { chapter_text: residualText },
```

- [ ] **Step 2: Run both privacy cases before the implementation change**

Run:

```bash
cd ui/server
bun test src/routes/novel-generation-routes.test.ts -t "retains safe prose failure diagnostics|persists standalone blocked invalid admission identity"
```

Expected: the blocked-invalid characterization passes; the ordinary quality-gate case fails because its serialized payload still contains candidate text.

- [ ] **Step 3: Gate residual prose by terminal admission state**

In `buildStandaloneProseServiceErrorPayload`, retain the current candidate precedence but calculate a residual only for `blockedInvalid`:

```ts
// Keep residual prose for explicit recovery only when invalid admission blocks storage.
// All ordinary generation and quality errors must remain bounded and text-free.
const residualCandidates = [
  serviceError?.chapter_text,
  serviceError?.chapterText,
  serviceError?.finalText,
  serviceError?.final_text,
  serviceError?.text,
  serviceError?.details?.chapter_text,
  serviceError?.details?.chapterText,
  serviceError?.admission_failure?.details?.chapter_text,
  serviceError?.admission_failure?.details?.chapterText,
]
const residualText = blockedInvalid
  ? residualCandidates.find((item: any) => typeof item === 'string' && item.trim().length > 200)
  : undefined
```

Keep the existing residual payload fields unchanged so Zhuque/export recovery still receives `chapter_text`, `finalText`, and `details.chapter_text` in the terminal case.

- [ ] **Step 4: Verify RED becomes GREEN**

Run:

```bash
cd ui/server
bun test src/routes/novel-generation-routes.test.ts
bun test src/routes/novel-planning-routes.test.ts
```

Expected: both files report zero failures; generation reports 33 passing tests and planning reports 5 passing tests.

- [ ] **Step 5: Commit the baseline repair**

```bash
git add ui/server/src/routes/novel-generation-routes.test.ts \
  ui/server/src/routes/novel-planning-routes.test.ts \
  ui/server/src/routes/novel-generation/builders.ts
git diff --cached --check
git commit -m "fix(server): repair split route test baseline"
```

Expected: one commit containing only the two test files and the bounded payload change.

### Task 3: Verify the repaired branch without MCP regressions

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run the full novel server suite**

Run:

```bash
bun run test:novel-server
```

Expected: 188 pass, 0 fail.

- [ ] **Step 2: Run the MCP backend suite**

Run:

```bash
cd ui/server
bun test \
  src/mcp \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel-writing-service/generation-source \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts
```

Expected: 43 pass, 0 fail.

- [ ] **Step 3: Build the server entry**

Run:

```bash
cd ui/server
bun build src/novel-writing-service/service/create-novel-writing-service.ts \
  --target=bun \
  --outfile=/private/tmp/mangaforge-mcp-final-server-check.js
```

Expected: build exits 0 and writes the temporary bundle.

- [ ] **Step 4: Run the MCP frontend suite and production build**

Run:

```bash
cd ui/web
bun test \
  src/pages/McpServices \
  src/pages/novel-workspace/mcpGenerationSourceModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
bun run build
```

Expected: 16 pass, 0 fail, followed by a successful Vite build. Existing dynamic-import and chunk-size warnings are allowed.

- [ ] **Step 5: Run final diff, user-data, and credential checks**

Run from the worktree root:

```bash
git diff --check main...HEAD
if git diff --name-only main...HEAD | rg -q '^workspace/(assets\.json|zhuque-inputs/|zhuque-reports/)'; then
  echo 'unexpected workspace user-data change'
  exit 1
fi
if git diff main...HEAD --unified=0 | rg -q '^\+.*sk_[A-Za-z0-9_-]{20,}'; then
  echo 'possible raw API key found in branch additions'
  exit 1
fi
git status --short
```

Expected: checks exit 0, no protected workspace path is listed, no possible raw API key is detected, and the worktree is clean.
