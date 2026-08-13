import type { Edge, Node, XYPosition } from 'reactflow'
import { DEFAULT_NODE_SIZE } from '../constants/nodeDefaults'

type CanvasAssetDropInput = {
  asset: any
  position: XYPosition
  nextId: () => string
  nextEdgeId?: () => string
}

export type CanvasAssetDropPlan = {
  kind: 'node_config' | 'node_template'
  assetName: string
  nodes: Node[]
  edges: Edge[]
}

function defaultEdgeId() {
  return `edge_${Date.now()}_${Math.floor(Math.random() * 10000)}`
}

export function buildCanvasAssetDropPlan(input: CanvasAssetDropInput): CanvasAssetDropPlan | null {
  const { asset, position, nextId } = input
  if (!asset || (asset.type !== 'node_config' && asset.type !== 'node_template')) return null

  if (asset.type === 'node_config') {
    const { nodeType, config } = asset.data || {}
    if (!nodeType) return null
    return {
      kind: 'node_config',
      assetName: asset.name || nodeType,
      nodes: [{
        id: nextId(),
        type: nodeType,
        position,
        data: { ...(config || {}), label: asset.name || config?.label || nodeType },
        style: { ...DEFAULT_NODE_SIZE },
      }],
      edges: [],
    }
  }

  const { nodes: tplNodes, edges: tplEdges } = asset.data || {}
  if (!Array.isArray(tplNodes) || tplNodes.length === 0) return null

  const nextEdgeId = input.nextEdgeId || defaultEdgeId
  const rawPositions = tplNodes
    .filter((templateNode: any) => !templateNode?.relativePosition && templateNode?.position)
    .map((templateNode: any) => templateNode.position)
  const fallbackOrigin = rawPositions.length
    ? {
      x: Math.min(...rawPositions.map((raw: any) => Number(raw?.x) || 0)),
      y: Math.min(...rawPositions.map((raw: any) => Number(raw?.y) || 0)),
    }
    : { x: 0, y: 0 }
  const idMap: Record<string, string> = {}
  const nodes: Node[] = tplNodes.map((templateNode: any, index: number) => {
    const id = nextId()
    idMap[String(index)] = id
    if (templateNode?.id !== undefined && templateNode?.id !== null) {
      idMap[String(templateNode.id)] = id
    }
    const relativePosition = templateNode.relativePosition || (templateNode.position
      ? {
        x: (Number(templateNode.position.x) || 0) - fallbackOrigin.x,
        y: (Number(templateNode.position.y) || 0) - fallbackOrigin.y,
      }
      : { x: 0, y: 0 })
    return {
      id,
      type: templateNode.type,
      position: {
        x: position.x + (relativePosition.x || 0),
        y: position.y + (relativePosition.y || 0),
      },
      data: { ...(templateNode.config || {}), label: templateNode.config?.label || templateNode.type },
      style: { ...DEFAULT_NODE_SIZE },
    }
  })
  const edges: Edge[] = Array.isArray(tplEdges)
    ? tplEdges.flatMap((templateEdge: any) => {
      const sourceKey = templateEdge.sourceIndex ?? templateEdge.source
      const targetKey = templateEdge.targetIndex ?? templateEdge.target
      const source = sourceKey === undefined || sourceKey === null ? undefined : idMap[String(sourceKey)]
      const target = targetKey === undefined || targetKey === null ? undefined : idMap[String(targetKey)]
      if (!source || !target) return []
      return [{
        id: nextEdgeId(),
        source,
        target,
        sourceHandle: templateEdge.sourceHandle,
        targetHandle: templateEdge.targetHandle,
      }]
    })
    : []

  return {
    kind: 'node_template',
    assetName: asset.name || '节点模板',
    nodes,
    edges,
  }
}
