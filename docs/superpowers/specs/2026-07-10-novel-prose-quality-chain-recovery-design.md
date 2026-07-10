# MangaForge 小说正文质量链路恢复设计

**日期：** 2026-07-10
**状态：** 已获设计批准，待书面规格审核
**目标：** 恢复 oh-story 对小说正文生成的端到端强约束，使写前门禁、提示词核心合同、写后修订和质量门禁共同决定正文能否生成与入库，并用真实模型生成第 10 章验证质量恢复到项目现有前三章水平。

## 1. 背景与已确认根因

本设计以工作区项目 1《怪谈世界：我是超人，怪谈你随意》为回归样本。第 1-3 章是质量基准，第 10 章当前无正文，作为真实模型验收章。现有第 1-9 章正文不覆盖。

调查确认以下问题互相放大：

1. `6987bdc2a` 将独立正文入口切到 `generateChapterForGroup` 后，请求携带的 `chapter_launch_gate`、`longform_compass`、`longform_battle_context`、`next_batch_brief`、`batch_preflight` 和 `million_word_runway` 没有合并进统一服务构建的上下文。旧路径会执行这些合并，新路径忽略它们。
2. oh-story 总导演在第 10 章上下文中只选择了 `story_power` 和 `character_behavior`，但实际正文 prompt 仍包含 57 个区块、约 163,936 字符。`prompt_budget_plan` 只是提示文字，没有决定合同区块是否装载。
3. 历史生成输入从第 1 章约 107,668 tokens 增长到第 9 章约 141,341 tokens。正文出现重复表达、工程语言泄漏和中英文混杂，说明大量同级约束削弱了核心合同的执行优先级。
4. 写后审查要求模型输出大量结构化检查与回执。第 10 章多轮生成得到 80-86 分仍未通过，修订幅度多次超过 800 字，且常残留 8-10 项回执风险。链路在审计字段上严格，但没有把问题压缩成可执行的正文修订。
5. 质量修复后的复检报错会调用 `buildAcceptedQualityRepairFallbackReview` 构造兜底审查；同时 `approvals.quality_gate.approved` 可以绕过未通过的门禁。这两条路径都可能在没有真实复检证据时允许交付。
6. 现有相关测试多为源码字符串断言。它们能证明某段代码存在，不能证明请求约束真正抵达服务、模型没有被调用、合同预算实际生效或质量失败无法入库。

## 2. 设计原则

1. **同一事实只做一次权威判断。** 写前、prompt、修订和入库必须读取同一份生成合同快照。
2. **硬门禁失败关闭。** 缺少验证、复检报错和合同证据不足均不能视作通过。
3. **核心合同优先于合同数量。** prompt 只携带本章必须执行的核心约束和导演选中的风险合同。
4. **正文证据优先于模型自述。** 回执只能帮助定位，不能替代正文中的动作、对话、信息变化和章末拉力。
5. **修订解决正文问题，不追求填满审计字段。** 每轮修订只处理少量、排序明确、带正文证据的问题。
6. **真实验收不可被测试桩替代。** 单元和集成测试证明链路行为，真实配置生成与盲评证明成文质量。

## 3. 方案选择

### 方案 A：只恢复请求透传

将请求级门禁重新合并进统一服务。改动小，但 16 万字符 prompt、失焦修订和可绕过门禁仍存在，不能完成目标。

### 方案 B：统一生成合同与强制质量闭环（采用）

在统一服务边界构建不可变的生成合同快照；由该快照同时驱动写前判断、prompt 编译、写后审查、修订和最终入库。导演预算成为实际合同选择器，质量复检失败关闭。

### 方案 C：回滚质量重构

整体回滚会同时丢失模型运行时、格式清理、存储裁剪和其他近期修复，且不能防止未来再次出现双路径漂移，因此不采用。

## 4. 目标数据流

