import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
} from './types-status'

import type {
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompass,
  AutoCreationManualTestReadiness,
  AutoCreationNextBatchBriefChapter,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewQueue,
} from './types-models-batch'

export interface AutoCreationDeliveryRiskGateCategory {
  key: 'delivery_core' | 'runway' | 'reader_expectation' | 'reader_retention' | 'reader_payoff' | 'innovation' | 'signature_scene' | 'storyline' | 'story_unit' | 'story_drive' | 'character_arc' | 'chapter_attraction' | 'chapter_benchmark' | 'style_sample' | 'pre_draft_execution' | 'source_readiness' | 'state_tracking' | 'style_boundary' | 'information_flow' | 'expectation_threshold' | 'story_loop' | 'emotional_arc' | 'chapter_hook' | 'chapter_hook_quality' | 'paragraph_hook' | 'suspense' | 'reversal' | 'showdown' | 'asset_linkage' | 'dialogue' | 'plot_dynamics' | 'character_relation' | 'character_behavior' | 'conflict_structure' | 'bridge_unit' | 'opening' | 'readability' | 'volume_beat' | 'scene_card_receipt' | 'deslop_repair_receipt' | 'revision_cascade_impact' | 'revision_scope_guard' | 'prose_revision_receipt' | 'quality_audit' | 'quality_audit_repair_receipt' | 'recovery_evidence' | 'upgrade_rhythm' | 'chapter_structure' | 'chapter_progression' | 'information_load' | 'longform_continuity' | 'prose_meta' | 'serial_risk_repair'
  label: string
  count: number
  highCount: number
}

export interface AutoCreationDeliveryRiskResolution {
  label: string
  detail: string
  count: number
  chapterNos: number[]
  issueTypes: string[]
}

export interface AutoCreationDeliveryRiskGate {
  status: AutoCreationDeliveryRiskGateStatus
  label: string
  summary: string
  totalOpen: number
  highOpen: number
  categories: AutoCreationDeliveryRiskGateCategory[]
  topRisks: string[]
  recentlyResolved: AutoCreationDeliveryRiskResolution[]
}

export interface AutoCreationStorylineDecisionGate {
  status: 'ok' | 'block'
  label: string
  summary: string
  openCount: number
  taskTitles: string[]
}

