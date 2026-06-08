import { describe, expect, test } from 'bun:test'
import { getHandleDataType, inferParamType } from './handleTypes'

describe('handleTypes migration compatibility', () => {
  test('treats loaded character assets as text output handles', () => {
    expect(getHandleDataType('loadAsset', 'output', {
      asset: { type: 'character', data: { core_prompt: '角色核心设定' } },
    }, 'source')).toBe('text')
  })

  test('treats upstream video frame parameters as image inputs', () => {
    expect(inferParamType('frame_a')).toBe('image')
    expect(inferParamType('frame_b')).toBe('image')
    expect(inferParamType('first_frame')).toBe('image')
    expect(inferParamType('last_frame')).toBe('image')
  })
})
