import { describe, expect, test } from 'bun:test'
import {
  normalizeReversalFaceSlapCheck,
  normalizeReversalImpactCheck,
  normalizeReversalMisdirectionCheck,
  normalizeReversalSetupCheck,
  normalizeReversalTimingCheck,
  normalizeReversalTypeCheck,
  reversalArray,
  reversalPriority,
  reversalSetupEvidence,
  reversalTypeDelivered,
} from './reversal-basics'

describe('reversal basic sync checks', () => {
  test('normalizes reversal arrays into unique compact strings', () => {
    expect(reversalArray(' 信息反转 ', ['身份反转', '', null], { type: '动机反转' }, '信息反转')).toEqual([
      '信息反转',
      '身份反转',
      '{"type":"动机反转"}',
    ])
  })

  test('extracts setup evidence from exact planned clues and generic signals', () => {
    const chapter = '账册页码错位，袖口露出旧部印记。证人知道账册细节，暗格里还藏着提前备份副本。'
    const evidence = reversalSetupEvidence(['页码错位', '袖口旧部印记', '证人知道账册细节'], chapter)

    expect(evidence).toContain('页码错位')
    expect(evidence).toContain('袖口旧部印记')
    expect(evidence).toContain('证人知道账册细节')
    expect(evidence).toContain('提前布局暗示')
  })

  test('normalizes reversal setup checks with required clue counts', () => {
    const delivered = normalizeReversalSetupCheck({
      setup_plan: ['页码错位', '袖口旧部印记', '证人知道账册细节'],
      setup_requirements: '至少三处公平暗示',
    }, '账册页码错位，袖口露出旧部印记。证人知道账册细节。')
    const missed = normalizeReversalSetupCheck({
      setup_plan: ['页码错位', '袖口旧部印记', '证人知道账册细节'],
      setup_requirements: '至少三处公平暗示',
    }, '只有风声吹过屋檐。')

    expect(delivered).toMatchObject({
      key: 'setup_clues',
      label: '铺垫暗示',
      score: 90,
      delivered: true,
      status: 'ok',
      missed_items: [],
    })
    expect(missed).toMatchObject({
      score: 25,
      delivered: false,
      status: 'warn',
      missed_items: ['页码错位', '袖口旧部印记', '证人知道账册细节', '至少三处公平暗示'],
      issue: '反转前公平暗示不足：需要 3 处，当前可识别 0 处。',
    })
    expect(normalizeReversalSetupCheck({}, '正文')).toBeNull()
  })

  test('checks reversal types through category rules and anchor fallback', () => {
    const chapter = '真相揭示：账册缺页不是虫蛀而是名单被调换。她的身份真正坐实，袖口旧部印记也露出。'

    expect(reversalTypeDelivered('信息反转', chapter)).toBe(true)
    expect(reversalTypeDelivered('身份反转', chapter)).toBe(true)
    expect(reversalTypeDelivered('账册缺页', chapter)).toBe(true)
    expect(reversalTypeDelivered('动机反转', chapter)).toBe(false)

    const check = normalizeReversalTypeCheck(['信息反转', '身份反转', '动机反转'], chapter)
    expect(check).toMatchObject({
      key: 'reversal_types',
      label: '反转类型',
      score: 67,
      delivered: true,
      status: 'ok',
      evidence: ['信息反转', '身份反转'],
      missed_items: ['动机反转'],
    })
    expect(normalizeReversalTypeCheck([], chapter)).toBeNull()
  })

  test('normalizes misdirection timing impact and face-slap checks', () => {
    const chapter = `${'铺垫'.repeat(120)}众人以为只是虫蛀，这个假提示后来却被揭示：真相不是虫蛀而是账册被调换，审判庭因此改判，全场改口，资格被取消。`

    const misdirection = normalizeReversalMisdirectionCheck(['假提示必须发挥功能'], chapter)
    const timing = normalizeReversalTimingCheck(['揭示放在后段'], chapter, { evidence: ['一', '二', '三'] })
    const impact = normalizeReversalImpactCheck(chapter)
    const faceSlap = normalizeReversalFaceSlapCheck(['先压迫后反证'], `执事冷笑逼她认罪，当众取消资格。她亮出证据反证，对方当场改口，全场看清。`)

    expect(misdirection).toMatchObject({
      score: 86,
      delivered: true,
      status: 'ok',
      evidence: ['误导有正文证据并被揭示改写'],
    })
    expect(timing?.delivered).toBe(true)
    expect(timing?.evidence[0]).toMatch(/^揭示约在 (6[2-9]|7[0-9]|8[0-9]|9[0-2])%$/)
    expect(impact).toMatchObject({
      score: 86,
      delivered: true,
      evidence: ['揭示后改变局势/规则/追查方向'],
    })
    expect(faceSlap).toMatchObject({
      score: 86,
      delivered: true,
      evidence: ['先压迫', '后反证/改口'],
    })
  })

  test('keeps missed reversal checks actionable', () => {
    const misdirection = normalizeReversalMisdirectionCheck(['公平误导'], '大家走进屋子。')
    const timing = normalizeReversalTimingCheck(['后段揭示'], '开头就揭示真相。', { evidence: ['一'] })
    const impact = normalizeReversalImpactCheck('真相公布，大家听完就散了。')
    const faceSlap = normalizeReversalFaceSlapCheck(['先压迫后反证'], '她只是证明了账册内容。')

    expect(misdirection).toMatchObject({
      score: 28,
      delivered: false,
      status: 'warn',
      missed_items: ['公平误导'],
      issue: '反转缺少公平误导，或误导没有在揭示时发挥剧情功能。',
    })
    expect(timing).toMatchObject({
      delivered: false,
      status: 'warn',
      missed_items: ['后段揭示'],
    })
    expect(impact).toMatchObject({
      score: 42,
      delivered: false,
      missed_items: ['揭示后影响'],
    })
    expect(faceSlap).toMatchObject({
      score: 58,
      delivered: false,
      missed_items: ['先压迫后反证'],
    })
  })

  test('prioritizes reversal repair categories', () => {
    expect(reversalPriority([{ key: 'reversal_forbidden' }, { key: 'setup_clues' }])).toBe('优先修反转毒点')
    expect(reversalPriority([{ key: 'setup_clues' }])).toBe('优先补3处暗示')
    expect(reversalPriority([{ key: 'misdirection' }])).toBe('优先补公平误导')
    expect(reversalPriority([{ key: 'reveal_timing' }])).toBe('优先调揭示时机')
    expect(reversalPriority([{ key: 'reversal_impact' }])).toBe('优先补揭示后影响')
    expect(reversalPriority([{ key: 'face_slap_rhythm' }])).toBe('优先补打脸节奏')
    expect(reversalPriority([])).toBe('')
  })
})
