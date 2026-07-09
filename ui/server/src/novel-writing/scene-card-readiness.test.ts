import { describe, expect, test } from 'bun:test'

import {
  sceneCardConceptSearchText,
  sceneCardGoalObstacleChangeGaps,
  sceneCardMentionsConcept,
} from './scene-card-readiness'

describe('scene card readiness helpers', () => {
  test('detects missing dramatic unit parts from scene-card fields', () => {
    const missing = sceneCardGoalObstacleChangeGaps({
      purpose: '主角必须进入账房确认旧账来源',
      required_beats: ['找到封存账册'],
      state_changes_expected: ['拿到账册后关系和权限变成新状态'],
    })

    expect(missing).toEqual(['阻碍'])
  })

  test('reads camelCase scene-card fields when checking dramatic unit parts', () => {
    const missing = sceneCardGoalObstacleChangeGaps({
      sceneGoal: '主角想拿回矿票资格',
      opposingForce: '执事拦住门口并威胁取消资格',
      endingHookSeed: '新名单出现，下一轮规则提前生效',
    })

    expect(missing).toEqual([])
  })

  test('finds explicit concept mentions across scene-card execution fields', () => {
    const card = {
      title: '蓝晶试炼',
      required_beats: ['先写蓝晶灼手，不解释等级'],
      state_changes_expected: ['蓝晶确认只能读残片'],
    }

    expect(sceneCardConceptSearchText(card)).toContain('蓝晶灼手')
    expect(sceneCardMentionsConcept(card, '蓝晶')).toBe(true)
    expect(sceneCardMentionsConcept(card, '黑铁令')).toBe(false)
  })
})
