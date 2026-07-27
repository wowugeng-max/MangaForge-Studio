# Single-Chapter Quality and Revision Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blocking editor-revision request with a durable, cancellable single-chapter job that rejects incomplete prose before storage and never calls or writes later chapters.

**Architecture:** The existing route becomes a short command endpoint that snapshots one chapter and appends an `editor_revision` run. A leased worker advances an explicit persisted checkpoint through candidate generation, deterministic admission, atomic chapter commit, current-chapter quality review, current-chapter Story State sync, and a deterministic continuity warning; every public read goes through a redacted run view. The UI discovers and polls these jobs independently of the Task Center drawer, while current-chapter controls and Task Center actions consume the same public task model.

**Tech Stack:** Bun, TypeScript, Express 4, SQLite (`bun:sqlite`), React 18, Ant Design 5, Axios, Bun test, Vite

---

## Source Of Truth And Scope

Implement against `docs/superpowers/specs/2026-07-27-single-chapter-revision-repair-design.md`. Preserve these invariants in every task:

- Revision generation, post-revision quality, and Story State each receive exactly one explicit `chapter_id`.
- Reading earlier/later chapters for context is allowed; calling a model for them or writing their rows, versions, reviews, plans, raw payloads, or tasks is forbidden.
- Once `editor_revision_commit.run_id` is stored with the candidate hash, that run never calls the revision model again.
- Candidate rejection, cancellation before commit, and source-version conflict produce zero chapter/version/Story State writes.
- `auto_quality_check: false` and `auto_story_state: false` persist `skipped` checkpoints rather than silently omitting phases.
- Post-quality `needs_revision` is a warning, not a second rewrite and not a rollback.
- Ordinary run/task APIs never expose source prose or candidate prose. Candidate evidence is available only from the dedicated diagnostics endpoint.
- Historical damage detection is read-only. Restoring a historical version remains a separate explicit user-confirmed action.
- Do not modify or stage `workspace/assets.json`, `workspace/zhuque-inputs/`, or `workspace/zhuque-reports/`.

## File Map

### Server: contracts, persistence, and admission

- Create `ui/server/src/routes/novel-editor/editor-revision-contract.ts`: canonical statuses, phases, immutable run input, checkpoint, errors, parsing, and public-safe phase labels.
- Create `ui/server/src/routes/novel-editor/revision-candidate-admission.ts`: pure candidate assembly and transport/length/wrapper/ending/patch admission.
- Create `ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts`: deterministic admission boundary coverage, including the real 5910-to-243 failure shape.
- Create `ui/server/src/novel/repos/editor-revision-runs.ts`: active uniqueness, create/claim/renew/cancel/retry/checkpoint/recovery operations.
- Create `ui/server/src/novel/repos/editor-revision-runs.test.ts`: schema migration, concurrency, leases, retry, and legacy-run coverage.
- Create `ui/server/src/novel/repos/editor-revision-commit.ts`: source-hash compare-and-set plus atomic version/chapter/marker/revision-review commit.
- Create `ui/server/src/novel/repos/editor-revision-commit.test.ts`: zero-write conflicts and crash-window idempotency.
- Modify `ui/server/src/novel/db.ts`: new run columns, backfill, lookup index, and partial active-run unique index.
- Modify `ui/server/src/novel/types.ts`: persisted run fields and revision commit input/result types.
- Modify `ui/server/src/novel/normalize.ts`: normalize nullable lease/cancel fields and `updated_at`.
- Modify `ui/server/src/novel/sql-rows.ts`: write the new run fields.
- Modify `ui/server/src/novel/row-mappers.ts`: map new run fields in summary rows.
- Modify `ui/server/src/novel/repos/runs.ts`: select new fields in full/summary reads.
- Modify `ui/server/src/novel/store.ts`: export the two new repositories.
- Modify `ui/server/src/novel/repos/projects.ts`: atomically rebase exact-chapter Story State deltas and receipts onto the latest project row.
- Modify `ui/server/src/novel-writing/chapter-plan-from-prose-patches.ts`: expose a current-chapter-only alignment builder before follower propagation.
- Modify `ui/server/src/novel-writing/chapter-plan-from-prose.test.ts`: prove the single-chapter builder returns no follower patch.

### Server: LLM stages, worker, and APIs

- Modify `ui/server/src/llm/executor.ts`: forward `maxRetries` to provider runtime.
- Modify `ui/server/src/llm/executor.test.ts`: lock signal, 180-second timeout, and one-retry forwarding.
- Create `ui/server/src/routes/novel-editor/single-chapter-story-state.ts`: exact-chapter Story State preparation/application and receipt lookup.
- Create `ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts`: current-chapter scope and receipt reuse.
- Create `ui/server/src/routes/novel-editor/revision-worker.ts`: leased phase orchestration, heartbeat, cancellation, restart recovery, and no-regeneration guarantee.
- Create `ui/server/src/routes/novel-editor/revision-worker.test.ts`: phase, crash-window, cancellation, retry, and 30-chapter scope tests.
- Create `ui/server/src/routes/novel-editor/revision-run-view.ts`: redacted public status/task/diagnostics views and action flags.
- Create `ui/server/src/routes/novel-editor/revision-run-view.test.ts`: candidate redaction and state-dependent actions.
- Modify `ui/server/src/routes/novel-editor/builders.ts`: remove cross-chapter Story State helper; make quality alignment current-only and receipt-aware.
- Modify `ui/server/src/routes/novel-editor/register-quality.ts`: route manual Story State through the exact-chapter helper.
- Modify `ui/server/src/routes/novel-editor/register-revision.ts`: replace synchronous revision chain with create/status/cancel/retry/diagnostics endpoints.
- Modify `ui/server/src/routes/novel-editor/register.ts`: construct the worker once and return its lifecycle.
- Modify `ui/server/src/routes/novel.ts`: expose editor-worker start/stop from the novel route package.
- Modify `ui/server/src/routes/novel-run-routes.ts`: include `editor_revision` in project tasks and redact generic run responses.
- Modify `ui/server/src/index.ts`: start recovery after the active workspace loads and abort workers on server close.
- Modify `ui/server/src/novel-writing-service/service/story-state-machine.ts`: expose prepared Story State calls and typed options.
- Modify `ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts`: forward one-retry LLM control.
- Modify `ui/server/src/novel-writing-service/service/story-state-machine-update.ts`: add idempotency receipt mode and skip follower readiness writes for exact-chapter calls.
- Modify `ui/server/src/novel-writing-service/service/story-state-machine-update-phase-a.ts`: save derived reviews through an idempotent callback.
- Modify `ui/server/src/novel-writing-service/service/story-state-machine-update-phase-b.ts`: save derived reviews through the same callback.
- Modify `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`: replace stale synchronous-source assertions with public route/worker contracts.
- Modify `ui/server/src/routes/novel-editor-routes.story-state-guards.test.ts`: assert the old range helper and follower writes are absent from editor routes.
- Modify `ui/server/src/routes/novel-run-routes.test.ts`: cover redacted revision runs and project task projection.

### Web: task state and UI

- Create `ui/web/src/pages/novel-workspace/editorRevisionTasks.ts`: typed phase/status selectors, terminal messages, and action predicates.
- Create `ui/web/src/pages/novel-workspace/editorRevisionTasks.test.ts`: phase labels, chapter matching, active status, and result messages.
- Modify `ui/web/src/pages/novel-workspace/useWorkspaceTasks.ts`: discover/poll active revisions while the drawer is closed and expose cancel/retry actions.
- Modify `ui/web/src/pages/novel-workspace/useWorkspaceTasks.test.ts`: drawer-independent polling, refresh recovery, chapter switching, and `cancel_requested` coverage.
- Modify `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`: treat POST as a `202` start command and defer linked repair-task closure until terminal status.
- Modify `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`: reconcile completed runs, refresh current data, and pass active revision state downstream.
- Modify `ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx`: propagate editor revision task data/actions.
- Modify `ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx`: wire task state into `WorkspaceCenter`.
- Modify `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`: pass the current chapter's revision job to the quality panel.
- Modify `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`: render phase status, disable same-chapter revision, and expose cancel/retry/continue.
- Modify `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`: cover same-chapter disablement and state-valid actions.
- Modify `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`: compact non-overlapping status strip styles.
- Create `ui/web/src/pages/novel-workspace/task-center/drawer-run-summary-editor-revision.tsx`: task detail, actions, chapter navigation, and on-demand diagnostics.
- Modify `ui/web/src/pages/novel-workspace/task-center/drawer-model-helpers-basics.ts`: label the job “单章修订”.
- Modify `ui/web/src/pages/novel-workspace/task-center/drawer-task-run-card.tsx`: allow an indeterminate phase display without fake percentage.
- Modify `ui/web/src/pages/novel-workspace/task-center/TaskCenterDrawerPanel.tsx`: render revision actions and dedicated details.
- Modify `ui/web/src/pages/novel-workspace/TaskCenterDrawer.core.test.ts`: task-card action and diagnostics contracts.
- Modify `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`: cover `202` creation and terminal repair-task reconciliation.

### Audit and final verification

- Create `ui/server/src/novel/editor-revision-damage-audit.ts`: pure read-only damaged-version detector.
- Create `ui/server/src/novel/editor-revision-damage-audit.test.ts`: 70% threshold and evidence tests.
- Create `scripts/audit-editor-revision-damage.ts`: read-only CLI report; no restore flag.
- Modify `package.json`: add `audit:editor-revision-damage` command.

## Canonical Data Contract

Task 1 must establish these names once; later tasks use them unchanged:

```ts
export const EDITOR_REVISION_PHASES = [
  'generate_candidate',
  'admit_candidate',
  'persist_chapter',
  'post_quality',
  'sync_current_story_state',
  'record_continuity_warning',
  'completed',
] as const

export type EditorRevisionPhase = typeof EDITOR_REVISION_PHASES[number]
export type EditorRevisionRunStatus =
  | 'queued'
  | 'running'
  | 'cancel_requested'
  | 'completed'
  | 'failed'
  | 'canceled'

export type EditorRevisionPhaseState = {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'canceled'
  attempt: number
  started_at?: string
  completed_at?: string
  error_code?: string
  error?: string
  summary?: Record<string, unknown>
}

export type EditorRevisionRunInput = {
  schema_version: 1
  project_id: number
  chapter_id: number
  chapter_no: number
  chapter_title: string
  review_id: number
  source_chapter_updated_at: string
  source_text: string
  source_text_hash: string
  source_char_count: number
  source_review: Record<string, unknown>
  report: Record<string, unknown>
  context_package: Record<string, unknown>
  revision_mode: string
  revision_strategy: string
  user_prompt: string
  model_id?: number
  auto_quality_check: boolean
  auto_story_state: boolean
  repair_task_link?: {
    run_id: number
    task_index: number
    task: Record<string, unknown>
  }
  created_at: string
}

export type EditorRevisionCheckpoint = {
  schema_version: 1
  phase: EditorRevisionPhase
  phases: Record<EditorRevisionPhase, EditorRevisionPhaseState>
  candidate?: {
    text: string
    hash: string
    char_count: number
    applied_patches: unknown[]
    diagnostics: Record<string, unknown>
  }
  prose_persisted: boolean
  committed_chapter_updated_at?: string
  editor_revision_review_id?: number
  post_quality?: Record<string, unknown>
  story_state?: Record<string, unknown>
  continuity_warning_review_id?: number
  delivery_risk_convergence?: Record<string, unknown>
  linked_task_closure?: { status: 'pending' | 'completed'; completed_at?: string }
  warnings: Array<{ code: string; message: string }>
  error?: { code: string; message: string; diagnostics?: Record<string, unknown> }
  completed_at?: string
}
```

`context_package` in this run input is the bounded result of `buildWorkflowRevisionContextBrief`, not the complete workspace context package. It may contain structured revision constraints and receipts, but never the full prompt, provider messages, or unrelated chapter prose. Do not add percentage fields to this contract. The phase is the progress source.

