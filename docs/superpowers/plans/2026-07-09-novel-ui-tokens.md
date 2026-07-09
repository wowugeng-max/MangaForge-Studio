# Novel Product-Line UI Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a novel-scoped design token system (CSS + TS + Ant Design ConfigProvider) and align novel product-line surfaces to it in phases without changing non-novel pages or business logic.

**Architecture:** Define `--novel-*` variables on `.novel-theme-root` and a matching `novelAntdTheme`. Wrap only novel routes (`/novel`, `/novel/workspace/:id`, `/novel/workspace/:id/production`) in `NovelThemeProvider`. Phase CSS migrations from workspace shell outward to subsystem panels, then NovelStudio and production desk.

**Tech Stack:** React 18, Ant Design 5 `ConfigProvider` / `ThemeConfig`, CSS custom properties, TypeScript, bun test, Vite.

**Spec:** `docs/superpowers/specs/2026-07-09-novel-ui-tokens-design.md`

## Global Constraints

- Novel routes only: `novel`, `novel/workspace/:id`, `novel/workspace/:id/production` (as in `router.tsx`)
- Do **not** wrap Canvas, Assets, Models, Keys, Providers, Pipeline, StudioHome
- Token values must match the approved spec (primary `#1677ff`, controlHeight 32 / SM 28, radius 8, weights 400/600/700)
- No API or workflow logic changes
- Prefer `var(--novel-*)` over new component wrappers (no NovelButton v1)
- Keep dual-mode shell, writing aux, cockpit contracts green
- Commit after each task
- Pre-existing unrelated test failures outside novel tokens are out of scope

## File map

| File | Responsibility |
|------|----------------|
| Create: `ui/web/src/styles/novel-tokens.css` | CSS variables on `.novel-theme-root` |
| Create: `ui/web/src/styles/novelUiTokens.ts` | TS tokens + `novelAntdTheme` |
| Create: `ui/web/src/styles/NovelThemeProvider.tsx` | ConfigProvider + root class |
| Create: `ui/web/src/styles/novelUiTokens.test.ts` | Token/theme contracts |
| Create: `ui/web/src/styles/novelThemeRouting.test.ts` | Router wraps novel paths only |
| Modify: `ui/web/src/router.tsx` | Novel layout route with provider |
| Modify: novel CSS files (phased) | Replace hard-coded radii/weights/heights/colors |
| Modify: light TSX only when replacing critical inline styles on novel pages |

---

### Task 1: Token CSS + TS + unit tests (Phase 0 foundation)

**Files:**
- Create: `ui/web/src/styles/novel-tokens.css`
- Create: `ui/web/src/styles/novelUiTokens.ts`
- Create: `ui/web/src/styles/novelUiTokens.test.ts`

**Interfaces:**
```ts
export const novelUiTokens = {
  color: { primary, primarySoft, success, successSoft, warning, warningSoft, danger, dangerSoft, text, textSecondary, border, borderStrong, bg, bgMuted, bgCanvas },
  radius: { sm: 6, md: 8, lg: 10, pill: 999 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  font: {
    size: { xs: 12, sm: 13, md: 14, lg: 16 },
    weight: { regular: 400, medium: 600, bold: 700 },
  },
  control: { heightSm: 28, heightMd: 32, heightLg: 36 },
  progress: { heightSm: 6, heightMd: 8 },
  shell: { topbarHeight: 48, directoryWidth: 240, directoryCollapsed: 48 },
} as const

export const novelAntdTheme: ThemeConfig // Ant Design 5
export const NOVEL_THEME_ROOT_CLASS = 'novel-theme-root'
```

- [ ] **Step 1: Write failing tests** `novelUiTokens.test.ts`

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { novelUiTokens, novelAntdTheme, NOVEL_THEME_ROOT_CLASS } from './novelUiTokens'

