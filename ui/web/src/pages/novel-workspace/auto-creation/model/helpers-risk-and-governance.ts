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
  text,
} from './helpers-basics'

export function rhythmNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.longformRhythm && planning.longformRhythm.status !== 'ready')
}

export function volumeBeatNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.volumeBeatBudget && planning.volumeBeatBudget.status !== 'ready')
}

export function rhythmAction(planning: PlanningWorkspaceModel): PlanningActionKey {
  const signal = planning.longformRhythm?.signals?.find(item => item.status === 'block')
    || planning.longformRhythm?.signals?.find(item => item.status === 'warn')
  return (signal?.actionKey || 'longform_pressure') as PlanningActionKey
}

export function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(text(value).toLowerCase())
}

export function isCompletedRepairRun(run: AnyRecord) {
  return ['completed', 'success', 'done'].includes(text(run?.status).toLowerCase())
}

import {
  batchRiskIssueBatchKey,
  batchRiskIssueKeys,
  repairTaskIssueType,
  resolvedBatchRiskIssueTypes,
} from './helpers-risk-issue-catalog'

export * from './helpers-risk-issue-catalog'
export * from './helpers-risk-shared'
export * from './helpers-risk-review-signals'
import {
  BATCH_DELIVERY_QUALITY_THRESHOLD,
  issueText,
  issueTexts,
  numberValue,
  parsePayload,
  recordTime,
} from './helpers-risk-shared'
import {
  boolValue,
  riskPayload,
  reviewPayload,
  riskCountFromStatus,
  sceneCardReceiptCheckText,
  sceneCardReceiptCheckFailed,
  sceneCardReceiptRiskChecks,
  sceneCardReceiptRiskCount,
  sceneCardReceiptRiskTitle,
  sceneCardReceiptRiskMessage,
  qualityAuditCheckText,
  qualityAuditCheckFailed,
  qualityAuditRiskChecks,
  qualityAuditRiskMessageFromChecks,
  qualityAuditRiskHigh,
  uniqueObjectReferences,
  deliveryReceiptsFrom,
  preDraftExecutionReceiptSections,
  preDraftExecutionCheckNeedsRepair,
  preDraftExecutionRiskChecks,
  preDraftExecutionRiskMessage,
  sourceStateCheckNeedsRepair,
  sourceStateRiskChecks,
  sourceStateRiskMessage,
  qualityAuditRepairReceiptRiskCount,
  qualityAuditRepairReceiptRiskMessage,
  deslopRepairReceiptRiskCount,
  deslopRepairReceiptRiskMessage,
  revisionSyncRiskCount,
  revisionSyncRiskMessage,
  coreRiskCount,
  runwayRiskCount,
  payoffDebtCount,
  expectationRiskCount,
  storylineRiskCount,
  storyUnitRiskCount,
  storyDriveRiskCount,
  characterArcRiskCount,
  readabilityRiskCount,
  styleSampleRiskCount,
  chapterBenchmarkRiskCount,
  contractSyncRiskCount,
  chapterAttractionWeakDimensions,
  chapterAttractionRiskCount,
  governanceRecheckRiskCount,
  readerTrialReport,
  latestReaderTrialReview,
  chapterNosFromText,
  readerTrialAppliesToBatch,
  readerTrialBatchReview,
  retentionRiskCount,
  innovationRiskCount,
  signatureSceneRiskCount,
  payloadReviewChapterId,
  payloadReviewChapterNo,
  deliveryRiskAnnotationKey,
  resolvedAnnotationKeys,
  clearedDeliveryRiskChapterKeys,
} from './helpers-risk-review-signals'


export function recoveryEvidenceReleaseSummaryFromPreflight(preflight: AnyRecord | null | undefined) {
  return parsePayload(preflight?.recovery_evidence_release_summary || preflight?.recoveryEvidenceReleaseSummary)
    || preflight?.recovery_evidence_release_summary
    || preflight?.recoveryEvidenceReleaseSummary
    || null
}

