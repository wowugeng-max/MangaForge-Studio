import { describe, expect, test } from 'bun:test'
import {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from './dialogue-humor'

describe('dialogue humor scan utilities', () => {
  test('detects meme jokes that break high pressure dialogue beats', () => {
    const checks = scanDialogueHighPressureMemeRisks([
      '血从封条下渗出来，周薄森的护卫倒在门槛边，呼吸只剩半截。',
      '“笑死，这也太会整活了吧，咱们今天算不算大型翻车现场？”',
      '李玄按住伤口，脸色沉下去。',
    ].join('\n'))
    const safeChecks = scanDialogueHighPressureMemeRisks([
      '危机解除，门已经封住，血止住了，众人终于能喘一口气。',
      '“笑死，刚才那一下差点成大型翻车现场。”',
      '李玄把封条重新压平。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_high_pressure_meme_line_2')
    expect(checks[0].label).toBe('高压玩梗扫描')
    expect(checks[0].fix).toContain('梗只在安全或喘息 beat 放')
    expect(safeChecks).toHaveLength(0)
  })

  test('detects joke delivery detached from character desire relationship or consequence', () => {
    const checks = scanDialogueDetachedJokeRisks([
      '李玄和林青禾正准备查账。',
      '“我给你讲个和剧情无关的段子，保证大家都笑死，哈哈。”',
      '他说完以后，账本、关系和下一步行动都没有任何变化。',
    ].join('\n'))
    const functionalChecks = scanDialogueDetachedJokeRisks([
      '李玄想装作没看见账本缺页，手却先把封条压歪了。',
      '林青禾看着他的手。',
      '“你这叫冷静？账本都被你按出指纹了。”',
      '旁边的执事憋住笑，随即意识到封条被碰过，立刻改口愿意作证。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_detached_joke_line_2')
    expect(checks[0].label).toBe('脱剧情段子扫描')
    expect(checks[0].fix).toContain('幽默来自角色欲望')
    expect(functionalChecks).toHaveLength(0)
  })

  test('detects humor callbacks that repeat without escalation', () => {
    const checks = scanDialogueFlatCallbackRisks([
      '上一场林青禾说李玄按歪封条很好笑。',
      '',
      '这一场她又把同一个梗重复了一遍，说法和上次一样，没有更尴尬、没有更公开，也没有更严重的后果。',
      '',
      '众人听完只是笑了一下，账本审问继续原样推进。',
    ].join('\n'))
    const upgradedChecks = scanDialogueFlatCallbackRisks([
      '上一场林青禾说李玄按歪封条很好笑。',
      '',
      '这一场她没再重复笑话，只把封条举给满堂长老看。',
      '',
      '“这回不是按歪，是按出了会长的指纹。”',
      '',
      '笑声停住，周薄森当众失去解释权，李玄也因此欠下林青禾一次公开作证的人情。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_flat_callback_line_2')
    expect(checks[0].label).toBe('回调未升级扫描')
    expect(checks[0].fix).toContain('回调必须升级')
    expect(upgradedChecks).toHaveLength(0)
  })

  test('detects humor payoffs without aftermath reaction or consequence', () => {
    const checks = scanDialogueHollowHumorPayoffRisks([
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '众人只是笑了一下，审问继续原样推进，没有关系变化，也没有后续代价。',
    ].join('\n'))
    const aftermathChecks = scanDialogueHollowHumorPayoffRisks([
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '笑声刚起就停住，执事发现封条上的指纹，当场改口作证。',
      '李玄欠下林青禾一个公开人情，下一场审问必须替她挡住会长。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_hollow_humor_payoff_line_3')
    expect(checks[0].label).toBe('包袱无余波扫描')
    expect(checks[0].fix).toContain('余波比包袱本身更重要')
    expect(aftermathChecks).toHaveLength(0)
  })
})
