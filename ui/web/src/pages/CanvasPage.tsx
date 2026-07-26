import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDrop } from 'react-dnd'
import { Button, Input, Layout, Modal, Select, Space, Tag, Tooltip, Typography, message, Card } from 'antd'
import { ArrowLeftOutlined, ClearOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlayCircleOutlined, SaveOutlined, SearchOutlined, StopOutlined, SyncOutlined, ThunderboltOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, type ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { DndItemTypes } from '../constants/dnd'
import { useCanvasStore } from '../stores/canvasStore'
import AssetLibrary from '../components/AssetLibrary'
import { nodeTypes } from '../components/nodes'
import { getHandleDataType, areTypesCompatible } from '../utils/handleTypes'
import apiClient from '../api/client'
import { planCanvasDagStep } from './canvasDagRunner'
import { buildCanvasAssetDropPlan } from './canvasAssetDrop'
import { expandFissionAndDistribute } from './canvasFission'
import { clampToViewport } from '../utils/viewportClamp'

const NODE_MENU_SIZE = { width: 300, height: 380 }
const GROUP_MENU_SIZE = { width: 180, height: 88 }

const { Content, Sider } = Layout
const { Title, Text } = Typography

type NodeCategory = 'ai' | 'resource' | 'display' | 'structure'

const AVAILABLE_NODES: Array<{ type: string; label: string; desc: string; category: NodeCategory; icon: string }> = [
  { type: 'generate', label: 'AI 大脑节点', desc: '调用大模型生成文本或图像', category: 'ai', icon: '🧠' },
  { type: 'loadAsset', label: '资产输入节点', desc: '加载已有资产作为上下文', category: 'resource', icon: '📦' },
  { type: 'display', label: '结果展示节点', desc: '在画布中预览生成的结果', category: 'display', icon: '📺' },
  { type: 'comfyUIEngine', label: '算力引擎节点', desc: '调度本地或云端工作流', category: 'structure', icon: '🚀' },
]

const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  ai: 'AI 生成类',
  resource: '资源输入类',
  display: '结果展示类',
  structure: '工作流结构类',
}

const getId = () => `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`

function CanvasWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const routeProjectId = id ? Number(id) : undefined
  const canvasProjectId = Number.isFinite(routeProjectId) ? routeProjectId : undefined
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setCanvasData, clearCanvas, undo, redo, past, future, saveHistory, isGlobalRunning, setGlobalRunning, nodeRunStatus, setNodeStatus, resetAllNodeStatus, smartResetNodeStatus, updateNodeData, createGroup, dissolveGroup } = useCanvasStore()
  const [projectName, setProjectName] = useState(id ? '加载中...' : '全局画布')
  const [saving, setSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [saveMode, setSaveMode] = useState<string>('manual')
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menuConfig, setMenuConfig] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [groupMenuConfig, setGroupMenuConfig] = useState<{ x: number; y: number; selectedNodeIds: string[]; dissolveGroupId?: string } | null>(null)
  const [comicModalOpen, setComicModalOpen] = useState(false)
  const [comicConfig, setComicConfig] = useState({ story: '', panelCount: 6, style: '', platform: '通用' })

  const [, canvasDrop] = useDrop(() => ({
    accept: DndItemTypes.ASSET,
    drop: (item: { asset: any }, monitor) => {
      const asset = item.asset
      if (!asset || !reactFlowInstance) return
      if (asset.type !== 'node_config' && asset.type !== 'node_template') return
      const clientOffset = monitor.getClientOffset(); if (!clientOffset || !reactFlowWrapper.current) return
      const position = reactFlowInstance.screenToFlowPosition({ x: clientOffset.x, y: clientOffset.y })
      const dropPlan = buildCanvasAssetDropPlan({ asset, position, nextId: getId })
      if (!dropPlan) return
      saveHistory()
      const store = useCanvasStore.getState()
      store.setNodes([...store.nodes, ...dropPlan.nodes])
      store.setEdges([...store.edges, ...dropPlan.edges])
      if (dropPlan.kind === 'node_config') message.success(`已从资产恢复「${dropPlan.assetName}」节点`)
      else message.success(`已从模板恢复「${dropPlan.assetName}」（${dropPlan.nodes.length} 个节点）`)
    },
  }), [reactFlowInstance, saveHistory])

  useEffect(() => {
    if (!id) {
      setProjectName('全局画布')
      return
    }
    apiClient.get(`/projects/${id}`).then(res => {
      const project = res.data?.project || res.data
      setProjectName(project?.name || '未命名项目')
      const savedData = project?.canvas_data
      if (savedData?.nodes) setCanvasData(savedData.nodes || [], savedData.edges || [])
    }).catch(() => setProjectName('未命名项目'))
  }, [id, setCanvasData])
  const handleSave = useCallback(async (isSilent = false) => { if (!reactFlowInstance || !id) return; setSaving(true); try { await apiClient.put(`/projects/${id}`, { canvas_data: reactFlowInstance.toObject() }); if (!isSilent) message.success('画布已保存') } catch { if (!isSilent) message.error('保存失败') } finally { setSaving(false) } }, [reactFlowInstance, id])
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(false) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [handleSave])
  useEffect(() => { if (saveMode === 'realtime') { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => handleSave(true), 1500) } return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) } }, [nodes, edges, saveMode, handleSave])
  useEffect(() => { let intervalId: ReturnType<typeof setInterval> | undefined; if (saveMode.startsWith('auto_')) { const seconds = parseInt(saveMode.split('_')[1], 10); intervalId = setInterval(() => handleSave(true), seconds * 1000) } return () => { if (intervalId) clearInterval(intervalId) } }, [saveMode, handleSave])
  const handleGlobalRun = () => {
    if (isGlobalRunning) {
      const runningNodeIds = nodes.filter(n => nodeRunStatus[n.id] === 'running').map(n => n.id)
      setGlobalRunning(false)
      runningNodeIds.forEach(nodeId => setNodeStatus(nodeId, 'error'))
      if (runningNodeIds.length > 0) {
        Promise.allSettled(
          runningNodeIds.map(nodeId => apiClient.post(`/interrupt/${nodeId}`))
        ).then(results => {
          const stoppedCount = results.filter(result => result.status === 'fulfilled').length
          message.info(`全局运行已停止：${stoppedCount}/${runningNodeIds.length} 个后端任务已中断`)
        })
      } else {
        message.info('全局运行已停止')
      }
      return
    }
    if (!nodes.length) return message.warning('画布太空了，先添点节点吧！')
    resetAllNodeStatus(nodes)
    nodes.forEach(node => {
      if (node.type === 'display') updateNodeData(node.id, { incoming_data: null, result: null })
    })
    setGlobalRunning(true)
    message.success('全局运行已启动')
  }

  const handleResumeRun = () => {
    if (isGlobalRunning) return
    if (!nodes.length) return message.warning('画布太空了，先添点节点吧！')

    const hasSuccessNode = nodes.some(n => nodeRunStatus[n.id] === 'success')
    if (!hasSuccessNode) {
      resetAllNodeStatus(nodes)
      setGlobalRunning(true)
      message.success('无断点记录，已全新启动')
      return
    }

    smartResetNodeStatus(nodes)
    nodes.forEach(node => {
      if (nodeRunStatus[node.id] !== 'success') return
      const outData = node.data.result || node.data.asset?.data || node.data.incoming_data
      if (!outData) return
      edges.filter(edge => edge.source === node.id).forEach(edge => {
        if (nodeRunStatus[edge.target] !== 'success') {
          updateNodeData(edge.target, { incoming_data: outData })
        }
      })
    })

    setGlobalRunning(true)
    message.success('断点续跑已启动，成功节点已跳过')
  }
  const isValidConnection = useCallback((connection: any) => { const sourceNode = nodes.find(n => n.id === connection.source); const targetNode = nodes.find(n => n.id === connection.target); if (!sourceNode || !targetNode) return false; const sourceType = getHandleDataType(sourceNode.type, connection.sourceHandle ?? undefined, sourceNode.data, 'source'); const targetType = getHandleDataType(targetNode.type, connection.targetHandle ?? undefined, targetNode.data, 'target'); return areTypesCompatible(sourceType, targetType) }, [nodes])

  const hasBreakpoint = !isGlobalRunning && nodes.some(n => nodeRunStatus[n.id] === 'success') && nodes.some(n => {
    const status = nodeRunStatus[n.id]
    return status === 'error' || status === 'idle'
  }) && !nodes.some(n => nodeRunStatus[n.id] === 'running')

  const dagTickRef = React.useRef(0)
  const fissionDoneRef = React.useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!isGlobalRunning) {
      dagTickRef.current = 0
      fissionDoneRef.current.clear()
      return
    }

    for (const node of nodes) {
      if (node.type === 'nodeGroup') continue
      const status = nodeRunStatus[node.id] || 'idle'
      if (status !== 'success') continue
      if (fissionDoneRef.current.has(node.id)) continue

      const result = node.data?.result
      if (result && typeof result === 'object' && result._fission && Array.isArray(result.items) && result.items.length > 1) {
        const expectedCountRaw = node.data?._fissionExpectedCount
        const expectedCount = Number.isFinite(Number(expectedCountRaw)) ? Number(expectedCountRaw) : null
        const actualCount = result.items.length

        if (expectedCount !== null && actualCount !== expectedCount) {
          fissionDoneRef.current.add(node.id)
          message.warning(`裂变执行已阻断：节点期望 ${expectedCount} 条，实际 ${actualCount} 条`, 4)
          console.warn(`[DAG 引擎] 裂变阻断，node=${node.id}, expected=${expectedCount}, actual=${actualCount}`)
          continue
        }

        fissionDoneRef.current.add(node.id)
        const outcome = expandFissionAndDistribute({ nodeId: node.id, items: result.items, store: useCanvasStore })
        if (outcome.expanded) message.info(`裂变完成，已创建 ${actualCount} 个并行分支`, 3)
        return
      }
    }

    const dagStep = planCanvasDagStep({
      nodes,
      edges,
      nodeRunStatus,
      tick: dagTickRef.current,
    })
    Object.entries(dagStep.statusUpdates).forEach(([nodeId, status]) => setNodeStatus(nodeId, status))
    dagStep.dataUpdates.forEach(update => updateNodeData(update.id, update.data))
    dagTickRef.current = dagStep.nextTick

    if (dagStep.stopReason === 'error') {
      setGlobalRunning(false)
      message.error('有节点执行失败，流水线已暂停。可点击「断点续跑」从失败处重试。', 4)
    } else if (dagStep.stopReason === 'complete') {
      setGlobalRunning(false)
      message.success('全部流水线节点执行完毕', 3)
    } else if (dagStep.stopReason === 'deadlock') {
      message.error('检测到死锁或未连接的节点孤岛，执行已终止')
      setGlobalRunning(false)
    }
  }, [isGlobalRunning, nodeRunStatus, nodes, edges, updateNodeData, setNodeStatus, setGlobalRunning])

  const createComicPipeline = useCallback((config: typeof comicConfig) => {
    if (!config.story.trim()) {
      message.warning('请输入故事或创意描述')
      return
    }

    saveHistory()

    const baseX = 120
    const baseY = 120
    const gapX = 420
    const storyboardId = getId()
    const imageGenId = getId()
    const displayId = getId()
    const storyboardSystemPrompt = `你是一位专业的分镜师和 Prompt Engineer。用户会给你一段故事或创意描述，你需要将其拆解为恰好 ${config.panelCount} 个分镜画面。

硬性要求：
1. 输出语言：每个分镜必须是英文图片提示词。
2. 每个分镜需包含主体、动作、表情、场景、光影、镜头构图和画面细节。
3. ${config.style ? `整体画风：${config.style}` : '整体画风需统一且与故事匹配。'}
4. 目标平台：${config.platform}。
5. 输出数量必须严格等于 ${config.panelCount} 条，不能多也不能少。
6. 输出格式必须是纯 JSON 数组，数组元素必须是字符串。
7. 禁止输出 Markdown 代码块、解释、标题、前后缀文本，只能输出 JSON 数组本体。

输出示例：
["Cinematic anime frame, ...", "Cinematic anime frame, ..."]`

    const storyboardNode = {
      id: storyboardId,
      type: 'generate',
      position: { x: baseX, y: baseY },
      data: {
        label: '分镜大师',
        mode: 'chat',
        prompt: config.story,
        systemPrompt: storyboardSystemPrompt,
        _fissionEnabled: true,
        _fissionExpectedCount: config.panelCount,
        _customLabel: true,
        _systemPromptOverride: storyboardSystemPrompt,
      },
      style: { width: 360, height: 420 },
    }
    const imageGenNode = {
      id: imageGenId,
      type: 'generate',
      position: { x: baseX + gapX, y: baseY },
      data: {
        label: '分镜绘图',
        mode: 'text_to_image',
        prompt: '',
        aspectRatio: '9:16',
        _customLabel: true,
      },
      style: { width: 360, height: 380 },
    }
    const displayNode = {
      id: displayId,
      type: 'display',
      position: { x: baseX + gapX * 2, y: baseY },
      data: { label: '分镜预览', _customLabel: true },
      style: { width: 300, height: 300 },
    }
    const edge1 = {
      id: `edge_comic_1_${Date.now()}`,
      source: storyboardId,
      target: imageGenId,
      sourceHandle: 'out',
      targetHandle: 'text',
    }
    const edge2 = {
      id: `edge_comic_2_${Date.now()}`,
      source: imageGenId,
      target: displayId,
      sourceHandle: 'out',
      targetHandle: 'in',
    }

    const store = useCanvasStore.getState()
    store.setNodes([...store.nodes, storyboardNode as any, imageGenNode as any, displayNode as any])
    store.setEdges([...store.edges, edge1, edge2])
    setComicModalOpen(false)
    message.success('漫剧流水线已创建，请为两个 AI 节点选择 Key/Model 后运行全局')
  }, [saveHistory])

  const filteredNodes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return AVAILABLE_NODES.filter(n => !query || n.label.toLowerCase().includes(query) || n.desc.toLowerCase().includes(query) || n.category.toLowerCase().includes(query))
  }, [searchTerm])

  const groupedNodes = useMemo(() => {
    return filteredNodes.reduce<Record<NodeCategory, typeof AVAILABLE_NODES>>((acc, node) => {
      acc[node.category] = acc[node.category] || []
      acc[node.category].push(node)
      return acc
    }, { ai: [], resource: [], display: [], structure: [] })
  }, [filteredNodes])

  const openNodeSearch = (x: number, y: number) => {
    if (!reactFlowInstance) return
    const pos = reactFlowInstance.screenToFlowPosition({ x, y })
    const clamped = clampToViewport({ x, y, ...NODE_MENU_SIZE, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
    setMenuConfig({ x: clamped.x, y: clamped.y, flowX: pos.x, flowY: pos.y })
    setSearchTerm('')
  }

  const closeNodeSearch = useCallback(() => {
    setMenuConfig(null)
    setSearchTerm('')
  }, [])

  const createNodeAtMenu = (node: typeof AVAILABLE_NODES[number]) => {
    if (!menuConfig) return
    addNode({ id: getId(), type: node.type, position: { x: menuConfig.flowX, y: menuConfig.flowY }, data: { label: node.label } } as any)
    setMenuConfig(null)
    setSearchTerm('')
  }

  const onSelectionContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuConfig(null)
    const selectedNodes = nodes.filter(node => node.selected)
    const clamped = clampToViewport({ x: event.clientX, y: event.clientY, ...GROUP_MENU_SIZE, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
    if (selectedNodes.length < 2) {
      if (selectedNodes.length === 1 && selectedNodes[0].type === 'nodeGroup') {
        setGroupMenuConfig({ x: clamped.x, y: clamped.y, selectedNodeIds: [], dissolveGroupId: selectedNodes[0].id })
      }
      return
    }
    if (selectedNodes.some(node => node.parentNode)) return
    setGroupMenuConfig({ x: clamped.x, y: clamped.y, selectedNodeIds: selectedNodes.map(node => node.id) })
  }, [nodes])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    if (node.type === 'nodeGroup') {
      event.preventDefault()
      event.stopPropagation()
      setMenuConfig(null)
      const clamped = clampToViewport({ x: event.clientX, y: event.clientY, ...GROUP_MENU_SIZE, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
      setGroupMenuConfig({ x: clamped.x, y: clamped.y, selectedNodeIds: [], dissolveGroupId: node.id })
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === 'b')) return
      e.preventDefault()
      const selected = nodes.filter(node => node.selected && node.type !== 'nodeGroup')
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
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodes, updateNodeData, createGroup])

  return <Layout style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
    <Layout.Header style={{ height: 72, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(148,163,184,0.18)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
      <Space size="middle" style={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title={isSidebarOpen ? '收起资产库' : '展开资产库'}><Button type="text" icon={isSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} onClick={() => setIsSidebarOpen(!isSidebarOpen)} /></Tooltip>
        <Tooltip title="返回中枢大厅"><Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} /></Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Title level={5} style={{ margin: 0 }}>{projectName}</Title><Tag color="processing" bordered={false}>创作中</Tag></div>
      </Space>
      <Space size="middle">
        <Space.Compact>
          <Tooltip title="撤销 (Ctrl+Z)"><Button icon={<UndoOutlined />} onClick={undo} disabled={past.length === 0} /></Tooltip>
          <Tooltip title="重做 (Ctrl+Y)"><Button icon={<RedoOutlined />} onClick={redo} disabled={future.length === 0} /></Tooltip>
        </Space.Compact>
        <Button icon={<ClearOutlined />} onClick={clearCanvas}>清空</Button>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: 4, borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
          <Select variant="borderless" value={saveMode} onChange={setSaveMode} style={{ width: 130 }} options={[{ value: 'manual', label: <span><SaveOutlined /> 手动保存</span> }, { value: 'realtime', label: <span><SyncOutlined spin={saving && saveMode === 'realtime'} style={{ color: '#1890ff' }} /> 实时保存</span> }, { value: 'auto_10', label: <span><SyncOutlined /> 自动 (10秒)</span> }, { value: 'auto_30', label: <span><SyncOutlined /> 自动 (30秒)</span> }]} />
          <Button type={saveMode === 'manual' ? 'primary' : 'default'} icon={<SaveOutlined />} loading={saving && saveMode === 'manual'} onClick={() => handleSave(false)} style={{ borderRadius: 10 }}>保存</Button>
        </div>
      </Space>
    </Layout.Header>

    <Layout>
      <Sider width={340} collapsedWidth={0} collapsed={!isSidebarOpen} theme="light" style={{ borderRight: '1px solid rgba(148,163,184,0.14)', background: 'rgba(255,255,255,0.9)' }}>
        <div style={{ width: 340, height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.96))' }}>
          <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
            <Title level={5} style={{ margin: 0, color: '#2563eb' }}>💡 交互升级</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>可拖拽资产到画布，或双击空白处呼出搜索菜单。</Text>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AssetLibrary projectId={canvasProjectId} onAddToCanvas={(asset) => { const position = reactFlowInstance?.screenToFlowPosition({ x: 420, y: window.innerHeight / 2 }) ?? { x: 300, y: 200 }; addNode({ id: getId(), type: 'loadAsset', position, data: { label: asset.name, asset } } as any); message.success(`「${asset.name}」已发送到画布`) }} />
          </div>
        </div>
      </Sider>

      <Content ref={(el: HTMLDivElement | null) => { (reactFlowWrapper as any).current = el; canvasDrop(el) }} style={{ background: 'transparent', position: 'relative' }} onDoubleClick={(e) => { if ((e.target as HTMLElement).closest('.react-flow__pane')) openNodeSearch(e.clientX, e.clientY) }} onContextMenu={(e) => { if ((e.target as HTMLElement).closest('.react-flow__pane')) { e.preventDefault(); openNodeSearch(e.clientX, e.clientY) } }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(99,102,241,0.09), transparent 28%), radial-gradient(circle at bottom left, rgba(14,165,233,0.08), transparent 24%)' }} />
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onInit={setReactFlowInstance} nodeTypes={nodeTypes} fitView zoomOnDoubleClick={false} onPaneClick={closeNodeSearch} onNodeClick={closeNodeSearch} onSelectionContextMenu={onSelectionContextMenu} onNodeContextMenu={onNodeContextMenu} deleteKeyCode={['Backspace', 'Delete']} selectionKeyCode={['Shift', 'Control', 'Meta']}>
          <Background color="#cbd5e1" gap={18} />
          <Controls style={{ left: 16, right: 'auto' }} />
          <MiniMap style={{ border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16, right: 16, bottom: 16, boxShadow: '0 14px 36px rgba(15,23,42,0.12)' }} zoomable pannable />
        </ReactFlow>

        {menuConfig && <div style={{ position: 'fixed', left: menuConfig.x, top: menuConfig.y, zIndex: 9999, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 45px rgba(15,23,42,0.18)', borderRadius: 16, width: 300, border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden' }} onDoubleClick={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: 10, background: '#fafafa', borderBottom: '1px solid #e2e8f0' }}><Input prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} placeholder="搜索节点..." variant="borderless" ref={(input) => input && setTimeout(() => input.focus(), 50)} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: 0 }} /></div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
            {(['ai', 'resource', 'display', 'structure'] as NodeCategory[]).map(category => {
              const list = groupedNodes[category]
              if (!list.length) return null
              return <div key={category} style={{ marginBottom: 10 }}>
                <div style={{ padding: '6px 10px', fontSize: 11, color: '#64748b', fontWeight: 700 }}>{NODE_CATEGORY_LABELS[category]}</div>
                {list.map(node => <div key={node.type} onClick={() => createNodeAtMenu(node)} style={{ padding: '10px 12px', cursor: 'pointer', borderRadius: 10, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
                  <Space align="center" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 16 }}>{node.icon}</span>
                    <Text strong style={{ fontSize: 13 }}>{node.label}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>{node.desc}</Text>
                </div>)}
              </div>
            })}
            {!filteredNodes.length && <div style={{ padding: '16px 0', textAlign: 'center' }}><Text type="secondary">未找到节点</Text></div>}
          </div>
        </div>}

        {groupMenuConfig && <div style={{ position: 'fixed', left: groupMenuConfig.x, top: groupMenuConfig.y, zIndex: 9999, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 45px rgba(15,23,42,0.18)', borderRadius: 14, width: 180, border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden', padding: 4 }} onClick={(e) => e.stopPropagation()}>{groupMenuConfig.selectedNodeIds.length > 0 && <div onClick={() => { createGroup(groupMenuConfig.selectedNodeIds, '节点组'); setGroupMenuConfig(null) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 8 }}><Text strong style={{ fontSize: 13 }}>📦 创建节点组</Text></div>}{groupMenuConfig.dissolveGroupId && <div onClick={() => { dissolveGroup(groupMenuConfig.dissolveGroupId!); setGroupMenuConfig(null) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 8 }}><Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>🔓 解散节点组</Text></div>}</div>}
      </Content>
    </Layout>

    <Card size="small" title="高级操作" style={{ position: 'fixed', right: 24, top: 92, width: 236, zIndex: 10, boxShadow: '0 18px 40px rgba(15,23,42,0.12)', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)' }} styles={{ body: { paddingTop: 12 } }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button icon={isGlobalRunning ? <StopOutlined /> : <PlayCircleOutlined />} onClick={handleGlobalRun} type={isGlobalRunning ? 'primary' : 'default'} danger={isGlobalRunning} block style={{ borderRadius: 12, height: 42 }}>{isGlobalRunning ? '停止运行' : '全局运行'}</Button>
        {hasBreakpoint && <Button icon={<ThunderboltOutlined />} onClick={handleResumeRun} type="primary" style={{ background: '#faad14', borderColor: '#faad14', borderRadius: 12, height: 42 }} block>继续运行</Button>}
        <Button onClick={() => setComicModalOpen(true)} style={{ fontWeight: 'bold', borderColor: '#f59e0b', color: '#f59e0b', borderRadius: 12, height: 42 }} block>漫剧生成</Button>
      </Space>
    </Card>

    <Modal title="漫剧生成" open={comicModalOpen} onCancel={() => setComicModalOpen(false)} okText="创建流水线" cancelText="取消" width={520} onOk={() => createComicPipeline(comicConfig)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <div><Text strong style={{ display: 'block', marginBottom: 4 }}>故事 / 创意描述</Text><Input.TextArea rows={4} placeholder="输入一段故事、一句创意，或一个场景描述..." value={comicConfig.story} onChange={e => setComicConfig(prev => ({ ...prev, story: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: 16 }}><div style={{ flex: 1 }}><Text strong style={{ display: 'block', marginBottom: 4 }}>分镜数量</Text><Select value={comicConfig.panelCount} onChange={v => setComicConfig(prev => ({ ...prev, panelCount: v }))} style={{ width: '100%' }} options={[{ label: '4 格', value: 4 }, { label: '6 格', value: 6 }, { label: '8 格', value: 8 }, { label: '12 格', value: 12 }]} /></div><div style={{ flex: 1 }}><Text strong style={{ display: 'block', marginBottom: 4 }}>目标平台</Text><Select value={comicConfig.platform} onChange={v => setComicConfig(prev => ({ ...prev, platform: v }))} style={{ width: '100%' }} options={[{ label: '通用', value: '通用' }, { label: '抖音', value: '抖音' }, { label: '快手', value: '快手' }, { label: '小红书', value: '小红书' }, { label: 'B站', value: 'B站' }]} /></div></div>
        <div><Text strong style={{ display: 'block', marginBottom: 4 }}>画风描述（可选）</Text><Input placeholder="如：日漫风格、赛博朋克、水墨画..." value={comicConfig.style} onChange={e => setComicConfig(prev => ({ ...prev, style: e.target.value }))} /></div>
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ad6800' }}>创建后会自动生成“分镜大师 → 分镜绘图 → 分镜预览”流水线；运行前需要在两个 AI 节点中选择 Key 和模型。</div>
      </div>
    </Modal>
  </Layout>
}

export function CanvasPage() { return <ReactFlowProvider><CanvasWorkspace /></ReactFlowProvider> }
export default CanvasPage
