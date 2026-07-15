# Novel Create Wizard UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the create-novel wizard UX into clear single-column zones with real SSE generation progress, while keeping the existing 6-step flow and foundation/score/genre capabilities.

**Architecture:** Backend project-seed derivation gains an `onProgress` callback and a new `POST /api/novel/project-seed/derive-stream` SSE endpoint. Frontend consumes the stream via `fetch` + reader, maps stages to a fixed 4-step progress panel, and splits `NovelCreateWizard.tsx` into focused `novel-entry/create/*` section components with concise copy.

**Tech Stack:** Bun/Express (server), React + Ant Design + Vite (web), existing `apiClient` base URL, SSE via `text/event-stream` (same style as prose generate-stream).

**Spec:** `docs/superpowers/specs/2026-07-15-novel-create-wizard-ui-redesign-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `ui/server/src/routes/novel-project-seed-progress.ts` | Shared stage types, labels, progress mapping helpers |
| `ui/server/src/routes/novel-core-routes.ts` | Wire `onProgress` through derive/expand/first30; add `derive-stream` route |
| `ui/server/src/routes/novel-core-routes.test.ts` | Progress + stream contract tests |
| `ui/web/src/components/novel-entry/create/projectSeedStreamTypes.ts` | Shared stage constants / types |
| `ui/web/src/components/novel-entry/create/useProjectSeedStream.ts` | POST SSE client |
| `ui/web/src/components/novel-entry/create/GenerationProgressPanel.tsx` | 4-step progress UI |
| `ui/web/src/components/novel-entry/create/CreateModeSection.tsx` | Mode picker |
| `ui/web/src/components/novel-entry/create/GenreGuideSection.tsx` | Genre chips |
| `ui/web/src/components/novel-entry/create/SeedInputSection.tsx` | Title/idea/model/generate |
| `ui/web/src/components/novel-entry/create/SeedStatusBar.tsx` | Counts, score summary, primary actions |
| `ui/web/src/components/novel-entry/create/DeepDraftReviewSection.tsx` | Review editors |
| `ui/web/src/components/novel-entry/create/CreateStepHeader.tsx` | Step 1–4 header + completion tags |
| `ui/web/src/components/novel-entry/create/CreateSummaryCard.tsx` | Step 5 summary |
| `ui/web/src/components/novel-entry/create/createWizardCopy.ts` | Short labels only |
| `ui/web/src/components/NovelCreateWizard.tsx` | Shell: steps, navigation, state machine |
| `ui/web/src/components/novel-entry/create/*.test.ts(x)` | Unit tests for stream + progress mapping |

---

### Task 1: Progress types + pure helpers

**Files:**
- Create: `ui/server/src/routes/novel-project-seed-progress.ts`
- Create: `ui/server/src/routes/novel-project-seed-progress.test.ts`

- [ ] **Step 1: Write failing tests for stage helpers**

```ts
// ui/server/src/routes/novel-project-seed-progress.test.ts
import { describe, expect, test } from 'bun:test'
import {
  PROJECT_SEED_UI_STEPS,
  mapBackendStageToUiStep,
  buildProjectSeedStageEvent,
  clampProgress,
} from './novel-project-seed-progress'

describe('project seed progress helpers', () => {
  test('maps backend stages onto fixed UI steps', () => {
    expect(mapBackendStageToUiStep('skeleton')).toBe(0)
    expect(mapBackendStageToUiStep('outlines')).toBe(1)
    expect(mapBackendStageToUiStep('volumes')).toBe(1)
    expect(mapBackendStageToUiStep('foreshadowing')).toBe(2)
    expect(mapBackendStageToUiStep('assemble')).toBe(3)
  })

  test('builds stage events with clamped progress and labels', () => {
    const event = buildProjectSeedStageEvent({
      stage: 'outlines',
      status: 'running',
      progress: 1.4,
      detail: 'pass_a2 chapters=12',
      outline_chapter_count: 12,
    })
    expect(event.type).toBe('stage')
    expect(event.stage).toBe('outlines')
    expect(event.ui_step).toBe(1)
    expect(event.label).toBe(PROJECT_SEED_UI_STEPS[1])
    expect(event.progress).toBe(1)
    expect(event.detail).toContain('pass_a2')
    expect(clampProgress(-1)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui/server && bun test src/routes/novel-project-seed-progress.test.ts`  
Expected: FAIL module not found / export missing

- [ ] **Step 3: Implement helpers**

```ts
// ui/server/src/routes/novel-project-seed-progress.ts
export const PROJECT_SEED_UI_STEPS = [
  '整理故事骨架',
  '生成分卷与前30章细纲',
  '生成伏笔计划',
  '汇总审阅材料',
] as const

export type ProjectSeedBackendStage =
  | 'skeleton'
  | 'outlines'
  | 'volumes'
  | 'foreshadowing'
  | 'assemble'

export type ProjectSeedStageStatus = 'running' | 'completed' | 'error'

export type ProjectSeedProgressEvent = {
  type: 'stage'
  stage: ProjectSeedBackendStage
  status: ProjectSeedStageStatus
  ui_step: number
  label: string
  progress: number
  detail?: string
  outline_chapter_count?: number
  outline_volume_count?: number
  outline_foreshadowing_count?: number
  at: string
}

export type ProjectSeedProgressReporter = (event: ProjectSeedProgressEvent) => void

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function mapBackendStageToUiStep(stage: ProjectSeedBackendStage): number {
  switch (stage) {
    case 'skeleton':
      return 0
    case 'outlines':
    case 'volumes':
      return 1
    case 'foreshadowing':
      return 2
    case 'assemble':
      return 3
    default:
      return 0
  }
}

export function buildProjectSeedStageEvent(input: {
  stage: ProjectSeedBackendStage
  status: ProjectSeedStageStatus
  progress: number
  detail?: string
  outline_chapter_count?: number
  outline_volume_count?: number
  outline_foreshadowing_count?: number
  label?: string
}): ProjectSeedProgressEvent {
  const ui_step = mapBackendStageToUiStep(input.stage)
  return {
    type: 'stage',
    stage: input.stage,
    status: input.status,
    ui_step,
    label: input.label || PROJECT_SEED_UI_STEPS[ui_step],
    progress: clampProgress(input.progress),
    detail: input.detail,
    outline_chapter_count: input.outline_chapter_count,
    outline_volume_count: input.outline_volume_count,
    outline_foreshadowing_count: input.outline_foreshadowing_count,
    at: new Date().toISOString(),
  }
}

export function sseData(value: any) {
  return `data: ${JSON.stringify(value)}\n\n`
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd ui/server && bun test src/routes/novel-project-seed-progress.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-project-seed-progress.ts ui/server/src/routes/novel-project-seed-progress.test.ts
git commit -m "feat(novel): add project-seed progress stage helpers"
```

---

### Task 2: Thread `onProgress` through outline generation

**Files:**
- Modify: `ui/server/src/routes/novel-core-routes.ts` (`generateProjectSeedFirst30OutlinesWithModel`, `ensureProjectSeedModelOutlines`, `deriveProjectSeedWithModel`, `expandThinProjectSeedWithModel`)
- Test: `ui/server/src/routes/novel-core-routes.test.ts`

- [ ] **Step 1: Add a unit test that spies progress callbacks from a mocked outline generator path**

Because full LLM calls are heavy, test a thin exported wrapper or inject reporter into pure emit points:

```ts
// append to novel-core-routes.test.ts
test('buildProjectSeedStageEvent sequence for first30 passes is ordered', async () => {
  const { buildProjectSeedStageEvent } = await import('./novel-project-seed-progress')
  const events = [
    buildProjectSeedStageEvent({ stage: 'outlines', status: 'running', progress: 0.35, detail: 'pass_a' }),
    buildProjectSeedStageEvent({ stage: 'outlines', status: 'running', progress: 0.55, detail: 'pass_a2' }),
    buildProjectSeedStageEvent({ stage: 'volumes', status: 'completed', progress: 0.65, outline_volume_count: 3 }),
    buildProjectSeedStageEvent({ stage: 'foreshadowing', status: 'completed', progress: 0.8, outline_foreshadowing_count: 6 }),
  ]
  expect(events.map(e => e.ui_step)).toEqual([1, 1, 1, 2])
  expect(events.at(-1)?.stage).toBe('foreshadowing')
})
```

- [ ] **Step 2: Update function signatures to accept optional reporter**

In `novel-core-routes.ts`:

```ts
import {
  buildProjectSeedStageEvent,
  type ProjectSeedProgressReporter,
} from './novel-project-seed-progress'

// helper used inside long functions
function reportProgress(onProgress: ProjectSeedProgressReporter | undefined, eventInput: Parameters<typeof buildProjectSeedStageEvent>[0]) {
  if (!onProgress) return
  try {
    onProgress(buildProjectSeedStageEvent(eventInput))
  } catch {
    // never break generation because UI progress failed
  }
}
```

- [ ] **Step 3: Emit progress in `generateProjectSeedFirst30OutlinesWithModel`**

Add last arg `onProgress?: ProjectSeedProgressReporter` and emit:

```ts
reportProgress(onProgress, { stage: 'outlines', status: 'running', progress: 0.3, detail: 'pass_a start' })
// after Pass A parse:
reportProgress(onProgress, {
  stage: 'outlines',
  status: modelChapters.length ? 'running' : 'running',
  progress: 0.45,
  detail: `pass_a chapters=${modelChapters.length} volumes=${modelVolumes.length}`,
  outline_chapter_count: modelChapters.length,
  outline_volume_count: modelVolumes.length,
})
// before/after A2, A3, B similarly with progress 0.55 / 0.65 / 0.8
// end:
reportProgress(onProgress, {
  stage: 'foreshadowing',
  status: 'completed',
  progress: 0.85,
  outline_chapter_count: chapterCount,
  outline_volume_count: volumeCount,
  outline_foreshadowing_count: asSeedArray(nextSeed.foreshadowing_plan).length,
})
```

- [ ] **Step 4: Pass reporter through `ensureProjectSeedModelOutlines` → generator**

```ts
async function ensureProjectSeedModelOutlines(..., onProgress?: ProjectSeedProgressReporter) {
  ...
  const generated = await generateProjectSeedFirst30OutlinesWithModel(..., onProgress)
  ...
}
```

- [ ] **Step 5: Emit skeleton/assemble around `deriveProjectSeedWithModel` and expand/ensure**

```ts
async function deriveProjectSeedWithModel(..., onProgress?: ProjectSeedProgressReporter) {
  reportProgress(onProgress, { stage: 'skeleton', status: 'running', progress: 0.08 })
  ...
  reportProgress(onProgress, { stage: 'skeleton', status: 'completed', progress: 0.22 })
  return { seed, result }
}
```

In `/project-seed/derive` handler and the new stream handler, after ensure outlines:

```ts
reportProgress(onProgress, { stage: 'assemble', status: 'running', progress: 0.92 })
// attach diagnostics / director
reportProgress(onProgress, { stage: 'assemble', status: 'completed', progress: 1 })
```

Update every internal `ensureProjectSeedModelOutlines(...)` call site in derive/auto-create/expand paths to forward `onProgress` when available (default `undefined` keeps non-stream behavior).

- [ ] **Step 6: Run focused tests**

Run: `cd ui/server && bun test src/routes/novel-core-routes.test.ts src/routes/novel-project-seed-progress.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add ui/server/src/routes/novel-core-routes.ts ui/server/src/routes/novel-core-routes.test.ts
git commit -m "feat(novel): emit project-seed generation progress stages"
```

---

### Task 3: Add `derive-stream` SSE route

**Files:**
- Modify: `ui/server/src/routes/novel-core-routes.ts` (`registerNovelCoreRoutes`)
- Modify: `ui/server/src/routes/novel-core-routes.test.ts`

- [ ] **Step 1: Write route contract test (supertest-style if already used; otherwise source/contract test)**

If the suite already boots an app for seed routes, add:

```ts
test('derive-stream route writes stage and result SSE frames', async () => {
  // Prefer mocking derive core with a local function injection if available.
  // Minimum source contract if full HTTP harness is too heavy:
  const source = await Bun.file(new URL('./novel-core-routes.ts', import.meta.url)).text()
  expect(source).toContain("/api/novel/project-seed/derive-stream")
  expect(source).toContain("text/event-stream")
  expect(source).toContain("type: 'result'")
  expect(source).toContain('reportProgress')
})
```

Prefer a real HTTP test if `registerNovelCoreRoutes` tests already construct `express()` + mock workspace. Follow the nearest existing seed route test pattern in the same file.

- [ ] **Step 2: Implement route next to `/project-seed/derive`**

```ts
import { sseData, type ProjectSeedProgressReporter } from './novel-project-seed-progress'

app.post('/api/novel/project-seed/derive-stream', async (req, res) => {
  const activeWorkspace = getWorkspace()
  await ensureWorkspaceStructure(activeWorkspace)
  const idea = String(req.body?.idea || '').trim()
  const title = String(req.body?.title || '').trim()
  const lengthTarget = normalizeLengthTarget(req.body?.length_target) || 'medium'
  const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
  if (!idea && !title) return res.status(400).json({ error: 'title or idea is required' })
  if (!modelId) return res.status(400).json({ error: 'model_id is required' })

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  let closed = false
  const markClosed = () => { closed = true }
  req.on('close', markClosed)
  res.on('close', markClosed)

  const writeEvent = (payload: any) => {
    if (closed || res.writableEnded) return
    res.write(sseData(payload))
  }

  const onProgress: ProjectSeedProgressReporter = (event) => writeEvent(event)
  const heartbeat = setInterval(() => {
    if (closed || res.writableEnded) return
    try { res.write(': mangaforge-project-seed-heartbeat\n\n') } catch { closed = true }
  }, 15000)

  try {
    // Reuse the same control flow as /derive, but pass onProgress into derive/expand/ensure.
    let { seed, result } = await deriveProjectSeedWithModel(activeWorkspace, idea, modelId, title, lengthTarget, onProgress)
    seed = stripLocalScaffoldOutlines(seed)
    let seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, buildProjectSeedDiagnostics(seed, idea, result))
    const needsExpansion = !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed) || projectSeedNeedsOutlineExpansion(seed)
    if (needsExpansion) {
      const recovered = await expandThinProjectSeedWithModel(activeWorkspace, seed, result, idea, modelId, title, lengthTarget, onProgress)
      seed = stripLocalScaffoldOutlines(recovered.seed)
      result = recovered.result
      seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, recovered.seed_diagnostics)
    }
    if (projectSeedNeedsOutlineExpansion(seed)) {
      const outlined = await ensureProjectSeedModelOutlines(activeWorkspace, seed, idea, modelId, title, lengthTarget, result, onProgress)
      seed = stripLocalScaffoldOutlines(outlined.seed)
      result = outlined.result || result
      seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, outlined.seed_diagnostics)
    }
    reportProgress(onProgress, { stage: 'assemble', status: 'running', progress: 0.92 })
    if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed)) {
      writeEvent({
        type: 'error',
        message: (result as any)?.error || '模型返回的项目种子仍不足',
        seed,
        seed_diagnostics: seedDiagnostics,
      })
      return res.end()
    }
    seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, seedDiagnostics || seed.seed_diagnostics)
    seed = attachProjectSeedDirector({ ...seed, seed_diagnostics: seedDiagnostics })
    reportProgress(onProgress, {
      stage: 'assemble',
      status: 'completed',
      progress: 1,
      outline_chapter_count: Array.isArray(seed.chapter_outlines) ? seed.chapter_outlines.length : 0,
      outline_volume_count: Array.isArray(seed.volume_outlines) ? seed.volume_outlines.length : 0,
      outline_foreshadowing_count: Array.isArray(seed.foreshadowing_plan) ? seed.foreshadowing_plan.length : 0,
    })
    writeEvent({ type: 'result', ok: true, seed, result, seed_diagnostics: seedDiagnostics })
    res.end()
  } catch (error) {
    writeEvent({ type: 'error', message: String(error) })
    if (!res.writableEnded) res.end()
  } finally {
    clearInterval(heartbeat)
    req.off('close', markClosed)
    res.off('close', markClosed)
  }
})
```

Keep `/project-seed/derive` behavior unchanged (no stream headers).

- [ ] **Step 3: Run tests**

Run: `cd ui/server && bun test src/routes/novel-core-routes.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add ui/server/src/routes/novel-core-routes.ts ui/server/src/routes/novel-core-routes.test.ts
git commit -m "feat(novel): add project-seed derive-stream SSE endpoint"
```

---

### Task 4: Frontend stream client

**Files:**
- Create: `ui/web/src/components/novel-entry/create/projectSeedStreamTypes.ts`
- Create: `ui/web/src/components/novel-entry/create/useProjectSeedStream.ts`
- Create: `ui/web/src/components/novel-entry/create/useProjectSeedStream.test.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, test } from 'bun:test'
import { parseProjectSeedSseChunk, reduceProjectSeedStreamState, PROJECT_SEED_UI_STEPS } from './useProjectSeedStream'

describe('project seed SSE client helpers', () => {
  test('parses data frames into events', () => {
    const frames = parseProjectSeedSseChunk('data: {"type":"stage","stage":"skeleton","status":"running","ui_step":0,"label":"整理故事骨架","progress":0.1}\n\n')
    expect(frames[0].type).toBe('stage')
    expect((frames[0] as any).ui_step).toBe(0)
  })

  test('reduces stage events into 4-step UI state', () => {
    let state = reduceProjectSeedStreamState(undefined, {
      type: 'stage',
      stage: 'outlines',
      status: 'running',
      ui_step: 1,
      label: PROJECT_SEED_UI_STEPS[1],
      progress: 0.4,
      detail: 'pass_a',
    } as any)
    expect(state.steps[0].status).toBe('completed')
    expect(state.steps[1].status).toBe('running')
    expect(state.progress).toBe(0.4)
    state = reduceProjectSeedStreamState(state, {
      type: 'result',
      ok: true,
      seed: { title: 'x' },
      seed_diagnostics: { status: 'ready' },
    } as any)
    expect(state.done).toBe(true)
    expect(state.seed?.title).toBe('x')
  })
})
```

- [ ] **Step 2: Implement types + helpers + hook**

```ts
// projectSeedStreamTypes.ts
export const PROJECT_SEED_UI_STEPS = [
  '整理故事骨架',
  '生成分卷与前30章细纲',
  '生成伏笔计划',
  '汇总审阅材料',
] as const

export type StreamStepStatus = 'pending' | 'running' | 'completed' | 'error'

export type ProjectSeedStreamStep = {
  key: string
  label: string
  status: StreamStepStatus
  detail?: string
}

export type ProjectSeedStreamState = {
  progress: number
  steps: ProjectSeedStreamStep[]
  currentLabel: string
  done: boolean
  error?: string
  seed?: any
  seed_diagnostics?: any
}
```

```ts
// useProjectSeedStream.ts
import { useCallback, useRef, useState } from 'react'
import { PROJECT_SEED_UI_STEPS, type ProjectSeedStreamState, type ProjectSeedStreamStep } from './projectSeedStreamTypes'

const apiBase = () => String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '')

export function createInitialProjectSeedStreamState(): ProjectSeedStreamState {
  return {
    progress: 0,
    currentLabel: PROJECT_SEED_UI_STEPS[0],
    done: false,
    steps: PROJECT_SEED_UI_STEPS.map((label, index) => ({
      key: `step-${index}`,
      label,
      status: 'pending' as const,
    })),
  }
}

export function parseProjectSeedSseChunk(chunk: string) {
  const events: any[] = []
  const parts = String(chunk || '').split('\n\n')
  for (const part of parts) {
    const line = part
      .split('\n')
      .map(item => item.trim())
      .find(item => item.startsWith('data:'))
    if (!line) continue
    const raw = line.slice(5).trim()
    if (!raw || raw === '[DONE]') continue
    try {
      events.push(JSON.parse(raw))
    } catch {
      // ignore malformed
    }
  }
  return events
}

export function reduceProjectSeedStreamState(prev: ProjectSeedStreamState | undefined, event: any): ProjectSeedStreamState {
  const base = prev || createInitialProjectSeedStreamState()
  if (event?.type === 'stage') {
    const uiStep = Number(event.ui_step || 0)
    const steps: ProjectSeedStreamStep[] = base.steps.map((step, index) => {
      if (index < uiStep) return { ...step, status: 'completed' }
      if (index === uiStep) {
        return {
          ...step,
          status: event.status === 'error' ? 'error' : event.status === 'completed' ? 'completed' : 'running',
          detail: event.detail || step.detail,
          label: event.label || step.label,
        }
      }
      return step
    })
    return {
      ...base,
      progress: Number(event.progress || base.progress || 0),
      currentLabel: event.label || base.currentLabel,
      steps,
      done: false,
      error: event.status === 'error' ? String(event.detail || event.message || '生成失败') : undefined,
    }
  }
  if (event?.type === 'result') {
    return {
      ...base,
      progress: 1,
      done: true,
      seed: event.seed,
      seed_diagnostics: event.seed_diagnostics,
      steps: base.steps.map(step => ({ ...step, status: 'completed' })),
      currentLabel: '完成',
    }
  }
  if (event?.type === 'error') {
    return {
      ...base,
      done: true,
      error: String(event.message || event.error || '生成失败'),
      seed: event.seed,
      seed_diagnostics: event.seed_diagnostics,
    }
  }
  return base
}

export function useProjectSeedStream() {
  const [state, setState] = useState<ProjectSeedStreamState>(() => createInitialProjectSeedStreamState())
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(async (body: Record<string, any>) => {
    cancel()
    const controller = new AbortController()
    abortRef.current = controller
    setState(createInitialProjectSeedStreamState())
    const response = await fetch(`${apiBase()}/novel/project-seed/derive-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '')
      const next = reduceProjectSeedStreamState(undefined, {
        type: 'error',
        message: text || `HTTP ${response.status}`,
      })
      setState(next)
      return next
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let latest = createInitialProjectSeedStreamState()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const pieces = buffer.split('\n\n')
      buffer = pieces.pop() || ''
      for (const piece of pieces) {
        for (const event of parseProjectSeedSseChunk(`${piece}\n\n`)) {
          latest = reduceProjectSeedStreamState(latest, event)
          setState(latest)
        }
      }
    }
    if (buffer.trim()) {
      for (const event of parseProjectSeedSseChunk(`${buffer}\n\n`)) {
        latest = reduceProjectSeedStreamState(latest, event)
        setState(latest)
      }
    }
    if (!latest.done && !latest.error) {
      latest = { ...latest, done: true }
      setState(latest)
    }
    return latest
  }, [cancel])

  return { state, start, cancel, setState }
}
```

- [ ] **Step 3: Run tests**

Run: `cd ui/web && bun test src/components/novel-entry/create/useProjectSeedStream.test.ts`  
If web package has no bun test config, run from repo with bun path resolution:

`cd /Users/ruiyaosong/MangaForge-Studio && bun test ui/web/src/components/novel-entry/create/useProjectSeedStream.test.ts`  

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/components/novel-entry/create/projectSeedStreamTypes.ts ui/web/src/components/novel-entry/create/useProjectSeedStream.ts ui/web/src/components/novel-entry/create/useProjectSeedStream.test.ts
git commit -m "feat(novel): add project-seed SSE stream client"
```

---

### Task 5: Generation progress panel + compact copy module

**Files:**
- Create: `ui/web/src/components/novel-entry/create/GenerationProgressPanel.tsx`
- Create: `ui/web/src/components/novel-entry/create/createWizardCopy.ts`
- Create: `ui/web/src/components/novel-entry/create/GenerationProgressPanel.test.tsx` (optional render-less logic test if no RTL; otherwise snapshot helpers)

- [ ] **Step 1: Implement copy constants (no long teaching text)**

```ts
// createWizardCopy.ts
export const CREATE_MODE_LABELS = {
  manual: { title: '手动开书', hint: '先建项目' },
  quick_ai: { title: 'AI 快速', hint: '一键整理' },
  deep_draft: { title: '深度孵化', hint: '生成后修订' },
} as const

export const STEP0_SECTION_TITLES = {
  mode: '创建方式',
  genre: '类型',
  input: '输入',
  status: '结果状态',
  progress: '生成进度',
  review: '审阅编辑',
} as const
```

- [ ] **Step 2: Implement progress panel**

```tsx
// GenerationProgressPanel.tsx
import { Progress, Space, Typography } from 'antd'
import type { ProjectSeedStreamState } from './projectSeedStreamTypes'

const { Text } = Typography

export function GenerationProgressPanel({ state }: { state: ProjectSeedStreamState }) {
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>正在生成详细草稿</Text>
        <Progress percent={Math.round((state.progress || 0) * 100)} showInfo size="small" />
        <div style={{ display: 'grid', gap: 6 }}>
          {state.steps.map(step => {
            const mark = step.status === 'completed' ? '✅' : step.status === 'running' ? '⏳' : step.status === 'error' ? '❌' : '○'
            const color = step.status === 'running' ? '#1677ff' : step.status === 'error' ? '#ef4444' : step.status === 'pending' ? '#94a3b8' : undefined
            return (
              <div key={step.key} style={{ color, fontWeight: step.status === 'running' ? 700 : 400, fontSize: 12 }}>
                {mark} {step.label}
                {step.detail ? <div style={{ color: '#64748b', fontWeight: 400, marginLeft: 18 }}>{step.detail}</div> : null}
              </div>
            )
          })}
        </div>
        {state.error ? <Text type="danger">{state.error}</Text> : null}
      </Space>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/components/novel-entry/create/GenerationProgressPanel.tsx ui/web/src/components/novel-entry/create/createWizardCopy.ts
git commit -m "feat(novel): add generation progress panel and compact create copy"
```

---

### Task 6: Extract Step 0 section components

**Files:**
- Create: `ui/web/src/components/novel-entry/create/CreateModeSection.tsx`
- Create: `ui/web/src/components/novel-entry/create/GenreGuideSection.tsx`
- Create: `ui/web/src/components/novel-entry/create/SeedInputSection.tsx`
- Create: `ui/web/src/components/novel-entry/create/SeedStatusBar.tsx`
- Create: `ui/web/src/components/novel-entry/create/DeepDraftReviewSection.tsx`
- Modify: `ui/web/src/components/NovelCreateWizard.tsx`

- [ ] **Step 1: Move JSX blocks out of wizard with props-only interfaces**

Each component receives only what it needs. Example interfaces:

```ts
// CreateModeSection.tsx
export function CreateModeSection(props: {
  value: 'manual' | 'quick_ai' | 'deep_draft'
  onChange: (mode: 'manual' | 'quick_ai' | 'deep_draft') => void
}) { /* short cards from CREATE_MODE_LABELS, no long descriptions */ }

