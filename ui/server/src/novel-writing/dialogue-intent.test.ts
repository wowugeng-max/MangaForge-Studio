import { describe, expect, test } from 'bun:test'
import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from './dialogue-intent'

describe('dialogue intent scan utilities', () => {
  test('detects face-slap dialogue that explains evidence without judgment questions', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"你现在解释也没用，旧账册已经写明你昨晚进过库房。"',
      '"我没有进库房，监控少了三分钟，账册缺页也不是我撕的，你们所谓的证据只是诱导我承认。"',
      '"那你倒是拿出证据。"',
      '"录音、检测报告和转账截图都在这里，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_judgment_questions_missing')
    expect(checks[0].label).toBe('审判式对白扫描')
    expect(checks[0].evidence).toContain('旧账册')
    expect(checks[0].fix).toContain('审判式提问')
    expect(checks[0].fix).toContain('自爆')
  })

  test('does not flag face-slap dialogue when short judgment questions force self-incrimination', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"第三页是谁撕的？"',
      '"我怎么知道第三页被撕了？"',
      '"那枚旧印为什么在你袖口？"',
      '"不可能，我明明把旧印收进暗格了。"',
      '李辰把录音和检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects dialogue that states true motive instead of subtext and agenda', () => {
    const checks = scanDialogueSubtextAgendaRisks([
      '第12章 管理员',
      '"我的目的就是让你开门，然后把规则册交出来。"',
      '李辰没有动。',
      '"你不该把真正想要的东西说得这么清楚。"',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_subtext_agenda_line_2')
    expect(checks[0].label).toBe('潜台词与议程扫描')
    expect(checks[0].evidence).toContain('我的目的')
    expect(checks[0].fix).toContain('真实动机')
    expect(checks[0].fix).toContain('借口')
    expect(checks[0].fix).toContain('试探')
  })

  test('detects empty side-character praise dialogue as fake support', () => {
    const checks = scanDialogueEmptyPraiseRisks([
      '第12章 管理员',
      '"李辰，你太厉害了，大家全靠你了。"',
      '"不愧是你，没人比得上你。"',
      '张智只看着门缝，没有接话。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_empty_praise_line_2')
    expect(checks[0].label).toBe('空泛夸赞对白扫描')
    expect(checks[0].fix).toContain('无脑夸')
    expect(checks[0].fix).toContain('剧情推进')
  })
})
