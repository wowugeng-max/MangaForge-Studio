# Storyline Review Decision Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make storyline review mismatches readable and actionable in the story planning workspace, so long serial novels can catch missed lines, unplanned advances, and forbidden reveals before continuing production.

**Architecture:** Reuse existing `storyline_sync` review payloads. Extend the planning workspace model with derived `diffEvidence` rows, then render those rows inside the existing `剧情线证据` details area. V1 is read-only: it suggests whether to revise prose, accept an unplanned advance into planning, or mark a mismatch as a false positive, but it does not mutate backend state.

**Tech Stack:** React, TypeScript, Ant Design, Bun tests.

---

### Task 1: Model Diff Evidence

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`

- [ ] **Step 1: Write failing model assertions**

Add assertions to `adds storyline sync evidence to board items for plan versus actual review` that expect `diffEvidence` to include `missed`, `unplanned`, and `forbidden_touched` rows with suggested decisions.

- [ ] **Step 2: Run the model test**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts
```

Expected: FAIL because `diffEvidence` does not exist yet.

- [ ] **Step 3: Implement model derivation**

Add `diffEvidence` to `PlanningStorylineBoardItem`. Derive it in `buildStorylineSyncEvidence` from `missed`, `unplanned`, and `forbidden_touched`, preserving chapter number, risk type, summary, evidence text, and a read-only recommended decision.

- [ ] **Step 4: Re-run the model test**

Run the same command. Expected: PASS.

### Task 2: UI Decision Layer

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx`

- [ ] **Step 1: Write failing shell guards**

Extend `shows storyline board evidence details for plan versus actual sync` to assert the UI contains `差异决策`, `回修正文`, `接受为新计划`, and `标记误判`.

- [ ] **Step 2: Run shell test**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: FAIL because the labels are not rendered.

- [ ] **Step 3: Render diff evidence**

Inside `剧情线证据`, add a compact `差异决策` block grouped by `diffEvidence`, with risk tags, evidence summaries, and the recommended action label.

- [ ] **Step 4: Re-run shell test**

Run the same command. Expected: PASS.

### Task 3: Documentation And Regression

**Files:**
- Modify: `docs/novel-usage-guide.md`

- [ ] **Step 1: Update usage guide**

Update the `剧情线看板` section to describe the new `差异决策` rows and the read-only nature of V1.

- [ ] **Step 2: Run focused verification**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts
bun test ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
git diff --check
```

Expected: all commands exit 0.
