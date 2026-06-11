import { wc } from './utils'

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

export type BuildPlanningWorkspaceModelInput = {
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[]
  chapters?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  reviews?: AnyRecord[] | null
  settingEntities?: AnyRecord[] | null
  productionTasks?: AnyRecord | null
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function chapterRange(item: AnyRecord) {
  const start = Number(item?.start_chapter ?? item?.chapter_no ?? 0)
  const end = Number(item?.end_chapter ?? item?.start_chapter ?? item?.chapter_no ?? start)
  return { start, end }
}

function chapterInRange(chapterNo: number, item: AnyRecord) {
  const { start, end } = chapterRange(item)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

function outlineLevel(item: AnyRecord) {
  return text(item?.outline_level || item?.level || item?.outline_type).toLowerCase()
}

function isVolume(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'volume' || level === '卷'
}

function isStage(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'stage' || level === 'arc' || level === '阶段'
}

function isTurn(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'turning_point' || level === 'turn' || level === 'plot_turn' || level === '转折'
}

function isClimaxOutline(item: AnyRecord) {
  const level = outlineLevel(item)
  const title = text(item?.title)
  return isTurn(item) || /climax|高潮|爆点|反转|转折/.test(level) || /高潮|爆点|反转|转折/.test(title)
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

function titleMatches(a: any, b: any) {
  const left = text(a)
  const right = text(b)
  return Boolean(left && right && (left.includes(right) || right.includes(left)))
}

function resolveVolumeFromBible(writingBible: AnyRecord, currentVolume?: AnyRecord) {
  const volumes = arrayValue(writingBible?.volumes)
  const matched = volumes.find(volume => titleMatches(currentVolume?.title, volume?.title))
  if (matched) return matched
  return currentVolume?.title ? {} : volumes[0] || {}
}

function resolveStageFromBible(volume: AnyRecord, currentStage?: AnyRecord) {
  const stages = arrayValue(volume?.stages)
  const matched = stages.find(stage => titleMatches(currentStage?.title, stage?.title))
  if (matched) return matched
  return currentStage?.title ? {} : stages[0] || {}
}

function routeRiskTags(chapter: AnyRecord, activeTurns: AnyRecord[] = []) {
  const tags: string[] = []
  if (!text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task)) tags.push('缺章节任务')
  if (!text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook)) tags.push('缺结尾钩子')
  if (!text(chapter?.conflict || chapter?.raw_payload?.conflict)) tags.push('缺冲突')
  if (!text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)) tags.push('主线推进弱')

  const isTurningPoint = activeTurns.some(turn => chapterInRange(Number(chapter?.chapter_no), turn))
  if (isTurningPoint && !text(chapter?.turning_point_task || chapter?.raw_payload?.turning_point_task)) {
    tags.push('缺章节任务')
  }

  return Array.from(new Set(tags))
}

function outlineChapterNo(outline: AnyRecord) {
  const rawNo = Number(outline?.raw_payload?.chapter_no || outline?.raw_payload?.future100?.chapter_no || outline?.raw_payload?.skeleton?.chapter_no || outline?.raw_payload?.rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = text(outline?.title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function futureSkeletonPlanFromOutline(outline: AnyRecord) {
  const future = outline?.raw_payload?.rollingPlan || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton || {}
  const chapterNo = outlineChapterNo(outline)
  if (!chapterNo) return null
  return {
    id: outline.id,
    chapter_no: chapterNo,
    title: firstNonEmpty(future?.title, outline?.title),
    chapter_goal: firstNonEmpty(future?.chapter_goal, outline?.summary),
    conflict: firstNonEmpty(future?.conflict, arrayValue(outline?.conflict_points)[0]),
    ending_hook: firstNonEmpty(future?.ending_hook, outline?.hook),
    raw_payload: {
      ...(outline?.raw_payload || {}),
      mainline_progress: firstNonEmpty(
        future?.mainline_progress,
        future?.volume_stage,
        future?.commercial_purpose,
        arrayValue(outline?.turning_points)[0],
      ),
    },
  }
}

function planningRecords(chapters: AnyRecord[], outlines: AnyRecord[]) {
  const futureSkeletons = outlines
    .filter(outline => outlineLevel(outline) === 'chapter' && (outline?.raw_payload?.source === 'rolling_plan' || outline?.raw_payload?.source === 'future_100_skeleton' || outline?.raw_payload?.rollingPlan || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton))
    .map(futureSkeletonPlanFromOutline)
    .filter(Boolean) as AnyRecord[]
  return [...futureSkeletons, ...chapters]
}

function buildCoverage(records: AnyRecord[], startChapterNo: number, span: number): FuturePlanningCoverage {
  const expected = Array.from({ length: span }).map((_, index) => startChapterNo + index)
  const byNo = new Map<number, AnyRecord[]>()
  records.forEach(record => {
    const chapterNo = Number(record?.chapter_no || 0)
    if (!chapterNo) return
    byNo.set(chapterNo, [...(byNo.get(chapterNo) || []), record])
  })
  const isPlannedEnough = (chapter?: AnyRecord) => {
    if (!chapter) return false
    return Boolean(
      text(chapter?.title) &&
      text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
      text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
      text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook) &&
      text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)
    )
  }
  const hasPlan = (chapterNo: number) => (byNo.get(chapterNo) || []).some(isPlannedEnough)
  const plannedChapters = expected.filter(hasPlan).length
  const missingChapters = expected.filter(chapterNo => !hasPlan(chapterNo))

  return {
    ready: missingChapters.length === 0,
    planned: plannedChapters,
    required: span,
    missingChapters,
    label: `${plannedChapters}/${span}`,
  }
}

function buildVolumeTree(outlines: AnyRecord[], chapters: AnyRecord[]): PlanningVolumeTreeNode[] {
  const byId = new Map<any, PlanningVolumeTreeNode>()
  outlines.forEach(outline => {
    byId.set(outline.id, {
      id: outline.id,
      title: text(outline.title, '未命名规划'),
      level: outlineLevel(outline),
      startChapter: outline.start_chapter,
      endChapter: outline.end_chapter,
      children: [],
    })
  })

  const roots: PlanningVolumeTreeNode[] = []
  outlines.forEach(outline => {
    const node = byId.get(outline.id)
    if (outline.parent_id && byId.has(outline.parent_id)) byId.get(outline.parent_id).children.push(node)
    else roots.push(node)
  })

  chapters.forEach(chapter => {
    const chapterNode = {
      id: chapter.id,
      title: text(chapter.title, `第${chapter.chapter_no || '?'}章`),
      level: 'chapter',
      chapterNo: Number(chapter.chapter_no),
      wordCount: wc(chapter.chapter_text),
      children: [],
    }
    const parent = outlines.find(outline => outline.id === chapter.outline_id) || outlines.find(outline => isStage(outline) && chapterInRange(chapterNode.chapterNo, outline))
    const parentNode = parent ? byId.get(parent.id) : null
    if (parentNode) parentNode.children.push(chapterNode)
  })

  return roots
}

function buildHealthIssues(args: {
  readerPromise: string
  currentVolumeGoal: string
  future10Coverage: FuturePlanningCoverage
  storyState: AnyRecord
  latestWrittenChapterNo: number
  materialScore?: AnyRecord | null
}): PlanningHealthIssue[] {
  const issues: PlanningHealthIssue[] = []

  if (!args.readerPromise) {
    issues.push({
      key: 'missing_reader_promise',
      severity: 'critical',
      title: '缺读者承诺',
      detail: '项目缺少长篇核心承诺。',
      actionKey: 'open_story_assets',
    })
  }
  if (!args.currentVolumeGoal) {
    issues.push({
      key: 'missing_volume_goal',
      severity: 'critical',
      title: '缺当前卷目标',
      detail: '当前章节无法映射到明确卷目标。',
      actionKey: 'complete_volume_plan',
    })
  }
  if (!args.future10Coverage.ready) {
    issues.push({
      key: 'future10_incomplete',
      severity: 'critical',
      title: '未来十章规划不足',
      detail: `当前覆盖 ${args.future10Coverage.label}。`,
      actionKey: 'update_rolling_plan',
    })
  }
  if (Number(args.storyState?.last_updated_chapter || 0) < args.latestWrittenChapterNo) {
    issues.push({
      key: 'story_state_stale',
      severity: 'warning',
      title: '故事状态滞后',
      detail: '故事状态落后于当前章节。',
      actionKey: 'update_story_state',
    })
  }
  if (args.materialScore && (Number(args.materialScore.score || 0) < 60 || args.materialScore.can_generate === false)) {
    issues.push({
      key: 'material_weak',
      severity: 'warning',
      title: '素材准备不足',
      detail: '素材评分或生成门槛提示需要补强。',
      actionKey: 'complete_volume_plan',
    })
  }

  return issues
}

function healthLabel(issues: PlanningHealthIssue[]): PlanningHealthStatus {
  if (issues.some(issue => issue.severity === 'critical')) return { status: 'needs_planning', label: '需要补规划' }
  if (issues.length > 0) return { status: 'drifting', label: '存在漂移' }
  return { status: 'healthy', label: '规划健康' }
}

function latestWrittenChapterNo(chapters: AnyRecord[]) {
  return chapters.reduce((latest, chapter) => {
    const chapterText = text(chapter?.chapter_text)
    if (!chapterText || chapterText.includes('【占位正文】')) return latest
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo > latest ? chapterNo : latest
  }, 0)
}

function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function reviewTime(review: AnyRecord) {
  const raw = text(review?.created_at || review?.updated_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function latestFirst30Review(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'first30_retention_diagnosis')
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0] || null
}

function chapterUpdatedTime(chapter: AnyRecord) {
  const raw = text(chapter?.updated_at || chapter?.modified_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function first30ReportIsStale(review: AnyRecord, chapters: AnyRecord[]) {
  const reportTime = reviewTime(review)
  if (!reportTime) return false
  return chapters
    .filter(chapter => Number(chapter?.chapter_no || 0) >= 1 && Number(chapter?.chapter_no || 0) <= 30)
    .some(chapter => chapterUpdatedTime(chapter) > reportTime)
}

function productionTaskRuns(productionTasks?: AnyRecord | null) {
  if (!productionTasks) return []
  return [
    ...arrayValue(productionTasks.tasks),
    ...arrayValue(productionTasks.active),
    ...arrayValue(productionTasks.recent),
    ...arrayValue(productionTasks.completed),
    ...arrayValue(productionTasks.history),
  ]
}

function runCompletedTime(run: AnyRecord) {
  const raw = text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function runIsCompleted(run: AnyRecord) {
  return ['success', 'completed', 'done', 'resolved'].includes(text(run?.status).toLowerCase())
}

function latestFirst30RepairAfterReport(review: AnyRecord, productionTasks?: AnyRecord | null) {
  const reportTime = reviewTime(review)
  if (!reportTime) return null
  return productionTaskRuns(productionTasks)
    .filter(run => text(run?.run_type || run?.type) === 'first30_retention_repair')
    .filter(runIsCompleted)
    .map(run => ({ run, completedAt: runCompletedTime(run) }))
    .filter(item => item.completedAt > reportTime)
    .sort((a, b) => b.completedAt - a.completedAt)[0]?.run || null
}

function retentionRiskLevel(score: number, flags: string[]) {
  if (score < 65 || flags.some(flag => /缺正文|章末钩子弱|爽点/.test(flag))) return 'high'
  if (score < 80 || flags.length > 0) return 'medium'
  return 'ok'
}

function buildFirst30RetentionModel(chapters: AnyRecord[], reviews: AnyRecord[], productionTasks?: AnyRecord | null): PlanningWorkspaceModel['first30Retention'] {
  const review = latestFirst30Review(reviews)
  if (!review) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行前30章留存诊断。',
      promiseReady: false,
      stale: false,
      actionKey: 'run_first30_retention',
      segments: [],
      chapterCards: [],
      risks: [],
      nextActions: ['运行前30章诊断，先确认开篇三章、试读十章和付费前蓄势风险。'],
    }
  }

  const payload = parseJsonValue(review.payload) || {}
  const report = payload.report || payload.result?.report || payload
  const staleByChapterUpdate = first30ReportIsStale(review, chapters)
  const completedRepair = latestFirst30RepairAfterReport(review, productionTasks)
  const stale = staleByChapterUpdate || Boolean(completedRepair)
  const normalizedStatus = text(report?.status, 'needs_repair') as PlanningWorkspaceModel['first30Retention']['status']
  const status = stale ? 'stale' : (['ready', 'needs_repair', 'blocked'].includes(normalizedStatus) ? normalizedStatus : 'needs_repair')
  const segments = arrayValue(report?.segments).map(segment => ({
    key: text(segment?.key),
    label: text(segment?.label || segment?.key, '未命名分段'),
    score: Number(segment?.score || 0),
    coverage: Number(segment?.coverage || 0),
    hookRate: Number(segment?.hook_rate || segment?.hookRate || 0),
    payoffAverage: Number(segment?.payoff_average || segment?.payoffAverage || 0),
    chapterCount: Number(segment?.chapter_count || segment?.chapterCount || 0),
  }))
  const chapterCards = arrayValue(report?.chapter_cards).map(row => {
    const flags = arrayValue(row?.flags).map(flag => text(flag)).filter(Boolean)
    const score = Number(row?.score || 0)
    return {
      chapterId: row?.chapter_id || null,
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, '未命名章节'),
      score,
      wordCount: Number(row?.word_count || 0),
      flags,
      riskLevel: retentionRiskLevel(score, flags),
    }
  })

  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: stale
      ? `${completedRepair ? '需重新诊断：留存修复任务已完成，需复查修复后追读曲线。' : '需重新诊断：前30章内容已在报告后更新。'}${text(report?.summary)}`
      : text(report?.summary, '已完成前30章留存诊断。'),
    promiseReady: Boolean(report?.positioning?.promise_ready),
    stale,
    actionKey: status === 'ready' ? 'run_first30_retention' : status === 'stale' ? 'run_first30_retention' : 'create_first30_repair',
    segments,
    chapterCards,
    risks: arrayValue(report?.risks).map(risk => ({
      severity: text(risk?.severity),
      segment: text(risk?.segment),
      issue: text(risk?.issue),
      action: text(risk?.action),
    })),
    nextActions: [
      ...(completedRepair ? ['重新运行前30章诊断，确认修复后的目标、钩子、爽点和试读闭环已经收敛。'] : []),
      ...arrayValue(report?.next_actions).map(item => text(item)).filter(Boolean),
    ],
  }
}

const STORYLINE_TYPE_LABELS: Record<string, string> = {
  mainline: '主线',
  subplot: '支线',
  character_arc: '角色线',
  relationship_arc: '关系线',
  faction_arc: '势力线',
  foreshadowing_arc: '伏笔线',
}

const STORYLINE_TYPE_ORDER = Object.keys(STORYLINE_TYPE_LABELS)

function numberOrNull(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return null
}

function listText(...values: any[]) {
  const result: string[] = []
  values.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        const normalized = text(item)
        if (normalized) result.push(normalized)
      })
      return
    }
    const normalized = text(value)
    if (normalized) result.push(normalized)
  })
  return Array.from(new Set(result))
}

function isStorylineType(type: string) {
  return Boolean(STORYLINE_TYPE_LABELS[type])
}

function storylineSyncReport(review: AnyRecord) {
  if (text(review?.review_type) !== 'storyline_sync') return null
  const payload = parseJsonValue(review?.payload) || parseJsonValue(review?.payload_json) || {}
  const report = payload.storyline_sync || payload.result?.storyline_sync || payload.result || payload
  if (!report || typeof report !== 'object') return null
  return {
    chapterNo: numberOrNull(payload.chapter_no, report.chapter_no, review.chapter_no),
    report,
  }
}

function storylineSyncItemMatches(entity: AnyRecord, item: AnyRecord) {
  const entityId = Number(entity?.id || 0)
  const itemId = Number(item?.entity_id || item?.id || 0)
  if (entityId && itemId && entityId === itemId) return true
  const entityType = text(entity?.entity_type)
  const itemType = text(item?.entity_type || item?.type)
  const entityName = text(entity?.name)
  const itemName = text(item?.name || item?.title)
  return Boolean(
    entityName &&
    itemName &&
    (!itemType || itemType === entityType) &&
    (entityName === itemName || entityName.includes(itemName) || itemName.includes(entityName)),
  )
}

function evidenceSummary(item: AnyRecord, fallback = '') {
  const expected = item?.expected_state_change
  const actual = item?.actual_state_change
  return firstNonEmpty(
    item?.summary,
    typeof actual === 'string' ? actual : actual?.summary,
    typeof expected === 'string' ? expected : expected?.summary,
    item?.description,
    item?.name,
    fallback,
  )
}

function uniqueEvidence<T extends { chapterNo: number | null; usageType: string; summary: string }>(items: T[]) {
  const seen = new Set<string>()
  const rows: T[] = []
  items.forEach(item => {
    const key = `${item.chapterNo || ''}:${item.usageType}:${item.summary}`
    if (!item.summary || seen.has(key)) return
    seen.add(key)
    rows.push(item)
  })
  return rows
}

function buildStorylineSyncEvidence(entity: AnyRecord, reviews: AnyRecord[]) {
  const planEvidence: PlanningStorylineBoardItem['planEvidence'] = []
  const actualEvidence: PlanningStorylineBoardItem['actualEvidence'] = []
  const syncRisks: string[] = []
  const touchedChapters: number[] = []

  reviews
    .map(storylineSyncReport)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.chapterNo || 0) - (b.chapterNo || 0))
    .forEach((sync: any) => {
      const chapterNo = sync.chapterNo || null
      const chapterLabel = chapterNo ? `第${chapterNo}章` : '未知章节'
      const planned = arrayValue(sync.report?.planned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const actual = [
        ...arrayValue(sync.report?.actual),
        ...arrayValue(sync.report?.completed),
      ].filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const missed = arrayValue(sync.report?.missed).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const unplanned = arrayValue(sync.report?.unplanned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const forbiddenTouched = arrayValue(sync.report?.forbidden_touched).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))

      planned.forEach((item: AnyRecord) => {
        planEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType, 'planned'),
          summary: evidenceSummary(item, '计划推进剧情线'),
        })
      })
      actual.forEach((item: AnyRecord) => {
        actualEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType || item?.change_type || item?.changeType, 'actual'),
          summary: evidenceSummary(item, '正文已推进剧情线'),
        })
      })
      if (missed.length > 0) syncRisks.push(`${chapterLabel}漏推`)
      if (unplanned.length > 0) syncRisks.push(`${chapterLabel}额外推进`)
      if (forbiddenTouched.length > 0) syncRisks.push(`${chapterLabel}禁揭风险`)
      if (planned.length || actual.length || missed.length || unplanned.length || forbiddenTouched.length) {
        if (chapterNo) touchedChapters.push(chapterNo)
      }
    })

  return {
    planEvidence: uniqueEvidence(planEvidence).slice(-6),
    actualEvidence: uniqueEvidence(actualEvidence).slice(-6),
    syncRisks: Array.from(new Set(syncRisks)).slice(-6),
    latestSyncChapter: touchedChapters.length ? Math.max(...touchedChapters) : null,
  }
}

