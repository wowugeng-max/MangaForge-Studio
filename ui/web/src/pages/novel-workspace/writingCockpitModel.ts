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
    const rawChapterNo = Number(outline?.chapter_no || raw?.chapter_no || raw?.future100?.chapter_no || raw?.skeleton?.chapter_no || 0)
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
  }
}

function chapterPlanFields(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const { raw, future100, skeleton } = outlinePlanPayload(outline)
  const goal = firstNonEmpty(
    chapter?.chapter_goal,
    chapter?.chapterTask,
    chapter?.task,
    chapterRaw?.chapter_goal,
    chapterRaw?.chapterTask,
    chapterRaw?.task,
    outline?.chapter_goal,
    outline?.chapterTask,
    outline?.task,
    raw?.chapter_goal,
    raw?.chapterTask,
    raw?.task,
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
    outline?.conflict,
    raw?.conflict,
    future100?.conflict,
    skeleton?.conflict,
    firstArrayText(outline?.conflict_points),
    firstArrayText(raw?.conflict_points),
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
    outline?.ending_hook,
    outline?.endingHook,
    outline?.hook,
    raw?.ending_hook,
    raw?.endingHook,
    raw?.hook,
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

function reportPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.report || payload?.editor_report || payload?.result || {}
}

function revisionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.revision || payload?.result || payload
}

function extractQualityScore(quality: AnyRecord) {
  const value = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
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

  const latestQualityRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_quality')
  const latestReportRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_report')
  const latestRevisionRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_revision')
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
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
    { key: 'review_draft', label: '查看质量卡' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
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

function buildEpisodePlan(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
}): ChapterPlanningDeskModel['episodePlan'] {
  const target = contextTarget(args.contextPackage)
  const forbiddenRepeats = stringArray(target?.forbidden_repeats)
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
    canonUpdatePreview: [
      '同步最近已写章节的关键事实',
      '检查人物立场与伏笔状态',
      '更新下一章可引用的王府人心变化',
    ],
  }
}
