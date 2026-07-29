import { afterEach, describe, expect, mock, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'
import { message } from 'antd'
import {
  createRepairTaskHandlers,
  type RepairTaskHandlerDeps,
} from './shell/workspace-repair-task-handlers'

const originalMessageSuccess = message.success

afterEach(() => {
  message.success = originalMessageSuccess
})

function repairHandlerFixture() {
  const apiPost = mock(async () => ({
    status: 202,
    data: {
      ok: true,
      run_id: 88,
      status: 'queued',
      chapter_id: 11,
      status_url: '/api/novel/editor-revisions/88?project_id=3',
    },
  }))
  const loadProjectModules = mock(async () => {})
  const loadProductionTasks = mock(async () => {})
  const setChapters = mock(() => {})
  const setRightPanelOpen = mock(() => {})
  const setRightPanelTab = mock(() => {})
  const success = mock(() => {})
  message.success = success as typeof message.success
  const noop = () => {}
  const deps: RepairTaskHandlerDeps = {
    activeChapter: { id: 11, chapter_no: 1, title: '起雾' },
    apiClient: { post: apiPost },
    chapters: [],
    createEditorReportForChapter: noop,
    executeStyleSampleTaskBookRebuild: noop,
    flushPendingSave: async () => true,
    generateCurrentChapterProse: noop,
    generateLongformRepairAuditSummary: noop,
    generateSceneCardsForChapter: noop,
    latestCockpitQualityReport: noop,
    loadProjectModules,
    loadProductionTasks,
    openEditor: noop,
    outlines: [],
    projectId: 3,
    reviews: [],
    runRecords: [],
    runRollingPlan: noop,
    runSimilarityForChapter: noop,
    selectChapterForWriting: async () => true,
    selectedModelId: 7,
    setActiveChapterId: noop,
    setChapters,
    setCommercialToolLoading: noop,
    setFuture100FocusOutlineIds: noop,
    setOutlineTreeOpen: noop,
    setProseQualityLoading: noop,
    setReviewAnnotationsOpen: noop,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject: noop,
    setTaskCenterOpen: noop,
    sortedChapters: [],
  }
  return {
    handlers: createRepairTaskHandlers(deps),
    apiPost,
    loadProjectModules,
    loadProductionTasks,
    setChapters,
    setRightPanelOpen,
    setRightPanelTab,
    success,
  }
}

function terminalRevision(overrides: Record<string, unknown> = {}) {
  return {
    id: 88,
    run_type: 'editor_revision',
    status: 'completed',
    phase: 'completed',
    phase_label: '完成',
    progress: null,
    chapter_id: 11,
    chapter_no: 1,
    chapter_title: '起雾',
    prose_persisted: true,
    quality: { review_id: 91, score: 86, passed: true, needs_revision: false },
    story_state: { status: 'completed', receipt: { chapter_id: 11 } },
    phases: {
      record_continuity_warning: {
        summary: {
          delivery_risk_convergence: {
            status: 'cleared',
            label: '风险已收敛',
            residual_count: 0,
          },
        },
      },
    },
    warnings: [],
    error: null,
    can_cancel: false,
    can_retry: false,
    can_continue: false,
    repair_task_link: { run_id: 51, task_index: 0 },
    linked_task_closure: { status: 'pending' },
    updated_at: '2026-07-29T08:00:00.000Z',
    ...overrides,
  }
}

async function loadReconciliationApi() {
  const module = await import('./shell/use-novel-workspace-base-model')
  const createState = Reflect.get(module, 'createEditorRevisionReconciliationState')
  const reconcile = Reflect.get(module, 'reconcileEditorRevisionTasks')
  expect(typeof createState).toBe('function')
  expect(typeof reconcile).toBe('function')
  return { createState, reconcile }
}

function reconciliationDeps(overrides: Record<string, unknown> = {}) {
  return {
    activeChapterId: 11,
    loadProjectModules: mock(async () => {}),
    setRightPanelOpen: mock(() => {}),
    setRightPanelTab: mock(() => {}),
    closeRepairTaskAfterRevision: mock(async () => ({ taskStatus: 'resolved' })),
    acknowledgeLinkedTaskClosure: mock(async (task: any) => ({
      ...task,
      linked_task_closure: { status: 'completed', completed_at: '2026-07-29T08:01:00.000Z' },
      updated_at: '2026-07-29T08:01:00.000Z',
    })),
    notifyTerminal: mock(() => {}),
    ...overrides,
  }
}

const linkedProductionTasks = {
  tasks: [{
    id: 51,
    run_type: 'longform_production_repair',
    payload: { tasks: [{ title: '修复章末钩子', task_status: 'open' }] },
  }],
}

// Split into workspaceUiShell.a/b.test.ts; shared source helpers in workspaceUiShellSource.ts

describe('commercial writing workspace UI shell monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.b.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShellSource.ts'))).toBe(true)
  })

  test('treats editor revision POST 202 as queued creation without premature closure or reload', async () => {
    const fixture = repairHandlerFixture()
    const sourceTask = { title: '修复章末钩子', issue_type: 'chapter_hook' }
    const sourceRun = { id: 51 }

    const created = await fixture.handlers.applyEditorRevision(
      { id: 19, review_type: 'prose_quality' },
      {
        skipConfirm: true,
        targetChapterId: 11,
        sourceTask,
        sourceRun,
        sourceTaskIndex: 0,
      },
    )

    expect(created).toMatchObject({ status: 'queued', run_id: 88 })
    expect(fixture.apiPost).toHaveBeenCalledTimes(1)
    expect(fixture.apiPost).toHaveBeenCalledWith('/novel/reviews/19/apply-revision', expect.objectContaining({
      repair_task_link: { run_id: 51, task_index: 0, task: sourceTask },
    }))
    expect(fixture.loadProjectModules).not.toHaveBeenCalled()
    expect(fixture.setChapters).not.toHaveBeenCalled()
    expect(fixture.setRightPanelOpen).not.toHaveBeenCalled()
    expect(fixture.setRightPanelTab).not.toHaveBeenCalled()
    expect(fixture.loadProductionTasks).toHaveBeenCalledTimes(1)
    expect(fixture.success).toHaveBeenCalledWith('单章修订任务已创建')
  })

  test('reconciles a persisted terminal revision once and acknowledges its linked repair task', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    const deps = reconciliationDeps()
    const task = terminalRevision()

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.setRightPanelOpen).toHaveBeenCalledWith(true)
    expect(deps.setRightPanelTab).toHaveBeenCalledWith('proseQuality')
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledWith(
      linkedProductionTasks.tasks[0].payload.tasks[0],
      linkedProductionTasks.tasks[0],
      0,
      expect.objectContaining({
        quality_refresh: expect.objectContaining({ ok: true, score: 86 }),
        story_state_update: task.story_state,
        delivery_risk_convergence: expect.objectContaining({ status: 'cleared', residual_count: 0 }),
        warnings: [],
      }),
    )
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  })

  test('does not reload or close a linked task when a revision fails before prose commit', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    const deps = reconciliationDeps()
    const task = terminalRevision({
      status: 'failed',
      phase: 'generate_candidate',
      phase_label: '生成候选',
      prose_persisted: false,
      quality: null,
      story_state: null,
      warnings: [],
      error: { code: 'PROVIDER_FAILED', message: 'editor revision provider failed' },
    })

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).not.toHaveBeenCalled()
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
  })

  test.each(['failed', 'canceled'] as const)('reconciles a %s revision after prose commit with a terminal warning', async status => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    const deps = reconciliationDeps()
    const task = terminalRevision({
      status,
      phase: 'post_quality',
      phase_label: '当前章质检',
      warnings: [{ code: 'POST_QUALITY_NEEDS_REVISION', message: '修订后质检仍建议人工复查' }],
      error: status === 'failed' ? { code: 'QUALITY_FAILED', message: 'post quality failed' } : null,
    })

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledWith({
      type: 'warning',
      text: '正文已保存，后处理未完成',
    }, task)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  })

  test('discovers and reconciles an unacknowledged terminal revision after restart', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const restartedState = createState()
    const deps = reconciliationDeps()

    await reconcile({
      projectId: 3,
      tasks: [terminalRevision()],
      productionTasks: linkedProductionTasks,
      state: restartedState,
      ...deps,
    })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  })

  test('retries a pending linked closure after task discovery and acknowledgement failures', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    const acknowledge = mock()
      .mockRejectedValueOnce(new Error('ack unavailable'))
      .mockResolvedValueOnce(terminalRevision({
        linked_task_closure: { status: 'completed', completed_at: '2026-07-29T08:02:00.000Z' },
        updated_at: '2026-07-29T08:02:00.000Z',
      }))
    const deps = reconciliationDeps({ acknowledgeLinkedTaskClosure: acknowledge })
    const task = terminalRevision()

    await reconcile({ projectId: 3, tasks: [task], productionTasks: { tasks: [] }, state, ...deps })
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(acknowledge).not.toHaveBeenCalled()

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledTimes(2)
  })

  test('leaves acknowledgement pending when repair-task closure fails and retries safely', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    const close = mock()
      .mockRejectedValueOnce(new Error('repair closure unavailable'))
      .mockResolvedValueOnce({ taskStatus: 'resolved' })
    const deps = reconciliationDeps({ closeRepairTaskAfterRevision: close })
    const task = terminalRevision()

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    expect(close).toHaveBeenCalledTimes(1)
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(2)
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  })

  test('deduplicates concurrent terminal reconciliation while dependencies are in flight', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState()
    let releaseReload!: () => void
    const reloadGate = new Promise<void>(resolve => { releaseReload = resolve })
    const deps = reconciliationDeps({ loadProjectModules: mock(() => reloadGate) })
    const task = terminalRevision({ repair_task_link: null, linked_task_closure: null })

    const first = reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    const second = reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    releaseReload()
    await Promise.all([first, second])

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
  })
})
