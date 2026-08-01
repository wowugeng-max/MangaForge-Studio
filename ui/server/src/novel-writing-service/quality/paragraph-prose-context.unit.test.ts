import { describe, expect, test } from 'bun:test'
import { projectSceneCardForProseCorePrompt } from './paragraph-prose-context'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'

describe('projectSceneCardForProseCorePrompt clip', () => {
  test('keeps explicit causal labels through normalized production cards in source order', () => {
    const normalized = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 2,
          title: '后场',
          goal: '夺下通讯器',
          action: '撞进第二层封锁线',
          turn: '通讯器里传来熟人的声音',
          payoff: '夺到幕后指挥频道',
          state_delta: '追捕方失去统一指挥',
          protagonist_agency_action: '主动砸断路灯制造盲区',
          event_value_change: '追捕方失去统一指挥',
        },
        {
          scene_no: 1,
          title: '前场',
          goal: '引开第一层追兵',
          action: '踢翻路障',
          turn: '封锁线提前收紧',
          payoff: '制造短暂缺口',
          state_delta: '第一层追兵被引开',
        },
      ],
    })

    expect(normalized[0]).toMatchObject({
      action: '撞进第二层封锁线',
      turn: '通讯器里传来熟人的声音',
      payoff: '夺到幕后指挥频道',
      state_delta: '追捕方失去统一指挥',
    })
    const projected = normalized.map(projectSceneCardForProseCorePrompt)
    expect(projected.map(card => card.scene_no)).toEqual([2, 1])
    expect(projected[0]).toMatchObject({
      goal: '夺下通讯器',
      action: '撞进第二层封锁线',
      turn: '通讯器里传来熟人的声音',
      payoff: '夺到幕后指挥频道',
      state_delta: '追捕方失去统一指挥',
      protagonist_agency_action: '主动砸断路灯制造盲区',
    })
    expect(JSON.stringify(projected[0]).match(/追捕方失去统一指挥/g)).toHaveLength(1)
  })

  test('keeps explicit scene causality fields once with safe bounds and no diagnostic leakage', () => {
    const card = projectSceneCardForProseCorePrompt({
      scene_no: 1,
      goal: '夺下追捕队通讯器',
      action: `江澈撞进第二层封锁线${'！'.repeat(300)}`,
      turn: `通讯器里传来熟人的声音${'？'.repeat(300)}`,
      payoff: `夺到幕后指挥频道${'。'.repeat(300)}`,
      state_delta: `追捕方失去统一指挥${'；'.repeat(300)}`,
      protagonist_agency_action: '江澈主动砸断路灯制造盲区',
      event_value_change: '追捕方失去统一指挥',
      raw_payload: { action: 'RAW_ACTION_SENTINEL' },
      debug: 'DEBUG_SENTINEL',
    })

    expect(card.goal).toBe('夺下追捕队通讯器')
    expect(card.protagonist_agency_action).toBe('江澈主动砸断路灯制造盲区')
    for (const key of ['action', 'turn', 'payoff', 'state_delta']) {
      expect(typeof card[key]).toBe('string')
      expect(String(card[key]).length).toBe(280)
      expect(String(card[key]).endsWith('…')).toBe(true)
    }
    expect(card.expected_state_change).toBeUndefined()

    const serialized = JSON.stringify(card)
    expect(serialized.match(/追捕方失去统一指挥/g)).toHaveLength(1)
    expect(serialized).not.toContain('raw_payload')
    expect(serialized).not.toContain('RAW_ACTION_SENTINEL')
    expect(serialized).not.toContain('DEBUG_SENTINEL')
  })

  test('clipping never splits a surrogate pair (CJK Ext-B at the 280 boundary)', () => {
    // conflict max = 280 → slice cut at code unit 279; put U+2000B (𠀋, 2 UTF-16 units) at 278/279.
    const conflict = `${'守'.repeat(278)}\u{2000B}后续冲突还有很长一段描述确保超过二百八十个码元`
    const card = projectSceneCardForProseCorePrompt({ goal: '目标', conflict })
    const clipped = String(card.conflict || '')
    expect(clipped.length).toBeGreaterThan(0)
    expect(clipped.isWellFormed()).toBe(true)
    expect(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(clipped)).toBe(false)
  })

  test('clipping never splits an emoji surrogate pair (goal 360 boundary)', () => {
    // goal max = 360 → slice cut at code unit 359; put 😀 (U+1F600, 2 UTF-16 units) at 358/359.
    const goal = `${'攻'.repeat(358)}\u{1F600}尾部继续超长超过三百六十个码元的目标描述`
    const card = projectSceneCardForProseCorePrompt({ goal, conflict: '短冲突' })
    const clipped = String(card.goal || '')
    expect(clipped.length).toBeGreaterThan(0)
    expect(clipped.isWellFormed()).toBe(true)
  })

  test('short values and BMP-only clipping are unchanged', () => {
    const card = projectSceneCardForProseCorePrompt({ goal: '短目标', conflict: '冲'.repeat(300) })
    expect(card.goal).toBe('短目标')
    expect(String(card.conflict).endsWith('…')).toBe(true)
    expect(String(card.conflict).length).toBe(280)
  })
})
