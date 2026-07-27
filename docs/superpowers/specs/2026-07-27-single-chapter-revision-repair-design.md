# MangaForge 单章质检修订链路修复设计

日期：2026-07-27
状态：已确认，待编写实施计划
范围：小说工作台当前章节的正文质检、编辑器修订、修订后复检和 Story State 同步

## 1. 背景

用户在第一章使用“增强人工写作”的新指令执行“先质检、再修订”后，前端长时间没有结果，服务端持续调用大模型。故障过程中，第一章原有约 5910 字正文还被一个只有 243 字、以“在”结尾的残缺候选覆盖。

本设计同时解决两个问题：

1. 单章质检和修订错误扩展成后续所有章节的串行模型调用；
2. 编辑器修订把非空但明显残缺的 `chapter_text` 当成完整结果入库。

用户已经明确：质检、修订、修订后复检和 Story State 更新都只对当前章生效，不得自动遍历、修改或调用后续章节。

## 2. 回归证据与根因

### 2.1 Fable 5 审查修复的关系

2026-07-26 的 Fable 5 审查修复记录包括：

- 提交 `308fe2f8`：`fix(novel): repair prose guards, POV gates and humanize pipeline`；
- 提交带有 `Co-Authored-By: Claude Fable 5`；
- 审查记录位于 Claude 项目会话 `5ff4c275-1d90-42a0-82b4-dd28ded32cc2`；
- 审查范围覆盖 humanize、service layer、LLM routes、editor safeguards 和 web workspace；
- 修复记忆记录在 `/Users/ruiyaosong/.claude/projects/-Users-ruiyaosong-MangaForge-Studio/memory/r76-fix-followups.md`。

`308fe2f8` 修复了 humanize 内部的候选回退：增加 `preLlmBaseline`、纠正 no-op 判断、保留显式段落删除，并让长度门禁拒绝时真正回退。它没有修改：

- `ui/server/src/routes/novel-editor/register-revision.ts`；
- `ui/server/src/routes/novel-editor/builders.ts`。

Fable 5 的 LLM routes 审查检查了编辑器修订的截断检测和补丁重试，但结论是现有 builders 未发现缺陷。对应测试只证明 `max_tokens` 和锚点失败会重试，没有覆盖“返回了一个非空但严重缩水的完整 `chapter_text`”这一情况。

R76 提交 `565d6bbb` 增强了 humanize 和工作台自定义修订指令的使用面，使旧的编辑器修订入口更容易被实际触发。它修改了工作台修订确认文案和自定义指令传递，但 `auto_quality_check`、`auto_story_state` 以及同步链路在此前已经存在。

因此，准确归因是：R76/Fable 5 新流程暴露了两处既有边界缺陷；Fable 5 在 humanize 路径补了候选保护，却没有把相同保护覆盖到独立的 editor revision 路径，也没有识别到修订后的全章 Story State 遍历。

### 2.2 长时间运行的直接原因

`POST /api/novel/reviews/:reviewId/apply-revision` 当前同步执行：

1. 修订模型；
2. 章节入库；
3. 当前章质检模型；
4. Story State 同步；
5. 返回 HTTP 响应。

前端默认发送：

```json
{
  "auto_quality_check": true,
  "auto_story_state": true
}
```

`syncStoryStateFromChapter` 会选择所有 `chapter_no >= startChapterNo` 且已有正文的章节，并串行调用 Story State 模型。因此从第一章开始同步会遍历全部 30 章。

模型 Provider 默认允许单次尝试最长 600 秒，并最多重试 5 次，即总共可能执行 6 次。路由没有把浏览器连接关闭绑定到 `AbortSignal`，所以前端连接消失后，服务端仍可继续运行。

这不是单一“模型慢”，而是同步 HTTP、全章串行遍历、宽松重试和缺少取消传播共同造成的链路问题。

### 2.3 残稿入库的直接原因

`applySurgicalRevisionPatch` 只要在 payload 中找到非空 `chapter_text`，就把它当作 `full_text` 接受。后续路由只检查结果是否非空或是否应用了补丁，不检查：

- 候选与原文的长度比例；
- Provider 是否通过部分 JSON 恢复得到候选；
- 章节结尾是否完整；
- 全文是否带聊天壳、代码块或 JSON 包装；
- 候选是否仍基于开始修订时的章节版本。

因此 243 字候选虽然明显不完整，仍覆盖了 5910 字正文。修订后的质检模型正确识别了残缺，但它发生在正文入库之后，且不会阻止后续 Story State 遍历。

