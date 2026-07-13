export type NovelPipelineStageKey =
  | 'creation_contract'
  | 'planning_ready'
  | 'chapter_writing'
  | 'delivery_acceptance'
  | 'batch_scaling'
  | 'serial_governance'

export type NovelPipelineStageStatus = 'done' | 'active' | 'blocked' | 'pending'
export type NovelPipelineCheckStatus = 'pass' | 'warning' | 'blocked'

export type NovelPipelineActionKey =
  | 'open_writing_bible'
  | 'enter_story_planning'
  | 'confirm_plan_and_write_draft'
  | 'refresh_current_quality'
  | 'create_editor_report'
  | 'apply_editor_revision'
  | 'sync_story_state'
  | 'start_safe_batch'
  | 'open_longform_governance'

export type NovelPipelineAction = {
  key: NovelPipelineActionKey
  label: string
  workspace_area: 'autoCreation' | 'storyPlanning' | 'chapterWriting' | 'storyAssets' | 'qualityRevision' | 'productionOps'
}

export type NovelPipelineAgentStep = {
  key: string
  label: string
  agent: string
  description: string
  action_key: NovelPipelineActionKey
  workspace_area: NovelPipelineAction['workspace_area']
}

export type NovelPipelineCheck = {
  key: string
  label: string
  status: NovelPipelineCheckStatus
  detail: string
}

export type NovelPipelineStage = {
  key: NovelPipelineStageKey
  label: string
  status: NovelPipelineStageStatus
  summary: string
  checks: NovelPipelineCheck[]
  action: NovelPipelineAction
  agent_steps: NovelPipelineAgentStep[]
}

export type BuildNovelPipelineSummaryInput = {
  project: any
  chapters?: any[]
  outlines?: any[]
  worldbuilding?: any[]
  characters?: any[]
  reviews?: any[]
  runs?: any[]
}

export type NovelPipelineSummary = {
  project_id: number
  current_stage: NovelPipelineStageKey
  primary_action: NovelPipelineAction
  summary: string
  stages: NovelPipelineStage[]
  updated_at: string
}

const ACTIONS: Record<NovelPipelineActionKey, NovelPipelineAction> = {
  open_writing_bible: { key: 'open_writing_bible', label: '完善创作契约', workspace_area: 'storyAssets' },
  enter_story_planning: { key: 'enter_story_planning', label: '补齐规划材料', workspace_area: 'storyPlanning' },
  confirm_plan_and_write_draft: { key: 'confirm_plan_and_write_draft', label: '生成当前章正文', workspace_area: 'chapterWriting' },
  refresh_current_quality: { key: 'refresh_current_quality', label: '复检当前正文', workspace_area: 'qualityRevision' },
  create_editor_report: { key: 'create_editor_report', label: '生成编辑报告', workspace_area: 'qualityRevision' },
  apply_editor_revision: { key: 'apply_editor_revision', label: '应用编辑修订', workspace_area: 'qualityRevision' },
  sync_story_state: { key: 'sync_story_state', label: '同步故事状态', workspace_area: 'qualityRevision' },
  start_safe_batch: { key: 'start_safe_batch', label: '开启安全连写', workspace_area: 'autoCreation' },
  open_longform_governance: { key: 'open_longform_governance', label: '查看长线治理', workspace_area: 'productionOps' },
}

