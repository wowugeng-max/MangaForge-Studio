import { parseWorkspacePayload } from './payloadParseCache'

type AnyRecord = Record<string, any>

export type WritingCockpitRole =
  | 'chief_editor'
  | 'episode_planner'
  | 'draft_writer'
  | 'revision_editor'
  | 'continuity_auditor'
  | 'operations_analyst'

export type WritingCockpitActionKey =
  | 'open_writing_bible'
  | 'open_outline_panel'
  | 'repair_materials'
  | 'build_scene_plan'
  | 'write_draft'
  | 'review_draft'
  | 'fix_continuity'
  | 'update_canon'
  | 'open_task_center'
  | 'open_story_assets'
  | 'refresh_context_package'
  | 'open_generation_diagnostics'
  | 'confirm_plan_and_write_draft'
  | 'refresh_current_quality'
  | 'create_editor_report'
  | 'apply_editor_revision'
  | 'sync_story_state'
  | 'accept_chapter_and_continue'
  | 'open_editor_reports'
  | 'open_version_history'

export type WritingReadinessStatus = 'pass' | 'warning' | 'blocker'

export interface WritingReadinessCheck {
  key:
    | 'writing_bible_missing'
    | 'writing_bible_ready'
    | 'volume_goal_missing'
    | 'volume_goal_ready'
    | 'chapter_missing'
    | 'chapter_ready'
    | 'chapter_outline_missing'
    | 'chapter_outline_ready'
    | 'materials_not_ready'
    | 'materials_ready'
    | 'story_state_stale'
    | 'story_state_ready'
    | 'memory_unavailable'
    | 'memory_ready'
  status: WritingReadinessStatus
  label: string
  detail: string
  actionKey: WritingCockpitActionKey
}

export interface WritingCockpitChapter {
  id: any
  chapterNo: number
  title: string
  goal: string
  previousEnding: string
  whyItMatters: string
  mustAdvance: string[]
  forbiddenRepeats: string[]
  chapterGoal: string
  conflict: string
  endingHook: string
  wordCount: number
  hasProse: boolean
  rawPayload: AnyRecord
}

export type WritingQueueItemStatus = 'ready_to_draft' | 'needs_plan' | 'draft_generated'

export interface WritingQueueItem {
  id: any
  chapterNo: number
  title: string
  sourceLabel: string
  status: WritingQueueItemStatus
  statusLabel: string
  actionLabel: string
  actionHint: string
  missingPlanFields: string[]
  missingPlanLabels: string[]
  repairIntent: AnyRecord | null
  goal: string
  conflict: string
  endingHook: string
  wordCount: number
}

export interface WritingQueueModel {
  visible: boolean
  currentChapterNo: number | null
  readyCount: number
  blockedCount: number
  draftedCount: number
  planRepair: {
    visible: boolean
    label: string
    chapterCount: number
    missingCount: number
    chapterNos: number[]
    intent: AnyRecord | null
  }
  items: WritingQueueItem[]
}

export type ChapterPlanningReadiness = 'ready' | 'needs_context' | 'needs_scene_plan' | 'blocked'
export type ChapterContextPackageStatus = 'missing' | 'insufficient' | 'ready'
export type ChapterScenePlanStatus = 'missing' | 'ready'

export interface ChapterPlanningDeskSceneCard {
  sceneNo: number
  title: string
  purpose: string
  conflict: string
  turn: string
  endingHook: string
  requiredBeats: string[]
  stateChangesExpected: string[]
  serialRiskRepairs: string[]
  recentFatigueAction: string
  characterVoice: string
  dialogueGoals: string[]
  styleDirectives: string[]
  benchmarkRecallDirectives: string[]
  conceptAnchorRules: string[]
  proseCraftDirectives: string[]
}

export interface ChapterQualityContinuitySceneMapItem {
  sceneNo: number
  title: string
  stage: 'opening' | 'middle' | 'ending'
  action: string
  riskTags: string[]
  forbiddenRepeats: string[]
}

export interface ChapterWritePreparationBrief {
  readinessStatus: 'ready' | 'needs_context'
  sourceGaps: string[]
  assetRisks: string[]
  deliveryRiskActions: string[]
  blueprintFocus: string[]
  readerPayoffFocus: string[]
  mustConfirm: string[]
  executionOrder: string[]
}

export interface ChapterPlanningDeskModel {
  readiness: ChapterPlanningReadiness
  statusLabel: string
  contextPackageStatus: ChapterContextPackageStatus
  scenePlanStatus: ChapterScenePlanStatus
  reasons: string[]
  recommendedPlannerAction: {
    key: WritingCockpitActionKey
    label: string
  }
  shouldAutoExpandPlanner: boolean
  writePreparationBrief: ChapterWritePreparationBrief | null
  episodePlan: {
    chapterObjective: string
    previousHandoff: string
    coreConflict: string
    emotionalMovement: string
    payoff: string
    endingHook: string
    forbiddenRepeats: string[]
    coreContract: {
      summary: string
      mustServe: string[]
      noDrift: string[]
      repairFocus: string[]
    }
    readerDropRisk: {
      status: string
      dropPoints: string[]
      openingGuardrail: string
      middleGuardrail: string
      endingGuardrail: string
    }
    storyPressure: {
      status: string
      pressureSources: string[]
      conflictEscalationGuardrail: string
      stakesGrowthGuardrail: string
      reversalPressureGuardrail: string
      requiredActions: string[]
    }
    storyDrive: {
      protagonistChoice: string
      choiceCost: string
      stateChange: string
      obstacle: string
      causalNextStep: string
      requiredActions: string[]
    }
    serialRhythm: {
      status: string
      openingHookDeadline: string
      payoffInterval: string
      middleGuardrail: string
      endingHookGuardrail: string
      scenePayoffBudget: Array<{
        sceneNo: number
        title: string
        wordBudget: string
        requiredPayoff: string
        turn: string
        endingHookSeed: string
      }>
      antiDragRules: string[]
    }
    pageTurnHook: {
      status: string
      hookType: string
      coreQuestion: string
      visibleTrigger: string
      withheldAnswer: string
      nextChapterPull: string
      finalImage: string
      forbiddenResolution: string[]
      requiredActions: string[]
    }
    volumeClimax: {
      status: string
      currentVolumeTitle: string
      chapterRange: string
      currentChapterRole: string
      volumeGoal: string
      climaxPromise: string
      requiredBeats: string[]
      forbiddenPayoff: string[]
      nearbyBeats: Array<{
        chapterNo: number | null
        type: string
        label: string
        detail: string
      }>
      nextActions: string[]
    }
    deliveryRiskCarryOver: {
      label: string
      priorityLabel: string
      items: string[]
      evidence: string[]
      requiredActions: string[]
      openingActions: string[]
      middleActions: string[]
      endingActions: string[]
      forbiddenRepeats: string[]
    }
  }
  sceneCards: ChapterPlanningDeskSceneCard[]
  qualityContinuitySceneMap: ChapterQualityContinuitySceneMapItem[]
}

export type ChapterAcceptanceStatus =
  | 'hidden'
  | 'needs_quality_check'
  | 'needs_revision'
  | 'needs_recheck'
  | 'needs_state_sync'
  | 'ready_to_accept'
  | 'delivered_with_warnings'
  | 'delivered'

export interface DeslopGateDiagnosticsModel {
  version: string
  total: number
  concernGateCount: number
  summary: string
  gates: Array<{
    gate: string
    label: string
    status: string
    count: number
    patterns: string[]
    evidence: string[]
    fix: string
  }>
}

export interface ChapterAcceptanceDeskModel {
  visible: boolean
  acceptanceStatus: ChapterAcceptanceStatus
  admissionStatus: 'accepted' | 'accepted_with_warnings' | 'blocked_invalid' | ''
  qualityWarnings: Array<{ code: string; source: string; message: string }>
  storyStateStatus: 'synced' | 'pending' | ''
  storyStatePanel: {
    visible: boolean
    status: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps'
    statusLabel: string
    headline: string
    summary: string
    reasons: string[]
    guidance: string
    chapterNo: number
    lastUpdatedChapter: number
    canSync: boolean
    primaryAction: { key: WritingCockpitActionKey; label: string } | null
    establishedEvents: {
      confirmedCount: number
      candidateCount: number
      hardCount: number
      preview: string[]
      guidance: string
    } | null
  } | null
  postCommitWarnings: Array<{ stage: string; message: string }>
  statusLabel: string
  acceptanceReasons: string[]
  storylineSync: {
    status: 'ok' | 'warn'
    label: string
    completedCount: number
    missedCount: number
    unplannedCount: number
    forbiddenCount: number
  } | null
  storyUnitSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    rushedCount: number
    forbiddenCount: number
    riskCount: number
  } | null
  assetIntake: {
    status: 'pending' | 'applied'
    label: string
    pendingCount: number
  } | null
  ipSceneIntake: {
    status: 'ready'
    label: string
    candidateCount: number
    candidates: Array<{
      title: string
      summary: string
      visualHook: string
      adaptationValue: string
      spreadPoint: string
    }>
  } | null
  signatureSceneSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    plannedCount: number
  } | null
  readabilityReview: {
    score: number | null
    scoreLabel: string
    openingHookScore: number | null
    openingHookLabel: string
    openingHookRisk: boolean
    endingHookScore: number | null
    endingHookLabel: string
    endingHookRisk: boolean
    sceneReadabilityScore: number | null
    sceneReadabilityLabel: string
    sceneReadabilityRisk: boolean
    payoffDensityScore: number | null
    payoffDensityLabel: string
    payoffDensityRisk: boolean
    aiSmellLabel: string
    aiSmellRisk: boolean
    aiSmellHitCount: number
    aiSmellTactics: string[]
    memeLabel: string
    riskLabel: string
    riskCount: number
  } | null
  deslopGateDiagnostics: DeslopGateDiagnosticsModel | null
  coreDrift: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  runwaySync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  readerPayoffSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    debtCount: number
  } | null
  readerExpectationSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    openingHandoffMissedCount: number
  } | null
  qualityAuditSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  qualityAuditRepairReceiptSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    receiptCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffDeltaSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  writePreparation: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  intentConfirmationSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  benchmarkRecallSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  sourceReadiness: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  stateTracking: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  styleBoundary: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  informationFlow: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  expectationThreshold: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  storyLoop: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  emotionalArc: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHook: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  paragraphHook: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  suspense: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  assetLinkage: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  dialogue: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  plotDynamics: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  characterRelation: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  characterBehavior: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  conflictStructure: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  bridgeUnit: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  reversal: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  showdown: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  opening: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  proseCraft: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  punctuationTone: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  contentRubric: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  targetReader: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  genrePositioning: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  femaleAudience: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  upgradeRhythm: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterStructure: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterProgression: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  informationLoad: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  longformContinuity: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  coreContractCheck: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  continuityHeat: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  revisionReceiptCheck: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  deslopRepairCheck: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  proseMeta: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  serialRiskRepair: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHookQuality: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  readerRetentionCheck: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  readerRetentionSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  chapterAttraction: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    weakCount: number
    priorityLabel: string
  } | null
  storyDriveSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  characterArcSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  chapterBenchmarkSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  styleSampleSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    copyRiskCount: number
  } | null
  first30RetentionRecheck: {
    status: 'stale'
    label: string
    reason: string
  } | null
  innovationSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  volumeBeatSync: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  blueprintReceipt: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    deliveredCount: number
    totalCount: number
    missedCount: number
    evidence: string[]
    missed: string[]
  } | null
  revisionReceipt: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  deliveryRiskReceipt: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  sceneCardReceipt: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    scenes: string[]
    fields: string[]
  } | null
  qualityAudit: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    checks: string[]
    fixes: string[]
    strategies: string[]
  } | null
  platformRubric: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    rubric: string
    rubricSource: string
    passedCount: number
    totalCount: number
    missedCount: number
    missed: string[]
    evidence: string[]
  } | null
  approvalBlocker: {
    type: 'quality_gate' | 'low_score' | 'draft' | 'safety' | 'reference_safety_blocked' | 'blocked_invalid'
    status: 'warn'
    label: string
    detail: string
    scoreLabel: string
    reasons: string[]
  } | null
  governanceRecheckSync: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    failedEvidence: string[]
    watchItems: string[]
    summary: string
  } | null
  deliveryRiskQueue: {
    totalCount: number
    label: string
    priorityLabel: string
    items: string[]
  } | null
  deliveryRiskConvergence: {
    status: 'cleared' | 'improved' | 'unchanged' | 'worse'
    label: string
    residualCount: number
    resolvedCount: number
    nextAction: string
  } | null
  qualityScore: number | null
  qualityStatus: string
  mustFix: string[]
  optionalImprovements: string[]
  latestQualityReviewId: any
  latestEditorReportId: any
  latestRevisionReviewId: any
  latestEditorReportSummary: string
  latestRevisionSummary: string
  storyStateSynced: boolean
  recommendedAcceptanceAction: {
    key: WritingCockpitActionKey
    label: string
  }
  secondaryActions: Array<{
    key: WritingCockpitActionKey
    label: string
  }>
  shouldAutoExpandAcceptance: boolean
}

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

const ROLE_META: Record<WritingCockpitRole, { label: string; description: string; actionKey: WritingCockpitActionKey }> = {
  chief_editor: {
    label: '总编',
    description: '校准作品承诺、卷目标和章节入口。',
    actionKey: 'open_writing_bible',
  },
  episode_planner: {
    label: '分集策划',
    description: '补齐章节任务、冲突和材料缺口。',
    actionKey: 'build_scene_plan',
  },
  draft_writer: {
    label: '正文写手',
    description: '根据章节计划生成稳定初稿。',
    actionKey: 'write_draft',
  },
  revision_editor: {
    label: '修订编辑',
    description: '审阅已有正文并推进改稿。',
    actionKey: 'review_draft',
  },
  continuity_auditor: {
    label: '连续性审计',
    description: '同步故事状态并修补设定断点。',
    actionKey: 'update_canon',
  },
  operations_analyst: {
    label: '运营分析',
    description: '查看任务、运行和生产节奏。',
    actionKey: 'open_task_center',
  },
}

