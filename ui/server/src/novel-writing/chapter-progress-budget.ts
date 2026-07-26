/**
 * Chapter progress budget (oh-story aligned):
 * - underrun: current plan beats not delivered in prose
 * - overrun: next-chapter plan beats already settled in current prose
 * Used by generation hard rules + quality loop.
 */
import { anchorMatchScore } from './text-matching'
import {
  asArray,
  beatDelivered,
  compactText,
  isActionableBeat,
  proseCoversBeat,
  splitPlanBeats,
  uniqueTexts,
} from './chapter-progress-ledger-core'

export type ProgressBudgetBeat = {
  beat: string
  status: 'delivered' | 'missing' | 'overrun'
  score: number
  source: 'current_plan' | 'future_plan'
}

export type ChapterProgressBudgetReport = {
  version: 'chapter_progress_budget_v1'
  current_plan_beats: string[]
  future_plan_beats: string[]
  delivered_current: string[]
  missing_current: string[]
  overrun_future: string[]
  underrun: boolean
  overrun: boolean
  passed: boolean
  hard_rules: string[]
  findings: Array<{
    key: string
    label: string
    status: 'fail' | 'warn'
    severity: 'blocking' | 'high' | 'warn'
    evidence: string
    fix: string
  }>
  summary: string
}

function pickBeats(...parts: any[]) {
  const expanded: any[] = []
  for (const part of parts) {
    if (Array.isArray(part)) {
      for (const item of part) expanded.push(item)
      continue
    }
    expanded.push(part)
  }
  // Prefer atomic must-advance style beats over one fused clause.
  const atomic = expanded
    .flatMap((item: any) => {
      const text = compactText(item, 160)
      if (!text) return [] as string[]
      if (/[，,；;]/.test(text) && text.length > 18) {
        return text.split(/[，,；;]+/).map(chunk => compactText(chunk, 80)).filter(chunk => chunk.length >= 4)
      }
      return [text]
    })
    .filter(isActionableBeat)
  if (atomic.length) return uniqueTexts(atomic, 12)
  return splitPlanBeats(...expanded).filter(isActionableBeat).slice(0, 12)
}

function futurePlanBeatsFromChapters(chapters: any[] = [], currentNo = 0, horizon = 3) {
  const upcoming = asArray(chapters)
    .filter(item => {
      const no = Number(item?.chapter_no || item?.chapterNo || 0)
      return no > currentNo && no <= currentNo + horizon
    })
    .sort((a, b) => Number(a?.chapter_no || a?.chapterNo || 0) - Number(b?.chapter_no || b?.chapterNo || 0))

  const beats: string[] = []
  for (const chapter of upcoming) {
    const raw = chapter?.raw_payload || chapter?.rawPayload || {}
    beats.push(...pickBeats(
      chapter?.chapter_goal || chapter?.goal || raw.chapter_goal || raw.goal,
      chapter?.chapter_summary || chapter?.summary || raw.chapter_summary || raw.summary,
      chapter?.conflict || raw.conflict,
      chapter?.ending_hook || chapter?.endingHook || raw.ending_hook || raw.endingHook,
      raw.must_advance || raw.mustAdvance || chapter?.must_advance,
    ))
  }
  return uniqueTexts(beats, 16)
}

