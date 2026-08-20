# 续写运行时（write_continue）

日期：2026-08-20  
状态：已落地  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.5 `write_continue` 节（本文件是其实现 spec）
- `2026-08-15-codex-kernel-vault-design.md` v1.6 排期 C 续写已落地
- 写章切片：`2026-08-18-write-chapter-runtime-design.md`（单章空章初稿）
- 回炉切片：`2026-08-19-rewrite-chapter-runtime-design.md`（单章已有正文）

**Goal：** 作者在写作区「更多 · 续写」走内核 `write_continue`：从当前章之后第一空章起连续 `count` 章（菜单先写死 2）→ 一次项目级 Codex `$story-long-write` 写出窗口内空章 → `auto_if_single` 入库。「写下一章」仍只跳章。batch / `generateChapterForGroup` 不动。

## 产品决定（已拍板）

1. 写作区作者入口在「更多」，标签 **续写**。独立 `useProjectContinueJob`。不把 `continue` 塞进 `KernelJobAction`。不并进 `useChapterWriteJob` / `useChapterRewriteJob`。
2. **不**改「写下一章」（`accept_chapter_and_continue` 仍只 `selectChapterForWriting`）。
3. 窗口：从**当前章号之后**第一空章起，连续 `count` 个章号。默认 `count=2`，上限 3。窗口内每一章都要有章行、有细纲、且无正文；缺一块就 400，不缩短、不跳过已写章。空章界面不出现「续写」（用「生成正文」）。
4. 第一份合同：`oh-story-core.story-long-write.continue`。无 70% 原句保留、无审稿匹配、无 spawn 门。
5. `commit.mode=auto_if_single`。不在写作区做多章预览采纳。若异常进入 `awaiting_selection`，当作失败（与写章相同），不自动乱 commit。
6. 等待态：`POST /api/kernel/jobs` + 1s 轮询。无逐字 SSE。
7. 可选字数目标只放 `user_brief.length_target`（复用 `writeChapterLengthTarget`）。菜单不做 count 选择器。

## 合同

内置 id：`oh-story-core.story-long-write.continue`。`implemented=true`。加入 `IMPLEMENTED_VERBS` 与 `BUILTIN_DEFAULTS.write_continue`。

`oh-story-core.story-long-write.outline` 仍 `implemented=false`。不要改 `.open` / `.expand` / `.chapter` / `.rewrite`。

模板 `write_continue.json` 已存在。修订：`template_gates` 与 `allowed_gates` 都加上 `reject_outline_artifact`。`required_kinds` 保持 `chapter_text` min=1（`count` 是动态的，份数在收获后按窗口校验，不写进模板 min）。

`KERNEL_MOUNTS` 增列 `continue_window`、`continue_previous`。这两项**不是**章级挂载：`validateInstanceAgainstTemplate` 的 `CHAPTER_MOUNTS` / `project.ts` 的 `CHAPTER_LEVEL_MOUNTS` 仍只含 `current_chapter` / `previous_chapter` / `review_report`。

锁定字段：

