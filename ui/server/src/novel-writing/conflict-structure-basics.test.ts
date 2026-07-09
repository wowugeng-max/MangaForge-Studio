import { describe, expect, test } from 'bun:test'
import {
  buildConflictStructureDeterministicCheck,
  conflictStructureAnchorScore,
  conflictStructureArray,
  conflictStructurePriority,
  normalizeConflictAgencyCheck,
  normalizeConflictEventValueCheck,
  normalizeConflictLadderCheck,
  normalizeConflictMotivationCheck,
  normalizeConflictNetworkLayersCheck,
  normalizeConflictNetworkLayersContract,
  normalizeConflictNextSeedCheck,
  normalizeConflictNoExitCheck,
  normalizeConflictPressureCheck,
  normalizeConflictWebCheck,
  normalizeConflictWebContract,
} from './conflict-structure-basics'

describe('conflict structure basic sync checks', () => {
  test('normalizes conflict structure items from strings and asset-like objects', () => {
    expect(conflictStructureArray(['协会规则压势'], { name: '封单', description: '撤回授权' }, { summary: '客户资格被拒绝' })).toEqual(
      expect.arrayContaining(['协会规则压势', '封单', '客户资格被拒绝']),
    )
  })

  test('scores conflict anchors with matched evidence', () => {
    const anchor = conflictStructureAnchorScore(['协会规则压势'], '协会规则压势让客户撤回授权，主角必须当众反证。', 18)

    expect(anchor.missed).toEqual([])
    expect(anchor.score).toBeGreaterThanOrEqual(18)
    expect(anchor.evidence.length).toBeGreaterThan(0)
  })

  test('confirms conflict ladder when verbal pressure escalates into action and result', () => {
    const check = normalizeConflictLadderCheck(
      ['言语压迫升级为行动阻碍再决定胜负'],
      '会长冷声警告，保安挡住设备间门，封门扣下授权，主角当众拆开证据反证，胜负当场落地。',
    )

    expect(check?.key).toBe('conflict_ladder')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBeGreaterThanOrEqual(84)
  })

  test('warns when conflict ladder is summarized away', () => {
    const check = normalizeConflictLadderCheck(['阻止者升级'], '大家争执了一会儿，解释了很多背景，事情很快解决。')

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('冲突被概括跳过')
  })

  test('confirms motivation sources when ability rules and relationships drive conflict', () => {
    const check = normalizeConflictMotivationCheck(
      ['金手指反证', '协会规则', '客户关系'],
      '隐藏工具箱弹出错误码，协会资质规则卡住设备权限，客户撤回授权逼主角当场反证。',
    )

    expect(check?.key).toBe('motivation_sources')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['金手指/反证驱动', '规则/资质驱动', '人物关系/利益驱动']))
  })

  test('warns when pressure is only personal attack', () => {
    const check = normalizeConflictPressureCheck(['协会规则压势'], '对手态度不好，骂了几句，单纯骂人，人品很差。')

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(20)
    expect(check?.evidence).toContain('只压人不压势')
  })

  test('warns when protagonist agency is passive', () => {
    const check = normalizeConflictAgencyCheck(['主角主动破局'], '主角解释了很多背景，等人通融，最后有人帮他解决。')

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(16)
    expect(check?.repair_instruction).toContain('补主角行动力')
  })

  test('warns when event value has no clear result', () => {
    const check = normalizeConflictEventValueCheck(['客户资格从拒绝到认可'], '大家听完觉得有道理，但没有明确胜负，也没有结果。')

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('胜负被跳过')
  })

  test('confirms next conflict seed in the tail', () => {
    const check = normalizeConflictNextSeedCheck(
      ['协会会长亲自追责'],
      '主角夺回授权。章尾，第二份封单指向医院设备，协会会长留下亲自追责的账本。',
    )

    expect(check?.key).toBe('next_conflict_seeds')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('下一冲突种子可见')
  })

  test('normalizes network-layer and web contracts from mixed casing', () => {
    expect(normalizeConflictNetworkLayersContract({
      verticalConflict: '会长权限压制维修师',
      horizontal_conflict: '同行抢单',
      cross: '客户授权牵连协会追责',
      weavingOrder: ['定地图', '定阵营', '定角色'],
    })).toEqual({
      vertical_conflict: '会长权限压制维修师',
      horizontal_conflict: '同行抢单',
      cross_conflict: '客户授权牵连协会追责',
      weaving_order: ['定地图', '定阵营', '定角色'],
    })

    expect(normalizeConflictWebContract({
      activeLines: ['封单线', '客户线'],
      link_rules: ['信息差牵连'],
      activationRules: ['解决一条后加深追责'],
    })).toEqual({
      active_lines: ['封单线', '客户线'],
      link_rules: ['信息差牵连'],
      activation_rules: ['解决一条后加深追责'],
    })
  })

  test('confirms three-layer conflict network when vertical horizontal and cross conflicts operate', () => {
    const check = normalizeConflictNetworkLayersCheck(
      {
        vertical_conflict: '会长权限压制维修师',
        horizontal_conflict: '同行抢单',
        cross_conflict: '客户授权牵连协会追责',
      },
      '纵向矛盾里会长上级权限要求服从，横向矛盾里同行争夺订单，交叉矛盾让客户授权牵连协会追责，一条解决会加深另一条。',
    )

    expect(check?.key).toBe('conflict_network_layers')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['纵向矛盾可见', '横向矛盾可见', '交叉矛盾可见']))
  })

  test('confirms conflict web when active lines are linked and activate each other', () => {
    const check = normalizeConflictWebCheck(
      {
        active_lines: ['封单线', '客户线'],
        link_rules: ['利益冲突牵连'],
        activation_rules: ['解决后加深追责'],
      },
      '封单线和客户线同时推进，背后利益冲突互相牵连；解决封单线后，却立刻升级并加深客户追责。',
    )

    expect(check?.key).toBe('conflict_web')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['矛盾线关联可见', '解决后激活/加深信号可见']))
  })

  test('warns when no-exit rules allow loose exit', () => {
    const check = normalizeConflictNoExitCheck(['主角非踏入不可，双方都退不了'], '主角可以转身离开，随时退出，失败没有代价，只是普通争吵。')

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBe(12)
    expect(check?.evidence).toContain('正文写成可以随时退出/无代价')
  })

  test('builds deterministic conflict structure warning for hard failures', () => {
    const check = buildConflictStructureDeterministicCheck('大家争执了一会儿，解释了很多背景，没有真正阻力，也没有明确胜负，本章只是过渡。')

    expect(check?.key).toBe('conflict_structure_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['争执概括', '背景解释解题', '缺真实阻力', '胜负不清', '过渡章空转']))
  })

  test('prioritizes conflict structure repairs', () => {
    expect(conflictStructurePriority([
      { key: 'conflict_ladder' },
      { key: 'conflict_structure_forbidden' },
    ])).toBe('优先清冲突硬伤')

    expect(conflictStructurePriority([
      { key: 'event_value_changes' },
      { key: 'protagonist_agency_rules' },
    ])).toBe('优先补主角破局')
  })
})