### Task 1: Deterministic revision candidate admission

**Files:**
- Create: `ui/server/src/routes/novel-editor/editor-revision-contract.ts`
- Create: `ui/server/src/routes/novel-editor/revision-candidate-admission.ts`
- Create: `ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts`
- Modify: `ui/server/src/routes/novel-editor/index.ts`
- Modify: `ui/server/src/routes/novel-editor/builders.ts` only to re-export/move patch helpers without behavior change
- Modify: `ui/server/src/routes/novel-editor-routes.surgical-revision.test.ts`

- [ ] **Step 1: Write the failing candidate-admission tests**

Create table-driven tests around this public surface:

```ts
import { describe, expect, test } from 'bun:test'
import { admitRevisionCandidate, RevisionCandidateAdmissionError } from './revision-candidate-admission'

const source = '旧正文推进。'.repeat(985) // countProseChars === 5910

function completeResult(chapterText: string, extra: Record<string, unknown> = {}) {
  return {
    finish_reason: 'stop',
    content: JSON.stringify({ chapter_text: chapterText, ...extra }),
    output: { chapter_text: chapterText, ...extra },
  }
}

test('rejects the observed 5910-to-243 incomplete replacement', () => {
  const candidate = `${'残缺内容。'.repeat(48)}仍停在`
  expect(() => admitRevisionCandidate({ sourceText: source, result: completeResult(candidate) }))
    .toThrow(RevisionCandidateAdmissionError)
  try {
    admitRevisionCandidate({ sourceText: source, result: completeResult(candidate) })
  } catch (error: any) {
    expect(error.code).toBe('REVISION_CANDIDATE_TOO_SHORT')
    expect(error.diagnostics).toMatchObject({ source_char_count: 5910, candidate_char_count: 243 })
  }
})

test.each(['max_tokens', 'length', 'tool_calls'])('rejects %s transport completion', finishReason => {
  expect(() => admitRevisionCandidate({
    sourceText: '原文。'.repeat(400),
    result: { ...completeResult('新文。'.repeat(400)), finish_reason: finishReason },
  })).toThrow(/不能作为完整章节正文入库|输出被截断|没有正文/)
})

test('rejects partial JSON recovery, incomplete details, wrappers, and incomplete endings', () => {
  const validLength = '修订正文。'.repeat(320)
  const cases = [
    completeResult(validLength, { recovered_from_partial_json: true }),
    { ...completeResult(validLength), incomplete_details: { reason: 'max_output_tokens' } },
    completeResult(`\`\`\`json\n${validLength}\n\`\`\``),
    completeResult(`以下是修订稿：\n${validLength}`),
    completeResult(`${validLength.slice(0, -1)}在`),
  ]
  for (const result of cases) {
    expect(() => admitRevisionCandidate({ sourceText: '原正文。'.repeat(320), result })).toThrow()
  }
})

test('accepts exact 70 and 130 percent boundaries and rejects one character outside', () => {
  const fixedSource = `${'甲'.repeat(999)}。`
  for (const count of [700, 1300]) {
    const text = `${'乙'.repeat(count - 1)}。`
    expect(admitRevisionCandidate({ sourceText: fixedSource, result: completeResult(text) }).candidateCharCount).toBe(count)
  }
  for (const count of [699, 1301]) {
    const text = `${'乙'.repeat(count - 1)}。`
    expect(() => admitRevisionCandidate({ sourceText: fixedSource, result: completeResult(text) })).toThrow()
  }
})

test('requires every patch anchor to apply uniquely before admitting the assembled full chapter', () => {
  const sourceText = `${'第一段推进。'.repeat(100)}\n\n唯一锚点。\n\n${'结尾推进。'.repeat(100)}`
  const result = {
    finish_reason: 'stop',
    content: JSON.stringify({ replacements: [
      { find: '唯一锚点。', replace: '唯一锚点已修订。' },
      { find: '不存在锚点。', replace: '不得部分写入。' },
    ] }),
    output: { replacements: [
      { find: '唯一锚点。', replace: '唯一锚点已修订。' },
      { find: '不存在锚点。', replace: '不得部分写入。' },
    ] },
  }
  expect(() => admitRevisionCandidate({ sourceText, result })).toThrow(/REVISION_PATCH_INCOMPLETE/)
})
```

Also cover empty output, reasoning-only output, duplicate anchors, opening-rewrite anchor failure, `partial_json_open_string_recovered`, code fences, JSON-shaped prose, and accepted Chinese/ASCII ending punctuation plus closing quotes.

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
cd ui/server && bun test src/routes/novel-editor/revision-candidate-admission.test.ts
```

Expected: FAIL because `revision-candidate-admission.ts` and its exported functions do not exist.

- [ ] **Step 3: Implement the contract and admission functions**

Implement the canonical types above plus this exact API:

```ts
export type RevisionCandidateAdmission = {
  chapterText: string
  candidateHash: string
  sourceCharCount: number
  candidateCharCount: number
  minimumCharCount: number
  maximumCharCount: number
  appliedPatches: unknown[]
  diagnostics: Record<string, unknown>
}

export class RevisionCandidateAdmissionError extends Error {
  constructor(
    public code: string,
    message: string,
    public diagnostics: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'RevisionCandidateAdmissionError'
  }
}

export function revisionTextHash(text: string) {
  return createHash('sha256').update(String(text || '')).digest('hex')
}

export function admitRevisionCandidate(input: {
  sourceText: string
  result: any
}): RevisionCandidateAdmission
```

The function must execute checks in this order:

```ts
assertCompleteProseTransportResult(input.result, 'PROSE_REVISION_TRUNCATED')
const payload = getNovelPayload(input.result)
if (payload.recovered_from_partial_json || payload.partial_json_open_string_recovered) {
  throw admissionError('REVISION_PARTIAL_JSON_RECOVERY', '修订结果来自不完整 JSON 恢复')
}
const patch = applySurgicalRevisionPatch(input.sourceText, payload)
if (!patch.applied.length) throw admissionError('REVISION_NO_APPLICABLE_PATCH', '修订未返回可应用正文')
if (patch.unapplied.length) throw admissionError('REVISION_PATCH_INCOMPLETE', '修订补丁未完整应用')

const sourceCharCount = countProseChars(input.sourceText)
const candidateCharCount = countProseChars(patch.chapterText)
const minimumCharCount = Math.max(800, Math.ceil(sourceCharCount * 0.70))
const maximumCharCount = Math.floor(sourceCharCount * 1.30)
if (candidateCharCount < minimumCharCount) throw admissionError('REVISION_CANDIDATE_TOO_SHORT', '修订候选明显短于原文')
if (candidateCharCount > maximumCharCount) throw admissionError('REVISION_CANDIDATE_TOO_LONG', '修订候选明显长于原文')
assertNoRevisionWrapper(patch.chapterText, extractLLMText(input.result))
assertCompleteRevisionEnding(patch.chapterText)
```

`assertCompleteRevisionEnding` removes trailing whitespace and closing `”’」』）》】` characters, then requires `/[。！？!?….]$/`. `assertNoRevisionWrapper` rejects prose containing code fences, leading chat labels such as `以下是修订稿`/`修订结果如下`, a JSON object/array shell, or raw output that is only reasoning/tool content. It must not reject ordinary quotation marks inside prose.

Move `applySurgicalRevisionPatch` and its private anchor helpers into `revision-candidate-admission.ts`, then re-export it through `novel-editor/index.ts` so current imports remain valid. Remove the opening-rewrite offset fallback: an explicit `keep_from` that cannot be located is an unapplied patch, not permission to guess a cut point.

- [ ] **Step 4: Run admission and legacy patch tests**

Run:

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-candidate-admission.test.ts \
  src/routes/novel-editor-routes.surgical-revision.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts
```

Expected: PASS. Existing patch deletion and whitespace-insensitive matching remain green; the new all-or-nothing and admission tests are green.

- [ ] **Step 5: Commit deterministic admission**

```bash
git add \
  ui/server/src/routes/novel-editor/editor-revision-contract.ts \
  ui/server/src/routes/novel-editor/revision-candidate-admission.ts \
  ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts \
  ui/server/src/routes/novel-editor/index.ts \
  ui/server/src/routes/novel-editor/builders.ts \
  ui/server/src/routes/novel-editor-routes.surgical-revision.test.ts
git commit -m "fix(novel): gate editor revision candidates"
```

Expected: only admission/contract files and the compatibility re-export are committed.

### Task 2: Durable editor-revision run schema and lease repository

**Files:**
- Create: `ui/server/src/novel/repos/editor-revision-runs.ts`
- Create: `ui/server/src/novel/repos/editor-revision-runs.test.ts`
- Modify: `ui/server/src/novel/db.ts`
- Modify: `ui/server/src/novel/types.ts`
- Modify: `ui/server/src/novel/normalize.ts`
- Modify: `ui/server/src/novel/sql-rows.ts`
- Modify: `ui/server/src/novel/row-mappers.ts`
- Modify: `ui/server/src/novel/repos/runs.ts`
- Modify: `ui/server/src/novel/store.ts`

- [ ] **Step 1: Write failing schema, uniqueness, lease, and retry tests**

Use a temp workspace and existing novel test utilities. Assert these operations through the repository, not source strings:

```ts
const first = await createEditorRevisionRun(workspace, {
  projectId: project.id,
  chapterId: chapter1.id,
  inputRef: JSON.stringify(inputFor(chapter1)),
  outputRef: JSON.stringify(initialEditorRevisionCheckpoint(now)),
})
expect(first).toMatchObject({
  run_type: 'editor_revision',
  status: 'queued',
  scope_key: `chapter:${chapter1.id}`,
})

await expect(createEditorRevisionRun(workspace, {
  projectId: project.id,
  chapterId: chapter1.id,
  inputRef: JSON.stringify(inputFor(chapter1)),
  outputRef: JSON.stringify(initialEditorRevisionCheckpoint(now)),
})).rejects.toMatchObject({ code: 'REVISION_ALREADY_ACTIVE', existingRunId: first.id })

const other = await createEditorRevisionRun(workspace, {
  projectId: project.id,
  chapterId: chapter2.id,
  inputRef: JSON.stringify(inputFor(chapter2)),
  outputRef: JSON.stringify(initialEditorRevisionCheckpoint(now)),
})
expect(other.id).not.toBe(first.id)

const claimed = await claimEditorRevisionRun(workspace, {
  runId: first.id,
  owner: 'worker-a',
  now: '2026-07-27T10:00:00.000Z',
  leaseMs: 30_000,
})
expect(claimed).toMatchObject({ status: 'running', lease_owner: 'worker-a' })
expect(await claimEditorRevisionRun(workspace, {
  runId: first.id,
  owner: 'worker-b',
  now: '2026-07-27T10:00:10.000Z',
  leaseMs: 30_000,
})).toBeNull()
expect((await claimEditorRevisionRun(workspace, {
  runId: first.id,
  owner: 'worker-b',
  now: '2026-07-27T10:00:31.000Z',
  leaseMs: 30_000,
}))?.lease_owner).toBe('worker-b')
```

Add tests for repeated `ensureSqliteSchema`, `updated_at` backfill, lease renewal only by current owner, persisted cancel request, canceled terminal transition, checkpoint update under lease, retry retaining the same run ID, and legacy `running editor_revision` rows with NULL `scope_key` becoming `failed / LEGACY_REVISION_RUN_NOT_RESUMABLE` during recovery.

- [ ] **Step 2: Run the repository tests and verify red**

```bash
cd ui/server && bun test src/novel/repos/editor-revision-runs.test.ts
```

Expected: FAIL because the repository and new run columns do not exist.

- [ ] **Step 3: Add the schema migration and persisted fields**

Add columns to both `CREATE TABLE runs` and `addColumnIfMissing`:

```sql
scope_key TEXT DEFAULT NULL,
updated_at TEXT DEFAULT NULL,
lease_owner TEXT DEFAULT NULL,
lease_expires_at TEXT DEFAULT NULL,
cancel_requested_at TEXT DEFAULT NULL
```

Then execute idempotently in `ensureSqliteSchema`:

```sql
UPDATE runs SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '';

