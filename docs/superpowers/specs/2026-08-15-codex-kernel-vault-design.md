# Codex 内核 + 资产账本（可扩展接口）

日期：2026-08-15（v1.6 修订 2026-08-20）  
状态：待用户审阅（v1.6，2026-08-20：续写运行时已落地）  
前置：

- `2026-08-14-oh-story-core-skill-shell-design.md`（方案 B：oh-story 出能力，工作台出账本；当时用 solo 一次补全，本 spec 废止该运行时）
- `2026-08-14-oh-story-apply-from-review-design.md`
- `2026-08-14-oh-story-apply-surgical-design.md`
- `2026-08-14-oh-story-deslop-file-mode-design.md`
- `2026-08-14-writing-skill-marketplace-design.md`
- `2026-08-09-canvas-prompt-skill-pack-design.md`（画布仍是提示词编译器，本 spec 定义它以后如何升级为内核合同，本期不改画布运行时）
- `2026-08-16-novel-workbench-verb-contracts-design.md`（工作台动词层；开书 `open_book`、并跑主键改为 verb、投影/门补丁。v1.2 把其中已落地的内核语义收回本文件）
- 分期计划：`2026-08-15-codex-kernel-app-server-client.md`、`2026-08-15-codex-kernel-jobs-and-bridge.md`、`2026-08-15-codex-kernel-compete.md`（头部「本分期新增决定」表已折入本文；后续代码覆盖计划处，以本文为准）

### v1.6 修订要点（2026-08-20，纸面对齐 C 续写运行时）

v1.5 写「续写 / 适配仍未做」。下列以 `ui/server/src/kernel/` 在 `1524dbdd` 的现状为准。

1. **`write_continue` 已落地。** 内置 `oh-story-core.story-long-write.continue`（`capability=rewrite`，`subject_type=project`，`commit.mode=auto_if_single`）。`IMPLEMENTED_VERBS` 含 `write_continue`。作者入口工作台「更多 · 续写」走 `POST /api/kernel/jobs`。
2. **预检 / 收获 / commit：** `VERB_PARAMS_INVALID`；窗口缺行 `CHAPTER_NOT_FOUND`；窗口已有正文 `CHAPTER_HAS_PROSE`；无匹配细纲 `OUTLINE_MISSING`。收获后必须刚好 `count` 份窗口内非空 `chapter_text`。commit 按路径解析章号，禁止 `job.subject_id` 当 chapter id。超时仍默认 idle 10min / hard 45min。
3. **不要**把 `oh-story-core.story-long-write.outline` 标成可执行（仍 `implemented=false`）。无扩纲工作台按钮、无 batch cutover。
4. **适配仍未做。** `adapt_pack` 仍未落地。`generateChapterForGroup` / batch 仍走旧 API，未 cutover。画布 `prompt` 仍否（B）。

### v1.5 修订要点（2026-08-19，纸面对齐 C 回炉运行时）

v1.4 写「续写 / 回炉 / 适配仍未做」。下列以 `ui/server/src/kernel/` 在 `b6d689a8` 的现状为准。

1. **`rewrite_chapter` 已落地。** 内置 `oh-story-core.story-long-write.rewrite`（`chapters.rewrite`，`commit.mode=manual`）。`IMPLEMENTED_VERBS` 含 `rewrite_chapter`。作者入口有正文走 `POST /api/kernel/jobs`（写作区「回炉」）。
2. **预检 / 门：** 无章行 → 400 `CHAPTER_NOT_FOUND`。空 / 空白 / `【占位正文】` → 400 `CHAPTER_NO_PROSE`。**不**验细纲。模板门含 `reject_outline_artifact`。唯一候选 succeeded 后因 `manual` 进入 `awaiting_selection`；写作区预览采纳。超时仍默认 idle 10min / hard 45min。
3. **不要**把 `oh-story-core.story-long-write.outline` 标成可执行（仍 `implemented=false`）。
4. **续写 / 适配仍未做。** `write_continue` / `adapt_pack` 仍 `CONTRACT_NOT_IMPLEMENTED`。`generateChapterForGroup` / batch 仍走旧 API，未 cutover。画布 `prompt` 仍否（B）。（**已被 v1.6 覆盖：`write_continue` 已落地**；适配与 `generateChapterForGroup` cutover 仍未做。画布 `prompt` 仍否（B）。）

### v1.4 修订要点（2026-08-19，纸面对齐 C 写章运行时）

v1.3 写「写章仍未做」。下列以 `ui/server/src/kernel/` 在 `3b0a76c5` 的现状为准。

1. **`write_chapter` 已落地。** 内置 `oh-story-core.story-long-write.chapter`（`chapters.rewrite`，`commit.mode=auto_if_single`）。`IMPLEMENTED_VERBS` 含 `write_chapter`。作者入口「确认计划，进入初稿」/「写草稿」走 `POST /api/kernel/jobs`。
2. **预检 / 门：** 无章行 → 400 `CHAPTER_NOT_FOUND`。已有正文（trim 非空且不含 `【占位正文】`）→ 400 `CHAPTER_HAS_PROSE`。无匹配细纲 → 400 `OUTLINE_MISSING`。细纲匹配：章行 `outline_id`、`raw_payload.chapter_no`、`parseChapterNoFromRelPath(kernel_rel_path)`（只传路径）。模板门含 `reject_outline_artifact`。超时仍默认 idle 10min / hard 45min。
3. **不要**把 `oh-story-core.story-long-write.outline` 标成可执行（仍 `implemented=false`）。
4. **续写 / 回炉 / 适配仍未做。** `write_continue` / `rewrite_chapter` / `adapt_pack` 仍 `CONTRACT_NOT_IMPLEMENTED`。`generateChapterForGroup` / batch 仍走旧 API，未 cutover。画布 `prompt` 仍否（B）。（**已被 v1.5 覆盖：`rewrite_chapter` 已落地**；**已被 v1.6 覆盖：`write_continue` 已落地**；适配与 `generateChapterForGroup` cutover 仍未做。画布 `prompt` 仍否（B）。）

### v1.3 修订要点（2026-08-18，纸面对齐 C 扩纲运行时）

v1.2 写「扩纲计划已写、代码未做」。下列以 `ui/server/src/kernel/` 在 `7cdf4099` 的现状为准。

1. **`expand_outline` 已落地。** 内置 `oh-story-core.story-long-write.expand`（`outlines.upsert`，`commit.mode=manual`）。`IMPLEMENTED_VERBS` 含 `expand_outline`。无工作台按钮；入口仍是 `POST /api/kernel/jobs`。
2. **预检 / 门 / 投影：** 无大纲 → 400 `FOUNDATION_PRECONDITION`。`reject_chapter_text_artifact` 禁 `正文/`。commit **不**写 `chapters`（空章行只属于 `open_book` 采纳）。project 主体按 `kernel_rel_path` 回放大纲文件；不再合成无 rel_path 的 `大纲/总纲.md` / `大纲/细纲.md`。
3. **不要**把 `oh-story-core.story-long-write.outline` 标成可执行（仍 `implemented=false`）。
4. **写章仍未做。** `write_chapter` / `write_continue` / `rewrite_chapter` / `adapt_pack` 仍 `CONTRACT_NOT_IMPLEMENTED`。替换 `generateChapterForGroup` 必须另开 spec。画布 `prompt` 仍否（B）。（**已被 v1.4 覆盖：`write_chapter` 已落地**；**已被 v1.5 覆盖：`rewrite_chapter` 已落地**；**已被 v1.6 覆盖：`write_continue` 已落地**；适配与 `generateChapterForGroup` cutover 仍未做。画布 `prompt` 仍否（B）。）

### v1.2 修订要点（2026-08-18，纸面对齐已落地代码）

分期 3/4/5 计划写「实现后折入 spec v1.2」。下列以 `ui/server/src/kernel/` 现状为准；计划表里被代码覆盖的条目（超时、sandbox 大小写、`--ignore-user-config`、并跑主键）不再保留为规范。

