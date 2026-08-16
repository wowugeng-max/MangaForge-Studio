import { describe, expect, test } from 'bun:test'
import { chapterFileName, chapterRelPath, padChapterNo, safeChapterTitle } from './naming'

describe('projection naming', () => {
  test('pads chapter number to three digits', () => {
    expect(padChapterNo(2)).toBe('002')
    expect(padChapterNo(62)).toBe('062')
    expect(padChapterNo(1024)).toBe('1024')
  })

  test('sanitizes title to 中文/字母/数字/连字符', () => {
    expect(safeChapterTitle('违背规则的绝对防御')).toBe('违背规则的绝对防御')
    expect(safeChapterTitle('Hello, world! 第2章')).toBe('Helloworld第2章')
    expect(safeChapterTitle('a-b_c/d')).toBe('a-bcd')
    expect(safeChapterTitle('！？。')).toBe('未命名')
    expect(safeChapterTitle('')).toBe('未命名')
  })

  test('composes chapter file name and rel path', () => {
    expect(chapterFileName(62, '违背规则的绝对防御')).toBe('第062章_违背规则的绝对防御.md')
    expect(chapterRelPath(62, '违背规则的绝对防御')).toBe('正文/第062章_违背规则的绝对防御.md')
  })
})
