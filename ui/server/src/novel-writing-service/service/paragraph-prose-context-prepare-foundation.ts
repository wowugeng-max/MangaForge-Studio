import {
  normalizeChapterPositioningBrief,
} from '../../novel-writing/chapter-positioning-brief'
import {
  normalizeGoldenThreeBrief,
} from '../../novel-writing/golden-three-brief'
import {
  normalizeInnovationBrief,
} from '../../novel-writing/innovation-basics'
import {
  longformCompassFromContext,
  normalizeLongformCompass,
} from '../../novel-writing/longform-compass'
import {
  buildAssetLinkagePromptSection,
  buildBenchmarkRecallPromptSection,
  buildBenchmarkRecallReceiptPromptSection,
  buildBridgeUnitPromptSection,
  buildChapterBlueprintPromptSection,
  buildChapterHookPromptSection,
  buildChapterLaunchGatePromptSection,
  buildCharacterBehaviorPromptSection,
  buildCharacterRelationPromptSection,
  buildConflictStructurePromptSection,
  buildContentRubricPromptSection,
  buildContinuityHeatPromptSection,
  buildCoreContractRadarPromptSection,
  buildDeliveryRiskCarryOverPromptSection,
  buildDialoguePromptSection,
  buildEmotionalArcPromptSection,
  buildExpectationThresholdPromptSection,
  buildFemaleAudiencePromptSection,
  buildGenrePositioningPromptSection,
  buildGovernanceRecheckPromptSection,
  buildInformationFlowPromptSection,
  buildIntentConfirmationPromptSection,
  buildIntentConfirmationReceiptPromptSection,
  buildLongformBattleContextPromptSection,
  buildLongformCompassPromptSection,
  buildOpeningPromptSection,
  buildParagraphHookPromptSection,
  buildPlatformRubricPromptSection,
  buildPlotDynamicsPromptSection,
  buildPlotFrameworkPromptSection,
  buildPlotSpecialTopicsPromptSection,
  buildProseCraftPromptSection,
  buildPunctuationTonePromptSection,
  buildQualityAuditPromptSection,
  buildReversalPromptSection,
  buildShowdownPromptSection,
  buildStateTrackingPromptSection,
  buildStateTrackingReceiptPromptSection,
  buildStoryLoopPromptSection,
  buildStoryPowerPromptSection,
  buildStyleBoundaryPromptSection,
  buildSuspensePromptSection,
  buildTargetReaderPromptSection,
  buildTitleUniquenessPromptSection,
  buildUpgradeRhythmPromptSection,
  buildWritePreparationPromptSection,
} from '../../novel-writing/prose-generation-prompt-sections'
import {
  buildBoundedProsePrompt,
  buildOhStoryDirectorPromptBlock,
  buildProsePromptContextSnapshot,
  compactProseSceneCard,
  prosePromptJson,
  prosePromptText,
} from '../../novel-writing/prose-prompt-context'
import {
  buildReaderRetentionBrief,
  first30RetentionBriefFromContext,
  normalizeReaderDropRiskBrief,
} from '../../novel-writing/reader-retention-brief'
import {
  normalizeRecentFatigueBrief,
} from '../../novel-writing/rolling-rhythm-preflight'
import {
  sceneBriefFromCard,
} from '../../novel-writing/scene-briefs'
import {
  normalizePageTurnHookBrief,
  normalizeSerialRhythmBrief,
} from '../../novel-writing/serial-rhythm-brief'
import {
  normalizeSignatureSceneBrief,
} from '../../novel-writing/signature-scene-basics'
import {
  normalizeStoryDriveBrief,
} from '../../novel-writing/story-drive-brief'
import {
  normalizeStoryPressureBrief,
} from '../../novel-writing/story-pressure-brief'
import {
  buildStyleFingerprintPromptHandoff,
} from '../../novel-writing/style-fingerprint'
import {
  normalizeVolumeClimaxBrief,
} from '../../novel-writing/volume-climax-brief'
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  applyReaderExpectationDebtAging,
  normalizeReaderExpectationDebtContext,
} from '../batch-serial/serial-momentum'
import {
  buildPreviousChapterHandoff,
  normalizeBatchChapterHandoffContract,
  normalizeGovernanceRecheckMemoryContext,
} from '../post-delivery/chapter-handoff-contracts'
import {
  normalizeDeliveryRiskCarryOverContext,
} from '../post-delivery/delivery-risk-core'
import {
  characterArcBriefFromContext,
  millionWordRunwayFromContext,
  plotSpecialTopicsContractForSync,
  storyUnitContextFromContext,
} from '../post-delivery/quality-sync-reports'
import {
  normalizeSceneCardsPayload,
} from '../post-delivery/scene-cards'
import {
  buildConflictStructureContract,
  buildExpectationThresholdContract,
  buildFemaleAudienceContract,
  buildGenrePositioningContract,
  buildInformationFlowContract,
  buildQualityAuditContract,
  buildStoryLoopContract,
  buildTargetReaderContract,
  buildUpgradeRhythmContract,
} from '../quality/audience-quality-contracts'
import {
  assetText,
  buildAssetLinkageContract,
  buildCharacterBehaviorContract,
  buildCharacterRelationContract,
} from '../quality/character-asset-contracts'
import {
  buildContinuityHeatContract,
  buildDialogueContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildCoreContractRadar,
  chapterLaunchGateFromContext,
} from '../quality/core-contract-radar'
import {
  buildBridgeUnitContract,
  buildChapterHookContract,
  buildEmotionalArcContract,
  buildParagraphHookContract,
  buildReversalContract,
  buildShowdownContract,
  buildSuspenseContract,
} from '../quality/craft-tension-contracts'
import {
  benchmarkRecallGapsFromContext,
  benchmarkRecallIsNoBenchmark,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
} from '../quality/intent-benchmark-contracts'
import {
  chapterNosBrief,
  longformBattleContextFromContext,
  nextBatchBriefFromContext,
  normalizeDailyContextSnapshot,
  normalizeDailyProgressSummary,
  normalizeForeshadowingConsistencyRadar,
  normalizeLayeredMemoryContext,
  normalizeLongformBattleContext,
  normalizeLongformMemoryCapsule,
  normalizeNextBatchBrief,
} from '../quality/memory-longform-contracts'
import {
  OH_STORY_BEAT_DENSITY_RULE,
} from '../quality/outline-blueprint-contracts'
import {
  mergedContextChapterTargetPreferRuntime,
} from '../quality/paragraph-prose-context'
import {
  buildContentRubric,
  buildPlatformRubric,
} from '../quality/platform-content-rubrics'
import {
  buildOpeningContract,
  buildPlotFrameworkContract,
  buildProseCraftContract,
  buildPunctuationToneContract,
} from '../quality/plot-opening-prose-contracts'
import {
  buildStateTrackingContract,
} from '../quality/state-tracking-contracts'
import {
  buildChapterBenchmarkStrategy,
  buildStyleBoundaryContract,
  buildStyleSampleStrategy,
} from '../quality/style-sample-strategy'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  buildWritePreparationBrief,
} from '../quality/write-preparation-contracts'
import {
  prepareDefaultFiveChapterLaneFields,
} from './paragraph-prose-context-prepare-default-five'
import {
  prepareBatchMemoryFields,
} from './paragraph-prose-context-prepare-batch-memory'