1. **并跑主键是 verb，不是 capability。** `contract_ids` 1..8 必须同一动词，否则 400 `VERB_MIXED`。废止 v1.1「按 capability 并跑」与 `CAPABILITY_MIXED`。
2. **并行度：** 候选全量并行（≤8，无节流）；每候选独立 `project/`、`codex-home/`、Codex 进程。`Promise.allSettled` 收敛。
3. **取消关全部会话：** `POST .../cancel` 关闭该 job 所有活跃 app-server；queued/running 候选一律 `failed(CANCELLED)`，job `cancelled`，再清目录。
4. **孤儿恢复：** 服务启动 `recoverOrphanKernelJobs`：账本 `queued`/`running` 且不在进程内 live map 的 job → `failed(ENGINE_FAILED, 进程重启导致任务中断)`，未终态候选同码。
5. **终态目录清理：** 候选收敛后（含 `awaiting_selection`）以及 cancel / 孤儿路径，删除各候选的 `project/` 与 `codex-home/`；保留 `events.jsonl`、`snapshot/`、`artifacts/`。vault 已在收敛前入库。
6. **0.147 spawn 证据：** 除 `thread/started` 的 `parentThreadId` 外，还记录 `item/*` 且 `item.type=collabAgentToolCall`、`item.tool=spawnAgent` 的 `senderThreadId` / `receiverThreadIds`。full 审稿合同带 `require_spawn_evidence`：零 spawn → `NO_SPAWN` gated。
7. **xhigh：** 隔离 `config.toml` 写根级 `model_reasoning_effort`（取模型 `context_ui_params.reasoning_effort` / `model_reasoning_effort`）。xhigh 静默推理可数分钟无通知，因此 **废止** 分期 3 的 idle 120s / hard 30min。
8. **turn 超时（现行）：** 默认 idle 10min / hard 45min；`open_book` idle 15min / hard 60min。探针 ④ spawn：xhigh 时 idle 300s / hard 720s，否则 60s / 120s。
9. **改稿「原句出现」门禁：** `paragraph_retention_70` = 原文按空行切段后，每段须作为**连续子串**出现在新正文（`includes`，不是语义相似）。原文 ≥8 段且 verbatim 保留 <70% → `OH_STORY_APPLY_REWROTE_TOO_MUCH`。
10. **0.147 argv / sandbox：** `codex app-server` 拒绝 `--ignore-user-config`（该旗标仅 `exec`）；隔离只靠 job `CODEX_HOME`。`thread/start` 的 sandbox 发 **kebab-case**（`workspace-write`），不是驼峰。
11. **磁盘：** 候选根为 `jobs/{job_id}/candidates/{candidate_id}/`；vault 为 `vault/{artifact_id}/{basename}`。
12. **提交：** 审稿/改稿走既有 novel API（`BEGIN` 之前，避免 SQLite 死锁）；开书 upsert + `kernel_commits` + 状态在同一 `BEGIN IMMEDIATE`。自动 commit 失败 → job 留在 `awaiting_selection`。
13. **HTTP：** 新 UI 必须 `POST /jobs` 202 后轮询。旧 oh-story 三按钮路由已 410 `ROUTE_REMOVED`（D 补丁）。
14. **开书已落地：** `subject_type=project`、`outline` 的 `open_book` 实例可执行。扩纲当时计划已写、代码未做（**已被 v1.3 覆盖：扩纲已落地**）；画布 `prompt` 仍否（B，须另开 brainstorm）。

### v1.1 修订要点（按 2026-08-15 核对分析）

1. 供应商翻译改「按锁定版本能力」：上游主线已把 `wire_api` 收缩为 `responses` 唯一值，`openai_compatible` 供应商能否走内核取决于锁定发行版；新增运行时探针，先验证再放行（7.5、磁盘与库·探针）。
2. custom agent 注册纠正：`.codex/agents/*.toml` 只是 oh-story 的存在性检查面，真正注册是隔离 `CODEX_HOME/config.toml` 的 `[agents.<name>]`（6.1、7.5）。
3. skill 调用改显式注入：`turn/start` 附 `{type:"skill", name, path}`，启动前 `skills/list` 预检，新增 `SKILL_NOT_FOUND`（7.2）。
4. 错误码回归现网命名：`OH_STORY_APPLY_STALE_REVIEW` / `OH_STORY_APPLY_NO_REVIEW`（废除草稿中的 `REVIEW_HASH_MISMATCH`）；错误码表拆「同步 / 终态」两类并补 `CHAPTER_FILE_MISSING`（第 9 节、10.5）。
5. 收存补语义：范围内未匹配 glob 的变更收为 `attachment`；新增合同 `ignore` 字段；glob / `write_scope` 支持 7.3 变量；`rewrite` 类章文件未变化视为产物缺失（合同 JSON、6.2、第一批合同）。
6. app-server 方法白名单补全：`initialized` 通知、`turn/interrupt`、`skills/list`（7.2、风险）。
7. agents bundle 落地路径：安装管线补抓上游归档（现只拷 `skills/`）；`.story-deployed` 写入与 bundle 一致的 `agents_version`；deslop 多轮质量闭环随 skill 脚本进沙箱，`payload.rounds / script_logs / file_mode` 不再产生（6.1、第一批合同）。

## 目标

把 MangaForge 从「自己用 API 实现全部创作能力」改成：

- **Codex 出能力**：skill、agent、MCP、工具环、作者更新，全部在锁定的官方 Codex 里跑。
- **MangaForge 出账本**：决定跑哪些 skill、把产物按协议入库、多个同类结果里选一份留下、章节/画布/供应商仍由工作台管理。

本 spec 定义的是一套**可扩展的内核接口**，不是「小说审稿」这一次功能。审稿、去 AI、改稿只是第一批合同。skill 增加能力时，用合同和收存适配器对接，不改 Codex，也不再为每个新能力重写 agent 环。

## 已确认决策

