# 小说工作台功能规格 v0.1

## 1. 定位

小说工作台是一套面向长篇网文创作的生产系统，不只是正文编辑器。它覆盖项目管理、知识投喂、参考作品配置、大纲与细纲生成、正文生成、手动编辑、章节管理、版本回滚、连续性修复、正文缓存和记忆宫殿。

当前版本的核心目标：

- 支持从零创建小说项目并进入单项目写作。
- 支持把参考作品拆解成知识库与正文缓存。
- 支持将一个或多个参考项目配置到当前小说生成流程中。
- 支持生成大纲、批量生成正文、连续性修复。
- 支持专业正文编辑、自动保存、版本留痕和回滚。
- 支持后续继续扩展“全本仿写”和“多参考融合仿写”。

## 2. 用户主流程

### 2.1 从零创作

1. 在小说项目大厅创建项目。
2. 进入项目工作台。
3. 选择模型。
4. 生成大纲，必要时输入粗略大纲或选择续写模式。
5. 批量生成正文。
6. 在 CodeMirror 编辑器中手动修订正文。
7. 查看版本历史，必要时回滚。
8. 运行连续性修复。

### 2.2 参考作品仿写

1. 在小说项目大厅打开知识库。
2. 使用 URL、TXT/PDF 或手动文本投喂参考作品。
3. 对全本小说可选择先拉取正文缓存，再从缓存提炼知识。
4. 检查 AI 提炼结果，确认后批量入库。
5. 在目标小说项目中打开参考作品配置。
6. 添加一个或多个参考项目。
7. 配置参考强度、权重、生效阶段、参考维度和避免照搬项。
8. 使用参考注入预览确认实际命中的知识。
9. 再生成大纲或正文。
10. 在右侧参考报告中检查注入知识和照搬命中。

### 2.3 全本投喂两阶段流程

1. 打开知识库投喂。
2. 选择 URL 提炼。
3. 开启自动连载抓取。
4. 开启全本模式。
5. 开启“先只拉取正文缓存”。
6. 设置起始章节、拉取并发数、每批提炼章节数。
7. 启动正文拉取。
8. 拉取完成后进入正文缓存总览核对原文。
9. 点击“从缓存开始提炼”。
10. 预览提炼结果，确认后入库。

## 3. 页面与入口

### 3.1 小说项目大厅

文件：

- `ui/web/src/pages/NovelStudio.tsx`

功能：

- 展示项目列表。
- 搜索项目标题、题材、状态、目标读者。
- 新建小说项目。
- 删除小说项目。
- 进入单项目工作台。
- 打开写作知识库。
- 打开正文缓存总览。
- 打开全局记忆宫殿。

### 3.2 单项目工作台

文件：

- `ui/web/src/pages/NovelProjectWorkspace.tsx`

布局：

- 顶部栏：返回、项目标题、模型选择、参考配置、刷新。
- 左侧栏：写作流程和章节目录。
- 中间区：章节正文编辑。
- 右侧栏：参考资料、版本和参考报告。
- 弹窗与抽屉：大纲生成、章节管理、章节重组、参考配置、版本详情、Agent 结果。

## 4. 功能模块

### 4.1 写作流程侧栏

文件：

- `ui/web/src/pages/novel-workspace/ChapterDirectorySidebar.tsx`

功能：

- 生成大纲。
- 批量生成正文。
- 连续性修复。
- 显示正文生成进度。
- 显示章节目录。
- 显示总章数、已写、未写。
- 打开大纲树。
- 打开章节管理。
- 新增章节。
- 切换当前编辑章节。

### 4.2 正文编辑区

文件：

- `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`

功能：

- CodeMirror 6 正文编辑。
- 原生行号。
- 当前行高亮。
- 自动换行。
- 撤销、重做。
- Tab 缩进。
- 自动保存。
- 字数统计。
- 当前章节正文生成。
- 章节元数据编辑入口。
- 展开查看章节上下文。
- 生成流式进度展示。
- 编辑显示设置。

编辑显示设置：

- 字体大小：默认 `15px`。
- 行距：默认 `24px`。
- 偏好保存在浏览器 `localStorage`。
- 显示设置不写入章节正文和后端业务数据。

### 4.3 大纲生成

文件：

- `ui/web/src/pages/novel-workspace/OutlineControlPanel.tsx`

