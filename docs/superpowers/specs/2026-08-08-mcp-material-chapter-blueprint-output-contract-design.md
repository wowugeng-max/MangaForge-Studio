# MCP 材料章节蓝图精确输出合同设计

日期：2026-08-08
状态：方案 A 已确认，待书面规格复核
范围：通用 MCP `material_repair` 任务提示词合同

## 背景与真实证据

根对象闭合恢复和根级材料分区提升通过自动化测试及两阶段代码审查后，从页面只触发了一次真实材料补齐。新任务使用 MCP 唯一源和独立远端 Session，阶段 artifact 成功，隔离数量保持为零，但完整任务最终失败，小说材料保持零写入。

任务级错误为：

```text
material repair did not satisfy: source_readiness_chapter_blueprint
```

对本次 artifact 进行只读检查后确认：

- 根级 `chapter_patch`、`worldbuilding`、`characters`、`settings`、`chapter_setting_usage` 等分区已经正确；
- `chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness` 含有 `chapter_blueprint: ready` 和具体 evidence；
- `chapter_patch.raw_payload.chapter_blueprint` 含有完整的章节设计语义；
- 远端使用了 `five_part_summary`、`multi_line_progression`、`character_appearance_order`、`event_function_tags`、`cost_benefit` 等非标准字段；
- 生产就绪检查只承认标准字段 `content_outline`、`plot_lines`、`character_order`、`beat_sequence`、`cost_and_reward`、`ending_contract`，因此正确失败关闭。

根因位于任务提示词的输出合同：它只把 `chapter_blueprint` 描述为泛化的 `object?`，没有告诉通用 MCP 生成端生产检查实际要求的精确结构。远端没有违反当前可见类型描述，却无法满足下游业务义务。

## 目标

- 让任意 MCP Provider 在材料补齐时获得与生产就绪检查一致的章节蓝图结构。
- 保持本地材料业务校验严格，不通过语义猜测接受非标准字段。
- 保持提示词、编排和验证逻辑 Provider-neutral，不增加 Buda 专用分支。
- 保持 API 模型路径、其他 MCP 阶段、独立 Session 和原子提交行为不变。
- 在真实页面验收中让材料 artifact 成功与 task-level success 同时成立。

## 非目标

- 不把非标准蓝图字段自动转换为标准字段。
- 不在服务端推断 `five_part_summary` 等字段的语义或顺序。
- 不放宽 `missingChapterBlueprintSections` 或来源就绪检查。
- 不增加自动重试、第二次材料 Session 或独立蓝图阶段。
- 不扩展章节蓝图的全部长期方法论合同；本次只覆盖当前生产就绪门需要的核心结构。
- 不修改材料以外的正文、复检、修订或 Story State 提示词。

## 方案比较

### 方案 A：明确通用 MCP 蓝图输出结构（采用）

在 `buildMaterialRepairTask` 的通用输出 envelope 中，将 `chapter_blueprint: 'object?'` 替换为生产就绪检查要求的精确结构，并明确非标准语义别名不能替代标准字段。

优点：在数据产生处修正合同；不扩大服务端信任面；Provider-neutral；API 路径不变。缺点：提示词会增加少量固定 schema 文本。

### 方案 B：服务端别名归一化

接受远端非标准字段并映射到生产字段。兼容面更大，但需要解释数组、对象和顺序语义，会扩大远端 mutation 的推断范围并掩盖合同漂移。

### 方案 C：独立蓝图修复阶段

把蓝图补齐拆成额外 MCP 阶段和 Session。职责更细，但增加远端调用、失败点和编排复杂度，超出当前单一提示词缺口。

## 架构与数据流

仅调整材料任务的编译边界：

```text
事务快照与缺失义务
  -> resolveMaterialRepairPlan
  -> buildMaterialRepairTask
       -> 通用材料分区合同
       -> 精确 chapter_blueprint 输出结构
  -> GenerationSource / MCP Adapter
  -> material_repair_json 阶段响应合同
  -> prepareMcpMaterialRepairMutation
       -> 现有字段、类型、义务和引用校验
  -> 现有原子提交
```

运行时不读取 Provider、Adapter、Agent、账号或模型标识。Buda 继续只是实现通用 MCP Adapter port 的一个 Adapter。