describe('novelUiTokens', () => {
  test('exports approved color and control values', () => {
    expect(novelUiTokens.color.primary).toBe('#1677ff')
    expect(novelUiTokens.color.success).toBe('#16a34a')
    expect(novelUiTokens.color.warning).toBe('#d97706')
    expect(novelUiTokens.color.danger).toBe('#dc2626')
    expect(novelUiTokens.color.border).toBe('#e8eef5')
    expect(novelUiTokens.radius.md).toBe(8)
    expect(novelUiTokens.radius.pill).toBe(999)
    expect(novelUiTokens.control.heightSm).toBe(28)
    expect(novelUiTokens.control.heightMd).toBe(32)
    expect(novelUiTokens.font.weight.bold).toBe(700)
    expect(novelUiTokens.progress.heightSm).toBe(6)
    expect(NOVEL_THEME_ROOT_CLASS).toBe('novel-theme-root')
  })

  test('novelAntdTheme maps core tokens for Button Progress Tag Card', () => {
    expect(novelAntdTheme.token?.colorPrimary).toBe('#1677ff')
    expect(novelAntdTheme.token?.borderRadius).toBe(8)
    expect(novelAntdTheme.token?.controlHeight).toBe(32)
    expect(novelAntdTheme.token?.controlHeightSM).toBe(28)
    expect(novelAntdTheme.components?.Button).toBeTruthy()
    expect(novelAntdTheme.components?.Progress).toBeTruthy()
    expect(novelAntdTheme.components?.Tag).toBeTruthy()
    expect(novelAntdTheme.components?.Card).toBeTruthy()
  })

  test('css variables file defines novel-theme-root and key vars', () => {
    const css = readFileSync(join(import.meta.dir, 'novel-tokens.css'), 'utf8')
    expect(css).toContain('.novel-theme-root')
    expect(css).toContain('--novel-color-primary: #1677ff')
    expect(css).toContain('--novel-control-height-md: 32px')
    expect(css).toContain('--novel-radius-md: 8px')
    expect(css).toContain('--novel-progress-height-sm: 6px')
  })
})
```

- [ ] **Step 2: Run fail**

```bash
cd ui/web && bun test src/styles/novelUiTokens.test.ts
```

- [ ] **Step 3: Implement `novel-tokens.css`**

```css
.novel-theme-root {
  --novel-color-primary: #1677ff;
  --novel-color-primary-soft: #eff6ff;
  --novel-color-success: #16a34a;
  --novel-color-success-soft: #f0fdf4;
  --novel-color-warning: #d97706;
  --novel-color-warning-soft: #fffbeb;
  --novel-color-danger: #dc2626;
  --novel-color-danger-soft: #fef2f2;
  --novel-color-text: #0f172a;
  --novel-color-text-secondary: #64748b;
  --novel-color-border: #e8eef5;
  --novel-color-border-strong: #dfe7f1;
  --novel-color-bg: #ffffff;
  --novel-color-bg-muted: #f5f7fb;
  --novel-color-bg-canvas: #fbfcfe;

  --novel-radius-sm: 6px;
  --novel-radius-md: 8px;
  --novel-radius-lg: 10px;
  --novel-radius-pill: 999px;

  --novel-space-1: 4px;
  --novel-space-2: 8px;
  --novel-space-3: 12px;
  --novel-space-4: 16px;
  --novel-space-5: 20px;
  --novel-space-6: 24px;

  --novel-font-size-xs: 12px;
  --novel-font-size-sm: 13px;
  --novel-font-size-md: 14px;
  --novel-font-size-lg: 16px;
  --novel-font-weight-regular: 400;
  --novel-font-weight-medium: 600;
  --novel-font-weight-bold: 700;

  --novel-control-height-sm: 28px;
  --novel-control-height-md: 32px;
  --novel-control-height-lg: 36px;

  --novel-progress-height-sm: 6px;
  --novel-progress-height-md: 8px;

  --novel-shell-topbar-height: 48px;
  --novel-shell-directory-width: 240px;
  --novel-shell-directory-collapsed: 48px;

  color: var(--novel-color-text);
  background: var(--novel-color-bg);
}

/* Shared novel control helpers (optional classes for pill CTAs / progress) */
.novel-theme-root .novel-btn-pill.ant-btn {
  border-radius: var(--novel-radius-pill) !important;
  font-weight: var(--novel-font-weight-bold);
}

.novel-theme-root .ant-progress-line .ant-progress-outer,
.novel-theme-root .ant-progress-line .ant-progress-inner {
  border-radius: var(--novel-radius-pill);
}

.novel-theme-root .ant-progress-bg {
  height: var(--novel-progress-height-sm) !important;
  border-radius: var(--novel-radius-pill) !important;
}

.novel-theme-root .ant-tag {
  border-radius: var(--novel-radius-pill);
  font-weight: var(--novel-font-weight-medium);
}
```

- [ ] **Step 4: Implement `novelUiTokens.ts`**

```ts
import type { ThemeConfig } from 'antd'

export const NOVEL_THEME_ROOT_CLASS = 'novel-theme-root'

