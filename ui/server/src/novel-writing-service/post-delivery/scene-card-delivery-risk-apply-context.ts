import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskCarryOversFromContext,
  deliveryRiskItemText,
} from './delivery-risk-core'
import {
  appendSceneCardText,
  characterRelationSceneProgressionPlan,
  deliveryRiskAssetIntakeActions,
  deliveryRiskAssetLinkageActions,
  deliveryRiskAssetStateDeltaActions,
  deliveryRiskBannedWordActions,
  deliveryRiskBeatCoolingActions,
  deliveryRiskBenchmarkRecallDirectiveActions,
  deliveryRiskBlueprintConsumptionActions,
  deliveryRiskBridgeUnitActions,
  deliveryRiskChapterAttractionActions,
  deliveryRiskChapterBenchmarkActions,
  deliveryRiskChapterBlueprintActions,
  deliveryRiskChapterHandoffActions,
  deliveryRiskChapterHandoffDeltaActions,
  deliveryRiskChapterHookQualityActions,
  deliveryRiskChapterTitleActions,
  deliveryRiskCharacterArcActions,
  deliveryRiskCharacterBehaviorActions,
  deliveryRiskCharacterRelationActions,
  deliveryRiskCharacterStateDeltaActions,
  deliveryRiskConceptAnchorActions,
  deliveryRiskConflictStructureActions,
  deliveryRiskContinuityHeatActions,
  deliveryRiskCoreContractActions,
  deliveryRiskCoreDriftActions,
  deliveryRiskCraftMetricActions,
  deliveryRiskDeliveryReceiptActions,
  deliveryRiskDeslopRepairReceiptActions,
  deliveryRiskDeterministicCleanupActions,
  deliveryRiskDialogueGoalActions,
  deliveryRiskEmotionalArcActions,
  deliveryRiskExpectationHookActions,
  deliveryRiskFemaleAudienceActions,
  deliveryRiskFiveDimensionScoreActions,
  deliveryRiskFocusedRevisionModeActions,
  deliveryRiskForeshadowingDeltaActions,
  deliveryRiskGenrePositioningActions,
  deliveryRiskGovernanceRecheckActions,
  deliveryRiskInformationFlowActions,
  deliveryRiskInnovationActions,
  deliveryRiskIntentConfirmationActions,
  deliveryRiskIpSceneIntakeActions,
  deliveryRiskLongformActions,
  deliveryRiskOpeningActions,
  deliveryRiskParagraphHookActions,
  deliveryRiskPayoffSetupActions,
  deliveryRiskPerspectiveReviewActions,
  deliveryRiskPlatformContentRubricActions,
  deliveryRiskPlotDynamicsActions,
  deliveryRiskProseCraftDirectiveActions,
  deliveryRiskProseMetaActions,
  deliveryRiskProseRevisionReceiptActions,
  deliveryRiskPunctuationToneActions,
  deliveryRiskQualityAuditDirectiveActions,
  deliveryRiskQualityAuditRepairReceiptActions,
  deliveryRiskQualityGateActions,
  deliveryRiskQualityPlanReceiptActions,
  deliveryRiskQualitySpecialtyActions,
  deliveryRiskReadabilityActions,
  deliveryRiskReaderPayoffActions,
  deliveryRiskReaderRetentionActions,
  deliveryRiskRelationshipDeltaActions,
  deliveryRiskReversalActions,
  deliveryRiskRevisionCascadeActions,
  deliveryRiskRevisionContextActions,
  deliveryRiskRevisionDirectiveActions,
  deliveryRiskRevisionReceiptCheckActions,
  deliveryRiskRevisionScopeGuardActions,
  deliveryRiskRunwayActions,
  deliveryRiskSceneCardReceiptActions,
  deliveryRiskSerialRiskRepairActions,
  deliveryRiskSettingViolationActions,
  deliveryRiskShowdownActions,
  deliveryRiskSignatureSceneActions,
  deliveryRiskSourceReadinessActions,
  deliveryRiskSpectatorReactionActions,
  deliveryRiskStateTrackingActions,
  deliveryRiskStatusFilterActions,
  deliveryRiskStoryDriveActions,
  deliveryRiskStoryLoopActions,
  deliveryRiskStoryUnitActions,
  deliveryRiskStorylineActions,
  deliveryRiskStyleBoundaryActions,
  deliveryRiskStyleDirectiveActions,
  deliveryRiskStyleSampleReceiptActions,
  deliveryRiskSuspenseActions,
  deliveryRiskTargetReaderActions,
  deliveryRiskTimelineDeltaActions,
  deliveryRiskUpgradeRhythmActions,
  deliveryRiskVolumeBeatActions,
  deliveryRiskWordCountActions,
  deliveryRiskWritePreparationActions,
  emotionalArcSceneExecutionPlan,
  mergeSceneCardStringList,
} from './scene-card-delivery-risk'


