import dagre from '@dagrejs/dagre'
import type { Edge, Node } from 'reactflow'

function nodeSize(node: Node) {
  return {
    width: Number((node.style as any)?.width || node.width || 360),
    height: Number((node.style as any)?.height || node.height || 380),
  }
}

export function layoutCanvas(nodes: Node[], edges: Edge[]): Node[] {
  const topLevel = nodes.filter(node => !node.parentNode)
  if (topLevel.length === 0) return nodes

  const parentOf: Record<string, string> = {}
  nodes.forEach(node => { if (node.parentNode) parentOf[node.id] = node.parentNode })
  const toTopLevel = (id: string) => parentOf[id] || id

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 })

  topLevel.forEach(node => {
    const { width, height } = nodeSize(node)
    graph.setNode(node.id, { width, height })
  })
  edges.forEach(edge => {
    const source = toTopLevel(edge.source)
    const target = toTopLevel(edge.target)
    if (source === target) return
    if (!graph.hasNode(source) || !graph.hasNode(target)) return
    graph.setEdge(source, target)
  })

  dagre.layout(graph)

  return nodes.map(node => {
    if (node.parentNode) return node
    const laid = graph.node(node.id)
    if (!laid) return node
    const { width, height } = nodeSize(node)
    return { ...node, position: { x: laid.x - width / 2, y: laid.y - height / 2 } }
  })
}
