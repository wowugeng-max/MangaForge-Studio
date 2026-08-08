# Buda 标准 MCP 握手恢复设计

日期：2026-08-08

## 背景

MangaForge 当前对 `adapter_id=buda` 的 Streamable HTTP 连接使用专用 Transport，跳过标准 MCP 握手中的 `notifications/initialized`。该兼容逻辑用于适配 Buda 过去会拒绝 initialized 通知的行为。

真实页面验收发现，Buda 当前服务已经恢复标准握手语义：旧 Transport 有时允许首次工具请求，但随后会返回精确的 HTTP 400 / JSON-RPC `-32000` / null response id / `Server not initialized`，导致 Agent 列表、项目绑定和后续章节链无法稳定执行。

同一端点、同一 API Key 的只读对照证明：使用标准 `StreamableHTTPClientTransport` 完成 initialized 通知后，工具发现成功，连续两次调用 `api_claw_list_api_agents` 均成功。Buda 设置页也明确将其端点描述为标准 MCP Streamable HTTP 服务，并支持 Bearer API Key。

后续真实页面复验进一步发现一个独立的远端就绪竞态：`initialize` 已返回 HTTP 200 和 `Mcp-Session-Id`，但 SDK 紧接着发送的标准 `notifications/initialized` 偶发得到 HTTP 400 / JSON-RPC `-32000` / null response id / `Bad Request: Server not initialized`；成功样本的同一通知返回 202。失败发生在任何工具发现、Drive 或 Session mutation 之前，且相同请求有时成功、有时失败，证明标准协议顺序正确，但远端 Session 状态在初始化响应之后存在短暂传播窗口。

## 已确认的根因

- 失败发生在 MCP 协议握手层，不是 Bun/Express 请求完整接收后的方案 A。
- Buda 不要求用户先在网站内另建一个 MCP 服务；API Key + Bearer Header 即可连接公共 MCP 端点。
- 账号、Key 和 Agent 均有效；标准握手对照可以连续调用远端工具。
- 当前 Buda 专用 Transport 跳过 initialized 通知，已成为过期兼容逻辑。
- 单纯重启本地服务只能清空旧 Client 缓存，不能修复下一次非标准握手产生的未初始化状态。
- 删除旧 Transport 后，标准 initialized 通知仍会偶发撞上远端 Session 就绪传播窗口；这不是旧握手回归，也不是 Bun/Express 请求语义问题。
- SDK 的 Streamable HTTP SSE 重连策略不覆盖 initialized 通知的 HTTP 拒绝，因此该精确、未派发的握手通知需要在通用 Transport 边界获得有界重试。

## 目标

1. 让 Buda 与其他 Streamable HTTP MCP 服务一样完成标准 initialized 握手。
2. 删除 Buda 专用 Transport 分支，保持通用 MCP Client 的协议行为一致。
3. 恢复页面 Agent 列表、项目 MCP 绑定以及章节材料/正文独立 Session 链路。
4. 保留现有精确 `server_not_initialized` 证据投影、mutation 重放围栏和错误脱敏。
5. 保持模型 API GenerationSource 的所有既有行为不变。
6. 对 initialized 通知的精确远端未就绪拒绝提供短时、有界、provider-neutral 的同 Session 重试。

## 非目标

- 不改变 Buda Adapter 的工具映射、参数构造、Drive 文件格式或 Session 轮询协议。
- 不增加 Buda 品牌逻辑到通用生产服务。
- 不增加标准握手失败后的旧协议回退。
- 不因 initialized 竞态重建整条 MCP 连接或创建额外远端 Session。
- 不重试其他通知、普通请求、工具调用、鉴权失败或近似错误文本。
- 不修改项目唯一 GenerationSource、章节任务来源租约或材料/正文独立 Session 设计。
- 不加密 MCP Key；Key 加密仍是项目后期目标。
- 不自动创建、删除或迁移远端 Agent。

## 方案选择

采用方案 A：删除 Buda 专用的 initialized-notification 抑制逻辑，所有 Streamable HTTP MCP Server 统一执行 SDK 标准握手；在标准 Transport 的通用边界，仅为 `notifications/initialized` 的精确、未派发 `server_not_initialized` 拒绝增加同 Session 有界重试。

通用 Transport 最多发送三次同一个 initialized 通知：首次失败后等待 50ms，第二次仍收到相同精确拒绝时等待 150ms，再执行最后一次。成功立即停止；请求取消、Transport 关闭、预算外错误或第三次失败均原样进入现有安全错误投影。重试复用 SDK Transport 已保存的 `Mcp-Session-Id`，不重新发送 `initialize`，也不创建新连接。

未采用的方案：

- 标准握手失败后回退旧握手：会形成双协议状态机，使 mutation 的发送边界更难证明，也会掩盖服务端协议回归。
- 保留旧握手并为每次工具调用重建连接：增加连接成本，继续依赖非标准行为，且无法保证工具发现与调用落在同一个已初始化会话。
- 重试整条标准握手：会创建额外远端 Session，且新的 initialized 通知仍可能撞上相同竞态。
- 对所有 MCP 服务固定延迟后只发送一次 initialized：无条件增加连接延迟，仍不能对远端就绪波动提供明确上限。

## 修改边界

生产代码只修改 MCP Client 的通用 Streamable HTTP 握手边界：

