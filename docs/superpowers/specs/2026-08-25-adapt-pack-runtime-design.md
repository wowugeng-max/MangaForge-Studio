# 适配运行时（adapt_pack）

日期：2026-08-25  
状态：已落地  
对照：

- `2026-08-16-novel-workbench-verb-contracts-design.md` v1.6 `adapt_pack` 节（本文件是其实现 spec）
- `2026-08-15-codex-kernel-vault-design.md` v1.7 排期 C（续写、适配已落地；扩纲按钮 / batch 仍未做）
- 写作 skill 市场：`2026-08-14-writing-skill-marketplace-design.md`（提示词编译器；本片只把它当适配**输入**，不改安装器）

**Goal：** 作者在项目设置里选定一份**已安装的写作 skill** 和内核模型 → 一次 pack 级 Codex 任务按现有动词模板生成合同 → 填得满的入库，填不满的给出网关校验说明 → 人预览后采纳。采纳**不**改 `verb_defaults`。作者另用选择器指定「这个动词现在跑哪份合同」，以便对比 skill 真实效果。扩纲按钮、batch、画布不在本片。

## 产品决定（已拍板）

1. 作者入口在**项目设置**「内核合同」，不是写作区、不是质检面板、不是 GitHub 安装按钮。独立轮询，不并进写章/回炉/续写 hook。
2. 适配对象是已安装的**写作 skill**（`.mangaforge/writing-skill-packs/{id}/`），一次只跑一份。排除：内置写作 skill（`fiction-humanizer-zh`、`remove-ai-flavor`、`humanizer-zh`）、`oh-story-core`。oh-story 内置合同仍手写，不走适配。
3. 人不填 glob、门、prompt。选 skill + 当前内核模型即可。创建任务**不传** `contract_ids`，走 `verb_defaults.adapt_pack` → 元合同。Codex 对照仓库里**全部**动词模板 JSON 写合同。
4. 填满模板 → 可采纳的 `contract_json`。填不满 → 不当合同，预览展示**哪条动词、哪条字段/门失败**（以网关校验为准，不靠模型自觉）。
5. ≥1 份合法 → `awaiting_selection`，设置里预览合法列表 + 非法说明，「采纳」只写入合法份。零份合法 → 任务/候选终态 `failed` + `ADAPT_NO_VALID_CONTRACT`，说明仍可见，**无采纳按钮**。
6. `commit.mode=manual`。丢弃只 cancel。
7. 采纳**不**改 `verb_defaults`。默认绑定另由人在同一设置块里按动词选择。没适配上的动词没有新选项。选择器**不展示** `adapt_pack`（该默认锁死元合同）。
8. 安装写作 skill **不**自动适配。
9. 不把 `adapt_pack` 塞进 `KernelJobAction`。不并进写章/回炉/续写 hook。不改「写下一章」。
10. 超时默认 idle 10min / hard 45min。模型用请求 `model_id`（现网 304），不写死 302。

## 合同

内置元合同 id：`mangaforge.adapt-pack.meta`（符合 `pack_id.skill_name.variant`）。`implemented=true`。加入 `IMPLEMENTED_VERBS`（`adapt_pack`）与 `BUILTIN_DEFAULTS.adapt_pack = ['mangaforge.adapt-pack.meta']`。已有工作区的 `verb-defaults.json` 若缺该键，`loadVerbDefaults` 按现逻辑用内置补上。

这是**工作台**合同，不是 oh-story：`mention` 空串（模板 `mention_policy=optional`）。不要改 `.open/.expand/.chapter/.rewrite/.continue` 或 `.outline`。

模板 `adapt_pack.json` 已存在：`subject_type=pack`，`capability=attachment`，`required_kinds.contract_json min=1`，`commit_mode=manual`，禁写领域表。本片**不改**这些最低交付。零合法时的终态码见「收获」：拦截 `KIND_COUNT_BELOW_MIN`，改记 `ADAPT_NO_VALID_CONTRACT`，不是把模板 min 改成 0。

`KERNEL_MOUNTS` 增列 `adapt_skill`、`verb_templates`。这两项**不是**章级挂载：`CHAPTER_MOUNTS` / `CHAPTER_LEVEL_MOUNTS` 仍只含 `current_chapter` / `previous_chapter` / `review_report`。不要复用 `deployKernelPackMounts`（那是 oh-story 的 `skill_tree` / `agents`）。

