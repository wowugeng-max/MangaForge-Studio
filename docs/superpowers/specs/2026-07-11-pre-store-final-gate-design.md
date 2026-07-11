# MangaForge 正文入库前最终门禁设计

## 背景与真实故障证据

第 11 章真实生成请求在写前门禁 15/15 全绿后完成，质量循环返回 92 分并将正文入库。但候选稿把前三章已稳定使用的“临江市第一人民医院”写成“江城市第一人民医院”，并断言两者是同一家医院。两次独立盲评均将其判定为长线连续性硬错。

同一次请求还暴露出以下门禁绕过：

- `getQualityGateDecision()` 在存在 `prose_quality_v2.decision` 时提前返回，忽略随后注入的结构化失败检查。
- 细纲、故事驱动、吸引力等预入库检查虽产生 `status=fail`，却未进入最终 v2 判定。
- Story State、角色状态、资产状态和章末交接检查在正文入库后执行，只能记录 warning，无法阻止正文与 Memory 写入。
- Memory 对通过稿抽取出“他、而、但”等无意义实体，造成低质量事实污染。

该候选稿及全部副作用已从 live 数据恢复到请求前状态；真实证据保存在 `/private/tmp/mangaforge-ch11-final-real-20260711-184311/`。

## 目标

建立唯一的入库前最终门禁，使正文、Story State、章节版本和 Memory 只在以下条件全部满足后写入：

1. v2 六维质量判定通过且 `publishable=true`。
2. 所有当前章节结构化硬检查通过。
3. 稳定专名、地点、机构、人物身份和关键资产事实没有与既有正史冲突。
4. Story State 候选增量完整、可验证，且不会留下当前章节状态缺口。
5. 只有纯下一章工作或文档同步事项可以作为 carryover；当前正文事实、因果、人物、连续性和细纲硬缺口不得降级。
6. 通过稿写入后才允许写入 Memory；无意义实体和碎片事实不得进入 Memory。

## 总体方案

### 1. 统一质量判定，不允许 v2 早退

`getQualityGateDecision()` 不再将 `prose_quality_v2.decision` 作为完整最终结果直接返回。最终判定由以下证据合并产生：

- v2 hard failures、publishable 和六维分数；
- `quality_audit_checks`、`revision_receipt_checks`、`deslop_repair_checks` 等结构化检查；
- 未兑现且属于当前正文的 delivery risk receipts；
- 必需的下一章质量计划；
- 仿写安全结果。

任何新增硬失败必须追加到最终 `hard_failures`，并强制 `passed=false`、`approvable=false`。人工批准不能覆盖连续性、因果、人物、事实、安全或 transport 硬失败。

### 2. 入库前正史专名连续性检查

在章节上下文构建阶段，从以下来源建立有界的 canonical surface index：

- 项目写作圣经与 Story State canon facts；
- 世界观、角色和设定实体；
- 所有已入库前文章节中重复出现的稳定专名；
- 前三章及最近章节中的地点、机构、人物称谓和关键资产名称。

检查器只对高置信冲突 fail-close，避免把新地点误判为漂移：

- 同一稳定尾部实体出现互斥前缀，例如“临江市第一人民医院”与“江城市第一人民医院”；
- 当前正文使用“正是、就是、同一家、原来是”等同一性断言连接互斥名称；
- 已有 canon fact 明确指定唯一名称、归属或身份，而正文给出不同值。

检查结果进入 deterministic scan 和最终质量 review，错误证据必须包含 canonical 值与当前正文短句。真实第 11 章候选必须稳定触发 `canonical_proper_noun_conflict`。

### 3. Story State 两阶段处理

将现有 `updateStoryStateMachine()` 拆成：

- `prepareStoryStateUpdate()`：调用 review agent，解析并规范化 state delta，构建角色、资产、时间线和章末交接同步报告，但不写数据库、不写 review、不写 Memory。
- `commitPreparedStoryStateUpdate()`：仅在最终门禁通过后应用已验证的 project、character、setting 和 usage 更新。

准备阶段的以下缺口属于当前章节硬失败：

- 正文已改变角色状态，但候选增量没有记录；
- 正文已改变关键资产归属、限制或风险，但候选增量没有记录；
- 章末形成明确新问题或下一步行动，却没有 handoff；
- 时间线、地点、身份或知识边界与 canonical context 冲突；
- state delta 为空、结构不可解析或 transport 不完整。

仅“下一章继续强化”“后续文档整理”等不影响当前正文正确性的事项可以作为 carryover。

### 4. 入库顺序与失败语义

新的顺序为：

1. draft / contraction / editor / meme polish；
2. v2 质量循环与修订复检；
3. 确定性清理、结构化同步和 canonical continuity 检查；
4. prepare Story State；
5. 合并所有证据形成唯一 final decision；
6. reference safety；
7. 提交正文、章节版本和 prepared Story State；
8. 写入成功 reviews/run；
9. 最后写入 Memory。

任一步失败时：

- chapter text、chapter version、project Story State、characters、settings 和 Memory 均保持请求前状态；
- 只允许写入一条紧凑失败 run 诊断；
- 不把候选全文复制进 run/review 诊断。

数据库提交应使用现有 SQLite 事务能力覆盖正文、版本和 Story State 相关写入。Memory 位于独立数据库，只在主事务成功后执行；Memory 写入失败不得回滚已通过正文，但必须返回 warning，且不能把失败候选写入 Memory。

### 5. Memory 事实过滤

在 prose memory facts 写入前过滤：

- 单字代词、连词、介词和语气词实体，例如“他、她、而、但、却、又”；
- 缺少有效主体或属性的碎片；
- 与正文不可定位的抽取结果；
- 同一批次完全重复的 entity/attribute/value。

过滤只影响新事实，不修改用户已有 Memory。

## 测试设计

### 单元测试

- v2 decision 为通过，但结构化 `status=fail` 时最终必须失败。
- v2 decision 为通过，但当前正文 delivery risk 未兑现时必须失败。
- 纯下一章 carryover 不阻塞。
- canonical index 将“临江市第一人民医院”与“江城市第一人民医院”识别为同尾部互斥专名。
- 两个明确不同的新医院、城市或机构不产生误报。
- Story State prepare 阶段不产生任何数据库写入。
- state delta 缺失角色/资产/章末交接时 fail-close。
- Memory 过滤无意义实体并保留有效人物、地点、资产事实。

### 真实候选回归

使用已保存的第 11 章候选正文作为离线 fixture：

- 必须在 store hook 前因 `canonical_proper_noun_conflict` 被拒绝；
- chapter 11 保持 0 字、version 1、无新有效版本；
- project、reviews、Story State 和 Memory 与基线逻辑一致；
- 不发起新的真实模型请求。

### 全量验证

- 相关定向测试；
- 完整 `test:novel-server`；
- 写作工作台 web 测试；
- server/web build；
- `git diff --check`；
- Provider、novel DB 和 Memory Palace 审计。

## 验收标准

- 真实第 11 章候选不再被 92 分绕过最终门禁。
- 当前章节结构性 fail 不再被标成 accepted carryover。
- 正文入库前完成 canonical continuity 与 Story State 候选验证。
- 任意失败路径保持正文、版本、Story State 和 Memory 零污染。
- 已有正常通过路径不被无关 warning 永久阻塞。
- 所有测试和构建通过。
- 不再追加真实大模型请求；完成结论以已保存真实候选回归证据为准。
