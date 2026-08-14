import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fullProductionStore = readFileSync(join(import.meta.dir, 'generate-chapter-full-production-store.ts'), 'utf8')
const draftModeStore = readFileSync(join(import.meta.dir, 'generate-chapter-draft-mode-store.ts'), 'utf8')

function classifyHardFailuresBlock(source: string) {
  const classifyAt = source.indexOf('classifyProseAdmission({')
  expect(classifyAt).toBeGreaterThanOrEqual(0)
  const hardAt = source.indexOf('hard_failures: [', classifyAt)
  expect(hardAt).toBeGreaterThan(classifyAt)
  const closeAt = source.indexOf(']', hardAt)
  expect(closeAt).toBeGreaterThan(hardAt)
  return source.slice(hardAt, closeAt + 1)
}

describe('store detector resistance is advisory', () => {
  test('full production store evaluates detector but does not spread it into hard admission', () => {
    expect(fullProductionStore).toContain('evaluateResistanceAdmission(finalText)')
    expect(fullProductionStore).toContain("proseAdmissionWarning('quality', 'detector_resistance_reference'")
    const hardBlock = classifyHardFailuresBlock(fullProductionStore)
    expect(hardBlock).not.toContain('...resistanceAdmission.hard_failures')
    expect(hardBlock).toContain('...minimalValidation.failures')
    expect(hardBlock).toContain('...openingContinuityFailures')
    expect(hardBlock).toContain('...canonicalFailures')
  })

  test('draft mode store evaluates detector but does not spread it into hard admission', () => {
    expect(draftModeStore).toContain('evaluateResistanceAdmission(finalText)')
    expect(draftModeStore).toContain("proseAdmissionWarning('quality', 'detector_resistance_reference'")
    const hardBlock = classifyHardFailuresBlock(draftModeStore)
    expect(hardBlock).not.toContain('...draftResistanceAdmission.hard_failures')
  })
})
