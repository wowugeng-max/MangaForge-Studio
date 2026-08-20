# 小说工作台动词与合同模板

日期：2026-08-16  
状态：待用户审阅（v1.5，2026-08-20：续写运行时已落地）  
前置：

- `2026-08-15-codex-kernel-vault-design.md`（内核账本、合同、投影、第一批审稿/去AI/改稿合同。本文件是其「另开」的 outline / 开书规范，并补上工作台动词层）
- oh-story `story-long-write` 开书场景：Phase 1→2→3，默认停在细纲，不自动写正文

### v1.5 修订要点（2026-08-20，续写运行时落地）

1. 内置 `oh-story-core.story-long-write.continue` 已 `implemented=true`，动词 `write_continue`。工作台「更多 · 续写」。`commit.mode=auto_if_single`。
2. 收获后必须刚好 `count` 份窗口内非空 `chapter_text`。commit 按路径解析章号 → `listNovelChapters` → `updateNovelChapter(row.id)`，禁止把 `job.subject_id` 当 chapter id。
3. `adapt_pack` / 扩纲工作台按钮 / batch cutover 仍未做。`generateChapterForGroup` 仍走旧 API。

### v1.4 修订要点（2026-08-19，回炉运行时落地）

1. 内置 `oh-story-core.story-long-write.rewrite` 已 `implemented=true`，动词 `rewrite_chapter`（作者入口）。`commit.mode=manual`；模板门含 `reject_outline_artifact`。
2. 入口 `POST /api/kernel/jobs`（写作区有正文时主按钮「回炉」）。空 / 空白 / `【占位正文】` → 400 `CHAPTER_NO_PROSE`。无章行 → 400 `CHAPTER_NOT_FOUND`。不验细纲（无 `OUTLINE_MISSING`）。job 进入 `awaiting_selection`；写作区预览 `chapter_text` 后采纳才入库。
3. `oh-story-core.story-long-write.outline` 仍 `implemented=false`，不当开书、不当扩纲、不当写章、不当回炉。
4. 续写 / `adapt_pack` 仍未做。`generateChapterForGroup` / batch 仍走旧 API，必须另开 spec。（**已被 v1.5 覆盖：`write_continue` 已落地**；`adapt_pack` 与 `generateChapterForGroup` 仍未做）。

### v1.3 修订要点（2026-08-19，写章运行时落地）

1. 内置 `oh-story-core.story-long-write.chapter` 已 `implemented=true`，动词 `write_chapter`（作者入口）。`commit.mode=auto_if_single`；模板门含 `reject_outline_artifact`。
2. 入口 `POST /api/kernel/jobs`（写作区「确认计划，进入初稿」/「写草稿」）。已有正文 → 400 `CHAPTER_HAS_PROSE`（`has_prose` = trim 非空且不含 `【占位正文】`）。无章行 → 400 `CHAPTER_NOT_FOUND`。无匹配细纲 → 400 `OUTLINE_MISSING`。匹配只用章行 `outline_id`、`raw_payload.chapter_no`、`parseChapterNoFromRelPath(kernel_rel_path)`（只传路径）；不用标题正则。
3. `oh-story-core.story-long-write.outline` 仍 `implemented=false`，不当开书、不当扩纲、不当写章。
4. 续写 / 回炉 / `adapt_pack` 仍未做。`generateChapterForGroup` / batch 仍走旧 API，必须另开 spec。（**已被 v1.4 覆盖：`rewrite_chapter` 已落地**；**已被 v1.5 覆盖：`write_continue` 已落地**；`adapt_pack` 与 `generateChapterForGroup` 仍未做）。

### v1.2 修订要点（2026-08-18，扩纲运行时落地）

1. 内置 `oh-story-core.story-long-write.expand` 已 `implemented=true`，动词 `expand_outline`。`commit.mode=manual`；`outlines.upsert`；禁 `outlines.replace`；禁写 `chapters`。
2. 无工作台扩纲按钮。入口 `POST /api/kernel/jobs`。无大纲 → 400 `FOUNDATION_PRECONDITION`。
3. `oh-story-core.story-long-write.outline` 仍 `implemented=false`，不当开书、不当扩纲。
4. 写章 / 续写 / 回炉 / `adapt_pack` 仍未做（**已被 v1.3 覆盖：`write_chapter` 已落地**；**已被 v1.4 覆盖：`rewrite_chapter` 已落地**；**已被 v1.5 覆盖：`write_continue` 已落地**；`adapt_pack` 与替换 `generateChapterForGroup` 仍未做）。

### v1.1 修订要点（按 2026-08-17 审核）

1. 设定产物回放：`world` 挂载升级为按 `kernel_rel_path` 回放全部已提交 `world_doc`（机制同追踪文档），拼接单文件只作兜底——否则 `设定/势力/`、`设定/文风.md` 等开书产物在后续写章/审稿投影中丢失，而 skill 的 Phase 4/5 按原路径找它们。
2. 禁写门升级为路径前缀语义：`reject_chapter_text_artifact` / `reject_outline_artifact` 检查快照差异前缀（`正文/`、`大纲/`），不再只看收存 kind——按旧定义推荐实例永远触发不了；「审稿/开书不得改正文」因此成为结构门。
3. 机器校验补第 8 条：`subject_type=project` / `pack` 的实例列出章级挂载即 `TEMPLATE_UNSATISFIED`（通例规则，补上「投影」节要求却无处落地的校验）。
4. 新增 `require_outline_mix` 门：开书 `outline_doc` 须「章号可解析」与「不可解析」各 ≥1，杜绝两份细纲混过 min=2。
5. `PROJECT_JOB_RUNNING` 分粒度：project 级动词按 `project_id+verb` 判重；章级动词按 `project_id+verb+subject_id`，不同章可并行。
6. glob 命中优先级：同一文件命中多条 output glob 时按 `outputs` 数组顺序取第一条；开书实例把 `character_sheet` 排在宽 `world_doc` glob 之前。
7. 小项：`KIND_COUNT_BELOW_MIN` 定为候选 `failed`；`verb` 增列写法 `NOT NULL DEFAULT ''` + 回填；`write_chapter` 门注释纠偏；quick_ai 删除范围注明在前端向导；内核 spec 终态错误表回填 `ENGINE_FAILED` / `CANCELLED`（本次已同步修改该文件）。

