# ComfyForge 功能迁移核对清单

上游：`wowugeng-max/ComfyForge`，核对版本 `4d23a3649b3d6031952f9c7daa518c4a751ef894`。

当前项目启动栈以 `ui/server/src/index.ts` 和 `ui/web/src` 为准。仓库中保留的 `ui/server/app.py` 只是旧 FastAPI 兼容层，不作为当前主运行时。

## 核对结论

前端文件名层面，当前项目已覆盖上游 `frontend-react/src` 的主要模块。真正缺口集中在三类：

1. 同名模块被简化，功能没有完整迁入。
2. Python 后端能力没有映射到 TS 后端。
3. 上游项目书中标为 Phase 10/11 的能力在当前 UI 有入口但没有闭环。

## 浏览器 Smoke 记录

2026-06-08 本地启动 TS 后端 `127.0.0.1:8787` 与 Vite 前端 `127.0.0.1:5173`，使用内置浏览器完成第一轮迁移页面 smoke：

- 已验证 `/`、`/assets`、`/assets/create`、`/canvas`、`/assets/workflow-config`、`/video-workshop`、`/keys`、`/models`、`/providers`、`/rules` 能加载，不出现 React 空白页或路由级异常。
- 已验证画布“漫剧生成”完整交互：填写故事并确认后会创建 `分镜大师 -> 分镜绘图 -> 分镜预览` 三节点两连线，且分镜大师显示裂变计数。
- 已验证 `/canvas` 无项目路由时显示“全局画布”，资产侧栏默认“全局公共”，不再把缺失项目 ID 传成 `NaN`。
- 已验证 Key 新增弹窗可打开，并显示服务大类、Provider、自定义 Base URL、Token、备注、启用状态和总配额字段。
- 已验证模型新增抽屉中“能力 JSON”和“UI 参数 JSON”会显示格式化 JSON，不再出现 `[object Object]`。
- 已验证视频工坊切换到“云端 RunningHub”后会显示云端 Base URL、RunningHub API Key、模板 ID、提交路径、状态路径和输入键配置。
- 已复查 `/`、`/assets`、`/keys`、`/models`、`/providers` 管理页，页面能加载且本轮导航后没有新增 antd `bodyStyle/bordered/headerStyle/destroyOnClose` 弃用日志；对应源守卫见 `ui/web/src/pages/antdV5Compatibility.test.ts`。
- 2026-06-08 继续审计：机械比对上游 `frontend-react/src` 与当前 `ui/web/src`，除 Vite 默认 `App.css/index.css/assets/react.svg` 外，功能模块文件名已覆盖；同时复跑迁移核心 targeted 测试，服务端 Provider/Key/Model/推荐规则/Codex runtime 共 146 项通过，前端画布/节点/资产/Provider/Key 共 107 项通过，`bun run check` 与 `git diff --check` 通过。

仍需后续真实 smoke：实际 ComfyUI/RunningHub 账号执行、模型测试/同步外部请求、画布 DAG 真实生成任务、资产上传真实大文件和浏览器拖拽链路。

## 已迁移或已有等价能力

