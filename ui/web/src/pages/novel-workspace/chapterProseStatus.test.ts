import { describe, expect, test } from 'bun:test'
import {
  chapterHasProse,
  chapterIsPlaceholder,
  chapterStatusTag,
  chapterWordCount,
} from './utils'
import { applyWorkspaceDetailResults } from './workspaceDetailCache'

describe('chapter prose status helpers', () => {
  test('treats compact has_prose and word_count as written without chapter_text', () => {
    const summary = { id: 1, chapter_no: 1, title: '异常入局', has_prose: true, word_count: 3570 }
    expect(chapterHasProse(summary)).toBe(true)
    expect(chapterIsPlaceholder(summary)).toBe(false)
    expect(chapterWordCount(summary)).toBe(3570)
    expect(String((chapterStatusTag(summary) as any)?.props?.children || '')).toContain('已写')
  })

  test('keeps unwritten when compact fields are empty', () => {
    const summary = { id: 2, chapter_no: 2, title: '旧法失准', has_prose: false, word_count: 0 }
    expect(chapterHasProse(summary)).toBe(false)
    expect(chapterWordCount(summary)).toBe(0)
    expect(String((chapterStatusTag(summary) as any)?.props?.children || '')).toContain('未写')
  })

  test('marks placeholder prose separately', () => {
    const chapter = { id: 3, chapter_text: '【占位正文】后续待写', has_prose: true, word_count: 12 }
    expect(chapterIsPlaceholder(chapter)).toBe(true)
    expect(chapterHasProse(chapter)).toBe(false)
    expect(String((chapterStatusTag(chapter) as any)?.props?.children || '')).toContain('占位')
  })

  test('summary has_prose survives detail wipe and still counts as written after merge', () => {
    const summaries = [
      { id: 8, chapter_no: 8, has_prose: true, word_count: 4200 },
      { id: 9, chapter_no: 9, has_prose: false, word_count: 0 },
    ]
    const ready = applyWorkspaceDetailResults(summaries, [
      { kind: 'chapter', id: 8, status: 'ready', record: { id: 8, chapter_no: 8, chapter_text: '完整正文' } },
    ])
    expect(chapterHasProse(ready[0])).toBe(true)
    expect(chapterWordCount(ready[0])).toBe(4)

    const afterClear = applyWorkspaceDetailResults(summaries, [])
    expect(chapterHasProse(afterClear[0])).toBe(true)
    expect(chapterWordCount(afterClear[0])).toBe(4200)
    expect(chapterHasProse(afterClear[1])).toBe(false)
  })
})
