import {
  buildPostDeliveryStoryStateUpdate,
} from '../../novel-writing/post-delivery-story-state-update'
import {
  buildProseMetaSyncReport,
} from '../../novel-writing/prose-meta'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
} from '../../novel-writing/public-payoff-scans'
import {
  buildSceneCardReceiptSyncReport,
} from '../../novel-writing/scene-card-execution-scans'
import {
  buildChapterTitleUniquenessSyncReport,
} from '../../novel-writing/title-uniqueness'
import {
  buildArtifactProtocolReceiptSyncReport,
} from './artifact-protocol'
import {
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
} from './core-handoff-sync-reports'
import {
  buildDeliveryRiskReceiptSyncReport,
} from './delivery-risk-core'
import {
  buildAssetLinkageSyncReport,
  buildBeatCoolingSyncReport,
  buildBenchmarkRecallSyncReport,
  buildBridgeUnitSyncReport,
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
  buildStateTrackingSyncReport,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildStoryPowerSyncReport,
  buildStyleBoundarySyncReport,
  buildStyleSampleSyncReport,
  buildSuspenseSyncReport,
  buildTargetReaderSyncReport,
  buildUpgradeRhythmSyncReport,
} from './quality-sync-reports'
import {
  buildCharacterRelationSyncReport,
} from '../quality/character-asset-contracts'
import {
  buildSourceReadinessSyncReport,
} from '../quality/state-tracking-contracts'

