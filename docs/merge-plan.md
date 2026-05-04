# MangaForge Studio 合并计划（执行版）

## 超简版状态面板

- **已完成**：前端主壳可跑、Bridge 层可用、workspace 落盘、restored-src 脚本链已接通、Pipeline 工作台可预检并执行
- **进行中**：Canvas 完整功能、Assets 工作流、更多字段对接、运行日志/下载体验优化
- **最近一次验证**：`/api/workspace/preflight` 路由已通；workspace 和 `.story-project` 存在；缺 `series.yaml` / `style-guide.md`
- **下一步**：先补 `init` 初始化内容，再跑完整 `run-all`

## 一句话摘要

- **已经完成**：前端主壳可跑、Bridge 层可用、workspace 落盘、restored-src 脚本链已接通、Pipeline 工作台可预检并执行
- **正在推进**：Canvas 完整功能、Assets 工作流、更多字段对接、运行日志/下载体验优化
- **待完成**：旧接口清理、契约冻结、README/烟雾测试、发布前回归与收敛

## 下次开工执行顺序

1. **先补 `init`**
   - 生成 `series.yaml`、`style-guide.md`、`characters/`
   - 让 `preflight` 通过

2. **再跑完整 `run-all`**
   - 检查 `init / plot / storyboard / promptpack / export`
   - 关注 `run-*.json`、`stdout`、`stderr`、`.story-project` 产物

3. **然后恢复 `Canvas`**
   - 先做最小可用版
   - 目标：能选项目、载入状态、进入编辑链路

4. **再补 `Assets` 工作流**
   - 资产列表、文件预览、下载联动、导出联动

5. **最后收尾清理**
   - 清理旧接口
   - 冻结契约
   - 补 README / smoke test
   - 统一启动脚本

---

## 下一步行动清单

### P0 优先
1. **跑通真实 `run-all`**
   - 目标：确认 `init / plot / storyboard / promptpack / export` 在当前 workspace 下完整执行
   - 关注：`run-*.json`、`stdout`、`stderr`、`.story-project` 产物

2. **恢复 `Canvas` 的真实功能**
   - 目标：让画布至少可正常打开、选项目、载入工作区状态、进入后续编辑链路

3. **补 `Assets` 工作流页面**
   - 目标：从占位页恢复为可用的资产工作流配置页
   - 关注：资产列表、工作流配置、文件/导出联动

### P1 次优先
4. **清理旧接口与兼容分支**
   - 删除不再使用的旧后端入口、旧 API 调用、旧组件兼容逻辑

5. **补全 `Keys / Providers / Models` 字段映射**
   - 完善字段结构、表单校验和前后端契约

6. **优化 run 结果展示**
   - 增强每步耗时汇总、错误高亮、结果下载入口、跳转到 episode 产物

### P2 收尾优先
7. **统一启动脚本**
   - 整理 Windows / macOS / 前端 / 后端启动方式

8. **补 README 和 smoke test**
   - 记录项目结构、启动方式、Pipeline 操作、workspace 检查方法

9. **最后做一次回归验证**
   - 新建项目 → 选项目 → 预检 workspace → 运行全流程 → 导出产物 → 查看 run 记录

---

## 目标

把两个项目的优势合并到一个统一产品里：

- 保留 `ComfyForge` 已经设计好的前端 UI、页面结构和交互体验
- 复用 `restored-src` 中成熟的 agent / tool / task / session 架构
- 通过统一的 API / Bridge 层，把前端意图翻译成 agent 执行
- 统一项目数据目录，避免多套数据源并存

---

## 总体原则

1. **前端优先保留**
   - 现有 UI、导航、画布、资产、Key、Provider、Pipeline 页面尽量保留
   - 只替换数据源和业务调用方式

2. **核心能力优先保留**
   - restored-src 的 agent 编排、任务管理、会话恢复、权限、提示词与导出能力保持为核心
   - 不把 agent 降级成普通 CRUD 接口

3. **中间层统一接入**
   - 前端只认一个统一 API
   - 统一 API 再去调用 restored-src 能力
   - 不允许前端同时依赖多个后端

4. **统一 workspace**
   - 所有项目数据、资产、运行记录、导出产物都写入同一个 workspace 规范

5. **功能模块独立**
   - 后端按职责拆分为独立模块与路由文件
   - 入口文件只做装配和启动，不承载业务逻辑
   - 迁移过程中持续拆分，避免再次回到单文件大入口

---

## 当前复用与重建说明

### 复用 ComfyForge 的部分
- 前端页面骨架与路由结构
- Dashboard / Assets / Canvas / Pipeline 的 UI 体验
- Ant Design 组件风格与交互布局

### 复用 restored-src 的部分
- `init / plot / storyboard / promptpack / export` 执行能力
- 故事项目文件读写和导出逻辑
- 现有 service / schema / task 体系

### 重新构建的部分
- `ui/server` 的 Bridge / API 层
- workspace 统一读写与切换逻辑
- 前后端对接字段与契约
- 模块化路由、store、service 拆分