1. **指定 UI 是 MangaForge 工作台**，不是 Codex TUI / 桌面端 / 对话卡片。MangaForge 作为 `codex app-server` 的客户，角色与官方 VS Code 扩展同级。
2. **不改 Codex 源码**。上游锁定 [openai/codex](https://github.com/openai/codex) 发行版。`wowugeng-max/codex` 只是官方镜像，不作上游。仅当「Codex 源码：默认不动」一节的六条补丁条件成立时，才允许从锁定 release 打最小补丁。
3. **能力在合同里声明，不在 runner 里写死。** 新 skill、旧产物类型 = 只加合同文件。新产物类型 = 加一个收存适配器 + 账本绑定，不改 app-server 客户主环。
4. **领域表继续当产品真相。** `chapters` / `chapter_versions` / `reviews` / `outlines` / 画布节点仍是用户看到的资产。内核表只记账本：跑过什么、候选是什么、哪一份被采纳。
5. **同一动词可以并跑、选优。** 一个任务可挂 1..8 个合同，必须同一 `verb`（不是同一 `capability`）。默认等人选；恰 1 个 `succeeded` 且该合同 `commit.mode=auto_if_single` 时自动入库。多候选时即使全部 `auto_if_single`，`succeeded>1` 也必须等选。
6. **完整审稿不得静默 solo。** 缺少四个 reviewer toml：候选 `failed`，任务失败。报告出现 `Fallback:` 且含 `solo`：候选 `gated`，唯一候选则任务失败。两种都不写入「完整审稿成功」，HTTP 分别为 `REVIEWERS_MISSING` / `SOLO_FALLBACK`。
7. **朱雀 / 指纹 / 冲突合同只做参考分。** 不回退、不拦内核入库、不触发自动修订。字数目标 4200 只警告。
8. **不重开理论 `must_fix`。** 不把 oh-story 设计课再编进正文提示。
9. **大纲进度不齐只出报告。** 标 S2，写清先改大纲还是先改后文。第一期不自动回写大纲、不改后文章。
10. **按建议改稿继续用「原句出现」70% 门和正文哈希匹配。** 原文按空行切段，每段须作为连续子串出现在新正文；≥8 段且 verbatim 保留 <70% → 409，不写章节。不是语义相似、不是模糊匹配。
11. **画布第一期不切内核。** 接口为画布留合同位，运行时仍走现有提示词编译器，直到另开实现计划。
12. **现有 oh-story solo runner 在内核第一批合同验收后停用。** 三个按钮改走内核任务，不再 `executeNovelAgent` + 写死 solo。

## 问题与原则

市面上两条路的短板：

| 路 | 做法 | 短板 |
|---|---|---|
| 住在 Codex / Claude 客户端 | 功能全是 skill | 结果散，没有版本、竞选、导出账本 |
| 自建应用调 API | 自己定义每一步请求和返回 | 能力涨一寸就要自己开发一寸；吃不到 skill 更新 |

本产品走第三条：**Codex 出能力，工作台出账本和选择权。**

因此：

- 开发负担从「发明 agent」转到「发明资产怎么收、怎么比」。
- 享受 skill 作者更新的前提是：收存认约定产物路径和类型，不认某次提示词措辞。
- 不是每个 GitHub skill 都能当内核用。只接「能在 Codex 里完整跑、产物路径清楚」的。只输出一段聊天正文、不写文件的，继续当提示词编译器，不得登记为内核合同。

## 分层

```text
工作台 UI（小说 / 画布 / 供应商 / 任务）
        │  HTTP：创建任务、看进度、选候选、提交入库
        ▼
内核网关（MangaForge）
  合同注册表 · 任务编排 · 投影 · 供应商翻译 · 收存 · 竞选
        │  JSON-RPC（stdio）
        ▼
codex app-server     ← 官方内核，不改源码
        │
        ▼
投影目录里的 skill / agent / MCP / 文件
        │  diff + 约定路径
        ▼
资产账本
  内核表（任务 / 候选 / 产物）
  领域表（章节 / 版本 / 审稿 / 大纲 / 画布）
```

| 层 | 谁做 | 改不改领域资产 |
|---|---|---|
| Codex | 跑 skill、spawn、MCP、改投影目录里的文件 | 不直接碰 SQLite |
| 内核网关 | 投影、启动、收文件、跑门、竞选 | 只在 commit 时写领域表 |
| 领域账本 | 章节、版本、审稿、大纲、画布 | 用户看到的真相 |
| 参考分 | 朱雀 / 指纹 / 冲突合同 | 否 |

## 核心概念

| 词 | 含义 |
|---|---|
| Pack | 已安装的 skill 套件，磁盘上有锁定 revision。例：`oh-story-core` |
| Skill | Pack 内一个 `SKILL.md` 目录。例：`story-review` |
| Capability | 产物类型。例：`review`、`rewrite`、`outline`。合同声明自己属于哪一个 |
| Contract | 一份可执行声明：调用哪个 skill、投影什么、收什么、哪几道门、怎么入库 |
| Job | 一次工作台动作。可含 1..N 个候选（并跑多个合同） |
| Candidate | 一个合同在一次 Job 里的一次 Codex 运行 |
| Artifact | 从投影目录收回的一个文件或结构化对象 |
| Binding | Artifact 提交后写到哪张领域表、哪一行 |
| Gate | 提交前的确定性检查。失败则该候选不能入库 |

## 能力类型（Capability）

第一期只实现表中「实现」列为是的类型。其余在规范里定死，实现计划另开。

| capability | 含义 | 默认可写领域 | 第一期实现 |
|---|---|---|---|
| `review` | 只出报告 | `reviews`，不改正文 | 是 |
| `rewrite` | 新正文 | `chapters` + `chapter_versions` | 是 |
| `outline` | 大纲 / 细纲 / 场景卡 | `outlines`（开书另写 world/characters） | 开书 `open_book` 是；扩纲 `expand_outline` 是（无工作台按钮）。写正文不走本 capability（作者写本章走 `rewrite` / `write_chapter`） |
| `tracking` | 伏笔 / 逐章记录 | 内核产物 + 可选文件副本；不改正文 | 是（随审稿收回，默认不单独按钮） |
| `prompt` | 画布提示词 | 画布节点运行结果 | 否 |
| `media` | 生图 / 视频 | 画布资产 | 否；且通常不是 Codex skill |
| `attachment` | 未归类文件 | 只进内核产物，不自动写领域表 | 是（兜底） |

增加能力的唯一途径见第 8 节。禁止在网关里为某个 skill 名写 `if (skill === 'story-review')` 特例（门和收存必须挂在合同字段上）。oh-story 三个按钮是合同 id，不是硬编码能力。

## 合同（扩展的主接口）

合同是 JSON，放在：

```text
{workspace}/.mangaforge/kernel/contracts/{contract_id}.json
```

`contract_id` 格式：`{pack_id}.{skill_name}.{variant}`，只允许 `[a-z0-9][a-z0-9.-]{2,127}`。  
例：`oh-story-core.story-review.full`。

内置第一批合同由仓库提供默认文件，安装 oh-story 套件时复制到 workspace；用户或后续 pack 可以追加，不能覆盖内置 id，除非 revision 升级流程替换整份内置清单。

### 合同 JSON

```json
{
  "schema_version": 1,
  "id": "oh-story-core.story-review.full",
  "pack_id": "oh-story-core",
  "skill_name": "story-review",
  "variant": "full",
  "capability": "review",
  "label": "oh-story 完整审稿",
  "invoke": {
    "mention": "$story-review",
    "prompt": "审查范围：{{scope_files}}\n模式：full\n上一章：{{previous_chapter_file}}\n若大纲与正文进度不齐：在报告标 S2，写清先改大纲还是先改后文。\n不要改本章正文。\n报告写到 {{report_path}}\n若 Fallback 到 solo：必须在报告第一行写明原因。"
  },
  "projection": {
    "mounts": ["current_chapter", "previous_chapter", "outline", "characters", "world", "tracking", "skill_tree", "agents"]
  },
  "outputs": [
    {
      "artifact_kind": "review_report",
      "glob": "审稿/第{{chapter_pad}}章.md",
      "fallback": "last_message",
      "binding": "reviews.oh_story_review",
      "required": true
    },
    {
      "artifact_kind": "tracking_doc",
      "glob": "追踪/**/*.md",
      "binding": "kernel_only",
      "required": false
    }
  ],
  "write_scope": ["审稿/", "追踪/"],
  "ignore": [".story-review/"],
  "gates": ["reject_solo_fallback", "require_reviewer_agents"],
  "commit": { "mode": "auto_if_single", "domain_writes": ["reviews"] },
  "sandbox": "workspace-write",
  "approval": "never"
}
```

字段规则：

- `schema_version` 现为 `1`。增字段必须可选并有默认；删字段或改语义必须升到 `2`，旧合同继续按 v1 读。
- `mention` 必须是 Codex 显式 skill 引用（`$name`），与 Pack 内 `SKILL.md` 的 `name` 一致；仅工作台合同（如 `story-apply`）允许为空。
- `prompt` 只允许第 7.3 节列出的变量。禁止把整章正文再嵌进 prompt。
- `outputs[].glob`、`write_scope`、`ignore` 同样只允许 7.3 变量，投影前渲染完再参与匹配。
- `projection.mounts` 取自第 6 节封闭集合。
- `outputs[].artifact_kind` 必须已注册（第 8 节）。未注册则合同校验失败，不能创建任务。
- `write_scope` 是投影目录相对路径前缀。范围内未匹配任何 `outputs[].glob` 的变更收为 `attachment`（binding=`kernel_only`）；范围外的新文件只记警告，不收、不入库。
- `ignore`：可选路径前缀，其内变更不收、不警告。oh-story 合同默认含 `.story-review/`（skill 的分批审查状态目录）。
- `gates` 取自第 9 节封闭集合。
- `commit.mode`：`manual` | `auto_if_single` | `never`。`never` 只留候选，工作台必须再点提交（用于实验合同）。

### 第一批内置合同

| contract_id | capability | 门 | 提交 |
|---|---|---|---|
| `oh-story-core.story-review.full` | `review` | `reject_solo_fallback`、`require_reviewer_agents` | `auto_if_single` → `reviews` |
| `oh-story-core.story-deslop.file` | `rewrite` | `require_chapter_file` | `auto_if_single` → 章节新版本，`source=oh_story_deslop` |
| `oh-story-core.story-apply.surgical` | `rewrite` | `require_matching_review`、`paragraph_retention_70`、`require_chapter_file` | `auto_if_single` → 章节新版本，`source=oh_story_apply` |

`story-apply` 不是 oh-story 原包 skill。它是工作台合同：`invoke.mention` 允许为空；投影必须写出 `改稿/指令.md`（只含可执行「修改建议」+ 禁止整章重写），prompt 只引用该路径和 `{{review_path}}`。能力仍由 Codex 工具环改当前章文件，不得退回 `executeNovelAgent`。

两个 `rewrite` 合同的产物细则：

- 共同：`write_scope=["正文/"]`；required 产物 `artifact_kind=chapter_text`，glob `正文/第{{chapter_pad}}章_*.md`，且必须相对快照有变化——文件未变视为 required 缺失（`OUTPUT_MISSING`），防止「跑完但什么都没改」入库。
- `story-deslop.file`：现网 runner 的「脚本预扫 → 多轮润色 → 归一化」闭环随 skill 自带 `scripts/` 进入沙箱，由 Codex 按 SKILL.md 自跑，网关不再复刻，也不再有 `OH_STORY_CORE_NOT_PROSE` 检查。代价明示：质量闭环从壳层代码移到 skill 约定；`reviews.oh_story_deslop.payload` 不再产生 `rounds` / `script_logs` / `file_mode`，UI 不得依赖这三个字段。
- `story-apply.surgical`：投影额外挂 `review_report`（`审稿/第{{chapter_pad}}章.md`）。

`story-long-write` 开书实例 `oh-story-core.story-long-write.open` 已作为 `open_book` 落地（`capability=outline`，`subject_type=project`，`commit.mode=manual`）。扩纲实例 `oh-story-core.story-long-write.expand` 已作为 `expand_outline` 落地（`outlines.upsert`，`commit.mode=manual`）。写章实例 `oh-story-core.story-long-write.chapter` 已作为 `write_chapter` 落地（`capability=rewrite`，`subject_type=chapter`，`commit.mode=auto_if_single`）。回炉实例 `oh-story-core.story-long-write.rewrite` 已作为 `rewrite_chapter` 落地（`capability=rewrite`，`subject_type=chapter`，`commit.mode=manual`）。续写实例 `oh-story-core.story-long-write.continue` 已作为 `write_continue` 落地（`capability=rewrite`，`subject_type=project`，`commit.mode=auto_if_single`）。画布 prompt 仍 `CONTRACT_NOT_IMPLEMENTED`。`.outline` 变体保持 `implemented=false`。

写作 skill 市场里「只编提示词」的包，第一期不自动升成内核合同。要升，必须补 `outputs` 路径和 `capability`，并通过合同校验。

## 磁盘与库

### 工作区磁盘

```text
{workspace}/.mangaforge/
  oh-story-core/                  # 已有套件，不动安装位置
  writing-skill-packs/            # 已有提示词市场
  skill-packs/                    # 已有画布 pack
  kernel/
    runtime.json                  # 锁定的 Codex 二进制/版本
    contracts/*.json
    jobs/{job_id}/
      candidates/{candidate_id}/  # 并跑时每候选独立根（单候选也走此布局）
        project/                  # 投影 cwd
        codex-home/               # 隔离 CODEX_HOME
        snapshot/                 # 运行前文件清单与哈希
        artifacts/                # 收回的文件副本
        last-message.md
        events.jsonl              # app-server / exec 事件
    vault/{artifact_id}/{basename}  # 耐久副本；账本 vault_path 存绝对路径
```

`runtime.json`：

```json
{
  "engine": "codex-app-server",
  "codex_version": "锁定的发行版号",
  "binary": "codex",
  "protocol": "app-server-stdio"
}
```

找不到二进制或版本不符，创建任务失败，错误码 `KERNEL_RUNTIME_UNAVAILABLE`。禁止静默改走 solo LLM。

**运行时探针**（`POST /api/kernel/runtime/probe`，结果缓存并随 `GET /api/kernel/contracts` 暴露）依次验证：

1. 二进制存在且版本与 `runtime.json` 一致；
2. app-server 握手（`initialize` + `initialized` 通知）；
3. `skills/list`（cwds=[样例投影]）能发现投影 skill；
4. `[agents.<name>]` spawn 探测：临时线程 spawn 一个空转角色，观察到 subagent thread 即通过（消耗一次极小 turn）；
5. 目标供应商线协议翻译：`codex_responses` 必须通过；`openai_compatible` 仅当锁定版本仍支持 `wire_api="chat"`。

请求体可带 `{ "model_id": number }`。缺省时 ④ 保持 `'pending'`（④ 消耗一次真实 turn，必须显式选模型）。③④ 结果类型为 `{ ok, message? } | 'pending'`。

③ 失败 → 挂 `skill_tree` 的合同 `implemented=false`、`implemented_reason='SKILLS_PROBE_FAILED'`；④ 失败 → 带 `require_reviewer_agents` 门的合同 `implemented_reason='AGENTS_PROBE_FAILED'`。`pending` 不翻转（部署前置未跑完不阻塞列表）。

③④⑤ 任一失败，依赖该能力的合同在合同列表里 `implemented=false` 并附原因码。当前开发机未装 codex，探针 ① 即红——这是部署前置，不是代码问题。

Job 目录在候选收敛后（`awaiting_selection` / `committed` / `failed` / `cancelled`）且产物已复制到 `vault/` 后，删各候选的 `project/` 与 `codex-home/`。`events.jsonl`、`snapshot/` 与 `artifacts/` 至少保留到对应 `kernel_jobs` 行还在。id 前缀：`job-` / `cand-` / `art-` / `commit-` + UUID。

### 内核表（新）

加在现有 `novel.sqlite`，与领域表同库，便于事务提交。

```sql
CREATE TABLE IF NOT EXISTS kernel_jobs (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  workspace_scope TEXT NOT NULL DEFAULT 'novel',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  capability TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  model_provider_id TEXT NOT NULL DEFAULT '',
  model_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  verb TEXT NOT NULL DEFAULT '',
  verb_params TEXT NOT NULL DEFAULT '{}',
  subject_key TEXT NOT NULL DEFAULT '',
  brief_json TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kernel_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_revision TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  status TEXT NOT NULL,
  thread_id TEXT DEFAULT '',
  turn_id TEXT DEFAULT '',
  started_at TEXT DEFAULT NULL,
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  last_message_excerpt TEXT DEFAULT '',
  gate_results TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kernel_artifacts (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  vault_path TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kernel_commits (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  domain_table TEXT NOT NULL,
  domain_row_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);
```

状态机：

```text
job:        queued → running → awaiting_selection → committed
                              ↘ committed   （恰 1 个 succeeded 且 auto_if_single，跳过等选）
                              ↘ failed
                              ↘ cancelled
candidate:  queued → running → succeeded → committed
                              ↘ gated      （门失败，可看产物，不能提交）
                              ↘ failed
```

- 没有任何 `succeeded` 候选（全是 `failed` / `gated`）：job = `failed`。
- 存在 ≥1 个 `succeeded`，且 `commit.mode=manual` 或 `succeeded` 候选数 > 1：job = `awaiting_selection`。
- 恰好 1 个 `succeeded` 且该合同 `auto_if_single`：网关自动 commit；自动 commit 失败则 job 留在 `awaiting_selection`（带失败码），不把任务标 `failed`。
- `gated` 不是成功。solo 降级是 `gated`；缺 reviewer 是启动前 `failed`。
- 提交后其余 `succeeded` 候选保持 `succeeded`（不改状态），账本可追溯谁没被选。

`workspace_scope`：`novel` | `canvas`。第一期只创建 `novel`。  
`subject_type`：`chapter` | `project` | `outline` | `canvas_node` | `pack`。已实现：`chapter`（审稿/去AI/改稿/写本章/回炉）、`project`（开书/扩纲/续写）。`pack` / 画布仍拒绝执行。

### 领域表怎么接

不新建「第二套章节」。提交时写现有表：

| binding | 动作 |
|---|---|
| `reviews.{review_type}` | `INSERT reviews`；`payload` 含 `kernel_job_id`、`kernel_candidate_id`、`kernel_artifact_id`、`chapter_id`、`chapter_text_hash`、报告正文 |
| `chapters.rewrite` | 更新 `chapters.chapter_text`，插入 `chapter_versions`，`source` 取合同声明（`oh_story_deslop` / `oh_story_apply` / `kernel_rewrite`） |
| `worldbuilding.upsert` / `characters.upsert` / `outlines.upsert` | 开书：按 `kernel_rel_path` 逐份 upsert；章细纲另建空章行。细则见动词 spec |
| `outlines.replace` | 实例带此 binding 则校验失败；网关不执行 |
| `kernel_only` | 只写 `kernel_artifacts` + `vault/` |

`reviews.review_type` 第一期仍用 `oh_story_review` / `oh_story_deslop` / `oh_story_apply`，便于现有 UI。通用合同使用 `kernel_review` / `kernel_rewrite`。UI 按 `payload.kernel_job_id` 识别内核产物，不靠再解析报告标题。

## 投影（工作台仍要做的事之一）

Codex 只认文件。小说数据在 SQLite。每次候选运行前，网关把主体投影到 `jobs/{job_id}/candidates/{candidate_id}/project/`。

### 6.1 封闭挂载

| mount | 写出 |
|---|---|
| `current_chapter` | `正文/第{NNN}章_{安全标题}.md`，正文为当前 `chapter_text` |
| `previous_chapter` | 上一章同名规则；无上一章则不写文件，prompt 变量为空 |
| `outline` | `大纲/总纲.md`、`大纲/细纲.md`、按章 `大纲/第{NNN}章.md`（从 `outlines` + 章目标字段拼） |
| `characters` | `设定/角色/{name}.md` |
| `world` | 有 `raw_payload.kernel_rel_path` 的 worldbuilding 行按原相对路径回放全文；无 rel_path 的旧行仍拼进 `设定/世界观.md` |
| `user_brief` | 投影根 `brief.md`（开书）；模板不规定 `选题决策.md` |
| `tracking` | `追踪/伏笔.md`、`追踪/逐章记录/第{NNN}章.md`；库中无记录则写最小空模板（标题 +「开放项：无」） |
| `skill_tree` | `.agents/skills/{skill_name}` → 符号链接到已安装 Pack 的 skill 目录（官方文档确认技能扫描跟随符号链接；备选 `skills/extraRoots/set`）。注意 `$HOME/.agents/skills` 不受 `CODEX_HOME` 隔离，同名个人技能会一并被发现——必须配合 7.2 的显式 skill item 锚定路径 |
| `agents` | `.codex/agents/*.toml` 与 `.story-deployed`（内容含与 bundle 一致的 `agents_version`）。toml 来自安装管线抓取的上游 agents 归档；缺则用仓库内置 `ui/server/src/kernel/agents-fallback/` 四份 reviewer。投影这些文件只满足 oh-story 存在性预检和 `require_reviewer_agents`；真正注册 `agent_type` 的是隔离 config.toml 的 `[agents.<name>]`（见 7.5）。第一期不自动跑 `/story-setup`。仍缺则候选不启动，`REVIEWERS_MISSING` |
| `review_report` | 改稿合同：把匹配的审稿写成 `审稿/第{NNN}章.md` |
| `canvas_node` | 第一期拒绝 |

章节号三位补零。标题只保留中文、字母、数字、连字符，空则用 `未命名`。

### 6.2 快照与收回

运行前写 `snapshot/manifest.json`：每个相对路径的 sha256。  
运行后：

1. 对 `write_scope` 内、且相对快照有变化或新增的文件：匹配某 `outputs[].glob` 的按其 `artifact_kind` 收；未匹配的收为 `attachment`（binding=`kernel_only`）。同一文件命中多条 glob 时，按 `outputs` 数组顺序取第一条。
2. `ignore` 前缀内的变更跳过，不收、不警告；范围外变更记入候选 `gate_results` 警告 `write_outside_scope`，不收。
3. 合同 `required` 产物缺失（含 `rewrite` 类「章文件相对快照未变化」）：先看 `fallback`（只允许 `last_message`）。仍无则候选 `failed`，`OUTPUT_MISSING`。
4. **书名子目录：** 若 `write_scope` 前缀在投影根下零命中，但恰好存在唯一一层非点前缀目录，且剥掉该前缀后命中 `write_scope`，则按剥前缀后的逻辑路径收存（`rel_path` 写入账本时不含该书名层）。多层或零层不剥。内置开书 prompt 同时要求「不要再建书名目录」。

### 6.3 大纲进度不齐

投影必须同时挂 `current_chapter` 与 `outline`（完整审稿合同强制）。网关不在投影时改大纲「对齐」正文。对齐与否由 skill 在报告里写。收存后 UI 可把报告中的 S2 大纲条目标成「待处理」，第一期不提供一键改大纲。

## 内核网关 ↔ Codex（怎么下命令、怎么拿结果）

### 7.1 传输

主协议：`codex app-server`，stdio JSON-RPC。  
网关拉起子进程，工作目录为投影 `project/`，argv = `{binary} app-server`（**不加** `--ignore-user-config`：Codex 0.147 的 `app-server` 拒绝该旗标，它只属于 `exec`），环境：

- `CODEX_HOME={candidate}/codex-home`
- `HOME={candidate}`（硬隔离：切断 `$HOME/.agents/skills` 与 `$HOME/.codex`）
- `MANGAFORGE_CODEX_KEY`（及合同需要的其它 key）

key 缺失无法构造供应商环境 → 同步 `PROVIDER_TRANSLATE_FAILED`（与翻译失败同类）。

`codex exec --json` 只允许作为启动自检或 app-server 不可用时的显式降级，需带 `--skip-git-repo-check`（投影目录不是 git 仓库），且必须记入 `kernel_candidates.metadata`（`{"engine":"exec"}`）。产品路径是 app-server。禁止第三种「自己实现 tool loop」。

### 7.2 会话调用

对每个候选，顺序固定：

1. 先写好隔离 `config.toml`（供应商 + `[agents.<name>]` + 可选 `model_reasoning_effort`，见 7.5）再拉起进程。官方不读取项目级 `.codex/config.toml`，投影内不放它
2. `initialize`，`clientInfo.name = mangaforge`，`title = MangaForge Studio`，`version` = 应用版本；随后必须发 `initialized` 通知，否则后续请求被拒
3. `thread/start`，cwd = 投影根，sandbox = **kebab-case** `workspace-write`（合同若写驼峰 `workspaceWrite` 由客户端映射过去）、approvalPolicy = `never`。锁定发行版 0.147 **不接受**驼峰枚举。官方行为：此调用会把 cwd 写入 config.toml 的 trusted 列表——隔离家目录恰好吸收该副作用
4. `skills/list`（cwds=[投影根]，`forceReload: true`）预检：合同 `mention` 指向的 skill 未被发现 → 候选 `failed`，`SKILL_NOT_FOUND`，不发 turn
5. `turn/start`，input 两项：text = `invoke.mention + "\n" + 渲染后的 invoke.prompt`；外加 `{type:"skill", name, path}`（path 取 `skills/list` 返回的投影内路径）。显式注入是官方推荐做法，规避 `$名` 模型解析歧义与 `$HOME/.agents/skills` 同名冲突
6. 收 `turn/started` / `item/*` / `turn/completed` 通知直到 turn 结束。进程崩溃 / 协议错误 / turn 超时 → 候选 `ENGINE_FAILED`
7. 审稿合同若将来改为只读，用 `read-only`，此时 `write_scope` 必须为空，报告走 `last_message`

**Turn 超时（可注入覆盖）：**

| 场景 | idle（无任何通知视为挂死） | hard |
|---|---|---|
| 默认 job（审稿 / 去AI / 改稿） | 10 min | 45 min |
| `open_book` | 15 min | 60 min |
| 探针 ④ spawn，`reasoning_effort=xhigh` | 300 s | 720 s |
| 探针 ④ spawn，其它 | 60 s | 120 s |

分期 3 计划里的 idle 120s / hard 30min **作废**（xhigh 静默推理会误杀）。

**协议形状（客户端宽容读取）：**

| 调用 | 发送 params | 读取 result |
|---|---|---|
| `initialize` | `{ clientInfo: { name, title, version } }` | 忽略内容 |
| `initialized`（通知） | `{}` | — |
| `thread/start` | `{ cwd, sandbox, approvalPolicy: 'never' }` | `result.threadId ?? result.thread?.id` |
| `skills/list` | `{ cwds: [projectDir], forceReload: true }` | `result.skills ?? result.data ?? []`，每项取 `name` 与 `path` |
| `turn/start` | `{ threadId, input: [{ type:'text', text }, { type:'skill', name, path }?] }` | `result.turnId ?? result.turn?.id ?? ''` |
| `turn/interrupt` | `{ threadId, turnId }` | 忽略内容 |

`turn/completed` 匹配 `params.threadId`（turnId 未知时只按 thread）。agent 消息取 `item/*` 中 `item.type ∈ {agentMessage, agent_message}` 的 `text`。

**Spawn 证据（记入 `events.jsonl` 与候选 `metadata.spawn_evidence`）：**

- `thread/started`：`parentThreadId`（或 `thread.parentThreadId`）非空 → 一条 subagent thread
- `item/*` 且 `item.type=collabAgentToolCall`、`item.tool=spawnAgent`：`senderThreadId` 为父、`receiverThreadIds[]` 为子（Codex 0.147 主证据面）

full 审稿 `require_spawn_evidence`：`subagent_threads.length < 1` → 候选 `gated` / `NO_SPAWN`。`reject_solo_fallback` 仍排在前面。其它动词不跑此门。

**编排 / 取消 / 孤儿：**

- 并行：`contract_ids` 全量并行（≤8，无节流）
- 取消：关闭 **全部** 活跃会话；queued/running 候选 `failed(CANCELLED)`；job `cancelled`；不 commit；随后清目录
- 孤儿：进程启动时，账本 `queued`/`running` 且不在 live map → `ENGINE_FAILED`「进程重启导致任务中断」
- 清理：收敛后删 `project/` 与 `codex-home/`，保留 events / snapshot / artifacts

### 7.3 Prompt 变量

只允许：

| 变量 | 值 |
|---|---|
| `{{scope_files}}` | 当前章等审查文件的相对路径列表 |
| `{{chapter_no}}` | 数字 |
| `{{chapter_pad}}` | 三位补零 |
| `{{chapter_title}}` | 标题 |
| `{{previous_chapter_file}}` | 相对路径或空 |
| `{{report_path}}` | 合同声明的报告路径 |
| `{{review_path}}` | 改稿用已有报告路径 |
| `{{skill_name}}` | skill 名 |
| `{{user_brief_file}}` | 开书投影的 `brief.md`；非开书为空 |

`subject_type=project` 时 `chapter_no` / `chapter_pad` / `chapter_title` / `previous_chapter_file` / `report_path` / `review_path` 渲染为空串。出现未知 `{{...}}`，合同校验失败。

### 7.4 进度怎么回给 UI

网关把 app-server 事件压成统一进度（UI 不直接认 Codex 事件名）：

```json
{
  "job_id": "...",
  "candidate_id": "...",
  "phase": "projecting|starting|running|harvesting|gating|awaiting_selection|committing",
  "elapsed_ms": 12000,
  "hint": "story-architect",
  "error_code": ""
}
```

`hint` 取自该进度候选 `events.jsonl` 里 `extractSpawnEvidence().agent_hints` 最后一个，没有则空。  
`candidate_id`：第一个仍非终态的候选；全终态则取第一个候选。7.4 对象仍是单候选，并跑时 UI 要自己展开 `candidates[]`。  
HTTP：`GET /api/kernel/jobs/:id` 返回 job + candidates + artifacts + 该对象。第一期不做 WebSocket；**新 UI 轮询间隔 1s**。旧 oh-story 三按钮不得再把整段 job 绑在一条 HTTP 上（见 10.2）。`last_message_excerpt` 取 lastMessage 前 500 字。

### 7.5 供应商翻译

从当前工作台选中的 `providers.json` + `model_id` 写成隔离 `CODEX_HOME/config.toml`：

- 根级 `model` / `model_provider`
- 根级 `model_reasoning_effort`：取模型 `context_ui_params.reasoning_effort` 或 `context_ui_params.model_reasoning_effort`（内核 304 路径为 `xhigh`）。缺省则不写该行
- `api_format=codex_responses` → `wire_api = "responses"`
- `api_format=openai_compatible` → `wire_api = "chat"`，**仅当锁定发行版仍支持**。上游主线已把 `wire_api` 收缩为「`responses` 是唯一合法值」；锁定版本不支持时，该供应商创建任务直接 400 `PROVIDER_TRANSLATE_FAILED`，不得静默换供应商、不得静默降级。锁定版本决策必须先过探针 ⑤；第一批验收用 `codex_responses` 供应商（`any` / `jun` / `free`）兜底
- 自定义 header（如 `jun` 的 User-Agent）写入 `http_headers`；key 只进环境变量（`env_key`），不进 git、不进 `vault/`
- 同一份隔离 config.toml 还写入：四条 `[agents.<name>]`（`description` + `config_file` 指向投影内 `.codex/agents/<name>.toml`，相对路径从声明它的配置文件解析）——这是 Codex 认得 `agent_type` 的正式入口；以及 `memories.generate_memories=false`、`memories.use_memories=false`，保证一次性运行不受记忆注入、不留记忆

供应商、鉴权、`model_provider`、agents 注册只出现在隔离家目录；投影目录不放 `.codex/config.toml`（官方不读）。

## 扩展规范

skill 增加能力时，按下面两级扩，禁止改 Codex、禁止改 app-server 主环。

### 8.1 配置级（无代码）

适用：新 skill 或新 variant，产物仍是已注册的 `artifact_kind`。

1. 安装或升级 Pack（锁定 revision）。
2. 新增 `contracts/{id}.json`。
3. `GET /api/kernel/contracts` 能读到；校验通过即可创建任务。
4. 工作台用合同 id 挂按钮或「并跑选优」列表。

例：再装一个审稿 skill，产物也是 `审稿/第NNN章.md`，只需新合同，`capability=review`，`outputs.artifact_kind=review_report`。

### 8.2 适配器级（小代码，有清单）

适用：新的产物类型，现有 kind 收不了。

必须同时落地四件，缺一不可：

1. 在本 spec 的能力表增加一行（另开短补丁 spec，或本文件修订）。
2. 注册 `artifact_kind`（实现里一张表，测试锁定名单）。
3. `HarvestAdapter`：输入（rel_path, bytes, contract.output）→ `kernel_artifacts` 行 + metadata。
4. `VaultBinding`（若要进领域表）：事务内写哪张表；若只归档，binding = `kernel_only`。

适配器接口（实现必须长这样，名称可映射到文件，语义不能少）：

```ts
type HarvestAdapter = {
  kind: string
  collect(input: {
    projectRoot: string
    relPath: string
    bytes: Uint8Array
    output: ContractOutput
  }): { metadata: Record<string, unknown> }
}

type VaultBinding = {
  id: string
  commit(input: {
    db: unknown
    job: KernelJob
    candidate: KernelCandidate
    artifacts: KernelArtifact[]
  }): { domain_table: string; domain_row_id: number }[]
}
```

禁止适配器再去 spawn 模型。禁止适配器读取投影外路径。

### 8.3 Pack 升级

Pack 升级只换 revision 和 skill 文件。合同若依赖新的输出路径，必须同时提交新合同或升 `variant`（`story-review.full` → 仍可留旧合同，新行为用 `story-review.full-v2`）。  
正在跑的 job 绑定创建时的 `pack_revision`，不受中途升级影响。

### 8.4 明确不扩展的东西

- 不在 Codex 里加 MangaForge UI 模块。
- 不把画布提示词编译器假装成内核合同（除非补齐 `outputs` 与文件产物）。
- 不把 MCP 工具调用的聊天文本当章节正文入库。
- 不因 skill 作者在 SKILL.md 里新增「请再跑某某检查」就自动多开任务；要多开，加合同。

## 门（Gates）

封闭集合。新门 = 适配器级扩展（一函数 + 本表加一行）。

| id | 失败码 | 行为 |
|---|---|---|
| `reject_solo_fallback` | `SOLO_FALLBACK` | 报告首 2KiB 内，`Fallback:` 行含 `solo`，或 `Effective Mode:` 行为 `solo` → 候选 `gated`。锚定行首 key（skill 报告头部强制逐行英文 key），避免 `Fallback: none` 与他处「solo」字样误伤 |
| `require_reviewer_agents` | `REVIEWERS_MISSING` | 投影缺少 `story-architect` / `character-designer` / `narrative-writer` / `consistency-checker` 四个 toml → 不启动，候选 `failed` |
| `require_chapter_file` | `CHAPTER_FILE_MISSING` | 收回后当前章文件不在或哈希与空文件相同 |
| `require_matching_review` | `OH_STORY_APPLY_NO_REVIEW` / `OH_STORY_APPLY_STALE_REVIEW` | 全无匹配审稿 → 前者，投影前即失败、候选不启动；审稿 payload 的 `chapter_text_hash` ≠ 当前正文 → 后者。启动前检一次，commit 前重跑 |
| `paragraph_retention_70` | `OH_STORY_APPLY_REWROTE_TOO_MUCH` | **原句出现：** 原文按空行切段；每段须作为连续子串出现在新正文（`haystack.includes(paragraph)`）。原文 ≥8 段且 verbatim 保留比例 <70% → 409 / 候选 `gated`。不足 8 段不触发。不是编辑距离、不是语义相似 |
| `write_outside_scope` | 警告，不单独失败 | 见投影 |
| `reject_chapter_text_artifact` | `REJECT_CHAPTER_TEXT` | 收回 `chapter_text`，或快照差异出现 `正文/` 前缀（含 write_scope 外）→ `gated`。开书/审稿结构门 |
| `reject_outline_artifact` | `REJECT_OUTLINE` | 收回 `outline_doc`，或快照差异出现 `大纲/` 前缀 → `gated`。去AI 用 |
| `require_outline_mix` | `KIND_COUNT_BELOW_MIN` | `outline_doc` 须「章号可解析」与「不可解析」各 ≥1，否则候选 `failed` |
| `require_spawn_evidence` | `NO_SPAWN` | `subagent_threads.length < 1` → 候选 `gated`。只挂 full 审稿；commit 时从 `metadata.spawn_evidence` 重读 |

门默认在收存之后、commit 之前跑；`require_reviewer_agents` 与 `require_matching_review` 的前提检查在投影后、启动前即执行（表内已注）。`gated` 产物仍进 `kernel_artifacts`，便于排错，不写领域表。`KIND_COUNT_BELOW_MIN` 是 `failed` 不是 `gated`。

两点说明：

- `OH_STORY_APPLY_*` 沿用现网错误码是有意的（同决议 10 对 `REWROTE_TOO_MUCH` 的处理）：旧路由零映射。通用合同需要中性别名时到 schema v2 再加。
- skill 自报不可尽信：网关按 7.2 记录 spawn 证据。full 审稿 `require_spawn_evidence`，零 spawn → `NO_SPAWN` gated。

## HTTP 接口

基路径：`/api/kernel`。鉴权与现有 `ui/server` 一致。第一期只服务小说工作台。

### 10.1 合同

`GET /api/kernel/contracts`

```json
{ "ok": true, "contracts": [ { "id": "...", "label": "...", "capability": "review", "implemented": true } ] }
```

`implemented=false` 的合同可展示为「即将支持」，`POST /jobs` 用它则 400 `CONTRACT_NOT_IMPLEMENTED`。

`POST /api/kernel/contracts` body = 合同 JSON。校验失败 400 `CONTRACT_INVALID`。覆盖内置 id → 400 `CONTRACT_BUILTIN`。

`DELETE /api/kernel/contracts/:id` 只允许删非内置。

### 10.2 创建任务

`POST /api/kernel/jobs`

```json
{
  "project_id": 3,
  "subject_type": "chapter",
  "subject_id": 62,
  "verb": "review_chapter",
  "contract_ids": ["oh-story-core.story-review.full"],
  "model_id": 217
}
```

- `contract_ids` 可省略：省略则用 `verb_defaults[verb]`。1..8 个。必须同一 `verb`，否则 400 `VERB_MIXED`。
- `subject_type` 必须匹配动词模板。`project` 要求 `subject_id == project_id`。开书还要 `user_brief.idea`，否则 400 `BRIEF_REQUIRED`（32KiB 上限）。
- 同项目同动词未结束任务 → 409 `PROJECT_JOB_RUNNING`（章级另加 `subject_id`）。
- 多个 id = 并跑选优。
- 返回 `202`：`{ ok: true, job: { id, status: "queued" } }`。**调用方必须随后轮询**，不得同步等待。
- 模型：新 UI 直传 `model_id`；旧按钮桥接沿用 `getStageModelId(project, review|revise, requestedModelId)`。

三个旧按钮映射：

| 按钮 | verb | body.contract_ids |
|---|---|---|
| oh-story 审稿 | `review_chapter` | `["oh-story-core.story-review.full"]` |
| oh-story 去AI | `deslop_chapter` | `["oh-story-core.story-deslop.file"]` |
| 按建议改稿 | `apply_review` | `["oh-story-core.story-apply.surgical"]` |
| 深度孵化 | `open_book` | `["oh-story-core.story-long-write.open"]` |

旧路由 `POST /api/novel/oh-story/core/{review,deslop,apply}` 已 410 `{ ok: false, code: 'ROUTE_REMOVED', error: '请改用 POST /api/kernel/jobs' }`，不再 `createAndRunKernelJob`。GET `/core` 与 POST `/install` 保留。全部产品流量走 `POST /api/kernel/jobs` 后轮询。

### 10.3 查询与取消

`GET /api/kernel/jobs/:id` → job + candidates + artifacts + progress。  
`GET /api/kernel/jobs?project_id=&subject_type=&subject_id=` → 最近 50 条。  
`GET /api/kernel/artifacts/:id/content` → 只读正文（上限 256KiB，超出 `truncated=true`）。  
`POST /api/kernel/jobs/:id/cancel` → `{ ok: true }`。已 committed 则 409 `JOB_ALREADY_COMMITTED`。不存在 404 `JOB_NOT_FOUND`。

### 10.4 选优提交

`POST /api/kernel/jobs/:id/commit` body `{ "candidate_id": "..." }`

- 候选必须 `succeeded`，否则 409 `CANDIDATE_NOT_SUCCEEDED`
- 再跑该候选的门（防止提交时正文已变：改稿须重算哈希，失败即 409 `OH_STORY_APPLY_STALE_REVIEW`；过大即 409 `OH_STORY_APPLY_REWROTE_TOO_MUCH`，文案不变）
- 审稿 / 章改写：先走既有 novel API（各自连接），再在 `openKernelDb` 上 `BEGIN IMMEDIATE` 写 `kernel_commits` + 状态（避免 SQLite 死锁）
- 开书 upsert：领域写入与 `kernel_commits` + 状态在**同一** `BEGIN IMMEDIATE`（传入共享 db）；失败整笔回滚
- 二次提交 409 `JOB_ALREADY_COMMITTED`

### 10.5 错误码

同步错误（`POST /jobs` 等请求即返回）：

| 码 | HTTP | 含义 |
|---|---|---|
| `KERNEL_RUNTIME_UNAVAILABLE` | 503 | 没有可用 Codex |
| `CONTRACT_INVALID` | 400 | 合同校验失败 / 模型不存在 |
| `CONTRACT_NOT_IMPLEMENTED` | 400 | 能力或动词未落地 |
| `CONTRACT_BUILTIN` | 400 | 不能覆盖内置合同 |
| `VERB_MIXED` | 400 | 并跑了不同 verb |
| `VERB_UNKNOWN` | 400 | `verb` 不在模板登记表 |
| `VERB_DEFAULT_MISSING` | 400 | 省略 `contract_ids` 时该动词无默认实例 |
| `SUBJECT_TYPE_MISMATCH` | 400 | 主体与动词模板不符 |
| `BRIEF_REQUIRED` | 400 | 开书缺创意或超 32KiB |
| `PROVIDER_TRANSLATE_FAILED` | 400 | 供应商无法翻译，或 key 缺失无法构造环境 |
| `PROJECT_JOB_RUNNING` | 409 | 同项目同动词未结束 |
| `JOB_NOT_FOUND` | 404 | 无此 job |
| `JOB_ALREADY_COMMITTED` | 409 | 不能取消/重复提交 |
| `CANDIDATE_NOT_FOUND` | 404 | 无此候选 |
| `CANDIDATE_NOT_SUCCEEDED` | 409 | 候选不是 succeeded |
| `ARTIFACT_NOT_FOUND` | 404 | 无此产物 |
| `ROUTE_REMOVED` | 410 | 旧 `POST /novel/oh-story/core/{review,deslop,apply}` 已下线，改打 `POST /kernel/jobs` |

终态错误（写入候选 / 任务 `error_code`；`commit` 接口按本表映射 HTTP）：

| 码 | HTTP | 含义 |
|---|---|---|
| `SKILL_NOT_FOUND` | 409 | `skills/list` 预检未发现合同 skill |
| `REVIEWERS_MISSING` | 409 | 未部署四个 reviewer |
| `SOLO_FALLBACK` | 409 | 完整审稿降级 solo |
| `NO_SPAWN` | 409 | full 审稿零 spawn 证据 |
| `OH_STORY_APPLY_NO_REVIEW` | 409 | 没有可用审稿，先审稿 |
| `OH_STORY_APPLY_STALE_REVIEW` | 409 | 审稿过期，先重新审稿 |
| `OH_STORY_APPLY_REWROTE_TOO_MUCH` | 409 | 原句出现不足 70%（改动过大） |
| `REJECT_CHAPTER_TEXT` | 409 | 开书/审稿写了正文 |
| `REJECT_OUTLINE` | 409 | 去AI 写了大纲 |
| `KIND_COUNT_BELOW_MIN` | 409 | 必收 kind 份数不足或开书缺总纲/细纲组合 |
| `CHAPTER_FILE_MISSING` | 500 | 收回后章文件缺失或为空 |
| `OUTPUT_MISSING` | 500 | 约定产物没有 |
| `ENGINE_FAILED` | 500 | 进程崩溃 / 协议错误 / turn 超时 / 进程重启孤儿 |
| `CANCELLED` | — | 用户取消；候选 failed，job cancelled |

`CAPABILITY_MIXED` 已废止，不要再发、不要再测。

创建任务返回 202 之后发生的失败（投影、启动、门）都是终态错误，不是 HTTP 响应；只有 `commit` 才把它们映射回 HTTP。旧三按钮路由已 410，不再映射终态码。

## Codex 源码：默认不动，只允许这六处补丁

补丁必须单独开短 spec，基于锁定的 `openai/codex` release，附回归。除此之外改 Codex 视为违规。

1. 供应商线协议对不上（上游主线已收缩为 responses-only；先考虑锁仍支持 chat 的旧版、或第一期只用 `codex_responses` 供应商，补丁是最后手段）。
2. 自定义 header / User-Agent 被丢掉（`http_headers` 已见于当前 config 参考，预计不触发）。
3. 隔离 `CODEX_HOME` 仍去读 `~/.codex` 或弹 ChatGPT 登录（0.147 `app-server` 已拒绝 `--ignore-user-config`，不得靠补回该旗标「修复」；硬隔离 `$HOME=jobDir` 已启用）。
4. 按 7.5 写入 `[agents.<name>]` 注册后 `agent_type` 仍不可用，导致 oh-story 降级 solo。
5. skill 发现不认 `.agents/skills` 符号链接（官方文档已确认支持符号链接，另有 `skills/extraRoots/set` 备选，预计不触发）。
6. JSONL / app-server 完全没有文件变更信息，且目录 diff 也无法实现收存（item 事件已含 file edit，且先做 diff；本条是最后手段）。

## 工作台仍要做的事（不是内核会送的）

这些必须留在 MangaForge，并在实现计划里各有任务，不能指望 skill 作者代劳：

1. **合同注册与校验** — 能力目录、按钮挂哪个 id。
2. **项目投影与收回** — SQLite ↔ 文件。
3. **隔离供应商配置** — `providers.json` → `CODEX_HOME`（含 `[agents.<name>]` 注册与 memories 关闭）。
4. **任务编排与取消** — 含并跑上限 8、关全部会话、孤儿恢复、终态清目录。
5. **门** — solo、哈希、原句出现 70%、reviewer 文件、开书 kind 份数。
6. **选优 UI** — 展示各候选摘要/正文对比，人点采纳后 `POST .../commit`。章节质检面板已落地（A）。
7. **领域入库** — 章节版本、审稿、导出仍走现有壳。
8. **Pack 锁定与升级** — 享受更新 = 换 revision + 必要时新合同，不是热补提示词；安装管线除 `skills/` 外还抓 agents 归档。
9. **参考分展示** — 朱雀/指纹继续挂在章节上，文案「参考，不自动改稿」。
10. **权限与安全** — cwd 只有投影；不把整个 git 仓库交给 Codex；job 目录不进 git。
11. **运行时探针** — 版本、握手、技能发现、agent spawn、线协议五检；探针不绿，对应合同 `implemented=false`。
12. **进度轮询** — 审稿/去AI/改稿不得把 job 绑在一条 HTTP 上；读 7.4，间隔 1s。开书向导已做（2s）；章节质量面板已做（1s，A）。

## 与现有子系统的关系

| 现有 | 本 spec 之后 |
|---|---|
| oh-story solo runner / `compile-prompt.ts` 写死 solo | 第一批合同验收后删除或变成测试夹具，不再被按钮调用 |
| `POST /api/novel/oh-story/core/{review,deslop,apply}` | 410 `ROUTE_REMOVED`；请改打 `POST /api/kernel/jobs`。GET `/core` 与 POST `/install` 保留 |
| 写作 skill 市场 | 保留为提示词编译器；不自动变内核合同 |
| 画布 skill 编译器 | 不动；将来用 `prompt` 合同另开 |
| `executeNovelAgent` 生成正文 / 大纲向导 | 深度孵化已改走 `open_book`；扩纲已走 `expand_outline`（无工作台按钮）。作者写本章：空章走 `write_chapter`；有正文走 `rewrite_chapter`。作者续写走 `write_continue`（更多 · 续写）；batch / `generateChapterForGroup` 仍旧 API |
| 导演层 / 冲突合同 | 继续降级为材料与参考分 |
| restored-src | 继续只服务漫画 Pipeline 脚本，不当代创作内核 |

## 验收

规范本身的验收（实现第一批合同时必须同时满足）：

1. 第 2 章完整审稿走内核任务；报告必须处理第 1 章章末开放钩子（当前书：猫叫 / 枯手一类接缝）。只谈 AI 味且「继承到下一批：无」= 失败。
2. 四个 reviewer 缺失或报告 Fallback solo → 409 / 任务失败，正文不变。
3. 大纲与正文不齐必须在报告里作为问题出现，且领域大纲表未被自动改写。
4. 去 AI、按建议改稿仍写章节新版本；改稿过大仍 409。
5. 同一 `verb` 两个合同并跑时，job 进入 `awaiting_selection`，提交指定候选后只有一份进领域表。
6. 新增一份「假审稿」合同（同类 `review_report` 路径）只需加 JSON、无需改网关主环，测试锁定这一点。
7. 朱雀/指纹不回退入库。
8. 不出现新的 solo 提示词路径。
9. `skills/list` 预检生效：移除投影 skill 后创建任务 → `SKILL_NOT_FOUND`，未发 turn。
10. events.jsonl 里有 spawn 证据（subagent thread 事件），且与报告 `Fallback:` 行自洽；不一致时以门为准并留档排查。

## 非目标

- 不把 MangaForge UI 嵌进 Codex 官方壳。
- 不实现 MCP Apps 小卡片版工作台。
- 不在本文件实现画布切内核、自动改大纲。开书 `open_book`、扩纲 `expand_outline`、写章 `write_chapter`、回炉 `rewrite_chapter`、续写 `write_continue` 已由动词 spec 落地（扩纲无工作台按钮；写章/回炉/续写是作者入口，batch 未切）。画布 `prompt` 仍否。
- 不删除写作 skill 市场或指纹库。
- 不实施方案 C（工作台只当编辑器、推倒合同层）。
- 不把任意 GitHub 仓库自动登记为内核合同。

## 实现分期（设计已覆盖，编码按计划拆）

本文件是平台规范。编码不得一次做完所有 capability。

| 片 | 状态 | 做什么 |
|---|---|---|
| 1 账本与合同 | 已落地 | 表、磁盘、校验、HTTP 读合同 |
| 2 投影与供应商翻译 | 已落地 | 含 `[agents.<name>]`、探针 ①②⑤ |
| 3 app-server 客户 | 已落地 | 探针 ③④；单候选 `$story-review`；spawn 证据 |
| 4 第一批三合同 + 旧按钮转调 | 已落地 | 审稿/去AI/改稿；阻塞桥接已 410 `ROUTE_REMOVED` |
| 5 并跑选优 | 已落地 | 并行 ≤8、取消全关、孤儿、清目录；章节质检面板已轮询/多选/对比 commit |
| 6 outline / 画布 prompt | **未做完** | 开书、扩纲、写章、回炉已落地；画布 `prompt` 仍须另开 brainstorm（B） |

## 尚未落地（另排）

### 排期

| 序 | 项 | 开做条件 | 产出 |
|---|---|---|---|
| 1 | **A 内核 UI** | **已落地**（`2026-08-18-kernel-job-ui`） | 质检三按钮 `POST /kernel/jobs` + 1s 轮询、同动词多选 ≤8、`awaiting_selection` 对比后 commit |
| 2 | **D 后置补丁** | **已落地**（`2026-08-18-kernel-d-patches`） | `$HOME` 硬隔离、full 审稿 `NO_SPAWN`、旧三按钮 410 `ROUTE_REMOVED` |
| 3 | **C 动词 4+** | **扩纲、写章、回炉、续写已落地**（扩纲 `2026-08-18-expand-outline-runtime`，无工作台按钮；写章 `2026-08-19-write-chapter-runtime`，作者入口；回炉 `2026-08-19-rewrite-chapter-runtime`，作者入口；续写 `2026-08-20-write-continue-runtime`，作者「更多 · 续写」） | 适配仍未开；无扩纲按钮、无 batch cutover；`generateChapterForGroup` 未 cutover |
| 4 | **B 分期 6** | 须另开 brainstorm | 画布 `prompt` 合同。扩纲运行时归 C，本片只剩画布 |

### A. 内核操作面（已落地）

实现：`docs/superpowers/plans/2026-08-18-kernel-job-ui.md`。章节质检面板走 `POST /api/kernel/jobs` + 1s 轮询 7.4、取消、同动词多选 ≤8、`awaiting_selection` 对比后 commit；产物预览走 `GET /api/kernel/artifacts/:id/content`。开书向导仍 2s 轮询，未改。旧 `POST /novel/oh-story/core/{review,deslop,apply}` 已 410。

### B. 内核分期 6（须另开 brainstorm + spec）

- 扩纲运行时归 C（计划 `2026-08-18-expand-outline-runtime.md`），不在画布片里做
- 画布 `prompt` 合同（画布仍是提示词编译器；本 spec 非目标仍成立）
- 不得在无新 spec 的情况下写分期 6 实现计划

### C. 动词分期 4+（见动词 spec 第 16 节）

- 运行时：`expand_outline` **已落地**（无工作台按钮）。`write_chapter` **已按** `2026-08-19-write-chapter-runtime` **落地**（作者入口）。`rewrite_chapter` **已按** `2026-08-19-rewrite-chapter-runtime` **落地**（作者入口）。`write_continue` **已按** `2026-08-20-write-continue-runtime` **落地**（作者「更多 · 续写」）。未做：`adapt_pack`
- `verb_defaults` 管理 UI；`adapt_pack` 元合同与 `ADAPT_NO_VALID_CONTRACT`
- 旧 seed API（derive / fill-gaps / finalize）最终下线——向导 deep_draft 已切断，API 暂留
- 开书后 `选题决策.md` 与扫榜的关系（规范明确不占用该文件名）
- 替换 `generateChapterForGroup` 必须另开 spec（本片未 cutover；batch 仍走旧 API）

### D. 内核已知后置（三项已落地）

短 spec：`docs/superpowers/specs/2026-08-18-kernel-d-patches-design.md`。实现计划：`docs/superpowers/plans/2026-08-18-kernel-d-patches.md`。

- `$HOME` 硬隔离：**已落地**（`HOME=jobDir`）
- spawn 升结构门：**已落地**（`require_spawn_evidence` / `NO_SPAWN`）
- 旧阻塞桥接下线：**已落地**（三条 POST 410 `ROUTE_REMOVED`）
- 7.4 进度对象仍单 `candidate_id`（并跑时 UI 读 `candidates[]`）——本 D 不改

## 风险

- app-server 协议仍有实验字段。客户只使用本 spec 点名的方法：`initialize`（+ `initialized` 通知）、`thread/start`、`turn/start`、`turn/interrupt`、`skills/list`，以及被动消费 `thread/started` / `turn/started` / `item/*` / `turn/completed`。新方法未写入本文件不得调用。
- oh-story 在 Codex 上若 custom agent 不可用会自己 solo。必须靠 `require_reviewer_agents` + `reject_solo_fallback` 挡住，不能信 skill 自己汇报成功；full 审稿另加 `require_spawn_evidence`（零 spawn → `NO_SPAWN` gated）。
- xhigh 静默推理可数分钟无通知。idle 超时必须大于该间隙；误用分期 3 的 120s 会把活任务打成 `ENGINE_FAILED`。
- 投影与库双写可能漂移。领域表是用户真相；投影是一次性输入。提交后以领域表为准，不要反向用旧投影覆盖库。
- Pack 更新导致报告格式变化。收存认路径和门，不认「=== 故事审查报告」这种标题。

## 与旧文档的关系

- **覆盖** `2026-08-14-oh-story-core-skill-shell-design.md` 里「runner 必须明确 solo、不 spawn」：该条作废。完整审稿必须走 Codex 内核。
- **保留** 方案 B 的产品分层（skill 出能力，壳出账本）、朱雀只参考、字数 4200、不重开理论 must_fix。
- **保留** 按建议改稿的哈希匹配与「原句出现」70% 门（算法见门表，不是语义相似）。
- **收窄** 写作 skill 市场：继续存在，但不等于内核合同。
- **废止** 分期 3 计划中的 idle 120s / hard 30min、sandbox 驼峰发送、`app-server` 带 `--ignore-user-config`、按 capability 并跑 / `CAPABILITY_MIXED`。
- **扩展** 由 `2026-08-16-novel-workbench-verb-contracts-design.md`：开书、verb 主键、投影/门补丁。本 v1.2 把已落地内核语义收回本文。
- **不替代** 画布 skill 编译器，直到另开 prompt 合同实现计划。
- **A 内核 UI 已按** `2026-08-18-kernel-job-ui` **落地**；**D 后置补丁已按** `2026-08-18-kernel-d-patches` **落地**；**C 扩纲运行时已按** `2026-08-18-expand-outline-runtime` **落地**；**C 写章运行时已按** `2026-08-19-write-chapter-runtime` **落地**；**C 回炉运行时已按** `2026-08-19-rewrite-chapter-runtime` **落地**；**C 续写运行时已按** `2026-08-20-write-continue-runtime` **落地**。B（画布 `prompt`）仍须另开 brainstorm。适配仍须另开。
