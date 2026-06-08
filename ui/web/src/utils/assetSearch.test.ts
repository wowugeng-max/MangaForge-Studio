import { describe, expect, test } from 'bun:test'
import { assetMatchesSearch } from './assetSearch'

describe('asset search compatibility', () => {
  test('matches character assets by core_prompt text', () => {
    expect(assetMatchesSearch({
      name: '沈墨',
      type: 'character',
      data: { core_prompt: '沉默寡言，行动前会先观察三秒' },
    }, '观察三秒')).toBe(true)
  })

  test('still matches prompt content and descriptions', () => {
    expect(assetMatchesSearch({ name: '提示词', description: '赛博都市', data: {} }, '赛博')).toBe(true)
    expect(assetMatchesSearch({ name: '提示词', data: { content: '雨夜霓虹反光' } }, '霓虹')).toBe(true)
  })
})
