# Key Monitor 显式启用设计

## 目标

禁止 MangaForge 在服务启动、用户进入小说项目或后台定时周期中默认发起真实模型探测请求，同时保留用户主动测试 Key/模型的能力。

## 根因

服务入口当前以默认开启方式调用 `startKeyMonitor()`。Monitor 启动后立即运行，并每小时再次运行；检测会选择真实聊天模型，发送最小提示词请求，因此会产生真实供应商调用。该任务与小说项目页面无直接调用关系，但容易在进入页面时恰好发生。

## 方案

自动 Key Monitor 改为显式 opt-in：

- 未设置 `KEY_MONITOR_ENABLED` 时不启动。
- `KEY_MONITOR_ENABLED=true` 时启动，保持当前“立即检测 + 每小时检测”行为。
- `KEY_MONITOR_ENABLED=false` 或其他非 `true` 值时不启动。
- `KEY_MONITOR_INTERVAL_MS` 只在 Monitor 显式开启时生效。
- `/api/keys/:id/test`、`/api/models/:id/test` 等手动测试接口保持不变。
- 小说项目页面加载逻辑不增加任何模型检测请求。

## 实现边界

- 在服务启动配置边界集中解析是否启用 Monitor，避免改变 `checkKeysOnce()`、探测协议和手动测试逻辑。
- 提取可测试的布尔解析函数或启动配置函数，避免通过启动真实 HTTP Server 验证环境变量。
- 不修改用户的 `workspace/providers.json`、`workspace/keys.json` 或模型配置。

## 测试

- 环境变量缺失时，启动配置返回 `enabled=false`。
- 只有大小写无关的字符串 `true` 启用自动 Monitor。
- `false`、空字符串和其他值均保持关闭。
- `startKeyMonitor({ enabled:false })` 不立即探测，也不创建周期探测。
- 显式 `enabled:true` 的既有行为保持通过。
- Server 构建与 Key Monitor/Key route 测试通过。

## 验收标准

1. 正常启动服务后，至少一个默认检测周期内不会因为 Key Monitor 发出供应商请求。
2. 进入小说项目不会触发自动 Key 探测。
3. 用户手动测试 Key 或模型仍会发起明确的测试请求。
4. 显式设置 `KEY_MONITOR_ENABLED=true` 后可恢复后台检测。