export function collectDeliveryRiskCarryOverActionContext(sceneCards: any[], contextPackage: any = {}) {
  const carryOvers = deliveryRiskCarryOversFromContext(contextPackage)
  if (!sceneCards.length || !carryOvers.length) {
    return null
  }
  const openingActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.opening_actions)), 12)
  const middleActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.middle_actions)), 12)
  const endingActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.ending_actions)), 12)
  const forbiddenRepeats = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.forbidden_repeats)), 12)
  const styleDirectiveActions = deliveryRiskStyleDirectiveActions(carryOvers)
  const dialogueGoalActions = deliveryRiskDialogueGoalActions(carryOvers)
  const characterBehaviorActions = deliveryRiskCharacterBehaviorActions(carryOvers)
  const benchmarkRecallDirectiveActions = deliveryRiskBenchmarkRecallDirectiveActions(carryOvers)
  const proseCraftDirectiveActions = deliveryRiskProseCraftDirectiveActions(carryOvers)
  const wordCountActions = deliveryRiskWordCountActions(carryOvers)
  const qualityAuditDirectiveActions = deliveryRiskQualityAuditDirectiveActions(carryOvers)
  const assetLinkageActions = deliveryRiskAssetLinkageActions(carryOvers)
  const settingViolationActions = deliveryRiskSettingViolationActions(carryOvers)
  const assetIntakeActions = deliveryRiskAssetIntakeActions(carryOvers)
  const ipSceneIntakeActions = deliveryRiskIpSceneIntakeActions(carryOvers)
  const stateTrackingActions = deliveryRiskStateTrackingActions(carryOvers)
  const statusFilterActions = deliveryRiskStatusFilterActions(carryOvers)
  const informationFlowActions = deliveryRiskInformationFlowActions(carryOvers)
  const expectationHookActions = deliveryRiskExpectationHookActions(carryOvers)
  const chapterHookQualityActions = deliveryRiskChapterHookQualityActions(carryOvers)
  const suspenseActions = deliveryRiskSuspenseActions(carryOvers)
  const reversalActions = deliveryRiskReversalActions(carryOvers)
  const showdownActions = deliveryRiskShowdownActions(carryOvers)
  const bridgeUnitActions = deliveryRiskBridgeUnitActions(carryOvers)
  const beatCoolingActions = deliveryRiskBeatCoolingActions(carryOvers)
  const plotDynamicsActions = deliveryRiskPlotDynamicsActions(carryOvers)
  const characterRelationActions = deliveryRiskCharacterRelationActions(carryOvers)
  const storyLoopActions = deliveryRiskStoryLoopActions(carryOvers)
  const emotionalArcActions = deliveryRiskEmotionalArcActions(carryOvers)
  const readerRetentionActions = deliveryRiskReaderRetentionActions(carryOvers)
  const readerPayoffActions = deliveryRiskReaderPayoffActions(carryOvers)
  const chapterAttractionActions = deliveryRiskChapterAttractionActions(carryOvers)
  const storyDriveActions = deliveryRiskStoryDriveActions(carryOvers)
  const storylineActions = deliveryRiskStorylineActions(carryOvers)
  const characterArcActions = deliveryRiskCharacterArcActions(carryOvers)
  const innovationActions = deliveryRiskInnovationActions(carryOvers)
  const volumeBeatActions = deliveryRiskVolumeBeatActions(carryOvers)
  const coreDriftActions = deliveryRiskCoreDriftActions(carryOvers)
  const timelineDeltaActions = deliveryRiskTimelineDeltaActions(carryOvers)
  const characterStateDeltaActions = deliveryRiskCharacterStateDeltaActions(carryOvers)
  const assetStateDeltaActions = deliveryRiskAssetStateDeltaActions(carryOvers)
  const relationshipDeltaActions = deliveryRiskRelationshipDeltaActions(carryOvers)
  const chapterHandoffDeltaActions = deliveryRiskChapterHandoffDeltaActions(carryOvers)
  const revisionCascadeActions = deliveryRiskRevisionCascadeActions(carryOvers)
  const revisionContextActions = deliveryRiskRevisionContextActions(carryOvers)
  const proseRevisionReceiptActions = deliveryRiskProseRevisionReceiptActions(carryOvers)
  const revisionReceiptCheckActions = deliveryRiskRevisionReceiptCheckActions(carryOvers)
  const deliveryReceiptActions = deliveryRiskDeliveryReceiptActions(carryOvers)
  const revisionScopeGuardActions = deliveryRiskRevisionScopeGuardActions(carryOvers)
  const revisionDirectiveActions = deliveryRiskRevisionDirectiveActions(carryOvers)
  const focusedRevisionModeActions = deliveryRiskFocusedRevisionModeActions(carryOvers)
  const focusedRevisionHookActions = focusedRevisionModeActions.filter(item => /restore_hook|ending pull|章末|钩子|hook/i.test(item))
  const focusedRevisionSettingActions = focusedRevisionModeActions.filter(item => /repair_setting_violation|ability cost|item ownership|rule trigger|knowledge boundary|设定|能力代价|物品归属|规则触发|认知边界/i.test(item))
  const craftMetricActions = deliveryRiskCraftMetricActions(carryOvers)
  const craftMetricActionActions = craftMetricActions.filter(item => /action_detail_score|event_density_score|combat_process_score|start|reaction|space change|resource loss|counter|result|paragraphs|choice|information|relationship|动作细节|事件密度|战斗过程/i.test(item))
  const craftMetricDescriptionActions = craftMetricActions.filter(item => /description_overuse_score|description|danger judgment|action space|环境描写过量|环境描写|危险判断/i.test(item))
  const craftMetricSettingActions = craftMetricActions.filter(item => /setting_consistency_score|ability cost|item ownership|rule trigger|knowledge boundary|设定一致性|能力代价|物品归属|规则触发|认知边界/i.test(item))
  const fiveDimensionScoreActions = deliveryRiskFiveDimensionScoreActions(carryOvers)
  const fiveDimensionCoreActions = fiveDimensionScoreActions.filter(item => /core_consistency|core conflict|visible payoff|核心一致度|核心冲突|读者回报/i.test(item))
  const fiveDimensionSurfaceActions = fiveDimensionScoreActions.filter(item => /surface_rewrite|readability|summary prose|sentence rhythm|clipped dialogue|表层重写度|可读性|总结|句子|对白/i.test(item))
  const fiveDimensionLogicActions = fiveDimensionScoreActions.filter(item => /format_consistency|logic_coherence|cause|consequence|state change|clue handoff|格式一致度|逻辑连贯|因果|后果|状态变化|线索交接/i.test(item))
  const qualitySpecialtyActions = deliveryRiskQualitySpecialtyActions(carryOvers)
  const qualityStructureActions = qualitySpecialtyActions.filter(item => /structure_checks|structureChecks|opening_hook|middle_progression|situation_change|ending_page_turn|章节结构|开头钩子|中段推进|局势变化|章尾翻页/i.test(item))
  const qualityProgressionActions = qualitySpecialtyActions.filter(item => /progression_checks|progressionChecks|non_deletable_change|mainline_shift|relationship_or_state_change|compressed_water|章节推进|不可删除|主线变化|关系变化|状态变化|水文/i.test(item))
  const qualityInformationActions = qualitySpecialtyActions.filter(item => /information_checks|informationChecks|new_concept_count|action_bound_info|conflict_release|reader_first_scene|信息传递|信息负载|新概念|信息跟冲突|冲突释放/i.test(item))
  const platformContentRubricActions = deliveryRiskPlatformContentRubricActions(carryOvers)
  const platformRubricActions = platformContentRubricActions.filter(item => /platform_checks|platformChecks|opening_pace|payoff_density|reader_expectation|page_turn_pull|平台检查|平台适配|开篇节奏|回报密度|读者期待|翻页拉力/i.test(item))
  const contentRubricActions = platformContentRubricActions.filter(item => /content_rubric_checks|contentRubricChecks|core_selling_point|conflict_progression|chapter_change|page_turn_reason|内容基准|黄金三问|核心卖点|冲突推进|章节变化|翻页理由/i.test(item))
  const deterministicCleanupActions = deliveryRiskDeterministicCleanupActions(carryOvers)
  const bannedWordActions = deliveryRiskBannedWordActions(carryOvers)
  const deslopRepairReceiptActions = deliveryRiskDeslopRepairReceiptActions(carryOvers)
  const readabilityActions = deliveryRiskReadabilityActions(carryOvers)
  const governanceRecheckActions = deliveryRiskGovernanceRecheckActions(carryOvers)
  const chapterTitleActions = deliveryRiskChapterTitleActions(carryOvers)
  const qualityGateActions = deliveryRiskQualityGateActions(carryOvers)
  const qualityAuditRepairReceiptActions = deliveryRiskQualityAuditRepairReceiptActions(carryOvers)
  const qualityPlanReceiptActions = deliveryRiskQualityPlanReceiptActions(carryOvers)
  const serialRiskRepairActions = deliveryRiskSerialRiskRepairActions(carryOvers)
  const sceneCardReceiptActions = deliveryRiskSceneCardReceiptActions(carryOvers)
  const perspectiveReviewActions = deliveryRiskPerspectiveReviewActions(carryOvers)
  const targetReaderActions = deliveryRiskTargetReaderActions(carryOvers)
  const conflictStructureActions = deliveryRiskConflictStructureActions(carryOvers)
  const genrePositioningActions = deliveryRiskGenrePositioningActions(carryOvers)
  const upgradeRhythmActions = deliveryRiskUpgradeRhythmActions(carryOvers)
  const continuityHeatActions = deliveryRiskContinuityHeatActions(carryOvers)
  const sourceReadinessActions = deliveryRiskSourceReadinessActions(carryOvers)
  const writePreparationActions = deliveryRiskWritePreparationActions(carryOvers)
  const intentConfirmationActions = deliveryRiskIntentConfirmationActions(carryOvers)
  const chapterBlueprintActions = deliveryRiskChapterBlueprintActions(carryOvers)
  const blueprintConsumptionActions = deliveryRiskBlueprintConsumptionActions(carryOvers)
  const coreContractActions = deliveryRiskCoreContractActions(carryOvers)
  const femaleAudienceActions = deliveryRiskFemaleAudienceActions(carryOvers)
  const chapterBenchmarkActions = deliveryRiskChapterBenchmarkActions(carryOvers)
  const runwayActions = deliveryRiskRunwayActions(carryOvers)
  const longformActions = deliveryRiskLongformActions(carryOvers)
  const signatureSceneActions = deliveryRiskSignatureSceneActions(carryOvers)
  const storyUnitActions = deliveryRiskStoryUnitActions(carryOvers)
  const chapterHandoffActions = deliveryRiskChapterHandoffActions(carryOvers)
  const openingDesignActions = deliveryRiskOpeningActions(carryOvers)
  const paragraphHookActions = deliveryRiskParagraphHookActions(carryOvers)
  const proseMetaActions = deliveryRiskProseMetaActions(carryOvers)
  const punctuationToneActions = deliveryRiskPunctuationToneActions(carryOvers)
  const styleBoundaryActions = deliveryRiskStyleBoundaryActions(carryOvers)
  const styleSampleReceiptActions = deliveryRiskStyleSampleReceiptActions(carryOvers)
  const payoffSetupActions = deliveryRiskPayoffSetupActions(carryOvers)
  const spectatorReactionActions = deliveryRiskSpectatorReactionActions(carryOvers)
  const foreshadowingDeltaActions = deliveryRiskForeshadowingDeltaActions(carryOvers)
  const conceptAnchorActions = deliveryRiskConceptAnchorActions(carryOvers)
  if (!openingActions.length && !middleActions.length && !endingActions.length && !forbiddenRepeats.length && !styleDirectiveActions.length && !dialogueGoalActions.length && !characterBehaviorActions.length && !characterRelationActions.length && !benchmarkRecallDirectiveActions.length && !proseCraftDirectiveActions.length && !qualityAuditDirectiveActions.length && !assetLinkageActions.length && !assetIntakeActions.length && !ipSceneIntakeActions.length && !stateTrackingActions.length && !statusFilterActions.length && !informationFlowActions.length && !expectationHookActions.length && !suspenseActions.length && !reversalActions.length && !showdownActions.length && !bridgeUnitActions.length && !beatCoolingActions.length && !plotDynamicsActions.length && !storyLoopActions.length && !emotionalArcActions.length && !readerRetentionActions.length && !readerPayoffActions.length && !chapterAttractionActions.length && !storyDriveActions.length && !storylineActions.length && !characterArcActions.length && !innovationActions.length && !volumeBeatActions.length && !coreDriftActions.length && !timelineDeltaActions.length && !characterStateDeltaActions.length && !assetStateDeltaActions.length && !relationshipDeltaActions.length && !chapterHandoffDeltaActions.length && !revisionCascadeActions.length && !revisionContextActions.length && !proseRevisionReceiptActions.length && !deliveryReceiptActions.length && !revisionScopeGuardActions.length && !revisionDirectiveActions.length && !focusedRevisionModeActions.length && !craftMetricActions.length && !fiveDimensionScoreActions.length && !qualitySpecialtyActions.length && !platformContentRubricActions.length && !deterministicCleanupActions.length && !bannedWordActions.length && !deslopRepairReceiptActions.length && !readabilityActions.length && !governanceRecheckActions.length && !chapterTitleActions.length && !qualityGateActions.length && !qualityAuditRepairReceiptActions.length && !qualityPlanReceiptActions.length && !serialRiskRepairActions.length && !sceneCardReceiptActions.length && !perspectiveReviewActions.length && !targetReaderActions.length && !conflictStructureActions.length && !genrePositioningActions.length && !upgradeRhythmActions.length && !continuityHeatActions.length && !sourceReadinessActions.length && !writePreparationActions.length && !intentConfirmationActions.length && !chapterBlueprintActions.length && !coreContractActions.length && !femaleAudienceActions.length && !chapterBenchmarkActions.length && !runwayActions.length && !signatureSceneActions.length && !storyUnitActions.length && !chapterHandoffActions.length && !openingDesignActions.length && !paragraphHookActions.length && !proseMetaActions.length && !punctuationToneActions.length && !styleBoundaryActions.length && !styleSampleReceiptActions.length && !payoffSetupActions.length && !spectatorReactionActions.length && !foreshadowingDeltaActions.length && !conceptAnchorActions.length) return sceneCards

  const firstIndex = 0
  const middleIndex = sceneCards.length >= 3 ? Math.floor(sceneCards.length / 2) : Math.min(1, sceneCards.length - 1)
  const lastIndex = sceneCards.length - 1
  const qualityTags = ['delivery_risk_carry_over', '质量续航']
  const actionIndexes = new Set<number>([
    ...(openingActions.length ? [firstIndex] : []),
    ...(middleActions.length ? [middleIndex] : []),
    ...(endingActions.length ? [lastIndex] : []),
    ...(forbiddenRepeats.length ? [firstIndex, middleIndex, lastIndex] : []),
  ])

  return {
    carryOvers,
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
  }
}
