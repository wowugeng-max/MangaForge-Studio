import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationSerialStageKey,
  AutoCreationSerialWorkflowStage,
  AutoCreationDirectorCreationPipelineStage,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompassAxis,
  AutoCreationLongformCompass,
  AutoCreationManualTestGate,
  AutoCreationManualTestReadiness,
  AutoCreationBatchGuardrailSignal,
  AutoCreationRecoveryEvidenceTrendSource,
  AutoCreationStrengthenedRepairAcceptanceTrend,
  AutoCreationRecoveryEvidenceTrend,
  AutoCreationBatchReleaseChapter,
  AutoCreationBatchReleaseWindow,
  AutoCreationBatchPreflight,
  AutoCreationBatchBriefRepair,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationLongformCapacitySignal,
  AutoCreationLongformFuelItem,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchSignal,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewItem,
  AutoCreationBatchRiskSignal,
  AutoCreationBatchChecklistExecutionItem,
  AutoCreationBatchChecklistExecution,
  AutoCreationBatchRiskRadar,
  AutoCreationBatchCompletionMetric,
  AutoCreationBatchCompletionDashboard,
  AutoCreationBatchHandoff,
  AutoCreationBatchReviewQueue,
  AutoCreationDeliveryRiskGateCategory,
  AutoCreationDeliveryRiskResolution,
  AutoCreationDeliveryRiskGate,
  AutoCreationStorylineDecisionGate,
  AutoCreationGovernanceClosureBrief,
  AutoCreationWritingQueueFocus,
  AutoCreationDailyBattleStep,
  AutoCreationDailyBattlePlan,
  AutoCreationProductionLicense,
  AutoCreationTodayCommandFlowItem,
  AutoCreationTodayQualityGate,
  AutoCreationGovernanceRecheckMemoryStatus,
  AutoCreationGovernanceRecheckMemory,
  AutoCreationReleaseRationale,
  AutoCreationTodayCommandDeck,
  AutoCreationSerialCockpitStatus,
  AutoCreationChapterChainStatus,
  AutoCreationSerialGuardrail,
  AutoCreationChapterChainStep,
  AutoCreationRiskQueueItem,
  AutoCreationSerialCockpit,
  AutoCreationMillionWordRunwayGate,
  AutoCreationMillionWordRunwayQuestion,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'
import {
  PLANNING_ACTION_LABELS,
  arrayValue,
  firstText,
  normalizePlanningActionKey,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  parsePayload,
  recordTime,
  hasDeliveredProse,
  latestReviewForChapter,
  findChapter,
  numberValue,
  recoveryEvidenceEventTime,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  batchRiskLabels,
  signal,
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  compactChapterNoEvidence,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  boolValue,
  reviewPayload,
  coreRiskCount,
  payoffDebtCount,
  expectationRiskCount,
  retentionRiskCount,
  recoveryEvidenceReview,
  finiteNumberOrNull,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  isResolvedTaskStatus,
  isCompletedRepairRun,
  batchRiskIssueResolved,
  recoveryEvidenceReleaseSummaryFromPreflight,
  emptyStrengthenedRepairAcceptanceTrend,
} from './helpers-main'

import {
  chapterExpansionStructureDecisionReceipts,
  expansionStructureDecisionRequirementDelivered,
} from './helpers-safe-batch-recovery-decision'

