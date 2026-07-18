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

describe('chapter pre-draft brief core a 1 b', () => {
  test('adds an oh-story mainline definition contract to chapter blueprint and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      writing_bible: {
        mainline: {
          title: '旧账反证主线',
          goal: '查清旧账被调包这一件事。',
          core_conflict: '执事和会长把旧账调包伪装成文书失误。',
        },
      },
      chapter_target: {
        chapter_no: 8,
        title: '旧账反证',
        summary: '主角把旧账调包推进到公开核验。',
        conflict: '执事试图把旧账问题解释成境界不够导致的误判。',
        ending_hook: '旧账背面露出会长私印。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开核验',
            purpose: '把旧账调包这一件事推进到现场证据。',
            conflict: '执事用境界差距压住主角。',
            reader_payoff: '主角证明旧账不是修为误判而是被换过。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧账长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧账长篇' },
      confirmedContext,
      null,
      { chapter_no: 8, title: '旧账反证' },
    )

    expect(brief.chapter_blueprint.mainline_definition_contract.version).toBe('oh_story_mainline_definition_v1')
    expect(brief.chapter_blueprint.mainline_definition_contract.definition_rules.join('｜')).toContain('主线不等于升级')
    expect(brief.chapter_blueprint.mainline_definition_contract.definition_rules.join('｜')).toContain('主线是一件事')
    expect(brief.chapter_blueprint.mainline_definition_contract.action_rules.join('｜')).toContain('升级是主角达成目标的行动')
    expect(brief.chapter_blueprint.mainline_definition_contract.mainline_event).toContain('旧账')
    expect(prompt).toContain('主线定义合同')
    expect(prompt).toContain('mainline_definition_contract')
    expect(prompt).toContain('主线不等于升级')
    expect(prompt).toContain('主线是一件事')
    expect(prompt).toContain('升级是主角达成目标的行动')
    expect(prompt).toContain('不是一个元素')
  })
  test('adds an oh-story platform rubric contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '反证长篇',
      target_platform: 'fanqie',
      reference_config: {
        writing_bible: {
          target_platform: 'fanqie',
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '三段翻页',
        summary: '主角用三段证据快速反打。',
        conflict: '对手持续压迫，主角必须当场给出反证。',
        ending_hook: '最后一份证据指向主角身边人。',
        scene_cards: [
          {
            scene_no: 1,
            title: '前三段开钩',
            purpose: '用第一句话给出冲突。',
            opening_hook: '证据被当众撕毁。',
            conflict: '对手逼主角认罪。',
            reader_payoff: '主角顶住第一轮压迫。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 7, title: '三段翻页' },
    )

    expect(brief.platform_rubric.platform).toBe('fanqie')
    expect(brief.platform_rubric.label).toContain('番茄')
    expect(brief.platform_rubric.source).toBe('oh_story_embedded_fallback')
    expect(brief.platform_rubric.checks.join('｜')).toContain('前 3 段包含冲突')
    expect(brief.chapter_blueprint.platform_rubric.platform).toBe('fanqie')
    expect(confirmedContext.chapter_target.platform_rubric.label).toContain('番茄')
    expect(prompt).toContain('【平台审查基准】')
    expect(prompt).toContain('执行 chapter_target.platform_rubric')
    expect(prompt).toContain('fanqie')
    expect(prompt).toContain('前 3 段包含冲突')
    expect(prompt.indexOf('【平台审查基准】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('adds an oh-story content rubric contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        title: '旧证翻页',
        summary: '主角用旧证据逼对手露出破绽。',
        conflict: '证据不足，对手要求立刻结案。',
        ending_hook: '证据背面的印章属于主角父亲。',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧证开场',
            purpose: '用证据被否定开出冲突。',
            opening_hook: '证据刚摆上桌就被判作伪证。',
            conflict: '对手要求主角认罪。',
            reader_payoff: '主角发现旧印章破绽。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '反证长篇' },
      confirmedContext,
      null,
      { chapter_no: 8, title: '旧证翻页' },
    )

    expect(brief.content_rubric.version).toBe('oh_story_content_rubric_v1')
    expect(brief.content_rubric.source).toBe('oh_story_embedded_fallback')
    expect(brief.content_rubric.checks.join('｜')).toContain('核心卖点')
    expect(brief.content_rubric.golden_questions.join('｜')).toContain('读者为什么翻下一页')
    expect(confirmedContext.chapter_target.content_rubric.golden_questions.join('｜')).toContain('本章改变了什么')
    expect(prompt).toContain('【通用网文质量基准】')
    expect(prompt).toContain('执行 chapter_target.content_rubric')
    expect(prompt).toContain('最小剧情循环')
    expect(prompt).toContain('content_rubric_checks')
    expect(prompt.indexOf('【通用网文质量基准】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('adds an oh-story dialogue contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '当众试探',
        summary: '主角在公开场合用一句反问逼对手露馅。',
        conflict: '对手试图用长篇说辞压住主角。',
        ending_hook: '旁观者突然说出第二个证人的名字。',
        character_arc_brief: {
          voice_anchor: '主角短句压制，对手长句辩解，证人只说事实。',
          relationship_shift: '旁观者从中立转为愿意作证。',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '公开试探',
            scene_type: 'dialogue',
            purpose: '用对话逼出对手破绽。',
            conflict: '对手用身份压人，主角不能直接翻脸。',
            characters_present: ['李玄', '周薄森', '林青禾'],
            character_voice: '李玄短句反问；周薄森长篇压迫；林青禾克制给事实。',
            dialogue_goal: '让周薄森说漏证据来源。',
            key_dialogue: '“你怎么知道账本在我手里？”',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '反证长篇' },
      confirmedContext,
      null,
      { chapter_no: 9, title: '当众试探' },
    )

    expect(brief.dialogue_contract.version).toBe('oh_story_dialogue_contract_v1')
    expect(brief.dialogue_contract.scene_modes.join('｜')).toContain('反转模式')
    expect(brief.dialogue_contract.voice_anchors.join('｜')).toContain('李玄短句反问')
    expect(brief.dialogue_contract.dialogue_goals.join('｜')).toContain('周薄森说漏证据来源')
    expect(brief.dialogue_contract.mode_playbooks.join('｜')).toContain('压制模式')
    expect(brief.dialogue_contract.mode_playbooks.join('｜')).toContain('反转模式')
    expect(brief.dialogue_contract.mode_playbooks.join('｜')).toContain('心死模式')
    expect(brief.dialogue_contract.power_length_rules.join('｜')).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(brief.dialogue_contract.power_length_rules.join('｜')).toContain('被压制方对白 ≥ 20 字')
    expect(brief.dialogue_contract.subtext_agenda_rules.join('｜')).toContain('真实动机绝对不能浅显地写在台词里')
    expect(brief.dialogue_contract.subtext_agenda_rules.join('｜')).toContain('动机和借口')
    expect(brief.dialogue_contract.tone_context_rules.join('｜')).toContain('关系 × 场合 × 目的 = 语气')
    expect(brief.dialogue_contract.emotion_push_rules.join('｜')).toContain('命令式+否定式最能激发读者情绪')
    expect(brief.dialogue_contract.emotion_continuity_rules.join('｜')).toContain('每次转变需对应事件触发')
    expect(brief.dialogue_contract.dialogue_drive_rules.join('｜')).toContain('对话本身带来/强化某个核心驱动力')
    expect(brief.dialogue_contract.information_embed_rules.join('｜')).toContain('用角色的语气和立场包裹信息')
    expect(brief.dialogue_contract.information_embed_rules.join('｜')).toContain('设定用到哪个稍微带出来')
    expect(brief.dialogue_contract.information_tension_rules.join('｜')).toContain('下行 + 拉期待')
    expect(brief.dialogue_contract.information_tension_rules.join('｜')).toContain('展露核心信息 + 达成爽点')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('口癖和惯用语')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('说话节奏')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('信息偏好')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('身份影响措辞')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('关系阶段不同')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('普通人震惊')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('专业人士分析')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('特殊身份者反应')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('短小精悍')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('不代替主线')
    expect(brief.dialogue_contract.supporting_speaker_limit_rules.join('｜')).toContain('同一场景配角不超过 3 个有台词')
    expect(brief.dialogue_contract.supporting_speaker_limit_rules.join('｜')).toContain('没有功能的角色不要出场')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('语气助词')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('穿插动作描写')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('紧张段落对话短促')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('关键信息放对话开头或结尾')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('连续多轮对话后需要换气')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('读者已知信息')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('叙事一句话概括')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('突发状况替代')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('主角旁白平铺直叙')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('新人物必须安排主线戏份')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('说不出来但意思到了')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('梗或骚话')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('强化记忆点')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('高潮点')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('不得直接复刻')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('大量信息都必须用对话来展示')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('问答式的一问一答')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('依赖对话来推动剧情或人物变化')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('遮住角色名后能否区分')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('单次对话不超过全节 40%')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('自然口语交流')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('对话结尾能否预示接下来的节奏变化')
    expect(brief.dialogue_contract.dialogue_execution_checklist).toHaveLength(1)
    expect(brief.dialogue_contract.dialogue_execution_checklist[0]).toMatchObject({
      scene_no: 1,
      scene: '公开试探',
      mode: '反转模式',
      receipt_keys: ['dialogue_checks', 'scene_card_receipts'],
    })
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].line_functions.join('｜')).toContain('每句对白至少承担推进剧情、增加期待感或展示人设之一')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].emotion_flow.join('｜')).toContain('逐句回应上一句对方的情绪状态')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].information_strategy.join('｜')).toContain('用角色语气、立场、追问、误导或动作承接信息')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].voice_differentiation.join('｜')).toContain('李玄短句反问')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].forbidden_patterns.join('｜')).toContain('说明书式对白')
    expect(confirmedContext.chapter_target.dialogue_contract.dialogue_execution_checklist[0].mode).toBe('反转模式')
    expect(confirmedContext.chapter_target.dialogue_contract.quality_checks.join('｜')).toContain('每句对白至少承担推进剧情')
    expect(prompt).toContain('【对话质量合同】')
    expect(prompt).toContain('执行 chapter_target.dialogue_contract')
    expect(prompt).toContain('对话长度 = 权力地位')
    expect(prompt).toContain('压制模式')
    expect(prompt).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(prompt).toContain('真实动机绝对不能浅显地写在台词里')
    expect(prompt).toContain('关系 × 场合 × 目的 = 语气')
    expect(prompt).toContain('命令式+否定式最能激发读者情绪')
    expect(prompt).toContain('每次转变需对应事件触发')
    expect(prompt).toContain('对话本身带来/强化某个核心驱动力')
    expect(prompt).toContain('用角色的语气和立场包裹信息')
    expect(prompt).toContain('展露核心信息 + 达成爽点')
    expect(prompt).toContain('人物语言差异化')
    expect(prompt).toContain('口癖和惯用语')
    expect(prompt).toContain('身份影响措辞')
    expect(prompt).toContain('关系阶段不同')
    expect(prompt).toContain('弹幕/群众对话')
    expect(prompt).toContain('普通人震惊')
    expect(prompt).toContain('短小精悍')
    expect(prompt).toContain('不代替主线')
    expect(prompt).toContain('配角台词人数')
    expect(prompt).toContain('同一场景配角不超过 3 个有台词')
    expect(prompt).toContain('没有功能的角色不要出场')
    expect(prompt).toContain('对话节奏/呼吸感')
    expect(prompt).toContain('语气助词')
    expect(prompt).toContain('连续多轮对话后需要换气')
    expect(prompt).toContain('对话篇幅控制')
    expect(prompt).toContain('读者已知信息')
    expect(prompt).toContain('突发状况替代')
    expect(prompt).toContain('新人物必须安排主线戏份')
    expect(prompt).toContain('梗式对白')
    expect(prompt).toContain('说不出来但意思到了')
    expect(prompt).toContain('不得直接复刻')
    expect(prompt).toContain('对话质量审计')
    expect(prompt).toContain('大量信息都必须用对话来展示')
    expect(prompt).toContain('问答式的一问一答')
    expect(prompt).toContain('遮住角色名后能否区分')
    expect(prompt).toContain('单次对话不超过全节 40%')
    expect(prompt).toContain('自然口语交流')
    expect(prompt).toContain('对话结尾能否预示接下来的节奏变化')
    expect(prompt).toContain('对话执行清单')
    expect(prompt).toContain('场景1 公开试探｜mode=反转模式')
    expect(prompt).toContain('line_functions=每句对白至少承担推进剧情、增加期待感或展示人设之一')
    expect(prompt).toContain('receipt_keys=dialogue_checks,scene_card_receipts')
    expect(prompt).toContain('dialogue_checks')
    expect(prompt.indexOf('【对话质量合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit dialogue contract from scene dialogue context', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '当众试探',
        summary: '主角在公开场合用一句反问逼对手露馅。',
        conflict: '对手试图用长篇说辞压住主角。',
        dialogue_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认对白不是说明书，而是权力和信息差博弈。'],
        },
        character_arc_brief: {
          voice_anchor: '主角短句压制，对手长句辩解，证人只说事实。',
          relationship_shift: '旁观者从中立转为愿意作证。',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '公开试探',
            scene_type: 'dialogue',
            purpose: '用对话逼出对手破绽。',
            conflict: '对手用身份压人，主角不能直接翻脸。',
            character_voice: '李玄短句反问；周薄森长篇压迫；林青禾克制给事实。',
            dialogue_goal: '让周薄森说漏证据来源。',
            key_dialogue: '“你怎么知道账本在我手里？”',
            reader_payoff: '旁观者从中立转为愿意作证。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.dialogue_contract.source).toBe('manual_incomplete')
    expect(brief.dialogue_contract.quality_checks).toEqual(['必须确认对白不是说明书，而是权力和信息差博弈。'])
    expect(brief.dialogue_contract.scene_modes.join('｜')).toContain('反转模式')
    expect(brief.dialogue_contract.voice_anchors.join('｜')).toContain('李玄短句反问')
    expect(brief.dialogue_contract.dialogue_goals.join('｜')).toContain('周薄森说漏证据来源')
    expect(brief.dialogue_contract.key_lines.join('｜')).toContain('你怎么知道账本在我手里')
    expect(brief.dialogue_contract.relationship_moves.join('｜')).toContain('旁观者从中立转为愿意作证')
    expect(brief.dialogue_contract.mode_playbooks.join('｜')).toContain('反转模式')
    expect(brief.dialogue_contract.power_length_rules.join('｜')).toContain('被压制方对白 ≥ 20 字')
    expect(brief.dialogue_contract.subtext_agenda_rules.join('｜')).toContain('双方议程一致')
    expect(brief.dialogue_contract.tone_context_rules.join('｜')).toContain('私密的话在公众场合说')
    expect(brief.dialogue_contract.emotion_push_rules.join('｜')).toContain('打着为你好的幌子')
    expect(brief.dialogue_contract.emotion_continuity_rules.join('｜')).toContain('情绪四步法')
    expect(brief.dialogue_contract.dialogue_drive_rules.join('｜')).toContain('上行和下行交替')
    expect(brief.dialogue_contract.information_embed_rules.join('｜')).toContain('不是机械陈述设定')
    expect(brief.dialogue_contract.information_tension_rules.join('｜')).toContain('普通疑问先拉悬念')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('口癖和惯用语')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('立场固定')
    expect(brief.dialogue_contract.voice_differentiation_rules.join('｜')).toContain('关系阶段不同')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('普通人震惊')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('反转角色')
    expect(brief.dialogue_contract.spectator_dialogue_rules.join('｜')).toContain('关键爽点')
    expect(brief.dialogue_contract.supporting_speaker_limit_rules.join('｜')).toContain('同一场景配角不超过 3 个有台词')
    expect(brief.dialogue_contract.supporting_speaker_limit_rules.join('｜')).toContain('配角退场要主动规划')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('语气助词')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('关键转折处使用')
    expect(brief.dialogue_contract.dialogue_rhythm_rules.join('｜')).toContain('你确定？')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('叙事一句话概括')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('缺乏信息量')
    expect(brief.dialogue_contract.dialogue_volume_rules.join('｜')).toContain('配角参与冲突')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('说不出来但意思到了')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('主角或重要配角')
    expect(brief.dialogue_contract.dialogue_meme_rules.join('｜')).toContain('整段剧情围绕达成这个梗')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('大量信息都必须用对话来展示')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('问答式的一问一答')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('依赖对话来推动剧情或人物变化')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('遮住角色名后能否区分')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('单次对话不超过全节 40%')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('自然口语交流')
    expect(brief.dialogue_contract.dialogue_audit_rules.join('｜')).toContain('对话结尾能否预示接下来的节奏变化')
    expect(brief.dialogue_contract.dialogue_execution_checklist).toHaveLength(1)
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].scene).toBe('公开试探')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].mode).toBe('反转模式')
    expect(brief.dialogue_contract.dialogue_execution_checklist[0].receipt_keys).toEqual(['dialogue_checks', 'scene_card_receipts'])
    expect(brief.dialogue_contract.revision_priorities.join('｜')).toContain('修角色声线差异')
  })
})