export function isStrengthenedRepairReleaseEvidence(value: any) {
  const normalized = text(value)
  return normalized.includes('强化深修') || normalized.includes('强化复检')
}

export function volumeSegmentMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'volume_beat_sync')
}

export function volumeSegmentRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'volume_beat_sync')
  const explicit = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (explicit !== null) return explicit
  const missed = volumeSegmentMissedItems(review).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function syncMissedItems(review: AnyRecord | null, payloadKey: string) {
  const payload = riskPayload(review, payloadKey)
  return [
    ...arrayValue(payload?.missed),
    ...arrayValue(payload?.debts),
  ].map(item => {
    if (typeof item === 'string') {
      return { label: text(item), text: text(item) }
    }
    return {
      key: firstText(item?.key, item?.id, item?.type, item?.kind),
      match_scope: firstText(item?.match_scope, item?.matchScope, item?.scope),
      label: firstText(item?.label, item?.title, item?.name, item?.key, item?.type, item?.text),
      text: firstText(item?.text, item?.description, item?.reason, item?.expected_state_change, item?.expectedStateChange, item?.label, item?.title, item?.name),
    }
  }).filter(item => item.label || item.text)
}

export function proseText(chapter?: AnyRecord | null) {
  return text(chapter?.chapter_text || chapter?.chapterText)
}

export function hasDeliveredProse(chapter?: AnyRecord | null) {
  const content = proseText(chapter)
  return Boolean(content && !content.includes('【占位正文】'))
}

export function payloadChapterId(payload: AnyRecord) {
  return payload?.chapter_id ?? payload?.chapterId ?? payload?.chapter?.id ?? payload?.chapter?.chapter_id ?? null
}

export function payloadChapterNo(payload: AnyRecord) {
  return Number(payload?.chapter_no ?? payload?.chapterNo ?? payload?.chapter?.chapter_no ?? payload?.chapter?.chapterNo ?? 0)
}

export function reviewMatchesChapter(review: AnyRecord, chapter: AnyRecord, fallbackChapterNo: number) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const reviewChapterId = review?.chapter_id ?? review?.chapterId ?? payloadChapterId(payload)
  const reviewChapterNo = Number(review?.chapter_no ?? review?.chapterNo ?? payloadChapterNo(payload))
  const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
  if (chapterId !== null && chapterId !== undefined && reviewChapterId !== null && reviewChapterId !== undefined) {
    return String(reviewChapterId) === String(chapterId)
  }
  return reviewChapterNo > 0 && reviewChapterNo === fallbackChapterNo
}

export function qualityPayload(review?: AnyRecord | null) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  return payload?.review || payload?.result?.review || payload?.result || payload
}

export function latestQualityReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number) {
  return reviews
    .filter(review => text(review?.review_type) === 'prose_quality')
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function latestReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number, reviewType: string) {
  return reviews
    .filter(review => text(review?.review_type) === reviewType)
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function qualityReviewPassed(review?: AnyRecord | null) {
  if (!review) return false
  const quality = qualityPayload(review)
  const passed = quality?.passed
  const needsRevision = quality?.needs_revision ?? quality?.needsRevision
  const scoreValue = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  if (passed === false || needsRevision === true) return false
  if (Number.isFinite(score)) return Number(score) >= BATCH_DELIVERY_QUALITY_THRESHOLD
  return passed === true
}

export function findChapter(chapters: AnyRecord[], item: { chapterId: any; chapterNo: number }) {
  return chapters.find(chapter => {
    const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
    return item.chapterId !== null && item.chapterId !== undefined && chapterId !== null && chapterId !== undefined
      ? String(chapterId) === String(item.chapterId)
      : Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) === item.chapterNo
  }) || null
}

