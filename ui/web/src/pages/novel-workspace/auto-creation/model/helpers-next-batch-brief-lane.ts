import type {
  AnyRecord,
  AutoCreationNextBatchBriefChapter,
} from './types'
import {
  arrayValue,
  firstText,
  text,
} from './helpers-basics'
import {
  parsePayload,
  recordTime,
  isResolvedTaskStatus,
  isCompletedRepairRun,
  normalizeDefaultFiveChapterLaneTemplateFailedRequirements,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  compactChapterNoEvidence,
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
} from './helpers-main'

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

