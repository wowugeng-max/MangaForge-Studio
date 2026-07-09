import { describe, expect, test } from 'bun:test'
import {
  buildGoldenThreeBrief,
  goldenThreePhaseLabel,
  normalizeGoldenThreeBrief,
} from './golden-three-brief'

describe('golden-three brief helpers', () => {
  test('labels the first three launch phases', () => {
    expect(goldenThreePhaseLabel(1)).toBe('第一章启动')
    expect(goldenThreePhaseLabel(2)).toBe('第二章升级')
    expect(goldenThreePhaseLabel(3)).toBe('第三章追读')
  })

  test('normalizes explicit golden-three brief and rejects chapters outside launch range', () => {
    const brief = normalizeGoldenThreeBrief({
      goldenThreeBrief: {
        chapterNo: 2,
        phaseLabel: '第二章压强升级',
        hardRequirements: ['承接第一章危机', '承接第一章危机', '制造新阻碍'],
        payoffTargetCount: 1,
        currentChapterPayoffs: ['拿到旧徽章'],
      },
    })

    expect(brief?.chapter_no).toBe(2)
    expect(brief?.phase_label).toBe('第二章压强升级')
    expect(brief?.payoff_target_count).toBe(2)
    expect(brief?.hard_requirements).toEqual(['承接第一章危机', '制造新阻碍'])
    expect(normalizeGoldenThreeBrief({ chapterNo: 4 })).toBeNull()
  })

  test('uses explicit brief from chapter target before generating defaults', () => {
    const brief = buildGoldenThreeBrief({}, {
      chapter_target: {
        chapter_no: 1,
        goldenThreeBrief: {
          phaseLabel: '定制启动',
          hardRequirements: ['主角第一幕必须主动选择'],
        },
      },
    })

    expect(brief?.phase_label).toBe('定制启动')
    expect(brief?.hard_requirements).toEqual(['主角第一幕必须主动选择'])
  })

  test('builds default launch constraints from scene briefs and project promise', () => {
    const brief = buildGoldenThreeBrief(
      { synopsis: '旧城维修师用失传协议破开封锁。' },
      {
        chapter_target: {
          chapter_no: 3,
          summary: '主角追踪父亲账号。',
          opening_hook: '父亲账号在深夜重新上线。',
          ending_hook: '账号发来下一处禁区坐标。',
          reader_payoff: '主角拿到第一张禁区地图。',
        },
        writing_bible: {
          promise: '技术破局与身份反转',
        },
      },
      [
        {
          reader_payoff: '主角破解门禁。',
          reversal: '门禁背后是父亲旧账号。',
          ending_hook_seed: '旧账号定位到下一座塔。',
        },
      ],
    )

    expect(brief?.chapter_no).toBe(3)
    expect(brief?.phase_label).toBe('第三章追读')
    expect(brief?.hard_requirements).toContain('第三章有追读理由')
    expect(brief?.opening_requirements.join('；')).toContain('父亲账号')
    expect(brief?.ending_requirements.join('；')).toContain('账号发来下一处禁区坐标')
    expect(brief?.current_chapter_payoffs).toContain('主角破解门禁。')
  })
})
