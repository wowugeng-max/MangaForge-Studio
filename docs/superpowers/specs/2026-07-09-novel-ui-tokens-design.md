# Novel Product-Line UI Tokens Design

**Date:** 2026-07-09  
**Status:** Approved for implementation planning  
**Scope:** Full novel product line visual language (buttons, progress, tags, cards, spacing)  
**Approach:** B — Token dictionary + novel-route `ConfigProvider` + phased CSS alignment  
**Non-goals:** Whole-app theme (canvas / model manager / keys); dark mode; IA rewrites; one-shot deletion of all inline styles; full design-system site

---

## Problem

Novel surfaces use Ant Design 5 without a shared theme, plus ~11 local CSS files and many inline styles. Measured variance in novel workspace CSS alone:

- Border radii: 6 / 7 / 8 / 9 / 10 / 999px
- Control heights: 24–36px mixed
- Font weights: 650 / 700 / 750 / 800 / 850

Shell dual-mode, writing aux, and cockpit density work improved structure but did not establish a product-wide control language across lobby, wizard, workspace, production desk, and NovelStudio.

---

## Goals

1. Single **token dictionary** (CSS variables + TS) for the novel product line  
2. Novel routes wrapped in **`ConfigProvider`** so default Button / Progress / Tag / Card match tokens  
3. Phased migration of novel CSS/inline styles onto tokens  
4. Non-novel routes visually unchanged  
5. No business logic or API changes  

## Success criteria

- Any novel route mounts under `novel-theme-root` + novel Ant theme  
- Buttons: sm ≈ 28px, md ≈ 32px; primary weight 700; radius 8 or pill for explicit CTAs  
- Linear Progress: unified sm height (~6px) and muted trail  
- Tags: semantic soft colors; no ad-hoc 7/9px radii in migrated files  
- Canvas / ModelManager unchanged vs pre-change baseline  
- Existing dual-mode / aux / cockpit shell contracts still pass  
- `bun run build:web` passes  

---

## Chosen approach

**B — Token + novel-scoped ConfigProvider**

Rejected:

- **A** CSS variables only (Ant defaults stay inconsistent)  
- **C** whole-app design system (out of selected product scope)

---

## §1 Token dictionary

### Principles

- Converge on values already used in polished workspace chrome (Ant primary blue, 28/32 heights, 8px panels, pill CTAs)  
- Prefer a small set; eliminate 650/750/800/850 as *spec* weights (migrate to 600/700)  
- Two exports with identical semantics:
  - CSS: `--novel-*` on `.novel-theme-root`
  - TS: `novelUiTokens` + `novelAntdTheme` for ConfigProvider  

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `color.primary` | `#1677ff` | Primary button, links, focus |
| `color.primarySoft` | `#eff6ff` | Soft primary surfaces |
| `color.success` | `#16a34a` | Ready / pass |
| `color.successSoft` | `#f0fdf4` | Soft success |
| `color.warning` | `#d97706` | Warning / pending |
| `color.warningSoft` | `#fffbeb` | Soft warning |
| `color.danger` | `#dc2626` | Blocker / danger |
| `color.dangerSoft` | `#fef2f2` | Soft danger |
| `color.text` | `#0f172a` | Primary text |
| `color.textSecondary` | `#64748b` | Secondary text |
| `color.border` | `#e8eef5` | Default border |
| `color.borderStrong` | `#dfe7f1` | Stronger dividers |
| `color.bg` | `#ffffff` | Surface |
| `color.bgMuted` | `#f5f7fb` | Muted surface / rails |
| `color.bgCanvas` | `#fbfcfe` | Immersive main canvas |

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius.sm` | `6px` | Inputs, small chips |
| `radius.md` | `8px` | Cards, panels, default buttons |
| `radius.lg` | `10px` | Mode rails, large containers |
| `radius.pill` | `999px` | Primary pill CTAs, preferred tags |

Eliminate 7px / 9px as standard values.

### Spacing

| Token | Value |
|-------|-------|
| `space.1` | `4px` |
| `space.2` | `8px` |
| `space.3` | `12px` |
| `space.4` | `16px` |
| `space.5` | `20px` |
| `space.6` | `24px` |

### Typography

| Token | Value | Use |
|-------|-------|-----|
| `font.size.xs` | `12px` | Meta, aux |
| `font.size.sm` | `13px` | Secondary body, tags |
| `font.size.md` | `14px` | Default body / buttons |
| `font.size.lg` | `16px` | Section titles |
| `font.weight.regular` | `400` | Body |
| `font.weight.medium` | `600` | Labels |
| `font.weight.bold` | `700` | Buttons, strong titles |

### Buttons

| Size | Height | Font | Radius | Weight |
|------|--------|------|--------|--------|
| sm | 28px | 13px | md (or pill for CTA) | 700 |
| md | 32px | 14px | md (or pill for CTA) | 700 |
| lg | 36px | 14px | md | 700 |

Semantics: primary (solid), default (bordered), text, danger. At most one solid primary CTA per command cluster.

### Progress

| Token | Value |
|-------|-------|
| `progress.height.sm` | `6px` |
| `progress.height.md` | `8px` |
| `progress.radius` | `999px` |
| `progress.trail` | `color.bgMuted` |
| `progress.stroke` | `color.primary` (success state → success) |

Linear bars default to sm. Circle dashboards may keep explicit sizes (e.g. 72) but share stroke colors.

### Tag

- Compact; font 12–13  
- Radius: **pill** preferred (align with current product)  
- Weight: 600–700  
- Semantic soft backgrounds + semantic text/border  

### Card / surface

| Token | Value |
|-------|-------|
| `card.radius` | `radius.md` (8) |
| `card.border` | `color.border` |
| `card.shadow` | none or `0 1px 2px rgba(15,23,42,0.04)` (prefer flat / minimal) |
| `card.padding.sm` | `12px` |
| `card.padding.md` | `16px` |

### Shell (align with shipped dual-mode shell)

| Token | Value |
|-------|-------|
| `shell.topbarHeight` | `48px` |
| `shell.directoryWidth` | `240px` |
| `shell.directoryCollapsed` | `48px` |

---

## §2 Mounting, phases, acceptance

### Mounting

```
App / Router
 └─ Layout (global shell; no novel theme required)
     └─ NovelThemeProvider  ← novel routes only
           className="novel-theme-root"
           ConfigProvider theme={novelAntdTheme}
           + novel-tokens.css variables on .novel-theme-root
           └─ novel pages
