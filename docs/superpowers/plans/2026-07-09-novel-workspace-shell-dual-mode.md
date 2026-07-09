# Novel Workspace Dual-Mode Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the novel project workspace page shell into dual modes — immersive writing by default in chapter writing, one-click workbench for full controls — without changing area business logic or APIs.

**Architecture:** Extract pure shell helpers (`workspaceShellModel.ts`) for mode types, localStorage load/save, and derived flags. Wire `shellMode` into `NovelProjectWorkspace` to replace `focusWritingMode`. Drive top-bar control density, CSS root classes, and side-column defaults from `isImmersiveShell`. Keep existing chapter-writing rule: global cockpit + serial pipeline stay hidden in `chapterWriting` (one guidance layer); immersive does **not** reintroduce them there.

**Tech Stack:** React 18, Ant Design 5, TypeScript, bun test (source-contract tests in `workspaceUiShell.test.ts`), CSS in `NovelProjectWorkspace.css`.

**Spec:** `docs/superpowers/specs/2026-07-09-novel-workspace-shell-dual-mode-design.md`

## Global Constraints

- No API / backend changes
- No changes to WorkspaceArea business handlers beyond shell presentation wiring
- Do not re-show global `WritingCockpitPanel` / `renderSerialPipeline()` inside `chapterWriting` (existing contract: one guidance layer)
- Keep task center + shell toggle always reachable in immersive (unlike old focus mode which hid task center)
- Immersive must not force-hide left directory to width 0; use narrow rail via `directoryCollapsed` instead of `display:none` side columns
- Manual open of directory/right panel while immersive does **not** exit immersive
- Leaving `chapterWriting` forces workbench; returning restores remembered writing shell mode
- Extend `workspaceUiShell.test.ts`; do not delete existing shell assertions without replacing equivalent coverage
- Prefer small pure module over more logic dumped into the giant TSX file
- Commit after each task

## File map

| File | Responsibility |
|------|----------------|
| Create: `ui/web/src/pages/novel-workspace/workspaceShellModel.ts` | Types, storage keys, load/save, derive immersive, apply area-change defaults |
| Create: `ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts` | Unit tests for pure shell helpers |
| Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` | Replace focus state; top bar dual layout; body class/collapse wiring |
| Modify: `ui/web/src/pages/NovelProjectWorkspace.css` | Replace/upgrade `.novel-workspace-focus-mode` rules to immersive/workbench shell |
| Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts` | Shell dual-mode source contracts |

---

### Task 1: Pure shell model + unit tests

**Files:**
- Create: `ui/web/src/pages/novel-workspace/workspaceShellModel.ts`
- Create: `ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts`
- Test: `ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts`

**Interfaces:**
- Consumes: none (pure)
- Produces:
  - `export type WorkspaceShellMode = 'immersive' | 'workbench'`
  - `export const NOVEL_WORKSPACE_SHELL_MODE_KEY = 'novel.workspace.shellMode'`
  - `export const NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY = 'novel.workspace.directoryCollapsed.workbench'`
  - `export function loadWorkspaceShellMode(): WorkspaceShellMode`
  - `export function saveWorkspaceShellMode(mode: WorkspaceShellMode): void`
  - `export function loadWorkbenchDirectoryCollapsed(): boolean`
  - `export function saveWorkbenchDirectoryCollapsed(collapsed: boolean): void`
  - `export function isImmersiveShell(shellMode: WorkspaceShellMode, workspaceArea: string): boolean`
  - `export function shellModeForWorkspaceArea(workspaceArea: string, writingShellMode: WorkspaceShellMode): WorkspaceShellMode`  
    → non-`chapterWriting` always `'workbench'`; writing uses `writingShellMode`
  - `export function rootShellClassName(isImmersive: boolean): string`  
    → `'novel-workspace-shell-immersive'` or `'novel-workspace-shell-workbench'`
  - `export function immersiveEnterPanelDefaults(): { directoryCollapsed: true; rightPanelOpen: false }`

- [ ] **Step 1: Write the failing unit tests**

