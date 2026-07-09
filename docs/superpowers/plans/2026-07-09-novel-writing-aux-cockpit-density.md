# Novel Writing Aux + Cockpit Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make immersive chapter writing editor-first (aux in toolbar Popover) and make non-writing Writing Cockpit a command strip with L1/L2 detail hierarchy—without changing APIs or model builders.

**Architecture:** Reuse dual shell `isImmersiveShell`. In `WorkspaceCenter`, branch aux chrome: immersive = toolbar focus chips + Popover; workbench = existing aux-rail + support-stack. Extract shared support-stack body to avoid JSX duplication. In `WritingCockpitPanel`, upgrade collapsed strip with primary action and wrap expanded desks/role-strip in default-closed L2 “写作详情”.

**Tech Stack:** React 18, Ant Design 5 (`Popover`, `Button`, `Tag`, `Progress`), TypeScript, bun test source contracts in `workspaceUiShell.test.ts`.

**Spec:** `docs/superpowers/specs/2026-07-09-novel-writing-aux-cockpit-density-design.md`

## Global Constraints

- No API / backend / writingCockpitModel business logic rewrites
- `showGlobalWritingGuidance = workspaceArea !== 'chapterWriting'` stays; Cockpit never mounts in chapter writing
- Immersive: no standalone in-flow `novel-writing-aux-rail`; Popover does not exit immersive shell
- Workbench: keep aux-rail + support-stack and `NOVEL_WRITING_AUX_COLLAPSED_KEY` default collapsed
- Cockpit collapsed strip must expose primary action without expand
- Expanded Cockpit L2 (“写作详情”) default **closed**
- Role strip remains status display (not clickable action buttons)
- Extend `workspaceUiShell.test.ts`; update intentional assertions; do not delete primary-action / queue / role-strip coverage
- Commit after each task

## File map

| File | Responsibility |
|------|----------------|
| Create: `ui/web/src/pages/novel-workspace/writingAuxFocusModel.ts` | Pure picker for ≤3 immersive focus tags |
| Create: `ui/web/src/pages/novel-workspace/writingAuxFocusModel.test.ts` | Unit tests for tag priority |
| Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx` | Dual aux UI; `isImmersiveShell` prop |
| Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css` | Toolbar focus cluster + popover panel |
| Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` | Pass `isImmersiveShell` into WorkspaceCenter |
| Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx` | Collapsed primary + L1/L2 |
| Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.css` | Summary strip / details styles |
| Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts` | Contracts for dual aux + cockpit hierarchy |

---

### Task 1: Pure focus-tag picker + unit tests

**Files:**
- Create: `ui/web/src/pages/novel-workspace/writingAuxFocusModel.ts`
- Create: `ui/web/src/pages/novel-workspace/writingAuxFocusModel.test.ts`

**Interfaces:**
- Produces:
```ts
export type WritingAuxFocusTag = {
  key: 'delivery' | 'queue' | 'brief' | 'handoff'
  label: string
  color?: string
}

export type WritingAuxFocusInput = {
  delivery?: { visible: boolean; statusLabel: string; risky?: boolean } | null
  queue?: { visible: boolean; summary: string } | null
  brief?: { visible: boolean; statusLabel: string; hasGap?: boolean } | null
  handoff?: { visible: boolean; label: string } | null
}

export function pickWritingAuxFocusTags(input: WritingAuxFocusInput, limit = 3): WritingAuxFocusTag[]
```

Priority (spec): delivery (when visible; prefer when `risky`) → queue summary → brief (prefer when `hasGap`) → handoff fills remaining slots. Cap at `limit`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, test } from 'bun:test'
import { pickWritingAuxFocusTags } from './writingAuxFocusModel'

