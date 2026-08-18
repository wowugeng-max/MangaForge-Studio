# 写本章运行时（write_chapter）

日期：2026-08-18  
状态：待用户审阅  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.2 `write_chapter` 节（本文件是其「必须另开」的实现 spec）
- `2026-08-15-codex-kernel-vault-design.md` v1.3 排期 C（写章未做）
- 扩纲切片：`2026-08-18-expand-outline-runtime.md`（无工作台按钮；本片要接作者入口）

**Goal：** 作者在工作台点「确认计划，进入初稿」/「写草稿」时，走内核 `write_chapter`：空章 + 有细纲 → Codex `$story-long-write` Phase 4 写本章 → `auto_if_single` 入库。已有正文拒绝。不替换 `generateChapterForGroup` 整条旧根。

## 产品决定（已拍板）

1. 作者入口切内核；batch / 导演 / `generate-prose` 旧路先留。
2. 只写空章。`has_prose` → 400，提示回炉或按建议改稿。`rewrite_chapter` 另开。
3. 第一份合同：`oh-story-core.story-long-write.chapter`，`$story-long-write` Phase 4「写第 N 章」。
4. 等待态：`POST /api/kernel/jobs` + 1s 轮询。无逐字 SSE。
5. 只把字数目标放进 `user_brief.length_target`。场景卡预检、导演 longform 罗盘不跟。
6. 写作区单独 `useChapterWriteJob`。质检 `useChapterKernelJob` 不动，不把 `write` 塞进 `KernelJobAction`。

## 合同

内置 id：`oh-story-core.story-long-write.chapter`。`implemented=true`。加入 `IMPLEMENTED_VERBS` 与 `BUILTIN_DEFAULTS.write_chapter`。

`oh-story-core.story-long-write.outline` 仍 `implemented=false`。

锁定字段：