```text
HTTP/队列生成请求
  -> 构建数据库基础上下文
  -> 合并并压缩请求级约束
  -> 重新计算 preflight + oh-story director
  -> 写前强门禁
  -> 编译正文核心合同与 prompt 计划
  -> 生成初稿
  -> 字数与确定性正文扫描
  -> 六维 LLM 质量审查
  -> 最多两轮定向修订 + 每轮独立复检
  -> 最终硬质量门禁
  -> 参考安全检查
  -> 正文、版本、回执和故事状态入库
```

任何写前硬门禁失败都发生在场景卡或正文模型调用之前。任何写后硬门禁失败都发生在章节正文和长期故事状态入库之前。

## 5. 生成合同快照

新增聚焦的纯函数模块，负责生成服务真正执行的合同快照。快照至少包含：

- 目标章节号、标题、字数范围；
- 章节目标、冲突、读者回报和章末钩子；
- 上一章最后一幕和必须承接项；
- 场景卡及每场目标、阻碍、行动、转折、回报和状态变化；
- 核心读者承诺、核心矛盾、主线服务、主角驱动和文风边界；
- 请求级长篇罗盘、批次交接、风险承接、百万字航线和开写门禁；
- oh-story director 的 readiness、required repairs、selected contracts 和 prompt budget；
- 写前门禁决定与可审计原因；
- prompt 计划及每个区块的 `required | full | compact | reference | omitted` 决策。

生成合同在一次生成尝试内不可变。自动补材料后必须从最新数据库材料重新构建整个快照，不能只局部修改旧上下文。

## 6. 写前强门禁

写前门禁按以下顺序判断：

1. 合并请求级约束后重新计算上下文和 director。
2. `preflight.ready=false` 时先执行已有自动材料修复；修复后仍为 false，返回 `PROSE_PREFLIGHT_BLOCKED`。
3. `preflight.strict_ready=false` 时同样先修复；修复后仍为 false，返回 `PROSE_STRICT_PREFLIGHT_BLOCKED`。低严重度检查不影响 `strict_ready`。
4. `chapter_launch_gate` 存在 block/fail/missing 等硬状态时，返回 `PROSE_LAUNCH_GATE_BLOCKED`。
5. director readiness 为 `needs_repair` 或 `blocked` 时，返回 `PROSE_OH_STORY_GATE_BLOCKED`，并返回 required repairs。
6. 缺场景卡且自动生成后仍为空，返回 `PROSE_SCENE_CARDS_BLOCKED`。

`allow_incomplete` 只允许保留低严重度 advisory，不得绕过上述硬门禁。独立写作入口不再无条件把场景卡审批标记为通过；已有场景卡可以直接使用，新生成或强制重建的场景卡遵循项目审批策略。

## 7. Prompt 核心合同编译

### 7.1 始终保留的核心区块

以下区块按 `required` 级别进入正文 prompt，不能被预算裁剪：

- 单章任务与输出格式；
- 章节目标、冲突、回报、章末钩子和字数目标；
- 上一章尾段承接；
- 场景卡因果链；
- 开写门禁通过快照；
- 核心读者承诺、主线服务、主角驱动和文风边界；
- 禁止新增事实、禁止工程语言和禁止复制参考原句；
- 最终输出 schema 与正文优先规则。

### 7.2 导演选择的风险合同

合同注册表将稳定 key 映射到 prompt section builder。导演的 `full`、`compact`、`reference` 和 `omit` 决定真实装载：

- `full`：保留本章输入、执行规则和验收证据；
- `compact`：只保留 3-6 条与当前风险直接相关的执行规则；
- `reference`：只保留一句边界或索引，不附完整合同 JSON；
- `omit`：正文 prompt 中完全不存在该合同；
- 未被选择且不属于核心区块的合同默认 omitted。

导演最多选择 4 个风险合同。合同 key 统一使用不带 `_contract` 的规范名，输入别名在注册表边界归一化。

### 7.3 预算与可观测性

正文任务 prompt 上限为 48,000 字符。编译器先保留 required，再按 full、compact、reference 的优先级装载。required 本身超限时直接返回 `PROSE_CORE_PROMPT_BUDGET_EXCEEDED`，不得截断核心事实后继续生成。

