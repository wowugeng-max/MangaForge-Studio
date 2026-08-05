# MCP 独立阶段 Session 与稳定恢复设计

日期：2026-08-05

## 背景

MangaForge 将 MCP 和大模型 API 视为同一类能力：受项目控制的生成来源。项目决定何时调用、携带哪些权威上下文、采用什么输出合同、如何复检、何时修订以及最终保存什么内容。远端 MCP Agent 不是章节工作流宿主，也不是小说权威记忆源。

当前 MCP 章节实现把正文、复检、修订及其他生成阶段串行发送到同一个 Buda Agent Session。真实 Buda 测试同时暴露了另一个独立问题：Buda MCP Transport Session 在认证和 `initialize` 成功后仍会抖动。同一个 `Mcp-Session-Id` 上，`tools/list` 和 `tools/call` 可能在 `400 Server not initialized` 与 `200` 之间切换。

真实 HTTP A/B 探针得到以下事实：

- 项目兼容 Transport 和 SDK 原生 `StreamableHTTPClientTransport` 都能完成 `initialize`；
- 原生 Transport 发送 `notifications/initialized` 后仍可能在真实工具调用时收到 `Server not initialized`；
- 项目兼容 Transport 不发送该通知，但相同工具调用仍会间歇失败；
- 同一 Session 的 `tools/list` 曾出现 `400 → 400 → 200`，随后 `tools/call` 再次返回 400；
- 另一次相同链路在若干 400 后完成 `tools/list` 和 `tools/call`；
- 响应通过 CloudFront 返回，没有要求客户端保存的 `Set-Cookie`。

因此，Buda 专用 Transport 不是本次失败的直接根因，改用 Bun 原生 HTTP 启动层或单纯恢复 SDK 原生 `initialized` 通知都不能解决问题。可确定的故障边界位于 Buda MCP 端的 Session 就绪状态；其内部是状态传播竞态、实例间状态不共享还是其他实现问题，只能由 Buda 服务端日志最终确认。

本设计同时解决两个问题：

1. 把每次生成调用改为独立远端 Agent Session，使 MCP 与模型 API 具有一致的调用语义；
2. 在 MangaForge 内建立 provider-neutral 的 MCP 稳定连接门和安全恢复规则，抵御第三方 MCP Session 抖动。

## 已确认的产品决策

- 章节生产仍由 MangaForge 编排，MCP 只承担生成来源角色。
- 每次需要生成能力时创建独立远端 Agent Session；完成后不再复用。
- 正文、复检、修订以及所有其他 `ChapterTaskStage` 均遵守该规则。
- MangaForge 的本地章节任务是唯一贯穿整个章节生产链的对象。
- 在章节总超时范围内自动恢复 MCP Transport；总预算耗尽后才暂停当前阶段。
- 已完成且输入仍有效的本地阶段检查点不重复生成。
- 不因 MCP 故障切换到模型 API，不允许同一章节任务混用来源。
- 不盲目重放结果不确定的写操作。

## 术语和生命周期

### 本地章节任务

MangaForge 拥有的完整章节生产执行。它固定项目、章节、GenerationSource、上下文版本和来源指纹，并覆盖正文、质量检查、修订和 Story State 等所有阶段。

### MCP Transport Session

MangaForge MCP Client 与 MCP Server 之间由 `initialize` 和 `Mcp-Session-Id` 建立的协议连接。它可以在多个安全操作之间复用，但不属于任何一个生成阶段；不稳定时由 Runtime 自动轮换。

### 远端 Agent Session

通过 Adapter 的 Session 创建工具生成的单次远端 Agent 执行。一个 Agent Session 只接受一个完整阶段任务，产生一个阶段结果，然后进入终态并永不用于后续阶段。

这三个生命周期不得重新合并。尤其不能用远端 Agent Session 代替本地章节任务，也不能把 MCP Transport 的 Ready 状态等同于远端 Agent 已经可执行。

## 设计原则

1. MangaForge 权威：所有前因后果由本地上下文和已验证阶段产物提供。
2. 调用自包含：每个阶段输入足以在没有远端对话历史的情况下独立执行。
3. 一次调用一个 Session：MCP 与模型 API 在业务层都表现为一次独立 Generation Invocation。
4. 操作语义优先：是否重试取决于读写性质和提交确定性，而不是错误字符串是否看似瞬时。
5. 总时限唯一：稳定连接、Drive、Session 创建、轮询、提取和清理共享章节配置的总预算。
6. provider-neutral：通用 Runtime 承担预算、连接、分类和恢复；Adapter 只提供服务特征和安全探针。
7. 失败可解释：Transport 未就绪不得继续伪装成 Drive 内容错误。

