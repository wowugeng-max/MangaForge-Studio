import { afterEach, describe, expect, test } from 'bun:test'
import { sanitizeLoadedNodes, useCanvasStore } from './canvasStore'

function resetStore() {
  useCanvasStore.setState({
    nodes: [],
    edges: [],
    past: [],
    future: [],
    isGlobalRunning: false,
    nodeRunStatus: {},
  })
}

describe('canvasStore fission migration', () => {
  afterEach(resetStore)

  test('executeFission clones the downstream subtree and returns every branch root', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'storyboard', type: 'generate', position: { x: 0, y: 0 }, data: { label: '分镜大师' } },
      { id: 'image', type: 'generate', position: { x: 400, y: 0 }, data: { label: '分镜绘图', result: { content: 'old' }, incoming_data: { content: 'old in' } } },
      { id: 'display', type: 'display', position: { x: 800, y: 0 }, data: { label: '分镜预览', result: { content: 'old preview' } } },
    ], [
      { id: 'e1', source: 'storyboard', target: 'image', sourceHandle: 'out', targetHandle: 'text' },
      { id: 'e2', source: 'image', target: 'display', sourceHandle: 'out', targetHandle: 'in' },
    ])
    store.setNodeStatus('storyboard', 'success')
    store.setNodeStatus('image', 'success')
    store.setNodeStatus('display', 'success')

    const branchRootIds = store.executeFission('storyboard', ['panel-1', 'panel-2', 'panel-3'])
    const next = useCanvasStore.getState()

    expect(branchRootIds).toHaveLength(3)
    expect(branchRootIds[0]).toBe('image')
    expect(next.nodes).toHaveLength(7)
    expect(next.edges).toHaveLength(6)
    expect(next.nodes.filter(node => node.data?._fissionSource === 'storyboard')).toHaveLength(4)
    expect(next.nodes.find(node => node.id === branchRootIds[1])?.data?.result).toBeUndefined()
    expect(next.nodes.find(node => node.id === branchRootIds[1])?.data?.incoming_data).toBeUndefined()
    expect(next.nodeRunStatus[branchRootIds[1]]).toBe('idle')
    expect(next.past).toHaveLength(1)
  })

  test('createGroup wraps selected top-level nodes with parent-relative positions', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'a', type: 'generate', position: { x: 100, y: 120 }, style: { width: 120, height: 80 }, data: { label: 'A' } },
      { id: 'b', type: 'display', position: { x: 300, y: 180 }, style: { width: 140, height: 100 }, data: { label: 'B' } },
      { id: 'outside', type: 'display', position: { x: 700, y: 300 }, data: { label: 'Outside' } },
    ], [])

    const groupId = store.createGroup(['a', 'b'], '节点组')
    const next = useCanvasStore.getState()
    const group = next.nodes.find(node => node.id === groupId)
    const a = next.nodes.find(node => node.id === 'a')
    const b = next.nodes.find(node => node.id === 'b')

    expect(groupId).toMatch(/^group_/)
    expect(next.nodes[0].id).toBe(groupId)
    expect(group).toMatchObject({
      type: 'nodeGroup',
      position: { x: 60, y: 30 },
      style: { width: 420, height: 290 },
      data: { label: '节点组', _collapsed: false, _muted: false, _isGroupRunning: false },
      dragHandle: '.custom-drag-handle',
    })
    expect(a).toMatchObject({
      parentNode: groupId,
      extent: 'parent',
      expandParent: true,
      position: { x: 40, y: 90 },
    })
    expect(b).toMatchObject({
      parentNode: groupId,
      extent: 'parent',
      expandParent: true,
      position: { x: 240, y: 150 },
    })
    expect(next.past).toHaveLength(1)
  })

  test('createGroup rejects nested or single-node grouping without changing history', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'a', type: 'generate', parentNode: 'existing-group', position: { x: 10, y: 10 }, data: {} },
      { id: 'b', type: 'display', position: { x: 220, y: 10 }, data: {} },
    ], [])

    expect(store.createGroup(['b'], '单节点')).toBe('')
    expect(store.createGroup(['a', 'b'], '嵌套')).toBe('')
    expect(useCanvasStore.getState().past).toHaveLength(0)
  })

  test('dissolveGroup restores child nodes to absolute positions and removes group-only state', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'group-1', type: 'nodeGroup', position: { x: 60, y: 30 }, data: { label: '组' } },
      { id: 'a', type: 'generate', parentNode: 'group-1', extent: 'parent', expandParent: true, hidden: true, position: { x: 40, y: 90 }, data: { _muted: true, label: 'A' } },
      { id: 'b', type: 'display', parentNode: 'group-1', extent: 'parent', expandParent: true, position: { x: 240, y: 150 }, data: { label: 'B' } },
    ], [])

    store.dissolveGroup('group-1')
    const next = useCanvasStore.getState()
    const a = next.nodes.find(node => node.id === 'a') as any
    const b = next.nodes.find(node => node.id === 'b') as any

    expect(next.nodes.some(node => node.id === 'group-1')).toBe(false)
    expect(a.parentNode).toBeUndefined()
    expect(a.extent).toBeUndefined()
    expect(a.expandParent).toBeUndefined()
    expect(a.hidden).toBe(false)
    expect(a.position).toEqual({ x: 100, y: 120 })
    expect(a.data._muted).toBe(false)
    expect(b.position).toEqual({ x: 300, y: 180 })
    expect(next.past).toHaveLength(1)
  })

  test('onConnect records history and pushes existing upstream output to the target node', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'source', type: 'generate', position: { x: 0, y: 0 }, data: { result: { content: 'ready output' } } },
      { id: 'target', type: 'display', position: { x: 320, y: 0 }, data: {} },
    ], [])

    store.onConnect({ source: 'source', target: 'target', sourceHandle: 'out', targetHandle: 'in' })

    const next = useCanvasStore.getState()
    expect(next.edges).toHaveLength(1)
    expect(next.nodes.find(node => node.id === 'target')?.data?.incoming_data).toEqual({ content: 'ready output' })
    expect(next.past).toHaveLength(1)
  })

  test('addNode records history so newly added nodes can be undone', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'existing', type: 'display', position: { x: 0, y: 0 }, data: { label: 'Existing' } },
    ], [])

    store.addNode({ id: 'new-node', type: 'generate', position: { x: 240, y: 0 }, data: { label: 'New' } })
    expect(useCanvasStore.getState().nodes.map(node => node.id)).toEqual(['existing', 'new-node'])
    expect(useCanvasStore.getState().past).toHaveLength(1)

    useCanvasStore.getState().undo()

    expect(useCanvasStore.getState().nodes.map(node => node.id)).toEqual(['existing'])
    expect(useCanvasStore.getState().future).toHaveLength(1)
  })

  test('clearCanvas records history so accidental clearing can be undone', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'source', type: 'generate', position: { x: 0, y: 0 }, data: { label: 'Source' } },
      { id: 'target', type: 'display', position: { x: 320, y: 0 }, data: { label: 'Target' } },
    ], [
      { id: 'edge-1', source: 'source', target: 'target' },
    ])

    store.clearCanvas()

    expect(useCanvasStore.getState().nodes).toEqual([])
    expect(useCanvasStore.getState().edges).toEqual([])
    expect(useCanvasStore.getState().past).toHaveLength(1)

    useCanvasStore.getState().undo()

    expect(useCanvasStore.getState().nodes.map(node => node.id)).toEqual(['source', 'target'])
    expect(useCanvasStore.getState().edges.map(edge => edge.id)).toEqual(['edge-1'])
  })

  test('setCanvasData resets stale run status when loading a different graph', () => {
    resetStore()
    const store = useCanvasStore.getState() as any
    store.setCanvasData([
      { id: 'old-node', type: 'generate', position: { x: 0, y: 0 }, data: {} },
    ], [])
    store.setNodeStatus('old-node', 'success')
    store.setGlobalRunning(true)

    store.setCanvasData([
      { id: 'new-node', type: 'display', position: { x: 160, y: 0 }, data: {} },
    ], [])

    expect(useCanvasStore.getState().nodeRunStatus).toEqual({})
    expect(useCanvasStore.getState().isGlobalRunning).toBe(false)
    expect(useCanvasStore.getState().nodes.map(node => node.id)).toEqual(['new-node'])
  })
})

