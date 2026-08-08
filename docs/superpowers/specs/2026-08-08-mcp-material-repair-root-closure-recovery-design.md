# MCP 材料补齐根对象闭合恢复设计

日期：2026-08-08
状态：方案 A 已确认，待规格复核
范围：MCP `material_repair_json` 阶段响应解析

## 背景与真实证据

项目 4 的真实材料补齐任务 `7f1c10f6…15f3` 已正常创建独立 Buda Session，远端任务也已终止，没有新增隔离记录，但本地以 `MCP_STAGE_CONTRACT_INVALID` 失败且没有提交任何小说材料。

从 Buda 页面读取到的实际 Assistant 输出约 10 KB，包含非空的 `chapter_patch`、`worldbuilding`、`characters`、`settings`、`chapter_setting_usage` 和 `repair_summary`。字符级扫描确认：

- 所有 JSON 字符串均已闭合；
- 所有内部数组和对象均已闭合；
- 没有错配或多余的闭合符；
- 仅位置 0 的根对象 `{` 未闭合，响应末尾少一个 `}`。

现有 `stage-response-contract.ts` 只接受完整 `JSON.parse()`，因此把这类语义完整、仅缺根闭合符的材料结果判为无效。

## 目标

- 对任意 MCP Provider 的 `material_repair_json` 响应，保守恢复“仅缺根对象最后一个 `}`”的结果。
- 保持合法 JSON 的现有解析路径和输出完全不变。
- 恢复后继续执行现有阶段结构校验和材料补齐义务校验；恢复不能绕过业务安全门。
- 字符串截断、内部容器截断、闭合符错配、任意中段语法错误和缺失材料继续失败关闭。
- 不增加自动重试，不复用旧 Session，不引入 Buda 专用分支。

## 非目标

- 不实现通用 JSON repair、JSON5 或模糊容错解析器。
- 不修改全局 `parseJsonLikePayload()`；此前其他链路要求缺少闭合括号继续失败，本设计不改变该约束。
- 不补逗号、冒号、引号、字段、数组内容或内部对象闭合符。
- 不接受 `draft_prose`、review、Story State 等其他 response contract 的截断结果。
- 不根据 Provider、Adapter、Agent 或模型名称决定是否恢复。

## 方案比较

### 方案 A：阶段专用的根对象闭合恢复（采用）

在 `material_repair_json` 的标准解析失败后，以确定性扫描确认只剩根 `{` 未闭合，追加一个 `}`，重新执行 `JSON.parse()` 和全部现有校验。

优点：精确覆盖真实失败；Provider-neutral；改动和准入面最小。风险由严格词法条件、只追加一个字符以及后续双重语义校验限制。

### 方案 B：缩短提示词与材料输出

可以降低长响应出现格式错误的概率，但不能保证模型始终输出合法 JSON，也可能损失章节蓝图和设定细节，因此不作为根因修复。

### 方案 C：格式失败后自动创建新 Session 重试

会消耗免费账号额度，增加随机波动和重复远端生成；不符合当前独立 Session、失败关闭和人工可观察的安全边界。

## 解析算法

新增一个仅供材料补齐验证器使用的内部函数。数据流如下：

```text
material_repair_json 内容
  -> 去除现有精确 Markdown JSON 围栏
  -> 标准 JSON.parse
       -> 成功：原样进入现有校验
       -> SyntaxError：执行根对象扫描
            -> 仅根 `{` 未闭合：追加一个 `}` 后 JSON.parse
            -> 其他情况：保持失败
  -> plain object 校验
  -> material repair 顶层字段与集合结构校验
  -> material-repair-contract 请求分区、引用、义务与原子提交校验
```

恢复必须同时满足：

1. 候选首个非空字符为 `{`；
2. 标准 `JSON.parse()` 以 `SyntaxError` 失败；
3. 单次线性扫描结束时不在字符串内，也不存在悬空转义；
4. 扫描过程中不存在错配或多余的 `}` / `]`；
5. 扫描结束时容器栈恰好只剩候选根位置的一个 `{`；
6. 只追加一个 `}` 后，完整 `JSON.parse()` 成功并得到普通对象。

任何条件不满足都维持现有 `MCP_STAGE_CONTRACT_INVALID`。恢复路径不修改字段和值，也不返回“部分 JSON”标记。

## 测试设计

先写并观察失败的回归测试，再实现最小恢复：

- 真实形状的材料输出仅缺根 `}` 时通过，并保留全部字段值；
- 完整合法的材料 JSON 行为不变；
- 精确 `json` 围栏中的同类结果可按同一规则恢复；
- 未闭合字符串、悬空转义、缺内部 `]` / `}`、闭合符错配和中段非法字符继续返回 `MCP_STAGE_CONTRACT_INVALID`；
- 只补齐根闭合后若没有非空 mutation，仍被现有材料结构校验拒绝；
- 其他 response contract 缺根闭合时仍严格失败；
- 运行阶段响应、材料合同、MCP generation source 及完整 Server/Web 回归。

## 真实验收

实现与自动化验证通过后，从项目 4 页面只重新发起一次材料补齐：

- 新任务必须使用独立 Task ID 和 Session ID；
- 来源必须保持 MCP，且不得出现 Buda 专用编排分支；
- 材料任务成功后核对世界观、角色卡、设定、章节 usage、材料分数和 strict-ready；
- 失败任务不得产生材料写入，隔离数量不得无故增加；
- 材料通过后再从页面发起正文链路，并验证正文使用另一独立 Session。

## 交付标准

- 回归测试具有可观察的红绿过程；
- 恢复范围严格限制为 `material_repair_json` 的单个根 `}`；
- 现有 API 大模型路径和其他 MCP 阶段行为不变；
- 聚焦测试、完整测试、类型检查、构建和 `git diff --check` 全绿；
- 保护 `ui/server/.workspace-config.json` 与 `workspace/assets.json`，不纳入提交。
