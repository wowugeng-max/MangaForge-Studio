import { appendLog, appendRun } from './status'
import { runPlot } from './pipeline-plot'
import { runStoryboard } from './pipeline-storyboard'
import { runPromptPack } from './pipeline-promptpack'
import { runExport } from './pipeline-export'
import type { RunRecord } from './runs-store'

export async function runPipelineAll(activeWorkspace: string, payload: any) {
  const startedAt = Date.now()
  const runId = Date.now()
  const runRecord: RunRecord = { id: runId, name: 'run-all', status: 'running', startedAt: new Date().toISOString(), payload }
  await appendRun(activeWorkspace, runRecord)

  try {
    const preflight = { ok: true, workspace: activeWorkspace, missing: [] }
    const autoRepair: string[] = []
    const steps = [
      { step: 'plot', status: 'ok' as const, durationMs: 0, result: await runPlot(activeWorkspace, payload) },
      { step: 'storyboard', status: 'ok' as const, durationMs: 0, result: await runStoryboard(activeWorkspace, payload) },
      { step: 'promptpack', status: 'ok' as const, durationMs: 0, result: await runPromptPack(activeWorkspace, payload) },
      { step: 'export', status: 'ok' as const, durationMs: 0, result: await runExport(activeWorkspace, { ...payload, format: payload.format ?? 'all' }) },
    ]

    await appendLog(activeWorkspace, { id: Date.now(), level: 'info', message: 'run-all completed', createdAt: new Date().toISOString(), meta: { payload } })
    return {
      ok: true,
      message: 'run-all completed',
      workspace: activeWorkspace,
      payload,
      preflight,
      autoRepair,
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      steps,
    }
  } catch (error) {
    await appendLog(activeWorkspace, { id: Date.now(), level: 'error', message: 'run-all failed', createdAt: new Date().toISOString(), meta: { error: String(error), payload } })
    throw error
  }
}
