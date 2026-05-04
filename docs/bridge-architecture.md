# Bridge 层设计草案

## 目标

`ui/server` 作为统一的 Bridge / BFF 层，负责把前端 UI 的意图翻译成 restored-src 的 agent / task / tool 执行，并对外提供稳定、统一的 API。

---

## 设计原则

1. **前端只认一个入口**
   - 所有页面只请求 `ui/server`
   - 禁止前端直接依赖 restored-src 内部模块

2. **核心能力不下沉到前端**
   - agent 编排、任务调度、会话恢复、权限、中断逻辑都留在后端

3. **数据读写统一到 workspace**
   - Bridge 层负责读写 workspace 目录
   - 前端通过 API 读写，不直接碰文件系统

4. **渐进式接入**
   - 先做 API 契约与 mock 实现
   - 再接 restored-src 的真实能力
   - 最后收敛旧入口

---

## `ui/server` 的职责

### 1. API 聚合
将前端页面需要的数据统一聚合后返回：
- 项目列表
- 资产列表
- 画布状态
- 运行历史
- workspace 信息
- 导出包下载

### 2. 任务编排
对接 restored-src：
- `init`
- `plot`
- `storyboard`
- `promptpack`
- `export`
- `run-all`
- `interrupt`

### 3. 文件受控访问
统一处理：
- `GET /api/files`
- `GET /api/download`
- `GET /api/bundle`

### 4. 状态管理
维护：
- 当前 workspace
- 当前项目
- 当前运行状态
- 运行历史

---

## 建议目录结构

```text
ui/server/
├── app.py
├── config.py
├── db.py
├── api/
│   ├── projects.py
│   ├── assets.py
│   ├── keys.py
│   ├── providers.py
│   ├── models.py
│   ├── recommendation_rules.py
│   ├── suggestions.py
│   └── workspace.py
├── core/
│   ├── bridge/
│   │   ├── projects.py
│   │   ├── assets.py
│   │   ├── pipeline.py
│   │   └── workspace.py
│   ├── services/
│   │   └── restored_adapter.py
│   └── workspace.py
└── schemas/
    ├── project.py
    ├── asset.py
    ├── task.py
    └── status.py
```

---

## 分层职责

### `api/`
对外暴露 HTTP 路由，仅做参数校验、调用 bridge 层、返回 JSON。

### `core/bridge/`
桥接层核心逻辑：
- 拼接参数
- 调用 restored-src
- 统一 workspace 读写
- 将结果转成前端可消费格式

### `core/services/restored_adapter.py`
和 restored-src 交互的适配器：
- 统一调用入口
- 隐藏底层实现差异
- 方便以后替换执行引擎

### `schemas/`
定义统一数据结构，避免路由层和 service 层传来传去都是 dict。

---

## API 实现策略

### Phase A：先做 mock
- 返回固定 JSON
- 确保前端 Dashboard / Assets / Pipeline 可以连通

### Phase B：接 workspace
- 让 mock 数据改成读取 workspace
- 支持保存、读取、删除

### Phase C：接 restored-src
- `run-all` 和 `interrupt` 接入真实执行
- 状态和运行历史落盘

---

## 关键接口说明

### `/api/status`
返回：
- 当前 workspace
- 项目列表
- 章节状态
- 运行历史
- 产物索引

### `/api/pipeline/run-all`
职责：
- 顺序执行 init / plot / storyboard / promptpack / export
- 每一步都记录耗时与状态

### `/api/canvas/:projectId`
职责：
- 保存画布节点与边
- 读取画布状态
- 运行/中断画布工作流

### `/api/files` 与 `/api/download`
职责：
- 受控读取 workspace 内文件
- 只允许访问 workspace 范围内的路径

---

## 和 restored-src 的对接方式

建议通过一个适配器层统一封装：

```text
Bridge API
  ↓
restored_adapter
  ↓
restored-src services / tools / task system
```

这样前端与 bridge 解耦，bridge 与 restored-src 也解耦。

---

## 第一版最小可运行目标

1. 前端能调用 `GET /api/status`
2. 前端能切换 workspace
3. 前端能读取项目/资产数据
4. `run-all` 先返回 mock 成功结果
5. 之后再逐步替换成 restored-src 实际执行

---

## 风险提醒

- 不要让前端直接 import restored-src
- 不要在路由里堆执行逻辑
- 不要让 workspace 读写散落在各个页面里
- 不要把 restored-src 改成普通 CRUD 项目

---

## 当前阶段任务

- [ ] 建立 `ui/server` bridge 目录骨架
- [ ] 定义统一 schema
- [ ] 先实现 mock 版 `status/projects/assets/workspace`
- [ ] 再接入 restored-src 执行能力
