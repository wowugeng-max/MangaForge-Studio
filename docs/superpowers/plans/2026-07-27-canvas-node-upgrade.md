# 画布与节点能力升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复画布工作台迁移遗留的 9 个 bug，并补齐复制粘贴、自动布局、拖线建节点、边着色动画、键盘导航、边重连等通用节点编辑器能力。

**Architecture:** 所有可测逻辑抽成纯函数（独立文件 + bun test 单测），组件层只做接线；沿用项目现有的"迁移对照测试"（源码字符串断言）覆盖 JSX 结构性改动。Handle 渲染从 BaseNode children 中提出，成为节点组件顶层兄弟元素，从根上解决折叠断线。

**Tech Stack:** React 18 + ReactFlow 11 + zustand 5 + antd 5 + bun test。新增依赖：`@dagrejs/dagre`（自动布局）。

## Global Constraints

- 工作分支：`feature/canvas-upgrade`（从 `main` 切出）。禁止触碰 `ui/server/src/novel-*`、`ui/web/src/pages/novel-*` 等小说工作台文件——当前仓库有该方向未提交的进行中修改。
- 测试命令统一为 `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test <file>`；提交前跑受影响目录全量测试。
- 不引入 @dagrejs/dagre 之外的新依赖；不新增测试框架（无 DOM 测试库，组件结构用源码断言）。
- 中文 UI 文案与现有风格一致（如「整理布局」「已复制 N 个节点」）。
- 每个任务独立提交，commit message 用 `fix(canvas):` / `feat(canvas):` 前缀。
- 现有 82 个画布相关测试必须保持全绿；改动导致断言过期时同步更新对应迁移测试。

---

### Task 1: TypedHandle 组件 + 折叠不再断线

**问题:** [BaseNode.tsx:92](../../ui/web/src/components/nodes/BaseNode.tsx) 折叠时 `{!collapsed && children}` 卸载了 children 里的所有 `<Handle>`，ReactFlow 报 error #008，已连的边消失（浏览器实测确认）。

**方案:** 新建 `TypedHandle` 封装（类型色、Tooltip、hover 放大、折叠时收拢到标题栏中点）；四个节点组件把 Handle 移出 `<BaseNode>` children，成为顶层兄弟元素（ReactFlow 的 handle 是 absolute 定位于 node wrapper，位置不受影响），折叠时 Handle 保持挂载。

**Files:**
- Create: `ui/web/src/components/nodes/TypedHandle.tsx`
- Create: `ui/web/src/components/nodes/typedHandle.test.ts`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`（renderDynamicHandles + out handle 移出 BaseNode）
- Modify: `ui/web/src/components/nodes/DisplayNode.tsx`（in/out handle 移出）
- Modify: `ui/web/src/components/nodes/LoadAssetNode.tsx`（output handle 移出）
- Modify: `ui/web/src/components/nodes/ComfyUIEngineNode.tsx`（in/param/out handle 移出）
- Modify: `ui/web/src/global.css`（hover 放大样式）
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`（新增结构断言）

**Interfaces:**
- Produces: `TypedHandle(props: { id: string; type: 'source' | 'target'; position: Position; dataType: string; label?: string; top?: number; collapsed?: boolean; color?: string; isConnectable?: boolean })`
- Produces: `resolveTypedHandleTop(collapsed: boolean | undefined, top: number | undefined): number | string`（导出供测试与 Task 13 参考）

- [ ] **Step 1: 写失败测试**

`ui/web/src/components/nodes/typedHandle.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveTypedHandleTop, COLLAPSED_HANDLE_TOP } from './TypedHandle'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('TypedHandle', () => {
  test('collapsed handles snap to the header center', () => {
    expect(resolveTypedHandleTop(true, 70)).toBe(COLLAPSED_HANDLE_TOP)
    expect(resolveTypedHandleTop(true, undefined)).toBe(COLLAPSED_HANDLE_TOP)
  })

  test('expanded handles keep explicit top or default to 50%', () => {
    expect(resolveTypedHandleTop(false, 70)).toBe(70)
    expect(resolveTypedHandleTop(undefined, 110)).toBe(110)
    expect(resolveTypedHandleTop(false, undefined)).toBe('50%')
  })

  test('handles render outside BaseNode children so collapse keeps them mounted', () => {
    const generate = source('GenerateNode.tsx')
    const display = source('DisplayNode.tsx')
    const loadAsset = source('LoadAssetNode.tsx')
    const comfy = source('ComfyUIEngineNode.tsx')

    for (const code of [generate, display, loadAsset, comfy]) {
      expect(code).toContain('TypedHandle')
    }
    // Handle 必须位于 <BaseNode> 之外（fragment 顶层），不再作为 children 首元素
    expect(generate).toContain('{renderDynamicHandles()}\n      <BaseNode')
    expect(display).toContain('<BaseNode {...props} data={{ ...data, label:')
    expect(comfy).toContain('{renderParameterHandles()}\n      <BaseNode')
  })

  test('collapse keeps a hover style hook for handles', () => {
    const css = readFileSync(join(import.meta.dir, '../../global.css'), 'utf8')
    expect(css).toContain('.typed-handle:hover')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/components/nodes/typedHandle.test.ts`
Expected: FAIL（`Cannot find module './TypedHandle'`）

- [ ] **Step 3: 实现 TypedHandle**

`ui/web/src/components/nodes/TypedHandle.tsx`:

```tsx
import React from 'react'
import { Handle, Position, type HandleType } from 'reactflow'
import { Tooltip } from 'antd'
import { getTypeColor, getTypeLabel } from '../../utils/handleTypes'

export const COLLAPSED_HANDLE_TOP = 21

export function resolveTypedHandleTop(collapsed: boolean | undefined, top: number | undefined): number | string {
  if (collapsed) return COLLAPSED_HANDLE_TOP
  return top ?? '50%'
}

type TypedHandleProps = {
  id: string
  type: HandleType
  position: Position
  dataType: string
  label?: string
  top?: number
  collapsed?: boolean
  color?: string
  isConnectable?: boolean
}

export function TypedHandle({ id, type, position, dataType, label, top, collapsed, color, isConnectable }: TypedHandleProps) {
  const background = color || getTypeColor(dataType)
  const title = `${label || (type === 'target' ? '输入' : '输出')} · ${getTypeLabel(dataType)}`
  return (
    <Tooltip title={title} placement={position === Position.Left ? 'left' : 'right'}>
      <Handle
        id={id}
        type={type}
        position={position}
        isConnectable={isConnectable}
        className="typed-handle"
        style={{ top: resolveTypedHandleTop(collapsed, top), background, width: 12, height: 12, border: '2px solid #fff', transition: 'transform 0.15s ease, top 0.2s ease' }}
      />
    </Tooltip>
  )
}
```

`ui/web/src/global.css` 末尾追加:

```css
/* Canvas typed handles: enlarge on hover for easier grabbing */
.typed-handle:hover {
  transform: scale(1.45);
  z-index: 10;
}
```

- [ ] **Step 4: 四个节点组件接入**

GenerateNode.tsx——`renderDynamicHandles` 改用 TypedHandle 并带 collapsed；return 结构把 handles 与 out 移出 BaseNode：

```tsx
const collapsed = Boolean(data?._collapsed)
const outType = mode === 'chat' || mode === 'vision' ? 'text'
  : mode === 'text_to_image' || mode === 'image_to_image' ? 'image'
  : mode === 'text_to_video' || mode === 'image_to_video' ? 'video' : 'any'

const renderDynamicHandles = () => (
  <>
    {(mode === 'chat' || mode === 'vision') && <TypedHandle id="system" type="target" position={Position.Left} dataType="text" label="系统提示词" color="#fadb14" top={30} collapsed={collapsed} />}
    <TypedHandle id="text" type="target" position={Position.Left} dataType="text" label="文本输入" top={70} collapsed={collapsed} />
    {(mode === 'vision' || mode === 'image_to_image' || mode === 'image_to_video') && <TypedHandle id="image" type="target" position={Position.Left} dataType="image" label="图片输入" top={110} collapsed={collapsed} />}
  </>
)

return (
  <>
    {renderDynamicHandles()}
    <BaseNode {...props} onOpenConfig={() => setConfigOpen(v => !v)}>
      {/* 原 children 内容，删除其中的 renderDynamicHandles() 调用与底部 out Handle */}
    </BaseNode>
    <TypedHandle id="out" type="source" position={Position.Right} dataType={outType} label="生成结果" collapsed={collapsed} />
    {configPanel}
  </>
)
```

同时在文件顶部 `import { TypedHandle } from './TypedHandle'`，移除不再使用的 `Handle` import（`Position` 仍需保留）。

DisplayNode.tsx 同理：

```tsx
const collapsed = Boolean(data?._collapsed)
return (
  <>
    <TypedHandle id="in" type="target" position={Position.Left} dataType="any" label="通用输入" collapsed={collapsed} />
    <BaseNode {...props} data={{ ...data, label: data?._customLabel ? data.label : '结果展示' }}>
      {/* 原 children，去掉两个 Tooltip+Handle */}
    </BaseNode>
    <TypedHandle id="out" type="source" position={Position.Right} dataType="any" label="通用输出" collapsed={collapsed} />
    {/* Modal 保持在 BaseNode 内或外均可，保持原位 */}
  </>
)
```

