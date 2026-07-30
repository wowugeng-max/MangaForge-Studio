# 小说结构化 JSON 裸双引号恢复设计

日期：2026-07-30

## 背景与真实证据

项目 3 的编辑器修订任务 757 已安全完成正文生成、候选验收、正文持久化和修订后质检。Story State 输出预算配置与检查点快照也已在真实链路生效：模型 ID 36 使用 `claude-sonnet-4-6 / cliproxyapi`，运行时检查点分别记录并实际使用了 9000 和 18000 token。

真实响应取证显示，18000-token 尝试同时暴露了两个独立事实：

1. 响应以 `finish_reason: max_tokens` 结束，说明本章所需预算高于 18000。
2. 在截断发生前，模型已经生成了不合法 JSON。正文摘录中的 ASCII 双引号没有转义，例如：

```text
"source_excerpt": "他触犯了"绝对不能在非整点下车"的隐藏死律。"
```

因此适配器返回 `parsed: null`，`getNovelPayload()` 无法取得 `state_delta`，Story State 安全门正确产生 `story_state_invalid_payload`；截断尝试同时产生 `story_state_transport_incomplete`。

任务 757 的章节 61 正文仍保持 SHA-256 `c95ad16c4fb21c4545a5ee393b9fd5f9a660dd1faf95d00ee85d426c268b93d5`，版本数仍为 8，关联 review 仍为 2，后续 29 章指纹未变化。本设计不得重新生成、重新提交或修改这些正文。

## 目标

- 在正常 JSON 解析失败后，保守恢复 JSON 字符串值内部未转义的 ASCII 双引号。
- 让 Story State 等小说结构化响应复用同一解析能力，不为单条链路复制解析器。
- 保持失败关闭：截断、缺少闭合括号、缺少闭合字符串或修复后仍不合法的响应继续返回解析失败。
- 不改变模型调用次数、模型路由、自动重试、确定性降级或 Story State 完整性门。
- 修复后继续同一个任务 757，不创建新修订任务，不重复正文、质检、提交或版本写入。

## 非目标

- 不实现通用容错 JSON5 解析器。
- 不自动补齐缺失的括号、数组、对象或字符串结尾。
- 不接受 `finish_reason: max_tokens` 的 Story State 结果。
- 不静默删除模型字段或改写字段含义。
- 不新增第三方 JSON repair 依赖。
- 不把项目预算 32000 固化为应用级上限；它只是项目 3 的下一次真实验收值，应用最大值仍为 262144。

## 方案比较

### 方案 A：通用解析器的保守二次修复（采用）

在 `parseJsonLikePayload()` 的现有标准 `JSON.parse()` 尝试全部失败后，对 JSON 形状候选执行一次裸双引号修复，再次调用 `JSON.parse()`。Story State、质量检查和其他小说结构化响应共享该能力。

优点：修复根因所在的公共边界；不复制链路专用逻辑；标准合法 JSON 路径完全不变。

风险：过宽的启发式修复可能掩盖其他损坏。通过严格候选条件、单一字符级转换和修复后必须由 `JSON.parse()` 完整验证来限制风险。

### 方案 B：仅 Story State 局部修复

在 `prepareStoryStateUpdate()` 内修复原始文本。

不采用：会复制 `getNovelPayload()` 的职责；其他模型结构化响应仍会被同一种裸引号破坏。

### 方案 C：只改提示词并提高预算

不采用：提示词不能保证供应商模型永远正确转义正文摘录；真实响应已证明仅增加预算无法消除 JSON 语法错误。

## 解析算法

新增一个聚焦的内部函数，例如 `repairBareQuotesInJsonStrings(candidate)`，只在以下条件同时满足时运行：

- 标准候选解析已经失败；
- 去除 Markdown JSON fence 后，候选首个非空字符是 `{` 或 `[`；
- 候选包含至少一个字符串引号。

函数使用单次线性扫描，维护 `inString` 与 `escaped` 状态：

