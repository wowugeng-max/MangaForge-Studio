import { create } from 'zustand'

type GraphState = {
  selectedNode?: string
  selectedEdge?: string
  sidebarCollapsed: boolean
  setSelectedNode: (id?: string) => void
  setSelectedEdge: (id?: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  clearSelection: () => void
}

export const useGraphStore = create<GraphState>((set) => ({
  selectedNode: undefined,
  selectedEdge: undefined,
  sidebarCollapsed: false,
  setSelectedNode: (id) => set({ selectedNode: id, selectedEdge: undefined }),
  setSelectedEdge: (id) => set({ selectedEdge: id, selectedNode: undefined }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  clearSelection: () => set({ selectedNode: undefined, selectedEdge: undefined }),
}))
