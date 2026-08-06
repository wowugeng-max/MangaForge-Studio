import { describe, expect, test } from 'bun:test'
import {
  getModelStrategy,
  getStageModelId,
  getStageTemperature,
} from './model-policy'

describe('novel production model policy', () => {
  test('builds the default stage strategy from the preferred model', () => {
    expect(getModelStrategy({}, 217)).toMatchObject({
      preferred_model_id: 217,
      stages: {
        draft: { model_id: 217, temperature: 0.75 },
        review: { model_id: 217, temperature: 0.2 },
        revise: { model_id: 217, temperature: 0.62 },
      },
      cost_policy: {
        low_cost_mode: true,
        retry_limit: 2,
        fallback_enabled: true,
      },
    })
  })

  test('resolves stage model and temperature from project overrides with safe fallbacks', () => {
    const project = {
      reference_config: {
        model_strategy: {
          preferred_model_id: 301,
          stages: {
            review: { model_id: 302, temperature: 0.18 },
            revise: { model_id: null, temperature: 0 },
          },
        },
      },
    }

    expect(getStageModelId(project, 'review', 217)).toBe(302)
    expect(getStageModelId(project, 'revise', 217)).toBe(301)
    expect(getStageTemperature(project, 'review', 0.2)).toBe(0.18)
    expect(getStageTemperature(project, 'revise', 0.62)).toBe(0.62)
  })
})
