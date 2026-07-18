import { describe, expect, test } from 'bun:test'
import { buildSerialMomentumBrief, buildReaderExpectationDebtContext } from './serial-momentum'
import { inferEndingHookType } from './ending-hook-type'

describe('inferEndingHookType', () => {
  test('classifies common hook patterns', () => {
    expect(inferEndingHookType('倒计时只剩三天')).toBe('紧急危机')
    expect(inferEndingHookType('门后露出真名名单')).toBe('突然揭示')
  })
})

describe('buildSerialMomentumBrief', () => {
  test('returns attention brief for weak recent momentum', () => {
    const brief = buildSerialMomentumBrief({ chapter_no: 4 }, [
      { chapter_no: 1, chapter_text: '主角发现线索并决定追查，反制敌人，拿到证据。章末钩子：门外传来第二声敲门。' },
      { chapter_no: 2, chapter_text: '主角打开门锁，确认名单，升级阻力，倒计时开始。章末钩子：名单上多了第四个名字。' },
      { chapter_no: 3, chapter_text: '主角继续观察环境，整理资料，等待通知。' },
    ])
    expect(brief?.version).toBe('oh_story_serial_momentum_v1')
    expect(brief?.status).toBe('needs_attention')
  })
})

describe('buildReaderExpectationDebtContext', () => {
  test('returns empty debt structure without prior expectation reviews', () => {
    const debt = buildReaderExpectationDebtContext({ chapter_no: 4, id: 4 }, [
      { chapter_no: 1, id: 1 },
      { chapter_no: 2, id: 2 },
    ], [])
    expect(debt).toEqual(expect.objectContaining({
      must_carry: [],
      keep_alive: [],
    }))
  })
})
