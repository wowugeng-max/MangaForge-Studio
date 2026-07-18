import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
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
  text,
} from './helpers-basics'
import {
  batchReleaseEvidenceItemsFromPreflight,
  batchRiskIssueBatchKey,
  batchRiskIssueKeys,
  chapterAttractionRiskCount,
  chapterAttractionWeakDimensions,
  chapterBenchmarkRiskCount,
  characterArcRiskCount,
  contractSyncRiskCount,
  coreRiskCount,
  deslopRepairReceiptRiskCount,
  deslopRepairReceiptRiskMessage,
  expectationRiskCount,
  findChapter,
  governanceRecheckRiskCount,
  innovationRiskCount,
  isCompletedRepairRun,
  isResolvedTaskStatus,
  issueTexts,
  latestQualityReviewForChapter,
  latestReviewForChapter,
  numberValue,
  parsePayload,
  payloadReviewChapterId,
  payloadReviewChapterNo,
  payoffDebtCount,
  qualityAuditRepairReceiptRiskCount,
  qualityAuditRepairReceiptRiskMessage,
  qualityReviewPassed,
  readabilityRiskCount,
  recordTime,
  repairTaskIssueType,
  resolvedBatchRiskIssueTypes,
  retentionRiskCount,
  reviewPayload,
  revisionSyncRiskCount,
  revisionSyncRiskMessage,
  riskPayload,
  runwayRiskCount,
  sceneCardReceiptRiskCount,
  sceneCardReceiptRiskMessage,
  sceneCardReceiptRiskTitle,
  signal,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storyUnitRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  syncMissedItems,
  volumeSegmentMissedItems,
  volumeSegmentRiskCount,
} from './helpers-risk-and-governance'

import {
  compactUniqueText,
  finiteNumberOrNull,
  latestRepairAuditEntry,
  recoveryEvidenceProductionGateNextActionFromSource,
  recoveryEvidenceProductionStatusLabel,
  recoveryEvidenceReview,
  recoveryEvidenceSourceMeta,
  recoveryEvidenceSourceSummary,
  recoveryEvidenceSourceTaskStatus
} from './helpers-risk-delivery-and-recovery'

export function buildBatchPlanReview(args: {
  batchPlanContext: AnyRecord | null
  coreReview: AnyRecord | null
  payoffReview: AnyRecord | null
  storylineReview: AnyRecord | null
}) {
  const context = args.batchPlanContext || {}
  const chapterPlan = context.chapter_plan || {}
  const planned = [
    context.batch_goal ? `本批目标：${context.batch_goal}` : '',
    context.reader_payoff_plan ? `读者回报：${context.reader_payoff_plan}` : '',
    context.mainline_focus ? `主线焦点：${context.mainline_focus}` : '',
    context.forbidden_boundary ? `禁抢跑边界：${context.forbidden_boundary}` : '',
    chapterPlan.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
    chapterPlan.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
    chapterPlan.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
  ].filter(Boolean)

  const corePayload = riskPayload(args.coreReview, 'chapter_core_drift')
  const payoffPayload = riskPayload(args.payoffReview, 'reader_payoff_sync')
  const storylinePayload = riskPayload(args.storylineReview, 'storyline_sync')
  const coreRisks = issueTexts([...arrayValue(corePayload?.drift_risks), ...arrayValue(corePayload?.risks)])
  const payoffMissed = issueTexts([...arrayValue(payoffPayload?.missed), ...arrayValue(payoffPayload?.debts)])
  const storylineMissed = issueTexts(arrayValue(storylinePayload?.missed))
  const storylineUnplanned = issueTexts(arrayValue(storylinePayload?.unplanned))
  const forbiddenTouched = issueTexts(arrayValue(storylinePayload?.forbidden_touched))
  const actualRisks = [
    ...coreRisks.map(item => `核心偏移：${item}`),
    ...payoffMissed.map(item => `回报欠账：${item}`),
    ...storylineMissed.map(item => `剧情线漏推：${item}`),
    ...storylineUnplanned.map(item => `额外推进：${item}`),
    ...forbiddenTouched.map(item => `禁揭触碰：${item}`),
  ]

  return {
    planned,
    missed: Array.from(new Set([...payoffMissed, ...storylineMissed])),
    actual_risks: actualRisks,
    forbidden_touched: forbiddenTouched,
    unplanned: storylineUnplanned,
  }
}

