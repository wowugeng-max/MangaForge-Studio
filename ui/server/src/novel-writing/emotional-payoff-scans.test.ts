import { describe, expect, test } from 'bun:test'

import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
  textHasDownwardSafetySignal,
} from './emotional-payoff-scans'

describe('emotional payoff deterministic scans', () => {
  test('exports reusable downward pressure and safety detectors for serial momentum checks', () => {
    expect(paragraphHasDownwardPressure('主任当众撕碎申请表，冷声说他不配参加终审。')).toBe(true)
    expect(paragraphHasDownwardPressure('他沿着走廊往前走，灯光很安静。')).toBe(false)
    expect(paragraphHasOppressionPressure('执事把名册摔到脚边，逼他跪下认罪。')).toBe(true)
    expect(paragraphHasOppressionPressure('执事把名册递给他，让他核对。')).toBe(false)
    expect(textHasDownwardSafetySignal('袖口里的录音红点还亮着，证据已经备份。')).toBe(true)
    expect(textHasDownwardSafetySignal('台下的人沉默看着他。')).toBe(false)
  })

  test('detects downward pressure without reader safety signal', () => {
    const checks = scanDownwardSafetyRisks([
      '第12章 公审台',
      '',
      '主任当众把李辰的申请表撕碎，冷声说他这种人不配参加终审。',
      '',
      '台下几个学生跟着笑起来，有人故意把他的资料踢到地上。',
      '',
      '副考官宣布他的资格暂时冻结，如果再申诉就直接记过。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('downward_without_safety_1_3')
    expect(checks[0]?.fix).toContain('锅是别人的')
  })

  test('detects oppression that does not serve payoff or information gain', () => {
    const checks = scanOppressionPurposeRisks([
      '第12章 审判台',
      '',
      '执事把名册摔到李玄脚边，逼他跪下认罪。',
      '',
      '台下弟子跟着哄笑，有人骂他废物，有人让他滚出阵堂。',
      '',
      '李玄低头沉默，任由那些话砸在身上。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('oppression_without_purpose_1_3')
    expect(checks[0]?.fix).toContain('信息收益')
  })

  test('detects long stretches without visible reader payoff', () => {
    const dryParagraph = '李辰沿着旧楼的走廊往前走，墙上的值日表被风吹得轻轻晃动，地面积着一层潮气，他停下来听了听远处的广播，又把昨天整理过的资料重新在脑子里过了一遍。'
    const checks = scanPayoffDensityRisks([
      '第12章 旧楼长廊',
      '',
      dryParagraph.repeat(12),
      '',
      '他把资料收回包里，继续往楼梯口走去。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('payoff_density_gap_1_2')
    expect(checks[0]?.fix).toContain('信息增量')
  })

  test('treats rule-object and permission reveals as visible reader payoff', () => {
    const pressure = '履带车碾碎药铺门前的青石，黑袍男人把封锁令钉进碎石，惨绿死线从令牌边缘拉出。'
    const ruleReveal = '江哲翻过秩序核心，背面露出临时通行资格，单片眼镜里的权限进度也被照胆鼎反向照出。'
    const checks = scanPayoffDensityRisks([
      '第10章 镇门封锁',
      '',
      pressure.repeat(12),
      '',
      ruleReveal,
      '',
      pressure.repeat(12),
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('treats naming, possession, and causality reveals as reader payoff', () => {
    const pressure = '黑衣人合围上来，三十六支枪口同时充能，惨绿雾气贴着石板翻卷。'
    const reveal = '老陈咬着血沫说出定名规则：异常者的因果会被锁死，命格会变成夺舍容器。'
    const checks = scanPayoffDensityRisks([
      '第10章 定名',
      '',
      pressure.repeat(12),
      '',
      reveal,
      '',
      pressure.repeat(12),
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('breaks long payoff-density gaps on fate and possession rule reveals', () => {
    const dry = '黑衣人沿着门缝推进，旧药柜一排排倒下，雾气压低灯火，江哲只能把老陈护在身后，听见街外铁靴碾过碎石，门轴在压力下咯吱作响。'
    const reveal = '老陈咬破舌尖，把定名、异常者、因果锁死、命格称量和夺舍容器串成同一条线。江哲终于知道右盘要抢的不是身体，而是能被外神规则接管的身份。'
    const checks = scanPayoffDensityRisks([
      '第10章 定名',
      '',
      ...Array.from({ length: 7 }, () => dry).flatMap(paragraph => [paragraph, '']),
      reveal,
      '',
      ...Array.from({ length: 6 }, () => dry).flatMap(paragraph => [paragraph, '']),
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('breaks payoff-density gaps on public verdict and rule reversal beats', () => {
    const dry = '追索者沿着废墟推进，枪口压住门框，雾气盖住屋檐，江哲只能挡在老陈身前，听见履带车的铁齿一节节碾过碎瓦。'
    const payoff = '天平停平，镜片中央弹出三行结果：【理智值：100】【灵能波动：无】【判定：凡人（无污染）】。规则成了反锁住追索者双手的铁环，黑袍男人被迫让开道路。'
    const checks = scanPayoffDensityRisks([
      '第10章 镇门危局',
      '',
      ...Array.from({ length: 8 }, () => dry).flatMap(paragraph => [paragraph, '']),
      payoff,
      '',
      ...Array.from({ length: 8 }, () => dry).flatMap(paragraph => [paragraph, '']),
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects repeated payoff beats without escalation', () => {
    const checks = scanPayoffEscalationRisks([
      '第12章 连环反击',
      '',
      '李辰拿出第一份报告，台下所有人震惊，对面的学生脸色发白。',
      '',
      '他又拿出第二份报告，所有人再次震惊，那个学生彻底说不出话。',
      '',
      '他继续拿出第三份报告，全场还是震惊，对方只能低头认输。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('payoff_escalation_flat_1_3')
    expect(checks[0]?.fix).toContain('影响范围')
  })

  test('detects trump cards or goldfingers revealed without visible effect', () => {
    const checks = scanTrumpCardEffectRisks([
      '第12章 试炼台',
      '',
      '李玄终于亮出袖中的底牌，残阵在掌心亮起。',
      '',
      '执事只看了一眼，冷笑道：“不过如此。”',
      '',
      '下一刻，执事反而一掌把他逼退三步，台下弟子跟着哄笑。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('trump_card_effect_missing_1')
    expect(checks[0]?.fix).toContain('金手指')
  })
})
