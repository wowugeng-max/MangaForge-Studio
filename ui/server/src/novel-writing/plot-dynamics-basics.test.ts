import { describe, expect, test } from 'bun:test'
import {
  buildPlotDynamicsDeterministicCheck,
  countPlotDynamicsSignals,
  normalizeClimaxFormulaCheck,
  normalizeLineStaggerRulesCheck,
  normalizePlotAbOutlineCheck,
  normalizePlotDriveModeRulesCheck,
  normalizePlotLoopCheck,
  normalizePlotScenePurposeCheck,
  plotDynamicsArray,
  plotDynamicsPriority,
} from './plot-dynamics-basics'

describe('plot dynamics basic sync checks', () => {
  test('normalizes plot dynamics values and counts proxy signals', () => {
    expect(plotDynamicsArray(['目标-阻碍-行动', '  章末新期待  '])).toEqual(['目标-阻碍-行动', '章末新期待'])

    expect(countPlotDynamicsSignals('目标明确，阻碍挡住，主角行动后付出代价，章末留下新期待。', [
      /目标明确/,
      /阻碍/,
      /行动/,
      /代价/,
      /新期待/,
    ])).toBe(5)
  })

  test('confirms plot loop when goal obstacle action feedback and expectation are visible', () => {
    const check = normalizePlotLoopCheck(
      ['目标、阻碍、行动、代价反馈、新期待'],
      '目标很明确：必须找到红色阀门。协会封锁挡住他，他没有等，拆开设备追查线索，代价是暴露身份，章末留下新期待。',
    )

    expect(check?.key).toBe('plot_loop')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('目标-阻碍-行动-代价/反馈-新期待信号可见')
  })

  test('warns when plot loop is explicitly flat', () => {
    const check = normalizePlotLoopCheck(
      ['目标、阻碍、行动、代价反馈、新期待'],
      '没有明确目标，没有真正阻碍，一路顺利解决，没有代价反馈，没有新期待，事情自然结束。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(22)
    expect(check?.evidence).toContain('剧情闭环显式缺失')
  })

  test('confirms climax formula and A/B rhythm through visible signals', () => {
    const climax = normalizeClimaxFormulaCheck(
      ['蓄能、假胜、崩解、交叉死磕、悬置收尾'],
      '倒计时蓄能压低期待，设备先显示恢复形成假胜；下一秒系统崩解反向烧红，他一边保住客户一边死磕故障，章末悬置收尾留下新期待。',
    )
    const ab = normalizePlotAbOutlineCheck(
      ['A蓄压，B抬情绪，交替推进'],
      'A蓄压让阻碍升高，B抬情绪给小反转，二者交替交错推进，压力和回报不断转换。',
    )

    expect(climax?.delivered).toBe(true)
    expect(climax?.evidence).toContain('高潮公式链路可见')
    expect(ab?.delivered).toBe(true)
    expect(ab?.evidence).toContain('A/B蓄压抬情绪信号可见')
  })

  test('confirms scene purpose when information and function are delivered', () => {
    const check = normalizePlotScenePurposeCheck(
      ['场景推进账本编号线索'],
      '这个场景让红色阀门暴露，账本编号指向库房线索，功能是推进主线并交付信息变化。',
    )

    expect(check?.key).toBe('scene_purpose_map')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('场景功能/信息交付可见')
  })

  test('confirms event drive mode when external result is visible', () => {
    const check = normalizePlotDriveModeRulesCheck(
      ['番茄爽文事件驱动每章给外部结果'],
      '番茄爽文事件驱动，本章他赢下封单，资格到手，客户信任提高，对手当众失败。',
    )

    expect(check?.key).toBe('drive_mode_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('外部结果可见')
  })

  test('warns when drive mode has no external result', () => {
    const check = normalizePlotDriveModeRulesCheck(
      ['番茄爽文事件驱动每章给外部结果'],
      '番茄爽文事件驱动，但没有赢，没有升级，没有对手栽，没有任何外部结果，只有内心独白和坐着闲谈。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('缺外部结果或只有闲谈内心')
    expect(check?.missed_items).toContain('番茄爽文/打脸文每章必须给外部结果：赢了、升级了、对手栽了至少一项')
  })

  test('confirms line stagger when multiple lines advance out of phase', () => {
    const check = normalizeLineStaggerRulesCheck(
      ['主线、支线、战力线、声望线多线错峰'],
      '主线推进封单，支线保留旧案待推进，战力提升线解锁工具箱，声望线带来客户信任；多线错峰、错开节奏，避免同质化，没有同时爆。',
    )

    expect(check?.key).toBe('line_stagger_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence.length).toBeGreaterThan(0)
  })

  test('builds deterministic warning for hard plot-dynamics failures', () => {
    const check = buildPlotDynamicsDeterministicCheck(
      '没有明确目标，没有真正阻碍，一路顺利解决，没有代价反馈，没有新期待，高潮没有假胜，也没有崩解和交叉死磕。',
    )

    expect(check?.key).toBe('plot_dynamics_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['缺目标', '缺阻碍', '缺代价反馈', '缺新期待', '高潮平滑']))
  })

  test('prioritizes plot dynamics repairs', () => {
    expect(plotDynamicsPriority([
      { key: 'plot_loop' },
      { key: 'plot_dynamics_forbidden' },
    ])).toBe('优先清剧情硬伤')

    expect(plotDynamicsPriority([
      { key: 'line_stagger_rules' },
      { key: 'ab_outline' },
    ])).toBe('优先补多线错峰')
  })
})
