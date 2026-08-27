# 扩纲工作台按钮（expand_outline）

日期：2026-08-27  
状态：已确认，待实现  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.6 `expand_outline` 节（运行时已落地；本文件只接工作台按钮）
- `2026-08-15-codex-kernel-vault-design.md` v1.7 排期 C（扩纲运行时已落地，无工作台按钮）
- 扩纲运行时：`2026-08-18-expand-outline-runtime.md`（本片不重做内核）

**Goal：** 作者在规划区（主入口）或写作区「更多」（次入口）点「扩纲」→ 已落地的 `expand_outline` job → 规划区预览大纲产物 → 人采纳后 `outlines.upsert`。不改正文。不替换规划区旧的「未来100章 / 滚动规划 / 同步故事状态」。

## 产品决定（已拍板）

1. **两个入口。** 规划区是主入口；写作区「更多 · 扩纲」也有。空章主按钮仍是「生成正文」；只要「更多」在，扩纲就在里面。
2. **预览只在规划区。** 从「更多」点下去**立刻**切到规划工作台。进度、失败、预览、采纳、丢弃都在规划区。写作区不挂扩纲预览条。
3. **旧扩纲链路先并存。** 「同步故事状态 / 生成未来100章 / 更新滚动规划 / 补当前卷」不改、不改为 `POST /kernel/jobs`。本片不把它们下线。
4. **独立 hook。** `useExpandOutlineJob`，不并进 `useProjectContinueJob` / 写章 / 回炉 / 适配 hook，不把 `expand_outline` 塞进 `KernelJobAction`。
5. **不改内核运行时。** 合同、预检 `FOUNDATION_PRECONDITION`、`commit.mode=manual`、`outlines.upsert`、禁 `outlines.replace`、禁写 `chapters`、门 `reject_chapter_text_artifact` 保持现状。本片只接 UI 与现有 job API。
6. **不改**「写下一章」、`generateChapterForGroup` / batch、画布 `prompt`、适配、续写行为。`.outline` 仍 `implemented=false`。
7. 超时仍默认 idle 10min / hard 45min。模型用请求 `model_id`（现网 304），不写死 302。采纳**不**改 `verb_defaults`。

## 入口

规划区：在现有「大纲扩写流程」卡片**附近**加「扩纲」（不替换流程步骤按钮）。无账本大纲时禁用，说明「先有大纲再扩纲」（与预检码同一句）。有未结束扩纲时按钮表示进行中/去预览，不另开一条。

写作区「更多」：增加 `expand_outline` / 文案「扩纲」，放在「续写」旁。点击顺序：切到规划工作台 → 同一 hook `start()` 或 `resume()`。已经 `awaiting_selection` 则只跳转、不再 POST。

`createJobByVerb`：

```ts
{
  verb: 'expand_outline',
  subjectType: 'project',
  subjectId: projectId, // 必须等于 project_id
  projectId,
  modelId: selectedModelId, // 当前内核模型，不是写作 skill 模型
  chapterId: 0, // 类型需要；body 的 subject_id 用 subjectId/projectId
}
```

不传 `contract_ids`（走 `verb_defaults.expand_outline` → `oh-story-core.story-long-write.expand`）。不传 `user_brief`。不传 `subject_key`。

## Hook 与占用

状态：`idle` | `running` | `awaiting_selection` | `failed`。`awaiting_selection` 是预览，**不要**折成 `failed`（续写 hook 若有此折叠，扩纲不得复用）。

占用：现网项目主体规则——同 `project_id` + `verb=expand_outline` 只能有一个非终态 job（`queued` / `running` / `awaiting_selection`）。违反 → 409 `PROJECT_JOB_RUNNING`。不和续写、写章、回炉、适配交叉锁。

续看：规划区挂载或从「更多」切过来时 `listJobs({ verb: 'expand_outline', projectId })`（现有 GET 已支持这两个查询）。命中非终态 → 回到进度或预览。若 POST 409 且 list 为空：规划区说明「该项目扩纲未结束」。

取消：`running` 且已有 `jobId` 才显示取消；`awaiting_selection` 走「丢弃」=`cancel`。取消只停这一条扩纲 job，不动旧未来100章任务。切规划/写作桌面不 `cancelJob`（可续看）。

