# Editor Revision Project Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-level 60-600 second timeout setting, defaulting to 600 seconds, and apply its snapshotted value to every LLM call in the single-chapter editor revision worker.

**Architecture:** Store the setting under `project.reference_config.editor_revision.timeout_seconds`, normalize it in one server-side pure module, and expose it through a dedicated GET/PUT API that preserves all sibling project configuration. Snapshot the effective millisecond value into each revision run checkpoint before the first model call, then pass that value to the worker abort timer and provider options for candidate generation, post-quality review, and both Story State calls. Add a focused Ant Design modal opened from the workspace top bar's “更多” menu.

**Tech Stack:** TypeScript, Bun test runner, Express route handlers, Bun SQLite repositories, React 18, Ant Design 5, Axios.

---

## File Map

- Create `ui/server/src/novel/editor-revision-runtime-config.ts`: timeout constants and project-config normalization.
- Create `ui/server/src/novel/editor-revision-runtime-config.test.ts`: normalization and checkpoint-runtime validation tests.
- Create `ui/server/src/routes/novel-project-config-routes.test.ts`: GET/PUT route contract and merge-preservation tests.
- Modify `ui/server/src/routes/novel-project-config-routes.ts`: dedicated editor revision config endpoints.
- Modify `ui/server/src/routes/novel-editor/editor-revision-contract.ts`: optional checkpoint runtime snapshot type.
- Modify `ui/server/src/novel/repos/editor-revision-runs.ts`: validate an existing runtime snapshot as an integer number of milliseconds from 60,000 through 600,000.
- Modify `ui/server/src/routes/novel-editor/revision-worker.ts`: snapshot and use the effective timeout across all four model calls.
- Modify `ui/server/src/routes/novel-editor/revision-worker.test.ts`: timeout, snapshot, recovery, post-persist failure, and provider-option regressions.
- Create `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`: project settings modal and request helpers.
- Create `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`: helper behavior and workspace wiring tests.
- Modify `ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx`: “更多 → 项目设置” entry and modal ownership.

The existing `ReferenceConfigModal.tsx` is deliberately not modified. The runtime timeout belongs in project settings, not reference-content configuration.

### Task 0: Isolate the already-completed JSON quote recovery patch

**Files:**
- Existing changes only: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`
- Existing changes only: `ui/server/src/routes/novel-editor/builders-revision-prompts.ts`
- Existing changes only: `ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts`
- Existing changes only: `ui/server/src/routes/novel-editor/revision-candidate-admission.ts`
- Existing changes only: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Existing changes only: `ui/server/src/routes/novel-route-utils-payload.ts`
- Existing changes only: `ui/server/src/routes/novel-writing-service.prose-word-target-a.test.ts`
- Preserve without staging: `workspace/assets.json`
- Preserve without staging: `workspace/zhuque-inputs/`
- Preserve without staging: `workspace/zhuque-reports/`

- [ ] **Step 1: Confirm the worktree split before adding timeout changes**

Run:

```bash
git status --short
git diff --stat
```

Expected: the seven server files above contain the completed JSON recovery patch; the three `workspace/` paths remain user-owned and unrelated. There must be no timeout implementation files yet.

- [ ] **Step 2: Re-run the focused JSON recovery tests**

Run:

```bash
cd ui/server && bun test \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-editor/revision-candidate-admission.test.ts \
  src/routes/novel-editor/revision-worker.test.ts
```

Expected: PASS.

Run the one newly added prose payload regression separately because the full legacy word-target file has seven unrelated pre-existing expectation failures:

```bash
cd ui/server && bun test src/routes/novel-writing-service.prose-word-target-a.test.ts \
  -t "recovers the full closed chapter text when an unescaped ascii quote appears after 200 characters"
```

Expected: 1 PASS.

- [ ] **Step 3: Verify both builds before freezing the prior patch**

Run:

```bash
bun run build:server
bun run build:web
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit only the prior JSON recovery files**