### 2.4 其他跨章写入

当前修订路由还调用 `collectPlanAlignmentPatchesAfterProseChange`，并以 `followLimit: 3` 更新当前章及最多 3 个后续章节的计划字段。即使不调用后续章节模型，这仍违反“修订只对当前章生效”的范围要求。

### 2.5 Story State 的既有架构限制

项目当前只有全局 Story State，没有每章状态快照。`mergeStoryState` 会把章节增量合并到当前全局状态，无法先恢复到“第 N-1 章状态”再重放。

这说明旧的“从第 N 章重放所有后续章节”不仅慢，还可能把早期章节增量重复累加到最新状态上。当前修复停止自动下游重放，但不在本次范围内建设完整的逐章 Story State 快照体系。较早章节被修改后，以项目级连续性警告提示人工复查。

## 3. 目标

1. 质检只检查用户指定的当前章节。
2. 修订只生成并保存用户指定的当前章节。
3. 修订后复检只检查修订后的当前章节。
4. Story State 模型只对当前章节调用一次。
5. 不修改后续章节正文、版本、计划字段或 raw payload。
6. 不为后续章节创建自动修复、质检或同步任务。
7. 残缺候选不得覆盖当前正文。
8. 修订任务可取消、可重试、可在服务重启后从持久检查点继续。
9. 浏览器刷新、切换章节或断线不影响后台任务。
10. 已经受损的历史正文通过只读审计和显式版本恢复处理，不在迁移中自动改写。

## 4. 非目标

- 不自动修订、质检或重写任何后续章节。
- 不建设全书 Story State 逐章快照和任意历史点重放系统。
- 不自动解决较早章节修改造成的下游连续性变化。
- 不改变通用正文生成链路的入库策略。
- 不把后置 LLM 质检分数变成正文自动回滚条件。
- 不在本次修复中重构所有小说后台 worker。
- 不修改用户当前未提交的 `workspace/assets.json`、`workspace/zhuque-inputs/` 或 `workspace/zhuque-reports/`。

## 5. 目标架构

原来的长阻塞路由改为持久、可恢复的单章任务：

```text
POST 创建 editor_revision run
  -> 立即返回 202 + run_id
  -> 单章 worker 获取租约
  -> 生成候选
  -> 确定性候选准入
  -> 原子保存旧版本与当前章新正文
  -> 当前章质量复检
  -> 当前章 Story State 更新
  -> 记录项目级下游连续性警告
  -> 完成
```

前端根据 `run_id` 轮询任务状态。每个阶段完成后写持久检查点；重启后从最后确认的阶段继续。

## 6. 单章边界

### 6.1 质检

`createProseQualityReview` 只接收并检查目标 `chapter_id`。构建上下文时可以读取其他章节作为只读连续性材料，但不得为其他章节创建 review、run 或模型调用。

### 6.2 修订

worker 在创建时固定 `project_id`、`chapter_id`、`chapter_no`、源正文哈希和源版本标识。修订结果只能写入该 `chapter_id`。

### 6.3 Story State

删除编辑器链路对 `syncStoryStateFromChapter` 的依赖，提供精确单章 helper。以下入口都必须调用同一个单章 helper：

- 修订后的自动 Story State 更新；
- `/api/novel/chapters/:chapterId/story-state-sync` 手动同步；
- 工作台交稿风险复检中的当前章状态同步。

helper 不接收 `startChapterNo`，只接收明确的 `chapterId`，内部不得查询并循环后续章节。

### 6.4 计划对齐

修订后只允许重建当前章节自身的计划派生字段。移除 `followLimit: 3` 后续章节更新，不向后续章节写任何 plan alignment patch。

### 6.5 下游连续性警告

当目标章之后存在已写章节时，创建一条项目级 `downstream_continuity_warning` review，内容包括：

- 被修订章节及新旧正文哈希；
- 后续已写章节范围；
- “后续连续性可能需要人工复查”的明确状态；
- `source_run_id`。

该警告由确定性代码生成，不调用模型，不创建后续章节任务，也不修改后续章节。

## 7. 候选准入

候选只有通过全部确定性检查后才能写入章节。

### 7.1 固定源版本

任务创建时记录：

- `source_chapter_updated_at`；
- `source_text_hash`；
- `source_char_count`；
- 源正文；
- 源 review、修订模式、用户指令和模型配置。

