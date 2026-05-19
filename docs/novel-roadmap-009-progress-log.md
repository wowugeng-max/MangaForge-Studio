# 小说引擎进度日志 v0.1

> 说明：本文件用于记录小说引擎的实际落地进度、验证结果和下一步动作。它与 `novel-roadmap-008-implementation-order.md` 配合使用，确保开发过程完整、可追溯。

---

## 2026-04-23

### 已完成
- 完成小说规划设计文档链（001~008）
- 将实现顺序从纯规划升级为“按阶段迭代的执行顺序”
- 在后端接入小说项目、世界观、角色、大纲、章节、运行记录的数据层和 CRUD
- 在前端 `NovelStudio` 中接入多面板工作台
- 补齐世界观 / 角色 / 大纲 / 章节 / 运行历史的展示能力
- 为世界观 / 角色 / 大纲 / 章节增加新增/编辑弹窗
- 将小说路由接入实际运行中的 `ui/server` Express 服务

### 验证结果
- `GET /api/novel/projects` 可用
- `POST /api/novel/projects` 可用
- `GET /api/novel/projects/:id/worldbuilding` 可用
- `GET /api/novel/projects/:id/characters` 可用
- `GET /api/novel/projects/:id/outlines` 可用
- `GET /api/novel/projects/:id/chapters` 可用
- `GET /api/novel/runs?project_id=:id` 可用
- `POST /api/novel/plan` 可用，并会写入运行记录

### 仍待推进
- 总纲 → 卷纲 → 章纲的层级扩展
- 章节链与续写机制
- 连续性 / 审校系统
- 市场偏好信号接入
- 分镜与画布联动

### 下一步动作
1. 设计并实现多层级大纲树
2. 增加卷纲与章纲的创建 / 展示 / 关联能力
3. 让 `plan` 输出由“单次种子生成”升级为“树状结构生成”

---

## 2026-05-12 至 2026-05-18

### 已完成
- 将小说项目创建拆分为手动创建、快速 AI 创建、深度草稿 / 定稿创建模式
- 补齐小说设定工坊流水线，支持从项目上下文生成、审阅和落库设定资产
- 接入章节设定使用关系，支持按章节管理必需、允许、禁用、揭示等级和状态变化
- 增强设定一致性报告、修复建议和质量流，减少生成内容与项目设定脱节
- 接入参考作品画像、参考预览、参考迁移计划和相似度 / 安全检查记录
- 增强运行队列 worker、任务审计、运行历史和上下文包摘要，避免项目摘要拉取完整记忆数据
- 改进小说工作台布局与 AI 操作入口，强化章节续写、修订、审校、导出和任务中心链路

### 验证结果
- 最新主线提交停在 `a1e7598 Split novel project creation modes`
- 项目创建模式、设定工坊、章节设定使用、参考迁移和运行审计能力已进入主线代码
- 后端数据层已包含 `setting_entities`、`chapter_setting_usage`、`reference_config` 等持久化结构
- 前端工作台已包含设定、参考、质量、审校、导出、任务中心等完整操作入口

### 仍待推进
- 设定工坊中部分复杂 JSON 字段仍偏工程化，需要改为更结构化的表单编辑体验
- 大型后端路由文件继续增长，后续应拆分 `novel-project-control-routes`、`novel-planning-routes`、`novel-editor-routes`
- API smoke 测试仍依赖本地服务端口稳定启动，需要整理可重复的本地验证流程

### 下一步动作
1. 建立统一的 `check` / `build` / smoke 脚本，降低每轮改动后的验证成本
2. 拆分前端大包，优先优化小说工作台首屏加载压力
3. 梳理设定工坊表单化改造点，为后续 UX 优化做准备

---

## 2026-05-19