```bash
git add \
  ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts \
  ui/server/src/routes/novel-editor/builders-revision-prompts.ts \
  ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts \
  ui/server/src/routes/novel-editor/revision-candidate-admission.ts \
  ui/server/src/routes/novel-editor/revision-worker.test.ts \
  ui/server/src/routes/novel-route-utils-payload.ts \
  ui/server/src/routes/novel-writing-service.prose-word-target-a.test.ts
git commit -m "fix(novel): recover quoted revision JSON"
```

Expected: the commit contains only those seven files. `workspace/assets.json`, `workspace/zhuque-inputs/`, and `workspace/zhuque-reports/` remain unstaged.

### Task 1: Add the canonical editor revision timeout configuration

**Files:**
- Create: `ui/server/src/novel/editor-revision-runtime-config.ts`
- Create: `ui/server/src/novel/editor-revision-runtime-config.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

Create the test file with these cases:

```ts
import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS,
  MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
  MIN_EDITOR_REVISION_TIMEOUT_SECONDS,
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
} from './editor-revision-runtime-config'

describe('editor revision runtime config', () => {
  test('defaults missing and invalid stored values to 600 seconds', () => {
    expect(DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(undefined)).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds('600')).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(Number.NaN)).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(Number.POSITIVE_INFINITY)).toBe(600)
    expect(resolveEditorRevisionRuntimeConfig({ reference_config: {} })).toEqual({ timeout_seconds: 600 })
  })

  test('truncates finite values and clamps them to 60 through 600 seconds', () => {
    expect(MIN_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(60)
    expect(MAX_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(59)).toBe(60)
    expect(normalizeEditorRevisionTimeoutSeconds(420.9)).toBe(420)
    expect(normalizeEditorRevisionTimeoutSeconds(601)).toBe(600)
    expect(resolveEditorRevisionRuntimeConfig({
      reference_config: { editor_revision: { timeout_seconds: 275 } },
    })).toEqual({ timeout_seconds: 275 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts
```

Expected: FAIL because `editor-revision-runtime-config.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure configuration module**

Create `editor-revision-runtime-config.ts`:

```ts
export const MIN_EDITOR_REVISION_TIMEOUT_SECONDS = 60
export const MAX_EDITOR_REVISION_TIMEOUT_SECONDS = 600
export const DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS = 600

export type EditorRevisionRuntimeConfig = {
  timeout_seconds: number
}

export function normalizeEditorRevisionTimeoutSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS
  }
  return Math.min(
    MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
    Math.max(MIN_EDITOR_REVISION_TIMEOUT_SECONDS, Math.trunc(value)),
  )
}

export function resolveEditorRevisionRuntimeConfig(project: any): EditorRevisionRuntimeConfig {
  return {
    timeout_seconds: normalizeEditorRevisionTimeoutSeconds(
      project?.reference_config?.editor_revision?.timeout_seconds,
    ),
  }
}

export function resolveEditorRevisionTimeoutMs(project: any): number {
  return resolveEditorRevisionRuntimeConfig(project).timeout_seconds * 1_000
}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts
```

Expected: 2 PASS.

- [ ] **Step 5: Commit the configuration primitive**

```bash
git add \
  ui/server/src/novel/editor-revision-runtime-config.ts \
  ui/server/src/novel/editor-revision-runtime-config.test.ts
git commit -m "feat(novel): define editor revision timeout config"
```

### Task 2: Expose project-scoped GET and PUT endpoints

**Files:**
- Create: `ui/server/src/routes/novel-project-config-routes.test.ts`
- Modify: `ui/server/src/routes/novel-project-config-routes.ts`

- [ ] **Step 1: Write failing route tests for default, merge, clamp, validation, and 404**

Use the repository's lightweight route harness and a temporary novel workspace:

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { createNovelProject, getNovelProject } from '../novel'
import { registerNovelProjectConfigRoutes } from './novel-project-config-routes'

const workspaces: string[] = []

function routeHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post']) {
    app[method] = (path: string, handler: any) => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler)
      return app
    }
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

function context(workspace: string) {
  return {
    getWorkspace: () => workspace,
    getProject: (_workspace: string, id: number) => getNovelProject(_workspace, id),
    getApprovalPolicy: () => ({}),
    getProductionBudget: () => ({}),
    getProductionBudgetDecision: () => ({}),
    getQualityGate: () => ({}),
    getAgentPromptConfig: () => ({}),
    buildAgentConfigSnapshot: () => ({}),
  }
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('editor revision project config routes', () => {
  test('returns 600 seconds for a legacy project with no setting', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: 'legacy', reference_config: {} })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)

    const response = await callRoute(
      handlers.get('GET /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) } },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ ok: true, config: { timeout_seconds: 600 } })
  })

  test('clamps and merges timeout without overwriting sibling reference config', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, {
      title: 'merge-safe',
      reference_config: {
        references: [{ project_title: '参考书' }],
        story_state: { current_time: 'night' },
      },
    })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)

    const response = await callRoute(
      handlers.get('PUT /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) }, body: { config: { timeout_seconds: 900 } } },
    )
    const stored = await getNovelProject(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(response.body.config).toEqual({ timeout_seconds: 600 })
    expect(stored?.reference_config).toMatchObject({
      references: [{ project_title: '参考书' }],
      story_state: { current_time: 'night' },
      editor_revision: { timeout_seconds: 600 },
    })
  })

  test('rejects a non-numeric request and returns 404 for a missing project', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: 'validation', reference_config: {} })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)
    const put = handlers.get('PUT /api/novel/projects/:id/editor-revision-config')

    const invalid = await callRoute(put, {
      params: { id: String(project.id) },
      body: { config: { timeout_seconds: '600' } },
    })
    const missing = await callRoute(put, {
      params: { id: '999999' },
      body: { config: { timeout_seconds: 600 } },
    })

    expect(invalid.statusCode).toBe(400)
    expect(missing.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```bash
cd ui/server && bun test src/routes/novel-project-config-routes.test.ts
```

Expected: FAIL because neither route is registered.

- [ ] **Step 3: Implement the dedicated routes**

Import the shared normalizer in `novel-project-config-routes.ts`:

```ts
import {
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
} from '../novel/editor-revision-runtime-config'
```

Add these handlers inside `registerNovelProjectConfigRoutes`:

```ts
app.get('/api/novel/projects/:id/editor-revision-config', async (req, res) => {
  try {
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'project not found' })
    res.json({ ok: true, config: resolveEditorRevisionRuntimeConfig(project) })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.put('/api/novel/projects/:id/editor-revision-config', async (req, res) => {
  try {
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'project not found' })
    const rawTimeout = req.body?.config?.timeout_seconds ?? req.body?.timeout_seconds
    if (typeof rawTimeout !== 'number' || !Number.isFinite(rawTimeout)) {
      return res.status(400).json({ error: 'timeout_seconds must be a finite number' })
    }
    const config = { timeout_seconds: normalizeEditorRevisionTimeoutSeconds(rawTimeout) }
    const updated = await updateNovelProject(activeWorkspace, project.id, {
      reference_config: {
        ...(project.reference_config || {}),
        editor_revision: {
          ...(project.reference_config?.editor_revision || {}),
          ...config,
        },
      },
    } as any)
    res.json({ ok: true, config, project: updated })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})
```

- [ ] **Step 4: Run the route and normalizer tests**

Run:

```bash
cd ui/server && bun test \
  src/novel/editor-revision-runtime-config.test.ts \
  src/routes/novel-project-config-routes.test.ts
```

Expected: 5 PASS.

- [ ] **Step 5: Commit the project API**

```bash
git add \
  ui/server/src/routes/novel-project-config-routes.ts \
  ui/server/src/routes/novel-project-config-routes.test.ts
git commit -m "feat(novel): expose revision timeout settings"
```

### Task 3: Make the timeout snapshot part of the durable checkpoint contract

**Files:**
- Modify: `ui/server/src/routes/novel-editor/editor-revision-contract.ts`
- Modify: `ui/server/src/novel/repos/editor-revision-runs.ts`
- Modify: `ui/server/src/novel/editor-revision-runtime-config.test.ts`

- [ ] **Step 1: Add failing checkpoint validation tests**

Extend `editor-revision-runtime-config.test.ts`:

```ts
import { requireCoherentEditorRevisionCheckpoint } from './repos/editor-revision-runs'
import { EDITOR_REVISION_PHASES } from '../routes/novel-editor/editor-revision-contract'

function initialCheckpoint(runtimeConfig?: { llm_timeout_ms: number }) {
  return {
    schema_version: 1 as const,
    phase: 'generate_candidate' as const,
    phases: Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [
      phase,
      { status: 'pending', attempt: 0 },
    ])),
    prose_persisted: false,
    warnings: [],
    ...(runtimeConfig ? { runtime_config: runtimeConfig } : {}),
  }
}

test('accepts an absent or canonical millisecond timeout snapshot', () => {
  expect(() => requireCoherentEditorRevisionCheckpoint(initialCheckpoint())).not.toThrow()
  expect(() => requireCoherentEditorRevisionCheckpoint(
    initialCheckpoint({ llm_timeout_ms: 420_000 }),
  )).not.toThrow()
})

test.each([59_000, 600_001, 420_500, Number.NaN])(
  'rejects non-canonical checkpoint timeout %p',
  llmTimeoutMs => {
    expect(() => requireCoherentEditorRevisionCheckpoint(
      initialCheckpoint({ llm_timeout_ms: llmTimeoutMs }),
    )).toThrow('editor revision checkpoint runtime config is not canonical')
  },
)
```

- [ ] **Step 2: Run the test to verify invalid snapshots are currently accepted**

Run:

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts
```

Expected: FAIL because the checkpoint validator does not yet constrain `runtime_config`.

- [ ] **Step 3: Add the checkpoint type and coherence guard**

Add this optional member to `EditorRevisionCheckpoint`:

```ts
runtime_config?: {
  llm_timeout_ms: number
}
```

Import the timeout boundaries into `editor-revision-runs.ts` and validate the snapshot before phase coherence:

```ts
import {
  MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
  MIN_EDITOR_REVISION_TIMEOUT_SECONDS,
} from '../editor-revision-runtime-config'

function assertRuntimeConfigCoherent(checkpoint: EditorRevisionCheckpoint) {
  const runtime = checkpoint.runtime_config
  if (runtime === undefined) return
  const timeoutMs = runtime?.llm_timeout_ms
  if (!runtime
    || typeof runtime !== 'object'
    || !Number.isInteger(timeoutMs)
    || timeoutMs % 1_000 !== 0
    || timeoutMs < MIN_EDITOR_REVISION_TIMEOUT_SECONDS * 1_000
    || timeoutMs > MAX_EDITOR_REVISION_TIMEOUT_SECONDS * 1_000) {
    checkpointInvalid('editor revision checkpoint runtime config is not canonical')
  }
}
```

Call `assertRuntimeConfigCoherent(checkpoint)` at the start of `assertEditorRevisionCheckpointCoherent`.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
cd ui/server && bun test src/novel/editor-revision-runtime-config.test.ts
```

Expected: all normalization and checkpoint tests PASS.

- [ ] **Step 5: Commit the durable snapshot contract**

```bash
git add \
  ui/server/src/routes/novel-editor/editor-revision-contract.ts \
  ui/server/src/novel/repos/editor-revision-runs.ts \
  ui/server/src/novel/editor-revision-runtime-config.test.ts
git commit -m "feat(novel): validate revision timeout snapshots"
```

### Task 4: Apply the snapshotted timeout to every revision model phase

**Files:**
- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`

- [ ] **Step 1: Replace the 180-second expectations and add failing cross-phase tests**

In `revision-worker.test.ts`, update the existing timeout test to expect `600_000`, and update the provider retry test to expect `{ timeoutMs: 600_000, maxRetries: 1 }`.

Add a project-config test:

```ts
test('uses one project timeout for every revision LLM phase and checkpoints it', async () => {
  const harness = createHarness()
  harness.project.reference_config = { editor_revision: { timeout_seconds: 420 } }
  const worker = harness.worker()

  await worker.start(workspace)
  await worker.waitForIdle()

  expect(harness.checkpoint().runtime_config).toEqual({ llm_timeout_ms: 420_000 })
  expect(harness.revisionCalls[0][3]).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
  expect(harness.qualityCalls[0].at(-1)).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
  expect(harness.prepareCalls[0][1]).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
  expect(harness.applyCalls[0][1]).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
  expect(harness.timeoutRegistrations.filter(item => item.ms === 420_000)).toHaveLength(4)
})
```

Add a recovery-snapshot test:

```ts
test('reuses a durable timeout snapshot instead of rereading changed project config', async () => {
  const checkpoint = initialCheckpoint()
  checkpoint.runtime_config = { llm_timeout_ms: 240_000 }
  const harness = createHarness({ checkpoint })
  harness.project.reference_config = { editor_revision: { timeout_seconds: 420 } }
  const worker = harness.worker()

  await worker.start(workspace)
  await worker.waitForIdle()

  expect(harness.checkpoint().runtime_config).toEqual({ llm_timeout_ms: 240_000 })
  expect(harness.revisionCalls[0][3].timeoutMs).toBe(240_000)
  expect(harness.qualityCalls[0].at(-1).timeoutMs).toBe(240_000)
})
```

Add a post-persist timeout regression:

```ts
test('keeps committed prose when post-quality reaches the configured timeout', async () => {
  const harness = createHarness({ quality: async () => new Promise(() => {}) })
  const worker = harness.worker()
  await worker.start(workspace)
  await eventually(() => harness.qualityCalls.length === 1)
  const timer = harness.timeoutRegistrations.find(item => item.ms === 600_000 && !item.cleared)
  expect(timer).toBeDefined()

  timer!.callback()
  await worker.waitForIdle()

  expect(harness.run.status).toBe('failed')
  expect(harness.checkpoint()).toMatchObject({
    phase: 'post_quality',
    prose_persisted: true,
    runtime_config: { llm_timeout_ms: 600_000 },
    error: {
      code: 'REVISION_LLM_TIMEOUT',
      message: 'editor revision model call timed out after 600 seconds',
    },
  })
  expect(harness.commitCalls()).toBe(1)
  expect(harness.chapter().chapter_text).toBe(candidateText)
})
```

- [ ] **Step 2: Run the worker test to verify it fails**

Run:

```bash
cd ui/server && bun test src/routes/novel-editor/revision-worker.test.ts
```

Expected: FAIL on 600-second default, missing checkpoint snapshot, and unchanged 180-second provider options.

- [ ] **Step 3: Snapshot the timeout before the first model call**

Remove `const LLM_TIMEOUT_MS = 180_000` and import the project resolver:

```ts
import { resolveEditorRevisionTimeoutMs } from '../../novel/editor-revision-runtime-config'
```

Add this helper next to the checkpoint helpers:

```ts
async function resolveRunLlmTimeoutMs(
  input: EditorRevisionRunInput,
  runId: number,
  project: any,
  controller: AbortController,
  lease: LeaseState,
) {
  const loaded = await phaseCheckpoint(input, runId, controller, lease)
  const stored = loaded.checkpoint.runtime_config?.llm_timeout_ms
  if (stored !== undefined) return stored
  const llmTimeoutMs = resolveEditorRevisionTimeoutMs(project)
  loaded.checkpoint.runtime_config = { llm_timeout_ms: llmTimeoutMs }
  await writeCheckpoint(
    input,
    runId,
    loaded.checkpoint.phase,
    loaded.checkpoint,
    'running',
    undefined,
    lease,
  )
  return llmTimeoutMs
}
```

In `processClaim`, resolve it after loading the project and before recovery or generation:

```ts
const project = await ctx.getProject(activeWorkspace!, input.project_id)
if (!project) throw revisionError('PROJECT_NOT_FOUND')
const llmTimeoutMs = await resolveRunLlmTimeoutMs(
  input,
  run.id,
  project,
  controller,
  lease,
)
await recoverCommittedChapter(input, run.id, controller, lease)
await generateAndAdmit(input, run.id, project, controller, lease, llmTimeoutMs)
await persistChapter(input, run.id, controller, lease)
await runPostQuality(input, run.id, project, controller, lease, llmTimeoutMs)
await runStoryState(input, run.id, controller, lease, llmTimeoutMs)
```

- [ ] **Step 4: Parameterize the abort timer and all provider calls**

Change the timeout wrapper to accept the snapshotted value:

```ts
async function withLlmTimeout<T>(
  controller: AbortController,
  timeoutMs: number,
  operation: () => Promise<T>,
): Promise<T> {
  if (controller.signal.aborted) throw signalReason(controller.signal)
  let removeAbortListener = () => {}
  const aborted = new Promise<never>((_resolve, reject) => {
    const onAbort = () => reject(signalReason(controller.signal))
    controller.signal.addEventListener('abort', onAbort, { once: true })
    removeAbortListener = () => controller.signal.removeEventListener('abort', onAbort)
  })
  const timer = deps.setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(revisionError(
        'REVISION_LLM_TIMEOUT',
        `editor revision model call timed out after ${Math.trunc(timeoutMs / 1_000)} seconds`,
      ))
    }
  }, timeoutMs)
  try {
    return await Promise.race([operation(), aborted])
  } finally {
    removeAbortListener()
    deps.clearTimeout(timer)
  }
}
```

Add `llmTimeoutMs: number` to `generateAndAdmit`, `runPostQuality`, and `runStoryState`. Update candidate generation to use:

```ts
const result = await withLlmTimeout(controller, llmTimeoutMs, () => deps.executeRevision('prose-agent', project, {
  task: request.prompt,
}, {
  activeWorkspace: activeWorkspace!,
  modelId: input.model_id ? String(input.model_id) : undefined,
  maxTokens: request.maxTokens,
  temperature: request.temperature,
  responseMode: 'stream',
  skipMemory: true,
  signal: controller.signal,
  timeoutMs: llmTimeoutMs,
  maxRetries: 1,
}))
```

Update post-quality review to use:

```ts
const quality = await withLlmTimeout(controller, llmTimeoutMs, () => deps.createQualityReview(
  ctx,
  activeWorkspace!,
  project,
  chapter,
  {
    source: 'post_revision',
    source_review_id: input.review_id,
    source_run_id: runId,
    candidate_hash: checkpoint.candidate!.hash,
    current_chapter_only: true,
    signal: controller.signal,
    timeoutMs: llmTimeoutMs,
    maxRetries: 1,
    workerLease: { runId, owner: leaseOwner },
  },
))
```

Update Story State preparation to use:

```ts
const preparedResult = await withLlmTimeout(controller, llmTimeoutMs, () => deps.prepareStoryState(ctx, {
  workspace: activeWorkspace!,
  projectId: input.project_id,
  chapterId: input.chapter_id,
  modelId: input.model_id,
  receipt,
  signal: controller.signal,
  timeoutMs: llmTimeoutMs,
  maxRetries: 1,
}))
```

Update Story State application to use:

```ts
const applied = await withLlmTimeout(controller, llmTimeoutMs, () => deps.applyStoryState(ctx, {
  workspace: activeWorkspace!,
  projectId: input.project_id,
  chapterId: input.chapter_id,
  modelId: input.model_id,
  receipt,
  prepared: preparedForApply(prepared, receipt),
  signal: controller.signal,
  timeoutMs: llmTimeoutMs,
  maxRetries: 1,
  workerLease: { runId, owner: leaseOwner },
}))
```

Do not change `maxRetries`, phase ordering, chapter scope, or persistence behavior.

- [ ] **Step 5: Run worker and checkpoint tests**

Run:

```bash
cd ui/server && bun test \
  src/novel/editor-revision-runtime-config.test.ts \
  src/routes/novel-editor/revision-worker.test.ts
