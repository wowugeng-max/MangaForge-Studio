import { describe, expect, test } from 'bun:test'
import {
  buildGenrePositioningDeterministicCheck,
  countGenrePositioningSignals,
  genrePositioningArray,
  genrePositioningPriority,
  normalizeGenreCoreHookCheck,
  normalizeGenreFormulaCheck,
  normalizeGenreLabelCheck,
  normalizeGenreLongboardFocusCheck,
  normalizeGenrePsychologyCheck,
  normalizeGoldfingerFitCheck,
  normalizeMicroInnovationCheck,
  normalizeMustHaveSceneCheck,
  normalizePlatformFitCheck,
} from './genre-positioning-basics'

describe('genre positioning basic sync checks', () => {
  test('normalizes genre positioning values and counts proxy signals', () => {
    expect(genrePositioningArray(['都市系统逆袭', '  维修订单  '])).toEqual(['都市系统逆袭', '维修订单'])

    expect(countGenrePositioningSignals('现代都市里，系统面板触发，主角完成逆袭翻盘。', [
      /都市|现代/,
      /系统|面板/,
      /逆袭|翻盘/,
    ])).toBe(3)
  })

  test('confirms genre label when urban system signals are visible', () => {
    const check = normalizeGenreLabelCheck('都市系统逆袭', '现代都市生活里，系统面板弹出维修订单，主角从低谷逆袭翻盘。')

    expect(check?.key).toBe('genre_label')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('题材标签代理信号可见')
  })

  test('warns when genre label drifts into another genre', () => {
    const check = normalizeGenreLabelCheck('都市系统逆袭', '古风权谋和修仙秘境占据全章，玄幻宗门争夺传承。')

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(14)
    expect(check?.evidence).toContain('题材漂移到其他类型')
  })

  test('confirms reader psychology and genre formula through proxy signals', () => {
    const psychology = normalizeGenrePsychologyCheck(
      ['中年危机翻盘补偿'],
      '主角面对中年危机、失业和经济压力，被轻视后用系统掌控感完成翻盘，拿回尊严。',
    )
    const formula = normalizeGenreFormulaCheck(
      ['低谷压迫到系统小胜再入新门槛'],
      '低谷压迫里，系统面板触发，订单结果兑现小胜，章尾出现更高门槛和下一目标。',
    )

    expect(psychology?.delivered).toBe(true)
    expect(psychology?.evidence).toContain('读者心理代理信号可见')
    expect(formula?.delivered).toBe(true)
    expect(formula?.evidence).toContain('类型公式链路可见')
  })

  test('confirms core hook and must-have scenes when mechanism pressure and payoff are visible', () => {
    const hook = normalizeGenreCoreHookCheck(
      ['旧城设备师用隐藏工具箱修复报废设备'],
      '旧城设备师打开隐藏工具箱，面对医院设备故障和报废设备，接下新的维修订单。',
    )
    const mustHave = normalizeMustHaveSceneCheck(
      ['系统面板触发，质疑者在场，主角用结果反证'],
      '系统面板弹出刺眼评价和任务，协会质疑者在场施压，主角用结果反证自己，拿到小胜和新订单。',
    )

    expect(hook?.delivered).toBe(true)
    expect(hook?.key).toBe('core_hook_rules')
    expect(hook?.evidence.length).toBeGreaterThan(0)
    expect(mustHave?.delivered).toBe(true)
    expect(mustHave?.key).toBe('must_have_scenes')
    expect(mustHave?.evidence.length).toBeGreaterThan(0)
  })

  test('warns when goldfinger detaches from protagonist profession', () => {
    const check = normalizeGoldfingerFitCheck(
      ['隐藏工具箱解决维修职业里的设备订单'],
      '主角获得血脉神通和秘境传承，完全无关维修职业，也脱离设备订单。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('金手指脱离主角职业')
  })

  test('confirms platform fit and bounded micro-innovation', () => {
    const platform = normalizePlatformFitCheck(
      ['番茄平台快节奏强回报'],
      '本章贴合番茄平台口味，快节奏推进清晰冲突，短周期爽点和强回报都落地。',
    )
    const micro = normalizeMicroInnovationCheck(
      ['微创新只服务维修职业题材模板'],
      '微创新只服务维修职业和题材模板，没有跑出模板内边界，最多 3 个点。',
    )

    expect(platform?.delivered).toBe(true)
    expect(platform?.evidence).toContain('平台节奏/回报信号可见')
    expect(micro?.delivered).toBe(true)
    expect(micro?.key).toBe('micro_innovation_rules')
    expect(micro?.evidence.length).toBeGreaterThan(0)
  })

  test('warns when longboard focus is diluted by side branches', () => {
    const check = normalizeGenreLongboardFocusCheck(
      ['拉长题材长板和核心卖点'],
      '为了补短板，新增三条支线，稀释核心卖点，冲淡了核心卖点。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('存在补短板支线稀释核心卖点风险')
  })

  test('builds deterministic warning for hard genre positioning failures', () => {
    const check = buildGenrePositioningDeterministicCheck(
      '正文写进古风权谋和修仙秘境，主角拿到血脉神通，主要展示宏大世界观，暂时没有现实回报，还说这是挂羊头卖狗肉。',
    )

    expect(check?.key).toBe('genre_positioning_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['题材漂移', '金手指脱题', '缺现实回报', '挂羊头卖狗肉']))
  })

  test('prioritizes genre positioning repairs', () => {
    expect(genrePositioningPriority([
      { key: 'core_hook_rules' },
      { key: 'genre_positioning_forbidden' },
    ])).toBe('优先清题材硬伤')

    expect(genrePositioningPriority([
      { key: 'micro_innovation_rules' },
      { key: 'reader_psychology' },
    ])).toBe('优先收束微创新')
  })
})
