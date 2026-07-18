import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

export function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

export function serverSource(file: string) {
  return readFileSync(join(import.meta.dir, '../../../../server/src', file), 'utf8')
}

export function sourceCached(file: string, cache: Map<string, string>) {
  const hit = cache.get(file)
  if (hit != null) return hit
  const value = source(file)
  cache.set(file, value)
  return value
}

export const localSourceCache = new Map<string, string>()
export const packageSourceCache = new Map<string, string>()
let writingServiceSourceCache: string | null = null
let editorRoutesSourceCache: string | null = null
let commercialOpsRoutesSourceCache: string | null = null
let directorModelSourceCache: string | null = null
let writingCockpitModelSourceCache: string | null = null
let writingRecommendationModelSourceCache: string | null = null
let taskCenterSourceCache: string | null = null
let projectWorkspaceSourceCache: string | null = null
let autoCreationDirectorWorkspaceSourceCache: string | null = null
let storyPlanningWorkspaceSourceCache: string | null = null
let planningWorkspaceSourceCache: string | null = null
let writingCockpitPanelSourceCache: string | null = null

export function packageSource(relativeDir: string) {
  const cached = packageSourceCache.get(relativeDir)
  if (cached != null) return cached
  const root = join(import.meta.dir, '../../../../server/src', relativeDir)
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(full)
      }
    }
  }
  walk(root)
  files.sort()
  const value = files.map((file) => readFileSync(file, 'utf8')).join('\n')
  packageSourceCache.set(relativeDir, value)
  return value
}

export function writingServiceSource() {
  if (writingServiceSourceCache != null) return writingServiceSourceCache
  writingServiceSourceCache = [packageSource('novel-writing-service'), packageSource('novel-writing')].join('\n')
  return writingServiceSourceCache
}

export function editorRoutesSource() {
  if (editorRoutesSourceCache != null) return editorRoutesSourceCache
  editorRoutesSourceCache = [
    packageSource('routes/novel-editor'),
    serverSource('routes/novel-editor-routes.ts'),
  ].join('\n')
  return editorRoutesSourceCache
}

export function commercialOpsRoutesSource() {
  if (commercialOpsRoutesSourceCache != null) return commercialOpsRoutesSourceCache
  commercialOpsRoutesSourceCache = [
    packageSource('routes/novel-commercial-ops'),
    serverSource('routes/novel-commercial-ops-routes.ts'),
  ].join('\n')
  return commercialOpsRoutesSourceCache
}

export function directorModelSource() {
  if (directorModelSourceCache != null) return directorModelSourceCache
  directorModelSourceCache = [
    sourceCached('auto-creation/model/director-model.ts', localSourceCache),
    sourceCached('auto-creation/model/types.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-basics.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-main.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-risk-and-governance.ts', localSourceCache), sourceCached('auto-creation/model/helpers-risk-issue-catalog.ts', localSourceCache), sourceCached('auto-creation/model/helpers-risk-review-signals.ts', localSourceCache), sourceCached('auto-creation/model/helpers-risk-shared.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-risk-delivery-and-recovery.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-risk-recovery-governance.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-risk-strengthened-roadmap.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-pipeline.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-command.ts', localSourceCache), sourceCached('auto-creation/model/helpers-command-runway-queue.ts', localSourceCache), sourceCached('auto-creation/model/helpers-command-gates.ts', localSourceCache), sourceCached('auto-creation/model/helpers-command-actions.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-batch-guardrail.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-batch-risk-radar.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-delivery-risk-gate.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-batch-completion-dashboard.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-longform-capacity.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-manual-test-readiness.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-rolling-script-room.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-expansion-feedback.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-expansion-policy.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-next-batch-brief.ts', localSourceCache), sourceCached('auto-creation/model/helpers-next-batch-brief-basics.ts', localSourceCache), sourceCached('auto-creation/model/helpers-next-batch-brief-lane.ts', localSourceCache), sourceCached('auto-creation/model/helpers-next-batch-brief-core.ts', localSourceCache), sourceCached('auto-creation/model/helpers-next-batch-brief-style.ts', localSourceCache), sourceCached('auto-creation/model/helpers-next-batch-brief-recovery.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-recovery.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-expansion-structure.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-expansion-trends.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-safe-batch-expansion-repair-trends.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-recovery-evidence-trends.ts', localSourceCache),
    sourceCached('auto-creation/model/helpers-batch-handoff-and-launch.ts', localSourceCache),
  ].join('\n')
  return directorModelSourceCache
}