## 预览与采纳

规划区在 `awaiting_selection` 列出本 job 的 `outline_doc` 产物：`rel_path` + `GET /kernel/artifacts/:id/content` 正文（截断沿用现网 256KiB）。其它 kind 不当预览主列表。

- 「采纳」：`POST /kernel/jobs/:id/commit` `{ candidate_id }`。成功后刷新规划/大纲树。Toast 表明已写入大纲，正文未改。
- 「丢弃」：`cancel`。
- 门控失败（含改了 `正文/` → `reject_chapter_text_artifact`）或其它终态失败：`failed`，**无采纳**。
- **禁止** `putVerbDefaults` / `saveVerbDefaults`。

Commit 语义保持运行时：`outlines.upsert`，不写 `chapters`。二次 commit 仍 409 `JOB_ALREADY_COMMITTED`。

## 错误码（工作台）

| 码 | 工作台 |
|---|---|
| `FOUNDATION_PRECONDITION` | 「扩纲需要账本里已有大纲」。按钮禁用用同一句。补进 `kernelJobUserMessage`。 |
| `PROJECT_JOB_RUNNING` | 扩纲 hook **本地**用「该项目扩纲未结束」。**不改**全局 toast「同项目同动词任务未结束」。 |
| 其它 | 沿用 `kernelJobUserMessage`（`KERNEL_RUNTIME_UNAVAILABLE`、`CANCELLED` 等）。 |

`VERB_PARAMS_INVALID` 仍是「续写参数无效」；扩纲不传 `verb_params`，不必改这句。

## 测试

工作台（`cd ui/web && bun test`）：

- 规划区源码含「扩纲」，该按钮走 `expand_outline` / `createJobByVerb`，不走 `future100_generate`。
- 「更多」含「扩纲」；点击会切规划工作台。
- 未来100章 / 滚动规划路径**不含** `/kernel/jobs`、不含 `expand_outline`。
- hook：`createJobByVerb` 带 `subjectType: 'project'`、`subjectId === projectId`、`verb: 'expand_outline'`，不带 `subject_key`。
- `awaiting_selection` 保持预览，不折失败。
- `commit` 不调 `putVerbDefaults`；丢弃调 `cancelJob`。
- 无大纲时规划区按钮禁用（源码或模型测试）。
- `KernelJobAction` 仍是 `'review' \| 'deslop' \| 'apply'`。不改「写下一章」。

内核：本片不要求新的 server 测试，除非接线时发现运行时缺口。回归可跑既有 `expand-outline.test.ts`。

真机（模型 **304**，`127.0.0.1:8788`）：

- 有大纲的项目：规划区「扩纲」→ `awaiting_selection` → 采纳 → 大纲账本 upsert，正文不变。
- 无大纲：按钮不可用（或 400 `FOUNDATION_PRECONDITION`）。
- 写作区「更多 · 扩纲」立刻进入规划区；同项目第二条扩纲 409 / 续看。

## 纸面（实现后）

- 动词 spec：扩纲工作台按钮已落地；入口规划区 + 「更多 · 扩纲」；预览在规划区。分期 4+ 不再写「扩纲按钮未做」。batch / `generateChapterForGroup` 仍另开。
- 内核 spec：排期 C「无扩纲工作台按钮」改为已接规划区/更多。不把 `.outline` 标可执行。不把 batch 标已落地。
- 本文件状态改为「已落地」仅当代码绿且真机过。

## 非目标

- 下线或改写「未来100章 / 滚动规划 / 同步故事状态」。
- `generateChapterForGroup` / batch / 410 generate-prose。
- 画布 `prompt`。
- 改 Codex 源码、改扩纲合同模板、改 `commit.mode`。
- 把扩纲并进质检 `KernelJobAction`。
- 无大纲时自动开书。
- 给没有章行的细纲自动插章（扩纲 commit 保持 upsert 大纲）。

## 与旧文档

- **接上** 动词规范 `expand_outline`：运行时已在 `2026-08-18-expand-outline-runtime`；本片只补「无工作台按钮」那条缺口。
- **不覆盖** 开书 `open_book`、写章、回炉、续写、适配。
- **不替代** 规划区旧提示词扩纲链路；并存直到另开下线 spec。
