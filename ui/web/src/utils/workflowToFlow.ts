import type { Edge, Node } from 'reactflow'

export interface WorkflowNodeData {
  class_type: string
  inputs: Record<string, any>
  _meta?: { title?: string; node?: { x?: number; y?: number } }
}

function fallbackPosition(index: number) {
  const columns = 4
  return {
    x: (index % columns) * 260,
    y: Math.floor(index / columns) * 180,
  }
}

function resolveNodePosition(nodeData: WorkflowNodeData, index: number) {
  const fallback = fallbackPosition(index)
  const metaPosition = nodeData._meta?.node
  const x = Number(metaPosition?.x)
  const y = Number(metaPosition?.y)
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
  }
}

export function workflowToFlow(workflowJson: Record<string, WorkflowNodeData>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  Object.entries(workflowJson).forEach(([nodeId, nodeData], index) => {
    const pos = resolveNodePosition(nodeData, index)
    nodes.push({
      id: nodeId,
      type: 'customNode',
      position: pos,
      data: {
        label: nodeData._meta?.title || nodeData.class_type,
        ...nodeData,
      },
    })
  })

  const traverse = (obj: any, targetNodeId: string, targetPath: string[]) => {
    const sourceId = Array.isArray(obj) && (typeof obj[0] === 'string' || typeof obj[0] === 'number')
      ? String(obj[0])
      : ''
    if (Array.isArray(obj) && obj.length >= 2 && sourceId && Object.prototype.hasOwnProperty.call(workflowJson, sourceId)) {
      const sourceHandle = obj[1]
      edges.push({
        id: `${sourceId}-${targetNodeId}-${targetPath.join('-')}`,
        source: sourceId,
        target: targetNodeId,
        sourceHandle: `output-${sourceHandle}`,
        targetHandle: targetPath.join('.'),
      })
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => traverse(value, targetNodeId, [...targetPath, key]))
    }
  }

  Object.entries(workflowJson).forEach(([nodeId, nodeData]) => traverse(nodeData.inputs, nodeId, []))
  return { nodes, edges }
}