## Generation Invocation 抽象

模型 API 与 MCP 统一为阶段调用：

```text
GenerationInvocation
  input:
    task identity
    stage
    complete authoritative context
    response contract
    source authority
    total deadline
  output:
    validated content
    source provenance
    output fingerprint
    remote invocation identity when applicable
```

模型来源执行一次模型请求。MCP 来源执行稳定连接、权威快照同步、创建独立 Agent Session、轮询、提取和验证。章节工作流只消费统一结果，不感知远端是否存在对话 Session。

## 章节阶段调用链

每个阶段按以下顺序执行：

1. 读取本地章节任务检查点并验证项目、章节、来源和上下文身份。
2. 组装完整阶段输入，包括写作圣经、Story State、连续性、最近章节、章节目标、上游阶段产物和输出合同。
3. 计算 `input_hash`，查询可复用的成功阶段产物。
4. 命中完全相同的本地检查点时直接返回产物，不访问远端。
5. 模型来源执行一次独立模型请求；MCP 来源进入稳定连接门。
6. MCP Adapter 同步当前阶段所需的权威 Drive 快照并逐文件对账。
7. 使用完整阶段任务创建新的 Agent Session，并在创建时直接 `startRun`。
8. 不再为当前阶段追加一次 `sendSessionMessage`；这样每阶段只保留一个启动 mutation。
9. 通过只读 Session 查询轮询到终态，提取并验证输出合同。
10. 先持久化阶段产物和来源凭据，再允许下游阶段开始。
11. 远端 Session 进入终态后不再复用；本地 Agent lease 继续保护整个章节任务。

所有 `ChapterTaskStage` 都采用该调用链，包括：

- `draft`
- `word_target_repair`
- `commercial_editor_rewrite`
- `meme_polish`
- `readability_review`
- `humanize`
- `quality_review`
- `quality_recheck`
- `structured_review_fill`
- `quality_repair`
- `manual_recheck`
- `editor_report`
- `revision`
- `post_revision_review`
- `story_state_sync`

某些阶段被本地业务规则跳过时不创建远端 Session。只有实际调用 GenerationSource 的阶段才创建 Session。

## 接口边界调整

当前 `McpGenerationAdapter.openChapterTask()` 返回可执行多个 `runStage()` 的共享 `McpChapterTaskSession`。新设计将共享远端 Session 从接口中移除，改为单阶段调用端口，例如：

```ts
interface McpGenerationAdapter {
  invokeChapterStage(input: McpChapterInvocationInput): Promise<McpChapterStageResult>
}
```

`McpChapterInvocationInput` 同时包含本地任务身份和单个阶段输入。`McpChapterStageResult` 返回该阶段自己的 `session_id`、`snapshot_hash`、内容和终态。

`McpGenerationSource` 继续在本地任务范围内固定：

- Server、Key、Adapter、Agent 和可选模型；
- source/authority fingerprint；
- context version；
- Agent lease；
- 章节总 deadline；
- 来源切换 fence。

但它不再缓存整个任务共用的 `sessionPromise`、`remoteSessionId`、`remoteSnapshotHash` 或 Adapter Session。每次 `generateDraft()` / `executeAgent()` 都创建独立 invocation，并将返回的 Session 身份写入对应阶段回执。

Agent lease 仍覆盖完整本地章节任务，避免同一个 Agent 的 Drive 和长期记忆被并发章节任务交叉修改。独立 Agent Session 不意味着允许同一绑定并发执行多个章节。

## 权威上下文和 Drive

Buda Agent 的历史 Session、长期记忆和 Drive 都只能作为执行辅助，不能覆盖 MangaForge 本次调用提供的权威上下文。

每个阶段的上下文组装器必须显式携带所有依赖：

- `draft` 读取章节前的权威小说状态；
- 复检类阶段读取已持久化候选正文；
- 修订类阶段读取候选正文和对应复检报告；
- 修订后复检读取最新修订产物；
- `story_state_sync` 读取最终被接纳的正文，而不是任意远端 Session 输出。

Drive snapshot hash 按阶段计算。上游阶段结果变化时，下游 snapshot 和 `input_hash` 必然变化。Drive 内容继续采用写后读取和哈希验证；不得因为 Agent 声称已经看到文件而跳过本地校验。

## 阶段检查点和产物存储

### 现有 Runs

继续使用 `chapter_generation_stage` Run 记录阶段状态、输入哈希、输出合同、耗时、来源身份和错误码。每条成功 MCP 阶段 Run 记录自己的远端 Session ID，而不是任务级共享 Session ID。

