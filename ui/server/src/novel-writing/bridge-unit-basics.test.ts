import { describe, expect, test } from 'bun:test'
import {
  bridgeUnitArray,
  bridgeUnitPriority,
  normalizeBridgeClimaxDurationCheck,
  normalizeBridgeExpectationChainCheck,
  normalizeBridgeFatigueRepairCheck,
  normalizeBridgePlanCheck,
  normalizeBridgePositionCheck,
  normalizeBridgeTargetProgressCheck,
  normalizeBridgeTransitionCheck,
} from './bridge-unit-basics'

describe('bridge unit basic sync checks', () => {
  test('normalizes bridge-unit arrays into unique compact strings', () => {
    expect(bridgeUnitArray(' 连续期待 ', ['章尾新目标', '', null], { rule: '桥段计划' }, '连续期待')).toEqual([
      '连续期待',
      '章尾新目标',
      '{"rule":"桥段计划"}',
    ])
  })

  test('checks bridge position and plan evidence', () => {
    const position = normalizeBridgePositionCheck(
      '第3章兑现位：旧期待落地',
      '第三章进入四章桥段兑现位，旧账爽点终于落地，阶段回报给足。',
    )
    const plan = normalizeBridgePlanCheck(
      ['旧城账本会审打开资金项目资格'],
      '旧城账本在会审中打开，资金项目资格成为新目标。',
    )
    const missedPosition = normalizeBridgePositionCheck('第4章承上启下', '这一章只是普通行动。')

    expect(position).toMatchObject({
      key: 'bridge_position',
      label: '桥段位置',
      score: 88,
      delivered: true,
      status: 'ok',
      evidence: ['桥段位置有正文标记'],
    })
    expect(plan).toMatchObject({
      key: 'bridge_unit_plan',
      label: '桥段计划',
      score: 84,
      delivered: true,
      status: 'ok',
    })
    expect(missedPosition).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '桥段位置未充分落地：第4章承上启下',
    })
  })

  test('checks expectation chain and target progress', () => {
    const expectation = normalizeBridgeExpectationChainCheck(
      ['兑现旧期待前先挂新目标'],
      '上一章旧账在会审中兑现前，先挂出投资人名单这个新期待；高潮中埋下三日后必须提交资金入口的新钩子，没有立刻收束。',
    )
    const progress = normalizeBridgeTargetProgressCheck(
      '目标是争到旧城项目资格。对手在会审中截断资金门槛，否则资格作废；她提交签字材料拿回反馈，从旧账推进到下一步新目标。',
    )
    const missedProgress = normalizeBridgeTargetProgressCheck('众人聊完旧事，夜色很深。')

    expect(expectation).toMatchObject({
      key: 'expectation_chain',
      label: '连续期待',
      score: 90,
      delivered: true,
      status: 'ok',
      evidence: ['旧期待兑现', '新期待/新目标', '兑现前或高潮中挂钩子'],
    })
    expect(progress).toMatchObject({
      key: 'target_progress',
      label: '目标推进',
      score: 88,
      delivered: true,
      evidence: ['目标', '阻碍', '行动/反馈', '新状态'],
    })
    expect(missedProgress).toMatchObject({
      score: 24,
      delivered: false,
      missed_items: ['目标推进'],
    })
  })

  test('checks climax duration transition and fatigue repair', () => {
    const duration = normalizeBridgeClimaxDurationCheck(
      ['小高潮当天收束'],
      '当天的小高潮完成并收束，旧期待落地，节奏内给出下一步。',
    )
    const transition = normalizeBridgeTransitionCheck(
      ['章尾给下一步目标'],
      '高潮中埋下新钩子，章尾给目标：三日后必须拿到新门槛，否则下一章资源断供。',
    )
    const fatigue = normalizeBridgeFatigueRepairCheck(
      ['连续桥段要承接余波'],
      '这一次承接余波，关系余波和伏笔继续推进，同时打开新代价、新门槛和新目标。',
    )

    expect(duration).toMatchObject({
      key: 'climax_duration',
      label: '高潮时长',
      score: 82,
      delivered: true,
      evidence: ['高潮时长/收束有正文证据'],
    })
    expect(transition).toMatchObject({
      key: 'transition_rules',
      label: '阶段衔接',
      score: 88,
      delivered: true,
      evidence: ['章尾目标', '阶段衔接手法'],
    })
    expect(fatigue).toMatchObject({
      key: 'fatigue_repair',
      label: '疲劳修复',
      score: 82,
      delivered: true,
      evidence: ['冲突升级/承接余波/新门槛'],
    })
  })

  test('keeps missed bridge-unit checks actionable', () => {
    const expectation = normalizeBridgeExpectationChainCheck(['连续期待'], '旧账兑现了，大家散场。')
    const duration = normalizeBridgeClimaxDurationCheck(['高潮不能拖'], '这件事一直拖，迟迟没有开始。')
    const transition = normalizeBridgeTransitionCheck(['章尾新目标'], '爽点落地之后没有下一步。')
    const fatigue = normalizeBridgeFatigueRepairCheck(['承接余波'], '大家继续聊天。')

    expect(expectation).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '连续期待断档：旧期待兑现前没有挂新期待，或高潮中没有埋钩子。',
    })
    expect(duration).toMatchObject({
      score: 44,
      delivered: false,
      issue: '高潮时长不可控：局部问题没有明确收束或兑现节奏。',
    })
    expect(transition).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '阶段衔接不足：爽点落地后没有章尾新目标、高潮中钩子或连续小期待。',
    })
    expect(fatigue).toMatchObject({
      score: 46,
      delivered: false,
      issue: '缺少疲劳修复信号：连续桥段没有提高冲突密度、承接余波或打开新门槛。',
    })
  })

  test('prioritizes bridge-unit repair categories', () => {
    expect(bridgeUnitPriority([{ key: 'bridge_forbidden' }])).toBe('优先修桥段断档')
    expect(bridgeUnitPriority([{ key: 'expectation_chain' }])).toBe('优先补连续期待')
    expect(bridgeUnitPriority([{ key: 'transition_rules' }])).toBe('优先补章尾新目标')
    expect(bridgeUnitPriority([{ key: 'target_progress' }])).toBe('优先补目标推进')
    expect(bridgeUnitPriority([{ key: 'bridge_position' }])).toBe('优先补桥段位置')
    expect(bridgeUnitPriority([{ key: 'fatigue_repair' }])).toBe('优先补承接余波')
    expect(bridgeUnitPriority([{ key: 'climax_duration' }])).toBe('优先控高潮时长')
    expect(bridgeUnitPriority([])).toBe('')
  })
})
