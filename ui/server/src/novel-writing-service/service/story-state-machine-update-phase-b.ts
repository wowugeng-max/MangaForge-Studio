import {
  createNovelReview as persistNovelReview,
  listNovelChapterSettingUsage,
  listNovelChapters,
  listNovelCharacters,
  listNovelSettingEntities,
  mergeNovelChapterRawPayload,
  updateNovelChapterSettingUsage,
  updateNovelCharacter,
  updateNovelProject,
  updateNovelSettingEntity,
} from '../../novel'
import {
  buildAssetIntakeReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
  buildStoryStateReviewRecord,
  buildStorylineSyncReviewRecord,
} from '../../novel-writing/post-delivery-sync-review-record'
import {
  blockingPreparedStoryStateHardFailures,
  buildPreparedStoryStateHardFailures,
  formatPreparedStoryStateFailureSummary,
} from '../../novel-writing/prepared-story-state'
import {
  buildProseMetaSyncReport,
} from '../../novel-writing/prose-meta'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
} from '../../novel-writing/public-payoff-scans'
import {
  buildStoryStatePrompt as buildStoryStatePromptFromBuilder,
} from '../../novel-writing/story-state-prompt'
import {
  buildStyleFingerprintStateSnapshot,
} from '../../novel-writing/style-fingerprint'
import {
  buildChapterTitleUniquenessSyncReport,
} from '../../novel-writing/title-uniqueness'
import {
  hasProseTransportIncompleteDetails,
  rejectedProseTransportFinishReason,
} from '../quality/prose-transport-admission'
import {
  asArray,
  buildLLMResultDiagnostics,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
} from '../post-delivery/asset-banks'
import {
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
} from '../post-delivery/core-handoff-sync-reports'
import {
  buildAssetStateDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildStateDeltaCompletenessReport,
  buildStorylineSyncReport,
  buildTimelineDeltaSyncReport,
} from '../post-delivery/delta-sync-reports'
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
import {
  throwIfAborted,
} from './runtime-helpers'
import {
  mergeStoryState,
  normalizeStoryStateDeltaForStorage,
} from './story-state-helpers'



