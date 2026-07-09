import { describe, expect, test } from 'bun:test'

import {
  CHAPTER_POSITIONING_OPTIONS,
  normalizeBenchmarkStructureCoordinates,
  normalizeChapterPositioningBrief,
} from './chapter-positioning-brief'

describe('chapter positioning brief helpers', () => {
  test('normalizes benchmark structure coordinates from explicit and scene sources', () => {
    const coordinates = normalizeBenchmarkStructureCoordinates(
      [
        '中点：主角首次确认规则漏洞',
        {
          normalizedPosition: '3/4',
          volumeChapterRange: '20-30',
          benchmarkEvent: '反证公开',
          currentEvent: '账册反压',
          type: 'reversal',
        },
        {},
      ],
      [
        {
          benchmarkStructureCoordinate: {
            position: '1/4',
            sourceEvent: '旧身份暴露',
            localEvent: '矿票资格被卡',
          },
        },
      ],
    )

    expect(coordinates).toEqual([
      { summary: '中点：主角首次确认规则漏洞' },
      {
        normalized_position: '3/4',
        volume_chapter_range: '20-30',
        source_event: '反证公开',
        local_event: '账册反压',
        event_type: 'reversal',
        summary: '',
      },
      {
        normalized_position: '1/4',
        volume_chapter_range: '',
        source_event: '旧身份暴露',
        local_event: '矿票资格被卡',
        event_type: '',
        summary: '',
      },
    ])
  })

  test('builds chapter positioning brief with runtime target taking precedence', () => {
    const brief = normalizeChapterPositioningBrief({
      chapter_target: {
        chapter_positioning: '低压生活',
        pressure_level: 1,
      },
      chapterTarget: {
        chapterPositioning: '推进',
        pressureLevel: 4,
        benchmarkStructureCoordinate: {
          normalizedPosition: '中点',
          currentEvent: '主角用残片逼出新线索',
        },
      },
    })

    expect(brief.chapter_positioning).toBe('推进')
    expect(brief.pressure_level).toBe(4)
    expect(brief.positioning_options).toEqual(CHAPTER_POSITIONING_OPTIONS)
    expect(brief.benchmark_structure_coordinates[0].normalized_position).toBe('中点')
    expect(brief.rules.join(' ')).toContain('章节定位决定爆发/冲突烈度')
    expect(brief.quality_checks.join(' ')).toContain('chapter_positioning_checks')
  })

  test('falls back to scene brief positioning and pressure level', () => {
    const brief = normalizeChapterPositioningBrief({}, [
      {
        chapter_positioning: '关系回收',
        pressure_level: '2.6',
      },
    ])

    expect(brief.chapter_positioning).toBe('关系回收')
    expect(brief.pressure_level).toBe(3)
  })
})
