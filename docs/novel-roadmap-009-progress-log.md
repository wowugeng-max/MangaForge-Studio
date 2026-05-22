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

## 2026-05-20

### 已完成
- 将项目重心明确推进到“长篇商业连载生产控制”：优先服务前30章留存、300万字结构承载、持续日更与质量债务治理
- 在商业 ops 后端新增 `first30_retention_diagnosis` 本地诊断，覆盖读者承诺、1-3章开篇钩子、4-10章试读闭环、11-30章付费前蓄势
- 在商业 ops 后端新增 `longform_pressure_test` 本地压力测试，评估300万字目标下的分卷容量、人物池、世界资产、冲突阶梯、扩展引擎和回报循环
- 两个新诊断都会写入 review/run 记录，方便在项目审稿区追踪和复盘
- 在小说工作台商业工具箱新增“前30章留存诊断”和“300万字长线压力测试”入口，并提供结构化结果弹窗
- 自然语言创作指令台已能识别“留存/追读/前30章”和“三百万字/长线/压力测试”等指令，并调用对应本地诊断
- 前30章留存诊断已能生成 `first30_retention_repair` 修复队列，把高危/中危风险和低分章节转入任务中心
- 任务中心已支持展示前30章留存修复任务摘要，包含任务数量、高危数、章节、动作和验收标准
- 任务中心修复任务已支持章节级动作：定位章节、打开手动编辑、基于任务生成编辑报告并进入一键修订确认
- 新增未来100章骨架检查，评估章节目标、冲突压力、回报爽点、章末钩子和阶段锚点覆盖率
- 新增 AI 生成未来100章骨架入口，可生成章节目标/冲突/回报/钩子，并写入章节大纲供滚动规划和批量生产读取
- 未来100章骨架写入已改为默认 `upsert`：同章节已有骨架大纲则更新，不存在才创建，结果会返回创建/更新/跳过数量
- 未来100章骨架生成已改为“先生成差异预览，再勾选应用”，支持按章节确认新建/覆盖/跳过
- 未来100章骨架应用结果已接入大纲树定位：可一键打开大纲树高亮本次写入的大纲，并选中节点进入编辑
- 新增“从未来100章骨架入队”章节群入口，可从已写入骨架筛选下一批章节，必要时创建/同步章节记录并生成章节群任务
- 新增长线生产趋势报表，聚合未来100章骨架分、章节群材料分、生产后质量分、相似风险和失败原因，辅助判断哪些章节能扩大批量生产
- 小说工作台商业工具箱新增“长线生产趋势报表”入口，可查看生产就绪均分、薄弱章节、失败原因和优先处理建议
- 长线生产趋势报表已接入任务中心，可一键生成补骨架、补材料、重质检、降相似风险和失败处理任务
- 任务中心新增“长线生产修复”队列展示，支持绑定章节的任务直接定位、手动编辑或进入编辑报告/修订稿链路
- 任务中心长线生产修复任务新增类型化主按钮：补骨架会打开对应大纲，补材料会重做场景卡，重质检会进入编辑报告/修订稿链路，降相似风险会重跑相似度检测，失败处理会定位章节并展示验收建议
- 长线生产修复任务新增状态回写：单项任务可标记“已处理/需复查”，类型化动作执行后会自动转入“需复查”，整队完成后 run 状态会转为 completed
- 任务中心新增复查清单，自动聚合所有需复查修复任务，支持单项确认通过和批量确认通过，并写回对应 run payload
- 长线生产修复队列新增闭环审计摘要，可统计本轮任务确认情况、触达章节、骨架/材料/质量/就绪度变化和剩余风险，并写回 run 与审稿记录
- 新增长线治理总览接口，聚合最新修复队列、闭环审计、趋势报表和剩余风险，供项目总览与指令台读取
- 生产看板新增“长线治理闭环”区块，展示修复任务、已确认、需复查、薄弱章节和闭环结论
- 自然语言创作指令台已能识别“长线风险/治理/闭环摘要”类指令，并返回结构化长线治理摘要

### 验证结果
- `bun run build:server` 已通过
- `bun run build:web` 已通过
- `git diff --check` 已通过
- `bun run smoke:novel:local` 已通过，且 smoke 已覆盖前30章留存诊断、留存修复队列、300万字长线压力测试、未来100章骨架检查、骨架应用、骨架章节群 dry-run、长线生产趋势报表、长线生产修复队列、单项任务状态回写、批量状态回写、闭环审计摘要、长线治理总览与指令台长线治理摘要

### 仍待推进
- 当前两个诊断是本地规则版，适合快速筛查；后续可以增加 AI 编辑复核版，用模型给出更细的章节重写方案
- 前30章留存修复队列已能进入编辑报告/修订稿链路；后续可补“按任务类型直接重做场景卡/章末钩子”的更细分自动化
- 长线治理摘要已接入项目总览和指令台；后续需要把前30章留存修复也升级为类型化执行和闭环复查

### 下一步动作
1. 为留存修复任务增加更细的自动化动作，例如重做场景卡、强化章末钩子、补动作链
2. 将前30章留存修复接入任务状态回写、复查清单和闭环审计摘要
3. 优化自然语言创作指令台的执行结果展示，让新商业诊断也能显示结构化摘要

---

## 2026-05-22 - 长篇规划优先工作台

- 将小说项目工作台默认首页规划为故事规划 cockpit。
- 新增主线与分卷推进、未来 10 章路线、分卷结构和规划健康提醒的前端模型与界面。
- 将工具入口收纳为故事规划、章节写作、资料设定、质检修订、生产运营五个工作区。
- 章节目录在规划模式下降级为导航入口，避免与主线规划争夺注意力。

---

## 记录原则

- 每次实际落地一个可验证能力，就追加一条日志
- 每条日志至少包含：已完成、验证结果、仍待推进、下一步动作
- 日志内容应能与代码提交和 roadmap 顺序一一对应
