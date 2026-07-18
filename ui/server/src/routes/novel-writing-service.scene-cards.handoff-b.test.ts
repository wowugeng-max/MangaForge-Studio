import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  listNovelChapters,
  listNovelCharacters,
  listChapterVersions,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import {
  buildCommercialEditorRewritePrompt,
  buildChapterPreDraftBrief,
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
  buildChapterCoreDriftReport,
  buildCoreContractSyncReport,
  buildChapterAttractionReviewReport,
  buildChapterHandoffSyncReport,
  buildDeslopGateDiagnostics,
  appendMissingContractReviewCheck,
  appendMissingStatusFilterReceiptCheck,
  getContextContract,
  hasFailingReviewChecks,
  hasReviewChecksNeedingRepair,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildInformationFlowSyncReport,
  buildExpectationThresholdSyncReport,
  buildEmotionalArcSyncReport,
  buildChapterHookSyncReport,
  buildParagraphHookSyncReport,
  buildSuspenseSyncReport,
  buildReversalSyncReport,
  buildShowdownSyncReport,
  buildBridgeUnitSyncReport,
  buildBeatCoolingSyncReport,
  buildOpeningSyncReport,
  buildProseCraftSyncReport,
  buildPunctuationToneSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRevisionContextReceiptSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildStatusFilterReceiptSyncReport,
  buildWritePreparationReceiptSyncReport,
  buildArtifactProtocolReceiptSyncReport,
  buildQualityAuditSyncReport,
  buildDialogueSyncReport,
  buildCharacterBehaviorSyncReport,
  buildAssetLinkageSyncReport,
  buildStateTrackingSyncReport,
  buildIntentConfirmationSyncReport,
  buildContinuityHeatSyncReport,
  buildConflictStructureSyncReport,
  buildUpgradeRhythmSyncReport,
  buildTargetReaderSyncReport,
  buildGenrePositioningSyncReport,
  buildFemaleAudienceSyncReport,
  buildPlotDynamicsSyncReport,
  buildStoryPowerSyncReport,
  buildCharacterRelationSyncReport,
  buildCharacterArcSyncReport,
  buildDeliveryRiskCarryOverContext,
  buildDeliveryRiskReceiptSyncReport,
  normalizeDeliveryRiskReceipts,
  uniqueDeliveryRiskReceipts,
  buildReaderExpectationDebtContext,
  buildInnovationSyncReport,
  buildSignatureSceneSyncReport,
  buildSceneCardReceiptSyncReport,
  buildChapterBlueprintSyncReport,
  buildChapterBenchmarkSyncReport,
  buildBenchmarkRecallSyncReport,
  buildStyleBoundarySyncReport,
  scanBenchmarkRecallExecutionRisks,
  buildStyleSampleSyncReport,
  buildStyleSampleEffectivenessForSelection,
  buildFirst30RetentionContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildSerialMomentumBrief,
  buildSerialQualityRegressionBrief,
  buildRevisionStrategyBrief,
  normalizeFiveDimensionQualityScores,
  resolveEffectiveQualityThreshold,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  buildStoryStateSyncContextPackage,
  buildStyleFingerprintStateSnapshot,
  buildSceneCardConsumptionChecks,
  scanSceneCardReceiptRisks,
  verifiedSceneBreakdownForStateSync,
  selectVerifiedSceneBreakdownUpdate,
  buildMemePolishPrompt,
  buildReadabilityReviewPrompt,
  scanAuthorialForecastRisks,
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
  scanDialogueBreathRisks,
  scanDialogueDensityRisks,
  scanDialogueInfodumpRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueEmptyPraiseRisks,
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
  scanDialogueFormatRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
  scanDialogueQuoteStyleRisks,
  scanDialogueSubtextAgendaRisks,
  scanDialogueToneRisks,
  scanDialogueVoiceSamenessRisks,
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
  scanUpgradeAftermathRisks,
  scanInternalMonologueRisks,
  scanEndingHookRisks,
  scanSuddenEndingClueRisks,
  scanEndingSummaryRisks,
  scanExpectationVacuumRisks,
  scanInfodumpRisks,
  scanRecapFillerRisks,
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookRisks,
  scanOpeningHookEchoRisks,
  scanOpeningProtagonistDelayRisks,
  scanParagraphHookStallRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFinalEvidenceImpactRisks,
  scanAntagonistDownfallAgencyRisks,
  scanFaceSlapRhythmRisks,
  scanProtagonistComposureRisks,
  scanPayoffSetupRisks,
  buildPayoffSetupSyncReport,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
  buildSpectatorReactionSyncReport,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
  scanObscureSuspenseRisks,
  scanRelationshipSceneChangeRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphProgressionRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanSceneDensityExecutionRisks,
  scanScenePurposeWeightRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  scanCombatProcessRisks,
  scanPeriodMonotonyRisks,
  scanPunctuationToneRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseStaticEnvironmentRisks,
  scanProseMotionStillRisks,
  scanProseStackedDescriptionRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanProseFormatRisks,
  scanProseMetaLeaks,
  scanModelDegenerationRisks,
  buildProseMetaSyncReport,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  scanBeatSequenceExecutionRisks,
  scanEndingContractExecutionRisks,
  scanCostRewardExecutionRisks,
  scanLocalVictoryCostRisks,
  scanGoldenThreeExecutionRisks,
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanEconomicPowerScaleAnchorRisks,
  scanVagueQuantityWeightRisks,
  scanNewConceptOverloadRisks,
  scanNewConceptAnchorRisks,
  buildSourceReadinessChecks,
  buildSourceReadinessPreflightChecks,
  resolveSerialStoryStateReadiness,
  buildSourceReadinessSyncReport,
  scanUniformRhythmRisks,
  buildStorylineSyncReport,
  buildStateDeltaCompletenessReport,
  buildForeshadowingDeltaSyncReport,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildAssetStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildProseRevisionReceiptSyncReport,
  applyDeterministicWordCountIssueGuard,
  mergeProseRevisionArtifacts,
  mergeQualityRecheckReviewWithStructuredEvidence,
  mergePostDeliveryReceiptSyncIntoQualityGateReview,
  mergeStructuredReviewFillPayload,
  buildDeslopRepairReceiptSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildRevisionScopeGuardSyncReport,
  normalizeDeterministicProseFormat,
  normalizeDeterministicProsePunctuation,
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
  buildMergedLayeredMemoryContext,
  applyStyleSampleStrategyAuthorAction,
  applyChapterWordTargetToContext,
  buildProseWordTargetExpansionPrompt,
  countProseChars,
  compileParagraphProseContext,
  createNovelWritingService,
  evaluateProseWordTarget,
  extractProseExpansionPayload,
  mergeConfirmedPreDraftBriefIntoContext,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  normalizeMemeBank,
  normalizeChapterBenchmarkSampleBank,
  normalizeStyleSampleBank,
  normalizeSceneCardsPayload,
  proseMaxTokensForWordTarget,
  prepareProseGenerationContract,
  mergeFinalStateTrackingContract,
  mergeFinalRepairPreDraftRawPayload,
  repairBenchmarkRecallSourcePathState,
  resolveChapterWordTarget,
} from './novel-writing-service'
import { buildLLMResultDiagnostics, buildPreflightChecks, deepMergeObjects, extractPlainProseFallback, formatReviewIssueForStorage, getNovelPayload, getQualityGateDecision, getStyleLock, normalizeIssue } from './novel-route-utils'
import { buildProseGenerationContract } from '../novel-writing/prose-generation-contract'
import { buildProsePromptContextSnapshot } from '../novel-writing/prose-prompt-context'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildPipelineProse, createProsePipelineHarness as createProsePipelineHarnessWithService, proseQualityScores } from './novel-writing-service.test-support'
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('normalizeSceneCardsPayload handoff b', () => {
  test('detects false suspense when a threat is immediately dismissed without cost', () => {
    const checks = scanSuspenseFalseAlarmRisks([
      '第9章 红灯',
      '',
      '广播忽然响起：“十秒后核验身份，失败者会被清除。”',
      '',
      '李辰刚把学生证按上去，感应区亮起刺眼红光。',
      '',
      '不过那只是系统误报，红光很快自己熄灭，大家都松了一口气。',
      '',
      '他们继续往楼上走。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('false_suspense_immediate_release_1_3')
    expect(checks[0].label).toBe('假悬念扫描')
    expect(checks[0].evidence).toContain('失败者会被清除')
    expect(checks[0].evidence).toContain('只是系统误报')
    expect(checks[0].fix).toContain('不能立刻解除')
    expect(checks[0].fix).toContain('新困境')
  })
  test('wires deterministic false suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuspenseFalseAlarmChecks = scanSuspenseFalseAlarmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuspenseFalseAlarmChecks')
  })
  test('detects withheld suspense information without story reason cost or clue', () => {
    const checks = scanSuspenseWithheldInfoRisks([
      '第9章 门后名字',
      '',
      '李辰追问：“名单上第三个名字到底是谁？”',
      '',
      '管理员摇头：“现在还不能说。”',
      '',
      '张智皱眉：“为什么不能说？”',
      '',
      '管理员只说：“以后你会知道的。”',
      '',
      '两人只能继续往前走。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('withheld_suspense_without_cost_2_5')
    expect(checks[0].label).toBe('谜语人悬念扫描')
    expect(checks[0].evidence).toContain('现在还不能说')
    expect(checks[0].fix).toContain('故事内理由')
    expect(checks[0].fix).toContain('代价')
    expect(checks[0].fix).toContain('线索')
  })
  test('does not flag withheld information when delay has reason cost and a clue', () => {
    const checks = scanSuspenseWithheldInfoRisks([
      '第9章 门后名字',
      '',
      '李辰追问：“名单上第三个名字到底是谁？”',
      '',
      '管理员压低声音：“这里有监听，我现在不能说出口。说出真名，名单会立刻改写，第三个人会被清除。”',
      '',
      '他把半张门牌推到李辰掌心：“先看第三行划掉的编号，十秒内离开这条走廊。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic withheld suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuspenseWithheldInfoChecks = scanSuspenseWithheldInfoRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuspenseWithheldInfoChecks')
  })
  test('detects obscure suspense that uses vague mystery words without concrete anchors', () => {
    const checks = scanObscureSuspenseRisks([
      '第9章 门后',
      '',
      '那个东西一直在门后，像某种无法言说的存在。',
      '',
      '没人知道那件事到底意味着什么，只觉得真相藏在更深处。',
      '',
      '某个秘密正在靠近，所有人都说不清它为什么可怕。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('obscure_suspense_without_anchor_1_3')
    expect(checks[0].label).toBe('晦涩悬疑扫描')
    expect(checks[0].evidence).toContain('无法言说')
    expect(checks[0].fix).toContain('场景必须清晰')
    expect(checks[0].fix).toContain('具体威胁')
  })
  test('does not flag suspense when the unknown is grounded by concrete clue and pressure', () => {
    const checks = scanObscureSuspenseRisks([
      '第9章 门后',
      '',
      '广播念出第三条校规：十秒内不得回应门外的人。',
      '',
      '李辰看见门牌第三行编号被划掉，血字旁边多了一枚钥匙齿痕。',
      '',
      '门外的脚步停在他身后，倒计时只剩三秒。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic obscure suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicObscureSuspenseChecks = scanObscureSuspenseRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicObscureSuspenseChecks')
  })
  test('detects relationship scenes that only declare support without changing the relationship', () => {
    const checks = scanRelationshipSceneChangeRisks([
      '第8章 旁听席',
      '',
      '林青禾低声说：“我相信你。”',
      '',
      '李玄点头：“谢谢。”',
      '',
      '她又说：“我会站在你这边。”',
      '',
      '两人沉默片刻，气氛温暖起来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('relationship_scene_without_change_1_4')
    expect(checks[0].label).toBe('关系变化扫描')
    expect(checks[0].evidence).toContain('我相信你')
    expect(checks[0].fix).toContain('信任')
    expect(checks[0].fix).toContain('边界')
    expect(checks[0].fix).toContain('代价')
  })
  test('does not flag relationship scenes when support becomes action boundary and cost', () => {
    const checks = scanRelationshipSceneChangeRisks([
      '第8章 旁听席',
      '',
      '林青禾低声说：“我相信你。”',
      '',
      '执事逼她退回旁听席时，她把家族腰牌压在案上：“我公开作证，但只到这一步。”',
      '',
      '李玄第一次没有替她挡话，只把第二本账册推到她能看见的位置。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic relationship scene changes into character relation self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRelationshipSceneChangeChecks = scanRelationshipSceneChangeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRelationshipSceneChangeChecks')
  })
  test('detects expectation vacuum when a chapter resolves the current trouble without a new open loop', () => {
    const checks = scanExpectationVacuumRisks([
      '第10章 资格门',
      '',
      '李辰把最后一枚阵牌按进门缝。',
      '',
      '红光熄灭，管理员退后，资格门槛终于通过。',
      '',
      '大家都松了一口气，危机到这里总算结束。',
      '',
      '接下来他们只需要休息，等待新的生活开始。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('expectation_vacuum_after_resolution')
    expect(checks[0].label).toBe('断期待扫描')
    expect(checks[0].evidence).toContain('资格门槛终于通过')
    expect(checks[0].fix).toContain('下一目标')
    expect(checks[0].fix).toContain('新期待')
  })
  test('wires deterministic expectation vacuum risks into expectation threshold self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicExpectationVacuumChecks = scanExpectationVacuumRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicExpectationVacuumChecks')
  })
  test('detects scene cards whose planned beats are not consumed by the final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '玻璃门前',
            purpose: '李辰确认门外学生是否违反校规。',
            conflict: '开门会违反规则，不开门会失去线索。',
            reader_payoff: '规则边界压迫主角做选择。',
          },
          {
            scene_no: 2,
            title: '校徽露出',
            purpose: '学生袖口露出上一轮玩家的校徽。',
            conflict: '李辰必须判断这枚校徽是不是陷阱。',
            reader_payoff: '上一轮玩家线索打开新悬念。',
          },
        ],
      },
    }, '玻璃门外，学生敲了三下。李辰没有立刻开门，他盯着校规里那句禁止接触门外人的红字。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_2_consumption')
    expect(checks[0].evidence).toContain('校徽露出')
    expect(checks[0].fix).toContain('场景卡')
  })
  test('detects scene-card oh-story execution directives missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断。',
            conflict: '执事抢夺蓝晶，主角必须立刻判断它能不能读证据。',
            reader_payoff: '蓝晶改变证据判断。',
            concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
          },
        ],
      },
    }, [
      '蓝晶灼手这一幕里，执事抢夺蓝晶，主角立刻判断它能不能读证据。',
      '蓝晶改变了证据判断。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_1_execution_directives')
    expect(checks[0].evidence).toContain('灼手反应')
    expect(checks[0].fix).toContain('动作反应')
  })
  test('detects scene-card character relation progression directives missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '半页账册',
            purpose: '林青禾用账册线索逼主角确认合作边界。',
            conflict: '她要洗清代签责任，主角却必须先判断账册是否可信。',
            reader_payoff: '合作关系出现新的信任压力。',
            relationship_progression_plan: '关系类型/边界：联盟型，合作互信但仍有边界。',
            relationship_buffer_zone: '配角攻略缓冲区：保留信息差、地位差距、亲密度差距或信任程度之一。',
            supporting_character_action: '配角主动行动：林青禾为了自己的代签责任先联系账房拿到证词。',
            attitude_shift_checkpoint: '态度变化拐点：从旁观/质疑转为行动/协助/设限。',
            relationship_next_hook: '关系下一轮期待：主角解决追责后回到林青禾这里开启新任务。',
          },
        ],
      },
    }, [
      '半页账册这一场，林青禾用账册线索逼主角确认合作边界。',
      '她说账册就在这里，沈砚必须先判断它是否可信。',
      '合作关系出现新的信任压力。',
    ].join('\n'))

    const relationDirective = checks.find(check => check.key === 'scene_card_1_execution_directives')
    expect(relationDirective?.evidence).toContain('配角攻略缓冲区')
    expect(relationDirective?.evidence).toContain('态度变化')
    expect(relationDirective?.fix).toContain('配角')
  })
  test('detects scene-card showdown public payoff and combat presets missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '审判台反压',
            purpose: '江辰公开亮出第二本账册完成打脸。',
            conflict: '会长逼众人相信旧账本是铁证。',
            reader_payoff: '主角公开反压会长。',
            showoff_stage_chain: '群众层质疑 -> 中间层验账 -> 核心层长老改判。',
            spectator_interest_shift: '这跟我有关系：旁观商户意识到旧账规则会影响自己的矿票资格。',
            secondary_showoff_effect: '二级装逼效果：展示迫使长老席重算利益和站队。',
            combat_result_type: '碾压',
            combat_dimension_plan: '心/体/技：心态稳住审判台，技能拆账，身体挡住护卫逼近。',
            combat_reversal_plan: '反派出A假账册，主角提前准备B原始封印克制。',
          },
        ],
      },
    }, [
      '审判台反压这一场，江辰公开亮出第二本账册。',
      '会长脸色一白，台下众人震惊。',
      '长老席沉默片刻，只说重新验账。',
    ].join('\n'))

    const showdownDirective = checks.find(check => check.key === 'scene_card_1_execution_directives')
    expect(showdownDirective?.evidence).toContain('群众层质疑')
    expect(showdownDirective?.evidence).toContain('矿票资格')
    expect(showdownDirective?.evidence).toContain('心/体/技')
    expect(showdownDirective?.fix).toContain('公开舞台')
    expect(showdownDirective?.fix).toContain('战斗反制')
  })
  test('detects scene-card forbidden craft directives violated in final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断。',
            conflict: '执事抢夺蓝晶，主角必须立刻判断它能不能读证据。',
            reader_payoff: '蓝晶改变证据判断。',
            prose_craft_directives: ['不得用整段来历/等级解释蓝晶。'],
          },
        ],
      },
    }, [
      '蓝晶灼手这一幕里，执事抢夺蓝晶，主角立刻判断它能不能读证据。',
      '蓝晶烫得她掌心一缩，陌生记忆碎片在眼前炸开，缺页的位置随之浮出来。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品，后续再解释具体用法。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_1_forbidden_directives')
    expect(checks[0].evidence).toContain('整段来历')
    expect(checks[0].evidence).toContain('等级解释')
    expect(checks[0].fix).toContain('删掉说明书')
  })
  test('merges runtime camelCase chapterTarget scene cards for consumption checks when chapter_target exists', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        chapter_no: 12,
        title: '门外校徽',
      },
      chapterTarget: {
        sceneCards: [
          {
            sceneNo: 1,
            title: '玻璃门前',
            purpose: '李辰确认门外学生是否违反校规。',
            conflict: '开门会违反规则，不开门会失去线索。',
            readerPayoff: '规则边界压迫主角做选择。',
          },
          {
            sceneNo: 2,
            title: '校徽露出',
            purpose: '学生袖口露出上一轮玩家的校徽。',
            conflict: '李辰必须判断这枚校徽是不是陷阱。',
            readerPayoff: '上一轮玩家线索打开新悬念。',
          },
        ],
      },
    }, '玻璃门外，学生敲了三下。李辰没有立刻开门，他盯着校规里那句禁止接触门外人的红字。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_2_consumption')
    expect(checks[0].evidence).toContain('校徽露出')
  })
  test('detects scene-card density levels that are executed with the wrong prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册举起来，当众反证。执事脸色一变，只能改口，旁观弟子倒戈。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_density_1_dense_underwritten', 'scene_density_2_sparse_overwritten'])
    expect(checks[0].evidence).toContain('当众反证')
    expect(checks[0].fix).toContain('慢镜头')
    expect(checks[1].evidence).toContain('赶往钟楼')
    expect(checks[1].fix).toContain('1-2 句')
  })
  test('does not flag scene-card density when dense and sparse scenes use matching prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸，让每个人都看清朱印旁边的刮痕。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card purpose tags that are executed with the wrong prose weight', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰拿出第二本账册，执事改口，众人震惊。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_purpose_weight_1_high_underwritten', 'scene_purpose_weight_2_transition_overwritten'])
    expect(checks[0].evidence).toContain('目的词「打脸」')
    expect(checks[0].fix).toContain('危机/期待铺垫')
    expect(checks[1].evidence).toContain('目的词「过渡」')
    expect(checks[1].fix).toContain('1-2 句')
  })
  test('does not flag scene-card purpose weight when payoff scenes expand and transitions stay brief', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card sensory anchors missing from final prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，确认执事篡改账册。',
      '',
      '他抬头看向审判台，把账册递给旁证，示意对方验印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_sensory_anchor_1_missing')
    expect(checks[0].evidence).toContain('纸张触感粗糙')
    expect(checks[0].fix).toContain('主角主动注意')
    expect(checks[0].fix).toContain('动作、规则、危险或对话判断')
  })
  test('does not flag scene-card sensory anchors when the sensory detail lands in prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，指腹蹭过纸张粗糙的断边，页角卷曲处还压着一圈新墨洇开的痕迹。',
      '',
      '他没有急着抬头，只把那一页推到旁证面前：“昨夜换过。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card serial risk repair actions missing from final prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_serial_risk_repair_1_missing')
    expect(checks[0].label).toBe('场景近章风险修复检查')
    expect(checks[0].evidence).toContain('two_chapter_momentum_stall')
    expect(checks[0].evidence).toContain('用账册新证据推进目标')
    expect(checks[0].fix).toContain('目标推进')
    expect(checks[0].fix).toContain('关系/世界调剂')
  })
  test('does not flag scene-card serial risk repair actions when the repair lands in prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞，再把下一步目标推到禁库钥匙上。',
      '',
      '原本沉默的盟友终于改口，主动站到他身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card receipts whose evidence is missing from final prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].label).toBe('场景卡回执证据复核')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })
  test('builds a scene-card receipt sync report from deterministic receipt risks', () => {
    const report = buildSceneCardReceiptSyncReport(
      { title: '旧盟约' },
      { id: 12, chapter_no: 12, title: '旧盟约' },
      {
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            scene_card_receipts: {
              goal_obstacle_change_delivered: true,
              purpose_tag_delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          },
        ],
      },
      '江辰把账册证据亮在桌上，盟友终于改口。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('场景回执缺口 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'scene_card_receipt_1_evidence_missing',
      label: '场景卡回执证据复核',
    })
    expect(report.next_actions.join('｜')).toContain('scene_card_receipts')
  })
  test('audits stored oh-story scene-card receipts when generated scene breakdown is unavailable', () => {
    const checks = scanSceneCardReceiptRisks({
      chapter_target: {
        delivery_receipts: {
          scene_card_receipts: [
            {
              scene_no: 1,
              title: '旧盟约重签',
              delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          ],
        },
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })
  test('detects undelivered oh-story scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '蓝晶灼手',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            concept_anchor_rules_delivered: false,
            prose_craft_directives_delivered: false,
            evidence: ['蓝晶在她掌心炸出陌生记忆碎片'],
          },
        },
      ],
    }, '蓝晶在她掌心炸出陌生记忆碎片。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['新概念锚点', '正文工艺指令']))
    expect(checks[0].evidence).toContain('新概念锚点')
  })
  test('detects undelivered showdown scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '审判台反压',
          scene_card_receipts: {
            showoff_stage_chain_delivered: false,
            spectator_interest_shift_delivered: false,
            secondary_showoff_effect_delivered: false,
            combat_result_type_delivered: false,
            combat_dimension_plan_delivered: false,
            combat_reversal_plan_delivered: false,
            evidence: ['江辰公开亮出第二本账册。'],
          },
        },
      ],
    }, '江辰公开亮出第二本账册。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['公开舞台层级', '旁观者利益变化', '战斗维度计划', '战斗反转计划']))
    expect(checks[0].evidence).toContain('公开舞台层级')
  })
  test('blocks quality gate when scene-card receipt evidence is missing even if score passes', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, '江辰把账册证据亮在桌上，盟友终于改口。')

    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      quality_audit_checks: checks,
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('结构化自检失败')
    expect(decision.reasons.join('；')).toContain('场景卡回执证据复核')
  })
  test('blocks quality gate when next-chapter quality plan is missing even if score passes', () => {
    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      issues: [],
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('下一章质量续航计划缺失')
  })
  test('does not flag scene-card receipts when delivered evidence is present in prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('flags scene-card receipt evidence that appears outside the matching scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_text: '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_text: '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_out_of_scene')
    expect(checks[0].evidence).toContain('不在对应场景文本中')
    expect(checks[0].fix).toContain('对应场景')
  })
  test('flags multi-scene receipts that omit scene boundary anchors', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks.map(item => item.key)).toEqual([
      'scene_card_receipt_1_scope_missing',
      'scene_card_receipt_2_scope_missing',
    ])
    expect(checks[0].evidence).toContain('缺少 scene_start_anchor/scene_end_anchor')
    expect(checks[0].fix).toContain('场景边界')
  })
})
