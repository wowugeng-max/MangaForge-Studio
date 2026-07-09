import { describe, expect, test } from 'bun:test'
import {
  buildChapterInnovationBrief,
  innovationBeatMatch,
  normalizeInnovationBeat,
  normalizeInnovationBrief,
} from './innovation-basics'

describe('innovation basic sync checks', () => {
  test('normalizes non-empty innovation beats and drops empty values', () => {
    expect(normalizeInnovationBeat('chapter_angle', '创新角度', '  旧规则  被新证词 反转  ')).toEqual({
      key: 'chapter_angle',
      label: '创新角度',
      text: '旧规则 被新证词 反转',
    })

    expect(normalizeInnovationBeat('execution_point_1', '执行点', '')).toBeNull()
    expect(normalizeInnovationBeat('execution_point_1', '执行点', null)).toBeNull()
  })

  test('uses the relaxed chapter angle threshold with two pieces of evidence', () => {
    const beat = normalizeInnovationBeat('chapter_angle', '创新角度', '甲乙丙丁戊己庚辛壬癸子丑')
    const checked = innovationBeatMatch(beat, '本章只落了甲乙x庚辛两个创新锚点。')

    expect(checked.delivered).toBe(true)
    expect(checked.score).toBeGreaterThanOrEqual(20)
    expect(checked.score).toBeLessThan(22)
    expect(checked.evidence.length).toBeGreaterThanOrEqual(2)
  })

  test('uses stricter thresholds for execution points than differentiation guardrails', () => {
    const expected = '甲乙丙丁戊己庚辛壬癸子丑'
    const prose = '本章只落了甲乙x戊己y庚辛z子丑四个锚点。'
    const execution = innovationBeatMatch(
      normalizeInnovationBeat('execution_point_1', '执行点', expected),
      prose,
    )
    const guardrail = innovationBeatMatch(
      normalizeInnovationBeat('differentiation_guardrail_1', '差异护栏', expected),
      prose,
    )

    expect(execution.score).toBeGreaterThanOrEqual(38)
    expect(execution.score).toBeLessThan(44)
    expect(execution.delivered).toBe(false)
    expect(guardrail.delivered).toBe(true)
  })

  test('keeps beat fields and evidence when the innovation text is fully delivered', () => {
    const checked = innovationBeatMatch(
      normalizeInnovationBeat('ip_adaptation_hook_1', 'IP化场面', '公开审判时账册显影'),
      '公开审判时账册显影，围观者第一次看见规则代价。',
    )

    expect(checked).toMatchObject({
      key: 'ip_adaptation_hook_1',
      label: 'IP化场面',
      text: '公开审判时账册显影',
      score: 100,
      evidence: ['公开审判时账册显影'],
      delivered: true,
    })
  })

  test('normalizes innovation brief aliases and drops empty briefs', () => {
    expect(normalizeInnovationBrief({
      innovationBrief: {
        angle: '旧仓账册显影规则代价',
        actions: ['公开显影', '  旧件阵鸣  '],
        guardrails: ['不得写成普通开挂碾压'],
        ipHooks: ['祠堂公开审判'],
      },
    })).toEqual({
      chapter_angle: '旧仓账册显影规则代价',
      execution_points: ['公开显影', '旧件阵鸣'],
      differentiation_guardrails: ['不得写成普通开挂碾压'],
      ip_adaptation_hooks: ['祠堂公开审判'],
    })

    expect(normalizeInnovationBrief({ innovationBrief: {} })).toBeNull()
    expect(normalizeInnovationBrief([])).toBeNull()
  })

  test('builds chapter innovation brief from scene briefs and longform compass', () => {
    const brief = buildChapterInnovationBrief(
      {
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['系统修旧件反转规则'],
            },
          },
        },
      },
      {
        chapter_target: {
          signature_scene_brief: {
            signature_scene: '祠堂账册当众显影。',
            reader_payoff: '围观者看见规则代价！',
          },
          reader_payoff: '掌院改口。',
          innovation_guardrails: ['创新必须服务复核主线。'],
        },
      },
      [
        {
          title: '旧仓复核',
          short_drama_scene: '旧件阵鸣',
          conflict: '执事封锁入口',
          reader_payoff: '旧件启动',
          rule_pressure: '复核时限倒计时',
          reversal: '证词反噬执事',
        },
      ],
      {
        axes: [
          { key: 'innovation_hook', value: '旧规则被显影旧件反转' },
          { key: 'world_hook', value: '宗门账册有活体阵纹' },
        ],
      },
    )

    expect(brief).toEqual({
      chapter_angle: '旧规则被显影旧件反转',
      execution_points: ['旧件启动', '复核时限倒计时', '证词反噬执事', '祠堂账册当众显影', '围观者看见规则代价', '掌院改口'],
      differentiation_guardrails: [
        '不得写成普通开挂碾压',
        '不得把创新卖点降级成通用套路桥段',
        '新增人物、道具、支线必须服务本章创新角度和长期读者承诺',
        '创新必须服务复核主线。',
      ],
      ip_adaptation_hooks: ['旧仓复核', '旧件阵鸣', '执事封锁入口', '祠堂账册当众显影'],
    })
  })

  test('builds default innovation guardrails even when no angle is available', () => {
    expect(buildChapterInnovationBrief({}, {}, [], null)).toEqual({
      chapter_angle: '',
      execution_points: [],
      differentiation_guardrails: [
        '不得写成普通开挂碾压',
        '不得把创新卖点降级成通用套路桥段',
        '新增人物、道具、支线必须服务本章创新角度和长期读者承诺',
      ],
      ip_adaptation_hooks: [],
    })
  })
})