```ts
{
  schema_version: 1,
  id: 'oh-story-core.story-long-write.chapter',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'chapter',
  verb: 'write_chapter',
  capability: 'rewrite',
  label: '写本章',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '写第 {{chapter_no}} 章《{{chapter_title}}》。',
      '执行单章写作 Phase 4；写完后做 Phase 5 检查，然后停止。',
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
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_write' },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

修订 `write_chapter.json`：`template_gates` 与 `allowed_gates` 都加上 `reject_outline_artifact`（动词规范「不得偷跑开书」升为结构门）。`mention_policy` 仍是 `required`。`commit_mode` 仍是 `auto_if_single`。

不挂 `review_report`（否则 rewrite 投影会写 `改稿/指令.md`）。不加 `require_spawn_evidence`、`paragraph_retention_70`、`reject_chapter_text_artifact`。

超时：默认 idle 10min / hard 45min，不套开书 15/60。模型用请求 `model_id`，不写死 302。

## 投影与收存

- 空章也挂 `current_chapter`：写出 `正文/第{{chapter_pad}}章_{标题}.md`，内容可以是空字符串。快照含该文件；skill 填入后相对快照有变化，才能过 rewrite「必须变化」。
- 收获 glob 只覆盖**本章** pad。命中多份时：优先等于投影 `currentRel` 的那份入库；其余当 `attachment`。一份都没有或投影那份空 → `CHAPTER_FILE_MISSING` / `OUTPUT_MISSING`（与去AI 同一套 `require_chapter_file`：rewrite 看收获正文，不看账本旧稿）。
- 改了 `大纲/` 前缀 → `REJECT_OUTLINE` gated，不入库。
- `tracking_doc` 可选，`kernel_only`，不改正文账本以外的领域表。
- commit 走现有 `chapters.rewrite`：`updateNovelChapter(..., { versionSource: contract.commit.source })`。`source` 为 `oh_story_write`。与 deslop 一样允许 `as any` 写入版本表，本片不强制扩 `NovelChapterVersionSource` 联合类型。
- 一次任务只更新 `subject_id` 那一行。其它章 `chapter_text` 不变。
- 不插空章行（那是 `open_book` 采纳）。扩纲留下的「有细纲、无章行」不在本片自动建行；按钮只出现在已有章行上。

## 预检（进 Codex 之前）

在 `validateCreateKernelJob` 里，`verb === 'write_chapter'` 时：

1. `getNovelChapter(ws, subject_id, project_id)` 为空 → 400 `CHAPTER_NOT_FOUND`。
2. `has_prose === true` → 400 `CHAPTER_HAS_PROSE`。口径与 `listNovelChapters` 相同：`trim(chapter_text)` 非空 **且** 不含 `【占位正文】`。占位稿、全空白算空章，允许写。
3. 该章没有细纲 → 400 `OUTLINE_MISSING`。细纲认定（满足任一即可）：
   - 章行 `outline_id` 非空，且该 id 属于本项目 `outlines`；
   - 本项目某份大纲 `json_extract(raw_payload, '$.chapter_no')` 等于该章 `chapter_no`；
   - 某份大纲 `kernel_rel_path` 经现有 `parseChapterNoFromRelPath` 得到同一 `chapter_no`。
4. 不要求 `user_brief`。若带了：序列化进 `brief_json`（32KiB 上限，超限 400 `BRIEF_REQUIRED`）。cockpit 自定义字数时 `length_target` 写成 `自定义 {n} 字`；非 custom 写成 `word_target_mode={mode}`。`idea` 可空。
5. 章级判重：`project_id + verb + subject_id` 未结束 → 409 `PROJECT_JOB_RUNNING`。

`open_book` 的 `BRIEF_REQUIRED`（缺 idea）不套到写章。

## 工作台

- 新 hook：`ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.ts`。复用 `createKernelJobApi` / `pollKernelJob`（1s）。
- 扩展 kernel 客户端：增加按 `verb` 创建的方法（`project_id`、`subject_type: chapter`、`subject_id`、`model_id`、可选 `user_brief`）。**不要**把 `write` 加进 `KernelJobAction`（`review | deslop | apply`）。
- 改道：`confirm_plan_and_write_draft`、`write_draft`，以及 cockpit 里会落到这两处的「生成正文」。审计 `generateCurrentChapterProse` 调用点：作者入口改 kernel；batch / 导演 / `workspace-production-handlers` / `workspace-run-queue-handlers` 不得误切。
- 写作区 busy 由 hook 的 `running` 驱动：hint + `elapsed_ms`。不再设 SSE `streamingText` 逐字。`committed` 后 `loadProjectModules`。取消只 cancel 这一条写章 job。
- 同步 400 码 toast：`CHAPTER_HAS_PROSE` → 「本章已有正文，请用回炉或按建议改稿」；`OUTLINE_MISSING` → 「本章还没有细纲」。写入 `kernelJobUserMessage`。
- 不传 `contract_ids`，走 `verb_defaults`。不在写作区做多选对比（`auto_if_single`；若异常进入 `awaiting_selection`，toast 失败码并保持不自动乱 commit）。

## 错误码（本片新增或首次产品化）

| 码 | HTTP | 何时 |
|---|---|---|
| `CHAPTER_HAS_PROSE` | 400 | 空章预检失败：已有正文 |
| `CHAPTER_NOT_FOUND` | 400 | `subject_id` 不是本项目章行 |
| `OUTLINE_MISSING` | 400 | 动词规范已有；本片第一次执行 |

终态仍用现有：`CHAPTER_FILE_MISSING`、`REJECT_OUTLINE`、`OUTPUT_MISSING`、`ENGINE_FAILED`、`CANCELLED`。

实现后把 `CHAPTER_HAS_PROSE` / `CHAPTER_NOT_FOUND` 折进动词 spec 错误表；内核 spec 排期 C 把写章标成「有 spec」。

## 测试

基板（`cd ui/server && bun test`，不接 Codex）：

- 新合同通过 `validateKernelContract` + `validateInstanceAgainstTemplate`。
- `resolveContractVerb` / `IMPLEMENTED_VERBS` 含 `write_chapter`；`.outline` 仍未实现。
- 无细纲 → 创建失败 `OUTLINE_MISSING`，无候选目录。
- `has_prose` 真 → `CHAPTER_HAS_PROSE`。
- 正文为 `【占位正文】` 或空白 → 预检过。
- 假 runner 写空 `正文/第00N章_*.md` → 候选 `CHAPTER_FILE_MISSING`，章节账本不变。
- 假 runner 改 `大纲/` → `REJECT_OUTLINE`，正文不变。
- 假 runner 只改本章正文 → job `committed`，该章有正文，版本 `source=oh_story_write`，其它章不变。
- 同章第二个 job → 409 `PROJECT_JOB_RUNNING`；不同 `subject_id` 可并行。

工作台（`cd ui/web && bun test`）：

- `confirm_plan_and_write_draft` / `write_draft` 断言 `POST /kernel/jobs` 且 body.`verb === 'write_chapter'`。
- 不再断言这两条路径打 `/novel/chapters/:id/generate-prose`。
- batch / 导演相关测试仍可打旧 generate-prose。
- toast 映射覆盖 `CHAPTER_HAS_PROSE`、`OUTLINE_MISSING`。

真机验收（实现计划最后一项，模型 **304**，不打过期 8787）：

- 项目 7 第 1 章（开书留下的空章 + 细纲）。
- job 终态 `committed`；工作台 `has_prose=true`。
- 对第 1 章再点一次 → `CHAPTER_HAS_PROSE`，正文不被第二趟覆盖。

## 非目标

- `rewrite_chapter`、`write_continue`、`adapt_pack`。
- 410 `POST /novel/chapters/:id/generate-prose`。
- 改 `generateChapterForGroup` 内部（场景卡、质量预审、MCP 写作）。
- 画布 `prompt` 合同。
- 扩纲工作台按钮；给「只有细纲没有章行」自动 `INSERT` 章行。
- 场景卡 / 导演罗盘 / 写作 skill 市场 payload 进 brief。
- 把写章并入质检 hook 或多选合同 UI。

## 与旧文档

- **实现** 动词规范 `write_chapter`：本文件补上合同实例、已有正文预检、作者入口、字数 brief。
- **不覆盖** 动词规范里 `rewrite_chapter` 与 `write_continue`。
- **不替代** `generateChapterForGroup`：batch 仍走它。
- 实现后更新内核 spec 排期 C 与动词 spec「与现网合同」写章行。
