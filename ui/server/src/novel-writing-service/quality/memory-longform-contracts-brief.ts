import { OH_STORY_NEXT_BATCH_WORKFLOW_RULES } from './memory-longform-contracts-battle'
import { asArray, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { mergeEstablishedEvents, projectCanonFactsFromEvents } from '../../novel-writing/established-event-canon'
import { normalizeLongformCompass } from '../../novel-writing/longform-compass'
import { reviewTimestamp } from './review-lookup'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

import {
  normalizeNextBatchChapter,
  normalizeNextBatchChecklistItem,
  normalizeDefaultFiveChapterRegression,
  normalizeDefaultFiveChapterLaneTemplate
} from './memory-longform-contracts-battle'

export function normalizeExpansionStructureVerification(value: any) {
  const raw = value?.expansion_structure_verification || value?.expansionStructureVerification || value || {}
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const defaultFiveChapterRegression = normalizeDefaultFiveChapterRegression(
    raw.default_five_chapter_regression || raw.defaultFiveChapterRegression,
  )
  const defaultFiveChapterLaneTemplate = normalizeDefaultFiveChapterLaneTemplate(
    raw.default_five_chapter_lane_template || raw.defaultFiveChapterLaneTemplate,
  )
  const normalized = {
    source: compactBriefText(raw.source || 'safe_batch_expansion_structure_repair'),
    label: compactBriefText(raw.label || '扩批结构验证'),
    repeated_hotspot_segment: repeated ? {
      key: compactBriefText(repeated.key),
      label: compactBriefText(repeated.label),
      count: Number(repeated.count || 0),
    } : null,
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 5),
    fixed_segment_role: compactBriefText(raw.fixed_segment_role || raw.fixedSegmentRole),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    explicit_payoff: compactBriefText(raw.explicit_payoff || raw.explicitPayoff),
    ending_hook_requirement: compactBriefText(raw.ending_hook_requirement || raw.endingHookRequirement),
    structure_actions: asArray(raw.structure_actions || raw.structureActions)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 5),
    default_five_chapter_regression: defaultFiveChapterRegression,
    default_five_chapter_lane_template: defaultFiveChapterLaneTemplate,
  }
  const hasContent = normalized.validation_chapter_nos.length
    || normalized.fixed_segment_role
    || normalized.conflict_rotation
    || normalized.explicit_payoff
    || normalized.ending_hook_requirement
    || normalized.structure_actions.length
    || normalized.default_five_chapter_regression
    || normalized.default_five_chapter_lane_template
  return hasContent ? normalized : null
}

