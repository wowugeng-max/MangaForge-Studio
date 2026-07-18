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
  arrayValue,
  firstText,
  opsAction,
  planningAction,
  text,
} from './helpers-basics'
import {
  parsePayload,
  recordTime,
  numberValue,
  isResolvedTaskStatus,
  isCompletedRepairRun,
  signal,
  normalizeDefaultFiveChapterLaneTemplateFailedRequirements,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  compactChapterNoEvidence,
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
} from './helpers-main'

export function serialReleaseInventoryIssue(guardrail: AutoCreationBatchGuardrail) {
  const signal = guardrail.guardrails.find(item => item.label === '连载库存' && item.status !== 'ok')
  return signal || null
}

export function emptyNextBatchBrief(): AutoCreationNextBatchBrief {
  return {
    visible: false,
    chapterRangeLabel: '',
    batchGoal: '',
    readerPayoffPlan: '',
    mainlineFocus: '',
    forbiddenBoundary: '',
    expansionStructureVerification: null,
    expansionStructureDecision: null,
    startChecklist: [],
    chapters: [],
  }
}

export function styleSampleStrategyFromRecord(record: AnyRecord | null | undefined) {
  return record?.styleSampleStrategy
    || record?.style_sample_strategy
    || record?.rawPayload?.preDraftBrief?.styleSampleStrategy
    || record?.rawPayload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.preDraftBrief?.styleSampleStrategy
    || record?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || null
}

export function styleSampleKeysFromStrategy(strategy: AnyRecord | null | undefined) {
  return Array.from(new Set(
    arrayValue(strategy?.samples)
      .map((sample: any) => text(sample?.sample_key, text(sample?.sampleKey, text(sample?.key))))
      .filter(Boolean),
  ))
}

export function normalizeRouteChapter(record: AnyRecord): AutoCreationNextBatchBriefChapter | null {
  const chapterNo = Number(record?.chapterNo ?? record?.chapter_no ?? 0)
  if (!chapterNo) return null
  const styleSampleStrategy = styleSampleStrategyFromRecord(record)
  const styleSampleKeys = styleSampleKeysFromStrategy(styleSampleStrategy)
  return {
    chapterNo,
    title: firstText(record?.title, `第${chapterNo}章`),
    chapterTask: firstText(record?.chapterTask, record?.chapter_task, record?.task, record?.chapterGoal, record?.chapter_goal),
    conflict: firstText(record?.conflict, record?.raw_payload?.conflict),
    endingHook: firstText(record?.endingHook, record?.ending_hook, record?.hook),
    mainlineProgress: firstText(record?.mainlineProgress, record?.mainline_progress, record?.raw_payload?.mainline_progress),
    ...(styleSampleKeys.length ? { styleSampleStrategy, styleSampleKeys } : {}),
  }
}

export function mergeRouteChapterPlan(
  routeChapter: AutoCreationNextBatchBriefChapter,
  fallback: AutoCreationNextBatchBriefChapter | null,
): AutoCreationNextBatchBriefChapter {
  if (!fallback) return routeChapter
  return {
    chapterNo: routeChapter.chapterNo || fallback.chapterNo,
    title: routeChapter.title || fallback.title,
    chapterTask: routeChapter.chapterTask || fallback.chapterTask,
    conflict: routeChapter.conflict || fallback.conflict,
    endingHook: routeChapter.endingHook || fallback.endingHook,
    mainlineProgress: routeChapter.mainlineProgress || fallback.mainlineProgress,
    styleSampleStrategy: routeChapter.styleSampleStrategy || fallback.styleSampleStrategy || null,
    styleSampleKeys: routeChapter.styleSampleKeys?.length ? routeChapter.styleSampleKeys : fallback.styleSampleKeys || [],
  }
}

export function chapterRangeLabel(chapters: AutoCreationNextBatchBriefChapter[]) {
  if (!chapters.length) return ''
  const first = chapters[0].chapterNo
  const last = chapters[chapters.length - 1].chapterNo
  return first === last ? `第${first}章` : `第${first}-${last}章`
}

export function checklistItem(
  key: AutoCreationNextBatchBriefStartChecklistKey,
  label: string,
  detail: string,
  fallback: string,
): AutoCreationNextBatchBriefStartChecklistItem {
  const value = text(detail)
  return {
    key,
    label,
    status: value ? 'ok' : 'warn',
    detail: value || fallback,
  }
}

export const DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_RECEIPTS = [
  'default_lane_segment_duty_delivered',
  'default_lane_conflict_rotation_delivered',
  'default_lane_payoff_density_delivered',
  'default_lane_ending_hook_template_delivered',
]

export function defaultFiveChapterLaneTemplateReceiptKey(key: string) {
  if (key === 'default_lane_segment_duty') return 'default_lane_segment_duty_delivered'
  if (key === 'default_lane_conflict_rotation') return 'default_lane_conflict_rotation_delivered'
  if (key === 'default_lane_payoff_density') return 'default_lane_payoff_density_delivered'
  if (key === 'default_lane_ending_hook_template') return 'default_lane_ending_hook_template_delivered'
  return ''
}

export function defaultFiveChapterLaneTemplateFieldValue(source: AnyRecord, key: string) {
  if (!source) return ''
  if (key === 'default_lane_segment_duty') return firstText(source.segment_duty_rewrite, source.segmentDutyRewrite)
  if (key === 'default_lane_conflict_rotation') return firstText(source.conflict_rotation, source.conflictRotation)
  if (key === 'default_lane_payoff_density') return firstText(source.payoff_density, source.payoffDensity)
  if (key === 'default_lane_ending_hook_template') return firstText(source.ending_hook_template, source.endingHookTemplate)
  return ''
}