## 精确章节蓝图合同

`chapter_patch.raw_payload.chapter_blueprint` 必须明确声明以下标准 snake_case 字段：

```json
{
  "target_emotion": "non-empty string",
  "opening_hook": "non-empty string",
  "core_payoff": "non-empty string",
  "content_outline": {
    "cause": "non-empty string",
    "development": "non-empty string",
    "turn": "non-empty string",
    "climax": "non-empty string",
    "ending": "non-empty string"
  },
  "plot_lines": {
    "mainline": "non-empty string",
    "logic_line": "non-empty string"
  },
  "character_order": ["character name"],
  "beat_sequence": ["beat with function tag"],
  "cost_and_reward": "non-empty string",
  "ending_contract": {
    "next_chapter_pull": "non-empty string"
  }
}
```

该结构与 `missingChapterBlueprintSections` 的当前生产判定一一对应。提示词还必须明确：语义相近但名称不同的字段不能替代这些标准字段，包括但不限于：

- `five_part_summary` 不能替代 `content_outline`；
- `multi_line_progression` 不能替代 `plot_lines`；
- `character_appearance_order` 不能替代 `character_order`；
- `event_function_tags` 不能替代 `beat_sequence`；
- `cost_benefit` 不能替代 `cost_and_reward`；
- 根级 `unknowns` 不能替代 `ending_contract.next_chapter_pull`。

只要求生成本次缺失义务需要的材料分区。未请求分区、空值、额外 mutation 和无效引用仍由现有业务合同拒绝。

## 错误处理与持久化

- 提示词增强不改变任何响应解析或业务错误代码。
- 远端缺少任一必要标准字段时，现有生产义务检查继续返回 typed failure。
- artifact 成功不等于任务成功；只有材料准备和原子 acceptance 均成功时任务才可标记为 success。
- 失败时不写入世界观、角色、设定、usage 或章节 patch，不自动发起第二次请求。
- 原始远端响应继续保存在 artifact 中供审计。

## API 与其他阶段隔离

- 变更只发生在 MCP 材料任务编译器使用的 `buildMaterialRepairTask` 输出合同。
- API 模型的章节生产和既有材料逻辑不读取此新增 schema 分支。
- 正文、复检、修订、Story State 等 MCP 阶段的 response contract 和提示词保持不变。
- GenerationSource 唯一源、章节任务运行期间禁止切换及每个实际 MCP 阶段独立 Session 的保证保持不变。

## 测试设计

严格执行 RED-GREEN：

1. 在材料提示词合同测试中只检查最后一个 `【输出合同】` 区段；
2. 先证明当前 `chapter_blueprint: object?` 不包含生产必需的标准嵌套结构；
3. 断言输出合同包含全部标准字段和五段式子字段；
4. 断言输出合同不引导生成已观测到的非标准替代字段；
5. 实施最小提示词 schema 变更后观察测试转绿；
6. 运行材料合同、MCP prompt compiler、GenerationSource、完整 Server/Web 测试和仓库检查；
7. 代码审查确认无 Provider/Adapter/API 分支和服务端别名映射。

## 真实页面验收

自动化验证和审查通过后：

1. 重启当前仓库 Server，确认 workspace 精确指向隔离验收目录；
2. 确认上一笔失败任务已终止、小说材料和正文仍为零、隔离仍为零；
3. 从页面只触发一次新的“补齐材料”；
4. 同时确认材料 artifact 与对应 `mcp_chapter_task` 均为 success；
5. 确认世界观、角色、设定和章节 usage 均已写入，材料分数提升且 `strict_ready` 为 true；
6. 从页面只触发一次“生成正文”；
7. 确认材料任务和正文任务使用不同 Task，正文链每个实际阶段使用独立 Session，来源全部为 MCP，正文非空且隔离仍为零。

## 交付标准

- 通用 MCP 材料提示词精确描述生产认可的章节蓝图结构；
- 不接受或映射非标准语义别名；
- 不增加 Buda 专用逻辑，不改变 API 模型功能；
- 具有可观察的 TDD 红绿证据和两阶段代码审查；
- 完整 Server/Web 测试、构建、仓库检查和真实页面验收通过；
- `ui/server/.workspace-config.json` 与 `workspace/assets.json` 始终保持本地未暂存，不进入提交。