- MangaForge Studio 模板 API 闭环：`/manga/templates` 支持列表、保存和整体替换，`/manga/templates/:name` 支持按名称删除，`/manga/templates/export` 会返回可下载 JSON，`/manga/templates/import` 会按名称去重合并导入模板；同组接口已补齐 `/api/manga/templates...` 兼容别名，匹配旧 `StudioHome` 的请求前缀，补齐当前 TS 后端已有模板存储的管理动作。覆盖测试见 `ui/server/src/routes/templates.test.ts`。
- MangaForge Studio 主流程兼容层：已新增 `/api/manga/status`、`/api/manga/workspaces`、`/api/manga/workspace`、`/api/manga/init`、`/api/manga/plot`、`/api/manga/storyboard`、`/api/manga/promptpack`、`/api/manga/export`、`/api/manga/file`、`/api/manga/download`、`/api/manga/bundle`，让旧 `StudioHome` 首页加载、流水线按钮、文件预览、单文件下载和 episode bundle 下载都能复用当前 TS 后端。`status` 会从 `.story-project/episodes` 生成旧页面需要的 `episodes/storyFiles/episodeStatus` 结构；pipeline 动作返回旧页面读取的 `durationMs/result`；文件读取和下载入口限定在当前 workspace 内，阻断路径穿越。旧页面 API 前缀也已改为跟随 `VITE_API_BASE_URL`，避免后端运行在 `18787` 或代理路径时仍固定请求 `localhost:8787`。覆盖测试见 `ui/server/src/routes/manga-compat.test.ts`、`ui/web/src/pages/studioHomeApi.test.ts`。仍需后续真实浏览器 smoke 复查旧页面下载弹窗和浏览器保存行为。
- 资产 CRUD 与媒体读取：当前有 `routes/assets-crud.ts`、`routes/assets-media.ts`、`asset-store.ts`。
- 资产数据结构校验：已补回上游 schema 对已知资产类型的基础约束。`image/video` 必须带 `data.file_path`，`prompt` 必须带 `data.content`，`workflow` 的 `workflow_json/parameters` 必须是对象，`node_config` 必须带 `nodeType/config`，`node_template` 必须带 `nodes/edges` 数组；未知资产类型继续透传，避免影响当前项目的扩展资产。创建和版本化更新都会在写入前校验，失败返回 400 且不会产生脏版本；错误响应会同时返回 `error/detail`，兼容当前前端和 FastAPI 风格客户端。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产/项目路由尾斜杠兼容：已显式注册 `/api/assets/`、`/api/projects/` 的 GET/POST 别名，并补齐资产详情/更新/删除/项目归属切换、图片/视频上传和项目详情/更新/删除的尾斜杠别名，对齐上游 FastAPI 风格，避免旧客户端、代理或测试 harness 在尾斜杠路径上出现 404。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`、`ui/server/src/routes/assets-media.test.ts`、`ui/server/src/routes/projects.test.ts`。
- 资产响应字段与契约对齐：已补齐上游 `AssetOut` 的 `version/created_at/updated_at` 响应语义，并把资产 CRUD 响应改回上游裸响应契约：`GET /api/assets` 返回资产数组，`GET/POST/PUT/PATCH` 单资产接口返回资产本体。前端资产 store 和工作流编辑器仍保留 `{ assets }` / `{ asset }` 兼容读取，避免旧 TS envelope 响应造成回归。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产/项目旧记录读取归一化：已补齐旧 `assets.json`、`projects.json` 记录的上游响应默认字段。资产读取时会补 `description/tags/project_id/thumbnail/data/version/parent_id/created_at/updated_at` 并保护非数组存储；项目读取时会补 `description/tags/canvas_data/created_at/updated_at`，避免旧工作区进入资产大厅、Dashboard 或画布读档时拿到缺字段对象。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`、`ui/server/src/routes/projects.test.ts`。
- 资产创建血缘字段对齐：`POST /api/assets` 现在会保存顶层 `source_asset_ids/file_path`，并可从 `data.source_asset_ids/data.file_path` 兜底提取，避免节点保存、DirectAPI 和视频循环产生的媒体资产只有 `data.file_path` 而缺少上游资产血缘字段。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产字段兼容：资产创建、版本化更新、项目归属切换、列表筛选和旧记录读取除上游 `project_id/source_asset_ids/file_path/parent_id/created_at/updated_at` 外，也支持 TS/SDK 常见的 `projectId/sourceAssetIds/filePath/parentId/createdAt/updatedAt`；媒体 `data.filePath` 会归一化为 `data.file_path`，提示词 `negativePrompt` 和 workflow `workflowJson` 也会被折回上游字段，避免外部资产导入成功但预览、项目隔离或血缘追踪失效。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产版本化编辑：已补回上游 `PUT /api/assets/:id` 追加新版本的语义，编辑资产会创建新记录并保留原资产，写入 `version/parent_id/source_asset_ids/file_path`，避免工作流、提示词、图片资产被不可逆覆盖。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产删除清理：已补回上游删除资产时清理本地媒体文件的语义。TS 版本会删除当前 workspace `assets/` 与上游旧上传目录 `data/assets/` 内的文件，远程 URL 和越界路径不处理，避免误删工作区外文件；同时兼容迁移后写入的顶层 `file_path/filePath`，避免外部资产或旧记录只有顶层媒体路径时删除资产但遗留文件；删除成功返回 204，缺失资产返回 404，与上游 API 合约一致。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产作用域隔离：已补回上游 `/api/assets` 的 `project_id/is_global/type/skip/limit` 筛选语义，默认列表页大小对齐上游 `limit=100`，显式 `limit` 仍允许到 1000；并补回 `/api/assets/:id/project` 归属切换接口，前端“项目专属/全局公共”不再只是视觉切换。覆盖测试见 `ui/server/src/routes/assets-crud.test.ts`。
- 资产大厅项目切换：已补回上游全局资产大厅的“全局公共 / 具体项目”作用域选择。`/assets` 默认进入全局公共资产，不再在无项目 ID 时误拉全量资产；画布侧资产栏在带 `projectId` 挂载时会恢复项目专属作用域，避免 Zustand 全局状态串台。覆盖测试见 `ui/web/src/pages/assetsIndexMigration.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`。
- 画布侧资产库类型过滤：`AssetLibraryStore` 已保留上游可用资产类型，并补回 `character` 角色资产可见性；当前展示 `image/prompt/video/workflow/node_config/node_template/character`，同时兼容 TS 后端 `{ assets }` 响应 envelope，避免小说章节、剧情线等扩展资产混入可拖拽画布资产。覆盖测试见 `ui/web/src/stores/assetLibraryStore.test.ts`、`ui/web/src/pages/assetsIndexMigration.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`。
- 资产库上传闭环：已补回上游 `AssetLibrary` 的图片/视频上传创建与编辑替换能力。前端通过 `/api/assets/upload/image`、`/api/assets/upload/video` 上传后写入 `file_path/width/height/format/duration/fps`；后端上传路由已支持 multipart 单文件解析和 raw body 兼容，会从 PNG/GIF/JPEG/WebP 文件头恢复图片尺寸与格式，并在可用时通过 `ffprobe` 恢复视频宽高、时长和帧率，避免资产尺寸徽章退化为 0；同时补回上游 MIME 白名单语义，会拒绝明确错误的图片/视频上传格式，显式图片 MIME 但内容不可解析时返回 400，`application/octet-stream` 继续作为当前项目 raw 上传兼容入口放行；上传文件名会在时间戳外追加序号，避免同一毫秒内同名文件覆盖；错误响应会同时返回 `error/detail`。覆盖测试见 `ui/web/src/components/assetLibraryMigration.test.ts`、`ui/server/src/routes/assets-media.test.ts`、`ui/server/src/asset-upload.test.ts`。
- 画布侧资产库快速创建入口：已把筛选类型和快速创建类型拆开。侧栏筛选继续显示 `node_config/node_template`，方便查找节点配置和节点模板资产；快速创建抽屉只显示当前具备完整内联字段的图片、提示词、视频和工作流，避免用户从侧栏误建空的节点配置或节点模板。覆盖测试见 `ui/web/src/components/assetLibraryMigration.test.ts`。
- 上游临时文件读取兼容：已补回上游 `/api/files/{file_path}` 的读取入口，限定只读取当前 workspace 的 `data/temp` 目录，兼容旧视频 loop 结果 URL，同时阻断路径穿越；前端媒体 URL 构建器会把相对或旧绝对 `/api/files/...` 地址重挂到当前 `VITE_API_BASE_URL`，避免代理部署或端口变化后旧临时视频预览失效；缺失或越界错误会同时返回 `error/detail`。覆盖测试见 `ui/server/src/routes/assets-media.test.ts`、`ui/web/src/utils/assetMedia.test.ts`。
- 上游媒体路径兼容：`/api/assets/media/*` 已支持当前 workspace 内的绝对媒体路径、`assets/...` 相对路径和上游 `data/assets/...` 旧路径；读取范围限定在 `workspace/assets` 与 `workspace/data/assets`，避免通过媒体路由读取非媒体文件；错误响应会同时返回 `error/detail`。覆盖测试见 `ui/server/src/routes/assets-media.test.ts`。
- 前端资产媒体 URL 对齐：资产侧栏、资产大厅、详情、创建和编辑页的图片预览已统一通过 `buildAssetMediaUrl` 生成，跟随 `VITE_API_BASE_URL` 并编码 workspace 路径，避免前后端不同端口或远程 API 部署时缩略图打到前端域名；旧数据里持久化的完整 `http(s)://.../api/assets/media/...` 地址也会重新挂到当前 API base，避免换端口、代理或部署域名后预览继续访问旧后端。画布上的 `DisplayNode`、`LoadAssetNode`、`GenerateNode` 与 `ComfyUIEngineNode` 浏览器预览也已接入同一 URL 构建器；`GenerateNode` 会把旧绝对 TS 媒体地址归一化回相对 `/api/assets/media`，作为后端 payload 兼容路径。覆盖测试见 `ui/web/src/utils/assetMedia.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`、`ui/web/src/pages/assetsIndexMigration.test.ts`、`ui/web/src/pages/assetsDetailMigration.test.ts`、`ui/web/src/pages/assetsEditMigration.test.ts`、`ui/web/src/components/nodes/displayNode.test.ts`、`ui/web/src/components/nodes/loadAssetNode.test.ts`、`ui/web/src/components/nodes/generateNode.test.ts`、`ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- 资产库编辑体验：已补回上游可视化 `TagsInput` 标签编辑和图片资产的 AI 生成溯源展示，能在编辑抽屉中查看 `source_provider/source_model/source_mode/source_aspect_ratio/source_size/source_prompt/source_camera_params`。覆盖测试见 `ui/web/src/components/assetLibraryMigration.test.ts`。
- 资产编辑血缘保留：已补齐图片/视频资产重铸时保留 `source_*` AI 溯源字段，避免只改名称、标签、归属或替换媒体后丢失模型、提示词和镜头参数记录。覆盖测试见 `ui/web/src/pages/assetsEditMigration.test.ts`。
- 角色资产编辑元数据保留：通用重铸页保存 `character` 资产时会保留未由表单直接管理的字段，例如直接文本角色卡的 `core_prompt` 和后续扩展元数据，避免视觉角色资产与文本角色资产共存时被编辑页误清空。覆盖测试见 `ui/web/src/pages/assetsEditMigration.test.ts`。
- 节点资产重铸入口：通用资产编辑页已补齐 `node_config` 和 `node_template` 两类资产的结构化编辑，保存时分别保留未直接管理的扩展元数据，并写回 `nodeType/config` 与 `nodes/edges`。覆盖测试见 `ui/web/src/pages/assetsEditMigration.test.ts`。
- 资产库工作流完整编辑入口：已补回上游从资产抽屉跳转到 workflow 完整编辑器的 `returnUrl` 回跳语义，支持新建 workflow 和编辑现有 workflow 后返回当前项目画布。覆盖测试见 `ui/web/src/components/assetLibraryMigration.test.ts`。
- 资产大厅工作流完整编辑入口：已补齐 `/assets` 主页面新建和编辑 workflow 时进入完整编辑器并回跳资产大厅的路径，避免 workflow 被长期困在简化抽屉中编辑。覆盖测试见 `ui/web/src/pages/assetsIndexMigration.test.ts`。
- 资产大厅快速创建入口：已在 schema 校验收紧后同步前端体验。`/assets` 的抽屉快速创建只保留具备完整内联字段的提示词和工作流，图片/视频等媒体资产通过“完整铸造”进入 `/assets/create` 上传，避免用户在快速抽屉中选择媒体类型后提交空 `data` 被后端 400 拒绝。覆盖测试见 `ui/web/src/pages/assetsIndexMigration.test.ts`。
- 资产完整铸造节点资产入口：`/assets/create` 已补齐 `node_config` 和 `node_template` 两类资产的创建表单，分别写入后端 schema 需要的 `nodeType/config` 与 `nodes/edges`，让可拖拽节点配置和节点模板不再只能由画布动作间接生成。覆盖测试见 `ui/web/src/pages/assetsCreateMigration.test.ts`。
- 资产大厅详情入口：已补回上游资产卡片的“查看详情”动作。普通资产跳转到 `/assets/:id`，workflow 资产跳转到 `/assets/workflow-config/view/:id?returnUrl=/assets`，避免详情页和工作流只读视图有路由但从大厅无法进入。覆盖测试见 `ui/web/src/pages/assetsIndexMigration.test.ts`。
- 资产搜索描述字段：资产大厅和画布侧资产库搜索现在同时匹配 `name/description/data.content/data.core_prompt`，补回上游资产大厅按描述检索的语义，并让角色资产可按核心设定文本搜索，角色资产和长提示词资产不再只能靠名称搜到。覆盖测试见 `ui/web/src/utils/assetSearch.test.ts`、`ui/web/src/pages/assetsIndexMigration.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`。
- 前端公共资产类型：`ui/web/src/types/asset.ts` 已扩展到当前迁移后的 `image/prompt/video/workflow/node_config/node_template/character` 资产族，并补齐 `project_id/version/parent_id/source_asset_ids` 等作用域与血缘字段；资产 store 复用该共享类型，避免后续页面重新引入窄类型导致节点模板、角色资产或版本血缘丢失。覆盖测试见 `ui/web/src/types/asset.test.ts`、`ui/web/src/stores/assetLibraryStore.test.ts`。
- 前端资产 API helper：`ui/web/src/api/assets.ts` 已改为复用共享 `Asset` 类型，不再保留只含 `id/name/type/tags/updated_at` 的窄 `AssetRecord`；`getAll` 支持上游资产筛选参数 `project_id/is_global/type/skip/limit`，创建接口使用 FastAPI 风格 `/assets/` collection 路径，避免 API helper 调用方在查询、创建或更新 `node_config/node_template/character`、项目作用域和版本血缘字段时被类型层误导。覆盖测试见 `ui/web/src/api/assets.test.ts`。
- 工作流资产详情编辑入口：已补齐详情页对 workflow 资产的专用编辑跳转，避免从详情页误入通用资产编辑页而丢失完整 workflow 配置体验。覆盖测试见 `ui/web/src/pages/assetsDetailMigration.test.ts`。
- 工作流完整编辑器资产读取：已补齐 TS 后端 `{ asset }` envelope 与上游 bare asset 响应的双格式兼容，避免从资产库进入 workflow 编辑器时误判资产类型。覆盖测试见 `ui/web/src/pages/assetsWorkflowConfigMigration.test.ts`。
- 工作流完整编辑器项目归属预选：已补齐资产库进入 `/assets/workflow-config?projectId=...` 时的项目作用域预选，非法 `projectId` 会回退为全局；画布侧资产库的新建 workflow 完整编辑器入口也会同时携带 `returnUrl` 和 `projectId`，避免项目专属资产库新建 workflow 后误存为全局资产。覆盖测试见 `ui/web/src/pages/assetsWorkflowConfigMigration.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`。
- 工作流完整编辑器 Ant Design v5 兼容：`WorkflowConfig` 已去掉旧版 `Card bordered/bodyStyle` API，改用 `variant="borderless"` 和 `styles.body`，并纳入迁移管理页 v5 兼容守卫，避免打开工作流蓝图编辑器时继续产生废弃 API 控制台噪音。覆盖测试见 `ui/web/src/pages/antdV5Compatibility.test.ts`。
- 工作流资产元数据保留：已补齐专用 workflow 编辑器、通用资产编辑页、资产大厅抽屉和画布侧资产栏保存时保留 `data` 中除 `workflow_json/parameters` 之外的扩展元信息，避免 `source`、来源说明或后续扩展字段被重写丢失。覆盖测试见 `ui/web/src/pages/assetsWorkflowConfigMigration.test.ts`、`ui/web/src/pages/assetsEditMigration.test.ts`、`ui/web/src/pages/assetsIndexMigration.test.ts`、`ui/web/src/components/assetLibraryMigration.test.ts`。
- 工作流蓝图布局与连线解析稳定性：`workflowToFlow` 对缺少 `_meta.node` 坐标的 ComfyUI 工作流不再使用随机坐标，而是生成确定性网格位置；同一工作流反复打开不会跳动，同时仍保留原工作流自带坐标。连线解析也已兼容数字源节点 ID，并且只有数组首项能对应真实节点时才创建边，避免普通数组参数被误连。覆盖测试见 `ui/web/src/utils/workflowToFlow.test.ts`。
- 工作流推荐参数刷新：前端 `workflowSuggestions` 不再跨会话缓存推荐规则；用户调整推荐规则后，工作流编辑器再次刷新推荐会读取最新规则，同时 `getAllSuggestions` 在单次扫描内仍复用规则和同类统计，避免多节点工作流重复请求。覆盖测试见 `ui/web/src/utils/workflowSuggestions.test.ts`。
- 节点模板拖入兼容性：画布拖入 `node_template` 资产时已兼容项目自生成的 `sourceIndex/targetIndex + relativePosition` 格式，以及外部 React Flow 风格的节点 `id`、边 `source/target` 和节点 `position` 格式；缺少相对坐标时会按原模板包围盒平移到落点，避免模板节点重叠或飞到旧画布坐标。覆盖测试见 `ui/web/src/pages/canvasAssetDrop.test.ts`。
- 项目画布持久化与响应契约：已补回上游项目 `canvas_data` 保存语义，TS 项目路由支持 `created_at/canvas_data`、`skip/limit` 查询和更新时保留基础档案；列表、详情、创建和更新响应已对齐上游裸数组/裸项目契约；项目删除已对齐上游缺失 404、成功 204 且无 body 的契约；错误响应会同时返回 `error/detail`，兼容当前前端和 FastAPI 风格客户端；`CanvasPage` 也兼容 `{ project }` envelope 与 bare project 两种响应，能正确恢复项目名和已保存图。覆盖测试见 `ui/server/src/routes/projects.test.ts`、`ui/web/src/pages/canvasPageMigration.test.ts`。
- 项目画布字段兼容：项目创建/更新除上游 `canvas_data` 外，也支持 TS 客户端常见的 `canvasData`，旧 `projects.json` 中的 `canvasData` 读取时会归一化为 `canvas_data`，避免外部 SDK 或迁移数据保存成功但打开为空画布。覆盖测试见 `ui/server/src/routes/projects.test.ts`。
- 前端项目 API 兼容：已补回上游 `projectApi.getAll(skip, limit)` 签名，继续向 `/projects/` 传递 `skip/limit` 参数；项目创建也已恢复上游 `/projects/` collection 路径，避免旧调用或分页入口退化成全量拉取，并减少代理对尾斜杠路径的差异。覆盖测试见 `ui/web/src/api/projectApiCompatibility.test.ts`。
- Provider/Model/Key 管理：当前有 `routes/providers.ts`、`routes/models.ts`、`routes/keys.ts` 与 `llm/provider-runtime.ts`。
- Provider 服务类型筛选与唯一性保护：已补回上游 `/api/providers?service_type=...` 的筛选语义，Key/节点配置页可以按 `llm/comfyui` 精确拉取厂商；创建厂商时会拒绝重复 ID，避免配置归属冲突。覆盖测试见 `ui/server/src/routes/providers.test.ts`。
- Provider 默认值与响应语义：已对齐上游最小厂商创建的默认 `api_format=openai_compatible`、`auth_type=Bearer`，创建和更新接口返回 `status/message/provider`，同时保留当前局部更新不抹掉 endpoints/custom_headers 的行为；更新和删除子路由显式注册尾斜杠别名，错误响应会同时返回 `error/detail`，兼容当前前端和 FastAPI 风格客户端。覆盖测试见 `ui/server/src/routes/providers.test.ts`。
- Provider 字段兼容：厂商创建/更新和旧记录读取除上游 `display_name/service_type/api_format/auth_type/response_mode/supported_modalities/default_base_url/is_active/custom_headers` 外，也支持 TS 客户端常见的 `displayName/serviceType/apiFormat/authType/responseMode/supportedModalities/defaultBaseUrl/isActive/customHeaders`，内部继续统一落为 snake_case。覆盖测试见 `ui/server/src/routes/providers.test.ts`。
- Provider 更新外键保护：Provider 更新时会锁定路径中的厂商 ID，忽略请求体里试图改名的 `id` 字段，避免 Key/Model 仍引用旧 ID 时被意外 orphan；这是在上游 `exclude_unset` 更新语义基础上保留当前项目外键安全的兼容增强。覆盖测试见 `ui/server/src/routes/providers.test.ts`。
- Provider 删除响应兼容：已补回上游删除成功响应中的 `status: success`，同时保留当前项目的引用保护和 `ok: true` 本地兼容字段，避免误删仍被 Key 引用的厂商配置。覆盖测试见 `ui/server/src/routes/providers.test.ts`。
- Provider/Model/Key 缺失或空操作 mutation 短路：更新接口在目标记录不存在时会直接返回 404，模型收藏缺失时同样不写盘；模型批量 UI 参数在匹配 0 个模型时不再重写 `models.json`；Key 批量测试在没有活跃 Key 时会直接返回空结果且不重写 `keys.json`；删除不存在 Provider 时保留上游 success 兼容语义但不再把原 JSON 重新格式化写回磁盘，减少管理页失败操作造成的无意义 IO 和本地配置噪音。覆盖测试见 `ui/server/src/routes/providers.test.ts`、`ui/server/src/routes/models.test.ts`、`ui/server/src/routes/keys.test.ts`。
- Provider/Model 旧记录读取归一化：已补齐旧 `providers.json`、`models.json` 记录的上游响应默认字段。Provider 读取时会补 `display_name/service_type/api_format/auth_type/response_mode/supported_modalities/is_active/endpoints/custom_headers`；Model 读取时会补六类能力矩阵、`health_status/is_active/is_favorite/is_manual/context_ui_params/last_tested_at`，避免旧工作区列表、模型选择器、探针和运行时拿到缺字段对象。覆盖测试见 `ui/server/src/routes/providers.test.ts`、`ui/server/src/routes/models.test.ts`。
- 管理布尔字段解析兼容：Provider、Key、Model 和推荐规则的创建、更新与旧记录读取现在会像上游 Pydantic 一样识别字符串布尔值，`"false"/"0"/"no"/"off"` 不再被 JavaScript `Boolean("false")` 误解析为启用；推荐规则 `enabled` 查询也支持 `yes/no/on/off` 等别名，避免外部 SDK、表单序列化或手改 JSON 后厂商、Key、模型、收藏和推荐规则状态反向。覆盖测试见 `ui/server/src/routes/providers.test.ts`、`ui/server/src/routes/keys.test.ts`、`ui/server/src/routes/models.test.ts`、`ui/server/src/routes/recommendation-rules.test.ts`。
- Provider Matrix 多模态配置 UI：已补回上游厂商页的阿里 DashScope 多模态 DSL 预设，以及 `text_to_image/image_to_image/text_to_video/image_to_video` 四类高级路由编辑框。DashScope 预设的文生图端点已补 `model_routes`，`qwen-image/z-image` 继续走同步多模态生成，`wanx` 模型族会切到异步 `image-synthesis`。前端仍保留当前新增的 Codex Responses 协议和响应模式配置。覆盖测试见 `ui/web/src/pages/Providers/providerUiShell.test.ts`。
- Provider DSL 保存反馈：已补回上游在高级 endpoint DSL JSON 写错时的精确路由错误提示，不再把 `text_to_video` 等单项 JSON 解析失败吞成泛化“操作失败”；保存前会统一归一化 Header 列表和 endpoint 字段。覆盖测试见 `ui/web/src/pages/Providers/providerManagerModel.test.ts`。
- Provider 启停编辑入口：已补回上游厂商抽屉中的“当前节点状态”开关，表格中的“监听中/已断开”状态不再只能由后端或 JSON 直接修改。覆盖测试见 `ui/web/src/pages/Providers/providerManagerModel.test.ts`。
- Provider 运行时鉴权大小写兼容：`provider-runtime` 现在会对 `auth_type` 做大小写归一化，`X-API-Key`、`x-api-key` 和 `api-key` 都会生成 `x-api-key` 请求头，避免厂商表单或旧配置保存了展示态大小写后，模型探针通过但正文/任务运行时仍误走 Bearer。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`。
- 模型创建、启用状态与删除保护：已补回上游 `/api/models` 只返回启用模型的选择器语义，模型创建/更新会保留 `is_active`；模型创建会校验绑定 Key 是否存在，并禁止同一 Key 下重复添加相同 `model_name`；创建和更新响应会带上游 `status: success`，同时保留当前前端可直接读取的模型字段；更新时锁定路径中的模型 ID，避免请求体 `id` 意外改坏 Key/Model 绑定；同时补回“官方同步模型禁止手动删除”的保护语义，手动模型仍可删除，同步模型返回 403，成功删除响应兼容上游 `status: success`；错误响应会同时返回 `error/detail`，兼容当前前端和 FastAPI 风格客户端。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 模型字段兼容：模型创建/更新和旧记录读取除上游 `api_key_id/display_name/model_name/health_status/is_active/is_favorite/is_manual/context_ui_params/last_tested_at` 外，也支持 TS/SDK 常见的 `apiKeyId/displayName/modelName/healthStatus/isActive/isFavorite/isManual/contextUiParams/lastTestedAt`，并在创建前的 Key 绑定校验和同 Key 重名校验中使用归一化字段，避免手动模型保存成功但绑定 Key 或模型代号为空。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 模型子动作字段兼容：单模型 UI 参数更新支持 `contextUiParams`，批量 UI 参数更新支持 `apiKeyId/keyId/uiParamsArray`，收藏切换支持 `isFavorite`；内部继续写回 `context_ui_params/is_favorite`，避免 SDK 或外部工具调用子路由时响应成功但配置未生效。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 全局模型管理 Key 绑定：当前项目额外提供的 `ModelManager` 已修正手动新增模型时的 Key 绑定语义。表单选择具体 `api_key_id`，保存时由 Key 反查 provider 后提交，避免只保存 provider 字符串导致模型无法测试或路由。覆盖测试见 `ui/web/src/pages/modelManager.test.ts`。
- Key 管理抽屉手动模型默认能力：已修正手动添加模型时默认勾选不存在的 `video` 能力值的问题，改为合法的 `text_to_video`，并把能力对象构造集中为可测试函数，避免新建视频模型后所有能力都落成 false，导致生成节点无法按能力筛选。覆盖测试见 `ui/web/src/pages/Keys/keyManagerModel.test.ts`。
- Key 健康检查写回：已补回上游 `/api/keys/:id/test` 和 `/api/keys/test-all` 的有效性巡检语义，并显式注册对应尾斜杠别名。TS 版本会逐个探测 active key，写回 `last_checked/avg_latency/failure_count/is_active/quota_remaining`；单个 Key 测试也会更新监控状态，连续失败到阈值后自动禁用；批量测试和后台监控会优先复用绑定模型的真实协议探针，再回退到 Key fallback 探针，避免“单个 Key 测试通过但 test-all/后台巡检误判失败”；fallback 探针的网络异常会转成结构化 `valid:false` 结果，单 Key 测试、批量巡检和后台监控都不会因 `ConnectionRefused` 这类网络异常退化成 500 或打断整批巡检；`auth_type=None/NONE` 的空 Key 执行厂商也会按无鉴权处理；测试接口错误响应保留 `valid:false` 并同时返回 `error/detail`；`POST /api/keys/test-all` 已对齐上游直接返回结果数组的语义，不再用 `{ ok, results }` envelope 包裹。覆盖测试见 `ui/server/src/routes/keys.test.ts`、`ui/server/src/key-monitor.test.ts`。
- Key fallback 探针协议对齐：无本地模型记录时，plain `openai_compatible` Key 测试会像上游一样优先 `GET {base_url}/models`，避免 `model: test` 的 chat 探针被代理网关或厂商模型校验拒绝而误判 Key 不可用；Codex/Responses、Gemini Native、Anthropic 和显式配置的 Provider endpoint DSL 仍保留各自 POST 探针语义。覆盖测试见 `ui/server/src/routes/keys.test.ts`。
- DashScope Key 余额探测：已补齐上游 Qwen Key 测试中的余额查询语义。`qwen/dashscope/aliyun` 类厂商探针成功后会尝试读取 DashScope quota 接口并写入真实 `quota_remaining`；余额接口不可用时回退到本地 `quota_total - quota_used` 推算，不影响连通性测试。覆盖测试见 `ui/server/src/routes/keys.test.ts`。
- Key 后台监控循环：已补回上游应用启动后的周期巡检语义。TS 版本启动后默认每 60 分钟检查一次活跃 Key，跳过 1 小时内刚检查过的 Key，复用手动探测的状态更新规则；可通过 `KEY_MONITOR_ENABLED=false` 关闭，通过 `KEY_MONITOR_INTERVAL_MS` 调整间隔。覆盖测试见 `ui/server/src/key-monitor.test.ts`。
- Key 查询与删除接口：已补回上游 `/api/keys?provider=...&is_active=...&skip=...&limit=...` 筛选和分页语义，默认列表页大小对齐上游 `limit=100`，显式 `limit` 仍允许到 1000；并补回前端已声明的 `GET /api/keys/:id` 单条查询接口；单条查询、更新和删除子路由显式注册尾斜杠别名；删除 Key 会级联清理绑定模型，并对齐上游缺失 404、成功 204 且无 body 的契约；错误响应会同时返回 `error/detail`，兼容当前前端和 FastAPI 风格客户端。覆盖测试见 `ui/server/src/routes/keys.test.ts`。
- Key 配额与路由元数据：已补齐上游 Key 创建/保存的 `quota_remaining/priority/quota_unit/price_per_call/service_type` 字段，创建时 `quota_remaining` 默认等于 `quota_total`，同时保留当前 `quota_used/success_count/avg_latency/failure_count/last_used/created_at/expires_at` 监控字段；编辑 Key 时不会清掉运行时统计，且会锁定路径中的 Key ID，忽略请求体里试图改名的 `id` 字段，避免绑定模型被意外 orphan；读取旧 `keys.json` 时也会补齐上游 `APIKeyOut` 默认字段，避免旧工作区列表/详情缺运行监控字段。覆盖测试见 `ui/server/src/routes/keys.test.ts`。
- Key 字段兼容：Key 创建/更新和旧记录读取除上游 snake_case 字段外，也支持 TS/SDK 常见的 `apiKey/baseUrl/isActive/quotaTotal/quotaRemaining/quotaUsed/quotaUnit/pricePerCall/serviceType/successCount/failureCount/lastChecked/lastUsed/createdAt/expiresAt/avgLatency`，内部继续统一落为 `key/base_url/is_active/...`，避免外部配置导入成功但运行时缺网关、配额或启用状态。覆盖测试见 `ui/server/src/routes/keys.test.ts`。
- Key 智能路由与调用指标：已补回上游 `KeyRouter` 的默认 balanced 选择语义。运行时自动选模型时会跳过明确耗尽配额的 Key，并按 `priority/failure_count/avg_latency` 选择可用 Key；真实模型调用完成后会回写 `success_count/last_used/avg_latency/quota_used/quota_remaining`，失败时增加 `failure_count`。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`。
- Key 路由策略：已补回上游 `cost/speed/random/balanced` 策略入口。默认仍走 balanced；运行请求、`/api/generate` 和画布 `GenerateNode` 配置面板可通过 `routing_strategy` 指定低成本优先、低延迟优先或随机负载均衡，且该内部字段不会透传到上游模型请求体。`GenerateNode` 已把请求 payload 构造抽成可测 helper，覆盖从节点策略选择到 `/api/generate` 请求字段的链路。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/routes/generate.test.ts`、`ui/web/src/components/nodes/generateNode.test.ts`。
- 模型同步路由兼容：已补回上游 `POST /api/models/sync/:key_id` 入口并归位到 Model 路由，复用当前 `key-sync.ts` 同步器，支持请求体传入模型列表进行同步，也支持远程拉取；缺失 Key、停用 Key 和同步内部异常会返回 FastAPI 风格 `error/detail`。同时移除 Key 路由里的临时同名挂载，避免主应用注册顺序导致正式模型路由被遮蔽；模型同步、CRUD、探针、UI 参数和收藏子路由均显式注册尾斜杠别名，兼容 FastAPI 风格旧客户端。覆盖测试见 `ui/server/src/routes/models.test.ts`、`ui/server/src/routes/keys.test.ts`。
- Key 级 Base URL 优先级：已对齐上游 `api_key.base_url || provider.default_base_url` 语义。模型运行时、Key 单测/批量探测、`ConfiguredProviderAdapter`、异步任务轮询和远程模型同步都会优先使用 Key 自定义 Base URL，避免“测试通过但生成/同步走错网关”；Key 单测还会把 Provider endpoint DSL 的相对 `url/endpoint` 挂到 Key Base URL 下，不再把 endpoint 对象误转成 `[object Object]` 或绕过 Key 网关。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/llm/adapter.test.ts`、`ui/server/src/routes/keys.test.ts`、`ui/server/src/key-sync.test.ts`。
- Key 管理批量参数错误处理：已补回上游批量 UI 参数 JSON 的容错语义。非法 JSON 会提示“JSON 解析失败，请检查语法”，合法但非数组会提示“JSON 格式错误：批量下发的参数必须是一个数组 []”，不会让 React 事件链直接抛异常。覆盖测试见 `ui/web/src/pages/Keys/keyManagerModel.test.ts`。
- Key 管理批量参数默认能力：已修正批量 UI 参数配置默认仍使用旧 `image` 能力键的问题，改为当前六任务能力中的 `text_to_image`，避免默认提交时后端按 capability 匹配不到任何模型。覆盖测试见 `ui/web/src/pages/Keys/keyManagerModel.test.ts`。
- Key 管理提交反馈：已补回上游保存 Key 时的成功提示和后端校验详情提示，并把表单辅助字段 `service_type` 从提交 payload 中剔除；标签会在提交前归一化为数组，模型抽屉加载失败也会显式提示，避免 Key/模型配置失败时静默卡住。覆盖测试见 `ui/web/src/pages/Keys/keyManagerModel.test.ts`。
- DirectAPI 通用任务：已补回上游 `/api/tasks/direct` 和 `/api/tasks/:taskId` 第一版，并显式注册 `/api/tasks/direct/`、`/api/tasks/:taskId/` 尾斜杠别名，避免 FastAPI 风格旧客户端或代理改写路径后 404。TS 执行器支持步骤变量 `{var}`、资产引用 `{asset:id}`、嵌套字段引用 `{asset:id.path.to.field}`，并会把 data URL / base64 图片输出保存为 image 资产，记录 `visited_asset_ids` 和 `created_assets`；输出图片资产会写入顶层 `source_asset_ids/file_path`，并继承任务级 `project_id`，对齐上游资产血缘和项目作用域语义。pipeline step 指定 `model_id/preferred_model_id` 或 `api_key_id + model` 时会传入 runtime 首选模型，避免误跑默认模型；step 只指定 `provider` 且模型名未同步到本地时，会回落到同 provider 的可用模型，不会被全局收藏模型带到其他厂商；上游 `DirectAPITaskRequest.api_keys` 请求内直传 provider key 已接入为临时凭证路径，支持没有本地 Key/Model 的旧客户端任务执行，且不会把直传密钥写入 workspace；同一路径也兼容 TS 客户端常见的 `apiKeys` 和对象内 `apiKey/baseUrl` 字段；step 的 `input` 字段会作为 `prompt/text/content` 的兼容文本别名，避免老客户端按上游 schema 发 `input` 时生成空提示词；step 的 `seed` 和 `extra_params` 动态参数会继续透传给 runtime，避免图片、视频和代理模型的 `size/steps/prompt_extend` 等参数在路由层丢失；同步执行错误会同时返回 `error/detail`。覆盖测试见 `ui/server/src/routes/direct-task.test.ts`。
- DirectAPI 视觉/媒体输入：已补回上游 `_build_parts` 的 image 输入语义。TS 版 DirectAPI 会把 step 的 `image` 映射为 runtime `image_url`，并保留 `type/mode/task_type` 作为媒体路由类型，图生图、图生视频或视觉分析类 pipeline 不再丢失图片输入。覆盖测试见 `ui/server/src/routes/direct-task.test.ts`。
- DirectAPI messages 透传：已补回上游 `GenerateRequest.messages` 语义。pipeline step 直接提供 `messages` 数组时会优先传给 runtime，数组/对象内部的 `{var}` 和 `{asset:id}` 引用会递归解析，不再被压成空的单条 user prompt。覆盖测试见 `ui/server/src/routes/direct-task.test.ts`。
- DirectAPI input_map 兼容：pipeline step 可通过 `input_map/inputMap` 声明本步骤的真实输入字段，映射内容会先递归解析 `{var}` 和 `{asset:id}`，再覆盖到 `prompt/messages/image` 等 step 输入里，便于把上一步产物显式接入下游 prompt 或多消息请求。覆盖测试见 `ui/server/src/routes/direct-task.test.ts`。
- DirectAPI 旧角色/提示词资产引用兼容：`{asset:id}` 默认替换除读取 `data.core_prompt/data.content` 外，也兼容旧 JSON 资产把 `core_prompt/content` 放在顶层的情况；显式字段路径 `{asset:id.core_prompt}`、`{asset:id.content}` 在 `data` 内未命中时也会回退读取资产顶层字段，避免迁移前角色卡在 DirectAPI 管线中被替换为空文本或原样残留占位符。覆盖测试见 `ui/server/src/routes/direct-task.test.ts`。
- 6 类模型能力：当前模型能力结构包含 `chat`、`vision`、`text_to_image`、`image_to_image`、`text_to_video`、`image_to_video`。
- 模型列表能力筛选：已补回上游 `/api/models?mode=...&key_id=...` 的组合筛选语义，前端可以按任务能力和 Key 精确选择模型。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 模型旧能力键兼容：已补齐上游 Qwen/Gemini syncer 仍可能产出的宽泛 `image/video` 能力键归一化。同步入库时会映射到当前六任务能力的 `text_to_image/text_to_video` 默认方向，同时保留宽泛键用于旧客户端；`/api/models?mode=image|video` 也会匹配对应的文生/图生图像和视频模型，模型健康探针会把旧 `image/video` 映射为具体探针类型。覆盖测试见 `ui/server/src/key-sync.test.ts`、`ui/server/src/routes/models.test.ts`。
- 模型 UI 参数编辑：已补回上游 `PUT /api/models/:id/ui-params` 单模型动态表单参数更新接口，现有高级参数编辑器不再 404；同时修正 `/api/models/bulk/ui-params` 的批量语义，只更新指定 `api_key_id` 且具备目标 capability 的模型，避免跨 Key 或跨能力误写。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 模型收藏响应语义：已补齐上游 `/api/models/:id/favorite` 的 `status/is_favorite` 响应字段，并保留更新后模型记录，兼容旧客户端和当前前端刷新流程。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 多模态模型健康探针：已补齐上游视觉与图生类探针输入。`vision` 测试会携带官方测试图的图文消息，`text_to_image/image_to_image/text_to_video/image_to_video` 测试会同时携带上游式顶层 `prompt` 和当前运行时 `messages`，`image_to_image/image_to_video` 还会传入 `image_url`，避免 DSL 模板或媒体网关直接读取 `prompt` 时模型健康检查误失败，也避免只测文本链路却误判视觉输入能力可用；`ConnectionRefused`、socket/fetch 类连接异常会归类为 `network_error` 并写回模型健康状态，便于区分网关不可达和模型自身错误。覆盖测试见 `ui/server/src/routes/models.test.ts`。
- 上游六类模型同步启发式：已迁移到 `ui/server/src/key-sync.ts`。同步模型会按 `i2v/t2v/i2i/t2i/vision/chat` 规则分类，不再把所有图像/视频模型同时标成双向能力；同时按 `chat/vision/text_to_image/image_to_image/text_to_video/image_to_video` 能力分组写入默认 UI 参数，匹配画布节点的 `context_ui_params[mode]` 读取方式。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- Qwen/DashScope 模型同步兼容：已补齐上游 Qwen 同步器的固定模型列表入口。`qwen/dashscope/aliyun_dashscope` 类厂商即使未配置 Base URL，也会默认使用 `https://dashscope.aliyuncs.com/compatible-mode/v1/models`；Key 级 `base_url` 仍保持最高优先级。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- 模型同步 endpoint DSL 兼容：远程模型同步现在可读取 Provider `endpoints.models/model_list/list_models` 的字符串路径、`{ url }` 或 `{ endpoint }` 对象配置，并按 Key 级 `base_url` 或 Provider 默认 Base URL 拼接，避免高级厂商 DSL 能生成但不能同步模型。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- 模型同步网关 envelope 容错：远程模型列表解析已补齐 `data/result/output/response/items` 深层包裹展开，不再只识别顶层 `data/models/array`，避免代理网关请求成功但同步 0 个模型。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- Gemini 模型同步兼容：已补齐上游 Gemini 同步器“不要求手动填写 Base URL”的语义。`gemini_native` 或 `gemini/google` 类厂商未配置模型列表端点时，会默认请求 `https://generativelanguage.googleapis.com/v1beta/models`，使用 `x-goog-api-key` 鉴权，并把 Google 返回的 `models/gemini-*` 清洗为可调用的裸模型名；非 Gemini 系列模型不会误同步进聊天模型列表。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- Gemini Native 运行时：已补齐 `gemini_native` 厂商直接调用 Google `generateContent` 的主链路。未配置 Base URL 时会默认使用 `https://generativelanguage.googleapis.com/v1beta`，endpoint 会按实际选中模型生成 `models/{model}:generateContent`，鉴权使用 `x-goog-api-key` 且不发送 Bearer；请求体会转换为 `contents/systemInstruction/generationConfig`，响应会从 `candidates[].content.parts[].text` 和 `usageMetadata` 归一化为当前 LLMResponse。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- Gemini Native 厂商入口与 Key 探针：Provider Matrix 已补回 Google Gemini 一键预设，默认使用 `gemini_native`、`https://generativelanguage.googleapis.com/v1beta` 和 `chat/vision` 能力；无模型记录时的 Key fallback 探针也会走 `models/test:generateContent`、`contents/generationConfig` 请求体和 `x-goog-api-key` 鉴权，避免“未同步模型前测试 Key”误走 OpenAI Chat 协议。覆盖测试见 `ui/web/src/pages/Providers/providerManagerModel.test.ts`、`ui/server/src/routes/keys.test.ts`。
- 模型同步软删除语义：已补回上游同步前禁用旧同步模型、远端返回后重新激活的机制。TS 版会把同 Key、同 Provider 下远端已消失的非手动模型标记为 `is_active=false`，同时保留用户手动模型，不让模型选择器长期残留不可用的远端模型。覆盖测试见 `ui/server/src/key-sync.test.ts`。
- Universal Proxy 配置驱动 DSL：已迁移到 `ConfiguredProviderAdapter` 和 `provider-runtime`。Provider endpoint 支持字符串或对象配置，包含 `url`、路由级 `headers`、`payload_template`、`result_extractor`；端点对象还支持 `model_routes` 按模型名覆盖路由，用于对齐上游 QwenAdapter 中 `qwen-image/z-image/wanx` 同模态不同原生端点的分流语义。画布生成请求和非 chat 模型探针会携带 `type`，按 `text_to_image/image_to_video/text_to_video` 等模态选择 endpoint；配置了 `task_id_extractor/status_extractor/poll_url` 的异步任务会轮询到完成后再做结果提取。生成请求和模型探针都可读取同一套 DSL，避免图像/视频模型探针误走 chat 路由或对异步任务误判。云端媒体请求会把当前 workspace 内的 `/api/assets/media/...` 本地图片输入转换成 `data:image/...;base64,...`，恢复上游 Universal Proxy 的本地图片可达性语义，避免外部 provider 访问不到相对地址。未配置高级 endpoint 时，OpenAI-compatible 图像/视频任务会按上游默认兜底到 `/images/generations` 或 `/videos/generations`，并用 `prompt/image_url` 媒体 payload 与 `data.0.url/output.results.0.url` 等常见结构提取结果；`provider-runtime` 和 `ConfiguredProviderAdapter` 的 OpenAI-compatible chat 兜底 payload 都会透传 `top_p/seed/stop` 等动态参数，不再只保留 `temperature/max_tokens`；底层适配器会把 `ConnectionRefused`、socket/fetch 类异常归入 `network`，让 DirectAPI、模型探针和配置化代理的失败诊断更明确。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/routes/generate.test.ts`、`ui/server/src/routes/models.test.ts`。
- Universal Proxy payload 模板默认值与清理：`provider-runtime` 和 `ConfiguredProviderAdapter` 的 `payload_template` 渲染已补齐上游默认尺寸语义，未显式传入 `size` 时会提供 `1024*1024`；占位符渲染为空的字段会被裁剪，嵌套对象清空后也会整体移除，避免把 `seed: ""`、`ref_img: ""` 或空 `parameters` 发给严格厂商。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/llm/adapter.test.ts`。
- Universal Proxy endpoint DSL 字段兼容：端点对象除上游 snake_case 外，也支持 TS/SDK 常见的 `payloadTemplate/resultExtractor/taskIdExtractor/statusExtractor/pollUrl/pollMaxAttempts/pollIntervalMs/modelRoutes/matchType/modelName/customHeaders`；两条运行路径 `ConfiguredProviderAdapter` 和 `provider-runtime` 都会使用同一兼容读取规则，避免外部工具保存高级厂商配置后运行时退回默认 OpenAI payload 或跳过异步轮询。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- Universal Proxy 异步轮询可中断：`provider-runtime` 的配置驱动异步任务轮询现在会把外层 `AbortSignal` 传入 poll GET，并让轮询间隔等待也响应取消，避免用户点击停止后只取消本地状态、后台 HTTP 仍卡住；异步状态也已补充 `FAILURE/FAIL/TIMEOUT/ABORTED/REJECTED/EXPIRED` 等厂商失败态归一化，`provider-runtime` 和 `ConfiguredProviderAdapter` 不再把失败任务误当最终空结果。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/llm/adapter.test.ts`。
- Universal Proxy 异步任务 ID 兜底：`ConfiguredProviderAdapter` 和主链路 `provider-runtime` 不再强制要求 `task_id_extractor` 才进入轮询；当厂商按上游旧约定返回 `task_id/taskId/id/output.task_id` 且状态为 `queued/processing/running` 等待态时，会使用 `poll_url` 或默认 `endpoint/{{task_id}}` 继续轮询，避免旧 DSL 或轻量厂商配置把“任务已提交”误当成最终结果。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- Universal Proxy 深层 envelope 容错：`ConfiguredProviderAdapter` 和主链路 `provider-runtime` 的异步任务 ID、状态、`result_extractor` 和媒体结果抽取现在都会在原始响应以及 `data/result/output` 嵌套候选中查找。这样可兼容代理网关返回 `{ data: { result: { output: { taskId, taskStatus, results }}}}` 的结构，不会再把已排队任务误判为最终空结果。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- Universal Proxy 媒体结果容错：`ConfiguredProviderAdapter` 和主链路 `provider-runtime` 已补回上游对媒体返回内容的智能抽取，图像/视频路由会从 Markdown 图片、正文中的媒体 URL、`data:image/video` URI 和裸 base64 中归一化出可预览内容，避免兼容模型把“说明文字 + 链接”直接传给下游节点。覆盖测试见 `ui/server/src/llm/adapter.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- Codex/Responses 运行时：当前已在 `ui/server/src/llm/codex-responses.ts`、`provider-runtime.ts` 中扩展。
- 画布基础能力：React Flow、资产拖拽、节点搜索、撤销/重做、分组、静音、断点状态字段都已存在。
- 画布节点快速搜索：已补齐上游双击/右键空白处呼出节点菜单后的搜索框自动聚焦，以及点击画布或节点关闭菜单并清空搜索词的交互，避免连续添加节点时菜单残留或需要额外点选输入框。覆盖测试见 `ui/web/src/pages/canvasPageMigration.test.ts`。
- 节点组闭环：已补回上游节点组创建、解散、Ctrl+B 静音/多选编组、右键编组菜单和“存为节点模板资产”。创建节点组会计算包围盒、转相对坐标、保持父节点在子节点之前；解散会恢复绝对坐标并清理组状态；模板保存会剔除 `result/incoming_data/_runSignal/_fission*` 等运行态字段，写入 `node_template` 资产。组节点本体已补回标题双击编辑、NodeResizer、折叠/展开并隐藏子节点、组静音联动子节点、组内 DAG 运行/停止和就绪 tick 调度。覆盖测试见 `ui/web/src/stores/canvasStore.test.ts`、`ui/web/src/pages/canvasPageMigration.test.ts`、`ui/web/src/components/nodes/groupNodeTemplate.test.ts`。
- 节点组运行防卡死：组内 DAG 调度已补充外部依赖死锁保护和静音子节点旁路。若组内 idle 节点只依赖未成功且未运行的组外节点，本次组运行会自动停止，避免节点组长时间停留在“运行中”；若组外依赖正在运行，则继续等待。组内单个 `_muted` 子节点会直接标记成功，并尽量把上游输出透传给下游，不再被 `_runSignal` 绕过静音保护。覆盖测试见 `ui/web/src/components/nodes/groupNodeTemplate.test.ts`。
- 节点配置/模板资产拖入画布：已补齐上游 `node_config` 创建单节点、`node_template` 批量恢复节点和连线的画布 drop 入口，并使用当前 React Flow `screenToFlowPosition` 坐标 API，避免旧 `project` 调用在新版运行时失效。拖拽恢复现在先通过纯函数生成有效落地计划，再写入一次撤销历史和画布节点/连线，无效配置或空模板不会污染撤销栈。覆盖测试见 `ui/web/src/pages/canvasAssetDrop.test.ts`、`ui/web/src/pages/canvasPageMigration.test.ts`。
- GenerateNode 单点运行静音保护：已补齐自身或父组 `_muted` 时按钮禁用并显示“已静音”的行为，避免 DAG 会跳过但用户仍能从节点上手动触发运行。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- 画布连线即灌入：已补回上游“智能水管”语义，节点连线时会保存历史并把上游已有 `result/asset.data/incoming_data` 写入下游 `incoming_data`，减少手动重跑。覆盖测试见 `ui/web/src/stores/canvasStore.test.ts`。
- 资产输入节点：已补回上游 `LoadAssetNode` 的资产拖拽载入、按资产类型生成输出端口、图片/视频预览和尺寸徽章、文本/Prompt 内容编辑、修改版另存资产、DAG `_runSignal` 触发时把 `asset.data` 推给下游并设置运行状态；角色资产会按文本上下文处理，读取 `core_prompt` 作为预览和可编辑内容，并在另存修改版时继续写回 `core_prompt`，避免角色卡在画布节点中退化成媒体路径。覆盖测试见 `ui/web/src/components/nodes/loadAssetNode.test.ts`。
- 角色资产画布上下文闭环：`LoadAssetNode` 编辑角色资产时会写回 `core_prompt` 并清理旧 `content` 残留，`GenerateNode` 和 `ComfyUIEngineNode` 读取连线文本输入时会优先使用角色 `core_prompt`，避免角色卡预览正常但实际没有进入生成提示词或 Comfy 文本参数。覆盖测试见 `ui/web/src/components/nodes/loadAssetNode.test.ts`、`ui/web/src/components/nodes/generateNode.test.ts`、`ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- 画布连线类型：`LoadAssetNode` 加载 `character` 资产时会输出 `text` 类型 handle，可直接连到 Generate/Comfy 文本参数，不再被当成未知资产类型。覆盖测试见 `ui/web/src/utils/handleTypes.test.ts`。
- 结果展示节点：已补回上游 `DisplayNode` 的 BaseNode 容器、通用输入/输出端口、DAG `_runSignal` 与 `incoming_data` 自动成功/透传、图片/视频/文本类型识别、本地媒体 URL 归一化、媒体尺寸徽章和“固化为资产”能力；保存资产时会从实际展示的 `incoming_data/result/asset.data` 保留上游 `source_*` 血缘字段，并把媒体路径与来源资产 ID 同步写入顶层 `file_path/source_asset_ids`，同时兼容 `sourceAssetIds`。Display/Generate/Comfy 节点现在共享媒体结果字段归一化，能识别视频 loop 和云端 Comfy 常见的 `media_url/mediaUrl/final_video/finalVideo/output_files/segment_outputs`，且 Generate/Comfy 预览会把本地相对路径和 `/api/assets/media/...` 挂到当前 API base，避免画布中真实视频或图片产物退化成 JSON 文本或打到前端域名。覆盖测试见 `ui/web/src/components/nodes/displayNode.test.ts`、`ui/web/src/components/nodes/generateNode.test.ts`、`ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- 小说生产能力：当前项目在上游之外新增了完整小说生产工作台，不属于 ComfyForge 缺口。

