import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'


export type AnyRecord = Record<string, any>

export type AutoCreationDirectorStatus =
  | 'blocked'
  | 'needs_governance'
  | 'needs_acceptance'
  | 'ready'
  | 'running'

export type AutoCreationDirectorArea = 'planning' | 'writing' | 'assets' | 'quality' | 'ops'

export type AutoCreationDirectorActionKey =
  | PlanningActionKey
  | WritingCockpitActionKey
  | 'open_task_center'
  | 'open_story_assets'
  | 'review_governance_closure'
  | 'start_safe_batch_generation'
  | 'create_safe_batch_risk_repair'
  | 'create_style_sample_batch_repair'
  | 'create_recovery_evidence_governance_queue'
  | 'create_delivery_risk_repair'
  | 'create_script_room_repair'
  | 'auto_repair_blockers'
  | 'select_model'

export type AutoCreationPipelineStatus = 'done' | 'active' | 'pending' | 'blocked' | 'warning'
export type AutoCreationContractStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchGuardrailStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationBatchGuardrailSignalStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchReviewStatus = 'empty' | 'ok' | 'warn' | 'risk' | 'done'
export type AutoCreationBatchReviewItemStatus = 'success' | 'failed'
export type AutoCreationBatchRiskStatus = 'ok' | 'warn'
export type AutoCreationBatchCompletionStatus = 'empty' | 'in_progress' | 'needs_repair' | 'ready_next'
export type AutoCreationBatchCompletionMetricStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchHandoffStatus = 'empty' | 'failed' | 'deliver_chapters' | 'repair_risks' | 'continue_batch' | 'prepare_next'
export type AutoCreationChapterLaunchGateStatus = 'ready' | 'warn' | 'blocked'
export type AutoCreationLongformCapacityStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationDeliveryRiskGateStatus = 'ok' | 'warn' | 'block'
export type AutoCreationManualTestReadinessStatus = 'ready' | 'needs_calibration' | 'blocked'
export type AutoCreationDailyBattleStepKey = 'clear_risks' | 'fuel_materials' | 'chapter_work' | 'batch_release'
export type AutoCreationRollingScriptRoomStatus = 'ready' | 'needs_attention' | 'blocked'
export type AutoCreationRollingScriptLayerKey = 'current_chapter' | 'next_10' | 'future_100' | 'current_volume' | 'book_compass'
export type AutoCreationMillionWordRunwayStatus = 'ready' | 'single_chapter' | 'blocked'
export type AutoCreationProductionLicenseStatus = 'blocked' | 'single_chapter' | 'batch_allowed'

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

