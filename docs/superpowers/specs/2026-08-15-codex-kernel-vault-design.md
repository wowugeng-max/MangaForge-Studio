# Codex 内核 + 资产账本（可扩展接口）

日期：2026-08-15  
状态：待用户审阅  
前置：

- `2026-08-14-oh-story-core-skill-shell-design.md`（方案 B：oh-story 出能力，工作台出账本；当时用 solo 一次补全，本 spec 废止该运行时）
- `2026-08-14-oh-story-apply-from-review-design.md`
- `2026-08-14-oh-story-apply-surgical-design.md`
- `2026-08-14-oh-story-deslop-file-mode-design.md`
- `2026-08-14-writing-skill-marketplace-design.md`
- `2026-08-09-canvas-prompt-skill-pack-design.md`（画布仍是提示词编译器，本 spec 定义它以后如何升级为内核合同，本期不改画布运行时）

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
5. **同类能力可以并跑、选优。** 一个任务可挂多个合同（或多个 skill 的同一 `capability`）。默认等人选；只有一个候选且门通过时，按合同 `commit.mode` 自动入库。
6. **完整审稿不得静默 solo。** 缺少四个 reviewer toml：候选 `failed`，任务失败。报告出现 `Fallback:` 且含 `solo`：候选 `gated`，唯一候选则任务失败。两种都不写入「完整审稿成功」，HTTP 分别为 `REVIEWERS_MISSING` / `SOLO_FALLBACK`。
7. **朱雀 / 指纹 / 冲突合同只做参考分。** 不回退、不拦内核入库、不触发自动修订。字数目标 4200 只警告。
8. **不重开理论 `must_fix`。** 不把 oh-story 设计课再编进正文提示。
9. **大纲进度不齐只出报告。** 标 S2，写清先改大纲还是先改后文。第一期不自动回写大纲、不改后文章。
10. **按建议改稿继续用 70% 段落保留门和正文哈希匹配。** 门失败返回 409，不写章节。
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
| `outline` | 大纲 / 细纲 / 场景卡 | `outlines` | 否（合同可登记，网关拒绝执行直到适配器落地） |
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
  "gates": ["reject_solo_fallback", "require_reviewer_agents"],
  "commit": { "mode": "auto_if_single", "domain_writes": ["reviews"] },
  "sandbox": "workspace-write",
  "approval": "never"
}
```

字段规则：

- `schema_version` 现为 `1`。增字段必须可选并有默认；删字段或改语义必须升到 `2`，旧合同继续按 v1 读。
- `mention` 必须是 Codex 显式 skill 引用（`$name`），与 Pack 内 `SKILL.md` 的 `name` 一致。
- `prompt` 只允许第 7.3 节列出的变量。禁止把整章正文再嵌进 prompt。
- `projection.mounts` 取自第 6 节封闭集合。
- `outputs[].artifact_kind` 必须已注册（第 8 节）。未注册则合同校验失败，不能创建任务。
- `write_scope` 是投影目录相对路径前缀。范围外的新文件只记警告，不收、不入库。
- `gates` 取自第 9 节封闭集合。
- `commit.mode`：`manual` | `auto_if_single` | `never`。`never` 只留候选，工作台必须再点提交（用于实验合同）。

### 第一批内置合同

| contract_id | capability | 门 | 提交 |
|---|---|---|---|
| `oh-story-core.story-review.full` | `review` | `reject_solo_fallback`、`require_reviewer_agents` | `auto_if_single` → `reviews` |
| `oh-story-core.story-deslop.file` | `rewrite` | `require_chapter_file` | `auto_if_single` → 章节新版本，`source=oh_story_deslop` |
| `oh-story-core.story-apply.surgical` | `rewrite` | `require_matching_review`、`paragraph_retention_70`、`require_chapter_file` | `auto_if_single` → 章节新版本，`source=oh_story_apply` |

`story-apply` 不是 oh-story 原包 skill。它是工作台合同：`invoke.mention` 允许为空；投影必须写出 `改稿/指令.md`（只含可执行「修改建议」+ 禁止整章重写），prompt 只引用该路径和 `{{review_path}}`。能力仍由 Codex 工具环改当前章文件，不得退回 `executeNovelAgent`。

`story-long-write` 的设计阶段登记为 `outline` 合同，第一期网关返回 `CONTRACT_NOT_IMPLEMENTED`，不跑。

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
      project/                    # 投影 cwd
      codex-home/                 # 隔离 CODEX_HOME
      snapshot/                   # 运行前文件清单与哈希
      artifacts/                  # 收回的文件副本
      last-message.md
      events.jsonl                # app-server / exec 事件
    vault/{artifact_id}/          # 已提交产物的耐久副本
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

Job 目录在任务进入终态（`committed` / `failed` / `cancelled`）且产物已复制到 `vault/` 后，可删 `project/` 与 `codex-home/`。`events.jsonl` 与 `artifacts/` 至少保留到对应 `kernel_jobs` 行还在。

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
                              ↘ failed
                              ↘ cancelled
candidate:  queued → running → succeeded → committed
                              ↘ gated      （门失败，可看产物，不能提交）
                              ↘ failed
```