候选入库前重新读取章节。当前哈希与 `source_text_hash` 不一致时，以 `SOURCE_VERSION_CHANGED` 失败，禁止覆盖用户或其他任务的新修改。

### 7.2 Transport 完整性

以下任一情况直接拒绝：

- Provider 返回 error、timeout、abort；
- finish reason 为 `max_tokens`、`length` 或等价截断状态；
- 存在非空 `incomplete_details`；
- tool-only、reasoning-only 或没有可用正文；
- JSON 不是完整解析，而是由 partial JSON recovery 恢复；
- 响应仍包含未闭合 JSON、Markdown 代码块或聊天解释壳。

应复用现有 `assertCompleteProseTransportResult` 一类的统一传输检查，而不是只在路由里判断非空。

### 7.3 全文和补丁检查

无论模型返回完整 `chapter_text`、opening rewrite 还是 surgical patch，最终都先在内存中得到完整候选章节，再统一检查。

候选字符数必须满足：

```text
minimum = max(800, ceil(source_char_count * 0.70))
maximum = floor(source_char_count * 1.30)
minimum <= candidate_char_count <= maximum
```

`source_char_count` 和 `candidate_char_count` 必须统一使用现有 `countProseChars` 口径，不能一处使用 UTF-16 `.length`、另一处使用去空白正文字符数。

这是编辑器“基于已有完整章节修订”的专用保护，不改变通用正文生成链路对字数偏差的软化策略。

此外：

- 去除尾部空白以及 `”’」』）》】` 等闭合符号后，最后一个正文字符必须是 `。！？!?….` 之一；
- 结尾检查是纯确定性规则，不调用 LLM 猜测语义完整性；以普通汉字、字母、数字、代码围栏或结构化字段残片结束都拒绝；
- 补丁的所有 find/anchor 必须基于固定源版本唯一定位；
- 任一补丁未应用时，整个候选拒绝，不允许部分补丁静默入库；
- 应用补丁后的完整结果再次执行 transport、长度和结尾检查。

### 7.4 失败语义

准入失败时：

- `chapters` 不变；
- `chapter_versions` 不新增；
- Story State、角色卡、设定和后续章节不变；
- 不执行后置质检或状态同步；
- run 记录失败代码、候选全文、候选哈希、源/候选字数、finish reason 和诊断摘要。

失败候选只属于任务诊断证据，不得进入章节、版本、连续性字段、Story State 或 Memory。

### 7.5 后置质检语义

候选通过确定性准入并入库后，才执行当前章 LLM 质检。

- 质检判定仍需修订：保留新版本，任务完成并带 warning；
- 质检调用失败：标记后处理失败，可从 `post_quality` 阶段继续；
- 不自动再次修订；
- 不因 LLM 主观评分自动回滚。

## 8. 持久任务模型

### 8.1 runs 表增量字段

复用现有 `runs` 表，`run_type = editor_revision`。增加：

- `scope_key TEXT`，值为 `chapter:<chapter_id>`；
- `updated_at TEXT`；
- `lease_owner TEXT`；
- `lease_expires_at TEXT`；
- `cancel_requested_at TEXT`。

建立部分唯一索引：同一 `project_id + run_type + scope_key` 在 `queued`、`running`、`cancel_requested` 状态下最多一条记录。不同章节可以独立运行。

`input_ref` 保存不可变输入快照。`output_ref` 保存阶段检查点、候选、诊断、警告、重试次数和最终结果。普通列表和轮询接口不返回候选全文。

现有 `auto_quality_check` 和 `auto_story_state` 参数保持兼容：缺省或 `true` 时执行对应的当前章阶段；显式 `false` 时不调用模型，并把该阶段持久标记为 `skipped`。无论参数取值，都不得扩展到其他章节。

### 8.2 状态

活动状态：

- `queued`；
- `running`；
- `cancel_requested`。

终态：

- `completed`；
- `failed`；
- `canceled`。

失败和取消任务可以通过专用 retry/continue API 重新进入 `queued`，但沿用原 `run_id` 和已有检查点。

### 8.3 阶段

阶段顺序固定为：

1. `generate_candidate`；
2. `admit_candidate`；
3. `persist_chapter`；
4. `post_quality`；
5. `sync_current_story_state`；
6. `record_continuity_warning`；
7. `completed`。

每个阶段记录 `started_at`、`completed_at`、attempt、结果摘要和错误。阶段只能前进，不能把已提交阶段退回 pending。