// GenreGuideSection.tsx
export function GenreGuideSection(props: {
  groups: Array<{ category: string; items: Array<{ framework: string }> }>
  selectedFramework?: string
  loading?: boolean
  onSelect: (framework: string) => void
}) { /* chips only; no oh-story teaching paragraph */ }

// SeedInputSection.tsx
export function SeedInputSection(props: {
  title: string
  lengthTarget: string
  idea: string
  modelId?: number
  modelOptions: Array<{ value: number; label: string }>
  draftOptions: Array<{ value: number; label: string }>
  selectedDraftId?: number
  loading: boolean
  onTitleChange: (value: string) => void
  onLengthChange: (value: string) => void
  onIdeaChange: (value: string) => void
  onModelChange: (value?: number) => void
  onDraftChange: (value?: number) => void
  onGenerate: () => void
  onSaveDraft: () => void
  onLoadDraft: () => void
  onDeleteDraft: () => void
  generateLabel: string
}) { /* form fields + primary generate */ }

// SeedStatusBar.tsx
export function SeedStatusBar(props: {
  volumeCount: number
  chapterCount: number
  foreshadowingCount: number
  characterCount: number
  score?: { overall: number; grade: string; statusLabel: string; recommendCreate: boolean }
  diagnosticsSuggestion?: string
  onRegenerate: () => void
  onSaveDraft: () => void
  onFinalize: () => void
  finalizeLabel: string
}) { /* tags + compact actions; Alert only if suggestion/risk */ }

