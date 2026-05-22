import { wc } from './utils'

type AnyRecord = Record<string, any>

export type FuturePlanningCoverage = {
  ready: boolean
  plannedChapters: number
  expectedChapters: number
  missingChapters: number[]
  label: string
}

export type PlanningHealthStatus = {
  status: 'healthy' | 'drifting' | 'needs_planning'
  label: string
}

export type PlanningHealthIssue = {
  key: 'missing_reader_promise' | 'missing_volume_goal' | 'future10_incomplete' | 'story_state_stale' | 'material_weak'
  severity: 'critical' | 'warning'
  title: string
  detail: string
  actionKey:
    | 'complete_reader_promise'
    | 'complete_volume_plan'
    | 'complete_future10_plan'
    | 'refresh_story_state'
    | 'strengthen_materials'
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
  futureRoute: Array<{
    chapterNo: number
    title: string
    chapterTask: string
    conflict: string
    endingHook: string
    mainlineProgress: string
    riskTags: string[]
  }>
  volumeTree: Array<AnyRecord>
  healthIssues: PlanningHealthIssue[]
}

type BuildPlanningWorkspaceModelInput = {
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[]
  chapters?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
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
  return text(item?.outline_level || item?.level).toLowerCase()
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
  return volumes.find(volume => titleMatches(currentVolume?.title, volume?.title)) || volumes[0] || {}
}

function resolveStageFromBible(volume: AnyRecord, currentStage?: AnyRecord) {
  const stages = arrayValue(volume?.stages)
  return stages.find(stage => titleMatches(currentStage?.title, stage?.title)) || stages[0] || {}
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

function buildCoverage(chapters: AnyRecord[], startChapterNo: number, span: number): FuturePlanningCoverage {
  const expected = Array.from({ length: span }).map((_, index) => startChapterNo + index)
  const byNo = new Map(chapters.map(chapter => [Number(chapter?.chapter_no), chapter]))
  const existing = expected.map(chapterNo => byNo.get(chapterNo)).filter(Boolean) as AnyRecord[]
  const expectedChapters = Math.min(span, Math.max(existing.length, 0))
  const planned = existing.filter(chapter => {
    return text(chapter?.title) && (
      text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) ||
      text(chapter?.conflict || chapter?.raw_payload?.conflict) ||
      text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook) ||
      text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)
    )
  })
  const missingChapters = existing
    .filter(chapter => !planned.includes(chapter))
    .map(chapter => Number(chapter?.chapter_no))

  return {
    ready: planned.length >= Math.min(4, expectedChapters),
    plannedChapters: planned.length,
    expectedChapters,
    missingChapters,
    label: `${planned.length}/${expectedChapters}`,
  }
}

function buildVolumeTree(outlines: AnyRecord[], chapters: AnyRecord[]) {
  const byId = new Map<any, AnyRecord>()
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

  const roots: AnyRecord[] = []
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
  activeChapterNo: number
  materialScore?: AnyRecord | null
}): PlanningHealthIssue[] {
  const issues: PlanningHealthIssue[] = []

  if (!args.readerPromise) {
    issues.push({
      key: 'missing_reader_promise',
      severity: 'critical',
      title: '缺读者承诺',
      detail: '项目缺少长篇核心承诺。',
      actionKey: 'complete_reader_promise',
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
      actionKey: 'complete_future10_plan',
    })
  }
  if (Number(args.storyState?.last_updated_chapter || 0) < args.activeChapterNo) {
    issues.push({
      key: 'story_state_stale',
      severity: 'warning',
      title: '故事状态滞后',
      detail: '故事状态落后于当前章节。',
      actionKey: 'refresh_story_state',
    })
  }
  if (args.materialScore && (Number(args.materialScore.score || 0) < 60 || args.materialScore.can_generate === false)) {
    issues.push({
      key: 'material_weak',
      severity: 'warning',
      title: '素材准备不足',
      detail: '素材评分或生成门槛提示需要补强。',
      actionKey: 'strengthen_materials',
    })
  }

  return issues
}

