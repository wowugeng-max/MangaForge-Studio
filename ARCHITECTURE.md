# ARCHITECTURE.md

## 这个东西本来是怎么搭的？（当前架构概览）

本项目是在 `claude-code` 还原代码基础上，扩展出一个面向漫剧生产的子系统。

## 总体分层

1. **核心引擎层（原项目）**
- Query / Tool orchestration / Permissions / Tasks
- 提供工具调用、权限控制、会话机制

2. **漫剧领域层（新增）**
- 位置：`restored-src/src/manga/`
- 组成：
  - `schemas/`：领域结构定义（角色、剧集、分镜、导出、提示词包）
  - `services/`：业务逻辑（bible、plot、storyboard、prompt、export）
  - `tools/`：工具入口（StoryBible/PlotBeat/Storyboard/PromptPack/ExportEpisode）

3. **本地执行层（新增）**
- 位置：`restored-src/scripts/`
- 提供可直接执行的 CLI 脚本：
  - `manga:init`
  - `manga:plot`
  - `manga:storyboard`
  - `manga:promptpack`
  - `manga:export`
  - `manga:verify-exports`
  - `manga:release-check`

4. **UI/API 层（新增）**
- `ui/server`：Express API，直接调用 manga services
- `ui/web`：React + Vite 面板

## 数据流（核心流程）

用户参数
→ Plot（生成 episode/scenes）
→ Storyboard（生成 shots）
→ PromptPack（生成提示词）
→ Export（json/md/csv/zip）
→ UI 展示 + 下载

## 数据目录

默认工作区（可切换）：
- `restored-src/.smoke-workspace/.story-project/`

主要产物：
- `series.yaml`
- `style-guide.md`
- `episodes/<id>.episode.json`
- `episodes/<id>.script.md`
- `episodes/<id>.storyboard.json`
- `episodes/<id>.prompts.json`
- `episodes/<id>.prompts.md`
- `episodes/<id>.export.{json|md|csv|zip}`

## UI5 关键能力

- Workspace Switcher
- Template Manager
- Pipeline Runner（含 Run All）
- Episode Board（完成度 + ZIP）
- Artifact Preview/Download
- Run Timeline

## 权限策略

- `.story-project/**` 已加入读写允许范围
- 其他目录仍受原权限机制约束