功能：

- 从头生成。
- 从已有章节或细纲继续生成。
- 基于用户输入大纲扩展。
- 设置生成细纲数量。
- 设置续写起点。
- 输入参考大纲或故事灵感。

生成时预期同步完成：

- 总纲生成。
- 细纲生成。
- 世界观同步更新。
- 角色信息同步更新。
- 连续性预检。
- 角色知识追踪快照。

### 4.4 章节管理

文件：

- `ui/web/src/pages/novel-workspace/ChapterManagementDrawer.tsx`

功能：

- 章节列表总览。
- 搜索标题、摘要、章节号。
- 按状态筛选：全部、已写、未写、占位。
- 排序：章号正序、章号倒序、字数优先、标题排序。
- 单选与多选模式。
- 新增章节。
- 编辑章节元数据。
- 删除单章。
- 批量删除。
- 打开章节重组。
- 当前章节信息预览。
- 当前章节正文片段预览。
- 生成当前章节正文。
- 打开版本历史。
- 返回主编辑区。

### 4.5 章节重组

文件：

- `ui/web/src/pages/novel-workspace/ChapterRestructurePanel.tsx`

功能：

- 扩展章节：将选中连续章节扩展为更多章细纲。
- 合并章节：将多章压缩为更少章。
- 设置目标章数。
- 输入额外指令。
- 操作前自动备份章节内容。
- 扩展模式只生成细纲，不直接生成正文。

### 4.6 大纲树

文件：

- `ui/web/src/pages/novel-workspace/OutlineTreeModal.tsx`

功能：

- 弹窗查看大纲树。
- 选择章节并跳转编辑。
- 新增大纲入口。

### 4.7 基础资料编辑

文件：

- `ui/web/src/pages/novel-workspace/EditorModal.tsx`

可编辑实体：

- 世界观：世界摘要、规则、时间锚点、版本、未知项。
- 角色：角色名、角色定位、原型、目标、动机、冲突。
- 大纲：类型、标题、父级、摘要、冲突点、转折点、钩子。
- 章节：章号、标题、所属大纲、目标、摘要、冲突、结尾钩子、正文。

### 4.8 右侧参考资料面板

文件：

- `ui/web/src/pages/novel-workspace/ReferencePanel.tsx`

标签页：

- 世界观。
- 角色。
- 大纲。
- 参考报告。
- 版本。

功能：

- 查看与编辑世界观、角色、大纲。
- 查看参考注入报告。
- 查看参考知识注入数量。
- 查看照搬命中词。
- 查看章节版本列表。
- 回滚章节版本。
- 打开版本详情。

### 4.9 版本详情

文件：

- `ui/web/src/pages/novel-workspace/VersionDetailModal.tsx`

功能：

- 查看版本正文全文。
- 查看版本来源。
- 查看创建时间。
- 与当前稿对比。
- 只看差异或显示全部。
- 查看新增、删除、未变行数。
- 查看分场结构。
- 查看连贯性备注。

### 4.10 参考作品配置

文件：

- `ui/web/src/pages/novel-workspace/ReferenceConfigModal.tsx`

功能：

- 添加多个参考项目。
- 设置参考权重。
- 设置仿写强度：轻参考、中参考、强参考。
- 设置生效阶段。
- 设置参考维度。
- 设置避免照搬项。
- 查看仿写准备度。
- 检查参考项目是否具备关键画像。
- 对缺失画像执行补提炼。
- 跳转到知识库投喂。
- 预览指定任务实际会注入的参考知识。

关键画像类别：

- 参考作品画像。
- 章节节拍模板。
- 角色功能矩阵。
- 文风画像。

参考维度：

- 结构。
- 节奏。
- 文风。
- 角色功能。
- 资源经济。
- 世界观机制。

### 4.11 Agent 执行结果

文件：

- `ui/web/src/pages/novel-workspace/AgentExecutionModal.tsx`

功能：

- 查看多 Agent 执行结果。
- 按 agent 或步骤展示输出 JSON。
- 显示结果来源标签。

### 4.12 写作知识库

文件：

- `ui/web/src/pages/NovelStudio.tsx`

功能：

