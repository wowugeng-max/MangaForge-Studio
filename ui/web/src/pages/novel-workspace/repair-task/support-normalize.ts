import {
  type AnyRecord,
  arrayValue,
  firstText,
  limitedArray,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  camelFieldName,
  deterministicProseCleanupResidualsFromQuality,
  genericClosureEvidenceDetail,
  metricNumber,
  preDraftExecutionReceiptSources,
  qualityContractMissingFields,
  qualityContractResidualsFromQuality,
  sceneCardDirectiveResidualsFromQuality,
  sceneCardReceiptResidualsFromQuality,
  summarizeEvidenceItem,
} from './quality-contract'
import {
  isSingleChapterRecoveryEvidenceTask,
  normalizeFailedDeliveryRiskReceiptRepairs,
  deliveryRiskStrategy,
  isOpeningHandoffMiss,
  repairTaskIssueType,
} from './support'

export function normalizeDeliveryRiskContext(task: AnyRecord) {
  const issueType = repairTaskIssueType(task)
  const normalizedKind = `${issueType} ${firstText(task.annotation_category)}`.toLowerCase()
  const chapterHandoffReview = objectValue(task.chapter_handoff_review || task.chapterHandoffReview)
  const isBatchHandoffRisk = normalizedKind.includes('chapter_handoff')
    || arrayValue(chapterHandoffReview.missed).length > 0
  const isDeliveryRisk = task.source === 'review_annotation_risk'
    || Boolean(task.annotation_key)
    || Boolean(task.annotation_source)
    || isBatchHandoffRisk
  if (!isDeliveryRisk) return null
  const taskPayload = objectValue(task.payload)
  const payload = isBatchHandoffRisk
    ? {
      ...chapterHandoffReview,
      ...taskPayload,
      missed: [
        ...arrayValue(chapterHandoffReview.missed),
        ...arrayValue(taskPayload.missed),
      ],
    }
    : taskPayload
  const isStoryUnit = normalizedKind.includes('story_unit')
  const openingHookScore = metricNumber(payload.opening_hook_score ?? payload.openingHookScore)
  const openingPullRisk = normalizedKind.includes('opening_pull')
    || (openingHookScore !== null && openingHookScore > 0 && openingHookScore < 70)
  const endingHookScore = metricNumber(payload.ending_hook_score ?? payload.endingHookScore)
  const endingPageTurnRisk = normalizedKind.includes('ending_page_turn')
    || (endingHookScore !== null && endingHookScore > 0 && endingHookScore < 70)
  const sceneReadabilityScore = metricNumber(payload.scene_readability_score ?? payload.sceneReadabilityScore)
  const sceneProgressionRisk = normalizedKind.includes('scene_progression')
    || (sceneReadabilityScore !== null && sceneReadabilityScore > 0 && sceneReadabilityScore < 70)
  const payoffDensityScore = metricNumber(payload.payoff_density_score ?? payload.payoffDensityScore)
  const payoffDensityRisk = normalizedKind.includes('payoff_density')
    || (payoffDensityScore !== null && payoffDensityScore > 0 && payoffDensityScore < 70)
  const evidenceGroups = [
    { label: '计划要求', items: limitedArray(payload.planned, payload.required, payload.plan) },
    { label: '已完成', items: limitedArray(payload.completed) },
    {
      label: '漏推',
      items: [
        ...limitedArray(payload.missed, payload.debts),
        ...arrayValue(payload.four_question_missed),
        ...arrayValue(payload.reader_fuel_missed),
      ].slice(0, 6),
    },
    { label: '额外推进', items: limitedArray(payload.unplanned) },
    { label: '单元抢跑', items: isStoryUnit ? limitedArray(payload.rushed_ahead, payload.rushedAhead) : [] },
    { label: '禁抢跑', items: isStoryUnit ? limitedArray(payload.forbidden_touched, payload.forbiddenTouched) : [] },
    { label: '禁揭风险', items: isStoryUnit ? limitedArray(payload.redline_touched, payload.redlineTouched) : limitedArray(payload.forbidden_touched, payload.forbiddenTouched, payload.redline_touched, payload.redlineTouched) },
    { label: '核心偏移', items: limitedArray(payload.drift_risks, payload.risks) },
    { label: '开篇吸引力', items: openingPullRisk ? [`开篇评分：${openingHookScore ?? '-'}`] : [] },
    { label: '章末翻页', items: endingPageTurnRisk ? [`章末评分：${endingHookScore ?? '-'}`] : [] },
    { label: '场景推进', items: sceneProgressionRisk ? [`场景评分：${sceneReadabilityScore ?? '-'}`] : [] },
    { label: '爽点密度', items: payoffDensityRisk ? [`爽点密度评分：${payoffDensityScore ?? '-'}`] : [] },
    { label: '故事力缺口', items: limitedArray(payload.missed, payload.dimensions) },
    { label: '可读性/出戏', items: limitedArray(payload.meme_sense?.immersion_risks, payload.immersion_risks, payload.issues) },
    { label: '建议', items: limitedArray(payload.suggestions, payload.recommendations) },
  ]
    .map(group => ({
      ...group,
      items: group.items.map(summarizeEvidenceItem).filter(Boolean),
    }))
    .filter(group => group.items.length > 0)
  const openingHandoffMissed = arrayValue(payload.missed)
    .filter(isOpeningHandoffMiss)
    .map(summarizeEvidenceItem)
    .filter(Boolean)
  const payloadDeliveryReceipts = objectValue(payload.oh_story_delivery_receipts || payload.ohStoryDeliveryReceipts)
  const taskDeliveryReceipts = objectValue(task.oh_story_delivery_receipts || task.ohStoryDeliveryReceipts)
  const failedReceiptRepairs = normalizeFailedDeliveryRiskReceiptRepairs(
    payloadDeliveryReceipts.delivery_risk_receipts,
    payloadDeliveryReceipts.deliveryRiskReceipts,
    payload.delivery_risk_receipts,
    payload.deliveryRiskReceipts,
    taskDeliveryReceipts.delivery_risk_receipts,
    taskDeliveryReceipts.deliveryRiskReceipts,
    task.delivery_risk_receipts,
    task.deliveryRiskReceipts,
  )

  return {
    source_label: firstText(task.source_label, task.annotation_source, task.annotation_category, '交稿风险'),
    severity: firstText(task.severity),
    annotation_key: firstText(task.annotation_key),
    issue_type: issueType,
    category: firstText(task.annotation_category),
    openingHandoffMissed,
    openingPullRisk,
    openingHookScore,
    endingPageTurnRisk,
    endingHookScore,
    sceneProgressionRisk,
    sceneReadabilityScore,
    payoffDensityRisk,
    payoffDensityScore,
    evidenceGroups,
    failedReceiptRepairs,
    strategy: deliveryRiskStrategy(issueType, firstText(task.annotation_category)),
  }
}