function healthLabel(issues: PlanningHealthIssue[]): PlanningHealthStatus {
  if (issues.some(issue => issue.severity === 'critical')) return { status: 'needs_planning', label: '需要补规划' }
  if (issues.length > 0) return { status: 'drifting', label: '存在漂移' }
  return { status: 'healthy', label: '规划健康' }
}

export function buildPlanningWorkspaceModel(input: BuildPlanningWorkspaceModelInput): PlanningWorkspaceModel {
  const selectedProject = input.selectedProject || {}
  const outlines = arrayValue(input.outlines)
  const chapters = arrayValue(input.chapters).slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const activeChapter = input.activeChapter || chapters[0] || {}
  const activeChapterNo = Number(activeChapter?.chapter_no || chapters[0]?.chapter_no || 1)
  const writingBible = resolveWritingBible(selectedProject)
  const storyState = resolveStoryState(selectedProject)

  const currentVolume = outlines.find(outline => isVolume(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isVolume) || {}
  const currentStage = outlines.find(outline => isStage(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isStage) || {}
  const turns = outlines.filter(isTurn).sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const currentTurns = turns.filter(turn => chapterInRange(activeChapterNo, turn))
  const previousTurn = turns.filter(turn => chapterRange(turn).end < activeChapterNo).at(-1)
  const nextTurn = turns.find(turn => chapterRange(turn).start >= activeChapterNo)
  const bibleVolume = resolveVolumeFromBible(writingBible, currentVolume)
  const bibleStage = resolveStageFromBible(bibleVolume, currentStage)

  const routeChapters = chapters.filter(chapter => Number(chapter?.chapter_no) >= activeChapterNo).slice(0, 10)
  const futureRoute = routeChapters.map(chapter => ({
    chapterNo: Number(chapter?.chapter_no),
    title: text(chapter?.title, `第${chapter?.chapter_no || '?'}章`),
    chapterTask: text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task),
    conflict: text(chapter?.conflict || chapter?.raw_payload?.conflict),
    endingHook: text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook),
    mainlineProgress: text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress),
    riskTags: routeRiskTags(chapter, currentTurns.length ? currentTurns : turns),
  }))

  const future10Coverage = buildCoverage(chapters, activeChapterNo, 10)
  const future100Coverage = buildCoverage(chapters, activeChapterNo, 100)
  const readerPromise = firstNonEmpty(writingBible?.promise, writingBible?.reader_promise, selectedProject?.reader_promise)
  const currentVolumeGoal = firstNonEmpty(bibleVolume?.goal, currentVolume?.goal, currentVolume?.summary)
  const currentStageConflict = firstNonEmpty(bibleStage?.conflict, currentStage?.conflict, activeChapter?.conflict)
  const healthIssues = buildHealthIssues({
    readerPromise,
    currentVolumeGoal,
    future10Coverage,
    storyState,
    activeChapterNo,
    materialScore: input.materialScore,
  })

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '未命名项目'),
      currentVolume: text(currentVolume?.title || bibleVolume?.title, '未定位当前卷'),
      currentStage: text(currentStage?.title || bibleStage?.title, '未定位当前阶段'),
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '未选择章节',
      writtenWords: chapters.reduce((sum, chapter) => sum + wc(chapter?.chapter_text), 0),
      targetWords: Number(selectedProject?.target_words || selectedProject?.targetWords || 0),
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
      currentChapterServesVolume: Boolean(currentVolumeGoal && (
        text(activeChapter?.chapter_goal).includes(currentVolumeGoal) ||
        text(activeChapter?.raw_payload?.mainline_progress || activeChapter?.mainline_progress) ||
        text(storyState?.mainline_progress)
      )),
      risks: [
        ...arrayValue(storyState?.foreshadowing_status)
          .filter(item => text(item?.status) && text(item?.status) !== 'resolved')
          .map(item => `伏笔未回收：${text(item?.name, '未命名伏笔')}`),
        ...healthIssues.map(issue => issue.title),
      ],
    },
    futureRoute,
    volumeTree: buildVolumeTree(outlines, chapters),
    healthIssues,
  }
}
