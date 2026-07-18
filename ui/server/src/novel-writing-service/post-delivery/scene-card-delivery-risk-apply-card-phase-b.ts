/** Delivery-risk carry-over phase b. */
import { compactBriefText } from '../quality/text-utils'
import {
  appendSceneCardText,
  mergeSceneCardStringList,
} from './scene-card-delivery-risk'

export function applyDeliveryRiskCarryOverPhaseB(next: any, index: number, ctx: Record<string, any>) {
  const {
    openingActions,
    middleActions,
    endingActions,
    forbiddenRepeats,
    styleDirectiveActions,
    dialogueGoalActions,
    characterBehaviorActions,
    benchmarkRecallDirectiveActions,
    proseCraftDirectiveActions,
    wordCountActions,
    qualityAuditDirectiveActions,
    assetLinkageActions,
    settingViolationActions,
    assetIntakeActions,
    ipSceneIntakeActions,
    stateTrackingActions,
    statusFilterActions,
    informationFlowActions,
    expectationHookActions,
    chapterHookQualityActions,
    suspenseActions,
    reversalActions,
    showdownActions,
    bridgeUnitActions,
    beatCoolingActions,
    plotDynamicsActions,
    characterRelationActions,
    storyLoopActions,
    emotionalArcActions,
    readerRetentionActions,
    readerPayoffActions,
    chapterAttractionActions,
    storyDriveActions,
    storylineActions,
    characterArcActions,
    innovationActions,
    volumeBeatActions,
    coreDriftActions,
    timelineDeltaActions,
    characterStateDeltaActions,
    assetStateDeltaActions,
    relationshipDeltaActions,
    chapterHandoffDeltaActions,
    revisionCascadeActions,
    revisionContextActions,
    proseRevisionReceiptActions,
    revisionReceiptCheckActions,
    deliveryReceiptActions,
    revisionScopeGuardActions,
    revisionDirectiveActions,
    focusedRevisionModeActions,
    focusedRevisionHookActions,
    focusedRevisionSettingActions,
    craftMetricActions,
    craftMetricActionActions,
    craftMetricDescriptionActions,
    craftMetricSettingActions,
    fiveDimensionScoreActions,
    fiveDimensionCoreActions,
    fiveDimensionSurfaceActions,
    fiveDimensionLogicActions,
    qualitySpecialtyActions,
    qualityStructureActions,
    qualityProgressionActions,
    qualityInformationActions,
    platformContentRubricActions,
    platformRubricActions,
    contentRubricActions,
    deterministicCleanupActions,
    bannedWordActions,
    deslopRepairReceiptActions,
    readabilityActions,
    governanceRecheckActions,
    chapterTitleActions,
    qualityGateActions,
    qualityAuditRepairReceiptActions,
    qualityPlanReceiptActions,
    serialRiskRepairActions,
    sceneCardReceiptActions,
    perspectiveReviewActions,
    targetReaderActions,
    conflictStructureActions,
    genrePositioningActions,
    upgradeRhythmActions,
    continuityHeatActions,
    sourceReadinessActions,
    writePreparationActions,
    intentConfirmationActions,
    chapterBlueprintActions,
    blueprintConsumptionActions,
    coreContractActions,
    femaleAudienceActions,
    chapterBenchmarkActions,
    runwayActions,
    longformActions,
    signatureSceneActions,
    storyUnitActions,
    chapterHandoffActions,
    openingDesignActions,
    paragraphHookActions,
    proseMetaActions,
    punctuationToneActions,
    styleBoundaryActions,
    styleSampleReceiptActions,
    payoffSetupActions,
    spectatorReactionActions,
    foreshadowingDeltaActions,
    conceptAnchorActions,
    firstIndex,
    middleIndex,
    lastIndex,
    qualityTags,
    actionIndexes,
    stagedActions,
  } = ctx
    if (deliveryReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, deliveryReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deliveryReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, deliveryReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, deliveryReceiptActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, deliveryReceiptActions)
    }
    if (revisionScopeGuardActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionScopeGuardActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionScopeGuardActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionScopeGuardActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionScopeGuardActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionScopeGuardActions)
    }
    if (revisionDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionDirectiveActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionDirectiveActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionDirectiveActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionDirectiveActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionDirectiveActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, revisionDirectiveActions)
    }
    if (focusedRevisionModeActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, focusedRevisionModeActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, focusedRevisionModeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, focusedRevisionModeActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, focusedRevisionModeActions)
      if (focusedRevisionSettingActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, focusedRevisionSettingActions)
        next.used_settings = mergeSceneCardStringList(next.used_settings, focusedRevisionSettingActions)
        next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, focusedRevisionSettingActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, focusedRevisionSettingActions)
      }
      if (index === lastIndex && focusedRevisionHookActions.length) {
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, focusedRevisionHookActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, focusedRevisionHookActions)
      }
    }
    if (craftMetricActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, craftMetricActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, craftMetricActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, craftMetricActions)
      if (craftMetricActionActions.length) {
        next.action_beats = mergeSceneCardStringList(next.action_beats, craftMetricActionActions)
      }
      if (craftMetricDescriptionActions.length) {
        next.style_directives = mergeSceneCardStringList(next.style_directives, craftMetricDescriptionActions)
      }
      if (craftMetricSettingActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, craftMetricSettingActions)
        next.used_settings = mergeSceneCardStringList(next.used_settings, craftMetricSettingActions)
        next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, craftMetricSettingActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, craftMetricSettingActions)
      }
    }
    if (fiveDimensionScoreActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, fiveDimensionScoreActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, fiveDimensionScoreActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, fiveDimensionScoreActions)
      if (fiveDimensionCoreActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, fiveDimensionCoreActions)
        next.conflict = appendSceneCardText(next.conflict, fiveDimensionCoreActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, fiveDimensionCoreActions)
      }
      if (fiveDimensionSurfaceActions.length) {
        next.style_directives = mergeSceneCardStringList(next.style_directives, fiveDimensionSurfaceActions)
      }
      if (fiveDimensionLogicActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, fiveDimensionLogicActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, fiveDimensionLogicActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, fiveDimensionLogicActions)
      }
    }
    if (qualitySpecialtyActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualitySpecialtyActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualitySpecialtyActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, qualitySpecialtyActions)
      if (qualityStructureActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, qualityStructureActions)
        if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, qualityStructureActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, qualityStructureActions)
      }
      if (qualityProgressionActions.length) {
        next.required_beats = mergeSceneCardStringList(next.required_beats, qualityProgressionActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, qualityProgressionActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityProgressionActions)
        if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityProgressionActions)
      }
      if (qualityInformationActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, qualityInformationActions)
        next.information_gap = appendSceneCardText(next.information_gap, qualityInformationActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, qualityInformationActions)
      }
    }
    if (platformContentRubricActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, platformContentRubricActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, platformContentRubricActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, platformContentRubricActions)
      if (platformRubricActions.length) {
        if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, platformRubricActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, platformRubricActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, platformRubricActions)
      }
      if (contentRubricActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, contentRubricActions)
        next.conflict = appendSceneCardText(next.conflict, contentRubricActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, contentRubricActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, contentRubricActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, contentRubricActions)
      }
    }
    if (deterministicCleanupActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, deterministicCleanupActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, deterministicCleanupActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deterministicCleanupActions)
    }
    if (bannedWordActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, bannedWordActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, bannedWordActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, bannedWordActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, bannedWordActions)
    }
    if (deslopRepairReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, deslopRepairReceiptActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, deslopRepairReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deslopRepairReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, deslopRepairReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, deslopRepairReceiptActions)
    }
    if (readabilityActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, readabilityActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, readabilityActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, readabilityActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, readabilityActions)
    }
    if (governanceRecheckActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, governanceRecheckActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, governanceRecheckActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, governanceRecheckActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, governanceRecheckActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, governanceRecheckActions)
    }
    if (chapterTitleActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, chapterTitleActions)
      next.required_information = mergeSceneCardStringList(next.required_information, chapterTitleActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterTitleActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterTitleActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterTitleActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterTitleActions)
      }
    }
    if (qualityGateActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualityGateActions)
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, qualityGateActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityGateActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityGateActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityGateActions)
    }
    if (qualityAuditRepairReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, qualityAuditRepairReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityAuditRepairReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityAuditRepairReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityAuditRepairReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityAuditRepairReceiptActions)
    }
    if (qualityPlanReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, qualityPlanReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityPlanReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityPlanReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityPlanReceiptActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, qualityPlanReceiptActions)
    }
    if (serialRiskRepairActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, serialRiskRepairActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, serialRiskRepairActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, serialRiskRepairActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, serialRiskRepairActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, serialRiskRepairActions)
    }
    if (sceneCardReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, sceneCardReceiptActions)
      next.required_information = mergeSceneCardStringList(next.required_information, sceneCardReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, sceneCardReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, sceneCardReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, sceneCardReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, sceneCardReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, sceneCardReceiptActions)
    }
    if (perspectiveReviewActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, perspectiveReviewActions)
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, perspectiveReviewActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, perspectiveReviewActions)
      next.conflict = appendSceneCardText(next.conflict, perspectiveReviewActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, perspectiveReviewActions)
    }
    if (targetReaderActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, targetReaderActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, targetReaderActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, targetReaderActions)
    }
    if (conflictStructureActions.length) {
      next.conflict = appendSceneCardText(next.conflict, conflictStructureActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, conflictStructureActions)
      if (index === lastIndex) next.turning_point = appendSceneCardText(next.turning_point, conflictStructureActions)
    }
    if (genrePositioningActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, genrePositioningActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, genrePositioningActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, genrePositioningActions)
    }
    if (upgradeRhythmActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, upgradeRhythmActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, upgradeRhythmActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, upgradeRhythmActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, upgradeRhythmActions)
    }
    if (continuityHeatActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, continuityHeatActions)
      next.information_gap = appendSceneCardText(next.information_gap, continuityHeatActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, continuityHeatActions)
    }
    if (sourceReadinessActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, sourceReadinessActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, sourceReadinessActions)
    }
    if (writePreparationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, writePreparationActions)
      next.required_information = mergeSceneCardStringList(next.required_information, writePreparationActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, writePreparationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, writePreparationActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, writePreparationActions)
    }
    if (intentConfirmationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, intentConfirmationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, intentConfirmationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, intentConfirmationActions)
    }
    if (chapterBlueprintActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterBlueprintActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, chapterBlueprintActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterBlueprintActions)
    }
    if (blueprintConsumptionActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, blueprintConsumptionActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, blueprintConsumptionActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, blueprintConsumptionActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, blueprintConsumptionActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, blueprintConsumptionActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, blueprintConsumptionActions)
      }
    }
    if (coreContractActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, coreContractActions)
      next.conflict = appendSceneCardText(next.conflict, coreContractActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, coreContractActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, coreContractActions)
    }
    if (femaleAudienceActions.length) {
      next.emotional_tone = appendSceneCardText(next.emotional_tone, femaleAudienceActions)
      next.character_voice = appendSceneCardText(next.character_voice, femaleAudienceActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, femaleAudienceActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, femaleAudienceActions)
    }
    if (chapterBenchmarkActions.length) {
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, chapterBenchmarkActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterBenchmarkActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterBenchmarkActions)
    }
    if (runwayActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, runwayActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, runwayActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, runwayActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, runwayActions)
    }
    if (longformActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, longformActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, longformActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, longformActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, longformActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, longformActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, longformActions)
      }
    }
    if (signatureSceneActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, signatureSceneActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, signatureSceneActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, signatureSceneActions)
    }
    if (storyUnitActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, storyUnitActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyUnitActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, storyUnitActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyUnitActions)
      }
    }
    if (chapterHandoffActions.length) {
      if (index === firstIndex) {
        next.transition_from_previous = appendSceneCardText(next.transition_from_previous, chapterHandoffActions)
        next.required_beats = mergeSceneCardStringList(next.required_beats, chapterHandoffActions)
      }
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, chapterHandoffActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHandoffActions)
    }
    if (openingDesignActions.length) {
      if (index === firstIndex) {
        next.opening_hook = appendSceneCardText(next.opening_hook, openingDesignActions)
        next.required_beats = mergeSceneCardStringList(next.required_beats, openingDesignActions)
        next.conflict = appendSceneCardText(next.conflict, openingDesignActions)
      }
    }
    if (paragraphHookActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, paragraphHookActions)
      next.information_gap = appendSceneCardText(next.information_gap, paragraphHookActions)
    }
    if (proseMetaActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseMetaActions)
    }
    if (punctuationToneActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, punctuationToneActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, punctuationToneActions)
    }
    if (styleBoundaryActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleBoundaryActions)
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, styleBoundaryActions)
    }
    if (styleSampleReceiptActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleSampleReceiptActions)
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, styleSampleReceiptActions)
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, styleSampleReceiptActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, styleSampleReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, styleSampleReceiptActions)
      next.character_voice = appendSceneCardText(next.character_voice, styleSampleReceiptActions)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, styleSampleReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, styleSampleReceiptActions)
    }
    if (payoffSetupActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, payoffSetupActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, payoffSetupActions)
    }
    if (spectatorReactionActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, spectatorReactionActions)
      next.character_voice = appendSceneCardText(next.character_voice, spectatorReactionActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, spectatorReactionActions)
    }
    if (foreshadowingDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, foreshadowingDeltaActions)
      next.information_gap = appendSceneCardText(next.information_gap, foreshadowingDeltaActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, foreshadowingDeltaActions)
    }
    if (conceptAnchorActions.length) {
      next.concept_anchor_rules = mergeSceneCardStringList(next.concept_anchor_rules, conceptAnchorActions)
    }
    if (stagedActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, stagedActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, stagedActions)
    }
    if (index === firstIndex && openingActions.length) {
      next.opening_hook = appendSceneCardText(next.opening_hook, openingActions)
    }
    if (index === middleIndex && middleActions.length) {
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, middleActions)
      if (!compactBriefText(next.conflict)) next.conflict = compactBriefText(middleActions.join('；'), 180)
    }
    if (index === lastIndex && endingActions.length) {
      next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, endingActions)
    }
  return next
}
