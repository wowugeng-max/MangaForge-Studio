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

export function parsePayload(value: any, options: WorkspacePayloadParseOptions = {}) {
  return parseWorkspacePayload(value, options)
}

export function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(text(value).toLowerCase())
}

export function isCompletedRepairRun(run: AnyRecord) {
  return ['completed', 'success', 'done'].includes(text(run?.status).toLowerCase())
}

export * from './helpers-risk-issue-catalog'

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

export function issueText(value: any) {
  if (typeof value === 'string') return text(value)
  return firstText(value?.description, value?.issue, value?.message, value?.suggestion, value?.title, value?.name)
}

export function issueTexts(values: any[], limit = 6) {
  return Array.from(new Set(values.map(issueText).filter(Boolean))).slice(0, limit)
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

export function recordTime(record: AnyRecord) {
  const timestamp = Date.parse(text(record?.created_at || record?.updated_at))
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const BATCH_DELIVERY_QUALITY_THRESHOLD = 78

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

export function numberValue(value: any) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
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

export function boolValue(value: any) {
  if (value === true || value === false) return value
  const normalized = text(value).toLowerCase()
  if (['true', 'yes', 'ok', 'pass', 'passed', 'delivered', 'done'].includes(normalized)) return true
  if (['false', 'no', 'warn', 'warning', 'fail', 'failed', 'missing', 'missed'].includes(normalized)) return false
  return null
}

export function riskPayload(review: AnyRecord | null, key: string) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  return payload?.[key] || payload?.result?.[key] || payload?.result || payload
}

export function reviewPayload(review: AnyRecord | null) {
  return parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
}

export function riskCountFromStatus(payload: AnyRecord, review: AnyRecord | null) {
  return text(payload?.status || review?.status).toLowerCase() === 'warn' ? 1 : 0
}

export function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    ...arrayValue(value?.fields),
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.passed === false || value?.delivered === false || value?.ok === false) return true
  return true
}

export function sceneCardReceiptRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
    ...arrayValue(review?.issues),
    ...arrayValue(selfCheck?.issues),
    ...arrayValue(source?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
}

export function sceneCardReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return sceneCardReceiptRiskChecks(reviewPayload(review)).length
}

export function sceneCardReceiptRiskTitle(risk: AnyRecord, count: number) {
  return text(risk?.scene_card_receipt?.label || risk?.sceneCardReceipt?.label, `场景回执缺口 ${count}`)
}

export function sceneCardReceiptRiskMessage(risk: AnyRecord) {
  const checks = sceneCardReceiptRiskChecks(risk)
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, sceneCardReceiptCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || '场景卡回执未能证明对应场景正文已兑现。'
}

export function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.strategy,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  const score = Number(value?.score)
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function qualityAuditRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

export function qualityAuditRiskMessageFromChecks(checks: AnyRecord[]) {
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, qualityAuditCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || 'quality_audit_checks 仍有 fail/warn 项未清。'
}

export function qualityAuditRiskHigh(checks: AnyRecord[]) {
  return checks.some(item => {
    const status = text(item?.status || item?.result || item?.severity).toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocker'].includes(status) || (Number.isFinite(score) && score < 65)
  })
}

export function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function deliveryReceiptsFrom(value: AnyRecord | null | undefined) {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

export function preDraftExecutionReceiptSections(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || selfCheck?.initial_review || source?.review || source
  const receiptSources = uniqueObjectReferences([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(source),
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts,
    ...receiptSources.map(item => item?.pre_draft_execution_receipts || item?.preDraftExecutionReceipts),
  ])
}

export function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.delivered === false || value?.passed === false || value?.ok === false) return true
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk))
}

export function preDraftExecutionRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  return preDraftExecutionReceiptSections(payload)
    .flatMap(section => arrayValue(section?.[snakeKey] || section?.[camelKey]))
    .filter(preDraftExecutionCheckNeedsRepair)
}

export function preDraftExecutionRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.remaining_risk,
    item?.remainingRisk,
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '写前执行回执仍有未兑现项。'
}

export function sourceStateCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true', 'yes'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error', 'false', 'no', '0'].includes(status)) return true
  if (value?.ready === false || value?.passed === false || value?.delivered === false || value?.ok === false) return true
  if (value?.ready === true || value?.passed === true || value?.delivered === true || value?.ok === true) return false
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk, value?.fix, value?.evidence))
}

export function sourceStateRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.[snakeKey] || review?.[camelKey]),
    ...arrayValue(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...arrayValue(source?.[snakeKey] || source?.[camelKey]),
  ].filter(sourceStateCheckNeedsRepair)
}