function buildStorylineBoardModel(
  settingEntities: AnyRecord[],
  first30Retention: PlanningWorkspaceModel['first30Retention'],
  activeChapterNo: number,
  reviews: AnyRecord[] = [],
): PlanningWorkspaceModel['storylineBoard'] {
  const first30RiskCards = first30Retention.chapterCards.filter(card => card.riskLevel !== 'ok')
  const items = settingEntities
    .filter(entity => isStorylineType(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type)
      const payload = parseJsonValue(entity?.payload_json) || {}
      const constraints = parseJsonValue(entity?.constraints_json) || {}
      const state = parseJsonValue(entity?.state_json) || {}
      const startChapter = numberOrNull(entity?.first_chapter_no, payload?.start_chapter_no, payload?.start_chapter)
      const endChapter = numberOrNull(entity?.last_chapter_no, payload?.end_chapter_no, payload?.end_chapter)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const payoffStatus = text(state?.payoff_status || payload?.payoff_status)
      const syncEvidence = buildStorylineSyncEvidence(entity, reviews)
      const retentionImpacts = first30RiskCards
        .filter(card => {
          const chapterNo = Number(card.chapterNo || 0)
          if (!chapterNo) return false
          if (startChapter && chapterNo < startChapter) return false
          if (endChapter && chapterNo > endChapter) return false
          return true
        })
        .map(card => `第${card.chapterNo}章 ${card.score}分`)
      const riskTags: string[] = []
      if (nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('逾期未推')
      if (/debt|overdue|逾期|待回收|回收债务/.test(payoffStatus)) riskTags.push('回收债务')
      if (retentionImpacts.length > 0) riskTags.push('影响留存')
      if (syncEvidence.syncRisks.some(item => item.includes('漏推'))) riskTags.push('复盘漏推')
      if (syncEvidence.syncRisks.some(item => item.includes('禁揭'))) riskTags.push('禁揭风险')

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名剧情线'),
        entityType,
        typeLabel: STORYLINE_TYPE_LABELS[entityType],
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        status: text(state?.current_state || entity?.status, 'active'),
        startChapter,
        endChapter,
        lastAdvancedChapter,
        nextAdvanceChapter,
        payoffStatus,
        expectedPayoff: text(payload?.expected_payoff || state?.expected_payoff),
        relatedNames: listText(payload?.related_characters, payload?.related_factions, payload?.related_foreshadowing),
        advanceRule: text(constraints?.advance_rule || payload?.advance_rule),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        riskTags,
        retentionImpacts,
        planEvidence: syncEvidence.planEvidence,
        actualEvidence: syncEvidence.actualEvidence,
        syncRisks: syncEvidence.syncRisks,
        latestSyncChapter: syncEvidence.latestSyncChapter,
        actionChapterNo: nextAdvanceChapter || startChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })

  const groups = STORYLINE_TYPE_ORDER
    .map(key => {
      const groupItems = items.filter(item => item.entityType === key)
      return { key, label: STORYLINE_TYPE_LABELS[key], count: groupItems.length, items: groupItems }
    })
    .filter(group => group.count > 0)
  const overdueCount = items.filter(item => item.riskTags.includes('逾期未推')).length
  const debtCount = items.filter(item => item.riskTags.includes('回收债务')).length
  const retentionRiskCount = items.filter(item => item.riskTags.includes('影响留存')).length
  const status = items.length === 0 ? 'missing' : (overdueCount || debtCount || retentionRiskCount) ? 'needs_attention' : 'ready'

  return {
    status,
    summary: items.length === 0
      ? '尚未建立剧情线资产。'
      : status === 'ready'
        ? `已有 ${items.length} 条剧情线，当前没有明显调度风险。`
        : `已有 ${items.length} 条剧情线，${overdueCount} 条逾期未推，${debtCount} 条存在回收债务，${retentionRiskCount} 条影响前30章留存。`,
    total: items.length,
    overdueCount,
    debtCount,
    retentionRiskCount,
    groups,
  }
}

function isCharacterArcEntity(type: string) {
  return type === 'character_arc' || type === 'relationship_arc'
}

function arcTypeLabel(type: string) {
  if (type === 'relationship_arc') return '关系线'
  return '角色线'
}

function characterArcReviewPayload(reviews: AnyRecord[]) {
  return latestReviewPayloadAny(reviews, 'character_arc_sync', 'character_arc_sync')
}

function characterArcEvidenceItems(report: AnyRecord) {
  return arrayValue(report?.missed)
    .map((item, index) => {
      const label = firstNonEmpty(item?.label, item?.key, '人物弧光')
      const detail = firstNonEmpty(item?.text, item?.expected, item?.issue, item?.description)
      const key = text(item?.key || item?.label).toLowerCase()
      const priority = key.includes('growth') || label.includes('成长') ? 0
        : key.includes('relationship') || label.includes('关系') ? 1
          : key.includes('flaw') || label.includes('缺陷') ? 2
            : key.includes('desire') || label.includes('欲望') ? 3
              : 4
      return {
        priority,
        index,
        text: detail ? `${label}：${detail}` : label,
      }
    })
    .filter(item => Boolean(item.text))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(item => item.text)
}

function characterArcReviewMatchesEntity(entity: AnyRecord, report: AnyRecord, relatedNames: string[]) {
  const characterName = firstNonEmpty(report?.character_name, report?.characterName, report?.name)
  if (!characterName) return true
  const entityName = text(entity?.name)
  return [entityName, ...relatedNames].some(name => name && (name.includes(characterName) || characterName.includes(name)))
}

function buildCharacterArcBoardModel(
  settingEntities: AnyRecord[],
  reviews: AnyRecord[],
  activeChapterNo: number,
): PlanningWorkspaceModel['characterArcBoard'] {
  const arcSync = characterArcReviewPayload(reviews)
  const syncMissedCount = numericCount(arcSync?.missed_count, arcSync?.missedCount, listLength(arcSync?.missed))
  const syncEvidence = characterArcEvidenceItems(arcSync)
  const arcs = settingEntities
    .filter(entity => isCharacterArcEntity(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type) as 'character_arc' | 'relationship_arc'
      const payload = parseJsonValue(entity?.payload_json) || {}
      const constraints = parseJsonValue(entity?.constraints_json) || {}
      const state = parseJsonValue(entity?.state_json) || {}
      const relatedNames = listText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const riskTags: string[] = []
      if (entityType === 'character_arc' && nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('成长断档')
      if (entityType === 'relationship_arc' && nextAdvanceChapter && activeChapterNo >= nextAdvanceChapter) riskTags.push('关系待推进')
      const matchesSync = syncMissedCount > 0 && characterArcReviewMatchesEntity(entity, arcSync, relatedNames)
      if (matchesSync) riskTags.push('弧光缺口')
      if (!firstNonEmpty(payload?.growth_target, payload?.growthTarget, payload?.relationship_shift, payload?.relationshipShift, payload?.expected_payoff)) {
        riskTags.push('缺成长目标')
      }

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名人物线'),
        entityType,
        typeLabel: arcTypeLabel(entityType),
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        relatedNames,
        currentState: text(state?.current_state || entity?.status),
        desire: text(payload?.desire || state?.desire),
        flawPressure: text(payload?.flaw_pressure || payload?.flawPressure || state?.flaw_pressure),
        growthTarget: text(payload?.growth_target || payload?.growthTarget || payload?.expected_payoff),
        relationshipShift: text(payload?.relationship_shift || payload?.relationshipShift || state?.relationship_shift),
        voiceAnchor: text(payload?.voice_anchor || payload?.voiceAnchor || state?.voice_anchor),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        lastAdvancedChapter,
        nextAdvanceChapter,
        riskTags: Array.from(new Set(riskTags)),
        latestEvidence: matchesSync ? syncEvidence.slice(0, 4) : [],
        actionChapterNo: nextAdvanceChapter || lastAdvancedChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })
  const overdueCount = arcs.filter(item => item.riskTags.includes('成长断档')).length
  const relationshipRiskCount = arcs.filter(item => item.riskTags.includes('关系待推进')).length
  const growthGapCount = syncMissedCount
  const status: PlanningWorkspaceModel['characterArcBoard']['status'] = arcs.length === 0
    ? 'missing'
    : overdueCount + relationshipRiskCount + growthGapCount > 0
      ? 'needs_attention'
      : 'ready'
  return {
    status,
    summary: arcs.length === 0
      ? '尚未建立角色线或关系线资产。'
      : status === 'ready'
        ? `人物成长稳定：已有 ${arcs.length} 条角色/关系线，近期没有明显成长断档。`
        : `人物成长需治理：${overdueCount} 条成长断档，${relationshipRiskCount} 条关系待推进，${growthGapCount > 0 ? text(arcSync?.label, `人物弧光缺口 ${growthGapCount}`) : '人物弧光待复盘'}。`,
    total: arcs.length,
    growthGapCount,
    overdueCount,
    relationshipRiskCount,
    actionKey: growthGapCount > 0 ? 'open_quality_revision' : arcs.length === 0 || overdueCount + relationshipRiskCount > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    arcs,
  }
}

function volumeBeatType(chapterNo: number, start: number, end: number): PlanningVolumeBeat['type'] {
  if (!chapterNo || !start || !end || end <= start) return '小高潮'
  const ratio = (chapterNo - start) / Math.max(1, end - start)
  if (ratio >= 0.82) return '卷末爆点'
  if (ratio >= 0.42) return '中高潮'
  return '小高潮'
}

function hasChapterPayoff(chapter: AnyRecord) {
  return Boolean(firstNonEmpty(
    chapter?.raw_payload?.payoff,
    chapter?.raw_payload?.reader_payoff,
    chapter?.raw_payload?.reader_reward,
    chapter?.payoff,
    chapter?.reader_payoff,
    chapter?.ending_hook,
  ))
}

function isChapterPlannedForBudget(chapter: AnyRecord) {
  return Boolean(
    text(chapter?.title) &&
    text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
    text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
    text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook)
  )
}