export function safeBatchDefaultRecoveryRiskCountForReason(reason: string, counts: {
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const reasonText = text(reason)
  if (reasonText.includes('核心')) return counts.coreRiskCount
  if (reasonText.includes('回报')) return counts.payoffDebtCount
  if (reasonText.includes('追读') || reasonText.includes('拉力')) return counts.readerPullRiskCount
  return counts.riskCount
}

export function normalizeDefaultFiveChapterLaneTemplateVersion(template: AnyRecord | null | undefined) {
  if (!template || template.visible === false) return null
  const redesignedTemplates = arrayValue(template.redesigned_templates || template.redesignedTemplates)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
  const validationStandard = arrayValue(template.validation_standard || template.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  const requiredReceipts = arrayValue(template.required_receipts || template.requiredReceipts || template.receipts)
    .map(item => text(item))
    .filter(Boolean)
  const productionRelapseReview = template.production_relapse_review || template.productionRelapseReview || null
  const explicitId = firstText(
    template.template_version_id,
    template.templateVersionId,
    template.version_id,
    template.versionId,
    template.id,
    productionRelapseReview?.template_version_id,
    productionRelapseReview?.templateVersionId,
  )
  const source = firstText(template.source, 'default_five_chapter_lane_template')
  const sourceRunId = template.source_run_id ?? template.sourceRunId ?? null
  const id = explicitId || (sourceRunId !== null && sourceRunId !== undefined && text(sourceRunId) ? `${source}:${sourceRunId}` : '')
  const redesignSource = firstText(template.redesign_source, template.redesignSource)
  const hasVersionEvidence = Boolean(
    id
    || redesignSource
    || redesignedTemplates.length
    || validationStandard.length
    || requiredReceipts.length,
  )
  if (!hasVersionEvidence) return null
  return {
    id: id || source,
    label: text(template.label, '默认5章档位模板'),
    source,
    redesign_source: redesignSource,
    source_run_id: sourceRunId,
    repaired_at: text(template.repaired_at || template.repairedAt),
    summary: text(template.summary),
    redesigned_templates: redesignedTemplates,
    validation_standard: validationStandard,
    required_receipts: requiredReceipts,
  }
}

export function buildDefaultFiveChapterRecoveryVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const regression = args.verification?.default_five_chapter_regression
    || args.verification?.defaultFiveChapterRegression
    || null
  if (!regression || regression.visible === false) return null
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  if (!failureReasons.length) return null
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const previousValidationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const summary = status === 'passed'
    ? `默认档位恢复判定：${clearedFailureReasons.join('、')}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为默认5章档位恢复证据。`
    : `默认档位恢复判定：${remainingFailureReasons.join('、')}仍未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能恢复默认5章档位。`

  return {
    visible: true,
    status,
    label: '默认档位恢复判定',
    summary,
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    previous_validation_chapter_nos: previousValidationChapterNos,
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

export function buildDefaultFiveChapterLaneTemplateVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  chapters: AnyRecord[]
  riskCount?: number
  coreRiskCount?: number
  payoffDebtCount?: number
  readerPullRiskCount?: number
}) {
  const template = args.verification?.default_five_chapter_lane_template
    || args.verification?.defaultFiveChapterLaneTemplate
    || null
  if (!template || template.visible === false) return null
  const templateVersion = normalizeDefaultFiveChapterLaneTemplateVersion(template)
  const templateRequirements = arrayValue(template.requirements)
  const labelForKey = (key: string, fallback: string) => text(
    templateRequirements.find((item: AnyRecord) => text(item?.key) === key)?.label,
    fallback,
  )
  const requirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
    key: requirement.key,
    label: labelForKey(requirement.key, requirement.label),
  }))
  const missingRequirements = requirements
    .map(requirement => {
      const missingChapterNos = args.validationChapterNos.filter(chapterNo => {
        const chapter = findChapter(args.chapters, { chapterNo })
        const receipts = chapterExpansionStructureDecisionReceipts(chapter)
        return expansionStructureDecisionRequirementDelivered({
          key: requirement.key,
          payload: {},
          receipts,
        }) !== true
      })
      return missingChapterNos.length
        ? {
          ...requirement,
          chapter_nos: missingChapterNos,
        }
        : null
    })
    .filter(Boolean)
  const missingCount = missingRequirements.reduce((sum: number, item: AnyRecord) => sum + arrayValue(item?.chapter_nos).length, 0)
  const missingSummary = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(arrayValue(item.chapter_nos).map((chapterNo: any) => Number(chapterNo)).filter(Boolean))}缺${item.label}`)
    .join('；')
  const productionRelapseVerdict = buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict({
    template,
    validationChapterNos: args.validationChapterNos,
    riskCount: Number(args.riskCount || 0),
    coreRiskCount: Number(args.coreRiskCount || 0),
    payoffDebtCount: Number(args.payoffDebtCount || 0),
    readerPullRiskCount: Number(args.readerPullRiskCount || 0),
  })
  const productionFailedCount = Number(productionRelapseVerdict?.failed_count || 0)
  const productionFailedRequirements = arrayValue(productionRelapseVerdict?.failed_requirements)
  const productionSummary = productionRelapseVerdict
    ? productionRelapseVerdict.status === 'failed'
      ? `生产后验仍复发：${arrayValue(productionRelapseVerdict.remaining_failure_reasons).join('、')}。`
      : `生产后验已修复：${arrayValue(productionRelapseVerdict.cleared_failure_reasons).join('、')}已清零。`
    : ''
  const status = missingCount > 0 || productionFailedCount > 0 ? 'failed' : 'passed'
  const passedSummary = [
    `默认档位模板回检通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${compactChapterNoEvidence(args.validationChapterNos)}已逐章继承段位职责、冲突轮换、回报密度和章末追读模板。`,
    productionSummary,
  ].filter(Boolean).join(' ')
  const failedSummaryParts = [
    missingSummary,
    productionRelapseVerdict?.status === 'failed' ? productionSummary : '',
  ].filter(Boolean)
  return {
    visible: true,
    status,
    label: '默认档位模板回检',
    summary: status === 'passed'
      ? passedSummary
      : `默认档位模板回检未通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${failedSummaryParts.join('；')}，不能恢复默认5章档位。`,
    validation_chapter_nos: args.validationChapterNos,
    ...(templateVersion ? { template_version: templateVersion } : {}),
    requirements: requirements.map(requirement => ({
      ...requirement,
      status: missingRequirements.some((item: AnyRecord) => item.key === requirement.key) ? 'missing' : 'fulfilled',
    })),
    missing_count: missingCount,
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? {
      production_failed_count: productionFailedCount,
      production_relapse_verdict: productionRelapseVerdict,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict(args: {
  template: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const review = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(args.template)
  if (!review) return null
  const failureReasons = arrayValue(review.failure_reasons || review.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const failedRequirements = arrayValue(review.failed_requirements || review.failedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : args.validationChapterNos,
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailedRequirements = failedRequirements
    .filter((item: AnyRecord) => {
      const reason = text(item.failure_reason)
      return !reason || remainingFailureReasons.includes(reason)
    })
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const templateVersionId = firstText(
    review.template_version_id,
    review.templateVersionId,
    args.template?.template_version_id,
    args.template?.templateVersionId,
    args.template?.template_version?.id,
    args.template?.templateVersion?.id,
  )
  return {
    visible: true,
    status,
    label: '默认档位模板生产后验判定',
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(review.default_batch_chapter_nos || review.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    restore_chapter_nos: arrayValue(review.restore_chapter_nos || review.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(review.validation_chapter_nos || review.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
    failed_count: remainingFailedRequirements.length,
    failed_requirements: remainingFailedRequirements,
    summary: status === 'passed'
      ? `默认档位模板生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为版本级验证证据。`
      : `默认档位模板生产后验仍复发：${remainingFailureReasons.join('、')}未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能作为当前模板版本恢复证据。`,
  }
}

export function defaultFiveChapterLaneTemplateRepairAction(requirement: AnyRecord) {
  const label = text(requirement?.label || requirement?.key, '模板缺项')
  const chapterText = compactChapterNoEvidence(
    arrayValue(requirement?.chapter_nos || requirement?.chapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
  )
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return `段位职责修复：${chapterText}必须明确本章在默认5章档位里的前段/中段/后段职责，不能只写单章事件。`
  if (key === 'default_lane_conflict_rotation') return `冲突轮换修复：${chapterText}必须换掉重复冲突来源，写清本章使用规则压迫、人物对抗或信息误导中的哪一类。`
  if (key === 'default_lane_payoff_density') return `回报密度修复：${chapterText}必须补出显性回报，至少让读者看到一个可感知收益、反制结果或阶段结算。`
  if (key === 'default_lane_ending_hook_template') return `章末追读模板修复：${chapterText}最后300字必须落触发事件、读者问题和下一章风险。`
  return `${label}修复：${chapterText}必须补成正文可见模板回执。`
}

export function buildDefaultFiveChapterLaneTemplateRepair(verdict?: AnyRecord | null) {
  if (!verdict || verdict.visible === false) return null
  const missingRequirements = arrayValue(verdict.missing_requirements || verdict.missingRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
  const productionRelapseVerdict = verdict.production_relapse_verdict
    || verdict.productionRelapseVerdict
    || null
  const productionFailedRequirements = arrayValue(verdict.production_failed_requirements || verdict.productionFailedRequirements || productionRelapseVerdict?.failed_requirements || productionRelapseVerdict?.failedRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        failure_reason: text(item?.failure_reason || item?.failureReason),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason || item.chapter_nos.length)
  if (!missingRequirements.length && !productionFailedRequirements.length) return null
  const missingText = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(item.chapter_nos)}缺${item.label}`)
    .join('；')
  const productionFailedText = productionFailedRequirements
    .map((item: AnyRecord) => `${item.label}${item.failure_reason ? `/${item.failure_reason}` : ''}`)
    .join('；')
  const repairActions = missingRequirements
    .map(defaultFiveChapterLaneTemplateRepairAction)
    .concat(productionFailedRequirements.map((item: AnyRecord) => {
      const action = defaultFiveChapterLaneTemplateRepairAction(item)
      return item.failure_reason ? `${action} 生产后验失败维度：${item.failure_reason}。` : action
    }))
    .filter(Boolean)
  const repairSummary = [
    missingText,
    productionFailedText ? `生产后验仍复发：${productionFailedText}` : '',
  ].filter(Boolean).join('；')
  return {
    visible: true,
    status: 'failed',
    label: '默认档位模板验证缺项',
    summary: text(verdict.summary, `默认档位模板回检未通过：${repairSummary}，下一轮结构修复必须写入任务书。`),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    requirements: arrayValue(verdict.requirements).map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key),
      status: text(item?.status || 'fulfilled'),
    })).filter((item: AnyRecord) => item.key || item.label),
    missing_count: Number(verdict.missing_count ?? verdict.missingCount ?? missingRequirements.length),
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? { production_relapse_verdict: productionRelapseVerdict } : {}),
    ...(productionFailedRequirements.length ? {
      production_failed_count: productionFailedRequirements.length,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
    repair_actions: repairActions,
    repair_summary: repairSummary,
  }
}

