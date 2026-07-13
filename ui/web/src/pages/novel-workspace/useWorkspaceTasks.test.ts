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
})
