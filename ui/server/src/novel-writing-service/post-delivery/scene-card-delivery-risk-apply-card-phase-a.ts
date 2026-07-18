/** Delivery-risk carry-over phase a. */
import {
  appendSceneCardText,
  characterRelationSceneProgressionPlan,
  emotionalArcSceneExecutionPlan,
  mergeSceneCardStringList,
} from './scene-card-delivery-risk'

export function applyDeliveryRiskCarryOverPhaseA(next: any, index: number, ctx: Record<string, any>) {
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
  return next
}
