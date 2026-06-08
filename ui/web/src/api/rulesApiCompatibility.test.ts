import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('rules API ComfyForge compatibility', () => {
  test('keeps upstream FastAPI-style trailing slash collection paths', () => {
    const source = readFileSync(join(import.meta.dir, 'rules.ts'), 'utf8')

    expect(source).toContain("apiClient.get<RecommendationRule[]>('/recommendation-rules/', { params })")
    expect(source).toContain("apiClient.post<RecommendationRule>('/recommendation-rules/', data)")
  })
})
