import {
  listNovelChapters as listNovelChaptersFromDb,
} from '../../novel'
import {
  buildChapterAttractionDraftReviewRecord,
  buildChapterCoreDriftDraftReviewRecord,
  buildChapterHandoffDraftReviewRecord,
  buildChapterTitleUniquenessDraftReviewRecord,
  buildCoreContractDraftReviewRecord,
  buildDeliveryRiskReceiptsDraftReviewRecord,
  buildDraftSyncReviewRecord,
  buildPlotSpecialTopicsDraftReviewRecord,
  buildReaderPayoffDraftReviewRecord,
  buildSceneCardReceiptsDraftReviewRecord,
  buildSignatureSceneDraftReviewRecord,
  buildStoryUnitDraftReviewRecord,
  buildStyleSampleDraftReviewRecord,
  } from '../../novel-writing/draft-sync-review-record'
import {
  buildProseMetaSyncReport,
} from '../../novel-writing/prose-meta'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
} from '../../novel-writing/public-payoff-scans'
import {
  buildSceneCardReceiptSyncReport,
  selectVerifiedSceneBreakdownUpdate,
} from '../../novel-writing/scene-card-execution-scans'
import {
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
} from '../../novel-writing/title-uniqueness'
import {
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildProseReviewContextPackage,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
} from '../post-delivery/core-handoff-sync-reports'
import {
  buildDeliveryRiskReceiptSyncReport,
  normalizeDeliveryRiskReceipts,
  uniqueDeliveryRiskReceipts,
} from '../post-delivery/delivery-risk-core'
import {
  buildAssetLinkageSyncReport,
  buildBeatCoolingSyncReport,
  buildBenchmarkRecallSyncReport,
  buildBridgeUnitSyncReport,
  buildChapterAttractionReviewReport,
  buildChapterBenchmarkSyncReport,
  buildChapterBlueprintSyncReport,
  buildChapterHookSyncReport,
  buildCharacterArcSyncReport,
  buildCharacterBehaviorSyncReport,
  buildConflictStructureSyncReport,
  buildContinuityHeatSyncReport,
  buildDialogueSyncReport,
  buildEmotionalArcSyncReport,
  buildExpectationThresholdSyncReport,
  buildFemaleAudienceSyncReport,
  buildGenrePositioningSyncReport,
  buildInformationFlowSyncReport,
  buildInnovationSyncReport,
  buildIntentConfirmationSyncReport,
  buildOpeningSyncReport,
  buildParagraphHookSyncReport,
  buildPlotDynamicsSyncReport,
  buildPlotSpecialTopicsSyncReport,
  buildProseCraftSyncReport,
  buildPunctuationToneSyncReport,
  buildQualityAuditSyncReport,
  buildReaderRetentionSyncReport,
  buildReversalSyncReport,
  buildRunwaySyncReport,
  buildShowdownSyncReport,
  buildSignatureSceneSyncReport,
  buildStateTrackingSyncReport,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildStoryPowerSyncReport,
  buildStoryUnitSyncReport,
  buildStyleBoundarySyncReport,
  buildStyleSampleSyncReport,
  buildSuspenseSyncReport,
  buildTargetReaderSyncReport,
  buildUpgradeRhythmSyncReport,
  buildVolumeBeatSyncReport,
} from '../post-delivery/quality-sync-reports'
import {
  buildCharacterRelationSyncReport,
} from '../quality/character-asset-contracts'
import {
  buildSourceReadinessSyncReport,
} from '../quality/state-tracking-contracts'

