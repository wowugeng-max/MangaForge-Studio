import { describe, expect, test } from 'bun:test'

import {
  normalizePressureLevel,
  sceneBriefFromCard,
} from './scene-briefs'

describe('scene brief helpers', () => {
  test('normalizes pressure level into the supported 1-5 range', () => {
    expect(normalizePressureLevel('0')).toBe('')
    expect(normalizePressureLevel('2.4')).toBe(2)
    expect(normalizePressureLevel(9)).toBe(5)
  })

  test('projects scene-card execution fields into pre-draft scene briefs', () => {
    const brief = sceneBriefFromCard({
      sceneNo: 2,
      title: '审判台反压',
      sceneGoal: '主角必须亮出第二本账册',
      conflictLadderStep: '行动阻拦',
      spectatorInterestShift: '旁观商户意识到矿票资格会受影响',
      serialRiskRepairs: ['质量续航'],
      recentFatigueAction: '改用账册证据推进',
      relationshipProgressionPlan: '质疑 -> 试探协助',
      relationshipBufferZone: '信息差',
      supportingCharacterAction: '配角主动验账',
      attitudeShiftCheckpoint: '旁观转为协助',
      relationshipNextHook: '下一轮关系任务',
    }, 1)

    expect(brief.scene_no).toBe(2)
    expect(brief.scene_goal).toContain('第二本账册')
    expect(brief.conflict_ladder_step).toBe('行动阻拦')
    expect(brief.spectator_interest_shift).toContain('这跟我有关系')
    expect(brief.serial_risk_repairs).toEqual(['质量续航'])
    expect(brief.recent_fatigue_action).toContain('账册证据')
    expect(brief.relationship_progression_plan).toContain('试探协助')
    expect(brief.relationship_buffer_zone).toBe('信息差')
    expect(brief.supporting_character_action).toContain('主动验账')
    expect(brief.attitude_shift_checkpoint).toContain('协助')
    expect(brief.relationship_next_hook).toContain('关系任务')
  })

  test('compacts cyclic structured repair fields without overflowing', () => {
    const repair: any = { key: 'scene-card' }
    repair.self = repair

    const brief = sceneBriefFromCard({
      title: '循环修复',
      serialRiskRepairs: [repair],
      stateChangesExpected: [repair],
    }, 0)

    expect(brief.serial_risk_repairs.join(' ')).toContain('scene-card')
    expect(brief.state_changes_expected.join(' ')).toContain('scene-card')
  })
})
