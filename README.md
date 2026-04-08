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

### 1) CLI mode

```bash
cd restored-src
bun install
bun run manga:init
bun run manga:plot --episodeId=ep-002
bun run manga:storyboard --episodeId=ep-002
bun run manga:promptpack --episodeId=ep-002
bun run manga:export --episodeId=ep-002
bun run manga:release-check --episodeId=ep-002
```

### 2) UI mode (one-click)

From repository root:

```powershell
.\start-ui.bat
```

Stop services:

```powershell
.\stop-ui.bat
```

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

## License / Notice

- Original source copyright belongs to [Anthropic](https://www.anthropic.com)
- This repo is for research and learning
- Please contact for takedown if needed