// DeepDraftReviewSection.tsx
export function DeepDraftReviewSection(props: {
  model: any
  onChange: (next: any) => void
}) { /* existing deep draft fields, ordered sections, no duplicate action buttons */ }
```

- [ ] **Step 2: Replace Step 0 body in `NovelCreateWizard.tsx` with section composition**

Order:

1. `CreateModeSection`
2. `GenreGuideSection`
3. `SeedInputSection`
4. if generating → `GenerationProgressPanel` else if seed → `SeedStatusBar` (+ compact foundation score card if deep_draft)
5. if deep_draft && seed → `DeepDraftReviewSection`

Delete long Alert/description strings that only restate the section purpose.

- [ ] **Step 3: Wire generate handler to stream client**

```ts
const seedStream = useProjectSeedStream()

const deriveProjectSeed = async () => {
  // validation same as today
  setSeedLoading(true)
  try {
    const latest = await seedStream.start({
      idea: ideaWithGenre,
      title: data.title,
      model_id: seedModelId,
      length_target: data.length_target,
      genre_framework: activeGenreGuide?.framework || selectedGenreFramework || '',
    })
    if (latest.error && !latest.seed) {
      message.error(latest.error)
      return
    }
    const nextSeed = normalizeProjectSeedForUi(latest.seed || {})
    setSeed(nextSeed)
    setSeedDiagnostics(latest.seed_diagnostics || nextSeed.seed_diagnostics || null)
    applySeedToForm(nextSeed)
    ...
  } finally {
    setSeedLoading(false)
  }
}
```

- [ ] **Step 4: Manual compile check**

Run: `cd ui/web && bun run check`  
Expected: build succeeds (or only pre-existing unrelated errors)

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/components/novel-entry/create ui/web/src/components/NovelCreateWizard.tsx
git commit -m "feat(novel): restructure create wizard step0 into zoned components"
```