## 高优先级缺口

### 1. 画布一键漫剧流水线未完整迁入

上游 `frontend-react/src/pages/Canvas/index.tsx` 的“一键漫剧”会创建：

- 分镜大师 `generate` 节点，开启 `_fissionEnabled`。
- 分镜绘图 `generate` 节点。
- 分镜预览 `display` 节点。
- 两条连线，形成 `故事 -> 分镜裂变 -> 生图 -> 展示` 链路。

当前状态：已迁移。`ui/web/src/pages/CanvasPage.tsx` 已接回三节点两连线创建逻辑，分镜大师会写入 `_fissionEnabled` 和 `_fissionExpectedCount`，并接入 DAG 裂变执行。

### 2. GenerateNode 上游能力被简化

上游 `GenerateNode` 包含的能力核对如下：

- 自动加载 Key 和模型列表：已迁移，并恢复上游 `/models/?key_id=...&mode=...` 的服务端能力筛选；前端仍保留本地能力过滤兜底，避免模型较多时全量拉取拖慢节点配置。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- 收藏模型过滤：已迁移。
- 动态模型 UI 参数渲染：已迁移。
- 运行/中断双态按钮：已迁移。
- 裂变输出数量校验与状态提示：已迁移核心能力。
- 媒体预览尺寸徽章：已迁移核心能力。
- 预设 SystemRole 一键创建：已迁移，支持创建全局 `SystemRole` prompt 资产，已存在则直接选中。
- 紧凑视图 + 浮层配置面板：已迁移，基于当前 `BaseNode` 接入齿轮配置入口，节点主体只保留短 prompt、运行和输出预览。
- WebSocket 异步结果回传：已迁移 SSE 主链路和上游 WebSocket 兼容入口。TS 后端新增 `/api/generate`，带 `client_id` 时后台执行并通过 `/api/sse/:clientId` 推送 `status/result/error`；同时兼容上游 `/api/ws/:clientId` WebSocket，消息会双发给 SSE 和 WS 客户端；WS 入口会把 `/api/ws/:clientId/` 归一化为同一个 `clientId`，避免代理追加尾斜杠后结果回传与后台任务 ID 对不上；中断入口也补齐 `/api/interrupt/:clientId/` 尾斜杠别名，避免旧客户端或代理改写路径后无法停止后台任务。
- 生成任务客户端 ID 兼容：`/api/generate` 除上游 `client_id/params.client_id` 外，也支持 TS 客户端常见的 `clientId/params.clientId`，普通 LLM 和 ComfyUI 分流都会进入后台任务注册与 SSE/WS 回传链路，不会误退化成同步请求。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- SSE 地址配置兼容：前端 SSE 客户端已改为跟随 `VITE_API_BASE_URL`，不再写死 `localhost:8787`，避免本地切到 `18787`、代理部署或远程 API 时 POST 命中正确后端但实时回传连错端口。覆盖测试见 `ui/web/src/utils/sse.test.ts`。
- 普通 LLM/媒体生成后台中断：已补齐上游 `task.cancel` 等价语义。`/api/generate` 非 ComfyUI 分支带 `client_id` 后会注册 AbortController，中断时 abort 底层 provider-runtime fetch，而不是只停止前端消息回传，避免长任务继续消耗上游资源。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- 连入图片资产地址归一化：已移除上游旧 FastAPI `localhost:8000` 拼接，视觉、图生图和图生视频输入本地资产时会走当前 TS 主运行时 `/api/assets/media/...`；旧临时文件 `/api/files/...` 会保留为本地媒体输入，后端运行时会从 `workspace/data/temp` 读取并转成 data URI 再发给云端模型，远程 URL 与 data URL 保持原样。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`、`ui/server/src/routes/generate.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- GenerateNode `incoming_assets` 多模态链路：已补回上游“左侧连线资产打包进 `incoming_assets`”语义。前端会收集所有图片连线和文本参考资产，写入 `params.incoming_assets` 并在 vision 消息中保留多图 content parts；TS 后端 `/api/generate` 会从 `incoming_assets` 生成结构化 user message、保留首图 `image_url` 兼容旧媒体路由、写入 `source_asset_ids`，生成响应会把 `source_asset_ids` 回传到顶层和 `result`，方便下游 Display 或保存资产继续追踪来源；provider runtime 已支持 OpenAI-compatible、Codex Responses 和 Gemini native 的结构化图片消息，其中 Gemini 会在发送前把本地媒体 URL 转为 data URI。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`、`ui/server/src/routes/generate.test.ts`、`ui/server/src/llm/provider-runtime.test.ts`。
- GenerateNode 二次生成血缘已补强：前端会从上游节点读取 `source_asset_ids/sourceAssetIds`、`result.source_asset_ids` 和 `incoming_data.source_asset_ids`，写入 `incoming_assets.source_asset_ids`；后端 `/api/generate` 会展开这些来源数组并去重，避免多素材生成后再生成时只保留单个节点 ID。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`、`ui/server/src/routes/generate.test.ts`。
- GenerateNode 多跳输入读取：已补齐从 `result.file_path/url/media_url/output_files`、`asset.data.file_path/url/media_url`、`incoming_data.file_path/url/content/media_url` 读取上游内容的能力，避免 Display/LoadAsset、视频 loop 或 Comfy 云端结果通过智能水管传图/传视频后生成节点拿不到素材。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- GenerateNode 动态端口刷新：模式切换后会调用 React Flow `updateNodeInternals(id)`，确保 vision、图生图、图生视频等模式新增的图片输入端口立即可连线。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- GenerateNode 裂变结果当前配置读取：SSE 返回结果时会从当前画布 store 读取 `_fissionEnabled/_fissionExpectedCount`，避免长任务期间配置更新后仍按旧 props 判断裂变。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- GenerateNode 结果入库：已补齐项目画布下的项目作用域保存，媒体资产会同时写入 `content/file_path/url`，并按生成模式和文件扩展名区分 image/video，避免图生视频结果被误存为图片；保存时保留 provider/model/mode/prompt/system/params/比例/镜头参数等血缘字段，同时将媒体路径和素材来源写入顶层 `file_path/source_asset_ids`，保存后刷新当前项目资产库。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- GenerateNode 画幅预设已切回共享完整比例表：文生图/视频节点现在与 `AspectRatioSelector` 使用同一套 `自适应/1:1/9:16/16:9/3:4/4:3/3:2/2:3/4:5/5:4/21:9/custom` 预设和尺寸映射，不再停留在本地简化比例列表。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- GenerateNode 摄像机提示词注入已对齐上游语义：摄像机/镜头后缀会进入 `payload.prompt` 和用户 `messages` 内容，不再误追加到 system message，避免走 chat/vision messages 协议的网关忽略镜头参数或污染系统角色。覆盖测试见 `ui/web/src/components/nodes/generateNode.test.ts`。
- 画布生成路由参数透传与错误响应：`/api/generate` 现在会把 `image_url` 和节点动态 UI 参数（如 `size/steps/guidance_scale`）传入运行时媒体请求，同时过滤 `client_id` 和空值，避免图生图/图生视频连线素材或高级参数在路由层丢失；同步错误响应会同时返回 `error/detail`，并保留 `runtimeSelection` 诊断信息，执行器直接抛异常时也会返回结构化 JSON 而不是交给默认异常页。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- 媒体生成纯文本提示词保护：已补回上游 Qwen 适配器中“从多模态输入提取纯文本提示词”的防呆语义。TS 运行时和 `ConfiguredProviderAdapter` 在 `text_to_image/image_to_image/text_to_video/image_to_video` 等媒体请求中，会只把消息里的文本片段写入 `prompt`，图片素材继续走 `image_url`，避免云端图片/视频模型把本地媒体 URL 或多模态 JSON 当作提示词内容。覆盖测试见 `ui/server/src/llm/provider-runtime.test.ts`、`ui/server/src/llm/adapter.test.ts`。
- 画布生成模型选择已补齐 provider 约束：当不同厂商存在同名模型且请求携带 `provider` 时，`/api/generate` 会优先选择该 provider 下的本地模型记录；当请求模型名尚未同步到本地时，会回落到同 provider 的可用模型，避免被其它厂商同名模型或全局默认模型带偏。覆盖测试见 `ui/server/src/routes/generate.test.ts`。

