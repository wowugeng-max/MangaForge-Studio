# MCP 材料来源就绪字符串行精确恢复设计

日期：2026-08-08
状态：方案 A 已确认，待书面规格复核
范围：通用 MCP `material_repair` 业务合同入口

## 背景与真实证据

通用 MCP 材料蓝图精确输出合同完成 TDD、两阶段审查和完整自动化验证后，页面只触发了一次新的材料补齐。该任务使用 MCP 唯一源和独立 Session，阶段 artifact 成功，标准章节蓝图已经完整满足生产结构，但完整任务最终失败，世界观、角色、设定、章节 usage 和正文均保持零写入，隔离数量仍为零。

任务级错误为：

```text
material repair did not satisfy: source_readiness_context_tracking
```

只读检查本次 artifact 后确认：

- `chapter_patch.raw_payload.chapter_blueprint` 已使用完整标准字段；
- 根级材料分区和章节 patch 均处于正确位置；
- `pre_draft_brief.state_tracking_contract.source_readiness` 是数组；
- 数组中的每一个元素都是字符串；
- 每个字符串自身都是合法 JSON，解析后是包含 `key`、`status` 和具体 `evidence` 的普通对象；
- 生产来源就绪检查不会把字符串当作来源行，因此没有识别 `context_tracking`，并在原子提交前正确失败关闭。

现有提示词 envelope 已用对象数组展示 `source_readiness`，但没有明确禁止把对象再次序列化为字符串。真实生成端仍产生了双重序列化形状，因此只重复相同 schema 的提示词不足以提供确定性恢复。

## 目标

- 在通用 MCP 材料边界精确恢复真实观测到的“来源就绪对象被逐行字符串化”形状。
- 同时强化提示词，明确来源就绪数组元素必须是 JSON 对象而非字符串。
- 只做 JSON 语法层的确定性解析，不推断、改写或补写来源行的业务字段。
- 恢复后执行全部现有材料类型、义务、生产来源就绪、引用和原子提交校验。
- 保持 API 模型路径、其他 MCP 阶段、Adapter、Session、重试和持久化行为不变。

## 非目标

- 不实现任意字符串字段的递归 JSON 解析。
- 不解析 `chapter_patch.raw_payload.source_readiness` 或其他非目标路径。
- 不处理部分对象、部分字符串的混合数组。
- 不接受解析为数组、null、字符串、数字、布尔值或带行为原型的值。
- 不为缺失的 `key`、`status` 或 `evidence` 自动补值。
- 不放宽来源就绪生产判定或把 `ready` 当作无条件可信。
- 不自动重试远端任务，不复用上一 Session。
- 不增加 Buda、Provider、Adapter、Agent、账号或模型专用分支。

## 方案比较

### 方案 A：提示词强化与业务边界精确恢复（采用）

提示词明确禁止字符串化来源行；材料准备边界只对唯一目标路径的全字符串数组逐项 `JSON.parse`，解析结果必须全部是普通对象，然后进入现有校验。

优点：对真实已观测形状提供确定性恢复；不依赖随机重试；不扩大到其他字段；Provider-neutral。缺点：业务合同需要维护一个严格限定的语法恢复规则。

### 方案 B：只强化提示词

增加“元素必须是对象”的指令，不改变服务端。范围最窄，但当前 envelope 已展示对象数组，生成端仍双重序列化，下一次真实调用仍可能失败。

### 方案 C：保持失败关闭并人工重试

不增加恢复规则。安全边界最窄，但会继续消耗独立 Session，且相同确定性输入形状可能重复出现。

## 架构与数据流

恢复位于 MCP 材料业务合同，不进入阶段通用 JSON parser：

```text
MCP material_repair_json artifact
  -> 现有阶段响应合同
  -> prepareMcpMaterialRepairMutation
       -> 原始 payload 大小与 forbidden-key 扫描
       -> 现有根级分区精确提升
       -> chapter_patch 规范化
            -> 目标 source_readiness 路径精确恢复
            -> 现有字段与类型校验
       -> 现有缺失义务与生产来源就绪校验
       -> 现有实体引用与上下文身份校验
  -> 现有原子提交
```

阶段 artifact 继续保存远端原始 `content` 和原始解析 `output`。恢复只影响业务准备过程中创建的新对象，不回写 artifact，也不修改调用方传入对象。

## 唯一目标路径

只检查以下 canonical 路径：

```text
chapter_patch
  .raw_payload
  .pre_draft_brief
  .state_tracking_contract
  .source_readiness
```

不递归搜索同名字段，不处理根级 `source_readiness`，也不在任意 `raw_payload` 子树中猜测位置。现有 canonical 对象数组沿原路径通过，不发生恢复。

## 精确触发和失败规则

当目标路径不存在时，保持原行为。

当目标路径存在时：

