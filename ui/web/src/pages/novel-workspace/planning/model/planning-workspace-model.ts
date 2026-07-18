import { wc } from '../../utils'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'

type AnyRecord = Record<string, any>

export type FuturePlanningCoverage = {
  ready: boolean
  planned: number
  required: number
  missingChapters: number[]
  label: string
}

export type PlanningHealthStatus = {
  status: 'healthy' | 'drifting' | 'needs_planning'
  label: string
}

export type PlanningActionKey =
  | 'update_rolling_plan'
  | 'complete_volume_plan'
  | 'enter_story_planning'
  | 'enter_chapter_writing'
  | 'open_outline_tree'
  | 'future100_audit'
  | 'future100_generate'
  | 'longform_pressure'
  | 'longform_creation_diagnosis'
  | 'topic_validation'
  | 'reference_diagnosis'
  | 'open_story_assets'
  | 'update_story_state'
  | 'open_quality_revision'
  | 'run_first30_retention'
  | 'create_first30_repair'
  | 'run_reader_trial_review'
  | 'create_reader_trial_repair'
  | 'create_delivery_risk_repair'
  | 'record_storyline_diff_decision'
  | 'create_storyline_decision_tasks'
  | 'open_task_center'

export type PlanningHealthIssue = {
  key: 'missing_reader_promise' | 'missing_volume_goal' | 'future10_incomplete' | 'story_state_stale' | 'material_weak'
  severity: 'critical' | 'warning'
  title: string
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningRhythmSignal = {
  key: 'core' | 'volume' | 'payoff' | 'fatigue'
  label: string
  status: 'ok' | 'warn' | 'block'
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningVolumeBeat = {
  key: string
  label: string
  chapterNo: number | null
  type: '小高潮' | '中高潮' | '卷末爆点' | '待补'
  status: 'planned' | 'missing'
  detail: string
}

export type PlanningVolumeTreeNode = {
  id: any
  title: string
  level: string
  startChapter?: number
  endChapter?: number
  chapterNo?: number
  wordCount?: number
  children: PlanningVolumeTreeNode[]
}

export type PlanningStorylineBoardItem = {
  id: any
  name: string
  entityType: string
  typeLabel: string
  summary: string
  priority: string
  status: string
  startChapter: number | null
  endChapter: number | null
  lastAdvancedChapter: number | null
  nextAdvanceChapter: number | null
  payoffStatus: string
  expectedPayoff: string
  relatedNames: string[]
  advanceRule: string
  forbiddenReveal: string
  riskTags: string[]
  retentionImpacts: string[]
  planEvidence: Array<{
    chapterNo: number | null
    usageType: string
    summary: string
  }>
  actualEvidence: Array<{
    chapterNo: number | null
    usageType: string
    summary: string
  }>
  diffEvidence: Array<{
    decisionKey: string
    chapterNo: number | null
    entityId: any
    entityName: string
    entityType: string
    riskType: 'missed' | 'unplanned' | 'forbidden_touched'
    riskLabel: string
    usageType: string
    summary: string
    evidence: string
    recommendedDecision: 'revise_prose' | 'accept_as_plan' | 'false_positive'
    recommendedActionLabel: '回修正文' | '接受为新计划' | '标记误判'
    recommendedActionDetail: string
  }>
  syncRisks: string[]
  latestSyncChapter: number | null
  actionChapterNo: number
}

export type PlanningStorylineBoardGroup = {
  key: string
  label: string
  count: number
  items: PlanningStorylineBoardItem[]
}

export type PlanningStoryUnitSignal = {
  key: 'entry_hook' | 'pressure_escalation' | 'mini_climax_payoff' | 'setup_and_storyline' | 'exit_hook'
  label: string
  status: 'ok' | 'warn' | 'block'
  score: number
  count: number
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningStoryUnit = {
  key: string
  title: string
  chapterRangeLabel: string
  startChapter: number
  endChapter: number
  status: 'ready' | 'needs_attention' | 'blocked'
  score: number
  summary: string
  chapters: Array<{
    chapterNo: number
    title: string
    role: string
    goal: string
  }>
  signals: PlanningStoryUnitSignal[]
}

export type PlanningBattleDeskLane = {
  key: 'story_core' | 'reader_pull' | 'storyline' | 'volume_beat' | 'innovation_ip' | 'production_fuel'
  label: string
  status: 'ok' | 'warn' | 'block'
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningLongformSpineAxis = {
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
  status: 'ok' | 'missing'
}

export type PlanningCoreContractRadarCheck = {
  key: 'reader_promise' | 'protagonist_drive' | 'core_conflict' | 'chapter_service' | 'reader_payoff' | 'innovation_hook'
  label: string
  status: 'ok' | 'warn' | 'block'
  score: number
  detail: string
  evidence: string[]
}

export type PlanningMillionWordMilestone = {
  key: string
  label: string
  targetWords: number
  targetChapter: number | null
  status: 'achieved' | 'current' | 'future' | 'needs_plan'
  theme: string
  protagonistState: string
  worldExpansion: string
  conflictEscalation: string
  readerPayoff: string
  riskTags: string[]
  actionKey: PlanningActionKey
}

export type PlanningLongformMemoryCapsule = {
  status: 'ready' | 'needs_sync' | 'missing'
  score: number
  label: string
  summary: string
  lastUpdatedChapter: number | null
  corePromise: string
  currentVolumeGoal: string
  mainlineProgress: string
  characterStates: string[]
  openQuestions: string[]
  payoffDebts: string[]
  canonFacts: string[]
  redLines: string[]
  actionKey: PlanningActionKey
}

export type PlanningCreationPipelineStage = {
  key: 'book_core' | 'longform_plan' | 'story_assets' | 'chapter_launch' | 'delivery_acceptance' | 'serial_release'
  label: string
  status: 'ok' | 'warn' | 'block'
  active: boolean
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningSerialReleaseDesk = {
  status: 'ready' | 'needs_buffer' | 'blocked' | 'needs_planning'
  score: number
  label: string
  summary: string
  dailyTargetChapters: number
  minBufferDays: number
  lastPublishedChapter: number
  publishableChapters: number
  bufferDays: number
  primaryAction: {
    key: PlanningActionKey
    label: string
    reason: string
  }
  pipeline: Array<{
    key: 'published' | 'publishable' | 'needs_revision' | 'drafting' | 'planned'
    label: string
    count: number
    detail: string
    status: 'ok' | 'warn' | 'block'
    actionKey: PlanningActionKey
  }>
  releaseWindow: Array<{
    chapterNo: number
    title: string
    wordCount: number
    status: 'published' | 'publishable' | 'needs_revision' | 'drafting' | 'planned'
    riskTags: string[]
  }>
  riskChapters: Array<{
    chapterNo: number
    title: string
    riskTags: string[]
  }>
  nextActions: string[]
}

export type PlanningWorkspaceModel = {
  topStatus: {
    projectTitle: string
    currentVolume: string
    currentStage: string
    currentChapterLabel: string
    writtenWords: number
    targetWords: number
    future10Coverage: FuturePlanningCoverage
    future100Coverage: FuturePlanningCoverage
    longformHealth: PlanningHealthStatus
  }
  mainline: {
    readerPromise: string
    currentVolumeGoal: string
    currentStageConflict: string
    payoffModel: string
    previousTurn: string
    nextTurn: string
    currentChapterServesVolume: boolean
    risks: string[]
  }
  creationPipeline: {
    currentStageKey: PlanningCreationPipelineStage['key']
    summary: string
    riskCount: number
    primaryAction: {
      key: PlanningActionKey
      label: string
      reason: string
    }
    stages: PlanningCreationPipelineStage[]
  }
  longformSpineGuard: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    sourceLabel: string
    readerPromise: string
    actionKey: PlanningActionKey
    axes: PlanningLongformSpineAxis[]
    immutableRules: string[]
    flexibleZones: string[]
    missingAxes: string[]
  }
  coreContractRadar: {
    status: 'ready' | 'needs_action' | 'blocked'
    score: number
    label: string
    summary: string
    primaryAction: {
      key: PlanningActionKey
      label: string
      reason: string
    }
    checks: PlanningCoreContractRadarCheck[]
    mustServe: string[]
    noDrift: string[]
    riskTags: string[]
  }
  millionWordMilestones: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    sourceLabel: string
    total: number
    currentMilestone: PlanningMillionWordMilestone | null
    nextMilestone: PlanningMillionWordMilestone | null
    milestones: PlanningMillionWordMilestone[]
    actionKey: PlanningActionKey
    nextActions: string[]
  }
  longformMemoryCapsule: PlanningLongformMemoryCapsule
  futureRoute: Array<{
    chapterNo: number
    title: string
    chapterTask: string
    conflict: string
    endingHook: string
    mainlineProgress: string
    riskTags: string[]
  }>
  first30Retention: {
    status: 'missing' | 'ready' | 'needs_repair' | 'blocked' | 'stale'
    score: number | null
    summary: string
    promiseReady: boolean
    stale: boolean
    actionKey: PlanningActionKey
    segments: Array<{
      key: string
      label: string
      score: number
      coverage: number
      hookRate: number
      payoffAverage: number
      chapterCount: number
    }>
    chapterCards: Array<{
      chapterId: any
      chapterNo: number
      title: string
      score: number
      wordCount: number
      flags: string[]
      riskLevel: 'ok' | 'medium' | 'high'
    }>
    risks: Array<{
      severity: string
      segment: string
      issue: string
      action: string
    }>
    nextActions: string[]
  }
  readerTrustLedger: {
    status: 'missing' | 'ready' | 'needs_attention'
    score: number | null
    summary: string
    actionKey: PlanningActionKey
    expectationDebtCount: number
    payoffDebtCount: number
    retentionMissedCount: number
    keepAliveCount: number
    signals: Array<{
      key: 'expectation' | 'payoff' | 'retention' | 'keep_alive'
      label: string
      status: 'ok' | 'warn'
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
  }
  readerTrialRoom: {
    status: 'missing' | 'ready' | 'needs_repair' | 'blocked'
    score: number | null
    summary: string
    qualityBar: string
    actionKey: PlanningActionKey
    personas: Array<{
      key: 'payoff_reader' | 'plot_reader' | 'setting_reader' | 'trial_reader' | string
      label: string
      focus: string
      verdict: string
      score: number
      riskLevel: 'low' | 'medium' | 'high'
    }>
    segments: Array<{
      key: string
      label: string
      score: number
      verdict: string
    }>
    dropPoints: string[]
    pullPoints: string[]
    repairActions: string[]
  }
  innovationRadar: {
    status: 'missing' | 'ready' | 'needs_attention'
    score: number | null
    summary: string
    actionKey: PlanningActionKey
    missedCount: number
    plannedCount: number
    deliveredCount: number
    nextActions: string[]
    signals: Array<{
      key: 'chapter_angle' | 'execution' | 'differentiation' | 'ip_adaptation'
      label: string
      status: 'ok' | 'warn'
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
  }
  storylineBoard: {
    status: 'missing' | 'ready' | 'needs_attention'
    summary: string
    total: number
    overdueCount: number
    debtCount: number
    retentionRiskCount: number
    groups: PlanningStorylineBoardGroup[]
  }
  characterArcBoard: {
    status: 'missing' | 'ready' | 'needs_attention'
    summary: string
    total: number
    growthGapCount: number
    overdueCount: number
    relationshipRiskCount: number
    actionKey: PlanningActionKey
    arcs: Array<{
      id: any
      name: string
      entityType: 'character_arc' | 'relationship_arc'
      typeLabel: string
      summary: string
      priority: string
      relatedNames: string[]
      currentState: string
      desire: string
      flawPressure: string
      growthTarget: string
      relationshipShift: string
      voiceAnchor: string
      forbiddenReveal: string
      lastAdvancedChapter: number | null
      nextAdvanceChapter: number | null
      riskTags: string[]
      latestEvidence: string[]
      actionChapterNo: number
    }>
  }
  governanceHub: {
    status: 'ready' | 'needs_action' | 'blocked'
    summary: string
    primaryAction: {
      key: PlanningActionKey
      label: string
      reason: string
    }
    checkpoints: Array<{
      key: 'delivery_risk' | 'first30_retention' | 'reader_trial' | 'storyline' | 'asset_intake' | 'longform_material'
      label: string
      status: 'ok' | 'warn' | 'block'
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
  }
  serialReleaseDesk: PlanningSerialReleaseDesk
  longformRhythm: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    currentBandLabel: string
    signals: PlanningRhythmSignal[]
    nextActions: string[]
  }
  longformBattleDesk: {
    status: 'ready' | 'needs_action' | 'blocked'
    score: number
    label: string
    summary: string
    primaryAction: {
      key: PlanningActionKey
      label: string
      reason: string
    }
    lanes: PlanningBattleDeskLane[]
    riskChips: string[]
  }
  volumeBeatBudget: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    currentVolumeTitle: string
    chapterRange: string
    totalChapters: number
    plannedChapterCount: number
    climaxTarget: number
    climaxCount: number
    payoffTarget: number
    payoffCount: number
    beats: PlanningVolumeBeat[]
    nextActions: string[]
  }
  volumeSegmentGate: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    currentSegmentLabel: string
    actionKey: PlanningActionKey
    chapterProgress: {
      written: number
      total: number
      percent: number
    }
    signals: Array<{
      key: 'volume_goal' | 'climax_payoff' | 'reader_trust' | 'innovation_ip' | 'risk_closure'
      label: string
      status: 'ok' | 'warn' | 'block'
      score: number
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
    nextActions: string[]
  }
  recentFatigueRadar: {
    status: 'ready' | 'needs_attention'
    score: number
    label: string
    summary: string
    chapterRangeLabel: string
    actionKey: PlanningActionKey
    signals: Array<{
      key: 'conflict_variety' | 'payoff_variety' | 'hook_variety' | 'scene_freshness'
      label: string
      status: 'ok' | 'warn'
      score: number
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
    nextActions: string[]
  }
  storyPressureLadder: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    chapterRangeLabel: string
    actionKey: PlanningActionKey
    pressureSources: Array<{
      label: string
      count: number
      chapters: number[]
      riskLevel: 'ok' | 'warn'
    }>
    signals: Array<{
      key: 'pressure_source' | 'conflict_escalation' | 'stakes_growth' | 'reversal_pressure'
      label: string
      status: 'ok' | 'warn' | 'block'
      score: number
      count: number
      detail: string
      actionKey: PlanningActionKey
    }>
    nextActions: string[]
  }
  storyUnitWorkshop: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    actionKey: PlanningActionKey
    currentUnit: PlanningStoryUnit
    units: PlanningStoryUnit[]
    nextActions: string[]
  }
  volumeTree: PlanningVolumeTreeNode[]
  healthIssues: PlanningHealthIssue[]
}

export * from './planning-workspace-builder'