export function buildChapterProgressBudget(input: {
  chapterText?: any
  currentChapter?: any
  futureChapters?: any[]
  chapters?: any[]
  currentPlan?: {
    goal?: any
    summary?: any
    conflict?: any
    ending_hook?: any
    must_advance?: any
  }
  storyUnitRole?: any
} = {}): ChapterProgressBudgetReport {
  const chapterText = String(input.chapterText || '')
  const current = input.currentChapter || {}
  const currentNo = Number(current?.chapter_no || current?.chapterNo || 0)
  const raw = current?.raw_payload || current?.rawPayload || {}
  const plan = input.currentPlan || {}

  const current_plan_beats = uniqueTexts(pickBeats(
    plan.goal || current?.chapter_goal || current?.goal || raw.chapter_goal || raw.goal,
    plan.summary || current?.chapter_summary || current?.summary || raw.chapter_summary || raw.summary,
    plan.conflict || current?.conflict || raw.conflict,
    plan.ending_hook || current?.ending_hook || current?.endingHook || raw.ending_hook,
    plan.must_advance || raw.must_advance || raw.mustAdvance || current?.must_advance,
    input.storyUnitRole,
  ), 12)

  const future_plan_beats = uniqueTexts([
    ...futurePlanBeatsFromChapters(input.futureChapters || [], currentNo, 3),
    ...futurePlanBeatsFromChapters(input.chapters || [], currentNo, 3),
  ], 16).filter(beat => !current_plan_beats.some(cur => {
    const a = anchorMatchScore(beat, cur).score
    const b = anchorMatchScore(cur, beat).score
    return Math.max(a, b) >= 70
  }))

  const delivered_current: string[] = []
  const missing_current: string[] = []
  for (const beat of current_plan_beats) {
    const { delivered, score } = beatDelivered(beat, chapterText)
    if (delivered || proseCoversBeat(beat, chapterText)) delivered_current.push(beat)
    else if (chapterText && score < 40) missing_current.push(beat)
  }

  const overrun_future: string[] = []
  for (const beat of future_plan_beats) {
    const { delivered } = beatDelivered(beat, chapterText)
    if (delivered || proseCoversBeat(beat, chapterText)) {
      overrun_future.push(beat)
    }
  }

  // Require enough plan coverage when plan is actionable; allow empty plan (no false underrun).
  // Use 70% missing threshold so paraphrase-heavy prose does not false-positive underrun.
  const coverageRatio = current_plan_beats.length
    ? delivered_current.length / current_plan_beats.length
    : 1
  const underrun = current_plan_beats.length >= 2
    && chapterText.replace(/\s/g, '').length >= 800
    && coverageRatio < 0.34
    && missing_current.length >= Math.max(2, Math.ceil(current_plan_beats.length * 0.67))
  const overrun = overrun_future.length >= 1
    && chapterText.replace(/\s/g, '').length >= 600

  const findings: ChapterProgressBudgetReport['findings'] = []
  if (overrun) {
    findings.push({
      key: 'progress_overrun_future_outline',
      label: '章节进度超纲',
      status: 'fail',
      severity: 'blocking',
      evidence: overrun_future.slice(0, 4).join('；'),
      fix: '本章只兑现当前章纲/must_advance/剧情单元职责；把后续章结算点、终局冲突和未到窗口的线索压回钩子，不得提前写完。',
    })
  }
  if (underrun) {
    findings.push({
      key: 'progress_underrun_current_outline',
      label: '章节进度不足',
      status: 'fail',
      severity: 'high',
      evidence: missing_current.slice(0, 4).join('；'),
      fix: '按当前章纲补齐未交付 beat：目标建立、阻碍升级、选择代价、结果回收；不要用环境描写或心理总结代替情节推进。',
    })
  }

  const hard_rules = uniqueTexts([
    current_plan_beats.length
      ? `本章进度预算：只写当前章纲 beat（${current_plan_beats.slice(0, 4).join('｜')}），禁止透支后续章结算。`
      : '本章进度预算：只完成当前章目标与冲突，章末最多留下下一章钩子，不得提前结算后续大纲。',
    future_plan_beats.length
      ? `禁止提前兑现后续章纲：${future_plan_beats.slice(0, 4).join('｜')}`
      : '禁止把后续卷/后续章的高潮、身份揭晓、终局底牌提前写完。',
    '进度不足也不合格：必须把当前章 must_advance / 冲突 / 章末钩子写到可见动作与结果，而不是摘要带过。',
    '若正文已经超过当前大纲，优先压缩超纲结算，或触发章纲动态前移，而不是继续沿错误进度扩写。',
  ], 8)

  const passed = findings.length === 0
  const summary = passed
    ? (chapterText
      ? `进度预算通过：当前交付 ${delivered_current.length}/${current_plan_beats.length || 0}，未检测到后续章超纲。`
      : '进度预算就绪：写前已锁定当前章纲窗口。')
    : findings.map(item => item.label).join('；')

  return {
    version: 'chapter_progress_budget_v1',
    current_plan_beats,
    future_plan_beats,
    delivered_current: uniqueTexts(delivered_current, 12),
    missing_current: uniqueTexts(missing_current, 12),
    overrun_future: uniqueTexts(overrun_future, 12),
    underrun,
    overrun,
    passed,
    hard_rules,
    findings,
    summary,
  }
}

export function formatChapterProgressBudgetPrompt(report: ChapterProgressBudgetReport | null | undefined) {
  if (!report) return [] as string[]
  return [
    '【章节进度预算（硬约束）】',
    report.summary,
    ...report.hard_rules,
    report.current_plan_beats.length ? `当前必须交付：${report.current_plan_beats.slice(0, 6).join('｜')}` : '',
    report.future_plan_beats.length ? `后续章禁止提前结算：${report.future_plan_beats.slice(0, 6).join('｜')}` : '',
    '字数不够时扩写当前 beat 的动作过程/对话交锋/代价，不得靠跳到后续剧情凑篇幅；字数超了先删超纲结算和环境水文。',
  ].filter(Boolean)
}
