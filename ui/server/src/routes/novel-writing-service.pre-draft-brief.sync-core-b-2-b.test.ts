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

describe('chapter pre-draft brief sync-core b 2 b', () => {
  test('asks prose self review to enforce oh-story emotional three-blade methods', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('情绪三板斧')
    expect(reviewPrompt).toContain('羁绊铺设')
    expect(reviewPrompt).toContain('具体物件')
    expect(reviewPrompt).toContain('具体数字')
    expect(reviewPrompt).toContain('重复动作')
    expect(reviewPrompt).toContain('情感撕裂')
    expect(reviewPrompt).toContain('反差法')
    expect(reviewPrompt).toContain('错位法')
    expect(reviewPrompt).toContain('延迟真相法')
    expect(reviewPrompt).toContain('余韵钝痛')
    expect(reviewPrompt).toContain('安静细节')
    expect(reviewPrompt).toContain('每 3-5 个小节')
    expect(reviewPrompt).toContain('太平/太赶/假虐/割裂/烂尾/人设崩')
    expect(reviewPrompt).toContain('emotional_arc_checks')
  })
  test('adds an oh-story chapter hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
            information_gap: '门外学生到底是不是违规者。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
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
      { chapter_no: 2, title: '第二条规则' },
    )

    expect(brief.chapter_hook_contract.version).toBe('oh_story_chapter_hook_v1')
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
    expect(confirmedContext.chapter_target.chapter_hook_contract.quality_checks.join('｜')).toContain('前 100 字')
    expect(prompt).toContain('【章级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.chapter_hook_contract')
    expect(prompt).toContain('章首 7 式')
    expect(prompt).toContain('章尾 13 式')
    expect(prompt).toContain('chapter_hook_checks')
    expect(prompt.indexOf('【章级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit chapter hook contract from scene hooks', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        chapter_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认章首和章尾钩子都由现场触发。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_hook_contract.source).toBe('manual_incomplete')
    expect(brief.chapter_hook_contract.quality_checks).toEqual(['必须确认章首和章尾钩子都由现场触发。'])
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
  })
  test('adds an oh-story paragraph hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
            emotional_tone: '压迫',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
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
      { chapter_no: 18, title: '账本反打' },
    )

    expect(brief.paragraph_hook_contract.version).toBe('oh_story_paragraph_hook_v1')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
    expect(confirmedContext.chapter_target.paragraph_hook_contract.quality_checks.join('｜')).toContain('段落级钩子')
    expect(prompt).toContain('【段落级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.paragraph_hook_contract')
    expect(prompt).toContain('段落级钩子 11 种')
    expect(prompt).toContain('围观者质量层级')
    expect(prompt).toContain('paragraph_hook_checks')
    expect(prompt.indexOf('【段落级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit paragraph hook contract from scene hook context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        paragraph_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认关键段落有信息、风险或关系变化。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.paragraph_hook_contract.source).toBe('manual_incomplete')
    expect(brief.paragraph_hook_contract.quality_checks).toEqual(['必须确认关键段落有信息、风险或关系变化。'])
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('代价')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('冷发现')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
  })
  test('adds an oh-story suspense orchestration contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
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
      { chapter_no: 7, title: '缺页钟声' },
    )

    expect(brief.suspense_contract.version).toBe('oh_story_suspense_v1')
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('任何时刻至少两条悬念线运行')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('读者知道')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('底牌 + 即将发生的冲突')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('谜语人是故意不说明')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('信息延迟超过3章')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
    expect(confirmedContext.chapter_target.suspense_contract.quality_checks.join('｜')).toContain('悬念等级')
    expect(prompt).toContain('【悬念编排合同】')
    expect(prompt).toContain('执行 chapter_target.suspense_contract')
    expect(prompt).toContain('四种悬念信息顺序模板')
    expect(prompt).toContain('悬念强度5级')
    expect(prompt).toContain('读者预知法')
    expect(prompt).toContain('底牌前置法')
    expect(prompt).toContain('多线悬念')
    expect(prompt).toContain('伏笔不是谜语人')
    expect(prompt).toContain('信息延迟超过3章')
    expect(prompt).toContain('suspense_checks')
    expect(prompt.indexOf('【悬念编排合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit suspense contract from scene suspense context', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        suspense_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认疑问、误导、答案和新期待都有正文证据。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_incomplete')
    expect(brief.suspense_contract.quality_checks).toEqual(['必须确认疑问、误导、答案和新期待都有正文证据。'])
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('缺页到底藏着什么规则')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('假提示')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('第二行字')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('短弧2-3章')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('信息差抹平时')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('先展示主角底牌')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
  })
  test('preserves explicit suspense information-gap rules from camelCase contract', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '读者提前知道广播倒计时，主角还不知道缺页和钟声有关。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        title: '钟声前夜',
        summary: '主角追查广播倒计时。',
        conflict: '学生会要求立刻交出规则簿。',
        ending_hook: '旧钟背面出现下一次倒计时。',
        suspenseContract: {
          source: 'manual_camel_case',
          informationGapRules: ['读者知道旧钟是底牌，但学生会不知道。'],
          readerPreknowledgeRules: ['读者知道但主角不知道：零点会锁门。'],
          trumpCardPrepositionRules: ['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'],
          multiLineSuspenseRules: ['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_camel_case')
    expect(brief.suspense_contract.information_gap_rules).toEqual(['读者知道旧钟是底牌，但学生会不知道。'])
    expect(brief.suspense_contract.reader_preknowledge_rules).toEqual(['读者知道但主角不知道：零点会锁门。'])
    expect(brief.suspense_contract.trump_card_preposition_rules).toEqual(['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'])
    expect(brief.suspense_contract.multi_line_suspense_rules).toEqual(['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'])
    expect(brief.suspense_contract.quality_checks.join('｜')).toContain('读者预知法')
  })
})