- 没有任何 `succeeded` 候选（全是 `failed` / `gated` / `cancelled`）：job = `failed`。
- 存在 ≥1 个 `succeeded`，且 `commit.mode=manual` 或 `succeeded` 候选数 > 1：job = `awaiting_selection`。
- 恰好 1 个 `succeeded` 且该合同 `auto_if_single`：网关自动 commit。
- `gated` 不是成功。solo 降级是 `gated`；缺 reviewer 是启动前 `failed`。

`workspace_scope`：`novel` | `canvas`。第一期只创建 `novel`。  
`subject_type`：`chapter` | `outline` | `canvas_node` | `project`。第一期只允许 `chapter`。

### 领域表怎么接

不新建「第二套章节」。提交时写现有表：

| binding | 动作 |
|---|---|
| `reviews.{review_type}` | `INSERT reviews`；`payload` 含 `kernel_job_id`、`kernel_candidate_id`、`kernel_artifact_id`、`chapter_id`、`chapter_text_hash`、报告正文 |
| `chapters.rewrite` | 更新 `chapters.chapter_text`，插入 `chapter_versions`，`source` 取合同声明（`oh_story_deslop` / `oh_story_apply` / `kernel_rewrite`） |
| `outlines.replace` | 第一期不执行 |
| `kernel_only` | 只写 `kernel_artifacts` + `vault/` |

`reviews.review_type` 第一期仍用 `oh_story_review` / `oh_story_deslop` / `oh_story_apply`，便于现有 UI。通用合同使用 `kernel_review` / `kernel_rewrite`。UI 按 `payload.kernel_job_id` 识别内核产物，不靠再解析报告标题。

## 投影（工作台仍要做的事之一）

Codex 只认文件。小说数据在 SQLite。每次候选运行前，网关把主体投影到 `jobs/{job_id}/project/`。

### 6.1 封闭挂载

| mount | 写出 |
|---|---|
| `current_chapter` | `正文/第{NNN}章_{安全标题}.md`，正文为当前 `chapter_text` |
| `previous_chapter` | 上一章同名规则；无上一章则不写文件，prompt 变量为空 |
| `outline` | `大纲/总纲.md`、`大纲/细纲.md`、按章 `大纲/第{NNN}章.md`（从 `outlines` + 章目标字段拼） |
| `characters` | `设定/角色/{name}.md` |
| `world` | `设定/世界观.md` |
| `tracking` | `追踪/伏笔.md`、`追踪/逐章记录/第{NNN}章.md`；库中无记录则写最小空模板（标题 +「开放项：无」） |
| `skill_tree` | `.agents/skills/{skill_name}` → 符号链接或只读复制到已安装 Pack 的 skill 目录 |
| `agents` | `.codex/agents/*.toml` 与 `.story-deployed`。文件来自 Pack 归档里的 `agents/` / `.codex/agents/`，或仓库内置的四份 reviewer 模板。第一期不自动跑 `/story-setup`。仍缺则候选不启动，`REVIEWERS_MISSING` |
| `review_report` | 改稿合同：把匹配的审稿写成 `审稿/第{NNN}章.md` |
| `canvas_node` | 第一期拒绝 |

章节号三位补零。标题只保留中文、字母、数字、连字符，空则用 `未命名`。

### 6.2 快照与收回

运行前写 `snapshot/manifest.json`：每个相对路径的 sha256。  
运行后：

