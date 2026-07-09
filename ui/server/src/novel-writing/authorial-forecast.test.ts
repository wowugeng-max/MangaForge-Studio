import { describe, expect, test } from 'bun:test'
import { scanAuthorialForecastRisks } from './authorial-forecast'

describe('authorial forecast scan utilities', () => {
  test('detects authorial forecast while ignoring the chapter title line', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '李辰没有意识到，更大的风暴即将来临。',
      '命运的齿轮，也在这一刻开始转动。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0]).toMatchObject({
      gate: 'G',
      status: 'warn',
      line: 3,
    })
    expect(checks[0].pattern).toContain('作者预告')
    expect(checks[0].fix).toContain('现场')
  })

  test('detects explanatory causality and author verdicts', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '他之所以沉默，是因为终于明白名单背后的真相。',
      '她演得真好，连旁边的人都没有看出破绽。',
      '王婶笑得恰到好处，像早就排练过一样。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks.map((item: any) => item.pattern)).toEqual(expect.arrayContaining([
      expect.stringContaining('之所以'),
      expect.stringContaining('替读者定性'),
      expect.stringContaining('评判性补语'),
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('证据')
  })

  test('detects god-view spoilers and report-like diction', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '殊不知，门外那个人早已换了身份。',
      '关于规则塔的来历，要从十年前那场事故说起。',
      '规则塔的运行机制、惩罚结构和筛选逻辑组成完整体系。',
      '管理员进一步深入落实名单权限，推进夜巡制度升级。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks.map((item: any) => item.pattern)).toEqual(expect.arrayContaining([
      expect.stringContaining('上帝视角剧透'),
      expect.stringContaining('硬铺垫'),
      expect.stringContaining('去书面化'),
      expect.stringContaining('体制内动词'),
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('现场')
  })
})
