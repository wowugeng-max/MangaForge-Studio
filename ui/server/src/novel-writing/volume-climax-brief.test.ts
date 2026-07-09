import { describe, expect, test } from 'bun:test'
import {
  normalizeVolumeClimaxBeat,
  normalizeVolumeClimaxBrief,
  sortNearbyVolumeBeats,
} from './volume-climax-brief'

describe('volume climax brief helpers', () => {
  test('normalizes volume climax beats from strings and aliases', () => {
    expect(normalizeVolumeClimaxBeat('旧城钟楼爆点', 0)).toEqual({
      chapter_no: null,
      type: '',
      label: '旧城钟楼爆点',
      detail: '',
    })

    expect(normalizeVolumeClimaxBeat({
      chapterNo: 12,
      beatType: '小高潮',
      title: '钟楼反杀',
      promise: '主角用旧协议反制追捕队。',
    }, 1)).toEqual({
      chapter_no: 12,
      type: '小高潮',
      label: '钟楼反杀',
      detail: '主角用旧协议反制追捕队。',
    })
  })

  test('sorts nearby beats by current chapter while preserving original order fallback', () => {
    const beats = [
      { chapter_no: 20, label: '远端爆点' },
      { chapter_no: 12, label: '当前爆点' },
      { chapter_no: 14, label: '临近爆点' },
      { label: '无章节爆点' },
    ]

    expect(sortNearbyVolumeBeats(beats, 12).map(item => item.label)).toEqual([
      '当前爆点',
      '临近爆点',
      '远端爆点',
      '无章节爆点',
    ])
  })

  test('builds volume climax brief from target and volume beat budget', () => {
    const brief = normalizeVolumeClimaxBrief(
      {},
      {
        chapter_no: 12,
      },
      {
        volumeTitle: '旧城钟楼卷',
        chapterRange: '10-20',
        volumeGoal: '揭开父亲账号复活真相。',
        summary: '本卷逐步逼近钟楼核心。',
        beats: [
          { chapterNo: 9, type: '铺垫', label: '旧徽章出现', detail: '父亲身份线索第一次露头。' },
          { chapterNo: 12, type: '小高潮', label: '钟楼追捕', detail: '主角第一次反制追捕队。' },
          { chapterNo: 18, type: '大高潮', label: '核心开门', detail: '钟楼核心规则暴露。' },
        ],
        nextActions: ['本章必须把钟楼追捕写成现场压力'],
      },
    )

    expect(brief?.status).toBe('ready')
    expect(brief?.current_volume_title).toBe('旧城钟楼卷')
    expect(brief?.chapter_range).toBe('10-20')
    expect(brief?.current_chapter_role).toContain('小高潮：钟楼追捕')
    expect(brief?.volume_goal).toBe('揭开父亲账号复活真相。')
    expect(brief?.climax_promise).toBe('主角第一次反制追捕队。')
    expect(brief?.nearby_beats.map((item: any) => item.label)).toEqual(['钟楼追捕', '旧徽章出现', '核心开门'])
    expect(brief?.next_actions).toEqual(['本章必须把钟楼追捕写成现场压力'])
  })

  test('prefers explicit volume climax brief over budget beats', () => {
    const brief = normalizeVolumeClimaxBrief({
      volumeClimaxBrief: {
        status: 'needs_attention',
        currentVolumeTitle: '显式卷名',
        chapterRole: '显式章节职能',
        climaxPromise: '显式高潮承诺',
        nearbyBeats: [{ chapterNo: 3, label: '显式爆点', detail: '只采用显式爆点。' }],
        requiredBeats: ['必须兑现显式爆点'],
        forbiddenResolution: ['不得提前解释幕后者'],
      },
    }, { chapter_no: 3 }, {
      beats: [{ chapterNo: 3, label: '预算爆点' }],
    })

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.current_volume_title).toBe('显式卷名')
    expect(brief?.current_chapter_role).toBe('显式章节职能')
    expect(brief?.climax_promise).toBe('显式高潮承诺')
    expect(brief?.nearby_beats.map((item: any) => item.label)).toEqual(['显式爆点'])
    expect(brief?.required_beats).toEqual(['必须兑现显式爆点'])
    expect(brief?.forbidden_payoff).toEqual(['不得提前解释幕后者'])
  })

  test('returns null when no volume climax content exists', () => {
    expect(normalizeVolumeClimaxBrief({})).toBeNull()
  })
})
