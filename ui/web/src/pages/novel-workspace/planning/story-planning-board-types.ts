import type { PlanningActionKey, PlanningWorkspaceModel } from '../planningWorkspaceModel'

export type StoryPlanningBoardLoadingKey = 'rollingPlan' | 'future100Audit' | 'future100Generate' | 'future100Apply'

export type StoryPlanningBoardPanelsProps = {
  model: PlanningWorkspaceModel
  selectedModelId?: number
  loadingKey?: StoryPlanningBoardLoadingKey | string
  onAction: (key: PlanningActionKey, options?: { intent?: any }) => void
  onSelectChapter: (chapterNo: number) => void
  compact: boolean
}