export function normalizeDefaultFiveChapterLaneRedesign(value: any) {
  const raw = value?.default_five_chapter_lane_redesign || value?.defaultFiveChapterLaneRedesign || value || {}
  const repeatedFailureReasons = asArray(raw.repeated_failure_reasons || raw.repeatedFailureReasons)
    .map((item: any) => compactBriefText(item?.reason || item?.label || item))
    .filter(Boolean)
    .slice(0, 8)
  const normalized = {
    reason: compactBriefText(raw.reason),
    label: compactBriefText(raw.label || '默认5章档位结构重构'),
    summary: compactBriefText(raw.summary),
    relapse_count: Number(raw.relapse_count ?? raw.relapseCount ?? 0),
    repeated_failure_reasons: repeatedFailureReasons,
    segment_duty_rewrite: compactBriefText(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: compactBriefText(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: compactBriefText(raw.ending_hook_template || raw.endingHookTemplate),
  }
  const hasContent = normalized.reason
    || normalized.summary
    || normalized.relapse_count > 0
    || normalized.repeated_failure_reasons.length
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
  return hasContent ? normalized : null
}

export function normalizeExpansionStructureDecision(value: any) {
  const raw = value?.expansion_structure_decision || value?.expansionStructureDecision || value || {}
  const observationMetrics = asArray(raw.observation_metrics || raw.observationMetrics)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
    .slice(0, 6)
  const defaultFiveChapterLaneRedesign = normalizeDefaultFiveChapterLaneRedesign(
    raw.default_five_chapter_lane_redesign || raw.defaultFiveChapterLaneRedesign,
  )
  const normalized = {
    visible: raw.visible !== false,
    label: compactBriefText(raw.label || '结构修复决策'),
    recommendation: compactBriefText(raw.recommendation),
    target_chapter_count: Number(raw.target_chapter_count ?? raw.targetChapterCount ?? 0),
    mode_label: compactBriefText(raw.mode_label || raw.modeLabel),
    summary: compactBriefText(raw.summary),
    instruction: compactBriefText(raw.instruction),
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    segment_key: compactBriefText(raw.segment_key || raw.segmentKey),
    segment_label: compactBriefText(raw.segment_label || raw.segmentLabel),
    observation_metrics: observationMetrics,
    default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign,
  }
  const hasContent = normalized.recommendation
    || normalized.mode_label
    || normalized.summary
    || normalized.instruction
    || normalized.observation_metrics.length
    || normalized.default_five_chapter_lane_redesign
  return hasContent ? normalized : null
}

export function normalizeNextBatchBrief(value: any, targetChapterNo = 0) {
  const raw = value?.next_batch_brief || value?.nextBatchBrief || value || {}
  const chapters = asArray(raw.chapters).map(normalizeNextBatchChapter).filter(Boolean).slice(0, 10)
  const startChecklist = asArray(raw.start_checklist || raw.startChecklist || raw.start_checklist_items || raw.startChecklistItems)
    .map(normalizeNextBatchChecklistItem)
    .filter(Boolean)
    .slice(0, 8)
  const currentChapter = chapters.find((item: any) => Number(item.chapter_no) === Number(targetChapterNo)) || null
  const currentChapterRole = compactBriefText(
    raw.current_chapter_role || raw.currentChapterRole || currentChapter?.chapter_task || currentChapter?.conflict || currentChapter?.mainline_progress,
  )
  const expansionStructureVerification = normalizeExpansionStructureVerification(
    raw.expansion_structure_verification || raw.expansionStructureVerification,
  )
  const expansionStructureDecision = normalizeExpansionStructureDecision(
    raw.expansion_structure_decision || raw.expansionStructureDecision,
  )
  const normalized = {
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel),
    batch_goal: compactBriefText(raw.batch_goal || raw.batchGoal),
    reader_payoff_plan: compactBriefText(raw.reader_payoff_plan || raw.readerPayoffPlan),
    mainline_focus: compactBriefText(raw.mainline_focus || raw.mainlineFocus),
    forbidden_boundary: compactBriefText(raw.forbidden_boundary || raw.forbiddenBoundary),
    current_chapter_role: currentChapterRole,
    workflow_rules: uniqueBriefStrings([
      ...asArray(raw.workflow_rules || raw.workflowRules || raw.batch_workflow_rules || raw.batchWorkflowRules).map((item: any) => compactBriefText(item)).filter(Boolean),
      ...OH_STORY_NEXT_BATCH_WORKFLOW_RULES,
    ], 20),
    expansion_structure_verification: expansionStructureVerification,
    expansion_structure_decision: expansionStructureDecision,
    start_checklist: startChecklist,
    chapters,
  }
  const hasContent = normalized.chapter_range_label
    || normalized.batch_goal
    || normalized.reader_payoff_plan
    || normalized.mainline_focus
    || normalized.forbidden_boundary
    || normalized.current_chapter_role
    || normalized.expansion_structure_verification
    || normalized.expansion_structure_decision
    || normalized.start_checklist.length
    || normalized.chapters.length
  return hasContent ? normalized : null
}

export function nextBatchBriefFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.next_batch_brief
    || target.nextBatchBrief
    || brief.next_batch_brief
    || brief.nextBatchBrief
    || contextPackage?.next_batch_brief
    || contextPackage?.nextBatchBrief
    || chapter?.raw_payload?.next_batch_brief
    || chapter?.raw_payload?.nextBatchBrief
    || null
}

export function normalizeStoryUnitContext(value: any, targetChapterNo = 0) {
  const raw = value?.story_unit_context || value?.storyUnitContext || value || {}
  const textList = (...values: any[]) => Array.from(new Set(values
    .flatMap(item => Array.isArray(item) ? item : [item])
    .map(item => compactBriefText(item))
    .filter(Boolean)))
  const currentChapter = asArray(raw.chapters)
    .find((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) === Number(targetChapterNo)) || null
  const normalized = {
    title: compactBriefText(raw.title || raw.unit_title || raw.unitTitle || raw.story_unit_title || raw.storyUnitTitle),
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel),
    current_chapter_role: compactBriefText(raw.current_chapter_role || raw.currentChapterRole || raw.chapter_role || raw.chapterRole || currentChapter?.role || currentChapter?.chapter_role),
    unit_goal: compactBriefText(raw.unit_goal || raw.unitGoal || raw.goal || raw.summary),
    entry_hook: compactBriefText(raw.entry_hook || raw.entryHook || raw.opening_hook || raw.openingHook),
    pressure_escalation: textList(raw.pressure_escalation, raw.pressureEscalation, raw.escalation, raw.escalations),
    mini_climax_payoff: compactBriefText(raw.mini_climax_payoff || raw.miniClimaxPayoff || raw.payoff || raw.climax || raw.mini_climax),
    setup_and_storyline: textList(raw.setup_and_storyline, raw.setupAndStoryline, raw.foreshadowing, raw.storyline, raw.storylines),
    exit_hook: compactBriefText(raw.exit_hook || raw.exitHook || raw.ending_hook || raw.endingHook),
    forbidden_advance: textList(raw.forbidden_advance, raw.forbiddenAdvance, raw.forbidden, raw.do_not_advance, raw.doNotAdvance),
  }
  const hasContent = Object.values(normalized).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))
  return hasContent ? normalized : null
}

