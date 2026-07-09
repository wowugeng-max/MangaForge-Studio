import { describe, expect, test } from 'bun:test'
import {
  normalizeSuspenseListCheck,
  normalizeSuspenseStrengthCheck,
  suspenseArray,
  suspenseInformationOrderDelivered,
  suspensePriority,
  suspenseSignalDelivered,
} from './suspense-basics'

describe('suspense basic sync checks', () => {
  test('normalizes suspense arrays into unique compact strings', () => {
    expect(suspenseArray(' 提出疑问 ', ['虚假提示', '', null], { type: '答案揭示' }, '提出疑问')).toEqual([
      '提出疑问',
      '虚假提示',
      '{"type":"答案揭示"}',
    ])
  })

  test('detects suspense signals with rule shortcuts and anchor fallback', () => {
    const chapter = '缺页到底藏着什么？她以为只是虫蛀，直到红印证明账册指向第三个证人。下一条内库名单还没查完。'

    expect(suspenseSignalDelivered('提出疑问', chapter)).toBe(true)
    expect(suspenseSignalDelivered('虚假提示', chapter)).toBe(true)
    expect(suspenseSignalDelivered('公布答案', chapter)).toBe(true)
    expect(suspenseSignalDelivered('期待接力', chapter)).toBe(true)
    expect(suspenseSignalDelivered('内库名单', chapter)).toBe(true)
    expect(suspenseSignalDelivered('高位者震惊', chapter)).toBe(false)
  })

  test('checks information order templates with dedicated suspense rules', () => {
    const exploration = '缺页到底藏着什么？她沿着撕痕找到旧印线索，最后证明名单指向第三个证人。'
    const surprise = '缺页到底藏着什么？众人以为只是虫蛀，这个假提示和第二行对立，最后真相露出。'
    const direct = '缺页到底藏着什么？最后答案公布，旧印证明名单被调换。'

    expect(suspenseInformationOrderDelivered('探索剧情 正常提示', exploration)).toBe(true)
    expect(suspenseInformationOrderDelivered('意外+反转 虚假对立提示', surprise)).toBe(true)
    expect(suspenseInformationOrderDelivered('直白剧情 提出疑问', direct)).toBe(true)
    expect(suspenseInformationOrderDelivered('意外剧情 虚假提示', exploration)).toBe(false)
  })

  test('normalizes suspense list checks with full and partial delivery rules', () => {
    const chapter = '缺页到底藏着什么？她以为只是虫蛀，直到真相露出。下一条线索还没查完。'

    const allRequired = normalizeSuspenseListCheck(
      'suspense_cycle',
      '三段钩子',
      ['提出疑问', '虚假提示', '震惊分层'],
      chapter,
      '补三段钩子。',
    )
    const partialRequired = normalizeSuspenseListCheck(
      'suspense_cycle',
      '三段钩子',
      ['提出疑问', '虚假提示', '震惊分层'],
      chapter,
      '补三段钩子。',
      { requireAll: false },
    )

    expect(allRequired).toMatchObject({
      score: 67,
      delivered: false,
      status: 'warn',
      evidence: ['提出疑问', '虚假提示'],
      missed_items: ['震惊分层'],
      issue: '三段钩子未充分落地：震惊分层',
      repair_instruction: '补三段钩子。',
    })
    expect(partialRequired).toMatchObject({
      score: 67,
      delivered: true,
      status: 'ok',
      missed_items: ['震惊分层'],
      repair_instruction: '',
    })
    expect(normalizeSuspenseListCheck('empty', '空', [], chapter, 'fix')).toBeNull()
  })

  test('normalizes suspense strength checks for medium and light suspense', () => {
    const strong = normalizeSuspenseStrengthCheck(
      '中悬念',
      '缺页到底藏着什么？天亮前必须证明，否则取消资格。最后真相露出，却牵出下一条内库名单。',
    )
    const weak = normalizeSuspenseStrengthCheck(
      '轻悬念',
      '缺页到底藏着什么？最后答案公布。',
    )
    const missed = normalizeSuspenseStrengthCheck(
      '中悬念',
      '她觉得这件事很神秘。',
    )

    expect(strong).toMatchObject({
      key: 'suspense_strength',
      score: 86,
      evidence: ['疑问', '压力', '答案/揭示', '新期待'],
      delivered: true,
      status: 'ok',
      missed_items: [],
    })
    expect(weak?.delivered).toBe(true)
    expect(missed).toMatchObject({
      score: 28,
      delivered: false,
      status: 'warn',
      missed_items: ['中悬念'],
      issue: '悬念强度未达到 中悬念。',
    })
    expect(normalizeSuspenseStrengthCheck('', '正文')).toBeNull()
  })

  test('prioritizes suspense repairs by highest-impact missed check', () => {
    expect(suspensePriority([{ key: 'foreshadowing_boundary_rules' }, { key: 'suspense_forbidden' }])).toBe('优先修悬念伏笔边界')
    expect(suspensePriority([{ key: 'suspense_forbidden' }])).toBe('优先修悬念禁忌')
    expect(suspensePriority([{ key: 'expectation_chain' }])).toBe('优先补期待链')
    expect(suspensePriority([{ key: 'information_order' }])).toBe('优先重排信息顺序')
    expect(suspensePriority([{ key: 'expectation_layers' }])).toBe('优先补期待接力')
    expect(suspensePriority([{ key: 'suspense_cycle' }])).toBe('优先补种养收')
    expect(suspensePriority([{ key: 'shock_layers' }])).toBe('优先补震惊分层')
    expect(suspensePriority([])).toBe('')
  })
})