function buildVolumeBeatBudgetModel(args: {
  currentVolume: AnyRecord
  outlines: AnyRecord[]
  chapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['volumeBeatBudget'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const currentVolumeTitle = text(args.currentVolume?.title, '未定位当前卷')
  if (!start || !end) {
    return {
      status: 'blocked',
      score: 45,
      label: '爆点预算缺失',
      summary: '当前章节无法定位到明确分卷，不能计算卷级高潮和爽点预算。',
      currentVolumeTitle,
      chapterRange: '章节范围未定',
      totalChapters: 0,
      plannedChapterCount: 0,
      climaxTarget: 0,
      climaxCount: 0,
      payoffTarget: 0,
      payoffCount: 0,
      beats: [],
      nextActions: ['先补齐当前卷范围、卷目标和关键转折点。'],
    }
  }

  const totalChapters = Math.max(1, end - start + 1)
  const volumeChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const plannedChapterCount = volumeChapters.filter(isChapterPlannedForBudget).length
  const payoffCount = volumeChapters.filter(hasChapterPayoff).length
  const climaxOutlines = args.outlines
    .filter(outline => isClimaxOutline(outline) && chapterRange(outline).start >= start && chapterRange(outline).start <= end)
    .sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const beats: PlanningVolumeBeat[] = climaxOutlines.map(outline => {
    const chapterNo = chapterRange(outline).start || null
    return {
      key: `outline-${outline.id || outline.title}`,
      label: text(outline?.title, '未命名爆点'),
      chapterNo,
      type: volumeBeatType(Number(chapterNo || 0), start, end),
      status: 'planned',
      detail: text(outline?.summary || outline?.goal || outline?.hook, '已规划关键转折/高潮节点。'),
    }
  })
  const climaxTarget = Math.max(3, Math.ceil(totalChapters / 15))
  const payoffTarget = Math.max(climaxTarget * 2, Math.ceil(Math.max(plannedChapterCount, Math.min(totalChapters, 30)) / 3))
  const missingCount = Math.max(0, climaxTarget - beats.length)
  const missingTypes: PlanningVolumeBeat['type'][] = ['小高潮', '中高潮', '卷末爆点']
  for (let index = 0; index < missingCount; index += 1) {
    const type = missingTypes[Math.min(index, missingTypes.length - 1)]
    beats.push({
      key: `missing-${index}-${type}`,
      label: `${type}待补`,
      chapterNo: null,
      type: '待补',
      status: 'missing',
      detail: `当前卷还缺少${type}节点。`,
    })
  }
  const climaxScore = Math.min(1, climaxOutlines.length / Math.max(1, climaxTarget)) * 60
  const payoffScore = Math.min(1, payoffCount / Math.max(1, payoffTarget)) * 30
  const planScore = plannedChapterCount > 0 ? 10 : 0
  const score = Math.max(0, Math.min(100, Math.round(climaxScore + payoffScore + planScore)))
  const status: PlanningWorkspaceModel['volumeBeatBudget']['status'] = plannedChapterCount === 0
    ? 'blocked'
    : score >= 80 && climaxOutlines.length >= climaxTarget && payoffCount >= payoffTarget
      ? 'ready'
      : 'needs_attention'

  return {
    status,
    score,
    label: status === 'ready' ? `爆点预算 ${score}` : status === 'blocked' ? `爆点预算阻塞 ${score}` : `爆点预算不足 ${score}`,
    summary: status === 'ready'
      ? `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}。`
      : `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}，需要补强卷级节奏。`,
    currentVolumeTitle,
    chapterRange: `第${start}-${end}章`,
    totalChapters,
    plannedChapterCount,
    climaxTarget,
    climaxCount: climaxOutlines.length,
    payoffTarget,
    payoffCount,
    beats,
    nextActions: status === 'ready'
      ? ['按当前卷爆点预算推进章节任务书和场景卡。']
      : ['补齐当前卷的小高潮、中高潮和卷末爆点，再进入批量连写。'],
  }
}

function latestReviewPayload(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0]
  const payload = parseJsonValue(review?.payload) || parseJsonValue(review?.payload_json) || {}
  return payload[payloadKey] || payload.result?.[payloadKey] || payload.result || payload
}

function listLength(value: any) {
  return Array.isArray(value) ? value.length : 0
}

function latestReviewPayloadAny(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  return latestReviewPayload(reviews, reviewType, payloadKey) || {}
}

function compactList(values: any[], limit = 6) {
  return Array.from(new Set(values.map(value => text(value)).filter(Boolean))).slice(0, limit)
}

const LONGFORM_SPINE_AXIS_LABELS: Record<PlanningLongformSpineAxis['key'], string> = {
  reader_promise: '核心卖点',
  protagonist_drive: '主角驱动',
  core_conflict: '核心矛盾',
  world_hook: '世界钩子',
  innovation_hook: '创新钩子',
  payoff_loop: '长期回报',
  ending_direction: '终局方向',
}

const LONGFORM_SPINE_REQUIRED_AXES: PlanningLongformSpineAxis['key'][] = [
  'reader_promise',
  'protagonist_drive',
  'core_conflict',
  'innovation_hook',
  'payoff_loop',
]

function latestLongformCreationCompass(reviews: AnyRecord[]) {
  const report = latestReviewPayloadAny(reviews, 'longform_creation_diagnosis', 'report')
  const compass = report?.compass || report?.longform_compass || report?.longformCompass || null
  return compass && typeof compass === 'object' ? compass : null
}

function longformSpineValue(source: AnyRecord, key: PlanningLongformSpineAxis['key']) {
  if (key === 'reader_promise') return firstNonEmpty(source?.reader_promise, source?.readerPromise, source?.promise)
  if (key === 'protagonist_drive') return firstNonEmpty(source?.protagonist_drive, source?.protagonistDrive, source?.protagonist_goal, source?.main_character_drive)
  if (key === 'core_conflict') return firstNonEmpty(source?.core_conflict, source?.coreConflict, source?.main_conflict)
  if (key === 'world_hook') return firstNonEmpty(source?.world_hook, source?.worldHook, source?.setting_hook)
  if (key === 'innovation_hook') return firstNonEmpty(source?.innovation_hook, source?.innovationHook, source?.differentiation, source?.original_hook)
  if (key === 'payoff_loop') return firstNonEmpty(source?.payoff_loop, source?.payoffLoop, source?.payoff_model, source?.reward_loop)
  return firstNonEmpty(source?.ending_direction, source?.endingDirection, source?.final_goal, source?.endgame)
}

function buildLongformSpineGuardModel(writingBible: AnyRecord, reviews: AnyRecord[]): PlanningWorkspaceModel['longformSpineGuard'] {
  const reviewCompass = latestLongformCreationCompass(reviews)
  const source = reviewCompass || writingBible || {}
  const sourceLabel = reviewCompass ? '来自长篇创作诊断' : reviewHasPayload(writingBible) ? '来自写作圣经' : '待补齐'
  const axisKeys = Object.keys(LONGFORM_SPINE_AXIS_LABELS) as PlanningLongformSpineAxis['key'][]
  const axes = axisKeys.map(key => {
    const value = longformSpineValue(source, key)
    return {
      key,
      label: LONGFORM_SPINE_AXIS_LABELS[key],
      value,
      locked: LONGFORM_SPINE_REQUIRED_AXES.includes(key),
      status: value ? 'ok' as const : 'missing' as const,
    }
  })
  const missingAxes = axes
    .filter(axis => axis.locked && axis.status === 'missing')
    .map(axis => axis.label)
  const optionalMissingCount = axes.filter(axis => !axis.locked && axis.status === 'missing').length
  const readyCount = axes.filter(axis => axis.status === 'ok').length
  const score = boundedScore((readyCount / Math.max(1, axes.length)) * 100 - missingAxes.length * 8, 55)
  const status: PlanningWorkspaceModel['longformSpineGuard']['status'] = missingAxes.length >= 2
    ? 'blocked'
    : missingAxes.length || optionalMissingCount
      ? 'needs_attention'
      : 'ready'
  const readerPromise = axes.find(axis => axis.key === 'reader_promise')?.value || ''
  const immutableRules = compactList([
    ...arrayValue(source?.immutable_rules),
    ...arrayValue(source?.immutableRules),
    readerPromise ? `核心卖点不可漂移：${readerPromise}` : '',
    longformSpineValue(source, 'core_conflict') ? `核心矛盾不可漂移：${longformSpineValue(source, 'core_conflict')}` : '',
    longformSpineValue(source, 'innovation_hook') ? `创新钩子不可写成普通套路：${longformSpineValue(source, 'innovation_hook')}` : '',
  ]).slice(0, 6)
  const flexibleZones = compactList([
    ...arrayValue(source?.flexible_zones),
    ...arrayValue(source?.flexibleZones),
    '支线人物、新资产、场景题材可以调整，但必须服务核心卖点、当前卷目标和长期回报循环。',
  ]).slice(0, 6)

  return {
    status,
    score,
    label: status === 'ready' ? `主轴稳定 ${score}` : status === 'blocked' ? `主轴阻塞 ${score}` : `主轴待补 ${score}`,
    summary: status === 'ready'
      ? '全书核心卖点、主角驱动、核心矛盾、创新钩子和长期回报已形成可见护栏。'
      : `全书主轴仍缺 ${missingAxes.length} 个关键项：${missingAxes.join('、') || '可选扩展项'}。先补齐后再扩大自动连写。`,
    sourceLabel,
    readerPromise,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    axes,
    immutableRules,
    flexibleZones,
    missingAxes,
  }
}

function spineAxisValue(spine: PlanningWorkspaceModel['longformSpineGuard'], key: PlanningLongformSpineAxis['key']) {
  return spine.axes.find(axis => axis.key === key)?.value || ''
}

function coreContractCheck(
  key: PlanningCoreContractRadarCheck['key'],
  label: string,
  value: string,
  missingDetail: string,
  options: { warn?: boolean; warnDetail?: string; evidence?: string[] } = {},
): PlanningCoreContractRadarCheck {
  const evidence = compactList(options.evidence || [value], 4)
  const status: PlanningCoreContractRadarCheck['status'] = !value
    ? 'block'
    : options.warn
      ? 'warn'
      : 'ok'
  return {
    key,
    label,
    status,
    score: status === 'ok' ? 90 : status === 'warn' ? 66 : 38,
    detail: !value ? missingDetail : options.warn ? (options.warnDetail || value) : value,
    evidence,
  }
}

function buildCoreContractRadarModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  activeChapter?: AnyRecord | null
  currentVolumeGoal: string
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['coreContractRadar'] {
  const { longformSpineGuard, activeChapter } = args
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const driftRisks = compactList([
    ...arrayValue(coreDrift?.drift_risks),
    ...arrayValue(coreDrift?.risks),
    ...arrayValue(coreDrift?.forbidden_touched),
  ], 6)
  const hasDeliveryDrift = driftRisks.length > 0 || ['warn', 'warning', 'risk', 'blocked', 'block'].includes(text(coreDrift?.status).toLowerCase())

  const chapterGoal = firstNonEmpty(activeChapter?.chapter_goal, activeChapter?.chapterGoal, activeChapter?.goal, activeChapter?.summary, activeChapter?.chapter_summary)
  const chapterConflict = firstNonEmpty(activeChapter?.conflict, activeChapter?.raw_payload?.conflict, activeChapter?.raw_payload?.core_conflict)
  const chapterMainline = firstNonEmpty(activeChapter?.raw_payload?.mainline_progress, activeChapter?.mainline_progress, activeChapter?.raw_payload?.storyline_advance)
  const chapterPayoff = firstNonEmpty(activeChapter?.raw_payload?.payoff, activeChapter?.raw_payload?.reader_payoff, activeChapter?.ending_hook, activeChapter?.hook)
  const chapterInnovation = firstNonEmpty(activeChapter?.raw_payload?.innovation_execution, activeChapter?.raw_payload?.innovation_angle, activeChapter?.raw_payload?.signature_scene, activeChapter?.raw_payload?.ip_scene)
  const chapterService = compactList([chapterGoal, chapterConflict, chapterMainline], 3).join('；')

  const checks: PlanningCoreContractRadarCheck[] = [
    coreContractCheck('reader_promise', '核心卖点', spineAxisValue(longformSpineGuard, 'reader_promise'), '缺核心卖点，无法判断章节是否吸引目标读者。'),
    coreContractCheck('protagonist_drive', '主角驱动', spineAxisValue(longformSpineGuard, 'protagonist_drive'), '缺主角驱动，超长篇容易变成事件推着人走。'),
    coreContractCheck('core_conflict', '核心矛盾', spineAxisValue(longformSpineGuard, 'core_conflict'), '缺核心矛盾，章节冲突容易散成单元小事。'),
    coreContractCheck(
      'chapter_service',
      '本章服务',
      chapterService,
      '当前章缺目标、冲突或主线推进，先补开写任务再生成正文。',
      {
        warn: hasDeliveryDrift,
        warnDetail: driftRisks[0] || '最近交稿存在核心偏移，先修订后再放大生产。',
        evidence: [chapterGoal, chapterConflict, chapterMainline, ...driftRisks],
      },
    ),
    coreContractCheck(
      'reader_payoff',
      '读者回报',
      chapterPayoff,
      '当前章缺可见回报或章末追读问题。',
      {
        warn: hasDeliveryDrift,
        warnDetail: '核心偏移会削弱读者回报，先把回报写成可见事件。',
        evidence: [chapterPayoff, activeChapter?.ending_hook, ...driftRisks],
      },
    ),
    coreContractCheck(
      'innovation_hook',
      '创新执行',
      spineAxisValue(longformSpineGuard, 'innovation_hook'),
      '缺创新钩子，章节容易退回同题材套路。',
      {
        warn: Boolean(spineAxisValue(longformSpineGuard, 'innovation_hook')) && !chapterInnovation,
        warnDetail: chapterInnovation || '本章还没写清创新机制、反差场面或可传播执行点。',
        evidence: [spineAxisValue(longformSpineGuard, 'innovation_hook'), chapterInnovation],
      },
    ),
  ]

  const blockCount = checks.filter(item => item.status === 'block').length
  const warnCount = checks.filter(item => item.status === 'warn').length
  const status: PlanningWorkspaceModel['coreContractRadar']['status'] = longformSpineGuard.status === 'blocked' || blockCount > 0
    ? 'blocked'
    : warnCount > 0
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum, item) => sum + item.score, 0) / Math.max(1, checks.length))))
  const primaryKey: PlanningActionKey = longformSpineGuard.status === 'blocked' || checks.slice(0, 3).some(item => item.status === 'block')
    ? 'open_story_assets'
    : hasDeliveryDrift
      ? 'open_quality_revision'
      : checks.some(item => item.status !== 'ok')
        ? 'update_rolling_plan'
        : 'enter_chapter_writing'
  const riskTags = compactList([
    ...longformSpineGuard.missingAxes.map(axis => `缺${axis}`),
    hasDeliveryDrift ? '核心偏移' : '',
    checks.find(item => item.key === 'chapter_service' && item.status !== 'ok') ? '本章服务不足' : '',
    checks.find(item => item.key === 'reader_payoff' && item.status !== 'ok') ? '读者回报待补' : '',
    checks.find(item => item.key === 'innovation_hook' && item.status !== 'ok') ? '创新执行待补' : '',
  ], 8)
  const mustServe = compactList([
    spineAxisValue(longformSpineGuard, 'reader_promise') ? `服务核心卖点：${spineAxisValue(longformSpineGuard, 'reader_promise')}` : '',
    spineAxisValue(longformSpineGuard, 'protagonist_drive') ? `推动主角驱动：${spineAxisValue(longformSpineGuard, 'protagonist_drive')}` : '',
    spineAxisValue(longformSpineGuard, 'core_conflict') ? `压住核心矛盾：${spineAxisValue(longformSpineGuard, 'core_conflict')}` : '',
    args.currentVolumeGoal ? `承接当前卷目标：${args.currentVolumeGoal}` : '',
    chapterGoal ? `当前章任务：${chapterGoal}` : '',
  ], 6)

  return {
    status,
    score,
    label: status === 'ready' ? `契约稳定 ${score}` : status === 'blocked' ? `契约阻塞 ${score}` : `契约待修 ${score}`,
    summary: status === 'ready'
      ? '全书核心与当前章目标、冲突、回报、创新执行已经对齐，可以进入章节写作。'
      : hasDeliveryDrift
        ? `最近交稿存在核心偏移：${driftRisks[0] || text(coreDrift?.label, '需回质检修订')}。先修复再继续连写。`
        : `核心契约还有 ${blockCount + warnCount} 项需要补齐：${riskTags.join('、') || '补齐章节任务书'}`,
    primaryAction: {
      key: primaryKey,
      label: planningActionLabel(primaryKey),
      reason: primaryKey === 'open_quality_revision'
        ? '先处理最近交稿的核心偏移，避免后续章节沿着错误方向扩写。'
        : primaryKey === 'open_story_assets'
          ? '先补齐全书核心卖点、主角驱动和核心矛盾。'
          : primaryKey === 'update_rolling_plan'
            ? '先补齐本章目标、回报或创新执行，再生成正文。'
            : '核心契约通过，进入当前章写作。',
    },
    checks,
    mustServe,
    noDrift: longformSpineGuard.immutableRules,
    riskTags,
  }
}

function milestoneNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return Math.round(num)
  }
  return 0
}

function resolveRawMillionWordMilestones(writingBible: AnyRecord) {
  return [
    ...arrayValue(writingBible?.longform_milestones),
    ...arrayValue(writingBible?.million_word_milestones),
    ...arrayValue(writingBible?.millionWordMilestones),
    ...arrayValue(writingBible?.milestones),
  ].filter(item => item && typeof item === 'object')
}

function milestoneStatus(targetWords: number, writtenWords: number, nextTargetWords: number | null): PlanningMillionWordMilestone['status'] {
  if (!targetWords) return 'needs_plan'
  if (writtenWords >= targetWords) return 'achieved'
  if (!nextTargetWords || targetWords === nextTargetWords) return 'current'
  return 'future'
}

function defaultMillionWordMilestoneTargets(targetWords: number) {
  if (targetWords < 3000000) return []
  const candidates = [300000, 1000000, 2000000, 3000000, 5000000, 8000000, 10000000]
  const capped = candidates.filter(value => value <= targetWords)
  if (!capped.includes(targetWords)) capped.push(targetWords)
  return Array.from(new Set(capped)).sort((a, b) => a - b)
}

function buildMillionWordMilestonesModel(args: {
  writingBible: AnyRecord
  targetWords: number
  writtenWords: number
}): PlanningWorkspaceModel['millionWordMilestones'] {
  const rawMilestones = resolveRawMillionWordMilestones(args.writingBible)
  const hasExplicitMilestones = rawMilestones.length > 0
  const rows = hasExplicitMilestones
    ? rawMilestones
    : defaultMillionWordMilestoneTargets(args.targetWords).map(targetWords => ({
        target_words: targetWords,
        label: targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `${targetWords}字节点`,
      }))
  const nextTargetWords = rows
    .map(row => milestoneNumber(row?.target_words, row?.targetWords, row?.words))
    .filter(value => value > args.writtenWords)
    .sort((a, b) => a - b)[0] || null

  const milestones: PlanningMillionWordMilestone[] = rows
    .map((row, index) => {
      const targetWords = milestoneNumber(row?.target_words, row?.targetWords, row?.words)
      const targetChapter = numberOrNull(row?.target_chapter, row?.targetChapter, row?.chapter_no, row?.chapterNo)
      const theme = firstNonEmpty(row?.theme, row?.title, row?.goal, row?.stage_goal)
      const protagonistState = firstNonEmpty(row?.protagonist_state, row?.protagonistState, row?.character_state, row?.identity_shift)
      const worldExpansion = firstNonEmpty(row?.world_expansion, row?.worldExpansion, row?.map_expansion, row?.setting_expansion)
      const conflictEscalation = firstNonEmpty(row?.conflict_escalation, row?.conflictEscalation, row?.antagonist_escalation, row?.stakes)
      const readerPayoff = firstNonEmpty(row?.reader_payoff, row?.readerPayoff, row?.payoff, row?.reward)
      const riskTags = [
        !theme ? '缺阶段主题' : '',
        !protagonistState ? '缺主角状态' : '',
        !worldExpansion ? '缺世界扩展' : '',
        !conflictEscalation ? '缺冲突升级' : '',
        !readerPayoff ? '缺读者回报' : '',
      ].filter(Boolean)
      return {
        key: targetWords ? `milestone-${targetWords}` : `milestone-${index + 1}`,
        label: firstNonEmpty(row?.label, row?.title, targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `里程碑 ${index + 1}`),
        targetWords,
        targetChapter,
        status: riskTags.length ? 'needs_plan' : milestoneStatus(targetWords, args.writtenWords, nextTargetWords),
        theme,
        protagonistState,
        worldExpansion,
        conflictEscalation,
        readerPayoff,
        riskTags,
        actionKey: riskTags.length ? 'open_story_assets' : 'enter_chapter_writing',
      }
    })
    .sort((a, b) => (a.targetWords || 999999999) - (b.targetWords || 999999999))

  const currentMilestone = milestones.find(item => item.status === 'current')
    || milestones.find(item => item.status === 'needs_plan')
    || milestones.find(item => item.status === 'future')
    || milestones.at(-1)
    || null
  const nextMilestone = milestones.find(item => item.targetWords > args.writtenWords) || currentMilestone
  const riskCount = milestones.reduce((sum, item) => sum + item.riskTags.length, 0)
  const epicTarget = args.targetWords >= 3000000
  const requiredCount = epicTarget ? 3 : 1
  const tooFew = milestones.length < requiredCount
  const status: PlanningWorkspaceModel['millionWordMilestones']['status'] = epicTarget && !hasExplicitMilestones
    ? 'blocked'
    : tooFew
      ? 'needs_attention'
      : riskCount > 0
        ? 'needs_attention'
        : 'ready'
  const completeScore = milestones.length
    ? Math.round((milestones.length * 5 + milestones.filter(item => item.riskTags.length === 0).length * 20) / Math.max(1, milestones.length * 25) * 100)
    : 0
  const countPenalty = tooFew ? 20 : 0
  const score = boundedScore(completeScore - riskCount * 4 - countPenalty, status === 'ready' ? 88 : status === 'blocked' ? 45 : 68)

  return {
    status,
    score,
    label: status === 'ready' ? `里程碑 ${score}` : status === 'blocked' ? `里程碑阻塞 ${score}` : `里程碑待补 ${score}`,
    summary: status === 'ready'
      ? `已规划 ${milestones.length} 个百万字级节点，下一节点：${nextMilestone?.label || '未定位'}。`
      : !hasExplicitMilestones && epicTarget
        ? '缺少百万字里程碑：300万字以上项目需要明确30万、100万、300万等阶段的主角状态、世界扩展、冲突升级和读者回报。'
        : `百万字里程碑仍有 ${riskCount + (tooFew ? 1 : 0)} 项缺口，先补齐后再扩大自动连写。`,
    sourceLabel: hasExplicitMilestones ? '来自写作圣经' : epicTarget ? '系统占位' : '短中篇可选',
    total: milestones.length,
    currentMilestone,
    nextMilestone,
    milestones,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    nextActions: status === 'ready'
      ? ['按当前百万字里程碑推进未来100章和当前卷规划。']
      : ['补齐百万字节点的主角状态、世界扩展、冲突升级和读者回报，再恢复安全连写。'],
  }
}

function memoryFieldText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  return firstNonEmpty(
    value.text,
    value.summary,
    value.description,
    value.status,
    value.state,
    value.current_state,
    value.currentState,
    value.location,
    value.current_location,
  )
}

function memoryItemText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const name = firstNonEmpty(value.name, value.character_name, value.characterName, value.title, value.key)
  const state = memoryFieldText(value)
  const chapterNo = numberOrNull(value.chapter_no, value.chapterNo, value.last_updated_chapter, value.lastUpdatedChapter)
  const base = [name, state].filter(Boolean).join('：')
  return text(chapterNo ? `${base || name}@第${chapterNo}章` : base || name)
}

function memoryList(...values: any[]) {
  return compactList(values.flatMap(value => arrayValue(value)).map(memoryItemText), 10)
}

function buildLongformMemoryCapsuleModel(args: {
  writingBible: AnyRecord
  storyState: AnyRecord
  latestWrittenChapterNo: number
}): PlanningWorkspaceModel['longformMemoryCapsule'] {
  const global = args.storyState?.global || args.storyState || {}
  const lastUpdatedChapter = numberOrNull(args.storyState?.last_updated_chapter, args.storyState?.lastUpdatedChapter, global?.last_updated_chapter, global?.lastUpdatedChapter)
  const corePromise = firstNonEmpty(
    args.writingBible?.reader_promise,
    args.writingBible?.promise,
    args.writingBible?.core_selling_point,
    global?.reader_promise,
    global?.core_promise,
  )
  const currentVolumeGoal = firstNonEmpty(global?.current_volume_goal, global?.volume_goal, args.storyState?.current_volume_goal, args.storyState?.volume_goal)
  const mainlineProgress = firstNonEmpty(global?.mainline_progress, global?.current_mainline, global?.mainline, args.storyState?.mainline_progress, args.storyState?.current_mainline, args.storyState?.mainline)
  const characterStates = memoryList(args.storyState?.character_states, global?.character_states, args.storyState?.characters, global?.characters)
  const openQuestions = memoryList(args.storyState?.open_questions, global?.open_questions, args.storyState?.unresolved_questions, global?.unresolved_questions)
  const payoffDebts = memoryList(args.storyState?.payoff_debts, global?.payoff_debts, args.storyState?.payoff_queue, global?.payoff_queue)
  const canonFacts = memoryList(args.storyState?.canon_facts, global?.canon_facts, args.storyState?.facts, global?.facts)
  const redLines = memoryList(args.writingBible?.immutable_rules, args.writingBible?.immutableRules, global?.red_lines, args.storyState?.red_lines)
  const evidenceCount = [
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    ...characterStates,
    ...openQuestions,
    ...payoffDebts,
    ...canonFacts,
    ...redLines,
  ].filter(Boolean).length
  const stale = Boolean(args.latestWrittenChapterNo && (!lastUpdatedChapter || lastUpdatedChapter < args.latestWrittenChapterNo))
  const status: PlanningWorkspaceModel['longformMemoryCapsule']['status'] = evidenceCount === 0
    ? 'missing'
    : stale
      ? 'needs_sync'
      : 'ready'
  const score = status === 'ready'
    ? boundedScore(Math.min(100, 60 + evidenceCount * 6), 86)
    : status === 'needs_sync'
      ? boundedScore(Math.min(78, 46 + evidenceCount * 4), 62)
      : 35

  return {
    status,
    score,
    label: status === 'ready' ? `记忆胶囊 ${score}` : status === 'needs_sync' ? `记忆待同步 ${score}` : `记忆缺失 ${score}`,
    summary: status === 'ready'
      ? `正史胶囊已同步到第${lastUpdatedChapter || '?'}章，包含角色 ${characterStates.length}、悬念 ${openQuestions.length}、回报债 ${payoffDebts.length}。`
      : status === 'needs_sync'
        ? `故事状态只同步到第${lastUpdatedChapter || 0}章，已写到第${args.latestWrittenChapterNo}章；继续生成前建议先同步正史胶囊。`
        : '缺少可召回的长篇正史胶囊，建议先同步故事状态或补齐写作圣经。',
    lastUpdatedChapter,
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    characterStates,
    openQuestions,
    payoffDebts,
    canonFacts,
    redLines,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : status === 'needs_sync' ? 'update_story_state' : 'open_story_assets',
  }
}