const ACTION_LABELS: Record<WritingCockpitActionKey, string> = {
  open_writing_bible: '完善写作圣经',
  open_outline_panel: '打开大纲面板',
  repair_materials: '修复生成材料',
  build_scene_plan: '补章节场景计划',
  write_draft: '生成本章初稿',
  review_draft: '审阅修订正文',
  fix_continuity: '修复连续性',
  update_canon: '同步故事状态',
  open_task_center: '打开任务中心',
  open_story_assets: '打开设定资产',
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认计划，进入初稿',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '立即同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function normalizeOhStoryDirector(value?: AnyRecord | null): AnyRecord | null {
  if (!value || typeof value !== 'object') return null
  const director = [
    value.context_package?.oh_story_director,
    value.context_package?.ohStoryDirector,
    value.contextPackage?.oh_story_director,
    value.contextPackage?.ohStoryDirector,
    value.oh_story_director,
    value.ohStoryDirector,
  ].find(candidate => candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0)
  return director || null
}

function directorPlannerAction(director?: AnyRecord | null): WritingCockpitActionKey | null {
  const action = director?.primary_action || director?.primaryAction || {}
  const key = text(action?.key)
  if (key === 'generate_prose' || key === 'write_chapter_prose') return 'confirm_plan_and_write_draft'
  if (key === 'repair_pre_draft_materials' || key === 'auto_repair_pre_draft' || key === 'repair_materials') {
    return 'repair_materials'
  }
  if (key === 'confirm_missing_choice' || key === 'manual_confirmation_required') return 'open_generation_diagnostics'
  return null
}

function directorActionLabel(director: AnyRecord, actionKey: WritingCockpitActionKey) {
  const action = director.primary_action || director.primaryAction || {}
  return text(action?.label, ACTION_LABELS[actionKey])
}

function directorPlanningReasons(director: AnyRecord, fallback: string) {
  const summary = firstNonEmpty(director.blocking_summary, director.blockingSummary)
  const repairReasons = arrayValue(director.required_repairs || director.requiredRepairs)
    .map(repair => typeof repair === 'object'
      ? firstNonEmpty(repair.detail, repair.label, repair.summary, repair.message)
      : text(repair))
    .filter(Boolean)
  const reasons = [summary, ...repairReasons].filter(Boolean)
  return reasons.length ? reasons.slice(0, 3) : [fallback]
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function deliveryReceiptsFrom(value?: AnyRecord | null): AnyRecord {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

function uniqueObjects(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function blueprintReceiptLabel(key: string) {
  const labels: Record<string, string> = {
    target_emotion: '目标情绪',
    opening_hook: '开篇钩子',
    core_payoff: '核心回报',
    content_outline: '五段式',
    plot_lines: '多线推进',
    character_order: '人物顺序',
    relationship_change: '关系变化',
    information_gap: '信息缺口',
    beat_sequence: '节拍功能',
    cost_and_reward: '代价收益',
    ending_contract: '章尾承接',
    writing_intent: '写作意图',
  }
  return labels[key] || key
}

function blueprintReceiptDelivered(value: any) {
  if (value === true) return true
  if (value === false) return false
  if (!value || typeof value !== 'object') return false
  const status = text(value.status || value.result).toLowerCase()
  if (['ok', 'pass', 'passed', 'delivered', 'fulfilled', 'met', 'done'].includes(status)) return true
  if (['warn', 'missed', 'missing', 'failed', 'fail', 'false'].includes(status)) return false
  if (value.delivered === true || value.ok === true || value.met === true || value.fulfilled === true) return true
  if (value.delivered === false || value.ok === false || value.met === false || value.fulfilled === false) return false
  return false
}

function blueprintReceiptEvidence(value: any) {
  if (!value || typeof value !== 'object') return ''
  return firstNonEmpty(value.evidence, value.summary, value.detail, value.text)
}

function isBlueprintReceiptValue(value: any) {
  if (typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return 'delivered' in value
    || 'ok' in value
    || 'met' in value
    || 'fulfilled' in value
    || 'status' in value
    || 'result' in value
    || Boolean(firstNonEmpty(value.evidence, value.summary, value.detail, value.text))
}

function blueprintReceiptEntries(raw: any) {
  if (!raw || typeof raw !== 'object') return []
  if (Array.isArray(raw)) {
    return raw
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        key: firstNonEmpty(item.key, item.field, item.name, item.label, 'blueprint'),
        value: item,
      }))
      .filter(item => isBlueprintReceiptValue(item.value))
  }

  const nested = raw.receipts
    || raw.blueprint_receipts
    || raw.blueprintReceipts
    || raw.chapter_blueprint_receipts
    || raw.chapterBlueprintReceipts
    || null
  if (nested && nested !== raw) return blueprintReceiptEntries(nested)

  const entries = Object.entries(raw)
    .map(([key, value]) => ({ key, value }))
    .filter(item => isBlueprintReceiptValue(item.value))
  return entries.length > 0 ? entries : []
}

function buildBlueprintReceiptSummary(chapter?: AnyRecord | null): ChapterAcceptanceDeskModel['blueprintReceipt'] {
  const chapterDeliveryReceipts = deliveryReceiptsFrom(chapter)
  const rawChapterBlueprint = chapterDeliveryReceipts?.chapter_blueprint || chapterDeliveryReceipts?.chapterBlueprint || null
  const scenes = [
    ...arrayValue(chapter?.scene_breakdown),
    ...arrayValue(chapter?.scene_list),
  ]
  const receiptSources = [
    ...scenes.map(scene => scene?.blueprint_receipts || scene?.blueprintReceipts || null),
    rawChapterBlueprint,
    chapterDeliveryReceipts?.chapter_blueprint_receipts || chapterDeliveryReceipts?.chapterBlueprintReceipts || null,
    chapterDeliveryReceipts?.blueprint_receipts || chapterDeliveryReceipts?.blueprintReceipts || null,
  ]
  const receipts = receiptSources.flatMap(raw => {
    return blueprintReceiptEntries(raw).map(({ key, value }) => ({
      key,
      label: blueprintReceiptLabel(key),
      delivered: blueprintReceiptDelivered(value),
      evidence: blueprintReceiptEvidence(value),
    }))
  })
  const totalCount = receipts.length
  if (totalCount <= 0) return null
  const deliveredCount = receipts.filter(item => item.delivered).length
  const missed = receipts.filter(item => !item.delivered).map(item => item.label)
  const missedCount = missed.length

  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `蓝图缺口 ${missedCount}` : '蓝图已兑现',
    scoreLabel: `蓝图兑现 ${deliveredCount}/${totalCount}`,
    deliveredCount,
    totalCount,
    missedCount,
    evidence: receipts.map(item => item.evidence).filter(Boolean).slice(0, 4),
    missed,
  }
}

function revisionReceiptRemainingRisk(value: any) {
  const risk = firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.risk)
  if (!risk) return ''
  const normalized = risk.toLowerCase()
  if (['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return ''
  return risk
}

function revisionReceiptSyncPayload(value?: AnyRecord | null) {
  const source = value || {}
  const result = source?.result || {}
  return source?.prose_revision_receipt_sync
    || source?.proseRevisionReceiptSync
    || result?.prose_revision_receipt_sync
    || result?.proseRevisionReceiptSync
    || null
}

function revisionReceiptSyncRiskSummary(sync: AnyRecord | null) {
  if (!sync) {
    return {
      riskCount: 0,
      closedCount: 0,
      receiptCount: 0,
      label: '',
      risks: [] as string[],
      evidence: [] as string[],
    }
  }
  const missedRows = arrayValue(sync?.missed)
  const missedCountValue = Number(sync?.missed_count ?? sync?.missedCount)
  const completedCountValue = Number(sync?.completed_count ?? sync?.completedCount)
  const receiptCountValue = Number(sync?.receipt_count ?? sync?.receiptCount)
  const statusWarn = text(sync?.status).toLowerCase() === 'warn'
  const riskCount = Number.isFinite(missedCountValue)
    ? missedCountValue
    : statusWarn && missedRows.length === 0
      ? 1
      : missedRows.length
  const closedCount = Number.isFinite(completedCountValue) ? completedCountValue : 0
  const receiptCount = Number.isFinite(receiptCountValue) ? receiptCountValue : 0
  return {
    riskCount,
    closedCount,
    receiptCount,
    label: text(sync?.label),
    risks: missedRows
      .map(item => firstNonEmpty(item?.text, item?.risk, item?.remaining_risk, item?.remainingRisk, item?.label))
      .filter(Boolean)
      .slice(0, 4),
    evidence: missedRows
      .map(item => firstNonEmpty(item?.evidence, item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix))
      .filter(Boolean)
      .slice(0, 4),
  }
}

function buildRevisionReceiptSummary(payload?: AnyRecord | null, receiptSyncPayload?: AnyRecord | null): ChapterAcceptanceDeskModel['revisionReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const revisionReceipts = [
    ...arrayValue(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...arrayValue(revision?.revision_receipts || revision?.revisionReceipts),
    ...arrayValue(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...arrayValue(payload?.revision_receipts || payload?.revisionReceipts),
  ]
  const deslopRepairReceipts = [
    ...arrayValue(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...arrayValue(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...arrayValue(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
    ...arrayValue(payload?.deslop_repair_receipts || payload?.deslopRepairReceipts),
  ]
  const receipts = [...revisionReceipts, ...deslopRepairReceipts]
  const totalCount = receipts.length
  const proseSyncSummary = revisionReceiptSyncRiskSummary(revisionReceiptSyncPayload(receiptSyncPayload))
  if (totalCount <= 0) {
    if (proseSyncSummary.riskCount > 0 || proseSyncSummary.receiptCount > 0) {
      const syncTotalCount = Math.max(proseSyncSummary.riskCount + proseSyncSummary.closedCount, proseSyncSummary.receiptCount)
      return {
        status: proseSyncSummary.riskCount > 0 ? 'warn' : 'ok',
        label: proseSyncSummary.label || (proseSyncSummary.riskCount > 0 ? `修订残留 ${proseSyncSummary.riskCount}` : '修订已闭环'),
        scoreLabel: `修订闭环 ${proseSyncSummary.closedCount}/${syncTotalCount}`,
        closedCount: proseSyncSummary.closedCount,
        totalCount: syncTotalCount,
        riskCount: proseSyncSummary.riskCount,
        evidence: proseSyncSummary.evidence,
        risks: proseSyncSummary.risks,
      }
    }
    const sync = receiptSyncPayload?.deslop_repair_receipt_sync
      || receiptSyncPayload?.deslopRepairReceiptSync
      || receiptSyncPayload?.result?.deslop_repair_receipt_sync
      || receiptSyncPayload?.result?.deslopRepairReceiptSync
      || null
    const missedRows = arrayValue(sync?.missed)
    const missedCountValue = Number(sync?.missed_count ?? sync?.missedCount)
    const completedCountValue = Number(sync?.completed_count ?? sync?.completedCount)
    const receiptCountValue = Number(sync?.receipt_count ?? sync?.receiptCount)
    const riskCount = Number.isFinite(missedCountValue) ? missedCountValue : missedRows.length
    const closedCount = Number.isFinite(completedCountValue) ? completedCountValue : 0
    const syncTotalCount = Math.max(
      riskCount + closedCount,
      Number.isFinite(receiptCountValue) ? receiptCountValue : 0,
    )
    if (!sync || syncTotalCount <= 0) return null
    return {
      status: riskCount > 0 || text(sync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok',
      label: text(sync?.label) || (riskCount > 0 ? `去AI味残留 ${riskCount}` : '去AI味已闭环'),
      scoreLabel: `去AI味闭环 ${closedCount}/${syncTotalCount}`,
      closedCount,
      totalCount: syncTotalCount,
      riskCount,
      evidence: missedRows.map(item => firstNonEmpty(item?.evidence, item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix)).filter(Boolean).slice(0, 4),
      risks: missedRows.map(item => firstNonEmpty(item?.text, item?.risk, item?.remaining_risk, item?.remainingRisk)).filter(Boolean).slice(0, 4),
    }
  }

  const risks = receipts.map(revisionReceiptRemainingRisk).filter(Boolean).slice(0, 4)
  const riskCount = receipts.filter(item => revisionReceiptRemainingRisk(item)).length
  const closedCount = Math.max(0, totalCount - riskCount)
  const combinedRiskCount = riskCount + proseSyncSummary.riskCount
  const combinedClosedCount = Math.max(closedCount, proseSyncSummary.closedCount)
  const combinedTotalCount = Math.max(totalCount, proseSyncSummary.receiptCount, combinedClosedCount + combinedRiskCount)
  const deslopOnly = revisionReceipts.length === 0 && deslopRepairReceipts.length > 0
  return {
    status: combinedRiskCount > 0 ? 'warn' : 'ok',
    label: proseSyncSummary.riskCount > 0 && proseSyncSummary.label
      ? proseSyncSummary.label
      : combinedRiskCount > 0 ? `${deslopOnly ? '去AI味' : '修订'}残留 ${combinedRiskCount}` : `${deslopOnly ? '去AI味' : '修订'}已闭环`,
    scoreLabel: `${deslopOnly ? '去AI味' : '修订'}闭环 ${combinedClosedCount}/${combinedTotalCount}`,
    closedCount: combinedClosedCount,
    totalCount: combinedTotalCount,
    riskCount: combinedRiskCount,
    evidence: [
      ...receipts.map(item => firstNonEmpty(item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix)).filter(Boolean),
      ...proseSyncSummary.evidence,
    ].slice(0, 4),
    risks: [...risks, ...proseSyncSummary.risks].slice(0, 4),
  }
}

function deliveryRiskReceiptRemainingRisk(value: any) {
  const risk = firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.risk)
  if (risk) {
    const normalized = risk.toLowerCase()
    if (!['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return risk
  }
  if (value?.delivered === false) return firstNonEmpty(value?.required_action, value?.requiredAction, value?.risk_item, value?.riskItem, '承接动作未闭环')
  return ''
}

function buildDeliveryRiskReceiptSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['deliveryRiskReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const payloadDeliveryReceipts = payload?.oh_story_delivery_receipts || payload?.ohStoryDeliveryReceipts || {}
  const selfCheckDeliveryReceipts = selfCheck?.oh_story_delivery_receipts || selfCheck?.ohStoryDeliveryReceipts || {}
  const reviewDeliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...arrayValue(reviewDeliveryReceipts?.delivery_risk_receipts || reviewDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(review?.delivery_risk_receipts || review?.deliveryRiskReceipts),
    ...arrayValue(selfCheckDeliveryReceipts?.delivery_risk_receipts || selfCheckDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(selfCheck?.delivery_risk_receipts || selfCheck?.deliveryRiskReceipts),
    ...arrayValue(payloadDeliveryReceipts?.delivery_risk_receipts || payloadDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(payload?.delivery_risk_receipts || payload?.deliveryRiskReceipts),
  ]
  const totalCount = receipts.length
  if (totalCount <= 0) return null

  const risks = receipts.map(deliveryRiskReceiptRemainingRisk).filter(Boolean).slice(0, 4)
  const riskCount = receipts.filter(item => deliveryRiskReceiptRemainingRisk(item)).length
  const closedCount = Math.max(0, totalCount - riskCount)
  return {
    status: riskCount > 0 ? 'warn' : 'ok',
    label: riskCount > 0 ? `承接残留 ${riskCount}` : '承接已闭环',
    scoreLabel: `承接闭环 ${closedCount}/${totalCount}`,
    closedCount,
    totalCount,
    riskCount,
    evidence: receipts.map(item => firstNonEmpty(item?.evidence, item?.required_action, item?.requiredAction, item?.risk_item, item?.riskItem)).filter(Boolean).slice(0, 4),
    risks,
  }
}

function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.title,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.remaining_risk,
    value?.remainingRisk,
    value?.required_action,
    value?.requiredAction,
    ...stringArray(value?.fields),
  ].map(item => text(item)).filter(Boolean).join(' ')
}

function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.passed === true || value?.delivered === true || value?.ok === true) return false
  if (value?.passed === false || value?.delivered === false || value?.ok === false) return true
  return true
}

function buildSceneCardReceiptSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['sceneCardReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const payloadDeliveryReceipts = deliveryReceiptsFrom(payload)
  const selfCheckDeliveryReceipts = deliveryReceiptsFrom(selfCheck)
  const reviewDeliveryReceipts = deliveryReceiptsFrom(review)
  const auditChecks = [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
    ...arrayValue(review?.issues),
    ...arrayValue(selfCheck?.issues),
    ...arrayValue(payload?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
  const nestedReceipts = [
    ...arrayValue(reviewDeliveryReceipts?.scene_card_receipts || reviewDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(review?.scene_card_receipts || review?.sceneCardReceipts),
    ...arrayValue(selfCheckDeliveryReceipts?.scene_card_receipts || selfCheckDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(selfCheck?.scene_card_receipts || selfCheck?.sceneCardReceipts),
    ...arrayValue(payloadDeliveryReceipts?.scene_card_receipts || payloadDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(payload?.scene_card_receipts || payload?.sceneCardReceipts),
  ].filter(sceneCardReceiptCheckFailed)
  const checks = [...auditChecks, ...nestedReceipts]

  const riskCount = checks.length
  if (riskCount <= 0) return null

  const scenes = Array.from(new Set(checks.map(item => {
    const sceneNo = Number(item?.scene_no ?? item?.sceneNo)
    if (Number.isFinite(sceneNo) && sceneNo > 0) return `场景${sceneNo}`
    const match = sceneCardReceiptCheckText(item).match(/场景\s*(\d+)/)
    return match?.[1] ? `场景${match[1]}` : ''
  }).filter(Boolean))).slice(0, 4)
  const fields = Array.from(new Set(checks.flatMap(item => stringArray(item?.fields)).filter(Boolean))).slice(0, 6)
  const evidence = checks.map(item => firstNonEmpty(
    item?.remaining_risk,
    item?.remainingRisk,
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.fix,
    sceneCardReceiptCheckText(item),
  )).filter(Boolean).slice(0, 4)

  return {
    status: 'warn',
    label: `场景回执缺口 ${riskCount}`,
    riskCount,
    evidence,
    scenes,
    fields,
  }
}

function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.strategy,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  const score = Number(value?.score)
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

function buildQualityAuditSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAudit'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)

  const riskCount = checks.length
  if (riskCount <= 0) return null

  return {
    status: 'warn',
    label: `质量诊断缺口 ${riskCount}`,
    riskCount,
    evidence: checks.map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, qualityAuditCheckText(item))).filter(Boolean).slice(0, 4),
    checks: Array.from(new Set(checks.map(item => firstNonEmpty(item?.label, item?.key, item?.type, qualityAuditCheckText(item))).filter(Boolean))).slice(0, 6),
    fixes: checks.map(item => firstNonEmpty(item?.fix, item?.action)).filter(Boolean).slice(0, 4),
    strategies: Array.from(new Set(checks.map(item => text(item?.strategy)).filter(Boolean))).slice(0, 4),
  }
}

function approvalBlockerLabel(type: string) {
  if (type === 'reference_safety_blocked') return '仿写安全阻断'
  if (type === 'safety') return '仿写安全待确认'
  if (type === 'low_score') return '低分待确认'
  if (type === 'draft') return '正文入库待确认'
  return '质量门禁阻断'
}

function buildApprovalBlockerSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['approvalBlocker'] {
  if (!payload) return null
  const qualityGate = payload?.quality_gate || payload?.qualityGate || {}
  const safetyDecision = payload?.safety_decision || payload?.safetyDecision || payload?.reference_safety || payload?.referenceSafety || {}
  const explicitType = text(payload?.approval_type || payload?.approvalType).toLowerCase()
  const type = explicitType || (safetyDecision?.blocked ? 'reference_safety_blocked' : qualityGate?.passed === false ? 'quality_gate' : '')
  if (!['quality_gate', 'low_score', 'draft', 'safety', 'reference_safety_blocked'].includes(type)) return null
  const scoreValue = payload?.self_check?.review?.score
    ?? payload?.selfCheck?.review?.score
    ?? payload?.review?.score
    ?? safetyDecision?.score
    ?? qualityGate?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const safetyReasons = stringArray(safetyDecision?.reasons)
  const gateReasons = stringArray(qualityGate?.reasons)
  const issueReasons = arrayValue(payload?.self_check?.review?.issues || payload?.selfCheck?.review?.issues || payload?.review?.issues)
    .map(issueText)
    .filter(Boolean)
  const reasons = Array.from(new Set([...safetyReasons, ...gateReasons, ...issueReasons])).slice(0, 5)
  const copyHitCount = Number(safetyDecision?.copy_hit_count ?? safetyDecision?.copyHitCount)
  const detail = reasons[0]
    || (Number.isFinite(copyHitCount) && copyHitCount > 0 ? `参考相似命中 ${copyHitCount}` : '')
    || text(payload?.summary)
    || '入库前需要人工确认或修订处理。'
  return {
    type: type as NonNullable<ChapterAcceptanceDeskModel['approvalBlocker']>['type'],
    status: 'warn',
    label: approvalBlockerLabel(type),
    detail,
    scoreLabel: safeScore === null ? '入库阻断' : `入库阻断 ${safeScore}`,
    reasons,
  }
}

function platformRubricLabel(value: any) {
  const normalized = firstNonEmpty(value).toLowerCase()
  if (normalized.includes('fanqie') || normalized.includes('番茄')) return '番茄'
  if (normalized.includes('qidian') || normalized.includes('起点')) return '起点'
  if (normalized.includes('zhihu') || normalized.includes('知乎') || normalized.includes('盐言')) return '知乎'
  if (normalized.includes('generic') || normalized.includes('通用')) return '通用'
  return firstNonEmpty(value, '通用')
}

function platformCheckPassed(value: any) {
  if (value === true) return true
  if (value === false) return false
  const status = firstNonEmpty(value?.status, value?.result, value?.passed).toLowerCase()
  if (['pass', 'passed', 'ok', 'true', 'met', 'done'].includes(status)) return true
  if (['warn', 'warning', 'fail', 'failed', 'missing', 'missed', 'false'].includes(status)) return false
  if (value?.passed === true || value?.delivered === true || value?.ok === true) return true
  return false
}

function buildPlatformRubricSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['platformRubric'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.platform_checks || review?.platformChecks),
    ...arrayValue(selfCheck?.platform_checks || selfCheck?.platformChecks),
    ...arrayValue(payload?.platform_checks || payload?.platformChecks),
  ]
  const rubric = firstNonEmpty(review?.rubric, selfCheck?.rubric, payload?.rubric, review?.platform, payload?.platform)
  if (checks.length <= 0 && !rubric) return null

  const totalCount = checks.length
  const missedChecks = checks.filter(item => !platformCheckPassed(item))
  const missed = missedChecks.map(item => firstNonEmpty(item?.label, item?.key, item?.fix, item?.evidence)).filter(Boolean).slice(0, 4)
  const missedCount = missedChecks.length
  const passedCount = Math.max(0, totalCount - missedCount)
  const label = platformRubricLabel(rubric)
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: `平台基准：${label}`,
    scoreLabel: totalCount > 0 ? `平台达标 ${passedCount}/${totalCount}` : `平台基准：${label}`,
    rubric,
    rubricSource: firstNonEmpty(review?.rubric_source, review?.rubricSource, selfCheck?.rubric_source, payload?.rubric_source, payload?.rubricSource),
    passedCount,
    totalCount,
    missedCount,
    missed,
    evidence: checks.map(item => firstNonEmpty(item?.evidence, item?.fix, item?.label, item?.key)).filter(Boolean).slice(0, 4),
  }
}

function compactWordCount(value: any) {
  return String(value || '').replace(/\s/g, '').length
}

function compactText(value: any) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function hasProse(chapter?: AnyRecord | null) {
  const chapterText = String(chapter?.chapter_text || '')
  const compact = chapterText.replace(/\s/g, '')
  if (chapterText) return Boolean(compact && !chapterText.includes('【占位正文】'))
  return Boolean(chapter?.has_prose || chapter?.hasProse || Number(chapter?.word_count ?? chapter?.wordCount ?? 0) > 0)
}

function sortChapters(chapters: AnyRecord[]) {
  return [...chapters].sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
}

function hasValidId(record?: AnyRecord | null) {
  return record?.id !== null && record?.id !== undefined && String(record.id).trim() !== ''
}

function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

function writingBibleExists(writingBible: AnyRecord) {
  return Boolean(firstNonEmpty(
    writingBible?.promise,
    writingBible?.reader_promise,
    writingBible?.mainline?.title,
    writingBible?.mainline?.hook,
    writingBible?.mainline_title,
    writingBible?.mainline_hook,
  ))
}

function outlineLevel(outline: AnyRecord) {
  return text(outline?.outline_level || outline?.level || outline?.outline_type).toLowerCase()
}

function outlineRange(outline: AnyRecord) {
  const raw = outline?.raw_payload || {}
  const start = Number(outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? 0)
  const end = Number(outline?.end_chapter ?? raw?.end_chapter ?? outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? start)
  return { start, end }
}

function chapterInOutline(chapterNo: number, outline: AnyRecord) {
  const { start, end } = outlineRange(outline)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

function titleMatches(left: any, right: any) {
  const a = text(left)
  const b = text(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

function resolveVolume(outlines: AnyRecord[], writingBible: AnyRecord, nextChapter: AnyRecord | null) {
  const chapterNo = Number(nextChapter?.chapter_no || 0)
  const volumeOutlines = outlines.filter(outline => {
    const level = outlineLevel(outline)
    return level === 'volume' || level === '卷'
  })
  const outline = volumeOutlines.find(item => chapterNo && chapterInOutline(chapterNo, item)) || volumeOutlines[0] || {}
  const bibleVolumes = arrayValue(writingBible?.volume_plan || writingBible?.volumes)
  const bibleVolume = bibleVolumes.find(volume => titleMatches(volume?.title, outline?.title)) || bibleVolumes[0] || {}

  return {
    title: firstNonEmpty(outline?.title, bibleVolume?.title, '未定卷'),
    goal: firstNonEmpty(outline?.goal, bibleVolume?.goal, bibleVolume?.summary, bibleVolume?.promise, outline?.summary),
  }
}

function chapterNoFromTitle(title: any) {
  const match = text(title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function chapterFromOutline(outlines: AnyRecord[], chapterOrNo: AnyRecord | number) {
  const chapter = typeof chapterOrNo === 'object' ? chapterOrNo : null
  const chapterNo = Number(chapter?.chapter_no || chapterOrNo || 0)
  const outlineId = chapter?.outline_id
  return outlines.find(outline => {
    const level = outlineLevel(outline)
    if (level !== 'chapter' && level !== '章节') return false
    if (outlineId !== null && outlineId !== undefined && String(outline?.id) === String(outlineId)) return true
    const raw = outline?.raw_payload || {}
    const rawChapterNo = Number(outline?.chapter_no || raw?.chapter_no || raw?.future100?.chapter_no || raw?.skeleton?.chapter_no || raw?.rollingPlan?.chapter_no || 0)
    const titleChapterNo = chapterNoFromTitle(outline?.title)
    return rawChapterNo === chapterNo || titleChapterNo === chapterNo || chapterInOutline(chapterNo, outline)
  }) || null
}

function firstArrayText(value: any) {
  return arrayValue(value).map(item => text(item)).find(Boolean) || ''
}

function outlineRawPayload(outline?: AnyRecord | null) {
  return outline?.raw_payload || {}
}

function outlinePlanPayload(outline?: AnyRecord | null) {
  const raw = outlineRawPayload(outline)
  return {
    raw,
    future100: raw?.future100 || {},
    skeleton: raw?.skeleton || {},
    rollingPlan: raw?.rollingPlan || {},
  }
}

function chapterPlanFields(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const chapterRollingPlan = chapterRaw?.rollingPlan || {}
  const { raw, future100, skeleton, rollingPlan } = outlinePlanPayload(outline)
  const goal = firstNonEmpty(
    chapter?.chapter_goal,
    chapter?.chapterTask,
    chapter?.task,
    chapterRaw?.chapter_goal,
    chapterRaw?.chapterTask,
    chapterRaw?.task,
    chapterRollingPlan?.chapter_goal,
    chapterRollingPlan?.chapterTask,
    chapterRollingPlan?.task,
    outline?.chapter_goal,
    outline?.chapterTask,
    outline?.task,
    raw?.chapter_goal,
    raw?.chapterTask,
    raw?.task,
    rollingPlan?.chapter_goal,
    rollingPlan?.chapterTask,
    rollingPlan?.task,
    future100?.chapter_goal,
    future100?.chapterTask,
    future100?.task,
    skeleton?.chapter_goal,
    skeleton?.chapterTask,
    skeleton?.task,
    outline?.summary,
  )
  const conflict = firstNonEmpty(
    chapter?.conflict,
    chapterRaw?.conflict,
    chapterRollingPlan?.conflict,
    outline?.conflict,
    raw?.conflict,
    rollingPlan?.conflict,
    future100?.conflict,
    skeleton?.conflict,
    firstArrayText(chapterRollingPlan?.conflict_points),
    firstArrayText(outline?.conflict_points),
    firstArrayText(raw?.conflict_points),
    firstArrayText(rollingPlan?.conflict_points),
    firstArrayText(future100?.conflict_points),
    firstArrayText(skeleton?.conflict_points),
  )
  const endingHook = firstNonEmpty(
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.hook,
    chapterRaw?.ending_hook,
    chapterRaw?.endingHook,
    chapterRaw?.hook,
    chapterRollingPlan?.ending_hook,
    chapterRollingPlan?.endingHook,
    chapterRollingPlan?.hook,
    outline?.ending_hook,
    outline?.endingHook,
    outline?.hook,
    raw?.ending_hook,
    raw?.endingHook,
    raw?.hook,
    rollingPlan?.ending_hook,
    rollingPlan?.endingHook,
    rollingPlan?.hook,
    future100?.ending_hook,
    future100?.endingHook,
    future100?.hook,
    skeleton?.ending_hook,
    skeleton?.endingHook,
    skeleton?.hook,
  )

  return { goal, conflict, endingHook }
}

function hasUsableChapterPlan(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const plan = chapterPlanFields(chapter, outline)
  return Boolean(plan.goal && plan.conflict && plan.endingHook)
}

function chapterHasOutline(chapter: AnyRecord | null, outlines: AnyRecord[]) {
  if (!chapter) return false
  const matchingOutline = chapterFromOutline(outlines, chapter)
  return hasUsableChapterPlan(chapter, matchingOutline)
}

function materialReady(materialScore?: AnyRecord | null) {
  if (!materialScore) return false
  return Boolean(materialScore.can_generate) || Number(materialScore.score || 0) >= 70
}

function memoryReady(memorySummary?: AnyRecord | null) {
  if (!memorySummary) return true
  return Number(memorySummary.memory_count || 0) > 0 || Number(memorySummary.fact_count || 0) > 0
}

function stringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  const single = text(value)
  return single ? [single] : []
}

function labelStringArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.label, item.name, item.summary, item.detail)
  }).filter(Boolean)
}

function normalizeCoreContractPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.core_contract_radar
    || target?.coreContractRadar
    || contextPackage?.core_contract_radar
    || contextPackage?.coreContractRadar
    || contextPackage?.pre_draft_brief?.core_contract_radar
    || contextPackage?.context_package?.core_contract_radar
    || {}
  return {
    summary: firstNonEmpty(raw?.summary, raw?.detail, raw?.reason),
    mustServe: stringArray(raw?.must_serve || raw?.mustServe || raw?.required),
    noDrift: stringArray(raw?.no_drift || raw?.noDrift || raw?.red_lines || raw?.redLines),
    repairFocus: stringArray(raw?.repair_focus || raw?.repairFocus || raw?.required_actions || raw?.requiredActions),
  }
}

function normalizeReaderDropRiskPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.reader_drop_risk_brief
    || target?.readerDropRiskBrief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.readerDropRiskBrief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext
    || contextPackage?.pre_draft_brief?.reader_drop_risk_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status, raw?.drop_points?.length || raw?.dropPoints?.length ? 'needs_repair' : ''),
    dropPoints: stringArray(raw?.drop_points || raw?.dropPoints || raw?.risks),
    openingGuardrail: firstNonEmpty(raw?.opening_guardrail, raw?.openingGuardrail),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail),
    endingGuardrail: firstNonEmpty(raw?.ending_guardrail, raw?.endingGuardrail),
  }
}

function normalizeStoryPressurePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_pressure_brief
    || target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder
    || contextPackage?.pre_draft_brief?.story_pressure_brief
    || {}
  const pressureSources = labelStringArray(raw?.pressure_sources || raw?.pressureSources || raw?.sources)
  return {
    status: firstNonEmpty(raw?.status, pressureSources.length ? 'ready' : ''),
    pressureSources,
    conflictEscalationGuardrail: firstNonEmpty(raw?.conflict_escalation_guardrail, raw?.conflictEscalationGuardrail),
    stakesGrowthGuardrail: firstNonEmpty(raw?.stakes_growth_guardrail, raw?.stakesGrowthGuardrail),
    reversalPressureGuardrail: firstNonEmpty(raw?.reversal_pressure_guardrail, raw?.reversalPressureGuardrail),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

function normalizeStoryDrivePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_drive_brief
    || target?.storyDriveBrief
    || contextPackage?.story_drive_brief
    || contextPackage?.storyDriveBrief
    || contextPackage?.pre_draft_brief?.story_drive_brief
    || target
    || {}
  return {
    protagonistChoice: firstNonEmpty(raw?.protagonist_choice, raw?.protagonistChoice, raw?.active_choice, raw?.activeChoice, target?.protagonist_choice, target?.active_choice),
    choiceCost: firstNonEmpty(raw?.choice_cost, raw?.choiceCost, raw?.cost, raw?.consequence, raw?.stakes, target?.choice_cost, target?.cost, target?.consequence, target?.stakes),
    stateChange: firstNonEmpty(raw?.state_change, raw?.stateChange, raw?.exit_state, raw?.exitState, target?.state_change, target?.exit_state),
    obstacle: firstNonEmpty(raw?.obstacle, raw?.conflict, raw?.core_conflict, raw?.coreConflict, target?.core_conflict, target?.conflict),
    causalNextStep: firstNonEmpty(raw?.causal_next_step, raw?.causalNextStep, raw?.next_step, raw?.nextStep, raw?.ending_hook, raw?.endingHook, target?.ending_hook),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

function normalizeSerialRhythmBudget(value: any, index: number) {
  if (!value || typeof value !== 'object') return null
  return {
    sceneNo: Number(value?.scene_no || value?.sceneNo || index + 1),
    title: firstNonEmpty(value?.title, value?.name, `场景${index + 1}`),
    wordBudget: firstNonEmpty(value?.word_budget, value?.wordBudget, value?.budget),
    requiredPayoff: firstNonEmpty(value?.required_payoff, value?.requiredPayoff, value?.reader_payoff, value?.readerPayoff, value?.payoff),
    turn: firstNonEmpty(value?.turn, value?.reversal, value?.turning_point, value?.turningPoint, value?.information_gap, value?.informationGap),
    endingHookSeed: firstNonEmpty(value?.ending_hook_seed, value?.endingHookSeed, value?.ending_hook, value?.endingHook, value?.exit_state, value?.exitState),
  }
}

function normalizeSerialRhythmPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.serial_rhythm_brief
    || target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief
    || contextPackage?.pre_draft_brief?.serial_rhythm_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    openingHookDeadline: firstNonEmpty(raw?.opening_hook_deadline, raw?.openingHookDeadline, raw?.opening_guardrail, raw?.openingGuardrail),
    payoffInterval: firstNonEmpty(raw?.payoff_interval, raw?.payoffInterval, raw?.payoff_density, raw?.payoffDensity),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail, raw?.pacing_guardrail, raw?.pacingGuardrail),
    endingHookGuardrail: firstNonEmpty(raw?.ending_hook_guardrail, raw?.endingHookGuardrail, raw?.ending_guardrail, raw?.endingGuardrail),
    scenePayoffBudget: (Array.isArray(raw?.scene_payoff_budget) ? raw.scene_payoff_budget : Array.isArray(raw?.scenePayoffBudget) ? raw.scenePayoffBudget : [])
      .map((item: any, index: number) => normalizeSerialRhythmBudget(item, index))
      .filter(Boolean),
    antiDragRules: stringArray(raw?.anti_drag_rules || raw?.antiDragRules || raw?.no_drag_rules || raw?.noDragRules),
  }
}

function normalizePageTurnHookPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.page_turn_hook_brief
    || target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief
    || contextPackage?.pre_draft_brief?.page_turn_hook_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    hookType: firstNonEmpty(raw?.hook_type, raw?.hookType, raw?.type),
    coreQuestion: firstNonEmpty(raw?.core_question, raw?.coreQuestion, raw?.question),
    visibleTrigger: firstNonEmpty(raw?.visible_trigger, raw?.visibleTrigger, raw?.trigger),
    withheldAnswer: firstNonEmpty(raw?.withheld_answer, raw?.withheldAnswer, raw?.withheld, raw?.forbidden_answer, raw?.forbiddenAnswer),
    nextChapterPull: firstNonEmpty(raw?.next_chapter_pull, raw?.nextChapterPull, raw?.next_pull, raw?.nextPull),
    finalImage: firstNonEmpty(raw?.final_image, raw?.finalImage, raw?.last_image, raw?.lastImage),
    forbiddenResolution: stringArray(raw?.forbidden_resolution || raw?.forbiddenResolution || raw?.forbidden),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions),
  }
}

