import { describe, expect, test } from 'bun:test'
import { formatChapterTreeNodeLabel } from './utils'

describe('outline tree labels', () => {
  test('renders chapter number before chapter title', () => {
    expect(formatChapterTreeNodeLabel({ type: 'chapter', chapter_no: 1, title: '双魂降临' })).toBe('第1章 双魂降临')
    expect(formatChapterTreeNodeLabel({ type: 'chapter', chapter_number: 12, title: '规则反转' })).toBe('第12章 规则反转')
  })

  test('does not invent chapter numbers for outline nodes or sparse chapters', () => {
    expect(formatChapterTreeNodeLabel({ type: 'outline', title: '卷一：初始公寓' })).toBe('卷一：初始公寓')
    expect(formatChapterTreeNodeLabel({ type: 'chapter', title: '未编号章节' })).toBe('章节 未编号章节')
  })
})
