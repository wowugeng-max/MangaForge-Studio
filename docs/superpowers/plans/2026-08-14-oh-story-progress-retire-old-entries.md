# oh-story 进度 + 旧入口下线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三个 oh-story 按钮有忙态和计时，写作台不再露出旧质检/修订启动点。

**Architecture:** 进度状态放在质检面板（可测 prop + 点击时本地 wrap）。章头工作流 presenter 不再产出 `refresh_current_quality` / `apply_editor_revision` / `create_editor_report`。右侧栏停传旧 handler，编辑器次级菜单删掉「写后复检」组。

**Tech Stack:** React + Ant Design Button、现有 bun:test / renderToStaticMarkup。

---

### Task 1: 进度文案与面板忙态

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`

- [ ] 先写 `ohStoryBusySummary` 与「审稿中 · 12s / 转圈 / 禁用另外两个」的失败测试
- [ ] 实现 summary + button loading/disabled + 点击 wrap

### Task 2: 章头工作流不再指向旧质检

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/chapter-workflow-presenter.ts`
- Test: `ui/web/src/pages/novel-workspace/chapter-workflow-presenter.test.ts`
- Test: `ui/web/src/pages/novel-workspace/workspace-command-palette-model.test.ts`

- [ ] 先改测试：未同步 → 同步故事状态；已同步 → 写下一章；次级动作不含复检/一键修订/生成修订报告
- [ ] 改 presenter

### Task 3: 撤掉右侧栏和编辑器旧按钮

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-body.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-editor-controls.tsx`
- Test: 现有 source/html 断言

- [ ] 先写「不再传 onRefreshProseQuality / onApplyEditorRevision」「控件源码不含交稿质检/编辑报告」的失败测试
- [ ] 停传 handler，删除「写后复检」组
