import {
  asArray,
  normalizeIssue,
} from '../../routes/novel-route-utils'
import {
  getContextContract,
} from '../context/context-contract'
import {
  normalizeDeliveryRiskReceipts,
} from '../post-delivery/delivery-risk-core'
import {
  normalizeFiveDimensionQualityScores,
} from '../quality/five-dimension-scores'
import {
  appendMissingContractReviewCheck,
  appendMissingNextChapterQualityPlanReceiptCheck,
  appendMissingStatusFilterReceiptCheck,
} from '../quality/missing-review-checks'
import {
  preDraftExecutionReceiptSections,
} from '../quality/pre-draft-receipt-sections'
import {
  buildFallbackNextChapterQualityPlan,
  normalizePerspectiveVerdicts,
} from '../quality/prose-quality-risks'
import {
  buildSourceReadinessChecks,
} from '../quality/state-tracking-contracts'
import {
  applyDeterministicWordCountIssueGuard,
} from '../quality/word-count-guard'
import {
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  buildDeslopGateDiagnostics,
} from '../../novel-writing/deterministic-prose-cleanup'
import {
  nextChapterQualityPlanNeedsRepair,
} from './prose-self-review-policy'
import {
  collectDeterministicProseSelfReviewChecks,
} from './prose-self-review-run-deterministic'

