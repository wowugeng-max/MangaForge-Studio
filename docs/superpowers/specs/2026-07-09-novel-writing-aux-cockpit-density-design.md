# Novel Writing Aux + Cockpit Density Design

**Date:** 2026-07-09  
**Status:** Approved for implementation planning  
**Scope:** Chapter-writing auxiliary chrome density (item 1) + Writing Cockpit information hierarchy (item 2)  
**Depends on:** Dual-mode shell (`immersive` | `workbench`) already on `main`  
**Non-goals:** Reference panel redesign; planning/acceptance desk field rewrites; API/model logic changes; moving global Cockpit into chapter writing; mobile-first layout

---

## Problem

The dual-mode shell made the outer chrome quieter, but two remaining density issues still block “actually writing” and “command without a dashboard”:

1. **Chapter writing** still spends a full horizontal **aux-rail** (~40px) even when the support stack is collapsed. Immersive mode therefore still feels like “editor + status strip,” not editor-first.
2. **Writing Cockpit** (shown only outside `chapterWriting`) defaults to collapsed tags without a primary action. Expanded mode dumps planning desks, role strips, and pipeline copy at once — instrument-panel energy.

---

## Goals

### Item 1 — Writing aux dual presentation

- **Immersive + chapter writing:** no standalone aux-rail row; compact focus chips + **辅助** entry on the editor toolbar; full queue/delivery/brief content in a Popover (or light drawer).
- **Workbench + chapter writing:** keep existing aux-rail + support-stack behavior (default stack collapsed via existing localStorage).
- Do not delete writing-queue / delivery / handoff / draft-brief capabilities.

### Item 2 — Cockpit hierarchy

- Collapsed summary strip must expose **status + primary action** without expanding.
- Expanded view uses **L1 always-on command surface** + **L2 details closed by default**.
- No changes to cockpit model builders, action keys, or APIs.
- Global Cockpit remains **hidden in `chapterWriting`** (`showGlobalWritingGuidance` unchanged).

## Success criteria

- Immersive chapter writing: main column gains ~one full aux-rail height; user can still open full aux content from the toolbar.
- Workbench chapter writing: aux rail/stack parity with current product behavior.
- Non-writing areas: collapsed cockpit shows primary button; expand does not auto-open L2 desks.
- Existing shell contracts still pass or are updated for intentional class/copy changes (single primary editor action, aux collapse key, role strip non-actions, unattended entry, guidance gate in chapter writing).

---

## Chosen approach

**Approach B — Dual-state information architecture** aligned with the shell’s immersive/workbench modes.

Rejected:

- **A** pure CSS hide (too weak for cockpit expanded noise)
- **C** move all aux into a right writing drawer (conflicts with Reference panel; too large for this pass)

---

## §1 Chapter writing auxiliary dual presentation

### State

| State | Role |
|-------|------|
| `isImmersiveShell` | From shell (existing) |
| `writingAuxCollapsed` | Workbench-only stack collapse; key `novel.workspace.writingAuxCollapsed`; default `true` (existing) |
| `immersiveAuxOpen` | Immersive Popover open; **session-only**, not persisted |

### Immersive (`chapterWriting` + immersive)

1. Do **not** render standalone `novel-writing-aux-rail`.
2. Do **not** render in-flow `novel-writing-support-stack` by default.
3. On editor toolbar (title / primary / word count / more), add a **compact focus cluster**:
   - At most **2–3** tags, priority:
     1. Delivery status (when risk / non-idle)
     2. Queue summary (`可写 n · 待补 n` style)
     3. Draft brief status (when gap)
   - Button **辅助** opens Popover.
4. Popover content = current support-stack children (queue, delivery, handoff, draft brief, batch plan repair, etc.).
   - Width ~360–420px; max-height `min(50vh, 420px)`; internal scroll.
5. Opening Popover does **not** exit immersive shell.

### Workbench (`chapterWriting` + workbench)

1. Render existing `novel-writing-aux-rail` + optional `novel-writing-support-stack`.
2. Default stack collapsed (`writingAuxCollapsed` default true).
3. Labels/behavior stay product-compatible (`展开辅助面板` / `收起辅助面板`).

### Shell linkage

| Event | Behavior |
|-------|----------|
| Enter immersive | Close immersive Popover if open; do not force-change `writingAuxCollapsed` |
| Enter workbench | Close immersive Popover; aux rail follows `writingAuxCollapsed` |
| Leave chapter writing | Popover unmounts with center |

### Wiring

- Pass `isImmersiveShell` (or equivalent) into `WorkspaceCenter` from `NovelProjectWorkspace`.
- Prefer presentational branching in `WorkspaceCenter.tsx` + CSS; avoid duplicating queue/delivery render trees if a shared inner component can be reused between stack and Popover.

### Out of scope for §1

