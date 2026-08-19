import { describe, expect, test } from 'bun:test'
import { chapterHasMatchingOutline, chapterTextHasProse } from './write-chapter-precheck'

describe('chapterTextHasProse', () => {
  test('nonempty text without placeholder is prose', () => {
    expect(chapterTextHasProse('已有')).toBe(true)
  })

  test('empty, whitespace, and placeholder drafts are not prose', () => {
    expect(chapterTextHasProse('')).toBe(false)
    expect(chapterTextHasProse('   ')).toBe(false)
    expect(chapterTextHasProse('【占位正文】草稿')).toBe(false)
  })
})

describe('chapterHasMatchingOutline', () => {
  test('matches by chapter.outline_id', () => {
    expect(chapterHasMatchingOutline(
      { outline_id: 7, chapter_no: 99 },
      [{ id: 7, raw_payload: {} }],
    )).toBe(true)
  })

  test('matches by raw_payload.chapter_no', () => {
    expect(chapterHasMatchingOutline(
      { chapter_no: 1 },
      [{ id: 2, raw_payload: { chapter_no: 1 } }],
    )).toBe(true)
  })

  test('matches by kernel_rel_path chapter number', () => {
    expect(chapterHasMatchingOutline(
      { chapter_no: 1 },
      [{ id: 3, raw_payload: { kernel_rel_path: '大纲/细纲_第001章.md' } }],
    )).toBe(true)
  })

  test('title like 第1章 总纲 without payload or rel_path is not a match', () => {
    expect(chapterHasMatchingOutline(
      { chapter_no: 1 },
      [{ id: 4, raw_payload: {}, title: '第1章 总纲' } as any],
    )).toBe(false)
  })
})
