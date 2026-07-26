import { describe, expect, test } from 'bun:test'
import { decorateEdges, minimapNodeColor } from './canvasEdgeStyle'

const NODES = [
  { id: 'g', type: 'generate', position: { x: 0, y: 0 }, data: { mode: 'chat' } },
  { id: 'img', type: 'generate', position: { x: 0, y: 0 }, data: { mode: 'text_to_image' } },
  { id: 'd', type: 'display', position: { x: 0, y: 0 }, data: {} },
] as any[]

describe('decorateEdges', () => {
  test('colors edges by source handle data type', () => {
    const edges = decorateEdges({
      edges: [
        { id: 'e1', source: 'g', sourceHandle: 'out', target: 'd' },
        { id: 'e2', source: 'img', sourceHandle: 'out', target: 'd' },
      ] as any[],
      nodes: NODES,
      nodeRunStatus: {},
    })
    expect((edges[0].style as any).stroke).toBe('#52c41a')
    expect((edges[1].style as any).stroke).toBe('#1890ff')
  })

  test('animates edges out of running sources', () => {
    const edges = decorateEdges({
      edges: [{ id: 'e1', source: 'g', sourceHandle: 'out', target: 'd' }] as any[],
      nodes: NODES,
      nodeRunStatus: { g: 'running' },
    })
    expect(edges[0].animated).toBe(true)
  })

  test('minimap color prefers customColor then type color', () => {
    expect(minimapNodeColor({ type: 'generate', data: {} } as any)).toBe('#0ea5e9')
    expect(minimapNodeColor({ type: 'generate', data: { customColor: '#123456' } } as any)).toBe('#123456')
    expect(minimapNodeColor({ type: 'unknown', data: {} } as any)).toBe('#94a3b8')
  })
})