function normalizeVolumeClimaxBeat(value: any, index: number) {
  if (!value || typeof value !== 'object') {
    const label = firstNonEmpty(value, `爆点${index + 1}`)
    return label ? { chapterNo: null, type: '', label, detail: '' } : null
  }
  const label = firstNonEmpty(value?.label, value?.title, value?.name, value?.summary, value?.detail, `爆点${index + 1}`)
  const detail = firstNonEmpty(value?.detail, value?.description, value?.summary, value?.promise, value?.payoff)
  const type = firstNonEmpty(value?.type, value?.beat_type, value?.beatType, value?.kind)
  if (!label && !detail && !type) return null
  return {
    chapterNo: Number(value?.chapter_no || value?.chapterNo || value?.chapter || 0) || null,
    type,
    label,
    detail,
  }
}

function sortNearbyVolumeClimaxBeats(beats: Array<NonNullable<ReturnType<typeof normalizeVolumeClimaxBeat>>>, chapterNo: number) {
  return beats
    .map((beat, index) => ({ beat, index }))
    .sort((left, right) => {
      const leftNo = Number(left.beat.chapterNo || 0)
      const rightNo = Number(right.beat.chapterNo || 0)
      if (chapterNo && leftNo === chapterNo && rightNo !== chapterNo) return -1
      if (chapterNo && rightNo === chapterNo && leftNo !== chapterNo) return 1
      if (chapterNo && leftNo && rightNo) return Math.abs(leftNo - chapterNo) - Math.abs(rightNo - chapterNo)
      return left.index - right.index
    })
    .map(item => item.beat)
}

function normalizeVolumeClimaxPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.volume_climax_brief
    || target?.volumeClimaxBrief
    || target?.volume_beat_brief
    || target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.pre_draft_brief?.volume_climax_brief
    || {}
  const budget = contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget
    || raw?.volume_beat_budget
    || raw?.volumeBeatBudget
    || {}
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || raw?.chapter_no || raw?.chapterNo || 0)
  const explicitBeats = (Array.isArray(raw?.nearby_beats) ? raw.nearby_beats : Array.isArray(raw?.nearbyBeats) ? raw.nearbyBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const budgetBeats = (Array.isArray(budget?.beats) ? budget.beats : Array.isArray(budget?.volume_beats) ? budget.volume_beats : Array.isArray(budget?.volumeBeats) ? budget.volumeBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const nearbyBeats = (explicitBeats.length ? explicitBeats : sortNearbyVolumeClimaxBeats(budgetBeats, chapterNo)).slice(0, 6)
  const currentBeat = nearbyBeats.find(beat => chapterNo && Number(beat?.chapterNo || 0) === chapterNo) || nearbyBeats[0] || null
  return {
    status: firstNonEmpty(raw?.status, budget?.status),
    currentVolumeTitle: firstNonEmpty(raw?.current_volume_title, raw?.currentVolumeTitle, budget?.current_volume_title, budget?.currentVolumeTitle, budget?.volume_title, budget?.volumeTitle),
    chapterRange: firstNonEmpty(raw?.chapter_range, raw?.chapterRange, budget?.chapter_range, budget?.chapterRange),
    currentChapterRole: firstNonEmpty(
      raw?.current_chapter_role,
      raw?.currentChapterRole,
      raw?.chapter_role,
      raw?.chapterRole,
      raw?.role,
      currentBeat ? `${currentBeat.type ? `${currentBeat.type}：` : ''}${currentBeat.label}${currentBeat.detail ? `，${currentBeat.detail}` : ''}` : '',
      budget?.summary,
    ),
    volumeGoal: firstNonEmpty(raw?.volume_goal, raw?.volumeGoal, budget?.volume_goal, budget?.volumeGoal, budget?.goal, budget?.summary),
    climaxPromise: firstNonEmpty(raw?.climax_promise, raw?.climaxPromise, raw?.reader_payoff, raw?.readerPayoff, raw?.payoff, currentBeat?.detail),
    requiredBeats: stringArray(raw?.required_beats || raw?.requiredBeats || raw?.beats_required || raw?.beatsRequired),
    forbiddenPayoff: stringArray(raw?.forbidden_payoff || raw?.forbiddenPayoff || raw?.forbidden_payoffs || raw?.forbiddenPayoffs || raw?.forbidden_resolution || raw?.forbiddenResolution),
    nearbyBeats,
    nextActions: stringArray(raw?.next_actions || raw?.nextActions || budget?.next_actions || budget?.nextActions),
  }
}

function normalizeDeliveryRiskCarryOverPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.delivery_risk_carry_over
    || target?.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver
    || contextPackage?.pre_draft_brief?.delivery_risk_carry_over
    || contextPackage?.pre_draft_brief?.deliveryRiskCarryOver
    || contextPackage?.preDraftBrief?.delivery_risk_carry_over
    || contextPackage?.preDraftBrief?.deliveryRiskCarryOver
    || contextPackage?.context_package?.delivery_risk_carry_over
    || contextPackage?.context_package?.deliveryRiskCarryOver
    || {}
  const totalCount = Number(raw?.total_count ?? raw?.totalCount ?? raw?.count)
  const items = stringArray(raw?.items || raw?.risk_items || raw?.riskItems || raw?.risks)
  const evidence = stringArray(raw?.evidence || raw?.evidences || raw?.risk_evidence || raw?.riskEvidence)
  const requiredActions = stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions || raw?.actions)
  const stagedActions = categorizeDeliveryRiskActions(requiredActions)
  const openingActions = uniqueStrings([
    ...stringArray(raw?.opening_actions || raw?.openingActions),
    ...stagedActions.openingActions,
  ])
  const middleActions = uniqueStrings([
    ...stringArray(raw?.middle_actions || raw?.middleActions),
    ...stagedActions.middleActions,
  ])
  const endingActions = uniqueStrings([
    ...stringArray(raw?.ending_actions || raw?.endingActions),
    ...stagedActions.endingActions,
  ])
  const forbiddenRepeats = uniqueStrings(stringArray(raw?.forbidden_repeats || raw?.forbiddenRepeats))
  return {
    label: firstNonEmpty(raw?.label, Number.isFinite(totalCount) && totalCount > 0 ? `待修复 ${totalCount}` : ''),
    priorityLabel: firstNonEmpty(raw?.priority_label, raw?.priorityLabel, raw?.priority, raw?.focus),
    items,
    evidence,
    requiredActions: uniqueStrings([
      ...requiredActions,
      ...openingActions,
      ...middleActions,
      ...endingActions,
    ]),
    openingActions,
    middleActions,
    endingActions,
    forbiddenRepeats,
  }
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function categorizeDeliveryRiskActions(actions: string[]) {
  const openingActions: string[] = []
  const middleActions: string[] = []
  const endingActions: string[] = []

  for (const action of actions) {
    const normalized = text(action)
    if (!normalized) continue
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(normalized)) {
      openingActions.push(normalized)
      continue
    }
    if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(normalized)) {
      endingActions.push(normalized)
      continue
    }
    middleActions.push(normalized)
  }

  return {
    openingActions: uniqueStrings(openingActions),
    middleActions: uniqueStrings(middleActions),
    endingActions: uniqueStrings(endingActions),
  }
}

function previousEnding(previousChapter?: AnyRecord | null) {
  const hook = firstNonEmpty(previousChapter?.ending_hook, previousChapter?.endingHook, previousChapter?.hook)
  if (hook) return hook
  const prose = compactText(previousChapter?.chapter_text)
  if (prose) return prose.slice(-120)
  return '上一章尚无可用收束，请先确认承接点。'
}

function whyItMatters(volumeGoal: string) {
  if (volumeGoal) return `本章要服务当前卷目标：${volumeGoal}`
  return '当前卷目标缺失，请先明确本章为什么值得写。'
}

function toCockpitChapter(chapter: AnyRecord, context: { previousChapter?: AnyRecord | null; volumeGoal?: string; outline?: AnyRecord | null } = {}): WritingCockpitChapter {
  const plan = chapterPlanFields(chapter, context.outline)
  const rawPayload = chapter?.raw_payload || {}
  return {
    id: chapter?.id,
    chapterNo: Number(chapter?.chapter_no || 0),
    title: text(chapter?.title, '未命名章节'),
    goal: plan.goal,
    previousEnding: previousEnding(context.previousChapter),
    whyItMatters: whyItMatters(text(context.volumeGoal)),
    mustAdvance: stringArray(rawPayload?.must_advance),
    forbiddenRepeats: stringArray(rawPayload?.forbidden_repeats),
    chapterGoal: plan.goal,
    conflict: plan.conflict,
    endingHook: plan.endingHook,
    wordCount: hasProse(chapter)
      ? (chapter?.chapter_text ? compactWordCount(chapter.chapter_text) : Number(chapter?.word_count ?? chapter?.wordCount ?? 0) || 0)
      : 0,
    hasProse: hasProse(chapter),
    rawPayload,
  }
}

function chooseNextChapter(chapters: AnyRecord[], activeChapter?: AnyRecord | null) {
  if (hasValidId(activeChapter)) return activeChapter as AnyRecord
  const sorted = sortChapters(chapters)
  return sorted.find(chapter => !hasProse(chapter)) || sorted[0] || null
}

function buildReadinessChecks(args: {
  writingBibleReady: boolean
  volumeGoalReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  storyStateReady: boolean
  memoryReady: boolean
}): WritingReadinessCheck[] {
  return [
    args.writingBibleReady
      ? { key: 'writing_bible_ready', status: 'pass', label: '写作圣经已就绪', detail: '作品承诺可用于约束正文。', actionKey: 'open_writing_bible' }
      : { key: 'writing_bible_missing', status: 'blocker', label: '缺写作圣经', detail: '需要先补齐读者承诺或主线钩子。', actionKey: 'open_writing_bible' },
    args.volumeGoalReady
      ? { key: 'volume_goal_ready', status: 'pass', label: '卷目标已就绪', detail: '当前卷有可用目标。', actionKey: 'open_outline_panel' }
      : { key: 'volume_goal_missing', status: 'blocker', label: '缺卷目标', detail: '需要明确当前卷要兑现的主线目标。', actionKey: 'open_outline_panel' },
    args.hasChapter
      ? { key: 'chapter_ready', status: 'pass', label: '目标章节已选定', detail: '可以围绕目标章节组织生产。', actionKey: 'open_outline_panel' }
      : { key: 'chapter_missing', status: 'blocker', label: '缺目标章节', detail: '需要先创建或选择章节。', actionKey: 'open_outline_panel' },
    args.chapterOutlineReady
      ? { key: 'chapter_outline_ready', status: 'pass', label: '章节计划已就绪', detail: '章节任务、冲突和钩子可用。', actionKey: 'build_scene_plan' }
      : { key: 'chapter_outline_missing', status: 'blocker', label: '缺章节计划', detail: '需要补齐章节任务、冲突和结尾钩子。', actionKey: 'build_scene_plan' },
    args.materialsReady
      ? { key: 'materials_ready', status: 'pass', label: '生成材料已就绪', detail: '材料分满足本轮正文生成。', actionKey: 'repair_materials' }
      : { key: 'materials_not_ready', status: 'blocker', label: '材料未就绪', detail: '需要修复材料诊断后再生成。', actionKey: 'repair_materials' },
    args.storyStateReady
      ? { key: 'story_state_ready', status: 'pass', label: '故事状态已同步', detail: '故事状态与已写章节保持对齐。', actionKey: 'update_canon' }
      : { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
    args.memoryReady
      ? { key: 'memory_ready', status: 'pass', label: '记忆摘要可用', detail: '长期记忆可辅助连续性判断。', actionKey: 'fix_continuity' }
      : { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
  ]
}

function resolvePrimaryAction(args: {
  writingBibleReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  nextHasProse: boolean
  storyStateReady: boolean
}): { role: WritingCockpitRole; action: WritingCockpitActionKey } {
  if (!args.writingBibleReady) return { role: 'chief_editor', action: 'open_writing_bible' }
  if (!args.hasChapter) return { role: 'chief_editor', action: 'open_outline_panel' }
  if (!args.chapterOutlineReady) return { role: 'episode_planner', action: 'build_scene_plan' }
  if (!args.materialsReady) return { role: 'episode_planner', action: 'repair_materials' }
  if (!args.storyStateReady) return { role: 'continuity_auditor', action: 'update_canon' }
  if (args.nextHasProse) return { role: 'revision_editor', action: 'review_draft' }
  return { role: 'draft_writer', action: 'write_draft' }
}

function pipelineState(nextChapter: AnyRecord | null) {
  if (!nextChapter) return { state: 'no_chapter' as const, label: '等待章节' }
  if (hasProse(nextChapter)) return { state: 'draft_generated' as const, label: '已有初稿' }
  return { state: 'no_draft' as const, label: '等待生成初稿' }
}

function chapterPlanSourceLabel(chapter: AnyRecord, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const outlineRaw = outline?.raw_payload || {}
  if (chapterRaw?.source === 'rolling_plan' || outlineRaw?.source === 'rolling_plan' || chapterRaw?.rollingPlan || outlineRaw?.rollingPlan) return '滚动规划'
  if (outlineRaw?.source === 'future100' || outlineRaw?.future100 || outlineRaw?.skeleton) return '百章骨架'
  if (outline?.id || chapter?.outline_id) return '章节大纲'
  return '手动章节'
}

function missingPlanItems(plan: { goal: string; conflict: string; endingHook: string }) {
  const items = [
    { field: 'chapter_goal', label: '章节目标', missing: !plan.goal },
    { field: 'conflict', label: '核心冲突', missing: !plan.conflict },
    { field: 'ending_hook', label: '章末钩子', missing: !plan.endingHook },
  ].filter(item => item.missing)
  return {
    fields: items.map(item => item.field),
    labels: items.map(item => item.label),
  }
}

function writingQueueAction(status: WritingQueueItemStatus, missingLabels: string[] = []) {
  if (status === 'draft_generated') {
    return { actionLabel: '质检', actionHint: '进入交稿质检、编辑报告和故事状态同步。' }
  }
  if (status === 'needs_plan') {
    return { actionLabel: '补计划', actionHint: `先补${missingLabels.length > 0 ? missingLabels.join('、') : '章节目标、核心冲突、章末钩子'}。` }
  }
  return { actionLabel: '开写', actionHint: '进入本章任务书、场景卡和正文生成。' }
}

function buildWritingQueue(chapters: AnyRecord[], outlines: AnyRecord[], nextChapter: AnyRecord | null): WritingQueueModel {
  if (!nextChapter) {
    return {
      visible: false,
      currentChapterNo: null,
      readyCount: 0,
      blockedCount: 0,
      draftedCount: 0,
      planRepair: {
        visible: false,
        label: '补齐队列计划',
        chapterCount: 0,
        missingCount: 0,
        chapterNos: [],
        intent: null,
      },
      items: [],
    }
  }
  const currentChapterNo = Number(nextChapter?.chapter_no || 0)
  const items = sortChapters(chapters)
    .filter(chapter => Number(chapter?.chapter_no || 0) >= currentChapterNo)
    .slice(0, 5)
    .map(chapter => {
      const outline = chapterFromOutline(outlines, chapter)
      const plan = chapterPlanFields(chapter, outline)
      const drafted = hasProse(chapter)
      const planReady = Boolean(plan.goal && plan.conflict && plan.endingHook)
      const status: WritingQueueItemStatus = drafted ? 'draft_generated' : planReady ? 'ready_to_draft' : 'needs_plan'
      const missing = missingPlanItems(plan)
      const action = writingQueueAction(status, missing.labels)
      return {
        id: chapter?.id,
        chapterNo: Number(chapter?.chapter_no || 0),
        title: text(chapter?.title, '未命名章节'),
        sourceLabel: chapterPlanSourceLabel(chapter, outline),
        status,
        statusLabel: status === 'draft_generated' ? '待质检' : status === 'ready_to_draft' ? '可开写' : '缺计划',
        actionLabel: action.actionLabel,
        actionHint: action.actionHint,
        missingPlanFields: status === 'needs_plan' ? missing.fields : [],
        missingPlanLabels: status === 'needs_plan' ? missing.labels : [],
        repairIntent: status === 'needs_plan'
          ? {
              source: 'writing_queue_plan_repair',
              chapter_id: chapter?.id,
              chapter_no: Number(chapter?.chapter_no || 0),
              missing_fields: missing.fields,
              missing_labels: missing.labels,
            }
          : null,
        goal: plan.goal,
        conflict: plan.conflict,
        endingHook: plan.endingHook,
        wordCount: drafted ? compactWordCount(chapter?.chapter_text) : 0,
      }
    })
  const blockedItems = items.filter(item => item.status === 'needs_plan')
  const planRepair = {
    visible: blockedItems.length > 1,
    label: '补齐队列计划',
    chapterCount: blockedItems.length,
    missingCount: blockedItems.reduce((sum, item) => sum + item.missingPlanFields.length, 0),
    chapterNos: blockedItems.map(item => item.chapterNo),
    intent: blockedItems.length > 0
      ? {
          source: 'writing_queue_batch_plan_repair',
          chapter_nos: blockedItems.map(item => item.chapterNo),
          chapters: blockedItems.map(item => ({
            chapter_id: item.id,
            chapter_no: item.chapterNo,
            title: item.title,
            source_label: item.sourceLabel,
            missing_fields: item.missingPlanFields,
            missing_labels: item.missingPlanLabels,
          })),
        }
      : null,
  }
  return {
    visible: items.length > 0,
    currentChapterNo,
    readyCount: items.filter(item => item.status === 'ready_to_draft').length,
    blockedCount: blockedItems.length,
    draftedCount: items.filter(item => item.status === 'draft_generated').length,
    planRepair,
    items,
  }
}

function contextPreflight(contextPackage?: AnyRecord | null) {
  return contextPackage?.preflight || contextPackage?.context_package?.preflight || {}
}

function contextTarget(contextPackage?: AnyRecord | null) {
  return contextPackage?.chapter_target || contextPackage?.context_package?.chapter_target || {}
}

function relationshipGraphRiskTexts(contextPackage?: AnyRecord | null) {
  const target = contextTarget(contextPackage)
  const contracts = [
    target?.asset_linkage_contract,
    target?.assetLinkageContract,
    contextPackage?.asset_linkage_contract,
    contextPackage?.assetLinkageContract,
    contextPackage?.pre_draft_brief?.asset_linkage_contract,
    contextPackage?.preDraftBrief?.assetLinkageContract,
  ]
  const explicitRisks = contracts.flatMap(contract => stringArray(contract?.relationship_graph_risks || contract?.relationshipGraphRisks))
  const graph = contextPackage?.relationship_graph
    || contextPackage?.relationshipGraph
    || contextPackage?.setting_relationship_graph
    || contextPackage?.settingRelationshipGraph
    || contextPackage?.setting_context?.relationship_graph
    || contextPackage?.settingContext?.relationshipGraph
  const diagnosticRisks = arrayValue(graph?.diagnostics)
    .filter(item => ['isolated_key_asset', 'missing_owner', 'dangling_relation', 'owner_ability_mismatch'].includes(String(item?.type || '')))
    .map(item => {
      const name = firstNonEmpty(item?.entity_name, item?.entityName, item?.source_name, item?.sourceName, item?.target_name, item?.targetName)
      const message = firstNonEmpty(item?.message, item?.detail, item?.reason, item?.label)
      return [name, message].filter(Boolean).join('：')
    })
    .filter(Boolean)
  return Array.from(new Set([...explicitRisks, ...diagnosticRisks])).slice(0, 6)
}

function contextContractCandidates(contextPackage: AnyRecord, snakeKey: string, camelKey: string): AnyRecord[] {
  const layers = uniqueObjects([
    contextPackage,
    contextPackage.context_package,
    contextPackage.contextPackage,
  ])
  const targets = uniqueObjects(layers.flatMap(layer => [
    layer.chapter_target,
    layer.chapterTarget,
  ]))
  const preDraftBriefs = uniqueObjects([...targets, ...layers].flatMap(source => [
    source.pre_draft_brief,
    source.preDraftBrief,
  ]))
  return uniqueObjects([...targets, ...layers, ...preDraftBriefs].flatMap(source => [
    source[snakeKey],
    source[camelKey],
  ]))
}

function sourceGapTextsFromStateTracking(contract: AnyRecord = {}) {
  return [
    ...arrayValue(contract?.source_readiness),
    ...arrayValue(contract?.sourceReadiness),
  ]
    .filter(row => !['ready', 'optional', 'pass', 'ok'].includes(String(row?.status || '').toLowerCase()))
    .map(row => [firstNonEmpty(row?.label, row?.key), row?.status ? `状态=${row.status}` : '', row?.evidence]
      .filter(Boolean)
      .join('｜'))
    .map(item => text(item))
    .filter(Boolean)
}

function normalizeWritePreparationBrief(contextPackage?: AnyRecord | null): ChapterWritePreparationBrief | null {
  if (!contextPackage) return null
  const target = contextTarget(contextPackage)
  const rawCandidates = contextContractCandidates(contextPackage, 'write_preparation_brief', 'writePreparationBrief')
  const hasRaw = rawCandidates.some(raw => Object.keys(raw).length > 0)
  const stateTrackingContracts = contextContractCandidates(contextPackage, 'state_tracking_contract', 'stateTrackingContract')
  const chapterBlueprint = target?.chapter_blueprint
    || target?.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || contextPackage?.preDraftBrief?.chapterBlueprint
    || {}
  const readerRetentionBrief = target?.reader_retention_brief
    || target?.readerRetentionBrief
    || contextPackage?.reader_retention_brief
    || contextPackage?.readerRetentionBrief
    || contextPackage?.pre_draft_brief?.reader_retention_brief
    || contextPackage?.preDraftBrief?.readerRetentionBrief
    || {}
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverPlan(contextPackage, target)
  const endingContract = chapterBlueprint?.ending_contract || chapterBlueprint?.endingContract || {}
  const sourceGaps = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.source_gaps),
      ...stringArray(raw?.sourceGaps),
    ]),
    ...stateTrackingContracts.flatMap(sourceGapTextsFromStateTracking),
  ]).slice(0, 8)
  const assetRisks = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.asset_risks),
      ...stringArray(raw?.assetRisks),
    ]),
    ...relationshipGraphRiskTexts(contextPackage),
  ]).slice(0, 8)
  const deliveryRiskActions = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.delivery_risk_actions),
      ...stringArray(raw?.deliveryRiskActions),
    ]),
    ...deliveryRiskCarryOver.requiredActions,
    ...deliveryRiskCarryOver.forbiddenRepeats.map(item => `禁用重复：${item}`),
  ]).slice(0, 8)
  const blueprintFocus = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.blueprint_focus),
      ...stringArray(raw?.blueprintFocus),
    ]),
    chapterBlueprint?.opening_hook ? `开篇钩子：${text(chapterBlueprint.opening_hook)}` : '',
    chapterBlueprint?.core_payoff ? `核心回报：${text(chapterBlueprint.core_payoff)}` : '',
    chapterBlueprint?.target_emotion ? `目标情绪：${text(chapterBlueprint.target_emotion)}` : '',
    firstNonEmpty(endingContract?.next_chapter_pull, endingContract?.nextChapterPull)
      ? `章尾拉力：${firstNonEmpty(endingContract?.next_chapter_pull, endingContract?.nextChapterPull)}`
      : '',
    chapterBlueprint?.writing_intent ? `写作意图：${text(chapterBlueprint.writing_intent)}` : '',
  ]).slice(0, 8)
  const readerPayoffFocus = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.reader_payoff_focus),
      ...stringArray(raw?.readerPayoffFocus),
    ]),
    ...stringArray([
      readerRetentionBrief?.opening_hook,
      readerRetentionBrief?.hook_signal,
      readerRetentionBrief?.reader_payoff,
      readerRetentionBrief?.ending_pull,
      readerRetentionBrief?.page_turn_question,
      readerRetentionBrief?.core_question,
    ]),
    ...stringArray(readerRetentionBrief?.must_deliver || readerRetentionBrief?.mustDeliver),
  ]).slice(0, 8)
  const mustConfirm = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.must_confirm),
      ...stringArray(raw?.mustConfirm),
    ]),
    ...sourceGaps.map(item => `来源就绪：${item}`),
    ...assetRisks.map(item => `关系图风险：${item}`),
    ...deliveryRiskActions,
    ...blueprintFocus.slice(0, 2),
    ...readerPayoffFocus.slice(0, 2).map(item => `读者回报：${item}`),
  ]).slice(0, 14)
  const hasNonAssetDerivedContent = Boolean(
    sourceGaps.length
    || deliveryRiskActions.length
    || blueprintFocus.length
    || readerPayoffFocus.length
    || (hasRaw && mustConfirm.length),
  )
  const hasDerivedContent = Boolean(hasNonAssetDerivedContent || assetRisks.length)
  const executionOrder = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.execution_order),
      ...stringArray(raw?.executionOrder),
    ]),
    ...(hasRaw || hasDerivedContent
      ? [
          '先确认来源就绪：上一章承接、角色状态、伏笔/时间线和世界约束只保留会影响本章正确性的内容。',
          '再锁定章节蓝图：目标、冲突、开篇钩子、核心回报、代价和章尾拉力。',
          '再处理资产与状态：关系图风险、关键资产归属/触发/代价、角色状态变化必须接到现场功能。',
          '最后生成正文：按场景卡顺序写可见行动、对话压力、信息变化和回执证据。',
        ]
      : []),
  ]).slice(0, 4)
  if (!hasRaw && !hasDerivedContent && !executionOrder.length) return null
  const readinessStatus: ChapterWritePreparationBrief['readinessStatus'] = sourceGaps.length > 0
    ? 'needs_context'
    : 'ready'
  return {
    readinessStatus,
    sourceGaps,
    assetRisks,
    deliveryRiskActions,
    blueprintFocus,
    readerPayoffFocus,
    mustConfirm,
    executionOrder,
  }
}

function writePreparationReasonTexts(brief: ChapterWritePreparationBrief | null): string[] {
  if (!brief) return []
  return [
    ...brief.sourceGaps.map(item => `来源缺口：${item}`),
    ...brief.assetRisks.map(item => `关系图风险：${item}`),
    ...brief.deliveryRiskActions.map(item => `交稿动作：${item}`),
  ]
}

