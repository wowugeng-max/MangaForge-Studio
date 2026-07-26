import { describe, expect, test } from 'bun:test'
import {
  buildChapterProgressBudget,
  formatChapterProgressBudgetPrompt,
} from './chapter-progress-budget'

describe('chapter progress budget', () => {
  test('flags future-outline overrun when current prose settles next-chapter plan', () => {
    const report = buildChapterProgressBudget({
      currentChapter: {
        chapter_no: 12,
        chapter_goal: '巩固餐桌掌权，处理爸爸余波',
        conflict: '家人不敢抬头',
        ending_hook: '门外传来脚步',
        raw_payload: { must_advance: ['巩固餐桌掌权'] },
      },
      futureChapters: [{
        chapter_no: 13,
        chapter_goal: '十点邻居敲门借火，江哲开门应对',
        conflict: '邻居借火试探',
        ending_hook: '钥匙插入锁孔',
        raw_payload: { must_advance: ['邻居敲门借火', '主动开门迎敌'] },
      }],
      chapterText: [
        '江哲把汤碗放下，家里人都不敢抬头。',
        '他刚想说话，门外忽然响起敲门声。',
        '邻居站在门外，说自己来借火。',
        '江哲拧动钥匙，主动开门迎敌。',
        '借火的邻居把打火机递过来，试探着往屋里看。',
      ].join('').repeat(20),
    })

    expect(report.overrun).toBe(true)
    expect(report.findings.some(item => item.key === 'progress_overrun_future_outline')).toBe(true)
    expect(report.overrun_future.join('｜')).toMatch(/邻居|敲门|借火|开门/)
  })

  test('flags cluster-covered future beat as overrun even when anchor score is low', () => {
    const futureBeat = '深夜邻居上门借东西试探虚实'
    // Current prose already plays the knock scene with different wording (>600 chars).
    let prose = '晚上十点整，敲门声准时响了。\n\n他贴着门板没动。\n\n门外的人不说话，只是又敲了三下。\n\n'
    while (prose.replace(/\s/g, '').length < 700) {
      prose += '他数着自己的呼吸，把手里的钥匙攥出了汗。楼道的声控灯亮了又灭。\n\n'
    }
    const report = buildChapterProgressBudget({
      chapterText: prose,
      currentChapter: { chapter_no: 10, chapter_goal: '主角整理线索并确认下一步计划安排' },
      futureChapters: [
        { chapter_no: 11, chapter_goal: futureBeat, summary: '', raw_payload: {} },
      ],
    })
    expect(report.overrun_future).toContain(futureBeat)
    expect(report.overrun).toBe(true)
  })

  test('flags current-plan underrun when prose misses most plan beats', () => {
    const report = buildChapterProgressBudget({
      currentChapter: {
        chapter_no: 8,
        chapter_goal: '击破电梯怪谈，救出被困住户',
        conflict: '无脸电梯怪压迫',
        ending_hook: '电梯停在负一层',
        raw_payload: { must_advance: ['击破电梯怪谈', '救出被困住户', '拿到负一层线索'] },
      },
      chapterText: ('走廊灯很暗。江哲站在门口，听着风声，心里有点烦。他抬脚走开，去倒了杯水。窗外没有动静。' + '他继续发呆。').repeat(40),
    })

    expect(report.underrun).toBe(true)
    expect(report.findings.some(item => item.key === 'progress_underrun_current_outline')).toBe(true)
    expect(report.missing_current.length).toBeGreaterThan(0)
  })

  test('exposes hard rules for generation prompt', () => {
    const report = buildChapterProgressBudget({
      currentChapter: {
        chapter_no: 1,
        chapter_goal: '开局进入怪谈小区',
        conflict: '门禁吞卡',
      },
      futureChapters: [{
        chapter_no: 2,
        chapter_goal: '物业下发清理通知',
      }],
    })
    const lines = formatChapterProgressBudgetPrompt(report)
    expect(lines.join('\n')).toMatch(/章节进度预算/)
    expect(lines.join('\n')).toMatch(/禁止提前/)
  })
})
