import type { Edge, Node } from 'reactflow'

export type CanvasDagNodeStatus = 'idle' | 'running' | 'success' | 'error'

export type CanvasDagDataUpdate = {
  id: string
  data: Record<string, unknown>
}

export type CanvasDagStepPlan = {
  statusUpdates: Record<string, CanvasDagNodeStatus>
  dataUpdates: CanvasDagDataUpdate[]
  newlyTriggered: boolean
  hasRunning: boolean
  hasError: boolean
  allDone: boolean
  nextTick: number
  stopReason?: 'error' | 'complete' | 'deadlock'
}

type PlanCanvasDagStepInput = {
  nodes: Node[]
  edges: Edge[]
  nodeRunStatus: Record<string, CanvasDagNodeStatus | undefined>
  tick: number
  now?: number
}

function readNodeOutput(node: Node | undefined) {
  if (!node) return undefined
  return node.data?.result || node.data?.asset?.data || node.data?.incoming_data
}

function isMutedNode(node: Node, mutedGroupIds: Set<string>) {
  return Boolean(node.data?._muted || (node.parentNode && mutedGroupIds.has(node.parentNode)))
}

export function planCanvasDagStep(input: PlanCanvasDagStepInput): CanvasDagStepPlan {
  const { nodes, edges, nodeRunStatus, tick } = input
  const now = input.now ?? Date.now()
  const statusUpdates: Record<string, CanvasDagNodeStatus> = {}
  const dataUpdates: CanvasDagDataUpdate[] = []
  const mutedGroupIds = new Set(
    nodes.filter(node => node.type === 'nodeGroup' && node.data?._muted).map(node => node.id)
  )
  const executableNodes = nodes.filter(node => node.type !== 'nodeGroup')
  const hasBlockingError = executableNodes.some(node => {
    if (isMutedNode(node, mutedGroupIds)) return false
    return (nodeRunStatus[node.id] || 'idle') === 'error'
  })

  let allDone = true
  let hasRunning = false
  let newlyTriggered = false

  executableNodes.forEach(node => {
    const status = nodeRunStatus[node.id] || 'idle'
    const muted = isMutedNode(node, mutedGroupIds)

    if (muted) {
      if (status === 'idle') {
        statusUpdates[node.id] = 'success'
        const outEdges = edges.filter(edge => edge.source === node.id)
        const inEdges = edges.filter(edge => edge.target === node.id)
        if (inEdges.length > 0 && outEdges.length > 0) {
          const sourceNode = nodes.find(candidate => candidate.id === inEdges[0].source)
          const passthrough = readNodeOutput(sourceNode)
          if (passthrough) {
            outEdges.forEach(edge => dataUpdates.push({ id: edge.target, data: { incoming_data: passthrough } }))
          }
        }
      }
      return
    }

    if (status === 'running') hasRunning = true
    if (status !== 'success') allDone = false

    if (status !== 'idle') return

    const incomingEdges = edges.filter(edge => edge.target === node.id)
    const isReady = incomingEdges.length === 0
      ? true
      : incomingEdges.every(edge => nodeRunStatus[edge.source] === 'success')
    if (!isReady || hasBlockingError) return

    statusUpdates[node.id] = 'running'
    dataUpdates.push({ id: node.id, data: { _runSignal: now } })
    newlyTriggered = true
  })

  const nextTick = tick + 1
  let stopReason: CanvasDagStepPlan['stopReason']
  if (hasBlockingError) {
    stopReason = 'error'
  } else if (allDone && nodes.length > 0) {
    stopReason = 'complete'
  } else if (!newlyTriggered && !hasRunning && !allDone && nextTick > 1) {
    stopReason = 'deadlock'
  }

  return {
    statusUpdates,
    dataUpdates,
    newlyTriggered,
    hasRunning,
    hasError: hasBlockingError,
    allDone,
    nextTick,
    stopReason,
  }
}
