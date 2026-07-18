import {
  type AnyRecord,
  arrayValue,
  firstText,
  objectValue,
  text,
} from './utils'
import {
  approvalBlockerNeedsNextChapterQualityPlan,
  compactChapterNosForPrompt,
  deliveryRiskReceiptSegmentRepairLines,
  isSingleChapterRecoveryEvidenceTask,
  metricNumber,
  normalizeApprovalBlockerRepairContext,
  normalizeBatchPlanContext,
  normalizeDefaultFiveChapterLaneTemplateRedesignQueue,
  normalizeDefaultFiveChapterLaneTemplateRepair,
  normalizeDeliveryRiskContext,
  normalizeDeslopRepairReceiptRepair,
  normalizeExpansionStructureValidationTrend,
  normalizePostBatchQualityRepair,
  normalizePostDeliveryQualityRepair,
  normalizeProseRevisionReceiptSyncRepair,
  normalizeQualityAuditRepair,
  normalizeQualityAuditRepairReceiptRepair,
  normalizeRecoveryEvidenceReview,
  normalizeRevisionCascadeImpactRepair,
  normalizeRevisionContextReceiptRepair,
  normalizeRevisionScopeGuardRepair,
  normalizeSceneCardDirectiveRepair,
  normalizeSceneCardReceiptRepair,
  repairTaskIssueType,
  summarizeEvidenceItem,
  summarizeKeyValueFlags,
} from './support'
export {
  listQualityContractRequiredFieldKeys,
  listQualityContractRequiredFields,
  buildDeliveryRiskRevisionClosurePlan,
} from './support'
import { buildRepairTaskRevisionPromptText } from './prompt-lines'

