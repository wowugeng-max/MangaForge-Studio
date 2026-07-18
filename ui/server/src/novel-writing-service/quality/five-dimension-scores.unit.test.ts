import { describe, expect, test } from 'bun:test'
import { normalizeFiveDimensionQualityScores, normalizeRevisionStrategy } from './five-dimension-scores'

describe('normalizeRevisionStrategy', () => {
  test('maps known strategies', () => {
    expect(normalizeRevisionStrategy('rewrite')).toBe('rewrite')
    expect(normalizeRevisionStrategy('DE_AI polish')).toBe('de_ai')
    expect(normalizeRevisionStrategy('unknown')).toBe('')
  })
})

describe('normalizeFiveDimensionQualityScores', () => {
  test('builds average and below-threshold list', () => {
    const result = normalizeFiveDimensionQualityScores({
      core_consistency: 90,
      surface_rewrite: 60,
      format_consistency: 80,
      readability: 70,
      logic_coherence: 85,
    }, 78)
    expect(result.version).toBe('oh_story_five_dimension_scores_v1')
    expect(result.average_score).toBe(77)
    expect(result.below_threshold.map((item: any) => item.key).sort()).toEqual(['readability', 'surface_rewrite'])
  })
})
