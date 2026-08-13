# 小说工作台编辑器深度集成(第 3 批)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 质检问题内联批注到正文、章内段落大纲导航、全书跨章查找。

**Architecture:** 批注定位与大纲分段为纯函数模块(可测);批注经 CodeMirror StateField/StateEffect 注入 `ProseEditor`;大纲栏与全书查找为独立组件,复用 `WorkspaceCenter` 既有 props(`proseQualityReports`、`selectedProject`、`onSelectWritingQueueChapter`)与 `api/client`。

**Tech Stack:** CodeMirror 6(view/state,hoverTooltip)、React、Ant Design、bun test。

**范围调整(基于探查结论):** 规格中"修订双栏对照"已由 `VersionDetailModal` 覆盖(行内 diff、双栏对照、只看差异、段落级采纳合并,入口在参考面板 versions 页"对比"按钮),命令面板已有"版本历史"直达入口,不再用 `@codemirror/merge` 重复实现。

**关键事实(探查所得):**
- 质检 issue 元素:string 或 object(`severity`/`description`/`message`/`type`/`evidence`/`fix`),`evidence` 为可能出现在正文中的字符串(有时为数组),无字符偏移。`issueSeverity`/`issueLabel` 已在 `reference-panel-helpers.ts` 导出。
- 最新报告筛选逻辑在 `workspace-center-quality-revision-panel.tsx`(`reportChapterId` 已导出)。
- 章节列表:`GET /novel/projects/:id/chapters?view=workspace`(含 `id/chapter_no/title/has_prose/word_count`,无正文);正文:`GET /novel/chapters/:id?project_id=`.`chapter_text`。
- apiClient:`import apiClient from '../../api/client'`。

---

### Task 1: 批注定位纯模型 `prose-annotations.ts`

**Files:**
- Create: `ui/web/src/pages/novel-workspace/prose-annotations.ts`
- Test: `ui/web/src/pages/novel-workspace/prose-annotations.test.ts`

**内容:** `locateProseAnnotations(text, issues)` → `Array<{ from: number; to: number; severity: 'critical'|'high'|'medium'|'low'; label: string; fix: string }>`:
- evidence 取 `issue.evidence`(string 或 string[] 取各项),trim 后长度 ≥ 4 才尝试匹配(过短误报);`indexOf` 全部出现位置(同一 evidence 多处都标)。
- 无 evidence 或匹配不到 → 跳过(降级不显示)。
- severity/label 复用 `issueSeverity`/`issueLabel`;`fix` 取 `fix/required_change/suggestion`。
- 结果按 from 排序、去重叠(重叠区间保留 severity 更高者)。

- [ ] Step 1: 失败测试(命中单处/多处、evidence 数组、匹配不到跳过、重叠保留高严重度、string issue 无 evidence 跳过)
- [ ] Step 2: 实现通过;Commit `feat(novel-editor): locate quality annotations in prose`

### Task 2: 批注 CM 扩展 + ProseEditor/WorkspaceCenter 接线

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/prose-annotations.ts`(追加 CM 扩展:`proseAnnotationsExtension()`、`setProseAnnotationsEffect`)
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-prose-editor.tsx`(新 prop `annotations`,effect 派发)
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`(从 `proseQualityReports` 取当前章最新报告计算批注)
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`(波浪线样式)

**内容:**
1. StateField<DecorationSet> + StateEffect 更新;`Decoration.mark({ class: 'cm-prose-issue cm-prose-issue-<severity>' })`;文档变更时 `map` 保持位置。
2. `hoverTooltip`:悬停批注区间显示 `label` + `改法`。
3. WorkspaceCenter:最新报告(`reportChapterId` 匹配 + `created_at` 最新)→ `resolveQualityReportView(latest).issues` → `locateProseAnnotations(activeChapter.chapter_text, issues)` → 传给 ProseEditor;报告过期(报告时间 < 章节更新时间)时不显示批注。
4. CSS:分级下划波浪线(critical/high 红、medium 金、low 蓝)。