## 目标

把小说工作台从「按钮绑死某个 oh-story 口令」改成：

- **工作台动词不变**：开书、写正文、审稿、修订、去AI、扩纲是作者动作，不跟某个 GitHub skill 绑定。
- **合同模板锁账本最低交付**：只规定必须交出什么、禁止写什么、写进哪张领域表。不锁 `$story-long-write`、中文目录名、四审、Phase 1–3。
- **真实合同才是 skill 方言**：`$mention`、prompt、glob、skill 专属门写在实例里。运行时只跑已校验实例，不把自然语言当执行入口。
- **换包走适配，不走日常按钮**：新 skill 先按模板生成实例，机器校验通过并由人指定默认后，同一按钮才换执行方。填不满模板的 skill，判定不适合这套工作台。

第一份实例仍是 oh-story。深度孵化走 Codex 内核上的 `$story-long-write` 开书，停在细纲。手动开书不进内核。创建方式去掉「AI 快速」。

规范覆盖全部创作动词。编码按第 16 节切片；第一期只做基板 + 开书产品。

## 已确认决策

1. **创建方式两条**：手动开书（全表单，无 Codex）；深度孵化（空项目 + `open_book` kernel job）。删除「AI 快速」。
2. **先建空项目再跑开书。** `subject_type=project`，`subject_id=project_id`。不在无项目的 seed draft 上挂 job。
3. **深度孵化对齐 oh-story 开书，不是 MangaForge 自有 seed 流水线。** 该模式禁止再打 `/novel/project-seed/derive-stream`（以及 fill-gaps / finalize 主路径）。内核不可用时 503 `KERNEL_RUNTIME_UNAVAILABLE`，禁止回退旧 LLM。
4. **模板只锁账本最低交付（方案 A）。** 开书必收设定类 + 大纲/细纲类，正文不得作为必收。不把 oh-story 流程写进模板。
5. **按钮发动词。** 网关用 `verb_defaults[verb]` 解析默认实例。第一期默认全是手写 oh-story 合同，效果上仍等于绑死合同 id。并跑选优必须同一动词（修正内核 spec 第 5 条「按 capability 并跑」）。
6. **开书 `commit.mode=manual`。** 生成后只读预览 vault，人点采纳才入库；不在候选目录里改完再提交。采纳后进工作台再改。
7. **`adapt_pack` 只在装包/换包时跑**，日常开书/审稿不生成新指令。oh-story 内置实例手写，不走适配。适配结果永远手动采纳，且不自动改 `verb_defaults`。
8. **去AI 可以是专用 skill**，也可以是大包里的一个 variant。同一 skill 可用不同 variant 挂多条动词。
9. **画布、旧写作 skill 市场提示词编译器、不改 Codex 源码**：沿用内核 spec。本文件不切画布。
10. **内核模型**走工作台当前选中的 Codex 内核文本模型（现网 `kernel-codex-gpt-5.6-luna` / 304）。禁止改指向 302 或旧 LLM 路径。

## 问题与原则

页面若直接发送 oh-story 口令，换 skill 就要改 UI。页面若只丢自然语言，账本不知道收什么。

因此：

```text
工作台动词
    → 合同模板（MangaForge 产品代码，versioned）
    → 合同实例 {pack}.{skill}.{variant}
    → Codex 跑 skill → 按 kind/glob 收存 → 门 → 领域账本
```

享受 skill 更新的前提是：收存认产物类型和合同 glob，不认某次提示词措辞。不是每个写作 skill 都能用：只接能在 Codex 里写清文件、并能填满某条动词模板的。只输出聊天正文的，不得登记为内核合同。

## 分层与核心概念

| 词 | 谁拥有 | 含义 |
|---|---|---|
| 动词 `verb` | 工作台 | 作者动作。例：`open_book`、`review_chapter` |
| 合同模板 | MangaForge 仓库 | 该动词的最低交付与禁写。例：开书必须有世界观 + 角色 + 大纲，不得必收正文 |
| 合同实例 | Pack + 工作区 JSON | 某个 skill 怎么执行该动词。例：`oh-story-core.story-long-write.open` |
| capability | 内核收存类 | `review` / `rewrite` / `outline` 等。表示产物类别，不再作为并跑主键 |
| Job / Candidate / Gate / Binding | 同内核 spec | 一次动作、一次 Codex 运行、提交前检查、写入哪张领域表 |

模板放在仓库内 `ui/server/src/kernel/verbs/templates/{verb}.json`，随应用版本升级，用户不能用工作区文件覆盖模板（避免「最低交付」被改松）。实例仍在 `{workspace}/.mangaforge/kernel/contracts/{id}.json`。默认绑定在 `{workspace}/.mangaforge/kernel/verb-defaults.json`（安装 oh-story 或首次启动时写入内置默认）。

## 工作台动词全表

`manual_create` 无模板、无 job。其余创作动词都有模板。`adapt_pack` 是平台动词。