export const novelUiTokens = {
  color: {
    primary: '#1677ff',
    primarySoft: '#eff6ff',
    success: '#16a34a',
    successSoft: '#f0fdf4',
    warning: '#d97706',
    warningSoft: '#fffbeb',
    danger: '#dc2626',
    dangerSoft: '#fef2f2',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e8eef5',
    borderStrong: '#dfe7f1',
    bg: '#ffffff',
    bgMuted: '#f5f7fb',
    bgCanvas: '#fbfcfe',
  },
  radius: { sm: 6, md: 8, lg: 10, pill: 999 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  font: {
    size: { xs: 12, sm: 13, md: 14, lg: 16 },
    weight: { regular: 400, medium: 600, bold: 700 },
  },
  control: { heightSm: 28, heightMd: 32, heightLg: 36 },
  progress: { heightSm: 6, heightMd: 8 },
  shell: { topbarHeight: 48, directoryWidth: 240, directoryCollapsed: 48 },
} as const

export const novelAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: novelUiTokens.color.primary,
    colorSuccess: novelUiTokens.color.success,
    colorWarning: novelUiTokens.color.warning,
    colorError: novelUiTokens.color.danger,
    colorText: novelUiTokens.color.text,
    colorTextSecondary: novelUiTokens.color.textSecondary,
    colorBorder: novelUiTokens.color.border,
    colorBgContainer: novelUiTokens.color.bg,
    borderRadius: novelUiTokens.radius.md,
    controlHeight: novelUiTokens.control.heightMd,
    controlHeightSM: novelUiTokens.control.heightSm,
    controlHeightLG: novelUiTokens.control.heightLg,
    fontSize: novelUiTokens.font.size.md,
  },
  components: {
    Button: {
      borderRadius: novelUiTokens.radius.md,
      controlHeight: novelUiTokens.control.heightMd,
      controlHeightSM: novelUiTokens.control.heightSm,
      controlHeightLG: novelUiTokens.control.heightLg,
      fontWeight: novelUiTokens.font.weight.bold,
    },
    Progress: {
      defaultColor: novelUiTokens.color.primary,
      remainingColor: novelUiTokens.color.bgMuted,
    },
    Tag: {
      borderRadiusSM: novelUiTokens.radius.pill,
      defaultBg: novelUiTokens.color.bgMuted,
    },
    Card: {
      borderRadiusLG: novelUiTokens.radius.md,
    },
  },
}
```

- [ ] **Step 5: Tests pass + commit**

```bash
cd ui/web && bun test src/styles/novelUiTokens.test.ts
git add ui/web/src/styles/novel-tokens.css ui/web/src/styles/novelUiTokens.ts ui/web/src/styles/novelUiTokens.test.ts
git commit -m "feat(ui): add novel product-line design tokens"
```

---

### Task 2: NovelThemeProvider + router wrap (Phase 0)

**Files:**
- Create: `ui/web/src/styles/NovelThemeProvider.tsx`
- Create: `ui/web/src/styles/novelThemeRouting.test.ts`
- Modify: `ui/web/src/router.tsx`

**Interfaces:**
```tsx
export function NovelThemeProvider({ children }: { children: React.ReactNode }): JSX.Element
// root: className={NOVEL_THEME_ROOT_CLASS}, ConfigProvider theme={novelAntdTheme}
```

- [ ] **Step 1: Routing contract test (source)**

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(rel: string) {
  return readFileSync(join(import.meta.dir, rel), 'utf8')
}

describe('novel theme routing', () => {
  test('wraps only novel routes with NovelThemeProvider', () => {
    const router = source('../router.tsx')
    expect(router).toContain('NovelThemeProvider')
    expect(router).toContain("path: 'novel'")
    // novel children under a layout element that uses provider
    expect(router).toMatch(/NovelThemeProvider/)
    // non-novel routes remain direct page() without requiring provider on canvas
    expect(router).toContain("path: 'canvas'")
    expect(router).toContain("path: 'models'")
    // Provider should not wrap root Layout exclusively for all children
    // Assert structure: a parent route path novel with element NovelThemeProvider + Outlet
    expect(router).toContain('Outlet')
  })

  test('provider file mounts theme root class and antd theme', () => {
    const provider = source('NovelThemeProvider.tsx')
    expect(provider).toContain('ConfigProvider')
    expect(provider).toContain('novelAntdTheme')
    expect(provider).toContain('NOVEL_THEME_ROOT_CLASS')
    expect(provider).toContain('novel-tokens.css')
  })
})
```

- [ ] **Step 2: Implement provider**

