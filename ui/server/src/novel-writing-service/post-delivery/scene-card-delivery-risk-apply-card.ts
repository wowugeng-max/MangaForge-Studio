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


export function applyDeliveryRiskCarryOverToSceneCard(
  card: any,
  index: number,
  ctx: Record<string, any>,
) {
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
  } = ctx

    if (!actionIndexes.has(index) && !styleDirectiveActions.length && !dialogueGoalActions.length && !characterBehaviorActions.length && !characterRelationActions.length && !benchmarkRecallDirectiveActions.length && !proseCraftDirectiveActions.length && !qualityAuditDirectiveActions.length && !assetLinkageActions.length && !assetIntakeActions.length && !ipSceneIntakeActions.length && !stateTrackingActions.length && !statusFilterActions.length && !informationFlowActions.length && !expectationHookActions.length && !suspenseActions.length && !reversalActions.length && !showdownActions.length && !bridgeUnitActions.length && !beatCoolingActions.length && !plotDynamicsActions.length && !storyLoopActions.length && !emotionalArcActions.length && !readerRetentionActions.length && !readerPayoffActions.length && !chapterAttractionActions.length && !storyDriveActions.length && !storylineActions.length && !characterArcActions.length && !innovationActions.length && !volumeBeatActions.length && !coreDriftActions.length && !timelineDeltaActions.length && !characterStateDeltaActions.length && !assetStateDeltaActions.length && !relationshipDeltaActions.length && !chapterHandoffDeltaActions.length && !revisionCascadeActions.length && !revisionContextActions.length && !proseRevisionReceiptActions.length && !deliveryReceiptActions.length && !revisionScopeGuardActions.length && !revisionDirectiveActions.length && !focusedRevisionModeActions.length && !craftMetricActions.length && !fiveDimensionScoreActions.length && !qualitySpecialtyActions.length && !platformContentRubricActions.length && !deterministicCleanupActions.length && !bannedWordActions.length && !deslopRepairReceiptActions.length && !readabilityActions.length && !governanceRecheckActions.length && !chapterTitleActions.length && !qualityGateActions.length && !qualityAuditRepairReceiptActions.length && !qualityPlanReceiptActions.length && !serialRiskRepairActions.length && !sceneCardReceiptActions.length && !perspectiveReviewActions.length && !targetReaderActions.length && !conflictStructureActions.length && !genrePositioningActions.length && !upgradeRhythmActions.length && !continuityHeatActions.length && !sourceReadinessActions.length && !writePreparationActions.length && !intentConfirmationActions.length && !chapterBlueprintActions.length && !coreContractActions.length && !femaleAudienceActions.length && !chapterBenchmarkActions.length && !runwayActions.length && !signatureSceneActions.length && !storyUnitActions.length && !chapterHandoffActions.length && !openingDesignActions.length && !paragraphHookActions.length && !proseMetaActions.length && !punctuationToneActions.length && !styleBoundaryActions.length && !styleSampleReceiptActions.length && !payoffSetupActions.length && !spectatorReactionActions.length && !foreshadowingDeltaActions.length && !conceptAnchorActions.length) return card
    const next = { ...card }
    const stagedActions = [
      ...(index === firstIndex ? openingActions : []),
      ...(index === middleIndex ? middleActions : []),
      ...(index === lastIndex ? endingActions : []),
    ]
    next.serial_risk_repairs = mergeSceneCardStringList(
      next.serial_risk_repairs,
      [
        ...qualityTags,
        ...(styleDirectiveActions.length ? ['文风指纹'] : []),
        ...(dialogueGoalActions.length ? ['对白质量'] : []),
        ...(characterBehaviorActions.length ? ['角色行为'] : []),
        ...(characterRelationActions.length ? ['角色关系'] : []),
        ...(benchmarkRecallDirectiveActions.length ? ['文风召回'] : []),
        ...(proseCraftDirectiveActions.length ? ['正文工艺'] : []),
        ...(wordCountActions.length ? ['字数执行'] : []),
        ...(qualityAuditDirectiveActions.length ? ['质量诊断'] : []),
        ...(assetLinkageActions.length ? ['资产挂钩'] : []),
        ...(settingViolationActions.length ? ['设定违规'] : []),
        ...(assetIntakeActions.length ? ['新资产入库'] : []),
        ...(ipSceneIntakeActions.length ? ['IP场面延展'] : []),
        ...(stateTrackingActions.length ? ['状态跟踪'] : []),
        ...(statusFilterActions.length ? ['状态筛选'] : []),
        ...(informationFlowActions.length ? ['信息流'] : []),
        ...(expectationHookActions.length ? ['期待/钩子'] : []),
        ...(chapterHookQualityActions.length ? ['章钩质量'] : []),
        ...(suspenseActions.length ? ['悬念编排'] : []),
        ...(reversalActions.length ? ['反转设计'] : []),
        ...(showdownActions.length ? ['高潮对抗'] : []),
        ...(bridgeUnitActions.length ? ['桥段节奏'] : []),
        ...(beatCoolingActions.length ? ['节奏冷却'] : []),
        ...(plotDynamicsActions.length ? ['剧情动力'] : []),
        ...(storyLoopActions.length ? ['故事循环'] : []),
        ...(emotionalArcActions.length ? ['情绪弧'] : []),
        ...(readerRetentionActions.length ? ['追读留存'] : []),
        ...(readerPayoffActions.length ? ['读者回报'] : []),
        ...(chapterAttractionActions.length ? ['章节吸引力'] : []),
        ...(storyDriveActions.length ? ['故事驱动'] : []),
        ...(storylineActions.length ? ['剧情线'] : []),
        ...(characterArcActions.length ? ['人物弧光'] : []),
        ...(innovationActions.length ? ['创新'] : []),
        ...(volumeBeatActions.length ? ['卷级爆点'] : []),
        ...(coreDriftActions.length ? ['核心守恒'] : []),
        ...(timelineDeltaActions.length ? ['时间线'] : []),
        ...(characterStateDeltaActions.length ? ['角色状态'] : []),
        ...(assetStateDeltaActions.length ? ['资产状态'] : []),
        ...(relationshipDeltaActions.length ? ['关系增量'] : []),
        ...(chapterHandoffDeltaActions.length ? ['章末交接'] : []),
        ...(revisionCascadeActions.length ? ['修订级联'] : []),
        ...(revisionContextActions.length ? ['修订上下文'] : []),
        ...(proseRevisionReceiptActions.length ? ['修订回执'] : []),
        ...(revisionReceiptCheckActions.length ? ['修订回执检查'] : []),
        ...(deliveryReceiptActions.length ? ['交稿回执'] : []),
        ...(revisionScopeGuardActions.length ? ['修订幅度'] : []),
        ...(revisionDirectiveActions.length ? ['修订指令'] : []),
        ...(focusedRevisionModeActions.length ? ['定向修订'] : []),
        ...(craftMetricActions.length ? ['正文工艺指标'] : []),
        ...(fiveDimensionScoreActions.length ? ['质量五维'] : []),
        ...(qualitySpecialtyActions.length ? ['质量专项'] : []),
        ...(platformContentRubricActions.length ? ['平台/内容基准'] : []),
        ...(deterministicCleanupActions.length ? ['确定性清理'] : []),
        ...(bannedWordActions.length ? ['禁用词'] : []),
        ...(deslopRepairReceiptActions.length ? ['去AI回执'] : []),
        ...(readabilityActions.length ? ['可读性'] : []),
        ...(governanceRecheckActions.length ? ['治理复查'] : []),
        ...(chapterTitleActions.length ? ['章节标题'] : []),
        ...(qualityGateActions.length ? ['质量门禁'] : []),
        ...(qualityAuditRepairReceiptActions.length ? ['质量修复回执'] : []),
        ...(qualityPlanReceiptActions.length ? ['质量续航回执'] : []),
        ...(serialRiskRepairActions.length ? ['近章风险修复'] : []),
        ...(sceneCardReceiptActions.length ? ['场景回执'] : []),
        ...(perspectiveReviewActions.length ? ['多视角审查'] : []),
        ...(targetReaderActions.length ? ['目标读者'] : []),
        ...(conflictStructureActions.length ? ['冲突结构'] : []),
        ...(genrePositioningActions.length ? ['题材定位'] : []),
        ...(upgradeRhythmActions.length ? ['升级节奏'] : []),
        ...(continuityHeatActions.length ? ['连续性热度'] : []),
        ...(sourceReadinessActions.length ? ['来源就绪'] : []),
        ...(writePreparationActions.length ? ['写前准备'] : []),
        ...(intentConfirmationActions.length ? ['意图确认'] : []),
        ...(chapterBlueprintActions.length ? ['章节细纲'] : []),
        ...(blueprintConsumptionActions.length ? ['细纲兑现'] : []),
        ...(coreContractActions.length ? ['核心契约'] : []),
        ...(femaleAudienceActions.length ? ['女频长篇'] : []),
        ...(chapterBenchmarkActions.length ? ['章节基准'] : []),
        ...(runwayActions.length ? ['航线'] : []),
        ...(longformActions.length ? ['长篇专项'] : []),
        ...(signatureSceneActions.length ? ['招牌场面'] : []),
        ...(storyUnitActions.length ? ['剧情单元'] : []),
        ...(chapterHandoffActions.length ? ['章首承接'] : []),
        ...(openingDesignActions.length ? ['开篇设计'] : []),
        ...(paragraphHookActions.length ? ['段落钩子'] : []),
        ...(proseMetaActions.length ? ['正文元信息'] : []),
        ...(punctuationToneActions.length ? ['语气标点'] : []),
        ...(styleBoundaryActions.length ? ['文风边界', '风格样本'] : []),
        ...(styleSampleReceiptActions.length ? ['样章策略回执'] : []),
        ...(payoffSetupActions.length ? ['爽点铺垫'] : []),
        ...(spectatorReactionActions.length ? ['围观反应'] : []),
        ...(foreshadowingDeltaActions.length ? ['伏笔增量'] : []),
        ...(conceptAnchorActions.length ? ['新概念锚点'] : []),
        ...(forbiddenRepeats.length ? forbiddenRepeats : []),
      ],
    )
    if (styleDirectiveActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleDirectiveActions)
    }
    if (dialogueGoalActions.length) {
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, dialogueGoalActions)
    }
    if (characterBehaviorActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterBehaviorActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterBehaviorActions)
    }
    if (benchmarkRecallDirectiveActions.length) {
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, benchmarkRecallDirectiveActions)
    }
    if (proseCraftDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseCraftDirectiveActions)
    }
    if (wordCountActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, wordCountActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, wordCountActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, wordCountActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, wordCountActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, wordCountActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, wordCountActions)
    }
    if (qualityAuditDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualityAuditDirectiveActions)
    }
    if (assetLinkageActions.length) {
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetLinkageActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetLinkageActions)
    }
    if (settingViolationActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, settingViolationActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, settingViolationActions)
      next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, settingViolationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, settingViolationActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, settingViolationActions)
    }
    if (assetIntakeActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, assetIntakeActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetIntakeActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetIntakeActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, assetIntakeActions)
    }
    if (ipSceneIntakeActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, ipSceneIntakeActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, ipSceneIntakeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, ipSceneIntakeActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, ipSceneIntakeActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, ipSceneIntakeActions)
    }
    if (stateTrackingActions.length) {
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, stateTrackingActions)
    }
    if (statusFilterActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, statusFilterActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, statusFilterActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, statusFilterActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, statusFilterActions)
    }
    if (informationFlowActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, informationFlowActions)
    }
    if (expectationHookActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, expectationHookActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, expectationHookActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, expectationHookActions)
    }
    if (chapterHookQualityActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterHookQualityActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, chapterHookQualityActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterHookQualityActions)
      if (index === lastIndex) {
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHookQualityActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterHookQualityActions)
      }
    }
    if (suspenseActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, suspenseActions)
      next.required_information = mergeSceneCardStringList(next.required_information, suspenseActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, suspenseActions)
    }
    if (reversalActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, reversalActions)
      if (index === lastIndex) {
        next.reversal = appendSceneCardText(next.reversal, reversalActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, reversalActions)
      }
    }
    if (showdownActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, showdownActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, showdownActions)
        next.turning_point = appendSceneCardText(next.turning_point, showdownActions)
      }
    }
    if (bridgeUnitActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, bridgeUnitActions)
      next.information_gap = appendSceneCardText(next.information_gap, bridgeUnitActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, bridgeUnitActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, bridgeUnitActions)
    }
    if (beatCoolingActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, beatCoolingActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, beatCoolingActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, beatCoolingActions)
    }
    if (plotDynamicsActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, plotDynamicsActions)
      next.conflict = appendSceneCardText(next.conflict, plotDynamicsActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, plotDynamicsActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, plotDynamicsActions)
    }
    if (characterRelationActions.length) {
      const relationPlan = characterRelationSceneProgressionPlan(characterRelationActions, index, firstIndex, middleIndex, lastIndex)
      next.relationship_progression_plan = appendSceneCardText(next.relationship_progression_plan, [relationPlan.progression], 360)
      if (relationPlan.buffer) next.relationship_buffer_zone = appendSceneCardText(next.relationship_buffer_zone, [relationPlan.buffer], 280)
      if (relationPlan.action) next.supporting_character_action = appendSceneCardText(next.supporting_character_action, [relationPlan.action], 280)
      if (relationPlan.shift) next.attitude_shift_checkpoint = appendSceneCardText(next.attitude_shift_checkpoint, [relationPlan.shift], 280)
      if (relationPlan.nextHook) next.relationship_next_hook = appendSceneCardText(next.relationship_next_hook, [relationPlan.nextHook], 300)
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterRelationActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterRelationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterRelationActions)
      if (index === firstIndex) next.required_information = mergeSceneCardStringList(next.required_information, [relationPlan.buffer])
      if (index === middleIndex) next.action_beats = mergeSceneCardStringList(next.action_beats, [relationPlan.action, relationPlan.shift])
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, [relationPlan.nextHook])
    }
    if (storyLoopActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, storyLoopActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyLoopActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, storyLoopActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyLoopActions)
      }
    }
    if (emotionalArcActions.length) {
      const emotionalArcPlan = emotionalArcSceneExecutionPlan(emotionalArcActions, index, firstIndex, middleIndex, lastIndex)
      next.emotional_arc_stage = appendSceneCardText(next.emotional_arc_stage, [emotionalArcPlan.stage], 120)
      next.reader_emotion_goal = appendSceneCardText(next.reader_emotion_goal, [emotionalArcPlan.readerGoal], 360)
      next.reaction_structure = appendSceneCardText(next.reaction_structure, [emotionalArcPlan.reaction], 320)
      if (emotionalArcPlan.expectation) next.expectation_bridge = appendSceneCardText(next.expectation_bridge, [emotionalArcPlan.expectation], 260)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, emotionalArcActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, emotionalArcActions)
      if (index === firstIndex) next.required_beats = mergeSceneCardStringList(next.required_beats, [emotionalArcPlan.reaction])
      if (index === middleIndex) next.action_beats = mergeSceneCardStringList(next.action_beats, [emotionalArcPlan.reaction])
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, emotionalArcActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, [emotionalArcPlan.expectation])
      }
    }
    if (readerRetentionActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, readerRetentionActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, readerRetentionActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, readerRetentionActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, readerRetentionActions)
      }
    }
    if (readerPayoffActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, readerPayoffActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, readerPayoffActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, readerPayoffActions)
    }
    if (chapterAttractionActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterAttractionActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterAttractionActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterAttractionActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterAttractionActions)
    }
    if (storyDriveActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyDriveActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, storyDriveActions)
      next.conflict = appendSceneCardText(next.conflict, storyDriveActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, storyDriveActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyDriveActions)
    }
    if (storylineActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, storylineActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storylineActions)
      next.conflict = appendSceneCardText(next.conflict, storylineActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, storylineActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storylineActions)
    }
    if (characterArcActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterArcActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterArcActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterArcActions)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, characterArcActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, characterArcActions)
    }
    if (innovationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, innovationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, innovationActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, innovationActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, innovationActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, innovationActions)
    }
    if (volumeBeatActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, volumeBeatActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, volumeBeatActions)
      next.turning_point = appendSceneCardText(next.turning_point, volumeBeatActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, volumeBeatActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, volumeBeatActions)
    }
    if (coreDriftActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, coreDriftActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, coreDriftActions)
      next.conflict = appendSceneCardText(next.conflict, coreDriftActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, coreDriftActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, coreDriftActions)
    }
    if (timelineDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, timelineDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, timelineDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, timelineDeltaActions)
    }
    if (characterStateDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, characterStateDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterStateDeltaActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterStateDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, characterStateDeltaActions)
    }
    if (assetStateDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, assetStateDeltaActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetStateDeltaActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetStateDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, assetStateDeltaActions)
    }
    if (relationshipDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, relationshipDeltaActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, relationshipDeltaActions)
      next.character_voice = appendSceneCardText(next.character_voice, relationshipDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, relationshipDeltaActions)
    }
    if (chapterHandoffDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, chapterHandoffDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, chapterHandoffDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, chapterHandoffDeltaActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterHandoffDeltaActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHandoffDeltaActions)
      }
    }
    if (revisionCascadeActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, revisionCascadeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionCascadeActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionCascadeActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, revisionCascadeActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionCascadeActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, revisionCascadeActions)
      }
    }
    if (revisionContextActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, revisionContextActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, revisionContextActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, revisionContextActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionContextActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, revisionContextActions)
    }
    if (proseRevisionReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseRevisionReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, proseRevisionReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, proseRevisionReceiptActions)
      next.required_information = mergeSceneCardStringList(next.required_information, proseRevisionReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, proseRevisionReceiptActions)
    }
    if (revisionReceiptCheckActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionReceiptCheckActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionReceiptCheckActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionReceiptCheckActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionReceiptCheckActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, revisionReceiptCheckActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionReceiptCheckActions)
    }
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