| 动词 id | 页面名称 | 主体 | 主 capability | 必收（账本） | 默认禁止 | 何时可点 |
|---|---|---|---|---|---|---|
| `manual_create` | 手动开书 | 无 job | — | 用户表单建项目 | 不调 Codex | 创建向导 |
| `open_book` | 深度孵化 | 先建空项目，再 `project` | `outline` | 设定类 + 卷纲/细纲 | 正文不得作为必收 | 向导提交创意后 |
| `expand_outline` | 扩写大纲 | `project` | `outline` | 新增或修改的大纲/细纲 | 正文不得作为必收；不得把开书当扩纲 | 项目已有设定/总纲 |
| `write_chapter` | 写本章 | `chapter` | `rewrite` | 本章 `chapter_text` | 不得把审稿报告当正文入库 | 本章细纲已在账本 |
| `write_continue` | 续写 | `project`（从下一章起） | `rewrite` | 1..N 章正文（默认 2，单轮上限 3） | 空项目、无细纲时不可跑 | 已有正文的章「更多 · 续写」；空章界面不出现该按钮（用生成正文） |
| `review_chapter` | 审稿 | `chapter` | `review` | `review_report` | 不得改正文 | 本章有正文 |
| `apply_review` | 按建议改稿 | `chapter` | `rewrite` | 变更后的本章正文 | 无匹配审稿则不启动 | 有对应当前正文哈希的审稿 |
| `rewrite_chapter` | 回炉重写 | `chapter` | `rewrite` | 变更后的本章正文 | 与「按建议改稿」分开，不受 70% 原句保留门 | 本章有正文；作者明确要大改 |
| `deslop_chapter` | 去AI | `chapter` | `rewrite` | 变更后的本章正文 | 不得改大纲；不依赖审稿 | 本章有正文 |
| `adapt_pack` | 适配 skill | `pack` | （元合同） | 通过校验的合同实例 JSON | 不得直接当默认；不得在每次开书时重跑 | 安装或更换写作 pack 时 |

作者主路径：

```text
手动开书 ─────────────────────────────► 工作台
深度孵化 → open_book → 设定+细纲 ──► 工作台
                │
                ├─ expand_outline（需要时）
                ├─ write_chapter / write_continue
                ├─ review_chapter
                ├─ apply_review 或 rewrite_chapter
                └─ deslop_chapter
```

## 模板 schema

```json
{
  "schema_version": 1,
  "verb": "open_book",
  "label": "深度孵化",
  "subject_type": "project",
  "capability": "outline",
  "required_kinds": [
    { "kind": "world_doc", "min": 1 },
    { "kind": "character_sheet", "min": 1 },
    { "kind": "outline_doc", "min": 2 }
  ],
  "optional_kinds": [],
  "forbidden_required_kinds": ["chapter_text", "review_report"],
  "allowed_domain_writes": ["worldbuilding", "characters", "outlines"],
  "forbidden_domain_writes": ["chapters", "reviews"],
  "template_gates": ["reject_chapter_text_artifact", "require_outline_mix"],
  "allowed_gates": ["reject_chapter_text_artifact", "require_outline_mix", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "manual",
  "allowed_replace_bindings": false
}
```

各动词的 `template_gates` / `allowed_gates` / `required_kinds` 以「逐条模板」节为准；上例只说明 JSON 形状。

字段规则：

- `mention_policy`：`required`（必须 `$skill_name`）| `optional`（允许空，工作台合同）| `forbidden`。
- `allowed_replace_bindings`：为 true 时实例才可使用 `outlines.replace`。v1 全部模板为 false（开书、扩纲都走 upsert，禁止先 DELETE 全表）。
- `required_kinds[].min`：收存后该 kind 的产物份数下限。一份 glob 命中多个文件计多份。
- 模板不包含 prompt、glob、路径、pack 名。
- 新模板字段必须可选并有默认；删字段或改语义升 `schema_version`。

实例合同在内核 spec 的 JSON 上增加必填 `verb`（等于模板 id）。`id` 仍为 `{pack_id}.{skill_name}.{variant}`。

### 实例相对模板的机器校验

登记或 `adapt_pack` 产出时执行。失败码 `TEMPLATE_UNSATISFIED`。

1. `capability`、`subject_type` 与模板一致。
2. 每个 `required_kinds[].kind` 至少有一条 `required: true` 的 output。
3. 没有任何 `required` output 的 kind 落在 `forbidden_required_kinds`。
4. `commit.domain_writes` ⊆ `allowed_domain_writes`，且不与 `forbidden_domain_writes` 相交。
5. `template_gates` 必须全部出现在实例 `gates`；多出来的门必须 ∈ `allowed_gates`。
6. `mention` 符合 `mention_policy`。
7. `allowed_replace_bindings=false` 时（v1 全部如此），任何 binding 不得为 `outlines.replace`。
8. 挂载与主体一致：`subject_type=project` / `pack` 的实例列出章级挂载（`current_chapter` / `previous_chapter` / `review_report`）即失败——通例规则，模板不必逐个声明。

无 `verb` 的旧工作区合同：仅内置 id 映射表可推断（见「与现网合同」）。无法推断的不能通过动词 API 创建任务。

## 新登记的 kind、绑定、门、mount、变量

本文件新增的属于内核 spec 第 8.2 节适配器级扩展，开书切片必须落地。

**artifact_kind：** 已有 `review_report`、`tracking_doc`、`chapter_text`、`outline_doc`、`attachment`。新增 `world_doc`、`character_sheet`、`contract_json`。

**binding：**