function reviewHasPayload(value: AnyRecord) {
  return Boolean(value && Object.keys(value).length > 0)
}

function itemTextList(items: any[], limit = 2) {
  return items
    .map(item => text(item?.text || item?.summary || item?.label || item?.description || item?.name || item))
    .filter(Boolean)
    .slice(0, limit)
    .join('；')
}

function buildReaderTrustLedgerModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrustLedger'] {
  const expectation = latestReviewPayloadAny(reviews, 'reader_expectation_sync', 'reader_expectation_sync')
  const payoff = latestReviewPayloadAny(reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const retention = latestReviewPayloadAny(reviews, 'reader_retention_sync', 'reader_retention_sync')
  const hasAnyReview = reviewHasPayload(expectation) || reviewHasPayload(payoff) || reviewHasPayload(retention)
  const expectationDebtCount = numericCount(expectation?.missed_count, expectation?.missedCount, listLength(expectation?.missed))
  const payoffDebtCount = numericCount(payoff?.debt_count, payoff?.debtCount, listLength(payoff?.missed) + listLength(payoff?.debts))
  const retentionMissedCount = numericCount(retention?.missed_count, retention?.missedCount, listLength(retention?.missed))
  const keepAliveCount = listLength(expectation?.keep_alive)
  const expectationDetail = expectationDebtCount > 0
    ? itemTextList(arrayValue(expectation?.missed)) || text(expectation?.summary || expectation?.label, `期待欠账 ${expectationDebtCount}`)
    : reviewHasPayload(expectation)
      ? text(expectation?.summary || expectation?.label, '本章读者期待已基本兑现。')
      : '交稿后同步故事状态，会形成期待兑现复盘。'
  const payoffDetail = payoffDebtCount > 0
    ? itemTextList([...arrayValue(payoff?.missed), ...arrayValue(payoff?.debts)]) || text(payoff?.summary || payoff?.label, `回报欠账 ${payoffDebtCount}`)
    : reviewHasPayload(payoff)
      ? text(payoff?.summary || payoff?.label, '场景回报和待回收期待处于可控状态。')
      : '交稿后会检查爽点、信息回收和待回收期待。'
  const retentionDetail = retentionMissedCount > 0
    ? itemTextList(arrayValue(retention?.missed)) || text(retention?.summary || retention?.label, `追读漏项 ${retentionMissedCount}`)
    : reviewHasPayload(retention)
      ? text(retention?.summary || retention?.label, '追读钩子和情绪回报处于可控状态。')
      : '前300字钩子、章末问题和短剧化场面会在交稿后复盘。'
  const keepAliveDetail = keepAliveCount > 0
    ? itemTextList(arrayValue(expectation?.keep_alive), 3)
    : '没有需要特别保活的长期悬念。'
  const riskCount = expectationDebtCount + payoffDebtCount + retentionMissedCount
  const scoreCandidates = [expectation?.score, payoff?.score, retention?.score]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value))
  const score = scoreCandidates.length > 0
    ? Math.round(Math.min(...scoreCandidates))
    : null
  const signals: PlanningWorkspaceModel['readerTrustLedger']['signals'] = [
    {
      key: 'expectation',
      label: '期待兑现',
      status: expectationDebtCount > 0 ? 'warn' : 'ok',
      count: expectationDebtCount,
      detail: expectationDetail,
      actionKey: expectationDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'payoff',
      label: '爽点回报',
      status: payoffDebtCount > 0 ? 'warn' : 'ok',
      count: payoffDebtCount,
      detail: payoffDetail,
      actionKey: payoffDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'retention',
      label: '追读钩子',
      status: retentionMissedCount > 0 ? 'warn' : 'ok',
      count: retentionMissedCount,
      detail: retentionDetail,
      actionKey: retentionMissedCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'keep_alive',
      label: '继续悬念',
      status: 'ok',
      count: keepAliveCount,
      detail: keepAliveDetail,
      actionKey: 'enter_chapter_writing',
    },
  ]
  if (!hasAnyReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成读者期待、爽点回报和追读钩子的交稿复盘。',
      actionKey: 'open_quality_revision',
      expectationDebtCount: 0,
      payoffDebtCount: 0,
      retentionMissedCount: 0,
      keepAliveCount: 0,
      signals,
    }
  }
  const status: PlanningWorkspaceModel['readerTrustLedger']['status'] = riskCount > 0 ? 'needs_attention' : 'ready'
  const summary = status === 'ready'
    ? `追读信任稳定：期待兑现、爽点回报和章末钩子没有明显欠账，保活悬念 ${keepAliveCount} 项。`
    : `追读信任需修复：期待欠账 ${expectationDebtCount}，回报欠账 ${payoffDebtCount}，追读漏项 ${retentionMissedCount}，保活悬念 ${keepAliveCount}。`
  return {
    status,
    score,
    summary,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    expectationDebtCount,
    payoffDebtCount,
    retentionMissedCount,
    keepAliveCount,
    signals,
  }
}

function readerTrialStatus(value: any): PlanningWorkspaceModel['readerTrialRoom']['status'] {
  const status = text(value).toLowerCase()
  if (status === 'ready' || status === 'ok') return 'ready'
  if (status === 'blocked' || status === 'block') return 'blocked'
  if (status === 'needs_repair' || status === 'warn') return 'needs_repair'
  return 'missing'
}

function readerTrialQualityBar(value: any) {
  if (text(value) === 'qidian_10k_reader_trial_baseline') return '起点1万均订试读基准'
  return text(value, '起点1万均订试读基准')
}

function buildReaderTrialRoomModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrialRoom'] {
  const report = latestReviewPayloadAny(reviews, 'reader_trial_review', 'report')
  const hasReview = reviewHasPayload(report)
  const status = hasReview ? readerTrialStatus(report?.status) : 'missing'
  const personas = arrayValue(report?.personas).map(item => ({
    key: text(item?.key, 'trial_reader'),
    label: text(item?.label, '平台试读用户'),
    focus: text(item?.focus, '判断本章和前十章是否能让读者继续点击下一章。'),
    verdict: text(item?.verdict, '暂无试读结论。'),
    score: boundedScore(item?.score, 0),
    riskLevel: text(item?.risk_level || item?.riskLevel, 'medium') as 'low' | 'medium' | 'high',
  }))
  const segments = arrayValue(report?.segments).map(item => ({
    key: text(item?.key),
    label: text(item?.label, '试读分段'),
    score: boundedScore(item?.score, 0),
    verdict: text(item?.verdict, '暂无分段结论。'),
  }))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints).map(item => text(item)).filter(Boolean)
  const pullPoints = arrayValue(report?.pull_points || report?.pullPoints).map(item => text(item)).filter(Boolean)
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions).map(item => text(item)).filter(Boolean)
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行读者试读复盘。建议在前30章诊断和最近章节交稿后运行，模拟爽点读者、剧情党、设定党和平台试读用户的弃读点。',
      qualityBar: '起点1万均订试读基准',
      actionKey: 'run_reader_trial_review',
      personas: [
        { key: 'payoff_reader', label: '爽点读者', focus: '每章是否有可感知收益、反杀、打脸、升级或信息回报。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'plot_reader', label: '剧情党', focus: '主线压力、目标推进和章末未解问题是否连续。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'setting_reader', label: '设定党', focus: '能力体系、规则代价、世界资产和创新机制是否新鲜且不乱。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'trial_reader', label: '平台试读用户', focus: '前三章能否抓住人，前十章是否让读者愿意继续追。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
      ],
      segments: [],
      dropPoints: [],
      pullPoints: [],
      repairActions: ['先运行读者试读复盘，确认开篇、试读十章和最近十章的弃读点。'],
    }
  }
  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: text(report?.summary, '已完成读者试读复盘。'),
    qualityBar: readerTrialQualityBar(report?.quality_bar || report?.qualityBar),
    actionKey: status === 'ready' && dropPoints.length === 0 ? 'run_reader_trial_review' : 'create_reader_trial_repair',
    personas,
    segments,
    dropPoints,
    pullPoints,
    repairActions,
  }
}

function innovationItemsByKey(items: any[], pattern: RegExp) {
  return arrayValue(items).filter(item => pattern.test(text(item?.key || item?.label || item?.type)))
}

function innovationSignalDetail(missed: any[], planned: any[], fallback: string) {
  return itemTextList(missed, 2) || itemTextList(planned, 2) || fallback
}

function buildInnovationRadarModel(reviews: AnyRecord[]): PlanningWorkspaceModel['innovationRadar'] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const hasReview = reviewHasPayload(innovation)
  const planned = arrayValue(innovation?.planned)
  const delivered = arrayValue(innovation?.delivered)
  const missed = arrayValue(innovation?.missed)
  const missedCount = numericCount(innovation?.missed_count, innovation?.missedCount, missed.length)
  const plannedCount = numericCount(innovation?.planned_count, innovation?.plannedCount, planned.length)
  const deliveredCount = numericCount(innovation?.delivered_count, innovation?.deliveredCount, delivered.length)
  const score = Number.isFinite(Number(innovation?.score)) ? Number(innovation.score) : null
  const signalDefs: Array<{
    key: PlanningWorkspaceModel['innovationRadar']['signals'][number]['key']
    label: string
    pattern: RegExp
    fallback: string
  }> = [
    { key: 'chapter_angle', label: '创新角度', pattern: /chapter_angle|创新角度|angle/, fallback: '本章要把长篇创新卖点转成可见选择、机制或反差。' },
    { key: 'execution', label: '执行点', pattern: /execution|执行点|point/, fallback: '创新执行要落成动作、规则代价、信息差或冲突反转。' },
    { key: 'differentiation', label: '差异护栏', pattern: /differentiation|差异|护栏|guardrail/, fallback: '避免写成同题材常见开挂、升级、逃生或打脸套路。' },
    { key: 'ip_adaptation', label: 'IP化场面', pattern: /ip_adaptation|IP化|场面|hook/, fallback: '保留适合短剧、漫剧或视觉改编的空间冲突和标志性画面。' },
  ]
  const signals = signalDefs.map(def => {
    const missedItems = innovationItemsByKey(missed, def.pattern)
    const plannedItems = innovationItemsByKey(planned, def.pattern)
    return {
      key: def.key,
      label: def.label,
      status: missedItems.length > 0 ? 'warn' as const : 'ok' as const,
      count: missedItems.length,
      detail: innovationSignalDetail(missedItems, plannedItems, def.fallback),
      actionKey: missedItems.length > 0 ? 'open_quality_revision' as PlanningActionKey : 'enter_chapter_writing' as PlanningActionKey,
    }
  })
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成创新兑现复盘。交稿并同步故事状态后，会检查本章是否写成普通套路章。',
      actionKey: 'longform_creation_diagnosis',
      missedCount: 0,
      plannedCount: 0,
      deliveredCount: 0,
      nextActions: ['先运行长篇创作诊断或完成章节交稿复盘，确认创新卖点能持续落地。'],
      signals,
    }
  }
  const status: PlanningWorkspaceModel['innovationRadar']['status'] = missedCount > 0 || text(innovation?.status).toLowerCase() === 'warn'
    ? 'needs_attention'
    : 'ready'
  return {
    status,
    score,
    summary: status === 'ready'
      ? text(innovation?.summary || innovation?.label, '创新角度、执行点、差异护栏和 IP 化场面已基本兑现。')
      : text(innovation?.summary || innovation?.label, `创新缺口 ${missedCount}`),
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    missedCount,
    plannedCount,
    deliveredCount,
    nextActions: arrayValue(innovation?.next_actions).map(item => text(item)).filter(Boolean),
    signals,
  }
}

function latestDeliveryRiskCounts(reviews: AnyRecord[]) {
  return aggregateDeliveryRiskCounts(reviews)
}

function buildVolumeSegmentGateModel(args: {
  currentVolume: AnyRecord
  currentVolumeGoal: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
}): PlanningWorkspaceModel['volumeSegmentGate'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start || 1)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const total = start && end ? Math.max(1, end - start + 1) : Math.max(1, args.volumeBeatBudget.totalChapters || 50)
  const written = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= (start || 1) && chapterNo <= end && Boolean(text(chapter?.chapter_text))
  }).length
  const percent = Math.max(0, Math.min(100, Math.round((written / total) * 100)))
  const riskCounts = latestDeliveryRiskCounts(args.reviews)
  const ipSignal = args.innovationRadar.signals.find(signal => signal.key === 'ip_adaptation')
  const signals: PlanningWorkspaceModel['volumeSegmentGate']['signals'] = [
    {
      key: 'volume_goal',
      label: '阶段目标',
      status: args.currentVolumeGoal ? 'ok' : 'block',
      score: args.currentVolumeGoal ? 88 : 35,
      count: args.currentVolumeGoal ? 0 : 1,
      detail: args.currentVolumeGoal ? `当前卷目标：${args.currentVolumeGoal}` : '当前卷缺少明确阶段目标，不能判断这一段服务什么读者承诺。',
      actionKey: args.currentVolumeGoal ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'climax_payoff',
      label: '高潮/回报',
      status: args.volumeBeatBudget.status === 'ready' ? 'ok' : args.volumeBeatBudget.status === 'blocked' ? 'block' : 'warn',
      score: args.volumeBeatBudget.score,
      count: Math.max(0, args.volumeBeatBudget.climaxTarget - args.volumeBeatBudget.climaxCount)
        + Math.max(0, args.volumeBeatBudget.payoffTarget - args.volumeBeatBudget.payoffCount),
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'reader_trust',
      label: '读者信任',
      status: args.readerTrustLedger.status === 'ready' ? 'ok' : args.readerTrustLedger.status === 'missing' ? 'warn' : 'warn',
      score: args.readerTrustLedger.score !== null ? boundedScore(args.readerTrustLedger.score, 70) : args.readerTrustLedger.status === 'ready' ? 86 : 68,
      count: args.readerTrustLedger.expectationDebtCount + args.readerTrustLedger.payoffDebtCount + args.readerTrustLedger.retentionMissedCount,
      detail: args.readerTrustLedger.summary,
      actionKey: args.readerTrustLedger.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP化',
      status: args.innovationRadar.status === 'ready' ? 'ok' : 'warn',
      score: args.innovationRadar.score !== null ? boundedScore(args.innovationRadar.score, 70) : args.innovationRadar.status === 'ready' ? 86 : 68,
      count: args.innovationRadar.missedCount,
      detail: ipSignal?.detail || args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'risk_closure',
      label: '风险闭环',
      status: riskCounts.total > 0 ? 'warn' : 'ok',
      score: Math.max(45, 100 - riskCounts.total * 8),
      count: riskCounts.total,
      detail: riskCounts.total > 0
        ? `仍有 ${riskCounts.total} 项核心、回报、追读、创新、爆点、剧情线或可读性风险没有收干净。`
        : '最近章节交稿风险已收敛，可以进入下一段推进。',
      actionKey: riskCounts.total > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['volumeSegmentGate']['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 70)
  const actionKey = signals.find(signal => signal.status === 'block')?.actionKey
    || signals.find(signal => signal.key === 'climax_payoff' && signal.status !== 'ok')?.actionKey
    || signals.find(signal => signal.status === 'warn')?.actionKey
    || 'enter_chapter_writing'
  const nextActions = status === 'ready'
    ? ['当前卷段目标、爆点、读者信任和创新场面基本闭环，可以继续推进下一批章节。']
    : [
        '先补齐当前卷爆点、爽点回报和 IP 化场面，再扩大连续生产。',
        '阶段验收未通过时，优先修最近章节的读者期待欠账、创新缺口和剧情线风险。',
      ]

  return {
    status,
    score,
    label: status === 'ready' ? `卷段验收 ${score}` : status === 'blocked' ? `卷段阻塞 ${score}` : `卷段待修 ${score}`,
    summary: status === 'ready'
      ? '当前卷段的目标、高潮回报、读者信任、创新/IP化场面和风险闭环都可支撑继续连载。'
      : `当前卷段还有 ${signals.filter(signal => signal.status !== 'ok').length} 类问题，先完成阶段验收再扩大批量生产。`,
    currentSegmentLabel: start && end ? `第${start}-${end}章` : args.volumeBeatBudget.chapterRange,
    actionKey,
    chapterProgress: { written, total, percent },
    signals,
    nextActions,
  }
}

function chapterPayload(chapter: AnyRecord) {
  return parseJsonValue(chapter?.raw_payload) || {}
}

function fatigueFingerprint(value: string) {
  return text(value)
    .toLowerCase()
    .replace(/[“”"'\s，。！？!?,.、：:；;（）()[\]{}《》<>]/g, '')
}

function dominantFatigueValue(values: string[]) {
  const counts = new Map<string, { display: string; count: number }>()
  values.forEach(value => {
    const key = fatigueFingerprint(value)
    if (!key) return
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { display: value, count: 1 })
  })
  const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, 'zh-CN'))
  return {
    rows,
    top: rows[0] || { display: '', count: 0 },
    uniqueCount: rows.length,
  }
}

function buildFatigueVarietySignal(args: {
  key: PlanningWorkspaceModel['recentFatigueRadar']['signals'][number]['key']
  label: string
  noun: string
  values: string[]
  chapterCount: number
}): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const total = args.values.length
  if (args.chapterCount < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'ok',
      score: 86,
      count: 0,
      detail: `近10章样本不足四章，暂不判断${args.noun}疲劳。`,
      actionKey: 'enter_chapter_writing',
    }
  }
  if (total < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'warn',
      score: 70,
      count: args.chapterCount - total,
      detail: `近10章缺少足够的${args.noun}记录，批量连写前需要补齐章节规划。`,
      actionKey: 'update_rolling_plan',
    }
  }

  const { top, uniqueCount } = dominantFatigueValue(args.values)
  const repeatRatio = top.count / Math.max(1, total)
  const lowVariety = uniqueCount <= Math.max(2, Math.ceil(total * 0.25))
  const repeated = repeatRatio >= 0.5
  const status = lowVariety || repeated ? 'warn' : 'ok'
  const score = status === 'warn'
    ? boundedScore(96 - repeatRatio * 46 - (lowVariety ? 10 : 0), 68)
    : boundedScore(88 + Math.min(10, uniqueCount), 88)

  return {
    key: args.key,
    label: args.label,
    status,
    score,
    count: status === 'warn' ? top.count : 0,
    detail: status === 'warn'
      ? `近${total}章「${top.display}」出现 ${top.count} 次，${args.noun}变化不足。`
      : `近${total}章有 ${uniqueCount} 种${args.noun}，暂无明显重复。`,
    actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
  }
}