Create `ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts`:

```ts
import { describe, expect, test, beforeEach } from 'bun:test'
import {
  NOVEL_WORKSPACE_SHELL_MODE_KEY,
  NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY,
  loadWorkspaceShellMode,
  saveWorkspaceShellMode,
  loadWorkbenchDirectoryCollapsed,
  saveWorkbenchDirectoryCollapsed,
  isImmersiveShell,
  shellModeForWorkspaceArea,
  rootShellClassName,
  immersiveEnterPanelDefaults,
} from './workspaceShellModel'

describe('workspaceShellModel', () => {
  beforeEach(() => {
    // bun may not have full localStorage; mock if needed
    const store = new Map<string, string>()
    // @ts-expect-error test double
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => { store.clear() },
    }
  })

  test('defaults shell mode to immersive when storage empty', () => {
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('persists and loads shell mode', () => {
    saveWorkspaceShellMode('workbench')
    expect(localStorage.getItem(NOVEL_WORKSPACE_SHELL_MODE_KEY)).toBe('workbench')
    expect(loadWorkspaceShellMode()).toBe('workbench')
    saveWorkspaceShellMode('immersive')
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('ignores invalid stored shell mode', () => {
    localStorage.setItem(NOVEL_WORKSPACE_SHELL_MODE_KEY, 'nope')
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('workbench directory collapsed preference defaults false', () => {
    expect(loadWorkbenchDirectoryCollapsed()).toBe(false)
    saveWorkbenchDirectoryCollapsed(true)
    expect(localStorage.getItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY)).toBe('1')
    expect(loadWorkbenchDirectoryCollapsed()).toBe(true)
  })

  test('immersive only when writing area + immersive mode', () => {
    expect(isImmersiveShell('immersive', 'chapterWriting')).toBe(true)
    expect(isImmersiveShell('workbench', 'chapterWriting')).toBe(false)
    expect(isImmersiveShell('immersive', 'storyPlanning')).toBe(false)
  })

  test('area change forces workbench outside writing', () => {
    expect(shellModeForWorkspaceArea('storyPlanning', 'immersive')).toBe('workbench')
    expect(shellModeForWorkspaceArea('chapterWriting', 'immersive')).toBe('immersive')
    expect(shellModeForWorkspaceArea('chapterWriting', 'workbench')).toBe('workbench')
  })

  test('root class names', () => {
    expect(rootShellClassName(true)).toBe('novel-workspace-shell-immersive')
    expect(rootShellClassName(false)).toBe('novel-workspace-shell-workbench')
  })

  test('immersive enter panel defaults', () => {
    expect(immersiveEnterPanelDefaults()).toEqual({
      directoryCollapsed: true,
      rightPanelOpen: false,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceShellModel.test.ts
```

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement `workspaceShellModel.ts`**

```ts
export type WorkspaceShellMode = 'immersive' | 'workbench'

export const NOVEL_WORKSPACE_SHELL_MODE_KEY = 'novel.workspace.shellMode'
export const NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY = 'novel.workspace.directoryCollapsed.workbench'

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null
    const storage = (globalThis as any).localStorage
    if (!storage || typeof storage.getItem !== 'function') return null
    return storage as Storage
  } catch {
    return null
  }
}

export function loadWorkspaceShellMode(): WorkspaceShellMode {
  const raw = safeStorage()?.getItem(NOVEL_WORKSPACE_SHELL_MODE_KEY)
  if (raw === 'workbench' || raw === 'immersive') return raw
  return 'immersive'
}

export function saveWorkspaceShellMode(mode: WorkspaceShellMode): void {
  try {
    safeStorage()?.setItem(NOVEL_WORKSPACE_SHELL_MODE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
}

export function loadWorkbenchDirectoryCollapsed(): boolean {
  const raw = safeStorage()?.getItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY)
  return raw === '1' || raw === 'true'
}

export function saveWorkbenchDirectoryCollapsed(collapsed: boolean): void {
  try {
    safeStorage()?.setItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

export function isImmersiveShell(shellMode: WorkspaceShellMode, workspaceArea: string): boolean {
  return shellMode === 'immersive' && workspaceArea === 'chapterWriting'
}

export function shellModeForWorkspaceArea(
  workspaceArea: string,
  writingShellMode: WorkspaceShellMode,
): WorkspaceShellMode {
  if (workspaceArea !== 'chapterWriting') return 'workbench'
  return writingShellMode
}

export function rootShellClassName(isImmersive: boolean): string {
  return isImmersive ? 'novel-workspace-shell-immersive' : 'novel-workspace-shell-workbench'
}

export function immersiveEnterPanelDefaults(): { directoryCollapsed: true; rightPanelOpen: false } {
  return { directoryCollapsed: true, rightPanelOpen: false }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceShellModel.test.ts
```