LoadAssetNode.tsx：`renderHandle()` 改为返回 TypedHandle 并移到 BaseNode 外：

```tsx
const collapsed = Boolean(data?._collapsed)
const renderHandle = () => {
  if (!asset) return null
  const outputType = resolveAssetOutputType(asset)
  return <TypedHandle id="output" type="source" position={Position.Right} dataType={outputType} label={`输出 ${asset.name || ''}`} collapsed={collapsed} isConnectable={isConnectable} />
}
return (
  <>
    {renderHandle()}
    <BaseNode {...props} data={{ ...data, label: data?._customLabel ? data.label : (asset ? `资产 ${asset.name}` : '资产输入') }}>
      {/* 原 children 去掉 renderHandle() */}
    </BaseNode>
  </>
)
```

（`handleColorForOutput` 函数删除，颜色统一走 `getTypeColor`。）

ComfyUIEngineNode.tsx：

```tsx
const collapsed = Boolean(data?._collapsed)
const renderParameterHandles = () => {
  if (!parameters) return null
  return Object.keys(parameters).map((paramName, index) => {
    const paramType = inferParamType(paramName)
    return <TypedHandle key={paramName} id={`param-${paramName}`} type="target" position={Position.Left} dataType={paramType} label={`参数 ${paramName}`} top={126 + index * 42} collapsed={collapsed} />
  })
}
return (
  <>
    <TypedHandle id="in" type="target" position={Position.Left} dataType="workflow" label="工作流输入" top={48} collapsed={collapsed} />
    {renderParameterHandles()}
    <BaseNode {...props} onOpenConfig={() => setConfigOpen(value => !value)}>
      {/* 原 children 去掉 in/param handles 与底部 out Handle */}
    </BaseNode>
    <TypedHandle id="out" type="source" position={Position.Right} dataType="image" label="渲染产物" collapsed={collapsed} />
    {configPanel}
  </>
)
```

注意：折叠时多个参数 handle 会重叠在 top 21——可接受（视觉聚拢为一点，连线仍指向标题栏）。

- [ ] **Step 5: 跑测试**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/components/nodes/`
Expected: 全部 PASS（typedHandle.test.ts 新增 4 个 + 原有节点测试不回归；若 generateNode.test.ts / displayNode.test.ts 等有 `id="out"` 之类源码断言失效，把断言同步改为 TypedHandle 形式，语义不变）

- [ ] **Step 6: 浏览器验证**

启动预览（web dev server 已在 5173），画布加 AI 大脑节点 → 连线到结果展示 → 折叠 AI 大脑节点。
Expected: 边保持渲染、锚点收拢到标题栏；console 无 error #008。

- [ ] **Step 7: Commit**

```bash
git add ui/web/src/components/nodes/ ui/web/src/global.css ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "fix(canvas): keep handles mounted when node collapses via TypedHandle"
```

---

### Task 2: 画布加载剥离运行时状态（防自动触发生成）

**问题:** `_isGroupRunning`/`_runSignal` 被保存进 canvas_data；重新加载后 [GroupNode.tsx:284](../../ui/web/src/components/nodes/GroupNode.tsx) 的 effect 见 groupRunning=true 立即向子节点发 `_runSignal`，GenerateNode 自动调真实 LLM。

**Files:**
- Modify: `ui/web/src/stores/canvasStore.ts`（setCanvasData 内 sanitize）
- Test: `ui/web/src/stores/canvasStore.test.ts`

**Interfaces:**
- Produces: `sanitizeLoadedNodes(nodes: Node[]): Node[]`（从 canvasStore.ts 导出）

- [ ] **Step 1: 写失败测试**（canvasStore.test.ts 追加）

```ts
import { sanitizeLoadedNodes } from './canvasStore'

describe('sanitizeLoadedNodes', () => {
  test('strips runtime trigger fields so loading never auto-runs', () => {
    const loaded = sanitizeLoadedNodes([
      { id: 'g1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { label: '组', _isGroupRunning: true, _muted: false } } as any,
      { id: 'n1', type: 'generate', position: { x: 0, y: 0 }, data: { label: 'A', _runSignal: 12345, prompt: 'keep me' } } as any,
    ])
    expect(loaded[0].data._isGroupRunning).toBeUndefined()
    expect(loaded[1].data._runSignal).toBeUndefined()
    expect(loaded[1].data.prompt).toBe('keep me')
  })

  test('setCanvasData applies sanitize', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'g1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { _isGroupRunning: true } } as any,
    ], [])
    const node = useCanvasStore.getState().nodes.find(n => n.id === 'g1')!
    expect((node.data as any)._isGroupRunning).toBeUndefined()
  })
})
```

（文件顶部已有的 import 保持；若无 `useCanvasStore` import 则补上。）

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/stores/canvasStore.test.ts`
Expected: FAIL（sanitizeLoadedNodes 未导出）

- [ ] **Step 3: 实现**（canvasStore.ts）

```ts
const LOAD_STRIP_KEYS = ['_runSignal', '_isGroupRunning'] as const

export function sanitizeLoadedNodes(nodes: Node[]): Node[] {
  return nodes.map(node => {
    if (!node.data) return node
    const data: Record<string, any> = { ...(node.data as any) }
    let changed = false
    for (const key of LOAD_STRIP_KEYS) {
      if (key in data) { delete data[key]; changed = true }
    }
    return changed ? { ...node, data } : node
  })
}
```

`setCanvasData` 里 `const sorted = [...nodes]...` 改为 `const sorted = sanitizeLoadedNodes(nodes)` 后再排序：

```ts
setCanvasData: (nodes, edges) => {
  const sanitized = sanitizeLoadedNodes(nodes)
  const sorted = [...sanitized].sort((a, b) => {
    if (a.type === 'nodeGroup' && b.parentNode === a.id) return -1
    if (b.type === 'nodeGroup' && a.parentNode === b.id) return 1
    return 0
  })
  set({ nodes: sorted, edges, past: [], future: [], nodeRunStatus: {}, isGlobalRunning: false })
},
```

- [ ] **Step 4: 跑测试**

Run: `bun test src/stores/canvasStore.test.ts src/pages/canvasPageMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/stores/canvasStore.ts ui/web/src/stores/canvasStore.test.ts
git commit -m "fix(canvas): strip _runSignal/_isGroupRunning on load to prevent auto generation"
```

---

### Task 3: display 节点空数据不再卡死全局运行

**问题:** [DisplayNode.tsx:63](../../ui/web/src/components/nodes/DisplayNode.tsx) `buildDisplayPropagationPlan` 无数据返回 `status: null`，节点停在 running，DAG `hasRunning=true` 永不结束也不报死锁。

**Files:**
- Modify: `ui/web/src/components/nodes/DisplayNode.tsx`
- Test: `ui/web/src/components/nodes/displayNode.test.ts`

**Interfaces:**
- Produces: `buildDisplayPropagationPlan` 返回类型收窄为 `{ status: 'success' | 'error'; targetPatches: ... }`

- [ ] **Step 1: 写失败测试**（displayNode.test.ts 追加）

```ts
test('empty display input resolves to error instead of hanging the DAG', () => {
  const plan = buildDisplayPropagationPlan({ sourceId: 'd1', data: {}, edges: [] })
  expect(plan.status).toBe('error')
  expect(Object.keys(plan.targetPatches)).toHaveLength(0)
})
```

若文件里已有断言 `expect(plan.status).toBeNull()` 的旧用例，把它改成 `toBe('error')`。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/components/nodes/displayNode.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**（DisplayNode.tsx buildDisplayPropagationPlan）

```ts
export function buildDisplayPropagationPlan(input: {
  sourceId: string
  data: Record<string, any>
  edges: Edge[]
}) {
  const { rawData } = resolveDisplayContent(input.data)
  if (rawData === undefined || rawData === null || rawData === '') {
    return { status: 'error' as const, targetPatches: {} as Record<string, { incoming_data: any }> }
  }
  const outData = typeof rawData === 'object' ? rawData : { content: rawData }
  const targetPatches: Record<string, { incoming_data: any }> = {}
  input.edges.filter(edge => edge.source === input.sourceId).forEach(edge => {
    targetPatches[edge.target] = { incoming_data: outData }
  })
  return { status: 'success' as const, targetPatches }
}
```

`DisplayNodeImpl.propagateIfReady` 中 `if (plan.status) setNodeStatus(id, plan.status)` 保持不动（error 也会被设置）。但 `incoming_data` effect 触发的传播不应把无数据算错误（连线瞬间还没数据属正常），所以 propagateIfReady 加一个来源参数：

```ts
const propagateIfReady = React.useCallback((fromRunSignal: boolean) => {
  const plan = buildDisplayPropagationPlan({ sourceId: id, data: data || {}, edges: getEdges() })
  if (plan.status === 'error') {
    if (fromRunSignal) setNodeStatus(id, 'error')
    return
  }
  setNodeStatus(id, plan.status)
  Object.entries(plan.targetPatches).forEach(([targetId, patch]) => updateNodeData(targetId, patch))
}, [id, data, getEdges, setNodeStatus, updateNodeData])
```