function buildSceneFreshnessSignal(
  recentChapters: AnyRecord[],
  reviews: AnyRecord[],
): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const plannedScenes = innovationItemsByKey(arrayValue(innovation?.planned), /ip_adaptation|IP化|场面|visual|hook/)
  const missedScenes = innovationItemsByKey(arrayValue(innovation?.missed), /ip_adaptation|IP化|场面|visual|hook/)
  if (missedScenes.length > 0) {
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status: 'warn',
      score: 62,
      count: missedScenes.length,
      detail: itemTextList(missedScenes, 2) || 'IP化场面或标志性画面没有兑现，最近章节容易显得同质。',
      actionKey: 'open_quality_revision',
    }
  }

  const ipSceneCoverage = buildIpSceneIntakeCoverage(recentChapters, reviews)
  if (ipSceneCoverage.total >= 4 && ipSceneCoverage.coveredCount > 0) {
    const requiredCount = Math.max(2, Math.ceil(ipSceneCoverage.total * 0.3))
    const status = ipSceneCoverage.coveredCount < requiredCount ? 'warn' : 'ok'
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status,
      score: status === 'warn'
        ? boundedScore(90 - (ipSceneCoverage.missingCount / Math.max(1, ipSceneCoverage.total)) * 34, 60)
        : boundedScore(82 + ipSceneCoverage.coveredCount * 3, 86),
      count: status === 'warn' ? ipSceneCoverage.missingCount : 0,
      detail: status === 'warn'
        ? `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，强场面空窗偏长。${ipSceneCoverage.examples.length ? `已沉淀：${ipSceneCoverage.examples.slice(0, 2).join('；')}` : '下一批需要补可视化冲突。'}`
        : `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，近期已有标志性强场面：${ipSceneCoverage.examples.slice(0, 2).join('；')}`,
      actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
    }
  }

  const sceneValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.ip_adaptation_hook,
        payload?.short_drama_scene,
        payload?.visual_hook,
        payload?.scene,
        payload?.location,
      )
    })
    .filter(Boolean)
  if (sceneValues.length >= 4) {
    return buildFatigueVarietySignal({
      key: 'scene_freshness',
      label: '场面新鲜度',
      noun: '可视化场面',
      values: sceneValues,
      chapterCount: recentChapters.length,
    })
  }

  return {
    key: 'scene_freshness',
    label: '场面新鲜度',
    status: plannedScenes.length > 0 ? 'ok' : 'warn',
    score: plannedScenes.length > 0 ? 84 : 72,
    count: plannedScenes.length > 0 ? 0 : 1,
    detail: plannedScenes.length > 0
      ? itemTextList(plannedScenes, 2) || '近期章节已有可视化场面规划。'
      : '近10章缺少稳定的场面/IP化记录，建议给下一批章节补标志性场景。',
    actionKey: plannedScenes.length > 0 ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function buildIpSceneIntakeCoverage(recentChapters: AnyRecord[], reviews: AnyRecord[]) {
  const chapterNos = recentChapters
    .map(chapter => Number(chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const chapterNoSet = new Set(chapterNos)
  const coveredNos = new Set<number>()
  const examples: string[] = []

  for (const review of reviews) {
    if (text(review?.review_type) !== 'ip_scene_intake') continue
    const payload = parseJsonValue(review?.payload) || {}
    const root = payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
    const chapterNo = Number(root?.chapter_no || root?.chapterNo || payload?.chapter_no || payload?.chapterNo || review?.chapter_no || 0)
    if (!chapterNoSet.has(chapterNo)) continue
    const candidates = arrayValue(root?.ip_scene_candidates || root?.ipSceneCandidates || payload?.ip_scene_candidates)
    if (candidates.length <= 0) continue
    coveredNos.add(chapterNo)
    for (const candidate of candidates.slice(0, 2)) {
      const label = firstNonEmpty(
        candidate?.title,
        candidate?.name,
        candidate?.visual_hook,
        candidate?.visualHook,
        candidate?.adaptation_value,
      )
      if (label && !examples.includes(label)) examples.push(label)
    }
  }

  return {
    total: chapterNos.length,
    coveredCount: coveredNos.size,
    missingCount: Math.max(0, chapterNos.length - coveredNos.size),
    examples,
  }
}

function buildRecentFatigueRadarModel(args: {
  chapters: AnyRecord[]
  activeChapterNo: number
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['recentFatigueRadar'] {
  const start = Math.max(1, Number(args.activeChapterNo || 1) - 6)
  const end = start + 9
  const recentChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const conflictValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.conflict, payload?.conflict, payload?.core_conflict)
    })
    .filter(Boolean)
  const payoffValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.payoff,
        payload?.reader_payoff,
        payload?.reader_reward,
        chapter?.payoff,
        chapter?.reader_payoff,
      )
    })
    .filter(Boolean)
  const hookValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.ending_hook, chapter?.endingHook, chapter?.hook, payload?.ending_hook, payload?.hook)
    })
    .filter(Boolean)
  const signals: PlanningWorkspaceModel['recentFatigueRadar']['signals'] = [
    buildFatigueVarietySignal({
      key: 'conflict_variety',
      label: '冲突变化',
      noun: '冲突来源',
      values: conflictValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'payoff_variety',
      label: '回报变化',
      noun: '回报形态',
      values: payoffValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'hook_variety',
      label: '钩子变化',
      noun: '章末问题',
      values: hookValues,
      chapterCount: recentChapters.length,
    }),
    buildSceneFreshnessSignal(recentChapters, args.reviews),
  ]
  const warningSignals = signals.filter(signal => signal.status === 'warn')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 82)
  const status: PlanningWorkspaceModel['recentFatigueRadar']['status'] = warningSignals.length > 0 ? 'needs_attention' : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `疲劳稳定 ${score}` : `疲劳风险 ${score}`,
    summary: status === 'ready'
      ? '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。'
      : `近10章存在 ${warningSignals.length} 类同质化风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    signals,
    nextActions: status === 'ready'
      ? ['保持冲突来源、回报形态、章末问题和可视化场面的轮换。']
      : ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
  }
}

function pressureRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(row?.summary, row?.chapter_summary, payload?.summary),
  ].filter(Boolean).join('；')
}

function pressureSourceForRow(row: AnyRecord) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.pressure_source,
    payload?.pressureSource,
    payload?.antagonist_pressure,
    payload?.antagonistPressure,
    row?.pressure_source,
    row?.antagonist_pressure,
    row?.conflict,
    payload?.conflict,
    row?.chapter_goal,
  )
}

function pressureSignalFromPattern(args: {
  key: PlanningWorkspaceModel['storyPressureLadder']['signals'][number]['key']
  label: string
  noun: string
  rows: AnyRecord[]
  pattern: RegExp
  okDetail: string
  warnDetail: string
}): PlanningWorkspaceModel['storyPressureLadder']['signals'][number] {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 48,
      count: 3 - args.rows.length,
      detail: `未来章节样本不足，暂时无法判断${args.noun}。`,
      actionKey: 'update_rolling_plan',
    }
  }
  const hitCount = args.rows.filter(row => args.pattern.test(pressureRowText(row))).length
  const ratio = hitCount / Math.max(1, args.rows.length)
  const status = ratio >= 0.45 ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? boundedScore(78 + ratio * 20, 88) : boundedScore(56 + ratio * 28, 66),
    count: status === 'ok' ? hitCount : Math.max(1, args.rows.length - hitCount),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function buildStoryPressureLadderModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['storyPressureLadder'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 10)
  const start = Number(rows[0]?.chapter_no || args.activeChapterNo || 1)
  const end = Number(rows.at(-1)?.chapter_no || start)
  const pressureValues = rows.map(pressureSourceForRow).filter(Boolean)
  const sourceStats = dominantFatigueValue(pressureValues)
  const pressureSources = sourceStats.rows.slice(0, 4).map(source => ({
    label: source.display,
    count: source.count,
    chapters: rows
      .filter(row => fatigueFingerprint(pressureSourceForRow(row)) === fatigueFingerprint(source.display))
      .map(row => Number(row?.chapter_no || 0))
      .filter(Boolean),
    riskLevel: source.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' as const : 'ok' as const,
  }))

  const pressureSourceSignal: PlanningWorkspaceModel['storyPressureLadder']['signals'][number] = rows.length < 3
    ? {
        key: 'pressure_source',
        label: '压力源',
        status: 'block',
        score: 45,
        count: Math.max(1, 3 - rows.length),
        detail: '未来章节样本不足，先补齐至少三章的压力来源。',
        actionKey: 'update_rolling_plan',
      }
    : pressureValues.length < 3
      ? {
          key: 'pressure_source',
          label: '压力源',
          status: 'warn',
          score: 62,
          count: rows.length - pressureValues.length,
          detail: '未来章节缺少明确反派、规则、环境或组织压力来源。',
          actionKey: 'update_rolling_plan',
        }
      : {
          key: 'pressure_source',
          label: '压力源',
          status: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' : 'ok',
          score: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 64 : 86,
          count: sourceStats.top.count,
          detail: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5
            ? `未来${pressureValues.length}章「${sourceStats.top.display}」出现 ${sourceStats.top.count} 次，压力源过于集中。`
            : `未来${pressureValues.length}章有 ${sourceStats.uniqueCount} 种压力源，压力来源较稳。`,
          actionKey: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'update_rolling_plan' : 'enter_chapter_writing',
        }

  const signals: PlanningWorkspaceModel['storyPressureLadder']['signals'] = [
    pressureSourceSignal,
    pressureSignalFromPattern({
      key: 'conflict_escalation',
      label: '冲突升级',
      noun: '冲突升级',
      rows,
      pattern: /升级|加码|更大|逼近|追杀|围堵|失控|爆发|反噬|惩罚|危机|敌人|强敌|公开|围攻|封锁/,
      okDetail: '未来章节能看到压力加码或冲突升级。',
      warnDetail: '未来章节缺少明确升级词和加码动作，容易停留在平铺推进。',
    }),
    pressureSignalFromPattern({
      key: 'stakes_growth',
      label: '赌注升级',
      noun: '赌注升级',
      rows,
      pattern: /代价|赌注|失去|死亡|重伤|身份|资源|名额|暴露|失败|牺牲|抉择|惩罚|逐出|清算|欠债/,
      okDetail: '未来章节能看到身份、资源、生命、关系或代价层面的赌注。',
      warnDetail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。',
    }),
    pressureSignalFromPattern({
      key: 'reversal_pressure',
      label: '反转逼迫',
      noun: '反转逼迫',
      rows,
      pattern: /反转|背叛|误导|陷阱|反制|逼迫|选择|真相|证据|偷袭|揭穿|倒计时|交换|威胁|两难/,
      okDetail: '未来章节有反转、逼迫或两难选择，故事推进具备钩力。',
      warnDetail: '未来章节缺少反转逼迫或两难选择，建议给下一批补强转折点。',
    }),
  ]
  const blockingSignals = signals.filter(signal => signal.status === 'block')
  const warningSignals = signals.filter(signal => signal.status !== 'ok')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const status: PlanningWorkspaceModel['storyPressureLadder']['status'] = blockingSignals.length > 0
    ? 'blocked'
    : warningSignals.length > 0
      ? 'needs_attention'
      : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `压力稳定 ${score}` : status === 'blocked' ? `压力断档 ${score}` : `压力待升 ${score}`,
    summary: status === 'ready'
      ? '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。'
      : `未来章节存在 ${warningSignals.length} 项故事压力风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    pressureSources,
    signals,
    nextActions: status === 'ready'
      ? ['保持压力源、冲突升级、赌注升级和反转逼迫的连续递进。']
      : ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
  }
}

function storyUnitRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.title, payload?.title),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(payload?.reader_payoff, payload?.readerPayoff, payload?.payoff, payload?.reader_reward),
    firstNonEmpty(payload?.foreshadowing_task, payload?.foreshadowingTask, payload?.storyline_task, payload?.storylineTask),
    firstNonEmpty(payload?.mainline_progress, row?.mainline_progress),
  ].filter(Boolean).join('；')
}

function storyUnitChapterRole(row: AnyRecord, index: number, total: number) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.unit_role,
    payload?.story_unit_role,
    payload?.episode_role,
    index === 0 ? '入口钩子' : index === total - 1 ? '出单元钩子' : '',
    /高潮|打脸|兑现|回报|反杀/.test(storyUnitRowText(row)) ? '小高潮回报' : '',
    '推进',
  )
}

function storyUnitSignal(args: {
  key: PlanningStoryUnitSignal['key']
  label: string
  rows: AnyRecord[]
  hitRows: AnyRecord[]
  okDetail: string
  warnDetail: string
  blockDetail?: string
  minHits?: number
}): PlanningStoryUnitSignal {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 45,
      count: Math.max(1, 3 - args.rows.length),
      detail: args.blockDetail || '剧情单元样本不足三章，无法形成完整事件包。',
      actionKey: 'update_rolling_plan',
    }
  }
  const minHits = args.minHits ?? 1
  const status = args.hitRows.length >= minHits ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? 88 : 66,
    count: status === 'ok' ? args.hitRows.length : Math.max(1, minHits - args.hitRows.length),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function storyUnitTitleHint(rows: AnyRecord[], outlines: AnyRecord[] = []) {
  const start = Number(rows[0]?.chapter_no || 0)
  const end = Number(rows.at(-1)?.chapter_no || start)
  if (!start || !end) return ''
  const overlappingTurn = outlines
    .filter(isTurn)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  if (overlappingTurn) return text(overlappingTurn.title)
  const overlappingStage = outlines
    .filter(isStage)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  return text(overlappingStage?.title)
}

function buildStoryUnitFromRows(rows: AnyRecord[], unitIndex = 0, titleHint = ''): PlanningStoryUnit {
  const normalizedRows = rows.filter(Boolean)
  const start = Number(normalizedRows[0]?.chapter_no || 0)
  const end = Number(normalizedRows.at(-1)?.chapter_no || start)
  const titleSeed = firstNonEmpty(
    titleHint,
    normalizedRows[0]?.raw_payload?.story_unit_title,
    normalizedRows[0]?.raw_payload?.arc_title,
    normalizedRows[0]?.raw_payload?.event_package,
    normalizedRows[0]?.title,
    start ? `第${start}-${end}章剧情单元` : '未命名剧情单元',
  )
  const texts = normalizedRows.map(storyUnitRowText)
  const firstRow = normalizedRows[0] || {}
  const lastRow = normalizedRows.at(-1) || {}
  const entryHits = firstNonEmpty(firstRow?.ending_hook, firstRow?.endingHook, firstRow?.hook, chapterPayload(firstRow)?.ending_hook)
    || /入口|开场|钩子|倒计时|危机|逼近|异常|点名|追杀/.test(texts[0] || '')
    ? [firstRow]
    : []
  const pressureHits = normalizedRows.filter(row => /升级|加码|逼近|倒计时|公开|反噬|围堵|陷阱|规则|设局|压迫|危机|失控/.test(storyUnitRowText(row)))
  const payoffHits = normalizedRows.filter(row => /小高潮|高潮|回报|兑现|打脸|反杀|获利|升级|公开|震动|胜利/.test(storyUnitRowText(row)))
  const setupHits = normalizedRows.filter(row => /伏笔|埋线|线索|剧情线|主线|关系线|势力线|阵盘|秘密|真相/.test(storyUnitRowText(row)))
  const exitHits = firstNonEmpty(lastRow?.ending_hook, lastRow?.endingHook, lastRow?.hook, chapterPayload(lastRow)?.ending_hook)
    || /出单元|下一段|点名|招揽|真相|更大|新敌|新地图|入门|内门|悬念/.test(storyUnitRowText(lastRow))
    ? [lastRow]
    : []
  const setupDetail = setupHits
    .map(row => firstNonEmpty(chapterPayload(row)?.foreshadowing_task, chapterPayload(row)?.storyline_task, chapterPayload(row)?.mainline_progress, row?.mainline_progress, storyUnitRowText(row)))
    .filter(Boolean)
    .slice(0, 2)
    .join('；')
  const signals: PlanningStoryUnitSignal[] = [
    storyUnitSignal({
      key: 'entry_hook',
      label: '入口钩子',
      rows: normalizedRows,
      hitRows: entryHits,
      okDetail: `第${Number(firstRow?.chapter_no || start)}章有入口钩子，可以把读者带进本单元。`,
      warnDetail: '单元第一章缺少入口钩子，读者可能不知道为什么进入这一段。',
    }),
    storyUnitSignal({
      key: 'pressure_escalation',
      label: '压力升级',
      rows: normalizedRows,
      hitRows: pressureHits,
      minHits: 2,
      okDetail: `本单元有 ${pressureHits.length} 章体现压力升级或设局加码。`,
      warnDetail: '本单元缺少连续压力升级，容易变成平铺过场。',
    }),
    storyUnitSignal({
      key: 'mini_climax_payoff',
      label: '小高潮/回报',
      rows: normalizedRows,
      hitRows: payoffHits,
      okDetail: `本单元包含小高潮或读者回报：${firstNonEmpty(chapterPayload(payoffHits[0])?.reader_payoff, chapterPayload(payoffHits[0])?.payoff, payoffHits[0]?.title, '已规划回报')}`,
      warnDetail: '本单元缺少小高潮或读者回报，连续写完后可能没有结算感。',
    }),
    storyUnitSignal({
      key: 'setup_and_storyline',
      label: '伏笔/剧情线',
      rows: normalizedRows,
      hitRows: setupHits,
      okDetail: setupDetail || '本单元有伏笔、主线或剧情线调度。',
      warnDetail: '本单元缺少伏笔或剧情线任务，长期连载容易只剩单章事件。',
    }),
    storyUnitSignal({
      key: 'exit_hook',
      label: '出单元钩子',
      rows: normalizedRows,
      hitRows: exitHits,
      okDetail: `第${Number(lastRow?.chapter_no || end)}章有出单元钩子，能把读者带到下一段。`,
      warnDetail: '单元最后一章缺少出单元钩子，下一段承接会变弱。',
    }),
  ]
  const status: PlanningStoryUnit['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const warningLabels = signals.filter(signal => signal.status !== 'ok').map(signal => signal.label)
  return {
    key: `unit-${start || unitIndex + 1}-${end || unitIndex + 1}`,
    title: titleSeed.includes('第') ? titleSeed : `${titleSeed}剧情单元`,
    chapterRangeLabel: start && end ? `第${start}-${end}章` : '章节范围未定',
    startChapter: start,
    endChapter: end,
    status,
    score,
    summary: status === 'ready'
      ? '入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。'
      : `本剧情单元仍缺：${warningLabels.join('、')}。`,
    chapters: normalizedRows.map((row, index) => ({
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, `第${row?.chapter_no || '?'}章`),
      role: storyUnitChapterRole(row, index, normalizedRows.length),
      goal: firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, chapterPayload(row)?.chapter_task, chapterPayload(row)?.summary),
    })),
    signals,
  }
}

function buildStoryUnitWorkshopModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
  outlines?: AnyRecord[]
}): PlanningWorkspaceModel['storyUnitWorkshop'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 12)
  const units: PlanningStoryUnit[] = []
  for (let index = 0; index < rows.length; index += 6) {
    const unitRows = rows.slice(index, index + 6)
    if (unitRows.length) units.push(buildStoryUnitFromRows(unitRows, units.length, storyUnitTitleHint(unitRows, args.outlines || [])))
  }
  const currentUnit = units[0] || buildStoryUnitFromRows([], 0)
  const status = currentUnit.status
  const score = currentUnit.score
  return {
    status,
    score,
    label: status === 'ready' ? `单元完整 ${score}` : status === 'blocked' ? `单元断档 ${score}` : `单元待补 ${score}`,
    summary: status === 'ready'
      ? '当前剧情单元具备完整事件包，可以支撑 5-20 章连续推进。'
      : `当前剧情单元缺少完整事件包：${currentUnit.summary}`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    currentUnit,
    units,
    nextActions: status === 'ready'
      ? ['当前剧情单元入口、压力升级、小高潮、伏笔/剧情线和出单元钩子完整，可以按单元推进。']
      : ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
  }
}

function openDeliveryRiskRepairTaskCount(productionTasks?: AnyRecord | null) {
  const runs = Array.isArray(productionTasks?.tasks)
    ? productionTasks.tasks
    : Array.isArray(productionTasks?.active)
      ? productionTasks.active
      : []
  return runs.reduce((sum: number, run: AnyRecord) => {
    const payload = run?.payload || parseJsonValue(run?.output_ref) || {}
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    return sum + tasks.filter((task: AnyRecord) => {
      const status = text(task?.task_status || task?.status, 'pending')
      return text(task?.source) === 'review_annotation_risk' && !['resolved', 'completed', 'canceled', 'cancelled'].includes(status)
    }).length
  }, 0)
}

function activeProductionTaskSummary(productionTasks?: AnyRecord | null) {
  const activeRuns = Array.isArray(productionTasks?.active) ? productionTasks.active : []
  const summary = productionTasks?.summary || {}
  const activeFromSummary = Number(summary?.active)
  const running = numericCount(summary?.running, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'running').length)
  const paused = numericCount(summary?.paused, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'paused').length)
  const needsApproval = numericCount(summary?.needs_approval, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'needs_approval').length)
  const active = Math.max(
    Number.isFinite(activeFromSummary) && activeFromSummary > 0 ? Math.round(activeFromSummary) : 0,
    activeRuns.length,
    running + paused + needsApproval,
  )
  const labels = [
    running > 0 ? `运行中 ${running}` : '',
    paused > 0 ? `暂停 ${paused}` : '',
    needsApproval > 0 ? `待确认 ${needsApproval}` : '',
  ].filter(Boolean)
  return {
    active,
    running,
    paused,
    needsApproval,
    detail: labels.length > 0 ? labels.join('，') : '队列中',
  }
}

function numericCount(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return 0
}

function weakDimensionCount(report: AnyRecord) {
  const weakDimensions = [
    ...arrayValue(report?.weak_dimensions),
    ...arrayValue(report?.weakDimensions),
    ...arrayValue(report?.dimensions).filter(item => text(item?.status) === 'warn'),
  ]
  return weakDimensions.length
}

function copiedPhraseCount(report: AnyRecord) {
  return listLength(report?.copied_phrases) + listLength(report?.copiedPhrases)
}

const DELIVERY_RISK_REVIEW_DEFS: Array<{
  type: string
  payloadKey: string
  label: string
  count: (report: AnyRecord, review?: AnyRecord | null) => number
}> = [
  {
    type: 'chapter_core_drift',
    payloadKey: 'core_drift',
    label: '核心',
    count: report => listLength(report?.drift_risks) + listLength(report?.risks),
  },
  {
    type: 'reader_payoff_sync',
    payloadKey: 'reader_payoff_sync',
    label: '回报',
    count: report => numericCount(report?.debt_count, report?.debtCount, listLength(report?.missed) + listLength(report?.debts)),
  },
  {
    type: 'reader_expectation_sync',
    payloadKey: 'reader_expectation_sync',
    label: '期待',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'reader_retention_sync',
    payloadKey: 'reader_retention_sync',
    label: '追读',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'innovation_sync',
    payloadKey: 'innovation_sync',
    label: '创新',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'volume_beat_sync',
    payloadKey: 'volume_beat_sync',
    label: '爆点',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'storyline_sync',
    payloadKey: 'storyline_sync',
    label: '剧情线',
    count: report => listLength(report?.missed) + listLength(report?.unplanned) + listLength(report?.forbidden_touched),
  },
  {
    type: 'story_unit_sync',
    payloadKey: 'story_unit_sync',
    label: '剧情单元',
    count: report => numericCount(
      report?.missed_count,
      report?.missedCount,
      report?.risk_count,
      report?.riskCount,
      listLength(report?.missed) + listLength(report?.risks) + listLength(report?.rushed_ahead) + listLength(report?.rushedAhead) + listLength(report?.forbidden_touched) + listLength(report?.forbiddenTouched),
    ),
  },
  {
    type: 'story_drive_sync',
    payloadKey: 'story_drive_sync',
    label: '故事力',
    count: report => numericCount(report?.missed_count, report?.missedCount, report?.weak_count, report?.weakCount, listLength(report?.missed)),
  },
  {
    type: 'character_arc_sync',
    payloadKey: 'character_arc_sync',
    label: '人物弧光',
    count: report => numericCount(report?.missed_count, report?.missedCount, report?.weak_count, report?.weakCount, listLength(report?.missed)),
  },
  {
    type: 'signature_scene_sync',
    payloadKey: 'signature_scene_sync',
    label: '强场面',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'chapter_attraction_review',
    payloadKey: 'chapter_attraction_review',
    label: '吸引力',
    count: report => numericCount(report?.weak_count, report?.weakCount, report?.risk_count, report?.riskCount, weakDimensionCount(report)),
  },
  {
    type: 'chapter_benchmark_sync',
    payloadKey: 'chapter_benchmark_sync',
    label: '标杆章',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'style_sample_sync',
    payloadKey: 'style_sample_sync',
    label: '风格',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed) + copiedPhraseCount(report)),
  },
  {
    type: 'readability_review',
    payloadKey: 'readability_review',
    label: '可读性',
    count: report => listLength(report?.meme_sense?.immersion_risks) + listLength(report?.immersion_risks),
  },
  {
    type: 'runway_sync',
    payloadKey: 'runway_sync',
    label: '航线',
    count: report => numericCount(
      report?.risk_count,
      report?.riskCount,
      listLength(report?.four_question_missed) + listLength(report?.reader_fuel_missed) + listLength(report?.redline_touched),
    ),
  },
]

function latestDeliveryRiskReports(reviews: AnyRecord[]) {
  const latest = new Map<string, { def: typeof DELIVERY_RISK_REVIEW_DEFS[number]; review: AnyRecord; report: AnyRecord }>()
  reviews.forEach(review => {
    const def = DELIVERY_RISK_REVIEW_DEFS.find(item => item.type === text(review?.review_type))
    if (!def) return
    const payload = parseJsonValue(review?.payload) || parseJsonValue(review?.payload_json) || {}
    const report = payload?.[def.payloadKey] || payload?.result?.[def.payloadKey] || payload?.result || payload
    const chapterNo = reviewChapterNo(review, payload)
    const key = `${chapterNo || 'global'}:${def.type}`
    const current = latest.get(key)
    if (!current || reviewTime(review) >= reviewTime(current.review)) {
      latest.set(key, { def, review, report })
    }
  })
  return Array.from(latest.values())
}

function aggregateDeliveryRiskCounts(reviews: AnyRecord[]) {
  const totals: Record<string, number> = {}
  for (const def of DELIVERY_RISK_REVIEW_DEFS) {
    totals[def.type] = 0
  }
  latestDeliveryRiskReports(reviews).forEach(({ def, report, review }) => {
    totals[def.type] += Math.max(0, def.count(report, review))
  })
  const expectationMissedCount = totals.reader_expectation_sync || 0
  const retentionMissedCount = totals.reader_retention_sync || 0
  const total = (totals.chapter_core_drift || 0)
    + (totals.reader_payoff_sync || 0)
    + Math.max(expectationMissedCount, retentionMissedCount)
    + (totals.innovation_sync || 0)
    + (totals.volume_beat_sync || 0)
    + (totals.storyline_sync || 0)
    + (totals.story_unit_sync || 0)
    + (totals.story_drive_sync || 0)
    + (totals.character_arc_sync || 0)
    + (totals.signature_scene_sync || 0)
    + (totals.chapter_attraction_review || 0)
    + (totals.chapter_benchmark_sync || 0)
    + (totals.style_sample_sync || 0)
    + (totals.readability_review || 0)
    + (totals.runway_sync || 0)
  const labels = DELIVERY_RISK_REVIEW_DEFS
    .filter(def => (totals[def.type] || 0) > 0)
    .map(def => def.label)
  return {
    totals,
    labels,
    total,
    coreRiskCount: totals.chapter_core_drift || 0,
    payoffDebtCount: totals.reader_payoff_sync || 0,
    expectationMissedCount,
    retentionMissedCount,
    innovationMissedCount: totals.innovation_sync || 0,
    volumeBeatMissedCount: totals.volume_beat_sync || 0,
    storylineRiskCount: totals.storyline_sync || 0,
    readabilityRiskCount: totals.readability_review || 0,
  }
}

function planningActionLabel(key: PlanningActionKey) {
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成留存修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    open_task_center: '打开任务中心',
  }
  return labels[key]
}

function laneStatusFromRhythm(status: PlanningRhythmSignal['status'] | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'block') return 'block'
  if (status === 'warn') return 'warn'
  return 'ok'
}

function laneStatusFromPlanning(status: 'ready' | 'needs_attention' | 'blocked' | 'missing' | 'needs_repair' | 'stale' | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'blocked' || status === 'missing') return 'block'
  if (status === 'needs_attention' || status === 'needs_repair' || status === 'stale') return 'warn'
  return 'ok'
}

function buildGovernanceHubModel(args: {
  reviews: AnyRecord[]
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  productionTasks?: AnyRecord | null
}): PlanningWorkspaceModel['governanceHub'] {
  const assetIntake = latestReviewPayloadAny(args.reviews, 'asset_intake', 'asset_intake')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const qualityRiskCount = deliveryRiskCounts.total
  const qualityRiskLabels = deliveryRiskCounts.labels
  const existingDeliveryRiskTaskCount = openDeliveryRiskRepairTaskCount(args.productionTasks)
  const activeTasks = activeProductionTaskSummary(args.productionTasks)

  const discoveredAssets = Array.isArray(assetIntake?.discovered_assets) ? assetIntake.discovered_assets : []
  const appliedAssetNames = new Set(
    Array.isArray(assetIntake?.applied_asset_names)
      ? assetIntake.applied_asset_names.map((item: any) => text(item)).filter(Boolean)
      : [],
  )
  const pendingAssets = discoveredAssets.filter((item: AnyRecord) => !appliedAssetNames.has(text(item?.name)))
  const longformIssueCount = args.healthIssues.length
    + args.longformRhythm.signals.filter(signal => signal.status !== 'ok').length
    + (args.future10Coverage.ready ? 0 : 1)
    + (args.future100Coverage.ready ? 0 : 1)
  const hasHardPlanningBlock = args.healthIssues.some(issue => issue.key === 'missing_reader_promise' || issue.key === 'missing_volume_goal')

  const checkpoints: PlanningWorkspaceModel['governanceHub']['checkpoints'] = [
    {
      key: 'delivery_risk',
      label: '交稿风险',
      status: existingDeliveryRiskTaskCount > 0 || qualityRiskCount > 0 ? 'warn' : 'ok',
      count: Math.max(qualityRiskCount, existingDeliveryRiskTaskCount),
      detail: existingDeliveryRiskTaskCount > 0
        ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理，先进入任务中心逐项修订和复检。`
        : qualityRiskCount > 0
        ? `还有 ${qualityRiskCount} 项${qualityRiskLabels.join('、') || '交稿'}风险待修。`
        : '最近交稿风险可控。',
      actionKey: existingDeliveryRiskTaskCount > 0 ? 'open_task_center' : qualityRiskCount > 0 ? 'create_delivery_risk_repair' : 'enter_chapter_writing',
    },
    {
      key: 'first30_retention',
      label: '前30章留存',
      status: args.first30Retention.status === 'ready' ? 'ok' : args.first30Retention.status === 'blocked' ? 'block' : 'warn',
      count: args.first30Retention.risks.length || (args.first30Retention.status === 'ready' ? 0 : 1),
      detail: args.first30Retention.summary,
      actionKey: args.first30Retention.actionKey,
    },
    {
      key: 'reader_trial',
      label: '读者试读',
      status: args.readerTrialRoom.status === 'ready' ? 'ok' : args.readerTrialRoom.status === 'blocked' ? 'block' : 'warn',
      count: args.readerTrialRoom.dropPoints.length || (args.readerTrialRoom.status === 'ready' ? 0 : 1),
      detail: args.readerTrialRoom.summary,
      actionKey: args.readerTrialRoom.actionKey,
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: args.storylineBoard.status === 'ready' ? 'ok' : args.storylineBoard.status === 'missing' ? 'block' : 'warn',
      count: args.storylineBoard.overdueCount + args.storylineBoard.debtCount + args.storylineBoard.retentionRiskCount + deliveryRiskCounts.storylineRiskCount,
      detail: args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'asset_intake',
      label: '新资产',
      status: pendingAssets.length > 0 ? 'warn' : 'ok',
      count: pendingAssets.length,
      detail: pendingAssets.length > 0 ? `${pendingAssets.length} 个新资产待确认，避免正文临时资产游离在设定池之外。` : '没有待确认的新人物、物品、能力、势力、地点或伏笔。',
      actionKey: pendingAssets.length > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'longform_material',
      label: '长线材料',
      status: hasHardPlanningBlock ? 'block' : longformIssueCount > 0 ? 'warn' : 'ok',
      count: longformIssueCount,
      detail: args.longformRhythm.summary,
      actionKey: longformIssueCount > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]

  const firstRisk = checkpoints.find(item => item.status !== 'ok')
  const primaryCheckpoint = checkpoints.find(item => item.key === 'delivery_risk' && item.status !== 'ok')
    || checkpoints.find(item => item.key === 'first30_retention' && item.status === 'block')
    || firstRisk
  const status: PlanningWorkspaceModel['governanceHub']['status'] = checkpoints.some(item => item.status === 'block')
    ? 'blocked'
    : checkpoints.some(item => item.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成留存修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    open_task_center: '打开任务中心',
  }
  const activeTaskReason = activeTasks.active > 0
    ? `还有 ${activeTasks.active} 个后台任务正在运行或待处理（${activeTasks.detail}）。先进入任务中心查看进度、恢复失败任务或等待当前任务结束。`
    : ''
  const primaryKey = activeTasks.active > 0 ? 'open_task_center' : primaryCheckpoint?.actionKey || 'enter_chapter_writing'

  return {
    status,
    summary: activeTasks.active > 0
      ? `${activeTasks.active} 个后台任务正在运行或待处理，先回任务中心保持流水线状态清晰。`
      : status === 'ready'
        ? '核心、留存、剧情线、资产和长线材料都处于可继续创作状态。'
        : `${checkpoints.filter(item => item.status !== 'ok').length} 类连载治理项需要处理：${checkpoints.filter(item => item.status !== 'ok').map(item => item.label).join('、')}。`,
    primaryAction: {
      key: primaryKey,
      label: labels[primaryKey],
      reason: activeTaskReason || primaryCheckpoint?.detail || (existingDeliveryRiskTaskCount > 0 ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理。` : '当前可以进入章节写作。'),
    },
    checkpoints,
  }
}

function resolveSerializationPolicy(project?: AnyRecord | null) {
  const policy = project?.reference_config?.serialization_policy || project?.serialization_policy || {}
  const dailyTargetChapters = Math.max(1, Math.round(Number(policy?.daily_chapters ?? policy?.dailyChapters ?? policy?.daily_target_chapters ?? policy?.dailyTargetChapters ?? 2) || 2))
  const minBufferDays = Math.max(1, Math.round(Number(policy?.min_buffer_days ?? policy?.minBufferDays ?? policy?.buffer_days ?? policy?.bufferDays ?? 7) || 7))
  const lastPublishedChapter = Math.max(0, Math.round(Number(policy?.last_published_chapter ?? policy?.lastPublishedChapter ?? policy?.published_until ?? policy?.publishedUntil ?? 0) || 0))
  return {
    dailyTargetChapters,
    minBufferDays,
    lastPublishedChapter,
  }
}

function chapterHasProse(chapter: AnyRecord) {
  const chapterText = text(chapter?.chapter_text || chapter?.content || chapter?.prose)
  return Boolean(chapterText && !chapterText.includes('【占位正文】') && wc(chapterText) > 0)
}

function chapterIsPlannedForRelease(chapter: AnyRecord) {
  return Boolean(
    text(chapter?.title) &&
    text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
    text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
    text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook) &&
    text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)
  )
}

function reviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    payload?.chapter_no
      || payload?.chapterNo
      || payload?.chapter?.chapter_no
      || payload?.chapter?.chapterNo
      || review?.chapter_no
      || review?.chapterNo
      || 0
  )
}