const AGENT_STEPS: Record<string, NovelPipelineAgentStep> = {
  writing_bible_contract: {
    key: 'writing_bible_contract',
    label: '创作契约',
    agent: 'writing-bible',
    description: '补齐读者承诺、主角驱动力、核心矛盾、卷目标和长线约束。',
    action_key: 'open_writing_bible',
    workspace_area: 'storyAssets',
  },
  market_positioning: {
    key: 'market_positioning',
    label: '市场定位',
    agent: 'market-agent',
    description: '校准类型、目标读者、卖点和开局商业承诺。',
    action_key: 'open_writing_bible',
    workspace_area: 'storyAssets',
  },
  foundation_agent_chain: {
    key: 'foundation_agent_chain',
    label: '全案规划',
    agent: 'market/world/character/outline',
    description: '生成世界观、角色、粗纲和卷级方向。',
    action_key: 'enter_story_planning',
    workspace_area: 'storyPlanning',
  },
  detail_outline_agent: {
    key: 'detail_outline_agent',
    label: '细纲展开',
    agent: 'detail-outline-agent',
    description: '把当前目标拆到章节目标、冲突、摘要和结尾钩子。',
    action_key: 'enter_story_planning',
    workspace_area: 'storyPlanning',
  },
  continuity_precheck: {
    key: 'continuity_precheck',
    label: '连续性预检',
    agent: 'continuity-check-agent',
    description: '正文前先检查设定、人物和剧情推进是否互相打架。',
    action_key: 'enter_story_planning',
    workspace_area: 'storyPlanning',
  },
  scene_card_agent: {
    key: 'scene_card_agent',
    label: '场景卡',
    agent: 'scene-card-agent',
    description: '把章节计划拆成可写的场景顺序、冲突和转场。',
    action_key: 'confirm_plan_and_write_draft',
    workspace_area: 'chapterWriting',
  },
  prose_draft_agent: {
    key: 'prose_draft_agent',
    label: '正文生成',
    agent: 'prose-agent',
    description: '在章节材料、场景卡和故事状态约束下生成正文。',
    action_key: 'confirm_plan_and_write_draft',
    workspace_area: 'chapterWriting',
  },
  prose_quality_review: {
    key: 'prose_quality_review',
    label: '质量复检',
    agent: 'prose-quality',
    description: '检查可读性、节奏、爽点兑现和基础质量分。',
    action_key: 'refresh_current_quality',
    workspace_area: 'qualityRevision',
  },
  editor_report: {
    key: 'editor_report',
    label: '编辑报告',
    agent: 'editor-report',
    description: '把质量问题拆成有证据的可执行修订意见。',
    action_key: 'create_editor_report',
    workspace_area: 'qualityRevision',
  },
  editor_revision: {
    key: 'editor_revision',
    label: '修订入库',
    agent: 'editor-revision',
    description: '按编辑报告生成修订稿，并保留版本可回滚。',
    action_key: 'apply_editor_revision',
    workspace_area: 'qualityRevision',
  },
  story_state_sync: {
    key: 'story_state_sync',
    label: '状态同步',
    agent: 'story-state-sync',
    description: '把本章新增事实、人物状态和剧情进度写回状态机。',
    action_key: 'sync_story_state',
    workspace_area: 'qualityRevision',
  },
  chapter_group_queue: {
    key: 'chapter_group_queue',
    label: '章节群队列',
    agent: 'chapter-group-agent',
    description: '把已达材料阈值的章节放入任务中心逐章推进。',
    action_key: 'start_safe_batch',
    workspace_area: 'autoCreation',
  },
  safe_batch_generation: {
    key: 'safe_batch_generation',
    label: '安全连写',
    agent: 'safe-batch',
    description: '从小批次开始连写，失败时进入恢复和修复队列。',
    action_key: 'start_safe_batch',
    workspace_area: 'autoCreation',
  },
  production_dashboard: {
    key: 'production_dashboard',
    label: '生产仪表盘',
    agent: 'production-dashboard',
    description: '查看批次质量、任务状态和故事状态同步位置。',
    action_key: 'open_longform_governance',
    workspace_area: 'productionOps',
  },
  longform_trends: {
    key: 'longform_trends',
    label: '长线趋势',
    agent: 'longform-production-trends',
    description: '跟踪主线漂移、重复问题、疲劳风险和质量趋势。',
    action_key: 'open_longform_governance',
    workspace_area: 'productionOps',
  },
  repair_queue: {
    key: 'repair_queue',
    label: '修复队列',
    agent: 'longform-production-repair',
    description: '把趋势问题转成任务中心可关闭的治理任务。',
    action_key: 'open_longform_governance',
    workspace_area: 'productionOps',
  },
}

