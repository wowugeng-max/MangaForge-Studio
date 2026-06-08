import { describe, expect, test } from 'bun:test'
import {
  buildGroupCollapseNodes,
  buildGroupMutePatches,
  buildGroupRunTickPlan,
  buildGroupTemplateAssetPayload,
} from './GroupNode'

describe('GroupNode node template migration', () => {
  test('serializes child nodes and internal edges into a reusable node_template asset payload', () => {
    const payload = buildGroupTemplateAssetPayload({
      groupId: 'group-1',
      groupLabel: '镜头生成组',
      projectId: 7,
      nodes: [
        { id: 'group-1', type: 'nodeGroup', parentNode: undefined, position: { x: 0, y: 0 }, data: { label: '镜头生成组' } },
        {
          id: 'prompt',
          type: 'generate',
          parentNode: 'group-1',
          position: { x: 24, y: 36 },
          data: {
            label: '提示词',
            prompt: '生成分镜',
            result: { text: 'old result' },
            incoming_data: { prompt: 'old input' },
            _runSignal: 123,
            _fissionIndex: 2,
            _fissionSource: 'storyboard',
          },
        },
        {
          id: 'preview',
          type: 'display',
          parentNode: 'group-1',
          position: { x: 320, y: 36 },
          data: {
            label: '预览',
            showPreview: true,
          },
        },
        { id: 'outside', type: 'display', position: { x: 600, y: 36 }, data: { label: '外部' } },
      ] as any,
      edges: [
        { id: 'e-internal', source: 'prompt', target: 'preview', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e-external', source: 'preview', target: 'outside', sourceHandle: 'out', targetHandle: 'in' },
      ] as any,
    })

    expect(payload).toMatchObject({
      type: 'node_template',
      name: '镜头生成组',
      description: '包含 2 个节点的模板',
      tags: ['NodeTemplate'],
      project_id: 7,
    })
    expect(payload.data.nodes).toEqual([
      {
        type: 'generate',
        relativePosition: { x: 24, y: 36 },
        config: { label: '提示词', prompt: '生成分镜' },
      },
      {
        type: 'display',
        relativePosition: { x: 320, y: 36 },
        config: { label: '预览', showPreview: true },
      },
    ])
    expect(payload.data.edges).toEqual([
      { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
    ])
  })

  test('returns null when the selected group has no child nodes', () => {
    expect(buildGroupTemplateAssetPayload({
      groupId: 'empty',
      groupLabel: '空组',
      nodes: [{ id: 'empty', type: 'nodeGroup', position: { x: 0, y: 0 }, data: {} }] as any,
      edges: [],
    })).toBeNull()
  })

  test('buildGroupCollapseNodes hides children and restores expanded dimensions', () => {
    const collapsedNodes = buildGroupCollapseNodes([
      { id: 'group-1', type: 'nodeGroup', position: { x: 0, y: 0 }, style: { width: 620, height: 420 }, data: { label: '组', _collapsed: false } },
      { id: 'a', type: 'generate', parentNode: 'group-1', position: { x: 20, y: 30 }, data: {} },
      { id: 'outside', type: 'display', position: { x: 20, y: 30 }, data: {} },
    ] as any, 'group-1')

    expect(collapsedNodes.find(node => node.id === 'group-1')).toMatchObject({
      style: { width: 220, height: 50 },
      data: { _collapsed: true, _expandedSize: { width: 620, height: 420 } },
    })
    expect(collapsedNodes.find(node => node.id === 'a')?.hidden).toBe(true)
    expect(collapsedNodes.find(node => node.id === 'outside')?.hidden).toBeUndefined()

    const expandedNodes = buildGroupCollapseNodes(collapsedNodes as any, 'group-1')
    expect(expandedNodes.find(node => node.id === 'group-1')).toMatchObject({
      style: { width: 620, height: 420 },
      data: { _collapsed: false },
    })
    expect(expandedNodes.find(node => node.id === 'a')?.hidden).toBe(false)
  })

  test('buildGroupMutePatches returns group and child mute patches only', () => {
    expect(buildGroupMutePatches([
      { id: 'group-1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: { _muted: false } },
      { id: 'a', type: 'generate', parentNode: 'group-1', position: { x: 0, y: 0 }, data: {} },
      { id: 'outside', type: 'display', position: { x: 0, y: 0 }, data: {} },
    ] as any, 'group-1')).toEqual({
      'group-1': { _muted: true },
      a: { _muted: true },
    })
  })

  test('buildGroupRunTickPlan starts ready children and stops when all group children finish', () => {
    const nodes = [
      { id: 'group-1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: {} },
      { id: 'a', type: 'generate', parentNode: 'group-1', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'display', parentNode: 'group-1', position: { x: 120, y: 0 }, data: {} },
      { id: 'outside', type: 'generate', position: { x: -120, y: 0 }, data: {} },
    ] as any
    const edges = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'outside-b', source: 'outside', target: 'b' },
    ] as any

    const firstTick = buildGroupRunTickPlan({ groupId: 'group-1', nodes, edges, nodeRunStatus: {}, now: 123 })
    expect(firstTick).toEqual({
      statusPatches: { a: 'running' },
      dataPatches: { a: { _runSignal: 123 } },
      groupPatch: null,
    })

    const secondTick = buildGroupRunTickPlan({
      groupId: 'group-1',
      nodes,
      edges,
      nodeRunStatus: { a: 'success', b: 'idle', outside: 'success' },
      now: 456,
    })
    expect(secondTick.statusPatches).toEqual({ b: 'running' })
    expect(secondTick.dataPatches).toEqual({ b: { _runSignal: 456 } })

    const doneTick = buildGroupRunTickPlan({
      groupId: 'group-1',
      nodes,
      edges,
      nodeRunStatus: { a: 'success', b: 'success', outside: 'success' },
      now: 789,
    })
    expect(doneTick.groupPatch).toEqual({ _isGroupRunning: false })
  })

  test('buildGroupRunTickPlan stops when children are blocked by an unsatisfied external dependency', () => {
    const nodes = [
      { id: 'group-1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: {} },
      { id: 'inside', type: 'generate', parentNode: 'group-1', position: { x: 0, y: 0 }, data: {} },
      { id: 'outside', type: 'generate', position: { x: -120, y: 0 }, data: {} },
    ] as any
    const edges = [
      { id: 'outside-inside', source: 'outside', target: 'inside' },
    ] as any

    const tick = buildGroupRunTickPlan({
      groupId: 'group-1',
      nodes,
      edges,
      nodeRunStatus: { inside: 'idle', outside: 'idle' },
      now: 123,
    })

    expect(tick.statusPatches).toEqual({})
    expect(tick.dataPatches).toEqual({})
    expect(tick.groupPatch).toEqual({ _isGroupRunning: false })
  })

  test('buildGroupRunTickPlan marks muted children successful and passes upstream output through', () => {
    const nodes = [
      { id: 'group-1', type: 'nodeGroup', position: { x: 0, y: 0 }, data: {} },
      { id: 'source', type: 'generate', parentNode: 'group-1', position: { x: 0, y: 0 }, data: { result: { content: 'ready' } } },
      { id: 'muted-middle', type: 'generate', parentNode: 'group-1', position: { x: 120, y: 0 }, data: { _muted: true } },
      { id: 'target', type: 'display', parentNode: 'group-1', position: { x: 240, y: 0 }, data: {} },
    ] as any
    const edges = [
      { id: 'source-muted', source: 'source', target: 'muted-middle' },
      { id: 'muted-target', source: 'muted-middle', target: 'target' },
    ] as any

    const tick = buildGroupRunTickPlan({
      groupId: 'group-1',
      nodes,
      edges,
      nodeRunStatus: { source: 'success', 'muted-middle': 'idle', target: 'idle' },
      now: 123,
    })

    expect(tick.statusPatches).toEqual({ 'muted-middle': 'success' })
    expect(tick.dataPatches).toEqual({
      target: { incoming_data: { content: 'ready' } },
    })
    expect(tick.groupPatch).toBeNull()
  })
})