describe('pickWritingAuxFocusTags', () => {
  test('returns empty when nothing visible', () => {
    expect(pickWritingAuxFocusTags({})).toEqual([])
  })

  test('orders delivery, queue, brief and caps at 3', () => {
    const tags = pickWritingAuxFocusTags({
      delivery: { visible: true, statusLabel: '待质检', risky: true },
      queue: { visible: true, summary: '可写 2 · 待补 1' },
      brief: { visible: true, statusLabel: '任务书缺口', hasGap: true },
      handoff: { visible: true, label: '交接就绪' },
    }, 3)
    expect(tags.map(t => t.key)).toEqual(['delivery', 'queue', 'brief'])
    expect(tags[0].label).toContain('待质检')
    expect(tags[1].label).toContain('可写 2')
  })

  test('skips invisible entries and fills with handoff', () => {
    const tags = pickWritingAuxFocusTags({
      delivery: { visible: false, statusLabel: 'x' },
      queue: { visible: true, summary: '可写 1' },
      handoff: { visible: true, label: '交接 A' },
    })
    expect(tags.map(t => t.key)).toEqual(['queue', 'handoff'])
  })
})
```

- [ ] **Step 2: Run to fail**

```bash
cd ui/web && bun test src/pages/novel-workspace/writingAuxFocusModel.test.ts
```

Expected: module not found / fail

- [ ] **Step 3: Implement**

```ts
export type WritingAuxFocusTag = {
  key: 'delivery' | 'queue' | 'brief' | 'handoff'
  label: string
  color?: string
}

export type WritingAuxFocusInput = {
  delivery?: { visible: boolean; statusLabel: string; risky?: boolean } | null
  queue?: { visible: boolean; summary: string } | null
  brief?: { visible: boolean; statusLabel: string; hasGap?: boolean } | null
  handoff?: { visible: boolean; label: string } | null
}

export function pickWritingAuxFocusTags(input: WritingAuxFocusInput, limit = 3): WritingAuxFocusTag[] {
  const out: WritingAuxFocusTag[] = []
  const push = (tag: WritingAuxFocusTag | null) => {
    if (!tag || out.length >= limit) return
    out.push(tag)
  }

  if (input.delivery?.visible) {
    push({
      key: 'delivery',
      label: `交稿 ${input.delivery.statusLabel}`,
      color: input.delivery.risky ? 'gold' : undefined,
    })
  }
  if (input.queue?.visible && input.queue.summary) {
    push({ key: 'queue', label: `队列 ${input.queue.summary}` })
  }
  if (input.brief?.visible) {
    push({
      key: 'brief',
      label: `任务书 ${input.brief.statusLabel}`,
      color: input.brief.hasGap ? 'gold' : undefined,
    })
  }
  if (input.handoff?.visible) {
    push({ key: 'handoff', label: `交接 ${input.handoff.label}` })
  }
  return out
}
```

- [ ] **Step 4: Run to pass**

```bash
cd ui/web && bun test src/pages/novel-workspace/writingAuxFocusModel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/writingAuxFocusModel.ts ui/web/src/pages/novel-workspace/writingAuxFocusModel.test.ts
git commit -m "feat(ui): add writing aux focus tag picker"
```

---

### Task 2: WorkspaceCenter dual aux (immersive Popover vs workbench rail)

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` (pass prop only)

**Interfaces:**
- Consumes: `pickWritingAuxFocusTags` from Task 1; existing delivery/queue/brief builders in WorkspaceCenter
- Produces: prop `isImmersiveShell?: boolean` on `WorkspaceCenter` (default `false`)

- [ ] **Step 1: Add prop + immersive open state**

In `WorkspaceCenter` props list (destructure + type):

```ts
isImmersiveShell = false,
// ...
isImmersiveShell?: boolean
```

Inside component:

```ts
const [immersiveAuxOpen, setImmersiveAuxOpen] = React.useState(false)

React.useEffect(() => {
  if (!isImmersiveShell) setImmersiveAuxOpen(false)
}, [isImmersiveShell])
```

- [ ] **Step 2: Extract support stack body**

Locate the block currently under:

```tsx
{!writingAuxCollapsed && (
  <div className="novel-writing-support-stack" aria-label="写作辅助面板">
    {/* queue, delivery, handoff, draft brief, ... */}
  </div>
)}
```

Refactor to a local render function or `const writingSupportBody = (...)` **before** return, containing the same children (do not change child behavior). Then:

**Workbench path (keep):**

```tsx
{!isImmersiveShell && (
  <>
    <div className={`novel-writing-aux-rail ${writingAuxCollapsed ? 'is-collapsed' : 'is-expanded'}`} aria-label="写作辅助面板状态">
      {/* existing summary tags + toggle */}
    </div>
    {!writingAuxCollapsed && (
      <div className="novel-writing-support-stack" aria-label="写作辅助面板">
        {writingSupportBody}
      </div>
    )}
  </>
)}
```

**Immersive path:** no `novel-writing-aux-rail` in the main column flow.

- [ ] **Step 3: Immersive toolbar cluster**

Inside `novel-editor-toolbar` (when `activeChapter`), after primary entry or inside `novel-editor-toolbar-controls`, when `isImmersiveShell`:

