import { describe, expect, test } from 'bun:test'
import {
  PROJECT_SEED_UI_STEPS,
  mapBackendStageToUiStep,
  buildProjectSeedStageEvent,
  clampProgress,
  safeReportProjectSeedProgress,
  resolvePassA3VolumeStageStatus,
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

  test('safeReportProjectSeedProgress is a no-op when onProgress is undefined', () => {
    expect(() => {
      safeReportProjectSeedProgress(undefined, {
        stage: 'volumes',
        status: 'running',
        progress: 0.6,
        detail: 'pass_a3',
      })
    }).not.toThrow()
  })

  test('safeReportProjectSeedProgress swallows reporter errors', () => {
    expect(() => {
      safeReportProjectSeedProgress(() => {
        throw new Error('ui sink failed')
      }, {
        stage: 'outlines',
        status: 'running',
        progress: 0.35,
        detail: 'pass_a',
      })
    }).not.toThrow()
  })

  test('safeReportProjectSeedProgress delivers a built stage event', () => {
    const received: any[] = []
    safeReportProjectSeedProgress((event) => {
      received.push(event)
    }, {
      stage: 'volumes',
      status: 'completed',
      progress: 0.65,
      detail: 'pass_a3',
      outline_volume_count: 3,
    })
    expect(received).toHaveLength(1)
    expect(received[0].type).toBe('stage')
    expect(received[0].stage).toBe('volumes')
    expect(received[0].status).toBe('completed')
    expect(received[0].ui_step).toBe(1)
    expect(received[0].label).toBe(PROJECT_SEED_UI_STEPS[1])
    expect(received[0].progress).toBe(0.65)
    expect(received[0].outline_volume_count).toBe(3)
    expect(typeof received[0].at).toBe('string')
  })

  test('resolvePassA3VolumeStageStatus stays honest for empty volumes', () => {
    expect(resolvePassA3VolumeStageStatus(0)).toBe('error')
    expect(resolvePassA3VolumeStageStatus(3)).toBe('completed')
  })
})