---

## 推荐架构

```text
[ ComfyForge UI ]
        ↓
[ Unified API / Bridge ]
        ↓
[ restored-src Agent Core ]
        ↓
[ Unified Workspace ]
```

---

## 统一 workspace 结构（建议）

```text
workspace/
└── proj_001/
    ├── project.json
    ├── series.yaml
    ├── style-guide.md
    ├── assets/
    ├── canvas/
    ├── episodes/
    ├── templates/
    ├── runs/
    └── logs/
```

---

## 当前模块拆分清单

### 已拆分
- `workspace.ts`：workspace 路径、配置读取、目录初始化
- `projects.ts`：项目持久化读写
- `assets.ts`：资产持久化读写
- `templates-store.ts`：参数模板存储
- `pipeline.ts`：init / plot / storyboard / promptpack / export 执行封装
- `routes/projects.ts`：项目 CRUD 路由
- `routes/assets-crud.ts`：资产 CRUD 路由
- `routes/assets-media.ts`：资产上传与媒体访问路由
- `routes/workspace.ts`：workspace / preflight 路由
- `routes/templates.ts`：模板路由
- `index.ts`：薄入口，仅负责装配和启动

### 待拆分
- `routes/pipeline.ts`：Pipeline 路由继续拆细
- `pipeline.ts`：可进一步拆成 `pipeline-init.ts` / `pipeline-runner.ts` / `pipeline-export.ts`
- `asset-media.ts`：媒体文件读写与辅助工具继续独立
- `status/runs/logs`：运行状态和历史记录单独拆分
- `keys / providers / models`：后续再补齐并独立模块化

---

## API 路由草案

### 项目
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### 资产
- `GET /api/assets`
- `GET /api/assets/:id`
- `POST /api/assets`
- `PUT /api/assets/:id`
- `DELETE /api/assets/:id`

### 画布
- `GET /api/canvas/:projectId`
- `PUT /api/canvas/:projectId`
- `POST /api/canvas/:projectId/run`
- `POST /api/canvas/:projectId/interrupt`

### Pipeline / Agent
- `POST /api/pipeline/init`
- `POST /api/pipeline/plot`
- `POST /api/pipeline/storyboard`
- `POST /api/pipeline/promptpack`
- `POST /api/pipeline/export`
- `POST /api/pipeline/run-all`
- `POST /api/pipeline/interrupt`

### Keys / Providers / Models
- `GET /api/keys`
- `POST /api/keys`
- `PUT /api/keys/:id`
- `DELETE /api/keys/:id`
- `GET /api/providers`
- `POST /api/providers`
- `PUT /api/providers/:id`
- `DELETE /api/providers/:id`
- `GET /api/models`
- `POST /api/models/sync`

### Workspace / Files
- `GET /api/workspace`
- `POST /api/workspace/switch`
- `GET /api/files?path=...`
- `GET /api/download?path=...`
- `GET /api/bundle?episodeId=...`

### 状态 / 日志 / 运行历史
- `GET /api/status`
- `GET /api/runs`
- `GET /api/logs`

---

## 前端页面与后端能力映射

| 前端页面 | 主要职责 | 对应后端能力 |
|---|---|---|
| Dashboard | 项目大厅 / 总览 | projects / status / runs |
| Assets | 全局资产大厅 | assets / files / download |
| Canvas | 画布编辑与运行 | canvas / pipeline / tasks |
| Keys | Key 与模型管理 | keys / models / providers |
| Providers | 厂商中枢 | providers / models |
| Pipeline | 流程运行面板 | pipeline / run-all |
| Rules | 推荐规则 | recommendation_rules |
| VideoWorkshop | 视频执行工作台 | video_loop / tasks |

---

## restored-src 的角色

restored-src 继续作为核心执行层，负责：

- agent 编排
- tool 调用
- task 管理
- session / resume
- prompt / memory
- export / artifact 生成
- interrupt / stop

---

# 分阶段执行清单（可直接开工）

## Phase 0：基线冻结（1 天）

### 目标
先冻结当前状态，避免边修边漂移。

### 任务
- [ ] 创建 `integration/wip` 分支
- [ ] 记录当前可运行命令（web/server）
- [ ] 记录当前主要报错列表（前端依赖、缺文件、后端入口混乱）
- [ ] 固定 Node/Bun/Python 版本说明到 `docs/env.md`

### 验收
- [ ] 团队可复现当前状态
- [ ] 已有问题有清单可追踪

---

## Phase 1：统一数据与契约（2-3 天）

### 目标
先统一语言：目录结构 + API 契约 + 数据模型。

### 任务
- [ ] 确定 workspace 根目录（默认 `./workspace`）
- [ ] 定义 `project.json`、`run.json`、`canvas.json` 的最小字段
- [ ] 输出 API 契约文档 `docs/api-contract.md`
- [ ] 在 `ui/server` 建立 `v1` 路由骨架（只返回 mock 也可以）
- [ ] 为 `projects / assets / status` 三组接口写最小返回示例

