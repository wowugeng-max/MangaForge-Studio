# MangaForge 正文入库策略软化设计

## 背景

当前正文生成把主观质量评分、文风问题、字数偏差、Story State 同步、连续性校验和持久化安全合并成一个综合门禁。这会让已经达到可读水平的正文，因为模型批次波动或派生状态同步不完整而反复拒绝，形成无限生成和修订循环。

最新第 11 章 run 395 的正文评分为 94，原始质量判断已经通过，最终却因为 Story State 结构化同步失败而未入库，说明当前 admission policy 把“正文是否可用”和“派生索引是否完整”错误耦合。

另一方面，完全取消所有保护会让高分但存在硬连续性错误的稿件入库。例如此前评分 92 的真实候选把“临江市第一人民医院”漂移为“江城市第一人民医院”，如果只看评分就会污染后续正文、Story State 和 Memory。

## 目标

1. 取消主观质量评分对正文入库的阻断作用。
2. 允许不同模型、不同批次产生的字数和文风差异正常入库。
3. Story State、Memory 和 review 同步失败不再阻止正文入库。
4. 保留最小、确定性的稿件有效性保护，防止空稿、截断稿和高置信连续性硬错污染长篇。
5. 终止软质量问题导致的循环生成与无限修订。

## 核心原则

正文是事实源。Story State、Memory、质量 review 和同步报告都是正文派生数据。

- 正文一旦通过最小有效性检查，即可原子入库。
- 派生数据能同步则随正文提交或在提交后写入；不能同步则记录 pending/warning，不反向否定正文。
- 后续章节必须能从已入库正文、大纲和现有有效 Story State 构建上下文；不得仅因上一章派生状态 pending 而停止写作。

## 三种入库结果

### `accepted`

正文有效，质量评分达到配置目标，派生同步没有重要 warning。

### `accepted_with_warnings`

正文有效但存在任一软问题：

- 质量分低于目标。
- 文风、AI 味、节奏、对白、钩子或平台适配问题。
- 字数偏离目标但正文完整、非空且具备完整章节形态。
- Story State prepare 返回无效、不完整或高置信遗漏。
- Story State/Memory/review/post-commit sync 写入失败。
- 下一章质量计划、交付回执或质量审计项不完整。

这些问题进入 warning、review 或 repair queue，不阻止正文入库，也不自动触发无限重试。

### `blocked_invalid`

仅以下情况阻止入库：

1. 正文为空或低于最低可识别章节形态，例如只返回标题、说明或错误文本。
2. 正文生成或正文修订 Provider 明确返回截断、`length`、`max_tokens`、tool-only、reasoning-only、非空 `incomplete_details` 或其他候选正文传输不完整证据。Story State 等派生调用的传输失败不属于此项。
3. 确定性高置信连续性冲突，例如稳定专名被替换并明确断言为同一实体。
4. 明确安全/版权硬阻断。
5. 原子 acceptance 的引用校验或数据库事务失败。

人物、事件、大纲漂移只有在存在可定位、确定性、高置信证据时进入 `blocked_invalid`；依赖模型主观判断或模糊措辞的漂移只作为 warning。

## 质量评分与修订

- 保留现有多维评分、问题列表和 UI 展示。
- `min_score`、critical/high issue 数量、文风/AI 味扫描不再决定能否入库。
- 可配置执行一次写后修订；无论修订后评分是否达标，只要正文仍满足最小有效性检查就入库。
- 禁止因软质量问题自动进入第二轮及后续生成/修订循环。
- 质量较低的正文保存为 `accepted_with_warnings`，由用户后续主动修订。

## 字数策略

- 目标字数、推荐区间和偏差继续用于提示、评分和一次性压缩/扩写建议。
- 超过上限或低于下限不再单独阻止入库。
- 只有正文短到不构成章节、或传输证据显示输出未完成时才阻止。
- 自定义目标也不作为硬入库条件。

## Story State 策略

- `prepareStoryStateUpdate()` 继续在正文提交前运行，以便尽可能生成状态增量和连续性诊断。
- prepare 的 transport/payload/completeness failure 转为 `story_state_pending` warning，不加入最终 hard gate。
- prepare 成功时，状态更新与正文继续在同一 acceptance transaction 中提交。
- prepare 失败时，正文、旧版本和已准备好的安全 review 仍原子提交；project/character/setting/usage 状态保持提交前值。
- 成功响应包含 `story_state_status: synced | pending`、失败原因和可重试 repair action。
- pending 状态不阻止下一章生成；下一章上下文直接使用上一章正文作为事实证据。

## Memory 与 review 策略

- Memory 继续严格位于正文 commit 之后，失败只产生 warning。
- 质量 review 尽可能随正文 acceptance 保存；若 review 本身不可用，正文仍可保存并标记 review pending。
- 失败候选在最小有效性 hard block 前仍不得写入正文、Story State 或 Memory。

## 连续性保护

保留 canonical proper-name scanner 及类似确定性检查：

- 只对高置信、可定位、同一实体断言的冲突 hard block。
- “另一家医院”、类别比较、相邻地点等误报边界继续放行。
- 模型 review 声称“可能偏离人物/大纲”但没有确定性证据时只 warning。
- UI 提供显式人工“强制接受”入口可作为后续独立需求；本次不允许 unattended pipeline 自动绕过 `blocked_invalid`。

## API 与 UI

生成成功响应增加：

```json
{
  "admission_status": "accepted_with_warnings",
  "quality_score": 74,
  "quality_warnings": [],
  "story_state_status": "pending",
  "post_commit_warnings": []
}
```

- UI 将 `accepted_with_warnings` 显示为“已入库，建议修订”，不能显示为生成失败。
- unattended pipeline 将其视为本章生成成功并推进下一章，同时把 warnings 放入任务中心。
- `blocked_invalid` 仍显示明确、单一的阻断原因，不连续自动重试。

## 兼容与迁移

- 已有章节、Story State、Memory 和 review 不迁移。
- 现有 `quality_gate` 配置继续控制评分目标、UI 风险等级和是否执行一次修订，但不控制入库。
- 保留原子提交、失败零污染、canonical scanner 和 Memory 新 facts 过滤。

## 测试与验收

1. 评分低于阈值但正文完整时，章节以 `accepted_with_warnings` 入库。
2. critical/high 文风或 AI 味问题只生成 warning，不阻止入库。
3. 字数高于/低于推荐区间但正文完整时可以入库。
4. Story State payload 无效、transport truncated 或 completeness hard failure 时，正文入库、状态不变、响应为 `story_state_status=pending`。
5. 下一章可以在上一章 `story_state_pending` 时继续构建上下文和生成。
6. 保存的医院专名冲突候选仍以 `blocked_invalid` 拒绝，正文/版本/Story State/Memory 零写。
7. 空稿和 provider 截断稿仍拒绝。
8. soft warning 不触发第二轮无限生成；一次修订结束后必须收敛为 accepted、accepted_with_warnings 或 blocked_invalid。
9. unattended pipeline 把 accepted_with_warnings 视为成功并推进。
10. Server/Web 测试、构建与 live 数据隔离检查通过。
