# Novel Workspace Shell Dual-Mode UI Design

**Date:** 2026-07-09  
**Status:** Approved for implementation planning  
**Scope:** Novel project workspace page shell only (`ui/web` novel workspace)  
**Non-goals:** Internal redesign of ReferencePanel / StoryPlanning / StoryAssets content; API or workflow logic changes; mobile-first responsive overhaul

---

## Problem

The novel workspace top bar and body already pack high operational density: six workspace areas, model select, readiness tags, unattended production entry, creative assistant, focus toggle, task center, chapter directory, writing cockpit, serial pipeline, and reference panel.

Existing “专注写作” only partially reduces noise. Default chapter-writing still feels like a control dashboard rather than a place to write. Users want:

1. **Immersive writing by default** when drafting chapters  
2. **One-click workbench** when they need full production controls  
3. **Shell-level polish** (top bar, mode switching, three-column layout) without rewriting feature logic

---

## Goals

- Dual shell modes: `immersive` | `workbench`
- Default immersive when in `chapterWriting`
- Unified top-bar structure (left / center / right) with mode-dependent control density
- Predictable collapse rules for directory, cockpit, pipeline, and right panel
- Persist user shell preference for writing area
- No API contract changes; no change to WorkspaceArea business handlers beyond presentation/state wiring
- Extend existing shell contract tests rather than delete them

## Success criteria

- Entering chapter writing defaults to an editor-first layout, not a full tool dashboard
- One click expands the full workbench without losing access to any current top-bar capability
- Task center and shell toggle remain reachable; top bar no longer relies on uncontrolled horizontal overflow for primary actions
- Existing shell tests still pass (directory rail collapse, single primary editor action, cockpit role strip non-actions, etc.)
- Generate / save / chapter select / area routing behavior unchanged

---

## Chosen approach

**Approach B — Dual-state shell** (selected over light cleanup and full IDE re-architecture)

- Same page DOM and area renderers
- Root shell mode drives visibility, collapse defaults, and CSS classes
- Upgrade existing `focusWritingMode` into `shellMode` rather than maintaining two parallel switches

---

## §1 Top bar structure

### Layout zones (fixed three segments)

| Zone | Content | Immersive | Workbench |
|------|---------|-----------|-----------|
| Left | Back + project title | Shown | Shown |
| Center | Workspace area switcher (6 areas) | Shown (may compress labels) | Full labels |
| Right | Context actions | Compact set + overflow | Full set |

### Always visible (both modes)

- Task center (with badge)
- Shell toggle: `展开工作台` / `沉浸写作`
- Back + title
- Area switcher

### Workbench-only default chrome

- Model select
- Commercial readiness tag (clickable)
- Reference strength tag (when data exists)
- Unattended production entry (aligned with `productionOps`, not competing as a second primary hero)
- Creative assistant
- Refresh

### Immersive overflow

Model, readiness, reference tag, unattended, creative assistant, and refresh move into a right-side **More** menu (`⋯`) / popover so the bar stays single-row and scannable.

### Area switcher

Keep existing keys:

- `autoCreation`
- `storyPlanning`
- `chapterWriting`
- `storyAssets`
- `qualityRevision`
- `productionOps`

Visual upgrade: unified mode rail (segmented / pill active state) instead of a dense row of plain text buttons. Do not change routing or area semantics.

### Relation to current focus mode

- Replace / merge `focusWritingMode` into `shellMode: 'immersive' | 'workbench'`
- Entering `chapterWriting` defaults to `immersive` (or last remembered writing shell mode)
- Leaving `chapterWriting` forces `workbench`
- Root classes: `novel-workspace-shell-immersive` / `novel-workspace-shell-workbench`
- Keep top bar height ~48px; allow light center overflow on narrow widths; keep task center + shell toggle sticky/visible

---

## §2 Body three-column layout and collapse behavior

### Columns

| Column | Immersive (default in chapter writing) | Workbench |
|--------|----------------------------------------|-----------|
| Left directory | Default narrow rail (48px); user can expand | Default expanded 240px; user fold preference respected |
| Main | Editor dominates vertical space | Cockpit + pipeline (as today by area) + content |
| Right reference | Default closed; open on demand | Remember open state |

### Main column vertical stack

**Immersive + `chapterWriting`**

1. Existing editor toolbar / primary action entry retained  
2. `WritingCockpitPanel` force-collapsed summary strip (`forceCollapsed`)  
3. Serial pipeline hidden  
4. `WorkspaceCenter` content `flex: 1` fills remaining height  

**Workbench**

1. Non-writing areas: keep global writing guidance (cockpit + pipeline) when current logic shows them  
2. Writing area: cockpit expandable; pipeline follows existing visibility rules  
3. Clear visual bands: top bar / guidance / content  

### Collapse rules

1. **`shellMode` is the driver** for default presentation; individual panels do not invent competing “focus” flags.  
2. **Manual overrides do not exit immersive**  
   - User may expand directory or open reference while immersive  
   - Only explicit shell toggle enters `workbench`  