- Rewrite queue/delivery models
- Merge aux into ReferencePanel
- Change CodeMirror theme or primary recommendation logic

---

## §2 Writing Cockpit information hierarchy

### Scope

- Component: `WritingCockpitPanel.tsx` (+ light CSS)
- Mount sites: only where `showGlobalWritingGuidance` is true (non-`chapterWriting`)
- Models/actions: unchanged

### Collapsed strip (default `cockpitCollapsed = true`)

Single ~40–48px command summary:

| Zone | Content |
|------|---------|
| Left | Role/phase tag · next chapter one-liner (`第n章 · 标题`, ellipsis) |
| Center | Readiness `n%`; at most **one** blocker tag (+N if more) |
| Right | **Primary action button** (`topStatus.nextActionLabel` / `primaryActionKey`, honor `primaryActionOverride`) + **展开详情** |

Optional: keep 无人值守 as small control if already present; do not require expand to run primary action.

### Expanded: L1 + L2

**L1 always visible**

1. Header: 写作指挥台 + 收起
2. Compact command row: target chapter blurb · readiness Progress · failed checks only (max 3) · primary button
3. `LongformWorkflowStrip` when present
4. Blocker alert when present

**L2 default closed**

Wrap in a **写作详情** collapsible (`details` or Ant Collapse), default **closed**:

- `ChapterAcceptanceDesk` / `ChapterPlanningDesk`
- Model team role-strip + recommendation copy
- Longer draft-pipeline / previous-hook explanatory blocks currently in the expanded grid

Opening L2 restores information parity with today’s expanded cockpit; no child feature deletion.

### State

| State | Role |
|-------|------|
| `cockpitCollapsed` | Whole panel collapse (existing); `forceCollapsed` still forces collapsed |
| `cockpitDetailsOpen` | L2 open; default `false`; **session-only** for v1 |

- Primary action from collapsed strip calls `onAction` without expanding.
- **展开详情** sets `cockpitCollapsed=false`; L2 stays closed unless user opens it.
- Collapsing whole panel does not force-clear L2 session preference (optional; either way is fine if consistent).

### Visual constraints

- Align collapsed strip with editor toolbar density (tags + 32px primary).
- L1 should stay roughly within upper quarter of main column; L2 scrolls inside existing cockpit max-height rules.
- Avoid triple-duplicating the same blocker: collapsed shows 1; L1 alert may show full; L2 desks keep their own content.

### Out of scope for §2

- Rewrite planning/acceptance desk internals
- Mount cockpit inside chapter writing
- New agent orchestration UI

---

## Cross-scenario matrix

| Scenario | Aux (§1) | Cockpit (§2) |
|----------|----------|--------------|
| `chapterWriting` + immersive | Toolbar chips + Popover | Not mounted |
| `chapterWriting` + workbench | Aux-rail + stack | Not mounted |
| Other workspace areas | N/A | Summary / L1 / L2 |

---

## Implementation touchpoints (preview)

| File | Change |
|------|--------|
| `ui/web/src/pages/NovelProjectWorkspace.tsx` | Pass immersive flag into `WorkspaceCenter` |
| `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx` | Dual aux presentation |
| `ui/web/src/pages/novel-workspace/WorkspaceCenter.css` | Compact toolbar cluster + Popover density |
| `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx` | Collapsed primary + L1/L2 |
| `ui/web/src/pages/novel-workspace/WritingCockpitPanel.css` | Summary strip / details styles |
| `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts` | Extend contracts for dual aux + cockpit hierarchy |

Optional small pure helpers only if they reduce duplication (e.g. pick focus tags); YAGNI otherwise.

---

## Testing plan

1. Source contracts: immersive path has no in-flow `novel-writing-aux-rail` when immersive prop true; workbench still has rail; Popover/辅助 entry present for immersive.
2. Cockpit: collapsed markup includes primary action label path; L2 wrapper default closed; role-strip remains non-click actions.
3. Regression: single editor primary action; `NOVEL_WRITING_AUX_COLLAPSED_KEY`; `showGlobalWritingGuidance` gate; unattended entry on cockpit.
4. Manual: immersive height gain; Popover open full queue; workbench expand stack; non-writing collapsed primary click; expand details without auto-opening L2.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicated queue JSX in rail vs Popover | Extract shared render function/component inside WorkspaceCenter |
| Toolbar overcrowding in immersive | Cap tags at 3; put rest only inside Popover |
| Brittle source tests | Update intentional class/copy assertions; do not delete coverage |
| Cockpit still tall if L2 left open | Default closed; session-only memory |

---

## Approval record

- User selected follow-ups: writing-area true immersion (1) + Cockpit hierarchy (2)
- Immersion density choice: **4** — merge aux into toolbar in immersive; independent aux-rail only in workbench
- Approach: **B** dual-state information architecture
- Design §1–§2 approved in conversation 2026-07-09