function text(...values: any[]) {
  for (const value of values) {
    const str = String(value ?? '').trim()
    if (str) return str
  }
  return ''
}

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function parsePayload(value: any) {
  if (!value) return {}
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function projectReferenceConfig(project: any) {
  return project?.reference_config || {}
}

function writingBible(project: any) {
  const config = projectReferenceConfig(project)
  return config.writing_bible || project?.writing_bible || {}
}

function storyState(project: any) {
  const config = projectReferenceConfig(project)
  return config.story_state || project?.story_state || {}
}

function contractField(bible: any, keys: string[], ...fallbacks: any[]) {
  return text(...keys.map(key => bible?.[key]), ...fallbacks)
}

function writingBibleContract(project: any) {
  const bible = writingBible(project)
  return {
    readerPromise: contractField(
      bible,
      ['reader_promise', 'readerPromise', 'promise', 'reader_hook', 'readerHook'],
      project?.synopsis,
    ),
    protagonistDrive: contractField(
      bible,
      ['protagonist_drive', 'protagonistDrive', 'protagonist_motivation', 'main_character_drive', 'hero_drive', 'motivation'],
    ),
    coreConflict: contractField(
      bible,
      ['core_conflict', 'coreConflict', 'main_conflict', 'conflict_axis', 'longform_conflict'],
    ),
    volumeGoal: contractField(
      bible,
      ['current_volume_goal', 'currentVolumeGoal', 'volume_goal', 'first_volume_goal', 'stage_goal'],
    ),
    innovationHook: contractField(
      bible,
      ['innovation_hook', 'innovationHook', 'original_hook', 'unique_selling_point', 'selling_point', 'freshness_hook'],
    ),
    first30Plan: contractField(
      bible,
      ['first30_plan', 'first30Plan', 'first_30_plan', 'opening_strategy', 'retention_plan', 'first_thirty_plan'],
    ),
    longformCapacity: contractField(
      bible,
      ['longform_capacity', 'longformCapacity', 'million_word_spine', 'longform_spine', 'serial_engine', 'longform_engine'],
    ),
  }
}

function hasWritingBibleContract(project: any) {
  const contract = writingBibleContract(project)
  return Boolean(contract.readerPromise && contract.protagonistDrive && contract.coreConflict && contract.volumeGoal)
}

function sortedChapters(chapters: any[]) {
  return arrayValue(chapters).slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
}

function hasProse(chapter: any) {
  const prose = text(chapter?.chapter_text)
  return Boolean(prose && !prose.includes('【占位正文】'))
}

function choosePipelineChapter(chapters: any[]) {
  const sorted = sortedChapters(chapters)
  return sorted.find(chapter => !hasProse(chapter)) || sorted[sorted.length - 1] || null
}

function chapterNo(chapter: any) {
  return Number(chapter?.chapter_no || 0)
}

function outlineChapterNo(outline: any) {
  const raw = outline?.raw_payload || {}
  return Number(raw.chapter_no || raw.future100?.chapter_no || raw.skeleton?.chapter_no || raw.rollingPlan?.chapter_no || 0)
}

function hasChapterPlan(chapter: any, outlines: any[]) {
  if (!chapter) return false
  const raw = chapter.raw_payload || {}
  if (text(chapter.chapter_goal, chapter.chapter_summary, chapter.conflict, chapter.ending_hook)) return true
  if (arrayValue(raw.scene_cards).length > 0 || arrayValue(raw.scenes).length > 0 || raw.pre_draft_brief) return true
  return arrayValue(outlines).some(outline => {
    if (outlineChapterNo(outline) === chapterNo(chapter)) return true
    return text(outline?.title) && text(outline?.title) === text(chapter?.title)
  })
}

function hasScenePlan(chapter: any) {
  const raw = chapter?.raw_payload || {}
  return Boolean(raw.pre_draft_brief || arrayValue(raw.scene_cards).length > 0 || arrayValue(raw.scenes).length > 0)
}

function hasWorldAnchor(project: any, worldbuilding: any[]) {
  const bible = writingBible(project)
  return Boolean(
    arrayValue(worldbuilding).some(item => text(item?.world_summary, item?.summary, item?.rules, item?.systems))
    || text(bible.world_summary, bible.worldSummary)
    || arrayValue(bible.world_rules).length > 0
    || text(bible.world_rules),
  )
}

function hasCharacterAnchor(project: any, characters: any[], contract: ReturnType<typeof writingBibleContract>) {
  const bible = writingBible(project)
  return Boolean(
    arrayValue(characters).some(item => text(item?.name, item?.goal, item?.motivation, item?.current_state))
    || arrayValue(bible.characters).some((item: any) => text(item?.name, item?.goal, item?.desire, item?.arc))
    || contract.protagonistDrive,
  )
}

function latestChapterReview(reviews: any[], chapter: any, type: string) {
  if (!chapter) return null
  return arrayValue(reviews)
    .filter(review => Number(review?.chapter_id || 0) === Number(chapter?.id || 0))
    .filter(review => String(review?.review_type || '') === type)
    .slice()
    .sort((a, b) => String(b?.created_at || '').localeCompare(String(a?.created_at || '')))[0] || null
}

function qualityPassed(review: any) {
  if (!review) return false
  const payload = parsePayload(review.payload)
  const quality = payload.self_check?.review || payload.review || payload.quality || payload.result || payload
  if (quality?.passed === true) return true
  const score = Number(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? 0)
  return Number.isFinite(score) && score >= 75 && quality?.passed !== false
}

function reviewTime(review: any) {
  const time = Date.parse(String(review?.created_at || review?.updated_at || ''))
  return Number.isFinite(time) ? time : 0
}

function editorReportNeedsRevision(review: any) {
  if (!review) return false
  const payload = parsePayload(review.payload)
  const report = payload.editor_report || payload.report || payload.result || payload
  const issues = [
    ...arrayValue(report.issues),
    ...arrayValue(report.revision_items),
    ...arrayValue(report.revisions),
    ...arrayValue(payload.issues),
  ]
  const status = text(report.status, payload.status, review.status).toLowerCase()
  if (issues.length > 0) return true
  if (/warn|fail|risk|revision|revise|needs/.test(status)) return true
  if (/ok|pass|clean|accept|accepted|completed/.test(status)) return false
  return true
}

function storyStateSynced(project: any, chapters: any[]) {
  const latestWritten = Math.max(0, ...sortedChapters(chapters).filter(hasProse).map(chapter => chapterNo(chapter)))
  if (!latestWritten) return false
  return Number(storyState(project)?.last_updated_chapter || 0) >= latestWritten
}

function runStatus(run: any) {
  return String(run?.status || '').toLowerCase()
}

function runPayload(run: any) {
  return {
    input: parsePayload(run?.input_ref),
    output: parsePayload(run?.output_ref),
  }
}

function isSuccessRun(run: any) {
  return ['completed', 'complete', 'success', 'succeeded', 'done', 'ok'].includes(runStatus(run))
}

function isFailedRun(run: any) {
  return ['failed', 'error', 'blocked', 'cancelled'].includes(runStatus(run))
}

function isActiveRun(run: any) {
  return ['queued', 'ready', 'running', 'paused', 'pending', 'needs_approval'].includes(runStatus(run))
}

function isBatchProductionRun(run: any) {
  return ['chapter_group_generation', 'batch_generate_prose'].includes(String(run?.run_type || ''))
}

function batchRunChapterFailures(run: any) {
  const projectedCount = Number(run?.pipeline_chapter_failure_count)
  if (Number.isFinite(projectedCount) && projectedCount >= 0) return projectedCount
  const payload = runPayload(run).output
  return arrayValue(payload.chapters).filter((chapter: any) => {
    const status = String(chapter?.status || '').toLowerCase()
    return ['failed', 'error', 'blocked', 'needs_repair'].includes(status)
  }).length
}

function batchProductionHealth(runs: any[]) {
  const batchRuns = arrayValue(runs).filter(isBatchProductionRun)
  const successful = batchRuns.filter(run => isSuccessRun(run) && batchRunChapterFailures(run) === 0)
  const failed = batchRuns.filter(run => isFailedRun(run) || batchRunChapterFailures(run) > 0)
  const active = batchRuns.filter(isActiveRun)
  const countRuns = (items: any[]) => items.reduce((sum, run) => sum + Math.max(1, Number(run?.pipeline_run_count || 1)), 0)
  return {
    total: countRuns(batchRuns),
    successful: countRuns(successful),
    failed: countRuns(failed),
    active: countRuns(active),
  }
}

function repairTasksFromRun(run: any) {
  const payload = runPayload(run)
  return [
    ...arrayValue(payload.output.tasks),
    ...arrayValue(payload.output.repair_tasks),
    ...arrayValue(payload.input.tasks),
    ...arrayValue(payload.input.repair_tasks),
  ]
}

function isRepairRun(run: any) {
  return ['longform_production_repair', 'release_repair_queue'].includes(String(run?.run_type || ''))
}

function isOpenRepairTask(task: any) {
  const status = text(task?.task_status, task?.taskStatus, task?.status).toLowerCase()
  if (!status) return true
  return !['resolved', 'closed', 'completed', 'complete', 'done', 'success', 'ok'].includes(status)
}

function repairQueueHealth(runs: any[]) {
  let openTasks = 0
  let openRuns = 0
  for (const run of arrayValue(runs).filter(isRepairRun)) {
    const tasks = repairTasksFromRun(run)
    const taskOpenCount = tasks.filter(isOpenRepairTask).length + Math.max(0, Number(run?.pipeline_open_task_count || 0))
    openTasks += taskOpenCount
    if (isActiveRun(run) || isFailedRun(run) || (!tasks.length && !isSuccessRun(run))) {
      openRuns += Math.max(1, Number(run?.pipeline_run_count || 1))
    }
  }
  return { openRuns, openTasks, openTotal: openRuns + openTasks }
}

function hasGovernanceTrendEvidence(runs: any[], reviews: any[]) {
  const runTypes = new Set([
    'longform_creation_diagnosis',
    'longform_pressure_test',
    'quality_benchmark',
    'book_review',
    'regression_benchmark',
    'first30_retention_diagnosis',
  ])
  const reviewTypes = new Set([
    'longform_production_repair_audit',
    'book_review',
    'quality_benchmark',
    'delivery_risk_convergence',
  ])
  return arrayValue(runs).some(run => runTypes.has(String(run?.run_type || '')) && isSuccessRun(run))
    || arrayValue(reviews).some(review => reviewTypes.has(String(review?.review_type || '')))
}

function check(key: string, label: string, status: NovelPipelineCheckStatus, detail: string): NovelPipelineCheck {
  return { key, label, status, detail }
}

function agentSteps(keys: string[]) {
  return keys.map(key => AGENT_STEPS[key]).filter(Boolean)
}

function stage(
  key: NovelPipelineStageKey,
  label: string,
  status: NovelPipelineStageStatus,
  summary: string,
  actionKey: NovelPipelineActionKey,
  checks: NovelPipelineCheck[],
  steps: NovelPipelineAgentStep[] = [],
): NovelPipelineStage {
  return {
    key,
    label,
    status,
    summary,
    action: ACTIONS[actionKey],
    checks,
    agent_steps: steps,
  }
}

export function buildNovelPipelineSummary(input: BuildNovelPipelineSummaryInput): NovelPipelineSummary {
  const project = input.project || {}
  const chapters = sortedChapters(input.chapters || [])
  const outlines = arrayValue(input.outlines)
  const worldbuilding = arrayValue(input.worldbuilding)
  const characters = arrayValue(input.characters)
  const reviews = arrayValue(input.reviews)
  const runs = arrayValue(input.runs)
  const targetChapter = choosePipelineChapter(chapters)
  const contract = writingBibleContract(project)
  const contractReady = hasWritingBibleContract(project)
  const contractUpgradeReady = Boolean(contract.innovationHook && contract.first30Plan && contract.longformCapacity)
  const worldReady = hasWorldAnchor(project, worldbuilding)
  const characterReady = hasCharacterAnchor(project, characters, contract)
  const chapterPlanReady = Boolean(targetChapter && hasChapterPlan(targetChapter, outlines))
  const planReady = Boolean(targetChapter && chapterPlanReady && worldReady && characterReady)
  const scenePlanReady = Boolean(targetChapter && hasScenePlan(targetChapter))
  const currentHasProse = Boolean(targetChapter && hasProse(targetChapter))
  const qualityReview = latestChapterReview(reviews, targetChapter, 'prose_quality')
  const qualityReady = qualityPassed(qualityReview)
  const editorReport = latestChapterReview(reviews, targetChapter, 'editor_report')
  const editorRevision = latestChapterReview(reviews, targetChapter, 'editor_revision')
  const editorReportReady = Boolean(editorReport)
  const revisionRequired = editorReportNeedsRevision(editorReport)
  const revisionReady = Boolean(!revisionRequired || editorRevision)
  const qualityAfterRevisionReady = Boolean(qualityReady && (!editorRevision || reviewTime(qualityReview) >= reviewTime(editorRevision)))
  const stateReady = storyStateSynced(project, chapters)
  const batchReady = currentHasProse && qualityAfterRevisionReady && editorReportReady && revisionReady && stateReady
  const batchHealth = batchProductionHealth(runs)
  const repairHealth = repairQueueHealth(runs)
  const hasBatchEvidence = batchHealth.successful > 0
  const batchNeedsRepair = batchHealth.failed > 0 || repairHealth.openTotal > 0
  const batchInProgress = batchHealth.active > 0
  const governanceTrendReady = hasGovernanceTrendEvidence(runs, reviews)

  let currentStage: NovelPipelineStageKey = 'creation_contract'
  let primaryActionKey: NovelPipelineActionKey = 'open_writing_bible'

  if (!contractReady) {
    currentStage = 'creation_contract'
    primaryActionKey = 'open_writing_bible'
  } else if (!planReady) {
    currentStage = 'planning_ready'
    primaryActionKey = 'enter_story_planning'
  } else if (!currentHasProse) {
    currentStage = 'chapter_writing'
    primaryActionKey = 'confirm_plan_and_write_draft'
  } else if (!qualityReady) {
    currentStage = 'delivery_acceptance'
    primaryActionKey = 'refresh_current_quality'
  } else if (!editorReportReady) {
    currentStage = 'delivery_acceptance'
    primaryActionKey = 'create_editor_report'
  } else if (!revisionReady) {
    currentStage = 'delivery_acceptance'
    primaryActionKey = 'apply_editor_revision'
  } else if (!qualityAfterRevisionReady) {
    currentStage = 'delivery_acceptance'
    primaryActionKey = 'refresh_current_quality'
  } else if (!stateReady) {
    currentStage = 'delivery_acceptance'
    primaryActionKey = 'sync_story_state'
  } else if (!hasBatchEvidence || batchNeedsRepair || batchInProgress) {
    currentStage = 'batch_scaling'
    primaryActionKey = batchNeedsRepair || batchInProgress ? 'open_longform_governance' : 'start_safe_batch'
  } else {
    currentStage = 'serial_governance'
    primaryActionKey = 'open_longform_governance'
  }

  const stageOrder: NovelPipelineStageKey[] = [
    'creation_contract',
    'planning_ready',
    'chapter_writing',
    'delivery_acceptance',
    'batch_scaling',
    'serial_governance',
  ]
  const currentIndex = stageOrder.indexOf(currentStage)
  const statusFor = (key: NovelPipelineStageKey): NovelPipelineStageStatus => {
    const index = stageOrder.indexOf(key)
    if (index < currentIndex) return 'done'
    if (index > currentIndex) return 'pending'
    if (key === 'creation_contract' && !contractReady) return 'blocked'
    if (key === 'planning_ready' && !planReady) return 'blocked'
    return 'active'
  }

  const stages: NovelPipelineStage[] = [
    stage(
      'creation_contract',
      '创建契约',
      statusFor('creation_contract'),
      contractReady
        ? contractUpgradeReady
          ? '读者承诺、主角驱动力、核心矛盾和长篇方向已形成可执行契约。'
          : '核心创作契约可用，建议继续补创新钩子、前30章策略和长线容量。'
        : '先补齐读者承诺、主角驱动力、核心矛盾和当前卷目标，避免空项目直接写正文。',
      'open_writing_bible',
      [
        check('reader_promise', '读者承诺', contract.readerPromise ? 'pass' : 'blocked', contract.readerPromise ? '已有读者承诺，可约束每章情绪兑现。' : '缺少读者承诺或开局情绪价值。'),
        check('protagonist_drive', '主角驱动力', contract.protagonistDrive ? 'pass' : 'blocked', contract.protagonistDrive ? '主角前进理由清楚。' : '需要明确主角为什么必须继续往前走。'),
        check('core_conflict', '核心矛盾', contract.coreConflict ? 'pass' : 'blocked', contract.coreConflict ? '长期冲突可用于约束后续章节。' : '需要明确贯穿全书的主要对抗。'),
        check('current_volume_goal', '当前卷目标', contract.volumeGoal ? 'pass' : 'blocked', contract.volumeGoal ? '当前卷有可抵达目标。' : '需要明确第一阶段故事要打到哪里。'),
        check('innovation_hook', '创新钩子', contract.innovationHook ? 'pass' : 'warning', contract.innovationHook ? '已有同类差异点。' : '建议补充这本书区别于同类作品的新鲜点。'),
        check('first30_plan', '前30章策略', contract.first30Plan ? 'pass' : 'warning', contract.first30Plan ? '开局留存策略已记录。' : '建议补齐前三十章留存、爽点和转折策略。'),
        check('longform_capacity', '长篇容量', contract.longformCapacity ? 'pass' : 'warning', contract.longformCapacity ? '已有长篇扩展支撑。' : '建议说明百万字级别的卷轴、升级或矛盾扩展方式。'),
      ],
      agentSteps(['writing_bible_contract', 'market_positioning']),
    ),
    stage(
      'planning_ready',
      '规划就绪',
      statusFor('planning_ready'),
      planReady ? `第${chapterNo(targetChapter)}章已有章节计划、世界锚点和人物锚点。` : '需要先准备当前章目标、冲突、钩子、世界锚点和人物锚点。',
      'enter_story_planning',
      [
        check('target_chapter', '目标章节', targetChapter ? 'pass' : 'blocked', targetChapter ? `目标章节：第${chapterNo(targetChapter)}章《${text(targetChapter.title, '未命名')}》。` : '还没有可执行章节。'),
        check('chapter_plan', '章节计划', chapterPlanReady ? 'pass' : 'blocked', chapterPlanReady ? '章节计划可用于生成正文。' : '缺章节目标、冲突、摘要或大纲。'),
        check('world_anchor', '世界锚点', worldReady ? 'pass' : 'blocked', worldReady ? '已有世界规则或设定资产约束正文。' : '缺世界观、规则或设定资产，正文容易漂移。'),
        check('character_anchor', '人物锚点', characterReady ? 'pass' : 'blocked', characterReady ? '已有主角驱动力或人物资产约束行为。' : '缺人物动机、目标或当前状态。'),
      ],
      agentSteps(['foundation_agent_chain', 'detail_outline_agent', 'continuity_precheck']),
    ),
    stage(
      'chapter_writing',
      '正文开写',
      statusFor('chapter_writing'),
      currentHasProse ? '当前目标章节已有正文。' : scenePlanReady ? '场景计划已准备，可以生成正文。' : '建议先生成场景卡或预写简报，再进入正文。',
      'confirm_plan_and_write_draft',
      [
        check('scene_plan', '场景计划', scenePlanReady ? 'pass' : 'warning', scenePlanReady ? '已有场景卡或预写简报。' : '可以写，但缺少更细的场景拆解。'),
        check('draft', '正文初稿', currentHasProse ? 'pass' : 'blocked', currentHasProse ? '已有正文，进入验收。' : '当前章还没有正文。'),
      ],
      agentSteps(['scene_card_agent', 'prose_draft_agent']),
    ),
    stage(
      'delivery_acceptance',
      '交稿验收',
      statusFor('delivery_acceptance'),
      batchReady
        ? '当前章已完成质量复检、编辑诊断、必要修订和故事状态同步。'
        : !qualityReady
          ? '正文写完后先跑质量复检和编辑报告。'
          : !editorReportReady
            ? '质量已过线，继续生成编辑报告，把问题拆成可执行修订项。'
            : !revisionReady
              ? '编辑报告已有修订项，需要生成并入库修订稿。'
              : !qualityAfterRevisionReady
                ? '修订稿已入库，需要重新复检当前版本。'
                : '质量和诊断已完成，还需要同步故事状态。',
      !qualityReady || !qualityAfterRevisionReady ? 'refresh_current_quality' : !editorReportReady ? 'create_editor_report' : !revisionReady ? 'apply_editor_revision' : 'sync_story_state',
      [
        check('quality', '质量复检', qualityAfterRevisionReady ? 'pass' : currentHasProse ? 'blocked' : 'warning', qualityAfterRevisionReady ? '当前章质量复检已通过。' : editorRevision ? '修订稿入库后需要重新复检。' : currentHasProse ? '当前正文缺少通过的质量复检。' : '正文生成后再复检。'),
        check('editor_report', '编辑报告', editorReportReady ? 'pass' : currentHasProse ? 'blocked' : 'warning', editorReportReady ? '已有编辑报告可作为修订依据。' : currentHasProse ? '正文通过初检后需要生成编辑报告。' : '正文生成后再诊断。'),
        check('editor_revision', '修订稿', revisionReady ? 'pass' : editorReportReady ? 'blocked' : 'warning', revisionReady ? (revisionRequired ? '编辑修订已入库。' : '编辑报告未要求修订。') : '编辑报告指出问题后，需要应用修订稿。'),
        check('story_state', '故事状态', stateReady ? 'pass' : currentHasProse ? 'blocked' : 'warning', stateReady ? '故事状态已同步到最新正文。' : currentHasProse ? '质量后需要同步故事状态。' : '正文交付后再同步状态。'),
      ],
      agentSteps(['prose_quality_review', 'editor_report', 'editor_revision', 'story_state_sync']),
    ),
    stage(
      'batch_scaling',
      '批次放大',
      statusFor('batch_scaling'),
      batchNeedsRepair
        ? '安全连写已有失败或未关闭修复项，先处理修复队列再继续放大。'
        : batchInProgress
          ? '安全连写批次正在任务中心推进，等待执行结果回填后再判断是否放大。'
          : hasBatchEvidence
            ? '已有干净的成功批次记录，可以进入长线治理观察。'
            : '当前章验收后，先从小批次安全连写开始。',
      batchNeedsRepair || batchInProgress ? 'open_longform_governance' : 'start_safe_batch',
      [
        check('accepted_chapter', '单章样本', batchReady ? 'pass' : 'blocked', batchReady ? '已有可作为放大依据的验收章节。' : '需要先完成当前章交稿验收。'),
        check('batch_record', '批次证据', hasBatchEvidence ? 'pass' : 'warning', hasBatchEvidence ? `已有 ${batchHealth.successful} 个安全连写成功记录。` : '还没有可复盘的安全连写批次。'),
        check('batch_health', '批次健康', batchHealth.failed > 0 ? 'blocked' : batchInProgress ? 'warning' : 'pass', batchHealth.failed > 0 ? `有 ${batchHealth.failed} 个批次失败或含失败章节，需要先复盘。` : batchInProgress ? `有 ${batchHealth.active} 个批次仍在执行或等待。` : '没有未处理的失败批次。'),
        check('repair_queue', '修复队列', repairHealth.openTotal > 0 ? 'blocked' : 'pass', repairHealth.openTotal > 0 ? `还有 ${repairHealth.openTotal} 个长线修复项或修复 run 未关闭。` : '没有未关闭的长线修复任务。'),
      ],
      agentSteps(['chapter_group_queue', 'safe_batch_generation']),
    ),
    stage(
      'serial_governance',
      '长线治理',
      statusFor('serial_governance'),
      governanceTrendReady
        ? '批次数据、趋势复盘和修复队列已接入长期质量治理。'
        : hasBatchEvidence
          ? '已有批次数据，下一步用趋势复盘和修复队列管理长期质量。'
          : '批次稳定后再进入长线治理。',
      'open_longform_governance',
      [
        check('trend_review', '趋势复盘', governanceTrendReady ? 'pass' : 'warning', governanceTrendReady ? '已有长线诊断、压力测试、质量基准或修复审计记录。' : '已有批次数据，建议运行趋势复盘或长线诊断。'),
        check('repair_queue', '修复队列', repairHealth.openTotal > 0 ? 'blocked' : 'pass', repairHealth.openTotal > 0 ? `仍有 ${repairHealth.openTotal} 个修复项未关闭。` : '修复队列当前没有未关闭项。'),
        check('production_stability', '生产稳定性', batchHealth.failed > 0 ? 'blocked' : hasBatchEvidence ? 'pass' : 'warning', batchHealth.failed > 0 ? `有 ${batchHealth.failed} 个批次失败记录需要治理。` : hasBatchEvidence ? '已有干净批次可作为趋势样本。' : '需要先积累安全连写样本。'),
      ],
      agentSteps(['production_dashboard', 'longform_trends', 'repair_queue']),
    ),
  ]

  return {
    project_id: Number(project?.id || 0),
    current_stage: currentStage,
    primary_action: ACTIONS[primaryActionKey],
    summary: stages[currentIndex]?.summary || '小说流水线等待项目数据。',
    stages,
    updated_at: new Date().toISOString(),
  }
}