### 验收
- [ ] 前端可通过 mock 接口跑通 Dashboard/Assets 基础加载
- [ ] API 契约稳定，不再频繁改字段名

---

## Phase 2：Bridge 层落地（3-5 天）

### 目标
让 `ui/server` 成为唯一入口。

### 任务
- [ ] 统一前端 `api/client` 到单一 baseURL
- [ ] 停止前端直连多后端（清理硬编码端口）
- [ ] 在 `ui/server` 实现 `projects / assets / workspace / status` 真接口
- [ ] 文件访问统一走 `files/download/bundle`
- [ ] 增加基础错误码规范（400/404/500）

### 验收
- [ ] 前端页面仅调用 `ui/server`
- [ ] Dashboard + Assets 页面可稳定读写

---

## Phase 3：接入 restored-src 执行链（4-7 天）

### 目标
把“运行能力”切到 restored-src。

### 任务
- [ ] 在 `ui/server` 封装 `pipelineService`
- [ ] 依次接入 `init / plot / storyboard / promptpack / export`
- [ ] 增加 `run-all` 串行编排与中间状态上报
- [ ] 增加 `interrupt` 能力（能取消正在执行任务）
- [ ] 将执行日志落盘到 `workspace/<proj>/runs/`

### 验收
- [ ] Pipeline 页可以 Run All
- [ ] Run Timeline 能看到每一步状态和耗时
- [ ] Export 产物可下载

---

## Phase 4：前端页面切换到统一能力（3-5 天）

### 目标
保留 UI，替换业务来源。

### 任务
- [ ] Dashboard 切换到统一 projects/status/runs
- [ ] Canvas 切换到统一 canvas/run/interrupt
- [ ] Assets 切换到统一 assets/files/download
- [ ] Keys/Providers 切换到统一 keys/providers/models
- [ ] 清理临时兼容逻辑与重复 store

### 验收
- [ ] 主要页面能正常读写和执行
- [ ] 不再依赖旧分散后端路径

---

## Phase 5：收敛与发布准备（2-3 天）

### 目标
清理重复实现，形成可维护结构。

### 任务
- [ ] 统一启动脚本（Windows/macOS）
- [ ] 删除废弃入口（明确保留项）
- [ ] 补充 README：架构、启动、目录、常见问题
- [ ] 加入最小 smoke 测试脚本（项目创建 + run-all + 导出）

### 验收
- [ ] 新同学按 README 可在 30 分钟内跑通
- [ ] 主链路稳定：项目 -> 画布 -> run-all -> 导出

---

## 最优先打通的三条链路

1. **项目大厅 → 画布 → Run All**
2. **资产大厅 → 预览 → 下载**
3. **Key / Provider → 模型同步 → 任务执行**

---

## 风险与规避

- 风险：前端继续混用多后端地址  
  规避：强制所有请求收口到 `ui/server`

- 风险：restored-src 被改造成普通 CRUD  
  规避：只通过 bridge 调用能力，不侵入核心编排

- 风险：workspace 目录再次分裂  
  规避：统一路径配置，集中写入

- 风险：迁移期改动过大导致不可回滚  
  规避：按 phase 小步提交，每阶段可回退

---

## 当前执行状态

### 已完成
- [x] 迁移计划文档已建立
- [x] 基础环境与契约文档已建立
- [x] `ui/server` Bridge / API 骨架已建立
- [x] `projects / assets / keys / providers / models` 已接入 workspace 落盘
- [x] `pipeline/run-all` 已接入 restored-src 脚本链
- [x] `workspace preflight` 已加入
- [x] 前端 `Pipeline` 页面已支持项目选择、episode 输入、预检、步骤表格与日志查看
- [x] 前端关键页面已恢复可运行（Dashboard / Pipeline / 画布占位页 / 工作流配置占位页）

### 进行中
- [ ] Canvas 完整功能恢复
- [ ] Assets 工作流恢复
- [ ] Keys / Providers / Models 更完整字段对接
- [ ] 运行结果/下载体验优化
- [ ] 更多 restored-src 能力纳入 Bridge
- [x] 真实 `preflight` 已验证路由可达；当前失败原因为 `series.yaml` / `style-guide.md` 尚未初始化

### 最近一次验证结果
- 路由：`GET /api/workspace/preflight`
- 结果：路由可达
- workspace：存在
- `.story-project`：存在
- 缺失项：`series.yaml`、`style-guide.md`
- 结论：接口链路正常，当前卡点是初始化内容尚未生成完

### 待完成
- [ ] 旧接口清理与契约冻结
- [ ] README / 启动脚本 / smoke test
- [ ] 发布前回归与收敛
- [ ] Phase 0 ~ Phase 5 收尾完成

---

## 备注

这个计划的核心不是“把两个项目硬拼在一起”，而是：

> 用 ComfyForge 的前端体验，承载 restored-src 的 agent 核心，中间通过统一 API 和统一 workspace 连接。