function blockerTexts(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.reason, item?.detail, item?.label)
  }).filter(Boolean)
}

function contextPackageStatus(contextPackage?: AnyRecord | null): ChapterContextPackageStatus {
  if (!contextPackage) return 'missing'
  const preflight = contextPreflight(contextPackage)
  const hasPreflight = Boolean(contextPackage.preflight || contextPackage.context_package?.preflight)
  const target = contextTarget(contextPackage)
  const blockers = blockerTexts(preflight?.blockers)
  if (
    (hasPreflight && preflight?.ready !== true)
    || preflight?.strict_ready === false
    || preflight?.strictReady === false
    || blockers.length > 0
  ) return 'insufficient'
  const hasTarget = Boolean(
    firstNonEmpty(target?.chapter_goal, target?.chapterObjective, target?.goal, target?.summary)
    && firstNonEmpty(target?.core_conflict, target?.coreConflict, target?.conflict)
    && firstNonEmpty(target?.ending_hook, target?.endingHook),
  )
  if (preflight?.ready === true || hasTarget) return 'ready'
  return 'insufficient'
}

function diagnosticsBlockers(diagnostics?: AnyRecord | null): string[] {
  const preflight = diagnostics?.preflight || {}
  return blockerTexts(preflight?.blockers)
}

function rawChapterSceneCards(chapter?: AnyRecord | null, contextPackage?: AnyRecord | null): AnyRecord[] {
  if (Array.isArray(chapter?.scene_list) && chapter.scene_list.length > 0) return chapter.scene_list
  if (Array.isArray(chapter?.scene_breakdown) && chapter.scene_breakdown.length > 0) return chapter.scene_breakdown

  const target = contextTarget(contextPackage)
  const contextCandidates = [
    target?.scene_cards,
    target?.sceneCards,
    contextPackage?.scene_cards,
    contextPackage?.sceneCards,
    contextPackage?.pre_draft_brief?.scene_cards,
    contextPackage?.pre_draft_brief?.sceneCards,
    contextPackage?.preDraftBrief?.scene_cards,
    contextPackage?.preDraftBrief?.sceneCards,
  ]
  return contextCandidates.find(candidate => Array.isArray(candidate) && candidate.length > 0) || []
}

function chapterSceneCards(chapter?: AnyRecord | null, contextPackage?: AnyRecord | null): ChapterPlanningDeskSceneCard[] {
  const rawCards = rawChapterSceneCards(chapter, contextPackage)
  return rawCards.map((scene: AnyRecord, index: number) => {
    const sceneNo = Number(scene?.scene_no)
    const card = {
      sceneNo: Number.isFinite(sceneNo) && sceneNo > 0 ? sceneNo : index + 1,
      title: text(scene?.title || scene?.name || scene?.description || scene?.purpose, `场景 ${index + 1}`),
      purpose: firstNonEmpty(scene?.purpose, scene?.description, scene?.goal),
      conflict: firstNonEmpty(scene?.conflict, scene?.tension),
      turn: firstNonEmpty(scene?.turn, scene?.reveal, scene?.beat),
      endingHook: firstNonEmpty(scene?.ending_hook, scene?.endingHook, scene?.exit_state, scene?.hook),
      requiredBeats: stringArray(scene?.required_beats || scene?.requiredBeats || scene?.beats),
      stateChangesExpected: stringArray(scene?.state_changes_expected || scene?.stateChangesExpected),
      serialRiskRepairs: stringArray(scene?.serial_risk_repairs || scene?.serialRiskRepairs || scene?.risk_repairs || scene?.riskRepairs),
      recentFatigueAction: firstNonEmpty(scene?.recent_fatigue_action, scene?.recentFatigueAction, scene?.fatigue_repair_action, scene?.fatigueRepairAction),
      characterVoice: firstNonEmpty(scene?.character_voice, scene?.characterVoice, scene?.voice_anchor, scene?.voiceAnchor),
      dialogueGoals: stringArray(scene?.dialogue_goals || scene?.dialogueGoals || scene?.dialogue_contract_goals || scene?.dialogueContractGoals),
      styleDirectives: stringArray(scene?.style_directives || scene?.styleDirectives || scene?.style_boundary_directives || scene?.styleBoundaryDirectives),
      benchmarkRecallDirectives: stringArray(scene?.benchmark_recall_directives || scene?.benchmarkRecallDirectives || scene?.benchmark_directives || scene?.benchmarkDirectives),
      conceptAnchorRules: stringArray(scene?.concept_anchor_rules || scene?.conceptAnchorRules || scene?.new_concept_anchor_rules || scene?.newConceptAnchorRules),
      proseCraftDirectives: stringArray(scene?.prose_craft_directives || scene?.proseCraftDirectives || scene?.prose_craft_rules || scene?.proseCraftRules),
    }
    return card
  }).filter(card => Boolean(card.purpose || card.conflict || card.turn || card.endingHook))
}

function qualityContinuityStage(action: string, index: number, total: number): ChapterQualityContinuitySceneMapItem['stage'] {
  if (/开篇|前\s*300|前300|首场|第一场/.test(action)) return 'opening'
  if (/章末|最后|尾声|结尾|追读|ending/.test(action)) return 'ending'
  if (index === 0) return 'opening'
  if (index === total - 1) return 'ending'
  return 'middle'
}

function buildQualityContinuitySceneMap(sceneCards: ChapterPlanningDeskSceneCard[]): ChapterQualityContinuitySceneMapItem[] {
  return sceneCards.flatMap((scene, index) => {
    const riskTags = scene.serialRiskRepairs.filter(item => /delivery_risk_carry_over|质量续航|next_chapter_quality_plan|续航|dialogue_checks|dialogue_contract|对白|对话|声线|科普嘴|benchmark_recall|style_boundary|prose_craft|concept_anchor|文风|风格|文风指纹|文风召回|style_drift|正文工艺|新概念|新名词|新设定|首次出现|作用锚点/.test(item))
    const forbiddenRepeats = scene.serialRiskRepairs.filter(item => !riskTags.includes(item))
    const actions = Array.from(new Set([
      scene.recentFatigueAction,
      scene.characterVoice,
      ...scene.requiredBeats,
      ...scene.stateChangesExpected,
      ...scene.dialogueGoals,
      ...scene.styleDirectives,
      ...scene.benchmarkRecallDirectives,
      ...scene.conceptAnchorRules,
      ...scene.proseCraftDirectives,
      scene.endingHook,
    ].map(item => text(item)).filter(Boolean)))
    const hasQualityContinuity = riskTags.length > 0 || actions.some(item => /质量续航|delivery_risk_carry_over|前\s*300|前300|中段|章末|追读|禁用重复|对白|对话|声线|科普嘴|潜台词|文风|风格|文风指纹|文风召回|逗号结巴|句长|benchmark_recall|style_boundary|prose_craft|concept_anchor|正文工艺|新概念|新名词|新设定|首次出现|动作反应|对话半句|物理后果|作用锚点|整段来历|等级解释/.test(item))
    if (!hasQualityContinuity || actions.length === 0) return []
    const action = actions.find(item => !/delivery_risk_carry_over|质量续航/.test(item)) || actions[0]
    return [{
      sceneNo: scene.sceneNo,
      title: scene.title,
      stage: qualityContinuityStage(action, index, sceneCards.length),
      action,
      riskTags,
      forbiddenRepeats,
    }]
  }).slice(0, 8)
}

function deliveryRiskCarryOverNeedsSceneMapping(deliveryRiskCarryOver: ChapterPlanningDeskModel['episodePlan']['deliveryRiskCarryOver']) {
  return Boolean(
    deliveryRiskCarryOver.requiredActions.length
    || deliveryRiskCarryOver.openingActions.length
    || deliveryRiskCarryOver.middleActions.length
    || deliveryRiskCarryOver.endingActions.length
    || deliveryRiskCarryOver.forbiddenRepeats.length,
  )
}

const QUALITY_PASS_THRESHOLD = 78
type ReviewRef = { review: AnyRecord; index: number }

function parseReviewPayload(review: AnyRecord): AnyRecord | null {
  const field = review?.payload ? 'payload' : 'raw_payload'
  const value = review?.[field]
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  const parsed = parseWorkspacePayload(value, { owner: review, kind: 'review', field })
  return parsed && typeof parsed === 'object' ? parsed : null
}

export async function selectTargetChapterForWriting(args: {
  targetChapterId?: number | null
  activeChapterId?: any
  selectChapterForWriting: (chapterId: number) => Promise<boolean>
}) {
  const targetChapterId = Number(args.targetChapterId || 0)
  if (!targetChapterId) return true
  if (Number(args.activeChapterId) === targetChapterId) return true
  return args.selectChapterForWriting(targetChapterId)
}

export function resolveEditorRevisionChapterId(report: AnyRecord | null | undefined, activeChapterId?: any, targetChapterId?: any) {
  const payload = parseReviewPayload(report || {}) || {}
  const candidates = [
    payload?.chapter_id,
    payload?.chapterId,
    payload?.chapter?.id,
    report?.chapter_id,
    report?.chapterId,
    targetChapterId,
    activeChapterId,
  ]
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) return candidate
  }
  return undefined
}

function reviewPayload(review: AnyRecord): AnyRecord {
  return parseReviewPayload(review) || {}
}

function reviewChapterId(review: AnyRecord) {
  const payload = parseReviewPayload(review)
  if (!payload) return null
  return firstNonEmpty(
    payload?.chapter_id,
    payload?.chapterId,
    payload?.chapter?.id,
  )
}

function reviewBelongsToChapter(review: AnyRecord, chapter?: AnyRecord | null) {
  if (!chapter) return false
  const reviewId = text(reviewChapterId(review))
  const chapterId = text(chapter?.id)
  return Boolean(reviewId && chapterId && reviewId === chapterId)
}

function reviewType(review: AnyRecord) {
  return text(review?.review_type || review?.type || review?.kind).toLowerCase()
}

function parsedTime(value: any) {
  const normalized = text(value)
  if (!normalized) return null
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function createdTime(review: AnyRecord) {
  return parsedTime(review?.created_at) ?? parsedTime(review?.updated_at)
}

function compareReviewRefs(left: ReviewRef, right: ReviewRef) {
  const leftTime = createdTime(left.review)
  const rightTime = createdTime(right.review)
  if (leftTime !== null || rightTime !== null) {
    const leftOrder = leftTime ?? Number.NEGATIVE_INFINITY
    const rightOrder = rightTime ?? Number.NEGATIVE_INFINITY
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
  }
  return left.index - right.index
}

function latestReviewRef(reviews: AnyRecord[], chapter: AnyRecord | null, type: string): ReviewRef | null {
  const matches = reviews
    .map((review, index) => ({ review, index }))
    .filter(item => reviewBelongsToChapter(item.review, chapter) && reviewType(item.review) === type)
  if (!matches.length) return null
  matches.sort((a, b) => compareReviewRefs(b, a))
  return matches[0]
}

function qualityPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.self_check?.review || payload?.review || payload?.quality || payload?.result || {}
}

function buildDeslopGateDiagnosticsSummary(quality: AnyRecord): ChapterAcceptanceDeskModel['deslopGateDiagnostics'] {
  const raw = quality?.deslop_gate_diagnostics || quality?.deslopGateDiagnostics
  const gates = arrayValue(raw?.gates)
    .map((gate: AnyRecord) => {
      const gateKey = text(gate?.gate)
      const label = text(gate?.label)
      const status = text(gate?.status, 'pass')
      const countValue = Number(gate?.count ?? gate?.hit_count ?? gate?.hitCount ?? 0)
      return {
        gate: gateKey,
        label,
        status,
        count: Number.isFinite(countValue) ? countValue : 0,
        patterns: stringArray(gate?.patterns),
        evidence: stringArray(gate?.evidence),
        fix: text(gate?.fix),
      }
    })
    .filter(gate => gate.gate || gate.label)

  if (!raw || gates.length === 0) return null
  const totalValue = Number(raw?.total ?? gates.reduce((sum, gate) => sum + gate.count, 0))
  const concernValue = Number(raw?.concern_gate_count ?? raw?.concernGateCount ?? gates.filter(gate => gate.status !== 'pass' && gate.status !== 'ok').length)
  return {
    version: text(raw?.version, 'oh_story_deslop_gate_diagnostics_v1'),
    total: Number.isFinite(totalValue) ? totalValue : 0,
    concernGateCount: Number.isFinite(concernValue) ? concernValue : 0,
    summary: text(raw?.summary, concernValue > 0 ? `A-G 门禁 ${concernValue} 项需处理` : 'A-G 门禁已通过'),
    gates,
  }
}

function qualityReviewFinalText(payload: AnyRecord) {
  const candidates = [
    payload?.self_check?.final_text,
    payload?.final_text,
    payload?.chapter_text,
  ]
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) return String(candidate)
  }
  return null
}

function proseQualityReviewMatchesCurrentChapter(review: AnyRecord | null, chapter: AnyRecord | null) {
  if (!review || !chapter) return false
  const payload = reviewPayload(review)
  const reviewChapterUpdatedAt = text(payload?.chapter_updated_at)
  const currentChapterUpdatedAt = text(chapter?.updated_at)
  let hasPositiveFreshnessSignal = false
  if (reviewChapterUpdatedAt && currentChapterUpdatedAt) {
    if (reviewChapterUpdatedAt !== currentChapterUpdatedAt) return false
    hasPositiveFreshnessSignal = true
  }

  const reviewedFinalText = qualityReviewFinalText(payload)
  if (reviewedFinalText !== null && reviewedFinalText.trim() !== String(chapter?.chapter_text ?? '').trim()) {
    return false
  }
  if (reviewedFinalText !== null) hasPositiveFreshnessSignal = true

  return hasPositiveFreshnessSignal
}

function reportPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.report || payload?.editor_report || payload?.result || {}
}

function revisionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.revision || payload?.result || payload
}

function storylineSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.storyline_sync || payload?.result?.storyline_sync || payload?.result || payload
}

function countArray(value: any) {
  return Array.isArray(value) ? value.length : 0
}

function buildStorylineSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storylineSync'] {
  if (!review) return null
  const payload = storylineSyncPayload(review)
  const completedCount = countArray(payload?.completed)
  const missedCount = countArray(payload?.missed)
  const unplannedCount = countArray(payload?.unplanned)
  const forbiddenCount = countArray(payload?.forbidden_touched)
  const hasRisk = missedCount > 0 || unplannedCount > 0 || forbiddenCount > 0 || payload?.status === 'warn'
  const riskParts = [
    missedCount > 0 ? `漏推 ${missedCount}` : '',
    unplannedCount > 0 ? `额外推进 ${unplannedCount}` : '',
    forbiddenCount > 0 ? `禁揭风险 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    status: hasRisk ? 'warn' : 'ok',
    label: hasRisk ? (riskParts.join(' · ') || '剧情线需复盘') : '剧情线 OK',
    completedCount,
    missedCount,
    unplannedCount,
    forbiddenCount,
  }
}

function storyUnitSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.story_unit_sync || payload?.result?.story_unit_sync || payload?.result || payload
}

function buildStoryUnitSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storyUnitSync'] {
  if (!review) return null
  const payload = storyUnitSyncPayload(review)
  const missedCount = Number(payload?.missed_count ?? countArray(payload?.missed))
  const rushedCount = Number(payload?.rushed_count ?? countArray(payload?.rushed_ahead))
  const forbiddenCount = Number(payload?.forbidden_count ?? countArray(payload?.forbidden_touched))
  const safeMissedCount = Number.isFinite(missedCount) ? missedCount : 0
  const safeRushedCount = Number.isFinite(rushedCount) ? rushedCount : 0
  const safeForbiddenCount = Number.isFinite(forbiddenCount) ? forbiddenCount : 0
  const riskCount = safeMissedCount + safeRushedCount + safeForbiddenCount
  const scoreValue = Number(payload?.score)
  const score = Number.isFinite(scoreValue) ? scoreValue : null
  const hasRisk = riskCount > 0 || payload?.status === 'warn' || review?.status === 'warn'
  const riskParts = [
    safeMissedCount > 0 ? `单元漏写 ${safeMissedCount}` : '',
    safeRushedCount > 0 ? `单元抢跑 ${safeRushedCount}` : '',
    safeForbiddenCount > 0 ? `禁抢跑 ${safeForbiddenCount}` : '',
  ].filter(Boolean)

  return {
    status: hasRisk ? 'warn' : 'ok',
    label: hasRisk ? (riskParts.join(' · ') || text(payload?.label) || '剧情单元需复盘') : '剧情单元 OK',
    score,
    scoreLabel: score === null ? '单元兑现 -' : `单元兑现 ${score}`,
    missedCount: safeMissedCount,
    rushedCount: safeRushedCount,
    forbiddenCount: safeForbiddenCount,
    riskCount,
  }
}

function assetIntakePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.asset_intake || payload?.result?.asset_intake || payload?.result || payload
}

function buildAssetIntakeSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['assetIntake'] {
  if (!review) return null
  const payload = assetIntakePayload(review)
  const discoveredAssets = Array.isArray(payload?.discovered_assets) ? payload.discovered_assets : []
  const appliedNames = new Set(
    Array.isArray(payload?.applied_asset_names)
      ? payload.applied_asset_names.map((item: any) => String(item || '').trim()).filter(Boolean)
      : [],
  )
  const pendingCount = discoveredAssets.filter((item: any) => !appliedNames.has(String(item?.name || '').trim())).length
  if (pendingCount <= 0) return {
    status: 'applied',
    label: '新资产已确认',
    pendingCount: 0,
  }
  return {
    status: 'pending',
    label: `新资产 ${pendingCount} 待确认`,
    pendingCount,
  }
}

function ipSceneIntakePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
}

function buildIpSceneIntakeSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['ipSceneIntake'] {
  if (!review) return null
  const payload = ipSceneIntakePayload(review)
  const candidates = Array.isArray(payload?.ip_scene_candidates) ? payload.ip_scene_candidates : []
  const candidateCount = candidates.length
  if (candidateCount <= 0) return null
  return {
    status: 'ready',
    label: `IP场面 ${candidateCount}`,
    candidateCount,
    candidates: candidates.slice(0, 5).map((item: AnyRecord) => ({
      title: text(item?.title || item?.name, '未命名强场面'),
      summary: text(item?.summary || item?.description),
      visualHook: text(item?.visual_hook || item?.visualHook || item?.visual),
      adaptationValue: text(item?.adaptation_value || item?.adaptationValue || item?.ip_value),
      spreadPoint: text(item?.spread_point || item?.spreadPoint || item?.comment_point),
    })),
  }
}

function signatureSceneSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.signature_scene_sync || payload?.result?.signature_scene_sync || payload?.result || payload
}

function buildSignatureSceneSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['signatureSceneSync'] {
  if (!review) return null
  const payload = signatureSceneSyncPayload(review)
  const plannedCountValue = Number(payload?.planned_count ?? payload?.plannedCount)
  const plannedCount = Number.isFinite(plannedCountValue) ? plannedCountValue : countArray(payload?.planned)
  if (plannedCount <= 0) return null
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const missedCountValue = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(missedCountValue) ? missedCountValue : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '强场面 OK' : text(payload?.label) || `强场面漏写 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '强场面兑现 -' : `强场面兑现 ${safeScore}`,
    missedCount,
    plannedCount,
  }
}

function readabilityPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.readability_review || payload?.result?.readability_review || payload?.result || payload
}

function buildReadabilityReviewSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readabilityReview'] {
  if (!review) return null
  const payload = readabilityPayload(review)
  const scoreValue = payload?.readability_score ?? payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const openingScoreValue = payload?.opening_hook_score ?? payload?.openingHookScore
  const openingScore = openingScoreValue === null || openingScoreValue === undefined || openingScoreValue === '' ? null : Number(openingScoreValue)
  const safeOpeningScore = Number.isFinite(openingScore) ? openingScore : null
  const openingHookRisk = safeOpeningScore !== null && safeOpeningScore > 0 && safeOpeningScore < 70
  const endingScoreValue = payload?.ending_hook_score ?? payload?.endingHookScore
  const endingScore = endingScoreValue === null || endingScoreValue === undefined || endingScoreValue === '' ? null : Number(endingScoreValue)
  const safeEndingScore = Number.isFinite(endingScore) ? endingScore : null
  const endingHookRisk = safeEndingScore !== null && safeEndingScore > 0 && safeEndingScore < 70
  const sceneScoreValue = payload?.scene_readability_score ?? payload?.sceneReadabilityScore
  const sceneScore = sceneScoreValue === null || sceneScoreValue === undefined || sceneScoreValue === '' ? null : Number(sceneScoreValue)
  const safeSceneScore = Number.isFinite(sceneScore) ? sceneScore : null
  const sceneReadabilityRisk = safeSceneScore !== null && safeSceneScore > 0 && safeSceneScore < 70
  const payoffScoreValue = payload?.payoff_density_score ?? payload?.payoffDensityScore
  const payoffScore = payoffScoreValue === null || payoffScoreValue === undefined || payoffScoreValue === '' ? null : Number(payoffScoreValue)
  const safePayoffScore = Number.isFinite(payoffScore) ? payoffScore : null
  const payoffDensityRisk = safePayoffScore !== null && safePayoffScore > 0 && safePayoffScore < 70
  const memeSense = payload?.meme_sense || {}
  const aiSmell = payload?.ai_smell || payload?.aiSmell || {}
  const aiSmellLevel = firstNonEmpty(aiSmell?.level, payload?.ai_smell_level, payload?.aiSmellLevel)
  const aiSmellHitCount = arrayValue(aiSmell?.pattern_hits || aiSmell?.patternHits).length
  const aiSmellTactics = arrayValue(aiSmell?.rewrite_tactics || aiSmell?.rewriteTactics)
    .map(item => text(item))
    .filter(Boolean)
  const aiSmellRisk = Boolean(aiSmellLevel && !['无', 'none', '低', 'clean'].includes(aiSmellLevel.toLowerCase?.() || aiSmellLevel)) || aiSmellHitCount > 0
  const aiSmellLabel = aiSmellRisk ? `AI味${aiSmellLevel || '待降'} ${aiSmellHitCount}` : 'AI味 0'
  const immersionRiskCount = Array.isArray(memeSense?.immersion_risks)
    ? memeSense.immersion_risks.length
    : countArray(payload?.immersion_risks)
  const riskCount = immersionRiskCount
    + (openingHookRisk ? 1 : 0)
    + (endingHookRisk ? 1 : 0)
    + (sceneReadabilityRisk ? 1 : 0)
    + (payoffDensityRisk ? 1 : 0)
    + (aiSmellRisk ? Math.max(1, aiSmellHitCount) : 0)
  const intensity = firstNonEmpty(memeSense?.intensity, payload?.meme_intensity, '')

  return {
    score: safeScore,
    scoreLabel: safeScore === null ? '可读性 -' : `可读性 ${safeScore}`,
    openingHookScore: safeOpeningScore,
    openingHookLabel: safeOpeningScore === null ? '开篇吸引力 -' : `开篇吸引力 ${safeOpeningScore}`,
    openingHookRisk,
    endingHookScore: safeEndingScore,
    endingHookLabel: safeEndingScore === null ? '章末翻页 -' : `章末翻页 ${safeEndingScore}`,
    endingHookRisk,
    sceneReadabilityScore: safeSceneScore,
    sceneReadabilityLabel: safeSceneScore === null ? '场景推进 -' : `场景推进 ${safeSceneScore}`,
    sceneReadabilityRisk,
    payoffDensityScore: safePayoffScore,
    payoffDensityLabel: safePayoffScore === null ? '爽点密度 -' : `爽点密度 ${safePayoffScore}`,
    payoffDensityRisk,
    aiSmellLabel,
    aiSmellRisk,
    aiSmellHitCount,
    aiSmellTactics,
    memeLabel: intensity ? `网感${intensity}` : '网感未评',
    riskLabel: openingHookRisk
      ? `开篇吸引力弱 ${safeOpeningScore}`
      : endingHookRisk
        ? `章末翻页弱 ${safeEndingScore}`
        : sceneReadabilityRisk
          ? `场景推进弱 ${safeSceneScore}`
          : payoffDensityRisk
            ? `爽点密度弱 ${safePayoffScore}`
            : aiSmellRisk
              ? aiSmellLabel
        : immersionRiskCount > 0 ? `出戏风险 ${immersionRiskCount}` : '出戏风险 0',
    riskCount,
  }
}

function coreDriftPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.core_drift || payload?.result?.core_drift || payload?.result || payload
}

function buildCoreDriftSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['coreDrift'] {
  if (!review) return null
  const payload = coreDriftPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const riskCount = Array.isArray(payload?.drift_risks)
    ? payload.drift_risks.length
    : countArray(payload?.risks)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && riskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '核心 OK' : `核心偏移 ${riskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '核心守恒 -' : `核心守恒 ${safeScore}`,
    riskCount,
  }
}

function runwaySyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.runway_sync || payload?.result?.runway_sync || payload?.result || payload
}

function buildRunwaySyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['runwaySync'] {
  if (!review) return null
  const payload = runwaySyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadRiskCount = Number(payload?.risk_count ?? payload?.riskCount)
  const riskCount = Number.isFinite(payloadRiskCount)
    ? payloadRiskCount
    : countArray(payload?.four_question_missed) + countArray(payload?.reader_fuel_missed) + countArray(payload?.redline_touched)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && riskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '航线 OK' : text(payload?.label) || `航线风险 ${riskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '航线兑现 -' : `航线兑现 ${safeScore}`,
    riskCount,
  }
}

function readerPayoffSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_payoff_sync || payload?.result?.reader_payoff_sync || payload?.result || payload
}

function buildReaderPayoffSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerPayoffSync'] {
  if (!review) return null
  const payload = readerPayoffSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadDebtCount = Number(payload?.debt_count ?? payload?.debtCount)
  const debtCount = Number.isFinite(payloadDebtCount) ? payloadDebtCount : countArray(payload?.missed) + countArray(payload?.debts)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && debtCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '回报 OK' : text(payload?.label) || `回报欠账 ${debtCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '回报兑现 -' : `回报兑现 ${safeScore}`,
    debtCount,
  }
}

function readerExpectationSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_expectation_sync || payload?.result?.reader_expectation_sync || payload?.result || payload
}

function isOpeningHandoffMiss(value: any) {
  const searchable = [
    value?.key,
    value?.type,
    value?.label,
    value?.name,
    value?.category,
    value?.match_scope,
    value?.scope,
  ].map(item => text(item).toLowerCase()).join(' ')
  return searchable.includes('opening_handoff')
    || searchable.includes('previous_handoff')
    || searchable.includes('上一章承接')
    || (searchable.includes('handoff') && searchable.includes('opening'))
}

function buildReaderExpectationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerExpectationSync'] {
  if (!review) return null
  const payload = readerExpectationSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const openingHandoffMissedCount = arrayValue(payload?.missed).filter(isOpeningHandoffMiss).length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok'
      ? '期待 OK'
      : openingHandoffMissedCount > 0
        ? `开篇承接漏写 ${openingHandoffMissedCount}`
        : text(payload?.label) || `期待欠账 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '期待兑现 -' : `期待兑现 ${safeScore}`,
    missedCount,
    openingHandoffMissedCount,
  }
}

function qualityAuditSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.quality_audit_sync || payload?.result?.quality_audit_sync || payload?.result || payload
}

function qualityAuditSyncEvidence(value: any) {
  const label = text(value?.label || value?.name || value?.key)
  const detail = firstNonEmpty(value?.text, value?.evidence, value?.message, value?.summary, value?.detail)
  if (label && detail) return `${label}：${detail}`
  return firstNonEmpty(
    detail,
    label,
  )
}

function buildQualityAuditSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAuditSync'] {
  if (!review) return null
  const payload = qualityAuditSyncPayload(review)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '诊断承接 OK' : text(payload?.label) || `诊断承接缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

function chapterHandoffSyncPayload(review: AnyRecord | null | undefined, snakeKey: string, camelKey: string) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.[snakeKey]
    || payload?.[camelKey]
    || payload?.result?.[snakeKey]
    || payload?.result?.[camelKey]
    || payload?.result
    || payload
}

function buildChapterHandoffSyncSummary(
  review: AnyRecord | null | undefined,
  snakeKey: string,
  camelKey: string,
  okLabel: string,
  fallbackPrefix: string,
): ChapterAcceptanceDeskModel['chapterHandoffSync'] {
  if (!review) return null
  const payload = chapterHandoffSyncPayload(review, snakeKey, camelKey)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? okLabel : text(payload?.label) || `${fallbackPrefix} ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

function qualityAuditRepairReceiptSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.quality_audit_repair_receipt_sync
    || payload?.qualityAuditRepairReceiptSync
    || payload?.result?.quality_audit_repair_receipt_sync
    || payload?.result?.qualityAuditRepairReceiptSync
    || payload?.result
    || payload
}

function buildQualityAuditRepairReceiptSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAuditRepairReceiptSync'] {
  if (!review) return null
  const payload = qualityAuditRepairReceiptSyncPayload(review)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const payloadReceiptCount = Number(payload?.receipt_count ?? payload?.receiptCount)
  const receiptCount = Number.isFinite(payloadReceiptCount) ? payloadReceiptCount : countArray(payload?.completed) + missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '质量修复回执 OK' : text(payload?.label) || `质量诊断修复回执缺口 ${missedCount}`,
    missedCount,
    receiptCount,
    evidence,
    nextActions,
  }
}

function contractSyncPayload(review: AnyRecord | null | undefined, snakeKey: string, camelKey: string) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.[snakeKey]
    || payload?.[camelKey]
    || payload?.result?.[snakeKey]
    || payload?.result?.[camelKey]
    || payload?.result
    || payload
}

function preDraftExecutionReceiptSections(payload?: AnyRecord | null) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const receiptSources = uniqueObjects([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(payload),
  ])
  return uniqueObjects([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    payload?.pre_draft_execution_receipts || payload?.preDraftExecutionReceipts,
    ...receiptSources.map(source => source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts),
  ])
}

function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = text(value?.status).toLowerCase()
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)) return true
  if (value?.delivered === false) return true
  return Boolean(firstNonEmpty(value?.remaining_risk, value?.remainingRisk))
}

function buildPreDraftExecutionSyncSummary(
  payload: AnyRecord | null,
  snakeKey: string,
  camelKey: string,
  label: string,
): ChapterAcceptanceDeskModel['intentConfirmationSync'] {
  const sections = preDraftExecutionReceiptSections(payload)
  const checks = sections.flatMap(section => arrayValue(section?.[snakeKey] || section?.[camelKey]))
  const missed = checks.filter(preDraftExecutionCheckNeedsRepair)
  if (checks.length <= 0 && missed.length <= 0) return null
  const missedCount = missed.length
  const evidence = missed
    .map(item => firstNonEmpty(item?.remaining_risk, item?.remainingRisk, item?.evidence, item?.issue, item?.reason, item?.description, item?.label, item?.key))
    .filter(Boolean)
    .slice(0, 5)
  const nextActions = missed
    .map(item => firstNonEmpty(item?.fix, item?.repair_instruction, item?.repairInstruction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
    .filter(Boolean)
    .slice(0, 4)
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence,
    nextActions,
  }
}

function mergeContractSyncSummary(
  explicitSummary: ChapterAcceptanceDeskModel['intentConfirmationSync'],
  receiptSummary: ChapterAcceptanceDeskModel['intentConfirmationSync'],
  label: string,
) {
  if (!explicitSummary) return receiptSummary
  if (!receiptSummary) return explicitSummary
  const missedCount = explicitSummary.missedCount + receiptSummary.missedCount
  return {
    status: missedCount > 0 ? 'warn' as const : 'ok' as const,
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence: uniqueStrings([...explicitSummary.evidence, ...receiptSummary.evidence]).slice(0, 5),
    nextActions: uniqueStrings([...explicitSummary.nextActions, ...receiptSummary.nextActions]).slice(0, 4),
  }
}

function qualityCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true', 'yes'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error', 'false', 'no', '0'].includes(status)) return true
  if (value?.ready === false || value?.passed === false || value?.delivered === false || value?.ok === false) return true
  if (value?.ready === true || value?.passed === true || value?.delivered === true || value?.ok === true) return false
  return Boolean(firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.fix, value?.evidence))
}

function buildQualityCheckSummary(
  payload: AnyRecord | null,
  snakeKey: string,
  camelKey: string,
  label: string,
): ChapterAcceptanceDeskModel['sourceReadiness'] {
  if (!payload) return null
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.[snakeKey] || review?.[camelKey]),
    ...arrayValue(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...arrayValue(payload?.[snakeKey] || payload?.[camelKey]),
  ]
  if (checks.length <= 0) return null

  const missed = checks.filter(qualityCheckNeedsRepair)
  const missedCount = missed.length
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence: missed
      .map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, item?.remaining_risk, item?.remainingRisk, item?.label, item?.key))
      .filter(Boolean)
      .slice(0, 5),
    nextActions: missed
      .map(item => firstNonEmpty(item?.fix, item?.action, item?.required_action, item?.requiredAction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
      .filter(Boolean)
      .slice(0, 4),
  }
}

function sceneCardDirectiveCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.type,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.remaining_risk,
    value?.remainingRisk,
    value?.required_action,
    value?.requiredAction,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

function sceneCardDirectiveCheckMatches(value: any) {
  const valueText = sceneCardDirectiveCheckText(value)
  return /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(valueText)
    || /场景卡(执行|禁令)/.test(valueText)
}

function buildSceneCardDirectiveSummary(payload: AnyRecord | null): ChapterAcceptanceDeskModel['proseCraft'] {
  if (!payload) return null
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.prose_craft_checks || review?.proseCraftChecks),
    ...arrayValue(selfCheck?.prose_craft_checks || selfCheck?.proseCraftChecks),
    ...arrayValue(payload?.prose_craft_checks || payload?.proseCraftChecks),
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(sceneCardDirectiveCheckMatches)

  const missed = checks.filter(qualityCheckNeedsRepair)
  const missedCount = missed.length
  if (missedCount <= 0) return null

  return {
    status: 'warn',
    label: `场景卡执行缺口 ${missedCount}`,
    missedCount,
    evidence: missed
      .map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, item?.remaining_risk, item?.remainingRisk, sceneCardDirectiveCheckText(item)))
      .filter(Boolean)
      .slice(0, 5),
    nextActions: missed
      .map(item => firstNonEmpty(item?.fix, item?.action, item?.required_action, item?.requiredAction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
      .filter(Boolean)
      .slice(0, 4),
  }
}

function buildIntentConfirmationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['intentConfirmationSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'intent_confirmation_sync', 'intentConfirmationSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '意图确认 OK' : text(payload?.label) || `意图确认缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

function buildBenchmarkRecallSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['benchmarkRecallSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'benchmark_recall_sync', 'benchmarkRecallSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '文风召回 OK' : text(payload?.label) || `文风召回缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

function readerRetentionSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_retention_sync || payload?.result?.reader_retention_sync || payload?.result || payload
}

function buildReaderRetentionSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerRetentionSync'] {
  if (!review) return null
  const payload = readerRetentionSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '追读 OK' : text(payload?.label) || `漏追读 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '追读兑现 -' : `追读兑现 ${safeScore}`,
    missedCount,
  }
}

function chapterAttractionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.chapter_attraction_review || payload?.result?.chapter_attraction_review || payload?.result || payload
}

function buildChapterAttractionSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['chapterAttraction'] {
  if (!review) return null
  const payload = chapterAttractionPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadWeakCount = Number(payload?.weak_count ?? payload?.weakCount)
  const weakCount = Number.isFinite(payloadWeakCount)
    ? payloadWeakCount
    : countArray(payload?.weak_dimensions || payload?.weakDimensions || payload?.dimensions)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && weakCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '吸引力 OK' : text(payload?.label) || `吸引力缺口 ${weakCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '吸引力 -' : `吸引力 ${safeScore}`,
    weakCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '吸引力稳定' : '优先修吸引力'),
  }
}

function storyDriveSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.story_drive_sync || payload?.result?.story_drive_sync || payload?.result || payload
}

function buildStoryDriveSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storyDriveSync'] {
  if (!review) return null
  const payload = storyDriveSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '故事力 OK' : text(payload?.label) || `故事力缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '故事力 -' : `故事力 ${safeScore}`,
    missedCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '故事力稳定' : '优先补故事力'),
  }
}

function characterArcSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.character_arc_sync || payload?.result?.character_arc_sync || payload?.result || payload
}

function buildCharacterArcSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['characterArcSync'] {
  if (!review) return null
  const payload = characterArcSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '人物弧光 OK' : text(payload?.label) || `人物弧光缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '人物弧光 -' : `人物弧光 ${safeScore}`,
    missedCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '人物弧光稳定' : '优先补人物弧光'),
  }
}

function chapterBenchmarkSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.chapter_benchmark_sync || payload?.result?.chapter_benchmark_sync || payload?.result || payload
}

function buildChapterBenchmarkSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['chapterBenchmarkSync'] {
  if (!review) return null
  const payload = chapterBenchmarkSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '基准 OK' : text(payload?.label) || `基准缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '质量基准 -' : `质量基准 ${safeScore}`,
    missedCount,
  }
}

function styleSampleSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.style_sample_sync || payload?.result?.style_sample_sync || payload?.result || payload
}

function buildStyleSampleSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['styleSampleSync'] {
  if (!review) return null
  const payload = styleSampleSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const payloadCopyRiskCount = Number(payload?.copy_risk_count ?? payload?.copyRiskCount)
  const copyRiskCount = Number.isFinite(payloadCopyRiskCount) ? payloadCopyRiskCount : countArray(payload?.copied_phrases || payload?.copiedPhrases)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 && copyRiskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '风格 OK' : text(payload?.label) || `风格缺口 ${missedCount + copyRiskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '风格 -' : `风格 ${safeScore}`,
    missedCount,
    copyRiskCount,
  }
}

function latestFirst30RetentionReview(reviews: AnyRecord[]) {
  const matches = reviews.filter(review => reviewType(review) === 'first30_retention_diagnosis')
  if (!matches.length) return null
  return matches.sort((a, b) => (createdTime(b) ?? 0) - (createdTime(a) ?? 0))[0]
}

function buildFirst30RetentionRecheckSummary(chapter: AnyRecord | null, reviews: AnyRecord[]): ChapterAcceptanceDeskModel['first30RetentionRecheck'] {
  const chapterNo = Number(chapter?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = latestFirst30RetentionReview(reviews)
  if (!review) return null
  const reportTime = createdTime(review)
  const chapterTime = parsedTime(chapter?.updated_at || chapter?.modified_at)
  if (!reportTime || !chapterTime || chapterTime <= reportTime) return null
  return {
    status: 'stale',
    label: '留存需复诊',
    reason: `第${chapterNo}章已在前30章诊断后更新，建议重跑留存曲线。`,
  }
}

function innovationSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.innovation_sync || payload?.result?.innovation_sync || payload?.result || payload
}

function buildInnovationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['innovationSync'] {
  if (!review) return null
  const payload = innovationSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '创新 OK' : text(payload?.label) || `创新缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '创新兑现 -' : `创新兑现 ${safeScore}`,
    missedCount,
  }
}

function volumeBeatSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.volume_beat_sync || payload?.result?.volume_beat_sync || payload?.result || payload
}

function buildVolumeBeatSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['volumeBeatSync'] {
  if (!review) return null
  const payload = volumeBeatSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '爆点 OK' : text(payload?.label) || `爆点漏兑现 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '爆点兑现 -' : `爆点兑现 ${safeScore}`,
    missedCount,
  }
}

