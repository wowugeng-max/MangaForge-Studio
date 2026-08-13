# 小说工作台编辑器基础(第 2 批)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 正文编辑器补齐专业写作能力:打字机模式+段落聚焦、章内查找替换(汉化)、字数目标进度+码字速度、命令面板+快捷键。

**Architecture:** 在既有 `ProseEditor`(CodeMirror 6)上以 Compartment 挂载可开关扩展;写作统计与段落定位为纯函数模块(可测);命令面板放在 `WorkspaceCenter`,复用 `chapterWorkflow` presenter 的动作分发。

**Tech Stack:** CodeMirror 6(新增 `@codemirror/search`)、React、Ant Design、bun test。

**范围调整:** 规格中"全书查找"依赖跨章内容拉取管道,与第 3 批内联批注同属数据集成,移入第 3 批;本批交付章内查找替换。

---

### Task 1: 编辑器写作扩展模块 `prose-editor-extensions.ts`

**Files:**
- Create: `ui/web/src/pages/novel-workspace/prose-editor-extensions.ts`
- Test: `ui/web/src/pages/novel-workspace/prose-editor-extensions.test.ts`

**内容:**
1. 纯函数 `paragraphRangeAt(text: string, pos: number): { from: number; to: number }`:以空行为界返回 pos 所在段落的字符区间(含段内换行,不含边界空行)。
2. `typewriterExtension()`:selection 变化后把光标行滚动到视口垂直居中(`EditorView.scrollIntoView(head, { y: 'center' })`,经 requestAnimationFrame 防止 update 循环内 dispatch)。
3. `paragraphFocusExtension()`:ViewPlugin + Decoration.line,非当前段落行加 `cm-prose-dim` class;配套 baseTheme 淡化(opacity 0.35, transition)。

- [ ] Step 1: 写 `paragraphRangeAt` 失败测试(段中/段首/空行上/文首文末五个用例)
- [ ] Step 2: 实现三个导出,测试通过:`cd ui/web && bun test src/pages/novel-workspace/prose-editor-extensions.test.ts`
- [ ] Step 3: Commit `feat(novel-editor): typewriter and paragraph focus extensions`

### Task 2: 显示偏好扩展 + ProseEditor 接入

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-chrome.tsx`(`EditorDisplayPrefs`、load/save、`EditorDisplayControls`)
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-prose-editor.tsx`

**内容:**
1. `EditorDisplayPrefs` 增加 `typewriter: boolean; paragraphFocus: boolean`(默认 false);`loadEditorDisplayPrefs` 兼容旧存档(缺省补 false)。
2. `EditorDisplayControls` 弹层里加两个 Switch 行:打字机模式、段落聚焦。
3. `ProseEditor` 用两个 `Compartment` 挂载扩展,`displayPrefs` 变化时 `view.dispatch({ effects: compartment.reconfigure(...) })`,不重建编辑器。

- [ ] Step 1: 改 prefs 类型与持久化
- [ ] Step 2: 加开关 UI 与 Compartment 接入
- [ ] Step 3: 相关测试 + 构建通过;Commit `feat(novel-editor): wire typewriter and paragraph focus toggles`

### Task 3: 章内查找替换(汉化)

**Files:**
- Modify: `ui/web/package.json`(新增 `@codemirror/search`)
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-prose-editor.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`(搜索面板样式微调)

**内容:**
1. `bun add @codemirror/search`(ui/web)。
2. 编辑器扩展加 `search({ top: true })` + `searchKeymap` + `EditorState.phrases.of(中文文案)`(Find/Replace/next/previous/all/match case/regexp/by word/replace/replace all/close)。
3. 导出 `openProseSearch(view)` 供命令面板调用(内部用 `openSearchPanel`)。

- [ ] Step 1: 安装依赖并接入扩展
- [ ] Step 2: 构建通过;Commit `feat(novel-editor): in-chapter find and replace with chinese ui`

### Task 4: 字数目标进度 + 码字速度

**Files:**
- Create: `ui/web/src/pages/novel-workspace/writing-session-stats.ts`
- Test: `ui/web/src/pages/novel-workspace/writing-session-stats.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/chapter-header-status.ts`(状态行追加会话统计)
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`(采样接入)

**内容:**
1. 纯模型 `createWritingSessionTracker()`:`record(chapterId, wordCount, now)` 累积样本;`stats(chapterId, now)` 返回 `{ sessionAdded, wordsPerHour }`(近 10 分钟窗口线性推算,不足 1 分钟不出速度);切章重置。
2. `buildChapterHeaderStatus` 增加可选 `session?: { sessionAdded: number; wordsPerHour: number | null }`,输出 `sessionLabel`(如 `本次 +820 字 · 2,400 字/时`,无增量则空字符串)。
3. `WorkspaceCenter` 用 `React.useRef` 持有 tracker,`activeWordCount` 变化时采样;`sessionLabel` 渲染在状态行字数之后(次级颜色)。

- [ ] Step 1: 写 tracker 与 sessionLabel 失败测试(累积/窗口速度/切章重置/无增量)
- [ ] Step 2: 实现并通过:`bun test src/pages/novel-workspace/writing-session-stats.test.ts src/pages/novel-workspace/chapter-header-status.test.ts`
- [ ] Step 3: 接入渲染,构建通过;Commit `feat(novel-ui): word target progress and writing speed in header`

### Task 5: 命令面板 + 快捷键

**Files:**
- Create: `ui/web/src/pages/novel-workspace/workspace-command-palette.tsx`
- Create: `ui/web/src/pages/novel-workspace/workspace-command-palette-model.ts`(纯:命令列表构建+过滤)
- Test: `ui/web/src/pages/novel-workspace/workspace-command-palette-model.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`

**内容:**
1. 纯模型 `buildWorkspaceCommands(presenter, ctx)`:主行动(置顶,标 `推荐`)+ 次级动作 + 固定命令(打开查找、版本、质检、任务书、展开/收起辅助面板、显示设置说明、快捷键说明);`filterWorkspaceCommands(commands, query)` 按 label/keywords 子串过滤。
2. `WorkspaceCommandPalette`:antd Modal(无标题栏,顶部 Input 自动聚焦),↑↓ 选择、Enter 执行、Esc 关闭;底部快捷键速查区(Cmd+K、Cmd+Enter、Cmd+F)。
3. 快捷键:`WorkspaceCenter` 挂 window keydown——`Cmd/Ctrl+K` 开关面板;`Cmd/Ctrl+Enter` 执行 presenter 主行动(编辑器内同样生效)。`Cmd+F` 由编辑器 searchKeymap 自带,面板里提供"查找替换"命令做入口。

- [ ] Step 1: 写命令模型失败测试(主行动置顶/过滤/上下文命令可用性)
- [ ] Step 2: 实现模型,测试通过
- [ ] Step 3: 面板组件 + 快捷键接入,构建通过
- [ ] Step 4: Commit `feat(novel-ui): command palette and workspace shortcuts`

## 验收核对

- [ ] 打字机/段落聚焦开关即时生效且持久化,不重建编辑器(光标/滚动不丢)。
- [ ] Cmd+F 在编辑器内打开中文查找替换面板。
- [ ] 状态行显示 `当前/目标字数` + 本次新增与码字速度。
- [ ] Cmd+K 任意位置唤出命令面板,Enter 执行;Cmd+Enter 直接执行主行动。
- [ ] `bun run build:web` 与 novel-workspace 相关测试全绿。
