import { afterEach, describe, expect, mock, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'
import { message } from 'antd'
import {
  createRepairTaskHandlers,
  type RepairTaskHandlerDeps,
} from './shell/workspace-repair-task-handlers'
import { buildDeliveryRiskRevisionClosurePlan } from './repairTaskRevisionPrompt'

const originalMessageSuccess = message.success
const originalMessageWarning = message.warning
const originalMessageError = message.error

afterEach(() => {
  message.success = originalMessageSuccess
  message.warning = originalMessageWarning
  message.error = originalMessageError
})

function repairHandlerFixture(overrides: Partial<RepairTaskHandlerDeps> = {}) {
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
  const createEditorReportForChapter = mock(async () => null)
  const flushPendingSave = mock(async () => true)
  const selectChapterForWriting = mock(async () => true)
  const setChapters = mock(() => {})
  const setProseQualityLoading = mock(() => {})
  const setRightPanelOpen = mock(() => {})
  const setRightPanelTab = mock(() => {})
  const setTaskCenterOpen = mock(() => {})
  const success = mock(() => {})
  const warning = mock(() => {})
  const error = mock(() => {})
  message.success = success as typeof message.success
  message.warning = warning as typeof message.warning
  message.error = error as typeof message.error
  const noop = () => {}
  const deps: RepairTaskHandlerDeps = {
    activeChapter: { id: 11, chapter_no: 1, title: '起雾' },
    apiClient: { post: apiPost },
    chapters: [],
    createEditorReportForChapter,
    executeStyleSampleTaskBookRebuild: noop,
    flushPendingSave,
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
    selectChapterForWriting,
    selectedModelId: 7,
    setActiveChapterId: noop,
    setChapters,
    setCommercialToolLoading: noop,
    setFuture100FocusOutlineIds: noop,
    setOutlineTreeOpen: noop,
    setProseQualityLoading,
    setReviewAnnotationsOpen: noop,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject: noop,
    setTaskCenterOpen,
    sortedChapters: [],
    ...overrides,
  }
  return {
    handlers: createRepairTaskHandlers(deps),
    apiPost,
    createEditorReportForChapter,
    flushPendingSave,
    loadProjectModules,
    loadProductionTasks,
    selectChapterForWriting,
    setChapters,
    setProseQualityLoading,
    setRightPanelOpen,
    setRightPanelTab,
    setTaskCenterOpen,
    success,
    warning,
    error,
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
  const invalidateState = Reflect.get(module, 'invalidateEditorRevisionReconciliationState')
  const reconcile = Reflect.get(module, 'reconcileEditorRevisionTasks')
  expect(typeof createState).toBe('function')
  expect(typeof reconcile).toBe('function')
  return { createState, invalidateState, reconcile }
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

const linkedRevisionScopeProductionTasks = {
  tasks: [{
    id: 51,
    run_type: 'longform_production_repair',
    payload: {
      tasks: [{
        title: '修订幅度复检',
        task_status: 'open',
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      }],
    },
  }],
}

// Split into workspaceUiShell.a/b.test.ts; shared source helpers in workspaceUiShellSource.ts

describe('commercial writing workspace UI shell monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.b.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShellSource.ts'))).toBe(true)
  })

  test('bridges all editor revision task fields from useWorkspaceTasks through the base model', async () => {
    const source = await Bun.file(new URL('./shell/use-novel-workspace-base-model.tsx', import.meta.url)).text()
    const useWorkspaceTasksEnd = source.indexOf('} = useWorkspaceTasks({')
    const useWorkspaceTasksStart = source.lastIndexOf('const {', useWorkspaceTasksEnd)
    const taskBridge = source.slice(useWorkspaceTasksStart, useWorkspaceTasksEnd)
    const baseReturnStart = source.indexOf("return {\n    status: 'base' as const")
    const baseReturn = source.slice(baseReturnStart)
    const fields = [
      'editorRevisionTasks',
      'editorRevisionTasksProjectId',
      'cancelEditorRevision',
      'retryEditorRevision',
      'loadEditorRevisionDiagnostics',
    ]

    expect(useWorkspaceTasksStart).toBeGreaterThanOrEqual(0)
    expect(baseReturnStart).toBeGreaterThanOrEqual(0)
    for (const field of fields) {
      expect(taskBridge).toContain(`${field},`)
      expect(baseReturn).toContain(`    ${field},`)
    }
  })

  test('rejects stale-project editor revision snapshots at the ready-runtime bridge', async () => {
    const runtimeModule = await import('./shell/build-novel-workspace-ready-runtime')
    const selectCurrentTask = Reflect.get(runtimeModule, 'editorRevisionForReadyRuntime')
    const source = await Bun.file(new URL('./shell/build-novel-workspace-ready-runtime.tsx', import.meta.url)).text()
    expect(typeof selectCurrentTask).toBe('function')
    if (typeof selectCurrentTask !== 'function') return

    const task = terminalRevision({
      status: 'running',
      phase: 'generate_candidate',
      phase_label: '生成候选',
      can_cancel: true,
      linked_task_closure: null,
    })
    const input = {
      editorRevisionTasks: [task],
      editorRevisionTasksProjectId: 3,
      projectId: 3,
      activeChapterId: 11,
    }

    expect(source).toContain('editorRevisionTasksProjectId,')
    expect(source).toContain('editorRevisionForReadyRuntime({')
    expect(selectCurrentTask(input)?.id).toBe(88)
    expect(selectCurrentTask({ ...input, editorRevisionTasksProjectId: 2 })).toBeNull()
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

  test('does not immediately recheck a queued recovery-evidence revision', async () => {
    const fixture = repairHandlerFixture()
    fixture.createEditorReportForChapter.mockResolvedValue({ status: 'queued', run_id: 88 })

    await fixture.handlers.executeRecoveryEvidenceGovernanceQueueTask({
      action_key: 'revision',
      issue_type: 'recovery_evidence_mismatch',
      source: 'review_annotation_risk',
      annotation_key: 'recovery-evidence:11',
      chapter_id: 11,
      review_id: 19,
    }, { id: 51 }, 0, { keepTaskCenterOpen: true })

    expect(fixture.createEditorReportForChapter).toHaveBeenCalledTimes(1)
    expect(fixture.selectChapterForWriting).toHaveBeenCalledTimes(1)
    expect(fixture.apiPost).not.toHaveBeenCalled()
    expect(fixture.flushPendingSave).not.toHaveBeenCalled()
    expect(fixture.loadProjectModules).not.toHaveBeenCalled()
    expect(fixture.loadProductionTasks).not.toHaveBeenCalled()
    expect(fixture.setProseQualityLoading).not.toHaveBeenCalled()
    expect(fixture.setRightPanelOpen).not.toHaveBeenCalled()
    expect(fixture.setRightPanelTab).not.toHaveBeenCalled()
    expect(fixture.setTaskCenterOpen).not.toHaveBeenCalled()
  })

  test('passes reconciliation cancellation to every linked repair-task closure request', async () => {
    const fixture = repairHandlerFixture()
    const controller = new AbortController()

    await fixture.handlers.closeRepairTaskAfterRevision(
      {
        title: '修复章末钩子',
        source: 'review_annotation_risk',
        annotation_key: 'reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1',
      },
      { id: 51 },
      0,
      {
        editor_revision_run_id: 88,
        quality_refresh: { ok: true },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0 },
      },
      { projectModules: false, productionTasks: false, signal: controller.signal },
    )

    expect(fixture.apiPost.mock.calls).toHaveLength(2)
    expect(fixture.apiPost.mock.calls.map(call => call[0])).toEqual([
      '/novel/runs/51/tasks/0/status',
      '/novel/projects/3/review-annotations/status',
    ])
    for (const call of fixture.apiPost.mock.calls) {
      expect(call[2]).toEqual({ signal: controller.signal })
    }
    expect(fixture.apiPost.mock.calls[0][1]).toMatchObject({
      editor_revision_run_id: 88,
      annotation_key: 'reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1',
      annotation_status: 'resolved',
    })
    expect(fixture.apiPost.mock.calls[1][1]).toMatchObject({ editor_revision_run_id: 88 })
  })

  test('reconciles a persisted terminal revision once and acknowledges its linked repair task', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
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
      { signal: expect.any(AbortSignal) },
    )
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  })

  test('does not silently resolve specialized linked tasks from a redacted public revision summary', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const closurePlans: any[] = []
    const closeRepairTaskAfterRevision = mock(async (sourceTask: any, _run: any, _taskIndex: number, result: any) => {
      const plan = buildDeliveryRiskRevisionClosurePlan(sourceTask, result)
      closurePlans.push(plan)
      return plan
    })
    const deps = reconciliationDeps({ closeRepairTaskAfterRevision })
    const task = terminalRevision()

    await reconcile({
      projectId: 3,
      tasks: [task],
      productionTasks: linkedRevisionScopeProductionTasks,
      state,
      ...deps,
    })

    expect(closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    const publicClosureResult = closeRepairTaskAfterRevision.mock.calls[0][3]
    expect(publicClosureResult.quality_refresh).toEqual(expect.objectContaining({ ok: true, score: 86 }))
    expect(publicClosureResult.quality_refresh).not.toHaveProperty('revision_scope_guard_sync')
    expect(publicClosureResult.delivery_risk_convergence).toEqual(expect.objectContaining({ status: 'cleared', residual_count: 0 }))
    expect(closurePlans).toEqual([
      expect.objectContaining({
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
        note: expect.stringContaining('缺少 revision_scope_guard_sync'),
      }),
    ])
    expect(deps.acknowledgeLinkedTaskClosure).toHaveBeenCalledTimes(1)
  }, 10_000)

  test('does not replay terminal side effects after acknowledgement commits but its response is lost', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const acknowledge = mock(async () => {
      throw new Error('ack response lost after server commit')
    })
    const deps = reconciliationDeps({ acknowledgeLinkedTaskClosure: acknowledge })
    const pending = terminalRevision()
    const acknowledged = terminalRevision({
      linked_task_closure: { status: 'completed', completed_at: '2026-07-29T08:01:00.000Z' },
      updated_at: '2026-07-29T08:01:00.000Z',
    })

    await reconcile({ projectId: 3, tasks: [pending], productionTasks: linkedProductionTasks, state, ...deps })
    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.setRightPanelOpen).toHaveBeenCalledTimes(1)
    expect(deps.setRightPanelTab).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledTimes(1)

    await reconcile({ projectId: 3, tasks: [acknowledged], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [acknowledged], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.setRightPanelOpen).toHaveBeenCalledTimes(1)
    expect(deps.setRightPanelTab).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
    expect(deps.closeRepairTaskAfterRevision).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledTimes(1)
  })

  test('baselines an acknowledged terminal revision on a fresh mount without replaying side effects', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const deps = reconciliationDeps()
    const task = terminalRevision({
      linked_task_closure: { status: 'completed', completed_at: '2026-07-29T08:01:00.000Z' },
    })

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).not.toHaveBeenCalled()
    expect(deps.setRightPanelOpen).not.toHaveBeenCalled()
    expect(deps.setRightPanelTab).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).not.toHaveBeenCalled()
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
  })

  test('baselines a historical unlinked terminal revision on a fresh mount without replaying side effects', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const deps = reconciliationDeps()
    const task = terminalRevision({ repair_task_link: null, linked_task_closure: null })

    await reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).not.toHaveBeenCalled()
    expect(deps.setRightPanelOpen).not.toHaveBeenCalled()
    expect(deps.setRightPanelTab).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).not.toHaveBeenCalled()
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
  })

  test('reconciles an observed active revision after it becomes terminal', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const deps = reconciliationDeps()
    const active = terminalRevision({
      status: 'running',
      phase: 'post_quality',
      repair_task_link: null,
      linked_task_closure: null,
      updated_at: '2026-07-29T08:00:00.000Z',
    })
    const terminal = terminalRevision({
      repair_task_link: null,
      linked_task_closure: null,
      updated_at: '2026-07-29T08:02:00.000Z',
    })

    await reconcile({ projectId: 3, tasks: [active], productionTasks: linkedProductionTasks, state, ...deps })
    expect(deps.loadProjectModules).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).not.toHaveBeenCalled()

    await reconcile({ projectId: 3, tasks: [terminal], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [terminal], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
  })

  test('reconciles a terminal revision that appears after the initial baseline', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const deps = reconciliationDeps()
    const terminal = terminalRevision({ repair_task_link: null, linked_task_closure: null })

    await reconcile({ projectId: 3, tasks: [], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [terminal], productionTasks: linkedProductionTasks, state, ...deps })
    await reconcile({ projectId: 3, tasks: [terminal], productionTasks: linkedProductionTasks, state, ...deps })

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
  })

  test('does not reload or close a linked task when a revision fails before prose commit', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
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
    const state = createState(3)
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
    const restartedState = createState(3)
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
    const state = createState(3)
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
    const state = createState(3)
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
    const state = createState(3)
    let releaseReload!: () => void
    const reloadGate = new Promise<void>(resolve => { releaseReload = resolve })
    const deps = reconciliationDeps({ loadProjectModules: mock(() => reloadGate) })
    const task = terminalRevision({ repair_task_link: null, linked_task_closure: null })

    await reconcile({ projectId: 3, tasks: [], productionTasks: linkedProductionTasks, state, ...deps })
    const first = reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    const second = reconcile({ projectId: 3, tasks: [task], productionTasks: linkedProductionTasks, state, ...deps })
    releaseReload()
    await Promise.all([first, second])

    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)
    expect(deps.notifyTerminal).toHaveBeenCalledTimes(1)
  })

  test('stops all terminal side effects when the project changes during module reload', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    let current = true
    let releaseReload!: () => void
    const reloadGate = new Promise<void>(resolve => { releaseReload = resolve })
    const deps = reconciliationDeps({ loadProjectModules: mock(() => reloadGate) })
    const task = terminalRevision()

    const action = reconcile({
      projectId: 3,
      taskProjectId: 3,
      isCurrent: () => current,
      tasks: [task],
      productionTasks: linkedProductionTasks,
      state,
      ...deps,
    })
    await Promise.resolve()
    expect(deps.loadProjectModules).toHaveBeenCalledTimes(1)

    current = false
    releaseReload()
    await action

    expect(deps.setRightPanelOpen).not.toHaveBeenCalled()
    expect(deps.setRightPanelTab).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).not.toHaveBeenCalled()
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
    expect(state.completedKeys.size).toBe(0)
    expect(state.moduleReloadedKeys.size).toBe(0)
  })

  test('aborts a stale linked closure and never issues its downstream acknowledgement', async () => {
    const { createState, invalidateState, reconcile } = await loadReconciliationApi()
    const state = createState(3)
    const task = terminalRevision()
    const key = `3:${task.id}:${task.updated_at}`
    state.moduleReloadedKeys.add(key)
    state.notifiedKeys.add(key)
    let current = true
    let closeSignal: AbortSignal | undefined
    let releaseClose!: () => void
    const closeGate = new Promise<void>(resolve => { releaseClose = resolve })
    const close = mock((_task: any, _run: any, _taskIndex: number, _result: any, options?: { signal?: AbortSignal }) => {
      closeSignal = options?.signal
      return closeGate
    })
    const deps = reconciliationDeps({ closeRepairTaskAfterRevision: close })

    const action = reconcile({
      projectId: 3,
      taskProjectId: 3,
      isCurrent: () => current,
      tasks: [task],
      productionTasks: linkedProductionTasks,
      state,
      ...deps,
    })
    await Promise.resolve()
    expect(close).toHaveBeenCalledTimes(1)

    current = false
    if (typeof invalidateState === 'function') invalidateState(state)
    releaseClose()
    await action

    expect(closeSignal).toBeInstanceOf(AbortSignal)
    expect(closeSignal?.aborted).toBe(true)
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
    expect(state.linkedTaskClosedKeys.has(key)).toBe(false)
    expect(state.completedKeys.has(key)).toBe(false)
  })

  test('ignores a stale project task snapshot on the first render of the next project', async () => {
    const { createState, reconcile } = await loadReconciliationApi()
    const state = createState(4)
    const deps = reconciliationDeps()

    await reconcile({
      projectId: 4,
      taskProjectId: 3,
      isCurrent: () => true,
      tasks: [terminalRevision()],
      productionTasks: linkedProductionTasks,
      state,
      ...deps,
    })

    expect(deps.loadProjectModules).not.toHaveBeenCalled()
    expect(deps.setRightPanelOpen).not.toHaveBeenCalled()
    expect(deps.notifyTerminal).not.toHaveBeenCalled()
    expect(deps.closeRepairTaskAfterRevision).not.toHaveBeenCalled()
    expect(deps.acknowledgeLinkedTaskClosure).not.toHaveBeenCalled()
    expect(state.completedKeys.size).toBe(0)
  })
})