每次运行记录：

- `prompt_chars`；
- `required_chars`；
- selected/omitted contract keys；
- 每区块字符数；
- 是否发生预算降级；
- 最终模型 usage。

这些诊断写入 run output，不把完整 prompt 或密钥写入持久化记录。

## 8. 写后审查与修订闭环

### 8.1 确定性扫描先行

初稿先执行已有字数、语言、格式、工程元信息、重复、AI 味和截断扫描。确定性发现作为质量审查输入，不要求 LLM 重复推断可由代码证明的事实。

### 8.2 六维 LLM 审查

LLM 只审查以下六个维度：

1. 连续性与上一章承接；
2. 核心承诺、主线服务和主角能动性；
3. 冲突因果、阻碍升级和场景状态变化；
4. 读者回报、信息增量和章末翻页理由；
5. 文风自然度、对白与叙事节奏；
6. 设定边界与外部事实安全。

审查最多输出 6 个 blocking findings 和 4 个 advisory findings。每个 finding 必须包含 `key`、`severity`、`dimension`、`evidence`、`required_change` 和 `acceptance_test`。没有可定位正文证据的 finding 不得作为硬失败。

分数用于比较和展示，不覆盖硬失败。任一 S1、未修复 S2、核心承诺失败、非中文正文、模型退化或截断均使门禁失败。

### 8.3 定向修订

修订 prompt 只包含：

- 不可变核心合同；
- 当前完整正文；
- 最多 6 个 blocking findings；
- 每个 finding 的正文证据、必改动作和验收测试；
- 保留已通过维度和不改变既有事实的要求。

模型返回完整修订正文和紧凑修订回执。`selectUsableRevisionText` 除长度外还验证章节语言、标题/正文边界、无工程附录、无截断，以及 blocking findings 是否有可重新检查的变化。

最多执行两轮修订。每轮后重新运行确定性扫描和新的 LLM 审查，不能复用上一轮得分或把回执声明当作通过证据。

### 8.4 失败关闭

- 复检超时、解析失败或无结构化结果时返回 `PROSE_QUALITY_RECHECK_UNAVAILABLE`。
- 删除将复检异常转换为接受结果的 fallback。
- `approvals.quality_gate.approved` 只能确认 advisory 或纯分数阈值；不能覆盖 S1/S2、核心合同、语言、模型退化、未复检和确定性硬失败。
- `allow_incomplete` 不得使失败正文写入 `chapters.chapter_text` 或污染长期故事状态。
- 失败候选稿和诊断仅保留在受裁剪的 run/review 记录中，便于重试。

## 9. 模块边界

计划新增或调整以下职责边界：

- `ui/server/src/novel-writing/prose-generation-contract.ts`
  - 合并请求约束、规范化合同 key、构建不可变生成合同和写前 gate decision。
- `ui/server/src/novel-writing/prose-contract-prompt.ts`
  - 合同注册表、section 级选择、48,000 字符预算和 prompt 诊断。
- `ui/server/src/novel-writing/prose-quality-loop.ts`
  - 六维 finding 规范化、硬失败分类、修订轮次决定和失败关闭决策。
- `ui/server/src/routes/novel-writing-service.ts`
  - 只负责编排上述模块与现有模型、存储、参考安全服务。
- `ui/server/src/routes/novel-generation-routes.ts`
  - 把 HTTP 请求原样传给统一服务；删除不可达的第二套正文编排逻辑或只保留兼容适配，不再独立判断合同。
- `ui/server/src/routes/novel-oh-story-director.ts`
  - 扩充风险合同选择并统一 key；`strict_ready=false` 不得得到 ready director。
- `ui/server/src/novel-writing/prose-prompt-context.ts`
  - 将通用 180,000 字符尾部裁剪器降为非正文辅助用途；正文使用合同编译器。
- 对应 `.test.ts` 文件
  - 以行为测试替换关键源码字符串断言。

