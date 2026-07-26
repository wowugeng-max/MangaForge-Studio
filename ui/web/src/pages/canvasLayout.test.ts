import { describe, expect, test } from 'bun:test'
import { layoutCanvas } from './canvasLayout'

const chain = (positions: Array<[number, number]>) => positions.map(([x, y], i) => ({
  id: `n${i}`, type: 'generate', position: { x, y }, style: { width: 360, height: 380 }, data: {},
})) as any[]

describe('layoutCanvas', () => {
  test('left-to-right chain gets monotonically increasing x', () => {
    const nodes = chain([[500, 500], [0, 0], [250, 900]])
    const edges = [
      { id: 'e1', source: 'n1', target: 'n0' },
      { id: 'e2', source: 'n0', target: 'n2' },
    ] as any[]
    const laid = layoutCanvas(nodes, edges)
    const x = (id: string) => laid.find(n => n.id === id)!.position.x
    expect(x('n1')).toBeLessThan(x('n0'))
    expect(x('n0')).toBeLessThan(x('n2'))
    laid.forEach(n => {
      expect(Number.isFinite(n.position.x)).toBe(true)
      expect(Number.isFinite(n.position.y)).toBe(true)
    })
  })

  test('group children keep their relative positions', () => {
    const nodes = [
      { id: 'g', type: 'nodeGroup', position: { x: 0, y: 0 }, style: { width: 500, height: 400 }, data: {} },
      { id: 'c1', type: 'generate', parentNode: 'g', position: { x: 30, y: 60 }, data: {} },
      { id: 'top', type: 'display', position: { x: 900, y: 0 }, style: { width: 300, height: 300 }, data: {} },
    ] as any[]
    const edges = [{ id: 'e', source: 'g', target: 'top' }] as any[]
    const laid = layoutCanvas(nodes, edges)
    expect(laid.find(n => n.id === 'c1')!.position).toEqual({ x: 30, y: 60 })
  })

  test('edges into group children rank the group itself', () => {
    const nodes = [
      { id: 'a', type: 'generate', position: { x: 0, y: 0 }, style: { width: 360, height: 380 }, data: {} },
      { id: 'g', type: 'nodeGroup', position: { x: 0, y: 0 }, style: { width: 500, height: 400 }, data: {} },
      { id: 'c1', type: 'generate', parentNode: 'g', position: { x: 30, y: 60 }, data: {} },
    ] as any[]
    const edges = [{ id: 'e', source: 'a', target: 'c1' }] as any[]
    const laid = layoutCanvas(nodes, edges)
    const x = (id: string) => laid.find(n => n.id === id)!.position.x
    expect(x('a')).toBeLessThan(x('g'))
  })
})