describe('oh-story core actions use the selected text model', () => {
  test('deslop posts the workspace model_id instead of falling back to the image favorite', async () => {
    const fixture = repairHandlerFixture()
    await fixture.handlers.ohStoryDeslop()
    expect(fixture.apiPost).toHaveBeenCalledWith('/novel/oh-story/core/deslop', {
      project_id: 3,
      chapter_id: 11,
      model_id: 7,
    })
  })

  test('apply posts when the latest review exists but hash is not hydrated yet', async () => {
    const fixture = repairHandlerFixture({
      activeChapter: { id: 11, chapter_no: 1, title: '起雾', chapter_text: '楚弦咽气的时候。' },
      reviews: [{
        id: 9,
        review_type: 'oh_story_review',
        created_at: '2026-08-14T13:00:00.000Z',
        chapter_id: 11,
        payload: { chapter_id: 11 },
      }],
    })
    await fixture.handlers.ohStoryApply()
    expect(fixture.apiPost).toHaveBeenCalledWith('/novel/oh-story/core/apply', {
      project_id: 3,
      chapter_id: 11,
      model_id: 7,
    })
  })

  test('apply 404 tells the user the writing API needs a restart', async () => {
    const fixture = repairHandlerFixture({
      activeChapter: { id: 11, chapter_no: 1, title: '起雾', chapter_text: '楚弦咽气的时候。' },
      reviews: [{
        id: 9,
        review_type: 'oh_story_review',
        created_at: '2026-08-14T13:00:00.000Z',
        chapter_id: 11,
        payload: { chapter_id: 11 },
      }],
    })
    fixture.apiPost.mockImplementation(async () => {
      const error: any = new Error('Request failed with status code 404')
      error.response = { status: 404, data: {} }
      throw error
    })
    await fixture.handlers.ohStoryApply()
    expect(fixture.error).toHaveBeenCalledWith('当前写作服务还没有按建议改稿接口，请重启 API 后再试')
  })

  test('apply rewrite-too-much toast tells the user not to full-rewrite', async () => {
    const fixture = repairHandlerFixture({
      activeChapter: { id: 11, chapter_no: 1, title: '起雾', chapter_text: '楚弦咽气的时候。' },
      reviews: [{
        id: 9,
        review_type: 'oh_story_review',
        created_at: '2026-08-14T13:00:00.000Z',
        chapter_id: 11,
        payload: { chapter_id: 11 },
      }],
    })
    fixture.apiPost.mockImplementation(async () => {
      const error: any = new Error('这次改动太大，像整章重写。请再试一次')
      error.response = {
        status: 409,
        data: { code: 'OH_STORY_APPLY_REWROTE_TOO_MUCH', error: '这次改动太大，像整章重写。请再试一次' },
      }
      throw error
    })
    await fixture.handlers.ohStoryApply()
    expect(fixture.warning).toHaveBeenCalledWith('这次改动太大，像整章重写。请再试一次')
  })
})