不在本次范围内重做工作台 UI、数据库 schema、故事规划算法或参考作品分析。

## 10. 测试策略

### 10.1 纯函数测试

- 请求 snake_case/camelCase 约束合并到生成合同；
- director 在 strict preflight 缺口下不返回 ready；
- 合同 key 归一化和 full/compact/reference/omit 行为；
- 未选择合同不出现在 prompt；
- required 区块始终存在，prompt 不超过 48,000 字符；
- required 超预算时失败而非截断；
- 硬 finding、复检不可用和可审批 advisory 的分类。

### 10.2 服务集成测试

- 请求级 launch gate 进入统一服务后，在模型调用前阻断；
- 自动材料修复后 strict preflight 仍失败时不调用正文模型；
- 写前通过时模型收到同一生成合同快照；
- 初审失败触发修订，修订后必须调用独立复检；
- 复检异常不能生成通过结果；
- 硬失败即使带 `quality_gate.approved` 也不入库；
- 两轮修订后仍失败则保留原章节正文与故事状态；
- 真实通过时正文、版本、director、回执和故事状态按同一结果入库。

### 10.3 回归测试

- 运行小说服务、写作工作台、oh-story director、provider runtime 和构建检查；
- 保留场景卡、字数、参考安全和 SSE 心跳现有行为；
- 检查 `workspace/providers.json` 用户改动未被覆盖。

## 11. 真实模型验收

使用当前工作区真实配置：

- Provider：`gemini`；
- Model ID：`217`；
- Model：`gemini-3.5-flash`；
- API Key ID：`5`；
- Base URL：用户已配置的 `http://localhost:7860/v1`；
- 项目：ID 1；
- 候选章：第 10 章；
- 基准章：第 1-3 章。

验收流程：

1. 备份 `workspace/novel.sqlite` 及 WAL 状态，记录第 1-9 章正文哈希。
2. 用应用模型执行器验证模型 217 的鉴权与简单结构化响应，不在日志中输出密钥。
3. 构建第 10 章生成合同并记录 prompt 诊断；确认写前 gate 通过且 prompt 不超过 48,000 字符。
4. 通过正常 `/generate-prose` 统一链路生成，不设置 `allow_incomplete` 或硬门禁审批。
5. 确认最终质量 gate 通过、正文入库、故事状态更新成功，且第 1-9 章哈希不变。
6. 对第 1-3 章和第 10 章执行匿名顺序的七维比较：开篇抓力、因果推进、主角能动性、冲突与回报、连续性、文风自然度、章末钩子，每项 1-10 分并要求引用正文证据。
7. 使用真实模型执行至少两次不同顺序的盲评，取各维平均值。

第 10 章通过条件：

- 无确定性硬失败、非中文碎片、工程语言、模型退化或截断；
- 正常生产链路最终 gate 通过，无 override；
- 第 10 章七维总平均分不低于前三章七维总平均分减 0.5；
- 第 10 章任一单维得分不低于前三章该维最低分减 1.0；
- 两次盲评均未将第 10 章判定为“明显低于前三章可发表水平”；
- 人工抽查确认承接第 9 章合围危机，并兑现第 10 章自身目标、回报和章末新问题。

若真实模型生成未通过，保留失败证据并回到单一假设迭代；不得降低阈值、开启 override 或用手工改文冒充链路恢复。

## 12. 完成定义

只有以下证据全部成立，目标才完成：

1. 写前请求约束在统一服务中可观测且能真实阻断模型调用。
2. director 选择控制实际 prompt，核心合同完整，正文 prompt 不超过预算。
3. 写后修订以正文 finding 为中心，复检失败关闭，最多两轮后明确通过或失败。
4. 硬质量失败无法通过 `allow_incomplete` 或通用审批入库。
5. 自动测试、构建和相关回归检查通过。
6. 真实模型 217 成功生成第 10 章并满足第 11 节全部质量阈值。
7. 第 1-9 章原正文及用户 provider 配置未被破坏。
