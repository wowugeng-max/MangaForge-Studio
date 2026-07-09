import { describe, expect, test } from 'bun:test'
import {
  buildChapterHookDeterministicCheck,
  chapterHookPriority,
  chapterHookScopedText,
  normalizeChapterHookCheck,
} from './chapter-hook-basics'

describe('chapter hook basic sync checks', () => {
  test('scopes chapter text after dropping a title line', () => {
    const opening = '开篇钩子'.repeat(120)
    const ending = '章尾追问'.repeat(140)
    const chapter = `第3章 旧账翻红\n${opening}${ending}`

    expect(chapterHookScopedText(chapter, 'opening')).toBe(`${opening}${ending}`.slice(0, 900))
    expect(chapterHookScopedText(chapter, 'ending')).toBe(`${opening}${ending}`.slice(-900))
    expect(chapterHookScopedText(chapter, 'full')).toBe(`${opening}${ending}`)
  })

  test('normalizes delivered opening and ending hook checks by scope', () => {
    const chapter = `第1章 祠堂惊变\n旧账册当众变红，逼得林青禾立刻问出第一句。${'过场'.repeat(500)}暗格里露出第二枚红印，证人只说下一页在河底。`

    const opening = normalizeChapterHookCheck(
      'opening_hook',
      '章首钩子',
      '旧账册当众变红',
      chapter,
      'opening',
      '重写章首。',
    )
    const ending = normalizeChapterHookCheck(
      'ending_hook',
      '章尾钩子',
      '下一页在河底',
      chapter,
      'ending',
      '重写章尾。',
    )

    expect(opening?.status).toBe('ok')
    expect(opening?.delivered).toBe(true)
    expect(opening?.score).toBeGreaterThanOrEqual(82)
    expect(opening?.missed_items).toEqual([])
    expect(ending?.status).toBe('ok')
    expect(ending?.delivered).toBe(true)
    expect(ending?.evidence).toEqual(['下一页在河底'])
  })

  test('keeps missed hook checks actionable', () => {
    const check = normalizeChapterHookCheck(
      'ending_hook',
      '章尾钩子',
      '证人把名单交给反派',
      '第1章 祠堂惊变\n主角关上门，事情暂时结束。',
      'ending',
      '补出下一章压力。',
    )

    expect(check?.status).toBe('warn')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(['证人把名单交给反派'])
    expect(check?.issue).toBe('章尾钩子未充分兑现：证人把名单交给反派')
    expect(check?.repair_instruction).toBe('补出下一章压力。')
  })

  test('builds deterministic chapter hook checks from risk lists', () => {
    expect(buildChapterHookDeterministicCheck('opening', '章首钩子', [], '前100字必须有钩子', '重写章首')).toBeNull()

    const check = buildChapterHookDeterministicCheck(
      'deterministic_opening_hook',
      '章首钩子',
      [
        { key: 'no_hook', label: '缺少钩子', evidence: '前100字只有天气说明' },
        { key: 'late_protagonist', label: '主角出场太晚', fix: '主角必须立刻入场' },
      ],
      '前100字必须有钩子',
      '重写章首',
    )

    expect(check).toMatchObject({
      key: 'deterministic_opening_hook',
      label: '章首钩子',
      text: '前100字必须有钩子',
      expected: '前100字必须有钩子',
      score: 64,
      delivered: false,
      status: 'warn',
      missed_items: ['缺少钩子', '主角出场太晚'],
      issue: '正文触发 2 项章首钩子确定性风险。',
      repair_instruction: '重写章首',
    })
    expect(check?.evidence).toEqual(['前100字只有天气说明', '主角必须立刻入场'])
  })

  test('prioritizes chapter hook repair categories', () => {
    expect(chapterHookPriority([{ key: 'opening_hook' }, { key: 'ending_hook' }])).toBe('优先修章首钩子')
    expect(chapterHookPriority([{ key: 'deterministic_ending_hook' }])).toBe('优先修章尾钩子')
    expect(chapterHookPriority([{ key: 'ending_contract' }])).toBe('优先补章尾合同')
    expect(chapterHookPriority([{ key: 'opening_hook_echo' }])).toBe('优先回收开篇钩子')
    expect(chapterHookPriority([])).toBe('')
  })
})
