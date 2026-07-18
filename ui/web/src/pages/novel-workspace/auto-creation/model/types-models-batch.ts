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

export interface AutoCreationDirectorAction {
  area: AutoCreationDirectorArea
  key: AutoCreationDirectorActionKey
  label: string
  description: string
  modelCall: boolean
  disabled?: boolean
  payload?: AnyRecord
}

export interface AutoCreationRepairPlan {
  visible: boolean
  summary: string
  actions: AutoCreationDirectorAction[]
  autoActionCount: number
  panelActionCount: number
  primaryAction: AutoCreationDirectorAction
}

export interface AutoCreationPipelineStep {
  key:
    | 'longform_planning'
    | 'creation_contract'
    | 'rolling_script_room'
    | 'longform_capacity'
    | 'volume_beat_budget'
    | 'longform_rhythm'
    | 'story_assets'
    | 'retention_curve'
    | 'chapter_planning'
    | 'chapter_execution'
    | 'quality_gate'
    | 'canon_sync'
    | 'chapter_handoff'
    | 'batch_guardrail'
    | 'async_tasks'
  label: string
  status: AutoCreationPipelineStatus
  detail: string
}

export type AutoCreationSerialStageKey =
  | 'book_core'
  | 'longform_plan'
  | 'chapter_launch'
  | 'delivery_acceptance'
  | 'serial_governance'

