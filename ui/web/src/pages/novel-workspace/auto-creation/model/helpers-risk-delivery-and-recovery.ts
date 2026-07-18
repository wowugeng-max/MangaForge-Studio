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
