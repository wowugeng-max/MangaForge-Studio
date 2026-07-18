export type AnyRecord = Record<string, any>

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
