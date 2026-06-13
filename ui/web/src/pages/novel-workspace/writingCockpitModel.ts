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
      requiredActions: string[]
      openingActions: string[]
      middleActions: string[]
      endingActions: string[]
    }
  }
  sceneCards: ChapterPlanningDeskSceneCard[]
}

export type ChapterAcceptanceStatus =
  | 'hidden'
  | 'needs_quality_check'
  | 'needs_revision'
  | 'needs_recheck'
  | 'needs_state_sync'
  | 'ready_to_accept'
  | 'delivered'

export interface ChapterAcceptanceDeskModel {
  visible: boolean
  acceptanceStatus: ChapterAcceptanceStatus
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
    memeLabel: string
    riskLabel: string
    riskCount: number
  } | null
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
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认计划，进入初稿',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '同步故事状态',
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

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
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
  return Boolean(compact && !chapterText.includes('【占位正文】'))
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
  const requiredActions = stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions || raw?.actions)
  const stagedActions = categorizeDeliveryRiskActions(requiredActions)
  return {
    label: firstNonEmpty(raw?.label, Number.isFinite(totalCount) && totalCount > 0 ? `待修复 ${totalCount}` : ''),
    priorityLabel: firstNonEmpty(raw?.priority_label, raw?.priorityLabel, raw?.priority, raw?.focus),
    items,
    requiredActions,
    openingActions: stagedActions.openingActions,
    middleActions: stagedActions.middleActions,
    endingActions: stagedActions.endingActions,
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
    wordCount: hasProse(chapter) ? compactWordCount(chapter?.chapter_text) : 0,
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
  const target = contextTarget(contextPackage)
  const blockers = blockerTexts(preflight?.blockers)
  if (preflight?.ready === false || blockers.length > 0) return 'insufficient'
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

function chapterSceneCards(chapter?: AnyRecord | null): ChapterPlanningDeskSceneCard[] {
  const rawCards = Array.isArray(chapter?.scene_list) && chapter.scene_list.length > 0
    ? chapter.scene_list
    : (Array.isArray(chapter?.scene_breakdown) ? chapter.scene_breakdown : [])

  return rawCards.map((scene: AnyRecord, index: number) => {
    const sceneNo = Number(scene?.scene_no)
    const card = {
      sceneNo: Number.isFinite(sceneNo) && sceneNo > 0 ? sceneNo : index + 1,
      title: text(scene?.title || scene?.name || scene?.description || scene?.purpose, `场景 ${index + 1}`),
      purpose: firstNonEmpty(scene?.purpose, scene?.description, scene?.goal),
      conflict: firstNonEmpty(scene?.conflict, scene?.tension),
      turn: firstNonEmpty(scene?.turn, scene?.reveal, scene?.beat),
      endingHook: firstNonEmpty(scene?.ending_hook, scene?.endingHook, scene?.exit_state, scene?.hook),
    }
    return card
  }).filter(card => Boolean(card.purpose || card.conflict || card.turn || card.endingHook))
}

const QUALITY_PASS_THRESHOLD = 78
type ReviewRef = { review: AnyRecord; index: number }

function parseReviewPayload(review: AnyRecord): AnyRecord | null {
  const value = review?.payload || review?.raw_payload
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
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
  const immersionRiskCount = Array.isArray(memeSense?.immersion_risks)
    ? memeSense.immersion_risks.length
    : countArray(payload?.immersion_risks)
  const riskCount = immersionRiskCount
    + (openingHookRisk ? 1 : 0)
    + (endingHookRisk ? 1 : 0)
    + (sceneReadabilityRisk ? 1 : 0)
    + (payoffDensityRisk ? 1 : 0)
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
    memeLabel: intensity ? `网感${intensity}` : '网感未评',
    riskLabel: openingHookRisk
      ? `开篇吸引力弱 ${safeOpeningScore}`
      : endingHookRisk
        ? `章末翻页弱 ${safeEndingScore}`
        : sceneReadabilityRisk
          ? `场景推进弱 ${safeSceneScore}`
          : payoffDensityRisk
            ? `爽点密度弱 ${safePayoffScore}`
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
  readerRetentionSync: ChapterAcceptanceDeskModel['readerRetentionSync']
  chapterAttraction: ChapterAcceptanceDeskModel['chapterAttraction']
  storyDriveSync: ChapterAcceptanceDeskModel['storyDriveSync']
  characterArcSync: ChapterAcceptanceDeskModel['characterArcSync']
  chapterBenchmarkSync: ChapterAcceptanceDeskModel['chapterBenchmarkSync']
  styleSampleSync: ChapterAcceptanceDeskModel['styleSampleSync']
  innovationSync: ChapterAcceptanceDeskModel['innovationSync']
  volumeBeatSync: ChapterAcceptanceDeskModel['volumeBeatSync']
  governanceRecheckSync: ChapterAcceptanceDeskModel['governanceRecheckSync']
}): ChapterAcceptanceDeskModel['deliveryRiskQueue'] {
  const risks: Array<{ count: number; item: string; priorityLabel: string }> = []
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
      : { count: args.readabilityReview.riskCount, item: `调可读性：${args.readabilityReview.riskLabel}`, priorityLabel: '优先调可读性' })
  }

  const totalCount = risks.reduce((sum, risk) => sum + risk.count, 0)
  if (totalCount <= 0) return null

  return {
    totalCount,
    label: `待修复 ${totalCount}`,
    priorityLabel: risks[0]?.priorityLabel || '优先复盘本章',
    items: risks.map(risk => risk.item),
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

function buildHiddenAcceptanceDesk(): ChapterAcceptanceDeskModel {
  return {
    visible: false,
    acceptanceStatus: 'hidden',
    statusLabel: '等待正文',
    acceptanceReasons: ['本章还没有正文，先完成章节计划和初稿。'],
    storylineSync: null,
    storyUnitSync: null,
    assetIntake: null,
    ipSceneIntake: null,
    signatureSceneSync: null,
    readabilityReview: null,
    coreDrift: null,
    runwaySync: null,
    readerPayoffSync: null,
    readerExpectationSync: null,
    readerRetentionSync: null,
    chapterAttraction: null,
    storyDriveSync: null,
    characterArcSync: null,
    chapterBenchmarkSync: null,
    styleSampleSync: null,
    first30RetentionRecheck: null,
    innovationSync: null,
    volumeBeatSync: null,
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
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter || !hasProse(args.nextChapter)) return buildHiddenAcceptanceDesk()

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
  const latestIpSceneIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'ip_scene_intake')
  const latestSignatureSceneSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'signature_scene_sync')
  const latestReadabilityRef = latestReviewRef(args.reviews, args.nextChapter, 'readability_review')
  const latestCoreDriftRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_core_drift')
  const latestRunwaySyncRef = latestReviewRef(args.reviews, args.nextChapter, 'runway_sync')
  const latestReaderPayoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_payoff_sync')
  const latestReaderExpectationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_expectation_sync')
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
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
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
  const readerRetentionSync = buildReaderRetentionSyncSummary(latestReaderRetentionSyncRef?.review || null)
  const chapterAttraction = buildChapterAttractionSummary(latestChapterAttractionRef?.review || null)
  const storyDriveSync = buildStoryDriveSyncSummary(latestStoryDriveSyncRef?.review || null)
  const characterArcSync = buildCharacterArcSyncSummary(latestCharacterArcSyncRef?.review || null)
  const chapterBenchmarkSync = buildChapterBenchmarkSyncSummary(latestChapterBenchmarkSyncRef?.review || null)
  const styleSampleSync = buildStyleSampleSyncSummary(latestStyleSampleSyncRef?.review || null)
  const first30RetentionRecheck = buildFirst30RetentionRecheckSummary(args.nextChapter, args.reviews)
  const innovationSync = buildInnovationSyncSummary(latestInnovationSyncRef?.review || null)
  const volumeBeatSync = buildVolumeBeatSyncSummary(latestVolumeBeatSyncRef?.review || null)
  const governanceRecheckSync = buildGovernanceRecheckSyncSummary(latestGovernanceRecheckSyncRef?.review || null)
  const deliveryRiskConvergence = buildDeliveryRiskConvergenceSummary(latestDeliveryRiskConvergenceRef?.review || null)
  const quality = qualityPayload(latestQuality)
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const currentReport = reportBelongsToCurrentQualityCycle({
    reportRef: latestReportRef,
    qualityRef: latestQualityRef,
    revisionRef: latestRevisionRef,
  }) ? report : {}
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
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    innovationSync,
    volumeBeatSync,
    governanceRecheckSync,
  })
  const storyStateSynced = Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
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
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions: Array<{ key: WritingCockpitActionKey; label: string }> = [
    { key: 'review_draft', label: '查看交稿质检' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
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
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
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
      statusLabel: '需修订',
      acceptanceReasons: [
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
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
      statusLabel: '需同步故事状态',
      acceptanceReasons: [`故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
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
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    storylineSync,
    storyUnitSync,
    assetIntake,
    ipSceneIntake,
    signatureSceneSync,
    readabilityReview,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    first30RetentionRecheck,
    innovationSync,
    volumeBeatSync,
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
  const ready = args.acceptanceDesk.acceptanceStatus === 'ready_to_accept' || args.acceptanceDesk.acceptanceStatus === 'delivered'

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
  const sceneCards = chapterSceneCards(args.nextChapter)
  const scenePlanStatus: ChapterScenePlanStatus = sceneCards.length > 0 ? 'ready' : 'missing'
  const diagnosticBlockers = diagnosticsBlockers(args.diagnostics)
  const preflightBlockers = blockerTexts(contextPreflight(args.contextPackage)?.blockers)
  const episodePlan = buildEpisodePlan(args)

  if (!args.nextChapter) {
    return {
      readiness: 'blocked',
      statusLabel: '缺目标章节',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['需要先创建或选择章节。'],
      recommendedPlannerAction: { key: 'open_outline_panel', label: ACTION_LABELS.open_outline_panel },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
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
      episodePlan,
      sceneCards,
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
      episodePlan,
      sceneCards,
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
      episodePlan,
      sceneCards,
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
      episodePlan,
      sceneCards,
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
      episodePlan,
      sceneCards,
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
    episodePlan,
    sceneCards,
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
    storyState,
  })
  const chapterHandoffDesk = buildChapterHandoffDesk({
    fromChapter: nextChapter,
    toChapter: chapterAfterNext,
    acceptanceDesk: chapterAcceptanceDesk,
    reviews,
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
