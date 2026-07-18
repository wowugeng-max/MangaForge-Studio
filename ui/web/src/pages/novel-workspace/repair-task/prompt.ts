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
  const lines = [
    '本次修订来自任务中心的商业留存/质检修复任务。',
    task.segment ? `分段：${task.segment}` : '',
    firstText(task.issue_type, task.issueType, taskIssueType, deliveryRisk?.issue_type) ? `问题类型：${firstText(task.issue_type, task.issueType, taskIssueType, deliveryRisk?.issue_type)}` : '',
    task.message ? `问题：${task.message}` : '',
    task.action ? `修复动作：${task.action}` : '',
    Array.isArray(task.acceptance_criteria) ? `验收标准：${task.acceptance_criteria.join('；')}` : '',
  ]
  if (batchPlan) {
    lines.push(
      '【批次任务书兑现】',
      batchPlan.batch_goal ? `本批目标：${batchPlan.batch_goal}` : '',
      batchPlan.reader_payoff_plan ? `读者回报：${batchPlan.reader_payoff_plan}` : '',
      batchPlan.mainline_focus ? `主线焦点：${batchPlan.mainline_focus}` : '',
      batchPlan.forbidden_boundary ? `禁抢跑边界：${batchPlan.forbidden_boundary}` : '',
      chapterPlan?.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
      chapterPlan?.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
      chapterPlan?.mainline_progress ? `本章主线进度：${chapterPlan.mainline_progress}` : '',
      chapterPlan?.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
      '修订要求：只补齐本章漏兑现内容，不新增长期方向，不提前揭示禁抢跑边界。',
    )
  }
  if (recoveryEvidenceReview) {
    if (singleChapterRecoveryEvidence) {
      lines.push(
        '【单章恢复依据回修】',
        recoveryEvidenceReview.summary ? `治理复查记忆：${recoveryEvidenceReview.summary}` : '治理复查记忆：本章需要继承上一轮恢复依据。',
        ...recoveryEvidenceReview.rows.flatMap(item => [
          item.evidence ? `失效依据：${item.evidence}` : '',
          item.riskLabels.length > 0 ? `对应风险：${item.riskLabels.join('；')}` : '',
        ]),
        recoveryEvidenceReview.allEvidence.length > 0 ? `全部恢复依据：${recoveryEvidenceReview.allEvidence.slice(0, 6).join('；')}` : '',
        recoveryEvidenceReview.watchItems.length > 0 ? `仍需观察：${recoveryEvidenceReview.watchItems.slice(0, 6).join('；')}` : '',
        '修订要求：逐项把失效依据和观察项改成本章正文可见的冲突推进、对白执行、读者回报或剧情线动作。',
        '修订后必须重新运行单章治理复查 / governance_recheck_sync，确认 status 为 ok、failed_evidence 为空，再关闭任务。',
      )
    } else {
      lines.push(
        '【恢复依据失效回修】',
        recoveryEvidenceReview.summary ? `复盘结论：${recoveryEvidenceReview.summary}` : '',
        ...recoveryEvidenceReview.rows.flatMap(item => [
          item.evidence ? `失效依据：${item.evidence}` : '',
          item.riskLabels.length > 0 ? `对应风险：${item.riskLabels.join('；')}` : '',
        ]),
        recoveryEvidenceReview.allEvidence.length > 0 ? `全部恢复依据：${recoveryEvidenceReview.allEvidence.slice(0, 6).join('；')}` : '',
        '修订要求：逐项把失效依据改成正文可见的兑现结果，优先补样章执行、读者回报、主线/剧情线和批次任务书承诺。',
        '修订后必须重新运行批次交稿复盘，确认 recovery_evidence_review.status 为 ok、failed_evidence 为空，再关闭任务。',
      )
    }
  }
  if (serialRhythmReview) {
    lines.push(
      '【连载节奏疲劳】',
      serialRhythmReview.score !== undefined ? `节奏评分：${serialRhythmReview.score}` : '',
      Array.isArray(serialRhythmReview.risks) && serialRhythmReview.risks.length > 0 ? `重复风险：${serialRhythmReview.risks.join('；')}` : '',
      Array.isArray(serialRhythmReview.evidence) && serialRhythmReview.evidence.length > 0 ? `批次证据：${serialRhythmReview.evidence.join('；')}` : '',
      '修订要求：必须轮换冲突来源、读者回报、章末追读问题和可视化场面；保留本章主线职责，但删改重复的压迫方式、重复打脸方式和重复章末悬念。',
    )
  }
  if (titleUniquenessSync) {
    const missed = arrayValue(titleUniquenessSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(titleUniquenessSync.next_actions || titleUniquenessSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【标题去重修复】',
      firstText(titleUniquenessSync.label) ? `标题结论：${firstText(titleUniquenessSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按本章核心事件重新命名重复章节，标题必须能指向本章独有冲突、物件、选择、反转或章末钩子。',
      '同步要求：同步细纲标题与正文文件名，必要时同步正文标题行；不得只改任务说明、展示标题或章节正文第一行。',
      '输出要求：必须返回 title_uniqueness_checks，不能只写自然语言改名说明。',
      'title_uniqueness_checks 每项必须包含 key, label, status, old_title, new_title, outline_title_synced, file_name_synced, chapter_title_line_synced, evidence, remaining_risk。',
      '复检要求：细纲标题、正文文件名或正文标题行未同步时 status 不能写 pass/ok；只有重复标题数量为 0 且同步项全部为 true 才能关闭。',
      '关闭口径：重新运行标题去重检查，title_uniqueness_checks / chapter_title_uniqueness 必须为 pass/ok，重复标题数量为 0。',
    )
  }
  if (postBatchQualityRepair) {
    const hasTitleUniquenessWarning = postBatchQualityRepair.checks.some(item => (
      /title_uniqueness|chapter_title_uniqueness|标题去重|标题重复/.test(`${item.key} ${item.label}`)
    ))
    const hasProseMetaWarning = postBatchQualityRepair.checks.some(item => (
      /prose_meta|正文元信息|工程词/.test(`${item.key} ${item.label}`)
    ))
    const hasChapterHookWarning = postBatchQualityRepair.checks.some(item => (
      /chapter_hook|chapter_hook_quality|章尾钩子|翻页|追读/.test(`${item.key} ${item.label}`)
    ))
    const hasBlueprintConsumptionWarning = postBatchQualityRepair.checks.some(item => (
      /blueprint_consumption|chapter_blueprint|细纲兑现|对照细纲|大纲兑现/.test(`${item.key} ${item.label}`)
    ))
    const hasBannedWordsWarning = postBatchQualityRepair.checks.some(item => (
      /banned_words|forbidden_words|禁用词|模板表达/.test(`${item.key} ${item.label}`)
    ))
    const hasForeshadowingDeltaWarning = postBatchQualityRepair.checks.some(item => (
      /foreshadowing_delta|伏笔增量/.test(`${item.key} ${item.label}`)
    ))
    const hasDeterministicCleanupWarning = postBatchQualityRepair.checks.some(item => (
      /deterministic_cleanup|deterministic_prose_cleanup|确定性清理/.test(`${item.key} ${item.label}`)
    ))
    const hasStoryStateWarning = postBatchQualityRepair.checks.some(item => (
      /story_state|state_delta|状态机|状态更新|状态回填/.test(`${item.key} ${item.label}`)
    ))
    lines.push(
      '【oh-story批次质检回修】',
      postBatchQualityRepair.source ? `来源：${postBatchQualityRepair.source}` : '',
      postBatchQualityRepair.status ? `批次质检状态：${postBatchQualityRepair.status}` : '',
      postBatchQualityRepair.chapterNos.length > 0 ? `批次章节：${compactChapterNosForPrompt(postBatchQualityRepair.chapterNos)}` : '',
      postBatchQualityRepair.averageScore !== null && postBatchQualityRepair.averageScore !== undefined ? `平均质检分：${postBatchQualityRepair.averageScore}` : '',
      postBatchQualityRepair.revisedCount > 0 ? `已修订章节：${postBatchQualityRepair.revisedCount}` : '',
      ...postBatchQualityRepair.checks.flatMap(item => {
        const summary = item.summaries.length > 0 ? item.summaries.join('；') : `warn_count ${item.warnCount}`
        return [
          `${item.label}：${summary}`,
          item.key ? `质检键：${item.key}` : '',
        ]
      }),
      '修订要求：逐项清掉 oh-story Step 3 批次交稿后质检的 warn 项；正文元信息、章尾钩子、细纲兑现、伏笔增量、确定性清理和状态机更新必须回到正文事实与状态回填里。',
      '修订范围：只修 warn 项，不得重写已通过章节或检查项，不得改动批次外章节；保留已成立的主线事实、角色状态、伏笔、钩子和有效正文。',
      hasTitleUniquenessWarning ? '标题去重闭环：按本章核心事件重新命名重复章节，并同步细纲标题与正文文件名；不得只改任务说明或只改展示标题。' : '',
      hasProseMetaWarning ? '正文元信息闭环：标题行以外不得出现上一章/本章/前文/后文/伏笔/细纲/读者等工程词；必须改成角色当下能感知的事件锚点、相对时间、物件状态或对话信息。' : '',
      hasChapterHookWarning ? '章尾钩子闭环：章尾必须兑现本章收束状态、未解决问题和下一章推动力；补出新的选择、危险、信息差或目标压力，不得只用解释性总结收尾。' : '',
      hasBlueprintConsumptionWarning ? '细纲兑现闭环：对照内容概括五段式、情节安排多线、人物关系/出场顺序、代价/收益和结尾钩子逐项补正文；爽点前危机/期待铺垫必须可指认，装逼/打脸/揭露场要补在场配角差异化反应。' : '',
      hasBannedWordsWarning ? '禁用词扫描闭环：逐条替换一级禁用词/模板表达，改成具体动作、事实、口语化对白或场景内判断；修订后必须复扫为 0，不得用同义套话替换。' : '',
      hasForeshadowingDeltaWarning ? '伏笔增量修订边界：只处理本批正文新增、推进或回收的伏笔增量；不得做全书伏笔审计，不得通读全部正文重算伏笔台账。' : '',
      hasDeterministicCleanupWarning ? '确定性清理闭环：修订后必须让 MangaForge 确定性清理阶段复检通过，deterministic_prose_cleanup.risk_count 为 0；命中长省略号、破折号、双连字符、独立横线或高危 AI 句式时必须回正文改到复扫为 0，不得只在回执里声称已处理。' : '',
      hasStoryStateWarning ? '状态机更新闭环：把本批正文实际改变的角色状态、伏笔、时间线和资产状态写回 story_state_update/state_delta、character_updates、setting_updates 或 storyline_updates；每项必须带 source_excerpt/evidence 引用正文原句，不能只写摘要结论。' : '',
      '关闭口径：重新运行批次交稿后质检，确认 post_batch_quality_check.status 为 ok，所有 warn_count 清零，再继续下一批或扩批。',
    )
  }
  if (postDeliveryQualityRepair) {
    lines.push(
      '【oh-story单章交付后质检回修】',
      postDeliveryQualityRepair.source ? `来源：${postDeliveryQualityRepair.source}` : '',
      postDeliveryQualityRepair.chapterNo ? `目标章节：第${postDeliveryQualityRepair.chapterNo}章` : '',
      postDeliveryQualityRepair.status ? `交付后质检状态：${postDeliveryQualityRepair.status}` : '',
      postDeliveryQualityRepair.score !== null && postDeliveryQualityRepair.score !== undefined ? `交付后质检分：${postDeliveryQualityRepair.score}` : '',
      postDeliveryQualityRepair.checkLabel ? `质检项：${postDeliveryQualityRepair.checkLabel}` : '',
      postDeliveryQualityRepair.checkKey ? `质检键：${postDeliveryQualityRepair.checkKey}` : '',
      postDeliveryQualityRepair.checkStatus ? `质检项状态：${postDeliveryQualityRepair.checkStatus}` : '',
      postDeliveryQualityRepair.warnCount || postDeliveryQualityRepair.unknownCount ? `残留数量：warn ${postDeliveryQualityRepair.warnCount}，unknown ${postDeliveryQualityRepair.unknownCount}` : '',
      ...postDeliveryQualityRepair.summaries.map(summary => `质检摘要：${summary}`),
      postDeliveryQualityRepair.action ? `修复动作：${postDeliveryQualityRepair.action}` : '',
      postDeliveryQualityRepair.acceptanceCriteria.length > 0 ? `验收标准：${postDeliveryQualityRepair.acceptanceCriteria.join('；')}` : '',
      '修订要求：只修当前 Step 3 质检项，把问题改成当前章正文可见的动作、对白、信息变化、关系变化、物品状态变化或状态回填；不得把单章修复扩大成批次重写。',
      '输出要求：必须返回 post_delivery_quality.status、post_delivery_quality.score、post_delivery_quality.checks，不能只写 quality_refresh 或自然语言说明。',
      'post_delivery_quality.checks 每项必须包含 key, label, status, warn_count, unknown_count, fail_count, error_count, summary；本次目标质检键必须出现在 checks 中。',
      '复检要求：所有 post_delivery_quality.checks 都必须复检为 ok/pass/passed，warn_count/unknown_count/fail_count/error_count 必须为 0；否则任务保持 needs_review。',
      '关闭口径：重新运行当前章节交付后质检，确认 post_delivery_quality.checks 中该项复检为 ok，且不再为 warn/unknown。',
      '无人值守口径：确认 Step 3 全部 ok 后，再继续无人值守下一章。',
    )
  }
  if (volumeSegmentReview) {
    const missed = arrayValue(volumeSegmentReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【卷级阶段验收】',
      Array.isArray(volumeSegmentReview.planned) && volumeSegmentReview.planned.length > 0 ? `阶段要求：${volumeSegmentReview.planned.join('；')}` : '',
      Array.isArray(volumeSegmentReview.actual) && volumeSegmentReview.actual.length > 0 ? `实际呈现：${volumeSegmentReview.actual.join('；')}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      volumeSegmentReview.gate_summary ? `卷段提示：${volumeSegmentReview.gate_summary}` : '',
      '修订要求：必须补成可见的阶段结果，例如身份变化、资源入场、关系改写、势力态度转变、阶段反派败退或新门槛开启。',
      '不能把阶段结算继续后移，不能用解释性旁白代替现场冲突和结果兑现，不能提前消费后续卷末爆点。',
    )
  }
  if (expansionStructureDecisionReview) {
    const review = objectValue(expansionStructureDecisionReview)
    const defaultLaneRedesign = objectValue(review.default_five_chapter_lane_redesign || review.defaultFiveChapterLaneRedesign)
    const observationMetrics = arrayValue(review.observation_metrics || review.observationMetrics)
      .map(item => text(item))
      .filter(Boolean)
    const repeatedFailureReasons = arrayValue(defaultLaneRedesign.repeated_failure_reasons || defaultLaneRedesign.repeatedFailureReasons)
      .map(item => firstText(item?.reason, item?.label, item))
      .filter(Boolean)
    const missedChapterNos = arrayValue(review.missed_chapter_nos || review.missedChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const failedItems = arrayValue(review.failed_items || review.failedItems)
      .map(item => objectValue(item))
      .map(item => ({
        chapterNo: Number(item.chapter_no ?? item.chapterNo ?? 0),
        label: firstText(item.label, item.key, '结构决策漏项'),
        text: firstText(item.text, item.description, item.reason, item.issue),
      }))
      .filter(item => item.label || item.text)
    lines.push(
      '【扩批结构决策执行】',
      firstText(review.recommendation) ? `决策：${firstText(review.recommendation)}` : '',
      Number(review.target_chapter_count ?? review.targetChapterCount ?? 0) > 0 ? `目标批次：${Number(review.target_chapter_count ?? review.targetChapterCount)}章` : '',
      firstText(review.segment_label, review.segmentLabel) ? `观察段位：${firstText(review.segment_label, review.segmentLabel)}` : '',
      firstText(review.summary) ? `复盘结论：${firstText(review.summary)}` : '',
      firstText(review.instruction) ? `执行口径：${firstText(review.instruction)}` : '',
      observationMetrics.length > 0 ? `观察指标：${observationMetrics.join('；')}` : '',
      Object.keys(defaultLaneRedesign).length ? '【默认5章档位结构重构】' : '',
      Number(defaultLaneRedesign.relapse_count ?? defaultLaneRedesign.relapseCount ?? 0) > 0 ? `恢复判定连续失效：${Number(defaultLaneRedesign.relapse_count ?? defaultLaneRedesign.relapseCount)}次` : '',
      repeatedFailureReasons.length > 0 ? `同维复发：${repeatedFailureReasons.join('、')}` : '',
      firstText(defaultLaneRedesign.segment_duty_rewrite, defaultLaneRedesign.segmentDutyRewrite) ? `段位职责重写：${firstText(defaultLaneRedesign.segment_duty_rewrite, defaultLaneRedesign.segmentDutyRewrite)}` : '',
      firstText(defaultLaneRedesign.conflict_rotation, defaultLaneRedesign.conflictRotation) ? `冲突轮换：${firstText(defaultLaneRedesign.conflict_rotation, defaultLaneRedesign.conflictRotation)}` : '',
      firstText(defaultLaneRedesign.payoff_density, defaultLaneRedesign.payoffDensity) ? `回报密度：${firstText(defaultLaneRedesign.payoff_density, defaultLaneRedesign.payoffDensity)}` : '',
      firstText(defaultLaneRedesign.ending_hook_template, defaultLaneRedesign.endingHookTemplate) ? `章末追读模板：${firstText(defaultLaneRedesign.ending_hook_template, defaultLaneRedesign.endingHookTemplate)}` : '',
      missedChapterNos.length > 0 ? `漏项章节：第${missedChapterNos.join('、')}章` : '',
      ...failedItems.map(item => `${item.chapterNo > 0 ? `第${item.chapterNo}章` : ''}${item.label}：${item.text || '未提供可见执行证据'}`),
      '修订要求：逐章补齐扩批结构决策指定的段位职责、观察指标和必要的重构原则；恢复5章时不能淡化结构约束，小批验证时必须证明观察指标，单章重构时先改结构原则再写正文。',
      Object.keys(defaultLaneRedesign).length ? '默认档位回填要求：expansion_structure_decision_execution 必须显式回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并在 evidence 中说明四项模板如何落到正文。' : '',
      '修订后必须重新回填 expansion_structure_decision_execution，并重新运行批次复盘，确认结构决策执行为 ok 后再放行下一批。',
    )
  }
  if (expansionStructureReview) {
    const review = objectValue(expansionStructureReview)
    const repeated = objectValue(review.repeated_hotspot_segment || review.repeatedHotspotSegment)
    const repeatedLabel = firstText(repeated.label, repeated.key, '复发段位')
    const repeatedCount = Number(repeated.count || 0)
    const latestChapterNos = arrayValue(review.latest_chapter_nos || review.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const affectedChapterNos = arrayValue(review.affected_chapter_nos || review.affectedChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const hotspotSummaries = arrayValue(review.hotspot_summaries || review.hotspotSummaries)
      .map(item => text(item))
      .filter(Boolean)
    const structureActions = arrayValue(review.structure_actions || review.structureActions)
      .map(item => text(item))
      .filter(Boolean)
    const rollback = objectValue(review.rollback_policy || review.rollbackPolicy)
    const validationTrend = normalizeExpansionStructureValidationTrend(task, review)
    const defaultLaneTemplateRepair = normalizeDefaultFiveChapterLaneTemplateRepair(review)
    const defaultLaneTemplateRedesignQueue = normalizeDefaultFiveChapterLaneTemplateRedesignQueue(review)
    lines.push(
      '【扩批结构修复】',
      repeatedCount > 0 ? `复发段位：${repeatedLabel}连续 ${repeatedCount} 次` : `复发段位：${repeatedLabel}`,
      latestChapterNos.length > 0 ? `最近批次：第${latestChapterNos.join('、')}章` : '',
      affectedChapterNos.length > 0 ? `高危章节：第${affectedChapterNos.join('、')}章` : '',
      firstText(review.summary) ? `结构结论：${firstText(review.summary)}` : '',
      ...hotspotSummaries.map(item => `热区证据：${item}`),
      ...structureActions.map(item => `结构动作：${item}`),
      firstText(rollback.summary) ? `回退策略：${firstText(rollback.summary)}` : '',
      '修订要求：先改批次任务书、段位职责和章间节奏，不能只修单章语句或局部爽点；每章必须重新分配冲突来源、显性回报、主线推进和章末追读。',
      '修订后必须重新运行5章扩批分段复盘，确认该段位不再成为核心/回报/追读热区，再恢复5章安全连写。',
    )
    if (defaultLaneTemplateRedesignQueue) {
      lines.push(
        '【默认档位模板重构队列】',
        defaultLaneTemplateRedesignQueue.summary ? `稳定性画像：${defaultLaneTemplateRedesignQueue.summary}` : '',
        defaultLaneTemplateRedesignQueue.latestChapterNos.length > 0 ? `最近验证批：${compactChapterNosForPrompt(defaultLaneTemplateRedesignQueue.latestChapterNos)}` : '',
        defaultLaneTemplateRedesignQueue.validationBatchCount > 0 ? `验证批统计：失败 ${defaultLaneTemplateRedesignQueue.failedBatchCount}/${defaultLaneTemplateRedesignQueue.validationBatchCount} 批` : '',
        defaultLaneTemplateRedesignQueue.topFailedRequirement ? `高频缺项：${defaultLaneTemplateRedesignQueue.topFailedRequirement.label}失败 ${defaultLaneTemplateRedesignQueue.topFailedRequirement.failedCount} 次` : '',
        ...defaultLaneTemplateRedesignQueue.redesignRequirements.map(item => `重构模板：${item.label}：${item.instruction}`),
        defaultLaneTemplateRedesignQueue.validationStandard.length > 0 ? `下一轮验证标准：${defaultLaneTemplateRedesignQueue.validationStandard.join('；')}` : '',
        '修订要求：必须先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再改正文或批次任务书；不能只修单章缺项。',
        '回填要求：下一轮验证批必须逐章回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并在连续2批全过后再恢复默认5章档位。',
      )
    }
    if (defaultLaneTemplateRepair) {
      const hasTemplateReceiptGap = defaultLaneTemplateRepair.missingRequirements.length > 0
        || defaultLaneTemplateRepair.missingCount > 0
        || Boolean(defaultLaneTemplateRepair.missingText)
      if (hasTemplateReceiptGap) {
        lines.push(
          '【默认档位模板验证缺项】',
          defaultLaneTemplateRepair.validationChapterNos.length > 0 ? `验证批次：${compactChapterNosForPrompt(defaultLaneTemplateRepair.validationChapterNos)}` : '',
          defaultLaneTemplateRepair.summary ? `验证结论：${defaultLaneTemplateRepair.summary}` : '',
          defaultLaneTemplateRepair.missingText ? `缺项章节：${defaultLaneTemplateRepair.missingText}` : '',
          defaultLaneTemplateRepair.missingCount > 0 ? `缺项数：${defaultLaneTemplateRepair.missingCount}` : '',
          ...defaultLaneTemplateRepair.repairActions.map(item => item),
          '修订要求：把缺失模板转成下一轮批次任务书的段位职责、冲突轮换、显性回报密度和章末追读检查项；不能只在说明里承认缺项。',
          '回填要求：修订后必须重新检查 expansion_structure_decision_execution，并显式回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered。',
        )
      }
      const productionRelapseVerdict = defaultLaneTemplateRepair.productionRelapseVerdict
      if (productionRelapseVerdict || defaultLaneTemplateRepair.productionFailedRequirements.length) {
        const productionFailedRequirements = defaultLaneTemplateRepair.productionFailedRequirements.length
          ? defaultLaneTemplateRepair.productionFailedRequirements
          : productionRelapseVerdict?.failedRequirements || []
        lines.push(
          '【默认档位模板生产后验】',
          productionRelapseVerdict?.templateVersionId ? `模板版本：${productionRelapseVerdict.templateVersionId}` : '',
          productionRelapseVerdict?.defaultBatchChapterNos.length ? `真实复发批：${compactChapterNosForPrompt(productionRelapseVerdict.defaultBatchChapterNos)}` : '',
          productionRelapseVerdict?.restoreChapterNos.length ? `前置恢复批：${compactChapterNosForPrompt(productionRelapseVerdict.restoreChapterNos)}` : '',
          productionRelapseVerdict?.previousValidationChapterNos.length ? `前置验证批：${compactChapterNosForPrompt(productionRelapseVerdict.previousValidationChapterNos)}` : '',
          (productionRelapseVerdict?.validationChapterNos.length || defaultLaneTemplateRepair.validationChapterNos.length)
            ? `本轮验证批：${compactChapterNosForPrompt(productionRelapseVerdict?.validationChapterNos.length ? productionRelapseVerdict.validationChapterNos : defaultLaneTemplateRepair.validationChapterNos)}`
            : '',
          productionRelapseVerdict?.summary ? `生产后验结论：${productionRelapseVerdict.summary}` : '',
          productionRelapseVerdict?.remainingFailureReasons.length ? `仍复发维度：${productionRelapseVerdict.remainingFailureReasons.join('、')}` : '',
          productionRelapseVerdict?.clearedFailureReasons.length ? `已修复维度：${productionRelapseVerdict.clearedFailureReasons.join('、')}` : '',
          ...productionFailedRequirements.map(item => {
            const chapterText = item.chapterNos.length ? `：${compactChapterNosForPrompt(item.chapterNos)}` : ''
            const reasonText = item.failureReason ? `/${item.failureReason}` : ''
            return `生产失败项：${item.label || item.key}${reasonText}${chapterText}`
          }),
          '修订要求：必须把真实5章生产复发原因改写进当前模板版本，逐项重写段位职责、冲突轮换、回报密度和章末追读模板；不能只修验证批表面字段。',
          '关闭口径：下一轮3章验证批必须输出 production_relapse_verdict.status=passed，remaining_failure_reasons 为空；不能只补 default_lane_*_delivered 字段。',
        )
      }
    }
    if (validationTrend) {
      lines.push(
        '【扩批结构验证趋势】',
        `趋势段位：${validationTrend.segmentLabel}`,
        `验证通过率：${validationTrend.passRate}%（${validationTrend.passedBatchCount}/${validationTrend.validationBatchCount}批）`,
        validationTrend.latestChapterNos.length > 0 ? `最近验证批：第${validationTrend.latestChapterNos.join('、')}章` : '',
        validationTrend.failureReasons.length > 0 ? `失败主因：${validationTrend.failureReasons.map(item => `${item.label}${item.count}`).join('；')}` : '',
        validationTrend.recurrence.visible && validationTrend.recurrence.intervalLabel ? `复发间隔：${validationTrend.recurrence.intervalLabel}` : '',
        validationTrend.recurrence.recurrenceChapterNos.length > 0 ? `复发批次：第${validationTrend.recurrence.recurrenceChapterNos.join('、')}章` : '',
        validationTrend.summary ? `趋势结论：${validationTrend.summary}` : '',
        '修订要求：必须按长期复发惯性重写批次结构，把失败主因转成固定段位职责、冲突换源、显性回报和章末追读检查项；不能只处理本批表面风险。',
      )
    }
  }
  if (readerPullReview) {
    const missed = arrayValue(readerPullReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【读者拉力修复】',
      readerPullReview.expectation_label ? `期待兑现：${readerPullReview.expectation_label}` : '',
      readerPullReview.retention_label ? `追读钩子：${readerPullReview.retention_label}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      '修订要求：必须补出下一页动力，把承诺写成可见行动、冲突结果、情绪回报、危险选择或章末未解问题。',
      '不能只解释背景，不能用无关插科打诨稀释高压场景，不能把本章承诺继续拖成空头支票。',
      '输出要求：必须返回 reader_retention_checks，不能只写自然语言追读已修复。',
      'reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk。',
      '缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok。',
    )
  }
  if (innovationReview) {
    const missed = arrayValue(innovationReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【创新/IP化执行】',
      innovationReview.label ? `创新复盘：${innovationReview.label}` : '',
      missed.length > 0 ? `漏执行：${missed.join('；')}` : '',
      '修订要求：必须写成读者能复述的差异化体验，例如独特机制、反差选择、可视化反制、关系翻转或适合短剧/漫剧化的场面。',
      '不得只换名词不换体验；创新执行必须服务本章冲突、读者回报和长期设定，不能临时改主线方向。',
      '输出要求：必须返回 innovation_checks，不能只写自然语言创新已完成。',
      'innovation_checks 每项必须包含 key, label, status, innovation_type, differentiating_mechanism, visualized_scene, reader_retellable_hook, long_term_fit, evidence, fix, remaining_risk。',
      '只是重命名术语、没有可复述场面或没有正文证据时 status 不能写 pass/ok。',
    )
  }
  if (chapterAttractionReview) {
    const weakDimensions = arrayValue(chapterAttractionReview.weak_dimensions || chapterAttractionReview.weakDimensions || chapterAttractionReview.dimensions)
      .filter((item: any) => !firstText(item?.status) || firstText(item?.status) === 'warn')
      .map((item: any) => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '吸引力缺口')
        const issue = firstText(value.issue, value.text, value.expected, value.repair_instruction, value.repairInstruction)
        return issue ? `${label}：${issue}` : label
      })
      .filter(Boolean)
    lines.push(
      '【章节吸引力修复】',
      chapterAttractionReview.score !== undefined && chapterAttractionReview.score !== null ? `吸引力评分：${chapterAttractionReview.score}` : '',
      firstText(chapterAttractionReview.label) ? `吸引力结论：${firstText(chapterAttractionReview.label)}` : '',
      firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair) ? `优先项：${firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair)}` : '',
      weakDimensions.length > 0 ? `缺口维度：${weakDimensions.join('；')}` : '',
      '修订要求：必须同时补强开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
      '不能只做语言润色；每一处新增内容都要转成现场行动、冲突结果、信息增量、情绪回报或下一章压力。',
      '输出要求：必须返回 chapter_attraction_checks，不能只写自然语言吸引力已增强。',
      'chapter_attraction_checks 每项必须包含 key, label, status, attraction_dimension, opening_hook, scene_goal_obstacle_turn_reward, payoff_density, ending_page_turn, spreadable_scene, evidence, fix, remaining_risk。',
      '开篇钩子、场景推进、爽点密度、章末翻页或可传播场面缺证据时 status 不能写 pass/ok。',
    )
  }
  if (storyDriveSync) {
    const missed = arrayValue(storyDriveSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【故事驱动力修复】',
      storyDriveSync.score !== undefined && storyDriveSync.score !== null ? `故事力评分：${storyDriveSync.score}` : '',
      firstText(storyDriveSync.label) ? `故事力结论：${firstText(storyDriveSync.label)}` : '',
      firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair) ? `优先项：${firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
      '不能只补旁白解释；新增内容必须写成现场行动、对话交锋、代价反馈或状态变化。',
      '输出要求：必须返回 story_drive_checks，不能只写自然语言故事力已增强说明。',
      'story_drive_checks 每项必须包含 key, label, status, protagonist_choice, obstacle, cost, state_change, next_causality, evidence, fix, remaining_risk。',
      '复检要求：主角主动选择、明确阻碍、选择代价、局面变化或下一步因果没有正文证据时 status 不能写 pass/ok；只有新增内容能从 chapter_text 定位为现场行动、对话交锋、代价反馈或状态变化时，才能关闭。',
    )
  }
  if (wordCountSync) {
    const missed = arrayValue(wordCountSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(wordCountSync.next_actions || wordCountSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const currentCount = firstText(
      wordCountSync.current_count,
      wordCountSync.currentCount,
      wordCountSync.actual_count,
      wordCountSync.actualCount,
      wordCountSync.count,
      task.current_count,
      task.currentCount,
    )
    const targetCount = firstText(
      wordCountSync.target_count,
      wordCountSync.targetCount,
      wordCountSync.goal_count,
      wordCountSync.goalCount,
      task.target_count,
      task.targetCount,
    )
    const targetNumber = Number(String(targetCount).replace(/[^\d.]/g, ''))
    const computedMinRequired = Number.isFinite(targetNumber) && targetNumber > 0 ? Math.ceil(targetNumber * 0.9) : ''
    const minRequiredCount = firstText(
      wordCountSync.min_required_count,
      wordCountSync.minRequiredCount,
      wordCountSync.minimum_count,
      wordCountSync.minimumCount,
      task.min_required_count,
      task.minRequiredCount,
      computedMinRequired,
    )
    lines.push(
      '【字数验证修复】',
      firstText(wordCountSync.label) ? `字数结论：${firstText(wordCountSync.label)}` : '',
      currentCount ? `当前字数：${currentCount}` : '',
      targetCount ? `目标字数：${targetCount}` : '',
      minRequiredCount ? `最低门槛：${minRequiredCount}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：低于目标 90% 时必须强制扩充，优先扩充场景目标、阻碍、动作链、对白交锋、代价反馈和章末承接。',
      '扩写边界：新增字数必须服务本章目标、冲突推进、状态变化、读者回报或下一章压力；不得新增未确认设定、支线或抢跑后续大事件。',
      '禁止凑字：不得只堆说明、环境描写或心理旁白凑字数；不得把一处动作拆成多句重复表达。',
      '输出要求：必须返回 word_count_checks，不能只写自然语言扩写说明。',
      'word_count_checks 每项必须包含 key, label, status, current_count, target_count, min_required_count, evidence, remaining_risk；evidence 必须引用新增后的正文片段或场景变化。',
      '复检要求：低于最低门槛时 status 不能写 pass/ok；只有 current_count >= min_required_count 且新增内容不是凑字时，word_count_checks 才能全部为 pass/ok。',
      '关闭口径：重新运行正文自检后，word_count_checks 必须全部为 pass/ok，当前字数不低于最低门槛，且新增内容能从 chapter_text 找到可定位证据。',
    )
  }
  if (characterArcSync) {
    const missed = arrayValue(characterArcSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【人物弧光修复】',
      characterArcSync.score !== undefined && characterArcSync.score !== null ? `人物弧光评分：${characterArcSync.score}` : '',
      firstText(characterArcSync.label) ? `人物弧光结论：${firstText(characterArcSync.label)}` : '',
      firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair) ? `优先项：${firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
      '不能只补心理旁白；新增内容必须落到选择、对话、行动后果或关系反馈上。',
      '输出要求：必须返回 character_arc_checks，不能只写自然语言人物弧光已增强说明。',
      'character_arc_checks 每项必须包含 key, label, status, character, desire, flaw_pressure, relationship_change, growth_beat, voice_anchor, evidence, fix, remaining_risk。',
      '复检要求：角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有正文证据时 status 不能写 pass/ok；只有新增内容落到选择、对话、行动后果或关系反馈时，才能关闭。',
    )
  }
  if (chapterBenchmarkSync) {
    const missed = arrayValue(chapterBenchmarkSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(chapterBenchmarkSync.next_actions || chapterBenchmarkSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节标杆修复】',
      chapterBenchmarkSync.score !== undefined && chapterBenchmarkSync.score !== null ? `标杆评分：${chapterBenchmarkSync.score}` : '',
      firstText(chapterBenchmarkSync.label) ? `标杆结论：${firstText(chapterBenchmarkSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：必须补成可见的开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读。',
      '只学习标杆章的抽象方法，不得复制桥段、专有设定、角色名、原句或核心梗；新增内容必须服务本章目标和长期主线。',
      '输出要求：必须返回 chapter_benchmark_checks，不能只写自然语言标杆章已应用说明。',
      'chapter_benchmark_checks 每项必须包含 key, label, status, benchmark_dimension, expected_method, delivered_evidence, originality_guard, fix, remaining_risk；benchmark_dimension 写 opening_hook/conflict_progression/payoff/scene_rhythm/ending_page_turn 中最贴近的一类。',
      '复检要求：开篇钩子、冲突推进、爽点兑现、场景节拍或章末追读没有正文证据时 status 不能写 pass/ok；originality_guard 必须说明没有复制标杆桥段、专名、原句或核心梗。',
    )
  }
  if (styleSampleSync) {
    const missed = arrayValue(styleSampleSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const copied = arrayValue(styleSampleSync.copied_phrases || styleSampleSync.copiedPhrases)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【风格样章修复】',
      styleSampleSync.score !== undefined && styleSampleSync.score !== null ? `风格评分：${styleSampleSync.score}` : '',
      firstText(styleSampleSync.label) ? `风格结论：${firstText(styleSampleSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      copied.length > 0 ? `照搬风险：${copied.join('；')}` : '',
      '修订要求：必须重写为作者口吻的节奏、句式、对白比例和情绪转折，不得照搬样章原句。',
      '不要改变剧情线、设定状态、人物状态和章节事件；只修表达方式、节奏分配和角色口吻。',
      '输出要求：必须返回 style_sample_checks，不能只写自然语言风格已调整说明。',
      'style_sample_checks 每项必须包含 key, label, status, style_dimension, source_technique, adapted_evidence, copied_phrase_rewritten, fix, remaining_risk；style_dimension 写 rhythm/sentence/dialogue/voice/emotion_turn 中最贴近的一类。',
      '复检要求：照搬样章原句、桥段、专有设定、角色名或核心梗时 status 不能写 pass/ok；只有样章方法被改写成本书作者口吻，并能从 chapter_text 定位 adapted_evidence 时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.style_sample_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (sourceReadinessSync) {
    const missed = arrayValue(sourceReadinessSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(sourceReadinessSync.next_actions || sourceReadinessSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【来源就绪修复】',
      firstText(sourceReadinessSync.label) ? `来源结论：${firstText(sourceReadinessSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 source_readiness_checks 逐项核对角色状态、相关伏笔/前史、世界约束和资产状态；missing/warn 来源不能被当作既定事实。',
      '来源口径：已加载只指本轮 workflow 内实际读取或刚更新过的来源，不得用未标明来源的聊天记忆替代。',
      '必查来源：本章细纲、上一章正文、追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md；涉及角色时还必须核对追踪/角色状态.md 或对应设定/角色文件。',
      '正文要求：ready 来源必须写成可见承接，使用动作、对白、信息变化、物品状态变化或角色确认，不得只补旁白说明。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks 必须逐项更新 status/evidence/fix；missing/warn 来源要写清修复后是否仍有风险，不能只在正文外声明已确认。',
      '输出要求：必须返回 source_readiness_checks，不能只写自然语言来源确认说明。',
      'source_readiness_checks 每项必须包含 key, label, status, source_name, source_path, read_status, used_as_fact, chapter_evidence, fix, remaining_risk；source_path 写本轮 workflow 实际读取或刚更新过的文件路径。',
      '复检要求：来源未在本轮 workflow 读取或刚更新，或 missing/warn 被当作既定事实时 status 不能写 pass/ok；只有来源为 ready 且正文有可定位承接证据时，才能关闭。',
      '关闭口径：重新运行正文自检后，source_readiness_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (stateTrackingSync) {
    const missed = arrayValue(stateTrackingSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(stateTrackingSync.next_actions || stateTrackingSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【状态跟踪修复】',
      firstText(stateTrackingSync.label) ? `状态结论：${firstText(stateTrackingSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 state_tracking_checks 逐项核对角色状态、伏笔状态、资产归属、关系边界和世界规则；不得让昏迷、失效、未获得或未揭示状态直接参与当前章结果。',
      '正文要求：状态变化必须写成可定位的动作、对白、代价、限制、信息变化或状态回填，不能只补解释性旁白。',
      '状态筛选回执：oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts 必须逐项更新 used_in_chapter/evidence/excluded_reason/remaining_risk；未用于本章的状态要写明排除原因，已使用状态必须有正文证据，excluded_reason 写“已用于本章，未排除”。',
      'status_filter_receipts 每项必须包含 key, label, used_in_chapter, evidence, excluded_reason, remaining_risk。',
      '输出要求：必须返回 state_tracking_checks，不能只写自然语言状态已核对说明。',
      'state_tracking_checks 每项必须包含 key, label, status, state_subject, state_type, previous_state, allowed_state, used_in_chapter, evidence, excluded_reason, fix, remaining_risk；state_type 写 character/foreshadowing/asset/relation/world_rule 中最贴近的一类。',
      '复检要求：昏迷、失效、未获得或未揭示状态被用于当前章结果时 status 不能写 pass/ok；只有 used_in_chapter 与 allowed_state 一致，并且 evidence 或 excluded_reason 可定位时，才能关闭。',
      '关闭口径：重新运行正文自检后，state_tracking_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (storyStateUpdateSync) {
    const missed = arrayValue(storyStateUpdateSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(storyStateUpdateSync.next_actions || storyStateUpdateSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【状态写回修复】',
      firstText(storyStateUpdateSync.label) ? `状态写回结论：${firstText(storyStateUpdateSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 story_state_update_checks 补齐写后状态机更新；只把正文已经发生的状态变化写回，不新增正文没有发生的新事实。',
      '写回对象：同步 story_state_update/state_delta，并补齐 character_updates、setting_updates、asset_updates、storyline_updates、foreshadowing_updates 或 timeline_updates 中对应缺口。',
      '追踪文件：同步追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md 和追踪/角色状态.md；每项变更必须能回到当前章正文事实。',
      '证据要求：每条状态写回必须带 source_excerpt/evidence，引用修订后 chapter_text 中可定位的动作、对白、物品归属、关系变化、时间线变化或伏笔状态变化，不能只写摘要结论。',
      '边界要求：如果追踪缺口来自正文本身没有写清状态变化，先小范围补正文证据；如果正文已经写清，只补状态写回和回执，不要重写整章。',
      '输出要求：必须返回 story_state_update_checks，不能只写自然语言状态同步说明。',
      'story_state_update_checks 每项必须包含 key, label, status, state_domain, target_file, update_path, before_state, after_state, source_excerpt, evidence, fix, remaining_risk；state_domain 写 character/setting/asset/storyline/foreshadowing/timeline/context 中最贴近的一类。',
      '复检要求：target_file/update_path 未写回，或 source_excerpt/evidence 不能定位到修订后正文时 status 不能写 pass/ok；只有正文事实、状态差异和追踪写回三者都闭合时，才能关闭。',
      '关闭口径：重新运行正文自检后，story_state_update_checks 必须全部为 pass/ok，missed_count=0，state_delta 中本章新增/推进/回收的状态变化均带 source_excerpt/evidence。',
    )
  }
  if (styleBoundarySync) {
    const missed = arrayValue(styleBoundarySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(styleBoundarySync.next_actions || styleBoundarySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【风格边界修复】',
      firstText(styleBoundarySync.label) ? `风格结论：${firstText(styleBoundarySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 style_boundary_checks 逐项修复过近的参照句式、桥段节奏、套话和模板化表达；保留本书承诺的语气、节奏和角色口吻。',
      '正文要求：用本章动作链、角色口吻、信息变化和场景压力重写；不得复制标杆原句、专有设定、角色名、核心梗或可识别桥段。',
      '输出要求：必须返回 style_boundary_checks，不能只写自然语言风格边界已修复。',
      'style_boundary_checks 每项必须包含 key, label, status, reference_risk, rewritten_with_local_action, voice_anchor, copied_phrase_removed, evidence, fix, remaining_risk。',
      '仍复用标杆原句、句式节奏、专有设定或缺少本章动作链证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，style_boundary_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (informationFlowSync) {
    const missed = arrayValue(informationFlowSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(informationFlowSync.next_actions || informationFlowSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【信息流修复】',
      firstText(informationFlowSync.label) ? `信息流结论：${firstText(informationFlowSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 information_flow_checks 重排线索、解释、误判、反转和信息揭示顺序；信息必须跟冲突、动作、选择和代价同步释放。',
      '正文要求：避免提前泄底、补丁式旁白和上下文过载；关键信息要通过场景内行动、对白、判断变化或代价显形。',
      '输出要求：必须返回 information_flow_checks，不能只写自然语言信息流已修复。',
      'information_flow_checks 每项必须包含 key, label, status, reveal_order, withheld_question, action_bound_release, conflict_or_cost, evidence, fix, remaining_risk。',
      '提前泄底、信息未随行动/冲突/代价释放或缺少正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，information_flow_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (expectationThresholdSync) {
    const missed = arrayValue(expectationThresholdSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(expectationThresholdSync.next_actions || expectationThresholdSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【期待阈值修复】',
      firstText(expectationThresholdSync.label) ? `期待结论：${firstText(expectationThresholdSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 expectation_threshold_checks 强化读者必须继续阅读的问题、悬念、代价、选择压力或回报承诺。',
      '正文要求：章末必须留下明确的下一章追问，期待要落到可见事件、未揭身份、代价、选择压力或回报承诺，不能只做氛围收束。',
      '输出要求：必须返回 expectation_threshold_checks，不能只写自然语言期待已增强。',
      'expectation_threshold_checks 每项必须包含 key, label, status, reader_question, stakes, choice_pressure, payoff_promise, next_chapter_pull, evidence, fix, remaining_risk。',
      '缺少具体读者问题、代价/选择压力、回报承诺或下一章牵引证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，expectation_threshold_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (storyLoopSync) {
    const missed = arrayValue(storyLoopSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(storyLoopSync.next_actions || storyLoopSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【故事闭环修复】',
      firstText(storyLoopSync.label) ? `闭环结论：${firstText(storyLoopSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 story_loop_checks 让本章设问、阻碍、选择、代价、回报和新问题形成可追踪闭环。',
      '正文要求：至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章；不能让开头设问在结尾原地悬空。',
      '输出要求：必须返回 story_loop_checks，不能只写自然语言故事闭环已修复。',
      'story_loop_checks 每项必须包含 key, label, status, setup_question, obstacle, choice, cost, payoff_or_answer_fragment, new_question, evidence, fix, remaining_risk。',
      '设问、阻碍、选择、代价、回报/答案碎片或新问题缺证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，story_loop_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (emotionalArcSync) {
    const missed = arrayValue(emotionalArcSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(emotionalArcSync.next_actions || emotionalArcSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【情绪弧修复】',
      firstText(emotionalArcSync.label) ? `情绪结论：${firstText(emotionalArcSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 emotional_arc_checks 把平静、调动、释放、爽感写成可追踪情绪递进。',
      '正文要求：压迫必须落到现场选择，反制必须通过动作、对白、旁观反馈、关系反馈或状态变化外化；不能只解释规则或用心理总结代替情绪兑现。',
      '输出要求：必须返回 emotional_arc_checks，不能只写自然语言情绪弧已修复。',
      'emotional_arc_checks 每项必须包含 key, label, status, calm_or_pressure, mobilization, counteraction, release, reader_payoff, evidence, fix, remaining_risk。',
      '缺少压迫/调动、反制、释放、读者爽感或旁观反馈证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，emotional_arc_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterHookSync) {
    const missed = arrayValue(chapterHookSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterHookSync.next_actions || chapterHookSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章级钩子修复】',
      firstText(chapterHookSync.label) ? `钩子结论：${firstText(chapterHookSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 chapter_hook_checks 重写或补写前100字章首钩子和最后约100字章尾翻页钩子。',
      '正文要求：钩子必须落成具体问题、压力、兑现路径、危险选择或下一章行动牵引；修掉假悬念、机械降神、低风险钩、过度留白和同类型连用。',
      '输出要求：必须返回 chapter_hook_checks，不能只写自然语言钩子增强说明。',
      'chapter_hook_checks 每项必须包含 key, label, status, hook_position, trigger, reader_question, next_chapter_pressure, delivered_evidence, fix, remaining_risk；hook_position 写 opening 或 ending。',
      '复检要求：章首或章尾没有现场触发、具体读者问题、下一章压力和正文证据时 status 不能写 pass/ok；只有前100字和最后约100字都形成翻页牵引时，才能关闭。',
      '关闭口径：重新运行正文自检后，chapter_hook_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (paragraphHookSync) {
    const missed = arrayValue(paragraphHookSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(paragraphHookSync.next_actions || paragraphHookSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【段落级钩子修复】',
      firstText(paragraphHookSync.label) ? `段钩结论：${firstText(paragraphHookSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 paragraph_hook_checks 补段落级钩子 11 种、钩子组合、对话情绪递进、围观者层级或不公平伤害。',
      '正文要求：每3-5段必须出现信息、风险、情绪或关系变化；连续环境、站位、解释、姿态或静态说明必须改成暗牌、倒计时、反转、打脸、代价、异常物件、冷发现、对话压迫等可见微推进。',
      '输出要求：必须返回 paragraph_hook_checks，不能只写自然语言段落钩子已修复。',
      'paragraph_hook_checks 每项必须包含 key, label, status, paragraph_range, hook_type, micro_change, information_or_risk_delta, emotion_or_relation_delta, evidence, fix, remaining_risk。',
      '连续3-5段没有信息、风险、情绪或关系变化证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，paragraph_hook_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (suspenseSync) {
    const missed = arrayValue(suspenseSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(suspenseSync.next_actions || suspenseSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【悬念编排修复】',
      firstText(suspenseSync.label) ? `悬念结论：${firstText(suspenseSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 suspense_checks 补疑问、误导、答案和新期待的悬念循环。',
      '正文要求：先提出疑问，再给可信提示或误导，公布局部答案后立起新期待；避免假悬念、谜语人拖延和信息延迟过久。',
      '输出要求：必须返回 suspense_checks，不能只写自然语言悬念已修复。',
      'suspense_checks 每项必须包含 key, label, status, question, misdirect, partial_answer, new_expectation, evidence, fix, remaining_risk。',
      '缺少疑问、可信误导、局部答案或新期待证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，suspense_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (assetLinkageSync) {
    const missed = arrayValue(assetLinkageSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(assetLinkageSync.next_actions || assetLinkageSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【资产挂钩修复】',
      firstText(assetLinkageSync.label) ? `资产结论：${firstText(assetLinkageSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 asset_linkage_checks 消灭孤立资产，让关键资产绑定功能、归属、触发条件、限制、后果和状态变化。',
      '正文要求：每个资产至少接到本章目标、冲突、回报或章尾钩子之一；设定信息必须通过使用、质疑、触发、误判或代价反馈释放，不能只点名、介绍来历或当背景摆件。',
      '输出要求：必须返回 asset_linkage_checks，不能只写自然语言资产已挂钩。',
      'asset_linkage_checks 每项必须包含 key, label, status, asset_name, function, ownership, trigger_condition, limitation, consequence, story_link, evidence, fix, remaining_risk。',
      '资产只点名、缺功能/归属/触发/限制/后果或没有挂到目标/冲突/回报/章尾钩子时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，asset_linkage_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (dialogueSync) {
    const missed = arrayValue(dialogueSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(dialogueSync.next_actions || dialogueSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【对白质量修复】',
      firstText(dialogueSync.label) ? `对白结论：${firstText(dialogueSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 dialogue_checks 修复对白，让每句对白至少承担推进剧情、增加期待或展示人设之一。',
      '正文要求：补潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进；把说明书式对白改成借口、试探、回避、动作反应或信息差拉扯，短句方成为权力上位时要有明确节奏变化。',
      '输出要求：必须返回 dialogue_checks，不能只写自然语言对白已优化。',
      'dialogue_checks 每项必须包含 key, label, status, speaker, agenda, subtext, power_shift, information_delta, character_voice, evidence, fix, remaining_risk。',
      '对白没有议程/潜台词/权力变化/信息增量/声线差异证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，dialogue_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (plotDynamicsSync) {
    const missed = arrayValue(plotDynamicsSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(plotDynamicsSync.next_actions || plotDynamicsSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【剧情动力修复】',
      firstText(plotDynamicsSync.label) ? `动力结论：${firstText(plotDynamicsSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 plot_dynamics_checks 补目标、阻碍、行动、代价/反馈、新期待的最小剧情循环。',
      '正文要求：需要时重构假胜、崩解、A/B情绪交替、多线错峰或悬置收尾；新增内容必须写成现场行动、选择压力、代价反馈、信息变化或状态变化，不能只补解释。',
      '输出要求：必须返回 plot_dynamics_checks，不能只写自然语言剧情动力已增强。',
      'plot_dynamics_checks 每项必须包含 key, label, status, goal, obstacle, action, cost_or_feedback, new_expectation, evidence, fix, remaining_risk。',
      '目标、阻碍、行动、代价/反馈或新期待缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，plot_dynamics_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (characterRelationSync) {
    const missed = arrayValue(characterRelationSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(characterRelationSync.next_actions || characterRelationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【角色关系修复】',
      firstText(characterRelationSync.label) ? `关系结论：${firstText(characterRelationSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 character_relation_checks 修复角色关系，补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽、配角主动行动、态度变化和阶段匹配。',
      '正文要求：主角必须保留自己的诉求、主动选择和代价；关系线可以互助，但不能让主角只是在帮别人办事。关系推进要落成目标摩擦、资源交换、风险共担、态度变化或可定位的行动反馈。',
      '输出要求：必须返回 character_relation_checks，不能只写自然语言角色关系已修复。',
      'character_relation_checks 每项必须包含 key, label, status, relation_type, protagonist_goal, agency_choice, cost, relation_shift, evidence, fix, remaining_risk。',
      '主角缺自己的诉求、主动选择、代价或关系变化证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，character_relation_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (characterBehaviorSync) {
    const missed = arrayValue(characterBehaviorSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(characterBehaviorSync.next_actions || characterBehaviorSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【角色行为修复】',
      firstText(characterBehaviorSync.label) ? `行为结论：${firstText(characterBehaviorSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 character_behavior_checks 修复角色行为，补主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、记忆锚点、配角功能、反派内在逻辑、反派分量、反派自我叙事和反派层级退场。',
      '正文要求：动机不能只写“想变强/被欺负”，必须落到具体事件、情感理由、触发变化和代价；角色标签必须通过行动、对白、选择压力、资源使用、旁观反馈或失败代价展示出来。',
      '输出要求：必须返回 character_behavior_checks，不能只写自然语言角色行为已合理。',
      'character_behavior_checks 每项必须包含 key, label, status, character, concrete_motive, emotional_reason, trigger_change, visible_choice, cost, evidence, fix, remaining_risk。',
      '动机只写想变强/被欺负，或缺具体事件、情感理由、可见选择/代价证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，character_behavior_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (conflictStructureSync) {
    const missed = arrayValue(conflictStructureSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(conflictStructureSync.next_actions || conflictStructureSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【冲突结构修复】',
      firstText(conflictStructureSync.label) ? `冲突结论：${firstText(conflictStructureSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 conflict_structure_checks 修复冲突结构，补阻止者、有进无出、死亡赌注/退出代价、黏结剂、行动阻拦、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子。',
      '正文要求：必须有人阻止主角得到目标；冲突要从言语、动作、激烈对抗推进到决定胜负。让主角非踏入不可，并用职责、道德责任、实体场所、封闭条件或身份代价把双方黏住，不能只是嘴炮或可随时离场。',
      '输出要求：必须返回 conflict_structure_checks，不能只写自然语言冲突已增强。',
      'conflict_structure_checks 每项必须包含 key, label, status, blocker, no_exit_condition, stakes_or_exit_cost, action_block, win_loss_result, evidence, fix, remaining_risk。',
      '缺少阻止者、有进无出条件、退出代价、行动阻拦或明确胜负证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，conflict_structure_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (bridgeUnitSync) {
    const missed = arrayValue(bridgeUnitSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(bridgeUnitSync.next_actions || bridgeUnitSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【桥段节奏修复】',
      firstText(bridgeUnitSync.label) ? `桥段结论：${firstText(bridgeUnitSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 bridge_unit_checks 修复桥段节奏，确认四章一桥段位置，补连续期待、目标推进、章尾新目标、高潮中埋钩子、连续小期待、高潮时长和阶段衔接。',
      '正文要求：兑现旧期待前先挂新期待；连续2章没有目标推进时提高冲突密度，连续2章只爆点时补关系、伏笔、状态承接余波，避免桥段散场、过渡无功能或只爆不接。',
      '输出要求：必须返回 bridge_unit_checks，不能只写自然语言桥段节奏已修复。',
      'bridge_unit_checks 每项必须包含 key, label, status, bridge_position, old_expectation_payoff, new_expectation_seed, goal_progression, climax_hook, stage_handoff, evidence, fix, remaining_risk。',
      '旧期待兑现后没有新期待、目标推进、高潮埋钩或阶段衔接证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，bridge_unit_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (reversalSync) {
    const missed = arrayValue(reversalSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(reversalSync.next_actions || reversalSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【反转设计修复】',
      firstText(reversalSync.label) ? `反转结论：${firstText(reversalSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 reversal_checks 修复反转设计，补足反转类型、3处暗示、公平误导、揭示时机、非作弊性、揭示后影响、情绪冲击和打脸节奏。',
      '正文要求：暗示必须提前落在行为、物件、证据、时间线或反常选择里；揭示要短而狠，并直接改变局势、关系或读者情绪；删除天降反转、作弊新信息和大段解释独白。',
      '输出要求：必须返回 reversal_checks，不能只写自然语言反转已修复。',
      'reversal_checks 每项必须包含 key, label, status, reversal_type, fair_clues, misdirect, reveal_timing, impact_after_reveal, evidence, fix, remaining_risk。',
      '缺少3处公平暗示、可信误导、自然揭示或揭示后影响证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，reversal_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (showdownSync) {
    const missed = arrayValue(showdownSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(showdownSync.next_actions || showdownSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【高潮对抗修复】',
      firstText(showdownSync.label) ? `高潮结论：${firstText(showdownSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 showdown_checks 修复高潮对抗，补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗服务爽点、以弱胜强逻辑、三层破局和急-缓-急情绪节奏。',
      '正文要求：底牌释放后反派必须受到对应压制；每次只出1个底牌并保留2-3个未揭示后手；爆发前先写友方、敌方、中立方三路铺压，爆发后分别写三方震动和利益变化。',
      '输出要求：必须返回 showdown_checks，不能只写自然语言高潮已增强。',
      'showdown_checks 每项必须包含 key, label, status, payoff_release, trump_card_used, pressure_layers, audience_reactions, consequence, next_threshold, evidence, fix, remaining_risk。',
      '底牌释放后缺对应压制、三方震动、后果或新门槛证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，showdown_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (openingSync) {
    const missed = arrayValue(openingSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(openingSync.next_actions || openingSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【开篇设计修复】',
      firstText(openingSync.label) ? `开篇结论：${firstText(openingSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 opening_checks 修复开篇设计，重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单、不偏、快、爽、不平）、主角目标与本文卖点和信息分批释放。',
      '正文要求：第一屏不要大段背景、天气风景、序章楔子或详细世界观；直接让主角进入有目标、有压力、有可见变化的现场，并尽快给出读者继续看的危机、爽点、问题或回报承诺。',
      '输出要求：必须返回 opening_checks，不能只写自然语言开篇已优化。',
      'opening_checks 每项必须包含 key, label, status, protagonist_entry, first_300_goal, first_1000_expectation, opening_principle, evidence, fix, remaining_risk。',
      '主角未在300字内登场、1000字内缺爽点/期待点或开篇仍是背景说明时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，opening_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (proseCraftSync) {
    const missed = arrayValue(proseCraftSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(proseCraftSync.next_actions || proseCraftSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【正文工艺修复】',
      firstText(proseCraftSync.label) ? `工艺结论：${firstText(proseCraftSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 prose_craft_checks 修复正文工艺，补深度限知、身体细节、环境交互、镜头对象、一动一静、三维度揉进、具体数字/贯穿道具功能和自然子事件连接。',
      '正文要求：用主角可感知的动作、触感、视线、呼吸、对白反应或物件变化承接场景；删除上帝视角、全场/所有人远景概括、连续内心独白、抽象情绪总结、堆叠式描写、无交互环境和“然后/接着/随后/于是”胶水词过渡。',
      '输出要求：必须返回 prose_craft_checks，不能只写自然语言正文工艺已优化。',
      'prose_craft_checks 每项必须包含 key, label, status, pov_depth, body_detail, environment_interaction, action_stillness_balance, crowd_reaction_layering, evidence, fix, remaining_risk。',
      '缺少深度限知、身体细节、环境交互、一动一静或围观分层证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，prose_craft_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (punctuationToneSync) {
    const missed = arrayValue(punctuationToneSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(punctuationToneSync.next_actions || punctuationToneSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【语气标点修复】',
      firstText(punctuationToneSync.label) ? `语气结论：${firstText(punctuationToneSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 punctuation_tone_checks 修复语气标点，处理通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质。',
      '正文要求：标点必须服务人物声线和情绪节奏；被打断或拖长音用动作打断、换行、短句或未完成动作承接；信息揭示和判断落点用冒号或短句落下，删除论文式长分号链。',
      '输出要求：必须返回 punctuation_tone_checks，不能只写自然语言语气标点已修复。',
      'punctuation_tone_checks 每项必须包含 key, label, status, speaker, punctuation_issue, tone_intent, replacement, voice_difference, evidence, fix, remaining_risk。',
      '标点未服务质问/爆发/迟疑/声线，或缺少替换后正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，punctuation_tone_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (contentRubricSync) {
    const missed = arrayValue(contentRubricSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(contentRubricSync.next_actions || contentRubricSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【内容基准修复】',
      firstText(contentRubricSync.label) ? `内容结论：${firstText(contentRubricSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 content_rubric_checks 修复内容基准，补核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、文字自然度、最小剧情循环和高潮构建。',
      '正文要求：必须回答黄金三问：读者为什么翻下一页？本章改变了什么？哪个正文证据支持判断？修订要把变化落到动作、对白、信息变化、关系变化、资源变化或规则评价上。',
      '输出要求：必须返回 content_rubric_checks，不能只写自然语言内容基准已修复。',
      'content_rubric_checks 每项必须包含 key, label, status, core_selling_point, conflict_progression, chapter_change, page_turn_reason, evidence, fix, remaining_risk。',
      '缺少核心卖点、冲突推进、章节变化、翻页理由或正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，content_rubric_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (targetReaderSync) {
    const missed = arrayValue(targetReaderSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(targetReaderSync.next_actions || targetReaderSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：目标读者】',
      firstText(targetReaderSync.label) ? `读者结论：${firstText(targetReaderSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修目标读者不是补人群标签，而是把本书写给谁、读者为什么想看、本章给了什么重新压回正文。',
      '修订要求：按 target_reader_checks 修复目标读者缺口，补清目标读者画像、读者渴望、情绪缺口、本章命中点、平台口味和可见读者回报。',
      '正文要求：按 oh-story 自嗨判定法回答“写给谁看、目标读者想看什么、本章给了什么”；情绪缺口必须把核心痛苦、深层情结、高频情绪关键词和未满足需求写成现场压力、角色选择、即时反馈或尊严/安全感/掌控感补偿。',
      '输出要求：必须返回 target_reader_checks，不能只写自然语言目标读者已对齐。',
      'target_reader_checks 每项必须包含 key, label, status, target_reader_profile, reader_desire, emotion_gap, chapter_hit, platform_taste, evidence, fix, remaining_risk。',
      '缺少目标读者画像、读者渴望、情绪缺口或本章可感知回报证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，target_reader_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明目标读者画像、读者渴望、情绪缺口和本章可感知回报重新对齐。',
    )
  }
  if (genrePositioningSync) {
    const missed = arrayValue(genrePositioningSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(genrePositioningSync.next_actions || genrePositioningSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：题材定位】',
      firstText(genrePositioningSync.label) ? `题材结论：${firstText(genrePositioningSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修题材定位不是补设定说明，而是让本章重新证明本书核心梗、类型公式和题材长板。',
      '修订要求：按 genre_positioning_checks 修复题材定位，校准题材标签、读者心理、核心梗、类型公式、金手指贴合、必备场景、微创新边界、平台适配和题材长板。',
      '正文要求：拉长题材长板而不是补短板；删除稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据；必须兑现书名简介正文三位一体，避免挂羊头卖狗肉或微创新超过承载范围。',
      '输出要求：必须返回 genre_positioning_checks，不能只写自然语言题材定位已强化。',
      'genre_positioning_checks 每项必须包含 key, label, status, genre_tag, core_hook, type_formula, genre_strength, book_title_blurb_alignment, evidence, fix, remaining_risk。',
      '缺少核心梗、类型公式、题材长板或书名简介正文对齐证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，genre_positioning_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明题材标签、核心梗、类型公式和题材长板重新服务本书承诺。',
    )
  }
  if (femaleAudienceSync) {
    const missed = arrayValue(femaleAudienceSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(femaleAudienceSync.next_actions || femaleAudienceSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【女频长篇修复】',
      firstText(femaleAudienceSync.label) ? `女频结论：${firstText(femaleAudienceSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 female_audience_checks 修复女频长篇缺口，补安全感、代入感、女主主动性、主情绪、感情线双轴、虐后反转或糖、平台对位和货板一致。',
      '正文要求：把女主被动改成女主自己做决定、自己推进，并让关键选择带来被认可、被珍视、被尊重的回馈；感情升级必须踩在事业/成长节点上，虐戏后必须给反转或糖，避免连续整卷只虐。',
      '输出要求：必须返回 female_audience_checks，不能只写自然语言女频长篇已修复。',
      'female_audience_checks 每项必须包含 key, label, status, security_anchor, reader_identification, heroine_agency, relationship_axis, post_abuse_payoff, evidence, fix, remaining_risk。',
      '缺少女主主动性、安全感锚点、代入回馈或虐后反转/糖证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，female_audience_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (upgradeRhythmSync) {
    const missed = arrayValue(upgradeRhythmSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(upgradeRhythmSync.next_actions || upgradeRhythmSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【升级节奏修复】',
      firstText(upgradeRhythmSync.label) ? `升级结论：${firstText(upgradeRhythmSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 upgrade_rhythm_checks 修复升级节奏，补升级前后对比、即时反馈、延迟反馈、新门槛、金手指功能/触发/奖励/限制/升级规则和多维成长。',
      '正文要求：金手指简单是核心，规则必须让读者一眼看懂；升级不能只给奖励，必须先有被压制的情绪缺口，再用即时反馈改变资格、能力、关系或地位，并用延迟反馈引出更高门槛、排行榜/层级压力或下一阶段目标。',
      '输出要求：必须返回 upgrade_rhythm_checks，不能只写自然语言升级节奏已修复。',
      'upgrade_rhythm_checks 每项必须包含 key, label, status, before_after_contrast, instant_feedback, delayed_feedback, new_threshold, cheat_rule, evidence, fix, remaining_risk。',
      '缺少升级前后对比、即时反馈、延迟反馈、新门槛或金手指规则证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，upgrade_rhythm_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterStructureSync) {
    const missed = arrayValue(chapterStructureSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterStructureSync.next_actions || chapterStructureSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节结构修复】',
      firstText(chapterStructureSync.label) ? `结构结论：${firstText(chapterStructureSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 structure_checks 修复章节结构，补开头钩子、中段推进、局势变化、章尾翻页。',
      '正文要求：开头必须给具体异常/证据/危机，中段必须用行动推动局势变化，结尾必须落在新的发现、危机、选择或反转上；不得只用复述、解释、总结或等待收尾。',
      '输出要求：必须返回 structure_checks，不能只写自然语言章节结构已修复。',
      'structure_checks 每项必须包含 key, label, status, opening_hook, middle_progression, situation_change, ending_page_turn, evidence, fix, remaining_risk。',
      '缺少开头钩子、中段推进、局势变化或章尾翻页证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，structure_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterProgressionSync) {
    const missed = arrayValue(chapterProgressionSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterProgressionSync.next_actions || chapterProgressionSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节推进修复】',
      firstText(chapterProgressionSync.label) ? `推进结论：${firstText(chapterProgressionSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 progression_checks 修复章节推进，证明删掉这章会影响理解。',
      '正文要求：至少补出证据、选择、代价、关系变化、设定位移或主线位移之一；等待、旧设定复述、原地解释和不改变局势的段落必须压缩，或改造成行动推进与状态变化。',
      '输出要求：必须返回 progression_checks，不能只写自然语言章节已推进。',
      'progression_checks 每项必须包含 key, label, status, non_deletable_change, mainline_shift, relationship_or_state_change, compressed_water, evidence, fix, remaining_risk。',
      '缺少不可删除变化、主线位移、关系/状态变化或水文压缩证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，progression_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (informationLoadSync) {
    const missed = arrayValue(informationLoadSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(informationLoadSync.next_actions || informationLoadSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【信息负载修复】',
      firstText(informationLoadSync.label) ? `信息结论：${firstText(informationLoadSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 information_checks 修复信息负载，一章不超 3 个新概念，信息必须跟着冲突和行动走。',
      '正文要求：删除行动前的大段设定说明，把规则、来历、限制和代价改成角色质疑、触发、证据核对、冲突反馈或状态变化中的可见信息；读者先看到事，再理解规则。',
      '输出要求：必须返回 information_checks，不能只写自然语言信息负载已降低。',
      'information_checks 每项必须包含 key, label, status, new_concept_count, action_bound_info, conflict_release, reader_first_scene, evidence, fix, remaining_risk。',
      '新概念超过 3 个、信息没有跟行动/冲突释放或缺少正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，information_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (longformContinuitySync) {
    const missed = arrayValue(longformContinuitySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(longformContinuitySync.next_actions || longformContinuitySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【长篇连续性修复】',
      firstText(longformContinuitySync.label) ? `长篇结论：${firstText(longformContinuitySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 longform_checks 修复长篇连续性，检查最近 5 章进展、爽点间隔、阶段目标和下一阶段牵引。',
      '上下文分层：优先使用追踪/上下文.md 的近5章详记、十章概要、卷级总览；压缩早期章节、保留近期细节，避免长篇后段只凭零散记忆续写。',
      '范围边界：本任务只修长篇连续性相关承接、阶段位移和后续牵引，不要通读全书或重算全量伏笔；全量伏笔审计只在专门复盘任务中执行。',
      '正文要求：本章必须承接前文状态并推动后续，补出阶段位移、关系/资产/规则状态变化、爽点回报或下一阶段目标；避免连续多章只解释背景、原地等待或重复同一种小冲突。',
      '输出要求：必须返回 longform_checks，不能只写自然语言长篇连续性已修复。',
      'longform_checks 每项必须包含 key, label, status, recent_5_chapter_progress, payoff_interval, stage_goal_shift, next_stage_pull, context_layer, evidence, fix, remaining_risk。',
      '缺少最近5章进展、爽点间隔、阶段目标位移或下一阶段牵引证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，longform_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (coreContractCheckSync) {
    const missed = arrayValue(coreContractCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(coreContractCheckSync.next_actions || coreContractCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：核心承诺】',
      firstText(coreContractCheckSync.label) ? `契约结论：${firstText(coreContractCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修核心承诺不是把支线解释得更合理，而是让支线、资产、情绪和章尾问题重新服务全书承诺。',
      '修订要求：按 core_contract_checks 修复核心契约，守住核心承诺、主线服务、不得漂移红线和主题统一。',
      '正文要求：把支线、资产、情绪和章尾问题都压回全书核心承诺；小情绪必须服从全书核心情绪，repair_focus 必须落成可见事件、选择、代价、规则判定、主线推进或章末问题。',
      '输出要求：必须返回 core_contract_checks，不能只写自然语言核心承诺已回归。',
      'core_contract_checks 每项必须包含 key, label, status, core_promise, mainline_service, core_emotion, rule_judgement, ending_question, evidence, fix, remaining_risk。',
      '缺少主线服务、核心情绪、规则判定或章尾问题回归证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，core_contract_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明主线服务、核心情绪、规则判定和章尾问题重新回到本书承诺。',
    )
  }
  if (continuityHeatSync) {
    const missed = arrayValue(continuityHeatSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(continuityHeatSync.next_actions || continuityHeatSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【连续性热度修复】',
      firstText(continuityHeatSync.label) ? `热度结论：${firstText(continuityHeatSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 continuity_heat_checks 修复连续性热度，hot 元素推进，warm 元素保温，cold 回收前必须升温，archived 保持休眠边界。',
      '正文要求：伏笔、关系和期待必须写成当场压力、行动门槛、证据变化、关系站队或章尾问题；不得只点名不推进，不得把冷线突然拿来解题。',
      '输出要求：必须返回 continuity_heat_checks，不能只写自然语言连续性热度已修复。',
      'continuity_heat_checks 每项必须包含 key, label, status, heat_state, hot_progress, warm_keepalive, cold_warmup, archived_boundary, evidence, fix, remaining_risk。',
      'hot 未推进、warm 未保温、cold 回收前未升温或缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，continuity_heat_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (revisionReceiptCheckSync) {
    const missed = arrayValue(revisionReceiptCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(revisionReceiptCheckSync.next_actions || revisionReceiptCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【修订回执修复】',
      firstText(revisionReceiptCheckSync.label) ? `回执结论：${firstText(revisionReceiptCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 revision_receipt_checks 修复修订回执，revision_receipts 必须逐条对应 delivery_risk_receipts、prose revision 要求或本次修订风险。',
      '回执要求：每条 revision_receipts 必须写清 required_action、repair_segment、applied_fix 和 changed_evidence；changed_evidence 必须引用修订后正文中可定位的动作、对白、信息变化、关系变化或物品状态变化。',
      '输出要求：必须返回 revision_receipt_checks，不能只写自然语言修订回执已补齐。',
      'revision_receipt_checks 每项必须包含 key, label, status, required_action, repair_segment, applied_fix, changed_evidence, evidence, fix, remaining_risk。',
      'revision_receipts 未逐条对应风险，或 changed_evidence 不能定位修订后正文时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，revision_receipt_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (deslopRepairCheckSync) {
    const missed = arrayValue(deslopRepairCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(deslopRepairCheckSync.next_actions || deslopRepairCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【去AI味修复】',
      firstText(deslopRepairCheckSync.label) ? `去味结论：${firstText(deslopRepairCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 deslop_repair_checks 修复去AI味残留，逐条处理 story-deslop Gate A-G 的 fail/warn 项。',
      '正文要求：重写模板化对白、抽象心理、堆叠描写、无功能环境、万能转折或AI腔表达；deslop_repair_receipts.changed_evidence 必须引用修订后正文证据。',
      '输出要求：必须返回 deslop_repair_checks，不能只写自然语言去AI味已修复。',
      'deslop_repair_checks 每项必须包含 key, label, status, gate, original_risk, rewritten_evidence, changed_evidence, receipt_synced, fix, remaining_risk。',
      'Gate A-G 残留未重写、changed_evidence 缺正文证据或回执未同步时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，deslop_repair_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (proseMetaSync) {
    const missed = arrayValue(proseMetaSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(proseMetaSync.next_actions || proseMetaSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【正文元叙事修复】',
      firstText(proseMetaSync.label) ? `元叙事结论：${firstText(proseMetaSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 prose_meta_checks 删除作者说明、创作术语、章节意图旁白和元叙事提示。',
      '工程词扫描：标题行以外不得出现 第[一二三四五六七八九十百千万两0-9]+章、上一章/上章/前一章/本章/这一章/前文/后文/伏笔/细纲/读者 等写作工程词。',
      '替换要求：命中工程词时，必须改成角色当下能感知的事件锚点、相对时间、物件状态或对话信息，不能只删除导致承接断裂。',
      '例外口径：只有故事世界内真实阅读/讨论“第X章”文本，或角色真实具备作者/读者身份并谈论读者身份时，才允许保留。',
      '正文要求：把铺垫、伏笔、反转、信息解释改成角色现场证据、误判、行动后果、对白交锋或物品/关系/状态变化；不得对读者解释“这一章用来做什么”。',
      '输出要求：必须返回 prose_meta_checks，不能只写自然语言清理说明。',
      'prose_meta_checks 每项必须包含 key, label, status, matched_term, location, replacement, evidence, remaining_risk；matched_term 写命中的工程词，replacement 写替换后的场景内表达。',
      '复检要求：标题行以外仍有工程词时 status 不能写 pass/ok；只有所有命中词都替换为角色当下可感知表达或明确符合故事内例外时，才能关闭。',
      '关闭口径：重新运行正文自检后，prose_meta_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (bannedWordsSync) {
    const missed = arrayValue(bannedWordsSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(bannedWordsSync.next_actions || bannedWordsSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【禁用词扫描修复】',
      firstText(bannedWordsSync.label) ? `禁用词结论：${firstText(bannedWordsSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '规则来源：对照 references/banned-words.md；一级词命中即替换，二级/模板表达按语境降噪处理。',
      '修订要求：按 banned_words_checks 逐条替换命中词，把套话改成具体动作、事实、口语化对白或场景内判断。',
      '替换边界：不得用同义套话替换，不得只改一个词保留原模板句式；替换后必须仍服务本章动作、信息、情绪或状态变化。',
      '输出要求：必须返回 banned_words_checks，不能只写自然语言替换说明。',
      'banned_words_checks 每项必须包含 key, label, status, matched_word, level, location, replacement, evidence, remaining_risk；matched_word 写原命中词，replacement 写替换后的正文表达。',
      '复检要求：一级词或模板表达未复扫为 0 时 status 不能写 pass/ok；只有命中项全部替换且未产生同义套话时，才能关闭。',
      '关闭口径：重新运行正文自检后，banned_words_checks 必须全部为 pass/ok，missed_count=0，一级词复扫为 0。',
    )
  }
  if (blueprintConsumptionSync) {
    const missed = arrayValue(blueprintConsumptionSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(blueprintConsumptionSync.next_actions || blueprintConsumptionSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const blueprintFocus = objectValue(blueprintConsumptionSync.blueprint_focus || blueprintConsumptionSync.blueprintFocus)
    lines.push(
      '【细纲兑现修复】',
      firstText(blueprintConsumptionSync.label) ? `细纲结论：${firstText(blueprintConsumptionSync.label)}` : '',
      firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary) ? `内容概括：${firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary)}` : '',
      firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement) ? `情节安排：${firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement)}` : '',
      firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder) ? `人物关系/出场顺序：${firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder)}` : '',
      firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail) ? `情节细化：${firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail)}` : '',
      firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook) ? `结尾设定和钩子：${firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：新版细纲存在时，必须消费内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现，以及结尾设定和钩子。',
      'craft 核对一：爽点出手前必须有可指认的危机/期待铺垫；指不出就补铺垫情节点，不能让高潮凭空发生。',
      'craft 核对二：装逼/打脸/揭露章必须写出在场配角差异化反应，不能只写主角动作或集体模板震惊。',
      'craft 核对三：详略必须按目的词，爽点/卖点展开，过渡点带过，信息密度交替；均匀注水时删过渡、扩爽点点。',
      '旧版细纲口径：若只有旧版细纲，则至少核对核心事件、目标情绪、章首/章尾钩子和字数目标。',
      '输出要求：必须返回 blueprint_consumption_checks，不能只写自然语言细纲兑现说明。',
      'blueprint_consumption_checks 每项必须包含 key, label, status, blueprint_field, expected, delivered_evidence, missing_gap, fix, remaining_risk；blueprint_field 写对应的细纲字段，如 content_outline、plot_arrangement、character_order、cost_and_reward、ending_hook。',
      '复检要求：新版细纲关键项未被正文证据兑现时 status 不能写 pass/ok；只有内容概括、情节安排、人物出场、代价/收益、结尾钩子和 craft 核对项都有正文证据时，才能关闭。',
      '关闭口径：重新运行正文自检后，blueprint_consumption_checks 必须全部为 pass/ok，missed_count=0，并能从 chapter_text 定位正文证据。',
    )
  }
  if (foreshadowingDeltaSync) {
    const missed = arrayValue(foreshadowingDeltaSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(foreshadowingDeltaSync.next_actions || foreshadowingDeltaSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【伏笔增量修复】',
      firstText(foreshadowingDeltaSync.label) ? `伏笔结论：${firstText(foreshadowingDeltaSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：只确认本轮新增/推进/回收的伏笔增量，补写追踪/伏笔.md 并更新状态。',
      '台账字段：每条增量至少写清伏笔名称、类型（新增/推进/回收）、当前状态、首次或本轮涉及章节、source_excerpt 和后续约束。',
      '正文证据：source_excerpt 必须引用修订后 chapter_text 或本轮正文中的原句，不能只用摘要、任务说明或模型自述。',
      '边界要求：不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计；全量伏笔审计只在 /story-review 或用户明确要求“全面检查伏笔”时执行。',
      '输出要求：必须返回 foreshadowing_delta_checks，不能只写自然语言伏笔盘点说明。',
      'foreshadowing_delta_checks 每项必须包含 key, label, status, clue_name, delta_type, current_status, chapter, source_excerpt, ledger_path, fix, remaining_risk；delta_type 只能对应新增/推进/回收这类本轮增量。',
      '复检要求：source_excerpt 不能定位到修订后正文，或追踪/伏笔.md 未写回时 status 不能写 pass/ok；只有本轮伏笔增量都有正文原句和台账记录时，才能关闭。',
      '关闭口径：重新运行正文自检后，foreshadowing_delta_checks 必须全部为 pass/ok，missed_count=0，本轮伏笔增量已写入追踪/伏笔.md。',
    )
  }
  if (deterministicCleanupSync) {
    const missed = arrayValue(deterministicCleanupSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(deterministicCleanupSync.next_actions || deterministicCleanupSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const deterministicProseCleanup = objectValue(deterministicCleanupSync.deterministic_prose_cleanup || deterministicCleanupSync.deterministicProseCleanup)
    const riskCount = metricNumber(deterministicProseCleanup.risk_count ?? deterministicProseCleanup.riskCount)
    const categories = arrayValue(deterministicProseCleanup.categories)
      .map(item => {
        const category = objectValue(item)
        const label = firstText(category.label, category.key, category.name, '风险项')
        const count = metricNumber(category.count)
        const evidence = firstText(category.evidence, category.example, category.text, category.message)
        return [
          label,
          count !== null ? `${count}` : '',
          evidence,
        ].filter(Boolean).join('：')
      })
      .filter(Boolean)
    lines.push(
      '【确定性清理修复】',
      firstText(deterministicCleanupSync.label) ? `清理结论：${firstText(deterministicCleanupSync.label)}` : '',
      '复检对象：deterministic_prose_cleanup',
      riskCount !== null ? `risk_count：${riskCount}` : '',
      categories.length > 0 ? `风险分类：${categories.join('；')}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 MangaForge 确定性清理阶段结果回修正文；命中长省略号、破折号、双连字符、独立横线或高危 AI 句式时，必须回正文改到复扫为 0。',
      '执行边界：只处理硬标点、模板句式、AI 腔表达和明显破坏口吻的确定性风险；不要借清理任务改剧情线、人物状态、设定事实或章节事件。',
      '证据要求：每一类残留都要能对应修订后正文中的具体句子变化；不得只在回执里声称已处理。',
      '输出要求：必须返回 deterministic_prose_cleanup，不能只写自然语言清理说明。',
      'deterministic_prose_cleanup 必须包含 status, risk_count, categories, evidence, required_actions；categories 每项写 key/label/count/evidence/fix_result。',
      '复检要求：risk_count 大于 0 时 status 不能写 ok/pass；只有 risk_count 为 0 且 categories 残留数量清零时，才能关闭确定性清理任务。',
      '关闭口径：重新运行正文自检后，deterministic_prose_cleanup.risk_count 为 0，status 为 ok/pass。',
    )
  }
  if (serialRiskRepairSync) {
    const missed = arrayValue(serialRiskRepairSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(serialRiskRepairSync.next_actions || serialRiskRepairSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【连续风险修复】',
      firstText(serialRiskRepairSync.label) ? `连修结论：${firstText(serialRiskRepairSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 serial_risk_repair_checks 修复安全批量、场景承接和连续生产风险残留。',
      '回执要求：补齐 scene_serial_risk_repair_receipt 或连续生产风险修复回执，并让场景承接变化、状态变化、风险解除或后续约束在正文中可定位。',
      '输出要求：必须返回 serial_risk_repair_checks，不能只写自然语言连续风险已修复。',
      'serial_risk_repair_checks 每项必须包含 key, label, status, risk_type, repair_receipt, continuity_change, state_change, evidence, fix, remaining_risk。',
      '缺少连续生产风险回执、场景承接变化、状态变化或正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，serial_risk_repair_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterHookQualitySync) {
    const missed = arrayValue(chapterHookQualitySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterHookQualitySync.next_actions || chapterHookQualitySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章钩质量修复】',
      firstText(chapterHookQualitySync.label) ? `章钩结论：${firstText(chapterHookQualitySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 chapter_hook_quality_checks 修复章首/章尾翻页质量。',
      '正文要求：章首必须用现场触发的异常、危险、选择、冲突、对话逼问或规则变化拉住读者；章尾必须留下具体问题、危险、发现、选择或下一章行动压力，并和下一章行动直接相连。',
      '输出要求：必须返回 chapter_hook_quality_checks，不能只写自然语言章钩质量说明。',
      'chapter_hook_quality_checks 每项必须包含 key, label, status, hook_position, trigger_type, concrete_question, danger_or_choice, next_action_link, evidence, fix, remaining_risk；hook_position 写 opening 或 ending。',
      '复检要求：章首/章尾没有具体问题、危险/选择、下一章行动连接或正文证据时 status 不能写 pass/ok；只有现场触发和行动承接都能从 chapter_text 定位时，才能关闭。',
      '关闭口径：重新运行正文自检后，chapter_hook_quality_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (readerRetentionCheckSync) {
    const missed = arrayValue(readerRetentionCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(readerRetentionCheckSync.next_actions || readerRetentionCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：追读留存】',
      firstText(readerRetentionCheckSync.label) ? `追读结论：${firstText(readerRetentionCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修追读留存不是单独补钩子，而是把本章的情绪回报、信息差饥饿和章末下一页动力重新绑回读者承诺。',
      '修订要求：按 reader_retention_checks 修复追读雷达，补前300字钩子、正文可见爽点、信息缺口、章末追读，以及留存双引擎的情绪 + 饥饿。',
      '正文要求：情绪必须让读者快速代入，饥饿必须用信息差植入问号并按剥洋葱卡住关键信息；Hook上瘾模型要形成触发 -> 行动 -> 奖励 -> 投入，奖励随机性必须给出出乎意料的额外收获、线索、权限、关系或地位变化，并形成沉没投入。',
      '输出要求：必须返回 reader_retention_checks，不能只写自然语言追读已修复。',
      'reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk。',
      '缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，reader_retention_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明情绪回报、信息差饥饿和章末追读重新闭环。',
    )
  }
  if (intentConfirmationSync) {
    const missed = arrayValue(intentConfirmationSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(intentConfirmationSync.next_actions || intentConfirmationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const blueprintFocus = objectValue(intentConfirmationSync.blueprint_focus || intentConfirmationSync.blueprintFocus)
    lines.push(
      '【写前意图确认修复】',
      intentConfirmationSync.score !== undefined && intentConfirmationSync.score !== null ? `意图评分：${intentConfirmationSync.score}` : '',
      firstText(intentConfirmationSync.label) ? `意图结论：${firstText(intentConfirmationSync.label)}` : '',
      '新版细纲意图：内容概括决定起承转合；情节安排决定主线/辅线/事件线/感情线/逻辑线的取舍；人物关系和出场顺序决定镜头进入顺序；情节细化决定代价兑现/收益兑现；结尾设定和钩子决定章尾承接。',
      firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary) ? `内容概括：${firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary)}` : '',
      firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement) ? `情节安排：${firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement)}` : '',
      firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder) ? `人物关系/出场顺序：${firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder)}` : '',
      firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail) ? `情节细化：${firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail)}` : '',
      firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook) ? `结尾设定和钩子：${firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      'craft 约束：爽点出手前先铺可指认的危机/期待，不能让高潮凭空发生；装逼/打脸/揭露章必须通过在场配角放大信息差和差异化反应；高压/生死/悲痛 beat 下搞笑担当和轻快配角声线让位，信息型配角不得变成科普嘴。',
      '修订要求：必须把写前确认的情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件、选择、动作、对白、关系反馈或物品状态变化。',
      '回执要求：oh_story_delivery_receipts.delivery_risk_receipts 必须逐项引用修订后 chapter_text 中的证据，不能只写“已补意图”。',
      '输出要求：必须返回 intent_confirmation_checks，不能只写自然语言意图已落地说明。',
      'intent_confirmation_checks 每项必须包含 key, label, status, intent_field, expected_intent, delivered_evidence, blueprint_link, fix, remaining_risk；intent_field 写 emotion_goal/chapter_intent/handoff/ending_hook/blueprint/craft 中最贴近的一类。',
      '复检要求：情绪目标、章节意图、关键承接、章尾推动力或新版细纲字段没有正文证据时 status 不能写 pass/ok；只有写前意图能从 chapter_text 定位到事件、选择、动作、对白、关系反馈或物品状态变化时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (writePreparationSync) {
    const missed = arrayValue(writePreparationSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(writePreparationSync.next_actions || writePreparationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【写前准备卡修复】',
      writePreparationSync.score !== undefined && writePreparationSync.score !== null ? `写前准备评分：${writePreparationSync.score}` : '',
      firstText(writePreparationSync.label) ? `写前准备结论：${firstText(writePreparationSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：必须把写前准备卡里的 source_gaps、asset_risks、delivery_risk_actions、上一轮待修复、creation_contract_checklist、blueprint_focus、reader_payoff_focus 和 must_confirm 改成正文可见动作、对白、信息变化、关系变化、物品状态变化或章末承接。',
      '创作契约要求：creation_contract_checklist 不能只汇总为“已处理”；目标读者、题材定位、核心承诺、追读留存必须分别补正文证据，证明本章没有偏离读者承诺和长期卖点。',
      '输出要求：必须返回 write_preparation_checks，不能只写自然语言准备项已处理说明。',
      'write_preparation_checks 每项必须包含 key, label, status, preparation_type, expected, delivered_evidence, chapter_location, fix, remaining_risk；preparation_type 写 source_gap/asset_risk/delivery_risk/contract/blueprint/reader_payoff/must_confirm 中最贴近的一类。',
      '复检要求：写前准备项没有落成正文动作、对白、信息变化、关系变化、物品状态变化或章末承接时 status 不能写 pass/ok；只有 delivered_evidence 和 chapter_location 都能定位到修订后正文时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (benchmarkRecallSync) {
    const missed = arrayValue(benchmarkRecallSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(benchmarkRecallSync.next_actions || benchmarkRecallSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const matchedTechniques = arrayValue(benchmarkRecallSync.matched_chapter_techniques || benchmarkRecallSync.matchedChapterTechniques)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const anchorExcerpts = arrayValue(benchmarkRecallSync.anchor_excerpts || benchmarkRecallSync.anchorExcerpts)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const gaps = summarizeKeyValueFlags(benchmarkRecallSync.gaps)
    lines.push(
      '【文风召回修复】',
      benchmarkRecallSync.score !== undefined && benchmarkRecallSync.score !== null ? `召回评分：${benchmarkRecallSync.score}` : '',
      firstText(benchmarkRecallSync.label) ? `召回结论：${firstText(benchmarkRecallSync.label)}` : '',
      firstText(benchmarkRecallSync.module_source_path, benchmarkRecallSync.moduleSourcePath) ? `情绪模块来源：${firstText(benchmarkRecallSync.module_source_path, benchmarkRecallSync.moduleSourcePath)}` : '',
      firstText(benchmarkRecallSync.rhythm_source_path, benchmarkRecallSync.rhythmSourcePath) ? `节奏来源：${firstText(benchmarkRecallSync.rhythm_source_path, benchmarkRecallSync.rhythmSourcePath)}` : '',
      firstText(benchmarkRecallSync.style_profile_path, benchmarkRecallSync.styleProfilePath) ? `文风来源：${firstText(benchmarkRecallSync.style_profile_path, benchmarkRecallSync.styleProfilePath)}` : '',
      firstText(benchmarkRecallSync.matched_chapter_K, benchmarkRecallSync.matchedChapterK) ? `匹配章节：第${firstText(benchmarkRecallSync.matched_chapter_K, benchmarkRecallSync.matchedChapterK)}章` : '',
      firstText(benchmarkRecallSync.selected_emotion_module, benchmarkRecallSync.selectedEmotionModule) ? `情绪模块：${firstText(benchmarkRecallSync.selected_emotion_module, benchmarkRecallSync.selectedEmotionModule)}` : '',
      firstText(benchmarkRecallSync.rhythm_reference, benchmarkRecallSync.rhythmReference) ? `节奏参照：${firstText(benchmarkRecallSync.rhythm_reference, benchmarkRecallSync.rhythmReference)}` : '',
      firstText(benchmarkRecallSync.style_profile_summary, benchmarkRecallSync.styleProfileSummary) ? `文风摘要：${firstText(benchmarkRecallSync.style_profile_summary, benchmarkRecallSync.styleProfileSummary)}` : '',
      matchedTechniques.length > 0 ? `匹配章技巧：${matchedTechniques.join('；')}` : '',
      anchorExcerpts.length > 0 ? `原文锚点：${anchorExcerpts.join('；')}` : '',
      gaps.length > 0 ? `召回 gaps：${gaps.join('；')}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '权威规则：剧情/情绪模块.md 和 剧情/节奏.md 是权威来源；文风.md 只管表达方式，章节摘要和文风不得覆盖情绪模块或节奏参照。',
      'gaps 保真：不得把 gaps.conflict 或 matched_deep_dive_missing 在回执里反转为 false；如果存在 module_missing、rhythm_missing、profile_missing 或 conflict，必须按原 gaps 写明回退、阻塞或权威优先处理。',
      '修订要求：必须把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折。',
      '禁止复制参照文本原句、桥段、专有设定、角色名或核心梗；修订证据必须写入 oh_story_delivery_receipts.delivery_risk_receipts。',
      '输出要求：必须返回 benchmark_recall_checks，不能只写自然语言对标已应用说明。',
      'benchmark_recall_checks 每项必须包含 key, label, status, source_type, source_path, expected_application, delivered_evidence, gaps_preserved, fix, remaining_risk；source_type 写 emotion_module/rhythm/style_profile/matched_chapter/anchor_excerpt/gaps 中最贴近的一类。',
      '复检要求：对标模块、节奏参照、文风召回或匹配章技巧没有正文证据时 status 不能写 pass/ok；gaps_preserved 必须保留 conflict、module_missing、rhythm_missing、profile_missing、matched_deep_dive_missing 等原始缺口口径。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (nextChapterQualityPlanReceiptSync) {
    const missed = arrayValue(nextChapterQualityPlanReceiptSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(nextChapterQualityPlanReceiptSync.next_actions || nextChapterQualityPlanReceiptSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【质量续航回执闭环】',
      nextChapterQualityPlanReceiptSync.score !== undefined && nextChapterQualityPlanReceiptSync.score !== null ? `质量续航评分：${nextChapterQualityPlanReceiptSync.score}` : '',
      firstText(nextChapterQualityPlanReceiptSync.label) ? `质量续航结论：${firstText(nextChapterQualityPlanReceiptSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按上一章 next_chapter_quality_plan 逐项复验本章正文；quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition 和 evidence_basis 都必须有本章正文证据或明确 remaining_risk。',
      '输出要求：必须返回 next_chapter_quality_plan_receipts，不能只写自然语言质量续航已执行。',
      'next_chapter_quality_plan_receipts 每项必须包含 key, label, delivered, evidence, remaining_risk。',
      '复检要求：delivered=true 时 evidence 必须引用修订后 chapter_text 中可定位的动作、对白、信息变化、结构处理或章末钩子；无法证明时 delivered 不能写 true，remaining_risk 必须说明下一轮风险。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts 必须逐项复验上一章质量续航计划，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (readerTrialReview || task.source === 'reader_trial_review' || task.issue_type === 'reader_trial_drop_point') {
    const trial = objectValue(readerTrialReview)
    const dropPoints = arrayValue(trial.drop_points || trial.dropPoints)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const repairActions = arrayValue(trial.repair_actions || trial.repairActions)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const personas = arrayValue(trial.personas)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.name, value.key, '模拟读者')
        const verdict = firstText(value.verdict, value.focus, value.text, value.description)
        return verdict ? `${label}：${verdict}` : label
      })
      .filter(Boolean)
    const segments = arrayValue(trial.segments)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '试读分段')
        const score = value.score === undefined || value.score === null ? '' : ` ${value.score}分`
        const verdict = firstText(value.verdict, value.summary, value.text, value.description)
        return verdict ? `${label}${score}：${verdict}` : `${label}${score}`
      })
      .filter(Boolean)
    lines.push(
      '【读者试读修复】',
      trial.score !== undefined && trial.score !== null ? `试读评分：${trial.score}` : '',
      firstText(trial.status) ? `试读状态：${firstText(trial.status)}` : '',
      firstText(trial.summary) ? `试读结论：${firstText(trial.summary)}` : '',
      ...dropPoints.map(item => `弃读点：${item}`),
      ...personas.map(item => `模拟读者：${item}`),
      ...segments.map(item => `试读分段：${item}`),
      ...repairActions.map(item => `修复动作：${item}`),
      '修订要求：只修当前章节，把弃读点改成可见的目标推进、爽点回报、情绪反转、信息增量、创新场面或章末钩子。',
      '不得改长期主线方向，不得新增未确认设定，不得把试读问题转嫁到后续章节。',
    )
  }
  if (first30Retention || task.issue_type === 'first30_retention_recheck') {
    const retention = objectValue(first30Retention)
    const risks = arrayValue(retention.risks)
      .map(item => {
        const value = objectValue(item)
        const segment = firstText(value.segment, value.key, value.label, '前30章')
        const issue = firstText(value.issue, value.message, value.text, value.description)
        const action = firstText(value.action, value.repair_action, value.repairAction)
        if (issue && action) return `${segment}：${issue} -> ${action}`
        if (issue) return `${segment}：${issue}`
        return summarizeEvidenceItem(value)
      })
      .filter(Boolean)
    const riskyChapters = arrayValue(retention.risky_chapters || retention.riskyChapters)
      .map(item => {
        const value = objectValue(item)
        const chapterNo = Number(value.chapter_no ?? value.chapterNo ?? 0)
        const title = firstText(value.title, '未命名章节')
        const score = value.score === undefined || value.score === null ? '' : ` ${value.score}分`
        const flags = arrayValue(value.flags).map(flag => text(flag)).filter(Boolean)
        const prefix = chapterNo > 0 ? `第${chapterNo}章《${title}》` : title
        return `${prefix}${score}${flags.length > 0 ? `：${flags.join('、')}` : ''}`
      })
      .filter(Boolean)
    const nextActions = arrayValue(retention.next_actions || retention.nextActions)
      .map(item => text(item))
      .filter(Boolean)
    lines.push(
      '【前30章留存复诊】',
      firstText(retention.status) ? `留存状态：${firstText(retention.status)}` : '',
      retention.score !== undefined && retention.score !== null ? `留存评分：${retention.score}` : '',
      firstText(retention.summary) ? `留存结论：${firstText(retention.summary)}` : '',
      ...risks.map(item => `风险：${item}`),
      ...riskyChapters.map(item => `高危章节：${item}`),
      ...nextActions.map(item => `建议动作：${item}`),
      '修订要求：必须重新校准开篇三章、试读十章和付费前蓄势；把过期诊断后的正文变化重新纳入判断。',
      '如果动作是重新诊断，不要臆造已经修复；如果动作是生成修复任务，优先处理开篇钩子、试读闭环、爽点兑现和章末翻页。',
    )
  }
  if (approvalBlocker) {
    lines.push(
      '【入库阻断修复】',
      `阻断类型：${approvalBlocker.label}`,
      approvalBlocker.scoreLabel ? `阻断评分：${approvalBlocker.scoreLabel}` : '',
      approvalBlocker.copyHitCount !== null ? `相似命中：${approvalBlocker.copyHitCount}` : '',
      approvalBlocker.detail ? `阻断详情：${approvalBlocker.detail}` : '',
      approvalBlocker.reasons.length > 0 ? `阻断原因：${approvalBlocker.reasons.join('；')}` : '',
      '修订要求：必须先解除入库阻断，再处理普通质量润色；如果是仿写安全阻断，保留本章功能、爽点和信息增量，但重写具体桥段、动作顺序、机制表达、场景调度和关键措辞。',
      '不得照搬参考桥段、原句、专名、连续事件节奏或标志性场面；不得只替换名词或扩写说明来规避相似。',
      '修订后必须重新运行正文质检和入库门禁，确认 approval_blocker 消失、质量门禁通过，再关闭任务。',
    )
    if (approvalBlockerNeedsNextChapterQualityPlan(approvalBlocker)) {
      lines.push(
        '【下一章质量续航计划修复】',
        '本次阻断来自 next_chapter_quality_plan 缺失或不完整；修订结果必须补齐 next_chapter_quality_plan，不能只改正文。',
        'next_chapter_quality_plan 必须包含 version、quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition、evidence_basis。',
        'quality_focus 写下一章最该守住的质量目标；opening_actions 写前300字动作；middle_actions 写中段冲突/信息/状态变化；ending_actions 写最后300字追读钩子或承接余波。',
        'avoid_repetition 写下一章禁止复现的表达、结构或收尾套路；evidence_basis 写计划来自本章哪些正文证据、质检问题、回执残留或 oh-story 清单。',
        '同时把同一份计划写入 oh_story_delivery_receipts.next_chapter_quality_plan，确保下一章 pre-draft 能继承。',
      )
    }
  }
  if (sceneCardDirectiveRepair) {
    lines.push(
      '【场景卡执行禁令闭环】',
      sceneCardDirectiveRepair.sourceLabel ? `风险来源：${sceneCardDirectiveRepair.sourceLabel}` : '',
      sceneCardDirectiveRepair.severity ? `严重级别：${sceneCardDirectiveRepair.severity}` : '',
      sceneCardDirectiveRepair.issueType ? `执行问题：${sceneCardDirectiveRepair.issueType}` : '',
      sceneCardDirectiveRepair.sceneNo > 0 ? `目标场景：场景${sceneCardDirectiveRepair.sceneNo}` : '',
      sceneCardDirectiveRepair.conceptAnchorRules.length > 0 ? `新概念锚点规则：${sceneCardDirectiveRepair.conceptAnchorRules.join('；')}` : '',
      sceneCardDirectiveRepair.proseCraftDirectives.length > 0 ? `正文工艺禁令：${sceneCardDirectiveRepair.proseCraftDirectives.join('；')}` : '',
      sceneCardDirectiveRepair.evidence ? `违规证据：${sceneCardDirectiveRepair.evidence}` : '',
      sceneCardDirectiveRepair.fix ? `原始修法：${sceneCardDirectiveRepair.fix}` : '',
      '修订要求：只能修对应场景的场景卡执行缺口；把未兑现的 dialogue_goals、style_directives、benchmark_recall_directives、concept_anchor_rules 或 prose_craft_directives 改成正文可见的动作链、对白交锋、感知锚点、物理后果、证据判断变化或局势反馈。',
      '新概念首次出现要求：必须用动作反应、对白半句、物理后果或证据判断变化锚定；不得补设定小百科、等级表、来历段或作者式解释。',
      '禁令修复要求：如果原问题是 forbidden_directives，先删除违反禁令的说明书式科普、整段来历、原理解释、等级解释或总结旁白，再用角色当下可感知的事件替换。',
      '回执要求：修订后 scene_card_receipts 必须补齐 dialogue_goals_delivered、style_directives_delivered、benchmark_recall_directives_delivered、concept_anchor_rules_delivered、prose_craft_directives_delivered，并让 evidence 引用修订后对应场景正文。',
      '关闭口径：重新运行正文自检后，scene_card_*_execution_directives / scene_card_*_forbidden_directives 必须为 pass/ok，remaining_risk 为空。',
    )
  }
  if (sceneCardReceiptRepair) {
    lines.push(
      '【场景卡回执闭环】',
      sceneCardReceiptRepair.sourceLabel ? `风险来源：${sceneCardReceiptRepair.sourceLabel}` : '',
      sceneCardReceiptRepair.severity ? `严重级别：${sceneCardReceiptRepair.severity}` : '',
      sceneCardReceiptRepair.issueType ? `回执问题：${sceneCardReceiptRepair.issueType}` : '',
      sceneCardReceiptRepair.sceneNo > 0 ? `目标场景：场景${sceneCardReceiptRepair.sceneNo}` : '',
      sceneCardReceiptRepair.fields.length > 0 ? `失败字段：${sceneCardReceiptRepair.fields.join('、')}` : '',
      sceneCardReceiptRepair.evidence ? `回执证据：${sceneCardReceiptRepair.evidence}` : '',
      sceneCardReceiptRepair.fix ? `原始修法：${sceneCardReceiptRepair.fix}` : '',
      '修订要求：只能修对应场景，把失败字段补成正文可见的目标推进、阻碍变化、动作链、感知锚点、风险修复或必要对白，不得顺手改其他场景事实。',
      '回执重写：修订后必须重写该场景 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自修订后对应场景正文。',
      '证据要求：scene_card_receipts.evidence 必须引用修订后对应场景中的动作、对话、信息变化、关系变化或物品状态变化，不得借用其他场景，不得只写“已完成”。',
      '关闭口径：重新运行正文自检后，scene_card_receipt 相关检查必须为 ok；原 delivered=false 的字段必须变成 delivered=true 且 evidence 能在对应场景定位。',
    )
  }
  if (deslopRepairReceiptRepair) {
    lines.push(
      '【去AI味修复回执闭环】',
      deslopRepairReceiptRepair.sourceLabel ? `风险来源：${deslopRepairReceiptRepair.sourceLabel}` : '',
      deslopRepairReceiptRepair.severity ? `严重级别：${deslopRepairReceiptRepair.severity}` : '',
      deslopRepairReceiptRepair.issueType ? `去AI味问题：${deslopRepairReceiptRepair.issueType}` : '',
      deslopRepairReceiptRepair.message ? `回执缺口：${deslopRepairReceiptRepair.message}` : '',
      deslopRepairReceiptRepair.action ? `原始修法：${deslopRepairReceiptRepair.action}` : '',
      ...deslopRepairReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...deslopRepairReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：只补仍未闭环的去AI味门禁风险；如果正文仍有 AI 腔、解释腔、连续主语、总结体或句式套路，先小范围修正文，再补对应回执，不要改变剧情、人设、设定和因果。',
      '回执要求：修订结果必须输出 deslop_repair_receipts；每条回执要逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项。',
      '证据要求：deslop_repair_receipts.changed_evidence 必须引用修订后正文中的具体句子、动作、对白、语序变化或语气变化，不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，deslop_repair_receipt_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (revisionCascadeImpactRepair) {
    lines.push(
      '【修订级联影响闭环】',
      revisionCascadeImpactRepair.sourceLabel ? `风险来源：${revisionCascadeImpactRepair.sourceLabel}` : '',
      revisionCascadeImpactRepair.severity ? `严重级别：${revisionCascadeImpactRepair.severity}` : '',
      revisionCascadeImpactRepair.issueType ? `级联问题：${revisionCascadeImpactRepair.issueType}` : '',
      revisionCascadeImpactRepair.message ? `级联缺口：${revisionCascadeImpactRepair.message}` : '',
      revisionCascadeImpactRepair.action ? `原始修法：${revisionCascadeImpactRepair.action}` : '',
      ...revisionCascadeImpactRepair.missed.map(item => `影响项：${item}`),
      ...revisionCascadeImpactRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：不要只改当前章表面文字；必须复核 revision_receipts.cascade_impacts，把本章修订后的伏笔、时间线、角色状态、资产归属和关系边界转成后续章节可执行动作。',
      '证据要求：每条 cascade_impacts 必须补齐 evidence/source_excerpt，引用修订后正文中支撑正史变更的原句或场景变化。',
      '后续同步：如果受影响章节已经存在，先修正对应章节或形成明确修复任务；如果还未写入，必须写入下一章/后续章的 pre-draft carry-over。',
      '关闭口径：重新运行正文自检后，revision_cascade_impact_sync 必须为 ok，missed_count=0，后续章节不再沿用旧状态。',
    )
  }
  if (revisionContextReceiptRepair) {
    lines.push(
      '【修订上下文回执闭环】',
      revisionContextReceiptRepair.sourceLabel ? `风险来源：${revisionContextReceiptRepair.sourceLabel}` : '',
      revisionContextReceiptRepair.severity ? `严重级别：${revisionContextReceiptRepair.severity}` : '',
      revisionContextReceiptRepair.issueType ? `上下文问题：${revisionContextReceiptRepair.issueType}` : '',
      revisionContextReceiptRepair.message ? `上下文缺口：${revisionContextReceiptRepair.message}` : '',
      revisionContextReceiptRepair.action ? `原始修法：${revisionContextReceiptRepair.action}` : '',
      ...revisionContextReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...revisionContextReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：先按 workflow-revision 重新核对修订前后的上下文，再小范围修正文或补后续承接；不能假设已经一致。',
      '覆盖范围：revision_context_receipts 必须逐项覆盖 previous_chapter、current_chapter、next_chapter 或下一章细纲、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界。',
      '回执字段：每条 revision_context_receipts 必须包含 key、label、status、evidence、fix、source_excerpt；无法确认某个来源时 status 写 warn/fail，并写清本章或下一章如何兜住。',
      '证据要求：source_excerpt/evidence 必须引用修订后正文、上一章、下一章细纲、伏笔台账、角色卡、时间线或设定上下文中可定位的原句/条目，不得只写“已核对”。',
      '关闭口径：重新运行正文自检后，revision_context_receipts_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (revisionScopeGuardRepair) {
    lines.push(
      '【修订幅度守恒】',
      revisionScopeGuardRepair.sourceLabel ? `风险来源：${revisionScopeGuardRepair.sourceLabel}` : '',
      revisionScopeGuardRepair.severity ? `严重级别：${revisionScopeGuardRepair.severity}` : '',
      revisionScopeGuardRepair.issueType ? `幅度问题：${revisionScopeGuardRepair.issueType}` : '',
      revisionScopeGuardRepair.message ? `幅度缺口：${revisionScopeGuardRepair.message}` : '',
      revisionScopeGuardRepair.action ? `原始修法：${revisionScopeGuardRepair.action}` : '',
      ...revisionScopeGuardRepair.missed.map(item => `缺口项：${item}`),
      ...revisionScopeGuardRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复，避免把润色扩大成新剧情。',
      '幅度标准：修订前后字数差异必须回到 max(原文 30%, 800 字) 警戒线内，除非 revision_scope_guard.scope_warning 给出可审计理由。',
      '保护内容：不得为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折；不得无证据新增支线、设定、关系或时间线。',
      '关闭口径：重新运行正文自检后，revision_scope_guard_sync 必须为 ok，missed_count=0。',
    )
  }
  if (proseRevisionReceiptSyncRepair) {
    lines.push(
      '【修订回执同步闭环】',
      proseRevisionReceiptSyncRepair.sourceLabel ? `风险来源：${proseRevisionReceiptSyncRepair.sourceLabel}` : '',
      proseRevisionReceiptSyncRepair.severity ? `严重级别：${proseRevisionReceiptSyncRepair.severity}` : '',
      proseRevisionReceiptSyncRepair.issueType ? `修订问题：${proseRevisionReceiptSyncRepair.issueType}` : '',
      proseRevisionReceiptSyncRepair.message ? `回执缺口：${proseRevisionReceiptSyncRepair.message}` : '',
      proseRevisionReceiptSyncRepair.action ? `原始修法：${proseRevisionReceiptSyncRepair.action}` : '',
      ...proseRevisionReceiptSyncRepair.missed.map(item => `缺口项：${item}`),
      ...proseRevisionReceiptSyncRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：先对齐自检 issues、delivery_risk_receipts 和确定性检查缺口，再小范围修正文；不得只补普通润色回执，也不得用一条汇总回执覆盖多条风险。',
      '回执要求：修订结果必须输出 revision_receipts；每条缺失回执都要逐条写 required_action、repair_segment、applied_fix 和 changed_evidence。',
      '证据要求：changed_evidence 必须引用修订后正文中的具体动作、对白、场景后果、状态写回或章末追读证据；不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，prose_revision_receipt_sync 必须为 ok，missed_count=0。',
    )
  }
  if (qualityAuditRepairReceiptRepair) {
    lines.push(
      '【质量诊断修复回执闭环】',
      qualityAuditRepairReceiptRepair.sourceLabel ? `风险来源：${qualityAuditRepairReceiptRepair.sourceLabel}` : '',
      qualityAuditRepairReceiptRepair.severity ? `严重级别：${qualityAuditRepairReceiptRepair.severity}` : '',
      qualityAuditRepairReceiptRepair.issueType ? `质量问题：${qualityAuditRepairReceiptRepair.issueType}` : '',
      qualityAuditRepairReceiptRepair.message ? `回执缺口：${qualityAuditRepairReceiptRepair.message}` : '',
      qualityAuditRepairReceiptRepair.action ? `原始修法：${qualityAuditRepairReceiptRepair.action}` : '',
      ...qualityAuditRepairReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...qualityAuditRepairReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：只补仍未闭环的质量诊断风险；如果正文确实还没改到位，先小范围修正文，再补对应回执，不要重写整章。',
      '回执要求：修订结果必须输出 quality_audit_repair_receipts；每条回执要逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项。',
      '证据要求：quality_audit_repair_receipts.changed_evidence 必须引用修订后正文中的具体句子、动作、对白、信息变化或局势变化，不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，quality_audit_repair_receipt_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (qualityAuditRepair) {
    lines.push(
      '【质量诊断修复】',
      qualityAuditRepair.sourceLabel ? `风险来源：${qualityAuditRepair.sourceLabel}` : '',
      qualityAuditRepair.severity ? `严重级别：${qualityAuditRepair.severity}` : '',
      qualityAuditRepair.issueType ? `质量问题：${qualityAuditRepair.issueType}` : '',
      qualityAuditRepair.message ? `诊断证据：${qualityAuditRepair.message}` : '',
      qualityAuditRepair.action ? `原始修法：${qualityAuditRepair.action}` : '',
      qualityAuditRepair.strategy ? `指定策略：${qualityAuditRepair.strategy}` : '',
      ...qualityAuditRepair.checks.map(item => `检查项：${item}`),
      '修订要求：先补本章一句话概括，再按场景目的词重排详略；爽点/打脸/高潮/卖点/关键揭露/反转必须展开危机或期待铺垫、出手过程、对话交锋、配角反应和结果余波。',
      '水文处理：过渡、赶路、信息交代、时间跳转压成 1-2 句；删除不改变理解的环境描写、空泛总结、机械说明和重复心理活动。',
      '信息流要求：信息跟冲突走，卖点必须用剧情、动作、对白和反应隐性展示，不得直接告知“本章很爽/读者会喜欢/这是核心卖点”。',
      '五维评分修复：根据最低维度选择 rewrite/compress/de_ai/polish；修完必须保留本章主线职责，不新增未确认设定，不提前揭示后续禁揭信息。',
      '输出要求：必须返回 quality_audit_checks，不能只写自然语言质量诊断已修复。',
      'quality_audit_checks 每项必须包含 key, label, status, strategy, purpose_tag, density_change, conflict_bound_info, changed_evidence, fix, remaining_risk。',
      '爽点/打脸/高潮未展开、过渡水文未压缩或 changed_evidence 缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，quality_audit_checks 中本任务相关 fail/warn 必须清零，并在 revision_receipts 或修订说明中写明处理证据。',
    )
  }
  if (deliveryRisk) {
    lines.push(
      '【交稿风险证据】',
      deliveryRisk.source_label ? `风险来源：${deliveryRisk.source_label}` : '',
      deliveryRisk.severity ? `严重级别：${deliveryRisk.severity}` : '',
      deliveryRisk.annotation_key ? `批注键：${deliveryRisk.annotation_key}` : '',
    )
    for (const group of deliveryRisk.evidenceGroups) {
      for (const item of group.items) {
        lines.push(`${group.label}：${item}`)
      }
    }
    if (deliveryRisk.failedReceiptRepairs.length > 0) {
      lines.push(
        '【分段交稿风险回执修复】',
        '修订要求：逐条修复 delivery_risk_receipts 中 delivered=false 或 remaining_risk 非空的失败项；每条都要在对应段位补出可见动作、信息变化、选择压力、读者回报或章末追读。',
        ...deliveryRisk.failedReceiptRepairs.flatMap(deliveryRiskReceiptSegmentRepairLines),
        '回执要求：修订后 revision_receipts 必须逐条对应这些失败回执，changed_evidence 引用修订后正文原句，remaining_risk 为空才算闭环。',
      )
    }
    if (deliveryRisk.openingHandoffMissed.length > 0) {
      lines.push(
        '【开篇承接修复】',
        `承接欠账：${deliveryRisk.openingHandoffMissed.join('；')}`,
        '修订要求：重写或补写本章前 300-500 字，开篇先写角色对上一章钩子、危机、欠账或未解问题的直接反应。',
        '必须让上一章最后一幕在开篇形成连续行动、选择压力、危险反馈或信息增量，再展开本章新场景。',
        '不得从泛环境描写、空泛醒来或无关解释重新开场；不得把上一章钩子拖到中后段才提一句。',
        '输出要求：必须返回 chapter_handoff_checks，不能只写自然语言承接说明。',
        'chapter_handoff_checks 每项必须包含 key, label, status, previous_handoff, opening_obligation, opening_evidence, location, continuity_action, remaining_risk；location 必须指向前300-500字内的正文位置或原句。',
        '复检要求：前300-500字没有接住上一章钩子、危机、欠账或未解问题时 status 不能写 pass/ok；只有开篇形成连续行动、选择压力、危险反馈或信息增量，并能从 chapter_text 定位时，才能关闭。',
        '关闭口径：重新运行正文自检后，chapter_handoff_checks 必须确认 previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue 已落成正文证据，全部为 pass/ok。',
      )
    }
    if (deliveryRisk.openingPullRisk) {
      lines.push(
        '【开篇吸引力修复】',
        `开篇评分：${deliveryRisk.openingHookScore ?? '-'}`,
        '修订要求：重写或补写本章前 300 字，第一屏必须出现异常、危险、欲望或反常信息。',
        '必须把钩子、危机反馈、角色反应或信息增量写成现场动作/对话/选择压力。',
        '不得从泛环境描写或设定解释开场；不得把真正的钩子拖到中后段。',
      )
    }
    if (deliveryRisk.endingPageTurnRisk) {
      lines.push(
        '【章末翻页修复】',
        `章末评分：${deliveryRisk.endingHookScore ?? '-'}`,
        '修订要求：重写或补写本章最后 300 字，把危险升级、选择压力、反转、未解答案或利益诱惑压到最后一幕。',
        '必须让最后一段形成下一章非看不可的问题，同时保持本章事件已经交付。',
        '不得用总结、说明或情绪收束代替章末钩子；不得提前展开下一章完整剧情。',
      )
    }
    if (deliveryRisk.sceneProgressionRisk) {
      lines.push(
        '【场景推进修复】',
        `场景评分：${deliveryRisk.sceneReadabilityScore ?? '-'}`,
        '修订要求：补齐每个场景的目标、阻碍、转折、回报，把中段改成可见行动链和选择压力。',
        '必须让场景中的行动、对话或危机带来信息变化、关系变化、资源代价或局面转折。',
        '不得只补说明文字、环境描写或旁白总结；不得把场景修成设定大纲。',
      )
    }
    if (deliveryRisk.payoffDensityRisk) {
      lines.push(
        '【爽点密度修复】',
        `爽点密度评分：${deliveryRisk.payoffDensityScore ?? '-'}`,
        '修订要求：按每 800-1200 字至少一次信息推进、能力展示、危机反制、关系变化或小回收补足短周期回报。',
        '必须把读者回报写成可见行动结果、信息增量、情绪反转或小兑现。',
        '不得提前透支后续大高潮；新增爽点必须服务本章目标和长期主线。',
      )
    }
    lines.push(
      '【分类修订策略】',
      ...deliveryRisk.strategy,
      '不得改长期主线方向、不得新增未确认设定、不得提前揭示禁揭信息。',
      '修订范围只限当前章节正文；需要新增人物、物品、势力或能力时，只能以本章已出现内容补清楚，不能扩写成新设定大纲。',
    )
  }
  const requiresPreDraftExecutionReceipts = Boolean(
    stateTrackingSync
      || sourceReadinessSync
      || intentConfirmationSync
      || writePreparationSync
      || benchmarkRecallSync
      || nextChapterQualityPlanReceiptSync
      || styleSampleSync,
  )
  const requiresRevisionContextReceipts = Boolean(revisionContextReceiptRepair)
  lines.push(
    '【oh-story交付回执输出】',
    '修订结果必须输出 oh_story_delivery_receipts。',
    'oh_story_delivery_receipts 必须包含 revision_receipts、scene_card_receipts、delivery_risk_receipts；如本任务涉及去AI味或质量诊断修复，还必须包含 deslop_repair_receipts 或 quality_audit_repair_receipts。',
    requiresRevisionContextReceipts ? '如本任务涉及修订上下文回执，还必须包含 revision_context_receipts；同一份上下文核对结果要写入 oh_story_delivery_receipts.revision_context_receipts，不能只放在章节顶层。' : '',
    requiresPreDraftExecutionReceipts ? '如本任务涉及状态筛选、来源就绪、写前准备、意图确认、文风召回或样章策略，或质量续航回执，还必须包含 pre_draft_execution_receipts；状态筛选写入 status_filter_receipts，来源就绪写入 source_readiness_checks，写前准备写入 write_preparation_checks，意图确认写入 intent_confirmation_checks，文风召回写入 benchmark_recall_checks，样章策略写入 style_sample_checks，质量续航写入 next_chapter_quality_plan_receipts。' : '',
    '所有 changed_evidence/evidence 必须引用修订后 chapter_text 中可定位的动作、对白、信息变化、关系变化或物品状态变化。',
    '不能只散落在章节顶层或 scene_breakdown，不能只写“已修复/已完成”。',
  )
  return lines.filter(Boolean).join('\n')
}
