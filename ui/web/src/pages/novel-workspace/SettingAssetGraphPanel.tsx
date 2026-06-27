import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Empty, List, message, Modal, Segmented, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import { BranchesOutlined, EyeInvisibleOutlined, EyeOutlined, FullscreenOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import apiClient from '../../api/client'
import { displayPreview, displayValue } from './utils'
import './SettingAssetGraphPanel.css'

const { Text, Title } = Typography

type SettingRelationshipNode = {
  id: string
  kind: 'setting' | 'chapter'
  entity_id?: number
  chapter_id?: number
  entity_type?: string
  name: string
  summary?: string
  metadata?: Record<string, any>
}

type SettingRelationshipEdge = {
  id: string
  source: string
  target: string
  relation_type: string
  label: string
  confidence: 'explicit' | 'inferred' | 'usage'
  start_chapter_no?: number | null
  end_chapter_no?: number | null
  status?: string
  state?: any
  state_changes?: Array<{
    chapter_id?: number
    chapter_no?: number | null
    usage_type?: string
    reveal_level?: string
    expected_state_change?: any
    actual_state_change?: any
    status?: string
    note?: string
  }>
  evidence?: string
}

type SettingRelationshipDiagnostic = {
  type: string
  severity: 'info' | 'warning' | 'high'
  entity_id?: number
  entity_name?: string
  message: string
  evidence?: string
}

type SettingRelationshipGraph = {
  nodes: SettingRelationshipNode[]
  edges: SettingRelationshipEdge[]
  diagnostics: SettingRelationshipDiagnostic[]
  summary: {
    node_count: number
    edge_count: number
    isolated_key_asset_count: number
    missing_owner_count: number
    missing_start_chapter_count: number
    timeline_conflict_count: number
    owner_mismatch_count: number
  }
}

type AssetNodeData = {
  label: React.ReactNode
  source: SettingRelationshipNode
}

type GraphMode = 'all' | 'character' | 'storyline' | 'risk'

type RelationshipRepairPatch = {
  source_id: number
  source_name: string
  source_type: string
  target_id: number
  target_name: string
  target_type: string
  patch_type: string
  relation_type: string
  reason: string
  confidence: number
}

const EMPTY_GRAPH: SettingRelationshipGraph = {
  nodes: [],
  edges: [],
  diagnostics: [],
  summary: {
    node_count: 0,
    edge_count: 0,
    isolated_key_asset_count: 0,
    missing_owner_count: 0,
    missing_start_chapter_count: 0,
    timeline_conflict_count: 0,
    owner_mismatch_count: 0,
  },
}

const typeLabels: Record<string, string> = {
  character: '角色',
  realm: '境界',
  ability: '能力',
  item: '物品',
  boss: 'Boss',
  rule: '规则',
  faction: '势力',
  location: '地点',
  foreshadowing: '伏笔',
  timeline: '时间线',
  mainline: '主线',
  subplot: '支线',
  character_arc: '角色线',
  relationship_arc: '关系线',
  faction_arc: '势力线',
  foreshadowing_arc: '伏笔线',
  chapter: '章节',
}

const typeOrder = [
  'character',
  'ability',
  'realm',
  'faction',
  'item',
  'boss',
  'mainline',
  'subplot',
  'character_arc',
  'relationship_arc',
  'faction_arc',
  'foreshadowing_arc',
  'foreshadowing',
  'rule',
  'location',
  'timeline',
  'chapter',
]

const storylineNodeTypes = new Set(['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc'])

const graphModeOptions = [
  { label: '全部', value: 'all' },
  { label: '角色中心', value: 'character' },
  { label: '剧情线', value: 'storyline' },
  { label: '风险', value: 'risk' },
]

function nodeKindKey(node: SettingRelationshipNode) {
  if (node.kind === 'chapter') return 'chapter'
  return String(node.entity_type || 'rule')
}

function typeLabel(type?: string) {
  return typeLabels[String(type || '')] || String(type || '资产')
}

function nodeColor(type?: string) {
  const key = String(type || '')
  if (key === 'character') return { border: '#91caff', background: '#e6f4ff' }
  if (key === 'ability') return { border: '#ffd591', background: '#fff7e6' }
  if (key === 'realm') return { border: '#b7eb8f', background: '#f6ffed' }
  if (key === 'faction') return { border: '#adc6ff', background: '#f0f5ff' }
  if (key === 'item') return { border: '#d3adf7', background: '#f9f0ff' }
  if (key.includes('arc') || key === 'mainline' || key === 'subplot') return { border: '#87e8de', background: '#e6fffb' }
  if (key === 'chapter') return { border: '#d9d9d9', background: '#ffffff' }
  return { border: '#e5e7eb', background: '#ffffff' }
}

function edgeColor(edge: SettingRelationshipEdge) {
  if (edge.confidence === 'usage') return '#1677ff'
  if (edge.confidence === 'explicit') return '#0891b2'
  return '#94a3b8'
}

function severityColor(severity?: string) {
  if (severity === 'high') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

function diagnosticTypeLabel(type?: string) {
  if (type === 'timeline_conflict') return '时间冲突'
  if (type === 'owner_ability_mismatch') return '归属冲突'
  if (type === 'missing_start_chapter') return '缺开始章节'
  if (type === 'missing_owner') return '缺拥有者'
  if (type === 'dangling_relation') return '引用缺失'
  if (type === 'isolated_key_asset') return '孤立资产'
  return type || '关系诊断'
}

function displayMetadataValue(value: any) {
  const text = displayValue(value)
  return text || '未记录'
}

function displayChapterNo(value: any) {
  const number = Number(value || 0)
  return number > 0 ? `第${number}章` : '未记录'
}

function toggleDetailLabel(detailCollapsed: boolean) {
  return detailCollapsed ? '显示详情' : '隐藏详情'
}

function repairPatchKey(patch: RelationshipRepairPatch) {
  return `${patch.source_id}-${patch.target_id}-${patch.patch_type}`
}

function patchTypeLabel(type: string) {
  const labels: Record<string, string> = {
    related_entity_ids: '显式关联',
    state_owner: '补拥有者',
    state_abilities: '补能力',
    state_realm: '补境界',
    state_faction: '补势力',
    state_relationships: '补人物关系',
    payload_related_characters: '挂角色',
    payload_related_factions: '挂势力',
    payload_related_foreshadowing: '挂伏笔',
  }
  return labels[type] || type
}

function filterGraphByMode(graph: SettingRelationshipGraph, graphMode: GraphMode): SettingRelationshipGraph {
  if (graphMode === 'all') return graph
  const seedIds = new Set<string>()
  const diagnosticEntityIds = new Set(graph.diagnostics.map(item => Number(item.entity_id || 0)).filter(Boolean))
  for (const node of graph.nodes) {
    if (graphMode === 'character' && node.entity_type === 'character') seedIds.add(node.id)
    if (graphMode === 'storyline' && storylineNodeTypes.has(String(node.entity_type || ''))) seedIds.add(node.id)
    if (graphMode === 'risk' && node.entity_id && diagnosticEntityIds.has(Number(node.entity_id))) seedIds.add(node.id)
  }
  if (seedIds.size === 0) return { ...graph, nodes: [], edges: [] }
  const visibleIds = new Set(seedIds)
  for (const edge of graph.edges) {
    if (seedIds.has(edge.source) || seedIds.has(edge.target)) {
      visibleIds.add(edge.source)
      visibleIds.add(edge.target)
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.filter(node => visibleIds.has(node.id)),
    edges: graph.edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  }
}

function buildFlowNodes(graph: SettingRelationshipGraph): Node<AssetNodeData>[] {
  const grouped = new Map<string, SettingRelationshipNode[]>()
  for (const node of graph.nodes) {
    const key = nodeKindKey(node)
    grouped.set(key, [...(grouped.get(key) || []), node])
  }
  const orderedTypes = [
    ...typeOrder.filter(type => grouped.has(type)),
    ...Array.from(grouped.keys()).filter(type => !typeOrder.includes(type)),
  ]
  const laneWidth = 220
  const rowHeight = 112
  const nodes: Node<AssetNodeData>[] = []
  orderedTypes.forEach((type, columnIndex) => {
    const items = grouped.get(type) || []
    items.forEach((node, rowIndex) => {
      const colors = nodeColor(type)
      nodes.push({
        id: node.id,
        type: 'default',
        position: {
          x: 28 + columnIndex * laneWidth,
          y: 36 + rowIndex * rowHeight,
        },
        data: {
          source: node,
          label: (
            <div className="setting-asset-graph-node">
              <strong>{displayPreview(node.name, 18)}</strong>
              <span>{typeLabel(type)}</span>
            </div>
          ),
        },
        style: {
          width: 176,
          minHeight: 72,
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: colors.background,
          color: '#0f172a',
          fontSize: 12,
          padding: 8,
        },
      })
    })
  })
  return nodes
}

function buildFlowEdges(graph: SettingRelationshipGraph): Edge[] {
  return graph.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.confidence === 'usage',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: edgeColor(edge), strokeWidth: edge.confidence === 'usage' ? 2 : 1.4 },
    labelStyle: { fill: '#475569', fontSize: 10 },
    data: edge,
  }))
}

