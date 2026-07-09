import { describe, expect, test } from 'bun:test'
import {
  firstProseText,
  normalizeOpeningExpectationCheck,
  normalizeOpeningFiveEssentialsCheck,
  normalizeOpeningFoundationCheck,
  normalizeOpeningGoalAndHookCheck,
  normalizeOpeningInformationCheck,
  normalizeOpeningProtagonistCheck,
  openingArray,
  openingPriority,
} from './opening-basics'

describe('opening basic sync checks', () => {
  test('normalizes opening arrays and strips title lines from prose scope', () => {
    expect(openingArray(' 前300字主角登场 ', ['1000字期待点', '', null], { rule: '三大基点' }, '前300字主角登场')).toEqual([
      '前300字主角登场',
      '1000字期待点',
      '{"rule":"三大基点"}',
    ])
    expect(firstProseText('第一章 门外有三个妈妈\n\n主角李岚被迫签字，门外的三个人同时后退一步。', 20)).toBe('主角李岚被迫签字，门外的三个人同时后退一')
  })

  test('checks protagonist entry, first-1000 expectation, and foundation points', () => {
    const protagonist = normalizeOpeningProtagonistCheck(
      ['300字内主角登场，带着危机进入现场'],
      '主角李岚被迫在倒计时里签字，否则对方立刻报警。',
    )
    const expectation = normalizeOpeningExpectationCheck(
      ['1000字内必须出现爽点或期待点，系统检测反常'],
      '血缘系统检测匹配率为零，三位妈妈同时敲门。谁才是真正亲人，为什么规则会认错？',
    )
    const foundation = normalizeOpeningFoundationCheck(
      ['人设基点、切入点基点、金手指基点'],
      '李岚刚被裁员，房租还差三天。门外三位妈妈要求签字认亲，否则报警；血缘系统检测匹配率突然归零。',
    )

    expect(protagonist).toMatchObject({
      key: 'protagonist_entry',
      label: '主角登场',
      score: 90,
      delivered: true,
      evidence: ['前300字主角入场', '带危机/优势/陌生环境'],
    })
    expect(expectation).toMatchObject({
      key: 'first_1000_expectation',
      label: '爽点/期待点',
      score: 88,
      delivered: true,
      evidence: ['前1000字期待点', '可追问题'],
    })
    expect(foundation).toMatchObject({
      key: 'foundation_points',
      label: '三大基点',
      score: 100,
      delivered: true,
      evidence: ['人设基点', '切入点基点', '金手指基点'],
    })
  })

  test('checks goal selling point five essentials and information priority', () => {
    const opening = [
      '第一句就写清谁在哪里、有什么、为什么、要做什么：主角目标必须先活过七天。',
      '主线是血缘系统三位妈妈规则认亲，裁员房租敲门倒计时同时压来。',
      '系统检测匹配率为零，形成反常身份、期待点和认亲爽点；否则账户清零，冲突不平淡。',
      '没有一次性解释世界观，只先确认危机和人设，再把更多规则留到下一章分批释放。',
    ].join('')

    const goal = normalizeOpeningGoalAndHookCheck('主角目标是先活过七天，本文卖点是血缘系统规则认亲，否则账户清零。')
    const five = normalizeOpeningFiveEssentialsCheck(['简单、不偏、快、爽、不平'], opening)
    const information = normalizeOpeningInformationCheck(['危机、人设、金手指暗示、世界观分批进入'], opening)

    expect(goal).toMatchObject({
      key: 'goal_and_selling_point',
      label: '目标与卖点',
      score: 88,
      delivered: true,
      evidence: ['主角目标', '本文卖点', '重大后果'],
    })
    expect(five).toMatchObject({
      key: 'five_essentials_rules',
      label: '开头五要诀',
      score: 90,
      delivered: true,
      evidence: expect.arrayContaining([
        '简单点：五要素/目标清楚',
        '不能偏：开头贴合主线卖点',
        '要快：快速切入事件',
        '要爽：第一个小剧情有爽点或期待',
        '不能平：有冲突矛盾',
      ]),
    })
    expect(information).toMatchObject({
      key: 'information_priority',
      label: '信息释放',
      score: 86,
      delivered: true,
      evidence: ['危机优先', '信息分批', '无世界观过载'],
    })
  })

  test('keeps missed opening checks actionable', () => {
    const protagonist = normalizeOpeningProtagonistCheck(['300字主角登场'], '天气很好，城市很大。')
    const expectation = normalizeOpeningExpectationCheck(['1000字期待点'], '大家吃完饭就回家。')
    const five = normalizeOpeningFiveEssentialsCheck(['开头五要诀'], '暂时还没有进入正题，纯风景写了很久，平淡如水。')
    const information = normalizeOpeningInformationCheck(['信息分批'], '这座城市有很多年复杂变迁，开始详细解释世界观。')

    expect(protagonist).toMatchObject({
      score: 24,
      delivered: false,
      issue: '前300字没有让主角带着危机、优势或陌生环境进入现场。',
    })
    expect(expectation).toMatchObject({
      score: 26,
      delivered: false,
      issue: '前1000字没有形成爽点或可追期待点。',
    })
    expect(five).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '开头五要诀没有齐：简单、不偏、快、爽、不平至少一项缺正文证据。',
    })
    expect(information).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '信息释放没有按危机感、人设、金手指暗示、世界观分批进入。',
    })
  })

  test('prioritizes opening repair categories', () => {
    expect(openingPriority([{ key: 'opening_forbidden' }])).toBe('优先重做开篇禁忌')
    expect(openingPriority([{ key: 'protagonist_entry' }])).toBe('优先补前300字主角登场')
    expect(openingPriority([{ key: 'first_1000_expectation' }])).toBe('优先补1000字内期待点')
    expect(openingPriority([{ key: 'foundation_points' }])).toBe('优先补三大基点')
    expect(openingPriority([{ key: 'goal_and_selling_point' }])).toBe('优先补目标卖点')
    expect(openingPriority([{ key: 'five_essentials_rules' }])).toBe('优先补开头五要诀')
    expect(openingPriority([{ key: 'information_priority' }])).toBe('优先重排信息释放')
    expect(openingPriority([])).toBe('')
  })
})
