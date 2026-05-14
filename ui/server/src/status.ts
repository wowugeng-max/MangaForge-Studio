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
      novel_original_incubation: true,
      novel_chapter_group_generation: true,
      novel_production_dashboard: true,
      novel_editor_report: true,
      novel_model_strategy: true,
      novel_writing_assets: true,
      novel_chapter_group_autorun: true,
      novel_original_incubation_confirm: true,
      novel_editor_revision: true,
      novel_reference_fusion: true,
      novel_story_state_manual_edit: true,
      novel_book_review: true,
      novel_background_run_queue: true,
      novel_production_metrics: true,
      novel_approval_gates: true,
      novel_quality_benchmark: true,
      novel_version_review: true,
      novel_topic_validation: true,
      novel_similarity_report: true,
      novel_rolling_planner: true,
      novel_agent_prompt_config: true,
      novel_persistent_worker_queue: true,
      novel_chapter_production_desk: true,
      novel_reference_migration_plan: true,
      novel_quality_trends: true,
      novel_volume_control: true,
      novel_failure_recovery: true,
      novel_worker_db_lock: true,
      novel_reference_migration_injection: true,
      novel_production_budget: true,
      novel_version_paragraph_merge: true,
      novel_volume_plan_writeback: true,
      novel_mock_dry_run_checks: true,
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
