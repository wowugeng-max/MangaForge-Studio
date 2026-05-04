# 环境说明

## 目标

统一记录 MangaForge Studio 当前阶段依赖与运行环境，避免前端、桥接层、restored-src 之间出现版本和启动方式不一致。

---

## 当前推荐环境

### 前端
- Node.js / Bun: 以 `ui/web` 实际可运行版本为准
- 包管理器: `bun`
- 启动命令: `bun run dev`

### 统一 API / Bridge
- 位置: `ui/server`
- 推荐运行方式: 统一对外服务入口
- 目标职责: 接收前端请求、路由到 restored-src、管理 workspace、聚合状态

### restored-src
- 位置: `restored-src`
- 角色: agent / tool / task / session 核心
- 启动/调用方式: 由 `ui/server` 适配，不直接暴露给前端

---

## 当前约定

- 前端只认一个统一 API 基础地址
- 所有项目数据统一写入 workspace
- restore / resume / interrupt 等能力由后端核心提供

---

## 待确认项

以下内容建议在 Phase 0 中最终冻结：

- Node / Bun 具体版本号
- Python 具体版本号（如果后端继续使用 Python）
- 前端 dev server 端口
- 统一 API 端口
- workspace 根路径