### 已完成
- 新增根目录 `package.json`，统一提供 `build:server`、`build:web`、`check`、`smoke:novel` 脚本
- 为 `ui/server` 增加 Bun bundle 构建脚本和小说 API smoke 脚本入口
- 为 `ui/web` 增加 Vite build / check 脚本入口
- 将前端路由改为 `React.lazy` + `Suspense`，按页面拆分主要路由包
- 将 `NovelProjectWorkspace` 内重型弹窗和抽屉组件改为组件级懒加载，保留主工作区静态加载
- 新增 Vite `manualChunks` 配置，将 React、CodeMirror、React Flow 拆为稳定 vendor chunk
- 后端服务支持通过 `PORT` / `HOST` 覆盖监听地址，便于默认端口不可用时执行本地验证
- 新增 `smoke:novel:local` 脚本，可自动选择临时端口、启动后端、执行小说工作流 smoke 并清理服务进程
- 从 `novel-project-control-routes.ts` 抽出项目控制配置路由到 `novel-project-config-routes.ts`，覆盖审批策略、生产预算、质量门和 Agent 配置
- 从 `novel-project-control-routes.ts` 抽出写作圣经 / 故事状态路由到 `novel-project-bible-routes.ts`
- 将 `stableTextHash` 收敛到 `novel-route-utils.ts`，供交付导出和写作圣经复用
- 从 `novel-project-control-routes.ts` 抽出生产看板 / 指标 / 商业就绪 / 连续性审计路由到 `novel-project-insight-routes.ts`
- 从 `novel-project-control-routes.ts` 抽出交付导出 / 发布锁定 / 发布修复队列路由到 `novel-project-delivery-routes.ts`
- 将 `novel-project-control-routes.ts` 收敛为项目控制路由聚合注册器，统一注册 delivery、bible、insight、config 子路由
- 扩展 `smoke:novel` 覆盖范围，新增交付导出预览和发布修复计划检查
- 从 `novel-project-delivery-routes.ts` 抽出导出渲染模块 `novel-delivery-export-renderer.ts`，集中处理 TXT / Markdown / DOCX / EPUB 输出
- 从 `novel-project-delivery-routes.ts` 抽出导出 payload 模块 `novel-delivery-export-payload.ts`，集中处理章节范围、导出统计、发布门禁输入
- 从 `novel-project-delivery-routes.ts` 抽出发布审核模块 `novel-delivery-release-audit.ts`，集中处理发布策略、manifest、审核检查和修复任务生成
- 从 `novel-project-delivery-routes.ts` 抽出发布修复执行模块 `novel-delivery-repair-runner.ts`，集中处理修复队列、批量质检和相似度检测执行
- 将设定工坊实体编辑器从原始 JSON 文本框改为结构化表单，支持别名、关键属性、硬性约束和当前状态的键值维护
- 将设定一致性检查的状态回写改为待确认队列，检查阶段只生成候选变更，用户勾选后再应用到设定实体状态

### 验证结果
- `bun run check` 已通过
- `git diff --check` 已通过
- `MANGAFORGE_API_URL=http://127.0.0.1:18787/api bun run smoke:novel` 已通过
- `bun run smoke:novel:local` 已通过
- 拆分项目控制配置路由后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分写作圣经 / 故事状态路由后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分生产洞察路由后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分交付路由并扩展 smoke 后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分导出渲染模块后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分发布审核模块后，`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 拆分导出 payload 与发布修复 runner 后，`git diff --check`、`bun run build:server` 与 `bun run smoke:novel:local` 已通过
- 设定工坊表单化后，`bun run build:web` 已通过
- 设定状态回写确认队列落地后，`bun run build:server`、`bun run build:web` 与 `bun run smoke:novel:local` 已通过
- 前端构建后不再出现超过 500KB 的 JS chunk
- 最大 chunk 约 428KB，`NovelProjectWorkspace` 相关 chunk 约 210KB
- 相比此前单一主包约 2.5MB 的状态，首屏加载风险明显下降

### 仍待推进
- 沙箱内直接启动 / 访问本地监听端口会失败；需要在本机权限下运行后端和 smoke，或继续封装更自动化的本地验证脚本
- 根目录脚本现在依赖 Bun workspace 外的分目录脚本，后续可视情况升级为正式 workspace 管理
- 大型小说后端路由仍需继续模块化，降低后续功能叠加时的维护成本

### 下一步动作
1. 把 Ant Design 构建中的 `"use client"` 警告收敛为可解释的已知构建噪音，避免后续掩盖真实警告
2. 继续观察大型后端路由边界，优先拆分仍承载多职责的 planning / editor 路由
3. 继续打磨设定工坊的变更审计视图，让历史状态变更可追踪、可回看

---

## 记录原则

- 每次实际落地一个可验证能力，就追加一条日志
- 每条日志至少包含：已完成、验证结果、仍待推进、下一步动作
- 日志内容应能与代码提交和 roadmap 顺序一一对应
