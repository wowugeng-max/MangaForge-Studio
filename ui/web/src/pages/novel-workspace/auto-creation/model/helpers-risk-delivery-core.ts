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

