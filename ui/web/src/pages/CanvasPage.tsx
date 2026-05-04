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
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setCanvasData, undo, redo, past, future, saveHistory, isGlobalRunning, setGlobalRunning, nodeRunStatus, setNodeStatus, resetAllNodeStatus, smartResetNodeStatus, createGroup, dissolveGroup } = useCanvasStore()
  const [projectName, setProjectName] = useState('加载中...')
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
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.project({ x: clientOffset.x - bounds.left, y: clientOffset.y - bounds.top })
      saveHistory()
      if (asset.type === 'node_config') {
        const { nodeType, config } = asset.data || {}; if (!nodeType) return
        addNode({ id: getId(), type: nodeType, position, data: { ...config, label: asset.name || config?.label || nodeType }, style: { width: 360, height: 380 } } as any)
        message.success(`已从资产恢复「${asset.name}」节点`)
      } else {
        const { nodes: tplNodes, edges: tplEdges } = asset.data || {}; if (!tplNodes?.length) return
        const idMap: Record<number, string> = {}; const newNodes: any[] = []; const newEdges: any[] = []
        tplNodes.forEach((tpl: any, i: number) => { const newId = getId(); idMap[i] = newId; newNodes.push({ id: newId, type: tpl.type, position: { x: position.x + (tpl.relativePosition?.x || 0), y: position.y + (tpl.relativePosition?.y || 0) }, data: { ...tpl.config, label: tpl.config?.label || tpl.type }, style: { width: 360, height: 380 } }) })
        ;(tplEdges || []).forEach((tpl: any) => { const sourceId = idMap[tpl.sourceIndex]; const targetId = idMap[tpl.targetIndex]; if (sourceId && targetId) newEdges.push({ id: `edge_${Date.now()}_${Math.floor(Math.random() * 10000)}`, source: sourceId, target: targetId, sourceHandle: tpl.sourceHandle, targetHandle: tpl.targetHandle }) })
        const store = useCanvasStore.getState(); store.setNodes([...store.nodes, ...newNodes]); store.setEdges([...store.edges, ...newEdges])
        message.success(`已从模板恢复「${asset.name}」（${newNodes.length} 个节点）`)
      }
    },
  }), [reactFlowInstance, addNode, saveHistory])

  useEffect(() => { if (id) apiClient.get(`/projects/${id}`).then(res => { setProjectName(res.data?.name || '未命名项目'); const savedData = res.data?.canvas_data; if (savedData?.nodes) setCanvasData(savedData.nodes || [], savedData.edges || []) }).catch(() => setProjectName('未命名项目')) }, [id, setCanvasData])
  const handleSave = useCallback(async (isSilent = false) => { if (!reactFlowInstance || !id) return; setSaving(true); try { await apiClient.put(`/projects/${id}`, { canvas_data: reactFlowInstance.toObject() }); if (!isSilent) message.success('画布已保存') } catch { if (!isSilent) message.error('保存失败') } finally { setSaving(false) } }, [reactFlowInstance, id])
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(false) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [handleSave])
  useEffect(() => { if (saveMode === 'realtime') { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => handleSave(true), 1500) } return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) } }, [nodes, edges, saveMode, handleSave])
  useEffect(() => { let intervalId: ReturnType<typeof setInterval> | undefined; if (saveMode.startsWith('auto_')) { const seconds = parseInt(saveMode.split('_')[1], 10); intervalId = setInterval(() => handleSave(true), seconds * 1000) } return () => { if (intervalId) clearInterval(intervalId) } }, [saveMode, handleSave])
  const handleGlobalRun = () => { if (isGlobalRunning) { const runningNodeIds = nodes.filter(n => nodeRunStatus[n.id] === 'running').map(n => n.id); setGlobalRunning(false); runningNodeIds.forEach(nodeId => setNodeStatus(nodeId, 'error')); message.info('全局运行已停止'); return } if (!nodes.length) return message.warning('画布太空了，先添点节点吧！'); resetAllNodeStatus(nodes); setGlobalRunning(true); message.success('全局运行已启动') }
  const handleResumeRun = () => { if (isGlobalRunning) return; if (!nodes.length) return message.warning('画布太空了，先添点节点吧！'); smartResetNodeStatus(nodes); setGlobalRunning(true); message.success('继续运行已启动') }
  const isValidConnection = useCallback((connection: any) => { const sourceNode = nodes.find(n => n.id === connection.source); const targetNode = nodes.find(n => n.id === connection.target); if (!sourceNode || !targetNode) return false; const sourceType = getHandleDataType(sourceNode.type, connection.sourceHandle ?? undefined, sourceNode.data, 'source'); const targetType = getHandleDataType(targetNode.type, connection.targetHandle ?? undefined, targetNode.data, 'target'); return areTypesCompatible(sourceType, targetType) }, [nodes])

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
    setMenuConfig({ x, y, flowX: pos.x, flowY: pos.y })
    setSearchTerm('')
  }

  const createNodeAtMenu = (node: typeof AVAILABLE_NODES[number]) => {
    if (!menuConfig) return
    addNode({ id: getId(), type: node.type, position: { x: menuConfig.flowX, y: menuConfig.flowY }, data: { label: node.label } } as any)
    setMenuConfig(null)
    setSearchTerm('')
  }

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
        <Button icon={<ClearOutlined />} onClick={() => setCanvasData([], [])}>清空</Button>
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
            <AssetLibrary projectId={Number(id)} onAddToCanvas={(asset) => { const position = reactFlowInstance?.screenToFlowPosition({ x: 420, y: window.innerHeight / 2 }) ?? { x: 300, y: 200 }; addNode({ id: getId(), type: 'loadAsset', position, data: { label: asset.name, asset } } as any); message.success(`「${asset.name}」已发送到画布`) }} />
          </div>
        </div>
      </Sider>

      <Content ref={(el: HTMLDivElement | null) => { (reactFlowWrapper as any).current = el; canvasDrop(el) }} style={{ background: 'transparent', position: 'relative' }} onDoubleClick={(e) => { if ((e.target as HTMLElement).closest('.react-flow__pane')) openNodeSearch(e.clientX, e.clientY) }} onContextMenu={(e) => { if ((e.target as HTMLElement).closest('.react-flow__pane')) { e.preventDefault(); openNodeSearch(e.clientX, e.clientY) } }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(99,102,241,0.09), transparent 28%), radial-gradient(circle at bottom left, rgba(14,165,233,0.08), transparent 24%)' }} />
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onInit={setReactFlowInstance} nodeTypes={nodeTypes} fitView zoomOnDoubleClick={false} deleteKeyCode={['Backspace', 'Delete']} selectionKeyCode={['Shift', 'Control', 'Meta']}>
          <Background color="#cbd5e1" gap={18} />
          <Controls style={{ left: 16, right: 'auto' }} />
          <MiniMap style={{ border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16, right: 16, bottom: 16, boxShadow: '0 14px 36px rgba(15,23,42,0.12)' }} zoomable pannable />
        </ReactFlow>

        {menuConfig && <div style={{ position: 'fixed', left: menuConfig.x, top: menuConfig.y, zIndex: 9999, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 45px rgba(15,23,42,0.18)', borderRadius: 16, width: 300, border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden' }} onDoubleClick={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: 10, background: '#fafafa', borderBottom: '1px solid #e2e8f0' }}><Input prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} placeholder="搜索节点..." variant="borderless" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: 0 }} /></div>
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

    <Card size="small" title="高级操作" style={{ position: 'fixed', right: 24, top: 92, width: 236, zIndex: 10, boxShadow: '0 18px 40px rgba(15,23,42,0.12)', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ paddingTop: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button icon={isGlobalRunning ? <StopOutlined /> : <PlayCircleOutlined />} onClick={handleGlobalRun} type={isGlobalRunning ? 'primary' : 'default'} danger={isGlobalRunning} block style={{ borderRadius: 12, height: 42 }}>{isGlobalRunning ? '停止运行' : '全局运行'}</Button>
        <Button icon={<ThunderboltOutlined />} onClick={handleResumeRun} type="primary" style={{ background: '#faad14', borderColor: '#faad14', borderRadius: 12, height: 42 }} block>继续运行</Button>
        <Button onClick={() => setComicModalOpen(true)} style={{ fontWeight: 'bold', borderColor: '#f59e0b', color: '#f59e0b', borderRadius: 12, height: 42 }} block>漫剧生成</Button>
      </Space>
    </Card>

    <Modal title="漫剧生成" open={comicModalOpen} onCancel={() => setComicModalOpen(false)} okText="创建流水线" cancelText="取消" width={520} onOk={() => { message.info('该入口已保留，后续可继续接回原版漫剧流水线逻辑'); setComicModalOpen(false) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <div><Text strong style={{ display: 'block', marginBottom: 4 }}>故事 / 创意描述</Text><Input.TextArea rows={4} placeholder="输入一段故事、一句创意，或一个场景描述..." value={comicConfig.story} onChange={e => setComicConfig(prev => ({ ...prev, story: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: 16 }}><div style={{ flex: 1 }}><Text strong style={{ display: 'block', marginBottom: 4 }}>分镜数量</Text><Select value={comicConfig.panelCount} onChange={v => setComicConfig(prev => ({ ...prev, panelCount: v }))} style={{ width: '100%' }} options={[{ label: '4 格', value: 4 }, { label: '6 格', value: 6 }, { label: '8 格', value: 8 }, { label: '12 格', value: 12 }]} /></div><div style={{ flex: 1 }}><Text strong style={{ display: 'block', marginBottom: 4 }}>目标平台</Text><Select value={comicConfig.platform} onChange={v => setComicConfig(prev => ({ ...prev, platform: v }))} style={{ width: '100%' }} options={[{ label: '通用', value: '通用' }, { label: '抖音', value: '抖音' }, { label: '快手', value: '快手' }, { label: '小红书', value: '小红书' }, { label: 'B站', value: 'B站' }]} /></div></div>
        <div><Text strong style={{ display: 'block', marginBottom: 4 }}>画风描述（可选）</Text><Input placeholder="如：日漫风格、赛博朋克、水墨画..." value={comicConfig.style} onChange={e => setComicConfig(prev => ({ ...prev, style: e.target.value }))} /></div>
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ad6800' }}>该功能暂未接入完整流水线。</div>
      </div>
    </Modal>
  </Layout>
}

export function CanvasPage() { return <ReactFlowProvider><CanvasWorkspace /></ReactFlowProvider> }
export default CanvasPage
