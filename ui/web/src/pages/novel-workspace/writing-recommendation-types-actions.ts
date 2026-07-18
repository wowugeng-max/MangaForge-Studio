import type { DeslopGateDiagnosticsModel, WritingCockpitActionKey } from './writingCockpitModel'

export type NovelWritingRecommendedActionKey = 'diagnostics' | 'scene_cards' | 'repair_generate' | 'generate' | 'quality_card'
export type NovelDeliveryActionKey = WritingCockpitActionKey

export type NovelWritingRecommendation = {
  key: NovelWritingRecommendedActionKey
  phase: 'prep' | 'draft' | 'review'
  label: string
  reason: string
}

export type NovelWritingResponsibility = {
  roleLabel: string
  phaseLabel: string
  actionLabel: string
  focus: string
  tone: 'editor' | 'planner' | 'writer' | 'reviewer'
}

export type NovelDeliverySummaryInput = {
  visible: boolean
  acceptanceStatus:
    | 'hidden'
    | 'needs_quality_check'
    | 'needs_revision'
    | 'needs_recheck'
    | 'needs_state_sync'
    | 'ready_to_accept'
    | 'delivered_with_warnings'
    | 'delivered'
  admissionStatus?: 'accepted' | 'accepted_with_warnings' | 'blocked_invalid' | ''
  qualityWarnings?: Array<{ code: string; source: string; message: string }>
  storyStateStatus?: 'synced' | 'pending' | ''
  storyStatePanel?: {
    visible?: boolean
    status?: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps'
    statusLabel?: string
    headline?: string
    summary?: string
    reasons?: string[]
    guidance?: string
    chapterNo?: number
    lastUpdatedChapter?: number
    canSync?: boolean
    primaryAction?: { key: NovelDeliveryActionKey; label: string } | null
  } | null
  postCommitWarnings?: Array<{ stage: string; message: string }>
  statusLabel: string
  acceptanceReasons: string[]
  qualityScore: number | null
  storyStateSynced: boolean
  storylineSync?: {
    status: 'ok' | 'warn'
    label: string
    completedCount: number
    missedCount: number
    unplannedCount: number
    forbiddenCount: number
  } | null
  storyUnitSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    rushedCount: number
    forbiddenCount: number
    riskCount: number
  } | null
  assetIntake?: {
    status: 'pending' | 'applied'
    label: string
    pendingCount: number
  } | null
  ipSceneIntake?: {
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
  signatureSceneSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    plannedCount: number
  } | null
  readabilityReview?: {
    score: number | null
    scoreLabel: string
    memeLabel: string
    riskLabel: string
    riskCount: number
    aiSmellLabel?: string
    aiSmellRisk?: boolean
    aiSmellHitCount?: number
    aiSmellTactics?: string[]
  } | null
  deslopGateDiagnostics?: DeslopGateDiagnosticsModel | null
  coreDrift?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  runwaySync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  readerPayoffSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    debtCount: number
  } | null
  readerExpectationSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  qualityAuditSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  qualityAuditRepairReceiptSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    receiptCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffDeltaSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  writePreparation?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  readerRetentionSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  chapterAttraction?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    weakCount: number
    priorityLabel: string
  } | null
  storyDriveSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  characterArcSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  chapterBenchmarkSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  styleSampleSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    copyRiskCount: number
  } | null
  first30RetentionRecheck?: {
    status: 'stale'
    label: string
    reason: string
  } | null
  innovationSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  volumeBeatSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  blueprintReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    deliveredCount: number
    totalCount: number
    missedCount: number
    evidence: string[]
    missed: string[]
  } | null
  revisionReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  deliveryRiskReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  sceneCardReceipt?: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    scenes: string[]
    fields: string[]
  } | null
  qualityAudit?: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    checks: string[]
    fixes: string[]
    strategies: string[]
  } | null
  platformRubric?: {
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
  approvalBlocker?: {
    type: 'quality_gate' | 'low_score' | 'draft' | 'safety' | 'reference_safety_blocked' | 'blocked_invalid'
    status: 'warn'
    label: string
    detail: string
    scoreLabel: string
    reasons: string[]
  } | null
  deliveryRiskQueue?: {
    totalCount: number
    label: string
    priorityLabel: string
    items: string[]
  } | null
  deliveryRiskConvergence?: {
    status: 'cleared' | 'improved' | 'unchanged' | 'worse'
    label: string
    residualCount: number
    resolvedCount: number
    nextAction: string
  } | null
  recommendedAcceptanceAction: {
    key: NovelDeliveryActionKey
    label: string
  }
  secondaryActions?: Array<{ key: NovelDeliveryActionKey; label: string }>
}

