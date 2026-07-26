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