export function rhythmFingerprint(value: any) {
  return text(value)
    .replace(/[，。！？、；：,.!?;:\s"'“”‘’《》（）()【】\[\]{}]/g, '')
    .slice(0, 80)
}

export function batchPlanChapterForItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  return arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo)) || null
}

export function repeatedRhythmDimension(args: {
  label: string
  values: string[]
  threshold: number
}) {
  const buckets = new Map<string, { value: string; count: number }>()
  for (const value of args.values) {
    const fingerprint = rhythmFingerprint(value)
    if (!fingerprint || fingerprint.length < 4) continue
    const existing = buckets.get(fingerprint)
    buckets.set(fingerprint, { value: existing?.value || value, count: (existing?.count || 0) + 1 })
  }
  const repeated = Array.from(buckets.values())
    .filter(item => item.count >= args.threshold)
    .sort((a, b) => b.count - a.count)[0]
  if (!repeated) return null
  return {
    label: args.label,
    value: repeated.value,
    count: repeated.count,
    risk: `${args.label}连续 ${repeated.count} 章重复：${repeated.value}`,
  }
}

export function buildSerialRhythmReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  nextBatchBrief?: AnyRecord | null
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  if (successfulItems.length < 3) {
    return {
      status: 'ok' as const,
      score: 88,
      risk_count: 0,
      risks: [],
      evidence: [],
      dimensions: [],
    }
  }
  const rows = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item) || {}
    const raw = parsePayload(chapter.raw_payload || chapter.rawPayload, { owner: chapter, kind: 'chapter', field: chapter.raw_payload ? 'raw_payload' : 'rawPayload' }) || chapter.raw_payload || chapter.rawPayload || {}
    const plan = batchPlanChapterForItem(args.nextBatchBrief, item) || {}
    return {
      chapter_no: item.chapterNo,
      title: item.title,
      conflict: firstText(chapter.conflict, raw.conflict, raw.core_conflict, plan.conflict),
      payoff: firstText(raw.payoff, raw.reader_payoff, raw.readerPayoff, plan.payoff, plan.reader_payoff, plan.readerPayoff, plan.chapter_payoff, plan.chapterPayoff),
      ending_hook: firstText(chapter.ending_hook, chapter.endingHook, chapter.hook, raw.ending_hook, raw.endingHook, raw.hook, plan.ending_hook, plan.endingHook),
      prose_seed: text(chapter.chapter_text).slice(0, 160),
    }
  })
  const threshold = Math.min(successfulItems.length, 3)
  const dimensions = [
    repeatedRhythmDimension({ label: '冲突来源', values: rows.map(row => row.conflict), threshold }),
    repeatedRhythmDimension({ label: '读者回报', values: rows.map(row => row.payoff), threshold }),
    repeatedRhythmDimension({ label: '章末钩子', values: rows.map(row => row.ending_hook), threshold }),
  ].filter(Boolean) as Array<{ label: string; value: string; count: number; risk: string }>

  const riskCount = dimensions.length
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score: Math.max(45, 90 - riskCount * 14),
    risk_count: riskCount,
    risks: dimensions.map(item => item.risk),
    evidence: rows.map(row => `第${row.chapter_no}章：${[row.conflict, row.payoff, row.ending_hook].filter(Boolean).join(' / ')}`).slice(0, 6),
    dimensions,
  }
}

