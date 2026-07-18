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

export function prepareParagraphProseContext(project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) {
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
  const chapterBlueprint = contextPackage?.chapter_target?.chapter_blueprint
    || contextPackage?.chapter_target?.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || contextPackage?.pre_draft_brief?.chapterBlueprint
    || contextPackage?.preDraftBrief?.chapter_blueprint
    || contextPackage?.preDraftBrief?.chapterBlueprint
    || null
  const beatDensityContract = chapterBlueprint?.beat_density_contract || chapterBlueprint?.beatDensityContract || null
  const smallOutlineContract = chapterBlueprint?.small_outline_contract || chapterBlueprint?.smallOutlineContract || null
  const outlineMethodsContract = chapterBlueprint?.outline_methods_contract || chapterBlueprint?.outlineMethodsContract || null
  const mainlineDefinitionContract = chapterBlueprint?.mainline_definition_contract
    || chapterBlueprint?.mainlineDefinitionContract
    || contextPackage?.chapter_target?.mainline_definition_contract
    || contextPackage?.chapter_target?.mainlineDefinitionContract
    || contextPackage?.mainline_definition_contract
    || contextPackage?.mainlineDefinitionContract
    || contextPackage?.pre_draft_brief?.mainline_definition_contract
    || contextPackage?.preDraftBrief?.mainlineDefinitionContract
    || null
  const skipBenchmarkRecall = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  }))
  const benchmarkRecallBrief = skipBenchmarkRecall
    ? null
    : contextPackage?.chapter_target?.benchmark_recall_brief
      || contextPackage?.benchmark_recall_brief
      || contextPackage?.pre_draft_brief?.benchmark_recall_brief
      || buildBenchmarkRecallBrief(contextPackage, {
        chapter_blueprint: chapterBlueprint,
        style_sample_strategy: styleSampleStrategy,
        chapter_benchmark_strategy: chapterBenchmarkStrategy,
      })
  const styleBoundaryContract = contextPackage?.chapter_target?.style_boundary_contract
    || contextPackage?.style_boundary_contract
    || contextPackage?.pre_draft_brief?.style_boundary_contract
    || buildStyleBoundaryContract(project, contextPackage, {
      style_sample_strategy: styleSampleStrategy,
      chapter_benchmark_strategy: chapterBenchmarkStrategy,
      benchmark_recall_brief: benchmarkRecallBrief,
    })
  const platformRubric = contextPackage?.chapter_target?.platform_rubric
    || contextPackage?.platform_rubric
    || contextPackage?.pre_draft_brief?.platform_rubric
    || buildPlatformRubric(project, contextPackage)
  const contentRubric = contextPackage?.chapter_target?.content_rubric
    || contextPackage?.content_rubric
    || contextPackage?.pre_draft_brief?.content_rubric
    || buildContentRubric(contextPackage)
  const targetReaderContract = contextPackage?.chapter_target?.target_reader_contract
    || contextPackage?.target_reader_contract
    || contextPackage?.pre_draft_brief?.target_reader_contract
    || buildTargetReaderContract(project, contextPackage)
  const genrePositioningContract = contextPackage?.chapter_target?.genre_positioning_contract
    || contextPackage?.genre_positioning_contract
    || contextPackage?.pre_draft_brief?.genre_positioning_contract
    || buildGenrePositioningContract(project, contextPackage)
  const plotSpecialTopicsContract = contextPackage?.chapter_target?.plot_special_topics_contract
    || contextPackage?.plot_special_topics_contract
    || contextPackage?.pre_draft_brief?.plot_special_topics_contract
    || plotSpecialTopicsContractForSync(project, contextPackage)
  const femaleAudienceContract = contextPackage?.chapter_target?.female_audience_contract
    || contextPackage?.female_audience_contract
    || contextPackage?.pre_draft_brief?.female_audience_contract
    || buildFemaleAudienceContract(project, contextPackage)
  const upgradeRhythmContract = contextPackage?.chapter_target?.upgrade_rhythm_contract
    || contextPackage?.upgrade_rhythm_contract
    || contextPackage?.pre_draft_brief?.upgrade_rhythm_contract
    || buildUpgradeRhythmContract(project, contextPackage)
  const conflictStructureContract = contextPackage?.chapter_target?.conflict_structure_contract
    || contextPackage?.conflict_structure_contract
    || contextPackage?.pre_draft_brief?.conflict_structure_contract
    || buildConflictStructureContract(project, contextPackage)
  const storyLoopContract = contextPackage?.chapter_target?.story_loop_contract
    || contextPackage?.story_loop_contract
    || contextPackage?.pre_draft_brief?.story_loop_contract
    || buildStoryLoopContract(project, contextPackage)
  const emotionalArcContract = contextPackage?.chapter_target?.emotional_arc_contract
    || contextPackage?.emotional_arc_contract
    || contextPackage?.pre_draft_brief?.emotional_arc_contract
    || buildEmotionalArcContract(project, contextPackage)
  const chapterHookContract = contextPackage?.chapter_target?.chapter_hook_contract
    || contextPackage?.chapter_hook_contract
    || contextPackage?.pre_draft_brief?.chapter_hook_contract
    || buildChapterHookContract(project, contextPackage)
  const paragraphHookContract = contextPackage?.chapter_target?.paragraph_hook_contract
    || contextPackage?.paragraph_hook_contract
    || contextPackage?.pre_draft_brief?.paragraph_hook_contract
    || buildParagraphHookContract(project, contextPackage)
  const suspenseContract = contextPackage?.chapter_target?.suspense_contract
    || contextPackage?.suspense_contract
    || contextPackage?.pre_draft_brief?.suspense_contract
    || buildSuspenseContract(project, contextPackage)
  const reversalContract = contextPackage?.chapter_target?.reversal_contract
    || contextPackage?.reversal_contract
    || contextPackage?.pre_draft_brief?.reversal_contract
    || buildReversalContract(project, contextPackage)
  const showdownContract = contextPackage?.chapter_target?.showdown_contract
    || contextPackage?.showdown_contract
    || contextPackage?.pre_draft_brief?.showdown_contract
    || buildShowdownContract(project, contextPackage)
  const bridgeUnitContract = contextPackage?.chapter_target?.bridge_unit_contract
    || contextPackage?.bridge_unit_contract
    || contextPackage?.pre_draft_brief?.bridge_unit_contract
    || buildBridgeUnitContract(project, contextPackage)
  const plotFrameworkContract = contextPackage?.chapter_target?.plot_framework_contract
    || contextPackage?.plot_framework_contract
    || contextPackage?.pre_draft_brief?.plot_framework_contract
    || buildPlotFrameworkContract(project, contextPackage, {
      showdown_contract: showdownContract,
      bridge_unit_contract: bridgeUnitContract,
      suspense_contract: suspenseContract,
      conflict_structure_contract: conflictStructureContract,
    })
  const openingContract = contextPackage?.chapter_target?.opening_contract
    || contextPackage?.opening_contract
    || contextPackage?.pre_draft_brief?.opening_contract
    || buildOpeningContract(project, contextPackage)
  const proseCraftContract = contextPackage?.chapter_target?.prose_craft_contract
    || contextPackage?.prose_craft_contract
    || contextPackage?.pre_draft_brief?.prose_craft_contract
    || buildProseCraftContract(project, contextPackage)
  const punctuationToneContract = contextPackage?.chapter_target?.punctuation_tone_contract
    || contextPackage?.punctuation_tone_contract
    || contextPackage?.pre_draft_brief?.punctuation_tone_contract
    || buildPunctuationToneContract(project, contextPackage)
  const qualityAuditContract = contextPackage?.chapter_target?.quality_audit_contract
    || contextPackage?.quality_audit_contract
    || contextPackage?.pre_draft_brief?.quality_audit_contract
    || buildQualityAuditContract(project, contextPackage)
  const dialogueContract = contextPackage?.chapter_target?.dialogue_contract
    || contextPackage?.dialogue_contract
    || contextPackage?.pre_draft_brief?.dialogue_contract
    || buildDialogueContract(contextPackage)
  const plotDynamicsContract = contextPackage?.chapter_target?.plot_dynamics_contract
    || contextPackage?.plot_dynamics_contract
    || contextPackage?.pre_draft_brief?.plot_dynamics_contract
    || buildPlotDynamicsContract(contextPackage)
  const storyPowerContract = contextPackage?.chapter_target?.story_power_contract
    || contextPackage?.story_power_contract
    || contextPackage?.pre_draft_brief?.story_power_contract
    || buildStoryPowerContract(project, contextPackage)
  const continuityHeatContract = contextPackage?.chapter_target?.continuity_heat_contract
    || contextPackage?.continuity_heat_contract
    || contextPackage?.pre_draft_brief?.continuity_heat_contract
    || buildContinuityHeatContract(contextPackage)
  const characterRelationContract = contextPackage?.chapter_target?.character_relation_contract
    || contextPackage?.character_relation_contract
    || contextPackage?.pre_draft_brief?.character_relation_contract
    || buildCharacterRelationContract(contextPackage)
  const characterBehaviorContract = contextPackage?.chapter_target?.character_behavior_contract
    || contextPackage?.character_behavior_contract
    || contextPackage?.pre_draft_brief?.character_behavior_contract
    || buildCharacterBehaviorContract(contextPackage)
  const assetLinkageContract = contextPackage?.chapter_target?.asset_linkage_contract
    || contextPackage?.asset_linkage_contract
    || contextPackage?.pre_draft_brief?.asset_linkage_contract
    || buildAssetLinkageContract(contextPackage)
  const assetRelationshipGraphRisks = asArray(
    assetLinkageContract?.relationship_graph_risks
      || assetLinkageContract?.relationshipGraphRisks,
  ).map(assetText).filter(Boolean)
  const stateTrackingContract = contextPackage?.chapter_target?.state_tracking_contract
    || contextPackage?.state_tracking_contract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || buildStateTrackingContract(contextPackage)
  const intentConfirmationContract = contextPackage?.chapter_target?.intent_confirmation_contract
    || contextPackage?.intent_confirmation_contract
    || contextPackage?.pre_draft_brief?.intent_confirmation_contract
    || buildIntentConfirmationContract(contextPackage, {
      chapter_blueprint: chapterBlueprint,
      state_tracking_contract: stateTrackingContract,
    })
  const informationFlowContract = contextPackage?.chapter_target?.information_flow_contract
    || contextPackage?.information_flow_contract
    || contextPackage?.pre_draft_brief?.information_flow_contract
    || buildInformationFlowContract(contextPackage)
  const expectationThresholdContract = contextPackage?.chapter_target?.expectation_threshold_contract
    || contextPackage?.expectation_threshold_contract
    || contextPackage?.pre_draft_brief?.expectation_threshold_contract
    || buildExpectationThresholdContract(contextPackage)
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    contextPackage?.chapter_target?.volume_climax_brief
    || contextPackage?.chapter_target?.volumeClimaxBrief
    || contextPackage?.chapter_target?.volume_beat_brief
    || contextPackage?.chapter_target?.volumeBeatBrief
    || preDraftBrief.volume_climax_brief
    || preDraftBrief.volumeClimaxBrief
    || preDraftBrief.volume_beat_brief
    || preDraftBrief.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget,
    contextPackage?.chapter_target || {},
    contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
  )
  const recentFatigueBrief = normalizeRecentFatigueBrief(
    contextPackage?.chapter_target?.recent_fatigue_brief
    || contextPackage?.chapter_target?.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_radar
    || contextPackage?.chapter_target?.recentFatigueRadar
    || preDraftBrief.recent_fatigue_brief
    || preDraftBrief.recentFatigueBrief
    || preDraftBrief.recent_fatigue_radar
    || preDraftBrief.recentFatigueRadar
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar,
  )
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapter_target?.deliveryRiskCarryOver
    || preDraftBrief.delivery_risk_carry_over
    || preDraftBrief.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  )
  const writePreparationBrief = contextPackage?.chapter_target?.write_preparation_brief
    || contextPackage?.chapter_target?.writePreparationBrief
    || contextPackage?.write_preparation_brief
    || contextPackage?.writePreparationBrief
    || contextPackage?.pre_draft_brief?.write_preparation_brief
    || contextPackage?.preDraftBrief?.writePreparationBrief
    || buildWritePreparationBrief(contextPackage, {
      chapter_blueprint: chapterBlueprint,
      reader_retention_brief: readerRetentionBrief,
      asset_linkage_contract: assetLinkageContract,
      state_tracking_contract: stateTrackingContract,
      delivery_risk_carry_over: deliveryRiskCarryOver,
      recent_fatigue_brief: recentFatigueBrief,
      batch_preflight: contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight,
      benchmark_recall_brief: benchmarkRecallBrief,
      plot_special_topics_contract: plotSpecialTopicsContract,
    })
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(
      contextPackage?.chapter_target?.reader_expectation_debt_context
      || contextPackage?.chapter_target?.readerExpectationDebtContext
      || preDraftBrief.reader_expectation_debt
      || preDraftBrief.readerExpectationDebt
      || preDraftBrief.reader_expectation_debt_context
      || preDraftBrief.readerExpectationDebtContext
      || contextPackage?.reader_expectation_debt_context,
    ),
    Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
  )
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)
  const storyUnitContext = storyUnitContextFromContext(contextPackage, chapterDraft)
  const signatureSceneBrief = normalizeSignatureSceneBrief(
    contextPackage?.chapter_target?.signature_scene_brief
    || contextPackage?.chapter_target?.signatureSceneBrief
    || preDraftBrief.signature_scene_brief
    || preDraftBrief.signatureSceneBrief
    || contextPackage?.signature_scene_brief
    || contextPackage?.signatureSceneBrief
    || contextPackage?.chapter_target?.rollingPlan
    || contextPackage?.chapter_target?.rolling_plan,
  )
  const innovationBrief = normalizeInnovationBrief(
    contextPackage?.chapter_target?.innovation_brief
    || contextPackage?.chapter_target?.innovationBrief
    || preDraftBrief.innovation_brief
    || preDraftBrief.innovationBrief
    || contextPackage?.innovation_brief
    || contextPackage?.innovationBrief,
  )
  const characterArcBrief = characterArcBriefFromContext(contextPackage, chapterDraft)
  const titleUniquenessReport = contextPackage?.chapter_target?.title_uniqueness_report || null
  const duplicateTitleRows = asArray(titleUniquenessReport?.duplicates)
    .map((item: any) => `第${item?.chapter_no || '?'}章《${item?.title || '无标题'}》`)
    .filter(Boolean)
  const ohStoryDirectorPromptBlock = buildOhStoryDirectorPromptBlock(contextPackage)
  return {
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
    chapterBlueprint,
    beatDensityContract,
    smallOutlineContract,
    outlineMethodsContract,
    mainlineDefinitionContract,
    skipBenchmarkRecall,
    benchmarkRecallBrief,
    styleBoundaryContract,
    platformRubric,
    contentRubric,
    targetReaderContract,
    genrePositioningContract,
    plotSpecialTopicsContract,
    femaleAudienceContract,
    upgradeRhythmContract,
    conflictStructureContract,
    storyLoopContract,
    emotionalArcContract,
    chapterHookContract,
    paragraphHookContract,
    suspenseContract,
    reversalContract,
    showdownContract,
    bridgeUnitContract,
    plotFrameworkContract,
    openingContract,
    proseCraftContract,
    punctuationToneContract,
    qualityAuditContract,
    dialogueContract,
    plotDynamicsContract,
    storyPowerContract,
    continuityHeatContract,
    characterRelationContract,
    characterBehaviorContract,
    assetLinkageContract,
    assetRelationshipGraphRisks,
    stateTrackingContract,
    intentConfirmationContract,
    informationFlowContract,
    expectationThresholdContract,
    volumeClimaxBrief,
    recentFatigueBrief,
    deliveryRiskCarryOver,
    writePreparationBrief,
    readerExpectationDebtContext,
    previousHandoff,
    storyUnitContext,
    signatureSceneBrief,
    innovationBrief,
    characterArcBrief,
    titleUniquenessReport,
    duplicateTitleRows,
    ohStoryDirectorPromptBlock,
    project,
    chapterDraft,
    migrationPlan,
    contextPackage,
  }
}