## 9. Worker、恢复与幂等

### 9.1 租约和启动恢复

worker 以短租约领取任务并定期续租。服务启动时扫描：

- `queued` 任务；
- 状态为 `running` 但租约已经过期的任务。

过期任务重新入队并从检查点继续。`canceled` 和没有可靠检查点的历史任务不自动恢复。

### 9.2 候选检查点

候选通过准入后，将完整候选和 `candidate_hash` 写入 run 检查点。重启发生在正文入库前时，worker 直接复用候选，不再次调用修订模型。

候选准入失败不会自动生成第二个候选。它进入 failed，等待用户显式重试。

### 9.3 正文提交检查点

正文提交使用现有 `updateNovelChapter` 的单事务能力，在同一事务内：

1. 保存源章节版本快照，source 为 `repair`；
2. 写入当前章新正文；
3. 在当前章 `raw_payload` 写入 `editor_revision_commit`：
   - `run_id`；
   - `source_hash`；
   - `candidate_hash`；
   - `committed_at`。

run 检查点随后更新。若进程在章节事务提交后、run 更新前退出，恢复逻辑通过当前章 commit marker 和正文哈希识别已经入库，跳过生成和写入，直接进入后处理。

若 marker 已被更新的章节修订覆盖，旧任务不得重新应用；它以 `REVISION_RUN_SUPERSEDED` 终止。

### 9.4 质检与 Story State 幂等

质检 review 和 Story State 同步都携带：

- `source_run_id`；
- `candidate_hash`；
- `chapter_id`。

恢复时先查找匹配回执；已经完成的操作直接复用。精确单章 Story State helper 必须接受幂等键，避免同一 run 的增量重复合并。

Story State 的项目更新和该幂等回执应在同一持久边界提交。其他派生物化步骤必须可重复执行或有独立回执，不能因恢复而再次调用 Story State 模型。

### 9.5 超时和重试

- 每次 LLM 调用最长 180 秒；
- 每个 LLM 阶段对瞬时网络错误最多自动重试一次，即总共最多两次尝试；
- 截断、候选准入失败和确定性冲突不自动重试；
- 所有调用必须接收 worker 的 `AbortSignal`。

### 9.6 取消

取消请求先持久化 `cancel_requested_at`，再 abort 当前内存 controller。

- 正文提交前取消：章节和版本不变；
- 正文提交后取消：不自动回滚，任务记录 `prose_persisted = true` 和剩余阶段；
- 用户点击“继续后处理”时，从未完成阶段继续，不重新生成正文。

## 10. API

### 10.1 创建

保留现有入口：

```http
POST /api/novel/reviews/:reviewId/apply-revision
```

它只验证请求、固定源版本并创建 run，不执行长任务。run 提交后立即通知本地 worker 调度器；即使通知丢失，启动/队列扫描也会领取 queued run。成功立即返回：

```json
{
  "ok": true,
  "run_id": 123,
  "status": "queued",
  "chapter_id": 7,
  "status_url": "/api/novel/editor-revisions/123?project_id=1"
}
```

HTTP 状态为 `202 Accepted`。同章已有活动任务时返回 `409 REVISION_ALREADY_ACTIVE`，并携带现有 `run_id` 和 `status_url`。

### 10.2 查询

```http
GET /api/novel/editor-revisions/:runId?project_id=:projectId
```

返回：

- run status、当前 phase 和阶段列表；
- chapter id/no/title；
- 是否已经保存正文；
- 质检结果和 Story State 状态；
- warning、错误代码和可执行动作；
- `can_cancel`、`can_retry`、`can_continue`。

轮询响应不返回候选全文。失败候选在 60,000 字持久化诊断上限内完整保留并只在任务诊断详情按需读取；超过上限的响应本身必然不可能通过本设计的修订长度门禁，只保留哈希、字数、头尾预览和 Provider 结果引用。

### 10.3 取消和继续

```http
POST /api/novel/editor-revisions/:runId/cancel
POST /api/novel/editor-revisions/:runId/retry
```

retry 沿用原 run，根据检查点决定重新生成、复用候选或只继续后处理。

### 10.4 项目任务接口

`GET /api/novel/projects/:id/tasks` 纳入 `editor_revision`，返回“单章修订”类型、章节身份、phase、状态和动作。页面刷新后可以从该接口重新发现活动任务。

## 11. 前端交互

### 11.1 创建与轮询

