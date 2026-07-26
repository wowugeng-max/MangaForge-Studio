import { describe, expect, test } from 'bun:test'
import { buildCopyPayload, buildPastePlan } from './canvasClipboard'

const NODES = [
  { id: 'a', type: 'generate', selected: true, position: { x: 10, y: 10 }, data: { label: 'A', prompt: 'p', result: { content: 'x' }, _runSignal: 1, incoming_data: 'y' } },
  { id: 'b', type: 'display', selected: true, position: { x: 400, y: 10 }, data: { label: 'B' } },
  { id: 'c', type: 'display', selected: false, position: { x: 800, y: 10 }, data: { label: 'C' } },
  { id: 'g', type: 'nodeGroup', selected: true, position: { x: 0, y: 300 }, data: { label: 'G', _isGroupRunning: true } },
  { id: 'child', type: 'generate', selected: false, parentNode: 'g', position: { x: 20, y: 20 }, data: { label: 'child' } },
] as any[]
const EDGES = [
  { id: 'e-ab', source: 'a', target: 'b' },
  { id: 'e-bc', source: 'b', target: 'c' },
] as any[]

describe('canvas clipboard', () => {
  test('copies selected nodes, group children and internal edges only', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    const ids = payload.nodes.map(n => n.id).sort()
    expect(ids).toEqual(['a', 'b', 'child', 'g'])
    expect(payload.edges.map(e => e.id)).toEqual(['e-ab'])
  })

  test('copy strips runtime fields', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    const a = payload.nodes.find(n => n.id === 'a')!
    expect((a.data as any).result).toBeUndefined()
    expect((a.data as any)._runSignal).toBeUndefined()
    expect((a.data as any).incoming_data).toBeUndefined()
    expect((a.data as any).prompt).toBe('p')
    const g = payload.nodes.find(n => n.id === 'g')!
    expect((g.data as any)._isGroupRunning).toBeUndefined()
  })

  test('returns null when nothing selected', () => {
    expect(buildCopyPayload(NODES.map(n => ({ ...n, selected: false })), EDGES)).toBeNull()
  })

  test('paste remaps ids, parentNode and offsets positions', () => {
    const payload = buildCopyPayload(NODES, EDGES)!
    let counter = 0
    const plan = buildPastePlan(payload, () => `new_${counter++}`, { x: 40, y: 40 })
    expect(plan.nodes).toHaveLength(4)
    expect(plan.nodes.every(n => n.id.startsWith('new_'))).toBe(true)
    const child = plan.nodes.find(n => (n.data as any).label === 'child')!
    const group = plan.nodes.find(n => (n.data as any).label === 'G')!
    expect(child.parentNode).toBe(group.id)
    expect(child.position).toEqual({ x: 20, y: 20 })
    const a = plan.nodes.find(n => (n.data as any).label === 'A')!
    expect(a.position).toEqual({ x: 50, y: 50 })
    expect(a.selected).toBe(true)
    const edge = plan.edges[0]
    const b = plan.nodes.find(n => (n.data as any).label === 'B')!
    expect(edge.source).toBe(a.id)
    expect(edge.target).toBe(b.id)
  })
})
