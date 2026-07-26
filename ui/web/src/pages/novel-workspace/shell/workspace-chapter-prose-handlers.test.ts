import { describe, expect, test } from 'bun:test'
import { canFinalizeProseRun } from './workspace-chapter-prose-handlers'

describe('canFinalizeProseRun', () => {
  test('the active run may write shared streaming UI state', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(run, run)).toBe(true)
  })

  test('a run superseded by a newer controller must not write shared state', () => {
    const oldRun = new AbortController()
    const newRun = new AbortController()
    expect(canFinalizeProseRun(newRun, oldRun)).toBe(false)
  })

  test('after cancel/end with no successor the finishing run may clean up', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(null, run)).toBe(true)
    expect(canFinalizeProseRun(undefined, run)).toBe(true)
  })
})