- 查看知识条目。
- 按投喂项目筛选。
- 按分类筛选。
- 搜索标题、内容、来源、标签。
- 语义检索。
- 查看知识详情。
- 删除单条知识。
- 清空当前筛选结果。
- 手动文本投喂。
- URL 抓取提炼。
- TXT/PDF 文件投喂。
- AI 提炼结果预览。
- 批量保存提炼结果。

知识条目可包含：

- 分类。
- 标题。
- 内容。
- 来源。
- 来源标题。
- 标签。
- 题材标签。
- 套路标签。
- 使用场景。
- 证据。
- 章节范围。
- 实体。
- 置信度。
- 权重。
- 投喂项目名。

### 4.13 全本抓取与提炼任务

文件：

- `ui/web/src/pages/NovelStudio.tsx`
- `ui/server/src/routes/knowledge.ts`
- `ui/server/src/knowledge-base.ts`

功能：

- 自动连载抓取。
- 全本模式。
- 两阶段模式：先抓正文缓存，再提炼。
- 设置起始章节。
- 设置最大章节数。
- 设置拉取并发数。
- 设置每批提炼章节数。
- 后台任务进度。
- 暂停任务。
- 继续任务。
- 取消任务。
- 失败后继续。
- 指定批次重新提炼。
- 提炼后去重合并。
- 自动入库或预览后入库。

任务状态：

- queued。
- running。
- paused。
- completed。
- failed。
- canceled。

### 4.14 正文缓存

文件：

- `ui/web/src/pages/NovelStudio.tsx`
- `ui/server/src/routes/knowledge.ts`
- `ui/server/src/knowledge-base.ts`

功能：

- 查看正文缓存总览。
- 搜索项目名、来源、缓存键。
- 查看缓存完整性。
- 查看章节范围。
- 查看总字数。
- 查看章节目录。
- 查看单章原文。
- 复制来源 URL。
- 作为后续提炼输入。
- 用于和知识提炼结果互相印证。

存储策略：

- 当前正文缓存存储在 SQLite 中。
- 不再依赖 JSON 文件作为主存储。

### 4.15 记忆宫殿

文件：

- `ui/web/src/pages/NovelStudio.tsx`
- `ui/server/src/memory-service.ts`
- `ui/server/src/routes/novel.ts`

功能：

- 查看全局记忆项目。
- 打开对应小说项目。
- 清理项目记忆。
- 将部分知识和生成结果同步为可召回记忆。
- 生成时注入项目上下文。
- 支持事实查询、连续性问题和冲突检查。

## 5. 数据实体

### 5.1 小说项目

核心字段：

- id。
- title。
- genre。
- synopsis。
- length_target。
- target_audience。
- style_tags。
- status。
- reference_config。

### 5.2 世界观

核心字段：

- project_id。
- world_summary。
- rules。
- timeline_anchor。
- known_unknowns。
- version。

### 5.3 角色

核心字段：

- project_id。
- name。
- role_type。
- archetype。
- motivation。
- goal。
- conflict。
- current_state。

### 5.4 大纲

核心字段：

- project_id。
- outline_type。
- title。
- parent_id。
- summary。
- conflict_points。
- turning_points。
- hook。

### 5.5 章节

核心字段：

- project_id。
- outline_id。
- chapter_no。
- title。
- chapter_goal。
- chapter_summary。
- conflict。
- ending_hook。
- chapter_text。
- scene_breakdown。
- continuity_notes。
- status。

### 5.6 章节版本

核心字段：

- chapter_id。
- version_no。
- source。
- chapter_text。
- scene_breakdown。
- continuity_notes。
- created_at。

### 5.7 知识条目

核心字段：

- id。
- category。
- title。
- content。
- source。
- source_title。
- tags。
- genre_tags。
- trope_tags。
- use_case。
- evidence。
- chapter_range。
- entities。
- confidence。
- weight。
- project_id。
- project_title。

### 5.8 正文缓存

核心字段：

- cache_key。
- project_title。
- source_url。
- canonical_source_url。
- complete。
- chapter_count。
- first_chapter。
- last_chapter。
- total_chars。
- chapters。

## 6. API 对照

### 6.1 小说项目与模块

- `GET /api/novel/projects`
- `POST /api/novel/projects`
- `GET /api/novel/projects/:id`
- `PUT /api/novel/projects/:id`
- `DELETE /api/novel/projects/:id`
- `GET /api/novel/projects/:id/worldbuilding`
- `POST /api/novel/projects/:id/worldbuilding`
- `GET /api/novel/projects/:id/characters`
- `GET /api/novel/projects/:id/outlines`
- `GET /api/novel/projects/:id/chapters`
- `GET /api/novel/projects/:id/reviews`

