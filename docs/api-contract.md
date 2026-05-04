# API 契约草案

## 目标

定义前端 UI 与统一 Bridge/API 层之间的最小稳定协议，先统一语言，再做实现。

---

## 通用约定

### Base URL
- `GET /api/status`
- `GET /api/workspace`
- `POST /api/workspace/switch`

### 错误格式
```json
{
  "error": "message",
  "detail": "optional detail"
}
```

---

## 1. 项目

### `GET /api/projects`
返回项目列表。

### `POST /api/projects`
创建项目。

### `GET /api/projects/:id`
获取项目详情。

### `PUT /api/projects/:id`
更新项目。

### `DELETE /api/projects/:id`
删除项目。

---

## 2. 资产

### `GET /api/assets`
返回资产列表，可按 project/type 过滤。

### `GET /api/assets/:id`
返回单个资产详情。

### `POST /api/assets`
创建资产。

### `PUT /api/assets/:id`
更新资产。

### `DELETE /api/assets/:id`
删除资产。

---

## 3. 画布

### `GET /api/canvas/:projectId`
获取画布状态。

### `PUT /api/canvas/:projectId`
保存画布状态。

### `POST /api/canvas/:projectId/run`
运行当前画布/工作流。

### `POST /api/canvas/:projectId/interrupt`
中断运行中的任务。

---

## 4. Pipeline / Agent

### `POST /api/pipeline/init`
### `POST /api/pipeline/plot`
### `POST /api/pipeline/storyboard`
### `POST /api/pipeline/promptpack`
### `POST /api/pipeline/export`
### `POST /api/pipeline/run-all`
### `POST /api/pipeline/interrupt`

这些接口是 restored-src 执行链的统一映射。

---

## 5. Keys / Providers / Models

### `GET /api/keys`
### `POST /api/keys`
### `PUT /api/keys/:id`
### `DELETE /api/keys/:id`

### `GET /api/providers`
### `POST /api/providers`
### `PUT /api/providers/:id`
### `DELETE /api/providers/:id`

### `GET /api/models`
### `POST /api/models/sync`

---

## 6. Workspace / Files

### `GET /api/workspace`
返回当前 workspace 信息。

### `POST /api/workspace/switch`
切换 workspace。

### `GET /api/files?path=...`
读取受控文件内容。

### `GET /api/download?path=...`
下载受控文件。

### `GET /api/bundle?episodeId=...`
下载整集交付包。

---

## 7. 状态 / 日志 / 运行历史

### `GET /api/status`
返回项目总状态。

### `GET /api/runs`
返回运行历史。

### `GET /api/logs`
返回日志摘要或最近日志。

---

## 请求体草案示例

### 创建项目
```json
{
  "name": "夜雨巷",
  "description": "都市悬疑漫画项目"
}
```

### 切换 workspace
```json
{
  "workspace": "/absolute/path/to/workspace/proj_001"
}
```

### Run All
```json
{
  "projectId": "proj_001",
  "episodeId": "ep-002",
  "title": "新章节",
  "premise": "..."
}
```

---

## 待确认项

- project / asset / task / run 的最终字段
- 返回值是否统一包一层 `data`
- 是否支持分页和过滤参数
- 是否需要 WebSocket 推送运行状态
