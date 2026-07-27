import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('ComfyForge canvas feature migration', () => {
  test('one-click comic entry creates a real fission storyboard pipeline', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('createComicPipeline')
    expect(canvasPage).toContain('分镜大师')
    expect(canvasPage).toContain('分镜绘图')
    expect(canvasPage).toContain('分镜预览')
    expect(canvasPage).toContain('_fissionEnabled')
    expect(canvasPage).toContain('_fissionExpectedCount')
    expect(canvasPage).toContain('store.setNodes([...store.nodes, storyboardNode')
    expect(canvasPage).toContain('store.setEdges([...store.edges, edge1, edge2])')
    expect(canvasPage).not.toContain('该入口已保留，后续可继续接回原版漫剧流水线逻辑')
  })

  test('global stop interrupts running backend node tasks', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('Promise.allSettled(')
    expect(canvasPage).toContain('apiClient.post(`/interrupt/${nodeId}`)')
    expect(canvasPage).toContain('runningNodeIds.map(nodeId => apiClient.post(`/interrupt/${nodeId}`))')
  })

  test('breakpoint resume preserves successful nodes and restores downstream input', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('const hasSuccessNode = nodes.some(n => nodeRunStatus[n.id] ===')
    expect(canvasPage).toContain('resetAllNodeStatus(nodes)')
    expect(canvasPage).toContain('smartResetNodeStatus(nodes)')
    expect(canvasPage).toContain('const outData = node.data.result || node.data.asset?.data || node.data.incoming_data')
    expect(canvasPage).toContain('updateNodeData(edge.target, { incoming_data: outData })')
  })

  test('canvas page restores project name and saved graph from TS project envelopes', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('const project = res.data?.project || res.data')
    expect(canvasPage).toContain("setProjectName(project?.name || '未命名项目')")
    expect(canvasPage).toContain('const savedData = project?.canvas_data')
    expect(canvasPage).toContain('setCanvasData(savedData.nodes || [], savedData.edges || [])')
  })

  test('canvas page uses a stable global title and avoids NaN project ids without route id', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain("const routeProjectId = id ? Number(id) : undefined")
    expect(canvasPage).toContain("const canvasProjectId = Number.isFinite(routeProjectId) ? routeProjectId : undefined")
    expect(canvasPage).toContain("const [projectName, setProjectName] = useState(id ? '加载中...' : '全局画布')")
    expect(canvasPage).toContain("setProjectName('全局画布')")
    expect(canvasPage).toContain('projectId={canvasProjectId}')
    expect(canvasPage).not.toContain('projectId={Number(id)}')
  })

  test('canvas page contains the migrated DAG fission runner', () => {
    const canvasPage = source('CanvasPage.tsx')
    const dagRunner = source('canvasDagRunner.ts')

    expect(canvasPage).toContain('const dagTickRef = React.useRef(0)')
    expect(canvasPage).toContain('const fissionDoneRef = React.useRef<Set<string>>(new Set())')
    expect(canvasPage).toContain('expandFissionAndDistribute({ nodeId: node.id, items: result.items, store: useCanvasStore })')
    expect(canvasPage).toContain('planCanvasDagStep({')
    expect(canvasPage).toContain('dagStep.statusUpdates')
    expect(canvasPage).toContain('dagStep.dataUpdates')
    expect(canvasPage).toContain('检测到死锁')
    expect(dagRunner).toContain('const mutedGroupIds = new Set(')
    expect(dagRunner).toContain("data: { _runSignal: now }")
    expect(dagRunner).toContain("stopReason = 'deadlock'")
    expect(dagRunner).toContain('hasBlockingError')
  })

  test('advanced actions live in the header instead of a floating card', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).not.toContain('title="高级操作"')
    expect(canvasPage).not.toContain("position: 'fixed', right: 24, top: 92")
    expect(canvasPage).toContain('全局运行')
    expect(canvasPage).toContain('漫剧生成')
    expect(canvasPage).toContain('onClick={handleGlobalRun}')
    expect(canvasPage).toContain('onClick={handleResumeRun}')
  })

  test('canvas page exposes upstream node grouping entry points', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('onSelectionContextMenu')
    expect(canvasPage).toContain('onNodeContextMenu')
    expect(canvasPage).toContain("node.type === 'nodeGroup'")
    expect(canvasPage).toContain('setGroupMenuConfig({ x: clamped.x, y: clamped.y, selectedNodeIds: []')
    expect(canvasPage).toContain("e.key === 'b'")
    expect(canvasPage).toContain("updateNodeData(selected[0].id, { _muted: !selected[0].data?._muted })")
    expect(canvasPage).toContain("const groupId = createGroup(ids, '节点组')")
    expect(canvasPage).toContain("updateNodeData(groupId, { _muted: true })")
  })

  test('canvas node search mirrors upstream quick-add menu behavior', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain('const closeNodeSearch = useCallback(() => {')
    expect(canvasPage).toContain('setMenuConfig(null)')
    expect(canvasPage).toContain("setSearchTerm('')")
    expect(canvasPage).toContain('onPaneClick={closeNodeSearch}')
    expect(canvasPage).toContain('onNodeClick={closeNodeSearch}')
    expect(canvasPage).toContain("ref={(input) => input && setTimeout(() => input.focus(), 50)}")
    expect(canvasPage).toContain('createNodeAtMenu(node)')
    expect(canvasPage).toContain('position: { x: menuConfig.flowX, y: menuConfig.flowY }')
  })

  test('canvas page restores node config and template assets with current React Flow coordinates', () => {
    const canvasPage = source('CanvasPage.tsx')

    expect(canvasPage).toContain("import { buildCanvasAssetDropPlan } from './canvasAssetDrop'")
    expect(canvasPage).toContain("asset.type !== 'node_config' && asset.type !== 'node_template'")
    expect(canvasPage).toContain('const dropPlan = buildCanvasAssetDropPlan({')
    expect(canvasPage).toContain('if (!dropPlan) return')
    expect(canvasPage).toContain('screenToFlowPosition')
    expect(canvasPage).not.toContain('reactFlowInstance.project')
    expect(canvasPage).toContain('store.setNodes([...store.nodes, ...dropPlan.nodes])')
    expect(canvasPage).toContain('store.setEdges([...store.edges, ...dropPlan.edges])')
    expect(canvasPage).not.toContain('saveHistory()\n      if (asset.type ===')
    expect(canvasPage).not.toContain('addNode({ id: getId(), type: nodeType')
  })

  test('canvas clear action preserves undo history through the store action', () => {
    const canvasPage = source('CanvasPage.tsx')
    const canvasStore = source('../stores/canvasStore.ts')

    expect(canvasPage).toContain('clearCanvas')
    expect(canvasPage).toContain('onClick={clearCanvas}')
    expect(canvasPage).not.toContain('onClick={() => setCanvasData([], [])}')
    expect(canvasStore).toContain('clearCanvas: () => void')
    expect(canvasStore).toContain('clearCanvas: () => {')
    expect(canvasStore).toContain('get().saveHistory()')
    expect(canvasStore).toContain('set({ nodes: [], edges: [], nodeRunStatus: {} })')
  })

  test('canvas graph loading resets stale running state', () => {
    const canvasStore = source('../stores/canvasStore.ts')

    expect(canvasStore).toContain('setCanvasData: (nodes, edges) => {')
    expect(canvasStore).toContain('nodeRunStatus: {}')
    expect(canvasStore).toContain('isGlobalRunning: false')
  })

  test('generate node responds to DAG run signals and exposes the out handle', () => {
    const generateNode = [source('../components/nodes/generate-node-model.ts'), source('../components/nodes/GenerateNode.tsx')].join('\n')

    expect(generateNode).toContain('prevRunSignalRef')
    expect(generateNode).toContain('data?._runSignal')
    expect(generateNode).toContain('handleRun()')
    expect(generateNode).toContain('id="out"')
  })

  test('generate node migrates upstream model configuration experience', () => {
    const generateNode = [source('../components/nodes/generate-node-model.ts'), source('../components/nodes/GenerateNode.tsx')].join('\n')

    expect(generateNode).toContain("apiClient.get('/keys/')")
    expect(generateNode).toContain('apiClient.get(`/models/?key_id=${selectedKey}&mode=${mode}`)')
    expect(generateNode).toContain('showOnlyFavorites')
    expect(generateNode).toContain('context_ui_params?.[mode]')
    expect(generateNode).toContain('renderParams()')
    expect(generateNode).toContain('generating ? handleInterrupt : handleRun')
    expect(generateNode).toContain('mediaDims')
    expect(generateNode).toContain('StarFilled')
  })

  test('generate node can create preset SystemRole prompt assets', () => {
    const generateNode = [source('../components/nodes/generate-node-model.ts'), source('../components/nodes/GenerateNode.tsx')].join('\n')

    expect(generateNode).toContain('PRESET_ROLES')
    expect(generateNode).toContain('提示词优化大师')
    expect(generateNode).toContain('金牌编剧大师')
    expect(generateNode).toContain('handleCreatePresetRole')
    expect(generateNode).toContain("apiClient.post('/assets/'")
    expect(generateNode).toContain("tags: ['SystemRole']")
    expect(generateNode).toContain('project_id: null')
    expect(generateNode).toContain('setRoleAssetId')
    expect(generateNode).toContain('setUseRoleAsset(true)')
  })

  test('generate node uses a node-following config toolbar with quick access layers', () => {
    const generateNode = [source('../components/nodes/generate-node-model.ts'), source('../components/nodes/GenerateNode.tsx')].join('\n')

    expect(generateNode).toContain("import { NodeConfigToolbar } from './NodeConfigToolbar'")
    expect(generateNode).toContain("import { BaseNode } from './BaseNode'")
    expect(generateNode).toContain('const [configOpen, setConfigOpen]')
    expect(generateNode).toContain('const [quickOpen, setQuickOpen]')
    expect(generateNode).toContain('renderQuickParams()')
    expect(generateNode).toContain('pickQuickParams')
    expect(generateNode).toContain('data-config-panel')
    expect(generateNode).toContain('onOpenConfig={() =>')
    expect(generateNode).toContain('setConfigOpen(v => !v)')
    expect(generateNode).not.toContain('ReactDOM.createPortal')
    expect(generateNode).not.toContain('panelPos')
  })

  test('generate node listens for backend SSE generation results', () => {
    const generateNode = [source('../components/nodes/generate-node-model.ts'), source('../components/nodes/GenerateNode.tsx')].join('\n')

    expect(generateNode).toContain("import { createSSEClient")
    expect(generateNode).toContain('const sseClientRef = useRef')
    expect(generateNode).toContain('createSSEClient(id,')
    expect(generateNode).toContain("msg.type === 'status'")
    expect(generateNode).toContain("msg.type === 'result'")
    expect(generateNode).toContain("msg.type === 'error'")
    expect(generateNode).toContain('await sseClient.connect()')
    expect(generateNode).toContain('sseClientRef.current?.disconnect()')
  })

  test('comfy engine node runs workflow jobs through the migrated SSE generate bridge', () => {
    const comfyNode = source('../components/nodes/ComfyUIEngineNode.tsx')

    expect(comfyNode).toContain("import { providerApi")
    expect(comfyNode).toContain("import { keyApi")
    expect(comfyNode).toContain("import { createSSEClient")
    expect(comfyNode).toContain("providerApi.getAll('comfyui')")
    expect(comfyNode).toContain('keyApi.getAll()')
    expect(comfyNode).toContain("model: 'comfyui-workflow'")
    expect(comfyNode).toContain("apiClient.post('/generate'")
    expect(comfyNode).toContain("msg.type === 'result'")
    expect(comfyNode).toContain("msg.type === 'status'")
    expect(comfyNode).toContain("msg.type === 'error'")
    expect(comfyNode).toContain('renderParameterHandles()')
    expect(comfyNode).toContain("id={`param-${paramName}`}")
    expect(comfyNode).toContain('handleSaveToAsset')
    expect(comfyNode).toContain('updateNodeData(edge.target, { incoming_data: resultWithLineage })')
  })

  test('comfy engine node accepts workflow assets dropped from the asset library', () => {
    const comfyNode = source('../components/nodes/ComfyUIEngineNode.tsx')

    expect(comfyNode).toContain("import { useDrop } from 'react-dnd'")
    expect(comfyNode).toContain("import { DndItemTypes } from '../../constants/dnd'")
    expect(comfyNode).toContain('const [{ isOver }, drop]')
    expect(comfyNode).toContain('accept: DndItemTypes.ASSET')
    expect(comfyNode).toContain("asset.type === 'workflow'")
    expect(comfyNode).toContain('normalizeWorkflowAsset({ asset })')
    expect(comfyNode).toContain('setWorkflowJson(normalized.workflowJson)')
    expect(comfyNode).toContain('setParametersJson(normalized.parameters')
    expect(comfyNode).toContain('setParamValues({})')
    expect(comfyNode).toContain('(drop as any)(el)')
  })

  test('comfy engine node exposes upstream aspect ratio and camera prompt controls', () => {
    const comfyNode = source('../components/nodes/ComfyUIEngineNode.tsx')
    const ratioSelector = source('../components/AspectRatioSelector.tsx')

    expect(comfyNode).toContain("import { AspectRatioPanel, AspectRatioTrigger")
    expect(comfyNode).toContain("import { CameraPanel, CameraTrigger, buildCameraPromptSuffix")
    expect(comfyNode).toContain("const [activePanel, setActivePanel]")
    expect(comfyNode).toContain("const [aspectRatioValue, setAspectRatioValue]")
    expect(comfyNode).toContain("const [cameraParams, setCameraParams]")
    expect(comfyNode).toContain('buildCameraPromptSuffix(cameraParams)')
    expect(comfyNode).toContain('applyComfyEngineParametersToWorkflow')
    expect(comfyNode).toContain("if (!hasExplicitParamValue(value)) continue")
    expect(comfyNode).toContain("if (inferParamType(paramName) === 'text' && cameraSuffix)")
    expect(comfyNode).toContain('buildComfyEngineResultWithLineage')
    expect(comfyNode).toContain('source_aspect_ratio: input.aspectRatioValue')
    expect(comfyNode).toContain('source_camera_params: cameraParams')
    expect(comfyNode).toContain('<AspectRatioTrigger')
    expect(comfyNode).toContain('<AspectRatioPanel')
    expect(comfyNode).toContain('<CameraTrigger')
    expect(comfyNode).toContain('<CameraPanel')

    expect(ratioSelector).toContain('export function AspectRatioTrigger')
    expect(ratioSelector).toContain('export function AspectRatioPanel')
    expect(ratioSelector).toContain('customWidth')
    expect(ratioSelector).toContain('customHeight')
    expect(ratioSelector).not.toContain('export const AspectRatioTrigger = () => null')
  })

  test('comfy engine node restores upstream camera movement prompt insertion', () => {
    const comfyNode = source('../components/nodes/ComfyUIEngineNode.tsx')
    const movement = source('../components/CameraMovement.tsx')

    expect(movement).toContain('export const DEFAULT_MOVEMENTS')
    expect(movement).toContain('dolly_in')
    expect(movement).toContain('orbit_360')
    expect(movement).toContain('export function CameraMovementTrigger')
    expect(movement).toContain('export function CameraMovementPanel')
    expect(movement).toContain('onInsert(m.prompt)')
    expect(movement).toContain('onAddCustom')
    expect(movement).not.toContain('export const CameraMovementTrigger = () => null')

    expect(comfyNode).toContain("import { CameraMovementPanel, CameraMovementTrigger")
    expect(comfyNode).toContain("'movement'")
    expect(comfyNode).toContain("const [customMovements, setCustomMovements]")
    expect(comfyNode).toContain('<CameraMovementTrigger')
    expect(comfyNode).toContain('<CameraMovementPanel')
    expect(comfyNode).toContain('const textParam = Object.keys(parameters || {}).find')
    expect(comfyNode).toContain('setParamValues(next)')
  })

  test('video workshop uses asset selectors and forwards ComfyUI input directory', () => {
    const videoWorkshop = source('VideoWorkshop/index.tsx')

    expect(videoWorkshop).toContain("import { useAssetLibraryStore")
    expect(videoWorkshop).toContain('fetchAssets()')
    expect(videoWorkshop).toContain("asset.type === 'workflow'")
    expect(videoWorkshop).toContain("asset.type === 'image'")
    expect(videoWorkshop).toContain("asset.type === 'prompt'")
    expect(videoWorkshop).toContain('optionLabelForAsset')
    expect(videoWorkshop).toContain('comfyInputDir')
    expect(videoWorkshop).toContain('comfy_input_dir: comfyInputDir.trim() || undefined')
    expect(videoWorkshop).toContain('cloudBaseUrl')
    expect(videoWorkshop).toContain('runningHubApiKey')
    expect(videoWorkshop).toContain('base_url: cloudBaseUrl.trim() || undefined')
    expect(videoWorkshop).toContain('api_key: runningHubApiKey.trim() || undefined')
    expect(videoWorkshop).toContain('runningHubTemplateId')
    expect(videoWorkshop).toContain('workflow_template_id: runningHubTemplateId.trim() || undefined')
    expect(videoWorkshop).toContain('RunningHub 模板 ID')
    expect(videoWorkshop).toContain('templateSubmitPath')
    expect(videoWorkshop).toContain('templateStatusPath')
    expect(videoWorkshop).toContain('template_submit_path: templateSubmitPath.trim() || undefined')
    expect(videoWorkshop).toContain('template_status_path: templateStatusPath.trim() || undefined')
    expect(videoWorkshop).toContain('template_input_keys')
    expect(videoWorkshop).toContain('frame_a: templateFrameAKey.trim() || undefined')
    expect(videoWorkshop).toContain('frame_b: templateFrameBKey.trim() || undefined')
    expect(videoWorkshop).toContain('prompt: templatePromptKey.trim() || undefined')
  })
})

describe('canvas config panel placement', () => {
  test('node config panels follow their node via NodeToolbar', () => {
    const toolbar = source('../components/nodes/NodeConfigToolbar.tsx')
    const generateNode = source('../components/nodes/GenerateNode.tsx')
    expect(toolbar).toContain("import { NodeToolbar, Position } from 'reactflow'")
    expect(toolbar).toContain('data-config-panel')
    expect(generateNode).toContain('NodeConfigToolbar')
  })
})

describe('canvas edge reconnection', () => {
  test('edges can be reconnected by dragging their endpoints', () => {
    const canvasPage = source('CanvasPage.tsx')
    expect(canvasPage).toContain('updateEdge')
    expect(canvasPage).toContain('onEdgeUpdate={onEdgeUpdate}')
    expect(canvasPage).toContain('edgeUpdaterRadius={12}')
  })
})

describe('canvas cleanup pack', () => {
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
})
