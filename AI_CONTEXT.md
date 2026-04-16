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

---

## 最新进度补充（2026-04-16）

### 已完成

- 将 ComfyForge 的前端主体源码迁入当前项目 `ui/web/src`
- 将主入口统一到当前项目的 `main.tsx -> App.tsx -> router.tsx`
- 路由已并入当前项目导航体系：
  - `/` 项目大厅
  - `/project/:id` 无限画布工作台
  - `/assets` 全局资产大厅
  - `/keys` Key 与模型管理
  - `/providers` 厂商中枢
  - `/pipeline` 图像生成管道
  - `/rules` 系统推荐规则
- 保留旧入口兼容：`/dashboard`、`/graph`、`/quality`
- 统一侧边栏导航与页面语义
- `Pipeline` 入口已切换为真实 `PipelineWorkbench`
- `CanvasPage` 已接入 provider / key / model 选择、节点编排与基础执行链路
- API 客户端已切换到当前后端服务前缀 `/api/comfy`
- 解决了若干导致白屏的运行时问题（React 导入、API 返回值解包等）
- 页面已成功渲染并进入可联调状态

### 当前结论

项目已从“迁移中”进入“可运行联调态”，后续重点是逐页验收交互、修复剩余差异、补齐功能细节。
