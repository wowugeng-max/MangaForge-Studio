# Buda 章节烟测有界恢复编排设计

日期：2026-08-05

## 背景

Buda 真实章节烟测当前只在创建章节群后调用一次 `execute`，随后持续轮询 run 状态。正式章节群执行器遇到可重试失败时，会把当前章节和父 run 写成 `ready`，同时写入 `next_run_at`，等待调用方在退避窗口结束后再次调用原 `execute`。烟测没有执行这一步，因此会把可恢复状态放大成 30 分钟的 `SMOKE_TIMEOUT`。

最近一次真实运行还证明了另一条必须保留的安全边界：Buda Session 已创建，但 draft 发送结果不确定，任务进入 `MCP_SEND_UNKNOWN` 并写入隔离记录。在这种状态下，任何自动重放都可能造成远端重复执行，烟测必须立即停止。

这项工作只修复 Buda 专用验收烟测的恢复编排和错误报告，不尝试修复 Buda 的认证后 MCP Session/工具调用稳定性。

## 已确认的事实

- Buda 公共 MCP 端点在线；故障发生在认证后的 MCP Session/工具调用链。
- 真实失败曾分别出现在 Agent 列表、Drive 同步、工具超时和 Session 消息发送边界。
- 正式生产服务已经定义 `ready + next_run_at + 再次 execute` 的恢复契约。
- `send_unknown` 和 `remote_cancel_unknown` 必须依赖隔离与显式协调，不能自动重放。
- 当前烟测的一个全局 deadline 必须继续覆盖所有 HTTP、等待和轮询。

## 目标

1. 让 Buda 专用章节烟测遵守正式生产的退避恢复契约。
2. 在无隔离的可恢复失败后，等待 `next_run_at` 到期并再次调用原 `execute`。
3. 将总 `execute` 次数限制为三次：首次执行加两次恢复执行。
4. 在隔离、非法恢复状态或重试耗尽时立即返回明确且安全的错误码。
5. 保持现有正文、复检/修订、Story State、来源身份、解锁和最终隔离断言不变。

## 非目标

- 不修改正式章节生产服务、run-queue worker 或重试退避算法。
- 不调用 `retry-now`，不清空或缩短 `next_run_at`。
- 不修改通用 MCP Runtime、客户端、Adapter 或 Buda 协议兼容逻辑。
- 不自动协调、清除或强制解除 MCP 隔离。
- 不新增模型 fallback，也不改变章节任务的唯一 GenerationSource。
- 不再次执行真实 Buda 生成；本项先通过确定性本地测试完成。

## 方案选择

采用烟测内部的有界恢复状态机。

未采用的方案：

- run-queue worker：会引入后台 worker 生命周期、停止控制和额外异步状态，不适合作为确定性验收入口。
- 正式生产服务内部定时重试：会改变所有章节生产行为，范围超出烟测缺陷。
- `retry-now`：会绕过生产退避策略，不能证明真实恢复契约有效。

## 修改边界

只修改：

- `scripts/check-buda-chapter-task-session.mjs`
- `scripts/check-buda-chapter-task-session.test.ts`

烟测继续只通过公开 HTTP API 工作，不直接读取 SQLite、MCP store 或凭据文件。

## 恢复状态投影

现有 run 投影只读取父 run 的身份和状态。新投影在保持有界、拒绝 Proxy/访问器和 fail-closed 的前提下，额外读取恢复所需的最小字段：

- 父 run：`id`、`project_id`、`run_type`、`status`
- group：`current_index`
- 当前章节：`id`、`status`、`attempts`、`next_run_at`

投影不得返回正文、错误原文、提示词、Session、完整 provider 身份或其他 `output_ref` 内容。`output_ref` 仍受现有 HTTP 响应体上限约束；解析后只保留上述安全字段。

`ready` 恢复状态必须同时满足：

- 当前章节 ID 等于验收目标章节；
- 当前章节状态为 `ready`；
- `attempts` 是有界非负安全整数；
- `next_run_at` 是非空、可解析的 ISO 时间；
- 相同 run 的 `attempts` 不得回退。

否则返回 `INVALID_RUN_RECOVERY_STATE`。

## 状态机