```tsx
{isImmersiveShell && (
  <div className="novel-writing-immersive-aux">
    <div className="novel-writing-immersive-aux-tags">
      {pickWritingAuxFocusTags({
        delivery: deliverySummary.visible
          ? {
              visible: true,
              statusLabel: deliverySummary.statusLabel,
              risky: /风险|待|阻断|失败|需/.test(String(deliverySummary.statusLabel || '')),
            }
          : null,
        queue: writingQueue?.visible
          ? { visible: true, summary: writingAuxQueueSummary }
          : null,
        brief: draftBriefSummary.visible
          ? {
              visible: true,
              statusLabel: draftBriefSummary.statusLabel,
              hasGap: /缺口|待|未/.test(String(draftBriefSummary.statusLabel || '')),
            }
          : null,
        handoff: chapterHandoffDesk?.visible
          ? { visible: true, label: chapterHandoffDesk.label }
          : null,
      }).map(tag => (
        <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
      ))}
    </div>
    <Popover
      trigger="click"
      open={immersiveAuxOpen}
      onOpenChange={setImmersiveAuxOpen}
      placement="bottomRight"
      overlayClassName="novel-writing-immersive-aux-popover"
      content={
        <div className="novel-writing-immersive-aux-panel" aria-label="写作辅助面板">
          {writingSupportBody}
        </div>
      }
    >
      <Button size="small" className="novel-writing-immersive-aux-trigger">辅助</Button>
    </Popover>
  </div>
)}
```

Import `Popover` if not already imported from antd. Import `pickWritingAuxFocusTags`.

Note: `writingAuxQueueSummary` is already computed later in the file—move its computation above this JSX or keep cluster after that const (cluster is in return; const already above return—OK).

- [ ] **Step 4: CSS**

Add to `WorkspaceCenter.css`:

```css
.novel-writing-immersive-aux {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: min(420px, 40vw);
}

.novel-writing-immersive-aux-tags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}

.novel-writing-immersive-aux-tags .ant-tag {
  margin-inline-end: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}

.novel-writing-immersive-aux-trigger.ant-btn {
  height: 28px;
  border-radius: 999px;
  font-weight: 750;
  flex-shrink: 0;
}

.novel-writing-immersive-aux-panel {
  width: min(400px, 90vw);
  max-height: min(50vh, 420px);
  overflow: auto;
}

.novel-writing-immersive-aux-panel .novel-writing-queue-strip,
.novel-writing-immersive-aux-panel .novel-writing-support-stack {
  max-height: none;
  border-bottom: 0;
}
```

- [ ] **Step 5: Pass prop from NovelProjectWorkspace**

On `<WorkspaceCenter` in chapter writing branch:

```tsx
isImmersiveShell={isImmersiveShell}
```

- [ ] **Step 6: Grep sanity**

```bash
grep -n "isImmersiveShell\|novel-writing-immersive-aux\|pickWritingAuxFocusTags" ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx ui/web/src/pages/NovelProjectWorkspace.tsx | head -40
```

- [ ] **Step 7: Commit**

```bash
git add ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx ui/web/src/pages/novel-workspace/WorkspaceCenter.css ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat(ui): immersive writing aux in toolbar popover"
```

---

