# 回炉重写运行时（rewrite_chapter）

日期：2026-08-19  
状态：待用户审阅  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.3 `rewrite_chapter` 节（本文件是其实现 spec）
- `2026-08-15-codex-kernel-vault-design.md` v1.4 排期 C（续写/回炉/适配未做）
- 写章切片：`2026-08-18-write-chapter-runtime-design.md`（空章初稿；本片覆盖已有正文）

**Goal：** 作者在工作台对**已有正文**的章点主按钮（由「写草稿」换成「回炉」）时，走内核 `rewrite_chapter`：有正文 → Codex `$story-long-write` 重写本章 → job `awaiting_selection` → 人在写作区预览并采纳后才覆盖账本。空章走写初稿，不走回炉。batch / `generateChapterForGroup` 不动。

## 产品决定（已拍板）

1. 写作区作者入口；独立 `useChapterRewriteJob`。不把 `rewrite` 塞进 `KernelJobAction`。
2. 主按钮随 `has_prose` 切换：空章仍 `write_chapter`；有正文改为 `rewrite_chapter`。`confirm_plan_and_write_draft` / `write_draft` 同一条。
3. 只接受已有正文。空 / 空白 / `【占位正文】` → 400 `CHAPTER_NO_PROSE`。**不**强制细纲。
4. 第一份合同：`oh-story-core.story-long-write.rewrite`。无 70% 原句保留、无审稿匹配、无 spawn 门。
5. `commit.mode=manual`。写作区自己做 `awaiting_selection`（预览 + 采纳）。不跳到质检面板。
6. 等待态：已有 `createJobByVerb` + 1s 轮询。无逐字 SSE。
7. 可选字数目标仍只放 `user_brief.length_target`（复用 `writeChapterLengthTarget`）。

## 合同

内置 id：`oh-story-core.story-long-write.rewrite`。`implemented=true`。加入 `IMPLEMENTED_VERBS` 与 `BUILTIN_DEFAULTS.rewrite_chapter`。

`oh-story-core.story-long-write.outline` 仍 `implemented=false`。不要改 `.open` / `.expand` / `.chapter`。

模板 `rewrite_chapter.json` 已存在且 `commit_mode=manual`。修订：`template_gates` 与 `allowed_gates` 都加上 `reject_outline_artifact`（与写初稿一样，禁改 `大纲/`）。

锁定字段：