1. 已被反斜杠转义的字符原样保留。
2. 字符串外的 `"` 开启字符串。
3. 字符串内遇到 `"` 时，向后查看下一个非空白字符。
4. 若下一个字符是合法结构终止符 `:`, `,`, `}`, `]`，或已到候选结尾，则把当前引号视为正常闭合。
5. 否则把当前引号视为字符串内容，转换为 `\"`，并保持 `inString=true`。

该算法只补一个缺失的反斜杠，不补任何括号、逗号、冒号或结尾。修复结果必须再次完整通过 `JSON.parse()`；否则丢弃修复结果，维持现有 `null`/空 payload 行为。

示例：

```text
输入:  {"source_excerpt":"他触犯了"绝对不能"的规则。","count":1}
输出:  {"source_excerpt":"他触犯了\"绝对不能\"的规则。","count":1}
```

合法输入如 `{"text":"他说：\"停下\"。"}` 不发生变化。

## 数据流与安全门

```text
模型结果
  -> 现有 candidate 提取
  -> 标准 JSON.parse
       -> 成功：直接返回，不进入修复
       -> 失败：仅对 JSON 形状候选修复裸双引号
            -> 修复后 JSON.parse 成功：返回对象
            -> 仍失败：返回 null
  -> Story State payload/state_delta 验证
  -> transport 完整性验证
  -> 既有 hard-failure 安全门
```

即使裸双引号修复成功，只要响应仍是 `max_tokens`、transport incomplete、没有有效 `state_delta` 或未满足当前章完整性要求，Story State 仍不得应用。

## 测试设计

### 通用解析器单元测试

- 精确复现真实 `source_excerpt` 内部裸双引号，恢复后得到对象和原始文本语义。
- 覆盖 Markdown `json` fence、嵌套对象、数组和多个裸引号。
- 合法 JSON 与合法 `\"` 输入保持不变。
- 属性名闭合引号、字符串值正常闭合引号不得被误转义。
- 截断对象、截断数组、未闭合字符串在修复后仍返回 `null`。
- 普通非 JSON 文本不得进入修复。

### Story State 回归测试

- 模型返回 transport 完整、但 `state_delta.source_excerpt` 含裸引号时，prepare 能得到有效 payload。
- 同一内容若 finish reason 为 `max_tokens`，仍产生 `story_state_transport_incomplete`，不得 apply。
- 单次模型调用、`retryOnBlockedTransport=false`、`allowDeterministicFallback=false` 保持不变。

### 完整回归

- 运行解析器、Story State、revision worker、项目配置和 editor-revision repo 聚焦套件。
- 运行服务端与前端构建。

## 真实任务 757 验收

1. 移除所有临时诊断代码；原始响应只保留在 `/private/tmp`，不得提交。
2. 将项目 3 的 `story_state_max_tokens` 设置为 32000。该值来自本次 18000-token 精确截断证据，是项目级运行值，不是应用上限。
3. 只对 run 757 执行一次 `continue`。
4. 必须继续使用 model ID 36，且正文生成、正文提交、post-quality 和章节版本写入次数均为 0。
5. 若 32000 仍明确 `max_tokens`，只报告并保留可继续失败状态；不得接受截断结果，也不得创建新 run。
6. 若 Story State 完成，回执必须绑定 run 757、chapter 61 和候选哈希。
7. 验收后再次比较章节 61 的正文哈希、长度、更新时间、版本数、提交标记、review 数量，以及后续 29 章的完整指纹。

## 交付标准

- 裸双引号真实复现测试先失败、实现后通过。
- 标准合法 JSON 行为不变，截断 JSON 继续失败关闭。
- 所有聚焦测试和双端构建通过。
- 任务 757 完成 Story State，或在 32000 仍不足时留下明确、可再次继续且不破坏正文的失败状态。
- 不提交 `workspace/assets.json`、`workspace/zhuque-inputs/`、`workspace/zhuque-reports/` 或 `/private/tmp` 诊断文件。
