# MCP 材料根级分区误嵌套纠正设计

日期：2026-08-08
状态：方案 A 已确认，待书面规格复核
范围：MCP `material_repair_json` 业务合同入口

## 背景与真实证据

在材料补齐根对象闭合恢复上线后的真实页面验收中，新的 MCP 材料任务成功创建了独立远端 Session，阶段 artifact 也通过了 `material_repair_json` 语法和顶层合同校验，但完整任务最终失败，世界观、角色、设定和章节 usage 均保持零写入，隔离数量也没有增加。

持久化任务错误为：

```text
chapter_patch contains forbidden field: worldbuilding
```

对 artifact 的原始内容和解析结果进行结构检查后确认：

- 原始响应仍只缺根对象最后一个 `}`，现有语法恢复正确补齐了它；
- 响应顶层只有 `chapter_patch`；
- `worldbuilding`、`characters`、`character_updates`、`settings`、`chapter_setting_usage` 和 `repair_summary` 被错误放进 `chapter_patch`；
- 所有分区的值仍然完整，没有同名覆盖或部分解析；
- 下游材料合同正确识别了越界字段，并在任何小说材料写入前失败关闭。

因此，当前问题不是 JSON 语法恢复、数据库事务、Session 生命周期或 API/MCP 混用，而是远端生成器偶发地把输出合同中的根级兄弟分区整体嵌套到 `chapter_patch`。

## 目标

- 对任意 MCP Provider 的 `material_repair_json` 结果，确定性纠正真实观测到的完整根级分区误嵌套形状。
- 只改变已知分区的结构位置，不修改、补写或合并任何远端字段值。
- 纠正后重新执行现有材料字段、请求分区、缺失义务、实体引用和原子提交校验。
- 保持其他 MCP 阶段、API 模型路径、独立 Session 策略和失败关闭行为不变。
- 不增加自动重试，不引入 Buda Provider 或 Adapter 专用分支。

## 非目标

- 不实现通用 JSON 结构修复、递归扁平化或模糊 schema 推断。
- 不纠正任意 wrapper，例如 `data`、`payload`、`result` 或模型自造字段。
- 不处理部分根级正确、部分分区误嵌套的混合形状。
- 不处理同名根级字段冲突，也不决定哪个值优先。
- 不修补未知字段、错误字段类型、空 mutation、无效实体引用或未满足的材料义务。
- 不修改阶段 artifact 中保存的远端原始内容；原始证据继续可审计。

## 方案比较

### 方案 A：业务合同入口的精确根级分区提升（采用）

在 `prepareMcpMaterialRepairMutation` 的最前端识别精确误嵌套形状，将已知根级分区从 `chapter_patch` 浅复制提升到根级，然后进入全部现有验证。

优点：Provider-neutral；不依赖重试；不改值；恢复面可以由严格前置条件限定。缺点：需要明确维护允许提升的根级字段集合。

### 方案 B：只加强提示词

在输出合同后重复强调根级结构或增加示例。改动小，但现有提示词已经包含完整输出 envelope、根级字段白名单和“只输出一个 JSON 对象”的要求，无法保证随机生成始终遵守闭合位置。

### 方案 C：保持失败关闭并人工重试

不增加结构纠正，失败后由用户重新生成。安全边界最窄，但会继续消耗独立 Session，并且无法保证下一次不产生另一种合同偏差。

## 架构边界

语法恢复和业务结构纠正保持为两个独立层次：

```text
MCP material_repair_json 原始内容
  -> 阶段响应合同
       -> 标准 JSON.parse
       -> 仅缺根 `}` 时的现有确定性语法恢复
  -> prepareMcpMaterialRepairMutation
       -> 精确根级分区误嵌套识别
       -> 已知根级分区提升
       -> 现有字段和类型校验
       -> 现有请求分区与缺失义务校验
       -> 现有实体引用和上下文身份校验
  -> 现有原子提交
```

阶段响应合同不承担业务字段重排；材料业务合同不承担 JSON 字符修补。这样可以保持单一职责，并保证此前批准的根闭合恢复范围不被悄然扩大。

## 精确纠正规则

