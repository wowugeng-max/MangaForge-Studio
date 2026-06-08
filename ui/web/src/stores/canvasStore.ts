import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from 'reactflow'
import { computeBoundingBox, toAbsolutePosition, toRelativePosition } from '../utils/groupUtils'

type NodeStatus = 'idle' | 'running' | 'success' | 'error'

type History = { nodes: Node[]; edges: Edge[] }

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  past: History[]
  future: History[]
  isGlobalRunning: boolean
  nodeRunStatus: Record<string, NodeStatus>
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setCanvasData: (nodes: Node[], edges: Edge[]) => void
  clearCanvas: () => void
  addNode: (node: Node) => void
  updateNodeData: (id: string, data: any) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  saveHistory: () => void
  undo: () => void
  redo: () => void
  setGlobalRunning: (isRunning: boolean) => void
  setNodeStatus: (id: string, status: NodeStatus) => void
  resetAllNodeStatus: (currentNodes: Node[]) => void
  smartResetNodeStatus: (currentNodes: Node[]) => void
  executeFission: (sourceNodeId: string, items: any[]) => string[]
  createGroup: (selectedNodeIds: string[], label?: string) => string
  dissolveGroup: (groupId: string) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  past: [],
  future: [],
  isGlobalRunning: false,
  nodeRunStatus: {},

  setNodes: nodes => set({ nodes }),
  setEdges: edges => set({ edges }),
  setCanvasData: (nodes, edges) => {
    const sorted = [...nodes].sort((a, b) => {
      if (a.type === 'nodeGroup' && b.parentNode === a.id) return -1
      if (b.type === 'nodeGroup' && a.parentNode === b.id) return 1
      return 0
    })
    set({ nodes: sorted, edges, past: [], future: [], nodeRunStatus: {}, isGlobalRunning: false })
  },
  clearCanvas: () => {
    get().saveHistory()
    set({ nodes: [], edges: [], nodeRunStatus: {} })
  },
  addNode: node => {
    get().saveHistory()
    set(state => ({ nodes: [...state.nodes, node] }))
  },
  updateNodeData: (id, data) => set(state => ({ nodes: state.nodes.map(node => node.id === id ? { ...node, data: { ...(node.data as any), ...data } } : node) })),
  onNodesChange: changes => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: changes => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: connection => {
    get().saveHistory()
    set({ edges: addEdge(connection, get().edges) })
    const sourceNode = get().nodes.find(node => node.id === connection.source)
    if (!sourceNode || !connection.target) return
    const fluidData = sourceNode.data?.result || sourceNode.data?.asset?.data || sourceNode.data?.incoming_data
    if (!fluidData) return
    get().updateNodeData(connection.target, { incoming_data: fluidData })
  },
  saveHistory: () => set(state => ({ past: [...state.past, { nodes: state.nodes, edges: state.edges }], future: [] })),
  undo: () => {
    const { past, nodes, edges } = get()
    if (!past.length) return
    const previous = past[past.length - 1]
    set({ nodes: previous.nodes, edges: previous.edges, past: past.slice(0, -1), future: [{ nodes, edges }, ...get().future] })
  },
  redo: () => {
    const { future, nodes, edges } = get()
    if (!future.length) return
    const next = future[0]
    set({ nodes: next.nodes, edges: next.edges, past: [...get().past, { nodes, edges }], future: future.slice(1) })
  },
  setGlobalRunning: isGlobalRunning => set({ isGlobalRunning }),
  setNodeStatus: (id, status) => set(state => ({ nodeRunStatus: { ...state.nodeRunStatus, [id]: status } })),
  resetAllNodeStatus: currentNodes => set({ nodeRunStatus: Object.fromEntries(currentNodes.filter(n => n.type !== 'nodeGroup').map(n => [n.id, 'idle'])) as Record<string, NodeStatus> }),
  smartResetNodeStatus: currentNodes => set(state => {
    const next = { ...state.nodeRunStatus }
    currentNodes.filter(n => n.type !== 'nodeGroup').forEach(n => { if (next[n.id] !== 'success') next[n.id] = 'idle' })
    return { nodeRunStatus: next }
  }),
  executeFission: (sourceNodeId, items) => {
    const state = get()
    const { nodes, edges } = state
    const count = Array.isArray(items) ? items.length : 0
    if (count === 0) return []

    const downstreamEdges = edges.filter(edge => edge.source === sourceNodeId)
    if (downstreamEdges.length === 0) return []

    state.saveHistory()

    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    const branchRootIds: string[] = []

    for (const downEdge of downstreamEdges) {
      const templateId = downEdge.target
      const templateNode = nodes.find(node => node.id === templateId)
      if (!templateNode) continue

      const subtreeIds: string[] = [templateId]
      const queue = [templateId]
      while (queue.length > 0) {
        const current = queue.shift()!
        edges.filter(edge => edge.source === current).forEach(edge => {
          if (!subtreeIds.includes(edge.target)) {
            subtreeIds.push(edge.target)
            queue.push(edge.target)
          }
        })
      }

      const subtreeEdges = edges.filter(edge => subtreeIds.includes(edge.source) && subtreeIds.includes(edge.target))

      for (let index = 0; index < count; index += 1) {
        if (index === 0) {
          branchRootIds.push(templateId)
          continue
        }

        const stamp = Date.now()
        const random = Math.floor(Math.random() * 10000)
        const idMap: Record<string, string> = {}

        for (const originalId of subtreeIds) {
          const original = nodes.find(node => node.id === originalId)
          if (!original) continue
          const clonedId = `${originalId}_f${index}_${stamp}_${random}`
          idMap[originalId] = clonedId
          newNodes.push({
            ...original,
            id: clonedId,
            position: {
              x: original.position.x,
              y: original.position.y + index * 220,
            },
            data: {
              ...(original.data as any),
              _fissionIndex: index,
              _fissionSource: sourceNodeId,
              result: undefined,
              incoming_data: undefined,
              _runSignal: undefined,
            },
            selected: false,
          })
        }

        for (const originalEdge of subtreeEdges) {
          const clonedSource = idMap[originalEdge.source]
          const clonedTarget = idMap[originalEdge.target]
          if (!clonedSource || !clonedTarget) continue
          newEdges.push({
            ...originalEdge,
            id: `${originalEdge.id}_f${index}_${stamp}_${random}`,
            source: clonedSource,
            target: clonedTarget,
          })
        }

        const clonedRootId = idMap[templateId]
        if (clonedRootId) {
          branchRootIds.push(clonedRootId)
          newEdges.push({
            id: `fission_edge_${index}_${stamp}_${random}`,
            source: sourceNodeId,
            sourceHandle: downEdge.sourceHandle,
            target: clonedRootId,
            targetHandle: downEdge.targetHandle,
          })
        }
      }
    }

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
      nodeRunStatus: {
        ...state.nodeRunStatus,
        ...Object.fromEntries(newNodes.map(node => [node.id, 'idle' as NodeStatus])),
      },
    })

    return branchRootIds
  },
  createGroup: (selectedNodeIds, label = '节点组') => {
    const state = get()
    const selectedNodes = state.nodes.filter(node => selectedNodeIds.includes(node.id))
    if (selectedNodes.length < 2) return ''
    if (selectedNodes.some(node => node.parentNode)) return ''

    state.saveHistory()
    const bbox = computeBoundingBox(selectedNodes)
    const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const groupNode: Node = {
      id: groupId,
      type: 'nodeGroup',
      position: { x: bbox.x, y: bbox.y },
      style: { width: bbox.width, height: bbox.height },
      data: { label, _collapsed: false, _muted: false, _isGroupRunning: false },
      dragHandle: '.custom-drag-handle',
    }
    const updatedNodes = state.nodes.map(node => {
      if (!selectedNodeIds.includes(node.id)) return node
      return {
        ...node,
        parentNode: groupId,
        extent: 'parent' as const,
        expandParent: true,
        position: toRelativePosition(node.position, { x: bbox.x, y: bbox.y }),
      }
    })
    const others = updatedNodes.filter(node => !selectedNodeIds.includes(node.id))
    const children = updatedNodes.filter(node => selectedNodeIds.includes(node.id))
    set({ nodes: [groupNode, ...others, ...children] })
    return groupId
  },
  dissolveGroup: groupId => {
    const state = get()
    const groupNode = state.nodes.find(node => node.id === groupId && node.type === 'nodeGroup')
    if (!groupNode) return

    state.saveHistory()
    const groupPosition = groupNode.position
    const updatedNodes = state.nodes
      .filter(node => node.id !== groupId)
      .map(node => {
        if (node.parentNode !== groupId) return node
        const { parentNode, extent, expandParent, ...rest } = node as any
        return {
          ...rest,
          position: toAbsolutePosition(node.position, groupPosition),
          hidden: false,
          data: { ...(rest.data || {}), _muted: false },
        }
      })
    set({ nodes: updatedNodes })
  },
}))
