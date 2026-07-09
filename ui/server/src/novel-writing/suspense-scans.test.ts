import { describe, expect, test } from 'bun:test'
import {
  scanObscureSuspenseRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
} from './suspense-scans'

describe('suspense scan utilities', () => {
  test('detects false suspense when a threat is immediately dismissed without cost', () => {
    const checks = scanSuspenseFalseAlarmRisks([
      '第9章 红灯',
      '',
      '广播忽然响起：“十秒后核验身份，失败者会被清除。”',
      '',
      '李辰刚把学生证按上去，感应区亮起刺眼红光。',
      '',
      '不过那只是系统误报，红光很快自己熄灭，大家都松了一口气。',
      '',
      '他们继续往楼上走。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('false_suspense_immediate_release_1_3')
    expect(checks[0].evidence).toContain('失败者会被清除')
    expect(checks[0].fix).toContain('不能立刻解除')
  })

  test('does not flag withheld information when delay has reason cost and clue', () => {
    const checks = scanSuspenseWithheldInfoRisks([
      '第9章 门后名字',
      '',
      '李辰追问：“名单上第三个名字到底是谁？”',
      '',
      '管理员压低声音：“这里有监听，我现在不能说出口。说出真名，名单会立刻改写，第三个人会被清除。”',
      '',
      '他把半张门牌推到李辰掌心：“先看第三行划掉的编号，十秒内离开这条走廊。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects obscure suspense that uses vague mystery words without concrete anchors', () => {
    const checks = scanObscureSuspenseRisks([
      '第9章 门后',
      '',
      '那个东西一直在门后，像某种无法言说的存在。',
      '',
      '没人知道那件事到底意味着什么，只觉得真相藏在更深处。',
      '',
      '某个秘密正在靠近，所有人都说不清它为什么可怕。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('obscure_suspense_without_anchor_1_3')
    expect(checks[0].evidence).toContain('无法言说')
    expect(checks[0].fix).toContain('具体威胁')
  })
})