export function sourceStateRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.remaining_risk,
    item?.remainingRisk,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '来源/状态检查仍有 fail/warn 项未清。'
}

export function qualityAuditRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'quality_audit_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function qualityAuditRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
}

export function deslopRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'deslop_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function deslopRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

export function revisionSyncRiskCount(review: AnyRecord | null, key: string) {
  if (!review) return 0
  const risk = riskPayload(review, key)
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function revisionSyncRiskMessage(risk: AnyRecord, fallback: string) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => firstText(
      item?.text,
      item?.impact,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.required_action,
      item?.requiredAction,
      item?.target,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || fallback
}

export function coreRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const raw = riskPayload(review, 'core_drift')
  const payload = raw?.chapter_core_drift || raw?.core_drift || raw
  const count = arrayValue(payload?.drift_risks).length + arrayValue(payload?.risks).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function runwayRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'runway_sync')
  const count = numberValue(payload?.risk_count ?? payload?.riskCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.four_question_missed).length
    + arrayValue(payload?.reader_fuel_missed).length
    + arrayValue(payload?.redline_touched).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payoffDebtCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_payoff_sync')
  const count = numberValue(payload?.debt_count ?? payload?.debtCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function expectationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_expectation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function storylineRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'storyline_sync')
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.unplanned).length
    + arrayValue(payload?.forbidden_touched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyUnitRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_unit_sync')
  const counted = numberValue(payload?.missed_count ?? payload?.missedCount)
    || numberValue(payload?.rushed_count ?? payload?.rushedCount)
    || numberValue(payload?.forbidden_count ?? payload?.forbiddenCount)
  if (counted !== null) {
    const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
    const rushed = numberValue(payload?.rushed_count ?? payload?.rushedCount) ?? (arrayValue(payload?.rushed_ahead).length + arrayValue(payload?.rushedAhead).length)
    const forbidden = numberValue(payload?.forbidden_count ?? payload?.forbiddenCount) ?? (arrayValue(payload?.forbidden_touched).length + arrayValue(payload?.forbiddenTouched).length)
    return missed + rushed + forbidden
  }
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.rushed_ahead).length
    + arrayValue(payload?.rushedAhead).length
    + arrayValue(payload?.forbidden_touched).length
    + arrayValue(payload?.forbiddenTouched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyDriveRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_drive_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function characterArcRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'character_arc_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readabilityRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'readability_review')
  const memeSense = payload?.meme_sense || {}
  const immersionRiskCount = arrayValue(memeSense?.immersion_risks).length + arrayValue(payload?.immersion_risks).length
  const score = numberValue(payload?.readability_score ?? payload?.score)
  const lowScoreCount = score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  return immersionRiskCount + lowScoreCount
}

export function styleSampleRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'style_sample_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  const copied = numberValue(payload?.copy_risk_count ?? payload?.copyRiskCount) ?? (arrayValue(payload?.copied_phrases).length + arrayValue(payload?.copiedPhrases).length)
  const total = missed + copied
  return total > 0 ? total : riskCountFromStatus(payload, review)
}

export function chapterBenchmarkRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_benchmark_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function contractSyncRiskCount(review: AnyRecord | null, payloadKey: string) {
  if (!review) return 0
  const payload = riskPayload(review, payloadKey)
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount)
    ?? arrayValue(payload?.missed || payload?.gaps || payload?.issues).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function chapterAttractionWeakDimensions(payload: AnyRecord) {
  const explicitWeak = arrayValue(payload?.weak_dimensions || payload?.weakDimensions)
  if (explicitWeak.length > 0) return explicitWeak
  return arrayValue(payload?.dimensions)
    .filter((item: any) => text(item?.status).toLowerCase() === 'warn')
}

export function chapterAttractionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_attraction_review')
  const count = numberValue(payload?.weak_count ?? payload?.weakCount)
  if (count !== null) return count
  const weak = chapterAttractionWeakDimensions(payload).length
  return weak > 0 ? weak : riskCountFromStatus(payload, review)
}

export function governanceRecheckRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'governance_recheck_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.failed_evidence).length
    + arrayValue(payload?.failedEvidence).length
    + arrayValue(payload?.missed).length
    + arrayValue(payload?.missed_items).length
    + arrayValue(payload?.missedItems).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readerTrialReport(review: AnyRecord | null) {
  if (!review) return null
  const payload = reviewPayload(review)
  return payload?.report || payload?.reader_trial_review || payload?.result?.report || payload?.result || payload
}