### 6.2 章节

- `POST /api/novel/chapters`
- `PUT /api/novel/chapters/:id`
- `DELETE /api/novel/chapters/:id`
- `POST /api/novel/chapters/:id/generate-prose`
- `GET /api/novel/chapters/:id/versions`
- `POST /api/novel/chapters/:id/rollback`
- `POST /api/novel/chapters/restructure`

### 6.3 生成与修复

- `POST /api/novel/plan`
- `POST /api/novel/agents/execute`
- `POST /api/novel/agents/repair`
- `GET /api/novel/runs`

### 6.4 参考作品

- `PUT /api/novel/projects/:id/reference-config`
- `POST /api/novel/projects/:id/reference-preview`
- `POST /api/knowledge/projects/profile-supplement`

### 6.5 知识库

- `GET /api/knowledge`
- `POST /api/knowledge/entries`
- `DELETE /api/knowledge/entries/:id`
- `POST /api/knowledge/entries/purge`
- `POST /api/knowledge/query`
- `POST /api/knowledge/analyze`
- `POST /api/knowledge/entries/batch`
- `POST /api/knowledge/fetch-url`
- `POST /api/knowledge/read-local-file`

### 6.6 正文缓存与全本投喂

- `GET /api/knowledge/source-caches`
- `GET /api/knowledge/source-caches/:key`
- `GET /api/knowledge/source-caches/:key/chapters/:chapter`
- `POST /api/knowledge/ingest/start`
- `GET /api/knowledge/ingest/:id`
- `POST /api/knowledge/ingest/:id/pause`
- `POST /api/knowledge/ingest/:id/resume`
- `POST /api/knowledge/ingest/:id/cancel`
- `POST /api/knowledge/ingest/:id/reanalyze`

### 6.7 记忆宫殿

- `GET /api/novel/memory-palace/projects`
- `DELETE /api/novel/memory-palace/projects/:id`

## 7. 当前问题

### 7.1 入口分散

知识库、正文缓存和记忆宫殿在项目大厅；参考作品配置在单项目工作台；参考报告在右侧栏。它们共同服务“参考工程”，但当前缺少一个统一入口。

建议：

- 在单项目工作台增加“参考工程”入口。
- 将参考配置、知识准备度、正文缓存命中、参考报告集中展示。

### 7.2 控制逻辑集中

`NovelProjectWorkspace.tsx` 仍然承担大量职责：

- 数据加载。
- 自动保存。
- 生成流程。
- 章节版本。
- 章节重组。
- 参考预览。
- 弹窗状态。

建议拆分 hooks：

- `useNovelWorkspaceData`。
- `useChapterAutosave`。
- `useNovelGeneration`。
- `useChapterVersions`。
- `useChapterManagement`。
- `useReferenceWorkflow`。

### 7.3 长任务中心缺失

全本投喂、抓取缓存、批量提炼、大纲生成、正文批量生成都是长任务，但 UI 分散在不同面板中。

建议：

- 增加统一“任务中心”。
- 显示运行中、已暂停、失败、已完成任务。
- 支持继续、取消、重试、查看日志。

### 7.4 仿写结果质量评估不足

当前已有参考注入报告和照搬命中，但还缺少面向成稿的综合评估。

建议增加：

- 参考结构命中度。
- 原创性风险。
- 角色/设定照搬风险。
- 节奏匹配度。
- 文风相似度。
- 章节节拍覆盖情况。

### 7.5 版本能力需要更细

当前版本能查看和回滚，但还可以继续加强。

建议增加：

- 版本命名。
- 版本备注。
- 两个历史版本互相对比。
- 章节级恢复前预览。
- 一键复制某个版本正文。

## 8. 后续优先级

### P0：稳定当前写作闭环

- 保持 CodeMirror 编辑器稳定。
- 确认自动保存和版本留痕无重复写入问题。
- 确认章节切换不会丢编辑内容。
- 确认批量生成正文时版本记录可靠。

### P1：整理参考工程