```

Expected: PASS, including the exact 600-second abort test, all four 420-second provider calls, recovery reuse, and post-quality persistence semantics.

- [ ] **Step 6: Commit the worker integration**

```bash
git add \
  ui/server/src/routes/novel-editor/revision-worker.ts \
  ui/server/src/routes/novel-editor/revision-worker.test.ts
git commit -m "fix(novel): allow 600 second editor revisions"
```

### Task 5: Add “更多 → 项目设置” and the timeout control

**Files:**
- Create: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Create: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx`

- [ ] **Step 1: Write failing helper and wiring tests**

Create `ProjectSettingsModal.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildEditorRevisionConfigPayload,
  isEditorRevisionTimeoutValid,
  normalizeProjectEditorRevisionTimeout,
} from './ProjectSettingsModal'

describe('project settings editor revision timeout', () => {
  test('hydrates defaults and builds the dedicated API payload', () => {
    expect(normalizeProjectEditorRevisionTimeout(undefined)).toBe(600)
    expect(normalizeProjectEditorRevisionTimeout(420.9)).toBe(420)
    expect(normalizeProjectEditorRevisionTimeout(900)).toBe(600)
    expect(buildEditorRevisionConfigPayload(420)).toEqual({
      config: { timeout_seconds: 420 },
    })
  })

  test('rejects blank, fractional, and out-of-range user input', () => {
    expect(isEditorRevisionTimeoutValid(null)).toBe(false)
    expect(isEditorRevisionTimeoutValid(59)).toBe(false)
    expect(isEditorRevisionTimeoutValid(420.5)).toBe(false)
    expect(isEditorRevisionTimeoutValid(600)).toBe(true)
    expect(() => buildEditorRevisionConfigPayload(601)).toThrow('invalid editor revision timeout')
  })

  test('wires project settings into the top-bar menu and dedicated endpoints', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    const topbar = readFileSync(join(import.meta.dir, 'shell/workspace-topbar.tsx'), 'utf8')
    expect(topbar).toContain("label: '项目设置'")
    expect(topbar).toContain('<ProjectSettingsModal')
    expect(modal).toContain('/editor-revision-config')
    expect(modal).toContain('单次模型调用超时')
    expect(modal).toContain('min={60}')
    expect(modal).toContain('max={600}')
  })
})
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: FAIL because the modal module does not exist.

- [ ] **Step 3: Implement the modal helpers and request lifecycle**

Create `ProjectSettingsModal.tsx` with exported pure helpers and a focused modal:

```tsx
import React, { useEffect, useState } from 'react'
import { Button, InputNumber, Modal, Space, Typography, message } from 'antd'
import apiClient from '../../api/client'

