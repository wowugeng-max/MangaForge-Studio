import { describe, expect, test } from 'bun:test'
import { buildProseOutline } from './prose-outline'

describe('buildProseOutline', () => {
  test('按空行分段并取首行截断为 label', () => {
    const text = '林昭握紧了剑柄，望向远处的烽烟与城楼。\n\n夜风忽起。\n他翻身上马。\n\n第三段。'
    const outline = buildProseOutline(text)
    expect(outline).toHaveLength(3)
    expect(outline[0]).toMatchObject({ index: 1, from: 0, label: '林昭握紧了剑柄，望向远处' })
    expect(outline[1].label).toBe('夜风忽起。')
    expect(text.slice(outline[1].from)).toStartWith('夜风忽起。')
    expect(outline[2].label).toBe('第三段。')
  })

  test('连续多个空行只算一个分界', () => {
    const outline = buildProseOutline('甲段落内容甲段。\n\n\n\n乙段落内容乙段。')
    expect(outline).toHaveLength(2)
  })

  test('单段文本返回一项', () => {
    const outline = buildProseOutline('只有一段的内容。')
    expect(outline).toHaveLength(1)
    expect(outline[0].from).toBe(0)
  })

  test('空文本与纯空白返回空数组', () => {
    expect(buildProseOutline('')).toEqual([])
    expect(buildProseOutline('  \n\n  ')).toEqual([])
  })

  test('label 去除首尾引号与空白', () => {
    const outline = buildProseOutline('“你来了。”他说。')
    expect(outline[0].label).toBe('你来了。”他说。')
  })
})