---

### Task 7: Step 1–5 headers + summary card

**Files:**
- Create: `ui/web/src/components/novel-entry/create/CreateStepHeader.tsx`
- Create: `ui/web/src/components/novel-entry/create/CreateSummaryCard.tsx`
- Modify: `ui/web/src/components/NovelCreateWizard.tsx`

- [ ] **Step 1: Implement header**

```tsx
export function CreateStepHeader(props: {
  title: string
  tags: Array<{ label: string; ok: boolean }>
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{props.title}</div>
      <Space wrap>
        {props.tags.map(tag => (
          <Tag key={tag.label} color={tag.ok ? 'green' : 'default'} bordered={false}>{tag.label}</Tag>
        ))}
      </Space>
    </div>
  )
}
```

- [ ] **Step 2: Implement summary card for Step 5**

Show: mode, genre/framework, score, volume/chapter/foreshadow counts, top risks (from foundation score), single primary create CTA already in footer.

- [ ] **Step 3: Apply headers in steps 1–4; remove duplicate coverage essay blocks**

Keep essential fields and seed-derived prefill. Replace multi-line helper essays with tags.

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/components/novel-entry/create/CreateStepHeader.tsx ui/web/src/components/novel-entry/create/CreateSummaryCard.tsx ui/web/src/components/NovelCreateWizard.tsx
git commit -m "feat(novel): unify create wizard step headers and summary card"
```

---

### Task 8: Foundation score integration cleanup + duplicate entry purge

**Files:**
- Modify: `ui/web/src/components/NovelCreateWizard.tsx`
- Modify: `ui/web/src/components/novel-entry/create/SeedStatusBar.tsx` if needed

- [ ] **Step 1: Keep one score surface**

In deep draft after generation:

- Compact score in `SeedStatusBar` or one foundation card under status zone
- Remove second/third duplicate score/alert blocks
- Keep explicit action: `我满意，以当前版本开书` only when score not recommendCreate

- [ ] **Step 2: Ensure outline-gap warning is single Alert driven by diagnostics**

Show only when `needs_model_outline` / chapterCount < 8, using diagnostics suggestion + counts (already partially present).

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/components/NovelCreateWizard.tsx ui/web/src/components/novel-entry/create
git commit -m "refactor(novel): dedupe create wizard status and score actions"
```

