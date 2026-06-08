import { describe, expect, test } from 'bun:test'
import type { Edge, Node } from 'reactflow'
import { planCanvasDagStep } from './canvasDagRunner'

describe('canvas DAG runner', () => {
  test('does not trigger idle nodes when any node is already errored', () => {
    const nodes: Node[] = [
      { id: 'ready-root', type: 'generate', position: { x: 0, y: 0 }, data: {} },
      { id: 'failed-node', type: 'generate', position: { x: 320, y: 0 }, data: {} },
    ]

    const step = planCanvasDagStep({
      nodes,
      edges: [],
      nodeRunStatus: { 'failed-node': 'error' },
      tick: 0,
      now: 1234,
    })

    expect(step.stopReason).toBe('error')
    expect(step.statusUpdates).toEqual({})
    expect(step.dataUpdates).toEqual([])
    expect(step.newlyTriggered).toBe(false)
  })

  test('marks muted nodes successful and passes upstream output through to downstream nodes', () => {
    const nodes: Node[] = [
      { id: 'source', type: 'generate', position: { x: 0, y: 0 }, data: { result: { content: 'ready' } } },
      { id: 'group', type: 'nodeGroup', position: { x: 260, y: 0 }, data: { _muted: true } },
      { id: 'muted-middle', type: 'generate', parentNode: 'group', position: { x: 20, y: 20 }, data: {} },
      { id: 'target', type: 'display', position: { x: 620, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'source', target: 'muted-middle' },
      { id: 'e2', source: 'muted-middle', target: 'target' },
    ]

    const step = planCanvasDagStep({
      nodes,
      edges,
      nodeRunStatus: { source: 'success', 'muted-middle': 'idle', target: 'idle' },
      tick: 0,
      now: 5678,
    })

    expect(step.statusUpdates).toEqual({ 'muted-middle': 'success' })
    expect(step.dataUpdates).toEqual([
      { id: 'target', data: { incoming_data: { content: 'ready' } } },
    ])
    expect(step.stopReason).toBeUndefined()
  })

  test('completes a graph that only contains grouping nodes', () => {
    const nodes: Node[] = [
      { id: 'group-only', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { label: 'Only Group' } },
    ]

    const step = planCanvasDagStep({
      nodes,
      edges: [],
      nodeRunStatus: {},
      tick: 0,
      now: 9999,
    })

    expect(step.stopReason).toBe('complete')
    expect(step.allDone).toBe(true)
    expect(step.newlyTriggered).toBe(false)
  })
})