/** Build post-commit story-state sync payload after full production acceptance. */
export function buildPostCommitStoryStateSyncUpdate(args: {
  project: any
  chapter: any
  contextPackage: any
  chapterText: string
  preStoreReceiptSyncContextPackage: any
  finalReviewContextPackage: any
  generationChapters: any[]
  storyStateUpdate: any
  proseRevisionReceiptSync: any
  deslopRepairReceiptSync: any
  qualityAuditRepairReceiptSync: any
  nextChapterQualityPlanReceiptSync: any
  statusFilterReceiptSync: any
  writePreparationReceiptSync: any
  revisionContextReceiptSync: any
  revisionCascadeImpactSync: any
  revisionScopeGuardSync: any
  deterministicProseCleanup: any
}) {
  const project = args.project
  const updated = args.chapter
  const contextPackage = args.contextPackage
  const finalText = args.chapterText
  const preStoreReceiptSyncContextPackage = args.preStoreReceiptSyncContextPackage
  const finalReviewContextPackage = args.finalReviewContextPackage
  const generationChapters = args.generationChapters
  const story_state_update: any = args.storyStateUpdate || {}
  const {
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    nextChapterQualityPlanReceiptSync,
    statusFilterReceiptSync,
    writePreparationReceiptSync,
    revisionContextReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
  } = args

  const proseMetaSync = buildProseMetaSyncReport(project, updated, contextPackage, finalText)
  const chapterBlueprintSync = buildChapterBlueprintSyncReport(project, updated, contextPackage, finalText)
  const chapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(generationChapters, updated)
  const dialogueSync = buildDialogueSyncReport(project, updated, contextPackage, finalText)
  const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, updated, contextPackage, finalText)
  const sceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
  const deliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
  const artifactProtocolReceiptSync = buildArtifactProtocolReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
  const assetLinkageSync = buildAssetLinkageSyncReport(project, updated, contextPackage, finalText)
  const stateTrackingSync = buildStateTrackingSyncReport(project, updated, contextPackage, finalText)
  const chapterHandoffSync = buildChapterHandoffSyncReport(project, updated, contextPackage, finalText)
  const proseCraftSync = buildProseCraftSyncReport(project, updated, contextPackage, finalText)
  const punctuationToneSync = buildPunctuationToneSyncReport(project, updated, contextPackage, finalText)
  const payoffSetupSync = buildPayoffSetupSyncReport(project, updated, contextPackage, finalText)
  const spectatorReactionSync = buildSpectatorReactionSyncReport(project, updated, contextPackage, finalText)
  const sourceReadinessSync = buildSourceReadinessSyncReport(project, updated, finalReviewContextPackage, finalText)
  const intentConfirmationSync = buildIntentConfirmationSyncReport(project, updated, finalReviewContextPackage, finalText)
  const benchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updated, finalReviewContextPackage, finalText)
  const styleSampleSync = buildStyleSampleSyncReport(project, updated, finalReviewContextPackage, finalText)
  const storyLoopSync = buildStoryLoopSyncReport(project, updated, contextPackage, finalText)
  const informationFlowSync = buildInformationFlowSyncReport(project, updated, contextPackage, finalText)
  const expectationThresholdSync = buildExpectationThresholdSyncReport(project, updated, contextPackage, finalText)
  const emotionalArcSync = buildEmotionalArcSyncReport(project, updated, contextPackage, finalText)
  const chapterHookSync = buildChapterHookSyncReport(project, updated, contextPackage, finalText)
  const paragraphHookSync = buildParagraphHookSyncReport(project, updated, contextPackage, finalText)
  const suspenseSync = buildSuspenseSyncReport(project, updated, contextPackage, finalText)
  const reversalSync = buildReversalSyncReport(project, updated, contextPackage, finalText)
  const showdownSync = buildShowdownSyncReport(project, updated, contextPackage, finalText)
  const openingSync = buildOpeningSyncReport(project, updated, contextPackage, finalText)
  const bridgeUnitSync = buildBridgeUnitSyncReport(project, updated, contextPackage, finalText)
  const continuityHeatSync = buildContinuityHeatSyncReport(project, updated, contextPackage, finalText)
  const conflictStructureSync = buildConflictStructureSyncReport(project, updated, contextPackage, finalText)
  const upgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updated, contextPackage, finalText)
  const targetReaderSync = buildTargetReaderSyncReport(project, updated, contextPackage, finalText)
  const genrePositioningSync = buildGenrePositioningSyncReport(project, updated, contextPackage, finalText)
  const plotSpecialTopicsSync = buildPlotSpecialTopicsSyncReport(project, updated, contextPackage, finalText)
  const femaleAudienceSync = buildFemaleAudienceSyncReport(project, updated, contextPackage, finalText)
  const plotDynamicsSync = buildPlotDynamicsSyncReport(project, updated, contextPackage, finalText)
  const storyPowerSync = buildStoryPowerSyncReport(project, updated, contextPackage, finalText)
  const characterRelationSync = buildCharacterRelationSyncReport(project, updated, contextPackage, finalText)
  const readerRetentionSync = buildReaderRetentionSyncReport(project, updated, contextPackage, finalText)
  const coreContractSync = buildCoreContractSyncReport(project, updated, contextPackage, finalText)
  const storyDriveSync = buildStoryDriveSyncReport(project, updated, contextPackage, finalText)
  const characterArcSync = buildCharacterArcSyncReport(project, updated, contextPackage, finalText)
  const styleBoundarySync = buildStyleBoundarySyncReport(project, updated, contextPackage, finalText)
  const innovationSync = buildInnovationSyncReport(project, updated, contextPackage, finalText)
  const runwaySync = buildRunwaySyncReport(project, updated, contextPackage, finalText)
  const readerExpectationSync = buildReaderExpectationSyncReport(project, updated, contextPackage, finalText)
  const qualityAuditSync = buildQualityAuditSyncReport(project, updated, contextPackage, finalText)
  const beatCoolingSync = buildBeatCoolingSyncReport(project, updated, contextPackage, finalText)
  const readerPayoffSync = buildReaderPayoffSyncReport(project, updated, contextPackage, finalText, story_state_update)

  return buildPostDeliveryStoryStateUpdate(story_state_update, {
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    nextChapterQualityPlanReceiptSync,
    statusFilterReceiptSync,
    writePreparationReceiptSync,
    revisionContextReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
    proseMetaSync,
    chapterBlueprintSync,
    chapterTitleUniquenessSync,
    dialogueSync,
    characterBehaviorSync,
    sceneCardReceiptSync,
    deliveryRiskReceiptSync,
    artifactProtocolReceiptSync,
    assetLinkageSync,
    stateTrackingSync,
    chapterHandoffSync,
    proseCraftSync,
    punctuationToneSync,
    payoffSetupSync,
    spectatorReactionSync,
    sourceReadinessSync,
    intentConfirmationSync,
    benchmarkRecallSync,
    styleSampleSync,
    storyLoopSync,
    informationFlowSync,
    expectationThresholdSync,
    emotionalArcSync,
    chapterHookSync,
    paragraphHookSync,
    suspenseSync,
    reversalSync,
    showdownSync,
    openingSync,
    bridgeUnitSync,
    continuityHeatSync,
    conflictStructureSync,
    upgradeRhythmSync,
    targetReaderSync,
    genrePositioningSync,
    plotSpecialTopicsSync,
    femaleAudienceSync,
    plotDynamicsSync,
    storyPowerSync,
    characterRelationSync,
    readerRetentionSync,
    coreContractSync,
    storyDriveSync,
    characterArcSync,
    styleBoundarySync,
    innovationSync,
    runwaySync,
    readerExpectationSync,
    qualityAuditSync,
    beatCoolingSync,
    readerPayoffSync,
  })
}
