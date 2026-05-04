import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from 'reactflow'

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
  setCanvasData: (nodes, edges) => set({ nodes, edges, past: [], future: [] }),
  addNode: node => set(state => ({ nodes: [...state.nodes, node] })),
  updateNodeData: (id, data) => set(state => ({ nodes: state.nodes.map(node => node.id === id ? { ...node, data: { ...(node.data as any), ...data } } : node) })),
  onNodesChange: changes => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: changes => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: connection => set({ edges: addEdge(connection, get().edges) }),
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
  createGroup: () => '',
  dissolveGroup: () => undefined,
}))
