import { describe, expect, test } from 'bun:test'
import { normalizeUploadFilename } from './asset-upload'

describe('asset upload filename normalization', () => {
  test('keeps same-millisecond uploads from overwriting identical filenames', () => {
    const originalNow = Date.now
    Date.now = () => 1700000000000
    try {
      const first = normalizeUploadFilename('shot.png')
      const second = normalizeUploadFilename('shot.png')

      expect(first).not.toBe(second)
      expect(first).toEndWith('-shot.png')
      expect(second).toEndWith('-shot.png')
    } finally {
      Date.now = originalNow
    }
  })
})