export function buildRepairTaskRevisionPrompt(task: AnyRecord, run?: AnyRecord | null) {
  const taskIssueType = repairTaskIssueType(task)
  const taskCategory = firstText(task.annotation_category, task.annotationCategory, task.category)
  const batchPlan = normalizeBatchPlanContext(task, run)
  const chapterPlan = batchPlan?.chapter_plan
  const recoveryEvidenceReview = normalizeRecoveryEvidenceReview(task)
  const singleChapterRecoveryEvidence = isSingleChapterRecoveryEvidenceTask(task)
  const deliveryRisk = normalizeDeliveryRiskContext(task)
  const sceneCardReceiptRepair = normalizeSceneCardReceiptRepair(task)
  const sceneCardDirectiveRepair = normalizeSceneCardDirectiveRepair(task)
  const deslopRepairReceiptRepair = normalizeDeslopRepairReceiptRepair(task)
  const revisionCascadeImpactRepair = normalizeRevisionCascadeImpactRepair(task)
  const revisionScopeGuardRepair = normalizeRevisionScopeGuardRepair(task)
  const revisionContextReceiptRepair = normalizeRevisionContextReceiptRepair(task)
  const proseRevisionReceiptSyncRepair = normalizeProseRevisionReceiptSyncRepair(task)
  const qualityAuditRepairReceiptRepair = normalizeQualityAuditRepairReceiptRepair(task)
  const qualityAuditRepair = normalizeQualityAuditRepair(task)
  const approvalBlocker = normalizeApprovalBlockerRepairContext(task)
  const serialRhythmReview = task.serial_rhythm_review || task.serialRhythmReview || null
  const postBatchQualityRepair = normalizePostBatchQualityRepair(task)
  const postDeliveryQualityRepair = normalizePostDeliveryQualityRepair(task)
  const volumeSegmentReview = task.volume_segment_review || task.volumeSegmentReview || null
  const readerPullReview = task.reader_pull_review || task.readerPullReview || (
    ['reader_pull_missed', 'reader_retention_missed'].includes(taskIssueType)
      ? {
        retention_label: firstText(task.message, task.summary, task.action, '追读漏项待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const innovationReview = task.innovation_review || task.innovationReview || (
    ['innovation_execution_missed', 'innovation_missed'].includes(taskIssueType)
      ? {
        label: firstText(task.message, task.summary, '创新/IP化执行待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const chapterAttractionReview = task.chapter_attraction_review || task.chapterAttractionReview || null
  const storyDriveSync = task.story_drive_sync || task.storyDriveSync || null
  const wordCountSync = task.word_count_sync || task.wordCountSync || (
    taskIssueType === 'word_count_gap'
    || taskIssueType === 'chapter_word_count_gap'
    || taskIssueType === 'chapter_length_gap'
    || taskIssueType === 'length_gap'
    || taskCategory === 'word_count'
      ? {
        label: firstText(task.message, task.summary, '字数不足待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const characterArcSync = task.character_arc_sync || task.characterArcSync || null
  const chapterBenchmarkSync = task.chapter_benchmark_sync || task.chapterBenchmarkSync || null
  const styleSampleSync = task.style_sample_sync || task.styleSampleSync || null
  const sourceReadinessSync = task.source_readiness_sync || task.sourceReadinessSync || (
    taskIssueType === 'source_readiness_gap'
      ? {
        label: firstText(task.message, task.summary, '来源就绪缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const stateTrackingSync = task.state_tracking_sync || task.stateTrackingSync || (
    taskIssueType === 'state_tracking_gap'
      ? {
        label: firstText(task.message, task.summary, '状态跟踪缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const storyStateUpdateSync = task.story_state_update_sync || task.storyStateUpdateSync || task.state_delta_sync || task.stateDeltaSync || (
    taskIssueType === 'story_state_update_gap'
    || taskIssueType === 'state_delta_gap'
    || taskCategory === 'story_state'
    || taskCategory === 'story_state_update'
    || taskCategory === 'state_delta'
      ? {
        label: firstText(task.message, task.summary, '状态写回缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const styleBoundarySync = task.style_boundary_sync || task.styleBoundarySync || (
    taskIssueType === 'style_boundary_gap'
      ? {
        label: firstText(task.message, task.summary, '风格边界缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const informationFlowSync = task.information_flow_sync || task.informationFlowSync || (
    taskIssueType === 'information_flow_gap'
      ? {
        label: firstText(task.message, task.summary, '信息流缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const expectationThresholdSync = task.expectation_threshold_sync || task.expectationThresholdSync || (
    taskIssueType === 'expectation_threshold_gap'
      ? {
        label: firstText(task.message, task.summary, '期待阈值缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const storyLoopSync = task.story_loop_sync || task.storyLoopSync || (
    taskIssueType === 'story_loop_gap'
      ? {
        label: firstText(task.message, task.summary, '故事闭环缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const emotionalArcSync = task.emotional_arc_sync || task.emotionalArcSync || (
    taskIssueType === 'emotional_arc_gap'
      ? {
        label: firstText(task.message, task.summary, '情绪弧缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const chapterHookSync = task.chapter_hook_sync || task.chapterHookSync || (
    taskIssueType === 'chapter_hook_gap'
      ? {
        label: firstText(task.message, task.summary, '章级钩子缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const paragraphHookSync = task.paragraph_hook_sync || task.paragraphHookSync || (
    taskIssueType === 'paragraph_hook_gap'
      ? {
        label: firstText(task.message, task.summary, '段落级钩子缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const suspenseSync = task.suspense_sync || task.suspenseSync || (
    taskIssueType === 'suspense_gap'
      ? {
        label: firstText(task.message, task.summary, '悬念编排缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const assetLinkageSync = task.asset_linkage_sync || task.assetLinkageSync || (
    taskIssueType === 'asset_linkage_gap'
      ? {
        label: firstText(task.message, task.summary, '资产挂钩缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const dialogueSync = task.dialogue_sync || task.dialogueSync || (
    taskIssueType === 'dialogue_gap'
      ? {
        label: firstText(task.message, task.summary, '对白质量缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const plotDynamicsSync = task.plot_dynamics_sync || task.plotDynamicsSync || (
    taskIssueType === 'plot_dynamics_gap'
      ? {
        label: firstText(task.message, task.summary, '剧情动力缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const characterRelationSync = task.character_relation_sync || task.characterRelationSync || (
    taskIssueType === 'character_relation_gap'
      ? {
        label: firstText(task.message, task.summary, '角色关系缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const characterBehaviorSync = task.character_behavior_sync || task.characterBehaviorSync || (
    taskIssueType === 'character_behavior_gap'
      ? {
        label: firstText(task.message, task.summary, '角色行为缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const conflictStructureSync = task.conflict_structure_sync || task.conflictStructureSync || (
    taskIssueType === 'conflict_structure_gap'
      ? {
        label: firstText(task.message, task.summary, '冲突结构缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const bridgeUnitSync = task.bridge_unit_sync || task.bridgeUnitSync || (
    taskIssueType === 'bridge_unit_gap'
      ? {
        label: firstText(task.message, task.summary, '桥段节奏缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const reversalSync = task.reversal_sync || task.reversalSync || (
    taskIssueType === 'reversal_gap'
      ? {
        label: firstText(task.message, task.summary, '反转设计缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const showdownSync = task.showdown_sync || task.showdownSync || (
    taskIssueType === 'showdown_gap'
      ? {
        label: firstText(task.message, task.summary, '高潮对抗缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const openingSync = task.opening_sync || task.openingSync || (
    taskIssueType === 'opening_gap'
      ? {
        label: firstText(task.message, task.summary, '开篇设计缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const proseCraftSync = task.prose_craft_sync || task.proseCraftSync || (
    taskIssueType === 'prose_craft_gap'
      ? {
        label: firstText(task.message, task.summary, '正文工艺缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const punctuationToneSync = task.punctuation_tone_sync || task.punctuationToneSync || (
    taskIssueType === 'punctuation_tone_gap'
      ? {
        label: firstText(task.message, task.summary, '语气标点缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const contentRubricSync = task.content_rubric_sync || task.contentRubricSync || (
    taskIssueType === 'content_rubric_gap'
      ? {
        label: firstText(task.message, task.summary, '内容基准缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const targetReaderSync = task.target_reader_sync || task.targetReaderSync || (
    taskIssueType === 'target_reader_gap'
      ? {
        label: firstText(task.message, task.summary, '目标读者缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const genrePositioningSync = task.genre_positioning_sync || task.genrePositioningSync || (
    taskIssueType === 'genre_positioning_gap'
      ? {
        label: firstText(task.message, task.summary, '题材定位缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const femaleAudienceSync = task.female_audience_sync || task.femaleAudienceSync || (
    taskIssueType === 'female_audience_gap'
      ? {
        label: firstText(task.message, task.summary, '女频长篇缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const upgradeRhythmSync = task.upgrade_rhythm_sync || task.upgradeRhythmSync || (
    taskIssueType === 'upgrade_rhythm_gap'
      ? {
        label: firstText(task.message, task.summary, '升级节奏缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const chapterStructureSync = task.chapter_structure_sync || task.chapterStructureSync || (
    taskIssueType === 'chapter_structure_gap'
      ? {
        label: firstText(task.message, task.summary, '章节结构缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const chapterProgressionSync = task.chapter_progression_sync || task.chapterProgressionSync || (
    taskIssueType === 'chapter_progression_gap'
      ? {
        label: firstText(task.message, task.summary, '章节推进缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const informationLoadSync = task.information_load_sync || task.informationLoadSync || (
    taskIssueType === 'information_load_gap'
      ? {
        label: firstText(task.message, task.summary, '信息负载缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const longformContinuitySync = task.longform_continuity_sync || task.longformContinuitySync || (
    taskIssueType === 'longform_continuity_gap'
      ? {
        label: firstText(task.message, task.summary, '长篇连续性缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const titleUniquenessSync = task.title_uniqueness_sync || task.titleUniquenessSync || (
    taskIssueType === 'title_uniqueness_gap'
      || taskIssueType === 'chapter_title_uniqueness'
      || firstText(task.annotation_category, task.annotationCategory, task.category) === 'title_uniqueness'
      ? {
        label: firstText(task.message, task.summary, '标题重复待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const coreContractCheckSync = task.core_contract_check_sync || task.coreContractCheckSync || (
    taskIssueType === 'core_contract_gap'
      ? {
        label: firstText(task.message, task.summary, '核心契约缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const continuityHeatSync = task.continuity_heat_sync || task.continuityHeatSync || (
    taskIssueType === 'continuity_heat_gap'
      ? {
        label: firstText(task.message, task.summary, '连续性热度缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const revisionReceiptCheckSync = task.revision_receipt_check_sync || task.revisionReceiptCheckSync || (
    taskIssueType === 'revision_receipt_gap'
      ? {
        label: firstText(task.message, task.summary, '修订回执缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const deslopRepairCheckSync = task.deslop_repair_check_sync || task.deslopRepairCheckSync || (
    taskIssueType === 'deslop_repair_gap'
      ? {
        label: firstText(task.message, task.summary, '去AI味修复缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const proseMetaSync = task.prose_meta_sync || task.proseMetaSync || (
    taskIssueType === 'prose_meta_gap'
      ? {
        label: firstText(task.message, task.summary, '正文元叙事缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const bannedWordsSync = task.banned_words_sync || task.bannedWordsSync || (
    taskIssueType === 'banned_words_gap'
    || taskCategory === 'banned_words'
      ? {
        label: firstText(task.message, task.summary, '禁用词扫描缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const blueprintConsumptionSync = task.blueprint_consumption_sync || task.blueprintConsumptionSync || task.chapter_blueprint_sync || task.chapterBlueprintSync || (
    taskIssueType === 'blueprint_consumption_gap'
    || taskCategory === 'blueprint_consumption'
    || taskCategory === 'chapter_blueprint'
      ? {
        label: firstText(task.message, task.summary, '细纲兑现缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const foreshadowingDeltaSync = task.foreshadowing_delta_sync || task.foreshadowingDeltaSync || (
    taskIssueType === 'foreshadowing_delta_gap'
    || taskCategory === 'foreshadowing_delta'
      ? {
        label: firstText(task.message, task.summary, '伏笔增量缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const deterministicCleanupSync = task.deterministic_cleanup_sync || task.deterministicCleanupSync || task.deterministic_prose_cleanup_sync || task.deterministicProseCleanupSync || (
    taskIssueType === 'deterministic_cleanup_gap'
    || taskCategory === 'deterministic_cleanup'
    || taskCategory === 'deterministic_prose_cleanup'
      ? {
        label: firstText(task.message, task.summary, '确定性清理缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const serialRiskRepairSync = task.serial_risk_repair_sync || task.serialRiskRepairSync || (
    taskIssueType === 'serial_risk_repair_gap'
      ? {
        label: firstText(task.message, task.summary, '连续风险修复缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const chapterHookQualitySync = task.chapter_hook_quality_sync || task.chapterHookQualitySync || (
    taskIssueType === 'chapter_hook_quality_gap'
      ? {
        label: firstText(task.message, task.summary, '章钩质量缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const readerRetentionCheckSync = task.reader_retention_check_sync || task.readerRetentionCheckSync || (
    taskIssueType === 'reader_retention_gap'
      ? {
        label: firstText(task.message, task.summary, '追读雷达缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const intentConfirmationSync = task.intent_confirmation_sync || task.intentConfirmationSync || (
    taskIssueType === 'intent_confirmation_gap'
      ? {
        label: firstText(task.message, task.summary, '意图确认缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const writePreparationSync = task.write_preparation_sync || task.writePreparationSync || (
    taskIssueType === 'write_preparation_gap'
      ? {
        label: firstText(task.message, task.summary, '写前准备缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const benchmarkRecallSync = task.benchmark_recall_sync || task.benchmarkRecallSync || (
    taskIssueType === 'benchmark_recall_gap'
      ? {
        label: firstText(task.message, task.summary, '文风召回缺口待修复'),
        missed: firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
      }
      : null
  )
  const nextChapterQualityPlanReceiptPayload = objectValue(task.payload)
  const nextChapterQualityPlanReceiptSync = task.next_chapter_quality_plan_receipts_sync || task.nextChapterQualityPlanReceiptsSync || (
    taskIssueType === 'next_chapter_quality_plan_receipts_gap'
      ? {
        label: firstText(nextChapterQualityPlanReceiptPayload.label, task.message, task.summary, '质量续航回执缺口待修复'),
        missed: arrayValue(nextChapterQualityPlanReceiptPayload.missed).length > 0
          ? arrayValue(nextChapterQualityPlanReceiptPayload.missed)
          : firstText(task.action) ? [{ label: '修复动作', text: task.action }] : [],
        next_actions: arrayValue(nextChapterQualityPlanReceiptPayload.next_actions || nextChapterQualityPlanReceiptPayload.nextActions),
      }
      : null
  )
  const readerTrialReview = task.reader_trial_review || task.readerTrialReview || null
  const first30Retention = task.first30_retention || task.first30Retention || null
  const expansionStructureReview = task.safe_batch_expansion_structure_review || task.safeBatchExpansionStructureReview || null
  const expansionStructureDecisionReview = task.safe_batch_expansion_structure_decision_review || task.safeBatchExpansionStructureDecisionReview || null
  return buildRepairTaskRevisionPromptText({
    task,
    run,
    taskIssueType,
    taskCategory,
    batchPlan,
    chapterPlan,
    recoveryEvidenceReview,
    singleChapterRecoveryEvidence,
    deliveryRisk,
    sceneCardReceiptRepair,
    sceneCardDirectiveRepair,
    deslopRepairReceiptRepair,
    revisionCascadeImpactRepair,
    revisionScopeGuardRepair,
    revisionContextReceiptRepair,
    proseRevisionReceiptSyncRepair,
    qualityAuditRepairReceiptRepair,
    qualityAuditRepair,
    approvalBlocker,
    serialRhythmReview,
    postBatchQualityRepair,
    postDeliveryQualityRepair,
    volumeSegmentReview,
    readerPullReview,
    innovationReview,
    chapterAttractionReview,
    storyDriveSync,
    wordCountSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    sourceReadinessSync,
    stateTrackingSync,
    storyStateUpdateSync,
    styleBoundarySync,
    informationFlowSync,
    expectationThresholdSync,
    storyLoopSync,
    emotionalArcSync,
    chapterHookSync,
    paragraphHookSync,
    suspenseSync,
    assetLinkageSync,
    dialogueSync,
    plotDynamicsSync,
    characterRelationSync,
    characterBehaviorSync,
    conflictStructureSync,
    bridgeUnitSync,
    reversalSync,
    showdownSync,
    openingSync,
    proseCraftSync,
    punctuationToneSync,
    contentRubricSync,
    targetReaderSync,
    genrePositioningSync,
    femaleAudienceSync,
    upgradeRhythmSync,
    chapterStructureSync,
    chapterProgressionSync,
    informationLoadSync,
    longformContinuitySync,
    titleUniquenessSync,
    coreContractCheckSync,
    continuityHeatSync,
    revisionReceiptCheckSync,
    deslopRepairCheckSync,
    proseMetaSync,
    bannedWordsSync,
    blueprintConsumptionSync,
    foreshadowingDeltaSync,
    deterministicCleanupSync,
    serialRiskRepairSync,
    chapterHookQualitySync,
    readerRetentionCheckSync,
    intentConfirmationSync,
    writePreparationSync,
    benchmarkRecallSync,
    nextChapterQualityPlanReceiptPayload,
    nextChapterQualityPlanReceiptSync,
    readerTrialReview,
    first30Retention,
    expansionStructureReview,
    expansionStructureDecisionReview,
  })
}
