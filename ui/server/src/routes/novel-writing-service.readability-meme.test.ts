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

describe('readability and restrained meme workflow', () => {
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

  test('hydrates incomplete explicit chapter benchmark strategy from sample bank', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: [
          {
            sample_key: '规则怪谈第一夜',
            genre: '规则怪谈',
            opening_hook: '开篇 300 字内出现死亡规则和反常边界',
            conflict_pattern: '主角低成本验证规则边界',
            payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
            ending_hook_pattern: '门外出现疑似违规者求助',
            do_not_copy: ['湿漉漉的校服学生站在门外'],
          },
        ],
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界。',
        chapter_benchmark_strategy: {
          enabled: true,
          do_not_copy: ['作者额外禁止复制的桥段'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_benchmark_strategy.enabled).toBe(true)
    expect(brief.chapter_benchmark_strategy.samples.map((sample: any) => sample.sample_key)).toEqual(['规则怪谈第一夜'])
    expect(brief.chapter_benchmark_strategy.apply_to).toContain('开篇300字')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('作者额外禁止复制的桥段')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('湿漉漉的校服学生站在门外')
  })

  test('checks final prose against chapter benchmark sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', genre: '规则怪谈', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        chapter_benchmark_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈第一夜',
              opening_hook: '开篇 300 字内出现死亡规则和反常边界',
              conflict_pattern: '主角冲动试探规则，智者用低成本物品验证边界',
              payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
              ending_hook_pattern: '门外出现疑似违规者求助，形成救或不救的选择',
              scene_budget_pattern: '边界验证、队友分歧、外部威胁敲门',
              visual_pattern: '玻璃门、灰白门槛线和黑影清除形成可视化场面',
            },
          ],
        },
      },
    }
    const deliveredText = [
      '开篇三百字内，宿舍广播直接宣布死亡规则，玻璃门外的黑影贴着灰白门槛线游动。',
      '李超想冲出去，张智阻止他，掰下压缩饼干碎屑丢出门槛，低成本验证边界。',
      '黑影清除碎屑，规则反制蛮力，也让三人看见了可学习的生路。',
      '玻璃门、灰白门槛线和黑影清除形成清楚的可视化场面。',
      '最后门外出现疑似违规者求助，三人必须决定救或不救。',
    ].join('\n')
    const weakText = '宿舍里很安静，大家讨论规则。张智觉得先别出去。李超点头。夜色很深。'

    const okReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('基准 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('基准缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('章末追读')
    expect(warnReport.next_actions.join('；')).toContain('质量基准样例')
  })

  test('reads chapter benchmark sync strategy from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', genre: '悬疑', reference_config: {} }
    const chapter = {
      id: 23,
      chapter_no: 23,
      title: '缺页复核',
      raw_payload: {
        preDraftBrief: {
          chapterBenchmarkStrategy: {
            enabled: true,
            samples: [
              {
                sample_key: '缺页反证样例',
                openingHook: '开篇 300 字先给旧账缺页压力。',
                conflictPattern: '执事抢先定义证词，主角用缺页反证。',
                payoffPattern: '旁观者分层倒戈，执事第一次失态。',
                endingHookPattern: '章尾只露禁库编号，不解释幕后。',
              },
            ],
          },
        },
      },
    }
    const report = buildChapterBenchmarkSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 23, title: '缺页复核' } },
      '李玄说旧账有缺页，执事没有回答。审讯暂时继续。',
    )

    expect(report.label).toContain('基准缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('缺页反证样例')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('禁库编号')
  })

  test('story state sync persists a chapter_benchmark_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync'")
    expect(source).toContain('buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_benchmark_sync = chapterBenchmarkSync')
  })

  test('checks final prose against chapter blueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 8, chapter_no: 8, title: '第二本账册' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            cause: '审判庭以旧账册定罪，江辰被迫承压',
            development: '林青禾拖住证人，账册细节开始互相矛盾',
            turn: '第二本账册出现，旧印章证明账目被调换',
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
            relationship_line: '林青禾从旁观转为出手护证',
          },
          character_order: '江辰先被押入审判庭，林青禾随后带证人入场，执事最后亮出旧账册压人',
          cost_and_reward: '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索',
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰',
          },
        },
      },
    }
    const deliveredText = [
      '审判庭开场，执事逼江辰把手按向认罪书血印，旧账册被摊在众人面前定罪。',
      '江辰承压不退，林青禾随后带证人入场，先拖住证词，让账册细节开始互相矛盾。',
      '执事最后亮出旧账册压人，江辰才取出第二本账册，又用旧印章证明账目被调换。',
      '逻辑线从旧账册转到第二本账册，再落到旧印章，逼得执事在众目睽睽下改口。',
      '旁观弟子有人沉默，有人倒戈站队；林青禾也从旁观转为出手护证。',
      '代价是江辰暴露了第二本账册，收益是洗清罪名，还得到禁地钥匙线索。',
      '最后账册夹层露出禁地钥匙，第二扇门后有人等江辰，危险留到下一章。',
    ].join('\n')
    const weakText = '江辰在审判庭解释了账册问题。执事有些尴尬，众人都知道他没错了。事情进入下一阶段。'

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('细纲 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('细纲缺口')
    expect(warnReport.missed_count).toBeGreaterThan(0)
    expect(warnReport.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(warnReport.next_actions.join('；')).toContain('章节细纲')
  })

  test('checks oh-story five-act causal chain in chapter blueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 28, chapter_no: 28, title: '旧印章质变' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 28,
        chapter_blueprint: {
          target_emotion: '压迫后质变反证',
          opening_hook: '审判庭第一句话就是认罪书。',
          core_payoff: '江辰用旧印章让账册调包从怀疑变成铁证。',
          content_outline: {
            cause: '认罪书和旧账册先把江辰压成被告。',
            development: '林青禾拖住证人，账册页序互相矛盾。',
            turn: '旧印章出现，冲突性质从口供争执质变成账册调包铁证。',
            climax: '江辰当众按下旧印章，执事抢证失败后改口。',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险。',
          },
          causal_chain_contract: {
            version: 'oh_story_five_act_causal_chain_v1',
            act_order: ['开局/种子', '发展/生长', '转折/质变', '行动/冲刺', '结局/完成'],
            act_functions: {
              seed: '开局/种子：认罪书和旧账册先把江辰压成被告；因必须在此埋下。',
              growth: '发展/生长：林青禾拖住证人，账册页序互相矛盾；果+因继续生长。',
              turn: '转折/质变：旧印章出现，冲突性质从口供争执质变成账册调包铁证。',
              rush: '行动/冲刺：江辰当众按下旧印章，执事抢证失败后改口；冲突白热化。',
              completion: '结局/完成：账册夹层露出禁地钥匙，果收束并埋下下一因。',
            },
            quality_checks: ['五幕因果链必须五环齐全，不能跳步、不能乱序。'],
          },
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰。',
          },
        },
      },
    }
    const causalText = [
      '开局先埋种子：审判庭第一句话就是认罪书，旧账册把江辰压成被告，压迫从第一息就落下。',
      '发展开始生长：林青禾拖住证人，账册页序互相矛盾，旧账册的果又变成下一步追问的因。',
      '转折发生质变：旧印章出现，冲突性质从口供争执变成账册调包铁证，江辰处境也更危险，因为执事开始抢证，反证爽感被压到这一刻才爆发。',
      '行动进入冲刺：江辰当众按下旧印章，执事抢证失败后被迫改口；旁观弟子有人沉默，有人倒戈站队。',
      '结局完成收束：代价是江辰暴露第二本账册，收益是洗清罪名；逻辑线先从旧账册转到旧印章，再落到账册夹层露出禁地钥匙，第二扇门后有人等他，下一因已经埋下。',
    ].join('\n')
    const flatText = [
      '江辰在审判庭解释旧账册。',
      '林青禾说页序有问题，旧印章也出现了。',
      '大家听完后觉得有道理，执事尴尬改口。',
      '事情顺利完成，账册夹层露出禁地钥匙。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, causalText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.causal_chain_checks.map((item: any) => item.label)).toContain('五幕因果链')
    expect(okReport.causal_chain_checks.every((item: any) => item.delivered)).toBe(true)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('causal_chain_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'causal_chain_contract')?.missed_items).toEqual(expect.arrayContaining([
      '缺转折质变',
      '转折被解释/总结抹平',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('五幕因果链')
  })

  test('checks chapter blueprint beat density contract after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 31, chapter_no: 31, title: '密度复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 31,
        chapter_blueprint: {
          target_emotion: '压迫后密集反证',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证并洗清罪名',
          beat_density_contract: {
            version: 'oh_story_beat_density_v1',
            target_word_count: 3000,
            min_beat_count: 10,
            target_beat_count: 12,
            max_beat_count: 15,
            current_beat_count: 2,
            density_gap: 8,
            rule: '按字数目标反推情节点数量：约 200-300 字/个情节点；下限 10 个；常规 3000 字章节 10-15 个。',
          },
        },
      },
    }
    const denseText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰把手腕往后一撤，先让血印落空。',
      '林青禾带证人入场，证人交出旧账册缺页。',
      '执事伸手抢账册，江辰反扣住他的腕骨。',
      '第二本账册从证人袖中滑出，编号正对旧账缺页。',
      '江辰把旧印章压上编号，墨迹立刻浮出调包痕迹。',
      '执事改口前还想毁页，林青禾挡住火折子。',
      '旁观弟子分成两拨，有人退后，有人站到江辰身侧。',
      '江辰当众反证完成，洗清罪名，却暴露了第二本账册。',
      '账册夹层露出禁地钥匙，第二扇门后的名字被血印遮住。',
    ].join('\n')
    const summaryText = [
      '江辰在审判庭解释了账册问题。',
      '执事有些尴尬，众人都知道他没错了。',
      '事情进入下一阶段。',
    ].join('\n')

    const denseReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, denseText)
    const summaryReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, summaryText)

    expect(denseReport.craft_checks.find((item: any) => item.key === 'beat_density')?.status).toBe('ok')
    expect(summaryReport.status).toBe('warn')
    expect(summaryReport.craft_checks.find((item: any) => item.key === 'beat_density')?.status).toBe('warn')
    expect(summaryReport.missed.map((item: any) => item.label)).toContain('情节点密度')
    expect(summaryReport.missed.find((item: any) => item.key === 'craft_beat_density')?.text).toContain('200-300 字/个情节点')
    expect(summaryReport.next_actions.join('；')).toContain('情节点密度')
  })

  test('checks chapter blueprint beat function detail allocation after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 32, chapter_no: 32, title: '详略复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 32,
        chapter_blueprint: {
          target_emotion: '压迫后细节反证',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用旧印章让账册调包当众暴露',
          beat_sequence: [
            { beat: '江辰把旧印章压上编号，账册调包痕迹浮出', function_tag: '关键揭露' },
            { beat: '执事抢证失败后改口，旁观弟子倒戈站队', function_tag: '打脸' },
            { beat: '江辰穿过回廊去偏厅', function_tag: '过渡' },
          ],
        },
      },
    }
    const allocatedText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰把旧印章压上编号，墨迹先断成两截，又沿着账册缺页浮出调包痕迹；林青禾盯住页角，低声问：“这枚印是谁保管？”执事伸手就抢。',
      '江辰扣住他的手腕，把旧印章往灯下一翻，印背暗纹正对第二本账册的编号。有人退后，有人当场改口，旁观弟子倒戈站队。',
      '代价是江辰暴露第二本账册，收益是当众证明账册调包。',
      '他穿过回廊去偏厅。',
    ].join('\n')
    const flatText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰用旧印章证明了账册调包，执事抢证失败后改口，旁观弟子都很震惊。',
      '他穿过回廊，回廊很长，灯很冷，墙上的影子一层接一层，风从窗缝里吹进来，他想起很多往事，心里非常复杂，脚步也变得沉重。',
      '事情进入下一阶段。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, allocatedText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.craft_checks.find((item: any) => item.key === 'beat_function_detail_balance')?.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.craft_checks.find((item: any) => item.key === 'beat_function_detail_balance')?.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'craft_beat_function_detail_balance')?.text).toContain('关键揭露')
    expect(warnReport.next_actions.join('；')).toContain('目的词详略')
  })

  test('checks oh-story small-outline four-step delivery after prose is written', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 34, chapter_no: 34, title: '小纲复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 34,
        chapter_blueprint: {
          small_outline_contract: {
            version: 'oh_story_small_outline_four_step_v1',
            steps: ['分段判断', '标注目的和效果', '标注详写/略写', '快速定位'],
            segment_cards: [
              {
                segment_no: 1,
                segment: '审判庭缺页',
                purpose: '让读者确认缺页不是文书失误而是栽赃入口。',
                intended_effect: '读者感到证据压力升级。',
                detail_level: 'expand',
                quick_locator: '审判庭缺页页序',
              },
              {
                segment_no: 2,
                segment: '回廊转场',
                purpose: '把众人从审判庭带到禁库门口。',
                intended_effect: '压缩转场但保留禁库方向。',
                detail_level: 'compress',
                quick_locator: '穿过回廊到禁库门口',
              },
            ],
          },
        },
      },
    }
    const deliveredText = [
      '审判庭里，江辰把缺页页序摊到众人面前，逼执事承认这不是文书失误，而是有人故意把栽赃入口藏进账册。',
      '证人重新核对页序时，执事的脸色变了，旁观弟子有人沉默，有人退后，读者能看见证据压力从“口头争执”升级成“现场核验”。',
      '代价是江辰暴露核验页序的方法，收益是缺页被当众证明为栽赃证据。',
      '他们穿过回廊到禁库门口，转场只留一笔，缺页背面的禁库编号却被江辰按在门环旁。',
    ].join('\n')
    const weakText = [
      '江辰去了审判庭，大家讨论缺页。',
      '后来他们穿过很长的回廊，墙上有很多影子，空气很冷。',
      '事情进入下一阶段。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.small_outline_checks.find((item: any) => item.key === 'small_outline_contract')?.status).toBe('ok')
    expect(okReport.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.small_outline_checks.find((item: any) => item.key === 'small_outline_contract')?.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('small_outline_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'small_outline_contract')?.text).toContain('目的和效果')
    expect(warnReport.next_actions.join('；')).toContain('小纲四步法')
  })

  test('checks oh-story mainline definition after prose is written', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 35, chapter_no: 35, title: '主线复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 35,
        chapter_blueprint: {
          mainline_definition_contract: {
            version: 'oh_story_mainline_definition_v1',
            mainline_event: '查清旧账被调包这一件事。',
            action_role: '升级和验阵只是达成旧账反证目标的行动。',
            forbidden_mainline_shapes: ['境界升级条', '金手指元素列表', '地图/设定罗列'],
            quality_checks: ['主线必须是一件事，不是一个元素。'],
          },
        },
      },
    }
    const deliveredText = [
      '这一章只推进一件事：查清旧账被调包。',
      '江辰的验阵升级没有单独变成主线，只是他达成旧账反证目标的行动。',
      '他把旧账、私印和证人页序串成现场证据，逼执事承认账册被换过。',
      '章末旧账背面露出会长私印，第二条主线还没替换当前目标，只作为下一步铺垫。',
    ].join('\n')
    const weakText = [
      '江辰突破了新境界，金手指也升级成第二形态。',
      '新地图、新阵法、新榜单和新门派设定都出现了。',
      '大家讨论这些元素很重要，旧账调包的事以后再说。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.mainline_definition_checks.find((item: any) => item.key === 'mainline_definition_contract')?.status).toBe('ok')
    expect(okReport.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.mainline_definition_checks.find((item: any) => item.key === 'mainline_definition_contract')?.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('mainline_definition_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'mainline_definition_contract')?.text).toContain('主线是一件事')
    expect(warnReport.next_actions.join('；')).toContain('主线不等于升级')
  })

  test('reads chapter blueprint sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = {
      id: 25,
      chapter_no: 25,
      title: '缺页复核',
      raw_payload: {
        preDraftBrief: {
          chapterBlueprint: {
            targetEmotion: '压迫后缺页反证爆发',
            openingHook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
            corePayoff: '李玄用空白账页反证执事换证。',
            contentOutline: {
              cause: '执事先定义旧账缺页无效。',
              development: '李玄让证人复述账页顺序。',
              turn: '空白账页编号和禁库编号对上。',
              climax: '执事在众人面前失态改口。',
              ending: '禁库编号指向下一扇门。',
            },
            plotLines: {
              logicLine: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
            },
            endingContract: {
              nextChapterPull: '禁库编号指向下一扇门。',
            },
          },
        },
      },
    }
    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 25, title: '缺页复核' } },
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(report.next_actions.join('；')).toContain('章节细纲')
  })

  test('reads stored oh-story chapter blueprint delivery receipts after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = {
      id: 27,
      chapter_no: 27,
      title: '禁库编号',
      raw_payload: {
        oh_story_delivery_receipts: {
          chapter_blueprint: {
            target_emotion: '压迫后禁库编号反证爆发',
            opening_hook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
            core_payoff: '李玄用空白账页反证执事换证。',
            content_outline: {
              cause: '执事先定义旧账缺页无效。',
              development: '李玄让证人复述账页顺序。',
              turn: '空白账页编号和禁库编号对上。',
              climax: '执事在众人面前失态改口。',
              ending: '禁库编号指向下一扇门。',
            },
            plot_lines: {
              logic_line: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
            },
            ending_contract: {
              next_chapter_pull: '禁库编号指向下一扇门。',
            },
          },
        },
      },
    }
    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 27, title: '禁库编号' } },
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
  })

  test('reads runtime camelCase chapterTarget chapterBlueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 26, chapter_no: 26, title: '禁库编号' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 26,
        title: '禁库编号',
        chapterBlueprint: {
          targetEmotion: '压迫后禁库编号反证爆发',
          openingHook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
          corePayoff: '李玄用空白账页反证执事换证。',
          contentOutline: {
            cause: '执事先定义旧账缺页无效。',
            development: '李玄让证人复述账页顺序。',
            turn: '空白账页编号和禁库编号对上。',
            climax: '执事在众人面前失态改口。',
            ending: '禁库编号指向下一扇门。',
          },
          plotLines: {
            logicLine: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
          },
          endingContract: {
            nextChapterPull: '禁库编号指向下一扇门。',
          },
        },
      },
    }

    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      contextPackage,
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(report.next_actions.join('；')).toContain('章节细纲')
  })

  test('flags oh-story blueprint craft gaps even when outline beats are mentioned', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 8, chapter_no: 8, title: '第二本账册' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            cause: '审判庭以旧账册定罪，江辰被迫承压',
            development: '林青禾拖住证人，账册细节开始互相矛盾',
            turn: '第二本账册出现，旧印章证明账目被调换',
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
          },
          character_order: '江辰先被押入审判庭，林青禾随后带证人入场，执事最后亮出旧账册压人',
          cost_and_reward: '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索',
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰',
          },
        },
      },
    }
    const flatButMentionedText = [
      '审判庭开场逼江辰按下认罪书血印，旧账册定罪，江辰被迫承压。',
      '林青禾拖住证人，账册细节互相矛盾，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索。',
      '账册夹层露出禁地钥匙，禁地钥匙对应第二扇门，门后有人等江辰。',
    ].join('\n')

    const report = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatButMentionedText)

    expect(report.status).toBe('warn')
    expect(report.label).toContain('细纲缺口')
    expect(report.craft_checks.map((item: any) => item.key)).toEqual([
      'payoff_setup',
      'differentiated_reactions',
      'detail_balance',
    ])
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('爽点铺垫')
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('差异化反应')
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('详略分配')
    expect(report.missed.map((item: any) => item.key)).toContain('craft_payoff_setup')
  })

  test('story state sync persists a chapter_blueprint_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync'")
    expect(source).toContain('buildChapterBlueprintSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_blueprint_sync = chapterBlueprintSync')
  })

  test('checks final prose against benchmark recall brief after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 7, chapter_no: 7, title: '旧印章反推' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
          gaps: ['matched_deep_dive_missing', '文风摘要偏冷，情绪模块要求更强爽感释放'],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问旧账册从哪里来，李玄没有急着答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄等他话音落尽，才晚半拍亮出旧印章。证据爆发的瞬间，执事脸色第一次失控。',
      '旁观弟子分成三拨：有人怀疑，有人倒戈，有人沉默退后。',
      '短暂冷却后，旧印章背面露出第二个证人的名字，章尾钩子压住没有解释。',
    ].join('\n')
    const weakText = [
      '李玄拿出旧印章，直接证明执事换证。',
      '所有旁观弟子都震惊了。',
      '执事很生气，事情进入下一阶段。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('召回 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.gaps).toContain('matched_deep_dive_missing')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('召回缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('节奏参照')
    expect(warnReport.next_actions.join('；')).toContain('文风召回')
  })

  test('flags copied benchmark anchor excerpts after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 18, chapter_no: 18, title: '雨夜反证' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          anchor_excerpts: [
            '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
          ],
        },
      },
    }
    const copiedText = [
      '执事第一轮压问旧账从哪里来，李玄没有立刻答。',
      '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
      '他才把缺页和旧印推到灯下，旁观弟子当场倒戈。',
    ].join('\n')

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, copiedText)

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('benchmark_anchor_excerpt_copy_risk')
    expect(report.missed.find((item: any) => item.key === 'benchmark_anchor_excerpt_copy_risk')?.label).toBe('原文锚点复制风险')
    expect(report.copied_anchor_excerpts.join('｜')).toContain('账册翻到缺页前一行')
    expect(report.next_actions.join('；')).toContain('锚点原句')
  })

  test('keeps benchmark recall sync open when primary module or rhythm contract is missing', () => {
    const report = buildBenchmarkRecallSyncReport(
      { title: '残阵问道', reference_config: {} },
      { id: 8, chapter_no: 8, title: '召回缺契约' },
      {
        chapter_target: {
          benchmark_recall_brief: {
            gaps: ['missing_primary_contract', 'module_missing', 'rhythm_missing'],
            repair_action: '重跑 /story-long-analyze Stage 3+ 或重新 /story-import。',
          },
        },
      },
      '李玄简单说明旧账有问题，众人听完后继续审讯。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('召回缺口')
    expect(report.missed_count).toBeGreaterThan(0)
    expect(report.missed.map((item: any) => item.key)).toContain('benchmark_missing_primary_contract')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('missing_primary_contract')
    expect(report.next_actions.join('；')).toContain('重跑')
  })

  test('checks benchmark authority rules after delivery when style conflicts with module rhythm', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 18, chapter_no: 18, title: '雨夜反证' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀：压迫后必须强爽感释放。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子。',
          style_profile_summary: '文风摘要建议冷静旁观，低情绪慢铺陈。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: ['module_rhythm_conflict', '文风摘要偏冷，情绪模块要求更强爽感释放'],
          authority_rules: [
            '发生冲突时 selected_emotion_module 与 rhythm_reference 是权威；style_profile_summary 只管表达，不得压低情绪爆发。',
          ],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问旧账册从哪里来，李玄没有答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄晚半拍亮出旧印章，旧账缺页和袖口暗纹对上的瞬间，执事脸色失控。',
      '旁观弟子有人倒戈，有人沉默退后，雨声短暂压住审讯厅。',
      '冷却后，旧账背面露出内门印记，章尾钩子没有解释。',
    ].join('\n')
    const weakText = [
      '雨夜很安静。',
      '李玄冷静地把旧账册放在桌上。',
      '众人看完证据，意识到执事可能有问题。',
      '他没有多说，审讯继续。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.missed.map((item: any) => item.key)).not.toContain('benchmark_authority_rule')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('benchmark_authority_rule')
    expect(warnReport.missed.find((item: any) => item.key === 'benchmark_authority_rule')?.label).toBe('召回权威规则')
    expect(warnReport.next_actions.join('；')).toContain('权威')
    expect(warnReport.next_actions.join('；')).toContain('文风只管表达')
  })

  test('checks benchmark canonical source authority after delivery when style-only prose ignores module rhythm', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 19, chapter_no: 19, title: '雨夜复审' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀：压三轮后证据爆发。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却。',
          style_profile_summary: '冷静克制，短句留白。',
          source_paths: [
            '对标/旧城诡案/剧情/情绪模块.md',
            '对标/旧城诡案/剧情/节奏.md',
            '对标/旧城诡案/文风.md',
          ],
          gaps: ['module_rhythm_conflict: 文风摘要偏冷，情绪模块要求强爽感释放'],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问账册来源，李玄只把旧印压在纸角。',
      '第二轮逼问证人，第三轮逼问归属判定，审讯厅的声音一层层压低。',
      '他到最后才亮出缺页和暗纹，证据爆发时，执事当场改口。',
      '旁观弟子有人倒戈，有人沉默，短暂冷却后，旧印背面浮出第二个名字。',
    ].join('\n')
    const styleOnlyText = [
      '雨夜很静。',
      '李玄冷静克制地翻过旧账，短句留白，没有解释。',
      '众人看完证据后都安静下来，审讯继续向后推进。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, styleOnlyText)

    expect(okReport.missed.map((item: any) => item.key)).not.toContain('benchmark_canonical_source_rule')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('benchmark_canonical_source_rule')
    expect(warnReport.missed.find((item: any) => item.key === 'benchmark_canonical_source_rule')?.label).toBe('召回来源权威')
    expect(warnReport.next_actions.join('；')).toContain('来源权威')
    expect(warnReport.next_actions.join('；')).toContain('情绪模块/节奏参照优先')
  })

  test('derives benchmark recall sync from mixed-case pre-draft style sample strategy', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 19, chapter_no: 19, title: '雨夜复审' }
    const contextPackage = {
      pre_draft_brief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '先压三轮，再半拍亮证据，爆发后短冷却',
          styleProfileSummary: '短句推进审讯压力，动作句只保留信息差变化。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
        },
      },
      chapter_target: {
        chapter_no: 19,
        title: '雨夜复审',
      },
    }
    const weakText = [
      '雨夜里，李玄把账册放在桌上。',
      '众人看完以后，觉得执事大概有问题。',
      '审讯继续，事情暂时没有结果。',
    ].join('\n')

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '文风摘要', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('先压三轮')
    expect(report.next_actions.join('；')).toContain('文风召回')
  })

  test('derives benchmark recall sync from camelCase preDraftBrief style sample strategy', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 20, chapter_no: 20, title: '旧账复核' }
    const contextPackage = {
      preDraftBrief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮出旧账缺页',
          styleProfileSummary: '对白短促，动作句只服务证据反转。',
          matchedChapterTechniques: ['旧账缺页反证', '旁观者分层反应'],
        },
      },
      chapter_target: {
        chapter_no: 20,
        title: '旧账复核',
      },
    }
    const weakText = '李玄简单说明旧账有问题，众人听完后继续审讯。'

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('旧账缺页')
  })

  test('keeps camelCase preDraftBrief recall source when snake pre-draft brief is empty', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 21, chapter_no: 21, title: '空档复审' }
    const contextPackage = {
      pre_draft_brief: {},
      preDraftBrief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '两轮逼问后用空白账页反证',
          matchedChapterTechniques: ['空白账页反证'],
        },
      },
      chapter_target: {
        chapter_no: 21,
        title: '空档复审',
      },
    }
    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, '李玄看了一眼账页，没有继续追问。')

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页反证')
  })

  test('reads runtime camelCase chapterTarget benchmarkRecallBrief after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 22, chapter_no: 22, title: '旧账复审' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 22,
        title: '旧账复审',
        benchmarkRecallBrief: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '两轮逼问后用空白账页反证',
          styleProfileSummary: '对白短促，动作句只服务证据反转。',
          matchedChapterTechniques: ['空白账页反证', '旁观者分层反应'],
        },
      },
    }

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, '李玄简单说明旧账有问题，众人听完后继续审讯。')

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('空白账页反证')
  })

  test('story state sync persists a benchmark_recall_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync'")
    expect(source).toContain('buildBenchmarkRecallSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.benchmark_recall_sync = benchmarkRecallSync')
  })

  test('checks final prose against style boundary contract after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 7, chapter_no: 7, title: '旧印章反推' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        style_boundary_contract: {
          version: 'oh_story_style_boundary_v1',
          hard_constraints: [
            '禁用词 / banned_words 永远优先。',
            'Gate F 章末禁升华永远优先。',
            '禁止万能比喻、命运感套话、作者预告。',
          ],
          copy_boundary_rules: [
            '不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
            '只学习抽象技法。',
          ],
          quality_checks: ['硬约束永远赢。'],
        },
      },
    }
    const okText = [
      '执事压住账册，李玄没有照搬样章的敲桌节奏，只把旧印章推到裂纹旁。',
      '旁观弟子先沉默，再有人倒戈。',
      '最后，旧印章背面露出第二个证人的名字。',
    ].join('\n')
    const weakText = [
      '执事三次敲桌，冷冷说出样章里那句口癖。',
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
      '命运像一张无形的大网笼罩下来。',
    ].join('\n')

    const okReport = buildStyleBoundarySyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildStyleBoundarySyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('文风边界 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('文风边界缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告', '万能比喻', '样章复制风险']))
    expect(warnReport.next_actions.join('；')).toContain('硬约束永远赢')
  })

  test('reads style boundary sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = {
      id: 24,
      chapter_no: 24,
      title: '边界复核',
      raw_payload: {
        preDraftBrief: {
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['必须检查文风是否覆盖硬约束。'],
          },
        },
      },
    }
    const report = buildStyleBoundarySyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 24, title: '边界复核' } },
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
    )

    expect(report.label).toContain('文风边界缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('硬约束永远赢')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告']))
  })

  test('reads runtime camelCase chapterTarget styleBoundaryContract after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 25, chapter_no: 25, title: '边界复核' }
    const report = buildStyleBoundarySyncReport(
      project,
      chapter,
      {
        chapterTarget: {
          chapterNo: 25,
          title: '边界复核',
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['必须检查文风是否覆盖硬约束。'],
          },
        },
      },
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
    )

    expect(report.label).toContain('文风边界缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('硬约束永远赢')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告']))
  })

  test('story state sync persists a style_boundary_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync'")
    expect(source).toContain('buildStyleBoundarySyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.style_boundary_sync = styleBoundarySync')
  })

  test('checks final prose against style sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则危机反打',
              scene_function: '规则压力下的动作反制',
              narrative_rhythm: '先压迫，再拆规则，再小反打',
              sentence_pattern: '短中句为主，解释压短',
              dialogue_ratio: '35%-45%',
              voice_rules: ['李超高压后半拍吐槽', '张智冷静拆规则'],
              abstract_usage: '动作链和规则判定交替推进',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }
    const deliveredText = [
      '十点整，门外黑影压上玻璃。李超抬拳，脚尖刚过线就被无形力量顶回。',
      '“这规则还挺会加班。”李超咬牙，把手收了回来。',
      '张智蹲下，用饼干碎屑试探门槛：“别硬闯。它判定的是越界，不是力量。”',
      '碎屑刚飞出去，就被黑影清除。压迫、拆规则、小反打在同一场景里完成。',
      '李超盯着灰白门槛线：“懂了，先让它露判定，再揍能揍的东西。”',
    ].join('\n')
    const weakText = '宿舍里很安静，大家围坐在一起。张智解释了很多规则来源和可能性，李超认真听完，没有插话，也没有尝试动作验证。'

    const okReport = buildStyleSampleSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildStyleSampleSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('风格 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('风格缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('对白比例')
    expect(warnReport.next_actions.join('；')).toContain('风格样章')
  })

  test('reads style sample sync strategy from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = {
      id: 22,
      chapter_no: 22,
      title: '雨巷复审',
      raw_payload: {
        preDraftBrief: {
          styleSampleStrategy: {
            enabled: true,
            samples: [
              {
                sample_key: '雨巷审讯样章',
                narrative_rhythm: '三轮压问后半拍亮证据',
                sentence_pattern: '短中句推进，解释压短',
                dialogue_ratio: '35%-45%',
              },
            ],
            doNotCopy: ['雨巷样章原句不能照搬'],
          },
        },
      },
    }
    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 22, title: '雨巷复审' } },
      '李玄看了一眼账册，说事情可能有问题。众人沉默，审讯继续。',
    )

    expect(report.label).toContain('风格缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('雨巷审讯样章')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('三轮压问')
  })

  test('reads runtime camelCase chapterTarget styleSampleStrategy after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 23, chapter_no: 23, title: '雨巷复审' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 23,
        title: '雨巷复审',
        styleSampleStrategy: {
          enabled: true,
          samples: [
            {
              sample_key: '雨巷审讯样章',
              narrative_rhythm: '三轮压问后半拍亮证据',
              sentence_pattern: '短中句推进，解释压短',
              dialogue_ratio: '35%-45%',
            },
          ],
          doNotCopy: ['雨巷样章原句不能照搬'],
        },
      },
    }

    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      contextPackage,
      '李玄看了一眼账册，说事情可能有问题。众人沉默，审讯继续。',
    )

    expect(report.label).toContain('风格缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('雨巷审讯样章')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('三轮压问')
  })

  test('warns when prose drifts into comma-stutter fragments against the style fingerprint', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 24, chapter_no: 24, title: '雨巷复审' }
    const contextPackage = {
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
      },
      chapter_target: {
        chapter_no: 24,
        style_sample_strategy: {
          enabled: true,
          style_profile_summary: '不要模仿可能已漂移的上一章碎句节奏，按文风指纹恢复中长句呼吸。',
        },
      },
    }
    const stutterText = [
      '雨停了，灯暗了，门开了，人来了。',
      '李玄看见，执事沉默，众人退后，旧账翻开。',
      '他抬手，停住，低声，说了一句。',
      '风声很碎，脚步很急，审讯继续。',
    ].join('\n')

    const report = buildStyleSampleSyncReport(project, chapter, contextPackage, stutterText)

    expect(report.status).toBe('warn')
    expect(report.planned.map((item: any) => item.label)).toContain('文风指纹句长带')
    expect(report.missed.map((item: any) => item.key)).toContain('style_drift_sentence_fingerprint')
    expect(report.missed.find((item: any) => item.key === 'style_drift_sentence_fingerprint')?.fix).toContain('不要模仿可能已漂移的上一章句式节奏')
    expect(report.next_actions.join('；')).toContain('文风指纹')
  })

  test('warns when style sample direct phrases are copied into prose', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈高压吐槽',
              scene_function: '高压后半拍吐槽',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }

    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      contextPackage,
      '李超盯着门外黑影，脱口而出：“这破学校连晚自习都外包给影子了。”',
    )

    expect(report.status).toBe('warn')
    expect(report.copy_risk_count).toBe(1)
    expect(report.copied_phrases[0]).toContain('这破学校')
    expect(report.next_actions.join('；')).toContain('不得照搬样章原句')
  })

  test('story state sync persists a style_sample_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'style_sample_sync'")
    expect(source).toContain('buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.style_sample_sync = styleSampleSync')
  })

  test('adds first30 retention repair focus to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const review = {
      review_type: 'first30_retention_diagnosis',
      created_at: '2026-06-03T10:00:00.000Z',
      payload: JSON.stringify({
        report: {
          score: 76,
          status: 'needs_repair',
          positioning: { promise_ready: true, reader_promise: '寒门少年靠阵法反压宗门秩序。' },
          segments: [
            { key: '4-10', label: '试读十章', score: 68, coverage: 100, hook_rate: 57, payoff_average: 1.4, chapter_count: 7 },
          ],
          chapter_cards: [
            { chapter_id: 7, chapter_no: 7, title: '夜闯阵堂', score: 61, word_count: 2600, flags: ['章末钩子弱', '爽点/悬念信号少'] },
          ],
          risks: [
            { severity: 'high', segment: '4-10', issue: '章末追读钩子覆盖率偏低。', action: '补未解决问题。' },
          ],
        },
      }),
    }
    const first30Context = buildFirst30RetentionContext({ id: 7, chapter_no: 7, title: '夜闯阵堂' }, [review])
    const contextPackage = {
      first30_retention_context: first30Context,
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
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
          first30_retention_brief: brief.first30_retention_brief,
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(first30Context?.chapter_score).toBe(61)
    expect(brief.first30_retention_brief.segment_label).toBe('试读十章')
    expect(brief.first30_retention_brief.flags).toContain('章末钩子弱')
    expect(brief.first30_retention_brief.required_actions).toContain('补未解决问题。')
    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('章末钩子弱')
    expect(prompt).toContain('补未解决问题')
  })

  test('adds camelCase first30 retention brief from pre-draft context to prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          first30RetentionBrief: {
            segmentLabel: '试读十章',
            flags: ['章末钩子弱'],
            requiredActions: ['前300字给危机', '章末留下门外学生悬念'],
            repairFocus: '补开篇钩子和章末追读',
          },
        },
        chapter_target: {
          id: 3,
          chapter_no: 3,
          title: '门外学生',
          summary: '门外学生带来新的阵法失控线索。',
          conflict: '主角必须判断救人还是守住阵图秘密。',
          ending_hook: '学生袖口露出失传阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('章末留下门外学生悬念')
  })

  test('adds reader drop risk brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      reader_trial_context: {
        status: 'needs_repair',
        score: 66,
        quality_bar: '起点1万均订试读基准',
        drop_points: ['第7章中段解释阵法过密，试读用户可能弃读。', '章末钩子只交代结果，没有未解问题。'],
        pull_points: ['主角用残阵反压执事时有追读爽点。'],
        repair_actions: ['开篇 300 字先给阵图被夺的现场压力。', '中段减少设定解释，用动作验证阵法规则。', '章末留下第二层阵纹的代价问题。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.reader_drop_risk_brief.status).toBe('needs_repair')
    expect(brief.reader_drop_risk_brief.quality_bar).toContain('起点1万均订')
    expect(brief.reader_drop_risk_brief.drop_points[0]).toContain('中段解释阵法过密')
    expect(brief.reader_drop_risk_brief.opening_guardrail).toContain('开篇 300 字')
    expect(brief.reader_drop_risk_brief.middle_guardrail).toContain('中段减少设定解释')
    expect(brief.reader_drop_risk_brief.ending_guardrail).toContain('章末留下第二层阵纹')
    expect(context.chapter_target.reader_drop_risk_brief.drop_points[0]).toContain('试读用户可能弃读')
    expect(prompt).toContain('【读者弃读预警】')
    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('中段减少设定解释')
    expect(prompt).toContain('章末留下第二层阵纹')
    expect(prompt).toContain('执行 chapter_target.reader_drop_risk_brief')
  })

  test('injects camelCase pre-draft reader drop risk brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          readerDropRiskBrief: {
            status: 'needs_repair',
            qualityBar: '起点1万均订试读基准',
            dropPoints: ['中段解释阵法过密，试读用户可能弃读。'],
            repairActions: ['中段减少设定解释，用动作验证阵法规则。'],
            openingGuardrail: '开篇 300 字先给阵图被夺的现场压力。',
            middleGuardrail: '中段减少设定解释，用动作验证阵法规则。',
            endingGuardrail: '章末留下第二层阵纹的代价问题。',
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const dropRiskSection = prompt.slice(
      prompt.indexOf('【读者弃读预警】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(dropRiskSection).toContain('【读者弃读预警】')
    expect(dropRiskSection).toContain('中段解释阵法过密')
    expect(dropRiskSection).toContain('中段减少设定解释')
    expect(dropRiskSection).toContain('章末留下第二层阵纹')
  })

  test('adds golden-three launch guardrail for the first three chapters', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 1,
        chapter_no: 1,
        title: '残阵开局',
        summary: '主角在残阵事故中被迫证明自己没有偷阵图。',
        conflict: '执事当众栽赃，主角必须用残阵反证。',
        ending_hook: '阵图背面显出第二层阵纹。',
        scene_cards: [
          {
            title: '残阵事故',
            reader_payoff: '主角用残阵反证栽赃',
            conflict: '执事栽赃主角偷阵图',
            ending_hook_seed: '第二层阵纹显形',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 1, title: '残阵开局' },
    )

    expect(brief.golden_three_brief.version).toBe('oh_story_golden_three_v1')
    expect(brief.golden_three_brief.chapter_no).toBe(1)
    expect(brief.golden_three_brief.phase_label).toBe('第一章启动')
    expect(brief.golden_three_brief.opening_requirements.join('｜')).toContain('前 500 字有钩子')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('主角第一章就出场')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('第一章有事件')
    expect(brief.golden_three_brief.forbidden_patterns).toContain('大段世界观说明')
    expect(brief.golden_three_brief.payoff_target_count).toBe(2)
    expect(brief.golden_three_brief.current_chapter_payoffs.join('｜')).toContain('主角用残阵反证栽赃')
    expect(context.chapter_target.golden_three_brief.phase_label).toBe('第一章启动')
    expect(prompt).toContain('【黄金三章启动守门】')
    expect(prompt).toContain('执行 chapter_target.golden_three_brief')
    expect(prompt).toContain('前三章至少两个爽点')
    expect(prompt).toContain('不得用大段世界观说明开局')
  })

  test('adds story pressure ladder to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      story_pressure_ladder: {
        status: 'needs_attention',
        score: 64,
        chapterRangeLabel: '第7-12章',
        pressureSources: [
          { label: '执事压迫', count: 4, chapters: [7, 8, 9, 10], riskLevel: 'warn' },
        ],
        signals: [
          { key: 'pressure_source', label: '压力源', status: 'warn', detail: '未来章节压力源过于集中。' },
          { key: 'conflict_escalation', label: '冲突升级', status: 'ok', detail: '未来章节能看到压力加码。' },
          { key: 'stakes_growth', label: '赌注升级', status: 'warn', detail: '未来章节缺少可感知赌注。' },
          { key: 'reversal_pressure', label: '反转逼迫', status: 'warn', detail: '未来章节缺少两难选择。' },
        ],
        nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.story_pressure_brief.status).toBe('needs_attention')
    expect(brief.story_pressure_brief.pressure_sources[0]).toContain('执事压迫')
    expect(brief.story_pressure_brief.weak_signals.map((item: any) => item.key)).toContain('stakes_growth')
    expect(brief.story_pressure_brief.stakes_growth_guardrail).toContain('可感知赌注')
    expect(brief.story_pressure_brief.reversal_pressure_guardrail).toContain('两难选择')
    expect(context.chapter_target.story_pressure_brief.required_actions[0]).toContain('升级赌注')
    expect(prompt).toContain('【故事压力阶梯】')
    expect(prompt).toContain('执行 chapter_target.story_pressure_brief')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('赌注升级')
    expect(prompt).toContain('反转逼迫')
  })

  test('injects camelCase pre-draft story pressure brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          storyPressureBrief: {
            status: 'needs_attention',
            pressureSources: ['协会会长当众封锁账册'],
            stakesGrowthGuardrail: '如果失败，主角会失去试炼资格。',
            reversalPressureGuardrail: '必须逼主角在公开证据和保护证人之间二选一。',
            requiredActions: ['至少一个场景写出证人被反制后的新代价。'],
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const pressureSection = prompt.slice(
      prompt.indexOf('【故事压力阶梯】'),
      prompt.indexOf('【主角能动性】'),
    )

    expect(pressureSection).toContain('【故事压力阶梯】')
    expect(pressureSection).toContain('协会会长当众封锁账册')
    expect(pressureSection).toContain('失去试炼资格')
    expect(pressureSection).toContain('保护证人')
    expect(pressureSection).toContain('证人被反制后的新代价')
  })

  test('adds protagonist agency story drive to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 12,
        chapter_no: 12,
        title: '试炼资格',
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
        ending_hook: '内门长老盯上阵盘裂纹。',
        scene_cards: [
          {
            title: '阵堂对峙',
            conflict: '执事设局阻拦主角参加试炼',
            turning_point: '主角当众选择用残阵反证阵图归属',
            reader_payoff: '主角拿到试炼资格',
            exit_state: '主角从被动挨压转为主动入局',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 12, title: '试炼资格' },
    )

    expect(brief.story_drive_brief.protagonist_choice).toContain('当众选择')
    expect(brief.story_drive_brief.choice_cost).toContain('暴露阵盘裂纹')
    expect(brief.story_drive_brief.state_change).toContain('主动入局')
    expect(brief.story_drive_brief.obstacle).toContain('执事设局')
    expect(brief.story_drive_brief.causal_next_step).toContain('内门长老')
    expect(context.chapter_target.story_drive_brief.required_actions[0]).toContain('主角主动选择')
    expect(prompt).toContain('【主角能动性】')
    expect(prompt).toContain('执行 chapter_target.story_drive_brief')
    expect(prompt).toContain('主角选择')
    expect(prompt).toContain('选择代价')
    expect(prompt).toContain('状态变化')
  })

  test('adds serial rhythm payoff density to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 15,
        chapter_no: 15,
        title: '阵堂打脸',
        summary: '主角在阵堂公开拆穿执事偷换阵图。',
        conflict: '执事拖延审查，主角必须当场逼出破绽。',
        ending_hook: '破阵声中，内门长老认出残阵来源。',
        word_target: { label: '标准章', target: 3200, min: 2800, max: 3500 },
        scene_cards: [
          {
            scene_no: 1,
            title: '堂前拦路',
            opening_hook: '执事把假阵图拍在主角脸前。',
            conflict: '执事当众污蔑主角偷阵。',
            reader_payoff: '主角用一句反问逼执事露怯。',
            reversal: '假阵图上的裂纹反而证明执事动过手脚。',
            ending_hook_seed: '众弟子开始怀疑执事。',
            word_budget: '1000 字',
          },
          {
            scene_no: 2,
            title: '残阵反证',
            conflict: '主角必须在阵纹崩毁前复原真图。',
            reader_payoff: '残阵亮起，执事的伪证当场反噬。',
            reversal: '内门长老发现残阵源自禁库。',
            ending_hook_seed: '长老问主角从哪里学来这道阵。',
            word_budget: '1800 字',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 15, title: '阵堂打脸' },
    )

    expect(brief.serial_rhythm_brief.opening_hook_deadline).toContain('前 300 字')
    expect(brief.serial_rhythm_brief.payoff_interval).toContain('800-1200')
    expect(brief.serial_rhythm_brief.scene_payoff_budget).toHaveLength(2)
    expect(brief.serial_rhythm_brief.scene_payoff_budget[0].required_payoff).toContain('逼执事露怯')
    expect(brief.serial_rhythm_brief.scene_payoff_budget[1].turn).toContain('禁库')
    expect(brief.serial_rhythm_brief.anti_drag_rules.join('；')).toContain('连续')
    expect(context.chapter_target.serial_rhythm_brief.scene_payoff_budget[1].title).toBe('残阵反证')
    expect(prompt).toContain('【连载节奏与回报密度】')
    expect(prompt).toContain('执行 chapter_target.serial_rhythm_brief')
    expect(prompt).toContain('每 800-1200 字')
    expect(prompt).toContain('残阵反证')
    expect(prompt).toContain('伪证当场反噬')
  })

  test('adds page-turn hook execution brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 16,
        chapter_no: 16,
        title: '禁库旧阵',
        summary: '主角用残阵反证执事伪造证据。',
        conflict: '执事试图把禁库旧阵嫁祸给主角。',
        ending_hook: '内门长老盯着亮起的残阵，问主角从哪里学来禁库旧阵。',
        story_drive_brief: {
          causal_next_step: '下一章必须追问禁库旧阵来源，并逼主角解释师承。',
        },
        scene_cards: [
          {
            scene_no: 2,
            title: '残阵亮名',
            reader_payoff: '执事伪证被残阵反噬。',
            reversal: '内门长老认出残阵源自禁库。',
            ending_hook_seed: '长老当众问出禁库旧阵来源。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T10:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 16, title: '禁库旧阵' },
    )

    expect(brief.page_turn_hook_brief.core_question).toContain('禁库旧阵')
    expect(brief.page_turn_hook_brief.visible_trigger).toContain('内门长老认出')
    expect(brief.page_turn_hook_brief.next_chapter_pull).toContain('追问禁库旧阵来源')
    expect(brief.page_turn_hook_brief.forbidden_resolution.join('；')).toContain('不得在本章解释完整答案')
    expect(context.chapter_target.page_turn_hook_brief.final_image).toContain('长老当众问出')
    expect(prompt).toContain('【章末翻页钩子】')
    expect(prompt).toContain('执行 chapter_target.page_turn_hook_brief')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('内门长老认出残阵源自禁库')
    expect(prompt).toContain('不得在本章解释完整答案')
  })

  test('adds volume climax budget brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      volume_beat_budget: {
        status: 'needs_attention',
        score: 62,
        current_volume_title: '第一卷 阵堂起势',
        chapter_range: '第1-60章',
        summary: '当前卷缺中高潮和卷末爆点，本章承担第一次小高潮回报。',
        beats: [
          {
            chapter_no: 18,
            type: '小高潮',
            label: '阵堂公开打脸',
            detail: '主角公开反证执事偷换阵图。',
          },
          {
            chapter_no: 45,
            type: '卷末爆点',
            label: '禁库真相',
            detail: '禁库旧阵牵出主角师承真相。',
          },
        ],
        next_actions: ['本章只兑现阵堂公开打脸，不提前揭穿禁库真相。'],
      },
      chapter_target: {
        id: 18,
        chapter_no: 18,
        title: '阵堂公开打脸',
        summary: '主角在阵堂公开反证执事偷换阵图。',
        conflict: '执事逼主角认罪，主角必须反证阵图来源。',
        ending_hook: '禁库旧阵的第二层纹路亮起。',
        volume_beat_brief: {
          current_chapter_role: '完成第一卷第一次小高潮：阵堂公开打脸。',
          volume_goal: '让主角在阵堂立住起势资格。',
          climax_promise: '公开反证执事偷换阵图，给读者阶段性打脸回报。',
          required_beats: ['执事当众失势', '主角得到试炼资格'],
          forbidden_payoff: ['不得提前揭穿禁库真相', '不得提前解决卷末师承身份'],
        },
        scene_cards: [
          {
            title: '阵堂对证',
            conflict: '执事逼主角认罪。',
            reader_payoff: '主角公开反证执事偷换阵图。',
            reversal: '执事伪证被残阵反噬。',
            ending_hook_seed: '禁库旧阵第二层纹路亮起。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T11:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 18, title: '阵堂公开打脸' },
    )

    expect(brief.volume_climax_brief.current_chapter_role).toContain('第一次小高潮')
    expect(brief.volume_climax_brief.volume_goal).toContain('起势资格')
    expect(brief.volume_climax_brief.climax_promise).toContain('阶段性打脸回报')
    expect(brief.volume_climax_brief.required_beats).toContain('执事当众失势')
    expect(brief.volume_climax_brief.forbidden_payoff).toContain('不得提前揭穿禁库真相')
    expect(brief.volume_climax_brief.nearby_beats[0].label).toContain('阵堂公开打脸')
    expect(context.chapter_target.volume_climax_brief.forbidden_payoff[1]).toContain('师承身份')
    expect(prompt).toContain('【卷级高潮预算】')
    expect(prompt).toContain('执行 chapter_target.volume_climax_brief')
    expect(prompt).toContain('第一次小高潮')
    expect(prompt).toContain('不得提前揭穿禁库真相')
  })

  test('adds recent fatigue avoidance brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        score: 61,
        chapter_range_label: '第9-18章',
        summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
        signals: [
          { key: 'conflict_variety', label: '冲突变化', status: 'warn', detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。' },
          { key: 'payoff_variety', label: '回报变化', status: 'warn', detail: '近10章「公开打脸」出现 6 次，回报形态变化不足。' },
          { key: 'hook_variety', label: '钩子变化', status: 'warn', detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。' },
          { key: 'scene_freshness', label: '场面新鲜度', status: 'warn', detail: '近10章缺少稳定的标志性场面记录。' },
        ],
        next_actions: ['下一章要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
      },
      chapter_target: {
        id: 19,
        chapter_no: 19,
        title: '旧阵异响',
        summary: '主角发现旧阵异响来自藏书阁而非阵堂。',
        conflict: '旧执事余党仍想用阵堂规矩压人，主角转向藏书阁追查。',
        ending_hook: '藏书阁地砖下传出第二道阵鸣。',
        scene_cards: [
          {
            title: '藏书阁转场',
            conflict: '旧执事余党继续用阵堂规矩压人。',
            reader_payoff: '主角不再重复公开打脸，而是用旧阵异响反向设局。',
            ending_hook_seed: '藏书阁地砖下传出第二道阵鸣。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 19, title: '旧阵异响' },
    )

    expect(brief.recent_fatigue_brief.chapter_range_label).toContain('第9-18章')
    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('执事压迫')
    expect(brief.recent_fatigue_brief.conflict_variation).toContain('更换压迫来源')
    expect(brief.recent_fatigue_brief.payoff_variation).toContain('更换回报形态')
    expect(brief.recent_fatigue_brief.hook_variation).toContain('更换章末问题')
    expect(brief.recent_fatigue_brief.scene_freshness).toContain('可视化场面')
    expect(context.chapter_target.recent_fatigue_brief.next_actions[0]).toContain('十章连续同质化')
    expect(prompt).toContain('【近章连载动能与疲劳规避】')
    expect(prompt).toContain('执行 chapter_target.recent_fatigue_brief')
    expect(prompt).toContain('逐条执行 next_actions')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('更换压迫来源')
  })

  test('adds rolling rhythm preflight to write preparation before drafting', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        chapter_range_label: '第13-15章',
        signals: [
          {
            key: 'expectation_chain_break_gap',
            label: '连续断期待',
            status: 'warn',
            detail: '连续兑现旧目标后没有先立起下一开环。',
          },
          {
            key: 'repeated_reader_payoff_type',
            label: '回报形态重复',
            status: 'warn',
            detail: '同一核心梗连续3次以上无差异化：公开打脸连续复用。',
          },
          {
            key: 'reader_need_coverage_gap',
            label: '读者需求命中缺口',
            status: 'warn',
            detail: '爽点满足的需求偏向材料流程，偏离废柴靠残阵翻盘的书籍卖点。',
          },
        ],
        fatigue_risks: [
          '期待清空后没有新目标，可能形成期待真空。',
          '公开打脸连续3次以上无差异化。',
          '卖点偏移：章节在材料流程里打转。',
        ],
        next_actions: [
          '下一章必须在当前目标完成前提前铺设下一目标线索。',
          '下一章必须避开公开打脸，改用信息解锁或超额收获。',
        ],
      },
      batch_preflight: {
        guardrail_status: 'caution',
        guardrails: [
          { label: '批次节奏', status: 'warn', detail: '第16章缺少明确章末钩子，容易断期待。' },
        ],
        warnings: ['批次任务书提示：卖点偏移风险，不能把核心回报写成材料流水账。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '残阵再鸣',
        summary: '主角转向藏书阁追查残阵新线索。',
        conflict: '执事余党想把残阵线索封回旧账册。',
        ending_hook: '残阵鸣声指向禁库第二层。',
        scene_cards: [
          {
            title: '藏书阁封门',
            conflict: '执事余党封住藏书阁门禁。',
            reader_payoff: '主角不用公开打脸，而是用残阵反向定位禁库线索。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 16, title: '残阵再鸣' })

    expect(brief.write_preparation_brief.rolling_rhythm_preflight.status).toBe('needs_attention')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.principle).toContain('拉期待速度 > 断期待速度')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_vacuum_risks.join('；')).toContain('期待真空')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('反派视角转接')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('突发意外')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('配角杠杆')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('超额收获')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.repetition_boundary_risks.join('；')).toContain('同一核心梗连续3次以上无差异化')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.selling_point_drift_risks.join('；')).toContain('卖点偏移')
    expect(brief.write_preparation_brief.must_confirm.join('；')).toContain('拉期待速度 > 断期待速度')
    expect(context.chapter_target.write_preparation_brief.rolling_rhythm_preflight.next_actions.join('；')).toContain('提前铺设下一目标线索')
    expect(prompt).toContain('滚动节奏预检 rolling_rhythm_preflight')
    expect(prompt).toContain('拉期待速度 > 断期待速度')
    expect(prompt).toContain('期待真空期急救')
    expect(prompt).toContain('反派视角转接')
    expect(prompt).toContain('卖点偏移')
    expect(prompt).toContain('同一核心梗连续3次以上无差异化')
  })

  test('does not add rolling rhythm preflight without concrete rhythm risks', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const brief = buildChapterPreDraftBrief(project, {
      chapter_target: {
        chapter_no: 16,
        title: '残阵再鸣',
        summary: '主角转向藏书阁追查残阵新线索。',
        conflict: '执事余党想把残阵线索封回旧账册。',
        ending_hook: '残阵鸣声指向禁库第二层。',
        scene_cards: [
          {
            title: '藏书阁封门',
            conflict: '执事余党封住藏书阁门禁。',
            reader_payoff: '主角用残阵反向定位禁库线索。',
          },
        ],
      },
    })

    expect(brief.write_preparation_brief.rolling_rhythm_preflight).toBeNull()
  })

  test('builds serial momentum brief for recent five-chapter low progress and weak conflict streaks', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        { chapter_no: 11, title: '庭外等待', chapter_summary: '主角等待执事通知，整理旧资料。', conflict: '过渡等待。', ending_hook: '夜色渐深。' },
        { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角观察藏书阁门口，回忆旧案。', conflict: '观察环境。', ending_hook: '风吹过门缝。' },
        { chapter_no: 13, title: '旧纸复盘', chapter_summary: '主角复盘上一轮证据，解释阵纹来源。', conflict: '复盘说明。', ending_hook: '纸页轻响。' },
        { chapter_no: 14, title: '廊下转场', chapter_summary: '主角走过长廊，想起师父的话。', conflict: '转场铺垫。', ending_hook: '灯火摇晃。' },
        { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.chapter_range_label).toBe('第11-15章')
    expect(brief?.signals.map((item: any) => item.key)).toEqual(expect.arrayContaining(['recent_five_low_progress', 'consecutive_weak_conflict']))
    expect(brief?.fatigue_risks.join('；')).toContain('最近5章明确进展不足')
    expect(brief?.fatigue_risks.join('；')).toContain('连续弱冲突')
    expect(brief?.next_actions.join('；')).toContain('下一章必须给出明确阻力')
    expect(brief?.next_actions.join('；')).toContain('读完本章世界或关系必须不同')
  })

  test('builds serial momentum brief when recent chapters lack visible reader payoff', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        { chapter_no: 11, title: '庭外复核', chapter_summary: '主角追查旧案线索，逼执事提交复核名册。', conflict: '执事拖延复核并封锁名册。', ending_hook: '名册缺了一页。' },
        { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角进入藏书阁外院，确认门禁阵纹被人改过。', conflict: '门禁阵纹阻止他靠近。', ending_hook: '门缝里露出旧纸角。' },
        { chapter_no: 13, title: '旧纸追查', chapter_summary: '主角追查旧纸来源，定位到三年前的阵堂记录。', conflict: '阵堂弟子阻止他翻阅记录。', ending_hook: '记录尾页被撕走。' },
        { chapter_no: 14, title: '廊下封锁', chapter_summary: '主角决定转向后廊，发现巡夜路线被临时改变。', conflict: '巡夜弟子封锁后廊。', ending_hook: '后廊灯火同时熄灭。' },
        { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('recent_payoff_drought')
    expect(brief?.fatigue_risks.join('；')).toContain('可见读者回报不足')
    expect(brief?.next_actions.join('；')).toContain('下一章必须交付显性回报')
    expect(brief?.payoff_variation).toContain('显性回报')
  })

  test('does not treat structured scene reader payoffs as payoff drought', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 11,
          title: '庭外复核',
          chapter_summary: '主角追查旧案线索，执事封锁名册。',
          conflict: '执事拖延复核并封锁名册。',
          raw_payload: { scene_cards: [{ reader_payoff: '主角拿到第一份复核名册。' }] },
        },
        {
          chapter_no: 12,
          title: '藏书阁前',
          chapter_summary: '主角确认门禁阵纹被人改过。',
          conflict: '门禁阵纹阻止他靠近。',
          raw_payload: { scene_cards: [{ reader_payoff: '门禁阵纹反证执事撒谎。' }] },
        },
        {
          chapter_no: 13,
          title: '旧纸追查',
          chapter_summary: '主角定位到三年前的阵堂记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          raw_payload: { scene_cards: [{ reader_payoff: '旧纸解锁三年前阵堂记录。' }] },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('recent_payoff_drought')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same ending hook type', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册。',
          ending_hook: '名册缺页背后露出第二个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          ending_hook: '旧纸角背后露出第三个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角。',
          ending_hook: '朱印下面露出执事藏起的签名。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals?.map((item: any) => item.key) || []).toContain('repeated_ending_hook_type')
    expect(brief?.fatigue_risks.join('；')).toContain('连续章尾钩子类型重复')
    expect(brief?.hook_variation).toContain('更换章末钩子类型')
    expect(brief?.next_actions.join('；')).toContain('突然揭示')
  })

  test('reads ending hook type from serialized contextPackage snake_case chapter target', () => {
    const chapterHookContract = {
      endingHookType: '突然揭示',
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册，主角必须当场拿到查验许可。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录，主角必须用许可反压。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角，主角必须找出朱印的真用途。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals?.map((item: any) => item.key) || []).toContain('repeated_ending_hook_type')
    expect(brief?.next_actions?.join('；') || '').toContain('突然揭示')
  })

  test('does not flag repeated ending hook type when recent chapter hooks vary', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册。',
          ending_hook: '名册缺页背后露出第二个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          ending_hook: '巡夜弟子已经追到门外。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '紧急危机' } } },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角。',
          ending_hook: '朱印下面露出执事藏起的签名。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '神秘物品' } } },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_ending_hook_type')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same reader payoff type', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角当众逼执事改口，公开证明名册被藏。',
          conflict: '执事封锁名册。',
          reader_payoff: '公开打脸：执事当众改口，旁观弟子震惊倒向主角。',
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角继续当众反证，逼阵堂弟子承认旧纸来源。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '公开打脸：阵堂弟子当众低头，围观者震惊。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角再一次公开揭穿执事余党的谎话。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_reader_payoff_type')
    expect(brief?.fatigue_risks.join('；')).toContain('连续回报形态重复')
    expect(brief?.payoff_variation).toContain('更换回报形态')
    expect(brief?.next_actions.join('；')).toContain('公开打脸')
    expect(brief?.next_actions.join('；')).toContain('影响范围')
  })

  test('does not flag repeated reader payoff type when recent payoff forms vary', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角当众逼执事改口。',
          conflict: '执事封锁名册。',
          reader_payoff: '公开打脸：执事当众改口。',
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '林青禾主动站到主角一侧，承认愿意担保。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '关系回报：林青禾公开倒向主角，关系态度改变。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_reader_payoff_type')
  })

  test('builds serial momentum brief when consecutive payoff chapters leave no aftermath', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 14,
          title: '旧纸反证',
          chapter_summary: '主角公开反证旧纸来源，逼阵堂弟子当众低头。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
          ending_hook: '门外又传来一声阵鸣。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹旧解释，当众反制执事余党。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
          ending_hook: '朱印下面露出执事藏起的签名。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('consecutive_payoff_without_aftermath')
    expect(brief?.fatigue_risks.join('；')).toContain('连续只爆点不留反应余波')
    expect(brief?.next_actions.join('；')).toContain('承接余波')
    expect(brief?.next_actions.join('；')).toContain('关系')
    expect(brief?.scene_freshness).toContain('承接场景')
  })

  test('does not flag consecutive payoff chapters when aftermath advances relation or foreshadowing', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 14,
          title: '旧纸反证',
          chapter_summary: '主角公开反证旧纸来源，逼阵堂弟子低头；林青禾态度改变，主动把三年前记录伏笔交给主角。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
          ending_hook: '林青禾留下新的伏笔线索。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹旧解释；执事余党失态后，关系余波让旁证倒向主角，并打开下一目标。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
          ending_hook: '下一目标指向藏书阁。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('consecutive_payoff_without_aftermath')
  })

  test('builds serial momentum brief when mainline and subplot both flatline', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，暂时等待长老回复。',
          conflict: '复盘说明，没有新的阻力。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '等待长老回复，主线暂不推进。',
                subplot: '整理旁证名单，支线暂不推进。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角观察禁库灯色，继续整理旧案材料。',
          conflict: '观察环境，等待通知。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '观察禁库动静，主线继续铺垫。',
                subplot: '复盘林青禾态度，支线没有变化。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('line_stagger_flatline')
    expect(brief?.fatigue_risks.join('；')).toContain('主线和支线同时空转')
    expect(brief?.next_actions.join('；')).toContain('错开节奏')
    expect(brief?.next_actions.join('；')).toContain('主线')
    expect(brief?.next_actions.join('；')).toContain('支线')
  })

  test('does not flag line stagger when mainline and subplot alternate progress', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角确认执事账册缺页，主线推进到禁库。',
          conflict: '执事余党阻止他带走证据。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '确认账册缺页，主线推进到禁库入口。',
                subplot: '林青禾关系线暂时压住不爆。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '林青禾主动担保，关系支线推进；主线只保留禁库门禁伏笔。',
          conflict: '门禁规则要求担保人承担代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '禁库门禁作为伏笔保留，暂不解决。',
                subplot: '林青禾主动担保，关系支线推进。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('line_stagger_flatline')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same core element combo', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧印争夺',
          chapter_summary: '主角在试炼台夺回旧印，关系奖励落到林青禾认可。',
          conflict: '阵堂弟子争夺旧印并逼主角上台比试。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['夺宝', '关系奖励', '比武试炼'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '玉牌争夺',
          chapter_summary: '主角在试炼台夺回玉牌，关系奖励继续落到旁证倒向。',
          conflict: '执事余党争夺玉牌并逼主角再次比试。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['夺宝', '关系奖励', '比武试炼'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_core_element_combo')
    expect(brief?.fatigue_risks.join('；')).toContain('核心要素组合重复')
    expect(brief?.next_actions.join('；')).toContain('更换场景')
    expect(brief?.next_actions.join('；')).toContain('人物')
    expect(brief?.next_actions.join('；')).toContain('情绪')
  })

  test('reads story loop core elements from serialized context_package camelCase chapter target', () => {
    const storyLoopContract = {
      coreElements: ['镜厅规则', '债契证明', '旁证转向'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧印复核',
          chapter_summary: '主角在案台前核对旧印编号，登记结果暂时没有变化。',
          conflict: '执事要求主角补齐一份普通材料。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                storyLoopContract,
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '玉牌复核',
          chapter_summary: '主角在案台前核对玉牌编号，登记结果仍然没有变化。',
          conflict: '执事要求主角再补一份普通材料。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                storyLoopContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_core_element_combo')
    expect(brief?.fatigue_risks.join('；')).toContain('核心要素组合重复')
  })

  test('does not flag core element combo when the repeated routine rotates one element', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧印争夺',
          chapter_summary: '主角在试炼台夺回旧印，关系奖励落到林青禾认可。',
          conflict: '阵堂弟子争夺旧印并逼主角上台比试。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['夺宝', '关系奖励', '比武试炼'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '禁库副本',
          chapter_summary: '主角进入禁库副本，关系奖励转成林青禾承担代价。',
          conflict: '禁库规则压制主角，逼他破解副本门禁。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['副本探索', '关系奖励', '比武试炼'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_core_element_combo')
  })

  test('builds serial momentum brief when consecutive chapter blueprints miss climax and reward closure', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，发现几处金额异常。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角继续观察禁库灯色，确认旧阵有第二道回声。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                ending: '主角暂时记下线索，等待下一次机会。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('blueprint_climax_reward_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('缺少高潮和收获闭环')
    expect(brief?.next_actions.join('；')).toContain('起因')
    expect(brief?.next_actions.join('；')).toContain('高潮')
    expect(brief?.next_actions.join('；')).toContain('收获')
  })

  test('does not flag blueprint closure when recent chapters include climax and reward', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('blueprint_climax_reward_gap')
  })

  test('builds serial momentum brief when recent blueprints lose protagonist short and long goals', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，发现几处金额异常。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
              plot_lines: {
                mainline: '旧案线继续推进到禁库。',
                subplot: '林青禾旁观但态度暂不明。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
              plot_lines: {
                mainline: '旧案线继续推进到第二道阵鸣。',
                subplot: '林青禾担保的代价暂时压住。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('protagonist_goal_continuity_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('当前小目标和长线大目标')
    expect(brief?.next_actions.join('；')).toContain('短线行动目标')
    expect(brief?.next_actions.join('；')).toContain('长线大目标')
  })

  test('does not flag protagonist goal continuity when short and long goals are explicit', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('protagonist_goal_continuity_gap')
  })

  test('builds serial momentum brief when endings do not both count harvest and set up next segment', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，旧账册暂时收好。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，下一目标指向第二道阵鸣。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '下一目标指向第二道阵鸣的入口。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('ending_harvest_handoff_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('章尾没有同时完成收获清点和铺垫下一段')
    expect(brief?.next_actions.join('；')).toContain('收获清点')
    expect(brief?.next_actions.join('；')).toContain('铺垫下一段')
  })

  test('does not flag ending handoff when endings count harvest and seed the next segment', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角清点收获：拿到复核资格和旧印编号；下一目标指向禁库夜灯。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('ending_harvest_handoff_gap')
  })

  test('builds serial momentum brief when endings close safely without unresolved suspense', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧案收束',
          chapter_summary: '主角查完旧案，众人确认账册无误。',
          conflict: '审判庭要求他当场复核旧案账册，不能离开。',
          ending_hook: '旧案终于结束，众人各自回房休息。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：复核旧案账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭要求复核账册。',
                development: '主角对照旧印编号。',
                climax: '主角确认账册无误。',
                ending: '旧案终于结束，众人各自回房休息。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '禁库归档',
          chapter_summary: '主角把禁库记录归档，现场恢复平静。',
          conflict: '掌院要求他完成禁库归档任务。',
          ending_hook: '禁库恢复平静，主角整理完记录。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：归档禁库记录。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求禁库归档。',
                development: '主角整理记录。',
                climax: '归档顺利完成。',
                ending: '禁库恢复平静，主角整理完记录。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '夜色收柜',
          chapter_summary: '主角把账册收好，章节在平静夜色里结束。',
          conflict: '账房要求他值班清点账册。',
          ending_hook: '夜色渐深，账册被收进柜中。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：清点账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '账房要求值班清点。',
                development: '主角核对页码。',
                climax: '账册清点完毕。',
                ending: '夜色渐深，账册被收进柜中。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('ending_suspense_hook_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('未解决')
    expect(brief?.next_actions.join('；')).toContain('危险')
    expect(brief?.next_actions.join('；')).toContain('新门槛')
  })

  test('does not flag ending suspense when endings leave concrete danger or unresolved questions', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '阵鸣未停',
          chapter_summary: '主角查完旧案第一层，但门外传来第二声阵鸣。',
          conflict: '审判庭要求他当场复核旧案账册，不能离开。',
          ending_hook: '门外传来第二声阵鸣，禁库门缝里渗出血色符光。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：复核旧案账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭要求复核账册。',
                development: '主角对照旧印编号。',
                climax: '主角确认账册第一层真相。',
                ending: '门外传来第二声阵鸣，禁库门缝里渗出血色符光。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '缺页第三名',
          chapter_summary: '主角完成归档时发现账册缺页露出第三个名字。',
          conflict: '掌院要求他完成禁库归档任务。',
          ending_hook: '账册缺页露出第三个名字，名字旁还有未解的掌院血印。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：归档禁库记录。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求禁库归档。',
                development: '主角整理记录。',
                climax: '归档完成时缺页滑出。',
                ending: '账册缺页露出第三个名字，名字旁还有未解的掌院血印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '十息交印',
          chapter_summary: '主角清点账册后，长老席压下十息倒计时。',
          conflict: '账房要求他值班清点账册。',
          ending_hook: '倒计时只剩十息，长老席要求主角立刻交出旧印。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：清点账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '账房要求值班清点。',
                development: '主角核对页码。',
                climax: '账册清点完毕。',
                ending: '倒计时只剩十息，长老席要求主角立刻交出旧印。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('ending_suspense_hook_gap')
  })

  test('builds serial momentum brief when old expectations close before a new open loop is running', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '资格兑现',
          chapter_summary: '主角当众证明旧账册无误，资格门槛终于通过，当前期待全部兑现。',
          conflict: '审判庭要求主角复核旧账册，必须当场给出结果。',
          ending_hook: '资格门槛终于通过，危机到这里总算结束，暂时没有新的期待线。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：拿到复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭压住复核资格。',
                development: '主角拿出旧账册证据。',
                climax: '资格门槛终于通过。',
                ending: '所有期待都兑现，没有新的期待线。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '证人结案',
          chapter_summary: '主角找到第三个证人，第三个证人的答案也已经兑现。',
          conflict: '掌院要求他证明第三个证人的身份。',
          ending_hook: '第三个证人说完真相，谜题彻底解决，麻烦消失了。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：找到第三个证人。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求证明证人身份。',
                development: '主角核对证词。',
                climax: '第三个证人给出答案。',
                ending: '谜题彻底解决，麻烦消失了。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧案收官',
          chapter_summary: '主角公开旧案真相，长老席改判，父亲旧案期待清空。',
          conflict: '长老席要求他交出最终证据。',
          ending_hook: '父亲旧案全部查清，所有期待都兑现，之后只需等待新生活开始。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：公开最终证据。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '长老席逼他交证据。',
                development: '主角公开证据链。',
                climax: '长老席改判。',
                ending: '父亲旧案全部查清，所有期待都兑现。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_chain_break_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('断期待')
    expect(brief?.next_actions.join('；')).toContain('下一开环')
    expect(brief?.next_actions.join('；')).toContain('新门槛')
  })

  test('does not flag expectation chain when payoffs seed the next open loop', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '资格后门',
          chapter_summary: '主角当众证明旧账册无误，资格门槛通过前先露出禁库夜灯的新线索。',
          conflict: '审判庭要求主角复核旧账册，必须当场给出结果。',
          ending_hook: '资格到手只是第一步，下一开环是禁库夜灯在子时突然亮起。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：拿到复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭压住复核资格。',
                development: '主角拿出旧账册证据。',
                climax: '资格门槛通过。',
                ending: '下一目标指向禁库夜灯新线索。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '证人缺页',
          chapter_summary: '主角找到第三个证人，但证词缺页留下掌院血印的新困境。',
          conflict: '掌院要求他证明第三个证人的身份。',
          ending_hook: '第三个证人说出答案，但证词缺页露出掌院血印，长期期待继续保温。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：找到第三个证人。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求证明证人身份。',
                development: '主角核对证词。',
                climax: '第三个证人给出答案。',
                ending: '新困境是证词缺页和掌院血印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧案更深',
          chapter_summary: '主角公开旧案真相，同时发现旧案背后还有更深一层的幕后名单。',
          conflict: '长老席要求他交出最终证据。',
          ending_hook: '旧案改判后，幕后名单露出第四个名字，下一章必须追查名单来源。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：公开最终证据。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '长老席逼他交证据。',
                development: '主角公开证据链。',
                climax: '长老席改判。',
                ending: '幕后名单露出第四个名字，下一章追查来源。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('expectation_chain_break_gap')
  })

  test('builds serial momentum brief when core hook contracts are absent from consecutive chapters', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '店铺整理',
          chapter_summary: '主角回到旧城维修铺，整理货架和客户登记表，等待协会通知。',
          conflict: '协会要求他先把店铺资料补齐。',
          ending_hook: '资料整理完毕，主角关灯休息。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会要求补资料。',
                development: '主角整理货架和表格。',
                climax: '资料提交成功。',
                ending: '店铺恢复整洁。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['每章至少有核心梗相关期待点或爽点。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会排队',
          chapter_summary: '主角去协会窗口排队，和工作人员确认下一批审核时间。',
          conflict: '窗口名额有限，他只能等待叫号。',
          ending_hook: '叫号结束，主角拿到回执。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会开放审核窗口。',
                development: '主角排队等候。',
                climax: '工作人员盖章。',
                ending: '主角拿到回执。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度推进。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '客户问价',
          chapter_summary: '客户来店里询问维修价格，主角按价目表解释服务流程。',
          conflict: '客户嫌价格高，主角耐心介绍普通维修周期。',
          ending_hook: '客户决定回去考虑，主角继续等下一位。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户进店问价。',
                development: '主角解释服务流程。',
                climax: '客户拿走报价单。',
                ending: '主角继续等下一位。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['核心卖点背后的情绪必须清晰。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('core_hook_absence_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('核心梗')
    expect(brief?.next_actions.join('；')).toContain('期待点')
    expect(brief?.next_actions.join('；')).toContain('爽点')
  })

  test('does not flag core hook absence when chapters deliver expectation points or payoffs from the core hook', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '工具箱亮格',
          chapter_summary: '主角打开隐藏工具箱，系统检测报废电机仍有三成可修，客户第一次产生期待。',
          conflict: '协会要求他先证明报废设备还有维修价值。',
          ending_hook: '隐藏工具箱弹出第二层检测，下一目标是把报废电机修成新订单。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会质疑报废设备价值。',
                development: '隐藏工具箱给出检测结果。',
                climax: '客户看到设备还有可修空间。',
                ending: '第二层检测打开下一订单期待。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '报废翻新',
          chapter_summary: '主角用隐藏工具箱拆出旧件漏洞，把报废设备修成可交付样机。',
          conflict: '客户担心旧件会再次损坏。',
          ending_hook: '样机启动，客户态度反转，新订单只差协会盖章。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户担心旧件损坏。',
                development: '主角用工具箱定位漏洞。',
                climax: '报废设备修成样机。',
                ending: '客户态度反转，新订单进入盖章门槛。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '新单到账',
          chapter_summary: '主角交付修好的设备，系统奖励到账，客户追加新订单。',
          conflict: '协会审核员质疑样机稳定性。',
          ending_hook: '系统奖励即时反馈，下一章必须用新功能处理更大的报废设备。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '审核员质疑稳定性。',
                development: '主角演示修复后的设备。',
                climax: '客户追加新订单。',
                ending: '系统奖励到账，新功能打开下一目标。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('core_hook_absence_gap')
  })

  test('builds serial momentum brief when the same core hook angle repeats across chapters', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '电机检测',
          chapter_summary: '主角用隐藏工具箱检测报废电机，发现轴承磨损，客户等待检测结果。',
          conflict: '客户质疑报废电机还能不能修。',
          ending_hook: '隐藏工具箱给出电机检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废电机。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '水泵检测',
          chapter_summary: '主角用隐藏工具箱检测报废水泵，发现轴承磨损，客户继续等待检测结果。',
          conflict: '客户质疑报废水泵还能不能修。',
          ending_hook: '隐藏工具箱给出水泵检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废水泵。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '风机检测',
          chapter_summary: '主角用隐藏工具箱检测报废风机，发现轴承磨损，客户仍然等待检测结果。',
          conflict: '客户质疑报废风机还能不能修。',
          ending_hook: '隐藏工具箱给出风机检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废风机。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('core_hook_angle_repetition_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('同一核心卖点')
    expect(brief?.next_actions.join('；')).toContain('不同角度')
    expect(brief?.next_actions.join('；')).toContain('不同矛盾')
  })

  test('does not flag core hook angle repetition when the same hook rotates angles and conflicts', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '工具箱检测',
          chapter_summary: '主角用隐藏工具箱检测报废电机，客户第一次看到旧件还有可修空间。',
          conflict: '客户质疑报废设备没有维修价值。',
          ending_hook: '检测结果打开新订单期待。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户质疑报废设备。',
                development: '隐藏工具箱给出检测。',
                climax: '检测证明设备可修。',
                ending: '新订单期待被拉起。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会反制',
          chapter_summary: '协会审核员用旧规卡住订单，主角借隐藏工具箱的规则边界反制审核判定。',
          conflict: '协会规则要求报废设备不能直接接单。',
          ending_hook: '规则边界被反制后，客户态度开始松动。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会旧规卡单。',
                development: '主角找到规则边界。',
                climax: '主角反制审核判定。',
                ending: '客户态度松动。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '订单回报',
          chapter_summary: '主角交付修好的样机，客户态度反转并追加新订单，系统奖励到账。',
          conflict: '客户担心样机无法稳定交付。',
          ending_hook: '新订单和系统奖励同时到账，下一章处理更大的报废设备。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户担心样机稳定性。',
                development: '主角演示交付样机。',
                climax: '客户追加新订单。',
                ending: '系统奖励到账并打开下一目标。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('core_hook_angle_repetition_gap')
  })

  test('builds serial momentum brief when story loop expansion stays in the same small world', () => {
    const storyLoopContract = {
      map_transition_rules: [
        '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
        '换地图后前5章必须快速建立新的代入感和期待感。',
      ],
      nested_loop_rules: [
        '小循环 -> 中循环 -> 大循环。',
        '小循环中必须铺垫大循环的期待。',
      ],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '维修铺旧单',
          chapter_summary: '主角继续待在旧城维修铺，接待同一类客户，核对上一批报废设备登记。',
          conflict: '客户要求主角继续说明普通维修流程。',
          ending_hook: '主角把旧登记表收好，等待下一位客户进门。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '同类客户又带来旧设备。',
                development: '主角在维修铺解释检测流程。',
                climax: '客户接受普通登记。',
                ending: '主角继续守着维修铺等下一位客户。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会窗口回执',
          chapter_summary: '主角仍在旧城协会窗口处理同一批回执，工作人员让他继续排队。',
          conflict: '窗口规则要求主角补同一份表格。',
          ending_hook: '回执盖章后，主角回到维修铺继续等待。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '协会窗口叫到他的号码。',
                development: '主角递交同一批维修回执。',
                climax: '工作人员盖章确认。',
                ending: '主角拿回回执，回维修铺继续等待。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '同类设备复核',
          chapter_summary: '主角继续修同类报废设备，流程仍是登记、检测、报价，没有打开更大的目标。',
          conflict: '客户质疑报价，要求他重复解释维修周期。',
          ending_hook: '报价单放回桌上，主角继续等下一件同类旧设备。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '又一件同类设备送到维修铺。',
                development: '主角重复登记、检测、报价。',
                climax: '客户暂时接受报价。',
                ending: '主角继续等待下一件同类旧设备。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('world_expansion_stall_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('世界观扩展')
    expect(brief?.next_actions.join('；')).toContain('新地图')
    expect(brief?.next_actions.join('；')).toContain('新势力')
    expect(brief?.next_actions.join('；')).toContain('大循环')
  })

  test('does not flag world expansion stall when chapters open new map, faction and rules', () => {
    const storyLoopContract = {
      map_transition_rules: [
        '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
        '换地图后前5章必须快速建立新的代入感和期待感。',
      ],
      nested_loop_rules: [
        '小循环 -> 中循环 -> 大循环。',
        '小循环中必须铺垫大循环的期待。',
      ],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '赤炉城新单' },
      [
        {
          chapter_no: 16,
          title: '入赤炉城',
          chapter_summary: '主角离开旧城维修铺，进入新地图赤炉城，炉烟、矿车和城门税契打开新环境。',
          conflict: '赤炉城城门新规则要求外来维修师先交炼炉保。',
          ending_hook: '旧城税契背面露出赤炉城矿脉账册入口，下一目标转向大循环资源黑幕。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '旧城订单指向赤炉城。',
                development: '主角进入赤炉城，看到炉烟、矿车和城门税契。',
                climax: '赤炉城炼炉保规则拦住他。',
                ending: '矿脉账册入口露出，大循环资源黑幕被点亮。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '铸堂掌炉人',
          chapter_summary: '新势力铸堂掌炉人出面，要求主角在赤炉城规则下证明旧件价值。',
          conflict: '铸堂掌炉人和协会高层争夺第一块炉牌归属。',
          ending_hook: '掌炉人递出新势力名单，下一章必须查清谁控制资源门槛。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '主角拿税契找铸堂登记。',
                development: '铸堂掌炉人和协会高层同时压价。',
                climax: '第一块炉牌归属变成新势力冲突。',
                ending: '新势力名单指向资源门槛背后的控制者。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '炼炉保新规',
          chapter_summary: '赤炉城炼炉保、城规和资源门槛逐步展开，主角拿到通往矿脉账册的第一条规则漏洞。',
          conflict: '城规规定外来者不得直接触碰矿脉旧件。',
          ending_hook: '规则漏洞只打开半扇门，大循环期待继续指向资源黑幕和更高层势力。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '主角复核炼炉保条文。',
                development: '城规、资源门槛和矿脉旧件限制逐步展开。',
                climax: '主角找到第一条规则漏洞。',
                ending: '大循环期待指向资源黑幕和更高层势力。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('world_expansion_stall_gap')
  })

  test('builds serial momentum brief when target reader needs are not covered across chapters', () => {
    const targetReaderContract = {
      reader_profile: '番茄男频读者，想看旧城小人物靠隐藏工具箱翻盘。',
      reader_desires: ['被轻视后当场反制', '掌控规则边界', '客户认可与订单回报'],
      emotional_gap_analysis: ['核心痛苦：被规则和客户轻视', '未满足需求：尊严、掌控感、即时收益'],
      chapter_attractions: ['隐藏工具箱把报废设备变成可感知回报。'],
      validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '报价登记',
          chapter_summary: '主角在旧城维修铺整理报价表，向客户说明普通登记流程。',
          conflict: '客户要求他先把维修说明写清楚。',
          ending_hook: '说明写完后，主角把表格放回抽屉。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户询问报价。',
                development: '主角解释登记流程。',
                climax: '报价表整理完毕。',
                ending: '主角把表格收回抽屉。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '窗口排号',
          chapter_summary: '主角去协会窗口排号，工作人员让他补同一份材料。',
          conflict: '窗口只受理完整材料。',
          ending_hook: '材料交齐后，主角拿着回执离开。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '协会窗口叫号。',
                development: '主角补材料。',
                climax: '工作人员盖章。',
                ending: '主角拿回普通回执。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '设备复核',
          chapter_summary: '主角继续复核同类报废设备，按清单确认螺丝和外壳编号。',
          conflict: '客户要求他再解释一次维修周期。',
          ending_hook: '清单核对完，主角继续等待下一件设备。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '同类设备送到柜台。',
                development: '主角核对螺丝和外壳编号。',
                climax: '清单确认无误。',
                ending: '主角继续等待下一件设备。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('reader_need_coverage_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('读者需求')
    expect(brief?.next_actions.join('；')).toContain('尊严')
    expect(brief?.next_actions.join('；')).toContain('掌控感')
    expect(brief?.next_actions.join('；')).toContain('可感知回报')
  })

  test('does not flag reader need coverage when chapters deliver concrete reader rewards', () => {
    const targetReaderContract = {
      reader_profile: '番茄男频读者，想看旧城小人物靠隐藏工具箱翻盘。',
      reader_desires: ['被轻视后当场反制', '掌控规则边界', '客户认可与订单回报'],
      emotional_gap_analysis: ['核心痛苦：被规则和客户轻视', '未满足需求：尊严、掌控感、即时收益'],
      chapter_attractions: ['隐藏工具箱把报废设备变成可感知回报。'],
      validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '旧规反制',
          chapter_summary: '客户轻视主角的报价，主角用隐藏工具箱找出旧规漏洞，当场反制审核判定。',
          conflict: '协会旧规压住报废设备订单。',
          ending_hook: '审核员改口，客户第一次认可主角能掌控规则边界。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户和审核员同时看低主角。',
                development: '主角用工具箱定位旧规漏洞。',
                climax: '主角当场反制审核判定。',
                ending: '客户认可，主角拿回尊严和掌控感。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '订单回报',
          chapter_summary: '主角修好报废设备，客户态度反转并追加订单，系统奖励即时反馈。',
          conflict: '客户担心设备无法稳定交付。',
          ending_hook: '订单回报和奖励到账，下一章处理更大的设备门槛。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户提出稳定性交付要求。',
                development: '主角演示修复结果。',
                climax: '客户态度反转，追加订单。',
                ending: '即时收益到账，下一门槛打开。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '当众翻盘',
          chapter_summary: '协会公开质疑主角资格，主角用检测结果当众翻盘，让围观客户看到不公平被移除。',
          conflict: '协会要求他证明报废设备不是违规接单。',
          ending_hook: '围观客户站到主角这边，新的大额订单带来可感知回报。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '协会公开质疑主角。',
                development: '主角压住检测结果等待对方说满。',
                climax: '主角当众翻盘，移除不公平判定。',
                ending: '围观客户认可并给出大额订单。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('reader_need_coverage_gap')
  })

  test('builds serial momentum brief when two-long-one-short expectation layers are missing across chapters', () => {
    const expectationThresholdContract = {
      short_expectation: '短期期待：下一章先拿到复核资格。',
      medium_expectations: ['中期期待：这个剧情单元要查清协会调包链。'],
      long_expectations: ['长期期待：父亲旧案背后的幕后长老是谁。'],
      three_expectation_lines: {
        plot_expectation: '协会调包链背后是谁。',
        theme_payoff: '旧城小人物靠隐藏工具箱夺回尊严。',
        freshness_hook: '工具箱规则会碰到更高层势力。',
      },
      quality_checks: ['两长一短期待必须同时在线。', '三层期待：短期、中期、长期不能断。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '回执整理',
          chapter_summary: '主角整理协会回执，完成当前材料核对。',
          conflict: '窗口要求他补齐一张表。',
          ending_hook: '表格补齐后，主角回维修铺等待通知。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '窗口要求补表。',
                development: '主角整理回执。',
                climax: '表格核对完成。',
                ending: '主角等待通知。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '设备清点',
          chapter_summary: '主角清点旧设备编号，把当前清单交给客户确认。',
          conflict: '客户要求他重新核对外壳编号。',
          ending_hook: '清单确认后，主角继续等待协会回复。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '客户递来同类设备。',
                development: '主角核对编号。',
                climax: '清单确认无误。',
                ending: '主角继续等待回复。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '报价复核',
          chapter_summary: '主角复核维修报价，完成当前报价单。',
          conflict: '客户要求他解释价格构成。',
          ending_hook: '报价单复核完毕，主角把单据收回抽屉。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '客户质疑报价。',
                development: '主角解释价格。',
                climax: '报价单复核完成。',
                ending: '主角收起单据。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_ladder_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('两长一短')
    expect(brief?.next_actions.join('；')).toContain('短期')
    expect(brief?.next_actions.join('；')).toContain('中期')
    expect(brief?.next_actions.join('；')).toContain('长期')
  })

  test('reads expectation ladder contract from serialized context_package camelCase chapter target', () => {
    const expectationThresholdContract = {
      shortExpectation: '短期期待：下一章先拿到复核资格。',
      mediumExpectations: ['中期期待：这个剧情单元要查清协会调包链。'],
      longExpectations: ['长期期待：父亲旧案背后的幕后长老是谁。'],
      threeExpectationLines: {
        plotExpectation: '协会调包链背后是谁。',
        themePayoff: '旧城小人物靠隐藏工具箱夺回尊严。',
        freshnessHook: '工具箱规则会碰到更高层势力。',
      },
      qualityChecks: ['两长一短期待必须同时在线。', '三层期待：短期、中期、长期不能断。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '回执整理',
          chapter_summary: '主角整理协会回执，完成当前材料核对。',
          conflict: '窗口要求他补齐一张表。',
          ending_hook: '表格补齐后，主角回维修铺等待通知。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '设备清点',
          chapter_summary: '主角清点旧设备编号，把当前清单交给客户确认。',
          conflict: '客户要求他重新核对外壳编号。',
          ending_hook: '清单确认后，主角继续等待协会回复。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '报价复核',
          chapter_summary: '主角复核维修报价，完成当前报价单。',
          conflict: '客户要求他解释价格构成。',
          ending_hook: '报价单复核完毕，主角把单据收回抽屉。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_ladder_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('两长一短')
  })

  test('does not flag expectation ladder when short medium and long expectations stay visible', () => {
    const expectationThresholdContract = {
      short_expectation: '短期期待：下一章先拿到复核资格。',
      medium_expectations: ['中期期待：这个剧情单元要查清协会调包链。'],
      long_expectations: ['长期期待：父亲旧案背后的幕后长老是谁。'],
      three_expectation_lines: {
        plot_expectation: '协会调包链背后是谁。',
        theme_payoff: '旧城小人物靠隐藏工具箱夺回尊严。',
        freshness_hook: '工具箱规则会碰到更高层势力。',
      },
      quality_checks: ['两长一短期待必须同时在线。', '三层期待：短期、中期、长期不能断。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '复核资格',
          chapter_summary: '短期期待是下一章先拿到复核资格；资格只是入口，中期期待继续追查协会调包链。',
          conflict: '协会用旧规卡住主角。',
          ending_hook: '复核资格到手前，父亲旧案背后的幕后长老名字仍然没有答案，长期期待继续悬着。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '旧规卡住复核资格。',
                development: '主角找到旧规漏洞。',
                climax: '复核资格差一步到手。',
                ending: '中期期待转向协会调包链，长期期待挂住幕后长老。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '调包链',
          chapter_summary: '本章短期期待是查到第二张回执，中期期待推进协会调包链，长期期待仍指向父亲旧案幕后。',
          conflict: '窗口人员拒绝交出第二张回执。',
          ending_hook: '第二张回执露出调包链下一环，幕后长老为什么放任这条链仍是长期期待。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '第二张回执被扣。',
                development: '主角追查窗口人员。',
                climax: '第二张回执露出下一环。',
                ending: '中期调包链继续推进，长期幕后长老仍未解。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '幕后门缝',
          chapter_summary: '短期期待是下一步打开仓库门，中期期待是这个单元收束调包链，长期期待是父亲旧案幕后长老现身。',
          conflict: '仓库门禁阻止主角进入。',
          ending_hook: '仓库门只开一半，调包链还没收束，父亲旧案幕后长老的长期期待继续保温。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '仓库门禁拦住主角。',
                development: '主角破解门禁。',
                climax: '仓库门开出一半。',
                ending: '短期打开仓库，中期收束调包链，长期追幕后长老。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('expectation_ladder_gap')
  })

  test('builds serial momentum brief when the same foreshadowing clue stalls without progress', () => {
    const suspenseContract = {
      foreshadowing_boundary_rules: [
        '伏笔不是谜语人：长期线索必须自然藏进动作、物件、误判或环境回声。',
        '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
      ],
      expectation_chain: {
        active_lines: ['长期线索：旧钥匙缺口到底对应哪扇门。'],
        carry_rules: ['每次出现必须有信息增量，不能只重复提醒。'],
      },
      quality_checks: ['长期伏笔必须持续推进，不能连续三章只出现不变化。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '旧钥匙收柜',
          chapter_summary: '主角再次看见旧钥匙缺口，但只是把旧钥匙缺口收进抽屉，没有新发现。',
          conflict: '客户催他先处理报价。',
          ending_hook: '旧钥匙缺口仍然没有答案，主角暂时不查。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '主角摸到旧钥匙缺口。',
                development: '他把旧钥匙缺口收好。',
                climax: '报价单处理完。',
                ending: '旧钥匙缺口没有推进。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '旧钥匙压纸',
          chapter_summary: '主角又看到旧钥匙缺口，仍然只是压在登记本下面，没有任何推进。',
          conflict: '协会窗口要求他先补材料。',
          ending_hook: '旧钥匙缺口继续留在登记本下，仍未给出答案路径。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '旧钥匙缺口露出来。',
                development: '主角继续把它压回登记本。',
                climax: '材料补齐。',
                ending: '旧钥匙缺口仍未推进。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧钥匙又响',
          chapter_summary: '旧钥匙缺口第三次被提起，但主角仍旧没有查门锁、齿痕或水痕，只继续处理设备。',
          conflict: '客户要求他先解释维修周期。',
          ending_hook: '旧钥匙缺口被他重新收好，长期线索没有推进。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '旧钥匙缺口又响了一声。',
                development: '主角继续处理设备。',
                climax: '维修周期解释完。',
                ending: '旧钥匙缺口仍旧没有推进。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('foreshadowing_stall_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('伏笔不是谜语人')
    expect(brief?.next_actions.join('；')).toContain('推进')
    expect(brief?.next_actions.join('；')).toContain('提前给')
  })

  test('reads suspense contract from serialized contextPackage snake_case chapter target', () => {
    const suspenseContract = {
      foreshadowingBoundaryRules: [
        '伏笔不是谜语人：长期线索必须自然藏进动作、物件、误判或环境回声。',
        '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
      ],
      expectationChain: {
        activeLines: ['长期线索：旧钥匙缺口到底对应哪扇门。'],
        carryRules: ['每次出现必须有信息增量，不能只重复提醒。'],
      },
      qualityChecks: ['长期伏笔必须持续推进，不能连续三章只出现不变化。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '旧钥匙收柜',
          chapter_summary: '主角再次看见旧钥匙缺口，但只是把旧钥匙缺口收进抽屉，没有新发现。',
          conflict: '客户催他先处理报价。',
          ending_hook: '旧钥匙缺口仍然没有答案，主角暂时不查。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                suspenseContract,
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '旧钥匙压纸',
          chapter_summary: '主角又看到旧钥匙缺口，仍然只是压在登记本下面，没有任何推进。',
          conflict: '协会窗口要求他先补材料。',
          ending_hook: '旧钥匙缺口继续留在登记本下，仍未给出答案路径。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                suspenseContract,
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧钥匙又响',
          chapter_summary: '旧钥匙缺口第三次被提起，但主角仍旧没有查门锁、齿痕或水痕，只继续处理设备。',
          conflict: '客户要求他先解释维修周期。',
          ending_hook: '旧钥匙缺口被他重新收好，长期线索没有推进。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                suspenseContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('foreshadowing_stall_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('伏笔不是谜语人')
  })

  test('serial momentum contract readers use merged raw context chapter target paths', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/batch-serial/serial-momentum.ts'), 'utf8')
    const legacyRawTargetReadCount = (source.match(/rawPayload\?\.context_package\?\.chapter_target \|\| rawPayload\?\.contextPackage\?\.chapterTarget \|\| \{\}/g) || []).length

    expect(source).toContain('function serialChapterRawContextTarget(chapter: any)')
    expect(source).toContain('rawPayload?.context_package?.chapterTarget')
    expect(source).toContain('rawPayload?.contextPackage?.chapter_target')
    expect(legacyRawTargetReadCount).toBe(0)
  })

  test('does not flag foreshadowing stall when the clue gains information each time', () => {
    const suspenseContract = {
      foreshadowing_boundary_rules: [
        '伏笔不是谜语人：长期线索必须自然藏进动作、物件、误判或环境回声。',
        '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
      ],
      expectation_chain: {
        active_lines: ['长期线索：旧钥匙缺口到底对应哪扇门。'],
        carry_rules: ['每次出现必须有信息增量，不能只重复提醒。'],
      },
      quality_checks: ['长期伏笔必须持续推进，不能连续三章只出现不变化。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '缺口对齿',
          chapter_summary: '主角发现旧钥匙缺口和门环齿痕对应，第一次打开答案路径。',
          conflict: '客户要求他先证明这不是普通旧钥匙。',
          ending_hook: '旧钥匙缺口对应门环齿痕，下一步要找出那扇门。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '旧钥匙缺口擦过门环。',
                development: '主角看到齿痕对应。',
                climax: '答案路径第一次打开。',
                ending: '旧钥匙缺口指向一扇门。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '水痕对门',
          chapter_summary: '主角确认旧钥匙缺口对应玻璃门水痕，线索从物件推进到地点。',
          conflict: '协会窗口人员阻止他靠近玻璃门。',
          ending_hook: '旧钥匙缺口和水痕匹配，旧仓门锁成为新门槛。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '玻璃门水痕出现。',
                development: '主角对照旧钥匙缺口。',
                climax: '水痕和缺口匹配。',
                ending: '旧仓门锁成为新门槛。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '半扇门开',
          chapter_summary: '主角用旧钥匙缺口打开旧仓门一半，兑现部分答案，同时露出新的门内名单。',
          conflict: '旧仓门锁卡住钥匙。',
          ending_hook: '旧钥匙缺口回收一半答案，门内名单又指向下一层长期线索。',
          raw_payload: {
            chapter_blueprint: {
              suspense_contract: suspenseContract,
              content_outline: {
                cause: '旧仓门锁卡住钥匙。',
                development: '主角用缺口对齐锁芯。',
                climax: '旧仓门打开一半。',
                ending: '旧钥匙缺口兑现部分答案，新名单打开下一层。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('foreshadowing_stall_gap')
  })

  test('builds serial momentum brief when five chapters lack relationship or world texture', () => {
    const recentChapters = [
      {
        chapter_no: 16,
        title: '旧城追查',
        chapter_summary: '主角追查旧设备登记表，按清单复核编号和报价，没有任何关系质变或世界观新信息。',
        conflict: '协会窗口要求他继续补材料。',
        ending_hook: '复核表被退回，他只能继续查下一张旧单。',
      },
      {
        chapter_no: 17,
        title: '窗口复核',
        chapter_summary: '主角继续在窗口复核材料，流程仍是排号、审核、签字和等待。',
        conflict: '审核员用普通流程压住他，要求重新说明维修周期。',
        ending_hook: '回执盖章后，他还要回维修铺继续处理同类设备。',
      },
      {
        chapter_no: 18,
        title: '报价压问',
        chapter_summary: '客户压问报价，主角只解释检测清单和维修周期，没有信任边界变化，也没有新地图新制度。',
        conflict: '客户质疑报价是否合理。',
        ending_hook: '报价单被放回桌上，下一章继续复核同类订单。',
      },
      {
        chapter_no: 19,
        title: '设备审核',
        chapter_summary: '主角反复审核报废设备外壳和轴承编号，章节主要是程序推进。',
        conflict: '协会要求再次检查旧件来源。',
        ending_hook: '检查完成后，他收到下一份同类审核通知。',
      },
      {
        chapter_no: 20,
        title: '清单反制',
        chapter_summary: '主角用清单反制一次普通质疑，但仍停留在同类订单、同一窗口和同一压迫流程。',
        conflict: '审核员继续用流程卡住订单。',
        ending_hook: '订单暂时保住，下一章还要提交补充说明。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '旧城新单' }, recentChapters)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('five_chapter_texture_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('关系深化')
    expect(brief?.fatigue_risks.join('；')).toContain('世界观展开')
    expect(brief?.next_actions.join('；')).toContain('关系深化')
    expect(brief?.next_actions.join('；')).toContain('世界观展开')
  })

  test('does not flag five chapter texture gap when a recent chapter deepens relationship or paints the world', () => {
    const recentChapters = [
      {
        chapter_no: 16,
        title: '旧城追查',
        chapter_summary: '主角追查旧设备登记表，按清单复核编号和报价。',
        conflict: '协会窗口要求他继续补材料。',
        ending_hook: '复核表被退回，他只能继续查下一张旧单。',
      },
      {
        chapter_no: 17,
        title: '窗口复核',
        chapter_summary: '主角继续在窗口复核材料，流程仍是排号、审核、签字和等待。',
        conflict: '审核员用普通流程压住他。',
        ending_hook: '回执盖章后，他还要回维修铺继续处理同类设备。',
      },
      {
        chapter_no: 18,
        title: '林青禾担保',
        chapter_summary: '林青禾选择为主角担保，两人的信任边界改变，关系从旁观推进到共同承担代价。',
        conflict: '协会要求有人承担担保责任。',
        ending_hook: '林青禾递出担保文书，主角第一次明确获得同盟承诺。',
      },
      {
        chapter_no: 19,
        title: '赤炉城新规',
        chapter_summary: '赤炉城城规、炼炉保和资源门槛展开，新地图背后的制度代价开始进入剧情。',
        conflict: '城规禁止外来维修师直接触碰矿脉旧件。',
        ending_hook: '炼炉保规则露出漏洞，下一目标指向矿脉账册。',
      },
      {
        chapter_no: 20,
        title: '清单反制',
        chapter_summary: '主角用清单反制一次普通质疑，拿回订单资格。',
        conflict: '审核员继续用流程卡住订单。',
        ending_hook: '订单暂时保住，下一章还要提交补充说明。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '旧城新单' }, recentChapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('five_chapter_texture_gap')
  })

  test('builds serial momentum brief when conflict thrill chapters overrun the cooling line', () => {
    const recentChapters = [
      {
        chapter_no: 18,
        beat_type: 'conflict_thrill',
        title: '会审开打',
        chapter_summary: '执事当众压问主角，双方在会审厅正面对抗，第一轮大冲突爆发。',
        conflict: '执事逼主角交出旧账册。',
        ending_hook: '长老席要求下一章继续会审。',
      },
      {
        chapter_no: 19,
        beat_type: 'conflict_thrill',
        title: '长老翻案',
        chapter_summary: '长老席继续加压，主角再次反制审问，冲突没有切换到关系或世界层。',
        conflict: '长老要求主角当场证明账册来源。',
        ending_hook: '第二轮压问结束，第三轮审判马上开始。',
      },
      {
        chapter_no: 20,
        beat_type: 'conflict_thrill',
        title: '第三次压问',
        chapter_summary: '第三章仍是会审压迫和公开对抗，主角继续用证据硬顶长老。',
        conflict: '长老席把证据判成伪造，逼主角继续应战。',
        ending_hook: '审判槌第三次落下，下一章似乎还要继续开打。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '余波之前' }, recentChapters)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('conflict_thrill_overrun')
    expect(brief?.fatigue_risks.join('；')).toContain('大冲突')
    expect(brief?.next_actions.join('；')).toContain('关系深化')
    expect(brief?.next_actions.join('；')).toContain('世界观展开')
  })

  test('does not flag conflict thrill overrun when the tail beat rotates before chapter writing', () => {
    const recentChapters = [
      {
        chapter_no: 18,
        beat_type: 'conflict_thrill',
        title: '会审开打',
        chapter_summary: '执事当众压问主角，双方在会审厅正面对抗。',
        conflict: '执事逼主角交出旧账册。',
        ending_hook: '长老席要求下一章继续会审。',
      },
      {
        chapter_no: 19,
        beat_type: 'conflict_thrill',
        title: '长老翻案',
        chapter_summary: '长老席继续加压，主角再次反制审问。',
        conflict: '长老要求主角当场证明账册来源。',
        ending_hook: '第二轮压问结束，林青禾递来担保文书。',
      },
      {
        chapter_no: 20,
        beat_type: 'bond_deepening',
        title: '林青禾担保',
        chapter_summary: '林青禾选择为主角担保，两人的信任边界改变，关系从旁观推进到共同承担代价。',
        conflict: '协会要求有人承担担保责任。',
        ending_hook: '担保落定后，下一章再处理账册规则。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '账册余波' }, recentChapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('conflict_thrill_overrun')
  })

  test('builds serial momentum brief when two chapters lack goal advance obstacle escalation or new information', () => {
    const recentChapters = [
      {
        chapter_no: 19,
        title: '回执整理',
        chapter_summary: '主角继续整理旧回执，只把同一批表格重新排序；复核资格没有推进，也没有新线索。',
        conflict: '窗口让他等待通知，没有新的阻碍升级。',
        ending_hook: '他把回执放回抽屉，明天继续等。',
        raw_payload: {
          chapter_blueprint: {
            current_goal: '本章小目标：拿到复核资格。',
            content_outline: {
              cause: '窗口退回旧回执。',
              development: '主角整理表格。',
              climax: '表格顺序排好。',
              ending: '复核资格仍未推进，也没有新信息。',
            },
          },
        },
      },
      {
        chapter_no: 20,
        title: '清单复看',
        chapter_summary: '主角又复看同一张清单，只确认旧编号没有填错；目标仍停在原地，没有新的代价或发现。',
        conflict: '客户催问进度，但只是普通催促，没有加码。',
        ending_hook: '清单复看完毕，他继续等协会回复。',
        raw_payload: {
          chapter_blueprint: {
            current_goal: '本章小目标：拿到复核资格。',
            content_outline: {
              cause: '客户催问。',
              development: '主角复看同一张清单。',
              climax: '编号确认无误。',
              ending: '目标仍未推进，没有阻碍升级，也没有新信息。',
            },
          },
        },
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '旧城新单' }, recentChapters)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('two_chapter_momentum_stall')
    expect(brief?.fatigue_risks.join('；')).toContain('目标推进')
    expect(brief?.fatigue_risks.join('；')).toContain('阻碍升级')
    expect(brief?.next_actions.join('；')).toContain('提高冲突密度')
    expect(brief?.next_actions.join('；')).toContain('新信息')
  })

  test('does not flag two chapter momentum stall when obstacle escalates or new information appears', () => {
    const recentChapters = [
      {
        chapter_no: 19,
        title: '三日冻结',
        chapter_summary: '协会追加三日倒计时和资格冻结代价，复核资格从等待变成必须限时处理的新门槛。',
        conflict: '窗口通知三日内不补齐证据就冻结资格。',
        ending_hook: '资格冻结倒计时开始，主角必须马上换打法。',
      },
      {
        chapter_no: 20,
        title: '第二张回执',
        chapter_summary: '主角发现第二张回执背面露出旧账册编号，新线索把目标推进到禁库账册入口。',
        conflict: '客户试图抢走第二张回执。',
        ending_hook: '旧账册编号指向禁库入口，下一章必须追查谁调包。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '禁库入口' }, recentChapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('two_chapter_momentum_stall')
  })

  test('builds serial momentum brief when payoff release is longer than expectation setup', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角发现旧账册被调换，并当众反证执事。',
          conflict: '执事余党阻止主角复核旧账册。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事拦路。',
                development: '主角看到账册。',
                climax: '主角当众反证执事调换账册，逼执事改口，围观弟子全部震惊。',
                ending: '本章收获复核资格和旧印编号；下一目标指向禁库夜灯的新门槛。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯反证',
          chapter_summary: '主角发现禁库夜灯被人改过，并逼巡夜弟子改口。',
          conflict: '巡夜弟子阻止主角靠近禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '夜灯亮起。',
                development: '主角靠近门口。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改，禁库入口规则当场松动。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_payoff_setup_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('期待感小于爽点释放')
    expect(brief?.next_actions.join('；')).toContain('铺垫篇幅不少于释放篇幅')
    expect(brief?.next_actions.join('；')).toContain('先铺期待')
  })

  test('does not flag expectation setup when setup pressure is at least as long as payoff release', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角发现旧账册被调换，并当众反证执事。',
          conflict: '执事余党阻止主角复核旧账册。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事先用宗规压住复核，逼主角在众目睽睽下选择是否承担旧案代价。',
                development: '主角分三步核对账册、旧印编号和巡夜路线，让围观者先产生怀疑和期待。',
                turn: '执事误判主角没有证据，主动把假账册推到台前。',
                climax: '主角当众反证执事调换账册。',
                ending: '本章收获复核资格和旧印编号；下一目标指向禁库夜灯的新门槛。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯反证',
          chapter_summary: '主角发现禁库夜灯被人改过，并逼巡夜弟子改口。',
          conflict: '巡夜弟子阻止主角靠近禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '巡夜弟子先封锁入口，威胁主角再靠近就失去复核资格。',
                development: '主角用夜灯颜色、门禁回声和巡夜路线连续三次制造期待，让巡夜弟子误以为还能遮掩。',
                turn: '林青禾担保后，巡夜弟子的谎话被压到最后一层。',
                climax: '主角用灯色证据逼巡夜弟子改口。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('expectation_payoff_setup_gap')
  })

  test('builds serial momentum brief when mainline closures lack deceptive handoff', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册终证',
          chapter_summary: '主角当众拿到账册终证，三年前旧案已经全部查清，阵堂清白彻底洗清。',
          conflict: '执事余党最后一次阻止主角公开账册。',
          ending_hook: '众人散去，旧案终于结束。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主线完成：三年前旧案全部查清，阵堂清白彻底洗清。' },
              content_outline: {
                climax: '主角公开账册终证。',
                ending: '旧案结清，一切结束。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯终局',
          chapter_summary: '主角复核禁库夜灯，幕后改阵者全部伏法，旧阵真相大白。',
          conflict: '巡夜弟子试图做最后抵赖。',
          ending_hook: '禁库恢复平静，三年前的事彻底解决。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主线收束：幕后改阵者全部伏法，旧阵真相大白。' },
              content_outline: {
                climax: '巡夜弟子承认改阵。',
                ending: '旧阵真相大白，主线彻底完成。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('deceptive_mainline_handoff_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('欺骗式主线')
    expect(brief?.next_actions.join('；')).toContain('接近完成又差一点')
    expect(brief?.next_actions.join('；')).toContain('最后一块')
  })

  test('does not flag deceptive mainline handoff when closure leaves one missing key piece', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册终证',
          chapter_summary: '主角几乎查清旧账，但还差最后一页账册和第三个证人才能洗清阵堂。',
          conflict: '执事余党阻止主角拿到最后一页账册。',
          ending_hook: '账册只剩最后一页未拿到，幕后还有更深一层的人。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '接近完成：旧账已经推到最后一步，但仍缺第三个证人。' },
              content_outline: {
                climax: '主角公开大部分账册证据。',
                ending: '主线只差最后一块证据，下一章转向第三个证人。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯缺口',
          chapter_summary: '主角破解禁库夜灯，表面真相大白，但关键入口未开，背后还有下一层阵眼。',
          conflict: '巡夜弟子阻止主角打开最后一道入口。',
          ending_hook: '入口未开，最后一枚旧印仍在幕后长老手中。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '几乎收束但还差最后一枚旧印，幕后长老仍未露面。' },
              content_outline: {
                climax: '主角破解禁库夜灯。',
                ending: '只剩最后一枚旧印和幕后长老，主线进入下一层。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('deceptive_mainline_handoff_gap')
  })

  test('builds serial momentum brief when upgrade-stage chapters lack reward points', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内门榜单' },
      [
        {
          chapter_no: 16,
          title: '试炼排队',
          chapter_summary: '主角进入外门试炼区，反复核对考核规则和境界门槛。',
          conflict: '试炼名册排队规则拖住主角。',
          ending_hook: '下一轮仍要继续核对试炼资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线停在外门试炼规则和境界门槛说明。' },
              content_outline: {
                cause: '外门试炼规则变复杂。',
                development: '主角继续排队核对门槛。',
                climax: '考核执事宣布下一轮规则。',
                ending: '仍然等待下一轮试炼。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '境界门槛',
          chapter_summary: '主角继续研究修为境界门槛，确认榜单排名会影响试炼顺序。',
          conflict: '榜单顺序让主角暂时无法进入下一轮。',
          ending_hook: '榜单排名还要继续等待复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线继续解释修为门槛、榜单排名和考核顺序。' },
              content_outline: {
                cause: '榜单排名影响试炼顺序。',
                development: '主角继续核对排名。',
                climax: '执事公布复核名单。',
                ending: '仍未进入奖励结算。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '榜单复核',
          chapter_summary: '主角在成长系统面板前整理考核条件，继续等待试炼榜单刷新。',
          conflict: '系统提示条件不足，榜单刷新被延后。',
          ending_hook: '下一章继续等榜单刷新。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线还在系统条件、试炼榜单和境界门槛之间空转。' },
              content_outline: {
                cause: '系统条件不足。',
                development: '主角继续整理考核条件。',
                climax: '榜单刷新被延后。',
                ending: '继续等待下一次刷新。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('upgrade_reward_point_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('升级文')
    expect(brief?.next_actions.join('；')).toContain('奖励点')
    expect(brief?.next_actions.join('；')).toContain('升级/装备/认可/揭秘')
  })

  test('does not flag upgrade reward points when stage chapters deliver concrete gains', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内门榜单' },
      [
        {
          chapter_no: 16,
          title: '试炼初奖',
          chapter_summary: '主角通过外门试炼第一关，获得旧印装备和复核名额。',
          conflict: '考核执事试图压低主角排名。',
          ending_hook: '新装备打开第二关入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：通过第一关并获得旧印装备。' },
              content_outline: {
                climax: '主角通过第一关。',
                ending: '本章收获旧印装备和复核名额，下一章进入第二关。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '境界突破',
          chapter_summary: '主角借旧印反推阵纹，突破小境界并解锁新能力。',
          conflict: '第二关门槛要求临场修正阵纹。',
          ending_hook: '新能力指向榜单暗格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：突破境界并解锁新能力。' },
              content_outline: {
                climax: '主角临场修正阵纹。',
                ending: '本章完成境界突破，解锁新能力并打开榜单暗格。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '榜单揭秘',
          chapter_summary: '主角揭开试炼榜单被篡改的真相，赢得长老席认可。',
          conflict: '执事余党阻止主角公开榜单暗格。',
          ending_hook: '长老席认可后给出内门候选资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：揭秘榜单暗格，获得长老席认可和内门候选资格。' },
              content_outline: {
                climax: '主角公开榜单暗格。',
                ending: '本章收获长老席认可和内门候选资格。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('upgrade_reward_point_gap')
  })

  test('builds serial momentum brief when romance beats lack layered tension', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下热茶',
          chapter_summary: '林青禾给主角递茶，陪他整理旧账，感情线继续升温。',
          conflict: '旧账资料太多，两人一起整理到深夜。',
          ending_hook: '她把披风披到主角肩上。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：递茶、陪伴、照顾，关系继续甜。' },
              content_outline: {
                cause: '主角熬夜查账。',
                development: '林青禾递茶陪伴。',
                climax: '两人并肩整理完资料。',
                ending: '她把披风披给主角。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下陪伴',
          chapter_summary: '林青禾继续陪主角查夜灯记录，两人默契增加。',
          conflict: '夜灯记录繁琐，两人一起核对。',
          ending_hook: '她替主角按住旧印。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：陪伴、默契、照顾，继续堆甜。' },
              content_outline: {
                cause: '夜灯记录需要复核。',
                development: '林青禾一直陪着主角。',
                climax: '两人一起找出记录顺序。',
                ending: '她替主角按住旧印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下避雨',
          chapter_summary: '主角和林青禾在檐下避雨，她照顾他的伤口，暧昧继续增加。',
          conflict: '雨太大，两人只能暂时停在廊下。',
          ending_hook: '她又替主角系好药布。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：避雨、疗伤、陪伴，暧昧继续增加。' },
              content_outline: {
                cause: '主角淋雨受伤。',
                development: '林青禾照顾伤口。',
                climax: '两人在檐下沉默靠近。',
                ending: '她替主角系好药布。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('romance_tension_layer_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('感情线')
    expect(brief?.next_actions.join('；')).toContain('拉扯')
    expect(brief?.next_actions.join('；')).toContain('不是堆砌桥段')
  })

  test('does not flag romance tension when relationship beats include boundaries choices and costs', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下试探',
          chapter_summary: '林青禾递茶时试探主角是否愿意公开旧账，主角选择暂时隐瞒，关系边界被拉紧。',
          conflict: '她想公开证据，主角担心连累她的担保资格。',
          ending_hook: '两人约定只公开一半证据，代价是林青禾暂时退出审问席。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线拉扯：递茶变成试探，边界、选择和担保代价都落地。' },
              content_outline: {
                cause: '林青禾想公开旧账。',
                development: '主角试探她能承受多少代价。',
                climax: '两人做出只公开一半证据的选择。',
                ending: '关系从陪伴变成共同承担代价。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下误会',
          chapter_summary: '林青禾误会主角不信任她，主角用行动把她从风险里推开，关系出现退让和再确认。',
          conflict: '信任误会和审问压力同时压住两人。',
          ending_hook: '她看懂主角的保护不是拒绝，决定用自己的方式回到局里。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线层次：误会、退让、再确认，感情升级踩在审问事业节点上。' },
              content_outline: {
                cause: '林青禾误会主角不信任她。',
                development: '主角用行动承担审问压力。',
                climax: '她看懂保护背后的代价。',
                ending: '她选择以证人身份回到局里。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下确认',
          chapter_summary: '林青禾在檐下确认自己的立场，主角必须在保护她和让她并肩承担之间做选择。',
          conflict: '长老席要求林青禾退出，否则她会失去内门资格。',
          ending_hook: '她主动留下，关系从暧昧推进到共同目标。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线推进：事业资格、主动选择、共同目标和失去资格的代价绑定。' },
              content_outline: {
                cause: '长老席要求她退出。',
                development: '主角试图保护她，她坚持主动留下。',
                climax: '两人共同承担失去资格的风险。',
                ending: '关系升级为共同目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('romance_tension_layer_gap')
  })

  test('builds serial momentum brief when romance beats do not bind to career or mainline consequences', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下试探',
          chapter_summary: '林青禾递茶试探主角是否还信任她，主角选择暂时靠近，感情线有边界和再确认。',
          conflict: '两人围绕误会和信任拉扯，但旧账主线仍原地等待。',
          ending_hook: '她替主角收好披风，两人约定天亮再说。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线拉扯：递茶、试探、边界和再确认都落在两人关系里。' },
              content_outline: {
                cause: '林青禾想知道主角是否还信任她。',
                development: '两人在廊下试探彼此边界。',
                climax: '主角选择暂时靠近。',
                ending: '关系再确认，但旧账主线等待下一章。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下退让',
          chapter_summary: '林青禾误会主角在保护她，主角退让一步，两人的信任关系继续升温。',
          conflict: '感情线围绕保护不是拒绝展开，审问和资格都没有变化。',
          ending_hook: '她替主角按住旧印，只留下一个眼神。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线层次：误会、退让、再确认，仍然只改变两人亲密度。' },
              content_outline: {
                cause: '林青禾误会主角拒绝她参与。',
                development: '主角解释保护不是拒绝。',
                climax: '两人信任再确认。',
                ending: '她替主角按住旧印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下确认',
          chapter_summary: '林青禾在檐下确认自己的心意，主角必须在靠近和克制之间做选择。',
          conflict: '两人的边界和克制互相拉扯，主线调查没有获得新线索。',
          ending_hook: '她主动留下陪主角等雨停。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线推进：心意确认、靠近和克制，但没有牵动事业线。' },
              content_outline: {
                cause: '林青禾主动确认心意。',
                development: '主角在靠近和克制之间犹豫。',
                climax: '两人确认边界。',
                ending: '她留下陪主角等雨停。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('romance_career_binding_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('感情线和事业线')
    expect(brief?.next_actions.join('；')).toContain('事业线')
    expect(brief?.next_actions.join('；')).toContain('主线')
  })

  test('does not flag romance career binding when relationship choices change career or mainline state', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下证言',
          chapter_summary: '林青禾递茶时试探主角是否愿意公开旧账，随后选择以证人身份站队，调查获得关键证言。',
          conflict: '她的选择会影响内门资格，但证人立场改变让旧账主线推进。',
          ending_hook: '她的证言打开下一份账册入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线拉扯：试探、边界和主动选择。',
                mainline: '主线推进：林青禾证人立场改变，调查获得关键证言。',
                career_line: '事业线变化：她可能失去内门资格，主角获得复核资格。',
              },
              content_outline: {
                cause: '林青禾想知道主角是否愿意让她涉险。',
                development: '两人围绕证言代价试探。',
                climax: '她选择站队作证。',
                ending: '证言打开下一份账册入口。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下资格',
          chapter_summary: '林青禾误会主角要推开她，主角让她并肩承担，关系选择改写两人的复核资格。',
          conflict: '长老席要求她退出，否则主角的候选资格会被暂停。',
          ending_hook: '她主动留下，主角因此拿到复核名额和新资源。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线层次：误会、退让、再确认。',
                mainline: '主线推进：复核名额和新资源到账。',
                career_line: '事业线变化：候选资格被暂停风险压到下一章。',
              },
              content_outline: {
                cause: '长老席要求林青禾退出。',
                development: '两人围绕保护和并肩选择拉扯。',
                climax: '她主动留下。',
                ending: '主角拿到复核名额和新资源。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下名单',
          chapter_summary: '林青禾在檐下确认立场，把自己的旧案名单交给主角，感情选择直接打开下一层主线。',
          conflict: '她交出名单会暴露家族旧案，但能让主角追查幕后长老。',
          ending_hook: '名单指向幕后长老，下一章进入审判庭。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线推进：心意确认、共同承担和主动选择。',
                mainline: '主线推进：旧案名单打开幕后长老线索。',
                career_line: '事业线变化：审判庭资格和家族代价绑定。',
              },
              content_outline: {
                cause: '林青禾决定交出旧案名单。',
                development: '两人确认共同承担。',
                climax: '她把名单交给主角。',
                ending: '名单指向幕后长老和审判庭资格。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('romance_career_binding_gap')
  })

  test('builds serial momentum brief when supporting characters act like tools without agency', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册递证',
          chapter_summary: '林青禾给主角递来旧账册，提醒他去查第二页。',
          conflict: '执事阻止主角翻阅旧账册。',
          ending_hook: '林青禾又把下一份证据交给主角。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '林青禾负责递证据和提醒主角。' },
              content_outline: {
                cause: '主角缺少旧账册。',
                development: '林青禾递来旧账册。',
                climax: '主角找到第二页异常。',
                ending: '林青禾继续交给主角下一份证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯提醒',
          chapter_summary: '巡夜弟子提醒主角夜灯颜色不对，又告诉他禁库入口位置。',
          conflict: '执事继续阻止主角靠近禁库。',
          ending_hook: '巡夜弟子把入口钥匙交给主角。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '巡夜弟子负责提醒、告诉和交钥匙。' },
              content_outline: {
                cause: '主角不知道禁库入口。',
                development: '巡夜弟子告诉他入口位置。',
                climax: '主角拿到钥匙。',
                ending: '巡夜弟子把钥匙交给主角。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '执事拦路',
          chapter_summary: '执事上前阻止主角，随后被主角反证，旁观弟子又提醒主角去内库。',
          conflict: '执事负责拦路，旁观弟子负责提示下一步。',
          ending_hook: '旁观弟子告诉主角内库还有一份记录。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '执事负责阻止，旁观弟子负责提示下一步。' },
              content_outline: {
                cause: '主角要去内库。',
                development: '执事阻止主角。',
                climax: '主角反证执事。',
                ending: '旁观弟子提醒内库记录。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('supporting_character_agency_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('配角')
    expect(brief?.fatigue_risks.join('；')).toContain('工具人')
    expect(brief?.next_actions.join('；')).toContain('立场')
    expect(brief?.next_actions.join('；')).toContain('动机')
  })

  test('does not flag supporting character agency when side characters have goals stakes or positions', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册担保',
          chapter_summary: '林青禾递来旧账册前先说清自己的目标：她要保住担保资格，也不想让父亲旧案继续背锅。',
          conflict: '她帮助主角的代价是失去内门担保资格。',
          ending_hook: '她选择站队主角，承担担保代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '林青禾有自己的目标、立场和担保代价。' },
              content_outline: {
                cause: '她要保住担保资格。',
                development: '她权衡是否递出旧账册。',
                climax: '她选择站队主角。',
                ending: '担保资格被压到下一章。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '巡夜改口',
          chapter_summary: '巡夜弟子提醒主角夜灯异常，是因为他害怕牵连妹妹的巡夜名额，想用改口换自保。',
          conflict: '他的利益是保住妹妹名额，不是单纯给主角送钥匙。',
          ending_hook: '他改口后要求主角保住妹妹的试炼资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '巡夜弟子有自保动机、妹妹名额和交换条件。' },
              content_outline: {
                cause: '妹妹名额被执事捏住。',
                development: '他试探主角能否保护妹妹。',
                climax: '他用改口换自保条件。',
                ending: '妹妹资格成为下一章代价。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '执事旧账',
          chapter_summary: '执事阻止主角进入内库，是为了保住自己和掌院交易的旧账来源。',
          conflict: '执事的立场来自旧账利益和掌院压力，他阻止主角会暴露自己的交易。',
          ending_hook: '执事宁愿交出旁证，也要保住掌院交易名单。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '执事有旧账利益、掌院压力和自保选择。' },
              content_outline: {
                cause: '执事要保住旧账来源。',
                development: '他用掌院压力阻止主角。',
                climax: '他选择交出旁证换自保。',
                ending: '掌院交易名单成为新目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('supporting_character_agency_gap')
  })

  test('builds serial momentum brief when trump cards are spent without reserve or new backhand', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧阵盘反咬',
          chapter_summary: '主角亮出底牌旧阵盘反制执事，执事被当场压制。',
          conflict: '执事逼主角交出旧账，主角只能放出底牌。',
          ending_hook: '这一张底牌用完后，主角暂时没有新的后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主角亮出底牌旧阵盘，底牌用完后等待下一步。' },
              content_outline: {
                cause: '执事逼迫主角交出旧账。',
                development: '主角被迫亮出旧阵盘。',
                climax: '旧阵盘反咬执事。',
                ending: '底牌用完，暂时没有后手。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '残符摊开',
          chapter_summary: '主角又把残符底牌摊开，压住第二轮质问。',
          conflict: '长老席要求他证明残阵来源。',
          ending_hook: '残符也烧尽，他承认手里只剩最后一张底牌。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主角继续摊开底牌残符，没有补新后手。' },
              content_outline: {
                cause: '长老席继续追问来源。',
                development: '主角摊开残符底牌。',
                climax: '残符烧尽压住质问。',
                ending: '只剩最后一张底牌。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '血印尽出',
          chapter_summary: '主角把最后一张血印底牌也放出来，暂时赢下审问。',
          conflict: '审判庭逼他交出所有证据。',
          ending_hook: '最后一张底牌耗尽，之后再无后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '所有底牌一口气摊空，暂时赢下审问。' },
              content_outline: {
                cause: '审判庭逼他交出所有证据。',
                development: '主角放出最后一张血印底牌。',
                climax: '审问被压住。',
                ending: '再无后手。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('trump_card_reserve_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('底牌')
    expect(brief?.fatigue_risks.join('；')).toContain('后手')
    expect(brief?.next_actions.join('；')).toContain('2-3个未揭示')
    expect(brief?.next_actions.join('；')).toContain('新后手')
  })

  test('does not flag trump card reserve when each reveal keeps unrevealed backhands', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧阵盘反咬',
          chapter_summary: '主角只出一张旧阵盘底牌反制执事，袖中仍留三张未揭示暗牌。',
          conflict: '执事逼主角交出旧账，主角只亮一张旧阵盘。',
          ending_hook: '阵盘裂纹又解锁一枚新阵纹，成为下一章新后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '每次只出1个底牌，仍留三张未揭示暗牌，并补新后手。' },
              content_outline: {
                cause: '执事逼迫主角交出旧账。',
                development: '主角只亮一张旧阵盘。',
                climax: '旧阵盘反咬执事。',
                ending: '仍留三张未揭示暗牌，又解锁新阵纹。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '残符半亮',
          chapter_summary: '主角只动用一枚残符底牌压住质问，另外两张未揭示底牌继续藏着。',
          conflict: '长老席要求他证明残阵来源。',
          ending_hook: '残符换来新目标，下一章追查内库阵图源头。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '只出一张残符，保留两张未揭示底牌，并打开新目标。' },
              content_outline: {
                cause: '长老席继续追问来源。',
                development: '主角只动用一枚残符。',
                climax: '残符压住质问。',
                ending: '保留两张未揭示底牌，打开内库阵图新目标。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '血印不尽',
          chapter_summary: '主角亮出一层血印底牌赢下审问，但仍压着两道未揭示后手。',
          conflict: '审判庭逼他交出所有证据。',
          ending_hook: '血印只揭第一层，下一章还要用新后手反查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '只揭第一层血印，仍有两道未揭示后手，新后手指向幕后长老。' },
              content_outline: {
                cause: '审判庭逼他交出所有证据。',
                development: '主角只揭第一层血印。',
                climax: '审问被压住。',
                ending: '仍有两道未揭示后手，新后手指向幕后长老。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('trump_card_reserve_gap')
  })

  test('reads camelCase showdown contract from serialized context_package chapter_target for trump card reserve', () => {
    const chapters = [16, 17, 18].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `底牌第${chapterNo}轮`,
      chapter_summary: `主角第${chapterNo}章亮出底牌压制执事。`,
      conflict: '执事逼主角交出证据，主角只能亮出底牌反制。',
      ending_hook: '执事被压制后，下一轮审问继续升级。',
      raw_payload: {
        context_package: {
          chapter_target: {
            showdownContract: {
              payoffReleaseRules: ['底牌释放后，执事必须被对应压制。'],
              trumpCardReserveRules: ['每次只出1个底牌，保留三张未揭示后手，并获得新后手。'],
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('trump_card_reserve_gap')
  })

  test('builds serial momentum brief when showdown payoffs lack three-pressure three-shock structure', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角公开账册证据，当场反制执事，所有人震惊。',
          conflict: '执事逼主角认错，主角拿出证据反制。',
          ending_hook: '执事低头后，下一章进入夜灯复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角拿出证据赢了，全场震惊。' },
              content_outline: {
                cause: '执事逼主角认错。',
                development: '主角拿出账册证据。',
                climax: '主角反制执事。',
                ending: '收获夜灯复核入口，下一章继续追查。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯翻盘',
          chapter_summary: '主角破解夜灯记录，再次当场翻盘，众人继续震惊。',
          conflict: '巡夜执事质疑主角没有资格复核夜灯。',
          ending_hook: '主角拿到夜灯记录，下一章转向禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角破解记录赢了，众人震惊。' },
              content_outline: {
                cause: '巡夜执事质疑主角资格。',
                development: '主角破解夜灯记录。',
                climax: '主角当场翻盘。',
                ending: '收获夜灯记录，下一章进入禁库入口。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '禁库改判',
          chapter_summary: '主角打开禁库入口，审问席当场改判，全场还是震惊。',
          conflict: '审问席要求主角证明禁库入口真实存在。',
          ending_hook: '主角赢得复核名额，下一章追查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角打开入口，审问席改判，全场震惊。' },
              content_outline: {
                cause: '审问席要求证明入口。',
                development: '主角打开禁库入口。',
                climax: '审问席当场改判。',
                ending: '收获复核名额，下一章追查幕后长老。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('showdown_pressure_shock_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('三压一爆三震')
    expect(brief?.next_actions.join('；')).toContain('友方')
    expect(brief?.next_actions.join('；')).toContain('中立')
  })

  test('does not flag showdown pressure shock when friendly enemy and neutral reactions all land', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '友方外门弟子先期待主角翻案，敌方执事两次不服逼他上审问席，中立长老压下判签形成第三重压力；主角一爆碾压后，友方传话、敌方破防、中立长老改口。',
          conflict: '友方期待、敌方不服和中立观望同时加压。',
          ending_hook: '群众层震惊，中间层复盘账册利害，核心层长老改判，下一章进入夜灯复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：友方期待、敌方不服、中立长老加压；爆后友方、敌方、中立三方震动。' },
              content_outline: {
                cause: '三方压力把主角推上审问席。',
                development: '敌方两次不服，中立长老观望压判签。',
                climax: '主角一爆碾压。',
                ending: '三方震动后打开夜灯复核。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯翻盘',
          chapter_summary: '友方巡夜弟子相信主角能复核，敌方巡夜执事连续质疑，中立账房压住记录不表态；主角破解夜灯后，友方改口作证、敌方失态、中立账房第一次递出账册。',
          conflict: '友方、敌方、中立方三路压力把夜灯复核推到台前。',
          ending_hook: '群众层震惊，中间层看懂夜灯规则，核心层账房改口，下一章转向禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：三方先铺压，主角爆发后分层震动。' },
              content_outline: {
                cause: '三方压力逼主角复核夜灯。',
                development: '敌方质疑，中立账房观望。',
                climax: '主角破解夜灯。',
                ending: '三方震动后打开禁库入口。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '禁库改判',
          chapter_summary: '友方林青禾相信主角能打开禁库，敌方审问席逼他交出证据，中立长老席继续观望加压；主角打开入口后，友方站队、敌方破防、中立长老改判。',
          conflict: '友方、敌方和中立方同时把压力压到禁库入口。',
          ending_hook: '群众层震惊，中间层复盘禁库规则，核心层长老席改判，下一章追查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：友方站队、敌方破防、中立长老席改判，群众层中间层核心层震惊传递。' },
              content_outline: {
                cause: '三方压力压到禁库入口。',
                development: '敌方逼证，中立长老席观望。',
                climax: '主角打开禁库入口。',
                ending: '三方震动并打开幕后长老线索。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('showdown_pressure_shock_gap')
  })

  test('builds serial momentum brief when character actions lack motivation chains', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '突然上堂',
          chapter_summary: '主角突然决定冲上审问席，执事也突然改口，剧情需要他们立刻推进旧账线索。',
          conflict: '为了推进主线，主角直接质问执事。',
          ending_hook: '林青禾突然站出来递证据。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：主角突然上堂，林青禾为了剧情需要递证据。' },
              content_outline: {
                cause: '需要推进旧账线索。',
                development: '主角突然冲上去。',
                climax: '执事突然改口。',
                ending: '林青禾突然递证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '方便入库',
          chapter_summary: '巡夜弟子为了方便主线，突然把禁库钥匙交给主角，没有说明自己的动机。',
          conflict: '剧情需要主角进入禁库。',
          ending_hook: '主角突然决定夜闯禁库。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：巡夜弟子方便剧情交钥匙，主角突然夜闯。' },
              content_outline: {
                cause: '需要进入禁库。',
                development: '巡夜弟子突然交钥匙。',
                climax: '主角直接进入禁库。',
                ending: '主角突然决定夜闯。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '强行改判',
          chapter_summary: '长老席突然改判，反派也突然退场，只是为了让主角拿到复核资格。',
          conflict: '为了让主角进入下一阶段，长老席直接给出资格。',
          ending_hook: '幕后长老突然露面。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：长老席突然改判，反派为了剧情需要退场。' },
              content_outline: {
                cause: '需要给主角复核资格。',
                development: '长老席突然改判。',
                climax: '反派突然退场。',
                ending: '幕后长老突然露面。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('character_motivation_chain_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('动机链')
    expect(brief?.next_actions.join('；')).toContain('起因')
    expect(brief?.next_actions.join('；')).toContain('代价')
  })

  test('does not flag character motivation when actions include cause motive constraint and cost', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧账上堂',
          chapter_summary: '主角因母亲旧铺被栽赃，想保住复核资格，担心林青禾被连累，所以选择上堂质问执事。',
          conflict: '上堂的约束是失去复核资格，代价是把母亲旧铺卷入审问。',
          ending_hook: '林青禾为了保住担保资格，选择递出证据并承担担保代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：具体起因、情感动机、约束、风险和行为变化都落地。' },
              content_outline: {
                cause: '母亲旧铺被栽赃，复核资格被压住。',
                development: '主角担心林青禾被连累，权衡上堂代价。',
                climax: '他选择质问执事。',
                ending: '林青禾承担担保代价递证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '巡夜交钥',
          chapter_summary: '巡夜弟子害怕妹妹名额被执事扣住，想换取自保，所以在确认主角能保护妹妹后交出禁库钥匙。',
          conflict: '他的约束是妹妹名额和巡夜责罚，代价是被执事追责。',
          ending_hook: '主角因为不想再让旁证背锅，选择夜入禁库承担追责风险。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：巡夜弟子有具体起因、情感动机、交换条件和代价。' },
              content_outline: {
                cause: '妹妹名额被执事捏住。',
                development: '巡夜弟子确认主角能保护妹妹。',
                climax: '他交出钥匙换自保条件。',
                ending: '主角承担追责风险夜入禁库。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '长老改判',
          chapter_summary: '长老席因内库账册牵到自身判签声望，担心继续压案会失去核心层信任，所以选择改判。',
          conflict: '改判的约束是得罪幕后长老，代价是公开承认旧判有误。',
          ending_hook: '反派为了保住掌院交易名单，选择暂退并把幕后长老推到下一章。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：长老席有声望压力、信任代价和改判理由；反派也有自保动机。' },
              content_outline: {
                cause: '内库账册牵到判签声望。',
                development: '长老席权衡核心层信任和幕后长老压力。',
                climax: '长老席选择改判。',
                ending: '反派为保掌院交易名单暂退。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('character_motivation_chain_gap')
  })

  test('reads camelCase chapter blueprint from serialized context package for character motivation checks', () => {
    const chapters = [16, 17, 18].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `动机链第${chapterNo}章`,
      chapter_summary: '主角突然推进旧账线。',
      conflict: '剧情需要主角立刻行动。',
      ending_hook: '旁证突然出现。',
      raw_payload: {
        context_package: {
          chapterTarget: {
            chapterBlueprint: {
              plotLines: {
                characterLine: '动机链：主角有具体起因、情感动机、约束、风险和行为变化。',
              },
              contentOutline: {
                cause: '母亲旧铺被栽赃，复核资格被压住。',
                development: '主角担心林青禾被连累，权衡上堂代价。',
                climax: '他选择质问执事并承担公开审问风险。',
                ending: '林青禾承担担保代价递证据。',
              },
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('character_motivation_chain_gap')
  })

  test('reads camelCase chapter blueprint from serialized context package for blueprint closure checks', () => {
    const chapters = [16, 17].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `蓝图闭环第${chapterNo}章`,
      chapter_summary: '主角继续整理旧账材料。',
      conflict: '旧账材料仍在整理。',
      ending_hook: '下一页纸还没看完。',
      raw_payload: {
        context_package: {
          chapterTarget: {
            chapterBlueprint: {
              contentOutline: {
                cause: '主角发现旧账材料有缺页。',
                development: '他继续整理材料和线索。',
              },
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key)).toContain('blueprint_climax_reward_gap')
  })

  test('builds serial momentum brief when conflicts lack no-exit glue', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册拦路',
          chapter_summary: '主角追查旧账册，执事余党上前阻止。',
          conflict: '执事余党阻止主角复核旧账册。',
        },
        {
          chapter_no: 17,
          title: '夜灯封门',
          chapter_summary: '主角靠近禁库夜灯，巡夜弟子封锁入口。',
          conflict: '巡夜弟子封锁禁库入口，不让主角靠近。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('conflict_no_exit_glue_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('缺少冲突黏结剂')
    expect(brief?.next_actions.join('；')).toContain('不能随时退出')
    expect(brief?.next_actions.join('；')).toContain('杀人理由')
  })

  test('does not flag no-exit glue when conflicts bind the protagonist with duty cost or place lock', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册拦路',
          chapter_summary: '主角作为值班阵师必须完成复核，若退出会失去复核资格并连累林青禾担保。',
          conflict: '执事余党阻止主角复核旧账册，工作职责和退出代价把他钉在现场。',
        },
        {
          chapter_no: 17,
          title: '夜灯封门',
          chapter_summary: '禁库门禁触发后锁死入口，主角和巡夜弟子都被困在实体场所内。',
          conflict: '巡夜弟子封锁禁库入口；密室规则让双方无法离开，必须当场处理第二道阵鸣。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('conflict_no_exit_glue_gap')
  })

  test('builds serial momentum brief when recent chapters leave the protagonist social network blank', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 19, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册暗痕',
          chapter_summary: '主角独自翻检旧账册，发现旧印编号异常。',
          conflict: '旧账册编号和禁库记录互相矛盾。',
        },
        {
          chapter_no: 17,
          title: '夜灯旧声',
          chapter_summary: '主角独自追查禁库夜灯，确认第二道阵鸣残留。',
          conflict: '禁库门禁规则挡住主角继续深入。',
        },
        {
          chapter_no: 18,
          title: '半印残线',
          chapter_summary: '主角独自核对半枚旧印，推断三年前有人改过阵眼。',
          conflict: '旧印裂痕和阵眼记录无法对上。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('protagonist_social_network_blank')
    expect(brief?.fatigue_risks.join('；')).toContain('社会关系不空白')
    expect(brief?.next_actions.join('；')).toContain('互动人际网络')
    expect(brief?.next_actions.join('；')).toContain('立场')
  })

  test('does not flag social network blank when recent chapters include relationship-changing interaction', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 19, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册暗痕',
          chapter_summary: '林青禾当众为主角担保，执事余党反对复核，旁观弟子开始改变态度。',
          conflict: '执事余党阻止主角复核旧账册。',
        },
        {
          chapter_no: 17,
          title: '夜灯旧声',
          chapter_summary: '巡夜弟子质问主角，主角用夜灯证据逼他改口，林青禾的担保代价继续加深。',
          conflict: '巡夜弟子封锁禁库入口。',
        },
        {
          chapter_no: 18,
          title: '半印残线',
          chapter_summary: '掌院派人传令限期复核，主角和林青禾约定共同目标，关系从旁观变成协作。',
          conflict: '掌院规则要求主角当晚交出复核结果。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('protagonist_social_network_blank')
  })

  test('builds serial momentum brief when status-ladder chapters lack upper-status contact', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内库回声' },
      [
        {
          chapter_no: 16,
          title: '外门账册',
          chapter_summary: '主角在外门杂役库反复核对旧账，确认一处编号异常。',
          conflict: '外门账册缺页挡住后续追查。',
        },
        {
          chapter_no: 17,
          title: '外门夜灯',
          chapter_summary: '主角在外门巡夜区继续查灯色，发现第二道阵鸣残留。',
          conflict: '外门门禁记录和夜灯颜色对不上。',
        },
        {
          chapter_no: 18,
          title: '杂役旧印',
          chapter_summary: '主角从杂役旧印上找到裂痕，继续在低层账房里排查线索。',
          conflict: '低层账房记录被旧规压住。',
        },
        {
          chapter_no: 19,
          title: '外门复核',
          chapter_summary: '主角把旧账重新排完，只证明外门有人改过记录。',
          conflict: '外门旧规继续要求他补完所有明细。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('upper_status_contact_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('上层地位不缺失')
    expect(brief?.next_actions.join('；')).toContain('上位者')
    expect(brief?.next_actions.join('；')).toContain('资格')
  })

  test('does not flag upper-status contact when hierarchy gates or senior figures are active', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内库回声' },
      [
        {
          chapter_no: 16,
          title: '外门账册',
          chapter_summary: '主角在外门账册里发现内门资格名单被改，掌院派人传令限期复核。',
          conflict: '执事余党阻止主角接触内门资格名单。',
        },
        {
          chapter_no: 17,
          title: '长老夜灯',
          chapter_summary: '长老席第一次点名主角，要求他解释禁库夜灯和内库名单的关系。',
          conflict: '长老席用审判庭规则压住主角。',
        },
        {
          chapter_no: 18,
          title: '内门半印',
          chapter_summary: '主角拿到内门复核名额，声望从外门杂役推进到候选阵师。',
          conflict: '内门候选规则要求主角当晚交出第二份证据。',
        },
        {
          chapter_no: 19,
          title: '审判庭门',
          chapter_summary: '掌院改判后打开审判庭入口，主角得到接触上层账册的资格。',
          conflict: '审判庭高层要求主角当场证明旧案牵连内库。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('upper_status_contact_gap')
  })

  test('builds serial momentum brief when downward pressure lacks emotional recovery', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册受审',
          chapter_summary: '执事当众羞辱主角，冷笑说他没有资格复核旧账，旁观弟子都沉默。',
          conflict: '执事逼主角认错并威胁取消复核资格。',
        },
        {
          chapter_no: 17,
          title: '夜灯追责',
          chapter_summary: '巡夜弟子继续逼主角背锅，众人嘲笑他不配靠近禁库入口。',
          conflict: '巡夜弟子要求主角交出旧印并当场认罪。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('downward_pressure_recovery_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('主角吃瘪')
    expect(brief?.next_actions.join('；')).toContain('拉回情绪')
    expect(brief?.next_actions.join('；')).toContain('意外收获')
  })

  test('does not flag downward pressure recovery when pressure reveals counterplay or unexpected gain', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册受审',
          chapter_summary: '执事当众羞辱主角，但主角按住袖中旧印，发现旧账规则漏洞并拿到反证线索。',
          conflict: '执事逼主角认错；主角用证据暗牌稳住局面。',
        },
        {
          chapter_no: 17,
          title: '夜灯追责',
          chapter_summary: '巡夜弟子继续逼主角背锅，林青禾递来备份证据，主角意外收获第二道阵鸣入口。',
          conflict: '巡夜弟子要求主角交出旧印；主角获得盟友动作和新线索。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('downward_pressure_recovery_gap')
  })

  test('builds serial quality regression brief from repeated recent delivery risks', () => {
    const chapters = [
      { id: 11, chapter_no: 11, title: '旧案复核' },
      { id: 12, chapter_no: 12, title: '证词裂口' },
      { id: 13, chapter_no: 13, title: '半印追查' },
      { id: 14, chapter_no: 14, title: '禁库夜声' },
    ]
    const reviews = [
      {
        id: 201,
        review_type: 'prose_quality',
        payload: JSON.stringify({ chapter_id: 12, chapter_no: 12, self_check: { review: { score: 72, needs_revision: true } } }),
      },
      {
        id: 202,
        review_type: 'deterministic_prose_cleanup',
        payload: JSON.stringify({ chapter_id: 13, chapter_no: 13, deterministic_prose_cleanup: { risk_count: 2, label: '确定性清理残留' } }),
      },
      {
        id: 203,
        review_type: 'state_delta_completeness',
        payload: JSON.stringify({ chapter_id: 14, chapter_no: 14, state_delta_completeness: { missed_count: 3, label: '状态增量漏记 3' } }),
      },
    ]

    const brief = buildSerialQualityRegressionBrief({ chapter_no: 15, title: '第三声' }, chapters, reviews)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('recent_delivery_quality_regression')
    expect(brief?.chapter_range_label).toBe('第11-14章')
    expect(brief?.fatigue_risks.join('；')).toContain('连续交稿质量退化')
    expect(brief?.next_actions.join('；')).toContain('降速')
    expect(brief?.next_actions.join('；')).toContain('先修复')
    expect(brief?.scene_freshness).toContain('验证修复')
  })

  test('builds serial quality regression brief from repeated scene-card serial repair misses', () => {
    const chapters = [
      { id: 12, chapter_no: 12, title: '账册缺页' },
      { id: 13, chapter_no: 13, title: '旧盟约重签' },
    ]
    const reviews = [
      {
        id: 211,
        review_type: 'prose_quality',
        payload: JSON.stringify({
          chapter_id: 12,
          chapter_no: 12,
          self_check: {
            review: {
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_repair_1_missing',
                  label: '场景近章风险修复检查',
                  status: 'warn',
                  evidence: '场景1缺少目标推进证据。',
                  fix: '下一章必须把账册新证据写成可见目标推进。',
                },
              ],
            },
          },
        }),
      },
      {
        id: 212,
        review_type: 'prose_quality',
        payload: JSON.stringify({
          chapter_id: 13,
          chapter_no: 13,
          self_check: {
            review: {
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_repair_2_missing',
                  label: '场景近章风险修复检查',
                  status: 'fail',
                  evidence: '场景2缺少盟友关系变化证据。',
                  fix: '下一章必须让盟友用行动改变态度，不能只旁白说明已经信任。',
                },
              ],
            },
          },
        }),
      },
    ]

    const brief = buildSerialQualityRegressionBrief({ chapter_no: 14, title: '第二个签名' }, chapters, reviews)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.summary).toContain('近章风险修复')
    expect(brief?.signals[0].detail).toContain('近章风险修复')
    expect(brief?.fatigue_risks.join('；')).toContain('账册新证据写成可见目标推进')
    expect(brief?.fatigue_risks.join('；')).toContain('盟友用行动改变态度')
    expect(brief?.next_actions.join('；')).toContain('近章风险修复')
  })

  test('detects recent payoff intervals longer than five thousand prose characters', () => {
    const chapters = [
      {
        chapter_no: 11,
        title: '旧案复核',
        chapter_summary: '主角当众反制执事，拿到第一份复核名册。',
        conflict: '执事阻止主角靠近名册。',
        chapter_text: '主角拿到第一份复核名册，执事被当众反制。',
      },
      {
        chapter_no: 12,
        title: '藏书阁前',
        chapter_summary: '主角在藏书阁外等待门禁变化。',
        conflict: '观察环境。',
        chapter_text: '字'.repeat(1800),
      },
      {
        chapter_no: 13,
        title: '旧纸复盘',
        chapter_summary: '主角复盘上一轮证据来源。',
        conflict: '复盘说明。',
        chapter_text: '字'.repeat(1900),
      },
      {
        chapter_no: 14,
        title: '廊下转场',
        chapter_summary: '主角走过长廊，继续等待执事通知。',
        conflict: '转场铺垫。',
        chapter_text: '字'.repeat(1800),
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 15, title: '第二道阵鸣' }, chapters)

    expect(brief?.signals.map((item: any) => item.key)).toContain('payoff_interval_over_5000_chars')
    expect(brief?.fatigue_risks.join('；')).toContain('爽点间隔超过5000字')
    expect(brief?.next_actions.join('；')).toContain('下一章必须交付显性回报')
    expect(brief?.payoff_variation).toContain('显性回报')
  })

  test('does not flag payoff interval when recent no-payoff prose stays under five thousand characters', () => {
    const chapters = [
      {
        chapter_no: 11,
        title: '旧案复核',
        chapter_summary: '主角当众反制执事，拿到第一份复核名册。',
        conflict: '执事阻止主角靠近名册。',
        chapter_text: '主角拿到第一份复核名册，执事被当众反制。',
      },
      {
        chapter_no: 12,
        title: '藏书阁前',
        chapter_summary: '主角在藏书阁外等待门禁变化。',
        conflict: '观察环境。',
        chapter_text: '字'.repeat(1200),
      },
      {
        chapter_no: 13,
        title: '旧纸复盘',
        chapter_summary: '主角复盘上一轮证据来源。',
        conflict: '复盘说明。',
        chapter_text: '字'.repeat(1300),
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 14, title: '廊下转场' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('payoff_interval_over_5000_chars')
  })

  test('raises effective quality threshold when recent delivery quality regresses', () => {
    const contextPackage = {
      chapter_target: {
        recent_fatigue_brief: {
          status: 'needs_attention',
          signals: [
            {
              key: 'recent_delivery_quality_regression',
              label: '连续交稿质量退化',
              status: 'warn',
              detail: '最近3章反复出现质量门未过或确定性清理残留。',
            },
          ],
          fatigue_risks: ['连续交稿质量退化：上一批正文需要降速修复。'],
        },
      },
    }

    expect(resolveEffectiveQualityThreshold(0, contextPackage)).toBe(85)
    expect(resolveEffectiveQualityThreshold(78, contextPackage)).toBe(85)
    expect(resolveEffectiveQualityThreshold(90, contextPackage)).toBe(90)
    expect(resolveEffectiveQualityThreshold(78, {
      chapter_target: {
        chapter_no: 18,
        title: '旧账复盘',
      },
      chapterTarget: {
        recentFatigueBrief: {
          status: 'needs_attention',
          signals: [
            {
              key: 'recent_delivery_quality_regression',
              label: '连续交稿质量退化',
              status: 'warn',
              detail: '运行时疲劳雷达要求提高质量门。',
            },
          ],
        },
      },
    })).toBe(85)
    expect(resolveEffectiveQualityThreshold(78, { chapter_target: { recent_fatigue_brief: { signals: [{ key: 'recent_payoff_drought', status: 'warn' }] } } })).toBe(78)
  })

  test('feeds serial quality regression brief into chapter context fatigue radar', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const contextBuildBlock = source.slice(
      source.indexOf('const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)'),
      source.indexOf('const previousHandoff = buildPreviousChapterHandoff', source.indexOf('const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)')),
    )

    expect(contextBuildBlock).toContain('const serialQualityRegressionBrief = buildSerialQualityRegressionBrief(chapter, sorted, reviews)')
    expect(contextBuildBlock).toContain('const serialFatigueBrief = mergeRecentFatigueBriefs(serialMomentumBrief, serialQualityRegressionBrief)')
  })

  test('feeds serial momentum brief into pre-draft and prose prompt as fatigue guardrails', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: buildSerialMomentumBrief(
        { chapter_no: 16, title: '旧阵异响' },
        [
          { chapter_no: 11, title: '庭外等待', chapter_summary: '主角等待执事通知，整理旧资料。', conflict: '过渡等待。', ending_hook: '夜色渐深。' },
          { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角观察藏书阁门口，回忆旧案。', conflict: '观察环境。', ending_hook: '风吹过门缝。' },
          { chapter_no: 13, title: '旧纸复盘', chapter_summary: '主角复盘上一轮证据，解释阵纹来源。', conflict: '复盘说明。', ending_hook: '纸页轻响。' },
          { chapter_no: 14, title: '廊下转场', chapter_summary: '主角走过长廊，想起师父的话。', conflict: '转场铺垫。', ending_hook: '灯火摇晃。' },
          { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
        ],
      ),
      chapter_target: {
        chapter_no: 16,
        title: '旧阵异响',
        summary: '主角追查旧阵异响的真实来源。',
        conflict: '执事余党封锁藏书阁。',
        ending_hook: '旧阵深处响起第三声。',
        scene_cards: [
          { scene_no: 1, title: '封锁藏书阁', conflict: '执事余党封锁入口。', reader_payoff: '主角用旧阵异响反向定位。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-11T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 16, title: '旧阵异响' })

    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('最近5章明确进展不足')
    expect(context.chapter_target.recent_fatigue_brief.next_actions.join('；')).toContain('下一章必须给出明确阻力')
    expect(prompt).toContain('【近章连载动能与疲劳规避】')
    expect(prompt).toContain('逐条执行 next_actions')
    expect(prompt).toContain('最近5章明确进展不足')
    expect(prompt).toContain('连续弱冲突')
  })

  test('normalizes meme bank into abstract usage instead of direct copied phrases', () => {
    const memeBank = normalizeMemeBank([
      {
        meme_key: '班味太重',
        direct_phrase: '这班味也太冲了',
        function: '社畜共鸣',
        tone: '轻度吐槽',
        suitable_genres: ['都市', '规则怪谈'],
        abstract_usage: '把规则压迫写成类似上班制度的荒诞感。',
        expires_at: '2026-12-31',
      },
      { name: '空素材' },
    ])

    expect(memeBank).toHaveLength(1)
    expect(memeBank[0].meme_key).toBe('班味太重')
    expect(memeBank[0].function).toBe('社畜共鸣')
    expect(memeBank[0].unsafe_direct_phrases).toContain('这班味也太冲了')
    expect(memeBank[0].abstract_usage).toContain('不直接复刻原句')
    expect(memeBank[0].suitable_genres).toContain('规则怪谈')
    expect(memeBank[0].expires_at).toBe('2026-12-31')
  })

  test('builds readability review prompt with web novel readability dimensions', () => {
    const prompt = buildReadabilityReviewPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 1, title: '双魂降临', scene_cards: [] } },
      '正文',
    )

    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('场景目标、阻碍、转折、回报')
    expect(prompt).toContain('段落是否过长')
    expect(prompt).toContain('对话比例')
    expect(prompt).toContain('人物口吻差异')
    expect(prompt).toContain('爽点/信息增量密度')
    expect(prompt).toContain('readability_score')
    expect(prompt).toContain('ending_hook_score')
    expect(prompt).toContain('章末翻页')
    expect(prompt).toContain('meme_sense')
    expect(prompt).toContain('AI味')
    expect(prompt).toContain('ai_smell')
    expect(prompt).toContain('pattern_hits')
    expect(prompt).toContain('rewrite_tactics')
  })

  test('asks readability review to apply oh-story quick natural prose checklist', () => {
    const prompt = buildReadabilityReviewPrompt(
      { title: '审判庭旧账' },
      { chapter_target: { chapter_no: 4, title: '第三个证人', scene_cards: [] } },
      '正文',
    )

    expect(prompt).toContain('oh-story 快速自检口诀')
    expect(prompt).toContain('一事一段，镜头自然断')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('打斗不写流水账')
    expect(prompt).toContain('pattern_hits')
  })

  test('builds restrained net-sense polish prompt without allowing plot changes', () => {
    const prompt = buildMemePolishPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          meme_strategy: {
            intensity: '轻度',
            allowed_functions: ['主角吐槽', '社畜共鸣'],
            forbidden_usage: ['死亡场景不玩梗'],
          },
        },
      },
      '正文',
    )

    expect(prompt).toContain('克制型网感润色')
    expect(prompt).toContain('只允许做语言层润色')
    expect(prompt).toContain('不得修改剧情线')
    expect(prompt).toContain('不得修改设定状态')
    expect(prompt).toContain('used_meme_functions')
    expect(prompt).toContain('rejected_memes')
    expect(prompt).toContain('immersion_risks')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_end_anchor')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('asks meme polish to keep net-sense subordinate to oh-story natural prose', () => {
    const prompt = buildMemePolishPrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 4,
          title: '第三个证人',
          meme_strategy: {
            intensity: '轻度',
            allowed_functions: ['半拍吐槽'],
          },
        },
      },
      '正文',
    )

    expect(prompt).toContain('oh-story 网感边界')
    expect(prompt).toContain('网感不能覆盖自然写法')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('不得为了梗改角色声线')
    expect(prompt).toContain('changed_plot(boolean)')
  })

  test('source creates readability review and stores meme bank in reference config', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain('buildReadabilityReviewRecord')
    expect(source).toContain('runReadabilityReview')
    expect(source).toContain('ending_hook_score: Number(payload?.ending_hook_score')
    expect(source).toContain('runMemePolish')
    const writingBibleSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/writing-bible.ts'), 'utf8')
    expect(writingBibleSource).toContain('reference_config?.meme_bank')
  })
})