export async function storeDraftModeSyncReviews(args: {
  projectId: number
  project: any
  chapter: any
  updatedReviewedDraft: any
  contextPackage: any
  finalText: string
  activeWorkspace: string
  preStoreReceiptSyncContextPackage: any
  storeGeneratedReviewRecord: (record: any) => any | Promise<any>
  listNovelChapters?: (...args: any[]) => any
}) {
  const {
    projectId,
    project,
    chapter,
    contextPackage,
    finalText,
    activeWorkspace,
    preStoreReceiptSyncContextPackage,
    storeGeneratedReviewRecord,
  } = args
  const listNovelChapters = args.listNovelChapters || listNovelChaptersFromDb
  let updatedReviewedDraft = args.updatedReviewedDraft

const draftProseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftProseMetaSync,
      reviewType: 'prose_meta_sync',
      payloadKey: 'prose_meta_sync',
      formatIssue: (item: any) => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
    }))
    const draftDialogueSync = buildDialogueSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftDialogueSync, reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync', issuePrefix: '对白缺口' }))
    const draftCharacterBehaviorSync = buildCharacterBehaviorSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterBehaviorSync, reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync', issuePrefix: '角色行为缺口' }))
    const draftAssetLinkageSync = buildAssetLinkageSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftAssetLinkageSync, reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync', issuePrefix: '资产挂钩缺口' }))
    const draftStateTrackingSync = buildStateTrackingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStateTrackingSync, reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync', issuePrefix: '状态跟踪缺口' }))
    const draftSourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftSourceReadinessSync, reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync', issuePrefix: '来源就绪缺口' }))
    const draftIntentConfirmationSync = buildIntentConfirmationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftIntentConfirmationSync, reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync', issuePrefix: '意图确认缺口' }))
    const draftContinuityHeatSync = buildContinuityHeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftContinuityHeatSync, reviewType: 'continuity_heat_sync', payloadKey: 'continuity_heat_sync', issuePrefix: '连续性热度缺口' }))
    const draftConflictStructureSync = buildConflictStructureSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftConflictStructureSync, reviewType: 'conflict_structure_sync', payloadKey: 'conflict_structure_sync', issuePrefix: '冲突结构缺口' }))
    const draftUpgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftUpgradeRhythmSync, reviewType: 'upgrade_rhythm_sync', payloadKey: 'upgrade_rhythm_sync', issuePrefix: '升级节奏缺口' }))
    const draftTargetReaderSync = buildTargetReaderSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftTargetReaderSync, reviewType: 'target_reader_sync', payloadKey: 'target_reader_sync', issuePrefix: '目标读者缺口' }))
    const draftGenrePositioningSync = buildGenrePositioningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftGenrePositioningSync, reviewType: 'genre_positioning_sync', payloadKey: 'genre_positioning_sync', issuePrefix: '题材定位缺口' }))
    const draftPlotSpecialTopicsSync = buildPlotSpecialTopicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildPlotSpecialTopicsDraftReviewRecord({ projectId, chapter, sync: draftPlotSpecialTopicsSync }))
    const draftFemaleAudienceSync = buildFemaleAudienceSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftFemaleAudienceSync, reviewType: 'female_audience_sync', payloadKey: 'female_audience_sync', issuePrefix: '女频长篇缺口' }))
    const draftPlotDynamicsSync = buildPlotDynamicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftPlotDynamicsSync, reviewType: 'plot_dynamics_sync', payloadKey: 'plot_dynamics_sync', issuePrefix: '剧情动力缺口' }))
    const draftStoryPowerSync = buildStoryPowerSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryPowerSync, reviewType: 'story_power_sync', payloadKey: 'story_power_sync', issuePrefix: '故事力缺口' }))
    const draftCharacterRelationSync = buildCharacterRelationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterRelationSync, reviewType: 'character_relation_sync', payloadKey: 'character_relation_sync', issuePrefix: '角色关系缺口' }))
    const draftChapterAttractionReview = buildChapterAttractionReviewReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildChapterAttractionDraftReviewRecord({ projectId, chapter, sync: draftChapterAttractionReview }))
    const draftStoryDriveSync = buildStoryDriveSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryDriveSync, reviewType: 'story_drive_sync', payloadKey: 'story_drive_sync', issuePrefix: '故事力缺口' }))
    const draftStoryLoopSync = buildStoryLoopSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryLoopSync, reviewType: 'story_loop_sync', payloadKey: 'story_loop_sync', issuePrefix: '故事循环缺口' }))
    const draftInformationFlowSync = buildInformationFlowSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftInformationFlowSync, reviewType: 'information_flow_sync', payloadKey: 'information_flow_sync', issuePrefix: '信息流缺口' }))
    const draftEmotionalArcSync = buildEmotionalArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftEmotionalArcSync, reviewType: 'emotional_arc_sync', payloadKey: 'emotional_arc_sync', issuePrefix: '情绪弧缺口' }))
    const draftCharacterArcSync = buildCharacterArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterArcSync, reviewType: 'character_arc_sync', payloadKey: 'character_arc_sync', issuePrefix: '人物弧光缺口' }))
    const draftChapterBlueprintSync = buildChapterBlueprintSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftChapterBlueprintSync, reviewType: 'chapter_blueprint_sync', payloadKey: 'chapter_blueprint_sync', issuePrefix: '细纲缺口' }))
    const draftSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)
    await storeGeneratedReviewRecord(buildSceneCardReceiptsDraftReviewRecord({ projectId, chapter, sync: draftSceneCardReceiptSync }))
    const draftDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)
    await storeGeneratedReviewRecord(buildDeliveryRiskReceiptsDraftReviewRecord({ projectId, chapter, sync: draftDeliveryRiskReceiptSync }))
    const draftChapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftChapterBenchmarkSync, reviewType: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', issuePrefix: '未达标' }))
    const draftBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftBenchmarkRecallSync, reviewType: 'benchmark_recall_sync', payloadKey: 'benchmark_recall_sync', issuePrefix: '召回缺口' }))
    const draftStyleBoundarySync = buildStyleBoundarySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStyleBoundarySync, reviewType: 'style_boundary_sync', payloadKey: 'style_boundary_sync', issuePrefix: '文风边界缺口' }))
    const draftStyleSampleSync = buildStyleSampleSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildStyleSampleDraftReviewRecord({ projectId, chapter, sync: draftStyleSampleSync }))
    const draftInnovationSync = buildInnovationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftInnovationSync, reviewType: 'innovation_sync', payloadKey: 'innovation_sync', issuePrefix: '未兑现' }))
    const draftVolumeBeatSync = buildVolumeBeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftVolumeBeatSync, reviewType: 'volume_beat_sync', payloadKey: 'volume_beat_sync', issuePrefix: '未兑现' }))
    const draftRunwaySync = buildRunwaySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftRunwaySync,
      reviewType: 'runway_sync',
      payloadKey: 'runway_sync',
      formatIssues: sync => [
        ...sync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
        ...sync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
        ...sync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
      ],
    }))
    const draftChapters = await listNovelChapters(activeWorkspace, projectId)
    const draftChapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(draftChapters, updatedReviewedDraft || chapter)
    await storeGeneratedReviewRecord(buildChapterTitleUniquenessDraftReviewRecord({ projectId, chapter, sync: draftChapterTitleUniquenessSync }))
    const draftChapterHandoffSync = buildChapterHandoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildChapterHandoffDraftReviewRecord({ projectId, chapter, sync: draftChapterHandoffSync }))
    const draftReaderExpectationSync = buildReaderExpectationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftReaderExpectationSync,
      reviewType: 'reader_expectation_sync',
      payloadKey: 'reader_expectation_sync',
      formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
    }))
    const draftExpectationThresholdSync = buildExpectationThresholdSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftExpectationThresholdSync,
      reviewType: 'expectation_threshold_sync',
      payloadKey: 'expectation_threshold_sync',
      issuePrefix: '期待阈值缺口',
    }))
    const draftChapterHookSync = buildChapterHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftChapterHookSync,
      reviewType: 'chapter_hook_sync',
      payloadKey: 'chapter_hook_sync',
      issuePrefix: '章级钩子缺口',
    }))
    const draftParagraphHookSync = buildParagraphHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftParagraphHookSync,
      reviewType: 'paragraph_hook_sync',
      payloadKey: 'paragraph_hook_sync',
      issuePrefix: '段落钩子缺口',
    }))
    const draftSuspenseSync = buildSuspenseSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftSuspenseSync,
      reviewType: 'suspense_sync',
      payloadKey: 'suspense_sync',
      issuePrefix: '悬念缺口',
    }))
    const draftReversalSync = buildReversalSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftReversalSync,
      reviewType: 'reversal_sync',
      payloadKey: 'reversal_sync',
      issuePrefix: '反转缺口',
    }))
    const draftShowdownSync = buildShowdownSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftShowdownSync,
      reviewType: 'showdown_sync',
      payloadKey: 'showdown_sync',
      issuePrefix: '高潮缺口',
    }))
    const draftOpeningSync = buildOpeningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftOpeningSync,
      reviewType: 'opening_sync',
      payloadKey: 'opening_sync',
      issuePrefix: '开篇缺口',
    }))
    const draftProseCraftSync = buildProseCraftSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftProseCraftSync,
      reviewType: 'prose_craft_sync',
      payloadKey: 'prose_craft_sync',
      issuePrefix: '正文工艺缺口',
    }))
    const draftPunctuationToneSync = buildPunctuationToneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftPunctuationToneSync,
      reviewType: 'punctuation_tone_sync',
      payloadKey: 'punctuation_tone_sync',
      issuePrefix: '语气标点缺口',
    }))
    const draftQualityAuditSync = buildQualityAuditSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftQualityAuditSync,
      reviewType: 'quality_audit_sync',
      payloadKey: 'quality_audit_sync',
      issuePrefix: '质量诊断缺口',
    }))
    const draftPayoffSetupSync = buildPayoffSetupSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftPayoffSetupSync,
      reviewType: 'payoff_setup_sync',
      payloadKey: 'payoff_setup_sync',
      formatIssue: (item: any) => `爽点铺垫缺口：${item.label}｜${item.evidence || item.text || item.expected}`,
    }))
    const draftSpectatorReactionSync = buildSpectatorReactionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftSpectatorReactionSync,
      reviewType: 'spectator_reaction_sync',
      payloadKey: 'spectator_reaction_sync',
      formatIssue: (item: any) => `围观反应缺口：${item.label}｜${item.evidence || item.text || item.expected}`,
    }))
    const draftBridgeUnitSync = buildBridgeUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftBridgeUnitSync,
      reviewType: 'bridge_unit_sync',
      payloadKey: 'bridge_unit_sync',
      issuePrefix: '桥段缺口',
    }))
    const draftBeatCoolingSync = buildBeatCoolingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftBeatCoolingSync,
      reviewType: 'beat_cooling_sync',
      payloadKey: 'beat_cooling_sync',
      issuePrefix: '节奏冷却缺口',
    }))
    const draftReaderPayoffSync = buildReaderPayoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, {})
    await storeGeneratedReviewRecord(buildReaderPayoffDraftReviewRecord({ projectId, chapter, sync: draftReaderPayoffSync }))
    const draftReaderRetentionSync = buildReaderRetentionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
      projectId,
      chapter,
      sync: draftReaderRetentionSync,
      reviewType: 'reader_retention_sync',
      payloadKey: 'reader_retention_sync',
      formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
    }))
    const draftSignatureSceneSync = buildSignatureSceneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildSignatureSceneDraftReviewRecord({ projectId, chapter, sync: draftSignatureSceneSync }))
    const draftStoryUnitSync = buildStoryUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildStoryUnitDraftReviewRecord({ projectId, chapter, sync: draftStoryUnitSync }))
    const draftCoreDrift = buildChapterCoreDriftReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, { missed: [], forbidden_touched: [] })
    await storeGeneratedReviewRecord(buildChapterCoreDriftDraftReviewRecord({ projectId, chapter, sync: draftCoreDrift }))
    const draftCoreContractSync = buildCoreContractSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
    await storeGeneratedReviewRecord(buildCoreContractDraftReviewRecord({ projectId, chapter, sync: draftCoreContractSync }))
    
  return {
    draftProseMetaSync,
    draftDialogueSync,
    draftCharacterBehaviorSync,
    draftAssetLinkageSync,
    draftStateTrackingSync,
    draftSourceReadinessSync,
    draftIntentConfirmationSync,
    draftContinuityHeatSync,
    draftConflictStructureSync,
    draftUpgradeRhythmSync,
    draftTargetReaderSync,
    draftGenrePositioningSync,
    draftPlotSpecialTopicsSync,
    draftFemaleAudienceSync,
    draftPlotDynamicsSync,
    draftStoryPowerSync,
    draftCharacterRelationSync,
    draftChapterAttractionReview,
    draftStoryDriveSync,
    draftStoryLoopSync,
    draftInformationFlowSync,
    draftEmotionalArcSync,
    draftCharacterArcSync,
    draftChapterBlueprintSync,
    draftSceneCardReceiptSync,
    draftDeliveryRiskReceiptSync,
    draftChapterBenchmarkSync,
    draftBenchmarkRecallSync,
    draftStyleBoundarySync,
    draftStyleSampleSync,
    draftInnovationSync,
    draftVolumeBeatSync,
    draftRunwaySync,
    draftChapters,
    draftChapterTitleUniquenessSync,
    draftChapterHandoffSync,
    draftReaderExpectationSync,
    draftExpectationThresholdSync,
    draftChapterHookSync,
    draftParagraphHookSync,
    draftSuspenseSync,
    draftReversalSync,
    draftShowdownSync,
    draftOpeningSync,
    draftProseCraftSync,
    draftPunctuationToneSync,
    draftQualityAuditSync,
    draftPayoffSetupSync,
    draftSpectatorReactionSync,
    draftBridgeUnitSync,
    draftBeatCoolingSync,
    draftReaderPayoffSync,
    draftReaderRetentionSync,
    draftSignatureSceneSync,
    draftStoryUnitSync,
    draftCoreDrift,
    draftCoreContractSync,
    updatedReviewedDraft,
  }
}
