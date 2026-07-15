import { describe, expect, test } from 'bun:test'
import {
  parseProjectSeedSseChunk,
  reduceProjectSeedStreamState,
  createInitialProjectSeedStreamState,
} from './useProjectSeedStream'
import { PROJECT_SEED_UI_STEPS } from './projectSeedStreamTypes'

describe('project seed SSE client helpers', () => {
  test('parses data frames into events', () => {
    const frames = parseProjectSeedSseChunk(
      'data: {"type":"stage","stage":"skeleton","status":"running","ui_step":0,"label":"整理故事骨架","progress":0.1}\n\n',
    )
    expect(frames[0].type).toBe('stage')
    expect((frames[0] as any).ui_step).toBe(0)
  })

  test('reduces stage events into 4-step UI state', () => {
    let state = reduceProjectSeedStreamState(undefined, {
      type: 'stage',
      stage: 'outlines',
      status: 'running',
      ui_step: 1,
      label: PROJECT_SEED_UI_STEPS[1],
      progress: 0.4,
      detail: 'pass_a',
    } as any)
    expect(state.steps[0].status).toBe('completed')
    expect(state.steps[1].status).toBe('running')
    expect(state.progress).toBe(0.4)
    state = reduceProjectSeedStreamState(state, {
      type: 'result',
      ok: true,
      seed: { title: 'x' },
      seed_diagnostics: { status: 'ready' },
    } as any)
    expect(state.done).toBe(true)
    expect(state.seed?.title).toBe('x')
  })

  test('createInitialProjectSeedStreamState seeds four pending steps', () => {
    const state = createInitialProjectSeedStreamState()
    expect(state.steps).toHaveLength(4)
    expect(state.steps.every(step => step.status === 'pending')).toBe(true)
    expect(state.currentLabel).toBe(PROJECT_SEED_UI_STEPS[0])
    expect(state.done).toBe(false)
  })
})
