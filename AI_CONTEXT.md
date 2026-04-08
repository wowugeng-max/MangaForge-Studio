# AI_CONTEXT.md

## 当前我们在做什么？

我们正在把现有的 `claude-code-sourcemap` 改造成一个可落地的 **AI 漫剧生产工作台**，当前已经进入「可交付版本收尾」阶段。

### 当前状态（已完成）

- 已实现漫画生产主链：
  1. `init`（初始化项目）
  2. `plot`（剧情节拍）
  3. `storyboard`（分镜）
  4. `promptpack`（提示词包）
  5. `export`（json/md/csv/zip）
- 已提供本地 CLI 脚本链路（无需先安装 claude 命令）
- 已提供 UI（v5）
  - 工作区切换
  - 模板保存/加载
  - 产物浏览/下载
  - Episode Bundle 一键下载
  - 运行历史与完成度看板
- 已提供发布检查命令：
  - `bun run manga:release-check --episodeId=...`

### 当前目标

- 把现在这套能力整理成 GitHub 可展示、可上手、可扩展的开源项目骨架。

### 建议项目新名称（GitHub）

**MangaForge Studio**

备选：
- PanelPilot AI
- StoryboardOps
- MangaFlow Engine
