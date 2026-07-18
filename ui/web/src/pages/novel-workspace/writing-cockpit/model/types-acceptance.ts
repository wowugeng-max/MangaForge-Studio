import type { WritingCockpitActionKey } from './types-core'

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

