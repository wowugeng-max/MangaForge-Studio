import { describe, expect, test } from 'bun:test'
import { ASPECT_RATIOS, getAspectRatioLabel, getAspectRatioSize } from './AspectRatioSelector'

describe('AspectRatioSelector migration behavior', () => {
  test('keeps the current string API while restoring upstream ratio presets', () => {
    const values = ASPECT_RATIOS.map(ratio => ratio.value)

    expect(values).toEqual([
      '',
      '1:1',
      '9:16',
      '16:9',
      '3:4',
      '4:3',
      '3:2',
      '2:3',
      '4:5',
      '5:4',
      '21:9',
      'custom',
    ])
  })

  test('uses 1080p-class 32-aligned sizes and adaptive/custom labels through the string-value API', () => {
    expect(getAspectRatioLabel('' as any)).toBe('自适应')
    expect(getAspectRatioSize('' as any)).toBe('')
    expect(getAspectRatioSize('9:16')).toBe('1088*1920')
    expect(getAspectRatioSize('16:9')).toBe('1920*1088')
    expect(getAspectRatioSize('3:2' as any)).toBe('1760*1184')
    expect(getAspectRatioSize('custom', 1600, 900)).toBe('1600*900')
    expect(getAspectRatioLabel('custom')).toBe('Custom')
  })

  test('resolution tiers map to 1080p/1440p/2160p pixel classes and default to 1K', () => {
    expect(getAspectRatioSize('16:9', 1024, 1024, '1k')).toBe('1920*1088')
    expect(getAspectRatioSize('16:9', 1024, 1024, '2k')).toBe('2560*1440')
    expect(getAspectRatioSize('16:9', 1024, 1024, '4k')).toBe('3840*2176')
    expect(getAspectRatioSize('1:1', 1024, 1024, '2k')).toBe('1920*1920')
    // 静态表中的 1K 尺寸与动态计算保持一致
    for (const ratio of ASPECT_RATIOS) {
      if (!ratio.size || ratio.size === 'custom') continue
      expect(getAspectRatioSize(ratio.value as any)).toBe(ratio.size)
    }
    // 自适应与自定义不受分辨率档位影响
    expect(getAspectRatioSize('' as any, 1024, 1024, '4k')).toBe('')
    expect(getAspectRatioSize('custom', 1600, 900, '4k')).toBe('1600*900')
  })
})