export function defaultFiveChapterLaneTemplateFromTask(task: AnyRecord, run: AnyRecord) {
  const review = task?.safe_batch_expansion_structure_decision_review
    || task?.safeBatchExpansionStructureDecisionReview
    || task?.payload?.safe_batch_expansion_structure_decision_review
    || task?.payload?.safeBatchExpansionStructureDecisionReview
    || null
  const redesign = review?.default_five_chapter_lane_redesign
    || review?.defaultFiveChapterLaneRedesign
    || null
  const failedItems = [
    ...arrayValue(review?.failed_items || review?.failedItems),
    ...arrayValue(redesign?.missed_requirements || redesign?.missedRequirements),
  ]
  const hasDefaultLaneTemplate = Boolean(
    redesign
    || failedItems.some(item => text(item?.key).startsWith('default_lane_')),
  )
  if (!hasDefaultLaneTemplate) return null
  const requirementLabels = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(item => item.label)
  return {
    visible: true,
    status: 'fulfilled',
    label: '默认5章档位模板回检',
    source: 'safe_batch_expansion_structure_decision_mismatch',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    reason: text(redesign?.reason),
    relapse_count: Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0),
    repeated_failure_reasons: arrayValue(redesign?.repeated_failure_reasons || redesign?.repeatedFailureReasons)
      .map(item => text(item?.reason || item?.label || item))
      .filter(Boolean),
    segment_duty_rewrite: firstText(
      redesign?.segment_duty_rewrite,
      redesign?.segmentDutyRewrite,
      '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
    ),
    conflict_rotation: firstText(
      redesign?.conflict_rotation,
      redesign?.conflictRotation,
      '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
    ),
    payoff_density: firstText(
      redesign?.payoff_density,
      redesign?.payoffDensity,
      '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
    ),
    ending_hook_template: firstText(
      redesign?.ending_hook_template,
      redesign?.endingHookTemplate,
      '默认 5 章档位验证批必须逐章落地章末追读模板。',
    ),
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
      ...requirement,
      status: 'fulfilled',
      verification_requirement: `${requirement.label}已补齐，下一轮验证批必须逐章继承并证明没有复发。`,
    })),
    summary: `默认5章档位模板已补齐：${requirementLabels.join('、')}。下一轮验证批逐章继承四项模板，并在复盘里证明核心守恒、显性回报和章末追读没有复发。`,
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRedesignedTemplates(queue: AnyRecord) {
  const explicitTemplates = arrayValue(queue.redesigned_templates || queue.redesignedTemplates || queue.templates)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
  if (explicitTemplates.length) return explicitTemplates
  return arrayValue(queue.redesign_requirements || queue.redesignRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
}

export function defaultFiveChapterLaneTemplateFromRedesignQueue(
  queue: AnyRecord,
  run: AnyRecord,
  fallbackTemplate?: AnyRecord | null,
) {
  if (!queue || queue.visible === false) return null
  const fallback = fallbackTemplate || {}
  const redesignedTemplates = normalizeDefaultFiveChapterLaneTemplateRedesignedTemplates(queue)
  const templateByKey = new Map(redesignedTemplates.map((item: AnyRecord) => [item.key, item]))
  const topFailedRaw = queue.top_failed_requirement || queue.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw && typeof topFailedRaw === 'object' && !Array.isArray(topFailedRaw)
    ? {
      key: text(topFailedRaw.key),
      label: text(topFailedRaw.label || topFailedRaw.key, '模板缺项'),
      failed_count: Number(topFailedRaw.failed_count ?? topFailedRaw.failedCount ?? 0),
      failure_reason: text(topFailedRaw.failure_reason || topFailedRaw.failureReason),
    }
    : null
  const templateVersion = queue.template_version || queue.templateVersion || null
  const templateVersionId = firstText(
    queue.template_version_id,
    queue.templateVersionId,
    templateVersion?.id,
    fallback.template_version_id,
    fallback.templateVersionId,
  )
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(queue)
  const productionRelapseReview = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(queue, {
    templateVersionId,
    failedRequirements,
    summary: text(queue.summary),
  })
  const explicitProductionRelapseCount = Number(queue.production_relapse_count ?? queue.productionRelapseCount ?? 0)
  const productionRelapseCount = explicitProductionRelapseCount > 0
    ? explicitProductionRelapseCount
    : productionRelapseReview ? 1 : 0
  const productionFailureReasons = arrayValue(productionRelapseReview?.failure_reasons || productionRelapseReview?.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const productionChapterNos = arrayValue(productionRelapseReview?.default_batch_chapter_nos || productionRelapseReview?.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationStandard = arrayValue(queue.validation_standard || queue.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  const productionValidationStandard = productionRelapseReview
    ? [
      templateVersionId ? `下一轮3章验证批必须逐章对照 template_version_id ${templateVersionId} 和真实生产复发章节。` : '',
      productionFailureReasons.length ? `逐章证明新版模板已修掉真实生产失败维度：${productionFailureReasons.join('、')}。` : '',
    ].filter(Boolean)
    : []
  const effectiveValidationStandard = Array.from(new Set([
    ...validationStandard,
    ...productionValidationStandard,
  ]))
  const requiredReceipts = arrayValue(queue.required_receipts || queue.requiredReceipts || queue.receipts)
    .map(item => text(item))
    .filter(Boolean)
  const effectiveReceipts = requiredReceipts.length ? Array.from(new Set(requiredReceipts)) : DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_RECEIPTS
  const templateForRequirement = (key: string, fallbackText: string) => firstText(
    templateByKey.get(key)?.template,
    defaultFiveChapterLaneTemplateFieldValue(queue, key),
    defaultFiveChapterLaneTemplateFieldValue(fallback, key),
    fallbackText,
  )
  const segmentDutyRewrite = templateForRequirement(
    'default_lane_segment_duty',
    '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
  )
  const conflictRotation = templateForRequirement(
    'default_lane_conflict_rotation',
    '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
  )
  const payoffDensity = templateForRequirement(
    'default_lane_payoff_density',
    '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
  )
  const endingHookTemplate = templateForRequirement(
    'default_lane_ending_hook_template',
    '默认 5 章档位验证批必须逐章落地章末追读模板。',
  )
  const topFailureSummary = topFailedRequirement
    ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次`
    : ''
  const productionRelapseSummary = productionRelapseReview
    ? [
      productionChapterNos.length ? `生产复发章节：${compactChapterNoEvidence(productionChapterNos)}` : '',
      productionFailureReasons.length ? `失败维度：${productionFailureReasons.join('、')}` : '',
    ].filter(Boolean).join('；')
    : ''
  const baseSummary = text(
    queue.summary,
    `默认5章档位模板已完成重构${topFailureSummary ? `：${topFailureSummary}` : ''}。下一轮验证批逐章执行新模板，并证明四项模板没有复发。`,
  )

  return {
    visible: true,
    status: 'fulfilled',
    label: '默认5章档位模板重构',
    source: 'safe_batch_expansion_structure_repair',
    redesign_source: 'default_five_chapter_lane_template_redesign_queue',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    source_repair_summary: text(queue.summary),
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    ...(templateVersion ? { template_version: { ...templateVersion, id: templateVersionId || text(templateVersion.id) } } : {}),
    ...(productionRelapseCount > 0 ? { production_relapse_count: productionRelapseCount } : {}),
    ...(failedRequirements.length ? { failed_requirements: failedRequirements } : {}),
    ...(productionRelapseReview ? { production_relapse_review: productionRelapseReview } : {}),
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    latest_chapter_nos: arrayValue(queue.latest_chapter_nos || queue.latestChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_batch_count: Number(queue.validation_batch_count ?? queue.validationBatchCount ?? 0),
    failed_batch_count: Number(queue.failed_batch_count ?? queue.failedBatchCount ?? 0),
    summary: productionRelapseSummary ? `${baseSummary} ${productionRelapseSummary}。` : baseSummary,
    segment_duty_rewrite: segmentDutyRewrite,
    conflict_rotation: conflictRotation,
    payoff_density: payoffDensity,
    ending_hook_template: endingHookTemplate,
    redesigned_templates: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
      key: requirement.key,
      label: text(templateByKey.get(requirement.key)?.label, requirement.label),
      template: templateForRequirement(requirement.key, ''),
    })),
    validation_standard: effectiveValidationStandard,
    required_receipts: effectiveReceipts,
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const receiptKey = defaultFiveChapterLaneTemplateReceiptKey(requirement.key)
      const templateText = templateForRequirement(requirement.key, '')
      const productionFailure = failedRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        ...requirement,
        status: 'fulfilled',
        verification_requirement: [
          templateText ? `${requirement.label}新模板：${templateText}` : `${requirement.label}已重构`,
          receiptKey ? `下一轮验证批必须逐章回填 ${receiptKey}` : '',
          productionFailure?.failure_reason ? `真实生产失败维度：${productionFailure.failure_reason}` : '',
          '并证明该模板没有复发。',
        ].filter(Boolean).join('；'),
      }
    }),
  }
}

export function defaultFiveChapterLaneTemplateFromStructureRepairTask(
  task: AnyRecord,
  run: AnyRecord,
  fallbackTemplate?: AnyRecord | null,
) {
  const review = task?.safe_batch_expansion_structure_review
    || task?.safeBatchExpansionStructureReview
    || task?.structure_review
    || task?.structureReview
    || null
  const redesignQueue = review?.default_five_chapter_lane_template_redesign_queue
    || review?.defaultFiveChapterLaneTemplateRedesignQueue
    || null
  const templateFromRedesignQueue = defaultFiveChapterLaneTemplateFromRedesignQueue(
    redesignQueue,
    run,
    fallbackTemplate,
  )
  if (templateFromRedesignQueue) return templateFromRedesignQueue
  const repair = review?.default_five_chapter_lane_template_repair
    || review?.defaultFiveChapterLaneTemplateRepair
    || review?.validation_result?.default_five_chapter_lane_template_verdict
    || review?.validationResult?.defaultFiveChapterLaneTemplateVerdict
    || null
  if (!repair || repair.visible === false) return null
  const repairedMissingRequirements = arrayValue(repair.missing_requirements || repair.missingRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板缺项'),
      chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
  if (!repairedMissingRequirements.length) return null
  const repairActions = arrayValue(repair.repair_actions || repair.repairActions)
    .map(item => text(item))
    .filter(Boolean)
  const repairSummary = text(repair.repair_summary || repair.repairSummary)
    || repairedMissingRequirements
      .map((item: AnyRecord) => `${compactChapterNoEvidence(item.chapter_nos)}缺${item.label}`)
      .join('；')
  const requirementLabels = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(item => item.label)
  const fallback = fallbackTemplate || {}
  return {
    visible: true,
    status: 'fulfilled',
    label: text(fallback.label, '默认5章档位模板回检'),
    source: 'safe_batch_expansion_structure_repair',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    source_repair_summary: text(repair.summary),
    segment_duty_rewrite: firstText(
      fallback.segment_duty_rewrite,
      fallback.segmentDutyRewrite,
      '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
    ),
    conflict_rotation: firstText(
      fallback.conflict_rotation,
      fallback.conflictRotation,
      '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
    ),
    payoff_density: firstText(
      fallback.payoff_density,
      fallback.payoffDensity,
      '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
    ),
    ending_hook_template: firstText(
      fallback.ending_hook_template,
      fallback.endingHookTemplate,
      '默认 5 章档位验证批必须逐章落地章末追读模板。',
    ),
    repaired_missing_requirements: repairedMissingRequirements,
    repair_actions: repairActions,
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const repaired = repairedMissingRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        ...requirement,
        status: 'fulfilled',
        verification_requirement: repaired
          ? `${requirement.label}已按${compactChapterNoEvidence(repaired.chapter_nos)}缺项修复，下一轮验证批必须逐章证明没有复发。`
          : `${requirement.label}已补齐，下一轮验证批必须逐章继承并证明没有复发。`,
      }
    }),
    summary: `默认5章档位模板已补齐：${requirementLabels.join('、')}。${repairSummary}已写入结构修复，下一轮验证批逐章继承四项模板，并证明这些缺项没有复发。`,
  }
}

export function buildResolvedDefaultFiveChapterLaneTemplateSeed(runRecords: AnyRecord[]) {
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_decision_mismatch') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const template = defaultFiveChapterLaneTemplateFromTask(task, entry.run)
      if (template) return template
    }
  }
  return null
}

export function buildResolvedSafeBatchExpansionStructureVerificationSeed(runRecords: AnyRecord[]) {
  const defaultFiveChapterLaneTemplate = buildResolvedDefaultFiveChapterLaneTemplateSeed(runRecords)
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_repair') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const review = task?.safe_batch_expansion_structure_review
        || task?.safeBatchExpansionStructureReview
        || task?.structure_review
        || task?.structureReview
        || {}
      const repeated = review?.repeated_hotspot_segment || review?.repeatedHotspotSegment || null
      const defaultFiveChapterRegression = review?.default_five_chapter_regression
        || review?.defaultFiveChapterRegression
        || null
      const defaultRegressionVisible = Boolean(defaultFiveChapterRegression && defaultFiveChapterRegression.visible !== false)
      const segmentLabel = firstText(repeated?.label, '复发段位')
      const actions = arrayValue(review?.structure_actions || review?.structureActions)
        .map(item => text(item))
        .filter(Boolean)
      const defaultRegressionAction = actions.find(item => item.includes('默认档位回退')) || ''
      const defaultFailureReasons = arrayValue(defaultFiveChapterRegression?.failure_reasons || defaultFiveChapterRegression?.failureReasons)
        .map(item => text(item))
        .filter(Boolean)
      const defaultFiveChapterLaneTemplateFromRepair = defaultFiveChapterLaneTemplateFromStructureRepairTask(
        task,
        entry.run,
        defaultFiveChapterLaneTemplate,
      )
      const effectiveDefaultFiveChapterLaneTemplate = defaultFiveChapterLaneTemplateFromRepair || defaultFiveChapterLaneTemplate
      return {
        source: 'safe_batch_expansion_structure_repair',
        label: '扩批结构验证',
        source_run_id: entry.run?.id ?? null,
        repaired_at: text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at),
        repeated_hotspot_segment: repeated ? {
          key: text(repeated?.key),
          label: segmentLabel,
          count: Number(repeated?.count || 0),
        } : null,
        latest_chapter_nos: arrayValue(review?.latest_chapter_nos || review?.latestChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        affected_chapter_nos: arrayValue(review?.affected_chapter_nos || review?.affectedChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        fixed_segment_role: defaultRegressionVisible
          ? firstText(
            defaultRegressionAction,
            `${segmentLabel}默认档位回退验证：每章必须重新证明主线转折、显性回报和章末追读稳定。`,
          )
          : firstText(
            actions.find(item => item.includes('固定职责')),
            `${segmentLabel}固定职责：每批该段必须完成主线转折、显性回报和章末追读。`,
          ),
        conflict_rotation: defaultRegressionVisible
          ? `${segmentLabel}验证批次每章必须更换冲突来源，并逐章证明默认5章档位失效维度不再复发。`
          : `${segmentLabel}验证批次每章必须更换冲突来源，不能连续复用上一批热区压迫方式。`,
        explicit_payoff: defaultRegressionVisible
          ? `每章至少一个显性回报，不能只铺垫或转场；${defaultFailureReasons.includes('回报欠账') ? '必须逐章补清回报欠账。' : '必须逐章证明显性回报稳定。'}`
          : '每章至少一个显性回报，不能只铺垫或转场。',
        ending_hook_requirement: defaultRegressionVisible
          ? `每章章末必须留下不同的章末追读问题，并把下一章必看理由压到最后一幕；${defaultFailureReasons.includes('追读拉力') ? '必须逐章修复追读拉力。' : '必须逐章证明章末追读稳定。'}`
          : '每章章末必须留下不同的章末追读问题，并把下一章必看理由压到最后一幕。',
        structure_actions: actions,
        ...(effectiveDefaultFiveChapterLaneTemplate ? { default_five_chapter_lane_template: effectiveDefaultFiveChapterLaneTemplate } : {}),
        ...(defaultRegressionVisible ? { default_five_chapter_regression: defaultFiveChapterRegression } : {}),
      }
    }
  }
  if (defaultFiveChapterLaneTemplate) {
    return {
      source: 'safe_batch_expansion_structure_decision_mismatch',
      label: '扩批结构验证',
      source_run_id: defaultFiveChapterLaneTemplate.source_run_id,
      repaired_at: defaultFiveChapterLaneTemplate.repaired_at,
      repeated_hotspot_segment: null,
      latest_chapter_nos: [],
      affected_chapter_nos: [],
      fixed_segment_role: defaultFiveChapterLaneTemplate.segment_duty_rewrite,
      conflict_rotation: defaultFiveChapterLaneTemplate.conflict_rotation,
      explicit_payoff: defaultFiveChapterLaneTemplate.payoff_density,
      ending_hook_requirement: defaultFiveChapterLaneTemplate.ending_hook_template,
      structure_actions: [
        defaultFiveChapterLaneTemplate.segment_duty_rewrite,
        defaultFiveChapterLaneTemplate.conflict_rotation,
        defaultFiveChapterLaneTemplate.payoff_density,
        defaultFiveChapterLaneTemplate.ending_hook_template,
      ].filter(Boolean),
      default_five_chapter_lane_template: defaultFiveChapterLaneTemplate,
    }
  }
  return null
}

export function buildSafeBatchExpansionStructureVerification(args: {
  seed?: AnyRecord | null
  chapters: AutoCreationNextBatchBriefChapter[]
}) {
  if (!args.seed) return null
  const validationChapterNos = args.chapters
    .slice(0, 3)
    .map(chapter => Number(chapter.chapterNo || 0))
    .filter(chapterNo => chapterNo > 0)
  if (!validationChapterNos.length) return null
  return {
    ...args.seed,
    validation_chapter_nos: validationChapterNos,
  }
}

export function safeBatchDefaultFiveChapterLaneRedesignPayload(effectiveness: AnyRecord | null | undefined, segmentLabel: string) {
  if (text(effectiveness?.recommendation) !== 'escalate_structure_redesign') return null
  const trend = effectiveness?.default_five_chapter_recovery_verdict_relapse_trend
    || effectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend
    || null
  if (text(trend?.recommendation) !== 'escalate_structure_redesign') return null
  const relapseCount = Number(
    trend?.repeated_relapse_count
    ?? trend?.repeatedRelapseCount
    ?? (Number(trend?.baseline_relapse_count ?? trend?.baselineRelapseCount ?? 0) + Number(trend?.current_relapse_count ?? trend?.currentRelapseCount ?? 0)),
  )
  if (relapseCount < 2) return null
  const repeatedFailureReasons = arrayValue(trend?.repeated_failure_reasons || trend?.repeatedFailureReasons)
    .map(item => text(item?.reason || item?.label || item))
    .filter(Boolean)
  const reasonLabel = repeatedFailureReasons.length ? repeatedFailureReasons.join('、') : '已清零维度'
  const dutySegment = text(segmentLabel, '复发段位')
  return {
    reason: 'repeated_recovery_verdict_relapse',
    label: '默认5章档位结构重构',
    summary: text(trend?.summary, `恢复判定连续失效 ${relapseCount} 次：${reasonLabel}同维复发，默认档位结构重构。`),
    relapseCount,
    repeatedFailureReasons,
    segmentDutyRewrite: `段位职责重写：重写默认 5 章档位内前段、中段、后段和${dutySegment}的承载职责，明确每章负责冲突推进、信息增量、读者回报或章末钩子中的哪一项，禁止把${dutySegment}继续写成转场铺垫。`,
    conflictRotation: `冲突轮换：默认 5 章内必须轮换至少三类冲突来源，避免连续使用同一压迫、同一解释或同一对手推进；${dutySegment}必须换成可见事件或选择代价。`,
    payoffDensity: '回报密度：默认 5 章每章都要交付显性回报，至少包含信息增量、能力展示、关系变化、爽点兑现或小回收之一，不能连续两章只铺垫。',
    endingHookTemplate: '章末追读模板：每章最后 300 字必须落成触发事件、读者问题、下一章风险升级三件套，不能用空泛总结替代章末追读。',
  }
}

export function buildSafeBatchExpansionStructureDecision(policy?: AnyRecord | null) {
  if (!policy?.visible) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const effectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const decisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const decisionTrendWarn = text(decisionTrend?.status) === 'warn'
  if (!effectiveness?.visible && !decisionTrendWarn) return null
  const effectivenessRecommendation = text(effectiveness?.recommendation)
  const recommendation = decisionTrendWarn ? 'continue_small_validation' : effectivenessRecommendation
  if (!recommendation) return null
  const targetChapterCount = Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0)
  const topFailedRequirement = decisionTrend?.top_failed_requirement || decisionTrend?.topFailedRequirement || null
  const topFailedSegment = decisionTrend?.top_failed_segment || decisionTrend?.topFailedSegment || null
  const segmentLabel = text(
    effectiveness?.segment_label || effectiveness?.segmentLabel,
    text(decisionTrend?.latest_segment_label || decisionTrend?.latestSegmentLabel, text(topFailedSegment?.label, '复发段位')),
  )
  const baselinePassRate = Number(effectiveness?.baseline_pass_rate ?? effectiveness?.baselinePassRate ?? 0)
  const currentPassRate = Number(effectiveness?.current_pass_rate ?? effectiveness?.currentPassRate ?? 0)
  const baselineFailureReasonCount = Number(effectiveness?.baseline_failure_reason_count ?? effectiveness?.baselineFailureReasonCount ?? 0)
  const currentFailureReasonCount = Number(effectiveness?.current_failure_reason_count ?? effectiveness?.currentFailureReasonCount ?? 0)
  const currentRecurrenceInterval = Number(effectiveness?.current_recurrence_interval_batch_count ?? effectiveness?.currentRecurrenceIntervalBatchCount ?? 0)
  const defaultFiveChapterLaneRedesign = safeBatchDefaultFiveChapterLaneRedesignPayload(effectiveness, segmentLabel)
  const modeLabel = decisionTrendWarn
    ? '结构决策执行补齐'
    : recommendation === 'restore_five_chapter'
    ? '恢复5章扩批'
    : recommendation === 'continue_small_validation'
      ? '继续小批验证'
      : '单章结构重构'
  const baseInstruction = recommendation === 'restore_five_chapter'
    ? `恢复 5 章扩批，但每章必须明确前段/中段/后段职责，${segmentLabel}不能再次变成空铺垫、掉回报或弱追读。`
    : recommendation === 'continue_small_validation'
      ? `继续 2-3 章小批验证，逐章观察通过率、失败主因和同段复发，不得提前恢复 5 章节奏。`
      : defaultFiveChapterLaneRedesign
        ? `默认 5 章档位连续恢复判定失效，回到单章结构重构；先重写默认 5 章档位的段位职责、冲突轮换、回报密度和章末追读模板，再恢复多章连写。`
        : `回到单章结构重构，先重写批次设计原则和${segmentLabel}职责，再恢复多章连写。`
  const trendInstruction = decisionTrendWarn
    ? `先按结构决策执行趋势补齐${text(topFailedRequirement?.label, '段位职责和观察指标')}，下一批保持 ${Math.max(1, targetChapterCount || 3)} 章小批验证；每章必须回填扩批结构决策执行回执。`
    : ''
  const instruction = trendInstruction
    ? `${trendInstruction}${baseInstruction}`
    : baseInstruction
  const observationMetrics = [
    ...(effectiveness?.visible ? [
      `通过率 ${baselinePassRate}% -> ${currentPassRate}%`,
      `失败主因 ${baselineFailureReasonCount} -> ${currentFailureReasonCount}`,
      currentRecurrenceInterval > 0 ? `修复后第${currentRecurrenceInterval}个扩批批次复发` : '修复后暂无同段复发',
    ] : []),
    ...(decisionTrendWarn && topFailedRequirement ? [
      `结构决策漏项：${text(topFailedRequirement.label, '执行要求')} ${Number(topFailedRequirement.count || 0)}`,
    ] : []),
    ...(defaultFiveChapterLaneRedesign ? [
      `恢复判定连续失效 ${defaultFiveChapterLaneRedesign.relapseCount} 次`,
      ...defaultFiveChapterLaneRedesign.repeatedFailureReasons.map((reason: string) => `同维复发：${reason}`),
    ] : []),
  ]

  return {
    visible: true,
    label: '结构修复决策',
    recommendation,
    targetChapterCount,
    modeLabel,
    summary: text(effectiveness?.summary, text(decisionTrend?.summary)),
    instruction,
    sourceRunId: effectiveness?.source_run_id ?? effectiveness?.sourceRunId ?? null,
    segmentKey: text(effectiveness?.segment_key || effectiveness?.segmentKey || decisionTrend?.latest_segment_key || decisionTrend?.latestSegmentKey || topFailedSegment?.key),
    segmentLabel,
    observationMetrics,
    ...(defaultFiveChapterLaneRedesign ? { defaultFiveChapterLaneRedesign } : {}),
  }
}

export function buildNextBatchBriefStartChecklist(args: {
  planning: PlanningWorkspaceModel
  chapters: AutoCreationNextBatchBriefChapter[]
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  expansionStructureVerification?: AnyRecord | null
  expansionStructureDecision?: AnyRecord | null
}): AutoCreationNextBatchBriefStartChecklistItem[] {
  const chapterTasks = args.chapters
    .map(item => item.chapterTask || item.conflict)
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
  const innovationLanes = Array.isArray(args.planning.longformBattleDesk?.lanes)
    ? args.planning.longformBattleDesk.lanes
    : []
  const innovationLane = innovationLanes.find(item => item.key === 'innovation_ip')
  const innovationDetail = firstText(
    innovationLane?.detail,
    args.planning.mainline.currentStageConflict,
    args.planning.mainline.readerPromise,
  )

  const checklist = [
    checklistItem(
      'core_promise',
      '核心承诺',
      args.planning.mainline.readerPromise,
      '缺核心读者承诺，批量生成前需要先明确这本书到底让读者追什么。',
    ),
    checklistItem(
      'story_drive',
      '故事驱动力',
      firstText(args.mainlineFocus, chapterTasks),
      '缺逐章冲突或主线推进，连续生成容易变成流水账。',
    ),
    checklistItem(
      'reader_payoff',
      '读者回报',
      args.readerPayoffPlan,
      '缺升级、打脸、揭秘或情绪兑现计划，建议先补本批爽点。',
    ),
    checklistItem(
      'innovation',
      '创新/IP记忆点',
      innovationDetail,
      '缺本批差异化表达或标志性场面，建议补一个能被读者记住的看点。',
    ),
    checklistItem(
      'forbidden_boundary',
      '禁写边界',
      args.forbiddenBoundary,
      '缺禁写边界，批量生成可能跳过质检、提前揭底或误改长期设定。',
    ),
  ]
  if (args.expansionStructureVerification) {
    checklist.push(checklistItem(
      'expansion_structure',
      '扩批结构验证',
      firstText(
        args.expansionStructureVerification.fixed_segment_role,
        args.expansionStructureVerification.conflict_rotation,
        args.expansionStructureVerification.explicit_payoff,
      ),
      '已修复扩批结构，本批需要用2-3章验证固定段落职责、冲突换源、显性回报和章末追读。',
    ))
  }
  if (args.expansionStructureDecision) {
    checklist.push(checklistItem(
      'expansion_structure',
      '结构修复决策',
      firstText(
        args.expansionStructureDecision.instruction,
        args.expansionStructureDecision.summary,
        args.expansionStructureDecision.modeLabel,
      ),
      '结构修复有效性已决定本批扩批策略，必须按该决策执行章节职责和观察指标。',
    ))
  }
  return checklist
}

export function buildNextBatchBrief(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  safeChapterCount: number
  chapters?: AnyRecord[] | null
  expansionStructureVerificationSeed?: AnyRecord | null
  safeBatchExpansionPolicy?: AnyRecord | null
}): AutoCreationNextBatchBrief {
  if (args.safeChapterCount <= 0) return emptyNextBatchBrief()
  const targetNo = Number(args.writing.nextChapter?.chapterNo || 0)
  if (!targetNo) return emptyNextBatchBrief()
  const chaptersByNo = new Map(arrayValue(args.chapters)
    .map((chapter: AnyRecord) => [Number(chapter?.chapterNo ?? chapter?.chapter_no ?? 0), chapter])
    .filter(([chapterNo]) => Boolean(chapterNo)))
  const routeChapters = arrayValue(args.planning.futureRoute)
    .map(normalizeRouteChapter)
    .filter((item): item is AutoCreationNextBatchBriefChapter => Boolean(item))
    .filter(item => item.chapterNo >= targetNo)
    .sort((a, b) => a.chapterNo - b.chapterNo)
    .slice(0, args.safeChapterCount)
  const existingNos = new Set(routeChapters.map(item => item.chapterNo))
  const targetFallback = normalizeRouteChapter({
    chapterNo: targetNo,
    title: args.writing.nextChapter?.title,
    chapterTask: args.writing.nextChapter?.chapterGoal,
    conflict: args.writing.nextChapter?.conflict,
    endingHook: args.writing.nextChapter?.endingHook,
    mainlineProgress: args.planning.mainline.nextTurn,
    styleSampleStrategy: styleSampleStrategyFromRecord(args.writing.nextChapter as AnyRecord),
  })
  if (!existingNos.has(targetNo)) {
    if (targetFallback) routeChapters.unshift(targetFallback)
  } else if (targetFallback) {
    const targetIndex = routeChapters.findIndex(item => item.chapterNo === targetNo)
    if (targetIndex >= 0) {
      routeChapters[targetIndex] = mergeRouteChapterPlan(routeChapters[targetIndex], targetFallback)
    }
  }
  const chapters = routeChapters.slice(0, args.safeChapterCount).map(chapter => {
    const sourceChapter = chaptersByNo.get(chapter.chapterNo)
    const styleSampleStrategy = chapter.styleSampleStrategy || styleSampleStrategyFromRecord(sourceChapter)
    const styleSampleKeys = chapter.styleSampleKeys?.length ? chapter.styleSampleKeys : styleSampleKeysFromStrategy(styleSampleStrategy)
    return styleSampleKeys.length
      ? { ...chapter, styleSampleStrategy, styleSampleKeys }
      : chapter
  })
  if (!chapters.length) return emptyNextBatchBrief()
  const mainlineProgress = chapters.map(item => item.mainlineProgress).filter(Boolean)
  const conflicts = chapters.map(item => item.conflict).filter(Boolean)
  const batchGoal = [
    args.planning.mainline.currentVolumeGoal ? `卷目标：${args.planning.mainline.currentVolumeGoal}` : '',
    chapters[chapters.length - 1]?.mainlineProgress ? `本批推进到：${chapters[chapters.length - 1].mainlineProgress}` : '',
  ].filter(Boolean).join('；') || '保持当前卷目标连续推进。'
  const readerPayoffPlan = [
    args.planning.mainline.payoffModel ? `爽点模型：${args.planning.mainline.payoffModel}` : '',
    chapters.map(item => item.endingHook).filter(Boolean).slice(0, 3).join(' / '),
  ].filter(Boolean).join('；') || '每章保留明确读者回报和章末钩子。'
  const mainlineFocus = mainlineProgress.join(' -> ') || args.planning.mainline.currentStageConflict || '保持主线推进不偏移。'
  const forbiddenBoundary = [
    '不得跳过单章质检、修订和故事状态回填。',
    args.planning.mainline.risks[0] ? `避开风险：${args.planning.mainline.risks[0]}` : '',
    conflicts.length ? `冲突必须逐章落地：${conflicts.slice(0, 3).join(' / ')}` : '',
  ].filter(Boolean).join('；')
  const expansionStructureVerification = buildSafeBatchExpansionStructureVerification({
    seed: args.expansionStructureVerificationSeed,
    chapters,
  })
  const expansionStructureDecision = buildSafeBatchExpansionStructureDecision(args.safeBatchExpansionPolicy)

  return {
    visible: true,
    chapterRangeLabel: chapterRangeLabel(chapters),
    batchGoal,
    readerPayoffPlan,
    mainlineFocus,
    forbiddenBoundary,
    expansionStructureVerification,
    expansionStructureDecision,
    startChecklist: buildNextBatchBriefStartChecklist({
      planning: args.planning,
      chapters,
      readerPayoffPlan,
      mainlineFocus,
      forbiddenBoundary,
      expansionStructureVerification,
      expansionStructureDecision,
    }),
    chapters,
  }
}

export function chapterNoLabels(chapters: AutoCreationNextBatchBriefChapter[]) {
  return chapters.map(item => `第${item.chapterNo}章`).join('、')
}

export function nextBatchBriefMissingItems(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
) {
  if (expectedChapterCount <= 0) return []
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) return ['缺少下一批任务书']

  const missingCoverage = expectedChapterCount > 1 && nextBatchBrief.chapters.length < expectedChapterCount
    ? [`只覆盖 ${nextBatchBrief.chapters.length}/${expectedChapterCount} 章`]
    : []
  const missingTask = nextBatchBrief.chapters.filter(item => !text(item.chapterTask))
  const missingConflict = nextBatchBrief.chapters.filter(item => !text(item.conflict))
  const missingHook = nextBatchBrief.chapters.filter(item => !text(item.endingHook))
  const missingMainline = nextBatchBrief.chapters.filter(item => !text(item.mainlineProgress))
  return [
    ...missingCoverage,
    missingTask.length ? `缺逐章职责：${chapterNoLabels(missingTask)}` : '',
    missingConflict.length ? `缺冲突落点：${chapterNoLabels(missingConflict)}` : '',
    missingHook.length ? `缺章末钩子：${chapterNoLabels(missingHook)}` : '',
    missingMainline.length ? `缺主线推进：${chapterNoLabels(missingMainline)}` : '',
  ].filter(Boolean)
}

export function buildNextBatchBriefSignal(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
): AutoCreationBatchGuardrailSignal {
  if (expectedChapterCount <= 0) {
    return signal('批次任务书', 'ok', '当前没有可放行的安全连写批次。')
  }
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) {
    return signal('批次任务书', 'block', '缺少下一批任务书，无法判断连续生成会推进什么。')
  }

  const issues = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)

  if (!issues.length) {
    return signal(
      '批次任务书',
      'ok',
      `下一批任务书覆盖 ${nextBatchBrief.chapterRangeLabel}，本批目标、读者回报、主线推进和章末钩子可检查。`,
    )
  }

  const firstChapter = nextBatchBrief.chapters[0]
  const firstChapterUsable = Boolean(
    text(firstChapter?.chapterTask)
    && text(firstChapter?.conflict)
    && text(firstChapter?.endingHook)
    && text(firstChapter?.mainlineProgress),
  )
  const status: AutoCreationBatchGuardrailSignalStatus = firstChapterUsable ? 'warn' : 'block'
  const detail = status === 'warn'
    ? `下一批任务书还不适合多章连写，${issues.slice(0, 3).join('；')}。本轮先降为单章推进。`
    : `下一批任务书不足以开写，${issues.slice(0, 3).join('；')}。先补章节任务书或滚动规划。`
  return signal('批次任务书', status, detail)
}

export function emptyNextBatchBriefRepair(): AutoCreationBatchBriefRepair {
  return {
    visible: false,
    status: 'ok',
    title: '',
    summary: '',
    missingItems: [],
    action: planningAction('update_rolling_plan', '批次任务书完整时无需补齐。', '补齐批次任务书'),
  }
}

export function buildNextBatchBriefRepair(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
  batchBriefSignal: AutoCreationBatchGuardrailSignal,
): AutoCreationBatchBriefRepair {
  if (batchBriefSignal.status === 'ok') return emptyNextBatchBriefRepair()
  const missingItems = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)
  return {
    visible: true,
    status: batchBriefSignal.status,
    title: '补齐下一批任务书',
    summary: batchBriefSignal.status === 'block'
      ? '下一批还没有达到开写条件，先补齐本批目标、逐章职责、冲突和钩子。'
      : '当前章可以继续推进，但多章连写前需要补齐后续章节职责、冲突和钩子。',
    missingItems,
    action: planningAction('update_rolling_plan', batchBriefSignal.detail, '补齐批次任务书', {
      source: 'batch_brief_repair',
      missing_items: missingItems,
      next_batch_brief: nextBatchBrief,
      expected_chapter_count: expectedChapterCount,
    }),
  }
}

export function styleSampleEffectivenessRows(effectiveness: AnyRecord | null | undefined) {
  if (!effectiveness) return []
  if (Array.isArray(effectiveness?.samples)) return effectiveness.samples
  if (Array.isArray(effectiveness?.items)) return effectiveness.items
  return arrayValue(effectiveness)
}

export function styleSampleEffectivenessRisky(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const usageCount = numberValue(row?.usage_count ?? row?.usageCount) ?? 0
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate) ?? 100
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount) ?? 0
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount) ?? 0
  return /需复盘|风险|低命中|照搬/.test(riskLabel)
    || missedCount > 0
    || copyRiskCount > 0
    || (usageCount > 0 && hitRate < 80)
}

export function styleSampleEffectivenessRiskReason(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate)
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount)
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount)
  return [
    riskLabel,
    hitRate !== null ? `命中率 ${hitRate}%` : '',
    missedCount ? `缺口 ${missedCount}` : '',
    copyRiskCount ? `照搬风险 ${copyRiskCount}` : '',
  ].filter(Boolean).join('，') || '样章效果回收提示需复盘'
}

export function buildStyleSampleBatchPreflight(
  nextBatchBrief: AutoCreationNextBatchBrief,
  effectiveness: AnyRecord | null | undefined,
) {
  const riskyRows = styleSampleEffectivenessRows(effectiveness)
    .filter(styleSampleEffectivenessRisky)
  const riskyByKey = new Map(riskyRows
    .map((row: AnyRecord) => [text(row?.sample_key, text(row?.sampleKey)), row])
    .filter(([key]) => Boolean(key)))
  const selections = nextBatchBrief.chapters.flatMap(chapter => {
    const keys = chapter.styleSampleKeys?.length
      ? chapter.styleSampleKeys
      : styleSampleKeysFromStrategy(chapter.styleSampleStrategy)
    return keys
      .filter(key => riskyByKey.has(key))
      .map(key => ({
        chapter_no: chapter.chapterNo,
        chapter_title: chapter.title,
        sample_key: key,
        reason: styleSampleEffectivenessRiskReason(riskyByKey.get(key) || {}),
        effectiveness: riskyByKey.get(key) || {},
      }))
  })
  const riskySampleKeys = Array.from(new Set(selections.map(item => item.sample_key))).filter(Boolean)
  const affectedChapterNos = Array.from(new Set(selections.map(item => Number(item.chapter_no || 0)).filter(Boolean))).sort((a, b) => a - b)
  const recommendedRepairAction = {
    action: 'replace',
    label: '换样章并重审任务书',
    requires_task_book_reconfirm: true,
  }
  const repairTasks = selections.map(item => ({
    task_type: 'repair_task_book',
    issue_type: 'style_sample_task_book_rebuild',
    severity: Number(item.effectiveness?.copy_risk_count || item.effectiveness?.copyRiskCount || 0) > 0 ? 'high' : 'medium',
    title: `第${item.chapter_no}章换样章并重审任务书`,
    message: `第${item.chapter_no}章《${item.chapter_title || '未命名'}》任务书仍选择风险样章「${item.sample_key}」：${item.reason}。`,
    action: recommendedRepairAction.label,
    acceptance_criteria: [
      '任务书已换用表现稳定或更匹配本章场景的风格样章',
      '换样章后任务书确认状态已清除，并由作者重新确认',
      '重新生成正文前不再选择低命中或照搬风险样章',
    ],
    task_status: 'open',
    source: 'style_sample_batch_preflight',
    chapter_no: item.chapter_no,
    sample_key: item.sample_key,
    sample_effectiveness: item.effectiveness,
    recommended_repair_action: recommendedRepairAction,
  }))
  const status = selections.length ? 'warn' : 'ok'
  return {
    visible: nextBatchBrief.visible || riskyRows.length > 0,
    status,
    risk_count: selections.length,
    summary: selections.length
      ? `下一批任务书${affectedChapterNos.map(chapterNo => `第${chapterNo}章`).join('、')}仍选择需复盘样章：${riskySampleKeys.join('、')}。先换样章并重审任务书，再扩大安全连写。`
      : riskyRows.length
        ? '下一批任务书没有继续选择需复盘样章。'
        : '样章效果回收没有待复盘风险，下一批可按任务书样章策略继续。',
    risky_sample_keys: riskySampleKeys,
    affected_chapter_nos: affectedChapterNos,
    selected_samples: selections,
    recommended_repair_action: recommendedRepairAction,
    repair_tasks: repairTasks,
  }
}

export function buildStyleSampleTaskBookRecheckPlan(args: {
  items: AnyRecord[]
  styleSampleBatchPreflight?: AnyRecord | null
}) {
  const styleItems = arrayValue(args.items)
    .filter(item => {
      const task = item?.task || item
      return text(task?.issue_type) === 'style_sample_task_book_rebuild'
        && text(task?.task_status) === 'needs_review'
    })
  const preflight = args.styleSampleBatchPreflight || null
  if (!preflight) {
    return {
      status: 'needs_preflight',
      resolvedItems: [],
      blockedItems: styleItems,
      summary: '请先刷新自动创作总控台，取得最新风格样章预检后再批量关闭样章任务书。',
      riskyChapterNos: [],
    }
  }

  const selectedSamples = arrayValue(preflight.selected_samples || preflight.selectedSamples)
  const affectedChapterNos = Array.from(new Set([
    ...arrayValue(preflight.affected_chapter_nos || preflight.affectedChapterNos)
      .map(item => Number(item))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
    ...selectedSamples
      .map(item => Number(item?.chapter_no || item?.chapterNo || 0))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
  ])).sort((a, b) => a - b)
  const riskActive = text(preflight.status) === 'warn'
    || Number(preflight.risk_count || preflight.riskCount || 0) > 0
    || selectedSamples.length > 0

  if (!riskActive || affectedChapterNos.length === 0) {
    return {
      status: styleItems.length ? 'all_clear' : 'empty',
      resolvedItems: styleItems,
      blockedItems: [],
      summary: `样章任务书复检通过 ${styleItems.length} 项，下一批任务书已避开风险样章。`,
      riskyChapterNos: [],
    }
  }

  const riskyChapterSet = new Set(affectedChapterNos)
  const resolvedItems = styleItems.filter(item => {
    const task = item?.task || item
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    return Number.isFinite(chapterNo) && chapterNo > 0 && !riskyChapterSet.has(chapterNo)
  })
  const blockedItems = styleItems.filter(item => !resolvedItems.includes(item))
  return {
    status: resolvedItems.length > 0 ? 'partial' : 'blocked',
    resolvedItems,
    blockedItems,
    summary: `样章任务书复检通过 ${resolvedItems.length} 项，仍需重审 ${blockedItems.length} 项。`,
    riskyChapterNos: affectedChapterNos,
  }
}

export function buildStyleSampleTaskBookRecoveryEvidence(runRecords: AnyRecord[]) {
  const resolvedTasks = runRecords.flatMap(run => {
    if (text(run?.run_type) !== 'longform_production_repair') return []
    const input = parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {}
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const source = firstText(input?.source, output?.report?.source)
    if (source !== 'style_sample_batch_preflight') return []
    return [
      ...arrayValue(output?.tasks),
      ...arrayValue(output?.repairTasks),
    ].filter(task => text(task?.issue_type ?? task?.issueType) === 'style_sample_task_book_rebuild'
      && isResolvedTaskStatus(task?.task_status ?? task?.status))
  })
  if (!resolvedTasks.length) return []
  const chapterNos = Array.from(new Set(resolvedTasks
    .map(task => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0)))
    .sort((a, b) => a - b)
  return [
    `样章任务书复检通过 ${resolvedTasks.length} 项`,
    chapterNos.length ? `${compactChapterNoEvidence(chapterNos)}样章已重审` : '',
  ].filter(Boolean)
}

export function buildStyleSampleBatchPreflightSignal(preflight: AnyRecord): AutoCreationBatchGuardrailSignal {
  if (preflight.status === 'warn') {
    return signal('风格样章预检', 'warn', preflight.summary)
  }
  return signal('风格样章预检', 'ok', preflight.summary || '下一批任务书没有选择风险样章。')
}

export function emptyNextBatchBriefRecovery(): AutoCreationBatchBriefRecovery {
  return {
    visible: false,
    title: '',
    summary: '',
    restoredChapterCount: 0,
    evidence: [],
    action: opsAction('start_safe_batch_generation', '开始安全连写', '当前批次尚未恢复到多章连写。', true),
  }
}

export function buildNextBatchBriefRecoveryEvidence(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  evidence?: string[]
}) {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return []
  }
  return [
    '批次任务书完整',
    `安全批次 ${args.safeChapterCount} 章`,
    args.nextBatchBrief.chapterRangeLabel,
    args.nextBatchBrief.readerPayoffPlan ? '读者回报已明确' : '',
    args.nextBatchBrief.mainlineFocus ? '主线焦点已明确' : '',
    ...arrayValue(args.evidence),
  ].filter(Boolean)
}

export function buildRecoveryEvidenceReleaseSummary(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  allowedChapterNos: number[]
  nextBatchBrief: AutoCreationNextBatchBrief
  recoveryEvidenceProductionGate?: AnyRecord | null
  recoveryEvidenceSourceRiskProfile?: AnyRecord | null
}) {
  const gate = args.recoveryEvidenceProductionGate || null
  const profile = args.recoveryEvidenceSourceRiskProfile || null
  if (args.status !== 'ready') return null
  const strengthenedRepairSources = arrayValue(profile?.sources)
    .filter(source => {
      const releaseFailureCount = Number(source?.release_failure_count || source?.releaseFailureCount || 0)
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return releaseFailureCount >= 2 && text(closure?.status) === 'converged'
    })
    .map(source => {
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return {
        source: text(source?.source || source?.sourceMode),
        label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
        status: 'converged',
        status_label: text(closure?.label, '强化深修已收敛'),
        latest_repair_run_id: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
        latest_repair_at: text(closure?.latest_repair_at || closure?.latestRepairAt),
      }
    })
    .filter(source => source.source)
  if (text(gate?.status) !== 'ok' && !strengthenedRepairSources.length) return null
  const clearedSources = text(gate?.status) === 'ok' ? arrayValue(gate?.sources)
    .filter(source => text(source?.status) === 'cleared')
    .map(source => ({
      source: text(source?.source || source?.sourceMode),
      label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
      status: 'cleared',
      status_label: text(source?.status_label || source?.statusLabel, '生产阻断已解除'),
      task_count: Number(source?.task_count || source?.taskCount || 0),
      chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
      source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    }))
    : []
  if (!clearedSources.length && !strengthenedRepairSources.length) return null
  const evidence = [
    clearedSources.length ? '恢复依据治理队列已闭环' : '',
    ...clearedSources.map(source => `${source.label}：生产阻断已解除`),
    ...strengthenedRepairSources.map(source => `${source.label}：${source.status_label}`),
  ].filter(Boolean)
  return {
    status: 'released',
    source: clearedSources.length ? 'recovery_evidence_governance_queue' : 'recovery_evidence_source_risk_profile',
    summary: clearedSources.length
      ? `恢复依据治理队列已闭环，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`
      : `恢复依据画像强化深修已收敛，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`,
    safe_chapter_count: args.safeChapterCount,
    allowed_chapter_nos: args.allowedChapterNos,
    next_batch_label: args.nextBatchBrief.chapterRangeLabel,
    cleared_source_count: clearedSources.length,
    cleared_sources: clearedSources,
    strengthened_repair_source_count: strengthenedRepairSources.length,
    strengthened_repair_sources: strengthenedRepairSources,
    evidence,
  }
}

export function buildNextBatchBriefRecovery(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  recommendedAction: AutoCreationDirectorAction
  evidence?: string[]
}): AutoCreationBatchBriefRecovery {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return emptyNextBatchBriefRecovery()
  }
  return {
    visible: true,
    title: '已恢复多章安全连写',
    summary: `${args.nextBatchBrief.chapterRangeLabel || `未来 ${args.safeChapterCount} 章`} 的批次目标、读者回报、主线推进和章末钩子已具备，可按护栏进入小批量生产。`,
    restoredChapterCount: args.safeChapterCount,
    evidence: buildNextBatchBriefRecoveryEvidence(args),
    action: args.recommendedAction,
  }
}

export function buildLongformMemoryAnchor(storyState: AnyRecord) {
  const state = storyState || {}
  const global = state.global || state
  const characterStates = arrayValue(state.characters)
    .map((item: any) => {
      const name = firstText(item?.name, item?.character_name, item?.title)
      if (!name) return ''
      const status = firstText(item?.status, item?.state, item?.current_state, item?.arc_state)
      const location = firstText(item?.location, item?.current_location)
      return [name, status, location ? `@${location}` : ''].filter(Boolean).join('：').replace('：@', '@')
    })
    .filter(Boolean)
    .slice(0, 8)
  const openQuestions = [
    ...arrayValue(global?.open_questions),
    ...arrayValue(state?.open_questions),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const payoffDebts = [
    ...arrayValue(global?.payoff_queue),
    ...arrayValue(global?.payoff_debts),
    ...arrayValue(state?.payoff_queue),
    ...arrayValue(state?.payoff_debts),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const anchor = {
    last_updated_chapter: Number(state.last_updated_chapter || global.last_updated_chapter || 0) || null,
    core_promise: firstText(global.core_promise, global.reader_promise, global.promise, state.core_promise, state.reader_promise),
    current_volume_goal: firstText(global.current_volume_goal, global.volume_goal, state.current_volume_goal, state.volume_goal),
    current_mainline: firstText(global.current_mainline, global.mainline, state.current_mainline, state.mainline),
    character_states: characterStates,
    open_questions: Array.from(new Set(openQuestions)).slice(0, 8),
    payoff_debts: Array.from(new Set(payoffDebts)).slice(0, 8),
  }
  const hasAnchor = Boolean(
    anchor.last_updated_chapter
    || anchor.core_promise
    || anchor.current_volume_goal
    || anchor.current_mainline
    || anchor.character_states.length
    || anchor.open_questions.length
    || anchor.payoff_debts.length,
  )
  return hasAnchor ? anchor : null
}

