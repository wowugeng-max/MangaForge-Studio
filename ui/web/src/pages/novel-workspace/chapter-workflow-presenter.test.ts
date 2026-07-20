import { describe, expect, test } from 'bun:test'
import {
  buildChapterWorkflowPresenter,
  resolveChapterWorkflowPhase,
} from './chapter-workflow-presenter'

describe('chapter workflow presenter', () => {
  test('empty chapter prioritizes generate', () => {
    const model = buildChapterWorkflowPresenter({ hasChapter: true, hasProse: false, materialReady: true })
    expect(model.phase).toBe('empty')
    expect(model.primaryAction.key).toBe('generate')
    expect(model.primaryAction.label).toBe('生成正文')
  })

  test('material blockers outrank empty draft', () => {
    const model = buildChapterWorkflowPresenter({ hasChapter: true, hasProse: false, materialReady: false })
    expect(model.phase).toBe('blocked_materials')
    expect(model.primaryAction.key).toBe('repair_materials')
  })

  test('written prose defaults to quality check', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'needs_quality_check',
    })
    expect(model.phase).toBe('written_unchecked')
    expect(model.primaryAction.key).toBe('refresh_current_quality')
    expect(model.panelToOpen).toBe('quality')
  })

  test('revision phase prefers apply when available', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'needs_revision',
      revisionAvailable: true,
    })
    expect(model.phase).toBe('needs_revision')
    expect(model.primaryAction.key).toBe('apply_editor_revision')
  })

  test('state sync is required before next chapter', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'needs_state_sync',
      storyStateSynced: false,
      canSyncStoryState: true,
    })
    expect(model.phase).toBe('needs_state_sync')
    expect(model.primaryAction.key).toBe('sync_story_state')
    expect(model.reasonText).toContain('故事状态')
  })

  test('ready next after sync', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'ready_to_accept',
      storyStateSynced: true,
    })
    expect(model.phase).toBe('ready_next')
    expect(model.primaryAction.key).toBe('accept_chapter_and_continue')
  })

  test('admission failure hard-stops store pollution narrative', () => {
    expect(resolveChapterWorkflowPhase({ admissionStatus: 'blocked_invalid', hasProse: false })).toBe('failed_admission')
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: false,
      admissionStatus: 'blocked_invalid',
      admissionMessage: '正文开篇未接住上一章强交接义务',
    })
    expect(model.primaryAction.key).toBe('repair_generate')
    expect(model.reasonText).toContain('强交接')
  })
})
