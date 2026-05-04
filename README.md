# MangaForge Studio

[![linux.do](https://img.shields.io/badge/linux.do-huo0-blue?logo=linux&logoColor=white)](https://linux.do)

> [!WARNING]
> This repository is **unofficial** and reconstructed from public npm package + source map analysis, for research purposes only.
>
> 本仓库为**非官方**整理版，基于公开 npm 包与 source map 分析还原，**仅供研究使用**。

## What is this?

**MangaForge Studio** is a local AI manga production workflow built on top of the restored Claude Code source tree.

It provides an end-to-end pipeline:

`init -> plot -> storyboard -> promptpack -> export(json/md/csv/zip)`

with both:
- CLI scripts (`bun run manga:*`)
- Web UI (`ui/server` + `ui/web`)

---

## Key Features

- End-to-end manga episode pipeline
- Export formats: `json`, `md`, `csv`, `zip`
- One-command release check: `manga:release-check`
- UI v5 with:
  - workspace switcher
  - template save/load/import/export
  - completion board + timeline
  - artifact preview/download
  - episode bundle download

---

## Quick Start (3 minutes)

### 1) Install dependencies

If you want to run the CLI pipeline directly:

```bash
cd restored-src
bun install
```

If you want to use the UI, you can still run the same install step above first, then start the app from the repository root.

### macOS dev notes

- The mac launch script prefers `Terminal.app` and falls back to background mode if needed.
- Background mode writes logs to `.mangaforge-server.log` and `.mangaforge-web.log` in the repo root.
- If the UI is already running, stop it first with `./stop-ui-mac.sh` before starting again.

### 2) Start the UI

From repository root:

**Windows**

```powershell
.\start-ui.bat
```

Stop with:

```powershell
.\stop-ui.bat
```

**macOS**

Recommended: double-click the `.command` files in Finder.

Double-click:

- `start-ui-mac.command`
- `stop-ui-mac.command`

Or run from Terminal:

```bash
./start-ui-mac.sh
./stop-ui-mac.sh
```

This starts two processes:

- `ui/server` for the API backend
- `ui/web` for the browser UI

If you're on macOS, the launcher first installs dependencies for `restored-src`, then opens two `Terminal.app` windows by default.
If `Terminal.app` is unavailable, it falls back to background mode and writes logs to:

- `.mangaforge-server.log`
- `.mangaforge-web.log`

Open the Vite URL shown in the web terminal.

### 3) Run the manga pipeline

You can run the full flow in the UI, or use CLI commands in `restored-src`:

```bash
bun run manga:init
bun run manga:plot --episodeId=ep-002
bun run manga:storyboard --episodeId=ep-002
bun run manga:promptpack --episodeId=ep-002
bun run manga:export --episodeId=ep-002
bun run manga:release-check --episodeId=ep-002
```

### 4) Stop services

From repository root:

**Windows**

```powershell
.\stop-ui.bat
```

**macOS**

```bash
./stop-ui-mac.sh
```

---

## Troubleshooting

- If `storyboard` fails with `episode json not found`, run `plot` first.
- If preview or download fails, make sure the file lives under `.story-project`.
- If the web UI cannot reach the API, check whether `ui/server` is still running on `http://localhost:8787`.

---

## Main Commands

In `restored-src`:

- `bun run manga:init`
- `bun run manga:plot --episodeId=ep-xxx`
- `bun run manga:storyboard --episodeId=ep-xxx`
- `bun run manga:promptpack --episodeId=ep-xxx`
- `bun run manga:export --episodeId=ep-xxx`
- `bun run manga:verify-exports --episodeId=ep-xxx`
- `bun run manga:release-check --episodeId=ep-xxx`

---

## UI Screens (placeholder)

> Add your screenshots/GIFs here after capture:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/pipeline-runner.png`
- `docs/screenshots/episode-board.png`
- `docs/screenshots/timeline.png`

---

## Project Tracking Docs

- `AI_CONTEXT.md` → 我们现在在干什么
- `DECISIONS.md` → 我们为什么这样干
- `TASKS.md` → 接下来干什么
- `ARCHITECTURE.md` → 系统如何搭建
- `RUNBOOK.md` → 操作与排障手册

---

## Local Research File Paths (not tracked by git)

- package archive: `./claude-code-2.1.88.tgz`
- sourcemap: `./package/cli.js.map`

---

## Source / Credits

- npm package: [@anthropic-ai/claude-code](https://www.npmjs.com/package/@anthropic-ai/claude-code)
- restored version target: `2.1.88`
- restoration method: `cli.js.map` -> `sourcesContent`

---

## Frontend Migration Plan

We are currently using `/Users/ruiyaosong/ComfyForge/frontend-react` as the source of truth for the original frontend.

### Migration strategy

1. Copy the original frontend modules first.
2. Keep the current repository's extra additions that do not exist in the original project.
3. Unify app entry points and routing after the core modules are in place.
4. Prefer the original tested implementations over simplified rewrites.

### Direct-copy candidates

- `src/pages/Canvas/index.tsx`
- `src/pages/Assets/*`
- `src/pages/Providers/index.tsx`
- `src/pages/Keys/*`
- `src/pages/Rules/index.tsx`
- `src/pages/Pipeline.tsx`
- `src/components/nodes/*`
- `src/components/AssetLibrary.tsx`
- `src/stores/canvasStore.ts`
- `src/stores/assetLibraryStore.ts`
- `src/utils/workflowToFlow.ts`
- `src/utils/workflowSuggestions.ts`
- `src/utils/nodeRegistry.ts`
- `src/utils/handleTypes.ts`
- `src/utils/groupUtils.ts`
- `src/constants/dnd.ts`

### Current repo extensions to preserve

- `ui/web/src/pages/PipelineWorkbench.tsx`
- `ui/web/src/pages/PipelineGraphPage.tsx`
- `ui/web/src/pages/CanvasPage.tsx`
- current server bridge / workspace / template additions under `ui/server`

### Entry points to unify last

- `ui/web/src/main.tsx`
- `ui/web/src/App.tsx`
- `ui/web/src/router.tsx`
- `ui/web/src/components/Layout.tsx`

---

## License / Notice

- Original source copyright belongs to [Anthropic](https://www.anthropic.com)
- This repo is for research and learning
- Please contact for takedown if needed
