import { afterEach, describe, expect, mock, test } from 'bun:test'
import apiClient from '../api/client'
import { getSuggestionsForNode } from './workflowSuggestions'

const originalGet = apiClient.get

afterEach(() => {
  apiClient.get = originalGet
})

describe('workflowSuggestions', () => {
  test('refreshes recommendation rules between calls in the same session', async () => {
    const ruleResponses = [
      [{
        class_type: 'KSampler',
        field: 'seed',
        friendly_name: '随机种子',
        auto_check: true,
        priority: 1,
        threshold: 1,
      }],
      [{
        class_type: 'KSampler',
        field: 'steps',
        friendly_name: '采样步数',
        auto_check: true,
        priority: 1,
        threshold: 1,
      }],
    ]

    apiClient.get = mock(async (url: string) => {
      if (url.startsWith('/recommendation-rules/')) {
        return { data: ruleResponses.shift() || [] }
      }
      if (url.startsWith('/suggestions/recommend')) {
        return { data: [] }
      }
      return { data: [] }
    }) as any

    const node = { class_type: 'KSampler', inputs: { seed: 123, steps: 20 } }
    const first = await getSuggestionsForNode('20', node)
    const second = await getSuggestionsForNode('20', node)

    expect(first.map(item => item.field)).toEqual(['seed'])
    expect(second.map(item => item.field)).toEqual(['steps'])
  })
})
