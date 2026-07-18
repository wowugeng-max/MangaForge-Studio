import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueModel,
  ChapterPlanningDeskModel,
} from './types-core'
import type { ChapterAcceptanceDeskModel } from './types-acceptance'

export type ChapterHandoffStatus = 'hidden' | 'needs_delivery' | 'ready'

export interface ChapterHandoffDeskModel {
  visible: boolean
  status: ChapterHandoffStatus
  label: string
  fromChapterNo: number | null
  toChapterNo: number | null
  previousEnding: string
  nextOpeningObligations: string[]
  expectationCarryOver: string[]
  deliveryRiskCarryOver: {
    totalCount: number
    label: string
    priorityLabel: string
    items: string[]
  } | null
  storyStateSynced: boolean
  storylineStatusLabel: string
  actionKey: WritingCockpitActionKey
  actionLabel: string
}

export type LongformWorkflowStageKey =
  | 'creation_setup'
  | 'pre_draft'
  | 'post_draft_review'
  | 'quality_continuity'

export type LongformWorkflowStageStatus = 'ready' | 'needs_action' | 'blocked' | 'waiting'

export interface LongformWorkflowStageModel {
  key: LongformWorkflowStageKey
  label: string
  status: LongformWorkflowStageStatus
  actionKey: WritingCockpitActionKey
  actionLabel: string
  evidence: string[]
  riskCount: number
}

export interface LongformWorkflowModel {
  stages: LongformWorkflowStageModel[]
  currentStage: LongformWorkflowStageModel
  primaryAction: {
    key: WritingCockpitActionKey
    label: string
  }
  riskCount: number
}

export interface WritingCockpitModel {
  topStatus: {
    projectTitle: string
    currentVolume: string
    writtenWords: number
    currentRoleLabel: string
    nextActionLabel: string
    primaryActionKey: WritingCockpitActionKey
  }
  nextChapter: WritingCockpitChapter | null
  previousChapter: WritingCockpitChapter | null
  chapterPlanningDesk: ChapterPlanningDeskModel
  chapterAcceptanceDesk: ChapterAcceptanceDeskModel
  chapterHandoffDesk: ChapterHandoffDeskModel
  longformWorkflow: LongformWorkflowModel
  primaryActionKey: WritingCockpitActionKey
  recommendedRole: WritingCockpitRole
  readiness: {
    checks: WritingReadinessCheck[]
    blockers: WritingReadinessCheck[]
    warnings: WritingReadinessCheck[]
  }
  blockers: string[]
  readinessChecks: WritingReadinessCheck[]
  modelTeam: {
    recommendedRole: WritingCockpitRole
    roles: Array<{
      key: WritingCockpitRole
      label: string
      description: string
      actionKey: WritingCockpitActionKey
      active: boolean
    }>
  }
  draftPipeline: {
    state: 'no_chapter' | 'no_draft' | 'draft_generated'
    label: string
  }
  writingQueue: WritingQueueModel
  canonUpdatePreview: string[]
}

export interface BuildWritingCockpitModelInput {
  project?: AnyRecord | null
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[] | null
  chapters?: AnyRecord[] | null
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  diagnostics?: AnyRecord | null
  contextPackage?: AnyRecord | null
  activeRuns?: AnyRecord[] | null
  runs?: AnyRecord[] | null
  memorySummary?: AnyRecord | null
  reviews?: AnyRecord[] | null
}
