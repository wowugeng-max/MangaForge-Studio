import { describe, expect, test } from 'bun:test'
import { paragraphRangeAt } from './prose-editor-extensions'

const text = [
  '第一段第一行。',      // 0..7 (含换行到 8)
  '第一段第二行。',
  '',
  '第二段独行。',
  '',
  '',
  '第三段结尾无换行',
].join('\n')

describe('paragraphRangeAt', () => {
  test('段落中间位置返回整段区间', () => {
    const firstParagraph = '第一段第一行。\n第一段第二行。'
    const range = paragraphRangeAt(text, 10)
    expect(text.slice(range.from, range.to)).toBe(firstParagraph)
  })

  test('文首位置属于第一段', () => {
    const range = paragraphRangeAt(text, 0)
    expect(range.from).toBe(0)
    expect(text.slice(range.from, range.to)).toContain('第一段第一行。')
  })

  test('空行上返回空区间(光标位置本身)', () => {
    const emptyLinePos = text.indexOf('\n\n') + 1
    const range = paragraphRangeAt(text, emptyLinePos)
    expect(range.from).toBe(range.to)
  })

  test('单行段落返回该行', () => {
    const pos = text.indexOf('第二段独行。') + 2
    const range = paragraphRangeAt(text, pos)
    expect(text.slice(range.from, range.to)).toBe('第二段独行。')
  })

  test('文末无换行的段落', () => {
    const range = paragraphRangeAt(text, text.length)
    expect(text.slice(range.from, range.to)).toBe('第三段结尾无换行')
    expect(range.to).toBe(text.length)
  })
})