Expected: PASS all tests

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspaceShellModel.ts ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts
git commit -m "feat(ui): add novel workspace shell mode model"
```

---

### Task 2: Wire `shellMode` into NovelProjectWorkspace state

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` (imports + state block ~326–340 + root class ~6619–6621 + focus toggle ~6692–6701)
- Test: extend contracts in Task 5; smoke via existing shell suite after wiring

**Interfaces:**
- Consumes: all exports from Task 1
- Produces: component uses `writingShellMode` + derived `shellMode` / `isImmersiveShell` instead of `focusWritingMode` / `isWritingFocusMode`

- [ ] **Step 1: Add imports**

Near other novel-workspace imports:

```ts
import {
  immersiveEnterPanelDefaults,
  isImmersiveShell as deriveIsImmersiveShell,
  loadWorkbenchDirectoryCollapsed,
  loadWorkspaceShellMode,
  rootShellClassName,
  saveWorkbenchDirectoryCollapsed,
  saveWorkspaceShellMode,
  shellModeForWorkspaceArea,
  type WorkspaceShellMode,
} from './novel-workspace/workspaceShellModel'
```

- [ ] **Step 2: Replace focus state with shell state**

Remove:

```ts
const [focusWritingMode, setFocusWritingMode] = useState(false)
// ...
const isWritingFocusMode = focusWritingMode && workspaceArea === 'chapterWriting'
// ...
useEffect(() => {
  if (workspaceArea !== 'chapterWriting') setFocusWritingMode(false)
}, [workspaceArea])
```

Add:

```ts
const [writingShellMode, setWritingShellMode] = useState<WorkspaceShellMode>(() => loadWorkspaceShellMode())
const [directoryCollapsed, setDirectoryCollapsed] = useState(() => loadWorkbenchDirectoryCollapsed())
// keep existing rightPanelOpen; do not change its useState line beyond later immersive enter

const shellMode = shellModeForWorkspaceArea(workspaceArea, writingShellMode)
const isImmersiveShell = deriveIsImmersiveShell(shellMode, workspaceArea)
const showGlobalWritingGuidance = workspaceArea !== 'chapterWriting'
const directoryShellClassName = directoryCollapsed
  ? 'novel-workspace-directory-shell is-collapsed'
  : 'novel-workspace-directory-shell'

const setShellMode = useCallback((mode: WorkspaceShellMode) => {
  setWritingShellMode(mode)
  saveWorkspaceShellMode(mode)
  if (mode === 'immersive') {
    const defaults = immersiveEnterPanelDefaults()
    setDirectoryCollapsed(defaults.directoryCollapsed)
    setRightPanelOpen(defaults.rightPanelOpen)
  } else {
    // restore workbench directory preference when leaving immersive
    setDirectoryCollapsed(loadWorkbenchDirectoryCollapsed())
  }
}, [])

// Persist workbench directory fold when user toggles while not immersive
const handleDirectoryCollapsedChange = useCallback((collapsed: boolean) => {
  setDirectoryCollapsed(collapsed)
  if (!isImmersiveShell) {
    saveWorkbenchDirectoryCollapsed(collapsed)
  }
}, [isImmersiveShell])
```

