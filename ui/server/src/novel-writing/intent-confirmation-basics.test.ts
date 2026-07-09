import { describe, expect, test } from 'bun:test'
import {
  buildIntentConfirmationDeterministicCheck,
  buildIntentConfirmationSelfReportCheck,
  intentConfirmationArray,
  intentConfirmationPriority,
  intentCostRewardPlan,
  intentConfirmationAnchorScore,
  normalizeIntentConfirmedCheck,
  normalizeIntentDialogueToneBaselineCheck,
  normalizeIntentEndingHandoffCheck,
  normalizeIntentReactionCheck,
  normalizeIntentRhythmStyleCheck,
} from './intent-confirmation-basics'

describe('intent confirmation basic sync checks', () => {
  test('normalizes nested intent confirmation values into brief strings', () => {
    const values = intentConfirmationArray(
      ['确认意图：用信息差反杀夺回解释权', { summary: '章尾承接下一问' }],
      { name: '代价收益必须可见' },
    )

    expect(values).toEqual(expect.arrayContaining(['确认意图：用信息差反杀夺回解释权', '章尾承接下一问', '代价收益必须可见']))
  })

  test('scores intent anchors with reusable anchor evidence', () => {
    const anchor = intentConfirmationAnchorScore(
      ['信息差反杀，夺回解释权'],
      '李玄抓住信息差反杀，逼周薄森改口，夺回解释权。',
      22,
    )

    expect(anchor.missed).toEqual([])
    expect(anchor.score).toBeGreaterThanOrEqual(22)
    expect(anchor.evidence.length).toBeGreaterThan(0)
  })

  test('confirms intent when pressure and information-gap evidence are visible', () => {
    const check = normalizeIntentConfirmedCheck(
      '用第二枚血契编号的信息差反杀，夺回解释权。',
      '李玄没有解释背景，只在压问里逼问第二枚血契编号，抓住信息差反杀，夺回解释权。',
    )

    expect(check?.key).toBe('confirmed_intent')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
  })

  test('warns when confirmed intent becomes generic transition narration', () => {
    const check = normalizeIntentConfirmedCheck(
      '用信息差反杀夺回解释权。',
      '大家讨论很久，事情就解决了，本章只是过渡，之后再说。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(18)
    expect(check?.evidence).toContain('泛化过渡叙事')
    expect(check?.repair_instruction).toContain('补本章意图')
  })

  test('confirms rhythm and style when visible beats support the plan', () => {
    const check = normalizeIntentRhythmStyleCheck(
      ['三轮压问，短句反击，爆发后冷却承接。'],
      '第一轮压问只用短句，第二轮反击让旁听席静了，第三轮爆发后用停顿冷却承接。',
    )

    expect(check?.key).toBe('rhythm_and_style')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when rhythm and style flatten into transition summary', () => {
    const check = normalizeIntentRhythmStyleCheck(
      ['三轮压问，短句反击，爆发后冷却承接。'],
      '本章只是过渡，大家讨论很久，均匀叙事后事情就解决了。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('均匀过渡叙事')
    expect(check?.repair_instruction).toContain('补节奏/文风')
  })

  test('extracts cost reward plan from explicit field or structure inputs', () => {
    expect(intentCostRewardPlan({ costAndReward: '公开得罪周家，但夺回解释权。' })).toBe('公开得罪周家，但夺回解释权。')
    expect(intentCostRewardPlan({ structureInputs: ['章尾承接下一问', '代价/收益：开罪长老席，拿到反证入口。'] })).toBe('代价/收益：开罪长老席，拿到反证入口。')
  })

  test('confirms ending handoff when tail carries the next question', () => {
    const check = normalizeIntentEndingHandoffCheck(
      { endingHandoff: '章尾承接：封条来源指向第三个证人。' },
      `李玄赢下这一问。${'旁观者沉默。'.repeat(200)}章尾，封条来源指向第三个证人，下一章必须追问谁给了编号。`,
    )

    expect(check?.key).toBe('ending_handoff')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
  })

  test('warns when ending handoff is pushed away', () => {
    const check = normalizeIntentEndingHandoffCheck(
      { endingHandoff: '章尾承接：封条来源指向第三个证人。' },
      '众人暂且不提封条来源，以后再讲，之后再说。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(14)
    expect(check?.repair_instruction).toContain('补章尾承接')
  })

  test('confirms information-gap reaction when witnesses react differently', () => {
    const check = normalizeIntentReactionCheck(
      ['信息差反应：对手、盟友、旁观者差异化反应。'],
      '旁听席静了，周薄森脸色变了，林青禾看懂关键，几个在场的人开始站队。',
    )

    expect(check?.key).toBe('information_gap_reaction')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBe(86)
  })

  test('warns when dialogue tone baseline turns into explanation or light comedy', () => {
    const check = normalizeIntentDialogueToneBaselineCheck(
      ['高压压问，短句冷静，逐句承接情绪。'],
      '配角开始科普，解释了很多制度和来历，轻快吐槽开玩笑，情绪跳过后直接转笑。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toEqual(expect.arrayContaining(['信息型配角或对白出现科普嘴/说明书化', '轻快/搞笑声线冲淡高压基调', '对话情绪跳步或没有承接']))
    expect(check?.repair_instruction).toContain('补对白基调')
  })

  test('builds deterministic warning for hard intent confirmation failures', () => {
    const check = buildIntentConfirmationDeterministicCheck(
      '大家讨论很久，事情就解决了。本章只是过渡，没有代价，没有收益，还说了很多背景。',
    )

    expect(check?.key).toBe('intent_confirmation_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['泛化解决', '过渡章空转', '代价收益跳过', '背景冲淡意图']))
  })

  test('detects self-report receipts that lack in-prose execution evidence', () => {
    const check = buildIntentConfirmationSelfReportCheck('确认意图已经完成，节奏/文风已落地，章尾承接可见。')

    expect(check?.key).toBe('intent_confirmation_self_report')
    expect(check?.delivered).toBe(false)
    expect(check?.issue).toContain('自证')
  })

  test('prioritizes intent confirmation repair categories', () => {
    expect(intentConfirmationPriority([
      { key: 'confirmed_intent' },
      { key: 'intent_confirmation_forbidden' },
    ])).toBe('优先清意图硬伤')

    expect(intentConfirmationPriority([
      { key: 'information_gap_reaction' },
      { key: 'dialogue_tone_baseline' },
    ])).toBe('优先校准对白基调')
  })
})