```ts
{
  schema_version: 1,
  id: 'oh-story-core.story-long-write.rewrite',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'rewrite',
  verb: 'rewrite_chapter',
  capability: 'rewrite',
  label: '回炉重写',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '重写第 {{chapter_no}} 章《{{chapter_title}}》。',
      '在已有正文上整章重写；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（本章正文）。可以更新 追踪/ 下与本章相关的记录。',
      '不要开书，不要扩纲，不要写其他章，不要修改 大纲/，不要创建其它 正文/ 文件。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'manual', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_rewrite' },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

不挂 `review_report`。不加 `require_spawn_evidence`、`paragraph_retention_70`、`require_matching_review`、`reject_chapter_text_artifact`。

超时：默认 idle 10min / hard 45min。模型用请求 `model_id`，不写死 302。

## 投影与收存

- 有正文的章挂 `current_chapter`：投影现有 `chapter_text`。skill 必须相对快照改文件，才能过 rewrite「必须变化」。
- 多份 `chapter_text` 收敛**已在** `run-job.ts` persist 之前（`collapseRewriteChapterArtifacts`）。回炉直接走，不再做一套。deslop / apply / write_chapter 同一条。
- 改了 `大纲/` 前缀 → `REJECT_OUTLINE` gated，不入库。
- `tracking_doc` 可选，`kernel_only`。
- 人点采纳后走现有 `chapters.rewrite`：`updateNovelChapter(..., { versionSource: contract.commit.source })`。`source` 为 `oh_story_rewrite`。与 deslop / write 一样允许 `as any` 写入版本表，本片不强制扩 `NovelChapterVersionSource` 联合类型。
- 一次任务只更新 `subject_id` 那一行。采纳前账本正文不变。
- 不插空章行。

## 预检（进 Codex 之前）

在 `validateCreateKernelJob` 里，`verb === 'rewrite_chapter'` 时：

1. `getNovelChapter(ws, subject_id, project_id)` 为空 → 400 `CHAPTER_NOT_FOUND`。
2. `chapterTextHasProse(chapter_text) === false` → 400 `CHAPTER_NO_PROSE`。口径与写初稿相同：`trim` 非空 **且** 不含 `【占位正文】` 才算有正文。空章、占位稿、全空白必须走 `write_chapter`，回炉拒绝。
3. **不**做 `OUTLINE_MISSING`。投影仍可挂 `outline`（有则给 skill 看）。
4. 不要求 `user_brief`。若带了：序列化进 `brief_json`（32KiB 上限）。cockpit 字数格式与写初稿相同。
5. 章级判重：`project_id + verb + subject_id` 未结束 → 409 `PROJECT_JOB_RUNNING`。

`write_chapter` 的 `CHAPTER_HAS_PROSE` / `OUTLINE_MISSING` 不套到回炉。`open_book` 的缺 idea 也不套。

候选 succeeded 且合同 `commit.mode=manual` → job `awaiting_selection`。**不要** `auto_if_single`。写作区调用已有 `commitJob(jobId, candidateId)` 才入库。取消 `cancelJob`，账本保持旧正文。

## 工作台

- 新 hook：`ui/web/src/pages/novel-workspace/shell/use-chapter-rewrite-job.ts`。**不要**把回炉状态机并进 `useChapterWriteJob`（写初稿无 `awaiting_selection` / 无 `commit`）。
- 状态：`idle` | `running` | `awaiting_selection` | `failed`。`reduce` 对 `awaiting_selection` **保持**该相（与写初稿把 selection 折成 failed 相反）。
- `start(chapterId)`：`flushPendingSave` → `createJobByVerb({ verb: 'rewrite_chapter', ... })` → `pollKernelJob`（1s）。`committed` / `cancelled` → idle。`failed` → toast。`awaiting_selection` → 停在预览，**不要**自动 `commitJob`。
- `commit(candidateId)`：`api.commitJob` → `loadProjectModules` → toast「本章回炉已写入」→ idle。
- `cancel`：只 cancel 当前回炉 jobId（`jobIdRef`，避免 create 窗口漏 cancel，沿用写初稿修复）。
- 主按钮：现有 `chapterHasProse(activeChapter)` 为真则 `startKernelRewriteChapter`，否则仍 `startKernelWriteChapter`。不要在 `generateCurrentChapterProse` 里再打 `generate-prose`。服务器预检只认 `chapterTextHasProse`（trim 正文）。若 UI helper 因 `word_count` 误亮回炉，以 400 `CHAPTER_NO_PROSE` 为准；本片不重写 `utils.chapterHasProse`。
- 写作区在 `awaiting_selection` 展示本章 `chapter_text` 产物预览（`getArtifactContent`）+ 采纳 / 取消。不跳质检面板，不在本片做多合同对比。
- 同步 400 toast：`CHAPTER_NO_PROSE` → 「本章还没有正文，请先写草稿」；`CHAPTER_NOT_FOUND` 沿用「找不到该章」。
- 不传 `contract_ids`，走 `verb_defaults`。

## 错误码（本片新增）

| 码 | HTTP | 何时 |
|---|---|---|
| `CHAPTER_NO_PROSE` | 400 | 回炉预检失败：没有可覆盖的正文 |

`CHAPTER_NOT_FOUND` / `PROJECT_JOB_RUNNING` 沿用。终态仍用现有：`CHAPTER_FILE_MISSING`、`REJECT_OUTLINE`、`OUTPUT_MISSING`、`ENGINE_FAILED`、`CANCELLED`。

实现后把 `CHAPTER_NO_PROSE` 折进动词 spec 错误表；内核 spec 排期 C 把回炉标成已按本文件落地。`CHAPTER_HAS_PROSE` 文案「请用回炉或按建议改稿」保持，本片落地后该提示成真。

## 测试

基板（`cd ui/server && bun test`，不接 Codex）：

- 新合同通过实例对模板校验；`commit.mode === 'manual'`；`source === 'oh_story_rewrite'`。
- `IMPLEMENTED_VERBS` 含 `rewrite_chapter`；`.outline` 仍未实现。
- 空章 / 占位 → `CHAPTER_NO_PROSE`，无候选目录。
- 有正文、无细纲 → 预检 **过**。
- 无章行 → `CHAPTER_NOT_FOUND`。
- 假 runner 写出非空本章 → 候选 `succeeded`，job `awaiting_selection`，账本仍是旧正文；再 `commitKernelCandidate` → 正文换成收获文本，`latestVersionSource === 'oh_story_rewrite'`。
- 假 runner 写空文件 → `CHAPTER_FILE_MISSING`，账本不变。
- 假 runner 改 `大纲/` → `REJECT_OUTLINE`，账本不变。
- 同章第二个 `rewrite_chapter` → 409；不同章可 ok。

工作台（`cd ui/web && bun test`）：

- 有正文时主路径 `createJobByVerb` 的 `verb === 'rewrite_chapter'`，不 fetch `generate-prose`。
- 空章路径仍 `write_chapter`。
- batch 测试仍可打旧 generate-prose。
- reducer：`awaiting_selection` 保持 selection 相，不折成 failed。
- toast 覆盖 `CHAPTER_NO_PROSE`。

真机验收（实现计划最后一项，模型 **304**，不打过期 8787）：

- 项目 7 第 1 章（写章真机已入库，`has_prose=true`）。
- `POST /api/kernel/jobs` `verb=rewrite_chapter` `model_id=304` → job `awaiting_selection`，账本正文仍是旧稿。
- `POST .../commit` 后正文变为新稿，`source=oh_story_rewrite`，旧稿在 `chapter_versions`。
- 对空章（如第 2 章）POST 回炉 → 400 `CHAPTER_NO_PROSE`。

## 非目标

- `write_continue`、`adapt_pack`、扩纲工作台按钮。
- 410 `generate-prose`；改 `generateChapterForGroup`。
- 画布 `prompt` 合同。
- 把回炉并入质检 `KernelJobAction` 或多选并跑 UI。
- 强制细纲；自动插章行。
- 套 70% / 审稿匹配 / spawn 门。

## 与旧文档

- **实现** 动词规范 `rewrite_chapter`：补合同实例、无正文预检、作者入口、manual 采纳。
- **不覆盖** `write_continue`。
- **不替代** `apply_review`（外科手术 + 70% 仍在质检面板）。
- 实现后更新内核 spec 排期 C 与动词 spec「与现网合同」回炉行。
