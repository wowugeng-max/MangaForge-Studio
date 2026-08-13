import { describe, expect, test } from 'bun:test'
import { buildCanvasAssetDropPlan } from './canvasAssetDrop'
import { DEFAULT_NODE_SIZE } from '../constants/nodeDefaults'

describe('canvas asset drop planner', () => {
  test('returns null for unsupported or incomplete canvas asset drops', () => {
    expect(buildCanvasAssetDropPlan({
      asset: { type: 'image', name: '素材' },
      position: { x: 10, y: 20 },
      nextId: () => 'node-1',
    })).toBeNull()

    expect(buildCanvasAssetDropPlan({
      asset: { type: 'node_config', name: '坏配置', data: { config: { label: 'missing type' } } },
      position: { x: 10, y: 20 },
      nextId: () => 'node-1',
    })).toBeNull()

    expect(buildCanvasAssetDropPlan({
      asset: { type: 'node_template', name: '空模板', data: { nodes: [], edges: [] } },
      position: { x: 10, y: 20 },
      nextId: () => 'node-1',
    })).toBeNull()
  })

  test('builds a node_config drop plan without needing a second history write', () => {
    const plan = buildCanvasAssetDropPlan({
      asset: {
        type: 'node_config',
        name: '生图节点',
        data: { nodeType: 'generate', config: { label: '原始名称', mode: 'text_to_image' } },
      },
      position: { x: 100, y: 200 },
      nextId: () => 'node-1',
    })

    expect(plan).toEqual({
      kind: 'node_config',
      assetName: '生图节点',
      nodes: [
        {
          id: 'node-1',
          type: 'generate',
          position: { x: 100, y: 200 },
          data: { label: '生图节点', mode: 'text_to_image' },
          style: { ...DEFAULT_NODE_SIZE },
        },
      ],
      edges: [],
    })
  })

  test('builds a node_template drop plan with remapped node and edge ids', () => {
    const ids = ['node-a', 'node-b']
    const plan = buildCanvasAssetDropPlan({
      asset: {
        type: 'node_template',
        name: '两段模板',
        data: {
          nodes: [
            { type: 'generate', relativePosition: { x: 0, y: 0 }, config: { label: 'A' } },
            { type: 'display', relativePosition: { x: 320, y: 40 }, config: {} },
          ],
          edges: [
            { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
          ],
        },
      },
      position: { x: 100, y: 200 },
      nextId: () => ids.shift() || 'unused',
      nextEdgeId: () => 'edge-1',
    })

    expect(plan).toMatchObject({
      kind: 'node_template',
      assetName: '两段模板',
      nodes: [
        { id: 'node-a', type: 'generate', position: { x: 100, y: 200 }, data: { label: 'A' } },
        { id: 'node-b', type: 'display', position: { x: 420, y: 240 }, data: { label: 'display' } },
      ],
      edges: [
        { id: 'edge-1', source: 'node-a', target: 'node-b', sourceHandle: 'out', targetHandle: 'in' },
      ],
    })
  })

  test('builds a node_template drop plan from React Flow style node ids and edge endpoints', () => {
    const ids = ['fresh-source', 'fresh-target']
    const plan = buildCanvasAssetDropPlan({
      asset: {
        type: 'node_template',
        name: '外部模板',
        data: {
          nodes: [
            { id: 'old-source', type: 'generate', relativePosition: { x: 0, y: 0 }, config: { label: '源' } },
            { id: 'old-target', type: 'display', relativePosition: { x: 380, y: 0 }, config: { label: '目标' } },
          ],
          edges: [
            { source: 'old-source', target: 'old-target', sourceHandle: 'result', targetHandle: 'input' },
          ],
        },
      },
      position: { x: 50, y: 60 },
      nextId: () => ids.shift() || 'unused',
      nextEdgeId: () => 'edge-id-format',
    })

    expect(plan).toMatchObject({
      kind: 'node_template',
      assetName: '外部模板',
      nodes: [
        { id: 'fresh-source', type: 'generate', position: { x: 50, y: 60 }, data: { label: '源' } },
        { id: 'fresh-target', type: 'display', position: { x: 430, y: 60 }, data: { label: '目标' } },
      ],
      edges: [
        { id: 'edge-id-format', source: 'fresh-source', target: 'fresh-target', sourceHandle: 'result', targetHandle: 'input' },
      ],
    })
  })

  test('uses plain node position as a fallback when template nodes lack relativePosition', () => {
    const ids = ['node-left', 'node-right']
    const plan = buildCanvasAssetDropPlan({
      asset: {
        type: 'node_template',
        name: '位置模板',
        data: {
          nodes: [
            { id: 'left', type: 'generate', position: { x: 20, y: 30 }, config: { label: '左' } },
            { id: 'right', type: 'display', position: { x: 260, y: 80 }, config: { label: '右' } },
          ],
          edges: [{ source: 'left', target: 'right' }],
        },
      },
      position: { x: 100, y: 200 },
      nextId: () => ids.shift() || 'unused',
      nextEdgeId: () => 'edge-position-format',
    })

    expect(plan?.nodes.map(node => ({ id: node.id, position: node.position }))).toEqual([
      { id: 'node-left', position: { x: 100, y: 200 } },
      { id: 'node-right', position: { x: 340, y: 250 } },
    ])
    expect(plan?.edges).toMatchObject([
      { id: 'edge-position-format', source: 'node-left', target: 'node-right' },
    ])
  })
})