const SERIAL_DELIVERY_REVIEW_DEFS: Array<{ type: string; payloadKey: string; tag: string }> = [
  { type: 'chapter_core_drift', payloadKey: 'core_drift', tag: '核心偏移' },
  { type: 'reader_retention_sync', payloadKey: 'reader_retention_sync', tag: '追读风险' },
  { type: 'reader_payoff_sync', payloadKey: 'reader_payoff_sync', tag: '回报欠账' },
  { type: 'reader_expectation_sync', payloadKey: 'reader_expectation_sync', tag: '期待欠账' },
  { type: 'storyline_sync', payloadKey: 'storyline_sync', tag: '剧情线风险' },
  { type: 'story_unit_sync', payloadKey: 'story_unit_sync', tag: '剧情单元风险' },
  { type: 'story_drive_sync', payloadKey: 'story_drive_sync', tag: '故事力风险' },
  { type: 'character_arc_sync', payloadKey: 'character_arc_sync', tag: '人物弧光风险' },
  { type: 'innovation_sync', payloadKey: 'innovation_sync', tag: '创新缺口' },
  { type: 'signature_scene_sync', payloadKey: 'signature_scene_sync', tag: '强场面风险' },
  { type: 'chapter_attraction_review', payloadKey: 'chapter_attraction_review', tag: '吸引力风险' },
  { type: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', tag: '标杆章风险' },
  { type: 'style_sample_sync', payloadKey: 'style_sample_sync', tag: '风格风险' },
  { type: 'readability_review', payloadKey: 'readability_review', tag: '可读性风险' },
  { type: 'volume_beat_sync', payloadKey: 'volume_beat_sync', tag: '爆点风险' },
  { type: 'runway_sync', payloadKey: 'runway_sync', tag: '航线风险' },
]

function serialReviewHasRisk(review: AnyRecord, report: AnyRecord) {
  const status = text(report?.status || review?.status).toLowerCase()
  if (['warn', 'warning', 'blocked', 'block', 'failed', 'fail', 'needs_repair', 'needs_attention'].includes(status)) return true
  const numericSignals = [
    report?.missed_count,
    report?.missedCount,
    report?.debt_count,
    report?.debtCount,
    report?.risk_count,
    report?.riskCount,
    report?.critical_count,
    report?.criticalCount,
    report?.high_count,
    report?.highCount,
  ].map(value => Number(value))
  if (numericSignals.some(value => Number.isFinite(value) && value > 0)) return true
  return [
    report?.missed,
    report?.debts,
    report?.risks,
    report?.drift_risks,
    report?.forbidden_touched,
    report?.unplanned,
    report?.immersion_risks,
    report?.meme_sense?.immersion_risks,
  ].some(value => Array.isArray(value) && value.length > 0)
}

function buildSerialDeliveryRiskMap(reviews: AnyRecord[]) {
  const risksByChapter = new Map<number, string[]>()
  const latestByChapterAndType = new Map<string, { review: AnyRecord; payload: AnyRecord; report: AnyRecord; def: typeof SERIAL_DELIVERY_REVIEW_DEFS[number] }>()
  reviews.forEach(review => {
    const def = SERIAL_DELIVERY_REVIEW_DEFS.find(item => item.type === text(review?.review_type))
    if (!def) return
    const payload = parseJsonValue(review?.payload) || {}
    const report = payload?.[def.payloadKey] || payload?.result?.[def.payloadKey] || payload?.result || payload
    const chapterNo = reviewChapterNo(review, payload)
    if (!chapterNo) return
    const key = `${chapterNo}:${def.type}`
    const current = latestByChapterAndType.get(key)
    if (!current || reviewTime(review) >= reviewTime(current.review)) {
      latestByChapterAndType.set(key, { review, payload, report, def })
    }
  })
  latestByChapterAndType.forEach(({ review, report, def, payload }) => {
    if (!serialReviewHasRisk(review, report)) return
    const chapterNo = reviewChapterNo(review, payload)
    if (!chapterNo) return
    risksByChapter.set(chapterNo, Array.from(new Set([...(risksByChapter.get(chapterNo) || []), def.tag])))
  })
  return risksByChapter
}

function serialReleaseStatusLabel(status: PlanningSerialReleaseDesk['status']) {
  if (status === 'ready') return '发布节奏健康'
  if (status === 'blocked') return '发布窗口阻塞'
  if (status === 'needs_buffer') return '存稿不足'
  return '后续规划不足'
}

function buildSerialReleaseDeskModel(args: {
  selectedProject?: AnyRecord | null
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}): PlanningSerialReleaseDesk {
  const policy = resolveSerializationPolicy(args.selectedProject)
  const sortedChapters = args.chapters.slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const riskMap = buildSerialDeliveryRiskMap(args.reviews)
  const maxKnownChapterNo = sortedChapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), policy.lastPublishedChapter)
  const byNo = new Map<number, AnyRecord>()
  sortedChapters.forEach(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    if (chapterNo) byNo.set(chapterNo, chapter)
  })

  const classifyChapter = (chapterNo: number): PlanningSerialReleaseDesk['releaseWindow'][number]['status'] => {
    if (chapterNo <= policy.lastPublishedChapter) return 'published'
    const chapter = byNo.get(chapterNo)
    if (!chapter) return 'planned'
    const hasProse = chapterHasProse(chapter)
    const riskTags = riskMap.get(chapterNo) || []
    if (hasProse && riskTags.length > 0) return 'needs_revision'
    if (hasProse) return 'publishable'
    if (chapterIsPlannedForRelease(chapter)) return 'drafting'
    return 'planned'
  }
  const titleForChapter = (chapterNo: number) => text(byNo.get(chapterNo)?.title, `第${chapterNo}章`)
  const wordCountForChapter = (chapterNo: number) => wc(byNo.get(chapterNo)?.chapter_text)
  const publishableChapters = sortedChapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo > policy.lastPublishedChapter && chapterHasProse(chapter) && !(riskMap.get(chapterNo) || []).length
  }).length
  const bufferDays = Math.floor(publishableChapters / policy.dailyTargetChapters)
  const releaseWindowChapterNos = Array.from({ length: Math.max(1, policy.dailyTargetChapters) }).map((_, index) => policy.lastPublishedChapter + index + 1)
  const releaseWindow = releaseWindowChapterNos.map(chapterNo => ({
    chapterNo,
    title: titleForChapter(chapterNo),
    wordCount: wordCountForChapter(chapterNo),
    status: classifyChapter(chapterNo),
    riskTags: riskMap.get(chapterNo) || [],
  }))
  const riskChapters = sortedChapters
    .map(chapter => {
      const chapterNo = Number(chapter?.chapter_no || 0)
      return {
        chapterNo,
        title: text(chapter?.title, `第${chapterNo}章`),
        riskTags: riskMap.get(chapterNo) || [],
      }
    })
    .filter(chapter => chapter.chapterNo > policy.lastPublishedChapter && chapter.riskTags.length > 0)
    .sort((a, b) => a.chapterNo - b.chapterNo)

  const status: PlanningSerialReleaseDesk['status'] = releaseWindow.some(chapter => chapter.status === 'needs_revision')
    ? 'blocked'
    : bufferDays < policy.minBufferDays
      ? 'needs_buffer'
      : sortedChapters.filter(chapter => Number(chapter?.chapter_no || 0) > policy.lastPublishedChapter && chapterIsPlannedForRelease(chapter)).length < policy.dailyTargetChapters * 3
        ? 'needs_planning'
        : 'ready'
  const pipelineKeys: PlanningSerialReleaseDesk['pipeline'][number]['key'][] = ['published', 'publishable', 'needs_revision', 'drafting', 'planned']
  const statusCounts = new Map<PlanningSerialReleaseDesk['pipeline'][number]['key'], number>()
  for (let chapterNo = 1; chapterNo <= Math.max(maxKnownChapterNo, policy.lastPublishedChapter + policy.dailyTargetChapters); chapterNo += 1) {
    const statusKey = classifyChapter(chapterNo)
    statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1)
  }
  const pipelineMeta: Record<PlanningSerialReleaseDesk['pipeline'][number]['key'], { label: string; actionKey: PlanningActionKey }> = {
    published: { label: '已发布', actionKey: 'enter_chapter_writing' },
    publishable: { label: '可发布存稿', actionKey: 'enter_chapter_writing' },
    needs_revision: { label: '待修订', actionKey: 'open_quality_revision' },
    drafting: { label: '待生成正文', actionKey: 'enter_chapter_writing' },
    planned: { label: '待补计划', actionKey: 'update_rolling_plan' },
  }
  const pipeline = pipelineKeys.map(key => {
    const count = statusCounts.get(key) || 0
    const statusColor: PlanningSerialReleaseDesk['pipeline'][number]['status'] = key === 'needs_revision' && count > 0
      ? 'block'
      : (key === 'drafting' || key === 'planned') && count > 0
        ? 'warn'
        : 'ok'
    return {
      key,
      label: pipelineMeta[key].label,
      count,
      detail: key === 'publishable'
        ? `可支撑约 ${bufferDays} 天更新。`
        : key === 'needs_revision'
          ? count > 0 ? `${count} 章有发布前风险。` : '没有发布前修订阻塞。'
          : key === 'drafting'
            ? `${count} 章已有计划但未生成正文。`
            : key === 'planned'
              ? `${count} 章仍需补齐计划或正文。`
              : `已发布到第 ${policy.lastPublishedChapter} 章。`,
      status: statusColor,
      actionKey: pipelineMeta[key].actionKey,
    }
  })

  const score = status === 'ready'
    ? 92
    : status === 'blocked'
      ? 48
      : status === 'needs_buffer'
        ? boundedScore((bufferDays / Math.max(1, policy.minBufferDays)) * 78, 55)
        : 62
  const primaryAction = status === 'blocked'
    ? {
        key: 'open_quality_revision' as PlanningActionKey,
        label: '修复发布窗口',
        reason: `发布窗口内第 ${releaseWindow.filter(chapter => chapter.status === 'needs_revision').map(chapter => chapter.chapterNo).join('、')} 章存在质检风险，先修订再发。`,
      }
    : status === 'needs_buffer'
      ? {
          key: 'enter_chapter_writing' as PlanningActionKey,
          label: '补存稿',
          reason: `当前可发布 ${publishableChapters} 章，约 ${bufferDays} 天，低于最低 ${policy.minBufferDays} 天存稿。`,
        }
      : status === 'needs_planning'
        ? {
            key: 'update_rolling_plan' as PlanningActionKey,
            label: '补后续规划',
            reason: '后续可连续生产的章节计划偏少，先补滚动规划再扩大连写。',
          }
        : {
            key: 'enter_chapter_writing' as PlanningActionKey,
            label: '继续连写',
            reason: `当前存稿 ${bufferDays} 天，发布窗口无阻塞，可以继续补下一批章节。`,
          }
  const nextActions = status === 'blocked'
    ? ['先处理发布窗口内的质检风险，再恢复发稿节奏。']
    : status === 'needs_buffer'
      ? [`补存稿：至少再完成 ${Math.max(1, policy.minBufferDays * policy.dailyTargetChapters - publishableChapters)} 章，恢复 ${policy.minBufferDays} 天安全垫。`]
      : status === 'needs_planning'
        ? ['补齐后续章节计划，确保至少三天内的章节都有目标、冲突、钩子和主线推进。']
        : ['保持日更节奏，继续把可发布存稿维持在安全线以上。']

  return {
    status,
    score,
    label: serialReleaseStatusLabel(status),
    summary: status === 'blocked'
      ? `发布窗口有 ${releaseWindow.filter(chapter => chapter.status === 'needs_revision').length} 章存在风险，暂不建议直接发布。`
      : status === 'needs_buffer'
        ? `当前可发布 ${publishableChapters} 章，约 ${bufferDays} 天，低于 ${policy.minBufferDays} 天安全线。`
        : status === 'needs_planning'
          ? '存稿数量达标，但后续可执行计划偏薄，需要先补滚动规划。'
          : `日更 ${policy.dailyTargetChapters} 章，当前可发布 ${publishableChapters} 章，存稿 ${bufferDays} 天。`,
    dailyTargetChapters: policy.dailyTargetChapters,
    minBufferDays: policy.minBufferDays,
    lastPublishedChapter: policy.lastPublishedChapter,
    publishableChapters,
    bufferDays,
    primaryAction,
    pipeline,
    releaseWindow,
    riskChapters,
    nextActions,
  }
}

function boundedScore(value: any, fallback: number) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function rhythmStatusFromSignals(signals: PlanningRhythmSignal[]): PlanningWorkspaceModel['longformRhythm']['status'] {
  if (signals.some(signal => signal.status === 'block')) return 'blocked'
  if (signals.some(signal => signal.status === 'warn')) return 'needs_attention'
  return 'ready'
}

function buildLongformRhythmModel(args: {
  reviews: AnyRecord[]
  writtenWords: number
  currentVolumeGoal: string
  future100Coverage: FuturePlanningCoverage
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
}): PlanningWorkspaceModel['longformRhythm'] {
  const coreDrift = latestReviewPayload(args.reviews, 'chapter_core_drift', 'core_drift')
  const payoffSync = latestReviewPayload(args.reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const coreStatus: PlanningRhythmSignal['status'] = args.healthIssues.some(issue => issue.key === 'missing_reader_promise')
    ? 'block'
    : text(coreDrift?.status).toLowerCase() === 'warn' || coreRiskCount > 0
      ? 'warn'
      : 'ok'
  const future100Ratio = args.future100Coverage.required > 0
    ? args.future100Coverage.planned / args.future100Coverage.required
    : 1
  const volumeStatus: PlanningRhythmSignal['status'] = !args.currentVolumeGoal || args.volumeBeatBudget.status === 'blocked'
    ? 'block'
    : future100Ratio < 0.3 || args.volumeBeatBudget.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const payoffDebt = deliveryRiskCounts.payoffDebtCount
  const payoffStatus: PlanningRhythmSignal['status'] = payoffDebt > 0 || text(payoffSync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const fatigueRisk = args.first30Retention.status !== 'ready'
    || args.storylineBoard.overdueCount > 0
    || args.storylineBoard.debtCount > 0
    || args.storylineBoard.retentionRiskCount > 0
  const fatigueStatus: PlanningRhythmSignal['status'] = fatigueRisk ? 'warn' : 'ok'
  const bandIndex = Math.max(1, Math.floor(Math.max(0, args.writtenWords) / 100000) + 1)

  const signals: PlanningRhythmSignal[] = [
    {
      key: 'core',
      label: '核心守恒',
      status: coreStatus,
      score: coreStatus === 'block' ? 45 : coreStatus === 'warn' ? Math.min(68, boundedScore(coreDrift?.score, 68)) : boundedScore(coreDrift?.score, 88),
      detail: coreStatus === 'block'
        ? '长篇核心承诺缺失，不能进入连续生产。'
        : coreStatus === 'warn'
          ? `核心偏移 ${coreRiskCount || 1}`
          : '核心承诺、卷目标和章节服务关系稳定。',
      actionKey: coreStatus === 'ok' ? 'open_outline_tree' : 'open_story_assets',
    },
    {
      key: 'volume',
      label: '卷级推进',
      status: volumeStatus,
      score: volumeStatus === 'block' ? 45 : volumeStatus === 'warn' ? Math.min(args.volumeBeatBudget.score, Math.max(55, Math.round(future100Ratio * 100))) : 86,
      detail: volumeStatus === 'block'
        ? '当前章节没有明确卷目标。'
        : args.volumeBeatBudget.status === 'needs_attention'
          ? args.volumeBeatBudget.summary
        : volumeStatus === 'warn'
          ? `未来100章规划 ${args.future100Coverage.label}，不适合长时间自动连写。`
          : `当前卷目标明确，未来100章规划 ${args.future100Coverage.label}。`,
      actionKey: volumeStatus === 'ok' ? 'open_outline_tree' : 'update_rolling_plan',
    },
    {
      key: 'payoff',
      label: '回报兑现',
      status: payoffStatus,
      score: boundedScore(payoffSync?.score, payoffStatus === 'warn' ? 64 : 86),
      detail: payoffStatus === 'warn'
        ? text(payoffSync?.label, `回报欠账 ${payoffDebt}`)
        : '章节承诺、场景回报和待回收期待处于可控状态。',
      actionKey: payoffStatus === 'ok' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'fatigue',
      label: '疲劳风险',
      status: fatigueStatus,
      score: fatigueStatus === 'warn' ? Math.max(50, Math.min(78, Number(args.first30Retention.score || 72))) : 86,
      detail: fatigueStatus === 'warn'
        ? `剧情线债务 ${args.storylineBoard.debtCount}，逾期 ${args.storylineBoard.overdueCount}，前30章状态 ${args.first30Retention.status}。`
        : '留存曲线、剧情线推进和回收压力没有明显疲劳信号。',
      actionKey: fatigueStatus === 'warn' ? 'run_first30_retention' : 'enter_chapter_writing',
    },
  ]
  const status = rhythmStatusFromSignals(signals)
  const score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length))))
  const riskySignals = signals.filter(signal => signal.status !== 'ok')

  return {
    status,
    score,
    label: status === 'ready' ? `节奏健康 ${score}` : status === 'blocked' ? `节奏阻塞 ${score}` : `节奏风险 ${score}`,
    summary: status === 'ready'
      ? '长篇节奏稳定，可以继续推进当前章。'
      : `长篇节奏存在 ${riskySignals.length} 项风险：${riskySignals.map(signal => signal.label).join('、')}。`,
    currentBandLabel: `第${bandIndex}个10万字`,
    signals,
    nextActions: status === 'ready'
      ? ['保持卷目标、回报兑现和剧情线回收的节奏闭环。']
      : ['先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。'],
  }
}

