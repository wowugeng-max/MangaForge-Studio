# Novel Pipeline Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the novel workspace into a clear staged production pipeline without removing existing tools.

**Architecture:** Add a backend pipeline summary service that derives canonical stage status from existing project, chapter, review, and run data. Add a small frontend model and card component that renders the six-stage pipeline and routes each stage to existing workspace actions.

**Tech Stack:** Bun, Express, React, Ant Design, TypeScript, existing JSON novel store.

**Status 2026-06-21:** Implemented and verified the first full pipeline slice. The slice now also covers creation contract fields, writing-bible generation/materialization normalization, planning asset gates, explicit agent-step hints, delivery acceptance gates for quality review, editor report, revision, recheck, and story-state sync, plus stricter batch-scaling/serial-governance gates for safe-batch evidence, failed batch runs, open repair queues, and longform trend evidence.

---

### Task 1: Backend Pipeline Summary Service

**Files:**
- Create: `ui/server/src/routes/novel-pipeline-service.ts`
- Test: `ui/server/src/routes/novel-pipeline-service.test.ts`

- [x] **Step 1: Write the failing service test**

```ts
import { describe, expect, test } from 'bun:test'
import { buildNovelPipelineSummary } from './novel-pipeline-service'

describe('novel pipeline summary', () => {
  test('blocks at creation contract when the writing bible is missing', () => {
    const summary = buildNovelPipelineSummary({
      project: { id: 1, title: '剑烛大荒', synopsis: '', reference_config: {} },
      chapters: [],
      outlines: [],
      reviews: [],
      runs: [],
    })

    expect(summary.current_stage).toBe('creation_contract')
    expect(summary.stages[0].status).toBe('blocked')
    expect(summary.stages[0].action.key).toBe('open_writing_bible')
  })

  test('moves to delivery acceptance when the next chapter has prose but lacks current quality review', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: { reader_promise: '每章都有破局爽点', current_volume_goal: '进入大荒门' },
          story_state: { last_updated_chapter: 0 },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
          chapter_summary: '主角入门。',
          conflict: '旧规压迫。',
          ending_hook: '荒门背后亮起血字。',
          chapter_text: '正文'.repeat(1200),
        },
      ],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      reviews: [],
      runs: [],
    })

    expect(summary.current_stage).toBe('delivery_acceptance')
    expect(summary.stages.find(stage => stage.key === 'delivery_acceptance')?.action.key).toBe('refresh_current_quality')
  })
})
```

- [x] **Step 2: Run the backend service test to verify RED**

Run: `bun test ui/server/src/routes/novel-pipeline-service.test.ts`

Expected: fail because `novel-pipeline-service.ts` does not exist.

- [x] **Step 3: Implement the service**

Create `buildNovelPipelineSummary(input)` with six stages:

```ts
export type NovelPipelineStageKey =
  | 'creation_contract'
  | 'planning_ready'
  | 'chapter_writing'
  | 'delivery_acceptance'
  | 'batch_scaling'
  | 'serial_governance'
```

Use existing data only. Do not call LLMs. Each stage returns `status`, `label`, `summary`, `checks`, and `action`.

Batch scaling and serial governance must treat production evidence, repair evidence, and trend evidence separately:

- `chapter_group_generation` / `batch_generate_prose` success counts as safe-batch production evidence.
- `longform_production_repair` and repair queue runs do not count as successful production evidence.
- Failed batch runs, failed batch chapters, active batch runs, or open longform repair tasks keep the pipeline in `batch_scaling`.
- Clean batch evidence plus trend/audit evidence moves the user into `serial_governance`.

- [x] **Step 4: Run the service test to verify GREEN**

Run: `bun test ui/server/src/routes/novel-pipeline-service.test.ts`

Expected: pass.

### Task 2: Backend Pipeline Route

**Files:**
- Create: `ui/server/src/routes/novel-pipeline-routes.ts`
- Modify: `ui/server/src/routes/novel.ts`
- Test: `ui/server/src/routes/novel-pipeline-routes.test.ts`

- [x] **Step 1: Write the failing route test**

Test that `GET /api/novel/projects/:id/pipeline` returns `{ ok: true, pipeline }` and 404s missing projects.

- [x] **Step 2: Run route test to verify RED**

Run: `bun test ui/server/src/routes/novel-pipeline-routes.test.ts`

Expected: fail because route is not registered.

- [x] **Step 3: Implement route and register it**

Route should load project, chapters, outlines, reviews, and runs through existing store APIs, then call `buildNovelPipelineSummary`.

- [x] **Step 4: Run route test to verify GREEN**

Run: `bun test ui/server/src/routes/novel-pipeline-routes.test.ts`

Expected: pass.

### Task 3: Frontend Pipeline View Model

**Files:**
- Create: `ui/web/src/pages/novel-workspace/serialPipelineModel.ts`
- Test: `ui/web/src/pages/novel-workspace/serialPipelineModel.test.ts`

- [x] **Step 1: Write failing model tests**

Test that backend pipeline payload maps stage status to Ant Design status labels and chooses a single primary action.

- [x] **Step 2: Run model test to verify RED**

Run: `bun test ui/web/src/pages/novel-workspace/serialPipelineModel.test.ts`

Expected: fail because model file does not exist.

- [x] **Step 3: Implement model**

Expose `buildSerialPipelineViewModel(pipeline)` returning compact stage cards and primary action metadata.

- [x] **Step 4: Run model test to verify GREEN**

Run: `bun test ui/web/src/pages/novel-workspace/serialPipelineModel.test.ts`

Expected: pass.

### Task 4: Frontend Workspace Integration

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/useNovelWorkspaceData.ts`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css`

- [x] **Step 1: Load `/pipeline` in the workspace data hook**

Add a `pipeline` state, request it with the existing project module Promise batch, and fall back to `null` on failure.

- [x] **Step 2: Render a compact pipeline card**

Place the card at the top of the auto-creation/story-planning working area. Show six stages, current status, primary recommendation, and one-line reason.

- [x] **Step 3: Wire stage actions to existing handlers**

Map `open_writing_bible`, `enter_story_planning`, `confirm_plan_and_write_draft`, `refresh_current_quality`, `start_safe_batch`, and `open_longform_governance` to existing workspace area switches or existing action handlers.

- [x] **Step 4: Verify frontend build**

Run: `bun run build` in `ui/web`.

Expected: build succeeds.

### Task 5: Whole-Slice Verification

**Files:**
- Existing tests only.

- [x] **Step 1: Run focused tests**

Run:

```bash
bun test \
  ui/server/src/routes/novel-pipeline-service.test.ts \
  ui/server/src/routes/novel-pipeline-routes.test.ts \
  ui/web/src/pages/novel-workspace/serialPipelineModel.test.ts \
  ui/web/src/pages/novel-workspace/useNovelWorkspaceData.test.ts
```

Expected: all focused tests pass.

- [x] **Step 2: Run server and web builds**

Run:

```bash
(cd ui/server && bun run build)
(cd ui/web && bun run build)
```

Expected: both builds succeed.
