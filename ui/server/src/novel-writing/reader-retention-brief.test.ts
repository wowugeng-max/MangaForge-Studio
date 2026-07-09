import { describe, expect, test } from 'bun:test'
import {
  buildReaderRetentionBrief,
  first30RetentionBriefFromContext,
  normalizeReaderDropRiskBrief,
  normalizeReaderRetentionBrief,
} from './reader-retention-brief'

describe('reader retention brief helpers', () => {
  test('builds retention hooks and pillars from scene briefs and chapter target', () => {
    const brief = buildReaderRetentionBrief(
      {
        synopsis: '修复师被迫揭开旧城核心漏洞。',
        reference_config: {
          writing_bible: {
            promise: '技术破局和身份反转',
            commercial_positioning: {
              retention_strategy: '每章交付新线索和小反转',
            },
          },
        },
      },
      {
        chapter_target: {
          summary: '主角追查失控电梯。',
          conflict: '管理局封锁证据。',
          ending_hook: '电梯日志显示主角父亲还活着。',
          resource_pressure: '维修权限将在十分钟后失效。',
        },
      },
      [
        {
          title: '电梯坠停',
          opening_hook: '红雾电梯突然停在不存在的负十三层。',
          purpose: '进入禁区取回日志。',
          conflict: '安保系统反向锁门。',
          reader_payoff: '主角用旧协议反制安保。',
          information_gap: '负十三层不在城市图纸里。',
        },
        {
          title: '旧日志',
          reversal: '日志签名属于失踪父亲。',
          reader_payoff: '拿到第一份真证据。',
          ending_hook_seed: '父亲账号刚刚重新上线。',
        },
      ],
    )

    expect(brief.opening_hook).toContain('红雾电梯')
    expect(brief.payoff_promise).toContain('主角用旧协议反制安保')
    expect(brief.information_gap).toContain('负十三层')
    expect(brief.ending_question).toContain('电梯日志')
    expect(brief.retention_pillars.resource_pressure).toContain('维修权限')
    expect(brief.hook_addiction_model.investment).toContain('父亲账号')
  })

  test('normalizes camelCase retention fields and nested addiction model', () => {
    const brief = normalizeReaderRetentionBrief({
      readerRetentionBrief: {
        openingHook: '前三百字给出异常门牌。',
        payoffPromise: '本章必须兑现一次身份压制反杀。',
        retentionDoubleEngine: {
          emotionEngine: '被误解后的证明欲。',
          hungerEngine: '门牌背后是谁改的。',
        },
        retentionPillars: {
          resourcePressure: '证据只保留五分钟。',
          mysteryUnlock: '门牌编号能解出旧案坐标。',
        },
        hookAddictionModel: {
          trigger: '门牌变红。',
          rewardRandomness: '额外获得一枚旧徽章。',
        },
        forbiddenCliches: ['慢热天气开场', '慢热天气开场', '百科解释'],
      },
    })

    expect(brief?.opening_hook).toBe('前三百字给出异常门牌。')
    expect(brief?.retention_double_engine.emotion_engine).toBe('被误解后的证明欲。')
    expect(brief?.retention_pillars.resource_pressure).toBe('证据只保留五分钟。')
    expect(brief?.hook_addiction_model.reward_randomness).toBe('额外获得一枚旧徽章。')
    expect(brief?.forbidden_cliches).toEqual(['慢热天气开场', '百科解释'])
  })

  test('reads first-30 retention brief from chapter target before stale pre-draft aliases', () => {
    const brief = first30RetentionBriefFromContext({
      chapter_target: {
        first30RetentionBrief: {
          reportScore: 82,
          reportStatus: 'ready',
          requiredActions: ['开篇直接给异常现场'],
        },
      },
      preDraftBrief: {
        first30RetentionBrief: {
          reportScore: 41,
          requiredActions: ['旧动作不应优先'],
        },
      },
    })

    expect(brief?.report_score).toBe(82)
    expect(brief?.required_actions).toEqual(['开篇直接给异常现场'])
  })

  test('builds reader drop guardrails from first-30 and retention briefs', () => {
    const brief = normalizeReaderDropRiskBrief(
      {
        dropPoints: ['中段连续解释导致掉速'],
        repairActions: ['开篇300字落地异常账本', '章末留下父亲账号上线'],
      },
      {
        opening_hook: '异常账本自动写出主角名字。',
        ending_question: '父亲账号为什么还在线？',
      },
      {
        flags: ['第4-10章水设定会掉读者'],
        required_actions: ['前三章必须有现场危机'],
      },
    )

    expect(brief?.status).toBe('needs_repair')
    expect(brief?.opening_guardrail).toContain('开篇300字')
    expect(brief?.middle_guardrail).toContain('中段连续解释')
    expect(brief?.ending_guardrail).toContain('父亲账号')
  })
})
