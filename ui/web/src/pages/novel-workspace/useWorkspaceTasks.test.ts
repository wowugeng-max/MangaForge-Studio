import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

async function loadPollingModule() {
  return import('./useWorkspaceTasks').catch(() => null)
}

describe('workspace task polling policy', () => {
  test('does not schedule an interval while the drawer is closed or all tasks are idle', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: { tasks: [{ status: 'running' }] },
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
    })).toBeNull()
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: { tasks: [{ status: 'completed' }], summary: { running: 0 } },
      knowledgeIngestJobs: [{ status: 'completed' }],
      hasLocalActiveTask: false,
    })).toBeNull()
  })

  test('keeps the 3.5 second interval while a production, knowledge, or local task can advance', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return

    const base = {
      taskCenterOpen: true,
      productionTasks: { tasks: [] },
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
    }
    expect(module.workspaceTaskPollingIntervalMs({ ...base, productionTasks: { active: [{ status: 'running' }] } })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, productionTasks: { tasks: [{ status: 'queued' }] } })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, knowledgeIngestJobs: [{ status: 'running' }] })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({ ...base, hasLocalActiveTask: true })).toBe(3500)
  })

  test('backs off repeated refresh failures and resets to fast polling after recovery', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    let state = { data: { tasks: [{ status: 'running' }] }, confirmed: true, error: null, failures: 0 }
    state = module.workspaceTaskRefreshStarted(state)
    state = module.workspaceTaskRefreshFailed(state, new Error('first failure'))
    expect(state.failures).toBe(1)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(10000)

    state = module.workspaceTaskRefreshStarted(state)
    state = module.workspaceTaskRefreshFailed(state, new Error('second failure'))
    expect(state.failures).toBe(2)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(30000)

    state = module.workspaceTaskRefreshSucceeded(state, { tasks: [{ status: 'running' }] })
    expect(state.failures).toBe(0)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      productionRefreshConfirmed: state.confirmed,
      productionRefreshFailures: state.failures,
    })).toBe(3500)
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: state.data,
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      productionRefreshConfirmed: false,
      productionRefreshFailures: 99,
    })).toBeNull()
  })

  test('refreshes immediately when the drawer opens and after task-center actions', () => {
    const hookSource = readFileSync(join(import.meta.dir, 'useWorkspaceTasks.ts'), 'utf8')
    const workspaceSource = readFileSync(join(import.meta.dir, '../NovelProjectWorkspace.tsx'), 'utf8')
    const actionBody = (start: string, end: string) => workspaceSource.slice(
      workspaceSource.indexOf(start),
      workspaceSource.indexOf(end, workspaceSource.indexOf(start)),
    )

    expect(hookSource).toContain('if (!taskCenterOpen) return\n    void loadProductionTasks()\n    void loadKnowledgeIngestJobs()')
    expect(actionBody('const executeChapterGroupRun', 'const approveChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(actionBody('const approveChapterGroupStage', 'const retryChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(actionBody('const retryChapterGroupStage', 'const skipChapterGroupStage')).toContain('await loadProductionTasks()')
    expect(actionBody('const skipChapterGroupStage', 'const executeReleaseRepairRun')).toContain('await loadProductionTasks()')
    expect(actionBody('onPauseRun={async', 'onResumeRun={async')).toContain('await loadProductionTasks()')
    expect(actionBody('onResumeRun={async', '</TaskCenterDrawer>')).toContain('await loadProductionTasks()')
  })

  test('keeps polling across a failed refresh until a successful idle response confirms completion', async () => {
    const module = await loadPollingModule()
    expect(module).not.toBeNull()
    if (!module) return
    expect(typeof module.workspaceTaskRefreshStarted).toBe('function')
    expect(typeof module.workspaceTaskRefreshSucceeded).toBe('function')
    expect(typeof module.workspaceTaskRefreshFailed).toBe('function')
    if (
      typeof module.workspaceTaskRefreshStarted !== 'function'
      || typeof module.workspaceTaskRefreshSucceeded !== 'function'
      || typeof module.workspaceTaskRefreshFailed !== 'function'
    ) return

    const idleKnowledge = {
      data: [{ status: 'completed' }],
      confirmed: true,
      error: null,
      failures: 0,
    }
    let production = module.workspaceTaskRefreshSucceeded(
      { data: null, confirmed: false, error: null, failures: 0 },
      { tasks: [{ status: 'running' }] },
    )
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: production.data,
      knowledgeIngestJobs: idleKnowledge.data,
      hasLocalActiveTask: false,
      productionRefreshConfirmed: production.confirmed,
      knowledgeRefreshConfirmed: idleKnowledge.confirmed,
      productionRefreshFailures: production.failures,
    })).toBe(3500)

    production = module.workspaceTaskRefreshStarted(production)
    production = module.workspaceTaskRefreshFailed(production, new Error('temporary network failure'))
    expect(production.data).toEqual({ tasks: [{ status: 'running' }] })
    expect(production.confirmed).toBe(false)
    expect(production.error).toContain('temporary network failure')
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: production.data,
      knowledgeIngestJobs: idleKnowledge.data,
      hasLocalActiveTask: false,
      productionRefreshConfirmed: production.confirmed,
      knowledgeRefreshConfirmed: idleKnowledge.confirmed,
      productionRefreshFailures: production.failures,
    })).toBe(10000)

    production = module.workspaceTaskRefreshStarted(production)
    production = module.workspaceTaskRefreshSucceeded(production, { tasks: [{ status: 'completed' }] })
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: true,
      productionTasks: production.data,
      knowledgeIngestJobs: idleKnowledge.data,
      hasLocalActiveTask: false,
      productionRefreshConfirmed: production.confirmed,
      knowledgeRefreshConfirmed: idleKnowledge.confirmed,
      productionRefreshFailures: production.failures,
    })).toBeNull()
    expect(module.workspaceTaskPollingIntervalMs({
      taskCenterOpen: false,
      productionTasks: { tasks: [{ status: 'running' }] },
      knowledgeIngestJobs: [],
      hasLocalActiveTask: false,
      productionRefreshConfirmed: false,
      knowledgeRefreshConfirmed: false,
    })).toBeNull()
  })
})