当前 `GenerateNode` 已有基础连线输入、Key/模型选择、收藏过滤、动态参数、基础运行/中断、入库溯源、预设 SystemRole 一键创建、紧凑视图 + 浮层配置面板、`_runSignal` DAG 触发、裂变结果解析、SSE 异步结果回传和上游 WebSocket 兼容入口。

### 3. 全局运行急停和断点续跑不完整

当前状态：已迁移。`CanvasPage` 的全局停止会批量调用 `/interrupt/:nodeId`；断点续跑会保留成功节点并把成功节点结果重新推送给下游；DAG tick 会触发 `_runSignal`、处理裂变结果、静音旁路和死锁检测。

补充：画布 store 已恢复上游新增节点写入历史的语义，`addNode` 后可通过撤销回到新增前状态，避免创作画布误加节点后无法回退。覆盖测试见 `ui/web/src/stores/canvasStore.test.ts`。

补充：画布清空动作已改为 `clearCanvas` store action，会先写入历史再清空节点、连线和运行状态，误点清空后可用撤销恢复。覆盖测试见 `ui/web/src/stores/canvasStore.test.ts` 和 `ui/web/src/pages/canvasPageMigration.test.ts`。

补充：载入项目画布或切换画布数据时，`setCanvasData` 会清空旧 `nodeRunStatus` 并停止全局运行，避免上一个项目的成功/失败/运行状态污染当前画布的断点续跑和 DAG 调度。覆盖测试见 `ui/web/src/stores/canvasStore.test.ts` 和 `ui/web/src/pages/canvasPageMigration.test.ts`。

