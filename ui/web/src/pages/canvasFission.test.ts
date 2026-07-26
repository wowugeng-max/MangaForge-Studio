import { describe, expect, test } from 'bun:test'
import { useCanvasStore } from '../stores/canvasStore'
import { expandFissionAndDistribute } from './canvasFission'

function seedGraph() {
  useCanvasStore.getState().setCanvasData([
    { id: 'src', type: 'generate', position: { x: 0, y: 0 }, data: { result: { _fission: true, items: ['a', 'b'] } } } as any,
    { id: 'down', type: 'generate', position: { x: 400, y: 0 }, style: { width: 360, height: 380 }, data: {} } as any,
  ], [{ id: 'e1', source: 'src', target: 'down' } as any])
}

describe('expandFissionAndDistribute', () => {
  test('clones downstream branches and distributes items', () => {
    seedGraph()
    const outcome = expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(true)
    const state = useCanvasStore.getState()
    expect((state.nodes.find(n => n.id === 'down')?.data as any).incoming_data).toBe('a')
    const clone = state.nodes.find(n => (n.data as any)?._fissionSource === 'src' && n.id !== 'down')
    expect(clone).toBeTruthy()
    expect((clone!.data as any).incoming_data).toBe('b')
  })

  test('second expansion is a no-op', () => {
    seedGraph()
    expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    const countAfterFirst = useCanvasStore.getState().nodes.length
    const outcome = expandFissionAndDistribute({ nodeId: 'src', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(false)
    expect(outcome.reason).toBe('already_expanded')
    expect(useCanvasStore.getState().nodes.length).toBe(countAfterFirst)
  })

  test('no downstream means nothing to expand', () => {
    useCanvasStore.getState().setCanvasData([
      { id: 'solo', type: 'generate', position: { x: 0, y: 0 }, data: {} } as any,
    ], [])
    const outcome = expandFissionAndDistribute({ nodeId: 'solo', items: ['a', 'b'], store: useCanvasStore })
    expect(outcome.expanded).toBe(false)
    expect(outcome.reason).toBe('no_downstream')
  })
})