export function assetIntakePayload(review: AnyRecord | null) {
  const payload = reviewPayload(review)
  return payload?.asset_intake || payload?.result?.asset_intake || payload?.result || payload
}

export function assetApplyExistsAfter(args: {
  reviews: AnyRecord[]
  chapter: AnyRecord
  chapterNo: number
  intakeReview: AnyRecord | null
}) {
  const intakeTime = recordTime(args.intakeReview || {})
  return args.reviews.some(review => {
    if (text(review?.review_type) !== 'asset_intake_apply') return false
    if (recordTime(review) < intakeTime) return false
    const payload = reviewPayload(review)
    const reviewChapterId = payload?.chapter_id ?? review?.chapter_id ?? null
    const reviewChapterNo = Number(payload?.chapter_no ?? review?.chapter_no ?? 0)
    const chapterId = args.chapter?.id ?? args.chapter?.chapter_id ?? null
    return chapterId !== null && reviewChapterId !== null
      ? String(chapterId) === String(reviewChapterId)
      : reviewChapterNo === args.chapterNo
  })
}

export function buildAssetGrowthReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const pendingAssets: AnyRecord[] = []
  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const intakeReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'asset_intake')
    if (!intakeReview || assetApplyExistsAfter({ reviews: args.reviews, chapter, chapterNo: item.chapterNo, intakeReview })) continue
    const payload = assetIntakePayload(intakeReview)
    const appliedNames = new Set(arrayValue(payload?.applied_asset_names).map(name => text(name)).filter(Boolean))
    for (const asset of arrayValue(payload?.discovered_assets)) {
      const name = text(asset?.name)
      if (!name || appliedNames.has(name)) continue
      pendingAssets.push({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId,
        entity_type: text(asset?.entity_type || asset?.type, 'unknown'),
        name,
        summary: text(asset?.summary),
      })
    }
  }
  const budget = Math.max(3, successfulItems.length * 2)
  const overBudget = Math.max(0, pendingAssets.length - budget)
  const typeCounts = pendingAssets.reduce((acc: Record<string, number>, asset) => {
    const type = text(asset.entity_type, 'unknown')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  return {
    status: overBudget > 0 ? 'warn' as const : 'ok' as const,
    budget,
    pending_count: pendingAssets.length,
    over_budget_count: overBudget,
    pending_assets: pendingAssets,
    type_counts: typeCounts,
    summary: overBudget > 0
      ? `本批发现 ${pendingAssets.length} 个新资产，超过预算 ${budget} 个。`
      : `本批新资产 ${pendingAssets.length}/${budget}，仍在预算内。`,
  }
}

export function isChapterHandoffMiss(item: AnyRecord) {
  const key = text(item?.key || item?.type || item?.kind).toLowerCase()
  const scope = text(item?.match_scope || item?.matchScope || item?.scope).toLowerCase()
  const content = [
    key,
    scope,
    text(item?.label || item?.title || item?.name),
    text(item?.text || item?.description || item?.reason),
  ].join(' ').toLowerCase()
  if (['opening_handoff', 'previous_handoff', 'chapter_handoff'].some(token => content.includes(token))) return true
  if (content.includes('handoff') && (content.includes('opening') || content.includes('previous') || content.includes('chapter'))) return true
  if (content.includes('上一章承接') || content.includes('上章承接') || content.includes('开篇承接') || content.includes('章节交接')) return true
  return scope === 'opening' && (content.includes('承接') || content.includes('上一章') || content.includes('上章'))
}

export function chapterHandoffMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'reader_expectation_sync').filter(isChapterHandoffMiss)
}

export function chapterHandoffRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return chapterHandoffMissedItems(review).length
}

export function buildChapterHandoffReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
}) {
  const missed = chapterHandoffMissedItems(args.expectationReview)
  return {
    status: missed.length > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missed.length,
    missed,
    label: missed.length > 0 ? `章节交接漏接 ${missed.length}` : '章节交接正常',
  }
}