export function buildNormalizedProseSelfReview(args: {
  project: any
  contextPackage: any
  chapterText: string
  reviewPayload: any
  reviewResult: any
  options?: any
}) {
  const { project, contextPackage, chapterText, reviewPayload, reviewResult } = args
  const options = args.options || {}
  const {
    deterministicModelDegenerationChecks,
    deterministicProseMetaChecks,
    deterministicProseLanguageChecks,
    deterministicProseFormatChecks,
    deterministicBannedWordChecks,
    deterministicWeakAdverbDensityChecks,
    deterministicContextSensitiveWordDensityChecks,
    deterministicAuthorialForecastChecks,
    deterministicRepeatedSubjectChecks,
    deterministicTripleParallelChecks,
    deterministicRepeatedReactionChecks,
    deterministicUniformRhythmChecks,
    deterministicDialogueToneChecks,
    deterministicEndingSummaryChecks,
    deterministicOpeningHookChecks,
    deterministicOpeningFirst50Checks,
    deterministicOpeningEventDensityChecks,
    deterministicOpeningProtagonistDelayChecks,
    deterministicEntryPromiseChecks,
    deterministicOpeningConflictChecks,
    deterministicEndingHookChecks,
    deterministicSuddenEndingClueChecks,
    deterministicEndingContractChecks,
    deterministicOpeningHookEchoChecks,
    deterministicOpeningHookHardChecks,
    deterministicEndingHookHardChecks,
    deterministicOpeningHookEchoHardChecks,
    deterministicSceneCardChecks,
    deterministicSceneCardReceiptChecks,
    deterministicSceneDensityChecks,
    deterministicScenePurposeWeightChecks,
    deterministicSceneSensoryChecks,
    deterministicSceneSerialRiskRepairChecks,
    deterministicParagraphHookStallChecks,
    deterministicShockLayeringChecks,
    deterministicParagraphHookHardChecks,
    deterministicPayoffSetupChecks,
    deterministicFaceSlapRhythmChecks,
    deterministicEvidenceChainDumpChecks,
    deterministicFinalEvidenceImpactChecks,
    deterministicEvidenceTimeBombChecks,
    deterministicAntagonistDownfallAgencyChecks,
    deterministicReversalHardChecks,
    deterministicSuspenseFalseAlarmChecks,
    deterministicSuspenseWithheldInfoChecks,
    deterministicObscureSuspenseChecks,
    deterministicSuspenseHardChecks,
    deterministicExpectationVacuumChecks,
    deterministicParagraphProgressionChecks,
    deterministicSceneGoalObstacleChangeChecks,
    deterministicCombatProcessChecks,
    deterministicParagraphFragmentationChecks,
    deterministicParagraphLengthUniformityChecks,
    deterministicParagraphCommaChainDensityChecks,
    deterministicNarrativeTransitionChecks,
    deterministicProseMotionStillChecks,
    deterministicProseStackedDescriptionChecks,
    deterministicProseStaticEnvironmentChecks,
    deterministicProseDecorativeDetailChecks,
    deterministicVagueQuantityWeightChecks,
    deterministicSpecificCharacterCountChecks,
    deterministicProseCameraAnchorChecks,
    deterministicProseOmniscientCrowdCameraChecks,
    deterministicInfodumpChecks,
    deterministicRecapFillerChecks,
    deterministicNewConceptChecks,
    deterministicScaleAnchorChecks,
    deterministicEmotionTellingChecks,
    deterministicEmotionalStasisChecks,
    deterministicDownwardSafetyChecks,
    deterministicOppressionPurposeChecks,
    deterministicPayoffDensityChecks,
    deterministicPayoffEscalationChecks,
    deterministicTrumpCardEffectChecks,
    deterministicEmotionalArcChecks,
    deterministicUpgradeAftermathChecks,
    deterministicUpgradeRhythmChecks,
    deterministicInternalMonologueChecks,
    deterministicDialogueFormatChecks,
    deterministicDialogueQuoteStyleChecks,
    deterministicDialoguePowerBalanceChecks,
    deterministicDialogueProtagonistLineEconomyChecks,
    deterministicDialogueQuestionAnswerLoopChecks,
    deterministicDialogueJudgmentQuestionChecks,
    deterministicDialogueSubtextAgendaChecks,
    deterministicDialogueEmptyPraiseChecks,
    deterministicDialogueEmotionContinuityChecks,
    deterministicDialogueEasyPersuasionChecks,
    deterministicDialogueVoiceSamenessChecks,
    deterministicDialogueBreathChecks,
    deterministicDialogueDensityChecks,
    deterministicDialogueInfodumpChecks,
    deterministicDialogueHardChecks,
    deterministicProtagonistComposureChecks,
    deterministicCharacterBehaviorChecks,
    deterministicRelationshipSceneChangeChecks,
    deterministicContinuityHeatChecks,
    deterministicCharacterRelationChecks,
    deterministicAssetLinkageChecks,
    deterministicStateTrackingChecks,
    deterministicChapterHandoffChecks,
    deterministicPunctuationToneChecks,
    deterministicPeriodMonotonyChecks,
    deterministicBlueprintCraftChecks,
    deterministicCharacterOrderChecks,
    deterministicBeatSequenceChecks,
    deterministicCostRewardChecks,
    deterministicIntentConfirmationChecks,
    deterministicLocalVictoryCostChecks,
    deterministicShowdownHardChecks,
    deterministicBridgeUnitChecks,
    deterministicPlotDynamicsChecks,
    deterministicBenchmarkRecallChecks,
    deterministicGoldenThreeChecks,
    deterministicTargetReaderChecks,
    deterministicGenrePositioningChecks,
    deterministicCoreContractChecks,
    deterministicFemaleAudienceChecks,
    deterministicConflictStructureChecks,
    deterministicProseCraftHardChecks,
    deterministicPunctuationToneHardChecks,
    deterministicQualityAuditHardChecks,
  } = collectDeterministicProseSelfReviewChecks(project, contextPackage, chapterText)
  const normalizedDeslopChecks = [
    ...(Array.isArray(reviewPayload?.deslop_checks)
      ? reviewPayload.deslop_checks
      : Array.isArray(reviewPayload?.deslopChecks)
        ? reviewPayload.deslopChecks
        : []),
    ...deterministicBannedWordChecks,
    ...deterministicWeakAdverbDensityChecks,
    ...deterministicContextSensitiveWordDensityChecks,
    ...deterministicAuthorialForecastChecks,
    ...deterministicRepeatedSubjectChecks,
    ...deterministicTripleParallelChecks,
    ...deterministicRepeatedReactionChecks,
    ...deterministicUniformRhythmChecks,
    ...deterministicDialogueToneChecks,
    ...deterministicEndingSummaryChecks,
  ]
  const reviewChecks = (snakeField: string, camelField: string) => Array.isArray(reviewPayload?.[snakeField])
    ? reviewPayload[snakeField]
    : Array.isArray(reviewPayload?.[camelField])
      ? reviewPayload[camelField]
      : []
  const reviewPayloadDeliveryReceipts = reviewPayload?.oh_story_delivery_receipts || reviewPayload?.ohStoryDeliveryReceipts || {}
  const reviewNextChapterQualityPlan = reviewPayload?.next_chapter_quality_plan
    || reviewPayload?.nextChapterQualityPlan
    || reviewPayloadDeliveryReceipts?.next_chapter_quality_plan
    || reviewPayloadDeliveryReceipts?.nextChapterQualityPlan
    || null
  const emitMissingStructuredContractChecks = options.fill_missing_structured_checks !== false
  const requiredContractChecks = (
    checkField: string,
    camelField: string,
    contractField: string,
    label: string,
  ) => appendMissingContractReviewCheck(
    reviewChecks(checkField, camelField),
    getContextContract(contextPackage, contractField),
    checkField,
    contractField,
    label,
    { emit_missing_check: emitMissingStructuredContractChecks },
  )
  const preDraftReceiptChecks = (checksForSection: (section: any) => any[]) => preDraftExecutionReceiptSections(reviewPayload)
    .flatMap(checksForSection)
    .map((check: any) => ({
      ...check,
      status: check?.status || (check?.delivered === false || revisionReceiptRemainingRisk(check) ? 'fail' : 'pass'),
    }))
  const statusFilterReceiptChecks = preDraftReceiptChecks((section: any) => asArray(section?.status_filter_receipts || section?.statusFilterReceipts))
    .map((check: any) => ({
      ...check,
      key: check?.key || 'status_filter_receipt',
      label: check?.label || '状态筛选回执',
      evidence: check?.evidence || check?.excluded_reason || check?.excludedReason || check?.remaining_risk || check?.remainingRisk,
      fix: check?.fix || check?.remaining_risk || check?.remainingRisk || '补充状态筛选回执，说明该状态是否影响本章正确性。',
    }))
  const rawReviewScore = Number(reviewPayload?.score)
  const reviewScoreDefaulted = !Number.isFinite(rawReviewScore)
  const rawReviewIssues = [
    ...asArray(reviewPayload?.issues),
    ...asArray(reviewPayload?.findings),
  ].map(normalizeIssue)
  const deterministicWordCountIssueGuard = applyDeterministicWordCountIssueGuard(
    rawReviewIssues,
    reviewScoreDefaulted ? 80 : rawReviewScore,
    chapterText,
    contextPackage?.chapter_target?.word_target
      || contextPackage?.chapterTarget?.word_target
      || contextPackage?.chapter_target?.wordTarget
      || contextPackage?.chapterTarget?.wordTarget
      || resolveChapterWordTarget(project, contextPackage?.chapter_target || contextPackage?.chapterTarget || {}),
    Number(options.quality_threshold || options.qualityThreshold || 0),
  )
  // Source guard anchor: const normalizedReview = {
  let normalizedReview: any = {
    // Source guards: these raw model fields are consumed through requiredContractChecks.
    // reviewPayload?.reader_retention_checks reviewPayload?.target_reader_checks reviewPayload?.genre_positioning_checks reviewPayload?.plot_special_topics_checks reviewPayload?.core_contract_checks reviewPayload?.female_audience_checks reviewPayload?.upgrade_rhythm_checks reviewPayload?.conflict_structure_checks
    // reviewPayload?.dialogue_checks reviewPayload?.plot_dynamics_checks reviewPayload?.story_power_checks reviewPayload?.continuity_heat_checks reviewPayload?.character_relation_checks
    // reviewPayload?.character_behavior_checks reviewPayload?.asset_linkage_checks reviewPayload?.state_tracking_checks reviewPayload?.source_readiness_checks reviewPayload?.chapter_handoff_checks
    // reviewPayload?.intent_confirmation_checks reviewPayload?.information_flow_checks reviewPayload?.expectation_threshold_checks reviewPayload?.story_loop_checks
    // reviewPayload?.emotional_arc_checks reviewPayload?.chapter_hook_checks reviewPayload?.chapter_hook_quality_checks reviewPayload?.paragraph_hook_checks reviewPayload?.suspense_checks
    // reviewPayload?.reversal_checks reviewPayload?.showdown_checks reviewPayload?.bridge_unit_checks reviewPayload?.style_boundary_checks reviewPayload?.style_sample_checks reviewPayload?.opening_checks reviewPayload?.prose_craft_checks reviewPayload?.punctuation_tone_checks reviewPayload?.quality_audit_checks
    passed: reviewPayload?.passed !== false,
    score: reviewScoreDefaulted ? 80 : deterministicWordCountIssueGuard.score,
    score_defaulted: reviewScoreDefaulted,
    issues: deterministicWordCountIssueGuard.issues,
    deterministic_word_count_issue_guard: deterministicWordCountIssueGuard.ignored_issues.length > 0
      ? deterministicWordCountIssueGuard
      : undefined,
    revision_directives: Array.isArray(reviewPayload?.revision_directives)
      ? reviewPayload.revision_directives.map((item: any) => String(item))
      : Array.isArray(reviewPayload?.revisionDirectives)
        ? reviewPayload.revisionDirectives.map((item: any) => String(item))
        : [],
    craft_metrics: reviewPayload?.craft_metrics || reviewPayload?.craftMetrics || {},
    five_dimension_scores: normalizeFiveDimensionQualityScores(
      reviewPayload?.five_dimension_scores
      || reviewPayload?.fiveDimensionScores
      || reviewPayload?.five_dimensions
      || reviewPayload?.fiveDimensions
      || reviewPayload?.quality_audit_scores
      || reviewPayload?.qualityAuditScores,
    ),
    focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes)
      ? reviewPayload.focused_revision_modes.map((item: any) => String(item))
      : Array.isArray(reviewPayload?.focusedRevisionModes)
        ? reviewPayload.focusedRevisionModes.map((item: any) => String(item))
        : [],
    setting_violations: Array.isArray(reviewPayload?.setting_violations)
      ? reviewPayload.setting_violations
      : Array.isArray(reviewPayload?.settingViolations)
        ? reviewPayload.settingViolations
        : [],
    rubric: String(reviewPayload?.rubric || contextPackage?.chapter_target?.platform_rubric?.platform || contextPackage?.platform_rubric?.platform || ''),
    rubric_source: String(reviewPayload?.rubric_source || reviewPayload?.rubricSource || contextPackage?.chapter_target?.platform_rubric?.source || contextPackage?.platform_rubric?.source || ''),
    platform_checks: Array.isArray(reviewPayload?.platform_checks)
      ? reviewPayload.platform_checks
      : Array.isArray(reviewPayload?.platformChecks)
        ? reviewPayload.platformChecks
        : [],
    content_rubric_source: String(reviewPayload?.content_rubric_source || reviewPayload?.contentRubricSource || contextPackage?.chapter_target?.content_rubric?.source || contextPackage?.content_rubric?.source || ''),
    content_rubric_checks: Array.isArray(reviewPayload?.content_rubric_checks)
      ? reviewPayload.content_rubric_checks
      : Array.isArray(reviewPayload?.contentRubricChecks)
        ? reviewPayload.contentRubricChecks
        : [],
    factual_checks: reviewChecks('factual_checks', 'factualChecks'),
    model_degeneration_checks: [
      ...asArray(reviewPayload?.model_degeneration_checks || reviewPayload?.modelDegenerationChecks),
      ...deterministicModelDegenerationChecks,
    ],
    chapter_positioning_checks: reviewChecks('chapter_positioning_checks', 'chapterPositioningChecks'),
    innovation_checks: asArray(reviewPayload?.innovation_checks || reviewPayload?.innovationChecks),
    chapter_attraction_checks: asArray(reviewPayload?.chapter_attraction_checks || reviewPayload?.chapterAttractionChecks),
    story_drive_checks: asArray(reviewPayload?.story_drive_checks || reviewPayload?.storyDriveChecks),
    character_arc_checks: asArray(reviewPayload?.character_arc_checks || reviewPayload?.characterArcChecks),
    chapter_benchmark_checks: asArray(reviewPayload?.chapter_benchmark_checks || reviewPayload?.chapterBenchmarkChecks),
    title_uniqueness_checks: asArray(reviewPayload?.title_uniqueness_checks || reviewPayload?.titleUniquenessChecks),
    banned_words_checks: asArray(reviewPayload?.banned_words_checks || reviewPayload?.bannedWordsChecks),
    blueprint_consumption_checks: asArray(reviewPayload?.blueprint_consumption_checks || reviewPayload?.blueprintConsumptionChecks),
    word_count_checks: asArray(reviewPayload?.word_count_checks || reviewPayload?.wordCountChecks),
    reader_retention_checks: requiredContractChecks('reader_retention_checks', 'readerRetentionChecks', 'reader_retention_brief', '追读雷达'),
    target_reader_checks: [...requiredContractChecks('target_reader_checks', 'targetReaderChecks', 'target_reader_contract', '目标读者'), ...deterministicTargetReaderChecks],
    genre_positioning_checks: [...requiredContractChecks('genre_positioning_checks', 'genrePositioningChecks', 'genre_positioning_contract', '题材定位'), ...deterministicGenrePositioningChecks],
    plot_special_topics_checks: requiredContractChecks('plot_special_topics_checks', 'plotSpecialTopicsChecks', 'plot_special_topics_contract', '特殊题材'),
    core_contract_checks: [...reviewChecks('core_contract_checks', 'coreContractChecks'), ...deterministicCoreContractChecks],
    female_audience_checks: [...requiredContractChecks('female_audience_checks', 'femaleAudienceChecks', 'female_audience_contract', '女频长篇'), ...deterministicFemaleAudienceChecks],
    upgrade_rhythm_checks: [...requiredContractChecks('upgrade_rhythm_checks', 'upgradeRhythmChecks', 'upgrade_rhythm_contract', '升级节奏'), ...deterministicUpgradeAftermathChecks, ...deterministicUpgradeRhythmChecks],
    structure_checks: asArray(reviewPayload?.structure_checks || reviewPayload?.structureChecks),
    progression_checks: asArray(reviewPayload?.progression_checks || reviewPayload?.progressionChecks),
    information_checks: asArray(reviewPayload?.information_checks || reviewPayload?.informationChecks),
    conflict_structure_checks: [...requiredContractChecks('conflict_structure_checks', 'conflictStructureChecks', 'conflict_structure_contract', '冲突结构'), ...deterministicConflictStructureChecks],
    perspective_verdicts: normalizePerspectiveVerdicts(reviewPayload?.perspective_verdicts || reviewPayload?.perspectiveVerdicts),
    deslop_level: String(reviewPayload?.deslop_level || reviewPayload?.deslopLevel || ''),
    deslop_checks: normalizedDeslopChecks,
    deslop_gate_diagnostics: buildDeslopGateDiagnostics(normalizedDeslopChecks),
    deterministic_prose_cleanup: options.deterministic_prose_cleanup || reviewPayload?.deterministic_prose_cleanup || reviewPayload?.deterministicProseCleanup || null,
    prose_meta_checks: [
      ...(Array.isArray(reviewPayload?.prose_meta_checks)
        ? reviewPayload.prose_meta_checks
        : Array.isArray(reviewPayload?.proseMetaChecks)
          ? reviewPayload.proseMetaChecks
          : []),
      ...deterministicProseMetaChecks,
    ],
    dialogue_checks: [
      ...requiredContractChecks('dialogue_checks', 'dialogueChecks', 'dialogue_contract', '对白质量'),
      ...deterministicDialogueFormatChecks,
      ...deterministicDialogueQuoteStyleChecks,
      ...deterministicDialoguePowerBalanceChecks,
      ...deterministicDialogueProtagonistLineEconomyChecks,
      ...deterministicDialogueQuestionAnswerLoopChecks,
      ...deterministicDialogueJudgmentQuestionChecks,
      ...deterministicDialogueSubtextAgendaChecks,
      ...deterministicDialogueEmptyPraiseChecks,
      ...deterministicDialogueEmotionContinuityChecks,
      ...deterministicDialogueEasyPersuasionChecks,
      ...deterministicDialogueVoiceSamenessChecks,
      ...deterministicDialogueBreathChecks,
      ...deterministicDialogueDensityChecks,
      ...deterministicDialogueInfodumpChecks,
      ...deterministicDialogueHardChecks,
    ],
    plot_dynamics_checks: [...requiredContractChecks('plot_dynamics_checks', 'plotDynamicsChecks', 'plot_dynamics_contract', '剧情动力'), ...deterministicLocalVictoryCostChecks, ...deterministicPlotDynamicsChecks],
    story_power_checks: requiredContractChecks('story_power_checks', 'storyPowerChecks', 'story_power_contract', '故事力'),
    mainline_definition_checks: requiredContractChecks('mainline_definition_checks', 'mainlineDefinitionChecks', 'mainline_definition_contract', '主线定义'),
    continuity_heat_checks: [...requiredContractChecks('continuity_heat_checks', 'continuityHeatChecks', 'continuity_heat_contract', '连续性热度'), ...deterministicContinuityHeatChecks],
    character_relation_checks: [...requiredContractChecks('character_relation_checks', 'characterRelationChecks', 'character_relation_contract', '角色关系'), ...deterministicRelationshipSceneChangeChecks, ...deterministicCharacterRelationChecks],
    character_behavior_checks: [...requiredContractChecks('character_behavior_checks', 'characterBehaviorChecks', 'character_behavior_contract', '角色行为'), ...deterministicProtagonistComposureChecks, ...deterministicCharacterBehaviorChecks],
    asset_linkage_checks: [...requiredContractChecks('asset_linkage_checks', 'assetLinkageChecks', 'asset_linkage_contract', '资产挂钩'), ...deterministicAssetLinkageChecks],
    state_tracking_checks: [
      ...appendMissingStatusFilterReceiptCheck(
        [
          ...requiredContractChecks('state_tracking_checks', 'stateTrackingChecks', 'state_tracking_contract', '状态跟踪'),
          ...statusFilterReceiptChecks,
        ],
        getContextContract(contextPackage, 'state_tracking_contract'),
        statusFilterReceiptChecks,
      ),
      ...deterministicStateTrackingChecks,
    ],
    status_filter_receipts: [
      ...asArray(reviewPayload?.status_filter_receipts || reviewPayload?.statusFilterReceipts),
      ...statusFilterReceiptChecks,
    ],
    story_state_update_checks: reviewChecks('story_state_update_checks', 'storyStateUpdateChecks'),
    foreshadowing_delta_checks: reviewChecks('foreshadowing_delta_checks', 'foreshadowingDeltaChecks'),
    source_readiness_checks: (() => {
      const deterministicSourceReadinessChecks = buildSourceReadinessChecks(contextPackage)
      return [
        ...appendMissingContractReviewCheck(
          [
            ...reviewChecks('source_readiness_checks', 'sourceReadinessChecks'),
            ...preDraftReceiptChecks((section: any) => asArray(section?.source_readiness_checks || section?.sourceReadinessChecks)),
          ],
          getContextContract(contextPackage, 'state_tracking_contract'),
          'source_readiness_checks',
          'state_tracking_contract',
          '来源就绪',
          { emit_missing_check: emitMissingStructuredContractChecks },
        ),
        ...deterministicSourceReadinessChecks,
      ]
    })(),
    artifact_protocol_receipts: [
      ...asArray(reviewPayload?.artifact_protocol_receipts || reviewPayload?.artifactProtocolReceipts),
      ...preDraftReceiptChecks((section: any) => asArray(section?.artifact_protocol_receipts || section?.artifactProtocolReceipts)),
    ],
    write_preparation_checks: [
      ...appendMissingContractReviewCheck(
        [
          ...asArray(reviewPayload?.write_preparation_checks || reviewPayload?.writePreparationChecks),
          ...preDraftReceiptChecks((section: any) => asArray(section?.write_preparation_checks || section?.writePreparationChecks)),
        ],
        getContextContract(contextPackage, 'write_preparation_brief'),
        'write_preparation_checks',
        'write_preparation_brief',
        '写前准备',
        { emit_missing_check: emitMissingStructuredContractChecks },
      ),
    ],
    next_chapter_quality_plan_receipts: [
      ...appendMissingNextChapterQualityPlanReceiptCheck(
        [
          ...asArray(reviewPayload?.next_chapter_quality_plan_receipts || reviewPayload?.nextChapterQualityPlanReceipts),
          ...preDraftReceiptChecks((section: any) => asArray(section?.next_chapter_quality_plan_receipts || section?.nextChapterQualityPlanReceipts)),
        ],
        contextPackage,
      ),
    ],
    chapter_handoff_checks: [...requiredContractChecks('chapter_handoff_checks', 'chapterHandoffChecks', 'chapter_handoff_contract', '章首承接'), ...deterministicChapterHandoffChecks],
    intent_confirmation_checks: [
      ...requiredContractChecks('intent_confirmation_checks', 'intentConfirmationChecks', 'intent_confirmation_contract', '意图确认'),
      ...preDraftReceiptChecks((section: any) => asArray(section?.intent_confirmation_checks || section?.intentConfirmationChecks)),
      ...deterministicCharacterOrderChecks,
      ...deterministicBeatSequenceChecks,
      ...deterministicCostRewardChecks,
      ...deterministicIntentConfirmationChecks,
    ],
    benchmark_recall_checks: [
      ...requiredContractChecks('benchmark_recall_checks', 'benchmarkRecallChecks', 'benchmark_recall_brief', '文风召回'),
      ...preDraftReceiptChecks((section: any) => asArray(section?.benchmark_recall_checks || section?.benchmarkRecallChecks)),
      ...deterministicBenchmarkRecallChecks,
    ],
    style_boundary_checks: requiredContractChecks('style_boundary_checks', 'styleBoundaryChecks', 'style_boundary_contract', '文风覆盖边界'),
    style_sample_checks: [
      ...requiredContractChecks('style_sample_checks', 'styleSampleChecks', 'style_sample_strategy', '样章策略'),
      ...preDraftReceiptChecks((section: any) => asArray(section?.style_sample_checks || section?.styleSampleChecks)),
    ],
    information_flow_checks: requiredContractChecks('information_flow_checks', 'informationFlowChecks', 'information_flow_contract', '信息团衔接'),
    expectation_threshold_checks: [...requiredContractChecks('expectation_threshold_checks', 'expectationThresholdChecks', 'expectation_threshold_contract', '期待门槛'), ...deterministicExpectationVacuumChecks],
    story_loop_checks: requiredContractChecks('story_loop_checks', 'storyLoopChecks', 'story_loop_contract', '故事循环'),
    emotional_arc_checks: [...requiredContractChecks('emotional_arc_checks', 'emotionalArcChecks', 'emotional_arc_contract', '情绪弧'), ...deterministicEmotionalStasisChecks, ...deterministicDownwardSafetyChecks, ...deterministicOppressionPurposeChecks, ...deterministicPayoffDensityChecks, ...deterministicPayoffEscalationChecks, ...deterministicTrumpCardEffectChecks, ...deterministicEmotionalArcChecks],
    chapter_hook_checks: [...requiredContractChecks('chapter_hook_checks', 'chapterHookChecks', 'chapter_hook_contract', '章级钩子'), ...deterministicEndingHookChecks, ...deterministicSuddenEndingClueChecks, ...deterministicEndingContractChecks, ...deterministicOpeningHookEchoChecks, ...deterministicOpeningHookHardChecks, ...deterministicEndingHookHardChecks, ...deterministicOpeningHookEchoHardChecks],
    chapter_hook_quality_checks: requiredContractChecks('chapter_hook_quality_checks', 'chapterHookQualityChecks', 'chapter_hook_contract', '章钩质量'),
    paragraph_hook_checks: [...requiredContractChecks('paragraph_hook_checks', 'paragraphHookChecks', 'paragraph_hook_contract', '段落级钩子'), ...deterministicParagraphHookStallChecks, ...deterministicShockLayeringChecks, ...deterministicParagraphHookHardChecks],
    suspense_checks: [...requiredContractChecks('suspense_checks', 'suspenseChecks', 'suspense_contract', '悬念编排'), ...deterministicSuspenseFalseAlarmChecks, ...deterministicSuspenseWithheldInfoChecks, ...deterministicObscureSuspenseChecks, ...deterministicSuspenseHardChecks],
    reversal_checks: [...requiredContractChecks('reversal_checks', 'reversalChecks', 'reversal_contract', '反转设计'), ...deterministicFaceSlapRhythmChecks, ...deterministicEvidenceChainDumpChecks, ...deterministicFinalEvidenceImpactChecks, ...deterministicEvidenceTimeBombChecks, ...deterministicAntagonistDownfallAgencyChecks, ...deterministicReversalHardChecks],
    showdown_checks: [...requiredContractChecks('showdown_checks', 'showdownChecks', 'showdown_contract', '高潮对抗'), ...deterministicShowdownHardChecks],
    bridge_unit_checks: [...requiredContractChecks('bridge_unit_checks', 'bridgeUnitChecks', 'bridge_unit_contract', '桥段节奏'), ...deterministicBridgeUnitChecks],
    opening_checks: [...requiredContractChecks('opening_checks', 'openingChecks', 'opening_contract', '开篇设计'), ...deterministicOpeningHookChecks, ...deterministicOpeningFirst50Checks, ...deterministicOpeningEventDensityChecks, ...deterministicOpeningProtagonistDelayChecks, ...deterministicEntryPromiseChecks, ...deterministicOpeningConflictChecks],
    prose_craft_checks: [...requiredContractChecks('prose_craft_checks', 'proseCraftChecks', 'prose_craft_contract', '正文工艺'), ...deterministicEmotionTellingChecks, ...deterministicInternalMonologueChecks, ...deterministicCombatProcessChecks, ...deterministicParagraphFragmentationChecks, ...deterministicParagraphLengthUniformityChecks, ...deterministicParagraphCommaChainDensityChecks, ...deterministicNarrativeTransitionChecks, ...deterministicSceneDensityChecks, ...deterministicSceneSensoryChecks, ...deterministicProseMotionStillChecks, ...deterministicProseStackedDescriptionChecks, ...deterministicProseStaticEnvironmentChecks, ...deterministicProseDecorativeDetailChecks, ...deterministicVagueQuantityWeightChecks, ...deterministicSpecificCharacterCountChecks, ...deterministicProseCameraAnchorChecks, ...deterministicProseOmniscientCrowdCameraChecks, ...deterministicBlueprintCraftChecks, ...deterministicProseCraftHardChecks],
    serial_risk_repair_checks: [
      ...asArray(reviewPayload?.serial_risk_repair_checks || reviewPayload?.serialRiskRepairChecks),
      ...deterministicSceneSerialRiskRepairChecks,
    ],
    revision_receipt_checks: asArray(reviewPayload?.revision_receipt_checks || reviewPayload?.revisionReceiptChecks),
    deslop_repair_checks: asArray(reviewPayload?.deslop_repair_checks || reviewPayload?.deslopRepairChecks),
    punctuation_tone_checks: [...requiredContractChecks('punctuation_tone_checks', 'punctuationToneChecks', 'punctuation_tone_contract', '语气标点'), ...deterministicPunctuationToneChecks, ...deterministicPeriodMonotonyChecks, ...deterministicPunctuationToneHardChecks],
    quality_audit_checks: [
      ...requiredContractChecks('quality_audit_checks', 'qualityAuditChecks', 'quality_audit_contract', '质量诊断'),
      ...deterministicModelDegenerationChecks,
      ...deterministicProseLanguageChecks,
      ...deterministicProseFormatChecks,
      ...deterministicSceneCardChecks,
      ...deterministicSceneCardReceiptChecks,
      ...deterministicScenePurposeWeightChecks,
      ...deterministicParagraphProgressionChecks,
      ...deterministicSceneGoalObstacleChangeChecks,
      ...deterministicInfodumpChecks,
      ...deterministicRecapFillerChecks,
      ...deterministicNewConceptChecks,
      ...deterministicScaleAnchorChecks,
      ...deterministicBlueprintCraftChecks,
      ...deterministicPayoffSetupChecks,
      ...deterministicGoldenThreeChecks,
      ...deterministicQualityAuditHardChecks,
    ],
    longform_checks: asArray(reviewPayload?.longform_checks || reviewPayload?.longformChecks),
    delivery_risk_receipts: normalizeDeliveryRiskReceipts(reviewPayload, contextPackage, chapterText),
    next_chapter_quality_plan: reviewNextChapterQualityPlan,
    quality_gate: options.quality_gate || options.qualityGate || reviewPayload?.quality_gate || reviewPayload?.qualityGate || null,
    quality_threshold: options.quality_threshold || options.qualityThreshold || reviewPayload?.quality_threshold || reviewPayload?.qualityThreshold || null,
    needs_revision: Boolean(reviewPayload?.needs_revision ?? reviewPayload?.needsRevision),
    modelName: (reviewResult as any).modelName,
  }
  if (nextChapterQualityPlanNeedsRepair(normalizedReview)) {
    normalizedReview.next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(normalizedReview, contextPackage, chapterText)
  }
  return normalizedReview
}