export function latestReaderTrialReview(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'reader_trial_review')
    .slice()
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function chapterNosFromText(value: string) {
  const result = new Set<number>()
  const normalized = text(value)
  const patterns = [
    /第\s*(\d+)\s*章/g,
    /chapter\s*(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized))) {
      const chapterNo = Number(match[1])
      if (Number.isFinite(chapterNo) && chapterNo > 0) result.add(chapterNo)
    }
  }
  return [...result]
}

export function readerTrialAppliesToBatch(textValue: string, chapterNos: Set<number>) {
  const mentionedNos = chapterNosFromText(textValue)
  if (mentionedNos.length > 0) {
    return mentionedNos.some(chapterNo => chapterNos.has(chapterNo))
  }
  return [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
}

export function readerTrialBatchReview(args: {
  items: AutoCreationBatchReviewItem[]
  review: AnyRecord | null
}) {
  const report = readerTrialReport(args.review)
  const chapterNos = new Set(args.items.map(item => Number(item.chapterNo || 0)).filter(Boolean))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos))
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos) || dropPoints.length > 0)
  const score = numberValue(report?.score)
  const status = text(report?.status).toLowerCase()
  const batchInTrialWindow = [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
  const lowScoreRisk = batchInTrialWindow && score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  const statusRisk = batchInTrialWindow && ['blocked', 'block', 'needs_repair', 'warn'].includes(status) ? 1 : 0
  const riskCount = dropPoints.length || Math.max(lowScoreRisk, statusRisk)
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score,
    label: riskCount > 0 ? `试读弃读点 ${riskCount}` : '试读 OK',
    summary: text(report?.summary, riskCount > 0 ? '读者试读复盘存在弃读点。' : '读者试读复盘未发现当前批次风险。'),
    quality_bar: firstText(report?.quality_bar, report?.qualityBar),
    drop_points: dropPoints,
    repair_actions: repairActions,
    personas: arrayValue(report?.personas),
    segments: arrayValue(report?.segments),
    risk_count: riskCount,
  }
}

export function retentionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_retention_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function innovationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'innovation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function signatureSceneRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'signature_scene_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payloadReviewChapterId(review: AnyRecord, payload: AnyRecord) {
  return review?.chapter_id
    ?? review?.chapterId
    ?? payload?.chapter_id
    ?? payload?.chapterId
    ?? payload?.report?.chapter_id
    ?? payload?.report?.chapterId
    ?? payload?.context_package?.chapter_target?.id
    ?? null
}

export function payloadReviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    review?.chapter_no
    ?? review?.chapterNo
    ?? payload?.chapter_no
    ?? payload?.chapterNo
    ?? payload?.report?.chapter_no
    ?? payload?.report?.chapterNo
    ?? payload?.context_package?.chapter_target?.chapter_no
    ?? payload?.context_package?.chapter_target?.chapterNo
    ?? 0,
  )
}

export function deliveryRiskAnnotationKey(input: {
  source: string
  reviewId: any
  chapterId: any
  chapterNo: any
  kind: string
  title: string
}) {
  return [
    input.source || 'review',
    input.reviewId || 0,
    input.chapterId || 0,
    input.chapterNo || 0,
    String(input.kind || 'issue'),
    String(input.title || '').slice(0, 120),
  ].join(':')
}

export function resolvedAnnotationKeys(reviews: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()
  reviews
    .filter(review => text(review?.review_type) === 'review_annotation_status')
    .slice()
    .sort((a, b) => recordTime(a) - recordTime(b))
    .forEach(review => {
      const payload = reviewPayload(review)
      const key = text(payload?.annotation_key || payload?.key)
      if (key) map.set(key, payload)
    })
  return new Set([...map.entries()]
    .filter(([, payload]) => text(payload?.status).toLowerCase() === 'resolved')
    .map(([key]) => key))
}

export function clearedDeliveryRiskChapterKeys(reviews: AnyRecord[]) {
  const cleared = new Map<string, number>()
  reviews
    .filter(review => text(review?.review_type) === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = reviewPayload(review)
      const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
      const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
      if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) return
      const chapterId = payloadReviewChapterId(review, { ...payload, chapter_id: payload?.chapter_id || convergence?.chapter_id })
      const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
      const time = recordTime(review)
      if (chapterId !== null && chapterId !== undefined) cleared.set(`id:${chapterId}`, Math.max(cleared.get(`id:${chapterId}`) || 0, time))
      if (chapterNo > 0) cleared.set(`no:${chapterNo}`, Math.max(cleared.get(`no:${chapterNo}`) || 0, time))
    })
  return cleared
}

export * from './helpers-risk-delivery-and-recovery'
export * from './helpers-risk-strengthened-roadmap'
