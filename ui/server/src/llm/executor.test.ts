import { describe, expect, test } from 'bun:test'
import { resolveAgentPreferredModelId } from './executor'

describe('resolveAgentPreferredModelId', () => {
  const project: any = {
    reference_config: {
      model_strategy: {
        preferred_model_id: 128,
        stages: {
          incubation: { model_id: 129 },
          outline: { model_id: 130 },
          draft: { model_id: 131 },
          review: { model_id: 132 },
        },
      },
    },
  }

  test('keeps explicit model id when provided', () => {
    expect(resolveAgentPreferredModelId('market-agent', project, '27')).toBe(27)
  })

  test('routes incubation agents to incubation stage model', () => {
    expect(resolveAgentPreferredModelId('market-agent', project)).toBe(129)
    expect(resolveAgentPreferredModelId('world-agent', project)).toBe(129)
    expect(resolveAgentPreferredModelId('character-agent', project)).toBe(129)
  })

  test('routes outline agents to outline stage model', () => {
    expect(resolveAgentPreferredModelId('outline-agent', project)).toBe(130)
    expect(resolveAgentPreferredModelId('detail-outline-agent', project)).toBe(130)
    expect(resolveAgentPreferredModelId('continuity-check-agent', project)).toBe(130)
  })

  test('falls back to preferred model id when stage model is missing', () => {
    expect(resolveAgentPreferredModelId('unknown-agent', project)).toBe(128)
  })
})
