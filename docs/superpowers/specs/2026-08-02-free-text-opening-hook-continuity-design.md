# 自由文本章末钩子连续性匹配设计

## 背景

章节连续性安全门会把上一章的章末钩子转成下一章开篇义务。结构化钩子使用固定类别和结构化锚点判断；旧项目或迁移数据可能只有 `ending_hook`、`ending_excerpt` 等自由文本。

当前 `freeTextEndingHookHit` 对中文自由文本主要依赖完整包含、短锚点四字滑窗，以及按标点切出的整段连续中文串。它能阻止明显跳线，却会拒绝合理的同义动作承接。例如：

- “江哲一脚踩在融化护士头上，逼问钥匙”改写为“江哲仍踩住融化的护士，继续问钥匙在哪”；
- “保安诡异拿着电击棍狞笑逼近”改写为“保安诡异狞笑着举棍砸下”。

两者保留了事件参与者、关键物件和正在发生的动作，但没有两个完全相同的长中文串。

## 目标与非目标

目标：

- 接受保留同一章末事件链的保守同义改写；
- 继续拒绝跳到新目标、只提结果、或把钩子放进照片、档案、消息、梦境和往事中的伪承接；
- 保持判定确定性、无额外模型调用、无项目或章节特调；
- 不改变结构化 continuity、固定 hook cluster、高潮回放和 opening bridge 的现有优先级。

非目标：

- 不做通用中文分词或语义模型判断；
- 不允许仅命中一个角色名、地点名或物件名即通过；
- 不放宽 canonical conflict、malformed prose 或最终入库安全门。

## 方案比较

### 方案 A：保守事件分句匹配（采用）

把自由文本钩子按动作分句，计算每个源分句与当前动作开篇之间的最长连续中文片段。只有命中至少两个独立分句，且其中至少一个是较强匹配时才接受。

优点是确定、可解释、无需外部依赖；通过“两个独立事件片段”避免单一名词误命中。缺点是仍不追求开放域语义理解，会有意保留少量 false-negative。

### 方案 B：修改 hospital 测试文字以贴近原钩子

只让测试使用更接近原句的表达。改动最小，但会掩盖生产中的真实 false-negative，不能采用。

### 方案 C：调用模型做语义连续性判断

语义覆盖更广，但引入额外成本、延迟和不确定性，也会让入库安全门依赖外部可用性，不能采用。

## 判定设计

`freeTextEndingHookHit` 保留现有精确匹配路径。仅当现有路径没有命中时，使用新的事件分句回退：

1. 从 `ending_hook`、真实末句和 primary evidence 组成有界源文本。
2. 将源文本按句号、问号、叹号、分号、冒号、逗号和引号边界拆成有意义的中文动作分句。
3. 从开篇前 900 字中剔除非当前动作句：照片、相片、旧照、消息、短信、来信、档案、记录、梦境，以及明确表示“已经是过去/多年前”的句子。
4. 对每个不同源分句，计算它与剩余当前动作开篇的最长连续中文片段长度。
5. 只有至少两个不同源分句达到有效匹配，且至少一个达到强匹配，才判定自由文本钩子已承接。

初始阈值固定为：有效匹配不少于 3 个连续汉字；强匹配不少于 4 个连续汉字。阈值不得由请求或项目配置覆盖。

该规则要求两个独立事件面同时存在。例如“保安诡异”与“电击棍”、“江哲一脚”与“医生办公室的钥匙”可以共同证明事件仍在继续；单独出现“江哲”“钥匙”或“电击棍”不能通过。

## 数据流与错误行为

数据流保持不变：

`assessInitialProseOpeningContinuity` → `assessPrimaryOpeningHookContinuity` → `detectOpeningHookMissDirective` → `freeTextEndingHookHit`。

新逻辑只影响最后一步的自由文本 fallback：

- 命中：返回现有的 `required: true, passed: true`，不再运行 brittle generic fragment gate；
- 未命中：保持 `opening_primary_hook_miss`、`canonical_continuity` 和现有错误详情；
- 不增加日志中的正文、提示词或任何凭据数据。

## 测试与验收

必须覆盖：

- hospital 钥匙事件的同义动作承接通过；
- hospital 保安电击棍事件的同义动作承接通过；
- 两个既有 skip-to-new-goal 开篇继续失败；
- 仅在照片、档案、消息、梦境或过去叙述中提到相同名词继续失败；
- 只命中一个角色或物件继续失败；
- 现有 generic connected、明确时间 bridge、primary bridge、结构化 outgoing handoff、高潮回放和 disconnected opening 回归全部保持；
- `quality-wiring-a` 的 disconnected、canonical 和 malformed 零写入合同保持。

完成标准：相关 focused 测试、`prose-candidate-continuity.test.ts`、`chapter-continuity-guard.test.ts` 和 `quality-wiring-a.test.ts` 全绿，且 production diff 仅包含通用自由文本匹配逻辑。
