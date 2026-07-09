import { describe, expect, test } from 'bun:test'
import {
  scanExpectationVacuumRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanParagraphProgressionRisks,
  scanRelationshipSceneChangeRisks,
} from './progression-scans'

describe('progression scan utilities', () => {
  test('detects relationship scenes that only declare support without changing the relationship', () => {
    const checks = scanRelationshipSceneChangeRisks([
      '第8章 旁听席',
      '',
      '林青禾低声说：“我相信你。”',
      '',
      '李玄点头：“谢谢。”',
      '',
      '她又说：“我会站在你这边。”',
      '',
      '两人沉默片刻，气氛温暖起来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('relationship_scene_without_change_1_4')
    expect(checks[0].fix).toContain('信任')
    expect(checks[0].fix).toContain('边界')
  })

  test('detects expectation vacuum after a resolved trouble with no next loop', () => {
    const checks = scanExpectationVacuumRisks([
      '第10章 资格门',
      '',
      '李辰把最后一枚阵牌按进门缝。',
      '',
      '红光熄灭，管理员退后，资格门槛终于通过。',
      '',
      '大家都松了一口气，危机到这里总算结束。',
      '',
      '接下来他们只需要休息，等待新的生活开始。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('expectation_vacuum_after_resolution')
    expect(checks[0].fix).toContain('下一目标')
  })

  test('detects paragraphs that stall without action dialogue choice or information change', () => {
    const checks = scanParagraphProgressionRisks([
      '第4章 旧楼走廊',
      '',
      '走廊尽头的灯罩蒙着灰，暗黄的光落在墙皮裂缝上。',
      '',
      '空气里有潮湿的味道，像旧木柜被雨水泡过很多年。',
      '',
      '窗外的树影贴着玻璃摇晃，整个楼层安静得只剩下风声。',
      '',
      '李辰站在门口，心里生出一种说不清的压迫感。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(expect.arrayContaining([
      'consecutive_atmosphere_paragraphs',
      'paragraph_progression_stall_1',
    ]))
  })

  test('detects meaning-inflation filler without concrete consequence', () => {
    const checks = scanMeaningInflationFillerRisks([
      '第4章 旧楼走廊',
      '',
      '这一刻，李辰终于意识到自己肩上的责任比想象中更沉重，这份选择也拥有了前所未有的意义。',
      '',
      '他明白，命运已经在无声处改变，过去所有经历都在此刻汇成了一种难以言说的重量。',
      '',
      '这种成长让他变得更加坚定，也让眼前的一切显得意义深远，仿佛未来终于有了新的方向。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('meaning_inflation_filler_paragraphs_1_3')
    expect(checks[0].fix).toContain('具体后果')
  })

  test('detects narrative transition glue and unanchored jumps', () => {
    const glueChecks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '然后我翻到下一页。',
      '',
      '接着他把校规重新解释了一遍，众人才明白这条规则有多危险。',
    ].join('\n'))
    const jumpChecks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '三天后，众人已经到了赤炉城。',
      '',
      '另一边，林青禾已经站在后院。',
    ].join('\n'))

    expect(glueChecks.map(item => item.key)).toEqual(['narrative_transition_glue_line_1', 'narrative_transition_glue_line_2'])
    expect(jumpChecks.map(item => item.key)).toEqual(['time_jump_anchor_missing_line_1', 'space_jump_anchor_missing_line_2'])
  })
})
