# 质检修订条收敛到 oh-story 按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quality revision bar only exposes oh-story 审稿 / 去AI; old MangaForge revise/recheck/material buttons disappear from this panel.

**Architecture:** UI-only change in `WorkspaceCenterQualityRevisionPanel`. Keep the expandable read-only report (score, issues, checks). Keep the in-flight `editor_revision` status strip. Do not delete revision APIs or chapter-header buttons.

**Tech Stack:** React, Ant Design Button, bun:test + `renderToStaticMarkup`.

**Spec:** `docs/superpowers/specs/2026-08-14-oh-story-quality-bar-convergence-design.md`

**Commit policy:** This repo’s user rule wins over the skill’s “commit every task” default. Skip every Commit step unless the user explicitly asks to commit.

---

## File map

Modify:

- `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts` — flip assertions
- `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx` — remove revise/recheck/material actions

Do not modify:

- `WorkspaceCenter.tsx` chapter-header「一键修订」（spec 只收质检修订条）
- oh-story core routes / runner
- `editor_revision` API

---

### Task 1: Flip panel tests to the thin oh-story bar

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`

- [ ] **Step 1: Write the failing assertions**

In `describe('oh-story quality panel actions')`, replace the test that still expects `一键修订` with:

```ts
test('shows review and deslop actions plus a reference-score caption', () => {
  const html = renderPanel(7, null)

  expect(html).toContain('oh-story 审稿')
  expect(html).toContain('oh-story 去AI')
  expect(html).toContain('参考，不自动改稿')
  expect(html).not.toContain('一键修订')
  expect(html).not.toContain('按报告修订')
  expect(html).not.toContain('立即质检')
  expect(html).not.toContain('复检当前版本')
  expect(html).not.toContain('重新质检')
  expect(html).not.toContain('生成编辑报告')
  expect(html).not.toContain('补动作')
  expect(html).not.toContain('一键补材料')
  expect(html).not.toContain('先点「立即质检」')
})
```

In `describe('current chapter editor revision status')`, stop asserting the removed「按报告修订」button. Keep the in-flight strip assertions:

```ts
test('shows indeterminate current phase and cancel while disabling only the matching chapter revision', () => {
  const html = renderPanel(7, revisionTask())

  expect(html).toContain('novel-editor-revision-status-strip')
  expect(html).toContain('安全检查')
  expect(html).toContain('ant-spin')
  expect(html).toContain('运行中')
  expect(html).not.toContain('ant-progress')
  expect(html).toContain('取消修订')
  expect(html).not.toContain('按报告修订')
})

test('does not lock revision when the active chapter no longer matches the task', () => {
  const html = renderPanel(8, revisionTask())

  expect(html).not.toContain('novel-editor-revision-status-strip')
  expect(html).not.toContain('取消修订')
})
```

`locks the header revision action...` renders full `WorkspaceCenter` and currently finds「一键修订」on this quality panel. After Task 2 that string may disappear from that render. If the test fails for a missing button, change it to:

```ts
expect(matchingHtml).not.toContain('>一键修订<')
expect(otherChapterHtml).not.toContain('>一键修订<')
```

Do not touch the later `dispatchWorkspaceDeliveryAction` / delivery-strip tests; those assert shared guard logic, not this panel.

- [ ] **Step 2: Run and confirm fail**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
```

Expected: FAIL on `not.toContain('一键修订')` and/or `按报告修订` still present.

- [ ] **Step 3: Commit**

Skip unless the user asks.

---

### Task 2: Strip revise/recheck/material actions from the panel

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`

- [ ] **Step 1: Remove unused constants and local revise helpers**

Delete `REVISION_CHIPS`, `CUSTOM_REVISION_PRESETS`, `customRevisionPrompt` state, `repairingPreflight` state, `canRevise`, `trimmedCustomPrompt`, `withCustomPrompt`, and `applyRevision`.

Keep props on the component signature (`onApplyEditorRevision`, `onRefreshProseQuality`, `onRepairPreflightGaps`, `onCreateEditorReport`, `onOpenSideQuality`) so `WorkspaceCenter` does not have to change this task. They become unused in the JSX.

- [ ] **Step 2: Summary row — only oh-story buttons**

Replace the `novel-quality-revision-summary-action` block so it is only:

```tsx
<span className="novel-quality-revision-summary-action" style={{ gap: 6 }}>
  <Button
    size="small"
    onClick={(event) => {
      event.preventDefault()
      event.stopPropagation()
      void onOhStoryReview?.()
    }}
  >oh-story 审稿</Button>
  <Button
    size="small"
    onClick={(event) => {
      event.preventDefault()
      event.stopPropagation()
      void onOhStoryDeslop?.()
    }}
  >oh-story 去AI</Button>
</span>
```

- [ ] **Step 3: Body — read-only report**

Keep `EditorRevisionStatusStrip` when `currentEditorRevisionTask` is set.

Delete the entire `novel-quality-revision-actions` `<Space>` (立即质检 / 按报告修订 / 生成编辑报告 / 历史记录).

Change the empty state to:

```tsx
<Text type="secondary" className="novel-quality-revision-empty">
  还没有参考分。可以直接点「oh-story 审稿」或「oh-story 去AI」，不必先质检。
</Text>
```

Delete:

- the `canRevise && !busy` block (定向修订 chips + 自定义修订指令)
- the「一键补材料」button and the two hint strings that tell the user to 复检 / 补材料 / 再修订
- stale hint `请先复检当前版本再修订` — replace with `这份报告早于当前正文，仅作参考。`

Keep: meta tags, summary text, dimension rows, craft rows, check rows (without the repair button), warnings, issues list (labels only, no click-to-revise).

- [ ] **Step 4: Re-run tests**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
```

Expected: PASS. Header `一键修订` tests on `WorkspaceCenter` still pass.

- [ ] **Step 5: Commit**

Skip unless the user asks.

---

## Manual verification

Open project 3 / chapter 1 质检修订:

1. Top row shows score +「参考，不自动改稿」+ 审稿 + 去AI only.
2. No 一键修订 / 复检 / 按报告修订 / 补动作 / 一键补材料.
3. Expand still shows score and issue list.
4. 审稿 / 去AI still call the existing handlers (model_id + 润色后全文 extract).

---

## Self-review

**Spec coverage**

| Spec | Task |
|---|---|
| Only 质检修订 bar | 2 (WorkspaceCenter header untouched) |
| Buttons: 审稿 + 去AI | 1, 2 |
| Score + 参考 caption | already present; tests keep them |
| Expand read-only | 2 |
| In-flight revision strip | 1 keeps cancel assertions; 2 keeps strip |
| No backend delete | no server files |

**Placeholders:** none.

**Type consistency:** prop names unchanged so parent compile stays green.
