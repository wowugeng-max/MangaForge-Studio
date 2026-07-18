import type { AnyRecord } from './utils'
import {
  arrayValue,
  firstText,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  summarizeEvidenceItem,
} from './quality-contract'

export function batchBriefFromRun(run?: AnyRecord | null) {
  const input = parseJsonValue(run?.input_ref) || {}
  const output = parseJsonValue(run?.output_ref) || {}
  return input.next_batch_brief || input.nextBatchBrief || output.next_batch_brief || output.nextBatchBrief || null
}

export function normalizeChapterPlan(value: any) {
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

export function normalizeBatchPlanContext(task: AnyRecord, run?: AnyRecord | null) {
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

export function normalizeRecoveryEvidenceReview(task: AnyRecord) {
  const review = objectValue(task.recovery_evidence_review || task.recoveryEvidenceReview)
  const failedItems = arrayValue(review.failed_items || review.failedItems)
    .map(item => {
      const value = objectValue(item)
      return {
        evidence: firstText(value.evidence, value.text, value.label, value.summary, summarizeEvidenceItem(item)),
        riskLabels: arrayValue(value.risk_labels || value.riskLabels)
          .map(label => text(label))
          .filter(Boolean),
      }
    })
    .filter(item => item.evidence)
  const failedEvidence = arrayValue(review.failed_evidence || review.failedEvidence)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const rows = failedItems.length > 0
    ? failedItems
    : failedEvidence.map(item => ({ evidence: item, riskLabels: [] }))
  const allEvidence = arrayValue(review.evidence)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const watchItems = arrayValue(review.watch_items || review.watchItems)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const summary = firstText(review.summary, task.issue_type === 'recovery_evidence_mismatch' ? task.message : '')
  if (!rows.length && !summary && !allEvidence.length && !watchItems.length && task.issue_type !== 'recovery_evidence_mismatch') return null
  return {
    status: firstText(review.status),
    summary,
    rows,
    allEvidence,
    watchItems,
  }
}

export function normalizeExpansionStructureValidationTrend(task: AnyRecord, review: AnyRecord) {
  const trend = objectValue(
    review.expansion_structure_validation_trend
    || review.expansionStructureValidationTrend
    || task.expansion_structure_validation_trend
    || task.expansionStructureValidationTrend,
  )
  if (!Object.keys(trend).length || trend.visible === false) return null
  const validationBatchCount = Number(trend.validation_batch_count ?? trend.validationBatchCount ?? 0)
  const passedBatchCount = Number(trend.passed_batch_count ?? trend.passedBatchCount ?? 0)
  const failedBatchCount = Number(trend.failed_batch_count ?? trend.failedBatchCount ?? 0)
  const latestChapterNos = arrayValue(trend.latest_chapter_nos || trend.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const failureReasons = arrayValue(trend.failure_reasons || trend.failureReasons)
    .map(item => objectValue(item))
    .map(item => ({
      label: firstText(item.label, item.key),
      count: Number(item.count || 0),
    }))
    .filter(item => item.label && item.count > 0)
  const recurrence = objectValue(trend.recurrence_after_restore || trend.recurrenceAfterRestore)
  const recurrenceChapterNos = arrayValue(recurrence.recurrence_chapter_nos || recurrence.recurrenceChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)

  return {
    status: firstText(trend.status),
    label: firstText(trend.label, '扩批结构验证趋势'),
    summary: firstText(trend.summary),
    segmentLabel: firstText(trend.segment_label, trend.segmentLabel, '复发段位'),
    passRate: Number(trend.pass_rate ?? trend.passRate ?? 0),
    validationBatchCount,
    passedBatchCount,
    failedBatchCount,
    latestStatus: firstText(trend.latest_status, trend.latestStatus),
    latestChapterNos,
    failureReasons,
    recurrence: {
      visible: Boolean(recurrence.visible),
      intervalBatchCount: Number(recurrence.interval_batch_count ?? recurrence.intervalBatchCount ?? 0),
      intervalLabel: firstText(recurrence.interval_label, recurrence.intervalLabel),
      recurrenceChapterNos,
    },
  }
}

export function compactChapterNosForPrompt(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  return `第${chapterNos.slice(0, 6).join('、')}章${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

export function defaultLaneTemplateRepairActionForPrompt(requirement: AnyRecord) {
  const key = firstText(requirement.key)
  const label = firstText(requirement.label, requirement.key, '模板缺项')
  const chapterText = compactChapterNosForPrompt(arrayValue(requirement.chapter_nos || requirement.chapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0))
  if (key === 'default_lane_segment_duty') return `段位职责修复：${chapterText}必须明确本章在默认5章档位里的段位职责，不能只写单章事件。`
  if (key === 'default_lane_conflict_rotation') return `冲突轮换修复：${chapterText}必须更换冲突来源，写清规则压迫、人物对抗或信息误导的轮换位置。`
  if (key === 'default_lane_payoff_density') return `回报密度修复：${chapterText}必须补出显性回报，让读者看到收益、反制结果或阶段结算。`
  if (key === 'default_lane_ending_hook_template') return `章末追读模板修复：${chapterText}最后300字必须落触发事件、读者问题和下一章风险。`
  return `${label}修复：${chapterText}必须补成正文可见模板回执。`
}

export function defaultLaneTemplateRedesignInstructionForPrompt(requirement: AnyRecord) {
  const key = firstText(requirement.key)
  if (key === 'default_lane_segment_duty') return '重写每章在5章档位中的前段/中段/后段职责。'
  if (key === 'default_lane_conflict_rotation') return '重写规则压迫、人物对抗、信息误导的轮换顺序。'
  if (key === 'default_lane_payoff_density') return '重写每章显性回报预算，避免连续铺垫。'
  if (key === 'default_lane_ending_hook_template') return '重写最后300字触发事件、读者问题和下一章风险。'
  return '重写该模板项，并给下一轮验证批设置逐章可回填标准。'
}

export function normalizeDefaultLaneTemplateProductionFailedRequirements(source: AnyRecord, fallback: AnyRecord | null = null) {
  return arrayValue(
    source.production_failed_requirements
    || source.productionFailedRequirements
    || fallback?.failed_requirements
    || fallback?.failedRequirements,
  )
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.name, item.key, '模板要求'),
      failureReason: firstText(item.failure_reason, item.failureReason),
      chapterNos: arrayValue(item.chapter_nos || item.chapterNos)
        .map(chapterNo => Number(chapterNo))
        .filter(chapterNo => chapterNo > 0),
    }))
    .filter(item => item.key || item.label || item.failureReason || item.chapterNos.length)
}

export function normalizeDefaultLaneTemplateProductionRelapseVerdict(source: AnyRecord) {
  const verdict = objectValue(source.production_relapse_verdict || source.productionRelapseVerdict)
  if (!Object.keys(verdict).length || verdict.visible === false) return null
  return {
    status: firstText(verdict.status),
    label: firstText(verdict.label, '默认档位模板生产后验判定'),
    templateVersionId: firstText(verdict.template_version_id, verdict.templateVersionId),
    defaultBatchChapterNos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restoreChapterNos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    previousValidationChapterNos: arrayValue(verdict.previous_validation_chapter_nos || verdict.previousValidationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validationChapterNos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    failureReasons: arrayValue(verdict.failure_reasons || verdict.failureReasons).map(item => text(item)).filter(Boolean),
    clearedFailureReasons: arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons).map(item => text(item)).filter(Boolean),
    remainingFailureReasons: arrayValue(verdict.remaining_failure_reasons || verdict.remainingFailureReasons).map(item => text(item)).filter(Boolean),
    failedCount: Number(verdict.failed_count ?? verdict.failedCount ?? 0),
    failedRequirements: normalizeDefaultLaneTemplateProductionFailedRequirements({}, verdict),
    summary: firstText(verdict.summary),
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRepair(review: AnyRecord) {
  const explicit = objectValue(
    review.default_five_chapter_lane_template_repair
    || review.defaultFiveChapterLaneTemplateRepair,
  )
  const validationResult = objectValue(review.validation_result || review.validationResult)
  const verdict = objectValue(
    validationResult.default_five_chapter_lane_template_verdict
    || validationResult.defaultFiveChapterLaneTemplateVerdict,
  )
  const source = Object.keys(explicit).length ? explicit : verdict
  if (!Object.keys(source).length || source.visible === false) return null
  const missingRequirements = arrayValue(source.missing_requirements || source.missingRequirements)
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.name, item.key, '模板缺项'),
      chapterNos: arrayValue(item.chapter_nos || item.chapterNos)
        .map(chapterNo => Number(chapterNo))
        .filter(chapterNo => chapterNo > 0),
    }))
    .filter(item => item.key || item.label || item.chapterNos.length)
  const productionRelapseVerdict = normalizeDefaultLaneTemplateProductionRelapseVerdict(source)
  const productionFailedRequirements = normalizeDefaultLaneTemplateProductionFailedRequirements(source, productionRelapseVerdict as any)
  if (!missingRequirements.length && !productionFailedRequirements.length && productionRelapseVerdict?.status !== 'failed') return null
  const repairActions = arrayValue(source.repair_actions || source.repairActions)
    .map(item => text(item))
    .filter(Boolean)
  const missingText = firstText(source.repair_summary, source.repairSummary)
    || missingRequirements.map(item => `${compactChapterNosForPrompt(item.chapterNos)}缺${item.label}`).join('；')
  return {
    label: firstText(source.label, verdict.label, '默认档位模板验证缺项'),
    summary: firstText(source.summary, verdict.summary),
    validationChapterNos: arrayValue(source.validation_chapter_nos || source.validationChapterNos || verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    missingCount: Number(source.missing_count ?? source.missingCount ?? verdict.missing_count ?? verdict.missingCount ?? missingRequirements.length),
    missingRequirements,
    missingText,
    repairActions: repairActions.length
      ? repairActions
      : missingRequirements.map(defaultLaneTemplateRepairActionForPrompt),
    productionRelapseVerdict,
    productionFailedCount: Number(source.production_failed_count ?? source.productionFailedCount ?? productionRelapseVerdict?.failedCount ?? productionFailedRequirements.length),
    productionFailedRequirements,
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRedesignQueue(review: AnyRecord) {
  const source = objectValue(
    review.default_five_chapter_lane_template_redesign_queue
    || review.defaultFiveChapterLaneTemplateRedesignQueue,
  )
  if (!Object.keys(source).length || source.visible === false) return null
  const topSource = objectValue(source.top_failed_requirement || source.topFailedRequirement)
  const topFailedRequirement = Object.keys(topSource).length ? {
    key: firstText(topSource.key),
    label: firstText(topSource.label, topSource.key, '模板缺项'),
    failedCount: Number(topSource.failed_count ?? topSource.failedCount ?? 0),
  } : null
  const redesignRequirements = arrayValue(source.redesign_requirements || source.redesignRequirements)
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.key, '模板项'),
      instruction: firstText(item.instruction, item.action, item.description, defaultLaneTemplateRedesignInstructionForPrompt(item)),
    }))
    .filter(item => item.key || item.label || item.instruction)
  const validationStandard = arrayValue(source.validation_standard || source.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  return {
    label: firstText(source.label, '默认档位模板重构队列'),
    summary: firstText(source.summary),
    status: firstText(source.status),
    source: firstText(source.source),
    recommendation: firstText(source.recommendation),
    latestChapterNos: arrayValue(source.latest_chapter_nos || source.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validationBatchCount: Number(source.validation_batch_count ?? source.validationBatchCount ?? 0),
    failedBatchCount: Number(source.failed_batch_count ?? source.failedBatchCount ?? 0),
    topFailedRequirement,
    redesignRequirements,
    validationStandard,
  }
}