export function planningWorkspaceSource() {
  if (planningWorkspaceSourceCache != null) return planningWorkspaceSourceCache
  planningWorkspaceSourceCache = [
    sourceCached('planning/model/planning-workspace-model.ts', localSourceCache),
    sourceCached('planning/model/planning-workspace-builder.ts', localSourceCache),
    sourceCached('planning/model/planning-workspace-builder-desks.ts', localSourceCache),
    sourceCached('planning/model/planning-workspace-builder-boards.ts', localSourceCache),
    sourceCached('planning/model/planning-workspace-builder-signals.ts', localSourceCache),
    sourceCached('planning/model/planning-workspace-builder-radar.ts', localSourceCache),
  ].join('\n')
  return planningWorkspaceSourceCache
}


let workspaceCenterSourceCache: string | null = null
export function workspaceCenterSource() {
  if (workspaceCenterSourceCache != null) return workspaceCenterSourceCache
  workspaceCenterSourceCache = [
    sourceCached('WorkspaceCenter.tsx', localSourceCache),
    sourceCached('workspace-center-writing-support.tsx', localSourceCache),
    sourceCached('workspace-center-writing-queue-strip.tsx', localSourceCache),
    sourceCached('workspace-center-delivery-status-strip.tsx', localSourceCache),
    sourceCached('workspace-center-delivery-status-chips.tsx', localSourceCache),
    sourceCached('workspace-center-chapter-handoff-strip.tsx', localSourceCache),
    sourceCached('workspace-center-draft-brief-strip.tsx', localSourceCache),
    sourceCached('workspace-center-chrome.tsx', localSourceCache),
    sourceCached('workspace-center-prose-editor.tsx', localSourceCache),
  ].join('\n')
  return workspaceCenterSourceCache
}

export function projectWorkspaceSource() {
  if (projectWorkspaceSourceCache != null) return projectWorkspaceSourceCache
  projectWorkspaceSourceCache = [
    sourceCached('../NovelProjectWorkspace.tsx', localSourceCache),
    sourceCached('NovelProjectWorkspaceView.tsx', localSourceCache),
    sourceCached('useNovelProjectWorkspaceUiState.ts', localSourceCache),
    sourceCached('shell/workspace-helpers.tsx', localSourceCache),
    sourceCached('shell/workspace-view-props.ts', localSourceCache),
    sourceCached('shell/workspace-view-props-area.ts', localSourceCache),
    sourceCached('shell/workspace-view-props-body.ts', localSourceCache),
    sourceCached('shell/workspace-view-props-deferred.ts', localSourceCache),
    sourceCached('shell/workspace-view-props-topbar.ts', localSourceCache),
    sourceCached('shell/workspace-types.ts', localSourceCache),
    sourceCached('shell/workspace-lazy.tsx', localSourceCache),
    sourceCached('shell/workspace-editor-fields.ts', localSourceCache),
    sourceCached('shell/workspace-commercial-result.tsx', localSourceCache),
    sourceCached('shell/workspace-commercial-ops-views.tsx', localSourceCache),
    sourceCached('shell/workspace-commercial-tools.tsx', localSourceCache),
    sourceCached('shell/workspace-commercial-repair-queues.tsx', localSourceCache),
    sourceCached('shell/workspace-commercial-diagnostics.tsx', localSourceCache),
    sourceCached('shell/workspace-preflight-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-repair-task-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-action-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-chapter-prose-handlers.tsx', localSourceCache), sourceCached('shell/workspace-chapter-version-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-style-sample-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-writing-queue-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-derived-state.ts', localSourceCache),
    sourceCached('shell/workspace-editor-report-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-writing-bible-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-production-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-planning-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-run-queue-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-creative-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-diagnostics-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-chapter-prep-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-editor-handlers.tsx', localSourceCache),
    sourceCached('shell/workspace-incubator-views.tsx', localSourceCache),
    sourceCached('shell/workspace-serial-pipeline.tsx', localSourceCache),
    sourceCached('shell/workspace-area-view.tsx', localSourceCache),
    sourceCached('shell/workspace-topbar.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces-view.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces-core.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces-ops.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces-outline.tsx', localSourceCache),
    sourceCached('shell/workspace-deferred-surfaces-types.ts', localSourceCache),
    sourceCached('shell/workspace-body.tsx', localSourceCache),
    sourceCached('shell/workspace-preflight-views.tsx', localSourceCache),
    sourceCached('shell/workspace-action-routers.ts', localSourceCache),
  ].join('\n')
  return projectWorkspaceSourceCache
}