| binding | 动作 |
|---|---|
| `worldbuilding.upsert` | 每个 `world_doc` 文件一行；`raw_payload.kernel_rel_path` 与全文必存，已有则按 `kernel_rel_path` 更新，否则插入。正文进 `world_summary`（过长则摘要 + 全文进 `raw_payload`）。存 rel_path 是回放挂载的前提 |
| `characters.upsert` | 每个 `character_sheet` 按姓名（文件名去扩展名，或文首标题）匹配；命中则更新，否则插入。全文进 `backstory` / `raw_payload` |
| `outlines.upsert` | 每个 `outline_doc` 一行。路径或标题能解析出「第 N 章」→ `outline_type=chapter`，`raw_payload.chapter_no=N`；否则 `outline_type=master`。匹配键：`kernel_rel_path`，其次章号，其次 title。空项目开书也用 upsert，不先清空表 |
| `outlines.replace` | v1 不使用。实例带此 binding 则 `TEMPLATE_UNSATISFIED` |
| 已有 | `reviews.*`、`chapters.rewrite`、`kernel_only` |

开书采纳时 **额外**：为每份能解析出章号的章细纲，若不存在该 `chapter_no` 的章行，则 `createNovelChapter`（`chapter_text=''`，`title` 从细纲标题清洗，`outline_id` 指向刚 upsert 的大纲）。不写正文，不插入「有正文」的 `chapter_versions`。

提交适配必须 **遍历该 kind 的全部产物**，禁止只 `find()` 第一份（现网 `commit.ts` 对单报告/单章成立，开书不成立）。

**模板级新门：**

| id | 失败码 | 行为 |
|---|---|---|
| `reject_chapter_text_artifact` | `REJECT_CHAPTER_TEXT` | 收回任何 `chapter_text` 产物，**或快照差异中 `正文/` 前缀出现新增/修改（含 write_scope 外）** → 候选 `gated`。只看收存 kind 的话，推荐实例（write_scope 不含 `正文/`）永远触发不了——正文写入只会静默变成范围外警告 |
| `reject_outline_artifact` | `REJECT_OUTLINE` | 收回任何 `outline_doc` 产物，或快照差异中 `大纲/` 前缀出现新增/修改 → 候选 `gated` |
| `require_outline_mix` | `KIND_COUNT_BELOW_MIN` | `outline_doc` 产物中「第 N 章」可解析与不可解析各 ≥1（至少一份细纲 + 一份总纲/卷纲），否则候选 `failed` |

kind 份数不足：`KIND_COUNT_BELOW_MIN`，候选一律 `failed`（产物缺失，非质量门），不入库。`rewrite` 类「文件相对快照未变化」仍视为 `OUTPUT_MISSING`。

oh-story 审稿的 `reject_solo_fallback` / `require_reviewer_agents` **不是**审稿模板级门，只出现在 full 实例的 `allowed_gates` 里。

**mount：** 新增 `user_brief`。投影根写入 `brief.md`（通用名）。模板不规定 `选题决策.md`。oh-story 开书实例的 prompt 引用 `{{user_brief_file}}`。

**`world` 挂载升级（修正内核投影现状）：** 现网 `world` 挂载把全部 worldbuilding 行的 `world_summary` 拼成单文件 `设定/世界观.md`，开书产物（`设定/势力/`、`设定/文风.md`、`设定/世界观/{主题}.md` 等）会在后续写章/审稿投影中坍塌丢失，而 `story-long-write` 的 Phase 4/5 恰按原路径找这些文件。升级为：凡 `raw_payload.kernel_rel_path` 非空的行，按原相对路径回放全文（机制同追踪文档的 `listCommittedTrackingDocPaths`）；无 rel_path 的旧行仍拼进 `设定/世界观.md` 兜底。开书切片必须落地本条。

**glob 命中优先级：** 同一文件命中多条 output glob 时，按实例 `outputs` 数组顺序取第一条计 kind。实例作者据此把窄 glob（如 `character_sheet` 的 `设定/角色/*.md`）排在宽 glob（如 `world_doc` 的 `设定/**/*.md`）之前。

**prompt 变量：** 在内核 7.3 清单增加 `user_brief_file`。`subject_type=project` 时 `chapter_no` / `chapter_pad` / `chapter_title` / `previous_chapter_file` / `report_path` / `review_path` 渲染为空串，合同仍不得使用未登记变量。

## 逐条模板

### `open_book`

- 主体 `project`；capability `outline`。
- 必收：`world_doc` ≥1，`character_sheet` ≥1，`outline_doc` ≥2（至少一份总纲/卷纲 + 一份章细纲）。不要求 10 章——那是 oh-story 实例 prompt。
- 禁收为必收：`chapter_text`、`review_report`。
- 允许领域：`worldbuilding`、`characters`、`outlines`。禁止：`chapters`、`reviews`（空章行由网关在采纳时创建，不是 Codex 必收产物）。
- 模板门：`reject_chapter_text_artifact`、`require_outline_mix`。
- mention：`required`。提交：`manual`。
- 预检：项目已存在；`user_brief` 必填（32KiB 上限），否则 400 `BRIEF_REQUIRED`。账本已有总纲+角色时仍可跑，必须手动采纳。
- 运行时若 skill 写了正文：无论是否在 `write_scope` 内，`正文/` 前缀的快照差异都由 `reject_chapter_text_artifact` 判 gated（前缀语义，见门表），不再依赖「恰好被收成 `chapter_text`」。

### `expand_outline`

- 主体 `project`；capability `outline`。
- 必收：`outline_doc` ≥1 且相对快照有新增或修改。可选 `world_doc`、`character_sheet`。
- 禁止 `outlines.replace`、写 `chapters`、把 `chapter_text` 当必收。
- 模板门：`reject_chapter_text_artifact`。提交：`manual`。
- 预检：账本已有至少一份大纲，否则 400 `FOUNDATION_PRECONDITION`。

### `write_chapter`