3. **Leaving writing area** → `workbench`  
4. **Returning to writing** → restore last writing `shellMode` from storage  
5. **Workbench restore** does not force-open every panel; restore directory/right-panel preferences  
6. **Immersive enter defaults** (when not overriding user workbench prefs incorrectly): directory collapsed, right panel closed, cockpit force-collapsed, pipeline hidden  

### Visual shell tokens (CSS-level)

- Hang mode classes on `novel-project-workspace` root  
- Main column slightly cleaner / writing-forward in immersive  
- Side columns lighter separation (border / subtle background)  
- Avoid stacking heavy borders under immersive editor  
- No new UI framework; Ant Design 5 + existing CSS patterns  

### Explicit non-goals for this section

- No IA rewrite inside ReferencePanel / planning / assets  
- No business flow changes for chapter ops  
- No phone-first layout pass  

---

## §3 State model, defaults, persistence, tests

### State (frontend only)

| State | Type | Role |
|-------|------|------|
| `shellMode` | `'immersive' \| 'workbench'` | Primary shell mode |
| `workspaceArea` | existing union | Business area (unchanged) |
| `directoryCollapsed` | `boolean` | Left rail |
| `rightPanelOpen` | `boolean` | Right panel |
| `rightPanelTab` | existing | Right panel tab |

Derived:

- `isImmersiveShell = shellMode === 'immersive' && workspaceArea === 'chapterWriting'`
- Root class from shell mode + writing context
- Immersive drives cockpit `forceCollapsed`, pipeline hide, top-bar compact set

Compatibility: migrate UI meaning of `focusWritingMode` into `shellMode`; do not keep two user-facing toggles.

### Defaults

| Scenario | Behavior |
|----------|----------|
| First visit, enter writing | `immersive` |
| Enter `chapterWriting` | Restore last writing `shellMode`; else `immersive` |
| Leave `chapterWriting` | Force `workbench` |
| Immersive just enabled | Collapse directory; close right panel; force-collapse cockpit; hide pipeline |
| Switch to workbench | Restore panel prefs; do not force all panels open |
| Manual open directory/right while immersive | Stay immersive |

### localStorage

Suggested keys (align with existing `novel.workspace.*`):

- `novel.workspace.shellMode` → `'immersive' | 'workbench'` (writing-area preference)
- Optionally `novel.workspace.directoryCollapsed.workbench` for workbench directory preference  
- Reuse existing editor display / aux collapse keys where already present  
- Fail soft on read/write errors  

### Top-bar visibility matrix

| Control | immersive + writing | workbench |
|---------|---------------------|-----------|
| Back / title | ✓ | ✓ |
| Area switcher | ✓ (may compress) | ✓ full |
| Task center | ✓ | ✓ |
| Shell toggle | ✓ “展开工作台” | ✓ “沉浸写作” when writing |
| Model | More | ✓ |
| Readiness / reference tags | More or hidden | ✓ |
| Unattended | More or mode rail emphasis | ✓ |
| Creative assistant | More | ✓ |
| Refresh | More | ✓ |

### Implementation touchpoints

- `ui/web/src/pages/NovelProjectWorkspace.tsx` — state, top bar, body classes, defaults, persistence  
- `ui/web/src/pages/NovelProjectWorkspace.css` — dual-mode shell, top-bar zones, main height  
- `ui/web/src/pages/novel-workspace/WorkspaceCenter.css` (+ light cockpit styles if needed) — immersive main fill  
- `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts` — extend shell contracts  

Avoid drive-by refactors inside the large workspace file beyond shell wiring.

### Test plan

1. Shell toggle immersive ↔ workbench updates classes and control sets  
2. writing → non-writing forces workbench; return restores remembered writing shellMode  
3. Immersive manual directory/right open keeps immersive  
4. Persistence survives refresh  
5. Regression: directory narrow rail, task center entry, single primary editor action, cockpit role strip not re-actioned  
6. No API path or handler signature changes for generate/save/select chapter  

### Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Huge `NovelProjectWorkspace.tsx` | Touch only shell JSX/state; no business rewrite |
| Brittle source-level shell tests | Update assertions with intentional class/copy changes; do not delete coverage |
| Users cannot find model/pipeline after immersive default | Make “展开工作台” obvious in top bar; no onboarding tour in this pass |

---

## Out of scope (follow-ups)

- Deep visual redesign of WritingCockpit expanded content  
- Reference / creative assistant internal density redesign  
- Guided first-run tour  
- Full design-token system across entire app outside novel workspace shell  

---

## Approval record

- User selected: novel workspace UI optimization  
- Pain: overall shell upgrade  
- Personality: hybrid immersive default + one-click workbench  
- Coverage: page shell (top bar, mode switch, overall layout)  
- Approach: B dual-state shell  
- Design sections §1–§3: approved in conversation 2026-07-09  