- 增加单项目“参考工程”总览。
- 显示参考项目、画像完整度、正文缓存、最近参考报告。
- 支持从目标项目直接进入投喂指定参考项目。
- 支持按项目查看所有被引用知识。

当前已完成第一版：单项目工作台顶部新增“参考工程”入口，集中展示参考项目、画像完整度、正文缓存、知识条目和最近参考报告，并可跳转到知识查看、补充投喂和正文缓存视图。

### P2：统一长任务中心

- 接管全本投喂任务。
- 接管批量生成正文任务。
- 接管大纲生成任务。
- 接管连续性修复任务。
- 保留任务日志、错误和恢复入口。

当前已完成第一版：单项目工作台顶部新增“任务中心”入口，展示当前运行中的大纲生成、批量正文、连续性修复、全案规划、Agent 链和当前章节正文生成，并集中查看当前项目的历史运行记录、输入、输出和错误信息。

当前已完成第二步：任务中心接入全局全本抓取/提炼任务，可查看项目名、阶段、进度、正文缓存命中、抓取章数、提炼批次、候选知识数量和批次状态，并支持暂停、继续、取消任务。

### P3：提升仿写质量控制

- 增加参考使用评分。
- 增加原创性检查。
- 增加照搬风险分级。
- 增加“禁止项”强约束检查。
- 生成后自动产出参考报告。

当前已完成第一版：参考工程总览中新增“仿写质量评估”，基于参考画像完整度、正文缓存覆盖、参考注入报告、照搬命中、避免照搬项和参考维度覆盖，计算综合评分，并给出准备度、正文缓存覆盖、参考注入有效性、照搬安全、原创性约束、节奏/文风支撑六个分项。

当前已完成第二步：正文生成后的参考报告会自动写入 `quality_assessment`，包含综合评分、风险等级、参考覆盖、注入有效性、照搬安全、原创性约束、避免项覆盖、维度覆盖和改进建议；右侧参考报告面板会直接展示质量分与风险标签。

### P4：继续工程拆分

- 将 `NovelProjectWorkspace.tsx` 控制逻辑拆成 hooks。
- 将 `NovelStudio.tsx` 中知识库、正文缓存、投喂弹窗拆成独立组件。
- 统一长任务状态类型。
- 为关键 API 补充类型定义。

当前已完成第一步：将章节正文自动保存、保存队列、切章前强制保存和手动编辑版本控制提取为 `useChapterAutosave`，主工作台只保留保存状态与调度接口。

当前已完成第二步：将任务中心的运行中任务聚合、全本投喂任务拉取、轮询、暂停、继续和取消逻辑提取为 `useWorkspaceTasks`，并修正任务抽屉打开时因任务列表更新导致重复即时拉取的问题。

当前已完成第三步：将章节版本列表加载、版本详情状态和章节版本回滚提取为 `useChapterVersions`，右侧版本面板继续复用同一组状态与回滚入口。

当前已完成第四步：将项目数据加载、模型选择、当前章节、章节目录树、参考报告、空项目判断和章节筛选排序提取为 `useNovelWorkspaceData`，并清理主工作台中已经只写不读的旧状态。

当前已完成第五步：将生成前参考知识预检、准备度不足确认和 `reference-preview` 路由不可用提示提取为 `useReferenceWorkflow`，生成流程只保留是否继续的判断。

## 9. 推荐的信息架构调整

目标是把当前功能组织成四个稳定区域：

1. 项目创作
   - 大纲。
   - 章节。
   - 正文编辑。
   - 版本。

2. 参考工程
   - 投喂项目。
   - 正文缓存。
   - 画像完整度。
   - 参考配置。
   - 参考报告。

3. 质量控制
   - 连续性修复。
   - 事实冲突。
   - 原创性风险。
   - 平台适配。

4. 运行管理
   - 长任务中心。
   - Agent 执行结果。
   - 运行记录。
   - 失败恢复。

## 10. 验收标准

### 写作闭环

- 用户可以创建项目。
- 用户可以生成大纲。
- 用户可以生成正文。
- 用户可以手动编辑正文。
- 用户可以切换章节。
- 正文能自动保存。
- 历史版本可查看、对比、回滚。

当前已完成第一版章节正文流水线：单章生成会先构建续写上下文包，执行章节初稿生成，再进行章节级自检；如自检判断需要修订，会自动生成修订稿并入库。生成过程会记录 pipeline、context_package、self_check，并在前端显示阶段标签。

