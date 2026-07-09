import { describe, expect, test } from 'bun:test'
import {
  longformCompassFromContext,
  normalizeLongformCompass,
  normalizeLongformCompassAxis,
} from './longform-compass'

describe('longform compass helpers', () => {
  test('normalizes compass axis labels and locked default', () => {
    expect(normalizeLongformCompassAxis({
      key: 'reader_promise',
      summary: '复核旧件，反转宗门旧规。',
    })).toEqual({
      key: 'reader_promise',
      label: '读者承诺',
      value: '复核旧件，反转宗门旧规。',
      locked: true,
    })

    expect(normalizeLongformCompassAxis({
      key: 'custom_axis',
      label: '自定义轴',
      detail: '只在本卷尝试。',
      locked: false,
    })).toEqual({
      key: 'custom_axis',
      label: '自定义轴',
      value: '只在本卷尝试。',
      locked: false,
    })
  })

  test('builds longform compass from field aliases when axes are absent', () => {
    expect(normalizeLongformCompass({
      longformCompass: {
        readerPromise: '读者看到主角用旧件修复规则漏洞。',
        protagonist_drive: '保住复核资格。',
        worldHook: '宗门账册有活体阵纹。',
        immutableRules: ['金手指必须服务复核。', '金手指必须服务复核。'],
        flexible_zones: ['配角出场顺序可调整。'],
      },
    })).toEqual({
      reader_promise: '读者看到主角用旧件修复规则漏洞。',
      axes: [
        {
          key: 'reader_promise',
          label: '读者承诺',
          value: '读者看到主角用旧件修复规则漏洞。',
          locked: true,
        },
        {
          key: 'protagonist_drive',
          label: '主角长期欲望',
          value: '保住复核资格。',
          locked: true,
        },
        {
          key: 'world_hook',
          label: '世界奇点',
          value: '宗门账册有活体阵纹。',
          locked: true,
        },
      ],
      immutable_rules: ['金手指必须服务复核。'],
      flexible_zones: ['配角出场顺序可调整。'],
    })
  })

  test('uses direct axes before generated field axes', () => {
    const compass = normalizeLongformCompass({
      axes: [
        {
          key: 'innovation_hook',
          value: '旧件显影让证词反噬。',
          locked: false,
        },
      ],
      reader_promise: '字段承诺不应生成额外 axis。',
    })

    expect(compass?.reader_promise).toBe('字段承诺不应生成额外 axis。')
    expect(compass?.axes).toEqual([
      {
        key: 'innovation_hook',
        label: '创新卖点',
        value: '旧件显影让证词反噬。',
        locked: false,
      },
    ])
  })

  test('resolves longform compass source from target, brief, context, then chapter raw payload', () => {
    const chapter = {
      raw_payload: {
        longform_compass: { reader_promise: 'chapter source' },
      },
    }

    expect(longformCompassFromContext({
      chapterTarget: { longformCompass: { reader_promise: 'target source' } },
      chapter_target: { longform_compass: { reader_promise: 'snake target source' } },
      longform_compass: { reader_promise: 'context source' },
    }, { longform_compass: { reader_promise: 'brief source' } }, chapter)).toEqual({
      reader_promise: 'snake target source',
    })

    expect(longformCompassFromContext({}, { longformCompass: { reader_promise: 'brief source' } }, chapter)).toEqual({
      reader_promise: 'brief source',
    })

    expect(longformCompassFromContext({ longformCompass: { reader_promise: 'context source' } }, null, chapter)).toEqual({
      reader_promise: 'context source',
    })

    expect(longformCompassFromContext({}, null, chapter)).toEqual({
      reader_promise: 'chapter source',
    })
  })

  test('returns null when compass has no usable content', () => {
    expect(normalizeLongformCompass({ longformCompass: {} })).toBeNull()
    expect(normalizeLongformCompass(null)).toBeNull()
    expect(longformCompassFromContext({}, null, {})).toBeNull()
  })
})
