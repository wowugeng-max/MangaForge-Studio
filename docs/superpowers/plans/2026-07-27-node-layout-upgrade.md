# 节点布局易用性升级 Implementation Plan

> 已获用户批准的方案：按"改动频率"分三层重排 AI 大脑节点（主体 / 快速层 / 配置面板），P0+P1 全做，带 P2 低成本项。执行者对相关文件已有完整上下文，本 plan 为导航级（非逐步代码级）。

**Goal:** 高频操作（换模式/模型、调常用参数、运行）一次点击可达；配置面板瘦身分组并跟随节点；消除双提示词入口。

**Tech:** ReactFlow `NodeToolbar`（已验证可从 'reactflow' 导入）承载配置面板与快速选择层，替代手工 fixed portal。antd `Segmented`/`Dropdown`/`Collapse`（均在 vite split-antd-imports 映射表内）。

## Global Constraints

- 分支 `feature/node-layout-upgrade`（自 main）。
- 迁移测试断言随实现同步更新（canvasPageMigration.test.ts 的 portal/clamp 断言会失效，改为 NodeToolbar 断言）。
- 提示词唯一入口 = 节点主体 TextArea；配置面板中的提示词框删除。
- 快捷参数自动提升规则：`pickQuickParams(context_ui_params[mode])` 取前 2 个 select/number 参数；chat/vision 无参数时显示 温度 + 裂变开关。
- 文案：OUTPUT_PREVIEW→生成结果、GPU_OUTPUT→渲染结果、VISUAL_OUTPUT→展示内容。

### Task A: NodeConfigToolbar 容器 + GenerateNode 面板迁移瘦身
- Create `ui/web/src/components/nodes/NodeConfigToolbar.tsx`：NodeToolbar(Position.Right, align start, offset 12) + `[data-config-panel]` 卡片（宽 400、maxHeight 480、内滚动）+ 标题行关闭按钮。
- GenerateNode：configPanel 从 ReactDOM.createPortal 改为 NodeConfigToolbar；删除 panelPos/updatePanelPos/MutationObserver/resize 监听/clampToViewport import；点外关闭逻辑保留（antd 弹层白名单不动）。
- 面板内容瘦身：删提示词框、模式 Select、Key/模型/收藏（迁往 Task B 快速层）；余下按 Collapse 分组：生成参数（比例/自定义宽高/温度/路由策略）、角色与提示（System prompt/角色资产/预设）、镜头控制（CameraControl/CameraMovement，媒体模式）、高级参数（renderParams）。

### Task B: 身份条 + 模式/模型快速选择层
- 主体状态行改为可点击身份条（nodrag）：模式 Tag + 模型名 + chevron，右端保留裂变计数徽章；点击 toggle 快速层，与配置面板互斥。
- 快速层 = NodeToolbar(Position.Bottom, align start)：Segmented(MODES, size small) + Key Select + 模型 Select + 收藏星标按钮（逻辑自旧面板平移）。

### Task C: 快捷参数条 + 运行按钮重排
- generate-node-model.ts 加 `pickQuickParams(uiParams, limit=2)` 纯函数 + 单测（select/number 过滤、截取、非数组回退）。
- 主体提示词框下方一行：快捷参数（媒体模式=pickQuickParams 渲染紧凑控件，写回 params；无参数回退 aspectRatio Select；chat/vision=温度 InputNumber + 裂变 Switch）+ 右侧紧凑运行按钮（primary/danger 中断）。删原 block 大按钮；裂变 Tag 点击切换逻辑由 Switch 替代。

### Task D: BaseNode 标题栏 + 预览标题中文化
- 标题栏按钮点击区加大（padding 5px / icon 12px）；按钮组改为 [齿轮(如有)] [折叠] [⋯Dropdown]；Dropdown 菜单：存为资产、节点颜色（内嵌 ColorPicker label）。
- GenerateNode/ComfyUIEngineNode/DisplayNode 预览标题中文化（按 Global Constraints 文案表）。

### Task E: ComfyUIEngineNode 一致性
- 面板迁 NodeConfigToolbar + Collapse 分组：连接与凭证（Provider/Key Select）、云端代理、工作流 JSON、参数映射、镜头与比例、暴露参数。
- 主体 COMFY Tag + Provider 名改为可点击身份条 → 快速层（Provider + Key Select）。

### Task F: 测试同步 + 回归
- 更新 canvasPageMigration.test.ts：紧凑视图用例（createPortal→NodeToolbar 断言）、clamp 用例（删/改）、comfy 用例受影响断言；bun test 画布相关全绿。
- `bun run build` 通过；浏览器回归：身份条换模式/模型、快捷参数写回、面板跟随节点拖动、折叠/展开、Comfy 面板分组。
