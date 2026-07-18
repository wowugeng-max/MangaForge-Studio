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

describe('chapter pre-draft brief core b 2 a', () => {
  test('hydrates incomplete explicit state tracking contract from context sources', () => {
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 14,
          title: '旧印修订',
          ending_hook: '旧印章背面露出第二个名字。',
        },
      },
      story_state: {
        characters: [
          {
            name: '李玄',
            current_state: {
              location: '审判庭外',
              items: ['旧印章'],
              knowledge_scope: ['知道旧印章背面有第二个名字'],
            },
          },
        ],
      },
      setting_context: {
        required: ['旧印章规则'],
        entities: [
          {
            entity_type: 'rule',
            name: '旧印章规则',
            summary: '旧印章只能由继承人按在证词背面才会显形。',
            constraints: { trigger: '按在证词背面', cost: '暴露继承人身份' },
          },
          {
            entity_type: 'foreshadowing',
            name: '第二个名字',
            summary: '上一章旧印章背面露出的名字，指向失踪证人。',
            state: { planted_chapter: 14, status: '待回收' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '残留复核',
        summary: '李玄按旧印章规则复核证词。',
        conflict: '他必须在暴露继承人身份前逼出证人反应。',
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须先确认状态来源再写正文。'],
        },
        scene_cards: [
          { scene_no: 1, title: '庭外复核', characters_present: ['李玄'], purpose: '接住旧印章背面的名字。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)

    expect(brief.state_tracking_contract.source).toBe('manual_incomplete')
    expect(brief.state_tracking_contract.quality_checks).toEqual(['必须先确认状态来源再写正文。'])
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('李玄')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('第二个名字')
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toContain('旧印章规则')
    expect(brief.state_tracking_contract.source_readiness.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'previous_chapter',
      'character_state',
      'foreshadowing_history',
      'world_constraints',
    ]))
  })
  test('hydrates camelCase explicit state tracking contract without recursive overflow', () => {
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
        },
      },
      story_state: {
        characters: [
          {
            name: '江哲',
            current_state: {
              location: '红雾公寓门口',
              items: ['规则纸条'],
              knowledge_scope: ['知道规则五被篡改'],
            },
          },
        ],
      },
      setting_context: {
        required: ['规则五'],
        entities: [
          {
            entity_type: 'rule',
            name: '规则五',
            summary: '红雾公寓里被篡改的旧规则。',
            constraints: { trigger: '照旧法行动', cost: '扩大封印裂缝' },
          },
        ],
      },
      chapterTarget: {
        chapterNo: 2,
        title: '旧法失准',
        summary: '江哲按旧法试探规则，发现旧答案已经失准。',
        conflict: '旧办法会扩大封印裂缝。',
        stateTrackingContract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual_camel_incomplete',
          qualityChecks: ['必须先确认 camelCase 状态来源再写正文。'],
        },
        sceneCards: [
          { sceneNo: 1, title: '红雾门口', charactersPresent: ['江哲'], purpose: '确认规则五失准。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '红雾电梯' }, contextPackage)

    expect(brief.state_tracking_contract.source).toBe('manual_camel_incomplete')
    expect(brief.state_tracking_contract.quality_checks).toEqual(['必须先确认 camelCase 状态来源再写正文。'])
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('江哲')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('金色符文')
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toContain('规则五')
    expect(brief.state_tracking_contract.source_readiness.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'previous_chapter',
      'character_state',
      'world_constraints',
    ]))
  })
  test('adds an oh-story intent confirmation contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        title: '袖口旧印',
        summary: '李玄用禁门印记反推出协会会长才是幕后换证人。',
        conflict: '会长想把旧铺掌柜的出现解释成巧合，执事继续逼林青禾改口。',
        emotional_curve: '压迫 -> 信息差反杀 -> 爽感释放',
        ending_hook: '旧铺掌柜喊出会长二十年前的本名。',
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压后爆，爆发后用一段冷却承接下一钩子',
          matched_chapter_techniques: ['短句停顿', '问非所答制造潜台词'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '会长压场',
            purpose: '把会长的解释权压到最高。',
            conflict: '会长宣布旧铺掌柜只是冒名者。',
            opening_hook: '会长袖口的旧印和禁门印记只差一笔。',
            characters_present: ['李玄', '林青禾', '协会会长', '执事'],
            information_gap: '会长为什么有旧铺印记。',
          },
          {
            scene_no: 2,
            title: '一笔反证',
            purpose: '让李玄用旧印差异反证会长说谎。',
            conflict: '执事想抢走禁门拓印。',
            characters_present: ['李玄', '协会会长', '旧铺掌柜'],
            reader_payoff: '信息差反杀，会长第一次失态。',
            reversal: '旧铺掌柜认出会长二十年前的本名。',
            state_changes_expected: ['会长从掌控者变成被质询者', '李玄从被审者变成追问者'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 15, title: '袖口旧印' },
    )

    expect(brief.intent_confirmation_contract.version).toBe('oh_story_intent_confirmation_v1')
    expect(brief.intent_confirmation_contract.confirmed_intent).toContain('信息差反杀')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('先压后爆')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('短句停顿')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('内容概括')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('逻辑线')
    expect(brief.intent_confirmation_contract.execution_focus.join('｜')).toContain('爽点出手前先铺')
    expect(brief.intent_confirmation_contract.execution_focus.join('｜')).toContain('差异化反应')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('高压/生死/悲痛 beat')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('轻快配角声线让位')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('信息型配角不当科普嘴')
    expect(confirmedContext.chapter_target.intent_confirmation_contract.quality_checks.join('｜')).toContain('意图确认')
    expect(confirmedContext.chapter_target.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('对话逐句承接对方情绪')
    expect(prompt).toContain('【意图确认合同】')
    expect(prompt).toContain('执行 chapter_target.intent_confirmation_contract')
    expect(prompt).toContain('情绪+节奏+模块+文风指令')
    expect(prompt).toContain('内容概括决定起承转合')
    expect(prompt).toContain('对白基调约束')
    expect(prompt).toContain('轻快配角声线让位')
    expect(prompt).toContain('信息型配角不当科普嘴')
    expect(prompt).toContain('intent_confirmation_checks')
    expect(prompt.indexOf('【意图确认合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit intent confirmation from blueprint and style recall', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '雨夜旧账',
        summary: '李玄用雨夜旧账把会长的证词逼出破绽。',
        conflict: '会长连续压问，试图让林青禾改口。',
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须证明意图确认已落正文。'],
        },
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          target_emotion: '压迫后信息差反杀',
          opening_hook: '雨夜旧账第一行金额不对。',
          core_payoff: '李玄用旧账金额反证会长说谎。',
          content_outline: {
            cause: '会长在雨夜审讯中抢先定义证词。',
            development: '李玄发现旧账金额和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧账来源。',
            climax: '李玄当众反证会长调换证据。',
            ending: '旧账缺页露出内门印记。',
          },
          plot_lines: {
            mainline: '旧账反证会长。',
            logic_line: '压问 -> 旧账金额 -> 袖口旧印 -> 反证会长',
          },
          character_order: ['会长', '林青禾', '李玄'],
          beat_sequence: [{ beat_no: 1, scene_no: 1, title: '雨夜压问', action: '会长压问林青禾', function_tag: '铺垫', payoff: '压力成型' }],
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄拿到反证入口。',
          ending_contract: {
            next_chapter_pull: '旧账缺页露出内门印记。',
          },
        },
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '三轮压问后半拍亮证据',
          matched_chapter_techniques: ['短句压迫', '证据晚半拍亮出'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.intent_confirmation_contract.source).toBe('manual_incomplete')
    expect(brief.intent_confirmation_contract.confirmed_intent).toContain('信息差反杀')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('短句压迫')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('内容概括')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('逻辑线')
    expect(brief.intent_confirmation_contract.quality_checks).toEqual(['必须证明意图确认已落正文。'])
  })
  test('turns intent confirmation recall boundaries and blueprint focus into actionable contract items', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '旧账落印',
        summary: '李玄用旧账缺页和袖口旧印逼会长承认换证。',
        emotional_curve: '压迫 -> 反证 -> 余波',
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          target_emotion: '压迫后反证释放',
          content_outline: {
            cause: '会长先声夺人，把旧账定义成伪证。',
            development: '李玄引导林青禾说出旧账缺页来历。',
            turn: '旧印缺笔和会长袖口暗纹对上。',
            climax: '李玄公开反证会长二十年前换过证人。',
            ending: '旧账缺页背后出现内门编号。',
          },
          plot_lines: {
            logic_line: '旧账缺页 -> 旧印缺笔 -> 袖口暗纹 -> 会长换证',
          },
          character_order: ['会长', '林青禾', '李玄', '旧铺掌柜'],
          cost_and_reward: '代价：林青禾公开站队；收益：李玄夺回审讯解释权。',
          ending_contract: {
            next_chapter_pull: '内门编号把矛头指向禁库。',
          },
        },
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '三轮压问后半拍亮证据，爆发后短冷却接钩子',
          matched_chapter_techniques: ['问非所答制造潜台词', '证据晚半拍亮出'],
          style_directives: ['对白短促，动作承接情绪余波'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const rhythmAndStyle = brief.intent_confirmation_contract.rhythm_and_style.join('｜')
    const executionFocus = brief.intent_confirmation_contract.execution_focus.join('｜')

    expect(rhythmAndStyle).toContain('文风召回边界')
    expect(rhythmAndStyle).toContain('只学结构节奏')
    expect(rhythmAndStyle).toContain('不得复制')
    expect(executionFocus).toContain('内容概括')
    expect(executionFocus).toContain('旧账定义成伪证')
    expect(executionFocus).toContain('逻辑线')
    expect(executionFocus).toContain('旧账缺页 -> 旧印缺笔')
    expect(executionFocus).toContain('出场顺序')
    expect(executionFocus).toContain('代价/收益')
    expect(executionFocus).toContain('章尾承接')
  })
  test('adds an oh-story benchmark recall brief to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
          gaps: {
            matched_deep_dive_missing: true,
            conflict: '文风摘要偏冷，情绪模块要求更强爽感释放',
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
            anchor_excerpts: ['原文锚点只作节奏参考，不进入正文'],
          },
          style_directives: ['章末只留未解问题，不提前解释换证动机'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            characters_present: ['李玄', '执事', '林青禾', '旁观弟子'],
            reader_payoff: '证据反杀，执事失态。',
            ending_hook_seed: '旧账册缺页露出内门印记。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.version).toBe('oh_story_benchmark_recall_v1')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('短句推进')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('第12章')
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('matched_deep_dive_missing')
    expect(confirmedContext.chapter_target.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(prompt).toContain('【文风召回简报】')
    expect(prompt).toContain('执行 chapter_target.benchmark_recall_brief')
    expect(prompt).toContain('selected_emotion_module')
    expect(prompt).toContain('matched_deep_dive_missing')
    expect(prompt).toContain('同章深度拆解缺失')
    expect(prompt).toContain('已回退黄金三章/文风技巧')
    expect(prompt).toContain('文风摘要偏冷')
    expect(prompt.indexOf('【文风召回简报】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('passes primary benchmark anchor excerpts into prose prompt with copy boundary', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          matched_chapter: '主对标第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          anchor_excerpts: [
            '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
            '他问得很轻，像把刀背放在桌上。等对面第三次否认，才把缺口推到灯下。',
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:03:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.anchor_excerpts.join('｜')).toContain('账册翻到缺页前一行')
    expect(prompt).toContain('原文锚点片段')
    expect(prompt).toContain('账册翻到缺页前一行')
    expect(prompt).toContain('只用于学习句长、停顿、潜台词和信息释放手法')
    expect(prompt).toContain('不得复制锚点原句、桥段、设定、角色名或专名')
  })
})