当前已完成正文质检可视化：生成完成后右侧参考面板会自动切到「正文质检」，展示评分、是否修订、上下文缺口、前章衔接、自检问题和执行流水线，方便用户判断本章是否可以继续写下一章。

当前已完成提示修正：`prose-agent` 和 `review-agent` 已有专门的消息构造分支，不再落回旧的章节细纲提示。

当前已完成批量正文生成可靠性增强：批量生成会逐章校验接口响应，记录成功数、失败数、当前章节、最近质检评分和失败原因；任务中心同步显示批量任务详情，结束后如有失败会弹出失败章节清单，避免长时间执行后误判为全部成功。

当前已完成批量正文生成复盘记录：批量生成结束后会写入一条 `batch_generate_prose` 汇总运行记录，包含章节列表、成功/失败状态、质检分数、修订状态、字数、错误原因和总耗时，后续可在任务中心历史记录中复盘整次批量任务。

当前已完成批量正文生成复盘可视化：任务中心打开 `batch_generate_prose` 历史详情时，会优先显示结构化摘要，包括总章数、成功/失败数、平均质检分、每章质检标签和失败章节列表，同时保留原始输入/输出用于排查。

当前已完成批量正文生成停止控制：批量生成运行中可在左侧写作流程或任务中心点击“停止后续”，系统会让当前章节完成后停止后续章节，并在批量汇总记录中标记 canceled、skipped，便于复盘实际生成范围。

当前已完成可控章节生成流水线第一版：单章正文生成拆成“章节目标/上下文确认 -> 场景卡生成 -> 段落级正文生成 -> 自检修订 -> 仿写安全检查 -> 入库版本 -> 故事状态更新”。场景卡可在正文生成前单独生成/刷新，生成中会保留 pipeline 阶段记录。

当前已完成章节生成前置检查第一版：生成前会检查章节细纲、章末钩子、世界观、角色卡、角色状态、必须推进剧情点、前章衔接、参考知识和仿写禁止项；高危缺口会阻止直接生成，前端弹窗展示阻塞项、修复建议，并提供“允许缺材料继续”的人工覆盖入口。

当前已完成续写上下文包第一版：生成正文前会组装结构化 context_package，包含前情摘要、上一章结尾摘录、本章目标、场景卡、角色当前状态、世界规则、分卷目标、风格锁定、参考注入摘要、禁止重复信息和安全策略。

当前已完成章节级自检与二次修订第一版：初稿生成后自动审校章节目标完成度、前章衔接、角色行为、设定冲突、水文重复、参考照搬风险和章末钩子；低分或高危问题会自动调用修订稿，并把 self_check 写入正文质检记录。

当前已完成风格锁定配置第一版：参考作品配置中可设置叙事人称、句长倾向、对话比例、吐槽密度、爽点密度、描写浓度、章节字数范围、禁用词、偏好词、禁止写法和结尾策略，生成时会写入 context_package。

当前已完成分卷/阶段目标接入第一版：卷纲会作为 volume_plan 写入续写上下文包，供正文生成根据分卷目标、阶段矛盾、关键转折和章群推进进行约束。

当前已完成记忆状态机第一版：每章入库后会提取角色位置、角色关系、已知秘密、道具归属、伏笔状态、主线进度、时间线和后续优先事项，写回项目 reference_config.story_state，并同步更新角色 current_state。

当前已完成仿写安全阈值第一版：参考配置中可设置允许/谨慎/禁止学习层级、最低安全评分、允许照搬命中数和生成时强制拦截。开启后，参考使用报告不达标时正文不会入库，前端会展示拦截原因。

### 参考闭环

- 用户可以投喂参考作品。
- 用户可以查看正文缓存。
- 用户可以提炼知识。
- 用户可以配置参考项目。
- 用户可以预览参考注入。
- 用户可以在生成后查看参考报告。

### 长任务闭环

- 用户可以启动全本任务。
- 用户可以暂停任务。
- 用户可以继续任务。
- 用户可以取消任务。
- 用户可以从缓存继续提炼。
- 用户可以重新提炼失败批次。

### 质量闭环

- 用户可以运行连续性修复。
- 用户可以查看修复结果。
- 用户可以通过版本回滚撤销不满意结果。
- 用户可以查看参考照搬风险。
