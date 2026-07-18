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

describe('readability meme a', () => {
  test('normalizes style sample bank into abstract style usage instead of copied excerpts', () => {
    const samples = normalizeStyleSampleBank([
      {
        sample_key: '规则怪谈高压吐槽',
        sample_text: '李超盯着门外的黑影，心里只剩一个念头：这破学校连晚自习都外包给影子了。',
        scene_function: '高压后半拍吐槽',
        narrative_rhythm: '短句推进，动作后接一句轻吐槽',
        sentence_pattern: '短中句为主',
        dialogue_ratio: '40%',
        forbidden_copy: ['这破学校连晚自习都外包给影子了'],
        applicable_scenes: ['高压反打', '规则压迫'],
        avoid_scenes: ['纯背景说明', '严肃死亡收束'],
      },
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].sample_key).toBe('规则怪谈高压吐槽')
    expect(samples[0].abstract_usage).toContain('高压后半拍吐槽')
    expect(samples[0].abstract_usage).toContain('只学习节奏')
    expect(samples[0].unsafe_direct_phrases).toContain('这破学校连晚自习都外包给影子了')
    expect(samples[0].applicable_scenes).toEqual(['高压反打', '规则压迫'])
    expect(samples[0].avoid_scenes).toEqual(['纯背景说明', '严肃死亡收束'])
    expect(samples[0].sample_text).toBeUndefined()
  })
  test('adds style sample strategy to the pre-draft brief and prose prompt', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '世界观铺垫说明',
            scene_function: '低压过场中的背景信息铺垫',
            narrative_rhythm: '慢速说明，补齐规则源流',
            sentence_pattern: '中长句解释',
            dialogue_ratio: '10%-20%',
            abstract_usage: '只学习解释顺序',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['纯背景说明', '低压日常过场'],
            avoid_scenes: ['规则压迫', '高压反打'],
          },
          {
            sample_key: '重大情感告别',
            scene_function: '角色离别和情绪余韵',
            narrative_rhythm: '先静场，再情绪递进，最后留余韵',
            sentence_pattern: '中句为主，动作放慢',
            dialogue_ratio: '20%-35%',
            abstract_usage: '只学习情绪递进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['重大情感告别', '情感余韵'],
            avoid_scenes: ['规则压迫', '高压反打'],
          },
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '章末追读钩子',
            scene_function: '章节最后 300-600 字制造继续阅读理由',
            narrative_rhythm: '先兑现小回报，再抛出新问题或危险',
            sentence_pattern: '短句收束',
            dialogue_ratio: '15%-35%',
            abstract_usage: '只学习回报后加钩子的结构',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['章末追读钩子', '新问题抛出'],
            avoid_scenes: ['正文中段解释'],
          },
          {
            sample_key: '对白交锋推进',
            scene_function: '双方试探和信息差拉扯',
            narrative_rhythm: '对白短促推进，每两到三轮产生信息增量',
            sentence_pattern: '对白句短，动作句压缩',
            dialogue_ratio: '35%-55%',
            abstract_usage: '只学习对白功能和回合节奏',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['对白交锋', '信息差试探'],
            avoid_scenes: ['纯动作无信息差'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界，并在门口用对白试探同伴的信息差。',
        conflict: '李超想冲出去，张智阻止，双方围绕规则代价短促交锋。',
        ending_hook: '门外出现湿漉漉的学生。',
        scene_cards: [
          { title: '门槛边界', reader_payoff: '规则压制超人蛮力', conflict: '是否出门', ending_hook_seed: '门外有人敲门' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          style_sample_strategy: brief.style_sample_strategy,
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(brief.style_sample_strategy.enabled).toBe(true)
    expect(brief.style_sample_strategy.samples).toHaveLength(3)
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).toEqual([
      '规则危机反打',
      '章末追读钩子',
      '对白交锋推进',
    ])
    expect(brief.style_sample_strategy.samples[0].applicable_scenes).toEqual(['规则压迫', '高压反打'])
    expect(brief.style_sample_strategy.samples[0].avoid_scenes).toEqual(['纯背景说明'])
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('命中规则压迫')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('避开纯背景说明')
    expect(brief.style_sample_strategy.samples[1].selection_reason).toContain('命中章末追读钩子')
    expect(JSON.stringify(brief.style_sample_strategy.samples)).not.toContain('世界观铺垫说明')
    expect(JSON.stringify(brief.style_sample_strategy.samples)).not.toContain('重大情感告别')
    expect(brief.style_sample_strategy.do_not_copy).toContain('原句不能照搬')
    expect(prompt).toContain('本章风格样章策略')
    expect(prompt).toContain('selection_reason')
    expect(prompt).toContain('命中规则压迫')
    expect(prompt).toContain('按 applicable_scenes / avoid_scenes 选择样章策略')
    expect(prompt).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(prompt).toContain('原句不能照搬')
  })
  test('injects mixed-case pre-draft style sample strategy into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师', reference_config: {} },
      {
        pre_draft_brief: {
          styleSampleStrategy: {
            enabled: true,
            applyTo: ['雨夜审讯', '高压反打'],
            doNotCopy: ['样章原句不能照搬'],
            samples: [
              {
                sample_key: '雨巷审讯样章',
                narrative_rhythm: '三轮压问后半拍亮证据',
                sentence_pattern: '短中句推进，解释压短',
                dialogue_ratio: '35%-45%',
                unsafeDirectPhrases: ['你以为这就结束了吗'],
              },
            ],
          },
        },
        chapter_target: {
          chapter_no: 20,
          title: '雨巷复审',
          summary: '李玄在雨巷复审核心证词。',
          conflict: '执事抢先定义旧账，李玄必须半拍亮证。',
          ending_hook: '旧账缺页背后出现新名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 20, title: '雨巷复审' },
    )
    const styleStart = prompt.indexOf('【本章风格样章策略】')
    const styleEnd = prompt.indexOf('【本章质量基准样例】') >= 0
      ? prompt.indexOf('【本章质量基准样例】')
      : prompt.indexOf('【结构化上下文包】')
    const styleSection = prompt.slice(styleStart, styleEnd)

    expect(styleStart).toBeGreaterThanOrEqual(0)
    expect(styleSection).toContain('雨巷审讯样章')
    expect(styleSection).toContain('三轮压问后半拍亮证据')
    expect(styleSection).toContain('短中句推进，解释压短')
    expect(styleSection).toContain('样章原句不能照搬')
    expect(styleSection).toContain('你以为这就结束了吗')
  })
  test('strips nested style boundary aliases before recursive merge', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/style-sample-strategy.ts'), 'utf8')
    const stripStart = source.indexOf('function stripStyleBoundaryExplicitContract')
    const buildStart = source.indexOf('function buildStyleBoundaryContract')
    const derivedCall = source.indexOf('const derived = hasStyleInput ? buildStyleBoundaryContract', buildStart)
    const stripBlock = source.slice(stripStart, buildStart)
    const derivedBlock = source.slice(buildStart, derivedCall + 260)

    expect(stripStart).toBeGreaterThanOrEqual(0)
    expect(buildStart).toBeGreaterThan(stripStart)
    expect(stripBlock).toContain('chapter_target: stripTarget(contextPackage?.chapter_target)')
    expect(stripBlock).toContain('chapterTarget: stripTarget(contextPackage?.chapterTarget)')
    expect(stripBlock).toContain('pre_draft_brief: stripBrief(target.pre_draft_brief)')
    expect(derivedBlock).toContain('options.ignoreExplicit === true ? null : styleBoundaryExplicitContract')
    expect(derivedBlock).toContain('ignoreExplicit: true')
  })
  test('merges nested explicit style boundary contracts without overflowing', () => {
    const styleBoundary = {
      version: 'oh_story_style_boundary_v1',
      source: 'nested_explicit',
      style_override_rules: ['文风可覆盖默认 Gate D'],
      hard_constraints: ['禁用词 / banned_words 永远优先'],
      copy_boundary_rules: ['不得复制样章桥段'],
      conflict_resolution_rules: ['硬约束永远赢'],
      quality_checks: ['硬约束永远赢：禁用词'],
      revision_priorities: ['删风格越界禁用词'],
    }
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['样章原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      style_boundary_contract: styleBoundary,
      pre_draft_brief: {
        style_boundary_contract: styleBoundary,
        style_sample_strategy: {
          enabled: true,
          samples: [{ sample_key: '规则危机反打', unsafe_direct_phrases: ['样章原句不能照搬'] }],
        },
      },
      chapter_target: {
        chapter_no: 12,
        title: '异兽交易',
        summary: '主角把线索变成交易筹码。',
        conflict: '交易对象故意缺页。',
        style_boundary_contract: styleBoundary,
        style_sample_strategy: {
          enabled: true,
          samples: [{ sample_key: '规则危机反打', unsafe_direct_phrases: ['样章原句不能照搬'] }],
        },
        pre_draft_brief: {
          style_boundary_contract: styleBoundary,
        },
        preDraftBrief: {
          styleBoundaryContract: styleBoundary,
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    expect(brief.style_boundary_contract.version).toBe('oh_story_style_boundary_v1')
    expect(brief.style_boundary_contract.hard_constraints.join('｜')).toContain('禁用词')
    expect(brief.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制样章桥段')
  })
  test('adds an oh-story style boundary contract to pre-draft brief and prose prompt', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['样章原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 6,
        title: '门槛上的反证',
        summary: '主角在门槛规则压迫下反证宿管。',
        conflict: '宿管用规则压制主角蛮力，主角必须拆规则。',
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压迫，再半拍亮证据',
          matched_chapter_techniques: ['短句推进', '对白留半拍'],
          gaps: { profile_degenerate: false },
        },
        scene_cards: [
          { title: '门槛反证', reader_payoff: '规则压迫后的高压反打', conflict: '是否跨过门槛' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 6, title: '门槛上的反证' },
    )

    expect(brief.style_boundary_contract.version).toBe('oh_story_style_boundary_v1')
    expect(brief.style_boundary_contract.style_override_rules.join('｜')).toContain('Gate D')
    expect(brief.style_boundary_contract.hard_constraints.join('｜')).toContain('禁用词')
    expect(brief.style_boundary_contract.hard_constraints.join('｜')).toContain('Gate F')
    expect(brief.style_boundary_contract.hard_constraints.join('｜')).toContain('万能比喻')
    expect(brief.style_boundary_contract.hard_constraints.join('｜')).toContain('字数下限')
    expect(brief.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制样章桥段')
    expect(confirmedContext.chapter_target.style_boundary_contract.quality_checks.join('｜')).toContain('硬约束永远赢')
    expect(prompt).toContain('【文风覆盖边界合同】')
    expect(prompt).toContain('执行 chapter_target.style_boundary_contract')
    expect(prompt).toContain('硬约束永远赢')
    expect(prompt).toContain('style_boundary_checks')
    expect(prompt.indexOf('【文风覆盖边界合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('injects mixed-case pre-draft style boundary contract into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师', reference_config: {} },
      {
        pre_draft_brief: {
          styleBoundaryContract: {
            styleOverrideRules: ['只覆盖句长和停顿，不覆盖剧情事实。'],
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华', '字数下限不能被冷文风压缩'],
            copyBoundaryRules: ['不得复制样章桥段', '不得复制角色口癖'],
            qualityChecks: ['必须检查文风是否覆盖硬约束。'],
          },
        },
        chapter_target: {
          chapter_no: 19,
          title: '门槛复核',
          summary: '李玄复核门槛规则，逼出执事口供。',
          conflict: '执事想用规则定义压住旧证。',
          ending_hook: '门槛背面出现缺页编号。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 19, title: '门槛复核' },
    )
    const boundaryStart = prompt.indexOf('【文风覆盖边界合同】')
    const boundaryEnd = prompt.indexOf('【结构化上下文包】')
    const boundarySection = prompt.slice(boundaryStart, boundaryEnd)

    expect(boundaryStart).toBeGreaterThanOrEqual(0)
    expect(boundarySection).toContain('可覆盖项：只覆盖句长和停顿，不覆盖剧情事实。')
    expect(boundarySection).toContain('硬约束：硬约束永远赢；Gate F 章末禁升华；字数下限不能被冷文风压缩')
    expect(boundarySection).toContain('不可模仿边界：不得复制样章桥段；不得复制角色口癖')
    expect(boundarySection).toContain('style_boundary_checks：必须检查文风是否覆盖硬约束。')
  })
  test('hydrates incomplete explicit style sample strategy from matching sample bank', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['样章原句A'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '世界观铺垫说明',
            scene_function: '低压过场中的背景信息铺垫',
            narrative_rhythm: '慢速说明，补齐规则源流',
            sentence_pattern: '中长句解释',
            dialogue_ratio: '10%-20%',
            abstract_usage: '只学习解释顺序',
            unsafe_direct_phrases: ['样章原句B'],
            applicable_scenes: ['纯背景说明'],
            avoid_scenes: ['规则压迫'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 4,
        title: '门槛反制',
        summary: '主角在规则压迫下反制宿管。',
        conflict: '超人蛮力被门槛规则压住，必须拆规则。',
        style_sample_strategy: {
          enabled: true,
          do_not_copy: ['不要照搬作者口癖'],
        },
        scene_cards: [
          { title: '门槛反制', reader_payoff: '规则压迫后的高压反打', conflict: '是否跨过门槛' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.style_sample_strategy.enabled).toBe(true)
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).toContain('规则危机反打')
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).not.toContain('世界观铺垫说明')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('命中规则压迫')
    expect(brief.style_sample_strategy.do_not_copy).toContain('不要照搬作者口癖')
    expect(brief.style_sample_strategy.do_not_copy).toContain('样章原句A')
    expect(brief.style_sample_strategy.do_not_copy).toContain('不得复制样章桥段、专有设定、角色名和核心梗')
  })
  test('does not fall back to style samples that only match avoided scenes', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明', '低压日常过场'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 3,
        title: '旧校史',
        summary: '本章解释学校规则源流和过往背景，暂不进入危机反打。',
        conflict: '低压过场，用设定铺垫下一次规则压迫。',
        scene_cards: [
          { title: '校史馆', purpose: '补充背景说明', conflict: '暂无正面战斗' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.style_sample_strategy.enabled).toBe(false)
    expect(brief.style_sample_strategy.samples).toEqual([])
  })
  test('uses style sample effectiveness to prefer stable matched samples', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '旧高压反打样章',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '稳定规则反打样章',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      style_sample_effectiveness: {
        samples: [
          {
            sample_key: '旧高压反打样章',
            usage_count: 5,
            hit_rate: 40,
            missed_count: 6,
            copy_risk_count: 1,
            average_style_score: 61,
            risk_label: '需复盘',
          },
          {
            sample_key: '稳定规则反打样章',
            usage_count: 6,
            hit_rate: 100,
            missed_count: 0,
            copy_risk_count: 0,
            average_style_score: 91,
            risk_label: '表现稳定',
          },
        ],
      },
      chapter_target: {
        chapter_no: 6,
        title: '门禁反打',
        summary: '主角在宿舍门禁规则压迫下拆解限制并反制巡逻者。',
        conflict: '门禁规则压迫，主角必须反打破局。',
        ending_hook: '巡逻者身后露出第二道门禁符。',
        scene_cards: [
          { title: '门禁压迫', conflict: '规则逼迫主角停手', reader_payoff: '拆规则后反打', ending_hook_seed: '第二道门禁符出现' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.style_sample_strategy.samples[0].sample_key).toBe('稳定规则反打样章')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('历史命中率100%')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('表现稳定')
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).not.toContain('旧高压反打样章')
  })
  test('builds style sample effectiveness for chapter selection from historical reviews', () => {
    const styleSampleBank = [
      { sample_key: '旧高压反打样章', applicable_scenes: ['规则压迫'], avoid_scenes: ['纯背景说明'] },
      { sample_key: '稳定规则反打样章', applicable_scenes: ['规则压迫'], avoid_scenes: ['纯背景说明'] },
    ]
    const chapters = [
      {
        id: 21,
        chapter_no: 21,
        title: '旧样章失手',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '旧高压反打样章' }],
            },
          },
        },
      },
      {
        id: 22,
        chapter_no: 22,
        title: '稳定样章命中',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '稳定规则反打样章' }],
            },
          },
        },
      },
    ]
    const reviews = [
      {
        chapter_id: 21,
        review_type: 'prose_quality',
        created_at: '2026-06-01T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 72 } } }),
      },
      {
        chapter_id: 22,
        review_type: 'prose_quality',
        created_at: '2026-06-02T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 91 } } }),
      },
      {
        chapter_id: 21,
        review_type: 'style_sample_sync',
        created_at: '2026-06-01T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 58,
            planned: [{ sample_key: '旧高压反打样章', label: '叙述节奏' }],
            delivered: [],
            missed: [{ sample_key: '旧高压反打样章', label: '叙述节奏' }],
            copied_phrases: ['原句不能照搬'],
          },
        }),
      },
      {
        chapter_id: 22,
        review_type: 'style_sample_sync',
        created_at: '2026-06-02T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 94,
            planned: [{ sample_key: '稳定规则反打样章', label: '叙述节奏' }],
            delivered: [{ sample_key: '稳定规则反打样章', label: '叙述节奏' }],
            missed: [],
            copied_phrases: [],
          },
        }),
      },
    ]

    const report = buildStyleSampleEffectivenessForSelection(styleSampleBank, chapters, reviews)

    expect(report.samples.find((item: any) => item.sample_key === '旧高压反打样章')).toMatchObject({
      usage_count: 1,
      hit_rate: 0,
      missed_count: 1,
      copy_risk_count: 1,
      average_style_score: 58,
      average_quality_score: 72,
      risk_label: '需复盘',
    })
    expect(report.samples.find((item: any) => item.sample_key === '稳定规则反打样章')).toMatchObject({
      usage_count: 1,
      hit_rate: 100,
      missed_count: 0,
      copy_risk_count: 0,
      average_style_score: 94,
      average_quality_score: 91,
      risk_label: '表现稳定',
    })
  })
  test('builds style sample effectiveness from camelCase raw preDraftBrief strategy', () => {
    const styleSampleBank = [
      { sample_key: '雨巷审讯样章', applicable_scenes: ['审讯压迫'], avoid_scenes: ['纯背景说明'] },
    ]
    const chapters = [
      {
        id: 23,
        chapter_no: 23,
        title: '雨巷复审',
        raw_payload: {
          preDraftBrief: {
            styleSampleStrategy: {
              samples: [{ sample_key: '雨巷审讯样章' }],
            },
          },
        },
      },
    ]
    const reviews = [
      {
        chapter_id: 23,
        review_type: 'prose_quality',
        created_at: '2026-06-03T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 88 } } }),
      },
      {
        chapter_id: 23,
        review_type: 'style_sample_sync',
        created_at: '2026-06-03T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 86,
            planned: [{ sample_key: '雨巷审讯样章', label: '叙述节奏' }],
            delivered: [{ sample_key: '雨巷审讯样章', label: '叙述节奏' }],
            missed: [],
            copied_phrases: [],
          },
        }),
      },
    ]

    const report = buildStyleSampleEffectivenessForSelection(styleSampleBank, chapters, reviews)

    expect(report.used_sample_count).toBe(1)
    expect(report.samples.find((item: any) => item.sample_key === '雨巷审讯样章')).toMatchObject({
      usage_count: 1,
      hit_rate: 100,
      missed_count: 0,
      average_style_score: 86,
      average_quality_score: 88,
      risk_label: '表现稳定',
    })
  })
  test('lets the author lock or replace chapter style sample strategy before drafting', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            abstract_usage: '动作链和规则判定交替推进',
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '章末追读钩子',
            scene_function: '章节最后制造继续阅读理由',
            narrative_rhythm: '先兑现小回报，再抛出新问题或危险',
            abstract_usage: '只学习回报后加钩子的结构',
            applicable_scenes: ['章末追读钩子', '新问题抛出'],
          },
          {
            sample_key: '对白交锋推进',
            scene_function: '双方试探和信息差拉扯',
            narrative_rhythm: '对白短促推进，每两到三轮产生信息增量',
            abstract_usage: '只学习对白功能和回合节奏',
            applicable_scenes: ['对白交锋', '信息差试探'],
          },
        ],
      },
    }
    const contextPackage = {
      chapter_target: {
        title: '第一条规则',
        summary: '主角验证规则边界，并用对白试探同伴的信息差。',
        conflict: '双方围绕规则代价短促交锋。',
        ending_hook: '门外出现湿漉漉的学生。',
      },
    }
    const currentStrategy = {
      enabled: true,
      samples: [{ sample_key: '规则危机反打', selection_reason: '命中规则压迫；避开纯背景说明。' }],
      do_not_copy: ['原句不能照搬'],
    }

    const locked = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'lock',
      now: '2026-06-12T08:00:00.000Z',
    })
    const replaced = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'replace',
      now: '2026-06-12T08:01:00.000Z',
    })
    const disabled = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'disable',
      now: '2026-06-12T08:02:00.000Z',
    })

    expect(locked.locked).toBe(true)
    expect(locked.selection_mode).toBe('author_locked')
    expect(locked.author_locked_at).toBe('2026-06-12T08:00:00.000Z')
    expect(locked.samples.map((sample: any) => sample.sample_key)).toEqual(['规则危机反打'])
    expect(replaced.locked).toBe(false)
    expect(replaced.selection_mode).toBe('author_replaced')
    expect(replaced.samples.map((sample: any) => sample.sample_key)).not.toContain('规则危机反打')
    expect(replaced.samples.length).toBeGreaterThan(0)
    expect(disabled.enabled).toBe(false)
    expect(disabled.locked).toBe(true)
    expect(disabled.selection_mode).toBe('disabled_by_author')
    expect(disabled.samples).toEqual([])
  })
  test('adds chapter benchmark sample strategy to the pre-draft brief and prose prompt', () => {
    const samples = normalizeChapterBenchmarkSampleBank([
      {
        sample_key: '规则怪谈第一夜',
        genre: '规则怪谈',
        opening_hook: '开篇 300 字内出现死亡规则和反常边界',
        conflict_pattern: '主角冲动试探规则，智者用低成本物品验证边界',
        payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
        ending_hook_pattern: '门外出现疑似违规者求助，形成救或不救的选择',
        scene_budget_pattern: '3 场：边界验证、队友分歧、外部威胁敲门',
        do_not_copy: ['湿漉漉的校服学生站在门外'],
        source_excerpt: '这段原文不能进入 prompt',
      },
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].sample_key).toBe('规则怪谈第一夜')
    expect(samples[0].quality_axes).toContain('开篇钩子')
    expect(samples[0].abstract_usage).toContain('只学习章节结构')
    expect(samples[0].source_excerpt).toBeUndefined()

    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: samples,
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界。',
        conflict: '李超想冲出去，张智阻止。',
        ending_hook: '门外出现湿漉漉的学生。',
        scene_cards: [
          { title: '门槛边界', reader_payoff: '规则压制超人蛮力', conflict: '是否出门', ending_hook_seed: '门外有人敲门' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          chapter_benchmark_strategy: brief.chapter_benchmark_strategy,
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(brief.chapter_benchmark_strategy.enabled).toBe(true)
    expect(brief.chapter_benchmark_strategy.samples[0].opening_hook).toContain('开篇 300 字')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('湿漉漉的校服学生站在门外')
    expect(prompt).toContain('本章质量基准样例')
    expect(prompt).toContain('只学习章节结构')
    expect(prompt).toContain('不得复制样例桥段、角色名、专有设定和原句')
  })
  test('injects mixed-case pre-draft chapter benchmark strategy into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师', genre: '悬疑', reference_config: {} },
      {
        pre_draft_brief: {
          chapterBenchmarkStrategy: {
            enabled: true,
            applyTo: ['开篇300字', '爽点兑现', '章末追读钩子'],
            doNotCopy: ['不要复制雨巷样例桥段'],
            samples: [
              {
                sample_key: '雨巷反证样例',
                openingHook: '开篇 300 字先给审讯压力和证词抢占。',
                conflictPattern: '三轮压问后半拍亮证据。',
                payoffPattern: '旁观者分层倒戈，执事第一次失态。',
                endingHookPattern: '章尾只露缺页编号，不解释幕后。',
                doNotCopy: ['湿漉漉雨巷桥段不能复制'],
              },
            ],
          },
        },
        chapter_target: {
          chapter_no: 21,
          title: '雨巷缺页',
          summary: '李玄用旧账缺页反证执事换证。',
          conflict: '执事抢先定义旧账来源，旁观弟子开始动摇。',
          ending_hook: '缺页编号指向禁库。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 21, title: '雨巷缺页' },
    )
    const benchmarkStart = prompt.indexOf('【本章质量基准样例】')
    const benchmarkEnd = prompt.indexOf('【结构化上下文包】')
    const benchmarkSection = prompt.slice(benchmarkStart, benchmarkEnd)

    expect(benchmarkStart).toBeGreaterThanOrEqual(0)
    expect(benchmarkSection).toContain('雨巷反证样例')
    expect(benchmarkSection).toContain('开篇 300 字先给审讯压力和证词抢占')
    expect(benchmarkSection).toContain('三轮压问后半拍亮证据')
    expect(benchmarkSection).toContain('旁观者分层倒戈')
    expect(benchmarkSection).toContain('湿漉漉雨巷桥段不能复制')
  })
})