提示词继续只保存哈希，不把完整提示词写入 Run。MCP Key 和自定义 Header 值永不进入 SQLite 回执。

### 新增 `chapter_stage_artifacts`

新增独立表保存可恢复的阶段结果，避免将长正文塞入 `runs.output_ref`：

```text
id
task_id
project_id
chapter_id
stage
attempt
status
input_hash
output_hash
response_contract
output_payload
source
source_fingerprint
authority_fingerprint
context_version
server_id
key_id
adapter_id
agent_id
model
session_id
snapshot_hash
created_at
updated_at
```

约束：

- `task_id + stage + attempt` 唯一；
- `status` 只允许 `running`、`success`、`failed`、`ambiguous`、`invalidated`、`compacted`；
- 只有经过输出合同校验的结果可以写为 `success`；
- `output_hash` 必须与规范化后的 `output_payload` 一致；
- 所有文本和 JSON 都有明确字节、深度和字段数量上限；
- `key_id` 可以保存，原始 Key 不能保存；
- 失败记录只保存有界错误码，不保存可能含凭据的远端错误正文。

至少建立 `task_id + stage + attempt` 唯一索引和 `project_id + chapter_id + task_id + status` 恢复查询索引。重复出现的修复/复检阶段递增 `attempt`；恢复可以复用同一阶段任一具有相同完整输入身份的成功 attempt。

### 稳定任务身份

首次开始章节任务时生成 `task_id`，并立即写入父章节/章节群 Run 的检查点。自动恢复必须复用该 `task_id`，不能因为重新进入 HTTP 路由而生成新任务身份。

恢复时，只有以下字段全部相同时才能复用成功产物：

```text
task_id
project_id
chapter_id
stage
input_hash
source_fingerprint
authority_fingerprint
context_version
response_contract
```

任一字段变化，当前阶段和所有依赖该产物的下游阶段失效。下游关系使用现有章节执行器的实际阶段依赖/执行顺序判定，不假设所有阶段都必然出现，也不把重复修复轮次压成固定线性列表。失效只影响可恢复产物，不删除历史审计回执。

最终正文和 Story State 成功提交后，中间产物可以进入压缩：保留哈希、状态、来源和 Session 凭据，清除不再需要的大体积 `output_payload`。任务完成前不得压缩恢复所需的上游产物。

## MCP 稳定连接门

### Adapter 稳定策略

通用 Runtime 接受 Adapter 提供的可选稳定策略：

```text
classify(error) ->
  not_ready_pre_dispatch
  transient_read_failure
  ambiguous_write_failure
  terminal_failure

probe(client) -> side-effect-free readiness check
```

Buda 策略使用工具发现加真实无副作用调用，例如 `tools/list` 和 `listAgents`。通用 Adapter 可以仅使用 MCP 标准探针；不需要额外稳定策略的 MCP Server 保持 SDK 默认行为。

### 稳定算法

1. 创建 Transport Session 并完成 MCP SDK 握手。
2. 在同一 Session 的有界 warm-up 窗口内执行工具发现和 Adapter 健康探针。
3. `Server not initialized` 会重置连续成功计数并按现有 poll 配置退避。
4. 一个 warm-up 窗口始终无法稳定时，销毁该 Transport 并创建新 Session。
5. 达到 Adapter 要求的连续成功条件后才放行 mutation。
6. 所有等待、探针和重连都消费同一个章节总 deadline。
7. Transport 恢复不增加章节业务重试次数；只有总预算耗尽才暂停当前阶段。

Buda 的默认严格门要求工具发现和一个真实只读工具连续成功。具体连续次数和 warm-up 切片使用有界配置及确定性测试，不使用硬编码无限循环。

`notifications/initialized` 兼容覆盖暂时保留。它必须继续局限在 Buda Adapter/兼容策略边界，不能污染通用 Streamable HTTP Transport。只有新的真实协议测试证明 Buda 已稳定支持标准通知后，才能单独移除该覆盖。

## 操作语义和恢复矩阵

| 操作类型 | 示例 | 自动恢复规则 |
| --- | --- | --- |
| 只读 | tools/list、Agent 列表、Drive 读取、Session 状态 | 在总 deadline 内允许等待、重连和重放 |
| 可对账幂等写 | Drive upsert | 先读取并比较内容哈希；一致视为成功，不一致时稳定连接后重试 |
| 明确分发前拒绝 | HTTP 400、JSON-RPC `-32000`、`id: null`、精确 `Server not initialized` | Adapter 明确分类后允许稳定连接并重放 |
| 不确定写入 | 超时、连接重置、响应丢失、5xx、未知协议错误 | 不盲目重放；持久化不确定状态并进入对账/隔离 |
| 明确业务失败 | Agent 不存在、输入非法、输出合同失败 | 不按连接故障重试，返回对应稳定错误 |

