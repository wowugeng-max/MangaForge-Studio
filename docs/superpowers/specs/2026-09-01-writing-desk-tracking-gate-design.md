# 写作区追踪闸门（写章必收 oh-story 追踪）

日期：2026-09-01  
状态：待用户审阅  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.7（写作区步骤条后两步仍是旧工作台；规划区旧「同步故事状态」故意不改成 kernel job）
- `2026-08-15-codex-kernel-vault-design.md` v1.8
- oh-story `story-long-write`：`references/tracking-transaction.md`、`workflow-chapter.md` 第 12 步（写完必须 `tracking_commit.py commit`）
- 写章 / 续写 / 回炉运行时已落地；本文件不新开动词

**Goal：** 写作区不再把「同步故事状态」当成独立作者动作。防漂移跟 oh-story：写章 / 续写 / 回炉必须提交本章追踪，步骤条认这次成功 commit。不把 MangaForge 自建 `story_state` 做成新内核动词。「写下一章」仍只跳章。

## 产品决定（已拍板）

1. **不新建动词。** 没有 `sync_story_state` 合同。oh-story 的追踪嵌在写 / 续写 / 回炉里，不是独立按钮。
2. **写作区拆掉旧同步入口。** 步骤条主按钮、步骤条次按钮、交稿进度条（含「立即同步故事状态」）、验收桌 `storyStatePanel` 主按钮，都不再调用 `POST /novel/chapters/:id/story-state-sync`。
3. **规划区 / 预检 / 命令面板旧同步先留。** 旧 API 不下线、不 410。本片不改「未来100章 / 滚动规划 / 补当前卷」。
4. **「写下一章」仍只跳章。** `acceptCockpitChapterAndContinue` 不发 `write_chapter`、不发 `write_continue`。跳到空章后，作者再点「生成正文」。
5. **追踪必收，且验本章记录 + 权威 JSON。** 只把 `tracking_doc` 改成 `min=1` 不够：投影占位的 `追踪/伏笔.md` 就能过门。必须：相对快照改写了本章 `追踪/逐章记录/第NNN章.md`，并且收存 `追踪/_tracking-state.json`。
6. **不把追踪写入 MangaForge `story_state`。** 绑定仍是 `kernel_only`。`last_updated_chapter` 不是写作区步骤条的闸门。
7. **旧正文豁免。** 本章从未成功 commit 过 `write_chapter` / `write_continue` / `rewrite_chapter` 时，不挡「写下一章」（batch / 旧 generate-prose 仍能往下跳）。缺追踪只对「这次内核写章」成立。
8. **按建议改稿 / 去AI / 审稿 / 扩纲 / 适配 / batch / 画布 prompt 本片不动。** `.outline` 仍 `implemented=false`。

## 问题

写作区步骤条是：正文 → 复检 → 修订 → 状态同步 → 下一章。后两步现在：

- 「同步故事状态」→ 旧 LLM 状态机，写项目 `story_state.last_updated_chapter`。这是工作台自建账本，不是 oh-story。
- 「写下一章」→ 只 `selectChapterForWriting`，不发 job。

oh-story 防漂移的权威是 `追踪/_tracking-state.json`，由 `tracking_commit.py commit` 派生 `上下文.md` / `伏笔.md` / `角色状态/` / 时间线。写一章、回炉、日更续写都会在**同一动作里**提交追踪。现网合同只收 `追踪/**/*.md`，JSON 不进账本；投影还会给当前章塞一份空「逐章记录」。所以写作区即使用内核写章，下一章也续不上 oh-story 状态机。

## 门与收存

### 新门 `require_chapter_tracking`

失败码 `TRACKING_MISSING`。候选 **`failed`**（产物缺失，非质量门），不能 commit。

范围：

| 动词 | 必须相对快照新增或修改 |
|---|---|
| `write_chapter` / `rewrite_chapter` | `追踪/逐章记录/第{{chapter_pad}}章.md` |
| `write_continue` | 窗口内**每一章** `追踪/逐章记录/第NNN章.md`（窗口来自 `verb_params`，不要用 job 的单个 `chapter_pad`） |

三条动词都必须另外收存 **`追踪/_tracking-state.json`**（新增或修改，非空）。只交 Markdown、不交 JSON → 同样 `TRACKING_MISSING`。

内容仍是占位稿（投影曾经写的「开放项：无」那份）视为没改，过不了门。

不把「任意一份 `追踪/**/*.md`」当成通过。`required_kinds` 不要只加 `tracking_doc min=1`。

### 合同输出

`oh-story-core.story-long-write.chapter` / `.rewrite` / `.continue`：

- 保留 `追踪/**/*.md` 为 `tracking_doc`（`kernel_only`）。
- **新增**一条必收：`glob: 追踪/_tracking-state.json`，`artifact_kind: tracking_doc`，`required: true`，`binding: kernel_only`。
- 写章 / 回炉再加一条必收：`glob: 追踪/逐章记录/第{{chapter_pad}}章.md`。续写这条用门扫窗口，不写死单个 glob。