export function prepareParagraphProseContextFoundation(project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) {
  if (contextPackage?.chapterTarget) {
    const mergedChapterTarget = mergedContextChapterTargetPreferRuntime(contextPackage)
    contextPackage = {
      ...contextPackage,
      chapter_target: mergedChapterTarget,
      chapterTarget: mergedChapterTarget,
    }
  }
  let chapterTarget = contextPackage?.chapter_target || {}
  const preDraftBrief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const chapterSceneCards = Array.isArray(chapterTarget.scene_cards) && chapterTarget.scene_cards.length
    ? normalizeSceneCardsPayload({ scene_cards: chapterTarget.scene_cards }, contextPackage)
    : Array.isArray(chapterTarget.sceneCards)
      ? normalizeSceneCardsPayload({ sceneCards: chapterTarget.sceneCards }, contextPackage)
      : []
  if (chapterSceneCards.length) {
    chapterTarget = {
      ...chapterTarget,
      scene_cards: chapterSceneCards,
      sceneCards: chapterSceneCards,
    }
    contextPackage = {
      ...contextPackage,
      chapter_target: chapterTarget,
      chapterTarget: contextPackage?.chapterTarget
        ? {
            ...contextPackage.chapterTarget,
            scene_cards: chapterSceneCards,
            sceneCards: chapterSceneCards,
          }
        : contextPackage?.chapterTarget,
    }
  }
  const preDraftSceneBriefs = asArray(preDraftBrief.scene_briefs || preDraftBrief.sceneBriefs)
  const sceneBriefs = chapterSceneCards.length
    ? chapterSceneCards.map(sceneBriefFromCard)
    : preDraftSceneBriefs.map(sceneBriefFromCard)
  const chapterPositioningBrief = normalizeChapterPositioningBrief(contextPackage, sceneBriefs)
  chapterTarget = {
    ...chapterTarget,
    chapter_positioning_brief: chapterPositioningBrief,
    chapterPositioningBrief,
  }
  contextPackage = {
    ...contextPackage,
    chapter_target: chapterTarget,
    chapterTarget: contextPackage?.chapterTarget
      ? {
          ...contextPackage.chapterTarget,
          chapter_positioning_brief: chapterPositioningBrief,
          chapterPositioningBrief,
        }
      : {
          ...chapterTarget,
        },
  }
  const readerRetentionBrief = chapterTarget.reader_retention_brief
    || chapterTarget.readerRetentionBrief
    || preDraftBrief.reader_retention_brief
    || preDraftBrief.readerRetentionBrief
    || buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
  const longformCompass = normalizeLongformCompass(
    longformCompassFromContext(contextPackage, preDraftBrief, chapterDraft),
  )
  const longformBattleContext = normalizeLongformBattleContext(
    longformBattleContextFromContext(contextPackage, preDraftBrief, chapterDraft),
  )
  const chapterLaunchGate = chapterLaunchGateFromContext(contextPackage, preDraftBrief, chapterDraft)
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
    contextPackage?.chapter_target?.governance_recheck_memory
    || contextPackage?.chapter_target?.governanceRecheckMemory
    || preDraftBrief.governance_recheck_memory
    || preDraftBrief.governanceRecheckMemory
    || contextPackage?.governance_recheck_memory
    || contextPackage?.governanceRecheckMemory
  )
  const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
  const nextBatchBrief = normalizeNextBatchBrief(
    nextBatchBriefFromContext(contextPackage, preDraftBrief, chapterDraft),
    Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
  )
  const {
    expansionStructureDecision,
    defaultFiveChapterLaneRedesign,
    expansionStructureVerification,
    defaultFiveChapterRegression,
    defaultFiveChapterLaneTemplate,
    defaultFiveChapterLaneTemplateRequirementLabels,
    defaultFiveChapterLaneTemplateRepairSummaries,
    defaultFiveChapterLaneTemplateRepairActions,
    defaultFiveChapterLaneTemplateRedesignSource,
    defaultFiveChapterLaneTemplateTopFailed,
    defaultFiveChapterLaneTemplateRedesignLines,
    defaultFiveChapterLaneTemplateValidationStandard,
    defaultFiveChapterLaneTemplateRequiredReceipts,
    defaultFiveChapterLaneTemplateVersionId,
    defaultFiveChapterLaneTemplateProductionRelapseCount,
    defaultFiveChapterLaneTemplateProductionRelapseReview,
    defaultFiveChapterLaneTemplateProductionRelapseChapterNos,
    defaultFiveChapterLaneTemplateProductionRelapseRestoreNos,
    defaultFiveChapterLaneTemplateProductionRelapseValidationNos,
    defaultFiveChapterLaneTemplateProductionFailureReasons,
    defaultFiveChapterLaneTemplateProductionFailedRequirements,
  } = prepareDefaultFiveChapterLaneFields(nextBatchBrief)
  const {
    batchPreflight,
    batchDeliveryRiskCarryOver,
    batchCreationContractCarryOver,
    batchChapterHandoffContract,
    longformMemoryAnchor,
    longformMemoryCapsule,
    layeredMemoryContext,
    progressSummary,
    dailyContextSnapshot,
    foreshadowingConsistencyRadar,
    millionWordRunway,
  } = prepareBatchMemoryFields({
    contextPackage,
    preDraftBrief,
    chapterDraft,
    project,
  })
  const styleSampleStrategy = contextPackage?.chapter_target?.style_sample_strategy || buildStyleSampleStrategy(project, contextPackage)
  const styleFingerprintHandoff = buildStyleFingerprintPromptHandoff(contextPackage, project, styleSampleStrategy)
  const chapterBenchmarkStrategy = contextPackage?.chapter_target?.chapter_benchmark_strategy || buildChapterBenchmarkStrategy(project, contextPackage)
  const first30RetentionBrief = first30RetentionBriefFromContext(contextPackage, preDraftBrief)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    contextPackage?.chapter_target?.reader_drop_risk_brief
    || contextPackage?.chapter_target?.readerDropRiskBrief
    || preDraftBrief.reader_drop_risk_brief
    || preDraftBrief.readerDropRiskBrief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.readerDropRiskBrief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext,
    readerRetentionBrief,
    first30RetentionBrief,
  )
  const goldenThreeBrief = normalizeGoldenThreeBrief(
    contextPackage?.chapter_target?.golden_three_brief
    || contextPackage?.chapter_target?.goldenThreeBrief
    || preDraftBrief.golden_three_brief
    || preDraftBrief.goldenThreeBrief
    || contextPackage?.golden_three_brief
    || contextPackage?.goldenThreeBrief,
    Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
  )
  const storyPressureBrief = normalizeStoryPressureBrief(
    contextPackage?.chapter_target?.story_pressure_brief
    || contextPackage?.chapter_target?.storyPressureBrief
    || preDraftBrief.story_pressure_brief
    || preDraftBrief.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    contextPackage?.chapter_target?.story_drive_brief
    || contextPackage?.chapter_target?.storyDriveBrief
    || preDraftBrief.story_drive_brief
    || preDraftBrief.storyDriveBrief
    || contextPackage,
    chapterSceneCards.length ? chapterSceneCards : sceneBriefs,
  )
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    contextPackage?.chapter_target?.serial_rhythm_brief
    || contextPackage?.chapter_target?.serialRhythmBrief
    || preDraftBrief.serial_rhythm_brief
    || preDraftBrief.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief,
    sceneBriefs,
    readerRetentionBrief,
    contextPackage?.chapter_target?.word_target,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    contextPackage?.chapter_target?.page_turn_hook_brief
    || contextPackage?.chapter_target?.pageTurnHookBrief
    || preDraftBrief.page_turn_hook_brief
    || preDraftBrief.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief,
    contextPackage?.chapter_target || {},
    sceneBriefs,
    readerRetentionBrief,
    storyDriveBrief,
  )

  return {
    contextPackage,
    chapterTarget,
    preDraftBrief,
    chapterSceneCards,
    preDraftSceneBriefs,
    sceneBriefs,
    chapterPositioningBrief,
    readerRetentionBrief,
    longformCompass,
    longformBattleContext,
    chapterLaunchGate,
    governanceRecheckMemory,
    coreContractRadar,
    nextBatchBrief,
    styleSampleStrategy,
    styleFingerprintHandoff,
    chapterBenchmarkStrategy,
    first30RetentionBrief,
    readerDropRiskBrief,
    goldenThreeBrief,
    storyPressureBrief,
    storyDriveBrief,
    serialRhythmBrief,
    pageTurnHookBrief,
    expansionStructureDecision,
    defaultFiveChapterLaneRedesign,
    expansionStructureVerification,
    defaultFiveChapterRegression,
    defaultFiveChapterLaneTemplate,
    defaultFiveChapterLaneTemplateRequirementLabels,
    defaultFiveChapterLaneTemplateRepairSummaries,
    defaultFiveChapterLaneTemplateRepairActions,
    defaultFiveChapterLaneTemplateRedesignSource,
    defaultFiveChapterLaneTemplateTopFailed,
    defaultFiveChapterLaneTemplateRedesignLines,
    defaultFiveChapterLaneTemplateValidationStandard,
    defaultFiveChapterLaneTemplateRequiredReceipts,
    defaultFiveChapterLaneTemplateVersionId,
    defaultFiveChapterLaneTemplateProductionRelapseCount,
    defaultFiveChapterLaneTemplateProductionRelapseReview,
    defaultFiveChapterLaneTemplateProductionRelapseChapterNos,
    defaultFiveChapterLaneTemplateProductionRelapseRestoreNos,
    defaultFiveChapterLaneTemplateProductionRelapseValidationNos,
    defaultFiveChapterLaneTemplateProductionFailureReasons,
    defaultFiveChapterLaneTemplateProductionFailedRequirements,
    batchPreflight,
    batchDeliveryRiskCarryOver,
    batchCreationContractCarryOver,
    batchChapterHandoffContract,
    longformMemoryAnchor,
    longformMemoryCapsule,
    layeredMemoryContext,
    progressSummary,
    dailyContextSnapshot,
    foreshadowingConsistencyRadar,
    millionWordRunway,
  }
}