export async function applyStoryStateMachineSyncPhaseB(args: {
  activeWorkspace: string
  project: any
  chapter: any
  contextPackage: any
  chapterText: string
  payload: any
  saveDerivedReview?: (activeWorkspace: string, record: any) => Promise<any>
}) {
  const { activeWorkspace, project, chapter, contextPackage, chapterText, payload } = args
  const createNovelReview = args.saveDerivedReview || persistNovelReview
  const proseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: proseMetaSync,
    reviewType: 'prose_meta_sync',
    payloadKey: 'prose_meta_sync',
    formatIssue: (item: any) => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
  }))
  payload.prose_meta_sync = proseMetaSync
  const dialogueSync = buildDialogueSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync', issuePrefix: '对白缺口' }))
  payload.dialogue_sync = dialogueSync
  const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync', issuePrefix: '角色行为缺口' }))
  payload.character_behavior_sync = characterBehaviorSync
  const assetLinkageSync = buildAssetLinkageSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync', issuePrefix: '资产挂钩缺口' }))
  payload.asset_linkage_sync = assetLinkageSync
  const stateTrackingSync = buildStateTrackingSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync', issuePrefix: '状态跟踪缺口' }))
  payload.state_tracking_sync = stateTrackingSync
  const sourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync', issuePrefix: '来源就绪缺口' }))
  payload.source_readiness_sync = sourceReadinessSync
  const intentConfirmationSync = buildIntentConfirmationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync', issuePrefix: '意图确认缺口' }))
  payload.intent_confirmation_sync = intentConfirmationSync
  const continuityHeatSync = buildContinuityHeatSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync', payloadKey: 'continuity_heat_sync', issuePrefix: '连续性热度缺口' }))
  payload.continuity_heat_sync = continuityHeatSync
  const conflictStructureSync = buildConflictStructureSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync', payloadKey: 'conflict_structure_sync', issuePrefix: '冲突结构缺口' }))
  payload.conflict_structure_sync = conflictStructureSync
  const upgradeRhythmSync = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync', payloadKey: 'upgrade_rhythm_sync', issuePrefix: '升级节奏缺口' }))
  payload.upgrade_rhythm_sync = upgradeRhythmSync
  const targetReaderSync = buildTargetReaderSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync', payloadKey: 'target_reader_sync', issuePrefix: '目标读者缺口' }))
  payload.target_reader_sync = targetReaderSync
  const genrePositioningSync = buildGenrePositioningSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync', payloadKey: 'genre_positioning_sync', issuePrefix: '题材定位缺口' }))
  payload.genre_positioning_sync = genrePositioningSync
  const femaleAudienceSync = buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync', payloadKey: 'female_audience_sync', issuePrefix: '女频长篇缺口' }))
  payload.female_audience_sync = femaleAudienceSync
  const plotDynamicsSync = buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync', payloadKey: 'plot_dynamics_sync', issuePrefix: '剧情动力缺口' }))
  payload.plot_dynamics_sync = plotDynamicsSync
  const storyPowerSync = buildStoryPowerSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync', payloadKey: 'story_power_sync', issuePrefix: '故事力缺口' }))
  payload.story_power_sync = storyPowerSync
  const characterRelationSync = buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync', payloadKey: 'character_relation_sync', issuePrefix: '角色关系缺口' }))
  payload.character_relation_sync = characterRelationSync
  const chapterAttractionReview = buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review', payloadKey: 'chapter_attraction_review', formatIssues: sync => sync.weak_dimensions.map((item: any) => `${item.label}｜${item.issue}`) }))
  payload.chapter_attraction_review = chapterAttractionReview
  const storyDriveSync = buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync', payloadKey: 'story_drive_sync', issuePrefix: '故事力缺口' }))
  payload.story_drive_sync = storyDriveSync
  const storyLoopSync = buildStoryLoopSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync', payloadKey: 'story_loop_sync', issuePrefix: '故事循环缺口' }))
  payload.story_loop_sync = storyLoopSync
  const informationFlowSync = buildInformationFlowSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync', payloadKey: 'information_flow_sync', issuePrefix: '信息流缺口' }))
  payload.information_flow_sync = informationFlowSync
  const emotionalArcSync = buildEmotionalArcSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync', payloadKey: 'emotional_arc_sync', issuePrefix: '情绪弧缺口' }))
  payload.emotional_arc_sync = emotionalArcSync
  const characterArcSync = buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync', payloadKey: 'character_arc_sync', issuePrefix: '人物弧光缺口' }))
  payload.character_arc_sync = characterArcSync
  const chapterBlueprintSync = buildChapterBlueprintSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync', payloadKey: 'chapter_blueprint_sync', issuePrefix: '细纲缺口' }))
  payload.chapter_blueprint_sync = chapterBlueprintSync
  const chapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', issuePrefix: '未达标' }))
  payload.chapter_benchmark_sync = chapterBenchmarkSync
  const benchmarkRecallSync = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync', payloadKey: 'benchmark_recall_sync', issuePrefix: '召回缺口' }))
  payload.benchmark_recall_sync = benchmarkRecallSync
  const styleBoundarySync = buildStyleBoundarySyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync', payloadKey: 'style_boundary_sync', issuePrefix: '文风边界缺口' }))
  payload.style_boundary_sync = styleBoundarySync
  const styleSampleSync = buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: styleSampleSync,
    reviewType: 'style_sample_sync',
    payloadKey: 'style_sample_sync',
    formatIssues: sync => [
      ...sync.missed.map((item: any) => `风格缺口：${item.label}｜${item.text}`),
      ...sync.copied_phrases.map((item: any) => `照搬风险：${item}`),
    ],
  }))
  payload.style_sample_sync = styleSampleSync
  const innovationSync = buildInnovationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync', payloadKey: 'innovation_sync', issuePrefix: '未兑现' }))
  payload.innovation_sync = innovationSync
  const volumeBeatSync = buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync', payloadKey: 'volume_beat_sync', issuePrefix: '未兑现' }))
  payload.volume_beat_sync = volumeBeatSync
  const runwaySync = buildRunwaySyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: runwaySync,
    reviewType: 'runway_sync',
    payloadKey: 'runway_sync',
    formatIssues: sync => [
      ...sync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
      ...sync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
      ...sync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
    ],
  }))
  payload.runway_sync = runwaySync
  await createNovelReview(activeWorkspace, buildStoryStateReviewRecord({ projectId: project.id, chapter, payload }))
  return payload
}