- 主体 `chapter`；capability `rewrite`。
- 必收：本章 `chapter_text` ×1，相对快照有变化。可选 `tracking_doc`。
- 模板门：`require_chapter_file`（收回后本章文件须存在且非空；「章行存在、正文可空」是预检与工作台职责，不是本门语义）、`reject_outline_artifact`（写章不得改 `大纲/`，把「不得偷跑开书」升为结构门）。
- mention：`required`。提交：`auto_if_single`。
- 预检：无章行 → 400 `CHAPTER_NOT_FOUND`。已有正文 → 400 `CHAPTER_HAS_PROSE`（`has_prose` = `trim(chapter_text)` 非空 **且** 不含占位串 `【占位正文】`；占位稿与全空白不算正文）。该章细纲已在账本，否则 400 `OUTLINE_MISSING`。细纲匹配（任一即可）：章行 `outline_id` 属于本项目 `outlines`；某份大纲 `raw_payload.chapter_no` 等于该章 `chapter_no`；`parseChapterNoFromRelPath(kernel_rel_path)` **只传路径**得到同一章号。**不要**用标题正则 / `outlineChapterNo`（总纲标题含「第 N 章」会误过）。不得在写章动词里偷跑开书。
- 工作台发任务前保证章行存在。一次任务只收当前章那一条 `chapter_text`。

### `write_continue`

- 主体 `project`；capability `rewrite`。工作台「更多 · 续写」；「写下一章」仍只跳章。空章界面不出现该按钮（用「生成正文」）。
- `verb_params`：`{ "from_chapter_no": number, "count": number }`。窗口 `from_chapter_no` … `from_chapter_no + count - 1`。`count` 默认 2，上限 3。
- 必收：收获后必须刚好 `count` 份窗口内非空 `chapter_text`（每条相对快照有变化）。
- mention：`required`。提交：`auto_if_single`。
- 预检：`from_chapter_no` / `count` 非法 → 400 `VERB_PARAMS_INVALID`。窗口缺章行 → 400 `CHAPTER_NOT_FOUND`。窗口章已有正文 → 400 `CHAPTER_HAS_PROSE`（口径与写章相同）。窗口章无匹配细纲 → 400 `OUTLINE_MISSING`（匹配规则与写章相同）。
- commit 按路径解析章号 → `listNovelChapters` 对齐该 `chapter_no` → `updateNovelChapter(row.id)`；禁止把 `job.subject_id` 当 chapter id。

### `review_chapter`

- 主体 `chapter`；capability `review`。
- 必收：`review_report` ×1。可选 `tracking_doc`。
- 允许领域：`reviews`。禁止写 `chapters`。
- 模板门：`require_chapter_file`、`reject_chapter_text_artifact`（前缀语义下即「审稿改了投影正文就 gated」——「不得改正文」从提示词约定升为结构门）。
- `allowed_gates` 另含 `reject_solo_fallback`、`require_reviewer_agents`（oh-story full 必须带；其它审稿包可不带）。
- mention：`required`。提交：`auto_if_single`（与现网一致）。

### `apply_review`

- 主体 `chapter`；capability `rewrite`。
- 必收：`chapter_text`（必须变化）。
- 模板门：`require_chapter_file`、`require_matching_review`、`paragraph_retention_70`。70% 原句保留是本动词定义，不是 oh-story 专属门。
- mention：`optional`（允许空）。提交：`auto_if_single`。

### `rewrite_chapter`

- 主体 `chapter`；capability `rewrite`。
- 必收：本章 `chapter_text` ×1，相对快照有变化。可选 `tracking_doc`。
- 模板门：`require_chapter_file`、`reject_outline_artifact`（回炉不得改 `大纲/`）。
- mention：`required`。提交：`manual`。不得与 `apply_review` 并跑（动词不同）。
- **没有** `paragraph_retention_70`、**没有** `require_matching_review`。
- 预检：无章行 → 400 `CHAPTER_NOT_FOUND`。无正文 → 400 `CHAPTER_NO_PROSE`（空 / 空白 / `【占位正文】` 都算无正文，口径与写章 `has_prose` 相同）。**不**做 `OUTLINE_MISSING`。
- 工作台：有正文时作者入口走本动词；job `awaiting_selection` 后写作区预览采纳。一次任务只收当前章那一条 `chapter_text`。

### `deslop_chapter`

- 主体 `chapter`；capability `rewrite`。
- 必收：`chapter_text`（必须变化）。禁止领域：`outlines`、`reviews`。
- 模板门：`require_chapter_file`、`reject_outline_artifact`。
- mention：`required`。提交：`auto_if_single`。不要求已审稿。

### `adapt_pack`

- 主体 `pack`：`subject_type=pack`，`project_id` 允许 0，`subject_key=pack_id`（现 `subject_id` 为整数，不够用，job 表增 `subject_key TEXT`）。
- 必收：`contract_json` ≥1。mention：`optional`。提交：永远 `manual`。
- 预检：pack 已锁定 revision。

`manual_create` 无模板。

## 与现网合同

| 现网 / 新产品 | 动词 | 第一份实例 |
|---|---|---|
| oh-story 审稿 | `review_chapter` | `oh-story-core.story-review.full`（继续带四审两门） |
| 按建议改稿 | `apply_review` | `oh-story-core.story-apply.surgical` |
| oh-story 去AI | `deslop_chapter` | `oh-story-core.story-deslop.file` |
| 深度孵化 | `open_book` | `oh-story-core.story-long-write.open`（新建；prompt 走开书，停在细纲） |
| 扩纲 | `expand_outline` | `oh-story-core.story-long-write.expand`（无工作台按钮；`outlines.upsert`） |
| 写章 | `write_chapter` | `oh-story-core.story-long-write.chapter`（作者入口；`auto_if_single`） |
| 回炉 | `rewrite_chapter` | `oh-story-core.story-long-write.rewrite`（作者入口；`manual`） |
| 续写 | `write_continue` | `oh-story-core.story-long-write.continue`（作者「更多 · 续写」；`auto_if_single`） |