### Task 3: WritingCockpitPanel collapsed primary + L1/L2

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.css` (create rules if file already imports CSS—check top of TSX for `./WritingCockpitPanel.css`)

**Interfaces:**
- Consumes: existing `model.topStatus`, `primaryActionOverride`, `onAction`, desks, role strip
- Produces: `cockpitDetailsOpen` session state; collapsed strip with primary; L2 wrapper class `writing-cockpit-details`

Resolve primary action for strip:

```ts
const primaryKey = primaryActionOverride?.key || model.topStatus.primaryActionKey
const primaryLabel = primaryActionOverride?.label || model.topStatus.nextActionLabel
const runPrimary = () => onAction(primaryKey)
```

(Adjust field names to match actual `WritingCockpitPrimaryActionOverride` and model—read type at top of file.)

- [ ] **Step 1: Read primaryActionOverride shape and collapsed JSX**

Confirm `WritingCockpitPrimaryActionOverride` fields and current collapsed return (~855–894).

- [ ] **Step 2: Upgrade collapsed strip**

Replace collapsed body with three-zone row (classes exact):

```tsx
<div className="writing-cockpit-panel is-collapsed">
  <Card className="writing-cockpit-card writing-cockpit-card-collapsed" size="small" ...>
    <div className="writing-cockpit-summary-strip">
      <div className="writing-cockpit-summary-left">
        <Tag color="blue" bordered={false}>{model.topStatus.currentRoleLabel}</Tag>
        <Text strong className="writing-cockpit-summary-chapter">{nextChapterLabel}</Text>
      </div>
      <div className="writing-cockpit-summary-center">
        <Tag color={...readiness...} bordered={false}>准备度 {percent}%</Tag>
        {model.readiness.blockers[0] && (
          <Tag color="red" bordered={false}>{model.readiness.blockers[0].label}</Tag>
        )}
        {model.readiness.blockers.length > 1 && (
          <Tag bordered={false}>+{model.readiness.blockers.length - 1}</Tag>
        )}
      </div>
      <div className="writing-cockpit-summary-right">
        {onOpenProductionOps && (
          <Button size="small" icon={<RocketOutlined />} onClick={onOpenProductionOps}>无人值守</Button>
        )}
        <Button
          type="primary"
          size="small"
          className="writing-cockpit-summary-primary"
          loading={loading}
          icon={actionIcon(primaryKey, recommendedRole)}
          onClick={runPrimary}
        >
          {primaryLabel}
        </Button>
        <Button size="small" icon={<DownOutlined />} onClick={() => setCockpitCollapsed(false)}>
          展开详情
        </Button>
      </div>
    </div>
  </Card>
</div>
```

Keep loading/empty-check behavior from existing Card.

- [ ] **Step 3: Expanded L1 + L2**

Add:

```ts
const [cockpitDetailsOpen, setCockpitDetailsOpen] = useState(false)
```

In expanded Card vertical Space:

1. Keep header with 收起
2. Keep/slim command grid as **L1** (target, readiness with **only non-pass checks max 3**, pipeline short state, primary button)
3. Keep `LongformWorkflowStrip` + blocker alert in L1
4. Wrap desks + role strip + long explanatory pipeline copy in:

```tsx
<details
  className="writing-cockpit-details"
  open={cockpitDetailsOpen}
  onToggle={(e) => setCockpitDetailsOpen((e.target as HTMLDetailsElement).open)}
>
  <summary className="writing-cockpit-details-summary">写作详情</summary>
  <div className="writing-cockpit-details-body">
    {/* ChapterAcceptanceDesk / ChapterPlanningDesk */}
    {/* role-strip row */}
    {/* any remaining long descriptive blocks moved from L1 if duplicated */}
  </div>
</details>
```

**Do not** put primary button only inside L2. **Do not** make role tags `onClick` action buttons.

Slim readiness tags in L1:

```ts
const concernChecks = model.readiness.checks.filter(c => c.status !== 'pass').slice(0, 3)
// map concernChecks instead of all checks in L1
```

- [ ] **Step 4: CSS**

```css
.writing-cockpit-summary-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) auto;
  gap: 8px 12px;
  align-items: center;
}

