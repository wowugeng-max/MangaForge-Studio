import { describe, expect, test } from 'bun:test'

async function loadTaskModule() {
  return import('./editorRevisionTasks').catch(() => null)
}

function revisionTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 41,
    run_type: 'editor_revision',
    status: 'running',
    phase: 'generate_candidate',
    phase_label: '生成候选',
    progress: null,
    chapter_id: 7,
    chapter_no: 3,
    chapter_title: '雾港来信',
    prose_persisted: false,
    warnings: [],
    error: null,
    can_cancel: true,
    can_retry: false,
    can_continue: false,
    repair_task_link: null,
    updated_at: '2026-07-29T08:00:00.000Z',
    ...overrides,
  }
}

describe('editor revision task contract', () => {
  test('accepts the bounded public task and rejects malformed or secret-bearing generic values', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.isEditorRevisionTask(revisionTask())).toBe(true)
    expect(module.isEditorRevisionTask({ run_type: 'editor_revision', status: 'running' })).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({ progress: 50 }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({ status: 'paused' }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({ warnings: [{ code: 'WARN', message: 7 }] }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({
      payload: { source_text: '不应进入前端任务模型的正文' },
    }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({ input_ref: '{"api_key":"secret"}' }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({
      quality: { review_id: 88, score: 92, passed: true, needs_revision: false, reused: false },
    }))).toBe(true)
    expect(module.isEditorRevisionTask(revisionTask({ quality: { passed: 'yes' } }))).toBe(false)
    expect(module.isEditorRevisionTask(revisionTask({ quality: { passed: true, payload: { prose: 'secret' } } }))).toBe(false)
  })

  test('treats queued, running, and cancel_requested as active only', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    for (const status of ['queued', 'running', 'cancel_requested']) {
      expect(module.isActiveEditorRevisionTask(revisionTask({ status }))).toBe(true)
    }
    for (const status of ['completed', 'failed', 'canceled']) {
      expect(module.isActiveEditorRevisionTask(revisionTask({ status }))).toBe(false)
    }
  })

  test('selects the newest active run for a chapter and never matches another chapter', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const tasks = [
      revisionTask({ id: 50, status: 'running', updated_at: '2026-07-29T08:00:00.000Z' }),
      revisionTask({ id: 51, status: 'queued', updated_at: '2026-07-29T08:05:00.000Z' }),
      revisionTask({ id: 52, status: 'completed', updated_at: '2026-07-29T08:10:00.000Z', prose_persisted: true }),
      revisionTask({ id: 53, chapter_id: 8, status: 'running', updated_at: '2026-07-29T08:20:00.000Z' }),
    ]

    expect(module.editorRevisionForChapter(tasks, 7)?.id).toBe(51)
    expect(module.editorRevisionForChapter(tasks, 9)).toBeNull()
  })

  test('keeps terminal history selectable without treating it as a revision lock', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const terminal = revisionTask({ status: 'completed', prose_persisted: true })
    expect(module.editorRevisionForChapter([terminal], 7)?.id).toBe(41)
    expect(module.isActiveEditorRevisionTask(terminal)).toBe(false)

    const next = revisionTask({ id: 42, status: 'queued', updated_at: '2026-07-29T08:01:00.000Z' })
    expect(module.editorRevisionForChapter([terminal, next], 7)?.id).toBe(42)
  })
})

describe('editor revision terminal messages', () => {
  test('reports admission failure before prose is persisted', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const message = module.editorRevisionTerminalMessage(revisionTask({
      status: 'failed',
      error: { code: 'REVISION_CANDIDATE_TOO_SHORT', message: 'candidate rejected' },
    }))
    expect(message).toEqual({ type: 'error', text: '修订未入库，当前正文保持不变' })
  })

  test('reports completed quality success verbatim', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const message = module.editorRevisionTerminalMessage(revisionTask({
      status: 'completed',
      phase: 'completed',
      prose_persisted: true,
      quality: { review_id: 88, score: 92, passed: true, needs_revision: false, reused: false },
    }))
    expect(message).toEqual({ type: 'success', text: '当前章修订和复检完成' })
  })

  test('does not claim recheck success when completed quality evidence is missing or skipped', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const expected = { type: 'warning', text: '新版本已保存，当前章仍需人工复查' }
    expect(module.editorRevisionTerminalMessage(revisionTask({
      status: 'completed',
      phase: 'completed',
      prose_persisted: true,
      quality: null,
    }))).toEqual(expected)
    expect(module.editorRevisionTerminalMessage(revisionTask({
      status: 'completed',
      phase: 'completed',
      prose_persisted: true,
    }))).toEqual(expected)
  })

  test('reports a saved revision that still needs review verbatim', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const message = module.editorRevisionTerminalMessage(revisionTask({
      status: 'completed',
      phase: 'completed',
      prose_persisted: true,
      quality: { review_id: 88, score: 72, passed: false, needs_revision: true, reused: false },
      warnings: [{ code: 'POST_QUALITY_NEEDS_REVISION', message: '修订后质检仍建议人工复查' }],
    }))
    expect(message).toEqual({ type: 'warning', text: '新版本已保存，当前章仍需人工复查' })
  })

  test('reports incomplete post-processing after prose was saved verbatim', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    const message = module.editorRevisionTerminalMessage(revisionTask({
      status: 'failed',
      phase: 'sync_current_story_state',
      prose_persisted: true,
      error: { code: 'STORY_STATE_FAILED', message: 'story state failed' },
      can_continue: true,
    }))
    expect(message).toEqual({ type: 'warning', text: '正文已保存，后处理未完成' })
  })

  test('does not emit terminal messaging for cancel_requested', async () => {
    const module = await loadTaskModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.editorRevisionTerminalMessage(revisionTask({ status: 'cancel_requested' }))).toBeNull()
  })
})
