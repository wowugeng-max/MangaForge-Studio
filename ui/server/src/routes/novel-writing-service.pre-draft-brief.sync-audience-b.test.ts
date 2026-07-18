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

describe('chapter pre-draft brief sync-audience b', () => {
  test('uses deterministic payoff-density cleanup residuals to choose rewrite revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      deterministic_prose_cleanup: {
        risk_count: 7,
        categories: [
          {
            type: 'payoff_density',
            label: '可见读者回报密度',
            count: 1,
            evidence: ['第1-21段连续约1680字缺少可见读者回报。'],
            required_actions: ['把长铺垫切成短周期事件，补主角反制、信息收益、关系变化或阶段结算。'],
          },
          {
            type: 'deslop',
            label: '去AI味',
            count: 6,
            evidence: ['连续使用“仿佛有生命一般”等万能比喻。'],
            required_actions: ['删掉万能比喻，改成动作、感官和角色反应。'],
          },
        ],
      },
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'de_ai'])
    expect(brief.directives.join('｜')).toContain('短周期事件')
    expect(brief.directives.join('｜')).toContain('主角反制')
    expect(brief.directives.join('｜')).toContain('去AI味')
    expect(brief.reasons.join('｜')).toContain('可见读者回报密度')
  })

  test('uses focused revision modes to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      focused_revision_modes: ['expand_action', 'cut_description', 'restore_hook'],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.focused_revision_modes).toEqual(['expand_action', 'cut_description', 'restore_hook'])
    expect(brief.directives.join('｜')).toContain('expand_action')
    expect(brief.directives.join('｜')).toContain('动作链')
    expect(brief.directives.join('｜')).toContain('cut_description')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
    expect(brief.directives.join('｜')).toContain('restore_hook')
    expect(brief.directives.join('｜')).toContain('章末钩子')
  })

  test('uses setting violations to build oh-story rewrite directives', () => {
    const brief = buildRevisionStrategyBrief({
      setting_violations: [
        {
          setting_name: '旧印章',
          type: 'ownership',
          severity: 'high',
          description: '正文写成主角已经拿到完整旧印章，但设定中只有半枚印纹，旧印章仍在祠堂封存。',
          fix: '改成主角只拿到半枚印纹，旧印章仍在祠堂封存；能力触发只能来自半枚印纹的残留规则。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite'])
    expect(brief.setting_violations).toHaveLength(1)
    expect(brief.directives.join('｜')).toContain('repair_setting_violation')
    expect(brief.directives.join('｜')).toContain('旧印章')
    expect(brief.directives.join('｜')).toContain('半枚印纹')
    expect(brief.directives.join('｜')).toContain('祠堂封存')
  })

  test('uses explicit revision directives to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      revision_directives: [
        'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
        '压缩不推动剧情、信息或情绪变化的环境描写。',
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.revision_directives).toEqual([
      'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
      '压缩不推动剧情、信息或情绪变化的环境描写。',
    ])
    expect(brief.directives.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.directives.join('｜')).toContain('补核心卖点')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
  })

  test('uses craft metrics to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      craft_metrics: {
        action_detail_score: 58,
        description_overuse_score: 82,
        event_density_score: 61,
        combat_process_score: 55,
        setting_consistency_score: 63,
      },
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.craft_metric_risks.map((item: any) => item.key)).toEqual([
      'action_detail_score',
      'event_density_score',
      'combat_process_score',
      'setting_consistency_score',
      'description_overuse_score',
    ])
    expect(brief.directives.join('｜')).toContain('action_detail_score')
    expect(brief.directives.join('｜')).toContain('动作链')
    expect(brief.directives.join('｜')).toContain('event_density_score')
    expect(brief.directives.join('｜')).toContain('每 3-5 段')
    expect(brief.directives.join('｜')).toContain('combat_process_score')
    expect(brief.directives.join('｜')).toContain('出手、反应、空间变化')
    expect(brief.directives.join('｜')).toContain('description_overuse_score')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
  })

  test('normalizes oh-story five-dimension quality scores for revision planning', () => {
    const scores = normalizeFiveDimensionQualityScores({
      core_consistency: { score: 72, evidence: '核心冲突偏离账本验血。' },
      surface_rewrite: { score: 83, evidence: '句式基本自然。' },
      format_consistency: 79,
      readability: { score: 68, evidence: '解释腔和空泛总结较多。' },
      logic_coherence: { score: 81, evidence: '因果基本成立。' },
    })

    expect(scores.lowest_dimension?.key).toBe('readability')
    expect(scores.lowest_dimension?.strategy).toBe('de_ai')
    expect(scores.dimensions.map((item: any) => item.key)).toEqual([
      'core_consistency',
      'surface_rewrite',
      'format_consistency',
      'readability',
      'logic_coherence',
    ])
    expect(scores.dimensions.find((item: any) => item.key === 'core_consistency')?.evidence).toContain('账本验血')
    expect(scores.below_threshold.map((item: any) => item.key)).toEqual(['core_consistency', 'readability'])
  })

  test('uses low five-dimension scores to choose oh-story revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      five_dimension_scores: {
        core_consistency: { score: 72, evidence: '核心冲突偏离账本验血。' },
        readability: { score: 68, evidence: '解释腔和空泛总结较多。' },
      },
    })

    expect(brief.primary_strategy).toBe('de_ai')
    expect(brief.strategy_order).toEqual(['de_ai', 'rewrite'])
    expect(brief.reasons.join('｜')).toContain('可读性')
    expect(brief.reasons.join('｜')).toContain('解释腔')
    expect(brief.directives.join('｜')).toContain('readability')
  })

  test('uses style boundary checks to choose oh-story revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      style_boundary_checks: [
        {
          key: 'gate_f_overridden_by_style',
          label: '文风覆盖 Gate F',
          status: 'fail',
          evidence: '章尾为了模仿样章冷感，写成“这一切只是开始”的作者预告。',
          fix: '删掉为了模仿文风引入的章末升华，改成旧印章背面的第二个名字。',
        },
        {
          key: 'copy_boundary_breach',
          label: '复制样章桥段',
          status: 'warn',
          evidence: '审判场景复用了样章的三次敲桌和同一句口癖。',
          fix: '保留压迫节奏，但改成证物裂纹、旁观倒戈和执事抢证。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('de_ai')
    expect(brief.strategy_order).toEqual(['de_ai'])
    expect(brief.reasons.join('｜')).toContain('文风覆盖 Gate F')
    expect(brief.reasons.join('｜')).toContain('复制样章桥段')
    expect(brief.directives.join('｜')).toContain('章末升华')
    expect(brief.directives.join('｜')).toContain('证物裂纹')
  })

  test('adds an oh-story punctuation tone contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角用证据反打，让对手当众失控。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '第三个证人',
        summary: '主角逼第三个证人开口，让反派从冷静压迫转为爆发。',
        conflict: '证人试探、反派压迫、主角反问逼供交替出现。',
        ending_hook: '证人问出一个让全场安静的问题。',
        scene_cards: [
          {
            scene_no: 1,
            title: '冷静压迫',
            purpose: '反派用短句压住证人。',
            conflict: '证人不敢说出账本来源。',
            reader_payoff: '压迫感来自短句和动作停顿。',
          },
          {
            scene_no: 2,
            title: '反问逼供',
            purpose: '主角用反问和证据逼证人转向。',
            conflict: '证人试探主角是否真有底牌。',
            reader_payoff: '问号和短促追问服务信息差反打。',
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
      { chapter_no: 17, title: '第三个证人' },
    )

    expect(brief.punctuation_tone_contract.version).toBe('oh_story_punctuation_tone_v1')
    expect(brief.punctuation_tone_contract.tone_punctuation_map.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.forbidden_marks.join('｜')).toContain('……')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景2')
    expect(confirmedContext.chapter_target.punctuation_tone_contract.quality_checks.join('｜')).toContain('通篇句号化')
    expect(prompt).toContain('【语气标点谱系合同】')
    expect(prompt).toContain('执行 chapter_target.punctuation_tone_contract')
    expect(prompt).toContain('标点服务语气、人物声线和情绪节奏')
    expect(prompt).toContain('punctuation_tone_checks')
    expect(prompt.indexOf('【语气标点谱系合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit punctuation tone contract from scene tone context', () => {
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角用证据反打，让对手当众失控。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '第三个证人',
        summary: '主角逼第三个证人开口，让反派从冷静压迫转为爆发。',
        conflict: '证人试探、反派压迫、主角反问逼供交替出现。',
        punctuation_tone_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认问号和爆点标点都服务人物声线。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '反问逼供',
            purpose: '主角用反问和证据逼证人转向。',
            conflict: '证人试探主角是否真有底牌。',
            reader_payoff: '问号和短促追问服务信息差反打。',
          },
          {
            scene_no: 2,
            title: '反派爆发',
            purpose: '反派当众失控。',
            conflict: '反派怒喊证人撒谎。',
            reader_payoff: '爆发只在峰值保留少量感叹号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.punctuation_tone_contract.source).toBe('manual_incomplete')
    expect(brief.punctuation_tone_contract.quality_checks).toEqual(['必须确认问号和爆点标点都服务人物声线。'])
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景1')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景2')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('惊讶 / 爆发 / 打脸')
    expect(brief.punctuation_tone_contract.tone_punctuation_map.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.forbidden_marks.join('｜')).toContain('……')
    expect(brief.punctuation_tone_contract.revision_priorities.join('｜')).toContain('修通篇句号化')
  })

  test('adds previous chapter handoff to the pre-draft brief from continuity context', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 2,
            title: '第一条规则',
            ending_hook: '门外湿漉漉的校服男生敲响玻璃门。',
            ending_excerpt: '李超刚要开门，林晓脸色惨白地拦住他：“别开，他不是人。”玻璃门外，那男生慢慢抬头。',
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(brief.previous_handoff).toContain('第2章《第一条规则》')
    expect(brief.previous_handoff).toContain('校服男生敲响玻璃门')
    expect(brief.previous_handoff).toContain('别开，他不是人')
  })

  test('adds reader retention radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              retention_strategy: '前三章快速展示规则反制和双主角互补。',
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              reversal: '饼干碎屑越过门槛后被黑暗吞掉。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_retention_brief.opening_hook).toContain('九点五十九分')
    expect(brief.reader_retention_brief.payoff_promise).toContain('规则边界反制')
    expect(brief.reader_retention_brief.information_gap).toContain('阴影')
    expect(brief.reader_retention_brief.emotional_reward).toContain('超人开挂')
    expect(brief.reader_retention_brief.short_drama_scene).toContain('十点门槛')
    expect(brief.reader_retention_brief.ending_question).toContain('湿漉漉')
    expect(brief.reader_retention_brief.hook_addiction_model.trigger).toContain('九点五十九分')
    expect(brief.reader_retention_brief.hook_addiction_model.action).toContain('张智必须阻止')
    expect(brief.reader_retention_brief.hook_addiction_model.reward).toContain('规则边界反制')
    expect(brief.reader_retention_brief.hook_addiction_model.investment).toContain('湿漉漉')
    expect(brief.reader_retention_brief.hook_addiction_model.reward_randomness).toContain('出乎意料')
    expect(brief.reader_retention_brief.retention_double_engine.emotion_engine).toContain('超人开挂')
    expect(brief.reader_retention_brief.retention_double_engine.hunger_engine).toContain('阴影')
    expect(brief.reader_retention_brief.retention_double_engine.onion_layers).toContain('章节开头植入小问号')
    expect(brief.reader_retention_brief.retention_pillars.upgrade).toContain('规则边界反制')
    expect(brief.reader_retention_brief.retention_pillars.resource_pressure).toContain('张智必须阻止')
    expect(brief.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(brief.reader_retention_brief.retention_pillars.mystery_unlock).toContain('阴影')
    expect(brief.reader_retention_brief.forbidden_cliches).toContain('只写环境氛围不推进目标')
  })

  test('adds reader expectation ledger to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          story_state: {
            payoff_queue: ['湿漉漉学生身份待回收'],
            open_questions: ['宿舍外黑暗按什么规则清除目标'],
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        story_state: {
          payoff_queue: ['带血腰牌真相待回收'],
          open_questions: ['广播是谁发出的'],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'opening_hook',
      'payoff_promise',
      'scene_payoff_1',
      'ending_hook',
    ]))
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('规则边界反制')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('宿舍外黑暗')
    expect(brief.reader_expectation_ledger.must_not_break).toContain('已承诺的爽点、悬念和情绪回报不能整章只铺设定不兑现')
  })

  test('carries unresolved reader expectation debt into the next pre-draft brief', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 91,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
              ],
              keep_alive: [
                { key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
              ],
            },
          }),
        },
      ],
    )
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(debtContext.must_carry[0].text).toContain('湿漉漉学生')
    expect(debtContext.keep_alive[0].text).toContain('广播是谁发出的')
    expect(brief.reader_expectation_debt.must_carry[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
  })

  test('carries camelCase reader expectation debt into the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '寒门阵师' },
      {
        readerExpectationDebtContext: {
          mustCarry: [
            { key: 'ledger_debt', label: '期待债务', type: 'carry_over', text: '旧案账册必须被打开', fromChapterNo: 7 },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '继续悬念', type: 'question', text: '旧案幕后供奉是谁', fromChapterNo: 6 },
          ],
        },
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          summary: '主角逼执事交出旧案账册。',
          conflict: '执事用宗门规矩阻止主角公开账册。',
          ending_hook: '账册背面浮出黑印。',
          scene_cards: [
            { scene_no: 1, title: '账册对峙', reader_payoff: '主角打开旧案账册反压执事。' },
          ],
        },
      },
    )

    expect(brief.reader_expectation_debt.must_carry[0].text).toContain('旧案账册必须被打开')
    expect(brief.reader_expectation_debt.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('旧案账册必须被打开')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('旧案幕后供奉是谁')
  })

  test('carries previous chapter delivery risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 201,
          chapter_id: 2,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 2',
              weak_count: 2,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { label: '开篇钩子', issue: '开篇没有直接接住门外学生。' },
                { label: '章末翻页', issue: '结尾没有留下门外学生身份问题。' },
              ],
            },
          }),
        },
        {
          id: 202,
          chapter_id: 2,
          review_type: 'innovation_sync',
          created_at: '2026-06-09T08:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            innovation_sync: {
              status: 'warn',
              label: '创新缺口 1',
              missed_count: 1,
              missed: [{ label: '规则反差', issue: '超人力量没有和宿舍规则形成新鲜反差。' }],
            },
          }),
        },
        {
          id: 203,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:04:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'structure',
                    original_evidence: '章末只总结局势',
                    applied_fix: '补章末现场钩子',
                    changed_evidence: '门外湿漉漉的学生敲响玻璃门。',
                    remaining_risk: '湿漉漉学生身份仍需下一章补证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 1,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 4')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章末翻页')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修吸引力：吸引力缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补创新：创新缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生身份仍需下一章补证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('吸引力开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创新开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则反差')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章末翻页')
    expect(context.chapter_target.delivery_risk_carry_over.priority_label).toBe('优先修章末翻页')
    expect(prompt).toContain('【上一章交稿风险承接】')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修吸引力：吸引力缺口 2')
    expect(prompt).toContain('补创新：创新缺口 1')
    expect(prompt).toContain('复核修订：修订残留 1')
    expect(prompt).toContain('湿漉漉学生身份仍需下一章补证据')
  })

  test('carries failed quality gate reasons into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门槛复查' },
      [
        { id: 3, chapter_no: 3, title: '门槛旧章' },
        { id: 4, chapter_no: 4, title: '门槛复查' },
      ],
      [
        {
          id: 700,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                score: 91,
                passed: true,
                issues: [],
              },
            },
            quality_gate: {
              passed: false,
              score: 91,
              reasons: [
                '结构化自检失败 1 项：场景回执未闭环：场景2证据不在正文中',
                '承接回执未兑现 1 项：开篇承接没有前300字证据',
              ],
              gate: { min_score: 78 },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门槛复查',
        summary: '复查上一章没有落地的场景回执和开篇承接。',
        conflict: '主角必须用现场证据补齐门槛旧章的承接债。',
        ending_hook: '门槛白线后出现第二条未确认回执。',
        scene_cards: [
          { scene_no: 1, title: '白线复查', reader_payoff: '把上一章漏掉的承接证据写成现场推进。' },
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
      { chapter_no: 4, title: '门槛复查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量门禁：门禁未过 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('质量门禁：低分未过 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('场景回执未闭环')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇承接没有前300字证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('质量门禁')
    expect(prompt).toContain('质量门禁')
    expect(prompt).toContain('质量门禁：门禁未过 2')
    expect(prompt).toContain('场景回执未闭环')
    expect(prompt).toContain('开篇承接没有前300字证据')
    expect(prompt).not.toContain('质量分 91 低于 78')
  })

  test('carries nested oh-story revision receipt residuals into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  revision_receipts: [
                    {
                      issue_index: 0,
                      severity: 'S2',
                      category: 'structure',
                      applied_fix: '补章末现场钩子',
                      changed_evidence: '第三声钟响后，守将闯入。',
                      remaining_risk: '守将动机仍需下一章补证据。',
                    },
                  ],
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('复核修订开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('补证据')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(prompt).toContain('复核修订：修订残留 1')
    expect(prompt).toContain('守将动机仍需下一章补证据')
  })

  test('carries unresolved scene-card serial risk repair checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧盟约重签' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '旧盟约重签' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_repair_1_missing',
                    label: '场景近章风险修复检查',
                    status: 'warn',
                    evidence: '场景1《旧盟约重签》标注风险修复 two_chapter_momentum_stall，但正文窗口缺少目标推进和关系变化证据。',
                    fix: '下一章必须把账册新证据写成可见目标推进，并让盟友关系发生一次明确变化。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧盟约重签',
        summary: '用账册缺页逼盟友改口。',
        conflict: '盟友仍怕牵连，不肯作证。',
        ending_hook: '账册背面浮出第二个签名。',
        scene_cards: [
          { scene_no: 1, title: '账册对质', reader_payoff: '账册证据迫使盟友改口。' },
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
      { chapter_no: 3, title: '旧盟约重签' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章必须把账册新证据写成可见目标推进')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('近章风险修复：修复缺口 1')
    expect(prompt).toContain('账册新证据写成可见目标推进')
  })

  test('carries serial risk repair execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    label: '近章动能空转',
                    status: 'warn',
                    risk_type: 'two_chapter_momentum_stall',
                    repair_receipt: '场景卡要求账册新证据推进目标，但正文只复述旧盟约。',
                    continuity_change: '盟友从拒绝作证改为答应带路。',
                    state_change: '账册缺页从线索变成公开证据。',
                    evidence: '场景2仍停在旧盟约复述，缺少目标推进和状态变化。',
                    fix: '下一章必须让账册证据触发新阻碍，并让盟友关系发生一次明确变化。',
                    remaining_risk: '不要再只解释账册缺页，要把它写成现场阻碍。',
                  },
                  {
                    label: '关系调剂已完成',
                    status: 'pass',
                    evidence: '盟友已经递出半枚印纹。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二个签名',
        summary: '查出第二个签名是谁留下的。',
        conflict: '盟友带路后发现账册证据会引来新阻碍。',
        ending_hook: '第二个签名在雨水里倒写出主角的名字。',
        scene_cards: [
          { scene_no: 1, title: '雨巷验账', reader_payoff: '账册证据触发新阻碍。' },
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
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('serial_risk_repair_checks.近章动能空转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('risk_type=two_chapter_momentum_stall')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('repair_receipt=场景卡要求账册新证据推进目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_change=盟友从拒绝作证改为答应带路')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_change=账册缺页从线索变成公开证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系调剂已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('risk_type')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('repair_receipt')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('state_change')
    expect(prompt).toContain('serial_risk_repair_checks.近章动能空转')
    expect(prompt).toContain('不要再只解释账册缺页')
  })

  test('carries unresolved revision directives into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                revision_directives: [
                  'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
                  '压缩不推动剧情、信息或情绪变化的环境描写。',
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二个签名',
        summary: '追查账册背面的第二个签名。',
        conflict: '盟友只肯交出半页证据。',
        ending_hook: '签名墨迹和主角掌心发出同一种冷光。',
        scene_cards: [
          { scene_no: 1, title: '半页账册', reader_payoff: '第二个签名指向更高层的规则漏洞。' },
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
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行修订指令')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订指令：明确指令 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章末新期待')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修订指令：明确指令 2')
    expect(prompt).toContain('补核心卖点')
    expect(prompt).toContain('压缩不推动剧情')
  })

  test('carries unresolved focused revision modes into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '追入旧巷' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '追入旧巷' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                focused_revision_modes: ['expand_action', 'cut_description', 'restore_hook'],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '追入旧巷',
        summary: '主角追查账册缺页对应的旧巷入口。',
        conflict: '追踪目标钻入规则禁止靠近的巷口。',
        ending_hook: '巷底旧门上响起和账册同频的敲击。',
        scene_cards: [
          { scene_no: 1, title: '旧巷追踪', reader_payoff: '追踪动作揭开账册缺页的下一层入口。' },
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
      { chapter_no: 3, title: '追入旧巷' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行定向修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('定向修订：修订模式 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('restore_hook')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('restore_hook')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('定向修订：修订模式 3')
    expect(prompt).toContain('压缩不推动剧情')
    expect(prompt).toContain('章末钩子')
  })

  test('carries unresolved craft metric risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷反制' },
      [
        { id: 2, chapter_no: 2, title: '追入旧巷' },
        { id: 3, chapter_no: 3, title: '旧巷反制' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                craft_metrics: {
                  action_detail_score: 58,
                  description_overuse_score: 82,
                  setting_consistency_score: 63,
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧巷反制',
        summary: '主角在旧巷里反制账册规则。',
        conflict: '旧巷规则限制主角能力使用。',
        ending_hook: '旧门背后传来第二页账册的翻动声。',
        scene_cards: [
          { scene_no: 1, title: '旧巷反制', reader_payoff: '主角用可见动作反制旧巷规则。' },
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
      { chapter_no: 3, title: '旧巷反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文工艺指标')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文工艺指标：指标风险 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setting_consistency_score')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('setting_consistency_score')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('正文工艺指标：指标风险 3')
    expect(prompt).toContain('能力代价')
  })

  test('carries unresolved setting violations into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧印章回声' },
      [
        { id: 2, chapter_no: 2, title: '旧巷反制' },
        { id: 3, chapter_no: 3, title: '旧印章回声' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                setting_violations: [
                  {
                    setting_name: '旧印章',
                    type: 'ownership',
                    severity: 'high',
                    description: '正文写成主角已经拿到完整旧印章，但设定中只有半枚印纹，旧印章仍在祠堂封存。',
                    fix: '下一章必须保持主角只拿到半枚印纹，旧印章仍在祠堂封存；能力触发只能来自半枚印纹的残留规则。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧印章回声',
        summary: '主角确认半枚印纹的残留规则。',
        conflict: '敌人诱导主角承认已经拿到完整旧印章。',
        ending_hook: '祠堂封存的旧印章背面响起回声。',
        scene_cards: [
          { scene_no: 1, title: '半枚印纹', reader_payoff: '主角用半枚印纹的规则反制诱导。' },
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
      { chapter_no: 3, title: '旧印章回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修设定违规')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('设定违规：违规风险 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('祠堂封存')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('能力触发')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('祠堂封存')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('设定违规：违规风险 1')
    expect(prompt).toContain('祠堂封存')
  })

  test('carries unresolved reader retention checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门后第二声' },
      [
        { id: 2, chapter_no: 2, title: '湿漉漉学生' },
        { id: 3, chapter_no: 3, title: '门后第二声' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                reader_retention_checks: [
                  {
                    key: 'hook_addiction_reward_randomness_missing',
                    label: 'Hook上瘾模型-奖励随机性',
                    status: 'warn',
                    evidence: '门外学生身份只被确认，没有给出额外收获、线索、权限、关系或地位变化。',
                    fix: '下一章必须在确认门外学生身份之外，补一个出乎意料的额外线索，并让主角产生沉没投入。',
                  },
                  {
                    key: 'retention_double_engine_hunger_missing',
                    label: '留存双引擎-饥饿缺口',
                    status: 'fail',
                    evidence: '章尾没有把广播是谁发出的信息差卡到下一章。',
                    fix: '下一章必须用信息差植入问号，把广播来源按剥洋葱方式卡到章末。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门后第二声',
        summary: '主角追问门外学生背后的广播来源。',
        conflict: '学生只肯说半句，广播却提前念出主角名字。',
        ending_hook: '广播里出现第二个和主角同名的人。',
        scene_cards: [
          { scene_no: 1, title: '第二声广播', reader_payoff: '门外学生身份之外出现新的广播线索。' },
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
      { chapter_no: 3, title: '门后第二声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：追读留存缺口 2')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('剥洋葱')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('额外线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('广播来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('剥洋葱')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('创作契约：追读留存缺口 2')
    expect(prompt).toContain('沉没投入')
  })

})
