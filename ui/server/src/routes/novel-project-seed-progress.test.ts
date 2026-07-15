import { describe, expect, test } from 'bun:test'
import {
  PROJECT_SEED_UI_STEPS,
  mapBackendStageToUiStep,
  buildProjectSeedStageEvent,
  clampProgress,
} from './novel-project-seed-progress'

describe('project seed progress helpers', () => {
  test('maps backend stages onto fixed UI steps', () => {
    expect(mapBackendStageToUiStep('skeleton')).toBe(0)
    expect(mapBackendStageToUiStep('outlines')).toBe(1)
    expect(mapBackendStageToUiStep('volumes')).toBe(1)
    expect(mapBackendStageToUiStep('foreshadowing')).toBe(2)
    expect(mapBackendStageToUiStep('assemble')).toBe(3)
  })

  test('builds stage events with clamped progress and labels', () => {
    const event = buildProjectSeedStageEvent({
      stage: 'outlines',
      status: 'running',
      progress: 1.4,
      detail: 'pass_a2 chapters=12',
      outline_chapter_count: 12,
    })
    expect(event.type).toBe('stage')
    expect(event.stage).toBe('outlines')
    expect(event.ui_step).toBe(1)
    expect(event.label).toBe(PROJECT_SEED_UI_STEPS[1])
    expect(event.progress).toBe(1)
    expect(event.detail).toContain('pass_a2')
    expect(clampProgress(-1)).toBe(0)
  })
})