---

### Task 9: End-to-end verification

**Files:** none required beyond fixes found

- [ ] **Step 1: Server unit tests**

Run:

```bash
cd ui/server && bun test src/routes/novel-project-seed-progress.test.ts src/routes/novel-core-routes.test.ts
```

Expected: PASS

- [ ] **Step 2: Frontend unit tests**

Run:

```bash
bun test ui/web/src/components/novel-entry/create/useProjectSeedStream.test.ts
```

Expected: PASS

- [ ] **Step 3: Web build**

Run:

```bash
cd ui/web && bun run check
```

Expected: success

- [ ] **Step 4: Manual smoke (local app)**

1. Open 创建小说 → 深度孵化  
2. 选类型 + 创意 + 模型 → 生成详细草稿  
3. Confirm progress panel advances through 4 steps with live detail  
4. Confirm volumes/chapters/foreshadowing appear in status + review  
5. Walk steps 1–5; confirm no long teaching walls; create still works  
6. Switch 手动 / AI 快速 / 深度孵化 and confirm no state bleed  

- [ ] **Step 5: Final commit if fixes landed**

```bash
git add -A
git commit -m "test(novel): verify create wizard redesign acceptance paths"
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| Keep 6 steps | Task 6–7 (shell unchanged) |
| Step0 five zones | Task 6 |
| Remove teaching copy | Task 5–8 |
| SSE real progress | Task 1–4, 6 |
| 4 UI progress steps | Task 1, 4, 5 |
| Keep score/genre/outlines | Task 6–8 |
| No reinforce restore | N/A (out of scope) |
| Old `/derive` remains | Task 3 |
| Deduped actions | Task 8 |
| Tests + acceptance | Task 9 |

## Placeholder / consistency review

- No TBD steps  
- Progress event shape uses `type: 'stage' | 'result' | 'error'` consistently across server and client  
- UI step indices 0–3 match `PROJECT_SEED_UI_STEPS` on both sides  
- `onProgress` optional everywhere non-stream paths stay backward compatible  

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-novel-create-wizard-ui-redesign.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