这里对“mutation 不自动重放”的既有安全规则只做一个窄化补充：必须同时具备 HTTP/JSON-RPC 证据，证明请求在工具分发前被 MCP 框架拒绝，才能重放。单纯匹配异常 message 不足以分类。任何缺失状态码、错误码、响应 ID 或原始提交边界的错误都按不确定写入处理。

### Session 创建

每个阶段使用完整 prompt 调用 `createSession(..., startRun: true)`，不再先创建空 Session 后发送阶段消息。

- 明确 `not_ready_pre_dispatch`：重新进入稳定连接门后重试创建；
- 已返回 Session ID：先持久化阶段回执，再开始轮询；
- 未返回 Session ID 且结果不确定：不得创建第二个 Session，阶段进入不确定状态；
- Adapter 将来支持按本地 invocation ID 查询远端 Session 时，可以先对账再恢复；没有该能力时保持隔离并暂停。

Session title/message 必须携带有界、去敏后的本地 invocation ID，为人工或未来自动对账提供关联依据。

### Session 轮询

轮询属于只读操作。Transport Session 丢失时可以建立新 Transport，继续读取同一个 Agent Session ID。远端 Agent Session ID 不因 Transport 重连而改变。

### 取消和清理

调用者取消、总时限耗尽或阶段验证失败时，继续使用短独立清理 deadline。已知远端 Session ID 时尝试取消；不能确认终态时进入 `remote_cancel_unknown` 隔离。没有 Session ID 的不确定创建使用 invocation ID 记录，不能伪造可取消的远端身份。

## 错误模型和 UI

新增通用错误码：

```text
MCP_SERVER_NOT_READY
```

它至少携带安全、有界的阶段位置：

```text
phase: transport | drive_sync | session_create | session_poll
```

`Server not initialized` 在预算耗尽后投影为 `MCP_SERVER_NOT_READY`，不再包装成 `MCP_DRIVE_SYNC_FAILED`。只有以下情况使用 `MCP_DRIVE_SYNC_FAILED`：

- Drive 工具明确执行失败；
- 写后读取失败且无法完成对账；
- 远端内容哈希与权威内容不一致。

进度事件新增或细化：

- `mcp_transport_stabilizing`
- `mcp_drive_sync`
- `mcp_session_create`
- `mcp_session_wait`
- `mcp_extract`

进度可以显示阶段名、当前恢复轮次和已耗时，但不得显示 Key、完整 Session ID、完整请求、正文或远端错误正文。

总预算耗尽时：

- 当前阶段暂停；
- 已完成且输入有效的上游阶段保持成功；
- 不重跑上游阶段；
- 不切换模型来源；
- 用户或自动队列恢复时从当前阶段重新进入稳定连接门。

## 兼容迁移

迁移是增量的：

- 新增 `chapter_stage_artifacts` 表和索引；
- 不改写已有章节、章节版本、Review、Story State 或项目绑定；
- 已完成的旧 `mcp_chapter_task` 和共享 Session 记录继续作为历史凭据；
- 新实现不尝试把旧共享 Session 拆成多个虚构阶段 Session；
- 尚在运行或暂停的旧共享 Session 任务不得在新代码下继续追加消息；
- 恢复时先按现有清理/隔离规则终结或协调旧远端 Session，再创建新的本地阶段 invocation；
- 已经安全持久化的正文和 Review 不因迁移删除；没有完整新检查点证据的内存中间结果不猜测恢复。

项目 MCP Server、Key、Agent、可选模型和 GenerationSource 配置保持不变。迁移不得自动回退到模型，也不得自动清除隔离。

## 与现有安全边界的关系

- 来源唯一性和项目绑定 fence 保持不变。
- Agent lease 仍覆盖完整本地章节任务，而不是单个远端 Session。
- Workspace mutation coordinator 和锁顺序保持不变。
- Key 继续以现有明文 JSON 方案保存；本设计不提前实施加密。
- 响应大小、SSE event、JSON 深度、字段数和字符串长度预算继续生效。
- 阶段结果先校验、后写检查点、再允许下游阶段执行。
- 已提交最终正文后，迟到的取消不允许回滚权威状态；继续遵循已确认的标准 HTTP 提交语义。

## 测试策略

实现采用 RED-GREEN-REFACTOR，并使用可注入时钟、Transport 工厂和确定性假 Server。

### Transport 和稳定门