```tsx
import React from 'react'
import { ConfigProvider } from 'antd'
import { novelAntdTheme, NOVEL_THEME_ROOT_CLASS } from './novelUiTokens'
import './novel-tokens.css'

export function NovelThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className={NOVEL_THEME_ROOT_CLASS} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <ConfigProvider theme={novelAntdTheme}>
        {children}
      </ConfigProvider>
    </div>
  )
}
```

- [ ] **Step 3: Restructure router novel routes**

Replace the three flat novel routes with a nested layout:

```tsx
import { Outlet } from 'react-router-dom' // if not already
import { NovelThemeProvider } from './styles/NovelThemeProvider'

// inside Layout children array, REPLACE:
// { path: 'novel', element: page(<NovelStudio />) },
// { path: 'novel/workspace/:id', ... },
// { path: 'novel/workspace/:id/production', ... },

// WITH:
{
  path: 'novel',
  element: (
    <NovelThemeProvider>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </NovelThemeProvider>
  ),
  children: [
    { index: true, element: <NovelStudio /> },
    { path: 'workspace/:id', element: <NovelProjectWorkspace /> },
    { path: 'workspace/:id/production', element: <NovelProductionDesk /> },
  ],
},
```

Notes:
- Lazy components can stay; nested routes under provider should not double-wrap `page()` if parent already Suspense — either parent Suspense + bare elements, or child `page()`. Prefer parent Suspense once.
- URLs must remain `/novel`, `/novel/workspace/:id`, `/novel/workspace/:id/production`.

- [ ] **Step 4: Run tests**

```bash
cd ui/web && bun test src/styles/novelUiTokens.test.ts src/styles/novelThemeRouting.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/styles/NovelThemeProvider.tsx ui/web/src/styles/novelThemeRouting.test.ts ui/web/src/router.tsx
git commit -m "feat(ui): scope novel ConfigProvider to novel routes"
```

---

### Task 3: Phase 1 — Workspace shell + writing CSS → tokens

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.css`

**Rules for replacement (mechanical):**

| From | To |
|------|-----|
| `#1677ff` / existing primary blues where same | `var(--novel-color-primary)` |
| `#e8eef5`, `#f0f0f0` borders where shell uses soft border | `var(--novel-color-border)` |
| `#64748b` secondary text | `var(--novel-color-text-secondary)` |
| `border-radius: 8px` | `var(--novel-radius-md)` |
| `border-radius: 6px` | `var(--novel-radius-sm)` |
| `border-radius: 10px` | `var(--novel-radius-lg)` |
| `border-radius: 999px` | `var(--novel-radius-pill)` |
| `border-radius: 7px` / `9px` | nearest `sm`/`md`/`lg` |
| `height: 28px` on buttons | `var(--novel-control-height-sm)` |
| `height: 32px` on buttons | `var(--novel-control-height-md)` |
| `font-weight: 800` / `750` / `850` on chrome | `var(--novel-font-weight-bold)` (700) or medium 600 for tags |
| `font-weight: 650` | `var(--novel-font-weight-medium)` |
| topbar `height: 48px` | `var(--novel-shell-topbar-height)` |
| directory `240px` / `48px` collapsed | shell directory tokens |

Do **not** rewrite layout grid logic. Do **not** change class names relied on by shell tests (`novel-workspace-shell-*`, `novel-writing-immersive-aux*`, `writing-cockpit-summary-*`).

- [ ] **Step 1: Apply CSS variable substitutions** in the three files (search-replace carefully; keep `!important` where pre-existing).

- [ ] **Step 2: Progress height in workspace CSS**

Where custom progress heights exist, set to `var(--novel-progress-height-sm)`.

- [ ] **Step 3: Run shell contracts**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts -t "dual-mode|immersive writing aux|writing cockpit collapsed|keeps manual writing|lets the inner chapter"
```

Expected: pass (class names unchanged).

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.css ui/web/src/pages/novel-workspace/WorkspaceCenter.css ui/web/src/pages/novel-workspace/WritingCockpitPanel.css
git commit -m "style(ui): align workspace shell CSS to novel tokens"
```

---

### Task 4: Phase 2 — Workspace subsystem CSS → tokens

**Files (all under `ui/web/src/pages/novel-workspace/`):**
- `AutoCreationDirectorWorkspace.css`
- `ReferencePanel.css`
- `CreativeAssistantPanel.css`
- `StoryAssetsWorkspace.css`
- `SettingAssetGraphPanel.css`
- `SettingWorkshopPanel.css`
- `ProductionGuidePanel.css`
- `OutlineTreeModal.css`
- Any other `*.css` in that folder not done in Task 3

