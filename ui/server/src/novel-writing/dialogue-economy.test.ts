import { describe, expect, test } from 'bun:test'
import {
  scanDialogueDensityRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
} from './dialogue-economy'

describe('dialogue economy scan utilities', () => {
  test('detects dialogue sections that exceed oh-story dialogue density guidance', () => {
    const checks = scanDialogueDensityRisks([
      '第12章 管理员',
      '"你必须解释门禁记录为什么提前三分钟亮起，这不是巧合。"',
      '"我没有义务解释，你们现在应该先承认自己违反了夜巡规则。"',
      '"规则写的是不得离开宿舍，可名单上的名字是在走廊里消失的。"',
      '"名单只是名单，真正决定你们能不能活下去的是广播下一次播报。"',
      '"你又在绕开问题，门禁、名单、广播三件事不可能同时出错。"',
      '"我绕开的不是问题，是你们以为自己已经看懂了规则这件事。"',
      '"所以你知道真正的触发条件，却一直让我们在错误条件里试探。"',
      '"我知道的是，继续问下去，你们会比名单上的人更早消失。"',
      '"那就说明我们问对了。"',
      '管理员手里的钥匙停在半空，第一次没有立刻插进锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_density')
    expect(checks[0].label).toContain('对白篇幅')
    expect(checks[0].evidence).toContain('对白占比')
    expect(checks[0].fix).toContain('不超过全节 40%')
  })

  test('detects face-slap dialogue where protagonist explains longer than antagonist pressure', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你输了。"',
      '"我没有输，因为昨晚监控少了三分钟，账册第三页也不是我撕的，录音和检测报告都能证明你们诱导我承认。"',
      '"解释没有用。"',
      '"转账截图、旧印编号和报告编号已经连起来了，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_protagonist_line_economy')
    expect(checks[0].label).toBe('主角台词短句扫描')
    expect(checks[0].evidence).toContain('你输了')
    expect(checks[0].evidence).toContain('我没有输')
    expect(checks[0].fix).toContain('主角台词')
    expect(checks[0].fix).toContain('短')
  })

  test('does not flag face-slap dialogue when protagonist uses short control lines', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你以为把报告拿出来就能翻案吗？旧账册、库房记录和昨晚值守名单全都指向你，现在认罪还来得及。"',
      '"第三页。"',
      '"什么第三页？"',
      '"念。"',
      '李辰把检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects interview-like question answer dialogue loops', () => {
    const checks = scanDialogueQuestionAnswerLoopRisks([
      '第12章 管理员',
      '"你昨晚在哪里？"',
      '"宿舍。"',
      '"谁能证明？"',
      '"张智。"',
      '"你为什么离开过三楼？"',
      '"广播让我去楼梯口。"',
      '门缝里的水迹往里挪了一寸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_question_answer_loop')
    expect(checks[0].label).toBe('问答式对白扫描')
    expect(checks[0].evidence).toContain('你昨晚在哪里')
    expect(checks[0].evidence).toContain('广播让我去楼梯口')
    expect(checks[0].fix).toContain('一问一答')
    expect(checks[0].fix).toContain('动作/表情/心理')
  })
})