.writing-cockpit-summary-left,
.writing-cockpit-summary-center,
.writing-cockpit-summary-right {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.writing-cockpit-summary-right {
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.writing-cockpit-summary-chapter {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.writing-cockpit-summary-primary.ant-btn {
  font-weight: 800;
}

.writing-cockpit-details {
  border: 1px solid #e8eef5;
  border-radius: 8px;
  background: #fbfcfe;
  padding: 0 10px 10px;
}

.writing-cockpit-details-summary {
  cursor: pointer;
  font-weight: 750;
  padding: 8px 0;
  list-style: none;
}

.writing-cockpit-details-summary::-webkit-details-marker {
  display: none;
}

.writing-cockpit-details-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 900px) {
  .writing-cockpit-summary-strip {
    grid-template-columns: 1fr;
  }
  .writing-cockpit-summary-right {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
```

Ensure `WritingCockpitPanel.tsx` imports `./WritingCockpitPanel.css` if not already.

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx ui/web/src/pages/novel-workspace/WritingCockpitPanel.css
git commit -m "feat(ui): cockpit command strip with L1/L2 details"
```

---

### Task 4: Shell contract tests

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] **Step 1: Append contracts**

```ts
test('immersive writing aux uses toolbar popover instead of in-flow aux rail', () => {
  const component = source('WorkspaceCenter.tsx')
  const projectWorkspace = source('../NovelProjectWorkspace.tsx')
  const focusModel = source('writingAuxFocusModel.ts')

  expect(focusModel).toContain('pickWritingAuxFocusTags')
  expect(component).toContain('isImmersiveShell')
  expect(component).toContain('novel-writing-immersive-aux')
  expect(component).toContain('novel-writing-immersive-aux-trigger')
  expect(component).toContain('immersiveAuxOpen')
  expect(component).toContain('pickWritingAuxFocusTags')
  expect(component).toContain('辅助')
  expect(component).toContain('!isImmersiveShell')
  expect(component).toContain('novel-writing-aux-rail')
  expect(projectWorkspace).toContain('isImmersiveShell={isImmersiveShell}')
})

test('writing cockpit collapsed strip exposes primary action and L2 details default closed', () => {
  const component = source('WritingCockpitPanel.tsx')
  const css = source('WritingCockpitPanel.css')

  expect(component).toContain('writing-cockpit-summary-strip')
  expect(component).toContain('writing-cockpit-summary-primary')
  expect(component).toContain('展开详情')
  expect(component).toContain('writing-cockpit-details')
  expect(component).toContain('写作详情')
  expect(component).toContain('cockpitDetailsOpen')
  expect(component).toContain('useState(false)') // details default closed — prefer more specific if flaky
  expect(component).toContain('writing-cockpit-role-strip')
  expect(component).not.toContain('onClick={() => onAction(role.actionKey)}')
  expect(css).toContain('.writing-cockpit-summary-strip')
  expect(css).toContain('.writing-cockpit-details')
})
```

If `useState(false)` is too broad, assert:

```ts
expect(component).toMatch(/const \[cockpitDetailsOpen,\s*setCockpitDetailsOpen\] = useState\(false\)/)
```

- [ ] **Step 2: Update existing aux test if needed**

Test `keeps manual writing visible by collapsing auxiliary writing panels` still expects `novel-writing-aux-rail` strings—those remain for workbench path. Should still pass.

If anything asserts aux-rail always rendered unconditionally, update to allow immersive branch.

- [ ] **Step 3: Run**

```bash
cd ui/web && bun test src/pages/novel-workspace/writingAuxFocusModel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts -t "pickWritingAuxFocusTags|immersive writing aux|writing cockpit collapsed|keeps manual writing|keeps pipeline and model team|dual-mode shell|lets the inner chapter"
```

Expected: new tests pass. Pre-existing 14 delivery-strip failures may still fail if full file run—document; do not “fix” unrelated contracts in this task.

Also:

```bash
cd ui/web && bun test src/pages/novel-workspace/writingAuxFocusModel.test.ts
bun run build:web   # from repo root; link node_modules if worktree
```

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
git commit -m "test(ui): cover writing aux density and cockpit hierarchy"
```

---

### Task 5: Final verification

- [ ] **Step 1: Focused tests**

```bash
cd ui/web && bun test src/pages/novel-workspace/writingAuxFocusModel.test.ts src/pages/novel-workspace/workspaceShellModel.test.ts
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts -t "immersive writing aux|writing cockpit collapsed|keeps manual writing|dual-mode|lets the inner chapter|keeps pipeline and model team|surfaces a direct unattended|keeps chapter writing to one guidance"
```

- [ ] **Step 2: Build**

```bash
bun run build:web
```

- [ ] **Step 3: Manual checklist**

1. Chapter writing + immersive: no full-width aux-rail; toolbar shows chips + 辅助; Popover has queue  
2. 展开工作台: aux-rail returns; stack toggle works  
3. Non-writing area: collapsed cockpit has primary; click works without expand  
4. 展开详情: L1 visible; 写作详情 closed until opened; desks appear when opened  
5. Role strip still not clickable actions  

- [ ] **Step 4:** No empty commit if clean

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Focus tag priority ≤3 | 1 |
| Immersive no in-flow aux-rail; Popover | 2 |
| Workbench rail/stack parity | 2 |
| Pass isImmersiveShell | 2 |
| Cockpit collapsed primary | 3 |
| L1 + L2 default closed | 3 |
| Role strip non-actions | 3 (preserve) + 4 |
| Contracts + build | 4–5 |
| No API / no cockpit in chapter writing | all |

## Placeholder / consistency

- Class names: `novel-writing-immersive-aux*`, `writing-cockpit-summary-*`, `writing-cockpit-details`
- Copy: `辅助`, `展开详情`, `写作详情`
- Prop: `isImmersiveShell`

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-novel-writing-aux-cockpit-density.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with checkpoints  

Which approach?