export function taskCenterSource() {
  if (taskCenterSourceCache != null) return taskCenterSourceCache
  taskCenterSourceCache = [
    sourceCached('TaskCenterDrawer.tsx', localSourceCache),
    sourceCached('task-center/chapter-group.ts', localSourceCache),
    sourceCached('task-center/drawer-model.tsx', localSourceCache),
    sourceCached('task-center/drawer-task-run-card.tsx', localSourceCache),
    sourceCached('task-center/drawer-default-lane.ts', localSourceCache),
    sourceCached('task-center/drawer-previews.tsx', localSourceCache),
    sourceCached('task-center/drawer-recovery-evidence.tsx', localSourceCache),
    sourceCached('task-center/drawer-safe-batch.ts', localSourceCache),
    sourceCached('task-center/drawer-snapshots.tsx', localSourceCache),
    sourceCached('task-center/drawer-snapshots-recovery-evidence.ts', localSourceCache),
    sourceCached('task-center/drawer-run-summaries.tsx', localSourceCache),
    sourceCached('task-center/drawer-run-summary-batch-prose.tsx', localSourceCache),
    sourceCached('task-center/drawer-run-summary-pipelines.tsx', localSourceCache),
    sourceCached('task-center/drawer-run-summary-repair-task.tsx', localSourceCache),
    sourceCached('task-center/drawer-run-summary-release-batch.tsx', localSourceCache),
    sourceCached('task-center/TaskCenterDrawerPanel.tsx', localSourceCache),
  ].join('\n')
  return taskCenterSourceCache
}




export function writingCockpitPanelSource() {
  if (writingCockpitPanelSourceCache != null) return writingCockpitPanelSourceCache
  writingCockpitPanelSourceCache = [
    sourceCached('WritingCockpitPanel.tsx', localSourceCache),
    sourceCached('writing-cockpit/panel-utils.tsx', localSourceCache),
    sourceCached('writing-cockpit/panel-workflow-strip.tsx', localSourceCache),
    sourceCached('writing-cockpit/panel-planning-desk.tsx', localSourceCache),
    sourceCached('writing-cockpit/panel-acceptance-desk.tsx', localSourceCache),
  ].join('\n')
  return writingCockpitPanelSourceCache
}

export function storyPlanningWorkspaceSource() {
  if (storyPlanningWorkspaceSourceCache != null) return storyPlanningWorkspaceSourceCache
  storyPlanningWorkspaceSourceCache = [
    sourceCached('StoryPlanningWorkspace.tsx', localSourceCache),
    sourceCached('planning/story-planning-board-panels.tsx', localSourceCache),
    sourceCached('planning/story-planning-board-types.ts', localSourceCache),
    sourceCached('planning/story-planning-board-panels-ops.tsx', localSourceCache),
    sourceCached('planning/story-planning-board-panels-audience.tsx', localSourceCache),
    sourceCached('planning/story-planning-board-panels-story.tsx', localSourceCache),
    sourceCached('planning/story-planning-chrome.tsx', localSourceCache),
  ].join('\n')
  return storyPlanningWorkspaceSourceCache
}

export function autoCreationDirectorWorkspaceSource() {
  if (autoCreationDirectorWorkspaceSourceCache != null) return autoCreationDirectorWorkspaceSourceCache
  autoCreationDirectorWorkspaceSourceCache = [
    sourceCached('AutoCreationDirectorWorkspace.tsx', localSourceCache),
    sourceCached('auto-creation/director-workspace-view.tsx', localSourceCache),
    sourceCached('auto-creation/director-workspace-derived.ts', localSourceCache),
    sourceCached('auto-creation/director-workspace-detail-drawer.tsx', localSourceCache),
    sourceCached('auto-creation/director-workspace-chrome.tsx', localSourceCache),
  ].join('\n')
  return autoCreationDirectorWorkspaceSourceCache
}

export function writingCockpitModelSource() {
  if (writingCockpitModelSourceCache != null) return writingCockpitModelSourceCache
  writingCockpitModelSourceCache = [
    sourceCached('writingCockpitModel.ts', localSourceCache),
    sourceCached('writing-cockpit/model/types.ts', localSourceCache),
    sourceCached('writing-cockpit/model/helpers.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-basics.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-basics-core.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-basics-receipts.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-basics-plans.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-basics-context.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-acceptance.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-acceptance-sync-a.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-acceptance-sync-b.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-acceptance-desk.ts', localSourceCache),
    sourceCached('writing-cockpit/model/cockpit-planning.ts', localSourceCache),
  ].join('\n')
  return writingCockpitModelSourceCache
}

export function writingRecommendationModelSource() {
  if (writingRecommendationModelSourceCache != null) return writingRecommendationModelSourceCache
  writingRecommendationModelSourceCache = [
    sourceCached('writingRecommendationModel.ts', localSourceCache),
    sourceCached('writing-recommendation-types.ts', localSourceCache),
    sourceCached('writing-recommendation-draft-brief.ts', localSourceCache),
    sourceCached('writing-recommendation-core.ts', localSourceCache),
  ].join('\n')
  return writingRecommendationModelSourceCache
}