1. 对 `write_scope` 内、且相对快照有变化或新增的文件，收入 `kernel_artifacts`。
2. 范围外变更记入候选 `gate_results` 警告 `write_outside_scope`，不收。
3. 合同 `required` 产物缺失：先看 `fallback`（只允许 `last_message`）。仍无则候选 `failed`，`OUTPUT_MISSING`。

### 6.3 大纲进度不齐

投影必须同时挂 `current_chapter` 与 `outline`（完整审稿合同强制）。网关不在投影时改大纲「对齐」正文。对齐与否由 skill 在报告里写。收存后 UI 可把报告中的 S2 大纲条目标成「待处理」，第一期不提供一键改大纲。

## 内核网关 ↔ Codex（怎么下命令、怎么拿结果）

### 7.1 传输

主协议：`codex app-server`，stdio JSON-RPC。  
网关拉起子进程，工作目录为投影 `project/`，环境：

- `CODEX_HOME={job}/codex-home`
- `MANGAFORGE_CODEX_KEY`（及合同需要的其它 key）
- 不继承用户交互式 `~/.codex` 登录；使用 `--ignore-user-config` 或只读隔离家目录

`codex exec --json` 只允许作为启动自检或 app-server 不可用时的显式降级，且必须写进 `kernel_candidates.metadata`（实现时放在 `gate_results` 一条 `engine=exec`）。产品路径是 app-server。禁止第三种「自己实现 tool loop」。

### 7.2 会话调用

对每个候选，顺序固定：

1. `initialize`，`clientInfo.name = mangaforge`，`title = MangaForge Studio`，`version` = 应用版本
2. 如需：把隔离 `config.toml` 配好再 initialize（供应商不能写在项目 `.codex/config.toml`，官方会忽略）
3. `thread/start`，cwd = 投影根
4. `turn/start`，用户文本 = `invoke.mention + "\n" + 渲染后的 invoke.prompt`
5. 收通知直到 turn 结束
6. 若 skill 要写文件：sandbox = 合同 `workspace-write`，审批 = `never`（无人值守）。审稿合同若将来改为只读，用 `read-only`，此时 `write_scope` 必须为空，报告走 `last_message`

取消：工作台 `POST .../cancel` → 网关中止 turn / 杀子进程 → job `cancelled`，不 commit。

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

出现未知 `{{...}}`，合同校验失败。

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

`hint` 取自最近一条可识别的 agent/item 名，没有则空。  
HTTP：`GET /api/kernel/jobs/:id` 返回该对象。UI 现有「审稿中 · 12s」读 `elapsed_ms` 与 `phase`。第一期不做 WebSocket；轮询间隔 1s。

### 7.5 供应商翻译

从当前工作台选中的 `providers.json` + `model_id` 写成隔离 `CODEX_HOME/config.toml`：

- `api_format=codex_responses` → `wire_api = "responses"`
- `api_format=openai_compatible` → `wire_api = "chat"`
- 自定义 header（如 `jun` 的 User-Agent）写入 `http_headers`
- key 只进环境变量，不进 git、不进 `vault/`

项目级 `.codex/config.toml` 只放 skill/agent 发现所需的非供应商项。供应商、鉴权、`model_provider` 只出现在隔离家目录。

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
| `reject_solo_fallback` | `SOLO_FALLBACK` | 报告首 2KiB 匹配 `Fallback:` 且含 `solo` → 候选 `gated` |
| `require_reviewer_agents` | `REVIEWERS_MISSING` | 投影缺少 `story-architect` / `character-designer` / `narrative-writer` / `consistency-checker` 四个 toml → 不启动，候选 `failed` |
| `require_chapter_file` | `CHAPTER_FILE_MISSING` | 收回后当前章文件不在或哈希与空文件相同 |
| `require_matching_review` | `REVIEW_HASH_MISMATCH` | 改稿时审稿 payload 的 `chapter_text_hash` ≠ 当前正文 |
| `paragraph_retention_70` | `OH_STORY_APPLY_REWROTE_TOO_MUCH` | 沿用现有算法；原文 ≥8 段且 verbatim 段 <70% → 409 / 候选 `gated` |
| `write_outside_scope` | 警告，不单独失败 | 见投影 |

