import { describe, expect, test } from 'bun:test'
import {
  normalizeStoryPressureBrief,
  normalizeStoryPressureSignal,
} from './story-pressure-brief'

describe('story pressure brief helpers', () => {
  test('normalizes a pressure signal from aliases', () => {
    expect(normalizeStoryPressureSignal({
      field: 'conflict_escalation',
      title: '冲突升级',
      state: 'WARN',
      reason: '对手压力没有继续抬高。',
    })).toEqual({
      key: 'conflict_escalation',
      label: '冲突升级',
      status: 'warn',
      detail: '对手压力没有继续抬高。',
    })
  })

  test('returns null for an empty pressure signal', () => {
    expect(normalizeStoryPressureSignal({})).toBeNull()
    expect(normalizeStoryPressureSignal(null)).toBeNull()
  })

  test('builds pressure brief with weak signals and guardrails from signal details', () => {
    const brief = normalizeStoryPressureBrief({
      storyPressureBrief: {
        score: '71',
        rangeLabel: '第 4-6 章',
        pressureSources: [
          '管理局封锁证据',
          { name: '父亲账号倒计时' },
        ],
        signals: [
          {
            key: 'conflict_escalation',
            label: '冲突升级',
            status: 'warn',
            detail: '第二幕必须让封锁升级成追捕。',
          },
          {
            key: 'stakes_growth',
            label: '代价增长',
            status: 'ok',
            detail: '失败会失去维修权限。',
          },
          {
            key: 'pressure_source',
            label: '压力来源',
            status: 'needs_attention',
            detail: '不能只靠旁白说危险，要有执行者进场。',
          },
        ],
        requiredActions: ['把倒计时写成现场压力'],
      },
    })

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.score).toBe(71)
    expect(brief?.range_label).toBe('第 4-6 章')
    expect(brief?.pressure_sources).toEqual(['管理局封锁证据', '父亲账号倒计时'])
    expect(brief?.weak_signals.map((item: any) => item.key)).toEqual(['conflict_escalation', 'pressure_source'])
    expect(brief?.conflict_escalation_guardrail).toContain('封锁升级成追捕')
    expect(brief?.stakes_growth_guardrail).toContain('失去维修权限')
    expect(brief?.pressure_source_guardrail).toContain('执行者进场')
    expect(brief?.required_actions).toEqual(['把倒计时写成现场压力'])
  })

  test('returns ready when only ok signals exist and null when no content exists', () => {
    expect(normalizeStoryPressureBrief({
      signals: [{ key: 'stakes_growth', status: 'ok', detail: '代价已抬高。' }],
    })?.status).toBe('ready')

    expect(normalizeStoryPressureBrief({})).toBeNull()
  })
})