export function buildReaderPullReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
  retentionReview: AnyRecord | null
}) {
  const expectationPayload = riskPayload(args.expectationReview, 'reader_expectation_sync')
  const retentionPayload = riskPayload(args.retentionReview, 'reader_retention_sync')
  const expectationCount = expectationRiskCount(args.expectationReview)
  const retentionCount = retentionRiskCount(args.retentionReview)
  const missed = [
    ...syncMissedItems(args.expectationReview, 'reader_expectation_sync'),
    ...syncMissedItems(args.retentionReview, 'reader_retention_sync'),
  ]
  return {
    status: expectationCount + retentionCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    expectation_count: expectationCount,
    retention_count: retentionCount,
    missed_count: expectationCount + retentionCount,
    missed,
    expectation_label: firstText(expectationPayload?.label, expectationCount > 0 ? `期待欠账 ${expectationCount}` : ''),
    retention_label: firstText(retentionPayload?.label, retentionCount > 0 ? `追读漏项 ${retentionCount}` : ''),
  }
}

export function buildStoryDriveReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'story_drive_sync')
  const count = storyDriveRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'story_drive_sync'),
    label: firstText(payload?.label, count > 0 ? `故事力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildCharacterArcReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'character_arc_sync')
  const count = characterArcRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'character_arc_sync'),
    label: firstText(payload?.label, count > 0 ? `人物弧光缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildStyleSampleReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'style_sample_sync')
  const count = styleSampleRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'style_sample_sync'),
    copied_phrases: arrayValue(payload?.copied_phrases || payload?.copiedPhrases).map(item => text(item)).filter(Boolean),
    label: firstText(payload?.label, count > 0 ? `风格缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildChapterBenchmarkReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_benchmark_sync')
  const count = chapterBenchmarkRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'chapter_benchmark_sync'),
    label: firstText(payload?.label, count > 0 ? `标杆章缺口 ${count}` : ''),
    score: numberValue(payload?.score),
    next_actions: arrayValue(payload?.next_actions || payload?.nextActions).map(item => text(item)).filter(Boolean),
  }
}

export function buildContractSyncReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
  payloadKey: string
  fallbackLabel: string
}) {
  const payload = riskPayload(args.review, args.payloadKey)
  const count = contractSyncRiskCount(args.review, args.payloadKey)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, args.payloadKey),
    label: firstText(payload?.label, count > 0 ? `${args.fallbackLabel} ${count}` : ''),
    summary: text(payload?.summary),
    next_actions: arrayValue(payload?.next_actions || payload?.nextActions).map(item => text(item)).filter(Boolean),
  }
}

export function buildChapterAttractionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_attraction_review')
  const count = chapterAttractionRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    weak_count: count,
    weak_dimensions: chapterAttractionWeakDimensions(payload).map((item: any) => ({
      key: firstText(item?.key, item?.type),
      label: firstText(item?.label, item?.title, item?.key, '吸引力缺口'),
      status: firstText(item?.status),
      score: numberValue(item?.score),
      issue: firstText(item?.issue, item?.text, item?.reason, item?.repair_instruction, item?.repairInstruction),
    })),
    dimensions: arrayValue(payload?.dimensions),
    priority_repair: firstText(payload?.priority_repair, payload?.priorityRepair),
    label: firstText(payload?.label, count > 0 ? `吸引力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildInnovationExecutionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'innovation_sync')
  const count = innovationRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'innovation_sync'),
    label: firstText(payload?.label, count > 0 ? `创新缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildVolumeSegmentReview(args: {
  planning?: PlanningWorkspaceModel | null
  item: AutoCreationBatchReviewItem
  chapter?: AnyRecord | null
  review: AnyRecord | null
}) {
  const planning = args.planning
  const payload = riskPayload(args.review, 'volume_beat_sync')
  const gate = planning?.volumeSegmentGate || null
  const gateSignals = arrayValue(gate?.signals).filter(signal => text(signal?.status) !== 'ok')
  const raw = parsePayload(args.chapter?.raw_payload || args.chapter?.rawPayload, { owner: args.chapter, kind: 'chapter', field: args.chapter?.raw_payload ? 'raw_payload' : 'rawPayload' }) || args.chapter?.raw_payload || args.chapter?.rawPayload || {}
  const planned = [
    firstText(planning?.topStatus?.currentVolume) ? `当前卷：${firstText(planning?.topStatus?.currentVolume)}` : '',
    firstText(planning?.topStatus?.currentStage) ? `当前阶段：${firstText(planning?.topStatus?.currentStage)}` : '',
    firstText(planning?.mainline?.currentVolumeGoal) ? `当前卷目标：${firstText(planning?.mainline?.currentVolumeGoal)}` : '',
    firstText(planning?.mainline?.currentStageConflict) ? `阶段冲突：${firstText(planning?.mainline?.currentStageConflict)}` : '',
    ...gateSignals.map(signal => `${firstText(signal?.label, signal?.key)}：${firstText(signal?.detail)}`).filter(Boolean),
  ].filter(Boolean)
  const actual = [
    firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)
      ? `本章主线进度：${firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)}`
      : '',
    firstText(args.chapter?.conflict, raw?.conflict) ? `本章冲突：${firstText(args.chapter?.conflict, raw?.conflict)}` : '',
    firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff) ? `本章回报：${firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff)}` : '',
  ].filter(Boolean)
  const missed = volumeSegmentMissedItems(args.review)
  const missedCount = volumeSegmentRiskCount(args.review)
  return {
    status: missedCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missedCount,
    planned,
    actual,
    missed,
    gate_summary: firstText(gate?.summary),
    review_label: firstText(payload?.label, missedCount > 0 ? `卷级阶段漏兑现 ${missedCount}` : '卷级阶段正常'),
  }
}

export function batchRepairTask(args: {
  item: AutoCreationBatchReviewItem
  issueType: string
  taskType?: string
  severity: 'high' | 'medium'
  message: string
  action: string
  metrics: AnyRecord
  batchPlanContext?: AnyRecord | null
  batchPlanReview?: AnyRecord | null
  serialRhythmReview?: AnyRecord | null
  assetGrowthReview?: AnyRecord | null
  volumeSegmentReview?: AnyRecord | null
  readerTrialReview?: AnyRecord | null
  readerPullReview?: AnyRecord | null
  first30Retention?: AnyRecord | null
  chapterHandoffReview?: AnyRecord | null
  storyDriveSync?: AnyRecord | null
  characterArcSync?: AnyRecord | null
  innovationReview?: AnyRecord | null
  chapterAttractionReview?: AnyRecord | null
  chapterBenchmarkSync?: AnyRecord | null
  intentConfirmationSync?: AnyRecord | null
  benchmarkRecallSync?: AnyRecord | null
  styleSampleSync?: AnyRecord | null
  batchChecklistExecution?: AnyRecord | null
  recoveryEvidenceReview?: AnyRecord | null
  recoveryEvidenceRegovernanceQueue?: AnyRecord | null
  strengthenedRepairAcceptanceReview?: AnyRecord | null
  safeBatchExpansionSegmentReview?: AnyRecord | null
  safeBatchExpansionStructureReview?: AnyRecord | null
  safeBatchExpansionStructureValidationResult?: AnyRecord | null
  safeBatchExpansionStructureDecisionReview?: AnyRecord | null
  postBatchQualityCheck?: AnyRecord | null
  actionArea?: string
  actionKey?: string
}) {
  return {
    task_type: args.taskType || 'repair_quality',
    issue_type: args.issueType,
    severity: args.severity,
    chapter_id: args.item.chapterId || null,
    chapter_no: args.item.chapterNo,
    title: `第${args.item.chapterNo}章《${args.item.title}》批次风险修复`,
    message: args.message,
    action: args.action,
    acceptance_criteria: [
      '质量复检通过且分数不低于78',
      '核心冲突、读者回报和章末钩子重新落地',
      '故事状态、剧情线和回报债务复盘后无新增警告',
    ],
    task_status: 'open',
    source: 'auto_creation_safe_batch_risk',
    metrics: args.metrics,
    ...(args.actionArea ? { action_area: args.actionArea } : {}),
    ...(args.actionKey ? { action_key: args.actionKey } : {}),
    ...(args.batchPlanContext ? { batch_plan_context: args.batchPlanContext } : {}),
    ...(args.batchPlanReview ? { batch_plan_review: args.batchPlanReview } : {}),
    ...(args.serialRhythmReview ? { serial_rhythm_review: args.serialRhythmReview } : {}),
    ...(args.assetGrowthReview ? { asset_growth_review: args.assetGrowthReview } : {}),
    ...(args.volumeSegmentReview ? { volume_segment_review: args.volumeSegmentReview } : {}),
    ...(args.readerTrialReview ? { reader_trial_review: args.readerTrialReview } : {}),
    ...(args.readerPullReview ? { reader_pull_review: args.readerPullReview } : {}),
    ...(args.first30Retention ? { first30_retention: args.first30Retention } : {}),
    ...(args.chapterHandoffReview ? { chapter_handoff_review: args.chapterHandoffReview } : {}),
    ...(args.storyDriveSync ? { story_drive_sync: args.storyDriveSync } : {}),
    ...(args.characterArcSync ? { character_arc_sync: args.characterArcSync } : {}),
    ...(args.innovationReview ? { innovation_review: args.innovationReview } : {}),
    ...(args.chapterAttractionReview ? { chapter_attraction_review: args.chapterAttractionReview } : {}),
    ...(args.chapterBenchmarkSync ? { chapter_benchmark_sync: args.chapterBenchmarkSync } : {}),
    ...(args.intentConfirmationSync ? { intent_confirmation_sync: args.intentConfirmationSync } : {}),
    ...(args.benchmarkRecallSync ? { benchmark_recall_sync: args.benchmarkRecallSync } : {}),
    ...(args.styleSampleSync ? { style_sample_sync: args.styleSampleSync } : {}),
    ...(args.batchChecklistExecution ? { batch_checklist_execution: args.batchChecklistExecution } : {}),
    ...(args.recoveryEvidenceReview ? { recovery_evidence_review: args.recoveryEvidenceReview } : {}),
    ...(args.recoveryEvidenceRegovernanceQueue ? {
      recovery_evidence_regovernance_queue: args.recoveryEvidenceRegovernanceQueue,
      recoveryEvidenceGovernanceQueue: args.recoveryEvidenceRegovernanceQueue,
    } : {}),
    ...(args.strengthenedRepairAcceptanceReview ? {
      strengthened_repair_acceptance_review: args.strengthenedRepairAcceptanceReview,
    } : {}),
    ...(args.safeBatchExpansionSegmentReview ? {
      safe_batch_expansion_segment_review: args.safeBatchExpansionSegmentReview,
    } : {}),
    ...(args.safeBatchExpansionStructureReview ? {
      safe_batch_expansion_structure_review: args.safeBatchExpansionStructureReview,
    } : {}),
    ...(args.safeBatchExpansionStructureValidationResult ? {
      safe_batch_expansion_structure_validation_result: args.safeBatchExpansionStructureValidationResult,
    } : {}),
    ...(args.safeBatchExpansionStructureDecisionReview ? {
      safe_batch_expansion_structure_decision_review: args.safeBatchExpansionStructureDecisionReview,
    } : {}),
    ...(args.postBatchQualityCheck ? { post_batch_quality_check: args.postBatchQualityCheck } : {}),
  }
}

export function batchRiskIssueResolvedForBatch(keys: Set<string> | undefined, issueType: string) {
  return Boolean(keys?.has(batchRiskIssueBatchKey(issueType)))
}

export function batchRiskIssueResolved(keys: Set<string> | undefined, item: { chapterId: any; chapterNo: number }, issueType: string) {
  if (!keys) return false
  return batchRiskIssueKeys(item, issueType).some(key => keys.has(key))
}

export function recoveryEvidenceRiskMatches(evidence: string, counts: {
  payoffDebtTotal: number
  readerPullRiskTotal: number
  storylineRiskTotal: number
  styleSampleRiskTotal: number
  batchPlanRiskTotal: number
  batchChecklistRiskTotal: number
}) {
  const riskLabels: string[] = []
  const normalized = evidence.toLowerCase()
  if (normalized.includes('样章') || normalized.includes('风格')) {
    if (counts.styleSampleRiskTotal > 0) riskLabels.push(`风格样章缺口 ${counts.styleSampleRiskTotal} 项`)
  }
  if (normalized.includes('读者回报') || normalized.includes('回报') || normalized.includes('追读') || normalized.includes('读者拉力')) {
    const count = counts.payoffDebtTotal + counts.readerPullRiskTotal
    if (count > 0) riskLabels.push(`读者回报/拉力风险 ${count} 项`)
  }
  if (normalized.includes('主线') || normalized.includes('剧情线')) {
    const count = counts.storylineRiskTotal + counts.batchPlanRiskTotal
    if (count > 0) riskLabels.push(`主线/剧情线风险 ${count} 项`)
  }
  if (normalized.includes('批次任务书') || normalized.includes('开工清单') || normalized.includes('安全批次')) {
    const count = counts.batchPlanRiskTotal + counts.batchChecklistRiskTotal
    if (count > 0) riskLabels.push(`批次计划/开工清单风险 ${count} 项`)
  }
  if (
    normalized.includes('治理复查')
    || normalized.includes('恢复复查')
    || normalized.includes('生产阻断已解除')
    || normalized.includes('治理队列已闭环')
    || normalized.includes('放行摘要')
  ) {
    const count = counts.payoffDebtTotal
      + counts.readerPullRiskTotal
      + counts.storylineRiskTotal
      + counts.styleSampleRiskTotal
      + counts.batchPlanRiskTotal
      + counts.batchChecklistRiskTotal
    if (count > 0) riskLabels.push(`恢复依据来源继承风险 ${count} 项`)
  }
  return riskLabels
}

export function buildRecoveryEvidenceReview(args: {
  preflight?: AnyRecord | null
  counts: {
    payoffDebtTotal: number
    readerPullRiskTotal: number
    storylineRiskTotal: number
    styleSampleRiskTotal: number
    batchPlanRiskTotal: number
    batchChecklistRiskTotal: number
  }
}) {
  const evidenceItems = batchReleaseEvidenceItemsFromPreflight(args.preflight)
  const evidence = Array.from(new Set(evidenceItems.map(item => item.evidence).filter(Boolean)))
  const failedItems = evidenceItems
    .map(item => ({
      ...item,
      risk_labels: recoveryEvidenceRiskMatches(item.evidence, args.counts),
    }))
    .filter(item => item.risk_labels.length > 0)

  return {
    visible: evidence.length > 0,
    status: failedItems.length > 0 ? 'warn' as const : 'ok' as const,
    evidence,
    failed_evidence: failedItems.map(item => item.evidence),
    failed_items: failedItems,
    summary: failedItems.length > 0
      ? `恢复放行依据 ${failedItems.length} 项未被本批交稿兑现：${failedItems.map(item => item.evidence).slice(0, 3).join('；')}`
      : evidence.length > 0 ? '恢复放行依据已被本批交稿复盘接住。' : '本批没有恢复放行依据。',
  }
}
