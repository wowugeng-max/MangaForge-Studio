import { describe, expect, test } from 'bun:test'
import {
  TRACKING_STATE_REL,
  evaluateChapterTrackingGate,
  isTrackingDeltaPlaceholder,
  trackingChapterNos,
  trackingDeltaRel,
} from './chapter-tracking'

describe('chapter tracking helpers', () => {
  test('delta path pads chapter no', () => {
    expect(TRACKING_STATE_REL).toBe('追踪/_tracking-state.json')
    expect(trackingDeltaRel(2)).toBe('追踪/逐章记录/第002章.md')
  })
  test('placeholder detects stub 开放项：无', () => {
    expect(isTrackingDeltaPlaceholder('# 第002章 逐章记录\n\n开放项：无\n')).toBe(true)
    expect(isTrackingDeltaPlaceholder('')).toBe(true)
    expect(isTrackingDeltaPlaceholder('# 第002章\n楚弦进入规则怪谈，伏笔「枯手」未收。')).toBe(false)
  })
  test('continue window uses from+count not a single chapter_pad', () => {
    expect(trackingChapterNos('write_continue', { fromChapterNo: 2, count: 3, chapterNo: 99 })).toEqual([2, 3, 4])
    expect(trackingChapterNos('write_chapter', { chapterNo: 1 })).toEqual([1])
  })
  test('missing json or delta or placeholder is TRACKING_MISSING', () => {
    const texts: Record<string, string> = {
      '追踪/逐章记录/第001章.md': '# 第001章\n角色进场',
    }
    const read = (rel: string) => texts[rel] || ''
    const arts = [{ rel_path: '追踪/逐章记录/第001章.md', artifact_kind: 'tracking_doc' }]
    expect(evaluateChapterTrackingGate({
      verb: 'write_chapter', artifacts: arts, readText: read, chapterNos: [1],
    }).ok).toBe(false)
    texts[TRACKING_STATE_REL] = '{"last_committed_chapter":1}'
    arts.push({ rel_path: TRACKING_STATE_REL, artifact_kind: 'tracking_doc' })
    expect(evaluateChapterTrackingGate({
      verb: 'write_chapter', artifacts: arts, readText: read, chapterNos: [1],
    }).ok).toBe(true)
    texts['追踪/逐章记录/第001章.md'] = '# 第001章 逐章记录\n\n开放项：无\n'
    expect(evaluateChapterTrackingGate({
      verb: 'write_chapter', artifacts: arts, readText: read, chapterNos: [1],
    })).toMatchObject({ ok: false, code: 'TRACKING_MISSING' })
  })
  test('continue missing one window delta fails', () => {
    const texts: Record<string, string> = {
      [TRACKING_STATE_REL]: '{"last_committed_chapter":3}',
      '追踪/逐章记录/第002章.md': '# 第002章\nA',
      '追踪/逐章记录/第003章.md': '# 第003章\nB',
    }
    const arts = Object.keys(texts).map(rel_path => ({ rel_path, artifact_kind: 'tracking_doc' }))
    expect(evaluateChapterTrackingGate({
      verb: 'write_continue',
      artifacts: arts,
      readText: (rel) => texts[rel] || '',
      chapterNos: [2, 3, 4],
    })).toMatchObject({ ok: false, code: 'TRACKING_MISSING' })
  })
})