describe('sanitizeLoadedNodes', () => {
  afterEach(resetStore)

  test('strips runtime trigger fields so loading never auto-runs', () => {
    const loaded = sanitizeLoadedNodes([
      { id: 'g1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { label: '组', _isGroupRunning: true, _muted: false } } as any,
      { id: 'n1', type: 'generate', position: { x: 0, y: 0 }, data: { label: 'A', _runSignal: 12345, prompt: 'keep me' } } as any,
    ])
    expect((loaded[0].data as any)._isGroupRunning).toBeUndefined()
    expect((loaded[0].data as any)._muted).toBe(false)
    expect((loaded[1].data as any)._runSignal).toBeUndefined()
    expect((loaded[1].data as any).prompt).toBe('keep me')
  })

  test('setCanvasData applies sanitize', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'g1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { _isGroupRunning: true } } as any,
    ], [])
    const node = useCanvasStore.getState().nodes.find(n => n.id === 'g1')!
    expect((node.data as any)._isGroupRunning).toBeUndefined()
  })
})

describe('executeFission spacing', () => {
  afterEach(resetStore)

  test('clone branches are offset by at least template height + 60', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'src', type: 'generate', position: { x: 0, y: 0 }, data: {} } as any,
      { id: 'child', type: 'generate', position: { x: 400, y: 0 }, style: { width: 360, height: 380 }, data: {} } as any,
    ], [{ id: 'e1', source: 'src', target: 'child' } as any])
    useCanvasStore.getState().executeFission('src', ['a', 'b', 'c'])
    const clones = useCanvasStore.getState().nodes.filter(n => (n.data as any)?._fissionIndex)
    expect(clones).toHaveLength(2)
    expect(clones[0].position.y).toBeGreaterThanOrEqual(380 + 60)
    expect(clones[1].position.y).toBeGreaterThanOrEqual((380 + 60) * 2)
  })
})
