import { describe, expect, test } from 'bun:test'
import {
  buildRollingRhythmPreflight,
  normalizeRecentFatigueBrief,
  normalizeRecentFatigueSignal,
  resolveEffectiveQualityThreshold,
} from './rolling-rhythm-preflight'

describe('rolling rhythm preflight helpers', () => {
  test('normalizes recent fatigue signal aliases', () => {
    expect(normalizeRecentFatigueSignal({
      field: 'repeated_reader_payoff_type',
      title: '回报形态重复',
      state: 'WARN',
      reason: '连续三章都是旁观者震惊。',
    })).toEqual({
      key: 'repeated_reader_payoff_type',
      label: '回报形态重复',
      status: 'warn',
      detail: '连续三章都是旁观者震惊。',
    })
  })

  test('builds recent fatigue brief with default variation guardrails', () => {
    const brief = normalizeRecentFatigueBrief({
      recentFatigueBrief: {
        status: 'needs_attention',
        chapterRangeLabel: '第9-18章',
        summary: '最近章节执事压迫重复。',
        signals: [
          {
            key: 'repeated_reader_payoff_type',
            label: '回报形态重复',
            status: 'warn',
            detail: '回报形态重复，连续三章都是围观震惊。',
          },
          {
            key: 'scene_freshness',
            label: '场面新鲜度',
            status: 'ok',
            detail: '已有新空间动作。',
          },
        ],
        nextActions: ['下一章必须更换压迫来源，并补一个新的可视化场面。'],
      },
    })

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.chapter_range_label).toBe('第9-18章')
    expect(brief?.fatigue_risks.join('；')).toContain('回报形态重复')
    expect(brief?.risk_signals).toHaveLength(2)
    expect(brief?.conflict_variation).toContain('更换压迫来源')
    expect(brief?.payoff_variation).toContain('更换回报形态')
    expect(brief?.scene_freshness).toContain('可视化场面')
  })

  test('builds rolling rhythm preflight for expectation vacuum and repetition risks', () => {
    const preflight = buildRollingRhythmPreflight({
      chapter_target: {
        recent_fatigue_brief: {
          signals: [
            {
              key: 'ending_suspense_hook_gap',
              label: '章末钩子缺口',
              status: 'warn',
              detail: '缺少明确章末钩子，容易断期待。',
            },
            {
              key: 'repeated_reader_payoff_type',
              label: '回报形态重复',
              status: 'warn',
              detail: '同一核心梗连续3次以上无差异化。',
            },
          ],
          next_actions: ['下一章必须更换章末问题。'],
        },
      },
      batch_preflight: {
        warnings: ['卖点偏移：爽点没有接回题材长板。'],
      },
    })

    expect(preflight?.status).toBe('needs_attention')
    expect(preflight?.principle).toBe('拉期待速度 > 断期待速度')
    expect(preflight?.expectation_vacuum_risks.join('；')).toContain('期待真空')
    expect(preflight?.expectation_first_aid).toContain('突发意外：让不按计划发展的事件强行介入，立刻恢复现场压力。')
    expect(preflight?.selling_point_drift_risks.join('；')).toContain('卖点偏移')
    expect(preflight?.repetition_boundary_risks.join('；')).toContain('同一核心梗连续3次以上无差异化')
    expect(preflight?.next_actions.join('；')).toContain('更换章末问题')
  })

  test('returns null rolling preflight when no concrete risk exists', () => {
    expect(buildRollingRhythmPreflight({
      chapter_target: {
        recent_fatigue_brief: {
          signals: [{ key: 'scene_freshness', status: 'ok', detail: '场面已更换。' }],
        },
      },
    })).toBeNull()
  })

  test('raises effective quality threshold only for recent delivery regression', () => {
    const contextPackage = {
      chapter_target: {
        recent_fatigue_brief: {
          signals: [{ key: 'recent_delivery_quality_regression', status: 'warn', detail: '质量退化。' }],
        },
      },
    }

    expect(resolveEffectiveQualityThreshold(78, contextPackage)).toBe(85)
    expect(resolveEffectiveQualityThreshold(90, contextPackage)).toBe(90)
    expect(resolveEffectiveQualityThreshold(78, {
      chapter_target: {
        recent_fatigue_brief: { signals: [{ key: 'recent_payoff_drought', status: 'warn' }] },
      },
    })).toBe(78)
    expect(resolveEffectiveQualityThreshold(78, {
      chapter_target: { recent_fatigue_brief: { signals: [{ key: 'recent_payoff_drought', status: 'warn' }] } },
      chapterTarget: {
        recentFatigueBrief: {
          signals: [{ key: 'recent_delivery_quality_regression', status: 'warn' }],
        },
      },
    })).toBe(85)
  })
})