export interface AutoCreationSerialWorkflowStage {
  key: AutoCreationSerialStageKey
  label: string
  status: AutoCreationPipelineStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationDirectorCreationPipelineStage {
  key: PlanningWorkspaceModel['creationPipeline']['stages'][number]['key'] | string
  label: string
  status: AutoCreationPipelineStatus
  active: boolean
  score: number
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationDirectorCreationPipeline {
  currentStageKey: string
  summary: string
  riskCount: number
  primaryAction: AutoCreationDirectorAction
  stages: AutoCreationDirectorCreationPipelineStage[]
}

export interface AutoCreationSerialWorkflow {
  currentKey: AutoCreationSerialStageKey
  currentLabel: string
  summary: string
  stages: AutoCreationSerialWorkflowStage[]
}

export interface AutoCreationContractItem {
  key: 'core' | 'story' | 'innovation' | 'reader_pull'
  label: string
  status: AutoCreationContractStatus
  detail: string
  evidence: string[]
  actionKey: AutoCreationDirectorActionKey
}

export interface AutoCreationLongformCompassAxis {
  key:
    | 'reader_promise'
    | 'protagonist_drive'
    | 'core_conflict'
    | 'world_hook'
    | 'innovation_hook'
    | 'payoff_loop'
    | 'ending_direction'
  label: string
  value: string
  locked: boolean
}

export interface AutoCreationLongformCompass {
  status: 'ready' | 'needs_attention'
  label: string
  summary: string
  sourceLabel: string
  readerPromise: string
  axes: AutoCreationLongformCompassAxis[]
  immutableRules: string[]
  flexibleZones: string[]
}

export interface AutoCreationManualTestGate {
  key: 'commercial_benchmark' | 'reader_trial' | 'longrun_stress' | 'memory_canon'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
  evidence: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationManualTestReadiness {
  status: AutoCreationManualTestReadinessStatus
  label: string
  summary: string
  gates: AutoCreationManualTestGate[]
  primaryAction: AutoCreationDirectorAction
  handoffChecklist: string[]
}

export interface AutoCreationBatchGuardrailSignal {
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationRecoveryEvidenceTrendSource {
  source: string
  label: string
  releaseFailureCount: number
  trendLabel: string
  evidence: string[]
  sourceRunIds: any[]
  deepRepairDirection: string
  deepRepairEffect: {
    status: 'none' | 'pending' | 'observing' | 'recurred'
    label: string
    summary: string
    latestRepairRunId: any | null
    latestRepairActionLabel: string
    latestRepairAt: string
    postRepairFailureCount: number
    postRepairEvidence: string[]
    strengthenedClosure: {
      status: 'not_required' | 'needs_repair' | 'pending_recheck' | 'converged' | 'recurred'
      label: string
      summary: string
      latestRepairRunId: any | null
      latestRepairAt: string
      postRepairFailureCount: number
      postRepairEvidence: string[]
    }
  }
}

export interface AutoCreationStrengthenedRepairAcceptanceTrend {
  visible: boolean
  status: AutoCreationBatchGuardrailSignalStatus
  label: string
  summary: string
  acceptedBatchCount: number
  failedBatchCount: number
  passStreak: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestBatchLabel: string
  latestRunId: any | null
  sourceEvidence: string[]
  dimensions: {
    core: { label: string; failedCount: number }
    payoff: { label: string; failedCount: number }
    readerPull: { label: string; failedCount: number }
  }
}

export interface AutoCreationRecoveryEvidenceTrend {
  visible: boolean
  status: AutoCreationBatchGuardrailSignalStatus
  label: string
  summary: string
  totalFailureCount: number
  repeatSourceCount: number
  sources: AutoCreationRecoveryEvidenceTrendSource[]
  strengthenedAcceptanceTrend: AutoCreationStrengthenedRepairAcceptanceTrend
}

export interface AutoCreationBatchReleaseChapter {
  chapterNo: number
  title: string
  status: 'allowed' | 'blocked'
  reason: string
}

export interface AutoCreationBatchReleaseWindow {
  summary: string
  allowedChapters: AutoCreationBatchReleaseChapter[]
  blockedChapters: AutoCreationBatchReleaseChapter[]
}

export interface AutoCreationBatchPreflight {
  visible: boolean
  status: AutoCreationBatchGuardrailStatus
  title: string
  summary: string
  allowedChapterNos: number[]
  blockedChapterNos: number[]
  modelPipeline: string[]
  warnings: string[]
  longformMemoryAnchor?: AnyRecord | null
  governanceRecheckMemory?: AnyRecord | null
  chapterHandoffContract?: AnyRecord | null
  inputSnapshot: AnyRecord
}

export interface AutoCreationBatchBriefRepair {
  visible: boolean
  status: AutoCreationBatchGuardrailSignalStatus
  title: string
  summary: string
  missingItems: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationBatchBriefRecovery {
  visible: boolean
  title: string
  summary: string
  restoredChapterCount: number
  evidence: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationNextBatchBriefChapter {
  chapterNo: number
  title: string
  chapterTask: string
  conflict: string
  endingHook: string
  mainlineProgress: string
  styleSampleStrategy?: AnyRecord | null
  styleSampleKeys?: string[]
}

export type AutoCreationNextBatchBriefStartChecklistKey =
  | 'core_promise'
  | 'story_drive'
  | 'reader_payoff'
  | 'innovation'
  | 'forbidden_boundary'
  | 'expansion_structure'

export interface AutoCreationNextBatchBriefStartChecklistItem {
  key: AutoCreationNextBatchBriefStartChecklistKey
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationNextBatchBrief {
  visible: boolean
  chapterRangeLabel: string
  batchGoal: string
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  expansionStructureVerification?: AnyRecord | null
  expansionStructureDecision?: AnyRecord | null
  startChecklist: AutoCreationNextBatchBriefStartChecklistItem[]
  chapters: AutoCreationNextBatchBriefChapter[]
}

export interface AutoCreationLongformCapacitySignal {
  key: 'future_reserve' | 'storyline_pool' | 'volume_runway' | 'production_stamina'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export interface AutoCreationLongformFuelItem {
  key: AutoCreationLongformCapacitySignal['key']
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
  actionKey: PlanningActionKey
  actionLabel: string
  modelCall: boolean
}

export interface AutoCreationLongformCapacity {
  status: AutoCreationLongformCapacityStatus
  score: number
  label: string
  summary: string
  targetBandLabel: string
  remainingWords: number
  estimatedRemainingChapters: number
  recommendedActionKey: PlanningActionKey
  signals: AutoCreationLongformCapacitySignal[]
  fuelQueue: AutoCreationLongformFuelItem[]
}

export interface AutoCreationChapterLaunchSignal {
  key: 'write_preparation' | 'reader_promise' | 'chapter_goal' | 'core_conflict' | 'mainline_service' | 'reader_payoff' | 'ending_hook'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationChapterLaunchGate {
  status: AutoCreationChapterLaunchGateStatus
  label: string
  summary: string
  signals: AutoCreationChapterLaunchSignal[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationBatchGuardrail {
  status: AutoCreationBatchGuardrailStatus
  label: string
  summary: string
  safeChapterCount: number
  recommendedAction: AutoCreationDirectorAction
  guardrails: AutoCreationBatchGuardrailSignal[]
  releaseWindow: AutoCreationBatchReleaseWindow
  preflight: AutoCreationBatchPreflight
  nextBatchBrief: AutoCreationNextBatchBrief
  recoveryEvidenceTrend: AutoCreationRecoveryEvidenceTrend
  briefRepair: AutoCreationBatchBriefRepair
  briefRecovery: AutoCreationBatchBriefRecovery
}

interface AutoCreationCanonRunway {
  status: AutoCreationBatchGuardrailSignalStatus
  label: string
  detail: string
  action: AutoCreationDirectorAction
  staleState: boolean
  memoryUnavailable: boolean
}

export interface AutoCreationBatchReviewItem {
  chapterId: any
  chapterNo: number
  title: string
  status: AutoCreationBatchReviewItemStatus
  score: number | null
  wordCount: number | null
  revised: boolean
  delivered: boolean
  error: string
}

export interface AutoCreationBatchRiskSignal {
  key: 'quality' | 'post_batch_quality' | 'core' | 'runway' | 'payoff' | 'reader_pull' | 'reader_trial' | 'first30_retention' | 'handoff' | 'storyline' | 'story_drive' | 'character_arc' | 'innovation' | 'signature_scene' | 'chapter_attraction' | 'chapter_benchmark' | 'style_sample' | 'readability' | 'serial_rhythm' | 'asset_growth' | 'volume_segment' | 'batch_plan' | 'batch_checklist' | 'recovery_evidence' | 'strengthened_repair_acceptance' | 'batch_expansion_segment' | 'batch_expansion_structure' | 'batch_expansion_structure_decision'
  label: string
  status: AutoCreationBatchRiskStatus
  detail: string
}

export interface AutoCreationBatchChecklistExecutionItem {
  key: string
  label: string
  status: AutoCreationBatchRiskStatus
  detail: string
  planned: string
  evidence: string[]
}

export interface AutoCreationBatchChecklistExecution {
  visible: boolean
  status: AutoCreationBatchRiskStatus
  score: number
  summary: string
  items: AutoCreationBatchChecklistExecutionItem[]
  missed: AutoCreationBatchChecklistExecutionItem[]
}

export interface AutoCreationBatchRiskRadar {
  status: AutoCreationBatchRiskStatus
  averageQualityScore: number | null
  lowQualityCount: number
  postBatchQualityRiskCount: number
  coreRiskCount: number
  runwayRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
  readerTrialRiskCount: number
  first30RetentionRiskCount: number
  handoffRiskCount: number
  storylineRiskCount: number
  storyDriveRiskCount: number
  characterArcRiskCount: number
  innovationRiskCount: number
  signatureSceneRiskCount: number
  chapterAttractionRiskCount: number
  chapterBenchmarkRiskCount: number
  styleSampleRiskCount: number
  preDraftExecutionRiskCount: number
  readabilityRiskCount: number
  serialRhythmRiskCount: number
  assetGrowthRiskCount: number
  volumeSegmentRiskCount: number
  batchPlanRiskCount: number
  batchChecklistRiskCount: number
  recoveryEvidenceRiskCount: number
  strengthenedRepairAcceptanceRiskCount: number
  safeBatchExpansionSegmentRiskCount: number
  safeBatchExpansionSegmentReview?: AnyRecord | null
  safeBatchExpansionStructureValidationRiskCount: number
  safeBatchExpansionStructureValidationResult?: AnyRecord | null
  safeBatchExpansionStructureDecisionRiskCount: number
  safeBatchExpansionStructureDecisionReview?: AnyRecord | null
  checklistExecution: AutoCreationBatchChecklistExecution
  signals: AutoCreationBatchRiskSignal[]
  repairTasks: AnyRecord[]
}

export interface AutoCreationBatchCompletionMetric {
  key: 'generation' | 'delivery' | 'quality' | 'plan' | 'recovery_evidence' | 'strengthened_repair_acceptance' | 'checklist'
  label: string
  value: number
  target: number
  status: AutoCreationBatchCompletionMetricStatus
  detail: string
}

export interface AutoCreationBatchCompletionDashboard {
  visible: boolean
  status: AutoCreationBatchCompletionStatus
  score: number
  label: string
  summary: string
  nextAction: AutoCreationDirectorAction
  metrics: AutoCreationBatchCompletionMetric[]
}

export interface AutoCreationBatchHandoff {
  visible: boolean
  status: AutoCreationBatchHandoffStatus
  label: string
  summary: string
  action: AutoCreationDirectorAction
  targetChapterNos: number[]
  riskLabels: string[]
  evidence: string[]
}

export interface AutoCreationBatchReviewQueue {
  visible: boolean
  status: AutoCreationBatchReviewStatus
  label: string
  summary: string
  total: number
  success: number
  failed: number
  delivered: number
  safeLimit: number | null
  availableTotal: number | null
  createdAt: string
  nextAction: AutoCreationDirectorAction
  riskRadar: AutoCreationBatchRiskRadar
  completionDashboard: AutoCreationBatchCompletionDashboard
  handoff: AutoCreationBatchHandoff
  items: AutoCreationBatchReviewItem[]
}

