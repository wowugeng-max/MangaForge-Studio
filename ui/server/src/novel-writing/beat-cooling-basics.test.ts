import { describe, expect, test } from 'bun:test'
import {
  BEAT_COOLING_LABELS,
  beatCoolingCurrentItem,
  beatCoolingPriority,
  beatCoolingSequence,
  inferBeatCoolingTypeFromText,
  normalizeBeatCoolingItem,
  normalizeBeatCoolingType,
} from './beat-cooling-basics'

describe('beat cooling basic helpers', () => {
  test('normalizes beat cooling type aliases and unknown values', () => {
    expect(normalizeBeatCoolingType('关系推进与信任')).toBe('bond_deepening')
    expect(normalizeBeatCoolingType('worldbuilding 新地图规则展开')).toBe('world_painting')
    expect(normalizeBeatCoolingType('势力建设 据点')).toBe('faction_building')
    expect(normalizeBeatCoolingType('压力升级 倒计时')).toBe('tension_escalation')
    expect(normalizeBeatCoolingType('第三次会审对抗')).toBe('conflict_thrill')
    expect(normalizeBeatCoolingType('Quiet Texture')).toBe('quiettexture')
    expect(normalizeBeatCoolingType('', null)).toBe('')
  })

  test('normalizes beat cooling items from structured and string rows', () => {
    expect(normalizeBeatCoolingItem({
      chapterNo: 3,
      title: '旧城会审',
      eventType: '大冲突',
    }, 0)).toEqual({
      chapter_no: 3,
      beat_type: 'conflict_thrill',
      label: '旧城会审',
    })
    expect(normalizeBeatCoolingItem('关系深化', 1)).toEqual({
      chapter_no: null,
      beat_type: 'bond_deepening',
      label: '关系深化',
    })
    expect(normalizeBeatCoolingItem('', 2)).toEqual({
      chapter_no: null,
      beat_type: '3',
      label: '节奏点3',
    })
  })

  test('infers current beat type from prose when explicit type is missing', () => {
    expect(inferBeatCoolingTypeFromText('两人并肩复盘旧账，信任关系推进，心结终于松动。')).toBe('bond_deepening')
    expect(inferBeatCoolingTypeFromText('旧城地契和税契制度被展开，新地图规则第一次露出。')).toBe('world_painting')
    expect(inferBeatCoolingTypeFromText('长老会审继续加压，执事拔剑开打，所有人卷入大冲突。')).toBe('conflict_thrill')
    expect(inferBeatCoolingTypeFromText('她安静地走过长街。')).toBe('')
  })

  test('builds the current beat from explicit context or inferred prose', () => {
    expect(beatCoolingCurrentItem(
      { chapter_no: 6, title: '旧城税契' },
      { chapter_target: { currentBeat: { label: '税契复盘', beatType: 'worldbuilding' } } },
      '正文',
    )).toEqual({
      chapter_no: 6,
      beat_type: 'world_painting',
      label: '税契复盘',
      current: true,
    })
    expect(beatCoolingCurrentItem(
      { chapter_no: 7, title: '关系余波' },
      { chapter_target: {} },
      '两人和解并肩，关系信任继续推进。',
    )).toEqual({
      chapter_no: 7,
      beat_type: 'bond_deepening',
      label: '关系余波',
      current: true,
    })
    expect(BEAT_COOLING_LABELS.conflict_thrill).toBe('大冲突/打斗')
  })

  test('merges recent beat sources, filters future rows, sorts, and appends current beat', () => {
    const sequence = beatCoolingSequence(
      { chapter_no: 5, title: '第五章' },
      {
        chapter_target: {
          recentChapterBeats: [
            { chapterNo: 4, title: '第四章不该重复', type: 'worldbuilding' },
            { chapterNo: 2, title: '第二章会审', type: '大冲突' },
          ],
          beatType: '压力升级',
        },
        recent_chapters: [
          { chapter_no: 1, title: '第一章关系', event_type: '关系深化' },
          { chapter_no: 6, title: '未来章节', event_type: '世界观展开' },
        ],
      },
      '正文',
    )

    expect(sequence).toEqual([
      { chapter_no: 1, beat_type: 'bond_deepening', label: '第一章关系' },
      { chapter_no: 2, beat_type: 'conflict_thrill', label: '第二章会审' },
      { chapter_no: 4, beat_type: 'world_painting', label: '第四章不该重复' },
      { chapter_no: 5, beat_type: 'tension_escalation', label: '第五章', current: true },
    ])
  })

  test('prioritizes beat cooling repair risks', () => {
    expect(beatCoolingPriority([{ key: 'conflict_thrill_overrun' }])).toBe('优先轮换桥段类型')
    expect(beatCoolingPriority([{ key: 'five_chapter_texture_gap' }])).toBe('优先轮换桥段类型')
    expect(beatCoolingPriority([{ key: 'beat_cooling_ok' }])).toBe('')
  })
})
