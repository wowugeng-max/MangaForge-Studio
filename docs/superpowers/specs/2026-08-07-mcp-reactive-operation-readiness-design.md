# MCP 响应式操作就绪设计

日期：2026-08-07

## 背景

MangaForge 已将章节生产链中的实际生成阶段统一为一次 `GenerationInvocation`：正文、复检、修订和其他实际调用 GenerationSource 的阶段分别创建独立远端 Agent Session；本地章节任务、来源绑定、上下文和 Agent lease 继续贯穿完整章节生产链。

真实 Buda 验收进一步证明：Buda MCP Transport 在 `initialize` 成功后仍可能间歇返回带精确协议证据的 `Server not initialized`。跨工具 readiness 成功没有预测性：一次 `tools/list` 或 `listAgents` 成功，不能保证紧接着的真实操作也成功。当前稳定控制器在每个读写操作前执行完整 readiness 探针，并在可恢复错误后再次探针。这会重复调用同一组不具预测性的跨工具检查，显著消耗章节总 deadline；真实任务曾完成 Drive 同步和远端 Session 创建，但因前置探针耗时最终未能在总预算内取回正文。

早期正文链路没有这层重复操作前探针，因而能够完成真实调用。问题不在 MCP 工具参数的 `params/query/body` 结构，也不在已确认的 Express 标准 HTTP 提交语义，而在稳定策略对该服务实际就绪特征的建模不准确。

本设计是对《MCP 独立阶段 Session 与稳定恢复设计》的小范围增量：保留阶段入口的一次完整 readiness gate，同时允许 Adapter 声明后续操作采用响应式恢复，避免把 Buda 特性硬编码进通用控制器。

## 已确认决策

- 采用通用 Stability 能力加 Adapter 专用配置的方案。
- 通用 MCP 默认保持现有主动操作前探针行为。
- Buda Adapter 使用响应式操作就绪模式。
- 每个 Buda 章节阶段开始时仍执行一次完整、无副作用 readiness gate。
- readiness gate 通过后，真实操作不再各自重复执行前置探针。
- 只有精确证明请求未派发的拒绝可以直接重试原操作。
- 超时、断连、5xx 和响应丢失等不确定 mutation 禁止由稳定层重放。
- Drive mutation 继续使用写后读取和内容哈希对账；只有远端状态证明允许时才由业务层决定重试。
- MCP 仍是章节任务的唯一 GenerationSource，不回退到模型 API。
- 正文、复检、修订及其他实际生成阶段继续使用相互独立的远端 Agent Session。

## 方案比较

### A. 维持主动探针并增加总超时

实现最小，但重复探针仍然不能预测下一次 Buda 工具调用是否成功，只会扩大延迟和资源消耗。它掩盖错误模型，不解决根因。

### B. 对所有 MCP Server 移除操作前探针

可以减少调用次数，但会无条件改变已接入及未来通用 MCP Server 的稳定语义。没有证据表明所有服务都具有 Buda 相同的就绪抖动，不符合兼容性要求。

### C. Adapter 可选的响应式操作就绪模式

通用稳定层提供显式策略，默认行为不变；Buda 仅通过自身 Adapter 配置启用。阶段入口仍有完整安全门，后续恢复直接依据真实操作的结果。该方案既减少无效探针，也维持通用边界和 mutation 安全性，因此采用此方案。

## 策略接口

在 `McpStabilityPolicy` 增加可选字段：

```ts
type McpOperationReadinessMode = 'proactive' | 'reactive'

type McpStabilityPolicy = {
  operationReadinessMode?: McpOperationReadinessMode
  requiredConsecutiveSuccesses: number
  warmupWindowMs: number
  classify(error: unknown, operation: McpOperationKind): McpFailureClass
  probe(client: McpClientPort, options: McpAdapterOperationOptions): Promise<void>
}
```

兼容规则：

