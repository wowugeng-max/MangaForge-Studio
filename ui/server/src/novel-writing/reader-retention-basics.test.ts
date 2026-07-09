import { describe, expect, test } from 'bun:test'
import {
  normalizeHookAddictionModelCheck,
  normalizeRetentionBeat,
  normalizeRetentionDoubleEngineCheck,
  normalizeRetentionPillarsCheck,
  retentionBeatMatch,
} from './reader-retention-basics'

describe('reader retention basic sync checks', () => {
  test('normalizes retention beats and drops empty values', () => {
    expect(normalizeRetentionBeat('opening_hook', '开篇钩子', '  旧账册  当众变红  ', 'opening')).toEqual({
      key: 'opening_hook',
      label: '开篇钩子',
      text: '旧账册 当众变红',
      match_scope: 'opening',
    })

    expect(normalizeRetentionBeat('payoff_promise', '爽点承诺', '')).toBeNull()
    expect(normalizeRetentionBeat('payoff_promise', '爽点承诺', null)).toBeNull()
  })

  test('matches retention beats in opening tail and full scopes', () => {
    const openingLate = retentionBeatMatch(
      normalizeRetentionBeat('opening_hook', '开篇钩子', '旧账册当众变红', 'opening'),
      `${'过场'.repeat(460)}旧账册当众变红`,
    )
    const tailEarly = retentionBeatMatch(
      normalizeRetentionBeat('ending_question', '章末追读', '下一章追问证人', 'tail'),
      `下一章追问证人${'过场'.repeat(620)}`,
    )
    const full = retentionBeatMatch(
      normalizeRetentionBeat('information_gap', '信息缺口', '证人隐瞒账册缺页', 'full'),
      `主角发现证人隐瞒账册缺页，旧印随之发烫。`,
    )

    expect(openingLate.delivered).toBe(false)
    expect(openingLate.score).toBe(0)
    expect(tailEarly.delivered).toBe(false)
    expect(tailEarly.score).toBe(0)
    expect(full.delivered).toBe(true)
    expect(full.evidence).toEqual(['证人隐瞒账册缺页'])
  })

  test('checks the hook addiction model as trigger action reward and investment', () => {
    const check = normalizeHookAddictionModelCheck({
      trigger: '旧账册当众变红',
      action: '主角逼问证人',
      reward: '证人交出缺页',
      investment: '主角因此暴露旧印',
    }, '旧账册当众变红，主角逼问证人。证人交出缺页，主角因此暴露旧印。')

    expect(check?.key).toBe('hook_addiction_model')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBe(90)
    expect(check?.missed_steps).toEqual([])
    expect(check?.steps.map((item: any) => item.label)).toEqual(['触发', '行动', '奖励', '投入'])
  })

  test('keeps missing hook addiction steps visible when only a trigger is planned', () => {
    const check = normalizeHookAddictionModelCheck('旧账册当众变红', '旧账册当众变红。')

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(25)
    expect(check?.missed_steps).toEqual(['行动', '奖励', '投入'])
    expect(check?.missed_items).toEqual(['行动', '奖励', '投入'])
  })

  test('checks retention double engine fields and missing onion layer', () => {
    const check = normalizeRetentionDoubleEngineCheck({
      emotion_engine: '主角替受害者出头',
      hunger_engine: '证人隐瞒名单',
    }, '主角替受害者出头，证人隐瞒名单。')

    expect(check?.key).toBe('retention_double_engine')
    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(67)
    expect(check?.missed_steps).toEqual(['剥洋葱'])
    expect(check?.missed_items).toEqual(['剥洋葱'])
  })

  test('passes retention pillars when at least two planned pillars land', () => {
    const check = normalizeRetentionPillarsCheck({
      upgrade: '旧印亮起新纹路',
      resource_pressure: '主角失去通行资格',
      goal_stack: '追查黑账源头',
    }, '旧印亮起新纹路，主角失去通行资格。')

    expect(check?.key).toBe('retention_pillars')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBe(67)
    expect(check?.missed_steps).toEqual(['目标'])
    expect(check?.missed_items).toEqual(['追查黑账源头'])
  })
})