1. 值必须是数组；其他类型以 `MATERIAL_REPAIR_INVALID` 失败。
2. 空数组不进入字符串恢复，继续由现有缺失义务校验决定结果。
3. 如果所有元素都是普通对象，保持其值和顺序不变。
4. 如果所有元素都是非空字符串，逐项执行标准 `JSON.parse`。
5. 每个解析结果必须是普通对象；数组、null、primitive、非普通原型均以 `MATERIAL_REPAIR_INVALID` 失败。
6. 对象和字符串混合、空字符串或其他元素类型以 `MATERIAL_REPAIR_INVALID` 失败。
7. 恢复保持原数组顺序，不合并、不去重、不重命名字段、不修改字段值。

恢复只浅复制到目标路径所需的祖先容器，并创建新的来源行数组。调用方的 `payload`、`chapter_patch`、`raw_payload`、`pre_draft_brief`、`state_tracking_contract` 和原数组均不得被修改。

解析后的来源行仍必须满足现有生产规则。例如：

- `key` 必须能匹配当前缺失来源；
- `status` 必须是现有判定认可的就绪值；
- `evidence` 不能为空或泛化确认；
- 蓝图、角色状态、时间线和世界约束等业务依赖仍必须实际满足；
- 未请求 mutation、无效引用和身份漂移仍失败关闭。

## 提示词合同

在 `buildMaterialRepairTask` 的 Provider-neutral 指令中增加：

```text
source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。
```

现有输出 envelope 中的对象数组 schema 保持不变。该指令不读取或分支判断 Provider、Adapter、Agent、账号或模型标识。

## 错误处理与持久化

- JSON 解析异常统一投影为 `MATERIAL_REPAIR_INVALID`，不暴露原始远端字符串或内部异常详情。
- 任一行无效时整次材料任务失败，不做部分来源行恢复或部分材料写入。
- 不发起第二次远端请求，不创建补偿 Session。
- 任一后续业务校验失败时，现有原子 acceptance 保证小说材料零写入。
- 成功恢复不是任务成功；只有全部现有业务门和提交完成后 run 才可标记为 success。

## API 与通用 MCP 隔离

- 决策不读取 Provider、Adapter、Agent、账号或模型标识。
- Buda 继续只是通用 MCP Adapter 的一个实现。
- 恢复只由 MCP 材料准备函数调用，不进入 API 模型章节生成路径。
- 正文、复检、修订、Story State 及其他 MCP response contract 不使用该规则。
- 每个实际 MCP 阶段独立 Session、任务期间禁止切换来源及无 API fallback 的保证不变。

## 测试设计

严格执行 RED-GREEN：

- 用本次真实形状构造 `source_readiness` 全字符串数组；
- 证明当前实现因没有恢复而无法得到与 canonical 对象数组等价的 prepared mutation；
- 恢复后，字符串行 payload 与标准对象行 payload 的 prepared mutation 完全等价；
- 原始输入及目标路径各祖先对象不发生 mutation；
- 已经是普通对象数组时行为不变；
- 无效 JSON、空字符串、解析为数组/null/primitive、混合数组和非数组值均以 `MATERIAL_REPAIR_INVALID` 失败；
- 其他路径中的字符串化 JSON 不被解析；
- 提示词包含明确的对象数组和禁止字符串化指令；
- Provider-neutral 源码检查继续不包含 Adapter 品牌标识；
- 运行材料合同、真实 MCP prompt compiler、阶段响应、GenerationSource、完整 Server/Web 测试和仓库检查。

## 真实页面验收

自动化验证和两阶段代码审查通过后：

1. 重启当前仓库 Server，确认 workspace 精确指向隔离验收目录；
2. 确认上一笔任务已终止，材料、正文和隔离仍为零；
3. 从页面只触发一次新的“补齐材料”；
4. 确认最新 artifact 与对应 `mcp_chapter_task` 均为 success；
5. 确认世界观、角色、设定和章节 usage 均写入，`strict_ready` 为 true；
6. 页面只触发一次“生成正文”；
7. 确认材料与正文 Task 不同、正文各实际阶段使用独立 Session、来源全部为 MCP、正文非空且隔离仍为零。

若单次材料任务仍失败，停止且不重复点击，保留 artifact 和 task-level 错误，重新进行系统性根因分析。

## 交付标准

- 恢复范围严格等于 canonical 目标路径的全字符串对象数组；
- 只做确定性 JSON 解析，不进行语义映射、字段补写或递归恢复；
- 恢复后执行全部现有业务校验并保持原子提交；
- 不增加 Buda 专用逻辑，不影响 API 模型功能；
- 具有可观察的 TDD 红绿证据和两阶段代码审查；
- 完整自动化验证、构建、检查和真实页面验收通过；
- `ui/server/.workspace-config.json` 与 `workspace/assets.json` 始终保持本地未暂存，不进入提交。