模板 `template_gates` 增加 `require_chapter_tracking`；`allowed_gates` 含它。`deslop` 仍禁止改 `追踪/`。`review_chapter` 追踪仍可选。`apply_review` 本片不验追踪（已知缺口：改稿后追踪可能旧，另开）。

### 投影

- **停止**给当前章 stub `追踪/逐章记录/第NNN章.md`。没有已提交记录时，让 skill 自己 `init` / `commit` 创建。
- `追踪/伏笔.md` 仅在完全没有任何已提交 tracking 时可以留一条空开放项，不当作本章追踪通过条件。
- `listCommittedTrackingDocPaths` 继续按 `tracking_doc` 回放。JSON 收进 artifacts 后，下一章投影必须出现 `追踪/_tracking-state.json`。同路径多份 commit 仍「最新先到、目标已存在则跳过」。

工作台文案：`kernelJobUserMessage('TRACKING_MISSING')` → 「写章未提交 oh-story 追踪」。写章 job 失败态走现有写章 hook，不另开同步 hook。

## 写作区步骤条

步骤名仍叫「状态同步」，含义改为「本章内核写章已带追踪」。

`buildChapterWorkflowPresenter`：

- **禁止**再把 `sync_story_state` 设成 `primaryAction` 或 `secondaryActions`。
- `remainingClosedLoopPrimary` 在质检/修订之后只回到「写下一章」（或已有的同步故事状态之外的主按钮）。
- `stepsDone` 的「状态同步」：本章已有成功 commit 的 `write_chapter` / `write_continue`（窗口含本章）/ `rewrite_chapter` → `true`；否则若本章从未有过这三类成功 commit → 也标 `true`（旧正文豁免）。不要读 `story_state.last_updated_chapter`。
- `needs_state_sync` 相位：写作区步骤条不再因旧 `storyStateSynced === false` 走进这个相位。

交稿进度条：

- `storyStateSyncAction` 在写作区为 `null`。
- `actionKey` 不得再是 `sync_story_state`。旧「立即同步故事状态」不得作为主按钮或旁边第二颗按钮出现。

验收桌 `storyStatePanel` 的「同步」主按钮同样从写作区拿掉。状态展示可以留只读（例如「追踪已随写章提交」/「旧稿未走内核写章」），但不能再触发 `story-state-sync`。

「写下一章」保持：找下一空章（没有则下一章）→ `selectChapterForWriting` → toast。无 job。

## 明确不做

- 不 410 `POST /api/novel/chapters/:chapterId/story-state-sync`。
- 不改规划区「同步故事状态」、预检里的同步、命令面板里的同步。
- 不改「写下一章」为自动 `write_chapter` 或 `write_continue`。
- 不把 `tracking_doc` 改成领域表 upsert，不 `putVerbDefaults`。
- 不改 `generateChapterForGroup` / batch、画布 `prompt`、扩纲按钮。
- 不把 `oh-story-core.story-long-write.outline` 标成可执行。

## 测试

服务端（`cd ui/server && bun test`，门与投影相关文件）：

- 写章：只有正文、无 `追踪/_tracking-state.json` 或无本章逐章记录 → `TRACKING_MISSING`，不能 commit。
- 写章：逐章记录仍是占位「开放项：无」→ `TRACKING_MISSING`。
- 写章：JSON + 本章逐章记录相对快照有改写 → 门过；commit 后投影回放 JSON 路径。
- 投影：无已提交逐章记录时**不**再 stub 当前章逐章记录。
- 续写：窗口三章只交两份逐章记录 → `TRACKING_MISSING`。
- 回炉：本章逐章记录相对快照无变化 → `TRACKING_MISSING`。
- `deslop` / `review_chapter` 合同门列表不含本门。

工作台（`cd ui/web && bun test`）：

- presenter：有正文且旧 `storyStateSynced=false` 时，主按钮是「写下一章」，不是「同步故事状态」；次按钮也不含同步。
- presenter：从未内核写章的已有正文，不挡「写下一章」；「状态同步」步标完成。
- `kernelJobUserMessage` 映射 `TRACKING_MISSING`。
- 交稿进度条源码 / 推荐模型：写作区不再露出 `storyStateSyncAction` / `actionKey=sync_story_state`。
- 「写下一章」handler 仍无 `createJobByVerb`。

## 验收

- 内核写章（304）成功 commit 后，vault 有 `追踪/_tracking-state.json` 与本章逐章记录；写作区步骤条到「写下一章」，没有「同步故事状态」。
- 故意不交追踪的写章：job 失败，文案「写章未提交 oh-story 追踪」，正文不入库（`auto_if_single` 未 commit）。
- 规划区「同步故事状态」仍走旧 API。
- 「写下一章」只换章，空章主按钮仍是「生成正文」。
