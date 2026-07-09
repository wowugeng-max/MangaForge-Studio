import { describe, expect, test } from 'bun:test'
import {
  normalizeShowdownCombatCheck,
  normalizeShowdownCounterplayCheck,
  normalizeShowdownEmotionRhythmCheck,
  normalizeShowdownPayoffCheck,
  normalizeShowdownShockCheck,
  normalizeShowdownStageCheck,
  normalizeShowdownThreePressureShockCheck,
  normalizeShowdownTransmissionChannelCheck,
  normalizeShowdownTrumpCardReserveCheck,
  normalizeShowdownWeakOverStrongCheck,
  showdownArray,
  showdownPriority,
} from './showdown-basics'

describe('showdown basic sync checks', () => {
  test('normalizes showdown arrays into unique compact strings', () => {
    expect(showdownArray(' 爽点释放 ', ['舞台层级', '', null], { rule: '底牌管理' }, '爽点释放')).toEqual([
      '爽点释放',
      '舞台层级',
      '{"rule":"底牌管理"}',
    ])
  })

  test('checks payoff release and trump-card reserve as actionable gates', () => {
    const payoff = normalizeShowdownPayoffCheck(
      ['底牌亮出后必须压制对手'],
      '她当场亮出底牌反制。对手被压制，执事资格当场取消，众人看清规则改判。',
    )
    const reserve = normalizeShowdownTrumpCardReserveCheck(
      ['每次只出一个底牌并留下后手'],
      '他只亮出一张底牌催动阵盘，袖中仍藏着两枚未揭示后手。随后又解锁新技能，下一步追查更高门槛。',
    )
    const missedPayoff = normalizeShowdownPayoffCheck(['必须爽点释放'], '她亮出底牌，可对手继续被众人支持。')

    expect(payoff).toMatchObject({
      key: 'payoff_release',
      label: '爽点释放',
      score: 90,
      delivered: true,
      status: 'ok',
      evidence: ['底牌/反制释放', '对手受到压制'],
    })
    expect(reserve).toMatchObject({
      key: 'trump_card_reserve',
      label: '底牌管理',
      score: 88,
      delivered: true,
      status: 'ok',
    })
    expect(missedPayoff).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '爽点释放不完整：底牌亮出后对手没有受到对应压制，或主角继续委屈。',
    })
    expect(normalizeShowdownTrumpCardReserveCheck([], '正文')).toBeNull()
  })

  test('checks three-pressure shock stage chain and transmission channel', () => {
    const chapter = [
      '友方外门弟子相信主角，替他说话铺压。',
      '敌方反派第一次冷笑，第二次逼主角上场，敌人不服。',
      '中立势力长老席观望，给出第三重压力。',
      '主角一爆亮出底牌，当场碾压，反压对手。',
      '友方震惊站起，敌方震动破防退后，中立长老席第一次重审改口。',
      '旧情人际关系让外门弟子传给众人，中间层传到核心层，态度转变并改判。',
    ].join('')
    const pressure = normalizeShowdownThreePressureShockCheck(['三压一爆三震'], chapter)
    const stage = normalizeShowdownStageCheck(['群众层到核心层'], '群众层众人起哄，中间层阵师复盘看懂，核心层长老改判重审。')
    const transmission = normalizeShowdownTransmissionChannelCheck(['关系通道传递'], chapter)

    expect(pressure).toMatchObject({
      key: 'three_pressure_shock',
      label: '三压一爆三震',
      score: 90,
      delivered: true,
      status: 'ok',
    })
    expect(stage).toMatchObject({
      key: 'stage_chain',
      label: '舞台层级',
      score: 100,
      delivered: true,
      evidence: ['群众层', '中间层', '核心层'],
    })
    expect(transmission).toMatchObject({
      key: 'transmission_channel',
      label: '传递通道',
      score: 88,
      delivered: true,
      status: 'ok',
    })
  })

  test('checks shock combat weak-over-strong counterplay and emotion rhythm', () => {
    const shock = normalizeShowdownShockCheck(
      ['分层震惊'],
      '群众层哗然，中间层看懂规则利害，核心层长老意识到资格必须重审改判。',
    )
    const combat = normalizeShowdownCombatCheck(
      ['打斗要有过程和收获'],
      '她出手斗法，先避开剑势，再借阵纹反击，第二击扣进空门，最终拿回试炼资格并展示新能力。',
    )
    const weak = normalizeShowdownWeakOverStrongCheck(['以弱胜强依据'], '他利用信息差和地形规则理解，提前付出代价诱使强敌入局。')
    const counterplay = normalizeShowdownCounterplayCheck(
      ['三层破局'],
      '他提前准备后手，预判反制对方阵盘，用B克制A；对方针对A时，他反预判设下陷阱，引他落入预设的B。',
    )
    const rhythm = normalizeShowdownEmotionRhythmCheck(
      ['急缓急'],
      '对手当众逼他认输，判签压下。她没有急着争辩，只看了一眼阵纹做判断。随后亮出底牌反制，当场改判；余波传到群众、中间层和长老，下一章追查新目标。',
    )

    expect(shock).toMatchObject({ key: 'shock_chain', score: 88, delivered: true })
    expect(combat).toMatchObject({ key: 'combat_design', score: 88, delivered: true })
    expect(weak).toMatchObject({ key: 'weak_over_strong', score: 86, delivered: true })
    expect(counterplay).toMatchObject({ key: 'counterplay_layers', score: 88, delivered: true })
    expect(rhythm).toMatchObject({ key: 'emotion_rhythm', score: 88, delivered: true })
  })

  test('keeps missed showdown checks actionable', () => {
    const pressure = normalizeShowdownThreePressureShockCheck(['三压一爆三震'], '众人都震惊。')
    const counterplay = normalizeShowdownCounterplayCheck(['三层破局'], '他突然很厉害，直接赢了。')
    const rhythm = normalizeShowdownEmotionRhythmCheck(['急缓急'], '对方起哄后他一直解释，没有释放结果。')

    expect(pressure).toMatchObject({
      delivered: false,
      status: 'warn',
      missed_items: expect.arrayContaining(['缺友好势力铺压', '缺敌方势力两次铺垫和不服逼主角上场', '三震被写成统一震惊']),
    })
    expect(counterplay).toMatchObject({
      score: 16,
      delivered: false,
      missed_items: expect.arrayContaining(['强敌对抗只写成硬碰硬或突然变强']),
    })
    expect(rhythm).toMatchObject({
      delivered: false,
      status: 'warn',
      issue: '情绪节奏没有形成急 -> 缓 -> 急，并缺少释放后的回响或新钩子。',
    })
  })

  test('prioritizes showdown repair categories', () => {
    expect(showdownPriority([{ key: 'trump_card_reserve' }])).toBe('优先补底牌管理')
    expect(showdownPriority([{ key: 'counterplay_layers' }], new Set(['counterplay_layers']))).toBe('优先补三层破局')
    expect(showdownPriority([{ key: 'three_pressure_shock' }], new Set(['three_pressure_shock']))).toBe('优先补三压一爆三震')
    expect(showdownPriority([{ key: 'payoff_release' }], new Set(['payoff_release']))).toBe('优先补爽点释放')
    expect(showdownPriority([{ key: 'showdown_forbidden' }])).toBe('优先修高潮毒点')
    expect(showdownPriority([{ key: 'transmission_channel' }])).toBe('优先补传递通道')
    expect(showdownPriority([{ key: 'stage_chain' }])).toBe('优先补舞台层级')
    expect(showdownPriority([{ key: 'shock_chain' }])).toBe('优先补震惊分层')
    expect(showdownPriority([{ key: 'combat_design' }])).toBe('优先补战斗/智斗过程')
    expect(showdownPriority([{ key: 'weak_over_strong' }])).toBe('优先补以弱胜强依据')
    expect(showdownPriority([{ key: 'emotion_rhythm' }])).toBe('优先补急缓急节奏')
    expect(showdownPriority([])).toBe('')
  })
})