补充：抽出的 DAG planner 已对齐上游内联逻辑，画布中只有 `nodeGroup` 节点时会正常结束全局运行，不会因为没有可执行节点而保持运行中。覆盖测试见 `ui/web/src/pages/canvasDagRunner.test.ts`。

补充：DAG 单步调度已从页面 effect 抽成 `planCanvasDagStep` 纯函数，覆盖“已有错误时不再触发新节点”和“静音节点继承上游输出并透传到下游”的关键分支，避免长流水线在失败暂停时继续消耗后端任务。覆盖测试见 `ui/web/src/pages/canvasDagRunner.test.ts`，页面源守卫见 `ui/web/src/pages/canvasPageMigration.test.ts`。

仍需后续补强：对 DAG 引擎做本地浏览器 smoke，验证真实节点执行、裂变分支生成和 UI 状态变化。

### 4. LocalComfy 执行器未映射到 TS 主运行时

上游有：

- `backend/core/executors/local_comfy.py`
- `backend/core/executors/cloud_video_loop.py`
- `backend/core/executors/real_video_loop.py`
- `backend/core/cloud_comfy_client.py`

当前状态：LocalComfy 第一版已迁移到 TS 主运行时。

- 新增 `ui/server/src/comfy-local.ts`，支持向 ComfyUI `/prompt` 投递 workflow，轮询 `/history/:prompt_id` 或 `/history`，下载 `images/gifs/videos` 输出，并保存到 workspace `assets/comfy-output`。
- `/api/generate` 会在 `provider.service_type = "comfyui"` 或 `model = "comfyui-workflow"` 时分流到 LocalComfy 执行器，不再误走 LLM runtime。
- `ComfyUIEngineNode` 已从占位卡片升级为可运行节点：支持 Comfy provider/key、工作流 JSON、参数映射、动态参数端口、SSE 结果回传、输出预览和携带工作流血统保存资产。
- `ComfyUIEngineNode` 已补齐执行凭证自动选择：选择或自动恢复 ComfyUI provider 后，会沿用当前有效 Key；当前 Key 缺失或不属于该 provider 时，会自动选中第一个活跃 Key，减少 DAG 运行前的手动配置阻断。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 参数连线已补齐 Generate/Display/LoadAsset 多跳媒体输入兼容：图片参数会读取 `result.file_path/url/content/media_url/output_files`、`result.data.file_path/url/media_url`、`asset.data.file_path/url/media_url`、`asset.thumbnail`、`incoming_data.file_path/url/content/media_url`，并把连入素材资产 ID 记录为运行结果的 `source_asset_ids`，避免不同节点或上游响应字段差异导致工作流注图为空，或保存产物后丢失来源素材关系。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 二次生成血缘已补强：连入 Generate/Display 等上游节点时会继承 `result.source_asset_ids`、`incoming_data.source_asset_ids` 及 camelCase 变体，保留多素材来源数组，不再只记录单个 `asset_id`。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- 画布参数类型识别已补齐上游视频帧字段：`frame_a/frame_b/first_frame/last_frame/start_frame/end_frame` 会被识别为图片输入，避免视频/Comfy 工作流首尾帧参数被当成通用或文本输入导致取不到 `file_path`。覆盖测试见 `ui/web/src/utils/handleTypes.test.ts`。
- `ComfyUIEngineNode` 已接回上游拖拽工作流资产能力：从资产库拖入 workflow/prompt 资产时自动载入 workflow JSON、参数映射并清空旧参数值。
- `ComfyUIEngineNode` 动态端口刷新已补齐：参数映射 JSON、拖入 workflow 资产或连入 workflow 资产导致暴露参数变化时，会按 React Flow 正确用法调用 `updateNodeInternals(id)`，避免参数端口数量/位置不同步导致无法连线。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 已接回上游比例/摄像机/运镜控制第一版：配置面板可选择画面比例、自定义尺寸、摄像机参数和运镜预设；运行时会把摄像机提示词后缀注入 text 类型参数，运镜预设会插入第一个 text 参数，并把比例/摄像机信息写入产物血统。
- `ComfyUIEngineNode` 文本参数注入已补齐默认提示词保护：只有手填或连线提供明确文本值时才覆盖 workflow 默认值并追加摄像机后缀，避免仅开启镜头参数时把原始提示词替换成单独的镜头后缀。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 产物入库已补齐项目作用域和完整视觉血统：在项目画布中保存图像/视频产物时会写入当前 `project_id`，并保留 `source_aspect_ratio/source_size/source_camera_params/source_camera_suffix`，避免物理机产物误落为全局资产或丢失镜头参数。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 产物保存会同步写入顶层 `file_path/source_asset_ids`，并在 `data` 内保留同一份来源资产 ID，避免工作流渲染结果在资产大厅、版本化编辑或视频循环中丢失媒体路径和上游素材关系。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- `ComfyUIEngineNode` 运行结果血统已改为优先读取本次运行上下文：同步返回或 SSE 回调不再依赖可能滞后的 React `data` props，避免保存资产时丢失最终注入后的 workflow 和参数。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- 画面比例选择器已补回上游完整预设和尺寸映射：支持自适应、1:1、9:16、16:9、3:4、4:3、3:2、2:3、4:5、5:4、21:9 和自定义，同时保留当前字符串值 API；生成节点和 ComfyUI 节点会把“自适应”空值作为合法选择持久化，不再刷新后回落到 16:9。覆盖测试见 `ui/web/src/components/aspectRatioSelector.test.ts`。
- Key 管理后端已保留 ComfyUI `base_url` 字段，避免 UI 填写后被归一化丢弃。
- ComfyUI 物理中断已接入：后台任务会注册 `cancelToken.interrupt`，`/api/interrupt/:clientId` 和 `/api/interrupt/:clientId/` 会设置取消标记、调用 ComfyUI `/interrupt`，再通过 SSE 通知前端。
- ComfyUI 本地执行取消传播已接入：`/api/generate` 会为后台 Comfy 任务注入 `AbortSignal` 和 `isCancelled`，用户中断后 LocalComfy 上传、排队、轮询等待和输出下载都会尽快停止，避免前端已停但后台仍持续轮询或落盘。覆盖测试见 `ui/server/src/comfy-local.test.ts` 与 `ui/server/src/routes/generate.test.ts`。
- ComfyUI 细粒度进度第一版已接入：LocalComfy 执行器会发出 `queued/polling/completed/downloading` 状态，`/api/generate` 会转成 SSE `status` 推给画布节点。
- ComfyUI inline 图片上传已接入：提交 workflow 前会扫描 `data:image/...` 和远程图片 URL，上传到 `/upload/image`，并把字段替换为 ComfyUI 可识别的文件名。
- ComfyUI 通用输入文件映射已接入：LocalComfy 执行器支持上游 `input_files` 语义，调用方可传入 workspace 内素材路径和 `comfy_input_dir`，执行器会把文件复制到 ComfyUI input 目录，并把 workflow 中同名 input 字段替换为短文件名；`/api/generate` 会透传该配置，避免只有视频 loop 能使用本地 LoadImage 输入文件。覆盖测试见 `ui/server/src/comfy-local.test.ts` 与 `ui/server/src/routes/generate.test.ts`。
- ComfyUI 输入文件字段兼容已补强：`/api/generate` 除上游 `input_files` 外，也接受 TS 客户端常见的 `inputFiles`，并继续配合 `comfyInputDir/comfy_input_dir` 注入 LocalComfy 执行器，避免外部 SDK 传 camelCase 时本地 LoadImage 素材映射丢失。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- ComfyUI 云端代理返回格式容错已补强：`/prompt` 响应可识别顶层 `prompt_id`、camelCase `promptId` 以及 `data/result/output` 嵌套任务 ID；`/history/:prompt_id` 也能读取 `data/result/output.outputs` 嵌套历史，兼容 RunningHub/代理网关常见包装格式。覆盖测试见 `ui/server/src/comfy-local.test.ts`。
- ComfyUI 云端代理深层包装容错已补强：`/prompt`、`/history/:prompt_id` 和 `/upload/image` 会递归展开 `data/result/output` 包装，识别 `data.result.prompt_id`、`data.result[prompt_id].outputs`、`data.result.fileName` 等常见网关返回，不再因云端多包一层导致任务已提交但本地误判无 ID、无 history 或写回错误上传文件名。覆盖测试见 `ui/server/src/comfy-local.test.ts`。
- ComfyUI 云端代理 `task/file` 包装容错已补强：LocalComfy 的通用 envelope 解包已与视频 loop 对齐，递归展开 `data/result/output/file/task`，可识别 `data.task.taskId` 和 `data.task.outputs` 这类云端网关返回，避免任务已创建但队列 ID 或 history 被包在 task 对象里导致失败。覆盖测试见 `ui/server/src/comfy-local.test.ts`。
- ComfyUI 云端输出格式容错已补强：history 输出除了标准 `images/gifs/videos`，还会识别上游云端执行器使用的 `files` 数组，以及 `output/data/result` 中的 `url/file_url/download_url/media_url` 等直接远程产物地址；远程产物会下载并保存到 workspace 媒体目录，继续走当前资产预览链路。覆盖测试见 `ui/server/src/comfy-local.test.ts`。
- ComfyUI 云端 data URL 输出已补强：部分代理会把小图或转码结果直接放在 `output/data/result` 的 `data:image/...` 或 `data:video/...` 字符串中，或包装成 `{ dataUrl }` / `{ data_url }` / `{ url: "data:image/..." }` 对象；TS 执行器现在会识别并解码落盘，画布 Comfy 节点也会把 `data:video/...` 走视频预览分支，避免云端任务完成但 `output_files` 为空或视频被当作图片展示。覆盖测试见 `ui/server/src/comfy-local.test.ts`、`ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。
- ComfyUI `input_files` selector 兼容已补强：除 `image`、`inputs.image`、`7.image` 外，现在也支持 `7.inputs.image` 和对应斜杠形式，避免旧模板或外部工具传完整 workflow 路径时只复制文件但没有替换 LoadImage 输入。覆盖测试见 `ui/server/src/comfy-local.test.ts`。
- 上游 WebSocket 兼容已接入：TS 后端挂载 `/api/ws/:clientId`，同一任务消息会通过 `taskMessageManager` 同时推送给 SSE 和 WebSocket 客户端；断开时保留“旧连接不误删新连接”的防误杀语义，且 SSE/WS transport 断开不会注销仍在运行的后台任务，避免刷新页面或网络抖动后 `/api/interrupt/:clientId` 失去物理中断能力。覆盖测试见 `ui/server/src/ws-manager.test.ts`。
- 画布 ComfyUI RunningHub 代理兼容已接入：`/api/generate` 的 ComfyUI 分流会像上游 `ComfyUIAdapter` 一样，在 Base URL 命中 RunningHub 且 Key 存在时自动拼接 API Key，并避免额外注入 Bearer 鉴权，防止路径代理鉴权被双重凭证干扰；这避免视频工坊可用但画布算力节点走未授权代理地址。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- 画布 ComfyUI generic 云端鉴权已补强：非 RunningHub 的云端 Comfy 网关可直接在生成请求中携带 `api_key/runninghub_api_key` 作为临时凭证，后端会按 Provider `auth_type` 生成 `Authorization` 或 `x-api-key`，对齐上游 `CloudComfyClient(base_url, api_key)` 语义，避免没有本地 Key 记录时云端代理请求裸奔。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- 画布 ComfyUI 云端参数字段兼容已补强：`/api/generate` 除 `base_url/comfy_base_url/api_key/runninghub_api_key` 外，也接受 TS 客户端常见的 `baseUrl/comfyBaseUrl/apiKey/runninghubApiKey`；工作流除顶层 `workflow_json/workflowJson/workflow/prompt` 外，也支持 SDK 风格的 `params.workflow_json/params.workflowJson/params.workflow`；RunningHub 代理会继续把 API Key 拼进 Base URL，generic 云端网关会继续生成鉴权 header。覆盖测试见 `ui/server/src/routes/generate.test.ts`。
- 画布 ComfyUI 云端代理参数面板已接入第一版：`ComfyUIEngineNode` 配置面板可填写云端 Base URL、RunningHub API Key 和 ComfyUI input 目录，运行时会把 `base_url/runninghub_api_key/comfy_input_dir` 透传给 `/api/generate`，对齐 TS 后端已有云端代理和本地素材映射能力。覆盖测试见 `ui/web/src/components/nodes/comfyUIEngineNode.test.ts`。

仍需后续补强：云端 Comfy 客户端鉴权差异、真实浏览器 smoke 验证 Comfy 节点工具面板交互。

### 6. 视频 loop 执行器

上游有：

- `/api/tasks/real_video_loop`
- `/api/tasks/cloud_video_loop`
- `backend/core/executors/real_video_loop.py`
- `backend/core/executors/cloud_video_loop.py`
- `VideoWorkshop` 页面入口

当前状态：已迁移第一版到 TS 主运行时。

- 新增 `ui/server/src/video-loop.ts`，支持从 workspace `assets.json` 读取 workflow/image/prompt 资产。
- `workflow` 资产通过 `data.workflow_json` 和 `data.parameters.frame_a/frame_b/prompt` 映射注入首帧、尾帧和提示词。
- 每个 segment 复用 `executeLocalComfyWorkflow` 执行，返回 `final_video`、`media_url`、`segments`、`segment_outputs` 和可选资产 ID。
- 支持配置 ComfyUI input 目录：执行前会把首尾帧资产复制到 input 目录，并把复制后的短文件名注入 workflow，兼容 ComfyUI LoadImage 类节点对输入文件名的要求。
- 多段输出会尝试使用 `ffmpeg` 拼接；单段输出直接返回 ComfyUI 结果。
- 新增 `ui/server/src/routes/video-loop.ts` 并注册上游兼容 `/api/tasks/video_loop`、`/api/tasks/real_video_loop`、`/api/tasks/cloud_video_loop`，三个入口都显式支持尾斜杠别名。其中 `/api/tasks/video_loop` 映射到当前 TS 版 real video loop 执行器，避免旧客户端按上游基础入口调用时 404；执行错误会同时返回 `error/detail`。覆盖测试见 `ui/server/src/routes/video-loop.test.ts`。
- `/api/tasks/video_loop` 已补回上游 legacy 视频延展协议：当请求携带 `initial_video_path/total_seconds/segment_seconds` 时，不再强制要求 `workflow_asset_id` 和首尾帧资产，而是按上游 mock video loop 语义生成分段输出并返回 `final_video/segments/num_segments/media_url`；携带 `workflow_asset_id` 的当前资产工作流请求仍走 `real_video_loop`。覆盖测试见 `ui/server/src/video-loop.test.ts` 与 `ui/server/src/routes/video-loop.test.ts`。
- `VideoWorkshop` 结果播放已改为使用 TS 后端返回的 `media_url`，并统一复用 `buildAssetMediaUrl` 处理绝对 workspace 路径、相对路径和 `/api/assets/media/...` 路径，不再硬编码旧 FastAPI `localhost:8000/api/files` 或把本地绝对路径误当浏览器路径。覆盖测试见 `ui/web/src/pages/videoWorkshopMedia.test.ts`。
- `VideoWorkshop` 已接入当前资产库：工作流、首帧、尾帧和提示词都可从资产下拉选择，并支持填写 ComfyUI input 目录传给后端。
- `cloud_video_loop` 已具备云端 ComfyUI 代理式闭环：RunningHub 风格 base URL 会自动拼接 API Key，执行前上传首尾帧到 `/upload/image`，再把云端返回文件名注入 workflow，后续仍复用 `/prompt`、`/history`、`/view` 轮询并下载输出。
- `VideoWorkshop` 云端模式已暴露 Base URL 和 RunningHub API Key 输入，不再只有不可配置的“云端 RunningHub”入口。
- RunningHub 模板任务第一版已接入：`cloud_video_loop` 在请求包含 `workflow_template_id`/`runninghub_template_id` 时可绕过本地 workflow 资产，上传首尾帧，调用云端模板创建/状态接口，下载输出片段并复用本地拼接/资产入库逻辑；上传响应已兼容 ComfyUI 的 `name/filename`、RunningHub 常见的 `fileName/fileId` 及 `data/result` 嵌套返回；`VideoWorkshop` 已暴露 RunningHub 模板 ID、模板提交/状态路径和输入键名配置，便于适配不同云端模板协议。覆盖测试见 `ui/server/src/video-loop.test.ts`、`ui/web/src/pages/canvasPageMigration.test.ts`。
- 视频 loop 产物资产血缘已补齐：当请求携带 `project_id/source_asset_ids` 时，保存的视频资产会写入顶层 `project_id/source_asset_ids/file_path`，同时保留 `data.file_path/media_url/workflow_asset_id`，对齐上游 `save_video_as_asset` 的资产血缘语义。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- `cloud_video_loop` 已补回上游旧协议兼容：当旧客户端仍按 `initial_video_path + total_seconds + segment_seconds` 调用云端循环入口、且未提供 workflow/template 字段时，会降级走旧循环协议，不再因为缺少云端 `base_url` 或首尾帧 `segments` 直接失败。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- RunningHub 模板任务状态轮询已补强：云端接口即使先返回 `SUCCESS/COMPLETED` 但输出 URL 稍后才落盘，执行器也会继续查询到 URL 或超时，不再把“任务成功但产物未同步完成”的中间态误判为失败。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- RunningHub 模板任务失败态已补强：状态查询返回 `FAILURE/FAIL/TIMEOUT/ABORTED/REJECTED/EXPIRED` 等厂商变体时会立即报出云端模板任务失败，不再继续轮询到“未返回输出 URL”或超时。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- RunningHub 模板任务深层包装容错已补强：上传、创建和状态查询响应会递归展开 `data/result/output/file/task` 包装，识别 `data.result.fileName`、`data.result.taskId`、`data.result.taskStatus` 和深层输出 URL，避免不同网关 envelope 造成模板任务误失败。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- 视频 loop 工作流参数注入已对齐上游容错语义：`workflow` 资产声明了必要参数但具体节点或中间字段在旧模板中缺失时会跳过该目标，继续注入其它可用参数并执行，而不是让整段视频直接失败；完全缺少 `frame_a/frame_b/prompt` 参数映射仍会阻断。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- 视频 loop 片段字段已补 TS 客户端兼容：`segments` 内除了上游 `frame_a_asset_id/frame_b_asset_id/prompt_asset_id`，也支持 `frameAAssetId/frameBAssetId/promptAssetId`，避免外部自动化或前端 SDK 使用 camelCase 请求时被误判为缺资产。覆盖测试见 `ui/server/src/video-loop.test.ts`。
- 视频 loop 顶层请求字段已补 TS 客户端兼容：`workflowAssetId/workflowTemplateId/runninghubTemplateId/baseUrl/apiKey/templateSubmitPath/templateStatusPath/templateInputKeys/comfyInputDir/timeoutMs/pollIntervalMs` 等 camelCase 字段会归一化为内部 snake_case，模板输入键也支持 `frameA/frameB`，避免外部 SDK 调用云端模板任务时因字段风格差异失败。覆盖测试见 `ui/server/src/video-loop.test.ts`。

仍需后续补强：真实 RunningHub 生产账号 smoke，确认厂商当前 `create/status/upload` 路径和鉴权字段；当前第一版已提供模板 ID 闭环和可配置路径入口，但未绑定某个厂商版本的完整协议矩阵。

### 5. 推荐规则与建议系统

上游有：

- `/api/recommendation-rules`
- `/api/suggestions/report`
- `/api/suggestions/recommend`

当前状态：已迁移最小闭环。TS 后端新增 `ui/server/src/routes/recommendation-rules.ts` 并注册到主运行时，支持：

- 手动推荐规则 CRUD。
- `combined` 合并手动规则和学习统计，手动规则优先。
- 参数使用统计上报。
- 按节点类型返回高频参数推荐。
- 前端 `ruleApi` 已恢复上游 `/recommendation-rules/` collection 路径，避免规则管理页与 FastAPI 风格客户端在尾斜杠路径上继续漂移。
- `combined`、单规则 CRUD、`suggestions/report` 和 `suggestions/recommend` 子路由均显式支持尾斜杠别名，兼容 FastAPI 风格旧客户端。
- 学习统计会按 `class_type + field` 聚合求和，并保留最新 `updated_at`，对齐上游数据库唯一索引和 `combined` 分组语义，避免 JSON 存储或旧数据中出现重复统计行时推荐参数重复显示。
- 手动推荐规则读取时会补齐上游默认字段 `auto_check/enabled/priority/threshold/created_at/updated_at`，旧 JSON 规则不会因缺 `enabled` 而在 `?enabled=true` 查询和 `combined` 输出中被漏掉。
- `suggestions/recommend` 会要求传入 `class_type`，避免缺参数时把不同节点类型的学习统计混合推荐；`suggestions/report` 在没有有效 `class_type + field` 条目时不会写入统计文件，减少空操作造成的本地数据噪音。
- 推荐规则和建议接口已补 TS 客户端字段兼容：规则创建/更新/旧数据读取支持 `classType/friendlyName/autoCheck`，建议上报和推荐查询支持 `classType`，内部仍统一落为上游兼容的 `class_type/friendly_name/auto_check`。

存储方式采用 workspace 内 JSON 文件，不新增数据库依赖。

## 第一批迁移建议

第一批先迁移低风险、前端局部功能：

1. 接回 `CanvasPage` 的一键漫剧流水线创建逻辑。
2. 修复全局急停：停止时批量调用 `/interrupt/:nodeId`。
3. 修复断点续跑：保留成功节点，并把成功节点结果重新推送给未成功下游。

这些改动不改变 Provider/模型运行协议，不影响小说工作台，风险可控。

当前状态：已完成。覆盖测试见 `ui/web/src/pages/canvasPageMigration.test.ts`：

- 一键漫剧入口会创建 `分镜大师 -> 分镜绘图 -> 分镜预览` 三节点两连线流水线。
- 分镜大师节点写入 `_fissionEnabled` 和 `_fissionExpectedCount`，保留后续裂变调度接入点。
- 全局停止会批量调用 `/interrupt/:nodeId`。
- 断点续跑会保留成功节点，并把成功节点输出重新推送到未成功下游。

## 第二批迁移建议

迁移 `GenerateNode` 的运行体验：

1. Key/模型自动加载。
2. 动态参数渲染。
3. 运行/中断双态按钮。
4. 裂变数量可视化。
5. 媒体尺寸徽章。

第二批前置子任务状态：已完成。当前已迁移上游 Canvas 的 `executeFission`、裂变后克隆分支调度、死锁检测、节点静音旁路、`_runSignal` 驱动和断点按钮显隐。覆盖测试见：

- `ui/web/src/stores/canvasStore.test.ts`
- `ui/web/src/pages/canvasPageMigration.test.ts`

第二批主体状态：已完成核心迁移。当前 `GenerateNode` 已支持 Key/模型自动加载、收藏过滤、动态参数渲染、运行/中断双态按钮、裂变数量可视化、媒体尺寸徽章、预设 SystemRole 一键创建、紧凑视图 + 浮层配置面板和 SSE 异步结果回传。覆盖测试见 `ui/web/src/pages/canvasPageMigration.test.ts`。

第二批剩余可选增强：真实浏览器 smoke 验证；当前主链路已使用项目内 SSE 通道完成异步结果回传，并保留 `/api/ws/:clientId` 上游兼容入口。

## 推荐规则迁移状态

当前状态：已完成第一版。覆盖测试见 `ui/server/src/routes/recommendation-rules.test.ts`：

- 能创建、列出、更新手动推荐规则，并兼容子路由尾斜杠访问。
- 能上报节点参数使用统计，并按使用次数推荐字段。
- `combined` 接口会把学习规则补到手动规则之后，并避免同一 `class_type + field` 重复出现。
- 旧手动规则会在读取时补齐默认字段，保证筛选和合并接口保持上游默认值语义。
- 错误响应已补齐上游 FastAPI 风格的 `detail` 字段，同时保留当前前端使用的 `error` 字段，覆盖 400/404/500 分支。
- 缺少 `class_type` 的推荐查询会返回可诊断错误；无有效条目的统计上报不会创建空统计文件。
- TS 客户端使用 `classType/friendlyName/autoCheck` 调用规则接口，或用 `classType` 上报/查询建议时，会被归一化为上游 snake_case 字段，不再因字段风格差异漏掉规则或统计。

这批会触碰模型管理与节点运行体验，需要更完整的前端测试。

## 第三批迁移建议

迁移主运行时后端能力：

1. TS 版 LocalComfy 执行器。当前已完成第一版。
2. 统一 DirectAPI/LocalComfy 调度入口。当前 `/api/generate` 已支持 LLM/Comfy 分流。
3. ComfyUI `/interrupt` 物理中断。当前已完成第一版。
4. WebSocket/SSE 进度桥接。当前主链路已使用 SSE 兼容桥完成结果和 ComfyUI 进度回传。
5. 视频 loop 执行器等价实现。当前已完成第一版，支持资产型 workflow 分段执行和接口接回。

这批需要后端集成测试和本地 ComfyUI 可选 smoke test。