function buildLongformBattleDeskModel(args: {
  reviews: AnyRecord[]
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
  storyUnitWorkshop: PlanningWorkspaceModel['storyUnitWorkshop']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
}): PlanningWorkspaceModel['longformBattleDesk'] {
  const coreSignal = args.longformRhythm.signals.find(signal => signal.key === 'core')
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const storylineSync = latestReviewPayloadAny(args.reviews, 'storyline_sync', 'storyline_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const spineBlocked = args.longformSpineGuard.status === 'blocked'
  const spineNeedsAttention = args.longformSpineGuard.status !== 'ready'
  const storylineMissedCount = Math.max(listLength(storylineSync?.missed), deliveryRiskCounts.storylineRiskCount)
  const storylineForbiddenCount = listLength(storylineSync?.forbidden_touched)
  const readerPullStatus: PlanningBattleDeskLane['status'] = args.first30Retention.status === 'blocked'
    ? 'block'
    : args.first30Retention.status !== 'ready' || args.readerTrustLedger.status === 'needs_attention' || args.readerTrialRoom.status === 'blocked'
      ? 'warn'
      : 'ok'
  const milestoneStatus: PlanningBattleDeskLane['status'] = args.millionWordMilestones.status === 'blocked'
    ? 'block'
    : args.millionWordMilestones.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const productionFuelStatus: PlanningBattleDeskLane['status'] = milestoneStatus === 'block' || !args.future10Coverage.ready || !args.future100Coverage.ready || args.storyUnitWorkshop.status !== 'ready'
    ? milestoneStatus === 'block' || args.storyUnitWorkshop.status === 'blocked' ? 'block' : 'warn'
    : 'ok'
  const futureScore = Math.round(((args.future10Coverage.ready ? 100 : args.future10Coverage.planned * 10) + (args.future100Coverage.required > 0 ? (args.future100Coverage.planned / args.future100Coverage.required) * 100 : 100)) / 2)

  const lanes: PlanningBattleDeskLane[] = [
    {
      key: 'story_core',
      label: '核心守恒',
      status: spineBlocked ? 'block' : spineNeedsAttention ? 'warn' : coreRiskCount > 0 ? 'warn' : laneStatusFromRhythm(coreSignal?.status),
      score: spineNeedsAttention ? args.longformSpineGuard.score : boundedScore(coreDrift?.score, coreSignal?.score || args.longformRhythm.score),
      detail: spineNeedsAttention
        ? `全书主轴缺 ${args.longformSpineGuard.missingAxes.join('、') || '可选护栏'}，不能放大自动连写。`
        : coreRiskCount > 0
          ? `核心偏移 ${coreRiskCount}`
          : coreSignal?.detail || '核心承诺稳定。',
      actionKey: spineNeedsAttention ? args.longformSpineGuard.actionKey : coreRiskCount > 0 ? 'open_quality_revision' : coreSignal?.actionKey || 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullStatus,
      score: boundedScore(args.first30Retention.score ?? args.readerTrustLedger.score ?? args.readerTrialRoom.score, readerPullStatus === 'ok' ? 86 : 68),
      detail: args.first30Retention.status !== 'ready'
        ? `前30章：${args.first30Retention.summary}`
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.summary
          : args.readerTrialRoom.status === 'blocked'
            ? args.readerTrialRoom.summary
            : '前30章、追读信任和试读拉力可继续支撑当前章。',
      actionKey: args.first30Retention.status !== 'ready'
        ? args.first30Retention.actionKey
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.actionKey
          : args.readerTrialRoom.status !== 'ready' && args.readerTrialRoom.status !== 'missing'
            ? args.readerTrialRoom.actionKey
            : 'enter_chapter_writing',
    },
    {
      key: 'storyline',
      label: '剧情线调度',
      status: args.storylineBoard.status === 'missing' ? 'block' : args.storylineBoard.status === 'needs_attention' || storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 'warn' : 'ok',
      score: storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 62 : args.storylineBoard.status === 'ready' ? 86 : 70,
      detail: storylineMissedCount > 0 || storylineForbiddenCount > 0
        ? `剧情线漏推 ${storylineMissedCount}，禁揭风险 ${storylineForbiddenCount}。`
        : args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' && storylineMissedCount === 0 && storylineForbiddenCount === 0 ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'volume_beat',
      label: '卷级爆点',
      status: laneStatusFromPlanning(args.volumeBeatBudget.status),
      score: args.volumeBeatBudget.score,
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: args.innovationRadar.status === 'missing' ? 'warn' : args.innovationRadar.status === 'needs_attention' ? 'warn' : 'ok',
      score: boundedScore(args.innovationRadar.score, args.innovationRadar.status === 'ready' ? 86 : 66),
      detail: args.innovationRadar.missedCount > 0 ? `创新缺口 ${args.innovationRadar.missedCount}：${args.innovationRadar.summary}` : args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : args.innovationRadar.actionKey,
    },
    {
      key: 'production_fuel',
      label: '生产燃料',
      status: productionFuelStatus,
      score: boundedScore(Math.min(futureScore, args.storyUnitWorkshop.score, args.millionWordMilestones.score), productionFuelStatus === 'ok' ? 86 : 65),
      detail: milestoneStatus !== 'ok'
        ? `百万字里程碑：${args.millionWordMilestones.summary}`
        : `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，剧情单元：${args.storyUnitWorkshop.label}。`,
      actionKey: milestoneStatus !== 'ok'
        ? args.millionWordMilestones.actionKey
        : !args.future100Coverage.ready ? 'future100_generate' : !args.future10Coverage.ready || args.storyUnitWorkshop.status !== 'ready' ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['longformBattleDesk']['status'] = lanes.some(lane => lane.status === 'block')
    ? 'blocked'
    : lanes.some(lane => lane.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length))))
  const priorityOrder: PlanningBattleDeskLane['key'][] = ['story_core', 'reader_pull', 'storyline', 'volume_beat', 'innovation_ip', 'production_fuel']
  const primaryLane = priorityOrder
    .map(key => lanes.find(lane => lane.key === key))
    .find((lane): lane is PlanningBattleDeskLane => Boolean(lane && lane.status !== 'ok')) || lanes[0]
  const riskChips = lanes.flatMap(lane => {
    if (lane.status === 'ok') return []
    if (lane.key === 'story_core') return ['核心偏移']
    if (lane.key === 'reader_pull') return ['前30章留存']
    if (lane.key === 'storyline') return storylineMissedCount > 0 ? ['剧情线漏推'] : ['剧情线调度']
    if (lane.key === 'volume_beat') return ['卷级爆点']
    if (lane.key === 'innovation_ip') return ['创新缺口']
    return ['生产燃料']
  })

  return {
    status,
    score,
    label: status === 'ready' ? `长篇作战 ${score}` : status === 'blocked' ? `长篇作战阻塞 ${score}` : `长篇作战待治理 ${score}`,
    summary: status === 'ready'
      ? '核心、留存、剧情线、卷级爆点、创新场面和生产燃料都能支撑继续写作。'
      : `先处理 ${primaryLane.label}：${primaryLane.detail}`,
    primaryAction: {
      key: primaryLane.actionKey,
      label: planningActionLabel(primaryLane.actionKey),
      reason: primaryLane.detail,
    },
    lanes,
    riskChips: Array.from(new Set(riskChips)).slice(0, 6),
  }
}

function pipelineStatusFromPlanning(status: string): PlanningCreationPipelineStage['status'] {
  if (['blocked', 'missing', 'block'].includes(status)) return 'block'
  if (['needs_attention', 'needs_action', 'needs_repair', 'needs_buffer', 'needs_planning', 'stale', 'warn', 'drifting'].includes(status)) return 'warn'
  return 'ok'
}

function buildCreationPipelineModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  characterArcBoard: PlanningWorkspaceModel['characterArcBoard']
  activeChapter: AnyRecord
  currentVolumeGoal: string
  governanceHub: PlanningWorkspaceModel['governanceHub']
  serialReleaseDesk: PlanningWorkspaceModel['serialReleaseDesk']
}): PlanningWorkspaceModel['creationPipeline'] {
  const activeChapterPlanned = Boolean(
    text(args.activeChapter?.chapter_goal || args.activeChapter?.chapterTask || args.activeChapter?.task) &&
    text(args.activeChapter?.conflict || args.activeChapter?.raw_payload?.conflict) &&
    text(args.activeChapter?.ending_hook || args.activeChapter?.endingHook || args.activeChapter?.hook) &&
    args.currentVolumeGoal
  )
  const longformPlanBlocked = args.millionWordMilestones.status === 'blocked'
  const longformPlanWarn = !args.future10Coverage.ready
    || !args.future100Coverage.ready
    || args.millionWordMilestones.status !== 'ready'
  const longformPlanAction: PlanningActionKey = args.millionWordMilestones.status !== 'ready'
    ? args.millionWordMilestones.actionKey
    : !args.future10Coverage.ready
      ? 'update_rolling_plan'
      : !args.future100Coverage.ready
        ? 'future100_generate'
        : 'complete_volume_plan'
  const assetBlocked = args.storylineBoard.status === 'missing' || args.characterArcBoard.status === 'missing'
  const assetWarn = args.storylineBoard.status !== 'ready' || args.characterArcBoard.status !== 'ready'
  const chapterLaunchStatus: PlanningCreationPipelineStage['status'] = activeChapterPlanned ? 'ok' : 'warn'
  const stages: PlanningCreationPipelineStage[] = [
    {
      key: 'book_core',
      label: '全书核心',
      status: pipelineStatusFromPlanning(args.longformSpineGuard.status),
      active: false,
      score: args.longformSpineGuard.score,
      detail: args.longformSpineGuard.summary,
      actionKey: args.longformSpineGuard.actionKey,
    },
    {
      key: 'longform_plan',
      label: '长线规划',
      status: longformPlanBlocked ? 'block' : longformPlanWarn ? 'warn' : 'ok',
      active: false,
      score: Math.min(
        args.millionWordMilestones.score,
        Math.round(((args.future10Coverage.planned / Math.max(1, args.future10Coverage.required)) * 100 + (args.future100Coverage.planned / Math.max(1, args.future100Coverage.required)) * 100) / 2),
      ),
      detail: longformPlanWarn
        ? `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，里程碑：${args.millionWordMilestones.label}。`
        : '未来章节、百万字里程碑和当前卷规划可支撑继续开写。',
      actionKey: longformPlanAction,
    },
    {
      key: 'story_assets',
      label: '设定资产',
      status: assetBlocked ? 'block' : assetWarn ? 'warn' : 'ok',
      active: false,
      score: assetBlocked ? 50 : assetWarn ? 72 : 88,
      detail: assetWarn
        ? `${args.storylineBoard.summary} ${args.characterArcBoard.summary}`
        : '剧情线、角色线和关系线已进入可调度状态。',
      actionKey: assetWarn ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'chapter_launch',
      label: '章节开写',
      status: chapterLaunchStatus,
      active: false,
      score: activeChapterPlanned ? 88 : 66,
      detail: activeChapterPlanned
        ? '当前章已有目标、冲突、章末钩子和卷目标承接，可进入开写任务书。'
        : '当前章缺少目标、冲突、章末钩子或卷目标承接，建议先补章节计划。',
      actionKey: activeChapterPlanned ? 'enter_chapter_writing' : 'update_rolling_plan',
    },
    {
      key: 'delivery_acceptance',
      label: '交稿验收',
      status: pipelineStatusFromPlanning(args.governanceHub.status),
      active: false,
      score: args.governanceHub.status === 'ready' ? 88 : args.governanceHub.status === 'blocked' ? 55 : 72,
      detail: args.governanceHub.summary,
      actionKey: args.governanceHub.primaryAction.key,
    },
    {
      key: 'serial_release',
      label: '连载发布',
      status: pipelineStatusFromPlanning(args.serialReleaseDesk.status),
      active: false,
      score: args.serialReleaseDesk.score,
      detail: args.serialReleaseDesk.summary,
      actionKey: args.serialReleaseDesk.primaryAction.key,
    },
  ]
  const current = stages.find(stage => stage.status !== 'ok') || stages.find(stage => stage.key === 'chapter_launch') || stages[0]
  const normalizedStages = stages.map(stage => ({ ...stage, active: stage.key === current.key }))
  const riskCount = normalizedStages.filter(stage => stage.status !== 'ok').length
  return {
    currentStageKey: current.key,
    summary: riskCount > 0
      ? `当前建议先处理「${current.label}」：${current.detail}`
      : '全书核心、长线规划、设定资产、章节开写、交稿验收和连载发布均处于可推进状态。',
    riskCount,
    primaryAction: {
      key: current.actionKey,
      label: planningActionLabel(current.actionKey),
      reason: current.detail,
    },
    stages: normalizedStages,
  }
}

export function buildPlanningWorkspaceModel(input: BuildPlanningWorkspaceModelInput): PlanningWorkspaceModel {
  const selectedProject = input.selectedProject || {}
  const outlines = arrayValue(input.outlines)
  const chapters = arrayValue(input.chapters).slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const activeChapter = input.activeChapter || chapters[0] || {}
  const activeChapterNo = Number(activeChapter?.chapter_no || chapters[0]?.chapter_no || 1)
  const writingBible = resolveWritingBible(selectedProject)
  const storyState = resolveStoryState(selectedProject)
  const reviews = arrayValue(input.reviews)
  const settingEntities = arrayValue(input.settingEntities)
  const productionTasks = input.productionTasks || null

  const currentVolume = outlines.find(outline => isVolume(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isVolume) || {}
  const currentStage = outlines.find(outline => isStage(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isStage) || {}
  const turns = outlines.filter(isTurn).sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const currentTurns = turns.filter(turn => chapterInRange(activeChapterNo, turn))
  const previousTurn = turns.filter(turn => chapterRange(turn).end < activeChapterNo).at(-1)
  const nextTurn = turns.find(turn => chapterRange(turn).start >= activeChapterNo)
  const bibleVolume = resolveVolumeFromBible(writingBible, currentVolume)
  const bibleStage = resolveStageFromBible(bibleVolume, currentStage)

  const planRecords = planningRecords(chapters, outlines)
  const routeChapters = Array.from({ length: 10 }).map((_, index) => {
    const chapterNo = activeChapterNo + index
    const records = planRecords.filter(record => Number(record?.chapter_no || 0) === chapterNo)
    if (!records.length) return null
    return records.find(record => !routeRiskTags(record, currentTurns.length ? currentTurns : turns).length) || records[0] || { chapter_no: chapterNo }
  }).filter(Boolean) as AnyRecord[]
  const futureRoute = routeChapters.map(chapter => ({
    chapterNo: Number(chapter?.chapter_no),
    title: text(chapter?.title, `第${chapter?.chapter_no || '?'}章`),
    chapterTask: text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task),
    conflict: text(chapter?.conflict || chapter?.raw_payload?.conflict),
    endingHook: text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook),
    mainlineProgress: text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress),
    riskTags: routeRiskTags(chapter, currentTurns.length ? currentTurns : turns),
  }))

  const future10Coverage = buildCoverage(planRecords, activeChapterNo, 10)
  const future100Coverage = buildCoverage(planRecords, activeChapterNo, 100)
  const readerPromise = firstNonEmpty(writingBible?.promise, writingBible?.reader_promise, selectedProject?.reader_promise)
  const currentVolumeGoal = firstNonEmpty(bibleVolume?.goal, currentVolume?.goal, currentVolume?.summary)
  const currentStageConflict = firstNonEmpty(bibleStage?.conflict, currentStage?.conflict, activeChapter?.conflict)
  const longformSpineGuard = buildLongformSpineGuardModel(writingBible, reviews)
  const coreContractRadar = buildCoreContractRadarModel({
    longformSpineGuard,
    activeChapter,
    currentVolumeGoal,
    reviews,
  })
  const activeChapterEvidence = firstNonEmpty(
    activeChapter?.chapter_goal,
    activeChapter?.raw_payload?.mainline_progress,
    activeChapter?.mainline_progress,
    activeChapter?.chapter_summary,
    activeChapter?.summary,
  )
  const currentLatestWrittenChapterNo = latestWrittenChapterNo(chapters)
  const healthIssues = buildHealthIssues({
    readerPromise,
    currentVolumeGoal,
    future10Coverage,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
    materialScore: input.materialScore,
  })
  const first30Retention = buildFirst30RetentionModel(chapters, reviews, productionTasks)
  const readerTrustLedger = buildReaderTrustLedgerModel(reviews)
  const readerTrialRoom = buildReaderTrialRoomModel(reviews)
  const innovationRadar = buildInnovationRadarModel(reviews)
  const storylineBoard = buildStorylineBoardModel(settingEntities, first30Retention, activeChapterNo, reviews)
  const characterArcBoard = buildCharacterArcBoardModel(settingEntities, reviews, activeChapterNo)
  const writtenWords = chapters.reduce((sum, chapter) => sum + wc(chapter?.chapter_text), 0)
  const targetWords = Number(selectedProject?.target_words || selectedProject?.targetWords || 0)
  const longformMemoryCapsule = buildLongformMemoryCapsuleModel({
    writingBible,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
  })
  const millionWordMilestones = buildMillionWordMilestonesModel({
    writingBible,
    targetWords,
    writtenWords,
  })
  const volumeBeatBudget = buildVolumeBeatBudgetModel({
    currentVolume,
    outlines,
    chapters,
    activeChapterNo,
  })
  const volumeSegmentGate = buildVolumeSegmentGateModel({
    currentVolume,
    currentVolumeGoal,
    chapters,
    reviews,
    volumeBeatBudget,
    readerTrustLedger,
    innovationRadar,
  })
  const recentFatigueRadar = buildRecentFatigueRadarModel({
    chapters,
    activeChapterNo,
    reviews,
  })
  const storyPressureLadder = buildStoryPressureLadderModel({
    routeChapters,
    activeChapterNo,
  })
  const storyUnitWorkshop = buildStoryUnitWorkshopModel({
    routeChapters,
    activeChapterNo,
    outlines,
  })
  const longformRhythm = buildLongformRhythmModel({
    reviews,
    writtenWords,
    currentVolumeGoal,
    future100Coverage,
    healthIssues,
    first30Retention,
    storylineBoard,
    volumeBeatBudget,
  })
  const longformBattleDesk = buildLongformBattleDeskModel({
    reviews,
    longformSpineGuard,
    millionWordMilestones,
    longformRhythm,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    storylineBoard,
    volumeBeatBudget,
    innovationRadar,
    storyUnitWorkshop,
    future10Coverage,
    future100Coverage,
  })
  const serialReleaseDesk = buildSerialReleaseDeskModel({
    selectedProject,
    chapters,
    reviews,
  })
  const governanceHub = buildGovernanceHubModel({
    reviews,
    healthIssues,
    first30Retention,
    readerTrialRoom,
    storylineBoard,
    longformRhythm,
    future10Coverage,
    future100Coverage,
    productionTasks,
  })
  const creationPipeline = buildCreationPipelineModel({
    longformSpineGuard,
    millionWordMilestones,
    future10Coverage,
    future100Coverage,
    storylineBoard,
    characterArcBoard,
    activeChapter,
    currentVolumeGoal,
    governanceHub,
    serialReleaseDesk,
  })

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '未命名项目'),
      currentVolume: text(currentVolume?.title || bibleVolume?.title, '未定位当前卷'),
      currentStage: text(currentStage?.title || bibleStage?.title, '未定位当前阶段'),
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '未选择章节',
      writtenWords,
      targetWords,
      future10Coverage,
      future100Coverage,
      longformHealth: healthLabel(healthIssues),
    },
    mainline: {
      readerPromise,
      currentVolumeGoal,
      currentStageConflict,
      payoffModel: firstNonEmpty(bibleStage?.payoff_model, activeChapter?.raw_payload?.payoff, writingBible?.payoff_model),
      previousTurn: text(previousTurn?.title, ''),
      nextTurn: text(nextTurn?.title, ''),
      currentChapterServesVolume: Boolean(currentVolumeGoal && activeChapterEvidence),
      risks: [
        ...arrayValue(storyState?.foreshadowing_status)
          .filter(item => text(item?.status) && text(item?.status) !== 'resolved')
          .map(item => `伏笔未回收：${text(item?.name, '未命名伏笔')}`),
        ...healthIssues.map(issue => issue.title),
      ],
    },
    creationPipeline,
    longformSpineGuard,
    coreContractRadar,
    millionWordMilestones,
    longformMemoryCapsule,
    futureRoute,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    innovationRadar,
    storylineBoard,
    characterArcBoard,
    governanceHub,
    serialReleaseDesk,
    longformRhythm,
    longformBattleDesk,
    volumeBeatBudget,
    volumeSegmentGate,
    recentFatigueRadar,
    storyPressureLadder,
    storyUnitWorkshop,
    volumeTree: buildVolumeTree(outlines, chapters),
    healthIssues,
  }
}