Notes:
- If `directoryCollapsed` was already declared, merge carefully — only one `useState` for it.
- `setRightPanelOpen` already exists; immersive enter closes it via `setShellMode('immersive')`.

- [ ] **Step 3: Root className**

Replace:

```ts
className={`novel-project-workspace ${isWritingFocusMode ? 'novel-workspace-focus-mode' : ''}`}
```

With:

```ts
className={`novel-project-workspace ${rootShellClassName(isImmersiveShell)}`}
```

- [ ] **Step 4: Shell toggle button (temporary copy ok; Task 3 polishes layout)**

Replace focus toggle block so it always can enter immersive only in writing:

```tsx
{workspaceArea === 'chapterWriting' && (
  <Button
    className="novel-workspace-shell-toggle"
    type={isImmersiveShell ? 'default' : 'primary'}
    size="small"
    icon={isImmersiveShell ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
    onClick={() => setShellMode(isImmersiveShell ? 'workbench' : 'immersive')}
  >
    {isImmersiveShell ? '展开工作台' : '沉浸写作'}
  </Button>
)}
```

- [ ] **Step 5: Directory collapse handler + aria**

- Pass `onCollapsedChange={handleDirectoryCollapsedChange}` instead of `setDirectoryCollapsed`
- Change `aria-hidden={isWritingFocusMode || undefined}` → remove force-hide; do **not** set `aria-hidden` for immersive (directory stays usable as rail). Delete any `aria-hidden={isImmersiveShell}` if it would hide an interactive rail.

- [ ] **Step 6: Cockpit forceCollapsed**

Keep:

```ts
forceCollapsed={isImmersiveShell}
```

only if cockpit is still rendered under `showGlobalWritingGuidance`. In chapter writing cockpit stays unmounted — that is correct. For non-writing areas `isImmersiveShell` is false so no change.

- [ ] **Step 7: Grep for leftovers**

```bash
rg "focusWritingMode|isWritingFocusMode|setFocusWritingMode|novel-workspace-focus-mode|专注写作|退出专注" ui/web/src/pages/NovelProjectWorkspace.tsx
```

Expected: no matches (or only comments you intentionally keep — prefer zero).

