import { describe, expect, test } from 'bun:test'
import {
  buildChapterWorkflowPresenter,
  buildWorkflowSteps,
  firstEmptyChapterNoAfter,
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
    expect(model.primaryAction.key).toBe('sync_story_state')
    expect(model.primaryAction.label).toBe('同步故事状态')
    expect(model.secondaryActions.map(item => item.key)).not.toContain('refresh_current_quality')
    expect(model.secondaryActions.some(a => a.key === 'generate' && a.label === '回炉')).toBe(true)
    expect(model.panelToOpen).toBe('quality')
  })

  test('when story state already synced, quality recheck is improvement-oriented', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'needs_quality_check',
      storyStateSynced: true,
    })
    expect(model.phase).toBe('written_unchecked')
    expect(model.phaseLabel).toBe('可复检提升')
    expect(model.primaryAction.key).toBe('accept_chapter_and_continue')
    expect(model.primaryAction.label).toBe('写下一章')
    expect(model.secondaryActions.map(item => item.key)).not.toContain('refresh_current_quality')
    // 正文 + 状态同步 completed; 复检 current
    expect(model.stepsDone).toEqual([true, false, false, true, false])
    expect(model.stepIndex).toBe(1)
  })

  test('fact-based steps mark completed gates independently', () => {
    const steps = buildWorkflowSteps({
      hasProse: true,
      acceptanceStatus: 'needs_quality_check',
      storyStateSynced: true,
    })
    expect(steps.stepsDone[0]).toBe(true)
    expect(steps.stepsDone[1]).toBe(false)
    expect(steps.stepsDone[3]).toBe(true)
  })

  test('revision phase prefers apply when available', () => {
    const model = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: true,
      acceptanceStatus: 'needs_revision',
      revisionAvailable: true,
      storyStateSynced: true,
    })
    expect(model.phase).toBe('needs_revision')
    expect(model.primaryAction.key).toBe('accept_chapter_and_continue')
    expect(model.secondaryActions.map(item => item.key)).not.toContain('apply_editor_revision')
    expect(model.secondaryActions.map(item => item.key)).not.toContain('create_editor_report')
    expect(model.secondaryActions.map(item => item.key)).not.toContain('refresh_current_quality')
    expect(model.stepsDone[0]).toBe(true)
    expect(model.stepsDone[1]).toBe(true)
    expect(model.stepsDone[2]).toBe(false)
    expect(model.stepsDone[3]).toBe(true)
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
    expect(model.stepsDone[3]).toBe(false)
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
    expect(model.stepsDone).toEqual([true, true, true, true, true])
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

  test('has-prose phases offer 续写 in secondaryActions', () => {
    const phases = [
      buildChapterWorkflowPresenter({
        hasChapter: true,
        hasProse: true,
        acceptanceStatus: 'needs_quality_check',
      }),
      buildChapterWorkflowPresenter({
        hasChapter: true,
        hasProse: true,
        acceptanceStatus: 'needs_revision',
      }),
      buildChapterWorkflowPresenter({
        hasChapter: true,
        hasProse: true,
        acceptanceStatus: 'needs_state_sync',
        storyStateSynced: false,
      }),
      buildChapterWorkflowPresenter({
        hasChapter: true,
        hasProse: true,
        acceptanceStatus: 'ready_to_accept',
        storyStateSynced: true,
      }),
    ]
    for (const model of phases) {
      expect(model.secondaryActions.some(a => a.key === 'write_continue' && a.label === '续写')).toBe(true)
    }
  })

  test('empty chapter does not offer 续写', () => {
    const model = buildChapterWorkflowPresenter({ hasChapter: true, hasProse: false, materialReady: true })
    expect(model.secondaryActions.map(item => item.key)).not.toContain('write_continue')
  })

  test('blocked materials and failed admission do not offer 续写', () => {
    const blocked = buildChapterWorkflowPresenter({ hasChapter: true, hasProse: false, materialReady: false })
    const failed = buildChapterWorkflowPresenter({
      hasChapter: true,
      hasProse: false,
      admissionStatus: 'blocked_invalid',
    })
    expect(blocked.secondaryActions.map(item => item.key)).not.toContain('write_continue')
    expect(failed.secondaryActions.map(item => item.key)).not.toContain('write_continue')
  })

  test('firstEmptyChapterNoAfter returns the next empty chapter after current', () => {
    expect(firstEmptyChapterNoAfter([
      { chapter_no: 1, chapter_text: '已写', word_count: 80 },
      { chapter_no: 2, chapter_text: '', word_count: 0 },
    ], 1)).toBe(2)
  })

  test('firstEmptyChapterNoAfter returns null when no later chapter is empty', () => {
    expect(firstEmptyChapterNoAfter([
      { chapter_no: 1, chapter_text: '已写', word_count: 80 },
      { chapter_no: 2, chapter_text: '也写了', word_count: 40 },
    ], 1)).toBeNull()
  })
})