用户确认修订后，前端收到 `202` 即关闭确认框并开始轮询，不再等待长 HTTP 请求。当前章节维护一个专用任务订阅；切换章节不会取消任务。

页面刷新后，项目任务数据重新关联活动的 editor revision run，并恢复轮询。

### 11.2 当前章状态条

当前章节编辑区显示紧凑阶段状态：

1. 生成候选；
2. 安全检查；
3. 保存版本；
4. 当前章质检；
5. 当前章状态更新；
6. 完成。

模型调用使用不确定进度指示，不显示虚假百分比。同章修订按钮在活动任务期间禁用，并提供取消按钮。

### 11.3 任务中心

任务中心增加“单章修订”任务卡，显示章节号、标题、当前阶段、耗时、警告和错误。按状态提供：

- 取消；
- 重试；
- 继续后处理；
- 打开当前章节；
- 查看诊断。

### 11.4 结果提示

- 准入失败：`修订未入库，当前正文保持不变`；
- 修订成功且质检通过：`当前章修订和复检完成`；
- 修订成功但质检仍需处理：`新版本已保存，当前章仍需人工复查`；
- 正文已保存但后处理失败或取消：`正文已保存，后处理未完成`；
- 较早章节被修改：显示项目级下游连续性 warning，不显示为自动修复队列。

成功后只更新当前章节、当前章 reviews 和项目 Story State 数据。重新读取项目数据属于只读刷新，不得触发任何后续模型调用。

## 12. 数据迁移

### 12.1 Schema

使用现有 `addColumnIfMissing` 增量增加 runs 字段，并创建部分唯一索引。已有 run 的 `scope_key` 保持 NULL，不参与唯一约束；已有 `updated_at` 用 `created_at` 回填。

迁移不修改 chapters、chapter_versions、reviews、Story State 或工作区资产。

### 12.2 历史任务

旧同步路由通常只在完成或失败时追加 editor revision run，没有可恢复的中间检查点。若发现旧的 `running editor_revision` 且缺少 scope/checkpoint，标记为：

```text
failed / LEGACY_REVISION_RUN_NOT_RESUMABLE
```

不得猜测其阶段或重新调用模型。

## 13. 已受损章节恢复

实现完成后执行只读恢复审计：

1. 找出当前正文字符数不足最近修订前版本 70% 的章节；
2. 结合 editor revision review、run、版本 source 和时间确认是否属于残稿覆盖；
3. 输出当前正文与建议历史版本的哈希、字数和 diff 摘要；
4. 不自动修改正文。

对已确认受损的第一章，使用现有版本历史的“整章采纳历史版本”恢复。恢复前显示具体版本和差异，并由用户明确确认。现有 rollback 会先保存当前残稿快照，因此恢复仍可撤销。

该恢复只修改确认的当前章，不改后续章节。恢复后只记录项目级连续性提示，不自动运行下游同步。

## 14. 测试策略

### 14.1 候选准入单元测试

- 5910 字源正文对应 243 字、以“在”结尾的候选被拒绝；
- `max_tokens`、`length`、partial JSON、incomplete details、tool-only 和 reasoning-only 被拒绝；
- 聊天壳、代码块、未闭合结尾被拒绝；
- 70%/130% 边界值通过，边界外失败；
- opening rewrite 和 patch 先合成完整章节再检查；
- 任一 anchor 缺失导致整个候选失败；
- source hash 变化返回 `SOURCE_VERSION_CHANGED`；
- 失败候选只写 run 诊断，章节、版本和 Story State 零写入。

### 14.2 Worker 状态与恢复测试

- 合法状态只能按固定阶段前进；
- 候选已检查点后重启，不重新调用修订模型；
- 正文提交后、run checkpoint 前崩溃，恢复后不重新写正文或版本；
- post-quality 和 Story State 回执按 run/hash 去重；
- 入库前取消零写入；
- 入库后取消保留正文，继续时只补后处理；
- 单次调用 180 秒超时；
- 瞬时错误总尝试次数最多两次；
- AbortSignal 传递到 Provider runtime。

### 14.3 单章范围集成测试

构造 30 个已有正文的章节，从第一章执行修订：

- revision 模型只调用一次；
- post-quality 模型只检查第一章一次；
- Story State 模型只对第一章调用一次；
- 第 2-30 章模型调用为 0；
- 第 2-30 章正文、版本、计划字段、raw payload 和 reviews 均不变；
- 只产生一条项目级下游连续性 warning；
- 不产生任何后续章节任务。

