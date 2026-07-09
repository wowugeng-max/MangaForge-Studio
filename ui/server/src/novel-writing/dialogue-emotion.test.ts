import { describe, expect, test } from 'bun:test'
import {
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
} from './dialogue-emotion'

describe('dialogue emotion scan utilities', () => {
  test('detects abrupt dialogue emotion jumps without transition beats', () => {
    const checks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我快撑不住了，门后那东西一直在笑。"',
      '"哈哈，别紧张，今晚还挺有意思的。"',
      '走廊的灯没有任何变化。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_emotion_continuity_lines_2_3')
    expect(checks[0].label).toBe('对白情绪连续性扫描')
    expect(checks[0].evidence).toContain('快撑不住了')
    expect(checks[0].evidence).toContain('还挺有意思')
    expect(checks[0].fix).toContain('过渡动作')
    expect(checks[0].fix).toContain('情绪台阶')
  })

  test('detects procedural responses that ignore the previous line emotion', () => {
    const brokenChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"按流程，先把钥匙编号，再记录门牌和名单。"',
      '走廊里只有纸页翻动的声音。',
    ].join('\n'))
    const anchoredChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"我知道你怕。看着我，先呼吸，钥匙给我，我来编号。"',
      '张智把手压在门把上，没有立刻开门。',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('dialogue_emotion_nonresponse_lines_2_3')
    expect(brokenChecks[0].label).toBe('对白情绪承接扫描')
    expect(brokenChecks[0].evidence).toContain('求你别开门')
    expect(brokenChecks[0].evidence).toContain('按流程')
    expect(brokenChecks[0].fix).toContain('回应上一句对方的情绪状态')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('detects dialogue that makes a character instantly persuaded by explanation', () => {
    const checks = scanDialogueEasyPersuasionRisks([
      '第12章 管理员',
      '"因为广播只在整点响，所以门后的不是管理员。"',
      '"只要你现在把钥匙交给我，我们就能避开下一轮点名。"',
      '"你说得对，我被你说服了，就按你说的办。"',
      '门外仍然没有任何动静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_easy_persuasion_lines_2_4')
    expect(checks[0].label).toBe('对白说服人物扫描')
    expect(checks[0].evidence).toContain('因为广播只在整点响')
    expect(checks[0].evidence).toContain('你说得对')
    expect(checks[0].fix).toContain('突发状况')
    expect(checks[0].fix).toContain('证据')
  })
})
