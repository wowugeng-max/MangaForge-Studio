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
  MODEL_CALL_ACTIONS,
  PLANNING_ACTION_LABELS,
  arrayValue,
  deliveryRiskRepairPayload,
  firstText,
  normalizePlanningActionKey,
  opsAction,
  planningAction,
  text,
  writingAction,
  writingReadinessIssue,
} from './helpers-basics'

export function buildCanonRunway(writing: WritingCockpitModel): AutoCreationCanonRunway {
  const staleState = writingReadinessIssue(writing, 'story_state_stale')
  const memoryUnavailable = writingReadinessIssue(writing, 'memory_unavailable')
  if (staleState) {
    return {
      status: 'block',
      label: '长线记忆',
      detail: [
        `${text(staleState.label, '故事状态可能滞后')}：${text(staleState.detail, '建议同步最近已写章节的状态机。')}`,
        memoryUnavailable ? `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')}` : '',
      ].filter(Boolean).join('；'),
      action: writingAction('update_canon', '先同步故事状态，确保正史、剧情线和长期设定与已写章节对齐。', '同步故事状态'),
      staleState: true,
      memoryUnavailable: Boolean(memoryUnavailable),
    }
  }
  if (memoryUnavailable) {
    return {
      status: 'warn',
      label: '长线记忆',
      detail: `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')} 本轮只建议单章推进，并先修复连续性材料。`,
      action: writingAction('fix_continuity', '补齐长期记忆摘要和连续性事实后，再扩大安全连写批次。', '修复连续性'),
      staleState: false,
      memoryUnavailable: true,
    }
  }
  return {
    status: 'ok',
    label: '长线记忆',
    detail: '故事状态与长期记忆均可支撑连续生产。',
    action: writingAction('fix_continuity', '长线记忆状态正常，无需修复。', '修复连续性'),
    staleState: false,
    memoryUnavailable: false,
  }
}

export function targetChapter(writing: WritingCockpitModel): AutoCreationDirectorModel['targetChapter'] {
  const chapter = writing.nextChapter
  if (!chapter) return null
  return {
    id: chapter.id,
    chapterNo: Number(chapter.chapterNo || 0),
    title: text(chapter.title, '未命名章节'),
    wordCount: Number(chapter.wordCount || 0),
    hasProse: Boolean(chapter.hasProse),
  }
}

export function taskLabel(task: AnyRecord) {
  return text(task?.type_label || task?.run_type || task?.step_name || task?.status, '运行中任务')
}

export function hasRunningTasks(tasks: AnyRecord[]) {
  return tasks.some(task => ['queued', 'ready', 'paused', 'running'].includes(text(task?.status)))
}

export function planningBlocker(planning: PlanningWorkspaceModel) {
  const critical = arrayValue(planning.healthIssues).find(issue => issue?.severity === 'critical')
  if (critical) {
    return {
      title: text(critical.title, '长线规划需要补齐'),
      actionKey: (critical.actionKey || 'update_rolling_plan') as PlanningActionKey,
      detail: text(critical.detail, '先补齐长篇生产前置规划。'),
    }
  }
  if (planning.topStatus.longformHealth.status === 'needs_planning') {
    return {
      title: '长线规划需要补齐',
      actionKey: 'update_rolling_plan' as PlanningActionKey,
      detail: text(planning.topStatus.future10Coverage.label, '先补齐未来十章规划。'),
    }
  }
  return null
}

export function retentionNeedsAction(planning: PlanningWorkspaceModel) {
  const retention = planning.first30Retention
  return retention.status === 'missing'
    || retention.status === 'stale'
    || retention.status === 'blocked'
    || retention.status === 'needs_repair'
}

export function storylineNeedsAction(planning: PlanningWorkspaceModel) {
  return planning.storylineBoard.status === 'missing' || planning.storylineBoard.status === 'needs_attention'
}

export function characterArcNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.characterArcBoard && planning.characterArcBoard.status === 'needs_attention')
}

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

