import { describe, expect, test } from 'bun:test'
import {
  assetLinkagePriority,
  normalizeAssetLinkageFunctionChainCheck,
  normalizeAssetLinkageInformationCheck,
  normalizeAssetLinkageStateChangeCheck,
} from './asset-linkage-basics'

describe('asset linkage basic sync checks', () => {
  test('confirms asset function chain when function ownership trigger and consequence are visible', () => {
    const check = normalizeAssetLinkageFunctionChainCheck(
      [{ name: '血契封条', summary: '证明账本原件归属。' }],
      [
        '血契封条从周薄森私藏变成当堂见证，归属交给林青禾记录。',
        '李玄把封条卡进账本缺口，触发红印规则，不能强行撬开。',
        '这一步证明证据来源，也让旁观者站位改了，章尾指向下一次追账。',
      ].join('\n'),
    )

    expect(check?.key).toBe('function_chain')
    expect(check?.label).toBe('功能链')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['功能/使用', '归属/来源', '触发/限制', '后果/回报']))
  })

  test('warns when asset function chain only names an unused asset', () => {
    const check = normalizeAssetLinkageFunctionChainCheck(
      ['血契封条'],
      '血契封条很重要，有复杂来历，但没有人真的使用，只被反复提起。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toContain('只点名未使用')
    expect(check?.repair_instruction).toContain('补资产功能链')
  })

  test('confirms asset state change when ownership visibility or trigger state changes', () => {
    const check = normalizeAssetLinkageStateChangeCheck(
      ['血契封条状态变化'],
      '血契封条从私藏变成公开证据，红印裂开缺口，暗格被撬开，归属也可见。',
    )

    expect(check?.key).toBe('state_tracking')
    expect(check?.label).toBe('状态变化')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('状态/归属/可见性变化')
  })

  test('warns when asset state is only repeated without change', () => {
    const check = normalizeAssetLinkageStateChangeCheck(
      ['血契封条状态变化'],
      '血契封条一直很重要，仍然只是被反复提起，没有变化，事情就解决了。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('只重复点名')
    expect(check?.repair_instruction).toContain('补资产状态变化')
  })

  test('confirms asset information when conflict or action releases the setting', () => {
    const check = normalizeAssetLinkageInformationCheck(
      ['资产信息必须随冲突释放。'],
      [
        '周薄森抢封条时继续逼问，长老席当堂起了冲突。',
        '李玄把封条按上去，红印露出，账本锁死，对话压力逼出规则。',
      ].join('\n'),
    )

    expect(check?.key).toBe('information_through_conflict')
    expect(check?.label).toBe('信息随冲突')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['冲突释放信息', '行动释放信息']))
  })

  test('warns when asset information is released as exposition', () => {
    const check = normalizeAssetLinkageInformationCheck(
      ['资产信息必须随冲突释放。'],
      '血契封条有很多年历史，规则非常复杂，角色完整解释一整套设定，大家终于明白规则。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('设定说明')
    expect(check?.repair_instruction).toContain('设定拆进现场冲突')
  })

  test('prioritizes asset linkage repairs by highest-impact missed checks', () => {
    expect(assetLinkagePriority([
      { key: 'function_chain' },
      { key: 'relationship_graph_risks' },
    ])).toBe('优先处理关系图风险')

    expect(assetLinkagePriority([
      { key: 'three_appearance_plan' },
      { key: 'information_through_conflict' },
    ])).toBe('优先把设定塞进冲突')
  })
})