已有内置 `oh-story-core.story-long-write.outline` 保持 `implemented=false`，**不**当开书合同，也**不**当扩纲合同。扩纲用 `*.expand`，本文件不混用。

旧路由已由 D 补丁下线为 410（短 spec 第 3 节）；三动词入口为 `POST /api/kernel/jobs`，verb 见上表。

无 `verb` 字段的内置 id 推断：

| contract_id | verb |
|---|---|
| `oh-story-core.story-review.full` | `review_chapter` |
| `oh-story-core.story-deslop.file` | `deslop_chapter` |
| `oh-story-core.story-apply.surgical` | `apply_review` |
| `oh-story-core.story-long-write.open` | `open_book` |
| `oh-story-core.story-long-write.expand` | `expand_outline` |
| `oh-story-core.story-long-write.chapter` | `write_chapter` |
| `oh-story-core.story-long-write.rewrite` | `rewrite_chapter` |
| `oh-story-core.story-long-write.continue` | `write_continue` |

## Job API 与数据流

```http
POST /api/kernel/jobs
```

```json
{
  "verb": "open_book",
  "project_id": 12,
  "subject_type": "project",
  "subject_id": 12,
  "model_id": 304,
  "user_brief": {
    "title": "",
    "genre": "",
    "idea": "",
    "length_target": "",
    "constraints": ""
  },
  "contract_ids": []
}
```

规则：

- `verb` 必填（新 API）。只给动词：用 `verb_defaults[verb]`（字符串数组，1..8）解析实例。
- 同时给 `contract_ids`：每份实例的 `verb` 必须相同，否则 400 `VERB_MIXED`。不再用 `CAPABILITY_MIXED` 作为并跑主键；若合同缺 verb 且无法推断，400 `CONTRACT_INVALID`。
- `user_brief` 写入 job 元数据，上限 32KiB。prompt 只引用 `{{user_brief_file}}`，禁止把创意正文嵌进 turn。
- `subject_type=project` 时 `subject_id` 必须等于 `project_id`。
- 并发判重分粒度：`subject_type=project` / `pack` 的动词按 `project_id` + `verb` 只允许一个非终态 job（`queued` / `running` / `awaiting_selection`）；章级动词按 `project_id` + `verb` + `subject_id` 判重，不同章可并行。违反 → 409 `PROJECT_JOB_RUNNING`。
- 运行时不可用：503 `KERNEL_RUNTIME_UNAVAILABLE`，禁止回退 derive-stream / `executeAgent`。
- 开书与其它 `commit.mode=manual` 的动词：HTTP **202 + 轮询** `GET /api/kernel/jobs/:id`（及现有 progress）。禁止像现网审稿按钮那样把向导请求阻塞到 Codex 结束。
- 旧三按钮路由已 410 `ROUTE_REMOVED`（D 补丁）；全部流量走 `POST /api/kernel/jobs` 异步轮询。

`kernel_jobs` 增列：`verb TEXT NOT NULL DEFAULT ''`（SQLite 增列限制要求带默认；旧行按合同 id 回填，回填后 `''` 视为非法）、`verb_params TEXT`（JSON，默认 `{}`）、`subject_key TEXT`（默认 `''`）、`brief_json TEXT`（开书创意；可为空）。

状态机沿用内核 spec。`open_book` 唯一候选 succeeded 后因 `manual` 进入 `awaiting_selection`，**不会**自动 commit。

取消、孤儿回收沿用现网：打断所有会话、清每个候选的 `project/` 与 `codex-home/`、保留 `events.jsonl`、不写领域表。空项目不自动删除。取消已入库的 job 仍 409 `JOB_ALREADY_COMMITTED`。

`awaiting_selection` 后同样清投影目录。预览只读 vault 中的 `kernel_artifacts`，不依赖活投影。

## 投影（project 主体）

`projectKernelSubject` 在 `subject_type=project` 时：

- **不得**要求章行存在，不得调用「缺章即抛」的 `getNovelChapter`。
- `user_brief` mount：写 `brief.md`（由 `brief_json` 渲染为 Markdown：标题、题材、创意、体量、约束）。
- 若合同仍列出 `current_chapter` / `previous_chapter` / `review_report`：开书内置合同不得列出；校验阶段对 `open_book` 实例拒绝这些 mount。
- 账本已有设定/大纲则按现规则挂 `world` / `characters` / `outline`；空项目不写假的 `大纲/第001章.md`。
- `skill_tree`（及可选 `agents`）与章级 job 相同。

开书内置实例建议 mounts：`user_brief`、`skill_tree`、`agents`。`write_scope`：`设定/`、`大纲/`（可选加 `追踪/`，保留开书初始化的追踪骨架）。`ignore` 可含 `.story-review/`。不要把 `正文/` 放进 `write_scope`——且无论如何，`正文/` 差异会被 `reject_chapter_text_artifact` 判 gated。

## 深度孵化向导