function buildDeliveryRiskQueue(args: {
  mustFix: string[]
  storylineSync: ChapterAcceptanceDeskModel['storylineSync']
  storyUnitSync: ChapterAcceptanceDeskModel['storyUnitSync']
  signatureSceneSync: ChapterAcceptanceDeskModel['signatureSceneSync']
  readabilityReview: ChapterAcceptanceDeskModel['readabilityReview']
  coreDrift: ChapterAcceptanceDeskModel['coreDrift']
  runwaySync: ChapterAcceptanceDeskModel['runwaySync']
  readerPayoffSync: ChapterAcceptanceDeskModel['readerPayoffSync']
  readerExpectationSync: ChapterAcceptanceDeskModel['readerExpectationSync']
  qualityAuditSync: ChapterAcceptanceDeskModel['qualityAuditSync']
  qualityAuditRepairReceiptSync: ChapterAcceptanceDeskModel['qualityAuditRepairReceiptSync']
  chapterHandoffSync: ChapterAcceptanceDeskModel['chapterHandoffSync']
  chapterHandoffDeltaSync: ChapterAcceptanceDeskModel['chapterHandoffDeltaSync']
  writePreparation: ChapterAcceptanceDeskModel['writePreparation']
  intentConfirmationSync: ChapterAcceptanceDeskModel['intentConfirmationSync']
  benchmarkRecallSync: ChapterAcceptanceDeskModel['benchmarkRecallSync']
  sourceReadiness: ChapterAcceptanceDeskModel['sourceReadiness']
  stateTracking: ChapterAcceptanceDeskModel['stateTracking']
  styleBoundary: ChapterAcceptanceDeskModel['styleBoundary']
  informationFlow: ChapterAcceptanceDeskModel['informationFlow']
  expectationThreshold: ChapterAcceptanceDeskModel['expectationThreshold']
  storyLoop: ChapterAcceptanceDeskModel['storyLoop']
  emotionalArc: ChapterAcceptanceDeskModel['emotionalArc']
  chapterHook: ChapterAcceptanceDeskModel['chapterHook']
  paragraphHook: ChapterAcceptanceDeskModel['paragraphHook']
  suspense: ChapterAcceptanceDeskModel['suspense']
  assetLinkage: ChapterAcceptanceDeskModel['assetLinkage']
  dialogue: ChapterAcceptanceDeskModel['dialogue']
  plotDynamics: ChapterAcceptanceDeskModel['plotDynamics']
  characterRelation: ChapterAcceptanceDeskModel['characterRelation']
  characterBehavior: ChapterAcceptanceDeskModel['characterBehavior']
  conflictStructure: ChapterAcceptanceDeskModel['conflictStructure']
  bridgeUnit: ChapterAcceptanceDeskModel['bridgeUnit']
  reversal: ChapterAcceptanceDeskModel['reversal']
  showdown: ChapterAcceptanceDeskModel['showdown']
  opening: ChapterAcceptanceDeskModel['opening']
  proseCraft: ChapterAcceptanceDeskModel['proseCraft']
  sceneCardDirective: ChapterAcceptanceDeskModel['proseCraft']
  punctuationTone: ChapterAcceptanceDeskModel['punctuationTone']
  contentRubric: ChapterAcceptanceDeskModel['contentRubric']
  targetReader: ChapterAcceptanceDeskModel['targetReader']
  genrePositioning: ChapterAcceptanceDeskModel['genrePositioning']
  femaleAudience: ChapterAcceptanceDeskModel['femaleAudience']
  upgradeRhythm: ChapterAcceptanceDeskModel['upgradeRhythm']
  chapterStructure: ChapterAcceptanceDeskModel['chapterStructure']
  chapterProgression: ChapterAcceptanceDeskModel['chapterProgression']
  informationLoad: ChapterAcceptanceDeskModel['informationLoad']
  longformContinuity: ChapterAcceptanceDeskModel['longformContinuity']
  coreContractCheck: ChapterAcceptanceDeskModel['coreContractCheck']
  continuityHeat: ChapterAcceptanceDeskModel['continuityHeat']
  revisionReceiptCheck: ChapterAcceptanceDeskModel['revisionReceiptCheck']
  deslopRepairCheck: ChapterAcceptanceDeskModel['deslopRepairCheck']
  proseMeta: ChapterAcceptanceDeskModel['proseMeta']
  serialRiskRepair: ChapterAcceptanceDeskModel['serialRiskRepair']
  chapterHookQuality: ChapterAcceptanceDeskModel['chapterHookQuality']
  readerRetentionCheck: ChapterAcceptanceDeskModel['readerRetentionCheck']
  readerRetentionSync: ChapterAcceptanceDeskModel['readerRetentionSync']
  chapterAttraction: ChapterAcceptanceDeskModel['chapterAttraction']
  storyDriveSync: ChapterAcceptanceDeskModel['storyDriveSync']
  characterArcSync: ChapterAcceptanceDeskModel['characterArcSync']
  chapterBenchmarkSync: ChapterAcceptanceDeskModel['chapterBenchmarkSync']
  styleSampleSync: ChapterAcceptanceDeskModel['styleSampleSync']
  innovationSync: ChapterAcceptanceDeskModel['innovationSync']
  volumeBeatSync: ChapterAcceptanceDeskModel['volumeBeatSync']
  blueprintReceipt: ChapterAcceptanceDeskModel['blueprintReceipt']
  revisionReceipt: ChapterAcceptanceDeskModel['revisionReceipt']
  deliveryRiskReceipt: ChapterAcceptanceDeskModel['deliveryRiskReceipt']
  sceneCardReceipt: ChapterAcceptanceDeskModel['sceneCardReceipt']
  qualityAudit: ChapterAcceptanceDeskModel['qualityAudit']
  platformRubric: ChapterAcceptanceDeskModel['platformRubric']
  approvalBlocker: ChapterAcceptanceDeskModel['approvalBlocker']
  governanceRecheckSync: ChapterAcceptanceDeskModel['governanceRecheckSync']
}): ChapterAcceptanceDeskModel['deliveryRiskQueue'] {
  const risks: Array<{ count: number; item: string; priorityLabel: string; priorityRank?: number }> = []
  if (args.approvalBlocker) {
    risks.push({
      count: 1,
      item: `处理入库阻断：${args.approvalBlocker.label} · ${args.approvalBlocker.detail}`,
      priorityLabel: '优先处理入库阻断',
      priorityRank: 0,
    })
  }
  if (args.governanceRecheckSync && args.governanceRecheckSync.missedCount > 0) {
    risks.push({
      count: args.governanceRecheckSync.missedCount,
      item: `验恢复依据：${args.governanceRecheckSync.label}`,
      priorityLabel: '优先验恢复依据',
    })
  }
  if (args.coreDrift && args.coreDrift.riskCount > 0) {
    risks.push({ count: args.coreDrift.riskCount, item: `守核心：${args.coreDrift.label}`, priorityLabel: '优先补核心' })
  }
  if (args.blueprintReceipt && args.blueprintReceipt.missedCount > 0) {
    risks.push({ count: args.blueprintReceipt.missedCount, item: `补蓝图：${args.blueprintReceipt.label}`, priorityLabel: '优先补蓝图' })
  }
  if (args.revisionReceipt && args.revisionReceipt.riskCount > 0) {
    risks.push({ count: args.revisionReceipt.riskCount, item: `复核修订：${args.revisionReceipt.label}`, priorityLabel: '优先复核修订' })
  }
  if (args.deliveryRiskReceipt && args.deliveryRiskReceipt.riskCount > 0) {
    risks.push({ count: args.deliveryRiskReceipt.riskCount, item: `复核承接：${args.deliveryRiskReceipt.label}`, priorityLabel: '优先复核承接' })
  }
  if (args.sceneCardReceipt && args.sceneCardReceipt.riskCount > 0) {
    risks.push({ count: args.sceneCardReceipt.riskCount, item: `复核场景回执：${args.sceneCardReceipt.label}`, priorityLabel: '优先复核场景' })
  }
  if (args.sceneCardDirective && args.sceneCardDirective.missedCount > 0) {
    risks.push({
      count: args.sceneCardDirective.missedCount,
      item: `修场景卡：${args.sceneCardDirective.label}`,
      priorityLabel: '优先修场景卡',
      priorityRank: 1,
    })
  }
  if (args.qualityAudit && args.qualityAudit.riskCount > 0) {
    risks.push({ count: args.qualityAudit.riskCount, item: `修质量诊断：${args.qualityAudit.label}`, priorityLabel: '优先修质量诊断' })
  }
  if (args.qualityAuditSync && args.qualityAuditSync.missedCount > 0) {
    risks.push({ count: args.qualityAuditSync.missedCount, item: `补诊断承接：${args.qualityAuditSync.label}`, priorityLabel: '优先补质量诊断' })
  }
  if (args.qualityAuditRepairReceiptSync && args.qualityAuditRepairReceiptSync.missedCount > 0) {
    risks.push({
      count: args.qualityAuditRepairReceiptSync.missedCount,
      item: `复核质量修复回执：${args.qualityAuditRepairReceiptSync.label}`,
      priorityLabel: '优先补质量回执',
    })
  }
  if (args.chapterHandoffSync && args.chapterHandoffSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffSync.missedCount,
      item: `补章首承接：${args.chapterHandoffSync.label}`,
      priorityLabel: '优先补章首承接',
    })
  }
  if (args.chapterHandoffDeltaSync && args.chapterHandoffDeltaSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffDeltaSync.missedCount,
      item: `补章末交接：${args.chapterHandoffDeltaSync.label}`,
      priorityLabel: '优先补章末交接',
    })
  }
  if (args.writePreparation && args.writePreparation.missedCount > 0) {
    risks.push({
      count: args.writePreparation.missedCount,
      item: `补写前准备：${args.writePreparation.label}`,
      priorityLabel: '优先补写前准备',
    })
  }
  if (args.intentConfirmationSync && args.intentConfirmationSync.missedCount > 0) {
    risks.push({
      count: args.intentConfirmationSync.missedCount,
      item: `补意图确认：${args.intentConfirmationSync.label}`,
      priorityLabel: '优先补意图确认',
    })
  }
  if (args.benchmarkRecallSync && args.benchmarkRecallSync.missedCount > 0) {
    risks.push({
      count: args.benchmarkRecallSync.missedCount,
      item: `补文风召回：${args.benchmarkRecallSync.label}`,
      priorityLabel: '优先补文风召回',
    })
  }
  if (args.sourceReadiness && args.sourceReadiness.missedCount > 0) {
    risks.push({
      count: args.sourceReadiness.missedCount,
      item: `补来源就绪：${args.sourceReadiness.label}`,
      priorityLabel: '优先补来源',
    })
  }
  if (args.stateTracking && args.stateTracking.missedCount > 0) {
    risks.push({
      count: args.stateTracking.missedCount,
      item: `补状态跟踪：${args.stateTracking.label}`,
      priorityLabel: '优先补状态',
    })
  }
  if (args.styleBoundary && args.styleBoundary.missedCount > 0) {
    risks.push({
      count: args.styleBoundary.missedCount,
      item: `校风格边界：${args.styleBoundary.label}`,
      priorityLabel: '优先校风格边界',
    })
  }
  if (args.informationFlow && args.informationFlow.missedCount > 0) {
    risks.push({
      count: args.informationFlow.missedCount,
      item: `调信息流：${args.informationFlow.label}`,
      priorityLabel: '优先调信息流',
    })
  }
  if (args.expectationThreshold && args.expectationThreshold.missedCount > 0) {
    risks.push({
      count: args.expectationThreshold.missedCount,
      item: `补期待阈值：${args.expectationThreshold.label}`,
      priorityLabel: '优先补期待阈值',
    })
  }
  if (args.storyLoop && args.storyLoop.missedCount > 0) {
    risks.push({
      count: args.storyLoop.missedCount,
      item: `补故事闭环：${args.storyLoop.label}`,
      priorityLabel: '优先补闭环',
    })
  }
  if (args.emotionalArc && args.emotionalArc.missedCount > 0) {
    risks.push({
      count: args.emotionalArc.missedCount,
      item: `补情绪弧：${args.emotionalArc.label}`,
      priorityLabel: '优先补情绪弧',
    })
  }
  if (args.chapterHook && args.chapterHook.missedCount > 0) {
    risks.push({
      count: args.chapterHook.missedCount,
      item: `补章级钩子：${args.chapterHook.label}`,
      priorityLabel: '优先补章钩',
    })
  }
  if (args.paragraphHook && args.paragraphHook.missedCount > 0) {
    risks.push({
      count: args.paragraphHook.missedCount,
      item: `补段落钩子：${args.paragraphHook.label}`,
      priorityLabel: '优先补段钩',
    })
  }
  if (args.suspense && args.suspense.missedCount > 0) {
    risks.push({
      count: args.suspense.missedCount,
      item: `补悬念编排：${args.suspense.label}`,
      priorityLabel: '优先补悬念',
    })
  }
  if (args.assetLinkage && args.assetLinkage.missedCount > 0) {
    risks.push({
      count: args.assetLinkage.missedCount,
      item: `挂资产：${args.assetLinkage.label}`,
      priorityLabel: '优先补资产挂钩',
    })
  }
  if (args.dialogue && args.dialogue.missedCount > 0) {
    risks.push({
      count: args.dialogue.missedCount,
      item: `修对白：${args.dialogue.label}`,
      priorityLabel: '优先修对白',
    })
  }
  if (args.plotDynamics && args.plotDynamics.missedCount > 0) {
    risks.push({
      count: args.plotDynamics.missedCount,
      item: `补动力：${args.plotDynamics.label}`,
      priorityLabel: '优先补剧情动力',
    })
  }
  if (args.characterRelation && args.characterRelation.missedCount > 0) {
    risks.push({
      count: args.characterRelation.missedCount,
      item: `修关系：${args.characterRelation.label}`,
      priorityLabel: '优先修角色关系',
    })
  }
  if (args.characterBehavior && args.characterBehavior.missedCount > 0) {
    risks.push({
      count: args.characterBehavior.missedCount,
      item: `修行为：${args.characterBehavior.label}`,
      priorityLabel: '优先修角色行为',
    })
  }
  if (args.conflictStructure && args.conflictStructure.missedCount > 0) {
    risks.push({
      count: args.conflictStructure.missedCount,
      item: `加冲突：${args.conflictStructure.label}`,
      priorityLabel: '优先修冲突结构',
    })
  }
  if (args.bridgeUnit && args.bridgeUnit.missedCount > 0) {
    risks.push({
      count: args.bridgeUnit.missedCount,
      item: `补桥段：${args.bridgeUnit.label}`,
      priorityLabel: '优先补桥段节奏',
    })
  }
  if (args.reversal && args.reversal.missedCount > 0) {
    risks.push({
      count: args.reversal.missedCount,
      item: `补反转：${args.reversal.label}`,
      priorityLabel: '优先补反转设计',
    })
  }
  if (args.showdown && args.showdown.missedCount > 0) {
    risks.push({
      count: args.showdown.missedCount,
      item: `补高潮：${args.showdown.label}`,
      priorityLabel: '优先补高潮对抗',
    })
  }
  if (args.opening && args.opening.missedCount > 0) {
    risks.push({
      count: args.opening.missedCount,
      item: `改开篇：${args.opening.label}`,
      priorityLabel: '优先修开篇',
    })
  }
  if (args.proseCraft && args.proseCraft.missedCount > 0) {
    risks.push({
      count: args.proseCraft.missedCount,
      item: `修工艺：${args.proseCraft.label}`,
      priorityLabel: '优先修正文工艺',
    })
  }
  if (args.punctuationTone && args.punctuationTone.missedCount > 0) {
    risks.push({
      count: args.punctuationTone.missedCount,
      item: `调语气：${args.punctuationTone.label}`,
      priorityLabel: '优先修语气标点',
    })
  }
  if (args.contentRubric && args.contentRubric.missedCount > 0) {
    risks.push({
      count: args.contentRubric.missedCount,
      item: `补内容：${args.contentRubric.label}`,
      priorityLabel: '优先修内容基准',
    })
  }
  if (args.targetReader && args.targetReader.missedCount > 0) {
    risks.push({
      count: args.targetReader.missedCount,
      item: `创作契约：目标读者缺口 ${args.targetReader.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.genrePositioning && args.genrePositioning.missedCount > 0) {
    risks.push({
      count: args.genrePositioning.missedCount,
      item: `创作契约：题材定位缺口 ${args.genrePositioning.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.femaleAudience && args.femaleAudience.missedCount > 0) {
    risks.push({
      count: args.femaleAudience.missedCount,
      item: `补女频：${args.femaleAudience.label}`,
      priorityLabel: '优先补女频长篇',
    })
  }
  if (args.upgradeRhythm && args.upgradeRhythm.missedCount > 0) {
    risks.push({
      count: args.upgradeRhythm.missedCount,
      item: `补升级：${args.upgradeRhythm.label}`,
      priorityLabel: '优先补升级节奏',
    })
  }
  if (args.chapterStructure && args.chapterStructure.missedCount > 0) {
    risks.push({
      count: args.chapterStructure.missedCount,
      item: `补结构：${args.chapterStructure.label}`,
      priorityLabel: '优先补章节结构',
    })
  }
  if (args.chapterProgression && args.chapterProgression.missedCount > 0) {
    risks.push({
      count: args.chapterProgression.missedCount,
      item: `补推进：${args.chapterProgression.label}`,
      priorityLabel: '优先补章节推进',
    })
  }
  if (args.informationLoad && args.informationLoad.missedCount > 0) {
    risks.push({
      count: args.informationLoad.missedCount,
      item: `压信息：${args.informationLoad.label}`,
      priorityLabel: '优先压信息负载',
    })
  }
  if (args.longformContinuity && args.longformContinuity.missedCount > 0) {
    risks.push({
      count: args.longformContinuity.missedCount,
      item: `保长篇：${args.longformContinuity.label}`,
      priorityLabel: '优先保长篇连续性',
    })
  }
  if (args.coreContractCheck && args.coreContractCheck.missedCount > 0) {
    risks.push({
      count: args.coreContractCheck.missedCount,
      item: `创作契约：核心承诺缺口 ${args.coreContractCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.continuityHeat && args.continuityHeat.missedCount > 0) {
    risks.push({
      count: args.continuityHeat.missedCount,
      item: `补热度：${args.continuityHeat.label}`,
      priorityLabel: '优先补连续性热度',
    })
  }
  if (args.revisionReceiptCheck && args.revisionReceiptCheck.missedCount > 0) {
    risks.push({
      count: args.revisionReceiptCheck.missedCount,
      item: `补回执：${args.revisionReceiptCheck.label}`,
      priorityLabel: '优先补修订回执',
    })
  }
  if (args.deslopRepairCheck && args.deslopRepairCheck.missedCount > 0) {
    risks.push({
      count: args.deslopRepairCheck.missedCount,
      item: `补去味：${args.deslopRepairCheck.label}`,
      priorityLabel: '优先补去AI味修复',
    })
  }
  if (args.proseMeta && args.proseMeta.missedCount > 0) {
    risks.push({
      count: args.proseMeta.missedCount,
      item: `删元叙：${args.proseMeta.label}`,
      priorityLabel: '优先删正文元叙事',
    })
  }
  if (args.serialRiskRepair && args.serialRiskRepair.missedCount > 0) {
    risks.push({
      count: args.serialRiskRepair.missedCount,
      item: `补连修：${args.serialRiskRepair.label}`,
      priorityLabel: '优先补连续风险修复',
    })
  }
  if (args.chapterHookQuality && args.chapterHookQuality.missedCount > 0) {
    risks.push({
      count: args.chapterHookQuality.missedCount,
      item: `强章钩：${args.chapterHookQuality.label}`,
      priorityLabel: '优先强章钩质量',
    })
  }
  if (args.readerRetentionCheck && args.readerRetentionCheck.missedCount > 0) {
    risks.push({
      count: args.readerRetentionCheck.missedCount,
      item: `创作契约：追读留存缺口 ${args.readerRetentionCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.platformRubric && args.platformRubric.missedCount > 0) {
    risks.push({ count: args.platformRubric.missedCount, item: `平台适配：平台缺口 ${args.platformRubric.missedCount}`, priorityLabel: '优先修平台适配' })
  }
  if (args.runwaySync && args.runwaySync.riskCount > 0) {
    risks.push({ count: args.runwaySync.riskCount, item: `补航线：${args.runwaySync.label}`, priorityLabel: '优先补航线' })
  }
  if (args.storyUnitSync && args.storyUnitSync.riskCount > 0) {
    risks.push({ count: args.storyUnitSync.riskCount, item: `校剧情单元：${args.storyUnitSync.label}`, priorityLabel: '优先校单元' })
  }
  if (args.signatureSceneSync && args.signatureSceneSync.missedCount > 0) {
    risks.push({ count: args.signatureSceneSync.missedCount, item: `补强场面：${args.signatureSceneSync.label}`, priorityLabel: '优先补强场面' })
  }
  if (args.mustFix.length > 0) {
    risks.push({ count: args.mustFix.length, item: `修质量：${args.mustFix.slice(0, 2).join('；')}`, priorityLabel: '优先修质量' })
  }
  if (args.readerExpectationSync && args.readerExpectationSync.missedCount > 0) {
    risks.push(args.readerExpectationSync.openingHandoffMissedCount > 0
      ? { count: args.readerExpectationSync.missedCount, item: `修开篇承接：${args.readerExpectationSync.label}`, priorityLabel: '优先修开篇' }
      : { count: args.readerExpectationSync.missedCount, item: `补期待：${args.readerExpectationSync.label}`, priorityLabel: '优先补期待' })
  } else if (args.readerRetentionSync && args.readerRetentionSync.missedCount > 0) {
    risks.push({ count: args.readerRetentionSync.missedCount, item: `补追读：${args.readerRetentionSync.label}`, priorityLabel: '优先补追读' })
  }
  if (args.chapterAttraction && args.chapterAttraction.weakCount > 0) {
    risks.push({ count: args.chapterAttraction.weakCount, item: `修吸引力：${args.chapterAttraction.label}`, priorityLabel: args.chapterAttraction.priorityLabel || '优先修吸引力' })
  }
  if (args.storyDriveSync && args.storyDriveSync.missedCount > 0) {
    risks.push({
      count: args.storyDriveSync.missedCount,
      item: `补故事力：${args.storyDriveSync.label}`,
      priorityLabel: args.storyDriveSync.priorityLabel || '优先补故事力',
    })
  }
  if (args.characterArcSync && args.characterArcSync.missedCount > 0) {
    risks.push({
      count: args.characterArcSync.missedCount,
      item: `补人物弧光：${args.characterArcSync.label}`,
      priorityLabel: args.characterArcSync.priorityLabel || '优先补人物弧光',
    })
  }
  if (args.chapterBenchmarkSync && args.chapterBenchmarkSync.missedCount > 0) {
    risks.push({ count: args.chapterBenchmarkSync.missedCount, item: `补基准：${args.chapterBenchmarkSync.label}`, priorityLabel: '优先补基准' })
  }
  if (args.styleSampleSync && (args.styleSampleSync.missedCount > 0 || args.styleSampleSync.copyRiskCount > 0)) {
    risks.push({
      count: args.styleSampleSync.missedCount + args.styleSampleSync.copyRiskCount,
      item: `校风格：${args.styleSampleSync.label}`,
      priorityLabel: '优先校风格',
    })
  }
  if (args.innovationSync && args.innovationSync.missedCount > 0) {
    risks.push({ count: args.innovationSync.missedCount, item: `补创新：${args.innovationSync.label}`, priorityLabel: '优先补创新' })
  }
  if (args.volumeBeatSync && args.volumeBeatSync.missedCount > 0) {
    risks.push({ count: args.volumeBeatSync.missedCount, item: `补爆点：${args.volumeBeatSync.label}`, priorityLabel: '优先补爆点' })
  }
  if (!args.readerExpectationSync && args.readerPayoffSync && args.readerPayoffSync.debtCount > 0) {
    risks.push({ count: args.readerPayoffSync.debtCount, item: `补回报：${args.readerPayoffSync.label}`, priorityLabel: '优先补回报' })
  }
  if (args.storylineSync) {
    const storylineRiskCount = args.storylineSync.missedCount + args.storylineSync.unplannedCount + args.storylineSync.forbiddenCount
    if (storylineRiskCount > 0) {
      risks.push({ count: storylineRiskCount, item: `校剧情线：${args.storylineSync.label}`, priorityLabel: '优先校剧情线' })
    }
  }
  if (args.readabilityReview && args.readabilityReview.riskCount > 0) {
    risks.push(args.readabilityReview.openingHookRisk
      ? { count: args.readabilityReview.riskCount, item: `修开篇吸引力：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修开篇' }
      : args.readabilityReview.endingHookRisk
        ? { count: args.readabilityReview.riskCount, item: `修章末翻页：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修章末' }
        : args.readabilityReview.sceneReadabilityRisk
          ? { count: args.readabilityReview.riskCount, item: `修场景推进：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修场景' }
          : args.readabilityReview.payoffDensityRisk
            ? { count: args.readabilityReview.riskCount, item: `补爽点密度：${args.readabilityReview.riskLabel}`, priorityLabel: '优先补爽点' }
            : args.readabilityReview.aiSmellRisk
              ? { count: args.readabilityReview.riskCount, item: `去AI味：${args.readabilityReview.riskLabel}`, priorityLabel: '优先去AI味' }
      : { count: args.readabilityReview.riskCount, item: `调可读性：${args.readabilityReview.riskLabel}`, priorityLabel: '优先调可读性' })
  }

  const totalCount = risks.reduce((sum, risk) => sum + risk.count, 0)
  if (totalCount <= 0) return null
  const orderedRisks = risks
    .map((risk, index) => ({ ...risk, index }))
    .sort((left, right) => (left.priorityRank ?? 2) - (right.priorityRank ?? 2) || left.index - right.index)

  return {
    totalCount,
    label: `待修复 ${totalCount}`,
    priorityLabel: orderedRisks[0]?.priorityLabel || '优先复盘本章',
    items: orderedRisks.map(risk => risk.item),
  }
}

function deliveryRiskConvergencePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
}

function buildDeliveryRiskConvergenceSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['deliveryRiskConvergence'] {
  if (!review) return null
  const payload = deliveryRiskConvergencePayload(review)
  const statusText = text(payload?.status || review?.status).toLowerCase()
  const status: 'cleared' | 'improved' | 'unchanged' | 'worse' =
    statusText === 'cleared' || statusText === 'improved' || statusText === 'worse' ? statusText : 'unchanged'
  const residualCountValue = Number(payload?.residual_count ?? payload?.residualCount ?? payload?.after_count)
  const resolvedCountValue = Number(payload?.resolved_count ?? payload?.resolvedCount)
  const residualCount = Number.isFinite(residualCountValue) ? residualCountValue : 0
  const resolvedCount = Number.isFinite(resolvedCountValue) ? resolvedCountValue : 0
  const nextActions = Array.isArray(payload?.next_actions) ? payload.next_actions.map((item: any) => text(item)).filter(Boolean) : []

  return {
    status,
    label: text(payload?.label) || (status === 'cleared' ? '风险已清零' : status === 'improved' ? `风险收敛 ${resolvedCount}` : status === 'worse' ? '新增风险' : `仍有残留 ${residualCount}`),
    residualCount,
    resolvedCount,
    nextAction: nextActions[0] || '',
  }
}

function governanceRecheckSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.governance_recheck_sync || payload?.result?.governance_recheck_sync || payload?.result || payload
}

function reviewItemTextArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.text, item.label, item.summary, item.detail, item.name, item.title)
  }).filter(Boolean)
}

function buildGovernanceRecheckSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['governanceRecheckSync'] {
  if (!review) return null
  const payload = governanceRecheckSyncPayload(review)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const failedEvidence = reviewItemTextArray(payload?.failed_evidence || payload?.failedEvidence)
  const missedItems = reviewItemTextArray(payload?.missed || payload?.missed_items || payload?.missedItems)
  const missedCount = Number.isFinite(payloadMissedCount)
    ? payloadMissedCount
    : failedEvidence.length + missedItems.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '恢复依据 OK' : text(payload?.label) || `恢复依据缺口 ${missedCount}`,
    missedCount,
    failedEvidence: failedEvidence.slice(0, 6),
    watchItems: reviewItemTextArray(payload?.watch_items || payload?.watchItems).slice(0, 6),
    summary: text(payload?.summary || review?.summary),
  }
}

function extractQualityScore(quality: AnyRecord) {
  const value = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function recordValue(value: any): AnyRecord {
  if (!value) return {}
  if (typeof value === 'object') return value
  const parsed = parseWorkspacePayload(value, { kind: 'admission', field: 'payload' })
  return parsed && typeof parsed === 'object' ? parsed : {}
}

function unwrapStorageEnvelope(record: AnyRecord): AnyRecord {
  if (!record || typeof record !== 'object') return {}
  const preview = typeof record.preview === 'string' ? recordValue(record.preview) : {}
  const hasPreview = Object.keys(preview).length > 0
  if (!record.truncated || !hasPreview) return record
  return {
    ...preview,
    ...record,
    chapter_id: record.chapter_id ?? record.chapterId ?? preview.chapter_id ?? preview.chapterId ?? preview.chapter?.id,
    chapter_no: record.chapter_no ?? record.chapterNo ?? preview.chapter_no ?? preview.chapterNo ?? preview.chapter?.chapter_no ?? preview.chapter?.chapterNo,
    admission_status: firstNonEmpty(record.admission_status, record.admissionStatus, preview.admission_status, preview.admissionStatus),
    prose_admission: record.prose_admission || record.proseAdmission || preview.prose_admission || preview.proseAdmission,
    quality_score: record.quality_score ?? record.qualityScore ?? preview.quality_score ?? preview.qualityScore ?? preview.score,
    quality_warnings: record.quality_warnings || record.qualityWarnings || preview.quality_warnings || preview.qualityWarnings || preview.warnings,
    story_state_status: firstNonEmpty(record.story_state_status, record.storyStateStatus, preview.story_state_status, preview.storyStateStatus),
    post_commit_warnings: record.post_commit_warnings || record.postCommitWarnings || preview.post_commit_warnings || preview.postCommitWarnings,
  }
}

function normalizeAdmissionCandidate(value: any): AnyRecord | null {
  const record = unwrapStorageEnvelope(recordValue(value))
  const direct = record?.prose_admission || record?.proseAdmission
  if (direct && typeof direct === 'object') {
    const status = firstNonEmpty(direct.status, direct.admission_status, direct.admissionStatus)
    if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
    return {
      ...direct,
      status,
      quality_score: direct.quality_score ?? direct.qualityScore ?? record?.quality_score ?? record?.qualityScore ?? record?.score,
      quality_warnings: direct.quality_warnings || direct.qualityWarnings || record?.quality_warnings || record?.qualityWarnings || record?.warnings,
      story_state_status: direct.story_state_status || direct.storyStateStatus || record?.story_state_status || record?.storyStateStatus,
      story_state_warning: direct.story_state_warning || direct.storyStateWarning || record?.story_state_warning || record?.storyStateWarning || null,
      post_commit_warnings: direct.post_commit_warnings || direct.postCommitWarnings || record?.post_commit_warnings || record?.postCommitWarnings,
    }
  }
  const status = firstNonEmpty(record?.status, record?.admission_status, record?.admissionStatus)
  if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
  return {
    ...record,
    status,
    quality_score: record?.quality_score ?? record?.qualityScore ?? record?.score,
    quality_warnings: record?.quality_warnings || record?.qualityWarnings || record?.warnings,
    story_state_status: record?.story_state_status || record?.storyStateStatus,
    story_state_warning: record?.story_state_warning || record?.storyStateWarning || null,
    post_commit_warnings: record?.post_commit_warnings || record?.postCommitWarnings,
  }
}

function recordBelongsToChapter(record: AnyRecord, chapter: AnyRecord) {
  const recordId = text(record?.chapter_id ?? record?.chapterId ?? record?.chapter?.id)
  const recordNoValue = record?.chapter_no ?? record?.chapterNo ?? record?.chapter?.chapter_no ?? record?.chapter?.chapterNo
  const recordNo = Number(recordNoValue || 0)
  const chapterId = text(chapter?.id)
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  if (!recordId && recordNo <= 0) return false
  if (recordId && (!chapterId || recordId !== chapterId)) return false
  if (recordNo > 0 && (!chapterNo || recordNo !== chapterNo)) return false
  return true
}

function runAdmissionOrder(run: AnyRecord) {
  const timestamp = Date.parse(firstNonEmpty(run?.updated_at, run?.updatedAt, run?.completed_at, run?.completedAt, run?.created_at, run?.createdAt))
  if (Number.isFinite(timestamp)) return timestamp
  const id = Number(run?.id || 0)
  return Number.isFinite(id) ? id : 0
}

function admissionRank(status: string) {
  if (status === 'accepted') return 3
  if (status === 'accepted_with_warnings') return 2
  if (status === 'blocked_invalid') return 1
  return 0
}

function runAdmission(runs: AnyRecord[], chapter: AnyRecord): AnyRecord | null {
  const sortedRuns = [...runs].sort((left, right) => runAdmissionOrder(right) - runAdmissionOrder(left))
  let best: AnyRecord | null = null
  let bestRank = 0
  for (const run of sortedRuns) {
    const roots = [run?.output_ref, run?.outputRef, run?.output, run?.payload, run]
      .map(recordValue)
      .map(unwrapStorageEnvelope)
      .filter(value => Object.keys(value).length > 0)
    for (const root of roots) {
      const direct = recordBelongsToChapter(root, chapter) ? normalizeAdmissionCandidate(root) : null
      const items = [...arrayValue(root?.chapters), ...arrayValue(root?.results)]
      const item = items.find(candidate => recordBelongsToChapter(candidate, chapter))
      const nested = normalizeAdmissionCandidate(item)
      const candidate = direct || nested
      if (!candidate) continue
      const status = firstNonEmpty(candidate.status, candidate.admission_status, candidate.admissionStatus)
      const rank = admissionRank(status)
      // Prefer the newest successful admission; only fall back to blocked_invalid when nothing better exists.
      if (rank > bestRank || (rank === bestRank && !best)) {
        best = candidate
        bestRank = rank
      }
      if (bestRank >= 2) return best
    }
  }
  return best
}

function resolveProseAdmission(chapter: AnyRecord, qualityReviewPayload: AnyRecord, runs: AnyRecord[]) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const fromChapter = normalizeAdmissionCandidate(rawPayload?.prose_admission || rawPayload?.proseAdmission)
  if (fromChapter) return fromChapter
  const fromReview = normalizeAdmissionCandidate(qualityReviewPayload?.prose_admission || qualityReviewPayload?.proseAdmission)
  if (fromReview) return fromReview
  const fromRun = runAdmission(runs, chapter)
  if (!fromRun) return null
  const status = firstNonEmpty(fromRun.status, fromRun.admission_status, fromRun.admissionStatus)
  // blocked_invalid means prose was rejected before store. If the chapter already has prose,
  // the failed run is stale relative to a later successful commit.
  if (status === 'blocked_invalid' && hasProse(chapter)) return null
  return fromRun
}

function normalizedAdmissionWarnings(value: any): Array<{ code: string; source: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { code: 'admission_warning', source: 'quality', message: text(item) }
    return {
      code: firstNonEmpty(item?.code, item?.key, 'admission_warning'),
      source: firstNonEmpty(item?.source, item?.stage, 'quality'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.source}:${item.code}:${item.message}`) && Boolean(seen.add(`${item.source}:${item.code}:${item.message}`)))
}

function normalizedPostCommitWarnings(value: any): Array<{ stage: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { stage: 'post_commit', message: text(item) }
    return {
      stage: firstNonEmpty(item?.stage, item?.source, 'post_commit'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.stage}:${item.message}`) && Boolean(seen.add(`${item.stage}:${item.message}`)))
}

function hasUsableProseQualityReview(review?: AnyRecord | null) {
  const quality = qualityPayload(review)
  return extractQualityScore(quality) !== null
    || typeof quality?.passed === 'boolean'
}

function issueText(issue: any) {
  if (typeof issue === 'string') return text(issue)
  return firstNonEmpty(issue?.message, issue?.summary, issue?.detail, issue?.text, issue?.title)
}

function hasHighSeverityIssue(issue: any) {
  if (typeof issue === 'string') return false
  const severity = text(issue?.severity || issue?.level || issue?.grade).toLowerCase()
  return severity === 'high' || severity === 'critical' || severity === 'blocker' || severity === 'must_fix'
}

function extractMustFix(quality: AnyRecord, report: AnyRecord) {
  const fromQuality = [
    ...stringArray(quality?.must_fix),
    ...stringArray(quality?.mustFix),
    ...stringArray(quality?.revision_directives),
  ]
  const fromHighIssues = arrayValue(quality?.issues).filter(hasHighSeverityIssue).map(issueText).filter(Boolean)
  const fromReport = [
    ...stringArray(report?.must_fix),
    ...stringArray(report?.mustFix),
  ]
  return Array.from(new Set([...fromQuality, ...fromHighIssues, ...fromReport])).slice(0, 5)
}

function extractOptionalImprovements(quality: AnyRecord, report: AnyRecord) {
  const items = [
    ...stringArray(quality?.optional_improvements),
    ...stringArray(quality?.optionalImprovements),
    ...stringArray(report?.optional_improvements),
    ...stringArray(report?.optionalImprovements),
  ]
  return Array.from(new Set(items)).slice(0, 5)
}

function reportBelongsToCurrentQualityCycle(args: {
  reportRef: ReviewRef | null
  qualityRef: ReviewRef | null
  revisionRef: ReviewRef | null
}) {
  if (!args.reportRef || !args.qualityRef) return false
  return compareReviewRefs(args.reportRef, args.qualityRef) >= 0
    && (!args.revisionRef || compareReviewRefs(args.reportRef, args.revisionRef) > 0)
}


function storyStateFailureMessages(warning: any): string[] {
  const failures = arrayValue(warning?.hard_failures || warning?.hardFailures || warning?.failures)
  const messages = failures.map((item: any) => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.detail, item?.summary, item?.key)
  }).filter(Boolean)
  const skipped = firstNonEmpty(warning?.reason, warning?.skipped === true ? 'story_state_skipped' : '')
  if (skipped && !messages.length) {
    if (/draft_only/i.test(skipped)) return ['当前是“只生成正文初稿”模式，正文入库后故意不更新状态机，避免草稿污染长期记忆。']
    if (/draft_review/i.test(skipped)) return ['当前是“生成并自检”模式，正文入库后故意不更新状态机；完整流水线或手动同步后才会写入。']
    return [`状态机更新被跳过：${skipped}`]
  }
  if (warning?.error) messages.unshift(firstNonEmpty(warning.error, '故事状态准备失败'))
  return Array.from(new Set(messages)).slice(0, 6)
}

function buildStoryStatePanel(args: {
  chapter: AnyRecord
  storyState: AnyRecord
  proseAdmission: AnyRecord | null
  hasChapterProse: boolean
}): ChapterAcceptanceDeskModel['storyStatePanel'] {
  if (!args.hasChapterProse) return null
  const chapterNo = Number(args.chapter?.chapter_no || args.chapter?.chapterNo || 0)
  const lastUpdatedChapter = Number(args.storyState?.last_updated_chapter || args.storyState?.lastUpdatedChapter || 0)
  const admissionStoryStatus = firstNonEmpty(
    args.proseAdmission?.story_state_status,
    args.proseAdmission?.storyStateStatus,
  )
  const warning = args.proseAdmission?.story_state_warning || args.proseAdmission?.storyStateWarning || null
  const reasons = storyStateFailureMessages(warning)
  const skippedReason = firstNonEmpty(warning?.reason, '')
  const skippedByMode = /draft_only|draft_review/i.test(skippedReason)
  const laggingByCursor = chapterNo > 0 && lastUpdatedChapter > 0 && lastUpdatedChapter < chapterNo
  const laggingUnknown = chapterNo > 0 && lastUpdatedChapter === 0
  let status: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps' = 'synced'
  if (admissionStoryStatus === 'pending' || skippedByMode) {
    status = skippedByMode ? 'skipped' : 'pending'
  } else if (admissionStoryStatus === 'synced' && reasons.length > 0) {
    status = 'synced_with_gaps'
  } else if (admissionStoryStatus === 'synced') {
    status = laggingByCursor ? 'lagging' : 'synced'
  } else if (laggingByCursor || laggingUnknown) {
    status = 'lagging'
  } else if (reasons.length > 0) {
    status = 'pending'
  } else {
    status = lastUpdatedChapter >= chapterNo && chapterNo > 0 ? 'synced' : 'lagging'
  }

  const statusLabel = ({
    synced: '已同步',
    pending: '待同步',
    skipped: '本模式跳过',
    lagging: '落后于正文',
    synced_with_gaps: '已同步（有缺口）',
  } as const)[status]

  const headline = ({
    synced: `状态机已同步到第 ${Math.max(lastUpdatedChapter, chapterNo)} 章`,
    pending: '正文已入库，故事状态机尚未写入',
    skipped: '当前生产模式不会自动更新状态机',
    lagging: `状态机仍停在第 ${lastUpdatedChapter || 0} 章，落后于第 ${chapterNo} 章正文`,
    synced_with_gaps: '状态机已推进，但仍有计划状态缺口',
  } as const)[status]

  const defaultSummary = ({
    synced: '角色位置、道具归属、伏笔和时间线已与本章正文对齐。',
    pending: '系统设计会把“正文入库”和“状态机写入”拆开：准备不完整时先保住正文，避免用不完整 delta 污染长期记忆。',
    skipped: '只初稿 / 生成并自检 模式为防草稿污染，不会自动写状态机。满意正文后可手动同步。',
    lagging: '已有正文比状态机更新更靠后。继续写下一章前，建议先同步本章状态机。',
    synced_with_gaps: 'last_updated_chapter 已推进，但部分角色/资产/交接变化仍被标记为缺口，可按需重新同步补齐。',
  } as const)[status]

  const guidance = ({
    synced: '可继续下一章；若你刚改过大纲或角色设定，也可重新同步一次。',
    pending: '正文不用重写。点“立即同步故事状态”即可补写状态机；同步时允许带软警告推进。',
    skipped: '切换到“生成、自检、修订、入库”会自动尝试更新；或现在直接点“立即同步故事状态”。',
    lagging: '点“立即同步故事状态”，系统会从本章起按已写正文补跑状态机。',
    synced_with_gaps: '若你对正文已满意，可再点一次同步尝试补齐缺口；也可先继续写作。',
  } as const)[status]

  const eventSource = Array.isArray(args.storyState?.established_events)
    ? args.storyState.established_events
    : Array.isArray(args.storyState?.establishedEvents)
      ? args.storyState.establishedEvents
      : Array.isArray(args.storyState?.canon_facts)
        ? args.storyState.canon_facts
        : Array.isArray(args.storyState?.canonFacts)
          ? args.storyState.canonFacts
          : []
  const preview = eventSource
    .map((item: any) => {
      if (typeof item === 'string') return String(item || '').trim()
      return String(item?.fact || item?.text || item?.summary || '').trim()
    })
    .filter(Boolean)
    .slice(0, 5)
  const confirmedCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return Boolean(item.trim())
    const st = String(item?.status || 'confirmed')
    return st === 'confirmed' || !item?.status
  }).length
  const candidateCount = eventSource.filter((item: any) => item && typeof item === 'object' && item.status === 'candidate').length
  const hardCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return false
    return item?.lock_level === 'hard' || item?.lockLevel === 'hard' || item?.kind === 'death' || item?.kind === 'rule_trigger'
  }).length
  const establishedEvents = {
    confirmedCount,
    candidateCount,
    hardCount,
    preview,
    guidance: preview.length
      ? `已锁正史事件 ${confirmedCount} 条（硬锁 ${hardCount}）。下一章闪回/复述必须一致。`
      : (status === 'synced'
        ? '本章已同步，但还没有抽到事件级正史。若正文含死亡方式/规则触发，建议重新同步。'
        : '同步故事状态后，会抽取死亡方式、规则触发等不可改写事件。'),
  }
  const panelReasons = [...reasons]
  if (!preview.length && status === 'synced') {
    panelReasons.push('未抽到事件级正史（死亡/规则等），闪回章可能改写旧事实')
  }

  const canSync = status !== 'synced'
  return {
    visible: true,
    status,
    statusLabel,
    headline,
    summary: defaultSummary,
    reasons: Array.from(new Set(panelReasons)).slice(0, 6),
    guidance,
    chapterNo,
    lastUpdatedChapter,
    canSync,
    primaryAction: canSync
      ? { key: 'sync_story_state', label: status === 'skipped' || status === 'pending' || status === 'lagging' ? '立即同步故事状态' : '重新同步故事状态' }
      : { key: 'sync_story_state', label: '重新同步故事状态' },
    establishedEvents,
  }
}

function buildHiddenAcceptanceDesk(): ChapterAcceptanceDeskModel {
  return {
    visible: false,
    acceptanceStatus: 'hidden',
    admissionStatus: '',
    qualityWarnings: [],
    storyStateStatus: '',
    storyStatePanel: null,
    postCommitWarnings: [],
    statusLabel: '等待正文',
    acceptanceReasons: ['本章还没有正文，先完成章节计划和初稿。'],
    storylineSync: null,
    storyUnitSync: null,
    assetIntake: null,
    ipSceneIntake: null,
    signatureSceneSync: null,
    readabilityReview: null,
    deslopGateDiagnostics: null,
    coreDrift: null,
    runwaySync: null,
    readerPayoffSync: null,
    readerExpectationSync: null,
    qualityAuditSync: null,
    qualityAuditRepairReceiptSync: null,
    chapterHandoffSync: null,
    chapterHandoffDeltaSync: null,
    writePreparation: null,
    intentConfirmationSync: null,
    benchmarkRecallSync: null,
    sourceReadiness: null,
    stateTracking: null,
    styleBoundary: null,
    informationFlow: null,
    expectationThreshold: null,
    storyLoop: null,
    emotionalArc: null,
    chapterHook: null,
    paragraphHook: null,
    suspense: null,
    assetLinkage: null,
    dialogue: null,
    plotDynamics: null,
    characterRelation: null,
    characterBehavior: null,
    conflictStructure: null,
    bridgeUnit: null,
    reversal: null,
    showdown: null,
    opening: null,
    proseCraft: null,
    punctuationTone: null,
    contentRubric: null,
    targetReader: null,
    genrePositioning: null,
    femaleAudience: null,
    upgradeRhythm: null,
    chapterStructure: null,
    chapterProgression: null,
    informationLoad: null,
    longformContinuity: null,
    coreContractCheck: null,
    continuityHeat: null,
    revisionReceiptCheck: null,
    deslopRepairCheck: null,
    proseMeta: null,
    serialRiskRepair: null,
    chapterHookQuality: null,
    readerRetentionCheck: null,
    readerRetentionSync: null,
    chapterAttraction: null,
    storyDriveSync: null,
    characterArcSync: null,
    chapterBenchmarkSync: null,
    styleSampleSync: null,
    first30RetentionRecheck: null,
    innovationSync: null,
    volumeBeatSync: null,
    blueprintReceipt: null,
    revisionReceipt: null,
    deliveryRiskReceipt: null,
    sceneCardReceipt: null,
    qualityAudit: null,
    platformRubric: null,
    approvalBlocker: null,
    governanceRecheckSync: null,
    deliveryRiskQueue: null,
    deliveryRiskConvergence: null,
    qualityScore: null,
    qualityStatus: '',
    mustFix: [],
    optionalImprovements: [],
    latestQualityReviewId: null,
    latestEditorReportId: null,
    latestRevisionReviewId: null,
    latestEditorReportSummary: '',
    latestRevisionSummary: '',
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: ACTION_LABELS.write_draft },
    secondaryActions: [],
    shouldAutoExpandAcceptance: false,
  }
}

function buildChapterAcceptanceDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  reviews: AnyRecord[]
  activeRuns: AnyRecord[]
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter) return buildHiddenAcceptanceDesk()

  const latestQualityReviewRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_quality')
  const latestQualityRef = latestQualityReviewRef
    && proseQualityReviewMatchesCurrentChapter(latestQualityReviewRef.review, args.nextChapter)
    && hasUsableProseQualityReview(latestQualityReviewRef.review)
    ? latestQualityReviewRef
    : null
  const latestReportRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_report')
  const latestRevisionRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_revision')
  const latestStorylineSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'storyline_sync')
  const latestStoryUnitSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_unit_sync')
  const latestAssetIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_intake')
  const latestAssetLinkageSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_linkage_sync')
  const latestIpSceneIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'ip_scene_intake')
  const latestSignatureSceneSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'signature_scene_sync')
  const latestReadabilityRef = latestReviewRef(args.reviews, args.nextChapter, 'readability_review')
  const latestCoreDriftRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_core_drift')
  const latestRunwaySyncRef = latestReviewRef(args.reviews, args.nextChapter, 'runway_sync')
  const latestReaderPayoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_payoff_sync')
  const latestReaderExpectationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_expectation_sync')
  const latestQualityAuditSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_sync')
  const latestQualityAuditRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_repair_receipt_sync')
  const latestChapterHandoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_sync')
  const latestChapterHandoffDeltaSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_delta_sync')
  const latestIntentConfirmationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'intent_confirmation_sync')
  const latestBenchmarkRecallSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'benchmark_recall_sync')
  const latestReaderRetentionSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_retention_sync')
  const latestChapterAttractionRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_attraction_review')
  const latestStoryDriveSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_drive_sync')
  const latestCharacterArcSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'character_arc_sync')
  const latestChapterBenchmarkSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_benchmark_sync')
  const latestStyleSampleSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'style_sample_sync')
  const latestInnovationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'innovation_sync')
  const latestVolumeBeatSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'volume_beat_sync')
  const latestGovernanceRecheckSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'governance_recheck_sync')
  const latestDeliveryRiskConvergenceRef = latestReviewRef(args.reviews, args.nextChapter, 'delivery_risk_convergence')
  const latestDeslopRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'deslop_repair_receipt_sync')
  const latestProseRevisionReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_revision_receipt_sync')
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
  const latestQualityPayload = reviewPayload(latestQuality)
  const proseAdmission = resolveProseAdmission(args.nextChapter, latestQualityPayload, args.activeRuns)
  const admissionStatus = firstNonEmpty(proseAdmission?.status, proseAdmission?.admission_status, proseAdmission?.admissionStatus) as ChapterAcceptanceDeskModel['admissionStatus']
  const qualityWarnings = normalizedAdmissionWarnings(proseAdmission?.quality_warnings || proseAdmission?.qualityWarnings)
  const storyStateStatus = firstNonEmpty(proseAdmission?.story_state_status, proseAdmission?.storyStateStatus) as ChapterAcceptanceDeskModel['storyStateStatus']
  const postCommitWarnings = normalizedPostCommitWarnings(proseAdmission?.post_commit_warnings || proseAdmission?.postCommitWarnings)
  const storyStatePanel = buildStoryStatePanel({
    chapter: args.nextChapter,
    storyState: args.storyState,
    proseAdmission,
    hasChapterProse: hasProse(args.nextChapter),
  })
  const admissionFields = { admissionStatus, qualityWarnings, storyStateStatus, storyStatePanel, postCommitWarnings }
  if (!hasProse(args.nextChapter) && admissionStatus !== 'blocked_invalid') return buildHiddenAcceptanceDesk()
  const storylineSync = buildStorylineSyncSummary(latestStorylineSyncRef?.review || null)
  const storyUnitSync = buildStoryUnitSyncSummary(latestStoryUnitSyncRef?.review || null)
  const assetIntake = buildAssetIntakeSummary(latestAssetIntakeRef?.review || null)
  const ipSceneIntake = buildIpSceneIntakeSummary(latestIpSceneIntakeRef?.review || null)
  const signatureSceneSync = buildSignatureSceneSyncSummary(latestSignatureSceneSyncRef?.review || null)
  const readabilityReview = buildReadabilityReviewSummary(latestReadabilityRef?.review || null)
  const coreDrift = buildCoreDriftSummary(latestCoreDriftRef?.review || null)
  const runwaySync = buildRunwaySyncSummary(latestRunwaySyncRef?.review || null)
  const readerPayoffSync = buildReaderPayoffSyncSummary(latestReaderPayoffSyncRef?.review || null)
  const readerExpectationSync = buildReaderExpectationSyncSummary(latestReaderExpectationSyncRef?.review || null)
  const qualityAuditSync = buildQualityAuditSyncSummary(latestQualityAuditSyncRef?.review || null)
  const qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncSummary(latestQualityAuditRepairReceiptSyncRef?.review || null)
  const chapterHandoffSync = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestChapterHandoffSyncRef?.review || null,
      'chapter_handoff_sync',
      'chapterHandoffSync',
      '章首承接 OK',
      '章首承接缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接'),
    '章首承接',
  )
  const chapterHandoffDeltaSync = buildChapterHandoffSyncSummary(
    latestChapterHandoffDeltaSyncRef?.review || null,
    'chapter_handoff_delta_sync',
    'chapterHandoffDeltaSync',
    '章末交接 OK',
    '章末交接缺口',
  )
  const writePreparation = mergeContractSyncSummary(
    buildQualityCheckSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    '写前准备',
  )
  const intentConfirmationSync = mergeContractSyncSummary(
    buildIntentConfirmationSyncSummary(latestIntentConfirmationSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'intent_confirmation_checks', 'intentConfirmationChecks', '意图确认'),
    '意图确认',
  )
  const benchmarkRecallSync = mergeContractSyncSummary(
    buildBenchmarkRecallSyncSummary(latestBenchmarkRecallSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'benchmark_recall_checks', 'benchmarkRecallChecks', '文风召回'),
    '文风召回',
  )
  const sourceReadiness = buildQualityCheckSummary(latestQualityPayload, 'source_readiness_checks', 'sourceReadinessChecks', '来源就绪')
  const stateTracking = buildQualityCheckSummary(latestQualityPayload, 'state_tracking_checks', 'stateTrackingChecks', '状态跟踪')
  const styleBoundary = buildQualityCheckSummary(latestQualityPayload, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
  const informationFlow = buildQualityCheckSummary(latestQualityPayload, 'information_flow_checks', 'informationFlowChecks', '信息流')
  const expectationThreshold = buildQualityCheckSummary(latestQualityPayload, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
  const storyLoop = buildQualityCheckSummary(latestQualityPayload, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
  const emotionalArc = buildQualityCheckSummary(latestQualityPayload, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
  const chapterHook = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
  const paragraphHook = buildQualityCheckSummary(latestQualityPayload, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
  const suspense = buildQualityCheckSummary(latestQualityPayload, 'suspense_checks', 'suspenseChecks', '悬念编排')
  const assetLinkage = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestAssetLinkageSyncRef?.review || null,
      'asset_linkage_sync',
      'assetLinkageSync',
      '资产挂钩 OK',
      '资产挂钩缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩'),
    '资产挂钩',
  )
  const dialogue = buildQualityCheckSummary(latestQualityPayload, 'dialogue_checks', 'dialogueChecks', '对白质量')
  const plotDynamics = buildQualityCheckSummary(latestQualityPayload, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
  const characterRelation = buildQualityCheckSummary(latestQualityPayload, 'character_relation_checks', 'characterRelationChecks', '角色关系')
  const characterBehavior = buildQualityCheckSummary(latestQualityPayload, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
  const conflictStructure = buildQualityCheckSummary(latestQualityPayload, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
  const bridgeUnit = buildQualityCheckSummary(latestQualityPayload, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
  const reversal = buildQualityCheckSummary(latestQualityPayload, 'reversal_checks', 'reversalChecks', '反转设计')
  const showdown = buildQualityCheckSummary(latestQualityPayload, 'showdown_checks', 'showdownChecks', '高潮对抗')
  const opening = buildQualityCheckSummary(latestQualityPayload, 'opening_checks', 'openingChecks', '开篇设计')
  const proseCraft = buildQualityCheckSummary(latestQualityPayload, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
  const sceneCardDirective = buildSceneCardDirectiveSummary(latestQualityPayload)
  const punctuationTone = buildQualityCheckSummary(latestQualityPayload, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
  const contentRubric = buildQualityCheckSummary(latestQualityPayload, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
  const targetReader = buildQualityCheckSummary(latestQualityPayload, 'target_reader_checks', 'targetReaderChecks', '目标读者')
  const genrePositioning = buildQualityCheckSummary(latestQualityPayload, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
  const femaleAudience = buildQualityCheckSummary(latestQualityPayload, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
  const upgradeRhythm = buildQualityCheckSummary(latestQualityPayload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
  const chapterStructure = buildQualityCheckSummary(latestQualityPayload, 'structure_checks', 'structureChecks', '章节结构')
  const chapterProgression = buildQualityCheckSummary(latestQualityPayload, 'progression_checks', 'progressionChecks', '章节推进')
  const informationLoad = buildQualityCheckSummary(latestQualityPayload, 'information_checks', 'informationChecks', '信息负载')
  const longformContinuity = buildQualityCheckSummary(latestQualityPayload, 'longform_checks', 'longformChecks', '长篇连续性')
  const coreContractCheck = buildQualityCheckSummary(latestQualityPayload, 'core_contract_checks', 'coreContractChecks', '核心契约')
  const continuityHeat = buildQualityCheckSummary(latestQualityPayload, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
  const revisionReceiptCheck = buildQualityCheckSummary(latestQualityPayload, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
  const deslopRepairCheck = buildQualityCheckSummary(latestQualityPayload, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
  const proseMeta = buildQualityCheckSummary(latestQualityPayload, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
  const serialRiskRepair = buildQualityCheckSummary(latestQualityPayload, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
  const chapterHookQuality = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
  const readerRetentionCheck = buildQualityCheckSummary(latestQualityPayload, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
  const readerRetentionSync = buildReaderRetentionSyncSummary(latestReaderRetentionSyncRef?.review || null)
  const chapterAttraction = buildChapterAttractionSummary(latestChapterAttractionRef?.review || null)
  const storyDriveSync = buildStoryDriveSyncSummary(latestStoryDriveSyncRef?.review || null)
  const characterArcSync = buildCharacterArcSyncSummary(latestCharacterArcSyncRef?.review || null)
  const chapterBenchmarkSync = buildChapterBenchmarkSyncSummary(latestChapterBenchmarkSyncRef?.review || null)
  const styleSampleSync = buildStyleSampleSyncSummary(latestStyleSampleSyncRef?.review || null)
  const first30RetentionRecheck = buildFirst30RetentionRecheckSummary(args.nextChapter, args.reviews)
  const innovationSync = buildInnovationSyncSummary(latestInnovationSyncRef?.review || null)
  const volumeBeatSync = buildVolumeBeatSyncSummary(latestVolumeBeatSyncRef?.review || null)
  const blueprintReceipt = buildBlueprintReceiptSummary(args.nextChapter)
  const revisionReceipt = buildRevisionReceiptSummary(
    reviewPayload(latestQuality),
    {
      ...reviewPayload(latestDeslopRepairReceiptSyncRef?.review || null),
      ...reviewPayload(latestProseRevisionReceiptSyncRef?.review || null),
    },
  )
  const deliveryRiskReceipt = buildDeliveryRiskReceiptSummary(reviewPayload(latestQuality))
  const sceneCardReceipt = buildSceneCardReceiptSummary(reviewPayload(latestQuality))
  const qualityAudit = buildQualityAuditSummary(reviewPayload(latestQuality))
  const platformRubric = buildPlatformRubricSummary(reviewPayload(latestQuality))
  const governanceRecheckSync = buildGovernanceRecheckSyncSummary(latestGovernanceRecheckSyncRef?.review || null)
  const deliveryRiskConvergence = buildDeliveryRiskConvergenceSummary(latestDeliveryRiskConvergenceRef?.review || null)
  const quality = qualityPayload(latestQuality)
  const legacyApprovalBlocker = buildApprovalBlockerSummary(reviewPayload(latestQuality))
  const admissionApprovalBlocker: ChapterAcceptanceDeskModel['approvalBlocker'] = admissionStatus === 'blocked_invalid'
    ? {
        type: 'blocked_invalid',
        status: 'warn',
        label: '正文无效，未入库',
        detail: qualityWarnings.map(item => item.message).join('；') || '正文未通过有效性检查且未入库。',
        scoreLabel: '终止入库',
        reasons: qualityWarnings.map(item => item.message),
      }
    : null
  const approvalBlocker = ['accepted', 'accepted_with_warnings'].includes(admissionStatus)
    ? null
    : admissionApprovalBlocker || legacyApprovalBlocker
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(proseAdmission || {}) ?? extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const currentReport = reportBelongsToCurrentQualityCycle({
    reportRef: latestReportRef,
    qualityRef: latestQualityRef,
    revisionRef: latestRevisionRef,
  }) ? report : {}
  const deslopGateDiagnostics = buildDeslopGateDiagnosticsSummary(quality)
  const mustFix = extractMustFix(quality, currentReport)
  const optionalImprovements = extractOptionalImprovements(quality, report)
  const deliveryRiskQueue = buildDeliveryRiskQueue({
    mustFix,
    storylineSync,
    storyUnitSync,
    signatureSceneSync,
    readabilityReview,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    sceneCardDirective,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
  })
  const storyStateSynced = storyStateStatus
    ? storyStateStatus === 'synced'
    : Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
  const latestEditorReportSummary = firstNonEmpty(report?.summary, latestReport?.summary)
  const latestRevisionSummary = firstNonEmpty(revision?.revision_summary, latestRevision?.summary)
  const revisionNeedsRecheck = Boolean(
    latestQualityRef
    && latestRevisionRef
    && compareReviewRefs(latestRevisionRef, latestQualityRef) > 0,
  )
  const scoreNeedsRevision = score !== null && score < QUALITY_PASS_THRESHOLD
  const qualityNeedsRevision = Boolean(
    scoreNeedsRevision
    || mustFix.length > 0
    || Boolean(approvalBlocker)
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions: Array<{ key: WritingCockpitActionKey; label: string }> = [
    { key: 'review_draft', label: '查看交稿质检' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (admissionStatus === 'accepted_with_warnings' && (scoreNeedsRevision || mustFix.length > 0 || qualityWarnings.length > 0)) {
    secondaryActions.unshift({ key: 'apply_editor_revision', label: ACTION_LABELS.apply_editor_revision })
  }
  const needsStoryStateSync = Boolean(storyStatePanel && ['pending', 'skipped', 'lagging'].includes(storyStatePanel.status))
  if (needsStoryStateSync) {
    secondaryActions.unshift({
      key: 'sync_story_state',
      label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state,
    })
  }

  const admissionCommon = {
    storylineSync, storyUnitSync, assetIntake, ipSceneIntake, signatureSceneSync, readabilityReview,
    deslopGateDiagnostics, coreDrift, runwaySync, readerPayoffSync, readerExpectationSync,
    qualityAuditSync, qualityAuditRepairReceiptSync, chapterHandoffSync, chapterHandoffDeltaSync,
    writePreparation, intentConfirmationSync, benchmarkRecallSync, sourceReadiness, stateTracking,
    styleBoundary, informationFlow, expectationThreshold, storyLoop, emotionalArc, chapterHook,
    paragraphHook, suspense, assetLinkage, dialogue, plotDynamics, characterRelation, characterBehavior,
    conflictStructure, bridgeUnit, reversal, showdown, opening, proseCraft, punctuationTone, contentRubric,
    targetReader, genrePositioning, femaleAudience, upgradeRhythm, chapterStructure, chapterProgression,
    informationLoad, longformContinuity, coreContractCheck, continuityHeat, revisionReceiptCheck,
    deslopRepairCheck, proseMeta, serialRiskRepair, chapterHookQuality, readerRetentionCheck,
    readerRetentionSync, chapterAttraction, storyDriveSync, characterArcSync, chapterBenchmarkSync,
    styleSampleSync, first30RetentionRecheck, innovationSync, volumeBeatSync, blueprintReceipt,
    revisionReceipt, deliveryRiskReceipt, sceneCardReceipt, qualityAudit, platformRubric, governanceRecheckSync,
    deliveryRiskQueue, deliveryRiskConvergence, qualityScore: score, qualityStatus, mustFix,
    optionalImprovements, latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null, latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary, latestRevisionSummary, storyStateSynced, secondaryActions,
  }

  if (admissionStatus === 'accepted_with_warnings') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : ''
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered_with_warnings',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库，建议修订',
      acceptanceReasons: [
        storyReason,
        ...qualityWarnings.map(item => item.message),
        ...postCommitWarnings.map(item => item.message),
      ].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync || Boolean(storyStatePanel?.reasons?.length),
    }
  }

  if (admissionStatus === 'accepted') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : '正文已入库，可以继续下一章。'
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库',
      acceptanceReasons: [storyReason, ...(storyStatePanel?.reasons || [])].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync,
    }
  }

  if (admissionStatus === 'blocked_invalid') {
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '正文无效，未入库',
      acceptanceReasons: qualityWarnings.map(item => item.message).concat('正文未通过有效性检查且未入库。').slice(0, 3),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      ...admissionFields,
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: null,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (revisionNeedsRecheck) {
    return {
      visible: true,
      acceptanceStatus: 'needs_recheck',
      ...admissionFields,
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (qualityNeedsRevision) {
    const hasReportFix = Boolean(latestReport && extractMustFix({}, currentReport).length > 0)
    const key: WritingCockpitActionKey = hasReportFix ? 'apply_editor_revision' : 'create_editor_report'
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '需修订',
      acceptanceReasons: [
        approvalBlocker ? `${approvalBlocker.label}：${approvalBlocker.detail}` : '',
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key, label: ACTION_LABELS[key] },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!storyStateSynced) {
    return {
      visible: true,
      acceptanceStatus: 'needs_state_sync',
      ...admissionFields,
      statusLabel: '需同步故事状态',
      acceptanceReasons: [
        storyStatePanel?.headline || `故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`,
        ...(storyStatePanel?.reasons || []),
      ].filter(Boolean).slice(0, 4),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'sync_story_state', label: ACTION_LABELS.sync_story_state },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  return {
    visible: true,
    acceptanceStatus: 'ready_to_accept',
    ...admissionFields,
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    storylineSync,
    storyUnitSync,
    assetIntake,
    ipSceneIntake,
    signatureSceneSync,
    readabilityReview,
    deslopGateDiagnostics,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    first30RetentionRecheck,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
    deliveryRiskQueue,
    deliveryRiskConvergence,
    qualityScore: score,
    qualityStatus,
    mustFix,
    optionalImprovements,
    latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null,
    latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary,
    latestRevisionSummary,
    storyStateSynced,
    recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
    secondaryActions,
    shouldAutoExpandAcceptance: false,
  }
}

function buildHiddenHandoffDesk(): ChapterHandoffDeskModel {
  return {
    visible: false,
    status: 'hidden',
    label: '等待交接',
    fromChapterNo: null,
    toChapterNo: null,
    previousEnding: '',
    nextOpeningObligations: [],
    expectationCarryOver: [],
    deliveryRiskCarryOver: null,
    storyStateSynced: false,
    storylineStatusLabel: '',
    actionKey: 'write_draft',
    actionLabel: ACTION_LABELS.write_draft,
  }
}

function handoffItemText(item: any) {
  if (typeof item === 'string') return text(item)
  return firstNonEmpty(item?.text, item?.label, item?.name, item?.summary, item?.detail, item?.title)
}

function handoffTextItems(value: any): string[] {
  return Array.from(new Set(arrayValue(value).map(handoffItemText).filter(Boolean))).slice(0, 4)
}

function buildChapterHandoffDesk(args: {
  fromChapter: AnyRecord | null
  toChapter: AnyRecord | null
  acceptanceDesk: ChapterAcceptanceDeskModel
  reviews: AnyRecord[]
}): ChapterHandoffDeskModel {
  if (!args.fromChapter || !hasProse(args.fromChapter) || !args.toChapter) return buildHiddenHandoffDesk()

  const readerExpectationRef = latestReviewRef(args.reviews, args.fromChapter, 'reader_expectation_sync')
  const expectationPayload = readerExpectationSyncPayload(readerExpectationRef?.review || null)
  const expectationCarryOver = handoffTextItems(expectationPayload?.missed)
  const nextOpeningObligations = handoffTextItems(expectationPayload?.keep_alive)
  const ready = ['ready_to_accept', 'delivered', 'delivered_with_warnings'].includes(args.acceptanceDesk.acceptanceStatus)

  return {
    visible: true,
    status: ready ? 'ready' : 'needs_delivery',
    label: ready ? '可接下一章' : '先完成交稿',
    fromChapterNo: Number(args.fromChapter?.chapter_no || 0) || null,
    toChapterNo: Number(args.toChapter?.chapter_no || 0) || null,
    previousEnding: previousEnding(args.fromChapter),
    nextOpeningObligations,
    expectationCarryOver,
    deliveryRiskCarryOver: args.acceptanceDesk.deliveryRiskQueue || null,
    storyStateSynced: args.acceptanceDesk.storyStateSynced,
    storylineStatusLabel: args.acceptanceDesk.storylineSync?.label || '',
    actionKey: ready ? 'accept_chapter_and_continue' : args.acceptanceDesk.recommendedAcceptanceAction.key,
    actionLabel: ready ? '进入下一章开写' : '先完成交稿',
  }
}

function buildEpisodePlan(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
}): ChapterPlanningDeskModel['episodePlan'] {
  const target = contextTarget(args.contextPackage)
  const forbiddenRepeats = stringArray(target?.forbidden_repeats)
  const coreContract = normalizeCoreContractPlan(args.contextPackage, target)
  const readerDropRisk = normalizeReaderDropRiskPlan(args.contextPackage, target)
  const storyPressure = normalizeStoryPressurePlan(args.contextPackage, target)
  const storyDrive = normalizeStoryDrivePlan(args.contextPackage, target)
  const serialRhythm = normalizeSerialRhythmPlan(args.contextPackage, target)
  const pageTurnHook = normalizePageTurnHookPlan(args.contextPackage, target)
  const volumeClimax = normalizeVolumeClimaxPlan(args.contextPackage, target)
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverPlan(args.contextPackage, target)
  return {
    chapterObjective: firstNonEmpty(target?.chapter_goal, target?.chapterObjective, target?.goal, target?.summary, args.cockpitChapter?.chapterGoal),
    previousHandoff: firstNonEmpty(target?.previous_handoff, target?.previousHandoff, args.cockpitChapter?.previousEnding),
    coreConflict: firstNonEmpty(target?.core_conflict, target?.coreConflict, target?.conflict, args.cockpitChapter?.conflict),
    emotionalMovement: firstNonEmpty(target?.emotional_movement, target?.emotionalMovement, target?.emotion),
    payoff: firstNonEmpty(target?.payoff, target?.reader_reward, target?.readerReward),
    endingHook: firstNonEmpty(target?.ending_hook, target?.endingHook, args.cockpitChapter?.endingHook),
    forbiddenRepeats: forbiddenRepeats.length > 0
      ? forbiddenRepeats
      : (args.cockpitChapter?.forbiddenRepeats || []),
    coreContract,
    readerDropRisk,
    storyPressure,
    storyDrive,
    serialRhythm,
    pageTurnHook,
    volumeClimax,
    deliveryRiskCarryOver,
  }
}

function buildChapterPlanningDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
  diagnostics?: AnyRecord | null
}): ChapterPlanningDeskModel {
  const contextStatus = contextPackageStatus(args.contextPackage)
  const sceneCards = chapterSceneCards(args.nextChapter, args.contextPackage)
  const qualityContinuitySceneMap = buildQualityContinuitySceneMap(sceneCards)
  const scenePlanStatus: ChapterScenePlanStatus = sceneCards.length > 0 ? 'ready' : 'missing'
  const diagnosticBlockers = diagnosticsBlockers(args.diagnostics)
  const preflightBlockers = blockerTexts(contextPreflight(args.contextPackage)?.blockers)
  const writePreparationBrief = normalizeWritePreparationBrief(args.contextPackage)
  const writePreparationReasons = writePreparationReasonTexts(writePreparationBrief)
  const episodePlan = buildEpisodePlan(args)
  const director = normalizeOhStoryDirector(args.contextPackage)
  const directorActionKey = directorPlannerAction(director)
  const directorReadiness = text(director?.readiness)
  const qualityContinuityNeedsSceneMapping = deliveryRiskCarryOverNeedsSceneMapping(episodePlan.deliveryRiskCarryOver)
    && sceneCards.length > 0
    && qualityContinuitySceneMap.length === 0
    && !writePreparationBrief?.sourceGaps.length

  if (!args.nextChapter) {
    return {
      readiness: 'blocked',
      statusLabel: '缺目标章节',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['需要先创建或选择章节。'],
      recommendedPlannerAction: { key: 'open_outline_panel', label: ACTION_LABELS.open_outline_panel },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (director && directorActionKey && directorReadiness !== 'ready') {
    const blocked = directorReadiness === 'blocked'
    const reasons = directorPlanningReasons(director, blocked ? '总导演判断需要人工确认后继续。' : '总导演判断本章写前材料需要修复。')
    return {
      readiness: blocked ? 'blocked' : 'needs_context',
      statusLabel: blocked ? '需要确认' : '需要修复',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons,
      recommendedPlannerAction: {
        key: directorActionKey,
        label: directorActionLabel(director, directorActionKey),
      },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (diagnosticBlockers.length > 0) {
    return {
      readiness: 'blocked',
      statusLabel: '诊断阻塞',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: diagnosticBlockers.slice(0, 3).map(item => `生成诊断阻塞：${item}`),
      recommendedPlannerAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (contextStatus === 'missing') {
    return {
      readiness: 'needs_context',
      statusLabel: '需补上下文',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章还没有加载上下文包。'],
      recommendedPlannerAction: { key: 'refresh_context_package', label: ACTION_LABELS.refresh_context_package },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (contextStatus === 'insufficient') {
    const reasons = preflightBlockers.length > 0
      ? preflightBlockers.slice(0, 3).map(item => `上下文包预检未通过：${item}`)
      : ['上下文包预检未通过。']
    return {
      readiness: 'needs_context',
      statusLabel: '上下文不足',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons,
      recommendedPlannerAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (qualityContinuityNeedsSceneMapping) {
    return {
      readiness: 'needs_scene_plan',
      statusLabel: '需补质量续航落点',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['检测到 delivery_risk_carry_over / 质量续航动作，但当前场景卡没有写入 serial_risk_repairs、recent_fatigue_action、required_beats 或章末钩子落点。'],
      recommendedPlannerAction: { key: 'build_scene_plan', label: ACTION_LABELS.build_scene_plan },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (writePreparationBrief?.readinessStatus === 'needs_context' && writePreparationReasons.length > 0) {
    const actionKey: WritingCockpitActionKey = writePreparationBrief.sourceGaps.length > 0
      || writePreparationBrief.deliveryRiskActions.length > 0
      ? 'open_generation_diagnostics'
      : 'open_story_assets'
    return {
      readiness: 'needs_context',
      statusLabel: '写前准备待确认',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: writePreparationReasons.slice(0, 3),
      recommendedPlannerAction: { key: actionKey, label: ACTION_LABELS[actionKey] },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (scenePlanStatus === 'missing') {
    return {
      readiness: 'needs_scene_plan',
      statusLabel: '需补场景计划',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章还没有可用场景卡。'],
      recommendedPlannerAction: { key: 'build_scene_plan', label: ACTION_LABELS.build_scene_plan },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (director && directorActionKey && directorReadiness === 'ready') {
    return {
      readiness: 'ready',
      statusLabel: '可继续',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: directorPlanningReasons(director, '总导演判断本章写前材料可用。'),
      recommendedPlannerAction: {
        key: directorActionKey,
        label: directorActionLabel(director, directorActionKey),
      },
      shouldAutoExpandPlanner: false,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  if (args.cockpitChapter?.hasProse) {
    return {
      readiness: 'ready',
      statusLabel: '本章可审',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章已有正文，优先进入审阅修订。'],
      recommendedPlannerAction: { key: 'review_draft', label: ACTION_LABELS.review_draft },
      shouldAutoExpandPlanner: false,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }

  return {
    readiness: 'ready',
    statusLabel: '本章可写',
    contextPackageStatus: contextStatus,
    scenePlanStatus,
    reasons: ['本章场景计划已就绪，可以进入初稿。'],
    recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: ACTION_LABELS.confirm_plan_and_write_draft },
    shouldAutoExpandPlanner: false,
    writePreparationBrief,
    episodePlan,
    sceneCards,
    qualityContinuitySceneMap,
  }
}

const LONGFORM_SETUP_CHECK_KEYS = new Set<WritingReadinessCheck['key']>([
  'writing_bible_missing',
  'writing_bible_ready',
  'volume_goal_missing',
  'volume_goal_ready',
  'chapter_missing',
  'chapter_ready',
  'chapter_outline_missing',
  'chapter_outline_ready',
  'materials_not_ready',
  'materials_ready',
  'memory_unavailable',
  'memory_ready',
])

function workflowStatusFromChecks(checks: WritingReadinessCheck[]): LongformWorkflowStageStatus {
  if (checks.some(check => check.status === 'blocker')) return 'blocked'
  if (checks.some(check => check.status === 'warning')) return 'needs_action'
  return 'ready'
}

function workflowStatusFromPlanning(readiness: ChapterPlanningReadiness): LongformWorkflowStageStatus {
  if (readiness === 'blocked') return 'blocked'
  if (readiness === 'ready') return 'ready'
  return 'needs_action'
}

function compactWorkflowEvidence(items: string[], fallback: string) {
  const evidence = items.map(item => text(item)).filter(Boolean)
  return evidence.length ? evidence.slice(0, 6) : [fallback]
}

function buildLongformWorkflow(args: {
  readinessChecks: WritingReadinessCheck[]
  chapterPlanningDesk: ChapterPlanningDeskModel
  chapterAcceptanceDesk: ChapterAcceptanceDeskModel
}): LongformWorkflowModel {
  const setupChecks = args.readinessChecks.filter(check => LONGFORM_SETUP_CHECK_KEYS.has(check.key))
  const setupIssues = setupChecks.filter(check => check.status !== 'pass')
  const setupAction = setupIssues[0]?.actionKey || 'open_writing_bible'
  const setupStage: LongformWorkflowStageModel = {
    key: 'creation_setup',
    label: '开书设定',
    status: workflowStatusFromChecks(setupChecks),
    actionKey: setupAction,
    actionLabel: ACTION_LABELS[setupAction],
    evidence: compactWorkflowEvidence(
      setupIssues.map(check => check.label),
      '写作圣经、卷目标、目标章节和材料已就绪。',
    ),
    riskCount: setupIssues.length,
  }

  const planning = args.chapterPlanningDesk
  const preDraftEvidence = [
    `上下文包：${planning.contextPackageStatus === 'ready' ? '已就绪' : planning.contextPackageStatus === 'insufficient' ? '不足' : '缺失'}`,
    `场景卡：${planning.scenePlanStatus === 'ready' ? `${planning.sceneCards.length} 个` : '缺失'}`,
    ...planning.reasons,
  ]
  const preDraftStage: LongformWorkflowStageModel = {
    key: 'pre_draft',
    label: '写前准备',
    status: workflowStatusFromPlanning(planning.readiness),
    actionKey: planning.recommendedPlannerAction.key,
    actionLabel: planning.recommendedPlannerAction.label,
    evidence: compactWorkflowEvidence(preDraftEvidence, '上下文、场景卡和写前意图已就绪。'),
    riskCount: planning.readiness === 'ready' ? 0 : Math.max(1, planning.reasons.length),
  }

  const acceptance = args.chapterAcceptanceDesk
  const deliveryRiskCount = Number(acceptance.deliveryRiskQueue?.totalCount || 0)
  const reviewRiskCount = deliveryRiskCount + acceptance.mustFix.length
  const postDraftStatus: LongformWorkflowStageStatus = !acceptance.visible
    ? 'waiting'
    : reviewRiskCount > 0
      || ['needs_quality_check', 'needs_revision', 'needs_recheck'].includes(acceptance.acceptanceStatus)
      ? 'needs_action'
      : 'ready'
  const postDraftAction: WritingCockpitActionKey = reviewRiskCount > 0
    ? 'open_task_center'
    : acceptance.visible
      ? acceptance.recommendedAcceptanceAction.key
      : 'write_draft'
  const postDraftStage: LongformWorkflowStageModel = {
    key: 'post_draft_review',
    label: '写后诊断',
    status: postDraftStatus,
    actionKey: postDraftAction,
    actionLabel: ACTION_LABELS[postDraftAction],
    evidence: compactWorkflowEvidence(
      acceptance.visible
        ? [
            acceptance.statusLabel,
            ...acceptance.acceptanceReasons,
            ...(acceptance.deliveryRiskQueue?.items || []),
            acceptance.chapterAttraction?.label || '',
            acceptance.readerRetentionSync?.label || '',
            acceptance.storyUnitSync?.label || '',
            acceptance.signatureSceneSync?.label || '',
          ]
        : ['正文未生成，等待初稿。'],
      '交稿复检和章节诊断已通过。',
    ),
    riskCount: reviewRiskCount,
  }

  const repairReceiptRisk = Number(acceptance.qualityAuditRepairReceiptSync?.missedCount || 0)
    + Number(acceptance.revisionReceipt?.riskCount || 0)
    + Number(acceptance.deliveryRiskReceipt?.riskCount || 0)
    + Number(acceptance.deliveryRiskConvergence?.residualCount || 0)
  const continuityRiskCount = (!acceptance.visible || acceptance.storyStateSynced ? 0 : 1) + repairReceiptRisk
  const continuityStatus: LongformWorkflowStageStatus = !acceptance.visible
    ? 'waiting'
    : continuityRiskCount > 0
      ? 'needs_action'
      : 'ready'
  const continuityAction: WritingCockpitActionKey = acceptance.visible && !acceptance.storyStateSynced
    ? 'sync_story_state'
    : repairReceiptRisk > 0
      ? 'open_task_center'
      : acceptance.visible
        ? acceptance.recommendedAcceptanceAction.key
        : 'write_draft'
  const continuityStage: LongformWorkflowStageModel = {
    key: 'quality_continuity',
    label: '质量续航',
    status: continuityStatus,
    actionKey: continuityAction,
    actionLabel: ACTION_LABELS[continuityAction],
    evidence: compactWorkflowEvidence(
      acceptance.visible
        ? [
            acceptance.storyStateSynced ? '故事状态已同步' : '故事状态待同步',
            acceptance.qualityAuditRepairReceiptSync?.label || '',
            acceptance.revisionReceipt?.label || '',
            acceptance.deliveryRiskReceipt?.label || '',
            acceptance.deliveryRiskConvergence?.label || '',
          ]
        : ['等待正文和交稿复检后同步故事状态。'],
      '修复回执、故事状态和下一章交接已闭环。',
    ),
    riskCount: continuityRiskCount,
  }

  const stages = [setupStage, preDraftStage, postDraftStage, continuityStage]
  const currentStage = stages.find(stage => stage.status === 'blocked' || stage.status === 'needs_action')
    || stages.find(stage => stage.status === 'waiting')
    || continuityStage
  return {
    stages,
    currentStage,
    primaryAction: {
      key: currentStage.actionKey,
      label: currentStage.actionLabel,
    },
    riskCount: stages.reduce((sum, stage) => sum + stage.riskCount, 0),
  }
}

export function buildWritingCockpitModel(input: BuildWritingCockpitModelInput): WritingCockpitModel {
  const project = input.project || input.selectedProject || {}
  const outlines = arrayValue(input.outlines)
  const chapters = arrayValue(input.chapters)
  const activeRuns = arrayValue(input.activeRuns || input.runs)
  const nextChapter = chooseNextChapter(chapters, input.activeChapter)
  const sorted = sortChapters(chapters)
  const writtenChapters = sorted.filter(hasProse)
  const latestWrittenChapterNo = Math.max(0, ...writtenChapters.map(chapter => Number(chapter?.chapter_no || 0)))
  const chapterAfterNext = nextChapter
    ? sorted.find(chapter => Number(chapter?.chapter_no || 0) > Number(nextChapter?.chapter_no || 0)) || null
    : null
  const previousChapter = nextChapter
    ? [...writtenChapters].reverse().find(chapter => Number(chapter?.chapter_no || 0) < Number(nextChapter?.chapter_no || 0)) || null
    : writtenChapters[writtenChapters.length - 1] || null

  const writingBible = resolveWritingBible(project)
  const storyState = resolveStoryState(project)
  const volume = resolveVolume(outlines, writingBible, nextChapter)
  const nextChapterOutline = nextChapter ? chapterFromOutline(outlines, nextChapter) : null
  const previousChapterOutline = previousChapter ? chapterFromOutline(outlines, previousChapter) : null
  const writingBibleReady = writingBibleExists(writingBible)
  const volumeGoalReady = Boolean(text(volume.goal))
  const hasChapter = Boolean(nextChapter)
  const chapterOutlineReady = hasChapter ? chapterHasOutline(nextChapter, outlines) : false
  const materialsReady = materialReady(input.materialScore || input.commercialReadiness || input.diagnostics?.material_score || null)
  const storyStateReady = latestWrittenChapterNo === 0 || Number(storyState?.last_updated_chapter || 0) >= latestWrittenChapterNo
  const memorySummaryReady = memoryReady(input.memorySummary || null)
  const nextHasProse = hasProse(nextChapter)

  const readinessChecks = buildReadinessChecks({
    writingBibleReady,
    volumeGoalReady,
    hasChapter,
    chapterOutlineReady,
    materialsReady,
    storyStateReady,
    memoryReady: memorySummaryReady,
  })
  const readinessBlockers = readinessChecks.filter(check => check.status === 'blocker')
  const readinessWarnings = readinessChecks.filter(check => check.status === 'warning')
  const blockers = readinessBlockers.map(check => check.key)
  const cockpitNextChapter = nextChapter ? toCockpitChapter(nextChapter, { previousChapter, volumeGoal: volume.goal, outline: nextChapterOutline }) : null
  const cockpitPreviousChapter = previousChapter ? toCockpitChapter(previousChapter, { volumeGoal: volume.goal, outline: previousChapterOutline }) : null
  const chapterPlanningDesk = buildChapterPlanningDesk({
    nextChapter,
    cockpitChapter: cockpitNextChapter,
    contextPackage: input.contextPackage || null,
    diagnostics: input.diagnostics || null,
  })
  const reviews = arrayValue(input.reviews)
  const chapterAcceptanceDesk = buildChapterAcceptanceDesk({
    nextChapter,
    cockpitChapter: cockpitNextChapter,
    reviews,
    activeRuns,
    storyState,
  })
  const chapterHandoffDesk = buildChapterHandoffDesk({
    fromChapter: nextChapter,
    toChapter: chapterAfterNext,
    acceptanceDesk: chapterAcceptanceDesk,
    reviews,
  })
  const longformWorkflow = buildLongformWorkflow({
    readinessChecks,
    chapterPlanningDesk,
    chapterAcceptanceDesk,
  })
  const fallbackPrimary = resolvePrimaryAction({
    writingBibleReady,
    hasChapter,
    chapterOutlineReady,
    materialsReady,
    nextHasProse,
    storyStateReady,
  })
  const acceptanceAction = chapterAcceptanceDesk.visible
    ? chapterAcceptanceDesk.recommendedAcceptanceAction.key
    : null
  const primary = acceptanceAction
    ? { role: 'revision_editor' as WritingCockpitRole, action: acceptanceAction }
    : fallbackPrimary
  const { role, action } = primary

  return {
    topStatus: {
      projectTitle: text(project?.title, '未命名项目'),
      currentVolume: volume.title,
      writtenWords: writtenChapters.reduce((sum, chapter) => sum + compactWordCount(chapter?.chapter_text), 0),
      currentRoleLabel: ROLE_META[role].label,
      nextActionLabel: ACTION_LABELS[action],
      primaryActionKey: action,
    },
    nextChapter: cockpitNextChapter,
    previousChapter: cockpitPreviousChapter,
    chapterPlanningDesk,
    chapterAcceptanceDesk,
    chapterHandoffDesk,
    longformWorkflow,
    primaryActionKey: action,
    recommendedRole: role,
    readiness: {
      checks: readinessChecks,
      blockers: readinessBlockers,
      warnings: readinessWarnings,
    },
    blockers,
    readinessChecks,
    modelTeam: {
      recommendedRole: role,
      roles: (Object.keys(ROLE_META) as WritingCockpitRole[]).map(key => ({
        key,
        label: ROLE_META[key].label,
        description: key === 'operations_analyst' && activeRuns.length > 0
          ? `${ROLE_META[key].description}当前有 ${activeRuns.length} 个运行记录。`
          : ROLE_META[key].description,
        actionKey: ROLE_META[key].actionKey,
        active: key === role,
      })),
    },
    draftPipeline: pipelineState(nextChapter),
    writingQueue: buildWritingQueue(chapters, outlines, nextChapter),
    canonUpdatePreview: [
      '同步最近已写章节的关键事实',
      '检查人物立场与伏笔状态',
      '更新下一章可引用的王府人心变化',
    ],
  }
}