- 字段缺失等价于 `proactive`。
- 通用控制器只解释模式和失败类别，不读取 Adapter ID、工具名或服务错误字符串。
- `ensureReady()` 的公开语义不因模式改变；任何显式调用仍执行完整 readiness gate。
- 模式只控制 `runRead()` 和 `runMutation()` 是否为每次真实操作自动执行前置 gate，以及可恢复错误后的恢复顺序。

Buda Adapter 的策略设置为：

```ts
operationReadinessMode: 'reactive'
```

其精确错误分类、无副作用探针、warm-up 窗口和成功条件继续由 Buda Adapter 自己提供。

## 稳定控制器行为

### 主动模式

主动模式保持当前行为：

1. 每次 `runRead()` 或 `runMutation()` 先调用 `ensureReady()`。
2. 可安全恢复的错误退避后重新建立 readiness，再重试真实操作。
3. 不可安全重放的错误立即抛出。

这也是未声明模式的默认路径，避免现有或未来通用 MCP Adapter 被隐式改变。

### 响应式模式

响应式模式执行真实操作前不自动调用 `ensureReady()`。它根据真实操作失败类别处理：

| 失败类别 | 读操作 | mutation |
| --- | --- | --- |
| `not_ready_pre_dispatch` | 在同一总 deadline 内退避，直接重试原操作 | 在同一总 deadline 内退避，直接重试原操作 |
| `transient_read_failure` | 失效当前 Transport，重新获取连接并通过 readiness gate，然后重试 | 不适用；按不确定 mutation 处理 |
| `ambiguous_write_failure` | 不适用 | 原样抛出，稳定层不重放 |
| `terminal_failure` | 原样抛出 | 原样抛出 |

`not_ready_pre_dispatch` 必须来自 Adapter 的精确协议证据，证明服务在派发工具前拒绝了请求。仅凭错误消息中出现 `Server not initialized`、HTTP 5xx、超时或连接断开，不能归入该类别。

所有退避、重连、探针和真实调用继续消费同一个 `McpGenerationDeadline`。预算耗尽继续映射为带当前 phase 的 `MCP_SERVER_NOT_READY`；调用方取消继续保留 `MCP_CANCELLED`。

## Buda 阶段调用链

每个 `invokeChapterStage()` 执行：

1. 在阶段入口显式调用一次 `ensureReady()`，完成工具发现和 Buda 无副作用健康探针。
2. 解析工具并校验绑定 Agent；这些真实读操作由响应式 `runRead()` 执行，不再各自追加前置探针。
3. 构建本阶段完整权威 Drive snapshot。
4. Drive 列举、读取、写入和写后校验通过响应式稳定包装执行。
5. 创建本阶段独立 Agent Session；精确未派发拒绝可以直接重试，不确定发送结果禁止重放。
6. 通过响应式只读轮询查询同一个远端 Session 到终态。
7. 提取并验证阶段输出合同，返回本阶段自己的 Session 凭据。

初始项目绑定 Agent 校验同样使用 Adapter 策略：在 Buda 响应式模式下，若真实 `listAgents` 得到精确未派发拒绝，则退避并直接重试 `listAgents`，不先执行另一次跨工具探针。

阶段入口 gate、Transport 丢失后的恢复 gate，以及 Drive 已完成远端对账后确有必要的恢复，不属于“每次操作前重复探针”，继续保留。

## mutation 安全边界

稳定控制器只允许重试明确的 `not_ready_pre_dispatch`，因为该证据表示工具没有被派发。以下错误始终视为结果不确定，不由稳定层重放：

- 请求或工具超时；
- 连接重置、断流或响应丢失；
- HTTP 5xx；
- 无结构化协议证据的错误消息；
- 已收到或可能收到远端 mutation 的其他错误。

Drive 写入具有独立的业务级对账能力：写入异常后读取同一路径，内容完全一致则视为成功；读取成功且内容明确不一致时，业务层可以在既有上限内安全重试；无法读取或无法确认状态时保留原始不确定错误。Session 创建没有按 invocation ID 查询已创建 Session 的可靠对账端口，因此不确定创建结果继续进入隔离流程，绝不创建第二个 Session。

