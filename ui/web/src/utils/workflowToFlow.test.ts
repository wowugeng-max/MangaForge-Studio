import { describe, expect, test } from 'bun:test'
import { workflowToFlow } from './workflowToFlow'

describe('workflowToFlow', () => {
  test('keeps fallback node positions deterministic when workflow metadata has no coordinates', () => {
    const workflow = {
      '10': { class_type: 'CLIPTextEncode', inputs: { text: 'hero' } },
      '20': { class_type: 'KSampler', inputs: { positive: ['10', 0], seed: 123 } },
      '30': { class_type: 'VAEDecode', inputs: { samples: ['20', 0] } },
    }

    const first = workflowToFlow(workflow)
    const second = workflowToFlow(workflow)

    expect(first.nodes.map(node => ({ id: node.id, position: node.position }))).toEqual([
      { id: '10', position: { x: 0, y: 0 } },
      { id: '20', position: { x: 260, y: 0 } },
      { id: '30', position: { x: 520, y: 0 } },
    ])
    expect(second.nodes.map(node => ({ id: node.id, position: node.position }))).toEqual(
      first.nodes.map(node => ({ id: node.id, position: node.position }))
    )
  })

  test('detects numeric source ids in ComfyUI input connection tuples', () => {
    const workflow = {
      '10': { class_type: 'LoadImage', inputs: { image: 'input.png' } },
      '20': { class_type: 'VAEEncode', inputs: { pixels: [10, 0] } },
    } as any

    const { edges } = workflowToFlow(workflow)

    expect(edges).toEqual([
      {
        id: '10-20-pixels',
        source: '10',
        target: '20',
        sourceHandle: 'output-0',
        targetHandle: 'pixels',
      },
    ])
  })

  test('does not treat ordinary arrays as graph edges', () => {
    const workflow = {
      '10': { class_type: 'PromptStyler', inputs: { styles: ['cinematic', 'moody'] } },
    }

    const { edges } = workflowToFlow(workflow)

    expect(edges).toEqual([])
  })
})
