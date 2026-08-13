import { describe, expect, test } from 'bun:test'
import {
  buildEditorRevisionProgress,
  formatPhaseDuration,
} from './editor-revision-progress'

const NOW = Date.parse('2026-08-13T11:35:00.000Z')

function taskWith(overrides: Record<string, any> = {}) {
  return {
    id: 801,
    run_type: 'editor_revision',
    status: 'running',
    phase: 'sync_current_story_state',
    phase_label: '当前章状态更新',
    phases: {
      generate_candidate: {
        status: 'completed',
        attempt: 1,
        started_at: '2026-08-13T11:27:44.000Z',
        completed_at: '2026-08-13T11:30:32.000Z',
      },
      admit_candidate: {
        status: 'completed',
        attempt: 1,
        started_at: '2026-08-13T11:30:32.000Z',
        completed_at: '2026-08-13T11:30:32.000Z',
      },
      persist_chapter: {
        status: 'completed',
        attempt: 1,
        started_at: '2026-08-13T11:30:32.000Z',
        completed_at: '2026-08-13T11:30:33.000Z',
      },
      post_quality: {
        status: 'completed',
        attempt: 1,
        started_at: '2026-08-13T11:30:33.000Z',
        completed_at: '2026-08-13T11:31:11.000Z',
      },
      sync_current_story_state: {
        status: 'running',
        attempt: 1,
        started_at: '2026-08-13T11:31:11.000Z',
      },
      record_continuity_warning: { status: 'pending', attempt: 0 },
      completed: { status: 'pending', attempt: 0 },
    },
    ...overrides,
  } as any
}

describe('formatPhaseDuration', () => {
  test('秒/分钟格式', () => {
    expect(formatPhaseDuration(8)).toBe('8秒')
    expect(formatPhaseDuration(75)).toBe('1分15秒')
    expect(formatPhaseDuration(344)).toBe('5分44秒')
    expect(formatPhaseDuration(0)).toBe('0秒')
  })
})

describe('buildEditorRevisionProgress', () => {
  test('完整 phases:已完成阶段带耗时,当前阶段带已运行时长', () => {
    const progress = buildEditorRevisionProgress(taskWith(), NOW)
    expect(progress.steps).toHaveLength(7)
    const done = progress.steps[0]
    expect(done).toMatchObject({ key: 'generate_candidate', status: 'completed' })
    expect(done.durationLabel).toBe('2分48秒')
    const running = progress.steps[4]
    expect(running).toMatchObject({ key: 'sync_current_story_state', status: 'running' })
    expect(running.durationLabel).toBe('3分49秒')
    expect(progress.currentIndex).toBe(4)
  })

  test('当前阶段提示含预计时长', () => {
    const progress = buildEditorRevisionProgress(taskWith(), NOW)
    expect(progress.hint).toContain('当前章状态更新')
    expect(progress.hint).toContain('已运行 3分49秒')
    expect(progress.hint).toContain('通常')
  })

  test('运行超过 11 分钟标记疑似卡住', () => {
    const normal = buildEditorRevisionProgress(taskWith(), NOW)
    expect(normal.stalled).toBe(false)
    const lateNow = NOW + 8 * 60_000
    const late = buildEditorRevisionProgress(taskWith(), lateNow)
    expect(late.stalled).toBe(true)
    expect(late.hint).toContain('超出')
  })

  test('无 phases 数据时按 phase 名推断前后状态', () => {
    const progress = buildEditorRevisionProgress(taskWith({ phases: undefined }), NOW)
    expect(progress.steps[0].status).toBe('completed')
    expect(progress.steps[4].status).toBe('running')
    expect(progress.steps[5].status).toBe('pending')
    expect(progress.steps[4].durationLabel).toBe('')
    expect(progress.stalled).toBe(false)
  })

  test('queued 任务全部 pending', () => {
    const progress = buildEditorRevisionProgress(taskWith({ status: 'queued', phases: undefined, phase: 'generate_candidate' }), NOW)
    expect(progress.steps.every(step => step.status === 'pending')).toBe(true)
    expect(progress.currentIndex).toBe(-1)
  })

  test('失败与跳过状态透传', () => {
    const task = taskWith({
      status: 'failed',
      phase: 'post_quality',
    })
    task.phases.post_quality = {
      status: 'failed',
      attempt: 1,
      started_at: '2026-08-13T11:30:33.000Z',
      completed_at: '2026-08-13T11:31:00.000Z',
    }
    task.phases.sync_current_story_state = { status: 'pending', attempt: 0 }
    const progress = buildEditorRevisionProgress(task, NOW)
    expect(progress.steps[3].status).toBe('failed')
    const skipped = taskWith()
    skipped.phases.sync_current_story_state = { status: 'skipped', attempt: 1 }
    const skippedProgress = buildEditorRevisionProgress(skipped, NOW)
    expect(skippedProgress.steps[4].status).toBe('skipped')
  })
})