- [ ] Step 1: 扩展实现 + ProseEditor prop
- [ ] Step 2: WorkspaceCenter 计算与传入
- [ ] Step 3: 构建 + 守卫测试通过;Commit `feat(novel-editor): inline quality annotations`

### Task 3: 章内大纲导航

**Files:**
- Create: `ui/web/src/pages/novel-workspace/prose-outline.ts`(纯:`buildProseOutline(text)`)
- Test: `ui/web/src/pages/novel-workspace/prose-outline.test.ts`
- Create: `ui/web/src/pages/novel-workspace/prose-outline-rail.tsx`
- Modify: `workspace-center-chrome.tsx`(EditorDisplayPrefs 加 `outline: boolean`,开关)
- Modify: `WorkspaceCenter.tsx`(编辑器左侧渲染 rail)

**内容:**
1. `buildProseOutline(text)` → `Array<{ index: number; from: number; label: string }>`:按空行分段,每段取首行前 14 个字符为 label(去引号空白);段数 0 返回空。
2. `ProseOutlineRail`:细栏(宽 148px,可滚动),列出段落项;点击 → `view.dispatch({ selection, effects: scrollIntoView(from, y:'start') })` 并 focus;当前光标所在段高亮(监听由 WorkspaceCenter 传入的 activeFrom,简化:点击态高亮即可)。
3. 显示偏好 `outline` 默认 false,开关在显示设置弹层;开启时编辑器区左侧渲染。

- [ ] Step 1: 失败测试(常规分段/连续空行/单段/空文本/label 截断)
- [ ] Step 2: 实现纯模型通过
- [ ] Step 3: rail 组件 + 偏好接线,构建通过;Commit `feat(novel-editor): in-chapter outline rail`

### Task 4: 全书查找

**Files:**
- Create: `ui/web/src/pages/novel-workspace/book-search-model.ts`(纯:匹配与摘要片段)
- Test: `ui/web/src/pages/novel-workspace/book-search-model.test.ts`
- Create: `ui/web/src/pages/novel-workspace/book-search-modal.tsx`
- Modify: `WorkspaceCenter.tsx`(状态 + 命令面板入口)
- Modify: `workspace-command-palette-model.ts`(可选 `openBookSearch` 命令)

**内容:**
1. 纯模型:`searchChapterText(text, query)` → `Array<{ index: number; snippet: string }>`(大小写不敏感,snippet 命中前后各 18 字符,单章最多 20 条);`buildBookSearchSummary(results)`。
2. `BookSearchModal({ projectId, activeChapterId, activeChapterText, open, onClose, onJumpToChapter, proseEditorRef })`:
   - 打开时 `GET /novel/projects/:id/chapters?view=workspace` 拿章节列表(缓存于组件 state)。
   - 输入查询(≥2 字符)点"搜索"或回车:逐章搜索——当前章用 `activeChapterText`;其余 `has_prose` 章节并发 ≤4 拉 `GET /novel/chapters/:id?project_id=` 取 `chapter_text`(结果缓存,Modal 生命周期内不重复拉);进度显示 `已搜 x/y 章`。
   - 结果按章分组:`第N章《标题》(k 处)` + 命中片段(高亮命中词);点击当前章命中 → 编辑器 selection 定位;点击其他章 → `onJumpToChapter(chapterId)` 并关 Modal。
3. 命令面板加"全书查找"(section 编辑器,keywords: search/全书/跨章),入口回调 `openBookSearch`。

- [ ] Step 1: 失败测试(命中/大小写/snippet 边界/上限 20/空查询)
- [ ] Step 2: 纯模型实现通过
- [ ] Step 3: Modal + 接线,构建通过;Commit `feat(novel-ui): book-wide search across chapters`

## 验收核对

- [ ] 质检报告含 evidence 的问题在正文中以分级波浪线标出,悬停显示问题与改法;报告过期不显示。
- [ ] 大纲栏可开关、持久化,点击段落编辑器定位。
- [ ] 命令面板可打开全书查找,跨章命中可跳章;当前章命中直接定位。
- [ ] `bun run build:web` 与 novel-workspace 相关测试全绿。