门在收存之后、commit 之前跑。`gated` 产物仍进 `kernel_artifacts`，便于排错，不写领域表。

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
  "contract_ids": ["oh-story-core.story-review.full"],
  "model_id": 217
}
```

- `contract_ids` 1..8 个。必须同一 `capability`，否则 400 `CAPABILITY_MIXED`。
- 多个 id = 并跑选优。
- 返回 `202`：`{ ok: true, job: { id, status: "queued" } }`

三个旧按钮映射：

| 按钮 | body.contract_ids |
|---|---|
| oh-story 审稿 | `["oh-story-core.story-review.full"]` |
| oh-story 去AI | `["oh-story-core.story-deslop.file"]` |
| 按建议改稿 | `["oh-story-core.story-apply.surgical"]` |

旧路由 `POST /api/novel/oh-story/core/{review,deslop,apply}` 第一期改为内部转调内核创建任务，响应形状保持现有前端能用（`review` / `chapter` / 错误码），同时带上 `kernel_job_id`。新 UI 直接打 `/api/kernel/jobs`。

### 10.3 查询与取消

`GET /api/kernel/jobs/:id` → job + candidates + artifacts + progress。  
`GET /api/kernel/jobs?project_id=&subject_type=&subject_id=` → 最近 50 条。  
`POST /api/kernel/jobs/:id/cancel` → `{ ok: true }`。已 committed 则 409 `JOB_ALREADY_COMMITTED`。

### 10.4 选优提交

`POST /api/kernel/jobs/:id/commit` body `{ "candidate_id": "..." }`

- 候选必须 `succeeded`
- 再跑该候选的门（防止提交时正文已变：改稿须重算哈希）
- 事务：领域写入 + `kernel_commits` + job `committed`
- 改稿过大：409，错误码与现网一致 `OH_STORY_APPLY_REWROTE_TOO_MUCH`，文案不变

### 10.5 错误码

| 码 | HTTP | 含义 |
|---|---|---|
| `KERNEL_RUNTIME_UNAVAILABLE` | 503 | 没有可用 Codex |
| `CONTRACT_INVALID` | 400 | 合同校验失败 |
| `CONTRACT_NOT_IMPLEMENTED` | 400 | 能力未落地 |
| `CONTRACT_BUILTIN` | 400 | 不能覆盖内置合同 |
| `CAPABILITY_MIXED` | 400 | 并跑了不同 capability |
| `REVIEWERS_MISSING` | 409 | 未部署四个 reviewer |
| `SOLO_FALLBACK` | 409 | 完整审稿降级 solo |
| `REVIEW_HASH_MISMATCH` | 409 | 先重新审稿 |
| `OH_STORY_APPLY_REWROTE_TOO_MUCH` | 409 | 改动过大 |
| `OUTPUT_MISSING` | 500 | 约定产物没有 |
| `JOB_ALREADY_COMMITTED` | 409 | 不能取消/重复提交 |
| `PROVIDER_TRANSLATE_FAILED` | 400 | 供应商线协议无法翻译 |

## Codex 源码：默认不动，只允许这六处补丁

补丁必须单独开短 spec，基于锁定的 `openai/codex` release，附回归。除此之外改 Codex 视为违规。

1. 供应商线协议对不上（Responses vs chat、代理路径）。
2. 自定义 header / User-Agent 被丢掉。
3. 隔离 `CODEX_HOME` 仍去读 `~/.codex` 或弹 ChatGPT 登录。
4. `.codex/agents/*.toml` 的 `agent_type` 不可用，导致 oh-story 降级 solo。
5. skill 发现不认 `.agents/skills` 符号链接，且我们无法改用官方支持的目录。
6. JSONL / app-server 完全没有文件变更信息，且目录 diff 也无法实现收存（先做 diff；本条是最后手段）。

## 工作台仍要做的事（不是内核会送的）

这些必须留在 MangaForge，并在实现计划里各有任务，不能指望 skill 作者代劳：

1. **合同注册与校验** — 能力目录、按钮挂哪个 id。
2. **项目投影与收回** — SQLite ↔ 文件。
3. **隔离供应商配置** — `providers.json` → `CODEX_HOME`。
4. **任务编排与取消** — 含并跑上限 8。
5. **门** — solo、哈希、70% 保留、reviewer 文件。
6. **选优** — UI 展示各候选摘要，人点采纳。
7. **领域入库** — 章节版本、审稿、导出仍走现有壳。
8. **Pack 锁定与升级** — 享受更新 = 换 revision + 必要时新合同，不是热补提示词。
9. **参考分展示** — 朱雀/指纹继续挂在章节上，文案「参考，不自动改稿」。
10. **权限与安全** — cwd 只有投影；不把整个 git 仓库交给 Codex；job 目录不进 git。

## 与现有子系统的关系

| 现有 | 本 spec 之后 |
|---|---|
| oh-story solo runner / `compile-prompt.ts` 写死 solo | 第一批合同验收后删除或变成测试夹具，不再被按钮调用 |
| `POST /api/novel/oh-story/core/*` | 转内核；错误码兼容 |
| 写作 skill 市场 | 保留为提示词编译器；不自动变内核合同 |
| 画布 skill 编译器 | 不动；将来用 `prompt` 合同另开 |
| `executeNovelAgent` 生成正文 / 大纲向导 | 本 spec 不改；未登记合同的流程仍走旧 API |
| 导演层 / 冲突合同 | 继续降级为材料与参考分 |
| restored-src | 继续只服务漫画 Pipeline 脚本，不当代创作内核 |

## 验收

规范本身的验收（实现第一批合同时必须同时满足）：

1. 第 2 章完整审稿走内核任务；报告必须处理第 1 章章末开放钩子（当前书：猫叫 / 枯手一类接缝）。只谈 AI 味且「继承到下一批：无」= 失败。
2. 四个 reviewer 缺失或报告 Fallback solo → 409 / 任务失败，正文不变。
3. 大纲与正文不齐必须在报告里作为问题出现，且领域大纲表未被自动改写。
4. 去 AI、按建议改稿仍写章节新版本；改稿过大仍 409。
5. 同一 `capability` 两个合同并跑时，job 进入 `awaiting_selection`，提交指定候选后只有一份进领域表。
6. 新增一份「假审稿」合同（同类 `review_report` 路径）只需加 JSON、无需改网关主环，测试锁定这一点。
7. 朱雀/指纹不回退入库。
8. 不出现新的 solo 提示词路径。

## 非目标

- 不把 MangaForge UI 嵌进 Codex 官方壳。
- 不实现 MCP Apps 小卡片版工作台。
- 不在本 spec 实现画布切内核、长篇细纲合同、自动改大纲。
- 不删除写作 skill 市场或指纹库。
- 不实施方案 C（工作台只当编辑器、推倒合同层）。
- 不把任意 GitHub 仓库自动登记为内核合同。

## 实现分期（设计已覆盖，编码按计划拆）

本文件是平台规范。编码不得一次做完所有 capability。实现计划必须按下列切片，每片有独立验收：

1. **账本与合同** — 表、磁盘、校验、HTTP 读合同；不接 Codex。
2. **投影与供应商翻译** — 能对项目 3 第 2 章落盘，隔离 `CODEX_HOME` 可人工打开检查。
3. **app-server 客户** — 一个候选跑通 `$story-review`，事件进 `events.jsonl`。
4. **第一批三合同 + 旧按钮转调** — 第 2 章完整审稿验收。
5. **并跑选优** — 两个 review 合同。
6. **（另开）** outline / 画布 prompt 合同。

## 风险

- app-server 协议仍有实验字段。客户只使用本 spec 点名的方法：`initialize`、`thread/start`、`turn/start`、取消/结束通知。新方法未写入本文件不得调用。
- oh-story 在 Codex 上若 custom agent 不可用会自己 solo。必须靠 `require_reviewer_agents` + `reject_solo_fallback` 挡住，不能信 skill 自己汇报成功。
- 投影与库双写可能漂移。领域表是用户真相；投影是一次性输入。提交后以领域表为准，不要反向用旧投影覆盖库。
- Pack 更新导致报告格式变化。收存认路径和门，不认「=== 故事审查报告」这种标题。

## 与旧文档的关系

- **覆盖** `2026-08-14-oh-story-core-skill-shell-design.md` 里「runner 必须明确 solo、不 spawn」：该条作废。完整审稿必须走 Codex 内核。
- **保留** 方案 B 的产品分层（skill 出能力，壳出账本）、朱雀只参考、字数 4200、不重开理论 must_fix。
- **保留** 按建议改稿的哈希匹配与 70% 保留门。
- **收窄** 写作 skill 市场：继续存在，但不等于内核合同。
- **不替代** 画布 skill 编译器，直到另开 prompt 合同实现计划。
