import { describe, expect, test } from 'bun:test'
import {
  buildEmotionalArcDeterministicCheck,
  emotionalArcPriority,
  normalizeEmotionalSceneExecutionRulesCheck,
  normalizeEmotionalTurningRulesCheck,
  normalizeEmotionModuleRecompositionRulesCheck,
  normalizeMemePlotFormulaRulesCheck,
  normalizePayoffDensityRulesCheck,
  normalizePayoffEscalationRulesCheck,
  normalizeProgressiveConfrontationRulesCheck,
  normalizeReaderDesireFormulaRulesCheck,
} from './emotional-arc-execution-basics'

describe('emotional arc execution basic sync checks', () => {
  test('confirms emotion module recomposition when repeated units vary scene opponent emotion or stakes', () => {
    const check = normalizeEmotionModuleRecompositionRulesCheck(
      { emotion_module_recomposition_rules: ['同一爽感可以重复，但必须换场景、换对手、加新情绪或提高 stakes'] },
      '这一章继续使用退婚打脸模板，但换场景到审判庭，换对手从路人换成会长，加新情绪旧痛，并提高stakes代价复杂度。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '检测到套路/模板复用信号',
      '场景变化',
      '对手变化',
      '新增情绪角度',
      'stakes/奖励复杂度提高',
    ]))
  })

  test('warns when emotion module repeats without variation', () => {
    const check = normalizeEmotionModuleRecompositionRulesCheck(
      { emotion_module_recomposition_rules: ['重复戏剧单元时必须重组情绪模块'] },
      '重复同一个戏剧单元，同样结构，没有换场景，没有换对手，没有新情绪，stakes没有变化。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('重复戏剧单元没有换场景/对手/新情绪/stakes')
  })

  test('confirms progressive confrontation when pressure escalates before the final trump card', () => {
    const check = normalizeProgressiveConfrontationRulesCheck(
      { progressive_confrontation_rules: ['角力而非碾压，小胜后对手加码，最后王炸'] },
      '主角与反派是角力而非碾压，第一轮只用账册先赢一手，对手继续加码停业单，最后才公开备份订单，王炸一锤定音。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '角力而非碾压',
      '主角小胜/稍占上风',
      '对手继续加码',
      '最后王炸/一锤定音',
    ]))
  })

  test('warns when progressive confrontation skips opponent escalation and final trump card', () => {
    const check = normalizeProgressiveConfrontationRulesCheck(
      { progressive_confrontation_rules: ['角力而非碾压，小胜后对手加码，最后王炸'] },
      '主角一出手就一路碾压，所有人立刻服气，对抗直接结束。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺角力而非碾压',
      '缺反派继续加码',
      '缺最后王炸一锤定音',
    ]))
  })

  test('confirms meme plot formula when occur develop turn and climax are visible', () => {
    const check = normalizeMemePlotFormulaRulesCheck(
      { meme_plot_formula_rules: ['发生 -> 发展 -> 转折 -> 高潮'] },
      '梗四段式：发生 -> 发展 -> 转折 -> 高潮。停业单压到门口，误判不断积累，系统订单反向证明，高潮时全场改口，完整释放前后反差。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '发生/前提条件可见',
      '发展/挫败积累可见',
      '转折/关键手段可见',
      '高潮/完整释放可见',
    ]))
  })

  test('warns when meme plot formula jumps from premise to result', () => {
    const check = normalizeMemePlotFormulaRulesCheck(
      { meme_plot_formula_rules: ['发生 -> 发展 -> 转折 -> 高潮'] },
      '停业单压到门口，大家马上服气，事情结束。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺发展/挫败积累',
      '缺转折/关键手段',
      '缺高潮/完整释放',
    ]))
  })

  test('confirms reader desire formula when demand hope effort and fulfillment are visible', () => {
    const check = normalizeReaderDesireFormulaRulesCheck(
      { reader_desire_formula_rules: ['生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿'] },
      '低地位困境迫在眉睫，停业单让人觉得不该如此。检测笔和备份订单给予希望，他逐项核对，顶住承压和代价，一步步努力解决。最后停业单作废，恢复授权，客户恢复，得偿所愿后抛出下一处医院备用电源的新目标。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '生产诉求/不该如此可见',
      '给予希望/潜在解法可见',
      '努力解决/行动过程可见',
      '得偿所愿/阶段回报可见',
      '得偿后新困境/新目标可见',
    ]))
  })

  test('warns when reader desire formula skips hope and effort', () => {
    const check = normalizeReaderDesireFormulaRulesCheck(
      { reader_desire_formula_rules: ['生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿'] },
      '他处在低地位困境，觉得不该如此。下一秒停业单作废，事情完成。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺给予希望',
      '缺努力解决',
    ]))
  })

  test('confirms payoff density when multiple small returns land and scanner finds no gap', () => {
    const check = normalizePayoffDensityRulesCheck(
      { payoff_density_rules: ['每 800-1200 字至少落一次信息增量、能力展示、危机反制、关系变化或小回收'] },
      '他先发现账册线索，确认信息增量；随后用检测笔露一手，完成能力展示；再抓住规则漏洞危机反制，逼旁观者改口站队，最后拿到阶段奖励完成小回收。',
      { scanPayoffDensityRisks: () => [] },
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '信息增量',
      '能力展示',
      '危机反制',
      '关系变化',
      '小回收',
    ]))
  })

  test('warns payoff density when scanner reports a gap or a single payoff is stretched', () => {
    const check = normalizePayoffDensityRulesCheck(
      { payoff_density_rules: ['不要拉长单个爽点铺垫'] },
      '这一段拉长单个爽点铺垫，反复铺垫同一个大爽点，迟迟没有阶段回报。',
      { scanPayoffDensityRisks: () => [{ label: '回报密度缺口', evidence: '900 字无回报' }] },
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '900 字无回报',
      '长铺垫只等一个爽点',
    ]))
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '小回报数量不足',
      '存在 800-1200 字回报密度缺口',
      '拉长单个爽点铺垫',
    ]))
  })

  test('confirms payoff escalation when planned dimensions are visible and scanner finds no risk', () => {
    const check = normalizePayoffEscalationRulesCheck(
      { payoff_escalation_rules: ['影响范围递增', '揭示深度递增', '身份落差递增'] },
      '连续爽点必须逐级升级：影响范围从个人扩散到全场，揭示深度从表象推到背后黑幕和本质，身份落差从路人到权威大佬，全场震惊改口。',
      { scanPayoffEscalationRisks: () => [] },
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '影响范围递增',
      '揭示深度递增',
      '身份落差递增',
    ]))
  })

  test('warns payoff escalation when scanner reports repeated flat payoff', () => {
    const check = normalizePayoffEscalationRulesCheck(
      { payoff_escalation_rules: ['影响范围递增', '揭示深度递增'] },
      '众人震惊了一次，又震惊了一次，还是同一种打脸，没有扩大影响范围。',
      { scanPayoffEscalationRisks: () => [{ label: '爽点不递增', evidence: '重复震惊没有升级' }] },
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('重复震惊没有升级')
    expect(check?.missed_items).toContain('爽点不递增')
  })

  test('returns no deterministic emotional arc check when injected scanners find no risks', () => {
    const scanned: string[] = []
    const check = buildEmotionalArcDeterministicCheck('正文保持调动、释放和回报递进。', {
      scanEmotionalStasisRisks: text => {
        scanned.push(`stasis:${text}`)
        return []
      },
      scanDownwardSafetyRisks: text => {
        scanned.push(`downward:${text}`)
        return []
      },
      scanOppressionPurposeRisks: text => {
        scanned.push(`oppression:${text}`)
        return []
      },
      scanPayoffDensityRisks: text => {
        scanned.push(`density:${text}`)
        return []
      },
      scanPayoffEscalationRisks: text => {
        scanned.push(`escalation:${text}`)
        return []
      },
      scanTrumpCardEffectRisks: text => {
        scanned.push(`trump:${text}`)
        return []
      },
    })

    expect(check).toBeNull()
    expect(scanned).toEqual([
      'stasis:正文保持调动、释放和回报递进。',
      'downward:正文保持调动、释放和回报递进。',
      'oppression:正文保持调动、释放和回报递进。',
      'density:正文保持调动、释放和回报递进。',
      'escalation:正文保持调动、释放和回报递进。',
      'trump:正文保持调动、释放和回报递进。',
    ])
  })

  test('builds deterministic emotional arc warning from injected scanner risks', () => {
    const check = buildEmotionalArcDeterministicCheck('正文连续下压，没有底牌，也没有递增回报。', {
      scanEmotionalStasisRisks: () => [{ label: '情绪原地打转', evidence: '三段都只写沉默' }],
      scanDownwardSafetyRisks: () => [{ label: '下行情节安全感', evidence: '连续受压没有底牌' }],
      scanOppressionPurposeRisks: () => [{ key: '压制目的缺失', fix: '补压制目的和后续释放' }],
      scanPayoffDensityRisks: () => [],
      scanPayoffEscalationRisks: () => [{ label: '爽点不递增', evidence: '重复震惊没有升级' }],
      scanTrumpCardEffectRisks: () => [{ label: '王炸失效', evidence: '底牌提前泄露' }],
    })

    expect(check?.key).toBe('deterministic_emotional_arc')
    expect(check?.label).toBe('下行情节安全感')
    expect(check?.score).toBe(10)
    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '三段都只写沉默',
      '连续受压没有底牌',
      '补压制目的和后续释放',
      '重复震惊没有升级',
      '底牌提前泄露',
    ]))
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '情绪原地打转',
      '下行情节安全感',
      '压制目的缺失',
      '爽点不递增',
      '王炸失效',
    ]))
  })

  test('confirms emotional scene execution when staged reaction chain and next loop are visible', () => {
    const check = normalizeEmotionalSceneExecutionRulesCheck(
      { scene_execution_rules: ['每个场景标注调动/复现/释放/后反应，并开启下一开环'] },
      '场景标注当前情绪阶段：调动、复现、释放、后反应。读者提前知道坏结果，现场发生时压迫从预知落到现场，随后后反应里她真情流露并决定追查。结尾开启下一开环，新的期待和新目标同时出现。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '场景情绪阶段已标注',
      '前反应 -> 复现 -> 后反应链条可见',
      '下一开环已开启',
    ]))
  })

  test('warns when emotional scene execution lacks stage label and next loop', () => {
    const check = normalizeEmotionalSceneExecutionRulesCheck(
      { scene_execution_rules: ['每个场景标注调动/复现/释放/后反应，并开启下一开环'] },
      '现场发生坏结果，众人沉默，然后事情结束。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺场景情绪阶段标注',
      '缺前反应-复现-后反应链条',
      '缺闭环期待后的下一开环',
    ]))
  })

  test('confirms emotional turning when transition is triggered by new evidence and action', () => {
    const check = normalizeEmotionalTurningRulesCheck(
      { emotional_turning_rules: ['每 3-5 小节一次情绪转向，并由新证据、新信息、新动作或新代价触发'] },
      '压迫升级后情绪转向，他从愤怒转成冷静反击。第二份账册和旧印章作为新证据浮出，盟友改口站到他身边，他递出账册完成反证，代价也公开升级。',
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '事件触发情绪转向',
      '新证据/线索触发',
      '新信息触发',
      '新动作/关系变化触发',
      '新代价/压力触发',
    ]))
  })

  test('warns when emotional turning has no visible trigger', () => {
    const check = normalizeEmotionalTurningRulesCheck(
      { emotional_turning_rules: ['每 3-5 小节一次情绪转向，并由新证据、新信息、新动作或新代价触发'] },
      '他只是忽然释然，突然变好，没有任何新证据，也没有新动作。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining([
      '缺每 3-5 小节一次情绪转向',
      '缺触发事件：新证据/新信息/新动作/新代价/新关系压力',
      '情绪无理由跳步',
    ]))
  })

  test('prioritizes emotional arc repairs by highest-impact missed item', () => {
    expect(emotionalArcPriority([
      { key: 'payoff_reverse_design' },
      { label: '下行情节安全感' },
    ])).toBe('优先补下行情节安全感')

    expect(emotionalArcPriority([
      { key: 'meme_plot_formula_rules' },
      { key: 'reader_desire_formula_rules' },
    ])).toBe('优先补梗四段式')
  })
})