1. 读取并固定项目 GenerationSource 权威身份。
2. 确认目标章节没有正文。
3. 在创建自动章节群前确认隔离列表为空。
4. 创建章节群并执行第一次 `execute`。
5. 进入恢复循环：
   - `success`：退出循环，继续现有回执、正文、人工复检和 Story State 验收。
   - `failed`、`canceled`、`paused`：按现有终态错误立即失败。
   - `running` 或 `queued`：按现有轮询间隔继续等待。
   - `ready`：投影并验证恢复状态；在任何重放前重新读取隔离列表。
6. `ready` 且存在隔离：返回 `MCP_QUARANTINE_REMAINS`，不再调用 `execute`。
7. `ready` 且无隔离：等待到 `next_run_at`；等待时间与所有 HTTP 调用继续受同一个全局 deadline 限制。
8. 退避窗口到期后：
   - 若已经执行三次，返回 `AUTOMATIC_RETRY_LIMIT_EXHAUSTED`；
   - 否则再次调用同一个章节群的原 `execute`，然后回到恢复循环。
9. 成功后继续现有自动/人工 Task、Session、来源身份、正文、Story State、解锁和最终零隔离断言。

烟测不调用 `retry-now`，也不传入新的 `retry_limit`；正式执行器仍是重试资格和退避时间的权威来源。三次上限只是烟测自身的第二道有界保护。

## 错误码

- `MCP_QUARANTINE_REMAINS`：自动任务前或恢复执行前存在未协调隔离。
- `INVALID_RUN_RECOVERY_STATE`：`ready` 状态缺少安全恢复字段、字段非法或 attempts 回退。
- `AUTOMATIC_RETRY_LIMIT_EXHAUSTED`：三次 `execute` 后仍返回可恢复状态。
- `AUTOMATIC_RUN_FAILED`、`AUTOMATIC_RUN_CANCELED`、`AUTOMATIC_RUN_PAUSED`：保留现有终态映射。
- `SMOKE_TIMEOUT`：只有全局 deadline 真正耗尽时使用。

终端失败输出继续保持 `{ ok: false, stage, error_code }` 的安全形状，不增加远端错误文本、身份字段或运行内容。

## 测试设计

新增或调整确定性测试：

1. 第一次 `execute` 后直接成功，只发送一次执行请求。
2. `ready` 的 `next_run_at` 在未来：等待到窗口后再次执行并成功。
3. `next_run_at` 已到期：不额外等待，立即再次执行。
4. 连续两次可恢复失败，第三次成功。
5. 第三次执行后仍为 `ready`：返回 `AUTOMATIC_RETRY_LIMIT_EXHAUSTED`，不发送第四次请求。
6. 恢复执行前出现隔离：返回 `MCP_QUARANTINE_REMAINS`，断言没有第二次执行。
7. 自动任务开始前已有隔离：不创建章节群。
8. `ready` 缺少章节、章节 ID 不匹配、非法/空 `next_run_at`、非法 attempts：返回 `INVALID_RUN_RECOVERY_STATE`。
9. attempts 回退：fail-closed。
10. `failed`、`canceled`、`paused`：立即失败且不重试。
11. 等待 `next_run_at` 时耗尽全局 deadline：返回 `SMOKE_TIMEOUT`。
12. 恶意 Proxy、访问器、超大响应体和停滞响应仍受现有防护。
13. 成功输出及失败输出仍不包含凭据、正文、提示词、完整 Session、完整 fingerprint 或 provider 身份。

测试通过可注入时钟/等待端口或等价的确定性依赖控制时间，不使用真实长时间 sleep。

## 安全与兼容性

- 状态机只存在于 Buda 专用 smoke；通用 MCP 层保持 provider-neutral。
- 所有恢复执行都复用原章节群和原公开 `execute` 路由。
- 隔离检查位于每次可能重放的 mutation 之前。
- 任何无法证明安全的状态都停止，不推断远端 mutation 是否成功。
- 用户现有 `workspace/assets.json` 修改和受保护 MCP 凭据文件不进入提交。

## 验收标准

- 确定性烟测单测全部通过。
- Focused Server、完整 Server/Web 测试和构建继续通过。
- 可恢复 `ready + next_run_at` 不再被纯轮询放大为超时。
- `send_unknown`/隔离状态在下一次 mutation 前被阻断。
- 不改变正式章节生产和通用 MCP 行为。

## 后续工作

本设计完成后，Buda MCP 传输兼容应作为独立问题处理。该后续工作需要分析当前 Buda 认证后 MCP Session 生命周期、标准 `initialized` 通知兼容性和客户端连接复用策略，并在显式协调现有隔离后安排单独的真实验证。