export function batchChapterDelivered(args: {
  item: { chapterId: any; chapterNo: number; status: AutoCreationBatchReviewItemStatus }
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState: AnyRecord
}) {
  if (args.item.status !== 'success') return false
  const chapter = findChapter(args.chapters, args.item)
  if (!chapter || !hasDeliveredProse(chapter)) return false
  if (Number(args.storyState?.last_updated_chapter || 0) < Number(args.item.chapterNo || 0)) return false
  return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, args.item.chapterNo))
}

export function recoveryEvidenceEventTime(value: any) {
  const timestamp = Date.parse(text(value))
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function buildResolvedBatchRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  batchCreatedAt: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const batchCreatedAt = text(args.batchCreatedAt)
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => !batchCreatedAt || text(entry.input?.batch_created_at) === batchCreatedAt)
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const runCompletedAt = Date.parse(text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at))
    const repairTime = Number.isFinite(runCompletedAt) ? runCompletedAt : recordTime(entry.run)
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const issueType = repairTaskIssueType(task)
      if (!issueType) continue
      const taskChapterId = task?.chapter_id ?? task?.chapterId ?? null
      const taskChapterNo = Number(task?.chapter_no ?? task?.chapterNo ?? 0)
      const taskResolvedAt = Date.parse(text(task?.resolved_at || task?.updated_at || task?.created_at))
      const resolvedAfter = Number.isFinite(taskResolvedAt) ? Math.max(repairTime, taskResolvedAt) : repairTime
      if (issueType === 'post_batch_quality_warning' && !taskChapterId && !taskChapterNo) {
        const rawQualityCheck = task?.post_batch_quality_check || task?.postBatchQualityCheck || {}
        const targetChapterNos = arrayValue(rawQualityCheck.chapter_nos || rawQualityCheck.chapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0)
        const targetChapters = targetChapterNos
          .map(chapterNo => findChapter(args.chapters, { chapterId: null, chapterNo }))
          .filter(Boolean)
        const allTargetsRechecked = targetChapters.length > 0 && targetChapters.length === targetChapterNos.length && targetChapters.every((chapter: AnyRecord) => {
          const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)
          const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
          return qualityReviewPassed(latestQuality) && recordTime(latestQuality || {}) > resolvedAfter
        })
        if (allTargetsRechecked) {
          resolvedKeys.add(batchRiskIssueBatchKey(issueType))
          for (const chapter of targetChapters) {
            const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)
            for (const key of batchRiskIssueKeys({ chapterId: chapter?.id ?? chapter?.chapter_id ?? null, chapterNo }, issueType)) {
              resolvedKeys.add(key)
            }
          }
        }
        continue
      }
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue
      for (const resolvedIssueType of resolvedBatchRiskIssueTypes(issueType)) {
        for (const key of batchRiskIssueKeys({
          chapterId: chapter?.id ?? chapter?.chapter_id ?? taskChapterId,
          chapterNo,
        }, resolvedIssueType)) {
          resolvedKeys.add(key)
        }
      }
    }
  }

  return resolvedKeys
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function batchRiskLabels(riskRadar: AutoCreationBatchRiskRadar) {
  return [
    riskRadar.lowQualityCount > 0 ? '质检低分' : '',
    riskRadar.coreRiskCount > 0 ? '核心偏移' : '',
    riskRadar.runwayRiskCount > 0 ? '航线风险' : '',
    riskRadar.payoffDebtCount > 0 ? '回报欠账' : '',
    riskRadar.readerPullRiskCount > 0 ? '读者拉力' : '',
    riskRadar.readerTrialRiskCount > 0 ? '试读' : '',
    riskRadar.first30RetentionRiskCount > 0 ? '前30章' : '',
    riskRadar.handoffRiskCount > 0 ? '章节交接' : '',
    riskRadar.storylineRiskCount > 0 ? '剧情线' : '',
    riskRadar.storyDriveRiskCount > 0 ? '故事力' : '',
    riskRadar.characterArcRiskCount > 0 ? '人物弧光' : '',
    riskRadar.innovationRiskCount > 0 ? '创新/IP' : '',
    riskRadar.signatureSceneRiskCount > 0 ? '强场面' : '',
    riskRadar.chapterAttractionRiskCount > 0 ? '吸引力' : '',
    riskRadar.chapterBenchmarkRiskCount > 0 ? '标杆章' : '',
    riskRadar.styleSampleRiskCount > 0 ? '风格' : '',
    riskRadar.preDraftExecutionRiskCount > 0 ? '写前执行' : '',
    riskRadar.readabilityRiskCount > 0 ? '可读性' : '',
    riskRadar.serialRhythmRiskCount > 0 ? '连载节奏' : '',
    riskRadar.assetGrowthRiskCount > 0 ? '新资产' : '',
    riskRadar.volumeSegmentRiskCount > 0 ? '卷级阶段' : '',
    riskRadar.batchPlanRiskCount > 0 ? '批次计划' : '',
    riskRadar.batchChecklistRiskCount > 0 ? '开工清单' : '',
    riskRadar.recoveryEvidenceRiskCount > 0 ? '恢复依据' : '',
    riskRadar.strengthenedRepairAcceptanceRiskCount > 0 ? '强化复盘' : '',
    riskRadar.safeBatchExpansionSegmentRiskCount > 0 ? '扩批分段' : '',
    riskRadar.safeBatchExpansionStructureValidationRiskCount > 0 ? '扩批结构' : '',
    riskRadar.safeBatchExpansionStructureDecisionRiskCount > 0 ? '扩批结构决策' : '',
  ].filter(Boolean)
}