手动 `/story-state-sync` 也必须用相同 30 章样本验证只同步目标章。

### 14.4 并发与数据库测试

- 同项目同章节并发创建，只有一个活动任务；
- 同项目不同章节可以分别创建；
- 租约未过期时第二个 worker 不能领取；
- 租约过期后可以从检查点恢复；
- legacy NULL scope 不影响迁移；
- schema migration 重复执行保持幂等。

### 14.5 API 和前端测试

- POST 在模型完成前返回 `202`；
- 活动冲突返回 `409` 和现有 run；
- 查询接口不返回候选全文；
- 取消、重试和继续动作与状态一致；
- 页面刷新、项目切换和章节切换后正确恢复任务；
- 当前章状态条、任务中心卡片和结果提示正确；
- 同章按钮禁用，不影响其他章节；
- 完成后只替换当前章前端状态。

关键行为必须使用纯函数、仓库和路由集成测试验证。现有源码字符串测试可以保留为表面契约，但不能作为候选安全或单章范围的唯一证据；这正是 Fable 5 审查未覆盖本次回归的原因之一。

### 14.6 验证命令

实施阶段至少运行：

```bash
cd ui/server && bun test <editor-revision、novel repos、worker 定向测试>
cd ui/web && bun test <workspace repair、task center、polling 定向测试>
bun run build:server
bun run build:web
```

再运行相关小说服务回归套件。仓库已有的基线失败必须与本次新增失败区分记录，不能通过放宽断言掩盖。

## 15. 模块边界

计划形成以下职责边界：

- `revision candidate admission`
  - 纯函数；负责 transport、长度、结尾、补丁完整性和源版本判断。
- `editor revision worker`
  - 只负责任务阶段编排、租约、取消、检查点和恢复。
- `single chapter story-state sync`
  - 只接收明确 chapter id；负责单章上下文、模型调用和幂等回执。
- `revision run repository`
  - 负责任务创建、活动唯一约束、租约领取和状态更新。
- `editor revision status API`
  - 只返回可公开任务视图，不暴露候选正文。
- `editor revision task UI`
  - 负责创建后的轮询、章节内状态和任务中心动作。

现有 `register-revision.ts` 不再承载整个修订业务编排。`builders.ts` 中的跨章 `syncStoryStateFromChapter` 从编辑器链路移除；如果没有其他合法调用方，应删除而不是保留成可误用 API。

## 16. 风险与处理

### 16.1 Story State 全局状态限制

精确单章同步仍运行在现有全局 Story State 架构上，不能重建任意历史章节时点。当前修复通过停止下游重放、幂等运行和项目 warning 限制影响，但不声称解决了逐章状态快照问题。

### 16.2 取消发生在提交边界

取消不能同时保证“立刻停止”和“自动回滚已提交事务”。设计选择保留已原子提交的新版本，并明确显示后处理未完成；用户仍可通过版本历史显式回滚。

### 16.3 失败候选存储体积

run 只保留本次候选和紧凑诊断，不保存完整 prompt、上下文包或消息历史。失败候选超过 60,000 字持久化诊断上限时保存哈希、字数、头尾预览和已有 Provider 原始结果引用，不能把截断后的诊断重新当作可恢复候选。通过 130% 长度门禁的正常章节候选应完整保留，若因存储限制无法完整检查点则不得进入 `persist_chapter`。

### 16.4 多进程领取

数据库唯一索引和租约是最终约束，内存 Map 只用于 AbortController。不得依赖单进程内存状态保证同章唯一。

## 17. 完成定义

只有以下条件全部满足，修复才算完成：

1. 修订创建接口立即返回 `202 + run_id`，长模型调用脱离请求生命周期。
2. 5910 -> 243 的真实失败形态被确定性准入拒绝，当前正文零变化。
3. 第一章修订在 30 章项目中只触发当前章 revision、quality 和 Story State 调用。
4. 后续章节没有正文、版本、计划、raw payload、review 或任务变更。
5. 任务可取消、可重试，并能从候选已保存和正文已提交两个崩溃窗口恢复。
6. 正文已提交时，重启绝不重新生成或覆盖正文。
7. 较早章节修改只生成项目级 warning，不产生自动下游任务。
8. 数据迁移幂等且不修改历史正文。
9. 受损第一章的恢复版本通过只读审计确定，并在用户确认后显式恢复。
10. 服务端、前端定向测试和生产构建通过；相关回归没有新增失败。