export function normalizeApprovalBlockerRepairContext(task: AnyRecord) {
  const normalizedKind = `${firstText(task.issue_type, task.issueType)} ${firstText(task.annotation_category, task.annotationCategory)}`.toLowerCase()
  const payload = objectValue(task.payload)
  const isApprovalBlocker = normalizedKind.includes('approval_blocker')
    || firstText(task.source_label, task.sourceLabel) === '入库阻断'
    || Boolean(payload.type && firstText(payload.label, payload.type))
  if (!isApprovalBlocker) return null
  const safetyDecision = objectValue(payload.safety_decision || payload.safetyDecision)
  const reasons = [
    ...arrayValue(payload.reasons),
    ...arrayValue(safetyDecision.reasons),
  ].map(item => text(item)).filter(Boolean)
  const copyHitCount = metricNumber(payload.copy_hit_count ?? payload.copyHitCount ?? safetyDecision.copy_hit_count ?? safetyDecision.copyHitCount)
  return {
    type: firstText(payload.type, task.issue_type, task.issueType, 'approval_blocker'),
    label: firstText(payload.label, task.title, task.source_label, task.sourceLabel, '入库阻断'),
    detail: firstText(payload.detail, task.message),
    scoreLabel: firstText(payload.score_label, payload.scoreLabel),
    copyHitCount,
    reasons,
  }
}

export function approvalBlockerNeedsNextChapterQualityPlan(approvalBlocker: ReturnType<typeof normalizeApprovalBlockerRepairContext>) {
  if (!approvalBlocker) return false
  return [
    approvalBlocker.detail,
    approvalBlocker.label,
    approvalBlocker.type,
    ...approvalBlocker.reasons,
  ].some(item => /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失/.test(text(item)))
}

export function qualityContractClosurePlan(
  task: AnyRecord,
  revisionResult: AnyRecord,
  snakeKey: string,
  camelKey: string,
  label: string,
) {
  const annotationKey = firstText(task.annotation_key)
  const quality = objectValue(revisionResult.quality_refresh)
  const qualityOk = quality.ok === true
  const residuals = qualityContractResidualsFromQuality(quality, snakeKey, camelKey, label)
  const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
  if (!qualityOk) {
    return {
      taskStatus: 'needs_review' as const,
      annotationStatus: '' as const,
      annotationKey,
      note: `${label}已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
    }
  }
  if (!residuals.length) {
    return {
      taskStatus: 'resolved' as const,
      annotationStatus: annotationKey ? 'resolved' as const : '' as const,
      annotationKey,
      note: `${label}复检通过${scoreText}，${snakeKey} 已清空。`,
    }
  }
  return {
    taskStatus: 'needs_review' as const,
    annotationStatus: '' as const,
    annotationKey,
    note: `${label}仍未闭环：${residuals.slice(0, 3).join('；')}。`,
  }
}

export * from './support-delivery-closure'