1. 创建方式只渲染 `manual` 与 `deep_draft`（文案仍为「手动开书」「深度孵化」）。删除 `quick_ai` 选项、类型与相关自动创建控件——该选项在前端创建向导，服务端无此字面；seed API 保留但 `deep_draft` 路径不得调用。
2. 深度孵化收集现有题材/输入字段，组装 `user_brief`，不进入 seed 审阅、fill-gaps、foundation 分数、finalize 链。
3. 用户提交：`POST` 建空项目（与手动开书同一建项 API，写入书名/题材等表单字段）→ `POST /api/kernel/jobs`（`verb=open_book`）→ 向导进入进度。
4. 轮询至 `awaiting_selection`：列出 vault 中 world/character/outline 文件名与正文（折叠）。只读。
5. **采纳**：`POST /api/kernel/jobs/:id/commit`（或现有 selection commit）指定 succeeded 候选。成功后跳转该项目工作台。
6. **丢弃 / 取消**：不入库。空项目保留；向导可提供删除项目（现有删除 API），本 spec 不自动删。
7. 失败：展示 `error_code`；可对同一空项目重跑（新 job）。不得调用 project-seed derive。

手动开书向导步骤保持现网表单建项，不创建 kernel job。

## 开书内置实例

`oh-story-core.story-long-write.open`：

- `verb`: `open_book`
- `mention`: `$story-long-write`
- prompt 必须显式走 **开书** 场景（「帮我开书」），执行 Phase 1→3，**默认停在细纲，禁止写正文**。引用 `{{user_brief_file}}`。禁止裸调用 `$story-long-write`（裸调用只会诊断、不写开书产物）。
- outputs 示例（路径是实例方言，不是模板；顺序即 glob 命中优先级，窄在前宽在后）：
  - `character_sheet`：`设定/角色/*.md`（排最前，避免被宽 glob 抢先计成 world_doc）
  - `outline_doc`：`大纲/**/*.md`
  - `world_doc`：`设定/**/*.md`（宽 glob 兜住 `世界观.md`、`世界观/{主题}.md`、`题材定位.md`、`关系.md`、`势力/`、`文风.md` 等全部非角色设定，配合 world 回放挂载保真到后续 job）
  - `tracking_doc`（可选，binding `kernel_only`）：`追踪/**/*.md`——开书若初始化追踪骨架则收存保留
- `implemented: true`（基板 + 收存适配落地后）。在适配器未落地前不得把该 id 标成可执行。

## `adapt_pack` 运行时

只在安装或更换 pack 时创建任务。

1. 投影：该 pack 的 `SKILL.md` 与 references，以及仓库内全部动词模板 JSON。
2. 元合同（工作台、mention 可空）要求 Codex 写出 `contracts/*.json`。
3. 收回 `contract_json`。每一份走合同 schema + 实例对模板校验。
4. 合法者进 vault；非法者当 `attachment` 并记警告。一份都不合法 → `ADAPT_NO_VALID_CONTRACT`。
5. 人采纳后写入 `kernel/contracts/`，**不**修改 `verb_defaults`。用户为某动词指定默认后，按钮才走新实例。

日常 `open_book` / 审稿不得触发适配。

## 错误码

同步 400/409/503（创建任务或预检）：

| 码 | HTTP | 何时 |
|---|---|---|
| `VERB_UNKNOWN` | 400 | 动词不在登记表 |
| `VERB_DEFAULT_MISSING` | 400 | 未给 `contract_ids` 且该动词无默认实例 |
| `VERB_MIXED` | 400 | 并跑跨动词 |
| `TEMPLATE_UNSATISFIED` | 400 | 实例不满足模板 |
| `SUBJECT_TYPE_MISMATCH` | 400 | 例如开书却传 `chapter` |
| `BRIEF_REQUIRED` | 400 | 开书缺 `user_brief` |
| `PROJECT_JOB_RUNNING` | 409 | 同项目同动词未结束（章级动词再按 `subject_id` 细分，见 Job API） |
| `VERB_PARAMS_INVALID` | 400 | 续写 `from_chapter_no` / `count` 非法 |
| `OUTLINE_MISSING` | 400 | 写章时无该章细纲；续写窗口缺匹配细纲 |
| `CHAPTER_HAS_PROSE` | 400 | 写章时本章已有正文（`【占位正文】` 不算）；续写窗口章已有正文 |
| `CHAPTER_NO_PROSE` | 400 | 回炉时本章没有可覆盖的正文（空 / 空白 / `【占位正文】`） |
| `CHAPTER_NOT_FOUND` | 400 | 写章/回炉时 `subject_id` 不是本项目章行；续写窗口缺章行 |
| `FOUNDATION_PRECONDITION` | 400 | 扩纲时还没有大纲 |
| `KERNEL_RUNTIME_UNAVAILABLE` | 503 | 同内核 spec |
| `CONTRACT_NOT_IMPLEMENTED` | 400 | 同内核 spec |

候选/任务终态（写入 job/candidate `error_code`）：

| 码 | 何时 |
|---|---|
| `REJECT_CHAPTER_TEXT` | 开书/扩纲/审稿收回了正文 |
| `REJECT_OUTLINE` | 去AI 收回了大纲 |
| `KIND_COUNT_BELOW_MIN` | 某必收 kind 份数不足，或 `require_outline_mix` 不满足 |
| `ADAPT_NO_VALID_CONTRACT` | 适配没有一份合法实例 |
| `CANCELLED` / `ENGINE_FAILED` / `OUTPUT_MISSING` / `SKILL_NOT_FOUND` 等 | 同内核 spec |

门失败：候选 `gated`；若无 succeeded 候选，job `failed`，不入库。

## 测试

### 基板（不接 Codex）