新增一个内部、Provider-neutral、非递归的规范化函数。仅当以下条件全部满足时进入提升路径：

1. 输入是普通对象；
2. 输入顶层键集合精确为 `['chapter_patch']`；
3. `chapter_patch` 是普通对象；
4. `chapter_patch` 至少直接包含一个可提升根级字段；
5. 可提升字段只按精确名称识别：
   - `worldbuilding`
   - `characters`
   - `character_updates`
   - `settings`
   - `chapter_setting_usage`
   - `repair_summary`

规范化过程将 `chapter_patch` 浅复制为新对象，把上述直接子字段原样放到新的根对象，并从新的 `chapter_patch` 中移除这些字段。输入对象及其嵌套值均不得被修改。

规范化函数本身不判断集合内容、字段类型或请求义务，也不删除未知字段。提升完成后，现有验证器必须重新检查完整结果。因此：

- 未知子字段仍留在 `chapter_patch`，随后以 forbidden field 失败；
- 已知根级字段类型错误仍由现有根级集合或摘要校验失败；
- 提升后 `chapter_patch` 为空或没有满足请求义务时仍失败；
- 顶层存在其他键时不进入纠正，部分误嵌套和潜在冲突继续失败；
- 合法 canonical payload 不进入纠正，行为和对象内容保持不变。

## 错误处理与持久化

- 规范化发生在 `prepareMcpMaterialRepairMutation` 内、任何 acceptance 提交之前。
- 纠正后的 payload 必须通过现有全部业务安全门，不能直接进入数据库。
- 任一条件或后续校验失败时，任务按现有方式关闭为 failed，小说材料保持零写入。
- 不创建第二次远端请求，不复用或重试 Session。
- 阶段 artifact 继续保存原始远端 `content` 和原始解析 `output`；任务级错误或成功反映业务合同最终结果。

## API 与通用 MCP 隔离

- 决策不读取 Provider、Adapter、Agent、账号或模型标识。
- Buda 继续只是 Adapter，不新增编排分支。
- 规范化只位于 MCP 材料补齐准备函数，不进入 API 模型生成路径。
- `draft_prose`、复检、修订、Story State 等其他 MCP response contract 不使用该规则。
- GenerationSource 唯一源、章节任务期间禁止切换及每阶段独立 Session 的现有保证不变。

## 测试设计

先写并观察失败的回归测试，再实现最小规范化：

- 精确复现“顶层只有 `chapter_patch`，所有已知材料分区嵌入其中”的真实结构；
- 纠正后的 prepared acceptance 与对应 canonical payload 等价；
- 所有被提升值保持引用或深度值等价，原始输入不发生 mutation；
- 合法 canonical payload 行为不变；
- 未知嵌套字段继续失败；
- 顶层已有其他字段而内部仍有误嵌套字段时继续失败；
- 错误类型、空 mutation、未请求分区、无效实体引用和未满足义务继续失败；
- 根闭合语法恢复与根级分区提升可以按顺序组合，但其他 response contract 不受影响；
- 运行材料合同、阶段响应、GenerationSource、MCP、完整 Server/Web 测试和仓库检查。

## 真实验收

自动化验证和两级代码审查通过后：

1. 重启 Server，确认验收项目没有运行中任务或隔离；
2. 从页面只触发一次材料补齐；
3. 确认新任务和新 Session 均独立，来源为 MCP；
4. 确认世界观、角色、设定和章节 usage 非空，材料分数提升且严格预检 ready；
5. 从同一页面只触发一次正文生产；
6. 确认正文任务与材料任务使用不同 Session，全链路保持 MCP 唯一源，正文非空且无新增隔离。

## 交付标准

- 具有可观察的 TDD 红绿证据；
- 纠正范围严格等于真实观测到的单 wrapper、直接子字段提升；
- 不修改远端字段值，不吞掉未知字段，不绕过任何现有业务校验；
- 不影响 API 模型路径或其他 MCP 阶段；
- 聚焦、完整测试、构建、检查和 `git diff --check` 全部通过；
- `ui/server/.workspace-config.json` 与 `workspace/assets.json` 始终保持本地未暂存，不进入提交。