CREATE INDEX IF NOT EXISTS idx_runs_editor_revision_recovery
ON runs(run_type, status, lease_expires_at, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_active_editor_revision_scope
ON runs(project_id, run_type, scope_key)
WHERE run_type = 'editor_revision'
  AND scope_key IS NOT NULL
  AND status IN ('queued', 'running', 'cancel_requested');
```

Extend `NovelRunRecord` with nullable fields and include them in `normalizeRunRecord`, `updateRunRow`, `appendNovelRun`, `listNovelRuns`, `listNovelRunSummaries`, and `getNovelRun`. Preserve `created_at`; mutate only `updated_at` during state changes.

- [ ] **Step 4: Implement the lease repository**

Export this surface from `editor-revision-runs.ts`:

```ts
export const EDITOR_REVISION_LEASE_MS = 30_000

export async function createEditorRevisionRun(workspace: string, input: {
  projectId: number
  chapterId: number
  inputRef: string
  outputRef: string
}): Promise<NovelRunRecord>

export async function getEditorRevisionRun(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord | null>

export async function claimEditorRevisionRun(workspace: string, input: {
  runId?: number
  owner: string
  now?: string
  leaseMs?: number
}): Promise<NovelRunRecord | null>

export async function renewEditorRevisionLease(workspace: string, input: {
  runId: number
  owner: string
  now?: string
  leaseMs?: number
}): Promise<boolean>

export async function writeEditorRevisionCheckpoint(workspace: string, input: {
  runId: number
  owner: string
  status: EditorRevisionRunStatus
  phase: EditorRevisionPhase
  checkpoint: EditorRevisionCheckpoint
  errorMessage?: string
}): Promise<NovelRunRecord>

export async function requestEditorRevisionCancel(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord>
export async function finishEditorRevisionCancellation(workspace: string, runId: number, owner: string, checkpoint: EditorRevisionCheckpoint): Promise<NovelRunRecord>
export async function retryEditorRevisionRun(workspace: string, projectId: number, runId: number): Promise<NovelRunRecord>
export async function recoverEditorRevisionRuns(workspace: string, now?: string): Promise<{ queued: number[]; failedLegacy: number[] }>
```

All claim/state methods use `withNovelDbWrite` and conditional SQL. `createEditorRevisionRun` catches only the partial-index constraint, queries the active row for the same scope, and throws an error with `code`, `existingRunId`, and `statusUrl`. Do not use an in-memory lock for uniqueness.

`retryEditorRevisionRun` parses the checkpoint and applies exactly these rules:

```ts
if (checkpoint.prose_persisted) {
  // preserve candidate and completed persist phase; continue at first incomplete post phase
} else if (checkpoint.candidate && checkpoint.phases.admit_candidate.status === 'completed') {
  // preserve admitted candidate; continue at persist_chapter without another LLM call
} else {
  // clear rejected/unadmitted candidate and reset from generate_candidate
}
```

Reject retry for `SOURCE_VERSION_CHANGED` and `REVISION_RUN_SUPERSEDED` with `REVISION_RESTART_REQUIRED`; those require a fresh quality report and new immutable source snapshot.

- [ ] **Step 5: Run persistence regression tests**

```bash
cd ui/server && bun test \
  src/novel/repos/editor-revision-runs.test.ts \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/novel/compaction.test.ts
```

Expected: PASS. Existing generic run rows continue to round-trip, and NULL legacy scope values do not conflict.

- [ ] **Step 6: Commit run persistence**

```bash
git add \
  ui/server/src/novel/repos/editor-revision-runs.ts \
  ui/server/src/novel/repos/editor-revision-runs.test.ts \
  ui/server/src/novel/db.ts \
  ui/server/src/novel/types.ts \
  ui/server/src/novel/normalize.ts \
  ui/server/src/novel/sql-rows.ts \
  ui/server/src/novel/row-mappers.ts \
  ui/server/src/novel/repos/runs.ts \
  ui/server/src/novel/store.ts
git commit -m "feat(novel): persist editor revision jobs"
```

### Task 3: Atomic chapter commit and current-chapter-only plan alignment

**Files:**
- Create: `ui/server/src/novel/repos/editor-revision-commit.ts`
- Create: `ui/server/src/novel/repos/editor-revision-commit.test.ts`
- Modify: `ui/server/src/novel/types.ts`
- Modify: `ui/server/src/novel/store.ts`
- Modify: `ui/server/src/novel-writing/chapter-plan-from-prose-patches.ts`
- Modify: `ui/server/src/novel-writing/chapter-plan-from-prose.test.ts`

- [ ] **Step 1: Write failing atomic-commit tests**

Test four transaction outcomes. Keep the full input so the replay is byte-for-byte identical:

```ts
const commitInput = {
  projectId: project.id,
  chapterId: chapter.id,
  runId: 41,
  sourceTextHash: revisionTextHash(sourceText),
  candidateText,
  candidateHash: revisionTextHash(candidateText),
  chapterPatch: { chapter_goal: '只重建当前章计划。' },
  reviewPayload: { source_review_id: 9, applied_patches: [{ type: 'full_text' }] },
}
const committed = await commitEditorRevisionChapter(workspace, commitInput)
expect(committed.status).toBe('committed')
expect((await getNovelChapter(workspace, chapter.id))?.raw_payload?.editor_revision_commit).toMatchObject({
  run_id: 41,
  source_hash: revisionTextHash(sourceText),
  candidate_hash: revisionTextHash(candidateText),
})
expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)

const replay = await commitEditorRevisionChapter(workspace, commitInput)
expect(replay.status).toBe('already_committed')
expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
```

Also assert:

- Changing the chapter before first commit throws `SOURCE_VERSION_CHANGED` with zero new versions/reviews.
- Replaying after another revision/manual edit throws `REVISION_RUN_SUPERSEDED` and never restores the old candidate.
- A thrown insert/update inside the transaction rolls back version, chapter, marker, and editor revision review together.
- The editor revision review payload contains `source_run_id`, `candidate_hash`, `chapter_id`, and only current-chapter receipts.

- [ ] **Step 2: Write the failing current-plan scope test**

Add a public builder with this contract:

```ts
const result = buildCurrentChapterPlanAlignment([chapter1, chapter2, chapter3], {
  ...chapter1,
  chapter_text: revisedText,
}, { force: true, source: 'post_editor_revision' })

expect(result.chapter_id).toBe(chapter1.id)
expect(result.patch).toBeTruthy()
expect(JSON.stringify(result)).not.toContain(String(chapter2.id))
expect(JSON.stringify(result)).not.toContain(String(chapter3.id))
```

- [ ] **Step 3: Run the tests and verify red**

```bash
cd ui/server && bun test \
  src/novel/repos/editor-revision-commit.test.ts \
  src/novel-writing/chapter-plan-from-prose.test.ts
```

Expected: FAIL on missing commit repository and missing current-only alignment export.

- [ ] **Step 4: Extract current-only alignment before follower propagation**

Refactor `collectPlanAlignmentPatchesAfterProseChange` so the code currently ending at the current patch (before `collectFollowingChapterProgressResyncPatches`) becomes:

```ts
export function buildCurrentChapterPlanAlignment(
  allChapters: any[] = [],
  changedChapter: any = {},
  options: { force?: boolean; source?: string } = {},
) {
  // Existing rebuild + live-contract logic remains byte-for-byte equivalent.
  return {
    chapter_id: Number(changedChapter.id),
    chapter_no: Number(alignedChapter.chapter_no || 0),
    patch: current.chapter_patch || {},
    rebuilt: Boolean(current.rebuilt),
    reason: String(current.reason || ''),
    alignedChapter,
  }
}
```

`collectPlanAlignmentPatchesAfterProseChange` calls this function and then performs its existing follower logic for other production paths. The editor and manual quality paths call only `buildCurrentChapterPlanAlignment`; do not try `followLimit: 0`, because the existing code normalizes that value to at least one.

- [ ] **Step 5: Implement compare-and-set chapter commit**

Export:

```ts
export type CommitEditorRevisionChapterInput = {
  projectId: number
  chapterId: number
  runId: number
  sourceTextHash: string
  candidateText: string
  candidateHash: string
  chapterPatch: Partial<NovelChapterRecord>
  reviewPayload: Record<string, unknown>
}

export type CommitEditorRevisionChapterResult = {
  status: 'committed' | 'already_committed'
  chapter: NovelChapterRecord
  review: NovelReviewRecord
  versionCreated: boolean
}
```

Inside one `withNovelDbWrite` transaction:

1. Read and map the current chapter.
2. If marker `run_id` matches and current hash equals candidate hash, return `already_committed` plus the existing receipt review.
3. If marker matches but current hash differs, throw `REVISION_RUN_SUPERSEDED`.
4. If current hash differs from `sourceTextHash`, throw `SOURCE_VERSION_CHANGED`.
5. Insert exactly one `repair` version snapshot.
6. Merge `chapterPatch`, candidate text, and this marker into `raw_payload`:

```ts
editor_revision_commit: {
  run_id: input.runId,
  source_hash: input.sourceTextHash,
  candidate_hash: input.candidateHash,
  committed_at: nowIso(),
}
```

7. Insert one `editor_revision` review whose payload includes `{ ...reviewPayload, chapter_id, chapter_no, source_run_id: runId, candidate_hash }`.

Do not call `updateNovelChapter` and then merge the marker in a second transaction.

- [ ] **Step 6: Run focused persistence tests**

```bash
cd ui/server && bun test \
  src/novel/repos/editor-revision-commit.test.ts \
  src/novel-writing/chapter-plan-from-prose.test.ts \
  src/novel/sqlite-persistence.test.ts
```

Expected: PASS with exactly one version after commit and replay.

- [ ] **Step 7: Commit atomic persistence**

```bash
git add \
  ui/server/src/novel/repos/editor-revision-commit.ts \
  ui/server/src/novel/repos/editor-revision-commit.test.ts \
  ui/server/src/novel/types.ts \
  ui/server/src/novel/store.ts \
  ui/server/src/novel-writing/chapter-plan-from-prose-patches.ts \
  ui/server/src/novel-writing/chapter-plan-from-prose.test.ts
git commit -m "fix(novel): commit editor revisions atomically"
```

### Task 4: Bound LLM calls to 180 seconds and one transient retry

**Files:**
- Modify: `ui/server/src/llm/executor.ts`
- Modify: `ui/server/src/llm/executor.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts`

- [ ] **Step 1: Write a failing executor option-forwarding test**

Add a focused source/runtime spy assertion that the runtime options contain all three controls:

```ts
expect(executorSource).toContain('maxRetries?: number')
expect(executorSource).toContain('signal: options.signal')
expect(executorSource).toContain('timeoutMs: options.timeoutMs')
expect(executorSource).toContain('maxRetries: options.maxRetries')
```

Add a Story State source assertion for `maxRetries: options.maxRetries` beside its existing `signal` and `timeoutMs` forwarding. Provider-runtime retry behavior itself is already covered by `provider-runtime-b-a.test.ts`; do not duplicate those network fixtures.

- [ ] **Step 2: Run the test and verify red**

```bash
cd ui/server && bun test src/llm/executor.test.ts
```

Expected: FAIL only because `executeNovelAgent` does not yet expose/forward `maxRetries`.

- [ ] **Step 3: Forward the option without changing defaults elsewhere**

Change the options type and runtime call:

```ts
options: {
  modelId?: string
  activeWorkspace?: string
  temperature?: number
  maxTokens?: number
  responseMode?: 'auto' | 'stream' | 'non_stream'
  skipMemory?: boolean
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
} = {}
```

```ts
{
  signal: options.signal,
  timeoutMs: options.timeoutMs,
  maxRetries: options.maxRetries,
}
```

Forward the same property from `prepareStoryStateUpdate`'s `runAgentOnce`. Only the editor revision worker passes `{ timeoutMs: 180_000, maxRetries: 1 }`; all unrelated calls keep provider defaults.

Normalize the Story State compatibility names at that call boundary:

```ts
signal: options.signal ?? options.abortSignal,
timeoutMs: options.timeoutMs ?? options.llmTimeoutMs,
maxRetries: options.maxRetries,
```

The exact-chapter helper in Task 5 also passes `retryOnBlockedTransport: false` and `allowDeterministicFallback: false`. Provider runtime may therefore retry one transient transport error, while truncated/invalid Story State output does not trigger the existing application-level second model call.

- [ ] **Step 4: Run LLM control regressions**

```bash
cd ui/server && bun test \
  src/llm/executor.test.ts \
  src/llm/provider-runtime-b-a.test.ts \
  src/llm/provider-runtime-b-b.test.ts
```

Expected: PASS, including abort during retry delay and abort during stream read.

- [ ] **Step 5: Commit LLM controls**

```bash
git add \
  ui/server/src/llm/executor.ts \
  ui/server/src/llm/executor.test.ts \
  ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts
git commit -m "fix(llm): bound editor revision calls"
```

### Task 5: Make quality review and Story State exact-chapter and receipt-aware

**Files:**
- Create: `ui/server/src/routes/novel-editor/single-chapter-story-state.ts`
- Create: `ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts`
- Modify: `ui/server/src/routes/novel-editor/builders.ts`
- Modify: `ui/server/src/routes/novel-editor/register-quality.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-update.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-update-phase-a.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-update-phase-b.ts`
- Modify: `ui/server/src/novel/repos/projects.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.story-state-guards.test.ts`

- [ ] **Step 1: Write failing current-chapter quality tests**

Extend the quality route guard test with a three-chapter fixture and repository spies. The model may see read-only context, but the mutation set must contain only the requested chapter:

```ts
test('manual quality mutates only its explicit chapter', async () => {
  const calls = installNovelMutationRecorder()
  await request(app)
    .post(`/api/novel/chapters/${chapter2.id}/prose-quality`)
    .send({ project_id: project.id, source: 'manual_refresh' })
    .expect(200)

  expect(reviewAgentChapterIds()).toEqual([chapter2.id])
  expect(calls.chapterUpdates.map(call => call.chapterId)).toEqual([chapter2.id])
  expect(calls.chapterUpdates.some(call => call.chapterId === chapter1.id || call.chapterId === chapter3.id)).toBe(false)
})
```

Add an idempotency test for revision-owned quality calls:

```ts
const first = await createProseQualityReview(ctx, workspace, project, chapter2, {
  source: 'post_revision',
  source_run_id: 44,
  candidate_hash: 'candidate-44',
  current_chapter_only: true,
})
const replay = await createProseQualityReview(ctx, workspace, project, chapter2, {
  source: 'post_revision',
  source_run_id: 44,
  candidate_hash: 'candidate-44',
  current_chapter_only: true,
})
expect(replay.saved.id).toBe(first.saved.id)
expect(reviewAgentCalls).toBe(1)
```

- [ ] **Step 2: Write failing exact-chapter Story State tests**

Test the new public surface with 30 written chapters:

```ts
export type SingleChapterStoryStateReceipt = {
  source_run_id: number | null
  candidate_hash: string
  chapter_id: number
}

export async function prepareSingleChapterStoryState(
  ctx: EditorRoutesContext,
  input: {
    workspace: string
    projectId: number
    chapterId: number
    modelId?: number
    receipt: SingleChapterStoryStateReceipt
    signal?: AbortSignal
    timeoutMs?: number
    maxRetries?: number
  },
): Promise<{
  reused: boolean
  prepared: Record<string, unknown> | null
  completedReceipt?: Record<string, unknown>
}>

export async function applySingleChapterStoryState(
  ctx: EditorRoutesContext,
  input: {
    workspace: string
    projectId: number
    chapterId: number
    receipt: SingleChapterStoryStateReceipt
    prepared: Record<string, unknown> | null
    signal?: AbortSignal
  },
): Promise<{ reused: boolean; update: Record<string, unknown>; receipt: Record<string, unknown> }>
```

Assertions:

```ts
const applyInput = {
  workspace,
  projectId: project.id,
  chapterId: chapter1.id,
  receipt: { source_run_id: 41, candidate_hash: 'candidate-41', chapter_id: chapter1.id },
  prepared: prepareResult.prepared,
}
expect(storyStateAgentChapterIds).toEqual([chapter1.id])
expect(prepareResult.prepared).toBeTruthy()
expect(followerChapterWrites).toEqual([])
expect(refreshFollowingChapterSerialStoryStateReadiness).not.toHaveBeenCalled()

const replay = await applySingleChapterStoryState(ctx, applyInput)
expect(replay.reused).toBe(true)
expect(storyStateAgentChapterIds).toEqual([chapter1.id])
expect(projectStoryStateApplyCount).toBe(1)
expect(derivedReviewKeys).toEqual([...new Set(derivedReviewKeys)])
```

Also test that cancellation after `prepareSingleChapterStoryState` but before `applySingleChapterStoryState` produces no project, character, setting, chapter raw-payload, or review writes.

Create two prepared deltas from the same initial project snapshot, apply them concurrently for different chapters, and assert the final project contains both state changes and both receipt keys. Feed a truncated Story State response and assert the exact-chapter helper makes one application-level model call rather than invoking the existing blocked-transport retry.

- [ ] **Step 3: Run the focused tests and verify red**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/single-chapter-story-state.test.ts \
  src/routes/novel-editor-routes.story-state-guards.test.ts
```

Expected: FAIL because the exact-chapter helper and receipt-aware quality behavior do not exist, and the current routes still call the range helper.

- [ ] **Step 4: Make quality alignment current-only and idempotent**

Give `createProseQualityReview` a typed options contract:

```ts
export type ProseQualityReviewOptions = {
  model_id?: number
  source?: string
  source_review_id?: number | null
  source_run_id?: number | null
  candidate_hash?: string
  current_chapter_only?: boolean
  max_tokens?: number
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
}
```

When `source_run_id`, `candidate_hash`, and `current_chapter_only` are set, first search existing `prose_quality` reviews for an exact payload receipt match:

```ts
function qualityReceiptMatches(payload: any, input: {
  chapterId: number
  sourceRunId: number
  candidateHash: string
}) {
  return Number(payload?.chapter_id) === input.chapterId
    && Number(payload?.source_run_id) === input.sourceRunId
    && String(payload?.candidate_hash || '') === input.candidateHash
}
```

Return that review without an LLM call when it exists. Otherwise forward `{ signal, timeoutMs, maxRetries }`, call `buildCurrentChapterPlanAlignment`, write at most the current chapter patch, and omit `collectProjectPlanAlignmentPatches`. Store `source_run_id` and `candidate_hash` in both the review payload and the `prose_quality` run output. Manual quality uses the same current-only path even without a receipt; there is no editor route that may call follower alignment.

- [ ] **Step 5: Split Story State preparation from exact-chapter application**

Expose typed options through `createStoryStateMachineMethods`:

```ts
export type StoryStateMachineOptions = {
  prepared?: PreparedStoryStateUpdate
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
  exactChapter?: boolean
  idempotencyReceipt?: SingleChapterStoryStateReceipt
  saveDerivedReview?: (record: NovelReviewCreateInput) => Promise<NovelReviewRecord>
}
```

`prepareSingleChapterStoryState` first checks the exact receipt key. A `completed` receipt returns `{ reused: true, prepared: null, completedReceipt }` without an LLM call; a `state_applied` receipt returns its compact `prepared_for_recovery` so missing derived materialization can resume without an LLM call. Otherwise it loads exactly the requested chapter by ID, builds its context once, and calls the already-separated `prepareStoryStateUpdate` with:

```ts
{
  signal,
  timeoutMs: 180_000,
  maxRetries: 1,
  retryOnBlockedTransport: false,
  allowDeterministicFallback: false,
}
```

It returns the prepared model result but does not return or persist the full context package, prompt, or provider messages. It must not call `updateStoryStateMachine` during preparation.

In `updateStoryStateMachine`, if `exactChapter` is true, resolve the receipt before applying project state:

```ts
const receiptKey = `${receipt.source_run_id ?? 'manual'}:${receipt.chapter_id}:${receipt.candidate_hash}`
const existingReceipt = project.reference_config?.story_state_sync_receipts?.[receiptKey]
const projectStateAlreadyApplied = ['state_applied', 'completed'].includes(existingReceipt?.status)
const appliedPayload = projectStateAlreadyApplied ? existingReceipt.payload : payload
```

`applySingleChapterStoryState` returns the completed receipt immediately when `prepared` is null. Otherwise it reloads the exact chapter and rebuilds its context read-only from current repository state; it never invokes the model because it receives persisted or receipt-recovered prepared data. When `projectStateAlreadyApplied` is false, use this project repository transaction instead of writing the preparation-time `next_reference_config` wholesale:

```ts
export function compactPreparedStoryStateForRecovery(prepared: PreparedStoryStateUpdate): PreparedStoryStateUpdate {
  return sanitizeJsonValue({
    state_delta: prepared.state_delta,
    next_reference_config: prepared.next_reference_config,
    character_updates: prepared.character_updates,
    setting_updates: prepared.setting_updates,
    storyline_updates: prepared.storyline_updates,
    sync_reports: prepared.sync_reports,
    hard_failures: prepared.hard_failures,
    payload: prepared.payload,
  }) as PreparedStoryStateUpdate
}

// projects.ts: keep the repository generic and let the caller perform the pure merge.
export async function mutateNovelProjectReferenceConfig<T>(workspace: string, input: {
  projectId: number
  operation: string
  mutate: (current: Record<string, unknown>) => { referenceConfig: Record<string, unknown>; result: T }
}): Promise<{ project: NovelProjectRecord; result: T }> {
  return withNovelDbWrite(workspace, db => {
    const row = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(input.projectId) as any
    if (!row) throw new Error('project not found')
    const current = projectFromRow(row)
    const currentConfig = current.reference_config || {}
    const mutation = input.mutate(currentConfig)
    const nextProject = { ...current, reference_config: mutation.referenceConfig, updated_at: nowIso() }
    updateProjectRow(db, nextProject)
    return { project: nextProject, result: mutation.result }
  }, input.operation)
}

// single-chapter-story-state.ts: rebase the prepared delta inside that transaction.
const committed = await mutateNovelProjectReferenceConfig(workspace, {
  projectId,
  operation: 'commit_single_chapter_story_state_receipt',
  mutate: currentConfig => {
    const existingReceipts = (currentConfig.story_state_sync_receipts || {}) as Record<string, any>
    const existingReceipt = existingReceipts[receiptKey]
    if (['state_applied', 'completed'].includes(existingReceipt?.status)) {
      return {
        referenceConfig: currentConfig,
        result: { receipt: existingReceipt, alreadyApplied: true },
      }
    }
    const rebasedStoryState = mergeStoryState(
      (currentConfig.story_state || {}) as Record<string, unknown>,
      prepared.state_delta,
      chapter,
    )
    const nextReceipt = {
      status: 'state_applied',
      chapter_id: receipt.chapter_id,
      source_run_id: receipt.source_run_id,
      candidate_hash: receipt.candidate_hash,
      payload: prepared.payload,
      prepared_for_recovery: compactPreparedStoryStateForRecovery(prepared),
      applied_at: nowIso(),
    }
    return {
      referenceConfig: {
        ...currentConfig,
        story_state: rebasedStoryState,
        story_state_sync_receipts: { ...existingReceipts, [receiptKey]: nextReceipt },
      },
      result: { receipt: nextReceipt, alreadyApplied: false },
    }
  },
})
```

Write `{ ...currentConfig, story_state: rebasedStoryState, story_state_sync_receipts }` with `updateProjectRow` in the same transaction. This rebases the chapter delta onto the latest global state and gives the Story State mutation and durable recovery receipt one SQLite boundary; two different chapter runs cannot replace each other's unrelated project changes with stale snapshots. When state was already applied, skip only that project-state merge and continue through phase A/B, so a crash can finish missing derived materialization. After all derived steps succeed, use a second conditional project-row transaction to change the receipt to `status: 'completed'`, add `completed_at`, and remove `prepared_for_recovery`; a crash before this final update safely repeats only idempotent derived steps.

Pass `saveDerivedReview` into phase A and phase B. Its deterministic key is:

```ts
const derivedKey = `${receiptKey}:${record.review_type}`
```

Before `createNovelReview`, reuse a review whose payload contains that exact `story_state_receipt_key` and `derived_key`. Character, setting, usage, relation, asset, and chapter raw-payload mutations must be absolute upserts/merges whose second execution produces the same row values; add replay assertions for each mutation family. If an existing operation appends or increments, guard it with a derived receipt key before execution. This makes every phase A/B materialization restart-safe without another model call. Keep non-editor production callers on their existing behavior when `exactChapter` is false.

- [ ] **Step 6: Route both manual single-chapter entry points through the helper**

Delete `syncStoryStateFromChapter` from `builders.ts` and its exports. In `register-quality.ts`, build a manual receipt from the current content hash:

```ts
const receipt = {
  source_run_id: null,
  candidate_hash: revisionTextHash(String(chapter.chapter_text || '')),
  chapter_id: chapter.id,
}
const prepared = await prepareSingleChapterStoryState(ctx, {
  workspace: activeWorkspace,
  projectId: project.id,
  chapterId: chapter.id,
  modelId,
  receipt,
  timeoutMs: 180_000,
  maxRetries: 1,
})
const storyStateUpdate = await applySingleChapterStoryState(ctx, {
  workspace: activeWorkspace,
  projectId: project.id,
  chapterId: chapter.id,
  receipt,
  prepared: prepared.prepared,
})
```

The repair-task recheck already calls `/chapters/:chapterId/story-state-sync`; this route change therefore fixes both manual Story State and current-chapter delivery-risk rechecks. Return `chapter_id`, not `last_synced_chapter`, so no API wording implies a range.

- [ ] **Step 7: Run exact-chapter and Story State regressions**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/single-chapter-story-state.test.ts \
  src/routes/novel-editor-routes.story-state-guards.test.ts \
  src/routes/novel-writing-service.prepared-story-state.test.ts \
  src/routes/novel-writing-service.quality-wiring.test.ts
```

Expected: PASS. The exact helper invokes one Story State model, follower writes remain zero, and ordinary generation still performs its established readiness refresh.

- [ ] **Step 8: Commit single-chapter post-processing**

```bash
git add \
  ui/server/src/routes/novel-editor/single-chapter-story-state.ts \
  ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts \
  ui/server/src/routes/novel-editor/builders.ts \
  ui/server/src/routes/novel-editor/register-quality.ts \
  ui/server/src/novel-writing-service/service/story-state-machine.ts \
  ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts \
  ui/server/src/novel-writing-service/service/story-state-machine-update.ts \
  ui/server/src/novel-writing-service/service/story-state-machine-update-phase-a.ts \
  ui/server/src/novel-writing-service/service/story-state-machine-update-phase-b.ts \
  ui/server/src/novel/repos/projects.ts \
  ui/server/src/routes/novel-editor-routes.story-state-guards.test.ts
git commit -m "fix(novel): scope quality and story state to one chapter"
```

### Task 6: Implement the durable editor-revision worker

**Files:**
- Create: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Create: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Modify: `ui/server/src/routes/novel-editor/editor-revision-contract.ts`
- Modify: `ui/server/src/routes/novel-editor/builders.ts`

- [ ] **Step 1: Write failing phase, cancellation, and recovery tests**

Drive the worker through injected dependencies rather than real providers:

```ts
const worker = createEditorRevisionWorker({
  getWorkspace: () => workspace,
  getProject,
  claimRun: claimEditorRevisionRun,
  renewLease: renewEditorRevisionLease,
  writeCheckpoint: writeEditorRevisionCheckpoint,
  commitChapter: commitEditorRevisionChapter,
  executeRevision: revisionSpy,
  createQualityReview: qualitySpy,
  prepareStoryState: prepareStoryStateSpy,
  applyStoryState: applyStoryStateSpy,
  now: clock.now,
})
await worker.enqueue(run.id)
await worker.waitForIdle()
expect(readCheckpoint(run.id).phases.completed.status).toBe('completed')
```

Cover these cases independently:

- each phase advances only after its durable checkpoint write;
- lease renews before half of `EDITOR_REVISION_LEASE_MS` elapses;
- cancel during generation aborts the provider and creates no chapter/version writes;
- cancel after chapter commit keeps `prose_persisted: true` and leaves post phases incomplete;
- admitted candidate survives restart and the revision spy remains at one call;
- a commit marker left before the run checkpoint is detected and creates no second version;
- a newer marker fails with `REVISION_RUN_SUPERSEDED` and never reapplies old prose;
- a failed post-quality retry starts at `post_quality`;
- `needs_revision: true` completes with warning `POST_QUALITY_NEEDS_REVISION` and no second rewrite;
- Story State prepared output is checkpointed before apply, then reused after a crash;
- continuity warning is deterministic and only created when later written chapters exist.
- a never-resolving LLM attempt aborts at 180 seconds, and a transient provider failure makes at most two total attempts;
- truncation, admission rejection, and source conflicts make exactly one attempt and never enter provider retry.

- [ ] **Step 2: Run the worker test and verify red**

```bash
cd ui/server && bun test src/routes/novel-editor/revision-worker.test.ts
```

Expected: FAIL because `createEditorRevisionWorker` does not exist.

- [ ] **Step 3: Define the worker lifecycle and dependency boundary**

Export:

```ts
export type EditorRevisionWorker = {
  start(workspace: string): Promise<void>
  enqueue(runId: number): void
  cancel(runId: number): void
  stop(): Promise<void>
  waitForIdle(): Promise<void>
}

export function createEditorRevisionWorker(
  ctx: EditorRoutesContext,
  overrides: Partial<EditorRevisionWorkerDependencies> = {},
): EditorRevisionWorker
```

The worker owns one stable UUID `leaseOwner`, an in-memory `Map<number, AbortController>` only for active cancellation, and a queue wake-up primitive. SQLite remains the source of truth for uniqueness, status, checkpoints, and recovery.

Use a 10-second heartbeat for the 30-second lease:

```ts
const heartbeat = setInterval(async () => {
  const renewed = await deps.renewLease(workspace, {
    runId: run.id,
    owner: leaseOwner,
    leaseMs: EDITOR_REVISION_LEASE_MS,
  })
  if (!renewed) controller.abort(new Error('REVISION_LEASE_LOST'))
}, EDITOR_REVISION_LEASE_MS / 3)
```

Clear the interval in `finally`; a lost lease must stop all further mutation by that worker.

- [ ] **Step 4: Implement candidate generation and admission checkpoints**

Parse the immutable `input_ref` once and use this phase gate:

```ts
if (!checkpoint.candidate || checkpoint.phases.admit_candidate.status !== 'completed') {
  await markPhaseRunning('generate_candidate')
  const result = await executeNovelAgent('prose-agent', project, { task: prompt }, {
    activeWorkspace: workspace,
    modelId: input.model_id ? String(input.model_id) : undefined,
    maxTokens: revisionMaxTokens,
    temperature: revisionTemperature,
    responseMode: 'stream',
    skipMemory: true,
    signal: controller.signal,
    timeoutMs: 180_000,
    maxRetries: 1,
  })
  await markPhaseCompleted('generate_candidate', { diagnostics: buildLLMResultDiagnostics(result) })
  await markPhaseRunning('admit_candidate')
  const admitted = admitRevisionCandidate({ sourceText: input.source_text, result })
  checkpoint.candidate = {
    text: admitted.chapterText,
    hash: admitted.candidateHash,
    char_count: admitted.candidateCharCount,
    applied_patches: admitted.appliedPatches,
    diagnostics: admitted.diagnostics,
  }
  await markPhaseCompleted('admit_candidate', admitted.diagnostics)
}
```

Never automatically request a second candidate after truncation, admission failure, or anchor failure. Persist a rejected candidate under the 60,000-character diagnostics policy, mark the run failed, and stop before `persist_chapter`. An admitted candidate must be checkpointed in full before commit; if full serialization cannot be persisted, fail with `REVISION_CANDIDATE_CHECKPOINT_FAILED` and leave the chapter unchanged rather than storing a truncated resumable candidate.

- [ ] **Step 5: Implement commit recovery and cancellation boundaries**

Before every phase, reload the run and call:

```ts
function throwIfRevisionCanceled(run: NovelRunRecord, signal: AbortSignal) {
  if (run.status === 'cancel_requested' || run.cancel_requested_at || signal.aborted) {
    throw Object.assign(new Error('revision canceled'), { code: 'REVISION_CANCELED' })
  }
}
```

At `persist_chapter`, build only the current plan patch, then call `commitEditorRevisionChapter`. Whether it returns `committed` or `already_committed`, immediately set:

```ts
checkpoint.prose_persisted = true
checkpoint.committed_chapter_updated_at = committed.chapter.updated_at
checkpoint.editor_revision_review_id = committed.review.id
```

If cancellation is observed after this transaction, finish as `canceled` while preserving those fields. On recovery, inspect the current chapter marker before any model call; a matching run/hash promotes the checkpoint to `prose_persisted` and starts at the first incomplete post phase.

- [ ] **Step 6: Implement idempotent post phases and warning semantics**

For `post_quality`, pass the receipt and worker controls:

```ts
const quality = await createProseQualityReview(ctx, workspace, project, committedChapter, {
  source: 'post_revision',
  source_review_id: input.review_id,
  source_run_id: run.id,
  candidate_hash: checkpoint.candidate.hash,
  current_chapter_only: true,
  signal: controller.signal,
  timeoutMs: 180_000,
  maxRetries: 1,
})
```

Store the review summary and add `POST_QUALITY_NEEDS_REVISION` when it still needs revision. Do not roll back or call `executeRevision` again.

For Story State, persist only `prepared` and its receipt summary into `checkpoint.story_state` before apply; never persist the full context package, prompt, or provider messages. On restart, call `applySingleChapterStoryState` with that persisted prepared data and let the helper rebuild exact-chapter context read-only. If either auto flag is false, persist that phase as `skipped` with `{ reason: 'disabled_by_request' }`.

After the enabled post phases settle, compute `buildDeliveryRiskConvergenceReport` from current-chapter reviews. Create/reuse a `delivery_risk_convergence` review keyed by `{ source_run_id, candidate_hash, chapter_id }` and store its compact report in `checkpoint.delivery_risk_convergence`. This phase is deterministic and never calls the model; it preserves the existing repair-task closure evidence without reading or writing follower chapters.

For continuity, list chapters read-only and create/reuse one `downstream_continuity_warning` review keyed by `source_run_id`. Its payload is exactly:

```ts
{
  source_run_id: run.id,
  chapter_id: input.chapter_id,
  chapter_no: input.chapter_no,
  source_hash: input.source_text_hash,
  candidate_hash: checkpoint.candidate.hash,
  following_written_range: following.length
    ? { first: following[0].chapter_no, last: following.at(-1)!.chapter_no, count: following.length }
    : null,
  status: following.length ? 'manual_review_recommended' : 'not_applicable',
}
```

This phase performs no model call and creates no chapter-scoped downstream task.

- [ ] **Step 7: Run worker and persistence regressions**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-worker.test.ts \
  src/novel/repos/editor-revision-runs.test.ts \
  src/novel/repos/editor-revision-commit.test.ts \
  src/routes/novel-editor/single-chapter-story-state.test.ts
```

Expected: PASS, including both crash windows and no-regeneration assertions.

- [ ] **Step 8: Commit the worker**

```bash
git add \
  ui/server/src/routes/novel-editor/revision-worker.ts \
  ui/server/src/routes/novel-editor/revision-worker.test.ts \
  ui/server/src/routes/novel-editor/editor-revision-contract.ts \
  ui/server/src/routes/novel-editor/builders.ts
git commit -m "feat(novel): run editor revisions in a durable worker"
```

### Task 7: Replace the blocking route with run APIs and redacted public views

**Files:**
- Create: `ui/server/src/routes/novel-editor/revision-run-view.ts`
- Create: `ui/server/src/routes/novel-editor/revision-run-view.test.ts`
- Modify: `ui/server/src/routes/novel-editor/register-revision.ts`
- Modify: `ui/server/src/routes/novel-editor/register.ts`
- Modify: `ui/server/src/routes/novel-run-routes.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`

- [ ] **Step 1: Write failing public-view and route tests**

Test the public status contract:

```ts
const view = buildPublicEditorRevisionRun(runWithCandidate('完整候选正文'))
expect(view).toMatchObject({
  id: run.id,
  run_type: 'editor_revision',
  chapter_id: 7,
  phase: 'admit_candidate',
  progress: null,
  can_cancel: true,
  can_retry: false,
  can_continue: false,
})
expect(JSON.stringify(view)).not.toContain('完整候选正文')
expect(JSON.stringify(view)).not.toContain(input.source_text)
```

Add route tests for:

```ts
await request(app)
  .post(`/api/novel/reviews/${review.id}/apply-revision`)
  .send({ project_id: project.id, chapter_id: chapter.id })
  .expect(202)
  .expect(({ body }) => expect(body.status_url).toContain(`/editor-revisions/${body.run_id}`))
expect(revisionAgentCalls).toBe(0)

await request(app)
  .post(`/api/novel/reviews/${review.id}/apply-revision`)
  .send({ project_id: project.id, chapter_id: chapter.id })
  .expect(409)
  .expect(({ body }) => expect(body.error_code).toBe('REVISION_ALREADY_ACTIVE'))
```

Also cover status ownership by `project_id`, cancel, retry, retry-restart-required, diagnostics authorization, generic `/runs` redaction, and the project task list.

- [ ] **Step 2: Run route/view tests and verify red**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts
```

Expected: FAIL because the route still waits for the LLM and generic run views expose raw refs.

- [ ] **Step 3: Implement one public projection for status and task APIs**

Export:

```ts
export type PublicEditorRevisionRun = {
  id: number
  run_type: 'editor_revision'
  status: EditorRevisionRunStatus
  phase: EditorRevisionPhase
  phase_label: string
  phases: Record<EditorRevisionPhase, Omit<EditorRevisionPhaseState, 'summary'> & { summary?: Record<string, unknown> }>
  chapter_id: number
  chapter_no: number
  chapter_title: string
  prose_persisted: boolean
  quality: Record<string, unknown> | null
  story_state: Record<string, unknown> | null
  warnings: Array<{ code: string; message: string }>
  error: { code: string; message: string } | null
  progress: null
  can_cancel: boolean
  can_retry: boolean
  can_continue: boolean
  created_at: string
  updated_at: string
}

export function buildPublicEditorRevisionRun(run: NovelRunRecord): PublicEditorRevisionRun
export function buildEditorRevisionDiagnostics(run: NovelRunRecord): Record<string, unknown>
```

Whitelist safe phase summaries rather than deleting known prose keys after serialization. `buildPublicEditorRevisionRun` never returns `input_ref`, `output_ref`, source text, candidate text, prompts, or context packages. `buildEditorRevisionDiagnostics` may return the failed candidate under the 60,000-character policy plus hashes, counts, finish reason, previews, and provider result reference; it still omits the immutable source prose and full context package.

Set actions as follows:

```ts
const active = ['queued', 'running', 'cancel_requested'].includes(run.status)
const postCommitIncomplete = checkpoint.prose_persisted && firstIncompletePostPhase(checkpoint) !== null
return {
  can_cancel: ['queued', 'running'].includes(run.status),
  can_retry: ['failed', 'canceled'].includes(run.status) && !postCommitIncomplete && !restartRequired,
  can_continue: ['failed', 'canceled'].includes(run.status) && postCommitIncomplete && !restartRequired,
}
```

- [ ] **Step 4: Turn apply-revision into a create command**

Retain the existing request parsing and context construction, but stop before calling the model. Store `buildWorkflowRevisionContextBrief(contextPackage, chapter)` in the input's `context_package`; do not persist the complete context package or rendered prompt. Snapshot `EditorRevisionRunInput`, create the run, notify `ctx.editorRevisionWorker.enqueue(run.id)`, and return:

```ts
res.status(202).json({
  ok: true,
  run_id: run.id,
  status: 'queued',
  chapter_id: chapter.id,
  status_url: `/api/novel/editor-revisions/${run.id}?project_id=${project.id}`,
})
```

Map the repository uniqueness error to HTTP 409 with `error_code`, `run_id`, and `status_url`. Other validation failures remain 4xx; a run is not created until project, review, chapter, and immutable source snapshot all validate.

Register:

```http
GET  /api/novel/editor-revisions/:runId?project_id=:projectId
GET  /api/novel/editor-revisions/:runId/diagnostics?project_id=:projectId
POST /api/novel/editor-revisions/:runId/cancel
POST /api/novel/editor-revisions/:runId/retry
```

Cancel first persists the request, then calls the in-memory worker abort. Retry requeues the same run ID and enqueues it; its JSON returns `action: 'retry' | 'continue'` based on the preserved checkpoint.

- [ ] **Step 5: Redact generic runs and add project tasks**

In `/api/novel/runs` and `/api/novel/runs/:id`, map every `editor_revision` through `buildPublicEditorRevisionRun`; leave other run types unchanged. In `/api/novel/projects/:id/tasks`, branch before generic percentage logic:

```ts
if (run.run_type === 'editor_revision') {
  return {
    ...buildPublicEditorRevisionRun(run),
    type_label: '单章修订',
    step_name: `第${input.chapter_no}章 ${input.chapter_title}`.trim(),
  }
}
```

Do not synthesize 50% for a running revision; `progress` remains `null` and phase label is the progress source.

- [ ] **Step 6: Run API and generic-run regressions**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-run-routes.test.ts \
  src/novel/sqlite-persistence.test.ts
```

Expected: PASS. The POST returns before any provider call, conflict is 409, and no ordinary endpoint contains candidate/source prose.

- [ ] **Step 7: Commit the run APIs**

```bash
git add \
  ui/server/src/routes/novel-editor/revision-run-view.ts \
  ui/server/src/routes/novel-editor/revision-run-view.test.ts \
  ui/server/src/routes/novel-editor/register-revision.ts \
  ui/server/src/routes/novel-editor/register.ts \
  ui/server/src/routes/novel-run-routes.ts \
  ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts
git commit -m "feat(novel): expose asynchronous editor revision APIs"
```

### Task 8: Start recovery after workspace load and stop workers cleanly

**Files:**
- Modify: `ui/server/src/routes/novel-editor/register.ts`
- Modify: `ui/server/src/routes/novel.ts`
- Modify: `ui/server/src/index.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Add tests that the route package returns one lifecycle, startup recovery sees the loaded workspace rather than the default workspace, and close aborts all active controllers:

```ts
const lifecycle = registerNovelRoutes(app, getWorkspace)
expect(lifecycle.editorRevisionWorker).toBeDefined()
await lifecycle.start(activeWorkspace)
expect(recoverCalls).toEqual([activeWorkspace])
await lifecycle.stop()
expect(activeSignals.every(signal => signal.aborted)).toBe(true)
```

Test `start` twice and `stop` twice; both must be idempotent and must not duplicate queue loops.

- [ ] **Step 2: Run the lifecycle tests and verify red**

```bash
cd ui/server && bun test src/routes/novel-editor/revision-worker.test.ts
```

Expected: FAIL because the route registration functions currently return no lifecycle.

- [ ] **Step 3: Return and wire the lifecycle**

Construct exactly one worker inside `registerNovelEditorRoutes` and include it in the context given to revision routes. Return:

```ts
export type NovelEditorRoutesLifecycle = {
  start(workspace: string): Promise<void>
  stop(): Promise<void>
  editorRevisionWorker: EditorRevisionWorker
}
```

Propagate this from `registerNovelRoutes`:

```ts
return {
  start: (workspace: string) => editorLifecycle.start(workspace),
  stop: () => editorLifecycle.stop(),
  editorRevisionWorker: editorLifecycle.editorRevisionWorker,
}
```

Capture it in `index.ts` before listen. After `loadActiveWorkspace`, `ensureWorkspaceStructure`, and `saveActiveWorkspace` complete, call `await novelLifecycle.start(activeWorkspace)`. On server close, call `void novelLifecycle.stop()` beside `keyMonitor?.stop()`.

- [ ] **Step 4: Run lifecycle and startup regressions**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts
bun run build:server
```

Expected: PASS. Expired leases resume only after the active workspace is loaded, and server shutdown aborts in-flight provider calls.

- [ ] **Step 5: Commit server lifecycle wiring**

```bash
git add \
  ui/server/src/routes/novel-editor/register.ts \
  ui/server/src/routes/novel.ts \
  ui/server/src/index.ts \
  ui/server/src/routes/novel-editor/revision-worker.test.ts
git commit -m "feat(novel): recover editor revisions on startup"
```

### Task 9: Add a typed frontend task model and drawer-independent polling

**Files:**
- Create: `ui/web/src/pages/novel-workspace/editorRevisionTasks.ts`
- Create: `ui/web/src/pages/novel-workspace/editorRevisionTasks.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/useWorkspaceTasks.ts`
- Modify: `ui/web/src/pages/novel-workspace/useWorkspaceTasks.test.ts`

- [ ] **Step 1: Write failing task-selector tests**

Define the frontend contract independently of component rendering:

```ts
export type EditorRevisionTask = {
  id: number
  run_type: 'editor_revision'
  status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'failed' | 'canceled'
  phase: string
  phase_label: string
  progress: null
  chapter_id: number
  chapter_no: number
  chapter_title: string
  prose_persisted: boolean
  warnings: Array<{ code: string; message: string }>
  error: { code: string; message: string } | null
  can_cancel: boolean
  can_retry: boolean
  can_continue: boolean
  repair_task_link?: { run_id: number; task_index: number } | null
  updated_at: string
}

export function isEditorRevisionTask(value: unknown): value is EditorRevisionTask
export function isActiveEditorRevisionTask(task: EditorRevisionTask): boolean
export function editorRevisionForChapter(tasks: unknown[], chapterId: number): EditorRevisionTask | null
export function editorRevisionTerminalMessage(task: EditorRevisionTask): { type: 'success' | 'warning' | 'error'; text: string } | null
```

Test all terminal messages verbatim:

```ts
expect(editorRevisionTerminalMessage(admissionFailed).text).toBe('修订未入库，当前正文保持不变')
expect(editorRevisionTerminalMessage(qualityPassed).text).toBe('当前章修订和复检完成')
expect(editorRevisionTerminalMessage(needsReview).text).toBe('新版本已保存，当前章仍需人工复查')
expect(editorRevisionTerminalMessage(postFailed).text).toBe('正文已保存，后处理未完成')
```

Also test that `cancel_requested` is active, the newest active run wins for one chapter, terminal runs do not disable a new revision, and tasks for another chapter never match.

- [ ] **Step 2: Write failing polling tests**

Using fake timers and the hook's existing API-client mock, assert:

```ts
renderHook(() => useWorkspaceTasks({
  projectId: 3,
  taskCenterOpen: false,
  selectedModelId: 12,
  stepOutlineLoading: false,
  stepProseLoading: false,
  stepRepairLoading: false,
  proseProgress: { current: 0, total: 0 },
  proseBatchStatus: null,
  planning: false,
  planProgress: null,
  executingAgents: false,
  generatingProse: false,
  streamingProgress: '',
  streamingPercent: 0,
  activeChapter: chapter1,
}))
await flushPromises()
expect(getRequests()).toContain('/novel/projects/3/tasks')

advanceTimersByTime(2000)
expect(taskRequests()).toHaveLength(2)
```

Add refresh recovery, project switch, chapter switch, terminal-stop, cancel, retry, continue, and stale-response tests. Closing the drawer must not stop polling while any editor revision is active. Switching chapters must change only the selector result, not cancel or unsubscribe from the project task.

- [ ] **Step 3: Run the model/hook tests and verify red**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/editorRevisionTasks.test.ts \
  src/pages/novel-workspace/useWorkspaceTasks.test.ts
```

Expected: FAIL because the typed selectors and editor-revision action methods do not exist.

- [ ] **Step 4: Implement selectors and polling ownership**

Add these values to `useWorkspaceTasks`' return type:

```ts
editorRevisionTasks: EditorRevisionTask[]
activeEditorRevisionTasks: EditorRevisionTask[]
cancelEditorRevision: (runId: number) => Promise<EditorRevisionTask>
retryEditorRevision: (runId: number) => Promise<EditorRevisionTask>
loadEditorRevisionDiagnostics: (runId: number) => Promise<Record<string, unknown>>
refreshWorkspaceTasks: () => Promise<void>
```

Derive editor revisions from the existing project-task response and make polling depend on project activity, not drawer visibility:

```ts
const hasActiveEditorRevision = editorRevisionTasks.some(isActiveEditorRevisionTask)
const pollingIntervalMs = workspaceTaskPollingIntervalMs({
  taskCenterOpen,
  hasLocalActiveTask,
  hasActiveEditorRevision,
  hasKnowledgeIngestJob,
})
```

Change the helper's closed-drawer guard to:

```ts
if (!taskCenterOpen && !hasActiveEditorRevision) return null
```

Use the existing abort/generation guard so a response from the prior project cannot replace the current project's tasks. Action methods call cancel/retry endpoints with `project_id`, immediately merge the returned public run by ID, then call `loadProductionTasks()`.

- [ ] **Step 5: Run frontend task-state tests**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/editorRevisionTasks.test.ts \
  src/pages/novel-workspace/useWorkspaceTasks.test.ts
```

Expected: PASS. Polling continues with the drawer closed, recovers after refresh, and stops after every revision is terminal.

- [ ] **Step 6: Commit the frontend task model**

```bash
git add \
  ui/web/src/pages/novel-workspace/editorRevisionTasks.ts \
  ui/web/src/pages/novel-workspace/editorRevisionTasks.test.ts \
  ui/web/src/pages/novel-workspace/useWorkspaceTasks.ts \
  ui/web/src/pages/novel-workspace/useWorkspaceTasks.test.ts
git commit -m "feat(web): track editor revision jobs"
```

### Task 10: Make revision creation asynchronous and defer linked repair-task closure

**Files:**
- Modify: `ui/server/src/novel/repos/editor-revision-runs.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.ts`
- Modify: `ui/server/src/routes/novel-editor/register-revision.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`
- Modify: `ui/web/src/pages/novel-workspace/useWorkspaceTasks.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] **Step 1: Write failing async-handler and closure tests**

Lock these behaviors:

```ts
const created = await applyEditorRevision(report, linkedOptions)
expect(created).toMatchObject({ status: 'queued', run_id: 88 })
expect(closeRepairTaskAfterRevision).not.toHaveBeenCalled()
expect(loadProjectModules).not.toHaveBeenCalled()
expect(setRightPanelOpen).not.toHaveBeenCalled()
```

Then feed terminal polling states:

```ts
reconcileEditorRevisionTasks([completedRun])
expect(loadProjectModules).toHaveBeenCalledTimes(1)
expect(closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)

reconcileEditorRevisionTasks([completedRun])
expect(closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
```

For failed-before-commit, assert no linked task closure. For completed or failed-after-commit, close/transition the linked task using the final quality, Story State, convergence, and warning summaries. A refresh that discovers an unacknowledged terminal run must perform the same reconciliation once.

- [ ] **Step 2: Run the handler tests and verify red**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/useWorkspaceTasks.test.ts \
  src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: FAIL because the current handler expects `res.data.chapter` and closes the repair task inside the POST call.

- [ ] **Step 3: Expose only the safe linked-task identity and acknowledgement**

Add to `PublicEditorRevisionRun`:

```ts
repair_task_link: input.repair_task_link
  ? { run_id: input.repair_task_link.run_id, task_index: input.repair_task_link.task_index }
  : null,
linked_task_closure: checkpoint.linked_task_closure || null,
```

Never expose the embedded task object from `input_ref`. Add a leased repository mutation:

```ts
export async function markEditorRevisionLinkedTaskClosure(
  workspace: string,
  projectId: number,
  runId: number,
  completedAt = nowIso(),
): Promise<NovelRunRecord>
```

It accepts only a terminal run, updates `checkpoint.linked_task_closure` from `pending` to `completed`, and is idempotent. Register:

```http
POST /api/novel/editor-revisions/:runId/linked-task-closure
```

The endpoint checks `project_id`, marks the acknowledgement, and returns the redacted public run. It does not mutate the repair task itself; the existing repair-task closure endpoint remains its owner.

- [ ] **Step 4: Send the safe repair link when creating a run**

When `applyEditorRevision` originates from a repair task, include:

```ts
repair_task_link: {
  run_id: Number(options.sourceRun.id),
  task_index: Number(options.sourceTaskIndex),
  task: options.sourceTask,
}
```

The server stores this only in immutable `input_ref` and initializes `checkpoint.linked_task_closure = { status: 'pending' }`. The public projection emits only IDs.

Treat `202` as creation success: close the confirmation dialog, return the run summary, show `单章修订任务已创建`, and refresh project tasks. Do not set chapters from the response, reload all modules, open the quality panel, or close a repair task at this point.

- [ ] **Step 5: Reconcile terminal runs exactly once**

In the base model, keep a ref keyed by `${projectId}:${runId}:${updated_at}`. For a new terminal revision:

```ts
if (task.prose_persisted) {
  await loadProjectModules()
  if (task.chapter_id === Number(activeChapterIdRef.current)) {
    setRightPanelOpen(true)
    setRightPanelTab('proseQuality')
  }
}
const terminal = editorRevisionTerminalMessage(task)
if (terminal) message[terminal.type](terminal.text)
```

If it has a pending `repair_task_link`, find that run/task in the current task data, call `closeRepairTaskAfterRevision` with the public terminal summaries, then acknowledge `/linked-task-closure`. If the linked task is temporarily unavailable, leave the acknowledgement pending so the next project-task refresh retries. The existing closure endpoint and acknowledgement are both idempotent.

- [ ] **Step 6: Run server and web closure regressions**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/novel/repos/editor-revision-runs.test.ts
cd ../web && bun test \
  src/pages/novel-workspace/useWorkspaceTasks.test.ts \
  src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: PASS. `202` performs no premature data refresh or task closure; terminal reconciliation is restart-safe and closes the linked task once.

- [ ] **Step 7: Commit asynchronous UI reconciliation**

```bash
git add \
  ui/server/src/novel/repos/editor-revision-runs.ts \
  ui/server/src/routes/novel-editor/revision-run-view.ts \
  ui/server/src/routes/novel-editor/register-revision.ts \
  ui/server/src/routes/novel-editor/revision-run-view.test.ts \
  ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx \
  ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx \
  ui/web/src/pages/novel-workspace/useWorkspaceTasks.test.ts
git commit -m "fix(web): defer revision task closure until completion"
```

### Task 11: Render current-chapter status and Task Center actions

**Files:**
- Create: `ui/web/src/pages/novel-workspace/task-center/drawer-run-summary-editor-revision.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`
- Modify: `ui/web/src/pages/novel-workspace/task-center/drawer-model-helpers-basics.ts`
- Modify: `ui/web/src/pages/novel-workspace/task-center/drawer-task-run-card.tsx`
- Modify: `ui/web/src/pages/novel-workspace/task-center/TaskCenterDrawerPanel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.core.test.ts`

- [ ] **Step 1: Write failing panel and Task Center tests**

For the chapter panel, assert:

```ts
render(<WorkspaceCenterQualityRevisionPanel
  activeChapter={chapter7}
  editorRevisionTask={runningChapter7}
  onCancelEditorRevision={cancel}
  onRetryEditorRevision={retry}
/>)
expect(screen.getByText('安全检查')).toBeTruthy()
expect(screen.getByRole('button', { name: /修订/ })).toBeDisabled()
expect(screen.getByRole('button', { name: '取消修订' })).toBeTruthy()
expect(screen.queryByText('%')).toBeNull()
```

Switch to chapter 8 and assert its revision button is enabled. Test failed-before-commit shows `重试`, while failed/canceled-after-commit shows `继续后处理`.

For Task Center, assert one “单章修订” card displays chapter number/title, phase, elapsed/update time, warnings, errors, and only state-valid actions. Diagnostics must not be fetched until `查看诊断` is clicked.

- [ ] **Step 2: Run component tests and verify red**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts \
  src/pages/novel-workspace/TaskCenterDrawer.core.test.ts
```

Expected: FAIL because current components do not accept editor revision task props or dedicated actions.

- [ ] **Step 3: Propagate the current chapter's task to the panel**

In the ready runtime derive:

```ts
const currentEditorRevisionTask = editorRevisionForChapter(editorRevisionTasks, Number(activeChapterId || 0))
```

Pass this task and the cancel/retry/diagnostics callbacks through `workspace-area-view.tsx`, `WorkspaceCenter.tsx`, and into `WorkspaceCenterQualityRevisionPanel`. Do not store a second copy in component state.

Render a compact status strip only when a task matches the current chapter. Use Ant Design `Spin` for active indeterminate progress and action buttons with existing icon library icons. Map phase labels:

```ts
const labels = {
  generate_candidate: '生成候选',
  admit_candidate: '安全检查',
  persist_chapter: '保存版本',
  post_quality: '当前章质检',
  sync_current_story_state: '当前章状态更新',
  record_continuity_warning: '记录连续性提示',
  completed: '完成',
}
```

Do not render a percentage. Disable only the matching chapter's revision action while the task is active.

- [ ] **Step 4: Add the dedicated Task Center summary**

Change `runTypeLabel('editor_revision')` to `单章修订`. Let `TaskRunCardModel.progress` be `number | null`; render `<Spin size="small" />` with the phase label for null active progress and the existing percentage bar only for numeric jobs.

Implement `EditorRevisionRunSummary` with props:

```ts
type EditorRevisionRunSummaryProps = {
  run: EditorRevisionTask
  diagnostics: Record<string, unknown> | null
  diagnosticsLoading: boolean
  onCancel: () => void
  onRetry: () => void
  onContinue: () => void
  onOpenChapter: (chapterId: number) => void
  onLoadDiagnostics: () => void
}
```

The summary renders redacted phase state, warning/error messages, and buttons gated by `can_cancel`, `can_retry`, and `can_continue`. `onLoadDiagnostics` is the only path that calls the diagnostics endpoint; normal card expansion uses already-redacted task data.

- [ ] **Step 5: Add non-overlapping responsive styles**

Use one compact full-width strip, not a nested card:

```css
.editor-revision-status {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 0;
  border-top: 1px solid var(--workspace-border-color, #e5e7eb);
}

.editor-revision-status__label {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .editor-revision-status { grid-template-columns: minmax(0, 1fr); }
}
```

Keep buttons on their own wrapped row on mobile so labels never overlap status text.

- [ ] **Step 6: Run UI and workspace regressions**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts \
  src/pages/novel-workspace/TaskCenterDrawer.core.test.ts \
  src/pages/novel-workspace/TaskCenterDrawer.test.ts \
  src/pages/novel-workspace/workspaceUiShell.test.ts
bun run build
```

Expected: PASS. Active phases are indeterminate, actions match status, other chapters remain usable, and the production web build succeeds.

- [ ] **Step 7: Commit revision task UI**

```bash
git add \
  ui/web/src/pages/novel-workspace/task-center/drawer-run-summary-editor-revision.tsx \
  ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx \
  ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx \
  ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx \
  ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx \
  ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts \
  ui/web/src/pages/novel-workspace/WorkspaceCenter.css \
  ui/web/src/pages/novel-workspace/task-center/drawer-model-helpers-basics.ts \
  ui/web/src/pages/novel-workspace/task-center/drawer-task-run-card.tsx \
  ui/web/src/pages/novel-workspace/task-center/TaskCenterDrawerPanel.tsx \
  ui/web/src/pages/novel-workspace/TaskCenterDrawer.core.test.ts
git commit -m "feat(web): show single-chapter revision progress"
```

### Task 12: Lock the 30-chapter scope and API behavior with integration tests

**Files:**
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.story-state-guards.test.ts`
- Modify: `ui/server/src/routes/novel-run-routes.test.ts`

- [ ] **Step 1: Add a 30-chapter mutation snapshot helper**

Use the real SQLite repositories and capture all protected surfaces:

```ts
async function chapterMutationSnapshot(workspace: string, projectId: number, chapterIds: number[]) {
  const chapters = await listNovelChapters(workspace, projectId)
  const reviews = await listNovelReviews(workspace, projectId)
  const runs = await listNovelRuns(workspace, projectId)
  return Promise.all(chapterIds.map(async chapterId => ({
    chapter: chapters.find(item => item.id === chapterId),
    versions: await listChapterVersions(workspace, chapterId),
    reviews: reviews.filter(item => Number(parseJsonLikePayload(item.payload)?.chapter_id) === chapterId),
    tasks: runs.filter(run => Number(parseJsonLikePayload(run.input_ref)?.chapter_id) === chapterId),
  })))
}
```

Create 30 chapters with non-empty prose, distinctive plan fields, raw payload sentinels, and no initial versions/reviews.

- [ ] **Step 2: Add the end-to-end first-chapter revision test**

Create a run for chapter 1, execute the worker with valid deterministic provider fixtures, and assert:

```ts
expect(revisionCalls).toEqual([chapter1.id])
expect(qualityCalls).toEqual([chapter1.id])
expect(storyStateCalls).toEqual([chapter1.id])
expect(after.slice(1)).toEqual(before.slice(1))
expect(projectWarnings).toHaveLength(1)
expect(projectWarnings[0].review_type).toBe('downstream_continuity_warning')
expect(followingChapterTasks).toEqual([])
```

Compare the full chapter record, versions, chapter-attributed reviews, and tasks for chapters 2-30. Include plan fields and `raw_payload` in the equality check. Assert only chapter 1 has one repair version and its candidate hash matches its commit marker.

- [ ] **Step 3: Add rejected-candidate and manual Story State variants**

Run the observed 5910-to-243 candidate through the real worker and assert the entire database snapshot is unchanged except the failed editor-revision run diagnostic. Then call `/chapters/:chapterId/story-state-sync` on chapter 1 of the same 30-chapter fixture and assert one model call and zero chapter 2-30 writes.

- [ ] **Step 4: Add API timing, conflict, and redaction assertions**

Hold the revision provider promise unresolved and prove POST has already returned 202. Concurrently create the same chapter run and expect one 202 plus one 409. Serialize these endpoints and reject any source/candidate sentinel:

```ts
const bodies = [status.body, tasks.body, runs.body, runDetail.body]
for (const body of bodies) {
  expect(JSON.stringify(body)).not.toContain(SOURCE_SENTINEL)
  expect(JSON.stringify(body)).not.toContain(CANDIDATE_SENTINEL)
}
```

Only the dedicated diagnostics response may contain `CANDIDATE_SENTINEL`.

- [ ] **Step 5: Run the integration/API suite**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-editor-routes.story-state-guards.test.ts \
  src/routes/novel-run-routes.test.ts
```

Expected: PASS. Chapter 1 causes exactly one call per enabled model phase and chapters 2-30 remain byte-for-byte unchanged.

- [ ] **Step 6: Commit scope regressions**

```bash
git add \
  ui/server/src/routes/novel-editor/revision-worker.test.ts \
  ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts \
  ui/server/src/routes/novel-editor-routes.story-state-guards.test.ts \
  ui/server/src/routes/novel-run-routes.test.ts
git commit -m "test(novel): lock revision scope to one chapter"
```

### Task 13: Add a read-only historical damage audit

**Files:**
- Create: `ui/server/src/novel/editor-revision-damage-audit.ts`
- Create: `ui/server/src/novel/editor-revision-damage-audit.test.ts`
- Create: `scripts/audit-editor-revision-damage.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing detector tests**

Define:

```ts
export type EditorRevisionDamageEvidence = {
  project_id: number
  chapter_id: number
  chapter_no: number
  current_hash: string
  current_char_count: number
  suggested_version_id: number
  suggested_version_hash: string
  suggested_version_char_count: number
  ratio: number
  editor_revision_review_ids: number[]
  editor_revision_run_ids: number[]
  diff_summary: { removed_chars: number; added_chars: number; current_preview: string; version_preview: string }
}

export function detectEditorRevisionDamage(input: {
  chapters: NovelChapterRecord[]
  versions: NovelChapterVersionRecord[]
  reviews: NovelReviewRecord[]
  runs: NovelRunRecord[]
}): EditorRevisionDamageEvidence[]
```

Test a 5910-character repair-source version followed by a 243-character current chapter is reported with `ratio < 0.70`. Test exact 70%, unrelated manual shortening without editor revision evidence, no prior repair version, and a healthy 90% revision are not reported. Verify the pure function does not mutate any input object.

- [ ] **Step 2: Run the detector test and verify red**

```bash
cd ui/server && bun test src/novel/editor-revision-damage-audit.test.ts
```

Expected: FAIL because the detector does not exist.

- [ ] **Step 3: Implement the pure evidence correlator**

For each chapter, select the highest `version_no` version with `source === 'repair'`, calculate both counts with `countProseChars`, and require `current / version < 0.70`. Correlation requires either an `editor_revision` review whose payload `chapter_id` matches, or an `editor_revision` run whose parsed input `chapter_id` matches, with `created_at` between the version timestamp and 24 hours after it. Use `revisionTextHash` for both hashes. Build previews from the first and last 120 characters and aggregate only IDs, counts, hashes, and a compact diff summary.

Do not expose a mutation callback, restore flag, or `updateNovelChapter` import from this module.

- [ ] **Step 4: Implement a read-only CLI**

Add:

```json
"audit:editor-revision-damage": "bun scripts/audit-editor-revision-damage.ts"
```

The script accepts `--workspace <absolute-path>` and optional `--project-id <number>`. Resolve `<workspace>/novel.sqlite`, require that file to exist, and open it with `new Database(dbPath, { readonly: true })`. Query only `projects`, `chapters`, `chapter_versions`, `reviews`, and `runs`, map JSON columns through the existing pure row-mapper functions, and print JSON:

```ts
console.log(JSON.stringify({
  workspace,
  project_id: projectId || null,
  damaged_count: evidence.length,
  evidence,
  restore_performed: false,
}, null, 2))
```

Reject unknown flags, relative workspace paths, missing workspaces, and missing databases. There is intentionally no restore/apply argument. The CLI must not call `ensureSqliteSchema`, legacy import, or import any create/update/delete repository function; ordinary list repositories are also excluded because their read path currently performs schema assurance.

- [ ] **Step 5: Run detector and read-only CLI fixture tests**

Create a SQLite fixture in the unit test, record its SHA-256 hash and modification time, invoke the CLI against that fixture, and compare both values afterward:

```bash
cd ui/server && bun test src/novel/editor-revision-damage-audit.test.ts
```

Expected: PASS; the CLI fixture case exits 0 with `"damaged_count": 0` and `"restore_performed": false`, and the database hash/mtime are unchanged.

- [ ] **Step 6: Commit the read-only audit**

```bash
git add \
  ui/server/src/novel/editor-revision-damage-audit.ts \
  ui/server/src/novel/editor-revision-damage-audit.test.ts \
  scripts/audit-editor-revision-damage.ts \
  package.json
git commit -m "feat(novel): audit damaged editor revisions"
```

The actual first-chapter restore is deliberately not part of this implementation plan. After this audit identifies the exact version, restoration must use the existing version-history UI, show the diff, and require a separate explicit user confirmation.

### Task 14: Run full regressions, builds, and manual verification

**Files:**
- Test only; no production files expected

- [ ] **Step 1: Run all focused server tests**

```bash
cd ui/server && bun test \
  src/routes/novel-editor/revision-candidate-admission.test.ts \
  src/novel/repos/editor-revision-runs.test.ts \
  src/novel/repos/editor-revision-commit.test.ts \
  src/routes/novel-editor/single-chapter-story-state.test.ts \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-editor-routes.story-state-guards.test.ts \
  src/routes/novel-run-routes.test.ts \
  src/novel/editor-revision-damage-audit.test.ts
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run related novel persistence and writing regressions**

```bash
cd ui/server && bun test \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/novel/compaction.test.ts \
  src/routes/novel-writing-service.prepared-story-state.test.ts \
  src/routes/novel-writing-service.quality-wiring.test.ts \
  src/routes/novel-editor-routes.surgical-revision.test.ts \
  src/routes/novel-editor-routes.test.ts
```

Expected: all tests PASS; ordinary chapter generation keeps its prior Story State readiness behavior.

- [ ] **Step 3: Run focused frontend tests**

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/editorRevisionTasks.test.ts \
  src/pages/novel-workspace/useWorkspaceTasks.test.ts \
  src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts \
  src/pages/novel-workspace/TaskCenterDrawer.core.test.ts \
  src/pages/novel-workspace/TaskCenterDrawer.test.ts \
  src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: all tests PASS with zero failures.

- [ ] **Step 4: Run production builds and repository checks**

```bash
cd ../.. && bun run check:refactor-boundaries
bun run build:server
bun run build:web
git diff --check
```

Expected: all commands exit 0. If the repository has a documented unrelated baseline failure, record its exact command and output in the handoff; do not weaken assertions or skip a new test to hide it.

- [ ] **Step 5: Manually verify the user workflow**

Start the application and use a project with at least two written chapters:

```bash
bun run dev
```

Verify:

1. Start “先质检、再修订” on one chapter; the POST returns immediately and the phase strip appears.
2. Close Task Center, switch chapters, and refresh; the same task continues and is rediscovered.
3. Confirm only the target chapter's revision button is disabled.
4. Cancel before save and confirm chapter/version history is unchanged.
5. Retry, allow save, then cancel post-processing; confirm the new version remains and “继续后处理” appears.
6. Continue and confirm quality and Story State complete without touching later chapters.
7. Open Task Center diagnostics and confirm candidate evidence loads only on demand.
8. Confirm the downstream continuity item is a project warning, not a later-chapter task.

- [ ] **Step 6: Commit only verification-driven corrections**

If verification requires a correction, return to the task that owns that file, rerun its focused tests, stage the exact paths listed in that task's commit step, and commit:

```bash
git commit -m "fix(novel): close editor revision verification gaps"
```

If no correction is needed, do not create an empty commit. Confirm `git status --short` contains no implementation files left unstaged and still preserves user-owned workspace changes.
