import { describe, expect, test } from 'bun:test'
import {
  normalizePageTurnHookBrief,
  normalizeSerialRhythmBrief,
  normalizeSerialRhythmBudgetItem,
} from './serial-rhythm-brief'

describe('serial rhythm and page-turn brief helpers', () => {
  test('normalizes scene rhythm budget items from strings and aliases', () => {
    expect(normalizeSerialRhythmBudgetItem('兑现一次身份反杀', 1)).toEqual({
      scene_no: 2,
      title: '场景2',
      word_budget: '',
      required_payoff: '兑现一次身份反杀',
      turn: '',
      ending_hook_seed: '',
    })

    expect(normalizeSerialRhythmBudgetItem({
      sceneNo: 3,
      sceneTitle: '旧账开封',
      readerPayoff: '拿到父亲账号日志',
      turningPoint: '日志显示账号刚刚上线',
      endingHookSeed: '下一处禁区坐标出现',
      wordBudget: '1800',
    }, 2)).toEqual({
      scene_no: 3,
      title: '旧账开封',
      word_budget: '1800',
      required_payoff: '拿到父亲账号日志',
      turn: '日志显示账号刚刚上线',
      ending_hook_seed: '下一处禁区坐标出现',
    })
  })

  test('builds serial rhythm guardrails from retention brief and scene briefs', () => {
    const brief = normalizeSerialRhythmBrief(
      {},
      [
        { title: '红雾电梯', reader_payoff: '破解电梯门禁', reversal: '电梯停在负十三层', ending_hook_seed: '负十三层有人回应' },
      ],
      {
        opening_hook: '电梯门牌变成父亲名字。',
        payoff_promise: '本章必须兑现一次技术反制。',
        ending_question: '回应的人是不是父亲？',
      },
      { target: 10000 },
    )

    expect(brief?.status).toBe('ready')
    expect(brief?.opening_hook_deadline).toContain('电梯门牌')
    expect(brief?.payoff_interval).toContain('每 1200-1800 字')
    expect(brief?.middle_guardrail).toContain('技术反制')
    expect(brief?.ending_hook_guardrail).toContain('回应的人是不是父亲')
    expect(brief?.scene_payoff_budget[0].required_payoff).toBe('破解电梯门禁')
    expect(brief?.anti_drag_rules.length).toBeGreaterThan(0)
  })

  test('prefers explicit serial rhythm budget over scene brief fallback', () => {
    const brief = normalizeSerialRhythmBrief({
      serialRhythmBrief: {
        scenePayoffBudget: [{ title: '显式预算', payoff: '显式回报' }],
      },
    }, [
      { title: '不应采用', reader_payoff: '场景回报' },
    ])

    expect(brief?.scene_payoff_budget).toHaveLength(1)
    expect(brief?.scene_payoff_budget[0].title).toBe('显式预算')
    expect(brief?.scene_payoff_budget[0].required_payoff).toBe('显式回报')
  })

  test('builds page-turn hook brief from target, retention, story drive, and last scene', () => {
    const brief = normalizePageTurnHookBrief(
      {},
      {
        ending_hook: '父亲账号发来禁区坐标。',
        nextStep: '去钟楼验证坐标。',
      },
      [
        { reversal: '账号签名和父亲笔迹一致。', ending_hook_seed: '钟楼坐标亮起。' },
      ],
      {
        ending_question: '父亲为什么还能登录？',
      },
      {
        causal_next_step: '下一章必须进入钟楼。',
      },
    )

    expect(brief?.status).toBe('ready')
    expect(brief?.hook_type).toBe('问题反转')
    expect(brief?.core_question).toBe('父亲为什么还能登录？')
    expect(brief?.visible_trigger).toBe('账号签名和父亲笔迹一致。')
    expect(brief?.next_chapter_pull).toBe('下一章必须进入钟楼。')
    expect(brief?.final_image).toBe('钟楼坐标亮起。')
    expect(brief?.forbidden_resolution.join('；')).toContain('不得在本章解释完整答案')
    expect(brief?.required_actions.join('；')).toContain('最后 300 字')
  })

  test('returns null when page-turn hook has no usable content', () => {
    expect(normalizePageTurnHookBrief({})).toBeNull()
  })
})
