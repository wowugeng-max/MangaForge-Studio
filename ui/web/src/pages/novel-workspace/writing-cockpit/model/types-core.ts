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
  /** P1 角色视角 */
  povCharacter: string
  decisionInScene: string
  wantNow: string
  fearOrCostNow: string
  emotionFromPov: string
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
  characterPov: {
    primaryPov: string
    povIntensity: string
    multiPovLocked: boolean
    allowedSecondaryPovs: string[]
    knowledgePreview: string[]
    secondaryCutPreview?: string[]
    assetFirewallPreview?: string[]
    dialogueFilterPreview?: string[]
    scenes: Array<{
      sceneNo: number
      povCharacter: string
      decisionInScene: string
      wantNow: string
      fearOrCostNow: string
    }>
    statusLabel: string
    status: 'ok' | 'warn' | 'fail' | 'empty'
    violations: Array<{ key: string; label: string; evidence: string; fix: string }>
  } | null
  qualityContinuitySceneMap: ChapterQualityContinuitySceneMapItem[]
}

