import { readdir } from 'fs/promises'
import { join } from 'path'
import { ensureWorkspaceStructure } from './workspace'
import { seedProjectsIfEmpty } from './projects'
import { seedAssetsIfEmpty } from './assets'
import { readRuns, writeRuns, type RunRecord } from './runs-store'
import { readLogs, writeLogs, type LogRecord } from './logs-store'

export async function getStatusSnapshot(activeWorkspace: string) {
  await ensureWorkspaceStructure(activeWorkspace)
  const projects = await seedProjectsIfEmpty(activeWorkspace)
  const assets = await seedAssetsIfEmpty(activeWorkspace)
  const files = await readdir(join(activeWorkspace, '.story-project', 'episodes')).catch(() => [])
  const runs = await readRuns(activeWorkspace)
  const logs = await readLogs(activeWorkspace)
  return {
    ok: true,
    api_version: '2026-05-12.reference-workflow-v1',
    features: {
      novel_reference_preview: true,
      novel_reference_profile_supplement: true,
      novel_reference_reports: true,
      novel_reference_dimensions: true,
      novel_generation_pipeline: true,
      novel_generation_diagnostics: true,
      novel_writing_bible: true,
      novel_story_state_machine: true,
    },
    workspace: activeWorkspace,
    projects,
    assets,
    files,
    runs,
    logs,
  }
}

export async function appendRun(activeWorkspace: string, record: RunRecord) {
  const runs = await readRuns(activeWorkspace)
  const next = [...runs, record]
  await writeRuns(activeWorkspace, next)
}

export async function appendLog(activeWorkspace: string, record: LogRecord) {
  const logs = await readLogs(activeWorkspace)
  const next = [...logs, record]
  await writeLogs(activeWorkspace, next)
}