两处调用分别改为 `propagateIfReady(true)`（_runSignal effect）和 `propagateIfReady(false)`（incoming_data effect）。

- [ ] **Step 4: 跑测试**

Run: `bun test src/components/nodes/displayNode.test.ts src/pages/canvasPageMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/components/nodes/DisplayNode.tsx ui/web/src/components/nodes/displayNode.test.ts
git commit -m "fix(canvas): display node reports error on empty input instead of hanging global run"
```

---

### Task 4: hexToRgba 修复 + 裂变克隆间距按节点高度计算

**Files:**
- Create: `ui/web/src/utils/color.ts`
- Create: `ui/web/src/utils/color.test.ts`
- Modify: `ui/web/src/components/nodes/BaseNode.tsx`（删本地 hexToRgba，改 import）
- Modify: `ui/web/src/stores/canvasStore.ts`（executeFission 间距）
- Test: `ui/web/src/stores/canvasStore.test.ts`

**Interfaces:**
- Produces: `hexToRgba(hex: string, alpha: number): string`（utils/color.ts）

- [ ] **Step 1: 写失败测试**

`ui/web/src/utils/color.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { hexToRgba } from './color'

describe('hexToRgba', () => {
  test('expands 3-digit hex correctly', () => {
    expect(hexToRgba('#f00', 0.5)).toBe('rgba(255,0,0,0.5)')
    expect(hexToRgba('#0af', 1)).toBe('rgba(0,170,255,1)')
  })
  test('parses 6-digit hex', () => {
    expect(hexToRgba('#0ea5e9', 0.2)).toBe('rgba(14,165,233,0.2)')
  })
  test('falls back to white for invalid input', () => {
    expect(hexToRgba('not-a-color', 0.3)).toBe('rgba(255, 255, 255, 0.3)')
  })
})
```

canvasStore.test.ts 追加：

```ts
describe('executeFission spacing', () => {
  test('clone branches are offset by at least template height + 60', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'src', type: 'generate', position: { x: 0, y: 0 }, data: {} } as any,
      { id: 'child', type: 'generate', position: { x: 400, y: 0 }, style: { width: 360, height: 380 }, data: {} } as any,
    ], [{ id: 'e1', source: 'src', target: 'child' } as any])
    useCanvasStore.getState().executeFission('src', ['a', 'b', 'c'])
    const clones = useCanvasStore.getState().nodes.filter(n => (n.data as any)?._fissionIndex)
    expect(clones).toHaveLength(2)
    expect(clones[0].position.y).toBeGreaterThanOrEqual(380 + 60)
    expect(clones[1].position.y).toBeGreaterThanOrEqual((380 + 60) * 2)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/utils/color.test.ts src/stores/canvasStore.test.ts`
Expected: color.test FAIL（模块不存在）；spacing 用例 FAIL（现为 220 间距）

- [ ] **Step 3: 实现**

`ui/web/src/utils/color.ts`:

