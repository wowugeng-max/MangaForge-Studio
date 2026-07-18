import type { PlanningActionKey } from '../planningWorkspaceModel'
import type { WritingCockpitActionKey } from '../writingCockpitModel'
import type { AutoCreationDirectorAction } from '../autoCreationDirectorModel'
import type { WorkspaceArea } from '../workspaceShellModel'

export type PlanningActionHandlers = Record<PlanningActionKey, () => void | Promise<void>>

export function runPlanningAction(
  actions: PlanningActionHandlers,
  key: PlanningActionKey,
) {
  return actions[key]?.()
}

export type WritingCockpitActionContext = {
  targetChapterId?: number
  targetChapterUpdatedAt?: any
  activeChapter: any
  sortedChapters: any[]
}

export function resolveWritingCockpitTarget(args: {
  nextChapterId?: number | null
  activeChapter: any
  sortedChapters: any[]
}): WritingCockpitActionContext {
  const rawTargetChapterId = args.nextChapterId
  const targetChapterId = rawTargetChapterId != null ? Number(rawTargetChapterId) : undefined
  const targetChapter = targetChapterId
    ? args.sortedChapters.find(chapter => Number(chapter.id) === targetChapterId)
      || (Number(args.activeChapter?.id) === targetChapterId ? args.activeChapter : null)
    : args.activeChapter
  return {
    targetChapterId,
    targetChapterUpdatedAt: targetChapter?.updated_at || null,
    activeChapter: args.activeChapter,
    sortedChapters: args.sortedChapters,
  }
}

export function serialPipelineActionWorkspaceArea(key: string, primaryWorkspaceArea?: string | null): WorkspaceArea | null {
  switch (key) {
    case 'enter_story_planning':
      return 'storyPlanning'
    case 'confirm_plan_and_write_draft':
    case 'refresh_current_quality':
    case 'create_editor_report':
    case 'apply_editor_revision':
    case 'sync_story_state':
      return 'chapterWriting'
    case 'start_safe_batch':
      return 'autoCreation'
    case 'open_longform_governance':
      return 'productionOps'
    default:
      return (primaryWorkspaceArea as WorkspaceArea) || null
  }
}

export function isAutoCreationPlanningArea(action: AutoCreationDirectorAction) {
  return action.area === 'planning' || action.area === 'assets'
}

export function isAutoCreationWritingArea(action: AutoCreationDirectorAction) {
  return action.area === 'writing' || action.area === 'quality'
}
