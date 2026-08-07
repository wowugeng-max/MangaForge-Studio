import { describe, expect, test } from 'bun:test'
import {
  resolveChapterContextReferencePreview,
} from './chapter-context-package'

describe('chapter context reference preview injection', () => {
  test('treats an own null referencePreview as a deterministic snapshot boundary', async () => {
    let previewCalls = 0
    const result = await resolveChapterContextReferencePreview(
      { id: 3 },
      { referencePreview: null },
      async () => {
        previewCalls += 1
        return { entries: [{ id: 'must-not-query' }] }
      },
    )

    expect(result).toBeNull()
    expect(previewCalls).toBe(0)
  })

  test('keeps the existing preview lookup when the option is omitted', async () => {
    let previewCalls = 0
    const expected = { entries: [{ id: 'default-preview' }] }
    const result = await resolveChapterContextReferencePreview(
      { id: 3 },
      {},
      async (_project, taskType) => {
        previewCalls += 1
        expect(taskType).toBe('正文创作')
        return expected
      },
    )

    expect(result).toBe(expected)
    expect(previewCalls).toBe(1)
  })

  test('treats an own undefined referencePreview as omitted rather than disabled', async () => {
    let previewCalls = 0
    const expected = { entries: [{ id: 'default-preview' }] }
    const result = await resolveChapterContextReferencePreview(
      { id: 3 },
      { referencePreview: undefined },
      async () => {
        previewCalls += 1
        return expected
      },
    )

    expect(result).toBe(expected)
    expect(previewCalls).toBe(1)
  })

  test('preserves the existing fail-closed null fallback for preview errors', async () => {
    const result = await resolveChapterContextReferencePreview(
      { id: 3 },
      {},
      async () => { throw new Error('knowledge preview unavailable') },
    )

    expect(result).toBeNull()
  })
})
