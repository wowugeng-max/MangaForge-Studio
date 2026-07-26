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