export function recoveryEvidenceProductionGateSourceAction(source: AnyRecord) {
  const key = text(source?.source || source?.sourceMode)
  if (key === 'single_chapter_governance_recheck') {
    return { action: 'single_chapter_governance_recheck', label: '复检单章' }
  }
  if (key === 'safe_batch_recovery_recheck') {
    return { action: 'safe_batch_recovery_recheck', label: '复盘批次' }
  }
  return { action: 'review_governance_closure', label: '治理复查台' }
}

export function uniqueRecoveryEvidenceItems(items: AnyRecord[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const evidence = text(item?.evidence)
    if (!evidence) return false
    const key = [
      text(item?.source),
      text(item?.source_detail || item?.sourceDetail),
      evidence,
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function capacityTargetBand(targetWords: number) {
  if (targetWords >= 8000000) return '1000万字级'
  if (targetWords >= 3000000) return '300万字级'
  if (targetWords >= 1000000) return '百万字级'
  return '长篇'
}

export function signalStatusFromScore(score: number, warnAt = 80, blockAt = 55): AutoCreationBatchGuardrailSignalStatus {
  if (score < blockAt) return 'block'
  if (score < warnAt) return 'warn'
  return 'ok'
}

export function capacityFuelLabel(key: AutoCreationLongformCapacitySignal['key']) {
  if (key === 'future_reserve') return '补未来100章'
  if (key === 'storyline_pool') return '补剧情线池'
  if (key === 'volume_runway') return '延长当前卷跑道'
  return '校准节奏耐力'
}

export function signal(label: string, status: AutoCreationBatchGuardrailSignalStatus, detail: string): AutoCreationBatchGuardrailSignal {
  return { label, status, detail }
}

export function batchPipelineStatus(status: AutoCreationBatchGuardrailStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'active'
  if (status === 'caution') return 'warning'
  return 'blocked'
}

export function future100ReserveStatus(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignalStatus {
  const coverage = planning.topStatus.future100Coverage
  if (coverage.ready) return 'ok'
  if (Number(coverage.planned || 0) >= 10) return 'warn'
  return 'block'
}

export const DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS = [
  { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
  { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
  { key: 'default_lane_payoff_density', label: '回报密度' },
  { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
]

export function normalizeDefaultFiveChapterLaneTemplateFailedRequirements(source: AnyRecord | null | undefined) {
  return arrayValue(source?.failed_requirements || source?.failedRequirements || source?.template_version_failed_requirements || source?.templateVersionFailedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason || item?.reason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
}

export function compactChapterNoEvidence(chapterNos: number[]) {
  if (!chapterNos.length) return ''
  const visibleNos = chapterNos.slice(0, 6).join('、')
  return `第${visibleNos}${chapterNos.length > 6 ? `等${chapterNos.length}章` : '章'}`
}

export function batchReleaseEvidenceItemsFromPreflight(preflight: AnyRecord | null | undefined) {
  const closure = preflight?.storyline_decision_closure || preflight?.storylineDecisionClosure || null
  const governanceMemory = parsePayload(preflight?.governance_recheck_memory || preflight?.governanceRecheckMemory)
    || preflight?.governance_recheck_memory
    || preflight?.governanceRecheckMemory
    || null
  const productionGate = parsePayload(preflight?.recovery_evidence_production_gate || preflight?.recoveryEvidenceProductionGate)
    || preflight?.recovery_evidence_production_gate
    || preflight?.recoveryEvidenceProductionGate
    || null
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const recoveryEvidence = [
    ...arrayValue(preflight?.recovery_evidence),
    ...arrayValue(preflight?.recoveryEvidence),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'recovery_evidence',
    source_label: '恢复放行依据',
    source_detail: '安全连写预检 · 恢复放行依据',
    source_action: 'create_safe_batch_risk_repair',
    source_action_label: '按批次修订',
  }))
  const productionGateEvidence = arrayValue(productionGate?.sources)
    .filter(source => text(source?.status) === 'cleared')
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const statusLabel = firstText(source?.status_label, source?.statusLabel, '生产阻断已解除')
      const action = recoveryEvidenceProductionGateSourceAction(source)
      return label ? {
        evidence: `${label}：${statusLabel}`,
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: [label, statusLabel].filter(Boolean).join(' · '),
        source_action: action.action,
        source_action_label: action.label,
        production_gate_source: text(source?.source || source?.sourceMode),
      } : null
    })
    .filter(Boolean)
  const releaseNextBatchLabel = firstText(releaseSummary?.next_batch_label, releaseSummary?.nextBatchLabel)
  const releaseAllowedChapters = [
    ...arrayValue(releaseSummary?.allowed_chapter_nos),
    ...arrayValue(releaseSummary?.allowedChapterNos),
  ].map(item => text(item)).filter(Boolean)
  const releaseDetailBase = [
    '放行摘要',
    releaseNextBatchLabel,
    releaseAllowedChapters.length ? `放行章节 ${releaseAllowedChapters.join('、')}` : '',
  ].filter(Boolean).join(' · ')
  const releaseClearedSourceItems = arrayValue(releaseSummary?.cleared_sources || releaseSummary?.clearedSources)
    .filter(source => !text(source?.status) || text(source?.status) === 'cleared' || text(source?.status) === 'released')
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const statusLabel = firstText(source?.status_label, source?.statusLabel, '生产阻断已解除')
      const action = recoveryEvidenceProductionGateSourceAction(source)
      return label ? {
        evidence: `${label}：${statusLabel}`,
        source: 'recovery_evidence_release_summary',
        source_label: '安全连写放行摘要',
        source_detail: [
          releaseDetailBase,
          label,
          statusLabel,
        ].filter(Boolean).join(' · '),
        source_action: action.action,
        source_action_label: action.label,
        production_gate_source: text(source?.source || source?.sourceMode),
        chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
        source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
      } : null
    })
    .filter(Boolean)
  const releaseClearedEvidenceSet = new Set(releaseClearedSourceItems.map(item => text(item?.evidence)).filter(Boolean))
  const releaseSummaryEvidence = [
    ...arrayValue(releaseSummary?.evidence),
    ...arrayValue(releaseSummary?.release_evidence),
    ...arrayValue(releaseSummary?.releaseEvidence),
  ].map(item => text(item)).filter(Boolean)
    .filter(item => !releaseClearedEvidenceSet.has(item))
    .filter(item => !isStrengthenedRepairReleaseEvidence(item))
    .map(item => ({
      evidence: item,
      source: 'recovery_evidence_release_summary',
      source_label: '安全连写放行摘要',
      source_detail: releaseDetailBase || '放行摘要',
      source_action: 'review_governance_closure',
      source_action_label: '治理复查台',
    }))
  const repairedMemoryEvidence = [
    ...arrayValue(governanceMemory?.evidence),
    ...arrayValue(governanceMemory?.repaired_evidence),
    ...arrayValue(governanceMemory?.repairedEvidence),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'governance_recheck_memory',
    source_label: '治理复查记忆',
    source_detail: '治理复查记忆 · 修后证据',
    source_action: 'review_governance_closure',
    source_action_label: '治理复查台',
  }))
  const watchMemoryEvidence = [
    ...arrayValue(governanceMemory?.watch_items),
    ...arrayValue(governanceMemory?.watchItems),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'governance_recheck_memory',
    source_label: '治理复查记忆',
    source_detail: '治理复查记忆 · 观察项',
    source_action: 'review_governance_closure',
    source_action_label: '治理复查台',
  }))
  return uniqueRecoveryEvidenceItems([
    text(closure?.status) === 'ok' ? {
      evidence: text(closure?.label, '剧情线决策已闭环'),
      source: 'storyline_decision_closure',
      source_label: '剧情线决策闭环',
      source_detail: '安全连写预检 · 剧情线决策',
      source_action: 'sync_storyline_board',
      source_action_label: '同步计划',
    } : null,
    ...recoveryEvidence,
    ...productionGateEvidence,
    ...releaseSummaryEvidence,
    ...releaseClearedSourceItems,
    ...repairedMemoryEvidence,
    ...watchMemoryEvidence,
  ].filter(Boolean) as AnyRecord[])
}