export interface AutoCreationGovernanceClosureBrief {
  status: 'ok' | 'block'
  label: string
  summary: string
  count: number
  sourceSummary: string
  failedEvidence: string[]
  watchItems: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationWritingQueueFocus {
  visible: boolean
  status: 'empty' | 'needs_plan' | 'ready_to_draft' | 'draft_generated'
  label: string
  summary: string
  currentChapterNo: number | null
  readyCount: number
  blockedCount: number
  draftedCount: number
  action: AutoCreationDirectorAction
  badges: string[]
}

export interface AutoCreationDailyBattleStep {
  key: AutoCreationDailyBattleStepKey
  label: string
  status: AutoCreationPipelineStatus
  detail: string
  action: AutoCreationDirectorAction
  badges: string[]
  gateChecks: string[]
}

export interface AutoCreationDailyBattlePlan {
  label: string
  summary: string
  currentStepKey: AutoCreationDailyBattleStepKey
  steps: AutoCreationDailyBattleStep[]
}

export interface AutoCreationProductionLicense {
  status: AutoCreationProductionLicenseStatus
  label: string
  modeLabel: string
  summary: string
  safeChapterCount: number
  reasons: string[]
  badges: string[]
  nextAction: AutoCreationDirectorAction
}

export interface AutoCreationTodayCommandFlowItem {
  key: AutoCreationDailyBattleStepKey
  label: string
  status: AutoCreationPipelineStatus
}

export interface AutoCreationTodayQualityGate {
  key: 'core' | 'story_drive' | 'reader_pull' | 'innovation' | 'serial_safety'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export type AutoCreationGovernanceRecheckMemoryStatus = 'empty' | 'closed' | 'needs_followup'

export interface AutoCreationGovernanceRecheckMemory {
  visible: boolean
  status: AutoCreationGovernanceRecheckMemoryStatus
  label: string
  summary: string
  evidence: string[]
  failedEvidence: string[]
  watchItems: string[]
  storylineDecisionTaskCount: number
  sourceRunId: any
  action: AutoCreationDirectorAction
}

export interface AutoCreationReleaseRationale {
  mode: string
  allowedCount: number
  primaryReason: string
  checks: string[]
  limits: string[]
}

export interface AutoCreationTodayCommandDeck {
  label: string
  status: AutoCreationProductionLicenseStatus
  modeLabel: string
  currentStepLabel: string
  summary: string
  reasons: string[]
  action: AutoCreationDirectorAction
  actionLabel: string
  releaseRationale: AutoCreationReleaseRationale
  governanceMemory: AutoCreationGovernanceRecheckMemory
  qualityGates: AutoCreationTodayQualityGate[]
  flow: AutoCreationTodayCommandFlowItem[]
}

export type AutoCreationSerialCockpitStatus = 'ok' | 'warn' | 'block'
export type AutoCreationChapterChainStatus = 'done' | 'current' | 'pending' | 'warn' | 'block'

export interface AutoCreationSerialGuardrail {
  key: 'core_stability' | 'story_drive' | 'reader_pull' | 'innovation_ip' | 'serial_safety'
  label: string
  status: AutoCreationSerialCockpitStatus
  detail: string
  count: number
  action: AutoCreationDirectorAction
}

export interface AutoCreationChapterChainStep {
  key: 'handoff' | 'brief' | 'draft' | 'quality' | 'state_sync' | 'delivery'
  label: string
  status: AutoCreationChapterChainStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationRiskQueueItem {
  key: 'governance_closure' | 'asset_relationships' | 'quality_continuity_scene_map' | 'delivery_risks' | 'storyline_decisions' | 'storylines' | 'reader_expectation' | 'first30_retention' | 'asset_intake' | 'batch_risks'
  label: string
  count: number
  status: AutoCreationSerialCockpitStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationSerialCockpit {
  title: string
  summary: string
  command: AutoCreationTodayCommandDeck
  guardrails: AutoCreationSerialGuardrail[]
  chapterChain: AutoCreationChapterChainStep[]
  batchLicense: AutoCreationProductionLicense
  riskQueue: AutoCreationRiskQueueItem[]
}

export interface AutoCreationMillionWordRunwayGate {
  key: 'core_compass' | 'chapter_four_questions' | 'reader_fuel' | 'innovation' | 'canon_memory' | 'batch_entry'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationMillionWordRunwayQuestion {
  key: 'why_now' | 'page_turn' | 'mainline_move' | 'freshness'
  label: string
  answer: string
  status: AutoCreationBatchGuardrailSignalStatus
}

export interface AutoCreationMillionWordRunway {
  status: AutoCreationMillionWordRunwayStatus
  label: string
  summary: string
  bandLabel: string
  safeModeLabel: string
  gates: AutoCreationMillionWordRunwayGate[]
  fourQuestions: AutoCreationMillionWordRunwayQuestion[]
  redLines: string[]
  readerFuel: string[]
  recommendedAction: AutoCreationDirectorAction
}

export interface AutoCreationRollingScriptLayer {
  key: AutoCreationRollingScriptLayerKey
  label: string
  status: AutoCreationRollingScriptRoomStatus
  detail: string
  evidence: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationRollingScriptRoom {
  status: AutoCreationRollingScriptRoomStatus
  label: string
  summary: string
  focusRangeLabel: string
  layers: AutoCreationRollingScriptLayer[]
  nextChapters: AutoCreationNextBatchBriefChapter[]
  nextAction: AutoCreationDirectorAction
  repairTasks: AnyRecord[]
  repairAction: AutoCreationDirectorAction
}

export interface AutoCreationDirectorModel {
  status: AutoCreationDirectorStatus
  statusLabel: string
  headline: string
  summary: string
  targetChapter: {
    id: any
    chapterNo: number
    title: string
    wordCount: number
    hasProse: boolean
  } | null
  mainAction: AutoCreationDirectorAction
  secondaryActions: AutoCreationDirectorAction[]
  repairPlan: AutoCreationRepairPlan
  blockers: string[]
  confirmations: string[]
  queue: {
    activeCount: number
    labels: string[]
  }
  metrics: {
    writtenWords: number
    targetWords: number
    future10Label: string
    first30Score: number | null
    storylineCount: number
    creationDiagnosisScore: number | null
    longformRhythmScore: number | null
    volumeBeatScore: number | null
    longformCapacityScore: number | null
  }
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  longformBattleDesk: PlanningWorkspaceModel['longformBattleDesk']
  longformCapacity: AutoCreationLongformCapacity
  longformCompass: AutoCreationLongformCompass
  manualTestReadiness: AutoCreationManualTestReadiness
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  dailyBattlePlan: AutoCreationDailyBattlePlan
  productionLicense: AutoCreationProductionLicense
  todayCommandDeck: AutoCreationTodayCommandDeck
  serialCockpit: AutoCreationSerialCockpit
  governanceClosureBrief: AutoCreationGovernanceClosureBrief
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  millionWordRunway: AutoCreationMillionWordRunway
  writingQueueFocus: AutoCreationWritingQueueFocus
  rollingScriptRoom: AutoCreationRollingScriptRoom
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  batchReviewQueue: AutoCreationBatchReviewQueue
  creationPipeline: AutoCreationDirectorCreationPipeline
  serialWorkflow: AutoCreationSerialWorkflow
  pipeline: AutoCreationPipelineStep[]
}

export interface BuildAutoCreationDirectorModelInput {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks?: AnyRecord[] | null
  selectedModelId?: any
  reviews?: AnyRecord[] | null
  runRecords?: AnyRecord[] | null
  chapters?: AnyRecord[] | null
  storyState?: AnyRecord | null
  styleSampleEffectiveness?: AnyRecord | null
}