- [ ] **Step 8: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat(ui): wire dual shell mode into novel workspace state"
```

---

### Task 3: Dual-mode top bar structure

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` (~6624–6712 top bar JSX)
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css` (top bar zones)

**Interfaces:**
- Consumes: `isImmersiveShell`, `shellMode`, `setShellMode`, existing model/task/readiness props
- Produces: three-zone top bar; immersive overflow menu with class `novel-workspace-topbar-more`

- [ ] **Step 1: Restructure top bar JSX**

Target structure (replace the current single flat flex row content grouping, keep same outer `novel-workspace-topbar` container):

```tsx
<div className="novel-workspace-topbar">
  <div className="novel-workspace-topbar-left">
    <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/novel')} />
    <Title level={5} className="novel-workspace-title">
      {selectedProject?.title || '小说项目工作台'}
    </Title>
  </div>

  <div className="novel-workspace-topbar-center">
    <div className="novel-workspace-area-tabs" role="tablist" aria-label="工作区">
      {workspaceAreaTabs.map(tab => (
        <Button
          key={tab.key}
          size="small"
          type="text"
          icon={tab.icon}
          role="tab"
          aria-selected={workspaceArea === tab.key}
          className={`novel-mode-tab novel-mode-tab-${tab.key} ${workspaceArea === tab.key ? 'is-active' : ''}`}
          onClick={() => setWorkspaceArea(tab.key)}
        >
          <span className="novel-mode-tab-label">{tab.label}</span>
        </Button>
      ))}
    </div>
  </div>

  <div className="novel-workspace-topbar-right">
    {!isImmersiveShell && (
      <>
        <Select
          className="novel-workspace-model-select"
          size="small"
          value={selectedModelId}
          onChange={(v) => setSelectedModelId(v)}
          options={modelOptions}
          popupMatchSelectWidth={440}
          placeholder="选择模型"
        />
        <Space className="novel-workspace-topbar-meta" size={6}>
          {/* keep existing referenceSummary + commercialReadiness Tag blocks unchanged */}
        </Space>
        <Tooltip title="进入无人值守生产入口">
          <Button
            className={`novel-unattended-topbar-entry ${workspaceArea === 'productionOps' ? 'is-active' : ''}`}
            size="small"
            icon={<RocketOutlined />}
            onClick={() => setWorkspaceArea('productionOps')}
          >
            无人值守
          </Button>
        </Tooltip>
        <Tooltip title="打开当前节点的创作参谋建议">
          <Button type="text" size="small" icon={<BulbOutlined />} onClick={openCreativeAssistant}>
            创作参谋
          </Button>
        </Tooltip>
        <Tooltip title="刷新">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={async () => { if (await flushPendingSave()) await loadProjectModules() }}
          />
        </Tooltip>
      </>
    )}

    {isImmersiveShell && (
      <Dropdown
        menu={{
          items: [
            {
              key: 'model',
              label: (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    className="novel-workspace-model-select novel-workspace-model-select-menu"
                    size="small"
                    value={selectedModelId}
                    onChange={(v) => setSelectedModelId(v)}
                    options={modelOptions}
                    popupMatchSelectWidth={440}
                    placeholder="选择模型"
                    style={{ width: 200 }}
                  />
                </div>
              ),
            },
            {
              key: 'assistant',
              icon: <BulbOutlined />,
              label: '创作参谋',
              onClick: () => openCreativeAssistant(),
            },
            {
              key: 'unattended',
              icon: <RocketOutlined />,
              label: '无人值守',
              onClick: () => setWorkspaceArea('productionOps'),
            },
            {
              key: 'refresh',
              icon: <ReloadOutlined />,
              label: '刷新',
              onClick: async () => { if (await flushPendingSave()) await loadProjectModules() },
            },
          ],
        }}
        trigger={['click']}
      >
        <Button type="text" size="small" className="novel-workspace-topbar-more" icon={<MoreOutlined />}>
          更多
        </Button>
      </Dropdown>
    )}

    {workspaceArea === 'chapterWriting' && (
      <Button
        className="novel-workspace-shell-toggle"
        type={isImmersiveShell ? 'default' : 'primary'}
        size="small"
        icon={isImmersiveShell ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={() => setShellMode(isImmersiveShell ? 'workbench' : 'immersive')}
      >
        {isImmersiveShell ? '展开工作台' : '沉浸写作'}
      </Button>
    )}

    <Tooltip title="查看运行中任务和历史运行记录">
      <Badge className="novel-workspace-task-entry" count={activeTasks.length + activeKnowledgeJobCount} size="small">
        <Button type="text" size="small" icon={<ClockCircleOutlined />} onClick={() => setTaskCenterOpen(true)}>
          任务中心
        </Button>
      </Badge>
    </Tooltip>
  </div>
</div>
```

Import additions if missing: `Dropdown` from `antd`, `MoreOutlined` from icons.

Remove the old standalone unattended button duplication outside this structure. Keep readiness tags only in workbench meta (optional: also surface readiness score as a disabled menu item in immersive — not required).

- [ ] **Step 2: CSS top bar zones**

Add/replace in `NovelProjectWorkspace.css`:

```css
.novel-workspace-topbar {
  flex-shrink: 0;
  height: 48px;
  display: grid;
  grid-template-columns: minmax(140px, 0.9fr) minmax(0, 1.6fr) minmax(200px, 1.1fr);
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 8px;
  background: #fff;
  border-bottom: 1px solid #e8eef5;
  overflow: hidden;
}

.novel-workspace-topbar-left,
.novel-workspace-topbar-center,
.novel-workspace-topbar-right {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.novel-workspace-topbar-center {
  justify-content: center;
  overflow-x: auto;
  scrollbar-width: none;
}

.novel-workspace-topbar-center::-webkit-scrollbar {
  display: none;
}

.novel-workspace-topbar-right {
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.novel-workspace-title.ant-typography {
  margin: 0 !important;
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.novel-workspace-area-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 10px;
  background: #f5f7fb;
  border: 1px solid #e8eef5;
  min-width: max-content;
}

.novel-workspace-area-tabs .ant-space-item {
  flex: 0 0 auto;
}

.novel-mode-tab {
  border-radius: 8px !important;
  color: #475569;
  font-weight: 600;
  border: 1px solid transparent !important;
}

.novel-mode-tab.is-active {
  box-shadow: none;
  font-weight: 700;
}

/* keep existing per-area active color rules */

.novel-workspace-shell-toggle {
  flex: 0 0 auto;
  font-weight: 700;
}

.novel-workspace-task-entry {
  position: sticky;
  right: 0;
  z-index: 2;
  background: #fff;
}

.novel-workspace-shell-immersive .novel-mode-tab-label {
  /* optional: keep labels; do not force icon-only unless needed */
}
```

Remove obsolete rules that hid task entry under focus mode (Task 4 covers full focus-mode deletion).

- [ ] **Step 3: Manual sanity (dev optional)**

If UI is running, open a novel workspace → chapter writing → confirm:
- Immersive: More + 展开工作台 + 任务中心 visible; model select not in main row
- Workbench: model, unattended, assistant, refresh visible; 沉浸写作 visible

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx ui/web/src/pages/NovelProjectWorkspace.css
git commit -m "feat(ui): dual-mode top bar for novel workspace shell"
```

---

### Task 4: Immersive body layout CSS (side rails, not hide-to-zero)

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx` only if body wrappers need classes

**Critical behavior change vs old focus mode:**
Old `.novel-workspace-focus-mode` set directory + reference to `width: 0` and hid task entry. Spec requires immersive = **narrow rail + closable reference**, not vanishing columns.

- [ ] **Step 1: Delete or neutralize old focus-mode hide rules**

Remove these rules (or replace wholesale):

```css
.novel-workspace-focus-mode .novel-workspace-model-select,
.novel-workspace-focus-mode .novel-workspace-topbar-meta,
.novel-workspace-focus-mode .novel-workspace-task-entry {
  display: none !important;
}

.novel-workspace-focus-mode .novel-workspace-directory-shell,
.novel-workspace-focus-mode .novel-workspace-reference-shell {
  width: 0 !important;
  flex: 0 0 0 !important;
  /* ... */
}
```

- [ ] **Step 2: Add immersive shell body styles**

```css
.novel-project-workspace.novel-workspace-shell-immersive,
.novel-project-workspace.novel-workspace-shell-workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.novel-workspace-shell-immersive .novel-workspace-main {
  background: #fbfcfe;
}

.novel-workspace-shell-immersive .novel-workspace-body {
  /* keep flex row; do not zero side columns */
}

/* Immersive: prefer editor height; lighter chrome */
.novel-workspace-shell-immersive .novel-workspace-cockpit {
  max-height: 54px;
}

.novel-workspace-shell-workbench .novel-workspace-main {
  background: #fff;
}

/* Ensure collapsed directory rail remains interactive in immersive */
.novel-workspace-shell-immersive .novel-workspace-directory-shell.is-collapsed {
  width: 48px;
  flex: 0 0 48px;
  opacity: 1;
  pointer-events: auto;
  overflow: hidden;
}

.novel-workspace-shell-immersive .novel-workspace-reference-shell:not(.is-open) {
  /* keep existing closed width behavior from current CSS; do not force 0 beyond existing closed state */
}
```

Search file for remaining `focus-mode` and update media-query variants (~566) to `shell-immersive` equivalents that **do not** hide the directory rail to zero.

- [ ] **Step 3: Ensure entering immersive collapses directory**

Already handled by `setShellMode('immersive')` in Task 2. On **first load** if `writingShellMode === 'immersive'` and user lands on writing later, when `setWorkspaceArea('chapterWriting')` or initial area is writing, apply panel defaults once:

Add effect:

```ts
useEffect(() => {
  if (!isImmersiveShell) return
  const defaults = immersiveEnterPanelDefaults()
  setDirectoryCollapsed(defaults.directoryCollapsed)
  // do not forcibly close right panel on every render — only when transitioning into immersive
}, [isImmersiveShell])
```

**Better:** track previous immersive with ref to apply defaults only on false→true edge:

```ts
const wasImmersiveRef = useRef(false)
useEffect(() => {
  if (isImmersiveShell && !wasImmersiveRef.current) {
    const defaults = immersiveEnterPanelDefaults()
    setDirectoryCollapsed(defaults.directoryCollapsed)
    setRightPanelOpen(defaults.rightPanelOpen)
  }
  wasImmersiveRef.current = isImmersiveShell
}, [isImmersiveShell])
```

If this duplicates `setShellMode`, keep **only** the edge effect OR only setShellMode — prefer single path: defaults applied in `setShellMode('immersive')` + edge effect when area becomes writing while `writingShellMode` already immersive:

```ts
useEffect(() => {
  if (workspaceArea !== 'chapterWriting') return
  if (writingShellMode !== 'immersive') return
  // when landing on writing already immersive (e.g. restored preference), apply enter defaults once per entry
}, [workspaceArea, writingShellMode])
```

Implement with a ref `lastWritingEntryKey` to avoid fighting manual expand.

Recommended implementation:

```ts
const lastImmersiveEntryToken = useRef(0)
useEffect(() => {
  if (!isImmersiveShell) return
  lastImmersiveEntryToken.current += 1
  const defaults = immersiveEnterPanelDefaults()
  setDirectoryCollapsed(defaults.directoryCollapsed)
  setRightPanelOpen(defaults.rightPanelOpen)
}, [isImmersiveShell])
```

Note: this re-applies whenever `isImmersiveShell` toggles true. Manual expand while immersive is fine until next exit/re-enter.

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.css ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat(ui): immersive shell layout without zero-width side columns"
```

---

### Task 5: Shell contract tests + full writing-cockpit suite

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`
- Optionally add model tests already in Task 1

- [ ] **Step 1: Add dual-mode shell contract test**

Append to `workspaceUiShell.test.ts`:

```ts
test('dual-mode shell replaces focus mode with immersive/workbench classes and always-on task center', () => {
  const projectWorkspace = source('../NovelProjectWorkspace.tsx')
  const projectWorkspaceCss = source('../NovelProjectWorkspace.css')
  const shellModel = source('workspaceShellModel.ts')

  expect(shellModel).toContain("export type WorkspaceShellMode = 'immersive' | 'workbench'")
  expect(shellModel).toContain('novel.workspace.shellMode')
  expect(shellModel).toContain('isImmersiveShell')

  expect(projectWorkspace).toContain('writingShellMode')
  expect(projectWorkspace).toContain('setShellMode')
  expect(projectWorkspace).toContain('rootShellClassName')
  expect(projectWorkspace).toContain('展开工作台')
  expect(projectWorkspace).toContain('沉浸写作')
  expect(projectWorkspace).toContain('novel-workspace-topbar-left')
  expect(projectWorkspace).toContain('novel-workspace-topbar-center')
  expect(projectWorkspace).toContain('novel-workspace-topbar-right')
  expect(projectWorkspace).toContain('novel-workspace-topbar-more')
  expect(projectWorkspace).toContain('novel-workspace-task-entry')

  expect(projectWorkspace).not.toContain('focusWritingMode')
  expect(projectWorkspace).not.toContain('isWritingFocusMode')
  expect(projectWorkspace).not.toContain('专注写作')
  expect(projectWorkspace).not.toContain('退出专注')
  expect(projectWorkspace).not.toContain('novel-workspace-focus-mode')

  expect(projectWorkspaceCss).toContain('.novel-workspace-shell-immersive')
  expect(projectWorkspaceCss).toContain('.novel-workspace-shell-workbench')
  expect(projectWorkspaceCss).toContain('.novel-workspace-topbar-left')
  expect(projectWorkspaceCss).not.toContain('.novel-workspace-focus-mode .novel-workspace-task-entry')
  expect(projectWorkspaceCss).not.toContain('.novel-workspace-focus-mode .novel-workspace-directory-shell')
})

test('immersive writing keeps global cockpit hidden and does not zero-hide directory by focus class', () => {
  const projectWorkspace = source('../NovelProjectWorkspace.tsx')
  const projectWorkspaceCss = source('../NovelProjectWorkspace.css')

  expect(projectWorkspace).toContain('showGlobalWritingGuidance')
  expect(projectWorkspace).toContain("workspaceArea !== 'chapterWriting'")
  expect(projectWorkspace).toContain('{showGlobalWritingGuidance && (')
  expect(projectWorkspace).toContain('{showGlobalWritingGuidance && renderSerialPipeline()}')
  expect(projectWorkspaceCss).toContain('.novel-workspace-directory-shell.is-collapsed')
  expect(projectWorkspaceCss).toContain('flex: 0 0 48px')
})
```

- [ ] **Step 2: Update any broken existing assertions**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio && bun run test:writing-cockpit
```

If failures mention old strings (`专注写作`, `focusWritingMode`, focus CSS), update **only** those obsolete assertions to the new dual-mode contracts — do not weaken primary-action / queue / role-strip tests.

- [ ] **Step 3: Run shell model + shell tests explicitly**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceShellModel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: PASS

- [ ] **Step 4: Build web (typecheck via vite build)**

```bash
cd /Users/ruiyaosong/MangaForge-Studio && bun run build:web
```

Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts ui/web/src/pages/NovelProjectWorkspace.tsx ui/web/src/pages/NovelProjectWorkspace.css ui/web/src/pages/novel-workspace/workspaceShellModel.ts ui/web/src/pages/novel-workspace/workspaceShellModel.test.ts
git commit -m "test(ui): cover novel workspace dual-mode shell contracts"
```

---

### Task 6: Final verification pass

**Files:** none new; verify only

- [ ] **Step 1: Run full related tests**

```bash
cd /Users/ruiyaosong/MangaForge-Studio && bun run test:writing-cockpit && bun run build:web
```

Expected: all pass; build ok

- [ ] **Step 2: Manual checklist (if UI available)**

1. Open novel workspace → switch to 章节写作  
2. Default immersive: compact top bar, More menu, 展开工作台, 任务中心 visible, directory narrow rail, no global cockpit/pipeline  
3. Expand directory manually → still immersive  
4. Open reference panel → still immersive  
5. Click 展开工作台 → full chrome, 沉浸写作 button, model select visible  
6. Switch to 故事规划 → workbench; back to 章节写作 → restores last writing shell mode  
7. Refresh page → shell mode preference restored  

- [ ] **Step 3: Commit only if verification fixed stragglers; otherwise done**

If no further code changes, skip empty commit.

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|------------------|------|
| Dual shell modes immersive/workbench | 1, 2 |
| Default immersive in chapter writing | 1 default + 2 state |
| Top bar left/center/right | 3 |
| Immersive overflow More menu | 3 |
| Always-on task center + shell toggle | 3, 4 (remove old hide) |
| Directory narrow rail not width 0 | 4 |
| Manual panel open keeps immersive | 2 setShellMode + 4 edge effect only on enter |
| Leave writing → workbench | 1 `shellModeForWorkspaceArea` + 2 |
| localStorage shell + workbench directory | 1, 2 |
| No global cockpit in chapter writing | preserved; Task 5 asserts |
| Shell tests extended | 5 |
| No API changes | all tasks |

## Placeholder / consistency notes

- Use exact class names: `novel-workspace-shell-immersive`, `novel-workspace-shell-workbench`, `novel-workspace-shell-toggle`, `novel-workspace-topbar-more`
- Copy: `展开工作台` / `沉浸写作` (not 专注写作)
- State name: `writingShellMode` (persisted preference) vs derived `shellMode` / `isImmersiveShell`

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-novel-workspace-shell-dual-mode.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
