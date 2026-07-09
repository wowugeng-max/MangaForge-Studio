import { describe, expect, test } from 'bun:test'
import {
  buildContinuityHeatDeterministicCheck,
  continuityHeatAnchorScore,
  continuityHeatArray,
  continuityHeatItemText,
  continuityHeatPriority,
  normalizeContinuityActiveExpectationCheck,
  normalizeContinuityDormantBoundaryCheck,
  normalizeContinuityHeatStateCheck,
  normalizeContinuityWatchItemsCheck,
} from './continuity-heat-basics'

describe('continuity heat basic sync checks', () => {
  test('normalizes continuity heat items from memory-like objects', () => {
    expect(continuityHeatItemText({ name: '门外水声', state: 'hot，继续施压', chapter_no: 3 })).toBe('门外水声：hot，继续施压@第3章')
    expect(continuityHeatItemText({ title: '旧钥匙缺口', summary: 'warm，必须触达' })).toBe('旧钥匙缺口：warm，必须触达')
    expect(continuityHeatArray(['门外水声'], { name: '镜中脚印', state: 'cold，先升温' })).toEqual(expect.arrayContaining(['门外水声', '镜中脚印：cold，先升温']))
  })

  test('scores continuity heat anchors with matched evidence', () => {
    const anchor = continuityHeatAnchorScore(['门外水声继续施压'], '门外水声继续施压，十息内逼他们换路。', 20)

    expect(anchor.missed).toEqual([])
    expect(anchor.score).toBeGreaterThanOrEqual(20)
    expect(anchor.evidence.length).toBeGreaterThan(0)
  })

  test('confirms heat state handling when hot warm cold and archived signals are visible', () => {
    const check = normalizeContinuityHeatStateCheck(
      ['hot 门外水声', 'warm 旧钥匙缺口', 'cold 镜中脚印', 'archived 夜巡司令牌'],
      'hot 门外水声继续施压，旧钥匙缺口被触达，镜中脚印先升温没有立刻揭开，夜巡司令牌始终躺在抽屉里没有突然解决。',
    )

    expect(check?.key).toBe('heat_states')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBe(86)
  })

  test('warns when heat states are deferred', () => {
    const check = normalizeContinuityHeatStateCheck(
      ['门外水声', '旧钥匙缺口'],
      '这些线索暂时不重要，本章只是过渡，以后再说，没有必要处理。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(18)
    expect(check?.evidence).toContain('热度处理被推迟')
  })

  test('confirms active expectations when hot problems create immediate pressure', () => {
    const check = normalizeContinuityActiveExpectationCheck(
      ['门外水声继续施压'],
      '门外水声继续施压，十息倒计时逼他们开门换路，所有人被迫行动。',
    )

    expect(check?.key).toBe('active_expectations')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when active expectations are dropped', () => {
    const check = normalizeContinuityActiveExpectationCheck(
      ['门外水声继续施压'],
      '门外水声暂时不重要，众人换了话题，以后再说。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(16)
    expect(check?.repair_instruction).toContain('补活跃期待')
  })

  test('confirms watch items when at least two planned lines are touched', () => {
    const check = normalizeContinuityWatchItemsCheck(
      ['旧钥匙缺口', '镜中脚印', '室友关系'],
      '旧钥匙缺口卡住了门，镜中脚印在玻璃上升温，室友替李辰争来三息。',
    )

    expect(check?.key).toBe('watch_items')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['旧钥匙/缺口触达', '脚印线升温']))
  })

  test('warns when watch items are explicitly postponed', () => {
    const check = normalizeContinuityWatchItemsCheck(
      ['旧钥匙缺口', '镜中脚印', '室友关系'],
      '旧钥匙缺口、镜中脚印和室友关系以后再说，暂且不提。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('关注项被推迟')
  })

  test('confirms dormant boundaries when archived elements stay inactive', () => {
    const check = normalizeContinuityDormantBoundaryCheck(
      ['夜巡司令牌休眠，不得误激活'],
      '夜巡司令牌始终躺在抽屉里，不能使用，也不能突然解决当前危机。',
    )

    expect(check?.key).toBe('dormant_allowed')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
  })

  test('warns when archived elements suddenly solve the crisis', () => {
    const check = normalizeContinuityDormantBoundaryCheck(
      ['夜巡司令牌休眠'],
      '他忽然掏出夜巡司令牌，令牌亮了，门外水声立刻消失。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(12)
    expect(check?.evidence).toContain('休眠物被误激活')
  })

  test('builds deterministic continuity heat warning for hard failures', () => {
    const check = buildContinuityHeatDeterministicCheck(
      '这些伏笔以后再说，本章只是过渡。大家讨论了一会儿就换了话题，他忽然掏出夜巡司令牌，令牌解决了危机。',
    )

    expect(check?.key).toBe('continuity_heat_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['热度推迟', '空回调', '休眠误激活']))
  })

  test('prioritizes continuity heat repairs', () => {
    expect(continuityHeatPriority([
      { key: 'active_expectations' },
      { key: 'continuity_heat_forbidden' },
    ])).toBe('优先清热度硬伤')

    expect(continuityHeatPriority([
      { key: 'watch_items' },
      { key: 'dormant_allowed' },
    ])).toBe('优先修休眠边界')
  })
})