export function defaultFiveChapterLaneTemplateRedesignInstruction(requirement: AnyRecord) {
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return '重写每章在5章档位中的前段/中段/后段职责，明确这一章承担抛压、转折、兑现或留钩中的哪一段。'
  if (key === 'default_lane_conflict_rotation') return '重写规则压迫、人物对抗、信息误导的轮换顺序，避免验证批连续使用同一冲突来源。'
  if (key === 'default_lane_payoff_density') return '重写每章显性回报预算，规定每章至少交付收益、反制结果或阶段结算，避免连续铺垫。'
  if (key === 'default_lane_ending_hook_template') return '重写最后300字触发事件、读者问题和下一章风险，让章末追读模板逐章可验证。'
  return '重写该模板项，并给下一轮验证批设置逐章可回填的交付标准。'
}

export function buildDefaultFiveChapterLaneTemplateRedesignQueue(profile?: AnyRecord | null) {
  if (!profile || profile.visible === false) return null
  const recommendation = text(profile.recommendation)
  const status = text(profile.status)
  if (recommendation !== 'escalate_template_redesign' && status !== 'redesign') return null

  const requirementStats = arrayValue(profile.requirements || profile.template_requirements || profile.templateRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板项'),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 0),
      passed_count: Number(item?.passed_count ?? item?.passedCount ?? 0),
      latest_status: text(item?.latest_status || item?.latestStatus),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  const explicitTop = profile.top_failed_requirement || profile.topFailedRequirement || null
  const topSource = explicitTop && typeof explicitTop === 'object' && !Array.isArray(explicitTop)
    ? explicitTop
    : requirementStats
      .filter((item: AnyRecord) => item.failed_count > 0)
      .sort((a: AnyRecord, b: AnyRecord) => b.failed_count - a.failed_count)[0] || null
  const topFailedRequirement = topSource ? {
    key: text(topSource.key),
    label: text(topSource.label || topSource.key, '模板缺项'),
    failed_count: Number(topSource.failed_count ?? topSource.failedCount ?? 0),
  } : null
  const topFailureText = topFailedRequirement
    ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次`
    : '同项模板反复失败'
  const latestTemplateVersionProfile = profile.latest_template_version_profile
    || profile.latestTemplateVersionProfile
    || null
  const redesignRequirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
    const stat = requirementStats.find((item: AnyRecord) => item.key === requirement.key)
    return {
      key: requirement.key,
      label: text(stat?.label, requirement.label),
      failed_count: Number(stat?.failed_count || 0),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
    }
  })

  return {
    visible: true,
    status: 'redesign',
    label: '默认档位模板重构队列',
    source: 'default_five_chapter_lane_template_stability_profile',
    recommendation: 'escalate_template_redesign',
    summary: text(profile.summary, `默认档位模板同项复发，${topFailureText}，需要升级模板重构。`),
    latest_chapter_nos: arrayValue(profile.latest_chapter_nos || profile.latestChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_batch_count: Number(profile.validation_batch_count ?? profile.validationBatchCount ?? 0),
    failed_batch_count: Number(profile.failed_batch_count ?? profile.failedBatchCount ?? 0),
    ...(latestTemplateVersionProfile ? { latest_template_version_profile: latestTemplateVersionProfile } : {}),
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    redesign_requirements: redesignRequirements,
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '连续2批模板全过后才能恢复默认5章档位。',
    ],
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseQueue(regression?: AnyRecord | null) {
  if (!regression || regression.visible === false) return null
  const templateVersion = regression.template_version || regression.templateVersion || null
  const templateVersionId = text(regression.template_version_id || regression.templateVersionId || templateVersion?.id)
  if (!templateVersionId) return null
  const failedRequirements = arrayValue(regression.template_version_failed_requirements || regression.templateVersionFailedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction({
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板要求'),
      }),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  if (!failedRequirements.length) return null
  const topFailedRequirement = failedRequirements
    .slice()
    .sort((a, b) => b.failed_count - a.failed_count)[0] || null
  const productionRelapseCount = Number(templateVersion?.production_relapse_count ?? templateVersion?.productionRelapseCount ?? 1)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const repeated = regression.repeated_hotspot_segment || regression.repeatedHotspotSegment || null
  return {
    visible: true,
    status: productionRelapseCount >= 2 ? 'redesign' : 'relapsed',
    label: '默认档位模板生产复发队列',
    source: 'default_five_chapter_lane_production_relapse',
    recommendation: 'redesign_template_after_production_relapse',
    summary: `默认档位模板版本 ${templateVersionId} 在真实5章生产复发：${failedRequirements.map(item => `${item.label}/${item.failure_reason}`).join('、')}，需要把失败维度回写到当前版本模板。`,
    template_version_id: templateVersionId,
    template_version: templateVersion ? { ...templateVersion, id: templateVersionId } : { id: templateVersionId },
    production_relapse_count: Math.max(1, Number.isFinite(productionRelapseCount) ? productionRelapseCount : 1),
    production_relapse_review: {
      template_version_id: templateVersionId,
      default_batch_chapter_nos: defaultBatchChapterNos,
      restore_chapter_nos: restoreChapterNos,
      validation_chapter_nos: validationChapterNos,
      failure_reasons: failureReasons,
      failed_requirements: failedRequirements,
      ...(repeated ? {
        repeated_hotspot_segment: {
          key: text(repeated.key),
          label: text(repeated.label || repeated.key),
          risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? repeated.count ?? 0),
        },
      } : {}),
      summary: text(regression.summary),
    },
    failed_requirements: failedRequirements,
    ...(topFailedRequirement ? {
      top_failed_requirement: {
        key: topFailedRequirement.key,
        label: topFailedRequirement.label,
        failure_reason: topFailedRequirement.failure_reason,
        failed_count: topFailedRequirement.failed_count,
      },
    } : {}),
    redesign_requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const failed = failedRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        key: requirement.key,
        label: requirement.label,
        failed_count: Number(failed?.failed_count || 0),
        failure_reason: text(failed?.failure_reason),
        instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
      }
    }),
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '默认档位真实生产批必须记录 template_version_id 并做版本级后验复盘。',
      '当前版本连续验证与生产后验都稳定后才能恢复默认5章档位。',
    ],
  }
}

