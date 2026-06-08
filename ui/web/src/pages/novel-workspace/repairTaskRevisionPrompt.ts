type AnyRecord = Record<string, any>

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
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

function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function batchBriefFromRun(run?: AnyRecord | null) {
  const input = parseJsonValue(run?.input_ref) || {}
  const output = parseJsonValue(run?.output_ref) || {}
  return input.next_batch_brief || input.nextBatchBrief || output.next_batch_brief || output.nextBatchBrief || null
}

function normalizeChapterPlan(value: any) {
  if (!value) return null
  return {
    chapter_no: Number(value.chapter_no ?? value.chapterNo ?? 0) || null,
    title: firstText(value.title),
    chapter_task: firstText(value.chapter_task, value.chapterTask, value.task),
    conflict: firstText(value.conflict),
    ending_hook: firstText(value.ending_hook, value.endingHook),
    mainline_progress: firstText(value.mainline_progress, value.mainlineProgress),
  }
}

function normalizeBatchPlanContext(task: AnyRecord, run?: AnyRecord | null) {
  const embedded = task.batch_plan_context || task.batchPlanContext || null
  const batchBrief = embedded || batchBriefFromRun(run) || null
  if (!batchBrief) return null
  const chapterNo = Number(task.chapter_no ?? task.chapterNo ?? 0)
  const embeddedChapterPlan = embedded?.chapter_plan || embedded?.chapterPlan || null
  const briefChapterPlan = arrayValue(batchBrief.chapters)
    .find(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0) === chapterNo)
  return {
    batch_goal: firstText(batchBrief.batch_goal, batchBrief.batchGoal),
    reader_payoff_plan: firstText(batchBrief.reader_payoff_plan, batchBrief.readerPayoffPlan),
    mainline_focus: firstText(batchBrief.mainline_focus, batchBrief.mainlineFocus),
    forbidden_boundary: firstText(batchBrief.forbidden_boundary, batchBrief.forbiddenBoundary),
    chapter_plan: normalizeChapterPlan(embeddedChapterPlan || briefChapterPlan),
  }
}

export function buildRepairTaskRevisionPrompt(task: AnyRecord, run?: AnyRecord | null) {
  const batchPlan = normalizeBatchPlanContext(task, run)
  const chapterPlan = batchPlan?.chapter_plan
  const lines = [
    '本次修订来自任务中心的商业留存/质检修复任务。',
    task.segment ? `分段：${task.segment}` : '',
    task.issue_type ? `问题类型：${task.issue_type}` : '',
    task.message ? `问题：${task.message}` : '',
    task.action ? `修复动作：${task.action}` : '',
    Array.isArray(task.acceptance_criteria) ? `验收标准：${task.acceptance_criteria.join('；')}` : '',
  ]
  if (batchPlan) {
    lines.push(
      '【批次任务书兑现】',
      batchPlan.batch_goal ? `本批目标：${batchPlan.batch_goal}` : '',
      batchPlan.reader_payoff_plan ? `读者回报：${batchPlan.reader_payoff_plan}` : '',
      batchPlan.mainline_focus ? `主线焦点：${batchPlan.mainline_focus}` : '',
      batchPlan.forbidden_boundary ? `禁抢跑边界：${batchPlan.forbidden_boundary}` : '',
      chapterPlan?.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
      chapterPlan?.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
      chapterPlan?.mainline_progress ? `本章主线进度：${chapterPlan.mainline_progress}` : '',
      chapterPlan?.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
      '修订要求：只补齐本章漏兑现内容，不新增长期方向，不提前揭示禁抢跑边界。',
    )
  }
  return lines.filter(Boolean).join('\n')
}