- 模板/实例校验矩阵：缺 kind、把 `chapter_text` 标必收、mention 策略、`outlines.replace` 在扩纲、跨动词并跑。
- `subject_type=project` 投影：无章行不抛；写出 `brief.md`；开书合同列出 `current_chapter` 则登记失败。
- 假收存：三 kind 份数足够 → 可 succeeded；`正文/` 前缀差异（含 write_scope 外）→ `REJECT_CHAPTER_TEXT`；两份细纲、零总纲 → `KIND_COUNT_BELOW_MIN`。
- commit：多份 character/outline 全部 upsert；解析章号建空章行；二次 commit 409。
- world 回放：commit 后重新投影，`设定/势力/`、`设定/世界观/{主题}.md` 按 `kernel_rel_path` 原路径出现；无 rel_path 旧行仍拼入 `设定/世界观.md`。
- 并发判重：同项目两个章级 job（不同 `subject_id`）可并行；同 `subject_id` 第二个 → `PROJECT_JOB_RUNNING`。
- 取消 / 孤儿：领域表无设定/大纲/正文；空项目仍在。

### 开书产品

- 向导无 `quick_ai`；`deep_draft` 源码与测试不得调用 `/novel/project-seed/derive-stream`。
- 创建任务缺 brief → `BRIEF_REQUIRED`；内核不可用 → 503，无 seed 回退。
- 真机：模型为内核 304 路径；空项目开书停在细纲；vault 无 `正文/` 必收；采纳后工作台能看到世界观、角色、大纲、空章列表。

### 收编现网

- 审稿/改稿/去AI 行为与现网测试保持一致，请求带上 `verb`。

写章测试见 `2026-08-19-write-chapter-runtime.md`。回炉测试见 `2026-08-19-rewrite-chapter-runtime.md`。续写测试见 `2026-08-20-write-continue-runtime.md`。适配的测试在各自实现计划里写，不挤进开书验收。扩纲测试见 `2026-08-18-expand-outline-runtime.md`。

## 非目标

- 不改 Codex 源码。
- 不把画布切进内核。
- 不把旧写作 skill 市场（提示词编译器）升成内核合同。
- 扩纲运行时已按 `docs/superpowers/plans/2026-08-18-expand-outline-runtime.md` 落地；写章运行时已按 `docs/superpowers/plans/2026-08-19-write-chapter-runtime.md` 落地（作者入口；不替换 `generateChapterForGroup`）。回炉运行时已按 `docs/superpowers/plans/2026-08-19-rewrite-chapter-runtime.md` 落地（作者入口）。续写运行时已按 `docs/superpowers/plans/2026-08-20-write-continue-runtime.md` 落地（作者「更多 · 续写」）。`adapt_pack` 仍未做（规范位保留）。
- 不复活 project-seed JSON 作为深度孵化的产品真相。
- 不在采纳前提供编辑 vault 再提交。
- 不因取消/失败自动删除空项目。
- 不把 `$story-setup` 当成开书动词（那是 agents 部署，沿用内核投影）。
- 不实现内核 spec 里仍标明另开的 canvas prompt 合同。

## 实现分期

本文件是平台规范。编码不得一次做完所有动词。

| 片 | 做什么 | 验收 |
|---|---|---|
| **1 基板** | 动词/模板登记、实例 `verb` 校验、`subject_type=project`、`user_brief`、新 kind 与 upsert、新门、job 存 verb、选优按动词、project 投影 | 上节「基板」测试全绿，不接真 Codex |
| **2 开书产品** | 内置 `oh-story-core.story-long-write.open`；向导去掉 AI 快速；深度孵化 job + 轮询 + 只读预览 + 采纳；关掉该模式的 derive-stream | 上节「开书产品」+ 真机 |
| **3 收编现网** | 三按钮标动词；旧路由补 verb | 现网三按钮行为不变（该验收在 D 补丁前有效；此后三按钮走 kernel jobs 路径，旧路由 410） |
| 4+ | 扩纲已落地（`docs/superpowers/plans/2026-08-18-expand-outline-runtime.md`）→ 写章运行时已落地（`2026-08-19-write-chapter-runtime`，作者入口；不替换 `generateChapterForGroup`）→ 回炉运行时已落地（本计划 `2026-08-19-rewrite-chapter-runtime`，作者入口）→ 续写运行时已落地（`2026-08-20-write-continue-runtime`，作者「更多 · 续写」）→ 适配仍未做；`generateChapterForGroup` 仍另开 | 扩纲、写章、回炉、续写按各计划验收（已过）；适配仍另开；其余各自动独立计划 |

## 与旧文档的关系

- **扩展** `2026-08-15-codex-kernel-vault-design.md`（**v1.6** 已收回开书+扩纲+写章+回炉+续写落地状态）。内核 spec 画布不切、不改 Codex、领域表为真相，全部保留。
- **覆盖** 内核 spec 分期第 6 条「outline 另开」中的开书部分：本文件即该另开 spec。扩纲、写章、回炉、续写运行时已落地。
- **废止** 深度孵化作为产品路径时对 `project-seed/derive-stream` 的依赖。seed API 可暂留，向导 `deep_draft` 不得调用。
- **不替代** oh-story 三按钮的内核桥接与 70% 改稿门、solo 门。
- **不替代** `2026-08-14-writing-skill-marketplace-design.md`（那是提示词包，不是内核合同）。

## 风险

- `$story-long-write` 裸调用不会开书。内置 prompt 必须带开书意图，测试锁定 prompt 含「帮我开书」或等价触发语，且含「不要写正文」。
- 开书耗时长。向导必须异步轮询；取消必须能打断 Codex。不得把 15–20 分钟绑在一条 HTTP 上。
- 多文件 upsert 若按姓名/路径匹配错误会合并角色。匹配键优先 `kernel_rel_path`，姓名只作首次插入。
- 空章行让工作台「有章可写」；UI 不得把空正文展示成已写完。`has_prose` 已有字段，开书后应为 false。
- 模板写太像 oh-story 会杀死后换包。评审本 spec 时以「换一个目录名不同的开书 skill，是否只加实例、不改模板」为准则。
