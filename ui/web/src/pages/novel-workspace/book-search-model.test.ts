import { describe, expect, test } from 'bun:test'
import { searchChapterText, buildBookSearchSummary } from './book-search-model'

describe('searchChapterText', () => {
  test('返回命中位置与上下文片段', () => {
    const text = '前文铺垫很长很长很长很长很长很长。林昭拔剑而起。后续情节继续推进推进推进推进推进推进。'
    const hits = searchChapterText(text, '拔剑')
    expect(hits).toHaveLength(1)
    expect(hits[0].index).toBe(text.indexOf('拔剑'))
    expect(hits[0].snippet).toContain('拔剑')
    expect(hits[0].snippet.length).toBeLessThanOrEqual('拔剑'.length + 36 + 2)
  })

  test('大小写不敏感', () => {
    const hits = searchChapterText('He said Hello world', 'hello')
    expect(hits).toHaveLength(1)
  })

  test('多处命中且上限 20 条', () => {
    const text = Array.from({ length: 30 }, (_, i) => `第${i}句里有剑气纵横。`).join('')
    const hits = searchChapterText(text, '剑气')
    expect(hits).toHaveLength(20)
  })

  test('文本开头结尾命中时 snippet 不越界', () => {
    const hits = searchChapterText('剑气开头', '剑气')
    expect(hits[0].snippet).toBe('剑气开头')
  })

  test('空查询或过短查询返回空', () => {
    expect(searchChapterText('随便什么文本', '')).toEqual([])
    expect(searchChapterText('随便什么文本', '文')).toEqual([])
  })
})

describe('buildBookSearchSummary', () => {
  test('汇总章数与命中总数', () => {
    expect(buildBookSearchSummary([
      { chapterId: 1, chapterNo: 1, title: '开端', hits: [{ index: 0, snippet: 'a' }, { index: 5, snippet: 'b' }] },
      { chapterId: 2, chapterNo: 2, title: '转折', hits: [{ index: 3, snippet: 'c' }] },
    ])).toBe('2 章命中 3 处')
    expect(buildBookSearchSummary([])).toBe('无命中')
  })
})
