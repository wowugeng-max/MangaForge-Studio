import { describe, expect, test } from 'bun:test'
import { resolveSelectedWorkspaceModelId } from './useNovelWorkspaceData'

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
