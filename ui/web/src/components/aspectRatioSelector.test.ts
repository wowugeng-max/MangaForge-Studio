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

  test('uses upstream sizes and adaptive/custom labels through the string-value API', () => {
    expect(getAspectRatioLabel('' as any)).toBe('自适应')
    expect(getAspectRatioSize('' as any)).toBe('')
    expect(getAspectRatioSize('9:16')).toBe('768*1344')
    expect(getAspectRatioSize('16:9')).toBe('1344*768')
    expect(getAspectRatioSize('3:2' as any)).toBe('1216*832')
    expect(getAspectRatioSize('custom', 1600, 900)).toBe('1600*900')
    expect(getAspectRatioLabel('custom')).toBe('Custom')
  })
})