export const DELIVERY_RISK_CONFIG: Record<string, {
  category: AutoCreationDeliveryRiskGateCategory['key']
  label: string
  kind: string
  payloadKey: string
  issueType: string
  count: (review: AnyRecord) => number
  title: (risk: AnyRecord, count: number) => string
  message: (risk: AnyRecord) => string
  high: (risk: AnyRecord, count: number) => boolean
}> = {
  chapter_core_drift: {
    category: 'delivery_core',
    label: '核心',
    kind: 'core_drift',
    payloadKey: 'core_drift',
    issueType: 'core_drift',
    count: coreRiskCount,
    title: (risk, count) => text(risk?.label, `核心偏移 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.drift_risks), ...arrayValue(risk?.risks)], 2).join('；') || '核心偏移风险',
    high: () => true,
  },
  runway_sync: {
    category: 'runway',
    label: '航线',
    kind: 'runway_sync_risk',
    payloadKey: 'runway_sync',
    issueType: 'runway_sync_risk',
    count: runwayRiskCount,
    title: (risk, count) => text(risk?.label, `航线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.four_question_missed),
      ...arrayValue(risk?.reader_fuel_missed),
      ...arrayValue(risk?.redline_touched),
    ], 2).join('；') || '百万字航线、读者燃料或红线约束未闭环',
    high: (risk, count) => arrayValue(risk?.redline_touched).length > 0 || count >= 2,
  },
  reader_expectation_sync: {
    category: 'reader_expectation',
    label: '期待',
    kind: 'reader_expectation_debt',
    payloadKey: 'reader_expectation_sync',
    issueType: 'reader_expectation_debt',
    count: expectationRiskCount,
    title: (risk, count) => text(risk?.label, `期待欠账 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '读者期待或上一章交接承诺没有兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_retention_sync: {
    category: 'reader_retention',
    label: '追读',
    kind: 'reader_retention_missed',
    payloadKey: 'reader_retention_sync',
    issueType: 'reader_retention_missed',
    count: retentionRiskCount,
    title: (risk, count) => text(risk?.label, `漏追读 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '追读承诺未兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_payoff_sync: {
    category: 'reader_payoff',
    label: '回报',
    kind: 'reader_payoff_debt',
    payloadKey: 'reader_payoff_sync',
    issueType: 'reader_payoff_debt',
    count: payoffDebtCount,
    title: (risk, count) => text(risk?.label, `回报欠账 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.missed), ...arrayValue(risk?.debts)], 2).join('；') || '读者回报欠账',
    high: (_risk, count) => count >= 2,
  },
  innovation_sync: {
    category: 'innovation',
    label: '创新',
    kind: 'innovation_missed',
    payloadKey: 'innovation_sync',
    issueType: 'innovation_missed',
    count: innovationRiskCount,
    title: (risk, count) => text(risk?.label, `创新缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '创新执行未落地',
    high: (_risk, count) => count >= 2,
  },
  signature_scene_sync: {
    category: 'signature_scene',
    label: '强场面',
    kind: 'signature_scene_missed',
    payloadKey: 'signature_scene_sync',
    issueType: 'signature_scene_missed',
    count: signatureSceneRiskCount,
    title: (risk, count) => text(risk?.label, `强场面漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '开写任务书指定的标志性强场面没有充分兑现',
    high: () => true,
  },
  storyline_sync: {
    category: 'storyline',
    label: '剧情线',
    kind: 'storyline_sync_risk',
    payloadKey: 'storyline_sync',
    issueType: 'storyline_sync_risk',
    count: storylineRiskCount,
    title: (risk, count) => text(risk?.label, `剧情线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.unplanned),
      ...arrayValue(risk?.forbidden_touched),
    ], 2).join('；') || '剧情线同步风险',
    high: risk => arrayValue(risk?.forbidden_touched).length > 0,
  },
  story_unit_sync: {
    category: 'story_unit',
    label: '剧情单元',
    kind: 'story_unit_sync_risk',
    payloadKey: 'story_unit_sync',
    issueType: 'story_unit_sync_risk',
    count: storyUnitRiskCount,
    title: (risk, count) => text(risk?.label, `剧情单元风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.rushed_ahead),
      ...arrayValue(risk?.rushedAhead),
      ...arrayValue(risk?.forbidden_touched),
      ...arrayValue(risk?.forbiddenTouched),
    ], 2).join('；') || '剧情单元兑现风险',
    high: risk => arrayValue(risk?.rushed_ahead).length > 0
      || arrayValue(risk?.rushedAhead).length > 0
      || arrayValue(risk?.forbidden_touched).length > 0
      || arrayValue(risk?.forbiddenTouched).length > 0,
  },
  story_drive_sync: {
    category: 'story_drive',
    label: '故事力',
    kind: 'story_drive_gap',
    payloadKey: 'story_drive_sync',
    issueType: 'story_drive_gap',
    count: storyDriveRiskCount,
    title: (risk, count) => text(risk?.label, `故事力缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '主角主动选择、明确阻碍、选择代价、状态变化或下一步因果没有落地',
    high: (_risk, count) => count >= 3,
  },
  character_arc_sync: {
    category: 'character_arc',
    label: '人物弧光',
    kind: 'character_arc_gap',
    payloadKey: 'character_arc_sync',
    issueType: 'character_arc_gap',
    count: characterArcRiskCount,
    title: (risk, count) => text(risk?.label, `人物弧光缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有落地',
    high: (_risk, count) => count >= 3,
  },
  readability_review: {
    category: 'readability',
    label: '可读性',
    kind: 'readability_or_meme_risk',
    payloadKey: 'readability_review',
    issueType: 'readability_risk',
    count: readabilityRiskCount,
    title: (risk, count) => text(risk?.label, `可读性/网感风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.meme_sense?.immersion_risks),
      ...arrayValue(risk?.immersion_risks),
      ...arrayValue(risk?.issues),
    ], 2).join('；') || `可读性评分 ${risk?.readability_score || risk?.score || '-'}`,
    high: risk => Number(risk?.readability_score ?? risk?.score ?? 100) < 65,
  },
  chapter_attraction_review: {
    category: 'chapter_attraction',
    label: '吸引力',
    kind: 'chapter_attraction_gap',
    payloadKey: 'chapter_attraction_review',
    issueType: 'chapter_attraction_gap',
    count: chapterAttractionRiskCount,
    title: (risk, count) => text(risk?.label, `吸引力缺口 ${count}`),
    message: risk => issueTexts(chapterAttractionWeakDimensions(risk), 2).join('；') || `吸引力评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  chapter_benchmark_sync: {
    category: 'chapter_benchmark',
    label: '标杆章',
    kind: 'chapter_benchmark_gap',
    payloadKey: 'chapter_benchmark_sync',
    issueType: 'chapter_benchmark_gap',
    count: chapterBenchmarkRiskCount,
    title: (risk, count) => text(risk?.label, `标杆章缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || `质量基准评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  intent_confirmation_sync: {
    category: 'pre_draft_execution',
    label: '写前执行',
    kind: 'intent_confirmation_gap',
    payloadKey: 'intent_confirmation_sync',
    issueType: 'intent_confirmation_gap',
    count: review => contractSyncRiskCount(review, 'intent_confirmation_sync'),
    title: (risk, count) => text(risk?.label, `意图确认缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed || risk?.gaps || risk?.issues), 2).join('；') || '正文没有按写前意图统一发力。',
    high: (_risk, count) => count >= 2,
  },
  benchmark_recall_sync: {
    category: 'pre_draft_execution',
    label: '写前执行',
    kind: 'benchmark_recall_gap',
    payloadKey: 'benchmark_recall_sync',
    issueType: 'benchmark_recall_gap',
    count: review => contractSyncRiskCount(review, 'benchmark_recall_sync'),
    title: (risk, count) => text(risk?.label, `文风召回缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed || risk?.gaps || risk?.issues), 2).join('；') || '对标模块、节奏或文风召回没有落到正文。',
    high: (_risk, count) => count >= 2,
  },
  style_sample_sync: {
    category: 'style_sample',
    label: '风格',
    kind: 'style_sample_gap',
    payloadKey: 'style_sample_sync',
    issueType: 'style_sample_gap',
    count: styleSampleRiskCount,
    title: (risk, count) => text(risk?.label, `风格缺口 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.copied_phrases),
      ...arrayValue(risk?.copiedPhrases),
    ], 2).join('；') || `风格评分 ${risk?.score || '-'}`,
    high: risk => (numberValue(risk?.copy_risk_count ?? risk?.copyRiskCount) ?? arrayValue(risk?.copied_phrases).length + arrayValue(risk?.copiedPhrases).length) > 0,
  },
  volume_beat_sync: {
    category: 'volume_beat',
    label: '爆点',
    kind: 'volume_segment_missed',
    payloadKey: 'volume_beat_sync',
    issueType: 'volume_segment_missed',
    count: volumeSegmentRiskCount,
    title: (risk, count) => text(risk?.label, `爆点漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '卷级高潮、爽点或回报预算没有兑现',
    high: (_risk, count) => count >= 2,
  },
  governance_recheck_sync: {
    category: 'recovery_evidence',
    label: '恢复依据',
    kind: 'recovery_evidence_mismatch',
    payloadKey: 'governance_recheck_sync',
    issueType: 'recovery_evidence_mismatch',
    count: governanceRecheckRiskCount,
    title: (risk, count) => text(risk?.label, `恢复依据缺口 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.failed_evidence),
      ...arrayValue(risk?.failedEvidence),
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.watch_items),
      ...arrayValue(risk?.watchItems),
    ], 2).join('；') || '治理复查记忆没有在单章正文中落地',
    high: () => true,
  },
  quality_audit_repair_receipt_sync: {
    category: 'quality_audit_repair_receipt',
    label: '质量回执',
    kind: 'quality_audit_repair_receipt',
    payloadKey: 'quality_audit_repair_receipt_sync',
    issueType: 'quality_audit_repair_receipt',
    count: qualityAuditRepairReceiptRiskCount,
    title: (risk, count) => text(risk?.label, `质量诊断修复回执缺口 ${count}`),
    message: qualityAuditRepairReceiptRiskMessage,
    high: () => true,
  },
  deslop_repair_receipt_sync: {
    category: 'deslop_repair_receipt',
    label: '去AI味回执',
    kind: 'deslop_repair_receipt',
    payloadKey: 'deslop_repair_receipt_sync',
    issueType: 'deslop_repair_receipt',
    count: deslopRepairReceiptRiskCount,
    title: (risk, count) => text(risk?.label, `去AI味修复回执残留 ${count}`),
    message: deslopRepairReceiptRiskMessage,
    high: () => true,
  },
  revision_cascade_impact_sync: {
    category: 'revision_cascade_impact',
    label: '级联修订',
    kind: 'revision_cascade_impact',
    payloadKey: 'revision_cascade_impact_sync',
    issueType: 'revision_cascade_impact',
    count: review => revisionSyncRiskCount(review, 'revision_cascade_impact_sync'),
    title: (risk, count) => text(risk?.label, `修订级联影响 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, 'revision_receipts.cascade_impacts 存在后续章节同步义务。'),
    high: () => true,
  },
  revision_scope_guard_sync: {
    category: 'revision_scope_guard',
    label: '修订幅度',
    kind: 'revision_scope_guard',
    payloadKey: 'revision_scope_guard_sync',
    issueType: 'revision_scope_guard',
    count: review => revisionSyncRiskCount(review, 'revision_scope_guard_sync'),
    title: (risk, count) => text(risk?.label, `修订幅度风险 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, '修订前后字数差异超过 oh-story 修订幅度警戒线。'),
    high: () => true,
  },
  prose_revision_receipt_sync: {
    category: 'prose_revision_receipt',
    label: '修订回执',
    kind: 'prose_revision_receipt_sync',
    payloadKey: 'prose_revision_receipt_sync',
    issueType: 'prose_revision_receipt_sync',
    count: review => revisionSyncRiskCount(review, 'prose_revision_receipt_sync'),
    title: (risk, count) => text(risk?.label, `修订回执残留 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, 'delivery_risk_receipts 存在失败项，但 revision_receipts 没有逐条闭环。'),
    high: () => true,
  },
  prose_quality: {
    category: 'scene_card_receipt',
    label: '场景回执',
    kind: 'scene_card_receipt',
    payloadKey: 'scene_card_receipt',
    issueType: 'scene_card_receipt',
    count: sceneCardReceiptRiskCount,
    title: sceneCardReceiptRiskTitle,
    message: sceneCardReceiptRiskMessage,
    high: () => true,
  },
}

export function buildResolvedDeliveryRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
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

export const DELIVERY_RISK_ISSUE_LABELS: Record<string, string> = {
  core_drift: '核心',
  runway_sync_risk: '航线',
  reader_expectation_debt: '期待',
  opening_handoff_debt: '开篇承接',
  target_reader_gap: '目标读者',
  genre_positioning_gap: '题材定位',
  female_audience_gap: '女频长篇',
  upgrade_rhythm_gap: '升级节奏',
  chapter_structure_gap: '章节结构',
  chapter_progression_gap: '章节推进',
  information_load_gap: '信息负载',
  longform_continuity_gap: '长篇连续性',
  core_contract_gap: '核心契约',
  continuity_heat_gap: '连续性热度',
  revision_receipt_gap: '修订回执',
  deslop_repair_gap: '去AI味修复',
  prose_meta_gap: '正文元叙事',
  serial_risk_repair_gap: '连续风险修复',
  chapter_hook_quality_gap: '章钩质量',
  reader_retention_gap: '追读雷达',
  reader_retention_missed: '追读',
  reader_payoff_debt: '回报',
  innovation_missed: '创新',
  innovation_execution_missed: '创新',
  signature_scene_missed: '强场面',
  storyline_sync_risk: '剧情线',
  story_unit_sync_risk: '剧情单元',
  story_drive_gap: '故事力',
  character_arc_gap: '人物弧光',
  chapter_attraction_gap: '吸引力',
  chapter_benchmark_gap: '标杆章',
  style_sample_gap: '风格',
  intent_confirmation_gap: '意图确认',
  benchmark_recall_gap: '文风召回',
  source_readiness_gap: '来源就绪',
  state_tracking_gap: '状态跟踪',
  style_boundary_gap: '风格边界',
  information_flow_gap: '信息流',
  expectation_threshold_gap: '期待阈值',
  story_loop_gap: '故事闭环',
  emotional_arc_gap: '情绪弧',
  chapter_hook_gap: '章级钩子',
  paragraph_hook_gap: '段落级钩子',
  suspense_gap: '悬念编排',
  reversal_gap: '反转设计',
  showdown_gap: '高潮对抗',
  prose_craft_gap: '正文工艺',
  punctuation_tone_gap: '语气标点',
  content_rubric_gap: '内容基准',
  asset_linkage_gap: '资产挂钩',
  dialogue_gap: '对白质量',
  plot_dynamics_gap: '剧情动力',
  character_relation_gap: '角色关系',
  character_behavior_gap: '角色行为',
  conflict_structure_gap: '冲突结构',
  bridge_unit_gap: '桥段节奏',
  opening_gap: '开篇设计',
  readability_risk: '可读性',
  readability_or_meme_risk: '可读性',
  opening_pull_risk: '开篇吸引力',
  ending_page_turn_risk: '章末翻页',
  scene_progression_risk: '场景推进',
  payoff_density_risk: '爽点密度',
  volume_beat_missed: '爆点',
  volume_segment_missed: '爆点',
  recovery_evidence_mismatch: '恢复依据',
  scene_card_receipt: '场景回执',
  deslop_repair_receipt: '去AI味回执',
  revision_cascade_impact: '级联修订',
  revision_scope_guard: '修订幅度',
  prose_revision_receipt_sync: '修订回执',
  quality_audit_repair_receipt: '质量回执',
  quality_audit_gap: '质量诊断',
  purpose_tag_density_gap: '质量诊断',
  strengthened_repair_acceptance_mismatch: '强化复盘',
}

export function deliveryRiskIssueLabel(issueType: string) {
  if (issueType.startsWith('scene_card_receipt')) return '场景回执'
  if (issueType.startsWith('deslop_repair_receipt')) return '去AI味回执'
  if (issueType.startsWith('revision_cascade_impact')) return '级联修订'
  if (issueType.startsWith('revision_scope_guard')) return '修订幅度'
  if (issueType.startsWith('prose_revision_receipt')) return '修订回执'
  if (issueType.startsWith('quality_audit_repair_receipt')) return '质量回执'
  if (issueType.startsWith('quality_audit')) return '质量诊断'
  if (issueType.startsWith('source_readiness')) return '来源就绪'
  if (issueType.startsWith('state_tracking')) return '状态跟踪'
  if (issueType.startsWith('style_boundary')) return '风格边界'
  if (issueType.startsWith('information_flow')) return '信息流'
  if (issueType.startsWith('expectation_threshold')) return '期待阈值'
  if (issueType.startsWith('story_loop')) return '故事闭环'
  if (issueType.startsWith('emotional_arc')) return '情绪弧'
  if (issueType.startsWith('chapter_hook')) return '章级钩子'
  if (issueType.startsWith('paragraph_hook')) return '段落级钩子'
  if (issueType.startsWith('suspense')) return '悬念编排'
  if (issueType.startsWith('reversal')) return '反转设计'
  if (issueType.startsWith('showdown')) return '高潮对抗'
  if (issueType.startsWith('prose_craft')) return '正文工艺'
  if (issueType.startsWith('punctuation_tone')) return '语气标点'
  if (issueType.startsWith('content_rubric')) return '内容基准'
  if (issueType.startsWith('target_reader')) return '目标读者'
  if (issueType.startsWith('genre_positioning')) return '题材定位'
  if (issueType.startsWith('female_audience')) return '女频长篇'
  if (issueType.startsWith('upgrade_rhythm')) return '升级节奏'
  if (issueType.startsWith('chapter_structure')) return '章节结构'
  if (issueType.startsWith('chapter_progression')) return '章节推进'
  if (issueType.startsWith('information_load')) return '信息负载'
  if (issueType.startsWith('longform_continuity')) return '长篇连续性'
  if (issueType.startsWith('reader_retention_gap')) return '追读雷达'
  if (issueType.startsWith('asset_linkage')) return '资产挂钩'
  if (issueType.startsWith('dialogue')) return '对白质量'
  if (issueType.startsWith('plot_dynamics')) return '剧情动力'
  if (issueType.startsWith('character_relation')) return '角色关系'
  if (issueType.startsWith('character_behavior')) return '角色行为'
  if (issueType.startsWith('conflict_structure')) return '冲突结构'
  if (issueType.startsWith('bridge_unit')) return '桥段节奏'
  if (issueType.startsWith('opening')) return '开篇设计'
  return DELIVERY_RISK_ISSUE_LABELS[issueType] || issueType
}

export function buildResolvedDeliveryRiskEvidence(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}): AutoCreationDeliveryRiskResolution[] {
  const repaired = new Map<string, {
    count: number
    chapterNos: Set<number>
    issueTypes: Set<string>
    labels: Set<string>
    latestTime: number
  }>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
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
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue

      const group = repaired.get('repair') || {
        count: 0,
        chapterNos: new Set<number>(),
        issueTypes: new Set<string>(),
        labels: new Set<string>(),
        latestTime: 0,
      }
      group.count += 1
      if (chapterNo > 0) group.chapterNos.add(chapterNo)
      group.issueTypes.add(issueType)
      group.labels.add(deliveryRiskIssueLabel(issueType))
      group.latestTime = Math.max(group.latestTime, recordTime(latestQuality || {}), resolvedAfter)
      repaired.set('repair', group)
    }
  }

  const evidence: Array<AutoCreationDeliveryRiskResolution & { latestTime: number }> = [...repaired.values()]
    .map(group => {
      const chapterNos = [...group.chapterNos].sort((a, b) => a - b)
      const labels = [...group.labels]
      return {
        label: '任务修复已清',
        count: group.count,
        chapterNos,
        issueTypes: [...group.issueTypes],
        detail: `${chapterNos.length ? `第${chapterNos.join('、')}章` : '相关章节'} ${labels.join('、') || '交稿'}风险已处理，后续质量复检通过。`,
        latestTime: group.latestTime,
      }
    })

  for (const review of args.reviews) {
    if (text(review?.review_type) !== 'delivery_risk_convergence') continue
    const payload = reviewPayload(review)
    const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
    const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
    if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) continue
    const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
    const beforeCount = Number(convergence?.before_count ?? convergence?.beforeCount ?? convergence?.before?.total_count ?? convergence?.resolved_count ?? convergence?.resolvedCount ?? 0)
    const count = Number.isFinite(beforeCount) && beforeCount > 0 ? beforeCount : 1
    const label = firstText(convergence?.label, convergence?.summary, '风险已清零')
    evidence.push({
      label: '复检收敛已清',
      count,
      chapterNos: chapterNo > 0 ? [chapterNo] : [],
      issueTypes: ['delivery_risk_convergence'],
      detail: `${chapterNo > 0 ? `第${chapterNo}章` : '相关章节'} ${label}，复检收敛显示风险清零。`,
      latestTime: recordTime(review),
    })
  }

  return evidence
    .sort((a, b) => b.latestTime - a.latestTime)
    .map(({ latestTime: _latestTime, ...item }) => item)
}

export function latestDeliveryRiskReviews(reviews: AnyRecord[]) {
  const latest = new Map<string, AnyRecord>()
  for (const review of reviews) {
    const reviewType = text(review?.review_type)
    if (!DELIVERY_RISK_CONFIG[reviewType]) continue
    const payload = reviewPayload(review)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    const chapterKey = chapterId !== null && chapterId !== undefined
      ? `id:${chapterId}`
      : chapterNo > 0
        ? `no:${chapterNo}`
        : `review:${review?.id ?? latest.size}`
    const key = `${reviewType}:${chapterKey}`
    const current = latest.get(key)
    if (!current || recordTime(review) >= recordTime(current)) {
      latest.set(key, review)
    }
  }
  return Array.from(latest.values())
}

export function taskTitle(task: AnyRecord) {
  return firstText(task?.title, task?.message, task?.summary, task?.issue, task?.description, task?.issue_type, task?.issueType)
}

export function isStorylineDecisionTask(task: AnyRecord, output: AnyRecord) {
  const source = text(task?.source || output?.source)
  const issueType = text(task?.issue_type || task?.issueType)
  return source === 'storyline_diff_decision'
    || issueType.startsWith('storyline_diff_')
    || Boolean(task?.decision_key || task?.decisionKey)
}

export function buildStorylineDecisionGate(runRecords: AnyRecord[]): AutoCreationStorylineDecisionGate {
  const openTasks: AnyRecord[] = []
  for (const run of runRecords.filter(item => text(item?.run_type) === 'longform_production_repair')) {
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const tasks = [
      ...arrayValue(output?.tasks),
      ...arrayValue(output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isStorylineDecisionTask(task, output)) continue
      const status = text(task?.task_status ?? task?.status)
      if (isResolvedTaskStatus(status)) continue
      if (['ignored', 'false_positive'].includes(status)) continue
      openTasks.push(task)
    }
  }

  const openCount = openTasks.length
  const taskTitles = issueTexts(openTasks.map(task => taskTitle(task)), 3)
  if (openCount <= 0) {
    return {
      status: 'ok',
      label: '剧情线决策已闭环',
      summary: '剧情线差异决策任务已处理并通过复检，不阻止安全连写。',
      openCount: 0,
      taskTitles: [],
    }
  }

  return {
    status: 'block',
    label: `剧情线决策 ${openCount}`,
    summary: `还有 ${openCount} 个剧情线决策任务未闭环；先在任务中心完成回修或计划同步，并通过剧情线同步复检后，再放行安全连写。`,
    openCount,
    taskTitles,
  }
}

export function latestRepairAuditEntry(runRecords: AnyRecord[]) {
  return runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({ run, output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {} }))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
    .map(item => ({ run: item.run, audit: item.output?.audit_summary || item.output?.auditSummary }))
    .find(item => item.audit) || null
}

export function compactUniqueText(values: any[], limit = 120) {
  return Array.from(new Set(values.map(item => firstText(item)).filter(Boolean).map(item => item.length > limit ? `${item.slice(0, limit)}…` : item)))
}

export function recoveryEvidenceSourceSummary(recoveryClosure: AnyRecord | null) {
  if (!recoveryClosure) return ''
  const tasks = arrayValue(recoveryClosure?.tasks)
  const singleChapterCount = Number(recoveryClosure?.single_chapter_count ?? recoveryClosure?.singleChapterCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'single_chapter_governance_recheck').length
  const batchCount = Number(recoveryClosure?.batch_count ?? recoveryClosure?.batchCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'safe_batch_recovery_recheck').length
  const genericCount = Math.max(0, Number(recoveryClosure?.total || 0) - singleChapterCount - batchCount)
  return [
    singleChapterCount > 0 ? `单章治理复查 ${singleChapterCount}` : '',
    batchCount > 0 ? `批次恢复复查 ${batchCount}` : '',
    genericCount > 0 ? `恢复依据复查 ${genericCount}` : '',
  ].filter(Boolean).join('；')
}

export function recoveryEvidenceSourceMeta(task: AnyRecord) {
  const source = text(task?.source || task?.sourceMode)
  const sourceLabel = firstText(task?.source_label, task?.sourceLabel)
  if (source === 'single_chapter_governance_recheck') return { source, label: sourceLabel || '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: sourceLabel || '批次恢复复查' }
  if (text(task?.annotation_source || task?.annotationSource) === 'governance_recheck_sync') {
    return { source: 'single_chapter_governance_recheck', label: sourceLabel || '单章治理复查' }
  }
  if (text(task?.source) === 'auto_creation_safe_batch_risk' || task?.segment) {
    return { source: 'safe_batch_recovery_recheck', label: sourceLabel || '批次恢复复查' }
  }
  return { source: source || 'recovery_evidence_recheck', label: sourceLabel || '恢复依据复查' }
}

export function recoveryEvidenceReview(task: AnyRecord) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

export function recoveryEvidenceResidualTexts(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const failedItems = [
    ...arrayValue(review?.failed_items),
    ...arrayValue(review?.failedItems),
  ]
  return compactUniqueText([
    ...arrayValue(review?.failed_evidence),
    ...arrayValue(review?.failedEvidence),
    ...failedItems.map((item: any) => firstText(item?.evidence, item)),
  ], 100).slice(0, 3)
}

export function recoveryEvidenceSourceTaskStatus(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const taskStatus = text(task?.task_status ?? task?.taskStatus ?? task?.status).toLowerCase()
  const reviewStatus = text(review?.status).toLowerCase()
  const residualEvidence = recoveryEvidenceResidualTexts(task)
  const hasResidual = residualEvidence.length > 0 || reviewStatus === 'warn' || taskStatus === 'needs_review'
  const closed = ['resolved', 'closed', 'done', 'completed'].includes(taskStatus) || reviewStatus === 'ok'
  const resultStatus = hasResidual ? 'blocked' : closed ? 'cleared' : 'pending'
  return {
    resultStatus,
    residualEvidence,
  }
}

export function recoveryEvidenceProductionStatusLabel(status: string) {
  if (status === 'cleared') return '生产阻断已解除'
  if (status === 'pending') return '等待复检结论'
  return '暂缓安全连写'
}

export function finiteNumberOrNull(value: any) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function recoveryEvidenceProductionGateNextActionFromSource(source: AnyRecord, action: string, label: string) {
  return {
    action,
    label,
    source: text(source?.source || source?.sourceMode),
    sourceLabel: text(source?.label || source?.sourceLabel),
    status: text(source?.status),
    residualEvidence: arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean),
  }
}

export function recoveryEvidenceGovernanceQueueTaskAction(source: AnyRecord) {
  const sourceKey = text(source?.source || source?.sourceMode)
  const status = text(source?.status)
  const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
  if (status === 'blocked' && residualEvidence.length > 0) {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'revision', label: '回修依据' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'focus_task', label: '定位批次任务' }
    return { actionKey: 'focus_task', label: '定位任务' }
  }
  if (status === 'pending') {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'recheck_single_chapter', label: '复检单章' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'recheck_safe_batch', label: '复盘批次' }
  }
  return { actionKey: 'review_governance_closure', label: '治理复查台' }
}

export function recoveryEvidenceGovernanceQueueExecutionMeta(source: AnyRecord, actionKey: string) {
  const sourceTasks = arrayValue(source?.source_tasks || source?.sourceTasks)
  const firstTask = sourceTasks[0] || {}
  const sourceTaskIndex = finiteNumberOrNull(firstTask?.source_task_index ?? firstTask?.sourceTaskIndex ?? firstTask?.task_index ?? firstTask?.taskIndex)
  const chapterId = finiteNumberOrNull(firstTask?.chapter_id ?? firstTask?.chapterId)
  const chapterNo = finiteNumberOrNull(firstTask?.chapter_no ?? firstTask?.chapterNo)
  const meta: AnyRecord = {
    source_task_index: sourceTaskIndex,
    source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    chapter_id: chapterId,
    chapter_no: chapterNo,
    chapter_ids: arrayValue(source?.chapter_ids || source?.chapterIds),
    chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
  }

  if (actionKey === 'revision') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_single_chapter') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_safe_batch') {
    return {
      ...meta,
      recheck_mode: 'batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'focus_task') {
    return {
      ...meta,
      recheck_mode: 'manual_then_batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_single_brief') {
    return {
      ...meta,
      recheck_mode: 'single_chapter_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_single_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_batch_brief') {
    return {
      ...meta,
      recheck_mode: 'batch_brief_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_batch_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  return {
    ...meta,
    recheck_mode: 'governance_closure',
    recheck_source: 'longform_repair_audit_summary',
    closure_status: 'blocked_until_governance_review',
    auto_recheck: false,
    requires_manual_repair: false,
  }
}

export function buildRecoveryEvidenceGovernanceQueue(snapshot: AnyRecord, nextAction: AnyRecord | null) {
  const sources = arrayValue(snapshot?.sources)
  const unresolvedSources = sources.filter(source => text(source?.status) !== 'cleared')
  const mainAction = nextAction || {
    action: 'review_governance_closure',
    label: '治理复查台',
    source: 'recovery_evidence_production_gate',
    sourceLabel: '恢复依据生产闸门',
    status: text(snapshot?.status),
    residualEvidence: [],
  }
  const tasks = unresolvedSources.map((source, index) => {
    const action = recoveryEvidenceGovernanceQueueTaskAction(source)
    const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
    const sourceLabel = text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源')
    const statusLabel = text(source?.status_label || source?.statusLabel, recoveryEvidenceProductionStatusLabel(text(source?.status)))
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta(source, action.actionKey)
    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: text(source?.status) === 'blocked' ? 'high' : 'medium',
      task_status: 'needs_review',
      source: text(source?.source || source?.sourceMode),
      source_label: sourceLabel,
      source_status: text(source?.status),
      source_status_label: statusLabel,
      action_key: action.actionKey,
      action_label: action.label,
      ...executionMeta,
      title: `${sourceLabel}：${action.label}`,
      message: residualEvidence.length
        ? `${statusLabel}：${residualEvidence.join('；')}`
        : `${statusLabel}，需要先完成${action.label}再恢复安全连写。`,
      action: `${action.label}后刷新恢复依据审计，确认该来源从暂缓安全连写/等待复检结论变为生产阻断已解除。`,
      recovery_evidence_review: {
        status: residualEvidence.length ? 'warn' : 'pending',
        summary: residualEvidence.length ? `残留依据：${residualEvidence.join('；')}` : '等待复检结论回填。',
        failed_evidence: residualEvidence,
      },
      acceptance_criteria: [
        `${sourceLabel}显示生产阻断已解除`,
        '恢复依据审计无残留 failed_evidence',
        '总控台恢复依据生产闸门允许继续安全连写',
      ],
      queue_index: index,
    }
  })
  const nextCycleType = ['revision', 'focus_task'].includes(text(mainAction.action)) ? 'revision_batch' : 'recheck_summary'
  return {
    source: 'recovery_evidence_production_gate',
    status: text(snapshot?.status),
    summary: `恢复依据生产闸门阻断，先执行「${text(mainAction.label, '治理复查台')}」并沉淀为连续治理队列。`,
    main_action: mainAction,
    source_count: Number(snapshot?.source_count || sources.length || 0),
    sources,
    tasks,
    next_cycle: {
      type: nextCycleType,
      label: nextCycleType === 'revision_batch' ? '下一轮修订批次' : '下一轮复检批次摘要',
    },
    recommendations: [
      `先处理主动作「${text(mainAction.label, '治理复查台')}」，不要带着未解除恢复依据进入安全连写。`,
      '处理后重新生成恢复依据审计摘要，确认单章/批次来源均变为生产阻断已解除。',
      '审计闭环后再回到总控台恢复 2-3 章安全连写。',
    ],
  }
}

export function buildRecoveryEvidenceProductionGateNextAction(sources: AnyRecord[]) {
  const singleResidual = sources.find(source =>
    text(source?.source) === 'single_chapter_governance_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (singleResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(singleResidual, 'revision', '回修依据')
  }

  const batchResidual = sources.find(source =>
    text(source?.source) === 'safe_batch_recovery_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (batchResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchResidual, 'focus_task', '定位批次任务')
  }

  const genericResidual = sources.find(source =>
    text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (genericResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(genericResidual, 'focus_task', '定位任务')
  }

  const singlePending = sources.find(source => text(source?.source) === 'single_chapter_governance_recheck' && text(source?.status) === 'pending')
  if (singlePending) {
    return recoveryEvidenceProductionGateNextActionFromSource(singlePending, 'recheck_single_chapter', '复检单章')
  }

  const batchPending = sources.find(source => text(source?.source) === 'safe_batch_recovery_recheck' && text(source?.status) === 'pending')
  if (batchPending) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchPending, 'recheck_safe_batch', '复盘批次')
  }

  const unresolved = sources.find(source => text(source?.status) !== 'cleared')
  if (unresolved) {
    return recoveryEvidenceProductionGateNextActionFromSource(unresolved, 'review_governance_closure', '治理复查台')
  }

  return null
}


export function buildRecoveryEvidenceProductionGate(runRecords: AnyRecord[]) {
  const auditEntry = latestRepairAuditEntry(runRecords)
  const audit = auditEntry?.audit || null
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const tasks = arrayValue(closure?.tasks)
  if (!closure || tasks.length === 0) {
    const detail = '暂无恢复依据来源复检阻断。'
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: 0,
        sources: [],
        next_action: null,
      },
    }
  }

  const groups = new Map<string, {
    source: string
    label: string
    statuses: string[]
    residualEvidence: string[]
    sourceTasks: AnyRecord[]
  }>()
  for (const [taskIndex, task] of tasks.entries()) {
    const meta = recoveryEvidenceSourceMeta(task)
    const status = recoveryEvidenceSourceTaskStatus(task)
    const group = groups.get(meta.source) || { source: meta.source, label: meta.label, statuses: [], residualEvidence: [], sourceTasks: [] }
    group.statuses.push(status.resultStatus)
    group.residualEvidence.push(...status.residualEvidence)
    const sourceTaskIndex = finiteNumberOrNull(task?.task_index ?? task?.taskIndex)
    group.sourceTasks.push({
      ...task,
      source_task_index: sourceTaskIndex ?? taskIndex,
    })
    groups.set(meta.source, group)
  }

  const sourceDetails = Array.from(groups.values()).map(group => {
    const uniqueResiduals = compactUniqueText(group.residualEvidence, 80).slice(0, 2)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    if (sourceStatus === 'cleared') return `${group.label}：生产阻断已解除`
    if (sourceStatus === 'pending') return `${group.label}：等待复检结论`
    return `${group.label}：暂缓安全连写${uniqueResiduals.length ? `（${uniqueResiduals.join('；')}）` : ''}`
  })
  const blocked = sourceDetails.some(item => item.includes('暂缓安全连写') || item.includes('等待复检结论'))
  const sources = Array.from(groups.values()).map(group => {
    const residualEvidence = compactUniqueText(group.residualEvidence, 80).slice(0, 3)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    const sourceTaskIndices = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.source_task_index ?? task?.sourceTaskIndex)).filter(item => item !== null)))
    const chapterIds = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_id ?? task?.chapterId)).filter(item => item !== null)))
    const chapterNos = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_no ?? task?.chapterNo)).filter(item => item !== null)))
    return {
      source: group.source,
      label: group.label,
      status: sourceStatus,
      status_label: recoveryEvidenceProductionStatusLabel(sourceStatus),
      residual_evidence: residualEvidence,
      task_count: group.statuses.length,
      source_task_index: sourceTaskIndices[0] ?? null,
      source_task_indices: sourceTaskIndices,
      chapter_id: chapterIds[0] ?? null,
      chapter_ids: chapterIds,
      chapter_no: chapterNos[0] ?? null,
      chapter_nos: chapterNos,
      source_tasks: group.sourceTasks,
    }
  })
  const nextAction = buildRecoveryEvidenceProductionGateNextAction(sources)

  if (!blocked) {
    const detail = `恢复依据生产闸门：${sourceDetails.join('；')}，可恢复安全连写。`
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: sources.length,
        sources,
        next_action: nextAction,
      },
    }
  }
  const detail = `恢复依据生产闸门：${sourceDetails.join('；')}。先完成回修/复检，再恢复 2-3 章安全连写。`
  return {
    signal: signal('恢复依据生产闸门', 'block', detail),
    snapshot: {
      status: 'block',
      label: '恢复依据生产闸门',
      detail,
      source_count: sources.length,
      sources,
      next_action: nextAction,
    },
  }
}

export function buildGovernanceClosureBrief(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceClosureBrief {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const recoverySourceSummary = recoveryEvidenceSourceSummary(recoveryClosure)
  const failedEvidence = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.failed_evidence),
      ...arrayValue(recoveryClosure.failedEvidence),
    ], 120).slice(0, 4)
    : []
  const recoveryWatchItems = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.watch_items),
      ...arrayValue(recoveryClosure.watchItems),
    ], 120).slice(0, 4)
    : []
  const issueLabels = [
    failedEvidence.length ? `恢复依据审计 ${Number(recoveryClosure?.resolved || 0)}/${Number(recoveryClosure?.total || 0)}${recoverySourceSummary ? `（${recoverySourceSummary}）` : ''}` : '',
    args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
  ].filter(Boolean)
  const watchItems = compactUniqueText([
    ...failedEvidence,
    ...recoveryWatchItems,
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)

  if (!issueLabels.length) {
    return {
      status: 'ok',
      label: '治理闭环',
      summary: '长线治理闭环没有发现需要前置处理的恢复依据审计或剧情线决策任务。',
      count: 0,
      sourceSummary: recoverySourceSummary,
      failedEvidence: [],
      watchItems: [],
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  return {
    status: 'block',
    label: '治理闭环',
    summary: `${issueLabels.join('；')} 未闭环：${watchItems.slice(0, 3).join('；') || '先回任务中心完成复查或修订。'}`,
    count: issueLabels.length,
    sourceSummary: recoverySourceSummary,
    failedEvidence,
    watchItems,
    action: opsAction('review_governance_closure', '治理复查台', '生成最新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: Number(recoveryClosure?.resolved || 0),
      recoveryEvidenceTotal: Number(recoveryClosure?.total || 0),
      recoveryEvidenceSourceSummary: recoverySourceSummary,
      failedEvidence,
      watchItems: recoveryWatchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function governanceMemoryFromAudit(
  audit: AnyRecord | null,
  auditEntry: { run: AnyRecord; audit: AnyRecord } | null,
  storylineDecisionGate: AutoCreationStorylineDecisionGate,
): AutoCreationGovernanceRecheckMemory | null {
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  if (!memory) return null
  const rawStatus = text(memory?.status)
  if (!['closed', 'needs_followup'].includes(rawStatus)) return null
  const storylineDecisionTaskCount = Math.max(
    Number(memory?.storyline_decision_task_count ?? memory?.storylineDecisionTaskCount ?? 0),
    storylineDecisionGate.openCount,
  )
  const status: AutoCreationGovernanceRecheckMemoryStatus = rawStatus === 'closed' && storylineDecisionTaskCount === 0
    ? 'closed'
    : 'needs_followup'
  const evidence = compactUniqueText([
    ...arrayValue(memory?.evidence),
    ...arrayValue(memory?.repaired_evidence),
    ...arrayValue(memory?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(memory?.failed_evidence),
    ...arrayValue(memory?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(memory?.watch_items),
    ...arrayValue(memory?.watchItems),
    ...storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const sourceRunId = memory?.source_run_id ?? memory?.sourceRunId ?? auditEntry?.run?.id ?? null

  if (status === 'closed') {
    return {
      visible: true,
      status,
      label: text(memory?.label, '治理复查已记录'),
      summary: text(memory?.summary, '恢复依据审计已闭环，今日生产可沿用上一轮复查证据。'),
      evidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status,
    label: text(memory?.label, '治理复查待处理'),
    summary: text(memory?.summary, '仍有治理复查记忆需要处理或观察。'),
    evidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount,
    sourceRunId,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: sourceRunId,
      recoveryEvidenceStatus: rawStatus,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount,
      storylineDecisionTaskTitles: storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function buildGovernanceRecheckMemory(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceRecheckMemory {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const explicitMemory = governanceMemoryFromAudit(audit, auditEntry, args.storylineDecisionGate)
  if (explicitMemory) return explicitMemory
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const total = Number(recoveryClosure?.total || 0)
  const resolved = Number(recoveryClosure?.resolved || 0)
  const repairedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.repaired_evidence),
    ...arrayValue(recoveryClosure?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.failed_evidence),
    ...arrayValue(recoveryClosure?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(recoveryClosure?.watch_items),
    ...arrayValue(recoveryClosure?.watchItems),
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const closed = Boolean(recoveryClosure && text(recoveryClosure.status) === 'closed' && total > 0 && args.storylineDecisionGate.openCount === 0)
  const needsFollowup = Boolean((recoveryClosure && text(recoveryClosure.status) !== 'closed' && total > 0) || args.storylineDecisionGate.openCount > 0)

  if (!closed && !needsFollowup) {
    return {
      visible: false,
      status: 'empty',
      label: '治理复查',
      summary: '还没有可沉淀的治理复查记录。',
      evidence: [],
      failedEvidence: [],
      watchItems: [],
      storylineDecisionTaskCount: 0,
      sourceRunId: null,
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  if (closed) {
    return {
      visible: true,
      status: 'closed',
      label: '治理复查已记录',
      summary: `恢复依据闭环 ${resolved}/${total}，剧情线决策无未关闭项；今日生产可沿用上一轮复查证据。`,
      evidence: repairedEvidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId: auditEntry?.run?.id || null,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status: 'needs_followup',
    label: '治理复查待处理',
    summary: [
      total > 0 ? `恢复依据审计 ${resolved}/${total}` : '',
      args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
    ].filter(Boolean).join('；') || '仍有治理闭环任务需要复查。',
    evidence: repairedEvidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
    sourceRunId: auditEntry?.run?.id || null,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: resolved,
      recoveryEvidenceTotal: total,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function issueText(value: any) {
  if (typeof value === 'string') return text(value)
  return firstText(value?.description, value?.issue, value?.message, value?.suggestion, value?.title, value?.name)
}

export function issueTexts(values: any[], limit = 6) {
  return Array.from(new Set(values.map(issueText).filter(Boolean))).slice(0, limit)
}

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

export function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(text(value).toLowerCase())
}

export function isCompletedRepairRun(run: AnyRecord) {
  return ['completed', 'success', 'done'].includes(text(run?.status).toLowerCase())
}

export const SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES = new Set([
  'batch_brief_mismatch',
  'chapter_handoff_missed',
  'chapter_benchmark_gap',
  'chapter_attraction_gap',
  'character_arc_gap',
  'benchmark_recall_gap',
  'core_drift',
  'intent_confirmation_gap',
  'innovation_execution_missed',
  'innovation_missed',
  'opening_handoff_debt',
  'post_batch_quality_warning',
  'reader_expectation_debt',
  'reader_payoff_debt',
  'reader_pull_missed',
  'target_reader_gap',
  'genre_positioning_gap',
  'female_audience_gap',
  'upgrade_rhythm_gap',
  'chapter_structure_gap',
  'chapter_progression_gap',
  'information_load_gap',
  'longform_continuity_gap',
  'core_contract_gap',
  'continuity_heat_gap',
  'revision_receipt_gap',
  'deslop_repair_gap',
  'prose_meta_gap',
  'serial_risk_repair_gap',
  'chapter_hook_quality_gap',
  'reader_retention_gap',
  'reader_retention_missed',
  'scene_card_receipt',
  'source_readiness_gap',
  'state_tracking_gap',
  'style_boundary_gap',
  'information_flow_gap',
  'expectation_threshold_gap',
  'story_loop_gap',
  'emotional_arc_gap',
  'chapter_hook_gap',
  'paragraph_hook_gap',
  'suspense_gap',
  'reversal_gap',
  'showdown_gap',
  'prose_craft_gap',
  'punctuation_tone_gap',
  'content_rubric_gap',
  'asset_linkage_gap',
  'dialogue_gap',
  'plot_dynamics_gap',
  'character_relation_gap',
  'character_behavior_gap',
  'conflict_structure_gap',
  'bridge_unit_gap',
  'opening_gap',
  'story_drive_gap',
  'storyline_sync_risk',
  'style_sample_gap',
  'volume_beat_missed',
  'volume_segment_missed',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'prose_revision_receipt_sync',
  'quality_audit_repair_receipt',
  'quality_audit_repair_receipt_sync',
  'recovery_evidence',
  'recovery_evidence_mismatch',
])

export const REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES: Record<string, string> = {
  chapter_attraction: 'chapter_attraction_gap',
  chapter_benchmark: 'chapter_benchmark_gap',
  character_arc: 'character_arc_gap',
  delivery_core: 'core_drift',
  innovation: 'innovation_missed',
  reader_expectation: 'reader_expectation_debt',
  reader_payoff: 'reader_payoff_debt',
  target_reader: 'target_reader_gap',
  target_reader_sync: 'target_reader_gap',
  genre_positioning: 'genre_positioning_gap',
  genre_positioning_sync: 'genre_positioning_gap',
  female_audience: 'female_audience_gap',
  female_audience_sync: 'female_audience_gap',
  upgrade_rhythm: 'upgrade_rhythm_gap',
  upgrade_rhythm_sync: 'upgrade_rhythm_gap',
  chapter_structure: 'chapter_structure_gap',
  chapter_structure_sync: 'chapter_structure_gap',
  chapter_progression: 'chapter_progression_gap',
  chapter_progression_sync: 'chapter_progression_gap',
  information_load: 'information_load_gap',
  information_load_sync: 'information_load_gap',
  longform_continuity: 'longform_continuity_gap',
  longform_continuity_sync: 'longform_continuity_gap',
  core_contract: 'core_contract_gap',
  core_contract_check_sync: 'core_contract_gap',
  continuity_heat: 'continuity_heat_gap',
  continuity_heat_sync: 'continuity_heat_gap',
  revision_receipt: 'revision_receipt_gap',
  revision_receipt_check_sync: 'revision_receipt_gap',
  deslop_repair: 'deslop_repair_gap',
  deslop_repair_check_sync: 'deslop_repair_gap',
  prose_meta: 'prose_meta_gap',
  prose_meta_sync: 'prose_meta_gap',
  serial_risk_repair: 'serial_risk_repair_gap',
  serial_risk_repair_sync: 'serial_risk_repair_gap',
  chapter_hook_quality: 'chapter_hook_quality_gap',
  chapter_hook_quality_sync: 'chapter_hook_quality_gap',
  reader_retention: 'reader_retention_missed',
  reader_retention_check: 'reader_retention_gap',
  reader_retention_check_sync: 'reader_retention_gap',
  signature_scene: 'signature_scene_missed',
  source_readiness: 'source_readiness_gap',
  source_readiness_sync: 'source_readiness_gap',
  state_tracking: 'state_tracking_gap',
  state_tracking_sync: 'state_tracking_gap',
  style_boundary: 'style_boundary_gap',
  style_boundary_sync: 'style_boundary_gap',
  information_flow: 'information_flow_gap',
  information_flow_sync: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  expectation_threshold_sync: 'expectation_threshold_gap',
  story_loop: 'story_loop_gap',
  story_loop_sync: 'story_loop_gap',
  emotional_arc: 'emotional_arc_gap',
  emotional_arc_sync: 'emotional_arc_gap',
  chapter_hook: 'chapter_hook_gap',
  chapter_hook_sync: 'chapter_hook_gap',
  paragraph_hook: 'paragraph_hook_gap',
  paragraph_hook_sync: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  suspense_sync: 'suspense_gap',
  reversal: 'reversal_gap',
  reversal_sync: 'reversal_gap',
  showdown: 'showdown_gap',
  showdown_sync: 'showdown_gap',
  prose_craft: 'prose_craft_gap',
  prose_craft_sync: 'prose_craft_gap',
  punctuation_tone: 'punctuation_tone_gap',
  punctuation_tone_sync: 'punctuation_tone_gap',
  content_rubric: 'content_rubric_gap',
  content_rubric_sync: 'content_rubric_gap',
  asset_linkage: 'asset_linkage_gap',
  asset_linkage_sync: 'asset_linkage_gap',
  dialogue: 'dialogue_gap',
  dialogue_sync: 'dialogue_gap',
  plot_dynamics: 'plot_dynamics_gap',
  plot_dynamics_sync: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  character_relation_sync: 'character_relation_gap',
  character_behavior: 'character_behavior_gap',
  character_behavior_sync: 'character_behavior_gap',
  conflict_structure: 'conflict_structure_gap',
  conflict_structure_sync: 'conflict_structure_gap',
  bridge_unit: 'bridge_unit_gap',
  bridge_unit_sync: 'bridge_unit_gap',
  opening: 'opening_gap',
  opening_sync: 'opening_gap',
  story_drive: 'story_drive_gap',
  storyline: 'storyline_sync_risk',
  story_unit: 'story_unit_sync_risk',
  style_sample: 'style_sample_gap',
  pre_draft_execution: 'intent_confirmation_gap',
  volume_beat: 'volume_beat_missed',
}

export function repairTaskIssueType(task: AnyRecord) {
  const explicit = text(task?.issue_type ?? task?.issueType)
  if (explicit) return explicit
  const category = text(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  if (REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]) return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]
  return SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES.has(category) ? category : ''
}

export function batchRiskIssueKeys(item: { chapterId: any; chapterNo: number }, issueType: string) {
  return [
    item.chapterId !== null && item.chapterId !== undefined ? `id:${String(item.chapterId)}:${issueType}` : '',
    item.chapterNo > 0 ? `no:${item.chapterNo}:${issueType}` : '',
  ].filter(Boolean)
}

export function batchRiskIssueBatchKey(issueType: string) {
  return `batch:${issueType}`
}

export function batchRiskIssueResolvedForBatch(keys: Set<string> | undefined, issueType: string) {
  return Boolean(keys?.has(batchRiskIssueBatchKey(issueType)))
}

export function resolvedBatchRiskIssueTypes(issueType: string) {
  if (issueType === 'batch_brief_mismatch') {
    return [
      'batch_brief_mismatch',
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ]
  }
  if (issueType === 'opening_handoff_debt' || issueType === 'reader_expectation_debt') {
    return ['opening_handoff_debt', 'reader_expectation_debt']
  }
  if (issueType === 'reader_pull_missed' || issueType === 'reader_retention_missed') {
    return ['reader_pull_missed', 'reader_retention_missed', 'reader_expectation_debt']
  }
  if (issueType === 'target_reader_gap') {
    return ['target_reader_gap']
  }
  if (issueType === 'genre_positioning_gap') {
    return ['genre_positioning_gap']
  }
  if (issueType === 'female_audience_gap') {
    return ['female_audience_gap']
  }
  if (issueType === 'upgrade_rhythm_gap') {
    return ['upgrade_rhythm_gap']
  }
  if (issueType === 'chapter_structure_gap') {
    return ['chapter_structure_gap']
  }
  if (issueType === 'chapter_progression_gap') {
    return ['chapter_progression_gap']
  }
  if (issueType === 'information_load_gap') {
    return ['information_load_gap']
  }
  if (issueType === 'longform_continuity_gap') {
    return ['longform_continuity_gap']
  }
  if (issueType === 'core_contract_gap') {
    return ['core_contract_gap']
  }
  if (issueType === 'continuity_heat_gap') {
    return ['continuity_heat_gap']
  }
  if (issueType === 'revision_receipt_gap') {
    return ['revision_receipt_gap']
  }
  if (issueType === 'deslop_repair_gap') {
    return ['deslop_repair_gap']
  }
  if (issueType === 'prose_meta_gap') {
    return ['prose_meta_gap']
  }
  if (issueType === 'serial_risk_repair_gap') {
    return ['serial_risk_repair_gap']
  }
  if (issueType === 'chapter_hook_quality_gap') {
    return ['chapter_hook_quality_gap']
  }
  if (issueType === 'reader_retention_gap') {
    return ['reader_retention_gap']
  }
  if (issueType === 'innovation_missed' || issueType === 'innovation_execution_missed') {
    return ['innovation_missed', 'innovation_execution_missed']
  }
  if (issueType === 'intent_confirmation_gap' || issueType === 'benchmark_recall_gap') {
    return ['intent_confirmation_gap', 'benchmark_recall_gap']
  }
  if (issueType === 'volume_beat_missed' || issueType === 'volume_segment_missed') {
    return ['volume_beat_missed', 'volume_segment_missed']
  }
  if (issueType === 'recovery_evidence_mismatch') {
    return ['recovery_evidence_mismatch']
  }
  if (issueType.startsWith('scene_card_receipt')) {
    return ['scene_card_receipt', issueType]
  }
  if (issueType.startsWith('deslop_repair_receipt')) {
    return ['deslop_repair_receipt', issueType]
  }
  if (issueType.startsWith('revision_cascade_impact')) {
    return ['revision_cascade_impact', issueType]
  }
  if (issueType.startsWith('revision_scope_guard')) {
    return ['revision_scope_guard', issueType]
  }
  if (issueType.startsWith('prose_revision_receipt')) {
    return ['prose_revision_receipt_sync', 'prose_revision_receipt', issueType]
  }
  if (issueType === 'strengthened_repair_acceptance_mismatch') {
    return ['strengthened_repair_acceptance_mismatch']
  }
  if (issueType === 'safe_batch_expansion_segment_hotspot') {
    return ['safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_repair') {
    return ['safe_batch_expansion_structure_repair', 'safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') {
    return ['safe_batch_expansion_structure_decision_mismatch']
  }
  if ([
    'readability_risk',
    'readability_or_meme_risk',
    'opening_pull_risk',
    'ending_page_turn_risk',
    'scene_progression_risk',
    'payoff_density_risk',
  ].includes(issueType)) {
    return [
      'readability_risk',
      'readability_or_meme_risk',
      'opening_pull_risk',
      'ending_page_turn_risk',
      'scene_progression_risk',
      'payoff_density_risk',
    ]
  }
  return [issueType]
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

export function strengthenedRepairReleaseSourcesFromPreflight(preflight: AnyRecord | null | undefined) {
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const sources = [
    ...arrayValue(releaseSummary?.strengthened_repair_sources),
    ...arrayValue(releaseSummary?.strengthenedRepairSources),
  ]
  const seen = new Set<string>()
  return sources
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const status = text(source?.status)
      const statusLabel = firstText(
        source?.status_label,
        source?.statusLabel,
        status === 'converged' ? '强化深修已收敛' : '强化深修恢复',
      )
      const evidence = firstText(source?.evidence, source?.text, label && statusLabel ? `${label}：${statusLabel}` : statusLabel)
      return evidence ? {
        evidence,
        source: text(source?.source || source?.sourceMode, 'strengthened_repair_recheck'),
        source_label: label || '强化深修来源',
        source_status: status,
        status_label: statusLabel,
      } : null
    })
    .filter((source): source is AnyRecord => {
      if (!source) return false
      const key = [source.source, source.evidence].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildStrengthenedRepairAcceptanceReview(args: {
  preflight?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
  }
}) {
  const sources = strengthenedRepairReleaseSourcesFromPreflight(args.preflight)
  const sourceEvidence = sources.map(source => text(source?.evidence)).filter(Boolean)
  const coreRiskCount = Math.max(0, Number(args.counts.coreRiskTotal || 0))
  const payoffDebtCount = Math.max(0, Number(args.counts.payoffDebtTotal || 0))
  const readerPullRiskCount = Math.max(0, Number(args.counts.readerPullRiskTotal || 0))
  const failedEvidence = [
    coreRiskCount > 0 ? `核心守恒风险 ${coreRiskCount} 项` : '',
    payoffDebtCount > 0 ? `读者回报欠账 ${payoffDebtCount} 项` : '',
    readerPullRiskCount > 0 ? `读者拉力风险 ${readerPullRiskCount} 项` : '',
  ].filter(Boolean)
  const riskCount = coreRiskCount + payoffDebtCount + readerPullRiskCount
  const sourceSummary = sourceEvidence.slice(0, 2).join('；') || '强化深修来源'

  return {
    visible: sourceEvidence.length > 0,
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    source_evidence: sourceEvidence,
    sources,
    failed_evidence: failedEvidence,
    risk_count: riskCount,
    core_risk_count: coreRiskCount,
    payoff_debt_count: payoffDebtCount,
    reader_pull_risk_count: readerPullRiskCount,
    summary: riskCount > 0
      ? `强化深修恢复验收未通过：${sourceSummary} 放行后仍有${failedEvidence.join('、')}。`
      : `强化深修恢复验收已通过：${sourceSummary} 放行后核心守恒、读者回报和追读拉力正常。`,
  }
}

export function emptyStrengthenedRepairAcceptanceTrend(): AutoCreationStrengthenedRepairAcceptanceTrend {
  return {
    visible: false,
    status: 'ok',
    label: '强化恢复验收趋势',
    summary: '暂无强化深修恢复后的批次验收记录。',
    acceptedBatchCount: 0,
    failedBatchCount: 0,
    passStreak: 0,
    latestStatus: 'none',
    latestBatchLabel: '',
    latestRunId: null,
    sourceEvidence: [],
    dimensions: {
      core: { label: '核心守恒', failedCount: 0 },
      payoff: { label: '读者回报', failedCount: 0 },
      readerPull: { label: '读者拉力', failedCount: 0 },
    },
  }
}

export function strengthenedAcceptanceFailedEvidence(counts: {
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  return [
    counts.coreRiskCount > 0 ? `核心守恒风险 ${counts.coreRiskCount} 项` : '',
    counts.payoffDebtCount > 0 ? `读者回报欠账 ${counts.payoffDebtCount} 项` : '',
    counts.readerPullRiskCount > 0 ? `读者拉力风险 ${counts.readerPullRiskCount} 项` : '',
  ].filter(Boolean)
}

export function strengthenedAcceptanceBatchEvent(args: {
  run: AnyRecord
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}) {
  if (text(args.run?.run_type) !== 'batch_generate_prose') return null
  const input = parsePayload(args.run?.input_ref, { owner: args.run, kind: 'run', field: 'input_ref' }) || {}
  const output = parsePayload(args.run?.output_ref, { owner: args.run, kind: 'run', field: 'output_ref' }) || {}
  const preflight = input?.batch_preflight || input?.batchPreflight || null
  const sources = strengthenedRepairReleaseSourcesFromPreflight(preflight)
  if (!sources.length) return null
  const outputChapters = arrayValue(output?.chapters)
  const items = outputChapters.map((chapter: any) => ({
    chapterId: chapter?.id ?? chapter?.chapter_id ?? null,
    chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0),
    title: text(chapter?.title, `第${Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)}章`),
    status: text(chapter?.status) === 'success' ? 'success' as AutoCreationBatchReviewItemStatus : 'failed' as AutoCreationBatchReviewItemStatus,
  })).filter(item => item.chapterNo > 0)
  const deliveredItems = items.filter(item => {
    if (item.status !== 'success') return false
    const chapter = findChapter(args.chapters, item)
    if (!chapter || !hasDeliveredProse(chapter)) return false
    return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo))
  })
  if (!deliveredItems.length) return null

  let coreRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  deliveredItems.forEach(item => {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) return
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    coreRiskTotal += coreRiskCount(coreReview)
    payoffDebtTotal += payoffDebtCount(payoffReview)
    readerPullRiskTotal += expectationRiskCount(expectationReview) + retentionRiskCount(retentionReview)
  })
  const failedEvidence = strengthenedAcceptanceFailedEvidence({
    coreRiskCount: coreRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
  })
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const batchLabel = firstText(
    releaseSummary?.next_batch_label,
    releaseSummary?.nextBatchLabel,
    deliveredItems.length ? `第${deliveredItems[0].chapterNo}-${deliveredItems[deliveredItems.length - 1].chapterNo}章` : '',
  )

  return {
    status: failedEvidence.length ? 'warn' as const : 'ok' as const,
    event_at: text(args.run?.created_at || args.run?.updated_at),
    run_id: args.run?.id ?? null,
    batch_label: batchLabel,
    source_evidence: sources.map(source => text(source?.evidence)).filter(Boolean),
    failed_evidence: failedEvidence,
    core_risk_count: coreRiskTotal,
    payoff_debt_count: payoffDebtTotal,
    reader_pull_risk_count: readerPullRiskTotal,
  }
}

export function strengthenedAcceptanceRepairTaskEvents(runRecords: AnyRecord[]) {
  return arrayValue(runRecords).flatMap(run => {
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    return arrayValue(output?.tasks).map(task => {
      if (text(task?.issue_type || task?.issueType) !== 'strengthened_repair_acceptance_mismatch') return null
      if (isResolvedTaskStatus(task?.task_status || task?.taskStatus)) return null
      const review = task?.strengthened_repair_acceptance_review || task?.strengthenedRepairAcceptanceReview || {}
      const failedEvidence = arrayValue(review?.failed_evidence || review?.failedEvidence).map(item => text(item)).filter(Boolean)
      const coreRiskCount = Number(review?.core_risk_count ?? review?.coreRiskCount ?? (failedEvidence.some(item => item.includes('核心')) ? 1 : 0))
      const payoffDebtCount = Number(review?.payoff_debt_count ?? review?.payoffDebtCount ?? (failedEvidence.some(item => item.includes('回报')) ? 1 : 0))
      const readerPullRiskCount = Number(review?.reader_pull_risk_count ?? review?.readerPullRiskCount ?? (failedEvidence.some(item => item.includes('拉力') || item.includes('追读')) ? 1 : 0))
      return {
        status: 'warn' as const,
        event_at: text(run?.created_at || run?.updated_at),
        run_id: run?.id ?? null,
        batch_label: firstText(review?.batch_label, review?.batchLabel, task?.title, '强化复盘批次'),
        source_evidence: arrayValue(review?.source_evidence || review?.sourceEvidence).map(item => text(item)).filter(Boolean),
        failed_evidence: failedEvidence.length
          ? failedEvidence
          : strengthenedAcceptanceFailedEvidence({ coreRiskCount, payoffDebtCount, readerPullRiskCount }),
        core_risk_count: Number.isFinite(coreRiskCount) ? coreRiskCount : 0,
        payoff_debt_count: Number.isFinite(payoffDebtCount) ? payoffDebtCount : 0,
        reader_pull_risk_count: Number.isFinite(readerPullRiskCount) ? readerPullRiskCount : 0,
      }
    }).filter(Boolean)
  })
}

export function buildStrengthenedRepairAcceptanceTrend(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}): AutoCreationStrengthenedRepairAcceptanceTrend {
  const batchEvents = arrayValue(args.runRecords)
    .map(run => strengthenedAcceptanceBatchEvent({
      run,
      chapters: args.chapters,
      reviews: args.reviews,
      storyState: args.storyState,
    }))
    .filter((event): event is AnyRecord => Boolean(event))
  const events = [
    ...batchEvents,
    ...strengthenedAcceptanceRepairTaskEvents(args.runRecords),
  ].sort((a, b) => recoveryEvidenceEventTime(a.event_at) - recoveryEvidenceEventTime(b.event_at))
  if (!events.length) return emptyStrengthenedRepairAcceptanceTrend()

  const acceptedBatchCount = events.filter(event => event.status === 'ok').length
  const failedBatchCount = events.filter(event => event.status === 'warn').length
  const latest = events[events.length - 1]
  let passStreak = 0
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].status !== 'ok') break
    passStreak += 1
  }
  const coreFailedCount = events.reduce((sum, event) => sum + Number(event.core_risk_count || 0), 0)
  const payoffFailedCount = events.reduce((sum, event) => sum + Number(event.payoff_debt_count || 0), 0)
  const readerPullFailedCount = events.reduce((sum, event) => sum + Number(event.reader_pull_risk_count || 0), 0)
  const latestFailedEvidence = arrayValue(latest?.failed_evidence).map(item => text(item)).filter(Boolean)
  const latestSourceEvidence = arrayValue(latest?.source_evidence).map(item => text(item)).filter(Boolean)
  const status: AutoCreationBatchGuardrailSignalStatus = latest.status === 'warn' ? 'warn' : 'ok'
  const summary = status === 'warn'
    ? `强化恢复验收最近 1 批未通过：${latestFailedEvidence.slice(0, 3).join('、') || '核心/回报/追读仍需复盘'}；本轮回到单章治理。`
    : `强化恢复验收连续 ${Math.max(1, passStreak)} 批通过，核心守恒、读者回报和追读拉力趋势稳定，可继续小批量扩批观察。`

  return {
    visible: true,
    status,
    label: '强化恢复验收趋势',
    summary,
    acceptedBatchCount,
    failedBatchCount,
    passStreak,
    latestStatus: latest.status,
    latestBatchLabel: text(latest.batch_label),
    latestRunId: latest.run_id ?? null,
    sourceEvidence: Array.from(new Set([
      ...latestSourceEvidence,
      ...events.flatMap(event => arrayValue(event.source_evidence).map(item => text(item)).filter(Boolean)),
    ])).slice(0, 6),
    dimensions: {
      core: { label: '核心守恒', failedCount: coreFailedCount },
      payoff: { label: '读者回报', failedCount: payoffFailedCount },
      readerPull: { label: '读者拉力', failedCount: readerPullFailedCount },
    },
  }
}

export function strengthenedRepairAcceptanceTrendSnapshot(trend: AutoCreationStrengthenedRepairAcceptanceTrend) {
  if (!trend.visible) return null
  return {
    visible: true,
    status: trend.status,
    label: trend.label,
    summary: trend.summary,
    accepted_batch_count: trend.acceptedBatchCount,
    failed_batch_count: trend.failedBatchCount,
    pass_streak: trend.passStreak,
    latest_status: trend.latestStatus,
    latest_batch_label: trend.latestBatchLabel,
    latest_run_id: trend.latestRunId,
    source_evidence: trend.sourceEvidence,
    dimensions: {
      core: { label: trend.dimensions.core.label, failed_count: trend.dimensions.core.failedCount },
      payoff: { label: trend.dimensions.payoff.label, failed_count: trend.dimensions.payoff.failedCount },
      reader_pull: { label: trend.dimensions.readerPull.label, failed_count: trend.dimensions.readerPull.failedCount },
    },
  }
}

export function safeBatchRecoveryRoadmapLane(targetChapterCount: number) {
  if (targetChapterCount <= 1) return { key: 'single_chapter', label: '1章治理' }
  if (targetChapterCount >= 5) return { key: 'expanded_batch', label: '5章连写' }
  return { key: 'small_batch', label: `${Math.max(1, targetChapterCount)}章验证` }
}

export function safeBatchRecoveryRoadmapNode(args: {
  key: string
  label: string
  status: string
  targetChapterCount: number
  detail: string
  actionLabel: string
  focus?: AnyRecord | null
}) {
  const focus = args.focus || safeBatchRecoveryRoadmapFocus(args.key, args.label, args.actionLabel)
  return {
    key: args.key,
    label: args.label,
    status: ['ok', 'warn', 'pending'].includes(args.status) ? args.status : 'pending',
    target_chapter_count: Math.max(0, Number(args.targetChapterCount || 0)),
    detail: text(args.detail),
    action_label: text(args.actionLabel),
    ...(focus ? { focus } : {}),
  }
}

export function safeBatchRecoveryRoadmapActionLabel(key: string) {
  if (key === 'strengthened_acceptance') return '查看强化复盘'
  if (key === 'expansion_feedback') return '修扩批热区'
  if (key === 'structure_validation') return '修扩批结构'
  if (key === 'structure_repair_effectiveness') return '重做结构修复'
  if (key === 'structure_decision_execution') return '补齐结构决策执行'
  if (key === 'default_lane_template_version') return '修当前模板版本'
  return '查看安全连写'
}

export function safeBatchRecoveryRoadmapFocus(key: string, label: string, actionLabel: string, overrides: AnyRecord | null = null) {
  const focusMap: Record<string, AnyRecord> = {
    strengthened_acceptance: {
      target_view: 'recovery_review',
      issue_type: 'strengthened_repair_acceptance_mismatch',
      source: 'strengthened_repair_acceptance_trend',
      task_center_filter_label: '强化复盘',
    },
    expansion_feedback: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_segment_hotspot',
      source: 'safe_batch_expansion_feedback',
      task_center_filter_label: '扩批分段',
    },
    structure_validation: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_validation',
      task_center_filter_label: '扩批结构',
    },
    structure_repair_effectiveness: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_repair_effectiveness',
      task_center_filter_label: '扩批结构',
    },
    structure_decision_execution: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      task_center_filter_label: '扩批结构决策',
    },
    default_lane_template_version: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'default_five_chapter_lane_template_stability_profile',
      task_center_filter_label: '当前模板版本',
      requirement_key: 'default_lane_template',
    },
  }
  const focus = focusMap[key]
  if (!focus) return null
  return {
    layer_key: key,
    layer_label: label,
    action_label: actionLabel,
    task_statuses: ['open', 'needs_review'],
    ...focus,
    ...(overrides || {}),
  }
}

export function buildSafeBatchRecoveryRoadmap(args: {
  trend: AutoCreationStrengthenedRepairAcceptanceTrend
  feedback?: AnyRecord | null
  policyStatus: string
  policySummary: string
  targetChapterCount: number
  baseChapterCount: number
  expandedChapterCount: number
  requiredPassStreak: number
}) {
  const feedback = args.feedback || null
  const feedbackStatus = text(feedback?.status, 'none')
  const validationTrend = feedback?.expansionStructureValidationTrend
    || feedback?.expansion_structure_validation_trend
    || null
  const repairEffectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const decisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const defaultLaneTemplateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = defaultLaneTemplateStabilityProfile?.latest_template_version_profile
    || defaultLaneTemplateStabilityProfile?.latestTemplateVersionProfile
    || null
  const strengthenedStatus = args.trend.status === 'warn' || args.trend.latestStatus === 'warn'
    ? 'warn'
    : args.trend.passStreak >= args.requiredPassStreak
      ? 'ok'
      : 'pending'
  const feedbackNodeStatus = ['rollback_to_single_chapter', 'rollback_to_small_batch'].includes(feedbackStatus)
    ? 'warn'
    : ['passed', 'recovered'].includes(feedbackStatus)
      ? 'ok'
      : 'pending'
  const feedbackRepeatedHotspot = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const feedbackRestoreRelapse = text(feedbackRepeatedHotspot?.source) === 'safe_batch_recovery_restore_five_batch'
  const feedbackDefaultRegression = feedback?.defaultFiveChapterRegression || feedback?.default_five_chapter_regression || null
  const feedbackDefaultRegressionRelapse = Boolean(feedbackDefaultRegression && feedbackDefaultRegression.visible !== false)
  const feedbackNeedsStructureValidation = feedbackRestoreRelapse || feedbackDefaultRegressionRelapse
  const feedbackFocus = feedbackNeedsStructureValidation
    ? safeBatchRecoveryRoadmapFocus('structure_validation', '结构验证', safeBatchRecoveryRoadmapActionLabel('structure_validation'))
    : null
  const validationStatus = validationTrend?.visible
    ? text(validationTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const repairRecommendation = text(repairEffectiveness?.recommendation)
  const repairStatus = repairEffectiveness?.visible
    ? repairRecommendation === 'escalate_structure_redesign' ? 'warn' : 'ok'
    : 'pending'
  const decisionStatus = decisionTrend?.visible
    ? text(decisionTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const topDecisionRequirement = decisionTrend?.top_failed_requirement || decisionTrend?.topFailedRequirement || null
  const decisionFailedRequirements = arrayValue(decisionTrend?.failed_requirements || decisionTrend?.failedRequirements)
  const decisionHasDefaultLaneTemplateGap = Boolean(
    decisionTrend?.default_five_chapter_lane_redesign
    || decisionTrend?.defaultFiveChapterLaneRedesign
    || text(topDecisionRequirement?.key).startsWith('default_lane_')
    || decisionFailedRequirements.some((item: AnyRecord) => text(item?.key).startsWith('default_lane_')),
  )
  const decisionActionLabel = decisionHasDefaultLaneTemplateGap
    ? '补默认档位模板'
    : safeBatchRecoveryRoadmapActionLabel('structure_decision_execution')
  const decisionFocus = decisionHasDefaultLaneTemplateGap
    ? safeBatchRecoveryRoadmapFocus('structure_decision_execution', '结构决策执行', decisionActionLabel, {
      task_center_filter_label: '默认档位模板',
      requirement_key: 'default_lane_template',
    })
    : null
  const templateVersionId = text(latestTemplateVersionProfile?.id || latestTemplateVersionProfile?.template_version_id || latestTemplateVersionProfile?.templateVersionId)
  const templateVersionStatus = text(latestTemplateVersionProfile?.status)
  const templateVersionPassStreak = Number(latestTemplateVersionProfile?.pass_streak ?? latestTemplateVersionProfile?.passStreak ?? 0)
  const templateVersionRequiredPassStreak = Number(latestTemplateVersionProfile?.required_pass_streak ?? latestTemplateVersionProfile?.requiredPassStreak ?? defaultLaneTemplateStabilityProfile?.required_pass_streak ?? defaultLaneTemplateStabilityProfile?.requiredPassStreak ?? 2)
  const latestProductionRelapseVerdict = latestTemplateVersionProfile?.latest_production_relapse_verdict
    || latestTemplateVersionProfile?.latestProductionRelapseVerdict
    || null
  const latestProductionRelapseStatus = text(latestProductionRelapseVerdict?.status)
  const latestProductionRelapseRemainingReasons = arrayValue(latestProductionRelapseVerdict?.remaining_failure_reasons || latestProductionRelapseVerdict?.remainingFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseClearedReasons = arrayValue(latestProductionRelapseVerdict?.cleared_failure_reasons || latestProductionRelapseVerdict?.clearedFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseText = latestProductionRelapseStatus === 'failed'
    ? `生产后验仍复发：${latestProductionRelapseRemainingReasons.join('、') || '真实生产失败维度'}。`
    : latestProductionRelapseStatus === 'passed'
      ? `生产后验已修复：${latestProductionRelapseClearedReasons.join('、') || '真实生产失败维度'}已清零。`
      : ''
  const defaultLaneTemplateStatus = text(defaultLaneTemplateStabilityProfile?.status)
  const defaultLaneTemplateVersionWarn = ['relapsed', 'redesign'].includes(defaultLaneTemplateStatus)
    || ['relapsed', 'redesign'].includes(templateVersionStatus)
  const defaultLaneTemplateVersionReady = Boolean(defaultLaneTemplateStabilityProfile)
    && !defaultLaneTemplateVersionWarn
    && (templateVersionStatus === 'ready' || (!templateVersionId && defaultLaneTemplateStatus === 'ready'))
  const defaultLaneTemplateVersionStatus = !defaultLaneTemplateStabilityProfile
    ? 'pending'
    : defaultLaneTemplateVersionWarn
      ? 'warn'
      : defaultLaneTemplateVersionReady
        ? 'ok'
        : 'pending'
  const defaultLaneTemplateVersionActionLabel = defaultLaneTemplateVersionStatus === 'warn'
    ? latestProductionRelapseStatus === 'failed'
      ? '修生产后验'
      : defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign'
      ? '重构当前模板版本'
      : '修当前模板版本'
    : defaultLaneTemplateVersionStatus === 'ok'
      ? '当前模板版本稳定'
      : '观察当前模板版本'
  const defaultLaneTemplateVersionFocus = defaultLaneTemplateVersionStatus === 'warn'
    ? safeBatchRecoveryRoadmapFocus('default_lane_template_version', '默认档位模板版本', defaultLaneTemplateVersionActionLabel, {
      task_center_filter_label: latestProductionRelapseStatus === 'failed' ? '生产后验仍复发' : '当前模板版本',
      requirement_key: 'default_lane_template',
      template_version_id: templateVersionId,
    })
    : null
  const routeNodes = [
    safeBatchRecoveryRoadmapNode({
      key: 'strengthened_acceptance',
      label: '强化验收',
      status: strengthenedStatus,
      targetChapterCount: strengthenedStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: args.trend.visible
        ? args.trend.summary
        : `尚未形成强化验收趋势，先保持 ${args.baseChapterCount} 章以内。`,
      actionLabel: safeBatchRecoveryRoadmapActionLabel('strengthened_acceptance'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'expansion_feedback',
      label: '扩批热区',
      status: feedbackNodeStatus,
      targetChapterCount: feedbackNodeStatus === 'warn' ? Number(feedback?.targetChapterCount || args.baseChapterCount) : args.expandedChapterCount,
      detail: text(feedback?.summary, '尚未产生5章扩批热区复盘。'),
      actionLabel: feedbackNeedsStructureValidation
        ? safeBatchRecoveryRoadmapActionLabel('structure_validation')
        : safeBatchRecoveryRoadmapActionLabel('expansion_feedback'),
      focus: feedbackFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_validation',
      label: '结构验证',
      status: validationStatus,
      targetChapterCount: validationStatus === 'warn' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(validationTrend?.summary, '尚未进入扩批结构验证批。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_validation'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_repair_effectiveness',
      label: '结构修复有效性',
      status: repairStatus,
      targetChapterCount: repairRecommendation === 'escalate_structure_redesign' ? 1 : repairRecommendation === 'continue_small_validation' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(repairEffectiveness?.summary, '尚未形成结构修复有效性结论。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_repair_effectiveness'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_decision_execution',
      label: '结构决策执行',
      status: decisionStatus,
      targetChapterCount: decisionStatus === 'warn'
        ? Number(decisionTrend?.suggested_target_chapter_count ?? decisionTrend?.suggestedTargetChapterCount ?? args.baseChapterCount)
        : args.expandedChapterCount,
      detail: topDecisionRequirement
        ? `结构决策漏项：${text(topDecisionRequirement.label, '执行要求')} ${Number(topDecisionRequirement.count || 0)}。${text(decisionTrend?.summary)}`
        : text(decisionTrend?.summary, '尚未形成结构决策执行趋势。'),
      actionLabel: decisionActionLabel,
      focus: decisionFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'default_lane_template_version',
      label: '默认档位模板版本',
      status: defaultLaneTemplateVersionStatus,
      targetChapterCount: defaultLaneTemplateVersionStatus === 'warn'
        ? defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign' ? 1 : args.baseChapterCount
        : defaultLaneTemplateVersionStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: templateVersionId
        ? [
          text(defaultLaneTemplateStabilityProfile?.summary, '默认档位模板版本仍在观察。'),
          latestProductionRelapseText,
          `当前模板版本 ${templateVersionId} 连过 ${Math.max(0, templateVersionPassStreak)}/${Math.max(1, templateVersionRequiredPassStreak || 2)}。`,
        ].filter(Boolean).join(' ')
        : text(defaultLaneTemplateStabilityProfile?.summary, '尚未形成默认档位模板版本稳定证据。'),
      actionLabel: defaultLaneTemplateVersionActionLabel,
      focus: defaultLaneTemplateVersionFocus,
    }),
  ]
  const preferredTemplateVersionLayer = defaultLaneTemplateVersionStatus === 'warn'
    ? routeNodes.find(node => node.key === 'default_lane_template_version') || null
    : null
  const nextRepairLayer = preferredTemplateVersionLayer
    || routeNodes.find(node => node.status === 'warn')
    || routeNodes.find(node => node.status === 'pending')
    || null
  const lane = safeBatchRecoveryRoadmapLane(args.targetChapterCount)
  const recommendedFocus = nextRepairLayer?.status === 'warn'
    ? nextRepairLayer.focus || safeBatchRecoveryRoadmapFocus(nextRepairLayer.key, nextRepairLayer.label, nextRepairLayer.action_label)
    : null

  return {
    visible: true,
    label: '安全连写恢复路线图',
    current_lane: lane.key,
    current_lane_label: lane.label,
    current_target_chapter_count: Math.max(1, Number(args.targetChapterCount || 1)),
    current_status: text(args.policyStatus, 'observing'),
    current_reason: text(args.policySummary),
    next_repair_layer: nextRepairLayer,
    ...(recommendedFocus ? { recommended_focus: recommendedFocus } : {}),
    route_nodes: routeNodes,
  }
}