- 删除 `BudaStreamableHTTPClientTransport`。
- `defaultSdkFactory.createTransport` 不再检查 `adapter_id`，始终创建同一种 provider-neutral 标准 Transport。
- 通用 Transport 继承 SDK `StreamableHTTPClientTransport`，仅覆写 `send` 以识别 initialized 通知和现有精确 `server_not_initialized` 失败证据；所有 Header、Session、认证、请求和响应处理仍由 SDK 原生实现负责。
- 重试等待受请求取消约束，且总固定等待上限为 200ms。

测试代码只调整和补充握手契约：

- 将原“Buda 不发送 initialized 通知”测试改为“Buda 使用标准 initialized 通知”。
- 断言 Buda 与 provider-neutral 服务均使用同一个通用标准 Transport，不存在 Adapter 分支。
- 增加 initialized 后连续工具调用的回归覆盖，证明一个连接可以完成工具发现和多次调用。
- 增加第一次 initialized 精确未就绪、第二次成功的回归覆盖，并断言复用同一 Session、没有第二次 `initialize`。
- 增加非精确 400、鉴权失败、普通工具请求和重试耗尽均不获得 initialized 重试的负向覆盖。
- 保留所有精确未初始化证据、非精确错误不重放、响应预算和秘密脱敏测试。

## 数据流

1. MCP Client 使用项目绑定的 Server、账号 Key 和自定义 Header 创建标准 Streamable HTTP Transport。
2. SDK 发送 `initialize`。
3. Buda 返回协议版本、能力和 Session 信息。
4. SDK 发送 `notifications/initialized`。
5. 若远端返回精确的未派发 `server_not_initialized`，通用 Transport 在同一 Session 内按 50ms、150ms 有界等待重试；其他结果不重试。
6. initialized 成功后，Client 执行 `tools/list` 并缓存有界、脱敏后的工具描述。
7. Adapter 按现有逻辑解析工具并执行 Agent、Drive、Session 操作。

Adapter、GenerationSource、章节任务与数据库写入链路均不感知 Transport 改动。

## 错误与安全边界

- 只有标准握手成功后 Client 才进入 Ready。
- 现有 `McpError` 投影继续只保留有界失败证据，不泄露远端错误原文、Key、正文或完整远端身份。
- 精确的 HTTP 400 / JSON-RPC `-32000` / null response id / `server_not_initialized` 仍可被稳定性控制器识别为未派发；其他近似错误不得获得 mutation 重放资格。
- initialized 重试只发生在无业务 mutation 的握手通知上；工具调用和章节 mutation 的既有不重放边界不变。
- 每次重试使用同一 Transport 和 Session Header；不会通过新建 Session 掩盖远端状态，也不会改变 Agent/Drive/章节 Session 的唯一性语义。
- 不提供旧握手回退，避免在一次 mutation 中切换协议并产生不确定发送状态。
- 生产代码保持 provider-neutral；Buda 只保留在专用 Adapter 的工具语义层，不再进入通用 Transport 选择。

## 测试设计

1. Buda Server 使用 SDK `StreamableHTTPClientTransport` 的标准协议实现，并通过通用握手边界包装提供就绪竞态容错。
2. Buda 握手方法顺序为 `initialize`、`notifications/initialized`、`tools/list`。
3. initialized 首次得到精确未就绪拒绝时，在同一 Session 内重试并成功；请求序列中只有一次 `initialize`。
4. 非精确错误、其他 JSON-RPC 方法和重试耗尽不会被错误重试。
5. initialized 通知得到成功响应后，连续两个只读工具调用都成功。
6. provider-neutral MCP 的标准握手测试继续通过。
7. Bearer Header、工具 allowlist、响应体预算、SSE 预算和秘密脱敏测试继续通过。
8. 精确 `server_not_initialized` 证据继续被安全投影，远端文本不进入错误响应。
9. Buda Adapter、Runtime、GenerationSource 与完整 Server/Web 回归继续通过。

## 真实页面验收

完成确定性测试后，使用用户授权的两组测试账号从页面执行：

1. 两个不同的新小说项目分别绑定不同 MCP 账号和已有远端 Agent。
2. 页面明确显示唯一来源为 MCP，API 路径停用且不要求模型 ID。
3. 第一章缺失材料通过页面自动补齐，刷新世界观、至少两张角色卡、设定工坊、usage、Story State/preflight 和材料分。
4. strict preflight ready 后从页面生成第一章正文。
5. 材料任务与正文任务不同，真实 Session 不同，来源均为 MCP。
6. 隔离数量不增加；任何不确定 mutation 都停止并读取本地权威状态后再决定。

验收证据只记录本地 project/task ID、source type、材料数量/分数、终态和脱敏 Session 后缀，不记录账号、密码、Key、完整远端身份、远端错误原文或正文。

## 验收标准

- Focused MCP Client 测试先因缺少 initialized 就绪竞态容错而失败，修改生产代码后转绿。
- GenerationSource + MCP、完整 Server、完整 Web 和 `bun run check` 全绿。
- 两组真实页面验收均完成材料补齐与第一章正文生成。
- 每组材料任务和正文任务使用不同 Session，且全程保持项目唯一 MCP 来源。
- 模型 API 回归保持通过。
- 工作区最终只保留用户原有的两个受保护未暂存文件，提交与推送不包含凭据或真实正文。
