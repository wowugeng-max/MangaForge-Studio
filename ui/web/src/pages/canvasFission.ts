type CanvasStoreLike = {
  getState(): {
    nodes: any[]
    edges: any[]
    executeFission: (sourceNodeId: string, items: any[]) => string[]
    updateNodeData: (id: string, data: any) => void
  }
}

export type FissionExpansionOutcome = {
  expanded: boolean
  reason?: 'already_expanded' | 'no_downstream'
}

export function expandFissionAndDistribute(input: { nodeId: string; items: any[]; store: CanvasStoreLike }): FissionExpansionOutcome {
  const state = input.store.getState()
  if (state.nodes.some(node => node.data?._fissionSource === input.nodeId)) {
    return { expanded: false, reason: 'already_expanded' }
  }
  const directTargets = state.edges.filter(edge => edge.source === input.nodeId).map(edge => edge.target)
  if (directTargets.length === 0) {
    return { expanded: false, reason: 'no_downstream' }
  }

  const clonedRootIds = state.executeFission(input.nodeId, input.items)
  const after = input.store.getState()
  directTargets.forEach(targetId => {
    after.updateNodeData(targetId, { incoming_data: input.items[0] })
  })
  for (let index = 1; index < clonedRootIds.length; index += 1) {
    after.updateNodeData(clonedRootIds[index], { incoming_data: input.items[index] })
  }
  return { expanded: true }
}