export function normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(
  source: AnyRecord | null | undefined,
  fallback: {
    templateVersionId?: string
    failedRequirements?: AnyRecord[]
    summary?: string
  } = {},
) {
  const raw = source?.production_relapse_review || source?.productionRelapseReview || source || null
  if (!raw) return null
  const templateVersionId = firstText(
    raw.template_version_id,
    raw.templateVersionId,
    fallback.templateVersionId,
  )
  const defaultBatchChapterNos = arrayValue(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const restoreChapterNos = arrayValue(raw.restore_chapter_nos || raw.restoreChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationChapterNos = arrayValue(raw.validation_chapter_nos || raw.validationChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const failureReasons = arrayValue(raw.failure_reasons || raw.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const effectiveFailedRequirements = failedRequirements.length
    ? failedRequirements
    : arrayValue(fallback.failedRequirements)
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const summary = firstText(raw.summary, fallback.summary)
  const hasContent = templateVersionId
    || defaultBatchChapterNos.length
    || restoreChapterNos.length
    || validationChapterNos.length
    || failureReasons.length
    || effectiveFailedRequirements.length
    || summary
  if (!hasContent) return null
  return {
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    failure_reasons: failureReasons,
    failed_requirements: effectiveFailedRequirements,
    ...(repeated ? {
      repeated_hotspot_segment: {
        key: text(repeated.key),
        label: text(repeated.label || repeated.key),
        risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? repeated.count ?? 0),
      },
    } : {}),
    ...(summary ? { summary } : {}),
  }
}

export function batchReleaseEvidenceFromPreflight(preflight: AnyRecord | null | undefined) {
  return Array.from(new Set(batchReleaseEvidenceItemsFromPreflight(preflight).map(item => text(item?.evidence)).filter(Boolean)))
}

export * from './helpers-risk-delivery-and-recovery'
export * from './helpers-risk-strengthened-roadmap'