function findRelatedNode(graph: SettingRelationshipGraph, nodeId: string) {
  return graph.nodes.find(node => node.id === nodeId)
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="setting-asset-graph-detail-row">
      <Text type="secondary">{label}</Text>
      <Text>{displayMetadataValue(value)}</Text>
    </div>
  )
}

export function SettingAssetGraphPanel({ projectId, selectedModelId }: { projectId: number; selectedModelId?: number }) {
  const [graph, setGraph] = useState<SettingRelationshipGraph>(EMPTY_GRAPH)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [graphMode, setGraphMode] = useState<GraphMode>('all')
  const [graphExpandedOpen, setGraphExpandedOpen] = useState(false)
  const [graphDetailCollapsed, setGraphDetailCollapsed] = useState(false)
  const [modalGraphDetailCollapsed, setModalGraphDetailCollapsed] = useState(false)
  const [repairModalOpen, setRepairModalOpen] = useState(false)
  const [repairLoading, setRepairLoading] = useState(false)
  const [repairApplying, setRepairApplying] = useState(false)
  const [repairPatches, setRepairPatches] = useState<RelationshipRepairPatch[]>([])
  const [selectedRepairPatchKeys, setSelectedRepairPatchKeys] = useState<string[]>([])
  const [nodes, setNodes, onNodesChange] = useNodesState<AssetNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const loadGraph = React.useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/settings/relationship-graph`)
      setGraph({
        ...EMPTY_GRAPH,
        ...(res.data || {}),
        summary: { ...EMPTY_GRAPH.summary, ...(res.data?.summary || {}) },
      })
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '资产关系图谱加载失败')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  const filteredGraph = useMemo(() => filterGraphByMode(graph, graphMode), [graph, graphMode])
  const flowNodes = useMemo(() => buildFlowNodes(filteredGraph), [filteredGraph])
  const flowEdges = useMemo(() => buildFlowEdges(filteredGraph), [filteredGraph])
  const selectedNode = graph.nodes.find(node => node.id === selectedNodeId) || filteredGraph.nodes[0] || graph.nodes[0] || null
  const assetSelectOptions = useMemo(() => graph.nodes
    .filter(node => node.kind === 'setting')
    .map(node => ({
      value: node.id,
      label: `${node.name} · ${typeLabel(node.entity_type)}`,
    })), [graph.nodes])
  const connectedEdges = selectedNode
    ? graph.edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
    : []
  const storylineRelations = selectedNode
    ? connectedEdges
      .filter(edge => edge.relation_type === 'in_storyline')
      .map(edge => findRelatedNode(graph, edge.source === selectedNode.id ? edge.target : edge.source)?.name)
      .filter(Boolean)
    : []
  const selectedStateChanges = selectedNode
    ? connectedEdges.flatMap(edge => (edge.state_changes || []).map(change => ({ edge, change })))
    : []

  useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
    if (flowNodes.length > 0 && !flowNodes.some(node => node.id === selectedNodeId)) {
      setSelectedNodeId(flowNodes[0].id)
    }
    if (flowNodes.length === 0) setSelectedNodeId('')
  }, [flowNodes, flowEdges, selectedNodeId, setEdges, setNodes])

  const suggestRelationshipRepair = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setRepairLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/settings/relationship-repair/suggest`, {
        model_id: selectedModelId,
      })
      const patches = Array.isArray(res.data?.patches) ? res.data.patches : []
      setRepairPatches(patches)
      const preferredKeys = patches
        .filter((patch: RelationshipRepairPatch) => Number(patch.confidence || 0) >= 0.7)
        .map(repairPatchKey)
      setSelectedRepairPatchKeys(preferredKeys.length ? preferredKeys : patches.map(repairPatchKey))
      setRepairModalOpen(true)
      message.success(`模型建议 ${patches.length} 条关系补丁`)
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || '模型挂钩孤立资产失败')
    } finally {
      setRepairLoading(false)
    }
  }

  const applySelectedRelationshipPatches = async () => {
    const patches = repairPatches.filter(patch => selectedRepairPatchKeys.includes(repairPatchKey(patch)))
    if (patches.length === 0) return message.warning('请先选择要应用的关系补丁')
    setRepairApplying(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/settings/relationship-repair/apply`, {
        patches,
      })
      message.success(`已应用 ${res.data?.total || 0} 条关系补丁`)
      setRepairModalOpen(false)
      setRepairPatches([])
      setSelectedRepairPatchKeys([])
      await loadGraph()
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || '应用关系补丁失败')
    } finally {
      setRepairApplying(false)
    }
  }

  const renderGraphCanvas = (expanded = false) => (
    <div className={`setting-asset-graph-canvas ${expanded ? 'setting-asset-graph-modal-canvas' : ''}`}>
      <Spin spinning={loading}>
        {nodes.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无设定资产关系" />
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              minZoom={0.25}
              maxZoom={1.6}
            >
              <MiniMap pannable zoomable nodeStrokeWidth={2} />
              <Controls />
              <Background gap={18} color="#e5e7eb" />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </Spin>
    </div>
  )

  const renderGraphDetail = (expanded = false) => (
    <aside className={`setting-asset-graph-detail ${expanded ? 'setting-asset-graph-modal-detail' : ''}`}>
      {selectedNode ? (
        <>
          <div className="setting-asset-graph-detail-title">
            <Text strong>{selectedNode.name}</Text>
            <Tag>{typeLabel(selectedNode.kind === 'chapter' ? 'chapter' : selectedNode.entity_type)}</Tag>
          </div>
          {selectedNode.summary ? <Text type="secondary">{selectedNode.summary}</Text> : null}
          <div className="setting-asset-graph-detail-grid">
            <DetailRow label="年龄" value={selectedNode.metadata?.age} />
            <DetailRow label="境界" value={selectedNode.metadata?.realm} />
            <DetailRow label="能力" value={selectedNode.metadata?.abilities} />
            <DetailRow label="功法" value={selectedNode.metadata?.techniques} />
            <DetailRow label="势力" value={selectedNode.metadata?.faction} />
            <DetailRow label="剧情线" value={storylineRelations} />
            <DetailRow label="开始章节" value={displayChapterNo(selectedNode.metadata?.first_chapter_no)} />
            <DetailRow label="状态" value={selectedNode.metadata?.status} />
          </div>
          <div className="setting-asset-graph-relations">
            <Text strong>相邻关系</Text>
            {connectedEdges.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相邻关系" />
            ) : (
              <List
                size="small"
                dataSource={connectedEdges}
                renderItem={edge => {
                  const related = findRelatedNode(graph, edge.source === selectedNode.id ? edge.target : edge.source)
                  return (
                    <List.Item>
                      <Space size={6} wrap>
                        <Tag color={edge.confidence === 'usage' ? 'blue' : edge.confidence === 'explicit' ? 'cyan' : 'default'}>{edge.label}</Tag>
                        <Text>{related?.name || '未知资产'}</Text>
                        <Text type="secondary">开始章节 {displayChapterNo(edge.start_chapter_no)}</Text>
                        {edge.status ? <Text type="secondary">关系状态 {edge.status}</Text> : null}
                        {edge.evidence ? <Text type="secondary">证据 {edge.evidence}</Text> : null}
                      </Space>
                    </List.Item>
                  )
                }}
              />
            )}
          </div>
          <div className="setting-asset-graph-timeline">
            <Text strong>状态变化</Text>
            {selectedStateChanges.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无状态变化记录" />
            ) : (
              <List
                size="small"
                dataSource={selectedStateChanges}
                renderItem={({ edge, change }) => {
                  const related = findRelatedNode(graph, edge.source === selectedNode.id ? edge.target : edge.source)
                  return (
                    <List.Item>
                      <Space size={6} direction="vertical" className="setting-asset-graph-change-item">
                        <Space size={6} wrap>
                          <Tag color="blue">{displayChapterNo(change.chapter_no)}</Tag>
                          <Text>{edge.label}</Text>
                          <Text>{related?.name || '未知资产'}</Text>
                          {change.usage_type ? <Text type="secondary">{change.usage_type}</Text> : null}
                        </Space>
                        <Text type="secondary">
                          {displayValue(change.actual_state_change) || displayValue(change.expected_state_change) || change.status || change.note || '状态变化已记录'}
                        </Text>
                      </Space>
                    </List.Item>
                  )
                }}
              />
            )}
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个资产查看详情" />
      )}
    </aside>
  )

  const renderGraphWorkspace = (expanded = false, detailCollapsed = false, onToggleDetail?: () => void) => (
    <div className="setting-asset-graph-workspace">
      <div className="setting-asset-graph-toolbar">
        <Button
          size="small"
          icon={detailCollapsed ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={onToggleDetail}
        >
          {toggleDetailLabel(detailCollapsed)}
        </Button>
      </div>
      <div className={`setting-asset-graph-body ${expanded ? 'setting-asset-graph-modal-body' : ''} ${detailCollapsed ? 'is-detail-collapsed' : ''}`}>
        {renderGraphCanvas(expanded)}
        {!detailCollapsed && renderGraphDetail(expanded)}
      </div>
    </div>
  )

  return (
    <section className="setting-asset-graph-panel">
      <div className="setting-asset-graph-header">
        <div>
          <Space size={8} align="center">
            <BranchesOutlined className="setting-asset-graph-title-icon" />
            <Title level={5}>资产关系图谱</Title>
          </Space>
          <Text type="secondary">
            把角色、能力、境界、势力、剧情线和章节调用连起来，优先暴露会影响正文判断的设定关系。
          </Text>
        </div>
        <Space wrap size={8}>
          <Tag color="blue">资产 {graph.summary.node_count}</Tag>
          <Tag color="cyan">关系 {graph.summary.edge_count}</Tag>
          <Tag color={graph.summary.missing_owner_count ? 'red' : 'green'}>缺拥有者 {graph.summary.missing_owner_count}</Tag>
          <Tag color={graph.summary.missing_start_chapter_count ? 'gold' : 'green'}>缺开始 {graph.summary.missing_start_chapter_count}</Tag>
          <Tag color={graph.summary.timeline_conflict_count ? 'red' : 'green'}>时间冲突 {graph.summary.timeline_conflict_count}</Tag>
          <Tag color={graph.summary.owner_mismatch_count ? 'gold' : 'green'}>归属冲突 {graph.summary.owner_mismatch_count}</Tag>
          <Tooltip title="在大窗口中查看关系图">
            <Button size="small" icon={<FullscreenOutlined />} onClick={() => setGraphExpandedOpen(true)}>大窗口查看</Button>
          </Tooltip>
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadGraph}>刷新</Button>
        </Space>
      </div>

      <div className="setting-asset-graph-controls">
        <Segmented
          size="small"
          value={graphMode}
          options={graphModeOptions}
          onChange={value => setGraphMode(value as GraphMode)}
        />
        <Select
          allowClear
          showSearch
          size="small"
          className="setting-asset-graph-locator"
          placeholder="定位资产"
          optionFilterProp="label"
          value={selectedNodeId || undefined}
          options={assetSelectOptions}
          onChange={value => {
            setSelectedNodeId(value || '')
            if (value) setGraphMode('all')
          }}
        />
      </div>

      {error ? <Alert className="setting-asset-graph-alert" type="error" showIcon message={error} /> : null}

      {renderGraphWorkspace(false, graphDetailCollapsed, () => setGraphDetailCollapsed(value => !value))}

      <div className="setting-asset-graph-diagnostics">
        <div className="setting-asset-graph-diagnostics-header">
          <Space size={8} align="center" wrap>
            <WarningOutlined />
            <Text strong>关系诊断</Text>
            <Tag color="blue">合理性</Tag>
            <Tag color={graph.diagnostics.length ? 'gold' : 'green'}>{graph.diagnostics.length}</Tag>
          </Space>
          <Tooltip title={!selectedModelId ? '请先选择模型' : graph.summary.isolated_key_asset_count ? '让模型生成可审核的资产关系补丁' : '当前没有孤立资产'}>
            <Button
              size="small"
              type="primary"
              ghost
              loading={repairLoading}
              disabled={!selectedModelId || !graph.summary.isolated_key_asset_count}
              onClick={suggestRelationshipRepair}
            >
              模型挂钩孤立资产
            </Button>
          </Tooltip>
        </div>
        {graph.diagnostics.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关系诊断问题" />
        ) : (
          <List
            size="small"
            dataSource={graph.diagnostics}
            renderItem={item => (
              <List.Item>
                <Space size={8} wrap>
                  <Tag>{diagnosticTypeLabel(item.type)}</Tag>
                  <Tag color={severityColor(item.severity)}>{item.severity}</Tag>
                  <Text strong>{item.entity_name || '资产'}</Text>
                  <Text>{item.message}</Text>
                  {item.evidence ? <Text type="secondary">证据 {item.evidence}</Text> : null}
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>

      <Modal
        className="setting-asset-graph-repair-modal"
        title="关系补丁确认"
        open={repairModalOpen}
        width={860}
        okText="应用已选补丁"
        cancelText="取消"
        okButtonProps={{ loading: repairApplying, disabled: selectedRepairPatchKeys.length === 0 }}
        onOk={applySelectedRelationshipPatches}
        onCancel={() => setRepairModalOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="模型只生成候选补丁，应用后才会写入资产字段。"
            description="补丁会写入 related_entity_ids、state_json 或 payload_json，关系图刷新后才会出现新边。"
          />
          <Space size={8} wrap>
            <Checkbox
              checked={repairPatches.length > 0 && selectedRepairPatchKeys.length === repairPatches.length}
              indeterminate={selectedRepairPatchKeys.length > 0 && selectedRepairPatchKeys.length < repairPatches.length}
              onChange={event => setSelectedRepairPatchKeys(event.target.checked ? repairPatches.map(repairPatchKey) : [])}
            >
              全选
            </Checkbox>
            <Tag color="blue" bordered={false}>建议 {repairPatches.length}</Tag>
            <Tag color="green" bordered={false}>已选 {selectedRepairPatchKeys.length}</Tag>
          </Space>
          {repairPatches.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可应用的关系补丁" />
          ) : (
            <List
              size="small"
              dataSource={repairPatches}
              renderItem={patch => {
                const key = repairPatchKey(patch)
                const checked = selectedRepairPatchKeys.includes(key)
                return (
                  <List.Item>
                    <Checkbox
                      checked={checked}
                      onChange={event => {
                        setSelectedRepairPatchKeys(prev => {
                          if (event.target.checked) return prev.includes(key) ? prev : [...prev, key]
                          return prev.filter(item => item !== key)
                        })
                      }}
                    >
                      <Space direction="vertical" size={4} className="setting-asset-graph-repair-item">
                        <Space size={6} wrap>
                          <Tag>{patchTypeLabel(patch.patch_type)}</Tag>
                          <Text strong>{patch.source_name}</Text>
                          <Text type="secondary">→</Text>
                          <Text strong>{patch.target_name}</Text>
                          <Tag color={Number(patch.confidence || 0) >= 0.8 ? 'green' : Number(patch.confidence || 0) >= 0.6 ? 'gold' : 'default'} bordered={false}>
                            置信 {Math.round(Number(patch.confidence || 0) * 100)}%
                          </Tag>
                        </Space>
                        <Text type="secondary">{patch.reason}</Text>
                      </Space>
                    </Checkbox>
                  </List.Item>
                )
              }}
            />
          )}
        </Space>
      </Modal>

      <Modal
        className="setting-asset-graph-modal"
        title="资产关系图谱"
        open={graphExpandedOpen}
        width="min(1280px, 94vw)"
        footer={null}
        onCancel={() => setGraphExpandedOpen(false)}
      >
        {renderGraphWorkspace(true, modalGraphDetailCollapsed, () => setModalGraphDetailCollapsed(value => !value))}
      </Modal>
    </section>
  )
}
