import { describe, expect, test } from 'bun:test'
import {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from './dialogue-balance'

describe('dialogue balance scan utilities', () => {
  test('detects consecutive dialogue lines that share the same explanatory voice', () => {
    const checks = scanDialogueVoiceSamenessRisks([
      '第12章 管理员',
      '"所以这件事的关键在于门禁记录，而不是谁先到了走廊。"',
      '"所以这件事的关键在于广播时间，而不是你看到的影子。"',
      '"所以这件事的关键在于钥匙编号，而不是管理员说了什么。"',
      '"所以这件事的关键在于墙上的名单，而不是他们现在承认什么。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_voice_sameness_lines_2_5')
    expect(checks[0].label).toBe('角色声线趋同扫描')
    expect(checks[0].evidence).toContain('门禁记录')
    expect(checks[0].evidence).toContain('墙上的名单')
    expect(checks[0].fix).toContain('口癖')
    expect(checks[0].fix).toContain('身份措辞')
  })

  test('detects long uninterrupted dialogue runs without breathing beats', () => {
    const checks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
      '"登记表在管理员手里。"',
      '"所以要先拿到登记表。"',
      '"拿不到呢？"',
      '"那就逼管理员自己拿出来。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_breath_lines_2_11')
    expect(checks[0].label).toBe('对白呼吸感扫描')
    expect(checks[0].evidence).toContain('你先别开门')
    expect(checks[0].evidence).toContain('逼管理员自己拿出来')
    expect(checks[0].fix).toContain('换气')
    expect(checks[0].fix).toContain('环境')
  })

  test('does not flag dialogue breath when action breaks the run', () => {
    const checks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '张智把掌心压在门把上，先听了一次门外的呼吸声。',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects dialogue power balance risks when both sides explain at length in pressure scenes', () => {
    const checks = scanDialoguePowerBalanceRisks([
      '第12章 管理员',
      '',
      '「你以为把门关上就有用吗？我告诉你，今晚宿舍每个人都看见你拿了那张卡，你现在不开门，明天就等着全楼一起指认你。」',
      '「你不要以为这样就能吓住我，我已经把监控时间、值班表和门锁记录都查过了，你们所谓的证据只是诱导我违反规则。」',
      '门缝里的水迹停住了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_power_balance')
    expect(checks[0].label).toBe('对白权力差扫描')
    expect(checks[0].evidence).toContain('你以为把门关上就有用吗')
    expect(checks[0].evidence).toContain('你不要以为这样就能吓住我')
    expect(checks[0].fix).toContain('掌控者')
    expect(checks[0].fix).toContain('短句')
  })
})
