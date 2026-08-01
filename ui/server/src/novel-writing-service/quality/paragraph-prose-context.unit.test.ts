import { describe, expect, test } from 'bun:test'
import { buildProseGenerationContract } from '../../novel-writing/prose-generation-contract'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'
import {
  compileParagraphProseContext,
  projectSceneCardForProseCorePrompt,
} from './paragraph-prose-context'

describe('projectSceneCardForProseCorePrompt clip', () => {
  test('keeps longer agency and expected-state facts that share an explicit-field prefix', () => {
    const action = '江澈撞进第二层封锁线'
    const agency = `${action}，再主动砸断路灯制造盲区${'并迫使追兵改道'.repeat(40)}`
    const stateDelta = '追捕方失去统一指挥'
    const expectedState = `${stateDelta}，并因备用频道暴露而开始内讧${'同时撤回外围岗哨'.repeat(40)}`
    const card = projectSceneCardForProseCorePrompt({
      action,
      protagonist_agency_action: agency,
      state_delta: stateDelta,
      expected_state_change: expectedState,
    })

    expect(card.action).toBe(action)
    expect(card.protagonist_agency_action).toBeDefined()
    expect(String(card.protagonist_agency_action).length).toBe(280)
    expect(String(card.protagonist_agency_action).endsWith('…')).toBe(true)
    expect(card.state_delta).toBe(stateDelta)
    expect(card.expected_state_change).toBeDefined()
    expect(String(card.expected_state_change).length).toBe(280)
    expect(String(card.expected_state_change).endsWith('…')).toBe(true)
  })

  test('deduplicates identical action and state aliases under their explicit labels', () => {
    const action = 'ACTION_ALIAS_SENTINEL：撞进第二层封锁线'
    const state = 'STATE_ALIAS_SENTINEL：追捕方失去统一指挥'
    const card = projectSceneCardForProseCorePrompt({
      scene_no: 1,
      title: '破围',
      goal: '夺下通讯器',
      action,
      beat: action,
      protagonist_action: action,
      protagonist_agency_action: action,
      state_delta: state,
      expected_state_change: state,
      event_value_change: state,
      state_changes_expected: [state, state],
    })

    expect(card.action).toBe(action)
    expect(card.protagonist_agency_action).toBeUndefined()
    expect(card.state_delta).toBe(state)
    expect(card.expected_state_change).toBeUndefined()
    expect(card.state_changes_expected).toBeUndefined()
    const serialized = JSON.stringify(card)
    expect(serialized.match(/ACTION_ALIAS_SENTINEL/g)).toHaveLength(1)
    expect(serialized.match(/STATE_ALIAS_SENTINEL/g)).toHaveLength(1)
  })

  test('deduplicates compiled scene causality without dropping complementary agency or state facts', () => {
    const duplicateAction = 'COMPILED_ACTION_ALIAS_SENTINEL：撞进第二层封锁线'
    const duplicateState = 'COMPILED_STATE_ALIAS_SENTINEL：追捕方失去统一指挥'
    const uniqueAction = 'UNIQUE_ACTION_SENTINEL：切断备用频道'
    const uniqueAgency = 'UNIQUE_AGENCY_SENTINEL：主动砸断路灯制造盲区'
    const uniqueStateDelta = 'UNIQUE_STATE_DELTA_SENTINEL：备用频道中断'
    const uniqueExpectedState = 'UNIQUE_EXPECTED_STATE_SENTINEL：幕后频道暴露'
    const uniqueEventState = 'UNIQUE_EVENT_STATE_SENTINEL：追捕队开始内讧'
    const uniqueListState = 'UNIQUE_LIST_STATE_SENTINEL：主角取得通讯器'
    const duplicateSceneCard = {
      scene_no: 1,
      title: '破围',
      goal: '夺下通讯器',
      action: duplicateAction,
      beat: duplicateAction,
      protagonist_agency_action: duplicateAction,
      state_delta: duplicateState,
      expected_state_change: duplicateState,
      event_value_change: duplicateState,
      state_changes_expected: [duplicateState],
    }
    const complementarySceneCard = {
      scene_no: 2,
      title: '反锁',
      goal: '切断备用频道',
      action: uniqueAction,
      protagonist_agency_action: uniqueAgency,
      state_delta: uniqueStateDelta,
      expected_state_change: uniqueExpectedState,
      event_value_change: uniqueEventState,
      state_changes_expected: [uniqueListState],
    }
    const projected = projectSceneCardForProseCorePrompt(complementarySceneCard)

    expect(projected).toMatchObject({
      action: uniqueAction,
      protagonist_agency_action: uniqueAgency,
      state_delta: uniqueStateDelta,
      expected_state_change: uniqueExpectedState,
      state_changes_expected: [uniqueEventState, uniqueListState],
    })

    const contract = buildProseGenerationContract({
      chapter_target: {
        chapter_no: 1,
        title: '破围',
        goal: '夺下通讯器',
        scene_cards: [duplicateSceneCard, complementarySceneCard],
      },
      preflight: { ready: true, strict_ready: true, checks: [] },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    })
    const prompt = compileParagraphProseContext({ title: '追捕夜' }, contract).prompt
    const sceneCausality = prompt.split('【场景卡因果链】')[1]?.split('【开写门禁通过快照】')[0] || ''
    for (const sentinel of [
      'COMPILED_ACTION_ALIAS_SENTINEL',
      'COMPILED_STATE_ALIAS_SENTINEL',
      'UNIQUE_ACTION_SENTINEL',
      'UNIQUE_AGENCY_SENTINEL',
      'UNIQUE_STATE_DELTA_SENTINEL',
      'UNIQUE_EXPECTED_STATE_SENTINEL',
      'UNIQUE_EVENT_STATE_SENTINEL',
      'UNIQUE_LIST_STATE_SENTINEL',
    ]) {
      expect(sceneCausality.match(new RegExp(sentinel, 'g'))).toHaveLength(1)
    }
  })

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