const { Text } = Typography
const MIN_TIMEOUT_SECONDS = 60
const MAX_TIMEOUT_SECONDS = 600
const DEFAULT_TIMEOUT_SECONDS = 600

export function normalizeProjectEditorRevisionTimeout(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_TIMEOUT_SECONDS
  return Math.min(MAX_TIMEOUT_SECONDS, Math.max(MIN_TIMEOUT_SECONDS, Math.trunc(value)))
}

export function isEditorRevisionTimeoutValid(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_TIMEOUT_SECONDS
    && value <= MAX_TIMEOUT_SECONDS
}

export function buildEditorRevisionConfigPayload(value: unknown) {
  if (!isEditorRevisionTimeoutValid(value)) throw new Error('invalid editor revision timeout')
  return { config: { timeout_seconds: value } }
}

export function ProjectSettingsModal({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: number
  onClose: () => void
}) {
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(DEFAULT_TIMEOUT_SECONDS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return
    let active = true
    setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS)
    setLoading(true)
    apiClient.get(`/novel/projects/${projectId}/editor-revision-config`)
      .then(response => {
        if (active) setTimeoutSeconds(normalizeProjectEditorRevisionTimeout(
          response.data?.config?.timeout_seconds,
        ))
      })
      .catch(error => {
        if (active) message.error(error?.response?.data?.error || '项目设置加载失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [open, projectId])

  const save = async () => {
    if (!isEditorRevisionTimeoutValid(timeoutSeconds)) return
    setSaving(true)
    try {
      await apiClient.put(
        `/novel/projects/${projectId}/editor-revision-config`,
        buildEditorRevisionConfigPayload(timeoutSeconds),
      )
      message.success('项目设置已保存')
      onClose()
    } catch (error: any) {
      message.error(error?.response?.data?.error || '项目设置保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="项目设置"
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={loading || !isEditorRevisionTimeoutValid(timeoutSeconds)}
          onClick={save}
        >
          保存
        </Button>,
      ]}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>质检与修订</Text>
        <Space align="center" wrap>
          <Text>单次模型调用超时</Text>
          <InputNumber
            min={60}
            max={600}
            precision={0}
            value={timeoutSeconds}
            onChange={value => setTimeoutSeconds(value)}
            addonAfter="秒"
            disabled={loading}
          />
        </Space>
        <Text type="secondary">
          每个模型阶段最多等待该时长；一次修订包含多个阶段，总耗时可能更长。
        </Text>
      </Space>
    </Modal>
  )
}
```

The error path deliberately does not close the modal or replace `timeoutSeconds`, so failed saves preserve the user's input.

- [ ] **Step 4: Add the top-bar menu entry and modal ownership**

Update the React import, add `SettingOutlined` to the existing `@ant-design/icons` named import, and import the modal in `workspace-topbar.tsx`:

```tsx
import React, { useState } from 'react'
import { ProjectSettingsModal } from '../ProjectSettingsModal'
```

Inside `NovelWorkspaceTopBar`, add local modal state:

```tsx
const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
```

Add this item before the final divider in `moreMenuItems`:

```tsx
{
  key: 'projectSettings',
  icon: <SettingOutlined />,
  label: '项目设置',
  onClick: () => setProjectSettingsOpen(true),
},
```

Render the modal next to the top-bar root element inside the existing fragment:

```tsx
<ProjectSettingsModal
  open={projectSettingsOpen}
  projectId={Number(selectedProject?.id || 0)}
  onClose={() => setProjectSettingsOpen(false)}
/>
```

- [ ] **Step 5: Run the focused UI test and web build**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
cd ../..
bun run build:web
```

Expected: 3 PASS and a successful Vite production build.

- [ ] **Step 6: Commit the project settings UI**

```bash
git add \
  ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx \
  ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts \
  ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx
git commit -m "feat(novel): add revision timeout project setting"
```

### Task 6: Run integrated regression and visual verification

**Files:**
- Verify only; no planned source changes.
- Preserve: `workspace/novel.sqlite`
- Preserve: `workspace/assets.json`
- Preserve: `workspace/zhuque-inputs/`
- Preserve: `workspace/zhuque-reports/`

- [ ] **Step 1: Run all focused server tests together**

Run:

```bash
cd ui/server && bun test \
  src/novel/editor-revision-runtime-config.test.ts \
  src/routes/novel-project-config-routes.test.ts \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-editor/revision-candidate-admission.test.ts
```

Expected: PASS with no timeout, checkpoint, JSON recovery, cancellation, lease, or persistence regression.

- [ ] **Step 2: Run focused web tests and both builds**

Run:

```bash
cd ui/web && bun test \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts \
  src/pages/novel-workspace/workspaceUiShell.b-b.test.ts
cd ../..
bun run build:server
bun run build:web
```

Expected: all selected tests PASS and both builds exit 0.

- [ ] **Step 3: Check formatting and repository scope**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors. Only the pre-existing user-owned `workspace/` paths may remain modified or untracked; `workspace/novel.sqlite` must not appear as changed.

- [ ] **Step 4: Perform non-mutating browser QA**

Start or restart the local development server so the new server route is loaded. Open the existing local app, enter a novel workspace, then verify:

1. The top-right “更多” menu contains a settings icon and “项目设置”.
2. The modal opens without layout overlap on desktop and a mobile-width viewport.
3. The input displays `600 秒` for a legacy project with no stored setting.
4. Values below 60 or above 600 cannot be entered as a valid save value.
5. The explanation fits without clipping.

Do not click “保存” against the real workspace during verification; API mutation behavior is already covered by the temporary-workspace route test, and `workspace/novel.sqlite` must remain untouched.

- [ ] **Step 5: Report the effective behavior**

Report the focused test counts, both build results, visual QA result, commit hashes, and remaining user-owned worktree changes. State explicitly that new and retried single-chapter revisions default to 600 seconds per model call, while already-running tasks keep their checkpoint snapshot.
