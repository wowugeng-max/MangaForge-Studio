import { describe, expect, test } from 'bun:test'
import { locateProseAnnotations } from './prose-annotations'

const text = '林昭握紧了剑柄。夜风掠过城头，他忽然想起师父的话。\n\n他忽然想起师父的话，那年雪落满山。'

describe('locateProseAnnotations', () => {
  test('单处命中返回区间与元数据', () => {
    const issues = [{ severity: 'high', description: '重复句式', evidence: '夜风掠过城头', fix: '删改其一' }]
    const marks = locateProseAnnotations(text, issues)
    expect(marks).toHaveLength(1)
    expect(text.slice(marks[0].from, marks[0].to)).toBe('夜风掠过城头')
    expect(marks[0].severity).toBe('high')
    expect(marks[0].label).toBe('重复句式')
    expect(marks[0].fix).toBe('删改其一')
  })

  test('同一 evidence 多处出现全部标注', () => {
    const issues = [{ severity: 'medium', description: '原句复读', evidence: '他忽然想起师父的话' }]
    const marks = locateProseAnnotations(text, issues)
    expect(marks).toHaveLength(2)
    expect(marks[0].from).toBeLessThan(marks[1].from)
  })

  test('evidence 为数组时逐项匹配', () => {
    const issues = [{ severity: 'low', issue: '意象堆叠', evidence: ['夜风掠过城头', '雪落满山'] }]
    const marks = locateProseAnnotations(text, issues)
    expect(marks).toHaveLength(2)
  })

  test('匹配不到或过短的 evidence 跳过', () => {
    const issues = [
      { severity: 'high', description: '幻觉句', evidence: '这句话不存在于正文里' },
      { severity: 'high', description: '过短', evidence: '他' },
      '纯文本问题没有证据',
    ]
    expect(locateProseAnnotations(text, issues)).toHaveLength(0)
  })

  test('重叠区间保留严重度更高者', () => {
    const issues = [
      { severity: 'low', description: '轻问题', evidence: '夜风掠过城头，他忽然想起' },
      { severity: 'critical', description: '重问题', evidence: '夜风掠过城头' },
    ]
    const marks = locateProseAnnotations(text, issues)
    expect(marks).toHaveLength(1)
    expect(marks[0].severity).toBe('critical')
  })

  test('空文本或空问题返回空数组', () => {
    expect(locateProseAnnotations('', [{ evidence: '任意' }])).toEqual([])
    expect(locateProseAnnotations(text, [])).toEqual([])
  })
})