```ts
export function hexToRgba(hex: string, alpha: number): string {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    let h = hex.substring(1)
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('')
    const num = parseInt(h, 16)
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`
  }
  return `rgba(255, 255, 255, ${alpha})`
}
```

BaseNode.tsx：删除本地 `hexToRgba`，顶部 `import { hexToRgba } from '../../utils/color'`。

canvasStore.ts `executeFission` 内，`for (const downEdge of downstreamEdges) {` 循环里在拿到 subtreeIds 后计算分支高度，替换固定 220：

```ts
const subtreeNodes = subtreeIds
  .map(subtreeId => nodes.find(node => node.id === subtreeId))
  .filter((node): node is Node => Boolean(node))
const branchHeight = Math.max(380, ...subtreeNodes.map(node => Number((node.style as any)?.height || node.height || 380)))
const branchGap = branchHeight + 60
```

克隆位置改为 `y: original.position.y + index * branchGap`。

- [ ] **Step 4: 跑测试**

Run: `bun test src/utils/color.test.ts src/stores/canvasStore.test.ts src/components/nodes/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/utils/color.ts ui/web/src/utils/color.test.ts ui/web/src/components/nodes/BaseNode.tsx ui/web/src/stores/canvasStore.ts ui/web/src/stores/canvasStore.test.ts
git commit -m "fix(canvas): correct 3-digit hex parsing and fission clone spacing by node height"
```

---

### Task 5: 单点运行也能触发裂变展开

**问题:** 裂变展开只存在于 CanvasPage 的 `isGlobalRunning` effect；手动「单点运行」得到 `_fission` 结果后静默无效果、也不传播下游。

**Files:**
- Create: `ui/web/src/pages/canvasFission.ts`
- Create: `ui/web/src/pages/canvasFission.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（effect 改调共享函数）
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`（finishGeneration 裂变分支）

**Interfaces:**
- Produces: `expandFissionAndDistribute(input: { nodeId: string; items: any[]; store: { getState(): CanvasStoreLike } }): { expanded: boolean; reason?: 'already_expanded' | 'no_downstream' }`
  - `CanvasStoreLike` 即 `useCanvasStore`（需要 nodes/edges/executeFission/updateNodeData）

- [ ] **Step 1: 写失败测试**

`ui/web/src/pages/canvasFission.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { useCanvasStore } from '../stores/canvasStore'
import { expandFissionAndDistribute } from './canvasFission'

function seedGraph() {
  useCanvasStore.getState().setCanvasData([
    { id: 'src', type: 'generate', position: { x: 0, y: 0 }, data: { result: { _fission: true, items: ['a', 'b'] } } } as any,
    { id: 'down', type: 'generate', position: { x: 400, y: 0 }, style: { width: 360, height: 380 }, data: {} } as any,
  ], [{ id: 'e1', source: 'src', target: 'down' } as any])
}

describe('expandFissionAndDistribute', () => {
  test('clones downstream branches and distributes items', () => {
    seedGraph()
    const outcome = expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(true)
    const state = useCanvasStore.getState()
    expect((state.nodes.find(n => n.id === 'down')?.data as any).incoming_data).toBe('a')
    const clone = state.nodes.find(n => (n.data as any)?._fissionSource === 'src')
    expect(clone).toBeTruthy()
    expect((clone!.data as any).incoming_data).toBe('b')
  })

  test('second expansion is a no-op', () => {
    seedGraph()
    expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    const countAfterFirst = useCanvasStore.getState().nodes.length
    const outcome = expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(false)
    expect(outcome.reason).toBe('already_expanded')
    expect(useCanvasStore.getState().nodes.length).toBe(countAfterFirst)
  })

  test('no downstream means nothing to expand', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'solo', type: 'generate', position: { x: 0, y: 0 }, data: {} } as any,
    ], [])
    const outcome = expandFissionAndDistribute({ nodeId: 'solo', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(false)
    expect(outcome.reason).toBe('no_downstream')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasFission.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`ui/web/src/pages/canvasFission.ts`:

```ts
type CanvasStoreLike = {
  getState(): {
    nodes: any[]
    edges: any[]
    executeFission: (sourceNodeId: string, items: any[]) => string[]
    updateNodeData: (id: string, data: any) => void
  }
}

export function expandFissionAndDistribute(input: { nodeId: string; items: any[]; store: CanvasStoreLike }): { expanded: boolean; reason?: 'already_expanded' | 'no_downstream' } {
  const state = input.store.getState()
  if (state.nodes.some(node => node.data?._fissionSource === input.nodeId)) {
    return { expanded: false, reason: 'already_expanded' }
  }
  const directTargets = state.edges.filter(edge => edge.source === input.nodeId).map(edge => edge.target)
  if (directTargets.length === 0) {
    return { expanded: false, reason: 'no_downstream' }
  }

  const clonedRootIds = state.executeFission(input.nodeId, input.items)
  const after = input.store.getState()
  directTargets.forEach(targetId => {
    if (!clonedRootIds.includes(targetId) || clonedRootIds[0] === targetId) {
      after.updateNodeData(targetId, { incoming_data: input.items[0] })
    }
  })
  for (let index = 1; index < clonedRootIds.length; index += 1) {
    after.updateNodeData(clonedRootIds[index], { incoming_data: input.items[index] })
  }
  return { expanded: true }
}
```

CanvasPage.tsx 裂变 effect 中原来的手写展开（`const clonedRootIds = executeFission(...)` 到两个 updateNodeData 循环）替换为：

```ts
fissionDoneRef.current.add(node.id)
const outcome = expandFissionAndDistribute({ nodeId: node.id, items: result.items, store: useCanvasStore })
if (outcome.expanded) message.info(`裂变完成，已创建 ${actualCount} 个并行分支`, 3)
return
```

（顶部 `import { expandFissionAndDistribute } from './canvasFission'`；期望条数校验逻辑保留在 effect 里不动。）

GenerateNode.tsx `finishGeneration` 的 `if (!finalResult?._fission)` 分支改为：

```ts
if (finalResult?._fission && Array.isArray(finalResult.items)) {
  const store = useCanvasStore.getState()
  if (!store.isGlobalRunning) {
    const outcome = expandFissionAndDistribute({ nodeId: id, items: finalResult.items, store: useCanvasStore })
    if (outcome.expanded) message.info(`裂变完成，已创建 ${finalResult.items.length} 个并行分支`, 3)
    else if (outcome.reason === 'no_downstream') message.warning('裂变结果已生成，但没有下游节点可展开')
  }
} else {
  getEdges().filter(e => e.source === id).forEach(edge => {
    updateNodeData(edge.target, { incoming_data: finalResult })
  })
}
```

（顶部 `import { expandFissionAndDistribute } from '../../pages/canvasFission'`。全局运行路径行为不变——展开仍由 CanvasPage effect 负责，避免双重展开。）

- [ ] **Step 4: 跑测试**

Run: `bun test src/pages/canvasFission.test.ts src/pages/canvasPageMigration.test.ts src/components/nodes/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/canvasFission.ts ui/web/src/pages/canvasFission.test.ts ui/web/src/pages/CanvasPage.tsx ui/web/src/components/nodes/GenerateNode.tsx
git commit -m "feat(canvas): manual single-node run expands fission branches too"
```

---

### Task 6: 视口钳位工具 + 节点菜单/组菜单不再溢出屏幕

**Files:**
- Create: `ui/web/src/utils/viewportClamp.ts`
- Create: `ui/web/src/utils/viewportClamp.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（openNodeSearch、onSelectionContextMenu、onNodeContextMenu 应用钳位）

**Interfaces:**
- Produces: `clampToViewport(input: { x: number; y: number; width: number; height: number; viewportWidth: number; viewportHeight: number; margin?: number }): { x: number; y: number }`

- [ ] **Step 1: 写失败测试**

`ui/web/src/utils/viewportClamp.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { clampToViewport } from './viewportClamp'

describe('clampToViewport', () => {
  test('keeps menu fully inside on right/bottom overflow', () => {
    expect(clampToViewport({ x: 1200, y: 700, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 1280 - 300 - 8, y: 720 - 380 - 8 })
  })
  test('keeps margin on left/top overflow', () => {
    expect(clampToViewport({ x: -50, y: -10, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 8, y: 8 })
  })
  test('passes through when already inside', () => {
    expect(clampToViewport({ x: 200, y: 100, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 200, y: 100 })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/utils/viewportClamp.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`ui/web/src/utils/viewportClamp.ts`:

```ts
export function clampToViewport(input: { x: number; y: number; width: number; height: number; viewportWidth: number; viewportHeight: number; margin?: number }): { x: number; y: number } {
  const margin = input.margin ?? 8
  const maxX = Math.max(margin, input.viewportWidth - input.width - margin)
  const maxY = Math.max(margin, input.viewportHeight - input.height - margin)
  return {
    x: Math.min(Math.max(input.x, margin), maxX),
    y: Math.min(Math.max(input.y, margin), maxY),
  }
}
```

CanvasPage.tsx：

```ts
import { clampToViewport } from '../utils/viewportClamp'

const NODE_MENU_SIZE = { width: 300, height: 380 }
const GROUP_MENU_SIZE = { width: 180, height: 88 }

const openNodeSearch = (x: number, y: number) => {
  if (!reactFlowInstance) return
  const pos = reactFlowInstance.screenToFlowPosition({ x, y })
  const clamped = clampToViewport({ x, y, ...NODE_MENU_SIZE, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
  setMenuConfig({ x: clamped.x, y: clamped.y, flowX: pos.x, flowY: pos.y })
  setSearchTerm('')
}
```

组菜单两处 `setGroupMenuConfig({ x: event.clientX, y: event.clientY, ... })` 改为：

```ts
const clamped = clampToViewport({ x: event.clientX, y: event.clientY, ...GROUP_MENU_SIZE, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
setGroupMenuConfig({ x: clamped.x, y: clamped.y, ... })
```

- [ ] **Step 4: 跑测试**

Run: `bun test src/utils/viewportClamp.test.ts src/pages/canvasPageMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/utils/viewportClamp.ts ui/web/src/utils/viewportClamp.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "fix(canvas): clamp node/group context menus inside the viewport"
```

---

### Task 7: 「高级操作」卡片并入顶栏（根治遮挡）

**问题:** fixed 定位的卡片盖住节点头部与 fitView 结果（浏览器实测）。

**Files:**
- Modify: `ui/web/src/pages/CanvasPage.tsx`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: 写失败测试**（canvasPageMigration.test.ts 追加）

```ts
test('advanced actions live in the header instead of a floating card', () => {
  const canvasPage = source('CanvasPage.tsx')
  expect(canvasPage).not.toContain("title=\"高级操作\"")
  expect(canvasPage).not.toContain("position: 'fixed', right: 24, top: 92")
  expect(canvasPage).toContain('全局运行')
  expect(canvasPage).toContain('漫剧生成')
})
```

同时删除原有断言 `styles={{ body: { paddingTop: 12 } }}`（那条对应被移除的 Card）——将该旧测试用例整体删除并在 commit message 里注明。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasPageMigration.test.ts`
Expected: 新用例 FAIL

- [ ] **Step 3: 实现**

删除 `<Card size="small" title="高级操作" ...>...</Card>` 整块。Header 右侧 `<Space size="middle">` 内、保存组之前插入：

```tsx
<Space.Compact>
  <Tooltip title={isGlobalRunning ? '停止全局运行' : '按 DAG 顺序运行全部节点'}>
    <Button
      icon={isGlobalRunning ? <StopOutlined /> : <PlayCircleOutlined />}
      type="primary"
      danger={isGlobalRunning}
      onClick={handleGlobalRun}
    >
      {isGlobalRunning ? '停止' : '全局运行'}
    </Button>
  </Tooltip>
  {hasBreakpoint && (
    <Tooltip title="跳过已成功节点，从断点续跑">
      <Button icon={<ThunderboltOutlined />} onClick={handleResumeRun} style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}>
        续跑
      </Button>
    </Tooltip>
  )}
  <Button onClick={() => setComicModalOpen(true)} style={{ fontWeight: 'bold', borderColor: '#f59e0b', color: '#f59e0b' }}>
    漫剧生成
  </Button>
</Space.Compact>
```

`Card` 若不再被引用，从 antd import 中移除。

- [ ] **Step 4: 跑测试 + 浏览器验证**

Run: `bun test src/pages/`
Expected: PASS。浏览器确认顶栏出现三个按钮、fitView 后节点不再被遮挡。

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/CanvasPage.tsx ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "fix(canvas): move advanced actions into header, removing canvas-blocking card"
```

---

### Task 8: 节点配置面板视口钳位

**问题:** GenerateNode / ComfyUIEngineNode 的齿轮面板 fixed 在节点正下方，节点偏高时面板被视口底部裁掉。

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`（updatePanelPos）
- Modify: `ui/web/src/components/nodes/ComfyUIEngineNode.tsx`（updatePanelPos）
- Test: `ui/web/src/pages/canvasPageMigration.test.ts`（源码断言）

**Interfaces:**
- Consumes: `clampToViewport`（Task 6）

- [ ] **Step 1: 写失败测试**（canvasPageMigration.test.ts 追加）

```ts
test('node config panels clamp to viewport', () => {
  const generateNode = source('../components/nodes/GenerateNode.tsx')
  const comfyNode = source('../components/nodes/ComfyUIEngineNode.tsx')
  for (const code of [generateNode, comfyNode]) {
    expect(code).toContain("import { clampToViewport } from '../../utils/viewportClamp'")
    expect(code).toContain('clampToViewport({')
  }
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasPageMigration.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**（两个文件的 updatePanelPos 同样改法）

```ts
const CONFIG_PANEL_SIZE = { width: 560, height: 520 }

const updatePanelPos = () => {
  if (!nodeRef.current) return
  const nodeRect = nodeRef.current.closest('.react-flow__node')?.getBoundingClientRect() || nodeRef.current.getBoundingClientRect()
  const clamped = clampToViewport({
    x: nodeRect.left,
    y: nodeRect.bottom + 8,
    ...CONFIG_PANEL_SIZE,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    margin: 12,
  })
  setPanelPos({ top: clamped.y, left: clamped.x })
}
```

面板 div 的 style 补 `maxHeight: 520`（原 `maxHeight: 'calc(100vh - 24px)'` 改为 `520`，配合钳位高度）。

- [ ] **Step 4: 跑测试**

Run: `bun test src/pages/canvasPageMigration.test.ts src/components/nodes/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/ComfyUIEngineNode.tsx ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "fix(canvas): clamp node config panels inside the viewport"
```

---

### Task 9: 复制 / 粘贴 / 克隆节点（Ctrl+C / Ctrl+V / Ctrl+D）

**Files:**
- Create: `ui/web/src/pages/canvasClipboard.ts`
- Create: `ui/web/src/pages/canvasClipboard.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（键盘监听 + 模块级剪贴板）

**Interfaces:**
- Produces: `buildCopyPayload(nodes: Node[], edges: Edge[]): ClipboardPayload | null`（选中节点+组子节点+内部边，剥离运行时字段）
- Produces: `buildPastePlan(payload: ClipboardPayload, nextId: () => string, offset?: { x: number; y: number }): { nodes: Node[]; edges: Edge[] }`
- `type ClipboardPayload = { nodes: Node[]; edges: Edge[] }`

- [ ] **Step 1: 写失败测试**

`ui/web/src/pages/canvasClipboard.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildCopyPayload, buildPastePlan } from './canvasClipboard'

const NODES = [
  { id: 'a', type: 'generate', selected: true, position: { x: 10, y: 10 }, data: { label: 'A', prompt: 'p', result: { content: 'x' }, _runSignal: 1, incoming_data: 'y' } },
  { id: 'b', type: 'display', selected: true, position: { x: 400, y: 10 }, data: { label: 'B' } },
  { id: 'c', type: 'display', selected: false, position: { x: 800, y: 10 }, data: { label: 'C' } },
  { id: 'g', type: 'nodeGroup', selected: true, position: { x: 0, y: 300 }, data: { label: 'G', _isGroupRunning: true } },
  { id: 'child', type: 'generate', selected: false, parentNode: 'g', position: { x: 20, y: 20 }, data: { label: 'child' } },
] as any[]
const EDGES = [
  { id: 'e-ab', source: 'a', target: 'b' },
  { id: 'e-bc', source: 'b', target: 'c' },
] as any[]

describe('canvas clipboard', () => {
  test('copies selected nodes, group children and internal edges only', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    const ids = payload.nodes.map(n => n.id).sort()
    expect(ids).toEqual(['a', 'b', 'child', 'g'])
    expect(payload.edges.map(e => e.id)).toEqual(['e-ab'])
  })

  test('copy strips runtime fields', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    const a = payload.nodes.find(n => n.id === 'a')!
    expect((a.data as any).result).toBeUndefined()
    expect((a.data as any)._runSignal).toBeUndefined()
    expect((a.data as any).incoming_data).toBeUndefined()
    expect((a.data as any).prompt).toBe('p')
    const g = payload.nodes.find(n => n.id === 'g')!
    expect((g.data as any)._isGroupRunning).toBeUndefined()
  })

  test('returns null when nothing selected', () => {
    expect(buildCopyPayload(NODES.map(n => ({ ...n, selected: false })), EDGES)).toBeNull()
  })

  test('paste remaps ids, parentNode and offsets positions', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    let counter = 0
    const plan = buildPastePlan(payload, () => `new_${counter++}`, { x: 40, y: 40 })
    expect(plan.nodes).toHaveLength(4)
    expect(plan.nodes.every(n => n.id.startsWith('new_'))).toBe(true)
    const child = plan.nodes.find(n => (n.data as any).label === 'child')!
    const group = plan.nodes.find(n => (n.data as any).label === 'G')!
    expect(child.parentNode).toBe(group.id)
    // 子节点相对父级坐标不偏移，顶层节点偏移 40
    expect(child.position).toEqual({ x: 20, y: 20 })
    const a = plan.nodes.find(n => (n.data as any).label === 'A')!
    expect(a.position).toEqual({ x: 50, y: 50 })
    expect(a.selected).toBe(true)
    const edge = plan.edges[0]
    const b = plan.nodes.find(n => (n.data as any).label === 'B')!
    expect(edge.source).toBe(a.id)
    expect(edge.target).toBe(b.id)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasClipboard.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`ui/web/src/pages/canvasClipboard.ts`:

```ts
import type { Edge, Node } from 'reactflow'

export type ClipboardPayload = { nodes: Node[]; edges: Edge[] }

const RUNTIME_KEYS = ['result', 'incoming_data', '_runSignal', '_fissionIndex', '_fissionSource', '_isGroupRunning']

function stripRuntime(data: any) {
  const next = { ...(data || {}) }
  for (const key of RUNTIME_KEYS) delete next[key]
  return next
}

export function buildCopyPayload(nodes: Node[], edges: Edge[]): ClipboardPayload | null {
  const selectedIds = new Set(nodes.filter(node => node.selected).map(node => node.id))
  if (selectedIds.size === 0) return null
  nodes.forEach(node => {
    if (node.parentNode && selectedIds.has(node.parentNode)) selectedIds.add(node.id)
  })
  const copiedNodes = nodes
    .filter(node => selectedIds.has(node.id))
    .map(node => ({ ...node, selected: false, data: stripRuntime(node.data) }))
  const copiedEdges = edges
    .filter(edge => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .map(edge => ({ ...edge }))
  return { nodes: copiedNodes, edges: copiedEdges }
}

export function buildPastePlan(payload: ClipboardPayload, nextId: () => string, offset: { x: number; y: number } = { x: 40, y: 40 }): { nodes: Node[]; edges: Edge[] } {
  const idMap: Record<string, string> = {}
  payload.nodes.forEach(node => { idMap[node.id] = nextId() })
  const nodes = payload.nodes.map(node => {
    const remappedParent = node.parentNode ? idMap[node.parentNode] : undefined
    return {
      ...node,
      id: idMap[node.id],
      selected: true,
      ...(remappedParent ? { parentNode: remappedParent } : {}),
      position: remappedParent
        ? { ...node.position }
        : { x: node.position.x + offset.x, y: node.position.y + offset.y },
      data: { ...(node.data as any) },
    }
  })
  const edges = payload.edges.map(edge => ({
    ...edge,
    id: nextId(),
    source: idMap[edge.source],
    target: idMap[edge.target],
  }))
  return { nodes, edges }
}
```

CanvasPage.tsx 键盘接线（新增 useEffect，放在 Ctrl+B effect 附近）：

```tsx
import { buildCopyPayload, buildPastePlan, type ClipboardPayload } from './canvasClipboard'

const clipboardRef = React.useRef<ClipboardPayload | null>(null)

useEffect(() => {
  const isEditableTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(el.closest('input, textarea, [contenteditable="true"], [data-config-panel]'))
  }
  const pasteFromClipboard = () => {
    if (!clipboardRef.current) return
    const plan = buildPastePlan(clipboardRef.current, getId)
    saveHistory()
    const store = useCanvasStore.getState()
    store.setNodes([...store.nodes.map(n => ({ ...n, selected: false })), ...plan.nodes])
    store.setEdges([...store.edges, ...plan.edges])
    message.success(`已粘贴 ${plan.nodes.length} 个节点`)
  }
  const handler = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || isEditableTarget(e.target)) return
    const key = e.key.toLowerCase()
    if (key === 'c') {
      const payload = buildCopyPayload(useCanvasStore.getState().nodes, useCanvasStore.getState().edges)
      if (!payload) return
      clipboardRef.current = payload
      message.success(`已复制 ${payload.nodes.length} 个节点`)
    } else if (key === 'v') {
      e.preventDefault()
      pasteFromClipboard()
    } else if (key === 'd') {
      const payload = buildCopyPayload(useCanvasStore.getState().nodes, useCanvasStore.getState().edges)
      if (!payload) return
      e.preventDefault()
      clipboardRef.current = payload
      pasteFromClipboard()
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [saveHistory])
```

- [ ] **Step 4: 跑测试**

Run: `bun test src/pages/canvasClipboard.test.ts src/pages/canvasPageMigration.test.ts`
Expected: PASS

- [ ] **Step 5: 浏览器验证**

选中节点 Ctrl+C → Ctrl+V：出现偏移副本且成为新选区；文本框聚焦时 Ctrl+C 不受劫持。

- [ ] **Step 6: Commit**

```bash
git add ui/web/src/pages/canvasClipboard.ts ui/web/src/pages/canvasClipboard.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "feat(canvas): copy/paste/duplicate nodes with Ctrl+C/V/D"
```

---

### Task 10: 一键自动布局（dagre）

**Files:**
- Modify: `ui/web/package.json`（新增 @dagrejs/dagre）
- Create: `ui/web/src/pages/canvasLayout.ts`
- Create: `ui/web/src/pages/canvasLayout.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（顶栏「整理布局」按钮）

**Interfaces:**
- Produces: `layoutCanvas(nodes: Node[], edges: Edge[]): Node[]`（返回带新 position 的完整数组；组内子节点位置不变）

- [ ] **Step 1: 安装依赖**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun add @dagrejs/dagre`
Expected: package.json dependencies 出现 `@dagrejs/dagre`

- [ ] **Step 2: 写失败测试**

`ui/web/src/pages/canvasLayout.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { layoutCanvas } from './canvasLayout'

const chain = (positions: Array<[number, number]>) => positions.map(([x, y], i) => ({
  id: `n${i}`, type: 'generate', position: { x, y }, style: { width: 360, height: 380 }, data: {},
})) as any[]

describe('layoutCanvas', () => {
  test('left-to-right chain gets monotonically increasing x', () => {
    const nodes = chain([[500, 500], [0, 0], [250, 900]])
    const edges = [
      { id: 'e1', source: 'n1', target: 'n0' },
      { id: 'e2', source: 'n0', target: 'n2' },
    ] as any[]
    const laid = layoutCanvas(nodes, edges)
    const x = (id: string) => laid.find(n => n.id === id)!.position.x
    expect(x('n1')).toBeLessThan(x('n0'))
    expect(x('n0')).toBeLessThan(x('n2'))
    laid.forEach(n => {
      expect(Number.isFinite(n.position.x)).toBe(true)
      expect(Number.isFinite(n.position.y)).toBe(true)
    })
  })

  test('group children keep their relative positions', () => {
    const nodes = [
      { id: 'g', type: 'nodeGroup', position: { x: 0, y: 0 }, style: { width: 500, height: 400 }, data: {} },
      { id: 'c1', type: 'generate', parentNode: 'g', position: { x: 30, y: 60 }, data: {} },
      { id: 'top', type: 'display', position: { x: 900, y: 0 }, style: { width: 300, height: 300 }, data: {} },
    ] as any[]
    const edges = [{ id: 'e', source: 'g', target: 'top' }] as any[]
    const laid = layoutCanvas(nodes, edges)
    expect(laid.find(n => n.id === 'c1')!.position).toEqual({ x: 30, y: 60 })
  })

  test('edges into group children rank the group itself', () => {
    const nodes = [
      { id: 'a', type: 'generate', position: { x: 0, y: 0 }, style: { width: 360, height: 380 }, data: {} },
      { id: 'g', type: 'nodeGroup', position: { x: 0, y: 0 }, style: { width: 500, height: 400 }, data: {} },
      { id: 'c1', type: 'generate', parentNode: 'g', position: { x: 30, y: 60 }, data: {} },
    ] as any[]
    const edges = [{ id: 'e', source: 'a', target: 'c1' }] as any[]
    const laid = layoutCanvas(nodes, edges)
    const x = (id: string) => laid.find(n => n.id === id)!.position.x
    expect(x('a')).toBeLessThan(x('g'))
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `bun test src/pages/canvasLayout.test.ts`
Expected: FAIL

- [ ] **Step 4: 实现**

`ui/web/src/pages/canvasLayout.ts`:

```ts
import dagre from '@dagrejs/dagre'
import type { Edge, Node } from 'reactflow'

function nodeSize(node: Node) {
  return {
    width: Number((node.style as any)?.width || node.width || 360),
    height: Number((node.style as any)?.height || node.height || 380),
  }
}

export function layoutCanvas(nodes: Node[], edges: Edge[]): Node[] {
  const topLevel = nodes.filter(node => !node.parentNode)
  if (topLevel.length === 0) return nodes

  const parentOf: Record<string, string> = {}
  nodes.forEach(node => { if (node.parentNode) parentOf[node.id] = node.parentNode })
  const toTopLevel = (id: string) => parentOf[id] || id

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 })

  topLevel.forEach(node => {
    const { width, height } = nodeSize(node)
    graph.setNode(node.id, { width, height })
  })
  edges.forEach(edge => {
    const source = toTopLevel(edge.source)
    const target = toTopLevel(edge.target)
    if (source === target) return
    if (!graph.hasNode(source) || !graph.hasNode(target)) return
    graph.setEdge(source, target)
  })

  dagre.layout(graph)

  return nodes.map(node => {
    if (node.parentNode) return node
    const laid = graph.node(node.id)
    if (!laid) return node
    const { width, height } = nodeSize(node)
    return { ...node, position: { x: laid.x - width / 2, y: laid.y - height / 2 } }
  })
}
```

CanvasPage.tsx 顶栏（Task 7 的 Space.Compact 前）加按钮：

```tsx
import { PartitionOutlined } from '@ant-design/icons'
import { layoutCanvas } from './canvasLayout'

<Tooltip title="按连线方向自动整理布局">
  <Button icon={<PartitionOutlined />} onClick={() => {
    saveHistory()
    const store = useCanvasStore.getState()
    store.setNodes(layoutCanvas(store.nodes, store.edges))
    window.requestAnimationFrame(() => reactFlowInstance?.fitView({ padding: 0.15, duration: 300 }))
  }}>整理布局</Button>
</Tooltip>
```

- [ ] **Step 5: 跑测试**

Run: `bun test src/pages/canvasLayout.test.ts src/pages/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add ui/web/package.json ui/web/bun.lock ui/web/src/pages/canvasLayout.ts ui/web/src/pages/canvasLayout.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "feat(canvas): one-click dagre auto layout"
```

---

### Task 11: 节点菜单键盘导航（↑↓ / Enter / Esc）

**Files:**
- Create: `ui/web/src/utils/menuNavigation.ts`
- Create: `ui/web/src/utils/menuNavigation.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`

**Interfaces:**
- Produces: `moveMenuHighlight(current: number, delta: number, total: number): number`

- [ ] **Step 1: 写失败测试**

`ui/web/src/utils/menuNavigation.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { moveMenuHighlight } from './menuNavigation'

describe('moveMenuHighlight', () => {
  test('wraps around both directions', () => {
    expect(moveMenuHighlight(0, 1, 4)).toBe(1)
    expect(moveMenuHighlight(3, 1, 4)).toBe(0)
    expect(moveMenuHighlight(0, -1, 4)).toBe(3)
  })
  test('empty list stays at 0', () => {
    expect(moveMenuHighlight(2, 1, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/utils/menuNavigation.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`ui/web/src/utils/menuNavigation.ts`:

```ts
export function moveMenuHighlight(current: number, delta: number, total: number): number {
  if (total <= 0) return 0
  return ((current + delta) % total + total) % total
}
```

CanvasPage.tsx：

```tsx
import { moveMenuHighlight } from '../utils/menuNavigation'

const [menuHighlight, setMenuHighlight] = useState(0)
const flatMenuNodes = useMemo(
  () => (['ai', 'resource', 'display', 'structure'] as NodeCategory[]).flatMap(category => groupedNodes[category]),
  [groupedNodes]
)
useEffect(() => { setMenuHighlight(0) }, [searchTerm, menuConfig?.x, menuConfig?.y])
```

菜单里的搜索 `<Input ...>` 加 onKeyDown：

```tsx
onKeyDown={e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setMenuHighlight(h => moveMenuHighlight(h, 1, flatMenuNodes.length)) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setMenuHighlight(h => moveMenuHighlight(h, -1, flatMenuNodes.length)) }
  else if (e.key === 'Enter') { e.preventDefault(); const target = flatMenuNodes[menuHighlight]; if (target) createNodeAtMenu(target) }
  else if (e.key === 'Escape') { closeNodeSearch() }
}}
```

列表项渲染处用全局序号高亮（`list.map(node => ...)` 前，为每个 node 计算 `const flatIndex = flatMenuNodes.indexOf(node)`）：

```tsx
<div key={node.type} onClick={() => createNodeAtMenu(node)} onMouseEnter={() => setMenuHighlight(flatIndex)}
  style={{ padding: '10px 12px', cursor: 'pointer', borderRadius: 10, display: 'flex', flexDirection: 'column', background: flatIndex === menuHighlight ? '#eef2ff' : 'transparent' }}>
```

- [ ] **Step 4: 跑测试**

Run: `bun test src/utils/menuNavigation.test.ts src/pages/canvasPageMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/utils/menuNavigation.ts ui/web/src/utils/menuNavigation.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "feat(canvas): keyboard navigation for the node search menu"
```

---

### Task 12: 拖线到空白处快捷建节点并自动连线

**Files:**
- Create: `ui/web/src/utils/autoConnect.ts`
- Create: `ui/web/src/utils/autoConnect.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（onConnectStart/onConnectEnd + createNodeAtMenu 自动连线）

**Interfaces:**
- Produces: `resolveAutoConnectHandle(sourceDataType: string, targetNodeType: string): string | null`

- [ ] **Step 1: 写失败测试**

`ui/web/src/utils/autoConnect.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { resolveAutoConnectHandle } from './autoConnect'

describe('resolveAutoConnectHandle', () => {
  test('display accepts anything on in', () => {
    expect(resolveAutoConnectHandle('text', 'display')).toBe('in')
    expect(resolveAutoConnectHandle('image', 'display')).toBe('in')
  })
  test('generate maps image to image port, others to text', () => {
    expect(resolveAutoConnectHandle('image', 'generate')).toBe('image')
    expect(resolveAutoConnectHandle('text', 'generate')).toBe('text')
    expect(resolveAutoConnectHandle('any', 'generate')).toBe('text')
  })
  test('comfy engine only accepts workflow', () => {
    expect(resolveAutoConnectHandle('workflow', 'comfyUIEngine')).toBe('in')
    expect(resolveAutoConnectHandle('text', 'comfyUIEngine')).toBeNull()
  })
  test('loadAsset has no inputs', () => {
    expect(resolveAutoConnectHandle('text', 'loadAsset')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/utils/autoConnect.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`ui/web/src/utils/autoConnect.ts`:

```ts
export function resolveAutoConnectHandle(sourceDataType: string, targetNodeType: string): string | null {
  if (targetNodeType === 'display') return 'in'
  if (targetNodeType === 'generate') return sourceDataType === 'image' ? 'image' : 'text'
  if (targetNodeType === 'comfyUIEngine') return sourceDataType === 'workflow' ? 'in' : null
  return null
}
```

CanvasPage.tsx：

```tsx
import { resolveAutoConnectHandle } from '../utils/autoConnect'
import { getHandleDataType } from '../utils/handleTypes'   // 已有 import，确认包含 getHandleDataType

const [pendingConnection, setPendingConnection] = useState<{ source: string; sourceHandle: string | null } | null>(null)
const connectStartRef = React.useRef<{ nodeId: string | null; handleId: string | null; handleType: string | null } | null>(null)

const onConnectStart = useCallback((_: any, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
  connectStartRef.current = params
}, [])

const onConnectEnd = useCallback((event: any) => {
  const start = connectStartRef.current
  connectStartRef.current = null
  if (!start?.nodeId || start.handleType !== 'source') return
  const target = event.target as HTMLElement
  if (!target?.classList?.contains('react-flow__pane')) return
  const point = 'changedTouches' in event ? event.changedTouches[0] : event
  setPendingConnection({ source: start.nodeId, sourceHandle: start.handleId })
  openNodeSearch(point.clientX, point.clientY)
}, [openNodeSearch])
```

`createNodeAtMenu` 改为创建后尝试自动连线：

```tsx
const createNodeAtMenu = (node: typeof AVAILABLE_NODES[number]) => {
  if (!menuConfig) return
  const newNodeId = getId()
  addNode({ id: newNodeId, type: node.type, position: { x: menuConfig.flowX, y: menuConfig.flowY }, data: { label: node.label } } as any)
  if (pendingConnection) {
    const store = useCanvasStore.getState()
    const sourceNode = store.nodes.find(n => n.id === pendingConnection.source)
    const sourceType = getHandleDataType(sourceNode?.type, pendingConnection.sourceHandle ?? undefined, sourceNode?.data, 'source')
    const targetHandle = resolveAutoConnectHandle(sourceType, node.type)
    if (targetHandle) {
      store.setEdges([...store.edges, {
        id: `edge_auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        source: pendingConnection.source,
        sourceHandle: pendingConnection.sourceHandle ?? undefined,
        target: newNodeId,
        targetHandle,
      } as any])
    } else {
      message.info('新节点没有匹配的输入端口，未自动连线')
    }
    setPendingConnection(null)
  }
  setMenuConfig(null)
  setSearchTerm('')
}
```

`closeNodeSearch` 里补 `setPendingConnection(null)`。`<ReactFlow>` 加 `onConnectStart={onConnectStart} onConnectEnd={onConnectEnd}`。

- [ ] **Step 4: 跑测试**

Run: `bun test src/utils/autoConnect.test.ts src/pages/`
Expected: PASS

- [ ] **Step 5: 浏览器验证**

从 AI 大脑 out 拖到空白松手 → 菜单弹出 → 选「结果展示节点」→ 新节点自动接上。

- [ ] **Step 6: Commit**

```bash
git add ui/web/src/utils/autoConnect.ts ui/web/src/utils/autoConnect.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "feat(canvas): drop connection on empty pane to create and auto-wire a node"
```

---

### Task 13: 边类型着色 + 运行动画 + MiniMap 节点着色

**Files:**
- Create: `ui/web/src/pages/canvasEdgeStyle.ts`
- Create: `ui/web/src/pages/canvasEdgeStyle.test.ts`
- Modify: `ui/web/src/pages/CanvasPage.tsx`（decorated edges + MiniMap nodeColor）

**Interfaces:**
- Produces: `decorateEdges(input: { edges: Edge[]; nodes: Node[]; nodeRunStatus: Record<string, string | undefined> }): Edge[]`
- Produces: `MINIMAP_NODE_COLORS: Record<string, string>` 与 `minimapNodeColor(node: Node): string`

- [ ] **Step 1: 写失败测试**

`ui/web/src/pages/canvasEdgeStyle.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { decorateEdges, minimapNodeColor } from './canvasEdgeStyle'

const NODES = [
  { id: 'g', type: 'generate', position: { x: 0, y: 0 }, data: { mode: 'chat' } },
  { id: 'img', type: 'generate', position: { x: 0, y: 0 }, data: { mode: 'text_to_image' } },
  { id: 'd', type: 'display', position: { x: 0, y: 0 }, data: {} },
] as any[]

describe('decorateEdges', () => {
  test('colors edges by source handle data type', () => {
    const edges = decorateEdges({
      edges: [
        { id: 'e1', source: 'g', sourceHandle: 'out', target: 'd' },
        { id: 'e2', source: 'img', sourceHandle: 'out', target: 'd' },
      ] as any[],
      nodes: NODES,
      nodeRunStatus: {},
    })
    expect((edges[0].style as any).stroke).toBe('#52c41a')
    expect((edges[1].style as any).stroke).toBe('#1890ff')
  })

  test('animates edges out of running sources', () => {
    const edges = decorateEdges({
      edges: [{ id: 'e1', source: 'g', sourceHandle: 'out', target: 'd' }] as any[],
      nodes: NODES,
      nodeRunStatus: { g: 'running' },
    })
    expect(edges[0].animated).toBe(true)
  })

  test('minimap color prefers customColor then type color', () => {
    expect(minimapNodeColor({ type: 'generate', data: {} } as any)).toBe('#0ea5e9')
    expect(minimapNodeColor({ type: 'generate', data: { customColor: '#123456' } } as any)).toBe('#123456')
    expect(minimapNodeColor({ type: 'unknown', data: {} } as any)).toBe('#94a3b8')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasEdgeStyle.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`ui/web/src/pages/canvasEdgeStyle.ts`:

```ts
import type { Edge, Node } from 'reactflow'
import { getHandleDataType, getTypeColor } from '../utils/handleTypes'

export const MINIMAP_NODE_COLORS: Record<string, string> = {
  generate: '#0ea5e9',
  loadAsset: '#f59e0b',
  display: '#fa8c16',
  comfyUIEngine: '#8b5cf6',
  nodeGroup: '#a78bfa',
}

export function minimapNodeColor(node: Node): string {
  return (node.data as any)?.customColor || MINIMAP_NODE_COLORS[node.type || ''] || '#94a3b8'
}

export function decorateEdges(input: { edges: Edge[]; nodes: Node[]; nodeRunStatus: Record<string, string | undefined> }): Edge[] {
  const nodeById = new Map(input.nodes.map(node => [node.id, node]))
  return input.edges.map(edge => {
    const sourceNode = nodeById.get(edge.source)
    const dataType = getHandleDataType(sourceNode?.type, edge.sourceHandle ?? undefined, sourceNode?.data, 'source')
    const stroke = getTypeColor(dataType)
    const sourceStatus = input.nodeRunStatus[edge.source]
    const targetStatus = input.nodeRunStatus[edge.target]
    const animated = sourceStatus === 'running' || (sourceStatus === 'success' && targetStatus === 'running')
    return { ...edge, animated, style: { ...(edge.style || {}), stroke, strokeWidth: 2 } }
  })
}
```

CanvasPage.tsx：

```tsx
import { decorateEdges, minimapNodeColor } from './canvasEdgeStyle'

const decoratedEdges = useMemo(
  () => decorateEdges({ edges, nodes, nodeRunStatus }),
  [edges, nodes, nodeRunStatus]
)
```

`<ReactFlow edges={edges}` 改为 `edges={decoratedEdges}`（onEdgesChange 等仍操作原始 store edges，装饰只在渲染层）。

`<MiniMap ...>` 加 `nodeColor={minimapNodeColor} nodeStrokeColor={minimapNodeColor}`。

- [ ] **Step 4: 跑测试**

Run: `bun test src/pages/canvasEdgeStyle.test.ts src/pages/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/canvasEdgeStyle.ts ui/web/src/pages/canvasEdgeStyle.test.ts ui/web/src/pages/CanvasPage.tsx
git commit -m "feat(canvas): type-colored edges, run animation, minimap node colors"
```

---

### Task 14: 拖拽边端点重连（onEdgeUpdate）

**Files:**
- Modify: `ui/web/src/pages/CanvasPage.tsx`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts`

- [ ] **Step 1: 写失败测试**（canvasPageMigration.test.ts 追加）

```ts
test('edges can be reconnected by dragging their endpoints', () => {
  const canvasPage = source('CanvasPage.tsx')
  expect(canvasPage).toContain('updateEdge')
  expect(canvasPage).toContain('onEdgeUpdate={onEdgeUpdate}')
  expect(canvasPage).toContain('edgeUpdaterRadius={12}')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/pages/canvasPageMigration.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**（CanvasPage.tsx）

```tsx
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, updateEdge, type ReactFlowInstance, type Connection, type Edge } from 'reactflow'

const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
  if (!isValidConnection(newConnection)) return
  saveHistory()
  const store = useCanvasStore.getState()
  store.setEdges(updateEdge(oldEdge, newConnection, store.edges))
}, [isValidConnection, saveHistory])
```

`<ReactFlow>` 加 `onEdgeUpdate={onEdgeUpdate} edgeUpdaterRadius={12}`。

- [ ] **Step 4: 跑测试 + 浏览器验证**

Run: `bun test src/pages/`
Expected: PASS。浏览器拖动一条边的端点到另一个合法 handle 上能改接、拖到非法类型端口被拒。

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/CanvasPage.tsx ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "feat(canvas): reconnect edges by dragging endpoints"
```

---

### Task 15: 收尾包——Ctrl+B 集中化、数据卫生、updateNodeData 短路

**Files:**
- Modify: `ui/web/src/pages/CanvasPage.tsx`（Ctrl+B 统一处理组与普通节点）
- Modify: `ui/web/src/components/nodes/GroupNode.tsx`（移除自身 Ctrl+B 监听；死代码清理）
- Modify: `ui/web/src/components/nodes/BaseNode.tsx`（存资产剥离 UI 态字段 + assetName fallback）
- Modify: `ui/web/src/utils/handleTypes.ts`（inferParamType video 用 includes）
- Modify: `ui/web/src/components/nodes/LoadAssetNode.tsx`（拖入资产 saveHistory）
- Modify: `ui/web/src/stores/canvasStore.ts`（updateNodeData 值不变短路）
- Test: `ui/web/src/stores/canvasStore.test.ts`、`ui/web/src/components/nodes/loadAssetNode.test.ts`、迁移测试

- [ ] **Step 1: 写失败测试**

canvasStore.test.ts 追加：

```ts
describe('updateNodeData no-op short circuit', () => {
  test('same values leave nodes array untouched', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'n1', type: 'generate', position: { x: 0, y: 0 }, data: { label: 'A', prompt: 'p' } } as any,
    ], [])
    const before = useCanvasStore.getState().nodes
    useCanvasStore.getState().updateNodeData('n1', { label: 'A', prompt: 'p' })
    expect(useCanvasStore.getState().nodes).toBe(before)
    useCanvasStore.getState().updateNodeData('n1', { prompt: 'changed' })
    expect(useCanvasStore.getState().nodes).not.toBe(before)
  })
})
```

handleTypes 相关（新建 `ui/web/src/utils/handleTypes.test.ts`）：

```ts
import { describe, expect, test } from 'bun:test'
import { inferParamType } from './handleTypes'

describe('inferParamType', () => {
  test('video keywords match by inclusion like other types', () => {
    expect(inferParamType('video_input')).toBe('video')
    expect(inferParamType('main_clip')).toBe('video')
    expect(inferParamType('ref_img')).toBe('image')
    expect(inferParamType('positive_prompt')).toBe('text')
  })
})
```

迁移测试追加：

```ts
test('group Ctrl+B handling is centralized in CanvasPage', () => {
  const canvasPage = source('CanvasPage.tsx')
  const groupNode = source('../components/nodes/GroupNode.tsx')
  expect(canvasPage).toContain('buildGroupMutePatches')
  expect(groupNode).not.toContain("event.key.toLowerCase() === 'b'")
})

test('save-as-asset strips UI state fields', () => {
  const baseNode = source('../components/nodes/BaseNode.tsx')
  expect(baseNode).toContain('_prevWidth')
  expect(baseNode).toContain('_collapsed')
  expect(baseNode).not.toContain('data?.label || data?._customLabel')
})
```

loadAssetNode.test.ts 追加：

```ts
test('asset drop saves history for undo', () => {
  const code = readFileSync(join(import.meta.dir, 'LoadAssetNode.tsx'), 'utf8')
  expect(code).toContain('saveHistory()')
})
```

（该测试文件如无 readFileSync import 则补上，与项目其他源码断言测试一致。）

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/stores/canvasStore.test.ts src/utils/handleTypes.test.ts src/pages/canvasPageMigration.test.ts src/components/nodes/loadAssetNode.test.ts`
Expected: 新用例全部 FAIL

- [ ] **Step 3: 实现**

canvasStore.ts updateNodeData：

```ts
updateNodeData: (id, data) => set(state => {
  const target = state.nodes.find(node => node.id === id)
  if (target) {
    const current = (target.data || {}) as Record<string, any>
    const unchanged = Object.keys(data || {}).every(key => Object.is(current[key], (data as any)[key]))
    if (unchanged) return state
  }
  return { nodes: state.nodes.map(node => node.id === id ? { ...node, data: { ...(node.data as any), ...data } } : node) }
}),
```

handleTypes.ts：

```ts
if (VIDEO_KEYWORDS.some(k => lower.includes(k))) return 'video'
```

CanvasPage.tsx Ctrl+B handler 改为（整体替换原 effect 内 handler 主体）：

```tsx
import { buildGroupMutePatches } from '../components/nodes/GroupNode'

const handler = (e: KeyboardEvent) => {
  if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b')) return
  e.preventDefault()
  const allNodes = useCanvasStore.getState().nodes
  const selectedGroups = allNodes.filter(node => node.selected && node.type === 'nodeGroup')
  const selected = allNodes.filter(node => node.selected && node.type !== 'nodeGroup')
  selectedGroups.forEach(group => {
    Object.entries(buildGroupMutePatches(allNodes, group.id)).forEach(([nodeId, patch]) => updateNodeData(nodeId, patch))
  })
  if (selected.length === 0) return
  if (selected.length === 1) {
    updateNodeData(selected[0].id, { _muted: !selected[0].data?._muted })
    return
  }
  const ids = selected.filter(node => !node.parentNode).map(node => node.id)
  if (ids.length >= 2) {
    const groupId = createGroup(ids, '节点组')
    if (groupId) {
      updateNodeData(groupId, { _muted: true })
      ids.forEach(nodeId => updateNodeData(nodeId, { _muted: true }))
    }
  }
}
```

GroupNode.tsx：删除 `React.useEffect(() => { if (!selected) return ... window.addEventListener('keydown', handler) ... }, [selected, handleToggleMute])` 整个 effect；`buildGroupRunTickPlan` 里 ready 判断死代码合并：

```ts
const ready = incomingEdges.every(edge => {
  const dependencyStatus = input.nodeRunStatus[edge.source] || 'idle'
  if (dependencyStatus === 'running') waitingOnRunningDependency = true
  return dependencyStatus === 'success'
})
```

（`childSet` 若不再使用则一并删除。）

BaseNode.tsx handleSaveAsAsset：

```ts
const { result, incoming_data, _runSignal, _fissionIndex, _fissionSource, _prevWidth, _prevHeight, _collapsed, _muted, _isGroupRunning, ...config } = data || {}
const assetName = data?.label || `节点配置_${node.type}`
```

LoadAssetNode.tsx：`handleAssetDrop` 开头调用 `useCanvasStore.getState().saveHistory()`（组件已 import useCanvasStore）。

- [ ] **Step 4: 跑全量画布测试**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/ src/stores/ src/components/nodes/ src/utils/`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/CanvasPage.tsx ui/web/src/components/nodes/GroupNode.tsx ui/web/src/components/nodes/BaseNode.tsx ui/web/src/components/nodes/LoadAssetNode.tsx ui/web/src/utils/handleTypes.ts ui/web/src/utils/handleTypes.test.ts ui/web/src/stores/canvasStore.ts ui/web/src/stores/canvasStore.test.ts ui/web/src/components/nodes/loadAssetNode.test.ts ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "fix(canvas): centralize Ctrl+B, sanitize asset saves, no-op updateNodeData short circuit"
```

---

### Task 16: 端到端浏览器回归 + 构建验证

**Files:** 无新增（验证任务）

- [ ] **Step 1: 全量测试**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test`
Expected: 0 fail（全仓 web 测试）

- [ ] **Step 2: 生产构建**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun run build`
Expected: 构建成功无 TS 错误

- [ ] **Step 3: 浏览器回归清单**（5173 画布页逐项操作）

1. 双击建 AI 大脑 → 拖线到空白 → 菜单键盘 ↓+Enter 选结果展示 → 自动连线成功
2. 折叠 AI 大脑 → 边保持、锚点收拢标题栏 → 展开恢复
3. Ctrl+C/V 复制粘贴、Ctrl+D 克隆
4. 「整理布局」按钮 → 节点按连线方向排列 → fitView 无遮挡（高级操作已在顶栏）
5. 边显示类型颜色；MiniMap 显示节点颜色
6. 拖边端点改接到另一个合法端口
7. 屏幕边缘双击 → 菜单不溢出
8. console 无 React Flow error #008 / 其他新增报错

- [ ] **Step 4: 最终提交（如回归过程有微调）**

```bash
git add -A ui/web
git commit -m "test(canvas): browser regression pass for canvas upgrade"
```

---

## Self-Review 结论

- **Spec 覆盖:** 体检报告 9 个主 bug → Task 1(折叠)、2(自动触发)、3(display 卡死)、4(hexToRgba+裂变间距)、5(单点裂变)、6(菜单溢出)、7(遮挡)、8(面板裁剪)；次要项 → Task 15；通用画布能力（复制粘贴/自动布局/键盘导航/拖线建节点/边着色动画/MiniMap/边重连）→ Task 9-14。深色模式与"边中插入节点"明确列为本期不做（YAGNI，后续可加）。
- **占位符扫描:** 每个代码步骤均给出完整可落地代码；无 TBD/“类似 Task N”。
- **类型一致性:** `clampToViewport`（Task 6 定义，Task 8 消费）、`expandFissionAndDistribute`（Task 5 定义，两处消费）、`TypedHandle` props（Task 1 定义）在各任务间签名一致。