锁定字段：

```ts
{
  schema_version: 1,
  id: 'mangaforge.adapt-pack.meta',
  pack_id: 'mangaforge',
  skill_name: 'adapt-pack',
  variant: 'meta',
  verb: 'adapt_pack',
  capability: 'attachment',
  label: '适配合同',
  invoke: {
    mention: '',
    prompt: [
      '根据 skill/SKILL.md 与 skill/references/（若有）为工作台动词生成合同实例。',
      '动词模板在 templates/ 下，每个文件是一条动词的最低交付，不要改模板本身。',
      '对每一条模板：若该 skill 能填满，写出 contracts/{verb}.json（须符合模板与合同 schema）。',
      '若填不满：不要编造假合同；可以写 contracts/_notes/{verb}.md 说明缺什么，但仍以网关校验为准。',
      '不要写 正文/、大纲/、设定/、审稿/。不要覆盖 templates/。',
      '不要把合同只写在回复里，必须写回 contracts/ 文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['adapt_skill', 'verb_templates'],
  },
  outputs: [
    { artifact_kind: 'contract_json', glob: 'contracts/*.json', binding: 'kernel_only', required: true },
    { artifact_kind: 'attachment', glob: 'contracts/_notes/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['contracts/'],
  ignore: ['templates/', 'skill/'],
  gates: ['write_outside_scope'],
  commit: { mode: 'manual', domain_writes: [], source: 'adapt_pack' },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

`contracts/*.json` 只收 `contracts/` **下一层** json，不得收 `_notes/`。不要 `{{chapter_pad}}`。不加 70% / spawn / 审稿匹配 / `reject_chapter_text_artifact`。`commit.domain_writes` 保持 `[]`（账本审计行 `kernel_commits.domain_table=kernel_contracts` 不是合同字段）。

不要新增 `KERNEL_PROMPT_VARIABLES`。固定路径：`skill/SKILL.md`、`templates/{verb}.json`、`contracts/{verb}.json`。

现有 `run-job.test` 用 `adapt_pack` 探 `VERB_DEFAULT_MISSING`。落地后该动词有默认元合同：把探针改成「清空该动词默认」的夹具，或对无默认的假 id，**不要**再依赖 `adapt_pack` 缺默认。

## 预检（进 Codex 之前）

`validateCreateKernelJob` 在 `verb === 'adapt_pack'` 时（创建 body 增加可选 `subject_key`；返回的 `subjectType` 含 `'pack'`）：

1. `subject_type` 必须是 `pack`，否则 400 `SUBJECT_TYPE_MISMATCH`。
2. `subject_id` 必须是 `0`，否则 400 `SUBJECT_TYPE_MISMATCH`（pack 身份在 `subject_key`）。
3. `project_id` 必须是当前打开的项目（整数 >0，且账本里有该项目）。动词 spec v1.6 起必须 >0（旧稿曾允许 0）。`project_id<=0` 或项目不存在 → 400 `CONTRACT_INVALID`。job 行挂这个项目；合同目录仍是工作区级。
4. `verb_params.skill_id` 与 `subject_key` 都必须是非空字符串、彼此相同，且匹配 `^[a-z0-9][a-z0-9-]{0,63}$`，否则 400 `VERB_PARAMS_INVALID`。
5. 目标 skill（查 `listInstalledWritingSkillPacks` / 盘上 `.mangaforge/writing-skill-packs/{id}/`）：
   - id 属于内置写作 skill 三件套，或 id 为 `oh-story-core` → 400 `ADAPT_TARGET_INVALID`。
   - 未安装、目录无效、或没有常规文件 `SKILL.md` → 400 `SKILL_NOT_FOUND`。
   - 用安装器已落盘的 `pack.json.revision` 与目录内容，**不再次 clone**。没有 revision 字段但 `SKILL.md` 存在仍可适配（夹具）；不另做「锁定 revision」步骤。
6. 不要求 `user_brief`。创建时不传 `contract_ids`。
7. 占用：全工作区 `verb=adapt_pack` + `subject_key=skill_id` 只能有一个非终态 job（`queued` / `running` / `awaiting_selection`），**不**按 `project_id` 分、**不**按 `subject_id` 分。违反 → 409 `PROJECT_JOB_RUNNING`。不和写章/续写/回炉交叉锁。动词 spec v1.6 已改为同一粒度（旧稿曾写 pack 按 `project_id+verb`）。
8. 去掉现行「`subject_type=pack` → `CONTRACT_NOT_IMPLEMENTED` / 适配第一期不执行」。

`hasActiveKernelJob` 对 pack 增加按 `verb + subject_key`、**不带** `projectId` 的查询。章/项目占用逻辑不变。创建 job 时必须写入 `subject_key`（今天这列总是 `''`，本片补上）。

## 投影与收存

`projectKernelSubject` 必须接收 `subjectType === 'pack'`（不得默认成 `chapter`，否则会因 `subject_id=0` 抛 `CHAPTER_NOT_FOUND`）：

- pack 主体**不得**要求章行，不得挂 `current_chapter` / `previous_chapter` / `review_report` / `continue_window`。列出这些 → 与现网通例一样，实例校验阶段已 `TEMPLATE_UNSATISFIED`；投影再兜底拒绝。
- `adapt_skill`：把 `.mangaforge/writing-skill-packs/{skill_id}/SKILL.md` 与 `references/`（若有）拷到投影 `skill/`。不重新下载。
- `verb_templates`：把仓库 `ui/server/src/kernel/verbs/templates/*.json` 全量拷到投影 `templates/`（含 `adapt_pack.json`）。只读；`ignore` 含 `templates/`，改模板的差异不当产物。
- **不得**部署 oh-story `skill_tree` / `agents`（元合同不列它们）。

收获之后、persist 之前（仿续写 collapse）：

1. 所有命中 `contracts/*.json` 的文件尝试 `JSON.parse` → `validateKernelContract` → `validateInstanceAgainstTemplate`。
2. 通过且 id **不是**内置合同 → `artifact_kind=contract_json`。
3. 失败（含解析失败、schema、模板不满足、id 为内置 → 记 `CONTRACT_BUILTIN`）→ 降为 `attachment`，并把 `{ rel_path, verb, errors: string[] }` 写入候选 `metadata.adapt_unsatisfied`。`verb` 优先取 JSON 的 `verb` 字段，否则取文件名（无 `.json` 后缀）。设置预览只读这个列表。模型写的 `_notes` 仅作附件，**不能**代替网关错误。
4. 折叠后 `contract_json` 份数为 0：候选与 job 进入 `failed`，`error_code=ADAPT_NO_VALID_CONTRACT`。**不得**落成 `KIND_COUNT_BELOW_MIN`。非法附件仍保留。若连一层 json 都没有，`adapt_unsatisfied` 至少一条 `{ rel_path: 'contracts/', verb: '', errors: ['未写出 contracts/*.json'] }`。
5. 折叠后 ≥1 份合法：走既有 `kind_count`（此时满足 min=1）与 `write_outside_scope`。成功则因 `manual` 进入 `awaiting_selection`。非法附件不挡进入预览，也不入库。
6. 改了 `正文/` 或 `大纲/` 前缀 → 既有禁写门；不要另做 70% 门。

Commit（`POST .../commit`，manual）：

- 仅当 job 为 `awaiting_selection`（零合法失败任务没有采纳）。
- 对每份仍为 `contract_json` 的产物读 vault 文本 → `saveUserKernelContract`。
- 成功写入 `kernel/contracts/{id}.json`。同 id **用户**合同覆盖。内置 id 仍 400 `CONTRACT_BUILTIN`（收获已挡则属内部错误 → 500）。
- **禁止**调用 `saveVerbDefaults`。
- **禁止**写 `chapters` / `outlines` / `worldbuilding` / `characters` / `reviews`。
- `kernel_commits` 记 `domain_table=kernel_contracts`，`domain_row_id=0`（无整数行号），避免空 commit 列表让 UI 以为没发生。
- 二次 commit 仍 409 `JOB_ALREADY_COMMITTED`。

同一 skill 可再跑适配。新一次采纳覆盖用户合同；未点选择器则按钮仍走旧默认。

## 工作台

`ProjectSettingsModal` 增加「内核合同」块，和「从 GitHub 安装写作 skill」分开。安装成功回调**不得** `POST /kernel/jobs`。

1. **适配哪份 skill**：下拉 = 现有写作 skill 目录 API 里 `builtin === false` 且已安装的项（与 `normalizeWritingSkillCatalog` 同一口径）。没有选项时「适配合同」禁用，说明「先安装非内置写作 skill」。点下去走 `createJobByVerb`：`verb: 'adapt_pack'`，`subjectType: 'pack'`，`subjectId: 0`，`subjectKey: skillId`，`verbParams: { skill_id: skillId }`，`modelId` 为当前内核模型。1s 轮询 `GET /kernel/jobs/:id`。取消走现有 cancel。
2. **重开续看**：设置打开或切换下拉时 `GET /api/kernel/jobs?verb=adapt_pack&subject_key={id}`（本片给现有 list 增加这两个可选查询；不新增专用资源）。命中非终态 → 回到进度或预览，不另开一条。若 list 为空但 POST 仍 409，展示「该 skill 适配未结束」。
3. **预览**：`awaiting_selection` 列出合法合同（id / verb / 标签）和 `adapt_unsatisfied`。「采纳」commit；「丢弃」cancel。成功 toast：写入了 N 份合同，**默认绑定未改**。`ADAPT_NO_VALID_CONTRACT`：只读失败列表，无采纳。
4. **按钮现在用哪份合同**：按**创作动词**列出当前 `verb_defaults[verb]` 与已入库、`resolveContractVerb` 相同且 `implemented` 的合同。覆盖至少：`open_book`、`expand_outline`、`write_chapter`、`write_continue`、`rewrite_chapter`、`review_chapter`、`apply_review`、`deslop_chapter`。**不要**渲染 `adapt_pack` 选择器。人保存才 `PUT /api/kernel/verb-defaults`。

扩展 `createJobByVerb`：`subjectType: 'pack'`、`subjectKey`、pack 时 `subject_id: 0`（`chapterId` 不用）。写章/回炉/续写调用点零改动。设置用独立小 hook（例如 `useAdaptPackJob`），不要塞进 `useChapterWriteJob` / `useChapterRewriteJob` / `useProjectContinueJob`。

不改 `generateCurrentChapterProse`、batch、`accept_chapter_and_continue`、写作 skill 安装器。

## HTTP

- `GET /api/kernel/verb-defaults` → `{ ok: true, defaults }`（`loadVerbDefaults`）。
- `PUT /api/kernel/verb-defaults` body `{ defaults: Record<string, string[]> }`：**整份替换**写入 `verb-defaults.json`（客户端先 GET 再改再 PUT，不是按动词补丁）。校验：每个出现的键是已登记动词；数组长度 1..8；每个 id 能 `loadKernelContracts` 找到、`resolveContractVerb` 与键相同、`implemented === true`。`adapt_pack` 若出现，必须恰好 `['mangaforge.adapt-pack.meta']`。非法 400 `CONTRACT_INVALID`。缺的键下次 `loadVerbDefaults` 用内置补回（现逻辑），不视为删除 oh-story 文件。
- `POST /api/kernel/jobs` body 增加可选 `subject_key`（pack 必填）。现有章/项目任务省略则存 `''`。
- `GET /api/kernel/jobs` 增加可选查询 `verb`、`subject_key`（与现有 `project_id` / `subject_type` 组合）。`subject_id=0` 的 pack 行不得被「`subject_id` 缺省」误伤（现实现 `Number(query.subject_id||0)||undefined` 已经忽略 0）。

## 错误码

| 码 | HTTP / 终态 | 何时 |
|---|---|---|
| `VERB_PARAMS_INVALID` | 400 | `skill_id` 缺失、格式非法、或与 `subject_key` 不一致 |
| `ADAPT_TARGET_INVALID` | 400 | 内置写作 skill 或 `oh-story-core` |
| `SKILL_NOT_FOUND` | 400 | 未安装或没有 `SKILL.md` |
| `SUBJECT_TYPE_MISMATCH` | 400 | 不是 `pack`，或 `subject_id !== 0` |
| `CONTRACT_INVALID` | 400 | `project_id` 无效；或 PUT defaults 非法 |
| `PROJECT_JOB_RUNNING` | 409 | 同 `skill_id` 适配未结束（全工作区） |
| `ADAPT_NO_VALID_CONTRACT` | 终态 | 收获后零份合法 `contract_json`（覆盖 `KIND_COUNT_BELOW_MIN`） |
| `CONTRACT_BUILTIN` | 400（保存时） | 想覆盖内置 id |

沿用：`KERNEL_RUNTIME_UNAVAILABLE`、`CONTRACT_NOT_IMPLEMENTED`（其它未实现合同）、`CANCELLED`、`ENGINE_FAILED`、`OUTPUT_MISSING`、`TEMPLATE_UNSATISFIED`（登记/保存用户合同时）。

## 测试

基板（`cd ui/server && bun test`，不接 Codex）：

- 元合同通过 schema + 对 `adapt_pack` 模板校验；`mention === ''`；`commit.mode === 'manual'`；挂载含 `adapt_skill` / `verb_templates`，不含章级挂载。
- `IMPLEMENTED_VERBS` 含 `adapt_pack`；`.outline` 仍未实现。
- 缺 `skill_id` / 与 `subject_key` 不一致 / 非法 id → `VERB_PARAMS_INVALID`。
- 内置写作 skill、`oh-story-core` → `ADAPT_TARGET_INVALID`。
- 未安装 → `SKILL_NOT_FOUND`。
- `subject_type: project` 或 `subject_id !== 0` → `SUBJECT_TYPE_MISMATCH`。
- 假 runner 写出一份合法 `write_chapter` 用户合同 → job `awaiting_selection`；commit 后盘上有该 json，`verb_defaults.write_chapter` 仍是 oh-story；`kernel_commits` 有 `kernel_contracts`。
- 假 runner 合法 + 非法各一份 → `awaiting_selection`；采纳只写入合法份；`adapt_unsatisfied` 非空。
- 假 runner 只写非法 json 或零文件 → `ADAPT_NO_VALID_CONTRACT`（不是 `KIND_COUNT_BELOW_MIN`），`adapt_unsatisfied` 非空。
- 假 runner 输出内置 id → 不入库。
- 同 `skill_id` 第二个未结束 job（即使 `project_id` 不同）→ 409；不同 skill 可并行。
- `PUT verb-defaults` 把 `write_chapter` 指到用户合同后，`validateCreateKernelJob` 缺 `contract_ids` 时解析到新默认。
- PUT 把 `adapt_pack` 改成别的 id → 400。
- `VERB_DEFAULT_MISSING` 探针不再用「裸 adapt_pack 无默认」。

工作台（`cd ui/web && bun test`）：

- 设置源码含「内核合同」；GitHub 安装路径**不含** `adapt_pack` / `/kernel/jobs`。
- 下拉不含内置 skill。
- `createJobByVerb` pack 路径带 `subject_key` 与 `subject_id: 0`。
- 采纳 toast / 默认选择器与适配按钮不是同一提交；选择器列表不含 `adapt_pack`。

真机（模型 **304**，`127.0.0.1:8788`）：

- 用一份已装非内置写作 skill 跑适配。
- 要么 `committed` 且 `kernel/contracts/` 多了用户合同、`verb-defaults.json` 未因采纳改变；要么 `ADAPT_NO_VALID_CONTRACT` 且设置里能看见失败句。
- 未改选择器时，写章/审稿仍走 oh-story 默认。改选择器后，新的写章 job 解析到用户合同。

## 非目标

- 扩纲工作台按钮（下一片独立 spec）。
- 安装写作 skill 时自动适配。
- `generateChapterForGroup` / batch / 410 generate-prose。
- 画布 `prompt` 合同、画布「安装 Skill Pack」。
- 改 Codex 源码。
- 自动并跑多 skill、自动选优默认合同。
- 给只有细纲没有章行自动插行。
- 把适配并进质检 `KernelJobAction`。
- 无项目（`project_id=0`）适配。

## 与旧文档

- **实现** 动词规范 `adapt_pack`：元合同、pack 主体、`subject_key`、收获校验、manual 采纳、设置入口、人工 `verb_defaults`。
- **收窄触发点**：「只在装包/换包时跑」→ 本片是设置里人点「适配合同」，不是安装器副作用。输入是已装写作 skill，不是另开 `kernel/packs/` 目录。
- **收窄 project_id**：动词 spec v1.6 起必须 >0（旧稿曾允许 0）。
- **占用粒度**：动词 spec v1.6 起 pack 按全工作区 `verb+subject_key`（旧稿曾写 `project_id+verb`）。
- **不覆盖** oh-story 手写内置合同。
- **不替代** 写作 skill 市场的提示词编译路径；适配成功只多一条内核合同，去AI味开关仍走市场。
- 动词 spec 分期 4+、内核 spec 排期 C：适配已落地；扩纲按钮仍未做。
