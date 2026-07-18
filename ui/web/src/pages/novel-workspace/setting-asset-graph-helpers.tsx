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

export function typeLabel(type?: string) {
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

export function severityColor(severity?: string) {
  if (severity === 'high') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

export function diagnosticTypeLabel(type?: string) {
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

export function displayChapterNo(value: any) {
  const number = Number(value || 0)
  return number > 0 ? `第${number}章` : '未记录'
}

export function toggleDetailLabel(detailCollapsed: boolean) {
  return detailCollapsed ? '显示详情' : '隐藏详情'
}

export function repairPatchKey(patch: RelationshipRepairPatch) {
  return `${patch.source_id}-${patch.target_id}-${patch.patch_type}`
}

export function patchTypeLabel(type: string) {
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

export function filterGraphByMode(graph: SettingRelationshipGraph, graphMode: GraphMode): SettingRelationshipGraph {
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

export function buildFlowNodes(graph: SettingRelationshipGraph): Node<AssetNodeData>[] {
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

export function buildFlowEdges(graph: SettingRelationshipGraph): Edge[] {
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

export function findRelatedNode(graph: SettingRelationshipGraph, nodeId: string) {
  return graph.nodes.find(node => node.id === nodeId)
}

export function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="setting-asset-graph-detail-row">
      <Text type="secondary">{label}</Text>
      <Text>{displayMetadataValue(value)}</Text>
    </div>
  )
}