1. 同一 MCP Session 的 `tools/list` 出现 `400 → 200 → 400` 时，稳定门不错误放行。
2. `tools/list` 和真实只读探针达到连续成功条件后才允许 mutation。
3. warm-up 窗口耗尽时关闭旧 Transport 并创建新 Transport。
4. 多轮 Transport 恢复共享同一个章节 deadline。
5. 总预算耗尽返回 `MCP_SERVER_NOT_READY` 和正确 phase。
6. 通用非 Buda MCP Server 不受 Buda 分类器和兼容通知覆盖影响。

### 操作安全

7. 只读操作可以跨 Transport Session 重放。
8. Drive upsert 响应丢失但内容哈希一致时视为成功。
9. Drive 内容不一致时只在完成对账后重试。
10. 精确 HTTP 400/JSON-RPC pre-dispatch 证据允许重试 Session 创建。
11. 超时、连接重置、5xx、响应丢失不允许重放非幂等 Session 创建。
12. 不确定 Session 创建或取消产生正确隔离/回执，且没有第二次 create。

### 独立 Agent Session

13. 每个实际生成阶段调用一次 `createSession(startRun: true)`。
14. 同一章节各阶段返回不同 Session ID。
15. 新链路不调用多阶段 `sendSessionMessage`。
16. 后续阶段 prompt/Drive 包含已验证上游产物，不依赖上一个 Session 聊天记录。
17. 轮询重连继续查询原 Agent Session ID。
18. 一个章节任务仍只持有一个 Agent lease，并在最终成功或安全终态后释放。

### 检查点和恢复

19. 初稿成功、复检失败后，恢复只创建新的复检 Session。
20. 阶段产物必须通过合同验证和哈希验证后才能标记成功。
21. 输入哈希不变时复用本地产物，不访问 MCP 或模型 API。
22. 上下文、来源、绑定、合同或上游产物变化会失效当前及下游阶段。
23. 父 Run 保留同一个 `task_id` 穿过自动退避和进程重启。
24. 最终提交前不得压缩恢复所需产物；提交后只压缩 payload，不丢审计身份。

### 迁移、来源和 UI

25. 旧完成记录保持可读且不被改写。
26. 旧活动共享 Session 不会收到新 stage 消息。
27. MCP 失败不回退到模型 API。
28. 阶段 Session 凭据不会伪装成任务级共享 Session。
29. UI 将 Transport 未就绪与 Drive 内容失败区分显示。
30. 公开错误、进度、Run 和 Artifact 不泄漏 Key、Header、正文或完整敏感错误。

### 真实验收

在确定性测试、完整 Server/Web 测试和构建全部通过后，使用两个独立 Buda 测试账号分别创建全新验收小说并生产第一章。每次真实验收必须证明：

- 项目来源始终是 MCP；
- 没有模型 fallback；
- 每个实际生成阶段有独立远端 Session ID；
- 已完成阶段没有因下游失败重复生成；
- 最终正文、复检/修订结果和 Story State 成功落库；
- 任务结束后无未协调隔离；
- 测试账号、Key、正文和完整 Session ID 不出现在终端失败输出或提交中。

真实验收受一个明确全局 deadline 约束，不在 CI 中运行，也不绕过生产退避策略。

## 非目标

- 修复或推测 Buda 服务端内部实现。
- 用独立 Agent Session 代替 MCP Transport 恢复。
- 迁移 Express 到 `Bun.serve()`。
- 改变已确认的客户端取消后标准 HTTP 提交语义。
- 自动切换 GenerationSource。
- 并发使用同一个 Agent 生成多个章节。
- Key 静态加密。
- 在没有远端对账能力时自动重放结果不确定的 Session mutation。
- 把 Buda 长期记忆提升为 MangaForge 权威记忆。

## 验收标准

- 所有实际生成阶段各自使用独立远端 Agent Session。
- 本地章节任务、来源和 Agent lease 仍贯穿整个章节链。
- MangaForge 可在总时限内自动恢复 Buda Transport 未就绪抖动。
- 明确分发前拒绝可安全重试，不确定写入绝不盲目重放。
- 阶段失败后可以从最近有效本地检查点恢复，不重复上游生成。
- `MCP_SERVER_NOT_READY`、`MCP_DRIVE_SYNC_FAILED` 和不确定 mutation 错误边界准确。
- 通用 MCP Runtime 不依赖 Buda 工具名；Buda 差异局限在 Adapter 稳定策略。
- MCP 与模型 API 对章节工作流暴露一致的单次 Generation Invocation 语义。
- 完整自动化测试、构建和两个账号的真实 Buda 验收均通过。