export function storyUnitRoleForChapter(chapter: any, position: number, total: number) {
  const payload = chapter?.raw_payload || {}
  const explicit = compactBriefText(
    payload.story_unit_role || payload.storyUnitRole || payload.unit_role || payload.unitRole || payload.episode_role || payload.episodeRole,
  )
  if (explicit) return explicit
  const haystack = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.conflict,
    chapter?.ending_hook,
  ].filter(Boolean).join(' '))
  if (/高潮|回报|兑现|反杀|打脸|收束/.test(haystack)) return '小高潮/回报'
  if (position === 0) return '入口钩子'
  if (position === total - 1 && total > 1) return '出单元钩子'
  return '压力升级/推进'
}

export function buildStoryUnitContext(chapter: any, chapters: any[] = [], outlines: any[] = []) {
  const targetNo = Number(chapter?.chapter_no || 0)
  const explicit = normalizeStoryUnitContext(
    chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    targetNo,
  )
  if (explicit) return explicit
  if (!targetNo) return null

  const raw = chapter?.raw_payload || {}
  const startNo = Number(raw.story_unit_start_chapter || raw.storyUnitStartChapter || raw.unit_start_chapter || raw.unitStartChapter || targetNo) || targetNo
  const endNo = Number(raw.story_unit_end_chapter || raw.storyUnitEndChapter || raw.unit_end_chapter || raw.unitEndChapter || startNo + 5) || startNo + 5
  const sorted = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) >= startNo && Number(item?.chapter_no || 0) <= endNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const unitChapters = sorted.length ? sorted : [chapter]
  const currentIndex = Math.max(0, unitChapters.findIndex((item: any) => Number(item?.chapter_no || 0) === targetNo))
  const first = unitChapters[0] || chapter
  const last = unitChapters[unitChapters.length - 1] || chapter
  const outlineHint = asArray(outlines)
    .find((item: any) => /单元|事件|阶段|篇|卷/.test(compactBriefText(item?.outline_type || item?.title || item?.summary))) || null
  const title = compactBriefText(
    raw.story_unit_title || raw.storyUnitTitle || raw.unit_title || raw.unitTitle || outlineHint?.title,
    `第${startNo}-${Number(last?.chapter_no || endNo)}章剧情单元`,
  )
  const pressureEscalation = unitChapters
    .slice(Math.max(0, currentIndex), Math.min(unitChapters.length, currentIndex + 4))
    .map((item: any) => compactBriefText(item?.conflict || item?.chapter_summary || item?.ending_hook || item?.title))
    .filter(Boolean)
  const climaxChapter = unitChapters.find((item: any) => /高潮|回报|兑现|反杀|打脸|收束/.test(compactBriefText([
    item?.title,
    item?.chapter_summary,
    item?.conflict,
    item?.ending_hook,
  ].filter(Boolean).join(' ')))) || unitChapters[Math.min(unitChapters.length - 1, Math.max(0, Math.floor(unitChapters.length * 0.65)))]
  const setupAndStoryline = Array.from(new Set([
    ...asArray(raw.foreshadowing_task),
    ...asArray(raw.foreshadowingTask),
    ...asArray(raw.storyline_task),
    ...asArray(raw.storylineTask),
    compactBriefText(chapter?.conflict),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 6)

  return normalizeStoryUnitContext({
    title,
    chapter_range_label: `第${startNo}-${Number(last?.chapter_no || endNo)}章`,
    current_chapter_role: storyUnitRoleForChapter(chapter, currentIndex, unitChapters.length),
    unit_goal: compactBriefText(raw.story_unit_goal || raw.storyUnitGoal || outlineHint?.summary || `完成${title}的入口、升级、回报和出单元钩子。`),
    entry_hook: compactBriefText(first?.chapter_summary || first?.ending_hook || first?.title),
    pressure_escalation: pressureEscalation,
    mini_climax_payoff: compactBriefText(climaxChapter?.ending_hook || climaxChapter?.chapter_summary || climaxChapter?.conflict || climaxChapter?.title),
    setup_and_storyline: setupAndStoryline,
    exit_hook: compactBriefText(last?.ending_hook || last?.chapter_summary || last?.title),
    forbidden_advance: [
      ...asArray(raw.forbidden_repeats),
      ...asArray(raw.forbidden_advance),
      ...asArray(raw.forbiddenAdvance),
    ],
  }, targetNo)
}

export function first30SegmentKeyForChapter(chapterNo: number) {
  if (chapterNo >= 1 && chapterNo <= 3) return '1-3'
  if (chapterNo >= 4 && chapterNo <= 10) return '4-10'
  if (chapterNo >= 11 && chapterNo <= 30) return '11-30'
  return ''
}

export function first30RetentionRiskLevel(score: number, flags: string[]) {
  if (score > 0 && score < 65) return 'high'
  if (flags.some(flag => /缺正文|章末钩子弱|爽点|悬念/.test(flag))) return 'high'
  if (score > 0 && score < 80) return 'medium'
  if (flags.length > 0) return 'medium'
  return 'ok'
}

export function first30FlagAction(flag: string) {
  if (/目标不清/.test(flag)) return '补明确章节目标和主角选择。'
  if (/章末钩子弱/.test(flag)) return '重做章末未解决问题、威胁升级或利益诱惑。'
  if (/爽点|悬念/.test(flag)) return '增加一个可感知收益、信息揭示、关系反转或风险升级。'
  if (/缺正文/.test(flag)) return '先完成正文初稿，再重新运行前30章留存诊断。'
  if (/重复/.test(flag)) return '减少重复表达，用新的选择、阻碍或信息增量替换水文。'
  return ''
}

export function buildFirst30RetentionContext(chapterTarget: any, reviews: any[] = []) {
  const chapterNo = Number(chapterTarget?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = asArray(reviews)
    .filter((item: any) => String(item?.review_type || '') === 'first30_retention_diagnosis')
    .sort((a: any, b: any) => reviewTimestamp(b) - reviewTimestamp(a))[0]
  if (!review) return null
  const payload = parseJsonLikePayload(review.payload) || {}
  const report = payload.report || payload.result?.report || payload
  if (!report || typeof report !== 'object') return null
  const segmentKey = first30SegmentKeyForChapter(chapterNo)
  const chapterId = Number(chapterTarget?.id || 0)
  const chapterCard = asArray(report.chapter_cards).find((row: any) => {
    const rowNo = Number(row?.chapter_no || 0)
    const rowId = Number(row?.chapter_id || 0)
    return rowNo === chapterNo || (chapterId > 0 && rowId === chapterId)
  }) || null
  const segment = asArray(report.segments).find((item: any) => String(item?.key || '') === segmentKey) || null
  const flags = asArray(chapterCard?.flags).map((item: any) => compactBriefText(item)).filter(Boolean)
  const segmentRisks = asArray(report.risks)
    .filter((risk: any) => {
      const riskSegment = String(risk?.segment || '')
      return riskSegment === segmentKey || (!riskSegment && String(risk?.severity || '') === 'high')
    })
    .map((risk: any) => ({
      severity: compactBriefText(risk?.severity),
      issue: compactBriefText(risk?.issue),
      action: compactBriefText(risk?.action),
    }))
    .filter((risk: any) => risk.issue || risk.action)
  const score = Number(chapterCard?.score || 0)
  const riskLevel = first30RetentionRiskLevel(score, flags)
  const requiredActions = Array.from(new Set([
    ...segmentRisks.map((risk: any) => risk.action),
    ...flags.map(first30FlagAction),
  ].map((item: any) => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  if (!chapterCard && !segmentRisks.length) return null
  if (riskLevel === 'ok' && !segmentRisks.length) return null
  return {
    report_score: Number(report.score || 0) || null,
    report_status: compactBriefText(report.status),
    report_summary: compactBriefText(report.summary),
    report_created_at: compactBriefText(review.created_at || report.created_at),
    promise_ready: Boolean(report.positioning?.promise_ready),
    reader_promise: compactBriefText(report.positioning?.reader_promise),
    chapter_no: chapterNo,
    chapter_score: score || null,
    chapter_title: compactBriefText(chapterCard?.title || chapterTarget?.title),
    segment_key: segmentKey,
    segment_label: compactBriefText(segment?.label || segmentKey),
    segment_score: Number(segment?.score || 0) || null,
    flags,
    risks: segmentRisks,
    risk_level: segmentRisks.some((risk: any) => risk.severity === 'high') ? 'high' : riskLevel,
    repair_focus: compactBriefText([
      chapterCard ? `第${chapterNo}章留存分 ${score || '-'}` : '',
      flags.length ? `风险：${flags.join('、')}` : '',
      segmentRisks[0]?.issue || '',
    ].filter(Boolean).join('；')),
    required_actions: requiredActions,
  }
}

