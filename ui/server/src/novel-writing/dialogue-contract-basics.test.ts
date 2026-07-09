import { describe, expect, test } from 'bun:test'
import {
  normalizeDialogueAuditCheck,
  normalizeDialogueDriveCheck,
  normalizeDialogueInformationEmbedCheck,
  normalizeDialogueGoalCheck,
  normalizeDialoguePowerCheck,
  normalizeDialogueSubtextCheck,
  normalizeDialogueVoiceCheck,
} from './dialogue-contract-basics'

describe('dialogue contract basic sync checks', () => {
  test('confirms dialogue goals when evidence key line and relationship move are visible', () => {
    const check = normalizeDialogueGoalCheck(
      ['让周薄森说漏证据来源。'],
      ['“你怎么知道账本在我手里？”'],
      ['旁观者从中立转为愿意作证。'],
      [
        '周薄森把袖口往案上一压。',
        '“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
        '李玄看着他袖口的墨点。',
        '“你怎么知道账本在我手里？”',
        '周薄森顿住。',
        '林青禾把封条递给长老。',
        '“封口是今晨开的。”',
        '旁观者的低声议论停了，原本站在周薄森身后的人退开半步。',
      ].join('\n'),
    )

    expect(check?.key).toBe('dialogue_goals')
    expect(check?.label).toBe('对白目标')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['信息差/证据推进', '关系/旁观者变化', '关键台词']))
  })

  test('warns when planned dialogue goals do not produce evidence or relationship movement', () => {
    const check = normalizeDialogueGoalCheck(
      ['让周薄森说漏证据来源。'],
      ['“你怎么知道账本在我手里？”'],
      [],
      [
        '“你来了。”',
        '“嗯，我来了。”',
        '两人把话说完，场面没有任何变化。',
      ].join('\n'),
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('让周薄森说漏证据来源。')
    expect(check?.repair_instruction).toContain('补对白目标')
  })

  test('confirms power balance when long pressure short reversal and power shift are visible', () => {
    const check = normalizeDialoguePowerCheck(
      ['掌控者/主角亮底牌时对白 ≤ 10 字', '被压制方对白 ≥ 20 字'],
      [
        '“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。别拿一句怀疑糊弄长老席。”',
        '“说漏了。”',
        '周薄森顿住，原本站在他身后的人退开半步。',
      ].join('\n'),
    )

    expect(check?.key).toBe('power_length_rules')
    expect(check?.label).toBe('权力博弈')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['被压制方长句', '掌控方短句', '权力易主反应']))
  })

  test('warns when power dialogue misses long pressure short reversal or visible shift', () => {
    const check = normalizeDialoguePowerCheck(
      ['掌控者/主角亮底牌时对白 ≤ 10 字', '被压制方对白 ≥ 20 字'],
      [
        '“我们可以继续谈。”',
        '“好。”',
        '屋里很安静。',
      ].join('\n'),
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(check?.issue).toContain('对话长度 = 权力地位')
  })

  test('confirms subtext agenda when probes and agenda collision hide the real purpose', () => {
    const check = normalizeDialogueSubtextCheck(
      ['真实动机绝对不能浅显地写在台词里。'],
      [
        '长老席前，周薄森别拿封条泼脏水。',
        '李玄盯着袖口的墨点。',
        '“你怎么知道账本在我手里？”',
        '周薄森停顿了一瞬，像是终于发现自己说漏了。',
      ].join('\n'),
    )

    expect(check?.key).toBe('subtext_agenda_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(['借口/试探/防御', '议程碰撞'])
  })

  test('warns when dialogue states the real purpose directly', () => {
    const check = normalizeDialogueSubtextCheck(
      ['真实动机绝对不能浅显地写在台词里。'],
      '“我的目的就是进门拿账本，我没有别的借口。”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('真实目的直说')
    expect(check?.repair_instruction).toContain('真实目的藏进借口')
  })

  test('confirms dialogue drive when plot expectation and character stance are visible', () => {
    const check = normalizeDialogueDriveCheck(
      ['对白必须强化期待、爽感或悬念。'],
      [
        '“你怎么知道账本在我手里？”',
        '周薄森的袖口压着墨点。',
        '林青禾愿意作证，原本站在周薄森身后的人退开半步。',
        '李玄只补了一句：“说漏了。”',
      ].join('\n'),
    )

    expect(check?.key).toBe('dialogue_drive_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['推进剧情/证据', '制造期待/悬念', '展示人设/关系']))
  })

  test('warns when dialogue drive is hollow praise or mechanical response', () => {
    const check = normalizeDialogueDriveCheck(
      ['对白必须强化期待、爽感或悬念。'],
      '“你真厉害。”\n“原来如此，那么请你告诉我。”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('存在空泛寒暄、夸赞或机械问答')
    expect(check?.repair_instruction).toContain('推进剧情、增加期待感或展示人设')
  })

  test('confirms information embedding when stance and pressure carry the facts', () => {
    const check = normalizeDialogueInformationEmbedCheck(
      ['用角色的语气和立场包裹信息。'],
      [
        '周薄森把封条压在案上。',
        '“别拿长老席泼脏水，封口是今晨开的。”',
        '李玄看着他袖口的墨点，把第二份账册递给林青禾。',
      ].join('\n'),
    )

    expect(check?.key).toBe('information_embed_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(['角色立场包裹信息', '动作/压力承接信息'])
  })

  test('warns when information is delivered as science-mouth exposition', () => {
    const check = normalizeDialogueInformationEmbedCheck(
      ['用角色的语气和立场包裹信息。'],
      '“你知道吗，血契账本的来源、规则、使用方法和历史背景都很长，所以我现在要完整解释给你听。”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('科普嘴/说明书式对白')
    expect(check?.repair_instruction).toContain('科普嘴')
  })

  test('confirms audit when dialogue is distinct oral conflict with a rhythm handoff', () => {
    const check = normalizeDialogueAuditCheck(
      ['遮住角色名后能否区分是谁在说话。'],
      [
        '周薄森：“李玄，你若真要翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
        '李玄：“说漏了。”',
        '林青禾：“封口是今晨开的。”',
        '低声议论停了，背面的线索指向第三个证人。',
      ].join('\n'),
    )

    expect(check?.key).toBe('dialogue_audit_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['自然口语/冲突语气', '遮名可区分声线', '对话结尾预示节奏变化']))
  })

  test('warns when audit catches mechanical question answer dialogue', () => {
    const check = normalizeDialogueAuditCheck(
      ['遮住角色名后能否区分是谁在说话。'],
      '“好的，那么请你告诉我。”\n“血契账本是什么？”\n“原来如此，那么下一步呢？”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('问答式一问一答')
    expect(check?.repair_instruction).toContain('问答式一问一答')
  })

  test('confirms voice differentiation when short long and fact voices are visible', () => {
    const check = normalizeDialogueVoiceCheck(
      ['李玄短句反问；周薄森长篇压迫；林青禾克制给事实。'],
      [
        '周薄森：“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
        '李玄：“你怎么知道账本在我手里？”',
        '林青禾：“封口是今晨开的。”',
      ].join('\n'),
    )

    expect(check?.key).toBe('voice_differentiation_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['短句反问', '长句压迫', '事实型发言']))
  })

  test('warns when planned voice anchors are not distinguishable in prose', () => {
    const check = normalizeDialogueVoiceCheck(
      ['李玄短句反问；周薄森长篇压迫；林青禾克制给事实。'],
      '“我们都需要继续沟通。”\n“确实如此。”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.issue).toContain('声线差异不足')
  })
})
