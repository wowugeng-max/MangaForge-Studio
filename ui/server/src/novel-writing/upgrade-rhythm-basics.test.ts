import { describe, expect, test } from 'bun:test'
import {
  buildUpgradeRhythmDeterministicCheck,
  normalizeGoldfingerConflictBalanceCheck,
  normalizeGoldfingerEvolutionCheck,
  normalizeGoldfingerEvolutionContract,
  normalizeGoldfingerMultiDimensionGrowthCheck,
  normalizeGoldfingerSimplicityCheck,
  normalizeUpgradeBridgeRhythmCheck,
  normalizeUpgradeEmotionModuleCheck,
  normalizeUpgradeFeedbackCheck,
  normalizeUpgradeGainCheck,
  normalizeUpgradeGapCheck,
  normalizeUpgradeRankingLadderCheck,
  scanUpgradeAftermathRisks,
  upgradeRhythmAnchorScore,
  upgradeRhythmArray,
  upgradeRhythmPriority,
} from './upgrade-rhythm-basics'

describe('upgrade rhythm basic sync checks', () => {
  test('normalizes upgrade rhythm items from strings and asset-like objects', () => {
    expect(upgradeRhythmArray(['升级前缺口'], { name: '隐藏工具箱', summary: '新能力' })).toEqual(
      expect.arrayContaining(['升级前缺口', '隐藏工具箱']),
    )
  })

  test('scores upgrade rhythm anchors with matched evidence', () => {
    const anchor = upgradeRhythmAnchorScore(['隐藏工具箱解锁'], '系统提示隐藏工具箱解锁，客户当场加价。', 18)

    expect(anchor.missed).toEqual([])
    expect(anchor.score).toBeGreaterThanOrEqual(18)
    expect(anchor.evidence.length).toBeGreaterThan(0)
  })

  test('detects upgrades that do not show new ability or rebuild the next threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶，面板上多了一行奖励。',
      '',
      '众人点头，掌柜也松了口气，事情就这样结束。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('upgrade_aftermath_missing_1')
    expect(checks[0].fix).toContain('新能力威力')
    expect(checks[0].fix).toContain('更高门槛')
  })

  test('does not flag upgrades that show a new ability and introduce a higher threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶。',
      '',
      '他第一次看见设备内壁隐藏裂纹，指尖一压，三秒内修好那台报废进口机，客户当场改口加价。',
      '',
      '然而屏幕随即弹出医院设备的红色警报：下一台机器必须在十分钟内完成。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('confirms upgrade gap when pressure before upgrade is visible', () => {
    const check = normalizeUpgradeGapCheck(['权限卡住'], '升级前，协会权限卡住他，客户质疑他的资格，所有人都等着看笑话。')

    expect(check?.key).toBe('upgrade_gap')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('升级前缺口可见')
  })

  test('confirms upgrade gain when new ability and resources change the situation', () => {
    const check = normalizeUpgradeGainCheck(
      ['解锁隐藏工具箱'],
      '系统提示解锁隐藏工具箱，新能力让客户主动加价，协会恢复授权。',
    )

    expect(check?.key).toBe('upgrade_gain_plan')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('升级收获可见')
  })

  test('confirms feedback loop when immediate effect and delayed threshold are both visible', () => {
    const check = normalizeUpgradeFeedbackCheck(
      ['即时反馈和延迟反馈'],
      '系统提示熟练度+10，他第一次识别出隐藏错误链，当场修复以前做不到的设备。然而第二份封单弹出医院设备红色警报，下一目标是更高门槛。',
    )

    expect(check?.key).toBe('feedback_loop')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['即时反馈可见', '新能力/以前做不到的事可见', '延迟反馈/新门槛可见']))
  })

  test('warns when feedback loop explicitly has no new effect or threshold', () => {
    const check = normalizeUpgradeFeedbackCheck(
      ['即时反馈和延迟反馈'],
      '系统提示等级提升，但没有展示新能力，没有以前做不到的事，没有新门槛，事情到这里结束。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(12)
    expect(check?.evidence).toContain('显式缺少升级后果')
  })

  test('confirms emotion module and bridge rhythm signals', () => {
    const emotion = normalizeUpgradeEmotionModuleCheck(
      ['被质疑后展示能力'],
      '他被质疑后展示能力，旁观者震惊改口，爽点从被质疑转成掌控。',
    )
    const bridge = normalizeUpgradeBridgeRhythmCheck(
      ['兑现爽感并承上启下'],
      '兑现爽感后承上启下，第二份封单指向医院设备，红色警报抬出更高门槛和下一目标。',
    )

    expect(emotion?.delivered).toBe(true)
    expect(emotion?.evidence).toContain('情绪模块/爽点落差可见')
    expect(bridge?.delivered).toBe(true)
    expect(bridge?.evidence).toContain('桥段承接/新门槛可见')
  })

  test('normalizes and confirms goldfinger evolution without core drift', () => {
    expect(normalizeGoldfingerEvolutionContract({
      coreFunction: '维修系统识别错误码',
      allowedExtensions: ['隐藏错误链识别'],
      forbiddenDrifts: ['改写天道'],
      currentStage: '二阶',
    })).toEqual({
      core_function: '维修系统识别错误码',
      current_stage: '二阶',
      allowed_extensions: ['隐藏错误链识别'],
      forbidden_drifts: ['改写天道'],
      foreshadowing: [],
    })

    const check = normalizeGoldfingerEvolutionCheck(
      {
        core_function: '维修系统识别错误码',
        allowed_extensions: ['隐藏错误链识别'],
        forbidden_drifts: ['改写天道'],
      },
      '维修系统识别错误码仍然围绕核心作用，这次只是解锁隐藏错误链识别的新使用方式。',
    )

    expect(check?.key).toBe('goldfinger_evolution_drift')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('核心作用仍在')
  })

  test('warns when goldfinger jumps to world scale without foreshadowing', () => {
    const check = normalizeGoldfingerEvolutionCheck(
      { core_function: '维修系统识别错误码' },
      '维修系统识别错误码后，他突然掌控天道，此前没有任何伏笔。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('升华缺少伏笔')
  })

  test('checks goldfinger conflict balance, simplicity, and multi-dimension growth', () => {
    const balance = normalizeGoldfingerConflictBalanceCheck(
      ['刚好解决当前矛盾并暴露更高门槛'],
      '金手指隐藏工具箱刚好识别权限危机，修好设备改变局势拿到授权，却暴露医院设备红色警报和更高门槛。',
    )
    const simplicity = normalizeGoldfingerSimplicityCheck(
      ['功能、触发条件、奖励反馈和升级规则一眼就懂'],
      '金手指简单清晰，一眼就懂：核心作用是面板识别错误码，触发条件是接触设备，当场识别；奖励反馈是熟练度+10，升级规则指向下一门槛。',
    )
    const growth = normalizeGoldfingerMultiDimensionGrowthCheck(
      ['词条、功能、条件反馈同步变化'],
      '词条静音校准升级，新功能解锁隐藏错误链，完成订单获得条件-反馈，熟练度进入下一阶段。',
    )

    expect(balance?.delivered).toBe(true)
    expect(simplicity?.delivered).toBe(true)
    expect(growth?.delivered).toBe(true)
    expect(growth?.evidence).toEqual(expect.arrayContaining(['词条/特性成长可见', '功能/子能力成长可见', '条件-反馈链可见']))
  })

  test('warns when goldfinger is overpowered and clears every conflict', () => {
    const check = normalizeGoldfingerConflictBalanceCheck(
      ['刚好解决当前矛盾并暴露更高门槛'],
      '金手指一键解决所有问题，所有对手全部认输，矛盾彻底消失，没有更大矛盾。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('金手指过强或一键清场')
  })

  test('confirms ranking ladder when ranking creates opponent and aftershock', () => {
    const check = normalizeUpgradeRankingLadderCheck(
      ['排名提升后挂出下一名和资源变化'],
      '维修榜排名从榜外升到第十名，榜单介绍下一名竞争者，客户群订单上涨，协会重新评价权限，下一章排名碰撞继续。',
    )

    expect(check?.key).toBe('ranking_ladder_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['排名/名次变化可见', '榜单带出新对手/下一名', '装逼余震影响态度/资源/规则评价']))
  })

  test('builds deterministic upgrade rhythm warning for hard failures', () => {
    const check = buildUpgradeRhythmDeterministicCheck('主角突然升级，奖励到账，大家都点头，但没有展示新能力，也没有新门槛，事情到这里结束。')

    expect(check?.key).toBe('upgrade_rhythm_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['突然升级', '缺新能力展示', '缺新门槛']))
  })

  test('prioritizes upgrade rhythm repairs', () => {
    expect(upgradeRhythmPriority([
      { key: 'feedback_loop' },
      { key: 'ranking_ladder_rules' },
    ])).toBe('优先补榜单升级动力')

    expect(upgradeRhythmPriority([
      { key: 'upgrade_gain_plan' },
      { key: 'upgrade_gap' },
    ])).toBe('优先补升级前缺口')
  })
})
