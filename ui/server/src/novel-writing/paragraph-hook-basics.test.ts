import { describe, expect, test } from 'bun:test'
import {
  buildParagraphHookDeterministicCheck,
  normalizeParagraphHookCombinationCheck,
  normalizeParagraphHookListCheck,
  normalizeParagraphHookPresenceCheck,
  paragraphHookArray,
  paragraphHookCombinationDelivered,
  paragraphHookPriority,
  paragraphHookTypeDelivered,
} from './paragraph-hook-basics'

describe('paragraph hook basic sync checks', () => {
  test('normalizes paragraph hook arrays into unique compact strings', () => {
    expect(paragraphHookArray(' 信息差 ', ['倒计时', '', null], { type: '暗牌' }, '信息差')).toEqual([
      '信息差',
      '倒计时',
      '{"type":"暗牌"}',
    ])
  })

  test('detects known paragraph hook types and falls back to anchor matching', () => {
    const chapter = '她不知道证人隐瞒了名单。天亮前必须交出旧印，否则取消资格。暗牌还没亮，账册缺页却露出新的红印。'

    expect(paragraphHookTypeDelivered('信息差', chapter)).toBe(true)
    expect(paragraphHookTypeDelivered('倒计时', chapter)).toBe(true)
    expect(paragraphHookTypeDelivered('暗牌', chapter)).toBe(true)
    expect(paragraphHookTypeDelivered('账册缺页', chapter)).toBe(true)
    expect(paragraphHookTypeDelivered('灵魂旁观', chapter)).toBe(false)
  })

  test('normalizes list checks with all-required and partial-required modes', () => {
    const chapter = '她不知道名单被隐瞒。天亮前必须交出旧印，否则取消资格。'

    const allRequired = normalizeParagraphHookListCheck(
      'micro_hook_types',
      '微钩子类型',
      ['信息差', '倒计时', '打脸'],
      chapter,
      '补微钩子。',
    )
    const partialRequired = normalizeParagraphHookListCheck(
      'micro_hook_types',
      '微钩子类型',
      ['信息差', '倒计时', '打脸'],
      chapter,
      '补微钩子。',
      { requireAll: false },
    )

    expect(allRequired).toMatchObject({
      score: 67,
      delivered: false,
      status: 'warn',
      evidence: ['信息差', '倒计时'],
      missed_items: ['打脸'],
      issue: '微钩子类型未充分落地：打脸',
      repair_instruction: '补微钩子。',
    })
    expect(partialRequired).toMatchObject({
      score: 67,
      delivered: true,
      status: 'ok',
      missed_items: ['打脸'],
      repair_instruction: '',
    })
    expect(normalizeParagraphHookListCheck('empty', '空', [], chapter, 'fix')).toBeNull()
  })

  test('checks hook combinations as conjunctive parts with any delivered combination passing', () => {
    const chapter = '她不知道名单被隐瞒。暗牌还没亮，账册缺页却露出新的红印。'

    expect(paragraphHookCombinationDelivered('信息差 + 暗牌', chapter)).toBe(true)
    expect(paragraphHookCombinationDelivered('倒计时 + 打脸', chapter)).toBe(false)

    const check = normalizeParagraphHookCombinationCheck(['倒计时 + 打脸', '信息差 + 暗牌'], chapter)
    expect(check).toMatchObject({
      key: 'hook_combinations',
      label: '钩子组合',
      score: 50,
      delivered: true,
      status: 'ok',
      evidence: ['信息差 + 暗牌'],
      missed_items: ['倒计时 + 打脸'],
      repair_instruction: '',
    })
  })

  test('normalizes presence checks and resets reusable regex state', () => {
    const pattern = /取消资格/g
    const first = normalizeParagraphHookPresenceCheck(
      'unfair_injury',
      '不公平伤害',
      ['取消资格'],
      '她被当众取消资格。',
      pattern,
      '补不公平伤害。',
    )
    const second = normalizeParagraphHookPresenceCheck(
      'unfair_injury',
      '不公平伤害',
      ['取消资格'],
      '她被当众取消资格。',
      pattern,
      '补不公平伤害。',
    )
    const missed = normalizeParagraphHookPresenceCheck(
      'unfair_injury',
      '不公平伤害',
      ['取消资格'],
      '她平静离场。',
      pattern,
      '补不公平伤害。',
    )

    expect(first?.status).toBe('ok')
    expect(second?.status).toBe('ok')
    expect(missed).toMatchObject({
      score: 42,
      delivered: false,
      status: 'warn',
      missed_items: ['取消资格'],
      issue: '不公平伤害没有正文证据。',
      repair_instruction: '补不公平伤害。',
    })
  })

  test('builds deterministic checks and prioritizes paragraph hook repairs', () => {
    expect(buildParagraphHookDeterministicCheck([])).toBeNull()

    const deterministic = buildParagraphHookDeterministicCheck([
      { key: 'stall', label: '连续段落停滞', evidence: '第4-8段没有信息变化' },
      { key: 'shock_flat', label: '围观反应单层', fix: '补高位者反应' },
    ])

    expect(deterministic).toMatchObject({
      key: 'paragraph_stall',
      label: '段落停滞',
      score: 56,
      delivered: false,
      status: 'warn',
      evidence: ['第4-8段没有信息变化', '补高位者反应'],
      missed_items: ['连续段落停滞', '围观反应单层'],
      issue: '正文触发 2 项段落级钩子确定性风险。',
    })
    expect(paragraphHookPriority([{ key: 'paragraph_stall' }, { key: 'hook_combinations' }])).toBe('优先补段落推进')
    expect(paragraphHookPriority([{ key: 'hook_combinations' }])).toBe('优先补钩子组合')
    expect(paragraphHookPriority([{ key: 'micro_hook_types' }])).toBe('优先补微钩子')
    expect(paragraphHookPriority([{ key: 'dialogue_escalation' }])).toBe('优先补对话递进')
    expect(paragraphHookPriority([{ key: 'spectator_layers' }])).toBe('优先补围观者层级')
    expect(paragraphHookPriority([])).toBe('')
  })
})