```ts
{
  schema_version: 1,
  id: 'oh-story-core.story-long-write.continue',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'continue',
  verb: 'write_continue',
  capability: 'rewrite',
  label: '续写',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '续写第 {{chapter_no}} 章（{{chapter_title}}）。',
      '从上一章 {{previous_chapter_file}} 接着写；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（窗口内正文）。可以更新 追踪/ 下与这些章相关的记录。',
      '不要开书，不要扩纲，不要修改 大纲/，不要写窗口以外的 正文/ 文件，不要改 参考/。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['continue_window', 'continue_previous', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_continue' },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

收获 glob **不得**用 `{{chapter_pad}}`（项目主体没有单章 pad，会变成 `正文/第章_*.md`）。不挂 `review_report`。不加 `require_spawn_evidence`、`paragraph_retention_70`、`require_matching_review`、`reject_chapter_text_artifact`。

超时：默认 idle 10min / hard 45min。模型用请求 `model_id`，不写死 302。

Prompt 变量仍只用现有 `KERNEL_PROMPT_VARIABLES`，不新增：

- `chapter_no`：`2-3`（窗口起止章号，中间用 ASCII 连字符）
- `chapter_title`：窗口内各章标题，用顿号拼接
- `scope_files`：窗口内投影正文路径，逗号分隔
- `previous_chapter_file`：有上一章正文时为 `参考/上一章.md`，否则空串
- `user_brief_file`：有 brief 时为 `brief.md`

## 预检（进 Codex 之前）

在 `validateCreateKernelJob` 里，`verb === 'write_continue'` 时：

1. `subject_type` 必须是 `project` 且 `subject_id === project_id`，否则沿用 `SUBJECT_TYPE_MISMATCH`。
2. 解析 `verb_params`：
   - `from_chapter_no` 必须是 ≥1 的整数。
   - `count` 缺省为 2；若出现则必须是 1–3 的整数。
   - 任一不合 → 400 `VERB_PARAMS_INVALID`。
3. 窗口章号：`from_chapter_no` … `from_chapter_no + count - 1`（闭区间、连续整数）。
4. `listNovelChapters` 后按 `chapter_no` 对齐每一窗格：
   - 无行 → 400 `CHAPTER_NOT_FOUND`（`message` 写明「找不到第 N 章」）。
   - `chapterTextHasProse(chapter_text)` 为真 → 400 `CHAPTER_HAS_PROSE`（`message` 写明「第 N 章已有正文」）。口径与写章相同：`trim` 非空 **且** 不含 `【占位正文】`。
   - `chapterHasMatchingOutline` 为假 → 400 `OUTLINE_MISSING`（`message` 写明「第 N 章还没有细纲」）。匹配规则与写章完全相同：`outline_id`、`raw_payload.chapter_no`、`parseChapterNoFromRelPath(kernel_rel_path)` **只传路径**。
5. 不要求 `user_brief`。若带了：序列化进 `brief_json`（32KiB 上限，超限 400 `BRIEF_REQUIRED`）。cockpit 字数格式与写章相同。
6. 项目级判重：`project_id + verb` 未结束 → 409 `PROJECT_JOB_RUNNING`。不按窗口章号与 `write_chapter` 交叉判重（那是另一动词）；工作台若写章/回炉 hook 正在跑，按钮侧拒绝发续写。

空项目且无细纲会在第 4 步变成 `CHAPTER_NOT_FOUND` 或 `OUTLINE_MISSING`，不另造 `FOUNDATION_PRECONDITION`。`open_book` 的缺 idea 不套到续写。

把解析后的 `{ from_chapter_no, count }` 写入 job.`verb_params`（已有列）。后续投影、收获、门、commit 只信这一份，不让 UI 再算一遍窗口。

## 投影与收存

`RunKernelCandidateInput` / `projectKernelSubject` 增加 `verbParams`（从 job.`verb_params` 读）。续写投影在 `subjectType === 'project'` 且挂了 `continue_window` 时使用。

- `continue_window`：对窗口内每一章写出空文件 `正文/第{{pad}}章_{标题}.md`（`chapterRelPath`，正文 `''`，与写空章相同），并写 `大纲/第{{pad}}章.md` 章卡（字段与现网章主体 `outline` 挂载的章卡相同：目标/概要/冲突/章末钩子）。快照含这些空正文；skill 填入后相对快照有变化，才能过 rewrite「必须变化」。
- `continue_previous`：`chapter_no < from_chapter_no` 且 `chapterTextHasProse` 最近的一章，写入 `参考/上一章.md`（全文）。`write_scope` 不含 `参考/`。没有上一章有正文时不写该文件，`previous_chapter_file` 为空。
- 已有 `outline` 挂载仍回放账本大纲（`kernel_rel_path`）。窗口章卡由 `continue_window` 补；允许与回放文件并存。
- **不要**给项目主体挂 `current_chapter` / `previous_chapter`（会 `TEMPLATE_UNSATISFIED` / 投影抛 `CONTRACT_INVALID`）。
- `collapseRewriteChapterArtifacts` 对 `subjectType !== 'chapter'` 本来就是 no-op。续写**不要**走「只留一份 currentRel」。在 persist 之前加 `collapseContinueChapterArtifacts`：
  1. 窗口内每个章号的投影路径记为 `projectedRel[n]`。
  2. 所有 `chapter_text` 用 `parseChapterNoFromRelPath(rel_path)` **只传路径**取章号。
  3. 章号不在窗口 → 降为 `attachment`，不入库。
  4. 同一窗格多份：若其中一份 `rel_path === projectedRel[n]`，其余降为 `attachment`；若没有一份等于投影路径且多于一份 → `OUTPUT_MISSING`（列出路径，拒绝猜）。恰一份（含改标题另存）→ 用它。
  5. 窗口内某个章号零份 `chapter_text` → `OUTPUT_MISSING`。
- 改了 `大纲/` 前缀 → `REJECT_OUTLINE` gated，不入库。
- `require_chapter_file` 在 `verb === 'write_continue'` 时：折叠后仍为 `chapter_text` 的每一份都必须非空（`replace(/\s/g, '')` 非空），且份数必须等于 `count`；否则 `CHAPTER_FILE_MISSING`。不要只 `find` 第一份。
- `tracking_doc` 可选，`kernel_only`。
- commit：`verb === 'write_continue'` 且 `binding === 'chapters.rewrite'` 时，**禁止** `updateNovelChapter(ws, job.subject_id, …)`（那是 project id）。对每份仍为 `chapter_text` 的产物：`parseChapterNoFromRelPath(rel_path)` 只传路径 → `listNovelChapters` 对齐该 `chapter_no` → `updateNovelChapter(ws, chapter.id, { chapter_text }, { versionSource: 'oh_story_continue' as any })`。找不到行 → 500 `CHAPTER_NOT_FOUND`（预检已过则属内部错误）。本片不强制扩 `NovelChapterVersionSource` 联合类型。
- 不插空章行。窗口外章、已有正文的章，账本不变。

## 工作台

- 新 hook：`ui/web/src/pages/novel-workspace/shell/use-project-continue-job.ts`。状态：`idle` | `running` | `failed`。`reduce` 把 `awaiting_selection` 折成 `failed`（与写章相同，与回炉相反）。
- `start({ fromChapterNo, count })`：若写章/回炉 hook 正在跑 → toast「先等当前写章或回炉结束」并返回。否则 `flushPendingSave` → `createJobByVerb({ verb: 'write_continue', subjectType: 'project', subjectId: projectId, verbParams: { from_chapter_no, count }, userBrief })` → `pollKernelJob`（1s）。`committed` / `cancelled` → idle 并 `loadProjectModules`。`failed` → toast。
- `cancel`：只 cancel 当前续写 `jobIdRef`（create 窗口漏 cancel 的修法沿用写章）。
- 扩展 `createJobByVerb`：允许 `subjectType: 'project'`、`subjectId: projectId`、`verbParams`。`write_chapter` / `rewrite_chapter` 调用点仍发章主体，不得被这次改坏。
- `buildChapterWorkflowPresenter`：凡 `hasProse` 的阶段（`written_unchecked` / `writing` / `needs_revision` / `needs_state_sync` / `ready_next`）在 `secondaryActions` 加入 `{ key: 'write_continue', label: '续写', kind: 'default' }`。空章 / 缺材料 / 准入失败不加。`ChapterActionBar` 的 `run` 增加 `write_continue` → `handlers.onWriteContinue`。该 key 进 `MODEL_ACTION_KEYS`。
- `onWriteContinue`：`from_chapter_no` = 当前 `chapter_no` 之后、`chapterHasProse` 为假的最小章号；`count = 2`。没有后续空章 → toast「后面没有空章」。不要在客户端预先模拟整窗细纲检查；以服务器 400 为准。
- 写作区 busy 由 hook 的 `running` 驱动：hint 用「正在续写第 N–M 章」+ `elapsed_ms`。不设 SSE `streamingText`。
- toast：`VERB_PARAMS_INVALID` → 「续写参数无效」；`CHAPTER_HAS_PROSE` / `OUTLINE_MISSING` / `CHAPTER_NOT_FOUND` 沿用现文案（服务器 `message` 已含章号时，优先展示 `error` 字段）。写入 `kernelJobUserMessage`。
- 不传 `contract_ids`，走 `verb_defaults`。
- 审计：`accept_chapter_and_continue`、batch / 导演 / `generateChapterForGroup` / `workspace-production-handlers` / `workspace-run-queue-handlers` 不得误切到 `write_continue`。

## 错误码（本片新增或首次产品化）

| 码 | HTTP | 何时 |
|---|---|---|
| `VERB_PARAMS_INVALID` | 400 | `from_chapter_no` / `count` 缺失或越界 |

沿用：`CHAPTER_NOT_FOUND`、`CHAPTER_HAS_PROSE`、`OUTLINE_MISSING`、`SUBJECT_TYPE_MISMATCH`、`PROJECT_JOB_RUNNING`、`BRIEF_REQUIRED`。终态仍用现有：`CHAPTER_FILE_MISSING`、`REJECT_OUTLINE`、`OUTPUT_MISSING`、`ENGINE_FAILED`、`CANCELLED`。

实现后把 `VERB_PARAMS_INVALID` 折进动词 spec 错误表；`CHAPTER_NOT_FOUND` 文案范围扩到续写窗口内缺行；内核 spec 排期 C 把续写标成「有 spec / 落地后改已落地」。

## 测试

基板（`cd ui/server && bun test`，不接 Codex）：

- 新合同通过 `validateKernelContract` + `validateInstanceAgainstTemplate`；`commit.mode === 'auto_if_single'`；`source === 'oh_story_continue'`；挂载含 `continue_window` 且不含 `current_chapter`。
- `IMPLEMENTED_VERBS` 含 `write_continue`；`.outline` 仍未实现。
- `count: 4` 或 `from_chapter_no: 0` → 400 `VERB_PARAMS_INVALID`，无候选目录。
- 缺 `verb_params.from_chapter_no` → 400 `VERB_PARAMS_INVALID`。
- 窗口第 2 章无行 → `CHAPTER_NOT_FOUND`。
- 窗口某章已有正文 → `CHAPTER_HAS_PROSE`。
- 窗口某章无细纲 → `OUTLINE_MISSING`。
- 占位稿 / 空白算空章，预检过。
- `subject_type: chapter` → `SUBJECT_TYPE_MISMATCH`。
- 假 runner 写出窗口内两份非空正文 → job `committed`，那两章有正文，`latestVersionSource === 'oh_story_continue'`，窗口外章不变。
- 假 runner 只写窗口第一份 → `CHAPTER_FILE_MISSING` 或 `OUTPUT_MISSING`，两章账本仍空。
- 假 runner 写空文件 → `CHAPTER_FILE_MISSING`。
- 假 runner 改 `大纲/` → `REJECT_OUTLINE`，正文不变。
- 假 runner 额外写窗口外 `正文/第00N章_*.md` → 该份成 `attachment`，不写入对应章；窗口内两章仍入库。
- 假 runner 对窗格内同一章写投影原名 + 另一标题 → 只入库 `projectedRel`，另一份 attachment。
- 同项目第二个 `write_continue` 在先 job 未结束时 → 409；`write_chapter` 对窗口外另一章仍可创建（不同 verb）。
- 缺 `from` 的上一章有正文时，投影含 `参考/上一章.md`；`from_chapter_no === 1` 且无更早章时不含该文件。

工作台（`cd ui/web && bun test`）：

- 有正文时「更多」含「续写」；点下去 `POST /kernel/jobs` 且 `verb === 'write_continue'`、`subject_type === 'project'`、`verb_params.count === 2`。
- 「写下一章」仍不打 `/kernel/jobs`。
- 空章 presenter 不含「续写」。
- batch / 导演相关测试仍可打旧 generate-prose。
- `createJobByVerb` 的写章/回炉调用仍是 `subject_type: chapter`。
- reducer：`awaiting_selection` 折成 failed。
- toast 映射覆盖 `VERB_PARAMS_INVALID`。

真机验收（实现计划最后一项，模型 **304**，不打过期 8787；现网 API 以 `127.0.0.1:8788` 为准）：

- 选一本已有正文的章 N，且 N+1、N+2 为空章并有细纲（优先项目 7；缺行则先开书/建行，不在本片自动插行）。
- `POST /api/kernel/jobs` `{ verb: 'write_continue', subject_type: 'project', subject_id: project_id, model_id: 304, verb_params: { from_chapter_no: N+1, count: 2 } }` → job `committed`；那两章 `has_prose=true`，版本 `oh_story_continue`；第 N 章正文不变。
- 再对同一窗口 POST → 400 `CHAPTER_HAS_PROSE`。
- 工作台在第 N 章点「续写」发出相同 `from_chapter_no`；「写下一章」只切章。

## 非目标

- `adapt_pack`、扩纲工作台按钮。
- 410 `POST /novel/chapters/:id/generate-prose`。
- 改 `generateChapterForGroup` 内部。
- 画布 `prompt` 合同。
- count 选择器；续写 `awaiting_selection` 预览条。
- 给「只有细纲没有章行」自动 `INSERT` 章行。
- 把续写并入质检 hook 或多选合同 UI。
- 新增 prompt 模板变量；把 `参考/` 写进 `write_scope`。
- 跨动词占用（服务器用 `write_chapter` 的章级锁挡住续写窗口）。工作台只在写章/回炉 hook 忙时拒发。

## 与旧文档

- **实现** 动词规范 `write_continue`：补合同实例、窗口预检、项目主体投影、按路径循环 commit、作者「更多 · 续写」。
- **收紧** 规范「`chapter_text` ≥1 且 ≤ count」：收获后必须刚好 `count` 份窗口内非空正文才过门（允许 skill 少写会留下半截窗口，与已拍板「连续 count 章」冲突）。
- **不覆盖** `write_chapter` / `rewrite_chapter`。
- **不替代** `generateChapterForGroup`：batch 仍走它。
- **不替代** `accept_chapter_and_continue` 的跳章语义。
- 实现后更新内核 spec 排期 C 与动词 spec「与现网合同」续写行、错误表。
