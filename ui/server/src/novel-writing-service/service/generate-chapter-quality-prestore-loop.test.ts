import { describe, expect, test } from 'bun:test'
import { prepareSanitizedQualityRevisionCandidate } from './generate-chapter-quality-prestore-loop'

describe('quality prestore revision candidate authority', () => {
  test('returns only the sanitized candidate when sanitize makes a valid-length revision under target', () => {
    const unsafeMarker = '给你的时间不多了'
    const unsafeRevision = `正文继续推进。${unsafeMarker}。补足目标长度。`
    const normalizedRevision = unsafeRevision.trim()
    const sanitizedRevision = '正文继续推进。'
    const targetMin = 20
    const normalizeInputs: unknown[] = []
    const sanitizeInputs: string[] = []

    const candidate = prepareSanitizedQualityRevisionCandidate(unsafeRevision, {
      normalize: (value) => {
        normalizeInputs.push(value)
        return normalizedRevision
      },
      sanitize: (value) => {
        sanitizeInputs.push(value)
        return sanitizedRevision
      },
    })

    expect(normalizedRevision.length).toBeGreaterThanOrEqual(targetMin)
    expect(sanitizedRevision.length).toBeLessThan(targetMin)
    expect(normalizeInputs).toEqual([unsafeRevision])
    expect(sanitizeInputs).toEqual([normalizedRevision])
    expect(candidate).toBe(sanitizedRevision)
    expect(candidate).not.toContain(unsafeMarker)
  })
})
