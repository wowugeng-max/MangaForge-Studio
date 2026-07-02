import { describe, expect, test } from 'bun:test'
import { resolveActiveWorkspaceChapterId, resolveSelectedWorkspaceModelId } from './useNovelWorkspaceData'

describe('novel workspace model selector', () => {
  test('falls back when the currently selected model is no longer returned by the model list', () => {
    const models = [
      { id: 2, display_name: 'Fallback', model_name: 'fallback', is_favorite: false },
      { id: 3, display_name: 'Favorite', model_name: 'favorite', is_favorite: true },
    ]

    expect(resolveSelectedWorkspaceModelId(1, models)).toBe(3)
  })

  test('keeps the selected model while it is still available and clears empty lists', () => {
    expect(resolveSelectedWorkspaceModelId(2, [{ id: 2 }, { id: 3, is_favorite: true }])).toBe(2)
    expect(resolveSelectedWorkspaceModelId(2, [])).toBeUndefined()
  })
})

describe('novel workspace active chapter selector', () => {
  test('keeps the current active chapter when refreshed chapters still contain it', () => {
    const chapters = [
      { id: 1, chapter_no: 1, chapter_text: '第一章正文' },
      { id: 2, chapter_no: 2, chapter_text: '' },
      { id: 3, chapter_no: 3, chapter_text: '' },
    ]

    expect(resolveActiveWorkspaceChapterId(3, chapters)).toBe(3)
  })

  test('falls back to first written chapter or first chapter only when current chapter is missing', () => {
    expect(resolveActiveWorkspaceChapterId(9, [
      { id: 1, chapter_no: 1, chapter_text: '' },
      { id: 2, chapter_no: 2, chapter_text: '第二章正文' },
    ])).toBe(2)
    expect(resolveActiveWorkspaceChapterId(null, [
      { id: 1, chapter_no: 1, chapter_text: '' },
      { id: 2, chapter_no: 2, chapter_text: '' },
    ])).toBe(1)
    expect(resolveActiveWorkspaceChapterId(1, [])).toBeNull()
  })
})