Same substitution table as Task 3.

- [ ] **Step 1: Batch replace radii/weights/colors/heights** per file; commit-quality pass file by file if needed.

- [ ] **Step 2: Spot-check no remaining `font-weight: 850` / `border-radius: 9px` in these files**

```bash
grep -R "font-weight: 85\|font-weight: 75\|font-weight: 65\|border-radius: 9px\|border-radius: 7px" ui/web/src/pages/novel-workspace --include='*.css' || true
```

Expected: empty or only intentional comments.

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/pages/novel-workspace/*.css
git commit -m "style(ui): align novel workspace subsystem CSS to tokens"
```

---

### Task 5: Phase 3 — NovelStudio + ProductionDesk

**Files:**
- Modify: `ui/web/src/pages/NovelStudio.tsx` (inline styles → prefer classes or token-backed styles)
- Create optional: `ui/web/src/pages/NovelStudio.css` if cleaner than pure inline migration
- Modify: `ui/web/src/pages/NovelProductionDesk.tsx`
- Create optional: `ui/web/src/pages/NovelProductionDesk.css`

**Guidelines:**
- NovelStudio is large: prioritize repeated patterns — `borderRadius: 8/12/16` → token classes; primary Button styles; Progress `size="small"` relies on theme
- Do not refactor data fetching
- Production desk: Card borders, Progress, button clusters

Minimal approach if time-boxed:
1. Add page root class under theme (already have provider)
2. Add page CSS:

```css
.novel-studio-page .ant-btn { font-weight: var(--novel-font-weight-bold); }
.novel-studio-page .ant-card { border-radius: var(--novel-radius-md); }
/* etc */
```

3. Set root className on page containers: `novel-studio-page`, `novel-production-desk`

- [ ] **Step 1: Add page root classes + scoped CSS using tokens**

- [ ] **Step 2: Replace the worst inline radius/shadow buttons where easy** (not every line)

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/pages/NovelStudio.tsx ui/web/src/pages/NovelStudio.css ui/web/src/pages/NovelProductionDesk.tsx ui/web/src/pages/NovelProductionDesk.css
git commit -m "style(ui): apply novel tokens to studio and production desk"
```

(If CSS files not created, only stage TSX.)

---

### Task 6: Phase 4 — Contracts, scan, build

**Files:**
- Modify: `ui/web/src/styles/novelThemeRouting.test.ts` (tighten if needed)
- Optional: append to `workspaceUiShell.test.ts` a note that tokens are orthogonal — only if shell CSS broke strings

- [ ] **Step 1: Residual scan on novel paths**

```bash
# Allow some leftovers in TSX; flag CSS hotspots
grep -R "font-weight: 800\|font-weight: 850\|border-radius: 9px" ui/web/src/pages --include='*Novel*' --include='novel-workspace/*' -n || true
```

Document remaining TSX inline leftovers as follow-ups if not worth blocking.

- [ ] **Step 2: Full token + routing + key shell tests**

```bash
cd ui/web && bun test src/styles/novelUiTokens.test.ts src/styles/novelThemeRouting.test.ts
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts -t "dual-mode|immersive writing aux|writing cockpit|keeps manual writing|lets the inner chapter|keeps chapter writing"
cd /Users/ruiyaosong/MangaForge-Studio && bun run build:web
```

- [ ] **Step 3: Manual checklist**

1. `/novel` — buttons/cards look consistent  
2. `/novel/workspace/:id` — shell + writing toolbar + cockpit  
3. production desk path  
4. `/canvas` and `/models` — unchanged (no novel-theme-root)  

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A ui/web/src/styles ui/web/src/pages
git commit -m "test(ui): verify novel token theme isolation and build"
```

Skip empty commit if nothing left.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Token dictionary CSS+TS | 1 |
| Ant theme mapping | 1 |
| NovelThemeProvider + route whitelist | 2 |
| Phase 1 workspace shell/writing | 3 |
| Phase 2 subsystems | 4 |
| Phase 3 studio/production | 5 |
| Isolation + build + acceptance | 6 |
| No whole-app theme | 2 structure |

## Consistency notes

- Class: `novel-theme-root`  
- Import path: `./styles/NovelThemeProvider` from `router.tsx`  
- Nested route URLs unchanged  

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-novel-ui-tokens.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task + review  
2. **Inline Execution** — this session with checkpoints  

Which approach?