## 错误和可观测性

- 现有 `McpFailureClass`、公开错误码和进度事件保持不变。
- 稳定进度继续只暴露 phase、恢复轮次和耗时，不包含远端错误正文、Key、Header、Agent ID 或完整 Session ID。
- `MCP_SERVER_NOT_READY` 表示总预算内无法恢复 MCP 就绪。
- `MCP_DRIVE_SYNC_FAILED` 只表示 Drive 内容同步或验证失败，不再被冗余 readiness 探针错误放大。
- 不确定 mutation 继续写入既有 receipt/quarantine；本设计不自动清理历史隔离记录。

## 测试设计

实现采用 RED-GREEN-REFACTOR。

### Stability 单元测试

1. 未声明模式时保持当前主动 gate 和恢复行为。
2. 响应式模式下，成功的读写操作前，稳定控制器不调用 probe 或主动轮换 Transport。
3. 响应式读操作收到精确 `not_ready_pre_dispatch` 后退避并直接重试原操作。
4. 响应式 mutation 收到精确 `not_ready_pre_dispatch` 后可以直接重试，且不插入 probe。
5. 响应式只读断连会失效 Transport、重新通过 readiness gate，再重试读操作。
6. 响应式 mutation 的超时、断连、5xx 和消息型错误均只调用一次。
7. 所有响应式退避和恢复共享总 deadline，并保留取消与超时的类型化错误。

### Buda Adapter 回归测试

8. Buda 策略显式声明 `reactive`，其他策略字段和探针合同保持正确。
9. 一个阶段只执行一次入口 readiness gate，后续成功操作没有重复前置 gate。
10. Agent 校验、Drive、Session 创建和轮询使用响应式稳定包装。
11. 精确未派发错误可恢复；不确定 Session 创建仍只调用一次并产生正确回执。
12. Drive 写入继续先对账后决定是否重试。

### 集成与真实验收

13. GenerationSource、Buda Adapter、Stability 测试及 Server build 全部通过。
14. 完整项目门禁通过，且通用非 Buda MCP 行为无回归。
15. 使用两个独立测试账号分别创建全新测试小说并生产第一章。
16. 每次真实验收核对唯一来源为 MCP、无模型 fallback、实际阶段 Session 相互独立、正文和阶段结果落库。
17. 远端终态核对后再处理本次测试产生的隔离记录；不得自动清理既有 quarantine。

真实验收输出和提交不得包含测试账号、密码、Key、Agent ID、完整远端 Session ID、远端完整错误体或生成正文。

## 非目标

- 修改 MCP 工具的 `params/query/body` 参数结构。
- 修复或推测 Buda 服务端内部实现。
- 为通用控制器添加 Buda ID、工具名或错误字符串判断。
- 取消每个章节阶段入口的完整 readiness gate。
- 重用远端 Agent Session 或把 Agent 记忆提升为小说权威记忆。
- 迁移 Express 到 `Bun.serve()`。
- 改变已确认的标准 HTTP 提交语义。
- 自动切换 GenerationSource 或回退模型 API。
- 自动清理历史 quarantine。
- 本阶段实施 Key 静态加密。

## 验收标准

- Buda 阶段开始仍有一次完整无副作用 readiness gate。
- gate 通过后的每个真实操作不再重复执行跨工具前置探针。
- 精确未派发拒绝直接重试原操作；不确定 mutation 绝不由稳定层重放。
- Transport 丢失后的只读恢复仍会轮换连接并重新验证 readiness。
- 默认通用 MCP 行为保持兼容，通用代码不依赖 Buda 身份或工具定义。
- 正文、复检、修订等实际阶段继续使用独立远端 Agent Session 和唯一 MCP 来源。
- 自动化测试、构建及两个账号的真实 Buda 验收全部通过。