```

**Files:**

| Path | Role |
|------|------|
| `ui/web/src/styles/novel-tokens.css` | `--novel-*` variables on `.novel-theme-root` |
| `ui/web/src/styles/novelUiTokens.ts` | TS tokens + `novelAntdTheme` |
| `ui/web/src/styles/NovelThemeProvider.tsx` | ConfigProvider wrapper |
| `ui/web/src/styles/novelUiTokens.test.ts` | Shape / key value contracts |
| `ui/web/src/router.tsx` | Wrap novel route tree only |

**Route whitelist (explicit):** novel lobby, workspace, create wizard / entry, production desk, NovelStudio, and any other `/novel*` paths already in router.  
**Exclude:** Canvas, Assets library, ModelManager, Providers, Keys, Pipeline graph, etc.

### Ant Design theme mapping (summary)

```ts
{
  token: {
    colorPrimary: '#1677ff',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e8eef5',
    borderRadius: 8,
    controlHeight: 32,
    controlHeightSM: 28,
    fontSize: 14,
  },
  components: {
    Button: { borderRadius: 8, controlHeight: 32, controlHeightSM: 28, fontWeight: 700 },
    Progress: { /* trail/stroke via token + CSS */ },
    Tag: { /* pill via CSS / borderRadiusSM */ },
    Card: { borderRadiusLG: 8 },
  },
}
```

Pill CTAs keep dedicated classes (e.g. editor primary) with `border-radius: var(--novel-radius-pill)`.

### Optional components

No new `NovelButton` / `NovelProgress` in v1 unless a third duplicate pattern appears (YAGNI).

### Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **0 Foundation** | tokens CSS + TS + NovelThemeProvider + router wrap + unit contracts; near-zero visual delta |
| **1 Workspace shell + writing path** | `NovelProjectWorkspace.css`, `WorkspaceCenter.css`, `WritingCockpitPanel.css` → tokens |
| **2 Workspace subsystems** | AutoCreation, Reference, CreativeAssistant, StoryAssets, Setting*, ProductionGuide, OutlineTree, etc. |
| **3 Other novel entry points** | lobby, create wizard / novel-entry, production desk, NovelStudio |
| **4 Cleanup** | residual radius/weight scan; contract updates; manual QA path |

### Out of scope

- App-wide ConfigProvider  
- Dark theme  
- Rewriting lobby/workspace information architecture  
- Deleting every inline style in one pass  
- Design docs website  

### Acceptance matrix

| Check | Pass condition |
|-------|----------------|
| Mount | Novel routes under `novel-theme-root` + ConfigProvider |
| Buttons | sm/md heights and weight per §1 |
| Progress | linear sm height + muted trail |
| Tag | semantic soft colors; migrated files without 7/9px radii |
| Isolation | non-novel pages unchanged |
| Regression | dual-mode / aux / cockpit contracts green |
| Build | `bun run build:web` ok |

### Risks

| Risk | Mitigation |
|------|------------|
| Wrong routes wrapped | Explicit whitelist + router test |
| Theme too aggressive | Phase 0 tokens match current blue/heights first |
| Weight 800→700 feels lighter | Primary CTA stay 700; drop 750/850 first |
| CSS vars missing | Provider root always has `novel-theme-root` |

---

## Implementation touchpoints (preview)

- Create styles under `ui/web/src/styles/`  
- Wire `router.tsx` novel branch  
- Phase 1–3 edit novel CSS/TSX only  
- Tests: `novelUiTokens.test.ts` + light router/source contracts  

---

## Approval record

- User scope: novel product line (2)  
- Unification axis: full control language (4)  
- Approach: B  
- Design §1 token dictionary + §2 mounting/phases: approved in conversation 2026-07-09  
