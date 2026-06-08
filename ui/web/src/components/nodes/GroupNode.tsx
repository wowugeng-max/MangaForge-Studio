import React from 'react'
import { Handle, NodeResizer, Position, type Edge, type Node, type NodeProps, useReactFlow } from 'reactflow'
import { Input, Tag, Tooltip, Typography, message } from 'antd'
import {
  CompressOutlined,
  ExpandOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import apiClient from '../../api/client'

const { Text } = Typography

const GROUP_COLLAPSED_WIDTH = 220
const GROUP_COLLAPSED_HEIGHT = 50
const DEFAULT_EXPANDED_WIDTH = 500
const DEFAULT_EXPANDED_HEIGHT = 400

type GroupNodeStatus = 'idle' | 'running' | 'success' | 'error'

type BuildGroupTemplateInput = {
  groupId: string
  groupLabel?: string
  projectId?: number | null
  nodes: Node[]
  edges: Edge[]
}

const RUNTIME_DATA_KEYS = new Set(['result', 'incoming_data', '_runSignal', '_fissionIndex', '_fissionSource'])

function stripRuntimeNodeData(data: any) {
  const config: Record<string, any> = {}
  Object.entries(data || {}).forEach(([key, value]) => {
    if (!RUNTIME_DATA_KEYS.has(key)) config[key] = value
  })
  return config
}

function readGroupNodeOutput(node: Node | undefined) {
  if (!node) return undefined
  return node.data?.result || node.data?.asset?.data || node.data?.incoming_data
}

function getNodeSize(node: Node | undefined) {
  return {
    width: Number(node?.style?.width || node?.width || DEFAULT_EXPANDED_WIDTH),
    height: Number(node?.style?.height || node?.height || DEFAULT_EXPANDED_HEIGHT),
  }
}

export function buildGroupCollapseNodes(nodes: Node[], groupId: string) {
  const groupNode = nodes.find(node => node.id === groupId && node.type === 'nodeGroup')
  if (!groupNode) return nodes

  const collapsed = Boolean(groupNode.data?._collapsed)
  if (!collapsed) {
    const expandedSize = getNodeSize(groupNode)
    return nodes.map(node => {
      if (node.id === groupId) {
        return {
          ...node,
          style: { ...node.style, width: GROUP_COLLAPSED_WIDTH, height: GROUP_COLLAPSED_HEIGHT },
          data: { ...(node.data || {}), _collapsed: true, _expandedSize: expandedSize },
        }
      }
      if (node.parentNode === groupId) return { ...node, hidden: true }
      return node
    })
  }

  const size = groupNode.data?._expandedSize || getNodeSize(groupNode)
  return nodes.map(node => {
    if (node.id === groupId) {
      return {
        ...node,
        style: { ...node.style, width: size.width, height: size.height },
        data: { ...(node.data || {}), _collapsed: false },
      }
    }
    if (node.parentNode === groupId) return { ...node, hidden: false }
    return node
  })
}

export function buildGroupMutePatches(nodes: Node[], groupId: string) {
  const groupNode = nodes.find(node => node.id === groupId && node.type === 'nodeGroup')
  const nextMuted = !Boolean(groupNode?.data?._muted)
  const patches: Record<string, { _muted: boolean }> = {}
  if (groupNode) patches[groupId] = { _muted: nextMuted }
  nodes.filter(node => node.parentNode === groupId).forEach(node => {
    patches[node.id] = { _muted: nextMuted }
  })
  return patches
}

export function buildGroupRunTickPlan(input: {
  groupId: string
  nodes: Node[]
  edges: Edge[]
  nodeRunStatus: Record<string, GroupNodeStatus | undefined>
  now?: number
}) {
  const childIds = input.nodes.filter(node => node.parentNode === input.groupId).map(node => node.id)
  const childSet = new Set(childIds)
  const now = input.now ?? Date.now()
  const statusPatches: Record<string, GroupNodeStatus> = {}
  const dataPatches: Record<string, Record<string, any>> = {}

  if (childIds.length === 0) {
    return { statusPatches, dataPatches, groupPatch: { _isGroupRunning: false } }
  }

  let allDone = true
  let hasError = false
  let hasRunning = false
  childIds.forEach(childId => {
    const status = input.nodeRunStatus[childId] || 'idle'
    if (status === 'error') hasError = true
    if (status === 'running') hasRunning = true
    if (status !== 'success') allDone = false
  })

  if (hasError || allDone) {
    return { statusPatches, dataPatches, groupPatch: { _isGroupRunning: false } }
  }

  let waitingOnRunningDependency = false
  childIds.forEach(childId => {
    const status = input.nodeRunStatus[childId] || 'idle'
    if (status !== 'idle') return
    const childNode = input.nodes.find(node => node.id === childId)

    if (childNode?.data?._muted) {
      statusPatches[childId] = 'success'
      const inEdges = input.edges.filter(edge => edge.target === childId)
      const outEdges = input.edges.filter(edge => edge.source === childId)
      if (inEdges.length > 0 && outEdges.length > 0) {
        const sourceNode = input.nodes.find(node => node.id === inEdges[0].source)
        const passthrough = readGroupNodeOutput(sourceNode)
        if (passthrough) {
          outEdges.forEach(edge => {
            dataPatches[edge.target] = { incoming_data: passthrough }
          })
        }
      }
      return
    }

    const incomingEdges = input.edges.filter(edge => edge.target === childId)
    const ready = incomingEdges.every(edge => {
      const dependencyStatus = input.nodeRunStatus[edge.source] || 'idle'
      if (dependencyStatus === 'running') waitingOnRunningDependency = true
      if (childSet.has(edge.source)) return dependencyStatus === 'success'
      return dependencyStatus === 'success'
    })
    if (!ready) return

    statusPatches[childId] = 'running'
    dataPatches[childId] = { _runSignal: now }
  })

  if (!Object.keys(statusPatches).length && !hasRunning && !waitingOnRunningDependency) {
    return { statusPatches, dataPatches, groupPatch: { _isGroupRunning: false } }
  }

  return { statusPatches, dataPatches, groupPatch: null }
}

export function buildGroupTemplateAssetPayload(input: BuildGroupTemplateInput) {
  const childNodes = input.nodes.filter(node => node.parentNode === input.groupId)
  if (!childNodes.length) return null

  const idToIndex: Record<string, number> = {}
  const templateNodes = childNodes.map((node, index) => {
    idToIndex[node.id] = index
    return {
      type: node.type,
      relativePosition: node.position,
      config: stripRuntimeNodeData(node.data),
    }
  })
  const childIds = new Set(childNodes.map(node => node.id))
  const templateEdges = input.edges
    .filter(edge => childIds.has(edge.source) && childIds.has(edge.target))
    .map(edge => ({
      sourceIndex: idToIndex[edge.source],
      targetIndex: idToIndex[edge.target],
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    }))

  return {
    type: 'node_template',
    name: input.groupLabel || '节点模板',
    description: `包含 ${childNodes.length} 个节点的模板`,
    tags: ['NodeTemplate'],
    data: { nodes: templateNodes, edges: templateEdges },
    project_id: input.projectId ?? null,
  }
}

function GroupNodeImpl({ id, data, selected }: NodeProps) {
  const { id: routeProjectId } = useParams<{ id: string }>()
  const { nodes, edges, updateNodeData, nodeRunStatus, setNodeStatus, isGlobalRunning } = useCanvasStore()
  const { setNodes } = useReactFlow()
  const fetchAssets = useAssetLibraryStore(state => state.fetchAssets)
  const [savingTemplate, setSavingTemplate] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editLabel, setEditLabel] = React.useState('')
  const inputRef = React.useRef<any>(null)
  const childNodes = React.useMemo(() => nodes.filter(node => node.parentNode === id), [nodes, id])
  const childNodeIds = React.useMemo(() => childNodes.map(node => node.id), [childNodes])
  const childCount = childNodeIds.length
  const projectId = Number(routeProjectId || 0) || undefined
  const collapsed = Boolean(data?._collapsed)
  const muted = Boolean(data?._muted)
  const groupRunning = Boolean(data?._isGroupRunning)
  const nodeColor = data?.customColor || '#8b5cf6'

  React.useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus({ cursor: 'all' })
  }, [editing])

  const handleLabelDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    setEditLabel(data?.label || '')
    setEditing(true)
  }

  const handleLabelSave = () => {
    const trimmed = editLabel.trim()
    if (trimmed && trimmed !== data?.label) updateNodeData(id, { label: trimmed, _customLabel: true })
    setEditing(false)
  }

  const applyNodeDataPatches = (patches: Record<string, Record<string, any>>) => {
    Object.entries(patches).forEach(([nodeId, patch]) => updateNodeData(nodeId, patch))
  }

  const handleToggleCollapse = (event: React.MouseEvent) => {
    event.stopPropagation()
    setNodes(currentNodes => buildGroupCollapseNodes(currentNodes, id))
  }

  const handleToggleMute = (event?: React.MouseEvent | KeyboardEvent) => {
    event?.preventDefault()
    event?.stopPropagation()
    applyNodeDataPatches(buildGroupMutePatches(nodes, id))
  }

  React.useEffect(() => {
    if (!selected) return undefined
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        handleToggleMute(event)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, handleToggleMute])

  const handleGroupRun = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (muted || isGlobalRunning) return
    if (groupRunning) {
      childNodeIds.forEach(childId => {
        if (nodeRunStatus[childId] === 'running') setNodeStatus(childId, 'error')
      })
      updateNodeData(id, { _isGroupRunning: false })
      return
    }

    childNodeIds.forEach(childId => setNodeStatus(childId, 'idle'))
    updateNodeData(id, { _isGroupRunning: true })
  }

  React.useEffect(() => {
    if (!groupRunning) return
    const plan = buildGroupRunTickPlan({
      groupId: id,
      nodes,
      edges,
      nodeRunStatus: nodeRunStatus as Record<string, GroupNodeStatus | undefined>,
    })
    Object.entries(plan.statusPatches).forEach(([nodeId, status]) => setNodeStatus(nodeId, status))
    applyNodeDataPatches(plan.dataPatches)
    if (plan.groupPatch) updateNodeData(id, plan.groupPatch)
  }, [groupRunning, id, nodes, edges, nodeRunStatus, setNodeStatus, updateNodeData])

  const handleSaveTemplate = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const payload = buildGroupTemplateAssetPayload({
      groupId: id,
      groupLabel: data?.label || '节点模板',
      projectId: projectId ?? null,
      nodes,
      edges,
    })
    if (!payload) {
      message.warning('组内没有节点')
      return
    }
    setSavingTemplate(true)
    try {
      await apiClient.post('/assets/', payload)
      await fetchAssets(projectId)
      message.success('节点组已存为模板资产')
    } catch (error: any) {
      message.error(`保存失败: ${error?.response?.data?.error || error?.message || error}`)
    } finally {
      setSavingTemplate(false)
    }
  }

  const borderColor = muted ? '#94a3b8' : nodeColor
  const background = muted ? 'rgba(148,163,184,0.06)' : `${nodeColor}12`

  return <>
    <NodeResizer
      color={nodeColor}
      isVisible={Boolean(selected) && !collapsed}
      minWidth={220}
      minHeight={100}
      handleStyle={{ width: 10, height: 10, borderRadius: 2, border: 'none', background: nodeColor }}
    />
    <div
      style={{
        width: '100%',
        height: '100%',
        minWidth: 220,
        minHeight: collapsed ? GROUP_COLLAPSED_HEIGHT : 100,
        background,
        border: `2px ${muted ? 'dashed' : 'solid'} ${borderColor}`,
        borderRadius: 12,
        opacity: muted ? 0.62 : 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: groupRunning ? '0 0 18px rgba(16,185,129,0.35)' : '0 10px 28px rgba(15,23,42,0.06)',
        transition: 'border-color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div
        className="custom-drag-handle"
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `${nodeColor}16`,
          borderBottom: collapsed ? 'none' : `1px solid ${nodeColor}30`,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          cursor: 'grab',
          minHeight: GROUP_COLLAPSED_HEIGHT,
        }}
      >
        {editing ? (
          <Input
            ref={inputRef}
            className="nodrag"
            size="small"
            value={editLabel}
            onChange={event => setEditLabel(event.target.value)}
            onPressEnter={handleLabelSave}
            onBlur={handleLabelSave}
            style={{ fontSize: 13, fontWeight: 700, padding: '0 4px', height: 24, width: 140 }}
          />
        ) : (
          <Text
            onDoubleClick={handleLabelDoubleClick}
            style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', cursor: 'text', userSelect: 'none' }}
          >
            {data?.label || '节点组'} <span style={{ fontWeight: 400, color: '#64748b', fontSize: 11 }}>({childCount})</span>
          </Text>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {muted && <Tag color="default" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>MUTED</Tag>}
          <Tooltip title="存为节点模板资产">
            <div
              className="nodrag"
              onClick={handleSaveTemplate}
              aria-label="存为节点模板资产"
              style={{ cursor: savingTemplate ? 'wait' : 'pointer', padding: '2px 4px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <SaveOutlined style={{ color: savingTemplate ? '#0ea5e9' : '#64748b', fontSize: 12 }} />
            </div>
          </Tooltip>
          <Tooltip title={muted ? '取消静音' : '静音旁路'}>
            <div
              className="nodrag"
              onClick={handleToggleMute}
              style={{ cursor: 'pointer', padding: '2px 4px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}
            >
              {muted ? <EyeInvisibleOutlined style={{ color: '#94a3b8', fontSize: 12 }} /> : <EyeOutlined style={{ color: '#64748b', fontSize: 12 }} />}
            </div>
          </Tooltip>
          <Tooltip title={muted ? '静音中，无法运行' : groupRunning ? '停止组运行' : '运行本组'}>
            <div
              className="nodrag"
              onClick={handleGroupRun}
              style={{
                cursor: (isGlobalRunning || muted) ? 'not-allowed' : 'pointer',
                opacity: (isGlobalRunning || muted) ? 0.4 : 1,
                padding: '2px 4px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: 4,
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {groupRunning ? <StopOutlined style={{ color: '#ef4444', fontSize: 12 }} /> : <PlayCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />}
            </div>
          </Tooltip>
          <Tooltip title={collapsed ? '展开' : '折叠'}>
            <div
              className="nodrag"
              onClick={handleToggleCollapse}
              style={{ cursor: 'pointer', padding: '2px 4px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}
            >
              {collapsed ? <ExpandOutlined style={{ color: '#64748b', fontSize: 12 }} /> : <CompressOutlined style={{ color: '#64748b', fontSize: 12 }} />}
            </div>
          </Tooltip>
        </div>
      </div>

      {collapsed && (
        <div style={{ padding: '0 12px 8px', fontSize: 12, color: '#64748b' }}>
          包含 {childCount} 个节点
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: nodeColor }} />
      <Handle type="source" position={Position.Right} style={{ background: nodeColor }} />
    </div>
  </>
}

nodeRegistry.register({
  type: 'nodeGroup',
  displayName: '节点组',
  component: GroupNodeImpl,
  defaultData: { label: '节点组', _collapsed: false, _muted: false, _isGroupRunning: false },
})
export default GroupNodeImpl
